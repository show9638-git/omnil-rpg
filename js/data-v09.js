/* 全零〈オムニル〉 v0.9 — 長期周回・装備特性・経済／戦闘再調整 */
(() => {
  'use strict';
  const D = window.OMNIL_DATA;
  if (!D) return;

  // 冒険者レベル：序盤は丁寧に、中後半は必要経験が大きく伸びる長期成長曲線。
  D.RANKS = Array.from({ length: 100 }, (_, index) => {
    const level = index + 1;
    const n = level - 1;
    return {
      id: String(level),
      level,
      name: `Lv.${level}`,
      threshold: Math.floor(n * 280 + n * n * 50),
      maxStamina: 100 + n * 50,
      description: level < 10 ? '近隣の依頼を任される冒険者。' : level < 30 ? '複数の地方から頼られる実力者。' : level < 60 ? '危険地方の調査を任される熟練者。' : level < 90 ? '世界の均衡に触れる英雄級の冒険者。' : '世界の根源へ踏み出す最高位の冒険者。',
    };
  });

  // 繰り返し依頼は周回の補助に留め、冒険者Lvを急速に上げない。
  Object.values(D.QUESTS || {}).forEach((quest) => {
    if (!quest.repeatable || !quest.reward) return;
    quest.reward.advExp = Math.max(2, Math.floor((quest.reward.advExp || 0) * 0.28));
    quest.reward.gold = Math.max(1, Math.floor((quest.reward.gold || 0) * 0.92));
  });

  // 敵：長めの戦闘を前提にHPを強化。後半ほど攻防も上昇する。
  Object.values(D.ENEMIES || {}).forEach((enemy) => {
    const late = 1 + Math.min(0.46, Number(enemy.level || 1) * 0.0056);
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * 2.15 * late));
    enemy.atk = Math.max(1, Math.round(enemy.atk * 1.20 * late));
    enemy.mag = Math.max(1, Math.round(enemy.mag * 1.20 * late));
    enemy.def = Math.max(1, Math.round(enemy.def * (1.06 + Math.min(0.25, Number(enemy.level || 1) * 0.003))));
    enemy.exp = Math.max(1, Math.round(enemy.exp * Math.max(0.16, 0.26 - Number(enemy.level || 1) * 0.0007)));
    enemy.gold = Math.max(1, Math.round(enemy.gold * (1.05 + Math.min(0.35, Number(enemy.level || 1) * 0.004))));
    if (enemy.boss) {
      enemy.maxHp = Math.round(enemy.maxHp * 1.18);
      enemy.atk = Math.round(enemy.atk * 1.08);
      enemy.mag = Math.round(enemy.mag * 1.08);
      enemy.exp = Math.round(enemy.exp * 1.25);
    }
  });

  // 装備経済と特殊効果。既存全装備に役割を与え、選択理由を強くする。
  const slots = ['head','body','arms','legs','rightHand','leftHand','accessory'];
  const statLabel = { maxHp:'HP', maxMp:'MP', atk:'攻撃', def:'防御', mag:'魔力', agi:'敏捷', luck:'幸運' };
  const specialText = (special) => Object.entries(special || {}).map(([key, value]) => {
    const v = Math.round(Number(value || 0) * 100);
    const labels = {
      damageCut:'被ダメージ', damageRate:'与ダメージ', physicalRate:'物理技威力', magicRate:'魔法技威力',
      criticalRate:'会心率', criticalDamage:'会心威力', bossDamage:'ボス与ダメージ', debuffDamage:'弱体敵与ダメージ',
      lowHpDamage:'瀕死時与ダメージ', healRate:'回復技効果', barrierRate:'障壁効果', mpCostRate:'MP消費',
      itemHealRate:'道具回復', statusResist:'状態異常耐性', barrierStart:'戦闘開始障壁', guardPower:'かばう軽減',
      expRate:'戦闘経験', goldRate:'獲得G', masteryRate:'習熟度', rareFind:'希少発見', postBattleHeal:'戦闘後回復', staminaDiscount:'探索消費軽減', allRound:'全効果', pierceRate:'防御貫通',
    };
    if (!labels[key]) return '';
    const sign = key === 'mpCostRate' ? '' : '+';
    return `${labels[key]}${sign}${v}%`;
  }).filter(Boolean).join('／');
  const cycles = {
    head: [ {statusResist:.05}, {mpCostRate:-.05}, {criticalRate:.04}, {barrierStart:.06} ],
    body: [ {damageCut:.05}, {barrierRate:.06}, {postBattleHeal:.03}, {statusResist:.08} ],
    arms: [ {physicalRate:.06}, {magicRate:.06}, {criticalDamage:.10}, {debuffDamage:.07} ],
    legs: [ {rareFind:.025}, {goldRate:.06}, {expRate:.04}, {staminaDiscount:.04} ],
    rightHand: [ {damageRate:.08}, {physicalRate:.10}, {magicRate:.10}, {bossDamage:.09}, {criticalRate:.06} ],
    leftHand: [ {damageCut:.07}, {barrierStart:.10}, {guardPower:.10}, {barrierRate:.08} ],
    accessory: [ {masteryRate:.12}, {healRate:.10}, {itemHealRate:.14}, {rareFind:.05}, {lowHpDamage:.10}, {debuffDamage:.10} ],
  };
  Object.values(D.EQUIPMENT_DEFS || {}).forEach((equip, index) => {
    const level = Number(equip.minLevel || 1);
    const priceBase = Number(equip.price || (160 + level * 65 + index * 11));
    equip.price = Math.max(220, Math.round(priceBase * (3.1 + Math.min(2.7, level * 0.032))));
    equip.stats ||= {};
    Object.entries(equip.stats).forEach(([key, value]) => {
      const multiplier = 1.24 + Math.min(.42, level * .008);
      equip.stats[key] = Math.max(1, Math.round(Number(value) * multiplier));
    });
    const bucket = equip.slot === 'accessory' ? 'accessory' : (slots.includes(equip.slot) ? equip.slot : 'accessory');
    const template = cycles[bucket][index % cycles[bucket].length];
    equip.special = { ...(equip.special || {}) };
    Object.entries(template).forEach(([key, value]) => {
      const boosted = value * (1 + Math.min(.75, level * .018));
      equip.special[key] = Math.max(Number(equip.special[key] || 0), Number(boosted.toFixed(4)));
    });
    // 中盤以降の装備は「能力値＋二種類以上の役割」を持つ。単なる上位互換ではなく、構成差を生む。
    if (level >= 12) {
      const secondary = {
        head: index % 2 ? { barrierStart:.045, statusResist:.035 } : { mpCostRate:-.035, criticalRate:.025 },
        body: index % 2 ? { damageCut:.035, postBattleHeal:.02 } : { barrierRate:.045, statusResist:.03 },
        arms: index % 2 ? { physicalRate:.045, criticalDamage:.07 } : { magicRate:.045, debuffDamage:.055 },
        legs: index % 2 ? { staminaDiscount:.025, rareFind:.018 } : { goldRate:.045, expRate:.025 },
        rightHand: index % 2 ? { damageRate:.055, pierceRate:.05 } : { bossDamage:.06, criticalRate:.035 },
        leftHand: index % 2 ? { damageCut:.045, guardPower:.06 } : { barrierStart:.065, barrierRate:.05 },
        accessory: index % 2 ? { itemHealRate:.10, healRate:.06 } : { masteryRate:.09, lowHpDamage:.075 },
      }[bucket] || {};
      Object.entries(secondary).forEach(([key, value]) => { equip.special[key] = Math.max(Number(equip.special[key] || 0), Number((value * (1 + Math.min(.65, level*.012))).toFixed(4))); });
    }
    if (level >= 45 && ['rightHand','accessory'].includes(bucket)) {
      equip.special.allRound = Math.max(Number(equip.special.allRound || 0), Number((.025 + Math.min(.055, level*.0007)).toFixed(4)));
    }
    // 手種別の個性をさらに強調。
    if (equip.handType === 'twoHand') {
      equip.special.damageRate = Math.max(equip.special.damageRate || 0, .10 + Math.min(.14, level * .004));
      equip.special.bossDamage = Math.max(equip.special.bossDamage || 0, .06 + Math.min(.10, level * .003));
    }
    if (equip.handType === 'twoHandShield') {
      equip.special.damageCut = Math.max(equip.special.damageCut || 0, .10 + Math.min(.14, level * .003));
      equip.special.barrierStart = Math.max(equip.special.barrierStart || 0, .10 + Math.min(.12, level * .003));
    }
    if (equip.handType === 'shield') {
      equip.special.guardPower = Math.max(equip.special.guardPower || 0, .10 + Math.min(.10, level * .002));
    }
    const prior = equip.specialText ? `${equip.specialText}／` : '';
    equip.specialText = `${prior}${specialText(equip.special)}`.replace(/^／|／$/g,'');
    equip.description = `${equip.description || ''}${equip.description ? '　' : ''}特殊：${equip.specialText || 'なし'}`;
  });

  D.V09_TUNING = {
    version: 9,
    characterExpRate: 1,
    repeatAdvExpRate: .28,
    enemyHpBaseline: 2.15,
  };
})();
