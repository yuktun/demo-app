with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

idx = text.find("comet?[`ruins_crystals`,3.2]")
print("Context around comet / ruins_crystals:")
print(text[max(0, idx - 300):idx + 300])

print("\n--- Model calls ---")
matches = re.findall(r'\.model\([^)]+\)', text)
print("Model calls:", matches[:10])

print("\n--- Fo callers ---")
matches2 = re.findall(r'.{0,50}\bFo\([^)]+\).{0,50}', text)
for m in matches2:
    print("Fo caller:", m)
