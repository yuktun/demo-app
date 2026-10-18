with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

templates = ["ui/frames", "ui/types", "ui/avatars", "ui/ranks", "ui/icons", "ui/clan"]

for t in templates:
    print(f"=== {t} ===")
    matches = [m.start() for m in re.finditer(re.escape(t), text)]
    for idx in matches[:5]:
        print("  ", text[max(0, idx - 80):idx + 120])
