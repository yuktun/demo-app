import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

matches = re.findall(r'.{0,40}pillar:\s*[`"\'][^`"\']+[`"\'].{0,40}', text)
for m in matches:
    print("Pillar match:", m)

matches2 = re.findall(r'.{0,40}gate:\s*[`"\'][^`"\']+[`"\'].{0,40}', text)
for m in matches2:
    print("Gate match:", m)

# Let's check biomes
biome_matches = re.findall(r'(\b[a-zA-Z0-9_]+:\s*\{[^}]*pillar:[^}]*\})', text)
for b in biome_matches[:5]:
    print("Biome obj:", b)
