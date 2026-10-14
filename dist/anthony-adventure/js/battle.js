/**
 * Anthony's Adventure (安東尼大冒險)
 * Turn-based Battle Engine & Capture Mechanics
 */

class BattleEngine {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.isTrainerBattle = false;
    this.trainerData = null;
    this.enemyParty = [];
    this.enemyIndex = 0;
    this.enemyMon = null;
    this.playerMon = null;

    this.state = 'INIT'; // INIT, MENU, MOVES, TARGET, TEXT, ANIMATION, CATCHING, FAINTED, VICTORY, DEFEAT
    this.textQueue = [];
    this.currentText = '';
    this.textCallback = null;

    this.selectedCommand = 0; // 0: Fight, 1: Bag, 2: Party, 3: Run
    this.selectedMove = 0;
    this.turnQueue = [];

    // Animation & Visual FX
    this.animTimer = 0;
    this.animType = null;
    this.animProgress = 0;
    this.particles = [];
    this.screenShake = 0;

    // Capsule Catching
    this.catchShakes = 0;
    this.catchSuccess = false;
    this.shakeTimer = 0;
  }

  startWildBattle(wildData) {
    this.active = true;
    this.isTrainerBattle = false;
    this.trainerData = null;
    this.enemyParty = [this.createMonsterInstance(wildData.monsterId, wildData.level)];
    this.enemyIndex = 0;
    this.enemyMon = this.enemyParty[0];

    // Find first alive player monster
    this.playerMon = this.game.party.find(m => m.currentHp > 0);
    if (!this.playerMon) {
      this.game.party[0].currentHp = this.playerMonMaxHp(this.game.party[0]);
      this.playerMon = this.game.party[0];
    }

    // Reset battle stat stages
    this.resetStatStages(this.playerMon);
    this.resetStatStages(this.enemyMon);

    // Register Dex seen
    this.game.registerDex(this.enemyMon.id, false);

    this.game.audio.playSfx('encounter');
    this.game.audio.playBgm('battle');

    this.queueText(`野生的 ${this.enemyMon.name} 出現了！`, () => {
      this.queueText(`去吧，${this.playerMon.name}！`, () => {
        this.state = 'MENU';
      });
    });
  }

  startTrainerBattle(trainerId) {
    const tData = window.GAME_DATA.TRAINERS[trainerId];
    if (!tData) return;

    this.active = true;
    this.isTrainerBattle = true;
    this.trainerData = tData;
    this.enemyParty = [];

    // Build trainer party
    tData.monsters.forEach(tm => {
      let monId = tm.id;
      // Handle rival starter counter
      if (monId === 0) {
        const playerStarterId = this.game.starterChoice;
        if (playerStarterId === 1) monId = tm.level >= 14 ? 6 : 5; // Water counters Fire
        else if (playerStarterId === 3) monId = tm.level >= 14 ? 2 : 1; // Fire counters Grass
        else monId = tm.level >= 14 ? 4 : 3; // Grass counters Water
      }
      const instance = this.createMonsterInstance(monId, tm.level);
      this.enemyParty.push(instance);
    });

    this.enemyIndex = 0;
    this.enemyMon = this.enemyParty[0];

    this.playerMon = this.game.party.find(m => m.currentHp > 0);
    if (!this.playerMon) {
      this.game.party[0].currentHp = this.playerMonMaxHp(this.game.party[0]);
      this.playerMon = this.game.party[0];
    }

    this.resetStatStages(this.playerMon);
    this.resetStatStages(this.enemyMon);

    // Register Dex seen
    this.enemyParty.forEach(m => this.game.registerDex(m.id, false));

    this.game.audio.playSfx('encounter');
    this.game.audio.playBgm(tData.id === 'boss_morgas' ? 'boss' : 'battle');

    this.queueText(`${tData.title} ${tData.name} 發起了挑戰！`, () => {
      if (tData.dialogBefore) {
        this.queueText(`${tData.name}：「${tData.dialogBefore}」`, () => {
          this.queueText(`${tData.name} 派出了 ${this.enemyMon.name}！`, () => {
            this.queueText(`上吧，${this.playerMon.name}！`, () => {
              this.state = 'MENU';
            });
          });
        });
      } else {
        this.queueText(`${tData.name} 派出了 ${this.enemyMon.name}！`, () => {
          this.queueText(`上吧，${this.playerMon.name}！`, () => {
            this.state = 'MENU';
          });
        });
      }
    });
  }

  // Create an active monster instance with calculated stats and moves
  createMonsterInstance(monsterId, level) {
    const base = window.GAME_DATA.MONSTERS[monsterId];
    const stats = this.calcStats(base.baseStats, level);

    // Assign moves based on learnset
    const learnedMoves = [];
    base.learnset.forEach(entry => {
      if (level >= entry.level) {
        learnedMoves.push(entry.move);
      }
    });
    // Keep at most 4 latest moves
    const activeMoves = learnedMoves.slice(-4).map(mId => {
      const moveData = window.GAME_DATA.MOVES[mId];
      return {
        id: mId,
        name: moveData.name,
        type: moveData.type,
        power: moveData.power,
        acc: moveData.acc,
        pp: moveData.pp,
        maxPp: moveData.pp,
        category: moveData.category
      };
    });

    return {
      id: monsterId,
      name: base.name,
      level,
      types: [...base.types],
      maxHp: stats.hp,
      currentHp: stats.hp,
      stats: {
        atk: stats.atk,
        def: stats.def,
        spAtk: stats.spAtk,
        spDef: stats.spDef,
        spd: stats.spd
      },
      moves: activeMoves,
      status: null, // 'burn', 'paralyze', 'poison', 'freeze', 'sleep'
      exp: this.calcExpForLevel(level),
      statStages: { atk: 0, def: 0, spd: 0 }
    };
  }

  resetStatStages(mon) {
    if (mon) {
      mon.statStages = { atk: 0, def: 0, spd: 0 };
    }
  }

  calcStats(base, level) {
    const hp = Math.floor(((2 * base.hp + 31) * level) / 100) + level + 10;
    const atk = Math.floor(((2 * base.atk + 31) * level) / 100) + 5;
    const def = Math.floor(((2 * base.def + 31) * level) / 100) + 5;
    const spAtk = Math.floor(((2 * base.spAtk + 31) * level) / 100) + 5;
    const spDef = Math.floor(((2 * base.spDef + 31) * level) / 100) + 5;
    const spd = Math.floor(((2 * base.spd + 31) * level) / 100) + 5;
    return { hp, atk, def, spAtk, spDef, spd };
  }

  calcExpForLevel(level) {
    return Math.floor(Math.pow(level, 3) * 0.8);
  }

  playerMonMaxHp(mon) {
    const base = window.GAME_DATA.MONSTERS[mon.id];
    return Math.floor(((2 * base.baseStats.hp + 31) * mon.level) / 100) + mon.level + 10;
  }

  queueText(text, callback = null) {
    this.textQueue.push({ text, callback });
    if (this.state !== 'TEXT') {
      this.advanceText();
    }
  }

  advanceText() {
    if (this.textQueue.length > 0) {
      const next = this.textQueue.shift();
      this.currentText = next.text;
      this.textCallback = next.callback;
      this.state = 'TEXT';
      this.game.audio.playSfx('text');
    } else {
      if (this.textCallback) {
        const cb = this.textCallback;
        this.textCallback = null;
        cb();
      }
    }
  }

  // Handle Command selection
  handleCommand(cmd) {
    if (this.state !== 'MENU') return;

    switch (cmd) {
      case 'fight':
        this.state = 'MOVES';
        this.selectedMove = 0;
        this.game.audio.playSfx('click');
        break;
      case 'bag':
        this.game.openBagMenu((selectedItem) => {
          this.useItemInBattle(selectedItem);
        });
        break;
      case 'party':
        this.game.openPartyMenu((selectedMonIndex) => {
          this.switchMonInBattle(selectedMonIndex);
        });
        break;
      case 'run':
        this.tryRun();
        break;
    }
  }

  // Select Move
  handleMoveSelect(index) {
    if (this.state !== 'MOVES') return;
    const move = this.playerMon.moves[index];
    if (!move) return;

    if (move.pp <= 0) {
      this.game.audio.playSfx('cancel');
      this.queueText('該技能的 PP 已經耗盡！', () => {
        this.state = 'MOVES';
      });
      return;
    }

    // Spend PP
    move.pp--;
    this.executeTurn(move);
  }

  // Try to Run from battle
  tryRun() {
    if (this.isTrainerBattle) {
      this.game.audio.playSfx('cancel');
      this.queueText('訓練家之間的對決不能逃跑！', () => {
        this.state = 'MENU';
      });
      return;
    }

    // Wild battle run chance based on speed
    const playerSpd = this.getEffectiveStat(this.playerMon, 'spd');
    const enemySpd = this.getEffectiveStat(this.enemyMon, 'spd');

    if (playerSpd >= enemySpd || Math.random() < 0.65) {
      this.game.audio.playSfx('run');
      this.queueText('成功逃跑了！', () => {
        this.endBattle();
      });
    } else {
      this.game.audio.playSfx('bump');
      this.queueText('逃跑失敗！', () => {
        this.executeEnemyOnlyTurn();
      });
    }
  }

  // Use Item during battle
  useItemInBattle(itemId) {
    const itemData = window.GAME_DATA.ITEMS[itemId];
    if (!itemData) return;

    // Deduct item count
    this.game.inventory[itemId] = (this.game.inventory[itemId] || 1) - 1;
    if (this.game.inventory[itemId] <= 0) delete this.game.inventory[itemId];

    if (itemData.category === 'ball') {
      if (this.isTrainerBattle) {
        this.queueText('不可捕捉其他訓練家的怪獸！', () => {
          this.state = 'MENU';
        });
        return;
      }
      this.attemptCatch(itemData);
    } else if (itemData.category === 'heal') {
      const healAmt = itemData.healHp;
      const prev = this.playerMon.currentHp;
      this.playerMon.currentHp = Math.min(this.playerMon.maxHp, this.playerMon.currentHp + healAmt);
      const diff = this.playerMon.currentHp - prev;
      this.game.audio.playSfx('heal');
      this.queueText(`對 ${this.playerMon.name} 使用了 ${itemData.name}，回復了 ${diff} 點 HP！`, () => {
        this.executeEnemyOnlyTurn();
      });
    } else if (itemData.category === 'cure') {
      this.playerMon.status = null;
      this.game.audio.playSfx('heal');
      this.queueText(`治癒了 ${this.playerMon.name} 的異常狀態！`, () => {
        this.executeEnemyOnlyTurn();
      });
    }
  }

  // Switch monster during battle
  switchMonInBattle(index) {
    const target = this.game.party[index];
    if (!target) return;
    if (target === this.playerMon) {
      this.queueText(`${target.name} 已經在戰鬥中了！`, () => {
        this.state = 'MENU';
      });
      return;
    }
    if (target.currentHp <= 0) {
      this.queueText(`${target.name} 已經失去戰鬥能力！`, () => {
        this.state = 'MENU';
      });
      return;
    }

    this.queueText(`回來吧，${this.playerMon.name}！`, () => {
      this.playerMon = target;
      this.resetStatStages(this.playerMon);
      this.game.audio.playSfx('confirm');
      this.queueText(`去吧，${this.playerMon.name}！`, () => {
        this.executeEnemyOnlyTurn();
      });
    });
  }

  // Execute Full Turn (Player + Enemy)
  executeTurn(playerMove) {
    const enemyMove = this.chooseEnemyMove();

    // Determine speed and priority
    const pPriority = playerMove.priority || 0;
    const ePriority = enemyMove.priority || 0;
    const pSpeed = this.getEffectiveStat(this.playerMon, 'spd');
    const eSpeed = this.getEffectiveStat(this.enemyMon, 'spd');

    let playerFirst = true;
    if (pPriority !== ePriority) {
      playerFirst = pPriority > ePriority;
    } else {
      playerFirst = pSpeed >= eSpeed;
    }

    const firstAction = playerFirst
      ? () => this.performMove(this.playerMon, this.enemyMon, playerMove, () => {
          if (this.enemyMon.currentHp > 0) {
            this.performMove(this.enemyMon, this.playerMon, enemyMove, () => this.endTurn());
          } else {
            this.handleEnemyFaint();
          }
        })
      : () => this.performMove(this.enemyMon, this.playerMon, enemyMove, () => {
          if (this.playerMon.currentHp > 0) {
            this.performMove(this.playerMon, this.enemyMon, playerMove, () => this.endTurn());
          } else {
            this.handlePlayerFaint();
          }
        });

    firstAction();
  }

  executeEnemyOnlyTurn() {
    const enemyMove = this.chooseEnemyMove();
    this.performMove(this.enemyMon, this.playerMon, enemyMove, () => {
      if (this.playerMon.currentHp <= 0) {
        this.handlePlayerFaint();
      } else {
        this.endTurn();
      }
    });
  }

  chooseEnemyMove() {
    const available = this.enemyMon.moves.filter(m => m.pp > 0);
    if (available.length === 0) {
      return window.GAME_DATA.MOVES['tackle'];
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    chosen.pp--;
    return chosen;
  }

  // Perform single Move action
  performMove(attacker, defender, move, onComplete) {
    // Check status immobility
    if (attacker.status === 'paralyze' && Math.random() < 0.25) {
      this.game.audio.playSfx('bump');
      this.queueText(`${attacker.name} 身體麻痺，無法動彈！`, onComplete);
      return;
    }
    if (attacker.status === 'freeze') {
      if (Math.random() < 0.2) {
        attacker.status = null;
        this.queueText(`${attacker.name} 體表的堅冰融化了！`);
      } else {
        this.game.audio.playSfx('bump');
        this.queueText(`${attacker.name} 被冰封住了，動彈不得！`, onComplete);
        return;
      }
    }

    this.queueText(`${attacker.name} 使用了 ${move.name}！`, () => {
      // Check Accuracy
      if (Math.random() * 100 > move.acc) {
        this.queueText('但是沒有命中！', onComplete);
        return;
      }

      // Check Status moves
      if (move.category === 'status') {
        if (move.effect && move.effect.stat) {
          const target = move.effect.target === 'enemy' ? defender : attacker;
          target.statStages[move.effect.stat] = (target.statStages[move.effect.stat] || 0) + move.effect.change;
          const statName = move.effect.stat === 'atk' ? '攻擊' : (move.effect.stat === 'def' ? '防禦' : '速度');
          const changeText = move.effect.change > 0 ? '提升了！' : '降低了！';
          this.game.audio.playSfx('click');
          this.queueText(`${target.name} 的 ${statName} ${changeText}`, onComplete);
        } else if (move.effect && move.effect.status) {
          if (!defender.status) {
            defender.status = move.effect.status;
            this.game.audio.playSfx('hit');
            const sName = defender.status === 'burn' ? '灼傷' : (defender.status === 'paralyze' ? '麻痺' : '冰凍');
            this.queueText(`${defender.name} 陷入了 ${sName} 狀態！`, onComplete);
          } else {
            this.queueText('但是沒有產生效果……', onComplete);
          }
        } else {
          this.queueText('但是沒有產生效果……', onComplete);
        }
        return;
      }

      // Damage Calculation
      const isSpecial = move.category === 'special';
      const atkStat = this.getEffectiveStat(attacker, isSpecial ? 'spAtk' : 'atk');
      const defStat = this.getEffectiveStat(defender, isSpecial ? 'spDef' : 'def');

      // Base Damage Formula
      const baseDamage = Math.floor((((2 * attacker.level) / 5 + 2) * move.power * (atkStat / defStat)) / 50) + 2;

      // STAB (Same Type Attack Bonus)
      const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;

      // Type Effectiveness
      const mult = window.GAME_DATA.getEffectiveness(move.type, defender.types);

      // Critical Hit
      const isCrit = Math.random() < 0.0625;
      const crit = isCrit ? 1.5 : 1.0;

      // Random factor 0.85 ~ 1.0
      const variance = 0.85 + Math.random() * 0.15;

      const totalDamage = Math.max(1, Math.floor(baseDamage * stab * mult * crit * variance));

      // Visual particle trigger
      this.triggerMoveEffect(move.type, defender === this.enemyMon);

      defender.currentHp = Math.max(0, defender.currentHp - totalDamage);

      // Play Sound
      if (mult > 1.0) {
        this.game.audio.playSfx('super_effective');
      } else {
        this.game.audio.playSfx('hit');
      }

      // Text and feedback
      const followUp = () => {
        if (mult > 1.0) {
          this.queueText('效果絕佳！', () => {
            if (isCrit) this.queueText('擊中了要害！', onComplete);
            else onComplete();
          });
        } else if (mult < 1.0 && mult > 0) {
          this.queueText('效果不太好……', () => {
            if (isCrit) this.queueText('擊中了要害！', onComplete);
            else onComplete();
          });
        } else if (mult === 0) {
          this.queueText('似乎沒有效果……', onComplete);
        } else {
          if (isCrit) this.queueText('擊中了要害！', onComplete);
          else onComplete();
        }
      };

      followUp();
    });
  }

  triggerMoveEffect(type, isEnemyTarget) {
    this.screenShake = 12;
    const count = 18;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: isEnemyTarget ? 170 : 60,
        y: isEnemyTarget ? 50 : 120,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 20,
        color: window.GAME_DATA.TYPE_COLORS[type] || '#FFF'
      });
    }
  }

  getEffectiveStat(mon, statName) {
    const base = mon.stats[statName] || 50;
    const stage = mon.statStages ? (mon.statStages[statName] || 0) : 0;
    const mult = stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
    return Math.floor(base * mult);
  }

  // End of Turn: status damages
  endTurn() {
    // Burn / Poison ticks
    const checkTick = (mon, next) => {
      if (mon.status === 'burn' && mon.currentHp > 0) {
        const tick = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.currentHp = Math.max(0, mon.currentHp - tick);
        this.game.audio.playSfx('hit');
        this.queueText(`${mon.name} 受到灼傷傷害！`, next);
      } else {
        next();
      }
    };

    checkTick(this.playerMon, () => {
      if (this.playerMon.currentHp <= 0) {
        this.handlePlayerFaint();
      } else {
        checkTick(this.enemyMon, () => {
          if (this.enemyMon.currentHp <= 0) {
            this.handleEnemyFaint();
          } else {
            this.state = 'MENU';
          }
        });
      }
    });
  }

  // Enemy Monster Fainted
  handleEnemyFaint() {
    this.game.audio.playSfx('faint');
    this.queueText(`敵方的 ${this.enemyMon.name} 倒下了！`, () => {
      // Award EXP
      const baseExp = window.GAME_DATA.MONSTERS[this.enemyMon.id].baseExp || 70;
      const expGain = Math.floor((baseExp * this.enemyMon.level) / 7);
      this.awardExp(expGain);
    });
  }

  awardExp(amount) {
    this.queueText(`${this.playerMon.name} 獲得了 ${amount} 點經驗值！`, () => {
      this.playerMon.exp += amount;
      const nextLevelExp = this.calcExpForLevel(this.playerMon.level + 1);

      if (this.playerMon.exp >= nextLevelExp && this.playerMon.level < 50) {
        // Level Up!
        this.playerMon.level++;
        this.game.audio.playSfx('level_up');
        // Recalculate stats
        const base = window.GAME_DATA.MONSTERS[this.playerMon.id];
        const newStats = this.calcStats(base.baseStats, this.playerMon.level);
        const hpDiff = newStats.hp - this.playerMon.maxHp;
        this.playerMon.maxHp = newStats.hp;
        this.playerMon.currentHp += hpDiff;
        this.playerMon.stats = newStats;

        this.queueText(`太棒了！${this.playerMon.name} 升到了等級 ${this.playerMon.level}！`, () => {
          // Check for Evolution
          if (base.evolveLevel && this.playerMon.level >= base.evolveLevel && base.evolveTo) {
            this.triggerEvolution(this.playerMon, base.evolveTo, () => {
              this.continueTrainerOrEnd();
            });
          } else {
            this.continueTrainerOrEnd();
          }
        });
      } else {
        this.continueTrainerOrEnd();
      }
    });
  }

  triggerEvolution(mon, evolveToId, onComplete) {
    const nextBase = window.GAME_DATA.MONSTERS[evolveToId];
    if (!nextBase) { onComplete(); return; }

    this.game.audio.playSfx('catch');
    this.queueText(`等等……！${mon.name} 的樣子有些不對勁？！`, () => {
      const oldName = mon.name;
      mon.id = evolveToId;
      mon.name = nextBase.name;
      mon.types = [...nextBase.types];
      const newStats = this.calcStats(nextBase.baseStats, mon.level);
      mon.maxHp = newStats.hp;
      mon.currentHp = mon.maxHp;
      mon.stats = newStats;

      // Register evolved dex
      this.game.registerDex(evolveToId, true);

      this.game.audio.playSfx('level_up');
      this.queueText(`恭喜！${oldName} 進化成了 ${mon.name}！`, onComplete);
    });
  }

  continueTrainerOrEnd() {
    if (this.isTrainerBattle) {
      this.enemyIndex++;
      if (this.enemyIndex < this.enemyParty.length) {
        this.enemyMon = this.enemyParty[this.enemyIndex];
        this.resetStatStages(this.enemyMon);
        this.queueText(`${this.trainerData.name} 派出了下一隻怪獸 ${this.enemyMon.name}！`, () => {
          this.state = 'MENU';
        });
        return;
      }

      // Trainer defeated!
      this.game.audio.stopBgm();
      this.game.audio.playSfx('level_up');
      const reward = this.trainerData.reward || 300;
      this.game.coins += reward;

      this.queueText(`獲得了對決的勝利！得到了 ${reward} 元金幣獎勵！`, () => {
        if (this.trainerData.dialogAfter) {
          this.queueText(`${this.trainerData.name}：「${this.trainerData.dialogAfter}」`, () => {
            this.handleTrainerPostBattle();
          });
        } else {
          this.handleTrainerPostBattle();
        }
      });
    } else {
      this.endBattle();
    }
  }

  handleTrainerPostBattle() {
    // Story Progression Triggers
    if (this.trainerData.id === 'rival_1') {
      this.game.storyFlags['rival_1_defeated'] = true;
    } else if (this.trainerData.id === 'shadow_grunt_1') {
      this.game.storyFlags['grunt_defeated'] = true;
    } else if (this.trainerData.id === 'shadow_commander_zack') {
      this.game.storyFlags['zack_defeated'] = true;
    } else if (this.trainerData.id === 'boss_morgas') {
      this.game.storyFlags['game_cleared'] = true;
      this.endBattle();
      this.game.triggerGameEnding();
      return;
    }

    this.endBattle();
  }

  // Player active monster fainted
  handlePlayerFaint() {
    this.game.audio.playSfx('faint');
    this.queueText(`${this.playerMon.name} 倒下了！`, () => {
      const nextMon = this.game.party.find(m => m.currentHp > 0);
      if (nextMon) {
        this.queueText('請選擇換下一隻怪獸上場！', () => {
          this.game.openPartyMenu((idx) => {
            this.switchMonInBattle(idx);
          });
        });
      } else {
        // Wipeout! All monsters fainted
        this.queueText('安東尼已經沒有任何怪獸可以戰鬥了……！', () => {
          this.queueText('眼前一片漆黑……急忙前往附近的診所！', () => {
            this.endBattle();
            this.game.respawnAtClinic();
          });
        });
      }
    });
  }

  // Attempt Catching Wild Monster
  attemptCatch(capsuleItem) {
    this.state = 'CATCHING';
    this.game.audio.playSfx('throw');

    const maxHp = this.enemyMon.maxHp;
    const curHp = this.enemyMon.currentHp;
    const baseRate = window.GAME_DATA.MONSTERS[this.enemyMon.id].catchRate || 50;
    const ballMult = capsuleItem.catchRateBonus || 1.0;

    // Pokémon capture rate formula
    const captureScore = (((3 * maxHp - 2 * curHp) * baseRate * ballMult) / (3 * maxHp));
    const finalCatchChance = Math.min(0.95, Math.max(0.15, captureScore / 255));

    const isCaught = Math.random() < finalCatchChance;

    // Animation: 3 wobbles
    let shakes = 0;
    const wobbleStep = () => {
      shakes++;
      this.game.audio.playSfx('shake');
      if (shakes < 3) {
        setTimeout(wobbleStep, 600);
      } else {
        setTimeout(() => {
          if (isCaught) {
            this.game.audio.playSfx('catch');
            this.queueText(`太棒了！成功捕捉了野生的 ${this.enemyMon.name}！`, () => {
              this.game.registerDex(this.enemyMon.id, true);
              if (this.game.party.length < 6) {
                this.game.party.push(this.enemyMon);
                this.queueText(`${this.enemyMon.name} 加入了你的冒險隊伍！`, () => {
                  this.endBattle();
                });
              } else {
                this.game.storageBox.push(this.enemyMon);
                this.queueText(`隊伍已滿，${this.enemyMon.name} 已傳送至診所怪獸倉庫！`, () => {
                  this.endBattle();
                });
              }
            });
          } else {
            this.game.audio.playSfx('bump');
            this.queueText('差一點點！怪獸掙脫了膠囊！', () => {
              this.executeEnemyOnlyTurn();
            });
          }
        }, 700);
      }
    };

    setTimeout(wobbleStep, 600);
  }

  endBattle() {
    this.active = false;
    this.state = 'INIT';
    this.textQueue = [];
    this.particles = [];
    this.game.returnToOverworld();
  }
}

window.BattleEngine = BattleEngine;
