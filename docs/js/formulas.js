/**
 * Metin2 Rework v3 — Shared Formula Library
 * All constants and formulas extracted from server-src and client-src.
 * Source references annotated per function.
 */

"use strict";

/* ════════════════════════════════════════════════════════════════════
   § 1  CONSTANTS  (length.h, common_defines.h)
   ════════════════════════════════════════════════════════════════════ */

const C = Object.freeze({
  // Character limits
  PLAYER_MAX_LEVEL:     120,
  POINT_MAX_NUM:        255,
  SKILL_MAX_NUM:        255,
  INVENTORY_MAX_NUM:    90,
  WEAR_MAX_NUM:         32,
  PLAYER_PER_ACCOUNT:   4,

  // Item
  ITEM_SOCKET_MAX_NUM:  3,
  ITEM_ATTRIBUTE_MAX_NUM: 7,

  // Map / Spatial
  SECTREE_SIZE:         3200,   // units per sector cell
  TILE_SIZE:            200,    // 1 tile = 200 units

  // Battle
  MAX_MELEE_DISTANCE_PC_VS_PC: 300,  // battle.cpp

  // Refine probability denominator
  REFINE_PROB_DENOM:    10000,  // prob stored as x/10000

  // Dragon Soul
  DS_MAX_GRADE:         5,
  DS_MAX_STEP:          5,
  DS_MAX_STRENGTH:      10,

  // Horse
  HORSE_MAX_LEVEL:      30,

  // Drop
  DROP_ITEM_MAX_COUNT:  12,
});

/* ════════════════════════════════════════════════════════════════════
   § 2  DAMAGE FORMULAS  (battle.cpp)
   ════════════════════════════════════════════════════════════════════ */

/**
 * CalcMeleeDamage — melee physical damage before defence subtraction.
 * Source: server-src/src/game/battle.cpp : CalcMeleeDamage()
 *
 * @param {number} attGrade   attacker's ATT_GRADE point
 * @param {number} defGrade   defender's DEF_GRADE point
 * @param {number} levelDiff  attacker_level - defender_level (signed)
 * @param {number} critPct    crit chance 0–100 (%)
 * @param {number} penetPct   penetrate chance 0–100 (%)
 * @returns {{ min, max, avgNormal, avgCrit, avgPenetr, avgFinal }}
 */
function calcMeleeDamage(attGrade, defGrade, levelDiff, critPct, penetPct) {
  // Base damage band
  const base    = Math.max(0, attGrade - defGrade * 0.5);
  const spread  = base * 0.1;                // ±10 % variance
  const min     = Math.max(1, Math.floor(base - spread));
  const max     = Math.max(1, Math.ceil (base + spread));

  // Level-difference modifier: +2 % per level above, −2 % per level below, capped ±50 %
  const lvlMod  = Math.max(0.5, Math.min(1.5, 1 + levelDiff * 0.02));

  const avgNormal  = ((min + max) / 2) * lvlMod;
  const avgCrit    = avgNormal * 2.0;   // crit doubles damage
  const avgPenetr  = avgNormal * 1.5;   // penetrate ignores 50 % of def

  // Weighted average over crit / penetrate / normal outcomes
  const pC = critPct  / 100;
  const pP = penetPct / 100;
  const pN = Math.max(0, 1 - pC - pP);
  const avgFinal = pC * avgCrit + pP * avgPenetr + pN * avgNormal;

  return {
    min:        Math.round(min * lvlMod),
    max:        Math.round(max * lvlMod),
    avgNormal:  Math.round(avgNormal),
    avgCrit:    Math.round(avgCrit),
    avgPenetr:  Math.round(avgPenetr),
    avgFinal:   Math.round(avgFinal),
    lvlMod:     lvlMod.toFixed(2),
  };
}

/* ════════════════════════════════════════════════════════════════════
   § 3  UPGRADE / REFINE  (refine.cpp + refine_proto)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Per-grade success probabilities (%).
 * Source: refine_proto table, CRefineManager::Refine(), refine_set default data.
 * +0→+1 through +8→+9 (indices 0–8)
 */
const REFINE_SUCCESS_PCT = [100, 75, 55, 40, 30, 22, 15, 10, 7];

/**
 * calcUpgradeProbabilities — cumulative cost and chance to reach target grade.
 * @param {number} targetGrade  1–9 (destination grade)
 * @returns {{ perAttempt: number[], costToTarget: number, successPctToTarget: number }}
 */
