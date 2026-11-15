// Emberkeeper v2 — every tunable for the game lives here, one job per table.
// Field, hearth, nights, wisp kinds, player, flare, embers, combo, braziers,
// golden wisps, night modifiers and the boon pool.
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const HEARTH = { x: 480, y: 310, radius: 46 };
export const NIGHTS = 8;

export const HEARTH_FUEL = {
  max: 100,
  drainPerSecond: 1.0,
  nightStartBonus: 25,
  emberFuel: 3,
};

export const PLAYER = {
  radius: 14,
  speed: 245,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 1.6,
  auraRadius: 112,
  auraTick: 0.8,
  auraSlow: 0.55,
};

export const FLARE = {
  cost: 3,
  radius: 150,
  cooldown: 1.2,
  bruteDamage: 2,
};

export const COMBO = { window: 3, max: 5 };

export const EMBER = {
  dropChance: 0.6,
  shardRadius: 7,
  magnetRadius: 90,
  magnetSpeed: 320,
  lifeSeconds: 14,
};

// A wisp kind: hp, speed (px/s), radius, score, fuel stolen on a hearth hit,
// and the first night it can appear in.
export const WISP_KINDS = {
  wisp: { hp: 1, speed: 34, radius: 12, score: 10, fuelHit: 6, fromNight: 1 },
  dart: { hp: 1, speed: 82, radius: 9, score: 20, fuelHit: 8, fromNight: 3 },
  splitter: { hp: 2, speed: 27, radius: 16, score: 30, fuelHit: 10, fromNight: 4 },
  brute: { hp: 5, speed: 19, radius: 22, score: 60, fuelHit: 16, fromNight: 6 },
  golden: { hp: 1, speed: 96, radius: 10, score: 50, fuelHit: 0, fromNight: 5 },
};

// Braziers: buildable fire bowls. A keeper spends embers to plant one; it
// burns wisps that drift into its light, then gutters out.
export const BRAZIER = {
  cost: 5,
  maxSlots: 3,
  radius: 74,
  burnTick: 0.9,
  burnDamage: 1,
  fuelSeconds: 42,
  minFromHearth: 120,
  minFromBrazier: 90,
  margin: 36,
};

// Golden wisps: rare, fast, worth a fortune in embers. They flee the keeper.
export const GOLDEN = {
  emberBonus: 10,
  baseChance: 0.05,
  goldenHourChance: 0.16,
  fleeRadius: 130,
  lifeSeconds: 14,
};

// The Gloomlord: a crowned wisp-king that rises on nights 4 and 8. It
// drifts for the hearth, calls minions with a gloom pulse every few seconds,
// and pays a fortune in embers when it falls. Night 8's is the true
// Gloomlord — bigger, tougher, and the last thing between the keeper and
// the dawn.
export const BOSS = {
  nights: [4, 8],
  hp: { 4: 14, 8: 24 },
  radius: { 4: 46, 8: 58 },
  speed: 26,
  score: { 4: 500, 8: 1000 },
  fuelHit: 25,
  emberBounty: 15,
  pulseInterval: 6,
  pulseSpawn: 2,
  normalMul: 0.8,
};

// The boss's numbers for a night, as a wisp definition.
export function bossDefForNight(night) {
  const hp = BOSS.hp[night] || BOSS.hp[4];
  const radius = BOSS.radius[night] || BOSS.radius[4];
  const score = BOSS.score[night] || BOSS.score[4];
  return { hp, speed: BOSS.speed, radius, score, fuelHit: BOSS.fuelHit, fromNight: 4 };
}

export function isBossNight(night) {
  return BOSS.nights.includes(night);
}

export function bossName(night) {
  return night >= 8 ? 'THE GLOOMLORD' : "THE GLOOMLORD'S HERALD";
}

