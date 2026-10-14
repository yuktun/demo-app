import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATURES, AREAS, MOVES } from '../dist/adventure/data.mjs';
import { newGame, act, stats, matchup, captureChance, availableMoves, xpNeeded, validateSave, serialize, saveGame, loadSave, SAVE_KEY, BACKUP_KEY, MAX_SAVE_BYTES } from '../dist/adventure/core.mjs';

const element = mon => CREATURES.find(c => c.id === mon.species).element;
const copy = s => JSON.parse(JSON.stringify(s));
const storage = () => { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) }; };
const go = (s, area) => act(s, { type: 'travel', area });
const close = s => act(s, { type: 'closeBattle' });
function battleAction(s) {
  const mon = s.team[s.active], b = s.battle;
  if (b.intent === 'heavy') return { type: 'guard' };
  if (mon.hp < stats(mon).maxHp * 0.55 && mon.level >= 7 && b.healsUsed < 2) return { type: 'attack', move: 2 };
  if (mon.hp < stats(mon).maxHp * 0.4 && s.inventory.potions) return { type: 'potion' };
  return { type: 'attack', move: matchup(element(mon), element(b.enemy)) >= 1 ? 1 : 0 };
}
function win(s) {
  let turns = 0;
  while (!s.battle.result && turns++ < 100) { s = act(s, battleAction(s)); validateSave(s); }
  assert.equal(s.battle.result, 'won', `lost to ${s.battle.enemy.species}: ${s.battle.log.join(' / ')}`);
  return s;
}
function catchSpecies(s, id) {
  // Searching is intentionally free: a player can leave any unwanted encounter.
  for (let tries = 0; tries < 120; tries++) {
    s = act(s, { type: 'explore' });
    if (s.battle.enemy.species !== id) { s = close(act(s, { type: 'run' })); continue; }
    s = act(s, { type: 'focus' });
    for (let turn = 0; !s.battle.result && turn < 40; turn++) {
      const mon = s.team[s.active], e = s.battle.enemy;
      if (mon.hp < stats(mon).maxHp * 0.4 && s.inventory.potions) s = act(s, { type: 'potion' });
      else if (e.hp > stats(e).maxHp * 0.55 && e.hp > 35) s = act(s, { type: 'attack', move: 0 });
      else s = act(s, { type: 'capture' });
      validateSave(s);
    }
    if (s.battle.result === 'caught') return close(s);
    if (s.battle.result === 'lost') s = close(s);
    else if (s.battle.result) s = close(s);
    else s = close(act(s, { type: 'run' }));
    s = act(go(s, 'town'), { type: 'heal' });
    s = go(s, AREAS.find(a => a.creatures.includes(id) && (!a.requires || s.flags[a.requires])).id);
  }
  assert.fail(`could not catch ${id}`);
}
function leadSpecies(s, id) {
  let index = s.team.findIndex(m => m.species === id);
  if (index < 0) {
    const reserveIndex = s.reserve.findIndex(m => m.species === id);
    assert.ok(reserveIndex >= 0);
    s = act(s, { type: 'swapReserve', index: reserveIndex, teamIndex: 1 }); index = 1;
  }
  return act(s, { type: 'lead', index });
}
function campaign(starter, seed) {
  let s = newGame(starter, seed), battles = 0;
  for (const [area, counter] of [['forest', 'cinderfox'], ['coast', 'pebblit'], ['quarry', 'mossling']]) {
    s = go(s, area); s = act(s, { type: 'gather' });
    if (!s.caught.includes(counter)) s = catchSpecies(s, counter);
    s = act(go(s, 'town'), { type: 'heal' }); s = go(s, area); s = leadSpecies(s, counter);
    s = act(s, { type: 'challenge' }); s = close(win(s)); battles++;
    assert.ok(s.flags[area]);
  }
  s = go(s, 'town'); s = act(s, { type: 'talk', npc: 'ranger' });
  s = act(s, { type: 'heal' }); s = go(s, 'summit'); s = leadSpecies(s, 'mossling');
  s = close(win(act(s, { type: 'challenge' }))); battles++;
  assert.ok(s.flags.ending); assert.equal(battles, 4);
  return s;
}