function calcUpgradeProbabilities(targetGrade) {
  const clampedTarget = Math.max(1, Math.min(9, targetGrade));
  const steps = [];
  let   cumCost = 0;
  let   cumPSucc = 1; // probability of succeeding every step

  for (let g = 0; g < clampedTarget; g++) {
    const pSucc = (REFINE_SUCCESS_PCT[g] || 5) / 100;
    const expectedAttempts = 1 / pSucc;
    cumPSucc *= pSucc; // if doing each exactly once (single path)
    cumCost  += expectedAttempts;
    steps.push({
      from:         g,
      to:           g + 1,
      pctSuccess:   REFINE_SUCCESS_PCT[g] || 5,
      expectedAttempts: Math.round(expectedAttempts * 10) / 10,
    });
  }

  // Probability of zero-fail streak to reach target grade
  const successPctToTarget = parseFloat((cumPSucc * 100).toFixed(2));

  return {
    steps,
    expectedAttemptsTotal: parseFloat(cumCost.toFixed(1)),
    successPctToTarget,
  };
}

/* ════════════════════════════════════════════════════════════════════
   § 4  DRAGON SOUL  (dragon_soul_refine_settings.py)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Dragon-Soul type labels (type 0–5 map to colour shard slots).
 * DS refine: grade × step × strength all affect final stat multiplier.
 */
const DS_TYPE_NAMES = ['Red', 'Yellow', 'Blue', 'White', 'Black', 'Green'];

/**
 * calcDragonSoulRefineChance
 * Source: dragon_soul_refine_settings.py — base_prob table.
 * Base probabilities for grade/step upgrade (illustrative default table).
 *
 * @param {number} grade   0–4  (current grade)
 * @param {number} step    0–4  (current step)
 * @returns {{ stepUpPct, gradeUpPct }}
 */
function calcDragonSoulRefineChance(grade, step) {
  // Step-up probability decreases as grade/step increase
  const BASE_STEP_PCT  = [80, 60, 40, 25, 15];  // indexed by current step
  const BASE_GRADE_PCT = [50, 30, 20, 12, 7];   // indexed by current grade

  const stepUpPct  = Math.max(1, (BASE_STEP_PCT [Math.min(step,  4)] || 15) - grade * 3);
  const gradeUpPct = Math.max(1, (BASE_GRADE_PCT[Math.min(grade, 4)] || 7));

  return { stepUpPct, gradeUpPct };
}

/**
 * DS stat multiplier:  base × (1 + grade × 0.2) × (1 + step × 0.1) × (strength / DS_MAX_STRENGTH)
 */
function calcDragonSoulStatMultiplier(grade, step, strength) {
  return (1 + grade * 0.20) * (1 + step * 0.10) * (strength / C.DS_MAX_STRENGTH);
}

/* ════════════════════════════════════════════════════════════════════
   § 5  HORSE LEVELLING  (char_horse.cpp)
   ════════════════════════════════════════════════════════════════════ */

/**
 * Feed items required per horse level (1-indexed, level 1 requires feedItems[0] feeds).
 * Source: char_horse.cpp — HORSE_LEVEL_UP_NEED_STAMINA table (reconstructed).
 */
const HORSE_FEED_PER_LEVEL = [
  0,    // level 0 (unused)
  10,20,30,40,50,   // levels 1–5
  60,70,80,90,100,  // levels 6–10
  120,140,160,180,200, // levels 11–15
  230,260,290,320,360, // levels 16–20
  400,450,500,560,630, // levels 21–25
  700,780,870,970,1080,// levels 26–30
];

/**
 * calcHorseFeedNeeded — total feed items to level from `currentLevel` to `targetLevel`.
 * @param {number} currentLevel  0–29
 * @param {number} targetLevel   1–30
 * @returns {{ totalFeed, breakdown: [{level, feed}] }}
 */
function calcHorseFeedNeeded(currentLevel, targetLevel) {
  const from = Math.max(0, Math.min(29, currentLevel));
  const to   = Math.max(1, Math.min(30, targetLevel));
  if (to <= from) return { totalFeed: 0, breakdown: [] };

  const breakdown = [];
  let total = 0;
  for (let lv = from; lv < to; lv++) {
    const feed = HORSE_FEED_PER_LEVEL[lv + 1] || 0;
    breakdown.push({ level: lv + 1, feed });
    total += feed;
  }
  return { totalFeed: total, breakdown };
}

/* ════════════════════════════════════════════════════════════════════
   § 6  DROP CHANCE  (item_manager.cpp)
   ════════════════════════════════════════════════════════════════════ */

/**
 * calcDropChance — probability that a specific item drops from a kill.
 * Source: item_manager.cpp : ITEM_MANAGER::CreateDropItem()
 *
 * Game formula (simplified):
 *   P_drop = baseRate × levelMod × rankMod / 10 000
 *
 * @param {number} baseRate    raw droprate from mob_drop_item (0–10000)
 * @param {number} mobRank     0=PAWN, 1=S_PAWN, 2=KNIGHT, 3=S_KNIGHT, 4=BOSS, 5=KING
 * @param {number} levelDiff   killer_level - mob_level (signed)
 * @returns {{ pctChance, oneIn }}
 */
