import { clamp } from '../utils.js';
import { skyBox, skyCylinder, skySignboard, skyRoot } from './primitives.js';

function podiumBuildTreePlanter(parent, batcher, materials, x, y, z) {
  batcher.addBox(x, y + 0.35, z, 2.2, 0.7, 2.2, 0, 'podium', 'ground');
  batcher.addBox(x, y + 0.72, z, 1.9, 0.14, 1.9, 0, 'trim', 'ground');

  const greenMat = materials.crown;
  const trunkMat = materials.darkMetal;
  skyCylinder(parent, x, y + 1.35, z, 0.12, 0.16, 1.25, trunkMat, 6, {
    layer: 'ground',
    materialRole: 'darkMetal'
  });

  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), greenMat);
  foliage.position.set(x, y + 2.35, z);
  foliage.scale.set(1.05, 1.25, 1.05);
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  foliage.userData = { layer: 'ground', materialRole: 'secondary' };
  parent.add(foliage);
}

function podiumBuildMainDoorway(parent, batcher, materials, ent, cfg) {
  const { x, y, z } = ent.position;
  const dw = ent.doorSize.width;
  const dh = ent.doorSize.height;
  const style = ent.style || 'revolving_door';

  if (style === 'monumental_arch') {
    // Tall Art Deco stepped arch surround
    const archH = dh * 1.65;
    const archW = dw * 1.45;
    batcher.addBox(x, y + dh * 0.5, z + 0.25, dw, dh, 0.35, 0, 'glassWarm', 'ground');
    batcher.addBox(x, y + archH * 0.5, z + 0.12, archW + 1.2, archH, 0.45, 0, 'trim', 'ground');
    batcher.addBox(x, y + archH + 0.35, z + 0.4, archW * 0.72, 1.1, 0.65, 0, 'framing', 'ground');
    for (let j = -2; j <= 2; j++) {
      batcher.addBox(x + j * (dw * 0.24), y + dh * 0.55, z + 0.45, 0.16, dh, 0.24, 0, 'mullion', 'ground');
    }
    const ringArch = skyCylinder(parent, x, y + dh + 0.25, z + 0.35, archW * 0.42, archW * 0.42, 0.55, materials.trim, 12, {
      layer: 'ground',
      materialRole: 'trim'
    });
    if (ringArch) {
      ringArch.rotation.x = Math.PI * 0.5;
      ringArch.scale.set(1.0, 0.55, 1.0);
    }
  } else if (style === 'oval_canopy') {
    // Crescent oval marquee canopy with tension rods
    batcher.addBox(x, y + dh * 0.5, z + 0.2, dw, dh, 0.32, 0, 'glassWarm', 'ground');
    const oval = skyCylinder(parent, x, y + dh + 0.25, z + 1.4, dw * 0.68, dw * 0.68, 0.42, materials.trim, 18, {
      layer: 'ground',
      materialRole: 'trim'
    });
    if (oval) {
      oval.scale.set(1.18, 1, 0.68);
    }
    // Tension tie rods up to transom
    batcher.addBeam([x - dw * 0.42, y + dh + 0.4, z + 2.2], [x - dw * 0.35, y + dh + 2.6, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    batcher.addBeam([x + dw * 0.42, y + dh + 0.4, z + 2.2], [x + dw * 0.35, y + dh + 2.6, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    for (let j = -1; j <= 1; j++) {
      batcher.addBox(x + j * (dw * 0.3), y + dh * 0.5, z + 0.38, 0.15, dh, 0.2, 0, 'mullion', 'ground');
    }
  } else if (style === 'glass_curtain_lobby') {
    // High-clarity double-height glass lobby volume
    const lobH = dh * 1.4;
    batcher.addBox(x, y + lobH * 0.5, z + 0.75, dw * 1.25, lobH, 1.5, 0, 'glassWarm', 'ground');
    batcher.addBox(x, y + lobH + 0.16, z + 1.1, dw * 1.35, 0.3, 2.3, 0, 'trim', 'ground');
    for (let j = -2; j <= 2; j++) {
      batcher.addBox(x + j * (dw * 0.28), y + lobH * 0.5, z + 1.52, 0.14, lobH, 0.18, 0, 'mullion', 'ground');
    }
  } else if (style === 'recessed_colonnade') {
    batcher.addBox(x, y + dh * 0.5, z + 0.05, dw * 1.15, dh, 0.28, 0, 'glassWarm', 'ground');
    for (const px of [-dw * 0.62, -dw * 0.25, dw * 0.25, dw * 0.62]) {
      batcher.addBox(x + px, y + dh * 0.62, z + 1.15, 0.62, dh * 1.24, 0.62, 0, 'podium', 'ground');
    }
    batcher.addBox(x, y + dh * 1.26, z + 0.9, dw * 1.48, 0.65, 1.7, 0, 'trim', 'ground');
  } else {
    // Classic revolving door drum + steel vestibule
    batcher.addBox(x, y + dh * 0.5, z + 0.16, dw, dh, 0.3, 0, 'glassWarm', 'ground');
    skyCylinder(parent, x, y + dh * 0.42, z + 0.95, 1.35, 1.35, dh * 0.84, materials.glassWarm, 14, {
      layer: 'ground',
      materialRole: 'glassWarm'
    });
    batcher.addBox(x, y + dh * 0.88, z + 0.95, 3.2, 0.32, 2.2, 0, 'trim', 'ground');
    for (const s of [-1, 1]) {
      batcher.addBox(x + s * (dw * 0.42), y + dh * 0.5, z + 0.3, 0.28, dh, 0.36, 0, 'framing', 'ground');
    }
  }

  // Optional rectangular projecting entrance canopy for styles that didn't draw oval
  if (cfg.entranceCanopy && style !== 'oval_canopy' && style !== 'glass_curtain_lobby') {
    batcher.addBox(x, y + dh + 0.16, z + 1.35, dw * 1.3, 0.28, 2.6, 0, 'trim', 'ground');
    batcher.addBeam([x - dw * 0.5, y + dh + 0.24, z + 2.3], [x - dw * 0.5, y + dh + 2.1, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    batcher.addBeam([x + dw * 0.5, y + dh + 0.24, z + 2.3], [x + dw * 0.5, y + dh + 2.1, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
  }

  // Monumental staircase approaching primary entrance
  if (cfg.monumentalStairs) {
    const steps = 5;
    const stairH = Math.max(0.85, y > 0.2 ? y : 1.0);
    const stairD = 2.8;
    const stairW = dw * 1.45;
    for (let s = 0; s < steps; s++) {
      const f = (s + 1) / steps;
      const sh = (stairH / steps) * (s + 1);
      const sz = z + 0.45 + (steps - s) * (stairD / steps) * 0.5;
      batcher.addBox(x, Math.max(0, y - stairH) + sh * 0.5, sz, stairW, sh, stairD / steps + 0.15, 0, 'podium', 'ground');
    }
    // Cheek walls flanking stairs
    batcher.addBox(x - stairW * 0.52, Math.max(0, y - stairH) + stairH * 0.65, z + 0.65 + stairD * 0.35, 0.45, stairH * 0.9, stairD, 0, 'trim', 'ground');
    batcher.addBox(x + stairW * 0.52, Math.max(0, y - stairH) + stairH * 0.65, z + 0.65 + stairD * 0.35, 0.45, stairH * 0.9, stairD, 0, 'trim', 'ground');
  }

  // Building nameplate signboard on primary entrance only
  if (ent.role === 'primary' && cfg.signEnabled) {
    const signGroup = skyRoot(parent, x, y + dh + 1.05, z + 2.65);
    skySignboard(
      signGroup,
      cfg.signText || 'Skyscraper',
      clamp(dw * 0.85, 3.2, 6.4),
      1.05,
      '#18222e',
      '#edf6ff',
      { frameMaterial: materials.trim }
    );
  }
}

export function buildGroundAndPodiums(parent, complex, entrances, cfg, batcher, materials) {
  const plaza = complex.plaza;
  const podium = complex.podium;

  // 1. Urban Ground Plaza Deck
  if (plaza.enabled) {
    skyBox(parent, complex.footprintBounds.centerX, -0.24, complex.footprintBounds.centerZ, plaza.width, 0.48, plaza.depth, materials.plaza, {
      layer: 'ground',
      materialRole: 'plaza'
    });
    // Perimeter granite coping border
    const hw = plaza.width * 0.5;
    const hd = plaza.depth * 0.5;
    const cx = complex.footprintBounds.centerX;
    const cz = complex.footprintBounds.centerZ;
    batcher.addBox(cx, 0.04, cz + hd - 0.3, plaza.width, 0.14, 0.6, 0, 'trim', 'ground');
    batcher.addBox(cx, 0.04, cz - hd + 0.3, plaza.width, 0.14, 0.6, 0, 'trim', 'ground');
    batcher.addBox(cx - hw + 0.3, 0.04, cz, 0.6, 0.14, plaza.depth, 0, 'trim', 'ground');
    batcher.addBox(cx + hw - 0.3, 0.04, cz, 0.6, 0.14, plaza.depth, 0, 'trim', 'ground');

    // Plaza approach steps & ADA ramp along street (+Z)
    if (cfg.plazaStepsAndRamps) {
      for (let s = 0; s < 3; s++) {
        batcher.addBox(
          cx,
          -0.18 + s * 0.09,
          cz + hd + 0.9 - s * 0.45,
          plaza.width * 0.45,
          0.16,
          0.52,
          0,
          'podium',
          'ground'
        );
      }
      // ADA Ramp with metal handrail
      batcher.addBeam([cx + plaza.width * 0.28, -0.18, cz + hd + 1.6], [cx + plaza.width * 0.38, 0.04, cz + hd - 0.4], 2.2, 0.18, 'plaza', 'ground');
      batcher.addBeam([cx + plaza.width * 0.28 + 1.0, 0.72, cz + hd + 1.6], [cx + plaza.width * 0.38 + 1.0, 0.94, cz + hd - 0.4], 0.08, 0.08, 'trim', 'ground');
    }
  }

  // 2. Shared / Raised Podium Terrace
  if (podium.enabled && podium.height > 0.05) {
    skyBox(parent, podium.centerX, podium.height * 0.5, podium.centerZ, podium.width, podium.height, podium.depth, materials.podium, {
      layer: 'ground',
      materialRole: 'podium'
    });
    batcher.addBox(podium.centerX, podium.height + 0.15, podium.centerZ + podium.depth * 0.5 - 0.18, podium.width, 0.3, 0.36, 0, 'trim', 'ground');
  }

  // 3. Connected Podium Concourse Bridge Building (between multi-towers)
  if (podium.connected && complex.towers.length >= 2) {
    const t0 = complex.towers[0];
    const t1 = complex.towers[1];
    const spanX = Math.max(8, Math.abs(t1.x - t0.x));
    const midX = (t0.x + t1.x) * 0.5;
    const midZ = (t0.z + t1.z) * 0.5;
    const connH = clamp((t0.stack.sections[0]?.height || 9) * 0.75, 4.5, 11);
    const connD = Math.min(t0.bounds.depth, t1.bounds.depth) * 0.65;

    skyBox(parent, midX, podium.height + connH * 0.5, midZ, spanX, connH, connD, materials.podium, {
      layer: 'ground',
      materialRole: 'podium'
    });
    batcher.addBox(midX, podium.height + connH * 0.5, midZ + connD * 0.5 + 0.08, spanX * 0.78, connH * 0.72, 0.14, 0, 'glassWarm', 'ground');
    batcher.addBox(midX, podium.height + connH + 0.2, midZ, spanX + 0.8, 0.4, connD + 0.8, 0, 'trim', 'ground');
  }

  // 4. Tower Street-Level Details: Entrances, Colonnades, Storefronts, Service Docks
  for (const ent of entrances) {
    if (ent.role === 'primary' || ent.role === 'secondary_lobby' || ent.role === 'podium_portal') {
      podiumBuildMainDoorway(parent, batcher, materials, ent, cfg);
    } else if (ent.role === 'service') {
      const { x, y, z } = ent.position;
      batcher.addBox(x - 0.15, y + 2.0, z, 0.4, 4.0, 5.2, 0, 'darkMetal', 'ground');
      batcher.addBox(x - 0.7, y + 0.38, z, 1.4, 0.76, 5.6, 0, 'podium', 'ground');
      batcher.addBox(x - 0.45, y + 4.15, z, 1.2, 0.35, 5.8, 0, 'trim', 'ground');
    } else if (ent.role === 'parking') {
      const { x, y, z } = ent.position;
      batcher.addBox(x + 0.15, y + 1.8, z, 0.4, 3.6, 6.0, 0, 'darkMetal', 'ground');
      batcher.addBox(x + 0.6, y + 3.65, z, 1.4, 0.4, 6.5, 0, 'framing', 'ground');
      batcher.addBeam([x + 0.4, y + 0.05, z - 1.2], [x + 3.2, y - 0.3, z + 3.2], 5.0, 0.25, 'podium', 'ground');
    }
  }

  for (const tower of complex.towers) {
    const baseSec = tower.stack.sections[0];
    if (!baseSec) continue;
    const tb = tower.bounds;
    const baseY = tower.stack.baseElevation || 0;
    const groundH = clamp(baseSec.floorHeight || 4.2, 3.2, 7.2);

    // Exterior Ground Colonnade Columns along front/back street perimeter
    if (cfg.exteriorColumns) {
      const cols = Math.max(3, Math.round(tb.width / 5.5));
      for (let c = 0; c <= cols; c++) {
        const cx = tb.minX + 0.6 + (c / cols) * Math.max(2, tb.width - 1.2);
        batcher.addBox(cx, baseY + groundH * 0.5, tb.maxZ + 0.55, 0.58, groundH, 0.58, 0, 'podium', 'ground');
      }
      batcher.addBox((tb.minX + tb.maxX) * 0.5, baseY + groundH + 0.25, tb.maxZ + 0.55, tb.width + 0.6, 0.5, 1.1, 0, 'trim', 'ground');
    }

    // Retail storefront glazing along left & right wings outside lobby portal
    if (cfg.retailStorefronts && tb.width >= 16) {
      const bayW = Math.min(5.2, tb.width * 0.22);
      for (const s of [-1, 1]) {
        const sx = tower.x + s * (tb.width * 0.34);
        batcher.addBox(sx, baseY + groundH * 0.48, tb.maxZ + 0.16, bayW, groundH * 0.72, 0.2, 0, 'glassWarm', 'ground');
        batcher.addBox(sx, baseY + groundH * 0.88, tb.maxZ + 0.35, bayW + 0.4, 0.24, 0.65, 0, 'trim', 'ground');
      }
    }
  }

  // 5. Decorative Planters & Urban Street Trees
  const pCount = clamp(Math.round(Number(cfg.plantersCount) || 0), 0, 16);
  if (pCount > 0) {
    const fb = complex.footprintBounds;
    const frontZ = fb.maxZ + 4.8;
    const spanW = Math.max(18, fb.width + 6);
    for (let i = 0; i < pCount; i++) {
      const row = i < Math.ceil(pCount * 0.7) ? 0 : 1;
      const idx = row === 0 ? i : i - Math.ceil(pCount * 0.7);
      const countInRow = row === 0 ? Math.ceil(pCount * 0.7) : Math.max(1, pCount - Math.ceil(pCount * 0.7));
      const frac = countInRow === 1 ? 0.5 : idx / (countInRow - 1);
      let px = fb.centerX + (frac - 0.5) * spanW;
      // Leave clear central avenue in front of main door
      if (Math.abs(px - fb.centerX) < 4.5) px += (px >= fb.centerX ? 4.8 : -4.8);
      const pz = row === 0 ? frontZ : fb.minZ - 4.4;
      podiumBuildTreePlanter(parent, batcher, materials, px, 0, pz);
    }
  }

  // 6. Exterior Plaza Lighting Standards
  if (cfg.exteriorGroundLights) {
    const fb = complex.footprintBounds;
    const posts = Math.min(6, Math.max(2, complex.towers.length * 2));
    for (let i = 0; i < posts; i++) {
      const f = posts === 1 ? 0.5 : i / (posts - 1);
      const lx = fb.centerX + (f - 0.5) * Math.max(20, fb.width + 8);
      const lz = fb.maxZ + 6.5;
      skyCylinder(parent, lx, 2.2, lz, 0.08, 0.12, 4.4, materials.darkMetal, 8, {
        layer: 'ground',
        materialRole: 'darkMetal'
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), materials.crownLight);
      bulb.position.set(lx, 4.55, lz);
      bulb.userData = { layer: 'ground', materialRole: 'crownLight' };
      parent.add(bulb);
    }
  }
}
