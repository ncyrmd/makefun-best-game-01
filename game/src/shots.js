// Emberkeeper v3 — screenshot staging and the headless autopilot.
// stageShot(kind, world) arranges a fixed scene for one of the four
// screenshots (start / play / shop / end) and returns { screen, best }.
// autopilot(state, world) plays the game well enough to win headless, so
// balance can be tested without a browser. actionsOf(pilot) turns a pilot
// decision into the step() action bitmask.
import { BOONS, GOLDEN, modifierForNight, nightPlan } from './config.js';
import { EVENT_WIN } from './world.js';

export function stageShot(kind, world) {
  const s = world.state;
  if (kind === 'start') {
    return { screen: 'title', best: s.best || 0 };
  }
  if (kind === 'play') {
    // Night 4, mid-fight with the Gloomlord: the crowned wisp-king stands
    // wounded in the trees with its minions, two braziers burning, a golden
    // wisp in the corner, shards to grab, combo running.
    s.night = 4;
    s.modifier = modifierForNight(4);
    s.plan = nightPlan(4);
    s.toSpawn = 30;
    s.spawned = 25;
    s.score = 420;
    s.fuel = 71;
    s.embers = 18;
    s.combo = 4;
    s.comboTimer = 2;
    s.banner = { text: '', timer: 0 };
    s.player.x = 480;
    s.player.y = 470;
    world.placeBrazier(300, 420);
    world.placeBrazier(660, 200);
    const boss = world.spawnBoss(620, 180);
    boss.hp = 8;
    boss.pulseFlash = 0.4;
    const spots = [
      ['wisp', 300, 180], ['wisp', 620, 140], ['wisp', 760, 330],
      ['wisp', 200, 380], ['wisp', 540, 120], ['dart', 700, 260],
      ['dart', 250, 300], ['splitter', 820, 180], ['splitter', 150, 200],
      ['golden', 830, 430],
    ];
    for (const [k, x, y] of spots) world.spawnWisp(k, x, y);
    s.shards.push(
      { x: 430, y: 380, life: 12, value: 1 },
      { x: 520, y: 400, life: 12, value: 1 },
      { x: 560, y: 470, life: 12, value: 1 },
    );
    return { screen: 'play', best: s.best || 0 };
  }
  if (kind === 'boon') {
    // Night 2 cleared: three boons on the table, including the two new ones.
    s.night = 2;
    s.nightCleared = true;
    s.spawned = s.toSpawn;
    s.score = 240;
    s.fuel = 61;
    s.embers = 9;
    const pick = (id) => BOONS.find((b) => b.id === id);
    const chosen = [pick('brazier'), pick('golden'), pick('wide')];
    s.boonChoices = chosen.map((b) => ({ id: b.id, name: b.name, blurb: b.blurb }));
    return { screen: 'boon', best: s.best || 0, choices: s.boonChoices };
  }
  if (kind === 'shop') {
    // Night 2 cleared and the boon taken: the hearth shop, one Lantern Oil
    // already bought, 24 embers left to spend on the other tracks.
    s.night = 2;
    s.nightCleared = true;
    s.spawned = s.toSpawn;
    s.score = 380;
    s.fuel = 74;
    s.embers = 24;
    s.mods.shopLevels = { oil: 1, well: 0, current: 0, rounds: 0 };
    s.mods.auraBonus = 14;
    return { screen: 'shop', best: s.best || 0 };
  }
  // end: the win screen — a golden dawn after all eight nights.
  s.night = 8;
  s.won = true;
  s.over = true;
  s.score = 4860;
  s.best = Math.max(s.best || 0, 4860);
  s.fuel = 41;
  s.stats.banished = 268;
  s.stats.collected = 191;
  s.stats.brazierPlaced = 6;
  s.stats.goldenBanished = 8;
  s.stats.bosses = 2;
  s.stats.flares = 31;
  s.stats.dashes = 57;
  return { screen: 'win', best: Math.max(s.best || 0, 4860) };
}

export function idlePilot() {
  return { move: { x: 0, y: 0 }, dash: false, flare: false };
}

export function actionsOf(pilot) {
  if (!pilot) return 0;
  let bits = 0;
  if (pilot.dash) bits |= 1;
  if (pilot.flare) bits |= 2;
  return bits;
}

// The autopilot's job: keep the hearth alive. It chases the wisp closest to
// the hearth, grabs nearby shards, flares when a cluster closes in, and
// dashes to cover ground. It does not place braziers or pick boons — the
// test driver does those, because they are the strategic choices.
export function autopilot(state, world) {
  const p = state.player;
  const hx = 480;
  const hy = 310;
  const move = { x: 0, y: 0 };
  let dash = false;
  let flare = false;

  // Urgency: the wisp nearest the hearth is the one that kills the run —
  // unless the Gloomlord stands, in which case it is the caller to answer:
  // every pulse births more wisps, so the boss outranks a lone wisp.
  let threat = null;
  let threatD = Infinity;
  for (const w of state.wisps) {
    const d = Math.hypot(w.x - hx, w.y - hy);
    if (d < threatD) { threatD = d; threat = w; }
  }
  if (state.boss && threatD > 80) {
    threat = state.boss;
    threatD = Math.hypot(state.boss.x - hx, state.boss.y - hy);
  }
  // A shard worth grabbing when nothing is about to hit the hearth.
  let shard = null;
  let shardD = Infinity;
  if (!threat || threatD > 150) {
    for (const s of state.shards) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < shardD) { shardD = d; shard = s; }
    }
  }
  let tx = null;
  let ty = null;
  if (shard && shardD < 220) {
    tx = shard.x; ty = shard.y;
  } else if (threat) {
    // Intercept between the wisp and the hearth.
    tx = (threat.x + hx) / 2;
    ty = (threat.y + hy) / 2;
    // But if the wisp is already in aura range, step onto it to finish it.
    const pd = Math.hypot(threat.x - p.x, threat.y - p.y);
    if (pd < 110) { tx = threat.x; ty = threat.y; }
  }
  if (tx !== null) {
    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    move.x = dx / len;
    move.y = dy / len;
    const dist = Math.hypot(dx, dy);
    if (dist > 190 && p.dashCooldown <= 0) dash = true;
  }
  // Flare when a cluster is on top of the keeper and the purse allows it —
  // or when the Gloomlord itself is in range, since a flare wounds it.
  if (state.embers >= world.flareCost()) {
    let near = 0;
    const fr = 150 + (state.mods ? state.mods.flareRadiusBonus : 0);
    for (const w of state.wisps) {
      if (Math.hypot(w.x - p.x, w.y - p.y) < fr) near += 1;
    }
    if (near >= 3) flare = true;
    if (state.boss && Math.hypot(state.boss.x - p.x, state.boss.y - p.y) < fr) flare = true;
  }
  return { move, dash, flare };
}