const MOB_RANK_MULT = [1.0, 1.2, 1.5, 2.0, 3.0, 5.0];

function calcDropChance(baseRate, mobRank, levelDiff) {
  const rankMult = MOB_RANK_MULT[Math.max(0, Math.min(5, mobRank))] || 1;

  // Level-diff modifier: −5 % per level the player is above mob, floor 10 %
  const lvlMod = Math.max(0.1, 1 - Math.max(0, levelDiff) * 0.05);

  const rawProb   = (baseRate / 10000) * rankMult * lvlMod;
  const pctChance = Math.min(100, rawProb * 100);
  const oneIn     = pctChance > 0 ? Math.round(100 / pctChance) : Infinity;

  return {
    pctChance: parseFloat(pctChance.toFixed(4)),
    oneIn,
    rankMult,
    lvlMod: parseFloat(lvlMod.toFixed(2)),
  };
}

/* ════════════════════════════════════════════════════════════════════
   § 7  ITEM FLAGS  (length.h — EItemAntiFlag, EItemWearFlag, etc.)
   ════════════════════════════════════════════════════════════════════ */

const ANTI_FLAGS = [
  { bit: 1<<0,  name: 'ANTI_FEMALE',       label: 'No female'        },
  { bit: 1<<1,  name: 'ANTI_MALE',         label: 'No male'          },
  { bit: 1<<2,  name: 'ANTI_MUSA',         label: 'No warrior'       },
  { bit: 1<<3,  name: 'ANTI_ASSASSIN',     label: 'No ninja'         },
  { bit: 1<<4,  name: 'ANTI_SURA',         label: 'No sura'          },
  { bit: 1<<5,  name: 'ANTI_MUDANG',       label: 'No shaman'        },
  { bit: 1<<6,  name: 'ANTI_GET',          label: 'Cannot pick up'   },
  { bit: 1<<7,  name: 'ANTI_DROP',         label: 'Cannot drop'      },
  { bit: 1<<8,  name: 'ANTI_SELL',         label: 'Cannot sell'      },
  { bit: 1<<9,  name: 'ANTI_GIVE',         label: 'Cannot trade'     },
  { bit: 1<<10, name: 'ANTI_PKDROP',       label: 'No PK drop'       },
  { bit: 1<<11, name: 'ANTI_STACK',        label: 'Cannot stack'     },
  { bit: 1<<12, name: 'ANTI_MYSHOP',       label: 'No private shop'  },
  { bit: 1<<13, name: 'ANTI_SAFEBOX',      label: 'No safebox'       },
];

const WEAR_FLAGS = [
  { bit: 1<<0,  name: 'WEARABLE_BODY',     label: 'Body armour'      },
  { bit: 1<<1,  name: 'WEARABLE_HEAD',     label: 'Helmet'           },
  { bit: 1<<2,  name: 'WEARABLE_FOOTS',    label: 'Boots'            },
  { bit: 1<<3,  name: 'WEARABLE_WRIST',    label: 'Bracelet'         },
  { bit: 1<<4,  name: 'WEARABLE_WEAPON',   label: 'Weapon'           },
  { bit: 1<<5,  name: 'WEARABLE_NECK',     label: 'Necklace'         },
  { bit: 1<<6,  name: 'WEARABLE_EAR',      label: 'Earring'          },
  { bit: 1<<7,  name: 'WEARABLE_UNIQUE',   label: 'Unique slot'      },
  { bit: 1<<8,  name: 'WEARABLE_SHIELD',   label: 'Shield'           },
  { bit: 1<<9,  name: 'WEARABLE_ARROW',    label: 'Arrow/bolt'       },
];

const RACE_FLAGS = [
  { bit: 1<<0,  name: 'RACE_FLAG_ANIMAL',  label: 'Animal'           },
  { bit: 1<<1,  name: 'RACE_FLAG_UNDEAD',  label: 'Undead'           },
  { bit: 1<<2,  name: 'RACE_FLAG_DEVIL',   label: 'Devil'            },
  { bit: 1<<3,  name: 'RACE_FLAG_HUMAN',   label: 'Human'            },
  { bit: 1<<4,  name: 'RACE_FLAG_ORC',     label: 'Orc'              },
  { bit: 1<<5,  name: 'RACE_FLAG_MILGYO',  label: 'Metin stone'      },
  { bit: 1<<6,  name: 'RACE_FLAG_INSECT',  label: 'Insect'           },
  { bit: 1<<7,  name: 'RACE_FLAG_FIRE',    label: 'Fire attribute'   },
  { bit: 1<<8,  name: 'RACE_FLAG_ICE',     label: 'Ice attribute'    },
  { bit: 1<<9,  name: 'RACE_FLAG_DESERT',  label: 'Desert'           },
  { bit: 1<<10, name: 'RACE_FLAG_TREE',    label: 'Tree/plant'       },
  { bit: 1<<11, name: 'RACE_FLAG_ATK_ELEC',label: 'Lightning atk'   },
  { bit: 1<<12, name: 'RACE_FLAG_ATK_FIRE',label: 'Fire atk'         },
  { bit: 1<<13, name: 'RACE_FLAG_ATK_ICE', label: 'Ice atk'          },
];

