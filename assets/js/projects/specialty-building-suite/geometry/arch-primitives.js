import { clamp, roundNum } from '../utils.js';
import {
  solidMaterial,
  surfaceMaterial,
  glassMaterial,
  signboardMaterial,
  windowAdPosterMaterial,
  emissiveMaterial
} from '../materials/materials.js';
import { registerAnchor, registerEntranceClearance } from '../core/placement-anchors.js';

export function addBox(parent, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotX) mesh.rotation.x = options.rotX;
  if (options.rotY) mesh.rotation.y = options.rotY;
  if (options.rotZ) mesh.rotation.z = options.rotZ;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

export function addCylinder(parent, x, y, z, rTop, rBottom, h, material, sides = 10, options = {}) {
  if (h <= 0.001) return null;
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotX) mesh.rotation.x = options.rotX;
  if (options.rotZ) mesh.rotation.z = options.rotZ;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function addRoofStructure(parent, x, baseY, z, w, d, cfg) {
  const roofMat = solidMaterial(cfg.trimColor || '#38414a');
  const deckMat = surfaceMaterial('concrete', '#5d6368', cfg.condition, cfg.seed + 13, 2, 2);
  const trimMat = solidMaterial(cfg.secondaryColor || '#4d5863');
  const style = cfg.roofStyle || 'flat';
  const pitchH = clamp(cfg.roofPitchHeight || 1.6, 0.4, 4.5);
  const paraH = clamp(cfg.parapetHeight || 0.42, 0.1, 1.5);

  if (style === 'pitched') {
    // Low-poly stepped gable wedge + fascia trim
    addBox(parent, x, baseY + 0.1, z, w + 0.3, 0.2, d + 0.3, trimMat);
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const stepD = (d + 0.2) * (1 - t * 0.9);
      const stepH = (pitchH / steps) + 0.04;
      addBox(parent, x, baseY + 0.2 + (i + 0.5) * (pitchH / steps), z, w + 0.2, stepH, stepD, roofMat);
    }
    return baseY + 0.2 + pitchH;
  }

  if (style === 'hip') {
    addBox(parent, x, baseY + 0.1, z, w + 0.35, 0.2, d + 0.35, trimMat);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const tw = (w + 0.2) * (1 - t * 0.82);
      const td = (d + 0.2) * (1 - t * 0.82);
      const th = (pitchH / tiers) + 0.04;
      addBox(parent, x, baseY + 0.2 + (i + 0.5) * (pitchH / tiers), z, tw, th, td, roofMat);
    }
    return baseY + 0.2 + pitchH;
  }

  if (style === 'mansard') {
    addBox(parent, x, baseY + 0.1, z, w + 0.25, 0.2, d + 0.25, trimMat);
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const tw = (w + 0.15) * (1 - t * 0.24);
      const td = (d + 0.15) * (1 - t * 0.24);
      const th = (pitchH * 0.8 / tiers) + 0.03;
      addBox(parent, x, baseY + 0.2 + (i + 0.5) * (pitchH * 0.8 / tiers), z, tw, th, td, roofMat);
    }
    addBox(parent, x, baseY + 0.2 + pitchH * 0.8, z, w * 0.76, 0.12, d * 0.76, deckMat);
    return baseY + 0.2 + pitchH * 0.8 + 0.06;
  }

  if (style === 'shed') {
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const sd = (d + 0.2) / steps;
      const sz = z - d * 0.5 + (i + 0.5) * sd;
      const sh = 0.22 + ((steps - 1 - i) / steps) * pitchH * 0.7;
      addBox(parent, x, baseY + sh * 0.5, sz, w + 0.2, sh, sd + 0.02, roofMat);
    }
    return baseY + 0.22 + pitchH * 0.7;
  }

  if (style === 'sawtooth') {
    const bays = Math.max(2, Math.round(d / 4.2));
    const bayD = d / bays;
    for (let b = 0; b < bays; b++) {
      const bz = z - d * 0.5 + (b + 0.5) * bayD;
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const sd = bayD / steps;
        const sz = bz - bayD * 0.5 + (s + 0.5) * sd;
        const sh = 0.2 + ((s + 1) / steps) * (pitchH * 0.75);
        addBox(parent, x, baseY + sh * 0.5, sz, w + 0.1, sh, sd + 0.02, roofMat);
      }
      // Northlight glazing strip
      addBox(parent, x, baseY + pitchH * 0.42, bz + bayD * 0.48, w - 0.3, pitchH * 0.5, 0.08, glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime }));
    }
    return baseY + pitchH * 0.75 + 0.2;
  }

  if (style === 'stepped') {
    addBox(parent, x, baseY + 0.12, z, w + 0.2, 0.24, d + 0.2, deckMat);
    addBox(parent, x, baseY + 0.24 + paraH * 0.5, z + d * 0.5 - 0.12, w * 0.96, paraH, 0.24, trimMat);
    addBox(parent, x, baseY + 0.24 + paraH + 0.35, z + d * 0.5 - 0.16, w * 0.58, 0.7, 0.28, solidMaterial(cfg.accentColor || '#d9a441'));
    return baseY + 0.24 + paraH + 0.7;
  }

  // Default flat parapet roof
  addBox(parent, x, baseY + 0.1, z, w + 0.16, 0.2, d + 0.16, deckMat);
  const pt = 0.2;
  addBox(parent, x, baseY + 0.2 + paraH * 0.5, z + d * 0.5 - pt * 0.5, w + 0.16, paraH, pt, trimMat);
  addBox(parent, x, baseY + 0.2 + paraH * 0.5, z - d * 0.5 + pt * 0.5, w + 0.16, paraH, pt, trimMat);
  addBox(parent, x - w * 0.5 + pt * 0.5, baseY + 0.2 + paraH * 0.5, z, pt, paraH, d - pt, trimMat);
  addBox(parent, x + w * 0.5 - pt * 0.5, baseY + 0.2 + paraH * 0.5, z, pt, paraH, d - pt, trimMat);
  return baseY + 0.2;
}

