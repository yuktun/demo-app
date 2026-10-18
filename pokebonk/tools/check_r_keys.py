with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("[...r.keys()].map(Fo)")
print("Context around r.keys():")
print(text[max(0, idx - 500):idx + 300])
