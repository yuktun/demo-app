import urllib.request
import re
import os

base_url = "https://pokebonk.com/"

os.makedirs("assets", exist_ok=True)
os.makedirs("icons", exist_ok=True)

def fetch(path):
    url = urllib.parse.urljoin(base_url, path)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None

# Save main.js
main_data = fetch("assets/main-CEW9H2mC-mvd1mlac.js")
if main_data:
    with open("assets/main-CEW9H2mC-mvd1mlac.js", "wb") as f:
        f.write(main_data)
    print("Saved main.js, size:", len(main_data))

# Save i18n
i18n_data = fetch("assets/i18n-DtjQO0zE-mvd1mlac.js")
if i18n_data:
    with open("assets/i18n-DtjQO0zE-mvd1mlac.js", "wb") as f:
        f.write(i18n_data)
    print("Saved i18n.js, size:", len(i18n_data))
