import { CREATURES, AREAS, MOVES } from './data.mjs';

export const SAVE_KEY = 'anthony-adventure-save-v1';
export const BACKUP_KEY = SAVE_KEY + '-backup';
export const MAX_SAVE_BYTES = 150000;
const speciesById = Object.fromEntries(CREATURES.map(c => [c.id, c]));
const areasById = Object.fromEntries(AREAS.map(a => [a.id, a]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clone = value => JSON.parse(JSON.stringify(value));
const knownSpecies = id => Object.hasOwn(speciesById, id);
const name = mon => speciesById[mon.species].name;
export const stats = mon => {
  const profile = speciesById[mon.species].profile;
  return { maxHp: Math.round((36 + mon.level * 7) * profile.hp), attack: Math.round((9 + mon.level * 3) * profile.attack), defense: Math.round((5 + mon.level * 1.5) * profile.defense) };
};
export const availableMoves = mon => MOVES.filter(m => mon.level >= m.level);
export const xpNeeded = level => 18 + level * 8;

/** Directed chart: attacks can have multiple strengths; neutral is always 1. */
export function matchup(attacking, defending) {
  const strong = { leaf: ['tide', 'stone'], fire: ['leaf'], tide: ['fire', 'stone'], spark: ['tide'], stone: ['spark', 'fire'] };
  const weak = { leaf: ['fire'], fire: ['tide', 'stone'], tide: ['leaf', 'spark'], spark: ['stone'], stone: ['leaf', 'tide'] };
  if (!Object.hasOwn(strong, attacking) || !Object.hasOwn(strong, defending)) return 1;
  return strong[attacking].includes(defending) ? 1.6 : weak[attacking].includes(defending) ? 0.65 : 1;
}

function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function createMon(s, species, level) {
  const mon = { uid: 'c' + s.nextUid++, species, level, xp: 0, hp: 0 };
  mon.hp = stats(mon).maxHp;
  return mon;
}
export function newGame(starterId = 'bud', seed = 73021) {
  if (!['bud', 'ember', 'drip'].includes(starterId)) throw new Error('請選擇有效的初始夥伴。');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('無效的冒險種子。');
  const s = { version: 1, rng: seed, nextUid: 1, team: [], reserve: [], active: 0,
    inventory: { orbs: 8, potions: 5 }, coins: 80, area: 'town', x: 4, y: 5, steps: 0,
    flags: { forest: false, coast: false, quarry: false, ending: false },
    quests: { herbs: 0, herbsClaimed: false, capturesClaimed: false, gathered: [] },
    seen: [starterId], caught: [starterId], battle: null,
    message: '歡迎來到拾光鎮！先和鎮長聊聊，再到回聲森林找回星燈。', dialogue: '' };
  s.team.push(createMon(s, starterId, 5));
  return s;
}
const addUnique = (list, value) => { if (!list.includes(value)) list.push(value); };
function log(s, text) { s.battle.log = [...s.battle.log, text].slice(-8); s.message = text; }
function alive(s) { return s.team.some(m => m.hp > 0); }
function autoActive(s) { if (s.team[s.active].hp <= 0) s.active = Math.max(0, s.team.findIndex(m => m.hp > 0)); }
function fullHeal(s) { for (const m of [...s.team, ...s.reserve]) m.hp = stats(m).maxHp; }
function gainXp(mon, amount) {
  mon.xp += amount;
  while (mon.level < 30 && mon.xp >= xpNeeded(mon.level)) {
    const oldMax = stats(mon).maxHp;
    mon.xp -= xpNeeded(mon.level); mon.level++; mon.hp += stats(mon).maxHp - oldMax;
  }
  if (mon.level === 30) mon.xp = 0;
  mon.hp = Math.min(mon.hp, stats(mon).maxHp);
}
function victory(s) {
  const b = s.battle;
  b.result = 'won';
  const reward = b.kind === 'wild' ? 16 + b.enemy.level * 2 : b.kind === 'boss' ? 180 : 85;
  s.coins = Math.min(999999, s.coins + reward);
  const xp = b.kind === 'wild' ? 24 + b.enemy.level * 6 : 90 + b.enemy.level * 12;
  const best = Math.max(...s.team.map(m => m.level));
  for (const m of s.team) gainXp(m, Math.round(xp * (m.level < best ? 1.5 : 1)));
  if (b.kind === 'guardian') {
    s.flags[s.area] = true;
    const floor = { forest: 8, coast: 11, quarry: 14 }[s.area];
    for (const m of s.team) { m.level = Math.max(m.level, floor); m.xp = Math.min(m.xp, xpNeeded(m.level) - 1); }
    fullHeal(s); s.inventory.orbs = Math.min(999, s.inventory.orbs + 4); s.inventory.potions = Math.min(999, s.inventory.potions + 3);
    log(s, `星燈亮起了！全隊成長並回復，獲得 ${reward} 星幣、4 星環與 3 藥水。`);
  } else if (b.kind === 'boss') {
    s.flags.ending = true; fullHeal(s);
    log(s, '霧冠龍終於聽見星燈的歌。雲霧散去，島上的歸途重新發亮。安東尼，謝謝你！旅程完結，探索仍可繼續。');
  } else log(s, `獲勝！全隊獲得經驗與 ${reward} 星幣。`);
}
function startBattle(s, kind = 'wild') {
  autoActive(s);
  const area = areasById[s.area];
  let species, level;
  if (kind === 'wild') {
    species = area.creatures[Math.floor(random(s) * area.creatures.length)];
    level = area.level + Math.floor(random(s) * 3);
  } else {
    species = { forest: 'fernowl', coast: 'lanternray', quarry: 'basaltusk', summit: 'cloudrake' }[s.area];
    level = { forest: 7, coast: 10, quarry: 13, summit: 17 }[s.area];
  }
  const enemy = createMon(s, species, level);
  addUnique(s.seen, species);
  s.battle = { enemy, kind, turn: 1, log: [], result: null, intent: 'strike', weakened: false, guarding: false, healsUsed: 0 };
  log(s, kind === 'wild' ? `遇見了 ${name(enemy)}！削弱生命並使用「安撫」可提高捕捉率。` : `${name(enemy)} 守住星燈。當牠蓄力時，用守護抵擋下一次重擊！`);
}
function enemyTurn(s) {
  const b = s.battle;
  if (b.result) return;
  if (b.intent === 'charge') {
    b.intent = 'heavy';
    log(s, `${name(b.enemy)} 正在蓄力！下一回合將釋放重擊，使用「守護」。`);
  } else {
    const mon = s.team[s.active], e = b.enemy;
    const effect = matchup(speciesById[e.species].element, speciesById[mon.species].element);
    const heavy = b.intent === 'heavy';
    const damage = Math.max(1, Math.round((8 + stats(e).attack * 0.43 - stats(mon).defense * 0.28) * effect * (heavy ? 1.9 : 1) * (b.guarding ? 0.2 : 1) * (b.weakened ? 0.88 : 1)));
    mon.hp = Math.max(0, mon.hp - damage);
    log(s, `${name(e)} ${heavy ? '釋放重擊' : '反擊'}，${b.guarding ? '守護抵擋大部分力量，' : ''}${name(mon)} 受到 ${damage} 傷害。`);
    if (!alive(s)) { b.result = 'lost'; log(s, '隊伍需要休息。鎮上的朋友會送你平安回家，夥伴與收藏都會保留。'); }
    else if (mon.hp === 0) { autoActive(s); log(s, `${name(s.team[s.active])} 接棒！`); }
    b.intent = b.kind !== 'wild' && b.turn % 3 === 1 ? 'charge' : 'strike';
  }
  b.guarding = false; b.turn++;
}
export function captureChance(s) {
  if (!s.battle || s.battle.kind !== 'wild' || s.battle.result) return 0;
  const e = s.battle.enemy, lead = s.team[s.active];
  return Math.round(clamp(0.22 + (1 - e.hp / stats(e).maxHp) * 0.62 + (s.battle.weakened ? 0.2 : 0) + (lead.level - e.level) * 0.018, 0.08, 0.95) * 100) / 100;
}

/** Every accepted action produces a detached state. Unknown/invalid actions are no-ops. */
export function act(state, action) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return state;
  const s = clone(state), a = action;
  const battleActions = ['attack', 'capture', 'guard', 'focus', 'potion', 'switch', 'run', 'closeBattle'];
  if (s.battle && !battleActions.includes(a.type)) return state;
  if (s.battle?.result && a.type !== 'closeBattle') return state;
  if (s.battle && !s.battle.result && a.type === 'closeBattle') return state;
  if (!s.battle && ['attack', 'capture', 'guard', 'focus', 'switch', 'run', 'closeBattle'].includes(a.type)) return state;
  s.dialogue = '';
  switch (a.type) {
    case 'travel': {
      if (!Object.hasOwn(areasById, a.area)) return state;
      const area = areasById[a.area];
      if (area.requires && !s.flags[area.requires]) { s.message = '先點亮前一區的星燈，才能安全前進。'; break; }
      s.area = a.area; s.x = 4; s.y = 5; s.message = area.description;
      break;
    }
    case 'move': {
      if (!Number.isInteger(a.dx) || !Number.isInteger(a.dy) || Math.abs(a.dx) + Math.abs(a.dy) !== 1) return state;
      const x = clamp(s.x + a.dx, 0, 8), y = clamp(s.y + a.dy, 0, 6);
      if (s.x === x && s.y === y) return state;
      s.x = x; s.y = y; s.steps = Math.min(999999, s.steps + 1);
      if (s.area !== 'town' && s.steps % 5 === 0 && random(s) < 0.6) startBattle(s);
      break;
    }
    case 'explore': if (s.area === 'town') { s.message = '鎮上很安全。前往森林尋找新夥伴吧！'; } else startBattle(s); break;
    case 'challenge': {
      if (s.area === 'town') return state;
      if (s.flags[s.area] || (s.area === 'summit' && s.flags.ending)) { s.message = '這裡的星燈已經亮起。再去認識新的夥伴吧！'; break; }
      startBattle(s, s.area === 'summit' ? 'boss' : 'guardian'); break;
    }
    case 'attack': {
      if (!Number.isInteger(a.move) || a.move < 0 || a.move > 2) return state;
      const mon = s.team[s.active], b = s.battle;
      if (mon.level < MOVES[a.move].level) { s.message = '等級 7 解鎖星光回復。'; break; }
      if (a.move === 2) {
        if (b.healsUsed >= 2) { s.message = '這場戰鬥的星光已用完，可改用藥水或守護。'; break; }
        b.healsUsed++; const amount = Math.ceil(stats(mon).maxHp * 0.42); mon.hp = Math.min(stats(mon).maxHp, mon.hp + amount);
        log(s, `${name(mon)} 使用星光回復，回復 ${amount} 生命。`);
      } else {
        const effect = a.move === 1 ? matchup(speciesById[mon.species].element, speciesById[b.enemy.species].element) : 1;
        const damage = Math.max(2, Math.round((9 + stats(mon).attack * 0.62 - stats(b.enemy).defense * 0.24) * MOVES[a.move].power * effect));
        b.enemy.hp = Math.max(0, b.enemy.hp - damage);
        log(s, `${name(mon)} 使用${MOVES[a.move].name}，造成 ${damage} 傷害${effect > 1 ? '，效果絕佳！' : effect < 1 ? '，效果較弱。' : '。'}`);
        if (!b.enemy.hp) victory(s);
      }
      enemyTurn(s); break;
    }
    case 'guard': s.battle.guarding = true; log(s, '穩住腳步，準備抵擋下一擊。'); enemyTurn(s); break;
    case 'focus': s.battle.weakened = true; log(s, '放慢呼吸，安撫了對手。捕捉率提高，牠的攻擊也變柔和了。'); enemyTurn(s); break;
    case 'capture': {
      if (s.battle.kind !== 'wild') { s.message = '守衛需要透過戰鬥安定下來；同種類的野生夥伴可在本區尋找。'; break; }
      if (s.team.length + s.reserve.length >= 43) { s.message = '夥伴小屋已滿，這次先和牠道別吧。'; break; }
      if (!s.inventory.orbs) { s.message = '星環用完了。回鎮免費休息會補足 3 個。'; break; }
      const chance = captureChance(s); s.inventory.orbs--;
      if (random(s) < chance) {
        const mon = clone(s.battle.enemy); mon.hp = stats(mon).maxHp;
        (s.team.length < 3 ? s.team : s.reserve).push(mon);
        addUnique(s.caught, mon.species); s.battle.result = 'caught';
        for (const ally of s.team) gainXp(ally, 18 + mon.level * 4);
        log(s, `${name(mon)} 願意同行了！${s.team.length === 3 && s.reserve.includes(mon) ? '已入住夥伴小屋。' : '已加入隊伍。'}`);
      } else { log(s, '星環輕輕打開了。再降低生命或安撫後試試看。'); enemyTurn(s); }
      break;
    }
    case 'potion': {
      if (!s.inventory.potions) { s.message = '沒有藥水了，鎮上的休息站可以免費回復。'; break; }
      const mon = s.team[s.active];
      if (mon.hp === stats(mon).maxHp) { s.message = '目前生命已滿。'; break; }
      s.inventory.potions--; const amount = Math.ceil(stats(mon).maxHp * 0.7); mon.hp = Math.min(stats(mon).maxHp, mon.hp + amount);
      s.message = `${name(mon)} 回復了 ${amount} 生命。`;
      if (s.battle) { log(s, s.message); enemyTurn(s); } break;
    }
    case 'switch': {
      if (!Number.isInteger(a.index) || !s.team[a.index] || !s.team[a.index].hp || a.index === s.active) return state;
      s.active = a.index; log(s, `${name(s.team[s.active])}，交給你了！`); enemyTurn(s); break;
    }
    case 'run': s.battle.result = 'escaped'; log(s, '安全撤退。準備好了隨時可以再挑戰。'); break;
    case 'closeBattle': {
      if (s.battle.result === 'lost') {
        s.area = 'town'; s.x = 4; s.y = 5; fullHeal(s); s.active = 0;
        s.inventory.orbs = Math.max(3, s.inventory.orbs); s.inventory.potions = Math.max(2, s.inventory.potions);
        s.message = '在拾光鎮醒來了。全隊已回復，補給已備妥，再試一次吧！';
      }
      s.battle = null; break;
    }
    case 'heal': {
      if (s.area !== 'town') { s.message = '回到拾光鎮即可免費休息；現在可以使用藥水。'; break; }
      fullHeal(s); s.inventory.orbs = Math.max(3, s.inventory.orbs); s.active = 0;
      s.message = '好好睡了一覺！所有夥伴完全回復，星環至少補足 3 個。'; break;
    }
    case 'buy': {
      if (s.area !== 'town' || !['orbs', 'potions'].includes(a.item)) return state;
      const price = a.item === 'orbs' ? 12 : 18;
      if (s.coins < price) { s.message = '星幣不足。探索、戰鬥或完成委託可以獲得星幣。'; break; }
      if (s.inventory[a.item] === 999) return state;
      s.coins -= price; s.inventory[a.item]++; s.message = `購入${a.item === 'orbs' ? '星環' : '藥水'}，花費 ${price} 星幣。`; break;
    }
    case 'lead': {
      if (!Number.isInteger(a.index) || !s.team[a.index] || !s.team[a.index].hp) return state;
      s.active = a.index; s.message = `${name(s.team[a.index])} 成為領隊。`; break;
    }
    case 'swapReserve': {
      if (!Number.isInteger(a.index) || !s.reserve[a.index] || !Number.isInteger(a.teamIndex) || !s.team[a.teamIndex]) return state;
      if (!s.reserve[a.index].hp && !s.team.some((m, i) => i !== a.teamIndex && m.hp > 0)) return state;
      [s.team[a.teamIndex], s.reserve[a.index]] = [s.reserve[a.index], s.team[a.teamIndex]];
      autoActive(s); s.message = '隊伍調整好了！'; break;
    }
    case 'releaseReserve': {
      if (typeof a.uid !== 'string' || !/^c[1-9]\d{0,8}$/.test(a.uid) || Object.keys(a).some(key => !['type', 'uid'].includes(key))) return state;
      if (s.team.some(mon => mon.uid === a.uid) || s.reserve.filter(mon => mon.uid === a.uid).length !== 1) return state;
      const index = s.reserve.findIndex(mon => mon.uid === a.uid);
      const [released] = s.reserve.splice(index, 1);
      s.message = `${name(released)} 回到自由的原野了。相遇的回憶會留在圖鑑中。`;
      break;
    }
    case 'gather': {
      if (s.area === 'town' || s.area === 'summit') { s.message = '星露草生長在森林、海岸和礦谷。'; break; }
      if (s.quests.gathered.includes(s.area)) { s.message = '這一區的星露草已採好，留一些給森林吧。'; break; }
      s.quests.gathered.push(s.area); s.quests.herbs++;
      s.message = `找到星露草！目前 ${s.quests.herbs}/3 株，帶回鎮上交給巡林員。`; break;
    }
    case 'talk': {
      if (s.area !== 'town' || !['elder', 'ranger', 'collector'].includes(a.npc)) return state;
      if (a.npc === 'elder') s.dialogue = s.flags.ending ? '你帶回的不只是光，還有彼此信任的勇氣。去把圖鑑補完吧，這座島永遠歡迎你。' : '三座星燈熄滅後，霧冠龍迷失在山頂。依序前往森林、海岸、礦谷；學會元素剋制，與夥伴一起把光帶回來。';
      if (a.npc === 'ranger') {
        if (s.quests.herbs === 3 && !s.quests.herbsClaimed) { s.quests.herbsClaimed = true; s.coins = Math.min(999999, s.coins + 100); s.inventory.potions = Math.min(999, s.inventory.potions + 5); s.dialogue = '三株星露草都找到了！謝謝你，這是 100 星幣和 5 瓶藥水。'; }
        else s.dialogue = s.quests.herbsClaimed ? '你採來的星露草讓大家都睡得很好，謝謝！' : `請在森林、海岸、礦谷各採一株星露草。目前 ${s.quests.herbs}/3，之前採到的也算數！`;
      }
      if (a.npc === 'collector') {
        if (s.caught.length >= 5 && !s.quests.capturesClaimed) { s.quests.capturesClaimed = true; s.coins = Math.min(999999, s.coins + 120); s.inventory.orbs = Math.min(999, s.inventory.orbs + 8); s.dialogue = '已經認識五種夥伴了！送你 120 星幣和 8 個星環，繼續探索吧。'; }
        else s.dialogue = s.quests.capturesClaimed ? `圖鑑已有 ${s.caught.length}/12 種夥伴。島上還有很多故事！` : `收集五種不同夥伴，我就送你補給。目前 ${s.caught.length}/5，初始夥伴也算喔。`;
      }
      s.message = s.dialogue; break;
    }
    default: return state;
  }
  return s;
}

function invalid() { throw new Error('存檔格式不正確或版本不支援，原有冒險未被變更。'); }
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid();
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) invalid();
}
function integer(n, min, max) { if (!Number.isInteger(n) || n < min || n > max) invalid(); }
function string(v, max = 500) { if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) invalid(); }
function bool(v) { if (typeof v !== 'boolean') invalid(); }
function enumValue(v, list) { if (!list.includes(v)) invalid(); }
function monValid(m) {
  object(m, ['uid', 'species', 'level', 'xp', 'hp']);
  if (typeof m.uid !== 'string' || !/^c[1-9]\d{0,8}$/.test(m.uid) || !knownSpecies(m.species)) invalid();
  integer(m.level, 1, 30); integer(m.xp, 0, m.level === 30 ? 0 : xpNeeded(m.level) - 1); integer(m.hp, 0, stats(m).maxHp);
}
function speciesList(v) {
  if (!Array.isArray(v) || v.length > CREATURES.length || new Set(v).size !== v.length || v.some(id => !knownSpecies(id))) invalid();
}
export function validateSave(raw) {
  let s;
  try {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).length > MAX_SAVE_BYTES) invalid();
    s = JSON.parse(text);
  } catch { invalid(); }
  object(s, ['version', 'rng', 'nextUid', 'team', 'reserve', 'active', 'inventory', 'coins', 'area', 'x', 'y', 'steps', 'flags', 'quests', 'seen', 'caught', 'battle', 'message', 'dialogue']);
  if (s.version !== 1) invalid();
  integer(s.rng, 0, 4294967295); integer(s.nextUid, 2, 999999999);
  if (!Array.isArray(s.team) || s.team.length < 1 || s.team.length > 3 || !Array.isArray(s.reserve) || s.reserve.length > 40) invalid();
  const all = [...s.team, ...s.reserve]; all.forEach(monValid);
  if (new Set(all.map(m => m.uid)).size !== all.length || all.some(m => +m.uid.slice(1) >= s.nextUid)) invalid();
  integer(s.active, 0, s.team.length - 1); integer(s.coins, 0, 999999); integer(s.x, 0, 8); integer(s.y, 0, 6); integer(s.steps, 0, 999999);
  enumValue(s.area, AREAS.map(a => a.id));
  object(s.inventory, ['orbs', 'potions']); integer(s.inventory.orbs, 0, 999); integer(s.inventory.potions, 0, 999);
  object(s.flags, ['forest', 'coast', 'quarry', 'ending']); Object.values(s.flags).forEach(bool);
  if ((s.flags.coast && !s.flags.forest) || (s.flags.quarry && !s.flags.coast) || (s.flags.ending && !s.flags.quarry)) invalid();
  if (areasById[s.area].requires && !s.flags[areasById[s.area].requires]) invalid();
  object(s.quests, ['herbs', 'herbsClaimed', 'capturesClaimed', 'gathered']); integer(s.quests.herbs, 0, 3); bool(s.quests.herbsClaimed); bool(s.quests.capturesClaimed);
  if (!Array.isArray(s.quests.gathered) || s.quests.gathered.length !== s.quests.herbs || new Set(s.quests.gathered).size !== s.quests.herbs || s.quests.gathered.some(a => !['forest', 'coast', 'quarry'].includes(a))) invalid();
  if (s.quests.herbsClaimed && s.quests.herbs !== 3) invalid();
  speciesList(s.seen); speciesList(s.caught);
  if (!s.caught.length || s.caught.some(id => !s.seen.includes(id)) || all.some(m => !s.caught.includes(m.species)) || (s.quests.capturesClaimed && s.caught.length < 5)) invalid();
  string(s.message); string(s.dialogue);
  if (s.battle !== null) {
    const b = s.battle;
    object(b, ['enemy', 'kind', 'turn', 'log', 'result', 'intent', 'weakened', 'guarding', 'healsUsed']);
    monValid(b.enemy); enumValue(b.kind, ['wild', 'guardian', 'boss']); integer(b.turn, 1, 1000000); enumValue(b.result, [null, 'won', 'caught', 'escaped', 'lost']);
    enumValue(b.intent, ['strike', 'charge', 'heavy']); bool(b.weakened); bool(b.guarding); integer(b.healsUsed, 0, 2);
    if (!Array.isArray(b.log) || b.log.length < 1 || b.log.length > 8) invalid(); b.log.forEach(v => string(v));
    if (s.area === 'town' || !s.seen.includes(b.enemy.species) || +b.enemy.uid.slice(1) >= s.nextUid) invalid();
    if (b.kind === 'boss' && (s.area !== 'summit' || b.enemy.species !== 'cloudrake')) invalid();
    if (b.kind === 'guardian' && !['forest', 'coast', 'quarry'].includes(s.area)) invalid();
    if (b.kind === 'guardian' && b.enemy.species !== { forest: 'fernowl', coast: 'lanternray', quarry: 'basaltusk' }[s.area]) invalid();
    if (b.kind === 'wild' && !areasById[s.area].creatures.includes(b.enemy.species)) invalid();
    if (b.result === 'caught' && (b.kind !== 'wild' || !all.some(m => m.uid === b.enemy.uid))) invalid();
    if (b.result !== 'caught' && all.some(m => m.uid === b.enemy.uid)) invalid();
    if (b.result === 'won' && b.enemy.hp !== 0) invalid();
    if (b.result === 'won' && ((b.kind === 'guardian' && !s.flags[s.area]) || (b.kind === 'boss' && !s.flags.ending))) invalid();
    if ((b.result === null || b.result === 'escaped' || b.result === 'lost' || b.result === 'caught') && b.enemy.hp <= 0) invalid();
    if (b.result === 'lost' && alive(s)) invalid();
    if (b.result !== 'lost' && (!alive(s) || !s.team[s.active].hp)) invalid();
  } else if (!alive(s) || !s.team[s.active].hp) invalid();
  return s;
}
export function serialize(state) { return JSON.stringify(validateSave(state)); }
export function loadSave(storage) {
  let error = null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw != null) { try { return { state: validateSave(raw), error: null, recovered: false }; } catch { error = '主要存檔受損。'; } }
    const backup = storage.getItem(BACKUP_KEY);
    if (backup != null) {
      try { return { state: validateSave(backup), error: error ? '主要存檔受損，已從上一份備份復原。' : '已從備份復原。', recovered: true }; }
      catch { error = '存檔與備份無法讀取，可以匯入先前匯出的存檔或開始新旅程。'; }
    }
    return { state: null, error, recovered: false };
  } catch { return { state: null, error: '瀏覽器無法讀取本機存檔。仍可遊玩，請匯出存檔保存進度。', recovered: false }; }
}
export function saveGame(storage, state) {
  try {
    const text = serialize(state);
    const previous = storage.getItem(SAVE_KEY);
    if (previous != null) {
      try { validateSave(previous); storage.setItem(BACKUP_KEY, previous); }
      catch (e) { if (e?.name === 'QuotaExceededError') { /* Primary save may still fit; preserve existing backup. */ } }
    }
    storage.setItem(SAVE_KEY, text);
    return { ok: true, error: null };
  } catch { return { ok: false, error: '無法自動存檔，可能是儲存空間已滿或本機儲存被停用。請匯出存檔。' }; }
}
