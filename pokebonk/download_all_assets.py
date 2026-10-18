import urllib.request
import os
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://pokebonk.com/"

def download_file(rel_path):
    local_path = os.path.normpath(rel_path)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return rel_path, "ALREADY_EXISTS", os.path.getsize(local_path)
    
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    url = urllib.parse.urljoin(BASE_URL, rel_path.replace("\\", "/"))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        with open(local_path, "wb") as f:
            f.write(data)
        return rel_path, "OK", len(data)
    except Exception as e:
        return rel_path, f"ERR: {e}", 0

# Collect all files to download
queue = []

# 1. Models
models = [
    "ball", "chest", "freechest", "altar", "greed", "goldrock", "cage", "boss", "portal",
    "shrine", "challenge", "cursed", "cursedchest", "bounceshroom", "slots",
    "desert_hoodoo", "desert_boulder", "desert_skull", "desert_pebbles", "desert_rockpile",
    "ruins_hoodoo", "ruins_obelisk", "ruins_arch", "ruins_statue", "ruins_brazier",
    "ruins_obelisk_broken", "ruins_column", "ruins_fossil", "ruins_crystals", "ruins_pots", "ruins_bones",
    "sanct_pillar", "sanct_gate", "ruin_pillar", "ruin_gate", "sanct_portal", "sanct_root", "sanct_bramble"
]
for m in models:
    queue.append(f"assets/models/{m}.glb")

# 2. Music
queue.append("assets/music/menu.ogg")

# 3. Environment biomes
biomes = ["common", "coast", "desert", "forest", "glacier", "graveyard", "ruins", "sanctum", "volcano"]
for b in biomes:
    queue.append(f"assets/env/{b}/atlas.json")
    queue.append(f"assets/env/{b}/atlas.png")
    if b == "common":
        queue.append(f"assets/env/{b}/hazards.png")
    else:
        queue.append(f"assets/env/{b}/ground.png")

# 4. UI icons
ui_icons = [
    'rotate', 'coin', 'gold', 'research', 'reroll', 'globe', 'jump', 'leave', 'unlock', 'pause',
    'news', 'aim', 'friend-add', 'bug', 'friends', 'stardust', 'invite', 'skip', 'champion',
    'brush', 'clan', 'megaphone', 'check', 'fullscreen', 'target', 'banish', 'blessing', 'crown',
    'pin', 'shiny-charm', 'dash', 'request', 'mail', 'send', 'lock', 'map-ball', 'map-shroom', 'dice'
]
for u in ui_icons:
    queue.append(f"assets/ui/icons/{u}.png")

# 5. UI types (all 18 types)
types = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy'
]
for t in types:
    queue.append(f"assets/ui/types/{t}.png")
    queue.append(f"assets/ui/frames/{t}.png")

# 6. UI ranks
ranks = ['top100', 'top50', 'top25', 'top10', 'elite', 'master']
for r in ranks:
    queue.append(f"assets/ui/ranks/{r}.png")

# 7. UI avatars & clan cosmetics
avatars = ['fieldwork', 'naturalist', 'professor', 'aide']
for a in avatars:
    queue.append(f"assets/ui/avatars/{a}.png")
queue.append("assets/ui/clan/deco/pioneer.png")
queue.append("assets/ui/clan/sym/sprout.png")

# 8. Items from data/items.json
try:
    with open("data/items.json", "r", encoding="utf-8") as f:
        items_data = json.load(f)
        for k, v in items_data.items():
            if isinstance(v, dict) and "icon" in v:
                queue.append(f"assets/{v['icon']}")
            else:
                queue.append(f"assets/items/{k}.png")
except Exception as e:
    print(f"Error reading items.json: {e}")

# Standard fallback item
queue.append("assets/items/poke-ball.png")
queue.append("assets/items/magnet.png")

# 9. Gen 1 Pokémon (1 to 151) + Popular boss / starter Pokémon (up to 251 + legendaries)
pokemon_ids = list(range(1, 152)) + [
    # Gen 2 starters and popular
    152, 153, 154, 155, 156, 157, 158, 159, 160, 169, 196, 197, 212, 214, 227, 248, 249, 250, 251,
    # Gen 3 popular
    252, 253, 254, 255, 256, 257, 258, 259, 260, 280, 281, 282, 306, 330, 359, 373, 376, 380, 381, 382, 383, 384, 385, 386,
    # Gen 4 popular
    387, 390, 393, 443, 444, 445, 448, 475, 487, 491, 493
]

pokemon_ids = sorted(list(set(pokemon_ids)))

for pid in pokemon_ids:
    queue.append(f"assets/pmd/{pid}.png")
    queue.append(f"assets/portraits/{pid}.png")
    queue.append(f"assets/icons/{pid}.png")
    queue.append(f"assets/cries/{pid}.ogg")

queue = sorted(list(set(queue)))
print(f"Total assets queued for download: {len(queue)}")

start_time = time.time()
success = 0
failed = 0
skipped = 0
total_bytes = 0

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = {executor.submit(download_file, p): p for p in queue}
    for i, future in enumerate(as_completed(futures)):
        path, status, size = future.result()
        total_bytes += size
        if status == "OK":
            success += 1
        elif status == "ALREADY_EXISTS":
            skipped += 1
        else:
            failed += 1
            # print(f"Failed {path}: {status}")
        
        if (i + 1) % 50 == 0 or (i + 1) == len(queue):
            print(f"Progress: {i+1}/{len(queue)} (Success: {success}, Skipped: {skipped}, Failed: {failed})")

elapsed = time.time() - start_time
print(f"Finished in {elapsed:.2f}s! Downloaded: {success}, Skipped: {skipped}, Failed: {failed}, Total new bytes: {total_bytes}")
