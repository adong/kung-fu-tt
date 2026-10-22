/* 中文 for Kung Fu TT (功夫小子): every word on the page, the toasts and banners, the floor and boss names, the ?
   panel (Kit.lang, from kit/lang.js). The word bursts (POW!) and the DUCK! / JUMP! hints are drawn on canvases, so
   js/fx.js asks Kit.lang.t() for them; their words are here too. The logo is swapped by js/game.js (功夫小子).
   Staying in English on purpose: the kids' names (TEDDY, TOMMY) and the 1P / 2P labels. */
(function () {
  const L = Kit.lang;
  L.keep(['TEDDY', 'TOMMY', 'Teddy', 'Tommy', 'TEDDY!', 'TOMMY!', 'Claude Code', 'Esc', '1P', '2P', 'TEDDY · 1P', 'TOMMY · 2P', 'Teddy (1P)', 'Tommy (2P)']);

  const HALL = { 'BAMBOO HALL': '竹林殿', 'LANTERN HALL': '灯笼殿', 'DRUM HALL': '大鼓殿', 'CLOUD HALL': '云朵殿', 'GOLDEN HALL': '金色大殿' };
  const BOSS = { 'STAFF MASTER': '棍子大师', 'BOOMERANG BAO': '回旋镖包子', 'BIG BELLY GIANT': '大肚子巨人', 'PUFF MAGICIAN': '噗噗魔术师', 'GRAND MASTER': '大宗师' };
  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉', DUMPLING: '饺子', TREAT: '好吃的' };
  L.add(HALL);
  L.add(BOSS);

  L.add({
    // the logo's line, the title screen
    'Kung Fu TT': '功夫小子',
    'Climb the temple. Save the Golden Panda!': '一层一层往上打，救出金熊猫！',
    '▶ 1 PLAYER': '▶ 1 个人玩', 'Teddy or Tommy (+ call your brother)': 'Teddy 或 Tommy（还能叫兄弟来帮忙）',
    '👫 2 PLAYERS': '👫 2 个人玩', 'brothers together, one keyboard': '兄弟俩一起玩，一个键盘',
    'no timer, lots of dumplings': '不限时，好多饺子', 'the real temple, with a timer': '真正的挑战，有计时',
    'FLOOR': '楼层', 'Floor': '楼层', 'Difficulty': '难度',
    'walk · jump · duck': '走 · 跳 · 蹲下', 'punch · kick · special': '出拳 · 踢腿 · 绝招', 'low punch / low kick': '低拳 / 低踢',
    'hold': '按住', 'call your brother / high five': '叫兄弟 / 击掌',
    "The pad walks, jumps and ducks. 👊 punch, 🦶 kick, and the special. Tap your brother's face to call him! On an iPad, two players can play side by side.":
      '方向键可以走、跳、蹲下。👊 出拳，🦶 踢腿，还有绝招。点兄弟的脸就能叫他来帮忙！在 iPad 上，两个人可以并排一起玩。',
    'built with': '制作工具：',
    // who's playing?
    "WHO'S PLAYING?": '谁来玩？', '🥊 BOXING COMBO special': '🥊 拳击连招', 'jab · jab · straight!': '刺拳 · 刺拳 · 直拳！',
    '✌️ Y POSE special': '✌️ 比耶绝招', 'a stun wave all around': '一圈晕晕波', '◀ BACK': '◀ 返回',
    // pause, oh no, you did it
    'P · Esc · Space to resume · Q for the menu · M sound': 'P · Esc · 空格 继续 · Q 回菜单 · M 声音',
    'OH NO!': '哎呀！', 'The temple wins this time. Try that floor again!': '这次没打过。这一层再试一次吧！', '↻ TRY AGAIN': '↻ 再试一次',
    'Enter: try again · Esc: menu': '回车：再试一次 · Esc：菜单',
    'YOU DID IT!': '你们做到啦！', 'The Golden Panda is free! Thank you, kung fu brothers!': '金熊猫自由啦！谢谢功夫兄弟！',
    'LEVEL': '难度', '🐣 EASY': '🐣 简单', '🔥 NORMAL': '🔥 普通', '↻ PLAY AGAIN': '↻ 再玩一次', 'Enter: play again · Esc: menu': '回车：再玩一次 · Esc：菜单',
    'LOADING…': '加载中…', '↻ Turn sideways for a bigger temple!': '↻ 横过来玩，寺庙更大！',
    // the HUD
    'POWER!': '超级力量！', 'CALL': '叫', 'HIGH FIVE!': '击掌！', 'BOSS': '大王', 'WIGGLE FREE!': '扭一扭，挣脱！', 'press any button, fast!': '快快按任意键！',
    'JUMP': '跳', 'DUCK': '蹲下', 'SPECIAL': '绝招', 'KICK': '踢腿', 'PUNCH': '出拳', 'Special': '绝招',
    'GO': '出发', '⬅ GO': '⬅ 出发', 'GO ➡': '出发 ➡',
    'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Call your brother (T)': '叫兄弟 (T)', 'High five (T or Enter)': '击掌 (T 或 回车)',
    // boss lines and banners
    'Spins a long bamboo staff!': '会转长长的竹棍！', 'Throws a boomerang. It comes back!': '扔回旋镖，它还会飞回来！',
    'Belly bump! Stomp! Jump the wave!': '肚子撞！跺脚！跳过冲击波！', 'Poof! Which one is the real one?': '噗！哪个才是真的？',
    'The last master. Watch his moves!': '最后一位大师。看清他的招式！',
    'FLOOR CLEAR!': '这一层过关！', 'The Golden Panda is free!': '金熊猫自由啦！', "TIME'S UP!": '时间到！', "TIME'S UP! ❤️ -1": '时间到！❤️ -1',
    'BOXING COMBO!': '拳击连招！', 'POWER UP! ⚡': '力量加满！⚡', 'WHICH ONE IS REAL?': '哪个是真的？',
    // word bursts and hints (drawn on canvases)
    'POW!': '砰！', 'BOP!': '啪！', 'WHAM!': '嘭！', 'BONK!': '咚！', 'HI-YAH!': '嘿呀！', 'JAB!': '刺拳！', 'BOOM!': '轰！', 'PEACE!': '比耶！',
    'POP!': '啵！', 'POOF!': '噗！', 'FREE!': '挣脱啦！', 'YAWN!': '哈欠～', 'OOF!': '哎哟！', 'THUD!': '咚！', 'CRASH!': '哗啦！', 'HELP!': '救命！',
    'UP YOU GET!': '起来啦！', 'DUCK!': '蹲下！', 'JUMP!': '跳！', 'BACK!': '后退！',
    // the ? panel
    'walk': '走', 'jump · duck': '跳 · 蹲下', 'punch': '出拳', 'kick (in the air: flying kick)': '踢腿（在空中：飞踢）', 'low punch · low kick': '低拳 · 低踢',
    'special': '绝招', 'wiggle free from a hug (press fast)': '被抱住时挣脱（快快按）', 'call your brother · high five': '叫兄弟 · 击掌',
    'In 1 player both sets of keys work, and Space jumps. Bean bags coming high: duck. Coming low: jump!': '1 个人玩时两组按键都能用，空格也能跳。沙包飞得高：蹲下。飞得低：跳！',
    "The pad walks, jumps (⬆) and ducks (⬇). 👊 PUNCH, 🦶 KICK and the special. Tap your brother's face to call him.": '方向键可以走、跳（⬆）和蹲下（⬇）。👊 出拳，🦶 踢腿，还有绝招。点兄弟的脸就能叫他来帮忙。',
  });

  L.rule(/^FLOOR (\d)$/, '第 $1 层');
  L.rule(/^(\S+) ([A-Z ]+ HALL)$/, (m, e, n) => `${e} ${HALL[n] || n}`);
  L.rule(/^BEST (\d+)$/, '最高分 $1');
  L.rule(/^BONUS \+(\d+)$/, '奖励 +$1');
  L.rule(/^(.+) gives up!$/, (m, n) => `${BOSS[n] || n}认输啦！`);
  L.rule(/^HELP (TEDDY|TOMMY) UP!$/, '快去扶 $1 起来！');
  L.rule(/^(TEDDY|TOMMY) HELPED (TEDDY|TOMMY) UP!$/, '$1 把 $2 扶起来啦！');
  L.rule(/^(TEDDY|TOMMY) IS BACK UP!$/, '$1 自己站起来啦！');
  L.rule(/^(TEDDY|TOMMY) SAYS: HI-YAH!$/, '$1 说：嘿呀！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA|DUMPLING|TREAT) FROM (TEDDY|TOMMY)!$/, (m, e, item, who) => `${e} ${who} 送来的${TREAT[item]}！`);
})();
