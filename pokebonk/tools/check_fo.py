import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

matches = [m.start() for m in re.finditer(r'\bFo\b', text)]
for idx in matches:
    print(text[max(0, idx - 40):idx + 40])
