with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.rfind("export{")
if idx == -1:
    idx = text.rfind("export ")
print("Export at end:")
print(text[idx:])
