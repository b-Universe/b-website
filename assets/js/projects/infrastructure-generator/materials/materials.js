import { infraClamp, infraDarkenHex, infraLightenHex, infraRng32 } from '../utils.js';
import { matGetEraPalette } from './palettes.js';

const MAT_CACHE = new Map();
const TEX_CACHE = new Map();
let matMaxAnisotropy = 1;

export function matSetMaxAnisotropy(aniso) {
  matMaxAnisotropy = Math.max(1, Math.min(4, Number(aniso) || 1));
}

export function matClearCache() {
  for (const m of MAT_CACHE.values()) {
    if (m && typeof m.dispose === 'function') m.dispose();
  }
  for (const t of TEX_CACHE.values()) {
    if (t && typeof t.dispose === 'function') t.dispose();
  }
  MAT_CACHE.clear();
  TEX_CACHE.clear();
}

function matCreateCanvas(size = 256) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }
  if (typeof HTMLCanvasElement !== 'undefined') {
    const c = new HTMLCanvasElement(size, size);
    c.width = size;
    c.height = size;
    return c;
  }
  return null;
}

function matDrawGrain(ctx, size, baseHex, r, speckCount, contrast = 0.09) {
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const dark = infraDarkenHex(baseHex, contrast);
  const light = infraLightenHex(baseHex, contrast * 0.85);
  for (let i = 0; i < speckCount; i++) {
    const x = Math.floor(r() * size);
    const y = Math.floor(r() * size);
    const w = 2 + Math.floor(r() * 5);
    const h = 2 + Math.floor(r() * 5);
    ctx.fillStyle = r() > 0.5 ? dark : light;
    ctx.fillRect(x, y, w, h);
  }
}

function matDrawWearPatches(ctx, size, baseHex, wear, r) {
  if (wear <= 0.18) return;
  const count = Math.round(wear * 12);
  const dark = infraDarkenHex(baseHex, 0.2);
  const crack = infraDarkenHex(baseHex, 0.34);
  for (let i = 0; i < count; i++) {
    const px = Math.floor(r() * (size - 24));
    const py = Math.floor(r() * (size - 24));
    const pw = 10 + Math.floor(r() * 24);
    const ph = 8 + Math.floor(r() * 20);
    ctx.fillStyle = dark;
    ctx.fillRect(px, py, pw, ph);
    if (wear > 0.35 && r() > 0.45) {
      ctx.fillStyle = crack;
      ctx.fillRect(px + 2, py + Math.floor(ph * 0.5), pw + 8, 2);
    }
  }
}

function matDrawLaneMarkings(ctx, size, markingKey, palette, r, wear) {
  if (!markingKey || markingKey === 'plain') return;

  const drawSolid = (x, w, color) => {
    ctx.fillStyle = color;
    if (wear > 0.4) {
      for (let y = 0; y < size; y += 16) {
        if (r() > wear * 0.35) ctx.fillRect(x, y, w, 15);
      }
    } else {
      ctx.fillRect(x, 0, w, size);
    }
  };

  const drawDashed = (x, w, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, 12, w, 72);
    ctx.fillRect(x, 140, w, 72);
  };

  switch (markingKey) {
    case 'double_yellow_right':
      drawSolid(size - 19, 6, palette.stripe_yellow);
      drawSolid(size - 9, 6, palette.stripe_yellow);
      break;
    case 'solid_left_double_yellow_right':
      drawSolid(5, 7, palette.stripe_white);
      drawSolid(size - 19, 6, palette.stripe_yellow);
      drawSolid(size - 9, 6, palette.stripe_yellow);
      break;
    case 'solid_left_yellow_right':
      drawSolid(5, 7, palette.stripe_white);
      drawSolid(size - 11, 7, palette.stripe_yellow);
      break;
    case 'solid_left_dashed_right':
      drawSolid(5, 7, palette.stripe_white);
      drawDashed(size - 11, 8, palette.stripe_white);
      break;
    case 'yellow_edge_left':
      drawSolid(4, 7, palette.stripe_yellow);
      break;
    case 'yellow_edge_right':
      drawSolid(size - 11, 7, palette.stripe_yellow);
      break;
    case 'yellow_left_white_right':
      drawSolid(4, 7, palette.stripe_yellow);
      drawSolid(size - 12, 7, palette.stripe_white);
      break;
    case 'yellow_left_dashed_right':
      drawSolid(4, 7, palette.stripe_yellow);
      drawDashed(size - 11, 8, palette.stripe_white);
      break;
    case 'solid_white_left':
    case 'solid_edge_left':
      drawSolid(5, 7, palette.stripe_white);
      break;
    case 'solid_white_right':
    case 'solid_edge_right':
      drawSolid(size - 12, 7, palette.stripe_white);
      break;
    case 'dashed_white_left':
      drawDashed(3, 8, palette.stripe_white);
      break;
    case 'dashed_white_right':
      drawDashed(size - 11, 8, palette.stripe_white);
      break;
    case 'dashed_left_white_right':
      drawDashed(3, 8, palette.stripe_white);
      drawSolid(size - 12, 7, palette.stripe_white);
      break;
    default:
      break;
  }
}

