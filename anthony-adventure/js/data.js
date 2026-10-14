/**
 * Anthony's Adventure (安東尼大冒險)
 * Game Data: Monsters, Moves, Items, Type Chart, Trainers & Map Schemas
 */

const TYPE = {
  NORMAL: '一般',
  FIRE: '火',
  WATER: '水',
  GRASS: '草',
  ELECTRIC: '電',
  ICE: '冰',
  ROCK: '岩石',
  GROUND: '地面',
  GHOST: '幽靈',
  DARK: '惡',
  DRAGON: '龍',
  STEEL: '鋼',
  LIGHT: '聖光'
};

const TYPE_COLORS = {
  [TYPE.NORMAL]: '#A8A878',
  [TYPE.FIRE]: '#F08030',
  [TYPE.WATER]: '#6890F0',
  [TYPE.GRASS]: '#78C850',
  [TYPE.ELECTRIC]: '#F8D030',
  [TYPE.ICE]: '#98D8D8',
  [TYPE.ROCK]: '#B8A038',
  [TYPE.GROUND]: '#E0C068',
  [TYPE.GHOST]: '#705898',
  [TYPE.DARK]: '#705848',
  [TYPE.DRAGON]: '#7038F8',
  [TYPE.STEEL]: '#B8B8D0',
  [TYPE.LIGHT]: '#F85888'
};

// Type Effectiveness Multipliers [attacker][defender]
const TYPE_CHART = {
  [TYPE.NORMAL]: { [TYPE.ROCK]: 0.5, [TYPE.GHOST]: 0, [TYPE.STEEL]: 0.5 },
  [TYPE.FIRE]: { [TYPE.FIRE]: 0.5, [TYPE.WATER]: 0.5, [TYPE.GRASS]: 2.0, [TYPE.ICE]: 2.0, [TYPE.ROCK]: 0.5, [TYPE.DRAGON]: 0.5, [TYPE.STEEL]: 2.0 },
  [TYPE.WATER]: { [TYPE.FIRE]: 2.0, [TYPE.WATER]: 0.5, [TYPE.GRASS]: 0.5, [TYPE.GROUND]: 2.0, [TYPE.ROCK]: 2.0, [TYPE.DRAGON]: 0.5 },
  [TYPE.GRASS]: { [TYPE.FIRE]: 0.5, [TYPE.WATER]: 2.0, [TYPE.GRASS]: 0.5, [TYPE.GROUND]: 2.0, [TYPE.ROCK]: 2.0, [TYPE.DRAGON]: 0.5, [TYPE.STEEL]: 0.5 },
  [TYPE.ELECTRIC]: { [TYPE.WATER]: 2.0, [TYPE.GRASS]: 0.5, [TYPE.ELECTRIC]: 0.5, [TYPE.GROUND]: 0, [TYPE.DRAGON]: 0.5 },
  [TYPE.ICE]: { [TYPE.FIRE]: 0.5, [TYPE.WATER]: 0.5, [TYPE.GRASS]: 2.0, [TYPE.ICE]: 0.5, [TYPE.GROUND]: 2.0, [TYPE.DRAGON]: 2.0, [TYPE.STEEL]: 0.5 },
  [TYPE.ROCK]: { [TYPE.FIRE]: 2.0, [TYPE.ICE]: 2.0, [TYPE.GROUND]: 0.5, [TYPE.STEEL]: 0.5 },
  [TYPE.GROUND]: { [TYPE.FIRE]: 2.0, [TYPE.ELECTRIC]: 2.0, [TYPE.GRASS]: 0.5, [TYPE.ROCK]: 2.0, [TYPE.STEEL]: 2.0 },
  [TYPE.GHOST]: { [TYPE.NORMAL]: 0, [TYPE.GHOST]: 2.0, [TYPE.DARK]: 0.5 },
  [TYPE.DARK]: { [TYPE.GHOST]: 2.0, [TYPE.DARK]: 0.5, [TYPE.LIGHT]: 0.5 },
  [TYPE.DRAGON]: { [TYPE.DRAGON]: 2.0, [TYPE.STEEL]: 0.5 },
  [TYPE.STEEL]: { [TYPE.FIRE]: 0.5, [TYPE.WATER]: 0.5, [TYPE.ELECTRIC]: 0.5, [TYPE.ICE]: 2.0, [TYPE.ROCK]: 2.0, [TYPE.STEEL]: 0.5 },
  [TYPE.LIGHT]: { [TYPE.DARK]: 2.0, [TYPE.GHOST]: 2.0, [TYPE.DRAGON]: 1.5 }
};

