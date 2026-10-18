with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

# Find audio class or sfx methods
matches = re.findall(r'.{0,40}(?:playSfx|playSample|sfx|AudioContext|decodeAudioData).{0,60}', text)
for m in matches[:15]:
    print("Match audio:", m)
