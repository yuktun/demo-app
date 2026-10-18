with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find export ... O as U ...
# Let's find what is exported as U:
import re
m = re.search(r'\b([a-zA-Z0-9_$]+)\s+as\s+U\b', text)
if m:
    orig = m.group(1)
    print("Exported as U is:", orig)
    # Find definition of orig
    defs = re.findall(rf'(?:var|let|const|function)\s+{orig}\b[^;]+;', text)
    print("Defs:", defs[:3])
    idx = text.find(f"{orig}=")
    if idx != -1:
        print("Assignment:", text[idx:idx + 400])
