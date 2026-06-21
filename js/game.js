/* 全零〈オムニル〉— 星なき始まり — prototype v0.4 */
(() => {
  'use strict';

  const D = window.OMNIL_DATA;
  const SAVE_KEY = 'omnil_rpg_prototype_v04';
  const STAMINA_RECOVERY_MS = 3 * 60 * 1000;
  let autoExploreTimer = null;
  const audio = window.OMNIL_AUDIO || { resume() {}, configure() {}, setTheme() {}, sfx() {}, stopAll() {} };
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
        skillMastery: {},
        hp: def.base.maxHp,
        mp: def.base.maxMp,
      };
    });
    return {
      version: 4,
      started: false,
      scene: 'title',
      currentLocation: 'lindholm',
      selectedCharacter: 'rainbow',
      gold: 120,
      adventureExp: 0,
      stamina: { current: 60, updatedAt: Date.now() },
      inventory: { potion: 2, ether: 1, herb: 1, stamina_tonic: 1 },
      equipment: { rainbow: null, white: null, black: null },
      crafted: [], activeQuests: [], completedQuests: [], questCompletions: {}, kills: {},
      panelUi: { selected: { rainbow: null, white: null, black: null }, branch: { rainbow: 'overview', white: 'overview', black: 'overview' } },
      flags: {},
      audio: { music: true, sfx: true, volume: .52 },
      automation: { battleAutoDefault: false },
      autoExplore: null,
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
    merged.audio = { ...base.audio, ...(candidate.audio || {}) };
    merged.automation = { ...base.automation, ...(candidate.automation || {}) };
    merged.flags = { ...base.flags, ...(candidate.flags || {}) };
    merged.questCompletions = { ...(candidate.questCompletions || {}) };
    merged.stamina = { ...base.stamina, ...(candidate.stamina || {}) };
    merged.panelUi = { ...base.panelUi, ...(candidate.panelUi || {}), selected: { ...base.panelUi.selected, ...(candidate.panelUi?.selected || {}) }, branch: { ...base.panelUi.branch, ...(candidate.panelUi?.branch || {}) } };
    merged.characters = { ...base.characters, ...(candidate.characters || {}) };
    Object.keys(base.characters).forEach((id) => {
      const old = candidate.characters?.[id] || {};
      merged.characters[id] = { ...base.characters[id], ...old, skillMastery: { ...(old.skillMastery || {}) } };
      const validPanels = new Set(D.CHARACTER_DEFS[id].panels.map((panel) => panel.id));
      const oldPanels = (old.unlockedPanels || []).filter((panelId) => validPanels.has(panelId));
      merged.characters[id].unlockedPanels = [...new Set([...base.characters[id].unlockedPanels, ...oldPanels])];
      capResources(id, merged);
    });
    merged.version = 4;
    merged.stamina.current = clamp(Number(merged.stamina.current) || base.stamina.current, 0, 100);
    merged.stamina.updatedAt = Number(merged.stamina.updatedAt) || Date.now();
    merged.scene = 'title';
    merged.battle = null;
    merged.autoExplore = null;
    return merged;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('omnil_rpg_prototype_v03') || localStorage.getItem('omnil_rpg_prototype_v01');
      return raw ? normalizeState(JSON.parse(raw)) : freshState();
    } catch (error) {
      console.warn('セーブ読み込み失敗', error);
      return freshState();
    }
  }

  let state = loadState();

  function desiredAudioTheme() {
    if (state.scene === 'title') return 'title';
    if (state.scene === 'battle') return 'battle';
    const locationId = state.currentLocation;
    if (locationId === 'lindholm') return 'town';
    if (locationId === 'windy_plain') return 'plain';
    if (locationId === 'whisper_woods') return 'forest';
    if (locationId === 'fallen_ruins') return 'ruins';
    return 'world';
  }

  function syncAudioTheme() {
    audio.configure(state.audio);
    audio.setTheme(desiredAudioTheme());
    updateAudioButton();
  }

  function updateAudioButton() {
    const button = document.getElementById('audioButton');
    if (!button) return;
    const enabled = !!state.audio?.music;
    button.classList.toggle('is-on', enabled);
    button.classList.toggle('is-off', !enabled);
    button.textContent = enabled ? '♫' : '♩';
    button.title = enabled ? '音楽をオフにする' : '音楽をオンにする';
    button.setAttribute('aria-label', button.title);
  }

  function toggleAudio() {
    state.audio.music = !state.audio.music;
    if (state.audio.music) audio.resume();
    audio.configure(state.audio);
    audio.setTheme(desiredAudioTheme());
    updateAudioButton();
    saveGame();
    toast(state.audio.music ? '音楽をオンにしました。' : '音楽をオフにしました。');
  }


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
    D.RANKS.forEach((level, i) => { if (exp >= level.threshold) index = i; });
    return index;
  }

  // 内部名は既存セーブ互換のため rank を残すが、ゲーム上の表記はすべて「冒険者レベル」。
  function getRank() { return D.RANKS[getRankIndexByExp()]; }
  function rankAllowed(required) {
    const requiredIndex = D.RANKS.findIndex((r) => String(r.id) === String(required));
    return requiredIndex >= 0 && getRankIndexByExp() >= requiredIndex;
  }
  function expToNextRank() {
    const next = D.RANKS[getRankIndexByExp() + 1];
    return next ? next.threshold : null;
  }
  function getStaminaMax() { return getRank().maxStamina || 60; }
  function refreshStamina() {
    state.stamina ||= { current: getStaminaMax(), updatedAt: Date.now() };
    const max = getStaminaMax();
    const now = Date.now();
    const elapsed = Math.max(0, now - (Number(state.stamina.updatedAt) || now));
    const gained = Math.floor(elapsed / STAMINA_RECOVERY_MS);
    if (gained > 0 && state.stamina.current < max) {
      state.stamina.current = Math.min(max, state.stamina.current + gained);
      state.stamina.updatedAt = (Number(state.stamina.updatedAt) || now) + gained * STAMINA_RECOVERY_MS;
    }
    if (state.stamina.current >= max) {
      state.stamina.current = max;
      state.stamina.updatedAt = now;
    }
    return gained;
  }
  function staminaRecoveryLabel() {
    refreshStamina();
    if (state.stamina.current >= getStaminaMax()) return '満タン';
    const remain = STAMINA_RECOVERY_MS - ((Date.now() - state.stamina.updatedAt) % STAMINA_RECOVERY_MS);
    return `次回 ${Math.max(1, Math.ceil(remain / 60000))}分後`;
  }
  function canSpendStamina(amount, floor = 0, protectFromZero = false) {
    refreshStamina();
    // オート探索では、下限0を選んだ場合でも『0＝力尽きる』を避けるため最低1は残す。
    const requiredRemaining = protectFromZero ? Math.max(1, Number(floor) || 0) : Math.max(0, Number(floor) || 0);
    return state.stamina.current - amount >= requiredRemaining;
  }
  function spendStamina(amount, reason, options = {}) {
    refreshStamina();
    state.stamina.current = Math.max(0, state.stamina.current - amount);
    state.stamina.updatedAt = Date.now();
    appendLog(`${reason}：スタミナ -${amount}`);
    if (state.stamina.current <= 0) {
      applyDefeatPenalty('力尽きた', `スタミナが尽きた。${reason}の途中で三人は動けなくなり、撤退した。`, options.locationId || state.currentLocation, !!options.fromAuto);
      return false;
    }
    return true;
  }
  function restoreStamina(amount, note = 'スタミナが回復した。') {
    refreshStamina();
    const before = state.stamina.current;
    state.stamina.current = clamp(state.stamina.current + amount, 0, getStaminaMax());
    state.stamina.updatedAt = Date.now();
    const restored = state.stamina.current - before;
    if (restored > 0) appendLog(`${note}（+${restored}）`);
    return restored;
  }

  function getDef(id) { return D.CHARACTER_DEFS[id]; }
  function getChar(id) { return state.characters[id]; }

  function panelEffects(id) {
    return panelEffectsForState(id, state);
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

  function capResources(id, localState = state) {
    const ch = localState.characters[id]; const stats = getStats(id, localState);
    ch.hp = clamp(ch.hp, 0, stats.maxHp); ch.mp = clamp(ch.mp, 0, stats.maxMp);
  }

  function currentSkills(id) {
    const def = getDef(id); const ch = getChar(id);
    const unlocked = def.panels.filter((p) => ch.unlockedPanels.includes(p.id) && p.skill).map((p) => p.skill);
    return [...new Set([...def.starterSkills, ...unlocked])].map((skillId) => D.SKILLS[skillId]).filter(Boolean);
  }

  function unlockedPassives(id) {
    const def = getDef(id); const ch = getChar(id);
    const base = def.traits || [];
    const panel = def.panels.filter((p) => ch.unlockedPanels.includes(p.id) && p.passive).map((p) => D.PASSIVES[p.passive]).filter(Boolean);
    return [...base, ...panel];
  }

  function hasPassive(id, effect) { return unlockedPassives(id).some((p) => p.effect === effect); }

  function masteryState(id, skillId) {
    const ch = getChar(id); ch.skillMastery ||= {};
    if (!ch.skillMastery[skillId]) ch.skillMastery[skillId] = { level: 1, exp: 0 };
    return ch.skillMastery[skillId];
  }
  function masteryRequired(level) { return 3 + Math.floor(level * level * 2.7); }
  function skillMasteryLevel(id, skillId) { return masteryState(id, skillId).level; }
  function skillMasteryLabel(id, skillId) {
    const m = masteryState(id, skillId);
    return m.level >= 10 ? '熟練Lv.10 MAX' : `熟練Lv.${m.level}　${m.exp}/${masteryRequired(m.level)}`;
  }
  function gainMastery(id, skill) {
    const m = masteryState(id, skill.id); let gain = 1 + (hasPassive(id,'mastery_plus') ? 1 : 0);
    if (m.level >= 10) return false;
    m.exp += gain; let raised = false;
    while (m.level < 10 && m.exp >= masteryRequired(m.level)) { m.exp -= masteryRequired(m.level); m.level += 1; raised = true; }
    if (raised) { toast(`${getDef(id).short}：${skill.name} の習熟度が Lv.${m.level} に上昇！`, 'good'); audio.sfx('unlock'); }
    return raised;
  }
  function masteryScale(id, skill) {
    const level = skillMasteryLevel(id, skill.id);
    return { level, potency: 1 + (level - 1) * (skill.mastery?.powerRate || .1), durationBonus: level >= 6 ? 1 : 0, max: level >= 10 };
  }

  function levelExpRequired(level) { return 44 + (level - 1) * 34; }

  function addCharacterExp(id, amount) {
    const ch = getChar(id); ch.exp += amount; const levels = [];
    while (ch.exp >= levelExpRequired(ch.level)) {
      ch.exp -= levelExpRequired(ch.level); ch.level += 1; ch.panelPoints += 3;
      const stats = getStats(id); ch.hp = stats.maxHp; ch.mp = stats.maxMp; levels.push(ch.level);
    }
    return levels;
  }

  function addAdventureExp(amount) {
    const before = getRank();
    const beforeMax = getStaminaMax();
    state.adventureExp += amount;
    const after = getRank();
    const afterMax = getStaminaMax();
    if (after.id !== before.id) {
      state.stamina.current = clamp((state.stamina.current || 0) + (afterMax - beforeMax), 0, afterMax);
      state.stamina.updatedAt = Date.now();
      toast(`冒険者レベルが ${after.name} に上がった！ スタミナ上限 +${afterMax - beforeMax}`, 'good');
      appendLog(`冒険者レベルが ${after.name} になった。スタミナ上限は ${afterMax}。`);
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
  function isQuestAvailable(q) { return state.adventureExp >= q.unlockAt && rankAllowed(q.rank); }
  function isQuestActive(id) { return state.activeQuests.includes(id); }
  function isQuestDone(id) { const q = D.QUESTS[id]; return !!q && !q.repeatable && state.completedQuests.includes(id); }
  function questCompletionCount(id) { return state.questCompletions?.[id] || (state.completedQuests.includes(id) ? 1 : 0); }
  function canCompleteQuest(q) { return isQuestActive(q.id) && questProgress(q) >= q.amount; }

  function acceptQuest(id) {
    const q = D.QUESTS[id];
    if (!q || !isQuestAvailable(q) || isQuestActive(id) || (!q.repeatable && isQuestDone(id))) return;
    state.activeQuests.push(id);
    appendLog(`依頼を受注：「${q.name}」`);
    toast(`依頼を受注しました：${q.name}`, 'good');
    saveGame(); render();
  }

  function completeQuest(id) {
    const q = D.QUESTS[id];
    if (!q || !canCompleteQuest(q)) return;
    if (q.type === 'collect') takeItem(q.target, q.amount);
    state.activeQuests = state.activeQuests.filter((x) => x !== id);
    state.questCompletions ||= {};
    state.questCompletions[id] = (state.questCompletions[id] || 0) + 1;
    if (!q.repeatable) state.completedQuests.push(id);
    state.gold += q.reward.gold;
    addAdventureExp(q.reward.advExp);
    q.reward.items?.forEach((item) => addItem(item.id, item.qty));
    if (id === 'q_herb') state.flags.protect = true;
    if (id === 'q_boss') state.flags.anger = true;
    appendLog(`依頼達成：「${q.name}」 報酬 ${q.reward.gold}G`);
    saveGame(); render();
    const extra = id === 'q_herb'
      ? `\n\n治療師は、薬草を抱えて何度も頭を下げた。\n白零「……よかった。間に合ったんですね。」\n虹全「うん。白零が見つけてくれたからだ。」\n白零「私が……役に立てた？」\n虹全「もちろん。」\n\n【物語パネル：「守りたい」が解放条件を満たしました】`
      : id === 'q_boss'
        ? `\n\n黒零は、獣王が去った森をしばらく見ていた。\n黒零「……静かになった。」\n虹全「もう、怯えなくていい。」\n黒零「うん。この森は、壊させない。」\n\n【物語パネル：「壊したくない」が解放条件を満たしました】`
        : q.repeatable ? `\n\nこの依頼は繰り返し受注できます。今回の達成回数：${questCompletionCount(id)}回` : '';
    showDialogue('依頼達成', `《枝角亭》の受付は、静かに報酬を差し出した。\n「助かったよ。次も頼りにしている。」${extra}`);
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
    state.stamina.current = getStaminaMax();
    state.stamina.updatedAt = Date.now();
    appendLog('宿で休み、心身とスタミナを整えた。');
    toast('3人は休息を取った。HP・MP・スタミナが全回復。', 'good');
    saveGame(); render();
  }

  function canUnlockPanel(id, panel) {
    const ch = getChar(id);
    if (ch.unlockedPanels.includes(panel.id)) return false;
    if (panel.prerequisite && !ch.unlockedPanels.includes(panel.prerequisite)) return false;
    if (panel.requiresAll && !panel.requiresAll.every((need) => ch.unlockedPanels.includes(need))) return false;
    if (panel.minLevel && ch.level < panel.minLevel) return false;
    if (panel.storyFlag && !state.flags[panel.storyFlag]) return false;
    return ch.panelPoints >= panel.cost;
  }

  function unlockPanel(id, panelId) {
    const panel = getDef(id).panels.find((p) => p.id === panelId); const ch = getChar(id);
    if (!panel || !canUnlockPanel(id, panel)) return;
    ch.panelPoints -= panel.cost; ch.unlockedPanels.push(panel.id); capResources(id);
    const delta = panel.effect?.maxHp || panel.effect?.maxMp ? ' 最大値が上昇した。' : '';
    appendLog(`${getDef(id).short}がパネル「${panel.name}」を解放。`);
    audio.sfx('unlock'); toast(`${getDef(id).short}：${panel.name} を解放！${delta}`, 'good'); saveGame(); render();
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
    syncAudioTheme();
  }

  function renderStatusStrip() {
    refreshStamina();
    const rank = getRank(); const max = getStaminaMax();
    return `<div class="status-strip-v4 card">
      <div class="status-level"><span class="badge">冒険者 ${rank.name}</span><div class="status-description">${rank.description}</div></div>
      <div class="status-stamina"><div class="meter-label"><span>スタミナ ${state.stamina.current}/${max}</span><span>${staminaRecoveryLabel()}</span></div><div class="meter stamina"><span style="width:${pct(state.stamina.current,max)}%"></span></div></div>
      <div class="status-gold"><strong>${state.gold}G</strong><span>所持金</span></div>
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
        <div class="hero-eyebrow">PIXEL FANTASY RPG　— PROTOTYPE v0.4 —</div>
        <h1>全零〈オムニル〉<br><span class="rainbow-text">星なき始まり</span></h1>
        <p>何も持たなかった三人が、出会いと旅の中で自分の意志を見つけていく。<br>白、黒、そして虹。零から始まる、三人の物語。</p>
        <div class="button-row">
          <button class="primary-button" data-action="start">${state.started ? '旅を続ける' : '物語を始める'}</button>
          ${state.started ? '<button class="secondary-button" data-action="reset-confirm">最初からやり直す</button>' : ''}
        </div>
      </div>
    </section>
    <h2 class="section-title">v0.4で遊べること</h2>
    <div class="grid three">
      <article class="card"><h3>◫ 世界と探索</h3><p>広域マップから町・草原・森・遺構を選択。探索で素材、宝、戦闘イベントが発生する。</p></article>
      <article class="card"><h3>⚔ コマンド戦闘</h3><p>虹全・白零・黒零を順番に操作する、軽量な3人パーティ制ターンバトル。AUTO戦闘にも対応。</p></article>
      <article class="card"><h3>◉ 成長パネル</h3><p>技30・パッシブ10・能力値40の分岐ごとに見やすく選べる星盤。技は使うほど熟練Lv.10まで成長する。</p></article>
    </div>
    <p class="note">※現在のマップ・人物・敵は「遊びの芯を確認するための仮ドット」。次段階で世界の色設計、地形タイル、立ち絵、敵アニメーションまで本制作します。</p>`;
  }

  function renderWorld() {
    const next = expToNextRank();
    return `${renderStatusStrip()}${renderPartyStrip()}
      <h1 class="page-title">世界地図</h1>
      <p class="page-subtitle">行き先を選択してください。探索地域は冒険者レベルによって解放されます。</p>
      <div class="map-shell">
        <canvas id="worldCanvas" class="map-canvas" width="800" height="500"></canvas>
        ${Object.values(D.LOCATIONS).map((loc) => {
          const unlocked = rankAllowed(loc.rank);
          return `<button class="map-label location-${loc.type} ${unlocked ? '' : 'locked'}" style="left:${loc.x}%;top:${loc.y}%" data-action="enter-location" data-id="${loc.id}" ${unlocked ? '' : 'disabled'}>${loc.name}<br><small>${unlocked ? (loc.type === 'town' ? '施設を利用' : '探索する') : `要 冒険者Lv.${loc.rank}`}</small></button>`;
        }).join('')}
      </div>
      <div class="map-legend"><span>◆ 街・村</span><span>◆ 探索地</span><span>▣ 未解放（冒険者Lv条件）</span></div>
      <div class="card" style="margin-top:13px;">
        <strong>次の冒険者レベルまで</strong>
        <div class="meter-label"><span>${getRank().name}　冒険者経験 ${state.adventureExp}</span><span>${next ? `${next}で次のLv` : '最高Lv'}</span></div>
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
        </div></div><div class="location-caption"><strong>《枝角亭》のある、草原の宿場町</strong><p>依頼、買い物、製造、休息、素材売却を行える。宿屋ではスタミナも全回復する。</p></div>
        <h2 class="section-title">施設一覧</h2><div class="facility-grid">${renderFacilityCards()}</div>`;
    }
    const auto = state.autoExplore && state.autoExplore.locationId === loc.id;
    const autoFactor = 2;
    return `${renderStatusStrip()}<button class="small-button" data-action="go-world">← 世界地図へ</button>
      <h1 class="page-title" style="margin-top:13px;">${loc.name}</h1><p class="page-subtitle">${loc.description}</p>
      <div class="location-hero"><canvas id="locationCanvas" class="location-canvas" data-location="${loc.id}" width="800" height="360"></canvas></div>${renderPartyStrip()}
      <div class="card exploration-card"><h3>探索準備</h3><p>手動探索：1回ごとに <b>スタミナ ${loc.explorationCost}</b>。敵との戦闘開始時に追加で <b>${loc.battleCost}</b> 消費します。オート探索中は全消費が <b>${autoFactor}倍</b> になります。</p>
      ${auto ? `<div class="automation-status"><b>オート探索中</b><span>下限 ${state.autoExplore.floor} ／ 現在 ${state.stamina.current}</span><span>探索 ${state.autoExplore.steps} 回</span><button class="small-button" data-action="cancel-auto-explore">中止</button></div>` : `<div class="button-row" style="margin-top:12px;"><button class="action-button" data-action="explore" data-id="${loc.id}">探索する（ST ${loc.explorationCost}）</button><button class="secondary-button" data-action="auto-explore-open" data-id="${loc.id}">オート探索（ST消費2倍）</button><button class="secondary-button" data-action="go-world">撤退して世界地図へ</button></div>`}</div>
      <p class="note">危険度：${loc.id === 'fallen_ruins' ? '高' : loc.id === 'whisper_woods' ? '中' : '低'} ／ 必要条件：冒険者Lv.${loc.rank} ／ スタミナが0になると、敗北と同じペナルティで撤退します。</p>`;
  }

  function renderFacilityCards() {
    const data = [
      ['guild','⚑','冒険者ギルド','依頼の受注・報告・冒険者レベル'],
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
    const traitText = (def.traits || []).map((t)=>t.name).join('／');
    const skillCount = currentSkills(id).length; const unlocked = { skill:0, passive:0, stat:0 };
    def.panels.forEach((p)=>{ if(ch.unlockedPanels.includes(p.id) && unlocked[p.category] !== undefined) unlocked[p.category] += 1; });
    return `<article class="card character-card"><canvas class="portrait-large" data-portrait="${id}" width="112" height="156"></canvas>
      <div><h2>${def.name}</h2><div class="subtitle">${def.subtitle}　／　${def.role}</div>
      <div class="meter-label"><span>HP ${ch.hp} / ${stats.maxHp}</span><span>Lv.${ch.level}</span></div><div class="meter"><span style="width:${pct(ch.hp,stats.maxHp)}%"></span></div>
      <div class="meter-label"><span>MP ${ch.mp} / ${stats.maxMp}</span><span>経験値 ${ch.exp}/${levelExpRequired(ch.level)}</span></div><div class="meter mp"><span style="width:${pct(ch.mp,stats.maxMp)}%"></span></div>
      <div class="trait-box"><b>種族特性（3）</b><br>${traitText}</div>
      <div class="stat-grid">${[['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['技',`${unlocked.skill}/30`],['常時',`${unlocked.passive}/10`],['能力',`${unlocked.stat}/40`],['PT',ch.panelPoints]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div>
      <div class="note">装備：${equipment ? equipment.name : 'なし'}　／　習得技：${skillCount}　／　遠い到達点：${def.teriosName}</div>
      <div class="character-actions" style="margin-top:10px;"><button class="small-button" data-action="open-panel" data-id="${id}">成長パネル</button><button class="small-button" data-action="view-character" data-id="${id}">人物詳細</button></div></div></article>`;
  }

  function panelRequirementText(id,panel) {
    const ch=getChar(id); const lacks=[];
    if(panel.prerequisite && !ch.unlockedPanels.includes(panel.prerequisite)) lacks.push('前提パネル');
    if(panel.requiresAll && !panel.requiresAll.every((need)=>ch.unlockedPanels.includes(need))) lacks.push('他系統の終端');
    if(panel.minLevel && ch.level < panel.minLevel) lacks.push(`キャラLv.${panel.minLevel}`);
    if(panel.storyFlag && !state.flags[panel.storyFlag]) lacks.push(panel.storyFlag.startsWith('terios')?'テリオス覚醒':'物語進行');
    if(ch.panelPoints < panel.cost) lacks.push('PT不足');
    return lacks.join('・');
  }
  function panelMeta(owner, branch) {
    const map={
      rainbow:{start:['始まりの力','回復・再生・強化','✦'],end:['終わりの力','攻撃・弱体・断絶','✧'],tune:['調律の力','防御・障壁・特殊','◈'],origin:['原初の力','攻防補妨・万象調律','◎']},
      white:{heal:['回復の道','回復・再生・蘇生','✦'],buff:['祝福と光刃の道','強化・防護・光攻撃','◇'],terios:['アルファ・テリオス','完全な始まり','◎']},
      black:{attack:['破壊の道','物理・魔法・終焉攻撃','✧'],debuff:['妨害と断絶の道','弱体・停止・侵食','◇'],terios:['オメガ・テリオス','完全な終わり','◎']},
    };
    const v=map[owner][branch]; return {branch,label:v[0],description:v[1],icon:v[2]};
  }
  function panelEffectText(panel) {
    if(panel.skill) return `技を習得：${D.SKILLS[panel.skill].description}`;
    if(panel.passive) return `常時効果：${D.PASSIVES[panel.passive].description}`;
    if(panel.effect) return Object.entries(panel.effect).map(([k,v])=>`${({maxHp:'最大HP',maxMp:'最大MP',atk:'攻撃',def:'防御',mag:'魔力',agi:'敏捷',luck:'幸運'})[k]||k}+${v}`).join('／');
    return panel.description;
  }
  function panelProgress(id, branch) {
    const ch=getChar(id); const nodes=getDef(id).panels.filter(p=>p.branch===branch); return [nodes.filter(p=>ch.unlockedPanels.includes(p.id)).length,nodes.length];
  }
  function renderPanel() {
    const id=state.selectedCharacter; const def=getDef(id); const ch=getChar(id);
    const count={skill:0,passive:0,stat:0}; def.panels.forEach(p=>{if(ch.unlockedPanels.includes(p.id)&&count[p.category]!==undefined)count[p.category]++;});
    const branches=[...new Set(def.panels.filter(p=>p.branch!=='core').map(p=>p.branch))];
    const active=state.panelUi?.branch?.[id] || 'overview';
    return `${renderStatusStrip()}<button class="small-button" data-action="go-party">← 仲間一覧へ</button><h1 class="page-title" style="margin-top:13px;">${def.name}：成長パネル</h1>
      <p class="page-subtitle">ドラクエ11風の分岐盤を、スマホでも読めるように「系統ごとの星盤」に整理しました。パネルはすべて選択でき、詳細を見てから解放できます。</p>
      <div class="card panel-summary"><div><strong>所持パネルポイント</strong><div class="note">キャラLv.${ch.level}／${def.role}</div></div><strong class="panel-pt">${ch.panelPoints} PT</strong><div class="panel-counts"><span>技 ${count.skill}/30</span><span>常時 ${count.passive}/10</span><span>能力 ${count.stat}/40</span></div></div>
      <div class="panel-tabs"><button class="panel-tab ${active==='overview'?'active':''}" data-action="panel-branch" data-id="${id}" data-branch="overview">全体図</button>${branches.map(b=>{const m=panelMeta(id,b),pr=panelProgress(id,b);return `<button class="panel-tab ${active===b?'active':''}" data-action="panel-branch" data-id="${id}" data-branch="${b}">${m.icon} ${m.label}<small>${pr[0]}/${pr[1]}</small></button>`}).join('')}</div>
      ${active==='overview'?renderPanelOverview(id,branches):renderPanelBranch(id,active)}
      ${renderPanelInspector(id)}
      <p class="note">★ 技　◈ パッシブ　＋ 能力値。緑＝解放済、金＝現在解放可能、青灰＝条件未達。どのパネルもタップして詳細を確認できます。</p>`;
  }
  function renderPanelOverview(id,branches) {
    return `<div class="panel-overview"><div class="panel-core-v4"><b>${getDef(id).panels.find(p=>p.category==='core').name}</b><small>根源</small></div>${branches.map(branch=>{const m=panelMeta(id,branch),pr=panelProgress(id,branch);return `<button class="branch-card branch-${branch}" data-action="panel-branch" data-id="${id}" data-branch="${branch}"><span class="branch-icon">${m.icon}</span><span><b>${m.label}</b><small>${m.description}</small><em>${pr[0]} / ${pr[1]} 解放</em></span></button>`}).join('')}</div>`;
  }
  function renderPanelBranch(id,branch) {
    const m=panelMeta(id,branch); const panels=getDef(id).panels.filter(p=>p.branch===branch); const [done,total]=panelProgress(id,branch);
    return `<section class="branch-board"><header><span class="branch-icon">${m.icon}</span><div><h2>${m.label}</h2><p>${m.description}　—　${done}/${total} 解放</p></div></header><div class="branch-route">${panels.map(p=>renderSkillPanel(id,p)).join('')}</div></section>`;
  }
  function renderSkillPanel(id,panel) {
    const ch=getChar(id); const unlocked=ch.unlockedPanels.includes(panel.id); const available=canUnlockPanel(id,panel); const selected=state.panelUi?.selected?.[id]===panel.id; const status=unlocked?'unlocked':available?'available':'locked';
    const icon=panel.category==='skill'?'★':panel.category==='passive'?'◈':'＋';
    return `<button class="panel-node-v4 ${status} ${selected?'selected':''}" data-action="panel-select" data-id="${id}" data-panel="${panel.id}" aria-pressed="${selected}"><span class="node-icon">${icon}</span><span class="node-type">${panel.category==='skill'?'技':panel.category==='passive'?'常時':'能力'}</span><b>${panel.name}</b><small>${unlocked?'解放済':available?`${panel.cost}PTで解放可`:`${panel.cost}PT／${panelRequirementText(id,panel)}`}</small></button>`;
  }
  function renderPanelInspector(id) {
    const def=getDef(id); const selectedId=state.panelUi?.selected?.[id]; const panel=def.panels.find(p=>p.id===selectedId);
    if(!panel) return `<div class="panel-inspector empty"><b>パネルを選択</b><span>系統を開き、気になるパネルをタップすると効果・解放条件をここで確認できます。</span></div>`;
    const ch=getChar(id); const unlocked=ch.unlockedPanels.includes(panel.id); const available=canUnlockPanel(id,panel); const type=panel.category==='skill'?'技':panel.category==='passive'?'常時効果':panel.category==='stat'?'能力値':'根源';
    return `<div class="panel-inspector"><div class="panel-inspector-head"><span class="badge">${type}</span><h2>${panel.name}</h2>${unlocked?'<span class="badge done">解放済</span>':available?'<span class="badge active">解放可能</span>':'<span class="badge locked">条件未達</span>'}</div><p>${panel.description}</p><div class="panel-effect"><b>効果</b><span>${panelEffectText(panel)}</span></div>${!unlocked?`<div class="panel-conditions"><b>解放条件</b><span>${panelRequirementText(id,panel)||`${panel.cost}PT`}</span></div>`:''}<div class="panel-inspector-actions">${available?`<button class="primary-button" data-action="panel-unlock-selected" data-id="${id}" data-panel="${panel.id}">${panel.cost}PTで解放する</button>`:''}${unlocked&&panel.skill?`<span class="note">技は戦闘で使うほど習熟Lv.10まで強化されます。</span>`:''}</div></div>`;
  }

  function renderQuestLog() {
    const active = state.activeQuests.map((id) => D.QUESTS[id]).filter(Boolean);
    const fixed = Object.values(D.QUESTS).filter(q=>!q.repeatable && isQuestDone(q.id));
    const repeat = Object.values(D.QUESTS).filter(q=>q.repeatable && isQuestAvailable(q));
    const available = Object.values(D.QUESTS).filter(q=>isQuestAvailable(q) && !isQuestActive(q.id) && (q.repeatable || !isQuestDone(q.id)));
    return `${renderStatusStrip()}<h1 class="page-title">依頼帳</h1><p class="page-subtitle">一回限りの依頼は物語と世界を進め、繰り返し依頼は素材・所持金・冒険者経験を安定して集められます。</p>
      <h2 class="section-title">受注中</h2>${active.length ? `<div class="list">${active.map((q)=>renderQuestRow(q,'active')).join('')}</div>` : '<div class="empty-state">受注中の依頼はありません。リンドホルムのギルド《枝角亭》で依頼を受けましょう。</div>'}
      <h2 class="section-title">受注可能</h2>${available.length?`<div class="list">${available.slice(0,6).map(q=>renderQuestRow(q,'available')).join('')}</div>`:'<div class="empty-state">現在受注できる依頼はありません。</div>'}
      <h2 class="section-title">繰り返し依頼の記録</h2>${repeat.length?`<div class="list">${repeat.map(q=>renderQuestRow(q,'repeat')).join('')}</div>`:'<div class="empty-state">冒険者Lvを上げると、繰り返し依頼が増えます。</div>'}
      <h2 class="section-title">完了した一回限りの依頼</h2>${fixed.length ? `<div class="list">${fixed.map((q)=>renderQuestRow(q,'done')).join('')}</div>` : '<div class="empty-state">まだ達成済みの一回限り依頼はありません。</div>'}
      <div class="button-row" style="margin-top:15px;"><button class="secondary-button" data-action="enter-location" data-id="lindholm">ギルドへ向かう</button></div>`;
  }
  function renderQuestRow(q, mode = '') {
    const p = questProgress(q); const done = mode === 'done'; const active = mode === 'active'; const repeat = q.repeatable;
    const badge=done?'達成済':active?`${p}/${q.amount}`:repeat?`繰返 ${questCompletionCount(q.id)}回`:`冒険者Lv.${q.rank}`;
    return `<div class="list-row"><span class="badge ${done ? 'done' : active ? 'active' : ''}">${badge}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬：${q.reward.gold}G／冒険者経験 ${q.reward.advExp}${repeat?'／繰り返し可':''}</div></div>${active && canCompleteQuest(q) ? '<span class="badge done">報告可能</span>' : ''}</div>`;
  }

  function renderBag() {
    const items = Object.entries(state.inventory).filter(([,qty]) => qty > 0).map(([id, qty]) => ({ ...D.ITEM_DEFS[id], qty }));
    return `${renderStatusStrip()}<h1 class="page-title">荷袋</h1><p class="page-subtitle">道具と素材。回復アイテムは探索外でも使用できます。</p>
      ${items.length ? `<div class="list">${items.map((item) => `<div class="list-row"><span class="badge">${item.type === 'material' ? '素材' : '道具'}</span><div class="row-main"><strong>${item.name} ×${item.qty}</strong><div class="meta">${item.description}</div></div>${item.type === 'consumable' ? `<button class="small-button" data-action="use-item-world" data-id="${item.id}">使う</button>` : `<span class="value">売却 ${item.sell}G</span>`}</div>`).join('')}</div>` : '<div class="empty-state">荷袋は空です。</div>'}
      <h2 class="section-title">自動装備中</h2><div class="list">${Object.keys(state.equipment).map((id)=>{const e=state.equipment[id]?D.EQUIPMENT_DEFS[state.equipment[id]]:null;return `<div class="list-row"><span class="badge">${getDef(id).short}</span><div class="row-main"><strong>${e?e.name:'なし'}</strong><div class="meta">${e?e.description:'製造所で固有装備を作成できます。'}</div></div></div>`}).join('')}</div>`;
  }


  function renderBattleControls(actorId, actor, def) {
    const b=state.battle;
    if (b.phase==='enemy') return `<div class="empty-state">敵が行動中……</div>`;
    if (!actorId||!actor||actor.hp<=0) return `<div class="empty-state">行動順を調整中……</div>`;
    const autoToggle=`<button class="auto-toggle ${b.auto?'on':''}" data-action="toggle-battle-auto">${b.auto?'AUTO ON':'AUTO OFF'}</button>`;
    if (b.auto) return `<div class="automation-status"><b>${def.short} が自動行動中</b>${autoToggle}<span>熟練度も上がります</span></div>`;
    if (b.phase==='command') return `<div class="battle-command-title"><span><b>${def.short} の行動</b>　<small>${def.role}</small></span>${autoToggle}</div><div class="command-row"><button class="command-button" data-action="battle-command" data-command="attack">攻撃</button><button class="command-button" data-action="battle-command" data-command="skills">技</button><button class="command-button" data-action="battle-command" data-command="guard">防御</button><button class="command-button" data-action="battle-command" data-command="items">道具</button></div>`;
    if (b.phase==='skills') return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使用する技を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${currentSkills(actorId).map(skill=>`<button class="skill-button" data-action="battle-skill" data-id="${skill.id}" ${actor.mp<skill.mp?'disabled':''}><b>${skill.name}</b><small>MP ${skill.mp}　${skillMasteryLabel(actorId,skill.id)}</small><span>${skill.description}<em>${masteryHint(actorId,skill)}</em></span></button>`).join('')}</div>`;
    if (b.phase==='items') { const consumables=Object.values(D.ITEM_DEFS).filter(i=>i.type==='consumable'&&countItem(i.id)>0); return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使う道具を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${consumables.length?consumables.map(item=>`<button class="skill-button" data-action="battle-item" data-id="${item.id}"><b>${item.name} ×${countItem(item.id)}</b><small>道具</small><span>${item.description}</span></button>`).join(''):'<div class="empty-state">使える道具がありません。</div>'}</div>`; }
    if (b.phase==='target-enemy') return `<div><b style="font-size:12px;">対象の敵を選択</b><div class="target-row">${getAliveEnemies().map((e,i)=>`<button class="target-button" data-action="battle-target-enemy" data-index="${i}">${e.name}<br>HP ${e.hp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`;
    if (b.phase==='target-ally') { const skill=b.selected?.skillId?D.SKILLS[b.selected.skillId]:null; const targets=skill?.revive||skill?.reviveAll?['rainbow','white','black']:['rainbow','white','black'].filter(id=>getChar(id).hp>0); return `<div><b style="font-size:12px;">対象の仲間を選択</b><div class="target-row">${targets.map(id=>`<button class="target-button" data-action="battle-target-ally" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`; }
    return '<div class="empty-state">行動を選択してください。</div>';
  }

  function masteryHint(id,skill) { const m=skillMasteryLevel(id,skill.id); return m>=10?'　★極意効果発動中':m>=6?'　◆持続・効果強化':m>=3?'　◆効果強化':''; }

  function startGame() {
    state.started = true;
    state.scene = 'world';
    saveGame();
    render();
    if (!state.flags.openingSeen) {
      state.flags.openingSeen = true;
      saveGame();
      showDialogue('序章：星なき始まり', '薄い霧の向こうに、宿場町リンドホルムの灯りが見えた。\n\n虹全「着いたな。今日はここで休もう。」\n白零「……わかった。虹全は、どこか痛くない？」\n虹全「俺は平気。白零と黒零は？」\n黒零「問題ない。人が多いなら、近づかれない方がいい。」\n虹全「わかった。無理に話さなくていい。まずは腹ごしらえだ。」\n\n三人はまだ、この小さな町から始まる旅が、世界の均衡へ続いていることを知らない。');
    }
  }

  function enterLocation(id) {
    const loc = D.LOCATIONS[id];
    if (!loc || !rankAllowed(loc.rank)) return toast(`この場所には 冒険者Lv.${loc.rank} 以上が必要です。`, 'warn');
    state.currentLocation = id;
    state.scene = 'location';
    saveGame();
    render();
  }

  function explorationAvailable() { return Object.keys(state.characters).every((id)=>getChar(id).hp>0); }
  function autoResult(text) { if(state.autoExplore){ state.autoExplore.results.push(text); if(state.autoExplore.results.length>12) state.autoExplore.results.shift(); } }
  function explore(locationId, fromAuto=false) {
    if (!explorationAvailable()) { if(fromAuto) return stopAutoExplore('仲間が戦闘不能になったため中止しました。'); toast('戦闘不能の仲間がいます。宿屋で休んでください。','warn'); return 'stop'; }
    const loc=D.LOCATIONS[locationId]; if(!loc?.enemyPool) return 'stop';
    const cost=(loc.explorationCost||3)*(fromAuto?2:1);
    const floor=fromAuto ? (state.autoExplore?.floor || 0) : 0;
    if(fromAuto && !canSpendStamina(cost,floor,true)) return stopAutoExplore(`スタミナ下限 ${floor} を守るため、探索を終了しました。`);
    if(!spendStamina(cost, fromAuto?`オート探索（${loc.name}）`:`探索（${loc.name}）`,{locationId,fromAuto})) return 'stop';
    const roll=Math.random();
    if(roll<.54){ let enemies=[choice(loc.enemyPool)]; if(loc.id==='windy_plain'&&Math.random()<.26)enemies.push(choice(['pale_slime','grass_hare'])); if(loc.id==='whisper_woods'&&Math.random()<.26)enemies.push(choice(['wind_wolf','whisper_treant'])); if(loc.id==='fallen_ruins'&&Math.random()<.22)enemies.push('ruin_sentinel'); if(loc.id==='whisper_woods'&&state.flags.anger!==true&&state.adventureExp>=100&&Math.random()<.12)enemies=['moss_wolf']; const started=startBattle(enemies,loc.id,{auto:fromAuto||state.automation.battleAutoDefault,autoExplore:fromAuto}); return started?'battle':'stop'; }
    if(roll<.88){ const item=choice(loc.materialPool); const qty=rng(1,item==='herb'?3:2); addItem(item,qty); const text=`${D.ITEM_DEFS[item].name} ×${qty}`; appendLog(`${loc.name}で ${text} を見つけた。`); autoResult(`素材：${text}`); if(!fromAuto)toast(`${text} を発見！`,'good'); saveGame(); if(!fromAuto)render(); return 'loot'; }
    const gold=rng(18,44); state.gold+=gold; appendLog(`${loc.name}で古い袋を発見。${gold}Gを得た。`); autoResult(`${gold}G を発見`); if(!fromAuto)toast(`古い袋を発見。${gold}Gを得た！`,'good'); saveGame(); if(!fromAuto)render(); return 'gold';
  }
  function openAutoExploreSetup(locationId) {
    const loc=D.LOCATIONS[locationId]; refreshStamina();
    if (state.stamina.current <= 1) return toast('スタミナが不足しています。宿屋か活力の小瓶で回復してください。', 'warn');
    const minimum=Math.min(state.stamina.current - 1, Math.max(0,(loc.explorationCost||3)*2));
    showModal(`<div class="modal-header"><div><h2>オート探索の設定</h2><p>${loc.name}を、指定したスタミナ下限まで自動で探索します。探索・戦闘のスタミナ消費は2倍です。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="auto-setup"><label>現在のスタミナ <b>${state.stamina.current}/${getStaminaMax()}</b></label><label for="autoStaminaFloor">停止するスタミナ下限：<output id="autoFloorValue">${minimum}</output></label><input id="autoStaminaFloor" type="range" min="0" max="${Math.max(0,state.stamina.current-1)}" value="${minimum}" oninput="document.getElementById('autoFloorValue').value=this.value"><div class="auto-floor-presets"><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=0;document.getElementById('autoFloorValue').value=0">0</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=10;document.getElementById('autoFloorValue').value=10">10</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=20;document.getElementById('autoFloorValue').value=20">20</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=Math.floor(${state.stamina.current}/2);document.getElementById('autoFloorValue').value=Math.floor(${state.stamina.current}/2)">半分</button></div><p class="note">下限を下回る消費が必要になる前に、自動で帰還します。スタミナ0になると通常の敗北と同じ扱いで撤退します。</p></div><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="auto-explore-confirm" data-id="${locationId}">この設定で開始</button></div>`);
  }
  function startAutoExplore(locationId, floor=0) {
    if(!explorationAvailable()) return toast('戦闘不能の仲間がいます。宿屋で休んでください。','warn');
    refreshStamina(); floor=clamp(Number(floor)||0,0,state.stamina.current);
    if(state.stamina.current<=1) return toast('スタミナが不足しています。宿屋か活力の小瓶で回復してください。','warn');
    if(state.stamina.current<=floor) return toast('下限が現在のスタミナ以上です。下限を下げてください。','warn');
    state.autoExplore={locationId,floor,steps:0,results:[]}; appendLog(`${D.LOCATIONS[locationId].name}でオート探索を開始（下限 ${floor}）。`); saveGame(); render(); window.clearTimeout(autoExploreTimer); autoExploreTimer=window.setTimeout(runAutoExploreStep,300);
  }
  function runAutoExploreStep() {
    const a=state.autoExplore; if(!a||state.battle) return;
    const loc=D.LOCATIONS[a.locationId]; const nextCost=(loc.explorationCost||3)*2;
    if(!canSpendStamina(nextCost,a.floor,true)) return finishAutoExplore(`スタミナ下限 ${a.floor} に到達したため、探索を終了しました。`);
    a.steps+=1; const outcome=explore(a.locationId,true); render(); if(outcome!=='battle'&&state.autoExplore) { autoExploreTimer=window.setTimeout(runAutoExploreStep,460); }
  }
  function finishAutoExplore(reason='オート探索を完了しました。') {
    const a=state.autoExplore; if(!a)return;
    window.clearTimeout(autoExploreTimer);
    const summary=a.results.length ? a.results.map(x=>`・${x}`).join('\n') : '目立った発見はなかった。';
    const steps=a.steps;
    state.autoExplore=null; saveGame(); render();
    showDialogue('オート探索 終了', `${reason}\n探索回数：${steps}回\n残りスタミナ：${state.stamina.current}/${getStaminaMax()}\n\n${summary}`);
  }
  function stopAutoExplore(reason='オート探索を中止しました。') { if(!state.autoExplore)return; window.clearTimeout(autoExploreTimer); state.autoExplore=null; saveGame(); render(); toast(reason,'warn'); }

  function startBattle(enemyIds, locationId, options={}) {
    const loc=D.LOCATIONS[locationId]; const cost=(loc?.battleCost||4)*(options.autoExplore?2:1); const floor=options.autoExplore?(state.autoExplore?.floor||0):0;
    if(options.autoExplore && !canSpendStamina(cost,floor,true)) { stopAutoExplore(`戦闘に必要なスタミナを残すため、下限 ${floor} で探索を終了しました。`); return false; }
    if(!spendStamina(cost, options.autoExplore?`オート戦闘開始（${loc.name}）`:`戦闘開始（${loc.name}）`,{locationId,fromAuto:!!options.autoExplore})) return false;
    const enemies=enemyIds.map((id,i)=>{const d=D.ENEMIES[id];return {...deepCopy(d),uid:`${id}_${Date.now()}_${i}`,hp:d.maxHp,status:{}};});
    state.battle={locationId,enemies,turnIndex:0,order:['rainbow','white','black'],phase:'command',selected:null,auto:!!options.auto,autoExplore:!!options.autoExplore,log:`${enemies.map(e=>e.name).join('、')} が現れた！
スタミナ -${cost}`};
    state.scene='battle'; audio.sfx('hit'); render(); if(state.battle.auto) window.setTimeout(runAutoTurn,360); return true;
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
    const b=state.battle; if(!b){state.scene='world';return renderWorld();} const actorId=b.order[b.turnIndex]; const actor=actorId?getChar(actorId):null; const actorDef=actorId?getDef(actorId):null; const log=battleLogLines();
    return `<section class="battle-shell"><div class="battle-stamina">スタミナ ${state.stamina.current}/${getStaminaMax()}　<span>戦闘開始時に消費</span></div><div class="battle-stage"><div class="enemy-area">${b.enemies.filter(e=>e.hp>0).map(enemy=>`<div class="battle-enemy"><canvas class="enemy-sprite" data-enemy="${enemy.id}" width="132" height="112"></canvas><div class="enemy-name">${enemy.name}</div><div class="enemy-hp meter"><span style="width:${pct(enemy.hp,enemy.maxHp)}%"></span></div><small style="font-size:9px;">HP ${enemy.hp}/${enemy.maxHp}${enemyStatusText(enemy)}</small></div>`).join('')}</div><div class="party-sprites">${['rainbow','white','black'].map(id=>{const ch=getChar(id),st=getStats(id);return `<div class="battle-hero"><canvas data-portrait="${id}" width="54" height="54"></canvas><strong>${getDef(id).short}${ch.hp<=0?'（戦闘不能）':''}</strong><div class="meter"><span style="width:${pct(ch.hp,st.maxHp)}%"></span></div><div class="meter mp"><span style="width:${pct(ch.mp,st.maxMp)}%"></span></div>${ch.barrier?'<small>◈障壁</small>':''}</div>`}).join('')}</div></div><div class="battle-log">${log.slice(-3).map(x=>`<div>› ${x}</div>`).join('')}</div><div class="battle-controls">${renderBattleControls(actorId,actor,actorDef)}</div></section>`;
  }
  function enemyStatusText(enemy) { const s=enemy.status||{}; const list=[]; if(s.fracture)list.push('▽防御'); if(s.weaken)list.push('▽攻撃');if(s.slow)list.push('▽敏捷');if(s.bind)list.push('縛');return list.length?`　${list.join(' ')}`:''; }

  function getAliveAllies() { return ['rainbow','white','black'].filter((id)=>getChar(id).hp > 0); }
  function getAliveEnemies() { return state.battle.enemies.filter((e)=>e.hp > 0); }

  function battleCommand(command) {
    const b=state.battle; if(!b||b.phase!=='command'||b.auto)return;
    if(command==='guard'){ const actorId=b.order[b.turnIndex]; getChar(actorId).guard=1; battleLog(`${getDef(actorId).short}は身構えた。`); afterPlayerAction(); return; }
    b.phase=command==='skills'?'skills':command==='items'?'items':'target-enemy'; b.selected=command==='attack'?{type:'attack'}:null; render();
  }
  function useBattleSkill(skillId) { const b=state.battle; const actorId=b.order[b.turnIndex]; const skill=D.SKILLS[skillId]; if(!skill||getChar(actorId).mp<skill.mp||b.auto)return; b.selected={type:'skill',skillId}; b.phase=skill.target==='enemy'?'target-enemy':skill.target==='ally'?'target-ally':'auto-skill'; if(b.phase==='auto-skill')executeSkill(actorId,skill,null);else render(); }
  function useBattleItem(itemId) { const item=D.ITEM_DEFS[itemId]; if(!item||countItem(itemId)<1||state.battle.auto)return; state.battle.selected={type:'item',itemId};state.battle.phase='target-ally';render(); }
  function targetEnemy(index) { const b=state.battle;const enemy=getAliveEnemies()[Number(index)];if(!enemy)return;const actorId=b.order[b.turnIndex];if(b.selected.type==='attack')executeAttack(actorId,enemy);else if(b.selected.type==='skill')executeSkill(actorId,D.SKILLS[b.selected.skillId],enemy); }
  function targetAlly(id) {const b=state.battle; const actorId=b.order[b.turnIndex];if(b.selected.type==='item')executeItem(actorId,b.selected.itemId,id);else if(b.selected.type==='skill')executeSkill(actorId,D.SKILLS[b.selected.skillId],id);}
  function toggleBattleAuto() { if(!state.battle)return; state.battle.auto=!state.battle.auto; battleLog(state.battle.auto?'自動戦闘を開始。':'自動戦闘を停止。'); render(); if(state.battle.auto)window.setTimeout(runAutoTurn,180); }
  function chooseAutoAction(actorId) {
    const skills=currentSkills(actorId).filter(s=>getChar(actorId).mp>=s.mp); const alive=getAliveAllies(); const down=['rainbow','white','black'].filter(id=>getChar(id).hp<=0); const lowest=alive.sort((a,b)=>pct(getChar(a).hp,getStats(a).maxHp)-pct(getChar(b).hp,getStats(b).maxHp))[0];
    const low=lowest&&pct(getChar(lowest).hp,getStats(lowest).maxHp)<.42;
    const revive=skills.filter(s=>(s.revive||s.reviveAll)&&down.length); if(revive.length)return {skill:revive.sort((a,b)=>b.mp-a.mp)[0],target:down[0]};
    const heals=skills.filter(s=>s.heal&&(['ally','allAllies','self'].includes(s.target))); if(low&&heals.length){const best=heals.sort((a,b)=>(b.heal||0)-(a.heal||0))[0];return {skill:best,target:best.target==='ally'?lowest:null};}
    const enemy=getAliveEnemies().sort((a,b)=>a.hp-b.hp)[0]; const damages=skills.filter(s=>s.power||s.allEnemyPower); if(damages.length){let pool=damages;if(actorId==='white'&&low)pool=heals.length?heals:damages;const best=pool.sort((a,b)=>((b.power||b.allEnemyPower||0)*1.1+b.mp*.01)-((a.power||a.allEnemyPower||0)*1.1+a.mp*.01))[0];return {skill:best,target:best.target==='enemy'?enemy:null};}
    return {attack:enemy};
  }
  function runAutoTurn() { const b=state.battle;if(!b||!b.auto||b.phase==='enemy')return; const actorId=b.order[b.turnIndex];if(!actorId||getChar(actorId).hp<=0){afterPlayerAction();return;} const a=chooseAutoAction(actorId);if(a.skill)executeSkill(actorId,a.skill,a.target);else executeAttack(actorId,a.attack); }

  function buffValue(entity, stat) { return entity.status?.buffs?.[stat]?.value || 0; }
  function combatStat(id,key) { const ch=getChar(id); let v=getStats(id)[key]; const b=buffValue(ch,key); if(b) v=Math.floor(v*(1+b*.14)); if(ch.status?.weaken&&(key==='atk'||key==='mag'))v=Math.floor(v*.72); return v; }
  function effectiveDefenderDef(target,isEnemy=false) { let d=isEnemy?target.def:combatStat(target,'def'); if(target.status?.fracture)d=Math.max(0,Math.floor(d*.65)); return d; }
  function enemyAttackValue(enemy) { let x=enemy.atk; if(enemy.status?.weaken)x=Math.floor(x*.72); return x; }
  function setStatus(target,key,turns,value=1) { target.status ||= {}; if(key==='buffs'){target.status.buffs||={};return;} target.status[key]=Math.max(target.status[key]||0,turns); }
  function addBuff(id,buffs,turns) { const ch=getChar(id);ch.status||={};ch.status.buffs||={};Object.entries(buffs||{}).forEach(([stat,value])=>{const old=ch.status.buffs[stat]||{value:0,turns:0};ch.status.buffs[stat]={value:Math.max(old.value,value),turns:Math.max(old.turns,turns)};}); }
  function applyDebuffs(enemy,debuff,turnsBonus=0) { Object.entries(debuff||{}).forEach(([name,turns])=>setStatus(enemy,name,turns+turnsBonus)); }
  function applyBarrier(id,ratio) { const ch=getChar(id);ch.barrier=Math.max(ch.barrier||0,Math.floor(getStats(id).maxHp*ratio)); }
  function removeNegative(id) { const ch=getChar(id); if(ch.status){delete ch.status.fracture;delete ch.status.weaken;delete ch.status.slow;delete ch.status.bind;delete ch.status.silence;} }
  function dealDamage(attackerId,target,multiplier=1,kind='physical',isEnemyTarget=true,bonusOnDebuff=0,extra={}) { const offensive=kind==='magic'||kind==='special'?combatStat(attackerId,'mag'):combatStat(attackerId,'atk');let power=multiplier; if(bonusOnDebuff&&Object.keys(target.status||{}).some(k=>k!=='buffs'))power+=bonusOnDebuff;if(hasPassive(attackerId,'debuff_damage')&&Object.keys(target.status||{}).some(k=>k!=='buffs'))power*=1.12;if(attackerId==='rainbow'&&getChar('rainbow').hp<=getStats('rainbow').maxHp*.5)power*=1.1;if(attackerId==='black'&&target.status?.fracture)power*=1.15;if(extra.pierce)target={...target,def:Math.floor(target.def*(1-extra.pierce))};if(extra.execute&&isEnemyTarget&&target.hp/target.maxHp<.32)power*=1.32;let damage=Math.max(1,Math.floor(offensive*power-effectiveDefenderDef(target,isEnemyTarget)*.52+rng(-3,4))); if(hasPassive(attackerId,'crit_up')&&Math.random()<.14)damage=Math.floor(damage*1.45);applyDamage(target,damage,isEnemyTarget);return damage; }
  function applyDamage(target,damage,isEnemy){if(isEnemy){target.hp=Math.max(0,target.hp-damage);return;}let targetId=target;const ch=getChar(targetId);const protectedBy=ch.protectedBy;if(protectedBy&&protectedBy!==targetId&&getChar(protectedBy)?.hp>0){targetId=protectedBy;battleLog(`${getDef(protectedBy).short}が攻撃を受け止めた！`);}const defender=getChar(targetId);let final=damage;if(defender.barrier){const used=Math.min(defender.barrier,final);defender.barrier-=used;final-=used;if(defender.barrier<=0)delete defender.barrier;}if(defender.guard)final=Math.max(1,Math.floor(final*.5));if(protectedBy&&hasPassive(protectedBy,'guard_reduction'))final=Math.max(1,Math.floor(final*.85));if(final>=defender.hp&&defender.deathGuard){defender.hp=1;delete defender.deathGuard;battleLog(`${getDef(targetId).short}は結界に守られた！`);}else defender.hp=Math.max(0,defender.hp-final);}
  function executeAttack(actorId,enemy){const dmg=dealDamage(actorId,enemy,1,'physical',true);audio.sfx('hit');battleLog(`${getDef(actorId).short}の攻撃！ ${enemy.name}に${dmg}ダメージ。`);resolveAfterHit();}
  function executeSkill(actorId,skill,target){const actor=getChar(actorId);if(actor.mp<skill.mp)return; actor.mp-=skill.mp; const scale=masteryScale(actorId,skill);const dur=scale.durationBonus+(hasPassive(actorId,'duration_plus')?1:0);const power=(skill.power||0)*scale.potency;const heal=(skill.heal||0)*scale.potency;const barrier=(skill.barrier||0)*(1+(scale.level-1)*.07);const regen=(skill.regen||0)+(scale.level>=6?1:0);let targetEnemies=[];if(skill.target==='enemy'&&target)targetEnemies=[target];else if(skill.target==='allEnemies')targetEnemies=getAliveEnemies();if(skill.power&&!skill.allInOne){targetEnemies.forEach(e=>{const dmg=dealDamage(actorId,e,power,skill.kind,true,skill.bonusOnDebuff||0,{pierce:skill.pierce,execute:skill.execute});battleLog(`${getDef(actorId).short}の ${skill.name}！ ${e.name}に${dmg}ダメージ。`);});}
    if(skill.allEnemyPower){getAliveEnemies().forEach(e=>{const dmg=dealDamage(actorId,e,skill.allEnemyPower*scale.potency,'magic',true);battleLog(`${skill.name}の余波！ ${e.name}に${dmg}ダメージ。`);});}
    let allyTargets=skill.target==='allAllies'||skill.reviveAll?['rainbow','white','black']:(skill.target==='ally'?[target]:skill.target==='self'?[actorId]:[]); if(!allyTargets.length && (skill.heal||skill.barrier||skill.mpHeal||skill.allInOne)) allyTargets=['rainbow','white','black']; if(heal){allyTargets.filter(Boolean).forEach(id=>{const ch=getChar(id);if(ch.hp<=0&&(skill.revive||skill.reviveAll)){ch.hp=1;}if(ch.hp>0){let amount=Math.floor(getStats(id).maxHp*heal);if(skill.balanceHeal&&pct(ch.hp,getStats(id).maxHp)<.4)amount=Math.floor(amount*1.35);if(hasPassive(actorId,'heal_boost'))amount=Math.floor(amount*1.1);if(hasPassive(actorId,'low_ally_heal')&&pct(ch.hp,getStats(id).maxHp)<.5)amount=Math.floor(amount*1.15);ch.hp=clamp(ch.hp+amount,0,getStats(id).maxHp);if(hasPassive(actorId,'heal_regen'))ch.regen=Math.max(ch.regen||0,1);if(hasPassive(actorId,'heal_mp'))ch.mp=clamp(ch.mp+Math.floor(getStats(id).maxMp*.03),0,getStats(id).maxMp);}});}
    if(skill.cleanse)allyTargets.filter(Boolean).forEach(id=>{removeNegative(id);if(hasPassive(actorId,'cleanse_barrier'))applyBarrier(id,.10);}); if(skill.mpHeal)allyTargets.filter(Boolean).forEach(id=>{const ch=getChar(id);ch.mp=clamp(ch.mp+Math.floor(getStats(id).maxMp*skill.mpHeal*scale.potency),0,getStats(id).maxMp);}); if(skill.regen)allyTargets.filter(Boolean).forEach(id=>{getChar(id).regen=Math.max(getChar(id).regen||0,regen);}); if(skill.barrier)allyTargets.filter(Boolean).forEach(id=>applyBarrier(id,barrier)); if(skill.deathGuard)allyTargets.filter(Boolean).forEach(id=>getChar(id).deathGuard=true); if(skill.buffs)allyTargets.filter(Boolean).forEach(id=>addBuff(id,skill.buffs,(skill.turns||2)+dur)); if(skill.guard&&target){getChar(target).protectedBy=actorId;getChar(target).protectedTurns=(skill.turns||2)+dur;} if(skill.debuff)targetEnemies.length?targetEnemies.forEach(e=>applyDebuffs(e,skill.debuff,dur)):getAliveEnemies().forEach(e=>applyDebuffs(e,skill.debuff,dur)); if(skill.dispel)getAliveEnemies().forEach(e=>{if(e.status) delete e.status.buffs;}); if(skill.stealBuff&&skill.buffs)addBuff(actorId,skill.buffs,(skill.turns||2)+dur); if(skill.lifeSteal&&targetEnemies.length){const hit=0;const recovered=Math.floor((skill.power||1)*combatStat(actorId,skill.kind==='physical'?'atk':'mag')*skill.lifeSteal*.55);actor.hp=clamp(actor.hp+recovered,0,getStats(actorId).maxHp);} if(skill.mpSteal)actor.mp=clamp(actor.mp+Math.floor(getStats(actorId).maxMp*skill.mpSteal),0,getStats(actorId).maxMp); if(skill.allInOne){getAliveEnemies().forEach(e=>{const dmg=dealDamage(actorId,e,power,'special',true);battleLog(`${skill.name}！ ${e.name}に${dmg}ダメージ。`);});['rainbow','white','black'].forEach(id=>{const ch=getChar(id);ch.hp=clamp(ch.hp+Math.floor(getStats(id).maxHp*heal),0,getStats(id).maxHp);});}
    if(skill.kind==='physical'||skill.kind==='magic'||skill.kind==='special') { if(hasPassive(actorId,'fracture_chance')&&Math.random()<.2)targetEnemies.forEach(e=>setStatus(e,'fracture',1)); audio.sfx('hit'); } else audio.sfx('heal'); if(hasPassive(actorId,'skill_cycle')){actor.hp=clamp(actor.hp+Math.floor(getStats(actorId).maxHp*.02),0,getStats(actorId).maxHp);actor.mp=clamp(actor.mp+Math.floor(getStats(actorId).maxMp*.02),0,getStats(actorId).maxMp);} gainMastery(actorId,skill);battleLog(`${getDef(actorId).short}は ${skill.name} を使った。`);resolveAfterHit();}
  function executeItem(actorId,itemId,targetId){const item=D.ITEM_DEFS[itemId];if(!takeItem(itemId,1))return;const target=getChar(targetId);if(item.effect.healHp)target.hp=clamp(target.hp+item.effect.healHp,0,getStats(targetId).maxHp);if(item.effect.healMp)target.mp=clamp(target.mp+item.effect.healMp,0,getStats(targetId).maxMp);if(item.effect.restoreStamina)restoreStamina(item.effect.restoreStamina, `${item.name}でスタミナを回復した。`);audio.sfx('heal');battleLog(`${getDef(actorId).short}は ${item.name} を使った。`);resolveAfterHit();}
  function resolveAfterHit(){if(getAliveEnemies().length===0)return finishBattle(true);afterPlayerAction();}
  function afterPlayerAction(){const b=state.battle;b.selected=null;b.turnIndex+=1;while(b.turnIndex<b.order.length&&getChar(b.order[b.turnIndex]).hp<=0)b.turnIndex+=1;if(b.turnIndex>=b.order.length){b.phase='enemy';render();window.setTimeout(enemyPhase,b.auto?300:520);}else{b.phase='command';render();if(b.auto)window.setTimeout(runAutoTurn,260);}}
  function enemyPhase(){const b=state.battle;if(!b)return;for(const enemy of getAliveEnemies()){const targets=getAliveAllies();if(!targets.length)return finishBattle(false);const targetId=choice(targets);const move=enemy.status?.silence?enemy.skills[0]:choice(enemy.skills);const base=Math.max(1,Math.floor(enemyAttackValue(enemy)*move.power-effectiveDefenderDef(targetId,false)*.45+rng(-2,4)));applyDamage(targetId,base,false);if(move.effect==='fracture'){getChar(targetId).status||={};getChar(targetId).status.fracture=2;}battleLog(`${enemy.name}の${move.name}！ ${getDef(targetId).short}に${base}ダメージ。`);if(!getAliveAllies().length)return finishBattle(false);}tickBattleStatuses();b.turnIndex=0;while(b.turnIndex<b.order.length&&getChar(b.order[b.turnIndex]).hp<=0)b.turnIndex+=1;b.phase='command';render();if(b.auto)window.setTimeout(runAutoTurn,260);}
  function tickBattleStatuses(){state.battle.enemies.forEach(e=>{Object.keys(e.status||{}).forEach(k=>{if(k!=='buffs'){e.status[k]-=1;if(e.status[k]<=0)delete e.status[k];}});});['rainbow','white','black'].forEach(id=>{const ch=getChar(id);if(ch.guard)delete ch.guard;if(ch.regen){ch.hp=clamp(ch.hp+Math.floor(getStats(id).maxHp*.04),0,getStats(id).maxHp);ch.regen-=1;if(ch.regen<=0)delete ch.regen;}if(ch.status){Object.keys(ch.status).forEach(k=>{if(k==='buffs'){Object.keys(ch.status.buffs).forEach(stat=>{ch.status.buffs[stat].turns-=1;if(ch.status.buffs[stat].turns<=0)delete ch.status.buffs[stat];});}else{ch.status[k]-=1;if(ch.status[k]<=0)delete ch.status[k];}});}if(ch.protectedTurns){ch.protectedTurns-=1;if(ch.protectedTurns<=0){delete ch.protectedTurns;delete ch.protectedBy;}}});}
  function applyDefeatPenalty(title, text, locationId, fromAuto=false) {
    window.clearTimeout(autoExploreTimer);
    state.gold=Math.max(0,state.gold-15);
    Object.keys(state.characters).forEach(id=>{const ch=getChar(id);ch.hp=Math.max(1,Math.floor(getStats(id).maxHp*.25));ch.mp=Math.max(0,Math.floor(getStats(id).maxMp*.25));});
    state.battle=null; state.scene='location';
    const hadAuto=!!state.autoExplore || fromAuto;
    state.autoExplore=null;
    appendLog(`${title}：15Gを失い、${D.LOCATIONS[locationId]?.name||'付近'}から撤退した。`);
    saveGame(); render();
    if(hadAuto) { toast(`${title}。オート探索を中止しました。`, 'warn'); return; }
    showDialogue(title, `${text}

所持金を15G失い、HP・MPが25%の状態で戻ってきた。`);
  }
  function finishBattle(victory){const b=state.battle;if(!b)return;const loc=D.LOCATIONS[b.locationId];if(!victory){applyDefeatPenalty('撤退',`三人は ${loc.name} から撤退した。`,b.locationId,!!b.autoExplore);return;}const defeated=b.enemies;let exp=0,gold=0;const drops=[];defeated.forEach(enemy=>{exp+=enemy.exp;gold+=enemy.gold;state.kills[enemy.id]=(state.kills[enemy.id]||0)+1;enemy.drops.forEach(drop=>{if(Math.random()<=drop.chance){const qty=rng(drop.qty[0],drop.qty[1]);addItem(drop.id,qty);drops.push({id:drop.id,qty});}});});state.gold+=gold;const levelUps=[];['rainbow','white','black'].forEach(id=>{const levels=addCharacterExp(id,exp);if(levels.length)levelUps.push(`${getDef(id).short} Lv.${levels.join('・')}`);if(hasPassive(id,'kill_mp'))getChar(id).mp=clamp(getChar(id).mp+Math.floor(getStats(id).maxMp*.06),0,getStats(id).maxMp);if(hasPassive(id,'kill_hp'))getChar(id).hp=clamp(getChar(id).hp+Math.floor(getStats(id).maxHp*.05),0,getStats(id).maxHp);});const whiteLowest=getAliveAllies().sort((a,c)=>pct(getChar(a).hp,getStats(a).maxHp)-pct(getChar(c).hp,getStats(c).maxHp))[0];if(whiteLowest&&hasPassive('white','post_battle_heal'))getChar(whiteLowest).hp=clamp(getChar(whiteLowest).hp+Math.floor(getStats(whiteLowest).maxHp*.08),0,getStats(whiteLowest).maxHp);const first=!state.flags.firstVictory;if(first){state.flags.firstVictory=true;state.flags.choice=true;}const fromAuto=!!b.autoExplore;state.battle=null;state.scene='location';audio.sfx('victory');appendLog(`${defeated.map(e=>e.name).join('、')}を倒した。経験値${exp}／${gold}G`);const dropText=drops.length?drops.map(d=>`${D.ITEM_DEFS[d.id].name}×${d.qty}`).join('、'):'なし';if(fromAuto){autoResult(`戦闘勝利：${defeated.map(e=>e.name).join('・')}（${gold}G／${dropText}）`);saveGame();render();autoExploreTimer=window.setTimeout(runAutoExploreStep,420);return;}saveGame();render();const levelsText=levelUps.length?`\n\n【レベルアップ】${levelUps.join('／')}\n各自3PTを獲得。`:'';const story=first?'\n\n戦いが終わり、草原に風が戻った。\n黒零「次は、どうする？」\n白零「虹全が決める？」\n虹全「……いや。三人で決めよう。もう、誰かの指示を待たなくていい。」\n\n【物語パネル：「選択」が解放条件を満たしました】':'';showDialogue('戦闘勝利',`${defeated.map(e=>e.name).join('、')}を倒した。\n経験値：${exp}　／　獲得金：${gold}G\n素材：${dropText}${levelsText}${story}`);}

  function useItemOutside(itemId) {
    const item = D.ITEM_DEFS[itemId];
    if (!item || countItem(itemId) <= 0) return;
    if(item.effect?.restoreStamina) {
      showModal(`<div class="modal-header"><div><h2>${item.name}を使う</h2><p>${item.description}</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="card"><div class="meter-label"><span>スタミナ ${state.stamina.current}/${getStaminaMax()}</span><span>+${item.effect.restoreStamina}</span></div><div class="meter stamina"><span style="width:${pct(state.stamina.current,getStaminaMax())}%"></span></div><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="use-stamina-item" data-id="${itemId}">使う</button></div></div>`); return;
    }
    showModal(`<div class="modal-header"><div><h2>${item.name}を使う</h2><p>${item.description}</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="target-row">${['rainbow','white','black'].map((id)=>`<button class="target-button" data-action="use-item-outside-target" data-item="${itemId}" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}<br>MP ${getChar(id).mp}/${getStats(id).maxMp}</button>`).join('')}</div>`);
  }
  function useStaminaItem(itemId) {
    const item=D.ITEM_DEFS[itemId]; if(!item?.effect?.restoreStamina || !takeItem(itemId,1)) return;
    const restored=restoreStamina(item.effect.restoreStamina, `${item.name}を使った。`); closeModal(); saveGame(); render(); toast(`${item.name}でスタミナを${restored}回復。`, 'good');
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
    const quests = Object.values(D.QUESTS); const fixed=quests.filter(q=>!q.repeatable); const repeat=quests.filter(q=>q.repeatable);
    const row=(q)=>{const available=isQuestAvailable(q),active=isQuestActive(q.id),done=isQuestDone(q.id),report=canCompleteQuest(q); const action=done?'<span class="badge done">達成済</span>':report?`<button class="small-button" data-action="quest-complete" data-id="${q.id}">報告する</button>`:active?`<span class="badge active">進行 ${questProgress(q)}/${q.amount}</span>`:available?`<button class="small-button" data-action="quest-accept" data-id="${q.id}">受注する</button>`:`<span class="badge locked">要 冒険者Lv.${q.rank}</span>`; return `<div class="list-row"><span class="badge">${q.repeatable?'繰返':'一回'}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬 ${q.reward.gold}G／冒険者経験 ${q.reward.advExp}${q.repeatable?`／達成 ${questCompletionCount(q.id)}回`:''}</div></div>${action}</div>`;};
    showModal(`<div class="modal-header"><div><h2>冒険者ギルド《枝角亭》</h2><p>現在の冒険者レベル：<b>${getRank().name}</b>　／　冒険者経験：${state.adventureExp}</p></div><button class="modal-close" data-action="modal-close">×</button></div><h3>一回限りの依頼</h3><div class="list">${fixed.map(row).join('')}</div><h3>繰り返し依頼</h3><div class="list">${repeat.map(row).join('')}</div><p class="note">繰り返し依頼は報告後、すぐに再受注できます。冒険者レベルを上げるほど、受けられる依頼・店の商品・行動範囲・スタミナ上限が増えます。</p>`);
  }

  function showShop() {
    const available = ['potion','antidote','stamina_tonic', ...(rankAllowed('2') ? ['ether'] : [])].map((id)=>D.ITEM_DEFS[id]);
    showModal(`<div class="modal-header"><div><h2>道具屋</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b></p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list">${available.map((item)=>`<div class="list-row"><span class="badge">道具</span><div class="row-main"><strong>${item.name}</strong><div class="meta">${item.description}</div></div><div><div class="value">${item.buy}G</div><button class="small-button" data-action="buy-item" data-id="${item.id}" ${state.gold < item.buy?'disabled':''}>買う</button></div></div>`).join('')}</div>`);
  }

  function showCraft() {
    showModal(`<div class="modal-header"><div><h2>製造所</h2><p>素材を組み合わせ、道具や固有装備を作ります。固有装備は完成時に自動装備します。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list">${Object.values(D.RECIPES).map((r)=>{const complete=state.crafted.includes(r.id);return `<div class="list-row"><span class="badge">製造</span><div class="row-main"><strong>${r.name}${complete?'（完成済）':''}</strong><div class="meta">${r.description}</div><div class="meta">材料：${r.ingredients.map((ing)=>`${D.ITEM_DEFS[ing.id].name} ${countItem(ing.id)}/${ing.qty}`).join('　')}</div></div><button class="small-button" data-action="craft" data-id="${r.id}" ${!canCraft(r)?'disabled':''}>作る</button></div>`}).join('')}</div>`);
  }

  function showInn() {
    showModal(`<div class="modal-header"><div><h2>宿屋《風見鶏》</h2><p>20Gで三人のHP・MPと、パーティのスタミナを全回復します。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="card"><div class="meter-label"><span>スタミナ ${state.stamina.current}/${getStaminaMax()}</span><span>宿泊後 ${getStaminaMax()}/${getStaminaMax()}</span></div><div class="meter stamina"><span style="width:${pct(state.stamina.current,getStaminaMax())}%"></span></div><p class="dialogue-text">白零「今日は、休みましょう。明日も歩くために。」

虹全「賛成。温かいものも食べたい。」

黒零「……眠れるなら、それでいい。」</p><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="rest" ${state.gold<20?'disabled':''}>20Gで泊まる</button></div></div>`);
  }

  function showSell() {
    const materials = Object.values(D.ITEM_DEFS).filter((item)=>item.type==='material' && countItem(item.id)>0);
    showModal(`<div class="modal-header"><div><h2>素材買取所</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b></p></div><button class="modal-close" data-action="modal-close">×</button></div>${materials.length?`<div class="list">${materials.map((item)=>`<div class="list-row"><span class="badge">素材</span><div class="row-main"><strong>${item.name} ×${countItem(item.id)}</strong><div class="meta">${item.description}</div></div><div><div class="value">${item.sell}G</div><button class="small-button" data-action="sell-item" data-id="${item.id}">1つ売る</button></div></div>`).join('')}</div>`:'<div class="empty-state">売却できる素材がありません。</div>'}`);
  }

  function showCharacterDetails(id) {
    const def=getDef(id),ch=getChar(id),stats=getStats(id),equip=state.equipment[id]?D.EQUIPMENT_DEFS[state.equipment[id]]:null;const traits=(def.traits||[]).map(t=>`<div class="trait-box"><b>${t.name}</b><br>${t.description}</div>`).join('');const skills=currentSkills(id);
    showModal(`<div class="modal-header"><div><h2>${def.name}</h2><p>${def.subtitle}</p></div><button class="modal-close" data-action="modal-close">×</button></div><canvas class="portrait-large" style="width:150px;height:200px;display:block;margin:8px auto 14px;" data-portrait="${id}" width="112" height="156"></canvas><p class="dialogue-text">${def.intro}</p><div class="trait-box"><b>現在の旅の立ち位置</b><br>${id==='rainbow'?'二人の間に立ち、答えを急がずに進む。':id==='white'?'守る理由を、少しずつ自分の言葉で探している。':'終わらせる力の先に、残したいものを探している。'}<br><span class="note">遠い未来：${def.teriosName}</span></div><div class="stat-grid">${[['最大HP',stats.maxHp],['最大MP',stats.maxMp],['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['幸運',stats.luck]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div><h3>種族特性</h3>${traits}<h3>習得技と習熟度</h3><div class="list">${skills.map(sk=>`<div class="list-row"><span class="badge">Lv.${skillMasteryLevel(id,sk.id)}</span><div class="row-main"><strong>${sk.name}</strong><div class="meta">${sk.description}</div><div class="meta">${skillMasteryLabel(id,sk.id)}</div></div></div>`).join('')}</div><p>装備：${equip?`${equip.name} — ${equip.description}`:'なし'}</p>`);window.requestAnimationFrame(drawVisibleCanvases);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function renderDialogueText(text) {
    const lines = String(text).split('\n').filter((line) => line.trim());
    return `<div class="dialogue-lines">${lines.map((line) => {
      const match = line.match(/^(虹全|白零|黒零|治療師|受付|ギルド係)「(.+)」$/);
      if (!match) return `<div class="dialogue-line narration">${escapeHtml(line)}</div>`;
      const short = match[1];
      const klass = short === '虹全' ? 'kouzen' : short === '白零' ? 'hakurei' : short === '黒零' ? 'kokurei' : 'narration';
      return `<div class="dialogue-line ${klass}"><span class="speaker">${escapeHtml(short)}</span>${escapeHtml(match[2])}</div>`;
    }).join('')}</div>`;
  }

  function showDialogue(title, text) {
    showModal(`<div class="modal-header"><div><h2>${title}</h2><div class="dialogue-scene">STORY LOG</div></div><button class="modal-close" data-action="modal-close">×</button></div><div class="divider"></div><div class="dialogue-speaker">全零〈オムニル〉</div>${renderDialogueText(text)}<div class="modal-footer"><button class="primary-button" data-action="modal-close">閉じる</button></div>`);
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
    const audioState = state.audio.music ? 'オン' : 'オフ';
    showModal(`<div class="modal-header"><div><h2>メニュー</h2><p>この試作版はブラウザの保存領域に自動セーブします。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list"><button class="list-row" data-action="toggle-audio"><span class="badge">音楽</span><span class="row-main"><strong>BGM：${audioState}</strong><span class="meta">場所・戦闘に応じたチップ・アンビエントBGMを切り替える。</span></span></button><button class="list-row" data-action="save"><span class="badge">保存</span><span class="row-main"><strong>今すぐセーブ</strong><span class="meta">現在の進行・パネル・習熟度をブラウザに保存する。</span></span></button><button class="list-row" data-action="reset-confirm"><span class="badge locked">初期化</span><span class="row-main"><strong>最初からやり直す</strong><span class="meta">セーブデータを初期状態に戻す。</span></span></button></div><div class="audio-note">スマホでは、最初のタップ後に音が鳴ります。音楽は外部素材を使わないゲーム内生成音です。</div>`);
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
    audio.resume();
    if (a !== 'modal-close') audio.sfx('tap');
    if (a === 'start') startGame();
    else if (a === 'go-world') { state.scene='world'; saveGame(); render(); }
    else if (a === 'go-party') { state.scene='party'; render(); }
    else if (a === 'enter-location') enterLocation(id);
    else if (a === 'explore') explore(id);
    else if (a === 'auto-explore') startAutoExplore(id);
    else if (a === 'auto-explore-open') openAutoExploreSetup(id);
    else if (a === 'auto-explore-confirm') { const floor=document.getElementById('autoStaminaFloor')?.value || 0; closeModal(); startAutoExplore(id,floor); }
    else if (a === 'cancel-auto-explore') stopAutoExplore();
    else if (a === 'facility') openFacility(id);
    else if (a === 'open-panel') { state.selectedCharacter=id; state.scene='panel'; render(); }
    else if (a === 'open-character') { state.selectedCharacter=id; state.scene='party'; render(); }
    else if (a === 'view-character') showCharacterDetails(id);
    else if (a === 'unlock-panel') unlockPanel(id,target.dataset.panel);
    else if (a === 'panel-select') { state.panelUi.selected[id]=target.dataset.panel; render(); }
    else if (a === 'panel-branch') { state.panelUi.branch[id]=target.dataset.branch; state.panelUi.selected[id]=null; render(); }
    else if (a === 'panel-unlock-selected') unlockPanel(id,target.dataset.panel);
    else if (a === 'quest-accept') { closeModal(); acceptQuest(id); }
    else if (a === 'quest-complete') { closeModal(); completeQuest(id); }
    else if (a === 'buy-item') { buyItem(id); if(modalLayer.classList.contains('open')) showShop(); }
    else if (a === 'craft') { craft(id); if(modalLayer.classList.contains('open')) showCraft(); }
    else if (a === 'sell-item') { sellItem(id); if(modalLayer.classList.contains('open')) showSell(); }
    else if (a === 'rest') { closeModal(); restAtInn(); }
    else if (a === 'use-item-world') useItemOutside(id);
    else if (a === 'use-stamina-item') useStaminaItem(id);
    else if (a === 'use-item-outside-target') useItemOutsideTarget(target.dataset.item,id);
    else if (a === 'battle-command') battleCommand(target.dataset.command);
    else if (a === 'battle-skill') useBattleSkill(id);
    else if (a === 'battle-item') useBattleItem(id);
    else if (a === 'battle-target-enemy') targetEnemy(target.dataset.index);
    else if (a === 'battle-target-ally') targetAlly(id);
    else if (a === 'battle-back') { if(state.battle&&!state.battle.auto){state.battle.phase='command';state.battle.selected=null;render();} }
    else if (a === 'toggle-battle-auto') toggleBattleAuto();
    else if (a === 'modal-close') closeModal();
    else if (a === 'toggle-audio') { toggleAudio(); showSystemMenu(); }
    else if (a === 'save') { saveGame(true); closeModal(); }
    else if (a === 'reset-confirm') confirmReset();
    else if (a === 'reset') resetGame();
  });

  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => {
    audio.resume(); audio.sfx('tap');
    const page=button.dataset.nav; state.scene=page; render();
  }));
  document.getElementById('audioButton')?.addEventListener('click', toggleAudio);
  document.getElementById('saveButton').addEventListener('click', ()=>{ audio.resume(); audio.sfx('tap'); saveGame(true); });
  document.getElementById('menuButton').addEventListener('click', ()=>{ audio.resume(); audio.sfx('tap'); showSystemMenu(); });
  document.getElementById('homeButton').addEventListener('click', ()=>{audio.resume(); audio.sfx('tap'); state.scene='title';render();});
  modalLayer.addEventListener('click', (event) => { if(event.target === modalLayer) closeModal(); });

  window.setInterval(() => {
    const before=state.stamina?.current; refreshStamina();
    if(state.stamina?.current!==before && state.scene!=='battle') { saveGame(); render(); }
  }, 60000);

  render();
})();
