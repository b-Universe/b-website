import { clamp, lerp } from '../utils.js';
import { VehicleBatcher } from '../geometry/primitives.js';

export function trPartSetPantographHeight(pantoGroup, factor = 0.85) {
  if (!pantoGroup?.userData?.isPantograph) return;
  const f = clamp(Number(factor) ?? 0.85, 0, 1);
  const baseTilt = lerp(1.38, 0.42, f);
  const upperTilt = lerp(-2.72, -0.84, f);
  const { lowerArm, upperArm, head, armLen, baseY } = pantoGroup.userData;
  if (lowerArm) lowerArm.rotation.x = baseTilt;
  if (upperArm) {
    const elbowY = Math.cos(baseTilt) * armLen;
    const elbowZ = Math.sin(baseTilt) * armLen;
    upperArm.position.set(0, baseY + elbowY, elbowZ);
    upperArm.rotation.x = baseTilt + upperTilt;
    if (head) {
      const topY = elbowY + Math.cos(baseTilt + upperTilt) * armLen;
      const topZ = elbowZ + Math.sin(baseTilt + upperTilt) * armLen;
      head.position.set(0, baseY + topY, topZ);
    }
  }
}

export function trPartBuildPantographGroup(id, x, roofY, z, materialBundle, options = {}) {
  const grp = new THREE.Group();
  grp.name = `Pantograph_${id}`;
  grp.position.set(x, roofY, z);
  const dir = options.dir || 1;
  grp.rotation.y = dir < 0 ? Math.PI : 0;

  const baseBatch = new VehicleBatcher();
  // Ceramic insulators & base skid frame
  for (const ix of [-0.52, 0.52]) {
    for (const iz of [-0.42, 0.42]) {
      baseBatch.addCylinder(ix, 0.06, iz, 0.055, 0.065, 0.12, 8, 'y', 'livery', 'detail');
    }
  }
  baseBatch.addBox(0, 0.13, 0, 1.18, 0.05, 0.96, { materialRole: 'chassisDark', layer: 'detail' });
  baseBatch.finalize(grp, materialBundle);

  const armLen = options.armLen || 0.92;
  const baseY = 0.16;

  // Lower pivoting arm
  const lowerArm = new THREE.Group();
  lowerArm.name = `${id}_LowerArm`;
  lowerArm.position.set(0, baseY, 0);
  const lBatch = new VehicleBatcher();
  for (const sx of [-0.28, 0.28]) {
    lBatch.addBox(sx, armLen * 0.5, 0, 0.048, armLen, 0.052, { materialRole: 'livery', layer: 'detail' });
  }
  lBatch.addBox(0, armLen * 0.65, 0, 0.6, 0.04, 0.04, { materialRole: 'utility', layer: 'detail' });
  lBatch.finalize(lowerArm, materialBundle);
  grp.add(lowerArm);

  // Upper single-arm assembly
  const upperArm = new THREE.Group();
  upperArm.name = `${id}_UpperArm`;
  const uBatch = new VehicleBatcher();
  uBatch.addBox(0, armLen * 0.5, 0, 0.058, armLen, 0.058, { materialRole: 'chrome', layer: 'detail' });
  uBatch.finalize(upperArm, materialBundle);
  grp.add(upperArm);

  // Collector bow head (graphite contact strips + end horns)
  const head = new THREE.Group();
  head.name = `${id}_CollectorHead`;
  const hBatch = new VehicleBatcher();
  hBatch.addBox(0, 0.04, 0, 1.48, 0.045, 0.22, { materialRole: 'utility', layer: 'detail' });
  hBatch.addBox(0, 0.075, -0.05, 1.38, 0.03, 0.045, { materialRole: 'chassisDark', layer: 'detail' });
  hBatch.addBox(0, 0.075, 0.05, 1.38, 0.03, 0.045, { materialRole: 'chassisDark', layer: 'detail' });
  for (const sx of [-1, 1]) {
    hBatch.addBox(sx * 0.82, 0.015, 0, 0.2, 0.03, 0.16, { rotZ: -sx * 0.35, materialRole: 'livery', layer: 'detail' });
  }
  hBatch.finalize(head, materialBundle);
  grp.add(head);

  grp.userData = {
    isPantograph: true,
    lowerArm,
    upperArm,
    head,
    armLen,
    baseY
  };

  trPartSetPantographHeight(grp, options.heightFactor ?? 0.85);
  return grp;
}

