with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

for varname in ["xe", "decos", "frames", "avatars"]:
    matches = re.findall(rf'(?:var|let|const)\s+{varname}\s*=[^;]+;', text)
    print(f"Matches for {varname}:", matches[:3])

idx = text.find("Dg(e,t=24)")
# Let's search backwards from idx for xe=
idx_xe = text.rfind("xe=", 0, idx)
if idx_xe != -1:
    print("Found xe= before Dg:", text[idx_xe:idx_xe + 400])
