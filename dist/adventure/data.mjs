export const ELEMENTS = Object.freeze({
  leaf: { name: '森', color: '#89d48b', strong: 'tide', weak: 'fire' },
  fire: { name: '焰', color: '#ff9874', strong: 'leaf', weak: 'tide' },
  tide: { name: '潮', color: '#70d4ea', strong: 'fire', weak: 'leaf' },
  spark: { name: '雷', color: '#f4d778', strong: 'tide', weak: 'stone' },
  stone: { name: '岩', color: '#bbaccf', strong: 'spark', weak: 'leaf' },
});

const PROFILES = {
  bud: { role: '均衡旅伴', hp: 1.05, attack: 1, defense: 1 },
  ember: { role: '迅捷攻手', hp: 0.95, attack: 1.12, defense: 0.95 },
  drip: { role: '堅定守護', hp: 1, attack: 0.95, defense: 1.15 },
  mossling: { role: '森林守護', hp: 1.12, attack: 0.95, defense: 1.1 },
  cinderfox: { role: '火花攻手', hp: 0.9, attack: 1.15, defense: 0.95 },
  foamfin: { role: '流潮旅伴', hp: 1.08, attack: 1, defense: 0.95 },
  voltkit: { role: '雷光攻手', hp: 0.9, attack: 1.15, defense: 0.9 },
  pebblit: { role: '石甲守護', hp: 1.15, attack: 0.9, defense: 1.15 },
  fernowl: { role: '蕨羽攻手', hp: 1, attack: 1.08, defense: 1 },
  lanternray: { role: '星光旅伴', hp: 1.05, attack: 1.05, defense: 1 },
  basaltusk: { role: '晶岩守護', hp: 1.12, attack: 0.95, defense: 1.15 },
  cloudrake: { role: '霧潮旅伴', hp: 1.08, attack: 1.05, defense: 1.05 },
};
export const CREATURES = Object.freeze([
  { id: 'bud', name: '芽芽狸', element: 'leaf', color: '#89d48b', description: '把種子藏進尾巴的小旅伴，喜歡追逐晨光。' },
  { id: 'ember', name: '燼耳兔', element: 'fire', color: '#ff9874', description: '耳尖像溫柔的燭火，奔跑時會留下暖暖星點。' },
  { id: 'drip', name: '滴滴獺', element: 'tide', color: '#70d4ea', description: '用透明水泡收藏好夢，最擅長安慰疲倦的朋友。' },
  { id: 'mossling', name: '苔帽仔', element: 'leaf', color: '#a9c869', description: '戴著苔蘚小帽，在古木的根間照顧迷路的種子。' },
  { id: 'cinderfox', name: '燭尾狐', element: 'fire', color: '#eeab72', description: '尾端有三盞小火燈，會為夜行旅人照亮道路。' },
  { id: 'foamfin', name: '泡帆魚', element: 'tide', color: '#8cdbe0', description: '把泡沫當成帆，在岸邊的風裡慢慢游泳。' },
  { id: 'voltkit', name: '跳電鼬', element: 'spark', color: '#efd66f', description: '一緊張就打出小閃電，最喜歡跟人玩捉迷藏。' },
  { id: 'pebblit', name: '石鈴龜', element: 'stone', color: '#b8b2cc', description: '背甲像一串石鈴，每一步都有不同的清脆聲音。' },
  { id: 'fernowl', name: '蕨羽梟', element: 'leaf', color: '#9cc989', description: '以蕨葉為羽的森林守望者，守護第一座星燈。' },
  { id: 'lanternray', name: '星燈魟', element: 'spark', color: '#e9ce84', description: '夜色中漂浮的星光，與潮汐一起呼吸。' },
  { id: 'basaltusk', name: '玄晶貘', element: 'stone', color: '#b39bc6', description: '背上的晶體記得山脈最古老的歌聲。' },
  { id: 'cloudrake', name: '霧冠龍', element: 'tide', color: '#a3cde6', description: '把雲霧織成王冠；牠等待有人重新點亮歸途。' },
].map(creature => ({ ...creature, role: PROFILES[creature.id].role, profile: { hp: PROFILES[creature.id].hp, attack: PROFILES[creature.id].attack, defense: PROFILES[creature.id].defense } })));

export const AREAS = Object.freeze([
  { id: 'town', name: '拾光鎮', description: '修整隊伍、補給星環，再出發吧。', level: 1, creatures: [], requires: null },
  { id: 'forest', name: '回聲森林', description: '蕨葉間傳來微光。找到守望者，點亮森之燈。', level: 4, creatures: ['mossling', 'cinderfox', 'bud', 'fernowl'], requires: null },
  { id: 'coast', name: '泡沫海岸', description: '潮聲與電光交錯；岩系夥伴能抵擋海岸守衛。', level: 7, creatures: ['foamfin', 'voltkit', 'drip', 'pebblit', 'lanternray'], requires: 'forest' },
  { id: 'quarry', name: '星晶礦谷', description: '岩壁保存古老的歌，森系夥伴能喚醒它。', level: 10, creatures: ['pebblit', 'ember', 'mossling', 'basaltusk'], requires: 'coast' },
  { id: 'summit', name: '霧冠山頂', description: '三盞星燈照見雲海。森與雷能撥開最後的潮霧。', level: 13, creatures: ['fernowl', 'lanternray', 'cloudrake', 'cinderfox'], requires: 'quarry' },
]);

export const MOVES = Object.freeze([
  { id: 'bump', name: '勇氣撞擊', description: '穩定的一般攻擊。', level: 1, power: 1 },
  { id: 'pulse', name: '元素脈衝', description: '使用自身元素；剋制傷害更高。', level: 1, power: 1.12 },
  { id: 'bloom', name: '星光回復', description: '回復自身生命；每場可用兩次。', level: 7, power: 0 },
]);
