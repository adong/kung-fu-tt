/* Kung Fu TT: the headless checks. The same code runs in node (tools/check.js) and in the page (game.check()).
   Each check plays the real rules (js/sim.js) with the autopilot (js/bot.js) or a scripted kid, and says what broke.
     floors   - the autopilot clears all 5 floors on EASY and floors 1-2 on NORMAL (1P Teddy, 1P Tommy, 2P)
     spawns   - no baddie ever appears on top of a brother (checked on every floor run, and the magician's copies)
     grabs    - a hug can always be escaped: mashing frees you, two huggers too, and doing nothing frees you in time
     bosses   - every boss fight ends: the autopilot beats each boss, and an idle player's fight ends too
     timer    - NORMAL's timer runs out, costs a life, refills, and the last life ends the game; EASY has none
     knockout - a knocked-out brother gets up with full energy and one life fewer; no lives left ends the game
     revive   - in 2 players the other brother helps him up, and both down costs a life
     buddy    - the companion's flying kick bonks everyone on screen, a boss only takes a bit, and the treat heals
   prove() runs broken variants (an idle player, a spawn on top of a brother, a hug you can't escape, a timer that
   never runs) and passes only if every one of them is caught. */
(function (root) {
  'use strict';
  const Sim = root.KF_SIM, Bot = root.KF_BOT, FLOORS = root.KF_FLOORS;
  const DT = Sim.DT;

  // Play one floor with the autopilot. Returns { ok, why, t, ... }.
  function runFloor(cfg) {
    const W = Sim.create({ floor: cfg.floor, difficulty: cfg.diff, mode: cfg.mode, hero: cfg.hero, seed: cfg.seed || 1, halfW: cfg.halfW || 4.6, lives: cfg.lives });
    if (cfg.tamper) cfg.tamper(W);
    const mems = W.players.map(() => ({ opts: { call: cfg.call, callAlways: cfg.call, idle: cfg.idle, callEvery: 10 } }));
    const problems = [];
    const fail = (m) => { if (problems.length < 4) problems.push(`floor ${cfg.floor + 1} t=${W.t.toFixed(1)}: ${m}`); };
    let grabbedFor = W.players.map(() => 0), bossStart = -1, bossEnd = -1, spawns = 0, closest = Infinity, lives0 = W.lives;
    const LIMIT = cfg.limit || 420;
    while (W.t < LIMIT && W.phase !== 'done' && W.phase !== 'over') {
      const inputs = W.players.map((p, i) => Bot.bot(W, p, mems[i]));
      Sim.step(W, inputs);
      if (cfg.sabotage === 'spawn' && W.phase === 'play' && W.t > 5 && !W.sabotaged) { W.sabotaged = true; Sim.spawn(W, 'hugger', W.players[0].u + 0.2); }
      for (const e of W.events) {
        if (e.type === 'spawn') { spawns++; closest = Math.min(closest, e.near); if (e.near < 1.0) fail(`a ${e.etype} appeared ${e.near.toFixed(2)} m from a brother`); }
        if (e.type === 'bossFight') bossStart = W.t;
        if (e.type === 'bossDown') bossEnd = W.t;
      }
      W.players.forEach((p, i) => {
        grabbedFor[i] = p.state === 'grabbed' ? grabbedFor[i] + DT : 0;
        if (grabbedFor[i] > W.D.grabMax + 0.6) { fail(`${p.id} held for ${grabbedFor[i].toFixed(1)} s`); grabbedFor[i] = -1e9; }
        if (!isFinite(p.u) || !isFinite(p.y) || !isFinite(p.hp)) fail(`${p.id} has a NaN`);
        if (p.u < 0 || p.u > W.L) fail(`${p.id} left the hall (u=${p.u.toFixed(2)})`);
      });
      for (const e of W.enemies) if (!isFinite(e.u) || !isFinite(e.y)) fail(`a ${e.type} has a NaN`);
      if (problems.length >= 4) break;
    }
    if (W.phase === 'over') fail('game over');
    else if (W.phase !== 'done') fail(`not finished after ${LIMIT} s (phase ${W.phase}, u=${W.players[0].u.toFixed(1)}/${W.L})`);
    if (bossStart >= 0 && bossEnd < 0 && W.phase === 'done') fail('floor done but the boss never went down');
    return {
      ok: problems.length === 0, problems, t: +W.t.toFixed(1), boss: bossEnd > 0 ? +(bossEnd - bossStart).toFixed(1) : null,
      livesLost: lives0 - W.lives, score: W.score, spawns, closest: +closest.toFixed(2), bonks: W.bonks, calls: W.calls,
    };
  }

  function floorsCheck(o) {
    o = o || {};
    const out = [];
    // the game's view is 4.6 m either side on a wide screen, 4.0 on an iPad, 3.2 on a portrait phone
    const setups = [
      { mode: '1p', hero: 'teddy' }, { mode: '1p', hero: 'tommy', halfW: 4.0 }, { mode: '2p', halfW: 4.0 },
      { mode: '1p', hero: 'tommy', call: true }, { mode: '1p', hero: 'teddy', halfW: 3.2 },
    ];
    const seeds = o.seeds || [1, 2];
    for (const diff of ['easy', 'normal']) {
      const floors = diff === 'easy' ? [0, 1, 2, 3, 4] : [0, 1];
      for (const f of (o.floors || floors)) {
        if (!floors.includes(f)) continue;
        for (const s of setups) for (const seed of seeds) {
          const r = runFloor(Object.assign({ floor: f, diff, seed, idle: o.idle, sabotage: o.sabotage }, s));
          out.push(Object.assign({ name: `${diff} floor ${f + 1} ${s.mode}${s.hero ? ' ' + s.hero : ''}${s.call ? ' +buddy' : ''} view ${s.halfW || 4.6} seed ${seed}` }, r));
        }
      }
    }
    return out;
  }

  // ---- a quiet room with nobody walking in, for the scripted checks
  function room(o) {
    const W = Sim.create(Object.assign({ floor: 0, difficulty: 'easy', noSpawn: true, seed: 3, halfW: 4.6 }, o));
    W.pots = []; W.items = [];
    while (W.phase === 'intro') Sim.step(W, []);
    return W;
  }
  const run = (W, secs, inp) => { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) { Sim.step(W, typeof inp === 'function' ? inp(i) : inp || []); if (W.phase === 'over') break; } };
  const seen = (W, secs, inp, type) => { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) { Sim.step(W, typeof inp === 'function' ? inp(i) : inp || []); if (W.events.some((e) => e.type === type)) return W.t; } return -1; };

  function grabCheck(o) {
    o = o || {};
    const out = [];
    for (const diff of ['easy', 'normal']) {
      for (const n of [1, 2]) {
        for (const style of ['mash', 'nothing']) {
          const W = room({ difficulty: diff });
          if (o.sabotage === 'grab') { W.D = Object.assign({}, W.D, { mash: Infinity, grabMax: Infinity }); }
          const p = W.players[0];
          for (let i = 0; i < n; i++) Sim.spawn(W, 'hugger', p.u + (i ? -2.5 : 2.5));
          const grabbedAt = seen(W, 5, [], 'grab');
          // a 5-year-old's mashing: about 4 presses a second
          const t0 = W.t;
          let freedAt = -1;
          for (let i = 0; i < 60 * 12; i++) {
            const inp = style === 'mash' && i % 15 === 0 ? [{ mash: 1, punch: true }] : [];
            Sim.step(W, inp);
            if (p.state !== 'grabbed' && W.events.some((e) => e.type === 'free')) { freedAt = W.t; break; }
            if (p.ko) break;
          }
          const took = freedAt < 0 ? Infinity : freedAt - t0;
          const limit = style === 'mash' ? (W.D.mash + (n - 1) * 2) / 4 + 0.6 : W.D.grabMax + 0.2;
          const ok = grabbedAt >= 0 && took <= limit && !p.ko;
          out.push({ name: `${diff}: ${n} hugger${n > 1 ? 's' : ''}, ${style === 'mash' ? 'mashing 4/s' : 'doing nothing'}`, ok, took: +took.toFixed(2), limit: +limit.toFixed(2), hp: Math.round(p.hp), problems: ok ? [] : [grabbedAt < 0 ? 'never grabbed' : p.ko ? 'knocked out while held' : `still held after ${limit.toFixed(1)} s`] });
        }
      }
    }
    return out;
  }

  // Warp to each boss and let the autopilot fight; and let an idle player stand there. Both fights must end.
  function bossCheck(o) {
    o = o || {};
    const out = [];
    for (const diff of ['easy', 'normal']) {
      for (let f = 0; f < FLOORS.length; f++) {
        for (const idle of [false, true]) {
          if (idle && o.quick) continue;
          for (const mode of ['1p', '2p']) {
            if (idle && mode === '2p') continue;
            const W = Sim.create({ floor: f, difficulty: diff, mode, hero: f % 2 ? 'tommy' : 'teddy', seed: 7 + f, lives: idle ? 1 : 9, halfW: mode === '2p' ? 3.2 : 4.0 });
            while (W.phase === 'intro') Sim.step(W, []);
            Sim.enterArena(W);
            const mems = W.players.map(() => ({ opts: { idle } }));
            let down = -1, attacks = 0, start = W.t;
            while (W.t - start < 400 && W.phase !== 'done' && W.phase !== 'over') {
              Sim.step(W, W.players.map((p, i) => Bot.bot(W, p, mems[i])));
              for (const e of W.events) { if (e.type === 'bossDown') down = W.t - start; if (e.type === 'bossAtk') attacks++; }
            }
            const ended = W.phase === 'done' || W.phase === 'over';
            const ok = idle ? ended && attacks > 0 : W.phase === 'done' && down > 0 && down < 150;
            out.push({ name: `${diff} ${FLOORS[f].bossName} ${idle ? 'vs an idle player (ends in a game over)' : mode + ' autopilot'}`, ok, t: +(W.t - start).toFixed(1), ended: W.phase, attacks,
              problems: ok ? [] : [`phase ${W.phase} after ${(W.t - start).toFixed(0)} s, boss hp ${W.boss ? W.boss.hp.toFixed(1) : '?'}`] });
          }
        }
      }
    }
    return out;
  }

  function timerCheck(o) {
    o = o || {};
    const out = [];
    {
      const W = room({ difficulty: 'normal', lives: 2 });
      if (o.sabotage === 'timer') W.D = Object.assign({}, W.D, { timer: 0 });
      const full = Sim.DIFF.normal.timer;
      const t1 = seen(W, full + 2, [], 'timeUp');
      const after1 = { lives: W.lives, time: W.time };
      const t2 = seen(W, full + 2, [], 'timeUp');
      run(W, 0.1);
      const ok = t1 > 0 && Math.abs(t1 - (full + 1.4)) < 0.2 && after1.lives === 1 && Math.abs(after1.time - full) < 0.1 && t2 > 0 && W.phase === 'over';
      out.push({ name: `normal: the ${full} s timer runs out, costs a life, refills; the last life ends the game`, ok, problems: ok ? [] : [`timeUp at ${t1.toFixed(1)}, lives after ${after1.lives}, time after ${after1.time && after1.time.toFixed(1)}, second ${t2.toFixed(1)}, phase ${W.phase}`] });
    }
    {
      const W = room({ difficulty: 'easy' });
      const t1 = seen(W, 400, [], 'timeUp');
      const ok = t1 < 0 && W.phase === 'play' && W.lives === Sim.DIFF.easy.lives;
      out.push({ name: 'easy: no timer (400 s standing still)', ok, problems: ok ? [] : ['the timer ran on easy'] });
    }
    return out;
  }

  function knockoutCheck() {
    const out = [];
    {
      const W = room({ difficulty: 'normal' });
      const p = W.players[0], lives = W.lives;
      p.hp = 5;
      Sim.hurt(W, p, 10, p.u + 1);
      const ko = p.ko;
      const t = seen(W, 4, [], 'life');
      run(W, 1.2);
      const ok = ko && t > 0 && W.lives === lives - 1 && p.hp === p.maxHp && !p.ko && p.state === 'idle';
      out.push({ name: '1P: knocked out → one life fewer, back up with full energy', ok, problems: ok ? [] : [`ko ${ko} life event ${t} lives ${W.lives} hp ${p.hp} state ${p.state}`] });
    }
    {
      const W = room({ difficulty: 'normal', lives: 1 });
      const p = W.players[0];
      p.hp = 1;
      Sim.hurt(W, p, 10, p.u + 1);
      run(W, 3);
      const ok = W.phase === 'over';
      out.push({ name: '1P: knocked out on the last life → game over', ok, problems: ok ? [] : [`phase ${W.phase}`] });
    }
    {
      // a real knock-out: stand still in front of a bean-bag thrower on NORMAL
      const W = room({ difficulty: 'normal', lives: 3 });
      const p = W.players[0];
      Sim.spawn(W, 'thrower', p.u + 4, { want: 4 });
      const t = seen(W, 120, [], 'ko');
      const ok = t > 0;
      out.push({ name: '1P: standing still under bean bags ends in a knock-out', ok, problems: ok ? [] : ['never knocked out'] });
    }
    return out;
  }

  function reviveCheck(o) {
    o = o || {};
    const out = [];
    {
      const W = room({ difficulty: 'normal', mode: '2p' });
      const [a, b] = W.players;
      b.u = a.u + 5; b.hp = 3;
      Sim.hurt(W, b, 10, b.u + 1);
      const mems = [{ opts: {} }, { opts: { idle: true } }];
      const lives = W.lives;
      const t0 = W.t;
      const t = seen(W, 15, () => [Bot.bot(W, a, mems[0]), {}], 'revive');
      const ok = t > 0 && !b.ko && W.lives === lives && b.hp === W.D.revive;
      out.push({ name: '2P: Teddy walks over and helps Tommy up (no life lost)', ok, took: +(t - t0).toFixed(1), problems: ok ? [] : [`revive at ${t}, ko ${b.ko}, lives ${W.lives}`] });
    }
    {
      const W = room({ difficulty: 'normal', mode: '2p' });
      const [a, b] = W.players;
      b.u = a.u + 5;
      Sim.hurt(W, b, 999, b.u + 1);
      const lives = W.lives, t0 = W.t;
      const t = seen(W, 20, [], 'revive');
      const ok = t > 0 && t - t0 >= Sim.SELF_UP - 0.1 && t - t0 <= Sim.SELF_UP + 0.5 && !b.ko && W.lives === lives;
      out.push({ name: `2P: nobody comes to help → he gets up on his own after ${Sim.SELF_UP} s (never stuck, no life lost)`, ok, took: t > 0 ? +(t - t0).toFixed(1) : null, problems: ok ? [] : [`revive at ${t > 0 ? (t - t0).toFixed(1) : 'never'}, ko ${b.ko}, lives ${W.lives}`] });
    }
    {
      const W = room({ difficulty: 'normal', mode: '2p' });
      const lives = W.lives;
      for (const p of W.players) Sim.hurt(W, p, 999, p.u + 1);
      const t = seen(W, 4, [], 'life');
      run(W, 1.2);
      const ok = t > 0 && W.lives === lives - 1 && W.players.every((p) => !p.ko && p.hp === p.maxHp);
      out.push({ name: '2P: both down → one life fewer, both back up', ok, problems: ok ? [] : [`life ${t} lives ${W.lives}`] });
    }
    return out;
  }

  function buddyCheck() {
    const out = [];
    {
      const W = room({ difficulty: 'normal' });
      const p = W.players[0];
      for (const du of [3, 5, -3]) Sim.spawn(W, 'hugger', p.u + du);
      Sim.spawn(W, 'thrower', p.u + 6, { want: 5 });
      p.hp = 40;
      run(W, 0.3);
      Sim.call(W, 0);
      const kick = seen(W, 2, [], 'buddyKick');
      const left = W.enemies.filter((e) => Sim.hittable(e)).length;
      const treat = seen(W, 3, [], 'eat');
      const ok = kick > 0 && left === 0 && treat > 0 && p.hp >= 60;
      out.push({ name: '1P: the companion\'s flying kick bonks everyone on screen; his treat heals', ok, problems: ok ? [] : [`kick ${kick} left ${left} treat ${treat} hp ${p.hp}`] });
    }
    {
      const W = room({ difficulty: 'normal' });
      const p = W.players[0];
      Sim.enterArena(W);
      run(W, 3.5);
      const boss = W.boss;
      const hp0 = boss ? boss.hp : 0;
      Sim.call(W, 0);
      seen(W, 2, [], 'buddyKick');
      const took = boss ? hp0 - boss.hp : -1;
      const ok = !!boss && took > 0 && took <= 1.5;
      out.push({ name: '1P: a boss only takes a bit from the companion', ok, took, problems: ok ? [] : [`boss ${!!boss} took ${took}`] });
    }
    {
      const W = room({ difficulty: 'normal' });
      let n = 0;
      for (let i = 0; i < 6; i++) { Sim.call(W, 0); n += seen(W, 0.5, [], 'buddyKick') > 0 ? 1 : 0; }
      const ok = n === 6 && W.calls === 6;
      out.push({ name: '1P: call as often as you like (6 calls in 3 s = 6 flying kicks)', ok, problems: ok ? [] : [`${n} kicks`] });
    }
    {
      const W = room({ difficulty: 'normal', mode: '2p' });
      Sim.call(W, 1);
      run(W, 0.1);
      const ok = W.players.every((p) => p.power > 5) && W.hfCd > 7;
      out.push({ name: '2P: T is a high five that powers up both brothers', ok, problems: ok ? [] : ['no power-up'] });
    }
    return out;
  }

  // the magician's copies must never pop up on a brother either
  function copiesCheck() {
    const W = Sim.create({ floor: 3, difficulty: 'normal', seed: 11, lives: 9, halfW: 4.0 });
    while (W.phase === 'intro') Sim.step(W, []);
    Sim.enterArena(W);
    let closest = Infinity, copies = 0;
    const mem = { opts: {} };
    while (W.t < 200 && W.phase === 'play') {
      Sim.step(W, [Bot.bot(W, W.players[0], mem)]);
      for (const e of W.events) {
        if (e.type === 'spawn' && e.etype === 'copy') { copies++; closest = Math.min(closest, e.near); }
        if (e.type === 'appear') closest = Math.min(closest, Sim.minPlayerDist(W, e.u));
      }
    }
    const ok = copies > 0 && closest >= 2;
    return [{ name: `Puff Magician: copies and reappearing never land on a brother (${copies} copies, closest ${closest.toFixed(2)} m)`, ok, problems: ok ? [] : [`closest ${closest}`] }];
  }

  function all(o) {
    o = o || {};
    const groups = {
      floors: floorsCheck(o), grabs: grabCheck(o), bosses: bossCheck(o), timer: timerCheck(o), knockout: knockoutCheck(o),
      revive: reviveCheck(o), buddy: buddyCheck(o), copies: copiesCheck(o),
    };
    let pass = 0, failN = 0;
    const failures = [];
    for (const k in groups) for (const r of groups[k]) { if (r.ok) pass++; else { failN++; failures.push(`${k}: ${r.name}: ${(r.problems || []).join('; ')}`); } }
    return { ok: failN === 0, pass, fail: failN, failures, groups };
  }

  // Broken variants. Every one of them must FAIL, or the checks above aren't checking anything.
  function prove() {
    const cases = [
      ['an idle player clears floor 1', () => runFloor({ floor: 0, diff: 'easy', mode: '1p', hero: 'teddy', idle: true, limit: 200 })],
      ['a baddie spawned on top of the brother', () => runFloor({ floor: 0, diff: 'easy', mode: '1p', hero: 'teddy', sabotage: 'spawn', limit: 60 })],
      ['a hug that can\'t be escaped', () => { const r = grabCheck({ sabotage: 'grab' }); return { ok: r.every((x) => x.ok) }; }],
      ['a timer that never runs on normal', () => { const r = timerCheck({ sabotage: 'timer' }); return { ok: r[0].ok }; }],
    ];
    const res = cases.map(([name, fn]) => { const r = fn(); return { name, caught: !r.ok }; });
    return { ok: res.every((r) => r.caught), cases: res };
  }

  root.KF_CHECKS = { all, prove, runFloor, floorsCheck, grabCheck, bossCheck, timerCheck, knockoutCheck, reviveCheck, buddyCheck, copiesCheck };
})(typeof window !== 'undefined' ? window : globalThis);
