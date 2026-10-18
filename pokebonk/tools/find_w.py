with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find export ... w
import re
idx = text.find(",w as ")
if idx == -1:
    idx = text.find("w as ")
print("Export index:", idx)
if idx != -1:
    print(text[max(0, idx - 100):idx + 100])

# Find where w is defined
matches = re.findall(r'.{0,50}\bw\s*=\s*[^,;]+.{0,50}', text)
for m in matches[:10]:
    print("Match w definition:", m)
