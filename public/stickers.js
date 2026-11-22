// Sticker, frame and clip-card library. Every piece is drawn in SVG/CSS here
// (original artwork, no brand marks), so it scales crisply at any size.

// ---------- helpers ----------
const f2 = (n) => +n.toFixed(2);
export function starD(cx, cy, R, r, n = 5, rot = -90) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    d += (i ? "L" : "M") + f2(cx + rad * Math.cos(a)) + " " + f2(cy + rad * Math.sin(a));
  }
  return d + "Z";
}
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, p) {
  const [r, g, b] = hex2rgb(hex);
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  const m = (c) => Math.round(c + (t - c) * a).toString(16).padStart(2, "0");
  return "#" + m(r) + m(g) + m(b);
}
const svg = (vb, body, defs = "") => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
const lin = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</linearGradient>`;
const rad = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</radialGradient>`;
const enamel = (id, c) => lin(id, [[0, shade(c, 0.45)], [0.45, c], [1, shade(c, -0.28)]]);
const gingham = (id, c, size = 8) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="#fbf9f4"/><rect width="${size / 2}" height="${size}" fill="${c}" opacity=".45"/><rect width="${size}" height="${size / 2}" fill="${c}" opacity=".45"/></pattern>`;
const slug = (s) => s.replace(/[^a-z0-9]/gi, "");

// ---------- library ----------
export const LIB = {};
export const CATS = [
  ["stars", "stars"],
  ["clips", "clips & pins"],
  ["buttons", "buttons"],
  ["charms", "charms"],
  ["classic", "classics"],
];
const add = (id, cat, name, base, html) => (LIB[id] = { id, cat, name, base, html });

// ===== STARS =====
const S5 = starD(50, 53, 46, 20);
const S5fat = starD(50, 54, 40, 21);

// embroidered patches: satin fill, thread sheen, satin-stitch border
const EMB = { pink: "#f3a6c3", blue: "#7f9cc9", sky: "#a9c8ee", lilac: "#b38ad8", hotpink: "#ef5c9c", navy: "#243c78", gold: "#d7b24a", silver: "#b8bbc0" };
for (const [k, c] of Object.entries(EMB)) {
  const id = `g-emb-${k}`;
  const metal = k === "gold" || k === "silver";
  add(`star-emb-${k}`, "stars", `${k} patch`, 100, () =>
    svg("0 0 100 100",
      `<path d="${S5}" fill="url(#${id})"/><path d="${S5}" fill="url(#threads)"/>
       <path d="${S5}" fill="none" stroke="${shade(c, -0.22)}" stroke-width="6" stroke-dasharray=".9 .55" stroke-linejoin="round"/>
       <path d="${starD(50, 53, 30, 13)}" fill="none" stroke="${shade(c, -0.12)}" stroke-width=".8" opacity=".5"/>`,
      metal ? lin(id, [[0, shade(c, 0.5)], [0.4, c], [0.6, shade(c, 0.3)], [1, shade(c, -0.3)]], 1, 1) : lin(id, [[0, shade(c, 0.15)], [1, shade(c, -0.08)]], 1, 1)));
}
// puffy satin / metallic (rounded points, glazed, stitched inner edge)
const PUFFY = { magenta: "#a3175a", pink: "#f08bb6", gold: "#d4b25c", silver: "#c9ccd1", sky: "#8fbbe8" };
for (const [k, c] of Object.entries(PUFFY)) {
  const id = `g-puf-${k}`;
  add(`star-puffy-${k}`, "stars", `puffy ${k}`, 100, () =>
    svg("0 0 100 100",
      `<g filter="url(#glaze)"><path d="${S5fat}" fill="url(#${id})" stroke="url(#${id})" stroke-width="12" stroke-linejoin="round"/></g>
       <path d="${starD(50, 54, 40, 21)}" transform="translate(50 54) scale(.98) translate(-50 -54)" fill="none" stroke="${shade(c, 0.35)}" stroke-width="1.2" stroke-dasharray="2.2 1.6" stroke-linejoin="round" opacity=".8"/>`,
      lin(id, [[0, shade(c, 0.55)], [0.35, c], [0.7, shade(c, -0.25)], [1, shade(c, 0.1)]], 1, 1)));
}
// chrome blob stars
const CHROME = { silver: "chrome", rose: "chromeRose", ink: "chromeInk" };
for (const [k, g] of Object.entries(CHROME)) {
  add(`star-chrome-${k}`, "stars", `chrome ${k}`, 100, () =>
    svg("0 0 100 100", `<g filter="url(#glaze)"><path d="${starD(50, 55, 38, 17)}" fill="url(#${g})" stroke="url(#${g})" stroke-width="13" stroke-linejoin="round"/></g>`));
}
// faceted 3D stars
const FACET = { gold: "#cdb06a", silver: "#b9bcc1", rose: "#d9a1b4" };
for (const [k, c] of Object.entries(FACET)) {
  add(`star-facet-${k}`, "stars", `faceted ${k}`, 100, () => {
    let tri = "";
    for (let i = 0; i < 10; i++) {
      const a1 = ((-90 + i * 36) * Math.PI) / 180, a2 = ((-90 + (i + 1) * 36) * Math.PI) / 180;
      const r1 = i % 2 ? 19 : 46, r2 = (i + 1) % 2 ? 19 : 46;
      const col = i % 2 ? shade(c, -0.25 - (i % 4) * 0.04) : shade(c, 0.3 - (i % 3) * 0.08);
      tri += `<path d="M50 53L${f2(50 + r1 * Math.cos(a1))} ${f2(53 + r1 * Math.sin(a1))}L${f2(50 + r2 * Math.cos(a2))} ${f2(53 + r2 * Math.sin(a2))}Z" fill="${col}" stroke="${col}" stroke-width=".4"/>`;
    }
    return svg("0 0 100 100", tri);
  });
}
// disco mirror star, sequins, glitter, holo
add("star-disco", "stars", "disco", 100, () =>
  svg("0 0 100 100", `<g filter="url(#glaze)"><path d="${S5fat}" fill="url(#mirror)" stroke="#9fa2a7" stroke-width="9" stroke-linejoin="round"/></g><path d="${S5fat}" fill="url(#shine)" opacity=".55"/>`));
for (const [k, c] of Object.entries({ silver: null, gold: "#d8b24c", pink: "#f07fb0" })) {
  add(`star-sequin-${k}`, "stars", `sequin ${k}`, 100, () =>
    svg("0 0 100 100", `<path d="${S5}" fill="url(#sequin)" stroke="#8d9096" stroke-width="3" stroke-linejoin="round"/>${c ? `<path d="${S5}" fill="${c}" style="mix-blend-mode:multiply" opacity=".75"/>` : ""}`));
}
for (const [k, c] of Object.entries({ pink: "#f27db4", purple: "#7a2bb5", gold: "#d9b54a", baby: "#f6b8cf" })) {
  add(`star-glitter-${k}`, "stars", `glitter ${k}`, 100, () =>
    svg("0 0 100 100", `<g filter="url(#glitter)"><path d="${S5}" fill="${c}" stroke="${shade(c, -0.15)}" stroke-width="1.5" stroke-linejoin="round"/></g>`));
}
add("star-holo", "stars", "holographic", 100, () =>
  svg("0 0 100 100", `<g filter="url(#glitter)"><g filter="url(#glaze)"><path d="${S5fat}" fill="url(#holo)" stroke="url(#holo)" stroke-width="10" stroke-linejoin="round"/></g></g>`));
// jelly / glass stars
const JELLY = { aqua: "#9fe3ef", peach: "#f5c7b4", lilac: "#c6b4f0", lime: "#dbe98d", pink: "#f5b9d3", clear: "#e7edf3" };
for (const [k, c] of Object.entries(JELLY)) {
  const id = `g-jel-${k}`;
  add(`star-jelly-${k}`, "stars", `jelly ${k}`, 100, () =>
    svg("0 0 100 100",
      `<g filter="url(#glitter)"><path d="${S5fat}" fill="url(#${id})" stroke="url(#${id})" stroke-width="11" stroke-linejoin="round" opacity=".9"/></g>
       <path d="${S5fat}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" opacity=".7"/>
       <ellipse cx="38" cy="38" rx="11" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 38 38)"/>
       <circle cx="62" cy="66" r="2.5" fill="#fff" opacity=".8"/>`,
      rad(id, [[0, "#ffffff", 0.95], [0.45, c, 0.85], [1, shade(c, -0.25), 0.9]], 0.4, 0.35, 0.75)));
}
add("star-denim", "stars", "denim patch", 100, () =>
  svg("0 0 100 100",
    `<g filter="url(#denim)"><path d="${S5}" fill="#5f85b8" stroke="#3f5f8c" stroke-width="4" stroke-linejoin="round"/></g>
     <path d="${starD(50, 53, 38, 16.5)}" fill="none" stroke="#f3efe3" stroke-width="1.4" stroke-dasharray="3 2" stroke-linejoin="round"/>`));
add("star-scatter", "stars", "tiny chrome stars", 120, () => {
  const pts = [[20, 20, 11], [52, 14, 7], [80, 26, 12], [34, 48, 8], [66, 52, 10], [16, 74, 7], [48, 80, 12], [84, 78, 8]];
  return svg("0 0 100 100", `<g filter="url(#glaze)">${pts.map(([x, y, s], i) => `<path d="${starD(x, y, s, s * 0.45)}" fill="url(#${i % 3 === 1 ? "chromeInk" : "chrome"})" stroke="url(#chrome)" stroke-width="2.5" stroke-linejoin="round"/>`).join("")}</g>`);
});
add("sparkle", "stars", "sparkle", 90, () =>
  svg("0 0 100 100", `<g filter="url(#glaze)"><path d="M50 4C54 38 62 46 96 50C62 54 54 62 50 96C46 62 38 54 4 50C38 46 46 38 50 4Z" fill="url(#chrome)"/></g>`));
add("sparkle-blue", "stars", "glazed sparkle", 90, () =>
  svg("0 0 100 100", `<g filter="url(#glaze)"><path d="M50 4C54 38 62 46 96 50C62 54 54 62 50 96C46 62 38 54 4 50C38 46 46 38 50 4Z" fill="#a9c6f2" stroke="#a9c6f2" stroke-width="4" stroke-linejoin="round"/></g>`));

// ===== CLIPS & PINS =====
function binderClip(id, paint, deco = "", defs = "", metalPins = "#c9a24a") {
  return svg("0 0 100 92",
    `<g filter="url(#glaze)">
       <path fill-rule="evenodd" d="M30 54V24a20 20 0 0 1 40 0V54Z M50 15a9 9 0 1 0 0.01 0Z" fill="${paint}"/>
       <rect x="6" y="50" width="88" height="36" rx="11" fill="${paint}"/>
     </g>
     <rect x="10" y="52" width="80" height="5" rx="2.5" fill="#fff" opacity=".35"/>
     <circle cx="27" cy="50" r="3.6" fill="${metalPins}"/><circle cx="73" cy="50" r="3.6" fill="${metalPins}"/>${deco}`,
    defs);
}
const CLIPS = {
  silver: { name: "silver clip", paint: "url(#chrome)" },
  pink: { name: "pink pearl clip", c: "#f0a9c2", deco: `<circle cx="50" cy="70" r="7" fill="url(#pearl)"/><path d="M50 40v23" stroke="#c9a24a" stroke-width="1.2"/>` },
  blue: { name: "jelly clip", c: "#9db7f5", jelly: true, deco: `<circle cx="50" cy="44" r="4" fill="#fff" opacity=".95"/><circle cx="50" cy="44" r="2" fill="#cfe4ff"/>` },
  red: { name: "red bow clip", c: "#d0222f", deco: `<path d="M50 68C42 58 30 60 32 68C34 76 44 74 50 68ZM50 68C58 58 70 60 68 68C66 76 56 74 50 68Z" fill="#e2333f" stroke="#b81622" stroke-width="1"/><path d="M48 70L42 82L47 80L50 71ZM52 70L58 82L53 80L50 71Z" fill="#c41d29"/><circle cx="50" cy="68" r="3.4" fill="#f0525c"/>` },
  sage: { name: "sage clip", c: "#8faa7a" },
  black: { name: "black clip", c: "#2b2b2e", pins: "#c87f52" },
  stripe: { name: "striped clip", paint: "url(#p-stripe)", defs: `<pattern id="p-stripe" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f4efe2"/><rect width="5" height="10" fill="#a9c4ea"/></pattern>`, deco: `<path d="${starD(50, 66, 8, 3.5)}" fill="#e0b84a" stroke="#c99b2a" stroke-width=".8"/>` },
  polka: { name: "polka clip", paint: "url(#p-polka)", defs: `<pattern id="p-polka" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#bfe07a"/><circle cx="3" cy="3" r="2.2" fill="#f7f1dc"/><circle cx="9" cy="9" r="2.2" fill="#f7f1dc"/></pattern>` },
  cream: { name: "cream clip", c: "#efe7d6" },
  sky: { name: "sky clip", c: "#a9c9ee" },
  butter: { name: "butter clip", c: "#f1d77a" },
  lilac: { name: "lilac clip", c: "#c9b2ea" },
};
for (const [k, v] of Object.entries(CLIPS)) {
  add(`clip-${k}`, "clips", v.name, 90, () => {
    const gid = `g-clip-${k}`;
    let defs = v.defs || "";
    let paint = v.paint;
    if (!paint) { defs += v.jelly ? lin(gid, [[0, shade(v.c, 0.5), 0.85], [0.5, v.c, 0.7], [1, shade(v.c, -0.2), 0.9]]) : enamel(gid, v.c); paint = `url(#${gid})`; }
    return binderClip(gid, paint, v.deco || "", defs, v.pins || "#c9a24a");
  });
}
add("safety-pin", "clips", "safety pin", 140, () =>
  svg("0 0 140 40",
    `<g fill="none" stroke="url(#chrome)" stroke-linecap="round">
       <path d="M18 26L120 9" stroke-width="3.2"/><path d="M18 26L112 25" stroke-width="3"/>
       <circle cx="12" cy="25" r="7" stroke-width="3"/>
     </g>
     <path d="M108 3h22a5 5 0 0 1 0 10h-6l-8 6h-8Z" fill="url(#chrome)" stroke="#7f8388" stroke-width=".8"/>`));
