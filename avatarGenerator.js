/**
 * avatarGenerator.js
 *
 * Deterministic, dependency-free character avatar generator.
 *
 * A seed is derived from any given name string, which feeds a
 * pseudo-random number generator (PRNG). This PRNG decides -- always in
 * the same order -- all visual traits (skin tone, hairstyle, beard, eyes,
 * clothing, glasses, headwear, jewelry ...). Same name
 * => exact same PRNG call sequence => exact same avatar.
 *
 * No external libraries, fonts, images, or network requests. Everything is
 * assembled as a pure SVG string at runtime and can be inserted directly
 * into innerHTML / a view (MVC).
 *
 * @author    Chrisss666 (https://github.com/Chrisss666)
 * @copyright Copyright (c) 2026 Chrisss666. All Rights Reserved.
 * @license   Proprietary -- see LICENSE file. Use only permitted with
 *            the express permission of the author.
 */

// ---------------------------------------------------------------------------
// 1. Seed generation & PRNG
// ---------------------------------------------------------------------------

/**
 * FNV-1a hash: deterministically converts a string into a 32-bit
 * integer seed. Two identical strings always yield the same seed.
 */
function hashString(str) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG, wrapped with helper methods for trait selection.
 * Given the same seed, it always produces the same sequence of random values.
 */
function createPRNG(seed) {
  let state = seed >>> 0;

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function pick(array) {
    return array[Math.floor(next() * array.length)];
  }

  /**
   * Picks a value based on relative weights, e.g.
   * pickWeighted([['none', 60], ['glasses', 40]]) => 'none' is 1.5x
   * more likely than 'glasses'.
   */
  function pickWeighted(entries) {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [value, weight] of entries) {
      if (roll < weight) return value;
      roll -= weight;
    }
    return entries[entries.length - 1][0];
  }

  return { next, pick, pickWeighted };
}

// ---------------------------------------------------------------------------
// 2. Color utilities & curated palettes
// ---------------------------------------------------------------------------

/** Lightens (positive percent) or darkens (negative percent) a hex color. */
function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((num >> 16) + percent * 2.55);
  const g = clamp(((num >> 8) & 0xff) + percent * 2.55);
  const b = clamp((num & 0xff) + percent * 2.55);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Hand-picked palettes instead of raw random HSL values, so that every
// combination looks coherent.
const SKIN_TONES = [
  '#FFE0BD', '#FFCD94', '#F1C27D', '#E0AC69', '#C68642',
  '#A9673F', '#8D5524', '#6B4226', '#4A2E20', '#3B2219',
];
const HAIR_COLORS = [
  '#0A0A0A', '#2C1B18', '#4A2C1B', '#6B4226', '#8B5A2B',
  '#B08D57', '#C89B5C', '#E8C170', '#B7B7B7', '#EFEFEF',
  '#7A4B8A', '#3E6D9C', '#A83232',
];
const CLOTHING_COLORS = [
  '#3E5C76', '#5B8C5A', '#C1666B', '#7B4B94', '#D8A657',
  '#4B4E6D', '#2A6F77', '#B5495B', '#3F7157', '#8C5E3C',
];
// Diagonal two-color gradients instead of flat fills, for a higher-quality
// background look.
const BACKGROUND_GRADIENTS = [
  ['#FDE2A0', '#F7B76D'],
  ['#A7C4BC', '#5E9490'],
  ['#F4C6D7', '#C88FB0'],
  ['#B8D8D8', '#7FB2B0'],
  ['#F7B0A0', '#E2694F'],
  ['#9AD1D4', '#4C8C90'],
  ['#C6DABF', '#8CB380'],
  ['#D9C6F0', '#9C7ACB'],
  ['#FFD59E', '#F2994A'],
  ['#AEC6E8', '#5C7FB8'],
];
const IRIS_COLORS = ['#3B2412', '#5B3A29', '#1F6650', '#2E5C8A', '#6B6B6B', '#8A5A2B'];
const GLASSES_COLORS = ['#2B2B2B', '#5A3E2B', '#8C1C1C', '#1B3A4B'];
const HEADWEAR_COLORS = CLOTHING_COLORS;
const EARRING_METALS = ['#D4AF37', '#C8C8D0'];
const MOUTH_COLOR = '#8B3A3A';
const EYE_OUTLINE = '#20232a';

