"""Generate original, deliberately schematic exercise diagrams; no external artwork."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1] / 'assets'
# head, torso, arms, legs, equipment; coordinates are hand-authored, not traced.
poses = {
 'chest': ((70,43),'M70 60V113','M70 70L90 83L97 65','M70 113H109L111 155','M56 63V123H106M59 123V158', 'M70 70L124 70'),
 'row': ((70,43),'M70 60V113','M70 70L123 75','M70 113L101 123L125 151','M56 115H87M59 115V158M137 69V155M127 75H145', 'M70 70L96 91L83 96'),
 'legcurl': ((65,43),'M65 60V108','M65 72L88 101','M65 108H108L133 153','M50 65V118H111M51 118V155M122 145H145', 'M65 108H108L94 150'),
 'lateral': ((82,36),'M82 54V110','M82 64L62 103M82 64L102 103','M82 110L65 155M82 110L99 155','M53 104H70M95 104H112', 'M82 64L34 69M82 64L130 69'),
 'triceps': ((67,35),'M67 53V111','M67 65L84 85L115 70','M67 111L56 156M67 111L85 156','M135 25V157M129 25H142M135 30L115 70', 'M67 65L84 85L86 120'),
 'sitstand': ((65,46),'M65 64L77 110','M68 75L94 69','M77 110H110L113 156','M48 114H86M49 114V157M82 114V157', 'M82 65L106 59'),
 'supportedstand': ((65,46),'M65 64L77 110','M68 75L81 96L49 96','M77 110H110L113 156','M48 114H86M49 95V157M82 114V157', 'M82 65L70 93L49 96'),
 'incline': ((60,51),'M67 66L91 113','M72 74L92 86L105 61','M91 113H122L128 157','M48 64L81 123H119M81 123V157', 'M72 74L112 38'),
 'bridge': ((38,137),'M55 137L94 137','M57 140H82','M94 137L120 97L146 149','M20 158H156', 'M55 137L96 112L120 97L146 149'),
 'marchbridge': ((38,137),'M55 137L96 112','M57 141H82','M96 112L120 97L146 149','M20 158H156', 'M96 112L107 83L133 100'),
 'reverse': ((82,38),'M82 56V111','M82 69L59 84M82 69L105 84','M82 111L64 154M82 111L100 154','M82 71V123M54 120H110M41 35V112M123 35V112', 'M82 69L32 64M82 69L132 64'),
 'wallpush': ((86,42),'M81 60L64 110','M79 69L119 77','M64 110L48 155','M127 20V159M28 159H143', 'M98 67L117 93L126 77'),
 'bandrow': ((70,43),'M70 60V113','M70 70L124 74','M70 113L100 124L125 151','M142 72V158M125 74H142M55 115H86', 'M70 70L96 91L83 96'),
 'standingcurl': ((76,35),'M76 53V111','M76 68L115 86','M76 111L72 158M76 111L94 156','M126 78V158M115 86H137', 'M76 111L94 136L118 114'),
 'bandpull': ((76,42),'M76 60V117','M76 69L44 26M76 69L112 26','M76 117H108L109 155','M36 20H123M36 20L44 26M123 20L112 26M58 119H106', 'M76 69L48 78L47 53M76 69L108 78L110 53'),
 'bandreverse': ((82,36),'M82 54V110','M82 65L65 70M82 65L99 70','M82 110L65 155M82 110L99 155','M64 70H100', 'M82 65L32 65M82 65L132 65'),
}

def person(head, torso, arms, legs, equip, transform=''):
    return f'<g transform="{transform}"><path d="{equip}" fill="none" stroke="#567086" stroke-width="5"/><circle cx="{head[0]}" cy="{head[1]}" r="13" fill="none" stroke="#e6f3fa" stroke-width="5"/><path d="{torso} {arms} {legs}" fill="none" stroke="#80efd0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>'

for name, (head, torso, arms, legs, equip, end) in poses.items():
    if name in ('sitstand', 'supportedstand'):
        second = person((82,34), 'M82 52V107',end,'M82 107L76 156M82 107L94 156', equip, 'translate(210 30)')
    elif name in ('bridge','marchbridge'):
        second = person(head, end if name=='bridge' else torso,arms,end if name=='marchbridge' else 'M96 112L120 97L146 149',equip,'translate(210 30)')
    else:
        second = person(head,torso,end,legs,equip,'translate(210 30)')
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Original schematic: {escape(name)}">
<rect width="400" height="240" fill="#0b1525"/><text x="20" y="23" fill="#a6b7ca" font-family="sans-serif" font-size="11">ORIGINAL SCHEMATIC / NOT A PHOTO</text>
{person(head,torso,arms,legs,equip,'translate(6 30)')}{second}<path d="M183 115H207M201 109L207 115L201 121" stroke="#80efd0" fill="none" stroke-width="2"/>
<text x="45" y="220" fill="#a6b7ca" font-family="sans-serif" font-size="11">START</text><text x="255" y="220" fill="#a6b7ca" font-family="sans-serif" font-size="11">CONTROLLED MOVE</text></svg>'''
    (ROOT / f'{name}.svg').write_text(svg, encoding='utf-8')
print(f'Wrote {len(poses)} original schematic illustrations.')
