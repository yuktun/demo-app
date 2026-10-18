import urllib.request

base_url = "https://pokebonk.com/assets/"

test_urls = [
    "pmd/1.png",
    "front/1.png",
    "icons/1.png",
    "portraits/1.png",
    "cries/1.ogg",
    "music/title.ogg",
    "models/1.glb",
    "env/common/atlas.json",
    "env/common/atlas.png",
    "env/forest/atlas.json",
    "ui/icons/rotate.png",
    "items/leftovers.png"
]

for t in test_urls:
    url = base_url + t
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            print(f"OK ({resp.status}, {len(resp.read())} bytes): {t}")
    except Exception as e:
        print(f"FAIL: {t} -> {e}")
