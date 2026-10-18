import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find music names
music_matches = re.findall(r'preloadTrack\(["\']([^"\']+)["\']|playTrack\(["\']([^"\']+)["\']|music/["\']?\s*\+\s*([a-zA-Z0-9_\-]+)|["\']music/([^"\']+)["\']', text)
print("Music regex matches:", set([m for tup in music_matches for m in tup if m]))

# Search for any string ending in .ogg
oggs = set(re.findall(r'["\']([a-zA-Z0-9_\-\./]+\.ogg)["\']', text))
print("OGG references:", oggs)

# Search for any string ending in .glb
glbs = set(re.findall(r'["\']([a-zA-Z0-9_\-\./]+\.glb)["\']', text))
print("GLB references:", glbs)

# Search for env/ occurrences
envs = set(re.findall(r'["\'](env/[a-zA-Z0-9_\-\./]+)["\']', text))
print("ENV references:", envs)

# Also let's search news.js
with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text2 = f.read().decode("utf-8", errors="ignore")

envs2 = set(re.findall(r'["\'](env/[a-zA-Z0-9_\-\./]+)["\']', text2))
print("ENV references in news:", envs2)

# Check for music track tables or arrays
music_arrays = re.findall(r'trackBytes\.get\([^)]+\)|(?:tracks|bgm|music)\s*[:=]\s*(\[[^\]]+\]|\{[^\}]+\})', text)
print("Music structures:", music_arrays[:5])

# Find where models are loaded
model_calls = re.findall(r'.{0,50}models/\$\{[^}]+\}\.glb.{0,50}', text)
for mc in model_calls:
    print("Model load context:", mc)
