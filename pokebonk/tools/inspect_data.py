import json

with open("data/sprites.json", "r", encoding="utf-8") as f:
    sprites = json.load(f)
print("Sprites keys:", list(sprites.keys())[:10] if isinstance(sprites, dict) else len(sprites))
if isinstance(sprites, dict):
    first_key = list(sprites.keys())[0]
    print(f"Sample sprite [{first_key}]:", sprites[first_key])

with open("data/pokemon.json", "r", encoding="utf-8") as f:
    pokemon = json.load(f)
print("Pokemon count/keys:", len(pokemon) if isinstance(pokemon, (list, dict)) else type(pokemon))
if isinstance(pokemon, dict):
    p_first = list(pokemon.keys())[0]
    print(f"Sample pokemon [{p_first}]:", pokemon[p_first])
elif isinstance(pokemon, list):
    print("Sample pokemon [0]:", pokemon[0])

with open("data/items.json", "r", encoding="utf-8") as f:
    items = json.load(f)
print("Items count:", len(items))
if isinstance(items, dict):
    i_first = list(items.keys())[0]
    print(f"Sample item [{i_first}]:", items[i_first])
