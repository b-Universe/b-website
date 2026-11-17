export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : min));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function roundNum(v, decimals = 4) {
  const f = Math.pow(10, decimals);
  return Math.round((Number(v) || 0) * f) / f;
}

export function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function rng32(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function forkRng(seed, salt = 0) {
  let h = (Number(seed) || 1) >>> 0;
  const str = String(salt);
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return rng32(h || 1);
}

export function randBetween(r, min, max) {
  return min + r() * (max - min);
}

export function randInt(r, min, max) {
  return Math.floor(min + r() * (max - min + 1));
}

export function pick(r, arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function colorHex(val, fallback = '#8899aa') {
  if (typeof val !== 'string') return fallback;
  const clean = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return (
      '#' +
      clean[1] + clean[1] +
      clean[2] + clean[2] +
      clean[3] + clean[3]
    ).toLowerCase();
  }
  return fallback;
}

export function hexToRgb(hex) {
  const c = colorHex(hex, '#808080');
  return {
    r: parseInt(c.slice(1, 3), 16),
    g: parseInt(c.slice(3, 5), 16),
    b: parseInt(c.slice(5, 7), 16)
  };
}

export function toHex(r, g, b) {
  const part = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mixHex(hexA, hexB, t = 0.5) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const k = clamp(t, 0, 1);
  return toHex(lerp(a.r, b.r, k), lerp(a.g, b.g, k), lerp(a.b, b.b, k));
}

export function darkenHex(hex, amount = 0.2) {
  return mixHex(hex, '#101418', clamp(amount, 0, 1));
}

export function lightenHex(hex, amount = 0.2) {
  return mixHex(hex, '#f4f7fa', clamp(amount, 0, 1));
}

export function hashBlueprintString(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function slugify(str) {
  return String(str || 'building')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'building';
}

export function $(selector, root = null) {
  if (typeof document === 'undefined') return null;
  return (root || document).querySelector(selector);
}

export function $$(selector, root = null) {
  if (typeof document === 'undefined') return [];
  return Array.from((root || document).querySelectorAll(selector));
}
