#!/usr/bin/env node
/* Kung Fu TT: headless check. Loads the real rules (js/floors.js, js/sim.js), the autopilot (js/bot.js) and the
   checks (js/checks.js) in node, with no browser, and runs every check. The page runs the same ones: game.check().

     node tools/check.js             every check (floors, spawns, grabs, bosses, timer, knock-outs, revive, companion)
     node tools/check.js --prove     also proves the checks can fail: broken variants must all be caught
     node tools/check.js --seeds 5   play every floor with 5 seeds instead of 2
     node tools/check.js -v          print every result, not just the failures */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const nSeeds = args.includes('--seeds') ? parseInt(args[args.indexOf('--seeds') + 1], 10) || 2 : 2;

const sandbox = { console, Math, Set, Map, Object, Array, JSON, Infinity, NaN, isFinite };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['js/floors.js', 'js/sim.js', 'js/bot.js', 'js/checks.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const C = sandbox.KF_CHECKS;

const t0 = Date.now();
const res = C.all({ seeds: Array.from({ length: nSeeds }, (_, i) => i + 1) });
for (const k in res.groups) {
  const g = res.groups[k];
  const ok = g.filter((r) => r.ok).length;
  console.log(`${ok === g.length ? '✓' : '✗'} ${k}: ${ok}/${g.length}`);
  for (const r of g) {
    if (!r.ok || verbose) {
      const extra = ['t', 'boss', 'livesLost', 'closest', 'took', 'limit', 'calls', 'attacks'].filter((x) => r[x] != null).map((x) => `${x} ${r[x]}`).join(', ');
      console.log(`   ${r.ok ? '·' : '✗'} ${r.name}${extra ? ` (${extra})` : ''}${r.ok ? '' : ' — ' + r.problems.join('; ')}`);
    }
  }
}
console.log(`${res.ok ? 'PASS' : 'FAIL'}: ${res.pass} passed, ${res.fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
let code = res.ok ? 0 : 1;
if (args.includes('--prove')) {
  const p = C.prove();
  for (const c of p.cases) console.log(`${c.caught ? '✓ caught' : '✗ MISSED'}: ${c.name}`);
  console.log(p.ok ? 'PROVE: every broken variant was caught' : 'PROVE FAILED: a broken variant slipped through');
  if (!p.ok) code = 1;
}
process.exit(code);
