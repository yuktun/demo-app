with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

idx = text.find("St=e=>")
print("Context around St=e=>:")
print(text[max(0, idx - 500):idx + 300])
