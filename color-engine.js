/* =============================================================================
   color-engine.js — shared color science for the color-mix tools.

   Everything round-trips through XYZ D65. Matrices, transfer functions and the
   gamut-mapping algorithm follow CSS Color Module Level 4.
   Loaded as a classic script: everything here is a global.
   ============================================================================= */
"use strict";


const mul = (m, v) => [
  m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
  m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
  m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2],
];

const D50_TO_D65 = [
  [ 0.9554734527042182,  -0.023098536874261423, 0.0632593086610217  ],
  [-0.028369706963208136, 1.0099954580058226,   0.021041398966943008],
  [ 0.012314001688319899,-0.020507696433477912, 1.3303659366080753  ],
];
const D65_TO_D50 = [
  [ 1.0479298208405488,   0.022946793341019088, -0.05019222954313557],
  [ 0.029627815688159344, 0.990434484573249,    -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895,  0.7518742899580008 ],
];

/* --- transfer functions --- */
const sign = x => x < 0 ? -1 : 1;
const srgbToLin  = c => Math.abs(c) <= 0.04045 ? c / 12.92 : sign(c) * Math.pow((Math.abs(c) + 0.055) / 1.055, 2.4);
const linToSrgb  = c => Math.abs(c) <= 0.0031308 ? c * 12.92 : sign(c) * (1.055 * Math.pow(Math.abs(c), 1/2.4) - 0.055);
const identity   = c => c;
const a98ToLin   = c => sign(c) * Math.pow(Math.abs(c), 563/256);
const linToA98   = c => sign(c) * Math.pow(Math.abs(c), 256/563);
const proToLin   = c => Math.abs(c) <= 16/512 ? c / 16 : sign(c) * Math.pow(Math.abs(c), 1.8);
const linToPro   = c => Math.abs(c) >= 1/512 ? sign(c) * Math.pow(Math.abs(c), 1/1.8) : 16 * c;
const R2020_A = 1.09929682680944, R2020_B = 0.018053968510807;
const rec2020ToLin = c => Math.abs(c) < R2020_B * 4.5 ? c / 4.5 : sign(c) * Math.pow((Math.abs(c) + R2020_A - 1) / R2020_A, 1/0.45);
const linToRec2020 = c => Math.abs(c) > R2020_B ? sign(c) * (R2020_A * Math.pow(Math.abs(c), 0.45) - (R2020_A - 1)) : 4.5 * c;

/* --- RGB space definitions --- */
const RGB_SPACES = {
  "srgb": {
    toXYZ: [[0.41239079926595934,0.357584339383878,0.1804807884018343],
            [0.21263900587151027,0.715168678767756,0.07219231536073371],
            [0.01933081871559182,0.11919477979462598,0.9505321522496607]],
    fromXYZ: [[3.2409699419045226,-1.537383177570094,-0.4986107602930034],
              [-0.9692436362808796,1.8759675015077202,0.04155505740717559],
              [0.05563007969699366,-0.20397695888897652,1.0569715142428786]],
    toLin: srgbToLin, fromLin: linToSrgb, white: "d65",
  },
  "srgb-linear": {
    toXYZ: null, fromXYZ: null, toLin: identity, fromLin: identity, white: "d65", alias: "srgb",
  },
  "display-p3": {
    toXYZ: [[0.4865709486482162,0.26566769316909306,0.1982172852343625],
            [0.2289745640697488,0.6917385218365064,0.079286914093745],
            [0.0000000000000000,0.04511338185890264,1.043944368900976]],
    fromXYZ: [[2.493496911941425,-0.9313836179191239,-0.40271078445071684],
              [-0.8294889695615747,1.7626640603183463,0.023624685841943577],
              [0.03584583024378447,-0.07617238926804182,0.9568845240076872]],
    toLin: srgbToLin, fromLin: linToSrgb, white: "d65",
  },
  "a98-rgb": {
    toXYZ: [[0.5766690429101305,0.1855582379065463,0.1882286462349947],
            [0.29734497525053605,0.6273635662554661,0.07529145849399788],
            [0.02703136138641234,0.07068885253582723,0.9913375368376388]],
    fromXYZ: [[2.0415879038107465,-0.5650069742788596,-0.34473135077832956],
              [-0.9692436362808795,1.8759675015077202,0.04155505740717557],
              [0.013444280632031142,-0.11836239223101838,1.0151749943912054]],
    toLin: a98ToLin, fromLin: linToA98, white: "d65",
  },
  "prophoto-rgb": {
    toXYZ: [[0.7977604896723027,0.13518583717574031,0.0313493495815248],
            [0.2880711282292934,0.7118432178101014,0.00008565396060525902],
            [0.0,0.0,0.8251046025104601]],
    fromXYZ: [[1.3457989731028281,-0.25558010007997534,-0.05110628506753401],
              [-0.5446224939028347,1.5082327413132781,0.02053603239147973],
              [0.0,0.0,1.2119675456389454]],
    toLin: proToLin, fromLin: linToPro, white: "d50",
  },
  "rec2020": {
    toXYZ: [[0.6369580483012914,0.14461690358620832,0.1688809751641721],
            [0.2627002120112671,0.6779980715188708,0.05930171646986196],
            [0.0,0.028072693049087428,1.060985057710791]],
    fromXYZ: [[1.716651187971268,-0.355670783776392,-0.253366281373660],
              [-0.666684351832489,1.616481236634939,0.0157685458139111],
              [0.017639857445311,-0.042770613257809,0.942103121235474]],
    toLin: rec2020ToLin, fromLin: linToRec2020, white: "d65",
  },
};
RGB_SPACES["srgb-linear"].toXYZ = RGB_SPACES.srgb.toXYZ;
RGB_SPACES["srgb-linear"].fromXYZ = RGB_SPACES.srgb.fromXYZ;

