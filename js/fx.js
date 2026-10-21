/* Kung Fu TT: effects. Comic word bursts (POW! BONK! HI-YAH!), stars that baddies poof into, confetti, poof clouds,
   Tommy's peace wave ring, hearts from huggers, emoji sprites (treats flying to a brother, food) and the little
   DUCK! / JUMP! hints over a wind-up. Textures are painted once; words go through Kit.lang.t (canvas text). */
(function () {
  'use strict';
  const T = THREE;
  let scene, G;
  const live = [];
  const cache = {};
  let starTex = null, puffTex = null, ringTex = null, dotTex = null;

  const STYLE = {
    'POW!': ['#ffd400', '#ff8a1f', '#e8203a'], 'BOP!': ['#ffe14d', '#ffffff', '#1f6fe0'], 'WHAM!': ['#ff3d3d', '#ffd400', '#ffffff'],
    'BONK!': ['#ff5aa0', '#ffd400', '#ffffff'], 'HI-YAH!': ['#18b4ff', '#ffffff', '#e8203a'], 'JAB!': ['#4aa8ff', '#d8f0ff', '#ffffff'],
    'BOOM!': ['#ff8a1f', '#ffd400', '#7a1fd1'], 'PEACE!': ['#ff9fd0', '#fff2a8', '#b02a8a'], 'POP!': ['#9be37a', '#fff6a8', '#e8207a'],
    'POOF!': ['#ffffff', '#f0f0ff', '#8d5bd8'], 'HIGH FIVE!': ['#ffd400', '#ff8a1f', '#ffffff'], 'FREE!': ['#7dff5a', '#ffffff', '#1f6fe0'],
    'YAWN!': ['#c8c8f8', '#ffffff', '#5a4ab0'], 'OOF!': ['#c8c8d8', '#ffffff', '#3a3a5a'], 'THUD!': ['#c58a4a', '#ffd9a0', '#ffffff'],
    'CRASH!': ['#8cd8ff', '#ffffff', '#1f4fe0'], 'HELP!': ['#ffffff', '#ffe9a8', '#e8203a'], 'UP YOU GET!': ['#7dff5a', '#ffffff', '#1f6fe0'],
  };
  const CJK = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const lang = () => window.Kit.lang;

  function burstTexture(word) {
    const shown = lang() ? lang().t(word) : word;
    if (cache['b' + shown]) return cache['b' + shown];
    const [c, g] = G.makeCanvas(256, 256);
    const [outer, inner, text] = STYLE[word] || STYLE['POW!'];
    const star = (r1, r2, n, fill) => {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? r2 * (0.85 + ((i * 37) % 7) / 30) : r1 * (0.88 + ((i * 53) % 5) / 25);
        g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
      }
      g.closePath(); g.fillStyle = fill; g.fill();
    };
    g.lineJoin = 'round';
    star(124, 70, 12, '#14121f');
    star(114, 62, 12, outer);
    star(84, 52, 10, inner);
    g.translate(128, 132); g.rotate(-0.12);
    const cjk = /[㐀-鿿]/.test(shown);
    let size = cjk ? 64 : 58;
    g.font = `${cjk ? 900 : 400} ${size}px ${cjk ? CJK : G.FONT}`;
    while (g.measureText(shown).width > 210 && size > 22) { size -= 2; g.font = `${cjk ? 900 : 400} ${size}px ${cjk ? CJK : G.FONT}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#14121f'; g.strokeText(shown, 0, 0);
    g.fillStyle = text; g.fillText(shown, 0, 0);
    return (cache['b' + shown] = G.toTexture(c));
  }

  function hintTexture(word, color) {
    const shown = lang() ? lang().t(word) : word;
    const key = 'h' + shown + color;
    if (cache[key]) return cache[key];
    const [c, g] = G.makeCanvas(256, 128);
    const cjk = /[㐀-鿿]/.test(shown);
    g.font = `${cjk ? 900 : 400} ${cjk ? 60 : 52}px ${cjk ? CJK : G.FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#14121f'; g.strokeText(shown, 128, 66);
    g.fillStyle = color; g.fillText(shown, 128, 66);
    return (cache[key] = G.toTexture(c));
  }

  function emojiTex(e) { return cache['e' + e] || (cache['e' + e] = G.emojiTexture(e)); }

  function init(sc) {
    scene = sc;
    G = window.Kit.gfx;
    starTex = G.radialTexture ? null : null;
    {
      const [c, g] = G.makeCanvas(64, 64);
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
      g.closePath(); g.fill();
      starTex = G.toTexture(c);
    }
    {
      const [c, g] = G.makeCanvas(128, 128);
      const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      puffTex = G.toTexture(c);
    }
    {
      const [c, g] = G.makeCanvas(256, 256);
      g.strokeStyle = '#ffffff'; g.lineWidth = 18;
      g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 6; g.globalAlpha = 0.6; g.beginPath(); g.arc(128, 128, 90, 0, Math.PI * 2); g.stroke();
      ringTex = G.toTexture(c);
    }
    dotTex = G.dotTexture ? G.dotTexture() : puffTex;
  }

  function sprite(tex, x, y, z, s, o) {
    const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: !(o && o.top) });
    if (o && o.color) m.color.set(o.color);
    const sp = new T.Sprite(m);
    sp.position.set(x, y, z);
    sp.scale.set(s, s, s);
    if (o && o.top) sp.renderOrder = 10;
    scene.add(sp);
    return sp;
  }

  function add(obj, life, update) { live.push({ obj, life, t: 0, update }); return obj; }

  // a word burst: pops in big, wobbles, fades
  function burst(word, x, y, z, big) {
    const s0 = big ? 1.9 : 1.35;
    const sp = sprite(burstTexture(word), x, y, z + 0.6, s0 * 0.4, { top: true });
    sp.material.rotation = (Math.random() - 0.5) * 0.4;
    add(sp, 0.6, (o, t, u) => {
      const s = s0 * (u < 0.15 ? 0.4 + (u / 0.15) * 0.75 : 1.15 - (u - 0.15) * 0.25);
      o.scale.set(s, s, s);
      o.position.y = y + u * 0.35;
      o.material.opacity = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
    });
  }

  // a little cloud of stars (a bonked baddie poofs)
  function stars(x, y, z, n, colors) {
    colors = colors || ['#ffd400', '#ffffff', '#ff9fd0', '#8cd8ff'];
    for (let i = 0; i < (n || 10); i++) {
      const sp = sprite(starTex, x, y, z + 0.3, 0.3 + Math.random() * 0.25, { color: colors[i % colors.length] });
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 3;
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v + 2;
      sp.material.rotation = Math.random() * 6;
      add(sp, 0.7 + Math.random() * 0.3, (o, t, u) => {
        o.position.x = x + vx * t; o.position.y = y + vy * t - 4 * t * t;
        o.material.rotation += 0.15;
        o.material.opacity = 1 - u;
      });
    }
  }

  function poof(x, y, z, color, s) {
    for (let i = 0; i < 7; i++) {
      const sp = sprite(puffTex, x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + 0.2, 0.6, { color: color || '#ffffff' });
      const vx = (Math.random() - 0.5) * 2.4, vy = Math.random() * 1.5 + 0.3, s0 = (s || 1) * (0.7 + Math.random() * 0.5);
      add(sp, 0.6, (o, t, u) => {
        o.position.x += vx * 0.016; o.position.y += vy * 0.016;
        const sc = s0 * (0.6 + u * 1.2);
        o.scale.set(sc, sc, sc);
        o.material.opacity = (1 - u) * 0.9;
      });
    }
  }

  function dust(x, z, n) {
    for (let i = 0; i < (n || 4); i++) {
      const sp = sprite(puffTex, x + (Math.random() - 0.5) * 0.5, 0.15, z + 0.3, 0.35, { color: '#e8dcc0' });
      const vx = (Math.random() - 0.5) * 2;
      add(sp, 0.45, (o, t, u) => { o.position.x += vx * 0.016; o.position.y += 0.01; const s = 0.35 + u * 0.5; o.scale.set(s, s, s); o.material.opacity = 0.7 * (1 - u); });
    }
  }

  function confetti(x, y, z, n, spread) {
    const cols = ['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a', '#9b6bff', '#ff8a1f'];
    for (let i = 0; i < (n || 30); i++) {
      const m = new T.Mesh(new T.PlaneGeometry(0.12, 0.07), new T.MeshBasicMaterial({ color: cols[i % cols.length], side: T.DoubleSide, transparent: true }));
      m.position.set(x + (Math.random() - 0.5) * (spread || 0.5), y, z + (Math.random() - 0.5) * 1.5);
      scene.add(m);
      const vx = (Math.random() - 0.5) * 6, vy = 3 + Math.random() * 5, spin = (Math.random() - 0.5) * 20;
      add(m, 1.8 + Math.random(), (o, t, u) => {
        o.position.x = x + vx * t * (1 - u * 0.5);
        o.position.y = Math.max(0.02, y + vy * t - 4.5 * t * t);
        o.rotation.x += spin * 0.016; o.rotation.y += spin * 0.012;
        o.material.opacity = u > 0.8 ? (1 - u) / 0.2 : 1;
      });
    }
  }

  // Tommy's peace wave: a ring that grows along the floor
  function ring(x, z, max, color) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: ringTex, color: color || '#ff9fd0', transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    scene.add(m);
    add(m, 0.4, (o, t, u) => { const s = 0.4 + u * max * 2; o.scale.set(s, s, s); o.material.opacity = 1 - u * 0.8; });
    const v = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: ringTex, color: color || '#ff9fd0', transparent: true, depthWrite: false }));
    v.position.set(x, 1.1, z + 0.2);
    scene.add(v);
    add(v, 0.4, (o, t, u) => { const s = 0.4 + u * max * 2; o.scale.set(s, s * 0.8, s); o.material.opacity = (1 - u) * 0.7; });
  }

  function heart(x, y, z) {
    const sp = sprite(emojiTex('💗'), x, y, z + 0.3, 0.45);
    add(sp, 0.8, (o, t, u) => { o.position.y = y + u * 0.8; o.position.x = x + Math.sin(t * 9) * 0.1; o.material.opacity = 1 - u; });
  }

  // an emoji flying along an arc from (x0,y0) to (x1,y1) — a treat tossed to a brother
  function arc(e, x0, y0, x1, y1, z, dur, h, s) {
    const sp = sprite(emojiTex(e), x0, y0, z + 0.4, s || 0.7, { top: true });
    add(sp, dur, (o, t, u) => {
      o.position.x = x0 + (x1 - x0) * u;
      o.position.y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * (h || 1.5);
      o.material.rotation = u * 6;
    });
  }

  function float(e, x, y, z, s) {
    const sp = sprite(emojiTex(e), x, y, z + 0.4, s || 0.6, { top: true });
    add(sp, 0.9, (o, t, u) => { o.position.y = y + u * 1.1; o.material.opacity = u > 0.6 ? (1 - u) / 0.4 : 1; });
  }

  // a hint word over someone's head that stays while `alive()` says so
  function hint(word, color, getPos, alive) {
    const sp = sprite(hintTexture(word, color), 0, 0, 0, 1.3, { top: true });
    sp.scale.set(1.5, 0.75, 1);
    add(sp, 30, (o, t) => {
      if (!alive()) return true;
      const p = getPos();
      o.position.set(p.x, p.y + Math.abs(Math.sin(t * 8)) * 0.12, p.z + 0.5);
    });
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.life);
      const done = f.update(f.obj, f.t, u);
      if (done === true || f.t >= f.life) {
        scene.remove(f.obj);
        if (f.obj.material && f.obj.material !== undefined) f.obj.material.dispose();
        if (f.obj.geometry && !(f.obj instanceof T.Sprite)) f.obj.geometry.dispose();
        live.splice(i, 1);
      }
    }
  }

  function clear() { for (const f of live) scene.remove(f.obj); live.length = 0; }
  // words are drawn on canvases: forget them when the language changes
  function repaint() { for (const k in cache) if (k[0] === 'b' || k[0] === 'h') { cache[k].dispose(); delete cache[k]; } }

  window.KF_FX = { init, burst, stars, poof, dust, confetti, ring, heart, arc, float, hint, update, clear, repaint, emojiTex, count: () => live.length, STYLE };
})();
