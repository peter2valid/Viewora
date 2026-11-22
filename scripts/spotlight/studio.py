#!/usr/bin/env python3
"""Spotlight Studio: make Object Spotlights in your browser (runs on your computer).

    ./studio            (or: python studio.py [--port 8765])

Opens a local page: pick one of your tours and a scene, click the object, type
its text. It traces the outline with SAM and records the voice here, then
publishes to Viewora (once connected: "Connect to Viewora", one click in your
browser), where it is live at once. Not connected: you get a .spotlight file
to drop into the editor (Viewer settings → Object spotlights).

The AI runs only here. Viewora's servers only store the result.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import re
import secrets
import socket
import sys
import threading
import traceback
import urllib.error
import urllib.request
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlparse

import cv2
import numpy as np

import spotlight as sp

API = os.environ.get("VIEWORA_API", "https://api.viewora.software").rstrip("/")
APP = os.environ.get("VIEWORA_APP", "https://app.viewora.software").rstrip("/")
UA = "viewora-spotlight-studio/1.0"
PANO_W = 4096                      # the flat panorama you pick the object on
SPHERE_W = 8192                    # the 360 view you click dots and areas on (sharp when zoomed)
VENDOR = sp.APP / "node_modules"   # the tour's own viewer, served to the page
VENDOR_OK = ("three/build/", "@photo-sphere-viewer/core/", "@photo-sphere-viewer/markers-plugin/")
CONN_FILE = sp.CACHE / "studio-connection.json"
VOICE_DIR = sp.CACHE / "studio-voices"
EXPORT_DIR = sp.HERE / "out"
VOICES = ["af_heart", "af_bella", "bf_emma", "am_michael"]

heavy = threading.Lock()           # SAM / Kokoro / remap: one at a time
_seg: sp.Segmenter | None = None
_panos: dict[str, np.ndarray] = {}
_scenes: dict[str, dict] = {}      # scene id → {id, name, image, tour, tourTitle, spaceId?}
_images: dict[str, bytes] = {}     # served jpgs (by token)
_downloads: dict[str, Path] = {}   # exported .spotlight files (by token)
_pending: set[str] = set()         # connect requests waiting for the browser
PORT = 8765


class ApiError(Exception):
    def __init__(self, status: int, message: str, code: str = ""):
        super().__init__(message)
        self.status, self.code = status, code


# ── Connection (Studio key) ───────────────────────────────────────────────────

def connection() -> dict | None:
    try:
        return json.loads(CONN_FILE.read_text())
    except Exception:
        return None


def save_connection(c: dict | None):
    if c is None:
        CONN_FILE.unlink(missing_ok=True)
        return
    CONN_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = CONN_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(c))
    os.chmod(tmp, 0o600)            # the key: readable by you only
    tmp.replace(CONN_FILE)


def api(method: str, path: str, body: dict | None = None, key: str | None = None, timeout: int = 60):
    key = key or (connection() or {}).get("key")
    if not key:
        raise ApiError(401, "Connect to Viewora first.", "NOT_CONNECTED")
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers={
        "Authorization": f"Bearer {key}", "User-Agent": UA,
        **({"Content-Type": "application/json"} if data is not None else {}),
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            if not raw:
                return {}
            out = json.loads(raw)
            return out.get("data", out) if isinstance(out, dict) and out.get("success") is True else out
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read() or b"{}")
        except Exception:
            j = {}
        msg = j.get("statusMessage") or (j.get("error") or {}).get("message") or f"Viewora answered {e.code}"
        if e.code == 401 and j.get("code") == "STUDIO_KEY_INVALID":
            save_connection(None)   # turned off or expired: forget it
        raise ApiError(e.code, msg, j.get("code", ""))
    except urllib.error.URLError as e:
        raise ApiError(0, f"Can't reach Viewora ({e.reason}). Check your internet connection.")


def api_status(_q: dict) -> dict:
    c = connection()
    if not c:
        return {"connected": False, "app": APP}
    try:
        me = api("GET", "/studio/me")
    except ApiError as e:
        if e.code == "STUDIO_KEY_INVALID":
            return {"connected": False, "app": APP, "notice": str(e)}
        return {"connected": True, "offline": True, "name": c.get("name"), "app": APP, "notice": str(e)}
    c["name"] = me["user"].get("name")
    save_connection(c)
    return {"connected": True, "name": c.get("name"), "app": APP, "spaces": me.get("spaces", [])}


def api_connect_start(_q: dict) -> dict:
    state = secrets.token_urlsafe(24)
    _pending.add(state)
    device = re.sub(r"[^\w .()'-]", "", socket.gethostname())[:40] or "this computer"
    return {"url": f"{APP}/app/connect-studio?port={PORT}&state={state}&device={quote(device)}"}


def _finish(key: str) -> dict:
    key = key.strip()
    if not re.fullmatch(r"vos_[0-9A-Za-z]{32}", key):
        raise ValueError("That isn't a Spotlight Studio code.")
    me = api("GET", "/studio/me", key=key)
    save_connection({"key": key, "name": me["user"].get("name"), "api": API})
    return {"connected": True, "name": me["user"].get("name"), "app": APP, "spaces": me.get("spaces", [])}


def api_connect_finish(q: dict) -> dict:
    if q.get("state") not in _pending:
        raise ValueError("That connection wasn't started from this Studio. Press Connect again.")
    _pending.discard(q["state"])
    return _finish(q.get("key", ""))


def api_connect_paste(q: dict) -> dict:
    return _finish(q.get("key", ""))


def api_disconnect(_q: dict) -> dict:
    save_connection(None)
    return {"connected": False, "app": APP}


# ── Shared bits ───────────────────────────────────────────────────────────────

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
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60].strip("-") or "object"


def tour_slug(text: str) -> str:
    text = text.strip()
    m = re.search(r"/(?:p|embed|view/p)/([^/?#]+)", text)
    return m.group(1) if m else text.strip("/").split("/")[-1].split("?")[0].split("#")[0]


# ── Tours and scenes ──────────────────────────────────────────────────────────

def api_space(q: dict) -> dict:
    """One of your tours (connected): scenes with their published spotlights."""
    space = q["space"]
    r = api("GET", f"/spaces/{space['id']}/spotlights")
    counts: dict[str, int] = {}
    for row in r.get("spotlights", []):
        counts[row["scene_id"]] = counts.get(row["scene_id"], 0) + 1
    scenes = []
    for s in r.get("scenes", []):
        if not s.get("image"):
            continue
        _scenes[s["id"]] = {"id": s["id"], "name": s["name"], "image": s["image"], "tour": space.get("slug") or "",
                            "tourTitle": space.get("title") or "", "spaceId": space["id"], "published": space.get("is_published")}
        scenes.append({"id": s["id"], "name": s["name"], "thumb": s.get("thumb"), "count": counts.get(s["id"], 0),
                       "local": len(local_objects(s["id"]))})
    return {"enabled": r.get("enabled", True), "slug": space.get("slug"), "title": space.get("title"), "scenes": scenes}


def api_tour(q: dict) -> dict:
    """A tour by its link (any published tour; publishing needs it to be yours)."""
    slug = tour_slug(q["link"])
    c = connection()
    if c:
        try:
            mine = next((s for s in api("GET", "/studio/me").get("spaces", []) if s.get("slug") == slug), None)
            if mine:
                return {**api_space({"space": mine}), "space": mine}
        except ApiError:
            pass
    req = urllib.request.Request(f"{API}/p/{quote(slug)}", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)["data"]["tour"]
    except urllib.error.HTTPError as e:
        raise ValueError("No published tour at that link." if e.code == 404 else f"Viewora answered {e.code}")
    title = data["space"].get("title") or slug
    scenes = []
    for s in data["scenes"]:
        if not s.get("raw_image_url"):
            continue
        _scenes[s["id"]] = {"id": s["id"], "name": s["name"], "image": s["raw_image_url"], "tour": slug, "tourTitle": title}
        scenes.append({"id": s["id"], "name": s["name"], "thumb": s.get("thumbnail_url"), "count": 0,
                       "local": len(local_objects(s["id"]))})
    return {"slug": slug, "title": title, "scenes": scenes, "readOnly": True}


def local_objects(scene_id: str) -> list[dict]:
    """Spotlights saved on this computer by the earlier Studio (scripts/spotlight/scenes/)."""
    p = sp.find_spec(scene_id)
    if not p or not (sp.PUBLIC / f"{scene_id}.json").exists():
        return []
    return json.loads(p.read_text()).get("objects", [])


def to_page(row: dict) -> dict:
    """A published row → what the page edits (Studio's notes + the text)."""
    src, d = row.get("source") or {}, row.get("data") or {}
    deg = [round(math.degrees(d.get("yaw", 0)), 2), round(math.degrees(d.get("pitch", 0)), 2)]
    return {
        "id": row["object_key"], "title": d.get("title", ""), "label": d.get("label", ""), "lines": d.get("lines", []),
        "at": src.get("at") or deg, "points": src.get("points", []), "exclude": src.get("exclude", []),
        "zoom": src.get("zoom", d.get("zoom", "auto")), "voice": src.get("voice"),
        "region": src.get("region"), "exact": bool(src.get("exact")), "atAuto": bool(src.get("atAuto")),
        "straight": bool(src.get("straight")),
        "hasVoice": bool(row.get("voice_url")), "remote": True,
    }


def api_scene(q: dict) -> dict:
    sid = q["scene"]
    with heavy:
        img = pano(sid)
        h = int(PANO_W * img.shape[0] / img.shape[1])
        flat = cv2.resize(img, (PANO_W, h), interpolation=cv2.INTER_AREA)
        sw = min(SPHERE_W, img.shape[1])
        sphere = img if sw == img.shape[1] else cv2.resize(img, (sw, sw // 2), interpolation=cv2.INTER_AREA)
        sphere_src = jpg(sphere, 88)
    return {"pano": jpg(flat, 80), "sphere": sphere_src, "voices": VOICES, **scene_objects(sid)}


def scene_objects(sid: str) -> dict:
    sc = _scenes[sid]
    remote = []
    if sc.get("spaceId"):
        r = api("GET", f"/spaces/{sc['spaceId']}/spotlights")
        remote = [to_page(row) for row in r.get("spotlights", []) if row["scene_id"] == sid]
    published = {o["id"] for o in remote}
    local = [{**o, "local": True} for o in local_objects(sid) if o["id"] not in published]
    return {"objects": remote, "local": local, "canPublish": bool(sc.get("spaceId"))}


# ── Tracing ───────────────────────────────────────────────────────────────────

def zoom_arg(z):
    return None if z in (None, "auto", "") else float(z)


def area_of(q: dict):
    region = q.get("region") or None
    if region is not None:
        if not (3 <= len(region) <= 20):
            raise ValueError("an area needs 3 to 20 corners")
        region = [[float(y), float(p)] for y, p in region]
    return region, bool(region and q.get("exact"))


def run_trace(sid: str, pos: list, neg: list, region, exact: bool, zoom, auto_exact: bool = False, straight: bool = False):
    """Trace; with only an area (no dot), the area's centre stands in for the first dot."""
    t = sp.trace(pano(sid), segmenter(), pos[0] if pos else None, pos[1:], neg, zoom_arg(zoom),
                 region=region, region_exact=exact, auto_exact=auto_exact, straight=straight)
    centre = [round(math.degrees(t["yaw"]), 2), round(math.degrees(t["pitch"]), 2)]
    return t, (pos[0] if pos else centre), not pos


def api_trace(q: dict) -> dict:
    sid = q["scene"]
    pos, neg = q.get("points") or [], q.get("exclude") or []
    region, exact = area_of(q)
    if not pos and not region:
        raise ValueError("click on the object, or draw an area around it")
    with heavy:
        t, at, auto = run_trace(sid, pos, neg, region, exact, q.get("zoom"), bool(q.get("autoExact")), bool(q.get("straight")))
    return {
        "at": at, "autoAt": auto, "points": pos[1:], "exclude": neg,
        "zoom": t["zoom"], "fit": round(t["fit"], 3), "score": round(t["score"], 2),
        "nPoints": len(t["polygon"]), "notes": t["notes"], "switchedExact": bool(t.get("switchedExact")),
        "outline": [[round(math.degrees(y), 3), round(math.degrees(p), 3)] for y, p in t["polygon"]],
        "landing": jpg(sp.draw_landing(*t["landing"])),
        "detail": jpg(sp.draw_detail(*t["detail"])),
    }


# ── Saving: publish (connected) or a .spotlight file ──────────────────────────

def build_payload(sid: str, o: dict) -> tuple[str, dict, dict, bytes | None, list[str]]:
    """Traces again (same clicks, same result) and records the voice here.
    Returns the object key, the data the tour draws, Studio's notes, the MP3, warnings."""
    title = (o.get("title") or "").strip()
    if not title:
        raise ValueError("give it a title")
    key = o.get("id") or slugify(title)
    region, exact = area_of(o)
    auto = bool(o.get("atAuto")) or not o.get("at")
    pos = ([] if auto else [o["at"]]) + list(o.get("points", []))
    source = {
        "points": o.get("points", []), "exclude": o.get("exclude", []),
        "zoom": o.get("zoom", "auto"),
        "voice": False if o.get("voice") == "none" else (o.get("voice") or "af_heart"),
    }
    if region:
        source["region"] = region
        if exact:
            source["exact"] = True
    if o.get("straight") and not exact:
        source["straight"] = True
    if o.get("say"):
        source["say"] = o["say"]
    lines = [l.strip() for l in o.get("lines", []) if l.strip()]
    with heavy:
        if not pos and not region:
            raise ValueError("click on the object, or draw an area around it")
        t, at, auto = run_trace(sid, pos, source["exclude"], region, exact, source["zoom"], straight=bool(source.get("straight")))
        # Viewora needs a first dot: an area alone gives its centre, marked as such.
        source = {"at": at, **({"atAuto": True} if auto else {}), **source}
        mp3 = None
        if source["voice"] is not False:
            text = source.get("say") or " ".join([title + "."] + lines)
            mp3 = sp.voice_file(text, source["voice"], sid, key, VOICE_DIR).read_bytes()
    data = {
        "label": (o.get("label") or "").strip()[:40], "yaw": round(t["yaw"], 4), "pitch": round(t["pitch"], 4),
        "zoom": t["zoom"], "polygon": t["polygon"], "title": title, "lines": lines,
    }
    return key, data, source, mp3, t["notes"]


def unique_key(sid: str, key: str, editing: bool) -> str:
    if editing:
        return key
    taken = {x["id"] for x in scene_objects(sid)["objects"]}
    base, n = key, 2
    while key in taken:
        key, n = f"{base}-{n}"[:60], n + 1
    return key


def api_save(q: dict) -> dict:
    sid, o = q["scene"], q["object"]
    sc = _scenes[sid]
    key, data, source, mp3, notes = build_payload(sid, o)
    voice = base64.b64encode(mp3).decode() if mp3 else None
    if sc.get("spaceId") and connection():
        key = unique_key(sid, key, bool(o.get("id")))
        api("PUT", f"/scenes/{sid}/spotlights/{key}", {"data": data, "source": source, "voice": voice}, timeout=120)
        return {"mode": "published", "id": key, "title": data["title"], "notes": notes, "hasVoice": bool(mp3),
                "tourUrl": f"{APP}/p/{sc['tour']}#scene={sid}" if sc.get("tour") else None,
                "tourPublished": sc.get("published", True), **scene_objects(sid)}
    # Not connected (or not your tour): a file for the editor.
    bundle = {"kind": "viewora-spotlight", "v": 1, "scene": sid, "key": key, "data": data, "source": source, "voice": voice}
    EXPORT_DIR.mkdir(exist_ok=True)
    path = EXPORT_DIR / f"{slugify(sc['name'])}-{key}.spotlight"
    path.write_text(json.dumps(bundle))
    token = uuid.uuid4().hex[:12]
    _downloads[token] = path
    return {"mode": "file", "id": key, "title": data["title"], "notes": notes, "hasVoice": bool(mp3),
            "download": f"/download/{token}/{path.name}", "path": str(path), **scene_objects(sid)}


def api_delete(q: dict) -> dict:
    sid, oid = q["scene"], q["id"]
    api("DELETE", f"/scenes/{sid}/spotlights/{oid}")
    return scene_objects(sid)


def api_publish_local(q: dict) -> dict:
    """Moves the spotlights saved on this computer (the earlier Studio) to Viewora, as they are."""
    sid = q["scene"]
    if not _scenes.get(sid, {}).get("spaceId"):
        raise ValueError("Open the tour from your tours list (connected) to publish.")
    spec = {x["id"]: x for x in local_objects(sid)}
    spec_voice = json.loads(sp.find_spec(sid).read_text()).get("voice", "af_heart")
    built = {x["id"]: x for x in json.loads((sp.PUBLIC / f"{sid}.json").read_text()).get("objects", [])}
    done, failed = [], []
    for oid, o in spec.items():
        e = built.get(oid)
        if not e:
            failed.append(f"{oid}: never built")
            continue
        data = {k: e[k] for k in ("label", "yaw", "pitch", "zoom", "polygon", "title", "lines") if k in e}
        if "hint" in e:
            data["hint"] = e["hint"]
        source = {k: o[k] for k in ("at", "points", "exclude", "zoom", "voice", "say") if k in o}
        source.setdefault("voice", spec_voice)
        voice = None
        if e.get("voiceSrc", "").startswith("/spotlight/voice/"):
            f = sp.PUBLIC / "voice" / e["voiceSrc"].rsplit("/", 1)[1]
            if f.exists():
                voice = base64.b64encode(f.read_bytes()).decode()
        try:
            api("PUT", f"/scenes/{sid}/spotlights/{oid}", {"data": data, "source": source, "voice": voice}, timeout=120)
            done.append(oid)
        except ApiError as err:
            failed.append(f"{oid}: {err}")
    return {"published": done, "failed": failed, **scene_objects(sid)}


ROUTES = {
    "status": api_status, "connect/start": api_connect_start, "connect/finish": api_connect_finish,
    "connect/paste": api_connect_paste, "disconnect": api_disconnect,
    "space": api_space, "tour": api_tour, "scene": api_scene, "trace": api_trace,
    "save": api_save, "delete": api_delete, "publish-local": api_publish_local,
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send(self, code: int, body: bytes, ctype: str, extra: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            return self.send(200, (sp.HERE / "studio.html").read_bytes(), "text/html; charset=utf-8")
        m = re.fullmatch(r"/img/([0-9a-f]+)\.jpg", u.path)
        if m and m.group(1) in _images:
            return self.send(200, _images[m.group(1)], "image/jpeg")
        if u.path.startswith("/vendor/"):
            rel = u.path.removeprefix("/vendor/")
            f = (VENDOR / rel).resolve()
            if ".." not in rel and rel.startswith(VENDOR_OK) and f.is_file() and str(f).startswith(str(VENDOR.resolve())):
                ctype = "text/css" if f.suffix == ".css" else "text/javascript" if f.suffix == ".js" else "application/octet-stream"
                return self.send(200, f.read_bytes(), ctype + "; charset=utf-8", {"Cache-Control": "max-age=3600"})
            if not VENDOR.exists():
                return self.send(404, b"run npm install in viewora-app first", "text/plain")
        m = re.fullmatch(r"/download/([0-9a-f]+)/[^/]+", u.path)
        if m and m.group(1) in _downloads:
            p = _downloads[m.group(1)]
            return self.send(200, p.read_bytes(), "application/octet-stream",
                             {"Content-Disposition": f'attachment; filename="{p.name}"'})
        self.send(404, b"not found", "text/plain")

    def do_POST(self):
        # Only this computer's own page: a website can't drive the Studio.
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc not in (f"127.0.0.1:{PORT}", f"localhost:{PORT}"):
            return self.send(403, b'{"error":"forbidden"}', "application/json")
        name = urlparse(self.path).path.removeprefix("/api/")
        fn = ROUTES.get(name)
        if not fn:
            return self.send(404, b"{}", "application/json")
        try:
            q = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            out = fn(q)
            self.send(200, json.dumps(out).encode(), "application/json")
        except ApiError as e:
            self.send(400, json.dumps({"error": str(e), "code": e.code}).encode(), "application/json")
        except Exception as e:  # shown on the page
            traceback.print_exc()
            msg = str(e) or e.__class__.__name__
            if isinstance(e, KeyError):
                msg = "the Studio restarted: open the tour again"
            self.send(400, json.dumps({"error": msg}).encode(), "application/json")


def main():
    global PORT
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    PORT = a.port
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
