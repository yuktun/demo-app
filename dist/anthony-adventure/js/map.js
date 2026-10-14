/**
 * Anthony's Adventure (安東尼大冒險)
 * Overworld Exploration & Map Engine
 */

class MapEngine {
  constructor(game) {
    this.game = game;
    this.currentMapId = 'map_maple';
    this.maps = this.buildMaps();
    this.stepCounter = 0;
  }

  getCurrentMap() {
    return this.maps[this.currentMapId];
  }

  buildMaps() {
    return {
      // 1. Maple Town (楓葉鎮)
      'map_maple': {
        id: 'map_maple',
        name: '楓葉鎮',
        bgm: 'town',
        width: 16,
        height: 14,
        // Tiles: . = grass, # = tree, = = path, H = house_roof, W = house_wall, D = house_door, C = clinic_sign
        layout: [
          '################',
          '###...====...###',
          '##....====....##',
          '#.HHHH.==.HHHH.#',
          '#.WWWW.==.WWWW.#',
          '#.WDWW.==.WCDW.#',
          '#......==......#',
          '#......==......#',
          '#.HHHH.==......#',
          '#.WWWW.==......#',
          '#.WDWW.==......#',
          '##....====....##',
          '###...====...###',
          '################'
        ],
        warps: [
          { x: 6, y: 1, targetMap: 'map_route1', targetX: 7, targetY: 18 },
          { x: 7, y: 1, targetMap: 'map_route1', targetX: 8, targetY: 18 }
        ],
        npcs: [
          {
            id: 'prof_brown',
            name: '布朗博士',
            type: 'prof',
            x: 4,
            y: 6,
            dir: 'down',
            dialog: [
              '歡迎來到怪獸的世界，安東尼！',
              '在這片大陸上，怪獸與我們共同生活、互相信賴。',
              '為了讓你踏上旅程，挑選一隻你最喜歡的最初夥伴吧！'
            ],
            isStarterGiver: true
          },
          {
            id: 'mom',
            name: '媽媽',
            type: 'npc',
            x: 2,
            y: 8,
            dir: 'right',
            dialog: [
              '安東尼，你長大了，終於要開始自己的大冒險了！',
              '累了隨時可以去精靈診所休息，媽媽永遠支持你！'
            ]
          },
          {
            id: 'nurse_anna',
            name: '診所 護士',
            type: 'nurse',
            x: 11,
            y: 6,
            dir: 'down',
            isHealer: true,
            dialog: [
              '你好！這裡是楓葉鎮精靈診所。',
              '讓我為你的怪獸夥伴們回復活力吧！',
              '怪獸們已經完全恢復活力了！祝你冒險順利！'
            ]
          }
        ],
        chests: [
          { id: 'chest_maple_1', x: 13, y: 8, item: 'potion', count: 2, collected: false }
        ],
        encounters: [] // Peaceful town
      },

      // 2. Route 1 (綠蔭小徑)
      'map_route1': {
        id: 'map_route1',
        name: '綠蔭小徑 (1號道路)',
        bgm: 'route',
        width: 16,
        height: 20,
        // T = tall_grass
        layout: [
          '###...====...###',
          '##....====....##',
          '#.TTT.====.TTT.#',
          '#.TTT.====.TTT.#',
          '#.....====.....#',
          '#..TT.====.TT..#',
          '#..TT.====.TT..#',
          '#.....====.....#',
          '#.TTT.====.TTT.#',
          '#.TTT.====.TTT.#',
          '#.....====.....#',
          '#.....====.....#',
          '#.TT..====..TT.#',
          '#.TT..====..TT.#',
          '#.....====.....#',
          '#.....====.....#',
          '##....====....##',
          '##....====....##',
          '###...====...###',
          '################'
        ],
        warps: [
          { x: 7, y: 19, targetMap: 'map_maple', targetX: 7, targetY: 2 },
          { x: 8, y: 19, targetMap: 'map_maple', targetX: 7, targetY: 2 },
          { x: 6, y: 0, targetMap: 'map_creek', targetX: 7, targetY: 14 },
          { x: 7, y: 0, targetMap: 'map_creek', targetX: 7, targetY: 14 }
        ],
        npcs: [
          {
            id: 'rival_leon_1',
            name: '雷昂',
            type: 'rival',
            x: 7,
            y: 15,
            dir: 'down',
            trainerId: 'rival_1',
            autoTriggerY: 16, // Steps in front
            dialog: [
              '安東尼！你終於選好夥伴出發了！',
              '我們從小一起長大，今天就在這裡看看誰挑選的夥伴更厲害吧！'
            ]
          },
          {
            id: 'youngster_timmy',
            name: '少年 蒂米',
            type: 'npc',
            x: 4,
            y: 9,
            dir: 'right',
            trainerId: 'youngster_timmy',
            dialog: [
              '在草叢裡多走走，就能遇到許多不同種類的野生怪獸哦！'
            ]
          }
        ],
        chests: [
          { id: 'chest_route1_1', x: 2, y: 4, item: 'capsule', count: 5, collected: false },
          { id: 'chest_route1_2', x: 13, y: 13, item: 'potion', count: 2, collected: false }
        ],
        encounters: [
          { monsterId: 7, minLv: 3, maxLv: 6, rate: 0.4 },  // 電羽雀
          { monsterId: 8, minLv: 3, maxLv: 5, rate: 0.3 },  // 岩甲穿山獸
          { monsterId: 9, minLv: 4, maxLv: 6, rate: 0.3 }   // 毒刺菇寶
        ]
      },

      // 3. Creek Village (溪流村)
      'map_creek': {
        id: 'map_creek',
        name: '溪流村',
        bgm: 'town',
        width: 16,
        height: 16,
        layout: [
          '################',
          '###...====...###',
          '##....====....##',
          '#.HHHH.==.HHHH.#',
          '#.WWWW.==.WWWW.#',
          '#.WDWW.==.WCDW.#',
          '#......==......#',
          '~~~~~~====~~~~~~',
          '~~~~~~====~~~~~~',
          '#......==......#',
          '#.HHHH.==.HHHH.#',
          '#.WWWW.==.WWWW.#',
          '#.WDWW.==.WDWW.#',
          '##....====....##',
          '###...====...###',
          '################'
        ],
        warps: [
          { x: 6, y: 15, targetMap: 'map_route1', targetX: 7, targetY: 1 },
          { x: 7, y: 15, targetMap: 'map_route1', targetX: 7, targetY: 1 },
          { x: 6, y: 1, targetMap: 'map_cave', targetX: 8, targetY: 14 },
          { x: 7, y: 1, targetMap: 'map_cave', targetX: 8, targetY: 14 }
        ],
        npcs: [
          {
            id: 'ellie',
            name: '巡林員 艾莉',
            type: 'npc',
            x: 4,
            y: 9,
            dir: 'right',
            dialog: [
              '安東尼，你來得正好！',
              '暗影教團的哨兵堵住了北邊迴音洞穴的入口，不讓任何人通過！',
              '如果你要去荒原與神殿，必須先打倒那名哨兵！'
            ]
          },
          {
            id: 'shadow_grunt_creek',
            name: '暗影哨兵',
            type: 'grunt',
            x: 7,
            y: 3,
            dir: 'down',
            trainerId: 'shadow_grunt_1',
            blocksPath: true,
            dialog: [
              '閃開！暗影教團正在洞穴深處挖掘黑晶核，誰也別想過去！'
            ]
          },
          {
            id: 'nurse_creek',
            name: '診所 護士',
            type: 'nurse',
            x: 11,
            y: 6,
            dir: 'down',
            isHealer: true,
            dialog: [
              '歡迎來到溪流村診所！已經幫你的所有怪獸治療完畢！'
            ]
          },
          {
            id: 'shopkeeper',
            name: '道具店老闆',
            type: 'npc',
            x: 3,
            y: 6,
            dir: 'down',
            isShop: true,
            dialog: [
              '歡迎光臨溪流村道具店！準備充足的傷藥和膠囊再出發吧！'
            ]
          }
        ],
        chests: [
          { id: 'chest_creek_1', x: 13, y: 12, item: 'super_potion', count: 2, collected: false }
        ],
        encounters: []
      },

      // 4. Echo Caverns (迴音洞穴)
      'map_cave': {
        id: 'map_cave',
        name: '迴音洞穴',
        bgm: 'cave',
        width: 16,
        height: 16,
        // C = crystal, X = cave_wall, . = cave_ground
        layout: [
          'XXXXXXXXXXXXXXXX',
          'XXX...====...XXX',
          'XX....====....XX',
          'X..C...==...C..X',
          'X......==......X',
          'X.XX...==...XX.X',
          'X.XX...==...XX.X',
          'X..C...==...C..X',
          'X......==......X',
          'X.XX...==...XX.X',
          'X.XX...==...XX.X',
          'X......==......X',
          'XX....====....XX',
          'XXX...====...XXX',
          'XXXX..====..XXXX',
          'XXXXXXXXXXXXXXXX'
        ],
        warps: [
          { x: 7, y: 14, targetMap: 'map_creek', targetX: 7, targetY: 2 },
          { x: 8, y: 14, targetMap: 'map_creek', targetX: 7, targetY: 2 },
          { x: 6, y: 1, targetMap: 'map_badlands', targetX: 7, targetY: 18 },
          { x: 7, y: 1, targetMap: 'map_badlands', targetX: 7, targetY: 18 }
        ],
        npcs: [
          {
            id: 'shadow_zack',
            name: '幹部 扎克',
            type: 'grunt',
            x: 7,
            y: 5,
            dir: 'down',
            trainerId: 'shadow_commander_zack',
            dialog: [
              '我乃暗影執行官扎克！莫爾加斯大人的暗夜魔龍即將復甦，任何人都休想阻礙！'
            ]
          },
          {
            id: 'rival_leon_cave',
            name: '雷昂',
            type: 'rival',
            x: 9,
            y: 5,
            dir: 'left',
            dialog: [
              '安東尼，幹得漂亮！扎克被你擊潰了！',
              '穿過洞穴就是烈風荒原與終焉神殿了，這幾顆超級膠囊給你！'
            ],
            gift: { item: 'super_capsule', count: 3 }
          }
        ],
        chests: [
          { id: 'chest_cave_1', x: 2, y: 8, item: 'super_potion', count: 3, collected: false },
          { id: 'chest_cave_2', x: 13, y: 4, item: 'revive', count: 2, collected: false }
        ],
        encounters: [
          { monsterId: 10, minLv: 9, maxLv: 13, rate: 0.45 }, // 幽影蝠
          { monsterId: 8, minLv: 9, maxLv: 12, rate: 0.35 },  // 岩甲穿山獸
          { monsterId: 11, minLv: 11, maxLv: 14, rate: 0.20 } // 霜角白鹿 (Rare!)
        ]
      },

      // 5. Gale Badlands (烈風荒原)
      'map_badlands': {
        id: 'map_badlands',
        name: '烈風荒原 (2號道路)',
        bgm: 'route',
        width: 16,
        height: 20,
        layout: [
          '###...====...###',
          '##....====....##',
          '#..SS.====.SS..#',
          '#..SS.====.SS..#',
          '#.....====.....#',
          '#.SSS.====.SSS.#',
          '#.SSS.====.SSS.#',
          '#.....====.....#',
          '#..SS.====.SS..#',
          '#..SS.====.SS..#',
          '#.....====.....#',
          '#.SSS.====.SSS.#',
          '#.SSS.====.SSS.#',
          '#.....====.....#',
          '#.....====.....#',
          '##....====....##',
          '##....====....##',
          '###...====...###',
          '###...====...###',
          '################'
        ],
        warps: [
          { x: 6, y: 19, targetMap: 'map_cave', targetX: 7, targetY: 2 },
          { x: 7, y: 19, targetMap: 'map_cave', targetX: 7, targetY: 2 },
          { x: 6, y: 0, targetMap: 'map_temple', targetX: 7, targetY: 14 },
          { x: 7, y: 0, targetMap: 'map_temple', targetX: 7, targetY: 14 }
        ],
        npcs: [
          {
            id: 'veteran_gordon',
            name: '老將 戈登',
            type: 'npc',
            x: 4,
            y: 8,
            dir: 'right',
            trainerId: 'veteran_gordon',
            dialog: [
              '年輕的冒險者啊，神殿就在前方，那裡盤踞著無比危險的暗影力量！'
            ]
          }
        ],
        chests: [
          { id: 'chest_badlands_1', x: 2, y: 5, item: 'hyper_capsule', count: 2, collected: false },
          { id: 'chest_badlands_2', x: 13, y: 11, item: 'max_potion', count: 2, collected: false }
        ],
        encounters: [
          { monsterId: 12, minLv: 16, maxLv: 20, rate: 0.4 }, // 鋼甲霸犀
          { monsterId: 11, minLv: 16, maxLv: 20, rate: 0.3 }, // 霜角白鹿
          { monsterId: 7, minLv: 15, maxLv: 19, rate: 0.3 }   // 電羽雀
        ]
      },

      // 6. Apex Temple (終焉神殿) - Climax & Ending Zone!
      'map_temple': {
        id: 'map_temple',
        name: '終焉神殿 (頂峰決戰)',
        bgm: 'boss',
        width: 16,
        height: 16,
        // P = temple_pillar, _ = temple_floor
        layout: [
          'PPPPPPPPPPPPPPPP',
          'PPP...____...PPP',
          'PP....____....PP',
          'P..P..____..P..P',
          'P.....____.....P',
          'P..P..____..P..P',
          'P.....____.....P',
          'P..P..____..P..P',
          'P.....____.....P',
          'P.....____.....P',
          'P..P..____..P..P',
          'P.....____.....P',
          'PP....____....PP',
          'PPP...____...PPP',
          'PPPP..____..PPPP',
          'PPPPPPPPPPPPPPPP'
        ],
        warps: [
          { x: 6, y: 15, targetMap: 'map_badlands', targetX: 7, targetY: 1 },
          { x: 7, y: 15, targetMap: 'map_badlands', targetX: 7, targetY: 1 }
        ],
        npcs: [
          {
            id: 'rival_leon_temple',
            name: '雷昂',
            type: 'rival',
            x: 5,
            y: 9,
            dir: 'up',
            dialog: [
              '安東尼！外面的暗影教團追兵由我來擋住！',
              '神殿王座上的莫爾加斯和暗夜魔龍就交給你了！一定要拯救世界！'
            ]
          },
          {
            id: 'boss_morgas',
            name: '統領 莫爾加斯',
            type: 'boss',
            x: 7,
            y: 4,
            dir: 'down',
            trainerId: 'boss_morgas',
            isFinalBoss: true,
            dialog: [
              '哈哈哈！你們來得太遲了！',
              '暗夜魔龍的力量已經覺醒，整個大陸都將籠罩在永恆的暗影之中！',
              '安東尼，成為魔龍甦醒後的第一個祭品吧！'
            ]
          }
        ],
        chests: [
          { id: 'chest_temple_1', x: 2, y: 4, item: 'hyper_capsule', count: 3, collected: false },
          { id: 'chest_temple_2', x: 13, y: 4, item: 'max_potion', count: 3, collected: false }
        ],
        encounters: [] // Sanctuary
      }
    };
  }

