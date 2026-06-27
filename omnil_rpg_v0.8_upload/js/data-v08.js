/* 全零〈オムニル〉 v0.8 — 十地方・食堂・左右武器・キークエスト拡張 */
(() => {
  'use strict';
  const D = window.OMNIL_DATA;
  if (!D) return;

  const jp = (n) => String(n).padStart(2, '0');
  // 冒険者レベルは100まで。50スタミナずつ上がる。
  D.RANKS = Array.from({ length: 100 }, (_, i) => {
    const level = i + 1;
    return {
      id: String(level), level, name: `Lv.${level}`,
      threshold: (level - 1) * 250,
      maxStamina: 100 + (level - 1) * 50,
      description: level < 10 ? '近隣の依頼を任される冒険者。' : level < 30 ? '複数の地方から頼られる実力者。' : level < 60 ? '危険地方の調査を任される熟練者。' : level < 90 ? '世界の均衡に触れる英雄級の冒険者。' : '世界の根源へ踏み出す最高位の冒険者。',
    };
  });

  const regions = [
    { id:'lindholm', name:'リンドホルム地方', unlockRank:1, label:'第一章：星なき始まり', theme:'plain', desc:'草原、深林、遺構、落星の尾根が連なる最初の地方。', town:'lindholm', story:'草原の風と、名前を持たなかった二人。三人の旅はここから始まる。' },
    { id:'northreach', name:'白霜北域', unlockRank:5, label:'第二章：凍てる空の記録', theme:'frost', desc:'凍てた雪原と観測遺構が残る北方地方。', town:'frost_gate', requiresQuest:'key_lindholm', story:'凍てた観測記録が、空から落ちた星と三神の眠りを示している。' },
    { id:'embercoast', name:'緋火海岸', unlockRank:10, label:'第三章：燃える海の境界', theme:'coast', desc:'火山と海が押し合う、熾港を拠点とした南西地方。', town:'ember_harbor', requiresQuest:'key_northreach', story:'火山と海の境界で、始まりと終わりの力が互いを押し返している。' },
    { id:'duskvale', name:'暮影峡谷', unlockRank:16, label:'第四章：二振りの剣', theme:'dusk', desc:'始まりと終わりの剣にまつわる伝承が残る峡谷。', town:'dusk_crossing', requiresQuest:'key_embercoast', story:'二振りの剣の残響が、三人の中に眠る調律の力を呼び起こそうとしている。' },
    { id:'verdantgrove', name:'翠雨樹海', unlockRank:23, label:'第五章：芽吹きの残響', theme:'forest', desc:'雨と巨樹が育む深い樹海。失われた生命研究の痕跡が眠る。', town:'verdant_bastion', requiresQuest:'key_duskvale', story:'白零は、芽吹き続ける巨樹の中に、自分の知らない温かさを見る。' },
    { id:'aurorasteppe', name:'天光高原', unlockRank:31, label:'第六章：空へ伸びる道', theme:'hills', desc:'雲を見下ろす高原。風と雷が古い空路を守っている。', town:'aurora_outpost', requiresQuest:'key_verdantgrove', story:'虹全の中で、始まりと終わりが初めて同じ景色を見た。' },
    { id:'saltdesert', name:'白砂砂海', unlockRank:40, label:'第七章：還らぬ砂時計', theme:'desert', desc:'古代都市が砂に沈んだ果てのない砂海。', town:'salt_oasis', requiresQuest:'key_aurorasteppe', story:'黒零は、終わらせることが何を残すのかを、砂に埋もれた町で知る。' },
    { id:'thunderplateau', name:'雷鳴台地', unlockRank:52, label:'第八章：断たれた雷路', theme:'storm', desc:'絶えず雷鳴が轟く台地。古代の送電塔が雲を貫く。', town:'thunder_fort', requiresQuest:'key_saltdesert', story:'三人の力は、互いを拒むのではなく、呼び合うようになっていく。' },
    { id:'abyssalcity', name:'深淵水都', unlockRank:67, label:'第九章：沈む神話', theme:'abyss', desc:'水没した大都市と、神話以前の記録が眠る深層地方。', town:'abyss_port', requiresQuest:'key_thunderplateau', story:'調律の神が最後に残した意志が、水底の石碑から三人へ語りかける。' },
    { id:'originfrontier', name:'原初境界', unlockRank:82, label:'終章：全零へ至る道', theme:'origin', desc:'現世と神界の境目。始まりと終わりが再び世界を呑もうとしている。', town:'origin_camp', requiresQuest:'key_abyssalcity', story:'始まり、終わり、調律。三人はそれぞれの完成形へ歩き出す。' },
  ];
  D.REGIONS = Object.fromEntries(regions.map((r) => [r.id, { id:r.id, name:r.name, unlockRank:String(r.unlockRank), label:r.label, theme:r.theme, description:r.desc, requiresQuest:r.requiresQuest || null, town:r.town }]));
  D.REGION_STORIES = Object.fromEntries(regions.map((r) => [r.id, r.story]));

  const facilityList = ['guild','shop','craft','inn','restaurant','sell'];
  const makeTown = (id, name, region, rank, desc, x=25, y=67) => ({ id,name,type:'town',region,x,y,rank:String(rank),description:desc,facilities:facilityList });
  Object.assign(D.LOCATIONS, {
    lindholm: makeTown('lindholm','宿場町リンドホルム','lindholm',1,'草原と森の境にある、小さな宿場町。冒険者ギルド《枝角亭》がある。',24,70),
    frost_gate: makeTown('frost_gate','白霜の関所','northreach',5,'雪原へ向かう最後の補給地。観測者と旅人が集う。',24,68),
    ember_harbor: makeTown('ember_harbor','熾港アグニラ','embercoast',10,'火山灰と潮風が交じる港町。船乗りと鍛冶師が集まる。',24,68),
    dusk_crossing: makeTown('dusk_crossing','暮影の渡り場','duskvale',16,'峡谷の両岸を繋ぐ、夕闇色の宿場。二振りの剣の伝承が残る。',25,68),
    verdant_bastion: makeTown('verdant_bastion','翠雨の砦町リーファ','verdantgrove',23,'巨樹の根元に築かれた木造の砦町。雨よけの回廊が美しい。',23,69),
    aurora_outpost: makeTown('aurora_outpost','天光の前哨ウィンドネスト','aurorasteppe',31,'雲上の高原に築かれた補給地。滑空船が風待ちをする。',24,70),
    salt_oasis: makeTown('salt_oasis','白砂のオアシス・ネージュ','saltdesert',40,'塩の砂海に湧く淡水を守る、商人と遺跡調査者の町。',24,69),
    thunder_fort: makeTown('thunder_fort','雷鳴砦ボルティス','thunderplateau',52,'雷除けの塔に囲まれた堅牢な砦。大地が低く震えている。',24,69),
    abyss_port: makeTown('abyss_port','水都外港ネレイス','abyssalcity',67,'沈んだ水都の上に建てられた浮桟橋の町。潜水鐘が並ぶ。',24,69),
    origin_camp: makeTown('origin_camp','境界前線キャンプ','originfrontier',82,'現世の終わりに設けられた最終補給地。静かな決意だけがある。',24,69),
  });

  const material = (id, name, description, sell) => ({id,name,type:'material',description,sell});
  const regionMaterials = {
    verdantgrove: [['verdant_sap','翠雨の樹液','雨を含んだ巨樹から採れる、濃い生命の樹液。',420],['giant_petal','巨花の花弁','魔力を蓄えた巨大な花の花弁。',460]],
    aurorasteppe: [['skyfeather','天光羽','高原の風鳥が落とす、淡く発光する羽。',620],['storm_crystal','嵐晶','雷を閉じ込めた青い結晶。',690]],
    saltdesert: [['saltglass','塩玻璃','砂海の熱で生まれた透明な塩の結晶。',880],['hour_sand','刻砂','砂時計のように魔力を流す金色の砂。',950]],
    thunderplateau: [['thunder_ore','雷鉱','雷鳴台地でのみ採れる、帯電した鉱石。',1220],['coil_fragment','古代コイル片','古い雷路の装置から見つかる部品。',1280]],
    abyssalcity: [['abyss_pearl','深淵真珠','水圧に耐えて育った、濃紺の真珠。',1650],['memory_coral','記憶珊瑚','触れた者の記憶を淡く映す珊瑚。',1720]],
    originfrontier: [['origin_fragment','原初片','白・黒・虹の境界で生まれた不安定な結晶片。',2500],['terios_core','テリオス核','完成へ向かう神性の断片。',3600]],
  };
  Object.values(regionMaterials).flat().forEach(([id,name,desc,sell]) => D.ITEM_DEFS[id] = material(id,name,desc,sell));

  const enemy = (id,name,lvl,stats,drops,opts={}) => ({ id,name,level:lvl,maxHp:stats[0],atk:stats[1],def:stats[2],mag:stats[3],agi:stats[4],exp:stats[5],gold:stats[6],sprite:opts.sprite || 'sentinel',drops,skills:opts.skills || [{name:'猛攻',power:1.18},{name:'崩し',power:.92,effect:'fracture'}],...opts });
  const mkDrops = (a,b) => [{id:a,chance:.88,qty:[1,2]},{id:b,chance:.38,qty:[1,1]}];
  const highSpecs = [
    ['verdantgrove',23,['verdant_sap','giant_petal'],['雨喰いリザード','花冠マンティス','根絡みトレント','翠雨の樹王','生命花ミミック']],
    ['aurorasteppe',31,['skyfeather','storm_crystal'],['風雷グリフォン','雲駆けヤク','嵐眼エレメンタル','天光の飛竜','蒼空メタル']],
    ['saltdesert',40,['saltglass','hour_sand'],['玻璃サソリ','砂時計ゴーレム','陽炎ハウンド','砂海の巨獣','黄金砂ミミック']],
    ['thunderplateau',52,['thunder_ore','coil_fragment'],['雷角バイソン','導雷ワイバーン','古代電装兵','雷雲の巨像','雷貨スライム']],
    ['abyssalcity',67,['abyss_pearl','memory_coral'],['深淵サハギン','記憶クラゲ','水圧騎士','沈都の守護者','群青メタル']],
    ['originfrontier',82,['origin_fragment','terios_core'],['境界の獣','白黒の残響','調律崩し','原初の番人','原初の擬態者']],
  ];
  highSpecs.forEach(([region, level, mats, names], idx) => {
    const ids = names.map((_,i)=>`${region}_e${i+1}`);
    const base = 900 + idx*650; const atk = 75 + idx*28; const def=45+idx*22; const mag=60+idx*25; const agi=25+idx*7; const exp=500+idx*380; const gold=450+idx*360;
    D.ENEMIES[ids[0]] = enemy(ids[0],names[0],level,[base,atk,def,mag,agi,exp,gold],mkDrops(mats[0],mats[1]),{sprite:'wolf'});
    D.ENEMIES[ids[1]] = enemy(ids[1],names[1],level+1,[Math.round(base*.9),atk+8,def+6,mag+12,agi+8,exp+40,gold+50],mkDrops(mats[0],mats[1]),{sprite:'hare'});
    D.ENEMIES[ids[2]] = enemy(ids[2],names[2],level+2,[Math.round(base*1.15),atk+12,def+18,mag+20,agi-2,exp+90,gold+80],mkDrops(mats[1],mats[0]),{sprite:'treant'});
    D.ENEMIES[ids[3]] = enemy(ids[3],names[3],level+4,[Math.round(base*2.7),atk+38,def+36,mag+42,agi+4,exp*3,gold*3], [{id:mats[0],chance:1,qty:[2,4]},{id:mats[1],chance:1,qty:[2,3]},{id:'boss_emblem',chance:1,qty:[1,1]}],{sprite:'bosswolf',boss:true,skills:[{name:'大技',power:1.9},{name:'圧界',power:1.42,effect:'fracture'}]});
    D.ENEMIES[ids[4]] = enemy(ids[4],names[4],level+3,[Math.round(base*1.4),atk+18,def+15,mag+26,agi+12,exp*2,gold*4], [{id:mats[1],chance:1,qty:[1,2]},{id:'metal_core',chance:.7,qty:[1,1]}],{sprite:'slime',rare:true,metal:idx%2===1,golden:idx%2===0});
    const fields=[
      {id:`${region}_frontier`,name:['滴雨の外縁','雲裂き草原','白塩の砂丘','轟雷の外縁','水都の浅層','境界の薄明'][idx],x:47,y:59},
      {id:`${region}_depths`,name:['巨樹の根域','風鳴り断崖','時砂の遺都','雷路の廃塔','記憶の回廊','白黒の裂け目'][idx],x:66,y:39},
      {id:`${region}_sanctum`,name:['翠雨の心臓部','天光の祭壇','逆さ砂時計宮','雷冠の頂','沈没大聖堂','原初の座'][idx],x:82,y:54},
    ];
    fields.forEach((f,fi)=> D.LOCATIONS[f.id] = {id:f.id,name:f.name,type:'field',region,x:f.x,y:f.y,rank:String(level + fi*2),description:`${D.REGIONS[region].name}にある高危険度の探索地。`,enemyPool:[ids[0],ids[1],ids[2]],materialPool:[mats[0],mats[0],mats[1]],rareMaterialPool:[mats[1],'rainbow_crystal'],rareEnemyPool:[ids[4],'metal_slime','gold_puff'],bossPool:fi===2?[ids[3]]:[],hiddenFinds:['secret_relic',mats[1],'boss_emblem']});
  });

  // 全地域に三つの探索地点を揃える。既存地方も不足分を補完し、町には食堂を追加。
  const extraFields = [
    ['lindholm','brook_meadows','水鏡の牧草地',1,42,49,['pale_slime','grass_hare','wind_wolf'],['moonleaf','herb','slime_core']],
    ['lindholm','iron_hills','風鉄の丘',2,58,32,['iron_boar','wind_wolf','thorn_mantis'],['iron_ore','beast_hide','amber_resin']],
    ['lindholm','starfall_ridge','落星の尾根',4,84,17,['glass_drake','ancient_golem','fog_wraith'],['star_sand','rainbow_crystal','ancient_coin']],
    ['northreach','frost_wastes','白霜の雪原',5,46,44,['frost_lupus','fog_wraith','iron_boar'],['frost_bloom','beast_hide','obsidian_piece']],
    ['northreach','north_observatory','北天観測所',6,72,33,['ancient_golem','prism_mimic','hollow_knight'],['ruin_circuit','ancient_coin','rainbow_crystal']],
    ['northreach','aurora_icefall','蒼氷の瀑布',7,83,59,['frost_lupus','glass_drake','ancient_golem'],['frost_bloom','crystal_shard','rainbow_crystal']],
    ['embercoast','ember_beach','緋火の浜',10,44,58,['ash_crab','cinder_gull','tide_revenant'],['ember_shell','coral_thread','star_sand']],
    ['embercoast','caldera_path','火口回廊',12,64,36,['magma_salamander','ash_crab','cinder_gull'],['ember_shell','lava_core','cinder_feather']],
    ['embercoast','drowned_archive','沈み書庫の海蝕洞',14,80,54,['tide_revenant','magma_salamander','glass_drake'],['coral_thread','brine_pearl','ruin_circuit']],
    ['duskvale','shadow_gorge','薄暮峡谷',16,47,51,['dusk_hound','void_moth','grave_knight'],['void_bone','dusk_ink','obsidian_piece']],
    ['duskvale','sword_graves','剣墓の原',18,67,32,['grave_knight','void_moth','dusk_hound'],['void_bone','soul_glass','dusk_ink']],
    ['duskvale','balance_sanctum','調律の祭壇跡',21,84,56,['eclipse_mimic','sword_wraith','grave_knight'],['soul_glass','eclipse_shard','secret_relic']],
  ];
  extraFields.forEach(([region,id,name,rank,x,y,pool,mats]) => { D.LOCATIONS[id] = {id,name,type:'field',region,x,y,rank:String(rank),description:`${D.REGIONS[region].name}の探索地。`,enemyPool:pool,materialPool:mats,rareMaterialPool:[mats[1],mats[2]],rareEnemyPool:['metal_slime','gold_puff','prism_mimic'],bossPool: id.includes('ridge')?['starfall_beast']:id.includes('path')?['caldera_tyrant']:id.includes('graves')?['sword_wraith']:[],hiddenFinds:['secret_relic',mats[2]]}; });
  Object.values(D.LOCATIONS).filter((l)=>l.type==='town').forEach((l)=>{l.facilities=facilityList;});

  // キークエスト。前地方の鍵を完了し、一定の冒険者Lvと通常依頼を満たすことで受けられる。
  const keyOrder = [
    ['key_lindholm','風の中の三つの名前','lindholm',3,['q_herb','q_boss'],null,'草原の小さな灯りが、三人に「帰る場所」を与えた。'],
    ['key_northreach','北天に眠る記録','northreach',7,['key_lindholm'],null,'観測所の星図は、三神が眠る以前の空を映していた。'],
    ['key_embercoast','燃える海の境界線','embercoast',12,['key_northreach'],null,'始まりと終わりがぶつかる海で、虹全は二人の手を離さなかった。'],
    ['key_duskvale','二振りの剣の残響','duskvale',19,['key_embercoast'],null,'剣墓の声は、白と黒の中に宿る微かな対極の因子を指した。'],
    ['key_verdantgrove','芽吹きを終わらせる者','verdantgrove',27,['key_duskvale'],null,'白零は、終わらせる勇気もまた、新しい始まりの一部だと知った。'],
    ['key_aurorasteppe','空路に残る約束','aurorasteppe',36,['key_verdantgrove'],null,'虹全は、二人に命令せず、自分たちの行き先を三人で決めた。'],
    ['key_saltdesert','砂時計の向こう側','saltdesert',46,['key_aurorasteppe'],null,'黒零は、すべてを無へ還すだけではない終わりを見つけた。'],
    ['key_thunderplateau','三つの雷鳴','thunderplateau',59,['key_saltdesert'],null,'三人の力は、初めて完全な共鳴に近い形を見せた。'],
    ['key_abyssalcity','調律神の遺言','abyssalcity',74,['key_thunderplateau'],null,'水底の碑文は告げる。三人は神の器ではなく、自ら完成するための存在だと。'],
    ['key_originfrontier','零から、すべてへ','originfrontier',90,['key_abyssalcity'],['rainbow','white','black'],'三人は互いを選び、神性に呑まれずテリオスへの扉を開いた。'],
  ];
  keyOrder.forEach(([id,name,region,rank,requires,teriosUnlock,story],i)=>{
    const enemyId = Object.values(D.LOCATIONS).find((l)=>l.region===region&&l.bossPool?.length)?.bossPool?.[0] || (region==='lindholm'?'starfall_beast':region==='northreach'?'ancient_golem':region==='embercoast'?'caldera_tyrant':region==='duskvale'?'sword_wraith':`${region}_e4`);
    D.QUESTS[id] = { id,name,region,rank:String(rank),key:true,requiresQuests:requires,description:`【キークエスト】${D.REGIONS[region].name}の異変を追い、${D.ENEMIES[enemyId]?.name || '強敵'}を退ける。`,type:'kill',target:enemyId,amount:1,reward:{gold:1500+i*2300,advExp:900+i*850,items:[{id:'stamina_elixir',qty:1},{id:'boss_emblem',qty:1}]},unlockAt:(rank-1)*250,dialogue:'地方ギルドの奥から、特別な依頼が届いた。',storyText:story,teriosUnlock };
  });
  D.KEY_QUESTS = keyOrder.map((x)=>x[0]);

  // 地方ごとに通常依頼3・繰り返し依頼4を追加。既存依頼は残しつつ、地方の個性を増やす。
  regions.forEach((r, i) => {
    const locations = Object.values(D.LOCATIONS).filter((l)=>l.region===r.id&&l.type==='field');
    const materialIds = locations.flatMap((l)=>l.materialPool||[]).filter((v,idx,a)=>a.indexOf(v)===idx).slice(0,2);
    const enemyIds = locations.flatMap((l)=>l.enemyPool||[]).filter((v,idx,a)=>a.indexOf(v)===idx).slice(0,2);
    const level = r.unlockRank;
    const k1=`${r.id}_supply`, k2=`${r.id}_hunt`, k3=`${r.id}_survey`;
    [[k1,`${r.name}の補給線`, 'collect',materialIds[0]||'herb',3],[k2,`${r.name}の街道警備`, 'kill',enemyIds[0]||'wind_wolf',3],[k3,`${r.name}の異変調査`, 'collect',materialIds[1]||materialIds[0]||'slime_core',2]].forEach(([id,name,type,target,amount],j)=>{
      if(!D.QUESTS[id]) D.QUESTS[id]={id,name,region:r.id,rank:String(level+j),description:`${D.REGIONS[r.id].name}で発生した依頼。${type==='collect'?'必要素材を集める。':'危険個体を討伐する。'}`,type,target,amount,reward:{gold:220+i*420+j*120,advExp:70+i*120+j*30,items:[{id:'stamina_tonic',qty:1}]},unlockAt:Math.max(0,(level-1)*250),dialogue:'地方ギルドからの依頼。'};
    });
    [[`r_${r.id}_mat`,`【繰返】${r.name}の素材納品`,'collect',materialIds[0]||'herb',2],[`r_${r.id}_hunt`,`【繰返】${r.name}の討伐巡回`,'kill',enemyIds[0]||'wind_wolf',2],[`r_${r.id}_rare`,`【繰返】希少素材の探索`,'collect',materialIds[1]||materialIds[0]||'slime_core',2],[`r_${r.id}_elite`,`【繰返】危険個体の排除`,'kill',enemyIds[1]||enemyIds[0]||'wind_wolf',1]].forEach(([id,name,type,target,amount],j)=> {
      D.QUESTS[id]={id,name,region:r.id,rank:String(level+j),repeatable:true,description:`${D.REGIONS[r.id].name}の常設${type==='collect'?'納品':'討伐'}依頼。`,type,target,amount,reward:{gold:90+i*110+j*35,advExp:24+i*28+j*8,items:j===3?[{id:'stamina_draught',qty:1}]:[]},unlockAt:Math.max(0,(level-1)*250),dialogue:'地方ギルドの常設依頼。'};
    });
  });

  // キークエストは、前章だけでなく当該地方の基礎依頼を終えると受注可能にする。
  regions.forEach((r) => {
    const key = D.QUESTS[`key_${r.id}`];
    if (!key) return;
    const localRequirements = [`${r.id}_supply`, `${r.id}_hunt`];
    key.requiresQuests = [...new Set([...(key.requiresQuests || []), ...localRequirements])];
    key.description += '　地方の補給線と街道警備を終えた後に受注できる。';
  });

  // 食堂：各地方10料理。時間制限付きの常時効果。
  const mealSuffixes = ['炙り串','香草煮','旅人の皿','濃厚スープ','祝福パン','狩人の丼','星見デザート','特製パイ','祝祭定食','秘伝の一皿'];
  const mealPrefix = ['風渡る','白霜','熾火','暮影','翠雨','天光','白砂','雷鳴','深淵','原初'];
  const mealEffects = [
    {stats:{maxHp:20},special:{postBattleHeal:.03},label:'戦闘勝利後HP3%回復'},
    {stats:{atk:4},special:{damageRate:.05},label:'与ダメージ+5%'},
    {stats:{def:4},special:{damageCut:.05},label:'被ダメージ-5%'},
    {stats:{mag:4},special:{healRate:.08},label:'回復効果+8%'},
    {stats:{agi:3},special:{rareFind:.03},label:'希少素材発見率+3%'},
    {stats:{luck:4},special:{goldRate:.12},label:'獲得G+12%'},
    {stats:{maxMp:12},special:{expRate:.12},label:'戦闘経験値+12%'},
    {stats:{maxHp:12,def:2},special:{masteryRate:.30},label:'技の習熟経験+30%'},
    {stats:{atk:2,mag:2},special:{staminaDiscount:.10},label:'探索・戦闘スタミナ消費-10%'},
    {stats:{maxHp:24,atk:3,def:3,mag:3},special:{allRound:.04},label:'攻防回復効果+4%'},
  ];
  D.MEALS = {};
  regions.forEach((r, i)=> {
    D.MEALS[r.id] = mealSuffixes.map((suffix,j)=>({id:`meal_${r.id}_${j+1}`,region:r.id,name:`${mealPrefix[i]}${suffix}`,description:`${r.name}の食堂で味わえる料理。${mealEffects[j].label}。`,price:55 + i*95 + j*35,minLevel:Math.min(100,r.unlockRank + Math.floor(j/2)*3),durationMinutes:30 + j*10,effect:mealEffects[j]}));
  });

  // 右手／左手の武器と、地域ごとに異なる装備・製造品。
  const eq = (id,name,slot,desc,stats,extra={}) => ({id,name,slot,description:desc,stats,allowed:'all',special:{},...extra});
  const weaponKinds = [
    ['剣','片手剣','oneHand','rightHand'],['槍','片手槍','oneHand','rightHand'],['弓','長弓','twoHand','rightHand'],['銃','魔導銃','twoHand','rightHand'],['刀','双刃刀','oneHand','rightHand'],['ハンマー','戦槌','oneHand','rightHand'],['大剣','大剣','twoHand','rightHand'],['盾','片手盾','shield','leftHand'],['大盾','塔盾','twoHandShield','rightHand'],
  ];
  const regionEquip = {};
  regions.forEach((r,i)=>{
    const tier=i+1; const min=r.unlockRank; const mats=Object.values(regionMaterials[r.id]||[]).map(x=>x[0]); const fallback=['herb','slime_core']; const m1=mats[0]||fallback[0],m2=mats[1]||fallback[1];
    const items=[];
    const names = [`${mealPrefix[i]}の剣`,`${mealPrefix[i]}の長弓`,`${mealPrefix[i]}の魔導銃`,`${mealPrefix[i]}の槍`,`${mealPrefix[i]}の片手盾`,`${mealPrefix[i]}の塔盾`,`${mealPrefix[i]}の冠`,`${mealPrefix[i]}の外衣`,`${mealPrefix[i]}の手甲`,`${mealPrefix[i]}の靴`,`${mealPrefix[i]}の護符`];
    const specs = [
      ['rightHand','oneHand','sword',{atk:7*tier,agi:Math.max(1,tier)}, {damageRate:.02*tier}],
      ['rightHand','twoHand','bow',{atk:9*tier,agi:2*tier}, {rareFind:.005*tier}],
      ['rightHand','twoHand','gun',{atk:8*tier,mag:3*tier}, {pierceRate:.03*tier}],
      ['rightHand','oneHand','spear',{atk:8*tier,def:tier}, {bossDamage:.02*tier}],
      ['leftHand','shield','shield',{def:6*tier,maxHp:12*tier}, {damageCut:.01*tier}],
      ['rightHand','twoHandShield','greatshield',{def:10*tier,maxHp:20*tier}, {barrierStart:.02*tier}],
      ['head',null,'head',{def:3*tier,maxMp:4*tier}, {expRate:.01*tier}],
      ['body',null,'body',{maxHp:18*tier,def:4*tier}, {postBattleHeal:.005*tier}],
      ['arms',null,'arms',{atk:3*tier,mag:2*tier}, {masteryRate:.02*tier}],
      ['legs',null,'legs',{agi:3*tier,def:2*tier}, {staminaDiscount:.005*tier}],
      ['accessory',null,'accessory',{luck:2*tier,maxMp:3*tier}, {goldRate:.015*tier}],
    ];
    specs.forEach((s,j)=>{
      const [slot,handType,weaponType,stats,special]=s; const id=`v08_${r.id}_${j+1}`;
      D.EQUIPMENT_DEFS[id]=eq(id,names[j],slot,`${r.name}で作られる${weaponType||slot}。`,stats,{region:r.id,source:j<6?'shop':'craft',price:(180*tier)+(j*65*tier),minLevel:min,handType,weaponType,special,specialText:Object.keys(special).length?'地域特性を引き出す特殊効果':''});
      items.push(id);
      if(j>=6){ const rec=`craft_${id}`; D.RECIPES[rec]={id:rec,name:`${names[j]}の製造`,region:r.id,minLevel:min,category:slot==='accessory'?'装飾':slot==='arms'||slot==='body'||slot==='head'||slot==='legs'?'防具':'武器',description:`${r.name}の素材を使って${names[j]}を作る。`,ingredients:[{id:m1,qty:2+tier},{id:m2,qty:1+Math.floor(tier/2)}],output:{type:'equipment',id,qty:1}}; }
    });
    // 刀とハンマーも地方ごとに用意する。片手構成の選択肢を増やし、盾との組み合わせを作る。
    const extraWeapons = [
      { suffix:'の刀', weaponType:'katana', stats:{atk:8*tier,agi:2*tier}, special:{criticalRate:.02*tier}, text:'急所を狙いやすい片手刀' },
      { suffix:'の戦槌', weaponType:'hammer', stats:{atk:10*tier,def:2*tier}, special:{bossDamage:.025*tier}, text:'重い一撃で強敵を崩す片手戦槌' },
    ];
    extraWeapons.forEach((w,k)=>{
      const id=`v08_${r.id}_${w.weaponType}`; const name=`${mealPrefix[i]}${w.suffix}`;
      D.EQUIPMENT_DEFS[id]=eq(id,name,'rightHand',`${r.name}で扱われる${w.text}。`,w.stats,{region:r.id,source:'shop',price:(260*tier)+(k*80*tier),minLevel:min,handType:'oneHand',weaponType:w.weaponType,special:w.special,specialText:w.text});
      items.push(id);
    });
    // 各地域に三人専用の高性能アクセサリーを追加。
    ['rainbow','white','black'].forEach((owner,k)=>{
      const id=`v08_${r.id}_${owner}_sigil`; const ownerName=['虹全','白零','黒零'][k];
      D.EQUIPMENT_DEFS[id]=eq(id,`${mealPrefix[i]}の${ownerName}紋`, 'accessory',`${ownerName}の力にのみ強く反応する紋章。`,{maxHp:8*tier,maxMp:5*tier,[k===0?'mag':k===1?'def':'atk']:4*tier},{region:r.id,source:'craft',minLevel:min,allowed:[owner],special:k===0?{mpCostRate:-.01*tier}:k===1?{healRate:.02*tier}:{debuffDamage:.02*tier},specialText:`${ownerName}専用の神性補助`});
      const rec=`craft_${id}`; D.RECIPES[rec]={id:rec,name:`${D.EQUIPMENT_DEFS[id].name}の製造`,region:r.id,minLevel:min+1,category:'専用装飾',description:`${ownerName}だけが扱える地方固有の紋章。`,ingredients:[{id:m1,qty:2+tier},{id:m2,qty:2}],output:{type:'equipment',id,qty:1}};
    });
    regionEquip[r.id]=items;
  });
  D.REGION_SHOPS ||= {};
  regions.forEach((r,i)=>{
    const baseItems = ['potion','ether','antidote','stamina_tonic','high_potion','high_ether','stamina_draught','stamina_elixir','mega_potion','elixir'].filter((id)=>D.ITEM_DEFS[id]);
    D.REGION_SHOPS[r.id] = [...baseItems.slice(0,Math.min(baseItems.length,4+Math.ceil((i+1)/1.5))), ...regionEquip[r.id].slice(0,8)];
  });

  // v0.8専用スキル：多段・ランダム・ためる・分身・追加行動・超必殺。
  const addSkill = (owner,id,name,mp,target,kind,description,extra={}) => D.SKILLS[id] = {id,owner,name,mp,target,kind,description,mastery:{powerRate:kind==='heal'||kind==='support'?0.08:0.11,level3:'効果量+10%',level6:'追加効果強化',level10:'極意効果を発動'},...extra};
  const appendSkillPanel = (owner,branch,skillId,name,cost=5) => {
    const panels=D.CHARACTER_DEFS[owner].panels; const branchPanels=panels.filter(p=>p.branch===branch); const prev=branchPanels[branchPanels.length-1];
    panels.push({id:`${owner}_${branch}_v08_${skillId}`,name,cost,branch,category:'skill',skill:skillId,prerequisite:prev?.id,minLevel:Math.max(20,prev?.minLevel||1),description:D.SKILLS[skillId].description,final:false});
  };
  addSkill('rainbow','r_origin_prismatic_storm','万象・虹嵐',30,'allEnemies','special','敵全体へ3連撃。命中ごとにランダム弱体。',{power:1.1,allHits:3,debuff:{fracture:2,weaken:2,slow:2}});
  addSkill('rainbow','r_origin_choice','選択の連環',18,'self','support','自分をため状態にし、次の攻撃を大幅に強化。',{charge:.70,buffs:{atk:2,mag:2},turns:2});
  addSkill('rainbow','r_origin_splinter','三相の分身',22,'self','support','分身を作り、一定確率で敵の攻撃を無効化。',{clone:3,barrier:.12});
  addSkill('white','w_terios_spring_rain','春雨の連祷',24,'allAllies','heal','味方全体を回復し、継続回復・状態回復・障壁。',{heal:.28,regen:4,cleanse:true,barrier:.16});
  addSkill('white','w_terios_lightspear','百花の光槍',22,'allEnemies','magic','敵全体を2回攻撃し、味方全体のHPを少し回復。',{power:1.05,allHits:2,heal:.10});
  addSkill('white','w_terios_turn','新生の追風',20,'allAllies','support','味方全体を強化し、次の行動回数を増やす。',{buffs:{atk:1,def:1,mag:1,agi:1},turns:3,extraActions:1});
  addSkill('black','b_terios_blacklot','黒蓮・乱葬',27,'enemy','special','敵単体へランダム6連撃。弱体中なら威力上昇。',{power:.72,randomHits:6,bonusOnDebuff:.30,execute:true});
  addSkill('black','b_terios_null_cage','無明の檻',24,'allEnemies','support','敵全体に鈍化・拘束・沈黙・侵食を与える。',{debuff:{slow:4,bind:2,silence:2,poison:4}});
  addSkill('black','b_terios_ending_echo','終わりの残響',23,'allEnemies','magic','敵全体を3回攻撃。撃破時は残りへ追撃。',{power:.84,allHits:3,chainOnKill:true});
  [['rainbow','origin',['r_origin_prismatic_storm','r_origin_choice','r_origin_splinter']],['white','terios',['w_terios_spring_rain','w_terios_lightspear','w_terios_turn']],['black','terios',['b_terios_blacklot','b_terios_null_cage','b_terios_ending_echo']]].forEach(([owner,branch,skills])=>skills.forEach((s,i)=>appendSkillPanel(owner,branch,s,D.SKILLS[s].name,5+i)));

  D.VERSION = '0.8';
})();