export function trPartBuildTrolleyPole(batcher, roofY, zCenter, dir = -1) {
  // Swivel spring base
  batcher.addCylinder(0, roofY + 0.08, zCenter, 0.16, 0.2, 0.14, 10, 'y', 'utility', 'detail');
  // Angled insulated trolley pole rising toward overhead wire
  const poleLen = 2.65;
  const pitch = dir * 0.62;
  const tipY = roofY + 0.14 + Math.cos(0.62) * poleLen * 0.5;
  const tipZ = zCenter + dir * Math.sin(0.62) * poleLen * 0.5;
  batcher.addBox(0, tipY, tipZ, 0.045, poleLen, 0.045, {
    rotX: pitch,
    materialRole: 'livery',
    layer: 'detail'
  });
  const endY = roofY + 0.14 + Math.cos(0.62) * poleLen;
  const endZ = zCenter + dir * Math.sin(0.62) * poleLen;
  batcher.addCylinder(0, endY, endZ, 0.09, 0.09, 0.05, 10, 'x', 'chrome', 'detail');
}

export function trPartAddPassengerShellWithDoors(batcher, bodyStartZ, bodyEndZ, deckY, eavesY, bodyTopY, halfW, doorList, cfg, options = {}) {
  const wallThick = options.wallThick || 0.12;
  const wallX = halfW - wallThick * 0.5;
  const width = halfW * 2;
  const winSillY = options.winSillY || (deckY + 0.84);
  const winTopY = options.winTopY || (eavesY - 0.16);
  const lowerH = Math.max(0.25, winSillY - deckY);
  const winH = Math.max(0.35, winTopY - winSillY);
  const upperH = Math.max(0.14, eavesY - winTopY);
  const bodyLen = bodyEndZ - bodyStartZ;
  const paxGlass = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Build ordered unique door spans along Z
  const rightDoors = (doorList || []).filter((dr) => dr.side === 1).sort((a, b) => a.z - b.z);
  const spans = [];
  let cursor = bodyStartZ;
  for (const dr of rightDoors) {
    const d0 = dr.z - dr.width * 0.5;
    const d1 = dr.z + dr.width * 0.5;
    if (d0 > cursor + 0.05) spans.push([cursor, d0]);
    cursor = Math.max(cursor, d1);
  }
  if (bodyEndZ > cursor + 0.05) spans.push([cursor, bodyEndZ]);

  for (const side of [-1, 1]) {
    const sx = side * wallX;
    // Continuous upper header above doors & windows
    batcher.addBox(sx, eavesY - upperH * 0.5, (bodyStartZ + bodyEndZ) * 0.5, wallThick, upperH, bodyLen, {
      materialRole: 'primary',
      layer: 'body'
    });

    // Lower walls & window bays for each solid span between doorways
    for (const [zA, zB] of spans) {
      const spanLen = zB - zA;
      const midZ = (zA + zB) * 0.5;
      batcher.addBox(sx, deckY + lowerH * 0.5, midZ, wallThick, lowerH, spanLen, {
        materialRole: 'primary',
        layer: 'body'
      });

      if (spanLen < 0.7) {
        // Solid end corner post beside door
        batcher.addBox(sx, winSillY + winH * 0.5, midZ, wallThick, winH + 0.02, spanLen, {
          materialRole: 'primary',
          layer: 'body'
        });
      } else {
        const winCount = Math.max(1, Math.min(8, Math.round((spanLen / Math.max(4, bodyLen)) * (cfg.railWindowCount || 8))));
        const bayPitch = spanLen / winCount;
        const pillarLen = clamp(bayPitch * 0.22, 0.14, 0.32);
        const paneLen = Math.max(0.32, bayPitch - pillarLen);
        const winMidY = winSillY + winH * 0.5;

        if (cfg.railLiveryPattern === 'window_band') {
          batcher.addBox(side * (halfW - 0.028), winMidY, midZ, 0.075, winH + 0.08, spanLen, {
            materialRole: 'secondary',
            layer: 'body'
          });
        }
        for (let i = 0; i <= winCount; i++) {
          const pz = zA + i * bayPitch;
          batcher.addBox(sx, winMidY, pz, wallThick, winH + 0.04, pillarLen, {
            materialRole: cfg.railLiveryPattern === 'window_band' ? 'secondary' : 'primary',
            layer: 'body'
          });
          if (i < winCount) {
            const wz = pz + bayPitch * 0.5;
            batcher.addBox(side * (halfW - 0.05), winMidY, wz, 0.03, winH * 0.88, paneLen * 0.94, {
              materialRole: paxGlass,
              layer: 'glass'
            });
          }
        }
      }

      if (cfg.railLiveryPattern !== 'solid') {
        batcher.addBox(side * (halfW + 0.008), winSillY - 0.14, midZ, 0.02, 0.15, spanLen, {
          materialRole: 'livery',
          layer: 'body'
        });
      }
    }

    // Header lintel above each door opening
    for (const dr of rightDoors) {
      const drTop = dr.sillY + dr.height;
      if (eavesY > drTop + 0.02) {
        batcher.addBox(sx, (drTop + eavesY) * 0.5, dr.z, wallThick, eavesY - drTop, dr.width, {
          materialRole: 'primary',
          layer: 'body'
        });
      }
    }
  }

  // Curved roof crown
  if (options.skipRoof !== true) {
    batcher.addLoftedSlices([
      {
        z: bodyStartZ,
        bottomY: eavesY - 0.02,
        beltY: lerp(eavesY, bodyTopY, 0.55),
        topY: bodyTopY,
        hwBottom: halfW,
        hwBelt: halfW * 0.88,
        hwTop: halfW * 0.56,
        chamferBot: 0.02,
        chamferTop: 0.08
      },
      {
        z: bodyEndZ,
        bottomY: eavesY - 0.02,
        beltY: lerp(eavesY, bodyTopY, 0.55),
        topY: bodyTopY,
        hwBottom: halfW,
        hwBelt: halfW * 0.88,
        hwTop: halfW * 0.56,
        chamferBot: 0.02,
        chamferTop: 0.08
      }
    ], options.roofRole || 'secondary', 'body');
  }

  // Simplified interior floor, ceiling light & seats strictly inside longest non-door span
  if (cfg.railInteriorEnabled && options.skipInterior !== true) {
    batcher.addBox(0, deckY + 0.025, (bodyStartZ + bodyEndZ) * 0.5, width - 0.22, 0.05, bodyLen - 0.2, {
      materialRole: 'interiorDark',
      layer: 'interior'
    });
    batcher.addBox(0, eavesY - 0.05, (bodyStartZ + bodyEndZ) * 0.5, 0.3, 0.035, bodyLen - 0.9, {
      materialRole: 'headlight',
      layer: 'interior'
    });
    for (const [zA, zB] of spans) {
      if (zB - zA < 1.2) continue;
      if (options.longitudinalSeats) {
        for (const side of [-1, 1]) {
          batcher.addBox(side * (halfW - 0.38), deckY + 0.42, (zA + zB) * 0.5, 0.46, 0.14, zB - zA - 0.25, {
            materialRole: 'livery',
            layer: 'interior'
          });
          batcher.addBox(side * (halfW - 0.19), deckY + 0.72, (zA + zB) * 0.5, 0.1, 0.52, zB - zA - 0.25, {
            materialRole: 'secondary',
            layer: 'interior'
          });
        }
      } else {
        const rows = Math.max(2, Math.floor((zB - zA - 0.3) / 1.02));
        for (let i = 0; i < rows; i++) {
          const sz = lerp(zA + 0.35, zB - 0.35, i / Math.max(1, rows - 1));
          for (const side of [-1, 1]) {
            batcher.addBox(side * (halfW - 0.56), deckY + 0.42, sz, 0.72, 0.14, 0.44, { materialRole: 'livery', layer: 'interior' });
            batcher.addBox(side * (halfW - 0.56), deckY + 0.78, sz - 0.16, 0.7, 0.62, 0.1, { materialRole: 'livery', layer: 'interior' });
          }
        }
      }
    }
  }
}

