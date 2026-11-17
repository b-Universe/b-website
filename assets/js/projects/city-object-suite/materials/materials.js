import { clamp, rng32, colorHex, mixHex, darkenHex, lightenHex } from '../utils.js';
import { CONDITION_LEVELS } from '../core/categories.js';
import { OBJECT_MATERIAL_FAMILIES } from './palettes.js';

let objMatCache = new Map();
let objTexCache = new Map();
let objMaxAnisotropy = 1;

// 32x32 arcade-carpet.png pixel data
const MAT_ARCADE_CARPET_COLORS = {
  '.': '#000000',
  g: '#cfcfcf',
  W: '#ffffff',
  P: '#9644e7',
  B: '#320bc7',
  M: '#e744dd',
  Y: '#e7d944',
  G: '#0be271'
};

const MAT_ARCADE_CARPET_ROWS = [
  '..........ggg....P....W.....W...',
  '.W..............................',
  '.....WW..ggggg...W...B..........',
  '.....WW.............B.B..M......',
  '........ggggggg....B...BMM.W....',
  '..MMM...............B.BMMM......',
  '..MMM....ggggg.......BMMMM....W.',
  '..MMM..............W............',
  '..........ggg..W................',
  '....YY.......P............W.....',
  '...Y..Y......PP.....G.G.G.......',
  '.GGGGG.Y..W...PP...G.G.G........',
  'B.GGGG.Y.......PP............BBB',
  'B..GGGY............W.....W...BBB',
  'B...GG.......WW..............BBB',
  'B....G.......WW..............BBB',
  '..W................g.g.g.g......',
  '.........P.Y.......g.g.g........',
  '........P.Y.Y.......g.g.gg.....W',
  '.......P.Y.P.Y....W..g.g........',
  '...Y....P.Y.Y.........g.gg...WW.',
  '....Y....P.Y...........g.....WW.',
  '...Y.........W.....W....gg.W....',
  '....Y............M..............',
  'W..Y....W........MM....GGGGG....',
  '....Y......B.....MMM...G...G....',
  '..........BB..W........G...Y..W.',
  '.........BB............G..YGY...',
  '..W.MMMMMB.......P...W.GGYGG.Y..',
  '.....M.MB.......PPP.....Y.....Y.',
  '......M...W....PPPPP...Y.......Y',
  'Y...............PPP...YYYYYYYYYY'
];

