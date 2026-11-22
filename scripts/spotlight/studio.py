#!/usr/bin/env python3
"""Spotlight Studio: add Object Spotlights from your browser (dev machine only).

    ./studio            (or: python studio.py [--port 8765])

Opens a local page where you paste a tour link, pick a scene, click the object
and type its text. It traces the outline with SAM, records the voice and
writes the same files as `spotlight.py build`. Nothing is uploaded: commit and
push the files it lists when you're happy.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import threading
import traceback
import urllib.request
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import cv2
import numpy as np

import spotlight as sp

API = "https://api.viewora.software"
UA = {"User-Agent": "viewora-spotlight/1.0"}
VIEW_W, VIEW_H = 1280, 800        # the "look closer" view you click points on
PANO_W = 4096                      # the flat panorama you pick the object on
TMP = sp.CACHE / "studio"

heavy = threading.Lock()           # SAM / Kokoro / remap: one at a time
_seg: sp.Segmenter | None = None
_panos: dict[str, np.ndarray] = {}
_scenes: dict[str, dict] = {}      # scene id → {id, name, image, tour, tourTitle}
_images: dict[str, bytes] = {}     # served jpgs (by token)


def segmenter() -> sp.Segmenter:
    global _seg
    if _seg is None:
        _seg = sp.Segmenter()
    return _seg


def pano(scene_id: str) -> np.ndarray:
    if scene_id not in _panos:
        _panos.clear()             # ~200 MB each: keep one
        _panos[scene_id] = sp.load_pano(_scenes[scene_id]["image"])
    return _panos[scene_id]


def jpg(img: np.ndarray, q: int = 85) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    token = uuid.uuid4().hex[:12]
    if len(_images) > 60:
        for k in list(_images)[:30]:
            del _images[k]
    _images[token] = buf.tobytes()
    return f"/img/{token}.jpg"


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "object"


def tour_slug(text: str) -> str:
    text = text.strip()
    m = re.search(r"/(?:p|embed|view/p)/([^/?#]+)", text)
    return m.group(1) if m else text.strip("/").split("/")[-1].split("?")[0].split("#")[0]


# ── API handlers ──────────────────────────────────────────────────────────────

def api_tour(q: dict) -> dict:
    slug = tour_slug(q["link"])
    req = urllib.request.Request(f"{API}/p/{slug}", headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)["data"]["tour"]
    title = data["space"].get("title") or slug
    scenes = []
    for s in data["scenes"]:
        if not s.get("raw_image_url"):
            continue
        _scenes[s["id"]] = {"id": s["id"], "name": s["name"], "image": s["raw_image_url"], "tour": slug, "tourTitle": title}
        scenes.append({"id": s["id"], "name": s["name"], "thumb": s.get("thumbnail_url"),
                       "count": len(objects_of(s["id"]))})
    return {"slug": slug, "title": title, "scenes": scenes}


def objects_of(scene_id: str) -> list[dict]:
    p = sp.find_spec(scene_id)
    return json.loads(p.read_text()).get("objects", []) if p else []


def api_scene(q: dict) -> dict:
    sid = q["scene"]
    with heavy:
        img = pano(sid)
        h = int(PANO_W * img.shape[0] / img.shape[1])
        flat = cv2.resize(img, (PANO_W, h), interpolation=cv2.INTER_AREA)
    return {"pano": jpg(flat, 80), "objects": objects_of(sid), "voices": ["af_heart", "af_bella", "bf_emma", "am_michael"]}


def api_view(q: dict) -> dict:
    """A perspective view to click points on (what the camera would see)."""
    sid, yaw, pitch, fov = q["scene"], float(q["yaw"]), float(q["pitch"]), float(q["fov"])
    with heavy:
        v = sp.render_view(pano(sid), math.radians(yaw), math.radians(pitch), fov, VIEW_W, VIEW_H)
    return {"src": jpg(v), "w": VIEW_W, "h": VIEW_H}


def px_to_deg(view: dict, pts: list) -> list[list[float]]:
    if not pts:
        return []
    xs = np.array([p[0] for p in pts], float)
    ys = np.array([p[1] for p in pts], float)
    yy, pp = sp.screen_to_sphere(xs, ys, math.radians(view["yaw"]), math.radians(view["pitch"]), view["fov"], VIEW_W, VIEW_H)
    return [[round(math.degrees(a), 2), round(math.degrees(b), 2)] for a, b in zip(yy, pp)]


def api_trace(q: dict) -> dict:
    sid, view = q["scene"], q["view"]
    pos = px_to_deg(view, q["pos"]) if "pos" in q else q["points"]
    neg = px_to_deg(view, q["neg"]) if "neg" in q else q.get("exclude", [])
    if not pos:
        raise ValueError("click on the object first")
    zoom = None if q.get("zoom") in (None, "auto", "") else float(q["zoom"])
    with heavy:
        t = sp.trace(pano(sid), segmenter(), pos[0], pos[1:], neg, zoom)
    return {
        "at": pos[0], "points": pos[1:], "exclude": neg,
        "zoom": t["zoom"], "fit": round(t["fit"], 3), "score": round(t["score"], 2),
        "nPoints": len(t["polygon"]), "notes": t["notes"],
        "landing": jpg(sp.draw_landing(*t["landing"])),
        "detail": jpg(sp.draw_detail(*t["detail"])),
    }


def api_save(q: dict) -> dict:
    sid, o = q["scene"], q["object"]
    sc = _scenes[sid]
    path = sp.find_spec(sid) or sp.HERE / "scenes" / f"{slugify(sc['tour'])}-{slugify(sc['name'])}.json"
    spec = json.loads(path.read_text()) if path.exists() else {
        "name": f"{sc['tourTitle']} · {sc['name']}", "scene": sid, "image": sc["image"], "voice": "af_heart", "objects": []}
    title = o["title"].strip()
    if not title:
        raise ValueError("give it a title")
    oid = o.get("id") or slugify(title)
    taken = {x["id"] for x in spec["objects"]}
    if not o.get("id"):
        base, n = oid, 2
        while oid in taken:
            oid, n = f"{base}-{n}", n + 1
    entry = {
        "id": oid,
        "label": o.get("label", "").strip(),
        "at": o["at"],
        "points": o.get("points", []),
        "exclude": o.get("exclude", []),
        "zoom": o.get("zoom", "auto"),
        "title": title,
        "lines": [l.strip() for l in o.get("lines", []) if l.strip()],
    }
    if o.get("voice") and o["voice"] != spec.get("voice"):
        entry["voice"] = o["voice"]
    if o.get("voice") == "none":
        entry["voice"] = False
    old = next((x for x in spec["objects"] if x["id"] == oid), None)
    if old:
        for k in ("say", "voiceSrc", "hint", "model", "close_px", "context", "smooth"):
            if k in old:
                entry[k] = old[k]
        spec["objects"][spec["objects"].index(old)] = entry
    else:
        spec["objects"].append(entry)
    save_spec_and_build = lambda: (sp.save_spec(path, spec), sp.build(path, [oid], True, segmenter(), pano(sid)))
    with heavy:
        _, results = save_spec_and_build()
    res = results[0] if results else (oid, {}, [])
    return {"id": oid, "spec": str(path.relative_to(sp.APP)), "notes": res[2],
            "voice": res[1].get("voiceSrc"), "objects": objects_of(sid), "files": changed_files(sid),
            "preview": f"http://localhost:3000/p/{sc['tour']}#scene={sid}"}


def api_delete(q: dict) -> dict:
    sid, oid = q["scene"], q["id"]
    path = sp.find_spec(sid)
    if not path:
        return {"objects": []}
    spec = json.loads(path.read_text())
    spec["objects"] = [x for x in spec["objects"] if x["id"] != oid]
    with heavy:
        sp.save_spec(path, spec)
        sp.build(path, [], False)
    return {"objects": objects_of(sid), "files": changed_files(sid)}


def changed_files(sid: str) -> list[str]:
    import subprocess
    try:
        out = subprocess.run(["git", "status", "--porcelain", "--", "public/spotlight", "scripts/spotlight/scenes",
                              "shared/spotlight/scenes.generated.ts"], cwd=sp.APP, capture_output=True, text=True).stdout
        return [l[3:] for l in out.splitlines() if l.strip()]
    except Exception:
        return []


ROUTES = {"tour": api_tour, "scene": api_scene, "view": api_view, "trace": api_trace, "save": api_save, "delete": api_delete}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send(self, code: int, body: bytes, ctype: str):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            return self.send(200, (sp.HERE / "studio.html").read_bytes(), "text/html; charset=utf-8")
        m = re.fullmatch(r"/img/([0-9a-f]+)\.jpg", u.path)
        if m and m.group(1) in _images:
            return self.send(200, _images[m.group(1)], "image/jpeg")
        self.send(404, b"not found", "text/plain")

    def do_POST(self):
        name = urlparse(self.path).path.removeprefix("/api/")
        fn = ROUTES.get(name)
        if not fn:
            return self.send(404, b"{}", "application/json")
        try:
            q = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            out = fn(q)
            self.send(200, json.dumps(out).encode(), "application/json")
        except Exception as e:  # shown on the page
            traceback.print_exc()
            msg = str(e) or e.__class__.__name__
            if isinstance(e, KeyError) and name != "tour":
                msg = "the studio restarted: load the tour again"
            self.send(400, json.dumps({"error": msg}).encode(), "application/json")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    url = f"http://127.0.0.1:{a.port}/"
    print(f"Spotlight Studio: {url}   (Ctrl+C to stop)")
    if not a.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    sys.exit(main())
