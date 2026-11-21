import { treeClamp, treeDarkenHex, treeLightenHex, treeRng32 } from '../utils.js';

export const TREE_GRASS_TEXTURE_ASSET_PATH = '/assets/structural-materials/grass_block_top.png';

const GRASS_BLOCK_TOP_16X16 = [
  123, 133, 153, 133, 123, 153, 153, 123, 123, 133, 133, 147, 133, 133, 133, 133,
  123, 153, 153, 164, 123, 133, 147, 133, 153, 153, 133, 123, 123, 133, 153, 133,
  133, 153, 133, 164, 133, 133, 133, 153, 153, 133, 123, 123, 133, 164, 153, 153,
  133, 123, 123, 133, 147, 133, 153, 133, 164, 164, 133, 153, 133, 164, 133, 153,
  153, 153, 133, 133, 147, 147, 153, 123, 123, 133, 123, 153, 147, 133, 133, 133,
  133, 147, 147, 123, 133, 147, 133, 153, 133, 133, 123, 133, 147, 133, 147, 147,
  153, 133, 133, 123, 123, 123, 133, 147, 147, 133, 147, 133, 133, 123, 133, 153,
  123, 123, 153, 153, 123, 133, 133, 123, 123, 147, 147, 153, 123, 123, 147, 147,
  133, 147, 147, 133, 133, 153, 133, 153, 123, 147, 133, 153, 123, 133, 133, 133,
  133, 133, 147, 147, 133, 153, 147, 153, 133, 133, 123, 123, 133, 164, 164, 133,
  123, 133, 133, 123, 133, 133, 147, 133, 147, 147, 133, 123, 123, 133, 153, 153,
  123, 123, 133, 164, 133, 123, 133, 133, 133, 147, 147, 133, 153, 153, 133, 123,
  123, 133, 133, 164, 153, 123, 147, 133, 153, 133, 133, 153, 153, 133, 133, 133,
  133, 153, 133, 133, 153, 133, 147, 147, 153, 123, 133, 133, 164, 164, 133, 123,
  164, 153, 164, 133, 133, 133, 133, 147, 123, 123, 147, 133, 133, 123, 123, 133,
  164, 133, 164, 133, 133, 147, 133, 133, 123, 133, 147, 147, 123, 123, 147, 147
];

let loadedGrassPixels16x16 = null;
let grassPreloadAttempted = false;

function ensureGrassTexturePreloaded() {
  if (grassPreloadAttempted || typeof window === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') {
    return;
  }
  grassPreloadAttempted = true;
  const candidates = [
    TREE_GRASS_TEXTURE_ASSET_PATH,
    '/the-game-remastered/game-client/assets/structural-materials/grass_block_top.png'
  ];

  const tryCandidate = (idx) => {
    if (idx >= candidates.length) return;
    try {
      const img = new Image();
      img.onload = () => {
        if (img.width === 16 && img.height === 16) {
          const c = document.createElement('canvas');
          c.width = 16;
          c.height = 16;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 16, 16);
            const imgData = ctx.getImageData(0, 0, 16, 16);
            if (imgData && imgData.data && imgData.data.length === 16 * 16 * 4) {
              const out = new Array(256);
              for (let i = 0; i < 256; i++) {
                const o = i * 4;
                out[i] = Math.round((imgData.data[o] + imgData.data[o + 1] + imgData.data[o + 2]) / 3);
              }
              loadedGrassPixels16x16 = out;
            }
          }
        }
      };
      img.onerror = () => tryCandidate(idx + 1);
      img.src = candidates[idx];
    } catch (_) {
      tryCandidate(idx + 1);
    }
  };

  tryCandidate(0);
}

const treeMaterialCache = new Map();

export function clearTreeMaterialCache() {
  treeMaterialCache.forEach((entry) => {
    if (entry.texture) entry.texture.dispose();
    if (entry.material) entry.material.dispose();
  });
  treeMaterialCache.clear();
}

