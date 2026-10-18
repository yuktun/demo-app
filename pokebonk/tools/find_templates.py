import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

patterns = [
    r'.{0,100}models/\$\{[^}]+\}\.glb.{0,100}',
    r'.{0,100}cries/\$\{[^}]+\}\.ogg.{0,100}',
    r'.{0,100}music/\$\{[^}]+\}\.ogg.{0,100}',
    r'.{0,100}atlas\.json.{0,100}',
    r'.{0,100}portraits/\$\{[^}]+\}\.png.{0,100}',
    r'.{0,100}ui/icons/\$\{[^}]+\}\.png.{0,100}',
    r'.{0,100}items/\$\{[^}]+\}\.png.{0,100}',
]

for pat in patterns:
    print(f"=== Pattern: {pat} ===")
    matches = re.findall(pat, text)
    for m in matches[:5]:
        print("  MATCH:", m)
