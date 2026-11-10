export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export const copy = (value) => JSON.parse(JSON.stringify(value));

export const rng32 = (seed) => {
  let a = (seed >>> 0) || 1337;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randBetween = (r, a, b) => a + (b - a) * r();

export const randInt = (r, a, b) => Math.floor(randBetween(r, a, b + 1));

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export const colorHex = (value) => (/^#[a-f\d]{6}$/i.test(value) ? value : '#777777');

export const hexToRgb = (hex) => {
  const clean = colorHex(hex).slice(1);
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const roundNum = (val, decimals = 4) => {
  const f = Math.pow(10, decimals);
  return Math.round((Number(val) || 0) * f) / f;
};

export function hashBlueprintString(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
}