// Curated triads (background + 2 shape colors) for the "abstract" style --
// harmonious, saturated combinations instead of raw HSL values.
const ABSTRACT_PALETTES = [
  ['#264653', '#2A9D8F', '#E9C46A'],
  ['#F94144', '#F3722C', '#F9C74F'],
  ['#1D3557', '#457B9D', '#A8DADC'],
  ['#6A4C93', '#8AC926', '#FFCA3A'],
  ['#003049', '#D62828', '#F77F00'],
  ['#390099', '#9E0059', '#FF5C8A'],
  ['#0B4F6C', '#01BAEF', '#5AD2F4'],
  ['#3D5A80', '#98C1D9', '#EE6C4D'],
  ['#2B2D42', '#8D99AE', '#EF233C'],
  ['#1B4332', '#40916C', '#95D5B2'],
];

// Curated colors, sufficiently dark/saturated for the "initials" style,
// so white text on top always stays readable.
const INITIALS_COLORS = [
  '#E63946', '#F3722C', '#F9A826', '#43AA8B', '#2A9D8F',
  '#457B9D', '#5A189A', '#9D4EDD', '#C9184A', '#3A0CA3',
  '#1D3557', '#2B2D42', '#264653', '#0B4F6C', '#6A4C93',
];

// Consistent dark outline around every silhouette -- the main reason "flat"
// illustrations (Avataaars, Notionists, etc.) look high-quality instead of
// like pasted-on shapes. All silhouette shapes (head, ears, body, hair,
// beard, headwear) get the same outline.
const OUTLINE = '#20232a';
const OUTLINE_W = 1.6;
const STROKE_ATTRS = `stroke="${OUTLINE}" stroke-width="${OUTLINE_W}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------------------
// 3. Trait renderers
// ---------------------------------------------------------------------------
// Each function returns a ready-made SVG snippet string. The internal
// coordinate system is fixed to viewBox "0 0 100 100" so that all traits
// line up with each other regardless of the target output size.

function renderBackgroundGradient(gradientId, [colorA, colorB]) {
  return (
    `<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/>` +
    `</linearGradient>`
  );
}

// Shared upper head arc (cheek width at y=42, crown at y=21) -- used by both
// the head and the hairline, so both silhouettes blend seamlessly into each
// other (no more visible seam/gap like with ellipse+arc combinations).
const HEAD_TOP_ARC = 'M27 42 C27 29 38 21 50 21 C62 21 73 29 73 42';

// Body base (shoulders) + interchangeable neckline/collar detail.
function renderBody(clothingColor, variant) {
  const base = `<path d="M13 100 L13 88 C13 70 30 66 50 66 C70 66 87 70 87 88 L87 100 Z" fill="${clothingColor}" ${STROKE_ATTRS}/>`;
  const shadow = shadeColor(clothingColor, -18);
  const details = {
    crew: '',
    vneck: `<path d="M50 67 L41 81 L50 92 L59 81 Z" fill="${shadow}" ${STROKE_ATTRS}/>`,
    hoodie: `<path d="M17 82 C17 66 32 61 50 61 C68 61 83 66 83 82 C71 74 61 70 50 70 C39 70 29 74 17 82 Z" fill="${shadow}" ${STROKE_ATTRS}/>`,
    collar: `<path d="M37 68 L48 66 L44 79 Z" fill="#fbfbfb" ${STROKE_ATTRS}/><path d="M63 68 L52 66 L56 79 Z" fill="#fbfbfb" ${STROKE_ATTRS}/>`,
  };
  return base + (details[variant] || '');
}

function renderNeck(skinColor) {
  return `<rect x="42" y="58" width="16" height="24" fill="${skinColor}"/>`;
}

function renderEars(skinColor) {
  return (
    `<ellipse cx="26" cy="47" rx="4.2" ry="6" fill="${skinColor}" ${STROKE_ATTRS}/>` +
    `<ellipse cx="74" cy="47" rx="4.2" ry="6" fill="${skinColor}" ${STROKE_ATTRS}/>`
  );
}

// Face as 4 cubic Bezier segments instead of a flat ellipse: wider at the
// cheeks (y=42), narrowing towards the chin (y=72) -- looks like a real,
// drawn face instead of a plain geometric shape.
function renderHead(skinColor) {
  const d = `${HEAD_TOP_ARC} C73 58 66 72 50 72 C34 72 27 58 27 42 Z`;
  return `<path d="${d}" fill="${skinColor}" ${STROKE_ATTRS}/>`;
}

// Subtle contour shading + forehead highlight for a more three-dimensional,
// "higher-quality" impression instead of a completely flat surface.
function renderFaceShading(skinColor) {
  const shadow = shadeColor(skinColor, -14);
  const highlight = shadeColor(skinColor, 18);
  return (
    `<ellipse cx="50" cy="62" rx="16" ry="8.5" fill="${shadow}" opacity="0.22"/>` +
    `<ellipse cx="40" cy="31" rx="9" ry="5.5" fill="${highlight}" opacity="0.25"/>`
  );
}

function renderBlush() {
  return `<ellipse cx="36" cy="56" rx="4" ry="2.4" fill="#FF9E9E" opacity="0.45"/><ellipse cx="64" cy="56" rx="4" ry="2.4" fill="#FF9E9E" opacity="0.45"/>`;
}

function renderFreckles(skinShadow) {
  const points = [
    [35, 54], [38.5, 57], [32.5, 56.5],
    [65, 54], [61.5, 57], [67.5, 56.5],
  ];
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.55" fill="${skinShadow}" opacity="0.55"/>`).join('');
}

