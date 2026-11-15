// Emberkeeper's rules, with no DOM in them: the same file runs in the browser
// and in a headless Node system test. The keeper guards the hearth at the
// centre of the field; wisps drift in from the dark and steal its fuel. The
// keeper's lantern light burns wisps that come close, embers they drop feed
// the fire, and surviving all eight nights brings the dawn.
import {
  BOONS, COMBO, EMBER, FIELD, FLARE, HEARTH, HEARTH_FUEL, NIGHTS,
  PLAYER, WISP_KINDS, nightPlan,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_BANISH = 1;
export const EVENT_PICKUP = 2;
export const EVENT_HEARTH_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_NIGHT_CLEAR = 32;
export const EVENT_FLARE = 64;
export const EVENT_DASH = 128;

/** Pick a wisp kind for `night` from the plan's weights, with the seeded random. */
function pickKind(random, night, weights) {
  let total = 0;
  for (const kind of Object.keys(weights)) total += weights[kind];
  let roll = random.next() * total;
  for (const kind of Object.keys(weights)) {
    roll -= weights[kind];
    if (roll <= 0) return kind;
  }
  return 'wisp';
}

function spawnPoint(random) {
  const side = random.int(0, 3);
  const margin = 24;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -margin };
  if (side === 1) return { x: FIELD.width + margin, y: random.range(0, FIELD.height) };
  if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + margin };
  return { x: -margin, y: random.range(0, FIELD.height) };
}

