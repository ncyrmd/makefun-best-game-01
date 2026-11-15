// Emberkeeper v2 — the rules, and only the rules. No DOM, no canvas, no
// audio: the world runs headless in Node for tests and in the browser for
// play. The keeper guards the last hearth through eight nights of gloom;
// wisps drift in to steal its fuel, the lantern burns them, ember shards
// feed the fire, and now the keeper can also plant braziers — fire bowls
// that guard a patch of ground on their own.
import {
  BOONS, BRAZIER, COMBO, EMBER, FIELD, FLARE, GOLDEN, HEARTH,
  HEARTH_FUEL, NIGHTS, PLAYER, STEP, WISP_KINDS, modifierForNight,
  nightPlan,
} from './config.js';
import { createRandom } from './random.js';
import { canPlaceBrazier, makeBrazier, suggestSpot, updateBraziers } from './braziers.js';
import { goldenChanceFor, nightMultipliers } from './modifiers.js';

export const EVENT_BANISH = 1;
export const EVENT_PICKUP = 2;
export const EVENT_HEARTH_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_NIGHT_CLEAR = 32;
export const EVENT_FLARE = 64;
export const EVENT_DASH = 128;
export const EVENT_BRAZIER = 256;
export const EVENT_GOLDEN = 512;

// Action bits the step() call carries (see input.js for the same table).
export const ACTION_DASH_BIT = 1;
export const ACTION_FLARE_BIT = 2;

function freshMods() {
  return {
    auraBonus: 0, speedMul: 1, dashCdMul: 1, emberFuelBonus: 0,
    flareRadiusBonus: 0, flareCostDelta: 0, fuelMaxBonus: 0,
    auraTickMul: 1, dropBonus: 0,
    brazierSlots: BRAZIER.maxSlots, brazierCostDelta: 0,
    goldenBonus: 0, goldenFromNight: GOLDEN.fromNight || 5, magnetBonus: 0,
  };
}

function freshStats() {
  return {
    banished: 0, collected: 0, flares: 0, dashes: 0,
    brazierPlaced: 0, brazierBurns: 0, goldenBanished: 0,
  };
}

function freshState(seed) {
  const rng = createRandom(seed);
  const plan = nightPlan(1);
  return {
    rng,
    seed,
    best: 0,
    boonChoices: [],
    boonsOwned: [],
    braziers: [],
    combo: 0,
    comboTimer: 0,
    embers: 0,
    fuel: HEARTH_FUEL.max,
    fuelMax: HEARTH_FUEL.max,
    mods: freshMods(),
    modifier: modifierForNight(1),
    mult: nightMultipliers(modifierForNight(1), freshMods()),
    night: 1,
    nightCleared: false,
    over: false,
    particles: [],
    plan,
    player: {
      x: FIELD.width / 2, y: 440, radius: PLAYER.radius,
      dashTime: 0, dashCooldown: 0, dashId: 0,
      facing: { x: 0, y: -1 },
    },
    popups: [],
    score: 0,
    shards: [],
    spawnTimer: 0.8,
    spawned: 0,
    stats: freshStats(),
    time: 0,
    toSpawn: plan.total,
    wisps: [],
    won: false,
    shake: 0,
    banner: { text: '', timer: 0 },
    auraTimer: 0,
    flareCooldown: 0,
    goldenSpawned: 0,
  };
}

function pickKind(state) {
  const night = state.night;
  const goldenChance = goldenChanceFor(night, state.modifier, state.mods);
  if (state.rng.next() < goldenChance) return 'golden';
  const weights = state.plan.weights;
  let total = 0;
  for (const k of Object.keys(weights)) total += weights[k];
  let roll = state.rng.next() * total;
  for (const k of Object.keys(weights)) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return 'wisp';
}