export function addSignboardUnit(parent, x, y, z, w, h, text, bgHex, fgHex, cfg, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (options.rotY) g.rotation.y = options.rotY;
  const frameMat = solidMaterial(cfg.trimColor || '#1d2228');
  addBox(g, 0, 0, 0, w + 0.14, h + 0.14, 0.12, frameMat);
  const lit = cfg.includeIlluminatedSigns !== false;
  const faceMat = signboardMaterial(text, bgHex, fgHex, lit, cfg.lightingTime);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = 0.068;
  g.add(face);
  if (options.doubleSided) {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
    back.position.z = -0.068;
    back.rotation.y = Math.PI;
    g.add(back);
  }
  if (cfg.signageStyle === 'neon_marquee' && lit) {
    const neon = emissiveMaterial(fgHex, 0.9, cfg.lightingTime);
    addBox(g, 0, h * 0.5 + 0.05, 0.06, w + 0.08, 0.04, 0.04, neon);
    addBox(g, 0, -h * 0.5 - 0.05, 0.06, w + 0.08, 0.04, 0.04, neon);
  }
  parent.add(g);
  return g;
}

export function addDoorUnit(parent, x, y, z, w, h, cfg, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (options.rotY) g.rotation.y = options.rotY;
  const frameMat = solidMaterial(cfg.trimColor || '#262d35');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', {
    lightingTime: cfg.lightingTime,
    transparent: Boolean(options.transparentGlass)
  });
  const handleMat = solidMaterial('#d8dfe6');

  addBox(g, -w * 0.5, h * 0.5, 0.04, 0.09, h, 0.12, frameMat);
  addBox(g, w * 0.5, h * 0.5, 0.04, 0.09, h, 0.12, frameMat);
  addBox(g, 0, h + 0.04, 0.04, w + 0.14, 0.09, 0.14, frameMat);

  if (options.solidDoor) {
    addBox(g, 0, h * 0.5, 0.02, w - 0.08, h - 0.05, 0.07, solidMaterial(options.doorColor || '#46505a'));
    addBox(g, w * 0.34, h * 0.45, 0.07, 0.04, 0.24, 0.04, handleMat);
  } else {
    // Double glass commercial storefront door
    addBox(g, -w * 0.24, h * 0.5, 0.02, w * 0.45, h - 0.08, 0.05, glassMat);
    addBox(g, w * 0.24, h * 0.5, 0.02, w * 0.45, h - 0.08, 0.05, glassMat);
    addBox(g, 0, h * 0.5, 0.03, 0.05, h - 0.06, 0.07, frameMat);
    addBox(g, -0.09, h * 0.45, 0.07, 0.03, 0.42, 0.04, handleMat);
    addBox(g, 0.09, h * 0.45, 0.07, 0.03, 0.42, 0.04, handleMat);
  }

  parent.add(g);
  return g;
}

