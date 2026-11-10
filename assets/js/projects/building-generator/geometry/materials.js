import { clamp, rng32, randBetween, colorHex, hexToRgb } from '../utils.js';

let materials = new Map();
let modelTextures = new Map();
let currentLightingMode = 'day';
let currentMaxAnisotropy = 1;

export function setMaterialLightingMode(mode) {
  currentLightingMode = mode;
}

export function setMaterialMaxAnisotropy(aniso) {
  currentMaxAnisotropy = aniso;
}

export function solid(hex, options = {}) {
  const key = 'solid:' + hex + ':' + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color: hex, ...options }));
  return materials.get(key);
}

export function puddleMaterial() {
  const key = 'puddle-water';
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshPhongMaterial({
      color: '#233846',
      emissive: '#0a1620',
      emissiveIntensity: 0.25,
      specular: '#c8e6ff',
      shininess: 140
    }));
  }
  return materials.get(key);
}

export function glassMaterial(hex, lit = false) {
  const isDay = currentLightingMode === 'day';
  const key = 'glass:' + hex + ':' + lit + ':' + isDay;
  if (!materials.has(key)) {
    const color = new THREE.Color(hex);
    if (lit) color.lerp(new THREE.Color('#ffda88'), isDay ? 0.58 : 0.85);
    materials.set(key, new THREE.MeshPhongMaterial({
      color,
      emissive: lit ? (isDay ? '#8f6f38' : '#c79e54') : '#050b10',
      emissiveIntensity: lit ? (isDay ? 0.42 : 0.72) : 0.08,
      shininess: 90,
      specular: '#3d4f58'
    }));
  }
  return materials.get(key);
}

export function textureMaterial(kind, mainHex, secondaryHex, mortarHex, cfg, keySeed, width, height) {
  const n = Math.floor(cfg.brickScale * 10);
  const v = Math.floor(cfg.colorVariation * 100);
  const age = Math.floor(cfg.age * 100);
  const dmg = Math.floor(cfg.damage * 100);
  const grimeHex = colorHex(cfg.grimeColor);
  const id = [kind, mainHex, secondaryHex, mortarHex, grimeHex, n, v, age, dmg, keySeed, Math.round(width * 10), Math.round(height * 10)].join('|');
  if (materials.has(id)) return materials.get(id);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32(keySeed + 7919);
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
  const grime = hexToRgb(grimeHex);

  ctx.fillStyle = kind === 'brick' || kind === 'stone' ? mortarHex : mainHex;
  ctx.fillRect(0, 0, 256, 256);

  if (kind === 'brick' || kind === 'stone') {
    const rows = kind === 'brick' ? 12 : 7;
    const cols = kind === 'brick' ? 5 : 4;
    const bh = 256 / rows;
    const bw = 256 / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < cols + 1; x++) {
        const shift = (y % 2) * bw * 0.5;
        const px = x * bw + shift;
        const py = y * bh;
        const brightness = (r() - 0.5) * cfg.colorVariation * 1.1;
        ctx.fillStyle = mix(mainHex, secondaryHex, clamp(0.34 + brightness, 0, 1));
        const grout = kind === 'brick' ? 2.2 : 3.5;
        ctx.fillRect(px + grout, py + grout, bw - grout * 1.7, bh - grout * 1.8);
        if (cfg.age > 0.08 && r() < cfg.age * 0.55) {
          const alpha = (r() * cfg.age * 0.35).toFixed(3);
          ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
          ctx.fillRect(px + 3, py + bh * 0.52, bw - 6, bh * 0.34);
        }
      }
    }
  } else {
    ctx.strokeStyle = mix(mainHex, mortarHex, 0.38);
    ctx.lineWidth = kind === 'concrete' ? 2 : 1;
    const panelStep = kind === 'concrete' ? 64 : 128;
    for (let p = panelStep; p < 256; p += panelStep) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 240; i++) {
      const patchColor = r() > 0.5 ? secondaryHex : mortarHex;
      ctx.fillStyle = patchColor;
      ctx.globalAlpha = r() * 0.14 * (cfg.colorVariation + 0.15);
      ctx.fillRect(r() * 256, r() * 256, randBetween(r, 3, 22), randBetween(r, 2, 12));
    }
    ctx.globalAlpha = 1;
  }

  if (cfg.age > 0.05) {
    const streaks = Math.floor(95 * cfg.age);
    for (let i = 0; i < streaks; i++) {
      const alpha = (r() * cfg.age * 0.38).toFixed(3);
      ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
      ctx.fillRect(r() * 255, r() * 255, randBetween(r, 3, 42), randBetween(r, 3, 26));
    }
  }

  if (cfg.damage > 0.05) {
    const cracks = Math.ceil(cfg.damage * 14);
    for (let i = 0; i < cracks; i++) {
      ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${(0.35 + cfg.damage * 0.4).toFixed(2)})`;
      const cx = r() * 230;
      const cy = r() * 230;
      ctx.fillRect(cx, cy, randBetween(r, 8, 28), randBetween(r, 4, 16));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.repeat.set(
    Math.max(1, (width / (kind === 'brick' ? 4.5 : 6)) * cfg.brickScale),
    Math.max(0.7, (height / (kind === 'brick' ? 3 : 4)) * cfg.brickScale)
  );
  texture.anisotropy = Math.min(currentMaxAnisotropy || 1, 4);
  const mat = new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff });
  materials.set(id, mat);
  modelTextures.set(id, texture);
  return mat;
}

export function registerTexture(key, tex) {
  modelTextures.set(key, tex);
  return tex;
}

export function clearMaterialCache() {
  for (const mat of materials.values()) mat.dispose();
  for (const tex of modelTextures.values()) tex.dispose();
  materials.clear();
  modelTextures.clear();
}
