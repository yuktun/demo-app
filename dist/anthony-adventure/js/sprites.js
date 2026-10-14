/**
 * Anthony's Adventure (安東尼大冒險)
 * Procedural Pixel Art & Sprite Rendering Engine
 * Generates crisp 16-bit retro sprites for Monsters (Front & Back),
 * Overworld Characters, NPCs, Map Tiles, and Battle FX.
 */

class SpriteManager {
  constructor() {
    this.cache = new Map();
    this.tileCache = new Map();
  }

  // Helper to create an offscreen canvas
  createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  // Generate or retrieve monster battle sprite (front or back)
  getMonsterSprite(monsterId, isBack = false) {
    const key = `mon_${monsterId}_${isBack ? 'back' : 'front'}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const size = 64;
    const { canvas, ctx } = this.createCanvas(size, size);
    this.drawProceduralMonster(ctx, monsterId, size, isBack);

    this.cache.set(key, canvas);
    return canvas;
  }

  // Draw distinct pixel art monster based on ID
  drawProceduralMonster(ctx, id, size, isBack) {
    ctx.save();
    const cx = size / 2;
    const cy = isBack ? size * 0.65 : size * 0.55;

    switch (id) {
      case 1: // 焰尾狐 (Pyrotail)
        this.drawPyrotail(ctx, cx, cy, isBack, false);
        break;
      case 2: // 烈焰九尾 (Solaris Fox)
        this.drawPyrotail(ctx, cx, cy, isBack, true);
        break;
      case 3: // 葉鬃狼 (Leafmane)
        this.drawLeafmane(ctx, cx, cy, isBack, false);
        break;
      case 4: // 翡翠影狼 (Verdant Fang)
        this.drawLeafmane(ctx, cx, cy, isBack, true);
        break;
      case 5: // 晶沫獺 (Aquapup)
        this.drawAquapup(ctx, cx, cy, isBack, false);
        break;
      case 6: // 海瀾龍獺 (Tidal Drake)
        this.drawAquapup(ctx, cx, cy, isBack, true);
        break;
      case 7: // 電羽雀 (Sparksong)
        this.drawSparksong(ctx, cx, cy, isBack);
        break;
      case 8: // 岩甲穿山獸 (Rockadillo)
        this.drawRockadillo(ctx, cx, cy, isBack);
        break;
      case 9: // 毒刺菇寶 (Sporemite)
        this.drawSporemite(ctx, cx, cy, isBack);
        break;
      case 10: // 幽影蝠 (Shadowbat)
        this.drawShadowbat(ctx, cx, cy, isBack);
        break;
      case 11: // 霜角白鹿 (Frosthorn)
        this.drawFrosthorn(ctx, cx, cy, isBack);
        break;
      case 12: // 鋼甲霸犀 (Ironhorn)
        this.drawIronhorn(ctx, cx, cy, isBack);
        break;
      case 13: // 暗夜魔龍 (Void Dragon - Boss)
        this.drawVoidDragon(ctx, cx, cy, isBack);
        break;
      case 14: // 艾克西翁 (Aexion - Legendary)
        this.drawAexion(ctx, cx, cy, isBack);
        break;
      default:
        this.drawGenericMonster(ctx, cx, cy, isBack);
        break;
    }

    ctx.restore();
  }

  // Monster 1 & 2: Pyrotail & Solaris Fox
  drawPyrotail(ctx, cx, cy, isBack, isEvolved) {
    const scale = isEvolved ? 1.3 : 1.0;
    ctx.scale(scale, scale);
    const ox = cx / scale;
    const oy = cy / scale;

    // Fiery tail
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(isBack ? ox + 14 : ox - 16, oy - 2, isEvolved ? 18 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(isBack ? ox + 16 : ox - 18, oy - 6, isEvolved ? 14 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(isBack ? ox + 17 : ox - 19, oy - 8, isEvolved ? 9 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isEvolved ? '#E65100' : '#FF6F00';
    ctx.beginPath();
    ctx.ellipse(ox, oy, isEvolved ? 16 : 12, isEvolved ? 18 : 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (front only)
    if (!isBack) {
      ctx.fillStyle = '#FFF3E0';
      ctx.beginPath();
      ctx.ellipse(ox + 2, oy + 4, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    const hy = oy - 14;
    ctx.fillStyle = isEvolved ? '#E65100' : '#FF6F00';
    ctx.beginPath();
    ctx.arc(ox, hy, isEvolved ? 12 : 9, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#D84315';
    ctx.beginPath();
    ctx.moveTo(ox - 8, hy - 4);
    ctx.lineTo(ox - 12, hy - 16);
    ctx.lineTo(ox - 2, hy - 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 8, hy - 4);
    ctx.lineTo(ox + 12, hy - 16);
    ctx.lineTo(ox + 2, hy - 8);
    ctx.fill();

    // Face / Eyes (front only)
    if (!isBack) {
      ctx.fillStyle = '#1A237E';
      ctx.fillRect(ox - 4, hy - 2, 2, 3);
      ctx.fillRect(ox + 3, hy - 2, 2, 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ox - 4, hy - 3, 1, 1);
      ctx.fillRect(ox + 3, hy - 3, 1, 1);
      // Nose
      ctx.fillStyle = '#212121';
      ctx.fillRect(ox - 1, hy + 2, 2, 1);
    }
  }

  // Monster 3 & 4: Leafmane & Verdant Fang
  drawLeafmane(ctx, cx, cy, isBack, isEvolved) {
    const scale = isEvolved ? 1.25 : 1.0;
    ctx.scale(scale, scale);
    const ox = cx / scale;
    const oy = cy / scale;

    // Body
    ctx.fillStyle = isEvolved ? '#2E7D32' : '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(ox, oy, 14, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf Mane
    ctx.fillStyle = isEvolved ? '#1B5E20' : '#81C784';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const lx = ox + Math.cos(angle) * 15;
      const ly = oy - 8 + Math.sin(angle) * 11;
      ctx.beginPath();
      ctx.arc(lx, ly, isEvolved ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    const hy = oy - 12;
    ctx.fillStyle = isEvolved ? '#2E7D32' : '#4CAF50';
    ctx.beginPath();
    ctx.arc(ox, hy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Wolf Ears
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.moveTo(ox - 8, hy - 4);
    ctx.lineTo(ox - 10, hy - 17);
    ctx.lineTo(ox - 3, hy - 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 8, hy - 4);
    ctx.lineTo(ox + 10, hy - 17);
    ctx.lineTo(ox + 3, hy - 8);
    ctx.fill();

    if (!isBack) {
      // Golden Eyes
      ctx.fillStyle = '#FFD600';
      ctx.fillRect(ox - 5, hy - 2, 2, 3);
      ctx.fillRect(ox + 3, hy - 2, 2, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ox - 4, hy - 1, 1, 2);
      ctx.fillRect(ox + 4, hy - 1, 1, 2);
      // Snout
      ctx.fillStyle = '#C8E6C9';
      ctx.fillRect(ox - 2, hy + 2, 4, 3);
      ctx.fillStyle = '#212121';
      ctx.fillRect(ox - 1, hy + 2, 2, 1);
    }
  }

  // Monster 5 & 6: Aquapup & Tidal Drake
  drawAquapup(ctx, cx, cy, isBack, isEvolved) {
    const scale = isEvolved ? 1.3 : 1.0;
    ctx.scale(scale, scale);
    const ox = cx / scale;
    const oy = cy / scale;

    // Tail
    ctx.fillStyle = '#0288D1';
    ctx.beginPath();
    ctx.ellipse(isBack ? ox - 12 : ox + 14, oy + 5, isEvolved ? 14 : 9, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isEvolved ? '#01579B' : '#29B6F6';
    ctx.beginPath();
    ctx.ellipse(ox, oy, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest Pearl / Water Shell
    ctx.fillStyle = '#E1F5FE';
    ctx.beginPath();
    ctx.arc(isBack ? ox - 2 : ox + 2, isBack ? oy + 2 : oy + 5, isEvolved ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(isBack ? ox - 2 : ox + 2, isBack ? oy + 2 : oy + 5, isEvolved ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const hy = oy - 12;
    ctx.fillStyle = isEvolved ? '#01579B' : '#29B6F6';
    ctx.beginPath();
    ctx.arc(ox, hy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Round Otter Ears
    ctx.fillStyle = '#0288D1';
    ctx.beginPath();
    ctx.arc(ox - 9, hy - 5, 3.5, 0, Math.PI * 2);
    ctx.arc(ox + 9, hy - 5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (isEvolved) {
      // Dragon Horns
      ctx.fillStyle = '#80D8FF';
      ctx.beginPath();
      ctx.moveTo(ox - 6, hy - 7);
      ctx.lineTo(ox - 12, hy - 20);
      ctx.lineTo(ox - 3, hy - 9);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox + 6, hy - 7);
      ctx.lineTo(ox + 12, hy - 20);
      ctx.lineTo(ox + 3, hy - 9);
      ctx.fill();
    }

    if (!isBack) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(ox - 5, hy - 2, 2, 3);
      ctx.fillRect(ox + 3, hy - 2, 2, 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ox - 5, hy - 3, 1, 1);
      ctx.fillRect(ox + 3, hy - 3, 1, 1);
      // Whiskers
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox - 4, hy + 3); ctx.lineTo(ox - 8, hy + 2);
      ctx.moveTo(ox + 4, hy + 3); ctx.lineTo(ox + 8, hy + 2);
      ctx.stroke();
    }
  }

  // Monster 7: Sparksong (Electric Bird)
  drawSparksong(ctx, cx, cy, isBack) {
    // Wings
    ctx.fillStyle = '#FFEA00';
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 2, 9, 14, -Math.PI / 6, 0, Math.PI * 2);
    ctx.ellipse(cx + 16, cy - 2, 9, 14, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#FBC02D';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    // Lightning Crest on head
    ctx.fillStyle = '#FF6D00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx - 5, cy - 24);
    ctx.lineTo(cx + 1, cy - 18);
    ctx.lineTo(cx + 6, cy - 26);
    ctx.lineTo(cx + 2, cy - 13);
    ctx.fill();

    if (!isBack) {
      // Eyes & Beak
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 4, cy - 4, 2, 2);
      ctx.fillRect(cx + 3, cy - 4, 2, 2);
      ctx.fillStyle = '#FF6D00';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 1);
      ctx.lineTo(cx + 2, cy - 1);
      ctx.lineTo(cx, cy + 4);
      ctx.fill();
    }
  }

  // Monster 8: Rockadillo (Rock/Ground)
  drawRockadillo(ctx, cx, cy, isBack) {
    // Rocky Shell
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell Plates
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cx - 8, cy - 8, 5, 6);
    ctx.fillRect(cx + 3, cy - 8, 5, 6);
    ctx.fillRect(cx - 5, cy + 1, 10, 6);

    // Head
    const hy = cy - 8;
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.arc(isBack ? cx : cx - 12, hy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Claws
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(cx - 14, cy + 9, 6, 4);
    ctx.fillRect(cx + 8, cy + 9, 6, 4);

    if (!isBack) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 15, hy - 2, 2, 2);
    }
  }

  // Monster 9: Sporemite (Mushroom)
  drawSporemite(ctx, cx, cy, isBack) {
    // Mushroom Cap
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 17, Math.PI, 0);
    ctx.fill();

    // Spots on cap
    ctx.fillStyle = '#FCE4EC';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 12, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy - 12, 3.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Stem / Body
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!isBack) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 4, cy + 4, 2, 3);
      ctx.fillRect(cx + 3, cy + 4, 2, 3);
      // Cheeks
      ctx.fillStyle = '#FF80AB';
      ctx.beginPath();
      ctx.arc(cx - 7, cy + 7, 2, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy + 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Monster 10: Shadowbat (Ghost/Dark)
  drawShadowbat(ctx, cx, cy, isBack) {
    // Bat Wings
    ctx.fillStyle = '#311B92';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 24, cy - 14);
    ctx.lineTo(cx - 18, cy + 6);
    ctx.lineTo(cx - 8, cy + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 24, cy - 14);
    ctx.lineTo(cx + 18, cy + 6);
    ctx.lineTo(cx + 8, cy + 3);
    ctx.fill();

    // Body
    ctx.fillStyle = '#512DA8';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointy Ears
    ctx.fillStyle = '#673AB7';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 9); ctx.lineTo(cx - 8, cy - 18); ctx.lineTo(cx - 1, cy - 10); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 9); ctx.lineTo(cx + 8, cy - 18); ctx.lineTo(cx + 1, cy - 10); ctx.fill();

    if (!isBack) {
      // Glowing Red Eyes
      ctx.fillStyle = '#FF1744';
      ctx.fillRect(cx - 4, cy - 3, 2, 3);
      ctx.fillRect(cx + 3, cy - 3, 2, 3);
      // Fangs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 2, cy + 3, 1, 2);
      ctx.fillRect(cx + 2, cy + 3, 1, 2);
    }
  }

  // Monster 11: Frosthorn (Ice Deer)
  drawFrosthorn(ctx, cx, cy, isBack) {
    // Body
    ctx.fillStyle = '#E0F7FA';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const hy = cy - 12;
    ctx.fillStyle = '#B2EBF2';
    ctx.beginPath();
    ctx.arc(cx, hy, 9, 0, Math.PI * 2);
    ctx.fill();

    // Crystal Antlers
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.moveTo(cx - 6, hy - 6); ctx.lineTo(cx - 14, hy - 22); ctx.lineTo(cx - 10, hy - 16); ctx.lineTo(cx - 5, hy - 8); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, hy - 6); ctx.lineTo(cx + 14, hy - 22); ctx.lineTo(cx + 10, hy - 16); ctx.lineTo(cx + 5, hy - 8); ctx.fill();

    if (!isBack) {
      ctx.fillStyle = '#006064';
      ctx.fillRect(cx - 4, hy - 2, 2, 3);
      ctx.fillRect(cx + 3, hy - 2, 2, 3);
    }
  }

  // Monster 12: Ironhorn (Steel Rhino)
  drawIronhorn(ctx, cx, cy, isBack) {
    // Armored Body
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Plates
    ctx.fillStyle = '#455A64';
    ctx.fillRect(cx - 12, cy - 6, 24, 3);
    ctx.fillRect(cx - 14, cy + 2, 28, 3);

    // Head & Massive Horn
    const hy = cy - 6;
    ctx.fillStyle = '#607D8B';
    ctx.beginPath();
    ctx.arc(isBack ? cx : cx - 12, hy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Steel Horn
    ctx.fillStyle = '#ECEFF1';
    ctx.beginPath();
    ctx.moveTo(cx - 14, hy); ctx.lineTo(cx - 24, hy - 12); ctx.lineTo(cx - 14, hy - 6); ctx.fill();

    if (!isBack) {
      ctx.fillStyle = '#FF5722';
      ctx.fillRect(cx - 15, hy - 2, 2, 2);
    }
  }

  // Monster 13: Void Dragon (Boss Ace)
  drawVoidDragon(ctx, cx, cy, isBack) {
    // Giant Wings
    ctx.fillStyle = '#1A237E';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 28, cy - 24);
    ctx.lineTo(cx - 20, cy);
    ctx.lineTo(cx - 10, cy - 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 28, cy - 24);
    ctx.lineTo(cx + 20, cy);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.fill();

    // Void Aura / Wing Ribs
    ctx.strokeStyle = '#D500F9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 28, cy - 24);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 28, cy - 24);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#12005E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Purple Core
    ctx.fillStyle = '#AA00FF';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Head
    const hy = cy - 14;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, hy, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Horns
    ctx.fillStyle = '#7C4DFF';
    ctx.beginPath();
    ctx.moveTo(cx - 6, hy - 4); ctx.lineTo(cx - 14, hy - 20); ctx.lineTo(cx - 2, hy - 8); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, hy - 4); ctx.lineTo(cx + 14, hy - 20); ctx.lineTo(cx + 2, hy - 8); ctx.fill();

    if (!isBack) {
      // Piercing Red Eyes
      ctx.fillStyle = '#FF1744';
      ctx.fillRect(cx - 5, hy - 2, 3, 2);
      ctx.fillRect(cx + 3, hy - 2, 3, 2);
    }
  }

  // Monster 14: Aexion (Legendary Light Arbiter)
  drawAexion(ctx, cx, cy, isBack) {
    // Holy Halo / Sun Wings
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Prismatic Light Feathers
    ctx.fillStyle = '#FFF59D';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const fx = cx + Math.cos(a) * 22;
      const fy = cy - 10 + Math.sin(a) * 22;
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sacred Body
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond Gem
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 5, cy + 4); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 5, cy + 4); ctx.fill();

    // Noble Head
    const hy = cy - 14;
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath();
    ctx.arc(cx, hy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Radiant Crown
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(cx - 7, hy - 6); ctx.lineTo(cx - 10, hy - 18); ctx.lineTo(cx, hy - 10); ctx.lineTo(cx + 10, hy - 18); ctx.lineTo(cx + 7, hy - 6); ctx.fill();

    if (!isBack) {
      ctx.fillStyle = '#2979FF';
      ctx.fillRect(cx - 4, hy - 2, 2, 3);
      ctx.fillRect(cx + 3, hy - 2, 2, 3);
    }
  }

  drawGenericMonster(ctx, cx, cy, isBack) {
    ctx.fillStyle = '#7E57C2';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    if (!isBack) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 4, cy - 2, 2, 2);
      ctx.fillRect(cx + 3, cy - 2, 2, 2);
    }
  }

  // Overworld Characters (Anthony, Leon, Prof, Grunt, Morgas, Nurse)
  drawOverworldSprite(type, dir = 'down', frame = 0) {
    const key = `char_${type}_${dir}_${frame}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const size = 32;
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;
    const stepOffset = frame === 1 ? -1 : (frame === 2 ? 1 : 0);

    ctx.save();

    switch (type) {
      case 'player': // Anthony (安東尼)
        // Red Cap
        ctx.fillStyle = '#D32F2F';
        ctx.fillRect(cx - 6, cy - 14, 12, 6);
        ctx.fillRect(dir === 'right' ? cx - 2 : (dir === 'left' ? cx - 8 : cx - 6), cy - 9, 14, 2); // Cap visor
        // Face
        ctx.fillStyle = '#FFCCBC';
        ctx.fillRect(cx - 5, cy - 8, 10, 7);
        if (dir !== 'up') {
          ctx.fillStyle = '#212121';
          if (dir === 'left') ctx.fillRect(cx - 4, cy - 6, 2, 2);
          else if (dir === 'right') ctx.fillRect(cx + 2, cy - 6, 2, 2);
          else { ctx.fillRect(cx - 3, cy - 6, 2, 2); ctx.fillRect(cx + 2, cy - 6, 2, 2); }
        }
        // Blue Jacket
        ctx.fillStyle = '#1976D2';
        ctx.fillRect(cx - 6, cy - 1, 12, 8);
        // Backpack
        if (dir === 'up') {
          ctx.fillStyle = '#795548';
          ctx.fillRect(cx - 5, cy - 1, 10, 7);
        }
        // Legs / Pants
        ctx.fillStyle = '#37474F';
        ctx.fillRect(cx - 5, cy + 7, 4, 6 + stepOffset);
        ctx.fillRect(cx + 1, cy + 7, 4, 6 - stepOffset);
        break;

      case 'rival': // Leon (雷昂) - Purple bandana & jacket
        ctx.fillStyle = '#7B1FA2';
        ctx.fillRect(cx - 6, cy - 14, 12, 6);
        ctx.fillStyle = '#FFCCBC';
        ctx.fillRect(cx - 5, cy - 8, 10, 7);
        if (dir !== 'up') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(cx - 3, cy - 6, 2, 2);
          ctx.fillRect(cx + 2, cy - 6, 2, 2);
        }
        ctx.fillStyle = '#4A148C';
        ctx.fillRect(cx - 6, cy - 1, 12, 8);
        ctx.fillStyle = '#212121';
        ctx.fillRect(cx - 5, cy + 7, 4, 6 + stepOffset);
        ctx.fillRect(cx + 1, cy + 7, 4, 6 - stepOffset);
        break;

      case 'prof': // Prof Brown - White lab coat
        ctx.fillStyle = '#8D6E63'; // Brown hair
        ctx.fillRect(cx - 6, cy - 14, 12, 5);
        ctx.fillStyle = '#FFE0B2';
        ctx.fillRect(cx - 5, cy - 9, 10, 7);
        if (dir !== 'up') {
          ctx.fillStyle = '#3E2723';
          ctx.fillRect(cx - 3, cy - 7, 2, 2);
          ctx.fillRect(cx + 2, cy - 7, 2, 2);
        }
        ctx.fillStyle = '#ECEFF1'; // White coat
        ctx.fillRect(cx - 6, cy - 2, 12, 9);
        ctx.fillStyle = '#455A64';
        ctx.fillRect(cx - 5, cy + 7, 4, 6 + stepOffset);
        ctx.fillRect(cx + 1, cy + 7, 4, 6 - stepOffset);
        break;

      case 'nurse': // Nurse Anna - Pink hair & apron
        ctx.fillStyle = '#F48FB1'; // Pink hair
        ctx.fillRect(cx - 6, cy - 14, 12, 6);
        ctx.fillStyle = '#FFEBEE';
        ctx.fillRect(cx - 5, cy - 8, 10, 6);
        if (dir !== 'up') {
          ctx.fillStyle = '#C2185B';
          ctx.fillRect(cx - 3, cy - 6, 2, 2);
          ctx.fillRect(cx + 2, cy - 6, 2, 2);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 6, cy - 2, 12, 10);
        ctx.fillStyle = '#E91E63'; // Red cross
        ctx.fillRect(cx - 1, cy + 1, 3, 4);
        ctx.fillRect(cx - 2, cy + 2, 5, 2);
        break;

      case 'grunt': // Shadow Grunt - Black uniform
        ctx.fillStyle = '#212121';
        ctx.fillRect(cx - 6, cy - 14, 12, 6);
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(cx - 5, cy - 8, 10, 6);
        ctx.fillStyle = '#D50000'; // Red visor
        ctx.fillRect(cx - 5, cy - 6, 10, 2);
        ctx.fillStyle = '#212121';
        ctx.fillRect(cx - 6, cy - 2, 12, 9);
        ctx.fillStyle = '#9C27B0'; // Shadow emblem
        ctx.fillRect(cx - 2, cy + 1, 4, 3);
        ctx.fillStyle = '#1A237E';
        ctx.fillRect(cx - 5, cy + 7, 4, 6);
        ctx.fillRect(cx + 1, cy + 7, 4, 6);
        break;

      case 'boss': // Lord Morgas - Dark cape & glowing aura
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 7, cy - 15, 14, 7);
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(cx - 5, cy - 8, 10, 6);
        ctx.fillStyle = '#FF1744'; // Glowing red eyes
        ctx.fillRect(cx - 4, cy - 6, 2, 2);
        ctx.fillRect(cx + 2, cy - 6, 2, 2);
        ctx.fillStyle = '#4A148C'; // Dark purple cape
        ctx.fillRect(cx - 8, cy - 2, 16, 11);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 5, cy + 9, 4, 5);
        ctx.fillRect(cx + 1, cy + 9, 4, 5);
        break;

      default:
        // Friendly Villager
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(cx - 5, cy - 13, 10, 5);
        ctx.fillStyle = '#FFCCBC';
        ctx.fillRect(cx - 5, cy - 8, 10, 6);
        ctx.fillStyle = '#43A047';
        ctx.fillRect(cx - 5, cy - 2, 10, 8);
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(cx - 4, cy + 6, 3, 6);
        ctx.fillRect(cx + 1, cy + 6, 3, 6);
        break;
    }

    ctx.restore();
    this.cache.set(key, canvas);
    return canvas;
  }

  // Overworld Tile Renderer (16x16 pixel tiles)
  getTile(type) {
    if (this.tileCache.has(type)) return this.tileCache.get(type);

    const size = 16;
    const { canvas, ctx } = this.createCanvas(size, size);

    switch (type) {
      case 'grass':
        ctx.fillStyle = '#68BB46';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#56A838';
        ctx.fillRect(3, 4, 2, 3);
        ctx.fillRect(9, 10, 2, 3);
        ctx.fillRect(12, 2, 2, 2);
        break;

      case 'tall_grass':
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(2, 2, 3, 12);
        ctx.fillRect(7, 4, 3, 11);
        ctx.fillRect(12, 1, 3, 14);
        ctx.fillStyle = '#81C784';
        ctx.fillRect(2, 2, 3, 3);
        ctx.fillRect(7, 4, 3, 3);
        ctx.fillRect(12, 1, 3, 3);
        break;

      case 'path':
        ctx.fillStyle = '#E8D5B5';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#D6C09C';
        ctx.fillRect(2, 6, 3, 2);
        ctx.fillRect(8, 2, 4, 2);
        ctx.fillRect(10, 12, 3, 2);
        break;

      case 'water':
        ctx.fillStyle = '#42A5F5';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#90CAF9';
        ctx.fillRect(2, 4, 6, 2);
        ctx.fillRect(8, 10, 6, 2);
        break;

      case 'tree':
        // Tree foliage
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(1, 1, 14, 14);
        ctx.fillStyle = '#43A047';
        ctx.fillRect(3, 3, 6, 6);
        break;

      case 'house_roof':
        ctx.fillStyle = '#D32F2F';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(0, 12, 16, 4);
        break;

      case 'house_wall':
        ctx.fillStyle = '#FFF8E1';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#FFE082';
        ctx.fillRect(0, 14, 16, 2);
        break;

      case 'house_door':
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#FFD54F';
        ctx.fillRect(11, 8, 2, 2); // Brass knob
        break;

      case 'clinic_sign':
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#E91E63'; // Red Cross
        ctx.fillRect(6, 2, 4, 12);
        ctx.fillRect(2, 6, 12, 4);
        break;

      case 'cave_ground':
        ctx.fillStyle = '#424242';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#303030';
        ctx.fillRect(3, 4, 3, 3);
        ctx.fillRect(10, 8, 4, 3);
        break;

      case 'cave_wall':
        ctx.fillStyle = '#212121';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#616161';
        ctx.fillRect(2, 2, 12, 4);
        break;

      case 'crystal':
        ctx.fillStyle = '#424242';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.moveTo(8, 2); ctx.lineTo(13, 8); ctx.lineTo(8, 14); ctx.lineTo(3, 8); ctx.fill();
        break;

      case 'desert_sand':
        ctx.fillStyle = '#E0A96D';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#C68B59';
        ctx.fillRect(4, 3, 3, 2);
        ctx.fillRect(10, 11, 4, 2);
        break;

      case 'temple_floor':
        ctx.fillStyle = '#263238';
        ctx.fillRect(0, 0, 16, 16);
        ctx.strokeStyle = '#37474F';
        ctx.strokeRect(0, 0, 16, 16);
        break;

      case 'temple_pillar':
        ctx.fillStyle = '#455A64';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#9C27B0';
        ctx.fillRect(4, 4, 8, 8); // Runic core
        break;

      case 'chest':
        ctx.fillStyle = '#FFA000';
        ctx.fillRect(2, 4, 12, 9);
        ctx.fillStyle = '#FFD54F';
        ctx.fillRect(6, 7, 4, 3);
        break;

      default:
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, 16, 16);
        break;
    }

    this.tileCache.set(type, canvas);
    return canvas;
  }
}

window.SpriteManager = SpriteManager;
