with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

matches = [m.start() for m in re.finditer(r'https://api\.pokebonk\.com', text)]
print(f"Total occurrences of api.pokebonk.com: {len(matches)}")
for idx in matches:
    print("--- Occurrence ---")
    print(text[max(0, idx - 100):idx + 300])