export function buildBarkGrainTexture(style, seed = 1337) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const r = treeRng32(seed + 501);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);

  if (style === 'birch_lenticel') {
    for (let i = 0; i < 36; i++) {
      const y = Math.floor(r() * 128);
      const x = Math.floor(r() * 128);
      const w = 10 + Math.floor(r() * 28);
      const h = 2 + Math.floor(r() * 3);
      ctx.fillStyle = `rgba(38, 34, 31, ${0.45 + r() * 0.45})`;
      ctx.fillRect(x, y, w, h);
    }
  } else if (style === 'grained_bark' || style === 'cracked_dry') {
    const strips = style === 'cracked_dry' ? 42 : 30;
    for (let i = 0; i < strips; i++) {
      const x = Math.floor(r() * 128);
      const y = Math.floor(r() * 128);
      const h = 18 + Math.floor(r() * 54);
      const w = 2 + Math.floor(r() * 4);
      ctx.fillStyle = r() > 0.4 ? `rgba(0, 0, 0, ${0.12 + r() * 0.16})` : `rgba(255, 255, 255, ${0.08 + r() * 0.1})`;
      ctx.fillRect(x, y, w, h);
    }
  } else if (style === 'mossy_bark') {
    for (let i = 0; i < 28; i++) {
      const x = Math.floor(r() * 128);
      const y = Math.floor(r() * 128);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.12 + r() * 0.12})`;
      ctx.fillRect(x, y, 3, 24 + Math.floor(r() * 32));
    }
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(r() * 128);
      const y = 64 + Math.floor(r() * 64);
      ctx.fillStyle = `rgba(74, 138, 62, ${0.22 + r() * 0.3})`;
      ctx.fillRect(x, y, 6 + Math.floor(r() * 12), 5 + Math.floor(r() * 10));
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function getFoliageTextureCompensation(cfg = {}) {
  const variation = treeClamp(Number(cfg && cfg.foliageTextureVariation !== undefined ? cfg.foliageTextureVariation : 0.55), 0, 1);
  const depth = 0.06 + variation * 0.44;
  // Normalize against the mean luminance drop of grass_block_top.png so textured foliage matches solid brightness.
  const meanLum = 1.0 - 0.6355 * depth;
  return {
    depth,
    meanLum,
    boost: 1.0 / Math.max(0.4, meanLum)
  };
}

export function buildFoliageGrassTexture(cfg = {}, options = {}) {
  if (options.simulateTextureError || (cfg && cfg.simulateTextureError) || typeof document === 'undefined') {
    return null;
  }

  ensureGrassTexturePreloaded();

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { depth } = getFoliageTextureCompensation(cfg);
  const tintStrength = treeClamp(Number(cfg && cfg.foliageTintStrength !== undefined ? cfg.foliageTintStrength : 0.90), 0, 1);
  const isNaturalGreen = !['autumn', 'blossom', 'arcane', 'corrupted', 'winter'].includes(cfg.season) &&
    !['sakura', 'fantasy', 'dead'].includes(cfg.species);
  const pixels = loadedGrassPixels16x16 || GRASS_BLOCK_TOP_16X16;

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const raw = pixels[y * 16 + x];
      const drop = treeClamp((164 - raw) / 40, 0, 1);
      const lum = treeClamp(1.0 - drop * depth, 0.25, 1.0);
      if (isNaturalGreen && tintStrength < 1.0) {
        const warmMix = (1.0 - tintStrength) * 0.35;
        const r = Math.round(treeClamp(lum * (1.0 - warmMix * 0.12) * 255, 0, 255));
        const g = Math.round(treeClamp(lum * (1.0 + warmMix * 0.04) * 255, 0, 255));
        const b = Math.round(treeClamp(lum * (1.0 - warmMix * 0.28) * 255, 0, 255));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      } else {
        const v = Math.round(treeClamp(lum * 255, 0, 255));
        ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.name = 'BRemastered_GrassBlockTop_16x16';
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  if ('SRGBColorSpace' in THREE && THREE.SRGBColorSpace && 'colorSpace' in tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.userData = {
    assetPath: TREE_GRASS_TEXTURE_ASSET_PATH,
    resolution: 16,
    filtering: 'nearest',
    textureScale: Number(cfg.foliageTextureScale || 1.0),
    tintStrength,
    colorVariation: Number(cfg.foliageTextureVariation ?? 0.55)
  };
  tex.needsUpdate = true;
  return tex;
}

export function createTreeMaterialBundle(cfg, options = {}) {
  const wireframe = Boolean(options.wireframe);
  const silhouette = Boolean(options.silhouetteMode);
  const barkStyle = cfg.barkTextureStyle || 'flat_vertex';
  const emissiveStrength = cfg.emissiveIntensity || 0;
  const useGrassFoliage = (cfg.foliageTextureMode === 'grass' || cfg.foliageGrassTexture === true) && !silhouette;

  if (silhouette) {
    const clayTrunk = new THREE.MeshLambertMaterial({ color: 0xbec7d1, wireframe });
    const clayFoliage = new THREE.MeshLambertMaterial({ color: 0xdce4ec, wireframe });
    const clayEmissive = new THREE.MeshLambertMaterial({ color: 0xeaf0f5, wireframe });
    const clayPlanter = new THREE.MeshLambertMaterial({ color: 0x9aa5b1, wireframe });
    return {
      trunkMat: clayTrunk,
      foliageMat: clayFoliage,
      emissiveMat: clayEmissive,
      planterMat: clayPlanter,
      ownedMaterials: [clayTrunk, clayFoliage, clayEmissive, clayPlanter],
      ownedTextures: [],
      foliageTextureFallback: false
    };
  }

  const ownedTextures = [];
  let barkMap = null;
  if (barkStyle !== 'flat_vertex') {
    barkMap = buildBarkGrainTexture(barkStyle, cfg.seed);
    if (barkMap) ownedTextures.push(barkMap);
  }

  let foliageMap = null;
  let foliageTextureFallback = false;
  if (useGrassFoliage) {
    foliageMap = buildFoliageGrassTexture(cfg, options);
    if (foliageMap) {
      ownedTextures.push(foliageMap);
    } else {
      foliageTextureFallback = true;
    }
  }

  const trunkMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: barkMap || null,
    wireframe
  });

  const foliageMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: foliageMap || null,
    wireframe
  });

  const emissiveColor = cfg.species === 'fantasy' ?
    new THREE.Color(cfg.colorAccent || '#00d4ff') :
    new THREE.Color('#ffbe55');

  const emissiveMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    emissive: emissiveColor,
    emissiveIntensity: emissiveStrength > 0.01 ? emissiveStrength * 0.75 : 0.15,
    wireframe
  });

  const planterMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    wireframe
  });

  return {
    trunkMat,
    foliageMat,
    emissiveMat,
    planterMat,
    ownedMaterials: [trunkMat, foliageMat, emissiveMat, planterMat],
    ownedTextures,
    foliageTextureFallback
  };
}

export function setTreeSilhouetteAndWireframe(treeGroup, cfg, options = {}) {
  if (!treeGroup) return;
  const bundle = createTreeMaterialBundle(cfg, options);
  treeGroup.traverse((child) => {
    if (!child.isMesh) return;
    if (child.userData.isBillboardImpostor) {
      if (child.material) {
        child.material.wireframe = Boolean(options.wireframe);
        if (options.silhouetteMode) {
          child.userData._savedColor = child.userData._savedColor || child.material.color.getHex();
          child.material.color.setHex(0xd0d8e0);
        } else if (child.userData._savedColor !== undefined) {
          child.material.color.setHex(child.userData._savedColor);
        }
      }
      return;
    }
    const role = child.userData.materialRole || 'foliage';
    if (role === 'trunk') child.material = bundle.trunkMat;
    else if (role === 'emissive') child.material = bundle.emissiveMat;
    else if (role === 'planter') child.material = bundle.planterMat;
    else child.material = bundle.foliageMat;
  });

  if (treeGroup.userData._materialBundle) {
    const prev = treeGroup.userData._materialBundle;
    prev.ownedMaterials.forEach((m) => m.dispose());
    prev.ownedTextures.forEach((t) => t.dispose());
  }
  treeGroup.userData._materialBundle = bundle;
}

export function getTreeSeasonAccentTints(cfg) {
  return {
    barkDark: treeDarkenHex(cfg.colorBark, 0.18),
    leafHighlight: treeLightenHex(cfg.colorLeaf2, 0.14)
  };
}