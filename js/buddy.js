/* Tommy's Toy Box: the buddy. The other brother (Kit.roster.buddyFor: Teddy when Tommy plays, Tommy for everyone
   else) comes when called with his button, his card on the menu or the T key, as often as you like. A visit:
     run in → say hi with his signature move (Teddy: boxing combo; Tommy: the Y with ✌️) → help in the game's own
     way (the mode's buddyHelp) → hand over a treat (🍦 💧 🧃 🍪 🍉 🍌) → say bye (Teddy: jump shot) → run off.
   While he's there (GUARD seconds) he protects you: the mode asks TB.buddy.guarding() before breaking a streak and
   calls TB.buddy.saved() instead ("TEDDY SAVED YOU!"). Calling him again once he's handed over his treat makes him
   say hi again and bring another one; calling while he's leaving brings him straight back. */
(function () {
  'use strict';
  const T = THREE;
  const TB = (window.TB = window.TB || {});
  const { pick, emojiTexture } = Kit.gfx;

  const V = { helpFrom: 2.2, giveAt: 4.6, throwAt: 5.0, byeAt: 8.6, leaveAt: 9.8, guard: 10 }; // seconds into a visit
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  let api = null, entry = null, mode = null;
  const actor = TB.makeActor();
  const b = { on: false, t: 0, said: false, given: false, bye: false, leaving: false, calls: 0, saves: 0, treats: 0, lastTreat: null };
  const treat = { sprite: null, flyT: -1, emoji: '', from: new T.Vector3(), to: new T.Vector3() };
  const tmp = new T.Vector3();

  function init(a) {
    api = a;
    treat.sprite = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
    treat.sprite.visible = false;
    treat.sprite.renderOrder = 22;
    actor.visible = false;
  }

  // The buddy for this player (rebuilt only when he changes). Returns his roster entry.
  function setFor(playerId) {
    const id = Kit.roster.buddyFor(playerId);
    if (entry && entry.id === id) return entry;
    if (b.on) dismiss();
    entry = Kit.roster.get(id);
    actor.set(id, 1);
    const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
    tag.position.y = 2.75;
    actor.person.root.add(tag);
    actor.visible = false;
    return entry;
  }

  // Move him (and his treat) into the current mode's scene. `m` gives his spot, where he runs in from, his size,
  // and optionally buddyHelp(dt, buddy) for the game's own help.
  function enter(m, scene, flyers) {
    mode = m;
    if (b.on) dismiss();
    actor.attach(scene, flyers);
    scene.add(treat.sprite);
    treat.sprite.visible = false;
    treat.flyT = -1;
    actor.visible = false;
  }

  const scaleNow = () => (mode && mode.buddyScale ? mode.buddyScale() : 1) * (entry.buddyScale || 0.8);

  function call() {
    if (!mode || !entry) return 'none';
    b.calls++;
    if (TB.stickers) TB.stickers.award('buddies');
    if (!b.on) return summon();
    if (b.leaving || b.given || b.t >= V.giveAt) {
      // another hello and another treat; a fresh guard window
      Object.assign(b, { t: 0.4, said: false, given: false, bye: false, leaving: false });
      const s = mode.buddySpot();
      actor.moveTo(s.x, s.z, 8 * actor.scale);
      api.toast(`${entry.name}'S HERE!`, 'buddy');
      return 'again';
    }
    actor.react('hop');
    return 'coming';
  }

  function summon() {
    const from = mode.buddyEntry(), s = mode.buddySpot();
    Object.assign(b, { on: true, t: 0, said: false, given: false, bye: false, leaving: false });
    actor.setScale(scaleNow());
    actor.place(from.x, 0, from.z);
    actor.face = null;
    actor.faceDefault = s.face;
    actor.visible = true;
    actor.react('idle');
    actor.moveTo(s.x, s.z, 8 * actor.scale);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    TB.sfx.kit('powerup');
    return 'summoned';
  }

  function dismiss() {
    b.on = false;
    b.leaving = false;
    actor.visible = false;
    actor.lean = 0;
  }

  // The game is over: skip to the goodbye.
  function leave() {
    if (b.on && b.t < V.byeAt) b.t = V.byeAt;
  }

  const guarding = () => b.on && !b.leaving && b.t < V.guard;

  // A miss was forgiven because he's here.
  function saved(x, y) {
    b.saves++;
    api.toast(`${entry.name} SAVED YOU!`, 'save');
    actor.react('hop');
    TB.sfx.kit('powerup');
    if (api.savedAt) api.savedAt(x, y);
  }

  // ---------------------------------------------------------------- the treat

  function giveTreat() {
    const [emoji, label] = pick(TREATS);
    treat.emoji = emoji;
    b.treats++;
    b.lastTreat = emoji;
    treat.sprite.material.map = emojiTexture(emoji);
    treat.sprite.material.needsUpdate = true;
    actor.root.updateMatrixWorld(true);
    Kit.people.handWorld(actor.person, 1, treat.from);
    treat.sprite.position.copy(treat.from);
    treat.sprite.scale.setScalar(0.7);
    treat.sprite.visible = true;
    treat.flyT = 0;
    api.toast(`${emoji} ${label} FROM ${entry.name}!`, 'treat');
    TB.sfx.kit('coin', 6);
  }

  function updateTreat(dt) {
    if (treat.flyT < 0) return;
    const player = api.player();
    treat.flyT += dt / 0.65;
    player.root.updateMatrixWorld(true);
    Kit.people.handWorld(player.person, -1, treat.to);
    const k = Math.min(1, treat.flyT);
    treat.sprite.position.lerpVectors(treat.from, treat.to, k);
    treat.sprite.position.y += Math.sin(k * Math.PI) * 1.6;
    treat.sprite.material.rotation = k * Math.PI * 2;
    if (k >= 1) {
      treat.flyT = -1;
      treat.sprite.visible = false;
      treat.sprite.material.rotation = 0;
      player.hold(treat.emoji, 8);
      player.react('cheer');
    }
  }

  // ---------------------------------------------------------------- the visit

  function update(dt) {
    updateTreat(dt);
    if (!b.on) return;
    b.t += dt;
    const t = b.t;
    const spot = mode.buddySpot();
    actor.faceDefault = spot.face;

    if (!b.leaving) {
      if (!b.said && t > 0.3 && !actor.moving) {
        b.said = true;
        actor.face = null;
        actor.react('hello');
      }
      const handing = t > V.giveAt - 0.2 && !b.given;
      if (handing) {
        // come back to his spot (near you) and hand it over
        if (t < V.throwAt) actor.moveTo(spot.x, spot.z, 9 * actor.scale);
        actor.face = null;
        if (!actor.moving) actor.act('give', 0.6, 0, true);
        if (t > V.throwAt && !actor.moving) {
          b.given = true;
          giveTreat();
        } else if (t > V.throwAt + 1.5) {
          b.given = true;
          giveTreat();
        }
      } else if (t > V.helpFrom && t < V.byeAt && b.said && mode.buddyHelp) {
        mode.buddyHelp(dt, helper);
      }
      if (!b.bye && t > V.byeAt) {
        actor.moveTo(spot.x, spot.z, 9 * actor.scale);
        actor.face = null;
        actor.lean = 0;
        if (!actor.moving) {
          b.bye = true;
          actor.react('goodbye');
        }
      }
      if (t > V.leaveAt && (b.bye || t > V.leaveAt + 1.5)) {
        b.leaving = true;
        const out = mode.buddyEntry();
        actor.react('idle');
        actor.moveTo(out.x, out.z, 8 * actor.scale);
      }
    } else if (!actor.moving) dismiss();
    actor.update(dt);
  }

  // Helpers the modes use from buddyHelp(dt, h).
  const helper = {
    get actor() { return actor; },
    get busy() { return actor.mode === 'signature' || treat.flyT >= 0; },
    get entry() { return entry; },
    get t() { return b.t; },
  };

  TB.buddy = {
    init, setFor, enter, call, summon, dismiss, leave, update, guarding, saved, helper,
    V,
    get entry() { return entry; },
    get actor() { return actor; },
    get on() { return b.on; },
    get t() { return b.t; },
    get given() { return b.given; },
    get guardLeft() { return guarding() ? Math.max(0, 1 - b.t / V.guard) : 0; },
    info() {
      const r = actor.root.position;
      return {
        on: b.on, id: entry && entry.id, t: +b.t.toFixed(2), guarding: guarding(), given: b.given, leaving: b.leaving,
        pose: actor.pose, x: +r.x.toFixed(2), z: +r.z.toFixed(2), visible: actor.visible, calls: b.calls, saves: b.saves,
        treats: b.treats, lastTreat: b.lastTreat, flying: treat.flyT >= 0,
      };
    },
  };
})();
