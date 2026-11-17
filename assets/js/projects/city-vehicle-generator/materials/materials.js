import { clamp, rng32, colorHex, mixHex, darkenHex, lightenHex } from '../utils.js';
import { MATERIAL_FAMILIES } from '../config.js';

let matCache = new Map();
let texCache = new Map();
let maxAnisotropy = 1;

export function setVehicleMaxAnisotropy(aniso) {
  maxAnisotropy = Math.max(1, Number(aniso) || 1);
}

export function clearVehicleMaterialCache() {
  for (const m of matCache.values()) m.dispose();
  for (const t of texCache.values()) t.dispose();
  matCache.clear();
  texCache.clear();
}

function createVehicleSurfaceCanvas(familyId, baseHex, options = {}) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.painted_metal;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32(options.seed || 211);
  const cleanHex = colorHex(baseHex, fam.defaultColor);
  const variation = clamp(Number(options.colorVariation) ?? 0.12, 0, 0.4);
  const wearLevel = options.wearLevel || 'clean';

  ctx.fillStyle = cleanHex;
  ctx.fillRect(0, 0, 256, 256);

  const darkTone = darkenHex(cleanHex, 0.15 + variation * 0.35);
  const lightTone = lightenHex(cleanHex, 0.12 + variation * 0.25);

  if (fam.pattern === 'glass') {
    const tintAmt = clamp(Number(options.windowTint) ?? 0.35, 0.1, 0.85);
    const topGlass = lightenHex(cleanHex, 0.22 * (1 - tintAmt * 0.5));
    const botGlass = darkenHex(cleanHex, 0.18 + tintAmt * 0.2);
    for (let b = 0; b < 8; b++) {
      ctx.fillStyle = mixHex(topGlass, botGlass, b / 7);
      ctx.fillRect(0, b * 32, 256, 32);
    }
    const streakBase = 16 + Math.floor(r() * 34);
    ctx.fillStyle = lightenHex(cleanHex, 0.34);
    for (let s = 0; s < 3; s++) {
      ctx.fillRect((streakBase + s * 74) % 230, 18, 18 + Math.floor(r() * 12), 220);
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.38);
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
  } else if (fam.pattern === 'rubber') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = darkenHex(cleanHex, 0.26);
    for (let y = 0; y < 256; y += 16) {
      ctx.fillRect(0, y, 256, 6);
    }
    ctx.fillStyle = lightenHex(cleanHex, 0.08);
    for (let x = 16; x < 256; x += 32) {
      ctx.fillRect(x, 0, 4, 256);
    }
  } else if (fam.pattern === 'metal' || fam.pattern === 'utility') {
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? lightTone : cleanHex;
      ctx.fillRect(0, y, 256, 8);
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.22);
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 248);
    if (fam.pattern === 'utility') {
      ctx.fillStyle = darkenHex(cleanHex, 0.28);
      for (let i = 16; i < 256; i += 48) {
        ctx.fillRect(i, 10, 4, 4);
        ctx.fillRect(i, 242, 4, 4);
      }
    }
  } else {
    // Painted / Matte / Plastic / Worn body shading with subtle seeded tone bands
    const bandJitter = 0.04 + variation * 0.25;
    for (let row = 0; row < 16; row++) {
      const t = row / 15;
      const baseBand = t < 0.35
        ? mixHex(lightTone, cleanHex, t / 0.35)
        : mixHex(cleanHex, darkTone, (t - 0.35) / 0.65);
      const bandColor = r() > 0.5
        ? lightenHex(baseBand, r() * bandJitter)
        : darkenHex(baseBand, r() * bandJitter);
      ctx.fillStyle = bandColor;
      ctx.fillRect(0, row * 16, 256, 16);
    }

    // Subtle panel seam line
    ctx.strokeStyle = darkenHex(cleanHex, 0.16);
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 250, 250);

    // Stylized wear speckling & lower road-grime shading
    const wearFactor = wearLevel === 'municipal_worn' ? 0.85
      : wearLevel === 'worn' ? 0.65
      : wearLevel === 'slightly_used' ? 0.3
      : 0;
    const isWornMat = fam.pattern === 'worn' || wearFactor > 0;
    if (isWornMat) {
      const count = Math.round((fam.pattern === 'worn' ? 85 : 15) + wearFactor * 90);
      const grimeHex = mixHex(cleanHex, '#594b3b', 0.36 + wearFactor * 0.25);
      ctx.fillStyle = grimeHex;
      ctx.fillRect(0, 214, 256, 42);
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = r() > 0.45 ? grimeHex : darkenHex(cleanHex, 0.24);
        ctx.fillRect(Math.floor(r() * 244), Math.floor(r() * 244), 4 + Math.floor(r() * 14), 3 + Math.floor(r() * 7));
      }
    }
  }

  return canvas;
}

