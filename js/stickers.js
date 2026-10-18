/* Tommy's Toy Box: stars and the sticker book, saved in localStorage.
   Every star from either game counts toward the next sticker (8 stars for the first, then 3 more for each one
   after), and six special stickers are won by doing something (finish a round, bonk a golden zombie, ...).
   New stickers wait in `pending` until a results screen shows them peeling on. */
(function () {
  'use strict';
  const TB = (window.TB = window.TB || {});
  const KEY = 'tommyToybox.v1';

  // Earned with stars, in this order.
  const STAR_STICKERS = [
    { id: 'tommy', art: 'body:tommy' },
    { id: 'icecream', emoji: '🍦' },
    { id: 'teddy', art: 'body:teddy' },
    { id: 'dino', emoji: '🦖' },
    { id: 'bruno', art: 'body:bruno' },
    { id: 'rocket', emoji: '🚀' },
    { id: 'luna', art: 'body:luna' },
    { id: 'cookie', emoji: '🍪' },
    { id: 'zoom', art: 'body:zoom' },
    { id: 'ufo', emoji: '🛸' },
    { id: 'bolt', art: 'body:bolt' },
    { id: 'rainbow', emoji: '🌈' },
    { id: 'teddyshot', art: 'body:teddyshot' },
    { id: 'melon', emoji: '🍉' },
    { id: 'longneck', emoji: '🦕' },
    { id: 'balloon', emoji: '🎈' },
    { id: 'juice', emoji: '🧃' },
    { id: 'banana', emoji: '🍌' },
  ];
  // Won by doing something. `hint` shows in the empty slot so you know which game it comes from.
  const SPECIAL = [
    { id: 'zombie', art: 'body:zombie', hint: '🔨', how: 'Finish a round of Whack-a-Zombie' },
    { id: 'golden', art: 'head:golden', hint: '🔨', how: 'Bonk a golden zombie' },
    { id: 'fire', emoji: '🔥', hint: '🔨', how: 'Bonk 10 zombies in a row' },
    { id: 'friends', emoji: '💖', hint: '🐻', how: "Don't bonk the friends, 10 times" },
    { id: 'cards', emoji: '🃏', hint: '🃏', how: 'Finish the big Memory Cards (4×4)' },
    { id: 'buddies', art: 'buddies', hint: '🤝', how: 'Call your buddy' },
  ];
  const ALL = STAR_STICKERS.concat(SPECIAL);
  const cost = (i) => 8 + 3 * i;

  const fresh = () => ({ v: 1, stars: 0, got: {}, player: 'tommy', timer: false, friends: 0, bestWhack: 0 });
  let data = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.v === 1) data = Object.assign(fresh(), saved);
  } catch (e) { /* storage blocked: play without saving */ }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ }
  }

  const pending = [];

  // Stars needed in total for star sticker i.
  function threshold(i) {
    let t = 0;
    for (let k = 0; k <= i; k++) t += cost(k);
    return t;
  }

  function addStars(n) {
    if (!(n > 0)) return [];
    data.stars += n;
    const fresh = [];
    STAR_STICKERS.forEach((s, i) => {
      if (!data.got[s.id] && data.stars >= threshold(i)) {
        data.got[s.id] = Date.now();
        pending.push(s);
        fresh.push(s);
      }
    });
    persist();
    return fresh;
  }

  function award(id) {
    const s = SPECIAL.find((x) => x.id === id);
    if (!s || data.got[id]) return null;
    data.got[id] = Date.now();
    pending.push(s);
    persist();
    return s;
  }

  // Progress to the next star sticker: { have, need, sticker } (sticker null once they're all earned).
  function next() {
    for (let i = 0; i < STAR_STICKERS.length; i++) {
      if (!data.got[STAR_STICKERS[i].id]) {
        const from = i ? threshold(i - 1) : 0;
        return { have: Math.max(0, data.stars - from), need: cost(i), sticker: STAR_STICKERS[i] };
      }
    }
    return { have: 0, need: 0, sticker: null };
  }

  // The HTML for a sticker's picture. TB.art (made at startup) holds the character pictures.
  function pictureHTML(s) {
    const art = TB.art || {};
    if (s.emoji) return `<span class="emo">${s.emoji}</span>`;
    if (s.art === 'buddies') return `<span class="duo"><img alt="" src="${art.heads.teddy}"><img alt="" src="${art.heads.tommy}"></span>`;
    const [kind, id] = s.art.split(':');
    const src = kind === 'head' ? art.heads[id] : art.bodies[id];
    return `<img alt="" class="${kind}" src="${src}">`;
  }

  function renderBook(el) {
    const n = next();
    const count = ALL.filter((s) => data.got[s.id]).length;
    let html = `<div class="bookhead"><span class="bstars">⭐ ${data.stars}</span><span class="bcount">${count} / ${ALL.length}</span></div>`;
    if (n.sticker) {
      const pct = Math.round((100 * n.have) / n.need);
      html += `<div class="bnext" title="Stars to the next sticker"><span class="q">❓</span><i><b style="width:${pct}%"></b></i><span>⭐ ${n.have} / ${n.need}</span></div>`;
    }
    html += '<div class="bgrid">';
    ALL.forEach((s, i) => {
      if (data.got[s.id]) {
        const tilt = ((i * 37) % 13) - 6;
        html += `<div class="slot got" style="--tilt:${tilt}deg" data-id="${s.id}">${pictureHTML(s)}</div>`;
      } else {
        const hint = s.hint ? `<span class="hint">${s.hint}</span>` : '<span class="hint">⭐</span>';
        html += `<div class="slot" data-id="${s.id}" title="${s.how || 'Collect stars'}">${hint}</div>`;
      }
    });
    html += '</div>';
    el.innerHTML = html;
  }

  TB.stickers = {
    addStars, award, next, renderBook, pictureHTML, persist,
    takePending() { return pending.splice(0); },
    has: (id) => !!data.got[id],
    reset() {
      data = fresh();
      pending.length = 0;
      persist();
    },
    ALL, STAR_STICKERS, SPECIAL,
    get data() { return data; },
  };
})();