const EARRINGS = {
  none: () => '',
  stud: (color) =>
    `<circle cx="26" cy="52" r="1.3" fill="${color}" stroke="${OUTLINE}" stroke-width="0.8"/><circle cx="74" cy="52" r="1.3" fill="${color}" stroke="${OUTLINE}" stroke-width="0.8"/>`,
  hoop: (color) =>
    `<circle cx="26" cy="54" r="2.3" fill="none" stroke="${color}" stroke-width="1"/><circle cx="74" cy="54" r="2.3" fill="none" stroke="${color}" stroke-width="1"/>`,
};

const EYEBROWS = {
  flat: (color) =>
    `<rect x="35" y="36" width="10.5" height="2.6" rx="1.3" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/><rect x="54.5" y="36" width="10.5" height="2.6" rx="1.3" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/>`,
  angled: (color) =>
    `<path d="M35 40 L46 35" stroke="${color}" stroke-width="3" stroke-linecap="round"/><path d="M54 35 L65 40" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`,
  raised: (color) =>
    `<path d="M35 39 Q41 33 47 37" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M53 37 Q59 33 65 39" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  thick: (color) =>
    `<rect x="34" y="35" width="12.5" height="4.2" rx="2.1" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/><rect x="53.5" y="35" width="12.5" height="4.2" rx="2.1" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/>`,
  thin: (color) =>
    `<rect x="36" y="37.5" width="8.5" height="1.3" rx="0.65" fill="${color}"/><rect x="55.5" y="37.5" width="8.5" height="1.3" rx="0.65" fill="${color}"/>`,
};

// Eyes with sclera/iris/pupil/highlight instead of flat dots, plus a thin
// outline around the sclera for more depth.
function eyeWithIris(cx, cy, irisColor, r = 3.4) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${OUTLINE}" stroke-width="0.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="${irisColor}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="${EYE_OUTLINE}"/>` +
    `<circle cx="${cx + r * 0.25}" cy="${cy - r * 0.25}" r="${r * 0.18}" fill="#fff"/>`
  );
}
function arcEyeDown(x1, x2, y) {
  return `<path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y + 3} ${x2} ${y}" stroke="${EYE_OUTLINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
}
function arcEyeUp(x1, x2, y) {
  return `<path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y - 5} ${x2} ${y}" stroke="${EYE_OUTLINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
}

