# === Colab: transcribe any video/audio (mp4, m4a, mp3, wav, ...) ===
# Setup once per notebook: Runtime > Change runtime type > T4 GPU > Save. Then run this cell.

MODEL    = "turbo"   # "turbo" = fast + accurate. "large-v3" = slightly better, ~2x slower
LANGUAGE = None      # None = auto-detect, or "en", "de", ...
USE_DRIVE_PATH = ""  # optional: for big files put them in Google Drive and paste the path,
                     # e.g. "/content/drive/MyDrive/video.mp4" (uploading to Drive is faster than the upload button)

import os, subprocess, torch
from google.colab import files
assert torch.cuda.is_available(), "No GPU - set Runtime > Change runtime type > T4 GPU"
subprocess.run("pip install -q openai-whisper", shell=True, check=True)
import whisper

if USE_DRIVE_PATH:
    from google.colab import drive
    drive.mount("/content/drive")
    src = USE_DRIVE_PATH
else:
    src = list(files.upload())[0]

# Strip to 16 kHz mono audio first (faster and more robust than feeding the video)
audio = "audio_16k.wav"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "16000", audio], check=True)

model = whisper.load_model(MODEL)
r = model.transcribe(audio, language=LANGUAGE, verbose=False)
print("Detected language:", r["language"])

def ts(t, srt=False):
    h, rem = divmod(int(t), 3600); m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{int((t % 1) * 1000):03d}" if srt else f"{h:02d}:{m:02d}:{s:02d}"

base = os.path.splitext(os.path.basename(src))[0]
txt, srt = f"{base}_transcript.txt", f"{base}.srt"
with open(txt, "w", encoding="utf-8") as f:
    for s in r["segments"]:
        f.write(f"[{ts(s['start'])}] {s['text'].strip()}\n")
with open(srt, "w", encoding="utf-8") as f:
    for i, s in enumerate(r["segments"], 1):
        f.write(f"{i}\n{ts(s['start'], True)} --> {ts(s['end'], True)}\n{s['text'].strip()}\n\n")

files.download(txt)   # timestamped transcript
files.download(srt)   # subtitle file (optional, works in VLC / YouTube)
