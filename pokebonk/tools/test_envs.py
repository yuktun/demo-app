import urllib.request

biomes = [
    "common", "coast", "desert", "forest", "glacier", "graveyard", "ruins", "sanctum", "volcano"
]

files = [
    "atlas.json", "atlas.png", "hazards.png", "terrain.png", "sky.png", "tiles.png", "water.png", "ground.png"
]

base = "https://pokebonk.com/assets/env/"

for b in biomes:
    for f in files:
        url = f"{base}{b}/{f}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as resp:
                print(f"FOUND {b}/{f} ({len(resp.read())} bytes)")
        except Exception:
            pass
