import urllib.request
import os

base_url = "https://pokebonk.com/"

files_to_download = [
    "assets/700-BMW3JZp3-mvd1mlac.css",
    "assets/800-VsvERrVS-mvd1mlac.css",
    "assets/900-BQAuzZ6h-mvd1mlac.css",
    "assets/cyrillic-600-CmPgt5e5-mvd1mlac.css",
    "assets/cyrillic-700-DY6KwlU9-mvd1mlac.css",
    "assets/cyrillic-800-C2iqSjNY-mvd1mlac.css",
    "assets/cyrillic-900-DNY6XVKJ-mvd1mlac.css",
    "assets/main-CmuSC2AB-mvd1mlac.js",
    "assets/i18n-DtjQO0zE-mvd1mlac.js",
    "assets/news-CvuLq51Y-mvd1mlac.js",
    "assets/news-C-BvFgKs-mvd1mlac.css",
    "assets/three-QAPlWxlR.js",
    "assets/main-B5kynkNJ-mvd1mlac.css",
    "assets/en-CxAY_bvw-mvd1mlac.js",
    "assets/fr-B_ixhRhl-mvd1mlac.js",
    "assets/ja-DJJJT8Sz-mvd1mlac.js",
    "assets/ko-Bf-r30cH-mvd1mlac.js",
    "assets/pt-BEl_kaIJ-mvd1mlac.js",
    "assets/ru-yQSFVcET-mvd1mlac.js",
    "assets/zh-QnEYAn5h-mvd1mlac.js",
    "assets/zht-CeobLPpg-mvd1mlac.js",
    "favicon.ico",
    "icons/favicon-96.png",
    "icons/apple-touch-icon.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "manifest.webmanifest",
]

for rel_path in files_to_download:
    os.makedirs(os.path.dirname(rel_path) or ".", exist_ok=True)
    url = urllib.parse.urljoin(base_url, rel_path)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        with open(rel_path, "wb") as f:
            f.write(data)
        print(f"Downloaded {rel_path} ({len(data)} bytes)")
    except Exception as e:
        print(f"Error {rel_path}: {e}")
