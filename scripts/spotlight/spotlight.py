#!/usr/bin/env python3
"""Object Spotlight data, made once per object on a dev machine (never deployed).

  python spotlight.py view  <spec.json> --at YAW PITCH [--zoom 50] [--px X Y ...]
      Renders a view of the panorama with a degree grid to out/. With --px,
      prints the yaw / pitch (degrees) of pixels you picked on that image
      instead, ready to paste into the spec.

  python spotlight.py build <spec.json> [--only ID] [--no-voice]
      For each object in the spec:
        1. renders a perspective view of the panorama centred on it (the same
           yaw / pitch / fov the tour's zoom ends at; SAM never sees the
           distorted equirectangular image),
        2. runs Segment Anything (SAM 2.1, CPU) with point prompts,
        3. re-renders a square close-up around what it found and segments
           again at full resolution (pass 2), then turns the mask into the
           closest polygon that fits in 60 points (OpenCV findContours +
           approxPolyDP, ~20-60 points),
        4. maps the polygon back to yaw / pitch with the same projection,
        5. records the voice with the patient-journey voices (Kokoro, through
           viewora-backend/tts-worker) unless --no-voice,
      then writes public/spotlight/<sceneId>.json, the MP3s under
      public/spotlight/voice/, and shared/spotlight/scenes.generated.ts.
      Preview images of each mask go to out/.

Angles in the spec are degrees (easier to read off the grid); the JSON the
tour reads is radians, in Photo Sphere Viewer's convention (yaw 0 = centre of
the photo, growing to the right; pitch up). See README.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
import urllib.request
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
APP = HERE.parents[1]                                   # viewora-app/
PUBLIC = APP / "public" / "spotlight"
GENERATED = APP / "shared" / "spotlight" / "scenes.generated.ts"
TTS_WORKER = APP.parent / "viewora-backend" / "tts-worker"
OUT = HERE / "out"
CACHE = Path(os.environ.get("SPOTLIGHT_CACHE", Path.home() / ".cache" / "viewora-spotlight"))

# PSV defaults (the tour sets neither): zoom 0 → 90° vertical fov, zoom 100 → 30°.
MIN_FOV, MAX_FOV = 30.0, 90.0
VIEW_W, VIEW_H = 1600, 1000          # the render SAM sees (any aspect works: angles are what's kept)
POLY_MIN, POLY_MAX, POLY_TARGET = 20, 60, 40
MAX_OBJECT_BYTES = 2048
SAM2_MODEL = os.environ.get("SPOTLIGHT_SAM2", "facebook/sam2.1-hiera-small")


# ── Projection (must match PSV: a plain perspective camera, vertical fov) ─────

def fov_for_zoom(zoom: float) -> float:
    return MAX_FOV + (MIN_FOV - MAX_FOV) * zoom / 100.0


def camera_basis(yaw: float, pitch: float):
    """Forward, right (= growing yaw) and up (= growing pitch) unit vectors.
    Directions: x = sin(yaw)cos(pitch), y = sin(pitch), z = cos(yaw)cos(pitch)."""
    f = np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)])
    r = np.array([math.cos(yaw), 0.0, -math.sin(yaw)])
    u = np.array([-math.sin(yaw) * math.sin(pitch), math.cos(pitch), -math.cos(yaw) * math.sin(pitch)])
    return f, r, u


def screen_to_sphere(px: np.ndarray, py: np.ndarray, yaw: float, pitch: float, vfov_deg: float, w: int, h: int):
    """Pixel centres → (yaw, pitch) radians, yaw in -π..π."""
    tv = math.tan(math.radians(vfov_deg) / 2)
    th = tv * w / h
    sx = (2 * (px + 0.5) / w - 1) * th
    sy = (1 - 2 * (py + 0.5) / h) * tv
    f, r, u = camera_basis(yaw, pitch)
    d = f[None, :] * 1 + sx[:, None] * r[None, :] + sy[:, None] * u[None, :]
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    return np.arctan2(d[:, 0], d[:, 2]), np.arcsin(np.clip(d[:, 1], -1, 1))


def sphere_to_screen(yaw: np.ndarray, pitch: np.ndarray, cyaw: float, cpitch: float, vfov_deg: float, w: int, h: int):
    tv = math.tan(math.radians(vfov_deg) / 2)
    th = tv * w / h
    f, r, u = camera_basis(cyaw, cpitch)
    d = np.stack([np.sin(yaw) * np.cos(pitch), np.sin(pitch), np.cos(yaw) * np.cos(pitch)], axis=1)
    z = d @ f
    x = (d @ r) / z / th
    y = (d @ u) / z / tv
    return (x + 1) * w / 2 - 0.5, (1 - y) * h / 2 - 0.5, z > 0


def render_view(pano: np.ndarray, yaw: float, pitch: float, vfov_deg: float, w: int = VIEW_W, h: int = VIEW_H) -> np.ndarray:
    H, W = pano.shape[:2]
    jj, ii = np.mgrid[0:h, 0:w]
    sy, sp = screen_to_sphere(ii.ravel().astype(np.float64), jj.ravel().astype(np.float64), yaw, pitch, vfov_deg, w, h)
    # PSV: textureX = (yaw / 2π + 0.5) · width, textureY = (0.5 - pitch / π) · height
    mx = ((sy / (2 * math.pi) + 0.5) % 1.0) * W - 0.5
    my = (0.5 - sp / math.pi) * H - 0.5
    return cv2.remap(pano, mx.reshape(h, w).astype(np.float32), my.reshape(h, w).astype(np.float32),
                     interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


# ── Inputs ─────────────────────────────────────────────────────────────────────

def load_pano(src: str) -> np.ndarray:
    """A local path, or a URL downloaded once into the cache."""
    path = Path(src)
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        path = CACHE / "images" / (hashlib.sha1(src.encode()).hexdigest()[:16] + Path(src.split("?")[0]).suffix)
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            print(f"downloading {src}")
            tmp = path.with_suffix(path.suffix + ".part")
            # The media CDN turns away urllib's default user agent.
            req = urllib.request.Request(src, headers={"User-Agent": "viewora-spotlight/1.0"})
            with urllib.request.urlopen(req) as r, open(tmp, "wb") as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
            tmp.rename(path)
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"can't read image {path}")
    return img


def rad(deg_pair) -> tuple[float, float]:
    return math.radians(deg_pair[0]), math.radians(deg_pair[1])


def wrap(a: float) -> float:
    return math.atan2(math.sin(a), math.cos(a))


# ── SAM ───────────────────────────────────────────────────────────────────────

class Segmenter:
    """SAM 2.1 if it's installed, otherwise SAM ViT-B (segment_anything)."""

    def __init__(self):
        try:
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            self.predictor = SAM2ImagePredictor.from_pretrained(SAM2_MODEL, device="cpu")
            self.kind = f"SAM 2 ({SAM2_MODEL})"
        except ImportError:
            from segment_anything import SamPredictor, sam_model_registry
            ckpt = CACHE / "sam_vit_b_01ec64.pth"
            if not ckpt.exists():
                CACHE.mkdir(parents=True, exist_ok=True)
                urllib.request.urlretrieve("https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth", ckpt)
            self.predictor = SamPredictor(sam_model_registry["vit_b"](checkpoint=str(ckpt)))
            self.kind = "SAM ViT-B"
        print(f"segmenter: {self.kind}")

    def mask(self, bgr: np.ndarray, pos: list[tuple[float, float]], neg: list[tuple[float, float]],
             box: tuple[float, float, float, float] | None = None) -> tuple[np.ndarray, float]:
        import torch
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        pts = np.array(pos + neg, dtype=np.float32)
        labels = np.array([1] * len(pos) + [0] * len(neg), dtype=np.int32)
        with torch.inference_mode():
            self.predictor.set_image(rgb)
            masks, scores, _ = self.predictor.predict(
                point_coords=pts, point_labels=labels,
                box=None if box is None else np.array(box, dtype=np.float32),
                multimask_output=len(pos) == 1 and not neg and box is None)
        best = int(np.argmax(scores))
        out = masks[best].astype(np.uint8)
        if box is not None and len(pos) > 1:
            # Groups (a row of chairs): SAM, given all the points at once, tends
            # to drop the darker or partly hidden members. Add each point's own
            # mask (same image, no re-encoding), kept to the box and to a
            # sensible size, so every part you pointed at is in.
            x0, y0, x1, y1 = (int(v) for v in box)
            limit = max(out.sum() * 1.2, 1)
            with torch.inference_mode():
                for p in pos:
                    m1, s1, _ = self.predictor.predict(point_coords=np.array([p], np.float32), point_labels=np.array([1], np.int32),
                                                       box=np.array(box, np.float32), multimask_output=True)
                    k = int(np.argmax(s1))
                    one = m1[k].astype(np.uint8)
                    one[:y0], one[y1 + 1:], one[:, :x0], one[:, x1 + 1:] = 0, 0, 0, 0
                    if 0 < one.sum() <= limit and s1[k] > 0.5 and all(not one[int(min(max(y, 0), one.shape[0] - 1)), int(min(max(x, 0), one.shape[1] - 1))] for x, y in neg):
                        out |= one
        return out, float(scores[best])