function rgbToXYZ(rgb, key) {
  const s = RGB_SPACES[key];
  const lin = rgb.map(s.toLin);
  let xyz = mul(s.toXYZ, lin);
  if (s.white === "d50") xyz = mul(D50_TO_D65, xyz);
  return xyz;
}
function xyzToRGB(xyz, key) {
  const s = RGB_SPACES[key];
  const x = s.white === "d50" ? mul(D65_TO_D50, xyz) : xyz;
  return mul(s.fromXYZ, x).map(s.fromLin);
}

/* --- CIE Lab (D50) --- */
const LAB_E = 216/24389, LAB_K = 24389/27;
const WHITE_D50 = [0.3457/0.3585, 1.0, (1.0 - 0.3457 - 0.3585)/0.3585];
function xyzToLab(xyz) {
  const d50 = mul(D65_TO_D50, xyz);
  const f = d50.map((v, i) => {
    const r = v / WHITE_D50[i];
    return r > LAB_E ? Math.cbrt(r) : (LAB_K * r + 16) / 116;
  });
  return [116*f[1] - 16, 500*(f[0] - f[1]), 200*(f[1] - f[2])];
}
function labToXYZ(L, a, b) {
  const f1 = (L + 16) / 116, f0 = a/500 + f1, f2 = f1 - b/200;
  const d50 = [
    (f0**3 > LAB_E ? f0**3 : (116*f0 - 16) / LAB_K) * WHITE_D50[0],
    (L > LAB_K * LAB_E ? ((L + 16)/116)**3 : L / LAB_K) * WHITE_D50[1],
    (f2**3 > LAB_E ? f2**3 : (116*f2 - 16) / LAB_K) * WHITE_D50[2],
  ];
  return mul(D50_TO_D65, d50);
}

/* --- OKLab --- */
const XYZ_TO_LMS = [
  [0.8190224379967030, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434,  0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308,  0.6335478284694309],
];
const LMS_TO_OKLAB = [
  [0.2104542683093140,  0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.4285922420485799,  0.4505937096174110],
  [0.0259040424655478,  0.7827717124575296, -0.8086757549230774],
];
const OKLAB_TO_LMS = [
  [1.0, 0.3963377773761749,  0.2158037573099136],
  [1.0,-0.1055613458156586, -0.0638541728258133],
  [1.0,-0.0894841775298119, -1.2914855480194092],
];
const LMS_TO_XYZ = [
  [ 1.2268798758459243,-0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.1122868032803170,-0.0717110580655164],
  [-0.0763729366746601,-0.4214933324022432, 1.5869240198367816],
];
function xyzToOklab(xyz) {
  const lms = mul(XYZ_TO_LMS, xyz).map(v => Math.cbrt(v));
  return mul(LMS_TO_OKLAB, lms);
}
function oklabToXYZ(L, a, b) {
  const lms = mul(OKLAB_TO_LMS, [L, a, b]).map(v => v ** 3);
  return mul(LMS_TO_XYZ, lms);
}