add("safety-pin-heart", "clips", "pin with heart charm", 140, () =>
  svg("0 0 140 70",
    `<g fill="none" stroke="url(#chrome)" stroke-linecap="round">
       <path d="M18 26L120 9" stroke-width="3.2"/><path d="M18 26L112 25" stroke-width="3"/>
       <circle cx="12" cy="25" r="7" stroke-width="3"/><circle cx="56" cy="30" r="4" stroke-width="1.6"/><circle cx="74" cy="30" r="3.4" stroke-width="1.6"/>
     </g>
     <path d="M108 3h22a5 5 0 0 1 0 10h-6l-8 6h-8Z" fill="url(#chrome)"/>
     <g filter="url(#glaze)"><path d="M56 60C46 53 44 47 46 43C48 39 53 39 56 43C59 39 64 39 66 43C68 47 66 53 56 60Z" fill="url(#chrome)" transform="translate(0 -4)"/></g>`));
add("paperclip", "clips", "paperclip", 50, () =>
  svg("0 0 50 130", `<path d="M33 30V100a10 10 0 0 1-20 0V22a15 15 0 0 1 30 0V108a19 19 0 0 1-38 0V40" fill="none" stroke="url(#chrome)" stroke-width="3.4" stroke-linecap="round"/>`));
for (const [k, c] of Object.entries({ cream: "#efe6d3", pink: "#f2b5c9", sky: "#b9d3f0" })) {
  add(`pushpin-${k}`, "clips", `${k} push pin`, 70, () =>
    svg("0 0 70 110",
      `<path d="M37 62L52 104" stroke="#8b8e93" stroke-width="3" stroke-linecap="round"/>
       <g filter="url(#glaze)">
         <path d="M14 14C14 6 46 2 48 10C50 16 44 18 42 22L46 44C56 46 60 54 56 60C50 70 20 70 14 62C10 54 18 46 28 44L26 22C22 20 14 20 14 14Z" fill="${c}" transform="rotate(-18 35 36)"/>
       </g>`));
}
const PIX_ARROW = ["X", "XX", "X.X", "X..X", "X...X", "X....X", "X.....X", "X......X", "X.......X", "X....XXXXX", "X..X..X", "X.X X..X", "XX  X..X", "X    X..X", "     X..X", "      XX"];
const PIX_HAND = ["    XX", "   X..X", "   X..X", "   X..X", "   X..XXX", "   X..X..XXX", "XX X..X..X..XX", "X..X.........X", "X..X.........X", " X...........X", " X..........X", "  X.........X", "  X........X", "   X.......X", "   X.......X", "   XXXXXXXXX"];
const pixel = (rows) => {
  let r = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "X") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="#111"/>`;
    if (ch === ".") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="#fff"/>`;
  }));
  return r;
};
add("cursor-arrow", "clips", "pixel cursor", 60, () => svg("-0.5 -0.5 11 17", pixel(PIX_ARROW)));
add("cursor-hand", "clips", "pixel hand", 70, () => svg("-0.5 -0.5 15 17", pixel(PIX_HAND)));
add("wax-seal", "clips", "wax seal", 70, () =>
  svg("0 0 100 100",
    `<g filter="url(#glaze)"><path d="M50 6C62 4 66 12 76 14C88 18 94 28 94 40C96 52 90 58 92 68C90 82 78 90 66 92C56 96 46 94 36 92C22 90 10 80 8 66C6 54 4 46 8 36C12 20 30 8 50 6Z" fill="#7e98c4"/></g>
     <circle cx="50" cy="50" r="28" fill="none" stroke="#5f79a6" stroke-width="2.5"/>
     <path d="M50 50C42 40 30 42 32 50C34 58 44 56 50 50ZM50 50C58 40 70 42 68 50C66 58 56 56 50 50Z M48 52L42 64M52 52L58 64" fill="none" stroke="#4e6894" stroke-width="2.4" stroke-linecap="round"/>`));

