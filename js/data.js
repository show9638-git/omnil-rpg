/* 全零〈オムニル〉 prototype data — 外部素材なしで動く、拡張前提の定義ファイル */
window.OMNIL_DATA = (() => {
  const RANKS = [
    { id: 'F', name: 'F級', threshold: 0, description: '駆け出しの冒険者。宿場町の近辺を任される。' },
    { id: 'E', name: 'E級', threshold: 90, description: '一人前の入口。危険な遺跡への立入が許可される。' },
    { id: 'D', name: 'D級', threshold: 240, description: '地域から信頼される冒険者。' },
    { id: 'C', name: 'C級', threshold: 520, description: '地方を代表する実力者。' },
  ];

  const ITEM_DEFS = {
    herb: { id: 'herb', name: '草原の薬草', type: 'material', description: '風を受けて育った、香りの強い薬草。', sell: 8 },
    wolf_fang: { id: 'wolf_fang', name: '風牙', type: 'material', description: '風斬りウルフの牙。刃物の素材になる。', sell: 18 },
    slime_core: { id: 'slime_core', name: '淡光の核', type: 'material', description: '淡く光る粘体の核。魔力をわずかに含む。', sell: 12 },
    bark: { id: 'bark', name: '囁き樹の樹皮', type: 'material', description: '魔力を含む古木の樹皮。', sell: 22 },
    old_fragment: { id: 'old_fragment', name: '古びた石片', type: 'material', description: '失われた遺構の一部。刻印は読めない。', sell: 35 },
    prism_dust: { id: 'prism_dust', name: '虹晶の粉', type: 'material', description: '白・黒・虹の魔力に反応する結晶粉。', sell: 42 },
    potion: { id: 'potion', name: '癒しの小瓶', type: 'consumable', description: '仲間1人のHPを45回復する。', sell: 15, buy: 38, effect: { healHp: 45 } },
    ether: { id: 'ether', name: '澄んだ小瓶', type: 'consumable', description: '仲間1人のMPを18回復する。', sell: 18, buy: 55, effect: { healMp: 18 } },
    antidote: { id: 'antidote', name: '解毒草', type: 'consumable', description: '毒を治療し、HPを15回復する。', sell: 8, buy: 24, effect: { healHp: 15, cure: 'poison' } },
  };

  const EQUIPMENT_DEFS = {
    rainbow_edge: { id: 'rainbow_edge', name: '調律の刃片', target: 'rainbow', slot: 'weapon', description: '虹全の攻撃力を+3する、虹晶を封じた刃片。', stats: { atk: 3 } },
    white_charm: { id: 'white_charm', name: '守りの護符', target: 'white', slot: 'charm', description: '白零の防御力を+3、最大HPを+8する。', stats: { def: 3, maxHp: 8 } },
    black_ring: { id: 'black_ring', name: '侵食の指輪', target: 'black', slot: 'ring', description: '黒零の魔力を+3、敏捷を+1する。', stats: { mag: 3, agi: 1 } },
  };

  const CHARACTER_DEFS = {
    rainbow: {
      id: 'rainbow', name: '虹全〈コウゼン〉', short: '虹全', subtitle: 'カオス／調律の半神', role: '調律・連携',
      color: 'rainbow', portrait: 'rainbow',
      base: { maxHp: 104, maxMp: 28, atk: 15, def: 10, mag: 11, agi: 10, luck: 7 },
      growth: { maxHp: 14, maxMp: 4, atk: 3, def: 2, mag: 2, agi: 2, luck: 1 },
      trait: { name: 'カオスの均衡', description: 'HPが半分以下の時、与えるダメージと受ける回復量が10%上昇する。' },
      intro: '「命令を確認。……だが、これは俺が選ぶ。」',
      starterSkills: ['rainbow_slash'],
      panels: [
        { id: 'r_core', name: '調律核', category: 'trait', cost: 0, prerequisite: null, description: '白と黒の力を安定させる核。基礎パネル。', effect: { maxMp: 4 } },
        { id: 'r_strength', name: '境界の剣腕', category: 'stat', cost: 1, prerequisite: 'r_core', description: '攻撃力+3。', effect: { atk: 3 } },
        { id: 'r_flow', name: '色彩の歩法', category: 'stat', cost: 1, prerequisite: 'r_core', description: '敏捷+2、最大HP+6。', effect: { agi: 2, maxHp: 6 } },
        { id: 'r_resonance', name: '彩虹の共鳴', category: 'skill', cost: 2, prerequisite: 'r_strength', minLevel: 3, storyFlag: 'choice', description: '全体を整える調律技「共鳴波」を習得。', skill: 'resonance_wave' },
        { id: 'r_balance', name: '天秤の意思', category: 'stat', cost: 2, prerequisite: 'r_flow', minLevel: 4, description: '防御+3、魔力+2。', effect: { def: 3, mag: 2 } },
      ],
    },
    white: {
      id: 'white', name: '白零〈ハクレイ〉', short: '白零', subtitle: 'アルファ／白の器', role: '守護・回復',
      color: 'white', portrait: 'white',
      base: { maxHp: 96, maxMp: 38, atk: 10, def: 12, mag: 15, agi: 8, luck: 8 },
      growth: { maxHp: 12, maxMp: 6, atk: 2, def: 3, mag: 3, agi: 1, luck: 1 },
      trait: { name: '白の器', description: '戦闘終了時、最もHPが低い仲間を最大HPの5%だけ回復する。' },
      intro: '「損傷を抑制します。……それが、必要なのですね。」',
      starterSkills: ['white_blessing'],
      panels: [
        { id: 'w_core', name: '再生の器', category: 'trait', cost: 0, prerequisite: null, description: '始まり・再生・祝福を宿す基礎パネル。', effect: { maxMp: 5 } },
        { id: 'w_guard', name: '白壁の構え', category: 'stat', cost: 1, prerequisite: 'w_core', description: '防御+3、最大HP+8。', effect: { def: 3, maxHp: 8 } },
        { id: 'w_focus', name: '祝福の息吹', category: 'stat', cost: 1, prerequisite: 'w_core', description: '魔力+3、最大MP+5。', effect: { mag: 3, maxMp: 5 } },
        { id: 'w_protect', name: '「守りたい」', category: 'skill', cost: 2, prerequisite: 'w_guard', minLevel: 3, storyFlag: 'protect', description: '味方をかばう「白光の護り」を習得。', skill: 'white_guard' },
        { id: 'w_mercy', name: '静かな祈り', category: 'skill', cost: 2, prerequisite: 'w_focus', minLevel: 4, description: '全体回復「静謐の祈り」を習得。', skill: 'quiet_prayer' },
      ],
    },
    black: {
      id: 'black', name: '黒零〈コクレイ〉', short: '黒零', subtitle: 'オメガ／黒の器', role: '破壊・弱体',
      color: 'black', portrait: 'black',
      base: { maxHp: 100, maxMp: 30, atk: 16, def: 9, mag: 13, agi: 11, luck: 6 },
      growth: { maxHp: 13, maxMp: 5, atk: 3, def: 2, mag: 3, agi: 2, luck: 1 },
      trait: { name: '終焉の残響', description: '弱体状態の敵へ与えるダメージが15%上昇する。' },
      intro: '「障害を排除する。……触れるな。」',
      starterSkills: ['black_cut'],
      panels: [
        { id: 'b_core', name: '終焉の器', category: 'trait', cost: 0, prerequisite: null, description: '破壊・終焉・侵食を宿す基礎パネル。', effect: { atk: 1, maxMp: 4 } },
        { id: 'b_fang', name: '黒刃の研磨', category: 'stat', cost: 1, prerequisite: 'b_core', description: '攻撃力+3。', effect: { atk: 3 } },
        { id: 'b_hex', name: '侵食の知覚', category: 'stat', cost: 1, prerequisite: 'b_core', description: '魔力+3、敏捷+1。', effect: { mag: 3, agi: 1 } },
        { id: 'b_anger', name: '「壊したくない」', category: 'skill', cost: 2, prerequisite: 'b_fang', minLevel: 3, storyFlag: 'anger', description: '防御を崩す「終末の楔」を習得。', skill: 'ruin_wedge' },
        { id: 'b_shade', name: '影を裂く者', category: 'skill', cost: 2, prerequisite: 'b_hex', minLevel: 4, description: '全体へ侵食を広げる「夜蝕」を習得。', skill: 'night_eclipse' },
      ],
    },
  };

  const SKILLS = {
    rainbow_slash: { id: 'rainbow_slash', name: '調律斬', owner: 'rainbow', mp: 5, target: 'enemy', power: 1.55, kind: 'physical', description: '虹の残光をまとった一撃。与ダメージの20%だけ自分を回復する。', lifeSteal: 0.2 },
    resonance_wave: { id: 'resonance_wave', name: '共鳴波', owner: 'rainbow', mp: 10, target: 'allAllies', kind: 'heal', heal: 0.38, description: '全員のHPを最大HPの38%回復し、弱体を1つ取り除く。' },
    white_blessing: { id: 'white_blessing', name: '白光の加護', owner: 'white', mp: 6, target: 'ally', kind: 'heal', heal: 0.43, description: '味方1人のHPを最大HPの43%回復する。' },
    white_guard: { id: 'white_guard', name: '白光の護り', owner: 'white', mp: 8, target: 'ally', kind: 'guard', description: '味方1人を2ターンかばい、防御力を上昇させる。' },
    quiet_prayer: { id: 'quiet_prayer', name: '静謐の祈り', owner: 'white', mp: 12, target: 'allAllies', kind: 'heal', heal: 0.27, description: '全員のHPを最大HPの27%回復する。' },
    black_cut: { id: 'black_cut', name: '漆黒刃', owner: 'black', mp: 5, target: 'enemy', power: 1.45, kind: 'physical', description: '敵へ侵食を刻む黒き一閃。2ターン、防御を低下させる。', inflict: { type: 'fracture', turns: 2 } },
    ruin_wedge: { id: 'ruin_wedge', name: '終末の楔', owner: 'black', mp: 8, target: 'enemy', power: 1.8, kind: 'magic', description: '防御を破る楔を打ち込む。侵食中の敵には威力上昇。', bonusOnDebuff: 0.35 },
    night_eclipse: { id: 'night_eclipse', name: '夜蝕', owner: 'black', mp: 11, target: 'enemy', power: 1.25, kind: 'magic', description: '敵全体を蝕む影。敵が複数いる場合に威力を発揮する。', inflict: { type: 'fracture', turns: 2 } },
  };

  const ENEMIES = {
    pale_slime: { id: 'pale_slime', name: '淡光スライム', level: 1, maxHp: 58, atk: 10, def: 4, mag: 6, agi: 7, exp: 18, gold: 12, sprite: 'slime', drops: [{ id: 'slime_core', chance: 0.9, qty: [1, 2] }], skills: [{ name: '体当たり', power: 1.0 }] },
    grass_hare: { id: 'grass_hare', name: '草駆けラビット', level: 1, maxHp: 48, atk: 12, def: 3, mag: 3, agi: 12, exp: 16, gold: 10, sprite: 'hare', drops: [{ id: 'herb', chance: 0.65, qty: [1, 2] }], skills: [{ name: '跳び蹴り', power: 1.05 }] },
    wind_wolf: { id: 'wind_wolf', name: '風斬りウルフ', level: 2, maxHp: 86, atk: 15, def: 7, mag: 7, agi: 14, exp: 31, gold: 22, sprite: 'wolf', drops: [{ id: 'wolf_fang', chance: 0.85, qty: [1, 2] }, { id: 'herb', chance: 0.45, qty: [1, 2] }], skills: [{ name: '風牙', power: 1.15 }, { name: '低い唸り', power: 0.8, effect: 'fracture' }] },
    whisper_treant: { id: 'whisper_treant', name: '囁きの若木', level: 3, maxHp: 132, atk: 18, def: 11, mag: 12, agi: 5, exp: 48, gold: 34, sprite: 'treant', drops: [{ id: 'bark', chance: 0.92, qty: [1, 2] }, { id: 'herb', chance: 0.7, qty: [1, 3] }], skills: [{ name: '枝打ち', power: 1.15 }, { name: '眠り胞子', power: 0.6, effect: 'fracture' }] },
    ruin_sentinel: { id: 'ruin_sentinel', name: '遺構の番兵', level: 4, maxHp: 180, atk: 21, def: 14, mag: 15, agi: 8, exp: 75, gold: 52, sprite: 'sentinel', drops: [{ id: 'old_fragment', chance: 0.95, qty: [1, 2] }, { id: 'prism_dust', chance: 0.35, qty: [1, 1] }], skills: [{ name: '石槍', power: 1.2 }, { name: '崩落波', power: 0.9, effect: 'fracture' }] },
    moss_wolf: { id: 'moss_wolf', name: '苔牙の獣王', level: 5, maxHp: 320, atk: 25, def: 12, mag: 12, agi: 15, exp: 150, gold: 120, sprite: 'bosswolf', boss: true, drops: [{ id: 'wolf_fang', chance: 1, qty: [3, 4] }, { id: 'prism_dust', chance: 1, qty: [1, 2] }], skills: [{ name: '王牙', power: 1.38 }, { name: '森の咆哮', power: 0.95, effect: 'fracture' }] },
  };

  const LOCATIONS = {
    lindholm: { id: 'lindholm', name: '宿場町リンドホルム', type: 'town', x: 24, y: 70, rank: 'F', description: '草原と森の境にある、小さな宿場町。冒険者ギルド《枝角亭》がある。', facilities: ['guild', 'shop', 'craft', 'inn', 'sell'] },
    windy_plain: { id: 'windy_plain', name: '風渡る草原', type: 'field', x: 43, y: 62, rank: 'F', description: '低い草と風の道が続く、リンドホルム近郊の草原。', enemyPool: ['pale_slime', 'grass_hare', 'wind_wolf'], materialPool: ['herb', 'herb', 'slime_core'], explorationCost: 0 },
    whisper_woods: { id: 'whisper_woods', name: '囁きの森', type: 'field', x: 62, y: 39, rank: 'F', description: '木々が不思議な音を立てる深い森。足を踏み外すと戻れない。', enemyPool: ['wind_wolf', 'whisper_treant'], materialPool: ['herb', 'bark', 'bark'], explorationCost: 0 },
    fallen_ruins: { id: 'fallen_ruins', name: '落星の遺構', type: 'field', x: 79, y: 28, rank: 'E', description: '星のように落ちた建造物が眠る遺構。危険な魔力反応がある。', enemyPool: ['whisper_treant', 'ruin_sentinel'], materialPool: ['old_fragment', 'old_fragment', 'prism_dust'], explorationCost: 0 },
    frost_gate: { id: 'frost_gate', name: '白霜の関所', type: 'placeholder', x: 75, y: 77, rank: 'D', description: '冷たい山域の入口。第一章の外にある。' },
  };

  const QUESTS = {
    q_herb: { id: 'q_herb', name: '薬草を届けて', rank: 'F', description: '宿場町の治療師へ、草原の薬草を3つ届ける。', type: 'collect', target: 'herb', amount: 3, reward: { gold: 80, advExp: 30, items: [{ id: 'potion', qty: 1 }] }, unlockAt: 0, dialogue: '「薬草が足りないんだ。風渡る草原で採れるはずだよ。」' },
    q_wolf: { id: 'q_wolf', name: '風を裂く牙', rank: 'F', description: '街道を荒らす風斬りウルフを3体討伐する。', type: 'kill', target: 'wind_wolf', amount: 3, reward: { gold: 130, advExp: 60, items: [{ id: 'ether', qty: 1 }] }, unlockAt: 0, dialogue: '「街道の荷馬車が襲われている。無理はするなよ。」' },
    q_ruin: { id: 'q_ruin', name: '落星の欠片', rank: 'E', description: '落星の遺構で古びた石片を2つ回収する。', type: 'collect', target: 'old_fragment', amount: 2, reward: { gold: 260, advExp: 70, items: [{ id: 'potion', qty: 2 }, { id: 'ether', qty: 1 }] }, unlockAt: 90, dialogue: '「遺構の調査団が素材を求めている。E級以上の依頼だ。」' },
    q_boss: { id: 'q_boss', name: '森の獣王', rank: 'E', description: '囁きの森に現れた苔牙の獣王を討伐する。', type: 'kill', target: 'moss_wolf', amount: 1, reward: { gold: 420, advExp: 95, items: [{ id: 'prism_dust', qty: 2 }] }, unlockAt: 90, dialogue: '「森の奥で、何かが縄張りを広げている。帰還を最優先にしてくれ。」' },
  };

  const RECIPES = {
    potion_bundle: { id: 'potion_bundle', name: '癒しの小瓶 ×2', description: '薬草を煎じ、携行用の回復薬にする。', ingredients: [{ id: 'herb', qty: 3 }, { id: 'slime_core', qty: 1 }], output: { type: 'item', id: 'potion', qty: 2 } },
    rainbow_edge: { id: 'rainbow_edge', name: '調律の刃片', description: '虹全の攻撃力を+3。作成時に自動装備する。', ingredients: [{ id: 'wolf_fang', qty: 2 }, { id: 'prism_dust', qty: 1 }], output: { type: 'equipment', id: 'rainbow_edge', qty: 1 } },
    white_charm: { id: 'white_charm', name: '守りの護符', description: '白零の防御力+3、最大HP+8。作成時に自動装備する。', ingredients: [{ id: 'bark', qty: 2 }, { id: 'herb', qty: 2 }], output: { type: 'equipment', id: 'white_charm', qty: 1 } },
    black_ring: { id: 'black_ring', name: '侵食の指輪', description: '黒零の魔力+3、敏捷+1。作成時に自動装備する。', ingredients: [{ id: 'old_fragment', qty: 2 }, { id: 'slime_core', qty: 2 }], output: { type: 'equipment', id: 'black_ring', qty: 1 } },
  };

  return { RANKS, ITEM_DEFS, EQUIPMENT_DEFS, CHARACTER_DEFS, SKILLS, ENEMIES, LOCATIONS, QUESTS, RECIPES };
})();