const EYES = {
  round: (iris) => eyeWithIris(41, 47, iris) + eyeWithIris(59, 47, iris),
  wide: (iris) => eyeWithIris(41, 47, iris, 4.4) + eyeWithIris(59, 47, iris, 4.4),
  sleepy: () => arcEyeDown(37, 45, 47) + arcEyeDown(55, 63, 47),
  happy: () => arcEyeUp(37, 45, 49) + arcEyeUp(55, 63, 49),
  wink: (iris) => eyeWithIris(41, 47, iris) + arcEyeDown(55, 63, 47),
  closed: () =>
    `<path d="M37 47 Q41 49 45 47" stroke="${EYE_OUTLINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M55 47 Q59 49 63 47" stroke="${EYE_OUTLINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
};

const NOSE = {
  simple: (skinShadow) =>
    `<path d="M50 48 Q47 55 48 57 Q50 59 52 57" stroke="${skinShadow}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  button: (skinShadow) => `<circle cx="50" cy="55" r="2.1" fill="${skinShadow}"/>`,
  wide: (skinShadow) =>
    `<path d="M46 48 Q44 56 50 58 Q56 56 54 48" stroke="${skinShadow}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const MOUTH = {
  smile: () => `<path d="M41 61 Q50 69 59 61" stroke="${MOUTH_COLOR}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  smallSmile: () => `<path d="M45 62 Q50 66 55 62" stroke="${MOUTH_COLOR}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  neutral: () => `<rect x="43" y="62" width="14" height="2.2" rx="1.1" fill="${MOUTH_COLOR}"/>`,
  grin: () =>
    `<path d="M40 60 Q50 71 60 60 Q50 67 40 60 Z" fill="#fff" stroke="${MOUTH_COLOR}" stroke-width="1.8" stroke-linejoin="round"/>`,
  smirk: () => `<path d="M42 63 Q52 67 58 59" stroke="${MOUTH_COLOR}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  surprised: () =>
    `<ellipse cx="50" cy="64" rx="3.2" ry="4.2" fill="${shadeColor(MOUTH_COLOR, -25)}" stroke="${MOUTH_COLOR}" stroke-width="1"/><ellipse cx="50" cy="66.5" rx="1.8" ry="1.3" fill="${MOUTH_COLOR}"/>`,
};

function stubbleDots(color) {
  const points = [
    [29, 56], [32, 61], [36, 66], [41, 70], [50, 72],
    [59, 70], [64, 66], [68, 61], [71, 56],
  ];
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="${color}" opacity="0.55"/>`).join('');
}

const FACIAL_HAIR = {
  none: () => '',
  stubble: (color) => stubbleDots(color),
  mustache: (color) => `<path d="M43 55 Q50 57.5 57 55 Q50 57 43 55 Z" fill="${color}" ${STROKE_ATTRS}/>`,
  goatee: (color) =>
    `<path d="M38 63 C36 72 40 82 50 84 C60 82 64 72 62 63 C58 69 42 69 38 63 Z" fill="${color}" ${STROKE_ATTRS}/>`,
  fullBeard: (color) =>
    `<path d="M28 50 C26 66 32 80 50 82 C68 80 74 66 72 50 C69 62 60 68 50 68 C40 68 31 62 28 50 Z" fill="${color}" ${STROKE_ATTRS}/>`,
  longBeard: (color) =>
    `<path d="M28 50 C25 68 30 88 50 96 C70 88 75 68 72 50 C69 62 60 68 50 68 C40 68 31 62 28 50 Z" fill="${color}" ${STROKE_ATTRS}/>`,
};

// Hairline cap: uses the exact same top arc as the head (see HEAD_TOP_ARC),
// so hair and head silhouette blend seamlessly into each other. The
// hairline consists of two Bezier segments: on the sides (near the ears,
// x=27/73) it reaches down to `sideY`, in the middle (forehead) only down to
// `centerY`. IMPORTANT: centerY must stay well above the eyebrow line
// (y=35), otherwise the hair covers the eyebrows/eyes/nose/mouth -- exactly
// the bug that an earlier pass introduced here (a single curve sagging too
// far down reached y=51+).
function hairCapPath(sideY, centerY) {
  return (
    `${HEAD_TOP_ARC} L73 ${sideY} ` +
    `C68 ${sideY} 62 ${centerY} 50 ${centerY} ` +
    `C38 ${centerY} 32 ${sideY} 27 ${sideY} Z`
  );
}

