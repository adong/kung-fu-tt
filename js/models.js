/* Kung Fu TT: the cast and the props, as Three.js models. The brothers and every grown-up are the kit's blocky
   people (Kit.people.build) with a few extras added here: kung fu headbands, the Staff Master's bamboo staff, Bao's
   chef hat, the Magician's tall hat and cape, the Grand Master's long beard and the Golden Panda's eye patches.
   The little ones (hopping imps, paper dragons, confetti balls) and the props (pots, bean bags, boomerangs, the
   panda's bamboo cage) are built from boxes, spheres and a lathe. Everything faces -z, like the kit's people. */
(function () {
  'use strict';
  const T = THREE;
  const Kit = window.Kit;
  const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.65 }, o));
  const box = (w, h, d, m, x, y, z, parent) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (parent) parent.add(b); return b; };

  // ---------------------------------------------------------------- people

  const LOOKS = {
    hugger: [
      { head: 'bear', skin: '#f6a8c8', muzzle: '#ffe0ec', shirt: 'hoodie', top: '#ff7fb0', print: 'paw', bottom: '#ffd0e4', shoes: '#ffffff' },
      { head: 'bear', skin: '#b9a6f5', muzzle: '#ece4ff', shirt: 'hoodie', top: '#8d6bf0', print: 'paw', bottom: '#d9cffc', shoes: '#ffffff' },
      { head: 'bear', skin: '#8fd9bf', muzzle: '#e0fff4', shirt: 'hoodie', top: '#3fbf95', print: 'paw', bottom: '#c9f2e3', shoes: '#ffffff' },
      { head: 'bear', skin: '#f7c97a', muzzle: '#fff1d0', shirt: 'hoodie', top: '#f39c2b', print: 'paw', bottom: '#ffe3b0', shoes: '#ffffff' },
    ],
    thrower: [
      { head: 'human', skin: '#e9b48e', hair: 'short', hairColor: '#3a2412', hat: 'cap', hatColor: '#2fb36a', smile: true, shirt: 'jacket', top: '#2fb36a', print: 'star', bottom: '#2b3140', shoes: '#ffd400' },
      { head: 'human', skin: '#c98d68', hair: 'short', hairColor: '#1a120c', hat: 'capBack', hatColor: '#ff8a1f', smile: true, shirt: 'jacket', top: '#ff8a1f', print: 'bolt', bottom: '#3a3348', shoes: '#18b4ff' },
    ],
    staff: { head: 'human', skin: '#e2b08a', hair: 'short', hairColor: '#8a8a8a', brows: true, mustache: true, shirt: 'jacket', top: '#3a6fc8', print: 'panel', bottom: '#22212a', shoes: '#22212a' },
    bao: { head: 'human', skin: '#f2c8a2', hair: 'short', hairColor: '#2a1a12', smile: true, belly: true, shirt: 'jacket', top: '#ffffff', print: 'star', bottom: '#d23a3a', shoes: '#22212a' },
    belly: { head: 'human', skin: '#e4a77e', hair: 'spiky', hairColor: '#22180f', brows: true, smile: true, belly: true, shirt: 'tee', top: '#7a2f8f', print: 'bolt', bottom: '#ffcf3a', shorts: true, shoes: '#7a2f8f' },
    puff: { head: 'human', skin: '#f0c49e', hair: 'short', hairColor: '#4b2f8a', mustache: true, smile: true, shirt: 'jacket', top: '#5b2fa8', print: 'star', bottom: '#2b1a4a', shoes: '#ffd400' },
    grand: { head: 'human', skin: '#e8b48c', hair: 'short', hairColor: '#f2f2f2', brows: true, shirt: 'jacket', top: '#c8302a', print: 'panel', bottom: '#2a1a12', shoes: '#ffd400' },
    panda: { head: 'bear', skin: '#f8f6ee', muzzle: '#ffffff', shirt: 'tee', top: '#ffcf3a', print: 'star', bottom: '#22212a', shoes: '#22212a' },
  };

  // A kung fu headband with two tails, round the head.
  function headband(p, color) {
    const m = mat(color);
    box(0.55, 0.08, 0.5, m, 0, 0.17, 0, p.head);
    for (const s of [-1, 1]) {
      const t = box(0.06, 0.26, 0.04, m, s * 0.06, 0.05, 0.29, p.head);
      t.rotation.x = 0.5; t.rotation.z = s * 0.25;
    }
  }

  function person(look, extras) {
    const p = Kit.people.build(look);
    p.extras = {};
    for (const x of extras || []) {
      if (x.band) headband(p, x.band);
      if (x === 'staff') {
        const s = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 2.3, 8), mat('#c8a24a'));
        s.position.y = -0.95;
        const tipM = mat('#2f7d3a');
        box(0.11, 0.18, 0.11, tipM, 0, -1.1, 0, s);
        box(0.11, 0.18, 0.11, tipM, 0, 1.1, 0, s);
        p.armR.add(s);
        p.extras.staff = s;
      }
      if (x === 'boomerang') { const b = boomerang(); b.position.y = -0.72; b.rotation.x = Math.PI / 2; p.armR.add(b); p.extras.held = b; }
      if (x === 'bag') { const b = bag('#e8203a'); b.position.y = -0.74; p.armR.add(b); p.extras.held = b; }
      if (x === 'chef') {
        const w = mat('#ffffff');
        const c = new T.Mesh(new T.CylinderGeometry(0.24, 0.22, 0.3, 14), w); c.position.y = 0.38; p.head.add(c);
        const puff = new T.Mesh(new T.SphereGeometry(0.3, 14, 10), w); puff.scale.y = 0.7; puff.position.y = 0.6; p.head.add(puff);
        // a little bao on the front
        const bao = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), mat('#f6ead6')); bao.scale.y = 0.75; bao.position.set(0, 0.38, -0.24); p.head.add(bao);
      }
      if (x === 'wizard') {
        const m = mat('#5b2fa8');
        const brim = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 0.05, 18), m); brim.position.y = 0.27; p.head.add(brim);
        const cone = new T.Mesh(new T.ConeGeometry(0.3, 0.85, 16), m); cone.position.y = 0.7; cone.rotation.z = 0.15; p.head.add(cone);
        const star = box(0.14, 0.14, 0.04, new T.MeshBasicMaterial({ color: '#ffd400' }), 0, 0.55, -0.24, p.head); star.rotation.z = Math.PI / 4;
        p.extras.star = star;
        const cape = box(0.78, 1.15, 0.04, mat('#2b1a4a', { side: T.DoubleSide }), 0, 0.12, 0.23, p.hips);
        cape.rotation.x = 0.08;
      }
      if (x === 'beard') {
        const w = mat('#f4f4f4');
        box(0.36, 0.42, 0.1, w, 0, -0.32, -0.21, p.head);
        box(0.22, 0.2, 0.08, w, 0, -0.6, -0.2, p.head);
        box(0.14, 0.05, 0.04, w, -0.11, 0.13, -0.245, p.head);
        box(0.14, 0.05, 0.04, w, 0.11, 0.13, -0.245, p.head);
        // a topknot
        box(0.16, 0.16, 0.16, w, 0, 0.36, 0.05, p.head);
      }
      if (x === 'sash') box(p.hips.children[0].geometry.parameters.width + 0.04, 0.12, 0.42, mat('#ffcf3a'), 0, 0.12, 0, p.hips);
      if (x === 'panda') {
        const blk = mat('#16151c');
        box(0.14, 0.15, 0.03, blk, -0.12, 0.06, -0.243, p.head);
        box(0.14, 0.15, 0.03, blk, 0.12, 0.06, -0.243, p.head);
        const wh = new T.MeshBasicMaterial({ color: '#ffffff' });
        box(0.035, 0.035, 0.02, wh, -0.1, 0.09, -0.262, p.head);
        box(0.035, 0.035, 0.02, wh, 0.14, 0.09, -0.262, p.head);
        for (const s of [-1, 1]) box(0.17, 0.17, 0.12, blk, s * 0.2, 0.29, 0.02, p.head);
        // a little gold crown: he's the Golden Panda
        const gold = mat('#ffcf3a', { metalness: 0.6, roughness: 0.3 });
        box(0.34, 0.08, 0.3, gold, 0, 0.3, 0, p.head);
        for (const x2 of [-0.12, 0, 0.12]) box(0.06, 0.1, 0.06, gold, x2, 0.38, -0.12, p.head);
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- the little ones

  const IMP_COLORS = ['#7ed957', '#9b6bff', '#ff8a1f', '#18c4ff', '#ff5aa0'];
  function imp(seed) {
    const g = new T.Group();
    const col = IMP_COLORS[seed % IMP_COLORS.length];
    const body = new T.Mesh(new T.SphereGeometry(0.3, 18, 14), mat(col));
    body.position.y = 0.38; body.scale.set(1, 0.95, 0.9);
    g.add(body);
    const white = new T.MeshBasicMaterial({ color: '#ffffff' }), black = new T.MeshBasicMaterial({ color: '#14121f' });
    for (const s of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.095, 12, 10), white); eye.position.set(s * 0.11, 0.47, -0.22); g.add(eye);
      const pup = new T.Mesh(new T.SphereGeometry(0.045, 8, 8), black); pup.position.set(s * 0.11, 0.47, -0.31); g.add(pup);
      const horn = new T.Mesh(new T.ConeGeometry(0.05, 0.16, 8), mat('#ffe9a8')); horn.position.set(s * 0.14, 0.7, -0.02); horn.rotation.z = -s * 0.35; g.add(horn);
      box(0.13, 0.08, 0.18, mat(G().shade(col, -0.35)), s * 0.12, 0.04, -0.03, g);
      const arm = box(0.07, 0.2, 0.07, mat(col), s * 0.32, 0.36, 0, g); arm.rotation.z = s * 0.6;
    }
    box(0.14, 0.035, 0.02, black, 0, 0.3, -0.27, g);
    g.userData.body = body;
    return g;
  }

  function dragon() {
    const g = new T.Group();
    const red = mat('#e8203a'), gold = mat('#ffcf3a'), white = new T.MeshBasicMaterial({ color: '#ffffff' }), black = new T.MeshBasicMaterial({ color: '#14121f' });
    const head = new T.Group(); head.position.set(0, 0.2, -0.1); g.add(head);
    box(0.34, 0.26, 0.34, red, 0, 0, 0, head);
    box(0.26, 0.1, 0.16, gold, 0, -0.06, -0.22, head);
    for (const s of [-1, 1]) {
      box(0.08, 0.08, 0.02, white, s * 0.09, 0.07, -0.175, head);
      box(0.04, 0.04, 0.02, black, s * 0.09, 0.07, -0.19, head);
      const horn = box(0.04, 0.16, 0.04, gold, s * 0.1, 0.18, 0.06, head); horn.rotation.x = -0.5;
      const wh = box(0.02, 0.02, 0.26, gold, s * 0.16, -0.06, -0.3, head); wh.rotation.y = s * 0.5;
    }
    const segs = [];
    for (let i = 0; i < 5; i++) {
      const s = box(0.24 - i * 0.02, 0.2 - i * 0.015, 0.22, i % 2 ? gold : red, 0, 0.18, 0.18 + i * 0.21, g);
      segs.push(s);
    }
    const tail = box(0.04, 0.22, 0.14, gold, 0, 0.24, 1.25, g); tail.rotation.x = 0.4; segs.push(tail);
    g.userData.head = head; g.userData.segs = segs;
    return g;
  }

  function stripeTex(cols) {
    const [c, g] = G().makeCanvas(128, 64);
    cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * 64) / cols.length, 128, 64 / cols.length + 1); });
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 37) % 128, (i * 23) % 64, 3, 0, Math.PI * 2); g.fill(); }
    return G().toTexture(c);
  }
  let confettiMat = null;
  function confettiBall() {
    const g = new T.Group();
    if (!confettiMat) { confettiMat = mat('#ffffff', { map: stripeTex(['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a', '#9b6bff', '#ff8a1f']) }); confettiMat.userData.shared = true; }
    const ball = new T.Mesh(new T.SphereGeometry(0.28, 18, 14), confettiMat);
    ball.position.y = 0.3; g.add(ball);
    const fuse = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 6), mat('#6b4a2a')); fuse.position.y = 0.64; fuse.rotation.z = 0.3; g.add(fuse);
    const spark = new T.Sprite(new T.SpriteMaterial({ map: G().glowTexture ? G().glowTexture() : null, color: '#ffd400', transparent: true, depthWrite: false }));
    spark.position.set(0.04, 0.74, 0); spark.scale.set(0.3, 0.3, 0.3); g.add(spark);
    g.userData.ball = ball; g.userData.spark = spark;
    return g;
  }

  // ---------------------------------------------------------------- props

  let potTex = null;
  function pot() {
    if (!potTex) {
      const [c, g] = G().makeCanvas(256, 128);
      g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = '#2a57b8'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(0, 22); g.lineTo(256, 22); g.moveTo(0, 106); g.lineTo(256, 106); g.stroke();
      g.lineWidth = 5;
      for (let i = 0; i < 4; i++) { g.beginPath(); const x = 32 + i * 64; g.arc(x, 64, 22, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, 64, 9, 0, Math.PI * 2); g.stroke(); }
      potTex = G().toTexture(c);
    }
    const pts = [[0, 0], [0.16, 0.0], [0.24, 0.12], [0.28, 0.3], [0.24, 0.48], [0.12, 0.6], [0.13, 0.7], [0.16, 0.72]].map(([x, y]) => new T.Vector2(x, y));
    const g = new T.Group();
    const m = new T.Mesh(new T.LatheGeometry(pts, 18), mat('#ffffff', { map: potTex, side: T.DoubleSide, roughness: 0.35 }));
    g.add(m);
    const rope = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 1, 5), mat('#8a5a2a'));
    rope.position.y = 0.72; g.add(rope);
    g.userData.rope = rope;
    return g;
  }

  function bag(color) {
    const g = new T.Group();
    const b = box(0.24, 0.16, 0.24, mat(color || '#e8203a', { roughness: 0.9 }), 0, 0, 0, g);
    box(0.25, 0.02, 0.02, mat('#ffffff'), 0, 0.08, 0, b);
    return g;
  }

  function boomerang() {
    const g = new T.Group();
    const m = mat('#ff8a1f'), m2 = mat('#ffd400');
    const a = box(0.5, 0.05, 0.12, m, 0.18, 0, 0, g); a.rotation.y = 0.5;
    const b = box(0.5, 0.05, 0.12, m2, -0.18, 0, 0, g); b.rotation.y = -0.5;
    return g;
  }

  function cage() {
    const g = new T.Group();
    const bam = mat('#8fbf4a'), dark = mat('#5f8f2a');
    box(1.9, 0.12, 1.3, mat('#a0703a'), 0, 0.06, 0, g);
    box(1.9, 0.1, 1.3, dark, 0, 2.3, 0, g);
    const bars = new T.Group();
    for (let i = 0; i < 8; i++) {
      const x = -0.85 + i * (1.7 / 7);
      const b = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.2, 6), bam);
      b.position.set(x, 1.2, -0.6); bars.add(b);
    }
    g.add(bars);
    g.userData.bars = bars;
    return g;
  }

  function shadow() {
    const m = new T.Mesh(new T.CircleGeometry(0.42, 20), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.14, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    return m;
  }

  const G = () => Kit.gfx;
  window.KF_MODELS = { LOOKS, person, headband, imp, dragon, confettiBall, pot, bag, boomerang, cage, shadow, mat };
})();
