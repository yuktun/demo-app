import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

ui_matches = set(re.findall(r'ui/[a-zA-Z0-9_\-\./]+\.png', text))
print(f"Direct UI matches ({len(ui_matches)}):")
for u in sorted(ui_matches):
    print(" ", u)

# Also find patterns like ui/types/${e}.png, ui/icons/${e}.png, ui/ranks/${e}.png, ui/frames/${e}.png, ui/avatars/${e}.png, ui/clan/${e}.png
ui_templates = set(re.findall(r'ui/[a-zA-Z0-9_\-]+/\$\{[^}]+\}\.png', text))
print("UI templates:", ui_templates)