export function createWorld(random) {
  const state = {
    time: 0,
    night: 1,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    embers: 0,
    fuel: HEARTH_FUEL.max,
    fuelMax: HEARTH_FUEL.max,
    player: {
      x: HEARTH.x, y: HEARTH.y + 130, radius: PLAYER.radius,
      dashTime: 0, dashCooldown: 0, dashId: 0, facing: { x: 0, y: -1 },
    },
    wisps: [],
    shards: [],
    particles: [],
    popups: [],
    spawned: 0,
    toSpawn: 0,
    spawnTimer: 0,
    plan: null,
    boonChoices: [],
    boonsOwned: [],
    over: false,
    won: false,
    nightCleared: false,
    stats: { banished: 0, collected: 0, flares: 0, dashes: 0 },
    mods: {
      auraBonus: 0, speedMul: 1, dashCdMul: 1, emberFuelBonus: 0,
      flareRadiusBonus: 0, flareCostDelta: 0, fuelMaxBonus: 0,
      auraTickMul: 1, dropBonus: 0,
    },
  };

  function auraRadius() {
    return PLAYER.auraRadius + state.mods.auraBonus;
  }

  function flareCost() {
    return Math.max(1, FLARE.cost + state.mods.flareCostDelta);
  }

  function makeWisp(kind, x, y) {
    const spec = WISP_KINDS[kind];
    return {
      kind, x, y, hp: spec.hp, maxHp: spec.hp, speed: spec.speed,
      radius: spec.radius, score: spec.score, fuelHit: spec.fuelHit,
      wobble: random.range(0, Math.PI * 2), wobbleSpeed: random.range(1.2, 2.4),
      auraTimer: 0, lastDashHit: -1, flash: 0,
    };
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const velocity = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life: random.range(0.35, 0.7), maxLife: 0.7, size: random.range(2, 4.5), color,
      });
    }
  }

  function popup(x, y, text, color) {
    state.popups.push({ x, y, text, life: 0.9, maxLife: 0.9, color });
  }

  function dropShard(x, y) {
    state.shards.push({
      x, y, vx: random.range(-30, 30), vy: random.range(-30, 30),
      life: EMBER.lifeSeconds, radius: EMBER.shardRadius,
    });
  }

  /** Banish one wisp: score, combo, maybe an ember, maybe two new wisps. */
  function banishWisp(wisp, events) {
    state.combo += 1;
    state.comboTimer = COMBO.window;
    const multiplier = Math.min(state.combo, COMBO.max);
    const gained = wisp.score * multiplier;
    state.score += gained;
    state.stats.banished += 1;
    events.banished += 1;
    events.combo = state.combo;
    burst(wisp.x, wisp.y, '#9fd8ff', wisp.kind === 'brute' ? 22 : 10, 130);
    popup(wisp.x, wisp.y - 14, `+${gained}`, multiplier > 1 ? '#ffd76a' : '#cfe8ff');
    if (random.next() < EMBER.dropChance + state.mods.dropBonus) dropShard(wisp.x, wisp.y);
    if (wisp.kind === 'splitter') {
      for (const offset of [-14, 14]) {
        const child = makeWisp('wisp', wisp.x + offset, wisp.y);
        state.wisps.push(child);
      }
    }
  }

  function damageWisp(wisp, amount, events) {
    wisp.hp -= amount;
    wisp.flash = 0.12;
    if (wisp.hp <= 0) banishWisp(wisp, events);
  }

  function startNight(night) {
    state.night = night;
    state.plan = nightPlan(night);
    state.toSpawn = state.plan.total;
    state.spawned = 0;
    state.spawnTimer = 0.8;
    state.nightCleared = false;
    state.fuel = Math.min(state.fuelMax, state.fuel + HEARTH_FUEL.nightStartBonus);
  }

  function rollBoons() {
    const pool = [...BOONS];
    const choices = [];
    while (choices.length < 3 && pool.length > 0) {
      const index = Math.floor(random.next() * pool.length);
      choices.push(pool.splice(index, 1)[0]);
    }
    state.boonChoices = choices;
  }

  function applyBoon(id) {
    const mods = state.mods;
    if (id === 'wide') mods.auraBonus += 28;
    else if (id === 'swift') mods.speedMul *= 1.15;
    else if (id === 'dash') mods.dashCdMul *= 0.65;
    else if (id === 'heart') mods.emberFuelBonus += 2;
    else if (id === 'flare') { mods.flareRadiusBonus += 55; mods.flareCostDelta -= 1; }
    else if (id === 'sturdy') { mods.fuelMaxBonus += 30; state.fuelMax += 30; state.fuel = Math.min(state.fuelMax, state.fuel + 30); }
    else if (id === 'thorn') mods.auraTickMul *= 0.5;
    else if (id === 'lucky') mods.dropBonus += 0.25;
    state.boonsOwned.push(id);
    state.boonChoices = [];
    startNight(state.night + 1);
  }

  function reset() {
    state.time = 0;
    state.night = 1;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.embers = 0;
    state.fuel = HEARTH_FUEL.max;
    state.fuelMax = HEARTH_FUEL.max;
    state.player.x = HEARTH.x;
    state.player.y = HEARTH.y + 130;
    state.player.dashTime = 0;
    state.player.dashCooldown = 0;
    state.player.facing = { x: 0, y: -1 };
    state.wisps = [];
    state.shards = [];
    state.particles = [];
    state.popups = [];
    state.boonChoices = [];
    state.boonsOwned = [];
    state.over = false;
    state.won = false;
    state.nightCleared = false;
    state.stats = { banished: 0, collected: 0, flares: 0, dashes: 0 };
    state.mods = {
      auraBonus: 0, speedMul: 1, dashCdMul: 1, emberFuelBonus: 0,
      flareRadiusBonus: 0, flareCostDelta: 0, fuelMaxBonus: 0,
      auraTickMul: 1, dropBonus: 0,
    };
    startNight(1);
  }

  /**
   * One fixed step of play. `move` is a normalised {x, y}; `actions` is a bitmask
   * of ACTION_DASH / ACTION_FLARE. Returns { events, ... } where `events` is a
   * bitmask of EVENT_* and the counts name what happened this step.
   */
  function step(dt, move, actions) {
    const events = { mask: 0, banished: 0, picked: 0, combo: state.combo };
    if (state.over || state.won || state.boonChoices.length > 0) return events;
    state.time += dt;

    const player = state.player;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    const moving = move.x !== 0 || move.y !== 0;
    if (moving) player.facing = { x: move.x, y: move.y };

    // Dash: a burst of speed in the facing direction; passing through a wisp burns it.
    if ((actions & 1) && player.dashCooldown <= 0 && player.dashTime <= 0) {
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown * state.mods.dashCdMul;
      player.dashId += 1;
      state.stats.dashes += 1;
      events.mask |= EVENT_DASH;
    }
    let velocityX = 0;
    let velocityY = 0;
    if (player.dashTime > 0) {
      velocityX = player.facing.x * PLAYER.dashSpeed;
      velocityY = player.facing.y * PLAYER.dashSpeed;
      player.dashTime -= dt;
    } else if (moving) {
      velocityX = move.x * PLAYER.speed * state.mods.speedMul;
      velocityY = move.y * PLAYER.speed * state.mods.speedMul;
    }
    player.x = Math.min(FIELD.width - 10, Math.max(10, player.x + velocityX * dt));
    player.y = Math.min(FIELD.height - 10, Math.max(10, player.y + velocityY * dt));
    if (player.dashTime > 0) {
      state.particles.push({
        x: player.x, y: player.y, vx: random.range(-20, 20), vy: random.range(-20, 20),
        life: 0.3, maxLife: 0.3, size: random.range(2, 4), color: '#ffb347',
      });
    }

    // Flare: a burst of light that banishes frail wisps around the keeper.
    if ((actions & 2) && state.embers >= flareCost()) {
      state.embers -= flareCost();
      state.stats.flares += 1;
      events.mask |= EVENT_FLARE;
      const radius = FLARE.radius + state.mods.flareRadiusBonus;
      state.particles.push({
        x: player.x, y: player.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4,
        size: radius, color: '#ffd76a', ring: true,
      });
      for (const wisp of [...state.wisps]) {
        if (Math.hypot(wisp.x - player.x, wisp.y - player.y) <= radius + wisp.radius) {
          if (wisp.hp <= 2) damageWisp(wisp, 99, events);
          else damageWisp(wisp, FLARE.bruteDamage, events);
        }
      }
      state.wisps = state.wisps.filter((wisp) => wisp.hp > 0);
    }

    // Spawning.
    if (state.spawned < state.toSpawn) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = state.plan.interval * random.range(0.8, 1.2);
        const point = spawnPoint(random);
        state.wisps.push(makeWisp(pickKind(random, state.night, state.plan.weights), point.x, point.y));
        state.spawned += 1;
      }
    }

    // The hearth burns down, a little every second.
    state.fuel -= HEARTH_FUEL.drainPerSecond * dt;

    // Combo fades when the keeper stops banishing.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Wisps drift toward the hearth, slowed and burned inside the lantern light.
    const aura = auraRadius();
    const tick = PLAYER.auraTick * state.mods.auraTickMul;
    for (const wisp of [...state.wisps]) {
      const dx = HEARTH.x - wisp.x;
      const dy = HEARTH.y - wisp.y;
      const distance = Math.hypot(dx, dy) || 1;
      const inAura = Math.hypot(wisp.x - player.x, wisp.y - player.y) <= aura + wisp.radius;
      const speedFactor = inAura ? PLAYER.auraSlow : 1;
      wisp.wobble += wisp.wobbleSpeed * dt;
      const wobble = Math.sin(wisp.wobble) * 14;
      const px = -dy / distance;
      const py = dx / distance;
      wisp.x += (dx / distance * wisp.speed * speedFactor + px * wobble) * dt;
      wisp.y += (dy / distance * wisp.speed * speedFactor + py * wobble) * dt;
      if (wisp.flash > 0) wisp.flash -= dt;
      if (inAura) {
        wisp.auraTimer += dt;
        if (wisp.auraTimer >= tick) {
          wisp.auraTimer = 0;
          damageWisp(wisp, 1, events);
        }
      } else {
        wisp.auraTimer = 0;
      }
      // A dashing keeper burns through wisps it touches.
      if (player.dashTime > 0 && wisp.lastDashHit !== player.dashId
        && Math.hypot(wisp.x - player.x, wisp.y - player.y) <= wisp.radius + player.radius + 4) {
        wisp.lastDashHit = player.dashId;
        damageWisp(wisp, 1, events);
      }
      // A wisp that reaches the stones steals fuel and burns out.
      if (distance <= HEARTH.radius + wisp.radius) {
        state.fuel -= wisp.fuelHit;
        events.mask |= EVENT_HEARTH_HIT;
        burst(wisp.x, wisp.y, '#ff6b4a', 12, 110);
        popup(HEARTH.x, HEARTH.y - HEARTH.radius - 10, `-${wisp.fuelHit} fuel`, '#ff8a6b');
        wisp.hp = 0;
      }
    }
    state.wisps = state.wisps.filter((wisp) => wisp.hp > 0);

    // Ember shards drift, are pulled toward the keeper, and feed the hearth.
    for (const shard of [...state.shards]) {
      shard.life -= dt;
      const dx = player.x - shard.x;
      const dy = player.y - shard.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < EMBER.magnetRadius) {
        shard.vx += (dx / distance) * EMBER.magnetSpeed * dt * 4;
        shard.vy += (dy / distance) * EMBER.magnetSpeed * dt * 4;
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vx *= 0.92;
      shard.vy *= 0.92;
      if (distance <= player.radius + shard.radius) {
        shard.life = 0;
        state.embers += 1;
        state.fuel = Math.min(state.fuelMax, state.fuel + HEARTH_FUEL.emberFuel + state.mods.emberFuelBonus);
        state.stats.collected += 1;
        events.picked += 1;
        events.mask |= EVENT_PICKUP;
      }
    }
    state.shards = state.shards.filter((shard) => shard.life > 0);

    // Hearth embers rise; particles and popups fade.
    if (random.next() < dt * 14) {
      state.particles.push({
        x: HEARTH.x + random.range(-26, 26), y: HEARTH.y - 8,
        vx: random.range(-6, 6), vy: random.range(-46, -20),
        life: random.range(0.6, 1.2), maxLife: 1.2, size: random.range(1.5, 3.5), color: '#ffb347',
      });
    }
    for (const particle of state.particles) {
      particle.life -= dt;
      if (!particle.ring) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    for (const pop of state.popups) {
      pop.life -= dt;
      pop.y -= 26 * dt;
    }
    state.popups = state.popups.filter((pop) => pop.life > 0);

    if (events.banished > 0) events.mask |= EVENT_BANISH;

    // Night cleared: every wisp spawned and none left standing.
    if (state.spawned >= state.toSpawn && state.wisps.length === 0 && !state.nightCleared) {
      state.nightCleared = true;
      if (state.night >= NIGHTS) {
        state.won = true;
        state.score += Math.round(state.fuel) * 10;
        events.mask |= EVENT_WIN;
      } else {
        rollBoons();
        events.mask |= EVENT_NIGHT_CLEAR;
      }
    }

    if (state.fuel <= 0 && !state.won) {
      state.fuel = 0;
      state.over = true;
      events.mask |= EVENT_OVER;
    }
    return events;
  }

  /** The title screen's idle scene: wisps circle the fire, never reaching it. */
  function stepAmbient(dt) {
    state.time += dt;
    if (state.wisps.length < 6 && random.next() < dt * 0.8) {
      const angle = random.range(0, Math.PI * 2);
      const radius = random.range(200, 320);
      const wisp = makeWisp('wisp', HEARTH.x + Math.cos(angle) * radius, HEARTH.y + Math.sin(angle) * radius);
      wisp.hp = 999;
      state.wisps.push(wisp);
    }
    for (const wisp of state.wisps) {
      const dx = HEARTH.x - wisp.x;
      const dy = HEARTH.y - wisp.y;
      const distance = Math.hypot(dx, dy) || 1;
      const px = -dy / distance;
      const py = dx / distance;
      wisp.x += px * 26 * dt;
      wisp.y += py * 26 * dt;
      wisp.wobble += dt;
    }
    if (random.next() < dt * 14) {
      state.particles.push({
        x: HEARTH.x + random.range(-26, 26), y: HEARTH.y - 8,
        vx: random.range(-6, 6), vy: random.range(-46, -20),
        life: random.range(0.6, 1.2), maxLife: 1.2, size: random.range(1.5, 3.5), color: '#ffb347',
      });
    }
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  reset();
  return {
    state,
    reset,
    step,
    stepAmbient,
    applyBoon,
    auraRadius,
    flareCost,
    /** Wisps still to beat this night (spawned + standing). */
    wispsLeft() {
      return (state.toSpawn - state.spawned) + state.wisps.length;
    },
  };
}

export function createWorldWithSeed(seed) {
  return createWorld(createRandom(seed));
}