/* --- polar helpers --- */
const norm360 = h => ((h % 360) + 360) % 360;
function toPolar([L, a, b]) {
  const C = Math.sqrt(a*a + b*b);
  const H = C < 1e-8 ? 0 : norm360(Math.atan2(b, a) * 180 / Math.PI);
  return [L, C, H];
}
function fromPolar(L, C, H) {
  const r = H * Math.PI / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

/* --- HSL / HWB (sRGB based) --- */
function srgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if (d > 1e-9) {
    s = l === 0 || l === 1 ? 0 : (max - l) / Math.min(l, 1 - l);
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [norm360(h), s * 100, l * 100];
}
function hslToSrgb(h, s, l) {
  h = norm360(h); s /= 100; l /= 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
function srgbToHwb(rgb) {
  const [h] = srgbToHsl(rgb);
  return [h, Math.min(...rgb) * 100, (1 - Math.max(...rgb)) * 100];
}
function hwbToSrgb(h, w, bl) {
  w /= 100; bl /= 100;
  if (w + bl >= 1) { const g = w / (w + bl); return [g, g, g]; }
  return hslToSrgb(h, 100, 50).map(c => c * (1 - w - bl) + w);
}

/* --- gamut mapping (CSS Color 4 §13.2, oklch chroma reduction) --- */
function inGamut(xyz, key, eps = 1e-5) {
  return xyzToRGB(xyz, key).every(c => c >= -eps && c <= 1 + eps);
}
function clipTo(xyz, key) {
  const rgb = xyzToRGB(xyz, key).map(c => Math.min(1, Math.max(0, c)));
  return { rgb, xyz: rgbToXYZ(rgb, key) };
}
function deltaEOK(xyz1, xyz2) {
  const a = xyzToOklab(xyz1), b = xyzToOklab(xyz2);
  return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
}
function gamutMap(xyz, key) {
  if (inGamut(xyz, key)) return { rgb: xyzToRGB(xyz, key).map(c => Math.min(1, Math.max(0, c))), mapped: false };
  const [L, C, H] = toPolar(xyzToOklab(xyz));
  if (L >= 1) return { rgb: [1, 1, 1], mapped: true };
  if (L <= 0) return { rgb: [0, 0, 0], mapped: true };
  const JND = 0.02, EPS = 1e-4;
  let min = 0, max = C, minInGamut = true, current = xyz, clipped = clipTo(xyz, key);
  while (max - min > EPS) {
    const chroma = (min + max) / 2;
    const ok = fromPolar(L, chroma, H);
    current = oklabToXYZ(ok[0], ok[1], ok[2]);
    if (minInGamut && inGamut(current, key)) { min = chroma; continue; }
    clipped = clipTo(current, key);
    const E = deltaEOK(clipped.xyz, current);
    if (E < JND) {
      if (JND - E < EPS) break;
      minInGamut = false; min = chroma;
    } else max = chroma;
  }
  return { rgb: clipped.rgb, mapped: true };
}

/* =========================================================================
   PARSING — normalise any CSS color serialization into { xyz, alpha }.
   ========================================================================= */

function comp(tok, ref) {
  if (tok == null) return 0;
  tok = tok.trim();
  if (tok === "none") return 0;
  if (tok.endsWith("%")) return parseFloat(tok) / 100 * ref;
  return parseFloat(tok) || 0;
}
function parseAngle(tok) {
  if (!tok || tok.trim() === "none") return 0;
  tok = tok.trim();
  const v = parseFloat(tok) || 0;
  if (tok.endsWith("grad")) return v * 0.9;
  if (tok.endsWith("rad")) return v * 180 / Math.PI;
  if (tok.endsWith("turn")) return v * 360;
  return v;
}
function parseAlpha(tok) {
  if (tok == null) return 1;
  tok = tok.trim();
  if (tok === "none") return 0;
  const v = tok.endsWith("%") ? parseFloat(tok) / 100 : parseFloat(tok);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}
function hexToColor(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return null;
  const n = p => parseInt(h.slice(p, p + 2), 16) / 255;
  return { xyz: rgbToXYZ([n(0), n(2), n(4)], "srgb"), alpha: h.length === 8 ? n(6) : 1 };
}

function parseColor(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (s === "transparent") return { xyz: [0, 0, 0], alpha: 0 };
  if (s[0] === "#") return hexToColor(s);

  const m = s.match(/^([a-z][a-z0-9-]*)\(\s*([\s\S]*?)\s*\)$/);
  if (!m) return null;
  const fn = m[1];
  let body = m[2], alpha = 1;
  const slash = body.indexOf("/");
  if (slash !== -1) { alpha = parseAlpha(body.slice(slash + 1)); body = body.slice(0, slash); }
  const p = body.trim().split(/[\s,]+/).filter(Boolean);

  const legacyAlpha = n => { if (p.length > n) alpha = parseAlpha(p[n]); };

  switch (fn) {
    case "rgb": case "rgba": {
      legacyAlpha(3);
      const c = [0, 1, 2].map(i => comp(p[i], 255) / 255);
      return { xyz: rgbToXYZ(c, "srgb"), alpha };
    }
    case "hsl": case "hsla": {
      legacyAlpha(3);
      return { xyz: rgbToXYZ(hslToSrgb(parseAngle(p[0]), comp(p[1], 100), comp(p[2], 100)), "srgb"), alpha };
    }
    case "hwb":
      return { xyz: rgbToXYZ(hwbToSrgb(parseAngle(p[0]), comp(p[1], 100), comp(p[2], 100)), "srgb"), alpha };
    case "lab":
      return { xyz: labToXYZ(comp(p[0], 100), comp(p[1], 125), comp(p[2], 125)), alpha };
    case "lch": {
      const [L, a, b] = fromPolar(comp(p[0], 100), comp(p[1], 150), parseAngle(p[2]));
      return { xyz: labToXYZ(L, a, b), alpha };
    }
    case "oklab":
      return { xyz: oklabToXYZ(comp(p[0], 1), comp(p[1], 0.4), comp(p[2], 0.4)), alpha };
    case "oklch": {
      const [L, a, b] = fromPolar(comp(p[0], 1), comp(p[1], 0.4), parseAngle(p[2]));
      return { xyz: oklabToXYZ(L, a, b), alpha };
    }
    case "color": {
      const space = p[0];
      const c = [1, 2, 3].map(i => comp(p[i], 1));
      if (space === "xyz" || space === "xyz-d65") return { xyz: c, alpha };
      if (space === "xyz-d50") return { xyz: mul(D50_TO_D65, c), alpha };
      if (RGB_SPACES[space]) return { xyz: rgbToXYZ(c, space), alpha };
      return null;
    }
    default: return null;
  }
}

/* =========================================================================
   FORMATTING
   ========================================================================= */

const FORMATS = [
  ["hex", "hex"], ["rgb", "rgb()"], ["hsl", "hsl()"], ["hwb", "hwb()"],
  ["lab", "lab()"], ["lch", "lch()"], ["oklab", "oklab()"], ["oklch", "oklch()"],
  ["srgb", "color(srgb)"], ["display-p3", "color(display-p3)"],
  ["rec2020", "color(rec2020)"], ["a98-rgb", "color(a98-rgb)"],
  ["prophoto-rgb", "color(prophoto-rgb)"], ["srgb-linear", "color(srgb-linear)"],
  ["xyz-d65", "color(xyz-d65)"], ["xyz-d50", "color(xyz-d50)"],
];
const SRGB_BOUND = new Set(["hex", "rgb", "hsl", "hwb"]);

function num(n, d) {
  if (!Number.isFinite(n)) n = 0;
  let s = n.toFixed(d);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" ? "0" : s;
}
const alphaStr = a => a >= 1 ? "" : " / " + num(a, 4);

function formatColor(color, fmt) {
  const { xyz, alpha } = color;
  let mapped = false;

  const asRGB = key => {
    const g = gamutMap(xyz, key);
    mapped = g.mapped;
    return g.rgb;
  };

  let text;
  switch (fmt) {
    case "hex": {
      const rgb = asRGB("srgb");
      const hx = rgb.map(c => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
      const ah = alpha >= 1 ? "" : Math.round(alpha * 255).toString(16).padStart(2, "0");
      text = "#" + hx + ah;
      break;
    }
    case "rgb": {
      const rgb = asRGB("srgb").map(c => Math.round(c * 255));
      text = `rgb(${rgb.join(" ")}${alphaStr(alpha)})`;
      break;
    }
    case "hsl": {
      const [h, s, l] = srgbToHsl(asRGB("srgb"));
      text = `hsl(${num(h, 2)} ${num(s, 2)}% ${num(l, 2)}%${alphaStr(alpha)})`;
      break;
    }
    case "hwb": {
      const [h, w, b] = srgbToHwb(asRGB("srgb"));
      text = `hwb(${num(h, 2)} ${num(w, 2)}% ${num(b, 2)}%${alphaStr(alpha)})`;
      break;
    }
    case "lab": {
      const [L, a, b] = xyzToLab(xyz);
      text = `lab(${num(L, 3)}% ${num(a, 3)} ${num(b, 3)}${alphaStr(alpha)})`;
      break;
    }
    case "lch": {
      const [L, C, H] = toPolar(xyzToLab(xyz));
      text = `lch(${num(L, 3)}% ${num(C, 3)} ${num(H, 2)}${alphaStr(alpha)})`;
      break;
    }
    case "oklab": {
      const [L, a, b] = xyzToOklab(xyz);
      text = `oklab(${num(L, 4)} ${num(a, 4)} ${num(b, 4)}${alphaStr(alpha)})`;
      break;
    }
    case "oklch": {
      const [L, C, H] = toPolar(xyzToOklab(xyz));
      text = `oklch(${num(L, 4)} ${num(C, 4)} ${num(H, 2)}${alphaStr(alpha)})`;
      break;
    }
    case "xyz-d65":
      text = `color(xyz-d65 ${xyz.map(v => num(v, 5)).join(" ")}${alphaStr(alpha)})`;
      break;
    case "xyz-d50":
      text = `color(xyz-d50 ${mul(D65_TO_D50, xyz).map(v => num(v, 5)).join(" ")}${alphaStr(alpha)})`;
      break;
    default: {
      // color(<rgb-space> ...) — wide-gamut spaces are not clamped, only reported
      const raw = xyzToRGB(xyz, fmt);
      mapped = raw.some(c => c < -1e-5 || c > 1 + 1e-5);
      text = `color(${fmt} ${raw.map(v => num(v, 5)).join(" ")}${alphaStr(alpha)})`;
    }
  }
  return { text, mapped };
}

/* Is this color representable in sRGB? */
function isOutOfSrgb(color) {
  return !inGamut(color.xyz, "srgb", 5e-4);
}

/* =============================================================================
   COLOR NAMING — map an arbitrary color to a palette name ("mint", "olive", …).

   Nearest neighbour in OKLab against a curated list of evocative colour names.
   Lightness is down-weighted (LIGHTNESS_WEIGHT) so a dark teal is still named
   "teal" rather than collapsing onto a dark neutral: for naming, hue and chroma
   carry the identity, lightness is just a shade of it.
   ============================================================================= */

const COLOR_NAMES = [
  // reds / pinks
  ["scarlet",     "#ff2400"], ["crimson",   "#dc143c"], ["cherry",    "#d2042d"],
  ["ruby",        "#9b111e"], ["maroon",    "#800000"], ["brick",     "#a83731"],
  ["vermilion",   "#e34234"], ["coral",     "#ff7f50"], ["salmon",    "#fa8072"],
  ["rose",        "#ff007f"], ["blush",     "#de5d83"], ["pink",      "#ffc0cb"],
  ["petal",       "#f7cfd8"], ["fuchsia",   "#ff00c8"], ["magenta",   "#c2185b"],
  // purples
  ["plum",        "#8e4585"], ["mauve",     "#e0b0ff"], ["orchid",    "#da70d6"],
  ["lilac",       "#c8a2c8"], ["lavender",  "#b57edc"], ["violet",    "#7f00ff"],
  ["amethyst",    "#9966cc"], ["grape",     "#6f2da8"], ["indigo",    "#4b0082"],
  ["periwinkle",  "#ccccff"], ["iris",      "#5a4fcf"], ["haze",      "#e6dcf2"],
  // blues
  ["navy",        "#0a1f44"], ["sapphire",  "#0f52ba"], ["cobalt",    "#0047ab"],
  ["royal",       "#4169e1"], ["azure",     "#007fff"], ["cerulean",  "#007ba7"],
  ["denim",       "#1560bd"], ["sky",       "#87ceeb"], ["powder",    "#b0e0e6"],
  ["steel",       "#4682b4"], ["glacier",   "#d6e6f2"],
  // cyans / greens
  ["teal",        "#008080"], ["turquoise", "#40e0d0"], ["aqua",      "#00d1d1"],
  ["lagoon",      "#0e7c7b"], ["seafoam",   "#93e9be"], ["mint",      "#3eb489"],
  ["seaglass",    "#d3f2ea"], ["honeydew",  "#dff3e3"],
  ["jade",        "#00a86b"], ["emerald",   "#50c878"], ["forest",    "#1e5631"],
  ["fern",        "#4f7942"], ["moss",      "#8a9a5b"], ["sage",      "#9caf88"],
  ["olive",       "#808000"], ["lime",      "#bfff00"], ["chartreuse","#7fff00"],
  ["avocado",     "#568203"], ["pear",      "#d1e231"], ["pistachio", "#93c572"],
  // yellows / oranges
  ["lemon",       "#fff44f"], ["canary",    "#ffef9f"], ["gold",      "#ffd700"],
  ["amber",       "#ffbf00"], ["honey",     "#eba937"], ["mustard",   "#d9a441"],
  ["marigold",    "#eaa221"], ["tangerine", "#f28500"], ["orange",    "#ff7f11"],
  ["pumpkin",     "#e8681a"], ["apricot",   "#fbceb1"], ["peach",     "#ffdab9"],
  // browns / earth
  ["rust",        "#b7410e"], ["copper",    "#b87333"], ["bronze",    "#a97142"],
  ["sienna",      "#a0522d"], ["terracotta","#e2725b"], ["clay",      "#b66a50"],
  ["chocolate",   "#5c3317"], ["coffee",    "#6f4e37"], ["mocha",     "#967969"],
  ["caramel",     "#af6f09"], ["umber",     "#635147"], ["tan",       "#d2b48c"],
  ["sand",        "#c2b280"], ["khaki",     "#c3b091"], ["oat",       "#dfd3bb"],
  ["beige",       "#f0e6d2"], ["cream",     "#fffdd0"],
];

/* Near-neutral colors get a lightness ramp instead — hue is meaningless there. */
const NEUTRAL_NAMES = [
  [0.95, "ivory"], [0.86, "pearl"], [0.74, "silver"], [0.61, "ash"],
  [0.46, "slate"], [0.33, "graphite"], [0.19, "charcoal"], [0, "onyx"],
];

const LIGHTNESS_WEIGHT = 0.25;

/* A pale tint carries far less chroma than a mid-tone of the same hue, so a flat
   "is it grey?" threshold either calls #e0f2fe ivory or calls #111827 navy.
   Taper the threshold as lightness rises and both land correctly. */
function neutralChromaLimit(L) {
  return L <= 0.6 ? 0.035 : 0.035 - (L - 0.6) / 0.4 * 0.023;
}

/* Precomputed once — parsing 80 hexes on every keystroke would be wasteful. */
const NAME_LAB = COLOR_NAMES.map(([name, hex]) => {
  const c = parseColor(hex);
  return { name, lab: xyzToOklab(c.xyz) };
});

function nameColor(color) {
  const [L, C] = toPolar(xyzToOklab(color.xyz));
  if (C < neutralChromaLimit(L)) {
    return (NEUTRAL_NAMES.find(([min]) => L >= min) || NEUTRAL_NAMES[NEUTRAL_NAMES.length - 1])[1];
  }
  const lab = xyzToOklab(color.xyz);
  let best = null, bestD = Infinity;
  for (const cand of NAME_LAB) {
    const dL = (lab[0] - cand.lab[0]) * LIGHTNESS_WEIGHT;
    const d = dL * dL + (lab[1] - cand.lab[1]) ** 2 + (lab[2] - cand.lab[2]) ** 2;
    if (d < bestD) { bestD = d; best = cand.name; }
  }
  return best;
}

/* "Dusty Rose" -> "dusty-rose"; falls back to "color" if nothing usable is left. */
function slugify(s) {
  const out = String(s).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return out || "color";
}
