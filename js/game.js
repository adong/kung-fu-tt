/* Kung Fu TT: the game shell. Three.js scene and camera, the brothers and the baddies as kit people, the HUD, the
   menus, the companion's visits, the floor-clear celebrations, the Golden Panda at the top, the touch controls and
   the test hooks (window.game). The rules live in js/sim.js; this file only draws what the rules say and turns their
   events into effects and sounds. */
(function () {
  'use strict';
  const T = THREE, Kit = window.Kit, G = Kit.gfx;
  const Sim = window.KF_SIM, Bot = window.KF_BOT, Poses = window.KF_POSES, Models = window.KF_MODELS, Scene = window.KF_SCENE;
  const Fx = window.KF_FX, Sfx = window.KF_SFX, Input = window.KF_INPUT, Checks = window.KF_CHECKS;
  const FLOORS = window.KF_FLOORS, TITLE = window.KF_TITLE;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const PI = Math.PI;

  document.title = `${TITLE.NAME} · Teddy & Tommy`;

  // ---------------------------------------------------------------- saved progress

  const SAVE_KEY = 'kungFuTT.v1';
  const save = { best: 0, reached: 0, diff: 'easy', hero: 'teddy', floor: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* storage blocked */ }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ } };

  // ---------------------------------------------------------------- three.js

  const canvas = $('game');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene();
  const FOV = 30, TAN = Math.tan((FOV / 2) * PI / 180);
  const camera = new T.PerspectiveCamera(FOV, 1, 0.1, 400);
  const hemi = new T.HemisphereLight('#fff6e8', '#8a5a3a', 0.95);
  const sun = new T.DirectionalLight('#fff1d6', 0.9);
  sun.position.set(-3, 9, 10);
  scene.add(hemi, sun);
  Fx.init(scene);

  let vw = 0, vh = 0;
  const aspect = () => (window.innerWidth || 800) / (window.innerHeight || 600);
  // How much hall fits across the screen: less on a narrow (portrait) screen, so the brothers stay big enough.
  const viewHalfW = () => { const a = aspect(); return a >= 1.6 ? 6.6 : a >= 1.3 ? 5.8 : a >= 1.0 ? 5.0 : 4.2; };
  function resize() {
    const w = window.innerWidth || 800, h = window.innerHeight || 600;
    if (w === vw && h === vh) return;
    vw = w; vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (W && !W.arena) { W.halfW = viewHalfW(); W.camA = W.L - W.halfW + 0.5; }
  }

  // ---------------------------------------------------------------- faces for the menus and the HUD

  const faces = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy')], { size: 152 });
  document.querySelectorAll('.pick').forEach((b) => { b.querySelector('img').src = faces[b.dataset.hero]; });
  $('teamF0').src = faces.teddy; $('teamF1').src = faces.tommy;

  const BAND = { teddy: '#e8303a', tommy: '#ff8a1f' };
  const SPEC_EMOJI = { teddy: '🥊', tommy: '✌️' };
  const BOSS_EMOJI = { staff: '🎋', bao: '🥟', belly: '🥁', puff: '🎩', grand: '🥋' };
  const BOSS_EXTRAS = { staff: [{ band: '#2f7d3a' }, 'staff'], bao: ['chef', 'boomerang'], belly: [{ band: '#e8303a' }, 'sash'], puff: ['wizard'], grand: ['beard', 'sash'] };
  const BOSS_SCALE = { staff: 1.08, bao: 1.1, belly: 1.42, puff: 1.05, grand: 1.06 };
  const TREAT_NAME = { '🍦': 'ICE CREAM', '💧': 'WATER', '🧃': 'JUICE BOX', '🍪': 'COOKIE', '🍉': 'WATERMELON', '🍌': 'BANANA', '🥟': 'DUMPLING' };

  // ---------------------------------------------------------------- state

  let screen = 'loading', mode = '1p', W = null, hall = null, demo = null;
  let acc = 0, clock = 0, held = false, autoplay = false, celebrateT = 0, floorScore = 0, endT = -1, endKind = null;
  let shake = 0, camX = 0, pickSel = save.hero, pandaCheer = false;
  const views = new Map();
  let buddyView = null;

  function disposeObj(o) {
    scene.remove(o);
    o.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material && !(c instanceof T.Sprite)) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { if (!m.userData.shared) m.dispose(); });
    });
  }

  function clearViews() {
    for (const v of views.values()) disposeObj(v.root);
    views.clear();
    if (buddyView) { disposeObj(buddyView.root); buddyView = null; }
    Fx.clear();
  }

  // ---------------------------------------------------------------- views

  const SIDE = 0.35;
  const yaw = (screenFace, a) => (screenFace > 0 ? -(PI / 2 + a) : PI / 2 + a);

  function personView(kind, p, scale) {
    const root = new T.Group();
    root.add(p.root);
    p.root.scale.setScalar(scale || 1);
    const sh = Models.shadow();
    sh.scale.setScalar(scale || 1);
    root.add(sh);
    scene.add(root);
    return { kind, root, p, shadow: sh, scale: scale || 1, pop: 0 };
  }

  function playerView(P) {
    const look = Kit.roster.get(P.id).look;
    const p = Models.person(look, [{ band: BAND[P.id] }]);
    return personView('player', p, P.id === 'tommy' ? 0.88 : 1);
  }

  function enemyView(e) {
    if (e.type === 'boss') {
      const p = Models.person(Models.LOOKS[e.kind], BOSS_EXTRAS[e.kind]);
      const v = personView('boss', p, BOSS_SCALE[e.kind]);
      return v;
    }
    if (e.type === 'hugger') return personView('enemy', Models.person(Models.LOOKS.hugger[e.id % 4]), 0.95);
    if (e.type === 'thrower') return personView('enemy', Models.person(Models.LOOKS.thrower[e.id % 2], ['bag']), 1);
    if (e.type === 'copy') return personView('enemy', Models.person(Models.LOOKS.puff, ['wizard']), BOSS_SCALE.puff);
    const root = new T.Group();
    const m = e.type === 'imp' ? Models.imp(e.id) : e.type === 'dragon' ? Models.dragon() : Models.confettiBall();
    root.add(m);
    const sh = Models.shadow();
    sh.scale.setScalar(e.type === 'dragon' ? 0.9 : 0.7);
    root.add(sh);
    scene.add(root);
    return { kind: 'small', root, m, shadow: sh, scale: 1, pop: 0 };
  }

  function shotView(s) {
    const root = new T.Group();
    let spin = 0, sprite = null;
    if (s.kind === 'bag') { root.add(Models.bag(s.y0 > 1 ? '#e8203a' : '#2a7bd6')); spin = 8; }
    else if (s.kind === 'boomer') { const b = Models.boomerang(); root.add(b); spin = 22; }
    else if (s.kind === 'spark') { sprite = new T.Sprite(new T.SpriteMaterial({ map: Fx.emojiTex('✨'), transparent: true, depthWrite: false })); sprite.scale.setScalar(0.62); root.add(sprite); }
    else if (s.kind === 'palm') {
      const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#8cd8ff', transparent: true, depthWrite: false }));
      glow.scale.setScalar(1.6); root.add(glow);
      sprite = new T.Sprite(new T.SpriteMaterial({ map: Fx.emojiTex('🖐️'), transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.85); root.add(sprite);
    } else if (s.kind === 'shock') {
      const m = new T.Mesh(new T.SphereGeometry(0.4, 14, 10), new T.MeshStandardMaterial({ color: '#e8d6b0', roughness: 1, transparent: true, opacity: 0.85 }));
      m.scale.set(1.1, 0.55, 2.4); root.add(m);
    }
    scene.add(root);
    return { kind: 'shot', root, spin, sprite };
  }

  function itemView(it) {
    const root = new T.Group();
    const sp = new T.Sprite(new T.SpriteMaterial({ map: Fx.emojiTex(it.emoji), transparent: true, depthWrite: false }));
    sp.scale.setScalar(0.62);
    sp.position.y = 0.35;
    root.add(sp);
    const sh = Models.shadow(); sh.scale.setScalar(0.5); root.add(sh);
    scene.add(root);
    return { kind: 'item', root, sp };
  }

  function potView() { const g = Models.pot(); scene.add(g); return { kind: 'pot', root: g }; }

  const zOf = (id) => ((id * 37) % 7) / 7 * 0.6 - 0.3;

  // Keep every model where the rules say it is.
  function syncWorld(dt) {
    if (!W) return;
    const d = W.dir, t = clock;
    const seen = new Set();
    // the brothers
    W.players.forEach((P, i) => {
      const key = 'p' + i;
      seen.add(key);
      let v = views.get(key);
      if (!v) { v = playerView(P); views.set(key, v); }
      const sf = d * P.face;
      const r = Poses.player(v.p, P, P.id === 'teddy' ? 'guard' : 'kf', t, dt, celebrateT);
      v.root.position.set(d * P.u, 0, W.mode === '2p' ? (i ? -0.3 : 0.3) : 0.1);
      v.p.root.position.y = P.y + (r.hop || 0);
      const want = P.state === 'celebrate' && W.mode === '1p' ? 0 : yaw(sf, SIDE);
      v.p.root.rotation.y += (want - v.p.root.rotation.y) * Math.min(1, dt * 18);
      v.shadow.scale.setScalar(v.scale * Math.max(0.4, 1 - P.y * 0.25));
      v.p.root.visible = !(P.inv > 0 && P.state !== 'getup' && P.state !== 'highfive' && !(P.move && Sim.MOVES[P.move].special) && Math.floor(t * 16) % 2 === 0);
      if (P.power > 0 && Math.random() < dt * 14) Fx.stars(d * P.u + (Math.random() - 0.5) * 0.6, 1 + Math.random(), 0.3, 1, ['#ffd400', '#fff6a8']);
      if (P.state === 'ko' && Math.random() < dt * 3) Fx.stars(d * P.u, 1.2, 0.3, 1, ['#ffd400']);
    });
    // baddies and the boss
    for (const e of W.enemies) {
      const key = 'e' + e.id;
      seen.add(key);
      let v = views.get(key);
      if (!v) { v = enemyView(e); views.set(key, v); }
      const sf = d * e.face;
      const z = e.type === 'boss' ? -0.15 : zOf(e.id);
      v.root.position.set(d * e.u, 0, z);
      if (v.kind === 'small') syncSmall(v, e, sf, dt, t);
      else {
        if (e.type === 'boss') Poses.boss(v.p, e, t, dt);
        else Poses.enemy(v.p, e, t, dt);
        v.p.root.position.y = e.y;
        if (e.state === 'bonked') { v.p.root.rotation.z += dt * 14 * -sf; v.p.root.rotation.y = yaw(sf, 0.2); }
        else {
          const want = e.type === 'boss' && e.state === 'act' && e.atk && e.atk.name === 'spin' ? v.p.root.rotation.y + dt * 30 : yaw(sf, 0.28);
          v.p.root.rotation.y = e.type === 'boss' && e.atk && e.atk.name === 'spin' && e.state === 'act' ? want : v.p.root.rotation.y + (want - v.p.root.rotation.y) * Math.min(1, dt * 14);
          v.p.root.rotation.z = 0;
        }
        v.root.visible = e.state !== 'vanish';
        if (e.kind === 'puff' && v.p.extras.star) { const s = 1 + Math.abs(Math.sin(t * 6)) * 0.6; v.p.extras.star.scale.set(s, s, 1); }
        if (e.type === 'boss' && e.kind === 'staff' && v.p.extras.staff) v.p.extras.staff.rotation.x = e.state === 'act' && e.atk && e.atk.name === 'spin' ? 1.4 : 0;
        if (e.type === 'boss' && e.kind === 'bao' && v.p.extras.held) v.p.extras.held.visible = !W.shots.some((s) => s.by === e.id);
        if (e.type === 'thrower' && v.p.extras.held) v.p.extras.held.visible = e.state !== 'cool' || e.st < 1.0;
        if (e.state === 'hug' && Math.random() < dt * 2.2) Fx.heart(d * e.u, 2.0, z);
        if ((e.state === 'stun' || e.state === 'dizzy') && Math.random() < dt * 4) Fx.stars(d * e.u, e.h + 0.2, z, 1, ['#ffd400']);
      }
      v.pop = Math.max(0, v.pop - dt);
      const ps = 1 + v.pop * 1.4;
      if (v.kind !== 'small') v.p.root.scale.setScalar(v.scale * ps);
      if (e.state === 'bonked') v.root.scale.setScalar(Math.max(0.2, 1 - e.st * 0.9));
      v.shadow.visible = e.state !== 'bonked' && e.state !== 'vanish';
    }
    // shots, food, pots
    for (const s of W.shots) {
      const key = 's' + s.id;
      seen.add(key);
      let v = views.get(key);
      if (!v) { v = shotView(s); views.set(key, v); }
      v.root.position.set(d * s.u, (s.y0 + s.y1) / 2, 0.05);
      if (s.kind === 'shock') v.root.position.y = 0.1;
      if (v.spin) v.root.rotation.y += dt * v.spin;
      if (v.sprite) v.sprite.material.rotation += dt * 6;
      if (s.kind === 'shock' && Math.random() < dt * 20) Fx.dust(d * s.u, 0, 2);
    }
    for (const it of W.items) {
      const key = 'i' + it.id;
      seen.add(key);
      let v = views.get(key);
      if (!v) { v = itemView(it); views.set(key, v); }
      v.root.position.set(d * it.u, 0, 0.6);
      v.sp.position.y = 0.35 + it.y + Math.abs(Math.sin(t * 3 + it.id)) * 0.12;
      v.sp.visible = !(it.life !== Infinity && it.life - it.t < 3 && Math.floor(t * 8) % 2 === 0);
    }
    for (const pot of W.pots) {
      if (pot.state === 'gone') continue;
      const key = 'o' + pot.id;
      seen.add(key);
      let v = views.get(key);
      if (!v) { v = potView(); views.set(key, v); }
      const wob = pot.state === 'wobble' ? Math.sin(t * 40) * 0.12 : pot.state === 'hang' ? Math.sin(t * 1.4 + pot.id) * 0.03 : 0;
      v.root.position.set(d * pot.u, pot.y, -0.2);
      v.root.rotation.z = wob;
      const rope = v.root.userData.rope;
      rope.visible = pot.state !== 'fall';
      const ropeLen = Math.max(0.1, 6.0 - pot.y - 0.72);
      rope.scale.y = ropeLen; rope.position.y = 0.72 + ropeLen / 2;
    }
    for (const [key, v] of views) if (!seen.has(key)) { disposeObj(v.root); views.delete(key); }
    // the companion
    const B = W.buddy;
    if (B && B.state !== 'gone') {
      if (!buddyView) {
        const e = Kit.roster.get(B.who);
        const p = Models.person(e.look, [{ band: BAND[B.who] }]);
        buddyView = personView('buddy', p, e.buddyScale || 0.8);
      }
      Poses.buddy(buddyView.p, B, t, dt);
      buddyView.root.position.set(d * B.u, 0, 0.75);
      buddyView.p.root.position.y = B.y;
      buddyView.p.root.rotation.y = B.state === 'sig' ? yaw(d * B.face, 1.0) : yaw(d * B.face, 0.3);
      buddyView.shadow.scale.setScalar(buddyView.scale * Math.max(0.3, 1 - B.y * 0.25));
      buddyView.root.visible = true;
      if (B.state === 'fly' && Math.random() < dt * 30) Fx.stars(d * B.u, B.y + 1, 0.8, 1, ['#ffffff', '#8cd8ff']);
    } else if (buddyView) buddyView.root.visible = false;
    // the Golden Panda
    if (hall && hall.panda) {
      const hop = Poses.panda(hall.panda, pandaCheer, t, dt);
      hall.panda.root.position.y = 0.12 + hop;
      if (pandaCheer) {
        const want = W.dir > 0 ? -(PI / 2 + 0.9) : PI / 2 + 0.9;
        hall.panda.root.rotation.y += (want - hall.panda.root.rotation.y) * Math.min(1, dt * 6);
        hall.panda.root.position.x += (d * (W.L - 0.6) - hall.panda.root.position.x) * Math.min(1, dt * 2);
        hall.panda.root.position.z += (0.2 - hall.panda.root.position.z) * Math.min(1, dt * 2);
      }
      if (hall.cage && pandaCheer) { const bars = hall.cage.userData.bars; bars.position.y = Math.min(4, bars.position.y + dt * 3); }
    }
  }

  function syncSmall(v, e, sf, dt, t) {
    const m = v.m;
    m.position.y = e.y;
    m.rotation.y = yaw(sf, 0.25);
    if (e.state === 'bonked') { m.rotation.z += dt * 16 * -sf; return; }
    m.rotation.z = 0;
    if (e.type === 'imp') { const sq = e.y > 0.01 ? 1.12 : 1 - Math.abs(Math.sin(t * 10)) * 0.06; m.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); }
    if (e.type === 'dragon') {
      const segs = m.userData.segs;
      segs.forEach((s, i) => { s.position.x = Math.sin(t * 11 - i * 0.9) * 0.12; s.position.y = 0.18 + Math.abs(Math.sin(t * 11 - i * 0.9)) * 0.08; });
      m.userData.head.position.y = 0.22 + Math.sin(t * 11) * 0.04;
      if (e.state === 'enter') m.scale.setScalar(Math.min(1, (0.45 - e.st) / 0.45 + 0.2));
      else m.scale.setScalar(1);
    }
    if (e.type === 'confetti') {
      m.userData.ball.rotation.x += dt * 6 * (e.state === 'walk' ? 1 : 0);
      const fuse = e.fuse / 3.2;
      m.userData.spark.scale.setScalar(0.25 + Math.abs(Math.sin(t * (fuse < 0.35 ? 30 : 12))) * 0.2);
      if (e.state === 'enter') m.scale.setScalar(Math.min(1, (0.45 - e.st) / 0.45 + 0.2)); else m.scale.setScalar(1);
    }
  }

  // ---------------------------------------------------------------- events: effects, sounds and the HUD

  const vOf = (id) => views.get('e' + id);
  const who = (slot) => (W.players[slot] ? W.players[slot].id.toUpperCase() : '');

  function hintFor(e, band, name) {
    const word = name === 'shove' || name === 'bump' ? 'BACK!' : name === 'spin' || name === 'stomp' || name === 'sweep' ? 'JUMP!' : name === 'fly' || name === 'palm' ? 'DUCK!' : band === 'high' ? 'DUCK!' : 'JUMP!';
    const color = word === 'DUCK!' ? '#8cd8ff' : word === 'JUMP!' ? '#ffd400' : '#ff9fd0';
    const id = e.id, w0 = W;
    const isBoss = e.type === 'boss';
    Fx.hint(word, color, () => {
      const q = w0.enemies.find((o) => o.id === id);
      return { x: q ? w0.dir * q.u : 0, y: (q ? q.y + q.h : 2) + 0.7, z: 0 };
    }, () => {
      const q = w0.enemies.find((o) => o.id === id);
      return w0 === W && q && (isBoss ? q.state === 'tele' || (q.state === 'act' && q.atk && q.atk.name === 'fly') : q.state === 'windup');
    });
  }

  function handleEvents() {
    const d = W.dir;
    for (const ev of W.events) {
      switch (ev.type) {
        case 'go': break;
        case 'swing': if (ev.name.indexOf('kick') >= 0) Sfx.kick(); else Sfx.swing(); break;
        case 'jump': Sfx.jump(); break;
        case 'land': if (!ev.boss) Fx.dust(d * ev.u, 0.2, 3); else { Fx.dust(d * ev.u, 0, 6); shake = Math.max(shake, 0.15); } break;
        case 'hit': {
          const v = vOf(ev.id);
          if (v) v.pop = 0.08;
          Fx.burst(ev.word || 'POW!', d * ev.u, ev.y + 0.3, 0.2, ev.big || ev.boss);
          Sfx.hit(ev.big);
          if (ev.boss) shake = Math.max(shake, 0.12);
          break;
        }
        case 'bonk': Fx.burst(ev.word === 'PEACE!' || ev.word === 'HI-YAH!' ? ev.word : 'BONK!', d * ev.u, ev.y + 0.4, 0.2, true); Sfx.bonk(); break;
        case 'poof': Fx.poof(d * ev.u, ev.y, 0.2, ev.copy ? '#d8c8ff' : '#ffffff', ev.boss ? 1.8 : 1); Fx.stars(d * ev.u, ev.y + 0.3, 0.2, ev.boss ? 24 : 10); Sfx.poof(); if (ev.copy) Fx.burst('POOF!', d * ev.u, 2.2, 0.2); break;
        case 'bop': Fx.burst('BOP!', d * ev.u, ev.y + 0.2, 0.3); Fx.stars(d * ev.u, ev.y, 0.3, 5); Sfx.bop(); break;
        case 'hurt': {
          Sfx.ouch();
          const pc = $('pc' + ev.p);
          if (pc) { const f = pc.querySelector('.face'); f.classList.remove('hurt'); void f.offsetWidth; f.classList.add('hurt'); }
          Fx.burst('OOF!', d * ev.u, ev.y + 0.5, 0.4);
          shake = Math.max(shake, 0.1);
          break;
        }
        case 'ko':
          Sfx.ko();
          if (W.mode === '2p' && W.players.some((p) => !p.ko)) toast(`HELP ${who(ev.p)} UP!`, 'warn');
          break;
        case 'revive': Fx.burst('UP YOU GET!', d * ev.u, 2.4, 0.4, true); Sfx.revive(); toast(ev.self ? `${who(ev.p)} IS BACK UP!` : `${who(ev.by)} HELPED ${who(ev.p)} UP!`, 'save'); break;
        case 'life':
          if (ev.lives > 0) { toast(ev.why === 'time' ? "TIME'S UP! ❤️ -1" : '❤️ -1', 'warn'); }
          break;
        case 'timeUp': banner("TIME'S UP!", 'small', ''); Sfx.timeUp(); break;
        case 'over': Sfx.over(); Kit.sound.music('over'); endT = 1.8; endKind = 'over'; break;
        case 'grab': Sfx.grab(); break;
        case 'free': Sfx.free(); Fx.burst(ev.tired ? 'YAWN!' : 'FREE!', d * ev.u, 2.4, 0.4, true); break;
        case 'tired': Sfx.yawn(); break;
        case 'spawn': break;
        case 'windup': if (W.diff === 'easy') { const e = W.enemies.find((o) => o.id === ev.id); if (e) hintFor(e, ev.band); } break;
        case 'throw': Sfx.throw(); break;
        case 'hop': if (Math.random() < 0.3) Sfx.hop(); break;
        case 'wobble': Sfx.wobble(); break;
        case 'potBreak': Sfx.crash(); Fx.burst('CRASH!', d * ev.u, ev.y + 0.8, 0.3); Fx.stars(d * ev.u, ev.y + 0.3, 0.2, 8, ['#f4f1e8', '#2a57b8']); if (ev.kind === 'confetti') Fx.confetti(d * ev.u, 0.5, 0, 14); break;
        case 'pop': Sfx.pop(); Fx.burst('POP!', d * ev.u, 1.2, 0.3, true); Fx.confetti(d * ev.u, 0.6, 0, 40); break;
        case 'special':
          if (ev.name === 'combo') toast('BOXING COMBO!', '');
          break;
        case 'jab': Sfx.jab(ev.i); break;
        case 'wave': Sfx.peace(); Fx.ring(d * ev.u, 0, 3.8, '#ff9fd0'); Fx.burst('PEACE!', d * ev.u, 2.6, 0.4, true); break;
        case 'stun': Sfx.stun(); break;
        case 'eat': {
          Sfx.eat();
          if (ev.treat) toast(`${ev.emoji} ${TREAT_NAME[ev.emoji] || 'TREAT'} FROM ${(W.buddyWho || '').toUpperCase()}!`, 'food');
          else Fx.float(ev.emoji, d * (ev.u != null ? ev.u : W.players[ev.p].u), 1.4, 0.4);
          Fx.float('💚', d * W.players[ev.p].u, 2.3, 0.4, 0.45);
          break;
        }
        case 'buddy': Sfx.whoosh(); $('budCard').classList.remove('pop'); void $('budCard').offsetWidth; $('budCard').classList.add('pop'); break;
        case 'buddyKick':
          Sfx.hiyah();
          shake = Math.max(shake, 0.25);
          Fx.burst('HI-YAH!', d * ev.u, 2.2, 0.8, true);
          Fx.ring(d * ev.u, 0.6, 3, '#8cd8ff');
          toast(`${ev.who.toUpperCase()} SAYS: HI-YAH!`, 'save');
          break;
        case 'treat': {
          const P = W.players[0];
          Fx.arc(ev.emoji, d * ev.u, 1.6, d * P.u, 1.6, 0.6, 0.6, 1.4, 0.7);
          break;
        }
        case 'highfive':
          Sfx.clap();
          Fx.burst('HIGH FIVE!', d * ev.u, 2.8, 0.5, true);
          Fx.stars(d * ev.u, 2.2, 0.5, 16, ['#ffd400', '#ffffff']);
          toast('POWER UP! ⚡', 'save');
          break;
        case 'hfWait': break;
        case 'bossEnter':
          Sfx.gong();
          banner(W.F.bossName, 'boss', W.F.bossLine);
          $('bossEmoji').textContent = BOSS_EMOJI[ev.kind];
          $('bossName').textContent = W.F.bossName;
          Kit.sound.music('play');
          break;
        case 'bossTele': {
          Sfx.tele();
          const b = W.boss;
          if (b && ev.name !== 'boomer' && ev.name !== 'spark' && ev.name !== 'palm' && ev.name !== 'vanish') hintFor(b, ev.band, ev.name);
          else if (b && (ev.name === 'boomer' || ev.name === 'spark' || ev.name === 'palm')) hintFor(b, ev.band, ev.name);
          break;
        }
        case 'bossAtk':
          if (ev.name === 'spin' || ev.name === 'boomer') Sfx.whirr();
          else if (ev.name === 'fly') Sfx.whoosh();
          else Sfx.swing();
          break;
        case 'stomp': Sfx.stomp(); shake = Math.max(shake, 0.35); Fx.dust(d * ev.u, 0, 10); break;
        case 'puff': case 'appear': Sfx.puff(); Fx.poof(d * ev.u, 1.2, 0, '#d8c8ff', 1.4); break;
        case 'split': toast('WHICH ONE IS REAL?', ''); break;
        case 'catch': break;
        case 'bossDown':
          Sfx.bossDown();
          banner('FLOOR CLEAR!', 'clear', W.final ? 'The Golden Panda is free!' : `${W.F.bossName} gives up!`);
          Fx.confetti(d * ev.u, 2, 0, 50, 3);
          shake = 0.3;
          if (W.final) { pandaCheer = true; Sfx.cheer(); }
          break;
        case 'celebrate': celebrateT = 0; if (ev.p === 0) Sfx.fanfare(); break;
        case 'done': {
          toast(`BONUS +${ev.bonus}`, 'food');
          save.reached = Math.max(save.reached, Math.min(FLOORS.length - 1, W.fi + 1));
          save.best = Math.max(save.best, W.score);
          store();
          endT = W.final ? 2.6 : 0.6;
          endKind = W.final ? 'win' : 'next';
          if (W.final) { Fx.confetti(d * (W.L - 3), 3, 0, 80, 6); Sfx.cheer(); }
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- HUD

  let bannerUntil = 0;
  const toasts = [];
  function banner(text, cls, sub) {
    const b = $('banner'), s = $('bsub');
    b.className = 'banner';
    void b.offsetWidth;
    b.textContent = text;
    b.className = `banner show ${cls || ''}`;
    s.textContent = sub || '';
    s.className = sub ? 'bsub show' : 'bsub';
    bannerUntil = clock + 2.2;
  }
  function toast(text, cls) {
    const el = document.createElement('div');
    el.className = `toast ${cls || ''}`;
    el.textContent = text;
    $('toasts').appendChild(el);
    toasts.push({ el, until: clock + 2.2 });
    while (toasts.length > 3) toasts.shift().el.remove();
  }

  const lag = [1, 1], bossLag = { v: 1 };
  // write text only when it changes, so the page translator (Kit.lang) isn't undone every frame
  const textCache = new Map();
  function setText(el, text) { if (textCache.get(el) !== text) { textCache.set(el, text); el.textContent = text; } }
  let lastTimeShown = -1, readyWas = [true, true];
  function updateHud(dt) {
    if (!W) return;
    if (bannerUntil && clock > bannerUntil) { $('banner').className = 'banner'; $('bsub').className = 'bsub'; bannerUntil = 0; }
    for (let i = toasts.length - 1; i >= 0; i--) if (clock > toasts[i].until) { toasts[i].el.remove(); toasts.splice(i, 1); }
    W.players.forEach((P, i) => {
      const pc = $('pc' + i);
      const f = P.hp / P.maxHp;
      lag[i] += ((f < lag[i] ? f : f) - lag[i]) * Math.min(1, dt * (f < lag[i] ? 2.5 : 12));
      pc.querySelector('.fill').style.transform = `scaleX(${f})`;
      pc.querySelector('.lag').style.transform = `scaleX(${Math.max(f, lag[i])})`;
      const hp = pc.querySelector('.hp');
      hp.classList.toggle('low', f < 0.4 && f >= 0.2);
      hp.classList.toggle('crit', f < 0.2);
      pc.classList.toggle('ko', P.ko);
      const cd = Sim.SPEC_CD[Sim.SPECIAL[P.id]] * W.D.spec;
      const k = 1 - clamp(P.specCd / cd, 0, 1);
      const spec = pc.querySelector('.spec');
      spec.style.setProperty('--cd', k.toFixed(3));
      spec.classList.toggle('ready', k >= 1);
      const tb = document.querySelector(`#touch .c${W.mode === '2p' ? i : 0} .spc`);
      if (tb && (W.mode === '2p' || i === 0)) { tb.style.setProperty('--cd', k.toFixed(3)); tb.classList.toggle('ready', k >= 1); }
      if (k >= 1 && !readyWas[i] && screen === 'play') Sfx.ready();
      readyWas[i] = k >= 1;
      pc.querySelector('.power').classList.toggle('on', P.power > 0);
    });
    setText($('floorTxt'), `FLOOR ${W.fi + 1}`);
    $('dots').querySelectorAll('i').forEach((el, i) => { el.className = i < W.fi ? 'done' : i === W.fi ? 'now' : ''; });
    setText($('livesTxt'), `❤️${W.lives}`);
    setText($('scoreTxt'), String(W.score));
    const timeEl = $('timeTxt');
    timeEl.classList.toggle('hidden', !W.D.timer);
    if (W.D.timer) {
      const s = Math.ceil(W.time);
      if (s !== lastTimeShown) { setText(timeEl, `⏱${s}`); if (s <= 10 && s > 0 && W.phase === 'play' && screen === 'play') Sfx.tick(); lastTimeShown = s; }
      timeEl.classList.toggle('warn', s <= 20);
    }
    // the companion card (1 player) or the high five (2 players)
    const B = W.buddy;
    $('budCard').classList.toggle('here', !!(B && B.state !== 'gone'));
    const team = $('teamBtn');
    team.style.setProperty('--fill', (1 - W.hfCd / 8).toFixed(3));
    team.classList.toggle('ready', W.hfCd <= 0);
    // the boss
    const b = W.boss;
    $('bossbar').classList.toggle('hidden', !b || W.phase === 'done');
    if (b) {
      const f = b.hp / b.maxHp;
      bossLag.v += (Math.max(f, Math.min(bossLag.v, 1)) - bossLag.v) * Math.min(1, dt * 2.5);
      if (f > bossLag.v) bossLag.v = f;
      $('bossbar').querySelector('.fill').style.transform = `scaleX(${f})`;
      $('bossbar').querySelector('.lag').style.transform = `scaleX(${bossLag.v})`;
    }
    // which way to go
    const lead = W.players.reduce((a, p) => (p.u > a.u ? p : a), W.players[0]);
    const showGo = (W.phase === 'intro' || (W.phase === 'play' && !W.arena && lead.u < 7)) && screen === 'play';
    const go = $('go');
    go.classList.toggle('hidden', !showGo);
    go.className = `${showGo ? '' : 'hidden'} ${W.dir < 0 ? 'toL' : 'toR'}`;
    setText(go, W.dir < 0 ? '⬅ GO' : 'GO ➡');
    // a hug: wiggle!
    const g = W.players.find((p) => p.state === 'grabbed');
    $('wiggle').classList.toggle('hidden', !g || screen !== 'play');
    if (g) {
      const n = Sim.huggersOn(W, g).length;
      const need = W.D.mash + Math.max(0, n - 1) * 2;
      $('wiggle').querySelector('i').style.width = `${clamp(g.wiggle / need, 0, 1) * 100}%`;
    }
  }

  // ---------------------------------------------------------------- the camera

  function updateCamera(dt) {
    const a = aspect();
    const half = W ? W.halfW : viewHalfW();
    const D = clamp(half / (TAN * a), 9, 60);
    let cx;
    if (screen === 'title' && demo) cx = demo.dir * 6.5 + Math.sin(clock * 0.15) * 0.6;
    else if (W) cx = W.dir * W.cam;
    else cx = 0;
    camX = cx;
    shake = Math.max(0, shake - dt);
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 0.4 : 0;
    const lookY = 1.35 + (a < 1 ? 0.6 : 0);
    camera.position.set(cx + sx, 2.4 + D * 0.07 + sy, D);
    camera.lookAt(cx + sx * 0.5, lookY, 0);
  }

  // ---------------------------------------------------------------- floors and screens

  const ALL_SCREENS = ['title', 'pick', 'pause', 'over', 'win'];
  function showScreen(name) {
    screen = name;
    for (const s of ALL_SCREENS) $(s).classList.toggle('hidden', s !== name);
    const playing = name === 'play' || name === 'pause';
    $('hud').classList.toggle('hidden', !(name === 'play'));
    document.body.classList.toggle('playing', name === 'play');
    showTouch();
  }
  let touchMode = false;
  function showTouch() {
    $('touch').classList.toggle('hidden', !(touchMode && screen === 'play'));
    $('touch').classList.toggle('two', mode === '2p');
    document.body.classList.toggle('two', mode === '2p');
  }

  function clearDemo() {
    if (demo && demo.views) for (const v of demo.views) disposeObj(v.root);
    demo = null;
  }

  function buildDemo() {
    clearDemo();
    clearViews();
    if (hall) { hall.dispose(); hall = null; }
    W = null;
    demo = Sim.create({ floor: Math.min(save.floor || 0, save.reached), mode: '2p', noSpawn: true, halfW: viewHalfW() });
    demo.final = false;
    hall = Scene.build(scene, demo);
    demo.views = ['teddy', 'tommy'].map((id, i) => {
      const P = { id };
      const v = playerView(P);
      v.root.position.set(demo.dir * 6.5 + (i ? 1 : -1) * demo.halfW * 0.72, 0, 1.2);
      v.p.root.rotation.y = yaw(i ? -1 : 1, 0.75);
      return v;
    });
  }

  function showTitle() {
    autoplay = false;
    endT = -1;
    Input.setTwoPlayer(false);
    buildDemo();
    paintLogo();
    markLevel();
    markFloors();
    $('bestTxt').classList.toggle('hidden', !save.best);
    $('bestTxt').textContent = `BEST ${save.best}`;
    showScreen('title');
    Kit.sound.music('title');
  }

  function paintLogo() {
    const logo = $('logo');
    if (Kit.lang && Kit.lang.is('zh')) logo.innerHTML = `<span class="zh">${TITLE.ZH}</span>`;
    else logo.innerHTML = `<span class="l1">${TITLE.LINE1}</span><span class="l2">${TITLE.LINE2}</span>`;
    $('tagline').textContent = TITLE.TAG;
  }

  function markLevel() { document.querySelectorAll('.lvl').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === save.diff))); }

  function markFloors() {
    const box = $('floorPick');
    box.classList.toggle('hidden', save.reached < 1);
    box.querySelectorAll('.fl').forEach((b) => b.remove());
    if (save.floor > save.reached) save.floor = 0;
    FLOORS.forEach((F, i) => {
      const b = document.createElement('button');
      b.className = 'fl' + (i > save.reached ? ' locked' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === save.floor));
      b.title = F.name;
      b.innerHTML = `${i + 1}<span class="e">${i > save.reached ? '🔒' : F.emoji}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); gesture(); if (i > save.reached) return; save.floor = i; store(); markFloors(); Sfx.ui(); buildDemo(); });
      box.appendChild(b);
    });
  }

  function choose(m) {
    mode = m;
    if (m === '2p') return startGame();
    pickSel = save.hero;
    document.querySelectorAll('.pick').forEach((b) => b.classList.toggle('sel', b.dataset.hero === pickSel));
    showScreen('pick');
  }
  function afterPick() { save.hero = pickSel; store(); startGame(); }

  function startGame() {
    startFloor(Math.min(save.floor || 0, save.reached), { score: 0, lives: null });
  }

  // carry: { score, lives } from the floor below
  function startFloor(fi, carry, seed) {
    clearDemo();
    clearViews();
    if (hall) { hall.dispose(); hall = null; }
    pandaCheer = false;
    celebrateT = 0;
    endT = -1; endKind = null;
    acc = 0;
    Input.setTwoPlayer(mode === '2p');
    Input.clear();
    W = Sim.create({ floor: fi, difficulty: save.diff, mode, hero: save.hero, seed: seed || ((Math.random() * 1e9) | 0), halfW: viewHalfW(), score: carry.score || 0, lives: carry.lives });
    floorScore = W.score;
    hall = Scene.build(scene, W);
    lag[0] = lag[1] = 1; bossLag.v = 1;
    // the HUD for this set-up
    const p0 = W.players[0];
    $('pc0').className = `pcard ${p0.id}`;
    $('pc0').querySelector('img').src = faces[p0.id];
    $('pc0').querySelector('.nm').textContent = p0.id.toUpperCase();
    $('pc0').querySelector('.spec span').textContent = SPEC_EMOJI[p0.id];
    $('pc1').querySelector('img').src = faces.tommy;
    const bud = W.buddyWho;
    $('budCard').className = `budcard ${bud}`;
    $('budCard').querySelector('img').src = faces[bud];
    $('budName').textContent = `${bud.toUpperCase()}!`;
    $('pc1').classList.toggle('hidden', mode !== '2p');
    $('budCard').classList.toggle('hidden', mode === '2p');
    $('teamBtn').classList.toggle('hidden', mode !== '2p');
    $('bossEmoji').textContent = BOSS_EMOJI[W.F.boss];
    $('bossName').textContent = W.F.bossName;
    document.querySelector('#touch .c0 .spc .se').textContent = SPEC_EMOJI[p0.id];
    $('bossbar').classList.add('hidden');
    showScreen('play');
    banner(`FLOOR ${fi + 1}`, 'small', `${W.F.emoji} ${W.F.name}`);
    Sfx.gong();
    Kit.sound.music('play');
    updateHud(0);
    $('fade').classList.remove('on');
  }

  function nextFloor() {
    const carry = { score: W.score, lives: W.lives };
    const fi = W.fi + 1;
    $('fade').classList.add('on');
    setTimeout(() => { if (screen === 'play' || screen === 'pause') startFloor(fi, carry); }, 480);
  }

  function pause(on) {
    if (on && screen === 'play') { showScreen('pause'); Kit.sound.music('pause'); Input.clear(); }
    else if (!on && screen === 'pause') { Input.clear(); showScreen('play'); Kit.sound.music('play'); }
  }

  function showOver() {
    $('overSub').textContent = W.lives <= 0 ? 'The temple wins this time. Try that floor again!' : '';
    showScreen('over');
  }
  function tryAgain() { startFloor(W.fi, { score: floorScore, lives: null }); }

  function showWin() {
    const box = $('winFaces');
    box.innerHTML = '';
    for (const P of W.players) { const img = document.createElement('img'); img.src = faces[P.id]; img.alt = ''; img.className = P.id; box.appendChild(img); }
    const pa = document.createElement('span'); pa.className = 'panda'; pa.textContent = '🐼'; box.appendChild(pa);
    save.best = Math.max(save.best, W.score);
    store();
    $('winStats').innerHTML = `<span>SCORE</span><b>${W.score}</b><span>BEST</span><b>${save.best}</b><span>LEVEL</span><b>${save.diff === 'easy' ? '🐣 EASY' : '🔥 NORMAL'}</b>`;
    showScreen('win');
    Kit.sound.music('title');
  }

  // ---------------------------------------------------------------- the loop

  // A kid's keys are screen keys: → means walk right on screen. The rules count `u` along the hall, which runs leftwards
  // on floors 1, 3 and 5 (x = dir * u), so there left and right swap on the way in. The autopilot already thinks in u.
  function humanInput(i) {
    const inp = Input.read(i);
    if (W.dir < 0) { const l = inp.l; inp.l = inp.r; inp.r = l; }
    return inp;
  }
  function stepSim() {
    const inputs = W.players.map((P, i) => (autoplay ? Bot.bot(W, P, botMem[i] || (botMem[i] = { opts: { call: W.mode === '1p', callEvery: 14 } })) : humanInput(i)));
    Sim.step(W, inputs);
    handleEvents();
  }
  const botMem = [];

  let helpWas = false;
  function tick(dt) {
    clock += dt;
    resize();
    const helpNow = !!(Kit.help && Kit.help.isOpen && Kit.help.isOpen());
    if (helpNow !== helpWas) { helpWas = helpNow; Input.clear(); }
    if (W && screen === 'play') {
      acc += dt;
      let n = 0;
      while (acc >= Sim.DT && n < 10) { stepSim(); acc -= Sim.DT; n++; }
      if (n >= 10) acc = 0;
      if (W.phase === 'clear' || W.phase === 'done') celebrateT += dt;
      if (endT > 0) {
        endT -= dt;
        if (endT <= 0) {
          endT = -1;
          if (endKind === 'over') showOver();
          else if (endKind === 'next') nextFloor();
          else if (endKind === 'win') showWin();
        }
      }
    } else if (W && (screen === 'win')) celebrateT += dt;
    if (screen === 'title' && demo) {
      demo.views.forEach((v, i) => {
        const hop = Poses.kata(v.p, i ? 'tommy' : 'teddy', clock + i * 0.55, dt);
        v.p.root.position.y = hop;
      });
    }
    syncWorld(dt);
    Fx.update(dt);
    if (hall) hall.update(dt, clock);
    updateCamera(dt);
    if (screen === 'play') updateHud(dt);
  }

  let lastT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000));
    lastT = now;
    if (!held) tick(dt);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- buttons and keys

  let soundOn = false;
  function gesture() {
    if (!soundOn) { soundOn = true; Kit.sound.init(); Kit.sound.music(screen === 'play' ? 'play' : 'title'); }
  }
  function setMuteIcons() { document.querySelectorAll('.muteBtn').forEach((b) => { b.textContent = Kit.sound.isMuted() ? '🔇' : '🔊'; }); }
  function toggleMute() { gesture(); Kit.sound.toggleMute(); setMuteIcons(); }
  if (Kit.sound.onMute) Kit.sound.onMute(setMuteIcons);

  const click = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); gesture(); Sfx.ui(); fn(); });
  click('play1', () => choose('1p'));
  click('play2', () => choose('2p'));
  click('pickBack', showTitle);
  click('pauseBtn', () => pause(true));
  click('resumeBtn', () => pause(false));
  click('quitBtn', showTitle);
  click('againBtn', tryAgain);
  click('overMenuBtn', showTitle);
  click('playAgainBtn', () => { save.floor = 0; store(); startGame(); });
  click('winMenuBtn', showTitle);
  document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); }));
  document.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => { gesture(); save.diff = b.dataset.level; store(); markLevel(); Sfx.ui(); }));
  document.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => { gesture(); pickSel = b.dataset.hero; Sfx.ui(); afterPick(); }));
  const budPress = (e) => { e.preventDefault(); e.stopPropagation(); gesture(); if (screen === 'play') Input.press(0, 'call'); };
  $('budCard').addEventListener('pointerdown', budPress);
  $('teamBtn').addEventListener('pointerdown', budPress);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    gesture();
    const k = e.code;
    if (k === 'KeyM') return toggleMute();
    if (screen === 'play') {
      if (k === 'KeyP' || k === 'Escape') pause(true);
      return;
    }
    if (screen === 'pause') {
      if (k === 'KeyP' || k === 'Escape' || k === 'Space') pause(false);
      else if (k === 'KeyQ') showTitle();
      return;
    }
    if (e.repeat) return;
    const go = k === 'Enter' || k === 'NumpadEnter' || k === 'Space' || k === 'KeyF' || k === 'KeyK';
    if (screen === 'title') {
      if (go || k === 'Digit1') choose('1p');
      else if (k === 'Digit2') choose('2p');
      else if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD') { save.diff = save.diff === 'easy' ? 'normal' : 'easy'; store(); markLevel(); Sfx.ui(); }
      else if (/^Digit[3-7]$/.test(k)) { /* nothing */ }
      else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
        if (save.reached > 0) { save.floor = (save.floor + (k === 'ArrowUp' || k === 'KeyW' ? 1 : save.reached)) % (save.reached + 1); store(); markFloors(); Sfx.ui(); buildDemo(); }
      }
    } else if (screen === 'pick') {
      if (k === 'Escape') showTitle();
      else if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ArrowRight' || k === 'KeyD') {
        pickSel = pickSel === 'teddy' ? 'tommy' : 'teddy';
        document.querySelectorAll('.pick').forEach((b) => b.classList.toggle('sel', b.dataset.hero === pickSel));
        Sfx.ui();
      } else if (go) afterPick();
    } else if (screen === 'over') {
      if (k === 'Enter' || k === 'NumpadEnter' || k === 'Space') tryAgain();
      else if (k === 'Escape') showTitle();
    } else if (screen === 'win') {
      if (k === 'Enter' || k === 'NumpadEnter' || k === 'Space') { save.floor = 0; store(); startGame(); }
      else if (k === 'Escape') showTitle();
    }
  });

  canvas.addEventListener('pointerdown', () => { if (screen === 'play') Input.mashAll(); });
  $('wiggle').addEventListener('pointerdown', (e) => { e.preventDefault(); Input.mashAll(); });
  window.addEventListener('pointerdown', (e) => {
    gesture();
    if (e.pointerType === 'touch' && !touchMode) { touchMode = true; document.body.classList.add('touch'); showTouch(); }
  }, true);
  const touchParam = /[?&]touch=1/.test(location.search);
  if (touchParam || (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches)) { touchMode = true; document.body.classList.add('touch'); }
  Input.bindTouch($('touch'));

  const api = { autoPause: true };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (api.autoPause) pause(true); Kit.sound.suspend(); } else Kit.sound.resume();
  });

  // ---------------------------------------------------------------- test hooks: window.game

  Object.assign(api, {
    // start a floor right now: { floor, mode: '1p' | '2p', hero, difficulty }
    start(o = {}) {
      mode = o.mode === '2p' ? '2p' : '1p';
      if (o.hero) save.hero = o.hero;
      if (o.difficulty) save.diff = o.difficulty;
      api.autoPause = false;
      startFloor(o.floor || 0, { score: o.score || 0, lives: o.lives }, o.seed);
      return api.state();
    },
    // advance by `seconds` right now and draw (the Browser pane throttles hidden frames)
    step(seconds = 1 / 60, o) {
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      if (!(o && o.draw === false)) renderer.render(scene, camera);
      return o && o.draw === false ? null : api.state();
    },
    hold(v = true) { held = !!v; return held; },
    autoplay(v = true) { autoplay = !!v; botMem.length = 0; return autoplay; },
    press(slot, act) { Input.press(slot, act); },
    call() { Input.press(0, 'call'); },
    warp() { if (W) { Sim.enterArena(W); handleEvents(); } return api.state(); },
    state() {
      if (!W) return { screen };
      return {
        screen, phase: W.phase, floor: W.fi + 1, mode: W.mode, diff: W.diff, t: +W.t.toFixed(2), u: W.players.map((p) => +p.u.toFixed(2)), L: W.L,
        players: W.players.map((p) => ({ id: p.id, hp: Math.round(p.hp), state: p.state, ko: p.ko, specCd: +p.specCd.toFixed(1) })),
        enemies: W.enemies.map((e) => `${e.type}${e.kind ? ':' + e.kind : ''}:${e.state}`), boss: W.boss ? { kind: W.boss.kind, hp: +W.boss.hp.toFixed(1), state: W.boss.state } : null,
        lives: W.lives, time: Math.ceil(W.time), score: W.score, buddy: W.buddy ? W.buddy.state : null, fx: Fx.count(), views: views.size,
      };
    },
    // the headless checks (js/checks.js), right here in the page
    check(o) { return Checks.all(o); },
    prove() { return Checks.prove(); },
    show(name) {
      if (name === 'title') showTitle();
      else if (name === 'pick') { mode = '1p'; choose('1p'); }
      else if (name === 'pause') { if (screen !== 'play') api.start({}); pause(true); }
      else if (name === 'over') { if (!W) api.start({}); showOver(); }
      else if (name === 'win') { if (!W) api.start({ floor: 4 }); showWin(); }
      return screen;
    },
    quiet() { bannerUntil = 1e-6; for (const t of toasts) t.until = 0; updateHud(0); },
    world: () => W,
    scene,
    // where a brother's model stands, in world x (= left to right on screen)
    modelX(slot) { const v = views.get('p' + slot); if (!v) return NaN; v.p.root.updateWorldMatrix(true, false); return new T.Vector3().setFromMatrixPosition(v.p.root.matrixWorld).x; },
    save: () => save,
    calm(v = true) { document.body.classList.toggle('calm', !!v); },
    renderer,
  });
  window.game = api;

  // English / 中文: page text translates itself (js/zh.js). The logo swaps between Kung Fu TT and 功夫小子, and the
  // word bursts and hints are drawn on canvases, so they're repainted.
  if (Kit.lang) Kit.lang.onChange(() => { Fx.repaint(); paintLogo(); });

  // ---------------------------------------------------------------- go

  resize();
  setMuteIcons();
  $('loading').classList.add('hidden');
  showTitle();
  requestAnimationFrame(frame);
})();
