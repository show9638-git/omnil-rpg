/* 全零〈オムニル〉 v0.7 data — 地方別ギルド／6部位装備／第三・第四地方 */
(() => {
  'use strict';
  const D = window.OMNIL_DATA;
  if (!D) return;

  const item = (id, name, type, description, sell, extra = {}) => ({ id, name, type, description, sell, ...extra });
  Object.assign(D.ITEM_DEFS, {
    ember_shell: item('ember_shell','火山殻','material','溶岩の縁でしか見つからない、熱を残した甲殻。',108),
    cinder_feather: item('cinder_feather','熾火羽','material','赤熱した鳥獣の羽。軽量防具の芯になる。',126),
    lava_core: item('lava_core','溶岩核','material','静かに脈打つ高温の核。武具への加工は慎重を要する。',180),
    coral_thread: item('coral_thread','珊瑚糸','material','海蝕洞の珊瑚から採れる、魔力を通す繊維。',115),
    brine_pearl: item('brine_pearl','潮真珠','material','深い潮の気配を封じた真珠。水系の護符に使われる。',210),
    void_bone: item('void_bone','虚骨','material','峡谷の底で見つかる黒い骨片。触れると微かに冷たい。',175),
    dusk_ink: item('dusk_ink','暮影の墨','material','夕闇をすくい取ったような墨。封印術式の媒介になる。',154),
    soul_glass: item('soul_glass','魂玻璃','material','淡い光を宿す透明な欠片。高位の装飾品素材。',280),
    eclipse_shard: item('eclipse_shard','蝕晶片','material','始まりと終わりの境目に反応する、漆黒の結晶。',430),
    ward_orb: item('ward_orb','結界珠','consumable','戦闘中、味方1人に最大HPの20%の障壁を張る。',64,{buy:145,minLevel:3,effect:{barrierRate:.20}}),
    battle_kit: item('battle_kit','野営戦闘具','consumable','戦闘中、味方1人のHP70・MP18を回復する。',72,{buy:172,minLevel:3,effect:{healHp:70,healMp:18}}),
    explorer_ration: item('explorer_ration','探索者の携行食','consumable','パーティのスタミナを40回復する。上限超過可。',42,{buy:98,minLevel:1,effect:{restoreStamina:40,allowOvercap:true}}),
  });

  // 6部位：頭／体／腕／足／装飾1／装飾2。accessory は装飾1・2のどちらにも装備可能。
  const eq = (id,name,slot,description,stats,extra={}) => ({ id,name,slot,description,stats,allowed:'all',special:{},...extra });
  D.EQUIPMENT_DEFS = {
    traveler_band: eq('traveler_band','旅人の額帯','head','頭部を守る柔らかな額帯。', {maxHp:8,def:1}, {region:'lindholm',source:'shop',price:120,minLevel:1}),
    plain_cloak: eq('plain_cloak','草原の外套','body','風よけの布を重ねた外套。', {maxHp:14,def:2}, {region:'lindholm',source:'shop',price:180,minLevel:1}),
    leather_bracer: eq('leather_bracer','革の手甲','arms','使い込まれた革の手甲。', {atk:2,def:1}, {region:'lindholm',source:'shop',price:155,minLevel:1}),
    trail_boots: eq('trail_boots','街道の靴','legs','濡れた草地でも歩きやすい靴。', {agi:2,maxHp:4}, {region:'lindholm',source:'shop',price:140,minLevel:1}),
    herb_pendant: eq('herb_pendant','薬草のペンダント','accessory','薬草の香りが気持ちを落ち着かせる。', {maxMp:4,mag:1}, {region:'lindholm',source:'shop',price:165,minLevel:1,special:{postBattleHeal:.03},specialText:'戦闘勝利後、全員のHPを最大HPの3%回復'}),
    road_charm: eq('road_charm','街道守りの護符','accessory','旅人の無事を祈る小さな護符。', {def:2,luck:1}, {region:'lindholm',source:'shop',price:185,minLevel:1,special:{goldRate:.08},specialText:'探索・戦闘で得るGが8%増加'}),

    wind_hood: eq('wind_hood','風織りフード','head','風牙を織り込んだ軽いフード。', {agi:3,luck:1}, {region:'lindholm',source:'craft',recipe:'craft_wind_hood',minLevel:1}),
    fang_vest: eq('fang_vest','風牙の胸当て','body','風斬りウルフの牙を散らした胸当て。', {atk:3,def:3}, {region:'lindholm',source:'craft',recipe:'craft_fang_vest',minLevel:2}),
    bark_gauntlet: eq('bark_gauntlet','囁き樹の腕甲','arms','魔力を帯びた樹皮を固めた腕甲。', {def:3,mag:2}, {region:'lindholm',source:'craft',recipe:'craft_bark_gauntlet',minLevel:2,special:{barrierStart:.06},specialText:'戦闘開始時、最大HPの6%の障壁'}),
    prism_greaves: eq('prism_greaves','虹晶の脚絆','legs','虹晶粉を染み込ませた脚絆。', {agi:3,mag:2}, {region:'lindholm',source:'craft',recipe:'craft_prism_greaves',minLevel:3,special:{rareFind:.025},specialText:'希少素材・隠し発見率が2.5%上昇'}),
    harmonics_ring: eq('harmonics_ring','調律の指輪','accessory','白黒虹の魔力を整える細い指輪。', {maxMp:8,mag:3}, {region:'lindholm',source:'craft',recipe:'craft_harmonics_ring',minLevel:3,allowed:['rainbow'],special:{mpCostRate:-.08},specialText:'虹全の技MP消費-8%'}),
    white_seed_locket: eq('white_seed_locket','白種のロケット','accessory','新しい芽をかたどった小さなロケット。', {maxMp:9,mag:3}, {region:'lindholm',source:'craft',recipe:'craft_white_seed_locket',minLevel:3,allowed:['white'],special:{healRate:.08},specialText:'白零の回復効果+8%'}),
    black_scar_ring: eq('black_scar_ring','黒痕の指環','accessory','終わりの線を描くような黒い指環。', {atk:4,agi:2}, {region:'lindholm',source:'craft',recipe:'craft_black_scar_ring',minLevel:3,allowed:['black'],special:{debuffDamage:.08},specialText:'黒零は弱体中の敵へ与ダメージ+8%'}),

    frost_cap: eq('frost_cap','霜綿の帽子','head','雪原用に厚く織られた帽子。', {def:3,maxHp:10}, {region:'northreach',source:'shop',price:420,minLevel:4}),
    glacier_mail: eq('glacier_mail','氷晶の鎧衣','body','冷気を弾く薄い鎧衣。', {def:6,maxHp:24}, {region:'northreach',source:'shop',price:620,minLevel:4}),
    snowguard_gloves: eq('snowguard_gloves','雪護の手袋','arms','手先の感覚を残す防寒手袋。', {def:2,mag:3}, {region:'northreach',source:'shop',price:450,minLevel:4}),
    icewalk_boots: eq('icewalk_boots','氷渡りの靴','legs','滑りやすい氷上を踏み抜くための靴。', {agi:4,def:1}, {region:'northreach',source:'shop',price:480,minLevel:4}),
    northstar_brooch: eq('northstar_brooch','北天のブローチ','accessory','北の星を模した銀の留め具。', {luck:3,maxMp:5}, {region:'northreach',source:'shop',price:580,minLevel:4,special:{expRate:.10},specialText:'戦闘経験値+10%'}),
    frostward_charm: eq('frostward_charm','白霜の護符','accessory','霜花を封じた護符。', {def:4,mag:1}, {region:'northreach',source:'craft',recipe:'craft_frostward_charm',minLevel:4,special:{damageCut:.05},specialText:'受けるダメージ-5%'}),
    observer_visor: eq('observer_visor','観測者のバイザー','head','星図を読むための古いバイザー。', {mag:5,luck:3}, {region:'northreach',source:'craft',recipe:'craft_observer_visor',minLevel:5,special:{rareFind:.04},specialText:'希少素材・隠し発見率が4%上昇'}),

    ember_circlet: eq('ember_circlet','熾火のサークレット','head','熱を帯びた金属輪。', {atk:4,mag:2}, {region:'embercoast',source:'shop',price:900,minLevel:7}),
    tideguard_coat: eq('tideguard_coat','潮護のコート','body','海風と火山灰の両方を防ぐコート。', {maxHp:34,def:7}, {region:'embercoast',source:'shop',price:1180,minLevel:7}),
    coral_brace: eq('coral_brace','珊瑚の腕輪','arms','魔力が通りやすい珊瑚の腕輪。', {mag:5,maxMp:8}, {region:'embercoast',source:'shop',price:990,minLevel:7}),
    ashstep_sandals: eq('ashstep_sandals','灰歩きのサンダル','legs','火山灰の上を素早く抜ける靴。', {agi:5,atk:2}, {region:'embercoast',source:'shop',price:960,minLevel:7}),
    lava_heart: eq('lava_heart','溶岩心臓の護符','accessory','熱量を力に変える護符。', {atk:6,maxHp:18}, {region:'embercoast',source:'craft',recipe:'craft_lava_heart',minLevel:7,special:{lowHpDamage:.10},specialText:'HP50%以下の時、与ダメージ+10%'}),
    brine_orb: eq('brine_orb','潮真珠の宝珠','accessory','潮の魔力で傷を鎮める宝珠。', {mag:5,maxMp:10}, {region:'embercoast',source:'craft',recipe:'craft_brine_orb',minLevel:7,special:{postBattleHeal:.07},specialText:'戦闘勝利後、全員のHPを最大HPの7%回復'}),

    dusk_mask: eq('dusk_mask','暮影の面','head','影の濃い谷で身を隠す半面。', {agi:5,luck:4}, {region:'duskvale',source:'shop',price:1600,minLevel:10}),
    voidweave_robe: eq('voidweave_robe','虚織の法衣','body','虚骨を織り込んだ重ね衣。', {maxMp:16,def:8,mag:4}, {region:'duskvale',source:'shop',price:2050,minLevel:10}),
    eclipse_gauntlet: eq('eclipse_gauntlet','蝕の手甲','arms','始まりと終わりの境目を削る手甲。', {atk:7,mag:4}, {region:'duskvale',source:'shop',price:1780,minLevel:10}),
    rift_boots: eq('rift_boots','裂け目の靴','legs','谷間の亀裂を越えるための靴。', {agi:6,def:2}, {region:'duskvale',source:'shop',price:1700,minLevel:10}),
    origin_siglet: eq('origin_siglet','原初の印環','accessory','調律の波形を刻んだ印環。', {atk:5,def:5,mag:5,maxMp:10}, {region:'duskvale',source:'craft',recipe:'craft_origin_siglet',minLevel:10,allowed:['rainbow'],special:{barrierStart:.14,mpCostRate:-.12},specialText:'戦闘開始障壁14%／虹全の技MP消費-12%'}),
    alpha_lily: eq('alpha_lily','白花の聖印','accessory','始まりの気配を閉じ込めた白い聖印。', {mag:8,maxMp:14,def:3}, {region:'duskvale',source:'craft',recipe:'craft_alpha_lily',minLevel:10,allowed:['white'],special:{healRate:.15,barrierStart:.10},specialText:'白零の回復+15%／戦闘開始障壁10%'}),
    omega_shard: eq('omega_shard','黒曜の終符','accessory','終焉の余韻が残る黒曜の欠片。', {atk:9,mag:5,agi:3}, {region:'duskvale',source:'craft',recipe:'craft_omega_shard',minLevel:10,allowed:['black'],special:{debuffDamage:.15,lowHpDamage:.12},specialText:'黒零の弱体敵与ダメ+15%／HP半分以下で与ダメ+12%'}),
    // 旧試作版から引き継ぐ製造装備。v0.7では6部位に割り当て直して継続利用する。
    rainbow_edge: eq('rainbow_edge','調律の刃片','arms','白と黒の境目を薄く刻んだ短い刃片。', {atk:3,mag:2}, {region:'lindholm',source:'craft',minLevel:1,allowed:['rainbow'],special:{mpCostRate:-.03},specialText:'虹全の技MP消費-3%'}),
    white_charm: eq('white_charm','守りの護符','accessory','淡い芽吹きの光を閉じた護符。', {def:2,maxHp:8}, {region:'lindholm',source:'craft',minLevel:1,allowed:['white'],special:{postBattleHeal:.03},specialText:'戦闘勝利後、全員のHPを3%回復'}),
    black_ring: eq('black_ring','侵食の指輪','accessory','黒い刻印が薄く脈打つ指輪。', {atk:3,agi:1}, {region:'lindholm',source:'craft',minLevel:1,allowed:['black'],special:{debuffDamage:.05},specialText:'黒零は弱体中の敵へ与ダメージ+5%'}),
    rainbow_guard: eq('rainbow_guard','三彩の守環','accessory','三色の細い線で調律を支える腕環。', {def:3,maxMp:5}, {region:'lindholm',source:'craft',minLevel:2,allowed:['rainbow'],special:{barrierStart:.05},specialText:'戦闘開始時に最大HPの5%障壁'}),
    rainbow_mantle: eq('rainbow_mantle','均衡の外套','body','白黒の布地を虹の縫い目で結んだ外套。', {maxHp:22,def:5,mag:2}, {region:'lindholm',source:'craft',minLevel:3,allowed:['rainbow'],special:{damageCut:.03},specialText:'受けるダメージ-3%'}),
    rainbow_coreblade: eq('rainbow_coreblade','原初の片刃','arms','原初の力に反応する、完成していない片刃。', {atk:8,mag:7}, {region:'lindholm',source:'craft',minLevel:5,allowed:['rainbow'],special:{expRate:.08,rareFind:.02},specialText:'戦闘経験値+8%／希少発見率+2%'}),
    white_staff: eq('white_staff','芽吹きの杖','arms','柔らかな枝を芯にした、白零のための杖。', {mag:5,maxMp:8}, {region:'lindholm',source:'craft',minLevel:2,allowed:['white'],special:{healRate:.06},specialText:'白零の回復効果+6%'}),
    white_cloak: eq('white_cloak','新雪の法衣','body','新しい雪のように白い、軽い法衣。', {maxHp:20,def:4,mag:3}, {region:'northreach',source:'craft',minLevel:3,allowed:['white'],special:{barrierStart:.06},specialText:'戦闘開始時に最大HPの6%障壁'}),
    white_sigil: eq('white_sigil','始まりの印章','accessory','終わりを受け入れた先の始まりを描く印章。', {maxMp:14,mag:7,def:2}, {region:'northreach',source:'craft',minLevel:5,allowed:['white'],special:{healRate:.12},specialText:'白零の回復効果+12%'}),
    black_blade: eq('black_blade','黒夜の短刀','arms','夜の裂け目のような黒い短刀。', {atk:6,agi:3}, {region:'lindholm',source:'craft',minLevel:2,allowed:['black'],special:{lowHpDamage:.06},specialText:'HP50%以下の時、与ダメージ+6%'}),
    black_coat: eq('black_coat','断絶の外衣','body','音さえ断つような黒い外衣。', {maxHp:18,def:5,agi:2}, {region:'northreach',source:'craft',minLevel:3,allowed:['black'],special:{damageCut:.03},specialText:'受けるダメージ-3%'}),
    black_orb: eq('black_orb','終端の魔珠','accessory','終わりの余韻を閉じ込めた魔珠。', {atk:7,mag:5,maxMp:6}, {region:'northreach',source:'craft',minLevel:5,allowed:['black'],special:{debuffDamage:.10},specialText:'黒零は弱体中の敵へ与ダメージ+10%'}),
  };

  const recipe = (id,name,region,minLevel,description,ingredients,equipmentId) => ({ id,name,region,minLevel,description,ingredients,output:{type:'equipment',id:equipmentId,qty:1} });
  Object.assign(D.RECIPES, {
    craft_wind_hood: recipe('craft_wind_hood','風織りフード','lindholm',1,'風牙を織り込んだ軽いフード。',[{id:'wolf_fang',qty:2},{id:'herb',qty:2}],'wind_hood'),
    craft_fang_vest: recipe('craft_fang_vest','風牙の胸当て','lindholm',2,'風牙を散らした軽量胸当て。',[{id:'wolf_fang',qty:4},{id:'beast_hide',qty:2}],'fang_vest'),
    craft_bark_gauntlet: recipe('craft_bark_gauntlet','囁き樹の腕甲','lindholm',2,'樹皮と樹脂で作る結界向け腕甲。',[{id:'bark',qty:3},{id:'amber_resin',qty:1}],'bark_gauntlet'),
    craft_prism_greaves: recipe('craft_prism_greaves','虹晶の脚絆','lindholm',3,'虹晶粉を染み込ませた脚絆。',[{id:'prism_dust',qty:3},{id:'beast_hide',qty:2},{id:'silver_feather',qty:1}],'prism_greaves'),
    craft_harmonics_ring: recipe('craft_harmonics_ring','調律の指輪','lindholm',3,'虹全だけが扱える調律の指輪。',[{id:'prism_dust',qty:4},{id:'rainbow_crystal',qty:1}],'harmonics_ring'),
    craft_white_seed_locket: recipe('craft_white_seed_locket','白種のロケット','lindholm',3,'白零の回復を高めるロケット。',[{id:'moonleaf',qty:3},{id:'bark',qty:2},{id:'silver_feather',qty:1}],'white_seed_locket'),
    craft_black_scar_ring: recipe('craft_black_scar_ring','黒痕の指環','lindholm',3,'黒零の侵食を深める指環。',[{id:'obsidian_piece',qty:2},{id:'old_fragment',qty:2},{id:'iron_ore',qty:1}],'black_scar_ring'),
    craft_frostward_charm: recipe('craft_frostward_charm','白霜の護符','northreach',4,'冷気を遮る白霜の護符。',[{id:'frost_bloom',qty:3},{id:'beast_hide',qty:3},{id:'ancient_coin',qty:1}],'frostward_charm'),
    craft_observer_visor: recipe('craft_observer_visor','観測者のバイザー','northreach',5,'北天観測所の記録を元に復元。',[{id:'ruin_circuit',qty:3},{id:'rainbow_crystal',qty:1},{id:'ancient_coin',qty:2}],'observer_visor'),
    craft_lava_heart: recipe('craft_lava_heart','溶岩心臓の護符','embercoast',7,'火山の熱を秘めた護符。',[{id:'lava_core',qty:2},{id:'ember_shell',qty:4},{id:'cinder_feather',qty:2}],'lava_heart'),
    craft_brine_orb: recipe('craft_brine_orb','潮真珠の宝珠','embercoast',7,'傷を鎮める潮の宝珠。',[{id:'brine_pearl',qty:2},{id:'coral_thread',qty:4},{id:'crystal_shard',qty:2}],'brine_orb'),
    craft_origin_siglet: recipe('craft_origin_siglet','原初の印環','duskvale',10,'虹全専用。始まりと終わりを調律する印環。',[{id:'eclipse_shard',qty:2},{id:'soul_glass',qty:2},{id:'rainbow_crystal',qty:2},{id:'secret_relic',qty:1}],'origin_siglet'),
    craft_alpha_lily: recipe('craft_alpha_lily','白花の聖印','duskvale',10,'白零専用。始まりを守る聖印。',[{id:'soul_glass',qty:2},{id:'dusk_ink',qty:3},{id:'frost_bloom',qty:3},{id:'secret_relic',qty:1}],'alpha_lily'),
    craft_omega_shard: recipe('craft_omega_shard','黒曜の終符','duskvale',10,'黒零専用。終わりを見届ける黒曜片。',[{id:'eclipse_shard',qty:2},{id:'void_bone',qty:4},{id:'obsidian_piece',qty:3},{id:'secret_relic',qty:1}],'omega_shard'),
  });
  Object.values(D.RECIPES).forEach((r) => { if (!r.region) r.region = r.output?.id && D.EQUIPMENT_DEFS[r.output.id]?.region || 'lindholm'; });

  // 地方別の道具屋。今いる町の地域だけが並ぶ。
  D.REGION_SHOPS = {
    lindholm:['potion','antidote','stamina_tonic','explorer_ration','traveler_band','plain_cloak','leather_bracer','trail_boots','herb_pendant','road_charm'],
    northreach:['potion','ether','high_potion','stamina_draught','phoenix_leaf','frost_cap','glacier_mail','snowguard_gloves','icewalk_boots','northstar_brooch'],
    embercoast:['high_potion','high_ether','battle_kit','stamina_draught','stamina_elixir','ember_circlet','tideguard_coat','coral_brace','ashstep_sandals'],
    duskvale:['mega_potion','elixir','ward_orb','phoenix_leaf','stamina_elixir','dusk_mask','voidweave_robe','eclipse_gauntlet','rift_boots'],
  };

  Object.assign(D.ENEMIES, {
    ash_crab:{id:'ash_crab',name:'灰殻クラブ',level:10,maxHp:580,atk:56,def:38,mag:16,agi:10,exp:370,gold:310,sprite:'sentinel',drops:[{id:'ember_shell',chance:.92,qty:[1,2]},{id:'coral_thread',chance:.42,qty:[1,1]}],skills:[{name:'灰殻突き',power:1.56},{name:'火山泡',power:1.05,effect:'fracture'}]},
    cinder_gull:{id:'cinder_gull',name:'熾火カモメ',level:10,maxHp:360,atk:44,def:18,mag:42,agi:32,exp:350,gold:295,sprite:'hare',drops:[{id:'cinder_feather',chance:.88,qty:[1,2]},{id:'star_sand',chance:.32,qty:[1,1]}],skills:[{name:'火の羽根',power:1.46},{name:'熱風',power:1.12,effect:'fracture'}]},
    magma_salamander:{id:'magma_salamander',name:'溶岩サラマンダー',level:11,maxHp:720,atk:64,def:34,mag:50,agi:17,exp:460,gold:380,sprite:'bosswolf',drops:[{id:'lava_core',chance:.72,qty:[1,1]},{id:'ember_shell',chance:.75,qty:[2,3]}],skills:[{name:'灼尾',power:1.64},{name:'溶熱線',power:1.26,effect:'fracture'}]},
    tide_revenant:{id:'tide_revenant',name:'潮影の亡者',level:11,maxHp:510,atk:39,def:25,mag:61,agi:27,exp:435,gold:370,sprite:'slime',drops:[{id:'brine_pearl',chance:.45,qty:[1,1]},{id:'coral_thread',chance:.82,qty:[1,2]}],skills:[{name:'潮の爪',power:1.43},{name:'深海の呪い',power:1.12,effect:'fracture'}]},
    caldera_tyrant:{id:'caldera_tyrant',name:'火口の覇獣',level:13,maxHp:1480,atk:78,def:46,mag:68,agi:21,exp:900,gold:880,boss:true,sprite:'bosswolf',drops:[{id:'lava_core',chance:1,qty:[2,3]},{id:'boss_emblem',chance:1,qty:[1,1]},{id:'rainbow_crystal',chance:.45,qty:[1,1]}],skills:[{name:'火口砕き',power:1.90},{name:'灼界咆哮',power:1.42,effect:'fracture'}]},
    dusk_hound:{id:'dusk_hound',name:'暮影ハウンド',level:14,maxHp:680,atk:80,def:35,mag:38,agi:35,exp:620,gold:520,sprite:'wolf',drops:[{id:'void_bone',chance:.78,qty:[1,2]},{id:'dusk_ink',chance:.35,qty:[1,1]}],skills:[{name:'影牙',power:1.72},{name:'夕闇の遠吠え',power:1.14,effect:'fracture'}]},
    void_moth:{id:'void_moth',name:'虚空蛾',level:14,maxHp:430,atk:35,def:21,mag:78,agi:45,exp:640,gold:540,sprite:'hare',drops:[{id:'dusk_ink',chance:.85,qty:[1,2]},{id:'soul_glass',chance:.25,qty:[1,1]}],skills:[{name:'虚鱗粉',power:1.55},{name:'暗幕',power:1.18,effect:'fracture'}]},
    grave_knight:{id:'grave_knight',name:'墓標の騎士',level:15,maxHp:940,atk:84,def:58,mag:46,agi:18,exp:760,gold:650,sprite:'sentinel',drops:[{id:'void_bone',chance:.92,qty:[2,3]},{id:'soul_glass',chance:.38,qty:[1,1]}],skills:[{name:'墓標断ち',power:1.80},{name:'終幕の盾',power:1.16,effect:'fracture'}]},
    eclipse_mimic:{id:'eclipse_mimic',name:'蝕光ミミック',level:16,maxHp:980,atk:90,def:52,mag:76,agi:24,exp:980,gold:810,rare:true,sprite:'sentinel',drops:[{id:'eclipse_shard',chance:1,qty:[1,2]},{id:'secret_relic',chance:.42,qty:[1,1]}],skills:[{name:'蝕光咬み',power:1.87},{name:'反転光',power:1.28,effect:'fracture'}]},
    sword_wraith:{id:'sword_wraith',name:'剣墓の亡霊',level:17,maxHp:1860,atk:102,def:64,mag:92,agi:27,exp:1320,gold:1200,boss:true,sprite:'bosswolf',drops:[{id:'eclipse_shard',chance:1,qty:[2,3]},{id:'soul_glass',chance:1,qty:[2,3]},{id:'boss_emblem',chance:1,qty:[1,1]}],skills:[{name:'残剣乱舞',power:2.08},{name:'終始の断章',power:1.55,effect:'fracture'}]},
  });

  Object.assign(D.LOCATIONS, {
    ember_harbor:{id:'ember_harbor',name:'熾港アグニラ',type:'town',region:'embercoast',x:25,y:70,rank:'7',description:'火山灰と潮風が交じる南西の港町。船乗りと鍛冶師が集まる。',facilities:['guild','shop','craft','inn','sell']},
    ember_beach:{id:'ember_beach',name:'緋火の浜',type:'field',region:'embercoast',x:44,y:57,rank:'7',description:'赤い砂と潮だまりが広がる海岸。潮影の亡者が現れる。',enemyPool:['ash_crab','cinder_gull','tide_revenant'],materialPool:['ember_shell','coral_thread','star_sand'],rareMaterialPool:['brine_pearl','cinder_feather'],rareEnemyPool:['gold_puff','metal_slime'],hiddenFinds:['brine_pearl','secret_relic']},
    caldera_path:{id:'caldera_path',name:'火口回廊',type:'field',region:'embercoast',x:63,y:37,rank:'8',description:'火口へ続く黒い岩の回廊。溶岩サラマンダーが徘徊する。',enemyPool:['magma_salamander','ash_crab','cinder_gull'],materialPool:['ember_shell','lava_core','cinder_feather'],rareMaterialPool:['lava_core','rainbow_crystal'],rareEnemyPool:['metal_slime','gold_puff'],bossPool:['caldera_tyrant'],hiddenFinds:['secret_relic','lava_core']},
    drowned_archive:{id:'drowned_archive',name:'沈み書庫の海蝕洞',type:'field',region:'embercoast',x:79,y:53,rank:'9',description:'古い書庫が海に削られた洞窟。潮と記録の残滓が眠る。',enemyPool:['tide_revenant','magma_salamander','glass_drake'],materialPool:['coral_thread','brine_pearl','ruin_circuit'],rareMaterialPool:['soul_glass','rainbow_crystal'],rareEnemyPool:['prism_mimic','metal_slime'],hiddenFinds:['secret_relic','brine_pearl']},
    dusk_crossing:{id:'dusk_crossing',name:'暮影の渡り場',type:'town',region:'duskvale',x:26,y:66,rank:'10',description:'峡谷の両岸を繋ぐ、夕闇色の宿場。二振りの剣の伝承が残る。',facilities:['guild','shop','craft','inn','sell']},
    shadow_gorge:{id:'shadow_gorge',name:'薄暮峡谷',type:'field',region:'duskvale',x:48,y:50,rank:'10',description:'夕方のような光が続く峡谷。影の獣が道を塞ぐ。',enemyPool:['dusk_hound','void_moth','grave_knight'],materialPool:['void_bone','dusk_ink','obsidian_piece'],rareMaterialPool:['soul_glass','eclipse_shard'],rareEnemyPool:['eclipse_mimic','metal_slime'],hiddenFinds:['secret_relic','soul_glass']},
    sword_graves:{id:'sword_graves',name:'剣墓の原',type:'field',region:'duskvale',x:69,y:31,rank:'11',description:'無数の折れた剣が突き刺さる原。終わらなかった戦いの残響がある。',enemyPool:['grave_knight','void_moth','dusk_hound'],materialPool:['void_bone','soul_glass','dusk_ink'],rareMaterialPool:['eclipse_shard','secret_relic'],rareEnemyPool:['eclipse_mimic','prism_mimic'],bossPool:['sword_wraith'],hiddenFinds:['eclipse_shard','secret_relic']},
    balance_sanctum:{id:'balance_sanctum',name:'調律の祭壇跡',type:'field',region:'duskvale',x:85,y:58,rank:'12',description:'古い祭壇と三つの空席だけが残る場所。三人の力がかすかに反応する。',enemyPool:['eclipse_mimic','sword_wraith','grave_knight'],materialPool:['soul_glass','eclipse_shard','secret_relic'],rareMaterialPool:['rainbow_crystal','boss_emblem'],rareEnemyPool:['eclipse_mimic','metal_slime'],bossPool:['sword_wraith'],hiddenFinds:['secret_relic','eclipse_shard']},
  });

  Object.assign(D.REGIONS, {
    embercoast:{id:'embercoast',name:'緋火海岸',unlockRank:'7',description:'火山と海が押し合う南西の海岸地方。熾港アグニラを拠点に火口と沈み書庫へ向かう。',theme:'coast',label:'第三章：燃える海の境界'},
    duskvale:{id:'duskvale',name:'暮影峡谷',unlockRank:'10',description:'始まりと終わりの剣にまつわる伝承が残る峡谷。暮影の渡り場から剣墓へ進む。',theme:'dusk',label:'第四章：二振りの剣'},
  });

  const q = (id,name,region,rank,description,type,target,amount,gold,advExp,unlockAt,repeatable=false,items=[]) => ({id,name,region,rank:String(rank),description,type,target,amount,reward:{gold,advExp,items},unlockAt,repeatable,dialogue:repeatable?'地方ギルドの常設依頼。':'地方ギルドから届いた依頼。'});
  Object.values(D.QUESTS).forEach((quest) => {
    if (quest.region) return;
    quest.region = ['q_frost_bloom','q_observatory','q_secret','q_frost_lupus','r_frost','r_coin','r_observe'].includes(quest.id) ? 'northreach' : 'lindholm';
  });
  Object.assign(D.QUESTS, {
    q_ember_shell:q('q_ember_shell','港の防熱材','embercoast',7,'火山殻を4つ納品し、港の倉庫を補修する。','collect','ember_shell',4,960,220,1400,false,[{id:'battle_kit',qty:2}]),
    q_tide_revenant:q('q_tide_revenant','潮影の漂着','embercoast',7,'緋火の浜の潮影の亡者を3体討伐する。','kill','tide_revenant',3,1080,250,1450,false,[{id:'stamina_elixir',qty:1}]),
    q_lava_core:q('q_lava_core','火口の熱源','embercoast',8,'溶岩核を2つ回収して鍛冶場へ届ける。','collect','lava_core',2,1360,310,1650,false,[{id:'mega_potion',qty:2}]),
    q_caldera_tyrant:q('q_caldera_tyrant','火口の覇獣','embercoast',8,'火口回廊の火口の覇獣を討伐する。','kill','caldera_tyrant',1,2600,560,1900,false,[{id:'boss_emblem',qty:1},{id:'stamina_elixir',qty:2}]),
    q_archive:q('q_archive','沈み書庫の頁','embercoast',9,'海蝕洞で珊瑚糸を5つと潮真珠を1つ集める。','collect','coral_thread',5,1700,360,2200,false,[{id:'high_ether',qty:3}]),
    r_ember_shell:q('r_ember_shell','【繰返】火山殻の補充','embercoast',7,'火山殻を2つ納品する。','collect','ember_shell',2,220,45,1400,true),
    r_cinder:q('r_cinder','【繰返】港の空路確保','embercoast',7,'熾火カモメを2体討伐する。','kill','cinder_gull',2,260,52,1450,true),
    r_tide:q('r_tide','【繰返】浜の見回り','embercoast',7,'潮影の亡者を2体討伐する。','kill','tide_revenant',2,300,60,1500,true),
    r_coral:q('r_coral','【繰返】珊瑚糸の調達','embercoast',8,'珊瑚糸を3つ納品する。','collect','coral_thread',3,320,64,1700,true),
    q_void_bone:q('q_void_bone','峡谷の骨片','duskvale',10,'虚骨を5つ集め、渡り場の護符職人へ納品する。','collect','void_bone',5,2300,480,3000,false,[{id:'ward_orb',qty:2}]),
    q_dusk_hound:q('q_dusk_hound','薄暮の追跡者','duskvale',10,'暮影ハウンドを3体討伐して街道を守る。','kill','dusk_hound',3,2500,520,3100,false,[{id:'stamina_elixir',qty:1}]),
    q_soul_glass:q('q_soul_glass','魂玻璃の標本','duskvale',11,'魂玻璃を2つ持ち帰り、剣墓の調査に協力する。','collect','soul_glass',2,3100,620,3500,false,[{id:'elixir',qty:2}]),
    q_sword_wraith:q('q_sword_wraith','剣墓の亡霊','duskvale',11,'剣墓の亡霊を討伐し、原に残る残響を鎮める。','kill','sword_wraith',1,4800,1000,4100,false,[{id:'eclipse_shard',qty:1},{id:'rainbow_crystal',qty:2}]),
    q_sanctum:q('q_sanctum','調律の祭壇跡','duskvale',12,'封じられた遺物を1つ持ち帰り、祭壇の記録を確かめる。','collect','secret_relic',1,5200,1100,4700,false,[{id:'boss_emblem',qty:1},{id:'stamina_elixir',qty:3}]),
    r_void_bone:q('r_void_bone','【繰返】虚骨の回収','duskvale',10,'虚骨を3つ納品する。','collect','void_bone',3,420,80,3000,true),
    r_void_moth:q('r_void_moth','【繰返】暮影の灯火','duskvale',10,'虚空蛾を2体討伐する。','kill','void_moth',2,460,88,3050,true),
    r_ink:q('r_ink','【繰返】暮影の墨の調達','duskvale',11,'暮影の墨を2つ納品する。','collect','dusk_ink',2,510,98,3400,true),
    r_grave_knight:q('r_grave_knight','【繰返】剣墓の巡回','duskvale',11,'墓標の騎士を1体討伐する。','kill','grave_knight',1,560,106,3600,true),
  });

  D.LEGACY_EQUIPMENT_MAP = {
    rainbow_edge:'leather_bracer', white_charm:'herb_pendant', black_ring:'black_scar_ring',
    rainbow_guard:'harmonics_ring', rainbow_mantle:'plain_cloak', rainbow_coreblade:'eclipse_gauntlet',
    white_staff:'white_seed_locket', white_cloak:'glacier_mail', white_sigil:'alpha_lily',
    black_blade:'black_scar_ring', black_coat:'tideguard_coat', black_orb:'omega_shard'
  };

  D.REGION_STORIES = {
    lindholm:'草原の風と、名前を持たなかった二人。三人の旅はここから始まる。',
    northreach:'凍てた観測記録が、空から落ちた星と三神の眠りを示している。',
    embercoast:'火山と海の境界で、始まりと終わりの力が互いを押し返している。',
    duskvale:'二振りの剣の残響が、三人の中に眠る調律の力を呼び起こそうとしている。',
  };
})();
