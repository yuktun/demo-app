import urllib.request
import os
import json

base_url = "https://pokebonk.com/"

data_files = [
    "data/abilities.json",
    "data/i18n/en.json",
    "data/i18n/fr.json",
    "data/i18n/ja.json",
    "data/i18n/ko.json",
    "data/i18n/pt.json",
    "data/i18n/ru.json",
    "data/i18n/zh.json",
    "data/i18n/zht.json",
    "data/items.json",
    "data/learnsets.json",
    "data/moves.json",
    "data/pokemon.json",
    "data/sprites.json",
    "data/types.json",
]

for df in data_files:
    os.makedirs(os.path.dirname(df), exist_ok=True)
    url = urllib.parse.urljoin(base_url, df)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
        with open(df, "wb") as f:
            f.write(content)
        print(f"Downloaded {df} ({len(content)} bytes)")
    except Exception as e:
        print(f"Error {df}: {e}")
