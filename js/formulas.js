/**
 * Metin2 Rework v3 — Shared Formula Library
 * All constants and formulas extracted from server-src and client-src.
 */
"use strict";

const C = Object.freeze({
  PLAYER_MAX_LEVEL: 120, POINT_MAX_NUM: 255, SKILL_MAX_NUM: 255,
  INVENTORY_MAX_NUM: 90, WEAR_MAX_NUM: 32, PLAYER_PER_ACCOUNT: 4,
  ITEM_SOCKET_MAX_NUM: 3, ITEM_ATTRIBUTE_MAX_NUM: 7,
  SECTREE_SIZE: 3200, TILE_SIZE: 200,
  MAX_MELEE_DISTANCE_PC_VS_PC: 300,
  REFINE_PROB_DENOM: 10000,
  DS_MAX_GRADE: 5, DS_MAX_STEP: 5, DS_MAX_STRENGTH: 10,
  HORSE_MAX_LEVEL: 30, DROP_ITEM_MAX_COUNT: 12,
});

// § 2  DAMAGE — battle.cpp : CalcMeleeDamage()
function calcMeleeDamage(attGrade, defGrade, levelDiff, critPct, penetPct) {
  const base   = Math.max(0, attGrade - defGrade * 0.5);
  const spread = base * 0.1;
  const min    = Math.max(1, Math.floor(base - spread));
  const max    = Math.max(1, Math.ceil (base + spread));
  const lvlMod = Math.max(0.5, Math.min(1.5, 1 + levelDiff * 0.02));
  const avgNormal  = ((min + max) / 2) * lvlMod;
  const avgCrit    = avgNormal * 2.0;
  const avgPenetr  = avgNormal * 1.5;
  const pC = critPct  / 100, pP = penetPct / 100;
  const pN = Math.max(0, 1 - pC - pP);
  const avgFinal = pC * avgCrit + pP * avgPenetr + pN * avgNormal;
  return { min: Math.round(min*lvlMod), max: Math.round(max*lvlMod),
    avgNormal: Math.round(avgNormal), avgCrit: Math.round(avgCrit),
    avgPenetr: Math.round(avgPenetr), avgFinal: Math.round(avgFinal),
    lvlMod: lvlMod.toFixed(2) };
}

// § 3  REFINE — refine.cpp
const REFINE_SUCCESS_PCT = [100, 75, 55, 40, 30, 22, 15, 10, 7];
function calcUpgradeProbabilities(targetGrade) {
  const clamped = Math.max(1, Math.min(9, targetGrade));
  const steps = []; let cumCost = 0, cumPSucc = 1;
  for (let g = 0; g < clamped; g++) {
    const pSucc = (REFINE_SUCCESS_PCT[g] || 5) / 100;
    const expectedAttempts = 1 / pSucc;
    cumPSucc *= pSucc; cumCost += expectedAttempts;
    steps.push({ from: g, to: g+1, pctSuccess: REFINE_SUCCESS_PCT[g]||5,
      expectedAttempts: Math.round(expectedAttempts*10)/10 });
  }
  return { steps, expectedAttemptsTotal: parseFloat(cumCost.toFixed(1)),
    successPctToTarget: parseFloat((cumPSucc*100).toFixed(2)) };
}

// § 4  DRAGON SOUL — dragon_soul_refine_settings.py
const DS_TYPE_NAMES = ['Red','Yellow','Blue','White','Black','Green'];
function calcDragonSoulRefineChance(grade, step) {
  const BASE_STEP_PCT  = [80,60,40,25,15];
  const BASE_GRADE_PCT = [50,30,20,12,7];
  const stepUpPct  = Math.max(1, (BASE_STEP_PCT [Math.min(step, 4)]||15) - grade*3);
  const gradeUpPct = Math.max(1, (BASE_GRADE_PCT[Math.min(grade,4)]||7));
  return { stepUpPct, gradeUpPct };
}
function calcDragonSoulStatMultiplier(grade, step, strength) {
  return (1 + grade*0.20) * (1 + step*0.10) * (strength / C.DS_MAX_STRENGTH);
}