test('original content has twelve unique creatures and five coherent areas', () => {
  assert.equal(CREATURES.length, 12); assert.equal(new Set(CREATURES.map(c => c.id)).size, 12);
  assert.deepEqual(CREATURES.slice(0, 3).map(c => c.id), ['bud', 'ember', 'drip']);
  assert.equal(AREAS.length, 5); assert.equal(MOVES.length, 3);
  for (const a of AREAS) for (const id of a.creatures) assert.ok(CREATURES.some(c => c.id === id));
});
test('new game validates every starter and seed, and actions are immutable/deterministic', () => {
  for (const starter of ['bud', 'ember', 'drip']) {
    const s = newGame(starter, 42), frozen = serialize(s);
    assert.deepEqual(validateSave(frozen), s);
    const a = act(go(s, 'forest'), { type: 'explore' });
    const b = act(go(s, 'forest'), { type: 'explore' });
    assert.deepEqual(a, b); assert.equal(serialize(s), frozen);
  }
  assert.throws(() => newGame('pikachu')); assert.throws(() => newGame('bud', NaN));
});
test('element system has meaningful strengths, weaknesses and neutral attacks', () => {
  assert.equal(matchup('leaf', 'tide'), 1.6); assert.equal(matchup('spark', 'tide'), 1.6);
  assert.equal(matchup('tide', 'leaf'), 0.65); assert.equal(matchup('spark', 'stone'), 0.65);
  assert.equal(matchup('fire', 'spark'), 1); assert.equal(matchup('__proto__', 'leaf'), 1);
});
test('species roles change battle stats while preserving the shared interface', () => {
  const striker = stats({ species: 'cinderfox', level: 10 });
  const tank = stats({ species: 'pebblit', level: 10 });
  assert.ok(striker.attack > tank.attack); assert.ok(tank.maxHp > striker.maxHp); assert.ok(tank.defense > striker.defense);
  assert.ok(CREATURES.every(c => c.role && c.profile));
});
test('progression gates cannot be bypassed through travel', () => {
  let s = newGame(); for (const area of ['coast', 'quarry', 'summit']) { s = go(s, area); assert.equal(s.area, 'town'); }
  assert.equal(go(s, '__proto__'), s); assert.equal(go(s, 'forest').area, 'forest');
});
test('invalid actions do not advance turns or mutate resources', () => {
  let s = newGame();
  for (const action of [null, {}, { type: 'unknown' }, { type: 'move', dx: 8, dy: 0 }, { type: 'move', dx: 0.5, dy: 0.5 }, { type: 'attack', move: 0 }, { type: 'lead', index: -1 }]) assert.equal(act(s, action), s);
  s = act(go(s, 'forest'), { type: 'explore' });
  for (const action of [{ type: 'travel', area: 'town' }, { type: 'closeBattle' }, { type: 'attack', move: 8 }, { type: 'switch', index: 8 }]) assert.equal(act(s, action), s);
  assert.equal(act(s, { type: 'attack', move: 2 }).battle.turn, s.battle.turn);
});
test('movement stays within nine by seven grid and creates deterministic encounters', () => {
  let s = newGame(); for (let n = 0; n < 20; n++) s = act(s, { type: 'move', dx: -1, dy: 0 }); assert.equal(s.x, 0); assert.equal(s.steps, 4);
  for (let n = 0; n < 20; n++) s = act(s, { type: 'move', dx: 0, dy: -1 }); assert.equal(s.y, 0);
  s = go(s, 'forest'); let found = false;
  for (let i = 0; i < 100; i++) { s = act(s, { type: 'move', dx: i % 2 ? 1 : -1, dy: 0 }); if (s.battle) { found = true; break; } }
  assert.ok(found);
});
test('weaker enemies and calming both improve capture chance, never guarantee it', () => {
  let s = act(go(newGame(), 'forest'), { type: 'explore' });
  const full = captureChance(s); const weak = copy(s); weak.battle.enemy.hp = 1;
  assert.ok(captureChance(weak) > full);
  const calm = act(s, { type: 'focus' }); assert.ok(captureChance(calm) > full); assert.ok(captureChance(calm) < 1);
  const higher = copy(weak); higher.battle.enemy.level += 8; assert.ok(captureChance(higher) < captureChance(weak));
  assert.equal(captureChance(newGame()), 0);
});
test('successful capture consumes an orb, retains species, and persists exact battle', () => {
  let s = catchSpecies(go(newGame('bud', 42), 'forest'), 'cinderfox');
  assert.ok(s.caught.includes('cinderfox')); assert.equal(s.team.length, 2); assert.ok(s.inventory.orbs < 8);
  assert.deepEqual(validateSave(serialize(s)), s);
});
test('guard reduces a telegraphed heavy attack and boss cannot be captured', () => {
  let s = act(go(newGame('ember'), 'forest'), { type: 'challenge' });
  s = act(s, { type: 'attack', move: 0 }); assert.equal(s.battle.intent, 'charge');
  s = act(s, { type: 'attack', move: 0 }); assert.equal(s.battle.intent, 'heavy');
  const before = s.team[0].hp;
  const guard = act(s, { type: 'guard' });
  const noGuard = act(s, { type: 'focus' });
  assert.ok(before - guard.team[0].hp < before - noGuard.team[0].hp);
  const capture = act(s, { type: 'capture' }); assert.equal(capture.inventory.orbs, s.inventory.orbs); assert.equal(capture.battle.turn, s.battle.turn);
});
test('defeat returns all creatures safely to town with emergency supplies', () => {
  let s = act(go(newGame(), 'forest'), { type: 'explore' });
  s.team[0].hp = 1; s.inventory = { orbs: 0, potions: 0 };
  s = act(s, { type: 'focus' }); assert.equal(s.battle.result, 'lost'); validateSave(s);
  const restored = close(s); assert.equal(restored.area, 'town'); assert.equal(restored.battle, null);
  assert.equal(restored.team[0].hp, stats(restored.team[0]).maxHp); assert.ok(restored.inventory.orbs >= 3); assert.ok(restored.inventory.potions >= 2);
  assert.deepEqual(restored.caught, s.caught); assert.deepEqual(restored.flags, s.flags);
});
test('free healing removes economic softlocks; shop charges once and cannot overdraw', () => {
  let s = newGame(); s.coins = 0; s.inventory = { orbs: 0, potions: 0 }; s.team[0].hp = 1;
  s = act(s, { type: 'heal' }); assert.equal(s.inventory.orbs, 3); assert.equal(s.coins, 0); assert.equal(s.team[0].hp, stats(s.team[0]).maxHp);
  assert.equal(act(s, { type: 'buy', item: 'orbs' }).inventory.orbs, 3);
  s.coins = 30; s = act(s, { type: 'buy', item: 'orbs' }); assert.equal(s.coins, 18); assert.equal(s.inventory.orbs, 4);
  s = act(s, { type: 'buy', item: 'potions' }); assert.equal(s.coins, 0); assert.equal(s.inventory.potions, 1);
});
test('experience unlocks moves and guardian rewards prevent grind', () => {
  let s = act(go(newGame('ember'), 'forest'), { type: 'challenge' });
  assert.equal(availableMoves(s.team[0]).length, 2);
  s = win(s); assert.ok(s.team[0].level >= 8); assert.equal(availableMoves(s.team[0]).length, 3); assert.equal(s.team[0].hp, stats(s.team[0]).maxHp);
  assert.ok(s.inventory.potions >= 8); assert.ok(s.team[0].xp < xpNeeded(s.team[0].level));
});
test('all starters complete the four bosses with counter captures and no XP grinding', () => {
  for (const starter of ['bud', 'ember', 'drip']) for (const seed of [1, 42, 73021]) {
    const s = campaign(starter, seed); assert.ok(s.flags.ending); assert.ok(s.quests.herbsClaimed); validateSave(s);
    const explore = act(s, { type: 'explore' }); assert.equal(explore.battle.kind, 'wild');
  }
});
test('quest objectives count before accepting, and payouts can only be claimed once', () => {
  let s = campaign('ember', 42); s = go(s, 'town');
  const coins = s.coins, potions = s.inventory.potions;
  s = act(s, { type: 'talk', npc: 'ranger' }); assert.equal(s.coins, coins); assert.equal(s.inventory.potions, potions);
  // Valid pre-existing collection recognizes the objective at the first conversation.
  s.caught = CREATURES.slice(0, 5).map(c => c.id); s.seen = [...new Set([...s.seen, ...s.caught])];
  s = act(s, { type: 'talk', npc: 'collector' }); assert.ok(s.quests.capturesClaimed); assert.equal(s.coins, coins + 120);
  const orbs = s.inventory.orbs; s = act(s, { type: 'talk', npc: 'collector' }); assert.equal(s.coins, coins + 120); assert.equal(s.inventory.orbs, orbs);
});
test('team leader and reserve swapping preserve individual stats', () => {
  let s = newGame(); const spare = { uid: 'c2', species: 'drip', level: 5, xp: 0, hp: 71 };
  s.reserve.push(spare); s.nextUid = 3; s.caught.push('drip'); s.seen.push('drip'); validateSave(s);
  s = act(s, { type: 'swapReserve', index: 0, teamIndex: 0 }); assert.deepEqual(s.team[0], spare); assert.equal(s.reserve[0].species, 'bud'); validateSave(s);
});
test('fainting switches to a living ally and locked/full-heal actions cost no turn', () => {
  let s = newGame(); s.team.push({ uid: 'c2', species: 'drip', level: 5, xp: 0, hp: 71 }); s.nextUid = 3; s.seen.push('drip'); s.caught.push('drip');
  s = act(go(s, 'forest'), { type: 'explore' });
  const turn = s.battle.turn, potions = s.inventory.potions;
  s = act(s, { type: 'potion' }); assert.equal(s.battle.turn, turn); assert.equal(s.inventory.potions, potions);
  s.team[0].hp = 1; s = act(s, { type: 'focus' }); assert.equal(s.active, 1); assert.equal(s.team[0].hp, 0); assert.equal(s.battle.result, null); validateSave(s);
});
test('healing move is capped at twice per battle and zero orbs do not waste a turn', () => {
  let s = newGame(); s.team[0].level = 10; s.team[0].hp = stats(s.team[0]).maxHp;
  s = act(go(s, 'forest'), { type: 'explore' });
  s = act(s, { type: 'attack', move: 2 }); s = act(s, { type: 'attack', move: 2 });
  assert.equal(s.battle.healsUsed, 2); const turn = s.battle.turn;
  s = act(s, { type: 'attack', move: 2 }); assert.equal(s.battle.turn, turn);
  s.inventory.orbs = 0; s = act(s, { type: 'capture' }); assert.equal(s.battle.turn, turn);
});
test('full collection capacity rejects capture without spending resources', () => {
  let s = newGame();
  for (let i = 2; i <= 43; i++) {
    const mon = { ...s.team[0], uid: 'c' + i };
    (i <= 3 ? s.team : s.reserve).push(mon);
  }
  s.nextUid = 44; s = act(go(s, 'forest'), { type: 'explore' }); validateSave(s);
  const orbs = s.inventory.orbs, turn = s.battle.turn;
  s = act(s, { type: 'capture' }); assert.equal(s.inventory.orbs, orbs); assert.equal(s.battle.turn, turn); assert.equal(s.reserve.length, 40);
  s = close(act(s, { type: 'run' }));
  s = act(s, { type: 'releaseReserve', uid: 'c4' });
  assert.equal(s.reserve.length, 39); validateSave(s);
  s = catchSpecies(s, 'mossling');
  assert.ok(s.caught.includes('mossling')); assert.equal(s.reserve.length, 40); assert.equal(s.team.length, 3); validateSave(s);
});
test('reserve release is immutable, targets exact UID, and preserves collection history', () => {
  const s = newGame();
  s.reserve.push({ uid: 'c2', species: 'drip', level: 5, xp: 0, hp: stats({ species: 'drip', level: 5 }).maxHp });
  s.reserve.push({ uid: 'c3', species: 'bud', level: 5, xp: 0, hp: stats(s.team[0]).maxHp });
  s.nextUid = 4; s.caught.push('drip'); s.seen.push('drip');
  const original = serialize(s);
  const released = act(s, { type: 'releaseReserve', uid: 'c2' });
  assert.equal(serialize(s), original); assert.deepEqual(released.reserve.map(m => m.uid), ['c3']);
  assert.deepEqual(released.team, s.team); assert.deepEqual(released.caught, s.caught); assert.deepEqual(released.seen, s.seen);
  assert.equal(released.active, s.active); assert.match(released.message, /滴滴獺.*圖鑑/); validateSave(released);
  assert.deepEqual(validateSave(serialize(released)), released);
  assert.equal(act(released, { type: 'releaseReserve', uid: 'c2' }), released);
});
test('reserve release cannot remove the last usable ally or any party member', () => {
  const solo = newGame(); assert.equal(act(solo, { type: 'releaseReserve', uid: 'c1' }), solo);
  const party = newGame();
  party.team.push({ ...party.team[0], uid: 'c2', hp: 0 }); party.nextUid = 3; validateSave(party);
  for (const uid of ['c1', 'c2']) assert.equal(act(party, { type: 'releaseReserve', uid }), party);
});
test('reserve release rejects malformed, ambiguous and index-based targets', () => {
  const s = newGame(); s.reserve.push({ ...s.team[0], uid: 'c2' }); s.nextUid = 3;
  for (const action of [
    { type: 'releaseReserve' }, { type: 'releaseReserve', index: 0 },
    ...[0, 2, -1, NaN, null, {}, ['c2'], 'c02', ' c2', 'c2 ', '__proto__', 'c999'].map(uid => ({ type: 'releaseReserve', uid })),
    { type: 'releaseReserve', uid: 'c2', index: 0 }, { type: 'releaseReserve', uid: 'c2', teamIndex: 0 },
  ]) assert.equal(act(s, action), s);
  const duplicateReserve = copy(s); duplicateReserve.reserve.push(copy(duplicateReserve.reserve[0]));
  assert.equal(act(duplicateReserve, { type: 'releaseReserve', uid: 'c2' }), duplicateReserve);
  const duplicateParty = copy(s); duplicateParty.reserve[0].uid = 'c1';
  assert.equal(act(duplicateParty, { type: 'releaseReserve', uid: 'c1' }), duplicateParty);
});
test('reserve release remains blocked during battle and its result until closed', () => {
  let s = newGame(); s.reserve.push({ ...s.team[0], uid: 'c2' }); s.nextUid = 3;
  s = act(go(s, 'forest'), { type: 'explore' });
  assert.equal(act(s, { type: 'releaseReserve', uid: 'c2' }), s);
  s = act(s, { type: 'run' });
  assert.equal(act(s, { type: 'releaseReserve', uid: 'c2' }), s);
  s = close(s); s = act(s, { type: 'releaseReserve', uid: 'c2' });
  assert.equal(s.reserve.length, 0); validateSave(s);
});
test('guardian win saves require corresponding progression and escaped saves require a living lead', () => {
  let s = win(act(go(newGame('ember'), 'forest'), { type: 'challenge' }));
  s.flags.forest = false; assert.throws(() => validateSave(s));
  s = act(act(go(newGame(), 'forest'), { type: 'explore' }), { type: 'run' });
  s.team[0].hp = 0; assert.throws(() => validateSave(s));
});
test('save restores exact RNG, pending enemy intent, active team and next action', () => {
  let s = act(go(newGame('ember', 123), 'forest'), { type: 'challenge' });
  s = act(s, { type: 'attack', move: 0 });
  const restored = validateSave(serialize(s)); assert.deepEqual(restored, s);
  assert.deepEqual(act(restored, { type: 'guard' }), act(s, { type: 'guard' }));
});
test('malformed, oversized, prototype, unsupported, and inconsistent saves are rejected', () => {
  for (const raw of ['', '{', 'null', '[]', '{}', 'x'.repeat(MAX_SAVE_BYTES + 1)]) assert.throws(() => validateSave(raw));
  const mutations = [
    s => { s.version = 2; }, s => { s.rng = -1; }, s => { s.nextUid = 1; }, s => { s.active = 7; }, s => { s.area = '__proto__'; },
    s => { s.x = 9; }, s => { s.y = -1; }, s => { s.steps = 0.5; }, s => { s.inventory.orbs = -1; }, s => { s.coins = 1e30; },
    s => { s.team[0].hp = 9999; }, s => { s.team[0].species = 'missing'; }, s => { s.team[0].level = 31; }, s => { s.team[0].xp = 9999; },
    s => { s.flags.ending = true; }, s => { s.flags.forest = 1; }, s => { s.quests.herbs = 2; }, s => { s.quests.herbsClaimed = true; },
    s => { s.seen = []; }, s => { s.caught.push('bud'); }, s => { s.unknown = 1; }, s => { s.message = 42; }, s => { s.team = []; },
    s => { s.reserve = Array(41).fill(s.team[0]); }, s => { s.team.push(copy(s.team[0])); }, s => { s.team[0].hp = 0; },
  ];
  for (const mutate of mutations) { const s = newGame(); mutate(s); assert.throws(() => validateSave(s)); }
  const proto = serialize(newGame()).replace('"version":1', '"__proto__":{"polluted":true},"version":1');
  assert.throws(() => validateSave(proto)); assert.equal({}.polluted, undefined);
});
test('malformed battle fields and impossible outcomes are rejected', () => {
  const original = act(go(newGame(), 'forest'), { type: 'explore' });
  const mutations = [s => { s.battle.intent = 'evil'; }, s => { s.battle.turn = -1; }, s => { s.battle.log = Array(9).fill('x'); }, s => { s.battle.healsUsed = 3; }, s => { s.battle.result = 'won'; }, s => { s.battle.result = 'lost'; }, s => { s.battle.result = 'caught'; }, s => { s.battle.enemy.hp = 0; }, s => { s.battle.kind = 'boss'; }, s => { s.battle.enemy.uid = s.team[0].uid; }];
  for (const mutate of mutations) { const s = copy(original); mutate(s); assert.throws(() => validateSave(s)); }
});
test('backup rotates only valid primary and recovers corruption', () => {
  const store = storage(); const a = newGame(); const b = go(a, 'forest');
  assert.deepEqual(loadSave(store), { state: null, error: null, recovered: false });
  assert.ok(saveGame(store, a).ok); assert.ok(saveGame(store, b).ok); assert.deepEqual(validateSave(store.getItem(BACKUP_KEY)), a);
  store.setItem(SAVE_KEY, '{broken');
  const recovered = loadSave(store); assert.ok(recovered.recovered); assert.deepEqual(recovered.state, a); assert.match(recovered.error, /復原/);
  assert.ok(saveGame(store, b).ok); assert.deepEqual(validateSave(store.getItem(BACKUP_KEY)), a);
  store.setItem(SAVE_KEY, '{}'); store.setItem(BACKUP_KEY, '{}'); assert.equal(loadSave(store).state, null); assert.ok(loadSave(store).error);
});
test('disabled storage and quota errors never crash or overwrite prior progress', () => {
  const disabled = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(saveGame(disabled, newGame()).ok, false); assert.equal(loadSave(disabled).state, null);
  const store = storage(); saveGame(store, newGame()); const old = store.getItem(SAVE_KEY);
  const full = { getItem: store.getItem, setItem() { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
  assert.equal(saveGame(full, go(newGame(), 'forest')).ok, false); assert.equal(store.getItem(SAVE_KEY), old);
  assert.equal(saveGame(store, { version: 99 }).ok, false); assert.equal(store.getItem(SAVE_KEY), old);
});