// ===== BUTTONS =====
function roundButton(id, paint, defs = "", holes = 4, thread = null, rim = null) {
  const h = holes === 4 ? [[42, 42], [58, 42], [42, 58], [58, 58]] : [[40, 50], [60, 50]];
  const th = thread ? `<path d="M42 42L58 58M58 42L42 58" stroke="${thread}" stroke-width="4.5" stroke-linecap="round"/>` : "";
  return svg("0 0 100 100",
    `<g filter="url(#glaze)"><circle cx="50" cy="50" r="44" fill="${paint}"/></g>
     <circle cx="50" cy="50" r="31" fill="none" stroke="${rim || "rgba(0,0,0,.12)"}" stroke-width="3"/>
     ${h.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="rgba(0,0,0,.28)"/><circle cx="${x}" cy="${y + 0.8}" r="4.2" fill="#fff" opacity=".9"/>`).join("")}${th}`, defs);
}
const BTN = { blush: "#f3c6d3", rose: "#d9668a", cocoa: "#6e4630", cream: "#f2ead8", butter: "#efcf5f", lilac: "#cdb8ea", mint: "#a9dcc8", sky: "#a8c8ee" };
for (const [k, c] of Object.entries(BTN)) {
  const id = `g-btn-${k}`;
  add(`button-${k}`, "buttons", `${k} button`, 70, () => roundButton(id, `url(#${id})`, enamel(id, c), k === "cocoa" || k === "rose" ? 4 : k === "butter" ? 2 : 4, k === "blush" ? "#fff" : null));
}
add("button-gingham", "buttons", "gingham button", 70, () => roundButton("p-gb", "url(#p-gb)", gingham("p-gb", "#c8423f", 7), 4, "#f4e7c8"));
add("button-polka", "buttons", "polka button", 70, () =>
  roundButton("p-pb", "url(#p-pb)", `<pattern id="p-pb" width="11" height="11" patternUnits="userSpaceOnUse"><rect width="11" height="11" fill="#ee5f99"/><circle cx="3" cy="3" r="1.4" fill="#f9e38a"/><circle cx="8.5" cy="8.5" r="1.4" fill="#f9e38a"/></pattern>`, 4, "#f4dc9a"));
add("button-choc-dot", "buttons", "cocoa dot button", 70, () =>
  roundButton("p-cd", "url(#p-cd)", `<pattern id="p-cd" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#4b2e22"/><circle cx="4" cy="4" r="2.4" fill="#c8b2a6"/><circle cx="11" cy="11" r="2.4" fill="#c8b2a6"/></pattern>`, 4, "#e9dcd2"));