// One twist per night from night 2 on. The twist is named on the night banner
// and in the HUD, so the player always knows what changed.
export const MODIFIERS = [
  { id: 'none', name: '', blurb: '' },
  {
    id: 'ember-rain', name: 'Ember Rain', blurb: 'Embers feed +1 fuel each.',
    speedMul: 1, countMul: 1, dropMul: 1, auraTickMul: 1, shardFuelBonus: 1, golden: false,
  },
  {
    id: 'swift-gloom', name: 'Swift Gloom', blurb: 'Wisps drift 18% faster tonight.',
    speedMul: 1.18, countMul: 1, dropMul: 1, auraTickMul: 1, shardFuelBonus: 0, golden: false,
  },
  {
    id: 'thick-gloom', name: 'Thick Gloom', blurb: 'A quarter more wisps crawl in.',
    speedMul: 1, countMul: 1.25, dropMul: 1, auraTickMul: 1, shardFuelBonus: 0, golden: false,
  },
  {
    id: 'golden-hour', name: 'Golden Hour', blurb: 'Golden wisps haunt the trees tonight.',
    speedMul: 1, countMul: 1, dropMul: 1, auraTickMul: 1, shardFuelBonus: 0, golden: true,
  },
  {
    id: 'iron-gloom', name: 'Iron Gloom', blurb: 'Wisps take longer to burn in the light.',
    speedMul: 1, countMul: 1, dropMul: 1, auraTickMul: 1.25, shardFuelBonus: 0, golden: false,
  },
  {
    id: 'ember-drought', name: 'Ember Drought', blurb: 'Wisps drop embers 15% less often.',
    speedMul: 1, countMul: 1, dropMul: 0.85, auraTickMul: 1, shardFuelBonus: 0, golden: false,
  },
  {
    id: 'longest-night', name: 'The Longest Night', blurb: 'The gloom throws everything it has.',
    speedMul: 1.1, countMul: 1.4, dropMul: 1, auraTickMul: 1, shardFuelBonus: 0, golden: true,
  },
];

// Which twist a night carries. Night 1 is always a quiet first night.
export function modifierForNight(night) {
  if (night <= 1 || night > NIGHTS) return MODIFIERS[0];
  return MODIFIERS[night - 1];
}

// How many wisps a night sends, how fast they arrive, and in what mix.
// Braziers make the keeper stronger, so later nights send a few more wisps
// than v1 did to keep the pressure on.
export function nightPlan(night) {
  const total = Math.round((14 + night * 3) * (night >= 3 ? 1.1 : 1));
  const interval = Math.max(0.85, 1.39 - (night - 1) * 0.08);
  const weights = { wisp: 10 };
  if (night >= 3) weights.dart = 3 + night;
  if (night >= 4) weights.splitter = 2 + night;
  if (night >= 6) weights.brute = 1 + Math.floor(night / 2);
  return { total, interval, weights };
}

// Boons: one is offered after every cleared night; the player picks one of
// three. apply(mods) mutates the run's modifier table (see world.js).
export const BOONS = [
  {
    id: 'wide', name: 'Wide Lantern',
    blurb: 'Lantern light reaches +28 farther.',
    apply: (m) => { m.auraBonus += 28; },
  },
  {
    id: 'swift', name: 'Swift Boots',
    blurb: 'Walk 15% faster.',
    apply: (m) => { m.speedMul *= 1.15; },
  },
  {
    id: 'dash', name: 'Quick Dash',
    blurb: 'Dash comes back 30% sooner.',
    apply: (m) => { m.dashCdMul *= 0.7; },
  },
  {
    id: 'heart', name: 'Ember Heart',
    blurb: 'Embers feed the hearth +2 fuel each.',
    apply: (m) => { m.emberFuelBonus += 2; },
  },
  {
    id: 'flare', name: 'Bright Flare',
    blurb: 'Flare is +55 wider and costs 1 less.',
    apply: (m) => { m.flareRadiusBonus += 55; m.flareCostDelta -= 1; },
  },
  {
    id: 'sturdy', name: 'Sturdy Hearth',
    blurb: 'Max fuel +30, and +30 fuel now.',
    apply: (m) => { m.fuelMaxBonus += 30; },
  },
  {
    id: 'thorn', name: 'Thorn Light',
    blurb: 'Lantern light burns wisps twice as fast.',
    apply: (m) => { m.auraTickMul *= 0.5; },
  },
  {
    id: 'lucky', name: 'Lucky Embers',
    blurb: 'Wisps drop embers 25% more often.',
    apply: (m) => { m.dropBonus += 0.25; },
  },
  {
    id: 'brazier', name: 'Brazier Craft',
    blurb: 'Carry one more brazier, and each costs 1 ember less.',
    apply: (m) => { m.brazierSlots += 1; m.brazierCostDelta -= 1; },
  },
  {
    id: 'golden', name: 'Golden Touch',
    blurb: 'Golden wisps appear from night 3 and pay +5 embers.',
    apply: (m) => { m.goldenBonus += 5; m.goldenFromNight = 3; },
  },
  {
    id: 'magnet', name: 'Ember Magnet',
    blurb: 'Shards fly to you from +60 farther away.',
    apply: (m) => { m.magnetBonus += 60; },
  },
];

export const BEST_KEY = 'emberkeeper-best';
