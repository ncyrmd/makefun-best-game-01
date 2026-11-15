// The hearth shop — between-night upgrades bought with embers. After the
// keeper picks a boon, the shop opens: four tracks, three levels each, paid
// in embers the keeper gathered. One job: the tracks, their costs, and the
// shop screen's geometry (the renderer draws it, the browser entry clicks
// it, both from the same layout, so the buttons are where they are drawn).
// Pure data and helpers: the world (world.js) owns the purchase.

export const SHOP_MAX_LEVEL = 3;

// A track: what it sells, what each level costs, and what a level does.
// apply(mods, state) mutates the run's modifier table — and, for the Deep
// Well, the hearth itself. Levels are tracked per track in mods.shopLevels.
export const SHOP_TRACKS = [
  {
    id: 'oil',
    name: 'Lantern Oil',
    blurb: 'Lantern light reaches +14 farther.',
    costs: [6, 10, 14],
    apply: (mods) => { mods.auraBonus += 14; },
  },
  {
    id: 'well',
    name: 'Deep Well',
    blurb: 'Max fuel +20, and +20 fuel right now.',
    costs: [6, 10, 14],
    apply: (mods, state) => {
      state.fuelMax += 20;
      state.fuel = Math.min(state.fuelMax, state.fuel + 20);
    },
  },
  {
    id: 'current',
    name: 'Swift Current',
    blurb: 'Dash comes back 20% sooner.',
    costs: [5, 9, 13],
    apply: (mods) => { mods.dashCdMul *= 0.8; },
  },
  {
    id: 'rounds',
    name: 'Ember Rounds',
    blurb: 'Flare hits tough wisps +1 harder and +20 wider.',
    costs: [6, 10, 14],
    apply: (mods) => { mods.shopRounds += 1; mods.flareRadiusBonus += 20; },
  },
];

// The shop screen's geometry on the 960x600 field. Rows are laid out top to
// bottom in track order; the begin button sits below them.
export const SHOP_LAYOUT = {
  panel: { x: 80, y: 64, w: 800, h: 472 },
  rows: { x: 110, y: 168, w: 740, h: 62, gap: 12 },
  begin: { x: 330, y: 490, w: 300, h: 42 },
};

export function shopLevel(mods, id) {
  return (mods && mods.shopLevels && mods.shopLevels[id]) || 0;
}

// The ember price of the next level of a track, or null when it is maxed.
export function shopCost(mods, id) {
  const track = SHOP_TRACKS.find((t) => t.id === id);
  if (!track) return null;
  const level = shopLevel(mods, id);
  if (level >= SHOP_MAX_LEVEL) return null;
  return track.costs[level];
}

export function shopTrack(id) {
  return SHOP_TRACKS.find((t) => t.id === id) || null;
}

// Which shop row (0-3) a click at (x, y) lands on, or -1 when it hits none.
export function shopRowAt(x, y) {
  const r = SHOP_LAYOUT.rows;
  for (let i = 0; i < SHOP_TRACKS.length; i++) {
    const ry = r.y + i * (r.h + r.gap);
    if (x >= r.x && x <= r.x + r.w && y >= ry && y <= ry + r.h) return i;
  }
  return -1;
}

// Does a click at (x, y) land on the "begin night" button?
export function shopBeginAt(x, y) {
  const b = SHOP_LAYOUT.begin;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
