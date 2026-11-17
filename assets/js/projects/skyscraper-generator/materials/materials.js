import { clamp, rng32, colorHex, mixHex, darkenHex, lightenHex } from '../utils.js';
import { MATERIAL_FAMILIES } from '../config.js';

let matCache = new Map();
let texCache = new Map();
let maxAnisotropy = 1;

export function setSkyscraperMaxAnisotropy(aniso) {
  maxAnisotropy = Math.max(1, Number(aniso) || 1);
}

export function clearSkyscraperMaterialCache() {
  for (const m of matCache.values()) m.dispose();
  for (const t of texCache.values()) t.dispose();
  matCache.clear();
  texCache.clear();
}

function createSurfaceCanvas(familyId, baseHex, variation = 0.15, seed = 101) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.concrete;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32(seed);
  const cleanHex = colorHex(baseHex, fam.defaultColor);

  ctx.fillStyle = cleanHex;
  ctx.fillRect(0, 0, 256, 256);

  const darkTone = darkenHex(cleanHex, 0.18 + variation * 0.25);
  const lightTone = lightenHex(cleanHex, 0.11 + variation * 0.18);

  if (fam.pattern === 'brick') {
    const rows = 16;
    const cols = 6;
    const bh = 256 / rows;
    const bw = 256 / cols;
    ctx.fillStyle = darkenHex(cleanHex, 0.34);
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < cols + 1; x++) {
        const shift = (y % 2) * bw * 0.5;
        ctx.fillStyle = mixHex(darkTone, lightTone, clamp(0.45 + (r() - 0.5) * variation * 2, 0, 1));
        ctx.fillRect(x * bw + shift + 2, y * bh + 2, bw - 3, bh - 3);
      }
    }
  } else if (fam.pattern === 'stone' || fam.pattern === 'granite') {
    const rows = fam.pattern === 'granite' ? 8 : 6;
    const cols = 4;
    const bh = 256 / rows;
    const bw = 256 / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = mixHex(darkTone, lightTone, clamp(0.46 + (r() - 0.5) * variation * 1.5, 0, 1));
        ctx.fillRect(x * bw + 2, y * bh + 2, bw - 3, bh - 3);
      }
    }
    if (fam.pattern === 'granite') {
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = r() > 0.5 ? lightTone : darkTone;
        ctx.fillRect(r() * 252, r() * 252, 3, 3);
      }
    }
  } else if (fam.pattern === 'metal') {
    ctx.strokeStyle = darkenHex(cleanHex, 0.25);
    ctx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = mixHex(cleanHex, lightTone, 0.4);
      ctx.fillRect(0, i * 16, 256, 3);
    }
  } else if (fam.pattern === 'glass') {
    if (typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, lightenHex(cleanHex, 0.16));
      grad.addColorStop(0.5, cleanHex);
      grad.addColorStop(1, darkenHex(cleanHex, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    } else {
      for (let b = 0; b < 8; b++) {
        ctx.fillStyle = mixHex(lightenHex(cleanHex, 0.14), darkenHex(cleanHex, 0.16), b / 7);
        ctx.fillRect(0, b * 32, 256, 32);
      }
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.3);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 252);
  } else {
    // Concrete panel lines
    ctx.strokeStyle = darkenHex(cleanHex, 0.18);
    ctx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = mixHex(darkTone, lightTone, r());
      ctx.fillRect(r() * 240, r() * 240, 12 + r() * 20, 6 + r() * 14);
    }
  }

  return canvas;
}

export function getSkyscraperMaterial(familyId, hexColor, options = {}) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.concrete;
  const cleanHex = colorHex(hexColor, fam.defaultColor);
  const variation = clamp(Number(options.colorVariation) ?? 0.15, 0, 0.5);
  const role = options.role || 'surface';
  const emissiveHex = options.emissiveHex || '#000000';
  const emissiveIntensity = Number(options.emissiveIntensity) || 0;
  const key = [role, familyId, cleanHex, Math.round(variation * 50), emissiveHex, emissiveIntensity.toFixed(2)].join('|');

  if (matCache.has(key)) return matCache.get(key);

  const canvas = createSurfaceCanvas(familyId, cleanHex, variation, options.seed || 307);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(options.repeatX || 1, options.repeatY || 1);
  texture.anisotropy = Math.min(maxAnisotropy, 4);

  const isMetalOrGlass = fam.category === 'metal' || fam.category === 'glass';
  const mat = isMetalOrGlass
    ? new THREE.MeshPhongMaterial({
        map: texture,
        color: '#ffffff',
        shininess: fam.shininess,
        specular: fam.category === 'glass' ? '#8ab4d6' : '#586470',
        emissive: emissiveHex,
        emissiveIntensity
      })
    : new THREE.MeshLambertMaterial({
        map: texture,
        color: '#ffffff',
        emissive: emissiveHex,
        emissiveIntensity
      });

  matCache.set(key, mat);
  texCache.set(key, texture);
  return mat;
}

export function getSolidMaterial(hexColor, shininess = 18, emissiveHex = '#000000', emissiveIntensity = 0) {
  const clean = colorHex(hexColor, '#777777');
  const key = `solid|${clean}|${shininess}|${emissiveHex}|${emissiveIntensity.toFixed(2)}`;
  if (matCache.has(key)) return matCache.get(key);
  const mat = shininess > 30
    ? new THREE.MeshPhongMaterial({
        color: clean,
        shininess,
        specular: '#6c8296',
        emissive: emissiveHex,
        emissiveIntensity
      })
    : new THREE.MeshLambertMaterial({
        color: clean,
        emissive: emissiveHex,
        emissiveIntensity
      });
  matCache.set(key, mat);
  return mat;
}

