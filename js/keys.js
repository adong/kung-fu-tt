/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). The round ? / A文 / speaker buttons sit on
   the left edge under the player card (index.html sets --kh-top, --kl-top, --ks-top), well above the touch d-pad. */
Kit.help.setup({
  title: 'Kung Fu TT',
  cols: ['Teddy (1P)', 'Tommy (2P)'],
  keys: [
    ['walk', 'A D', '← →'],
    ['jump · duck', 'W · S', '↑ · ↓'],
    ['punch', 'F', 'K'],
    ['kick (in the air: flying kick)', 'G', 'L'],
    ['low punch · low kick', 'hold S + F · G', 'hold ↓ + K · L'],
    ['special', 'H', 'J'],
    ['wiggle free from a hug', 'any key, fast', 'any key, fast'],
    ['call your brother · high five', 'T', 'Enter'],
    ['pause · sound', 'P or Esc · M', ''],
  ],
  note: 'In 1 player both sets of keys work, and Space jumps. Bean bags coming high: duck. Coming low: jump!',
  touch: 'The pad walks, jumps (⬆) and ducks (⬇). 👊 PUNCH, 🦶 KICK and the special. Tap your brother\'s face to call him.',
  button: { top: 'var(--kh-top)' },
});
Kit.lang.setup({ button: { top: 'var(--kl-top)' } });
Kit.sound.setup({ button: { top: 'var(--ks-top)' } });
