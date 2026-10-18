with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re
matches = re.findall(r'.{0,50}\bSt\s*=\s*[^,;]+.{0,50}', text)
for m in matches[:10]:
    print("Match St definition:", m)

matches2 = re.findall(r'function St\b.{0,100}', text)
for m in matches2[:10]:
    print("Function St:", m)