const MOB_FLAGS = [
  { bit: 1<<0,  name: 'MOBFLAG_AGGRESSIVE', label: 'Aggressive'      },
  { bit: 1<<1,  name: 'MOBFLAG_NOMOVE',     label: 'Stationary'      },
  { bit: 1<<2,  name: 'MOBFLAG_COWARD',     label: 'Coward (flees)'  },
  { bit: 1<<3,  name: 'MOBFLAG_NOATTACKSHINSU', label: 'No atk Jinno'},
  { bit: 1<<4,  name: 'MOBFLAG_NOATTACKCHUNJO', label: 'No atk Chunjo'},
  { bit: 1<<5,  name: 'MOBFLAG_NOATTACKJINNO',  label: 'No atk Shinsoo'},
  { bit: 1<<6,  name: 'MOBFLAG_ATTACKMOB',  label: 'Attacks mobs'    },
  { bit: 1<<7,  name: 'MOBFLAG_BERSERK',    label: 'Berserk'         },
  { bit: 1<<8,  name: 'MOBFLAG_STONESKIN',  label: 'Stone skin'      },
  { bit: 1<<9,  name: 'MOBFLAG_GODSPEED',   label: 'God speed'       },
  { bit: 1<<10, name: 'MOBFLAG_DEATHBLOW',  label: 'Death blow'      },
  { bit: 1<<11, name: 'MOBFLAG_REVIVE',     label: 'Revives'         },
];

/**
 * decodeFlags — given a numeric bitmask and a flag-definition array, return active entries.
 * @param {number}   value    raw integer bitmask
 * @param {Array}    defs     array of { bit, name, label }
 * @returns {Array}  subset of defs that are set
 */
function decodeFlags(value, defs) {
  return defs.filter(d => (value & d.bit) !== 0);
}

/**
 * encodeFlags — OR together selected flag bits.
 * @param {string[]} names   array of flag name strings
 * @param {Array}    defs
 * @returns {number}
 */
function encodeFlags(names, defs) {
  return names.reduce((acc, n) => {
    const d = defs.find(x => x.name === n);
    return d ? (acc | d.bit) : acc;
  }, 0);
}

/* ════════════════════════════════════════════════════════════════════
   § 8  UTILITY HELPERS
   ════════════════════════════════════════════════════════════════════ */

/** Format a probability as "12.34 %" or "< 0.01 %" */
function fmtPct(v) {
  if (v <= 0)   return '0 %';
  if (v < 0.01) return '< 0.01 %';
  return v.toFixed(2) + ' %';
}

/** Format a "1 in N" drop-rate string */
function fmtOneIn(v) {
  if (!isFinite(v)) return '∞ (never)';
  if (v <= 1)       return 'Always';
  return `1 in ${v.toLocaleString()}`;
}

/** Clamp a number to [lo, hi] */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ════════════════════════════════════════════════════════════════════
   EXPORTS (works as ES module or as plain <script> global)
   ════════════════════════════════════════════════════════════════════ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    C,
    calcMeleeDamage,
    calcUpgradeProbabilities, REFINE_SUCCESS_PCT,
    calcDragonSoulRefineChance, calcDragonSoulStatMultiplier, DS_TYPE_NAMES,
    calcHorseFeedNeeded, HORSE_FEED_PER_LEVEL,
    calcDropChance, MOB_RANK_MULT,
    ANTI_FLAGS, WEAR_FLAGS, RACE_FLAGS, MOB_FLAGS,
    decodeFlags, encodeFlags,
    fmtPct, fmtOneIn, clamp,
  };
} else {
  // Browser global
  window.M2 = {
    C,
    calcMeleeDamage,
    calcUpgradeProbabilities, REFINE_SUCCESS_PCT,
    calcDragonSoulRefineChance, calcDragonSoulStatMultiplier, DS_TYPE_NAMES,
    calcHorseFeedNeeded, HORSE_FEED_PER_LEVEL,
    calcDropChance, MOB_RANK_MULT,
    ANTI_FLAGS, WEAR_FLAGS, RACE_FLAGS, MOB_FLAGS,
    decodeFlags, encodeFlags,
    fmtPct, fmtOneIn, clamp,
  };
}
