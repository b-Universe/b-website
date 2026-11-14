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

let gratingCanvasCache = null;

function getGratingCanvas(hex) {
  if (gratingCanvasCache && gratingCanvasCache.hex === hex) {
    return gratingCanvasCache.canvas;
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(hex);
  const highlight = base.clone().lerp(new THREE.Color('#8a9aa3'), 0.28).getStyle();
  const shadow = base.clone().lerp(new THREE.Color('#14181a'), 0.35).getStyle();
  const mid = base.getStyle();

  ctx.clearRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;
  const barW = 6;
  const crossW = 5;

  // Cross-bars (horizontal)
  for (let i = 0; i < cells; i++) {
    const y = Math.round(i * step);
    ctx.fillStyle = shadow;
    ctx.fillRect(0, y, size, crossW);
    ctx.fillStyle = mid;
    ctx.fillRect(0, y, size, crossW - 1);
  }

  // Primary bearing bars (vertical)
  for (let i = 0; i < cells; i++) {
    const x = Math.round(i * step);
    ctx.fillStyle = shadow;
    ctx.fillRect(x, 0, barW, size);
    ctx.fillStyle = mid;
    ctx.fillRect(x, 0, barW - 1, size);
    ctx.fillStyle = highlight;
    ctx.fillRect(x + 1, 0, 1, size);
  }

  gratingCanvasCache = { hex, canvas };
  return canvas;
}

export function gratingMaterial(hex = '#3a4347', width = 1, depth = 1) {
  const rx = Math.max(1, Math.round(width * 2.5 * 10) / 10);
  const rz = Math.max(1, Math.round(depth * 2.5 * 10) / 10);
  const key = `grating:${hex}:${rx}:${rz}`;
  if (materials.has(key)) return materials.get(key);

  const canvas = getGratingCanvas(hex);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, rz);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(currentMaxAnisotropy || 1, 4);

  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    color: 0xffffff,
    alphaTest: 0.45,
    side: THREE.DoubleSide
  });

  materials.set(key, mat);
  modelTextures.set(key, texture);
  return mat;
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

export function glassMaterial(hex, lit = false, options = {}) {
  const mode = options.lightingMode || currentLightingMode;
  const isDay = mode === 'day';
  const isNight = mode === 'night' || mode === 'late_night' || mode === 'evening';
  const profile = options.profile || 'auto';
  const key = 'glass:' + hex + ':' + lit + ':' + mode + ':' + profile;

  if (!materials.has(key)) {
    const color = new THREE.Color(hex);
    let emissiveHex = '#050b10';
    let emissiveIntensity = 0.08;

    if (lit) {
      if (profile === 'commercial') {
        color.lerp(new THREE.Color('#dbeafe'), isDay ? 0.45 : 0.85);
        emissiveHex = isNight ? '#93c5fd' : '#bfdbfe';
        emissiveIntensity = isNight ? 0.88 : 0.45;
      } else if (profile === 'derelict') {
        color.lerp(new THREE.Color('#a3b18a'), 0.5);
        emissiveHex = '#4a5335';
        emissiveIntensity = 0.35;
      } else {
        color.lerp(new THREE.Color('#ffd085'), isDay ? 0.58 : 0.88);
        emissiveHex = isNight ? '#d97706' : '#b45309';
        emissiveIntensity = isNight ? 0.82 : 0.42;
      }
    }

    materials.set(key, new THREE.MeshPhongMaterial({
      color,
      emissive: emissiveHex,
      emissiveIntensity,
      shininess: 90,
      specular: '#3d4f58'
    }));
  }
  return materials.get(key);
}

export function graffitiMaterial(seed, style = 'mixed', variantIdx = 0) {
  const resolvedStyle = style === 'mixed'
    ? ['tags', 'stencils', 'posters'][Math.abs(variantIdx + seed) % 3]
    : style;
  const key = 'graffiti:' + seed + ':' + resolvedStyle;
  if (materials.has(key)) return materials.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const r = rng32(seed + 419);

  ctx.clearRect(0, 0, 256, 128);

  const palette = ['#ef4444', '#f8fafc', '#38bdf8', '#facc15', '#fb923c', '#ec4899', '#a855f7', '#22d3ee', '#4ade80'];
  const tagColor = palette[Math.floor(r() * palette.length)];
  const accentColor = palette[Math.floor(r() * palette.length)];

  if (resolvedStyle === 'stencils') {
    const labels = ['SECTOR 04', 'NO TRESPASS', 'HIGH VOLT', 'KEEP CLEAR', 'PARAGON PD', 'ZONE B-12'];
    const text = labels[Math.floor(r() * labels.length)];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(16, 14, 224, 100);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f87171';
    ctx.strokeRect(20, 18, 216, 92);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 66);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(36, 82, 184, 8);
  } else if (resolvedStyle === 'posters') {
    const titles = ['NIGHT CITY', 'LIVE SHOW', 'NOCTURNE', 'CLUB APEX', 'SHOWDOWN', 'METRO ART'];
    const title = titles[Math.floor(r() * titles.length)];
    // Two overlapping wheatpaste flyers
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(24, 14, 140, 100);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(24, 14, 140, 26);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 94, 33);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('TONIGHT 9PM', 94, 72);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(142, 26, 92, 84);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(142, 26, 92, 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('INFO #12', 188, 76);
  } else {
    const tagWords = ['VORTEX', 'BEHR', 'PULSE', 'NEO', 'RUSH', 'CIPHER', 'ECHO', 'APEX', 'FLUX', 'KINGS'];
    const word = tagWords[Math.floor(r() * tagWords.length)];
    // Spray-paint halo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
    ctx.beginPath();
    ctx.ellipse(128, 62, 106, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'italic bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(word, 128, 72);
    ctx.fillStyle = tagColor;
    ctx.fillText(word, 128, 72);

    ctx.fillStyle = accentColor;
    ctx.fillRect(46, 80, 164, 5);

    ctx.fillStyle = tagColor;
    for (let i = 0; i < 5; i++) {
      const dripX = 56 + r() * 144;
      const dripH = 12 + r() * 28;
      ctx.fillRect(dripX, 76, 4, dripH);
      ctx.beginPath();
      ctx.arc(dripX + 2, 76 + dripH, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    opacity: 0.96,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  materials.set(key, mat);
  modelTextures.set(key, texture);
  return mat;
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