function getEffectiveness(attackType, defenseTypes) {
  let mult = 1.0;
  for (const defType of defenseTypes) {
    if (TYPE_CHART[attackType] && TYPE_CHART[attackType][defType] !== undefined) {
      mult *= TYPE_CHART[attackType][defType];
    }
  }
  return mult;
}

// Moves Database
const MOVES = {
  // Normal
  'tackle': { id: 'tackle', name: '撞擊', type: TYPE.NORMAL, power: 40, acc: 100, pp: 35, category: 'physical', desc: '用全身的力氣撞擊對手。' },
  'quick_attack': { id: 'quick_attack', name: '電光一閃', type: TYPE.NORMAL, power: 40, acc: 100, pp: 30, priority: 1, category: 'physical', desc: '以迅雷不及掩耳之勢突擊，必定先制。' },
  'scratch': { id: 'scratch', name: '抓擊', type: TYPE.NORMAL, power: 40, acc: 100, pp: 35, category: 'physical', desc: '用銳利的尖爪撕裂對手。' },
  'tail_whip': { id: 'tail_whip', name: '搖尾巴', type: TYPE.NORMAL, power: 0, acc: 100, pp: 30, category: 'status', effect: { stat: 'def', change: -1, target: 'enemy' }, desc: '可愛地搖晃尾巴，降低對手防禦。' },
  'growl': { id: 'growl', name: '咆哮', type: TYPE.NORMAL, power: 0, acc: 100, pp: 35, category: 'status', effect: { stat: 'atk', change: -1, target: 'enemy' }, desc: '發出威嚇的吼叫，降低對手攻擊。' },
  'take_down': { id: 'take_down', name: '猛撞', type: TYPE.NORMAL, power: 85, acc: 85, pp: 20, category: 'physical', desc: '攜帶全身力量狂暴衝撞。' },

  // Fire
  'ember': { id: 'ember', name: '火花', type: TYPE.FIRE, power: 40, acc: 100, pp: 25, category: 'special', effect: { status: 'burn', chance: 0.15 }, desc: '發射微小火花攻擊，有機率造成灼傷。' },
  'flame_wheel': { id: 'flame_wheel', name: '火焰輪', type: TYPE.FIRE, power: 60, acc: 100, pp: 20, category: 'physical', effect: { status: 'burn', chance: 0.2 }, desc: '全身覆蓋火焰向對手翻滾衝擊。' },
  'fire_blast': { id: 'fire_blast', name: '大字爆炎', type: TYPE.FIRE, power: 100, acc: 85, pp: 5, category: 'special', effect: { status: 'burn', chance: 0.3 }, desc: '發射巨大的大字型烈焰焚燒對手。' },
  'inferno_rush': { id: 'inferno_rush', name: '烈焰魔衝', type: TYPE.FIRE, power: 90, acc: 95, pp: 10, category: 'physical', desc: '燃起滔天魔焰重擊對手。' },

  // Water
  'water_gun': { id: 'water_gun', name: '水槍', type: TYPE.WATER, power: 40, acc: 100, pp: 25, category: 'special', desc: '向對手噴射強烈的水柱。' },
  'water_pulse': { id: 'water_pulse', name: '水之波動', type: TYPE.WATER, power: 60, acc: 100, pp: 20, category: 'special', desc: '用水的震波進行衝擊。' },
  'hydro_pump': { id: 'hydro_pump', name: '水炮', type: TYPE.WATER, power: 100, acc: 85, pp: 5, category: 'special', desc: '噴射巨量高壓激流重創對手。' },
  'tidal_wave': { id: 'tidal_wave', name: '海瀾狂嘯', type: TYPE.WATER, power: 90, acc: 95, pp: 10, category: 'special', desc: '引發翻江倒海的巨浪吞噬戰場。' },

  // Grass
  'razor_leaf': { id: 'razor_leaf', name: '飛葉快刀', type: TYPE.GRASS, power: 55, acc: 95, pp: 25, category: 'physical', desc: '發射如利刃般的飛葉切削對手。' },
  'absorb': { id: 'absorb', name: '吸取', type: TYPE.GRASS, power: 40, acc: 100, pp: 25, category: 'special', drain: 0.5, desc: '吸取對手的養分並回復自身生命。' },
  'energy_ball': { id: 'energy_ball', name: '能量球', type: TYPE.GRASS, power: 85, acc: 100, pp: 10, category: 'special', desc: '凝聚大自然之力化為光球轟擊。' },
  'leaf_storm': { id: 'leaf_storm', name: '翡翠葉風暴', type: TYPE.GRASS, power: 105, acc: 90, pp: 5, category: 'special', desc: '召喚狂暴的綠葉風暴席捲一切。' },

  // Electric
  'thunder_shock': { id: 'thunder_shock', name: '電擊', type: TYPE.ELECTRIC, power: 40, acc: 100, pp: 30, category: 'special', effect: { status: 'paralyze', chance: 0.15 }, desc: '放出微弱電流，有機率麻痺對手。' },
  'thunder_wave': { id: 'thunder_wave', name: '電磁波', type: TYPE.ELECTRIC, power: 0, acc: 90, pp: 20, category: 'status', effect: { status: 'paralyze', chance: 1.0 }, desc: '發射強烈電磁脈衝，必定讓對手麻痺。' },
  'thunderbolt': { id: 'thunderbolt', name: '十萬伏特', type: TYPE.ELECTRIC, power: 90, acc: 100, pp: 15, category: 'special', effect: { status: 'paralyze', chance: 0.2 }, desc: '釋放狂暴的電流貫穿對手。' },

  // Rock / Ground
  'rock_throw': { id: 'rock_throw', name: '落石', type: TYPE.ROCK, power: 50, acc: 90, pp: 20, category: 'physical', desc: '拾起巨石投擲向對手。' },
  'rock_slide': { id: 'rock_slide', name: '岩崩衝撞', type: TYPE.ROCK, power: 80, acc: 90, pp: 10, category: 'physical', desc: '伴隨崩落的巨石猛烈衝撞。' },
  'mud_slap': { id: 'mud_slap', name: '泥巴射擊', type: TYPE.GROUND, power: 45, acc: 95, pp: 20, category: 'special', desc: '朝對手噴射厚泥。' },
  'earthquake': { id: 'earthquake', name: '地裂震擊', type: TYPE.GROUND, power: 95, acc: 100, pp: 10, category: 'physical', desc: '引發大地劇烈震顫造成恐怖傷害。' },

  // Ghost / Dark
  'shadow_ball': { id: 'shadow_ball', name: '暗影球', type: TYPE.GHOST, power: 80, acc: 100, pp: 15, category: 'special', desc: '凝聚幽冥陰影黑球進行投擲。' },
  'bite': { id: 'bite', name: '咬住', type: TYPE.DARK, power: 60, acc: 100, pp: 25, category: 'physical', desc: '用鋒利獠牙狠狠咬住對手。' },
  'crunch': { id: 'crunch', name: '咬碎', type: TYPE.DARK, power: 80, acc: 100, pp: 15, category: 'physical', effect: { stat: 'def', change: -1, chance: 0.2, target: 'enemy' }, desc: '以粉碎般的巨顎撕碎對手防禦。' },
  'dark_pulse': { id: 'dark_pulse', name: '惡之波動', type: TYPE.DARK, power: 85, acc: 100, pp: 15, category: 'special', desc: '從體內釋放充滿惡意的恐怖震波。' },

  // Ice / Steel / Dragon / Light
  'icy_wind': { id: 'icy_wind', name: '冰凍之風', type: TYPE.ICE, power: 55, acc: 95, pp: 15, category: 'special', effect: { stat: 'spd', change: -1, chance: 1.0, target: 'enemy' }, desc: '吹起極寒凍風，減緩對手速度。' },
  'blizzard': { id: 'blizzard', name: '暴風雪', type: TYPE.ICE, power: 110, acc: 75, pp: 5, category: 'special', effect: { status: 'freeze', chance: 0.2 }, desc: '召喚滔天暴風雪冰封對手。' },
  'iron_head': { id: 'iron_head', name: '鐵頭衝擊', type: TYPE.STEEL, power: 80, acc: 100, pp: 15, category: 'physical', desc: '以鋼鐵般堅硬的額頭猛撞。' },
  'dragon_claw': { id: 'dragon_claw', name: '龍之巨爪', type: TYPE.DRAGON, power: 80, acc: 100, pp: 15, category: 'physical', desc: '用凝聚龍之魄力的利爪劃破長空。' },
  'dragon_rage': { id: 'dragon_rage', name: '龍之怒濤', type: TYPE.DRAGON, power: 90, acc: 100, pp: 10, category: 'special', desc: '暴怒的巨龍吐息撕碎敵人。' },
  'void_blast': { id: 'void_blast', name: '終焉破滅光', type: TYPE.DARK, power: 120, acc: 85, pp: 5, category: 'special', desc: '暗夜魔龍的滅世黑光，摧毀一切。' },
  'radiant_strike': { id: 'radiant_strike', name: '創世聖光破', type: TYPE.LIGHT, power: 120, acc: 95, pp: 5, category: 'special', desc: '守護神艾克西翁的至高光輝，淨化黑暗。' }
};

