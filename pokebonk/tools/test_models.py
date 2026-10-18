import urllib.request

base = "https://pokebonk.com/assets/models/"

models = [
    "ball", "chest", "freechest", "altar", "greed", "goldrock", "cage", "boss", "portal",
    "shrine", "challenge", "cursed", "cursedchest", "bounceshroom", "slots",
    "desert_hoodoo", "desert_boulder", "desert_skull", "desert_pebbles", "desert_rockpile",
    "ruins_hoodoo", "ruins_obelisk", "ruins_arch", "ruins_statue", "ruins_brazier",
    "ruins_obelisk_broken", "ruins_column", "ruins_fossil", "ruins_crystals", "ruins_pots", "ruins_bones",
    "sanct_pillar", "sanct_gate", "ruin_pillar", "ruin_gate", "sanct_portal", "sanct_root", "sanct_bramble"
]

found = []
for m in models:
    url = f"{base}{m}.glb"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            found.append((m, len(data)))
            print(f"FOUND {m}.glb ({len(data)} bytes)")
    except Exception as e:
        print(f"NOT FOUND {m}.glb: {e}")

print(f"Total found: {len(found)} / {len(models)}")
