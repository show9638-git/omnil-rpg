/* 全零〈オムニル〉— 星なき始まり — prototype v0.1 */
(() => {
  'use strict';

  const D = window.OMNIL_DATA;
  const SAVE_KEY = 'omnil_rpg_prototype_v01';
  const root = document.getElementById('gameRoot');
  const nav = document.getElementById('bottomNav');
  const modalLayer = document.getElementById('modalLayer');
  const toastLayer = document.getElementById('toastLayer');
  let modalCloseCallback = null;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const deepCopy = (o) => JSON.parse(JSON.stringify(o));
  const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pct = (n, d) => d <= 0 ? 0 : clamp((n / d) * 100, 0, 100);

  function freshState() {
    const characters = {};
    Object.values(D.CHARACTER_DEFS).forEach((def) => {
      characters[def.id] = {
        id: def.id,
        level: 1,
        exp: 0,
        panelPoints: 0,
        unlockedPanels: def.panels.filter((p) => p.cost === 0).map((p) => p.id),
        hp: def.base.maxHp,
        mp: def.base.maxMp,
      };
    });
    return {
      version: 1,
      started: false,
      scene: 'title',
      currentLocation: 'lindholm',
      selectedCharacter: 'rainbow',
      gold: 120,
      adventureExp: 0,
      inventory: { potion: 2, ether: 1, herb: 1 },
      equipment: { rainbow: null, white: null, black: null },
      crafted: [],
      activeQuests: [],
      completedQuests: [],
      kills: {},
      flags: {},
      characters,
      battle: null,
      logs: ['全零〈オムニル〉は、宿場町リンドホルムから始まった。'],
    };
  }

  function normalizeState(candidate) {
    const base = freshState();
    const merged = { ...base, ...candidate };
    merged.inventory = { ...base.inventory, ...(candidate.inventory || {}) };
    merged.equipment = { ...base.equipment, ...(candidate.equipment || {}) };
    merged.characters = { ...base.characters, ...(candidate.characters || {}) };
    Object.keys(base.characters).forEach((id) => {
      merged.characters[id] = { ...base.characters[id], ...(candidate.characters?.[id] || {}) };
      capResources(id, merged);
    });
    merged.scene = 'title';
    merged.battle = null;
    return merged;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : freshState();
    } catch (error) {
      console.warn('セーブ読み込み失敗', error);
      return freshState();
    }
  }

  let state = loadState();

  function saveGame(show = false) {
    try {
      const saved = { ...state, battle: null };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
      if (show) toast('セーブしました。', 'good');
    } catch (error) {
      toast('セーブに失敗しました。ブラウザの保存領域を確認してください。', 'warn');
    }
  }

  function toast(message, tone = '') {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = message;
    toastLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 3800);
  }

  function getRankIndexByExp(exp = state.adventureExp) {
    let index = 0;
    D.RANKS.forEach((rank, i) => { if (exp >= rank.threshold) index = i; });
    return index;
  }

  function getRank() { return D.RANKS[getRankIndexByExp()]; }
  function rankAllowed(required) {
    return getRankIndexByExp() >= D.RANKS.findIndex((r) => r.id === required);
  }
  function expToNextRank() {
    const next = D.RANKS[getRankIndexByExp() + 1];
    return next ? next.threshold : null;
  }

  function getDef(id) { return D.CHARACTER_DEFS[id]; }
  function getChar(id) { return state.characters[id]; }

  function panelEffects(id) {
    const ch = getChar(id);
    const def = getDef(id);
    const total = {};
    def.panels.forEach((p) => {
      if (ch.unlockedPanels.includes(p.id) && p.effect) {
        Object.entries(p.effect).forEach(([stat, value]) => { total[stat] = (total[stat] || 0) + value; });
      }
    });
    return total;
  }

  function getStats(id, localState = state) {
    const def = D.CHARACTER_DEFS[id];
    const ch = localState.characters[id];
    const effects = panelEffectsForState(id, localState);
    const equippedId = localState.equipment[id];
    const equip = equippedId ? D.EQUIPMENT_DEFS[equippedId]?.stats || {} : {};
    const stats = {};
    Object.keys(def.base).forEach((key) => {
      stats[key] = def.base[key] + (def.growth[key] || 0) * (ch.level - 1) + (effects[key] || 0) + (equip[key] || 0);
    });
    return stats;
  }

  function panelEffectsForState(id, localState) {
    const ch = localState.characters[id];
    const def = D.CHARACTER_DEFS[id];
    const total = {};
    def.panels.forEach((p) => {
      if (ch.unlockedPanels.includes(p.id) && p.effect) {
        Object.entries(p.effect).forEach(([stat, value]) => { total[stat] = (total[stat] || 0) + value; });
      }
    });
    return total;
  }

  function capResources(id, localState = state) {
    const ch = localState.characters[id];
    const stats = getStats(id, localState);
    ch.hp = clamp(ch.hp, 0, stats.maxHp);
    ch.mp = clamp(ch.mp, 0, stats.maxMp);
  }

  function currentSkills(id) {
    const def = getDef(id);
    const ch = getChar(id);
    const unlocked = def.panels.filter((p) => ch.unlockedPanels.includes(p.id) && p.skill).map((p) => p.skill);
    return [...new Set([...def.starterSkills, ...unlocked])].map((skillId) => D.SKILLS[skillId]);
  }

  function levelExpRequired(level) { return 44 + (level - 1) * 34; }

  function addCharacterExp(id, amount) {
    const ch = getChar(id);
    ch.exp += amount;
    const levels = [];
    while (ch.exp >= levelExpRequired(ch.level)) {
      ch.exp -= levelExpRequired(ch.level);
      ch.level += 1;
      ch.panelPoints += 1;
      const stats = getStats(id);
      ch.hp = stats.maxHp;
      ch.mp = stats.maxMp;
      levels.push(ch.level);
    }
    return levels;
  }

  function addAdventureExp(amount) {
    const before = getRank();
    state.adventureExp += amount;
    const after = getRank();
    if (after.id !== before.id) {
      toast(`冒険者ランクが ${after.name} に上がった！`, 'good');
      appendLog(`ギルドから ${after.name} の認定を受けた。`);
    }
  }

  function appendLog(message) {
    state.logs.unshift(message);
    state.logs = state.logs.slice(0, 30);
  }

  function countItem(id) { return state.inventory[id] || 0; }
  function addItem(id, qty = 1) { state.inventory[id] = (state.inventory[id] || 0) + qty; }
  function takeItem(id, qty = 1) {
    if (countItem(id) < qty) return false;
    state.inventory[id] -= qty;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    return true;
  }

  function questProgress(q) {
    if (q.type === 'collect') return countItem(q.target);
    return state.kills[q.target] || 0;
  }
  function isQuestAvailable(q) {
    return state.adventureExp >= q.unlockAt && rankAllowed(q.rank);
  }
  function isQuestActive(id) { return state.activeQuests.includes(id); }
  function isQuestDone(id) { return state.completedQuests.includes(id); }
  function canCompleteQuest(q) { return isQuestActive(q.id) && questProgress(q) >= q.amount; }

  function acceptQuest(id) {
    const q = D.QUESTS[id];
    if (!q || !isQuestAvailable(q) || isQuestActive(id) || isQuestDone(id)) return;
    state.activeQuests.push(id);
    appendLog(`依頼を受注：「${q.name}」`);
    toast(`依頼を受注しました：${q.name}`, 'good');
    saveGame();
    render();
  }

  function completeQuest(id) {
    const q = D.QUESTS[id];
    if (!q || !canCompleteQuest(q)) return;
    if (q.type === 'collect') takeItem(q.target, q.amount);
    state.activeQuests = state.activeQuests.filter((x) => x !== id);
    state.completedQuests.push(id);
    state.gold += q.reward.gold;
    addAdventureExp(q.reward.advExp);
    q.reward.items?.forEach((item) => addItem(item.id, item.qty));
    if (id === 'q_herb') state.flags.protect = true;
    if (id === 'q_boss') state.flags.anger = true;
    appendLog(`依頼達成：「${q.name}」 報酬 ${q.reward.gold}G`);
    saveGame();
    render();
    const extra = id === 'q_herb'
      ? '\n\n白零は、薬草を受け取った治療師の表情を見つめていた。\n「……助けることは、損傷を防止する以上の意味を持つのですね。」\n\n【物語パネル：「守りたい」が解放条件を満たしました】'
      : id === 'q_boss'
        ? '\n\n黒零は、傷ついた森を見た。\n「……これは、壊してはいけない。次に触れたら、私が壊す。」\n\n【物語パネル：「壊したくない」が解放条件を満たしました】'
        : '';
    showDialogue('依頼達成', `《枝角亭》の受付は、静かに認定証を差し出した。\n「よくやったね。これで次の依頼も任せられる。」${extra}`);
  }

  function canCraft(recipe) {
    if (recipe.output.type === 'equipment' && state.crafted.includes(recipe.id)) return false;
    return recipe.ingredients.every((ing) => countItem(ing.id) >= ing.qty);
  }

  function craft(id) {
    const recipe = D.RECIPES[id];
    if (!recipe || !canCraft(recipe)) return;
    recipe.ingredients.forEach((ing) => takeItem(ing.id, ing.qty));
    if (recipe.output.type === 'item') addItem(recipe.output.id, recipe.output.qty);
    if (recipe.output.type === 'equipment') {
      const equip = D.EQUIPMENT_DEFS[recipe.output.id];
      state.crafted.push(recipe.id);
      state.equipment[equip.target] = equip.id;
      capResources(equip.target);
    }
    appendLog(`製造した：${recipe.name}`);
    toast(`製造完了：${recipe.name}`, 'good');
    saveGame();
    render();
  }

  function buyItem(id) {
    const item = D.ITEM_DEFS[id];
    if (!item?.buy || state.gold < item.buy) return;
    state.gold -= item.buy;
    addItem(id, 1);
    toast(`${item.name}を購入しました。`, 'good');
    saveGame();
    render();
  }

  function sellItem(id) {
    const item = D.ITEM_DEFS[id];
    if (!item || item.type !== 'material' || countItem(id) <= 0) return;
    takeItem(id, 1);
    state.gold += item.sell;
    toast(`${item.name}を${item.sell}Gで売却しました。`);
    saveGame();
    render();
  }

  function restAtInn() {
    const cost = 20;
    if (state.gold < cost) return toast('所持金が足りません。', 'warn');
    state.gold -= cost;
    Object.keys(state.characters).forEach((id) => {
      const stats = getStats(id);
      state.characters[id].hp = stats.maxHp;
      state.characters[id].mp = stats.maxMp;
    });
    appendLog('宿で休み、心身を整えた。');
    toast('3人は休息を取った。HP・MPが全回復。', 'good');
    saveGame();
    render();
  }

  function canUnlockPanel(id, panel) {
    const ch = getChar(id);
    if (ch.unlockedPanels.includes(panel.id)) return false;
    if (panel.prerequisite && !ch.unlockedPanels.includes(panel.prerequisite)) return false;
    if (panel.minLevel && ch.level < panel.minLevel) return false;
    if (panel.storyFlag && !state.flags[panel.storyFlag]) return false;
    return ch.panelPoints >= panel.cost;
  }

  function unlockPanel(id, panelId) {
    const panel = getDef(id).panels.find((p) => p.id === panelId);
    if (!panel || !canUnlockPanel(id, panel)) return;
    const ch = getChar(id);
    ch.panelPoints -= panel.cost;
    ch.unlockedPanels.push(panel.id);
    const before = getStats(id);
    capResources(id);
    const delta = panel.effect?.maxHp || panel.effect?.maxMp ? ' 最大値が上昇した。' : '';
    appendLog(`${getDef(id).short}がパネル「${panel.name}」を解放。`);
    toast(`${getDef(id).short}：${panel.name} を解放！${delta}`, 'good');
    saveGame();
    render();
  }

  function render() {
    const scene = state.scene;
    nav.classList.toggle('hidden', scene === 'title' || scene === 'battle');
    document.querySelectorAll('[data-nav]').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === scene));
    if (scene === 'title') root.innerHTML = renderTitle();
    else if (scene === 'world') root.innerHTML = renderWorld();
    else if (scene === 'location') root.innerHTML = renderLocation();
    else if (scene === 'party') root.innerHTML = renderParty();
    else if (scene === 'panel') root.innerHTML = renderPanel();
    else if (scene === 'quests') root.innerHTML = renderQuestLog();
    else if (scene === 'bag') root.innerHTML = renderBag();
    else if (scene === 'battle') root.innerHTML = renderBattle();
    else root.innerHTML = renderWorld();
    window.requestAnimationFrame(drawVisibleCanvases);
  }

  function renderStatusStrip() {
    const rank = getRank();
    return `<div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px;">
      <div><span class="badge">冒険者 ${rank.name}</span><div style="font-size:11px;color:var(--muted);margin-top:5px;">${rank.description}</div></div>
      <div style="text-align:right;"><strong style="color:var(--gold);font-size:17px;">${state.gold}G</strong><div style="font-size:10px;color:var(--muted);">所持金</div></div>
    </div>`;
  }

  function renderPartyStrip() {
    return `<div class="party-strip">${['rainbow','white','black'].map((id) => {
      const ch = getChar(id); const def = getDef(id); const s = getStats(id);
      return `<button class="party-chip" data-action="open-character" data-id="${id}">
        <canvas class="chip-portrait" data-portrait="${id}" width="48" height="48"></canvas>
        <span><strong>${def.short}</strong><small>Lv.${ch.level}　HP ${ch.hp}/${s.maxHp}</small></span>
      </button>`;
    }).join('')}</div>`;
  }

  function renderTitle() {
    return `<section class="hero">
      <div class="hero-content">
        <div class="hero-eyebrow">PIXEL COMMAND RPG　— PROTOTYPE —</div>
        <h1>全零〈オムニル〉<br><span class="rainbow-text">星なき始まり</span></h1>
        <p>自由も、好きも、嫌いも知らない三人。<br>白、黒、そして虹の名を持つ彼らは、命令ではなく自分の意志で、世界を歩き始める。</p>
        <div class="button-row">
          <button class="primary-button" data-action="start">${state.started ? '旅を続ける' : '物語を始める'}</button>
          ${state.started ? '<button class="secondary-button" data-action="reset-confirm">最初からやり直す</button>' : ''}
        </div>
      </div>
    </section>
    <h2 class="section-title">この試作版で遊べること</h2>
    <div class="grid three">
      <article class="card"><h3>◫ 世界と探索</h3><p>広域マップから町・草原・森・遺構を選択。探索で素材、宝、戦闘イベントが発生する。</p></article>
      <article class="card"><h3>⚔ コマンド戦闘</h3><p>虹全・白零・黒零を順番に操作する、軽量な3人パーティ制ターンバトル。</p></article>
      <article class="card"><h3>◉ 成長パネル</h3><p>レベルで得るポイントを使い、能力値・技・物語に連動する固有パネルを解放する。</p></article>
    </div>
    <p class="note">※人物イラストは後から差し替え可能な専用枠として実装。現在はゲーム内の仮ピクセル肖像を表示しています。</p>`;
  }

  function renderWorld() {
    const next = expToNextRank();
    return `${renderStatusStrip()}${renderPartyStrip()}
      <h1 class="page-title">世界地図</h1>
      <p class="page-subtitle">行き先を選択してください。探索地域は冒険者ランクによって解放されます。</p>
      <div class="map-shell">
        <canvas id="worldCanvas" class="map-canvas" width="800" height="500"></canvas>
        ${Object.values(D.LOCATIONS).map((loc) => {
          const unlocked = rankAllowed(loc.rank);
          return `<button class="map-label location-${loc.type} ${unlocked ? '' : 'locked'}" style="left:${loc.x}%;top:${loc.y}%" data-action="enter-location" data-id="${loc.id}" ${unlocked ? '' : 'disabled'}>${loc.name}<br><small>${unlocked ? (loc.type === 'town' ? '施設を利用' : '探索する') : `要 ${loc.rank}`}</small></button>`;
        }).join('')}
      </div>
      <div class="map-legend"><span>◆ 街・村</span><span>◆ 探索地</span><span>▣ 未解放（ランク条件）</span></div>
      <div class="card" style="margin-top:13px;">
        <strong>次の認定まで</strong>
        <div class="meter-label"><span>${getRank().name}　ギルド経験 ${state.adventureExp}</span><span>${next ? `${next}で次ランク` : '最高ランク'}</span></div>
        <div class="meter exp"><span style="width:${next ? pct(state.adventureExp - getRank().threshold, next - getRank().threshold) : 100}%"></span></div>
      </div>
      <h2 class="section-title">最近の記録</h2>
      <div class="list">${state.logs.slice(0, 4).map((log) => `<div class="list-row"><span class="badge">記録</span><div class="row-main"><div class="meta">${log}</div></div></div>`).join('')}</div>`;
  }

  function renderLocation() {
    const loc = D.LOCATIONS[state.currentLocation];
    if (loc.type === 'town') {
      return `${renderStatusStrip()}<button class="small-button" data-action="go-world">← 世界地図へ</button>
        <h1 class="page-title" style="margin-top:13px;">${loc.name}</h1><p class="page-subtitle">${loc.description}</p>
        <div class="location-hero"><canvas id="locationCanvas" class="location-canvas" data-location="${loc.id}" width="800" height="360"></canvas><div class="location-overlay">
          <button class="facility-hotspot" style="left:23%;top:40%;" data-action="facility" data-id="guild">ギルド</button>
          <button class="facility-hotspot" style="left:48%;top:30%;" data-action="facility" data-id="shop">道具屋</button>
          <button class="facility-hotspot" style="left:72%;top:48%;" data-action="facility" data-id="craft">製造所</button>
          <button class="facility-hotspot" style="left:48%;top:70%;" data-action="facility" data-id="inn">宿屋</button>
          <button class="facility-hotspot" style="left:78%;top:73%;" data-action="facility" data-id="sell">買取所</button>
        </div></div>
        <div class="location-caption"><strong>《枝角亭》のある、草原の宿場町</strong><p>街の施設を選び、依頼の受注、買い物、製造、休息、素材売却を行える。</p></div>
        <h2 class="section-title">施設一覧</h2><div class="facility-grid">${renderFacilityCards()}</div>`;
    }
    return `${renderStatusStrip()}<button class="small-button" data-action="go-world">← 世界地図へ</button>
      <h1 class="page-title" style="margin-top:13px;">${loc.name}</h1><p class="page-subtitle">${loc.description}</p>
      <div class="location-hero"><canvas id="locationCanvas" class="location-canvas" data-location="${loc.id}" width="800" height="360"></canvas></div>
      ${renderPartyStrip()}
      <div class="card" style="margin-top:12px;"><h3>探索準備</h3><p>探索を行うと敵、素材、宝箱、物語の気配などを発見します。HPが0の仲間がいると探索できません。</p>
      <div class="button-row" style="margin-top:12px;"><button class="action-button" data-action="explore" data-id="${loc.id}">探索する</button><button class="secondary-button" data-action="go-world">撤退して世界地図へ</button></div></div>
      <p class="note">危険度：${loc.id === 'fallen_ruins' ? '高' : loc.id === 'whisper_woods' ? '中' : '低'} ／ 冒険者条件：${loc.rank}</p>`;
  }

  function renderFacilityCards() {
    const data = [
      ['guild','⚑','冒険者ギルド','依頼の受注・報告・ランク認定'],
      ['shop','▤','道具屋','回復アイテムを購入'],
      ['craft','⚒','製造所','素材から装備・道具を作る'],
      ['inn','⌂','宿屋','20GでHP・MPを全回復'],
      ['sell','◎','素材買取所','不要な素材を売却'],
    ];
    return data.map(([id, icon, title, desc]) => `<button class="facility-card" data-action="facility" data-id="${id}"><span class="facility-icon">${icon}</span><b>${title}</b><small>${desc}</small></button>`).join('');
  }

  function renderParty() {
    return `${renderStatusStrip()}<h1 class="page-title">仲間</h1><p class="page-subtitle">ステータス画面では、将来差し替えられる人物イラスト枠と、現在の能力・技能・装備を確認できます。</p>
      <section class="party-list">${['rainbow','white','black'].map(renderCharacterCard).join('')}</section>`;
  }

  function renderCharacterCard(id) {
    const def = getDef(id); const ch = getChar(id); const stats = getStats(id); const equipment = state.equipment[id] ? D.EQUIPMENT_DEFS[state.equipment[id]] : null;
    return `<article class="card character-card">
      <canvas class="portrait-large" data-portrait="${id}" width="112" height="156"></canvas>
      <div><h2>${def.name}</h2><div class="subtitle">${def.subtitle}　／　${def.role}</div>
      <div class="meter-label"><span>HP ${ch.hp} / ${stats.maxHp}</span><span>Lv.${ch.level}</span></div><div class="meter"><span style="width:${pct(ch.hp,stats.maxHp)}%"></span></div>
      <div class="meter-label"><span>MP ${ch.mp} / ${stats.maxMp}</span><span>経験値 ${ch.exp}/${levelExpRequired(ch.level)}</span></div><div class="meter mp"><span style="width:${pct(ch.mp,stats.maxMp)}%"></span></div>
      <div class="trait-box"><b>${def.trait.name}</b><br>${def.trait.description}</div>
      <div class="stat-grid">${[['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['幸運',stats.luck],['技能',currentSkills(id).length],['PT',ch.panelPoints]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div>
      <div class="note">装備：${equipment ? equipment.name : 'なし'}　／　技：${currentSkills(id).map((s)=>s.name).join('、')}</div>
      <div class="character-actions" style="margin-top:10px;"><button class="small-button" data-action="open-panel" data-id="${id}">成長パネル</button><button class="small-button" data-action="view-character" data-id="${id}">人物詳細</button></div></div>
    </article>`;
  }

  function renderPanel() {
    const id = state.selectedCharacter;
    const def = getDef(id); const ch = getChar(id); const stats = getStats(id);
    return `${renderStatusStrip()}<button class="small-button" data-action="go-party">← 仲間一覧へ</button>
      <h1 class="page-title" style="margin-top:13px;">${def.name}：成長パネル</h1>
      <p class="page-subtitle">レベルアップで得たパネルポイントを使い、能力と技を解放します。物語に関わるパネルには追加条件があります。</p>
      <div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;"><div><strong>所持パネルポイント</strong><div class="note">Lv.${ch.level}／${def.role}</div></div><strong style="font-size:27px;color:var(--gold);">${ch.panelPoints} PT</strong></div>
      <div class="stat-grid" style="margin-top:12px;">${[['HP',stats.maxHp],['MP',stats.maxMp],['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div></div>
      <h2 class="section-title">${def.short}のパネル</h2><div class="panel-board">${def.panels.map((p) => renderSkillPanel(id,p)).join('')}</div>`;
  }

  function renderSkillPanel(id, panel) {
    const ch = getChar(id);
    const unlocked = ch.unlockedPanels.includes(panel.id);
    const available = canUnlockPanel(id, panel);
    let status = unlocked ? 'unlocked' : available ? 'available' : 'locked';
    let requirement = '';
    if (!unlocked) {
      const lacks = [];
      if (panel.prerequisite && !ch.unlockedPanels.includes(panel.prerequisite)) lacks.push('前提パネル');
      if (panel.minLevel && ch.level < panel.minLevel) lacks.push(`Lv.${panel.minLevel}`);
      if (panel.storyFlag && !state.flags[panel.storyFlag]) lacks.push('物語進行');
      if (ch.panelPoints < panel.cost) lacks.push('PT不足');
      requirement = lacks.length ? `／ ${lacks.join('・')}` : '';
    }
    const icon = panel.category === 'skill' ? '✦' : panel.category === 'trait' ? '◈' : '＋';
    return `<button class="skill-panel ${status}" data-action="unlock-panel" data-id="${id}" data-panel="${panel.id}" ${unlocked || !available ? 'disabled' : ''}>
      <span class="node ${panel.category}">${icon}</span><span><strong>${panel.name}</strong><small>${panel.description}</small></span><span class="cost">${unlocked ? '解放済' : `${panel.cost} PT${requirement}`}</span>
    </button>`;
  }

  function renderQuestLog() {
    const active = state.activeQuests.map((id) => D.QUESTS[id]);
    const complete = state.completedQuests.map((id) => D.QUESTS[id]);
    return `${renderStatusStrip()}<h1 class="page-title">依頼帳</h1><p class="page-subtitle">受注中の依頼は、ギルドで報告すると報酬と冒険者経験値を得られます。</p>
      <h2 class="section-title">受注中</h2>${active.length ? `<div class="list">${active.map((q)=>renderQuestRow(q,'active')).join('')}</div>` : '<div class="empty-state">受注中の依頼はありません。<br>リンドホルムのギルド《枝角亭》で依頼を受けましょう。</div>'}
      <h2 class="section-title">達成済み</h2>${complete.length ? `<div class="list">${complete.map((q)=>renderQuestRow(q,'done')).join('')}</div>` : '<div class="empty-state">まだ達成済みの依頼はありません。</div>'}
      <div class="button-row" style="margin-top:15px;"><button class="secondary-button" data-action="enter-location" data-id="lindholm">ギルドへ向かう</button></div>`;
  }

  function renderQuestRow(q, mode = '') {
    const p = questProgress(q); const done = mode === 'done'; const active = mode === 'active';
    return `<div class="list-row"><span class="badge ${done ? 'done' : active ? 'active' : ''}">${done ? '達成済' : active ? `${p}/${q.amount}` : q.rank}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬：${q.reward.gold}G／冒険者経験 ${q.reward.advExp}</div></div>${active && canCompleteQuest(q) ? '<span class="badge done">報告可能</span>' : ''}</div>`;
  }

  function renderBag() {
    const items = Object.entries(state.inventory).filter(([,qty]) => qty > 0).map(([id, qty]) => ({ ...D.ITEM_DEFS[id], qty }));
    return `${renderStatusStrip()}<h1 class="page-title">荷袋</h1><p class="page-subtitle">道具と素材。回復アイテムは探索外でも使用できます。</p>
      ${items.length ? `<div class="list">${items.map((item) => `<div class="list-row"><span class="badge">${item.type === 'material' ? '素材' : '道具'}</span><div class="row-main"><strong>${item.name} ×${item.qty}</strong><div class="meta">${item.description}</div></div>${item.type === 'consumable' ? `<button class="small-button" data-action="use-item-world" data-id="${item.id}">使う</button>` : `<span class="value">売却 ${item.sell}G</span>`}</div>`).join('')}</div>` : '<div class="empty-state">荷袋は空です。</div>'}
      <h2 class="section-title">自動装備中</h2><div class="list">${Object.keys(state.equipment).map((id)=>{const e=state.equipment[id]?D.EQUIPMENT_DEFS[state.equipment[id]]:null;return `<div class="list-row"><span class="badge">${getDef(id).short}</span><div class="row-main"><strong>${e?e.name:'なし'}</strong><div class="meta">${e?e.description:'製造所で固有装備を作成できます。'}</div></div></div>`}).join('')}</div>`;
  }


  function renderBattleControls(actorId, actor, def) {
    const b = state.battle;
    if (b.phase === 'enemy') return `<div class="empty-state">敵が行動中……</div>`;
    if (!actorId || !actor || actor.hp <= 0) return `<div class="empty-state">行動順を調整中……</div>`;
    if (b.phase === 'command') return `<div style="font-size:12px;margin-bottom:8px;"><b>${def.short} の行動</b>　<span style="color:var(--muted);">${def.role}</span></div><div class="command-row"><button class="command-button" data-action="battle-command" data-command="attack">攻撃</button><button class="command-button" data-action="battle-command" data-command="skills">技</button><button class="command-button" data-action="battle-command" data-command="guard">防御</button><button class="command-button" data-action="battle-command" data-command="items">道具</button></div>`;
    if (b.phase === 'skills') return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使用する技を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${currentSkills(actorId).map((skill)=>`<button class="skill-button" data-action="battle-skill" data-id="${skill.id}" ${actor.mp < skill.mp ? 'disabled':''}><b>${skill.name}</b><small>MP ${skill.mp}</small><span>${skill.description}</span></button>`).join('')}</div>`;
    if (b.phase === 'items') {
      const consumables = Object.values(D.ITEM_DEFS).filter((i)=>i.type==='consumable' && countItem(i.id)>0);
      return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使う道具を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${consumables.length?consumables.map((item)=>`<button class="skill-button" data-action="battle-item" data-id="${item.id}"><b>${item.name} ×${countItem(item.id)}</b><small>道具</small><span>${item.description}</span></button>`).join(''):'<div class="empty-state">使える道具がありません。</div>'}</div>`;
    }
    if (b.phase === 'target-enemy') return `<div><b style="font-size:12px;">対象の敵を選択</b><div class="target-row">${b.enemies.filter(e=>e.hp>0).map((e,i)=>`<button class="target-button" data-action="battle-target-enemy" data-index="${i}">${e.name}<br>HP ${e.hp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`;
    if (b.phase === 'target-ally') return `<div><b style="font-size:12px;">対象の仲間を選択</b><div class="target-row">${['rainbow','white','black'].filter(id=>getChar(id).hp>0).map(id=>`<button class="target-button" data-action="battle-target-ally" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`;
    return '<div class="empty-state">行動を選択してください。</div>';
  }

  function startGame() {
    state.started = true;
    state.scene = 'world';
    saveGame();
    render();
    if (!state.flags.openingSeen) {
      state.flags.openingSeen = true;
      saveGame();
      showDialogue('序章：命令の外側', '薄い霧の向こうに、宿場町リンドホルムの灯りが見えた。\n\n虹全「目的を確認。補給、情報収集、行動範囲の確保。」\n白零「承認。損傷を防止します。」\n黒零「障害があれば排除する。」\n\n三人はまだ、これが“旅の始まり”だと知らない。');
    }
  }

  function enterLocation(id) {
    const loc = D.LOCATIONS[id];
    if (!loc || !rankAllowed(loc.rank)) return toast(`この場所には ${loc.rank}級 以上が必要です。`, 'warn');
    state.currentLocation = id;
    state.scene = 'location';
    saveGame();
    render();
  }

  function explorationAvailable() {
    return Object.keys(state.characters).every((id) => getChar(id).hp > 0);
  }

  function explore(locationId) {
    if (!explorationAvailable()) return toast('戦闘不能の仲間がいます。宿屋で休んでください。', 'warn');
    const loc = D.LOCATIONS[locationId];
    if (!loc?.enemyPool) return;
    const roll = Math.random();
    if (roll < 0.54) {
      let enemies = [choice(loc.enemyPool)];
      if (loc.id === 'windy_plain' && Math.random() < .26) enemies.push(choice(['pale_slime','grass_hare']));
      if (loc.id === 'whisper_woods' && Math.random() < .26) enemies.push(choice(['wind_wolf','whisper_treant']));
      if (loc.id === 'fallen_ruins' && Math.random() < .22) enemies.push('ruin_sentinel');
      if (loc.id === 'whisper_woods' && state.flags.anger !== true && state.adventureExp >= 90 && Math.random() < .12) enemies = ['moss_wolf'];
      startBattle(enemies, loc.id);
      return;
    }
    if (roll < 0.88) {
      const item = choice(loc.materialPool);
      const qty = rng(1, item === 'herb' ? 3 : 2);
      addItem(item, qty);
      appendLog(`${loc.name}で ${D.ITEM_DEFS[item].name} ×${qty} を見つけた。`);
      toast(`${D.ITEM_DEFS[item].name} ×${qty} を発見！`, 'good');
      saveGame(); render();
      return;
    }
    const gold = rng(18, 44);
    state.gold += gold;
    appendLog(`${loc.name}で古い袋を発見。${gold}Gを得た。`);
    toast(`古い袋を発見。${gold}Gを得た！`, 'good');
    saveGame(); render();
  }

  function startBattle(enemyIds, locationId) {
    const enemies = enemyIds.map((id, i) => {
      const d = D.ENEMIES[id];
      return { ...deepCopy(d), uid: `${id}_${Date.now()}_${i}`, hp: d.maxHp, status: {} };
    });
    state.battle = {
      locationId,
      enemies,
      turnIndex: 0,
      order: ['rainbow','white','black'],
      phase: 'command',
      selected: null,
      log: `${enemies.map((e)=>e.name).join('、')} が現れた！`,
    };
    state.scene = 'battle';
    render();
  }

  function battleLog(message) {
    const b = state.battle; if (!b) return;
    b.log += `\n${message}`;
    const entries = b.log.split('\n').slice(-7);
    b.log = entries.join('\n');
  }

  function battleLogLines() {
    return state.battle?.log?.split('\n') || [];
  }

  function renderBattle() {
    const b = state.battle;
    if (!b) { state.scene = 'world'; return renderWorld(); }
    const actorId = b.order[b.turnIndex];
    const actor = actorId ? getChar(actorId) : null;
    const actorDef = actorId ? getDef(actorId) : null;
    const log = battleLogLines();
    return `<section class="battle-shell">
      <div class="battle-stage">
        <div class="enemy-area">${b.enemies.filter((e)=>e.hp>0).map((enemy) => `<div class="battle-enemy"><canvas class="enemy-sprite" data-enemy="${enemy.id}" width="132" height="112"></canvas><div class="enemy-name">${enemy.name}</div><div class="enemy-hp meter"><span style="width:${pct(enemy.hp,enemy.maxHp)}%"></span></div><small style="font-size:9px;">HP ${enemy.hp}/${enemy.maxHp}${enemy.status?.fracture ? '　▽防御低下' : ''}</small></div>`).join('')}</div>
        <div class="party-sprites">${['rainbow','white','black'].map((id)=>{const ch=getChar(id),s=getStats(id);return `<div class="battle-hero"><canvas data-portrait="${id}" width="54" height="54"></canvas><strong>${getDef(id).short}${ch.hp<=0?'（戦闘不能）':''}</strong><div class="meter"><span style="width:${pct(ch.hp,s.maxHp)}%"></span></div><div class="meter mp"><span style="width:${pct(ch.mp,s.maxMp)}%"></span></div></div>`}).join('')}</div>
      </div>
      <div class="battle-log">${log.slice(-3).map((x)=>`<div>› ${x}</div>`).join('')}</div>
      <div class="battle-controls">${renderBattleControls(actorId, actor, actorDef)}</div>
    </section>`;
  }

  function getAliveAllies() { return ['rainbow','white','black'].filter((id)=>getChar(id).hp > 0); }
  function getAliveEnemies() { return state.battle.enemies.filter((e)=>e.hp > 0); }

  function battleCommand(command) {
    const b = state.battle;
    if (!b || b.phase !== 'command') return;
    if (command === 'guard') {
      const actorId = b.order[b.turnIndex];
      getChar(actorId).guard = 1;
      battleLog(`${getDef(actorId).short}は身構えた。`);
      afterPlayerAction();
      return;
    }
    b.phase = command === 'skills' ? 'skills' : command === 'items' ? 'items' : 'target-enemy';
    b.selected = command === 'attack' ? { type: 'attack' } : null;
    render();
  }

  function useBattleSkill(skillId) {
    const b = state.battle; const actorId = b.order[b.turnIndex]; const skill = D.SKILLS[skillId];
    if (!skill || getChar(actorId).mp < skill.mp) return;
    b.selected = { type: 'skill', skillId };
    b.phase = skill.target === 'enemy' ? 'target-enemy' : skill.target === 'ally' ? 'target-ally' : 'auto-skill';
    if (b.phase === 'auto-skill') executeSkill(actorId, skill, null);
    else render();
  }

  function useBattleItem(itemId) {
    const item = D.ITEM_DEFS[itemId];
    if (!item || countItem(itemId) < 1) return;
    state.battle.selected = { type: 'item', itemId };
    state.battle.phase = 'target-ally';
    render();
  }

  function targetEnemy(index) {
    const b = state.battle; const enemy = getAliveEnemies()[Number(index)];
    if (!enemy) return;
    const actorId = b.order[b.turnIndex];
    if (b.selected.type === 'attack') executeAttack(actorId, enemy);
    else if (b.selected.type === 'skill') executeSkill(actorId, D.SKILLS[b.selected.skillId], enemy);
  }

  function targetAlly(id) {
    const b = state.battle; const actorId = b.order[b.turnIndex];
    if (b.selected.type === 'item') executeItem(actorId, b.selected.itemId, id);
    else if (b.selected.type === 'skill') executeSkill(actorId, D.SKILLS[b.selected.skillId], id);
  }

  function effectiveDefenderDef(target, isEnemy = false) {
    let d = isEnemy ? target.def : getStats(target).def;
    if (target.status?.fracture) d = Math.max(0, Math.floor(d * .67));
    return d;
  }

  function dealDamage(attackerId, target, multiplier = 1, kind = 'physical', isEnemyTarget = true, bonusOnDebuff = 0) {
    const attackerStats = getStats(attackerId);
    const offensive = kind === 'magic' ? attackerStats.mag : attackerStats.atk;
    let power = multiplier;
    if (bonusOnDebuff && target.status?.fracture) power += bonusOnDebuff;
    if (attackerId === 'rainbow' && getChar('rainbow').hp <= attackerStats.maxHp * .5) power *= 1.1;
    if (attackerId === 'black' && target.status?.fracture) power *= 1.15;
    const damage = Math.max(1, Math.floor(offensive * power - effectiveDefenderDef(target, isEnemyTarget) * .52 + rng(-3, 4)));
    applyDamage(target, damage, isEnemyTarget);
    return damage;
  }

  function applyDamage(target, damage, isEnemy) {
    if (isEnemy) {
      target.hp = Math.max(0, target.hp - damage);
      return;
    }
    let targetId = target;
    const ch = getChar(targetId);
    const protectedBy = ch.protectedBy;
    if (protectedBy && protectedBy !== targetId && getChar(protectedBy)?.hp > 0) {
      targetId = protectedBy;
      battleLog(`${getDef(protectedBy).short}が攻撃を受け止めた！`);
    }
    const defender = getChar(targetId);
    let final = damage;
    if (defender.guard) final = Math.max(1, Math.floor(final * .5));
    defender.hp = Math.max(0, defender.hp - final);
  }

  function executeAttack(actorId, enemy) {
    const dmg = dealDamage(actorId, enemy, 1, 'physical', true);
    battleLog(`${getDef(actorId).short}の攻撃！ ${enemy.name}に${dmg}ダメージ。`);
    resolveAfterHit();
  }

  function executeSkill(actorId, skill, target) {
    const actor = getChar(actorId);
    if (actor.mp < skill.mp) return;
    actor.mp -= skill.mp;
    if (skill.kind === 'heal') {
      const targets = skill.target === 'allAllies' ? getAliveAllies() : [target];
      targets.forEach((id) => {
        const ch = getChar(id); const amount = Math.floor(getStats(id).maxHp * skill.heal);
        ch.hp = clamp(ch.hp + amount, 0, getStats(id).maxHp);
      });
      battleLog(`${getDef(actorId).short}は ${skill.name} を使った。${skill.target === 'allAllies' ? '仲間全員の傷を癒した。' : `${getDef(target).short}のHPを回復。`}`);
      resolveAfterHit(); return;
    }
    if (skill.kind === 'guard') {
      getChar(target).protectedBy = actorId;
      getChar(target).protectedTurns = 2;
      battleLog(`${getDef(actorId).short}は ${getDef(target).short}に白光の護りを与えた。`);
      resolveAfterHit(); return;
    }
    const dmg = dealDamage(actorId, target, skill.power, skill.kind, true, skill.bonusOnDebuff || 0);
    if (skill.inflict) {
      target.status ||= {};
      target.status[skill.inflict.type] = skill.inflict.turns;
    }
    if (skill.lifeSteal) {
      const heal = Math.max(1, Math.floor(dmg * skill.lifeSteal));
      actor.hp = clamp(actor.hp + heal, 0, getStats(actorId).maxHp);
    }
    battleLog(`${getDef(actorId).short}の ${skill.name}！ ${target.name}に${dmg}ダメージ。`);
    resolveAfterHit();
  }

  function executeItem(actorId, itemId, targetId) {
    const item = D.ITEM_DEFS[itemId];
    if (!takeItem(itemId, 1)) return;
    const target = getChar(targetId);
    if (item.effect.healHp) target.hp = clamp(target.hp + item.effect.healHp, 0, getStats(targetId).maxHp);
    if (item.effect.healMp) target.mp = clamp(target.mp + item.effect.healMp, 0, getStats(targetId).maxMp);
    battleLog(`${getDef(actorId).short}は ${item.name} を使った。${getDef(targetId).short}が回復した。`);
    resolveAfterHit();
  }

  function resolveAfterHit() {
    if (getAliveEnemies().length === 0) return finishBattle(true);
    afterPlayerAction();
  }

  function afterPlayerAction() {
    const b = state.battle;
    b.selected = null;
    b.turnIndex += 1;
    while (b.turnIndex < b.order.length && getChar(b.order[b.turnIndex]).hp <= 0) b.turnIndex += 1;
    if (b.turnIndex >= b.order.length) {
      b.phase = 'enemy';
      render();
      window.setTimeout(enemyPhase, 520);
    } else {
      b.phase = 'command';
      render();
    }
  }

  function enemyPhase() {
    const b = state.battle;
    if (!b) return;
    const enemies = getAliveEnemies();
    for (const enemy of enemies) {
      const targets = getAliveAllies();
      if (!targets.length) return finishBattle(false);
      const targetId = choice(targets);
      const move = choice(enemy.skills);
      const base = Math.max(1, Math.floor(enemy.atk * move.power - effectiveDefenderDef(targetId, false) * .45 + rng(-2, 4)));
      applyDamage(targetId, base, false);
      if (move.effect === 'fracture') {
        getChar(targetId).status ||= {};
        getChar(targetId).status.fracture = 2;
      }
      battleLog(`${enemy.name}の${move.name}！ ${getDef(targetId).short}に${base}ダメージ。`);
      if (!getAliveAllies().length) return finishBattle(false);
    }
    tickBattleStatuses();
    b.turnIndex = 0;
    while (b.turnIndex < b.order.length && getChar(b.order[b.turnIndex]).hp <= 0) b.turnIndex += 1;
    b.phase = 'command';
    render();
  }

  function tickBattleStatuses() {
    state.battle.enemies.forEach((enemy) => {
      if (enemy.status?.fracture) { enemy.status.fracture -= 1; if (enemy.status.fracture <= 0) delete enemy.status.fracture; }
    });
    ['rainbow','white','black'].forEach((id) => {
      const ch = getChar(id);
      if (ch.guard) delete ch.guard;
      if (ch.status?.fracture) { ch.status.fracture -= 1; if (ch.status.fracture <= 0) delete ch.status.fracture; }
      if (ch.protectedTurns) { ch.protectedTurns -= 1; if (ch.protectedTurns <= 0) { delete ch.protectedTurns; delete ch.protectedBy; } }
    });
  }

  function finishBattle(victory) {
    const b = state.battle;
    if (!b) return;
    const loc = D.LOCATIONS[b.locationId];
    if (!victory) {
      state.gold = Math.max(0, state.gold - 15);
      Object.keys(state.characters).forEach((id) => { const ch = getChar(id); ch.hp = Math.max(1, Math.floor(getStats(id).maxHp * .25)); ch.mp = Math.max(0, Math.floor(getStats(id).maxMp * .25)); });
      state.battle = null; state.scene = 'location'; saveGame(); render();
      showDialogue('撤退', `三人は ${loc.name} から撤退した。\n所持金を15G失い、傷ついた状態で戻ってきた。`);
      return;
    }
    const defeated = b.enemies;
    let exp = 0; let gold = 0; const drops = [];
    defeated.forEach((enemy) => {
      exp += enemy.exp; gold += enemy.gold;
      state.kills[enemy.id] = (state.kills[enemy.id] || 0) + 1;
      enemy.drops.forEach((drop) => {
        if (Math.random() <= drop.chance) { const qty = rng(drop.qty[0], drop.qty[1]); addItem(drop.id, qty); drops.push({ id: drop.id, qty }); }
      });
    });
    state.gold += gold;
    const levelUps = [];
    ['rainbow','white','black'].forEach((id) => {
      const levels = addCharacterExp(id, exp);
      if (levels.length) levelUps.push(`${getDef(id).short} Lv.${levels.join('・')}`);
    });
    // 白の器：戦闘後に最も傷ついた仲間を回復。
    const lowest = getAliveAllies().sort((a,b)=>pct(getChar(a).hp,getStats(a).maxHp)-pct(getChar(b).hp,getStats(b).maxHp))[0];
    if (lowest) getChar(lowest).hp = clamp(getChar(lowest).hp + Math.floor(getStats(lowest).maxHp*.05), 0, getStats(lowest).maxHp);
    const first = !state.flags.firstVictory;
    if (first) state.flags.firstVictory = true;
    if (first) state.flags.choice = true;
    state.battle = null;
    state.scene = 'location';
    appendLog(`${defeated.map((e)=>e.name).join('、')}を倒した。経験値${exp}／${gold}G`);
    saveGame(); render();
    const dropText = drops.length ? drops.map((d)=>`${D.ITEM_DEFS[d.id].name}×${d.qty}`).join('、') : 'なし';
    const levelsText = levelUps.length ? `\n\n【レベルアップ】${levelUps.join('／')}\nパネルポイントを得た。` : '';
    const story = first ? '\n\n虹全は倒れた敵を見下ろした。\n「次の命令を待つ必要はない。……俺たちは、俺たちで進む。」\n\n【物語パネル：「選択」が解放条件を満たしました】' : '';
    showDialogue('戦闘勝利', `${defeated.map((e)=>e.name).join('、')}を倒した。\n経験値：${exp}　／　獲得金：${gold}G\n素材：${dropText}${levelsText}${story}`);
  }

  function useItemOutside(itemId) {
    const item = D.ITEM_DEFS[itemId];
    if (!item || countItem(itemId) <= 0) return;
    showModal(`<div class="modal-header"><div><h2>${item.name}を使う</h2><p>${item.description}</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="target-row">${['rainbow','white','black'].map((id)=>`<button class="target-button" data-action="use-item-outside-target" data-item="${itemId}" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}<br>MP ${getChar(id).mp}/${getStats(id).maxMp}</button>`).join('')}</div>`);
  }

  function useItemOutsideTarget(itemId, id) {
    const item = D.ITEM_DEFS[itemId]; if (!item || !takeItem(itemId,1)) return;
    const ch = getChar(id); const stats = getStats(id);
    if (item.effect.healHp) ch.hp = clamp(ch.hp + item.effect.healHp, 0, stats.maxHp);
    if (item.effect.healMp) ch.mp = clamp(ch.mp + item.effect.healMp, 0, stats.maxMp);
    appendLog(`${getDef(id).short}は${item.name}を使った。`);
    closeModal(); saveGame(); render(); toast(`${getDef(id).short}は${item.name}を使った。`, 'good');
  }

  function openFacility(id) {
    if (id === 'guild') return showGuild();
    if (id === 'shop') return showShop();
    if (id === 'craft') return showCraft();
    if (id === 'inn') return showInn();
    if (id === 'sell') return showSell();
  }

  function showGuild() {
    const quests = Object.values(D.QUESTS);
    showModal(`<div class="modal-header"><div><h2>冒険者ギルド《枝角亭》</h2><p>現在の認定：<b>${getRank().name}</b>　／　冒険者経験：${state.adventureExp}</p></div><button class="modal-close" data-action="modal-close">×</button></div>
    <div class="divider"></div><div class="list">${quests.map((q)=>{
      const available=isQuestAvailable(q),active=isQuestActive(q.id),done=isQuestDone(q.id),report=canCompleteQuest(q);
      let action = done ? '<span class="badge done">達成済</span>' : report ? `<button class="small-button" data-action="quest-complete" data-id="${q.id}">報告する</button>` : active ? `<span class="badge active">進行 ${questProgress(q)}/${q.amount}</span>` : available ? `<button class="small-button" data-action="quest-accept" data-id="${q.id}">受注する</button>` : `<span class="badge locked">要 ${q.rank}</span>`;
      return `<div class="list-row"><span class="badge">${q.rank}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬 ${q.reward.gold}G／経験 ${q.reward.advExp}</div></div>${action}</div>`;
    }).join('')}</div><p class="note">依頼の達成報告は、必要な素材を持った状態で行います。</p>`);
  }

  function showShop() {
    const available = ['potion','antidote', ...(rankAllowed('E') ? ['ether'] : [])].map((id)=>D.ITEM_DEFS[id]);
    showModal(`<div class="modal-header"><div><h2>道具屋</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b></p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list">${available.map((item)=>`<div class="list-row"><span class="badge">道具</span><div class="row-main"><strong>${item.name}</strong><div class="meta">${item.description}</div></div><div><div class="value">${item.buy}G</div><button class="small-button" data-action="buy-item" data-id="${item.id}" ${state.gold < item.buy?'disabled':''}>買う</button></div></div>`).join('')}</div>`);
  }

  function showCraft() {
    showModal(`<div class="modal-header"><div><h2>製造所</h2><p>素材を組み合わせ、道具や固有装備を作ります。固有装備は完成時に自動装備します。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list">${Object.values(D.RECIPES).map((r)=>{const complete=state.crafted.includes(r.id);return `<div class="list-row"><span class="badge">製造</span><div class="row-main"><strong>${r.name}${complete?'（完成済）':''}</strong><div class="meta">${r.description}</div><div class="meta">材料：${r.ingredients.map((ing)=>`${D.ITEM_DEFS[ing.id].name} ${countItem(ing.id)}/${ing.qty}`).join('　')}</div></div><button class="small-button" data-action="craft" data-id="${r.id}" ${!canCraft(r)?'disabled':''}>作る</button></div>`}).join('')}</div>`);
  }

  function showInn() {
    showModal(`<div class="modal-header"><div><h2>宿屋《風見鶏》</h2><p>20Gで三人のHPとMPを全回復します。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="card"><p>白零「休息は、次の行動効率を上げるために必要です。」</p><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="rest" ${state.gold<20?'disabled':''}>20Gで泊まる</button></div></div>`);
  }

  function showSell() {
    const materials = Object.values(D.ITEM_DEFS).filter((item)=>item.type==='material' && countItem(item.id)>0);
    showModal(`<div class="modal-header"><div><h2>素材買取所</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b></p></div><button class="modal-close" data-action="modal-close">×</button></div>${materials.length?`<div class="list">${materials.map((item)=>`<div class="list-row"><span class="badge">素材</span><div class="row-main"><strong>${item.name} ×${countItem(item.id)}</strong><div class="meta">${item.description}</div></div><div><div class="value">${item.sell}G</div><button class="small-button" data-action="sell-item" data-id="${item.id}">1つ売る</button></div></div>`).join('')}</div>`:'<div class="empty-state">売却できる素材がありません。</div>'}`);
  }

  function showCharacterDetails(id) {
    const def=getDef(id); const ch=getChar(id); const stats=getStats(id); const equip=state.equipment[id]?D.EQUIPMENT_DEFS[state.equipment[id]]:null;
    showModal(`<div class="modal-header"><div><h2>${def.name}</h2><p>${def.subtitle}</p></div><button class="modal-close" data-action="modal-close">×</button></div><canvas class="portrait-large" style="width:150px;height:200px;display:block;margin:8px auto 14px;" data-portrait="${id}" width="112" height="156"></canvas><p class="dialogue-text">${def.intro}</p><div class="stat-grid">${[['最大HP',stats.maxHp],['最大MP',stats.maxMp],['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['幸運',stats.luck]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div><div class="trait-box"><b>種族特性：${def.trait.name}</b><br>${def.trait.description}</div><p>習得技：${currentSkills(id).map((s)=>`${s.name}（MP ${s.mp}）`).join('、')}<br>装備：${equip?`${equip.name} — ${equip.description}`:'なし'}</p>`);
    window.requestAnimationFrame(drawVisibleCanvases);
  }

  function showDialogue(title, text) {
    showModal(`<div class="modal-header"><div><h2>${title}</h2></div><button class="modal-close" data-action="modal-close">×</button></div><div class="divider"></div><div class="dialogue-speaker">全零〈オムニル〉</div><p class="dialogue-text">${text}</p><div class="modal-footer"><button class="primary-button" data-action="modal-close">閉じる</button></div>`);
  }

  function showModal(html, onClose = null) {
    modalCloseCallback = onClose;
    modalLayer.innerHTML = `<div class="modal">${html}</div>`;
    modalLayer.classList.add('open'); modalLayer.setAttribute('aria-hidden','false');
    window.requestAnimationFrame(drawVisibleCanvases);
  }

  function closeModal() {
    modalLayer.classList.remove('open'); modalLayer.setAttribute('aria-hidden','true'); modalLayer.innerHTML = '';
    const callback = modalCloseCallback; modalCloseCallback = null; if (callback) callback();
  }

  function resetGame() {
    state = freshState(); saveGame(); closeModal(); render(); toast('セーブデータを初期化しました。');
  }

  function showSystemMenu() {
    showModal(`<div class="modal-header"><div><h2>メニュー</h2><p>この試作版はブラウザの保存領域に自動セーブします。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list"><button class="list-row" data-action="save"><span class="badge">保存</span><span class="row-main"><strong>今すぐセーブ</strong><span class="meta">現在の進行をブラウザに保存する。</span></span></button><button class="list-row" data-action="reset-confirm"><span class="badge locked">初期化</span><span class="row-main"><strong>最初からやり直す</strong><span class="meta">セーブデータを初期状態に戻す。</span></span></button></div>`);
  }

  function confirmReset() {
    showModal(`<div class="modal-header"><div><h2>最初からやり直す</h2><p>現在のレベル、素材、依頼、装備はすべて消えます。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-footer"><button class="secondary-button" data-action="modal-close">やめる</button><button class="danger-button" data-action="reset">セーブを消して最初から</button></div>`);
  }

  function drawVisibleCanvases() {
    document.querySelectorAll('canvas[data-portrait]').forEach((canvas) => drawPortrait(canvas, canvas.dataset.portrait));
    document.querySelectorAll('canvas[data-enemy]').forEach((canvas) => drawEnemy(canvas, canvas.dataset.enemy));
    const world = document.getElementById('worldCanvas'); if (world) drawWorldMap(world);
    const loc = document.getElementById('locationCanvas'); if (loc) drawLocationMap(loc, loc.dataset.location);
  }

  function pixel(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

  function drawPortrait(canvas, id) {
    const ctx = canvas.getContext('2d'); const w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
    pixel(ctx,0,0,w,h,'#11192a');
    for(let y=0;y<h;y+=8) for(let x=0;x<w;x+=8) if((x+y)%16===0) pixel(ctx,x,y,8,8,'#18233a');
    const s = Math.max(1, Math.floor(w/56)); const ox=Math.floor((w-56*s)/2); const oy=Math.floor((h-76*s)/2);
    const p=(x,y,ww,hh,c)=>pixel(ctx,ox+x*s,oy+y*s,ww*s,hh*s,c);
    // body
    p(20,43,16,23,'#29334a'); p(16,57,24,15,'#222a3d'); p(15,70,26,5,'#101521');
    // face
    p(20,18,16,20,'#f2cda9'); p(23,16,10,3,'#f7d9bc');
    if(id==='white') {
      p(15,9,9,24,'#ecf4ff');p(24,6,13,12,'#f8fbff');p(34,10,8,24,'#dbe9ff');p(17,31,6,13,'#e4efff');p(34,30,8,15,'#cbdcf5');
      p(22,25,4,3,'#1f2d4a');p(31,25,4,3,'#0a101e'); p(21,24,1,1,'#82e8ff'); p(34,24,1,1,'#ed88ff');
      p(18,45,20,4,'#eff7ff'); p(20,49,16,8,'#dbe7ff'); p(19,58,18,3,'#c8d9ee');
    } else if(id==='black') {
      p(15,9,9,26,'#171929');p(23,6,13,12,'#29223b');p(34,9,8,27,'#10111d');p(17,32,6,15,'#22223b');p(34,31,8,15,'#0a0c16');
      p(22,25,4,3,'#f3f3ff');p(31,25,4,3,'#4e5df0');p(22,24,1,1,'#ff79de');p(34,24,1,1,'#7cecff');
      p(18,45,20,4,'#181b2a'); p(20,49,16,8,'#272239'); p(19,58,18,3,'#53406e');
    } else {
      p(14,9,10,24,'#f0f6ff');p(24,6,8,12,'#222335');p(32,7,10,26,'#14151f');p(16,31,8,14,'#dceaff');p(34,31,7,15,'#171827');
      p(22,25,4,3,'#0b1020');p(31,25,4,3,'#eff5ff');p(22,24,1,1,'#ff8ecf');p(24,24,1,1,'#83e9ff');p(32,24,1,1,'#ffe77b');p(34,24,1,1,'#8ca9ff');
      p(18,45,20,4,'#e7f2ff');p(20,49,16,8,'#202638');p(19,58,18,3,'#9e94bb'); p(18,62,4,3,'#fb7777');p(22,62,4,3,'#ffda73');p(26,62,4,3,'#7ee8b2');p(30,62,4,3,'#75bdfd');p(34,62,3,3,'#d38df5');
    }
    // outline and tiny glow
    p(23,34,10,2,'#c37d9b'); p(24,36,8,1,'#d98b9d');
  }

  function drawEnemy(canvas, id) {
    const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    const p=(x,y,ww,hh,c)=>pixel(ctx,x,y,ww,hh,c);
    if(id==='pale_slime') { p(29,58,72,28,'#9fdcff');p(39,43,52,18,'#bcecff');p(48,34,34,12,'#d9f7ff');p(43,61,6,6,'#18233b');p(79,61,6,6,'#18233b');p(60,72,10,4,'#5d8fb8');p(34,87,59,4,'#6fb2dd'); }
    else if(id==='grass_hare') { p(43,46,45,38,'#d8c197');p(53,24,11,28,'#e7d3aa');p(69,20,12,32,'#d6bd92');p(44,48,7,8,'#f7edd2');p(76,48,7,8,'#f7edd2');p(46,51,3,3,'#233147');p(78,51,3,3,'#233147');p(54,84,12,6,'#9d7b55');p(74,84,12,6,'#9d7b55'); }
    else if(id==='wind_wolf'||id==='bosswolf') { const boss=id==='bosswolf'; const c=boss?'#607e4d':'#8ba1a7';p(31,52,73,32,c);p(45,37,42,25,boss?'#7f9e59':'#a9bec0');p(42,28,13,19,c);p(76,27,13,19,c);p(38,51,7,6,'#17212c');p(80,51,7,6,'#17212c');p(55,61,18,5,'#262018');p(35,83,13,10,'#526b44');p(85,83,13,10,'#526b44');if(boss){p(33,39,10,7,'#96b969');p(90,44,12,7,'#96b969');p(55,32,20,5,'#b2d479');p(58,55,5,4,'#ffdc72');p(70,55,5,4,'#ffdc72');} }
    else if(id==='whisper_treant') { p(46,28,37,18,'#5e583e');p(40,42,48,44,'#705f42');p(34,58,14,11,'#7a774e');p(82,58,14,11,'#7a774e');p(53,49,7,7,'#b4f08b');p(71,49,7,7,'#b4f08b');p(55,69,18,5,'#2b251c');p(31,22,17,15,'#456f4d');p(80,18,17,20,'#41674b');p(56,12,17,20,'#528152'); }
    else { p(43,28,46,58,'#7e879b');p(50,20,30,11,'#a6afc5');p(51,40,8,8,'#303a52');p(73,40,8,8,'#303a52');p(55,64,23,8,'#4a5165');p(32,67,12,22,'#677189');p(88,67,12,22,'#677189');p(51,76,29,15,'#566076');p(58,31,15,4,'#e6d881'); }
  }

  function drawWorldMap(canvas) {
    const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    pixel(ctx,0,0,w,h,'#2f5e87');
    for(let y=0;y<h;y+=12) for(let x=0;x<w;x+=12) { if((x*3+y*5)%31<8) pixel(ctx,x,y,8,3,'#4c7eaa'); }
    // landmasses
    ctx.fillStyle='#6d9b66';ctx.beginPath();ctx.moveTo(52,359);ctx.lineTo(125,228);ctx.lineTo(263,168);ctx.lineTo(398,197);ctx.lineTo(480,117);ctx.lineTo(676,91);ctx.lineTo(746,183);ctx.lineTo(716,321);ctx.lineTo(610,391);ctx.lineTo(457,374);ctx.lineTo(351,429);ctx.lineTo(166,410);ctx.closePath();ctx.fill();
    ctx.fillStyle='#83b56f';ctx.beginPath();ctx.moveTo(175,258);ctx.lineTo(311,206);ctx.lineTo(420,226);ctx.lineTo(389,346);ctx.lineTo(260,365);ctx.closePath();ctx.fill();
    // sand coast
    ctx.strokeStyle='#d7cd8f';ctx.lineWidth=8;ctx.stroke();
    // mountains
    for(let i=0;i<15;i++){const x=490+i*13,y=145+(i%3)*10;pixel(ctx,x,y,18,10,'#4d5965');pixel(ctx,x+5,y-8,9,8,'#73808a');}
    // forests
    for(let i=0;i<30;i++){const x=390+(i%6)*22+(i%2)*5,y=225+Math.floor(i/6)*20;pixel(ctx,x,y,14,20,'#285d47');pixel(ctx,x+3,y-8,8,10,'#347757');}
    // roads
    ctx.strokeStyle='#c4b27b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(190,355);ctx.quadraticCurveTo(300,315,355,300);ctx.quadraticCurveTo(470,264,560,180);ctx.stroke();
    // tiny map accents
    pixel(ctx,145,355,34,15,'#c5ba91');pixel(ctx,151,348,8,9,'#874f47');pixel(ctx,161,346,7,11,'#7f4d43');
    pixel(ctx,610,125,28,9,'#8f9298');pixel(ctx,618,113,10,13,'#c4c8d1');
    pixel(ctx,242,305,6,6,'#ffef97'); pixel(ctx,550,215,5,5,'#d9b3ff');
  }

  function drawLocationMap(canvas, id) {
    const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    if(id==='lindholm') {
      pixel(ctx,0,0,w,h,'#75a6cf');pixel(ctx,0,180,w,180,'#72aa67');
      for(let x=0;x<w;x+=22){pixel(ctx,x,238,15,6,'#a8c777');}
      ctx.fillStyle='#b8a373';ctx.fillRect(0,250,w,55);ctx.fillStyle='#96744e';ctx.fillRect(0,295,w,12);
      const building=(x,y,ww,hh,roof,wall)=>{pixel(ctx,x,y,ww,hh,wall);pixel(ctx,x-7,y-13,ww+14,14,roof);pixel(ctx,x+ww/2-5,y+hh-17,10,17,'#5e4430');pixel(ctx,x+8,y+11,8,8,'#dff0ff');};
      building(102,124,116,85,'#773f42','#d5bd96');building(340,84,114,104,'#51405f','#b7b0be');building(550,143,135,79,'#7b4b32','#cda477');building(354,235,100,73,'#345368','#c7d4c0');building(614,250,103,67,'#534f47','#9fa29a');
      for(let i=0;i<14;i++){const x=30+i*56;pixel(ctx,x,171,11,35,'#604d36');pixel(ctx,x-8,153,28,22,'#3e704a');}
      pixel(ctx,176,112,22,9,'#f5dc75');pixel(ctx,385,68,22,9,'#b7e4ff');pixel(ctx,599,130,22,9,'#ffd18a');
    } else {
      const isForest=id==='whisper_woods',isRuin=id==='fallen_ruins';
      pixel(ctx,0,0,w,h,isRuin?'#3b4d68':isForest?'#5b8a6e':'#83b6de');pixel(ctx,0,160,w,200,isRuin?'#617284':isForest?'#466e4c':'#83b66e');
      for(let i=0;i<80;i++){const x=(i*67)%w,y=180+(i*29)%150;pixel(ctx,x,y,10,5,isRuin?'#7c8a91':isForest?'#2e5d3f':'#a7cc77');}
      if(isForest){for(let i=0;i<24;i++){const x=(i*91)%w;const y=100+(i*47)%150;pixel(ctx,x,y,13,80,'#3d4d31');pixel(ctx,x-20,y-35,54,40,'#2c573c');pixel(ctx,x-9,y-54,32,27,'#39754c');}}
      else if(isRuin){for(let i=0;i<22;i++){const x=(i*109)%w;const y=124+(i*53)%160;pixel(ctx,x,y,30,50,'#737b88');pixel(ctx,x-8,y-9,45,12,'#a1a7ad');}pixel(ctx,510,78,95,148,'#a8abb7');pixel(ctx,535,55,45,182,'#798293');pixel(ctx,548,85,19,44,'#e0d488');}
      else {for(let i=0;i<35;i++){const x=(i*83)%w;const y=170+(i*31)%140;pixel(ctx,x,y,6,20,'#4d8053');pixel(ctx,x-7,y-10,19,13,'#8cb75a');}ctx.strokeStyle='#d9c77c';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,286);ctx.quadraticCurveTo(320,230,800,280);ctx.stroke();}
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const a = target.dataset.action; const id=target.dataset.id;
    if (a === 'start') startGame();
    else if (a === 'go-world') { state.scene='world'; saveGame(); render(); }
    else if (a === 'go-party') { state.scene='party'; render(); }
    else if (a === 'enter-location') enterLocation(id);
    else if (a === 'explore') explore(id);
    else if (a === 'facility') openFacility(id);
    else if (a === 'open-panel') { state.selectedCharacter=id; state.scene='panel'; render(); }
    else if (a === 'open-character') { state.selectedCharacter=id; state.scene='party'; render(); }
    else if (a === 'view-character') showCharacterDetails(id);
    else if (a === 'unlock-panel') unlockPanel(id,target.dataset.panel);
    else if (a === 'quest-accept') { closeModal(); acceptQuest(id); }
    else if (a === 'quest-complete') { closeModal(); completeQuest(id); }
    else if (a === 'buy-item') { buyItem(id); if(modalLayer.classList.contains('open')) showShop(); }
    else if (a === 'craft') { craft(id); if(modalLayer.classList.contains('open')) showCraft(); }
    else if (a === 'sell-item') { sellItem(id); if(modalLayer.classList.contains('open')) showSell(); }
    else if (a === 'rest') { closeModal(); restAtInn(); }
    else if (a === 'use-item-world') useItemOutside(id);
    else if (a === 'use-item-outside-target') useItemOutsideTarget(target.dataset.item,id);
    else if (a === 'battle-command') battleCommand(target.dataset.command);
    else if (a === 'battle-skill') useBattleSkill(id);
    else if (a === 'battle-item') useBattleItem(id);
    else if (a === 'battle-target-enemy') targetEnemy(target.dataset.index);
    else if (a === 'battle-target-ally') targetAlly(id);
    else if (a === 'battle-back') { if(state.battle){state.battle.phase='command';state.battle.selected=null;render();} }
    else if (a === 'modal-close') closeModal();
    else if (a === 'save') { saveGame(true); closeModal(); }
    else if (a === 'reset-confirm') confirmReset();
    else if (a === 'reset') resetGame();
  });

  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => {
    const page=button.dataset.nav; state.scene=page; render();
  }));
  document.getElementById('saveButton').addEventListener('click', ()=>saveGame(true));
  document.getElementById('menuButton').addEventListener('click', showSystemMenu);
  document.getElementById('homeButton').addEventListener('click', ()=>{state.scene='title';render();});
  modalLayer.addEventListener('click', (event) => { if(event.target === modalLayer) closeModal(); });

  render();
})();
