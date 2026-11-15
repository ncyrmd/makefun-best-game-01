// Braziers — buildable fire bowls. The keeper spends embers to plant one;
// it burns wisps that drift into its light until its fuel gutters out.
// Pure rules, no DOM: the world owns the list, this module owns the checks
// and the burn step.
import { BRAZIER, FIELD, HEARTH } from './config.js';

// A fresh brazier at (x, y). fuel counts down in seconds; burnTimer counts
// up to the next burn tick; boltTimer counts up to the next firebolt.
export function makeBrazier(x, y) {
  return {
    x, y,
    radius: BRAZIER.radius,
    fuel: BRAZIER.fuelSeconds,
    maxFuel: BRAZIER.fuelSeconds,
    burnTimer: 0,
    boltTimer: 0,
    born: 0,
  };
}

// Can a brazier be planted here? Returns { ok, reason } — reason is a short
// human line for the HUD ("too close to the hearth", "too close to another
// brazier", "outside the clearing", "no room for more braziers", "not enough
// embers"). The world checks embers separately; this checks the ground.
export function canPlaceBrazier(list, x, y, slots) {
  if (list.length >= slots) return { ok: false, reason: 'no room for more braziers' };
  if (x < BRAZIER.margin || x > FIELD.width - BRAZIER.margin
    || y < BRAZIER.margin || y > FIELD.height - BRAZIER.margin) {
    return { ok: false, reason: 'outside the clearing' };
  }
  const dh = Math.hypot(x - HEARTH.x, y - HEARTH.y);
  if (dh < BRAZIER.minFromHearth) return { ok: false, reason: 'too close to the hearth' };
  for (const b of list) {
    if (Math.hypot(x - b.x, y - b.y) < BRAZIER.minFromBrazier) {
      return { ok: false, reason: 'too close to another brazier' };
    }
  }
  return { ok: true, reason: '' };
}

// One burn step for every live brazier. Wisps inside a brazier's light take
// burnDamage each burnTick. Every boltInterval a brazier also shoots one
// firebolt — a glowing tracer the world draws — at the nearest wisp in its
// light for boltDamage. Returns { banished, expired, bolts }: wisps whose hp
// dropped to zero (the world scores and drops shards for them), braziers
// whose fuel ran out (the world puffs them away), and the bolts fired this
// step as { x, y, tx, ty } tracers for the renderer.
export function updateBraziers(list, wisps, dt) {
  const banished = [];
  const expired = [];
  const bolts = [];
  for (const b of list) {
    b.fuel -= dt;
    if (b.fuel <= 0) { expired.push(b); continue; }
    b.burnTimer += dt;
    if (b.burnTimer >= BRAZIER.burnTick) {
      b.burnTimer = 0;
      for (const w of wisps) {
        if (w.hp <= 0) continue;
        const d = Math.hypot(w.x - b.x, w.y - b.y);
        if (d < b.radius + w.radius) {
          w.hp -= BRAZIER.burnDamage;
          w.flash = 0.25;
          if (w.hp <= 0) banished.push(w);
        }
      }
    }
    // Firebolt: one shot at the nearest wisp inside the light.
    b.boltTimer += dt;
    if (b.boltTimer >= BRAZIER.boltInterval) {
      let target = null;
      let targetD = Infinity;
      for (const w of wisps) {
        if (w.hp <= 0) continue;
        const d = Math.hypot(w.x - b.x, w.y - b.y);
        if (d < b.radius + w.radius && d < targetD) { targetD = d; target = w; }
      }
      if (target) {
        b.boltTimer = 0;
        target.hp -= BRAZIER.boltDamage;
        target.flash = 0.25;
        bolts.push({ x: b.x, y: b.y, tx: target.x, ty: target.y });
        if (target.hp <= 0) banished.push(target);
      }
    }
  }
  return { banished, expired, bolts };
}

// A good default spot for the autopilot and for shot staging: the ring around
// the hearth, biased toward the side the wisps are coming from.
export function suggestSpot(list, tx, ty, slots) {
  const angle = Math.atan2(ty - HEARTH.y, tx - HEARTH.x);
  const spots = [];
  for (let i = 0; i < 8; i++) {
    const a = angle + (i - 3.5) * 0.5;
    spots.push({
      x: HEARTH.x + Math.cos(a) * 190,
      y: HEARTH.y + Math.sin(a) * 150,
    });
  }
  for (const s of spots) {
    const check = canPlaceBrazier(list, s.x, s.y, slots);
    if (check.ok) return s;
  }
  return null;
}
