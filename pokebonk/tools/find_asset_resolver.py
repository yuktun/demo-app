with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find(",w as _t,")
print("Context around 'w as _t':")
print(text[max(0, idx - 200):idx + 200])
