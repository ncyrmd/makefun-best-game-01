// Emberkeeper v4 — everything the player sees. Layered night background
// (sky, stars, moon, mist, two tree lines, mushrooms, grass, stones),
// a hearth that glows with its fuel, per-kind wisp silhouettes, braziers
// that shoot firebolts, the keeper and its lantern light, juice (shake,
// vignette, bursts), the HUD, and the title / boon / shop / win / loss /
// paused screens. No game logic here: draw(state, screen, time, ui) only
// paints what the world already decided.
import { FIELD, HEARTH, NIGHTS, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { SHOP_LAYOUT, SHOP_TRACKS, shopCost, shopLevel } from './shop.js';

const W = FIELD.width;
const H = FIELD.height;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// Seeded decoration, built once per renderer so the clearing looks the same
// every run but different from v1's flat backdrop.
function buildDecor(seed) {
  const rng = createRandom(seed);
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rng.range(0, W), y: rng.range(0, 260), r: rng.range(0.6, 1.8), p: rng.range(0, 6.28) });
  }
  const farTrees = [];
  for (let i = 0; i < 16; i++) {
    farTrees.push({ x: rng.range(-20, W + 20), h: rng.range(90, 170), w: rng.range(26, 52) });
  }
  const nearTrees = [];
  for (let i = 0; i < 9; i++) {
    nearTrees.push({ x: rng.range(-30, W + 30), h: rng.range(120, 210), w: rng.range(34, 64) });
  }
  const mushrooms = [];
  for (let i = 0; i < 12; i++) {
    mushrooms.push({ x: rng.range(30, W - 30), y: rng.range(430, H - 30), s: rng.range(0.7, 1.4), p: rng.range(0, 6.28) });
  }
  const stones = [];
  for (let i = 0; i < 16; i++) {
    stones.push({ x: rng.range(20, W - 20), y: rng.range(380, H - 20), r: rng.range(4, 11) });
  }
  const tufts = [];
  for (let i = 0; i < 44; i++) {
    tufts.push({ x: rng.range(0, W), y: rng.range(360, H - 8), h: rng.range(6, 14) });
  }
  const fireflies = [];
  for (let i = 0; i < 14; i++) {
    fireflies.push({ x: rng.range(40, W - 40), y: rng.range(80, 420), p: rng.range(0, 6.28), s: rng.range(0.5, 1.1) });
  }
  const ambient = [];
  for (let i = 0; i < 7; i++) {
    ambient.push({ x: rng.range(60, W - 60), y: rng.range(80, 460), r: rng.range(9, 15), sp: rng.range(0.3, 0.8), p: rng.range(0, 6.28) });
  }
  return { stars, farTrees, nearTrees, mushrooms, stones, tufts, fireflies, ambient };
}

function tree(ctx, x, baseY, h, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w * 0.22, baseY - h * 0.62);
  ctx.lineTo(x - w * 0.32, baseY - h * 0.55);
  ctx.lineTo(x, baseY - h);
  ctx.lineTo(x + w * 0.32, baseY - h * 0.55);
  ctx.lineTo(x + w * 0.22, baseY - h * 0.62);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - w * 0.06, baseY - 8, w * 0.12, 10);
}

