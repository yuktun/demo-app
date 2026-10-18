with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

for keyword in ["frames", "avatars", "deco", "sym"]:
    matches = [m.start() for m in re.finditer(rf'\b{keyword}\b', text)]
    print(f"=== Keyword in main: {keyword} ({len(matches)} matches) ===")
    for idx in matches[:5]:
        print("  ", text[max(0, idx - 40):idx + 60])
