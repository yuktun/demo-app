with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("rs-frames")
print("Context around rs-frames:")
print(text[max(0, idx - 600):idx + 300])

idx2 = text.find("a===`tr`?X(`img`")
print("\nContext around a===tr:")
print(text[max(0, idx2 - 400):idx2 + 200])
