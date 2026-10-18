import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

# Find URLs starting with http or /api
urls = set(re.findall(r'https?://[a-zA-Z0-9_\-\./:]+', text))
print("Direct URLs in main.js:")
for u in sorted(urls):
    print(" ", u)

api_calls = set(re.findall(r'["\'](/api/[a-zA-Z0-9_\-\./]+)["\']', text))
print("API calls in main.js:", api_calls)

# Search news.js as well
with open("assets/news-CvuLq51Y-mvd1mlac.js", "rb") as f:
    text2 = f.read().decode("utf-8", errors="ignore")

urls2 = set(re.findall(r'https?://[a-zA-Z0-9_\-\./:]+', text2))
print("Direct URLs in news.js:")
for u in sorted(urls2):
    print(" ", u)

api_calls2 = set(re.findall(r'["\'](/api/[a-zA-Z0-9_\-\./]+)["\']', text2))
print("API calls in news.js:", api_calls2)
