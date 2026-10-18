/* 中文 for Tommy's Toy Box: the words on the page, the toasts, the canvas word bursts and the ? panel (Kit.lang,
   from kit/lang.js). Very simple words: Tommy is 5. The kids' and friends' names and the toy box's own name and
   logo stay in English on purpose. */
(function () {
  const L = Kit.lang;
  L.keep(["Tommy's Toy Box", "Tommy's", 'Toy Box', 'TEDDY', 'TOMMY', 'Teddy', 'Tommy', 'ZOOM', 'LUNA', 'BOLT', 'BRUNO', 'Esc']);

  L.add({
    // the menu
    'Whack-a-Zombie': '打僵尸', 'Whack-a-Zombie (1)': '打僵尸 (1)',
    'Memory Cards': '翻牌', 'Memory Cards (2)': '翻牌 (2)',
    "Who's playing?": '谁来玩？', 'ZOMBIE': '僵尸',
    'Sticker book': '贴纸本', 'Sticker book (B)': '贴纸本 (B)',
    'Call your buddy': '叫兄弟来帮忙',
    // while playing
    'Pause': '暂停', 'Pause (Esc)': '暂停 (Esc)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Relaxed timer': '计时', 'Timer on or off': '计时 开 / 关',
    '⏱️ TIMER ON': '⏱️ 计时 开', '⏱️ TIMER OFF': '⏱️ 计时 关',
    '✨ GOLDEN ZOMBIE! +3 ⭐': '✨ 金色僵尸！+3 ⭐',
    '🐢 NO RUSH! TAKE YOUR TIME': '🐢 不着急，慢慢来！',
    // results, pause, sticker book
    'Play': '开始', 'Home': '主页', 'Keep playing': '继续玩', 'Close': '关闭', 'NEW!': '新！',
    'Stars to the next sticker': '还要几颗星，换下一张贴纸',
    'Collect stars': '收集星星',
    'Finish a round of Whack-a-Zombie': '打僵尸玩完一局',
    'Bonk a golden zombie': '打到金色僵尸',
    'Bonk 10 zombies in a row': '连着打中 10 个僵尸',
    "Don't bonk the friends, 10 times": '10 次不打好朋友',
    'Finish the big Memory Cards (4×4)': '翻完最大的牌 (4×4)',
    // canvas word bursts over the heads (js/fx.js draws them through Kit.lang.t)
    'BONK!': '咚！', 'POW!': '砰！', 'WOW!': '哇！', 'OOPS!': '哎呀！',
    // the ? panel (js/keys.js)
    "pick who's playing": '选谁来玩', 'sticker book': '贴纸本', 'play again · next level': '再玩一次 · 下一关',
    "Everything is a picture to tap: zombies to bonk, cards to turn over, and your brother's face (bottom right).":
      '都是图画，点一点就行：点僵尸打它，点牌翻过来，点右下角兄弟的头像叫他来。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^Call (\S+) \(T\)$/, '叫 $1 (T)');
  L.rule(/^(.+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(.+) SAVED YOU!$/, '$1 救了你！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
  L.rule(/^🔥 (\d+) IN A ROW! SUPER!$/, '🔥 连打 $1 个！真棒！');
  L.rule(/^🔥 (\d+) PAIRS IN A ROW! SUPER!$/, '🔥 连对 $1 次！真棒！');
  L.rule(/^👀 (.+) FOUND A PAIR!$/, '👀 $1 找到一对！');
  L.rule(/^⚡ SPEEDY! \+(\d+) ⭐$/, '⚡ 好快！+$1 ⭐');
  L.rule(/^🎉 ALL PAIRS! \+(\d+) ⭐$/, '🎉 全找到啦！+$1 ⭐');
})();
