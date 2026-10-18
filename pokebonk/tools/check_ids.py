import json

with open("data/sprites.json", "r", encoding="utf-8") as f:
    sprites = json.load(f)

sprite_ids = [int(k) for k in sprites.keys() if k.isdigit()]
print(f"Total sprite IDs in sprites.json: {len(sprite_ids)}")
print(f"Min sprite ID: {min(sprite_ids)}, Max sprite ID: {max(sprite_ids)}")

with open("data/pokemon.json", "r", encoding="utf-8") as f:
    pokemon = json.load(f)

print(f"Total pokemon entries: {len(pokemon)}")
p_ids = [p["id"] for p in pokemon]
print(f"Pokemon IDs min: {min(p_ids)}, max: {max(p_ids)}")
