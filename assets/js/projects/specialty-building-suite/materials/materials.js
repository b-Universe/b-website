import { clamp, rng32, colorHex, darkenHex, lightenHex, mixHex } from '../utils.js';
import { CONDITION_LEVELS } from '../config.js';

const matCache = new Map();
const texCache = new Map();
let maxAnisotropy = 1;

export function setSpecialtyMaxAnisotropy(aniso) {
  maxAnisotropy = Math.max(1, Number(aniso) || 1);
}

export function clearSpecialtyMaterialCache() {
  for (const m of matCache.values()) m.dispose();
  for (const t of texCache.values()) t.dispose();
  matCache.clear();
  texCache.clear();
}

export function getWearScore(conditionId = 'clean') {
  const found = CONDITION_LEVELS.find((c) => c.id === conditionId);
  return found ? found.wear : 0.1;
}

export function solidMaterial(hex, options = {}) {
  const clean = colorHex(hex, '#808890');
  const key = `solid:${clean}:${JSON.stringify(options)}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color: clean, ...options }));
  }
  return matCache.get(key);
}

export function emissiveMaterial(hex, intensity = 0.75, lightingTime = 'day') {
  const clean = colorHex(hex, '#4de2ff');
  const isNight = lightingTime === 'night' || lightingTime === 'dusk';
  const boost = isNight ? intensity * 1.25 : intensity * 0.65;
  const key = `emissive:${clean}:${boost.toFixed(2)}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({
      color: clean,
      emissive: clean,
      emissiveIntensity: boost
    }));
  }
  return matCache.get(key);
}

export function glassMaterial(hex = '#4e83a6', options = {}) {
  const clean = colorHex(hex, '#4e83a6');
  const lit = Boolean(options.lit);
  const mode = options.lightingTime || 'day';
  const transparent = Boolean(options.transparent);
  const opacity = options.opacity !== undefined ? clamp(options.opacity, 0.12, 1.0) : (transparent ? 0.36 : 1.0);
  const darkTint = Boolean(options.tinted);
  const isNight = mode === 'night' || mode === 'dusk';

  const key = `glass:${clean}:${lit}:${mode}:${transparent}:${opacity.toFixed(2)}:${darkTint}`;
  if (matCache.has(key)) return matCache.get(key);

  let baseColor = darkTint ? darkenHex(clean, 0.45) : clean;
  let emissive = '#0a141d';
  let emissiveIntensity = 0.08;

  if (lit) {
    baseColor = mixHex(baseColor, '#ffdca3', isNight ? 0.65 : 0.3);
    emissive = options.emissiveHex || (isNight ? '#ffca78' : '#a8d5f2');
    emissiveIntensity = isNight ? 0.78 : 0.25;
  }

  const mat = new THREE.MeshPhongMaterial({
    color: baseColor,
    emissive,
    emissiveIntensity,
    shininess: 95,
    specular: '#cce7ff',
    transparent,
    opacity,
    depthWrite: !transparent
  });
  matCache.set(key, mat);
  return mat;
}

export function surfaceMaterial(kind = 'concrete', hex = '#8c949c', condition = 'clean', seed = 101, repeatX = 1, repeatY = 1) {
  const clean = colorHex(hex, '#8c949c');
  const wear = getWearScore(condition);
  const rx = Math.max(1, Math.round(repeatX));
  const ry = Math.max(1, Math.round(repeatY));
  const key = `surf:${kind}:${clean}:${condition}:${seed % 17}:${rx}:${ry}`;
  if (matCache.has(key)) return matCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32((seed || 101) >>> 0);

  if (ctx) {
    const baseTone = wear > 0.55 ? darkenHex(clean, (wear - 0.45) * 0.28) : clean;
    ctx.fillStyle = baseTone;
    ctx.fillRect(0, 0, 256, 256);

    if (kind === 'brick' || kind === 'decorative_masonry') {
      const mortar = mixHex(baseTone, '#cfc8bc', 0.35);
      ctx.fillStyle = mortar;
      ctx.fillRect(0, 0, 256, 256);
      const rows = 12;
      const cols = 6;
      const bh = 256 / rows;
      const bw = 256 / cols;
      for (let row = 0; row < rows; row++) {
        const offset = (row % 2) * (bw * 0.5);
        for (let col = -1; col <= cols; col++) {
          const shade = r() > 0.5 ? lightenHex(baseTone, r() * 0.1) : darkenHex(baseTone, r() * 0.16);
          ctx.fillStyle = shade;
          ctx.fillRect(col * bw + offset + 1.5, row * bh + 1.5, bw - 3, bh - 3);
        }
      }
    } else if (kind === 'stone') {
      ctx.strokeStyle = darkenHex(baseTone, 0.24);
      ctx.lineWidth = 3;
      const rows = 6;
      const rh = 256 / rows;
      for (let row = 0; row < rows; row++) {
        const cols = 3 + (row % 2);
        const cw = 256 / cols;
        for (let col = 0; col < cols; col++) {
          ctx.fillStyle = r() > 0.5 ? lightenHex(baseTone, 0.08 * r()) : darkenHex(baseTone, 0.12 * r());
          ctx.fillRect(col * cw + 2, row * rh + 2, cw - 4, rh - 4);
        }
      }
    } else if (kind === 'metal_siding' || kind === 'industrial_steel') {
      const ribs = 16;
      const rw = 256 / ribs;
      for (let i = 0; i < ribs; i++) {
        ctx.fillStyle = i % 2 === 0 ? lightenHex(baseTone, 0.06) : darkenHex(baseTone, 0.12);
        ctx.fillRect(i * rw, 0, rw, 256);
      }
    } else if (kind === 'painted_wood') {
      const planks = 12;
      const ph = 256 / planks;
      for (let i = 0; i < planks; i++) {
        ctx.fillStyle = r() > 0.5 ? lightenHex(baseTone, 0.05) : darkenHex(baseTone, 0.08);
        ctx.fillRect(0, i * ph + 1, 256, ph - 2);
      }
    } else if (kind === 'tile') {
      const n = 8;
      const s = 256 / n;
      ctx.fillStyle = darkenHex(baseTone, 0.2);
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          ctx.fillStyle = r() > 0.5 ? lightenHex(baseTone, 0.05) : baseTone;
          ctx.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3);
        }
      }
    } else if (kind === 'asphalt') {
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle = r() > 0.5 ? lightenHex(baseTone, 0.12) : darkenHex(baseTone, 0.16);
        ctx.fillRect(r() * 254, r() * 254, 3, 3);
      }
    } else {
      // Concrete, stucco, mixed_commercial
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = r() > 0.5 ? lightenHex(baseTone, 0.06) : darkenHex(baseTone, 0.09);
        ctx.fillRect(r() * 250, r() * 250, 6 + r() * 8, 4 + r() * 6);
      }
    }

    // Condition weathering & grime streaks
    if (wear > 0.2) {
      const count = Math.round(wear * 28);
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = `rgba(24, 22, 18, ${(0.12 + wear * 0.22).toFixed(2)})`;
        ctx.fillRect(r() * 240, r() * 220, 6 + r() * 18, 14 + r() * 44);
      }
      if (wear > 0.65) {
        ctx.strokeStyle = 'rgba(18, 16, 14, 0.48)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const sx = r() * 220 + 16;
          const sy = r() * 200 + 16;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (r() - 0.5) * 44, sy + 28 + r() * 35);
          ctx.stroke();
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = Math.min(maxAnisotropy, 4);

  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  matCache.set(key, mat);
  texCache.set(key, tex);
  return mat;
}

