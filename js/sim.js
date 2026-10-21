/* Kung Fu TT: the rules. Pure logic with no Three.js and no page, so tools/check.js runs it in node too.
   One floor is one lane. Positions are `u`, metres along the hall from the stairs you came up (u = 0) to the stairs
   up (u = L): forward is always +u, and js/game.js mirrors odd floors so floor 1 walks left and floor 2 walks right.
   `y` is height above the floor. Everything steps at a fixed 1/60 s (Sim.step), and the shell turns W.events into
   effects and sounds. Nobody is hurt in this temple: bonked baddies fly off with a BONK! and poof into stars. */
(function (root) {
  'use strict';
  const FLOORS = root.KF_FLOORS;
  const DT = 1 / 60;
  const GRAV = 24, JUMP_V = 8.2, WALK = 3.3;
  const STAND_H = 1.85, CROUCH_H = 1.05;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sgn = (v) => (v < 0 ? -1 : 1);

  // 🐣 EASY is for Tommy (5): slower and fewer baddies, gentle bosses, no timer, food everywhere.
  // 🔥 NORMAL is for Teddy (8): the classic pace and a relaxed timer.
  const DIFF = {
    easy: {
      lives: 5, timer: 0, speed: 0.62, gap: [3.0, 4.6], max: 3, take: 0.5, mash: 4, grabMax: 2.4, drain: 5, drainFloor: 15,
      drop: 0.45, bossHp: 0.55, tele: 1.55, shot: 0.68, bossDmg: 0.5, spec: 0.6, lenK: 0.8, revive: 70, startFood: true,
    },
    normal: {
      lives: 3, timer: 180, speed: 1, gap: [1.1, 2.1], max: 5, take: 1, mash: 7, grabMax: 4.5, drain: 9, drainFloor: 0,
      drop: 0.12, bossHp: 1, tele: 1, shot: 1, bossDmg: 1, spec: 1, lenK: 1, revive: 50, startFood: false,
    },
  };

  // Moves, in 60ths of a second: s = start-up, a = active, len = whole move. y0..y1 is the height it hits at.
  const MOVES = {
    hpunch: { s: 4, a: 4, len: 15, reach: 1.2, y0: 1.05, y1: 1.75, dmg: 1, kb: 1.6, word: 'POW!' },
    lpunch: { s: 4, a: 4, len: 15, reach: 1.15, y0: 0.0, y1: 0.75, dmg: 1, kb: 1.4, crouch: true, word: 'BOP!' },
    hkick: { s: 6, a: 5, len: 21, reach: 1.6, y0: 0.95, y1: 1.8, dmg: 1.5, kb: 2.2, word: 'WHAM!' },
    lkick: { s: 6, a: 5, len: 21, reach: 1.65, y0: 0.0, y1: 0.55, dmg: 1.5, kb: 2.0, crouch: true, word: 'BONK!' },
    jkick: { s: 3, a: 20, len: 999, reach: 1.5, rel: true, y0: 0.1, y1: 1.3, dmg: 2, kb: 3, air: true, word: 'HI-YAH!' },
    jpunch: { s: 3, a: 10, len: 999, reach: 1.2, rel: true, y0: 0.6, y1: 1.5, dmg: 1.5, kb: 2, air: true, word: 'POW!' },
    // Teddy's boxing combo: jab, jab, straight
    combo: { len: 46, hits: [[6, 9], [14, 17], [26, 31]], reach: 1.75, y0: 0, y1: 1.95, dmg: [1.5, 1.5, 2.5], kb: [0.8, 0.8, 4.5], words: ['JAB!', 'JAB!', 'BOOM!'], special: true },
    // Tommy's Y pose: a stun wave all round him
    ywave: { len: 40, waveAt: 12, special: true },
  };
  const SPECIAL = { teddy: 'combo', tommy: 'ywave' };
  const SPEC_CD = { combo: 5, ywave: 6 };

  const DEF = {
    hugger: { hp: 1, h: 1.8, w: 0.35, speed: 2.0, score: 100 },
    thrower: { hp: 2, h: 1.85, w: 0.35, speed: 1.6, score: 200 },
    imp: { hp: 1, h: 0.7, w: 0.3, speed: 2.2, score: 300 },
    dragon: { hp: 1, h: 0.45, w: 0.5, speed: 2.2, score: 150 },
    confetti: { hp: 1, h: 0.6, w: 0.3, speed: 1.6, score: 150 },
    copy: { hp: 1, h: 2.1, w: 0.4, speed: 0, score: 100 },
  };
  const SMALL = { imp: 1, dragon: 1, confetti: 1, copy: 1 };

  const BOSSES = {
    staff: { hp: 22, h: 2.05, w: 0.42, speed: 2.2 },
    bao: { hp: 24, h: 2.05, w: 0.5, speed: 2.0 },
    belly: { hp: 30, h: 2.8, w: 0.75, speed: 1.1, heavy: true },
    puff: { hp: 18, h: 2.15, w: 0.42, speed: 2.0 },
    grand: { hp: 34, h: 2.05, w: 0.42, speed: 2.6 },
  };

  const FOOD = { dumpling: { heal: 20, emoji: '🥟' }, bun: { heal: 35, emoji: '🍞' } };
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌', '🥟'];

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- the world

  function makePlayer(id, slot, u) {
    return {
      id, slot, u, y: 0, vy: 0, vu: 0, face: 1, state: 'idle', st: 0, hp: 100, maxHp: 100, crouch: false,
      move: null, mt: 0, hitSet: null, hitWin: -1, airAtk: false, inv: 0, noGrab: 0, wiggle: 0, grabT: 0,
      specCd: 0, power: 0, ko: false, koT: 0, reviveT: 0, buf: null, bufT: 0, walking: false, hurtT: 0,
    };
  }

  function create(o) {
    o = o || {};
    const diff = o.difficulty === 'normal' ? 'normal' : 'easy';
    const D = DIFF[diff];
    const fi = clamp(o.floor | 0, 0, FLOORS.length - 1);
    const F = FLOORS[fi];
    const L = Math.round(F.len * D.lenK);
    const halfW = o.halfW || 7;
    const W = {
      DT, D, F, fi, diff, mode: o.mode === '2p' ? '2p' : '1p', L, dir: fi % 2 === 0 ? -1 : 1, halfW, rnd: rng(o.seed || 1),
      t: 0, phase: 'intro', pt: 0, players: [], enemies: [], shots: [], strikes: [], items: [], pots: [], treats: [], waves: [],
      events: [], cam: 0, arena: false, camA: L - halfW + 0.5, boss: null, spawnT: 2.2, nextId: 1,
      score: o.score || 0, lives: o.lives != null ? o.lives : D.lives, time: D.timer, buddy: null, hfCd: 0,
      buddyWho: null, final: fi === FLOORS.length - 1, noSpawn: !!o.noSpawn, spawned: 0, bonks: 0, calls: 0,
    };
    if (W.mode === '2p') W.players.push(makePlayer('teddy', 0, 1.0), makePlayer('tommy', 1, 2.2));
    else W.players.push(makePlayer(o.hero === 'tommy' ? 'tommy' : 'teddy', 0, 1.5));
    W.buddyWho = W.players[0].id === 'teddy' ? 'tommy' : 'teddy';
    if (o.buddyWho) W.buddyWho = o.buddyWho;
    W.cam = clamp(W.players[0].u + 1, halfW - 0.8, W.camA);
    // pots hang from the ceiling between the start and the boss's room
    const n = diff === 'easy' ? Math.max(1, F.pots - 1) : F.pots;
    const a = 12, b = W.camA - halfW - 3;
    for (let i = 0; i < n; i++) {
      const u = a + ((i + 0.5) / n) * (b - a) + (W.rnd() - 0.5) * 3;
      W.pots.push({ id: W.nextId++, u, y: 4.7, vy: 0, state: 'hang', st: 0, kind: W.rnd() < 0.5 ? 'dragon' : 'confetti' });
    }
    if (D.startFood) for (const f of [0.3, 0.62]) W.items.push({ id: W.nextId++, u: f * W.camA, y: 0, kind: f < 0.5 ? 'dumpling' : 'bun', emoji: f < 0.5 ? '🥟' : '🍞', heal: f < 0.5 ? 20 : 35, t: 0, life: Infinity });
    return W;
  }

  const ev = (W, type, o) => { const e = Object.assign({ type }, o); W.events.push(e); return e; };
  const alive = (W) => W.players.filter((p) => !p.ko);
  const lead = (W) => { let best = null; for (const p of W.players) if (!p.ko && (!best || p.u > best.u)) best = p; return best || W.players[0]; };
  function nearestPlayer(W, u) {
    let best = null, bd = Infinity;
    for (const p of W.players) { if (p.ko) continue; const d = Math.abs(p.u - u); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  const minPlayerDist = (W, u) => { let d = Infinity; for (const p of W.players) d = Math.min(d, Math.abs(p.u - u)); return d; };
  const onScreen = (W, u, m) => Math.abs(u - W.cam) <= W.halfW + (m || 0);
  const bodyTop = (p) => (p.y > 0.01 ? p.y + 1.5 : p.crouch ? CROUCH_H : STAND_H);
  const bodyBot = (p) => (p.y > 0.01 ? p.y + 0.25 : 0);

  // ---------------------------------------------------------------- players

  function hurt(W, p, dmg, fromU, o) {
    o = o || {};
    if (p.ko || p.inv > 0 || p.state === 'celebrate' || p.state === 'highfive' || p.state === 'getup' || W.phase !== 'play') return false;
    if (p.move && MOVES[p.move].special) return false; // specials are safe
    p.hp = Math.max(0, p.hp - dmg);
    releaseHuggers(W, p, 'drop');
    p.move = null;
    p.hurtT = 0.4;
    ev(W, 'hurt', { p: p.slot, u: p.u, y: p.y + 1.2, dmg });
    if (p.hp <= 0) { knockOut(W, p); return true; }
    p.state = 'hurt';
    p.st = 0.35;
    p.vu = -sgn(fromU - p.u) * (o.kb || 2.5);
    p.inv = 1.0;
    return true;
  }

  function knockOut(W, p) {
    p.ko = true;
    p.state = 'ko';
    p.koT = 0;
    p.reviveT = 0;
    p.move = null;
    p.y = 0; p.vy = 0; p.vu = 0;
    releaseHuggers(W, p, 'drop');
    ev(W, 'ko', { p: p.slot, u: p.u });
  }

  function loseLife(W, why) {
    W.lives = Math.max(0, W.lives - 1);
    ev(W, 'life', { why, lives: W.lives });
    if (W.lives <= 0) { W.phase = 'over'; W.pt = 0; ev(W, 'over', {}); return; }
    for (const p of W.players) {
      releaseHuggers(W, p, 'drop');
      p.ko = false; p.hp = p.maxHp; p.state = 'getup'; p.st = 1.0; p.inv = 2.2; p.move = null; p.y = 0; p.vy = 0; p.vu = 0;
      // shoo everyone nearby away so getting up is safe
      for (const e of W.enemies) {
        if (e.type === 'boss' || e.state === 'bonked') continue;
        if (Math.abs(e.u - p.u) < 3) { e.u = p.u + sgn(e.u - p.u) * 3; e.state = 'dizzy'; e.st = 1.5; }
      }
    }
    if (W.D.timer) W.time = W.D.timer;
  }

  function startMove(W, p, name) {
    p.move = name;
    p.mt = 0;
    p.hitSet = new Set();
    p.hitWin = -1;
    p.buf = null;
    const M = MOVES[name];
    if (M.air) p.airAtk = true;
    if (M.special) {
      p.specCd = SPEC_CD[name] * W.D.spec * (p.power > 0 ? 0.35 : 1);
      p.inv = Math.max(p.inv, M.len / 60 + 0.1);
      ev(W, 'special', { p: p.slot, who: p.id, name, u: p.u });
    } else ev(W, 'swing', { p: p.slot, name });
  }

  function stepPlayer(W, p, inp) {
    inp = inp || {};
    p.inv = Math.max(0, p.inv - DT);
    p.noGrab = Math.max(0, p.noGrab - DT);
    p.specCd = Math.max(0, p.specCd - DT);
    p.power = Math.max(0, p.power - DT);
    p.hurtT = Math.max(0, p.hurtT - DT);
    p.walking = false;
    // remember a press made while busy, for a few frames
    const press = inp.special ? 'special' : inp.kick ? 'kick' : inp.punch ? 'punch' : inp.jump ? 'jump' : null;
    if (press) { p.buf = press; p.bufT = 0.15; } else if (p.buf) { p.bufT -= DT; if (p.bufT <= 0) p.buf = null; }

    if (p.state === 'ko') { p.koT += DT; return; }
    if (p.state === 'grabbed') {
      p.grabT += DT;
      p.wiggle += inp.mash || 0;
      p.buf = null;
      return;
    }
    if (p.state === 'hurt' || p.state === 'getup' || p.state === 'highfive' || p.state === 'celebrate') {
      p.st -= DT;
      if (p.y > 0 || p.vy > 0) airborne(W, p);
      else { p.u += p.vu * DT; p.vu *= Math.pow(0.02, DT); }
      if (p.st <= 0 && p.state !== 'celebrate') { p.state = 'idle'; p.vu = 0; }
      return;
    }
    const inAir = p.y > 0 || p.vy > 0;
    if (inAir) {
      airborne(W, p);
      if (p.move) advanceMove(W, p);
      if (!p.move && !p.airAtk && p.buf && (p.buf === 'kick' || p.buf === 'punch')) startMove(W, p, p.buf === 'kick' ? 'jkick' : 'jpunch');
      return;
    }
    if (p.move) {
      advanceMove(W, p);
      if (p.move) return;
    }
    // free on the ground
    const dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dx) p.face = dx;
    p.crouch = !!inp.down;
    const act = p.buf;
    if (act === 'special' && p.specCd <= 0) { startMove(W, p, SPECIAL[p.id]); return; }
    if (act === 'punch') { startMove(W, p, p.crouch ? 'lpunch' : 'hpunch'); return; }
    if (act === 'kick') { startMove(W, p, p.crouch ? 'lkick' : 'hkick'); return; }
    if (act === 'jump' && !p.crouch) {
      p.buf = null;
      p.vy = JUMP_V;
      p.vu = dx * WALK * 0.95;
      p.airAtk = false;
      p.state = 'jump';
      ev(W, 'jump', { p: p.slot });
      return;
    }
    p.state = p.crouch ? 'crouch' : dx ? 'walk' : 'idle';
    if (!p.crouch && dx) { p.u += dx * WALK * DT; p.walking = true; }
  }

  function airborne(W, p) {
    p.vy -= GRAV * DT;
    p.y += p.vy * DT;
    p.u += p.vu * DT;
    if (p.y <= 0) {
      p.y = 0; p.vy = 0; p.vu = p.state === 'hurt' ? p.vu : 0;
      if (p.move && MOVES[p.move].air) p.move = null;
      p.airAtk = false;
      if (p.state === 'jump') p.state = 'idle';
      ev(W, 'land', { p: p.slot, u: p.u });
    }
  }

  function advanceMove(W, p) {
    const M = MOVES[p.move];
    p.mt++;
    if (p.move === 'combo') {
      const wi = M.hits.findIndex(([a, b]) => p.mt >= a && p.mt <= b);
      if (wi >= 0) {
        if (wi !== p.hitWin) { p.hitWin = wi; p.hitSet = new Set(); p.u += p.face * 0.22; ev(W, 'jab', { p: p.slot, i: wi }); }
        attackBox(W, p, M.reach, M.y0, M.y1, M.dmg[wi], M.kb[wi], M.words[wi], wi === 2);
      }
    } else if (p.move === 'ywave') {
      if (p.mt === M.waveAt) {
        W.waves.push({ u: p.u, r: 0, max: 3.8, by: p.slot, hit: new Set() });
        ev(W, 'wave', { p: p.slot, u: p.u });
      }
    } else if (p.mt > M.s && p.mt <= M.s + M.a) {
      const y0 = M.rel ? p.y + M.y0 : M.y0, y1 = M.rel ? p.y + M.y1 : M.y1;
      attackBox(W, p, M.reach, y0, y1, M.dmg, M.kb, M.word, false);
    }
    if (p.mt >= M.len) p.move = null;
  }

  // Whatever is in front of p, between heights y0 and y1, gets hit once per move (or per combo jab).
  function attackBox(W, p, reach, y0, y1, dmg, kb, word, big) {
    const a = p.face > 0 ? p.u - 0.15 : p.u - reach, b = p.face > 0 ? p.u + reach : p.u + 0.15;
    const k = p.power > 0 ? 2 : 1;
    for (const e of W.enemies) {
      if (p.hitSet.has(e.id) || !hittable(e)) continue;
      if (e.u + e.w < a || e.u - e.w > b) continue;
      if (e.y + e.h < y0 || e.y > y1) continue;
      p.hitSet.add(e.id);
      hitEnemy(W, e, dmg * k, p.face, kb, word, p, big);
    }
    for (const s of W.shots) {
      if (!s.bop || s.dead || p.hitSet.has(s.id)) continue;
      if (s.u + s.w < a || s.u - s.w > b || s.y1 < y0 || s.y0 > y1) continue;
      p.hitSet.add(s.id);
      s.dead = true;
      W.score += 50;
      ev(W, 'bop', { u: s.u, y: (s.y0 + s.y1) / 2, kind: s.kind });
    }
    for (const pot of W.pots) {
      if (pot.state !== 'fall' || p.hitSet.has(pot.id)) continue;
      if (Math.abs(pot.u - p.u - p.face * reach * 0.5) > reach * 0.5 + 0.35 || pot.y > y1 || pot.y + 0.7 < y0) continue;
      p.hitSet.add(pot.id);
      pot.state = 'gone';
      W.score += 100;
      ev(W, 'potBreak', { u: pot.u, y: pot.y, empty: true });
    }
  }

  const hittable = (e) => e.state !== 'bonked' && e.state !== 'enter' && e.state !== 'vanish' && e.state !== 'beaten' && !e.gone;

  function hitEnemy(W, e, dmg, face, kb, word, p, big) {
    if (e.type === 'boss') return hitBoss(W, e, dmg, face, word, p, big);
    e.hp -= dmg;
    if (e.hp <= 0) return bonk(W, e, face, word);
    if (e.grab != null) releaseOne(W, e);
    e.state = 'hurt'; e.st = 0.35; e.vu = face * kb;
    ev(W, 'hit', { u: e.u, y: e.y + e.h * 0.6, word, id: e.id, big });
  }

  function bonk(W, e, face, word) {
    if (e.grab != null) releaseOne(W, e);
    e.state = 'bonked'; e.st = 0; e.vu = face * 5.5; e.vy = 6.5; e.hp = 0;
    W.score += DEF[e.type] ? DEF[e.type].score : 100;
    W.bonks++;
    ev(W, 'bonk', { u: e.u, y: e.y + e.h * 0.6, id: e.id, etype: e.type, word: word || 'BONK!' });
    // food sometimes falls out (lots of it on easy)
    if (e.type !== 'copy' && W.rnd() < W.D.drop) {
      const kind = W.rnd() < 0.7 ? 'dumpling' : 'bun';
      W.items.push({ id: W.nextId++, u: clamp(e.u, 0.5, W.L - 0.8), y: 1.2, vy: 3, kind, emoji: FOOD[kind].emoji, heal: FOOD[kind].heal, t: 0, life: 12 });
    }
  }

  // ---------------------------------------------------------------- huggers

  const huggersOn = (W, p) => W.enemies.filter((e) => e.grab === p.slot && e.state === 'hug');

  function releaseOne(W, e) {
    const p = W.players[e.grab];
    e.grab = null;
    if (p && p.state === 'grabbed' && huggersOn(W, p).length === 0) { p.state = 'idle'; p.noGrab = 0.8; }
  }

  // how: 'free' (wiggled out: they get dizzy), 'drop' (just let go)
  function releaseHuggers(W, p, how) {
    for (const e of W.enemies) {
      if (e.grab !== p.slot) continue;
      e.grab = null;
      if (e.state === 'hug') { e.state = 'dizzy'; e.st = how === 'free' ? 1.4 : 0.8; e.vu = sgn(e.u - p.u) * 3; }
    }
    if (p.state === 'grabbed') { p.state = 'idle'; p.noGrab = 0.9; p.wiggle = 0; }
  }

  function stepGrabs(W) {
    for (const p of W.players) {
      if (p.state !== 'grabbed') continue;
      const hs = huggersOn(W, p);
      if (!hs.length) { p.state = 'idle'; p.noGrab = 0.8; continue; }
      const floor = W.D.drainFloor;
      if (p.hp > floor) p.hp = Math.max(floor, p.hp - W.D.drain * hs.length * DT);
      if (p.hp <= 0) { knockOut(W, p); continue; }
      const need = W.D.mash + (hs.length - 1) * 2;
      if (p.wiggle >= need) {
        releaseHuggers(W, p, 'free');
        ev(W, 'free', { p: p.slot, u: p.u });
        continue;
      }
      // a hug can't last for ever: a tired hugger lets go
      for (const e of hs) {
        e.hugT += DT;
        if (e.hugT >= W.D.grabMax) { e.grab = null; e.state = 'dizzy'; e.st = 1.0; e.vu = sgn(e.u - p.u) * 2; ev(W, 'tired', { u: e.u, id: e.id }); }
      }
      if (!huggersOn(W, p).length) { p.state = 'idle'; p.noGrab = 0.9; p.wiggle = 0; ev(W, 'free', { p: p.slot, u: p.u, tired: true }); }
    }
  }

  // ---------------------------------------------------------------- baddies

  function spawn(W, type, u, extra) {
    const d = DEF[type];
    const e = Object.assign({
      id: W.nextId++, type, u, y: 0, vy: 0, vu: 0, face: 1, state: 'walk', st: 0, hp: d.hp, h: d.h, w: d.w,
      grab: null, hugT: 0, cool: 0, band: null, want: 0, hopT: 0.3 + W.rnd() * 0.5, fuse: 3.2, life: Infinity,
    }, extra || {});
    const p = nearestPlayer(W, u);
    if (p) e.face = sgn(p.u - u);
    W.enemies.push(e);
    W.spawned++;
    ev(W, 'spawn', { id: e.id, etype: type, u, near: minPlayerDist(W, u) });
    return e;
  }

  function stepSpawner(W) {
    if (W.noSpawn || W.arena || W.phase !== 'play') return;
    W.spawnT -= DT;
    if (W.spawnT > 0) return;
    const [g0, g1] = W.D.gap;
    W.spawnT = g0 + W.rnd() * (g1 - g0);
    const active = W.enemies.filter((e) => e.state !== 'bonked' && !SMALL[e.type]).length;
    if (active >= W.D.max) return;
    const mix = W.F.mix;
    let r = W.rnd() * (mix.hugger + mix.thrower + mix.imp), type = 'hugger';
    if ((r -= mix.hugger) > 0) type = (r -= mix.thrower) > 0 ? 'imp' : 'thrower';
    let ahead = W.rnd() < 0.65;
    const front = W.cam + W.halfW + 1.0, back = W.cam - W.halfW - 1.0;
    if (front > W.L - 1) ahead = false;
    if (back < 0.4) ahead = true;
    const u = ahead ? front : back;
    if (u > W.L - 1 || u < 0.4 || minPlayerDist(W, u) < 2) return; // never on top of a brother
    spawn(W, type, u, { want: type === 'thrower' ? (W.diff === 'easy' ? 4.8 : 4.0) + W.rnd() * 1.2 : 0 });
  }

  function stepEnemy(W, e) {
    const D = W.D;
    if (e.state === 'bonked') {
      e.st += DT; e.vy -= GRAV * 0.7 * DT; e.y = Math.max(0, e.y + e.vy * DT); e.u += e.vu * DT;
      if (e.st >= 0.75) { e.gone = true; ev(W, 'poof', { u: e.u, y: e.y + 0.5, id: e.id }); }
      return;
    }
    if (e.life !== Infinity) { e.life -= DT; if (e.life <= 0) { e.gone = true; ev(W, 'poof', { u: e.u, y: 1, id: e.id, copy: true }); return; } }
    const p = nearestPlayer(W, e.u);
    const du = p ? p.u - e.u : 0, dist = Math.abs(du);
    // landing from hops and knock-backs
    if (e.y > 0 || e.vy > 0) {
      e.vy -= GRAV * (e.type === 'imp' ? 0.9 : 1) * DT; e.y += e.vy * DT; e.u += e.vu * DT;
      if (e.y <= 0) { e.y = 0; e.vy = 0; if (e.type !== 'imp') e.vu = 0; }
    }
    if (e.state === 'hurt' || e.state === 'dizzy' || e.state === 'stun') {
      e.st -= DT; e.u += e.vu * DT; e.vu *= Math.pow(0.01, DT);
      if (e.st <= 0) { e.state = 'walk'; e.vu = 0; e.hugT = 0; }
      return;
    }
    if (!p) { e.state = e.state === 'hug' ? 'walk' : e.state; return; }
    const sp = (DEF[e.type].speed || 0) * D.speed;
    switch (e.type) {
      case 'hugger': {
        if (e.state === 'hug') {
          const q = W.players[e.grab];
          if (!q || q.state !== 'grabbed') { e.grab = null; e.state = 'walk'; break; }
          const side = sgn(e.u - q.u), idx = W.enemies.filter((o) => o !== e && o.grab === q.slot && o.state === 'hug' && sgn(o.u - q.u) === side && Math.abs(o.u - q.u) < Math.abs(e.u - q.u)).length;
          e.u += (q.u + side * (0.55 + idx * 0.42) - e.u) * Math.min(1, 12 * DT);
          e.face = -side;
          break;
        }
        e.face = sgn(du);
        const taken = huggersOn(W, p).length;
        const canGrab = p.y < 0.2 && p.noGrab <= 0 && !p.ko && p.inv <= 0 && W.phase === 'play' &&
          (p.state === 'idle' || p.state === 'walk' || p.state === 'crouch' || p.state === 'grabbed' || (p.move && !MOVES[p.move].special));
        if (dist < 0.75 && canGrab && taken < 2) {
          e.state = 'hug'; e.grab = p.slot; e.hugT = 0;
          if (p.state !== 'grabbed') { p.state = 'grabbed'; p.move = null; p.wiggle = 0; p.grabT = 0; p.crouch = false; }
          ev(W, 'grab', { p: p.slot, u: p.u, id: e.id });
        } else if (dist < 1.25 && (taken >= 2 || p.noGrab > 0 || p.inv > 0)) {
          e.state = 'wait';
        } else {
          e.state = 'walk';
          e.u += e.face * sp * DT;
        }
        break;
      }
      case 'thrower': {
        e.face = sgn(du);
        const lo = W.cam - W.halfW + 0.8, hi = W.cam + W.halfW - 0.8;
        if (e.state === 'windup') {
          e.st -= DT;
          if (e.st <= 0) {
            const band = e.band === 'high' ? [1.3, 1.62] : [0.22, 0.52];
            W.shots.push({ id: W.nextId++, kind: 'bag', u: e.u + e.face * 0.45, y0: band[0], y1: band[1], w: 0.16, vu: e.face * 7 * D.shot, dmg: 8 * D.take, bop: true, by: e.id, hit: new Set() });
            ev(W, 'throw', { id: e.id, band: e.band, u: e.u });
            e.state = 'cool'; e.st = (W.diff === 'easy' ? 2.6 : 1.6) + W.rnd() * 0.6;
          }
          break;
        }
        if (e.state === 'cool') { e.st -= DT; if (e.st > 0) { if (dist < 2.2) e.u = clamp(e.u - e.face * 1.2 * DT, lo, hi); break; } e.state = 'walk'; }
        const inView = e.u > lo && e.u < hi;
        if (!inView || dist > e.want + 0.4) e.u += e.face * sp * DT;
        else if (dist < 2.2) e.u = clamp(e.u - e.face * 1.3 * DT, lo, hi);
        if (inView && dist < e.want + 0.6 && dist > 1.6 && p.state !== 'ko') {
          e.state = 'windup'; e.st = 0.62 * D.tele; e.band = W.rnd() < 0.5 ? 'high' : 'low';
          ev(W, 'windup', { id: e.id, band: e.band });
        } else e.state = 'walk';
        break;
      }
      case 'imp': {
        if (e.y <= 0) {
          e.vu = 0;
          e.face = sgn(du);
          e.hopT -= DT;
          if (e.hopT <= 0) {
            e.hopT = (W.diff === 'easy' ? 0.75 : 0.45) + W.rnd() * 0.3;
            e.vy = 6.6 + W.rnd() * 0.8;
            e.vu = e.face * (dist > 3 ? 2.6 : 1.8) * D.speed;
            ev(W, 'hop', { id: e.id });
          }
        }
        touchHurt(W, e, 6);
        break;
      }
      case 'dragon': {
        if (e.state === 'enter') { e.st -= DT; if (e.st <= 0) e.state = 'walk'; break; }
        if (e.state === 'wait') { e.st -= DT; if (e.st <= 0) e.state = 'walk'; break; }
        e.face = sgn(du);
        e.u += e.face * sp * DT;
        if (touchHurt(W, e, 6)) { e.state = 'wait'; e.st = 0.7; e.u -= e.face * 1.2; }
        break;
      }
      case 'confetti': {
        if (e.state === 'enter') { e.st -= DT; if (e.st <= 0) e.state = 'walk'; break; }
        e.face = sgn(du);
        e.u += e.face * sp * DT;
        e.fuse -= DT;
        if (dist < 0.8 || e.fuse <= 0) {
          e.gone = true;
          ev(W, 'pop', { u: e.u, y: 0.4, id: e.id });
          for (const q of W.players) if (Math.abs(q.u - e.u) < 1.15 && q.y < 0.9) hurt(W, q, 8 * D.take, e.u);
        }
        break;
      }
      case 'copy': stepCopy(W, e, p, du, dist); break;
    }
  }

  // touching a brother: a bump (imps and paper dragons)
  function touchHurt(W, e, dmg) {
    for (const p of W.players) {
      if (p.ko || Math.abs(p.u - e.u) > e.w + 0.3) continue;
      if (e.y + e.h < bodyBot(p) || e.y > bodyTop(p)) continue;
      if (hurt(W, p, dmg * W.D.take, e.u, { kb: 2 })) {
        if (e.type === 'imp') { e.vu = -sgn(p.u - e.u) * 3; e.vy = Math.max(e.vy, 4); }
        return true;
      }
    }
    return false;
  }

  function separate(W) {
    const list = W.enemies.filter((e) => (e.state === 'walk' || e.state === 'wait' || e.state === 'cool') && e.type !== 'boss' && e.type !== 'copy' && e.y <= 0);
    list.sort((a, b) => a.u - b.u);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      const gap = 0.75 - (b.u - a.u);
      if (gap > 0) { a.u -= gap / 2; b.u += gap / 2; }
    }
  }

  // ---------------------------------------------------------------- pots

  function stepPots(W) {
    for (const pot of W.pots) {
      if (pot.state === 'gone') continue;
      if (pot.state === 'hang') {
        if (W.phase !== 'play' || W.arena) continue;
        const d = minPlayerDist(W, pot.u);
        if (d < 3.4 && d > 1.4) { pot.state = 'wobble'; pot.st = 0.5; ev(W, 'wobble', { u: pot.u, id: pot.id }); }
      } else if (pot.state === 'wobble') {
        pot.st -= DT;
        if (pot.st <= 0) { pot.state = 'fall'; pot.vy = 0; }
      } else if (pot.state === 'fall') {
        pot.vy -= GRAV * DT;
        pot.y += pot.vy * DT;
        if (pot.y <= 0) {
          pot.y = 0; pot.state = 'gone';
          let bonked = false;
          for (const p of W.players) if (!p.ko && Math.abs(p.u - pot.u) < 0.55 && p.y < 1) { hurt(W, p, 6 * W.D.take, pot.u + 0.01, { kb: 1.5 }); bonked = true; }
          ev(W, 'potBreak', { u: pot.u, y: 0.3, kind: pot.kind });
          // out jumps a paper dragon or a confetti ball, but never right on top of a brother
          if (!bonked && minPlayerDist(W, pot.u) >= 1.2) spawn(W, pot.kind, pot.u, { state: 'enter', st: 0.45 });
        }
      }
    }
  }

  // ---------------------------------------------------------------- shots, strikes and Tommy's wave

  function stepShots(W) {
    for (const s of W.shots) {
      if (s.dead) continue;
      if (s.kind === 'boomer') {
        const b = W.enemies.find((e) => e.id === s.by);
        if (s.out) {
          s.vel = s.vu;
          s.u += s.vu * DT; s.dist += Math.abs(s.vu) * DT;
          const edge = s.u < W.cam - W.halfW + 0.2 || s.u > W.cam + W.halfW - 0.2;
          if (s.dist >= s.max || edge) { s.out = false; s.hit = new Set(); ev(W, 'boomerTurn', { u: s.u }); }
        } else {
          const home = b && b.state !== 'beaten' ? b.u : s.u + sgn(-s.vu) * 9;
          const d = home - s.u;
          s.vel = sgn(d) * Math.abs(s.vu);
          s.u += s.vel * DT;
          if (Math.abs(d) < 0.35 || !b) { s.dead = true; ev(W, 'catch', { u: s.u }); continue; }
        }
      } else {
        s.vel = s.vu;
        s.u += s.vu * DT;
        if (s.dist != null) { s.dist += Math.abs(s.vu) * DT; if (s.dist > s.max) { s.dead = true; continue; } }
      }
      if (Math.abs(s.u - W.cam) > W.halfW + 3) { s.dead = true; continue; }
      for (const p of W.players) {
        if (p.ko || s.hit.has(p.slot) || Math.abs(p.u - s.u) > s.w + 0.28) continue;
        if (s.y1 < bodyBot(p) || s.y0 > bodyTop(p)) continue;
        s.hit.add(p.slot);
        if (hurt(W, p, s.dmg, s.u - sgn(s.vu) * 0.5, { kb: 2.2 }) && s.kind !== 'shock' && s.kind !== 'boomer' && s.kind !== 'palm') s.dead = true;
      }
    }
    W.shots = W.shots.filter((s) => !s.dead);
    for (const k of W.strikes) {
      k.t -= DT;
      for (const p of W.players) {
        if (p.ko || k.hit.has(p.slot)) continue;
        if (p.u < k.u0 - 0.28 || p.u > k.u1 + 0.28 || k.y1 < bodyBot(p) || k.y0 > bodyTop(p)) continue;
        k.hit.add(p.slot);
        hurt(W, p, k.dmg, k.from, { kb: k.kb || 2.5 });
      }
    }
    W.strikes = W.strikes.filter((k) => k.t > 0);
    for (const w of W.waves) {
      w.r += 11 * DT;
      for (const e of W.enemies) {
        if (w.hit.has(e.id) || !hittable(e) || Math.abs(e.u - w.u) > w.r) continue;
        w.hit.add(e.id);
        const face = sgn(e.u - w.u);
        if (e.type === 'boss') hitBoss(W, e, 1, face, 'PEACE!', W.players[w.by], false, 1.2);
        else if (SMALL[e.type]) bonk(W, e, face, 'PEACE!');
        else {
          if (e.grab != null) releaseOne(W, e);
          e.state = 'stun'; e.st = 2.6; e.vu = face * 2.5;
          ev(W, 'stun', { u: e.u, y: e.y + e.h, id: e.id });
        }
      }
      for (const s of W.shots) if (Math.abs(s.u - w.u) < w.r && s.kind !== 'shock') { s.dead = true; ev(W, 'bop', { u: s.u, y: (s.y0 + s.y1) / 2, kind: s.kind }); }
    }
    W.waves = W.waves.filter((w) => w.r < w.max);
  }

  // ---------------------------------------------------------------- bosses

  function spawnBoss(W) {
    const kind = W.F.boss, B = BOSSES[kind];
    const hp = Math.round(B.hp * W.D.bossHp);
    const b = {
      id: W.nextId++, type: 'boss', kind, u: W.L + 1.2, y: 0, vy: 0, vu: 0, face: -1, state: 'enter', st: 0, hp, maxHp: hp,
      h: B.h, w: B.w, speed: B.speed * (W.diff === 'easy' ? 0.75 : 1), heavy: !!B.heavy, atk: null, seq: 0, combo: 0, comboT: 0,
      grab: null, flash: 0, split: 0, poise: 0, attackNext: false,
    };
    W.enemies.push(b);
    W.boss = b;
    ev(W, 'bossEnter', { kind, u: b.u });
  }

  function hitBoss(W, b, dmg, face, word, p, big, stun) {
    if (b.state === 'enter' || b.state === 'vanish' || b.state === 'beaten') return;
    b.hp = Math.max(0, b.hp - dmg);
    b.flash = 0.12;
    ev(W, 'hit', { u: b.u, y: b.y + b.h * 0.6, word, id: b.id, boss: true, big });
    if (b.hp <= 0) return beatBoss(W, b);
    if (b.kind === 'puff') killCopies(W);
    b.combo++; b.comboT = 1.4;
    // A boss shrugs off hits while winding up and swinging (watch the pattern!), keeps going for a moment after a
    // flinch, and hops away after a flurry: so he always gets his next move in, and nobody is stuck in a corner.
    if (b.state === 'act' || b.state === 'tele' || b.state === 'hop') return;
    if (b.combo >= 3) {
      b.combo = 0; b.atk = null; b.poise = 0;
      if (b.kind === 'puff') return vanish(W, b);
      b.state = 'hop'; b.vy = 7; b.vu = face * (b.heavy ? 2.5 : 4.5); b.face = -face; b.attackNext = true;
      return;
    }
    if (b.poise > 0 && !stun) return;
    b.atk = null;
    b.state = 'flinch'; b.st = stun || (b.heavy ? 0.18 : 0.28); b.vu = face * (b.heavy ? 0.6 : 1.8); b.poise = 1.0 + (stun || 0);
  }

  function beatBoss(W, b) {
    b.state = 'beaten'; b.st = 0; b.atk = null; b.vu = 0; b.y = 0; b.vy = 0;
    W.phase = 'clear'; W.pt = 0;
    W.score += 2000 * (W.fi + 1);
    W.shots = []; W.strikes = [];
    for (const e of W.enemies) if (e !== b && e.state !== 'bonked') bonk(W, e, sgn(e.u - b.u), 'BONK!');
    for (const p of W.players) { releaseHuggers(W, p, 'drop'); p.move = null; p.crouch = false; }
    ev(W, 'bossDown', { kind: b.kind, u: b.u });
  }

  const killCopies = (W) => { for (const e of W.enemies) if (e.type === 'copy' && !e.gone && e.state !== 'bonked') { e.gone = true; ev(W, 'poof', { u: e.u, y: 1, id: e.id, copy: true }); } };

  function arenaLo(W) { return W.camA - W.halfW + 0.5; }

  // jump straight to the boss's room (floor select tests, game.warp and the checks)
  function enterArena(W) {
    W.cam = W.camA;
    W.players.forEach((p, i) => { p.u = W.camA - 3 + i * 1.1; p.state = 'idle'; p.y = 0; p.vy = 0; p.vu = 0; });
    W.enemies = W.enemies.filter((e) => e.type === 'boss'); W.shots = []; W.pots = W.pots.filter((p) => p.u > W.camA + W.halfW);
    if (W.phase === 'intro') { W.phase = 'play'; W.pt = 0; }
    if (!W.arena) { W.arena = true; spawnBoss(W); }
  }

  // A spot for the magician to pop up: 3-6 m from the nearest brother, and never on top of one.
  function puffSpot(W) {
    const lo = arenaLo(W) + 0.6, hi = W.L - 0.8;
    let best = null, bs = -Infinity;
    for (let i = 0; i < 14; i++) {
      const u = lo + W.rnd() * (hi - lo), d = minPlayerDist(W, u);
      const s = d < 2.5 ? d - 10 : -Math.abs(d - 4.2);
      if (s > bs) { bs = s; best = u; }
    }
    return best;
  }

  function strike(W, b, u0, u1, y0, y1, dmg, kb, t) {
    W.strikes.push({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), y0, y1, dmg: dmg * W.D.bossDmg, kb, t: t || 0.16, hit: new Set(), from: b.u, by: b.id });
  }

  function shot(W, b, kind, y0, y1, speed, dmg, o) {
    const s = Object.assign({ id: W.nextId++, kind, u: b.u + b.face * 0.6, y0, y1, w: 0.25, vu: b.face * speed * W.D.shot, dmg: dmg * W.D.bossDmg, bop: false, by: b.id, hit: new Set() }, o || {});
    W.shots.push(s);
    return s;
  }

  // pick the next thing a boss does: returns an attack or a walk
  function brain(W, b, p) {
    const du = p.u - b.u, dist = Math.abs(du), r = W.rnd(), T = W.D.tele;
    const band = () => (W.rnd() < 0.5 ? 'high' : 'low');
    switch (b.kind) {
      case 'staff':
        if (dist > 2.8) return { walk: 2.2, max: 2.5 };
        if (dist < 1.0) return { hop: true };
        return (b.seq++ % 3 === 2) ? { name: 'spin', tele: 0.65 * T, act: 0.35, rec: 0.6 } : { name: 'poke', band: band(), tele: 0.55 * T, act: 0.18, rec: 0.55 };
      case 'bao':
        if (W.shots.some((s) => s.by === b.id)) return { wait: 0.3 };
        if (dist < 1.8) return { name: 'shove', tele: 0.45 * T, act: 0.15, rec: 0.35, then: 'hop' };
        if (dist < 3.6) return roomBehind(W, b, p) ? { hop: true } : { name: 'shove', tele: 0.45 * T, act: 0.15, rec: 0.35 };
        if (dist > 6.8) return { walk: 5.0, max: 1.4 };
        return { name: 'boomer', band: band(), tele: 0.6 * T, act: 0.2, rec: 0.2 };
      case 'belly':
        if (dist < 2.4) return r < 0.7 ? { name: 'bump', tele: 0.75 * T, act: 0.2, rec: 0.8 } : { name: 'stomp', tele: 0.7 * T, act: 0.3, rec: 0.7 };
        if (b.seq++ % 2 === 0) return { name: 'stomp', tele: 0.7 * T, act: 0.3, rec: 0.7 };
        return { walk: 1.8, max: 2.2 };
      case 'puff':
        if (dist < 1.6 || b.shots >= 2) return { name: 'vanish' };
        return { name: 'spark', band: band(), tele: 0.55 * T, act: 0.15, rec: 0.45 };
      case 'grand':
        if (dist > 3.2) return r < 0.5 ? { name: 'palm', tele: 0.6 * T, act: 0.2, rec: 0.5 } : { name: 'fly', tele: 0.8 * T, act: 1.2, rec: 0.5 };
        if (dist > 2.5) return r < 0.5 ? { walk: 2.0, max: 1.0 } : { name: 'fly', tele: 0.8 * T, act: 1.2, rec: 0.5 };
        return r < 0.4 ? { name: 'sweep', tele: 0.5 * T, act: 0.18, rec: 0.5 } : { name: 'strike', band: band(), tele: 0.45 * T, act: 0.16, rec: 0.45 };
    }
    return { wait: 0.5 };
  }

  // the attack a boss lands into after hopping away from a flurry
  function attackFrom(W, b) {
    const T = W.D.tele, band = W.rnd() < 0.5 ? 'high' : 'low';
    switch (b.kind) {
      case 'staff': return { name: 'spin', tele: 0.65 * T, act: 0.35, rec: 0.6 };
      case 'bao': return { name: 'boomer', band, tele: 0.6 * T, act: 0.2, rec: 0.2 };
      case 'belly': return { name: 'stomp', tele: 0.7 * T, act: 0.3, rec: 0.7 };
      case 'puff': return { name: 'spark', band, tele: 0.55 * T, act: 0.15, rec: 0.45 };
      default: return { name: 'palm', tele: 0.6 * T, act: 0.2, rec: 0.5 };
    }
  }
  const roomBehind = (W, b, p) => { const away = -sgn(p.u - b.u), u = b.u + away * 3; return u > arenaLo(W) + 0.4 && u < W.L - 0.6; };

  function fire(W, b, a) {
    const f = b.face;
    switch (a.name) {
      case 'poke':
        if (a.band === 'high') strike(W, b, b.u + f * 0.3, b.u + f * 2.7, 1.12, 1.75, 10, 2.5, a.act);
        else strike(W, b, b.u + f * 0.3, b.u + f * 2.7, 0, 0.5, 10, 2.5, a.act);
        break;
      case 'spin': strike(W, b, b.u - 2.4, b.u + 2.4, 0, 0.5, 10, 3, a.act); break;
      case 'shove': strike(W, b, b.u + f * 0.2, b.u + f * 1.9, 0, 2.2, 7, 5, a.act); break;
      case 'boomer': {
        const y = a.band === 'high' ? [1.25, 1.65] : [0.2, 0.55];
        shot(W, b, 'boomer', y[0], y[1], 7, 9, { out: true, dist: 0, max: 6.5, w: 0.3 });
        break;
      }
      case 'bump': strike(W, b, b.u + f * 0.3, b.u + f * 2.3, 0, 2.4, 10, 5, a.act); break;
      case 'stomp':
        for (const s of [-1, 1]) W.shots.push({ id: W.nextId++, kind: 'shock', u: b.u + s * 0.9, y0: 0, y1: 0.38, w: 0.3, vu: s * 6 * W.D.shot, dmg: 8 * W.D.bossDmg, bop: false, by: b.id, hit: new Set(), dist: 0, max: 9 });
        ev(W, 'stomp', { u: b.u });
        break;
      case 'spark': {
        const y = a.band === 'high' ? [1.28, 1.62] : [0.22, 0.52];
        shot(W, b, 'spark', y[0], y[1], 6.5, 8, { bop: true });
        b.shots = (b.shots || 0) + 1;
        break;
      }
      case 'palm': shot(W, b, 'palm', 1.12, 1.95, 7, 10, { w: 0.35 }); break;
      case 'sweep': strike(W, b, b.u + f * 0.3, b.u + f * 2.4, 0, 0.5, 10, 2.5, a.act); break;
      case 'strike':
        if (a.band === 'high') strike(W, b, b.u + f * 0.3, b.u + f * 1.9, 1.12, 1.8, 10, 2.5, a.act);
        else strike(W, b, b.u + f * 0.3, b.u + f * 1.9, 0, 0.5, 10, 2.5, a.act);
        break;
      case 'fly': b.vu = f * 9 * (W.diff === 'easy' ? 0.7 : 1); b.flyFrom = b.u; b.y = 0.85; b.flyHit = new Set(); break;
    }
    ev(W, 'bossAtk', { kind: b.kind, name: a.name, band: a.band, u: b.u });
  }

  function stepBoss(W, b) {
    const lo = arenaLo(W), hi = W.L - 0.5;
    b.flash = Math.max(0, b.flash - DT);
    b.poise = Math.max(0, b.poise - DT);
    b.comboT -= DT;
    if (b.comboT <= 0) b.combo = 0;
    if (b.state === 'beaten') { b.st += DT; return; }
    if (b.state === 'enter') {
      b.u -= 1.6 * DT;
      if (b.u <= W.L - 3.2) { b.state = 'idle'; b.st = 0.6; ev(W, 'bossFight', { kind: b.kind }); }
      return;
    }
    const p = nearestPlayer(W, b.u);
    if (!p) { b.state = 'idle'; b.st = 0.5; b.atk = null; return; }
    const du = p.u - b.u;
    // in the air (hops)
    if (b.y > 0 || b.vy > 0) {
      if (b.state !== 'act' || !b.atk || b.atk.name !== 'fly') {
        b.vy -= GRAV * DT; b.y = Math.max(0, b.y + b.vy * DT); b.u = clamp(b.u + b.vu * DT, lo, hi);
        if (b.y <= 0) { b.vy = 0; b.vu = 0; if (b.state === 'hop') { b.state = 'idle'; b.st = b.attackNext ? 0.05 : 0.3; } }
        if (b.state === 'hop') return;
      }
    }
    switch (b.state) {
      case 'flinch':
        b.st -= DT; b.u = clamp(b.u + b.vu * DT, lo, hi); b.vu *= Math.pow(0.02, DT);
        if (b.st <= 0) { b.state = 'idle'; b.st = 0.25; }
        return;
      case 'hop': return;
      case 'idle':
        b.face = sgn(du);
        b.st -= DT;
        if (b.st > 0) return;
        if (b.kind === 'puff' && b.copiesDue) { b.copiesDue = false; split(W, b); b.state = 'idle'; b.st = 0.6; return; }
        {
          let a = brain(W, b, p);
          // straight after a hop away: no walking about, attack
          if (b.attackNext && (a.walk || a.wait || a.hop)) a = attackFrom(W, b);
          b.attackNext = false;
          if (a.walk) { b.state = 'walk'; b.want = a.walk; b.st = a.max; return; }
          if (a.wait) { b.st = a.wait; return; }
          if (a.hop) { b.state = 'hop'; b.vy = 6.5; b.vu = -sgn(du) * 4; return; }
          if (a.name === 'vanish') { vanish(W, b); return; }
          b.atk = a; b.state = 'tele'; b.st = a.tele;
          ev(W, 'bossTele', { kind: b.kind, name: a.name, band: a.band, u: b.u });
        }
        return;
      case 'walk': {
        b.face = sgn(du);
        b.st -= DT;
        const d = Math.abs(du), go = d > b.want + 0.2 ? 1 : d < b.want - 0.2 ? -1 : 0;
        b.u = clamp(b.u + go * b.face * b.speed * DT, lo, hi);
        if (!go || b.st <= 0 || (go < 0 && (b.u <= lo + 0.01 || b.u >= hi - 0.01))) { b.state = 'idle'; b.st = 0.15; }
        return;
      }
      case 'tele':
        b.st -= DT;
        if (b.atk.name !== 'fly') b.face = b.st > b.atk.tele * 0.5 ? sgn(du) : b.face;
        if (b.st <= 0) { fire(W, b, b.atk); b.state = 'act'; b.st = b.atk.act; }
        return;
      case 'act':
        if (b.atk.name === 'fly') {
          b.u += b.vu * DT;
          for (const q of W.players) {
            if (q.ko || b.flyHit.has(q.slot) || Math.abs(q.u - b.u) > 0.6) continue;
            if (2.0 < bodyBot(q) || 1.15 > bodyTop(q)) continue;
            b.flyHit.add(q.slot);
            hurt(W, q, 12 * W.D.bossDmg, b.u - b.vu, { kb: 3 });
          }
          if (Math.abs(b.u - b.flyFrom) > 6.5 || b.u <= lo || b.u >= hi) {
            b.u = clamp(b.u, lo, hi); b.vu = 0; b.y = 0; b.state = 'rec'; b.st = b.atk.rec;
            ev(W, 'land', { u: b.u, boss: true });
          }
          return;
        }
        b.st -= DT;
        if (b.st <= 0) { b.state = 'rec'; b.st = b.atk.rec; }
        return;
      case 'rec':
        b.st -= DT;
        if (b.st <= 0) {
          const then = b.atk && b.atk.then;
          b.atk = null;
          if (then === 'hop') { b.state = 'hop'; b.vy = 6.5; b.vu = -sgn(du) * 4; }
          else { b.state = 'idle'; b.st = W.diff === 'easy' ? 0.6 : 0.3; }
        }
        return;
      case 'vanish':
        b.st -= DT;
        if (b.st <= 0) {
          b.u = puffSpot(W); b.state = 'idle'; b.st = 0.45; b.shots = 0; b.face = sgn(du);
          ev(W, 'appear', { u: b.u, id: b.id });
          b.split++;
          if (b.split % 2 === 1) b.copiesDue = true;
        }
        return;
    }
  }

  function vanish(W, b) {
    b.state = 'vanish'; b.st = 0.6; b.atk = null; b.shots = 0;
    ev(W, 'puff', { u: b.u, id: b.id });
  }

  function split(W, b) {
    killCopies(W);
    const n = W.diff === 'easy' ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const u = puffSpot(W);
      if (minPlayerDist(W, u) < 2) continue;
      spawn(W, 'copy', u, { state: 'cool', st: 0.8 + i * 0.5, life: 7, shots: 0 });
    }
    ev(W, 'split', { u: b.u });
  }

  // the magician's copies: they stand and throw sparkles too, and poof when touched
  function stepCopy(W, e, p, du, dist) {
    e.face = sgn(du);
    if (e.state === 'cool' || e.state === 'walk') {
      e.st -= DT;
      if (e.st <= 0 && dist > 1.6) { e.state = 'windup'; e.st = 0.7 * W.D.tele; e.band = W.rnd() < 0.5 ? 'high' : 'low'; ev(W, 'windup', { id: e.id, band: e.band }); }
    } else if (e.state === 'windup') {
      e.st -= DT;
      if (e.st <= 0) {
        const y = e.band === 'high' ? [1.28, 1.62] : [0.22, 0.52];
        W.shots.push({ id: W.nextId++, kind: 'spark', u: e.u + e.face * 0.5, y0: y[0], y1: y[1], w: 0.22, vu: e.face * 5.5 * W.D.shot, dmg: 6 * W.D.bossDmg, bop: true, by: e.id, hit: new Set() });
        e.state = 'cool'; e.st = 2.2;
      }
    }
  }

  // ---------------------------------------------------------------- the companion (1 player) and the high five (2 players)

  function call(W, slot) {
    if (W.phase !== 'play') return;
    W.calls++;
    if (W.mode === '2p') return highFive(W);
    const p = W.players[0];
    const b = W.buddy;
    const fromU = b && b.state !== 'gone' ? b.u : W.cam - p.face * (W.halfW + 1);
    W.buddy = { who: W.buddyWho, state: 'fly', t: 0, u: fromU, y: b && b.state !== 'gone' ? Math.max(b.y, 1.5) : 3.4, fromU, fromY: 3.4, toU: clamp(p.u + p.face * 1.4, 0.4, W.L - 0.6), face: p.face, kicked: false, treat: null };
    W.buddy.fromY = W.buddy.y;
    ev(W, 'buddy', { who: W.buddyWho });
  }

  function stepBuddy(W) {
    const b = W.buddy;
    if (!b || b.state === 'gone') return;
    const p = W.players[0];
    b.t += DT;
    if (b.state === 'fly') {
      const k = Math.min(1, b.t / 0.5);
      b.u = b.fromU + (b.toU - b.fromU) * k;
      b.y = b.fromY * (1 - k) + Math.sin(k * Math.PI) * 0.8;
      b.face = sgn(b.toU - b.fromU);
      if (k >= 0.85 && !b.kicked) {
        b.kicked = true;
        // the flying kick: everyone on screen is bonked; a boss only takes a bit
        for (const e of W.enemies) {
          if (!hittable(e) || !onScreen(W, e.u, 0.6)) continue;
          if (e.type === 'boss') { const dmg = Math.min(1.5, e.hp - 1); if (dmg > 0) hitBoss(W, e, dmg, sgn(e.u - b.u), 'HI-YAH!', null, true); else hitBoss(W, e, 0, sgn(e.u - b.u), 'HI-YAH!', null, true); }
          else bonk(W, e, sgn(e.u - b.u) || b.face, 'HI-YAH!');
        }
        for (const s of W.shots) if (onScreen(W, s.u)) s.dead = true;
        W.strikes = [];
        releaseHuggers(W, p, 'free');
        ev(W, 'buddyKick', { u: b.u, who: b.who });
      }
      if (k >= 1) { b.state = 'sig'; b.t = 0; b.y = 0; b.face = sgn(p.u - b.u); }
    } else if (b.state === 'sig') {
      b.face = sgn(p.u - b.u);
      if (b.t >= 0.5 && !b.treat) {
        b.treat = TREATS[Math.floor(W.rnd() * TREATS.length)];
        W.treats.push({ emoji: b.treat, t: 0, dur: 0.6, from: b.u, p: 0, heal: 25 });
        ev(W, 'treat', { who: b.who, emoji: b.treat, u: b.u });
      }
      if (b.t >= 1.4) { b.state = 'bye'; b.t = 0; b.fromU = b.u; }
    } else if (b.state === 'bye') {
      const k = Math.min(1, b.t / 0.7);
      b.face = -sgn(p.u - b.u) || 1;
      b.u = b.fromU + b.face * k * (W.halfW + 1.5);
      b.y = Math.sin(k * Math.PI * 0.5) * 3.5;
      if (k >= 1) b.state = 'gone';
    }
  }

  function highFive(W) {
    if (W.hfCd > 0) { ev(W, 'hfWait', { left: W.hfCd }); return; }
    const ps = alive(W);
    if (!ps.length) return;
    W.hfCd = 8;
    const mid = ps.reduce((s, p) => s + p.u, 0) / ps.length;
    for (const p of ps) {
      releaseHuggers(W, p, 'free');
      p.move = null; p.state = 'highfive'; p.st = 0.7; p.inv = Math.max(p.inv, 0.8); p.vu = 0;
      p.face = ps.length > 1 ? sgn(mid - p.u) : p.face;
      p.power = 6; p.specCd = 0;
    }
    ev(W, 'highfive', { u: mid });
  }

  function stepTreats(W) {
    for (const t of W.treats) {
      t.t += DT;
      if (t.t >= t.dur && !t.done) {
        t.done = true;
        const p = W.players[t.p];
        if (p && !p.ko) { p.hp = Math.min(p.maxHp, p.hp + t.heal); ev(W, 'eat', { p: p.slot, emoji: t.emoji, heal: t.heal, treat: true }); }
      }
    }
    W.treats = W.treats.filter((t) => !t.done);
    for (const it of W.items) {
      it.t += DT;
      if (it.y > 0 || it.vy > 0) { it.vy -= GRAV * DT; it.y = Math.max(0, it.y + it.vy * DT); if (it.y === 0) it.vy = 0; }
      if (it.t > it.life) { it.dead = true; continue; }
      for (const p of W.players) {
        if (p.ko || p.state === 'grabbed' || Math.abs(p.u - it.u) > 0.55 || p.y > 0.8 || it.y > 0.5) continue;
        if (p.hp >= p.maxHp && W.players.length === 1 && it.life === Infinity) continue; // full: leave it for later
        it.dead = true;
        p.hp = Math.min(p.maxHp, p.hp + it.heal);
        W.score += 50;
        ev(W, 'eat', { p: p.slot, emoji: it.emoji, heal: it.heal, u: it.u });
        break;
      }
    }
    W.items = W.items.filter((it) => !it.dead);
  }

  // ---------------------------------------------------------------- camera, the boss room, knock-outs, the timer

  function stepCamera(W) {
    const ps = alive(W);
    const list = ps.length ? ps : W.players;
    let target;
    if (W.mode === '2p') target = list.reduce((s, p) => s + p.u, 0) / list.length + 0.5;
    else target = list[0].u + list[0].face * 1.2;
    if (W.arena) target = W.camA;
    target = clamp(target, W.halfW - 0.8, W.camA);
    W.cam += (target - W.cam) * Math.min(1, 6 * DT);
    if (!W.arena && W.phase === 'play' && W.cam >= W.camA - 0.15) {
      W.arena = true;
      spawnBoss(W);
    }
    const lo = W.arena ? arenaLo(W) - 0.05 : Math.max(0.3, W.cam - W.halfW + 0.45);
    const hi = W.arena ? W.L - 0.6 : W.cam + W.halfW - 0.45;
    for (const p of W.players) p.u = clamp(p.u, lo, Math.max(lo, hi));
    // nobody walks through a boss standing on the floor
    const b = W.boss;
    if (b && b.state !== 'enter' && b.state !== 'beaten' && b.state !== 'vanish' && b.y < 0.3) {
      for (const p of W.players) {
        if (p.ko || p.y > 1.2) continue;
        const gap = b.w + 0.3, d = p.u - b.u;
        if (Math.abs(d) < gap) p.u = clamp(b.u + (d === 0 ? -1 : sgn(d)) * gap, arenaLo(W) - 0.05, W.L - 0.6);
        if (Math.abs(p.u - b.u) < gap - 0.01) b.u = clamp(p.u - sgn(d || -1) * gap, arenaLo(W), W.L - 0.5);
      }
    }
  }

  function stepKnockouts(W) {
    const downs = W.players.filter((p) => p.ko);
    if (!downs.length) return;
    if (W.mode === '1p') {
      if (downs[0].koT > 1.8) loseLife(W, 'ko');
      return;
    }
    if (downs.length === W.players.length) {
      if (Math.min(...downs.map((p) => p.koT)) > 1.5) loseLife(W, 'ko');
      return;
    }
    // 2 players: the other brother helps him up
    for (const p of downs) {
      const helper = W.players.find((q) => q !== p && !q.ko && q.state !== 'grabbed' && Math.abs(q.u - p.u) < 1.3 && q.y < 0.2);
      if (helper) p.reviveT += DT; else p.reviveT = Math.max(0, p.reviveT - DT * 0.5);
      if (p.reviveT >= 0.8) {
        p.ko = false; p.state = 'getup'; p.st = 0.8; p.hp = W.D.revive; p.inv = 2.2; p.reviveT = 0;
        ev(W, 'revive', { p: p.slot, by: helper.slot, u: p.u });
      }
    }
  }

  // ---------------------------------------------------------------- one step

  function step(W, inputs) {
    W.events.length = 0;
    W.t += DT;
    W.pt += DT;
    W.hfCd = Math.max(0, W.hfCd - DT);
    if (W.phase === 'over' || W.phase === 'done') return W;
    if (W.phase === 'intro') {
      if (W.pt >= 1.4) { W.phase = 'play'; W.pt = 0; ev(W, 'go', {}); }
      stepCamera(W);
      return W;
    }
    if (W.phase === 'clear') {
      for (const p of W.players) {
        if (p.ko) { p.ko = false; p.hp = Math.max(p.hp, 30); }
        if (p.y > 0 || p.vy > 0) airborne(W, p);
        if (W.pt >= 1.0 && p.state !== 'celebrate') { p.state = 'celebrate'; p.st = 99; p.move = null; p.face = W.mode === '2p' ? sgn(W.players[1 - p.slot].u - p.u) : 1; ev(W, 'celebrate', { p: p.slot, who: p.id }); }
      }
      if (W.boss && W.pt >= 1.6 && !W.boss.gone) { W.boss.gone = true; ev(W, 'poof', { u: W.boss.u, y: 1.2, id: W.boss.id, boss: true }); }
      for (const e of W.enemies) if (e.type !== 'boss') stepEnemy(W, e);
      W.enemies = W.enemies.filter((e) => !e.gone || e.type === 'boss');
      stepBuddy(W);
      stepTreats(W);
      if (W.pt >= 4.4) {
        let bonus = 0;
        if (W.D.timer) bonus += Math.floor(W.time) * 10;
        for (const p of W.players) bonus += Math.floor(p.hp) * 5;
        W.score += bonus;
        W.phase = 'done';
        ev(W, 'done', { bonus });
      }
      return W;
    }
    // play
    const timing = W.D.timer > 0 && !(W.boss && W.boss.state === 'enter');
    if (timing) {
      W.time -= DT;
      if (W.time <= 0) { W.time = 0; ev(W, 'timeUp', {}); loseLife(W, 'time'); if (W.phase === 'over') return W; }
    }
    for (let i = 0; i < W.players.length; i++) {
      const inp = (inputs && inputs[i]) || {};
      if (inp.call) call(W, i);
      stepPlayer(W, W.players[i], inp);
    }
    stepGrabs(W);
    stepSpawner(W);
    for (const e of W.enemies) {
      if (e.gone) continue;
      if (e.type === 'boss') stepBoss(W, e); else stepEnemy(W, e);
      if (e.type !== 'boss' && e.state !== 'bonked') e.u = clamp(e.u, -2, W.L + 2);
      // walked far off behind the brothers: gone (they come back later)
      if (e.type !== 'boss' && e.state !== 'bonked' && Math.abs(e.u - W.cam) > W.halfW + 7) e.gone = true;
    }
    W.enemies = W.enemies.filter((e) => !e.gone);
    separate(W);
    stepPots(W);
    stepShots(W);
    stepBuddy(W);
    stepTreats(W);
    stepKnockouts(W);
    if (W.phase === 'play') stepCamera(W);
    return W;
  }

  root.KF_SIM = {
    DT, DIFF, MOVES, DEF, BOSSES, SPECIAL, SPEC_CD, FOOD, TREATS, STAND_H, CROUCH_H, WALK, JUMP_V, GRAV,
    create, step, call, enterArena, hurt, knockOut, loseLife, spawn, spawnBoss, huggersOn, nearestPlayer, minPlayerDist, arenaLo, bodyTop, bodyBot, hittable,
  };
})(typeof window !== 'undefined' ? window : globalThis);