export function addRollUpGarageDoor(parent, x, y, z, w, h, cfg, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (options.rotY) g.rotation.y = options.rotY;
  const frameMat = solidMaterial(cfg.trimColor || '#2b323a');
  const doorMat = solidMaterial(options.doorColor || '#98a3ad');
  const slatAccent = solidMaterial(darkenHex(options.doorColor || '#98a3ad', 0.22));
  const openRatio = clamp(options.openRatio ?? 0.0, 0, 0.85);

  addBox(g, -w * 0.5 - 0.07, h * 0.5, 0.06, 0.14, h, 0.18, frameMat);
  addBox(g, w * 0.5 + 0.07, h * 0.5, 0.06, 0.14, h, 0.18, frameMat);
  addBox(g, 0, h + 0.08, 0.06, w + 0.28, 0.16, 0.2, frameMat);

  // Dark bay interior backing for open doors
  addBox(g, 0, h * 0.5, -0.35, w - 0.06, h - 0.04, 0.06, solidMaterial('#181c22'));

  const visibleH = Math.max(0.28, h * (1 - openRatio));
  const doorY = h - visibleH * 0.5;
  addBox(g, 0, doorY, 0.02, w - 0.06, visibleH, 0.06, doorMat);

  const slats = Math.max(2, Math.floor(visibleH / 0.38));
  for (let i = 0; i < slats; i++) {
    const sy = (h - visibleH) + (i + 0.5) * (visibleH / slats);
    addBox(g, 0, sy, 0.055, w - 0.1, 0.03, 0.02, slatAccent);
  }

  // Optional small vision lites near eye level when closed
  if (openRatio < 0.2 && visibleH > 1.8) {
    const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night', { lightingTime: cfg.lightingTime });
    const panes = Math.max(2, Math.floor(w / 0.85));
    for (let p = 0; p < panes; p++) {
      const px = -w * 0.34 + (panes > 1 ? (p / (panes - 1)) * (w * 0.68) : 0);
      addBox(g, px, 1.55, 0.058, 0.42, 0.22, 0.02, glassMat);
    }
  }

  parent.add(g);
  return g;
}

export function addAwning(parent, x, y, z, w, d, h, colorHexStr, options = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (options.rotY) g.rotation.y = options.rotY;
  const mat = solidMaterial(colorHexStr);
  const stripeMat = solidMaterial(options.stripeColor || lightenHex(colorHexStr, 0.32));
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const sz = (i + 0.5) * (d / steps);
    const sy = (steps - 1 - i) * (h / steps);
    addBox(g, 0, sy, sz, w, h / steps + 0.02, d / steps + 0.02, mat);
  }
  // Valance flap
  addBox(g, 0, -0.08, d - 0.02, w, 0.18, 0.04, stripeMat);
  parent.add(g);
  return g;
}