function matMakeCanvasTexture(key, drawFn, options = {}) {
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const size = options.size || 256;
  const canvas = matCreateCanvas(size);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFn(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = options.clampS ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = options.clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = matMaxAnisotropy;
  tex.needsUpdate = true;
  TEX_CACHE.set(key, tex);
  return tex;
}

export function matGetSolid(hex, options = {}) {
  const clean = String(hex || '#889098').toLowerCase();
  const key = `solid:${clean}:${options.side || 'front'}`;
  if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
  const mat = new THREE.MeshLambertMaterial({
    color: clean,
    side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
  });
  MAT_CACHE.set(key, mat);
  return mat;
}

export function matGetEmissive(hex, intensity = 0.85, name = 'emissive') {
  const clean = String(hex || '#ff5555').toLowerCase();
  const key = `emissive:${name}:${clean}:${intensity.toFixed(2)}`;
  if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
  const mat = new THREE.MeshLambertMaterial({
    color: clean,
    emissive: clean,
    emissiveIntensity: intensity
  });
  MAT_CACHE.set(key, mat);
  return mat;
}

export function matGetGlass(hex = '#63a7d1', opacity = 0.42) {
  const clean = String(hex || '#63a7d1').toLowerCase();
  const op = infraClamp(opacity, 0.15, 0.95);
  const key = `glass:${clean}:${op.toFixed(2)}`;
  if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
  const mat = new THREE.MeshPhongMaterial({
    color: clean,
    emissive: '#0c2334',
    emissiveIntensity: 0.16,
    shininess: 90,
    specular: '#cce7ff',
    transparent: true,
    opacity: op,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  MAT_CACHE.set(key, mat);
  return mat;
}

export function matGetSurface(kind = 'asphalt', eraStyle = 'modern_municipal', wear = 0.15, seed = 101, markingKey = 'plain', extra = {}) {
  const palette = matGetEraPalette(eraStyle, wear);
  const wearBucket = Math.round(infraClamp(wear, 0, 1) * 5);
  const seedBucket = (Number(seed) || 101) % 7;

  if (kind === 'glass_station') {
    return matGetGlass(palette.glass_station || '#63a7d1', 0.42);
  }
  if (kind === 'water_canal') {
    const key = `water:${palette.water_canal}`;
    if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
    const m = new THREE.MeshPhongMaterial({
      color: palette.water_canal || '#1f6482',
      shininess: 85,
      specular: '#bfe9ff',
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });
    MAT_CACHE.set(key, m);
    return m;
  }
  if (kind === 'bridge_cable') {
    const key = `cable:${palette.bridge_cable}`;
    if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
    const m = new THREE.MeshPhongMaterial({ color: palette.bridge_cable || '#aeb7c0', shininess: 60, specular: '#eef6ff' });
    MAT_CACHE.set(key, m);
    return m;
  }
  if (kind === 'signal_red') return matGetEmissive('#ff4252', 0.9, 'sig_red');
  if (kind === 'signal_green') return matGetEmissive('#45f08a', 0.9, 'sig_green');
  if (kind === 'signal_amber') return matGetEmissive('#ffc43d', 0.85, 'sig_amber');
  if (kind === 'station_lamp') return matGetEmissive('#fff2cc', 0.85, 'stn_lamp');
  if (kind === 'rail_steel') {
    const key = `steel_rail:${palette.rail_steel}`;
    if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);
    const m = new THREE.MeshPhongMaterial({ color: palette.rail_steel, shininess: 68, specular: '#dbe6f0' });
    MAT_CACHE.set(key, m);
    return m;
  }

  if (kind === 'crosswalk_apron') {
    const laneMat = extra.roadSurface || 'asphalt';
    const laneCount = Math.max(1, Number(extra.laneCount) || 2);
    const key = `cw:${laneMat}:${eraStyle}:${wearBucket}:${laneCount}:${seedBucket}`;
    if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);

    const baseHex = palette[laneMat] || palette.asphalt;
    const tex = matMakeCanvasTexture(
      `tex:${key}`,
      (ctx, size) => {
        const r = infraRng32((seed || 101) + 77);
        matDrawGrain(ctx, size, baseHex, r, 140, 0.08);
        matDrawWearPatches(ctx, size, baseHex, wear, r);

        ctx.fillStyle = palette.stripe_white;
        ctx.fillRect(10, 12, size - 20, 18);

        const barCount = Math.max(5, Math.min(12, laneCount * 3));
        const pad = 12;
        const step = (size - pad * 2) / barCount;
        const barW = Math.max(8, Math.floor(step * 0.54));
        for (let b = 0; b < barCount; b++) {
          const bx = Math.round(pad + b * step + (step - barW) * 0.5);
          ctx.fillRect(bx, 54, barW, size - 82);
        }
      },
      { clampS: true, clampT: true }
    );

    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: tex });
    MAT_CACHE.set(key, mat);
    return mat;
  }

  const key = `surf:${kind}:${eraStyle}:${wearBucket}:${markingKey}:${seedBucket}`;
  if (MAT_CACHE.has(key)) return MAT_CACHE.get(key);

  const baseHex = palette[kind] || palette.asphalt;
  const tex = matMakeCanvasTexture(
    `tex:${key}`,
    (ctx, size) => {
      const r = infraRng32((seed || 101) + kind.length * 31);
      const speckCount = kind === 'gravel' || kind === 'ballast_granite' || kind === 'ballast_slag' ? 420 : 180;
      const contrast = kind === 'ballast_granite' || kind === 'ballast_slag' ? 0.22 : (kind === 'gravel' ? 0.16 : 0.09);
      matDrawGrain(ctx, size, baseHex, r, speckCount, contrast);

      if (kind === 'sidewalk') {
        const seam = infraDarkenHex(baseHex, 0.22);
        ctx.fillStyle = seam;
        ctx.fillRect(0, 0, size, 3);
        ctx.fillRect(0, 128, size, 3);
        ctx.fillRect(0, 0, 3, size);
      } else if (kind === 'cobblestone' || kind === 'brick') {
        const rows = kind === 'cobblestone' ? 8 : 10;
        const cols = kind === 'cobblestone' ? 6 : 5;
        const rh = size / rows;
        const cw = size / cols;
        const mortar = infraDarkenHex(baseHex, 0.28);
        for (let ry = 0; ry < rows; ry++) {
          const offset = (ry % 2) * (cw * 0.5);
          for (let cx = -1; cx <= cols; cx++) {
            const x = Math.round(cx * cw + offset);
            const y = Math.round(ry * rh);
            ctx.fillStyle = r() > 0.5 ? infraLightenHex(baseHex, 0.08) : infraDarkenHex(baseHex, 0.08);
            ctx.fillRect(x + 2, y + 2, Math.max(4, Math.round(cw) - 4), Math.max(4, Math.round(rh) - 4));
            ctx.fillStyle = mortar;
            ctx.fillRect(x, y, Math.round(cw), 2);
            ctx.fillRect(x, y, 2, Math.round(rh));
          }
        }
      } else if (kind === 'curb_stone') {
        ctx.fillStyle = infraDarkenHex(baseHex, 0.18);
        ctx.fillRect(0, 0, size, 4);
        ctx.fillRect(0, 128, size, 4);
      } else if (kind === 'verge_grass') {
        ctx.fillStyle = infraLightenHex(baseHex, 0.1);
        for (let i = 0; i < 120; i++) {
          ctx.fillRect(Math.floor(r() * size), Math.floor(r() * size), 3, 6);
        }
      } else if (kind === 'sleeper_wood' || kind === 'wood_warm') {
        const darkGrain = infraDarkenHex(baseHex, 0.22);
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = darkGrain;
          ctx.fillRect(0, Math.floor(r() * size), size, 2 + Math.floor(r() * 3));
        }
      } else if (kind === 'platform_tactile') {
        const bump = infraDarkenHex(baseHex, 0.24);
        ctx.fillStyle = bump;
        for (let y = 10; y < size; y += 24) {
          for (let x = 10; x < size; x += 24) {
            ctx.fillRect(x, y, 10, 10);
          }
        }
      } else if (kind === 'steel_grating') {
        const hole = infraDarkenHex(baseHex, 0.45);
        ctx.fillStyle = hole;
        for (let y = 4; y < size; y += 16) {
          for (let x = 4; x < size; x += 16) {
            ctx.fillRect(x, y, 9, 9);
          }
        }
      } else if (kind === 'gate_stripe') {
        ctx.fillStyle = '#ebeff2';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#cf343e';
        for (let y = 0; y < size; y += 48) {
          ctx.fillRect(0, y, size, 24);
        }
      } else if (kind === 'steel_structure') {
        const rivet = infraLightenHex(baseHex, 0.14);
        ctx.fillStyle = infraDarkenHex(baseHex, 0.2);
        ctx.fillRect(0, 0, size, 5);
        ctx.fillRect(0, 126, size, 5);
        ctx.fillStyle = rivet;
        for (let x = 12; x < size; x += 32) {
          ctx.fillRect(x, 12, 4, 4);
          ctx.fillRect(x, 138, 4, 4);
        }
      } else if (kind === 'stone_masonry') {
        const mortar = infraDarkenHex(baseHex, 0.26);
        const rows = 5;
        const rh = Math.floor(size / rows);
        const cw = 64;
        for (let rIdx = 0; rIdx < rows; rIdx++) {
          const off = (rIdx % 2) * (cw * 0.5);
          for (let x = -cw; x < size; x += cw) {
            ctx.fillStyle = r() > 0.5 ? infraLightenHex(baseHex, 0.08) : infraDarkenHex(baseHex, 0.08);
            ctx.fillRect(x + off + 2, rIdx * rh + 2, cw - 4, rh - 4);
          }
          ctx.fillStyle = mortar;
          ctx.fillRect(0, rIdx * rh, size, 3);
        }
      } else if (kind === 'tile_plaza' || kind === 'tunnel_concrete') {
        const seam = infraDarkenHex(baseHex, 0.2);
        ctx.fillStyle = seam;
        const step = kind === 'tile_plaza' ? 32 : 64;
        for (let p = 0; p < size; p += step) {
          ctx.fillRect(p, 0, 2, size);
          ctx.fillRect(0, p, size, 2);
        }
      } else if (kind === 'bike_green') {
        ctx.fillStyle = palette.stripe_white;
        ctx.fillRect(4, 0, 6, size);
        ctx.fillRect(size - 10, 0, 6, size);
        ctx.fillRect(size * 0.5 - 3, 18, 6, 76);
        ctx.fillRect(size * 0.5 - 3, 142, 6, 76);
      } else if (kind === 'parking_bay') {
        ctx.fillStyle = palette.stripe_white;
        for (let y = 8; y < size; y += 64) {
          ctx.fillRect(10, y, size - 20, 6);
        }
        ctx.fillRect(6, 0, 6, size);
      } else if (kind === 'pipe_yellow' || kind === 'pipe_blue' || kind === 'pipe_red') {
        ctx.fillStyle = infraLightenHex(baseHex, 0.16);
        ctx.fillRect(0, 18, size, 12);
        ctx.fillStyle = infraDarkenHex(baseHex, 0.22);
        ctx.fillRect(0, size - 28, size, 12);
      }

      matDrawWearPatches(ctx, size, baseHex, wear, r);

      if (markingKey && markingKey !== 'plain') {
        matDrawLaneMarkings(ctx, size, markingKey, palette, r, wear);
      }
    },
    { clampS: Boolean(markingKey && markingKey !== 'plain') }
  );

  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: tex });
  MAT_CACHE.set(key, mat);
  return mat;
}

