with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re
matches = [m.start() for m in re.finditer(r'\bPo\(', text)]
for idx in matches:
    print("--- Po usage ---")
    print(text[max(0, idx - 150):idx + 150])

print("\n--- Fo definition and usages ---")
for m in re.finditer(r'\bFo\(', text):
    idx = m.start()
    print(text[max(0, idx - 100):idx + 150])
