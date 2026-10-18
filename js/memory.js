/* Tommy's Toy Box: Memory Cards (翻牌).
   Pairs of cards show the brothers and friends in their signature poses (Tommy's Y, Teddy boxing and shooting a
   🏀, the friends waving) and treats. Levels: 2x3, then 3x4, then 4x4. Each pair is +1 ⭐ with a little celebration,
   3 pairs in a row is a SUPER (+1 ⭐), and a cleared level adds a bonus. No timer unless you switch on the relaxed
   one (⏱️): beat it for ⚡ +2 ⭐; if it runs out, nothing happens except the clock going away.
   The buddy peeks and reveals one matching pair per visit (the partner of the card you have up, if any), and while
   he's here a wrong pair doesn't end your streak. The cards are DOM buttons over the playroom scene. */
(function () {
  'use strict';
  const T = THREE;
  const TB = (window.TB = window.TB || {});
  const { rand, pick } = Kit.gfx;

  const LEVELS = [{ r: 2, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 4 }];
  const TIMER = [60, 120, 180]; // the relaxed timer, per level
  const FLIP_BACK = 1.0; // seconds a wrong pair stays up
  const CHAR_FACES = [
    { id: 'tommy', art: 'tommy', bg: '#ffe08a' },
    { id: 'teddy', art: 'teddy', bg: '#a8d8ff' },
    { id: 'teddyshot', art: 'teddyshot', bg: '#ffc59e', extra: '🏀' },
    { id: 'zoom', art: 'zoom', bg: '#ffb3d1' },
    { id: 'luna', art: 'luna', bg: '#d9c2ff' },
    { id: 'bolt', art: 'bolt', bg: '#c4f1ff' },
    { id: 'bruno', art: 'bruno', bg: '#c6f2c0' },
    { id: 'zombie', art: 'zombie', bg: '#e3f7a8' },
  ];
  const TREAT_FACES = [
    { id: 'icecream', emoji: '🍦', bg: '#ffd6e5' },
    { id: 'juice', emoji: '🧃', bg: '#d4f5c9' },
    { id: 'cookie', emoji: '🍪', bg: '#ffe7c2' },
    { id: 'melon', emoji: '🍉', bg: '#ffd1d1' },
    { id: 'banana', emoji: '🍌', bg: '#fff3a8' },
    { id: 'water', emoji: '💧', bg: '#cfeeff' },
  ];

  let api = null, flyers = null, gridEl = null, wrapEl = null;
  const M = {
    on: false, level: 0, cards: [], first: null, second: null, waitT: 0, matched: 0, pairs: 0, stars: 0,
    streak: 0, bestStreak: 0, flips: 0, misses: 0, done: false, clearT: -1, timerOn: false, time: 0, limit: 0,
    timeUp: false, dealT: 0, region: null, spots: null, sessionStars: 0, buddyPairs: 0,
  };
  const help = { lastT: 99, peeked: false, pair: null, peekT: 0 };

  // ---------------------------------------------------------------- layout

  // Work out where the cards go and where the player and buddy stand, then aim the playroom camera.
  function layout(m) {
    const W = TB.stage.W, H = TB.stage.H;
    const wide = W / H >= 1.12;
    let area, floor, charPx, px, bx;
    if (wide) {
      const side = Math.max(150, Math.min(320, W * 0.21));
      area = { x: side, y: m.t, w: W - 2 * side, h: H - m.t - 14 };
      floor = H - 16;
      charPx = Math.min(H * 0.42, side * 1.3);
      px = side * 0.52;
      bx = W - side * 0.7;
    } else {
      const strip = Math.max(150, H * 0.25);
      area = { x: 10, y: m.t, w: W - 20, h: H - m.t - strip };
      floor = H - 12;
      charPx = Math.min(strip * 0.88, W * 0.42);
      px = W * 0.2;
      bx = W * 0.52;
    }
    TB.stage.fitRoom(floor, charPx);
    M.region = area;
    M.spots = {
      player: { x: TB.stage.roomX(px), z: 0, face: Math.PI + 0.3 },
      buddy: { x: TB.stage.roomX(bx), z: 0, face: Math.PI - 0.3 },
      entry: { x: TB.stage.roomX(W + 160), z: 0 },
    };
    const p = api.player();
    p.faceDefault = M.spots.player.face;
    if (!p.moving) p.place(M.spots.player.x, 0, 0);
    sizeGrid();
  }

  // Fit the grid in the region: whichever way round (rows x cols or cols x rows) gives bigger cards.
  function sizeGrid() {
    if (!gridEl || !M.region || !M.cards.length) return;
    const a = M.region, L = LEVELS[M.level], gap = Math.max(8, Math.min(16, a.w * 0.015));
    const fit = (r, c) => Math.min((a.w - (c - 1) * gap) / c, ((a.h - (r - 1) * gap) / r) * 0.78);
    // the level's own shape, turned round if that fits better, or another shape (2 x 8 on a wide phone) if it gives
    // clearly bigger cards
    let r = L.r, c = L.c;
    if (fit(c, r) > fit(r, c) * 1.05) [r, c] = [c, r];
    const n = L.r * L.c;
    for (let rr = 2; rr <= n / 2; rr++) {
      if (n % rr) continue;
      if (fit(rr, n / rr) > fit(r, c) * 1.25) [r, c] = [rr, n / rr];
    }
    const cw = Math.floor(fit(r, c)), ch = Math.floor(cw / 0.78);
    gridEl.style.gridTemplateColumns = `repeat(${c}, ${cw}px)`;
    gridEl.style.gridAutoRows = `${ch}px`;
    gridEl.style.gap = `${gap}px`;
    gridEl.style.setProperty('--cw', cw + 'px');
    const gw = c * cw + (c - 1) * gap, gh = r * ch + (r - 1) * gap;
    wrapEl.style.left = `${a.x + (a.w - gw) / 2}px`;
    wrapEl.style.top = `${a.y + Math.max(0, (a.h - gh) / 2)}px`;
  }

  // ---------------------------------------------------------------- cards

  function faceHTML(f) {
    if (f.emoji) return `<span class="emo">${f.emoji}</span>`;
    const extra = f.extra ? `<span class="ball">${f.extra}</span>` : '';
    return `<img alt="" draggable="false" src="${TB.art.bodies[f.art]}">${extra}`;
  }

  // n pairs: always you and your buddy, then a mix of friends and treats.
  function chooseFaces(n) {
    const pid = api.playerId(), bid = Kit.roster.buddyFor(pid);
    const mine = CHAR_FACES.find((f) => f.id === pid) || CHAR_FACES[0];
    const his = CHAR_FACES.find((f) => f.id === bid);
    const out = [mine, his];
    const chars = shuffle(CHAR_FACES.filter((f) => f !== mine && f !== his && !(pid === 'teddy' && f.id === 'teddyshot')));
    const treats = shuffle(TREAT_FACES.slice());
    while (out.length < n) out.push(out.length % 2 ? chars.shift() || treats.shift() : treats.shift() || chars.shift());
    return out.slice(0, n);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function deal() {
    const L = LEVELS[M.level], n = (L.r * L.c) / 2;
    const faces = chooseFaces(n);
    const deck = shuffle(faces.concat(faces));
    gridEl.innerHTML = '';
    gridEl.classList.remove('dance');
    M.cards = deck.map((f, i) => {
      const el = document.createElement('button');
      el.className = 'card dealing';
      el.style.setProperty('--d', `${i * 0.04}s`);
      el.style.setProperty('--bg', f.bg);
      el.innerHTML = `<div class="inner"><div class="side back"><span>⭐</span></div><div class="side face">${faceHTML(f)}</div></div><b class="peek"></b>`;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        api.gesture();
        tap(i);
      });
      gridEl.appendChild(el);
      return { i, f, el, up: false, matched: false };
    });
    Object.assign(M, { first: null, second: null, waitT: 0, matched: 0, pairs: n, done: false, clearT: -1, time: 0, timeUp: false, dealT: 0.5 + deck.length * 0.04 });
    M.limit = TIMER[M.level];
    help.pair = null;
    sizeGrid();
    setTimeout(() => M.cards.forEach((c) => c.el.classList.remove('dealing')), 30);
    api.memoryHud();
  }

  function setUp(c, up) {
    c.up = up;
    c.el.classList.toggle('up', up);
  }

  function tap(i) {
    if (!M.on || M.done) return null;
    const c = M.cards[i];
    if (!c) return null;
    if (c.matched || c.up || c.el.classList.contains('peeking')) {
      c.el.classList.remove('wiggle');
      void c.el.offsetWidth;
      c.el.classList.add('wiggle');
      return 'nope';
    }
    if (M.second) flipBack(); // a wrong pair is still showing: turn it over now
    setUp(c, true);
    M.flips++;
    TB.sfx.flip();
    if (!M.first) {
      M.first = c;
      return 'first';
    }
    M.second = c;
    if (M.first.f === c.f) {
      matchPair(M.first, c, 'you');
      return 'match';
    }
    // not a pair
    M.waitT = FLIP_BACK;
    M.misses++;
    setTimeout(() => {
      for (const x of [M.first, M.second]) if (x && !x.matched) x.el.classList.add('shake');
    }, 220);
    TB.sfx.nomatch();
    if (TB.buddy.guarding()) {
      const r = c.el.getBoundingClientRect();
      TB.buddy.saved(r.left + r.width / 2, r.top);
    } else {
      if (M.streak > 0) api.streakBroken();
      M.streak = 0;
    }
    return 'miss';
  }

  function flipBack() {
    for (const x of [M.first, M.second]) {
      if (x && !x.matched) {
        setUp(x, false);
        x.el.classList.remove('shake');
      }
    }
    M.first = M.second = null;
    M.waitT = 0;
  }

  function matchPair(a, b, by) {
    for (const x of [a, b]) {
      setUp(x, true);
      x.matched = true;
      x.el.classList.remove('peeking');
      setTimeout(() => x.el.classList.add('matched'), 260);
    }
    if (M.first === a || M.first === b) M.first = null;
    if (M.second === a || M.second === b) M.second = null;
    M.matched++;
    let gain = 1;
    if (by === 'you') {
      M.streak++;
      M.bestStreak = Math.max(M.bestStreak, M.streak);
    } else M.buddyPairs++;
    TB.sfx.match(M.streak);
    const p = api.player();
    for (const x of [a, b]) {
      const r = x.el.getBoundingClientRect();
      setTimeout(() => TB.fx.overlay.burst(r.left + r.width / 2, r.top + r.height / 2, 18, ['⭐', '✨', a.f.emoji || '💖']), 280);
    }
    if (by === 'you' && M.streak > 0 && M.streak % 3 === 0) {
      gain += 1;
      api.toast(`🔥 ${M.streak} PAIRS IN A ROW! SUPER!`, 'super');
      p.react('signature');
    } else if (by === 'buddy') {
      api.toast(`👀 ${TB.buddy.entry.name} FOUND A PAIR!`, 'buddy');
      p.react('cheer');
    } else p.react(M.matched === M.pairs ? 'signature' : 'cheer');
    addStars(gain, a.el);
    if (M.matched === M.pairs) {
      M.done = true;
      M.clearT = 0;
    }
  }

  function addStars(n, el) {
    M.stars += n;
    M.sessionStars += n;
    api.stars(n);
    const r = el.getBoundingClientRect();
    api.flyStar(r.left + r.width / 2, r.top + r.height / 2, n);
  }

  // ---------------------------------------------------------------- the buddy's help

  // Once per visit: he looks over the cards, two of them glow with his face on them, then they flip over as a pair.
  function buddyHelp(dt, b) {
    if (b.t < help.lastT) help.peeked = false; // a new visit (or he was called again)
    help.lastT = b.t;
    const a = b.actor;
    if (help.pair) {
      help.peekT -= dt;
      a.face = Math.PI + (M.spots.buddy.x > 0 ? 0.55 : -0.55); // looking over at the cards
      a.act('give', 0.3, 0, true);
      if (help.peekT <= 0) {
        const [x, y] = help.pair;
        help.pair = null;
        a.face = null;
        if (!x.matched && !y.matched) {
          if (M.second && (M.second !== x && M.second !== y)) flipBack();
          matchPair(x, y, 'buddy');
        }
      }
      return;
    }
    if (help.peeked || M.done || !M.on || M.second || M.dealT > 0) return;
    // the partner of the card you have up, or any pair still face down
    let pair = null;
    if (M.first && !M.first.matched) {
      const mate = M.cards.find((c) => c !== M.first && !c.matched && c.f === M.first.f);
      if (mate) pair = [M.first, mate];
    }
    if (!pair) {
      const left = M.cards.filter((c) => !c.matched && !c.up);
      const c0 = left.length ? pick(left) : null;
      const mate = c0 && left.find((c) => c !== c0 && c.f === c0.f);
      if (c0 && mate) pair = [c0, mate];
    }
    if (!pair) return;
    help.peeked = true;
    help.pair = pair;
    help.peekT = 1.2;
    const face = TB.art.heads[b.entry.id];
    for (const c of pair) {
      c.el.querySelector('.peek').style.backgroundImage = `url(${face})`;
      c.el.classList.add('peeking');
    }
    TB.sfx.kit('swish');
  }

  // ---------------------------------------------------------------- per frame

  function update(dt) {
    flyers.update(dt);
    api.player().update(dt);
    if (!M.on) return;
    if (M.dealT > 0) M.dealT -= dt;
    if (M.waitT > 0) {
      M.waitT -= dt;
      if (M.waitT <= 0) flipBack();
    }
    if (M.timerOn && !M.done && !M.timeUp && M.dealT <= 0) {
      M.time += dt;
      if (M.time >= M.limit) {
        M.timeUp = true;
        api.toast('🐢 NO RUSH! TAKE YOUR TIME', 'hint');
      }
    }
    if (M.clearT >= 0) {
      M.clearT += dt;
      if (M.clearT > 0.45 && !gridEl.classList.contains('dance')) levelClear();
      if (M.clearT > 2.6) {
        M.clearT = -1;
        api.levelDone({ level: M.level, last: M.level === LEVELS.length - 1, stars: M.stars, sessionStars: M.sessionStars });
      }
    }
  }

  function levelClear() {
    gridEl.classList.add('dance');
    const bonus = M.level + 2;
    let speedy = 0;
    if (M.timerOn && !M.timeUp) speedy = 2;
    M.stars += bonus + speedy;
    M.sessionStars += bonus + speedy;
    api.stars(bonus + speedy);
    api.toast(speedy ? `⚡ SPEEDY! +${bonus + speedy} ⭐` : `🎉 ALL PAIRS! +${bonus} ⭐`, 'super');
    TB.fx.overlay.rain(90);
    TB.sfx.fanfare();
    api.player().react('signature');
    if (M.level === LEVELS.length - 1) TB.stickers.award('cards');
    TB.buddy.leave();
  }

  // ---------------------------------------------------------------- the mode

  function enter(a) {
    api = a;
    gridEl = document.getElementById('cards');
    wrapEl = document.getElementById('cardsWrap');
    const scene = TB.stage.room;
    if (!flyers) flyers = TB.fx.flyers(scene, 40);
    const p = api.player();
    p.attach(scene, flyers);
    p.setScale(1);
    p.face = null;
    p.react('idle');
    TB.buddy.enter(mode, scene, flyers);
  }

  function start(level = 0) {
    M.on = true;
    M.level = level;
    if (level === 0) M.sessionStars = 0;
    M.stars = 0;
    M.streak = 0;
    M.bestStreak = 0;
    M.flips = 0;
    M.misses = 0;
    M.buddyPairs = 0;
    M.timerOn = !!TB.stickers.data.timer;
    help.lastT = 99;
    help.peeked = false;
    deal();
    api.player().react('hello');
  }

  function stop() {
    M.on = false;
    M.done = true;
    M.clearT = -1;
    if (gridEl) gridEl.innerHTML = '';
    M.cards = [];
    help.pair = null;
    flyers && flyers.clear();
  }

  function setTimer(on) {
    M.timerOn = on;
    M.time = 0;
    M.timeUp = false;
    TB.stickers.data.timer = on;
    TB.stickers.persist();
  }

  const mode = {
    id: 'memory',
    scene: 'room',
    enter, layout, start, update, stop, tap, buddyHelp, setTimer, sizeGrid,
    LEVELS,
    buddySpot: () => M.spots.buddy,
    buddyEntry: () => M.spots.entry,
    buddyScale: () => 1,
    get state() { return M; },
    get timeLeft() { return M.timerOn && !M.timeUp ? Math.max(0, 1 - M.time / M.limit) : 0; },
    // for tests: the faces in deal order and which are up or matched
    cards() { return M.cards.map((c) => ({ i: c.i, id: c.f.id, up: c.up, matched: c.matched })); },
    // tap every pair in turn (index pairs); returns how many taps it took
    solve() {
      let taps = 0;
      const seen = new Set();
      if (M.second) flipBack();
      if (M.first) {
        const mate = M.cards.find((x) => x !== M.first && x.f === M.first.f);
        tap(mate.i);
        taps++;
      }
      for (const c of M.cards) {
        if (c.matched || seen.has(c.f.id)) continue;
        seen.add(c.f.id);
        const mate = M.cards.find((x) => x !== c && x.f === c.f);
        if (!c.matched) { tap(c.i); taps++; }
        if (!mate.matched) { tap(mate.i); taps++; }
      }
      return taps;
    },
  };
  TB.memory = mode;
})();
