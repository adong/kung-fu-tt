/* Kung Fu TT: sounds, synthesised with the kit's Kit.sound.tone / hiss, so the one mute switch covers them.
   Kit.sound already has punch, swish, jump, land, coin, powerup, click; the temple's own sounds are here. */
(function () {
  'use strict';
  const S = () => window.Kit.sound;

  const sfx = {
    swing() { S().hiss({ f: 2200, to: 900, q: 1.2, dur: 0.08, vol: 0.07 }); },
    kick() { S().hiss({ f: 1400, to: 500, q: 1.3, dur: 0.12, vol: 0.1 }); },
    hit(big) { S().punch(); if (big) S().tone({ f: 160, to: 60, dur: 0.18, vol: 0.3 }); },
    // the BONK: a wooden knock and a boing up
    bonk() {
      S().tone({ type: 'triangle', f: 700, to: 300, dur: 0.08, vol: 0.22 });
      S().tone({ type: 'sine', f: 220, to: 880, dur: 0.22, vol: 0.12, at: 0.05 });
    },
    poof() { S().hiss({ f: 3000, to: 900, q: 0.8, dur: 0.25, vol: 0.1 }); S().tone({ type: 'sine', f: 1320, to: 2200, dur: 0.1, vol: 0.04 }); },
    ouch() { S().tone({ type: 'triangle', f: 620, to: 300, dur: 0.14, vol: 0.14 }); S().tone({ f: 140, to: 70, dur: 0.12, vol: 0.2 }); },
    // a hug: a squeaky "aww"
    grab() { S().tone({ type: 'triangle', f: 520, to: 780, dur: 0.12, vol: 0.12 }); S().tone({ type: 'triangle', f: 780, to: 600, dur: 0.16, vol: 0.1, at: 0.12 }); },
    wiggle() { S().tone({ type: 'square', f: 300 + Math.random() * 200, dur: 0.04, vol: 0.03, lp: 1800 }); },
    free() { S().tone({ type: 'sine', f: 400, to: 1200, dur: 0.18, vol: 0.14 }); S().hiss({ f: 2500, to: 1200, dur: 0.15, vol: 0.06 }); },
    yawn() { S().tone({ type: 'sawtooth', f: 330, to: 220, dur: 0.5, vol: 0.04, lp: 900 }); },
    throw() { S().hiss({ f: 1600, to: 600, q: 1.2, dur: 0.16, vol: 0.09 }); },
    bop() { S().tone({ type: 'square', f: 900, to: 1400, dur: 0.06, vol: 0.06, lp: 2600 }); },
    hop() { S().tone({ type: 'sine', f: 500, to: 900, dur: 0.07, vol: 0.04 }); },
    wobble() { [0, 0.09, 0.18].forEach((at) => S().tone({ type: 'triangle', f: 1400, to: 1300, dur: 0.05, vol: 0.05, at })); },
    crash() {
      S().hiss({ f: 5000, to: 1500, q: 0.7, dur: 0.3, vol: 0.18 });
      [1800, 2400, 2100].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.06, vol: 0.05, at: i * 0.04 }));
    },
    pop() {
      S().tone({ f: 200, to: 60, dur: 0.12, vol: 0.3 });
      S().hiss({ f: 4000, to: 1500, dur: 0.3, vol: 0.14 });
      [1047, 1319, 1568].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.08, vol: 0.05, at: 0.05 + i * 0.05 }));
    },
    jump() { S().jump(); },
    land() { S().land(); },
    jab(i) { S().punch(); if (i === 2) { S().tone({ f: 130, to: 50, dur: 0.25, vol: 0.35 }); S().hiss({ filter: 'lowpass', f: 2600, to: 300, dur: 0.25, vol: 0.2 }); } },
    // Tommy's Y: a sparkly chime
    peace() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.18, vol: 0.08, at: i * 0.05 }));
      S().hiss({ f: 4000, to: 8000, dur: 0.5, vol: 0.05 });
    },
    stun() { S().tone({ type: 'sine', f: 1568, dur: 0.08, vol: 0.04 }); S().tone({ type: 'sine', f: 1319, dur: 0.08, vol: 0.04, at: 0.1 }); },
    ready() { S().tone({ type: 'sine', f: 880, to: 1320, dur: 0.1, vol: 0.05 }); },
    eat() {
      S().tone({ type: 'square', f: 300, to: 200, dur: 0.06, vol: 0.05, lp: 1500 });
      S().tone({ type: 'square', f: 320, to: 210, dur: 0.06, vol: 0.05, lp: 1500, at: 0.1 });
      S().coin(3);
    },
    // the companion: a whoosh in and a HI-YAH
    whoosh() { S().hiss({ f: 900, to: 2600, q: 1.1, dur: 0.4, vol: 0.14 }); },
    hiyah() {
      S().tone({ type: 'sawtooth', f: 520, to: 880, dur: 0.12, vol: 0.06, lp: 2400 });
      S().tone({ type: 'sawtooth', f: 880, to: 700, dur: 0.18, vol: 0.06, lp: 2400, at: 0.12 });
      S().tone({ f: 120, to: 50, dur: 0.3, vol: 0.4, at: 0.05 });
    },
    clap() { S().hiss({ f: 2500, filter: 'bandpass', q: 0.8, dur: 0.08, vol: 0.3 }); S().powerup(); },
    // bosses
    gong() {
      S().tone({ type: 'sine', f: 110, to: 104, dur: 1.6, vol: 0.3 });
      S().tone({ type: 'sine', f: 223, to: 215, dur: 1.2, vol: 0.12 });
      S().tone({ type: 'triangle', f: 340, dur: 0.9, vol: 0.05 });
      S().hiss({ f: 3000, to: 800, dur: 0.6, vol: 0.06 });
    },
    tele() { S().tone({ type: 'triangle', f: 660, to: 990, dur: 0.12, vol: 0.06 }); },
    stomp() { S().tone({ f: 70, to: 35, dur: 0.4, vol: 0.5 }); S().hiss({ filter: 'lowpass', f: 900, to: 150, dur: 0.4, vol: 0.25 }); },
    whirr() { S().hiss({ f: 1800, to: 1200, q: 3, dur: 0.35, vol: 0.06 }); },
    puff() { S().hiss({ f: 2400, to: 500, q: 0.8, dur: 0.35, vol: 0.14 }); S().tone({ type: 'sine', f: 600, to: 1800, dur: 0.2, vol: 0.05 }); },
    bossDown() {
      S().tone({ type: 'triangle', f: 520, to: 180, dur: 0.3, vol: 0.25 });
      [1568, 1319, 1568, 1319].forEach((f, i) => S().tone({ type: 'sine', f, dur: 0.09, vol: 0.05, at: 0.35 + i * 0.12 }));
    },
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.16, vol: 0.05, lp: 3000, at: i * 0.12 }));
      S().tone({ type: 'square', f: 1047, dur: 0.5, vol: 0.05, lp: 3000, at: 0.5 });
      S().tone({ type: 'square', f: 784, dur: 0.5, vol: 0.04, lp: 3000, at: 0.5 });
    },
    cheer() { for (let i = 0; i < 6; i++) S().hiss({ f: 1200 + Math.random() * 1500, filter: 'bandpass', q: 1.5, dur: 0.35, vol: 0.05, at: i * 0.07 }); },
    tick() { S().tone({ type: 'square', f: 1200, dur: 0.04, vol: 0.04, lp: 3000 }); },
    timeUp() { [523, 415, 330].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.2, vol: 0.12, at: i * 0.18 })); },
    ko() {
      S().tone({ type: 'triangle', f: 520, to: 180, dur: 0.22, vol: 0.25 });
      [1568, 1319, 1568, 1319].forEach((f, i) => S().tone({ type: 'sine', f, dur: 0.09, vol: 0.05, at: 0.3 + i * 0.12 }));
    },
    revive() { [392, 523, 659, 784].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.12, vol: 0.08, at: i * 0.07 })); },
    over() { [392, 349, 330, 262].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.3, vol: 0.1, at: i * 0.25 })); },
    ui() { S().click(); },
  };

  window.KF_SFX = sfx;
})();
