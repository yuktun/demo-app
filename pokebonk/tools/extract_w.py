with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("data/pokemon.json")
start = text.rfind("{", 0, idx)
end = text.find("}", idx)

print("Full dictionary W:")
print(text[start:end+1])
