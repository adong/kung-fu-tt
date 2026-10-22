/* Kung Fu TT: controls. The keyboard for one or two brothers, and an on-screen d-pad with PUNCH, KICK and SPECIAL
   buttons for touch. Presses are latched until the game reads them, so a tap shorter than a frame still counts, and
   every fresh press counts as a wiggle when a hugger has you: any key at all (even ones the game doesn't use), and a
   tap anywhere on the screen (js/game.js calls mashAll).
   The keys are as they look on screen: → always walks right. js/game.js turns that into the rules' direction.
     Teddy (player 1): A D walk, W jump, S crouch, F punch, G kick, H special, T call / high five
     Tommy (player 2): ← → walk, ↑ jump, ↓ crouch, K punch, L kick, J special, Enter call / high five
   In 1 player both sets drive you, and Space jumps too. */
(function () {
  'use strict';

  const KEYS = {
    KeyA: [0, 'l'], KeyD: [0, 'r'], KeyW: [0, 'jump'], KeyS: [0, 'down'],
    KeyF: [0, 'punch'], KeyG: [0, 'kick'], KeyH: [0, 'special'], KeyT: [0, 'call'],
    ArrowLeft: [1, 'l'], ArrowRight: [1, 'r'], ArrowUp: [1, 'jump'], ArrowDown: [1, 'down'],
    KeyK: [1, 'punch'], KeyL: [1, 'kick'], KeyJ: [1, 'special'], Enter: [1, 'call'], NumpadEnter: [1, 'call'],
    Space: [0, 'jump'],
  };
  const HELD = { l: 1, r: 1, down: 1 };

  let twoPlayer = false;
  const held = [{}, {}];      // [side][code] = action
  const latched = [{}, {}];   // [side][action] = true
  const mash = [0, 0];
  const pads = [{ l: false, r: false, down: false }, { l: false, r: false, down: false }];

  const sideOf = (s) => (twoPlayer ? s : 0);

  const NOT_A_WIGGLE = /^(Shift|Control|Alt|Meta|CapsLock|Tab|Fn|OS)/;
  function onKey(e, down) {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    const m = KEYS[e.code];
    if (!m) {
      // any other key still wiggles you free from a hug
      if (down && !e.repeat && !NOT_A_WIGGLE.test(e.code || '')) mashAll();
      return false;
    }
    if (e.code === 'Space' && twoPlayer) return false;
    const side = sideOf(m[0]), act = m[1];
    if (down) {
      if (!e.repeat) { mash[side]++; latched[side][act] = true; } // a tap shorter than a frame still turns you round
      if (HELD[act]) held[side][e.code] = act;
    } else delete held[side][e.code];
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (onKey(e, true) && (e.code.startsWith('Arrow') || e.code === 'Space')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', clear);

  function clear() {
    for (const s of [0, 1]) {
      for (const k in held[s]) delete held[s][k];
      for (const k in latched[s]) delete latched[s][k];
      pads[s].l = pads[s].r = pads[s].down = false;
      mash[s] = 0;
    }
  }

  // What side `s` is doing this frame. Presses are used up.
  function read(s) {
    const h = held[s], l = latched[s], pd = pads[s];
    const has = (a) => { for (const k in h) if (h[k] === a) return true; return false; };
    const o = {
      l: has('l') || pd.l || !!l.l, r: has('r') || pd.r || !!l.r, down: has('down') || pd.down || !!l.down,
      jump: !!l.jump, punch: !!l.punch, kick: !!l.kick, special: !!l.special, call: !!l.call, mash: mash[s],
    };
    for (const k in l) delete l[k];
    mash[s] = 0;
    return o;
  }

  function press(s, act) { latched[s][act] = true; mash[s]++; }
  function mashAll() { mash[0]++; mash[1]++; }

  // ---------------------------------------------------------------- touch

  function bindTouch(root) {
    // the d-pad: one pad per side; where your thumb is decides left / right / jump / crouch (diagonals too)
    root.querySelectorAll('[data-pad]').forEach((el) => {
      const side = +el.dataset.pad;
      let id = null, up = false;
      const set = (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const s = sideOf(side), pd = pads[s];
        const was = `${pd.l}${pd.r}${pd.down}${up}`;
        pd.l = dx < -0.32; pd.r = dx > 0.32; pd.down = dy > 0.4;
        const nowUp = dy < -0.4;
        if (nowUp && !up) latched[s].jump = true;
        up = nowUp;
        if (`${pd.l}${pd.r}${pd.down}${up}` !== was) mash[s]++;
        el.dataset.dir = `${pd.l ? 'l' : ''}${pd.r ? 'r' : ''}${up ? 'u' : ''}${pd.down ? 'd' : ''}`;
      };
      const end = () => { id = null; up = false; const pd = pads[sideOf(side)]; pd.l = pd.r = pd.down = false; el.dataset.dir = ''; };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        id = e.pointerId;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no pointer */ }
        set(e);
      });
      el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
      el.addEventListener('pointerup', (e) => { if (e.pointerId === id) end(); });
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', (e) => { if (e.pointerId === id) end(); });
    });
    root.querySelectorAll('[data-act]').forEach((el) => {
      const side = +el.dataset.side, act = el.dataset.act;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        press(sideOf(side), act);
        el.classList.add('down');
      });
      const up = () => el.classList.remove('down');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    });
  }

  window.KF_INPUT = {
    read, press, mashAll, clear, bindTouch,
    setTwoPlayer(v) { twoPlayer = !!v; clear(); },
  };
})();
