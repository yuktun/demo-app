import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

matches = re.findall(r'.{0,30}\bmodel\s*:[^,;}]+.{0,30}', text)
for m in matches[:15]:
    print("Match model prop:", m)