export function trPartBuildSlidingDoorGroups(rootGroup, doorList, halfW, deckY, winSillY, cfg, materialBundle, options = {}) {
  const paxGlass = cfg.railInteriorEnabled ? 'railGlass' : 'glass';
  const out = [];
  for (const dr of doorList || []) {
    const grp = new THREE.Group();
    grp.name = `Door_${dr.id}`;
    const dBatch = new VehicleBatcher();
    const dx = dr.side * (halfW - 0.02);
    const dMidY = dr.sillY + dr.height * 0.5;
    dBatch.addBox(dx, dMidY, dr.z, 0.068, dr.height, dr.width * 0.96, {
      materialRole: options.doorRole || 'secondary',
      layer: 'body'
    });
    dBatch.addBox(dx + dr.side * 0.014, dMidY + dr.height * 0.18, dr.z, 0.052, dr.height * 0.38, dr.width * 0.62, {
      materialRole: paxGlass,
      layer: 'glass'
    });
    dBatch.addBox(dx + dr.side * 0.032, winSillY - 0.14, dr.z, 0.02, 0.15, dr.width * 0.92, {
      materialRole: 'livery',
      layer: 'body'
    });
    dBatch.finalize(grp, materialBundle);
    grp.userData = {
      pivotType: 'door',
      doorId: dr.id,
      basePos: [0, 0, 0],
      slideVector: [0, 0, dr.slideDir * dr.maxSlide]
    };
    rootGroup.add(grp);
    out.push(grp);
  }
  return out;
}
