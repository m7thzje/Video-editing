// Invoer voor desktop (toetsenbord + muis) en mobiel (joystick, hop-knop, vegen).

export class Input {
  constructor(canvas, { isTouch }) {
    this.canvas = canvas;
    this.isTouch = isTouch;
    this.keys = new Set();
    this.move = { x: 0, y: 0 }; // x = rechts, y = vooruit
    this.look = { x: 0, y: 0 }; // opgespaarde camera-delta (pixels)
    this.hopPressed = 0;
    this.interactPressed = false;
    this.onTap = null;
    this.enabled = false;
    this.onFirstInteraction = null;

    this.joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
    this.swipeId = null;
    this.swipeLast = { x: 0, y: 0 };
    this.dragging = false;

    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  firstInteraction() {
    if (this.onFirstInteraction) {
      const cb = this.onFirstInteraction;
      this.onFirstInteraction = null;
      cb();
    }
  }

  bindKeyboard() {
    const hopKeys = new Set(['Space']);
    window.addEventListener('keydown', (e) => {
      this.firstInteraction();
      if (!this.enabled) return;
      if (hopKeys.has(e.code)) {
        if (!e.repeat) this.hopPressed++;
        e.preventDefault();
      }
      if (e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'KeyE' || e.code === 'Enter') this.interactPressed = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  bindMouse() {
    const canvas = this.canvas;
    canvas.addEventListener('mousedown', () => {
      this.firstInteraction();
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
        try {
          const r = canvas.requestPointerLock();
          if (r && r.catch) r.catch(() => {});
        } catch {
          /* pointer lock niet beschikbaar: slepen werkt ook */
        }
      }
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement === canvas || this.dragging) {
        this.look.x += e.movementX;
        this.look.y += e.movementY;
      }
    });
  }

  bindTouch() {
    const joyEl = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    const hopBtn = document.getElementById('hop-button');
    const maxR = 45;

    const setKnob = (x, y) => {
      knob.style.transform = `translate(${x}px, ${y}px)`;
    };

    joyEl.addEventListener('pointerdown', (e) => {
      this.firstInteraction();
      if (this.joy.id !== null) return;
      const r = joyEl.getBoundingClientRect();
      this.joy.id = e.pointerId;
      this.joy.cx = r.left + r.width / 2;
      this.joy.cy = r.top + r.height / 2;
      joyEl.setPointerCapture(e.pointerId);
      this.updateJoy(e.clientX, e.clientY, maxR, setKnob);
      e.preventDefault();
    });
    joyEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.updateJoy(e.clientX, e.clientY, maxR, setKnob);
    });
    const endJoy = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null;
      this.joy.x = this.joy.y = 0;
      setKnob(0, 0);
    };
    joyEl.addEventListener('pointerup', endJoy);
    joyEl.addEventListener('pointercancel', endJoy);

    hopBtn.addEventListener('pointerdown', (e) => {
      this.firstInteraction();
      if (this.enabled) this.hopPressed++;
      hopBtn.classList.add('pressed');
      e.preventDefault();
    });
    const release = () => hopBtn.classList.remove('pressed');
    hopBtn.addEventListener('pointerup', release);
    hopBtn.addEventListener('pointercancel', release);
    hopBtn.addEventListener('pointerleave', release);

    const actionBtn = document.getElementById('action-button');
    actionBtn.addEventListener('pointerdown', (e) => {
      this.firstInteraction();
      if (this.enabled) this.interactPressed = true;
      e.preventDefault();
    });

    // Tikken/klikken op het speelveld (bijv. op Puck)
    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!down || !this.enabled) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 12 && performance.now() - down.t < 350 && this.onTap) {
        const locked = document.pointerLockElement === this.canvas;
        this.onTap(locked ? window.innerWidth / 2 : e.clientX, locked ? window.innerHeight / 2 : e.clientY);
      }
      down = null;
    });

    // Vegen over het speelveld draait de camera
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.firstInteraction();
      if (this.swipeId !== null) return;
      this.swipeId = e.pointerId;
      this.swipeLast.x = e.clientX;
      this.swipeLast.y = e.clientY;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.swipeId || !this.enabled) return;
      this.look.x += (e.clientX - this.swipeLast.x) * 1.6;
      this.look.y += (e.clientY - this.swipeLast.y) * 1.6;
      this.swipeLast.x = e.clientX;
      this.swipeLast.y = e.clientY;
    });
    const endSwipe = (e) => {
      if (e.pointerId === this.swipeId) this.swipeId = null;
    };
    this.canvas.addEventListener('pointerup', endSwipe);
    this.canvas.addEventListener('pointercancel', endSwipe);

    // Voorkom scrollen/zoomen in mobiele browsers
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  updateJoy(px, py, maxR, setKnob) {
    let dx = px - this.joy.cx;
    let dy = py - this.joy.cy;
    const len = Math.hypot(dx, dy);
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    setKnob(dx, dy);
    const nx = dx / maxR;
    const ny = dy / maxR;
    const mag = Math.hypot(nx, ny);
    // kleine dode zone
    const scale = mag < 0.15 ? 0 : (mag - 0.15) / 0.85 / mag;
    this.joy.x = nx * scale;
    this.joy.y = -ny * scale;
  }

  /** Leest de huidige looprichting (x = rechts, y = vooruit). */
  poll() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    x += this.joy.x;
    y += this.joy.y;
    const total = Math.hypot(x, y);
    if (total > 1) {
      x /= total;
      y /= total;
    }
    this.move.x = x;
    this.move.y = y;
    return this.move;
  }

  consumeHop() {
    const h = this.hopPressed;
    this.hopPressed = 0;
    return h;
  }

  consumeInteract() {
    const i = this.interactPressed;
    this.interactPressed = false;
    return i;
  }

  consumeLook() {
    const l = { x: this.look.x, y: this.look.y };
    this.look.x = this.look.y = 0;
    return l;
  }

  releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