// Monsters Database (#001 - #014)
const MONSTERS = {
  // 1: Fire Starter
  1: {
    id: 1,
    name: '焰尾狐',
    types: [TYPE.FIRE],
    baseStats: { hp: 45, atk: 52, def: 43, spAtk: 62, spDef: 50, spd: 65 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 1, move: 'tail_whip' },
      { level: 5, move: 'ember' },
      { level: 9, move: 'quick_attack' },
      { level: 13, move: 'flame_wheel' }
    ],
    evolveLevel: 14,
    evolveTo: 2,
    catchRate: 45,
    baseExp: 64,
    desc: '體內燃燒著微小的火種，尾巴上的火焰代表牠的精神狀態。'
  },
  // 2: Fire Starter Evolution
  2: {
    id: 2,
    name: '烈焰九尾',
    types: [TYPE.FIRE, TYPE.LIGHT],
    baseStats: { hp: 75, atk: 78, def: 72, spAtk: 105, spDef: 85, spd: 100 },
    learnset: [
      { level: 14, move: 'flame_wheel' },
      { level: 18, move: 'inferno_rush' },
      { level: 23, move: 'fire_blast' },
      { level: 28, move: 'radiant_strike' }
    ],
    catchRate: 20,
    baseExp: 175,
    desc: '焰尾狐進化後的雄偉姿態，九道金焰尾羽能照亮漆黑的夜空。'
  },

  // 3: Grass Starter
  3: {
    id: 3,
    name: '葉鬃狼',
    types: [TYPE.GRASS],
    baseStats: { hp: 50, atk: 65, def: 52, spAtk: 45, spDef: 50, spd: 58 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 1, move: 'growl' },
      { level: 5, move: 'razor_leaf' },
      { level: 9, move: 'bite' },
      { level: 13, move: 'absorb' }
    ],
    evolveLevel: 14,
    evolveTo: 4,
    catchRate: 45,
    baseExp: 64,
    desc: '頸部生長著繁茂的森林草葉，能透過光合作用快速恢復體力。'
  },
  // 4: Grass Starter Evolution
  4: {
    id: 4,
    name: '翡翠影狼',
    types: [TYPE.GRASS, TYPE.DARK],
    baseStats: { hp: 80, atk: 105, def: 75, spAtk: 65, spDef: 75, spd: 95 },
    learnset: [
      { level: 14, move: 'bite' },
      { level: 18, move: 'crunch' },
      { level: 23, move: 'energy_ball' },
      { level: 28, move: 'leaf_storm' }
    ],
    catchRate: 20,
    baseExp: 175,
    desc: '化身綠蔭中的無聲刺客，翡翠般的獠牙連巨木都能輕易切斷。'
  },

  // 5: Water Starter
  5: {
    id: 5,
    name: '晶沫獺',
    types: [TYPE.WATER],
    baseStats: { hp: 55, atk: 48, def: 60, spAtk: 55, spDef: 55, spd: 47 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 1, move: 'growl' },
      { level: 5, move: 'water_gun' },
      { level: 9, move: 'mud_slap' },
      { level: 13, move: 'water_pulse' }
    ],
    evolveLevel: 14,
    evolveTo: 6,
    catchRate: 45,
    baseExp: 64,
    desc: '胸前佩戴著晶瑩剔透的水滴寶石，喜愛在清澈的溪流中嬉戲游水。'
  },
  // 6: Water Starter Evolution
  6: {
    id: 6,
    name: '海瀾龍獺',
    types: [TYPE.WATER, TYPE.DRAGON],
    baseStats: { hp: 90, atk: 85, def: 95, spAtk: 92, spDef: 90, spd: 78 },
    learnset: [
      { level: 14, move: 'water_pulse' },
      { level: 18, move: 'dragon_claw' },
      { level: 23, move: 'hydro_pump' },
      { level: 28, move: 'tidal_wave' }
    ],
    catchRate: 20,
    baseExp: 175,
    desc: '體內覺醒了遠古海龍之血，能在驚濤駭浪中自由遨遊並呼喚狂潮。'
  },

  // 7: Electric Bird
  7: {
    id: 7,
    name: '電羽雀',
    types: [TYPE.ELECTRIC, TYPE.NORMAL],
    baseStats: { hp: 48, atk: 55, def: 42, spAtk: 65, spDef: 45, spd: 90 },
    learnset: [
      { level: 1, move: 'quick_attack' },
      { level: 4, move: 'thunder_shock' },
      { level: 10, move: 'thunder_wave' },
      { level: 16, move: 'thunderbolt' }
    ],
    catchRate: 190,
    baseExp: 75,
    desc: '雙翼摩擦時會產生金黃色的火花，常在雷雨天於樹梢高歌。'
  },

  // 8: Rockadillo
  8: {
    id: 8,
    name: '岩甲穿山獸',
    types: [TYPE.ROCK, TYPE.GROUND],
    baseStats: { hp: 60, atk: 75, def: 95, spAtk: 30, spDef: 55, spd: 38 },
    learnset: [
      { level: 1, move: 'scratch' },
      { level: 5, move: 'mud_slap' },
      { level: 11, move: 'rock_throw' },
      { level: 18, move: 'rock_slide' },
      { level: 24, move: 'earthquake' }
    ],
    catchRate: 160,
    baseExp: 88,
    desc: '背部覆蓋著堅如磐石的天然礦物甲殼，遇險時會縮成圓球滾撞敵手。'
  },

  // 9: Sporemite
  9: {
    id: 9,
    name: '毒刺菇寶',
    types: [TYPE.GRASS, TYPE.NORMAL],
    baseStats: { hp: 65, atk: 40, def: 58, spAtk: 62, spDef: 65, spd: 35 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 4, move: 'absorb' },
      { level: 9, move: 'razor_leaf' },
      { level: 15, move: 'energy_ball' }
    ],
    catchRate: 170,
    baseExp: 78,
    desc: '生長於潮濕的森林深處，傘蓋散發出淡淡的草本微光。'
  },

  // 10: Shadowbat
  10: {
    id: 10,
    name: '幽影蝠',
    types: [TYPE.GHOST, TYPE.DARK],
    baseStats: { hp: 55, atk: 52, def: 48, spAtk: 78, spDef: 58, spd: 85 },
    learnset: [
      { level: 1, move: 'scratch' },
      { level: 7, move: 'bite' },
      { level: 13, move: 'shadow_ball' },
      { level: 20, move: 'dark_pulse' }
    ],
    catchRate: 140,
    baseExp: 92,
    desc: '棲息在陰暗幽深的迴音洞穴，無聲無息地穿梭在陰影隙縫中。'
  },

  // 11: Frosthorn
  11: {
    id: 11,
    name: '霜角白鹿',
    types: [TYPE.ICE],
    baseStats: { hp: 72, atk: 68, def: 65, spAtk: 80, spDef: 75, spd: 74 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 8, move: 'icy_wind' },
      { level: 15, move: 'quick_attack' },
      { level: 22, move: 'blizzard' }
    ],
    catchRate: 90,
    baseExp: 120,
    desc: '雙角由永不消融的玄冰凝結而成，踏過之處會結出美麗的霜花。'
  },

  // 12: Ironhorn
  12: {
    id: 12,
    name: '鋼甲霸犀',
    types: [TYPE.STEEL, TYPE.NORMAL],
    baseStats: { hp: 85, atk: 92, def: 110, spAtk: 40, spDef: 60, spd: 42 },
    learnset: [
      { level: 1, move: 'tackle' },
      { level: 10, move: 'take_down' },
      { level: 17, move: 'iron_head' },
      { level: 25, move: 'earthquake' }
    ],
    catchRate: 75,
    baseExp: 135,
    desc: '常年以鐵礦石為食，渾身被鋼鐵外皮包裹，無懼任何猛烈撞擊。'
  },

  // 13: Void Dragon (Boss Ace)
  13: {
    id: 13,
    name: '暗夜魔龍',
    types: [TYPE.DARK, TYPE.DRAGON],
    baseStats: { hp: 95, atk: 102, def: 85, spAtk: 112, spDef: 85, spd: 92 },
    learnset: [
      { level: 1, move: 'bite' },
      { level: 15, move: 'dragon_claw' },
      { level: 21, move: 'dark_pulse' },
      { level: 26, move: 'dragon_rage' },
      { level: 30, move: 'void_blast' }
    ],
    catchRate: 30,
    baseExp: 220,
    desc: '暗影軍團統領莫爾加斯所喚醒的災厄魔龍，咆哮聲能撕裂長空。'
  },

  // 14: Aexion (Legendary Light Guardian)
  14: {
    id: 14,
    name: '艾克西翁',
    types: [TYPE.LIGHT],
    baseStats: { hp: 110, atk: 100, def: 100, spAtk: 120, spDef: 100, spd: 105 },
    learnset: [
      { level: 1, move: 'quick_attack' },
      { level: 20, move: 'energy_ball' },
      { level: 25, move: 'thunderbolt' },
      { level: 30, move: 'radiant_strike' }
    ],
    catchRate: 15,
    baseExp: 260,
    desc: '守護大地安寧的遠古創世神獸，象徵破曉之光與純粹的正義。'
  }
};

