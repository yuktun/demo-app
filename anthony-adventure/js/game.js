/**
 * Anthony's Adventure (安東尼大冒險)
 * Main Game Controller, Loop, State Management & Touch Controls
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Subsystems
    this.audio = new AudioManager();
    this.sprites = new SpriteManager();
    this.mapEngine = new MapEngine(this);
    this.battleEngine = new BattleEngine(this);

    // Game State
    this.state = 'TITLE'; // TITLE, INTRO, STARTER_SELECT, OVERWORLD, DIALOG, BATTLE, MENU, SHOP, ENDING
    this.gameSpeed = 1; // 1x or 2x fast-forward

    // Player State
    this.player = {
      x: 7,
      y: 7,
      targetX: 7,
      targetY: 7,
      dir: 'down',
      isMoving: false,
      moveProgress: 0,
      frame: 0,
      walkTimer: 0,
      isRunning: false
    };

    this.party = [];
    this.storageBox = [];
    this.inventory = {
      capsule: 5,
      potion: 3
    };
    this.coins = 300;
    this.dex = {};
    this.storyFlags = {
      starter_chosen: false,
      rival_1_defeated: false,
      grunt_defeated: false,
      zack_defeated: false,
      game_cleared: false
    };
    this.starterChoice = 1;

    // Active Dialog
    this.currentDialog = null;
    this.dialogCallback = null;

    // Input States
    this.keys = {};
    this.activeDpadDir = null;

    // Viewport scaling
    this.viewportWidth = 240;
    this.viewportHeight = 160;

    // Animation timer
    this.tick = 0;

    this.initInputs();
    this.checkSavedGame();
  }

  start() {
    this.audio.playBgm('title');
    let lastTime = performance.now();

    const loop = (time) => {
      const dt = Math.min(50, time - lastTime) * this.gameSpeed;
      lastTime = time;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  // Check LocalStorage for saved progress
  checkSavedGame() {
    const saved = localStorage.getItem('anthony_adventure_save');
    const continueBtn = document.getElementById('continueBtn');
    if (saved && continueBtn) {
      continueBtn.style.display = 'block';
    }
  }

  saveGame() {
    const data = {
      player: {
        x: this.player.x,
        y: this.player.y,
        dir: this.player.dir,
        mapId: this.mapEngine.currentMapId
      },
      party: this.party,
      storageBox: this.storageBox,
      inventory: this.inventory,
      coins: this.coins,
      dex: this.dex,
      storyFlags: this.storyFlags,
      starterChoice: this.starterChoice
    };
    try {
      localStorage.setItem('anthony_adventure_save', JSON.stringify(data));
      this.audio.playSfx('confirm');
      this.showToast('冒險進度已成功儲存！');
    } catch (e) {
      console.warn('Failed to save game to localStorage', e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem('anthony_adventure_save');
      if (!raw) return false;
      const data = JSON.parse(raw);

      this.mapEngine.currentMapId = data.player.mapId || 'map_maple';
      this.player.x = data.player.x;
      this.player.y = data.player.y;
      this.player.targetX = data.player.x;
      this.player.targetY = data.player.y;
      this.player.dir = data.player.dir || 'down';

      this.party = data.party || [];
      this.storageBox = data.storageBox || [];
      this.inventory = data.inventory || { capsule: 5, potion: 3 };
      this.coins = data.coins || 300;
      this.dex = data.dex || {};
      this.storyFlags = data.storyFlags || {};
      this.starterChoice = data.starterChoice || 1;

      // Enter Overworld
      this.state = 'OVERWORLD';
      document.getElementById('titleScreen').style.display = 'none';
      const curMap = this.mapEngine.getCurrentMap();
      this.audio.playBgm(curMap.bgm || 'town');
      this.showToast('已讀取先前的冒險紀錄！');
      return true;
    } catch (e) {
      console.error('Error loading save:', e);
      return false;
    }
  }

  newGame() {
    this.party = [];
    this.storageBox = [];
    this.inventory = { capsule: 5, potion: 3 };
    this.coins = 300;
    this.dex = {};
    this.storyFlags = {
      starter_chosen: false,
      rival_1_defeated: false,
      grunt_defeated: false,
      zack_defeated: false,
      game_cleared: false
    };

    this.mapEngine.currentMapId = 'map_maple';
    this.player.x = 7;
    this.player.y = 8;
    this.player.targetX = 7;
    this.player.targetY = 8;
    this.player.dir = 'up';

    document.getElementById('titleScreen').style.display = 'none';
    this.state = 'OVERWORLD';
    this.audio.playBgm('town');

    // Opening dialogue
    this.showDialog([
      '媽媽：「安東尼！今天是你出發的大日子！」',
      '媽媽：「布朗博士在研究所等著你挑選第一隻怪獸夥伴呢！」',
      '媽媽：「往北邊走就能找到博士的研究所，快去吧！」'
    ]);
  }

  registerDex(monsterId, isCaught = false) {
    if (!this.dex[monsterId]) {
      this.dex[monsterId] = { seen: true, caught: isCaught };
    } else if (isCaught) {
      this.dex[monsterId].caught = true;
    }
  }

  // Input Handlers (Touch & Keyboard)
  initInputs() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      this.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') {
        this.handleActionA();
      } else if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
        this.handleActionB();
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'm' || e.key === 'M') {
        this.handleActionMenu();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // Touch & Mouse D-Pad Controls
    const dpad = document.getElementById('dpad');
    if (dpad) {
      const updateDpadPos = (clientX, clientY) => {
        const rect = dpad.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);

        if (Math.abs(dx) > Math.abs(dy)) {
          this.activeDpadDir = dx > 0 ? 'right' : 'left';
        } else {
          this.activeDpadDir = dy > 0 ? 'down' : 'up';
        }
      };

      const handleDpadTouch = (e) => {
        e.preventDefault();
        this.audio.unlock();
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        updateDpadPos(touch.clientX, touch.clientY);
      };

      dpad.addEventListener('touchstart', handleDpadTouch, { passive: false });
      dpad.addEventListener('touchmove', handleDpadTouch, { passive: false });
      dpad.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.activeDpadDir = null;
      }, { passive: false });

      // Mouse support on D-Pad
      let isMouseDown = false;
      dpad.addEventListener('mousedown', (e) => {
        this.audio.unlock();
        isMouseDown = true;
        updateDpadPos(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (isMouseDown) updateDpadPos(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => {
        if (isMouseDown) {
          isMouseDown = false;
          this.activeDpadDir = null;
        }
      });
    }

    // A & B Buttons (Touch + Click)
    const btnA = document.getElementById('btnA');
    const btnB = document.getElementById('btnB');
    const btnMenu = document.getElementById('btnMenu');
    const btnRun = document.getElementById('btnRun');
    const btnSpeed = document.getElementById('btnSpeed');
    const btnSound = document.getElementById('btnSound');

    if (btnA) {
      const onA = (e) => {
        e.preventDefault();
        this.vibrate(15);
        this.handleActionA();
      };
      btnA.addEventListener('touchstart', onA, { passive: false });
      btnA.addEventListener('click', onA);
    }
    if (btnB) {
      const onB = (e) => {
        e.preventDefault();
        this.vibrate(15);
        this.handleActionB();
      };
      btnB.addEventListener('touchstart', onB, { passive: false });
      btnB.addEventListener('click', onB);
    }
    if (btnMenu) {
      btnMenu.addEventListener('click', (e) => {
        e.preventDefault();
        this.vibrate(15);
        this.handleActionMenu();
      });
    }
    if (btnRun) {
      btnRun.addEventListener('click', (e) => {
        e.preventDefault();
        this.player.isRunning = !this.player.isRunning;
        btnRun.classList.toggle('active', this.player.isRunning);
        this.vibrate(15);
        this.showToast(this.player.isRunning ? '跑步模式：開啟' : '跑步模式：關閉');
      });
    }
    if (btnSpeed) {
      btnSpeed.addEventListener('click', (e) => {
        e.preventDefault();
        this.gameSpeed = this.gameSpeed === 1 ? 1.8 : 1;
        btnSpeed.textContent = this.gameSpeed === 1 ? '1.0×' : '1.8×';
        this.vibrate(15);
      });
    }
    if (btnSound) {
      btnSound.addEventListener('click', (e) => {
        e.preventDefault();
        const muted = this.audio.toggleMute();
        btnSound.textContent = muted ? '🔇 靜音' : '🔊 聲音';
        this.vibrate(15);
      });
    }

    // Direct Canvas Tap support for mobile one-handed play
    this.canvas.addEventListener('click', (e) => {
      this.audio.unlock();
      this.handleActionA();
    });
  }

  vibrate(ms = 20) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // Action Button A (Confirm / Talk / Next)
  handleActionA() {
    this.audio.unlock();

    if (this.state === 'TITLE') {
      this.newGame();
      return;
    }

    if (this.state === 'DIALOG') {
      this.advanceDialog();
      return;
    }

    if (this.state === 'BATTLE') {
      if (this.battleEngine.state === 'TEXT') {
        this.battleEngine.advanceText();
      }
      return;
    }

    if (this.state === 'OVERWORLD' && !this.player.isMoving) {
      // Check facing NPC or Chest
      let targetX = this.player.x;
      let targetY = this.player.y;
      if (this.player.dir === 'up') targetY--;
      else if (this.player.dir === 'down') targetY++;
      else if (this.player.dir === 'left') targetX--;
      else if (this.player.dir === 'right') targetX++;

      // Check NPC
      const npc = this.mapEngine.getNpcAt(this.mapEngine.currentMapId, targetX, targetY);
      if (npc) {
        this.interactNpc(npc);
        return;
      }

      // Check Chest
      const chest = this.mapEngine.getChestAt(this.mapEngine.currentMapId, targetX, targetY);
      if (chest) {
        this.openChest(chest);
        return;
      }
    }
  }

  // Action Button B (Cancel / Close / Back)
  handleActionB() {
    this.audio.unlock();

    if (this.state === 'BATTLE') {
      if (this.battleEngine.state === 'MOVES') {
        this.battleEngine.state = 'MENU';
        this.audio.playSfx('cancel');
      }
      return;
    }

    if (this.state === 'MENU') {
      this.closeModal();
      this.state = 'OVERWORLD';
      this.audio.playSfx('cancel');
    }
  }

  // Action Menu
  handleActionMenu() {
    if (this.state === 'OVERWORLD') {
      this.state = 'MENU';
      this.openGeneralMenu();
      this.audio.playSfx('click');
    } else if (this.state === 'MENU') {
      this.closeModal();
      this.state = 'OVERWORLD';
      this.audio.playSfx('cancel');
    }
  }

  // NPC Interaction
  interactNpc(npc) {
    this.audio.playSfx('click');

    // Starter Giver (Prof Brown)
    if (npc.isStarterGiver) {
      if (!this.storyFlags.starter_chosen) {
        this.showDialog(npc.dialog, () => {
          this.openStarterSelect();
        });
      } else {
        this.showDialog([
          '布朗博士：「去吧，安東尼！帶上你的夥伴探索這個世界！」',
          '布朗博士：「傳說中沉睡在終焉神殿的創世神獸艾克西翁，正面臨著暗影軍團的威脅！」'
        ]);
      }
      return;
    }

    // Clinic Healer (Nurse)
    if (npc.isHealer) {
      this.showDialog(npc.dialog, () => {
        this.party.forEach(mon => {
          mon.currentHp = mon.maxHp;
          mon.status = null;
          mon.moves.forEach(m => m.pp = m.maxPp);
        });
        this.audio.playSfx('heal');
        this.showToast('隊伍所有怪獸體力與技能已全部回復！');
      });
      return;
    }

    // Shopkeeper
    if (npc.isShop) {
      this.openShopModal();
      return;
    }

    // Story Grunt / Zack / Rival Battle trigger
    if (npc.trainerId) {
      if (npc.trainerId === 'shadow_grunt_1' && this.storyFlags.grunt_defeated) {
        this.showDialog(['暗影哨兵已經被你打敗逃跑了，道路已經暢通！']);
        return;
      }
      if (npc.trainerId === 'shadow_commander_zack' && this.storyFlags.zack_defeated) {
        this.showDialog(['扎克已經敗退回了終焉神殿！']);
        return;
      }
      if (npc.trainerId === 'boss_morgas' && this.storyFlags.game_cleared) {
        this.showDialog(['暗夜魔龍已經被淨化，神殿重新恢復了平靜！']);
        return;
      }

      this.showDialog(npc.dialog, () => {
        this.state = 'BATTLE';
        this.battleEngine.startTrainerBattle(npc.trainerId);
      });
      return;
    }

    // Gift NPC (e.g. Leon in cave)
    if (npc.gift && !npc.giftGiven) {
      this.showDialog(npc.dialog, () => {
        this.inventory[npc.gift.item] = (this.inventory[npc.gift.item] || 0) + npc.gift.count;
        npc.giftGiven = true;
        this.audio.playSfx('confirm');
        const itemName = window.GAME_DATA.ITEMS[npc.gift.item].name;
        this.showToast(`獲得了 ${itemName} × ${npc.gift.count}！`);
      });
      return;
    }

    // Standard NPC dialogue
    this.showDialog(npc.dialog);
  }

  // Chest Pickups
  openChest(chest) {
    chest.collected = true;
    this.audio.playSfx('confirm');
    this.inventory[chest.item] = (this.inventory[chest.item] || 0) + chest.count;
    const itemName = window.GAME_DATA.ITEMS[chest.item].name;
    this.showDialog([
      `打開了寶箱！`,
      `獲得了 ${itemName} × ${chest.count}！`
    ]);
  }

  // Dialog Queue System
  showDialog(lines, callback = null) {
    this.currentDialog = [...lines];
    this.dialogCallback = callback;
    this.state = 'DIALOG';
    this.advanceDialog();
  }

  advanceDialog() {
    const dialogBox = document.getElementById('dialogBox');
    const dialogText = document.getElementById('dialogText');
    if (!dialogBox || !dialogText) return;

    if (this.currentDialog && this.currentDialog.length > 0) {
      dialogBox.style.display = 'block';
      dialogText.textContent = this.currentDialog.shift();
      this.audio.playSfx('text');
    } else {
      dialogBox.style.display = 'none';
      this.state = 'OVERWORLD';
      if (this.dialogCallback) {
        const cb = this.dialogCallback;
        this.dialogCallback = null;
        cb();
      }
    }
  }

  // Starter Monster Selection Modal
  openStarterSelect() {
    this.state = 'STARTER_SELECT';
    const modal = document.getElementById('starterModal');
    if (modal) modal.style.display = 'flex';
  }

  chooseStarter(id) {
    this.starterChoice = id;
    const starterMon = this.battleEngine.createMonsterInstance(id, 5);
    this.party.push(starterMon);
    this.registerDex(id, true);
    this.storyFlags.starter_chosen = true;

    // Give 5 capture capsules and 3 potions
    this.inventory.capsule = 5;
    this.inventory.potion = 3;

    const modal = document.getElementById('starterModal');
    if (modal) modal.style.display = 'none';

    this.audio.playSfx('catch');
    this.showDialog([
      `恭喜！你獲得了最初的怪獸夥伴【${starterMon.name}】！`,
      `布朗博士：「這孩子就託付給你了！另外，這 5 顆冒險膠囊和冒險圖鑑也送給你！」`,
      `布朗博士：「在草叢中削弱野生怪獸的體力後，使用膠囊就能將牠們收服為隊友！」`,
      `布朗博士：「朝著北方的綠蔭小徑出發吧！」`
    ]);
  }

  // Return to overworld from battle
  returnToOverworld() {
    this.state = 'OVERWORLD';
    const curMap = this.mapEngine.getCurrentMap();
    this.audio.playBgm(curMap.bgm || 'town');
  }

  // Black out and respawn at nearest Clinic
  respawnAtClinic() {
    this.mapEngine.currentMapId = 'map_maple';
    this.player.x = 11;
    this.player.y = 7;
    this.player.targetX = 11;
    this.player.targetY = 7;
    this.player.dir = 'down';

    // Fully heal party
    this.party.forEach(mon => {
      mon.currentHp = mon.maxHp;
      mon.status = null;
      mon.moves.forEach(m => m.pp = m.maxPp);
    });

    this.state = 'OVERWORLD';
    this.audio.playBgm('town');
    this.showDialog([
      '護士：「安東尼！你終於醒過來了！」',
      '護士：「你的怪獸夥伴們已經全都恢復健康了，下一次冒險一定要小心哦！」'
    ]);
  }

  // Game Ending Sequence!
  triggerGameEnding() {
    this.state = 'ENDING';
    this.audio.stopBgm();
    this.audio.playBgm('ending');

    const endingModal = document.getElementById('endingModal');
    if (endingModal) {
      endingModal.style.display = 'flex';
      this.renderHallOfFame();
    }
  }

  renderHallOfFame() {
    const list = document.getElementById('hallOfFameList');
    if (!list) return;
    list.innerHTML = '';

    this.party.forEach(mon => {
      const card = document.createElement('div');
      card.className = 'mon-card';
      card.innerHTML = `
        <div class="mon-name">${mon.name} Lv.${mon.level}</div>
        <div class="mon-type">${mon.types.join(' / ')}</div>
        <div class="mon-hp">HP: ${mon.maxHp} | 攻:${mon.stats.atk} 防:${mon.stats.def} 速:${mon.stats.spd}</div>
      `;
      list.appendChild(card);
    });
  }

  // Overworld Update Loop
  update(dt) {
    this.tick += dt;

    if (this.state === 'OVERWORLD') {
      this.updatePlayerMovement(dt);
    }
  }

  updatePlayerMovement(dt) {
    if (this.player.isMoving) {
      const speed = this.player.isRunning ? 0.012 : 0.007;
      this.player.moveProgress += dt * speed;

      // Walking animation step
      this.player.walkTimer += dt;
      if (this.player.walkTimer > 140) {
        this.player.walkTimer = 0;
        this.player.frame = (this.player.frame + 1) % 4;
      }

      if (this.player.moveProgress >= 1) {
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.player.x = this.player.targetX;
        this.player.y = this.player.targetY;
        this.player.frame = 0;

        // Check Warps
        const curMap = this.mapEngine.getCurrentMap();
        const warp = curMap.warps.find(w => w.x === this.player.x && w.y === this.player.y);
        if (warp) {
          this.executeWarp(warp);
          return;
        }

        // Check Tall Grass Random Encounters
        if (this.storyFlags.starter_chosen && this.mapEngine.isTallGrass(curMap.id, this.player.x, this.player.y)) {
          const enc = this.mapEngine.rollWildEncounter(curMap.id);
          if (enc) {
            this.state = 'BATTLE';
            this.battleEngine.startWildBattle(enc);
            return;
          }
        }
      }
      return;
    }

    // Read Input direction
    let dir = null;
    if (this.activeDpadDir) {
      dir = this.activeDpadDir;
    } else if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
      dir = 'up';
    } else if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
      dir = 'down';
    } else if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      dir = 'left';
    } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      dir = 'right';
    }

    if (dir) {
      this.player.dir = dir;
      let nextX = this.player.x;
      let nextY = this.player.y;

      if (dir === 'up') nextY--;
      else if (dir === 'down') nextY++;
      else if (dir === 'left') nextX--;
      else if (dir === 'right') nextX++;

      // Starter check gate: cannot leave Maple Town without starter
      if (!this.storyFlags.starter_chosen && this.mapEngine.currentMapId === 'map_maple' && nextY <= 1) {
        this.showDialog(['請先前往研究所挑選你的最初怪獸夥伴再離開城鎮！']);
        return;
      }

      // Check collision
      if (!this.mapEngine.isTileBlocked(this.mapEngine.currentMapId, nextX, nextY)) {
        this.player.isMoving = true;
        this.player.moveProgress = 0;
        this.player.targetX = nextX;
        this.player.targetY = nextY;
      } else {
        this.audio.playSfx('bump');
      }
    }
  }

  executeWarp(warp) {
    this.audio.playSfx('confirm');
    this.mapEngine.currentMapId = warp.targetMap;
    this.player.x = warp.targetX;
    this.player.y = warp.targetY;
    this.player.targetX = warp.targetX;
    this.player.targetY = warp.targetY;

    const newMap = this.mapEngine.getCurrentMap();
    this.audio.playBgm(newMap.bgm || 'route');
    this.showToast(`抵達：${newMap.name}`);
  }

  // Render Overworld & Battle Scenes
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'BATTLE') {
      this.renderBattleScene();
    } else {
      this.renderOverworldScene();
    }
  }

  renderOverworldScene() {
    const map = this.mapEngine.getCurrentMap();
    if (!map) return;

    const tileSize = 16;

    // Smooth camera centered on player
    const pX = (this.player.isMoving ? (this.player.x + (this.player.targetX - this.player.x) * this.player.moveProgress) : this.player.x) * tileSize;
    const pY = (this.player.isMoving ? (this.player.y + (this.player.targetY - this.player.y) * this.player.moveProgress) : this.player.y) * tileSize;

    const camX = Math.floor(this.canvas.width / 2 - pX - tileSize / 2);
    const camY = Math.floor(this.canvas.height / 2 - pY - tileSize / 2);

    this.ctx.save();
    this.ctx.translate(camX, camY);

    // Draw Map Tiles
    for (let y = 0; y < map.height; y++) {
      const row = map.layout[y];
      for (let x = 0; x < map.width; x++) {
        const char = row ? row[x] : '.';
        let tileType = 'grass';
        if (char === '#') tileType = 'tree';
        else if (char === '=') tileType = 'path';
        else if (char === 'T') tileType = 'tall_grass';
        else if (char === '~') tileType = 'water';
        else if (char === 'H') tileType = 'house_roof';
        else if (char === 'W') tileType = 'house_wall';
        else if (char === 'D') tileType = 'house_door';
        else if (char === 'C') tileType = map.id === 'map_cave' ? 'crystal' : 'clinic_sign';
        else if (char === 'X') tileType = 'cave_wall';
        else if (char === 'S') tileType = 'desert_sand';
        else if (char === 'P') tileType = 'temple_pillar';
        else if (char === '_') tileType = 'temple_floor';
        else if (map.id === 'map_cave') tileType = 'cave_ground';

        const tileImg = this.sprites.getTile(tileType);
        this.ctx.drawImage(tileImg, x * tileSize, y * tileSize);
      }
    }

    // Draw Chests
    for (const chest of map.chests) {
      if (!chest.collected) {
        const cImg = this.sprites.getTile('chest');
        this.ctx.drawImage(cImg, chest.x * tileSize, chest.y * tileSize);
      }
    }

    // Draw NPCs
    for (const npc of map.npcs) {
      const npcSprite = this.sprites.drawOverworldSprite(npc.type, npc.dir, 0);
      this.ctx.drawImage(npcSprite, npc.x * tileSize - 8, npc.y * tileSize - 16);
    }

    // Draw Player (Anthony)
    const animFrame = this.player.frame === 3 ? 1 : this.player.frame;
    const playerSprite = this.sprites.drawOverworldSprite('player', this.player.dir, animFrame);
    this.ctx.drawImage(playerSprite, pX - 8, pY - 16);

    this.ctx.restore();
  }

  renderBattleScene() {
    const b = this.battleEngine;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Battle Background
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    if (this.mapEngine.currentMapId === 'map_cave') {
      grad.addColorStop(0, '#1A237E');
      grad.addColorStop(1, '#311B92');
    } else if (this.mapEngine.currentMapId === 'map_temple') {
      grad.addColorStop(0, '#212121');
      grad.addColorStop(1, '#4A148C');
    } else {
      grad.addColorStop(0, '#81D4FA');
      grad.addColorStop(0.6, '#B3E5FC');
      grad.addColorStop(1, '#C8E6C9');
    }
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // Battle Platforms
    this.ctx.fillStyle = '#A5D6A7';
    this.ctx.beginPath();
    this.ctx.ellipse(175, 75, 45, 16, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#81C784';
    this.ctx.beginPath();
    this.ctx.ellipse(65, 135, 55, 20, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Idle breathing offset
    const enemyBob = Math.sin(this.tick * 0.005) * 2;
    const playerBob = Math.cos(this.tick * 0.005) * 2;

    // Draw Enemy Monster (Front View)
    if (b.enemyMon && b.enemyMon.currentHp > 0) {
      const eSprite = this.sprites.getMonsterSprite(b.enemyMon.id, false);
      this.ctx.drawImage(eSprite, 145, 30 + enemyBob, 60, 60);
      this.renderMonsterHud(b.enemyMon, 15, 18, false);
    }

    // Draw Player Monster (Back View)
    if (b.playerMon && b.playerMon.currentHp > 0) {
      const pSprite = this.sprites.getMonsterSprite(b.playerMon.id, true);
      this.ctx.drawImage(pSprite, 35, 85 + playerBob, 60, 60);
      this.renderMonsterHud(b.playerMon, 125, 95, true);
    }

    // Render Battle Particles
    if (b.particles && b.particles.length > 0) {
      for (let i = b.particles.length - 1; i >= 0; i--) {
        const p = b.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x, p.y, 3, 3);
        if (p.life <= 0) b.particles.splice(i, 1);
      }
    }

    // Render Battle Dialog or Command Menus
    this.renderBattleInterface();
  }

  renderMonsterHud(mon, x, y, isPlayer) {
    const w = 100;
    const h = isPlayer ? 36 : 28;

    // HUD Box
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = '#37474F';
    this.ctx.lineWidth = 1.5;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeRect(x, y, w, h);

    // Name & Lv
    this.ctx.fillStyle = '#212121';
    this.ctx.font = 'bold 9px sans-serif';
    this.ctx.fillText(`${mon.name}`, x + 5, y + 11);
    this.ctx.fillText(`Lv.${mon.level}`, x + 72, y + 11);

    // HP Bar Track
    const barX = x + 25;
    const barY = y + 16;
    const barW = 68;
    const barH = 5;

    this.ctx.fillStyle = '#616161';
    this.ctx.fillRect(barX, barY, barW, barH);

    // HP Fill
    const hpRatio = Math.max(0, Math.min(1, mon.currentHp / mon.maxHp));
    this.ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : (hpRatio > 0.2 ? '#FFC107' : '#F44336');
    this.ctx.fillRect(barX, barY, Math.floor(barW * hpRatio), barH);

    this.ctx.fillStyle = '#37474F';
    this.ctx.font = 'bold 7px sans-serif';
    this.ctx.fillText('HP', x + 6, y + 21);

    // HP Numbers for player
    if (isPlayer) {
      this.ctx.fillStyle = '#424242';
      this.ctx.font = '8px sans-serif';
      this.ctx.fillText(`${mon.currentHp}/${mon.maxHp}`, x + 55, y + 31);
    }
  }

  renderBattleInterface() {
    const b = this.battleEngine;
    const box = document.getElementById('battleControls');
    const moveGrid = document.getElementById('battleMovesGrid');
    const battleText = document.getElementById('battleText');

    if (!box || !moveGrid || !battleText) return;

    if (this.state !== 'BATTLE') {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'flex';

    if (b.state === 'TEXT') {
      battleText.style.display = 'block';
      moveGrid.style.display = 'none';
      battleText.textContent = b.currentText;
      return;
    }

    if (b.state === 'MOVES') {
      battleText.style.display = 'none';
      moveGrid.style.display = 'grid';
      moveGrid.innerHTML = '';

      b.playerMon.moves.forEach((move, idx) => {
        const btn = document.createElement('button');
        btn.className = 'move-btn';
        btn.innerHTML = `<strong>${move.name}</strong><br><small>${move.type} | PP ${move.pp}/${move.maxPp}</small>`;
        btn.onclick = () => {
          this.vibrate(15);
          b.handleMoveSelect(idx);
        };
        moveGrid.appendChild(btn);
      });
      return;
    }

    // Default Command Menu
    battleText.style.display = 'none';
    moveGrid.style.display = 'none';
  }

  // UI Modals: General Menu, Party, Bag, Dex, Shop
  openGeneralMenu() {
    const modal = document.getElementById('generalMenuModal');
    if (modal) modal.style.display = 'flex';
  }

  openPartyMenu(onSelectCallback = null) {
    const modal = document.getElementById('partyModal');
    const list = document.getElementById('partyList');
    if (!modal || !list) return;

    list.innerHTML = '';
    this.party.forEach((mon, idx) => {
      const card = document.createElement('div');
      card.className = 'party-mon-card';
      card.innerHTML = `
        <div class="p-header"><strong>${mon.name}</strong> <span>Lv.${mon.level}</span></div>
        <div class="p-body">HP: ${mon.currentHp}/${mon.maxHp} | 狀態: ${mon.status || '健康'}</div>
        <div class="p-types">${mon.types.join(' / ')}</div>
      `;
      card.onclick = () => {
        this.vibrate(15);
        if (onSelectCallback) {
          modal.style.display = 'none';
          onSelectCallback(idx);
        }
      };
      list.appendChild(card);
    });

    modal.style.display = 'flex';
  }

  openBagMenu(onSelectCallback = null) {
    const modal = document.getElementById('bagModal');
    const list = document.getElementById('bagList');
    if (!modal || !list) return;

    list.innerHTML = '';
    const itemKeys = Object.keys(this.inventory);
    if (itemKeys.length === 0) {
      list.innerHTML = '<p class="empty-msg">背包裡沒有任何道具！</p>';
    } else {
      itemKeys.forEach(itemId => {
        const count = this.inventory[itemId];
        const itemData = window.GAME_DATA.ITEMS[itemId];
        if (itemData && count > 0) {
          const row = document.createElement('div');
          row.className = 'bag-item-row';
          row.innerHTML = `
            <div><strong>${itemData.name}</strong> × ${count}<br><small>${itemData.desc}</small></div>
            <button class="use-item-btn">使用</button>
          `;
          row.querySelector('.use-item-btn').onclick = () => {
            this.vibrate(15);
            if (onSelectCallback) {
              modal.style.display = 'none';
              onSelectCallback(itemId);
            }
          };
          list.appendChild(row);
        }
      });
    }

    modal.style.display = 'flex';
  }

  openDexModal() {
    const modal = document.getElementById('dexModal');
    const list = document.getElementById('dexList');
    if (!modal || !list) return;

    list.innerHTML = '';
    for (let id = 1; id <= 14; id++) {
      const entry = window.GAME_DATA.MONSTERS[id];
      const status = this.dex[id];
      const row = document.createElement('div');
      row.className = 'dex-entry';

      if (status && status.caught) {
        row.innerHTML = `
          <strong>#${String(id).padStart(3, '0')} ${entry.name}</strong> [已捕獲]<br>
          <small>屬性：${entry.types.join(' / ')} | ${entry.desc}</small>
        `;
      } else if (status && status.seen) {
        row.innerHTML = `
          <strong>#${String(id).padStart(3, '0')} ${entry.name}</strong> [已看見]<br>
          <small>屬性：${entry.types.join(' / ')}</small>
        `;
      } else {
        row.innerHTML = `
          <strong style="color:#888;">#${String(id).padStart(3, '0')} ？？？？</strong><br>
          <small style="color:#aaa;">尚未發現該怪獸</small>
        `;
      }
      list.appendChild(row);
    }

    modal.style.display = 'flex';
  }

  openShopModal() {
    this.state = 'SHOP';
    const modal = document.getElementById('shopModal');
    const list = document.getElementById('shopList');
    const coinSpan = document.getElementById('shopCoins');
    if (!modal || !list) return;

    if (coinSpan) coinSpan.textContent = this.coins;
    list.innerHTML = '';

    const shopItems = ['capsule', 'super_capsule', 'potion', 'super_potion', 'antidote', 'revive'];
    shopItems.forEach(itemId => {
      const item = window.GAME_DATA.ITEMS[itemId];
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div><strong>${item.name}</strong> (${item.price} 元)<br><small>${item.desc}</small></div>
        <button class="buy-btn">購買</button>
      `;
      row.querySelector('.buy-btn').onclick = () => {
        if (this.coins >= item.price) {
          this.coins -= item.price;
          this.inventory[itemId] = (this.inventory[itemId] || 0) + 1;
          this.audio.playSfx('confirm');
          this.showToast(`成功購買了 ${item.name}！`);
          if (coinSpan) coinSpan.textContent = this.coins;
        } else {
          this.audio.playSfx('cancel');
          this.showToast('金幣不足！');
        }
      };
      list.appendChild(row);
    });

    modal.style.display = 'flex';
  }

  closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
  }
}

window.Game = Game;