function matRenderArcadeCarpetCanvas(canvas, ctx, options = {}) {
  const seamless = Boolean(options.seamless);
  canvas.width = 32;
  canvas.height = 32;
  for (let y = 0; y < 32; y++) {
    const row = MAT_ARCADE_CARPET_ROWS[y];
    for (let x = 0; x < 32; x++) {
      let ch = row[x];
      if (seamless && y === 0 && x >= 24 && x <= 29 && (x % 2 === 0)) {
        ch = 'Y';
      }
      ctx.fillStyle = MAT_ARCADE_CARPET_COLORS[ch] || '#000000';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function setObjectMaxAnisotropy(aniso) {
  objMaxAnisotropy = Math.max(1, Number(aniso) || 1);
}

export function clearObjectMaterialCache() {
  for (const m of objMatCache.values()) m.dispose();
  for (const t of objTexCache.values()) t.dispose();
  objMatCache.clear();
  objTexCache.clear();
}

function matWearScore(conditionId) {
  const hit = CONDITION_LEVELS.find((c) => c.id === conditionId);
  return hit ? hit.wearScore : 0.12;
}

function createObjectSurfaceCanvas(familyId, baseHex, options = {}) {
  const fam = OBJECT_MATERIAL_FAMILIES[familyId] || OBJECT_MATERIAL_FAMILIES.painted_steel;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32((options.seed || 307) >>> 0);
  const cleanHex = colorHex(baseHex, fam.defaultColor);
  const condition = options.condition || 'clean';
  const wear = matWearScore(condition);
  const rustOverride = options.rustAmount !== undefined ? clamp(Number(options.rustAmount) || 0, 0, 1) : null;

  if (fam.pattern === 'arcade_carpet_original' || fam.pattern === 'arcade_carpet_seamless') {
    matRenderArcadeCarpetCanvas(canvas, ctx, { seamless: fam.pattern === 'arcade_carpet_seamless' });
    if (wear > 0.5) {
      ctx.fillStyle = 'rgba(20, 16, 12, 0.18)';
      ctx.fillRect(4, 18, 6, 4);
      ctx.fillRect(20, 6, 5, 5);
    }
    return canvas;
  }

  ctx.fillStyle = cleanHex;
  ctx.fillRect(0, 0, 256, 256);

  const darkTone = darkenHex(cleanHex, 0.16 + wear * 0.14);
  const lightTone = lightenHex(cleanHex, 0.14);

  if (fam.pattern === 'wood') {
    for (let y = 0; y < 256; y += 32) {
      const plankTone = r() > 0.5 ? lightenHex(cleanHex, 0.08 * r()) : darkenHex(cleanHex, 0.1 * r());
      ctx.fillStyle = plankTone;
      ctx.fillRect(0, y, 256, 30);
      ctx.fillStyle = darkenHex(cleanHex, 0.26);
      ctx.fillRect(0, y + 30, 256, 2);
      for (let g = 0; g < 6; g++) {
        ctx.fillStyle = darkenHex(plankTone, 0.1);
        ctx.fillRect(Math.floor(r() * 190), y + 4 + g * 4, 34 + Math.floor(r() * 44), 2);
      }
    }
  } else if (fam.pattern === 'concrete') {
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = row % 2 === 0 ? cleanHex : mixHex(cleanHex, darkTone, 0.25);
      ctx.fillRect(0, row * 32, 256, 32);
    }
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = r() > 0.5 ? darkenHex(cleanHex, 0.14) : lightenHex(cleanHex, 0.1);
      ctx.fillRect(Math.floor(r() * 250), Math.floor(r() * 250), 3 + Math.floor(r() * 6), 3 + Math.floor(r() * 5));
    }
  } else if (fam.pattern === 'brick') {
    const mortar = lightenHex(cleanHex, 0.28);
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * 32;
      for (let col = -1; col < 5; col++) {
        const tone = r() > 0.5 ? darkenHex(cleanHex, r() * 0.18) : lightenHex(cleanHex, r() * 0.12);
        ctx.fillStyle = tone;
        ctx.fillRect(col * 64 + offset + 2, row * 32 + 2, 60, 28);
      }
    }
  } else if (fam.pattern === 'galvanized' || fam.pattern === 'brushed') {
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? lightTone : cleanHex;
      ctx.fillRect(0, y, 256, 8);
    }
    if (fam.pattern === 'galvanized') {
      for (let i = 0; i < 36; i++) {
        ctx.fillStyle = r() > 0.5 ? lightenHex(cleanHex, 0.12) : darkenHex(cleanHex, 0.12);
        ctx.fillRect(Math.floor(r() * 236), Math.floor(r() * 236), 14 + Math.floor(r() * 18), 10 + Math.floor(r() * 14));
      }
    }
  } else if (fam.pattern === 'fabric') {
    const alt = lightenHex(cleanHex, 0.16);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? cleanHex : alt;
      ctx.fillRect(x, 0, 32, 256);
    }
  } else if (fam.pattern === 'glass') {
    const topG = lightenHex(cleanHex, 0.26);
    const botG = darkenHex(cleanHex, 0.22);
    for (let b = 0; b < 8; b++) {
      ctx.fillStyle = mixHex(topG, botG, b / 7);
      ctx.fillRect(0, b * 32, 256, 32);
    }
    ctx.fillStyle = lightenHex(cleanHex, 0.36);
    ctx.fillRect(28, 16, 22, 224);
    ctx.fillRect(148, 28, 14, 200);
    ctx.strokeStyle = darkenHex(cleanHex, 0.42);
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
  } else if (fam.pattern === 'rubber') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = darkenHex(cleanHex, 0.24);
    for (let y = 0; y < 256; y += 16) ctx.fillRect(0, y, 256, 6);
  } else if (fam.pattern === 'foliage') {
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = r() > 0.45 ? lightenHex(cleanHex, 0.16 * r()) : darkenHex(cleanHex, 0.18 * r());
      ctx.fillRect(Math.floor(r() * 232), Math.floor(r() * 232), 18 + Math.floor(r() * 22), 16 + Math.floor(r() * 20));
    }
  } else if (fam.pattern === 'laminate') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      ctx.fillStyle = y % 128 === 0 ? lightenHex(cleanHex, 0.05) : darkenHex(cleanHex, 0.04);
      ctx.fillRect(0, y, 256, 62);
      ctx.fillStyle = darkenHex(cleanHex, 0.12);
      ctx.fillRect(0, y + 62, 256, 2);
    }
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = lightenHex(cleanHex, 0.07);
      ctx.fillRect(Math.floor(r() * 230), Math.floor(r() * 250), 12 + Math.floor(r() * 24), 2);
    }
  } else if (fam.pattern === 'mesh_weave') {
    ctx.fillStyle = darkenHex(cleanHex, 0.25);
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 12) {
      for (let x = 0; x < 256; x += 12) {
        ctx.fillStyle = ((x + y) / 12) % 2 === 0 ? cleanHex : lightenHex(cleanHex, 0.14);
        ctx.fillRect(x + 1, y + 1, 9, 9);
      }
    }
  } else if (fam.pattern === 'leather') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = r() > 0.5 ? lightenHex(cleanHex, 0.09) : darkenHex(cleanHex, 0.12);
      ctx.fillRect(Math.floor(r() * 230), Math.floor(r() * 230), 14 + Math.floor(r() * 28), 10 + Math.floor(r() * 20));
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.28);
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 236);
  } else if (fam.pattern === 'carpet') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        ctx.fillStyle = ((x / 64 + y / 64) % 2 === 0) ? lightenHex(cleanHex, 0.06) : darkenHex(cleanHex, 0.08);
        ctx.fillRect(x, y, 63, 63);
      }
    }
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = r() > 0.5 ? lightenHex(cleanHex, 0.1) : darkenHex(cleanHex, 0.1);
      ctx.fillRect(Math.floor(r() * 252), Math.floor(r() * 252), 3, 3);
    }
  } else if (fam.pattern === 'arcade_purple_geo' || fam.pattern === 'arcade_blacklight' || fam.pattern === 'arcade_party') {
    const pal = fam.pattern === 'arcade_blacklight'
      ? ['#4de2ff', '#a855f7', '#0be271', '#f43f8e']
      : fam.pattern === 'arcade_party'
        ? ['#f5c542', '#e744dd', '#38d9ff', '#5ae07c', '#ff7043']
        : ['#9644e7', '#e744dd', '#4de2ff', '#ffe142', '#ffffff'];
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = pal[i % pal.length];
      const gx = Math.floor(r() * 30) * 8 + 4;
      const gy = Math.floor(r() * 30) * 8 + 4;
      if (i % 3 === 0) {
        ctx.fillRect(gx, gy, 18, 6);
        ctx.fillRect(gx + 6, gy - 6, 6, 18);
      } else if (i % 3 === 1) {
        ctx.strokeStyle = pal[i % pal.length];
        ctx.lineWidth = 4;
        ctx.strokeRect(gx, gy, 20, 20);
      } else {
        ctx.fillRect(gx, gy, 8, 8);
      }
    }
  } else if (fam.pattern === 'arcade_squiggle' || fam.pattern === 'arcade_bowling') {
    const pal = fam.pattern === 'arcade_bowling'
      ? ['#ff7043', '#38d9ff', '#ffe142', '#ffffff']
      : ['#38e8d6', '#e744dd', '#ffe142', '#9644e7'];
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = pal[i % pal.length];
      ctx.lineWidth = 4;
      const sx = Math.floor(r() * 200) + 16;
      const sy = Math.floor(r() * 200) + 16;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 14, sy - 10);
      ctx.lineTo(sx + 26, sy + 6);
      ctx.lineTo(sx + 38, sy - 6);
      ctx.stroke();
    }
    for (let s = 0; s < 32; s++) {
      ctx.fillStyle = pal[s % pal.length];
      ctx.fillRect(Math.floor(r() * 244), Math.floor(r() * 244), 5, 5);
    }
  } else if (fam.pattern === 'checker_tile') {
    const alt = darkenHex(cleanHex, 0.82);
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        ctx.fillStyle = ((x / 64 + y / 64) % 2 === 0) ? cleanHex : alt;
        ctx.fillRect(x, y, 64, 64);
      }
    }
  } else if (fam.pattern === 'led_floor_grid') {
    ctx.fillStyle = '#0d131f';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        ctx.fillStyle = '#19263d';
        ctx.fillRect(x + 4, y + 4, 56, 56);
        ctx.strokeStyle = ((x / 64 + y / 64) % 2 === 0) ? '#38d9ff' : '#a855f7';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 6, y + 6, 52, 52);
      }
    }
  } else if (fam.pattern === 'retro_stripe_wall') {
    const stripes = ['#e85d35', '#f5c542', '#32d9c8', '#e744dd'];
    for (let s = 0; s < stripes.length; s++) {
      ctx.fillStyle = stripes[s];
      ctx.fillRect(0, 92 + s * 16, 256, 12);
    }
  } else if (fam.pattern === 'pixel_mural_wall') {
    const accents = ['#4de2ff', '#e744dd', '#f5c542', '#0be271'];
    for (let x = 16; x < 240; x += 32) {
      ctx.fillStyle = accents[(x / 32) % accents.length];
      ctx.fillRect(x, 48 + ((x / 32) % 3) * 32, 16, 16);
      ctx.fillRect(x + 8, 64 + ((x / 32) % 2) * 40, 8, 8);
    }
  } else if (fam.pattern === 'acoustic_panel') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = darkenHex(cleanHex, 0.35);
    ctx.lineWidth = 4;
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        ctx.strokeRect(x + 2, y + 2, 60, 60);
      }
    }
  } else if (fam.pattern === 'stone') {
    ctx.fillStyle = cleanHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = i % 2 === 0 ? lightenHex(cleanHex, 0.18) : darkenHex(cleanHex, 0.16);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 24 + i * 28);
      ctx.lineTo(118, 18 + i * 30);
      ctx.lineTo(256, 36 + i * 26);
      ctx.stroke();
    }
  } else {
    for (let row = 0; row < 16; row++) {
      const t = row / 15;
      const band = t < 0.35 ? mixHex(lightTone, cleanHex, t / 0.35) : mixHex(cleanHex, darkTone, (t - 0.35) / 0.65);
      ctx.fillStyle = band;
      ctx.fillRect(0, row * 16, 256, 16);
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.18);
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 250, 250);
  }

  // Condition-aware surface wear (rust strictly restricted to ferrous metal families)
  const effectiveRust = fam.supportsRust ? (rustOverride !== null ? Math.max(wear * 0.85, rustOverride) : wear) : 0;
  if (effectiveRust > 0.22) {
    const rustSpots = Math.round(effectiveRust * 75);
    const rustHex = '#7c4524';
    const deepRust = '#59301a';
    ctx.fillStyle = mixHex(cleanHex, rustHex, 0.35 + effectiveRust * 0.3);
    ctx.fillRect(0, 224, 256, 32);
    for (let i = 0; i < rustSpots; i++) {
      ctx.fillStyle = r() > 0.4 ? rustHex : deepRust;
      ctx.fillRect(Math.floor(r() * 242), Math.floor(r() * 244), 5 + Math.floor(r() * 18), 3 + Math.floor(r() * 9));
    }
  } else if (fam.supportsMoss && wear > 0.28) {
    const mossSpots = Math.round(wear * 55);
    const mossHex = fam.pattern === 'wood' ? darkenHex(cleanHex, 0.32) : '#4c5f43';
    ctx.fillStyle = mixHex(cleanHex, mossHex, 0.35);
    ctx.fillRect(0, 222, 256, 34);
    for (let i = 0; i < mossSpots; i++) {
      ctx.fillStyle = r() > 0.45 ? mossHex : darkenHex(cleanHex, 0.26);
      ctx.fillRect(Math.floor(r() * 240), Math.floor(r() * 244), 6 + Math.floor(r() * 14), 4 + Math.floor(r() * 8));
    }
  } else if (wear > 0.25 && fam.pattern !== 'glass' && fam.pattern !== 'foliage') {
    const grimeCount = Math.round(wear * 50);
    const grimeHex = mixHex(cleanHex, '#4d463c', 0.38);
    ctx.fillStyle = grimeHex;
    ctx.fillRect(0, 226, 256, 30);
    for (let i = 0; i < grimeCount; i++) {
      ctx.fillStyle = r() > 0.5 ? grimeHex : darkenHex(cleanHex, 0.22);
      ctx.fillRect(Math.floor(r() * 242), Math.floor(r() * 244), 4 + Math.floor(r() * 12), 3 + Math.floor(r() * 7));
    }
  }

  return canvas;
}

