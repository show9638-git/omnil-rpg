/* 全零〈オムニル〉 v0.5 data — 地方地図・探索難易度・冒険者レベル */
window.OMNIL_DATA = (() => {
  // 冒険者レベルはパーティ全体の進行度。スタミナ上限・施設品・行動範囲に影響する。
  const RANKS = [
    { id: '1', level: 1, name: 'Lv.1', threshold: 0, maxStamina: 100, description: 'ギルドに登録したばかり。リンドホルム近郊を任される。' },
    { id: '2', level: 2, name: 'Lv.2', threshold: 100, maxStamina: 150, description: '近隣地域で信頼を得た冒険者。中級探索と落星の遺構へ進める。' },
    { id: '3', level: 3, name: 'Lv.3', threshold: 260, maxStamina: 200, description: '地方の依頼を任される実力者。上級探索に挑める。' },
    { id: '4', level: 4, name: 'Lv.4', threshold: 520, maxStamina: 250, description: '地方を代表する冒険者。白霜の関所への道が開く。' },
    { id: '5', level: 5, name: 'Lv.5', threshold: 900, maxStamina: 300, description: '第一章の外へ踏み出せる、確かな名声を持つ。' },
    { id: '6', level: 6, name: 'Lv.6', threshold: 1400, maxStamina: 350, description: '複数の地方から指名依頼が届き始める。' },
    { id: '7', level: 7, name: 'Lv.7', threshold: 2050, maxStamina: 400, description: '危険地帯の調査を任される冒険者。' },
    { id: '8', level: 8, name: 'Lv.8', threshold: 2850, maxStamina: 450, description: '地方ギルドでも名を知られる熟練者。' },
    { id: '9', level: 9, name: 'Lv.9', threshold: 3800, maxStamina: 500, description: '大規模な討伐・護衛を担う一流の冒険者。' },
    { id: '10', level: 10, name: 'Lv.10', threshold: 5000, maxStamina: 550, description: '世界規模の依頼へ進むための第一の到達点。' },
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
    stamina_tonic: { id: 'stamina_tonic', name: '活力の小瓶', type: 'consumable', description: 'パーティのスタミナを25回復する。上限を超えて回復できる携行用の活力剤。', sell: 20, buy: 48, effect: { restoreStamina: 25, allowOvercap: true } },
  };

  const EQUIPMENT_DEFS = {
    rainbow_edge: { id: 'rainbow_edge', name: '調律の刃片', target: 'rainbow', slot: 'weapon', description: '虹全の攻撃力を+3する、虹晶を封じた刃片。', stats: { atk: 3 } },
    white_charm: { id: 'white_charm', name: '守りの護符', target: 'white', slot: 'charm', description: '白零の防御力を+3、最大HPを+8する。', stats: { def: 3, maxHp: 8 } },
    black_ring: { id: 'black_ring', name: '侵食の指輪', target: 'black', slot: 'ring', description: '黒零の魔力を+3、敏捷を+1する。', stats: { mag: 3, agi: 1 } },
  };

  const BASE_CHARACTERS = {
    rainbow: {
      id: 'rainbow', name: '虹全〈コウゼン〉', short: '虹全', subtitle: 'カオス／調律の継承者', role: '調律・連携', color: 'rainbow', portrait: 'rainbow',
      base: { maxHp: 104, maxMp: 28, atk: 15, def: 10, mag: 11, agi: 10, luck: 7 },
      growth: { maxHp: 14, maxMp: 4, atk: 3, def: 2, mag: 2, agi: 2, luck: 1 },
      intro: '「無理はするな。危なくなったら、すぐ引く。……俺たちは、ちゃんと帰ろう。」',
      teriosName: 'カオス・テリオス',
      traits: [
        { id: 'r_trait_balance', name: 'カオスの均衡', description: 'HPが50%以下の時、与ダメージと回復量が10%上昇する。', effect: 'low_hp_boost' },
        { id: 'r_trait_resonance', name: '三彩の共鳴', description: '味方への強化と敵への弱体の持続ターンを+1する。', effect: 'duration_plus' },
        { id: 'r_trait_cycle', name: '始終の循環', description: '自分が技を使った後、HPとMPを最大値の2%回復する。', effect: 'skill_cycle' },
      ],
    },
    white: {
      id: 'white', name: '白零〈ハクレイ〉', short: '白零', subtitle: 'アルファ／調律の継承者', role: '回復・祝福', color: 'white', portrait: 'white',
      base: { maxHp: 96, maxMp: 38, atk: 10, def: 12, mag: 15, agi: 8, luck: 8 },
      growth: { maxHp: 12, maxMp: 6, atk: 2, def: 3, mag: 3, agi: 1, luck: 1 },
      intro: '「……わかった。私が前に出る。傷ついたら、言って。」',
      teriosName: 'アルファ・テリオス',
      traits: [
        { id: 'w_trait_pulse', name: '生命の脈動', description: '戦闘終了時、最もHPが低い仲間を最大HPの8%回復する。', effect: 'post_battle_heal' },
        { id: 'w_trait_mercy', name: '慈護の本能', description: 'かばって受けるダメージをさらに15%軽減する。', effect: 'guard_reduction' },
        { id: 'w_trait_chain', name: '祝福の連鎖', description: '白零の回復技は、対象に1ターンの再生を付与する。', effect: 'heal_regen' },
      ],
    },
    black: {
      id: 'black', name: '黒零〈コクレイ〉', short: '黒零', subtitle: 'オメガ／調律の継承者', role: '破壊・妨害', color: 'black', portrait: 'black',
      base: { maxHp: 100, maxMp: 30, atk: 16, def: 9, mag: 13, agi: 11, luck: 6 },
      growth: { maxHp: 13, maxMp: 5, atk: 3, def: 2, mag: 3, agi: 2, luck: 1 },
      intro: '「邪魔なら、退かせる。……二人には、触れさせない。」',
      teriosName: 'オメガ・テリオス',
      traits: [
        { id: 'b_trait_echo', name: '終焉の残響', description: '弱体状態の敵へ与えるダメージが15%上昇する。', effect: 'debuff_damage' },
        { id: 'b_trait_cut', name: '断絶の刻', description: '黒零の攻撃技は20%で「防御低下」を1ターン追加する。', effect: 'fracture_chance' },
        { id: 'b_trait_hunger', name: '黒夜の収奪', description: '敵を倒した時、最大MPの6%を回復する。', effect: 'kill_mp' },
      ],
    },
  };

  const SKILLS = {};
  const PASSIVES = {};

  function addSkill(owner, id, name, mp, target, kind, description, extra = {}) {
    SKILLS[id] = {
      id, owner, name, mp, target, kind, description,
      mastery: { powerRate: kind === 'heal' || kind === 'support' ? 0.08 : 0.11, level3: '効果量+10%', level6: '効果量+30%・持続+1', level10: '極意効果を発動' },
      ...extra,
    };
  }
  function addPassive(owner, id, name, description, extra = {}) { PASSIVES[id] = { id, owner, name, description, ...extra }; }

  // 虹全：始まり 8／終わり 8／調律 8／原初 6 = 技30
  [
    ['r_start_01','再生の灯',5,'ally','heal','味方1人を回復し、再生を付与。',{heal:.30, regen:2}],
    ['r_start_02','命脈接続',7,'ally','support','味方1人を回復し、攻撃・魔力を上昇。',{heal:.22,buffs:{atk:1,mag:1},turns:2}],
    ['r_start_03','芽吹きの風',9,'allAllies','heal','仲間全員のHPを回復。',{heal:.20}],
    ['r_start_04','新星の祝福',10,'allAllies','support','仲間全員の攻撃・魔力を上昇。',{buffs:{atk:1,mag:1},turns:3}],
    ['r_start_05','白虹の環',11,'allAllies','support','仲間全員に再生と防御上昇を付与。',{regen:3,buffs:{def:1},turns:2}],
    ['r_start_06','活性転写',8,'ally','support','味方のHPとMPを回復し、弱体を解除。',{heal:.18,mpHeal:.16,cleanse:true}],
    ['r_start_07','始源の抱擁',16,'ally','heal','戦闘不能の味方を復帰させ、大きく回復。',{heal:.48,revive:true}],
    ['r_start_08','創生の彼方',22,'allAllies','heal','全体回復・再生・全弱体解除。',{heal:.43,regen:4,cleanse:true}],
  ].forEach((x)=>addSkill('rainbow',...x));
  [
    ['r_end_01','終端斬',5,'enemy','physical','敵単体を斬り、防御低下を刻む。',{power:1.45,debuff:{fracture:2}}],
    ['r_end_02','灰滅の印',7,'enemy','magic','敵単体に侵食を付与。',{power:1.18,debuff:{weaken:2}}],
    ['r_end_03','虚無断ち',8,'enemy','physical','弱体中の敵に威力が上がる斬撃。',{power:1.70,bonusOnDebuff:.28}],
    ['r_end_04','黒虹の楔',10,'enemy','magic','敵の防御と攻撃を同時に低下。',{power:1.42,debuff:{fracture:2,weaken:2}}],
    ['r_end_05','停止領域',12,'allEnemies','support','敵全体の敏捷を下げ、行動を鈍らせる。',{debuff:{slow:3}}],
    ['r_end_06','破滅の輪',14,'allEnemies','magic','敵全体を蝕む終焉の輪。',{power:1.28,debuff:{fracture:2}}],
    ['r_end_07','最後の審判',18,'enemy','magic','弱体数に応じて威力が上がる裁定。',{power:2.28,bonusOnDebuff:.44}],
    ['r_end_08','終焉の彼方',24,'allEnemies','magic','敵全体へ大ダメージと複数弱体。',{power:2.02,debuff:{fracture:3,weaken:3,slow:2}}],
  ].forEach((x)=>addSkill('rainbow',...x));
  [
    ['r_tune_01','調律斬',5,'enemy','physical','虹の残光をまとった一撃。与ダメージの一部を吸収。',{power:1.52,lifeSteal:.20}],
    ['r_tune_02','反転障壁',7,'allAllies','support','仲間全員に小さな障壁を張る。',{barrier:.13,turns:2}],
    ['r_tune_03','均衡の拍動',8,'allAllies','support','HP割合が低い仲間ほど大きく回復。',{heal:.23,balanceHeal:true}],
    ['r_tune_04','位相転移',10,'self','support','自身の防御・敏捷を上げ、次に受ける攻撃を軽減。',{buffs:{def:2,agi:2},barrier:.22,turns:2}],
    ['r_tune_05','連環の盾',12,'allAllies','support','仲間全員を1ターンかばい合う結界。',{barrier:.20,buffs:{def:1},turns:2}],
    ['r_tune_06','調律解除',11,'allAllies','support','仲間全員の弱体を解除し、MPを回復。',{cleanse:true,mpHeal:.14}],
    ['r_tune_07','三相結界',18,'allAllies','support','全体に強力な障壁と防御上昇。',{barrier:.32,buffs:{def:2},turns:3}],
    ['r_tune_08','調律の彼方',23,'allAllies','support','味方を整え、敵全体の強化を消す。',{heal:.28,cleanse:true,barrier:.20,dispel:true}],
  ].forEach((x)=>addSkill('rainbow',...x));
  [
    ['r_origin_01','原初の脈動',18,'allAllies','support','全体回復、全能力上昇、弱体解除。',{heal:.30,buffs:{atk:1,def:1,mag:1,agi:1},cleanse:true,turns:3}],
    ['r_origin_02','全色展開',20,'allEnemies','magic','敵全体に白黒虹の連続魔力。',{power:1.80,debuff:{fracture:2,weaken:2}}],
    ['r_origin_03','無限連鎖',22,'allAllies','support','全体に再生・障壁・MP回復。',{regen:4,barrier:.24,mpHeal:.15,turns:3}],
    ['r_origin_04','始終反転',24,'enemy','special','敵の強化を奪い、味方全員へ還元する。',{power:2.05,dispel:true,stealBuff:true,heal:.12}],
    ['r_origin_05','世界律の壁',28,'allAllies','support','全体に極大障壁。1度だけ致死ダメージを耐える。',{barrier:.55,turns:3,deathGuard:true}],
    ['r_origin_06','原初・万象調律',36,'allEnemies','special','攻撃・防御・補助・妨害を同時に行う究極技。',{power:3.30,heal:.35,allInOne:true,debuff:{fracture:3,weaken:3,slow:3}}],
  ].forEach((x)=>addSkill('rainbow',...x));

  // 白零：回復12／祝福・攻撃12／テリオス6 = 技30
  [
    ['w_heal_01','白光の加護',6,'ally','heal','味方1人のHPを大きく回復。',{heal:.40}],
    ['w_heal_02','命継ぎ',7,'ally','heal','回復と再生を付与。',{heal:.28,regen:2}],
    ['w_heal_03','清めの雫',8,'ally','heal','回復し、弱体を1つ解除。',{heal:.30,cleanse:true}],
    ['w_heal_04','静謐の祈り',12,'allAllies','heal','仲間全員のHPを回復。',{heal:.27}],
    ['w_heal_05','再生領域',13,'allAllies','support','仲間全員に再生を付与。',{regen:4,turns:3}],
    ['w_heal_06','大樹の息吹',15,'allAllies','heal','全体回復し、防御を上昇。',{heal:.32,buffs:{def:1},turns:2}],
    ['w_heal_07','還らぬ傷',14,'ally','heal','大回復。対象HPが低いほど効果上昇。',{heal:.48,balanceHeal:true}],
    ['w_heal_08','星見の祝福',16,'allAllies','support','全体回復とMP回復。',{heal:.24,mpHeal:.14}],
    ['w_heal_09','光輪再生',17,'allAllies','support','強い再生と障壁を付与。',{regen:5,barrier:.14,turns:3}],
    ['w_heal_10','純白の奇跡',22,'allAllies','heal','全体の大回復と全弱体解除。',{heal:.43,cleanse:true}],
    ['w_heal_11','蘇生の抱擁',20,'ally','heal','戦闘不能の仲間を復帰・回復。',{heal:.55,revive:true}],
    ['w_heal_12','始まりの楽園',30,'allAllies','heal','全体を大きく癒し、毎ターン再生。',{heal:.56,regen:6,cleanse:true}],
  ].forEach((x)=>addSkill('white',...x));
  [
    ['w_buff_01','祝福の刃',5,'enemy','magic','光の刃で攻撃し、自分の防御を上昇。',{power:1.30,buffs:{def:1},turns:2}],
    ['w_buff_02','守護の号令',8,'allAllies','support','仲間全員の防御を上昇。',{buffs:{def:2},turns:3}],
    ['w_buff_03','陽光の槍',8,'enemy','magic','敵単体へ光属性の槍。',{power:1.65}],
    ['w_buff_04','生命賦活',10,'allAllies','support','仲間全員の攻撃・魔力を上昇。',{buffs:{atk:1,mag:1},turns:3}],
    ['w_buff_05','聖域展開',12,'allAllies','support','仲間全員に障壁を付与。',{barrier:.22,turns:2}],
    ['w_buff_06','浄化連撃',11,'enemy','magic','敵を攻撃し、敵の強化を1つ解除。',{power:1.58,dispel:true}],
    ['w_buff_07','白鳥の舞',12,'allAllies','support','敏捷と回避の気配を高める。',{buffs:{agi:2},turns:3}],
    ['w_buff_08','守護の連鎖',13,'ally','support','味方をかばい、双方の防御を上げる。',{guard:true,buffs:{def:2},turns:3}],
    ['w_buff_09','春雷の矢',15,'allEnemies','magic','敵全体に光の矢を降らせる。',{power:1.32}],
    ['w_buff_10','全能の祝詞',19,'allAllies','support','全能力を上げ、障壁を張る。',{buffs:{atk:1,def:1,mag:1,agi:1},barrier:.16,turns:3}],
    ['w_buff_11','天輪の裁き',22,'enemy','magic','光輪で敵を裁く高威力魔法。',{power:2.52,debuff:{weaken:2}}],
    ['w_buff_12','創世の福音',30,'allAllies','special','味方全員を強化し、敵全体へ光の反撃。',{heal:.18,buffs:{atk:2,def:2,mag:2,agi:2},turns:3,allEnemyPower:1.45}],
  ].forEach((x)=>addSkill('white',...x));
  [
    ['w_terios_01','白虹の啓示',20,'allAllies','support','全体回復と強化。',{heal:.30,buffs:{def:2,mag:1},turns:3}],
    ['w_terios_02','新生の剣',21,'enemy','magic','敵単体へ大ダメージ。味方全体を小回復。',{power:2.12,heal:.12}],
    ['w_terios_03','零からの芽吹き',24,'allAllies','heal','戦闘不能を含む仲間全員を立て直す。',{heal:.35,reviveAll:true,cleanse:true}],
    ['w_terios_04','光冠の領域',25,'allAllies','support','全体に強化・再生・障壁。',{regen:5,barrier:.28,buffs:{def:2,mag:2},turns:3}],
    ['w_terios_05','始まりを選ぶ者',28,'allEnemies','special','敵全体を攻撃し、味方のHPを還す。',{power:2.28,heal:.22}],
    ['w_terios_06','アルファ・テリオス',38,'allAllies','special','完全な始まり。全回復・蘇生・強化・大障壁。',{heal:1,reviveAll:true,regen:7,barrier:.55,buffs:{atk:2,def:2,mag:2,agi:2},cleanse:true,turns:4}],
  ].forEach((x)=>addSkill('white',...x));

  // 黒零：攻撃12／妨害12／テリオス6 = 技30
  [
    ['b_attack_01','漆黒刃',5,'enemy','physical','黒き一閃。防御低下を刻む。',{power:1.45,debuff:{fracture:2}}],
    ['b_attack_02','黒牙連斬',7,'enemy','physical','二連撃。弱体中なら威力上昇。',{power:1.62,bonusOnDebuff:.20}],
    ['b_attack_03','終止符',8,'enemy','magic','敵単体に終焉の印を打ち込む。',{power:1.68,debuff:{weaken:2}}],
    ['b_attack_04','影穿ち',9,'enemy','physical','防御を無視しやすい刺突。',{power:1.82,pierce:.35}],
    ['b_attack_05','虚無裂き',11,'enemy','magic','敵の強化を消し去る斬撃。',{power:1.74,dispel:true}],
    ['b_attack_06','黒日',13,'allEnemies','magic','敵全体を黒い太陽で焼く。',{power:1.28,debuff:{weaken:2}}],
    ['b_attack_07','断頭の刻',15,'enemy','physical','HPが低い敵ほど威力を増す。',{power:2.02,execute:true}],
    ['b_attack_08','滅びの連鎖',16,'allEnemies','physical','敵全体を斬り、弱体をばら撒く。',{power:1.48,debuff:{fracture:2}}],
    ['b_attack_09','終焉の剣雨',18,'allEnemies','magic','複数の黒刃を降らせる。',{power:1.65}],
    ['b_attack_10','残響破',20,'enemy','magic','敵の弱体数に応じて大威力。',{power:2.44,bonusOnDebuff:.42}],
    ['b_attack_11','星喰い',24,'enemy','special','与えたダメージの40%をHPとMPへ吸収。',{power:2.62,lifeSteal:.40,mpSteal:.20}],
    ['b_attack_12','終わりの地平',32,'allEnemies','magic','敵全体へ壊滅的な終焉魔法。',{power:2.28,debuff:{fracture:3,weaken:3}}],
  ].forEach((x)=>addSkill('black',...x));
  [
    ['b_debuff_01','侵食の刻印',6,'enemy','support','敵の防御を低下させる。',{debuff:{fracture:3}}],
    ['b_debuff_02','停止命令',8,'enemy','support','敵の敏捷を大きく下げる。',{debuff:{slow:3}}],
    ['b_debuff_03','疲弊の霧',10,'allEnemies','support','敵全体の攻撃を下げる。',{debuff:{weaken:3}}],
    ['b_debuff_04','沈黙の刃',9,'enemy','physical','攻撃し、敵の特殊行動を封じる。',{power:1.15,debuff:{silence:2}}],
    ['b_debuff_05','時間腐食',12,'allEnemies','support','敵全体に鈍化と防御低下。',{debuff:{slow:2,fracture:2}}],
    ['b_debuff_06','絶望の楔',14,'enemy','magic','敵へ複数の弱体を打ち込む。',{power:1.22,debuff:{fracture:3,weaken:3,slow:2}}],
    ['b_debuff_07','影縛り',13,'enemy','support','敵を縛り、次の攻撃ダメージを増加。',{debuff:{bind:2,fracture:2}}],
    ['b_debuff_08','破棄宣言',15,'allEnemies','support','敵全体の強化を解除。',{dispel:true,debuff:{weaken:2}}],
    ['b_debuff_09','終幕結界',17,'allEnemies','support','敵全体の攻防を下げ、味方への被害を抑える。',{debuff:{fracture:2,weaken:3,slow:2}}],
    ['b_debuff_10','凋落の環',20,'allEnemies','magic','敵全体に小ダメージと全弱体。',{power:1.05,debuff:{fracture:3,weaken:3,slow:3}}],
    ['b_debuff_11','黒い契約',22,'enemy','special','敵の強化を奪い、黒零を強化する。',{power:1.38,dispel:true,stealBuff:true,buffs:{atk:2,mag:2},turns:3}],
    ['b_debuff_12','終焉の檻',30,'allEnemies','special','敵全体へ強弱体。次の攻撃を増幅。',{power:1.50,debuff:{fracture:4,weaken:4,slow:4,bind:2}}],
  ].forEach((x)=>addSkill('black',...x));
  [
    ['b_terios_01','黒虹の審判',20,'enemy','special','敵単体へ大ダメージと複数弱体。',{power:2.32,debuff:{fracture:3,weaken:3}}],
    ['b_terios_02','終始の残照',21,'allEnemies','magic','敵全体を攻撃し、味方のMPを回復。',{power:1.88,mpHeal:.12}],
    ['b_terios_03','還元の鎌',24,'enemy','special','敵を倒し切るほどの威力。HP・MPを吸収。',{power:2.78,execute:true,lifeSteal:.36,mpSteal:.18}],
    ['b_terios_04','継がれる終焉',25,'allEnemies','support','敵全体の強化を消し、味方全体へ障壁。',{dispel:true,barrier:.24,debuff:{weaken:3},turns:3}],
    ['b_terios_05','終わりを見届ける者',29,'allEnemies','special','大ダメージ、敵全体の行動を鈍化。',{power:2.35,debuff:{slow:4,fracture:3}}],
    ['b_terios_06','オメガ・テリオス',38,'allEnemies','special','完全な終わり。全体超大ダメージ・全弱体・味方へ障壁。',{power:3.75,barrier:.35,debuff:{fracture:5,weaken:5,slow:5,bind:2}}],
  ].forEach((x)=>addSkill('black',...x));

  // パッシブ 10ずつ。実効果は game.js の passives を参照。
  const PASSIVE_DATA = {
    rainbow: [
      ['r_pass_start_01','芽吹きの余韻','回復技の回復量+8%。','heal_boost'],['r_pass_start_02','希望の連鎖','HP50%以下の味方への回復量+15%。','low_ally_heal'],['r_pass_start_03','白の残照','戦闘開始時、全員に小さな再生を付与。','opening_regen'],
      ['r_pass_end_01','滅びの感覚','弱体中の敵へのダメージ+8%。','debuff_damage'],['r_pass_end_02','終止の観測','敵を倒すと次の技のMP消費-30%。','kill_discount'],['r_pass_end_03','黒の残照','最初に弱体を付与した敵へ与ダメージ+10%。','first_debuff'],
      ['r_pass_tune_01','均衡感覚','HP50%以下の時、受けるダメージ-10%。','low_hp_guard'],['r_pass_tune_02','連環の呼吸','技使用時、MPを最大値の2%回復。','skill_cycle'],['r_pass_tune_03','調律者の目','バフ・デバフの持続+1ターン。','duration_plus'],
      ['r_pass_origin_01','原初の観測者','テリオス盤でのみ解放。全ての技の習熟度獲得量+1。','mastery_plus'],
    ],
    white: [
      ['w_pass_heal_01','慈雨','回復技の回復量+10%。','heal_boost'],['w_pass_heal_02','命の循環','回復時、対象のMPを最大値の3%回復。','heal_mp'],['w_pass_heal_03','白の安堵','戦闘終了時の全体回復量+4%。','post_battle_all'],['w_pass_heal_04','祈りの余白','弱体解除時、対象へ障壁を付与。','cleanse_barrier'],
      ['w_pass_buff_01','祝福の連鎖','付与した強化の持続+1ターン。','duration_plus'],['w_pass_buff_02','守護の本能','かばう時の被ダメージ-12%。','guard_reduction'],['w_pass_buff_03','光の反撃','障壁が残っている間、魔力+10%。','barrier_magic'],['w_pass_buff_04','再起の白翼','戦闘不能から復帰した仲間のHP回復量+20%。','revive_boost'],
      ['w_pass_terios_01','始まりの選択','テリオス盤。戦闘開始時、全員へ障壁。','opening_barrier'],['w_pass_terios_02','完全な慈愛','回復技を使うたび、白零のMPを最大値の4%回復。','skill_cycle'],
    ],
    black: [
      ['b_pass_attack_01','終焉の残響','弱体中の敵へ与ダメージ+12%。','debuff_damage'],['b_pass_attack_02','残滓の収奪','敵撃破時、HPを最大値の5%回復。','kill_hp'],['b_pass_attack_03','黒刃の冴え','クリティカル率を高める。','crit_up'],['b_pass_attack_04','断罪の手','HP30%以下の敵へ与ダメージ+15%。','execute_damage'],
      ['b_pass_debuff_01','断絶の刻','攻撃技は20%で防御低下を付与。','fracture_chance'],['b_pass_debuff_02','沈黙の余韻','弱体を3つ以上持つ敵の攻撃力をさらに低下。','multi_debuff'],['b_pass_debuff_03','侵食拡散','全体弱体技の持続+1ターン。','duration_plus'],['b_pass_debuff_04','終幕の予感','敵を弱体化したターン、受けるダメージ-8%。','debuff_guard'],
      ['b_pass_terios_01','終わりを選ぶ者','テリオス盤。敵撃破時、最大MPの8%を回復。','kill_mp'],['b_pass_terios_02','残すべきもの','HP50%以下の味方がいると与ダメージ+15%。','ally_low_damage'],
    ],
  };
  Object.entries(PASSIVE_DATA).forEach(([owner, list]) => list.forEach(([id,name,description,effect]) => addPassive(owner,id,name,description,{effect})));

  const STAT_TEMPLATES = {
    rainbow: [
      ['始まりの体温',{maxHp:9}],['命脈の拡張',{maxMp:4}],['再生の感覚',{mag:2}],['祝福の剣腕',{atk:2}],['希望の歩み',{agi:2}],['白光の守り',{def:2}],['芽吹く幸運',{luck:2}],['創生の体躯',{maxHp:14}],['白虹の魔力',{mag:3}],['生命の剛力',{atk:3}],['始まりの器',{maxMp:6}],['新星の足取り',{agi:3}],
      ['終わりの体温',{atk:3}],['静止の知覚',{mag:2}],['断絶の体躯',{maxHp:10}],['黒刃の防御',{def:2}],['破滅の歩み',{agi:2}],['終焉の器',{maxMp:5}],['灰の幸運',{luck:2}],['虚無の剣腕',{atk:4}],['黒虹の魔力',{mag:3}],['停止の防壁',{def:3}],['断末の心肺',{maxHp:15}],['最後の踏み込み',{agi:3}],
      ['調律の体温',{def:2}],['均衡の器',{maxMp:4}],['虹環の剣腕',{atk:2}],['三相の知性',{mag:2}],['連環の歩法',{agi:2}],['保全の体躯',{maxHp:10}],['天秤の幸運',{luck:2}],['位相の防壁',{def:3}],['調律の魔力',{mag:3}],['結界の剣腕',{atk:3}],['三彩の心肺',{maxHp:14}],['均衡の歩み',{agi:3}],
      ['原初の器',{maxMp:8,maxHp:16}],['万象の剣腕',{atk:4}],['世界律の防壁',{def:4}],['原初の魔力',{mag:4}],
    ],
    white: [
      ['温かな体温',{maxHp:8}],['白い呼吸',{maxMp:5}],['祈りの魔力',{mag:3}],['守護の腕',{def:2}],['軽やかな歩み',{agi:1}],['生命の幸運',{luck:2}],['光の器',{maxMp:6}],['白壁の体躯',{maxHp:12}],['回復の理',{mag:3}],['抱擁の防壁',{def:3}],['再生の歩み',{agi:2}],['癒しの剣腕',{atk:2}],['始まりの心肺',{maxHp:14}],['浄化の器',{maxMp:6}],['大樹の魔力',{mag:4}],['白翼の防御',{def:3}],['慈愛の幸運',{luck:2}],['楽園の歩法',{agi:2}],
      ['祝福の体温',{maxHp:8}],['聖域の器',{maxMp:5}],['光槍の魔力',{mag:3}],['守護の剣腕',{atk:2}],['白鳥の歩み',{agi:2}],['加護の防御',{def:3}],['祝詞の幸運',{luck:2}],['光冠の体躯',{maxHp:12}],['活性の器',{maxMp:6}],['陽光の剣腕',{atk:3}],['聖光の魔力',{mag:4}],['連鎖の防壁',{def:3}],['福音の心肺',{maxHp:14}],['創世の器',{maxMp:7}],['天輪の魔力',{mag:4}],['白耀の剣腕',{atk:3}],['祝福の歩法',{agi:2}],['守護の幸運',{luck:2}],
      ['テリオスの器',{maxHp:16,maxMp:8}],['完全な白光',{mag:5}],['始まりの防壁',{def:4}],['新生の剣腕',{atk:4}],
    ],
    black: [
      ['黒き体温',{maxHp:9}],['終焉の器',{maxMp:4}],['漆黒の剣腕',{atk:3}],['破滅の魔力',{mag:2}],['影の歩み',{agi:2}],['断絶の防壁',{def:2}],['灰の幸運',{luck:2}],['黒牙の体躯',{maxHp:12}],['虚無の剣腕',{atk:4}],['終止の魔力',{mag:3}],['夜の器',{maxMp:6}],['斬首の歩法',{agi:3}],['星喰いの心肺',{maxHp:15}],['終焉の防御',{def:3}],['残響の剣腕',{atk:4}],['滅びの魔力',{mag:4}],['黒日の器',{maxMp:7}],['冥い幸運',{luck:2}],
      ['侵食の体温',{maxHp:8}],['妨害の器',{maxMp:5}],['刻印の魔力',{mag:3}],['断罪の剣腕',{atk:2}],['停止の歩み',{agi:2}],['黒檻の防壁',{def:3}],['腐食の幸運',{luck:2}],['沈黙の体躯',{maxHp:11}],['影縛りの器',{maxMp:6}],['絶望の魔力',{mag:4}],['凋落の剣腕',{atk:3}],['終幕の防御',{def:3}],['時間腐食の歩み',{agi:2}],['破棄の心肺',{maxHp:14}],['契約の器',{maxMp:7}],['檻の魔力',{mag:4}],['断絶の剣腕',{atk:3}],['黒い幸運',{luck:2}],
      ['テリオスの器',{maxHp:16,maxMp:8}],['完全な終焉',{atk:5}],['還元の防壁',{def:4}],['残照の魔力',{mag:5}],
    ],
  };

  function positioning(owner, branch, index) {
    const t = index;
    const zig = (t % 3) - 1;
    if (owner === 'rainbow') {
      if (branch === 'start') return { x: 600 + zig * 62, y: 500 - Math.floor(t / 3) * 64 };
      if (branch === 'end') return { x: 685 + Math.floor(t / 3) * 70, y: 500 + zig * 62 };
      if (branch === 'tune') return { x: 600 + zig * 62, y: 610 + Math.floor(t / 3) * 64 };
      return { x: 505 - Math.floor(t / 3) * 70, y: 500 + zig * 62 };
    }
    if (owner === 'white') {
      if (branch === 'heal') return { x: 560 - Math.floor(t / 4) * 58, y: 300 + ((t % 4) - 1.5) * 72 };
      if (branch === 'buff') return { x: 700 + Math.floor(t / 4) * 58, y: 300 + ((t % 4) - 1.5) * 72 };
      return { x: 630 + ((t % 3) - 1) * 76, y: 560 + Math.floor(t / 3) * 72 };
    }
    if (branch === 'attack') return { x: 560 - Math.floor(t / 4) * 58, y: 300 + ((t % 4) - 1.5) * 72 };
    if (branch === 'debuff') return { x: 700 + Math.floor(t / 4) * 58, y: 300 + ((t % 4) - 1.5) * 72 };
    return { x: 630 + ((t % 3) - 1) * 76, y: 560 + Math.floor(t / 3) * 72 };
  }

  function makeBranch(owner, branch, label, skillIds, passiveIds, statEntries, requirements = {}) {
    const panels = [];
    const all = [];
    // 1 skill + stat + stat + passive cadence. Skill count leads the branch, then remaining stats/passives fill branch.
    skillIds.forEach((skill, index) => all.push({category:'skill',name:SKILLS[skill].name,description:SKILLS[skill].description,skill}));
    passiveIds.forEach((passive) => all.push({category:'passive',name:PASSIVES[passive].name,description:PASSIVES[passive].description,passive}));
    statEntries.forEach(([name,effect]) => all.push({category:'stat',name,description:Object.entries(effect).map(([k,v])=>`${({maxHp:'HP',maxMp:'MP',atk:'攻撃',def:'防御',mag:'魔力',agi:'敏捷',luck:'幸運'})[k]}+${v}`).join('／'),effect}));
    // distribute by type so skills form a visible spine; each node requires prior node of branch.
    const ordered = [];
    const max = Math.max(skillIds.length, passiveIds.length, statEntries.length);
    for (let i=0;i<max;i++) {
      if (skillIds[i]) ordered.push(all.find((n)=>n.skill===skillIds[i]));
      if (statEntries[i*2]) ordered.push(all.find((n)=>n.name===statEntries[i*2][0]));
      if (statEntries[i*2+1]) ordered.push(all.find((n)=>n.name===statEntries[i*2+1][0]));
      if (passiveIds[i]) ordered.push(all.find((n)=>n.passive===passiveIds[i]));
    }
    return ordered.map((node,index)=>({
      id:`${owner}_${branch}_${String(index+1).padStart(2,'0')}`, owner, branch, label,
      category:node.category, name:node.name, description:node.description, skill:node.skill, passive:node.passive, effect:node.effect,
      cost: node.category === 'stat' ? 1 + Math.floor(index/10) : node.category === 'passive' ? 2 + Math.floor(index/9) : 2 + Math.floor(index/8),
      minLevel: requirements.minLevel ? requirements.minLevel + Math.floor(index/7)*2 : 1 + Math.floor(index/7)*2,
      storyFlag: requirements.storyFlag || null,
      prerequisite: index === 0 ? `${owner}_core` : `${owner}_${branch}_${String(index).padStart(2,'0')}`,
      position: positioning(owner,branch,index),
      final: index === ordered.length-1,
    }));
  }

  function buildCharacter(owner) {
    const base = BASE_CHARACTERS[owner];
    const panels = [{ id:`${owner}_core`, owner, branch:'core', label:'核', category:'core', name:owner==='rainbow'?'調律核':owner==='white'?'始まりの灯':'終わりの灯', description:'この存在の根にある力。', cost:0, effect: owner==='rainbow'?{maxMp:4}:owner==='white'?{maxMp:5}:{atk:1,maxMp:4}, prerequisite:null, position:{x:600,y:500} }];
    if (owner === 'rainbow') {
      const skillGroups = { start:Object.keys(SKILLS).filter((id)=>id.startsWith('r_start_')), end:Object.keys(SKILLS).filter((id)=>id.startsWith('r_end_')), tune:Object.keys(SKILLS).filter((id)=>id.startsWith('r_tune_')), origin:Object.keys(SKILLS).filter((id)=>id.startsWith('r_origin_')) };
      const pass = { start:['r_pass_start_01','r_pass_start_02','r_pass_start_03'],end:['r_pass_end_01','r_pass_end_02','r_pass_end_03'],tune:['r_pass_tune_01','r_pass_tune_02','r_pass_tune_03'],origin:['r_pass_origin_01'] };
      const stats = STAT_TEMPLATES.rainbow;
      panels.push(...makeBranch(owner,'start','始まりの力',skillGroups.start,pass.start,stats.slice(0,12)));
      panels.push(...makeBranch(owner,'end','終わりの力',skillGroups.end,pass.end,stats.slice(12,24)));
      panels.push(...makeBranch(owner,'tune','調律の力',skillGroups.tune,pass.tune,stats.slice(24,36)));
      const origin = makeBranch(owner,'origin','原初の力',skillGroups.origin,pass.origin,stats.slice(36),{storyFlag:'terios_rainbow',minLevel:30});
      origin.forEach((p,index)=>{ p.requiresAll = index === 0 ? [panels.find((q)=>q.branch==='start'&&q.final).id,panels.find((q)=>q.branch==='end'&&q.final).id,panels.find((q)=>q.branch==='tune'&&q.final).id] : null; p.prerequisite = index === 0 ? `${owner}_core` : p.prerequisite; });
      panels.push(...origin);
    } else {
      const prefix = owner === 'white' ? 'w' : 'b';
      const a = owner === 'white' ? 'heal' : 'attack';
      const b = owner === 'white' ? 'buff' : 'debuff';
      const skillsA = Object.keys(SKILLS).filter((id)=>id.startsWith(`${prefix}_${a}_`));
      const skillsB = Object.keys(SKILLS).filter((id)=>id.startsWith(`${prefix}_${b}_`));
      const skillsT = Object.keys(SKILLS).filter((id)=>id.startsWith(`${prefix}_terios_`));
      const passIds = Object.keys(PASSIVES).filter((id)=>id.startsWith(`${prefix}_pass_`));
      const stats = STAT_TEMPLATES[owner];
      panels.push(...makeBranch(owner,a,owner==='white'?'回復の道':'破壊の道',skillsA,passIds.slice(0,4),stats.slice(0,18)));
      panels.push(...makeBranch(owner,b,owner==='white'?'祝福と光刃の道':'妨害と断絶の道',skillsB,passIds.slice(4,8),stats.slice(18,36)));
      const terios = makeBranch(owner,'terios','テリオス',skillsT,passIds.slice(8),stats.slice(36),{storyFlag:`terios_${owner}`,minLevel:30});
      const finalA=panels.find((q)=>q.branch===a&&q.final); const finalB=panels.find((q)=>q.branch===b&&q.final);
      terios.forEach((p,index)=>{ p.requiresAll=index===0?[finalA.id,finalB.id]:null; p.prerequisite=index===0?`${owner}_core`:p.prerequisite; });
      panels.push(...terios);
    }
    return { ...base, starterSkills: owner==='rainbow'?['r_tune_01']:owner==='white'?['w_heal_01']:['b_attack_01'], panels };
  }

  const CHARACTER_DEFS = { rainbow:buildCharacter('rainbow'), white:buildCharacter('white'), black:buildCharacter('black') };

  const ENEMIES = {
    pale_slime: { id: 'pale_slime', name: '淡光スライム', level: 1, maxHp: 58, atk: 10, def: 4, mag: 6, agi: 7, exp: 18, gold: 12, sprite: 'slime', drops: [{ id: 'slime_core', chance: .9, qty: [1,2] }], skills:[{name:'体当たり',power:1.0}] },
    grass_hare: { id: 'grass_hare', name: '草駆けラビット', level: 1, maxHp: 48, atk: 12, def: 3, mag: 3, agi: 12, exp: 16, gold: 10, sprite: 'hare', drops:[{id:'herb',chance:.65,qty:[1,2]}], skills:[{name:'跳び蹴り',power:1.05}] },
    wind_wolf: { id: 'wind_wolf', name: '風斬りウルフ', level: 2, maxHp: 86, atk: 15, def: 7, mag: 7, agi: 14, exp: 31, gold: 22, sprite: 'wolf', drops:[{id:'wolf_fang',chance:.85,qty:[1,2]},{id:'herb',chance:.45,qty:[1,2]}], skills:[{name:'風牙',power:1.15},{name:'低い唸り',power:.8,effect:'fracture'}] },
    whisper_treant: { id: 'whisper_treant', name: '囁きの若木', level: 3, maxHp: 132, atk: 18, def: 11, mag: 12, agi: 5, exp: 48, gold: 34, sprite: 'treant', drops:[{id:'bark',chance:.92,qty:[1,2]},{id:'herb',chance:.7,qty:[1,3]}], skills:[{name:'枝打ち',power:1.15},{name:'眠り胞子',power:.6,effect:'fracture'}] },
    ruin_sentinel: { id: 'ruin_sentinel', name: '遺構の番兵', level:4,maxHp:180,atk:21,def:14,mag:15,agi:8,exp:75,gold:52,sprite:'sentinel',drops:[{id:'old_fragment',chance:.95,qty:[1,2]},{id:'prism_dust',chance:.35,qty:[1,1]}],skills:[{name:'石槍',power:1.2},{name:'崩落波',power:.9,effect:'fracture'}] },
    moss_wolf: { id: 'moss_wolf', name:'苔牙の獣王', level:5,maxHp:320,atk:25,def:12,mag:12,agi:15,exp:150,gold:120,sprite:'bosswolf',boss:true,drops:[{id:'wolf_fang',chance:1,qty:[3,4]},{id:'prism_dust',chance:1,qty:[1,2]}],skills:[{name:'王牙',power:1.38},{name:'森の咆哮',power:.95,effect:'fracture'}] },
  };

  const LOCATIONS = {
    lindholm:{id:'lindholm',name:'宿場町リンドホルム',type:'town',x:24,y:70,rank:'1',description:'草原と森の境にある、小さな宿場町。冒険者ギルド《枝角亭》がある。',facilities:['guild','shop','craft','inn','sell']},
    windy_plain:{id:'windy_plain',name:'風渡る草原',type:'field',x:43,y:62,rank:'1',description:'低い草と風の道が続く、リンドホルム近郊の草原。',enemyPool:['pale_slime','grass_hare','wind_wolf'],materialPool:['herb','herb','slime_core'],rareMaterialPool:['slime_core','wolf_fang']},
    whisper_woods:{id:'whisper_woods',name:'囁きの森',type:'field',x:62,y:39,rank:'1',description:'木々が不思議な音を立てる深い森。足を踏み外すと戻れない。',enemyPool:['wind_wolf','whisper_treant'],materialPool:['herb','bark','bark'],rareMaterialPool:['wolf_fang','bark']},
    fallen_ruins:{id:'fallen_ruins',name:'落星の遺構',type:'field',x:79,y:28,rank:'2',description:'星のように落ちた建造物が眠る遺構。危険な魔力反応がある。',enemyPool:['whisper_treant','ruin_sentinel'],materialPool:['old_fragment','old_fragment','prism_dust'],rareMaterialPool:['prism_dust','old_fragment']},
    frost_gate:{id:'frost_gate',name:'白霜の関所',type:'placeholder',x:75,y:77,rank:'4',description:'冷たい山域の入口。第一章の外にある。'},
  };

  // 地点ごとの探索難易度。敵の強さ・数、素材量、希少素材の発見率、経験値と所持金が変化する。
  const EXPLORATION_DIFFICULTIES = {
    beginner: { id:'beginner', name:'初級探索', rank:'1', explorationCost:1, battleCost:3, enemyCount:[1,1], enemyStatMultiplier:.92, rewardMultiplier:1.0, lootMultiplier:1.0, rareChance:0.02, description:'低危険度。敵は単体中心で、基礎素材を安全に集めやすい。' },
    intermediate: { id:'intermediate', name:'中級探索', rank:'2', explorationCost:3, battleCost:5, enemyCount:[1,2], enemyStatMultiplier:1.22, rewardMultiplier:1.45, lootMultiplier:1.65, rareChance:0.18, description:'敵は強くなり、複数出現もある。素材量・報酬効率が上がる。' },
    advanced: { id:'advanced', name:'上級探索', rank:'3', explorationCost:5, battleCost:10, enemyCount:[2,3], enemyStatMultiplier:1.58, rewardMultiplier:2.15, lootMultiplier:2.45, rareChance:0.38, description:'強敵・複数戦が前提。希少素材と高い経験値・所持金を狙える。' },
  };

  // single use = 一回限り。repeatable = 報告後に何度でも受注可能。
  const QUESTS = {
    q_herb:{id:'q_herb',name:'薬草を届けて',rank:'1',description:'宿場町の治療師へ、草原の薬草を3つ届ける。',type:'collect',target:'herb',amount:3,reward:{gold:80,advExp:30,items:[{id:'potion',qty:1}]},unlockAt:0,dialogue:'「薬草が足りないんだ。風渡る草原で採れるはずだよ。」'},
    q_wolf:{id:'q_wolf',name:'風を裂く牙',rank:'1',description:'街道を荒らす風斬りウルフを3体討伐する。',type:'kill',target:'wind_wolf',amount:3,reward:{gold:130,advExp:60,items:[{id:'ether',qty:1}]},unlockAt:0,dialogue:'「街道の荷馬車が襲われている。無理はするなよ。」'},
    q_pale_core:{id:'q_pale_core',name:'淡光を集めて',rank:'1',description:'道具屋が淡光の核を2つ探している。',type:'collect',target:'slime_core',amount:2,reward:{gold:75,advExp:24,items:[{id:'stamina_tonic',qty:1}]},unlockAt:0,dialogue:'「核は小さくても、いい薬の材料になるんだ。」'},
    q_bark:{id:'q_bark',name:'囁き樹の樹皮',rank:'1',description:'森の薬師へ、囁き樹の樹皮を3つ届ける。',type:'collect',target:'bark',amount:3,reward:{gold:150,advExp:38,items:[{id:'antidote',qty:2}]},unlockAt:40,dialogue:'「森の奥へ行くなら、足元を見失わないでね。」'},
    q_ruin:{id:'q_ruin',name:'落星の欠片',rank:'2',description:'落星の遺構で古びた石片を2つ回収する。',type:'collect',target:'old_fragment',amount:2,reward:{gold:260,advExp:70,items:[{id:'potion',qty:2},{id:'ether',qty:1}]},unlockAt:100,dialogue:'「遺構の調査団が素材を求めている。危険なら引き返して。」'},
    q_boss:{id:'q_boss',name:'森の獣王',rank:'2',description:'囁きの森に現れた苔牙の獣王を討伐する。',type:'kill',target:'moss_wolf',amount:1,reward:{gold:420,advExp:95,items:[{id:'prism_dust',qty:2},{id:'stamina_tonic',qty:2}]},unlockAt:100,dialogue:'「森の奥で、何かが縄張りを広げている。帰還を最優先にしてくれ。」'},
    q_sentinel:{id:'q_sentinel',name:'遺構の番兵調査',rank:'2',description:'遺構の番兵を2体倒し、動きの記録を持ち帰る。',type:'kill',target:'ruin_sentinel',amount:2,reward:{gold:330,advExp:85,items:[{id:'ether',qty:2}]},unlockAt:140,dialogue:'「無理に奥まで行かなくていい。記録だけでも価値がある。」'},
    q_prism:{id:'q_prism',name:'虹晶の反応',rank:'2',description:'虹晶の粉を2つ集め、ギルドの調査員へ渡す。',type:'collect',target:'prism_dust',amount:2,reward:{gold:370,advExp:90,items:[{id:'stamina_tonic',qty:2}]},unlockAt:180,dialogue:'「その粉は、君たちの力に妙に反応するらしい。」'},
    q_hare:{id:'q_hare',name:'草駆けの足跡',rank:'1',description:'畑を荒らす草駆けラビットを4体討伐する。',type:'kill',target:'grass_hare',amount:4,reward:{gold:95,advExp:28,items:[{id:'antidote',qty:1}]},unlockAt:0,dialogue:'「畑の芽を食べられてしまうんだ。追い払いでは足りなくてね。」'},
    q_road:{id:'q_road',name:'風の街道を守れ',rank:'1',description:'風斬りウルフを5体討伐し、街道の安全を取り戻す。',type:'kill',target:'wind_wolf',amount:5,reward:{gold:190,advExp:52,items:[{id:'potion',qty:2}]},unlockAt:55,dialogue:'「荷馬車が通れるよう、道を空けてほしい。」'},
    q_treant:{id:'q_treant',name:'森道の障害',rank:'2',description:'囁きの若木を3体退け、森の通行路を確保する。',type:'kill',target:'whisper_treant',amount:3,reward:{gold:245,advExp:64,items:[{id:'stamina_tonic',qty:1}]},unlockAt:100,dialogue:'「倒木ではない。動く木が道を塞いでいるんだ。」'},
    q_wolf_fang:{id:'q_wolf_fang',name:'鍛冶師の求める牙',rank:'1',description:'鍛冶師へ風牙を4つ納品する。',type:'collect',target:'wolf_fang',amount:4,reward:{gold:165,advExp:42,items:[{id:'ether',qty:1}]},unlockAt:45,dialogue:'「風牙のしなりは、細工にちょうどいい。」'},
    q_ruin_route:{id:'q_ruin_route',name:'遺構への案内板',rank:'2',description:'古びた石片を4つ集め、危険な通路を示す案内板を補修する。',type:'collect',target:'old_fragment',amount:4,reward:{gold:390,advExp:92,items:[{id:'stamina_tonic',qty:2}]},unlockAt:150,dialogue:'「調査団が迷わないよう、目印を作り直したい。」'},


    r_herb:{id:'r_herb',name:'【繰返】草原の薬草採取',rank:'1',repeatable:true,description:'草原の薬草を2つ納品する。',type:'collect',target:'herb',amount:2,reward:{gold:34,advExp:9},unlockAt:0,dialogue:'毎日必要になる、基本的な薬草採取依頼。'},
    r_slime:{id:'r_slime',name:'【繰返】淡光の核の回収',rank:'1',repeatable:true,description:'淡光スライムの核を2つ納品する。',type:'collect',target:'slime_core',amount:2,reward:{gold:42,advExp:10},unlockAt:0,dialogue:'道具屋と治療師が常に核を求めている。'},
    r_wolf:{id:'r_wolf',name:'【繰返】街道の見回り',rank:'1',repeatable:true,description:'風斬りウルフを2体討伐し、街道の安全を確保する。',type:'kill',target:'wind_wolf',amount:2,reward:{gold:62,advExp:13},unlockAt:0,dialogue:'街道の護衛から回ってきた常設依頼。'},
    r_bark:{id:'r_bark',name:'【繰返】森の素材便',rank:'1',repeatable:true,description:'囁き樹の樹皮を2つ納品する。',type:'collect',target:'bark',amount:2,reward:{gold:76,advExp:15,items:[{id:'antidote',qty:1}]},unlockAt:30,dialogue:'森の薬師からの定期依頼。'},
    r_treant:{id:'r_treant',name:'【繰返】森道の整備',rank:'2',repeatable:true,description:'囁きの若木を2体討伐し、通行路を確保する。',type:'kill',target:'whisper_treant',amount:2,reward:{gold:110,advExp:20},unlockAt:100,dialogue:'伐採ではなく、危険個体だけを退ける依頼。'},
    r_ruin:{id:'r_ruin',name:'【繰返】遺構の石片回収',rank:'2',repeatable:true,description:'古びた石片を2つ納品する。',type:'collect',target:'old_fragment',amount:2,reward:{gold:115,advExp:22},unlockAt:100,dialogue:'調査団が継続して募集している回収依頼。'},
    r_sentinel:{id:'r_sentinel',name:'【繰返】番兵の機能停止',rank:'2',repeatable:true,description:'遺構の番兵を1体停止させる。',type:'kill',target:'ruin_sentinel',amount:1,reward:{gold:128,advExp:25,items:[{id:'stamina_tonic',qty:1}]},unlockAt:120,dialogue:'遺構の入口付近で行う、危険度の高い常設依頼。'},
    r_hare:{id:'r_hare',name:'【繰返】畑の見回り',rank:'1',repeatable:true,description:'草駆けラビットを2体討伐する。',type:'kill',target:'grass_hare',amount:2,reward:{gold:32,advExp:8},unlockAt:0,dialogue:'農家から毎朝届く、小さな見回り依頼。'},
    r_fang:{id:'r_fang',name:'【繰返】風牙の納品',rank:'1',repeatable:true,description:'風牙を2つ納品する。',type:'collect',target:'wolf_fang',amount:2,reward:{gold:56,advExp:12},unlockAt:35,dialogue:'鍛冶師が常に募集している素材納品。'},
    r_prism:{id:'r_prism',name:'【繰返】虹晶の粉の調達',rank:'2',repeatable:true,description:'虹晶の粉を1つ納品する。',type:'collect',target:'prism_dust',amount:1,reward:{gold:94,advExp:21},unlockAt:150,dialogue:'調査員の研究用に、少量ずつ必要になる。'},
    r_ruin_watch:{id:'r_ruin_watch',name:'【繰返】遺構入口の安全確認',rank:'2',repeatable:true,description:'遺構の番兵を2体討伐する。',type:'kill',target:'ruin_sentinel',amount:2,reward:{gold:210,advExp:38,items:[{id:'ether',qty:1}]},unlockAt:180,dialogue:'入口だけを安全に保つための継続依頼。'},
  };
  const RECIPES = {
    potion_bundle:{id:'potion_bundle',name:'癒しの小瓶 ×2',description:'薬草を煎じ、携行用の回復薬にする。',ingredients:[{id:'herb',qty:3},{id:'slime_core',qty:1}],output:{type:'item',id:'potion',qty:2}},
    stamina_tonic:{id:'stamina_tonic',name:'活力の小瓶',description:'旅用の活力剤。パーティのスタミナを25回復する。',ingredients:[{id:'herb',qty:2},{id:'slime_core',qty:1}],output:{type:'item',id:'stamina_tonic',qty:1}},
    rainbow_edge:{id:'rainbow_edge',name:'調律の刃片',description:'虹全の攻撃力を+3。作成時に自動装備する。',ingredients:[{id:'wolf_fang',qty:2},{id:'prism_dust',qty:1}],output:{type:'equipment',id:'rainbow_edge',qty:1}},
    white_charm:{id:'white_charm',name:'守りの護符',description:'白零の防御力+3、最大HP+8。作成時に自動装備する。',ingredients:[{id:'bark',qty:2},{id:'herb',qty:2}],output:{type:'equipment',id:'white_charm',qty:1}},
    black_ring:{id:'black_ring',name:'侵食の指輪',description:'黒零の魔力+3、敏捷+1。作成時に自動装備する。',ingredients:[{id:'old_fragment',qty:2},{id:'slime_core',qty:2}],output:{type:'equipment',id:'black_ring',qty:1}},
  };

  return { RANKS, ITEM_DEFS, EQUIPMENT_DEFS, CHARACTER_DEFS, SKILLS, PASSIVES, ENEMIES, LOCATIONS, EXPLORATION_DIFFICULTIES, QUESTS, RECIPES };
})();
