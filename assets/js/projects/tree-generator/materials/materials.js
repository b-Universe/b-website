import { treeDarkenHex, treeLightenHex, treeRng32 } from '../utils.js';

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

export function createTreeMaterialBundle(cfg, options = {}) {
  const wireframe = Boolean(options.wireframe);
  const silhouette = Boolean(options.silhouetteMode);
  const barkStyle = cfg.barkTextureStyle || 'flat_vertex';
  const emissiveStrength = cfg.emissiveIntensity || 0;

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
      ownedTextures: []
    };
  }

  const ownedTextures = [];
  let barkMap = null;
  if (barkStyle !== 'flat_vertex') {
    barkMap = buildBarkGrainTexture(barkStyle, cfg.seed);
    if (barkMap) ownedTextures.push(barkMap);
  }

  const trunkMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: barkMap || null,
    wireframe
  });

  const foliageMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    wireframe
  });

  const emissiveColor = cfg.species === 'fantasy'
    ? new THREE.Color(cfg.colorAccent || '#00d4ff')
    : new THREE.Color('#ffbe55');

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
    ownedTextures
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
