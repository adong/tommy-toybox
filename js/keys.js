/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: "Tommy's Toy Box",
  keys: [
    ["pick who's playing", "← →"],
    ["Whack-a-Zombie", "1"],
    ["Memory Cards", "2"],
    ["call your brother", "T"],
    ["sticker book", "B"],
    ["play again · next level", "Enter or Space"],
    ["pause", "P or Esc"],
    ["sound on / off", "M"],
  ],
  touch: "Everything is a picture to tap: zombies to bonk, cards to turn over, and your brother's face (bottom right).",
});
