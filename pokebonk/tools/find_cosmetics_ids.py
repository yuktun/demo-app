with open("assets/main-CmuSC2AB-mvd1mlac.js", "rb") as f:
    text = f.read().decode("utf-8", errors="ignore")

import re

matches = re.findall(r'[`"\']tr:([^`"\']+)[\'"`]', text)
print("tr avatar strings:", set(matches))

# Also search for deco: and sym:
decos = set(re.findall(r'[`"\']deco:([^`"\']+)[\'"`]', text))
print("deco strings:", decos)

syms = set(re.findall(r'[`"\']sym:([^`"\']+)[\'"`]', text))
print("sym strings:", syms)
