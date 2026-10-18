with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("shrine:[`shrine`,6.3]")
print("Context before s:")
print(text[max(0, idx - 400):idx + 200])
