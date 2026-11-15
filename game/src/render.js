// Everything Emberkeeper shows, drawn on one canvas: the night forest, the
// hearth, the keeper and the wisps, the HUD, and the title / boon / pause /
// end screens. It reads the world's state and never changes it.
import { FIELD, FLARE, HEARTH, NIGHTS, PLAYER } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BOON = 'boon';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const WISP_COLORS = {
  wisp: { body: '#a8c8e8', glow: '#5f8fd0', eye: '#0b1c33' },
  dart: { body: '#c9a8e8', glow: '#8f5fd0', eye: '#1c0b33' },
  splitter: { body: '#a8e8c9', glow: '#4fb585', eye: '#0b331f' },
  brute: { body: '#e8a8a8', glow: '#d05f5f', eye: '#330b0b' },
};

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = FIELD.width * devicePixelRatio;
  canvas.height = FIELD.height * devicePixelRatio;
  context.scale(devicePixelRatio, devicePixelRatio);

  // Stars and pine silhouettes, fixed once from a seed so the forest never shifts.
  const scenery = createRandom(20261116);
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: scenery.range(0, FIELD.width), y: scenery.range(0, FIELD.height * 0.55), radius: scenery.range(0.5, 1.8), twinkle: scenery.range(0, Math.PI * 2) });
  }
  const pines = [];
  for (let i = 0; i < 26; i += 1) {
    pines.push({ x: scenery.range(-20, FIELD.width + 20), base: scenery.range(FIELD.height * 0.72, FIELD.height + 10), height: scenery.range(60, 150), width: scenery.range(28, 52) });
  }
  const groundTufts = [];
  for (let i = 0; i < 40; i += 1) {
    groundTufts.push({ x: scenery.range(0, FIELD.width), y: scenery.range(FIELD.height * 0.8, FIELD.height - 6), size: scenery.range(3, 8) });
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawBackground(time) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, '#0a1030');
    sky.addColorStop(0.55, '#131b3d');
    sky.addColorStop(1, '#1d2b45');
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    const moon = context.createRadialGradient(330, 52, 4, 330, 52, 75);
    moon.addColorStop(0, 'rgba(235, 238, 255, 0.9)');
    moon.addColorStop(0.25, 'rgba(210, 218, 255, 0.35)');
    moon.addColorStop(1, 'rgba(210, 218, 255, 0)');
    context.fillStyle = moon;
    context.fillRect(250, 0, 170, 135);
    context.fillStyle = '#e8ecff';
    context.beginPath();
    context.arc(330, 52, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c9d2f2';
    context.beginPath();
    context.arc(323, 46, 5, 0, Math.PI * 2);
    context.arc(338, 59, 4, 0, Math.PI * 2);
    context.fill();

    for (const star of stars) {
      const alpha = 0.35 + 0.3 * Math.sin(time * 1.4 + star.twinkle);
      context.globalAlpha = Math.max(0.05, alpha);
      context.fillStyle = '#dfe6ff';
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // Pine silhouettes along the bottom, darkest first, then nearer ones.
    for (const pine of pines) {
      context.fillStyle = 'rgba(6, 12, 28, 0.85)';
      context.beginPath();
      context.moveTo(pine.x - pine.width / 2, pine.base);
      context.lineTo(pine.x, pine.base - pine.height);
      context.lineTo(pine.x + pine.width / 2, pine.base);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(pine.x - pine.width * 0.32, pine.base - pine.height * 0.45);
      context.lineTo(pine.x, pine.base - pine.height * 1.05);
      context.lineTo(pine.x + pine.width * 0.32, pine.base - pine.height * 0.45);
      context.closePath();
      context.fill();
    }
    context.fillStyle = '#101c33';
    context.fillRect(0, FIELD.height - 26, FIELD.width, 26);
    context.fillStyle = '#0d1830';
    for (const tuft of groundTufts) {
      context.beginPath();
      context.moveTo(tuft.x - tuft.size, tuft.y);
      context.lineTo(tuft.x, tuft.y - tuft.size * 1.6);
      context.lineTo(tuft.x + tuft.size, tuft.y);
      context.closePath();
      context.fill();
    }
  }

  function drawHearth(state, time) {
    const flicker = 1 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.04;
    const glow = context.createRadialGradient(HEARTH.x, HEARTH.y, 10, HEARTH.x, HEARTH.y, 190 * flicker);
    glow.addColorStop(0, 'rgba(255, 176, 66, 0.34)');
    glow.addColorStop(0.5, 'rgba(255, 140, 50, 0.12)');
    glow.addColorStop(1, 'rgba(255, 140, 50, 0)');
    context.fillStyle = glow;
    context.fillRect(HEARTH.x - 200, HEARTH.y - 200, 400, 400);

    // Stone ring.
    context.fillStyle = '#3a3f4d';
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, HEARTH.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b2f3a';
    context.beginPath();
    context.arc(HEARTH.x, HEARTH.y, HEARTH.radius - 9, 0, Math.PI * 2);
    context.fill();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      context.fillStyle = '#4a5060';
      context.beginPath();
      context.arc(HEARTH.x + Math.cos(angle) * (HEARTH.radius - 4), HEARTH.y + Math.sin(angle) * (HEARTH.radius - 4), 6, 0, Math.PI * 2);
      context.fill();
    }

    // The flame: three layered tongues that sway with the time.
    const flameHeight = 44 * flicker * (0.35 + 0.65 * (state.fuel / Math.max(1, state.fuelMax)));
    const layers = [
      ['#ff7a2a', 20, flameHeight],
      ['#ffb347', 13, flameHeight * 0.72],
      ['#ffe9a8', 7, flameHeight * 0.45],
    ];
    for (const [color, width, height] of layers) {
      const sway = Math.sin(time * 5) * 5;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(HEARTH.x - width, HEARTH.y + 6);
      context.quadraticCurveTo(HEARTH.x - width * 0.7, HEARTH.y - height * 0.5, HEARTH.x + sway, HEARTH.y - height);
      context.quadraticCurveTo(HEARTH.x + width * 0.7, HEARTH.y - height * 0.5, HEARTH.x + width, HEARTH.y + 6);
      context.closePath();
      context.fill();
    }
    // Logs.
    context.strokeStyle = '#5a3a22';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(HEARTH.x - 16, HEARTH.y + 8);
    context.lineTo(HEARTH.x + 16, HEARTH.y + 2);
    context.moveTo(HEARTH.x - 16, HEARTH.y + 2);
    context.lineTo(HEARTH.x + 16, HEARTH.y + 8);
    context.stroke();
  }

  function drawWisp(wisp, time) {
    const colors = WISP_COLORS[wisp.kind];
    const bob = Math.sin(time * 3 + wisp.wobble) * 3;
    const y = wisp.y + bob;
    const glow = context.createRadialGradient(wisp.x, y, 2, wisp.x, y, wisp.radius * 2.2);
    glow.addColorStop(0, colors.glow);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = 0.35;
    context.fillStyle = glow;
    context.fillRect(wisp.x - wisp.radius * 2.5, y - wisp.radius * 2.5, wisp.radius * 5, wisp.radius * 5);
    context.globalAlpha = 1;

    // A wavy ghost body: a dome with a rippling tail.
    context.fillStyle = wisp.flash > 0 ? '#ffffff' : colors.body;
    context.beginPath();
    context.moveTo(wisp.x - wisp.radius, y + wisp.radius * 0.4);
    context.arc(wisp.x, y, wisp.radius, Math.PI, 0);
    const ripples = 3;
    for (let i = 0; i <= ripples; i += 1) {
      const x = wisp.x + wisp.radius - (i * 2 * wisp.radius) / ripples;
      const tailY = y + wisp.radius * 0.4 + Math.sin(time * 6 + wisp.wobble + i * 1.7) * 4 + (i % 2 === 0 ? 8 : 0);
      context.lineTo(x, tailY);
    }
    context.closePath();
    context.fill();

    // Eyes, and a crown of spikes for the brute.
    const eyeOffset = wisp.radius * 0.38;
    context.fillStyle = colors.eye;
    context.beginPath();
    context.arc(wisp.x - eyeOffset, y - wisp.radius * 0.15, Math.max(2, wisp.radius * 0.16), 0, Math.PI * 2);
    context.arc(wisp.x + eyeOffset, y - wisp.radius * 0.15, Math.max(2, wisp.radius * 0.16), 0, Math.PI * 2);
    context.fill();
    if (wisp.kind === 'brute') {
      context.fillStyle = '#7a2a2a';
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(wisp.x + i * wisp.radius * 0.5 - 4, y - wisp.radius * 0.8);
        context.lineTo(wisp.x + i * wisp.radius * 0.5, y - wisp.radius * 1.35);
        context.lineTo(wisp.x + i * wisp.radius * 0.5 + 4, y - wisp.radius * 0.8);
        context.closePath();
        context.fill();
      }
    }
    // Health pips for the tough kinds.
    if (wisp.maxHp > 1) {
      context.fillStyle = 'rgba(10, 16, 48, 0.8)';
      roundRect(wisp.x - 14, y - wisp.radius - 12, 28, 5, 2);
      context.fill();
      context.fillStyle = '#ff8a6b';
      roundRect(wisp.x - 14, y - wisp.radius - 12, 28 * (wisp.hp / wisp.maxHp), 5, 2);
      context.fill();
    }
  }

  function drawPlayer(state, time) {
    const player = state.player;
    // Lantern light: a soft pool around the keeper.
    const aura = context.createRadialGradient(player.x, player.y, 8, player.x, player.y, 130);
    aura.addColorStop(0, 'rgba(255, 205, 110, 0.20)');
    aura.addColorStop(1, 'rgba(255, 205, 110, 0)');
    context.fillStyle = aura;
    context.fillRect(player.x - 140, player.y - 140, 280, 280);

    // Cloak.
    context.fillStyle = '#5b4a8a';
    context.beginPath();
    context.moveTo(player.x, player.y - 16);
    context.quadraticCurveTo(player.x + 13, player.y + 2, player.x + 11, player.y + 15);
    context.lineTo(player.x - 11, player.y + 15);
    context.quadraticCurveTo(player.x - 13, player.y + 2, player.x, player.y - 16);
    context.fill();
    // Hood and face.
    context.fillStyle = '#6b5a9a';
    context.beginPath();
    context.arc(player.x, player.y - 12, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2c98a';
    context.beginPath();
    context.arc(player.x, player.y - 11, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1433';
    context.beginPath();
    context.arc(player.x - 2.5, player.y - 12, 1.2, 0, Math.PI * 2);
    context.arc(player.x + 2.5, player.y - 12, 1.2, 0, Math.PI * 2);
    context.fill();
    // The lantern, held out toward the facing direction, swinging gently.
    const swing = Math.sin(time * 2.2) * 0.12;
    const lanternX = player.x + player.facing.x * 18 + Math.sin(swing) * 3;
    const lanternY = player.y + 2 + player.facing.y * 10;
    context.strokeStyle = '#3a2f5a';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(player.x + player.facing.x * 8, player.y + 2);
    context.lineTo(lanternX, lanternY - 6);
    context.stroke();
    const lanternGlow = context.createRadialGradient(lanternX, lanternY, 1, lanternX, lanternY, 22);
    lanternGlow.addColorStop(0, 'rgba(255, 220, 130, 0.95)');
    lanternGlow.addColorStop(1, 'rgba(255, 180, 60, 0)');
    context.fillStyle = lanternGlow;
    context.beginPath();
    context.arc(lanternX, lanternY, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2a2140';
    roundRect(lanternX - 5, lanternY - 7, 10, 14, 3);
    context.fill();
    context.fillStyle = '#ffd76a';
    context.beginPath();
    context.arc(lanternX, lanternY, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawShards(state, time) {
    for (const shard of state.shards) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 6 + shard.x);
      const glow = context.createRadialGradient(shard.x, shard.y, 1, shard.x, shard.y, 16);
      glow.addColorStop(0, `rgba(255, 170, 60, ${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(shard.x, shard.y, 16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffb347';
      context.beginPath();
      context.moveTo(shard.x, shard.y - 8);
      context.lineTo(shard.x + 5, shard.y);
      context.lineTo(shard.x, shard.y + 8);
      context.lineTo(shard.x - 5, shard.y);
      context.closePath();
      context.fill();
      context.fillStyle = '#ffe9a8';
      context.beginPath();
      context.moveTo(shard.x, shard.y - 4);
      context.lineTo(shard.x + 2.5, shard.y);
      context.lineTo(shard.x, shard.y + 4);
      context.lineTo(shard.x - 2.5, shard.y);
      context.closePath();
      context.fill();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.ring) {
        context.globalAlpha = alpha * 0.8;
        context.strokeStyle = particle.color;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * (1 - alpha * 0.4), 0, Math.PI * 2);
        context.stroke();
      } else {
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    for (const pop of state.popups) {
      context.globalAlpha = Math.max(0, pop.life / pop.maxLife);
      context.font = 'bold 15px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = pop.color;
      context.fillText(pop.text, pop.x, pop.y);
    }
    context.globalAlpha = 1;
  }

  function drawBar(x, y, width, height, fraction, fill, label) {
    context.fillStyle = 'rgba(8, 12, 30, 0.75)';
    roundRect(x, y, width, height, height / 2);
    context.fill();
    context.fillStyle = fill;
    if (fraction > 0) {
      roundRect(x + 2, y + 2, (width - 4) * Math.min(1, fraction), height - 4, (height - 4) / 2);
      context.fill();
    }
    context.font = 'bold 11px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillStyle = '#e8ecff';
    context.fillText(label, x + 8, y + height / 2 + 4);
  }

  function drawHud(state, screen) {
    const fuelFraction = state.fuel / Math.max(1, state.fuelMax);
    const fuelColor = fuelFraction > 0.5 ? '#ff9a3d' : fuelFraction > 0.25 ? '#ff7a2a' : '#ff4a3d';
    drawBar(16, 14, 220, 22, fuelFraction, fuelColor, `HEARTH  ${Math.ceil(state.fuel)} / ${state.fuelMax}`);
    context.font = 'bold 17px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillStyle = '#ffe9a8';
    context.fillText(`NIGHT ${state.night} / ${NIGHTS}`, 16, 62);
    context.fillStyle = '#e8ecff';
    context.font = '16px system-ui, sans-serif';
    context.fillText(`Score  ${state.score}`, 16, 86);
    if (state.combo >= 2) {
      context.fillStyle = '#ffd76a';
      context.font = 'bold 16px system-ui, sans-serif';
      context.fillText(`COMBO x${Math.min(state.combo, 5)}`, 16, 110);
    }
    context.textAlign = 'right';
    context.fillStyle = '#ffb347';
    context.font = 'bold 17px system-ui, sans-serif';
    context.fillText(`◆ ${state.embers} embers`, FIELD.width - 16, 32);
    context.fillStyle = '#cfe8ff';
    context.font = '15px system-ui, sans-serif';
    context.fillText(`Wisps left: ${state.toSpawn - state.spawned + state.wisps.length}`, FIELD.width - 16, 56);
    const dashReady = state.player.dashCooldown <= 0;
    context.fillStyle = dashReady ? '#9fe8a8' : '#7a86a8';
    context.fillText(dashReady ? 'SPACE — dash ready' : 'dash…', FIELD.width - 16, 80);
    context.fillStyle = '#ffd76a';
    context.fillText(`Click — flare · ${Math.max(1, FLARE.cost + (state.mods?.flareCostDelta ?? 0))} ◆`, FIELD.width - 16, 102);
    context.textAlign = 'left';
    if (screen === SCREEN_PLAY && state.boonsOwned.length > 0) {
      context.font = '13px system-ui, sans-serif';
      context.fillStyle = '#9fb2d8';
      context.fillText(`Boons: ${state.boonsOwned.length}`, 16, FIELD.height - 14);
    }
    context.font = '13px system-ui, sans-serif';
    context.fillStyle = '#8a96b8';
    context.textAlign = 'right';
    context.fillText('P pause · M sound', FIELD.width - 16, FIELD.height - 14);
    context.textAlign = 'left';
  }

  function dimScreen(alpha) {
    context.fillStyle = `rgba(6, 10, 28, ${alpha})`;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dimScreen(0.45);
    context.textAlign = 'center';
    context.fillStyle = '#ffd76a';
    context.font = 'bold 64px Georgia, serif';
    context.fillText('EMBERKEEPER', FIELD.width / 2, 150);
    context.fillStyle = '#cfe8ff';
    context.font = '20px Georgia, serif';
    context.fillText('Keep the last hearth burning through eight nights of gloom.', FIELD.width / 2, 190);
    context.font = '16px system-ui, sans-serif';
    context.fillStyle = '#e8ecff';
    const lines = [
      'WASD / arrows — walk the keeper    ·    SPACE — dash through wisps',
      'Click / F — flare: banish nearby wisps (costs 3 embers)',
      'Your lantern burns wisps that drift too close. Catch ember shards to feed the fire.',
      'Wisps that reach the hearth steal its fuel. If the fire dies, the night wins.',
      'Clear a night, then choose a boon. Survive night 8 to see the dawn.',
    ];
    lines.forEach((line, i) => context.fillText(line, FIELD.width / 2, 240 + i * 26));
    context.fillStyle = '#ffd76a';
    context.font = 'bold 22px system-ui, sans-serif';
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3);
    context.globalAlpha = blink;
    context.fillText('Press SPACE or click to begin', FIELD.width / 2, 400);
    context.globalAlpha = 1;
    if (best > 0) {
      context.fillStyle = '#9fb2d8';
      context.font = '16px system-ui, sans-serif';
      context.fillText(`Best score: ${best}`, FIELD.width / 2, 436);
    }
  }

  function drawBoon(state) {
    dimScreen(0.6);
    context.textAlign = 'center';
    context.fillStyle = '#ffd76a';
    context.font = 'bold 34px Georgia, serif';
    context.fillText(`Night ${state.night} is clear — the dawn is closer`, FIELD.width / 2, 110);
    context.fillStyle = '#cfe8ff';
    context.font = '18px system-ui, sans-serif';
    context.fillText('Choose a boon for the nights ahead (click, or press 1 / 2 / 3)', FIELD.width / 2, 146);
    const cardWidth = 250;
    const cardHeight = 170;
    const gap = 24;
    const total = cardWidth * 3 + gap * 2;
    const startX = (FIELD.width - total) / 2;
    const top = 200;
    state.boonChoices.forEach((boon, i) => {
      const x = startX + i * (cardWidth + gap);
      context.fillStyle = 'rgba(24, 32, 64, 0.95)';
      roundRect(x, top, cardWidth, cardHeight, 14);
      context.fill();
      context.strokeStyle = '#ffb347';
      context.lineWidth = 2;
      roundRect(x, top, cardWidth, cardHeight, 14);
      context.stroke();
      context.fillStyle = '#ffd76a';
      context.font = 'bold 20px system-ui, sans-serif';
      context.fillText(`[${i + 1}] ${boon.name}`, x + cardWidth / 2, top + 44);
      context.fillStyle = '#e8ecff';
      context.font = '15px system-ui, sans-serif';
      const words = boon.blurb.split(' ');
      let line = '';
      let lineY = top + 84;
      for (const word of words) {
        if (context.measureText(`${line} ${word}`.trim()).width > cardWidth - 36) {
          context.fillText(line.trim(), x + cardWidth / 2, lineY);
          line = word;
          lineY += 22;
        } else {
          line = `${line} ${word}`;
        }
      }
      context.fillText(line.trim(), x + cardWidth / 2, lineY);
    });
    context.fillStyle = '#9fb2d8';
    context.font = '15px system-ui, sans-serif';
    context.fillText(`Score ${state.score}  ·  Fuel ${Math.ceil(state.fuel)} / ${state.fuelMax}  ·  Embers ${state.embers}`, FIELD.width / 2, 430);
  }

  function drawPaused() {
    dimScreen(0.55);
    context.textAlign = 'center';
    context.fillStyle = '#e8ecff';
    context.font = 'bold 44px Georgia, serif';
    context.fillText('Paused', FIELD.width / 2, 280);
    context.font = '18px system-ui, sans-serif';
    context.fillStyle = '#cfe8ff';
    context.fillText('Press P or click to keep playing', FIELD.width / 2, 320);
  }

  function drawOver(state, best) {
    dimScreen(0.6);
    context.textAlign = 'center';
    context.fillStyle = '#ff8a6b';
    context.font = 'bold 52px Georgia, serif';
    context.fillText('THE LIGHT HAS FADED', FIELD.width / 2, 200);
    context.fillStyle = '#e8ecff';
    context.font = '20px system-ui, sans-serif';
    context.fillText(`The gloom took the hearth on night ${state.night}.`, FIELD.width / 2, 246);
    context.font = 'bold 26px system-ui, sans-serif';
    context.fillStyle = '#ffd76a';
    context.fillText(`Score ${state.score}`, FIELD.width / 2, 300);
    context.font = '17px system-ui, sans-serif';
    context.fillStyle = '#cfe8ff';
    context.fillText(`Wisps banished: ${state.stats.banished}   ·   Embers gathered: ${state.stats.collected}   ·   Best: ${best}`, FIELD.width / 2, 336);
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3);
    context.globalAlpha = blink;
    context.fillStyle = '#ffd76a';
    context.font = 'bold 21px system-ui, sans-serif';
    context.fillText('Press R or click to try again', FIELD.width / 2, 396);
    context.globalAlpha = 1;
  }

  function drawWin(state, best) {
    // Dawn breaks over the field: a warm wash replaces the night.
    const dawn = context.createLinearGradient(0, 0, 0, FIELD.height);
    dawn.addColorStop(0, 'rgba(255, 190, 110, 0.28)');
    dawn.addColorStop(1, 'rgba(255, 140, 80, 0.12)');
    context.fillStyle = dawn;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    dimScreen(0.35);
    context.textAlign = 'center';
    context.fillStyle = '#ffe9a8';
    context.font = 'bold 58px Georgia, serif';
    context.fillText('DAWN BREAKS', FIELD.width / 2, 200);
    context.fillStyle = '#e8ecff';
    context.font = '20px Georgia, serif';
    context.fillText('Eight nights held. The hearth still burns, and the gloom is gone.', FIELD.width / 2, 246);
    context.font = 'bold 26px system-ui, sans-serif';
    context.fillStyle = '#ffd76a';
    context.fillText(`Score ${state.score}`, FIELD.width / 2, 300);
    context.font = '17px system-ui, sans-serif';
    context.fillStyle = '#cfe8ff';
    context.fillText(`Fuel left: ${Math.ceil(state.fuel)} (worth ${Math.round(state.fuel) * 10} bonus)   ·   Wisps banished: ${state.stats.banished}   ·   Best: ${best}`, FIELD.width / 2, 336);
    const blink = 0.65 + 0.35 * Math.sin(state.time * 3);
    context.globalAlpha = blink;
    context.fillStyle = '#ffd76a';
    context.font = 'bold 21px system-ui, sans-serif';
    context.fillText('Press R or click to play again', FIELD.width / 2, 396);
    context.globalAlpha = 1;
  }

  function draw(state, screen, best) {
    context.clearRect(0, 0, FIELD.width, FIELD.height);
    drawBackground(state.time);
    drawHearth(state, state.time);
    drawShards(state, state.time);
    for (const wisp of state.wisps) drawWisp(wisp, state.time);
    if (screen !== SCREEN_TITLE) drawPlayer(state, state.time);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_BOON || screen === SCREEN_PAUSED) drawHud(state, screen);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_BOON) drawBoon(state);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_WIN) drawWin(state, best);
    // A soft vignette, so the edges of the night feel dark.
    const vignette = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.45,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_BOON, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN };
}
