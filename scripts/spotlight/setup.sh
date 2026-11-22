#!/usr/bin/env bash
# One-time setup for the Spotlight tools (SAM 2 + Kokoro, CPU only).
# Everything goes to ~/.cache/viewora-spotlight; nothing is installed system-wide
# except ffmpeg / espeak-ng (asks for your password if they're missing).
# Safe to run again: it only adds what's missing.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="${SPOTLIGHT_CACHE:-$HOME/.cache/viewora-spotlight}"
mkdir -p "$DIR"
cd "$DIR"

need=()
command -v ffmpeg >/dev/null || need+=(ffmpeg)
command -v espeak-ng >/dev/null || need+=(espeak-ng)
if [ ${#need[@]} -gt 0 ]; then
  echo "Installing ${need[*]} (system packages)…"
  if command -v dnf >/dev/null; then sudo dnf install -y "${need[@]}"
  elif command -v apt-get >/dev/null; then sudo apt-get install -y "${need[@]}"
  elif command -v brew >/dev/null; then brew install "${need[@]}"
  else echo "Install ${need[*]} yourself, then run this again."; exit 1; fi
fi

UV="$(command -v uv || true)"
if [ -z "$UV" ]; then
  UV="$DIR/uv"
  if [ ! -x "$UV" ]; then
    echo "Downloading uv (Python installer)…"
    curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$DIR" INSTALLER_NO_MODIFY_PATH=1 sh
  fi
fi

[ -x venv/bin/python ] || "$UV" venv --python 3.12 venv
PY=venv/bin/python
echo "Installing torch (CPU only)…"
"$UV" pip install --python $PY --index-url https://download.pytorch.org/whl/cpu torch torchvision
"$UV" pip install --python $PY opencv-python-headless numpy pillow huggingface_hub hydra-core iopath setuptools wheel pip
echo "Installing SAM 2…"
SAM2_BUILD_CUDA=0 "$UV" pip install --python $PY --no-build-isolation sam2
echo "Installing the voice (Kokoro)…"
"$UV" pip install --python $PY kokoro==0.9.4 soundfile
$PY -c "import torch, cv2, sam2, kokoro; print('ok: torch', torch.__version__)"
echo
echo "Done. Start the studio with:  $HERE/studio"
