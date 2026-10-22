/* Kung Fu TT: the temple hall for one floor. A long wooden floor, a plaster back wall with moon windows and red
   pillars, a beam with swaying lanterns, banners with pictures (never words, so English mode shows no Chinese), the
   stairs you came up by at one end and the stairs up at the other, and on the top floor the Golden Panda's cage.
   The rules work in `u` (metres along the hall); x = dir * u, so odd floors run left and even floors run right. */
(function () {
  'use strict';
  const T = THREE;
  const Kit = window.Kit;
  const M = () => window.KF_MODELS;
  const G = () => Kit.gfx;
  const BAY = 5; // metres between pillars
  const BANNERS = ['🐉', '🪷', '🎋', '🐼', '🏮', '🐲', '🌸', '🐯'];

  function wallTexture(F) {
    const [c, g] = G().makeCanvas(512, 1024); // one bay: 5 m wide, 10 m tall
    const px = 1024 / 10;
    g.fillStyle = F.wall; g.fillRect(0, 0, 512, 1024);
    // wooden wainscot along the bottom
    g.fillStyle = G().shade(F.floor, -0.25); g.fillRect(0, 1024 - 1.15 * px, 512, 1.15 * px);
    g.fillStyle = G().shade(F.floor, -0.4);
    for (let x = 0; x < 512; x += 64) g.fillRect(x, 1024 - 1.15 * px, 4, 1.15 * px);
    g.fillStyle = F.trim; g.fillRect(0, 1024 - 1.2 * px, 512, 0.08 * px);
    // a moon window, with a lattice and the sky behind
    const cx = 256, cy = 1024 - 3.1 * px, r = 1.15 * px;
    g.fillStyle = F.sky; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(cx - 30, cy + 40, 50, 0, Math.PI * 2); g.arc(cx + 30, cy + 34, 40, 0, Math.PI * 2); g.fill();
    g.strokeStyle = G().shade(F.pillar, -0.25); g.lineWidth = 7;
    for (let d = -r; d <= r; d += 38) { g.beginPath(); g.moveTo(cx + d, cy - r); g.lineTo(cx + d, cy + r); g.stroke(); g.beginPath(); g.moveTo(cx - r, cy + d); g.lineTo(cx + r, cy + d); g.stroke(); }
    g.restore();
    g.strokeStyle = F.trim; g.lineWidth = 14; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    // a frieze up top
    g.fillStyle = F.trim; g.fillRect(0, 1024 - 5.4 * px, 512, 0.22 * px);
    g.fillStyle = G().shade(F.trim, 0.3);
    for (let x = 16; x < 512; x += 48) { g.beginPath(); g.arc(x, 1024 - 5.29 * px, 7, 0, Math.PI * 2); g.fill(); }
    const tex = G().toTexture(c);
    tex.wrapS = T.RepeatWrapping;
    return tex;
  }

  function floorTexture(F) {
    const [c, g] = G().makeCanvas(512, 256);
    g.fillStyle = F.floor; g.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 8; r++) {
      const y = r * 32;
      g.fillStyle = G().shade(F.floor, ((r * 37) % 7) / 50 - 0.06); g.fillRect(0, y, 512, 30);
      g.fillStyle = G().shade(F.floor, -0.3); g.fillRect(0, y + 30, 512, 2);
      const off = (r * 173) % 512;
      g.fillRect(off, y, 2, 30); g.fillRect((off + 256) % 512, y, 2, 30);
    }
    const tex = G().toTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  function bannerTexture(emoji, F) {
    const [c, g] = G().makeCanvas(128, 320);
    g.fillStyle = F.pillar; g.fillRect(0, 0, 128, 320);
    g.fillStyle = F.trim; g.fillRect(0, 0, 128, 14); g.fillRect(0, 300, 128, 20);
    g.strokeStyle = '#ffd86a'; g.lineWidth = 5; g.strokeRect(12, 24, 104, 268);
    g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(64, 150, 46, 0, Math.PI * 2); g.fill();
    g.font = `64px ${G().EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 64, 154);
    return G().toTexture(c);
  }

  // Build one floor's hall. Returns { group, update(dt, t), panda, cage }.
  function build(scene, W, o) {
    const aniso = (o && o.aniso) || 1;
    const F = W.F, d = W.dir, L = W.L;
    const group = new T.Group();
    scene.add(group);
    const mat = M().mat;
    const x = (u) => d * u;
    const u0 = -3 * BAY, u1 = Math.ceil((L + 16) / BAY) * BAY, len = u1 - u0, mid = (u0 + u1) / 2; // whole bays, so pillars and windows line up

    scene.background = new T.Color(G().shade(F.sky, -0.05));

    // floor
    const ft = floorTexture(F);
    ft.repeat.set(len / 4, 4.5);
    ft.anisotropy = aniso; // the planks stay sharp toward the back
    const floor = new T.Mesh(new T.BoxGeometry(len, 0.3, 14), mat('#ffffff', { map: ft, roughness: 0.8 }));
    floor.position.set(x(mid), -0.15, 3.8);
    floor.receiveShadow = true;
    group.add(floor);
    // a dark board across the front, and a red carpet runner down the middle of the lane
    const edge = new T.Mesh(new T.BoxGeometry(len, 0.02, 0.18), mat(G().shade(F.floor, -0.45)));
    edge.position.set(x(mid), 0.005, 2.6);
    group.add(edge);
    const runner = new T.Mesh(new T.BoxGeometry(len, 0.02, 1.7), mat(G().shade(F.pillar, -0.1), { roughness: 0.95 }));
    runner.position.set(x(mid), 0.004, 0.0);
    runner.receiveShadow = true;
    group.add(runner);
    for (const z of [-0.85, 0.85]) {
      const s = new T.Mesh(new T.BoxGeometry(len, 0.022, 0.08), mat('#e8b84a'));
      s.position.set(x(mid), 0.006, z);
      group.add(s);
    }

    // back wall, bay by bay
    const wt = wallTexture(F);
    wt.repeat.set(len / BAY, 1);
    wt.anisotropy = aniso;
    const wall = new T.Mesh(new T.PlaneGeometry(len, 10), mat('#ffffff', { map: wt, roughness: 0.95 }));
    wall.position.set(x(mid), 5, -3.1);
    group.add(wall);

    // pillars, beams, lanterns and banners
    const pillarM = mat(F.pillar, { roughness: 0.5 }), gold = mat('#e8b84a', { metalness: 0.4, roughness: 0.4 }), trim = mat(F.trim);
    const lanterns = [];
    const lanternM = new T.MeshStandardMaterial({ color: F.lantern, emissive: F.lantern, emissiveIntensity: 0.45, roughness: 0.5 });
    const beam = new T.Mesh(new T.BoxGeometry(len, 0.4, 0.5), trim);
    beam.position.set(x(mid), 6.0, -2.4);
    group.add(beam);
    let bi = 0;
    for (let u = Math.ceil(u0 / BAY) * BAY; u <= u1; u += BAY) {
      const p = new T.Mesh(new T.CylinderGeometry(0.3, 0.32, 6.2, 16), pillarM);
      p.position.set(x(u), 3.0, -2.55);
      group.add(p);
      const b0 = new T.Mesh(new T.BoxGeometry(0.85, 0.3, 0.85), gold); b0.position.set(x(u), 0.15, -2.55); group.add(b0);
      const b1 = new T.Mesh(new T.BoxGeometry(0.8, 0.25, 0.8), gold); b1.position.set(x(u), 5.95, -2.55); group.add(b1);
      // a lantern hanging between this pillar and the next
      const lu = u + BAY / 2;
      const lg = new T.Group();
      lg.position.set(x(lu), 6.0, -1.4);
      const cord = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 1.1, 4), mat('#3a2412')); cord.position.y = -0.55; lg.add(cord);
      const body = new T.Mesh(new T.SphereGeometry(0.36, 16, 12), lanternM); body.scale.set(1, 1.2, 1); body.position.y = -1.45; lg.add(body);
      for (const yy of [-1.0, -1.9]) { const cap = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.1, 12), gold); cap.position.y = yy; lg.add(cap); }
      const tas = new T.Mesh(new T.BoxGeometry(0.06, 0.4, 0.06), mat('#ffd400')); tas.position.y = -2.15; lg.add(tas);
      group.add(lg);
      lanterns.push({ g: lg, ph: lu * 0.7 });
      // a banner on the wall in every other bay
      if (bi++ % 2 === 0) {
        const bn = new T.Mesh(new T.PlaneGeometry(0.9, 2.25), mat('#ffffff', { map: bannerTexture(BANNERS[(bi + W.fi * 3) % BANNERS.length], F), roughness: 0.9 }));
        bn.position.set(x(u + BAY * 0.17), 3.05, -3.0);
        group.add(bn);
        const bn2 = bn.clone(); bn2.position.x = x(u + BAY * 0.83); group.add(bn2);
      }
    }

    // stairs: down where you came in (u < 0), up at the far end (u > L)
    const stepM = mat(G().shade(F.floor, -0.1)), riserM = mat(G().shade(F.floor, -0.35));
    for (let i = 0; i < 9; i++) {
      const s = new T.Mesh(new T.BoxGeometry(0.55, 0.32 * (i + 1), 3.2), i % 2 ? stepM : riserM);
      s.position.set(x(L + 1.2 + i * 0.55), 0.16 * (i + 1), -1.2);
      group.add(s);
    }
    const hole = new T.Mesh(new T.BoxGeometry(2.6, 0.02, 3.0), mat('#2a1a10'));
    hole.position.set(x(-1.8), 0.01, -1.2);
    group.add(hole);
    for (let i = 0; i < 3; i++) {
      const rail = new T.Mesh(new T.BoxGeometry(0.1, 1.0, 0.1), gold);
      rail.position.set(x(-0.4), 0.5, -2.6 + i * 1.4);
      group.add(rail);
    }
    // a sign by the stairs up: an arrow and the next floor's number
    const sign = signMesh(W);
    sign.position.set(x(L + 0.6), 3.9, -2.9);
    group.add(sign);

    // the Golden Panda waits in a bamboo cage on the top floor
    let panda = null, cageG = null;
    if (W.final) {
      cageG = M().cage();
      cageG.position.set(x(L + 0.4), 0, -1.6);
      group.add(cageG);
      panda = M().person(M().LOOKS.panda, ['panda']);
      panda.root.scale.setScalar(0.85);
      panda.root.position.set(x(L + 0.4), 0.12, -1.6);
      panda.root.rotation.y = d > 0 ? Math.PI / 2 + 0.6 : -(Math.PI / 2 + 0.6);
      group.add(panda.root);
    }

    // pots hang from the beam on ropes
    const pots = {};

    function update(dt, t) {
      for (const l of lanterns) l.g.rotation.z = Math.sin(t * 1.3 + l.ph) * 0.05;
    }
    function dispose() {
      scene.remove(group);
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    return { group, update, dispose, panda, cage: cageG, pots };
  }

  function signMesh(W) {
    const [c, g] = G().makeCanvas(256, 160);
    const F = W.F;
    g.fillStyle = F.pillar; G().roundRect(g, 4, 4, 248, 152, 18); g.fill();
    g.strokeStyle = '#ffd86a'; g.lineWidth = 8; G().roundRect(g, 10, 10, 236, 140, 14); g.stroke();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (W.final) { g.font = `86px ${G().EMOJI_FONT}`; g.fillText('🐼', 128, 84); }
    else {
      g.font = `78px ${G().FONT}`;
      g.fillText(String(W.fi + 2), 166, 88);
      g.font = `70px ${G().EMOJI_FONT}`;
      g.fillText('⬆️', 84, 84);
    }
    const m = new T.Mesh(new T.PlaneGeometry(1.6, 1.0), new T.MeshBasicMaterial({ map: G().toTexture(c), transparent: true }));
    return m;
  }

  window.KF_SCENE = { build, BAY };
})();
