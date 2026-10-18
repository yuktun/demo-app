with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("{model:e[0],scale:1")
print("Context around model:e[0]:")
print(text[max(0, idx - 800):idx + 200])