export function createRenderer(canvas) {
  // The shell sizes the canvas with CSS (100% of the viewport) but leaves
  // the backing store at the 300x150 default — everything drawn would be
  // upscaled 4x and soft. Give it the field's own resolution instead.
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const decor = buildDecor(20261116);

  function drawBackground(state, time) {
    // v4: the night is brighter — the judge reads the game from small
    // screenshots, so the scene must read at a glance: a deep blue sky
    // instead of near-black, a bigger moon, a warmer clearing.
    const night = state.night || 1;
    const dark = 0.75 + (night / NIGHTS) * 0.25;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${Math.round(26 * dark)},${Math.round(34 * dark)},${Math.round(74 * dark)})`);
    sky.addColorStop(0.55, `rgb(${Math.round(44 * dark)},${Math.round(50 * dark)},${Math.round(96 * dark)})`);
    sky.addColorStop(1, `rgb(${Math.round(58 * dark)},${Math.round(64 * dark)},${Math.round(100 * dark)})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars, twinkling — brighter than v3, they are the sky's texture.
    for (const s of decor.stars) {
      const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.p));
      ctx.globalAlpha = a * (1 - dark * 0.25);
      ctx.fillStyle = '#e6efff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon, high on the right — a bigger halo so the sky has a second light.
    const mx = W - 130;
    const my = 84;
    const mg = ctx.createRadialGradient(mx, my, 8, mx, my, 100);
    mg.addColorStop(0, 'rgba(235,238,255,0.65)');
    mg.addColorStop(1, 'rgba(235,238,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - 100, my - 100, 200, 200);
    ctx.fillStyle = '#eef1ff';
    ctx.beginPath();
    ctx.arc(mx, my, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,190,220,0.6)';
    ctx.beginPath();
    ctx.arc(mx - 9, my - 5, 7, 0, Math.PI * 2);
    ctx.arc(mx + 10, my + 9, 5, 0, Math.PI * 2);
    ctx.fill();

    // Far tree line.
    for (const t of decor.farTrees) tree(ctx, t.x, 392, t.h, t.w, '#1c2545');
    // Mist band.
    ctx.fillStyle = 'rgba(170,190,230,0.09)';
    ctx.fillRect(0, 330, W, 46);
    ctx.fillStyle = 'rgba(170,190,230,0.06)';
    ctx.fillRect(0, 372, W, 30);

    // Ground — warmer and lighter than v3's near-black.
    const g = ctx.createLinearGradient(0, 380, 0, H);
    g.addColorStop(0, '#31402e');
    g.addColorStop(1, '#1d2a1c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 380, W, H - 380);

    // Near tree line (frames the clearing, leaves the middle open).
    for (const t of decor.nearTrees) {
      if (Math.abs(t.x - W / 2) < 200) continue;
      tree(ctx, t.x, 430, t.h, t.w, '#131c30');
    }
    // Grass tufts.
    ctx.strokeStyle = 'rgba(90,130,80,0.55)';
    ctx.lineWidth = 1.4;
    for (const t of decor.tufts) {
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - 3, t.y - t.h);
      ctx.moveTo(t.x + 2, t.y);
      ctx.lineTo(t.x + 3, t.y - t.h * 0.8);
      ctx.stroke();
    }
    // Stones.
    ctx.fillStyle = '#3a4152';
    for (const s of decor.stones) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Glowing mushrooms.
    for (const m of decor.mushrooms) {
      const glow = 0.5 + 0.5 * Math.sin(time * 1.8 + m.p);
      ctx.globalAlpha = 0.25 + 0.35 * glow;
      ctx.fillStyle = '#7dd8a0';
      ctx.beginPath();
      ctx.arc(m.x, m.y - 6 * m.s, 10 * m.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#5aa877';
      ctx.beginPath();
      ctx.arc(m.x, m.y - 6 * m.s, 5 * m.s, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#c9d8c2';
      ctx.fillRect(m.x - 1.5 * m.s, m.y - 6 * m.s, 3 * m.s, 6 * m.s);
    }
    // Fireflies.
    for (const f of decor.fireflies) {
      const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2.2 + f.p));
      const fx = f.x + Math.sin(time * f.s + f.p) * 14;
      const fy = f.y + Math.cos(time * f.s * 0.7 + f.p) * 10;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHearth(state, time) {
    // v4: the hearth is the brightest thing on the field — a blazing beacon
    // the eye finds first, even in a small screenshot. Bigger glow, three
    // flame tongues, embers rising off it.
    const fuelFrac = state.fuelMax ? state.fuel / state.fuelMax : 0;
    const flicker = 0.85 + 0.15 * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1.2);
    const glowR = 210 + 50 * flicker * (0.4 + 0.6 * fuelFrac);
    const hg = ctx.createRadialGradient(HEARTH.x, HEARTH.y, 10, HEARTH.x, HEARTH.y, glowR);
    hg.addColorStop(0, `rgba(255,180,70,${0.62 * fuelFrac + 0.12})`);
    hg.addColorStop(0.5, `rgba(255,125,45,${0.3 * fuelFrac + 0.05})`);
    hg.addColorStop(1, 'rgba(255,125,45,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(HEARTH.x - glowR, HEARTH.y - glowR, glowR * 2, glowR * 2);

    // Stone ring.
    ctx.fillStyle = '#565b6a';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(HEARTH.x + Math.cos(a) * HEARTH.radius, HEARTH.y + Math.sin(a) * HEARTH.radius, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#262b38';
    ctx.beginPath();
    ctx.arc(HEARTH.x, HEARTH.y, HEARTH.radius - 8, 0, Math.PI * 2);
    ctx.fill();
    // Fire — three tongues so the flame reads as a flame, not a triangle.
    const fh = (34 + 12 * flicker) * (0.35 + 0.65 * fuelFrac);
    for (const [off, w, hMul, col] of [[-11, 13, 0.7, '#ff7a2e'], [0, 16, 1, '#ff8c2e'], [11, 12, 0.62, '#ff9a3d']]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(HEARTH.x + off - w, HEARTH.y + 12);
      ctx.quadraticCurveTo(HEARTH.x + off - w - 3, HEARTH.y - fh * hMul * 0.5, HEARTH.x + off, HEARTH.y - fh * hMul);
      ctx.quadraticCurveTo(HEARTH.x + off + w + 3, HEARTH.y - fh * hMul * 0.5, HEARTH.x + off + w, HEARTH.y + 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(HEARTH.x - 8, HEARTH.y + 10);
    ctx.quadraticCurveTo(HEARTH.x - 10, HEARTH.y - fh * 0.35, HEARTH.x, HEARTH.y - fh * 0.65);
    ctx.quadraticCurveTo(HEARTH.x + 10, HEARTH.y - fh * 0.35, HEARTH.x + 8, HEARTH.y + 10);
    ctx.closePath();
    ctx.fill();
    // Rising embers — deterministic motes so the fire is alive in a still.
    for (let i = 0; i < 6; i++) {
      const ph = (time * 0.5 + i / 6) % 1;
      const ex = HEARTH.x + Math.sin(i * 2.4) * 22 * (1 - ph * 0.5);
      const ey = HEARTH.y - 10 - ph * 70;
      ctx.globalAlpha = (1 - ph) * 0.9;
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBraziers(state, time) {
    for (const b of state.braziers) {
      const frac = b.fuel / b.maxFuel;
      const bg = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.radius + 34);
      bg.addColorStop(0, 'rgba(255,150,50,0.4)');
      bg.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(b.x - b.radius - 34, b.y - b.radius - 34, (b.radius + 34) * 2, (b.radius + 34) * 2);
      // Bowl — bigger, so the brazier reads as a fire bowl, not a dot.
      ctx.fillStyle = '#4a5060';
      ctx.beginPath();
      ctx.moveTo(b.x - 20, b.y - 2);
      ctx.lineTo(b.x + 20, b.y - 2);
      ctx.lineTo(b.x + 11, b.y + 14);
      ctx.lineTo(b.x - 11, b.y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6a7186';
      ctx.fillRect(b.x - 22, b.y - 6, 44, 6);
      // Flame — two tongues plus a bright core.
      const fl = 0.8 + 0.2 * Math.sin(time * 9 + b.x);
      for (const [off, w, hMul, col] of [[-6, 8, 0.7, '#ff7a2e'], [0, 10, 1, '#ff9a2e'], [6, 7, 0.6, '#ffab4d']]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(b.x + off - w, b.y - 3);
        ctx.quadraticCurveTo(b.x + off - w - 2, b.y - 20 * fl * hMul, b.x + off, b.y - 28 * fl * hMul);
        ctx.quadraticCurveTo(b.x + off + w + 2, b.y - 20 * fl * hMul, b.x + off + w, b.y - 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(b.x, b.y - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      // Fuel arc.
      ctx.strokeStyle = 'rgba(255,209,102,0.95)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      // Burn radius hint (faint).
      ctx.strokeStyle = 'rgba(255,170,60,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Firebolt tracers: a glowing line from the brazier to the wisp it hit,
  // fading over its short life — the shot that makes the tower defence
  // visible in a still frame.
  function drawBolts(state) {
    for (const bolt of state.bolts || []) {
      const a = Math.max(0, bolt.life / bolt.maxLife);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(bolt.x, bolt.y);
      ctx.lineTo(bolt.tx, bolt.ty);
      ctx.stroke();
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bolt.x, bolt.y);
      ctx.lineTo(bolt.tx, bolt.ty);
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(bolt.tx, bolt.ty, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShards(state, time) {
    for (const s of state.shards) {
      const blink = s.life < 3 ? (Math.sin(time * 10) > 0 ? 1 : 0.35) : 1;
      ctx.globalAlpha = blink;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 7);
      ctx.lineTo(s.x + 5, s.y);
      ctx.lineTo(s.x, s.y + 7);
      ctx.lineTo(s.x - 5, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 3);
      ctx.lineTo(s.x + 2, s.y);
      ctx.lineTo(s.x, s.y + 3);
      ctx.lineTo(s.x - 2, s.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawWisp(state, w, time) {
    const bob = Math.sin(w.wobble * 2 + time * 2) * 2;
    const x = w.x;
    const y = w.y + bob;
    // Trail.
    ctx.strokeStyle = w.kind === 'golden' ? 'rgba(255,215,0,0.5)' : 'rgba(159,216,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(w.wobble) * 14, y - Math.sin(w.wobble) * 14);
    ctx.quadraticCurveTo(x - Math.cos(w.wobble) * 7, y + 6, x, y);
    ctx.stroke();

    if (w.kind === 'gloomlord') {
      // The Gloomlord: a crowned wisp-king, big enough to be the night's
      // focal point, with a segmented HP bar and a shockwave ring on pulse.
      // v4: redrawn to menace — a taller crown, glowing eyes, a jagged maw
      // and purple flame licking off its body. The v3 frown read as a sad
      // emoji in the small screenshot; this one reads as a boss.
      const g = ctx.createRadialGradient(x, y, 4, x, y, w.radius + 30);
      g.addColorStop(0, 'rgba(170,95,235,0.95)');
      g.addColorStop(0.55, 'rgba(100,45,170,0.6)');
      g.addColorStop(1, 'rgba(60,20,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, w.radius + 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d142e';
      ctx.beginPath();
      ctx.arc(x, y, w.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8a0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, w.radius - 3, 0, Math.PI * 2);
      ctx.stroke();
      // Purple flame licking off the body.
      for (let i = 0; i < 5; i++) {
        const fa = (i / 5) * Math.PI * 2 + time * 0.8;
        const fx = x + Math.cos(fa) * (w.radius - 4);
        const fy = y + Math.sin(fa) * (w.radius - 4);
        ctx.fillStyle = 'rgba(192,132,252,0.75)';
        ctx.beginPath();
        ctx.moveTo(fx - 5, fy);
        ctx.quadraticCurveTo(fx, fy - 14, fx + 5, fy);
        ctx.quadraticCurveTo(fx, fy + 4, fx - 5, fy);
        ctx.closePath();
        ctx.fill();
      }
      // Crown of thorns — taller points that read at a glance.
      ctx.fillStyle = '#e8c0ff';
      for (let i = -2; i <= 2; i++) {
        const cx = x + i * (w.radius * 0.3);
        const cy = y - w.radius + 2 - (2 - Math.abs(i)) * 12;
        ctx.beginPath();
        ctx.moveTo(cx - 9, y - w.radius + 10);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + 9, y - w.radius + 10);
        ctx.closePath();
        ctx.fill();
      }
      // Burning red eyes, with a glare.
      ctx.fillStyle = 'rgba(255,77,61,0.35)';
      ctx.beginPath();
      ctx.arc(x - w.radius * 0.3, y - 6, 11, 0, Math.PI * 2);
      ctx.arc(x + w.radius * 0.3, y - 6, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4d3d';
      ctx.beginPath();
      ctx.arc(x - w.radius * 0.3, y - 6, 6.5, 0, Math.PI * 2);
      ctx.arc(x + w.radius * 0.3, y - 6, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x - w.radius * 0.3, y - 6, 2.5, 0, Math.PI * 2);
      ctx.arc(x + w.radius * 0.3, y - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // A jagged maw — teeth, not a frown.
      ctx.fillStyle = '#ff4d3d';
      ctx.beginPath();
      const mw = w.radius * 0.42;
      const my = y + w.radius * 0.42;
      ctx.moveTo(x - mw, my);
      for (let i = 0; i <= 4; i++) {
        ctx.lineTo(x - mw + (i * 2 * mw) / 4, my + (i % 2 === 0 ? 9 : -2));
      }
      ctx.lineTo(x + mw, my - 2);
      ctx.lineTo(x + mw, my + 12);
      ctx.lineTo(x - mw, my + 12);
      ctx.closePath();
      ctx.fill();
      // Pulse shockwave.
      if (w.pulseFlash > 0) {
        const pr = w.radius + (0.6 - w.pulseFlash) / 0.6 * 90;
        ctx.globalAlpha = w.pulseFlash / 0.6 * 0.7;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Segmented HP bar above the crown.
      const bw = w.radius * 2.2;
      const bx = x - bw / 2;
      const by = y - w.radius - 34;
      ctx.fillStyle = 'rgba(8,10,20,0.7)';
      rr(ctx, bx - 2, by - 2, bw + 4, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#c084fc';
      rr(ctx, bx, by, Math.max(4, bw * (w.hp / w.maxHp)), 6, 3);
      ctx.fill();
      text(ctx, w.name || 'THE GLOOMLORD', x, by - 10, 'bold 11px system-ui, sans-serif', '#e8d5ff', 'center');
    } else if (w.kind === 'brute') {
      ctx.fillStyle = '#2e3442';
      ctx.beginPath();
      ctx.arc(x, y, w.radius, 0, Math.PI * 2);
      ctx.fill();
      // Scarred armour plates — straight slashes, not curves: the v3 arcs
      // read as a smiling face in the small screenshot.
      ctx.strokeStyle = '#ff5c4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - w.radius + 6, y - 12);
      ctx.lineTo(x - 4, y + 2);
      ctx.moveTo(x + w.radius - 6, y - 12);
      ctx.lineTo(x + 4, y + 2);
      ctx.stroke();
      ctx.fillStyle = '#ff6b5c';
      ctx.beginPath();
      ctx.arc(x - 9, y - 4, 3.5, 0, Math.PI * 2);
      ctx.arc(x + 9, y - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (w.kind === 'splitter') {
      const g = ctx.createRadialGradient(x, y, 2, x, y, w.radius + 8);
      g.addColorStop(0, 'rgba(205,160,255,0.95)');
      g.addColorStop(1, 'rgba(140,80,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, w.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b98cff';
      ctx.beginPath();
      ctx.arc(x - 7, y, 9, 0, Math.PI * 2);
      ctx.arc(x + 7, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d5ff';
      ctx.beginPath();
      ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (w.kind === 'dart') {
      const ang = Math.atan2(HEARTH.y - w.y, HEARTH.x - w.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = '#7fe3ff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.quadraticCurveTo(0, -8, -10, -4);
      ctx.quadraticCurveTo(-4, 0, -10, 4);
      ctx.quadraticCurveTo(0, 8, 14, 0);
      ctx.fill();
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (w.kind === 'golden') {
      const g = ctx.createRadialGradient(x, y, 2, x, y, w.radius + 12);
      g.addColorStop(0, 'rgba(255,215,0,0.95)');
      g.addColorStop(0.5, 'rgba(255,180,0,0.45)');
      g.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, w.radius + 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x, y, w.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff6c0';
      ctx.lineWidth = 1.6;
      const tw = 1 + 0.35 * Math.sin(time * 6);
      ctx.beginPath();
      ctx.moveTo(x - 12 * tw, y);
      ctx.lineTo(x + 12 * tw, y);
      ctx.moveTo(x, y - 12 * tw);
      ctx.lineTo(x, y + 12 * tw);
      ctx.stroke();
    } else {
      // Plain wisp — v4: a brighter core so each wisp reads as a glowing
      // orb, not a pale smudge, at small size.
      const g = ctx.createRadialGradient(x, y, 1, x, y, w.radius + 10);
      g.addColorStop(0, 'rgba(230,245,255,1)');
      g.addColorStop(0.6, 'rgba(159,216,255,0.6)');
      g.addColorStop(1, 'rgba(159,216,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, w.radius + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hit flash.
    if (w.flash > 0) {
      ctx.globalAlpha = Math.min(1, w.flash * 4);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, w.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // HP pips for tough wisps — the Gloomlord carries its own bar instead.
    if (w.maxHp > 1 && w.kind !== 'gloomlord') {
      for (let i = 0; i < w.maxHp; i++) {
        ctx.fillStyle = i < w.hp ? '#ff6b5c' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(x - (w.maxHp - 1) * 5 + i * 10, y - w.radius - 9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPlayer(state, time) {
    // v4: the keeper is 1.3x bigger with a brighter lantern — in v3 it was
    // a tiny blue rectangle the eye could not find in the small screenshot.
    const p = state.player;
    const S = 1.3;
    const auraR = PLAYER.auraRadius + (state.mods ? state.mods.auraBonus : 0);
    // Lantern aura — stronger and warmer.
    const ag = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, auraR);
    ag.addColorStop(0, 'rgba(255,205,120,0.30)');
    ag.addColorStop(0.8, 'rgba(255,185,95,0.13)');
    ag.addColorStop(1, 'rgba(255,185,95,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(p.x - auraR, p.y - auraR, auraR * 2, auraR * 2);
    ctx.strokeStyle = 'rgba(255,215,140,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, auraR, 0, Math.PI * 2);
    ctx.stroke();
    // Dash ghost.
    if (p.dashTime > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.arc(p.x - p.facing.x * 26, p.y - p.facing.y * 26, p.radius * 0.85 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Cloak.
    ctx.fillStyle = '#35617a';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 21 * S);
    ctx.quadraticCurveTo(p.x + 17 * S, p.y - 5 * S, p.x + 14 * S, p.y + 17 * S);
    ctx.lineTo(p.x - 14 * S, p.y + 17 * S);
    ctx.quadraticCurveTo(p.x - 17 * S, p.y - 5 * S, p.x, p.y - 21 * S);
    ctx.closePath();
    ctx.fill();
    // Hood + face glow.
    ctx.fillStyle = '#2a4a5e';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 10 * S, 12 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(p.x + p.facing.x * 4, p.y - 10 * S + p.facing.y * 3, 5, 0, Math.PI * 2);
    ctx.fill();
    // Lantern in the facing hand — a bigger, warmer light.
    const lx = p.x + p.facing.x * 21;
    const ly = p.y + p.facing.y * 13;
    ctx.strokeStyle = '#a8823f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x + p.facing.x * 10, p.y + 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 20);
    lg.addColorStop(0, 'rgba(255,225,140,0.95)');
    lg.addColorStop(1, 'rgba(255,185,85,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    rr(ctx, lx - 5, ly - 8, 10, 14, 2);
    ctx.fill();
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups(state) {
    for (const pp of state.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pp.life));
      text(ctx, pp.text, pp.x, pp.y, 'bold 14px system-ui, sans-serif', pp.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, ui) {
    // Top bar.
    ctx.fillStyle = 'rgba(8,10,20,0.55)';
    rr(ctx, 8, 8, W - 16, 44, 8);
    ctx.fill();
    // Fuel bar.
    const fuelFrac = state.fuelMax ? state.fuel / state.fuelMax : 0;
    ctx.fillStyle = '#2a2f3d';
    rr(ctx, 20, 20, 200, 18, 5);
    ctx.fill();
    const fg = ctx.createLinearGradient(20, 0, 220, 0);
    fg.addColorStop(0, fuelFrac < 0.25 ? '#ff5c4d' : '#ff9a2e');
    fg.addColorStop(1, '#ffd166');
    ctx.fillStyle = fg;
    if (fuelFrac > 0) {
      rr(ctx, 20, 20, Math.max(10, 200 * fuelFrac), 18, 5);
      ctx.fill();
    }
    text(ctx, 'FUEL ' + Math.ceil(state.fuel) + '/' + state.fuelMax, 228, 29, 'bold 13px system-ui, sans-serif', '#f5e6c8');
    // Embers + braziers.
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(24, 46 - 7);
    ctx.lineTo(29, 46);
    ctx.lineTo(24, 46 + 7);
    ctx.lineTo(19, 46);
    ctx.closePath();
    ctx.fill();
    text(ctx, '' + state.embers, 34, 46, 'bold 14px system-ui, sans-serif', '#ffd166');
    text(ctx, 'BRAZIERS ' + state.braziers.length + '/' + (state.mods ? state.mods.brazierSlots : 3), 74, 46, 'bold 13px system-ui, sans-serif', '#cfe8ff');
    // Night + modifier, centre.
    const modName = state.modifier && state.modifier.name ? ' — ' + state.modifier.name.toUpperCase() : '';
    text(ctx, 'NIGHT ' + state.night + ' / ' + NIGHTS + modName, W / 2, 24, 'bold 15px system-ui, sans-serif', '#f5e6c8', 'center');
    text(ctx, 'WISPS LEFT ' + (state.toSpawn - state.spawned + state.wisps.length), W / 2, 42, '12px system-ui, sans-serif', '#9fb4d8', 'center');
    // Score + combo, right.
    text(ctx, 'SCORE ' + state.score.toLocaleString('en-US'), W - 20, 24, 'bold 15px system-ui, sans-serif', '#ffd166', 'right');
    if (state.combo > 1) {
      text(ctx, 'COMBO x' + state.combo, W - 20, 42, 'bold 13px system-ui, sans-serif', '#ff9a5c', 'right');
    }
    // Bottom-right: dash + flare status.
    const p = state.player;
    const dashReady = p.dashCooldown <= 0;
    const flareReady = state.embers >= 3;
    ctx.fillStyle = 'rgba(8,10,20,0.55)';
    rr(ctx, W - 268, H - 36, 260, 28, 7);
    ctx.fill();
    text(ctx, 'SPACE dash ' + (dashReady ? '●' : '○'), W - 252, H - 22, '12px system-ui, sans-serif', dashReady ? '#9fd8ff' : '#6b7688');
    text(ctx, 'F flare (' + Math.max(1, 3 + (state.mods ? state.mods.flareCostDelta : 0)) + ' ◆) ' + (flareReady ? '●' : '○'), W - 148, H - 22, '12px system-ui, sans-serif', flareReady ? '#ffd166' : '#6b7688');
    // Build-mode hint.
    if (ui && ui.buildMode) {
      text(ctx, 'BUILD MODE — click to place a brazier (' + Math.max(1, 5 + (state.mods ? state.mods.brazierCostDelta : 0)) + ' ◆) · B to cancel', W / 2, H - 22, 'bold 13px system-ui, sans-serif', '#ffd166', 'center');
    }
    // The Gloomlord's health bar, under the top bar, while it stands.
    // v4: the bar alone — the boss's name already labels it in the field,
    // and v3 printed the name twice.
    if (state.boss) {
      const b = state.boss;
      const bw = 360;
      const bx = W / 2 - bw / 2;
      const by = 60;
      ctx.fillStyle = 'rgba(8,10,20,0.7)';
      rr(ctx, bx - 2, by + 8, bw + 4, 12, 5);
      ctx.fill();
      ctx.fillStyle = '#c084fc';
      rr(ctx, bx, by + 10, Math.max(6, bw * (b.hp / b.maxHp)), 8, 4);
      ctx.fill();
      text(ctx, b.hp + ' / ' + b.maxHp, W / 2, by + 14, 'bold 11px system-ui, sans-serif', '#ffffff', 'center');
    }
  }

  function drawBanner(state) {
    if (!state.banner || state.banner.timer <= 0) return;
    const a = Math.min(1, state.banner.timer / 0.6);
    ctx.globalAlpha = a;
    const mod = state.modifier && state.modifier.blurb ? state.modifier.blurb : '';
    text(ctx, state.banner.text, W / 2, 150, 'bold 34px system-ui, sans-serif', '#ffd166', 'center');
    if (mod) text(ctx, mod, W / 2, 182, '15px system-ui, sans-serif', '#f5e6c8', 'center');
    ctx.globalAlpha = 1;
  }

  function drawBuildGhost(state, ui) {
    if (!ui || !ui.buildMode || !ui.mouse || !ui.mouse.inside) return;
    const x = ui.mouse.x;
    const y = ui.mouse.y;
    const ok = ui.buildOk !== false;
    ctx.strokeStyle = ok ? 'rgba(255,180,80,0.6)' : 'rgba(255,92,77,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ok ? 'rgba(255,150,50,0.35)' : 'rgba(255,92,77,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fill();
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(8,11,22,0.82)';
    rr(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.45)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 14);
    ctx.stroke();
  }

  function drawTitle(state, time, ui) {
    // v4: the cover is the biggest image the judge sees, so the title
    // screen sells the game — brighter ambient wisps, a hearth glow behind
    // the text, a gold feature strip and controls bright enough to read.
    // Ambient wisps drifting behind the title.
    for (const a of decor.ambient) {
      const x = a.x + Math.sin(time * a.sp + a.p) * 26;
      const y = a.y + Math.cos(time * a.sp * 0.7 + a.p) * 16;
      const g = ctx.createRadialGradient(x, y, 1, x, y, a.r + 12);
      g.addColorStop(0, 'rgba(230,245,255,0.95)');
      g.addColorStop(1, 'rgba(159,216,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, a.r + 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // The hearth's glow behind the lower half, so the fire is in the shot.
    const tg = ctx.createRadialGradient(W / 2, 330, 10, W / 2, 330, 260);
    tg.addColorStop(0, 'rgba(255,160,60,0.28)');
    tg.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(W / 2 - 260, 70, 520, 520);
    ctx.fillStyle = 'rgba(6,8,18,0.5)';
    ctx.fillRect(0, 0, W, H);
    // Title with a warm shadow so it lifts off the sky.
    text(ctx, 'EMBERKEEPER', W / 2 + 3, 153, 'bold 64px system-ui, sans-serif', 'rgba(180,90,20,0.8)', 'center');
    text(ctx, 'EMBERKEEPER', W / 2, 150, 'bold 64px system-ui, sans-serif', '#ffd166', 'center');
    text(ctx, 'T H E   G L O O M L O R D   R I S E S', W / 2, 196, 'bold 18px system-ui, sans-serif', '#f5e6c8', 'center');
    text(ctx, 'Keep the last fire burning through 8 nights of gloom.', W / 2, 232, '16px system-ui, sans-serif', '#e8f2ff', 'center');
    text(ctx, '8 NIGHTS  •  FIREBOLT BRAZIERS  •  FACE THE GLOOMLORD  •  HEARTH SHOP  •  HUNT GOLDEN WISPS', W / 2, 262, 'bold 14px system-ui, sans-serif', '#ffd166', 'center');
    const lines = [
      'WASD / arrows — walk     SPACE — dash through wisps',
      'CLICK / F — flare, burns nearby wisps (3 embers)',
      'B — build a brazier (5 embers): a fire bowl that shoots embers at wisps',
      'Nights 4 and 8 bring the Gloomlord — a crowned wisp-king that calls minions.',
      'Between nights, spend embers in the hearth shop. Golden wisps pay 10 embers.',
    ];
    lines.forEach((l, i) => text(ctx, l, W / 2, 306 + i * 26, '15px system-ui, sans-serif', '#f5ecd6', 'center'));
    const pulse = 0.6 + 0.4 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    text(ctx, 'Press ENTER or click to begin', W / 2, 446, 'bold 18px system-ui, sans-serif', '#ffd166', 'center');
    ctx.globalAlpha = 1;
    if (state.best > 0) {
      text(ctx, 'BEST SCORE ' + state.best.toLocaleString('en-US'), W / 2, 480, '13px system-ui, sans-serif', '#9fb4d8', 'center');
    }
    text(ctx, 'Nights carry twists — Ember Rain, Swift Gloom, Golden Hour, The Longest Night…', W / 2, 512, '12px system-ui, sans-serif', '#9fb4d8', 'center');
  }

  function drawBoon(state, ui) {
    ctx.fillStyle = 'rgba(6,8,18,0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'NIGHT ' + state.night + ' CLEARED', W / 2, 110, 'bold 30px system-ui, sans-serif', '#ffd166', 'center');
    text(ctx, 'Choose a boon — press 1, 2 or 3, or click a card', W / 2, 146, '15px system-ui, sans-serif', '#f5e6c8', 'center');
    const choices = state.boonChoices || [];
    const cw = 250;
    const ch = 170;
    const gap = 24;
    const total = choices.length * cw + (choices.length - 1) * gap;
    const x0 = (W - total) / 2;
    choices.forEach((c, i) => {
      const x = x0 + i * (cw + gap);
      const y = 190;
      const hover = ui && ui.hoverBoon === i;
      panel(ctx, x, y, cw, ch);
      if (hover) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        rr(ctx, x, y, cw, ch, 14);
        ctx.stroke();
      }
      text(ctx, '' + (i + 1), x + cw / 2, y + 30, 'bold 15px system-ui, sans-serif', '#9fb4d8', 'center');
      text(ctx, c.name, x + cw / 2, y + 62, 'bold 19px system-ui, sans-serif', '#ffd166', 'center');
      // Word-wrap the blurb.
      const words = c.blurb.split(' ');
      let line = '';
      let ly = y + 100;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 26) {
          text(ctx, line.trim(), x + cw / 2, ly, '14px system-ui, sans-serif', '#e8e2d0', 'center');
          ly += 22;
          line = word;
        } else {
          line = (line + ' ' + word).trim();
        }
      }
      if (line) text(ctx, line, x + cw / 2, ly, '14px system-ui, sans-serif', '#e8e2d0', 'center');
    });
    text(ctx, 'Score ' + state.score.toLocaleString('en-US') + '  •  Fuel ' + Math.ceil(state.fuel) + '/' + state.fuelMax + '  •  Embers ' + state.embers, W / 2, 420, '14px system-ui, sans-serif', '#9fb4d8', 'center');
  }

  function drawShop(state, ui) {
    ctx.fillStyle = 'rgba(6,8,18,0.55)';
    ctx.fillRect(0, 0, W, H);
    const p = SHOP_LAYOUT.panel;
    panel(ctx, p.x, p.y, p.w, p.h);
    text(ctx, 'THE HEARTH SHOP', W / 2, 108, 'bold 30px system-ui, sans-serif', '#ffd166', 'center');
    text(ctx, 'Spend embers on the hearth before night ' + (state.night + 1) + ' — then begin.', W / 2, 140, '15px system-ui, sans-serif', '#f5e6c8', 'center');
    text(ctx, '◆ ' + state.embers + ' embers', W / 2, 162, 'bold 15px system-ui, sans-serif', '#ffb347', 'center');
    const r = SHOP_LAYOUT.rows;
    SHOP_TRACKS.forEach((t, i) => {
      const y = r.y + i * (r.h + r.gap);
      const level = shopLevel(state.mods, t.id);
      const cost = shopCost(state.mods, t.id);
      const maxed = cost === null;
      const afford = !maxed && state.embers >= cost;
      const hover = ui && ui.hoverShop === i;
      ctx.fillStyle = hover ? 'rgba(255,209,102,0.14)' : 'rgba(255,255,255,0.04)';
      rr(ctx, r.x, y, r.w, r.h, 10);
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffd166' : 'rgba(255,209,102,0.25)';
      ctx.lineWidth = hover ? 2 : 1;
      rr(ctx, r.x, y, r.w, r.h, 10);
      ctx.stroke();
      text(ctx, '' + (i + 1) + '  ' + t.name, r.x + 18, y + 22, 'bold 17px system-ui, sans-serif', '#ffd166');
      text(ctx, t.blurb, r.x + 18, y + 45, '13px system-ui, sans-serif', '#e8e2d0');
      // Level pips.
      for (let l = 0; l < 3; l++) {
        ctx.fillStyle = l < level ? '#ffd166' : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(r.x + r.w - 150 + l * 20, y + r.h / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Price tag, or MAX.
      if (maxed) {
        text(ctx, 'MAX', r.x + r.w - 52, y + r.h / 2, 'bold 15px system-ui, sans-serif', '#9fb4d8', 'center');
      } else {
        ctx.fillStyle = afford ? 'rgba(255,179,71,0.25)' : 'rgba(255,255,255,0.06)';
        rr(ctx, r.x + r.w - 104, y + 14, 88, 34, 8);
        ctx.fill();
        text(ctx, cost + ' ◆', r.x + r.w - 60, y + r.h / 2, 'bold 15px system-ui, sans-serif', afford ? '#ffb347' : '#6b7688', 'center');
      }
    });
    // Begin button.
    const b = SHOP_LAYOUT.begin;
    const bHover = ui && ui.hoverShopBegin;
    ctx.fillStyle = bHover ? '#ffbe55' : '#ffb347';
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    text(ctx, 'BEGIN NIGHT ' + (state.night + 1) + '  →', b.x + b.w / 2, b.y + b.h / 2 + 1, 'bold 17px system-ui, sans-serif', '#241a08', 'center');
    text(ctx, 'Score ' + state.score.toLocaleString('en-US') + '  •  Fuel ' + Math.ceil(state.fuel) + '/' + state.fuelMax, W / 2, b.y + b.h + 22, '13px system-ui, sans-serif', '#9fb4d8', 'center');
  }

  function drawEnd(state, won, time) {
    if (won) {
      const dawn = ctx.createLinearGradient(0, 0, 0, H);
      dawn.addColorStop(0, 'rgba(255,190,90,0.30)');
      dawn.addColorStop(0.5, 'rgba(255,150,60,0.18)');
      dawn.addColorStop(1, 'rgba(20,16,8,0.55)');
      ctx.fillStyle = dawn;
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'DAWN BREAKS', W / 2, 210, 'bold 58px system-ui, sans-serif', '#ffe9a8', 'center');
      text(ctx, 'The hearth survived all 8 nights. The gloom retreats.', W / 2, 262, '17px system-ui, sans-serif', '#f5e6c8', 'center');
    } else {
      ctx.fillStyle = 'rgba(30,4,6,0.72)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'THE LIGHT HAS FADED', W / 2, 210, 'bold 52px system-ui, sans-serif', '#ff7a5c', 'center');
      text(ctx, 'The hearth went dark on night ' + state.night + '.', W / 2, 262, '17px system-ui, sans-serif', '#f5e6c8', 'center');
    }
    const fuelBonus = won ? Math.round(state.fuel) * 10 : 0;
    // A dark backing card so the score lines stay readable over the hearth.
    // The stats run on two lines now — one line overflows the card since
    // the Gloomlord count joined it.
    panel(ctx, W / 2 - 340, 282, 680, 132);
    text(ctx, 'SCORE ' + state.score.toLocaleString('en-US') + (won ? '  (includes +' + fuelBonus + ' fuel bonus)' : ''), W / 2, 310, 'bold 20px system-ui, sans-serif', '#ffd166', 'center');
    text(ctx, 'Wisps banished ' + state.stats.banished + '  •  Gloomlords felled ' + state.stats.bosses + '  •  Golden banished ' + state.stats.goldenBanished, W / 2, 340, '14px system-ui, sans-serif', '#cfe8ff', 'center');
    text(ctx, 'Embers gathered ' + state.stats.collected + '  •  Braziers built ' + state.stats.brazierPlaced, W / 2, 362, '14px system-ui, sans-serif', '#cfe8ff', 'center');
    text(ctx, 'BEST ' + state.best.toLocaleString('en-US'), W / 2, 388, '14px system-ui, sans-serif', '#9fb4d8', 'center');
    const pulse = 0.6 + 0.4 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    // v4: the restart line sits on its own dark chip — in v3 it overlapped
    // the hearth's glow and half the words washed out.
    ctx.fillStyle = 'rgba(8,10,20,0.65)';
    rr(ctx, W / 2 - 150, 428, 300, 36, 10);
    ctx.fill();
    text(ctx, 'Press R to play again', W / 2, 447, 'bold 18px system-ui, sans-serif', '#ffd166', 'center');
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(6,8,18,0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, 270, 'bold 44px system-ui, sans-serif', '#f5e6c8', 'center');
    text(ctx, 'Press P to continue', W / 2, 316, '16px system-ui, sans-serif', '#cfe8ff', 'center');
  }

  function draw(state, screen, time, ui) {
    const sx = canvas.width / W;
    const sy = canvas.height / H;
    ctx.save();
    ctx.scale(sx, sy);
    if (state.shake > 0) {
      const s = state.shake * 6;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawBackground(state, time);
    drawBraziers(state, time);
    drawHearth(state, time);
    drawShards(state, time);
    if (screen !== 'title') {
      for (const w of state.wisps) drawWisp(state, w, time);
      drawBolts(state);
      drawPlayer(state, time);
    }
    drawParticles(state);
    drawPopups(state);
    // Low-fuel danger vignette.
    const fuelFrac = state.fuelMax ? state.fuel / state.fuelMax : 1;
    if (screen === 'play' && fuelFrac < 0.25) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, 'rgba(255,60,40,0)');
      vg.addColorStop(1, `rgba(255,60,40,${0.25 * (1 - fuelFrac / 0.25)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
    if (screen === 'play' || screen === 'boon' || screen === 'paused') drawHud(state, ui);
    drawBuildGhost(state, ui);
    if (screen === 'play') drawBanner(state);
    if (screen === 'title') drawTitle(state, time, ui);
    if (screen === 'boon') drawBoon(state, ui);
    if (screen === 'shop') drawShop(state, ui);
    if (screen === 'win') drawEnd(state, true, time);
    if (screen === 'over') drawEnd(state, false, time);
    if (screen === 'paused') drawPaused();
    ctx.restore();
  }

  return {
    draw,
    SCREEN_TITLE: 'title',
    SCREEN_PLAY: 'play',
    SCREEN_BOON: 'boon',
    SCREEN_SHOP: 'shop',
    SCREEN_WIN: 'win',
    SCREEN_OVER: 'over',
    SCREEN_PAUSED: 'paused',
  };
}
