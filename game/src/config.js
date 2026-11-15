// Emberkeeper — every tunable number of the game in one place, so the balance
// of a night can be read (and retuned) without touching the rules.
export const FIELD = { width: 960, height: 600 };
export const HEARTH = { x: 480, y: 310, radius: 46 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberkeeper.best';
export const NIGHTS = 8;

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

export const FLARE = { cost: 3, radius: 150, cooldown: 1.2, bruteDamage: 2 };

export const HEARTH_FUEL = {
  max: 100,
  drainPerSecond: 1.0,
  nightStartBonus: 25,
  emberFuel: 3,
};

export const COMBO = { window: 3, max: 5 };

// Wisp kinds: hp, speed (px/s), radius, score, fuel lost when one reaches the hearth,
// and the first night it may spawn.
export const WISP_KINDS = {
  wisp: { hp: 1, speed: 34, radius: 12, score: 10, fuelHit: 6, fromNight: 1 },
  dart: { hp: 1, speed: 82, radius: 9, score: 20, fuelHit: 8, fromNight: 3 },
  splitter: { hp: 2, speed: 27, radius: 16, score: 30, fuelHit: 10, fromNight: 4 },
  brute: { hp: 5, speed: 19, radius: 22, score: 60, fuelHit: 16, fromNight: 6 },
};

// How a night is built: total wisps, how fast they arrive, and the mix weights.
export function nightPlan(night) {
  const total = 10 + night * 6;
  const interval = Math.max(0.55, 1.5 - night * 0.11);
  const weights = { wisp: 10 };
  if (night >= 3) weights.dart = 2 + night;
  if (night >= 4) weights.splitter = 1 + night;
  if (night >= 6) weights.brute = Math.max(1, night - 4);
  return { total, interval, weights };
}

export const EMBER = {
  dropChance: 0.6,
  shardRadius: 7,
  magnetRadius: 90,
  magnetSpeed: 320,
  lifeSeconds: 14,
};

// Boons offered between nights. `id` is the key the world applies; `blurb` is the
// card text the player reads before choosing.
export const BOONS = [
  { id: 'wide', name: 'Wide Lantern', blurb: 'Lantern light reaches +28 farther.' },
  { id: 'swift', name: 'Swift Boots', blurb: 'Move 15% faster.' },
  { id: 'dash', name: 'Quick Dash', blurb: 'Dash recharges 35% sooner.' },
  { id: 'heart', name: 'Ember Heart', blurb: 'Embers feed the hearth +2 fuel each.' },
  { id: 'flare', name: 'Bright Flare', blurb: 'Flare is +55 wider and costs 1 less.' },
  { id: 'sturdy', name: 'Sturdy Hearth', blurb: 'Max fuel +30, and +30 fuel now.' },
  { id: 'thorn', name: 'Thorn Light', blurb: 'Lantern light burns wisps twice as fast.' },
  { id: 'lucky', name: 'Lucky Embers', blurb: 'Wisps drop embers 25% more often.' },
];
