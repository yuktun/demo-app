with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

for keyword in ["frames", "avatars", "deco", "sym", "badges", "clan"]:
    matches = re.findall(rf'.{{0,30}}\b{keyword}\b.{{0,50}}', text)
    print(f"=== Keyword: {keyword} ({len(matches)} matches) ===")
    for m in matches[:5]:
        print("  ", m)
