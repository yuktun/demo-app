import urllib.request
from concurrent.futures import ThreadPoolExecutor

base = "https://pokebonk.com/assets/"

def check_exists(path):
    url = base + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD")
        with urllib.request.urlopen(req) as resp:
            return path, resp.status == 200
    except Exception:
        return path, False

test_paths = [
    f"pmd/{i}.png" for i in range(1, 155)
] + [
    f"pmd/{i}.png" for i in [152, 250, 384, 491, 1025]
]

with ThreadPoolExecutor(max_workers=10) as executor:
    results = dict(executor.map(check_exists, test_paths))

found = [p for p, ok in results.items() if ok]
print(f"Tested {len(test_paths)} paths, found {len(found)}")
print("Sample found:", found[:10])
print("Higher gens found:", [p for p in found if any(x in p for x in ['152', '250', '384', '491', '1025'])])
