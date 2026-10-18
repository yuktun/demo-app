with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

# Find xe definition (ranks)
idx = text.find("Dg(e,t=24)")
print("Context around Dg and xe:")
print(text[max(0, idx - 400):idx + 100])

# Find Z(e) calls (icons)
z_calls = set(re.findall(r'\bZ\([`"\']([^`"\']+)[`"\']', text))
print("Z icon calls:", z_calls)

# Find frames
frame_calls = set(re.findall(r'ui/frames/\$\{[^}]+\}\.png', text))
idx2 = text.find("ui/frames/")
print("Context around ui/frames/:")
print(text[max(0, idx2 - 300):idx2 + 100])

# Find avatars
idx3 = text.find("ui/avatars/")
print("Context around ui/avatars/:")
print(text[max(0, idx3 - 300):idx3 + 100])

# Find clan symbols and deco
idx4 = text.find("ui/clan/deco")
print("Context around ui/clan/deco:")
print(text[max(0, idx4 - 300):idx4 + 200])
