/* Tommy's Toy Box: Whack-a-Zombie (打地鼠).
   Silly cartoon zombie heads (the Kit.roster zombie look, with rosy cheeks, a tongue and sometimes a party hat or a
   flower) pop up from 9 holes in the garden. Tap one to bonk it with a soft squeaky hammer: BONK!, stars, dizzy ⭐.
     zombie  +1 ⭐        golden zombie (now and then) +3 ⭐
     friends (Bruno the bear, Bolt the robot, with a 💖): don't bonk them! Leave them and they wave bye (+1 ⭐).
   A round is 60 s and speeds up gently. 5 bonks in a row is a SUPER (+1 ⭐). A zombie that gets away or a bonked
   friend ends the streak, but nothing is ever taken away, and while the buddy is here it doesn't even do that.
   The buddy jogs over and bonks zombies himself (Teddy with boxing jabs, Tommy with an overhead swing). */
(function () {
  'use strict';
  const T = THREE;
  const TB = (window.TB = window.TB || {});
  const { rand, pick, std, makeCanvas, toTexture, emojiTexture, glowTexture } = Kit.gfx;

  const ROUND = 60;
  const SX = 2.7, SZ = 2.35; // hole spacing (x across, z toward the camera)
  const DOWN = -2.4; // body height when hidden in the hole (party hat and all)
  const HEAD_Y = 1.06; // head centre above the ground when fully up
  const ELEV = 0.7; // camera elevation (radians)
  const STREAK_SUPER = 5;
  const SIZE = 1.3; // the characters are a bit bigger out here, next to the big heads

  let api = null, flyers = null, bursts = null, built = false;
  const scene = TB.stage.garden;
  const holes = [];
  const templates = {};
  const hammers = [];
  const G = {
    on: false, over: false, time: 0, left: ROUND, stars: 0, streak: 0, bestStreak: 0, spawnT: 1.2, count: -1,
    bonks: 0, buddyBonks: 0, escaped: 0, golden: 0, friendsSafe: 0, friendsBonked: 0, spawned: 0, lastHoles: [],
    layout: 'wide', auto: false, autoT: 0, lastTick: 99,
  };
  const help = { hole: null, next: 0, hitAt: -1, jab: 0 };
  const tmp = new T.Vector3(), scr = { x: 0, y: 0 };

  // ---------------------------------------------------------------- building

  function headOf(look) {
    const p = Kit.people.build(look);
    const h = p.head;
    h.parent.remove(h);
    h.position.set(0, 0, 0);
    h.rotation.set(0, 0, 0);
    return h;
  }

  function hatTexture() {
    const [c, g] = makeCanvas(64, 64);
    const cols = ['#ff6f91', '#ffd23f', '#3fb8ff', '#3fe0b0'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cols[i % 4];
      g.fillRect(i * 8, 0, 8, 64);
    }
    return toTexture(c);
  }

  // One popper: shoulders, neck, a big head facing the camera and two arms, all inside `body`, which slides up out of
  // the hole. Heads are 1.5x so they're big targets.
  function buildPopper(kind) {
    const entry = Kit.roster.get(kind === 'golden' ? 'zombie' : kind);
    const look = entry.look;
    const g = new T.Group();
    const body = new T.Group();
    body.name = 'body';
    g.add(body);
    const shirt = std(look.top), skin = std(look.skin, look.head === 'robot' ? { metalness: 0.5, roughness: 0.35 } : {});
    const box = (w, h, d, m, x, y, z, parent) => {
      const b = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      parent.add(b);
      return b;
    };
    box(1.05, 0.56, 0.64, shirt, 0, 0.28, 0, body);
    box(0.36, 0.16, 0.36, skin, 0, 0.6, 0, body);
    const head = headOf(look);
    head.name = 'head';
    head.scale.setScalar(1.7);
    head.position.y = HEAD_Y;
    head.rotation.y = Math.PI; // face the camera
    body.add(head);
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.name = side < 0 ? 'armL' : 'armR';
      arm.position.set(side * 0.62, 0.44, 0);
      box(0.24, 0.24, 0.44, shirt, 0, 0, 0.22, arm);
      box(0.2, 0.2, 0.2, skin, 0, 0, 0.52, arm);
      body.add(arm);
      arms.push(arm);
    }
    if (kind === 'zombie' || kind === 'golden') {
      // silly, not scary: rosy cheeks and a tongue poking out
      const pink = std('#ff9bb0'), tongue = std('#ff5d86');
      box(0.09, 0.045, 0.02, pink, -0.19, -0.06, -0.238, head);
      box(0.09, 0.045, 0.02, pink, 0.19, -0.06, -0.238, head);
      box(0.08, 0.11, 0.03, tongue, 0.07, -0.19, -0.24, head);
      // party hat and flower (switched on per pop)
      const hat = new T.Mesh(new T.ConeGeometry(0.15, 0.34, 14), std('#ffffff', { map: hatTexture() }));
      hat.name = 'hat';
      hat.position.set(-0.08, 0.48, 0.02);
      hat.rotation.z = 0.25;
      head.add(hat);
      const pom = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), std('#ffffff'));
      pom.position.y = 0.19;
      hat.add(pom);
      const flower = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('🌼'), depthWrite: false, transparent: true }));
      flower.name = 'flower';
      flower.scale.setScalar(0.26);
      flower.position.set(0.17, 0.36, -0.12);
      head.add(flower);
    } else {
      // a friend: a heart floats over his head
      const heart = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('💖'), depthWrite: false, transparent: true }));
      heart.name = 'heart';
      heart.scale.setScalar(0.62);
      heart.position.set(0.72, 1.55, 0.25); // beside his head, so it can't look like it belongs to the row behind
      body.add(heart);
    }
    if (kind === 'golden') {
      // gold all over, darker where the features are so the face still reads
      const cache = new Map();
      g.traverse((o) => {
        if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
        if (!cache.has(o.material)) {
          const c = o.material.color;
          const lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
          const gold = new T.Color('#ffc928').multiplyScalar(0.35 + 0.85 * Math.min(1, lum * 1.4));
          cache.set(o.material, std('#ffffff', { color: gold, metalness: 0.6, roughness: 0.3, emissive: new T.Color('#5a3c00'), emissiveIntensity: 0.6 }));
        }
        o.material = cache.get(o.material);
      });
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: '#ffe066', blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
      glow.name = 'glow';
      glow.scale.setScalar(2.6);
      glow.position.set(0, HEAD_Y, -0.2);
      body.add(glow);
    }
    return g;
  }

  // A soft squeaky toy hammer: red head with yellow caps on a blue handle. It swings from up and to the right of the
  // camera down onto a hole.
  function buildHammer() {
    const pivot = new T.Group();
    const swing = new T.Group();
    pivot.add(swing);
    const L = 1.7;
    const handle = new T.Mesh(new T.CylinderGeometry(0.075, 0.09, L, 10), std('#3fb8ff', { roughness: 0.5 }));
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -L / 2;
    swing.add(handle);
    const head = new T.Group();
    head.position.z = -L;
    swing.add(head);
    const red = std('#ff5a6e', { roughness: 0.45 }), yellow = std('#ffd84a', { roughness: 0.45 });
    const cyl = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.78, 20), red);
    cyl.rotation.z = Math.PI / 2;
    head.add(cyl);
    for (const s of [-1, 1]) {
      const cap = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.1, 20), yellow);
      cap.rotation.z = Math.PI / 2;
      cap.position.x = s * 0.42;
      head.add(cap);
    }
    const shine = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), new T.MeshBasicMaterial({ color: '#ffffff' }));
    shine.position.set(-0.1, 0.25, 0.22);
    head.add(shine);
    pivot.visible = false;
    pivot.renderOrder = 10;
    scene.add(pivot);
    return { pivot, swing, L, t: -1, yaw: 0.55, elev: 0.75 };
  }

  function build() {
    if (built) return;
    built = true;
    flyers = TB.fx.flyers(scene, 90);
    bursts = TB.fx.bursts(scene, 6);
    const ringMat = std('#8a5a32', { roughness: 1 });
    const holeMat = new T.MeshBasicMaterial({ color: '#2a1a10' });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = (c - 1) * SX, z = (r - 1) * SZ;
        const hole = new T.Mesh(new T.CircleGeometry(0.78, 28), holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(x, 0.015, z);
        scene.add(hole);
        const ring = new T.Mesh(new T.TorusGeometry(0.86, 0.17, 8, 28), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.scale.z = 0.55;
        ring.position.set(x, 0.03, z);
        scene.add(ring);
        holes.push({ i: holes.length, x, z, pop: null, pool: {} });
      }
    }
    for (const k of ['zombie', 'golden', 'bruno', 'bolt']) templates[k] = buildPopper(k);
    for (let i = 0; i < 3; i++) hammers.push(buildHammer());
  }

  function popperFor(hole, kind) {
    if (!hole.pool[kind]) {
      const g = templates[kind].clone(true);
      g.position.set(hole.x, 0, hole.z);
      g.visible = false;
      scene.add(g);
      hole.pool[kind] = {
        g, body: g.getObjectByName('body'), head: g.getObjectByName('head'), armL: g.getObjectByName('armL'),
        armR: g.getObjectByName('armR'), hat: g.getObjectByName('hat'), flower: g.getObjectByName('flower'),
        heart: g.getObjectByName('heart'), glow: g.getObjectByName('glow'),
      };
    }
    return hole.pool[kind];
  }

  // ---------------------------------------------------------------- layout

  // Where the player and the buddy stand: beside the garden on a wide screen, behind it on a tall one.
  function spots() {
    const wide = TB.stage.W / TB.stage.H >= 1.05;
    G.layout = wide ? 'wide' : 'tall';
    return wide
      ? { player: { x: -6.2, z: 0.6, face: Math.PI + 0.45 }, buddy: { x: 6.2, z: 0.6, face: Math.PI - 0.45 }, entry: { x: 15, z: 0.6 } }
      : { player: { x: -1.35, z: -4.5, face: Math.PI + 0.15 }, buddy: { x: 1.35, z: -4.5, face: Math.PI - 0.15 }, entry: { x: 10, z: -4.5 } };
  }

  function layout(m) {
    build();
    const s = spots();
    const pts = [];
    const hx = SX + 0.95, hz = SZ + 0.95;
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) pts.push(new T.Vector3(x, 0, z), new T.Vector3(x, HEAD_Y + 0.9, z));
    for (const sp of [s.player, s.buddy]) {
      pts.push(new T.Vector3(sp.x - 1.0, 0, sp.z + 0.5), new T.Vector3(sp.x + 1.0, 0, sp.z + 0.5), new T.Vector3(sp.x, 2.6 * SIZE, sp.z));
    }
    TB.stage.fitGarden(pts, G.layout === 'wide' ? ELEV : ELEV + 0.2, m); // a tall screen looks down a bit more
    const p = api.player();
    p.faceDefault = s.player.face;
    if (!p.moving) p.place(s.player.x, 0, s.player.z);
  }

  // ---------------------------------------------------------------- the round

  function enter(a) {
    api = a;
    build();
    const p = api.player();
    p.attach(scene, flyers);
    p.setScale(SIZE);
    p.face = null;
    p.react('idle');
    TB.buddy.enter(mode, scene, flyers);
  }

  function start() {
    for (const h of holes) hide(h);
    flyers.clear();
    bursts.clear();
    Object.assign(G, {
      on: true, over: false, time: 0, left: ROUND, stars: 0, streak: 0, bestStreak: 0, spawnT: 0.6, count: 3.2,
      bonks: 0, buddyBonks: 0, escaped: 0, golden: 0, friendsSafe: 0, friendsBonked: 0, spawned: 0, lastHoles: [], lastTick: 99,
    });
    Object.assign(help, { hole: null, next: 0, hitAt: -1, jab: 0 });
    const s = spots();
    api.player().place(s.player.x, 0, s.player.z);
    api.player().react('hello');
    api.countdown();
  }

  function hide(h) {
    if (h.pop) h.pop.p.g.visible = false;
    h.pop = null;
  }

  const lerp = (a, b, k) => a + (b - a) * k;

  function spawn(kind, holeIx, upT) {
    const free = holes.filter((h) => !h.pop && (holeIx !== undefined || !G.lastHoles.includes(h.i)));
    const h = holeIx !== undefined ? holes[holeIx] : pick(free.length ? free : holes.filter((x) => !x.pop));
    if (!h || h.pop) return null;
    const p = popperFor(h, kind);
    const k = Math.min(1, G.time / ROUND);
    p.g.visible = true;
    p.body.position.y = DOWN;
    p.body.scale.set(1, 1, 1);
    p.body.rotation.set(0, 0, 0);
    p.head.rotation.z = 0;
    if (p.hat) {
      const r = Math.random();
      p.hat.visible = r < 0.33;
      p.flower.visible = r >= 0.33 && r < 0.6;
    }
    h.pop = { kind, p, state: 'rise', t: 0, upT: upT || lerp(1.9, 1.1, k) * rand(0.9, 1.15), ph: rand(0, 6), stars: [] };
    G.lastHoles.push(h.i);
    if (G.lastHoles.length > 2) G.lastHoles.shift();
    G.spawned++;
    TB.sfx.pop();
    return h;
  }

  function spawner(dt) {
    G.spawnT -= dt;
    if (G.spawnT > 0) return;
    const k = Math.min(1, G.time / ROUND);
    G.spawnT = lerp(1.15, 0.62, k) * rand(0.8, 1.2);
    const up = holes.filter((h) => h.pop && h.pop.state !== 'gone');
    const maxUp = G.time < 12 ? 2 : 3;
    if (up.length >= maxUp) return;
    let kind = 'zombie';
    const friendUp = up.some((h) => h.pop.kind === 'bruno' || h.pop.kind === 'bolt');
    const goldUp = up.some((h) => h.pop.kind === 'golden');
    const r = Math.random();
    if (G.time > 6 && !friendUp && r < 0.15) kind = Math.random() < 0.65 ? 'bruno' : 'bolt';
    else if (G.time > 10 && !goldUp && r > 0.92) kind = 'golden';
    spawn(kind);
  }

  const easeOutBack = (u) => 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2);
  const isFriend = (k) => k === 'bruno' || k === 'bolt';

  function updatePoppers(dt) {
    for (const h of holes) {
      const pop = h.pop;
      if (!pop) continue;
      const p = pop.p;
      pop.t += dt;
      pop.ph += dt;
      if (pop.state === 'rise') {
        const u = Math.min(1, pop.t / 0.22);
        p.body.position.y = DOWN * (1 - easeOutBack(u));
        if (u >= 1) setState(pop, 'up');
      } else if (pop.state === 'up') {
        p.body.position.y = Math.sin(pop.ph * 5) * 0.04;
        p.body.rotation.z = Math.sin(pop.ph * 3.2) * 0.1;
        if (pop.t >= pop.upT && !G.over) setState(pop, 'fall');
      } else if (pop.state === 'fall') {
        const u = Math.min(1, pop.t / 0.24);
        p.body.position.y = DOWN * u * u;
        p.body.rotation.z *= 0.9;
        if (u >= 1) {
          if (!G.over) (isFriend(pop.kind) ? friendSafe : escaped)(h);
          hide(h);
          continue;
        }
      } else if (pop.state === 'bonked' || pop.state === 'oops') {
        // squash, hold dizzy for a moment, then sink
        const sq = Math.max(0, 1 - pop.t / 0.14);
        p.body.scale.set(1 + 0.25 * sq, 1 - 0.3 * sq, 1 + 0.25 * sq);
        const hold = pop.state === 'oops' ? 0.6 : 0.42;
        if (pop.state === 'oops') p.head.rotation.z = Math.sin(pop.t * 18) * 0.2 * Math.max(0, 1 - pop.t / hold);
        const u = Math.max(0, (pop.t - hold) / 0.4);
        p.body.position.y = DOWN * Math.min(1, u * u);
        for (let i = 0; i < pop.stars.length; i++) {
          const f = pop.stars[i];
          const a = pop.t * 6 + (i * Math.PI * 2) / pop.stars.length;
          f.s.position.set(h.x + Math.cos(a) * 0.55, p.body.position.y + HEAD_Y + 0.75, h.z + Math.sin(a) * 0.35);
          f.age = Math.min(f.age, 0.2);
        }
        if (u >= 1) {
          pop.stars.forEach((f) => (f.s.visible = false));
          hide(h);
          continue;
        }
      }
      // arms: zombies reach and bob, friends wave
      if (isFriend(pop.kind)) {
        p.armR.rotation.x = -2.4;
        p.armR.rotation.z = Math.sin(pop.ph * 9) * 0.45;
        p.armL.rotation.x = -0.2;
        if (p.heart) p.heart.position.y = 1.55 + Math.sin(pop.ph * 4) * 0.08;
      } else {
        p.armL.rotation.x = -0.15 + Math.sin(pop.ph * 6) * 0.15;
        p.armR.rotation.x = -0.15 - Math.sin(pop.ph * 6) * 0.15;
        if (p.glow) p.glow.material.opacity = 0.6 + Math.sin(pop.ph * 8) * 0.25;
        if (pop.kind === 'golden' && Math.random() < dt * 6) {
          flyers.add('✨', h.x + rand(-0.6, 0.6), p.body.position.y + HEAD_Y + rand(-0.3, 0.6), h.z + 0.4, 0, 0.6, 0.35, 0.6, 0, 0);
        }
      }
    }
  }

  function setState(pop, s) {
    pop.state = s;
    pop.t = 0;
  }

  // ---------------------------------------------------------------- bonking

  // The popper under a screen point (the nearest head within reach), or null. With `any`, the nearest hole too.
  function holeAt(sx, sy, any) {
    const cam = TB.stage.gardenCam;
    // how far apart neighbouring holes look on screen sets the reach
    const a = TB.stage.toScreen(tmp.set(-SX / 2, HEAD_Y * 0.7, 0), cam, {});
    const b = TB.stage.toScreen(tmp.set(SX / 2, HEAD_Y * 0.7, 0), cam, {});
    const reach = Math.max(48, Math.hypot(b.x - a.x, b.y - a.y) * 0.62);
    let best = null, bestD = Infinity, near = null, nearD = Infinity;
    for (const h of holes) {
      const y = h.pop ? Math.max(0.2, h.pop.p.body.position.y + HEAD_Y * 0.8) : 0.5;
      TB.stage.toScreen(tmp.set(h.x, y, h.z), cam, scr);
      const d = Math.hypot(scr.x - sx, (scr.y - sy) * 0.9);
      const live = h.pop && (h.pop.state === 'up' || h.pop.state === 'rise' || (h.pop.state === 'fall' && h.pop.t < 0.14));
      if (live && d < reach && d < bestD) {
        best = h;
        bestD = d;
      }
      if (d < nearD) {
        near = h;
        nearD = d;
      }
    }
    if (best) return best;
    return any && nearD < reach * 1.3 ? near : null;
  }

  function tap(sx, sy) {
    if (!G.on || G.over || G.count > 0) return null;
    const h = holeAt(sx, sy, true);
    if (!h) return null;
    swingHammer(h);
    if (h.pop && h.pop.state !== 'bonked' && h.pop.state !== 'oops') return hit(h, 'you');
    TB.sfx.whiff();
    return 'whiff';
  }

  function swingHammer(h) {
    const hm = hammers.find((x) => x.t < 0) || hammers[0];
    const topY = (h.pop ? Math.max(0, h.pop.p.body.position.y) : -HEAD_Y) + HEAD_Y + 0.45 + 0.34;
    const L = hm.L, A = hm.elev, yaw = hm.yaw;
    hm.pivot.position.set(h.x + L * Math.cos(A) * Math.sin(yaw), topY + L * Math.sin(A), h.z + L * Math.cos(A) * Math.cos(yaw));
    hm.pivot.rotation.set(0, yaw, 0);
    hm.pivot.visible = true;
    hm.pivot.scale.setScalar(1);
    hm.t = 0;
    hm.target = h;
    updateHammer(hm, 0);
  }

  function updateHammer(hm, dt) {
    if (hm.t < 0) return;
    hm.t += dt;
    const t = hm.t, A = hm.elev;
    let a;
    if (t < 0.07) a = -A + 1.3 * (1 - t / 0.07);
    else if (t < 0.17) a = -A;
    else a = -A + Math.min(1, (t - 0.17) / 0.2) * 0.9;
    hm.swing.rotation.x = a;
    const fade = t > 0.25 ? Math.max(0, 1 - (t - 0.25) / 0.15) : 1;
    hm.pivot.scale.setScalar(0.4 + 0.6 * fade);
    if (t > 0.4) {
      hm.t = -1;
      hm.pivot.visible = false;
    }
  }

  // Something got bonked, by 'you' or by the 'buddy'.
  function hit(h, by) {
    const pop = h.pop;
    const headY = Math.max(0, pop.p.body.position.y) + HEAD_Y;
    if (isFriend(pop.kind)) {
      setState(pop, 'oops');
      G.friendsBonked++;
      TB.sfx.oops();
      bursts.add('OOPS!', h.x, headY + 0.9, h.z + 0.5, 1.7, '#ffc2d6', '#ff5d86');
      flyers.add('🤕', h.x + 0.5, headY + 0.6, h.z + 0.6, 0.3, 1.2, 0.55, 0.9, 0, 0.5);
      api.player().react('oops');
      breakStreak(h, headY);
      return 'oops';
    }
    setState(pop, 'bonked');
    const golden = pop.kind === 'golden';
    const gain = golden ? 3 : 1;
    G.bonks++;
    if (by === 'buddy') G.buddyBonks++;
    if (golden) {
      G.golden++;
      TB.stickers.award('golden');
    }
    G.streak++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    if (G.streak >= 10) TB.stickers.award('fire');
    addStars(gain, h, headY);
    if (by === 'buddy') {
      TB.sfx.kit('punch');
      TB.sfx.squeak();
    } else TB.sfx.bonk();
    if (golden) TB.sfx.golden();
    bursts.add(golden ? 'WOW!' : by === 'buddy' ? 'POW!' : 'BONK!', h.x, headY + 0.95, h.z + 0.5, golden ? 2.0 : 1.7, golden ? '#ffe680' : '#ffd400');
    for (let i = 0; i < (golden ? 10 : 5); i++) {
      flyers.add('⭐', h.x, headY + 0.3, h.z + 0.5, rand(-2.5, 2.5), rand(2.5, 5), rand(0.35, 0.5), 0.8, rand(-4, 4), 9);
    }
    pop.stars = [0, 1, 2].map(() => flyers.add('💫', h.x, headY + 0.7, h.z, 0, 0, 0.42, 9, 0, 0));
    const p = api.player();
    if (G.streak % STREAK_SUPER === 0) {
      addStars(1, h, headY, true);
      api.toast(`🔥 ${G.streak} IN A ROW! SUPER!`, 'super');
      p.react('signature');
      TB.sfx.kit('powerup');
    } else if (golden) {
      api.toast('✨ GOLDEN ZOMBIE! +3 ⭐', 'gold');
      p.react('signature');
    } else p.react('hop');
    return golden ? 'golden' : 'bonk';
  }

  function addStars(n, h, headY, bonus) {
    G.stars += n;
    api.stars(n);
    TB.stage.toScreen(tmp.set(h.x, headY, h.z), TB.stage.gardenCam, scr);
    api.flyStar(scr.x, scr.y, n, bonus);
  }

  function breakStreak(h, headY) {
    if (TB.buddy.guarding()) {
      TB.stage.toScreen(tmp.set(h.x, headY, h.z), TB.stage.gardenCam, scr);
      TB.buddy.saved(scr.x, scr.y);
      return;
    }
    if (G.streak > 0) api.streakBroken();
    G.streak = 0;
  }

  function escaped(h) {
    G.escaped++;
    flyers.add('😜', h.x, 0.9, h.z + 0.5, 0, 1.4, 0.6, 0.8, 0, 0.6);
    breakStreak(h, 0.6);
  }

  function friendSafe(h) {
    G.friendsSafe++;
    TB.sfx.friendBye();
    for (let i = 0; i < 4; i++) flyers.add('💖', h.x + rand(-0.4, 0.4), 1.2, h.z + 0.4, rand(-1, 1), rand(1.5, 2.6), 0.45, 0.9, 0, 1);
    addStars(1, h, 0.9);
    const d = TB.stickers.data;
    d.friends = (d.friends || 0) + 1;
    TB.stickers.persist();
    if (d.friends >= 10) TB.stickers.award('friends');
  }

  // ---------------------------------------------------------------- the buddy's help

  // A little squeaky hammer in the buddy's hand while he swings (Tommy; Teddy uses his fists).
  let mini = null;
  function miniHammer(a) {
    if (!mini) {
      mini = new T.Group();
      const handle = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.5, 8), std('#3fb8ff'));
      handle.position.y = -0.25;
      mini.add(handle);
      const head = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.32, 14), std('#ff5a6e'));
      head.rotation.z = Math.PI / 2;
      head.position.y = -0.52;
      mini.add(head);
      mini.rotation.x = -Math.PI / 2; // sticks out forward from the fist
    }
    if (mini.parent !== a.person.armR) {
      a.person.armR.add(mini);
      mini.position.set(0, -0.7, -0.05);
    }
    return mini;
  }

  // He picks the zombie that's been up the longest, jogs next to its hole and bonks it, about once a second.
  function buddyHelp(dt, b) {
    const a = b.actor, t = b.t;
    if (b.busy) return;
    if (help.hole) {
      const h = help.hole;
      const ok = h.pop && !isFriend(h.pop.kind) && (h.pop.state === 'up' || h.pop.state === 'rise');
      if (help.hitAt >= 0) {
        if (t >= help.hitAt) {
          help.hitAt = -1;
          if (ok) hit(h, 'buddy');
          help.hole = null;
          help.next = t + 0.55;
        }
        return;
      }
      if (!ok) {
        help.hole = null;
        a.lean = 0;
        return;
      }
      if (!a.moving) {
        // in place: face the hole and punch (Teddy) or swing (Tommy)
        a.face = Math.atan2(-(h.x - a.root.position.x), -(h.z - a.root.position.z));
        if (b.entry.id === 'teddy') {
          help.jab++;
          a.lean = 0.3;
          a.act(help.jab % 2 ? 'jab' : 'straight', 0.32, 0, true);
          help.hitAt = t + 0.12;
        } else {
          miniHammer(a).visible = true;
          a.act('swing', 0.42, 0, true);
          help.hitAt = t + 0.26;
        }
      } else if (h.pop.state === 'up' && h.pop.t > h.pop.upT - 0.05) {
        h.pop.upT += dt; // he's on his way: it waits for him
      }
      return;
    }
    if (t < help.next || G.over) return;
    let best = null;
    for (const h of holes) {
      if (!h.pop || isFriend(h.pop.kind) || h.pop.state !== 'up') continue;
      if (!best || h.pop.upT - h.pop.t < best.pop.upT - best.pop.t) best = h;
    }
    if (!best) {
      a.lean = 0;
      return;
    }
    help.hole = best;
    const side = a.root.position.x >= best.x ? 1 : -1;
    a.face = null;
    a.lean = 0;
    a.moveTo(best.x + side * 1.05 * a.scale / 0.85, best.z + 0.35, 14 * a.scale);
    best.pop.upT = Math.max(best.pop.upT, best.pop.t + 1.2); // give him time to get there
  }

  // ---------------------------------------------------------------- per frame

  function update(dt) {
    for (const hm of hammers) updateHammer(hm, dt);
    if (mini && mini.visible && TB.buddy.actor.pose !== 'swing') mini.visible = false;
    flyers.update(dt);
    bursts.update(dt);
    api.player().update(dt);
    if (!G.on) {
      updatePoppers(dt);
      return;
    }
    if (G.count > 0) {
      G.count -= dt;
      updatePoppers(dt);
      return;
    }
    if (!G.over) {
      G.time += dt;
      G.left = Math.max(0, ROUND - G.time);
      const sec = Math.ceil(G.left);
      if (sec <= 5 && sec < G.lastTick && sec > 0) {
        G.lastTick = sec;
        TB.sfx.count();
        api.lastSeconds(sec);
      }
      spawner(dt);
      if (G.auto) autoplay(dt);
      if (G.left <= 0) finish();
    }
    updatePoppers(dt);
  }

  function finish() {
    G.over = true;
    for (const h of holes) if (h.pop && (h.pop.state === 'up' || h.pop.state === 'rise')) setState(h.pop, 'fall');
    TB.buddy.leave();
    TB.stickers.award('zombie');
    const d = TB.stickers.data;
    d.bestWhack = Math.max(d.bestWhack || 0, G.stars);
    TB.stickers.persist();
    api.player().react('over');
    TB.sfx.fanfare();
    api.finish({ game: 'whack', stars: G.stars, bonks: G.bonks, golden: G.golden, bestStreak: G.bestStreak, friendsSafe: G.friendsSafe });
  }

  function stop() {
    G.on = false;
    G.over = true;
    if (mini) mini.visible = false;
    for (const h of holes) hide(h);
    for (const hm of hammers) {
      hm.t = -1;
      hm.pivot.visible = false;
    }
    flyers && flyers.clear();
  }

  // A simple bot for tests and the attract demo: bonks zombies a moment after they're fully up, never friends.
  function autoplay(dt) {
    G.autoT -= dt;
    if (G.autoT > 0) return;
    for (const h of holes) {
      if (h.pop && !isFriend(h.pop.kind) && h.pop.state === 'up' && h.pop.t > 0.25) {
        const s = TB.stage.toScreen(tmp.set(h.x, HEAD_Y, h.z), TB.stage.gardenCam, {});
        tap(s.x, s.y);
        G.autoT = 0.28;
        return;
      }
    }
  }

  const mode = {
    id: 'whack',
    scene: 'garden',
    enter, layout, start, update, stop, tap, spawn, buddyHelp,
    buddySpot: () => spots().buddy,
    buddyEntry: () => spots().entry,
    buddyScale: () => SIZE,
    playerSpot: () => spots().player,
    get state() { return G; },
    set auto(v) { G.auto = v; },
    // where things are, for tests: every popper with its screen position
    where() {
      return holes.filter((h) => h.pop).map((h) => {
        const s = TB.stage.toScreen(tmp.set(h.x, Math.max(0, h.pop.p.body.position.y) + HEAD_Y, h.z), TB.stage.gardenCam, {});
        return { hole: h.i, kind: h.pop.kind, state: h.pop.state, t: +h.pop.t.toFixed(2), x: Math.round(s.x), y: Math.round(s.y) };
      });
    },
    holeScreen(i) {
      const h = holes[i];
      return TB.stage.toScreen(tmp.set(h.x, HEAD_Y, h.z), TB.stage.gardenCam, {});
    },
  };
  TB.whack = mode;
})();