add("button-heart", "buttons", "heart button", 70, () =>
  svg("0 0 100 100",
    `<g filter="url(#glaze)"><path d="M50 90C18 68 6 50 6 33C6 18 17 8 30 8C40 8 46 14 50 22C54 14 60 8 70 8C83 8 94 18 94 33C94 50 82 68 50 90Z" fill="url(#g-bh)"/></g>
     ${[[42, 40], [58, 40], [42, 54], [58, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y + 0.7}" r="3.6" fill="#fff"/>`).join("")}`,
    enamel("g-bh", "#f1a7c2")));
add("button-heart-nude", "buttons", "latte heart button", 70, () =>
  svg("0 0 100 100",
    `<g filter="url(#glaze)"><path d="M50 90C18 68 6 50 6 33C6 18 17 8 30 8C40 8 46 14 50 22C54 14 60 8 70 8C83 8 94 18 94 33C94 50 82 68 50 90Z" fill="url(#g-bhn)"/></g>
     ${[[42, 40], [58, 40], [42, 54], [58, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y + 0.7}" r="3.6" fill="#fff"/>`).join("")}`,
    enamel("g-bhn", "#e7c2a4")));
add("button-flower", "buttons", "flower button", 72, () => {
  const petals = [0, 72, 144, 216, 288].map((a) => { const r = (a - 90) * Math.PI / 180; return `<circle cx="${f2(50 + 26 * Math.cos(r))}" cy="${f2(50 + 26 * Math.sin(r))}" r="21"/>`; }).join("");
  return svg("0 0 100 100", `<g filter="url(#glaze)"><g fill="url(#g-bf)">${petals}<circle cx="50" cy="50" r="24"/></g></g>
    <circle cx="50" cy="50" r="15" fill="#fff" opacity=".9"/><circle cx="44" cy="50" r="3.4" fill="#d4547c"/><circle cx="56" cy="50" r="3.4" fill="#d4547c"/>`, enamel("g-bf", "#f08fb2"));
});
add("button-daisy", "buttons", "daisy button", 72, () => {
  const petals = Array.from({ length: 8 }, (_, i) => { const r = (i * 45) * Math.PI / 180; return `<circle cx="${f2(50 + 30 * Math.cos(r))}" cy="${f2(50 + 30 * Math.sin(r))}" r="16"/>`; }).join("");
  return svg("0 0 100 100", `<g filter="url(#glaze)"><g fill="#f6efe1">${petals}<circle cx="50" cy="50" r="30"/></g><circle cx="50" cy="50" r="20" fill="url(#g-bd)"/></g>
    <path d="M44 44L56 56M56 44L44 56" stroke="#efe4d8" stroke-width="3.6" stroke-linecap="round"/>`, enamel("g-bd", "#5a3426"));
});
add("button-star", "buttons", "star button", 75, () =>
  svg("0 0 100 100",
    `<g filter="url(#glaze)"><path d="${starD(50, 54, 40, 21)}" fill="url(#g-bs)" stroke="url(#g-bs)" stroke-width="12" stroke-linejoin="round"/></g>
     <path d="${starD(50, 54, 30, 15)}" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2.5" stroke-linejoin="round"/>
     ${[[44, 48], [56, 48], [44, 60], [56, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y + 0.6}" r="3" fill="#fff"/>`).join("")}`,
    enamel("g-bs", "#f0a7b4")));
add("button-star-yellow", "buttons", "sunny star button", 75, () =>
  svg("0 0 100 100",
    `<g filter="url(#glaze)"><path d="${starD(50, 54, 40, 21)}" fill="url(#g-bsy)" stroke="url(#g-bsy)" stroke-width="12" stroke-linejoin="round"/></g>
     <circle cx="50" cy="46" r="6" fill="rgba(0,0,0,.2)"/><circle cx="50" cy="47" r="5" fill="#fff"/><circle cx="50" cy="64" r="6" fill="rgba(0,0,0,.2)"/><circle cx="50" cy="65" r="5" fill="#fff"/>`,
    enamel("g-bsy", "#f1c533")));
add("button-bunny", "buttons", "bunny button", 72, () =>
  svg("0 0 100 110",
    `<g filter="url(#glaze)" fill="url(#g-bb)"><ellipse cx="34" cy="28" rx="11" ry="26"/><ellipse cx="66" cy="28" rx="11" ry="26"/><circle cx="50" cy="70" r="36"/></g>
     <ellipse cx="34" cy="30" rx="5" ry="16" fill="#f4d8c4" opacity=".7"/><ellipse cx="66" cy="30" rx="5" ry="16" fill="#f4d8c4" opacity=".7"/>
     <circle cx="38" cy="70" r="7" fill="rgba(0,0,0,.18)"/><circle cx="38" cy="71" r="6" fill="#fff"/><circle cx="62" cy="70" r="7" fill="rgba(0,0,0,.18)"/><circle cx="62" cy="71" r="6" fill="#fff"/>`,
    enamel("g-bb", "#f1dcbf")));

// ===== CHARMS (glazed ceramic) =====
const charm = (id, name, base, body, defs = "") => add(id, "charms", name, base, () => svg("0 0 100 100", `<g filter="url(#glaze)">${body}</g>`, defs));
charm("charm-bow-pink", "pink bow", 90,
  `<g fill="#f3b5c6" stroke="#e897ad" stroke-width="1"><path d="M50 45C35 25 10 25 12 45C14 62 38 58 50 45Z"/><path d="M50 45C65 25 90 25 88 45C86 62 62 58 50 45Z"/><path d="M46 48L32 82L44 76L50 50Z"/><path d="M54 48L68 82L56 76L50 50Z"/><ellipse cx="50" cy="46" rx="8" ry="7"/></g>`);
charm("charm-bow-blue", "blue bow", 90,
  `<g fill="#2f4b8f"><path d="M50 45C35 25 10 25 12 45C14 62 38 58 50 45Z"/><path d="M50 45C65 25 90 25 88 45C86 62 62 58 50 45Z"/><path d="M46 48L32 82L44 76L50 50Z"/><path d="M54 48L68 82L56 76L50 50Z"/><ellipse cx="50" cy="46" rx="8" ry="7"/></g><circle cx="50" cy="46" r="2.6" fill="#fff"/>`);
charm("charm-wing", "angel wing", 100,
  `<path d="M14 62C6 40 24 20 50 22C70 24 88 28 94 38C84 40 88 48 76 50C80 57 70 60 62 58C62 67 50 69 42 64C35 70 22 70 14 62Z" fill="#f7f6f2" stroke="#e6e3db" stroke-width="1"/>
   <path d="M30 46C44 40 60 38 80 40M28 54C40 50 50 50 60 52" stroke="#e1ddd3" stroke-width="2" fill="none" stroke-linecap="round"/>`);
charm("charm-clover", "clover", 80,
  `${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a} 50 50)"><circle cx="40" cy="30" r="13" fill="#3f8a46"/><circle cx="60" cy="30" r="13" fill="#3f8a46"/><path d="M28 34L50 50L72 34Z" fill="#3f8a46"/></g>`).join("")}<path d="M50 52Q58 74 70 90" stroke="#3f8a46" stroke-width="5" fill="none" stroke-linecap="round"/>`);
