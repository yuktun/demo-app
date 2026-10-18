import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find all occurrences of playTrack
matches = [m.start() for m in re.finditer(r'\bplayTrack\(', text)]
print(f"Total playTrack calls: {len(matches)}")
for idx in matches:
    print(text[max(0, idx - 80):idx + 80])