# ── Mask → polygon ────────────────────────────────────────────────────────────

def mask_to_polygon(mask: np.ndarray, close_px: int) -> tuple[np.ndarray, list[str], float]:
    """The closest outline that fits in POLY_MAX points, and how well it fits
    the mask (intersection over union, 1 = exact)."""
    notes: list[str] = []
    m = (mask > 0).astype(np.uint8) * 255
    if close_px > 0:
        # Bridge thin gaps (chair legs, a row of chairs) so the outline is one shape.
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    # Soften the pixel staircase SAM leaves, so the points go to real corners.
    m = (cv2.GaussianBlur(m, (0, 0), max(1.0, min(m.shape) / 400)) > 127).astype(np.uint8) * 255
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise ValueError("empty mask")
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    total = sum(cv2.contourArea(c) for c in contours)
    main = contours[0]
    if total and cv2.contourArea(main) / total < 0.9:
        notes.append(f"mask has {len(contours)} parts; kept the largest ({cv2.contourArea(main) / total:.0%} of it). "
                     "Add a point on the missing part or raise close_px.")
    # Smallest tolerance that still fits in POLY_MAX points (binary search).
    peri = cv2.arcLength(main, True)
    lo, hi = 0.0002 * peri, 0.05 * peri
    poly = cv2.approxPolyDP(main, hi, True)
    for _ in range(30):
        mid = (lo + hi) / 2
        cand = cv2.approxPolyDP(main, mid, True)
        if len(cand) <= POLY_MAX:
            poly, hi = cand, mid
        else:
            lo = mid
    if len(poly) < POLY_MIN:
        poly = cv2.approxPolyDP(main, 0.0005 * peri, True)[:: max(1, len(main) // POLY_MIN)] if len(main) > POLY_MIN else poly
    target = np.zeros(m.shape, np.uint8)
    cv2.drawContours(target, [main], -1, 1, -1)
    drawn = np.zeros(m.shape, np.uint8)
    cv2.fillPoly(drawn, [poly.reshape(-1, 2).astype(np.int32)], 1)
    union = np.count_nonzero(target | drawn)
    fit = np.count_nonzero(target & drawn) / union if union else 0.0
    return poly.reshape(-1, 2).astype(np.float64), notes, fit


def grid_view(view: np.ndarray, yaw: float, pitch: float, vfov: float, path: Path):
    """Overlay a 5° yaw/pitch grid with labels, to read prompt points off."""
    img = view.copy()
    h, w = img.shape[:2]
    for deg in range(-180, 180, 5):
        # Only meridians in front: they all meet at the poles, so the ones
        # behind would show up too when looking down.
        if abs(math.degrees(wrap(math.radians(deg) - yaw))) > 80:
            continue
        ys = np.radians(np.full(200, deg))
        ps = np.radians(np.linspace(-80, 80, 200))
        x, y, ok = sphere_to_screen(ys, ps, yaw, pitch, vfov, w, h)
        pts = np.stack([x, y], 1)[ok & (np.abs(x) < 4 * w)].astype(np.int32)
        if len(pts) > 1:
            cv2.polylines(img, [pts], False, (0, 255, 255) if deg % 15 == 0 else (0, 140, 140), 1, cv2.LINE_AA)
            top = pts[(pts[:, 1] >= 0) & (pts[:, 0] >= 0) & (pts[:, 0] < w)]
            if len(top) and deg % 15 == 0:
                t = top[np.argmin(top[:, 1])]
                cv2.putText(img, f"{deg}", (int(t[0]) + 3, int(t[1]) + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
    for deg in range(-85, 86, 5):
        ys = np.radians(np.linspace(-180, 180, 720))
        ps = np.radians(np.full(720, deg))
        x, y, ok = sphere_to_screen(ys, ps, yaw, pitch, vfov, w, h)
        sel = ok & (x > -w) & (x < 2 * w)
        pts = np.stack([x, y], 1)[sel].astype(np.int32)
        if len(pts) > 1:
            pts = pts[np.argsort(pts[:, 0])]
            cv2.polylines(img, [pts], False, (255, 0, 255) if deg % 15 == 0 else (140, 0, 140), 1, cv2.LINE_AA)
            if deg % 15 == 0:
                inside = pts[(pts[:, 0] > 0) & (pts[:, 0] < w)]
                if len(inside):
                    cv2.putText(img, f"{deg}", (4, int(inside[0][1]) - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(path), img, [cv2.IMWRITE_JPEG_QUALITY, 85])


# ── Voice (the patient-journey voices) ────────────────────────────────────────

def record_voice(text: str, voice: str, scene: str, obj_id: str) -> str:
    sys.path.insert(0, str(TTS_WORKER))
    from narration import narration_hash, normalize_line  # type: ignore
    from synth import Synth, encode_mp3, duration_ms      # type: ignore
    line = normalize_line(text)
    name = f"{scene[:8]}-{obj_id}-{narration_hash(line, voice)[:10]}.mp3"
    dest = PUBLIC / "voice" / name
    if not dest.exists():
        samples, _ = Synth().synthesize(line, voice)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(encode_mp3(samples))
        print(f"  voice: {name} ({duration_ms(samples) / 1000:.1f}s, {dest.stat().st_size // 1024} KB)")
    else:
        print(f"  voice: {name} (already recorded)")
    return f"/spotlight/voice/{name}"


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_view(a):
    yaw, pitch = rad(a.at)
    vfov = fov_for_zoom(a.zoom)
    if a.px:
        # Pixels picked on that view's image → the degrees to put in the spec.
        xs, ys = np.array(a.px[0::2], float), np.array(a.px[1::2], float)
        sy, sp = screen_to_sphere(xs, ys, yaw, pitch, vfov, VIEW_W, VIEW_H)
        for x, y, yy, pp in zip(xs, ys, sy, sp):
            print(f"({x:.0f}, {y:.0f}) → [{math.degrees(yy):.1f}, {math.degrees(pp):.1f}]")
        return
    spec = json.loads(Path(a.spec).read_text())
    pano = load_pano(spec["image"])
    OUT.mkdir(exist_ok=True)
    path = OUT / f"view_{a.at[0]:+.0f}_{a.at[1]:+.0f}_z{a.zoom:.0f}.jpg"
    grid_view(render_view(pano, yaw, pitch, vfov), yaw, pitch, vfov, path)
    print(path)


SMOOTH = 0.07   # gap bridging as a share of the object's size (0 = follow every gap)
DETAIL = 1024   # the second pass: a square view just around the object, at SAM's own resolution


def auto_zoom(span_v: float, span_h: float) -> int:
    """Zoom that frames the object at about 55% of the view's height, and
    keeps it inside a square-ish screen (phones held either way)."""
    for zoom in range(90, -1, -1):
        f = fov_for_zoom(zoom)
        if span_v <= 0.55 * f and span_h <= 0.7 * f:
            return zoom
    return 0


def trace(pano: np.ndarray, seg: Segmenter, at, points=(), exclude=(), zoom: float | None = None,
          close_px: int = 9, context: float = 1.35, smooth: float = SMOOTH) -> dict:
    """Outline one object. at / points / exclude are [yaw, pitch] degrees.

    Pass 1 looks at the object in a view a bit wider than the landing view.
    Pass 2 re-renders a square view just around what pass 1 found, so SAM sees
    the object at full resolution (several times larger), and segments again
    with pass 1's box as an extra prompt. That pass is the outline kept.
    """
    notes: list[str] = []
    cyaw, cpitch = rad(at)
    zoom1 = float(zoom) if zoom is not None else 50.0
    seg_fov = min(MAX_FOV, fov_for_zoom(zoom1) * context)
    view = render_view(pano, cyaw, cpitch, seg_fov)

    def to_px(deg_pairs, yaw, pitch, fov, w, h):
        if not deg_pairs:
            return []
        ys, ps = zip(*[rad(p) for p in deg_pairs])
        x, y, ok = sphere_to_screen(np.array(ys), np.array(ps), yaw, pitch, fov, w, h)
        return [(float(a), float(b)) for a, b, k in zip(x, y, ok) if k and -0.5 <= a < w and -0.5 <= b < h]

    pos_deg = [list(at)] + [list(p) for p in points]
    neg_deg = [list(p) for p in exclude]
    pos1 = to_px(pos_deg, cyaw, cpitch, seg_fov, VIEW_W, VIEW_H)
    neg1 = to_px(neg_deg, cyaw, cpitch, seg_fov, VIEW_W, VIEW_H)
    mask1, score1 = seg.mask(view, pos1, neg1)
    ys1, xs1 = np.nonzero(mask1)
    if not len(xs1):
        raise ValueError("SAM found nothing at that point")

    # Pass 1's outline on the sphere → centre and size of the detail view.
    c1, _ = cv2.findContours((mask1 > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    edge = np.concatenate([c.reshape(-1, 2) for c in c1]).astype(np.float64)
    ey, ep = screen_to_sphere(edge[:, 0], edge[:, 1], cyaw, cpitch, seg_fov, VIEW_W, VIEW_H)
    rel = np.array([wrap(y - cyaw) for y in ey])
    dyaw = wrap(cyaw + (rel.min() + rel.max()) / 2)
    dpitch = float((ep.min() + ep.max()) / 2)

    touched1 = xs1.min() <= 1 or ys1.min() <= 1 or xs1.max() >= VIEW_W - 2 or ys1.max() >= VIEW_H - 2
    margin = 1.3
    for attempt in range(3):
        # Tangent-plane extent of the outline around (dyaw, dpitch).
        f, r, u = camera_basis(dyaw, dpitch)
        d = np.stack([np.sin(ey) * np.cos(ep), np.sin(ep), np.cos(ey) * np.cos(ep)], axis=1)
        z = np.clip(d @ f, 1e-3, None)
        ext = float(max(np.abs(d @ r / z).max(), np.abs(d @ u / z).max()))
        dfov = min(MAX_FOV * 1.2, max(6.0, math.degrees(2 * math.atan(ext * margin))))
        dview = render_view(pano, dyaw, dpitch, dfov, DETAIL, DETAIL)
        pos2 = to_px(pos_deg, dyaw, dpitch, dfov, DETAIL, DETAIL)
        neg2 = to_px(neg_deg, dyaw, dpitch, dfov, DETAIL, DETAIL)
        bx, by, _ = sphere_to_screen(ey, ep, dyaw, dpitch, dfov, DETAIL, DETAIL)
        pad = 0.03 * DETAIL
        box = (max(0, bx.min() - pad), max(0, by.min() - pad), min(DETAIL - 1, bx.max() + pad), min(DETAIL - 1, by.max() + pad))
        if not pos2:
            pos2 = [((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)]
        mask2, score2 = seg.mask(dview, pos2, neg2, box)
        ys2, xs2 = np.nonzero(mask2)
        touched = len(xs2) and (xs2.min() <= 1 or ys2.min() <= 1 or xs2.max() >= DETAIL - 2 or ys2.max() >= DETAIL - 2)
        if not touched:
            break
        margin *= 1.4   # the object goes past the crop: look wider and try again
    # close_px was given for the 1600-wide pass-1 view; scale it to this one.
    px_per_deg1 = VIEW_H / seg_fov
    px_per_deg2 = DETAIL / dfov
    close2 = int(round(close_px * px_per_deg2 / px_per_deg1)) | 1 if close_px > 0 else 0
    use2 = len(xs2) > 0 and score2 >= score1 - 0.15
    if use2 and smooth > 0:
        # Also bridge gaps relative to the object's own size: dark parts SAM
        # skips (black seats in shadow) otherwise cut notches into the outline.
        diag = math.hypot(xs2.max() - xs2.min(), ys2.max() - ys2.min())
        close2 = max(close2, int(smooth * diag) | 1)
    close2 = min(close2, 121)
    if use2:
        poly_px, n2, fit = mask_to_polygon(mask2, close2)
        notes += n2
        pyaw, ppitch = screen_to_sphere(poly_px[:, 0], poly_px[:, 1], dyaw, dpitch, dfov, DETAIL, DETAIL)
        score = score2
        if touched:
            notes.append("the object goes past the detail view: it may be cut off. Add an exclude point or a point on the part that's missing.")
    else:
        notes.append(f"the close-up pass looked worse (SAM {score2:.2f} vs {score1:.2f}); kept the first pass.")
        poly_px, n1, fit = mask_to_polygon(mask1, close_px)
        notes += n1
        pyaw, ppitch = screen_to_sphere(poly_px[:, 0], poly_px[:, 1], cyaw, cpitch, seg_fov, VIEW_W, VIEW_H)
        score = score1
        if touched1:
            notes.append("mask touches the edge of the view: the object may be cut off. Lower its zoom or raise context.")

    rel = np.array([wrap(y - cyaw) for y in pyaw])
    tyaw = wrap(cyaw + (rel.min() + rel.max()) / 2)
    tpitch = float((ppitch.min() + ppitch.max()) / 2)
    span_v = math.degrees(ppitch.max() - ppitch.min())
    span_h = math.degrees((rel.max() - rel.min()) * math.cos(tpitch))
    if zoom is None:
        zoom = auto_zoom(span_v, span_h)
    vfov = fov_for_zoom(float(zoom))
    if span_v > vfov * 0.8:
        notes.append(f"outline is {span_v:.0f}° tall but the zoom-{zoom:.0f} view is {vfov:.0f}°: lower the zoom (auto would pick {auto_zoom(span_v, span_h)}).")
    if max(span_v, span_h) < vfov * 0.12:
        notes.append(f"outline is small at zoom {zoom:.0f} ({max(span_v, span_h):.0f}° of {vfov:.0f}°): raise the zoom (auto would pick {auto_zoom(span_v, span_h)}).")
    if fit < 0.9:
        notes.append(f"the {POLY_MAX}-point outline covers only {fit:.0%} of the mask: a very detailed shape. It still works; a simpler object or fewer parts fits better.")

    # What the visitor sees: the landing view at a 16:10 screen, with the outline.
    land = render_view(pano, tyaw, tpitch, vfov, VIEW_W, VIEW_H)
    lx, ly, _ = sphere_to_screen(pyaw, ppitch, tyaw, tpitch, vfov, VIEW_W, VIEW_H)
    land_poly = np.stack([lx, ly], 1)
    dx, dy, _ = sphere_to_screen(pyaw, ppitch, dyaw, dpitch, dfov, DETAIL, DETAIL)
    return {
        "yaw": tyaw, "pitch": tpitch, "zoom": int(round(float(zoom))),
        "polygon": [[round(float(y), 4), round(float(p), 4)] for y, p in zip(pyaw, ppitch)],
        "score": score, "fit": fit, "notes": notes,
        "landing": (land, land_poly),
        "detail": (dview, mask2 if use2 else None, np.stack([dx, dy], 1), pos2, neg2),
    }


def draw_landing(land: np.ndarray, poly: np.ndarray) -> np.ndarray:
    img = (land * 0.55).astype(np.uint8)
    m = np.zeros(land.shape[:2], np.uint8)
    cv2.fillPoly(m, [poly.astype(np.int32)], 1)
    img[m > 0] = land[m > 0]
    cv2.polylines(img, [poly.astype(np.int32)], True, (247, 231, 127), 2, cv2.LINE_AA)
    return img


def draw_detail(dview, mask, poly, pos, neg) -> np.ndarray:
    img = dview.copy()
    if mask is not None:
        tint = img.copy()
        tint[mask > 0] = (0.5 * tint[mask > 0] + 0.5 * np.array([255, 220, 80])).astype(np.uint8)
        img = cv2.addWeighted(tint, 0.6, img, 0.4, 0)
    cv2.polylines(img, [poly.astype(np.int32)], True, (247, 231, 127), 2, cv2.LINE_AA)
    for x, y in poly:
        cv2.circle(img, (int(x), int(y)), 3, (255, 255, 255), -1, cv2.LINE_AA)
    for x, y in pos:
        cv2.circle(img, (int(x), int(y)), 7, (0, 200, 0), -1)
    for x, y in neg:
        cv2.circle(img, (int(x), int(y)), 7, (0, 0, 230), -1)
    return img


def make_entry(o: dict, t: dict, spec: dict, voice_on: bool) -> dict:
    entry = {
        "id": o["id"],
        "label": o.get("label", ""),
        "yaw": round(t["yaw"], 4),
        "pitch": round(t["pitch"], 4),
        "zoom": t["zoom"],
        "polygon": t["polygon"],
        "title": o["title"],
        "lines": o.get("lines", []),
    }
    if o.get("hint") is False:
        entry["hint"] = False
    if o.get("voiceSrc"):
        entry["voiceSrc"] = o["voiceSrc"]
    elif voice_on and o.get("voice", True) is not False:
        text = o.get("say") or " ".join([o["title"] + "."] + o.get("lines", []))
        entry["voiceSrc"] = record_voice(text, o.get("voice") or spec.get("voice", "af_heart"), spec["scene"], o["id"])
    if o.get("model"):
        entry["model"] = o["model"]
    return entry


def build_object(o: dict, pano: np.ndarray, seg: Segmenter, spec: dict, voice_on: bool) -> tuple[dict, list[str]]:
    zoom = o.get("zoom")
    t = trace(pano, seg, o["at"], o.get("points", []), o.get("exclude", []),
              None if zoom in (None, "auto") else float(zoom),
              int(o.get("close_px", 9)), float(o.get("context", 1.35)), float(o.get("smooth", SMOOTH)))
    OUT.mkdir(exist_ok=True)
    stem = f"{spec['scene'][:8]}-{o['id']}"
    cv2.imwrite(str(OUT / f"{stem}.jpg"), draw_landing(*t["landing"]), [cv2.IMWRITE_JPEG_QUALITY, 85])
    cv2.imwrite(str(OUT / f"{stem}-detail.jpg"), draw_detail(*t["detail"]), [cv2.IMWRITE_JPEG_QUALITY, 85])
    entry = make_entry(o, t, spec, voice_on)
    notes = list(t["notes"])
    size = len(json.dumps(entry, separators=(",", ":")))
    print(f"  {o['id']}: SAM score {t['score']:.2f}, {len(entry['polygon'])} points, fit {t['fit']:.0%}, zoom {entry['zoom']}, {size} bytes")
    if size > MAX_OBJECT_BYTES:
        notes.append(f"entry is {size} bytes (target under {MAX_OBJECT_BYTES}); shorten the text.")
    return entry, notes


def find_spec(scene_id: str) -> Path | None:
    for p in sorted((HERE / "scenes").glob("*.json")):
        try:
            if json.loads(p.read_text()).get("scene") == scene_id:
                return p
        except Exception:
            pass
    return None


def save_spec(path: Path, spec: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")


def build(spec_path: Path, only: list[str] | None = None, voice_on: bool = True,
          seg: Segmenter | None = None, pano: np.ndarray | None = None) -> list[tuple[str, dict, list[str]]]:
    """Builds the objects of one spec (all, or just `only`) and rewrites the
    scene's JSON. Objects not rebuilt keep their current data; objects no
    longer in the spec are dropped."""
    spec = json.loads(spec_path.read_text())
    out_path = PUBLIC / f"{spec['scene']}.json"
    existing = {}
    if out_path.exists():
        existing = {o["id"]: o for o in json.loads(out_path.read_text()).get("objects", [])}
    # only=None: everything. only=[...]: those, plus any never built yet.
    todo = [o for o in spec["objects"] if only is None or o["id"] in only or o["id"] not in existing]
    if todo:
        pano = pano if pano is not None else load_pano(spec["image"])
        seg = seg or Segmenter()
    objects, results = [], []
    for o in spec["objects"]:
        if o not in todo:
            objects.append(existing[o["id"]])
            continue
        print(f"{o['id']}:")
        entry, notes = build_object(o, pano, seg, spec, voice_on)
        if not voice_on and "voiceSrc" not in entry and existing.get(o["id"], {}).get("voiceSrc"):
            entry["voiceSrc"] = existing[o["id"]]["voiceSrc"]
        for n in notes:
            print(f"  ! {n}")
        objects.append(entry)
        results.append((o["id"], entry, notes))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    if objects:
        data = {"v": 1, "scene": spec["scene"], "objects": objects}
        out_path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n")
        print(f"wrote {out_path.relative_to(APP)} ({out_path.stat().st_size} bytes)")
    elif out_path.exists():
        out_path.unlink()
        print(f"removed {out_path.relative_to(APP)} (no objects left)")
    prune_voices()
    write_generated()
    return results


def prune_voices():
    """Deletes recordings no scene uses any more (old text, removed objects)."""
    used = set()
    for p in PUBLIC.glob("*.json"):
        for o in json.loads(p.read_text()).get("objects", []):
            if o.get("voiceSrc", "").startswith("/spotlight/voice/"):
                used.add(o["voiceSrc"].rsplit("/", 1)[1])
    for f in (PUBLIC / "voice").glob("*.mp3"):
        if f.name not in used:
            f.unlink()
            print(f"removed unused voice {f.name}")


def cmd_build(a):
    build(Path(a.spec), a.only or None, not a.no_voice)


def write_generated():
    names = {}
    for p in sorted((HERE / "scenes").glob("*.json")):
        try:
            s = json.loads(p.read_text())
            names[s["scene"]] = s.get("name", p.stem)
        except Exception:
            pass
    ids = sorted(p.stem for p in PUBLIC.glob("*.json"))
    rows = "\n".join(f"  '{i}', // {names.get(i, '')}".rstrip(" /") for i in ids)
    GENERATED.write_text(
        "// Generated by scripts/spotlight/spotlight.py: the scenes that have a\n"
        "// public/spotlight/<sceneId>.json. Other scenes never fetch anything.\n"
        "export const SPOTLIGHT_SCENES: ReadonlySet<string> = new Set<string>([\n"
        f"{rows}\n"
        "])\n"
    )
    print(f"wrote {GENERATED.relative_to(APP)} ({len(ids)} scene{'s' if len(ids) != 1 else ''})")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("view", help="render a view with a degree grid")
    v.add_argument("spec")
    v.add_argument("--at", nargs=2, type=float, required=True, metavar=("YAW", "PITCH"), help="degrees")
    v.add_argument("--zoom", type=float, default=50)
    v.add_argument("--px", nargs="+", type=float, metavar="X Y", help="print the degrees of these pixels on that view instead")
    b = sub.add_parser("build", help="segment, outline, record, write JSON")
    b.add_argument("spec")
    b.add_argument("--only", nargs="*", help="object ids to (re)build; others keep their current data")
    b.add_argument("--no-voice", action="store_true", help="skip recording (keeps a voice already recorded)")
    a = ap.parse_args(argv)
    {"view": cmd_view, "build": cmd_build}[a.cmd](a)


if __name__ == "__main__":
    main()
