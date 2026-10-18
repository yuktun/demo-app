import re
import glob
import urllib.request
import os

base_url = "https://pokebonk.com/assets/"

css_files = glob.glob("assets/*.css")
fonts = set()
for cf in css_files:
    with open(cf, "rb") as f:
        content = f.read().decode("utf-8", errors="ignore")
    # find url(./...)
    matches = re.findall(r'url\(\.?/?([a-zA-Z0-9_\-\.]+\.(?:woff2|woff|ttf))\)', content)
    fonts.update(matches)

print(f"Found {len(fonts)} font files referenced in CSS")
downloaded = 0
for font in sorted(fonts):
    local_path = os.path.join("assets", font)
    if os.path.exists(local_path):
        continue
    url = base_url + font
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        with open(local_path, "wb") as f:
            f.write(data)
        downloaded += 1
        print(f"Downloaded font {font} ({len(data)} bytes)")
    except Exception as e:
        print(f"Error font {font}: {e}")

print(f"Finished fonts: downloaded {downloaded} new fonts.")
