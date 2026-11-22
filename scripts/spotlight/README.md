# Object Spotlight data (dev machine only)

`spotlight.py` makes the data behind the tour's Object Spotlight: the outline
of an object (traced by Segment Anything), where the camera goes, the text and
a recorded voice. It runs once per object on your own computer. Nothing here is
deployed, bundled or run on Railway or Vercel: the tour only downloads the small
files it writes.

```
scripts/spotlight/scenes/<name>.json   ← you write this (one per scene)
        │  spotlight.py build
        ▼
public/spotlight/<sceneId>.json        ← what the tour fetches when the scene opens (~1-2 KB an object)
public/spotlight/voice/*.mp3           ← the voices (~8 KB a second)
shared/spotlight/scenes.generated.ts   ← which scenes have spotlights (no fetch for any other)
scripts/spotlight/out/*.jpg            ← previews of each outline, to check (not committed)
```

## The easy way: Spotlight Studio

```sh
scripts/spotlight/setup.sh     # once per computer (10-20 min, ~3 GB)
scripts/spotlight/studio       # opens http://127.0.0.1:8765 in your browser
```

1. Paste the tour's link, pick a scene.
2. Click the object on the panorama. A close-up opens and the outline is
   traced by itself (~10-20 s; the first one also loads the AI).
3. Check "What visitors will see". Something missing? Click on it. Took too
   much? Right-click what isn't part of it. It re-traces each time.
4. Type the tag, title and lines, pick a voice, press **Save & record voice**.
5. Try it (`npm run dev`, the page gives you the link), then commit the files
   it lists and push.

Existing spotlights of a scene are listed under the panorama, with Edit and
Delete. Everything below is what the Studio does for you, by hand.

## One-time setup (by hand)

`setup.sh` does all of this.

Python 3.11 or 3.12 (torch has no wheels for Fedora's 3.15). With
[uv](https://docs.astral.sh/uv/), which fetches its own Python:

```sh
cd ~/.cache/viewora-spotlight          # anywhere outside the repo
uv venv --python 3.12 venv
uv pip install --python venv/bin/python --index-url https://download.pytorch.org/whl/cpu torch torchvision
uv pip install --python venv/bin/python opencv-python-headless numpy pillow huggingface_hub hydra-core iopath setuptools wheel pip
SAM2_BUILD_CUDA=0 uv pip install --python venv/bin/python --no-build-isolation sam2
uv pip install --python venv/bin/python kokoro==0.9.4 soundfile
```

- `--index-url …/cpu` keeps torch CPU-only (the default wheel adds ~2 GB of CUDA).
- `--no-build-isolation` makes SAM 2 build against that torch instead of
  downloading a second (CUDA) one.
- `pip` is there for spaCy, which fetches its English model on the first voice.
- `ffmpeg` and `espeak-ng` must be installed (`dnf install ffmpeg espeak-ng`).
- First run downloads SAM 2.1 small (~180 MB) and Kokoro (~330 MB) from Hugging Face.
- No SAM 2? Install `segment_anything` instead and the script uses SAM ViT-B.

Below, `py` means `~/.cache/viewora-spotlight/venv/bin/python`.

## Adding an object

1. **Find the scene id and its photo.** `https://api.viewora.software/p/<tour-slug>`
   lists the scenes; you need the scene's `id` and `raw_image_url`.
   Make a spec (or add to the scene's existing one), e.g.
   `scenes/ruby-lounge-central-lounge.json`:

   ```json
   {
     "name": "Ruby Lounge (Panari Hotel) · Central Lounge",
     "scene": "f50045a6-bfcd-4a7c-b137-c1c6534f7477",
     "image": "https://media.viewora.software/…/1795000062854-5n1byq.png",
     "voice": "af_heart",
     "objects": []
   }
   ```

2. **Look at the object.** Render a view with a degree grid around roughly
   where it is (yaw 0 is the middle of the photo, +right; pitch +up):

   ```sh
   py spotlight.py view scenes/ruby-lounge-central-lounge.json --at 12 -18 --zoom 45
   ```

   Open `out/view_+12_-18_z45.jpg`, note the pixels of a few points on the
   object (and a few just off it), and turn them into degrees:

   ```sh
   py spotlight.py view scenes/ruby-lounge-central-lounge.json --at 12 -18 --zoom 45 --px 680 400 810 600
   ```

3. **Add the object** to `objects`:

   ```json
   {
     "id": "black-chairs",
     "label": "Seating",
     "at": [13.1, -12.4],
     "points": [[3.6, -10.9], [7.8, -11.7], [17.1, -15.5], [12.8, -25.0]],
     "exclude": [[23.4, -24.6], [-6.5, -30.5]],
     "zoom": 62,
     "title": "Black leather armchairs",
     "lines": ["Five high-back armchairs line the lounge wall.", "A quiet place to wait or meet."]
   }
   ```

   | field | |
   |---|---|
   | `at` | a point on the object (degrees). SAM's main prompt. |
   | `points` / `exclude` | more points on it / points that are *not* it. Use one per part for groups (a row of chairs). |
   | `zoom` | where the zoom ends (0-100, PSV: 0 = 90° view, 100 = 30°), or `"auto"` (frames the object at about half the screen). The script warns if the object is too big or too small for it. |
   | `title`, `lines` | the panel text. Keep it short: under ~2 KB an object, and it is read aloud. |
   | `label` | the small tag over the title. |
   | `say` | optional: what the voice says, if not the title + lines. |
   | `voice` | optional: `af_heart`, `af_bella`, `bf_emma`, `am_michael` (the patient-journey voices). |
   | `voiceSrc` | optional: use an existing recording (e.g. a journey line on R2) instead of recording one. |
   | `hint: false` | no hint ring on the object (it still opens on a tap, or by zooming in on it). |
   | `close_px` | gap bridging, in pixels of the 1600×1000 render (default 9). Raise it if a group comes out in pieces. |
   | `smooth` | gap bridging as a share of the object's size (default 0.07). Higher = a smoother silhouette that ignores dark gaps; 0 = follow every gap. |
   | `context` | how much wider than the landing view SAM sees (default 1.35). |
   | `model` | reserved for the 3D render (`Notes/3d-render-spotlight.md`); copied through, ignored by the tour. |

4. **Build:**

   ```sh
   py spotlight.py build scenes/ruby-lounge-central-lounge.json --only black-chairs
   ```

   Check `out/<scene>-<id>.jpg` (the landing view, as visitors see it) and
   `out/<scene>-<id>-detail.jpg` (the close-up SAM traced: the cyan line is
   the outline, green dots your points, red the excluded ones). Lines starting with `!`
   are warnings (pieces dropped, cut off at the edge, too small for the zoom).
   Wrong shape? Add `points` / `exclude` and build again. `--no-voice` skips
   recording while you iterate (a voice already recorded is kept).

5. **Try it** (`npm run dev`, open the tour, go to the scene): the hint ring
   sits on the object; a tap on the ring or the object, or zooming in on it,
   opens the spotlight. Commit the spec, the JSON, the MP3 and
   `scenes.generated.ts` together.

Re-recording happens only when the text or voice changes: MP3 names carry a
hash of both, so an old file is never served for new words.

## Cost per visit

Nothing for a tour or scene without spotlights (the scene list is in the app
code). On a scene with spotlights: its JSON (~0.6 KB compressed per object),
once. Opening a spotlight for the first time in a visit: the effect code
(GSAP + overlay, ~30 KB compressed, cached for a year) and that object's voice
(~8 KB a second of speech, cached for a year). All static, from Vercel's CDN.