export function getWindowPaneMaterials(cfg, lightingTimeOverride = null) {
  const timeMode = lightingTimeOverride || cfg.lightingTime || 'day';
  const isNight = timeMode === 'night';
  const isDusk = timeMode === 'dusk';
  const isGolden = timeMode === 'golden_hour';
  const glassFam = cfg.glassMaterial || 'tinted_glass';
  const baseGlass = colorHex(cfg.glassColor, '#27435c');

  const unlitColor = isNight ? darkenHex(baseGlass, 0.35) : baseGlass;
  const unlitMat = getSkyscraperMaterial(glassFam, unlitColor, {
    role: 'glass_unlit',
    colorVariation: 0.08,
    emissiveHex: isNight ? '#050b14' : '#081320',
    emissiveIntensity: isNight ? 0.08 : 0.1
  });

  const warmBase = isNight ? '#ffcb77' : isDusk ? '#ffd58f' : isGolden ? '#ffe1a8' : mixHex(baseGlass, '#ffe6b8', 0.42);
  const warmMat = getSolidMaterial(warmBase, 110, isNight ? '#e08b28' : isDusk ? '#c87c24' : '#735a30', isNight ? 0.92 : isDusk ? 0.65 : isGolden ? 0.35 : 0.16);

  const coolBase = isNight ? '#b5dcff' : isDusk ? '#c4e3ff' : isGolden ? '#cce6ff' : mixHex(baseGlass, '#c2e3ff', 0.45);
  const coolMat = getSolidMaterial(coolBase, 120, isNight ? '#6cb5f5' : isDusk ? '#589ad6' : '#35608a', isNight ? 0.85 : isDusk ? 0.58 : isGolden ? 0.28 : 0.14);

  const dimBase = mixHex(baseGlass, '#59748c', 0.35);
  const dimMat = getSolidMaterial(dimBase, 95, isNight ? '#1b2c3d' : '#111e2b', isNight ? 0.28 : 0.1);

  return { unlitMat, warmMat, coolMat, dimMat };
}

export function getSilhouetteClayMaterial() {
  const key = 'silhouette_clay_mat';
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color: '#9fb0bd' }));
  }
  return matCache.get(key);
}

export function resolveMaterialBundle(cfg, lightingTimeOverride = null) {
  const panes = getWindowPaneMaterials(cfg, lightingTimeOverride);
  return {
    primary: getSkyscraperMaterial(cfg.primaryMaterial, cfg.primaryColor, { role: 'primary', colorVariation: cfg.colorVariation, seed: cfg.seed + 11 }),
    secondary: getSkyscraperMaterial(cfg.secondaryMaterial, cfg.secondaryColor, { role: 'secondary', colorVariation: cfg.colorVariation, seed: cfg.seed + 23 }),
    framing: getSkyscraperMaterial(cfg.framingMaterial, cfg.framingColor, { role: 'framing', colorVariation: cfg.colorVariation * 0.6, seed: cfg.seed + 37 }),
    mullion: getSkyscraperMaterial(cfg.mullionMaterial, cfg.mullionColor, { role: 'mullion', colorVariation: 0.05, seed: cfg.seed + 41 }),
    trim: getSkyscraperMaterial(cfg.trimMaterial, cfg.trimColor, { role: 'trim', colorVariation: cfg.colorVariation * 0.5, seed: cfg.seed + 53 }),
    crown: getSkyscraperMaterial(cfg.crownMaterial, cfg.crownColor, { role: 'crown', colorVariation: cfg.colorVariation * 0.5, seed: cfg.seed + 61 }),
    podium: getSkyscraperMaterial(cfg.podiumMaterial, cfg.podiumColor, { role: 'podium', colorVariation: cfg.colorVariation * 0.6, seed: cfg.seed + 79 }),
    glass: panes.unlitMat,
    glassUnlit: panes.unlitMat,
    glassWarm: panes.warmMat,
    glassCool: panes.coolMat,
    glassDim: panes.dimMat,
    plaza: getSkyscraperMaterial('granite', '#6c7278', { role: 'plaza', colorVariation: 0.12, seed: cfg.seed + 97 }),
    darkMetal: getSolidMaterial('#242a32', 55),
    beaconRed: getSolidMaterial('#ff384b', 40, '#ff2a3e', 0.95),
    crownLight: getSolidMaterial('#d9f5ff', 40, '#85dcff', cfg.crownLighting ? 0.85 : 0.1)
  };
}

export function reapplySkyscraperMaterials(root, cfg, view = {}) {
  if (!root) return;
  const silhouette = Boolean(view.silhouetteMode);
  const bundle = resolveMaterialBundle(cfg, view.lightingTime || cfg.lightingTime);
  const clay = getSilhouetteClayMaterial();

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData?.layer === 'facade') {
      obj.visible = !silhouette;
    }
    if (silhouette) {
      if (!obj.userData._origMatRef) obj.userData._origMatRef = obj.material;
      obj.material = clay;
    } else {
      const role = obj.userData?.materialRole;
      if (role && bundle[role]) {
        obj.material = bundle[role];
      } else if (obj.userData._origMatRef) {
        obj.material = obj.userData._origMatRef;
      }
      obj.material.wireframe = Boolean(view.wireframe);
    }
  });
}
