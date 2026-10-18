import urllib.request

base = "https://pokebonk.com/assets/"

test_files = [
    "ui/avatars/fieldwork.png",
    "ui/avatars/naturalist.png",
    "ui/avatars/professor.png",
    "ui/avatars/aide.png",
    "ui/clan/deco/pioneer.png",
    "ui/clan/sym/sprout.png",
]

for tf in test_files:
    try:
        req = urllib.request.Request(base + tf, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            print(f"FOUND {tf} ({len(resp.read())} bytes)")
    except Exception as e:
        print(f"FAIL {tf}: {e}")