export function matResolveDescriptor(materialKey, eraStyle = 'modern_municipal', wear = 0.15, seed = 101) {
  if (materialKey.startsWith('cw|')) {
    const parts = materialKey.split('|');
    return matGetSurface('crosswalk_apron', eraStyle, wear, seed, 'plain', {
      roadSurface: parts[1] || 'asphalt',
      laneCount: parseInt(parts[2], 10) || 2
    });
  }
  if (materialKey.startsWith('lane|')) {
    const parts = materialKey.split('|');
    return matGetSurface(parts[1] || 'asphalt', eraStyle, wear, seed, parts[2] || 'plain');
  }
  return matGetSurface(materialKey || 'asphalt', eraStyle, wear, seed, 'plain');
}

export function matApplyViewOverrides(root, view = {}) {
  if (!root) return;
  const silhouette = Boolean(view.silhouetteMode);
  const wire = Boolean(view.wireframe);
  const silMat = matGetSolid('#6f7e8c');

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData?.layer === 'LayerE_DebugAndContext') return;

    if (!obj.userData._origMaterial) {
      obj.userData._origMaterial = obj.material;
    }

    const activeMat = silhouette ? silMat : obj.userData._origMaterial;
    obj.material = activeMat;
    if (obj.material) {
      obj.material.wireframe = wire;
    }
  });
}