export function addWindowAdDecals(parent, x, y, z, spanW, spanH, cfg, density = 0.65, seed = 404, options = {}) {
  if (!cfg.includeWindowAds || density <= 0.02) return;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (options.rotY) g.rotation.y = options.rotY;

  const count = clamp(Math.round(density * Math.max(2, spanW * 1.45)), 1, 12);
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const px = -spanW * 0.44 + u * (spanW * 0.88) + (((seed + i * 37) % 11) - 5) * 0.02;
    const py = (((seed + i * 53) % 7) - 3) * 0.04 * clamp(spanH, 0.4, 1.4);
    const pw = clamp(0.46 + ((i * 19) % 5) * 0.06, 0.4, 0.76);
    const ph = clamp(0.62 + ((i * 23) % 4) * 0.08, 0.52, 0.96);
    // Slight increasing Z offset prevents overlapping decals from z-fighting
    const pz = 0.025 + (i % 4) * 0.004;
    const mat = windowAdPosterMaterial(seed + i * 3, cfg.condition);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    mesh.position.set(px, py, pz);
    g.add(mesh);
  }
  parent.add(g);
}

export function addFacadeWindows(parent, side, wallCenterX, wallCenterZ, wallLen, cfg, r, options = {}) {
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  const rotY = rotMap[side] || 0;
  const fh = cfg.floorHeight;
  const frameMat = solidMaterial(cfg.trimColor || '#2b323a');
  const glassMat = glassMaterial(cfg.glassColor, cfg.lightingTime === 'night' || cfg.lightingTime === 'dusk', {
    lightingTime: cfg.lightingTime,
    transparent: Boolean(options.transparentGroundGlass),
    tinted: Boolean(options.tintedGlass)
  });

  const skipZones = options.skipIntervals || [];
  const isBlocked = (u, halfW) => skipZones.some(([a, b]) => u + halfW > a - 0.15 && u - halfW < b + 0.15);

  for (let f = 0; f < cfg.floors; f++) {
    const floorBaseY = f * fh;
    const isGround = f === 0;
    const useStorefront = isGround && (cfg.windowStyle === 'storefront' || options.forceStorefront);
    const density = isGround ? Math.max(0.25, cfg.windowDensity) : cfg.windowDensity;
    if (density <= 0.02) continue;

    const bays = Math.max(1, Math.floor((wallLen - 1.2) / (useStorefront ? 2.6 : 2.1)));
    const bayStep = (wallLen - 1.0) / bays;

    for (let i = 0; i < bays; i++) {
      if (r() > density + 0.18) continue;
      const localX = -(wallLen - 1.0) * 0.5 + (i + 0.5) * bayStep;
      const winW = useStorefront ? Math.min(2.15, bayStep * 0.82) : Math.min(1.28, bayStep * 0.64);
      const winH = useStorefront ? Math.min(fh * 0.68, 2.35) : Math.min(fh * 0.54, 1.58);
      if (isBlocked(localX, winW * 0.55)) continue;

      const winY = floorBaseY + (useStorefront ? 0.35 + winH * 0.5 : fh * 0.52);
      const wx = wallCenterX + Math.cos(rotY) * localX;
      const wz = wallCenterZ - Math.sin(rotY) * localX;
      const outX = Math.sin(rotY) * 0.04;
      const outZ = Math.cos(rotY) * 0.04;

      const g = new THREE.Group();
      g.position.set(wx + outX, winY, wz + outZ);
      g.rotation.y = rotY;

      // Frame + sill + glass
      addBox(g, 0, 0, 0.01, winW + 0.14, winH + 0.14, 0.08, frameMat);
      addBox(g, 0, -winH * 0.5 - 0.06, 0.05, winW + 0.22, 0.08, 0.12, frameMat);
      addBox(g, 0, 0, 0.04, winW, winH, 0.04, glassMat, { cast: false });

      if (cfg.windowStyle === 'barred') {
        for (let b = -2; b <= 2; b++) {
          addBox(g, (b / 2.5) * (winW * 0.45), 0, 0.08, 0.028, winH, 0.028, frameMat);
        }
      } else if (cfg.windowStyle === 'industrial') {
        addBox(g, 0, 0, 0.06, winW, 0.04, 0.03, frameMat);
        addBox(g, 0, 0, 0.06, 0.04, winH, 0.03, frameMat);
      } else if (cfg.windowStyle === 'arched') {
        addCylinder(g, 0, winH * 0.5, 0.03, winW * 0.45, winW * 0.45, 0.06, frameMat, 10, { rotX: Math.PI / 2 });
      }

      parent.add(g);
    }
  }
}