export function getObjectMaterial(familyId, hexColor, options = {}) {
  const fam = OBJECT_MATERIAL_FAMILIES[familyId] || OBJECT_MATERIAL_FAMILIES.painted_steel;
  const cleanHex = colorHex(hexColor, fam.defaultColor);
  const condition = options.condition || 'clean';
  const rustKey = options.rustAmount !== undefined ? Math.round(clamp(Number(options.rustAmount) || 0, 0, 1) * 20) : 'auto';
  const role = options.role || 'primary';
  const emissiveHex = options.emissiveHex || '#000000';
  const emissiveIntensity = Number(options.emissiveIntensity) || 0;
  const seedKey = (Number(options.seed) || 307) >>> 0;
  const isGlass = fam.category === 'glass' || fam.pattern === 'glass';
  const glassOpacity = isGlass
    ? clamp(options.opacity !== undefined && Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 0.35, 0.05, 1.0)
    : 1.0;
  const key = [role, familyId, cleanHex, condition, rustKey, seedKey, emissiveHex, emissiveIntensity.toFixed(2), glassOpacity.toFixed(2)].join('|');

  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = createObjectSurfaceCanvas(familyId, cleanHex, {
    seed: seedKey,
    condition,
    rustAmount: options.rustAmount
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (fam.nearestFilter) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  } else {
    tex.anisotropy = Math.min(objMaxAnisotropy, 4);
  }
  if (options.repeatX || options.repeatY) {
    tex.repeat.set(options.repeatX || 1, options.repeatY || 1);
  }

  const isShiny = fam.category === 'metal' || fam.category === 'glass' || fam.shininess >= 30;
  const isTransparentGlass = isGlass && glassOpacity < 0.999;
  const mat = isShiny
    ? new THREE.MeshPhongMaterial({
        map: tex,
        color: '#ffffff',
        shininess: fam.shininess,
        specular: fam.category === 'glass' ? '#96c8e8' : '#7f8c99',
        emissive: emissiveHex,
        emissiveIntensity,
        transparent: isTransparentGlass,
        opacity: glassOpacity,
        depthWrite: !isTransparentGlass
      })
    : new THREE.MeshLambertMaterial({
        map: tex,
        color: '#ffffff',
        emissive: emissiveHex,
        emissiveIntensity
      });

  if (fam.bGameTileId || fam.apartmentBuildable) {
    mat.userData = {
      ...(mat.userData || {}),
      bGameMaterial: {
        id: fam.id,
        bGameTileId: fam.bGameTileId || null,
        textureAsset: fam.textureAsset || null,
        filter: fam.nearestFilter ? 'nearest' : 'linear',
        wrap: 'repeat',
        uvScaleMeters: options.uvScaleMeters || 1.0,
        apartmentBuildable: Boolean(fam.apartmentBuildable)
      }
    };
  }

  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectScreenMaterial(screenMode = 'desktop_ui', accentHex = '#4de2ff', condition = 'clean', seed = 101) {
  const mode = String(screenMode || 'desktop_ui');
  const accent = colorHex(accentHex, '#4de2ff');
  const cracked = condition === 'damaged';
  const key = `screen|${mode}|${accent}|${cracked ? 1 : 0}|${seed >>> 0}`;
  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const r = rng32((seed >>> 0) || 101);

  if (ctx) {
    if (mode === 'off') {
      ctx.fillStyle = '#11161c';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#1c2530';
      ctx.fillRect(14, 14, 228, 8);
    } else if (mode === 'terminal') {
      ctx.fillStyle = '#0a1410';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#33e685';
      for (let row = 0; row < 9; row++) {
        ctx.fillRect(12, 14 + row * 15, 65 + Math.floor(r() * 140), 7);
      }
    } else if (mode === 'spreadsheet') {
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#2d6ea8';
      ctx.fillRect(0, 0, 256, 20);
      ctx.fillStyle = '#b9c6d4';
      for (let y = 26; y < 152; y += 18) ctx.fillRect(8, y, 240, 2);
      for (let x = 16; x < 245; x += 48) ctx.fillRect(x, 22, 2, 130);
      ctx.fillStyle = '#3fa672';
      ctx.fillRect(18, 28, 44, 14);
    } else if (mode === 'document') {
      ctx.fillStyle = '#d4dde6';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#2a5780';
      ctx.fillRect(0, 0, 256, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(36, 24, 184, 128);
      ctx.fillStyle = '#4a5866';
      for (let row = 0; row < 8; row++) {
        ctx.fillRect(50, 36 + row * 13, 95 + Math.floor(r() * 58), 5);
      }
    } else if (mode === 'login') {
      ctx.fillStyle = '#18304a';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#26496e';
      ctx.fillRect(58, 32, 140, 96);
      ctx.fillStyle = accent;
      ctx.fillRect(114, 42, 28, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(76, 80, 104, 12);
      ctx.fillRect(76, 100, 104, 12);
    } else if (mode === 'security_cctv') {
      ctx.fillStyle = '#0d151d';
      ctx.fillRect(0, 0, 256, 160);
      const q = [
        [6, 6, 118, 70],
        [132, 6, 118, 70],
        [6, 84, 118, 70],
        [132, 84, 118, 70]
      ];
      q.forEach(([x, y, w, h], idx) => {
        ctx.fillStyle = idx === 2 ? '#1e3a32' : '#212f3d';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#3e5d78';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#53f29f';
        ctx.fillRect(x + 6, y + 6, 10, 6);
      });
    } else if (mode === 'info_display') {
      ctx.fillStyle = '#13263a';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 256, 26);
      ctx.fillStyle = '#e6f1fa';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(14, 38 + i * 28, 165, 16);
        ctx.fillStyle = '#43cc8c';
        ctx.fillRect(190, 38 + i * 28, 52, 16);
        ctx.fillStyle = '#e6f1fa';
      }
    } else if (mode === 'error_screen') {
      ctx.fillStyle = '#1246a8';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(24, 26, 48, 22);
      for (let rIdx = 0; rIdx < 5; rIdx++) {
        ctx.fillRect(24, 62 + rIdx * 16, 120 + (rIdx % 2) * 58, 7);
      }
    } else if (mode === 'futuristic_hud') {
      ctx.fillStyle = '#091624';
      ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 236, 140);
      ctx.strokeRect(24, 28, 88, 104);
      ctx.fillStyle = lightenHex(accent, 0.25);
      ctx.fillRect(128, 30, 104, 18);
      ctx.fillRect(128, 60, 82, 10);
      ctx.fillRect(128, 80, 96, 10);
      ctx.fillStyle = '#ff9f43';
      ctx.fillRect(128, 104, 72, 22);
    } else if (mode === 'crt_arcade_off') {
      ctx.fillStyle = '#0e1318';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#1b2630';
      ctx.fillRect(18, 18, 22, 124);
      ctx.fillStyle = '#161e26';
      ctx.fillRect(48, 22, 10, 116);
    } else if (mode === 'arcade_title' || mode === 'arcade_attract') {
      ctx.fillStyle = '#0b1024';
      ctx.fillRect(0, 0, 256, 160);
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : accent;
        ctx.fillRect(Math.floor(r() * 248), Math.floor(r() * 150), 3, 3);
      }
      ctx.fillStyle = accent;
      ctx.fillRect(28, 28, 200, 34);
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(52, 36, 152, 18);
      ctx.fillStyle = '#ff44aa';
      ctx.fillRect(72, 82, 112, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(88, 118, 80, 10);
    } else if (mode === 'arcade_insert_coin') {
      ctx.fillStyle = '#090d1a';
      ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 232, 136);
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(56, 48, 144, 24);
      ctx.fillStyle = '#3cf2e6';
      ctx.fillRect(76, 92, 104, 14);
    } else if (mode === 'arcade_highscore') {
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#ff4da6';
      ctx.fillRect(46, 14, 164, 16);
      const colors = ['#ffe142', '#3cf2e6', '#ffffff', '#0be271', '#cfcfcf'];
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = colors[row];
        ctx.fillRect(28, 42 + row * 22, 88, 9);
        ctx.fillRect(160, 42 + row * 22, 68, 9);
      }
    } else if (mode === 'arcade_gameover') {
      ctx.fillStyle = '#1a0910';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#ff384c';
      ctx.fillRect(36, 46, 184, 30);
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(68, 96, 120, 12);
    } else if (mode === 'arcade_platform') {
      ctx.fillStyle = '#0d1a38';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#c85a32';
      ctx.fillRect(10, 132, 236, 16);
      ctx.fillRect(28, 90, 96, 12);
      ctx.fillRect(142, 62, 88, 12);
      ctx.fillStyle = '#3cf2e6';
      ctx.fillRect(108, 62, 12, 70);
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(58, 72, 14, 18);
      ctx.fillStyle = '#ff4da6';
      ctx.fillRect(184, 42, 16, 18);
    } else if (mode === 'arcade_shooter') {
      ctx.fillStyle = '#060916';
      ctx.fillRect(0, 0, 256, 160);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(r() * 250), Math.floor(r() * 150), 2, 2);
      }
      ctx.fillStyle = '#e744dd';
      for (let col = 0; col < 5; col++) {
        ctx.fillRect(34 + col * 42, 22, 24, 14);
        ctx.fillRect(46 + col * 40, 46, 20, 12);
      }
      ctx.fillStyle = accent;
      ctx.fillRect(126, 72, 4, 24);
      ctx.fillStyle = '#3cf2e6';
      ctx.fillRect(114, 124, 28, 14);
      ctx.fillRect(122, 114, 12, 12);
    } else if (mode === 'arcade_racing') {
      ctx.fillStyle = '#1b1640';
      ctx.fillRect(0, 0, 256, 68);
      ctx.fillStyle = '#ff7b47';
      ctx.fillRect(98, 34, 60, 34);
      ctx.fillStyle = '#227a3e';
      ctx.fillRect(0, 68, 256, 92);
      ctx.fillStyle = '#2e3640';
      ctx.beginPath();
      ctx.moveTo(104, 68);
      ctx.lineTo(152, 68);
      ctx.lineTo(226, 160);
      ctx.lineTo(30, 160);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(125, 78, 6, 74);
      ctx.fillStyle = '#ff384c';
      ctx.fillRect(108, 118, 40, 22);
    } else if (mode === 'arcade_fighting') {
      ctx.fillStyle = '#1f1636';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#c83e32';
      ctx.fillRect(0, 128, 256, 32);
      ctx.fillStyle = '#ffe142';
      ctx.fillRect(16, 14, 92, 12);
      ctx.fillRect(148, 14, 92, 12);
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(118, 12, 20, 16);
      ctx.fillStyle = '#3cf2e6';
      ctx.fillRect(54, 72, 26, 54);
      ctx.fillStyle = '#ff7043';
      ctx.fillRect(174, 72, 26, 54);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(94, 88, 68, 8);
    } else if (mode === 'arcade_maze') {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = '#2c68ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(14, 14, 228, 132);
      ctx.strokeRect(42, 36, 72, 34);
      ctx.strokeRect(142, 36, 72, 34);
      ctx.strokeRect(42, 92, 172, 30);
      ctx.fillStyle = '#ffe142';
      for (let x = 26; x < 232; x += 22) {
        ctx.fillRect(x, 78, 5, 5);
      }
      ctx.fillRect(88, 70, 16, 16);
      ctx.fillStyle = '#ff4da6';
      ctx.fillRect(172, 70, 16, 16);
    } else if (mode === 'arcade_puzzle') {
      ctx.fillStyle = '#0b1021';
      ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = '#6078a8';
      ctx.lineWidth = 3;
      ctx.strokeRect(64, 10, 128, 140);
      const blocks = ['#3cf2e6', '#ffe142', '#e744dd', '#0be271', '#ff5747'];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 6; x++) {
          if ((x + y) % 3 !== 0 || y >= 2) {
            ctx.fillStyle = blocks[(x * 2 + y) % blocks.length];
            ctx.fillRect(72 + x * 19, 126 - y * 19, 16, 16);
          }
        }
      }
      ctx.fillStyle = '#3cf2e6';
      ctx.fillRect(110, 32, 16, 48);
    } else if (mode === 'arcade_rhythm') {
      ctx.fillStyle = '#0d091f';
      ctx.fillRect(0, 0, 256, 160);
      const cols = ['#ff4da6', '#3cf2e6', '#0be271', '#ffe142'];
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = '#1c153a';
        ctx.fillRect(36 + c * 48, 8, 38, 144);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(40 + c * 48, 16, 30, 16);
        ctx.fillStyle = cols[c];
        ctx.fillRect(42 + c * 48, 44 + ((c * 29) % 72), 26, 14);
        ctx.fillRect(42 + c * 48, 88 + ((c * 17) % 42), 26, 14);
      }
    } else {
      // desktop_ui
      ctx.fillStyle = '#204a6e';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#132436';
      ctx.fillRect(0, 140, 256, 20);
      ctx.fillStyle = '#f2f5f8';
      ctx.fillRect(36, 20, 186, 108);
      ctx.fillStyle = accent;
      ctx.fillRect(36, 20, 186, 18);
      ctx.fillStyle = '#8b9cad';
      ctx.fillRect(48, 48, 140, 10);
      ctx.fillRect(48, 68, 118, 10);
      ctx.fillRect(48, 88, 152, 10);
    }

    if (cracked) {
      ctx.fillStyle = '#0b0e12';
      ctx.fillRect(0, 0, 110, 160);
      ctx.strokeStyle = '#9db2c4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(28, 12);
      ctx.lineTo(132, 78);
      ctx.lineTo(222, 148);
      ctx.moveTo(132, 78);
      ctx.lineTo(188, 22);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  const lit = mode !== 'off' && mode !== 'crt_arcade_off';
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: '#ffffff',
    emissive: lit ? mixHex('#182430', accent, 0.45) : '#000000',
    emissiveIntensity: lit ? (cracked ? 0.16 : 0.42) : 0
  });
  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectArcadeMarqueeMaterial(titleText = 'Pixel Quest', primaryHex = '#281642', accentHex = '#4de2ff', options = {}) {
  let rawTitle = titleText;
  let bgHex = primaryHex;
  let accHex = accentHex;
  let opts = options;
  if (titleText && typeof titleText === 'object') {
    opts = titleText;
    rawTitle = opts.title || 'Pixel Quest';
    bgHex = opts.primaryHex || '#281642';
    accHex = opts.accentHex || '#4de2ff';
  }
  const cleanBg = colorHex(bgHex, '#281642');
  const cleanAcc = colorHex(accHex, '#4de2ff');
  const label = String(rawTitle || 'Pixel Quest').slice(0, 22);
  const lit = opts.lit !== false;
  const damaged = Boolean(opts.damaged);
  const seed = (Number(opts.seed) || 101) >>> 0;
  const key = `marquee|${label}|${cleanBg}|${cleanAcc}|${lit ? 1 : 0}|${damaged ? 1 : 0}|${seed % 5}`;
  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = damaged ? darkenHex(cleanBg, 0.55) : cleanBg;
    ctx.fillRect(0, 0, 512, 144);
    ctx.fillStyle = cleanAcc;
    ctx.fillRect(0, 12, 512, 12);
    ctx.fillRect(0, 120, 512, 12);
    ctx.fillStyle = '#ffe142';
    ctx.fillRect(20, 32, 32, 80);
    ctx.fillRect(460, 32, 32, 80);
    ctx.fillStyle = damaged ? '#9ea6b0' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fs = 54;
    ctx.font = `bold ${fs}px Arial`;
    while (fs > 22 && ctx.measureText(label).width > 390) {
      fs -= 2;
      ctx.font = `bold ${fs}px Arial`;
    }
    ctx.fillText(label, 256, 74);
    if (damaged) {
      ctx.fillStyle = '#111317';
      ctx.fillRect(310, 0, 96, 144);
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(295, 10);
      ctx.lineTo(340, 134);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: '#ffffff',
    emissive: lit && !damaged ? mixHex(cleanBg, cleanAcc, 0.55) : '#000000',
    emissiveIntensity: lit && !damaged ? 0.65 : 0
  });
  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectArcadeSideArtMaterial(primaryHex = '#26479c', accentHex = '#ff3ec8', seed = 101) {
  const bg = colorHex(primaryHex, '#26479c');
  const acc = colorHex(accentHex, '#ff3ec8');
  const key = `sideart|${bg}|${acc}|${(seed >>> 0) % 7}`;
  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#ffe142';
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.lineTo(236, 160);
    ctx.lineTo(60, 240);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.fillRect(18, 250, 220, 28);
    ctx.fillStyle = '#3cf2e6';
    ctx.fillRect(36, 290, 184, 18);
    ctx.fillStyle = lightenHex(bg, 0.25);
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(32 + i * 32, 340 + (i % 2) * 24, 20, 20);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectSolidMaterial(hexColor, shininess = 20, emissiveHex = '#000000', emissiveIntensity = 0) {
  const clean = colorHex(hexColor, '#777777');
  const key = `solid|${clean}|${shininess}|${emissiveHex}|${emissiveIntensity.toFixed(2)}`;
  if (objMatCache.has(key)) return objMatCache.get(key);
  const mat = shininess > 28
    ? new THREE.MeshPhongMaterial({
        color: clean,
        shininess,
        specular: '#8595a6',
        emissive: emissiveHex,
        emissiveIntensity
      })
    : new THREE.MeshLambertMaterial({
        color: clean,
        emissive: emissiveHex,
        emissiveIntensity
      });
  objMatCache.set(key, mat);
  return mat;
}

export function getObjectLabelMaterial(text, bgHex = '#f2f4f7', fgHex = '#192028', options = {}) {
  const cleanBg = colorHex(bgHex, '#f2f4f7');
  const cleanFg = colorHex(fgHex, '#192028');
  const label = String(text || 'City Service').slice(0, 26);
  const lit = Boolean(options.lit);
  const key = `label|${label}|${cleanBg}|${cleanFg}|${lit ? 1 : 0}`;
  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = cleanBg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = cleanFg;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = cleanFg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fontSize = 48;
    ctx.font = `bold ${fontSize}px Arial`;
    while (fontSize > 20 && ctx.measureText(label).width > 456) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    ctx.fillText(label, 256, 82);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: '#ffffff',
    emissive: lit ? cleanBg : '#000000',
    emissiveIntensity: lit ? 0.55 : 0
  });
  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectDecalMaterial(style, primaryHex = '#2a2e33', secondaryHex = '#d99a32', seed = 101, opacity = 0.85) {
  const p = colorHex(primaryHex, '#2a2e33');
  const s = colorHex(secondaryHex, '#d99a32');
  const op = clamp(Number(opacity) || 0.85, 0.1, 1);
  const key = `decal|${style}|${p}|${s}|${seed >>> 0}|${op.toFixed(2)}`;
  if (objMatCache.has(key)) return objMatCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32((seed >>> 0) || 101);

  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    if (style === 'oil_stain' || style === 'puddle_oil_decal') {
      ctx.fillStyle = darkenHex(p, 0.35);
      ctx.fillRect(36, 48, 178, 146);
      ctx.fillStyle = mixHex(p, '#3c4a58', 0.45);
      ctx.fillRect(62, 70, 128, 102);
      ctx.fillStyle = '#4e5d6b';
      ctx.fillRect(92, 96, 62, 48);
    } else if (style === 'pavement_crack_patch') {
      ctx.fillStyle = mixHex(p, '#23262b', 0.5);
      ctx.fillRect(18, 18, 220, 220);
      ctx.strokeStyle = '#121417';
      ctx.lineWidth = 6;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(28 + r() * 40, 24 + i * 36);
        ctx.lineTo(128 + (r() - 0.5) * 40, 32 + i * 34);
        ctx.lineTo(224 - r() * 35, 22 + i * 38);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = p;
      ctx.fillRect(12, 18, 232, 220);
      ctx.fillStyle = s;
      ctx.fillRect(26, 36, 130, 82);
      ctx.fillStyle = lightenHex(s, 0.25);
      ctx.fillRect(102, 122, 124, 86);
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(34, 152, 58, 66);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: '#ffffff',
    transparent: true,
    opacity: op
  });
  objMatCache.set(key, mat);
  objTexCache.set(key, tex);
  return mat;
}

