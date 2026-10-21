/* 中文 for Kung Fu TT (功夫小子): every word on the page, the toasts and banners, the floor and boss names, the ?
   panel (Kit.lang, from kit/lang.js). The word bursts (POW!) and the DUCK! / JUMP! hints are drawn on canvases, so
   js/fx.js asks Kit.lang.t() for them; their words are here too. The logo is swapped by js/game.js (功夫小子).
   Staying in English on purpose: the kids' names (TEDDY, TOMMY) and the 1P / 2P labels. */
(function () {
  const L = Kit.lang;
  L.keep(['TEDDY', 'TOMMY', 'Teddy', 'Tommy', 'TEDDY!', 'TOMMY!', 'Claude Code', 'Esc', '1P', '2P']);
})();