charm("charm-moon", "moon", 80, `<path d="M62 8A42 42 0 1 0 62 92A50 50 0 0 1 62 8Z" fill="#f4e7a6"/>`);
charm("charm-key", "key", 100,
  `<g fill="none" stroke="#f5f3ee" stroke-width="7" stroke-linecap="round"><path d="M50 30C42 18 28 22 32 32C36 40 50 44 50 44C50 44 64 40 68 32C72 22 58 18 50 30Z"/><path d="M50 44V92M50 74H62M50 84H60"/></g>`);
charm("charm-butterfly", "butterfly", 90,
  `<g fill="#f7c2c4"><ellipse cx="32" cy="36" rx="20" ry="17" transform="rotate(-20 32 36)"/><ellipse cx="68" cy="36" rx="20" ry="17" transform="rotate(20 68 36)"/><ellipse cx="36" cy="66" rx="14" ry="12" transform="rotate(20 36 66)"/><ellipse cx="64" cy="66" rx="14" ry="12" transform="rotate(-20 64 66)"/></g><rect x="46" y="28" width="8" height="48" rx="4" fill="#ea9aa2"/>`);
charm("charm-fish", "fish", 90,
  `<path d="M14 50C26 30 58 30 74 50C58 70 26 70 14 50Z" fill="#8fb5e6"/><path d="M72 50L94 34L90 50L94 66Z" fill="#8fb5e6"/><circle cx="30" cy="46" r="3.4" fill="#2b4a7a"/>`);
charm("charm-swirl-heart", "swirl heart", 85,
  `<path d="M50 90C18 68 6 50 6 33C6 18 17 8 30 8C40 8 46 14 50 22C54 14 60 8 70 8C83 8 94 18 94 33C94 50 82 68 50 90Z" fill="#c993b7"/>
   <path d="M50 46m0 0c3-3 8 0 6 4s-9 5-12 0 2-13 10-12 14 8 11 17-15 13-22 8" fill="none" stroke="#5d3b55" stroke-width="3.2" stroke-linecap="round"/>`);
charm("charm-bow-heart", "bow heart", 85,
  `<path d="M50 90C18 68 6 50 6 33C6 18 17 8 30 8C40 8 46 14 50 22C54 14 60 8 70 8C83 8 94 18 94 33C94 50 82 68 50 90Z" fill="#f7f4ee"/>
   <g fill="#4565a6" transform="translate(28 30) scale(.45)"><path d="M50 45C35 25 10 25 12 45C14 62 38 58 50 45Z"/><path d="M50 45C65 25 90 25 88 45C86 62 62 58 50 45Z"/><path d="M46 48L32 82L44 76L50 50Z"/><path d="M54 48L68 82L56 76L50 50Z"/><ellipse cx="50" cy="46" rx="8" ry="7"/></g>`);
charm("charm-flower", "daisy", 80,
  `${Array.from({ length: 6 }, (_, i) => { const r = (i * 60) * Math.PI / 180; return `<circle cx="${f2(50 + 26 * Math.cos(r))}" cy="${f2(50 + 26 * Math.sin(r))}" r="18" fill="#f4ec9c"/>`; }).join("")}<circle cx="50" cy="50" r="17" fill="#fbf8ef"/>`);
charm("charm-swirl-disc", "swirl disc", 80,
  `<circle cx="50" cy="50" r="42" fill="#f6f6f3"/><path d="M50 50c4-4 10 0 7 5s-12 6-15 0 3-16 13-14 17 11 13 21-19 16-27 9" fill="none" stroke="#7fb0e0" stroke-width="3.4" stroke-linecap="round"/>`);
charm("charm-blue-flower", "blue flower", 80,
  `${Array.from({ length: 6 }, (_, i) => { const r = (i * 60) * Math.PI / 180; return `<circle cx="${f2(50 + 24 * Math.cos(r))}" cy="${f2(50 + 24 * Math.sin(r))}" r="19" fill="#9ec2ec"/>`; }).join("")}<circle cx="50" cy="50" r="18" fill="#9ec2ec"/>
   <path d="M50 50c3-3 7 0 5 4s-9 4-11 0 2-12 10-11 13 8 10 16" fill="none" stroke="#f4f7fb" stroke-width="2.6" stroke-linecap="round"/>`);
charm("charm-cherry", "cherries", 85,
  `<path d="M36 70Q44 30 66 14M62 72Q60 40 66 14" stroke="#4f7a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M66 14Q80 10 86 22Q74 26 66 14Z" fill="#6aa84f"/><circle cx="34" cy="74" r="16" fill="#d8283b"/><circle cx="64" cy="76" r="16" fill="#d8283b"/>`);

// ---------- frames that hold a photo ----------
// each: viewBox w/h, the screen window (x,y,w,h, radius), art under, optional art over
export const FRAMES2 = {};
const frame = (id, name, base, w, h, scr, under, over = "", extra = null) => (FRAMES2[id] = { id, name, base, w, h, scr, under, over, extra });

function camera(id, name, body, accent, ink) {
  frame(id, name, 320, 200, 128, [14, 18, 112, 86, 3],
    svg("0 0 200 128",
      `<rect x="2" y="6" width="196" height="118" rx="14" fill="url(#${id}-b)"/>
       <rect x="2" y="6" width="196" height="118" rx="14" fill="none" stroke="${shade(body, -0.3)}" stroke-width="1.2"/>
       <rect x="120" y="1" width="42" height="9" rx="3" fill="${shade(body, -0.12)}"/>
       <rect x="8" y="12" width="124" height="98" rx="5" fill="#141416"/>
       <text x="12" y="120" font-family="DM Mono, monospace" font-size="5.5" fill="${ink}" letter-spacing="1">DIGI·CAM 7.2</text>
       <text x="145" y="20" font-family="DM Mono, monospace" font-size="5" fill="${ink}">MENU   DISP</text>
       <circle cx="166" cy="44" r="15" fill="url(#${id}-d)" stroke="${shade(body, -0.35)}" stroke-width="1"/>
       ${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${f2(166 + 11 * Math.cos(a))}" y1="${f2(44 + 11 * Math.sin(a))}" x2="${f2(166 + 14 * Math.cos(a))}" y2="${f2(44 + 14 * Math.sin(a))}" stroke="${ink}" stroke-width=".8"/>`; }).join("")}
       <circle cx="166" cy="88" r="17" fill="url(#${id}-d)" stroke="${shade(body, -0.35)}" stroke-width="1"/>
       <circle cx="166" cy="88" r="7" fill="${accent}" stroke="${shade(body, -0.35)}" stroke-width=".8"/>
       <path d="M166 74l3 4h-6Z M166 102l3-4h-6Z M152 88l4-3v6Z M180 88l-4-3v6Z" fill="${ink}"/>
       <circle cx="146" cy="112" r="4" fill="url(#${id}-d)"/><circle cx="186" cy="112" r="4" fill="url(#${id}-d)"/>
       <circle cx="186" cy="62" r="2.5" fill="#d33"/>`,
      lin(`${id}-b`, [[0, shade(body, 0.4)], [0.5, body], [1, shade(body, -0.2)]], 1, 1) + rad(`${id}-d`, [[0, "#fff"], [0.6, shade(body, 0.1)], [1, shade(body, -0.35)]])));
}
camera("cam-silver", "silver digicam", "#c4c6c9", "#e9eaec", "#4a4c50");
camera("cam-pink", "pink digicam", "#e9b4cd", "#f6d9e6", "#7a3f5c");
camera("cam-black", "black digicam", "#2c2c30", "#55555a", "#c9c9cc");
camera("cam-champagne", "champagne digicam", "#cdb9a2", "#efe2d2", "#5a4a3a");

frame("phone", "candybar phone", 190, 120, 200, [20, 26, 80, 68, 4],
  svg("0 0 120 200",
    `<rect x="4" y="2" width="112" height="196" rx="28" fill="url(#ph-b)" stroke="#8d9198" stroke-width="1.4"/>
     <rect x="14" y="18" width="92" height="84" rx="8" fill="#1a1a1d"/>
     <rect x="50" y="9" width="20" height="3" rx="1.5" fill="#6f7277"/>
     <path d="M20 108h22l-2 6h-18Z M100 108h-22l2 6h18Z" fill="#9fa3a9"/>
     <circle cx="60" cy="122" r="11" fill="url(#ph-k)" stroke="#8d9198"/><circle cx="60" cy="122" r="4" fill="#f2a6c3"/>
     ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${18 + c * 30}" y="${140 + r * 13}" width="24" height="10" rx="5" fill="url(#ph-k)" stroke="#9fa3a9" stroke-width=".6"/><text x="${30 + c * 30}" y="${147.5 + r * 13}" text-anchor="middle" font-family="DM Mono, monospace" font-size="6" fill="#55585e">${"123456789*0#"[r * 3 + c]}</text>`).join("")).join("")}`,
    lin("ph-b", [[0, "#f1f2f4"], [0.5, "#c3c6cb"], [1, "#9a9ea5"]], 1, 0) + rad("ph-k", [[0, "#fff"], [1, "#d5d8dc"]])),
  `<path d="M20 26h40L20 70Z" fill="#fff" opacity=".12"/>`);