export function signboardMaterial(text = 'SPECIALTY', bgHex = '#1e3552', fgHex = '#ffffff', lit = true, lightingTime = 'day') {
  const bg = colorHex(bgHex, '#1e3552');
  const fg = colorHex(fgHex, '#ffffff');
  const label = String(text || 'B REMASTERED').slice(0, 32);
  const key = `sign:${label}:${bg}:${fg}:${lit}:${lightingTime}`;
  if (matCache.has(key)) return matCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fontSize = 48;
    ctx.font = `bold ${fontSize}px Arial`;
    while (fontSize > 18 && ctx.measureText(label).width > 456) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    ctx.fillText(label, 256, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const isNight = lightingTime === 'night' || lightingTime === 'dusk';
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: '#ffffff',
    emissive: lit ? bg : '#000000',
    emissiveIntensity: lit ? (isNight ? 0.68 : 0.25) : 0
  });
  matCache.set(key, mat);
  texCache.set(key, tex);
  return mat;
}

const FICTIONAL_WINDOW_ADS = [
  { title: 'FIZZPOP', sub: '2 FOR $3', bg: '#d93228', fg: '#ffffff' },
  { title: 'TURBO BREW', sub: 'FRESH COFFEE', bg: '#4e2e1e', fg: '#ffe38c' },
  { title: 'ICE COLD', sub: 'BAGGED ICE', bg: '#185e9c', fg: '#ffffff' },
  { title: 'LUCKY STAR', sub: 'LOTTO HERE', bg: '#1e7a46', fg: '#ffdf6b' },
  { title: 'SNACK PACK', sub: 'MEAL DEAL', bg: '#d98a1e', fg: '#161b22' },
  { title: 'OPEN 24H', sub: 'NIGHTLY', bg: '#1b2838', fg: '#4de2ff' },
  { title: 'SUPER SUBS', sub: 'HOT & READY', bg: '#9e2a4b', fg: '#ffffff' },
  { title: 'MEGA CHILL', sub: 'ENERGY DRINK', bg: '#15324a', fg: '#6ce8ac' }
];

export function windowAdPosterMaterial(adIndex = 0, condition = 'clean') {
  const item = FICTIONAL_WINDOW_ADS[Math.abs(adIndex) % FICTIONAL_WINDOW_ADS.length];
  const wear = getWearScore(condition);
  const key = `winad:${item.title}:${condition}`;
  if (matCache.has(key)) return matCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = item.bg;
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = item.fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 236, 300);
    ctx.fillStyle = item.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(item.title, 128, 120);
    ctx.font = 'bold 24px Arial';
    ctx.fillText(item.sub, 128, 195);
    if (wear > 0.45) {
      ctx.fillStyle = `rgba(30, 26, 20, ${(wear * 0.35).toFixed(2)})`;
      ctx.fillRect(0, 220, 256, 100);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  matCache.set(key, mat);
  texCache.set(key, tex);
  return mat;
}

export function getClaySilhouetteMaterial() {
  const key = 'specialty_clay_silhouette';
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color: '#9ab0c4' }));
  }
  return matCache.get(key);
}

export function applyPreviewMaterialOverrides(root, options = {}) {
  if (!root) return;
  const silhouette = Boolean(options.silhouetteMode);
  const wireframe = Boolean(options.wireframe);
  const clay = getClaySilhouetteMaterial();

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (silhouette) {
      if (!obj.userData._origMat) obj.userData._origMat = obj.material;
      obj.material = clay;
    } else if (obj.userData._origMat) {
      obj.material = obj.userData._origMat;
    }
    if (obj.material) {
      obj.material.wireframe = wireframe;
    }
  });
}
