// Pure utilities, deterministic PRNG, color helpers, and 2D/3D math for Infrastructure & Transit Generator

export function infraClamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function infraLerp(a, b, t) {
  return a + (b - a) * t;
}

export function infraRound(v, decimals = 4) {
  const f = Math.pow(10, decimals);
  return Math.round((Number(v) || 0) * f) / f;
}

export function infraCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function infraSlugify(str) {
  return String(str || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function infraDegToRad(deg) {
  return (Number(deg) || 0) * (Math.PI / 180);
}

export function infraRadToDeg(rad) {
  return (Number(rad) || 0) * (180 / Math.PI);
}

export function infraRng32(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return function infraNextRand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function infraForkRng(seed, salt = 0) {
  let h = (Number(seed) || 1) >>> 0;
  const str = String(salt);
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  }
  return infraRng32(h || 1);
}

export function infraRandBetween(r, min, max) {
  return min + r() * (max - min);
}

export function infraRandInt(r, min, max) {
  return Math.floor(min + r() * (max - min + 1));
}

export function infraPick(r, arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function infraHashString(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

export function infraColorHex(val, fallback = '#8899aa') {
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

export function infraHexToRgb(hex) {
  const c = infraColorHex(hex, '#808080');
  return {
    r: parseInt(c.slice(1, 3), 16),
    g: parseInt(c.slice(3, 5), 16),
    b: parseInt(c.slice(5, 7), 16)
  };
}

export function infraToHex(r, g, b) {
  const part = (v) => infraClamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function infraMixHex(hexA, hexB, t = 0.5) {
  const a = infraHexToRgb(hexA);
  const b = infraHexToRgb(hexB);
  const k = infraClamp(t, 0, 1);
  return infraToHex(infraLerp(a.r, b.r, k), infraLerp(a.g, b.g, k), infraLerp(a.b, b.b, k));
}

export function infraDarkenHex(hex, amount = 0.2) {
  return infraMixHex(hex, '#101418', infraClamp(amount, 0, 1));
}

export function infraLightenHex(hex, amount = 0.2) {
  return infraMixHex(hex, '#f4f7fa', infraClamp(amount, 0, 1));
}

// 3D Vector Math
export function infraVec3Add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function infraVec3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function infraVec3Scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function infraVec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function infraVec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function infraVec3Len(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

export function infraVec3Norm(a, fallback = [0, 0, 1]) {
  const len = Math.hypot(a[0], a[1], a[2]);
  if (len < 1e-8) return [...fallback];
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function infraVec3Dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function infraVec3Lerp(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

// 2D XZ Math ([x, z])
export function infraVec2Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

export function infraVec2Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

export function infraVec2Cross(a, b) {
  return a[0] * b[1] - a[1] * b[0];
}

export function infraVec2Len(a) {
  return Math.hypot(a[0], a[1]);
}

export function infraVec2Norm(a, fallback = [1, 0]) {
  const len = Math.hypot(a[0], a[1]);
  if (len < 1e-8) return [...fallback];
  return [a[0] / len, a[1] / len];
}

export function infraVec2Dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function infraSegIntersect2D(a1, a2, b1, b2, eps = 1e-6) {
  const r = [a2[0] - a1[0], a2[1] - a1[1]];
  const s = [b2[0] - b1[0], b2[1] - b1[1]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-9) return { hit: false };
  const qmp = [b1[0] - a1[0], b1[1] - a1[1]];
  const t = (qmp[0] * s[1] - qmp[1] * s[0]) / denom;
  const u = (qmp[0] * r[1] - qmp[1] * r[0]) / denom;
  if (t >= -eps && t <= 1 + eps && u >= -eps && u <= 1 + eps) {
    return {
      hit: true,
      t: infraClamp(t, 0, 1),
      u: infraClamp(u, 0, 1),
      x: a1[0] + t * r[0],
      z: a1[1] + t * r[1]
    };
  }
  return { hit: false };
}

export function infraLineIntersect2D(p1, d1, p2, d2) {
  const denom = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(denom) < 1e-7) return null;
  const qmp = [p2[0] - p1[0], p2[1] - p1[1]];
  const t1 = (qmp[0] * d2[1] - qmp[1] * d2[0]) / denom;
  const t2 = (qmp[0] * d1[1] - qmp[1] * d1[0]) / denom;
  return {
    t1,
    t2,
    point: [p1[0] + d1[0] * t1, p1[1] + d1[1] * t1]
  };
}

export function infraPolygonArea2D(pts) {
  if (!Array.isArray(pts) || pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum * 0.5;
}

export function infraPointInPolygon2D(pt, poly) {
  if (!Array.isArray(poly) || poly.length < 3) return false;
  let inside = false;
  const px = pt[0];
  const pz = pt[1];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect = (zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Sutherland-Hodgman 2D convex polygon clipper for z-fighting overlap detection.
// Both polygons are normalized to CCW orientation (area > 0) before clipping.
export function infraClipPoly2D(subjectInput, clipInput) {
  if (!Array.isArray(subjectInput) || subjectInput.length < 3) return [];
  if (!Array.isArray(clipInput) || clipInput.length < 3) return [];

  let output = infraPolygonArea2D(subjectInput) >= 0 ? subjectInput.map((p) => [p[0], p[1]]) : subjectInput.slice().reverse().map((p) => [p[0], p[1]]);
  const clip = infraPolygonArea2D(clipInput) >= 0 ? clipInput : clipInput.slice().reverse();

  const inside = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-9;
  const computeIntersection = (p1, p2, a, b) => {
    const dc = [a[0] - b[0], a[1] - b[1]];
    const dp = [p1[0] - p2[0], p1[1] - p2[1]];
    const n1 = a[0] * b[1] - a[1] * b[0];
    const n2 = p1[0] * p2[1] - p1[1] * p2[0];
    const den = dc[0] * dp[1] - dc[1] * dp[0];
    if (Math.abs(den) < 1e-12) return [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5];
    return [(n1 * dp[0] - n2 * dc[0]) / den, (n1 * dp[1] - n2 * dc[1]) / den];
  };

  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    if (!input.length) break;
    let s = input[input.length - 1];
    for (let j = 0; j < input.length; j++) {
      const e = input[j];
      if (inside(e, a, b)) {
        if (!inside(s, a, b)) {
          output.push(computeIntersection(s, e, a, b));
        }
        output.push(e);
      } else if (inside(s, a, b)) {
        output.push(computeIntersection(s, e, a, b));
      }
      s = e;
    }
  }
  return output;
}

export function infra$(selector, root = null) {
  if (typeof document === 'undefined') return null;
  return (root || document).querySelector(selector);
}

export function infra$$(selector, root = null) {
  if (typeof document === 'undefined') return [];
  return Array.from((root || document).querySelectorAll(selector));
}