// Items Database
const ITEMS = {
  // Capture Devices
  'capsule': {
    id: 'capsule',
    name: '冒險膠囊',
    category: 'ball',
    catchRateBonus: 1.0,
    price: 100,
    desc: '用於捕捉野生怪獸的標準膠囊容器。'
  },
  'super_capsule': {
    id: 'super_capsule',
    name: '超級膠囊',
    category: 'ball',
    catchRateBonus: 1.5,
    price: 250,
    desc: '經過強化加工的高性能膠囊，捕獲率更高。'
  },
  'hyper_capsule': {
    id: 'hyper_capsule',
    name: '特級大師膠囊',
    category: 'ball',
    catchRateBonus: 2.2,
    price: 600,
    desc: '採用尖端晶石技術製作的頂級膠囊，極難掙脫。'
  },

  // Medicines
  'potion': {
    id: 'potion',
    name: '活力傷藥',
    category: 'heal',
    healHp: 30,
    price: 80,
    desc: '噴霧型草本藥劑，能為一隻怪獸恢復 30 點 HP。'
  },
  'super_potion': {
    id: 'super_potion',
    name: '超級傷藥',
    category: 'heal',
    healHp: 70,
    price: 180,
    desc: '濃縮特效藥水，能為一隻怪獸恢復 70 點 HP。'
  },
  'max_potion': {
    id: 'max_potion',
    name: '全滿靈藥',
    category: 'heal',
    healHp: 999,
    price: 450,
    desc: '頂級珍貴秘藥，能將一隻怪獸的 HP 完全回滿。'
  },
  'revive': {
    id: 'revive',
    name: '復活之核',
    category: 'revive',
    reviveRatio: 0.5,
    price: 350,
    desc: '蘊含生機的星之碎屑，能讓倒下的怪獸以 50% HP 甦醒。'
  },
  'antidote': {
    id: 'antidote',
    name: '萬靈解毒草',
    category: 'cure',
    cureStatus: 'all',
    price: 100,
    desc: '能解除怪獸的所有異常狀態（灼傷、麻痺、冰凍）。'
  }
};

