/* Kung Fu TT: play checks in the page, driven by real key events (keydown / keyup on window) and real pointer events,
   the way a kid plays. Run them with game.playCheck() (about a minute; game.playCheck({ quick: true }) for less).
     direction - on every floor, → (or D) moves the brother right on screen and ← (or A) left, in 1 and 2 players and on
                 the touch d-pad; he faces the way he walked, and a punch or a low kick hits whoever is there
     grab      - a hug always ends: doing nothing (EASY lets go after about 1.5 s), mashing any key at all (even ones the
                 game doesn't use), mashing the arrows, or tapping the screen; the WIGGLE FREE! sign shows while held
     ko        - in 2 players, a knocked-out brother nobody helps still gets up on his own after a while
     figures   - nothing from the title screen stays in the hall once a floor starts
     softlock  - a "keyboard kid" (the autopilot's choices turned into screen-side key presses, plus random mashing)
                 plays floors on EASY and NORMAL, 1 and 2 players: no error, nobody stuck in a hug, a stagger or a
                 crouch, and every floor finished
   Each check was run against the old code first and failed there (see the README). */
(function () {
  'use strict';
  const Sim = window.KF_SIM, Bot = window.KF_BOT;
  const DT = 1 / 60;
  const game = () => window.game;
  const KEYS1 = { left: 'KeyA', right: 'KeyD', down: 'KeyS', jump: 'KeyW', punch: 'KeyF', kick: 'KeyG', special: 'KeyH', call: 'KeyT' };
  const KEYS2 = { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', jump: 'ArrowUp', punch: 'KeyK', kick: 'KeyL', special: 'KeyJ', call: 'Enter' };
  // keys a kid might bash that the game doesn't use for fighting (never M, P, Esc or ?: those mute, pause and help)
  const NOISE = ['KeyQ', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'Digit5', 'KeyU', 'KeyI', 'KeyO', 'KeyY', 'Backquote'];
  const BASH = ['KeyF', 'KeyG', 'KeyH', 'KeyW', 'KeyK', 'KeyL', 'KeyJ', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].concat(NOISE);

  const held = new Set();
  function fire(type, code) { window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true })); }
  function down(code) { fire('keydown', code); held.add(code); }
  function up(code) { fire('keyup', code); held.delete(code); }
  function tap(code) { fire('keydown', code); fire('keyup', code); }
  function hold(code, on) { if (on && !held.has(code)) down(code); else if (!on && held.has(code)) up(code); }
  function releaseAll() { for (const c of [...held]) up(c); }

  const step = (s) => game().step(s);
  const stepFast = (s) => game().step(s, { draw: false }); // the game skips drawing when it can
  const W = () => game().world();
  // where a brother's 3D model stands, left to right on screen (the camera looks straight down -z, so world x is screen x)
  const sx = (slot) => (game().modelX ? game().modelX(slot) : W().dir * W().players[slot].u);
  function quietRoom(o) {
    game().start(Object.assign({ floor: 0, mode: '1p', hero: 'teddy', difficulty: 'easy' }, o));
    step(1.6);
    const w = W();
    w.noSpawn = true; w.enemies = []; w.shots = []; w.pots = []; w.items = [];
    // the middle of the hall, away from both ends
    w.players.forEach((p, i) => { p.u = 20 + i * 1.2; });
    w.cam = 20.6;
    step(0.05);
    return w;
  }
  const result = (name, ok, detail) => ({ name, ok: !!ok, detail: detail || '' });

  // ---------------------------------------------------------------- → goes right, on every floor

  function direction() {
    const out = [];
    for (let f = 0; f < 5; f++) {
      for (const mode of ['1p', '2p']) {
        const w = quietRoom({ floor: f, mode, difficulty: 'easy' });
        const sides = mode === '2p' ? [0, 1] : [0];
        for (const slot of sides) {
          const K = mode === '2p' ? (slot ? KEYS2 : KEYS1) : KEYS1;
          const alt = mode === '1p' ? KEYS2 : null;
          for (const keys of alt ? [K, alt] : [K]) {
            const x0 = sx(slot);
            down(keys.right); step(0.5); up(keys.right); step(0.05);
            const x1 = sx(slot);
            const faceR = w.dir * w.players[slot].face > 0;
            down(keys.left); step(0.5); up(keys.left); step(0.05);
            const x2 = sx(slot);
            const faceL = w.dir * w.players[slot].face < 0;
            const ok = x1 > x0 + 1 && x2 < x1 - 1 && faceR && faceL;
            out.push(result(`floor ${f + 1} ${mode} ${w.players[slot].id}: ${keys.right === 'KeyD' ? 'D / A' : '→ / ←'} move right / left on screen`, ok,
              `screen x ${x0.toFixed(0)} → ${x1.toFixed(0)} → ${x2.toFixed(0)}, faces ${faceR ? 'right' : 'LEFT'} then ${faceL ? 'left' : 'RIGHT'}`));
          }
        }
      }
      // a punch and a low kick land on whoever stands to the right on screen
      {
        const w = quietRoom({ floor: f, mode: '1p', difficulty: 'easy' });
        const p = w.players[0];
        tap('ArrowRight'); step(0.05);
        const hug = Sim.spawn(w, 'thrower', p.u + w.dir * 1.0, { state: 'cool', st: 9 });
        tap('KeyF'); step(0.4);
        const imp = Sim.spawn(w, 'imp', p.u + w.dir * 1.2, { hopT: 9 });
        down('KeyS'); tap('KeyG'); step(0.4); up('KeyS'); step(0.05);
        const ok = hug.hp < 2 && (imp.state === 'bonked' || imp.gone);
        out.push(result(`floor ${f + 1}: after →, a punch and a low kick hit what's on the right`, ok, `thrower hp ${hug.hp}, imp ${imp.state}`));
      }
      // the GO arrow points the way the floor goes
      {
        const w = quietRoom({ floor: f, mode: '1p', difficulty: 'easy' });
        w.players[0].u = 2;
        step(0.05);
        const go = document.getElementById('go');
        const okGo = go.classList.contains(w.dir > 0 ? 'toR' : 'toL');
        out.push(result(`floor ${f + 1}: the GO arrow points ${w.dir > 0 ? 'right' : 'left'}, the way the floor goes`, okGo, go.className));
      }
    }
    // the touch d-pad: thumb on the right of the pad walks right on screen
    for (const f of [0, 1]) {
      const w = quietRoom({ floor: f, mode: '1p', difficulty: 'easy' });
      const touch = document.getElementById('touch');
      const wasHidden = touch.classList.contains('hidden');
      touch.classList.remove('hidden');
      const pad = touch.querySelector('.c0 .pad, .c0 .stick, [data-pad="0"], [data-stick="0"]');
      const r = pad.getBoundingClientRect();
      const ev = (type, x) => pad.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
      const x0 = sx(0);
      ev('pointerdown', r.right - 8); step(0.5); ev('pointerup', r.right - 8); step(0.05);
      const x1 = sx(0);
      ev('pointerdown', r.left + 8); step(0.5); ev('pointerup', r.left + 8); step(0.05);
      const x2 = sx(0);
      if (wasHidden) touch.classList.add('hidden');
      out.push(result(`floor ${f + 1}: the touch d-pad's ▶ moves right and ◀ left on screen`, x1 > x0 + 1 && x2 < x1 - 1, `screen x ${x0.toFixed(0)} → ${x1.toFixed(0)} → ${x2.toFixed(0)}`));
    }
    releaseAll();
    return out;
  }

  // ---------------------------------------------------------------- a hug always ends

  function grab() {
    const out = [];
    const styles = {
      'doing nothing': () => null,
      'mashing keys the game doesn\'t use (Q Z X…)': (i) => (i % 15 === 0 ? NOISE[(i / 15) % NOISE.length] : null),
      'mashing ← →': (i) => (i % 15 === 0 ? ((i / 15) % 2 ? 'ArrowLeft' : 'ArrowRight') : null),
      'tapping the screen': (i) => (i % 15 === 0 ? 'tap' : null),
    };
    const LIMIT = { easy: { 'doing nothing': 1.7 }, normal: { 'doing nothing': 3.6 } };
    for (const diff of ['easy', 'normal']) {
      for (const n of [1, 2]) {
        for (const [style, keyAt] of Object.entries(styles)) {
          if (n === 2 && style !== 'mashing keys the game doesn\'t use (Q Z X…)' && style !== 'doing nothing') continue;
          const w = quietRoom({ floor: 0, mode: '1p', difficulty: diff });
          const p = w.players[0];
          for (let i = 0; i < n; i++) Sim.spawn(w, 'hugger', p.u + (i ? -1.6 : 1.6));
          let t = 0;
          while (p.state !== 'grabbed' && t < 4) { step(DT); t += DT; }
          step(0.25);
          const grabbed = p.state === 'grabbed' || w.enemies.some((e) => e.state === 'hug');
          const sign = !document.getElementById('wiggle').classList.contains('hidden');
          const canvas = document.getElementById('game');
          let i = 0, took = Infinity;
          for (; i < 60 * 8; i++) {
            const k = keyAt(i);
            if (k === 'tap') {
              const r = canvas.getBoundingClientRect();
              const o = { pointerId: 9, pointerType: 'touch', clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.5, bubbles: true, cancelable: true };
              canvas.dispatchEvent(new PointerEvent('pointerdown', o)); canvas.dispatchEvent(new PointerEvent('pointerup', o));
            } else if (k) tap(k);
            step(DT);
            if (p.state !== 'grabbed' && !w.enemies.some((e) => e.state === 'hug' && e.grab === 0)) { took = (i + 1) * DT + 0.25; break; }
          }
          const limit = (LIMIT[diff][style]) || (diff === 'easy' ? 1.2 : 2.2) + (n - 1) * 0.6;
          const signOff = document.getElementById('wiggle').classList.contains('hidden') || p.state === 'grabbed';
          const ok = grabbed && took <= limit && sign && !p.ko;
          out.push(result(`${diff}: ${n} hugger${n > 1 ? 's' : ''}, ${style}: free within ${limit} s, WIGGLE FREE! sign showing`, ok && signOff,
            `${grabbed ? '' : 'never grabbed, '}free after ${took === Infinity ? 'never (8 s)' : took.toFixed(2) + ' s'}, sign ${sign ? 'shown' : 'NOT shown'}, hp ${Math.round(p.hp)}`));
        }
      }
    }
    releaseAll();
    return out;
  }

  // ---------------------------------------------------------------- 2 players: nobody stays down for ever

  function ko() {
    const w = quietRoom({ floor: 0, mode: '2p', difficulty: 'normal' });
    const [a, b] = w.players;
    b.u = a.u + 6;
    Sim.hurt(w, b, 999, b.u + 1);
    let t = 0;
    while (b.ko && t < 20) { step(0.25); t += 0.25; }
    return [result('2P: a knocked-out brother nobody helps gets up on his own within 12 s', !b.ko && t <= 12, b.ko ? 'still down after 20 s' : `up after ${t.toFixed(1)} s`)];
  }

  // ---------------------------------------------------------------- nothing left over from the title screen

  function figures() {
    const g = game();
    const out = [];
    const sc = g.scene;
    if (!sc) return [result('figures: the game exposes its scene', false, 'no game.scene')];
    const people = () => {
      let n = 0;
      for (const c of sc.children) {
        if (!c.visible) continue;
        let m = 0;
        c.traverse((o) => { if (o.isMesh) m++; });
        if (m >= 25 && m < 120) n++;
      }
      return n;
    };
    for (const mode of ['1p', '2p']) {
      g.show('title'); step(0.2);
      g.start({ floor: 0, mode, difficulty: 'easy' }); step(0.5);
      const w = W();
      const want = w.players.length + w.enemies.filter((e) => /hugger|thrower|boss|copy/.test(e.type) && e.state !== 'vanish').length;
      const have = people();
      out.push(result(`${mode}: after the title screen, only this floor's people are in the hall`, have === want, `${have} figures for ${want} people`));
    }
    return out;
  }

  // ---------------------------------------------------------------- the keyboard kid: no soft-lock

  function softlock(o) {
    o = o || {};
    const out = [];
    const ALL = [[0, 'easy', '1p', 'tommy'], [1, 'easy', '1p', 'teddy'], [2, 'easy', '1p', 'tommy'], [3, 'easy', '1p', 'teddy'], [4, 'easy', '1p', 'tommy'],
      [0, 'normal', '1p', 'teddy'], [1, 'normal', '1p', 'tommy'], [0, 'easy', '2p'], [1, 'normal', '2p'], [4, 'easy', '2p']];
    const idx = o.runs ? o.runs : o.quick ? [0, 6, 7] : ALL.map((r, i) => i);
    let seed = 0;
    const EVERY = 3; // the kid decides every 3 frames (a 20-a-second kid)
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (const ri of idx) {
      const [f, diff, mode, hero] = ALL[ri];
      seed = (o.seed || 12345) + ri * 7919; // each run replays on its own: softlock({ seed, runs: [ri] })
      const worldSeed = 1 + Math.floor(rnd() * 1e8);
      game().start({ floor: f, mode, hero, difficulty: diff, seed: worldSeed });
      const w = W();
      const mems = w.players.map(() => ({ opts: { call: mode === '1p', callEvery: 15 } }));
      const errs = [];
      const onErr = (e) => errs.push(e.message);
      window.addEventListener('error', onErr);
      const since = w.players.map(() => ({ state: '', t: 0 }));
      const problems = [];
      let t = 0, noise = null, noiseT = 0, crouchStuck = 0, nextTrace = 0;
      const trace = [];
      const LIMIT = 300;
      while (t < LIMIT && (w.phase === 'intro' || w.phase === 'play' || w.phase === 'clear')) {
        // what the autopilot would do, turned into the keys on that side of the screen
        w.players.forEach((p, i) => {
          const K = mode === '2p' ? (i ? KEYS2 : KEYS1) : KEYS1;
          const inp = Bot.bot(w, p, mems[i]);
          let right = w.dir > 0 ? inp.r : inp.l, left = w.dir > 0 ? inp.l : inp.r, dn = !!inp.down;
          if (noise && noise.slot === i) { right = noise.dir === 'r'; left = noise.dir === 'l'; dn = noise.dir === 'd'; }
          hold(K.right, !!right); hold(K.left, !!left); hold(K.down, dn);
          for (const a of ['jump', 'punch', 'kick', 'special', 'call']) if (inp[a]) tap(K[a]);
        });
        // and a kid bashing keys
        if (rnd() < 0.15) tap(BASH[Math.floor(rnd() * BASH.length)]);
        if (!noise && rnd() < 0.024) { noise = { slot: Math.floor(rnd() * w.players.length), dir: 'lrd'[Math.floor(rnd() * 3)] }; noiseT = 0.2 + rnd() * 0.4; }
        if (noise && (noiseT -= DT * EVERY) <= 0) noise = null;
        try { stepFast(DT * EVERY); } catch (e) { errs.push(e.message); break; }
        t += DT * EVERY;
        if (t >= nextTrace) {
          nextTrace += 30;
          const p = w.players[0];
          trace.push(`t${t.toFixed(0)} u${p.u.toFixed(0)} ${p.state} hp${Math.round(p.hp)} lives${w.lives}${w.D.timer ? ' time' + Math.round(w.time) : ''} [${w.enemies.map((e) => e.type + ':' + e.state + '@' + (e.u - p.u).toFixed(0)).join(' ')}]`);
        }
        w.players.forEach((p, i) => {
          const s = since[i];
          if (p.state !== s.state) { s.state = p.state; s.t = 0; } else s.t += DT * EVERY;
          const cap = { grabbed: w.D.grabMax + 0.6, hurt: 1.5, getup: 2.5, highfive: 1.5, ko: mode === '2p' ? 13 : 3 }[p.state];
          if (cap && s.t > cap && problems.length < 3) problems.push(`${p.id} stuck '${p.state}' for ${s.t.toFixed(1)} s at t=${t.toFixed(0)}`);
          const K = mode === '2p' ? (i ? KEYS2 : KEYS1) : KEYS1;
          if (p.crouch && p.state === 'crouch' && !p.move && !held.has(K.down) && !(mode === '1p' && held.has(KEYS2.down))) crouchStuck += DT * EVERY; else crouchStuck = 0;
          if (crouchStuck > 0.4 && problems.length < 3) { problems.push(`${p.id} stuck crouching with no key down at t=${t.toFixed(1)} (phase ${w.phase}, y ${p.y.toFixed(2)}, boss ${w.boss ? w.boss.state : '-'})`); crouchStuck = -1e9; }
        });
        if (problems.length >= 3) break;
      }
      releaseAll();
      window.removeEventListener('error', onErr);
      const done = w.phase === 'done' || w.phase === 'clear';
      if (!done) problems.push(w.phase === 'over' ? 'game over' : `not finished after ${t.toFixed(0)} s (got to ${Math.max(...w.players.map((p) => p.u)).toFixed(0)} of ${w.L} m)`);
      if (problems.length) problems.push('trace: ' + trace.slice(-5).join(' | '));
      if (errs.length) problems.unshift(`error: ${errs[0]}`);
      if (problems.length) problems.push(`replay: KF_PLAYCHECK.softlock({ seed: ${o.seed || 12345}, runs: [${ri}] })`);
      out.push(result(`keyboard kid, ${diff} floor ${f + 1} ${mode}${hero ? ' ' + hero : ''}: finished, never stuck`, problems.length === 0, problems.length ? problems.join('; ') : `${t.toFixed(0)} s, ${w.bonks} bonks, lives ${w.lives}`));
    }
    return out;
  }

  function playCheck(o) {
    o = o || {};
    const g = game();
    const auto = g.autoPause;
    g.autoPause = false;
    if (g.autoplay) g.autoplay(false);
    const t0 = performance.now();
    const groups = { direction: direction(), grab: grab(), ko: ko(), figures: figures(), softlock: softlock(o) };
    g.autoPause = auto;
    let pass = 0, fail = 0;
    const failures = [];
    for (const k in groups) for (const r of groups[k]) { if (r.ok) pass++; else { fail++; failures.push(`${k}: ${r.name} — ${r.detail}`); } }
    g.show('title');
    return { ok: fail === 0, pass, fail, failures, seconds: +((performance.now() - t0) / 1000).toFixed(1), groups };
  }

  window.KF_PLAYCHECK = { playCheck, direction, grab, ko, figures, softlock };
  if (window.game) window.game.playCheck = playCheck;
})();
