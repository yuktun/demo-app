import re

with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

tracks = set(re.findall(r'(?:playTrack|preloadTrack)\([`"\']([^`"\']+)[`"\']\)', text))
print("Tracks found:", tracks)

models = set(re.findall(r'(?:Po|Fo)\([`"\']([^`"\']+)[`"\']\)', text))
print("Models directly passed as literals:", models)

# Let's also see what variables are passed to Po
po_vars = re.findall(r'(?:Po|Fo)\(([^)]+)\)', text)
print("Po arguments:", set(po_vars))