function curlyBumps(color) {
  return [
    [31, 29], [41, 22], [50, 19], [59, 22], [69, 29],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${color}" ${STROKE_ATTRS}/>`)
    .join('');
}

function wavySides(color) {
  return (
    `<path d="M27 45 Q21 58 28 72 Q23 80 30 87 L39 87 Q33 72 35 58 Q36 48 34 45 Z" fill="${color}" ${STROKE_ATTRS}/>` +
    `<path d="M73 45 Q79 58 72 72 Q77 80 70 87 L61 87 Q67 72 65 58 Q64 48 66 45 Z" fill="${color}" ${STROKE_ATTRS}/>`
  );
}

function afroShape(color) {
  const points = [
    [25, 30], [34, 14], [50, 10], [66, 14], [75, 30],
    [77, 46], [73, 63], [27, 63], [23, 46],
  ];
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10.5" fill="${color}" ${STROKE_ATTRS}/>`).join('');
}

const HAIR = {
  bald: () => '',
  buzz: (color) => `<path d="${hairCapPath(34, 24)}" fill="${color}" opacity="0.9" ${STROKE_ATTRS}/>`,
  short: (color) => `<path d="${hairCapPath(48, 30)}" fill="${color}" ${STROKE_ATTRS}/>`,
  curly: (color) => `<path d="${hairCapPath(46, 28)}" fill="${color}" ${STROKE_ATTRS}/>` + curlyBumps(color),
  wavy: (color) => `<path d="${hairCapPath(48, 30)}" fill="${color}" ${STROKE_ATTRS}/>` + wavySides(color),
  ponytail: (color) =>
    `<path d="${hairCapPath(44, 28)}" fill="${color}" ${STROKE_ATTRS}/>` +
    `<path d="M71 28 Q84 40 77 72 Q73 72 71 61 Q69 45 67 32 Z" fill="${color}" ${STROKE_ATTRS}/>`,
  bun: (color) =>
    `<path d="${hairCapPath(44, 28)}" fill="${color}" ${STROKE_ATTRS}/>` +
    `<circle cx="50" cy="14" r="7.5" fill="${color}" ${STROKE_ATTRS}/>`,
  afro: (color) => afroShape(color),
  mohawk: (color) => `<path d="M44 7 Q44 2 50 2 Q56 2 56 7 L58 32 Q50 26 42 32 Z" fill="${color}" ${STROKE_ATTRS}/>`,
};

const GLASSES = {
  none: () => '',
  round: (color) =>
    `<circle cx="41" cy="47" r="6.2" fill="none" stroke="${color}" stroke-width="2.2"/><circle cx="59" cy="47" r="6.2" fill="none" stroke="${color}" stroke-width="2.2"/><line x1="47.2" y1="47" x2="52.8" y2="47" stroke="${color}" stroke-width="2.2"/>`,
  square: (color) =>
    `<rect x="34.5" y="41" width="13" height="10.5" rx="2.5" fill="none" stroke="${color}" stroke-width="2.2"/><rect x="52.5" y="41" width="13" height="10.5" rx="2.5" fill="none" stroke="${color}" stroke-width="2.2"/><line x1="47.5" y1="45" x2="52.5" y2="45" stroke="${color}" stroke-width="2.2"/>`,
  sunglasses: (color) =>
    `<rect x="33.5" y="41.5" width="14.5" height="9.5" rx="3" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/><rect x="51.5" y="41.5" width="14.5" height="9.5" rx="3" fill="${color}" stroke="${OUTLINE}" stroke-width="1"/>` +
    `<rect x="47" y="45" width="6" height="2" fill="${color}"/>` +
    `<line x1="33.5" y1="44" x2="26" y2="46" stroke="${color}" stroke-width="1.6"/><line x1="66.5" y1="44" x2="74" y2="46" stroke="${color}" stroke-width="1.6"/>` +
    `<rect x="37" y="43.5" width="3" height="1.6" fill="#fff" opacity="0.3"/><rect x="55" y="43.5" width="3" height="1.6" fill="#fff" opacity="0.3"/>`,
};

const HEADWEAR = {
  none: () => '',
  cap: (color) =>
    `<path d="M25 36 C25 16 36 8 50 8 C64 8 75 16 75 36 Z" fill="${color}" ${STROKE_ATTRS}/>` +
    `<path d="M19 40 Q50 32 81 40 L74 35 Q50 29 26 35 Z" fill="${shadeColor(color, -15)}" ${STROKE_ATTRS}/>`,
  beanie: (color) =>
    `<path d="M24 42 C24 12 35 5 50 5 C65 5 76 12 76 42 Z" fill="${color}" ${STROKE_ATTRS}/>` +
    `<rect x="23" y="34" width="54" height="9" rx="4.5" fill="${shadeColor(color, -15)}" ${STROKE_ATTRS}/>`,
  bandana: (color) =>
    `<path d="M23 38 C23 14 35 8 50 8 C65 8 77 14 77 38 Q63 30 50 35 Q37 30 23 38 Z" fill="${color}" ${STROKE_ATTRS}/>` +
    `<circle cx="77" cy="36" r="3.2" fill="${shadeColor(color, -15)}" ${STROKE_ATTRS}/>`,
};

// Basic geometric shapes for the "abstract" style -- defined centered at
// (0,0) and placed via transform="translate(...) rotate(...)", so that
// rotation and position stay independent of each other.
function abstractCircle(cx, cy, r, color, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
}
function abstractRing(cx, cy, r, strokeWidth, color, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
}
function abstractTriangle(cx, cy, size, rotation, color, opacity) {
  const points = [
    [0, -size],
    [size * 0.87, size * 0.5],
    [-size * 0.87, size * 0.5],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  return `<polygon points="${points}" fill="${color}" opacity="${opacity}" transform="translate(${cx} ${cy}) rotate(${rotation})"/>`;
}
function abstractRect(cx, cy, size, rotation, color, opacity) {
  return `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" transform="translate(${cx} ${cy}) rotate(${rotation})"/>`;
}

const ABSTRACT_SHAPES = {
  circle: (cx, cy, size, rotation, color, opacity) => abstractCircle(cx, cy, size / 2, color, opacity),
  ring: (cx, cy, size, rotation, color, opacity) => abstractRing(cx, cy, size / 2, size * 0.2, color, opacity),
  triangle: (cx, cy, size, rotation, color, opacity) => abstractTriangle(cx, cy, size * 0.65, rotation, color, opacity),
  square: (cx, cy, size, rotation, color, opacity) => abstractRect(cx, cy, size, rotation, color, opacity),
};

// Derives 1-2 initials from a name for the "initials" style: for multiple
// words, the first letter of the first and last word; for a single word,
// its first one or two letters.
function computeInitials(seedSource) {
  const words = seedSource.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    const word = words[0];
    return (word.length >= 2 ? word.slice(0, 2) : word).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// 4. Composition
// ---------------------------------------------------------------------------

// Available values for options.style. "character" is the default and,
// for compatibility reasons, remains the implicit behavior when no style
// (or an unknown value) is provided.
const STYLES = ['character', 'abstract', 'initials'];

/**
 * "character" style: the detailed figure with skin tone, hairstyle, beard,
 * eyes, clothing, glasses, headwear, and jewelry (see section 3). Returns
 * the shared intermediate representation { backgroundFill, defs, content }.
 */
function renderCharacterAvatar(rand, seed) {
  // The order of rand calls is intentionally fixed -- this is the basis for
  // the determinism guarantee (same name => same draw order).
  const skinColor = rand.pick(SKIN_TONES);
  const hairColor = rand.pick(HAIR_COLORS);
  const irisColor = rand.pick(IRIS_COLORS);
  const clothingColor = rand.pick(CLOTHING_COLORS);
  const clothingVariant = rand.pick(['crew', 'vneck', 'hoodie', 'collar']);
  const backgroundGradient = rand.pick(BACKGROUND_GRADIENTS);
  const glassesColor = rand.pick(GLASSES_COLORS);
  const headwearColor = rand.pick(HEADWEAR_COLORS);
  const earringColor = rand.pick(EARRING_METALS);

  const eyebrowVariant = rand.pick(['flat', 'angled', 'raised', 'thick', 'thin']);
  const eyeVariant = rand.pick(['round', 'sleepy', 'happy', 'wide', 'wink', 'closed']);
  const noseVariant = rand.pick(['simple', 'button', 'wide']);
  const mouthVariant = rand.pick(['smile', 'smallSmile', 'neutral', 'grin', 'smirk', 'surprised']);

  const facialHairVariant = rand.pickWeighted([
    ['none', 40],
    ['stubble', 15],
    ['mustache', 10],
    ['goatee', 10],
    ['fullBeard', 15],
    ['longBeard', 10],
  ]);
  const hairVariant = rand.pickWeighted([
    ['bald', 8],
    ['buzz', 10],
    ['short', 20],
    ['curly', 15],
    ['wavy', 15],
    ['ponytail', 10],
    ['bun', 8],
    ['afro', 8],
    ['mohawk', 6],
  ]);
  const glassesVariant = rand.pickWeighted([
    ['none', 50],
    ['round', 20],
    ['square', 15],
    ['sunglasses', 15],
  ]);
  const headwearVariant = rand.pickWeighted([
    ['none', 50],
    ['cap', 18],
    ['beanie', 16],
    ['bandana', 16],
  ]);
  const earringVariant = rand.pickWeighted([
    ['none', 65],
    ['stud', 22],
    ['hoop', 13],
  ]);
  const hasFreckles = rand.pickWeighted([
    ['no', 75],
    ['yes', 25],
  ]);
  const hasBlush = rand.pickWeighted([
    ['no', 70],
    ['yes', 30],
  ]);

  const skinShadow = shadeColor(skinColor, -20);
  const gradientId = `bg-${seed}`;
  const shadowFilterId = `fx-${seed}`;

  // Z-order: body -> ears -> head -> shading -> facial features ->
  // beard -> hair -> glasses -> headwear -> earrings (each layer sits
  // above the previous one). Earrings are deliberately drawn last, so
  // they can never be covered by the head OR by drooping hair strands
  // (wavy, ponytail).
  const layers = [
    renderBody(clothingColor, clothingVariant),
    renderNeck(skinColor),
    renderEars(skinColor),
    renderHead(skinColor),
    renderFaceShading(skinColor),
    hasFreckles === 'yes' ? renderFreckles(skinShadow) : '',
    hasBlush === 'yes' ? renderBlush() : '',
    EYEBROWS[eyebrowVariant](hairColor),
    EYES[eyeVariant](irisColor),
    NOSE[noseVariant](skinShadow),
    MOUTH[mouthVariant](),
    FACIAL_HAIR[facialHairVariant](hairColor),
    HAIR[hairVariant](hairColor),
    GLASSES[glassesVariant](glassesColor),
    HEADWEAR[headwearVariant](headwearColor),
    EARRINGS[earringVariant](earringColor),
  ].join('');

  const defs =
    renderBackgroundGradient(gradientId, backgroundGradient) +
    `<filter id="${shadowFilterId}" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feDropShadow dx="0" dy="1.2" stdDeviation="1.3" flood-color="#000" flood-opacity="0.25"/>` +
    `</filter>`;

  return {
    backgroundFill: `url(#${gradientId})`,
    defs,
    content: `<g filter="url(#${shadowFilterId})">${layers}</g>`,
  };
}

/**
 * "abstract" style: three overlapping geometric shapes (circle, ring,
 * triangle, square) in a curated color palette in front of a gradient
 * background -- no face, purely abstract. A clip path ensures shapes never
 * extend beyond the rounded corners of the background area.
 */
function renderAbstractAvatar(rand, seed) {
  const [bgColor, colorA, colorB] = rand.pick(ABSTRACT_PALETTES);
  const shapeColors = [colorA, colorB, shadeColor(colorA, -18)];
  const shapeTypes = Object.keys(ABSTRACT_SHAPES);

  let shapes = '';
  for (let i = 0; i < 3; i++) {
    const type = rand.pick(shapeTypes);
    const color = shapeColors[i % shapeColors.length];
    const cx = 20 + rand.next() * 60;
    const cy = 20 + rand.next() * 60;
    const size = 26 + rand.next() * 30;
    const rotation = Math.floor(rand.next() * 360);
    const opacity = (0.85 + rand.next() * 0.15).toFixed(2);
    shapes += ABSTRACT_SHAPES[type](cx, cy, size, rotation, color, opacity);
  }

  const gradientId = `bg-${seed}`;
  const clipId = `clip-${seed}`;
  const defs =
    renderBackgroundGradient(gradientId, [bgColor, shadeColor(bgColor, -15)]) +
    `<clipPath id="${clipId}"><rect x="0" y="0" width="100" height="100" rx="14"/></clipPath>`;

  return {
    backgroundFill: `url(#${gradientId})`,
    defs,
    content: `<g clip-path="url(#${clipId})">${shapes}</g>`,
  };
}

/**
 * "initials" style: one or two letters from the name (first letter of the
 * first/last word, or the first two letters for a single word), centered
 * in front of a curated gradient background.
 */
function renderInitialsAvatar(seedSource, rand, seed) {
  const initials = computeInitials(seedSource);
  const color = rand.pick(INITIALS_COLORS);
  const gradientId = `bg-${seed}`;
  const defs = renderBackgroundGradient(gradientId, [color, shadeColor(color, -20)]);
  const fontSize = initials.length >= 2 ? 36 : 44;

  const content =
    `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" ` +
    `font-size="${fontSize}" font-weight="600" fill="#FFFFFF" letter-spacing="1">` +
    `${escapeXml(initials)}</text>`;

  return { backgroundFill: `url(#${gradientId})`, defs, content };
}

/**
 * Generates a deterministic SVG avatar for a name.
 *
 * @param {string} name - Any name/string, used as the seed.
 * @param {object} [options]
 * @param {number} [options.size=128] - Width/height of the SVG in pixels.
 * @param {'character'|'abstract'|'initials'} [options.style='character'] -
 *   Visual style: "character" (detailed figure, default), "abstract"
 *   (abstract color shapes), or "initials" (initials in front of a color
 *   area). Unknown values fall back to "character".
 * @returns {string} Valid, standalone SVG markup string (including xmlns).
 */
export function generateAvatar(name, options = {}) {
  const { size = 128, style = 'character' } = options;
  // .normalize('NFC') converts umlauts/accents into their precomposed
  // normal form (e.g. "a" + combining diaeresis -> "ä"), so that visually
  // identical names always yield the same seed and thus the same avatar,
  // regardless of their Unicode encoding (NFC vs. NFD, depending on
  // operating system/input source).
  const seedSource =
    typeof name === 'string' && name.trim().length > 0 ? name.trim().normalize('NFC') : 'anonymous';

  const seed = hashString(seedSource);
  const rand = createPRNG(seed);

  const resolvedStyle = STYLES.includes(style) ? style : 'character';
  const scene =
    resolvedStyle === 'abstract'
      ? renderAbstractAvatar(rand, seed)
      : resolvedStyle === 'initials'
        ? renderInitialsAvatar(seedSource, rand, seed)
        : renderCharacterAvatar(rand, seed);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Avatar of ${escapeXml(seedSource)}">` +
    `<defs>${scene.defs}</defs>` +
    `<rect x="0" y="0" width="100" height="100" rx="14" fill="${scene.backgroundFill}"/>` +
    scene.content +
    `</svg>`
  );
}

/**
 * Thin class wrapper for DI-friendly MVC integration, e.g. as an
 * injectable service in a controller/view layer. Contains no logic of its
 * own -- delegates to generateAvatar.
 */
export class AvatarGenerator {
  constructor(defaultOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  create(name, options = {}) {
    return generateAvatar(name, { ...this.defaultOptions, ...options });
  }
}