// § 5  HORSE — char_horse.cpp
const HORSE_FEED_PER_LEVEL = [
  0, 10,20,30,40,50, 60,70,80,90,100,
  120,140,160,180,200, 230,260,290,320,360,
  400,450,500,560,630, 700,780,870,970,1080,
];
function calcHorseFeedNeeded(currentLevel, targetLevel) {
  const from = Math.max(0, Math.min(29, currentLevel));
  const to   = Math.max(1, Math.min(30, targetLevel));
  if (to <= from) return { totalFeed: 0, breakdown: [] };
  const breakdown = []; let total = 0;
  for (let lv = from; lv < to; lv++) {
    const feed = HORSE_FEED_PER_LEVEL[lv+1]||0;
    breakdown.push({ level: lv+1, feed }); total += feed;
  }
  return { totalFeed: total, breakdown };
}

// § 6  DROP — item_manager.cpp : CreateDropItem()
const MOB_RANK_MULT = [1.0, 1.2, 1.5, 2.0, 3.0, 5.0];
function calcDropChance(baseRate, mobRank, levelDiff) {
  const rankMult = MOB_RANK_MULT[Math.max(0,Math.min(5,mobRank))]||1;
  const lvlMod   = Math.max(0.1, 1 - Math.max(0, levelDiff)*0.05);
  const rawProb  = (baseRate/10000) * rankMult * lvlMod;
  const pctChance = Math.min(100, rawProb*100);
  const oneIn     = pctChance > 0 ? Math.round(100/pctChance) : Infinity;
  return { pctChance: parseFloat(pctChance.toFixed(4)), oneIn,
    rankMult, lvlMod: parseFloat(lvlMod.toFixed(2)) };
}