export function getObjectClayMaterial() {
  const key = 'city_object_clay_silhouette';
  if (!objMatCache.has(key)) {
    objMatCache.set(key, new THREE.MeshLambertMaterial({ color: '#9eb2c4' }));
  }
  return objMatCache.get(key);
}

export function resolveObjectMaterialBundle(cfg, options = {}) {
  const seed = (Number(cfg.seed) || 1024) >>> 0;
  const condition = cfg.condition || 'clean';
  const rustAmount = cfg.rustAmount;
  const timeMode = options.lightingTime || cfg.lightingTime || 'day';
  const isNight = timeMode === 'night' || timeMode === 'dusk';
  const lampOn = cfg.lampLit !== undefined ? Boolean(cfg.lampLit) : isNight;
  const emissiveBoost = lampOn ? (isNight ? 1.15 : 0.65) : 0.12;
  const holoGlow = clamp(Number(cfg.energyCoreGlow) || 0.75, 0.1, 1.5);

  return {
    primary: getObjectMaterial(cfg.primaryMaterial || 'painted_steel', cfg.primaryColor || '#2d6847', {
      role: 'primary',
      condition,
      rustAmount,
      seed: seed + 11
    }),
    secondary: getObjectMaterial(cfg.secondaryMaterial || 'galvanized_metal', cfg.secondaryColor || '#98a3ad', {
      role: 'secondary',
      condition,
      rustAmount,
      seed: seed + 29
    }),
    accent: getObjectMaterial(cfg.accentMaterial || 'painted_steel', cfg.accentColor || '#e5a832', {
      role: 'accent',
      condition: condition === 'damaged' ? 'weathered' : condition,
      rustAmount: rustAmount !== undefined ? rustAmount * 0.45 : undefined,
      seed: seed + 47
    }),
    frame: getObjectMaterial(cfg.frameMaterial || 'cast_iron', cfg.frameColor || '#252b31', {
      role: 'frame',
      condition,
      rustAmount,
      seed: seed + 61
    }),
    wood: getObjectMaterial('wood', cfg.woodColor || '#8d5b34', {
      role: 'wood',
      condition,
      seed: seed + 73
    }),
    concrete: getObjectMaterial('concrete', cfg.concreteColor || '#8a8f94', {
      role: 'concrete',
      condition,
      seed: seed + 89
    }),
    brick: getObjectMaterial('brick', '#8d4c3b', {
      role: 'brick',
      condition,
      seed: seed + 97
    }),
    glass: getObjectMaterial('glass', cfg.glassColor || '#4c7996', {
      role: 'glass',
      condition: 'clean',
      opacity: cfg.glassOpacity !== undefined ? cfg.glassOpacity : 0.35,
      seed: seed + 109
    }),
    rubber: getObjectMaterial('rubber', '#1f2328', {
      role: 'rubber',
      condition,
      seed: seed + 127
    }),
    fabric: getObjectMaterial('fabric', cfg.accentColor || '#b83d35', {
      role: 'fabric',
      condition,
      seed: seed + 139
    }),
    foliage: getObjectMaterial('foliage_leaf', '#3f7c46', {
      role: 'foliage',
      condition: 'clean',
      seed: seed + 151
    }),
    upholstery: getObjectMaterial('upholstery_fabric', cfg.secondaryColor || '#35536e', {
      role: 'upholstery',
      condition,
      seed: seed + 163
    }),
    chrome: getObjectMaterial('chrome_metal', '#d0d7de', {
      role: 'chrome',
      condition: condition === 'damaged' ? 'lightly_worn' : 'clean',
      seed: seed + 173
    }),
    carpet: getObjectMaterial('office_carpet', cfg.secondaryColor || '#47525e', {
      role: 'carpet',
      condition,
      seed: seed + 181
    }),
    arcadeCarpet: getObjectMaterial('arcade_carpet_original', '#000000', {
      role: 'arcadeCarpet',
      condition,
      seed: seed + 185
    }),
    stone: getObjectMaterial('polished_stone', cfg.concreteColor || '#d6dadf', {
      role: 'stone',
      condition,
      seed: seed + 191
    }),
    screen: getObjectScreenMaterial(cfg.screenMode || 'desktop_ui', cfg.emissiveColor || '#4de2ff', condition, seed + 199),
    darkMetal: getObjectSolidMaterial('#21262c', 26),
    brass: getObjectSolidMaterial('#c99a3a', 82),
    copper: getObjectSolidMaterial('#b86a40', 68),
    warningYellow: getObjectSolidMaterial('#e8b228', 26),
    safetyRed: getObjectSolidMaterial('#cf342b', 34),
    lampGlow: getObjectSolidMaterial('#fff2c4', 90, '#ffe394', emissiveBoost),
    neonGlow: getObjectSolidMaterial(cfg.emissiveColor || '#4de2ff', 92, cfg.emissiveColor || '#4de2ff', lampOn ? (isNight ? 0.78 : 0.45) : 0.08),
    signalRed: getObjectSolidMaterial('#d92e28', 70, '#ff2c24', 0.85),
    signalAmber: getObjectSolidMaterial('#e69b24', 70, '#ff9d1a', 0.85),
    signalGreen: getObjectSolidMaterial('#2cb85d', 70, '#2ce66b', 0.85),
    holoEnergy: getObjectSolidMaterial(cfg.emissiveColor || '#4de2ff', 95, cfg.emissiveColor || '#4de2ff', holoGlow),
    whiteTrim: getObjectSolidMaterial('#eceff2', 24)
  };
}

export function reapplyObjectMaterials(root, cfg, view = {}) {
  if (!root) return;
  const silhouette = Boolean(view.silhouetteMode);
  const bundle = resolveObjectMaterialBundle(cfg, { lightingTime: view.lightingTime || cfg.lightingTime });
  const clay = getObjectClayMaterial();

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
      if (obj.material) {
        obj.material.wireframe = Boolean(view.wireframe);
      }
    }
  });
}
