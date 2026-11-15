// Emberkeeper v2 — keyboard + mouse, and nothing else. The game reads the
// world through direction() every frame (held keys) and through takeActions()
// (edge-triggered presses, consumed once). Mouse clicks are queued the same
// way: clickPosition() returns the last click and clears it, so a click can
// only place one brazier or press one button.
export const ACTION_DASH = 1;
export const ACTION_FLARE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;
export const ACTION_BUILD = 32;
export const ACTION_RESTART = 64;

const MOVE_KEYS = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouse = { x: 0, y: 0, inside: false };
  let click = null;
  let touch = { active: false, x: 0, y: 0, startX: 0, startY: 0 };

  function toGameCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 960,
      y: ((clientY - rect.top) / rect.height) * 600,
    };
  }

  function onKeyDown(e) {
    if (MOVE_KEYS[e.code]) {
      held.add(e.code);
      e.preventDefault();
      return;
    }
    if (e.code === 'Space') {
      queued |= ACTION_DASH | ACTION_CONFIRM;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyF') { queued |= ACTION_FLARE; return; }
    if (e.code === 'Enter') { queued |= ACTION_CONFIRM; return; }
    if (e.code === 'KeyP' || e.code === 'Escape') { queued |= ACTION_PAUSE; return; }
    if (e.code === 'KeyM') { queued |= ACTION_MUTE; return; }
    if (e.code === 'KeyB') { queued |= ACTION_BUILD; return; }
    if (e.code === 'KeyR') { queued |= ACTION_RESTART; return; }
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onMouseMove(e) {
    const p = toGameCoords(e.clientX, e.clientY);
    mouse = { x: p.x, y: p.y, inside: true };
  }

  function onMouseDown(e) {
    const p = toGameCoords(e.clientX, e.clientY);
    click = p;
  }

  function onMouseLeave() {
    mouse = { x: mouse.x, y: mouse.y, inside: false };
  }

  // Touch: drag to move, tap to flare, double-tap to dash.
  let lastTap = 0;
  function onTouchStart(e) {
    const t = e.touches[0];
    const p = toGameCoords(t.clientX, t.clientY);
    touch = { active: true, x: p.x, y: p.y, startX: p.x, startY: p.y };
    const now = Date.now();
    if (now - lastTap < 300) queued |= ACTION_DASH;
    lastTap = now;
    e.preventDefault();
  }
  function onTouchMove(e) {
    const t = e.touches[0];
    const p = toGameCoords(t.clientX, t.clientY);
    touch.x = p.x; touch.y = p.y;
    e.preventDefault();
  }
  function onTouchEnd(e) {
    if (touch.active && Math.hypot(touch.x - touch.startX, touch.y - touch.startY) < 12) {
      click = { x: touch.x, y: touch.y };
    }
    touch.active = false;
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  function direction() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const v = MOVE_KEYS[code];
      if (v) { x += v.x; y += v.y; }
    }
    if (touch.active) {
      const dx = touch.x - touch.startX;
      const dy = touch.y - touch.startY;
      const len = Math.hypot(dx, dy);
      if (len > 14) {
        x = dx / len;
        y = dy / len;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  function takeActions() {
    const bits = queued;
    queued = 0;
    return bits;
  }

  function mousePosition() {
    return { x: mouse.x, y: mouse.y, inside: mouse.inside };
  }

  function clickPosition() {
    const c = click;
    click = null;
    return c;
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  return { direction, takeActions, mousePosition, clickPosition, detach };
}