frame("player", "mp3 player", 170, 110, 180, [12, 12, 86, 80, 4],
  svg("0 0 110 180",
    `<rect x="2" y="2" width="106" height="176" rx="16" fill="url(#pl-b)"/>
     <rect x="8" y="8" width="94" height="88" rx="6" fill="#f8eef2" stroke="#d9a6bb" stroke-width="1"/>
     <circle cx="55" cy="136" r="32" fill="#fbeef3" stroke="#e3b6c8" stroke-width="1.2"/>
     <circle cx="55" cy="136" r="12" fill="url(#pl-b)"/>
     <text x="55" y="114" text-anchor="middle" font-family="DM Mono, monospace" font-size="6.5" fill="#b77290" letter-spacing="1">MENU</text>
     <path d="M30 133l-6 3 6 3Z M24 133v6 M80 133l6 3-6 3Z M86 133v6 M52 160v6 M57 160v6" stroke="#b77290" stroke-width="1.2" fill="#b77290"/>`,
    lin("pl-b", [[0, "#f6cfdd"], [1, "#e3a2bd"]], 1, 1)));

frame("tv", "retro tv", 330, 220, 160, [16, 16, 136, 118, 22],
  svg("0 0 220 160",
    `<rect x="2" y="2" width="216" height="146" rx="20" fill="url(#tv-b)" stroke="#c45d8d" stroke-width="1.4"/>
     <rect x="10" y="10" width="148" height="130" rx="26" fill="#c45d8d"/>
     <circle cx="188" cy="36" r="14" fill="url(#tv-k)" stroke="#b0517d"/><rect x="186" y="24" width="4" height="12" rx="2" fill="#b0517d"/>
     <circle cx="188" cy="72" r="11" fill="url(#tv-k)" stroke="#b0517d"/><rect x="186" y="63" width="4" height="9" rx="2" fill="#b0517d"/>
     ${Array.from({ length: 6 }, (_, i) => `<rect x="172" y="${96 + i * 6}" width="32" height="2.4" rx="1.2" fill="#b0517d"/>`).join("")}
     <path d="M200 16l2.4-4 2.4 4-2.4 4Z" fill="#fff"/>
     <path d="M30 148l-8 10h8l6-10Z M190 148l8 10h-8l-6-10Z" fill="#b0517d"/>`,
    lin("tv-b", [[0, "#f7a9cb"], [1, "#e478a8"]], 1, 1) + rad("tv-k", [[0, "#fff"], [0.7, "#f6b9d3"], [1, "#d36b9a"]])),
  `<rect x="16" y="16" width="136" height="118" rx="22" fill="url(#tv-glare)"/><defs>${lin("tv-glare", [[0, "#fff", 0.28], [0.4, "#fff", 0], [1, "#000", 0.12]], 1, 1)}</defs>`);

frame("idcard", "vintage id card", 320, 240, 150, [16, 40, 62, 80, 2],
  svg("0 0 240 150",
    `<rect x="2" y="2" width="236" height="146" rx="12" fill="#f1ece0" stroke="#9e9682" stroke-width="1.4"/>
     ${Array.from({ length: 14 }, (_, i) => `<circle cx="${20 + (i * 37) % 220}" cy="${18 + (i * 53) % 120}" r="${6 + (i % 3) * 3}" fill="#d9c9c4" opacity=".35"/>`).join("")}
     ${Array.from({ length: 11 }, (_, i) => `<rect x="${8 + i * 21}" y="4" width="8" height="142" fill="#e5ddcc" opacity=".45"/>`).join("")}
     <text x="12" y="26" font-family="Pinyon Script, cursive" font-size="17" fill="#4d473c">Identification Card</text>
     <text x="226" y="20" text-anchor="end" font-family="DM Mono, monospace" font-size="5" fill="#6f6758">no. 0214 2026</text>
     <rect x="13" y="37" width="68" height="86" fill="#fff" stroke="#9e9682" stroke-width="1"/>
     <text x="16" y="132" font-family="Pinyon Script, cursive" font-size="7" fill="#6f6758">photograph of individual</text>
     ${["Name", "Date of birth", "Nickname"].map((t, i) => `<text x="96" y="${56 + i * 22}" font-family="Instrument Serif, serif" font-size="9" fill="#4d473c">${t}</text><line x1="${t === "Name" ? 124 : t === "Nickname" ? 136 : 146}" y1="${57 + i * 22}" x2="226" y2="${57 + i * 22}" stroke="#7f7766" stroke-width=".6" stroke-dasharray="1 1"/>`).join("")}
     <text x="96" y="128" font-family="Instrument Serif, serif" font-size="9" fill="#4d473c">Signature</text><line x1="134" y1="129" x2="226" y2="129" stroke="#7f7766" stroke-width=".6"/>`),
  "",
  (it, esc) => `<div class="fr-text" style="left:52%;top:28%;font-family:'Homemade Apple',cursive;font-size:.62em">${esc(it.caption || "")}</div>`);

