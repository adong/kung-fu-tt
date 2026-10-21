/* Kung Fu TT: poses, on top of the kit's Kit.people.pose. The kit already has Teddy's boxing (guard, jab, straight),
   his jump shot and Tommy's peace Y. Everything else is here: kung fu stances, high and low punches and kicks, the
   flying kick, crouching, being hugged, the dizzy sit, the huggers' hug and the bosses' wind-ups.
   Kit conventions: rotation.x swings a limb forward, rotation.z swings it out (negative for the left side),
   hips.rotation.x leans (negative = forward) and carries the legs with it. */
(function () {
  'use strict';
  const Sim = window.KF_SIM;
  const KIT = { guard: 1, jab: 1, straight: 1, jumpshot: 1, peace: 1, wave: 1, boxing: 1, fall: 1 };

  const base = () => ({
    ll: 0, rl: 0, llz: 0, rlz: 0, la: 0, ra: 0, laz: 0, raz: 0, lean: -0.08, twist: 0,
    head: 0, headZ: 0, bob: 0, rigY: 0.55, rigX: 0, rigZ: 0, fingers: false,
  });

  function drive(p, T, k) {
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    to(p.legL.rotation, 'x', T.ll); to(p.legR.rotation, 'x', T.rl);
    to(p.legL.rotation, 'z', T.llz); to(p.legR.rotation, 'z', T.rlz);
    to(p.armL.rotation, 'x', T.la); to(p.armR.rotation, 'x', T.ra);
    to(p.armL.rotation, 'z', T.laz); to(p.armR.rotation, 'z', T.raz);
    to(p.hips.rotation, 'x', T.lean); to(p.hips.rotation, 'y', T.twist);
    to(p.head.rotation, 'x', T.head); to(p.head.rotation, 'z', T.headZ);
    to(p.hips.position, 'y', p.hipY + T.bob);
    to(p.rig.position, 'y', T.rigY);
    to(p.rig.rotation, 'x', T.rigX); to(p.rig.rotation, 'z', T.rigZ);
    if (p.fingers) for (const f of p.fingers) f.visible = T.fingers;
  }

  // a kit pose, then the channels the kit doesn't touch eased back to rest
  function kit(p, ph, mode, k, extra) {
    window.Kit.people.pose(p, ph, mode, k);
    const T = Object.assign(base(), extra);
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    to(p.legL.rotation, 'z', T.llz); to(p.legR.rotation, 'z', T.rlz);
    to(p.head.rotation, 'z', T.headZ);
    to(p.rig.position, 'y', T.rigY);
    to(p.rig.rotation, 'x', T.rigX); to(p.rig.rotation, 'z', T.rigZ);
  }

  // ---------------------------------------------------------------- building blocks

  // Teddy keeps his boxing guard; everyone else stands in a low kung fu stance, one palm out.
  function stance(T, style, time) {
    const br = Math.sin(time * 3.6);
    if (style === 'guard') Object.assign(T, { ll: 0.45, rl: -0.25, la: 2.15, ra: 2.15, laz: 0.38, raz: -0.38, lean: -0.28, head: 0.15, bob: Math.abs(br) * 0.04 - 0.06, rigZ: Math.sin(time * 2.6) * 0.05 });
    else Object.assign(T, { ll: 0.5, rl: -0.4, llz: -0.12, rlz: 0.12, la: 1.55 + br * 0.05, laz: 0.12, ra: 0.95, raz: -0.42, lean: -0.1, twist: -0.3, head: 0.05, rigY: 0.47, bob: br * 0.02 - 0.03 });
  }
  function crouch(T, low) {
    const lean = -0.3;
    Object.assign(T, { rigY: low ? 0.08 : 0.16, ll: 0.95 - lean, rl: -0.9 - lean, llz: -0.25, rlz: 0.25, lean });
  }
  function walkLegs(T, time) {
    const s = Math.sin(time * 10);
    T.ll += s * 0.45; T.rl -= s * 0.45;
    T.bob += Math.abs(Math.cos(time * 10)) * 0.05;
  }
  function dizzySit(T, time) {
    Object.assign(T, { rigY: 0.05, ll: 1.45, rl: 1.35, llz: -0.25, rlz: 0.25, lean: 0.25, la: 0.35, ra: 0.35, laz: -0.7, raz: 0.7, head: -0.1, headZ: Math.sin(time * 5) * 0.25, rigZ: Math.sin(time * 5) * 0.06 });
  }
  function handsOnHead(T, time) {
    Object.assign(T, { la: 2.75, ra: 2.75, laz: 0.75, raz: -0.75, lean: 0.12, head: -0.1, headZ: Math.sin(time * 7) * 0.2, rigZ: Math.sin(time * 7) * 0.08, ll: 0.15, rl: -0.15 });
  }
  const K = (dt) => ({ fast: 1 - Math.exp(-32 * dt), med: 1 - Math.exp(-16 * dt), slow: 1 - Math.exp(-7 * dt) });

  // ---------------------------------------------------------------- a brother

  // P: the brother in the rules (js/sim.js). Returns { hop } (extra height for celebration bounces).
  function player(p, P, style, time, dt, celebrateT) {
    const k = K(dt), T = base();
    let kk = k.med, hop = 0;
    const st = P.state;
    if (st === 'ko') { dizzySit(T, time); drive(p, T, k.med); return { hop }; }
    if (st === 'grabbed') {
      Object.assign(T, { la: 2.9, ra: 2.9, laz: -0.3 + Math.sin(time * 26) * 0.3, raz: 0.3 - Math.sin(time * 26) * 0.3, lean: 0.12, rigZ: Math.sin(time * 22) * 0.14, head: -0.15, ll: 0.2, rl: -0.2 });
      drive(p, T, k.fast);
      return { hop };
    }
    if (st === 'hurt') { Object.assign(T, { lean: 0.45, head: -0.35, la: 0.6, ra: 0.6, laz: -0.6, raz: 0.6, ll: -0.2, rl: 0.3 }); drive(p, T, k.fast); return { hop }; }
    if (st === 'celebrate') {
      const t = celebrateT || 0;
      if (P.id === 'teddy') {
        if (t < 1.6) { kit(p, time * 9, 'boxing', k.fast); return { hop }; }
        hop = Math.max(0, Math.sin((t - 1.6) * 5)) * 0.6;
        kit(p, time, 'jumpshot', k.fast);
        return { hop, ball: true };
      }
      hop = Math.abs(Math.sin(t * 5)) * 0.35;
      kit(p, time * 6, 'peace', k.fast, { fingers: true });
      return { hop };
    }
    if (st === 'highfive') {
      Object.assign(T, { ra: 3.0, raz: -0.15, la: 0.6, laz: -0.3, lean: -0.05, ll: 0.3, rl: -0.2 });
      hop = Math.sin(Math.min(1, (0.7 - P.st) / 0.7) * Math.PI) * 0.4;
      drive(p, T, k.fast);
      return { hop };
    }
    if (P.move) {
      const M = Sim.MOVES[P.move], f = P.mt, act = f > (M.s || 0) && f <= (M.s || 0) + (M.a || 99);
      switch (P.move) {
        case 'hpunch':
          stance(T, style, time);
          if (act || f > M.s) Object.assign(T, { la: 1.62, laz: 0.04, ra: 0.9, raz: -0.4, twist: -0.45, lean: -0.3 });
          break;
        case 'lpunch':
          stance(T, style, time); crouch(T);
          Object.assign(T, { la: 1.75, ra: 1.9, laz: 0.3, raz: -0.3 });
          if (act || f > M.s) Object.assign(T, { la: 1.22, laz: 0.05, twist: -0.4 });
          break;
        case 'hkick':
          stance(T, style, time);
          if (f <= M.s) Object.assign(T, { ll: 1.0, rl: -0.2, lean: 0.12 });
          else Object.assign(T, { ll: 1.85, rl: -0.15, llz: 0, lean: 0.38, la: 2.3, ra: 0.5, laz: 0.4, raz: -0.6, twist: -0.1, rigY: 0.55 });
          break;
        case 'lkick':
          crouch(T, true);
          Object.assign(T, { la: 0.75, ra: 0.6, laz: -0.25, raz: 0.25 });
          if (f > M.s) Object.assign(T, { ll: 1.75, llz: 0, rl: -0.65, lean: -0.15, twist: -0.25 });
          break;
        case 'jkick':
          Object.assign(T, { ll: 1.6, rl: -0.65, la: 2.5, ra: -0.6, laz: 0.4, raz: -0.3, lean: 0.25 });
          kk = k.fast;
          break;
        case 'jpunch':
          Object.assign(T, { ll: 1.0, rl: 0.4, la: 1.6, ra: 2.2, laz: 0.05, raz: -0.4, lean: -0.2, twist: -0.35 });
          break;
        case 'combo': {
          const w = M.hits.findIndex(([a, b]) => f >= a - 2 && f <= b + 3);
          if (w === 0 || w === 1) { kit(p, 0, 'jab', k.fast, { rigY: 0.5 }); return { hop }; }
          if (w === 2) { kit(p, 0, 'straight', k.fast, { rigY: 0.5 }); return { hop }; }
          kit(p, 0, 'guard', k.fast);
          return { hop };
        }
        case 'ywave':
          if (f < M.waveAt) Object.assign(T, { la: 0.6, ra: 0.6, laz: 0.55, raz: -0.55, lean: -0.25, rigY: 0.42, head: 0.2 });
          else { kit(p, time * 4, 'peace', k.fast, { fingers: true, rigY: 0.58 }); return { hop: f < M.waveAt + 10 ? 0.15 : 0 }; }
          break;
      }
      drive(p, T, k.fast);
      return { hop };
    }
    if (P.y > 0.01) {
      Object.assign(T, { ll: 1.25, rl: 0.45, la: 2.2, ra: 1.9, laz: 0.3, raz: -0.3, lean: -0.1 });
      if (style === 'guard') Object.assign(T, { la: 2.2, ra: 2.2, laz: 0.4, raz: -0.4 });
      drive(p, T, k.fast);
      return { hop };
    }
    stance(T, style, time);
    if (st === 'crouch') crouch(T);
    else if (P.walking) walkLegs(T, time);
    if (st === 'getup') kk = k.slow;
    drive(p, T, kk);
    return { hop };
  }

  // ---------------------------------------------------------------- the companion

  function buddy(p, B, time, dt) {
    const k = K(dt), T = base();
    if (B.state === 'fly') {
      Object.assign(T, { ll: 1.6, rl: -0.6, la: 2.5, ra: -0.6, laz: 0.4, raz: -0.3, lean: 0.2 });
      drive(p, T, k.fast);
      return;
    }
    if (B.state === 'sig') {
      if (B.who === 'teddy') kit(p, time * 9, 'boxing', k.fast);
      else kit(p, time * 6, 'peace', k.fast, { fingers: true });
      return;
    }
    if (B.state === 'bye') { kit(p, time * 8, 'wave', k.fast); return; }
    stance(T, 'kf', time);
    drive(p, T, k.med);
  }

  // ---------------------------------------------------------------- baddies

  function enemy(p, e, time, dt) {
    const k = K(dt), T = base();
    const s = Math.sin(time * 9 + e.id);
    switch (e.state) {
      case 'bonked': kit(p, time, 'fall', k.fast); return;
      case 'dizzy': case 'stun': handsOnHead(T, time + e.id); drive(p, T, k.fast); return;
      case 'hurt': Object.assign(T, { lean: 0.45, head: -0.3, la: 1.0, ra: 1.0, laz: -0.5, raz: 0.5 }); drive(p, T, k.fast); return;
    }
    if (e.type === 'hugger') {
      if (e.state === 'hug') Object.assign(T, { la: 1.5, ra: 1.5, laz: 0.55, raz: -0.55, lean: -0.15, bob: Math.abs(s) * 0.05, rigZ: s * 0.06, ll: 0.15, rl: -0.15 });
      else {
        Object.assign(T, { la: 1.5 + s * 0.1, ra: 1.5 - s * 0.1, laz: -0.15, raz: 0.15, lean: -0.15 });
        if (e.state === 'walk') walkLegs(T, time + e.id);
      }
    } else if (e.type === 'thrower') {
      Object.assign(T, { ll: 0.3, rl: -0.2, la: 0.9, laz: -0.2, ra: 0.4, raz: 0.2, lean: -0.05 });
      if (e.state === 'windup') Object.assign(T, e.band === 'high' ? { ra: 3.0, raz: -0.2, lean: 0.15, la: 1.4 } : { ra: -0.9, raz: 0.1, lean: -0.25, rigY: 0.4, ll: 0.7, rl: -0.6, la: 1.2 });
      else if (e.state === 'cool' && e.st > (e.st0 || 1.4) - 0.25) Object.assign(T, { ra: 1.6, lean: -0.3 });
      else if (e.state === 'walk') walkLegs(T, time + e.id);
    } else if (e.type === 'copy') {
      stance(T, 'kf', time);
      if (e.state === 'windup') Object.assign(T, { la: 1.6, ra: 1.6, laz: 0.2 + s * 0.15, raz: -0.2 - s * 0.15, twist: 0 });
    }
    drive(p, T, k.med);
  }

  // ---------------------------------------------------------------- bosses

  function boss(p, b, time, dt) {
    const k = K(dt), T = base();
    const a = b.atk, s = Math.sin(time * 8);
    if (b.state === 'beaten') {
      if (b.st < 0.8) { handsOnHead(T, time); drive(p, T, k.fast); return; }
      // a polite bow: "you win!"
      Object.assign(T, { lean: -0.75, head: 0.3, la: 0.2, ra: 0.2, laz: 0.1, raz: -0.1 });
      drive(p, T, k.slow);
      return;
    }
    if (b.state === 'flinch') { Object.assign(T, { lean: 0.4, head: -0.3, la: 1.1, ra: 1.1, laz: -0.5, raz: 0.5, ll: -0.1, rl: 0.2 }); drive(p, T, k.fast); return; }
    if (b.state === 'hop' || b.state === 'vanish') { Object.assign(T, { ll: 1.1, rl: 0.5, la: 2.3, ra: 2.3, laz: 0.4, raz: -0.4 }); drive(p, T, k.fast); return; }
    stance(T, 'kf', time);
    if (b.kind === 'belly') Object.assign(T, { la: 1.1, ra: 1.1, laz: -0.55, raz: 0.55, twist: 0, ll: 0.3, rl: -0.3, llz: -0.3, rlz: 0.3, rigY: 0.5 });
    if (b.kind === 'staff') Object.assign(T, { la: 1.35, ra: 1.2, laz: 0.25, raz: -0.25, twist: -0.2 });
    if (b.state === 'walk') walkLegs(T, time);
    if (b.state === 'idle' && b.kind === 'grand') Object.assign(T, { la: 1.7, ra: 0.6, laz: 0.1, raz: -0.6, head: 0.1 });
    if ((b.state === 'tele' || b.state === 'act' || b.state === 'rec') && a) {
      const tele = b.state === 'tele', act = b.state === 'act';
      switch (a.name) {
        case 'poke': case 'strike':
          if (a.band === 'high') Object.assign(T, tele ? { la: 2.5, ra: 2.4, lean: 0.2, twist: 0.3 } : { la: 1.65, ra: 1.6, laz: 0, raz: 0, lean: -0.45, twist: -0.35 });
          else { crouch(T); Object.assign(T, tele ? { la: 0.5, ra: 0.6, twist: 0.3 } : { la: 1.05, ra: 1.0, laz: 0, raz: 0, twist: -0.4, lean: -0.5 }); }
          break;
        case 'spin': Object.assign(T, { la: 1.5, ra: 1.5, laz: -0.8, raz: 0.8, lean: tele ? 0.1 : -0.2, rigY: 0.4 }); break;
        case 'shove': case 'bump':
          Object.assign(T, tele ? { lean: 0.45, la: -0.6, ra: -0.6, laz: -0.3, raz: 0.3, rigY: 0.5 } : { lean: -0.55, la: -0.9, ra: -0.9, ll: 0.6, rl: -0.6 });
          break;
        case 'boomer': case 'spark':
          if (a.band === 'high') Object.assign(T, tele ? { ra: 3.0, raz: -0.3, la: 1.3, lean: 0.2 } : { ra: 1.5, la: 1.0, lean: -0.3 });
          else Object.assign(T, tele ? { ra: -0.9, raz: 0.2, la: 1.2, rigY: 0.4, lean: -0.25 } : { ra: 1.0, la: 1.0, lean: -0.35, rigY: 0.45 });
          if (b.kind === 'puff' && tele) Object.assign(T, { la: 1.6, ra: 1.6, laz: 0.2 + s * 0.2, raz: -0.2 - s * 0.2 });
          break;
        case 'stomp':
          Object.assign(T, tele ? { ll: 1.5, rl: -0.1, la: 2.6, ra: 2.6, laz: -0.4, raz: 0.4, lean: 0.15 } : { ll: 0.6, rl: -0.6, llz: -0.35, rlz: 0.35, la: 1.0, ra: 1.0, laz: -0.6, raz: 0.6, rigY: 0.3, lean: -0.3 });
          break;
        case 'palm':
          Object.assign(T, tele ? { la: 0.4, ra: 0.4, laz: -0.3, raz: 0.3, twist: 0.5, lean: 0.1, rigY: 0.45 } : { la: 1.6, ra: 1.6, laz: 0.05, raz: -0.05, twist: 0, lean: -0.4, rigY: 0.45, ll: 0.6, rl: -0.6 });
          break;
        case 'sweep':
          crouch(T, true);
          Object.assign(T, { la: 0.75, ra: 0.6, laz: -0.25, raz: 0.25 });
          if (!tele) Object.assign(T, { ll: 1.75, llz: 0, rl: -0.65, lean: -0.15 });
          break;
        case 'fly':
          if (tele) { crouch(T); Object.assign(T, { la: -0.6, ra: -0.6 }); }
          else Object.assign(T, { ll: 1.6, rl: -0.65, la: 2.5, ra: -0.6, laz: 0.4, raz: -0.3, lean: 0.25, rigY: 0.55 });
          break;
      }
      drive(p, T, k.fast);
      return;
    }
    drive(p, T, k.med);
  }

  // the Golden Panda: sitting and waiting, then cheering
  function panda(p, cheering, time, dt) {
    const k = K(dt), T = base();
    if (cheering) { kit(p, time * 7, 'wave', k.fast); return Math.abs(Math.sin(time * 6)) * 0.4; }
    Object.assign(T, { rigY: 0.05, ll: 1.5, rl: 1.5, llz: -0.3, rlz: 0.3, la: 0.9 + Math.sin(time * 2) * 0.1, ra: 0.9, laz: -0.3, raz: 0.3, lean: 0.05, headZ: Math.sin(time * 1.5) * 0.15 });
    drive(p, T, k.med);
    return 0;
  }

  // title screen: the brothers practise their moves
  function kata(p, who, time, dt) {
    const k = K(dt), T = base();
    const beat = Math.floor(time / 1.1) % 4, u = (time % 1.1) / 1.1;
    if (who === 'teddy') {
      if (beat === 3) { kit(p, time * 9, 'boxing', k.fast); return 0; }
      stance(T, 'guard', time);
      if (beat === 1 && u > 0.3 && u < 0.7) Object.assign(T, { ll: 1.85, rl: -0.15, lean: 0.38, la: 2.3, ra: 0.5 });
    } else {
      if (beat === 3) { kit(p, time * 6, 'peace', k.fast, { fingers: true }); return Math.abs(Math.sin(time * 5)) * 0.2; }
      stance(T, 'kf', time);
      if (beat === 1 && u > 0.3 && u < 0.7) Object.assign(T, { la: 1.62, ra: 0.9, twist: -0.45, lean: -0.3 });
      if (beat === 2 && u > 0.3 && u < 0.7) { crouch(T, true); Object.assign(T, { ll: 1.75, llz: 0, rl: -0.65, la: 0.75, ra: 0.6 }); }
    }
    drive(p, T, k.fast);
    return 0;
  }

  window.KF_POSES = { player, buddy, enemy, boss, panda, kata, KIT };
})();
