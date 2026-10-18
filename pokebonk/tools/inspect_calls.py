import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find callers of Po and Fo
po_matches = re.findall(r'.{0,40}\bPo\([^)]+\).{0,40}', text)
for m in po_matches[:5]:
    print("Call Po:", m)

fo_matches = re.findall(r'.{0,40}\bFo\([^)]+\).{0,40}', text)
for m in fo_matches[:5]:
    print("Call Fo:", m)

# Find preloadTrack or playTrack or track=
track_matches = re.findall(r'.{0,40}(?:preloadTrack|playTrack|playMusic|trackBytes).{0,60}', text)
for m in track_matches[:10]:
    print("Track match:", m)
