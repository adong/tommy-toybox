/* Tommy's Toy Box: the renderer and the two places.
     room   - the playroom: wooden floor, polka-dot wall, bunting, a rug and toy blocks. The menu and Memory Cards.
              Its camera looks straight ahead; fitRoom() sizes it so a character stands at a given screen spot.
     garden - the lawn for Whack-a-Zombie (whack.js adds the holes). Its camera looks down at the holes;
              fitGarden() frames a set of world points inside the screen, leaving room for the HUD.
   TB.stage.toScreen(v, cam) gives screen pixels for a world point. */
(function () {
  'use strict';
  const T = THREE;
  const TB = (window.TB = window.TB || {});
  const { makeCanvas, toTexture, std, rand, pick } = Kit.gfx;

  let renderer = null, W = 1, H = 1;
  const room = new T.Scene();
  const garden = new T.Scene();
  const roomCam = new T.PerspectiveCamera(36, 1, 0.1, 200);
  const gardenCam = new T.PerspectiveCamera(36, 1, 0.1, 300);
  const roomView = { H: 6, D: 10, cy: 2, aspect: 1 };

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    buildRoom();
    buildGarden();
    resize();
  }

  function resize() {
    W = Math.max(1, innerWidth || 1);
    H = Math.max(1, innerHeight || 1);
    if (renderer) renderer.setSize(W, H, false);
    roomCam.aspect = gardenCam.aspect = W / H;
    roomCam.updateProjectionMatrix();
    gardenCam.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- the playroom

  function planks() {
    const [c, g] = makeCanvas(512, 512);
    const tones = ['#d9a066', '#cf9558', '#e0aa70', '#c98d50'];
    for (let r = 0; r < 8; r++) {
      let x = (r % 2) * -128;
      while (x < 512) {
        const w = 200 + Math.floor(Math.random() * 120);
        g.fillStyle = pick(tones);
        g.fillRect(x, r * 64, w, 64);
        g.fillStyle = 'rgba(90,50,20,0.35)';
        g.fillRect(x, r * 64, 3, 64);
        x += w;
      }
      g.fillStyle = 'rgba(90,50,20,0.45)';
      g.fillRect(0, r * 64 + 61, 512, 3);
      g.fillStyle = 'rgba(120,70,30,0.12)'; // grain
      for (let i = 0; i < 6; i++) g.fillRect(0, r * 64 + 8 + Math.random() * 48, 512, 1.5);
    }
    return toTexture(c, true);
  }

  function wallpaper() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#ffeccc';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#ffe0b0';
    for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 28, 256);
    const dots = ['#ffb3c7', '#9fe0ff', '#b9f0c4', '#ffd98a'];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        g.fillStyle = dots[(i + j) % 4];
        g.beginPath();
        g.arc(32 + i * 64 + (j % 2) * 16, 32 + j * 64, 9, 0, Math.PI * 2);
        g.fill();
      }
    }
    return toTexture(c, true);
  }

  function rugTexture() {
    const [c, g] = makeCanvas(256, 256);
    const rings = ['#3fb8ff', '#ffffff', '#ff6f91', '#ffffff', '#ffd23f', '#ffffff', '#3fe0b0'];
    rings.forEach((col, i) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(128, 128, 128 - i * 17, 0, Math.PI * 2);
      g.fill();
    });
    return toTexture(c);
  }

  function blockTexture(col, emoji) {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = col;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 10;
    g.strokeRect(8, 8, 112, 112);
    g.font = `70px ${Kit.gfx.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, 64, 70);
    return toTexture(c);
  }

  function buildRoom() {
    room.background = new T.Color('#ffeccc');
    room.add(new T.HemisphereLight('#fff6e8', '#b08a68', 0.95));
    const sun = new T.DirectionalLight('#fff1dc', 0.85);
    sun.position.set(-3, 7, 9);
    room.add(sun);

    const floorTex = planks();
    floorTex.repeat.set(10, 5);
    const floor = new T.Mesh(new T.PlaneGeometry(80, 40), std('#ffffff', { map: floorTex, roughness: 0.75 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 16);
    room.add(floor);

    const wallTex = wallpaper();
    wallTex.repeat.set(44, 17.6);
    const wall = new T.Mesh(new T.PlaneGeometry(80, 32), std('#ffffff', { map: wallTex, roughness: 0.95 }));
    wall.position.set(0, 16, -4);
    room.add(wall);
    const base = new T.Mesh(new T.BoxGeometry(80, 0.36, 0.14), std('#ffffff'));
    base.position.set(0, 0.18, -3.93);
    room.add(base);

    const rug = new T.Mesh(new T.CircleGeometry(3.2, 48), std('#ffffff', { map: rugTexture(), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.scale.set(1.7, 1, 1);
    rug.position.set(0, 0.012, 0.2);
    room.add(rug);

    // bunting across the wall
    const flagCols = ['#ff6f91', '#ffd23f', '#3fb8ff', '#3fe0b0', '#a77bff'];
    for (let row = 0; row < 2; row++) {
      for (let i = -14; i <= 14; i++) {
        const seg = ((i + 14) % 7) / 6; // each garland of 7 flags sags in the middle
        const x = i * 0.9, y = 5.8 + row * 2.4 - Math.sin(seg * Math.PI) * 0.4;
        const tri = new T.Mesh(new T.ConeGeometry(0.3, 0.6, 3), std(flagCols[(i + 40 + row) % 5]));
        tri.rotation.z = Math.PI;
        tri.rotation.y = Math.PI / 6;
        tri.scale.z = 0.15;
        tri.position.set(x, y, -3.85);
        room.add(tri);
      }
    }

    // windows with sky and a cloud
    const [wc, wg] = makeCanvas(128, 128);
    const sky = wg.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#7fd3ff');
    sky.addColorStop(1, '#d6f3ff');
    wg.fillStyle = sky;
    wg.fillRect(0, 0, 128, 128);
    wg.fillStyle = '#ffffff';
    for (const [x, y, r] of [[40, 70, 16], [58, 62, 20], [78, 70, 15]]) {
      wg.beginPath();
      wg.arc(x, y, r, 0, Math.PI * 2);
      wg.fill();
    }
    const winMat = new T.MeshBasicMaterial({ map: toTexture(wc) });
    for (const x of [-6.5, 6.5]) {
      const frame = new T.Mesh(new T.BoxGeometry(2.6, 2.4, 0.12), std('#ffffff'));
      frame.position.set(x, 3.6, -3.93);
      room.add(frame);
      const pane = new T.Mesh(new T.PlaneGeometry(2.2, 2.0), winMat);
      pane.position.set(x, 3.6, -3.86);
      room.add(pane);
      const bar = new T.Mesh(new T.BoxGeometry(0.1, 2.0, 0.05), std('#ffffff'));
      bar.position.set(x, 3.6, -3.84);
      room.add(bar);
      const bar2 = new T.Mesh(new T.BoxGeometry(2.2, 0.1, 0.05), std('#ffffff'));
      bar2.position.set(x, 3.6, -3.84);
      room.add(bar2);
    }

    // toy blocks by the wall, and a toy box
    const blocks = [['#ff6f91', '⭐'], ['#3fb8ff', '🦖'], ['#ffd23f', '🚀'], ['#3fe0b0', '🍦'], ['#a77bff', '🛸']];
    const spots = [[-4.6, -3.2, 0], [-3.85, -3.3, 0.3], [-4.25, -3.25, 0.2, 1], [4.2, -3.1, -0.2], [4.95, -3.3, 0.1]];
    spots.forEach(([x, z, r, up], i) => {
      const [col, emo] = blocks[i % blocks.length];
      const b = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 0.7), std('#ffffff', { map: blockTexture(col, emo), roughness: 0.6 }));
      b.position.set(x, up ? 1.05 : 0.35, z);
      b.rotation.y = r;
      room.add(b);
    });
    const chest = new T.Group();
    const wood = std('#3fa3ff', { roughness: 0.6 }), trim = std('#ffd23f', { roughness: 0.5 });
    const body = new T.Mesh(new T.BoxGeometry(2.2, 1.1, 1.1), wood);
    body.position.y = 0.55;
    chest.add(body);
    const lid = new T.Mesh(new T.BoxGeometry(2.3, 0.22, 1.2), trim);
    lid.position.set(0, 1.2, -0.1);
    lid.rotation.x = -0.35;
    chest.add(lid);
    const band = new T.Mesh(new T.BoxGeometry(2.24, 0.16, 1.14), trim);
    band.position.y = 0.85;
    chest.add(band);
    const star = new T.Mesh(new T.CircleGeometry(0.26, 5), std('#ffffff'));
    star.position.set(0, 0.45, 0.56);
    chest.add(star);
    chest.position.set(-6.8, 0, -3.1);
    room.add(chest);
  }

  // Fit the playroom camera so a 2 m character's feet stand at screen y `floorPx` and he is `charPx` tall.
  function fitRoom(floorPx, charPx) {
    const Hw = (2.0 * H) / Math.max(40, charPx);
    const fov = (roomCam.fov * Math.PI) / 180;
    const D = Hw / 2 / Math.tan(fov / 2);
    const ndcFloor = 1 - (2 * floorPx) / H;
    const cy = -ndcFloor * (Hw / 2);
    roomCam.position.set(0, cy, D);
    roomCam.lookAt(0, cy, 0);
    roomCam.updateMatrixWorld(true);
    Object.assign(roomView, { H: Hw, D, cy, aspect: W / H });
  }
  // world x (on the z = 0 stage line) under screen x
  const roomX = (sx) => ((2 * sx) / W - 1) * (roomView.H / 2) * roomView.aspect;
  // world height of the visible room at z = 0
  const roomHalfW = () => (roomView.H / 2) * roomView.aspect;

  // ---------------------------------------------------------------- the garden

  function lawn() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#7dd05a';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#6fc34d';
    g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(30,80,10,0.07)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5);
    }
    return toTexture(c, true);
  }

  function buildGarden() {
    garden.background = new T.Color('#a6e4ff');
    garden.add(new T.HemisphereLight('#ffffff', '#4a7a2a', 0.85));
    const sun = new T.DirectionalLight('#fff4dc', 1.0);
    sun.position.set(-4, 10, 7);
    garden.add(sun);

    const tex = lawn();
    tex.repeat.set(24, 24);
    const ground = new T.Mesh(new T.PlaneGeometry(90, 90), std('#ffffff', { map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    garden.add(ground);

    // a white picket fence along the back
    const white = std('#ffffff', { roughness: 0.6 });
    const postGeo = new T.BoxGeometry(0.22, 1.3, 0.1);
    const fenceZ = -6.2;
    for (let x = -16; x <= 16; x += 0.55) {
      const post = new T.Mesh(postGeo, white);
      post.position.set(x, 0.65, fenceZ);
      garden.add(post);
      const tip = new T.Mesh(new T.ConeGeometry(0.16, 0.22, 4), white);
      tip.position.set(x, 1.4, fenceZ);
      tip.rotation.y = Math.PI / 4;
      garden.add(tip);
    }
    for (const y of [0.35, 1.0]) {
      const rail = new T.Mesh(new T.BoxGeometry(33, 0.14, 0.08), white);
      rail.position.set(0, y, fenceZ + 0.08);
      garden.add(rail);
    }

    // bushes and flowers around the edge (kept clear of the holes and the characters' spots)
    const leaf = [std('#3f9e3a'), std('#4cb244'), std('#378c33')];
    const bush = (x, z, s) => {
      for (let i = 0; i < 3; i++) {
        const b = new T.Mesh(new T.SphereGeometry(0.7 * s, 14, 10), leaf[i]);
        b.position.set(x + (i - 1) * 0.6 * s, 0.45 * s + (i === 1 ? 0.25 * s : 0), z + (i % 2) * 0.2);
        garden.add(b);
      }
    };
    bush(-8.4, -5.2, 1.2);
    bush(8.4, -5.2, 1.2);
    bush(-10.5, 1.5, 1.3);
    bush(10.5, 1.5, 1.3);
    bush(-3.2, -5.6, 0.8);
    bush(3.2, -5.6, 0.8);
    const petals = ['#ff6f91', '#ffd23f', '#ffffff', '#a77bff', '#ff8a1f'];
    const stem = std('#2f8a2a');
    const centre = std('#ffcc00');
    for (let i = 0; i < 70; i++) {
      const x = rand(-12, 12), z = rand(-5.8, 6.5);
      if (Math.abs(x) < 4.6 && z > -4.2 && z < 4.2) continue; // the holes
      if (Math.abs(Math.abs(x) - 5.9) < 1.2 && Math.abs(z - 0.6) < 1.4) continue; // player and buddy spots
      const f = new T.Group();
      const s = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.35, 5), stem);
      s.position.y = 0.17;
      f.add(s);
      const head = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), std(pick(petals)));
      head.position.y = 0.38;
      head.scale.y = 0.6;
      f.add(head);
      const dot = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), centre);
      dot.position.y = 0.43;
      f.add(dot);
      f.position.set(x, 0, z);
      garden.add(f);
    }
  }

  // Frame world points `pts` in the garden camera, which looks down at `elev` radians from the front, keeping the
  // points inside the screen minus margins { l, r, t, b } in pixels.
  const tmpV = new T.Vector3(), right = new T.Vector3(), up = new T.Vector3();
  function fitGarden(pts, elev, m) {
    const dir = new T.Vector3(0, Math.sin(elev), Math.cos(elev));
    const center = new T.Vector3();
    pts.forEach((p) => center.add(p));
    center.multiplyScalar(1 / pts.length);
    const box = { x0: -1 + (2 * m.l) / W, x1: 1 - (2 * m.r) / W, y0: -1 + (2 * m.b) / H, y1: 1 - (2 * m.t) / H };
    const cam = gardenCam;
    const place = (d) => {
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld(true);
    };
    const bounds = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        tmpV.copy(p).project(cam);
        x0 = Math.min(x0, tmpV.x);
        x1 = Math.max(x1, tmpV.x);
        y0 = Math.min(y0, tmpV.y);
        y1 = Math.max(y1, tmpV.y);
      }
      return { x0, x1, y0, y1 };
    };
    for (let iter = 0; iter < 4; iter++) {
      let lo = 2, hi = 300;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const b = bounds();
        const fits = b.x0 >= box.x0 && b.x1 <= box.x1 && b.y0 >= box.y0 && b.y1 <= box.y1;
        if (fits) hi = mid;
        else lo = mid;
      }
      place(hi);
      const b = bounds();
      const dx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2;
      const dy = (b.y0 + b.y1) / 2 - (box.y0 + box.y1) / 2;
      const d = cam.position.distanceTo(center);
      const halfH = d * Math.tan((cam.fov * Math.PI) / 360), halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      center.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH);
    }
    return center;
  }

  // ---------------------------------------------------------------- shared

  function toScreen(v, cam, out = { x: 0, y: 0 }) {
    tmpV.copy(v).project(cam);
    out.x = ((tmpV.x + 1) / 2) * W;
    out.y = ((1 - tmpV.y) / 2) * H;
    return out;
  }

  function render(which) {
    if (!renderer) return;
    if (which === 'garden') renderer.render(garden, gardenCam);
    else renderer.render(room, roomCam);
  }

  TB.stage = {
    init, resize, render, fitRoom, fitGarden, roomX, roomHalfW, toScreen,
    room, garden, roomCam, gardenCam,
    get W() { return W; },
    get H() { return H; },
    get renderer() { return renderer; },
  };
})();
