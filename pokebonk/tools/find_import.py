with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("w as _t")
start = text.rfind("import", 0, idx)
end = text.find(";", idx)
print("Import statement:")
print(text[start:end+1])