// Trainers Database (Story Battles & Challenges)
const TRAINERS = {
  'rival_1': {
    id: 'rival_1',
    name: '勁敵 雷昂',
    title: '宿命宿敵',
    monsters: [
      { id: 0, level: 5 } // Picked dynamically based on player's choice counter
    ],
    reward: 200,
    dialogBefore: '安東尼！聽說你拿到了最初的夥伴？來和我較量一場吧！',
    dialogAfter: '可惡……果然你有一手！但我不會認輸的，我們頂峰見！'
  },
  'youngster_timmy': {
    id: 'youngster_timmy',
    name: '少年 蒂米',
    title: '短褲小子',
    monsters: [
      { id: 7, level: 6 },
      { id: 8, level: 6 }
    ],
    reward: 150,
    dialogBefore: '你也是訓練家嗎？我的電羽雀可是很有精神的！',
    dialogAfter: '哇！你的夥伴好強大啊！'
  },
  'shadow_grunt_1': {
    id: 'shadow_grunt_1',
    name: '暗影教團 哨兵',
    title: '暗影軍團',
    monsters: [
      { id: 10, level: 9 },
      { id: 8, level: 10 }
    ],
    reward: 320,
    dialogBefore: '此路不通，小鬼！迴音洞穴現在是我們暗影教團的領地！',
    dialogAfter: '怎、怎麼可能敗給一個小鬼……統領大人不會放過你的！'
  },
  'rival_2': {
    id: 'rival_2',
    name: '勁敵 雷昂',
    title: '宿命宿敵',
    monsters: [
      { id: 7, level: 13 },
      { id: 0, level: 14 } // Starter evolution
    ],
    reward: 450,
    dialogBefore: '安東尼！你果然也穿過了洞穴！看我夥伴的全新進化！',
    dialogAfter: '你的羈絆與配合真的無可挑剔……前面就是烈風荒原了，小心暗影教團！'
  },
  'shadow_commander_zack': {
    id: 'shadow_commander_zack',
    name: '幹部 扎克',
    title: '暗影軍團執行官',
    monsters: [
      { id: 10, level: 16 },
      { id: 12, level: 17 }
    ],
    reward: 600,
    dialogBefore: '哼，竟然追到了這裡！莫爾加斯大人的喚醒儀式已然開始，受死吧！',
    dialogAfter: '呃啊……竟然連我的鋼甲霸犀都……你們阻止不了暗夜魔龍的降臨！'
  },
  'veteran_gordon': {
    id: 'veteran_gordon',
    name: '老將 戈登',
    title: '荒原冒險家',
    monsters: [
      { id: 11, level: 19 },
      { id: 8, level: 20 },
      { id: 7, level: 20 }
    ],
    reward: 750,
    dialogBefore: '能走到這片荒原的年輕人不多了，讓我檢驗你的實力吧！',
    dialogAfter: '精彩絕倫！你身上的光芒一定能拯救這座大陸！'
  },
  'boss_morgas': {
    id: 'boss_morgas',
    name: '統領 莫爾加斯',
    title: '暗影教團 總帥 (FINAL BOSS)',
    monsters: [
      { id: 10, level: 24 }, // 幽影蝠
      { id: 12, level: 25 }, // 鋼甲霸犀
      { id: 13, level: 28 }  // 王牌：暗夜魔龍
    ],
    reward: 2000,
    dialogBefore: '愚蠢的凡人！世界需要由純粹的暗影秩序來重鑄！感受暗夜魔龍的滅世咆哮吧！',
    dialogAfter: '不可能……！我的暗夜魔龍……竟然被你和你的夥伴打破了暗影水晶？！'
  }
};

window.GAME_DATA = {
  TYPE,
  TYPE_COLORS,
  TYPE_CHART,
  getEffectiveness,
  MOVES,
  MONSTERS,
  ITEMS,
  TRAINERS
};