  // Check collision for tile coordinates (x, y)
  isTileBlocked(mapId, x, y) {
    const map = this.maps[mapId];
    if (!map) return true;
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return true;

    const row = map.layout[y];
    if (!row) return true;
    const tileChar = row[x];

    // Solid collision characters: # (tree), H (roof), W (wall), ~ (water), X (cave wall), P (temple pillar)
    if (['#', 'H', 'W', '~', 'X', 'P'].includes(tileChar)) {
      return true;
    }

    // Check NPC collision
    for (const npc of map.npcs) {
      if (npc.x === x && npc.y === y) {
        if (npc.trainerId === 'shadow_grunt_1' && this.game.storyFlags.grunt_defeated) continue;
        if (npc.trainerId === 'shadow_commander_zack' && this.game.storyFlags.zack_defeated) continue;
        if (npc.trainerId === 'rival_1' && this.game.storyFlags.rival_1_defeated) continue;
        if (npc.trainerId === 'boss_morgas' && this.game.storyFlags.game_cleared) continue;
        if (npc.defeated) continue;
        return true;
      }
    }

    // Check Chest collision
    for (const chest of map.chests) {
      if (chest.x === x && chest.y === y && !chest.collected) {
        return true;
      }
    }

    return false;
  }

  // Get NPC facing player or at coords
  getNpcAt(mapId, x, y) {
    const map = this.maps[mapId];
    if (!map) return null;
    return map.npcs.find(npc => npc.x === x && npc.y === y);
  }

