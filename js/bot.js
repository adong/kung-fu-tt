/* Kung Fu TT: the autopilot. It plays a brother with the same inputs a kid has (walk, crouch, jump, punch, kick,
   special, call), so tools/check.js and game.autoplay() prove every floor can be finished. It reads the world the
   way a kid reads the screen: a bag coming high means duck, low means jump, a boss winding up means get ready. */
(function (root) {
  'use strict';
  const Sim = root.KF_SIM;
  const sgn = (v) => (v < 0 ? -1 : 1);
  const SMALL = { imp: 1, dragon: 1, confetti: 1 };
  // how far each boss move reaches from the boss, and at what height (for knowing what to do in the wind-up)
  const ZONE = {
    poke: [2.8, 'band'], spin: [2.5, 'low', true], shove: [2.0, 'all'], bump: [2.45, 'all'], sweep: [2.5, 'low'],
    strike: [2.0, 'band'], fly: [8, 'high'],
  };

  // What's about to hit p? 'crouch', 'jump', 'back' or null.
  function danger(W, p) {
    for (const s of W.shots) {
      const du = s.u - p.u, v = s.vel != null ? s.vel : s.vu;
      const coming = (v !== 0 && sgn(v) === -sgn(du)) || Math.abs(du) < 0.5;
      if (!coming || s.hit.has(p.slot)) continue;
      const tt = (Math.abs(du) - s.w - 0.3) / Math.max(0.1, Math.abs(v));
      if (s.y0 >= 1.1) { if (tt < 0.45) return 'crouch'; }
      else if (s.y1 <= 0.62) { if (tt < 0.2) return 'jump'; if (tt < 0.5) return 'wait'; }
      else if (tt < 0.6) return 'back';
    }
    for (const k of W.strikes) {
      if (k.hit.has(p.slot) || p.u < k.u0 - 0.5 || p.u > k.u1 + 0.5) continue;
      if (k.y0 >= 1.1) return 'crouch';
      if (k.y1 <= 0.62) return p.y > 0 ? 'air' : 'jump';
      return 'back';
    }
    const b = W.boss;
    if (b && (b.state === 'tele' || (b.state === 'act' && b.atk && b.atk.name === 'fly')) && b.atk && ZONE[b.atk.name]) {
      const [reach, kind, both] = ZONE[b.atk.name];
      const du = p.u - b.u;
      const inFront = both || sgn(du) === b.face || Math.abs(du) < 0.4;
      if (inFront && Math.abs(du) < reach + 0.6) {
        const band = kind === 'band' ? (b.atk.band === 'high' ? 'high' : 'low') : kind;
        if (band === 'high') return 'crouch';
        if (band === 'low') return b.state === 'tele' && b.st < 0.12 ? 'jump' : 'ready';
        return 'back';
      }
    }
    return null;
  }

  function bot(W, p, mem) {
    mem = mem || {};
    mem.f = (mem.f || 0) + 1;
    const o = mem.opts || {};
    const inp = {};
    if (o.idle || p.ko || W.phase !== 'play') return inp;
    const canCall = o.call && W.mode === '1p' && W.t - (mem.lastCall == null ? -99 : mem.lastCall) > (o.callEvery || 12);
    if (p.state === 'grabbed') {
      if (canCall && Sim.huggersOn(W, p).length >= 2) { inp.call = true; mem.lastCall = W.t; return inp; }
      if (!o.noMash && mem.f % (o.mashEvery || 5) === 0) { inp.mash = 1; inp.punch = true; }
      return inp;
    }
    if (p.state === 'hurt' || p.state === 'getup' || p.state === 'highfive' || p.state === 'celebrate') return inp;
    if (canCall && (p.hp < 40 || o.callAlways)) { inp.call = true; mem.lastCall = W.t; }
    if (W.mode === '2p' && o.call && W.hfCd <= 0 && p.slot === 0 && mem.f % 600 === 0) inp.call = true;

    const d = danger(W, p);
    if (d === 'crouch') { inp.down = true; return inp; }
    if (d === 'jump') { if (p.y <= 0 && !p.move) inp.jump = true; return inp; }
    if (d === 'back' && W.boss) { inp[W.boss.u > p.u ? 'l' : 'r'] = true; return inp; }
    if (d === 'back' || d === 'wait' || d === 'ready' || d === 'air') return inp;
    if (p.y > 0) {
      const t = target(W, p);
      if (t && t.d < 1.5 && sgn(t.e.u - p.u) === p.face) inp.kick = true;
      return inp;
    }
    if (p.move) return inp;

    // two players: go and help your brother up
    const mate = W.players.find((q) => q !== p);
    if (mate && mate.ko) {
      const du = mate.u - p.u;
      const t = target(W, p);
      if (t && t.d < 1.2) return attack(W, p, t, inp);
      if (Math.abs(du) > 0.9) inp[du > 0 ? 'r' : 'l'] = true;
      return inp;
    }

    const t = target(W, p);
    if (t && t.d < reachFor(t.e)) return attack(W, p, t, inp);
    // a pot is about to drop just ahead: wait for it (or kick it as it falls)
    for (const pot of W.pots) {
      if ((pot.state === 'wobble' || pot.state === 'fall') && Math.abs(pot.u - p.u) < 2.0) {
        if (pot.state === 'fall' && pot.y < 2.0 && Math.abs(pot.u - p.u) < 1.5) { if (sgn(pot.u - p.u) !== p.face) inp[pot.u > p.u ? 'r' : 'l'] = true; else inp.kick = true; return inp; }
        if (Math.abs(pot.u - p.u) < 0.9) inp[pot.u > p.u ? 'l' : 'r'] = true;
        return inp;
      }
    }
    // food when hungry
    if (p.hp < 70) {
      const it = W.items.find((i) => Math.abs(i.u - p.u) < 5 && i.y < 0.5);
      if (it) { inp[it.u > p.u ? 'r' : 'l'] = true; return inp; }
    }
    if (t && t.d < 6) {
      // walk at it (but not into a boss in the middle of a move)
      const du = t.e.u - p.u;
      if (t.e.type === 'boss' && t.e.state === 'rec') { inp[du > 0 ? 'r' : 'l'] = true; return inp; }
      if (t.e.type === 'boss' && t.d < 2.6 && (t.e.state === 'tele' || t.e.state === 'act')) return inp;
      inp[du > 0 ? 'r' : 'l'] = true;
      return inp;
    }
    inp.r = true;
    return inp;
  }

  const reachFor = (e) => (SMALL[e.type] ? 1.5 : e.type === 'boss' ? 1.45 : 1.45);

  function target(W, p) {
    let best = null, bd = Infinity;
    for (const e of W.enemies) {
      if (!Sim.hittable(e)) continue;
      const d = Math.abs(e.u - p.u) - e.w;
      if (d < bd) { bd = d; best = e; }
    }
    return best ? { e: best, d: bd } : null;
  }

  function attack(W, p, t, inp) {
    const e = t.e, face = sgn(e.u - p.u);
    if (p.face !== face && Math.abs(e.u - p.u) > 0.1) { inp[face > 0 ? 'r' : 'l'] = true; return inp; }
    let crowd = 0;
    for (const q of W.enemies) if (Sim.hittable(q) && Math.abs(q.u - p.u) < 2.2) crowd++;
    if (p.specCd <= 0 && (crowd >= 2 || e.type === 'boss')) { inp.special = true; return inp; }
    if (SMALL[e.type] && e.y < 0.3) { inp.down = true; inp.kick = true; return inp; }
    if (e.type === 'imp') { inp.kick = true; return inp; }
    if (t.d < 0.75) inp.punch = true; else inp.kick = true;
    return inp;
  }

  root.KF_BOT = { bot, danger };
})(typeof window !== 'undefined' ? window : globalThis);