function spawnEdgePoint(state) {
  // Wisps crawl in from the trees: pick a side, then a spot along it.
  const side = state.rng.int(0, 3);
  const m = 24;
  if (side === 0) return { x: state.rng.range(m, FIELD.width - m), y: -20 };
  if (side === 1) return { x: FIELD.width + 20, y: state.rng.range(m, FIELD.height - m) };
  if (side === 2) return { x: state.rng.range(m, FIELD.width - m), y: FIELD.height + 20 };
  return { x: -20, y: state.rng.range(m, FIELD.height - m) };
}

function makeWisp(state, kind, x, y) {
  const def = WISP_KINDS[kind];
  return {
    kind, x, y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, radius: def.radius,
    score: def.score, fuelHit: def.fuelHit,
    wobble: state.rng.range(0, Math.PI * 2),
    wobbleSpeed: state.rng.range(1.2, 2.6),
    auraTimer: state.rng.range(0, PLAYER.auraTick),
    lastDashHit: 0,
    flash: 0,
    life: kind === 'golden' ? GOLDEN.lifeSeconds : 0,
  };
}

function burst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = state.rng.range(0, Math.PI * 2);
    const v = state.rng.range(speed * 0.3, speed);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: state.rng.range(0.3, 0.7), maxLife: 0.7,
      size: state.rng.range(2, 5), color,
    });
  }
  if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
}

function popup(state, x, y, text, color) {
  state.popups.push({ x, y, text, life: 1.1, color: color || '#ffd166' });
  if (state.popups.length > 24) state.popups.shift();
}

function banishWisp(state, wisp, cause) {
  const combo = state.comboTimer > 0 ? Math.min(COMBO.max, state.combo + 1) : 1;
  state.combo = combo;
  state.comboTimer = COMBO.window;
  const gained = wisp.score * combo;
  state.score += gained;
  state.stats.banished += 1;
  popup(state, wisp.x, wisp.y - 14, '+' + gained, wisp.kind === 'golden' ? '#ffd700' : '#ffd166');
  burst(state, wisp.x, wisp.y, wisp.kind === 'golden' ? '#ffd700' : '#9fd8ff', wisp.kind === 'brute' ? 16 : 9, 120);
  if (wisp.kind === 'golden') {
    const bonus = GOLDEN.emberBonus + state.mods.goldenBonus;
    state.embers += bonus;
    state.stats.goldenBanished += 1;
    popup(state, wisp.x, wisp.y + 12, '+' + bonus + ' ◆', '#ffd700');
  } else if (wisp.kind === 'splitter') {
    // A splitter breaks into two frail wisps where it stood.
    for (let i = 0; i < 2; i++) {
      const child = makeWisp(state, 'wisp', wisp.x + (i === 0 ? -14 : 14), wisp.y);
      state.wisps.push(child);
    }
  } else if (state.rng.next() < EMBER.dropChance * state.mult.dropMul) {
    state.shards.push({ x: wisp.x, y: wisp.y, life: EMBER.lifeSeconds, value: 1 });
  }
  if (cause === 'brazier') state.stats.brazierBurns += 1;
}

function removeWisp(state, wisp) {
  const i = state.wisps.indexOf(wisp);
  if (i >= 0) state.wisps.splice(i, 1);
}

function startNight(state, night) {
  state.night = night;
  state.modifier = modifierForNight(night);
  state.mult = nightMultipliers(state.modifier, state.mods);
  state.plan = nightPlan(night);
  state.toSpawn = Math.round(state.plan.total * state.mult.countMul);
  state.spawned = 0;
  state.spawnTimer = state.plan.interval * 0.5;
  state.nightCleared = false;
  state.boonChoices = [];
  state.fuel = Math.min(state.fuelMax, state.fuel + HEARTH_FUEL.nightStartBonus);
  const twist = state.modifier.name ? ' — ' + state.modifier.name : '';
  state.banner = { text: 'NIGHT ' + night + twist, timer: 2.6 };
}

