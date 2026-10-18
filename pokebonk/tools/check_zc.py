with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("function BC(e){return new zC")
print(text[max(0, idx - 500):idx + 100])
