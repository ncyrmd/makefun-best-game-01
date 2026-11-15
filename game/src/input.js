// Keyboard + mouse, read once per frame. Movement keys are held; dash, flare,
// confirm and pause are edge-triggered actions the loop consumes.
export const ACTION_DASH = 1;
export const ACTION_FLARE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, inside: false };

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      if (!event.repeat) actions |= ACTION_DASH;
      event.preventDefault();
    } else if (event.code === 'KeyF') {
      if (!event.repeat) actions |= ACTION_FLARE;
    } else if (event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    // CSS pixels relative to the canvas; callers scale to field coordinates.
    mouse = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      inside: true,
    };
  }

  function onMouseDown(event) {
    onMouseMove(event);
    actions |= ACTION_FLARE;
  }

  function onClick() {
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('click', onClick);

  return {
    /** Held movement as a normalised {x, y} vector. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const vector = MOVE_KEYS[code];
        if (vector) {
          x += vector[0];
          y += vector[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    mousePosition() {
      return mouse;
    },
  };
}