  // Get Chest at coords
  getChestAt(mapId, x, y) {
    const map = this.maps[mapId];
    if (!map) return null;
    return map.chests.find(c => c.x === x && c.y === y && !c.collected);
  }

  // Check if player stepped on tall grass
  isTallGrass(mapId, x, y) {
    const map = this.maps[mapId];
    if (!map || !map.layout[y]) return false;
    const char = map.layout[y][x];
    return char === 'T' || char === 'S' || char === 'C'; // Tall grass, Sand encounter, or Cave crystal
  }

  // Roll random wild encounter
  rollWildEncounter(mapId) {
    const map = this.maps[mapId];
    if (!map || !map.encounters || map.encounters.length === 0) return null;

    // 18% encounter chance per step in wild zones
    if (Math.random() > 0.18) return null;

    const roll = Math.random();
    let cumulative = 0;
    for (const enc of map.encounters) {
      cumulative += enc.rate;
      if (roll <= cumulative) {
        const level = Math.floor(Math.random() * (enc.maxLv - enc.minLv + 1)) + enc.minLv;
        return { monsterId: enc.monsterId, level };
      }
    }
    const last = map.encounters[map.encounters.length - 1];
    return { monsterId: last.monsterId, level: last.minLv };
  }
}

window.MapEngine = MapEngine;
