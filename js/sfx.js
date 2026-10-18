/* Tommy's Toy Box: the toy box's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   TB.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap. */
(function () {
  'use strict';
  const TB = (window.TB = window.TB || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);

  const sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // the soft squeaky hammer: a rubbery squeak up and back down
    squeak() {
      tone({ f: 1050, to: 1900, dur: 0.07, vol: 0.11 });
      tone({ f: 1900, to: 1250, dur: 0.1, vol: 0.09, at: 0.07 });
    },
    // hammer on a zombie: the kit's bonk, the squeak and a little boing
    bonk() {
      S.punch();
      sfx.squeak();
      tone({ type: 'triangle', f: 520, to: 240, dur: 0.22, vol: 0.12, at: 0.03 });
    },
    // the hammer lands on an empty hole: a soft thud
    whiff() {
      tone({ f: 170, to: 110, dur: 0.09, vol: 0.12 });
      hiss({ filter: 'lowpass', f: 900, to: 300, dur: 0.12, vol: 0.08 });
    },
    // a head pops up out of its hole
    pop() { tone({ f: 300, to: 640, dur: 0.08, vol: 0.06 }); },
    golden() {
      S.coin(10);
      S.powerup();
    },
    // bonked a friend: a gentle "uh-oh", never harsh
    oops() {
      tone({ type: 'triangle', f: 440, to: 330, dur: 0.16, vol: 0.12 });
      tone({ type: 'triangle', f: 330, to: 247, dur: 0.24, vol: 0.1, at: 0.15 });
    },
    // a friend goes back down safe and sound
    friendBye() {
      tone({ type: 'triangle', f: 660, dur: 0.1, vol: 0.09 });
      tone({ type: 'triangle', f: 880, dur: 0.16, vol: 0.09, at: 0.09 });
    },
    // a card turns over
    flip() {
      hiss({ f: 3200, to: 1400, dur: 0.07, vol: 0.07, q: 1.4 });
      tone({ type: 'triangle', f: 760, dur: 0.04, vol: 0.04 });
    },
    // a pair! the chime climbs with the streak
    match(streak = 0) {
      const k = Math.pow(2, Math.min(streak, 8) / 12);
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f: f * k, at: i * 0.06, dur: 0.2, vol: 0.12 }));
    },
    // not a pair: a soft two-note "hmm"
    nomatch() {
      tone({ f: 392, dur: 0.12, vol: 0.07 });
      tone({ f: 349, dur: 0.16, vol: 0.07, at: 0.12 });
    },
    // a round or a level is done
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.11, dur: 0.16, vol: 0.05, lp: 3000 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.46, dur: 0.6, vol: 0.08 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.46, dur: 0.5, vol: 0.06 });
    },
    // a new sticker peels onto the page
    sticker() {
      hiss({ f: 2400, to: 6000, dur: 0.18, vol: 0.06, q: 0.8 });
      [1319, 1568, 2093].forEach((f, i) => tone({ type: 'sine', f, at: 0.12 + i * 0.07, dur: 0.25, vol: 0.08 }));
    },
    tick() { tone({ type: 'square', f: 1000, dur: 0.04, vol: 0.04 }); },
    go() {
      tone({ type: 'square', f: 523, dur: 0.12, vol: 0.05, lp: 2500 });
      tone({ type: 'square', f: 1047, dur: 0.3, vol: 0.06, lp: 2500, at: 0.12 });
    },
    // the round clock's last seconds
    count() { tone({ type: 'triangle', f: 880, dur: 0.08, vol: 0.08 }); },
  };

  TB.sfx = sfx;
})();
