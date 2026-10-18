import re
import json

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    raw = f.read()

text = raw.decode("utf-8", errors="ignore")

# Find __vite__mapDeps or dynamic imports
deps = re.findall(r'__vite__mapDeps\s*=\s*\([^)]*\)\s*=>\s*i\.map\([^)]*\)', text)
print("Vite map deps:", deps[:5])
vite_arrays = re.findall(r'm\.f\s*=\s*(\[[^\]]+\])', text)
print("Vite arrays:", vite_arrays[:5])

# Find all strings that look like asset paths (.glb, .gltf, .png, .jpg, .webp, .svg, .mp3, .ogg, .wav, .json, .wasm, .bin, .css, .js)
extensions = "glb|gltf|png|jpg|jpeg|webp|svg|mp3|ogg|wav|json|wasm|bin|css|js|woff|woff2|ttf"
pattern = rf'["\'`]([^"\'`\s\(\)]+\.(?:{extensions}))["\'`]'
matches = set(re.findall(pattern, text, re.IGNORECASE))

print(f"Total asset path matches: {len(matches)}")
assets_by_ext = {}
for m in matches:
    ext = m.split('.')[-1].lower()
    assets_by_ext.setdefault(ext, []).append(m)

for ext, items in sorted(assets_by_ext.items()):
    print(f"[{ext}]: {len(items)} items. Examples: {items[:5]}")
