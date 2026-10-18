/* Tommy's Toy Box: the menu, the HUD, input, results, the sticker book and the main loop.
   Screens: home (pick a game and who plays, call the buddy, open the sticker book), play (Whack-a-Zombie or
   Memory Cards), results (stars and new stickers), pause, book. window.game is a test hook: see the README. */
(function () {
  'use strict';
  const TB = window.TB;
  const S = Kit.sound;
  const $ = (id) => document.getElementById(id);

  const G = { state: 'boot', mode: null, held: false, last: 0, resultsT: -1, results: null, countShown: null, next: null };
  const player = TB.makeActor();
  TB.player = player;
  let ui = null;

  // ---------------------------------------------------------------- pictures

  // Head portraits for the picker, buttons and stickers, and full-body poses for the cards and stickers.
  function makeArt() {
    const zombie = Kit.roster.get('zombie');
    const golden = { id: 'golden', look: Object.assign({}, zombie.look, { skin: '#ffd23f', hairColor: '#b07800', top: '#ffb300', bottom: '#c98a00' }) };
    const heads = Kit.portraits(Kit.roster.list.concat([golden]), { size: 160 });
    const poses = {
      tommy: ['tommy', 'peace'], teddy: ['teddy', 'boxing'], teddyshot: ['teddy', 'jumpshot'], zoom: ['zoom', 'wave'],
      luna: ['luna', 'wave'], bolt: ['bolt', 'wave'], bruno: ['bruno', 'wave'], zombie: ['zombie', 'walk'],
    };
    const bodies = {};
    for (const [key, [id, mode]] of Object.entries(poses)) {
      bodies[key] = Kit.portraits.frames(Kit.roster.get(id).look, { mode, count: 1, width: 300, height: 400 })[0];
    }
    TB.art = { heads, bodies };
  }

  // ---------------------------------------------------------------- the home screen (a mode with no game)

  const home = {
    id: 'home', scene: 'room', spots: null, flyers: null,
    enter() {
      const scene = TB.stage.room;
      if (!home.flyers) home.flyers = TB.fx.flyers(scene, 30);
      player.attach(scene, home.flyers);
      player.setScale(1);
      player.face = null;
      TB.buddy.enter(home, scene, home.flyers);
    },
    layout() {
      const W = TB.stage.W, H = TB.stage.H, wide = W / H >= 1.12;
      let px, bx;
      if (wide) {
        TB.stage.fitRoom(H - 22, Math.min(H * 0.46, W * 0.3));
        px = W * 0.11;
        bx = W * 0.25;
      } else {
        const strip = H * 0.25;
        TB.stage.fitRoom(H - 12, Math.min(strip * 0.92, W * 0.5));
        px = W * 0.3;
        bx = W * 0.6;
      }
      const X = TB.stage.roomX;
      home.spots = {
        player: { x: X(px), z: 0, face: Math.PI + 0.25 },
        buddy: { x: X(bx), z: -0.9, face: Math.PI - 0.3 },
        entry: { x: X(W + 180), z: -0.9 },
      };
      player.faceDefault = home.spots.player.face;
      player.place(home.spots.player.x, 0, 0);
    },
    update(dt) {
      home.flyers.update(dt);
      player.update(dt);
    },
    stop() {},
    buddySpot: () => (home.spots ? home.spots.buddy : { x: 2, z: 0.4, face: Math.PI }),
    buddyEntry: () => (home.spots ? home.spots.entry : { x: 12, z: 0.4 }),
    buddyScale: () => 1,
  };

  // ---------------------------------------------------------------- what the games can call

  const api = {
    player: () => player,
    playerId: () => TB.stickers.data.player,
    toast,
    gesture,
    stars(n) {
      TB.stickers.addStars(n);
    },
    flyStar,
    streakBroken() {
      const el = ui.streak;
      el.classList.remove('broke');
      void el.offsetWidth;
      el.classList.add('broke');
    },
    countdown() {
      G.countShown = null;
    },
    lastSeconds(sec) {
      bigCount(String(sec), 'small');
    },
    finish(res) {
      G.resultsT = 2.2;
      G.results = res;
    },
    levelDone(res) {
      showResults(res);
    },
    memoryHud() {
      renderLevels();
    },
  };

  // ---------------------------------------------------------------- screens

  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }

  function enterMode(m) {
    if (G.mode && G.mode !== m && G.mode.stop) G.mode.stop();
    G.mode = m;
    m.enter(api);
    document.body.dataset.screen = m.id;
  }

  function play(id, level = 0) {
    gesture();
    TB.fx.overlay.clear();
    show(ui.results, false);
    show(ui.pause, false);
    show(ui.book, false);
    const m = id === 'whack' ? TB.whack : TB.memory;
    enterMode(m);
    G.state = 'play';
    G.resultsT = -1;
    show(ui.home, false);
    show(ui.hud, true);
    show(ui.buddyBtn, true);
    show(ui.cardsWrap, id === 'memory');
    ui.hud.dataset.mode = id;
    layout();
    m.start(level);
    S.music('title');
    G.countShown = null;
  }

  function goHome() {
    TB.fx.overlay.clear();
    enterMode(home);
    G.state = 'home';
    show(ui.results, false);
    show(ui.pause, false);
    show(ui.hud, false);
    show(ui.buddyBtn, false);
    show(ui.cardsWrap, false);
    show(ui.home, true);
    ui.bigCount.className = '';
    ui.bigCount.textContent = '';
    layout();
    player.react('hello');
    refreshHome();
    S.music('title');
  }

  function pause(on) {
    if (on && G.state === 'play') {
      G.state = 'paused';
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = 'play';
      show(ui.pause, false);
      S.music('title');
    }
  }

  function refreshHome() {
    ui.homeStars.textContent = TB.stickers.data.stars;
  }

  // ---------------------------------------------------------------- who's playing

  function buildPicker() {
    ui.picker.innerHTML = '';
    for (const c of Kit.roster.list) {
      const b = document.createElement('button');
      b.className = 'pick';
      b.dataset.id = c.id;
      b.title = c.name;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.name);
      b.innerHTML = `<img alt="" draggable="false" src="${TB.art.heads[c.id]}">`;
      b.addEventListener('click', () => {
        gesture();
        pick(c.id, true);
      });
      ui.picker.appendChild(b);
    }
  }

  function pick(id, greet) {
    const d = TB.stickers.data;
    d.player = Kit.roster.get(id) ? id : 'tommy';
    TB.stickers.persist();
    player.set(d.player, 1);
    const bud = TB.buddy.setFor(d.player);
    for (const b of ui.picker.children) {
      const on = b.dataset.id === d.player;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    }
    const face = TB.art.heads[bud.id];
    ui.buddyFace.src = ui.buddyCardFace.src = ui.guardFace.src = face;
    const nice = bud.name[0] + bud.name.slice(1).toLowerCase();
    ui.buddyBtn.title = ui.buddyCard.title = `Call ${nice} (T)`;
    ui.tileA.src = TB.art.bodies[d.player === 'teddy' ? 'teddy' : bodyKey(d.player)];
    ui.tileB.src = TB.art.bodies[bodyKey(bud.id)];
    if (G.mode === home && home.spots) player.place(home.spots.player.x, 0, 0);
    if (greet) {
      player.react('hello');
      TB.sfx.kit('click');
    }
  }
  const bodyKey = (id) => (TB.art.bodies[id] ? id : 'tommy');

  // ---------------------------------------------------------------- the buddy

  function callBuddy() {
    gesture();
    if (G.state !== 'play' && G.state !== 'home') return;
    TB.buddy.call();
  }

  // ---------------------------------------------------------------- HUD

  function toast(text, cls) {
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = text;
    ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), 1650);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
  }

  function bigCount(text, cls = '') {
    const el = ui.bigCount;
    el.textContent = text;
    el.className = '';
    void el.offsetWidth;
    el.className = 'anim ' + cls;
  }

  // A ⭐ flies from (x, y) up to the star counter.
  function flyStar(x, y, n = 1, bonus) {
    const el = document.createElement('div');
    el.className = 'flystar';
    el.textContent = n > 1 || bonus ? '🌟' : '⭐';
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    document.body.appendChild(el);
    const r = ui.starPill.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${r.left + 24 - x}px, ${r.top + r.height / 2 - y}px) scale(0.6)`;
      el.style.opacity = '0.5';
    }));
    setTimeout(() => {
      el.remove();
      ui.starPill.classList.remove('bump');
      void ui.starPill.offsetWidth;
      ui.starPill.classList.add('bump');
    }, 640);
  }

  const cache = {};
  function setText(el, key, v) {
    if (cache[key] !== v) {
      cache[key] = v;
      el.textContent = v;
    }
  }

  function renderLevels() {
    const M = TB.memory.state;
    ui.levels.innerHTML = TB.memory.LEVELS.map((L, i) => `<span class="dot ${i < M.level ? 'done' : i === M.level ? 'now' : ''}">${i < M.level ? '✓' : ''}</span>`).join('');
  }

  function updateHud() {
    if (G.state === 'home') {
      ui.buddyCard.classList.toggle('guarding', TB.buddy.on);
      return;
    }
    const m = G.mode;
    if (!m || m === home) return;
    const whack = m === TB.whack;
    const st = m.state;
    setText(ui.starCount, 'stars', String(whack ? st.stars : st.sessionStars));
    const streak = st.streak;
    setText(ui.streakCount, 'streak', String(streak));
    ui.streak.classList.toggle('off', streak < 2);
    if (whack) {
      ui.clock.style.display = '';
      ui.timerBtn.style.display = 'none';
      ui.levels.style.display = 'none';
      ui.clockFill.style.transform = `scaleX(${st.left / 60})`;
      ui.clock.classList.toggle('hurry', st.left <= 10 && !st.over);
      // 3, 2, 1, GO!
      const c = st.count;
      const n = c > 0 ? Math.ceil(c - 0.2) : -1;
      if (n !== G.countShown) {
        G.countShown = n;
        if (n > 0) {
          bigCount(String(n));
          TB.sfx.tick();
        } else if (n === 0) {
          bigCount('GO!', 'go');
          TB.sfx.go();
        }
      }
    } else {
      ui.levels.style.display = '';
      ui.timerBtn.style.display = '';
      ui.timerBtn.classList.toggle('off', !st.timerOn);
      const left = TB.memory.timeLeft;
      ui.clock.style.display = st.timerOn && !st.timeUp ? '' : 'none';
      ui.clockFill.style.transform = `scaleX(${left})`;
      ui.clock.classList.toggle('hurry', st.timerOn && left < 0.2);
    }
    const g = TB.buddy.guardLeft;
    ui.guard.classList.toggle('on', g > 0);
    ui.guardFill.style.transform = `scaleX(${g})`;
    ui.buddyBtn.classList.toggle('guarding', g > 0);
  }

  // ---------------------------------------------------------------- results

  function showResults(res) {
    G.state = 'results';
    G.results = res;
    const whack = res.game === 'whack';
    const last = whack || res.last;
    ui.rHead.textContent = whack ? '🎉' : last ? '🏆' : '🎉';
    ui.rLevels.innerHTML = whack ? '' : TB.memory.LEVELS.map((L, i) => `<span class="dot ${i <= res.level ? 'done' : ''}"></span>`).join('');
    const total = whack ? res.stars : last ? res.sessionStars : res.stars;
    countUp(ui.rStars, total);
    ui.rStickers.innerHTML = '';
    const fresh = TB.stickers.takePending();
    fresh.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'newst stk';
      d.style.animationDelay = `${0.6 + i * 0.4}s`;
      d.innerHTML = TB.stickers.pictureHTML(s);
      ui.rStickers.appendChild(d);
      setTimeout(() => TB.sfx.sticker(), 600 + i * 400);
    });
    G.next = whack ? () => play('whack') : res.last ? () => play('memory', 0) : () => play('memory', res.level + 1);
    show(ui.results, true);
    if (fresh.length) setTimeout(() => TB.fx.overlay.rain(60), 500);
  }

  function countUp(el, to) {
    const t0 = performance.now(), dur = Math.min(1200, 200 + to * 40);
    el.textContent = '0';
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      el.textContent = String(Math.round(to * k));
      if (k < 1) setTimeout(tick, 30);
    };
    tick();
  }

  // ---------------------------------------------------------------- the sticker book

  function openBook() {
    gesture();
    TB.stickers.renderBook(ui.bookBody);
    G.bookFrom = G.state;
    if (G.state === 'play') G.state = 'paused';
    show(ui.book, true);
    TB.sfx.kit('click');
  }
  function closeBook() {
    show(ui.book, false);
    if (G.bookFrom === 'play') G.state = 'play';
    refreshHome();
  }

  // ---------------------------------------------------------------- layout

  function layout() {
    TB.stage.resize();
    TB.fx.overlay.resize();
    const W = TB.stage.W, H = TB.stage.H;
    if (!G.mode) return;
    const top = ui.hudtop.getBoundingClientRect();
    const m = { t: top.top + top.height + 6, l: 12, r: 12, b: 12 };
    if (G.mode === TB.whack) m.b = 10;
    if (W < 2 || H < 2) return;
    G.mode.layout(m);
  }

  // ---------------------------------------------------------------- input

  let audioReady = false;
  function gesture() {
    if (!audioReady) {
      audioReady = true;
      S.init();
      S.music('title');
    } else S.init();
  }

  function tapButton(el, fn) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      gesture();
      fn();
    });
  }

  function bindInput() {
    ui.canvas.addEventListener('pointerdown', (e) => {
      gesture();
      if (G.state === 'play' && G.mode === TB.whack) TB.whack.tap(e.clientX, e.clientY);
    });
    tapButton(ui.goWhack, () => play('whack'));
    tapButton(ui.goMemory, () => play('memory', 0));
    tapButton(ui.bookBtn, openBook);
    tapButton(ui.bookClose, closeBook);
    tapButton(ui.buddyCard, callBuddy);
    ui.buddyBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      callBuddy();
    });
    tapButton(ui.homeBtn, () => pause(true));
    tapButton(ui.pResume, () => pause(false));
    tapButton(ui.pHome, goHome);
    tapButton(ui.rAgain, () => G.next && G.next());
    tapButton(ui.rHome, goHome);
    tapButton(ui.rBook, openBook);
    tapButton(ui.muteBtn, toggleMute);
    tapButton(ui.timerBtn, () => {
      TB.memory.setTimer(!TB.memory.state.timerOn);
      TB.sfx.kit('click');
      toast(TB.memory.state.timerOn ? '⏱️ TIMER ON' : '⏱️ TIMER OFF', 'hint');
    });
    ui.book.addEventListener('click', (e) => {
      if (e.target === ui.book) closeBook();
    });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      gesture();
      const k = e.key.toLowerCase();
      if (!ui.book.classList.contains('hidden')) {
        if (k === 'escape' || k === 'b' || k === 'enter') closeBook();
        return;
      }
      if (k === 't') callBuddy();
      else if (k === 'm') toggleMute();
      else if (G.state === 'home') {
        if (k === '1') play('whack');
        else if (k === '2') play('memory', 0);
        else if (k === 'b') openBook();
        else if (k === 'arrowleft' || k === 'arrowright') {
          const list = Kit.roster.list, i = list.findIndex((c) => c.id === TB.stickers.data.player);
          pick(list[(i + (k === 'arrowleft' ? list.length - 1 : 1)) % list.length].id, true);
        }
      } else if (G.state === 'play' && (k === 'escape' || k === 'p')) pause(true);
      else if (G.state === 'paused' && (k === 'escape' || k === 'p' || k === 'enter' || k === ' ')) pause(false);
      else if (G.state === 'results') {
        if (k === 'enter' || k === ' ') G.next && G.next();
        else if (k === 'escape') goHome();
      }
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop

  function step(dt) {
    dt = Math.min(dt, 0.1);
    // the window can start at 0 x 0 (a hidden tab) and resize without an event reaching us: re-fit when it changes
    if ((innerWidth || 1) !== TB.stage.W || (innerHeight || 1) !== TB.stage.H) layout();
    if (G.state === 'play' || G.state === 'results' || G.state === 'home') {
      G.mode.update(dt);
      TB.buddy.update(dt);
      if (G.resultsT > 0) {
        G.resultsT -= dt;
        if (G.resultsT <= 0 && G.state === 'play') showResults(G.results);
      }
    }
    TB.fx.overlay.update(dt);
    updateHud();
    TB.stage.render(G.mode ? G.mode.scene : 'room');
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    ui = {
      canvas: $('game'), home: $('home'), hud: $('hud'), hudtop: document.querySelector('.hudtop'), picker: $('picker'),
      goWhack: $('goWhack'), goMemory: $('goMemory'), bookBtn: $('bookBtn'), homeStars: $('homeStars'), buddyCard: $('buddyCard'),
      buddyCardFace: $('buddyCardFace'), buddyBtn: $('buddyBtn'), buddyFace: $('buddyFace'), guard: $('guard'), guardFace: $('guardFace'),
      guardFill: $('guardFill'), clock: $('clock'), clockFill: $('clockFill'), levels: $('levels'), timerBtn: $('timerBtn'),
      starPill: $('starPill'), starCount: $('starCount'), streak: $('streak'), streakCount: $('streakCount'), muteBtn: $('muteBtn'),
      homeBtn: $('homeBtn'), toasts: $('toasts'), bigCount: $('bigCount'), results: $('results'), rHead: $('rHead'), rLevels: $('rLevels'),
      rStars: $('rStars'), rStickers: $('rStickers'), rAgain: $('rAgain'), rBook: $('rBook'), rHome: $('rHome'), pause: $('pause'),
      pResume: $('pResume'), pHome: $('pHome'), book: $('book'), bookBody: $('bookBody'), bookClose: $('bookClose'),
      cardsWrap: $('cardsWrap'), tileZombie: $('tileZombie'), tileA: $('tileA'), tileB: $('tileB'), logo: $('logo'),
    };
    const words = window.TB_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.slice(0, -2).join(' ');
    ui.logo.querySelector('big').textContent = words.slice(-2).join(' ');
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    TB.stage.init(ui.canvas);
    TB.fx.overlay.init($('fx'));
    makeArt();
    ui.tileZombie.src = TB.art.heads.zombie;
    TB.buddy.init({ toast, player: () => player, savedAt: (x, y) => TB.fx.overlay.burst(x, y, 18, ['🛡️', '⭐', '💪']) });
    buildPicker();
    bindInput();
    pick(TB.stickers.data.player, false);
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  window.game = {
    // advance `secs` of game time in 1/60 s steps, rendering once at the end (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    start(id, opts = {}) {
      if (opts.player) pick(opts.player, false);
      play(id, opts.level || 0);
      return game.info();
    },
    home: () => goHome(),
    pick: (id) => pick(id, true),
    buddy: () => (callBuddy(), TB.buddy.info()),
    pause: (on = true) => pause(on),
    openBook, closeBook,
    again: () => G.next && G.next(),
    tap: (x, y) => TB.whack.tap(x, y),
    bot(on = true) { TB.whack.auto = on; },
    info() {
      const m = G.mode;
      const st = m && m.state ? m.state : {};
      return {
        state: G.state, mode: m && m.id, player: TB.stickers.data.player, buddy: TB.buddy.info(),
        stars: m === TB.whack ? st.stars : m === TB.memory ? st.sessionStars : undefined, streak: st.streak,
        totalStars: TB.stickers.data.stars, stickers: TB.stickers.ALL.filter((s) => TB.stickers.has(s.id)).map((s) => s.id),
        results: !ui.results.classList.contains('hidden'),
      };
    },
    get whack() { return TB.whack; },
    get memory() { return TB.memory; },
    get stickers() { return TB.stickers; },
    get G() { return G; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