// § 7  FLAGS — length.h
const ANTI_FLAGS = [
  {bit:1<<0,  name:'ANTI_FEMALE',      label:'No female'},
  {bit:1<<1,  name:'ANTI_MALE',        label:'No male'},
  {bit:1<<2,  name:'ANTI_MUSA',        label:'No warrior'},
  {bit:1<<3,  name:'ANTI_ASSASSIN',    label:'No ninja'},
  {bit:1<<4,  name:'ANTI_SURA',        label:'No sura'},
  {bit:1<<5,  name:'ANTI_MUDANG',      label:'No shaman'},
  {bit:1<<6,  name:'ANTI_GET',         label:'Cannot pick up'},
  {bit:1<<7,  name:'ANTI_DROP',        label:'Cannot drop'},
  {bit:1<<8,  name:'ANTI_SELL',        label:'Cannot sell'},
  {bit:1<<9,  name:'ANTI_GIVE',        label:'Cannot trade'},
  {bit:1<<10, name:'ANTI_PKDROP',      label:'No PK drop'},
  {bit:1<<11, name:'ANTI_STACK',       label:'Cannot stack'},
  {bit:1<<12, name:'ANTI_MYSHOP',      label:'No private shop'},
  {bit:1<<13, name:'ANTI_SAFEBOX',     label:'No safebox'},
];
const WEAR_FLAGS = [
  {bit:1<<0, name:'WEARABLE_BODY',   label:'Body armour'},
  {bit:1<<1, name:'WEARABLE_HEAD',   label:'Helmet'},
  {bit:1<<2, name:'WEARABLE_FOOTS',  label:'Boots'},
  {bit:1<<3, name:'WEARABLE_WRIST',  label:'Bracelet'},
  {bit:1<<4, name:'WEARABLE_WEAPON', label:'Weapon'},
  {bit:1<<5, name:'WEARABLE_NECK',   label:'Necklace'},
  {bit:1<<6, name:'WEARABLE_EAR',    label:'Earring'},
  {bit:1<<7, name:'WEARABLE_UNIQUE', label:'Unique slot'},
  {bit:1<<8, name:'WEARABLE_SHIELD', label:'Shield'},
  {bit:1<<9, name:'WEARABLE_ARROW',  label:'Arrow/bolt'},
];
const RACE_FLAGS = [
  {bit:1<<0,  name:'RACE_FLAG_ANIMAL', label:'Animal'},
  {bit:1<<1,  name:'RACE_FLAG_UNDEAD', label:'Undead'},
  {bit:1<<2,  name:'RACE_FLAG_DEVIL',  label:'Devil'},
  {bit:1<<3,  name:'RACE_FLAG_HUMAN',  label:'Human'},
  {bit:1<<4,  name:'RACE_FLAG_ORC',    label:'Orc'},
  {bit:1<<5,  name:'RACE_FLAG_MILGYO', label:'Metin stone'},
  {bit:1<<6,  name:'RACE_FLAG_INSECT', label:'Insect'},
  {bit:1<<7,  name:'RACE_FLAG_FIRE',   label:'Fire attribute'},
  {bit:1<<8,  name:'RACE_FLAG_ICE',    label:'Ice attribute'},
  {bit:1<<9,  name:'RACE_FLAG_DESERT', label:'Desert'},
  {bit:1<<10, name:'RACE_FLAG_TREE',   label:'Tree/plant'},
  {bit:1<<11, name:'RACE_FLAG_ATK_ELEC',label:'Lightning atk'},
  {bit:1<<12, name:'RACE_FLAG_ATK_FIRE',label:'Fire atk'},
  {bit:1<<13, name:'RACE_FLAG_ATK_ICE', label:'Ice atk'},
];
const MOB_FLAGS = [
  {bit:1<<0,  name:'MOBFLAG_AGGRESSIVE',     label:'Aggressive'},
  {bit:1<<1,  name:'MOBFLAG_NOMOVE',         label:'Stationary'},
  {bit:1<<2,  name:'MOBFLAG_COWARD',         label:'Coward (flees)'},
  {bit:1<<3,  name:'MOBFLAG_NOATTACKSHINSU', label:'No atk Jinno'},
  {bit:1<<4,  name:'MOBFLAG_NOATTACKCHUNJO', label:'No atk Chunjo'},
  {bit:1<<5,  name:'MOBFLAG_NOATTACKJINNO',  label:'No atk Shinsoo'},
  {bit:1<<6,  name:'MOBFLAG_ATTACKMOB',      label:'Attacks mobs'},
  {bit:1<<7,  name:'MOBFLAG_BERSERK',        label:'Berserk'},
  {bit:1<<8,  name:'MOBFLAG_STONESKIN',      label:'Stone skin'},
  {bit:1<<9,  name:'MOBFLAG_GODSPEED',       label:'God speed'},
  {bit:1<<10, name:'MOBFLAG_DEATHBLOW',      label:'Death blow'},
  {bit:1<<11, name:'MOBFLAG_REVIVE',         label:'Revives'},
];

function decodeFlags(value, defs) { return defs.filter(d => (value & d.bit) !== 0); }
function encodeFlags(names, defs) { return names.reduce((a,n) => { const d=defs.find(x=>x.name===n); return d?(a|d.bit):a; }, 0); }
function fmtPct(v) { if (v<=0) return '0 %'; if (v<0.01) return '< 0.01 %'; return v.toFixed(2)+' %'; }
function fmtOneIn(v) { if (!isFinite(v)) return '∞ (never)'; if (v<=1) return 'Always'; return '1 in '+v.toLocaleString(); }
function clamp(v,lo,hi) { return Math.max(lo,Math.min(hi,v)); }

window.M2 = {
  C, calcMeleeDamage,
  calcUpgradeProbabilities, REFINE_SUCCESS_PCT,
  calcDragonSoulRefineChance, calcDragonSoulStatMultiplier, DS_TYPE_NAMES,
  calcHorseFeedNeeded, HORSE_FEED_PER_LEVEL,
  calcDropChance, MOB_RANK_MULT,
  ANTI_FLAGS, WEAR_FLAGS, RACE_FLAGS, MOB_FLAGS,
  decodeFlags, encodeFlags, fmtPct, fmtOneIn, clamp,
};