frame("felt", "felt frame", 230, 160, 200, [24, 22, 112, 156, 6],
  svg("0 0 160 200",
    `<g filter="url(#felt)"><path fill-rule="evenodd" d="M16 4h128a12 12 0 0 1 12 12v168a12 12 0 0 1-12 12H16a12 12 0 0 1-12-12V16A12 12 0 0 1 16 4Z M30 22h100a6 6 0 0 1 6 6v144a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6Z" fill="#ef9fbf"/></g>
     <path fill-rule="evenodd" d="M16 4h128a12 12 0 0 1 12 12v168a12 12 0 0 1-12 12H16a12 12 0 0 1-12-12V16A12 12 0 0 1 16 4Z M30 22h100a6 6 0 0 1 6 6v144a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6Z" fill="none" stroke="#fbd9e6" stroke-width="1" stroke-dasharray="2 2"/>`),
  svg("0 0 160 200",
    `${[40, 80, 120, 160].map((y) => `<circle cx="146" cy="${y}" r="4.5" fill="url(#chromeRose)" stroke="#a86f88"/><circle cx="146" cy="${y}" r="2" fill="#f6dbe6"/>`).join("")}
     <path d="M146 40C162 52 162 68 146 80C162 92 162 108 146 120C162 132 162 148 146 160" fill="none" stroke="#f3c08f" stroke-width="2.2" stroke-linecap="round"/>`));

frame("burst", "starburst frame", 250, 180, 200, [42, 46, 100, 120, 2],
  svg("0 0 180 200",
    `<path d="${starD(90, 104, 92, 62, 14, -80)}" fill="#ee9cc4"/>
     <rect x="34" y="38" width="116" height="136" fill="#fdf4f8" stroke="#f2bdd5" stroke-width="2"/>
     <rect x="40" y="44" width="104" height="124" fill="none" stroke="#f4c6db" stroke-width="2"/>`),
  svg("0 0 180 200",
    `<path d="M44 6C40 18 46 30 42 44" fill="none" stroke="#9fa3a8" stroke-width="1.2"/><circle cx="44" cy="6" r="3" fill="none" stroke="#9fa3a8"/>
     <g filter="url(#glaze)"><path d="M42 60C34 54 30 49 32 45C34 41 39 41 42 45C45 41 50 41 52 45C54 49 50 54 42 60Z" fill="url(#chrome)" transform="translate(0 -6)"/></g>`));

frame("bowframe", "ribbon frame", 250, 180, 200, [30, 22, 120, 124, 1],
  svg("0 0 180 200",
    `<rect x="14" y="14" width="152" height="176" fill="#ece4d6" transform="rotate(4 90 100)"/>
     <rect x="16" y="10" width="148" height="176" fill="#f6f1e7" stroke="#e2d9c8" transform="rotate(-2 90 100)"/>
     <rect x="22" y="14" width="136" height="168" fill="#fbf8f1" stroke="#e7dfcf"/>`),
  svg("0 0 180 200",
    `<path d="M-2 166L182 136L182 152L-2 182Z" fill="#c4577f"/><path d="M-2 170L182 140" stroke="#e18aab" stroke-width="1"/>
     <g filter="url(#glaze)" fill="#c4577f"><path d="M140 146C126 124 104 126 108 140C112 154 132 152 140 146Z"/><path d="M140 146C160 128 180 136 172 150C164 162 146 156 140 146Z"/><path d="M136 150L120 190L132 184L140 152Z"/><path d="M144 150L158 192L148 186L140 152Z"/><ellipse cx="140" cy="147" rx="8" ry="6"/></g>`));

