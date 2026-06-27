/* 全零〈オムニル〉— 星なき始まり — prototype v0.7 地方ギルド・装備拡張版 */
(() => {
  'use strict';

  const D = window.OMNIL_DATA;
  const SAVE_KEY = 'omnil_rpg_prototype_v07';
  const STAMINA_RECOVERY_MS = 3 * 60 * 1000;
  const AUTO_STAMINA_MULTIPLIER = 1.5;
  const STAMINA_EPSILON = 0.0001;
  const EQUIP_SLOTS = ['head','body','arms','legs','accessory1','accessory2'];
  const EQUIP_SLOT_LABELS = { head:'頭', body:'体', arms:'腕', legs:'足', accessory1:'装飾1', accessory2:'装飾2' };
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
  const formatStamina = (n) => Number.isInteger(Number(n)) ? String(Math.round(Number(n))) : Number(n).toFixed(1).replace(/\.0$/, '');

  function freshState() {
    const characters = {};
    Object.values(D.CHARACTER_DEFS).forEach((def) => {
      characters[def.id] = {
        id: def.id,
        level: 1,
        exp: 0,
        panelPoints: 3,
        unlockedPanels: def.panels.filter((p) => p.cost === 0).map((p) => p.id),
        skillMastery: {},
        hp: def.base.maxHp,
        mp: def.base.maxMp,
      };
    });
    return {
      version: 7,
      started: false,
      scene: 'title',
      currentLocation: 'lindholm',
      selectedCharacter: 'rainbow',
      gold: 120,
      adventureExp: 0,
      stamina: { current: 100, updatedAt: Date.now() },
      inventory: { potion: 3, ether: 1, herb: 1, stamina_tonic: 3, stamina_draught: 1 },
      equipment: { rainbow: emptyEquipmentLoadout(), white: emptyEquipmentLoadout(), black: emptyEquipmentLoadout() },
      ownedEquipment: [],
      crafted: [], activeQuests: [], completedQuests: [], questCompletions: {}, kills: {},
      panelUi: { selected: { rainbow: null, white: null, black: null }, branch: { rainbow: 'overview', white: 'overview', black: 'overview' } },
      explorationUi: { selectedDifficulty: { windy_plain: 'beginner', whisper_woods: 'beginner', fallen_ruins: 'beginner', brook_meadows: 'beginner', iron_hills: 'beginner', moss_depths: 'beginner', moonfog_marsh: 'beginner', crystal_cavern: 'beginner', starfall_ridge: 'beginner', frost_wastes: 'beginner', north_observatory: 'beginner' } },
      questUi: { tab: 'available' },
      mapUi: { mode: 'region', region: 'lindholm' },
      flags: { v5StarterPoints: true, v6StarterPack: true, v7EquipmentMigration: true },
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
    const previousVersion = Number(candidate?.version || 0);
    const merged = { ...base, ...candidate };
    merged.inventory = { ...base.inventory, ...(candidate.inventory || {}) };
    merged.equipment = { ...base.equipment, ...(candidate.equipment || {}) };
    merged.ownedEquipment = [...new Set([...(candidate.ownedEquipment || [])])];
    // v0.6以前の「1人1装備」セーブを、v0.7の6部位装備へ変換する。
    ['rainbow','white','black'].forEach((id) => {
      const rawOldEquip = candidate?.equipment?.[id];
      const oldEquip = typeof rawOldEquip === 'string' ? (D.EQUIPMENT_DEFS[rawOldEquip] ? rawOldEquip : (D.LEGACY_EQUIPMENT_MAP?.[rawOldEquip] || rawOldEquip)) : rawOldEquip;
      const loadout = emptyEquipmentLoadout();
      if (typeof oldEquip === 'string' && D.EQUIPMENT_DEFS[oldEquip]) {
        const legacy = D.EQUIPMENT_DEFS[oldEquip];
        const legacySlot = legacy.slot === 'accessory' || legacy.slot === 'charm' || legacy.slot === 'ring' ? 'accessory1' : legacy.slot === 'armor' ? 'body' : legacy.slot === 'weapon' ? 'arms' : legacy.slot || 'accessory1';
        if (EQUIP_SLOTS.includes(legacySlot)) loadout[legacySlot] = oldEquip;
        merged.ownedEquipment.push(oldEquip);
      } else if (oldEquip && typeof oldEquip === 'object') {
        EQUIP_SLOTS.forEach((slot) => { if (oldEquip[slot] && D.EQUIPMENT_DEFS[oldEquip[slot]]) loadout[slot] = oldEquip[slot]; });
      }
      merged.equipment[id] = { ...loadout, ...(typeof oldEquip === 'object' ? oldEquip : {}) };
      EQUIP_SLOTS.forEach((slot) => { const equipId = merged.equipment[id][slot]; if (equipId && D.EQUIPMENT_DEFS[equipId]) merged.ownedEquipment.push(equipId); });
    });
    merged.ownedEquipment = [...new Set(merged.ownedEquipment.filter((id) => D.EQUIPMENT_DEFS[id]))];
    merged.audio = { ...base.audio, ...(candidate.audio || {}) };
    merged.automation = { ...base.automation, ...(candidate.automation || {}) };
    merged.flags = { ...base.flags, ...(candidate.flags || {}) };
    merged.questCompletions = { ...(candidate.questCompletions || {}) };
    merged.stamina = { ...base.stamina, ...(candidate.stamina || {}) };
    merged.panelUi = { ...base.panelUi, ...(candidate.panelUi || {}), selected: { ...base.panelUi.selected, ...(candidate.panelUi?.selected || {}) }, branch: { ...base.panelUi.branch, ...(candidate.panelUi?.branch || {}) } };
    merged.explorationUi = { ...base.explorationUi, ...(candidate.explorationUi || {}), selectedDifficulty: { ...base.explorationUi.selectedDifficulty, ...(candidate.explorationUi?.selectedDifficulty || {}) } };
    merged.questUi = { ...base.questUi, ...(candidate.questUi || {}) };
    merged.mapUi = { ...base.mapUi, ...(candidate.mapUi || {}) };
    merged.characters = { ...base.characters, ...(candidate.characters || {}) };
    Object.keys(base.characters).forEach((id) => {
      const old = candidate.characters?.[id] || {};
      merged.characters[id] = { ...base.characters[id], ...old, skillMastery: { ...(old.skillMastery || {}) } };
      const validPanels = new Set(D.CHARACTER_DEFS[id].panels.map((panel) => panel.id));
      const oldPanels = (old.unlockedPanels || []).filter((panelId) => validPanels.has(panelId));
      merged.characters[id].unlockedPanels = [...new Set([...base.characters[id].unlockedPanels, ...oldPanels])];
      if (previousVersion < 5 && !candidate.flags?.v5StarterPoints) merged.characters[id].panelPoints = (Number(merged.characters[id].panelPoints) || 0) + 3;
      capResources(id, merged);
    });
    if (previousVersion < 5) {
      merged.stamina.current = Math.max(Number(merged.stamina.current) || 0, 100);
      merged.flags.v5StarterPoints = true;
      merged.logs = ['v0.5移行：初期スタミナ100／各キャラに成長PT+3を反映。', ...(candidate.logs || [])].slice(0, 30);
    }
    if (previousVersion < 6 && !candidate.flags?.v6StarterPack) {
      merged.inventory.stamina_tonic = Math.max(Number(merged.inventory.stamina_tonic)||0, 3);
      merged.inventory.stamina_draught = Math.max(Number(merged.inventory.stamina_draught)||0, 1);
      merged.flags.v6StarterPack = true;
      merged.logs = ['v0.6移行：オート探索用の活力剤を配布。世界地図・追加地域・レア敵を解放しました。', ...(candidate.logs || [])].slice(0, 40);
    }
    if (previousVersion < 7 && !candidate.flags?.v7EquipmentMigration) {
      merged.flags.v7EquipmentMigration = true;
      merged.logs = ['v0.7移行：装備を頭・体・腕・足・装飾1・装飾2の6部位に再編しました。仲間画面から装備を整えてください。', ...(candidate.logs || [])].slice(0, 40);
    }
    merged.version = 7;
    merged.stamina.current = Math.max(0, Number(merged.stamina.current) || base.stamina.current);
    merged.stamina.updatedAt = Number(merged.stamina.updatedAt) || Date.now();
    merged.scene = 'title';
    merged.battle = null;
    merged.autoExplore = null;
    return merged;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('omnil_rpg_prototype_v06') || localStorage.getItem('omnil_rpg_prototype_v05') || localStorage.getItem('omnil_rpg_prototype_v04') || localStorage.getItem('omnil_rpg_prototype_v03') || localStorage.getItem('omnil_rpg_prototype_v01');
      return raw ? normalizeState(JSON.parse(raw)) : freshState();
    } catch (error) {
      console.warn('セーブ読み込み失敗', error);
      return freshState();
    }
  }

  let state = loadState();

  function desiredAudioTheme() {
    if (state.scene === 'title') return 'title';
    if (state.scene === 'battle') return state.battle?.enemies?.some((e)=>e.boss) ? 'boss' : 'battle';
    const locationId = state.currentLocation;
    if (D.LOCATIONS[locationId]?.type === 'town') return 'town';
    if (['windy_plain','brook_meadows','iron_hills'].includes(locationId)) return 'plain';
    if (['whisper_woods','moss_depths'].includes(locationId)) return 'forest';
    if (['fallen_ruins','north_observatory','drowned_archive'].includes(locationId)) return 'ruins';
    if (['crystal_cavern'].includes(locationId)) return 'cave';
    if (['moonfog_marsh'].includes(locationId)) return 'marsh';
    if (['frost_wastes'].includes(locationId)) return 'frost';
    if (['ember_beach','caldera_path'].includes(locationId)) return 'coast';
    if (['starfall_ridge','shadow_gorge','sword_graves','balance_sanctum'].includes(locationId)) return 'dusk';
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
  function getStaminaMax() { return getRank().maxStamina || 100; }
  function refreshStamina() {
    state.stamina ||= { current: getStaminaMax(), updatedAt: Date.now() };
    const max = getStaminaMax();
    const now = Date.now();
    const elapsed = Math.max(0, now - (Number(state.stamina.updatedAt) || now));
    const gained = Math.floor(elapsed / STAMINA_RECOVERY_MS);
    // 回復薬で上限を超えた分は維持し、自然回復だけが上限で止まる。
    if (gained > 0 && state.stamina.current < max) {
      state.stamina.current = Math.min(max, state.stamina.current + gained);
      state.stamina.updatedAt = (Number(state.stamina.updatedAt) || now) + gained * STAMINA_RECOVERY_MS;
    }
    if (state.stamina.current >= max - STAMINA_EPSILON) state.stamina.updatedAt = now;
    return gained;
  }
  function staminaRecoveryLabel() {
    refreshStamina();
    const max = getStaminaMax();
    if (state.stamina.current > max + STAMINA_EPSILON) return `超過 +${formatStamina(state.stamina.current - max)}`;
    if (state.stamina.current >= max - STAMINA_EPSILON) return '満タン';
    const remain = STAMINA_RECOVERY_MS - ((Date.now() - state.stamina.updatedAt) % STAMINA_RECOVERY_MS);
    return `次回 ${Math.max(1, Math.ceil(remain / 60000))}分後`;
  }
  function canSpendStamina(amount, floor = 0) {
    refreshStamina();
    const requiredRemaining = Math.max(0, Number(floor) || 0);
    return state.stamina.current - Number(amount) >= requiredRemaining - STAMINA_EPSILON;
  }
  function spendStamina(amount, reason, options = {}) {
    refreshStamina();
    const actual = Math.min(Math.max(0, Number(amount) || 0), state.stamina.current);
    state.stamina.current = Math.max(0, state.stamina.current - actual);
    state.stamina.updatedAt = Date.now();
    appendLog(`${reason}：スタミナ -${formatStamina(actual)}`);
    // v0.7：スタミナ0は「探索を始められない」だけ。戦闘敗北や撤退ペナルティにはしない。
    if (state.stamina.current <= STAMINA_EPSILON) state.stamina.current = 0;
    return true;
  }
  function restoreStamina(amount, note = 'スタミナが回復した。', options = {}) {
    refreshStamina();
    const before = state.stamina.current;
    const cap = options.allowOvercap ? Number.POSITIVE_INFINITY : getStaminaMax();
    state.stamina.current = clamp(state.stamina.current + Number(amount || 0), 0, cap);
    state.stamina.updatedAt = Date.now();
    const restored = state.stamina.current - before;
    if (restored > 0) appendLog(`${note}（+${formatStamina(restored)}）`);
    return restored;
  }

  function emptyEquipmentLoadout() { return { head:null, body:null, arms:null, legs:null, accessory1:null, accessory2:null }; }
  function getDef(id) { return D.CHARACTER_DEFS[id]; }
  function getChar(id) { return state.characters[id]; }
  function getEquipmentLoadout(id, localState = state) {
    const current = localState.equipment?.[id];
    if (current && typeof current === 'object') return { ...emptyEquipmentLoadout(), ...current };
    return emptyEquipmentLoadout();
  }
  function getEquippedEquipment(id, localState = state) {
    const loadout = getEquipmentLoadout(id, localState);
    return EQUIP_SLOTS.map((slot) => loadout[slot]).filter(Boolean).map((equipId) => D.EQUIPMENT_DEFS[equipId]).filter(Boolean);
  }
  function equipmentAllows(id, equip) {
    return !equip?.allowed || equip.allowed === 'all' || (Array.isArray(equip.allowed) && equip.allowed.includes(id));
  }
  function equipmentSpecialText(equip) { return equip?.specialText || ''; }
  function getEquipmentSpecials(id, localState = state) {
    const total = {};
    getEquippedEquipment(id, localState).forEach((equip) => Object.entries(equip.special || {}).forEach(([key, value]) => { total[key] = (total[key] || 0) + Number(value || 0); }));
    return total;
  }
  function getPartyEquipmentSpecials(localState = state) {
    const total = {};
    ['rainbow','white','black'].forEach((id) => Object.entries(getEquipmentSpecials(id, localState)).forEach(([key,value]) => { total[key] = (total[key] || 0) + Number(value || 0); }));
    return total;
  }
  function ownedEquipment() { return (state.ownedEquipment || []).map((id) => D.EQUIPMENT_DEFS[id]).filter(Boolean); }
  function addOwnedEquipment(equipId) { if (!D.EQUIPMENT_DEFS[equipId]) return false; state.ownedEquipment ||= []; if (state.ownedEquipment.includes(equipId)) return false; state.ownedEquipment.push(equipId); return true; }
  function removeEquippedItemEverywhere(equipId) {
    ['rainbow','white','black'].forEach((id) => { const loadout = getEquipmentLoadout(id); EQUIP_SLOTS.forEach((slot) => { if (loadout[slot] === equipId) loadout[slot] = null; }); state.equipment[id] = loadout; });
  }
  function equipEquipment(id, slot, equipId) {
    const equip = D.EQUIPMENT_DEFS[equipId];
    if (!equip || !EQUIP_SLOTS.includes(slot) || !state.ownedEquipment?.includes(equipId) || !equipmentAllows(id, equip)) return false;
    const slotOk = equip.slot === 'accessory' ? slot.startsWith('accessory') : equip.slot === slot;
    if (!slotOk) return false;
    removeEquippedItemEverywhere(equipId);
    const loadout = getEquipmentLoadout(id); loadout[slot] = equipId; state.equipment[id] = loadout;
    capResources(id); appendLog(`${getDef(id).short}が${equip.name}を${EQUIP_SLOT_LABELS[slot]}に装備。`); saveGame(); return true;
  }
  function unequipEquipment(id, slot) { if (!EQUIP_SLOTS.includes(slot)) return; const loadout = getEquipmentLoadout(id); const old = loadout[slot]; loadout[slot] = null; state.equipment[id] = loadout; capResources(id); if (old) appendLog(`${getDef(id).short}が${D.EQUIPMENT_DEFS[old]?.name || '装備'}を外した。`); saveGame(); }

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
    const equipTotals = {};
    getEquippedEquipment(id, localState).forEach((equip) => Object.entries(equip.stats || {}).forEach(([key, value]) => { equipTotals[key] = (equipTotals[key] || 0) + Number(value || 0); }));
    const stats = {};
    Object.keys(def.base).forEach((key) => {
      stats[key] = def.base[key] + (def.growth[key] || 0) * (ch.level - 1) + (effects[key] || 0) + (equipTotals[key] || 0);
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
    const max = level >= 10;
    // 高Lvほど必要熟練度は重いが、Lv.6から持続効果、Lv.10で極意補正を得る。
    return { level, potency: 1 + (level - 1) * (skill.mastery?.powerRate || .1) + (max ? .18 : 0), durationBonus: level >= 6 ? 1 : 0, max };
  }

  function skillMpCost(id, skill) {
    const discount = getEquipmentSpecials(id).mpCostRate || 0;
    return Math.max(1, Math.ceil(Number(skill.mp || 0) * Math.max(.5, 1 + discount)));
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

  function currentRegionId() {
    return D.LOCATIONS[state.currentLocation]?.region || state.mapUi?.region || 'lindholm';
  }
  function questInRegion(q, region = null) { return !region || (q.region || 'lindholm') === region; }
  function questProgress(q) {
    if (q.type === 'collect') return countItem(q.target);
    return state.kills[q.target] || 0;
  }
  function isQuestAvailable(q) { return state.adventureExp >= q.unlockAt && rankAllowed(q.rank); }
  function isQuestActive(id) { return state.activeQuests.includes(id); }
  function isQuestDone(id) { const q = D.QUESTS[id]; return !!q && !q.repeatable && state.completedQuests.includes(id); }
  function questCompletionCount(id) { return state.questCompletions?.[id] || (state.completedQuests.includes(id) ? 1 : 0); }
  function canCompleteQuest(q) { return isQuestActive(q.id) && questProgress(q) >= q.amount; }
  function getAcceptableQuests(region = null) {
    return Object.values(D.QUESTS).filter((q) => questInRegion(q, region) && isQuestAvailable(q) && !isQuestActive(q.id) && (q.repeatable || !isQuestDone(q.id)));
  }
  function getActiveQuests(region = null) { return state.activeQuests.map((id) => D.QUESTS[id]).filter(Boolean).filter((q) => questInRegion(q, region)); }
  function getCompletableQuests(region = null, type = null) { return getActiveQuests(region).filter((q) => !type || q.type === type).filter(canCompleteQuest); }
  function getRepeatQuests(region = null, type = null) { return Object.values(D.QUESTS).filter((q) => q.repeatable && questInRegion(q,region) && (!type || q.type === type) && (isQuestAvailable(q) || isQuestActive(q.id))); }

  function acceptQuest(id, options = {}) {
    const q = D.QUESTS[id];
    if (!q || !isQuestAvailable(q) || isQuestActive(id) || (!q.repeatable && isQuestDone(id))) return false;
    state.activeQuests.push(id);
    appendLog(`依頼を受注：「${q.name}」`);
    if (!options.silent) toast(`依頼を受注しました：${q.name}`, 'good');
    saveGame();
    if (!options.keepView) render();
    return true;
  }

  function acceptAllAvailableQuests(context = 'guild', region = null, type = null) {
    const quests = getAcceptableQuests(region).filter((q) => !type || q.type === type);
    let accepted = 0;
    quests.forEach((q) => { if (acceptQuest(q.id, { silent: true, keepView: true })) accepted += 1; });
    if (!accepted) return toast('受注できる依頼はありません。', 'warn');
    appendLog(`受注可能な依頼を${accepted}件まとめて受注。`);
    saveGame(); render();
    if (context === 'guild') showGuild();
    toast(`受注可能な依頼を${accepted}件、まとめて受注しました。`, 'good');
  }

  function completeQuest(id, options = {}) {
    const q = D.QUESTS[id];
    if (!q || !canCompleteQuest(q)) return null;
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
    const result = { id, name:q.name, gold:q.reward.gold, advExp:q.reward.advExp, repeatable:!!q.repeatable, items:q.reward.items || [] };
    saveGame();
    if (!options.silent) {
      toast(`依頼を報告しました：${q.name}`, 'good');
      if (!options.keepView) {
        render();
        const extra = id === 'q_herb'
          ? '\n\n治療師は、薬草を抱えて何度も頭を下げた。\n白零「……よかった。間に合ったんですね。」\n虹全「うん。白零が見つけてくれたからだ。」\n白零「私が……役に立てた？」\n虹全「もちろん。」\n\n【物語パネル：「守りたい」が解放条件を満たしました】'
          : id === 'q_boss'
            ? '\n\n黒零は、獣王が去った森をしばらく見ていた。\n黒零「……静かになった。」\n虹全「もう、怯えなくていい。」\n黒零「うん。この森は、壊させない。」\n\n【物語パネル：「壊したくない」が解放条件を満たしました】'
            : q.repeatable ? `\n\nこの依頼は繰り返し受注できます。今回の達成回数：${questCompletionCount(id)}回` : '';
        showDialogue('依頼達成', `《ギルド》の受付は、静かに報酬を差し出した。\n「助かったよ。次も頼りにしている。」${extra}`);
      }
    }
    return result;
  }

  function completeAllQuests(region = null, type = null, context = 'guild') {
    const targets = getCompletableQuests(region, type);
    if (!targets.length) return toast('まとめて報告できる依頼はありません。', 'warn');
    const results = targets.map((q) => completeQuest(q.id, { silent:true, keepView:true })).filter(Boolean);
    const gold = results.reduce((n,r) => n + r.gold, 0); const adv = results.reduce((n,r) => n + r.advExp, 0);
    appendLog(`${results.length}件の依頼をまとめて報告。`);
    saveGame(); render();
    if (context === 'guild') showGuild();
    toast(`${results.length}件をまとめて報告。${gold}G／冒険者経験${adv}を獲得。`, 'good');
  }

  function canCraft(recipe) {
    if (recipe.minLevel && !rankAllowed(String(recipe.minLevel))) return false;
    if (recipe.output.type === 'equipment' && state.ownedEquipment?.includes(recipe.output.id)) return false;
    return recipe.ingredients.every((ing) => countItem(ing.id) >= ing.qty);
  }

  function craft(id) {
    const recipe = D.RECIPES[id];
    if (!recipe || !canCraft(recipe)) return false;
    recipe.ingredients.forEach((ing) => takeItem(ing.id, ing.qty));
    if (recipe.output.type === 'item') addItem(recipe.output.id, recipe.output.qty);
    if (recipe.output.type === 'equipment') {
      addOwnedEquipment(recipe.output.id);
      if (!state.crafted.includes(recipe.id)) state.crafted.push(recipe.id);
    }
    appendLog(`製造した：${recipe.name}`);
    toast(`製造完了：${recipe.name}`, 'good');
    saveGame(); render();
    return true;
  }

  function buyItem(id) {
    const item = D.ITEM_DEFS[id];
    if (!item?.buy || state.gold < item.buy) return false;
    state.gold -= item.buy;
    addItem(id, 1);
    toast(`${item.name}を購入しました。`, 'good');
    saveGame(); render();
    return true;
  }
  function buyEquipment(id) {
    const equip = D.EQUIPMENT_DEFS[id];
    if (!equip?.price || state.gold < equip.price || state.ownedEquipment?.includes(id) || (equip.minLevel && !rankAllowed(String(equip.minLevel)))) return false;
    state.gold -= equip.price;
    addOwnedEquipment(id);
    appendLog(`${equip.name}を購入した。`);
    toast(`${equip.name}を購入。仲間画面で装備できます。`, 'good');
    saveGame(); render();
    return true;
  }

  function sellItem(id) {
    const item = D.ITEM_DEFS[id];
    if (!item || item.type !== 'material' || countItem(id) <= 0) return;
    takeItem(id, 1);
    state.gold += item.sell;
    toast(`${item.name}を${item.sell}Gで売却しました。`);
    saveGame(); render();
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
      <div class="status-stamina"><div class="meter-label"><span>スタミナ ${formatStamina(state.stamina.current)}/${max}</span><span>${staminaRecoveryLabel()}</span></div><div class="meter stamina"><span style="width:${pct(state.stamina.current,max)}%"></span></div></div>
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
        <div class="hero-eyebrow">PIXEL FANTASY RPG　— REGION & EQUIPMENT BUILD v0.7 —</div>
        <h1>全零〈オムニル〉<br><span class="rainbow-text">星なき始まり</span></h1>
        <p>何も持たなかった三人が、出会いと旅の中で自分の意志を見つけていく。<br>白、黒、そして虹。零から始まる、三人の物語。</p>
        <div class="button-row">
          <button class="primary-button" data-action="start">${state.started ? '旅を続ける' : '物語を始める'}</button>
          ${state.started ? '<button class="secondary-button" data-action="open-report">更新報告</button><button class="secondary-button" data-action="reset-confirm">最初からやり直す</button>' : '<button class="secondary-button" data-action="open-report">更新報告</button>'}
        </div>
      </div>
    </section>
    <h2 class="section-title">v0.7で遊べること</h2>
    <div class="grid three">
      <article class="card"><h3>◫ 4地方と探索</h3><p>リンドホルム、白霜北域、緋火海岸、暮影峡谷。町4・探索地21を、初級・中級・上級から選べる。</p></article>
      <article class="card"><h3>⚔ 戦闘と装備</h3><p>3人コマンド戦闘＋AUTO対応。頭・体・腕・足・装飾2枠の6部位装備で、特殊効果も組み合わせる。</p></article>
      <article class="card"><h3>◉ ギルドと育成</h3><p>地方別依頼、納品・討伐の繰り返し依頼、一括受注・一括報告。成長パネルと技熟練Lv.10を育てる。</p></article>
    </div>
    <p class="note">※現在のマップ・人物・敵は「遊びの芯を確認するための仮ドット」。次段階で世界の色設計、地形タイル、立ち絵、敵アニメーションまで本制作します。</p>`;
  }

  function renderWorld() {
    const next = expToNextRank();
    state.mapUi ||= { mode:'region', region:'lindholm' };
    const mode = state.mapUi.mode || 'region';
    const regionId = state.mapUi.region || 'lindholm';
    const region = D.REGIONS?.[regionId] || { name:'リンドホルム地方', description:'第一章の舞台。', label:'第一章：星なき始まり' };
    if (mode === 'world') {
      const regionCards = Object.values(D.REGIONS || {}).map((r) => {
        const unlocked = rankAllowed(r.unlockRank || '1');
        const active = r.id === regionId;
        return `<button class="world-region-card ${active?'active':''} ${unlocked?'':'locked'}" data-action="map-select-region" data-id="${r.id}" ${unlocked?'':'disabled'}><span>${unlocked?'◆':'▣'}</span><b>${r.name}</b><small>${unlocked ? r.label : `要 冒険者Lv.${r.unlockRank}`}</small><em>${r.description}</em></button>`;
      }).join('');
      return `${renderStatusStrip()}${renderPartyStrip()}<h1 class="page-title">世界地図</h1><p class="page-subtitle">旅の足跡が広がるにつれ、地方地図を選んで各地へ移動できます。現在の実装では、リンドホルム地方・白霜北域・緋火海岸・暮影峡谷を順に探索できます。</p>
        <div class="map-shell world-map-shell"><canvas id="worldCanvas" class="map-canvas" width="800" height="500"></canvas></div>
        <div class="world-region-grid">${regionCards}</div>
        <div class="button-row" style="margin-top:14px;"><button class="primary-button" data-action="map-mode" data-mode="region">${region.name}の地方地図を見る</button></div>
        <h2 class="section-title">次の冒険者レベルまで</h2><div class="card"><div class="meter-label"><span>${getRank().name}　冒険者経験 ${state.adventureExp}</span><span>${next ? `${next}で次のLv` : '最高Lv'}</span></div><div class="meter exp"><span style="width:${next ? pct(state.adventureExp - getRank().threshold, next - getRank().threshold) : 100}%"></span></div></div>`;
    }
    const locations = Object.values(D.LOCATIONS).filter((loc)=>loc.region === regionId);
    return `${renderStatusStrip()}${renderPartyStrip()}
      <div class="map-heading-row"><div><h1 class="page-title">${region.name} 地方地図</h1><p class="page-subtitle">${region.description}</p><p class="region-story">${D.REGION_STORIES?.[regionId] || ''}</p></div><button class="small-button" data-action="map-mode" data-mode="world">世界地図</button></div>
      <div class="map-shell regional-map-shell">
        <canvas id="worldCanvas" class="map-canvas" width="800" height="500"></canvas>
        ${locations.map((loc) => { const unlocked = rankAllowed(loc.rank); return `<button class="map-label location-${loc.type} ${unlocked ? '' : 'locked'}" style="left:${loc.x}%;top:${loc.y}%" data-action="enter-location" data-id="${loc.id}" ${unlocked ? '' : 'disabled'}>${loc.name}<br><small>${unlocked ? (loc.type === 'town' ? '施設を利用' : '探索地へ') : `要 冒険者Lv.${loc.rank}`}</small></button>`; }).join('')}
      </div>
      <div class="map-legend"><span>◆ 町・施設</span><span>◆ 探索地</span><span>▣ 未解放（冒険者Lv条件）</span></div>
      <div class="card" style="margin-top:13px;"><strong>次の冒険者レベルまで</strong><div class="meter-label"><span>${getRank().name}　冒険者経験 ${state.adventureExp}</span><span>${next ? `${next}で次のLv` : '最高Lv'}</span></div><div class="meter exp"><span style="width:${next ? pct(state.adventureExp - getRank().threshold, next - getRank().threshold) : 100}%"></span></div></div>
      <h2 class="section-title">最近の記録</h2><div class="list">${state.logs.slice(0, 5).map((log) => `<div class="list-row"><span class="badge">記録</span><div class="row-main"><div class="meta">${log}</div></div></div>`).join('')}</div>`;
  }

  function getDifficulty(difficultyId) {
    return D.EXPLORATION_DIFFICULTIES?.[difficultyId] || D.EXPLORATION_DIFFICULTIES?.beginner;
  }
  function getSelectedDifficultyId(locationId) {
    const selected = state.explorationUi?.selectedDifficulty?.[locationId] || 'beginner';
    return getDifficulty(selected) && rankAllowed(getDifficulty(selected).rank) ? selected : 'beginner';
  }
  function getSelectedDifficulty(locationId) { return getDifficulty(getSelectedDifficultyId(locationId)); }
  function staminaCost(baseCost, auto = false) { return Number(baseCost) * (auto ? AUTO_STAMINA_MULTIPLIER : 1); }
  function explorationCost(difficulty, auto = false) { return staminaCost(difficulty.explorationCost, auto); }
  function battleCost(difficulty, auto = false) { return staminaCost(difficulty.battleCost, auto); }
  function difficultyColorClass(id) { return id === 'advanced' ? 'advanced' : id === 'intermediate' ? 'intermediate' : 'beginner'; }

  function renderLocation() {
    const loc = D.LOCATIONS[state.currentLocation];
    if (loc.type === 'town') {
      return `${renderStatusStrip()}<button class="small-button" data-action="go-world">← 地方地図へ</button>
        <h1 class="page-title" style="margin-top:13px;">${loc.name}</h1><p class="page-subtitle">${loc.description}</p>
        <div class="location-hero"><canvas id="locationCanvas" class="location-canvas" data-location="${loc.id}" width="800" height="360"></canvas><div class="location-overlay">
          <button class="facility-hotspot" style="left:23%;top:40%;" data-action="facility" data-id="guild">ギルド</button>
          <button class="facility-hotspot" style="left:48%;top:30%;" data-action="facility" data-id="shop">道具屋</button>
          <button class="facility-hotspot" style="left:72%;top:48%;" data-action="facility" data-id="craft">製造所</button>
          <button class="facility-hotspot" style="left:48%;top:70%;" data-action="facility" data-id="inn">宿屋</button>
          <button class="facility-hotspot" style="left:78%;top:73%;" data-action="facility" data-id="sell">買取所</button>
        </div></div><div class="location-caption"><strong>${D.REGIONS?.[loc.region]?.name || 'この地方'}の拠点</strong><p>この地方の依頼、買い物、製造、休息、素材売却を利用できます。宿屋ではスタミナも全回復します。</p></div>
        <h2 class="section-title">施設一覧</h2><div class="facility-grid">${renderFacilityCards()}</div>`;
    }
    const auto = state.autoExplore && state.autoExplore.locationId === loc.id;
    const selectedId = auto ? state.autoExplore.difficultyId : getSelectedDifficultyId(loc.id);
    const selected = getDifficulty(selectedId);
    const difficultyCards = Object.values(D.EXPLORATION_DIFFICULTIES).map((difficulty) => {
      const unlocked = rankAllowed(difficulty.rank);
      const active = selectedId === difficulty.id;
      const cls = difficultyColorClass(difficulty.id);
      return `<button class="difficulty-card ${cls} ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-action="select-explore-difficulty" data-id="${loc.id}" data-difficulty="${difficulty.id}" ${unlocked ? '' : 'disabled'}>
        <span class="difficulty-title"><b>${difficulty.name}</b><small>${unlocked ? `探索 ST ${formatStamina(difficulty.explorationCost)}／戦闘 ST ${formatStamina(difficulty.battleCost)}` : `要 冒険者Lv.${difficulty.rank}`}</small></span>
        <span class="difficulty-info">${difficulty.description}</span>
        <span class="difficulty-reward">敵 ${difficulty.enemyCount[0]}〜${difficulty.enemyCount[1]}体／報酬 ×${difficulty.rewardMultiplier}</span>
      </button>`;
    }).join('');
    return `${renderStatusStrip()}<button class="small-button" data-action="go-world">← 地方地図へ</button>
      <h1 class="page-title" style="margin-top:13px;">${loc.name}</h1><p class="page-subtitle">${loc.description}</p>
      <div class="location-hero"><canvas id="locationCanvas" class="location-canvas" data-location="${loc.id}" width="800" height="360"></canvas></div>${renderPartyStrip()}
      <div class="card exploration-card"><h3>探索の難易度を選ぶ</h3><p>難易度が高いほど敵は強く・多くなりますが、素材量・希少素材・経験値・所持金が増えます。</p>
        <div class="difficulty-grid">${difficultyCards}</div>
        <div class="explore-cost-summary"><span><b>${selected.name}</b></span><span>手動：探索 ST ${formatStamina(explorationCost(selected))}／戦闘 ST ${formatStamina(battleCost(selected))}</span><span>オート：すべて <b>×1.5</b>（探索 ST ${formatStamina(explorationCost(selected,true))}／戦闘 ST ${formatStamina(battleCost(selected,true))}）</span></div>
      ${auto ? `<div class="automation-status"><b>${selected.name}・オート探索中</b><span>下限 ${formatStamina(state.autoExplore.floor)} ／ 現在 ${formatStamina(state.stamina.current)}</span><span>探索 ${state.autoExplore.steps} 回</span><button class="small-button" data-action="cancel-auto-explore">中止</button></div>` : `<div class="button-row" style="margin-top:12px;"><button class="action-button" data-action="explore" data-id="${loc.id}">${selected.name}を開始</button><button class="secondary-button" data-action="auto-explore-open" data-id="${loc.id}">オート探索を設定</button><button class="secondary-button" data-action="go-world">地方地図へ戻る</button></div>`}</div>
      <p class="note">スタミナが0になると探索・オート探索は開始できません。戦闘中に0になっても戦闘は続行し、勝敗による追加ペナルティはありません。</p>`;
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

  function equipmentNameForSlot(id, slot) {
    const equipId = getEquipmentLoadout(id)[slot];
    return equipId ? D.EQUIPMENT_DEFS[equipId]?.name || '不明な装備' : '—';
  }
  function equipmentShortSummary(id) {
    const count = getEquippedEquipment(id).length;
    return `${count}/6部位　${EQUIP_SLOTS.map((slot) => `${EQUIP_SLOT_LABELS[slot]}:${equipmentNameForSlot(id,slot)}`).join('／')}`;
  }
  function renderCharacterCard(id) {
    const def = getDef(id); const ch = getChar(id); const stats = getStats(id);
    const traitText = (def.traits || []).map((t)=>t.name).join('／');
    const skillCount = currentSkills(id).length; const unlocked = { skill:0, passive:0, stat:0 };
    def.panels.forEach((p)=>{ if(ch.unlockedPanels.includes(p.id) && unlocked[p.category] !== undefined) unlocked[p.category] += 1; });
    return `<article class="card character-card"><canvas class="portrait-large" data-portrait="${id}" width="112" height="156"></canvas>
      <div><h2>${def.name}</h2><div class="subtitle">${def.subtitle}　／　${def.role}</div>
      <div class="meter-label"><span>HP ${ch.hp} / ${stats.maxHp}</span><span>Lv.${ch.level}</span></div><div class="meter"><span style="width:${pct(ch.hp,stats.maxHp)}%"></span></div>
      <div class="meter-label"><span>MP ${ch.mp} / ${stats.maxMp}</span><span>経験値 ${ch.exp}/${levelExpRequired(ch.level)}</span></div><div class="meter mp"><span style="width:${pct(ch.mp,stats.maxMp)}%"></span></div>
      <div class="trait-box"><b>種族特性（3）</b><br>${traitText}</div>
      <div class="stat-grid">${[['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['技',`${unlocked.skill}/30`],['常時',`${unlocked.passive}/10`],['能力',`${unlocked.stat}/40`],['PT',ch.panelPoints]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div>
      <div class="equipment-summary"><b>装備（${getEquippedEquipment(id).length}/6）</b><span>${equipmentShortSummary(id)}</span></div>
      <div class="note">習得技：${skillCount}　／　遠い到達点：${def.teriosName}</div>
      <div class="character-actions" style="margin-top:10px;"><button class="small-button" data-action="open-panel" data-id="${id}">成長パネル</button><button class="small-button" data-action="open-equipment" data-id="${id}">装備変更</button><button class="small-button" data-action="view-character" data-id="${id}">人物詳細</button></div></div></article>`;
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
    const id = state.selectedCharacter; const def = getDef(id); const ch = getChar(id);
    const count = { skill: 0, passive: 0, stat: 0 };
    def.panels.forEach((p) => { if (ch.unlockedPanels.includes(p.id) && count[p.category] !== undefined) count[p.category] += 1; });
    const branches = [...new Set(def.panels.filter((p) => p.branch !== 'core').map((p) => p.branch))];
    const active = state.panelUi?.branch?.[id] || 'overview';
    return `${renderStatusStrip()}<button class="small-button" data-action="go-party">← 仲間一覧へ</button><h1 class="page-title" style="margin-top:13px;">${def.name}：成長パネル</h1>
      <p class="page-subtitle">各系統は<b>上から順番</b>に解放します。行き止まりや重なりはなく、次に必要なパネルが常にひとつだけ分かる形です。</p>
      <div class="card panel-summary"><div><strong>所持パネルポイント</strong><div class="note">キャラLv.${ch.level}／${def.role}　—　最初の3PTは、最初の一手を試すための初期ボーナスです。</div></div><strong class="panel-pt">${ch.panelPoints} PT</strong><div class="panel-counts"><span>技 ${count.skill}/30</span><span>常時 ${count.passive}/10</span><span>能力 ${count.stat}/40</span></div></div>
      <div class="panel-tabs"><button class="panel-tab ${active === 'overview' ? 'active' : ''}" data-action="panel-branch" data-id="${id}" data-branch="overview">全体図</button>${branches.map((b) => { const m = panelMeta(id, b); const pr = panelProgress(id, b); return `<button class="panel-tab ${active === b ? 'active' : ''}" data-action="panel-branch" data-id="${id}" data-branch="${b}">${m.icon} ${m.label}<small>${pr[0]}/${pr[1]}</small></button>`; }).join('')}</div>
      ${active === 'overview' ? renderPanelOverview(id, branches) : renderPanelBranch(id, active)}
      ${renderPanelInspector(id)}
      <p class="note">★ 技　◈ パッシブ　＋ 能力値。緑＝解放済、金＝次に解放できるパネル、青灰＝まだ先のパネル。パネル本文をタップすると詳細を確認できます。</p>`;
  }
  function renderPanelOverview(id, branches) {
    return `<div class="panel-overview"><div class="panel-core-v4"><b>${getDef(id).panels.find((p) => p.category === 'core').name}</b><small>根源</small></div>${branches.map((branch) => { const m = panelMeta(id, branch); const pr = panelProgress(id, branch); return `<button class="branch-card branch-${branch}" data-action="panel-branch" data-id="${id}" data-branch="${branch}"><span class="branch-icon">${m.icon}</span><span><b>${m.label}</b><small>${m.description}</small><em>${pr[0]} / ${pr[1]} 解放</em></span></button>`; }).join('')}</div>`;
  }
  function renderPanelBranch(id, branch) {
    const m = panelMeta(id, branch); const panels = getDef(id).panels.filter((p) => p.branch === branch); const [done, total] = panelProgress(id, branch);
    const nextIndex = panels.findIndex((p) => !getChar(id).unlockedPanels.includes(p.id));
    return `<section class="branch-board panel-sequence-board"><header><span class="branch-icon">${m.icon}</span><div><h2>${m.label}</h2><p>${m.description}　—　${done}/${total} 解放</p></div></header>
      <div class="panel-sequence">${panels.map((panel, index) => renderSkillPanel(id, panel, index, nextIndex)).join('')}</div></section>`;
  }
  function renderSkillPanel(id, panel, index, nextIndex) {
    const ch = getChar(id); const unlocked = ch.unlockedPanels.includes(panel.id); const available = canUnlockPanel(id, panel); const selected = state.panelUi?.selected?.[id] === panel.id;
    const status = unlocked ? 'unlocked' : available ? 'available' : 'locked';
    const icon = panel.category === 'skill' ? '★' : panel.category === 'passive' ? '◈' : '＋';
    const kind = panel.category === 'skill' ? '技' : panel.category === 'passive' ? '常時効果' : '能力値';
    const message = unlocked ? '解放済' : available ? `${panel.cost}PTで解放可能` : index > nextIndex && nextIndex >= 0 ? 'この系統の上のパネルを先に解放' : panelRequirementText(id, panel);
    return `<article class="panel-sequence-item ${status} ${selected ? 'selected' : ''}">
      <div class="sequence-step">${String(index + 1).padStart(2, '0')}</div>
      <button type="button" class="panel-sequence-select" data-action="panel-select" data-id="${id}" data-panel="${panel.id}" aria-pressed="${selected}">
        <span class="node-icon">${icon}</span><span class="node-copy"><span class="node-type">${kind}</span><b>${panel.name}</b><small>${panelEffectText(panel)}</small></span>
      </button>
      <div class="sequence-state"><span class="badge ${unlocked ? 'done' : available ? 'active' : 'locked'}">${message}</span>${available ? `<button type="button" class="small-button unlock-direct" data-action="panel-unlock" data-id="${id}" data-panel="${panel.id}">解放</button>` : ''}</div>
    </article>`;
  }
  function renderPanelInspector(id) {
    const def = getDef(id); const selectedId = state.panelUi?.selected?.[id]; const panel = def.panels.find((p) => p.id === selectedId);
    if (!panel) return `<div class="panel-inspector empty"><b>パネルを選択</b><span>上のパネル本文をタップすると、効果・必要PT・解放条件を確認できます。金色の「解放」ボタンは、その場で直接押せます。</span></div>`;
    const ch = getChar(id); const unlocked = ch.unlockedPanels.includes(panel.id); const available = canUnlockPanel(id, panel); const type = panel.category === 'skill' ? '技' : panel.category === 'passive' ? '常時効果' : panel.category === 'stat' ? '能力値' : '根源';
    return `<div class="panel-inspector"><div class="panel-inspector-head"><span class="badge">${type}</span><h2>${panel.name}</h2>${unlocked ? '<span class="badge done">解放済</span>' : available ? '<span class="badge active">解放可能</span>' : '<span class="badge locked">条件未達</span>'}</div><p>${panel.description}</p><div class="panel-effect"><b>効果</b><span>${panelEffectText(panel)}</span></div>${!unlocked ? `<div class="panel-conditions"><b>解放条件</b><span>${panelRequirementText(id, panel) || `${panel.cost}PT`}</span></div>` : ''}<div class="panel-inspector-actions">${available ? `<button class="primary-button" data-action="panel-unlock-selected" data-id="${id}" data-panel="${panel.id}">${panel.cost}PTで解放する</button>` : ''}${unlocked && panel.skill ? `<span class="note">技は戦闘で使うほど習熟Lv.10まで強化されます。</span>` : ''}</div></div>`;
  }

  function renderQuestLog() {
    const tab = state.questUi?.tab || 'available';
    const active = getActiveQuests(); const available = getAcceptableQuests(); const reportable = getCompletableQuests();
    const repeatDelivery = getRepeatQuests(null,'collect'); const repeatHunt = getRepeatQuests(null,'kill');
    const done = Object.values(D.QUESTS).filter((q) => !q.repeatable && isQuestDone(q.id));
    const tabs = [['available',`受注可能 ${available.length}`],['active',`受注中 ${active.length}`],['report',`報告 ${reportable.length}`],['repeat-delivery',`繰返・納品 ${repeatDelivery.length}`],['repeat-hunt',`繰返・討伐 ${repeatHunt.length}`],['done',`達成済み ${done.length}`]];
    const row = (q) => {
      const complete=canCompleteQuest(q), activeQ=isQuestActive(q.id), completed=isQuestDone(q.id);
      const action = completed?'<span class="badge done">達成済</span>':complete?`<button class="small-button" data-action="quest-complete" data-id="${q.id}">報告</button>`:activeQ?`<span class="badge active">進行 ${questProgress(q)}/${q.amount}</span>`:`<button class="small-button" data-action="quest-accept" data-id="${q.id}">受注</button>`;
      return `<div class="list-row"><span class="badge ${q.repeatable?'repeatable':''}">${D.REGIONS?.[q.region||'lindholm']?.name || '地方'}／${q.repeatable?'繰返':q.type==='collect'?'納品':'討伐'}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬：${q.reward.gold}G／冒険者経験 ${q.reward.advExp}</div></div>${action}</div>`;
    };
    let content='';
    if(tab==='available') content=available.length?`<div class="quest-bulk-bar"><div><b>全地方で受注可能：${available.length}件</b><small>実際の受注・報告は各地方ギルドでもできます。</small></div><button class="primary-button" data-action="quest-accept-all">受注可能をすべて受注</button></div><div class="list">${available.map(row).join('')}</div>`:'<div class="empty-state">現在受注できる依頼はありません。</div>';
    if(tab==='active') content=active.length?`<div class="list">${active.map(row).join('')}</div>`:'<div class="empty-state">受注中の依頼はありません。</div>';
    if(tab==='report') content=reportable.length?`<div class="quest-bulk-bar report-bulk"><div><b>報告可能：${reportable.length}件</b><small>納品と討伐をまとめて報告できます。</small></div><button class="primary-button" data-action="quest-complete-all">報告可能をまとめて報告</button></div><div class="list">${reportable.map(row).join('')}</div>`:'<div class="empty-state">報告できる依頼はありません。</div>';
    if(tab==='repeat-delivery') content=repeatDelivery.length?`<div class="list">${repeatDelivery.map(row).join('')}</div>`:'<div class="empty-state">繰り返し納品依頼は未解放です。</div>';
    if(tab==='repeat-hunt') content=repeatHunt.length?`<div class="list">${repeatHunt.map(row).join('')}</div>`:'<div class="empty-state">繰り返し討伐依頼は未解放です。</div>';
    if(tab==='done') content=done.length?`<div class="list">${done.map(row).join('')}</div>`:'<div class="empty-state">まだ達成済みの一回限り依頼はありません。</div>';
    return `${renderStatusStrip()}<h1 class="page-title">依頼帳</h1><p class="page-subtitle">地方ごとに異なる依頼を管理します。納品・討伐の繰り返し依頼は分けて確認でき、報告可能なものは一括で完了できます。</p><div class="quest-tabs">${tabs.map(([id,label])=>`<button class="quest-tab ${tab===id?'active':''}" data-action="quest-tab" data-tab="${id}">${label}</button>`).join('')}</div><section class="quest-log-section">${content}</section><div class="button-row" style="margin-top:15px;"><button class="secondary-button" data-action="enter-location" data-id="lindholm">リンドホルムのギルドへ</button></div>`;
  }
  function renderQuestRow(q, mode = '', showAction = false) {
    const progress = questProgress(q); const done = mode === 'done'; const active = mode === 'active'; const repeat = q.repeatable;
    const badge = done ? '達成済' : active ? `${progress}/${q.amount}` : repeat ? `繰返 ${questCompletionCount(q.id)}回` : `冒険者Lv.${q.rank}`;
    const action = active && canCompleteQuest(q) ? '<span class="badge done">報告可能</span>' : showAction && !active && !done && isQuestAvailable(q) ? `<button class="small-button" data-action="quest-accept" data-id="${q.id}">受注</button>` : '';
    return `<div class="list-row"><span class="badge ${done ? 'done' : active ? 'active' : ''}">${badge}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬：${q.reward.gold}G／冒険者経験 ${q.reward.advExp}${repeat ? '／繰り返し可' : ''}</div></div>${action}</div>`;
  }

  function renderBag() {
    const items = Object.entries(state.inventory).filter(([,qty]) => qty > 0).map(([id, qty]) => ({ ...D.ITEM_DEFS[id], qty })).filter((item)=>item.id);
    const equips = ownedEquipment();
    return `${renderStatusStrip()}<h1 class="page-title">荷袋</h1><p class="page-subtitle">回復道具、素材、そして購入・製造した装備を確認します。装備の付け替えは仲間画面から行います。</p>
      <h2 class="section-title">道具・素材 ${items.length}種</h2>
      ${items.length ? `<div class="list">${items.map((item) => `<div class="list-row"><span class="badge">${item.type === 'material' ? '素材' : item.effect?.restoreStamina ? '活力' : '道具'}</span><div class="row-main"><strong>${item.name} ×${item.qty}</strong><div class="meta">${item.description}</div></div>${item.type === 'consumable' ? `<button class="small-button" data-action="use-item-world" data-id="${item.id}">${item.effect?.restoreStamina?'スタミナ回復':'使う'}</button>` : `<span class="value">売却 ${item.sell}G</span>`}</div>`).join('')}</div>` : '<div class="empty-state">荷袋は空です。</div>'}
      <h2 class="section-title">所持装備 ${equips.length}種</h2>
      ${equips.length ? `<div class="list">${equips.map((equip)=>{const wornBy=[];['rainbow','white','black'].forEach(id=>EQUIP_SLOTS.forEach(slot=>{if(getEquipmentLoadout(id)[slot]===equip.id)wornBy.push(`${getDef(id).short}・${EQUIP_SLOT_LABELS[slot]}`)}));return `<div class="list-row"><span class="badge">${equip.slot==='accessory'?'装飾':EQUIP_SLOT_LABELS[equip.slot]||'装備'}</span><div class="row-main"><strong>${equip.name}${equip.allowed!=='all'?'（専用）':''}</strong><div class="meta">${equip.description}</div><div class="meta">${equipmentStatText(equip)}${wornBy.length?`　／　装備中：${wornBy.join('、')}`:''}</div></div><button class="small-button" data-action="go-party">仲間で装備</button></div>`}).join('')}</div>`:'<div class="empty-state">道具屋で購入、または製造所で作成した装備がここに並びます。</div>'}`;
  }

  function renderBattleControls(actorId, actor, def) {
    const b=state.battle;
    if (b.phase==='enemy') return `<div class="empty-state">敵が行動中……</div>`;
    if (!actorId||!actor||actor.hp<=0) return `<div class="empty-state">行動順を調整中……</div>`;
    const autoToggle=`<button class="auto-toggle ${b.auto?'on':''}" data-action="toggle-battle-auto">${b.auto?'AUTO ON':'AUTO OFF'}</button>`;
    if (b.auto) return `<div class="automation-status"><b>${def.short} が自動行動中</b>${autoToggle}<span>熟練度も上がります</span></div>`;
    if (b.phase==='command') return `<div class="battle-command-title"><span><b>${def.short} の行動</b>　<small>${def.role}</small></span>${autoToggle}</div><div class="command-row"><button class="command-button" data-action="battle-command" data-command="attack">攻撃</button><button class="command-button" data-action="battle-command" data-command="skills">技</button><button class="command-button" data-action="battle-command" data-command="guard">防御</button><button class="command-button" data-action="battle-command" data-command="items">道具</button></div>`;
    if (b.phase==='skills') return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使用する技を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${currentSkills(actorId).map(skill=>{const mp=skillMpCost(actorId,skill);return `<button class="skill-button" data-action="battle-skill" data-id="${skill.id}" ${actor.mp<mp?'disabled':''}><b>${skill.name}</b><small>MP ${mp}${mp!==skill.mp?`（基本${skill.mp}）`:''}　${skillMasteryLabel(actorId,skill.id)}</small><span>${skill.description}<em>${masteryHint(actorId,skill)}</em></span></button>`}).join('')}</div>`;
    if (b.phase==='items') { const consumables=Object.values(D.ITEM_DEFS).filter(i=>i.type==='consumable'&&countItem(i.id)>0); return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:12px;">使う道具を選択</b><button class="small-button" data-action="battle-back">戻る</button></div><div class="skill-menu">${consumables.length?consumables.map(item=>`<button class="skill-button" data-action="battle-item" data-id="${item.id}"><b>${item.name} ×${countItem(item.id)}</b><small>道具</small><span>${item.description}</span></button>`).join(''):'<div class="empty-state">使える道具がありません。</div>'}</div>`; }
    if (b.phase==='target-enemy') return `<div><b style="font-size:12px;">対象の敵を選択</b><div class="target-row">${getAliveEnemies().map((e,i)=>`<button class="target-button" data-action="battle-target-enemy" data-index="${i}">${e.name}<br>HP ${e.hp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`;
    if (b.phase==='target-ally') { const skill=b.selected?.skillId?D.SKILLS[b.selected.skillId]:null; const item=b.selected?.itemId?D.ITEM_DEFS[b.selected.itemId]:null; const canRevive=!!(skill?.revive||skill?.reviveAll||item?.effect?.reviveHpRate); const targets=canRevive?['rainbow','white','black']:['rainbow','white','black'].filter(id=>getChar(id).hp>0); return `<div><b style="font-size:12px;">対象の仲間を選択</b><div class="target-row">${targets.map(id=>`<button class="target-button" data-action="battle-target-ally" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}</button>`).join('')}</div><div class="target-row"><button class="small-button" data-action="battle-back">戻る</button></div></div>`; }
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

  function explorationAvailable() { return Object.keys(state.characters).every((id) => getChar(id).hp > 0); }
  function autoResult(text) { if (state.autoExplore) { state.autoExplore.results.push(text); if (state.autoExplore.results.length > 12) state.autoExplore.results.shift(); } }

  // オート探索では、次の探索／戦闘で設定下限を割り込む直前にだけ活力剤を使う。
  // 指定個数を使い切るか、所持品が尽きた時点で通常の下限停止／力尽き判定へ戻る。
  function autoRecoverStaminaIfNeeded(requiredCost, phaseLabel) {
    const a = state.autoExplore;
    if (!a) return canSpendStamina(requiredCost, 0);
    refreshStamina();
    if (canSpendStamina(requiredCost, a.floor)) return true;
    const item = D.ITEM_DEFS[a.tonicId];
    const maxUse = Math.max(0, Number(a.tonicLimit) || 0);
    while (item?.effect?.restoreStamina && a.tonicUsed < maxUse && countItem(item.id) > 0 && !canSpendStamina(requiredCost, a.floor)) {
      if (!takeItem(item.id, 1)) break;
      const gained = restoreStamina(item.effect.restoreStamina, `オート探索：${item.name}を自動使用。`, { allowOvercap: !!item.effect.allowOvercap });
      a.tonicUsed += 1;
      a.recovered = (a.recovered || 0) + gained;
      const text = `${item.name}を自動使用（${a.tonicUsed}/${maxUse}・ST +${formatStamina(gained)}）`;
      appendLog(`${phaseLabel}の前に${text}`);
      autoResult(text);
    }
    return canSpendStamina(requiredCost, a.floor);
  }

  function createEncounter(locationId, difficulty) {
    const loc = D.LOCATIONS[locationId];
    const [minCount, maxCount] = difficulty.enemyCount;
    let count = rng(minCount, maxCount);
    let enemies = Array.from({ length: count }, () => choice(loc.enemyPool));
    const bossChance = difficulty.id === 'advanced' ? .10 : difficulty.id === 'intermediate' ? .035 : 0;
    const rareChance = difficulty.id === 'advanced' ? .14 : difficulty.id === 'intermediate' ? .065 : .022;
    if (loc.bossPool?.length && Math.random() < bossChance) enemies = [choice(loc.bossPool)];
    else if (loc.rareEnemyPool?.length && Math.random() < rareChance) enemies = [choice(loc.rareEnemyPool)];
    // 第一章の獣王は、依頼が解放された後の森でのみ低確率に出現する。
    else if (loc.id === 'whisper_woods' && state.flags.anger !== true && state.adventureExp >= 100 && difficulty.id !== 'beginner' && Math.random() < (difficulty.id === 'advanced' ? .16 : .08)) enemies = ['moss_wolf'];
    // 初級は必ず単体。中級・上級は地域の敵が複数で現れる。
    if (difficulty.id === 'beginner' && !D.ENEMIES[enemies[0]]?.boss) enemies = [choice(loc.enemyPool)];
    return enemies;
  }

  function scaledEnemy(enemyId, index, difficulty) {
    const def = deepCopy(D.ENEMIES[enemyId]);
    const scale = difficulty.enemyStatMultiplier;
    const reward = difficulty.rewardMultiplier;
    const originalName = def.name;
    def.maxHp = Math.max(1, Math.round(def.maxHp * scale));
    def.hp = def.maxHp;
    def.atk = Math.max(1, Math.round(def.atk * scale));
    def.def = Math.max(1, Math.round(def.def * (1 + (scale - 1) * .65)));
    def.mag = Math.max(1, Math.round(def.mag * scale));
    def.agi = Math.max(1, Math.round(def.agi * (1 + (scale - 1) * .35)));
    def.exp = Math.max(1, Math.round(def.exp * reward));
    def.gold = Math.max(1, Math.round(def.gold * reward));
    def.uid = `${enemyId}_${Date.now()}_${index}`;
    def.status = {};
    def.difficultyId = difficulty.id;
    def.lootMultiplier = difficulty.lootMultiplier;
    const prefix = def.boss ? '◆BOSS' : def.metal ? '◆METAL' : def.golden ? '◆GOLD' : def.rare ? '◆RARE' : difficulty.id === 'beginner' ? '' : difficulty.name;
    def.displayName = prefix ? `${prefix}・${originalName}` : originalName;
    return def;
  }

  function explore(locationId, fromAuto = false) {
    if (!explorationAvailable()) {
      if (fromAuto) return stopAutoExplore('仲間が戦闘不能になったため中止しました。');
      toast('戦闘不能の仲間がいます。宿屋で休んでください。', 'warn'); return 'stop';
    }
    const loc = D.LOCATIONS[locationId]; if (!loc?.enemyPool) return 'stop';
    const difficulty = fromAuto ? getDifficulty(state.autoExplore?.difficultyId) : getSelectedDifficulty(locationId);
    if (!difficulty || !rankAllowed(difficulty.rank)) { toast('この探索難易度はまだ解放されていません。', 'warn'); return 'stop'; }
    const cost = explorationCost(difficulty, fromAuto);
    const floor = fromAuto ? Number(state.autoExplore?.floor || 0) : 0;
    if (fromAuto && !autoRecoverStaminaIfNeeded(cost, '探索')) {
      finishAutoExplore(floor <= STAMINA_EPSILON ? 'スタミナが不足したため、オート探索を終了しました。' : `スタミナ下限 ${formatStamina(floor)} を守るため、探索を終了しました。`);
      return 'stop';
    }
    if (!canSpendStamina(cost, 0)) {
      if (fromAuto) finishAutoExplore('スタミナが不足したため、オート探索を終了しました。');
      else toast('探索に必要なスタミナが不足しています。宿屋か活力剤で回復してください。', 'warn');
      return 'stop';
    }
    spendStamina(cost, fromAuto ? `オート探索（${loc.name}／${difficulty.name}）` : `探索（${loc.name}／${difficulty.name}）`, { locationId, fromAuto });

    const encounterRate = difficulty.id === 'advanced' ? .72 : difficulty.id === 'intermediate' ? .61 : .50;
    const roll = Math.random();
    if (roll < encounterRate) {
      const enemies = createEncounter(locationId, difficulty);
      const started = startBattle(enemies, loc.id, { auto: fromAuto || state.automation.battleAutoDefault, autoExplore: fromAuto, difficultyId: difficulty.id });
      return started ? 'battle' : 'stop';
    }
    if (roll < .92) {
      const item = choice(loc.materialPool);
      const baseQty = rng(1, item === 'herb' ? 3 : 2);
      const qty = Math.max(1, Math.ceil(baseQty * difficulty.lootMultiplier));
      addItem(item, qty);
      const findings = [`${D.ITEM_DEFS[item].name} ×${qty}`];
      if (Math.random() < Math.min(1, difficulty.rareChance + (getPartyEquipmentSpecials().rareFind || 0)) && loc.rareMaterialPool?.length) {
        const rare = choice(loc.rareMaterialPool); const rareQty = difficulty.id === 'advanced' ? rng(1, 2) : 1;
        addItem(rare, rareQty); findings.push(`希少：${D.ITEM_DEFS[rare].name} ×${rareQty}`);
      }
      const gearFind = getPartyEquipmentSpecials(); const hiddenChance = (difficulty.id === 'advanced' ? .12 : difficulty.id === 'intermediate' ? .055 : .015) + (gearFind.rareFind || 0);
      if (loc.hiddenFinds?.length && Math.random() < hiddenChance) {
        const hidden = choice(loc.hiddenFinds); addItem(hidden, 1); findings.push(`隠し発見：${D.ITEM_DEFS[hidden].name} ×1`);
      }
      const text = findings.join('／');
      appendLog(`${loc.name}（${difficulty.name}）で ${text} を見つけた。`); autoResult(`素材：${text}`);
      if (!fromAuto) toast(`${text} を発見！`, 'good'); saveGame(); if (!fromAuto) render(); return 'loot';
    }
    const gold = Math.max(1, Math.round(rng(18, 44) * difficulty.rewardMultiplier * (1 + (getPartyEquipmentSpecials().goldRate || 0))));
    state.gold += gold; appendLog(`${loc.name}（${difficulty.name}）で古い袋を発見。${gold}Gを得た。`); autoResult(`${gold}G を発見`);
    if (!fromAuto) toast(`古い袋を発見。${gold}Gを得た！`, 'good'); saveGame(); if (!fromAuto) render(); return 'gold';
  }

  function openAutoExploreSetup(locationId) {
    const loc = D.LOCATIONS[locationId]; const difficulty = getSelectedDifficulty(locationId); refreshStamina();
    if (state.stamina.current <= STAMINA_EPSILON) return toast('スタミナが不足しています。宿屋か活力剤で回復してください。', 'warn');
    const currentFloorMax = Math.floor(state.stamina.current);
    const suggested = clamp(Math.floor(state.stamina.current - explorationCost(difficulty, true) * 2), 0, currentFloorMax);
    const tonics = Object.values(D.ITEM_DEFS).filter((item) => item.type === 'consumable' && item.effect?.restoreStamina && countItem(item.id) > 0);
    const options = [`<option value="">使用しない</option>`, ...tonics.map((item) => `<option value="${item.id}" ${item.id === 'stamina_tonic' ? 'selected' : ''}>${item.name}（所持 ${countItem(item.id)}／ST +${item.effect.restoreStamina}）</option>`)].join('');
    const defaultItem = tonics.find((item)=>item.id==='stamina_tonic') || tonics[0];
    const defaultCount = defaultItem ? Math.min(3, countItem(defaultItem.id)) : 0;
    showModal(`<div class="modal-header"><div><h2>オート探索の設定</h2><p>${loc.name}／${difficulty.name}を、指定したスタミナ下限まで自動で探索します。</p></div><button class="modal-close" data-action="modal-close">×</button></div>
      <div class="auto-setup">
        <label>現在のスタミナ <b>${formatStamina(state.stamina.current)}/${getStaminaMax()}</b></label>
        <label>オート時の消費 <b>探索 ST ${formatStamina(explorationCost(difficulty, true))}／戦闘 ST ${formatStamina(battleCost(difficulty, true))}</b></label>
        <label for="autoStaminaFloor">停止するスタミナ下限：<output id="autoFloorValue">${suggested}</output></label>
        <input id="autoStaminaFloor" type="range" min="0" max="${currentFloorMax}" step="1" value="${suggested}" oninput="document.getElementById('autoFloorValue').value=this.value">
        <div class="auto-floor-presets"><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=0;document.getElementById('autoFloorValue').value=0">0（使い切る）</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=10;document.getElementById('autoFloorValue').value=10">10</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=25;document.getElementById('autoFloorValue').value=25">25</button><button class="small-button" type="button" onclick="document.getElementById('autoStaminaFloor').value=Math.floor(${state.stamina.current}/2);document.getElementById('autoFloorValue').value=Math.floor(${state.stamina.current}/2)">半分</button></div>
        <div class="auto-tonic-box"><b>活力剤の自動使用</b><small>次の探索・戦闘で下限を割り込む直前にだけ使用します。使用上限に達すると、その時点から下限判定で停止します。</small><label>使う活力剤<select id="autoTonicId">${options}</select></label><label>自動使用する数<select id="autoTonicCount"><option value="0">0回</option>${Array.from({length: Math.min(20, Math.max(...tonics.map((x)=>countItem(x.id)), 0))},(_,i)=>`<option value="${i+1}" ${i+1===defaultCount?'selected':''}>${i+1}回</option>`).join('')}</select></label></div>
        <p class="note">下限0かつ活力剤も尽きた場合は、スタミナ0でオート探索を終了します。撤退ペナルティはありません。</p>
      </div><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="auto-explore-confirm" data-id="${locationId}">この設定で開始</button></div>`);
  }

  function startAutoExplore(locationId, floor = 0, tonicId = '', tonicLimit = 0) {
    if (!explorationAvailable()) return toast('戦闘不能の仲間がいます。宿屋で休んでください。', 'warn');
    const difficulty = getSelectedDifficulty(locationId); if (!difficulty || !rankAllowed(difficulty.rank)) return toast('この探索難易度はまだ解放されていません。', 'warn');
    refreshStamina(); floor = clamp(Number(floor) || 0, 0, Math.floor(state.stamina.current));
    if (state.stamina.current <= STAMINA_EPSILON) return toast('スタミナが不足しています。宿屋か活力剤で回復してください。', 'warn');
    if (state.stamina.current <= floor + STAMINA_EPSILON && !(tonicId && Number(tonicLimit) > 0 && countItem(tonicId) > 0)) return toast('下限が現在のスタミナ以上です。下限を下げるか、活力剤を設定してください。', 'warn');
    const item = D.ITEM_DEFS[tonicId];
    const usableLimit = item?.effect?.restoreStamina ? Math.min(Math.max(0, Number(tonicLimit) || 0), countItem(tonicId)) : 0;
    state.autoExplore = { locationId, difficultyId: difficulty.id, floor, steps: 0, results: [], tonicId: usableLimit ? tonicId : '', tonicLimit: usableLimit, tonicUsed: 0, recovered: 0 };
    appendLog(`${D.LOCATIONS[locationId].name}で${difficulty.name}のオート探索を開始（下限 ${floor}／活力剤 ${usableLimit ? `${item.name}×${usableLimit}` : 'なし'}）。`);
    saveGame(); render(); window.clearTimeout(autoExploreTimer); autoExploreTimer = window.setTimeout(runAutoExploreStep, 300);
  }

  function runAutoExploreStep() {
    const a = state.autoExplore; if (!a || state.battle) return;
    const difficulty = getDifficulty(a.difficultyId); const cost = explorationCost(difficulty, true);
    if (!autoRecoverStaminaIfNeeded(cost, '探索')) {
      return finishAutoExplore(a.floor <= STAMINA_EPSILON ? 'スタミナが不足したため、オート探索を終了しました。' : `スタミナ下限 ${formatStamina(a.floor)} に到達したため、探索を終了しました。`);
    }
    a.steps += 1;
    const outcome = explore(a.locationId, true); render();
    if (outcome !== 'battle' && state.autoExplore) autoExploreTimer = window.setTimeout(runAutoExploreStep, 460);
  }

  function finishAutoExplore(reason = 'オート探索を完了しました。') {
    const a = state.autoExplore; if (!a) return;
    window.clearTimeout(autoExploreTimer);
    const summary = a.results.length ? a.results.map((x) => `・${x}`).join('\n') : '目立った発見はなかった。';
    const steps = a.steps; const difficulty = getDifficulty(a.difficultyId);
    state.autoExplore = null; saveGame(); render();
    showDialogue('オート探索 終了', `${reason}\n難易度：${difficulty.name}\n探索回数：${steps}回\n自動使用：${a.tonicId ? `${D.ITEM_DEFS[a.tonicId]?.name || '活力剤'} ${a.tonicUsed || 0}/${a.tonicLimit || 0}回（ST +${formatStamina(a.recovered || 0)}）` : 'なし'}\n残りスタミナ：${formatStamina(state.stamina.current)}/${getStaminaMax()}\n\n${summary}`);
  }
  function stopAutoExplore(reason = 'オート探索を中止しました。') { if (!state.autoExplore) return; window.clearTimeout(autoExploreTimer); state.autoExplore = null; saveGame(); render(); toast(reason, 'warn'); }

  function startBattle(enemyIds, locationId, options = {}) {
    const loc = D.LOCATIONS[locationId]; const difficulty = getDifficulty(options.difficultyId || getSelectedDifficultyId(locationId));
    const cost = battleCost(difficulty, !!options.autoExplore); const floor = options.autoExplore ? Number(state.autoExplore?.floor || 0) : 0;
    if (options.autoExplore && !autoRecoverStaminaIfNeeded(cost, '戦闘')) {
      finishAutoExplore(floor <= STAMINA_EPSILON ? '戦闘に必要なスタミナが不足したため、オート探索を終了しました。' : `戦闘に必要なスタミナを残すため、下限 ${formatStamina(floor)} で探索を終了しました。`);
      return false;
    }
    if (!canSpendStamina(cost, 0)) {
      if (options.autoExplore) finishAutoExplore('戦闘に必要なスタミナが不足したため、オート探索を終了しました。');
      else toast('戦闘に必要なスタミナが不足しています。宿屋か活力剤で回復してください。', 'warn');
      return false;
    }
    spendStamina(cost, options.autoExplore ? `オート戦闘開始（${loc.name}／${difficulty.name}）` : `戦闘開始（${loc.name}／${difficulty.name}）`, { locationId, fromAuto: !!options.autoExplore });
    const enemies = enemyIds.map((id, i) => scaledEnemy(id, i, difficulty));
    state.battle = { locationId, difficultyId: difficulty.id, enemies, turnIndex: 0, order: ['rainbow', 'white', 'black'], phase: 'command', selected: null, auto: !!options.auto, autoExplore: !!options.autoExplore, log: `${difficulty.name}：${enemies.map((e) => e.displayName || e.name).join('、')} が現れた！
スタミナ -${formatStamina(cost)}` };
    ['rainbow','white','black'].forEach((id) => { const rate=getEquipmentSpecials(id).barrierStart||0; if(rate>0) applyBarrier(id,rate); });
    state.scene = 'battle'; audio.sfx('hit'); render(); if (state.battle.auto) window.setTimeout(runAutoTurn, 360); return true;
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
    return `<section class="battle-shell"><div class="battle-stamina">スタミナ ${formatStamina(state.stamina.current)}/${getStaminaMax()}　<span>戦闘開始時に消費</span></div><div class="battle-stage"><div class="enemy-area">${b.enemies.filter(e=>e.hp>0).map(enemy=>`<div class="battle-enemy"><canvas class="enemy-sprite" data-enemy="${enemy.id}" width="132" height="112"></canvas><div class="enemy-name">${enemy.displayName || enemy.name}</div><div class="enemy-hp meter"><span style="width:${pct(enemy.hp,enemy.maxHp)}%"></span></div><small style="font-size:9px;">HP ${enemy.hp}/${enemy.maxHp}${enemyStatusText(enemy)}</small></div>`).join('')}</div><div class="party-sprites">${['rainbow','white','black'].map(id=>{const ch=getChar(id),st=getStats(id);return `<div class="battle-hero"><canvas data-portrait="${id}" width="54" height="54"></canvas><strong>${getDef(id).short}${ch.hp<=0?'（戦闘不能）':''}</strong><div class="meter"><span style="width:${pct(ch.hp,st.maxHp)}%"></span></div><div class="meter mp"><span style="width:${pct(ch.mp,st.maxMp)}%"></span></div>${ch.barrier?'<small>◈障壁</small>':''}</div>`}).join('')}</div></div><div class="battle-log">${log.slice(-3).map(x=>`<div>› ${x}</div>`).join('')}</div><div class="battle-controls">${renderBattleControls(actorId,actor,actorDef)}</div></section>`;
  }
  function enemyStatusText(enemy) { const s=enemy.status||{}; const list=[]; if(s.fracture)list.push('▽防御'); if(s.weaken)list.push('▽攻撃');if(s.slow)list.push('▽敏捷');if(s.bind)list.push('縛');return list.length?`　${list.join(' ')}`:''; }

  function getAliveAllies() { return ['rainbow','white','black'].filter((id)=>getChar(id).hp > 0); }
  function getAliveEnemies() { return state.battle.enemies.filter((e)=>e.hp > 0); }

  function battleCommand(command) {
    const b=state.battle; if(!b||b.phase!=='command'||b.auto)return;
    if(command==='guard'){ const actorId=b.order[b.turnIndex]; getChar(actorId).guard=1; battleLog(`${getDef(actorId).short}は身構えた。`); afterPlayerAction(); return; }
    b.phase=command==='skills'?'skills':command==='items'?'items':'target-enemy'; b.selected=command==='attack'?{type:'attack'}:null; render();
  }
  function useBattleSkill(skillId) { const b=state.battle; const actorId=b.order[b.turnIndex]; const skill=D.SKILLS[skillId]; if(!skill||getChar(actorId).mp<skillMpCost(actorId,skill)||b.auto)return; b.selected={type:'skill',skillId}; b.phase=skill.target==='enemy'?'target-enemy':skill.target==='ally'?'target-ally':'auto-skill'; if(b.phase==='auto-skill')executeSkill(actorId,skill,null);else render(); }
  function useBattleItem(itemId) { const item=D.ITEM_DEFS[itemId]; if(!item||countItem(itemId)<1||state.battle.auto)return; state.battle.selected={type:'item',itemId};state.battle.phase='target-ally';render(); }
  function targetEnemy(index) { const b=state.battle;const enemy=getAliveEnemies()[Number(index)];if(!enemy)return;const actorId=b.order[b.turnIndex];if(b.selected.type==='attack')executeAttack(actorId,enemy);else if(b.selected.type==='skill')executeSkill(actorId,D.SKILLS[b.selected.skillId],enemy); }
  function targetAlly(id) {const b=state.battle; const actorId=b.order[b.turnIndex];if(b.selected.type==='item')executeItem(actorId,b.selected.itemId,id);else if(b.selected.type==='skill')executeSkill(actorId,D.SKILLS[b.selected.skillId],id);}
  function toggleBattleAuto() { if(!state.battle)return; state.battle.auto=!state.battle.auto; battleLog(state.battle.auto?'自動戦闘を開始。':'自動戦闘を停止。'); render(); if(state.battle.auto)window.setTimeout(runAutoTurn,180); }
  function chooseAutoAction(actorId) {
    const skills=currentSkills(actorId).filter(s=>getChar(actorId).mp>=skillMpCost(actorId,s)); const alive=getAliveAllies(); const down=['rainbow','white','black'].filter(id=>getChar(id).hp<=0); const lowest=alive.sort((a,b)=>pct(getChar(a).hp,getStats(a).maxHp)-pct(getChar(b).hp,getStats(b).maxHp))[0];
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
  function dealDamage(attackerId,target,multiplier=1,kind='physical',isEnemyTarget=true,bonusOnDebuff=0,extra={}) { const offensive=kind==='magic'||kind==='special'?combatStat(attackerId,'mag'):combatStat(attackerId,'atk'); const gear=getEquipmentSpecials(attackerId); let power=multiplier; if(bonusOnDebuff&&Object.keys(target.status||{}).some(k=>k!=='buffs'))power+=bonusOnDebuff;if(hasPassive(attackerId,'debuff_damage')&&Object.keys(target.status||{}).some(k=>k!=='buffs'))power*=1.12;if(gear.debuffDamage&&Object.keys(target.status||{}).some(k=>k!=='buffs'))power*=1+gear.debuffDamage;if(gear.lowHpDamage&&getChar(attackerId).hp<=getStats(attackerId).maxHp*.5)power*=1+gear.lowHpDamage;if(attackerId==='rainbow'&&getChar('rainbow').hp<=getStats('rainbow').maxHp*.5)power*=1.1;if(attackerId==='black'&&target.status?.fracture)power*=1.15;if(extra.pierce)target={...target,def:Math.floor(target.def*(1-extra.pierce))};if(extra.execute&&isEnemyTarget&&target.hp/target.maxHp<.32)power*=1.32;let damage=Math.max(1,Math.floor(offensive*power-effectiveDefenderDef(target,isEnemyTarget)*.52+rng(-3,4))); if(isEnemyTarget&&target.metal&&Math.random()<.34)damage=0; if(hasPassive(attackerId,'crit_up')&&Math.random()<.14)damage=Math.floor(damage*1.45);applyDamage(target,damage,isEnemyTarget);return damage; }
  function applyDamage(target,damage,isEnemy){if(isEnemy){target.hp=Math.max(0,target.hp-damage);return;}let targetId=target;const ch=getChar(targetId);const protectedBy=ch.protectedBy;if(protectedBy&&protectedBy!==targetId&&getChar(protectedBy)?.hp>0){targetId=protectedBy;battleLog(`${getDef(protectedBy).short}が攻撃を受け止めた！`);}const defender=getChar(targetId);let final=damage;if(defender.barrier){const used=Math.min(defender.barrier,final);defender.barrier-=used;final-=used;if(defender.barrier<=0)delete defender.barrier;}if(defender.guard)final=Math.max(1,Math.floor(final*.5));if(protectedBy&&hasPassive(protectedBy,'guard_reduction'))final=Math.max(1,Math.floor(final*.85)); const gearCut=getEquipmentSpecials(targetId).damageCut||0; if(gearCut)final=Math.max(1,Math.floor(final*(1-gearCut)));if(final>=defender.hp&&defender.deathGuard){defender.hp=1;delete defender.deathGuard;battleLog(`${getDef(targetId).short}は結界に守られた！`);}else defender.hp=Math.max(0,defender.hp-final);}
  function executeAttack(actorId,enemy){const dmg=dealDamage(actorId,enemy,1,'physical',true);audio.sfx('hit');battleLog(`${getDef(actorId).short}の攻撃！ ${enemy.name}に${dmg}ダメージ。`);resolveAfterHit();}
  function executeSkill(actorId,skill,target){const actor=getChar(actorId);const mpCost=skillMpCost(actorId,skill);if(actor.mp<mpCost)return; actor.mp-=mpCost; const scale=masteryScale(actorId,skill);const dur=scale.durationBonus+(hasPassive(actorId,'duration_plus')?1:0);const power=(skill.power||0)*scale.potency;const gear=getEquipmentSpecials(actorId);const heal=(skill.heal||0)*scale.potency*(1+(gear.healRate||0));const barrier=(skill.barrier||0)*(1+(scale.level-1)*.07)*(scale.max?1.18:1);const regen=(skill.regen||0)+(scale.level>=6?1:0)+(scale.max?1:0);let targetEnemies=[];if(skill.target==='enemy'&&target)targetEnemies=[target];else if(skill.target==='allEnemies')targetEnemies=getAliveEnemies();if(skill.power&&!skill.allInOne){targetEnemies.forEach(e=>{const dmg=dealDamage(actorId,e,power,skill.kind,true,skill.bonusOnDebuff||0,{pierce:skill.pierce,execute:skill.execute});battleLog(`${getDef(actorId).short}の ${skill.name}！ ${e.name}に${dmg}ダメージ。`);});}
    if(skill.allEnemyPower){getAliveEnemies().forEach(e=>{const dmg=dealDamage(actorId,e,skill.allEnemyPower*scale.potency,'magic',true);battleLog(`${skill.name}の余波！ ${e.name}に${dmg}ダメージ。`);});}
    let allyTargets=skill.target==='allAllies'||skill.reviveAll?['rainbow','white','black']:(skill.target==='ally'?[target]:skill.target==='self'?[actorId]:[]); if(!allyTargets.length && (skill.heal||skill.barrier||skill.mpHeal||skill.allInOne)) allyTargets=['rainbow','white','black']; if(heal){allyTargets.filter(Boolean).forEach(id=>{const ch=getChar(id);if(ch.hp<=0&&(skill.revive||skill.reviveAll)){ch.hp=1;}if(ch.hp>0){let amount=Math.floor(getStats(id).maxHp*heal);if(skill.balanceHeal&&pct(ch.hp,getStats(id).maxHp)<.4)amount=Math.floor(amount*1.35);if(hasPassive(actorId,'heal_boost'))amount=Math.floor(amount*1.1);if(hasPassive(actorId,'low_ally_heal')&&pct(ch.hp,getStats(id).maxHp)<.5)amount=Math.floor(amount*1.15);ch.hp=clamp(ch.hp+amount,0,getStats(id).maxHp);if(hasPassive(actorId,'heal_regen'))ch.regen=Math.max(ch.regen||0,1);if(hasPassive(actorId,'heal_mp'))ch.mp=clamp(ch.mp+Math.floor(getStats(id).maxMp*.03),0,getStats(id).maxMp);}});}
    if(skill.cleanse)allyTargets.filter(Boolean).forEach(id=>{removeNegative(id);if(hasPassive(actorId,'cleanse_barrier'))applyBarrier(id,.10);}); if(skill.mpHeal)allyTargets.filter(Boolean).forEach(id=>{const ch=getChar(id);ch.mp=clamp(ch.mp+Math.floor(getStats(id).maxMp*skill.mpHeal*scale.potency),0,getStats(id).maxMp);}); if(skill.regen)allyTargets.filter(Boolean).forEach(id=>{getChar(id).regen=Math.max(getChar(id).regen||0,regen);}); if(skill.barrier)allyTargets.filter(Boolean).forEach(id=>applyBarrier(id,barrier)); if(skill.deathGuard)allyTargets.filter(Boolean).forEach(id=>getChar(id).deathGuard=true); if(skill.buffs)allyTargets.filter(Boolean).forEach(id=>addBuff(id,skill.buffs,(skill.turns||2)+dur)); if(skill.guard&&target){getChar(target).protectedBy=actorId;getChar(target).protectedTurns=(skill.turns||2)+dur;} if(skill.debuff)targetEnemies.length?targetEnemies.forEach(e=>applyDebuffs(e,skill.debuff,dur)):getAliveEnemies().forEach(e=>applyDebuffs(e,skill.debuff,dur)); if(skill.dispel)getAliveEnemies().forEach(e=>{if(e.status) delete e.status.buffs;}); if(skill.stealBuff&&skill.buffs)addBuff(actorId,skill.buffs,(skill.turns||2)+dur); if(skill.lifeSteal&&targetEnemies.length){const hit=0;const recovered=Math.floor((skill.power||1)*combatStat(actorId,skill.kind==='physical'?'atk':'mag')*skill.lifeSteal*.55);actor.hp=clamp(actor.hp+recovered,0,getStats(actorId).maxHp);} if(skill.mpSteal)actor.mp=clamp(actor.mp+Math.floor(getStats(actorId).maxMp*skill.mpSteal),0,getStats(actorId).maxMp); if(skill.allInOne){getAliveEnemies().forEach(e=>{const dmg=dealDamage(actorId,e,power,'special',true);battleLog(`${skill.name}！ ${e.name}に${dmg}ダメージ。`);});['rainbow','white','black'].forEach(id=>{const ch=getChar(id);ch.hp=clamp(ch.hp+Math.floor(getStats(id).maxHp*heal),0,getStats(id).maxHp);});}
    if(skill.kind==='physical'||skill.kind==='magic'||skill.kind==='special') { if(hasPassive(actorId,'fracture_chance')&&Math.random()<.2)targetEnemies.forEach(e=>setStatus(e,'fracture',1)); audio.sfx('hit'); } else audio.sfx('heal'); if(hasPassive(actorId,'skill_cycle')){actor.hp=clamp(actor.hp+Math.floor(getStats(actorId).maxHp*.02),0,getStats(actorId).maxHp);actor.mp=clamp(actor.mp+Math.floor(getStats(actorId).maxMp*.02),0,getStats(actorId).maxMp);} gainMastery(actorId,skill);battleLog(`${getDef(actorId).short}は ${skill.name} を使った。`);resolveAfterHit();}
  function executeItem(actorId,itemId,targetId){const item=D.ITEM_DEFS[itemId];if(!takeItem(itemId,1))return;const target=getChar(targetId);if(item.effect.reviveHpRate&&target.hp<=0)target.hp=Math.max(1,Math.floor(getStats(targetId).maxHp*item.effect.reviveHpRate));if(item.effect.healHp)target.hp=clamp(target.hp+item.effect.healHp,0,getStats(targetId).maxHp);if(item.effect.healMp)target.mp=clamp(target.mp+item.effect.healMp,0,getStats(targetId).maxMp);if(item.effect.barrierRate)applyBarrier(targetId,item.effect.barrierRate);if(item.effect.restoreStamina)restoreStamina(item.effect.restoreStamina, `${item.name}でスタミナを回復した。`, { allowOvercap: !!item.effect.allowOvercap });audio.sfx('heal');battleLog(`${getDef(actorId).short}は ${item.name} を使った。`);resolveAfterHit();}
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
  function finishBattle(victory) {
    const b = state.battle; if (!b) return;
    const loc = D.LOCATIONS[b.locationId];
    if (!victory) { applyDefeatPenalty('撤退', `三人は ${loc.name} から撤退した。`, b.locationId, !!b.autoExplore); return; }
    const difficulty = getDifficulty(b.difficultyId); const defeated = b.enemies; let exp = 0; let gold = 0; const drops = [];
    defeated.forEach((enemy) => {
      exp += enemy.exp; gold += enemy.gold; state.kills[enemy.id] = (state.kills[enemy.id] || 0) + 1;
      enemy.drops.forEach((drop) => {
        const chance = Math.min(1, drop.chance + (difficulty.id === 'advanced' ? .08 : difficulty.id === 'intermediate' ? .03 : 0));
        if (Math.random() <= chance) {
          const qty = Math.max(1, Math.ceil(rng(drop.qty[0], drop.qty[1]) * (enemy.lootMultiplier || difficulty.lootMultiplier || 1)));
          addItem(drop.id, qty); drops.push({ id: drop.id, qty });
        }
      });
    });
    const partyGear = getPartyEquipmentSpecials();
    gold = Math.round(gold * (1 + (partyGear.goldRate || 0)));
    exp = Math.round(exp * (1 + (partyGear.expRate || 0)));
    state.gold += gold;
    const levelUps = [];
    ['rainbow', 'white', 'black'].forEach((id) => {
      const levels = addCharacterExp(id, exp);
      if (levels.length) levelUps.push(`${getDef(id).short} Lv.${levels.join('・')}`);
      if (hasPassive(id, 'kill_mp')) getChar(id).mp = clamp(getChar(id).mp + Math.floor(getStats(id).maxMp * .06), 0, getStats(id).maxMp);
      if (hasPassive(id, 'kill_hp')) getChar(id).hp = clamp(getChar(id).hp + Math.floor(getStats(id).maxHp * .05), 0, getStats(id).maxHp);
    });
    const whiteLowest = getAliveAllies().sort((a, c) => pct(getChar(a).hp, getStats(a).maxHp) - pct(getChar(c).hp, getStats(c).maxHp))[0];
    if (whiteLowest && hasPassive('white', 'post_battle_heal')) getChar(whiteLowest).hp = clamp(getChar(whiteLowest).hp + Math.floor(getStats(whiteLowest).maxHp * .08), 0, getStats(whiteLowest).maxHp); const postHeal = getPartyEquipmentSpecials().postBattleHeal || 0; if (postHeal) ['rainbow','white','black'].forEach((id)=>{ const ch=getChar(id); if(ch.hp>0) ch.hp=clamp(ch.hp+Math.floor(getStats(id).maxHp*postHeal),0,getStats(id).maxHp); });
    const first = !state.flags.firstVictory;
    if (first) { state.flags.firstVictory = true; state.flags.choice = true; }
    const fromAuto = !!b.autoExplore;
    state.battle = null; state.scene = 'location'; audio.sfx('victory');
    const enemyNames = defeated.map((e) => e.displayName || e.name);
    appendLog(`${difficulty.name}で${enemyNames.join('、')}を倒した。経験値${exp}／${gold}G`);
    const dropText = drops.length ? drops.map((d) => `${D.ITEM_DEFS[d.id].name}×${d.qty}`).join('、') : 'なし';
    if (fromAuto) {
      autoResult(`戦闘勝利：${enemyNames.join('・')}（${gold}G／${dropText}）`);
      saveGame(); render(); autoExploreTimer = window.setTimeout(runAutoExploreStep, 420); return;
    }
    saveGame(); render();
    const levelsText = levelUps.length ? `\n\n【レベルアップ】${levelUps.join('／')}\n各自3PTを獲得。` : '';
    const story = first ? '\n\n戦いが終わり、草原に風が戻った。\n黒零「次は、どうする？」\n白零「虹全が決める？」\n虹全「……いや。三人で決めよう。もう、誰かの指示を待たなくていい。」\n\n【物語パネル：「選択」が解放条件を満たしました】' : '';
    showDialogue('戦闘勝利', `${difficulty.name}：${enemyNames.join('、')}を倒した。\n経験値：${exp}　／　獲得金：${gold}G\n素材：${dropText}${levelsText}${story}`);
  }
  function useItemOutside(itemId) {
    const item = D.ITEM_DEFS[itemId]; if (!item || countItem(itemId) < 1) return;
    if (item.effect?.restoreStamina) return useStaminaItem(itemId);
    const candidates = item.effect?.reviveHpRate ? ['rainbow','white','black'] : ['rainbow','white','black'].filter((id)=>getChar(id).hp > 0);
    showModal(`<div class="modal-header"><div><h2>${item.name}</h2><p>${item.description}</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="target-row">${candidates.map((id)=>`<button class="target-button" data-action="use-item-outside-target" data-item="${itemId}" data-id="${id}">${getDef(id).short}<br>HP ${getChar(id).hp}/${getStats(id).maxHp}</button>`).join('')}</div>`);
  }

  function useStaminaItem(itemId) {
    const item=D.ITEM_DEFS[itemId]; if(!item?.effect?.restoreStamina || !takeItem(itemId,1)) return;
    const restored=restoreStamina(item.effect.restoreStamina, `${item.name}を使った。`, { allowOvercap: !!item.effect.allowOvercap }); closeModal(); saveGame(); render(); toast(`${item.name}でスタミナを${formatStamina(restored)}回復。`, 'good');
  }
  function useItemOutsideTarget(itemId, id) {
    const item = D.ITEM_DEFS[itemId]; if (!item || !takeItem(itemId,1)) return;
    const ch = getChar(id); const stats = getStats(id);
    if (item.effect.reviveHpRate && ch.hp <= 0) ch.hp = Math.max(1, Math.floor(stats.maxHp * item.effect.reviveHpRate));
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
    const tab = state.questUi?.tab || 'available';
    const region = currentRegionId(); const regionDef = D.REGIONS?.[region] || {name:'この地方'};
    const town = D.LOCATIONS[state.currentLocation]?.type === 'town' ? D.LOCATIONS[state.currentLocation] : null;
    const available = getAcceptableQuests(region);
    const active = getActiveQuests(region);
    const reportable = getCompletableQuests(region);
    const repeatDelivery = getRepeatQuests(region,'collect');
    const repeatHunt = getRepeatQuests(region,'kill');
    const done = Object.values(D.QUESTS).filter((q) => questInRegion(q,region) && !q.repeatable && isQuestDone(q.id));
    const tabs = [
      ['available', `受注可能 ${available.length}`],
      ['active', `受注中 ${active.length}`],
      ['report', `報告 ${reportable.length}`],
      ['repeat-delivery', `繰返・納品 ${repeatDelivery.length}`],
      ['repeat-hunt', `繰返・討伐 ${repeatHunt.length}`],
      ['done', `達成済み ${done.length}`],
    ];
    const row = (q, mode) => {
      const activeQuest = isQuestActive(q.id); const complete = canCompleteQuest(q); const completed = isQuestDone(q.id);
      let action = '';
      if (completed) action = '<span class="badge done">達成済</span>';
      else if (complete) action = `<button class="small-button" data-action="quest-complete" data-id="${q.id}">報告する</button>`;
      else if (activeQuest) action = `<span class="badge active">進行 ${questProgress(q)}/${q.amount}</span>`;
      else action = `<button class="small-button" data-action="quest-accept" data-id="${q.id}">受注する</button>`;
      const kind = q.type === 'collect' ? '納品' : '討伐';
      return `<div class="list-row quest-row"><span class="badge ${q.repeatable?'repeatable':''}">${q.repeatable ? `繰返・${kind}` : kind}</span><div class="row-main"><strong>${q.name}</strong><div class="meta">${q.description}</div><div class="meta">報酬 ${q.reward.gold}G／冒険者経験 ${q.reward.advExp}${q.repeatable ? `／達成 ${questCompletionCount(q.id)}回` : ''}</div></div>${action}</div>`;
    };
    let content = '';
    if (tab === 'available') content = available.length ? `<div class="quest-bulk-bar guild-bulk"><div><b>${regionDef.name}で受注できる依頼：${available.length}件</b><small>一回限り・繰り返し依頼を、地方ごとにまとめて受注できます。</small></div><button class="primary-button" data-action="quest-accept-all" data-region="${region}">受注可能をすべて受注</button></div><div class="list">${available.map((q) => row(q, 'available')).join('')}</div>` : '<div class="empty-state">この地方で、現在受注できる依頼はありません。</div>';
    if (tab === 'active') content = active.length ? `<div class="list">${active.map((q) => row(q, 'active')).join('')}</div>` : '<div class="empty-state">この地方で受注中の依頼はありません。</div>';
    if (tab === 'report') content = reportable.length ? `<div class="quest-bulk-bar guild-bulk report-bulk"><div><b>報告できる依頼：${reportable.length}件</b><small>素材納品も討伐報告も、まとめて一度に完了できます。</small></div><button class="primary-button" data-action="quest-complete-all" data-region="${region}">報告可能をまとめて報告</button></div><div class="list">${reportable.map((q) => row(q, 'report')).join('')}</div>` : '<div class="empty-state">報告できる依頼はありません。進行中の依頼を確認してください。</div>';
    if (tab === 'repeat-delivery') content = repeatDelivery.length ? `<div class="quest-bulk-bar guild-bulk"><div><b>繰り返し納品依頼</b><small>素材をまとめて持ち込むためのタブです。達成済みはその場で報告できます。</small></div><button class="secondary-button" data-action="quest-accept-all" data-region="${region}" data-type="collect">納品依頼をまとめて受注</button></div><div class="list">${repeatDelivery.map((q) => row(q, 'repeat-delivery')).join('')}</div>` : '<div class="empty-state">未解放の繰り返し納品依頼のみです。</div>';
    if (tab === 'repeat-hunt') content = repeatHunt.length ? `<div class="quest-bulk-bar guild-bulk"><div><b>繰り返し討伐依頼</b><small>各探索地の周回に向いた討伐依頼です。</small></div><button class="secondary-button" data-action="quest-accept-all" data-region="${region}" data-type="kill">討伐依頼をまとめて受注</button></div><div class="list">${repeatHunt.map((q) => row(q, 'repeat-hunt')).join('')}</div>` : '<div class="empty-state">未解放の繰り返し討伐依頼のみです。</div>';
    if (tab === 'done') content = done.length ? `<div class="list">${done.map((q) => row(q, 'done')).join('')}</div>` : '<div class="empty-state">まだ達成済みの一回限り依頼はありません。</div>';
    showModal(`<div class="modal-header"><div><h2>${town ? town.name : regionDef.name} 冒険者ギルド</h2><p>${regionDef.name}の依頼板。現在の冒険者レベル：<b>${getRank().name}</b>　／　冒険者経験：${state.adventureExp}</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="quest-tabs guild-tabs">${tabs.map(([id, label]) => `<button class="quest-tab ${tab === id ? 'active' : ''}" data-action="guild-tab" data-tab="${id}">${label}</button>`).join('')}</div>${content}<p class="note">受注・報告をしても依頼ページは閉じません。繰り返し依頼は報告後、同じタブからすぐ再受注できます。</p>`);
  }

  function showShop() {
    const region = currentRegionId(); const regionDef = D.REGIONS?.[region] || {name:'この地方'}; const stock = D.REGION_SHOPS?.[region] || [];
    const items = stock.map((id) => D.ITEM_DEFS[id]).filter(Boolean).filter((entry) => entry.buy && (!entry.minLevel || rankAllowed(String(entry.minLevel))));
    const equipment = stock.map((id) => D.EQUIPMENT_DEFS[id]).filter(Boolean).filter((entry) => entry.price && (!entry.minLevel || rankAllowed(String(entry.minLevel))));
    const itemRows = items.length ? items.map((entry)=>`<div class="list-row"><span class="badge">${entry.effect?.restoreStamina ? '活力' : entry.effect?.reviveHpRate ? '再起' : '道具'}</span><div class="row-main"><strong>${entry.name}</strong><div class="meta">${entry.description}</div><div class="meta">${entry.minLevel ? `解放：冒険者Lv.${entry.minLevel}` : '基本商品'}</div></div><div><div class="value">${entry.buy}G</div><button class="small-button" data-action="buy-item" data-id="${entry.id}" ${state.gold < entry.buy?'disabled':''}>買う</button></div></div>`).join('') : '<div class="empty-state">この地方では、現在購入できる道具がありません。</div>';
    const equipRows = equipment.length ? equipment.map((entry)=>{ const owned=state.ownedEquipment?.includes(entry.id); return `<div class="list-row"><span class="badge">${entry.slot==='accessory'?'装飾':EQUIP_SLOT_LABELS[entry.slot]}</span><div class="row-main"><strong>${entry.name}${entry.allowed!=='all'?'（専用）':''}</strong><div class="meta">${entry.description}</div><div class="meta">${equipmentStatText(entry)}</div></div><div><div class="value">${entry.price}G</div><button class="small-button" data-action="buy-equipment" data-id="${entry.id}" ${owned || state.gold < entry.price?'disabled':''}>${owned?'所持済':'買う'}</button></div></div>`; }).join('') : '<div class="empty-state">この地方では、現在購入できる装備がありません。</div>';
    showModal(`<div class="modal-header"><div><h2>${regionDef.name}の道具屋</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b>　／　地方ごとに品揃えが変わります。</p></div><button class="modal-close" data-action="modal-close">×</button></div><h3>道具</h3><div class="list">${itemRows}</div><h3 style="margin-top:18px;">装備</h3><p class="note">装備は全員で共有し、仲間画面から6部位に分けて装着します。専用装備だけは対象キャラにしか装備できません。</p><div class="list">${equipRows}</div>`);
  }

  function showCraft() {
    const region = currentRegionId(); const regionDef = D.REGIONS?.[region] || {name:'この地方'};
    const recipes = Object.values(D.RECIPES).filter((r) => (r.region || 'lindholm') === region).filter((r) => r.output?.type !== 'equipment' || D.EQUIPMENT_DEFS[r.output.id]).sort((a,b)=>(a.minLevel||1)-(b.minLevel||1)||a.name.localeCompare(b.name,'ja'));
    const rows = recipes.length ? recipes.map((r)=>{ const complete=r.output.type==='equipment' && state.ownedEquipment?.includes(r.output.id); const levelOk=!r.minLevel||rankAllowed(String(r.minLevel)); const outEquip=r.output.type==='equipment'?D.EQUIPMENT_DEFS[r.output.id]:null; return `<div class="list-row"><span class="badge ${levelOk?'':'locked'}">${r.output.type==='equipment'?(outEquip?.slot==='accessory'?'装飾':EQUIP_SLOT_LABELS[outEquip?.slot]||'装備'):'道具'}</span><div class="row-main"><strong>${r.name}${complete?'（所持済）':''}</strong><div class="meta">${r.description}</div><div class="meta">${r.minLevel?`必要：冒険者Lv.${r.minLevel}　／　`:''}材料：${r.ingredients.map((ing)=>`${D.ITEM_DEFS[ing.id]?.name || ing.id} ${countItem(ing.id)}/${ing.qty}`).join('　')}</div>${outEquip?`<div class="meta">${equipmentStatText(outEquip)}</div>`:''}</div><button class="small-button" data-action="craft" data-id="${r.id}" ${!canCraft(r)?'disabled':''}>${complete?'所持済':levelOk?'作る':`Lv.${r.minLevel}必要`}</button></div>`; }).join('') : '<div class="empty-state">この地方で製造できるものは、まだありません。</div>';
    showModal(`<div class="modal-header"><div><h2>${regionDef.name}の製造所</h2><p>地方ごとの素材から、道具と装備を製造します。完成品は自動装備せず、仲間画面の装備変更から着けます。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list">${rows}</div>`);
  }

  function showInn() {
    showModal(`<div class="modal-header"><div><h2>宿屋《風見鶏》</h2><p>20Gで三人のHP・MPと、パーティのスタミナを全回復します。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="card"><div class="meter-label"><span>スタミナ ${formatStamina(state.stamina.current)}/${getStaminaMax()}</span><span>宿泊後 ${getStaminaMax()}/${getStaminaMax()}</span></div><div class="meter stamina"><span style="width:${pct(state.stamina.current,getStaminaMax())}%"></span></div><p class="dialogue-text">白零「今日は、休みましょう。明日も歩くために。」

虹全「賛成。温かいものも食べたい。」

黒零「……眠れるなら、それでいい。」</p><div class="modal-footer"><button class="secondary-button" data-action="modal-close">戻る</button><button class="primary-button" data-action="rest" ${state.gold<20?'disabled':''}>20Gで泊まる</button></div></div>`);
  }

  function showSell() {
    const materials = Object.values(D.ITEM_DEFS).filter((item)=>item.type==='material' && countItem(item.id)>0);
    showModal(`<div class="modal-header"><div><h2>素材買取所</h2><p>所持金：<b style="color:var(--gold)">${state.gold}G</b></p></div><button class="modal-close" data-action="modal-close">×</button></div>${materials.length?`<div class="list">${materials.map((item)=>`<div class="list-row"><span class="badge">素材</span><div class="row-main"><strong>${item.name} ×${countItem(item.id)}</strong><div class="meta">${item.description}</div></div><div><div class="value">${item.sell}G</div><button class="small-button" data-action="sell-item" data-id="${item.id}">1つ売る</button></div></div>`).join('')}</div>`:'<div class="empty-state">売却できる素材がありません。</div>'}`);
  }

  function equipmentStatText(equip) {
    const names = { maxHp:'最大HP', maxMp:'最大MP', atk:'攻撃', def:'防御', mag:'魔力', agi:'敏捷', luck:'幸運' };
    const stats = Object.entries(equip.stats || {}).map(([key,value]) => `${names[key] || key}+${value}`).join('／') || '能力値補正なし';
    return equip.specialText ? `${stats}　／　${equip.specialText}` : stats;
  }
  function showEquipmentManager(id) {
    const def = getDef(id); const loadout = getEquipmentLoadout(id); const eligible = ownedEquipment().filter((equip) => equipmentAllows(id,equip));
    const slotCards = EQUIP_SLOTS.map((slot) => {
      const equippedId = loadout[slot]; const equipped = equippedId ? D.EQUIPMENT_DEFS[equippedId] : null;
      const compatible = eligible.filter((equip) => (equip.slot === 'accessory' ? slot.startsWith('accessory') : equip.slot === slot));
      return `<section class="equip-slot-card"><header><b>${EQUIP_SLOT_LABELS[slot]}</b><span>${equipped ? equipped.name : '未装備'}</span></header>${equipped ? `<div class="equip-current"><strong>${equipped.name}</strong><small>${equipmentStatText(equipped)}</small><button class="small-button" data-action="unequip-item" data-id="${id}" data-slot="${slot}">外す</button></div>` : '<div class="note">未装備</div>'}<div class="equip-options">${compatible.length ? compatible.map((equip) => `<button class="equip-option ${equippedId===equip.id?'equipped':''}" data-action="equip-item" data-id="${id}" data-slot="${slot}" data-equip="${equip.id}"><b>${equip.name}</b><small>${equipmentStatText(equip)}</small>${equippedId===equip.id?'<em>装備中</em>':''}</button>`).join('') : '<span class="note">装備可能な所持品がありません。</span>'}</div></section>`;
    }).join('');
    showModal(`<div class="modal-header"><div><h2>${def.short}の装備</h2><p>頭・体・腕・足・装飾1・装飾2の6部位。装備品は共通で使えますが、一部は本人専用です。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="equip-grid">${slotCards}</div><p class="note">購入・製造した装備は、まず荷物に入り、ここから好きな仲間へ装備します。同じ装備は一人だけが装備できます。</p>`);
  }
  function showCharacterDetails(id) {
    const def=getDef(id),ch=getChar(id),stats=getStats(id);const traits=(def.traits||[]).map(t=>`<div class="trait-box"><b>${t.name}</b><br>${t.description}</div>`).join('');const skills=currentSkills(id);
    showModal(`<div class="modal-header"><div><h2>${def.name}</h2><p>${def.subtitle}</p></div><button class="modal-close" data-action="modal-close">×</button></div><canvas class="portrait-large" style="width:150px;height:200px;display:block;margin:8px auto 14px;" data-portrait="${id}" width="112" height="156"></canvas><p class="dialogue-text">${def.intro}</p><div class="trait-box"><b>現在の旅の立ち位置</b><br>${id==='rainbow'?'二人の間に立ち、答えを急がずに進む。':id==='white'?'守る理由を、少しずつ自分の言葉で探している。':'終わらせる力の先に、残したいものを探している。'}<br><span class="note">遠い未来：${def.teriosName}</span></div><div class="stat-grid">${[['最大HP',stats.maxHp],['最大MP',stats.maxMp],['攻撃',stats.atk],['防御',stats.def],['魔力',stats.mag],['敏捷',stats.agi],['幸運',stats.luck]].map(([n,v])=>`<div class="stat-box"><span>${n}</span><strong>${v}</strong></div>`).join('')}</div><div class="equipment-summary"><b>現在の装備</b><span>${equipmentShortSummary(id)}</span></div><button class="primary-button" data-action="open-equipment" data-id="${id}" style="margin:8px 0 14px;">装備を変更する</button><h3>種族特性</h3>${traits}<h3>習得技と習熟度</h3><div class="list">${skills.map(sk=>`<div class="list-row"><span class="badge">Lv.${skillMasteryLevel(id,sk.id)}</span><div class="row-main"><strong>${sk.name}</strong><div class="meta">${sk.description}</div><div class="meta">${skillMasteryLabel(id,sk.id)}</div></div></div>`).join('')}</div>`);window.requestAnimationFrame(drawVisibleCanvases);
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

  function showUpdateReport() {
    showModal(`<div class="modal-header"><div><h2>v0.7 地方ギルド・装備更新報告</h2><p>地域ごとの目的を増やし、依頼の受注・報告と装備管理の手間を減らす更新です。</p></div><button class="modal-close" data-action="modal-close">×</button></div>
      <div class="report-grid">
        <section class="report-section"><h3>◆ 地方ギルド</h3><ul><li>報告可能な依頼を一括で報告</li><li>受注しても依頼画面を維持</li><li>繰り返し依頼を「納品」「討伐」に分離</li><li>地方ごとの依頼板・常設依頼を実装</li></ul></section>
        <section class="report-section"><h3>◆ 装備</h3><ul><li>頭・体・腕・足・装飾1・装飾2の6部位</li><li>仲間画面から全員分を付け替え</li><li>共通装備＋虹全／白零／黒零の専用装備</li><li>能力値以外に障壁・経験値・素材・金・回復などの特殊効果</li></ul></section>
        <section class="report-section"><h3>◆ 地方追加</h3><ul><li>リンドホルム、白霜北域、緋火海岸、暮影峡谷</li><li>町4、探索地17、各地方のショップ・製造・依頼を分離</li><li>火山海岸・沈み書庫・剣墓・調律の祭壇跡を追加</li><li>地方ごとの敵、レア敵、ボス、隠し収集物を追加</li></ul></section>
        <section class="report-section"><h3>◆ スタミナと周回</h3><ul><li>スタミナ0は探索不可のみ。戦闘敗北扱いを廃止</li><li>オート探索は活力剤設定・下限・使用数で継続</li><li>初級・中級・上級で消費と報酬が変化</li><li>メタル系・ゴールド系を含む周回報酬を強化</li></ul></section>
      </div><p class="note">今回は「地方ごとに遊ぶ理由があるか」「装備の選択が楽しいか」「まとめ報告が十分に速いか」を重点的に見てください。</p><div class="modal-footer"><button class="primary-button" data-action="modal-close">確認した</button></div>`);
  }

  function showSystemMenu() {
    const audioState = state.audio.music ? 'オン' : 'オフ';
    showModal(`<div class="modal-header"><div><h2>メニュー</h2><p>この試作版はブラウザの保存領域に自動セーブします。</p></div><button class="modal-close" data-action="modal-close">×</button></div><div class="list"><button class="list-row" data-action="open-report"><span class="badge active">v0.7</span><span class="row-main"><strong>今回の更新報告</strong><span class="meta">地方ギルド・装備6部位・地方追加の変更点を確認する。</span></span></button><button class="list-row" data-action="toggle-audio"><span class="badge">音楽</span><span class="row-main"><strong>BGM：${audioState}</strong><span class="meta">場所・戦闘に応じたチップ・アンビエントBGMを切り替える。</span></span></button><button class="list-row" data-action="save"><span class="badge">保存</span><span class="row-main"><strong>今すぐセーブ</strong><span class="meta">現在の進行・パネル・習熟度をブラウザに保存する。</span></span></button><button class="list-row" data-action="reset-confirm"><span class="badge locked">初期化</span><span class="row-main"><strong>最初からやり直す</strong><span class="meta">セーブデータを初期状態に戻す。</span></span></button></div><div class="audio-note">スマホでは、最初のタップ後に音が鳴ります。音楽は外部素材を使わないゲーム内生成音です。</div>`);
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
    const def=D.ENEMIES[id]||{};
    // レア・メタル・ゴールドは同じ種別でも色と発光を変え、遭遇時に一目で分かるようにする。
    if(def.metal || id==='metal_slime') { p(27,58,78,29,'#8897a7');p(38,42,56,20,'#c6d3dd');p(49,31,34,15,'#edf4f7');p(43,62,7,7,'#1a2634');p(80,62,7,7,'#1a2634');p(57,74,15,4,'#5c6879');p(32,87,65,4,'#c8d8e4');p(54,38,19,3,'#f8fdff'); }
    else if(def.golden || id==='gold_puff') { p(30,56,73,32,'#d9a42f');p(41,40,51,20,'#f7d76a');p(50,31,33,12,'#fff3a3');p(43,62,7,7,'#573a11');p(80,62,7,7,'#573a11');p(56,75,16,4,'#a56b16');p(32,88,67,4,'#ffdc71'); }
    else if(['pale_slime','bloom_wisp','ruin_wisp','fog_wraith'].includes(id)) { const c=id==='bloom_wisp'?'#cda8ff':id==='ruin_wisp'?'#92caff':id==='fog_wraith'?'#a8b4d0':'#9fdcff';const hi=id==='bloom_wisp'?'#f0d5ff':id==='ruin_wisp'?'#d7f1ff':id==='fog_wraith'?'#e5e9f5':'#d9f7ff';p(29,58,72,28,c);p(39,43,52,18,hi);p(48,34,34,12,hi);p(43,61,6,6,'#18233b');p(79,61,6,6,'#18233b');p(60,72,10,4,'#5d8fb8');p(34,87,59,4,c);if(id!=='pale_slime'){p(57,23,14,11,hi);p(61,15,6,8,'#ffffff');} }
    else if(['grass_hare','silver_hare'].includes(id)) { const c=id==='silver_hare'?'#dbe6f4':'#d8c197',hi=id==='silver_hare'?'#ffffff':'#e7d3aa';p(43,46,45,38,c);p(53,24,11,28,hi);p(69,20,12,32,c);p(44,48,7,8,'#f7edd2');p(76,48,7,8,'#f7edd2');p(46,51,3,3,'#233147');p(78,51,3,3,'#233147');p(54,84,12,6,'#9d7b55');p(74,84,12,6,'#9d7b55');if(id==='silver_hare')p(57,39,17,4,'#b5d8ff'); }
    else if(['wind_wolf','frost_lupus','iron_boar','thorn_mantis','bosswolf','moss_titan','glass_drake','starfall_beast'].includes(id)) { const boss=['bosswolf','moss_titan','starfall_beast'].includes(id);const frost=id==='frost_lupus',boar=id==='iron_boar',mantis=id==='thorn_mantis',drake=id==='glass_drake';const c=frost?'#9bc9e2':boar?'#7a7d79':mantis?'#638052':drake?'#7696b4':boss?'#607e4d':'#8ba1a7';const hi=frost?'#dff8ff':boar?'#a3a6a2':mantis?'#a9c96e':drake?'#bfd9ef':boss?'#7f9e59':'#a9bec0';p(31,52,73,32,c);p(45,37,42,25,hi);p(42,28,13,19,c);p(76,27,13,19,c);p(38,51,7,6,'#17212c');p(80,51,7,6,'#17212c');p(55,61,18,5,'#262018');p(35,83,13,10,c);p(85,83,13,10,c);if(boar){p(28,55,14,8,'#dad7cf');p(91,55,14,8,'#dad7cf');p(57,47,7,5,'#f0d671');}if(mantis){p(21,50,16,6,'#acc867');p(98,50,16,6,'#acc867');p(56,31,16,4,'#d5f28d');}if(drake){p(21,29,25,18,'#b8dbef');p(88,29,25,18,'#b8dbef');p(57,27,15,4,'#f6f1a8');}if(boss){p(33,39,10,7,'#96b969');p(90,44,12,7,'#96b969');p(55,32,20,5,'#b2d479');p(58,55,5,4,'#ffdc72');p(70,55,5,4,'#ffdc72');} }
    else if(['whisper_treant','ancient_golem','hollow_knight','prism_mimic','ruin_sentinel'].includes(id)) { const golem=['ancient_golem','ruin_sentinel'].includes(id), mimic=id==='prism_mimic';p(43,28,46,58,golem?'#7e879b':mimic?'#846ca4':'#705f42');p(50,20,30,11,golem?'#a6afc5':mimic?'#d3b7ff':'#5e583e');p(51,40,8,8,mimic?'#ffd36f':'#303a52');p(73,40,8,8,mimic?'#ffd36f':'#303a52');p(55,64,23,8,'#4a5165');p(32,67,12,22,golem?'#677189':'#7a774e');p(88,67,12,22,golem?'#677189':'#7a774e');p(51,76,29,15,golem?'#566076':'#456f4d');p(58,31,15,4,mimic?'#ff8eea':'#e6d881');if(mimic){p(35,23,62,5,'#d9bbff');p(48,86,37,7,'#563b77');} }
    else { p(43,28,46,58,'#7e879b');p(50,20,30,11,'#a6afc5');p(51,40,8,8,'#303a52');p(73,40,8,8,'#303a52');p(55,64,23,8,'#4a5165');p(32,67,12,22,'#677189');p(88,67,12,22,'#677189');p(51,76,29,15,'#566076');p(58,31,15,4,'#e6d881'); }
  }

  function drawWorldMap(canvas) {
    const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    if (state.mapUi?.mode === 'world') {
      pixel(ctx,0,0,w,h,'#142337');
      // 海と大陸。クリック操作は下の地方カードで行うため、ここは世界の広がりを見せるピクセル地図。
      for(let i=0;i<180;i++){ const x=(i*67)%w, y=(i*43)%h; pixel(ctx,x,y,2,2,i%5===0?'#97cbe0':'#4b7194'); }
      const land=(x,y,ww,hh,c1,c2)=>{ pixel(ctx,x,y,ww,hh,c1); for(let i=0;i<34;i++){ const px=x+((i*47)%ww),py=y+((i*31)%hh); pixel(ctx,px,py,8+(i%3)*4,5+(i%2)*4,c2); } };
      land(90,190,270,180,'#6f9a66','#92bd70'); land(435,85,220,160,'#738aa1','#98afbd'); land(470,300,240,125,'#a26b4e','#d18c5a'); land(110,55,165,85,'#5c677d','#8a94a5');
      // 山脈・街道・都市の目印
      for(let i=0;i<15;i++){ const x=455+i*12,y=125+(i%4)*13; pixel(ctx,x,y,18,15,'#4d5f70');pixel(ctx,x+5,y-8,8,9,'#b2c0cb'); }
      ctx.strokeStyle='#d6c58e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(230,298);ctx.quadraticCurveTo(370,230,520,165);ctx.stroke();
      pixel(ctx,208,290,14,11,'#f0d78d');pixel(ctx,536,156,14,11,'#d9efff');pixel(ctx,566,360,14,11,'#ff9d69');pixel(ctx,183,95,14,11,'#b9c4dd');
      ctx.fillStyle='#eef0c7';ctx.font='bold 18px monospace';ctx.fillText('OMNIL WORLD', 34, 42);ctx.font='12px monospace';ctx.fillStyle='#c9d9e8';ctx.fillText('LINDHOLM', 167, 388);ctx.fillText('NORTHREACH', 476, 66);ctx.fillText('EMBER COAST', 522, 455);ctx.fillText('DUSK VALE', 110, 165);
      ctx.strokeStyle='#a6bdd2';ctx.lineWidth=2;ctx.strokeRect(18,18,w-36,h-36); return;
    }
    // 地方図。地域ごとの位置ラベルはHTML側で重ねる。
    const activeRegion = state.mapUi?.region || 'lindholm';
    const regionFrame = (fill, inner, line, title) => {
      pixel(ctx,0,0,w,h,fill); pixel(ctx,24,20,w-48,h-40,inner);
      ctx.strokeStyle=line;ctx.lineWidth=2;ctx.strokeRect(24,20,w-48,h-40);
      ctx.fillStyle='#f0e7bd';ctx.font='bold 14px monospace';ctx.fillText(title.toUpperCase(),46,48);
      ctx.fillStyle='#dce9ce';ctx.font='12px monospace';ctx.fillText('N',754,51);pixel(ctx,754,58,4,18,'#e6e1b7');pixel(ctx,749,62,14,4,'#e6e1b7');
    };
    if (activeRegion === 'embercoast') {
      regionFrame('#432c36','#a9664b','#e2b378','EMBER COAST');
      // 海、火山灰、火口、港へ続く道
      pixel(ctx,24,285,w-48,h-325,'#2f6f8d');for(let i=0;i<65;i++){const x=35+(i*67)%(w-70),y=303+(i*29)%150;pixel(ctx,x,y,18,3,i%2?'#69a8b7':'#b2d7d0');}
      for(let i=0;i<46;i++){const x=55+(i*79)%660,y=95+(i*41)%170;pixel(ctx,x,y,14,6,i%3?'#bd7954':'#d58a5b');}
      // 火口山
      pixel(ctx,530,70,180,155,'#4e3a3a');pixel(ctx,566,42,102,195,'#653a31');pixel(ctx,592,22,48,52,'#2b2229');pixel(ctx,606,31,22,11,'#ef7952');
      for(let i=0;i<15;i++){const x=545+(i*19)%145,y=135+(i*29)%82;pixel(ctx,x,y,8,7,'#f49d55');}
      ctx.strokeStyle='#f0c17b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(205,355);ctx.quadraticCurveTo(340,300,470,257);ctx.quadraticCurveTo(560,218,630,163);ctx.stroke();ctx.strokeStyle='#855846';ctx.lineWidth=2;ctx.stroke();
      // 港と洞窟
      pixel(ctx,168,348,42,16,'#d2b987');pixel(ctx,174,329,12,20,'#7d443a');pixel(ctx,190,336,11,13,'#8f523e');pixel(ctx,638,235,66,46,'#3b3341');pixel(ctx,655,221,36,18,'#776b82');
      return;
    }
    if (activeRegion === 'duskvale') {
      regionFrame('#29263d','#4e496b','#a58cb5','DUSK VALE');
      // 夕闇の峡谷、剣墓、三つの祭壇石
      pixel(ctx,24,286,w-48,h-326,'#3d384f');for(let i=0;i<47;i++){const x=38+(i*71)%(w-78),y=300+(i*37)%135;pixel(ctx,x,y,25,4,i%2?'#79718f':'#a29ab3');}
      for(let i=0;i<40;i++){const x=60+(i*97)%650,y=104+(i*43)%164;pixel(ctx,x,y,18,13,'#322f49');pixel(ctx,x+6,y-7,7,8,'#a085a2');}
      // 峡谷の裂け目
      ctx.strokeStyle='#1e1b2d';ctx.lineWidth=42;ctx.beginPath();ctx.moveTo(424,50);ctx.bezierCurveTo(350,150,480,223,410,322);ctx.bezierCurveTo(380,365,480,415,510,482);ctx.stroke();
      ctx.strokeStyle='#8a6d94';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(188,361);ctx.quadraticCurveTo(306,307,440,276);ctx.quadraticCurveTo(575,240,653,176);ctx.stroke();
      // 剣墓
      for(let i=0;i<24;i++){const x=524+(i*31)%160,y=106+(i*47)%126;pixel(ctx,x,y,4,35,'#c2c8d8');pixel(ctx,x-5,y+18,14,4,'#8c95aa');}
      // 調律の祭壇
      pixel(ctx,651,300,73,62,'#5c5776');pixel(ctx,669,279,12,48,'#d9d6ff');pixel(ctx,695,270,12,57,'#bdb5ed');pixel(ctx,720,279,12,48,'#d9d6ff');
      return;
    }
    pixel(ctx,0,0,w,h,'#25354a');
    // 地図の羊皮紙風ベース
    pixel(ctx,24,20,w-48,h-40,'#6d8b63');
    pixel(ctx,34,30,w-68,h-60,'#79a96a');
    // 北部山地
    for(let i=0;i<19;i++){const x=405+i*16;const y=76+(i%4)*12;pixel(ctx,x,y,22,16,'#506170');pixel(ctx,x+6,y-10,10,10,'#8795a1');}
    // 東の深林
    for(let i=0;i<48;i++){const x=430+(i%8)*31+(i%2)*5;const y=188+Math.floor(i/8)*29;pixel(ctx,x,y,16,27,'#25563e');pixel(ctx,x+3,y-11,10,14,'#3f7a4d');}
    // 西の草原と小丘
    for(let i=0;i<70;i++){const x=74+(i*53)%322;const y=145+(i*31)%246;pixel(ctx,x,y,8,4,(i%3===0)?'#a7ca71':'#91bd65');}
    for(let i=0;i<10;i++){const x=124+i*28; const y=118+(i%3)*14;pixel(ctx,x,y,22,10,'#668e57');pixel(ctx,x+7,y-7,9,7,'#94b86a');}
    // 河川と湖
    ctx.strokeStyle='#75b8d2';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(268,40);ctx.bezierCurveTo(226,120,334,152,302,232);ctx.bezierCurveTo(276,300,385,352,368,461);ctx.stroke();
    ctx.strokeStyle='#b9dddf';ctx.lineWidth=3;ctx.stroke();
    pixel(ctx,214,342,78,28,'#78b7ca');pixel(ctx,226,336,54,8,'#9bd2d5');
    // 地方の街道。海ではなく、拠点をつなぐ道。
    ctx.strokeStyle='#d6c58e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(161,354);ctx.quadraticCurveTo(246,317,332,291);ctx.quadraticCurveTo(432,262,519,207);ctx.quadraticCurveTo(602,154,664,127);ctx.stroke();
    ctx.strokeStyle='#96815c';ctx.lineWidth=2;ctx.stroke();
    // リンドホルムの町、草原、森、遺構の目印
    pixel(ctx,136,348,38,17,'#d7c49b');pixel(ctx,143,336,10,14,'#854b3f');pixel(ctx,157,334,9,16,'#764336');pixel(ctx,166,346,6,19,'#5b4230');
    pixel(ctx,318,292,7,7,'#ffef97');pixel(ctx,325,285,4,4,'#fff6c1');
    pixel(ctx,500,196,8,8,'#a9f0af');pixel(ctx,507,189,4,4,'#d1ffd3');
    pixel(ctx,657,117,35,14,'#8f96a2');pixel(ctx,665,104,12,16,'#c2cad2');pixel(ctx,680,110,8,11,'#a8b2bd');
    // 地方枠と方位
    ctx.strokeStyle='#b9cc9a';ctx.lineWidth=2;ctx.strokeRect(24,20,w-48,h-40);
    const regionName=(D.REGIONS?.[state.mapUi?.region || 'lindholm']?.name || 'LINDHOLM REGION').toUpperCase();ctx.fillStyle='#e6e1b7';ctx.font='bold 14px monospace';ctx.fillText(regionName, 46, 48);
    ctx.fillStyle='#dce9ce';ctx.font='12px monospace';ctx.fillText('N', 754, 51);
    pixel(ctx,754,58,4,18,'#e6e1b7');pixel(ctx,749,62,14,4,'#e6e1b7');
  }

  function drawLocationMap(canvas, id) {
    const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    if(D.LOCATIONS[id]?.type==='town') {
      pixel(ctx,0,0,w,h,'#75a6cf');pixel(ctx,0,180,w,180,'#72aa67');
      for(let x=0;x<w;x+=22){pixel(ctx,x,238,15,6,'#a8c777');}
      ctx.fillStyle='#b8a373';ctx.fillRect(0,250,w,55);ctx.fillStyle='#96744e';ctx.fillRect(0,295,w,12);
      const building=(x,y,ww,hh,roof,wall)=>{pixel(ctx,x,y,ww,hh,wall);pixel(ctx,x-7,y-13,ww+14,14,roof);pixel(ctx,x+ww/2-5,y+hh-17,10,17,'#5e4430');pixel(ctx,x+8,y+11,8,8,'#dff0ff');};
      building(102,124,116,85,'#773f42','#d5bd96');building(340,84,114,104,'#51405f','#b7b0be');building(550,143,135,79,'#7b4b32','#cda477');building(354,235,100,73,'#345368','#c7d4c0');building(614,250,103,67,'#534f47','#9fa29a');
      for(let i=0;i<14;i++){const x=30+i*56;pixel(ctx,x,171,11,35,'#604d36');pixel(ctx,x-8,153,28,22,'#3e704a');}
      pixel(ctx,176,112,22,9,'#f5dc75');pixel(ctx,385,68,22,9,'#b7e4ff');pixel(ctx,599,130,22,9,'#ffd18a');
    } else {
      const isForest=['whisper_woods','moss_depths'].includes(id);
      const isRuin=['fallen_ruins','north_observatory'].includes(id);
      const isCave=['crystal_cavern'].includes(id);
      const isMarsh=['moonfog_marsh'].includes(id);
      const isFrost=['frost_wastes'].includes(id);
      const isHills=['iron_hills','starfall_ridge'].includes(id);
      const isCoast=['ember_beach','caldera_path'].includes(id);
      const isDusk=['shadow_gorge','sword_graves','balance_sanctum'].includes(id);
      const sky=isDusk?'#45415f':isCoast?'#d27a58':isFrost?'#9abdd9':isCave?'#344466':isMarsh?'#677f9c':isRuin?'#3b4d68':isForest?'#5b8a6e':isHills?'#a0a3a4':'#83b6de';
      const ground=isDusk?'#4c475e':isCoast?'#8d5441':isFrost?'#dce7e6':isCave?'#4a506a':isMarsh?'#526c62':isRuin?'#617284':isForest?'#466e4c':isHills?'#807b67':'#83b66e';
      pixel(ctx,0,0,w,h,sky);pixel(ctx,0,160,w,200,ground);
      for(let i=0;i<80;i++){const x=(i*67)%w,y=180+(i*29)%150;const c=isFrost?'#f5fcff':isCave?'#64749b':isMarsh?'#76917a':isRuin?'#7c8a91':isForest?'#2e5d3f':isHills?'#a5926b':'#a7cc77';pixel(ctx,x,y,10,5,c);}
      if(isDusk){
        for(let i=0;i<33;i++){const x=(i*73)%w,y=140+(i*39)%170;pixel(ctx,x,y,4,42,'#b9bed0');pixel(ctx,x-6,y+22,16,4,'#71768d');}
        ctx.strokeStyle='#242235';ctx.lineWidth=36;ctx.beginPath();ctx.moveTo(430,20);ctx.bezierCurveTo(385,140,475,198,440,340);ctx.stroke();
        if(id==='balance_sanctum'){pixel(ctx,552,90,108,124,'#6c6687');pixel(ctx,576,65,16,100,'#e7e1ff');pixel(ctx,608,56,16,109,'#b9b0ed');pixel(ctx,640,65,16,100,'#e7e1ff');}
        if(id==='sword_graves'){for(let i=0;i<22;i++){const x=530+(i*31)%165,y=150+(i*37)%100;pixel(ctx,x,y,5,54,'#d1d5e0');pixel(ctx,x-7,y+25,18,4,'#8f96a8');}}
      } else if(isCoast){
        pixel(ctx,0,252,w,108,'#2b7892');for(let i=0;i<45;i++){const x=(i*71)%w,y=268+(i*23)%78;pixel(ctx,x,y,22,3,i%2?'#9dcbd0':'#5b9daf');}
        for(let i=0;i<46;i++){const x=(i*67)%w,y=167+(i*31)%86;pixel(ctx,x,y,13,4,'#d88454');}
        if(id==='caldera_path'){pixel(ctx,520,48,190,166,'#483238');pixel(ctx,562,22,96,198,'#66382f');pixel(ctx,588,16,44,39,'#261f29');pixel(ctx,602,26,20,8,'#f18a4f');}
      } else if(isForest){
        for(let i=0;i<24;i++){const x=(i*91)%w;const y=100+(i*47)%150;pixel(ctx,x,y,13,80,'#3d4d31');pixel(ctx,x-20,y-35,54,40,'#2c573c');pixel(ctx,x-9,y-54,32,27,'#39754c');}
        if(id==='moss_depths'){for(let i=0;i<18;i++){const x=(i*79)%w,y=230+(i*43)%100;pixel(ctx,x,y,17,10,'#6e9a62');pixel(ctx,x+4,y-7,8,7,'#a5c77a');}}
      } else if(isRuin){
        for(let i=0;i<22;i++){const x=(i*109)%w;const y=124+(i*53)%160;pixel(ctx,x,y,30,50,'#737b88');pixel(ctx,x-8,y-9,45,12,'#a1a7ad');}
        pixel(ctx,510,78,95,148,'#a8abb7');pixel(ctx,535,55,45,182,'#798293');pixel(ctx,548,85,19,44,'#e0d488');
        if(id==='north_observatory'){pixel(ctx,600,40,110,18,'#c3d6e6');pixel(ctx,620,24,70,20,'#708198');pixel(ctx,647,8,16,54,'#d9efff');}
      } else if(isCave){
        for(let i=0;i<46;i++){const x=(i*71)%w,y=54+(i*37)%260;pixel(ctx,x,y,6,32,'#7e86b5');pixel(ctx,x-7,y+22,20,10,'#a8b3ef');pixel(ctx,x+3,y+8,4,10,'#eff2ff');}
        pixel(ctx,515,76,120,182,'#525b83');pixel(ctx,545,52,55,200,'#7b82bb');pixel(ctx,565,78,16,92,'#e5e1ff');
      } else if(isMarsh){
        for(let i=0;i<22;i++){const x=(i*97)%w,y=190+(i*43)%100;pixel(ctx,x,y,44,12,'#3f6f68');pixel(ctx,x+8,y-10,8,10,'#789f86');}
        for(let i=0;i<38;i++){const x=(i*63)%w,y=48+(i*41)%130;pixel(ctx,x,y,18,7,'#bfc5e0');}
        pixel(ctx,550,38,65,30,'#d8d7f5');pixel(ctx,575,28,18,18,'#eef0ff');
      } else if(isFrost){
        for(let i=0;i<68;i++){const x=(i*59)%w,y=165+(i*23)%150;pixel(ctx,x,y,12,4,'#ffffff');}
        for(let i=0;i<20;i++){const x=(i*83)%w,y=90+(i*31)%170;pixel(ctx,x,y,8,44,'#6f9abe');pixel(ctx,x-8,y+28,24,9,'#bddcf0');}
        pixel(ctx,530,52,140,80,'#b8d6e7');pixel(ctx,550,36,100,35,'#e9f8ff');
      } else if(isHills){
        for(let i=0;i<33;i++){const x=(i*71)%w,y=124+(i*37)%170;pixel(ctx,x,y,44,24,'#6f705f');pixel(ctx,x+11,y-12,22,14,'#a09b7b');}
        if(id==='starfall_ridge'){for(let i=0;i<44;i++){const x=(i*47)%w,y=(i*29)%145;pixel(ctx,x,y,3,3,'#fff1a8');}pixel(ctx,566,66,23,130,'#56617b');pixel(ctx,559,58,36,14,'#aeb8c7');}
        else {for(let i=0;i<16;i++){const x=70+(i*83)%620,y=210+(i*31)%100;pixel(ctx,x,y,10,8,'#b9a95e');pixel(ctx,x+3,y-5,4,5,'#e9d576');}}
      } else {
        for(let i=0;i<35;i++){const x=(i*83)%w;const y=170+(i*31)%140;pixel(ctx,x,y,6,20,'#4d8053');pixel(ctx,x-7,y-10,19,13,'#8cb75a');}
        ctx.strokeStyle='#d9c77c';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,286);ctx.quadraticCurveTo(320,230,800,280);ctx.stroke();
        if(id==='brook_meadows'){ctx.fillStyle='#79bed2';ctx.fillRect(0,245,w,25);ctx.fillStyle='#c3e9e3';ctx.fillRect(0,245,w,4);}
      }
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
    else if (a === 'map-mode') { state.mapUi ||= {}; state.mapUi.mode=target.dataset.mode || 'region'; saveGame(); render(); }
    else if (a === 'map-select-region') { const region=D.REGIONS?.[id]; if(region && rankAllowed(region.unlockRank || '1')) { state.mapUi ||= {}; state.mapUi.region=id; state.mapUi.mode='region'; saveGame(); render(); } }
    else if (a === 'open-report') { showUpdateReport(); }
    else if (a === 'go-party') { state.scene='party'; render(); }
    else if (a === 'enter-location') enterLocation(id);
    else if (a === 'explore') explore(id);
    else if (a === 'select-explore-difficulty') { state.explorationUi.selectedDifficulty[id] = target.dataset.difficulty; saveGame(); render(); }
    else if (a === 'auto-explore') startAutoExplore(id);
    else if (a === 'auto-explore-open') openAutoExploreSetup(id);
    else if (a === 'auto-explore-confirm') { const floor=document.getElementById('autoStaminaFloor')?.value || 0; const tonicId=document.getElementById('autoTonicId')?.value || ''; const tonicCount=document.getElementById('autoTonicCount')?.value || 0; closeModal(); startAutoExplore(id,floor,tonicId,tonicCount); }
    else if (a === 'cancel-auto-explore') stopAutoExplore();
    else if (a === 'facility') openFacility(id);
    else if (a === 'open-panel') { state.selectedCharacter=id; state.scene='panel'; render(); }
    else if (a === 'open-character') { state.selectedCharacter=id; state.scene='party'; render(); }
    else if (a === 'open-equipment') showEquipmentManager(id);
    else if (a === 'view-character') showCharacterDetails(id);
    else if (a === 'equip-item') { if (equipEquipment(id, target.dataset.slot, target.dataset.equip)) { toast('装備を変更しました。', 'good'); showEquipmentManager(id); } else toast('その装備は変更できません。', 'warn'); }
    else if (a === 'unequip-item') { unequipEquipment(id, target.dataset.slot); showEquipmentManager(id); }
    else if (a === 'panel-unlock') unlockPanel(id,target.dataset.panel);
    else if (a === 'panel-select') { state.panelUi.selected[id]=target.dataset.panel; render(); }
    else if (a === 'panel-branch') { state.panelUi.branch[id]=target.dataset.branch; state.panelUi.selected[id]=null; render(); }
    else if (a === 'panel-unlock-selected') unlockPanel(id,target.dataset.panel);
    else if (a === 'quest-accept') { const inGuild = modalLayer.classList.contains('open'); acceptQuest(id, { keepView: true }); if (inGuild) showGuild(); else render(); }
    else if (a === 'quest-accept-all') { acceptAllAvailableQuests(modalLayer.classList.contains('open') ? 'guild' : 'log', target.dataset.region || null, target.dataset.type || null); }
    else if (a === 'guild-tab') { state.questUi.tab = target.dataset.tab; saveGame(); showGuild(); }
    else if (a === 'quest-tab') { state.questUi.tab = target.dataset.tab; saveGame(); render(); }
    else if (a === 'quest-complete') { const inGuild = modalLayer.classList.contains('open'); const done = completeQuest(id, { keepView:true }); if (done) { if (inGuild) showGuild(); else render(); } }
    else if (a === 'quest-complete-all') { completeAllQuests(target.dataset.region || null, target.dataset.type || null, modalLayer.classList.contains('open') ? 'guild' : 'log'); }
    else if (a === 'buy-item') { buyItem(id); if(modalLayer.classList.contains('open')) showShop(); }
    else if (a === 'buy-equipment') { buyEquipment(id); if(modalLayer.classList.contains('open')) showShop(); }
    else if (a === 'craft') { craft(id); if(modalLayer.classList.contains('open')) showCraft(); }
    else if (a === 'equip-craft') { equipCrafted(id); }
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