function createCheckerCanvas(colorA = '#e2ae2c', colorB = '#1d2228') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const sq = 32;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x * sq, y * sq, sq, sq);
    }
  }
  return canvas;
}

export function getVehicleMaterial(familyId, hexColor, options = {}) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.painted_metal;
  const cleanHex = colorHex(hexColor, fam.defaultColor);
  const variation = clamp(Number(options.colorVariation) ?? 0.12, 0, 0.4);
  const wearLevel = options.wearLevel || 'clean';
  const windowTint = clamp(Number(options.windowTint) ?? 0.35, 0.1, 0.85);
  const role = options.role || 'body';
  const emissiveHex = options.emissiveHex || '#000000';
  const emissiveIntensity = Number(options.emissiveIntensity) || 0;
  const seedKey = Number(options.seed) || 307;
  const key = [
    role,
    familyId,
    cleanHex,
    Math.round(variation * 50),
    wearLevel,
    fam.pattern === 'glass' ? Math.round(windowTint * 20) : 0,
    seedKey,
    emissiveHex,
    emissiveIntensity.toFixed(2)
  ].join('|');

  if (matCache.has(key)) return matCache.get(key);

  const canvas = createVehicleSurfaceCanvas(familyId, cleanHex, {
    seed: options.seed || 307,
    colorVariation: variation,
    wearLevel,
    windowTint
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(maxAnisotropy, 4);

  const isShiny = fam.category === 'paint' || fam.category === 'metal' || fam.category === 'glass';
  const mat = isShiny
    ? new THREE.MeshPhongMaterial({
        map: texture,
        color: '#ffffff',
        shininess: fam.shininess,
        specular: fam.category === 'glass' ? '#95c2e6' : fam.category === 'metal' ? '#9eaab8' : '#586470',
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

export function getCheckerMaterial(colorA, colorB) {
  const a = colorHex(colorA, '#e2ae2c');
  const b = colorHex(colorB, '#1d2228');
  const key = `checker|${a}|${b}`;
  if (matCache.has(key)) return matCache.get(key);
  const canvas = createCheckerCanvas(a, b);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  matCache.set(key, mat);
  texCache.set(key, tex);
  return mat;
}

export function getSolidVehicleMaterial(hexColor, shininess = 22, emissiveHex = '#000000', emissiveIntensity = 0) {
  const clean = colorHex(hexColor, '#777777');
  const key = `solid|${clean}|${shininess}|${emissiveHex}|${emissiveIntensity.toFixed(2)}`;
  if (matCache.has(key)) return matCache.get(key);
  const mat = shininess > 28
    ? new THREE.MeshPhongMaterial({
        color: clean,
        shininess,
        specular: '#7a8a99',
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

export function getSilhouetteClayMaterial() {
  const key = 'veh_silhouette_clay_mat';
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color: '#9eb0be' }));
  }
  return matCache.get(key);
}

export function resolveVehicleMaterialBundle(cfg, options = {}) {
  const timeMode = options.lightingTime || cfg.lightingTime || 'day';
  const isLowLight = timeMode === 'night' || timeMode === 'dusk';
  const headlightsLit = Boolean(cfg.headlightsLit) && (isLowLight || timeMode === 'golden_hour' || timeMode === 'day');
  const beaconsLit = Boolean(cfg.emergencyLightsLit);

  const headGlow = headlightsLit ? (isLowLight ? 0.95 : 0.45) : 0.05;
  const tailGlow = headlightsLit ? (isLowLight ? 0.85 : 0.35) : 0.06;
  const beaconGlow = beaconsLit ? (isLowLight ? 1.0 : 0.62) : 0.08;

  return {
    primary: getVehicleMaterial(cfg.bodyPrimaryMaterial, cfg.bodyPrimaryColor, {
      role: 'primary',
      colorVariation: cfg.colorVariation,
      wearLevel: cfg.wearLevel,
      seed: cfg.seed + 11
    }),
    secondary: getVehicleMaterial(cfg.bodySecondaryMaterial, cfg.bodySecondaryColor, {
      role: 'secondary',
      colorVariation: cfg.colorVariation,
      wearLevel: cfg.wearLevel,
      seed: cfg.seed + 23
    }),
    trim: getVehicleMaterial(cfg.trimMaterial, cfg.trimColor, {
      role: 'trim',
      colorVariation: cfg.colorVariation * 0.4,
      wearLevel: 'clean',
      seed: cfg.seed + 37
    }),
    bumper: getVehicleMaterial(cfg.bumperMaterial, cfg.bumperColor, {
      role: 'bumper',
      colorVariation: cfg.colorVariation * 0.35,
      wearLevel: cfg.wearLevel === 'municipal_worn' ? 'slightly_used' : 'clean',
      seed: cfg.seed + 41
    }),
    rim: getVehicleMaterial(cfg.wheelRimMaterial, cfg.wheelRimColor, {
      role: 'rim',
      colorVariation: 0.05,
      wearLevel: 'clean',
      seed: cfg.seed + 53
    }),
    tire: getVehicleMaterial(cfg.tireMaterial, cfg.tireColor, {
      role: 'tire',
      colorVariation: 0.06,
      wearLevel: cfg.wearLevel,
      seed: cfg.seed + 61
    }),
    glass: getVehicleMaterial(cfg.glassMaterial, cfg.glassColor, {
      role: 'glass',
      windowTint: cfg.windowTint,
      seed: cfg.seed + 79
    }),
    utility: getVehicleMaterial(cfg.utilityMaterial, cfg.utilityColor, {
      role: 'utility',
      colorVariation: cfg.colorVariation * 0.5,
      wearLevel: cfg.wearLevel,
      seed: cfg.seed + 97
    }),
    livery: getSolidVehicleMaterial(cfg.liveryStripeColor, 40),
    checker: getCheckerMaterial(cfg.bodyPrimaryColor, cfg.liveryStripeColor),
    chassisDark: getSolidVehicleMaterial('#1c2026', 14),
    interiorDark: getSolidVehicleMaterial('#171a20', 10),
    headlight: getSolidVehicleMaterial('#fff6d6', 90, '#ffe89e', headGlow),
    taillight: getSolidVehicleMaterial('#d93028', 60, '#ff2c24', tailGlow),
    amberLight: getSolidVehicleMaterial('#f5a623', 65, '#ff9d1a', beaconGlow),
    blueLight: getSolidVehicleMaterial('#3a88ff', 80, '#2b7cff', beaconGlow),
    redLight: getSolidVehicleMaterial('#f03232', 80, '#ff2626', beaconGlow),
    plate: getSolidVehicleMaterial('#eef1f4', 20),
    chrome: getSolidVehicleMaterial('#d2dae2', 115)
  };
}

export function reapplyVehicleMaterials(root, cfg, view = {}) {
  if (!root) return;
  const silhouette = Boolean(view.silhouetteMode);
  const bundle = resolveVehicleMaterialBundle(cfg, { lightingTime: view.lightingTime || cfg.lightingTime });
  const clay = getSilhouetteClayMaterial();

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData?.layer === 'detail') {
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