function offerBoons(state) {
  const pool = BOONS.filter((b) => !state.boonsOwned.includes(b.id));
  const picks = [];
  const bag = pool.slice();
  while (picks.length < 3 && bag.length) {
    const i = state.rng.int(0, bag.length - 1);
    picks.push(bag.splice(i, 1)[0]);
  }
  state.boonChoices = picks.map((b) => ({ id: b.id, name: b.name, blurb: b.blurb }));
}

export function createWorldWithSeed(seed) {
  let state = freshState(seed);

  function reset() {
    state = freshState(state.seed);
  }

  function auraRadius() {
    return PLAYER.auraRadius + state.mods.auraBonus;
  }

  function flareCost() {
    return Math.max(1, FLARE.cost + state.mods.flareCostDelta);
  }

  function brazierCost() {
    return Math.max(1, BRAZIER.cost + state.mods.brazierCostDelta);
  }

  function wispsLeft() {
    return (state.toSpawn - state.spawned) + state.wisps.length;
  }

  function placeBrazier(x, y) {
    if (state.embers < brazierCost()) return { ok: false, reason: 'not enough embers' };
    const check = canPlaceBrazier(state.braziers, x, y, state.mods.brazierSlots);
    if (!check.ok) return check;
    state.embers -= brazierCost();
    const b = makeBrazier(x, y);
    b.born = state.time;
    state.braziers.push(b);
    state.stats.brazierPlaced += 1;
    burst(state, x, y, '#ffb347', 12, 90);
    return { ok: true, reason: '' };
  }

  function spawnWisp(kind, x, y) {
    const w = makeWisp(state, kind, x, y);
    state.wisps.push(w);
    return w;
  }

  function applyBoon(id) {
    const boon = BOONS.find((b) => b.id === id);
    if (!boon || state.boonsOwned.includes(id)) return false;
    boon.apply(state.mods);
    state.boonsOwned.push(id);
    if (id === 'sturdy') {
      state.fuelMax += 30;
      state.fuel = Math.min(state.fuelMax, state.fuel + 30);
    }
    state.boonChoices = [];
    state.nightCleared = false;
    if (state.night >= NIGHTS) return true;
    startNight(state, state.night + 1);
    return true;
  }

  function stepAmbient(dt) {
    state.time += dt;
    // A few ember motes drift up from the hearth on the title screen.
    if (state.rng.next() < dt * 6 && state.particles.length < 60) {
      state.particles.push({
        x: HEARTH.x + state.rng.range(-30, 30),
        y: HEARTH.y + state.rng.range(-10, 10),
        vx: state.rng.range(-6, 6), vy: state.rng.range(-26, -10),
        life: state.rng.range(1, 2), maxLife: 2, size: state.rng.range(1.5, 3.5),
        color: '#ffb347',
      });
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function step(dt, dir, actions) {
    const result = { mask: 0, banished: 0, picked: 0, combo: state.combo };
    if (state.over || state.won) return result;
    if (!(dt > 0)) dt = STEP;
    state.time += dt;
    if (state.banner.timer > 0) state.banner.timer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.8);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    const p = state.player;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    if (state.flareCooldown > 0) state.flareCooldown -= dt;

    // --- movement ---
    let mx = dir && typeof dir.x === 'number' ? dir.x : 0;
    let my = dir && typeof dir.y === 'number' ? dir.y : 0;
    const mlen = Math.hypot(mx, my);
    if (mlen > 1) { mx /= mlen; my /= mlen; }
    if (mlen > 0.01) p.facing = { x: mx / Math.max(mlen, 0.001), y: my / Math.max(mlen, 0.001) };
    const dashing = p.dashTime > 0;
    const speed = dashing
      ? PLAYER.dashSpeed
      : PLAYER.speed * state.mods.speedMul;
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + mx * speed * dt));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + my * speed * dt));
    if (dashing) p.dashTime -= dt;

    // --- dash ---
    if ((actions & ACTION_DASH_BIT) && p.dashCooldown <= 0 && p.dashTime <= 0) {
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown * state.mods.dashCdMul;
      p.dashId += 1;
      state.stats.dashes += 1;
      result.mask |= EVENT_DASH;
      burst(state, p.x, p.y, '#cfe8ff', 6, 70);
    }
    // Dash strike: wisps in the keeper's path burn as the dash passes.
    if (p.dashTime > 0) {
      for (const w of state.wisps.slice()) {
        if (w.lastDashHit === p.dashId) continue;
        const d = Math.hypot(w.x - p.x, w.y - p.y);
        if (d < p.radius + w.radius + 12) {
          w.lastDashHit = p.dashId;
          w.hp -= w.kind === 'brute' ? 2 : 99;
          w.flash = 0.25;
          if (w.hp <= 0) {
            banishWisp(state, w, 'dash');
            removeWisp(state, w);
            result.banished += 1;
            result.mask |= EVENT_BANISH;
          }
        }
      }
    }

    // --- flare ---
    if ((actions & ACTION_FLARE_BIT) && state.flareCooldown <= 0 && state.embers >= flareCost()) {
      state.embers -= flareCost();
      state.flareCooldown = FLARE.cooldown;
      state.stats.flares += 1;
      result.mask |= EVENT_FLARE;
      burst(state, p.x, p.y, '#ffe9a8', 18, 200);
      const radius = FLARE.radius + state.mods.flareRadiusBonus;
      for (const w of state.wisps.slice()) {
        const d = Math.hypot(w.x - p.x, w.y - p.y);
        if (d < radius + w.radius) {
          w.hp -= w.kind === 'brute' ? FLARE.bruteDamage : 99;
          w.flash = 0.3;
          if (w.hp <= 0) {
            banishWisp(state, w, 'flare');
            removeWisp(state, w);
            result.banished += 1;
            result.mask |= EVENT_BANISH;
          }
        }
      }
    }

    // --- spawning ---
    if (state.spawned < state.toSpawn) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = state.plan.interval * state.rng.range(0.75, 1.25);
        const kind = pickKind(state);
        const at = spawnEdgePoint(state);
        const w = makeWisp(state, kind, at.x, at.y);
        w.x = Math.max(10, Math.min(FIELD.width - 10, w.x));
        w.y = Math.max(10, Math.min(FIELD.height - 10, w.y));
        state.wisps.push(w);
        state.spawned += 1;
        if (kind === 'golden') state.goldenSpawned += 1;
      }
    }

    // --- aura burn ---
    state.auraTimer += dt;
    const auraTick = PLAYER.auraTick * state.mult.auraTickMul;
    if (state.auraTimer >= auraTick) {
      state.auraTimer = 0;
      const radius = auraRadius();
      for (const w of state.wisps.slice()) {
        const d = Math.hypot(w.x - p.x, w.y - p.y);
        if (d < radius + w.radius) {
          w.hp -= 1;
          w.flash = 0.2;
          if (w.hp <= 0) {
            banishWisp(state, w, 'aura');
            removeWisp(state, w);
            result.banished += 1;
            result.mask |= EVENT_BANISH;
          }
        }
      }
    }

    // --- braziers burn ---
    if (state.braziers.length) {
      const { banished, expired } = updateBraziers(state.braziers, state.wisps, dt);
      for (const w of banished) {
        banishWisp(state, w, 'brazier');
        removeWisp(state, w);
        result.banished += 1;
        result.mask |= EVENT_BANISH;
      }
      for (const b of expired) {
        burst(state, b.x, b.y, '#8a8f9e', 10, 50);
        const i = state.braziers.indexOf(b);
        if (i >= 0) state.braziers.splice(i, 1);
      }
    }

    // --- wisp movement + hearth hits ---
    for (const w of state.wisps.slice()) {
      if (w.flash > 0) w.flash -= dt;
      w.wobble += w.wobbleSpeed * dt;
      let tx = HEARTH.x - w.x;
      let ty = HEARTH.y - w.y;
      if (w.kind === 'golden') {
        // Golden wisps flee the keeper when it comes close.
        const pd = Math.hypot(p.x - w.x, p.y - w.y);
        if (pd < GOLDEN.fleeRadius) {
          tx = w.x - p.x;
          ty = w.y - p.y;
        }
        w.life -= dt;
        if (w.life <= 0) { removeWisp(state, w); continue; }
      }
      const dist = Math.hypot(tx, ty) || 1;
      const slowed = Math.hypot(w.x - p.x, w.y - p.y) < auraRadius() + w.radius;
      const sp = w.speed * state.mult.speedMul * (slowed ? PLAYER.auraSlow : 1);
      const wx = Math.cos(w.wobble) * 9;
      const wy = Math.sin(w.wobble) * 9;
      w.x += ((tx / dist) * sp + wx * 0.25) * dt;
      w.y += ((ty / dist) * sp + wy * 0.25) * dt;
      const hd = Math.hypot(w.x - HEARTH.x, w.y - HEARTH.y);
      if (hd < HEARTH.radius + w.radius) {
        if (w.kind === 'golden') { removeWisp(state, w); continue; }
        state.fuel -= w.fuelHit;
        state.shake = 1;
        result.mask |= EVENT_HEARTH_HIT;
        burst(state, w.x, w.y, '#ff7a5c', 8, 90);
        removeWisp(state, w);
        if (state.fuel <= 0) {
          state.fuel = 0;
          state.over = true;
          result.mask |= EVENT_OVER;
        }
      }
    }

    // --- shards: drift, magnet, collect ---
    for (const s of state.shards.slice()) {
      s.life -= dt;
      if (s.life <= 0) {
        state.shards.splice(state.shards.indexOf(s), 1);
        continue;
      }
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      const magnet = EMBER.magnetRadius + state.mods.magnetBonus;
      if (d < magnet) {
        s.x += ((p.x - s.x) / (d || 1)) * EMBER.magnetSpeed * dt;
        s.y += ((p.y - s.y) / (d || 1)) * EMBER.magnetSpeed * dt;
      }
      if (d < p.radius + EMBER.shardRadius + 4) {
        state.shards.splice(state.shards.indexOf(s), 1);
        state.embers += s.value;
        state.fuel = Math.min(
          state.fuelMax,
          state.fuel + HEARTH_FUEL.emberFuel + state.mult.shardFuelBonus,
        );
        state.stats.collected += 1;
        result.picked += 1;
        result.mask |= EVENT_PICKUP;
      }
    }

    // --- fuel drain ---
    if (!state.over && !state.won) {
      state.fuel -= HEARTH_FUEL.drainPerSecond * dt;
      if (state.fuel <= 0) {
        state.fuel = 0;
        state.over = true;
        result.mask |= EVENT_OVER;
      }
    }

    // --- particles + popups age ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pp = state.popups[i];
      pp.y -= 26 * dt; pp.life -= dt;
      if (pp.life <= 0) state.popups.splice(i, 1);
    }

    // --- night clear / win ---
    if (!state.over && !state.won && !state.nightCleared
      && state.spawned >= state.toSpawn && state.wisps.length === 0) {
      state.nightCleared = true;
      if (state.night >= NIGHTS) {
        state.won = true;
        state.over = true;
        state.score += Math.round(state.fuel) * 10;
        result.mask |= EVENT_WIN | EVENT_NIGHT_CLEAR;
      } else {
        result.mask |= EVENT_NIGHT_CLEAR;
        offerBoons(state);
      }
    }

    result.combo = state.combo;
    return result;
  }

  return {
    state,
    step,
    stepAmbient,
    reset,
    applyBoon,
    auraRadius,
    flareCost,
    brazierCost,
    wispsLeft,
    placeBrazier,
    spawnWisp,
    suggestSpot: (tx, ty) => suggestSpot(state.braziers, tx, ty, state.mods.brazierSlots),
  };
}

export function createWorld() {
  const seed = (Date.now() % 2147483647) ^ ((Math.random() * 2147483647) | 0);
  return createWorldWithSeed(seed >>> 0);
}