frame("window", "pop-up window", 290, 200, 170, [14, 32, 172, 124, 8],
  svg("0 0 200 170",
    `<rect x="2" y="2" width="196" height="166" rx="16" fill="url(#win-b)" stroke="#d76d93" stroke-width="1.4"/>
     <rect x="10" y="28" width="180" height="132" rx="10" fill="#fbeaf0"/>
     <rect x="168" y="7" width="20" height="16" rx="5" fill="#f1a3c0"/><path d="M174 11l8 8M182 11l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    lin("win-b", [[0, "#f5a9c4"], [1, "#e47ca2"]])));

// ---------- clip-card papers (text inside) ----------
function scallopPath(x, y, w, h, r) {
  const nx = Math.max(2, Math.round(w / (r * 2))), ny = Math.max(2, Math.round(h / (r * 2)));
  const sx = w / nx, sy = h / ny;
  let d = `M${x} ${y}`;
  for (let i = 0; i < nx; i++) d += `a${f2(sx / 2)} ${f2(sx / 2.2)} 0 0 1 ${f2(sx)} 0`;
  for (let i = 0; i < ny; i++) d += `a${f2(sy / 2.2)} ${f2(sy / 2)} 0 0 1 0 ${f2(sy)}`;
  for (let i = 0; i < nx; i++) d += `a${f2(sx / 2)} ${f2(sx / 2.2)} 0 0 1 ${f2(-sx)} 0`;
  for (let i = 0; i < ny; i++) d += `a${f2(sy / 2.2)} ${f2(sy / 2)} 0 0 1 0 ${f2(-sy)}`;
  return d + "Z";
}
function wavyRect(x, y, w, h, amp, n) {
  const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  let d = `M${x} ${y}`;
  for (let e = 0; e < 4; e++) {
    const [x1, y1] = c[e], [x2, y2] = c[e + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const k = Math.max(2, Math.round((n * len) / w));
    const ux = (x2 - x1) / k, uy = (y2 - y1) / k, ul = Math.hypot(ux, uy);
    const nx = -uy / ul, ny = ux / ul;
    for (let i = 0; i < k; i++) {
      const sx = x1 + ux * i, sy = y1 + uy * i, s = i % 2 ? -amp : amp;
      d += `Q${f2(sx + ux / 2 + nx * s)} ${f2(sy + uy / 2 + ny * s)} ${f2(sx + ux)} ${f2(sy + uy)}`;
    }
  }
  return d + "Z";
}
export const CARDS = {};
const card = (id, name, base, w, h, txt, art, sample) => (CARDS[id] = { id, name, base, w, h, txt, art, sample });
const clipAt = (k, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${LIB["clip-" + k].html().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
const libAt = (id, x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${LIB[id].html().replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;

card("cc-scallop", "scallop card", 300, 300, 240, [48, 74, 210, 120],
  () => svg("0 0 300 240",
    `<rect x="20" y="50" width="250" height="180" fill="url(#gg-blue)" transform="rotate(-3 145 140)"/>
     <path d="${scallopPath(30, 36, 240, 180, 9)}" fill="#f8f3e8" stroke="#e8e0cf" stroke-width="1"/>
     <path d="${wavyRect(44, 50, 212, 152, 2.2, 22)}" fill="none" stroke="#c8333b" stroke-width="2"/>
     ${clipAt("sky", 110, -4, 0.85)}${libAt("wax-seal", 236, 176, 0.46)}${libAt("star-chrome-silver", 4, 184, 0.42, -15)}`,
    gingham("gg-blue", "#7e9fd6", 10)), "dear diary, today was soft");

card("cc-oval", "oval label", 300, 300, 240, [62, 86, 176, 92],
  () => svg("0 0 300 240",
    `<rect x="18" y="58" width="250" height="170" fill="url(#gg-sage)" transform="rotate(4 145 140)"/>
     <ellipse cx="150" cy="136" rx="128" ry="92" fill="#f8f4ea" stroke="#e5ddcc"/>
     <ellipse cx="150" cy="136" rx="116" ry="80" fill="none" stroke="#7c8d79" stroke-width="1.6"/><ellipse cx="150" cy="136" rx="111" ry="75" fill="none" stroke="#7c8d79" stroke-width=".8"/>
     ${clipAt("cream", 104, 8, 0.9)}${libAt("button-heart-nude", 22, 178, 0.48, -20)}${libAt("star-jelly-lime", 238, 96, 0.4, 12)}`,
    gingham("gg-sage", "#8b9c88", 10)), "little things i loved today");

card("cc-ring", "ring notebook", 300, 300, 240, [56, 60, 210, 140],
  () => svg("0 0 300 240",
    `<rect x="40" y="30" width="240" height="196" fill="#8b1f2b" transform="rotate(3 160 128)"/>
     <rect x="24" y="24" width="244" height="190" rx="4" fill="#f8f3e9" stroke="#e4dccb"/>
     ${Array.from({ length: 11 }, (_, i) => `<rect x="32" y="${36 + i * 16}" width="10" height="6" rx="2" fill="#8b1f2b"/>`).join("")}
     ${clipAt("red", 126, -10, 0.85)}${libAt("charm-bow-pink", 232, 20, 0.5, 15).replace(/#f3b5c6|#e897ad/g, "#c83b46")}`),
  "to do: nothing. that's the plan.");

card("cc-dash", "dashed card", 300, 300, 240, [50, 70, 200, 130],
  () => svg("0 0 300 240",
    `<rect x="14" y="54" width="250" height="176" fill="url(#gg-butter)" transform="rotate(-4 140 140)"/>
     <rect x="30" y="40" width="240" height="180" rx="12" fill="#f9f5ec" stroke="#e7dfcc"/>
     <rect x="40" y="50" width="220" height="160" rx="8" fill="none" stroke="#d6b65a" stroke-width="1.6" stroke-dasharray="6 4"/>
     ${clipAt("butter", 150, -2, 0.85)}${libAt("button-star", 34, 12, 0.5, -12)}`,
    gingham("gg-butter", "#e6c75e", 10)), "summer plans:");

card("cc-pink", "pink oval", 300, 300, 240, [62, 86, 176, 92],
  () => svg("0 0 300 240",
    `<rect x="34" y="52" width="244" height="172" fill="#f2b7c7" transform="rotate(5 150 140)"/>
     <ellipse cx="150" cy="136" rx="126" ry="90" fill="#fbf6f0" stroke="#efd7dc"/>
     <ellipse cx="150" cy="136" rx="114" ry="78" fill="none" stroke="#e58aa6" stroke-width="1.4"/><ellipse cx="150" cy="136" rx="109" ry="73" fill="none" stroke="#e58aa6" stroke-width=".7"/>
     ${clipAt("pink", 104, 8, 0.9)}${libAt("star-chrome-silver", 12, 176, 0.5, -18)}${libAt("charm-bow-pink", 236, 170, 0.5, 10)}`),
  "a note for future me");

card("cc-popup", "pop-up note", 300, 300, 230, [32, 62, 236, 140],
  () => svg("0 0 300 230",
    `<rect x="4" y="4" width="292" height="222" rx="20" fill="url(#pop-b)" stroke="#d76d93" stroke-width="1.6"/>
     <rect x="14" y="40" width="272" height="176" rx="14" fill="#fbeaf0"/>
     <rect x="256" y="10" width="28" height="22" rx="7" fill="#f1a3c0"/><path d="M264 15l12 12M276 15l-12 12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
     <circle cx="26" cy="22" r="5" fill="#fbd3e1"/><circle cx="42" cy="22" r="5" fill="#fbd3e1"/>`,
    lin("pop-b", [[0, "#f5a9c4"], [1, "#e47ca2"]])), "new message: you're doing amazing");

card("cc-nowplaying", "now playing", 320, 320, 110, [92, 64, 210, 34],
  () => svg("0 0 320 110",
    `<rect x="4" y="4" width="312" height="102" rx="26" fill="#e2a4b4"/>
     <path d="M30 34l26 16-26 16Z" fill="#fff"/>
     ${Array.from({ length: 46 }, (_, i) => { const hgt = 4 + Math.abs(Math.sin(i * 0.7) * 18 + Math.sin(i * 1.9) * 8); return `<rect x="${78 + i * 5}" y="${36 - hgt / 2}" width="2.6" height="${f2(hgt)}" rx="1.3" fill="#fff" opacity="${i < 18 ? 1 : 0.6}"/>`; }).join("")}`),
  "song of the day");

export const FONTS = [
  { id: "", name: "paper default" },
  { id: "caveat", name: "Caveat", css: "'Caveat', cursive", k: 1.15 },
  { id: "gochi", name: "Gochi Hand", css: "'Gochi Hand', cursive", k: 1.05 },
  { id: "homemade", name: "Homemade Apple", css: "'Homemade Apple', cursive", k: 0.72 },
  { id: "nothing", name: "Nothing You Could Do", css: "'Nothing You Could Do', cursive", k: 0.85 },
  { id: "shadows", name: "Shadows Into Light", css: "'Shadows Into Light', cursive", k: 1 },
  { id: "reenie", name: "Reenie Beanie", css: "'Reenie Beanie', cursive", k: 1.25 },
  { id: "belle", name: "La Belle Aurore", css: "'La Belle Aurore', cursive", k: 0.9 },
  { id: "delafield", name: "Mrs Saint Delafield", css: "'Mrs Saint Delafield', cursive", k: 1.35 },
  { id: "pinyon", name: "Pinyon Script", css: "'Pinyon Script', cursive", k: 1.05 },
  { id: "serif", name: "Instrument Serif", css: "'Instrument Serif', serif", k: 1.1, italic: true },
  { id: "playfair", name: "Playfair italic", css: "'Playfair Display', serif", k: 0.9, italic: true },
  { id: "cherry", name: "Cherry Bomb", css: "'Cherry Bomb One', cursive", k: 0.95 },
  { id: "bubble", name: "Rubik Bubbles", css: "'Rubik Bubbles', cursive", k: 0.9 },
  { id: "typewriter", name: "Special Elite", css: "'Special Elite', monospace", k: 0.85 },
  { id: "courier", name: "Courier Prime", css: "'Courier Prime', monospace", k: 0.85 },
  { id: "pixel", name: "Silkscreen", css: "'Silkscreen', monospace", k: 0.75 },
  { id: "vt", name: "VT323", css: "'VT323', monospace", k: 1.1 },
  { id: "label", name: "Rubik Mono", css: "'Rubik Mono One', monospace", k: 0.7 },
];
export const INKS = { "": null, black: "#1b1b1e", blue: "#2a3c8f", red: "#b4232f", pink: "#d8347c", brown: "#6b4a2f", green: "#3e6b3f", silver: "#8a8d92", white: "#ffffff" };
