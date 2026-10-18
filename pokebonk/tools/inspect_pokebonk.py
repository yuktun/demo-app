import urllib.request
import re
import os
import json

base_url = "https://pokebonk.com/"

def fetch(path):
    url = urllib.parse.urljoin(base_url, path)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None

html = fetch("index.html").decode("utf-8", errors="ignore")
with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Downloaded index.html")

# Find scripts and links in index.html
scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
links = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', html)
print("Scripts:", scripts)
print("Links:", links)

# Fetch main js
main_script = None
for s in scripts:
    if "main" in s:
        main_script = s
        break

if main_script:
    js_content = fetch(main_script).decode("utf-8", errors="ignore")
    print(f"Main script {main_script} length: {len(js_content)}")
    
    # Check for imports or chunk names
    chunks = re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', js_content)
    print("Found chunks:", set(chunks))
    
    # Check for media/models/data files
    asset_refs = re.findall(r'["\'](?:/|\./)?(assets/[a-zA-Z0-9_\-\./]+\.(?:png|jpg|jpeg|webp|svg|glb|gltf|wasm|mp3|ogg|wav|json|bin|txt))["\']', js_content)
    print(f"Found {len(asset_refs)} asset refs:", set(asset_refs)[:20])
    
    # Check other file patterns or api endpoints
    fetch_calls = re.findall(r'fetch\(["\']([^"\']+)["\']', js_content)
    print("Fetch calls:", set(fetch_calls))
