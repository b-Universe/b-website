export function treeClamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function treeLerp(a, b, t) {
  return a + (b - a) * t;
}

export function treeRoundNum(n, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(n) || 0) * factor) / factor;
}

export function treeRng32(seed) {
  let a = (Number(seed) >>> 0) || 1337;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function treeForkRng(seed, salt = 0) {
  const mixed = ((Number(seed) >>> 0) ^ Math.imul((Number(salt) >>> 0) + 1, 0x9E3779B1)) >>> 0;
  return treeRng32(mixed || 1337);
}

export function treePick(rng, arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function treeRandBetween(rng, min, max) {
  return min + (max - min) * rng();
}

export function treeRandInt(rng, min, max) {
  return Math.floor(treeRandBetween(rng, min, max + 1));
}

export function treeNormalizeHex(hex, fallback = '#3b7a2e') {
  if (typeof hex !== 'string') return fallback;
  const trimmed = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function treeHexToRgb(hex) {
  const norm = treeNormalizeHex(hex, '#000000');
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16)
  };
}

export function treeRgbToHex(r, g, b) {
  const toByte = (v) => treeClamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function treeMixHex(hexA, hexB, t = 0.5) {
  const a = treeHexToRgb(hexA);
  const b = treeHexToRgb(hexB);
  const clamped = treeClamp(t, 0, 1);
  return treeRgbToHex(
    treeLerp(a.r, b.r, clamped),
    treeLerp(a.g, b.g, clamped),
    treeLerp(a.b, b.b, clamped)
  );
}

export function treeDarkenHex(hex, amount = 0.2) {
  return treeMixHex(hex, '#080b0e', treeClamp(amount, 0, 1));
}

export function treeLightenHex(hex, amount = 0.2) {
  return treeMixHex(hex, '#ffffff', treeClamp(amount, 0, 1));
}

export function treeSlugify(text) {
  return String(text || 'tree')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tree';
}

export function treeHashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const text = String(str || '');
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return hex;
}

export function treeCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function tree$(selector, root = null) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  return scope ? scope.querySelector(selector) : null;
}

export function tree$$(selector, root = null) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  return scope ? Array.from(scope.querySelectorAll(selector)) : [];
}