export function addStandardBuildingShell(parent, ctx, options = {}) {
  const { cfg, placementCtx, r } = ctx;
  const w = options.width || cfg.width;
  const d = options.depth || cfg.depth;
  const cx = options.x || 0;
  const cz = options.z || 0;
  const floors = options.floors || cfg.floors;
  const fh = options.floorHeight || cfg.floorHeight;
  const totalH = floors * fh;

  const wallMat = surfaceMaterial(cfg.exteriorMaterial, cfg.primaryColor, cfg.condition, cfg.seed, Math.max(1, Math.round(w / 4)), Math.max(1, floors));
  const plinthMat = solidMaterial(darkenHex(cfg.trimColor || '#38414a', 0.25));
  const trimMat = solidMaterial(cfg.trimColor || '#38414a');

  // Ground plinth + main wall volume + floor belt courses
  addBox(parent, cx, 0.15, cz, w + 0.12, 0.3, d + 0.12, plinthMat);
  addBox(parent, cx, totalH * 0.5, cz, w, totalH, d, wallMat);

  for (let f = 1; f < floors; f++) {
    addBox(parent, cx, f * fh, cz, w + 0.12, 0.14, d + 0.12, trimMat);
  }

  // Corner pilasters
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(parent, cx + sx * (w * 0.5), totalH * 0.5, cz + sz * (d * 0.5), 0.28, totalH, 0.28, trimMat);
    }
  }

  // Roof
  const roofTopY = addRoofStructure(parent, cx, totalH, cz, w, d, cfg);

  // Main entrance(s)
  const doorW = options.doorWidth || 1.9;
  const doorH = Math.min(fh * 0.72, 2.45);
  const entCount = options.entranceCount || cfg.entranceCount || 1;
  const doorPositions = [];

  if (entCount === 1) {
    let dx = cx;
    if (cfg.entranceLocation === 'front_left') dx = cx - w * 0.26;
    else if (cfg.entranceLocation === 'front_right') dx = cx + w * 0.26;
    doorPositions.push(dx);
  } else {
    for (let i = 0; i < entCount; i++) {
      const dx = cx - w * 0.28 + (entCount > 1 ? (i / (entCount - 1)) * (w * 0.56) : 0);
      doorPositions.push(dx);
    }
  }

  const frontSkips = [];
  const entrances = [];
  doorPositions.forEach((dx, idx) => {
    addDoorUnit(parent, dx, 0, cz + d * 0.5, doorW, doorH, cfg, {
      transparentGlass: Boolean(options.transparentGlass)
    });
    if (options.entranceAwning !== false) {
      addAwning(parent, dx, doorH + 0.35, cz + d * 0.5, doorW + 0.9, 1.15, 0.38, cfg.accentColor);
    }
    frontSkips.push([dx - cx - doorW * 0.65, dx - cx + doorW * 0.65]);
    const ent = {
      id: idx === 0 ? 'main_entrance' : `secondary_entrance_${idx}`,
      role: idx === 0 ? 'main' : 'secondary',
      label: idx === 0 ? 'Main Public Entrance' : `Secondary Entrance ${idx + 1}`,
      position: { x: roundNum(dx, 3), y: 0, z: roundNum(cz + d * 0.5, 3) },
      normal: { x: 0, y: 0, z: 1 },
      width: doorW,
      height: doorH
    };
    entrances.push(ent);
    if (placementCtx) {
      registerEntranceClearance(placementCtx, ent);
      registerAnchor(placementCtx, {
        id: idx === 0 ? 'entrance_main' : `entrance_sec_${idx}`,
        category: 'entrance',
        position: [dx, 0, cz + d * 0.5 + 0.5],
        surfaceY: 0,
        rotationY: 0
      });
    }
  });

  // Service rear door if enabled
  const backSkips = [];
  if (cfg.includeServiceEntrance && !options.skipRearService) {
    const rx = cx + w * 0.24;
    addDoorUnit(parent, rx, 0, cz - d * 0.5, 1.15, 2.15, cfg, { rotY: Math.PI, solidDoor: true });
    backSkips.push([rx - cx - 0.8, rx - cx + 0.8]);
    const servEnt = {
      id: 'service_entrance',
      role: 'service',
      label: 'Rear Service Entrance',
      position: { x: roundNum(rx, 3), y: 0, z: roundNum(cz - d * 0.5, 3) },
      normal: { x: 0, y: 0, z: -1 },
      width: 1.15,
      height: 2.15
    };
    entrances.push(servEnt);
    if (placementCtx) {
      registerEntranceClearance(placementCtx, servEnt);
    }
  }

  // Facade windows on front/back/left/right
  addFacadeWindows(parent, 'front', cx, cz + d * 0.5, w, { ...cfg, floors }, r, {
    skipIntervals: [...frontSkips, ...(options.extraFrontSkips || [])],
    transparentGroundGlass: options.transparentGlass,
    tintedGlass: options.tintedGlass,
    forceStorefront: options.forceStorefront
  });
  addFacadeWindows(parent, 'back', cx, cz - d * 0.5, w, { ...cfg, floors }, r, {
    skipIntervals: [...backSkips, ...(options.extraBackSkips || [])],
    tintedGlass: options.tintedGlass
  });
  if (!options.skipSideWindows) {
    addFacadeWindows(parent, 'left', cx - w * 0.5, cz, d, { ...cfg, floors }, r, {
      skipIntervals: options.extraLeftSkips || [],
      tintedGlass: options.tintedGlass
    });
    addFacadeWindows(parent, 'right', cx + w * 0.5, cz, d, { ...cfg, floors }, r, {
      skipIntervals: options.extraRightSkips || [],
      tintedGlass: options.tintedGlass
    });
  }

  // Fascia sign
  if (options.includeSign !== false && cfg.signageStyle !== 'minimal') {
    const signW = clamp(w * 0.62, 2.4, 9.5);
    const signH = clamp(fh * 0.24, 0.65, 1.15);
    const signY = Math.min(totalH - 0.3, fh + 0.25);
    addSignboardUnit(parent, cx, signY, cz + d * 0.5 + 0.08, signW, signH, cfg.signText, cfg.secondaryColor, '#ffffff', cfg);
  }

  // Register storefront, roof, and wall anchors
  if (placementCtx) {
    registerAnchor(placementCtx, {
      id: 'storefront_left',
      category: 'storefront',
      position: [cx - w * 0.34, 0, cz + d * 0.5 + 0.65],
      surfaceY: 0,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'storefront_right',
      category: 'storefront',
      position: [cx + w * 0.34, 0, cz + d * 0.5 + 0.65],
      surfaceY: 0,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'wall_rear_utility',
      category: 'wall',
      position: [cx - w * 0.25, 0, cz - d * 0.5 - 0.05],
      surfaceY: 0,
      rotationY: Math.PI
    });
    registerAnchor(placementCtx, {
      id: 'roof_main',
      category: 'roof',
      position: [cx, roofTopY, cz],
      surfaceY: roofTopY,
      rotationY: 0
    });
  }

  return {
    width: w,
    depth: d,
    totalH,
    roofTopY,
    entrances
  };
}
