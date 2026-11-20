import { clamp, degToRad, lerp } from '../utils.js';

function evalArchBottomY(z, layout) {
  const d = layout.dimensions;
  const gc = d.groundClearance;
  const archR = d.wheelArchRadius;
  const archH = Math.max(0.08, d.wheelArchTopY - gc);
  let best = gc;

  for (const axle of layout.axles) {
    const dist = Math.abs(z - axle.z);
    if (dist < archR) {
      const u = dist / archR;
      let f = 0;
      if (u <= 0.28) f = 1;
      else if (u <= 0.58) f = lerp(1, 0.72, (u - 0.28) / 0.3);
      else f = lerp(0.72, 0, (u - 0.58) / 0.42);
      best = Math.max(best, gc + archH * f);
    }
  }
  return best;
}

function collectZStations(zMin, zMax, layout, extraZs = []) {
  const pts = [zMin, zMax, ...extraZs];
  const archR = layout.dimensions.wheelArchRadius;
  for (const axle of layout.axles) {
    for (const k of [-1, -0.58, -0.28, 0.28, 0.58, 1]) {
      const z = axle.z + archR * k;
      if (z > zMin + 0.015 && z < zMax - 0.015) pts.push(z);
    }
  }
  const sorted = pts
    .filter((z) => z >= zMin - 0.001 && z <= zMax + 0.001)
    .map((z) => clamp(z, zMin, zMax))
    .sort((a, b) => a - b);

  const unique = [];
  for (const z of sorted) {
    if (unique.length === 0 || Math.abs(z - unique[unique.length - 1]) > 0.012) {
      unique.push(z);
    }
  }
  if (unique.length >= 2) {
    unique[0] = zMin;
    unique[unique.length - 1] = zMax;
  }
  return unique;
}

function evalLowerWidthScale(z, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  if (z > s.hood.startZ) {
    const t = clamp((z - s.hood.startZ) / Math.max(0.1, s.hood.length), 0, 1);
    return lerp(1, d.frontWidthRatio, Math.pow(t, 1.35));
  }
  if (z < s.rear.startZ + 0.65) {
    const t = clamp((s.rear.startZ + 0.65 - z) / 0.65, 0, 1);
    return lerp(1, d.rearWidthRatio, Math.pow(t, 1.4));
  }
  return 1;
}

function evalHullTopY(z, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const wedgeLift = clamp(cfg.wedgeProfile, 0, 0.35);

  if (z > s.hood.startZ) {
    const t = clamp((z - s.hood.startZ) / Math.max(0.1, s.hood.length), 0, 1);
    const minNoseTop = Math.max(d.groundClearance + 0.28, d.wheelArchTopY + 0.04);
    const drop = s.hood.length * cfg.hoodSlope * 0.58 + wedgeLift * 0.26;
    const tipY = Math.max(minNoseTop, d.beltY - drop);
    return lerp(d.beltY, tipY, Math.pow(t, 0.92));
  }
  if (z < s.cabin.startZ && cfg.bodyFamily === 'three_box') {
    // Slight trunk step down or sporty wedge raise
    const tailDrop = clamp(0.03 - wedgeLift * 0.14, -0.05, 0.06);
    return clamp(d.beltY - tailDrop, d.wheelArchTopY + 0.06, d.beltY + 0.06);
  }
  if (z < s.cabin.startZ && wedgeLift > 0.05) {
    const t = clamp((s.cabin.startZ - z) / Math.max(0.2, s.rear.length), 0, 1);
    return d.beltY + t * wedgeLift * 0.16;
  }
  return d.beltY;
}

function buildLoftedHullSpan(batcher, zStart, zEnd, layout, cfg, materialRole, options = {}) {
  const d = layout.dimensions;
  const extra = options.extraZs || [];
  const zStations = collectZStations(zStart, zEnd, layout, extra);
  if (zStations.length < 2) return;

  const sideInset = clamp(cfg.bodySideInset, 0, 0.16);
  const chamferAmt = clamp(cfg.cornerChamfer, 0.02, 0.22) * (1.2 - d.boxiness * 0.45);

  const slices = zStations.map((z) => {
    const wScale = evalLowerWidthScale(z, layout, cfg);
    const hwBelt = d.halfWidth * wScale;
    const hwBot = Math.max(0.35, hwBelt - sideInset);
    const topY = options.fixedTopY !== undefined ? options.fixedTopY : evalHullTopY(z, layout, cfg);
    const bottomY = Math.min(topY - 0.06, evalArchBottomY(z, layout));
    const beltY = lerp(bottomY, topY, 0.68);
    const hwTop = options.topWidthFactor ? hwBelt * options.topWidthFactor : hwBelt * 0.96;

    return {
      z,
      bottomY,
      beltY,
      topY,
      hwBottom: hwBot,
      hwBelt,
      hwTop,
      chamferBot: chamferAmt * 0.65,
      chamferTop: chamferAmt * 0.85
    };
  });

  batcher.addLoftedSlices(slices, materialRole, 'body');
}

function buildPickupBed(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const z0 = s.rear.startZ;
  const z1 = s.rear.endZ;
  const halfW = d.halfWidth;
  const wallT = 0.13;
  const bedFloorY = d.groundClearance + 0.16;
  const bedTopY = d.beltY;
  const innerHalfW = Math.max(0.45, halfW - wallT);

  // Bed floor & front bulkhead
  batcher.addBox(0, bedFloorY, (z0 + z1) * 0.5, innerHalfW * 2 + 0.04, 0.1, s.rear.length - 0.06, {
    materialRole: 'trim',
    layer: 'body'
  });
  batcher.addBox(0, (bedFloorY + bedTopY) * 0.5, z1 - 0.05, d.width * 0.96, bedTopY - bedFloorY, 0.1, {
    materialRole: 'primary',
    layer: 'body'
  });

  // Left & Right pickup bedsides with rear wheel arches carved
  const zStations = collectZStations(z0, z1, layout, [z0 + 0.12, z1 - 0.12]);
  for (let i = 0; i < zStations.length - 1; i++) {
    const za = zStations[i];
    const zb = zStations[i + 1];
    const zMid = (za + zb) * 0.5;
    const segLen = zb - za;
    if (segLen < 0.01) continue;
    const archY = Math.min(bedTopY - 0.08, evalArchBottomY(zMid, layout));
    const h = bedTopY - archY;
    const cy = archY + h * 0.5;
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - wallT * 0.5), cy, zMid, wallT, h, segLen, {
        materialRole: 'primary',
        layer: 'body'
      });
      // Bed top rail cap
      batcher.addBox(side * (halfW - wallT * 0.5), bedTopY + 0.015, zMid, wallT + 0.02, 0.03, segLen, {
        materialRole: 'trim',
        layer: 'body'
      });
    }
  }

  // Interior bed wheel tubs over rear axles
  for (const axle of layout.axles) {
    if (axle.z < z0 || axle.z > z1) continue;
    const tubH = Math.max(0.1, d.wheelArchTopY - bedFloorY + 0.04);
    if (tubH > 0.08) {
      for (const side of [-1, 1]) {
        batcher.addBox(side * (innerHalfW - 0.16), bedFloorY + tubH * 0.5, axle.z, 0.34, tubH, d.wheelArchRadius * 1.45, {
          materialRole: 'trim',
          layer: 'body'
        });
      }
    }
  }

  // Tailgate (folds horizontal when doorsOpen is enabled)
  if (cfg.rearCargoDoor !== 'none') {
    const tailH = bedTopY - bedFloorY;
    if (cfg.doorsOpen) {
      batcher.addBox(0, bedFloorY + 0.045, z0 + 0.05 - tailH * 0.5 + 0.045, innerHalfW * 2 + 0.02, 0.09, tailH, {
        materialRole: 'primary',
        layer: 'body'
      });
      batcher.addBox(0, bedFloorY - 0.005, z0 + 0.05 - tailH + 0.14, 0.24, 0.025, 0.045, {
        materialRole: 'trim',
        layer: 'detail'
      });
    } else {
      batcher.addBox(0, (bedFloorY + bedTopY) * 0.5, z0 + 0.05, innerHalfW * 2 + 0.02, tailH, 0.09, {
        materialRole: 'primary',
        layer: 'body'
      });
      batcher.addBox(0, bedTopY - 0.11, z0 - 0.005, 0.24, 0.045, 0.025, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
  }
}

function buildCargoBox(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const z0 = s.rear.startZ;
  const z1 = s.rear.endZ;
  const boxTopY = d.cargoRoofTopY;
  const boxHalfW = Math.min(1.36, d.halfWidth + 0.04);
  const boxRole = (cfg.roleVariant === 'ambulance' || cfg.roleVariant === 'fire') ? 'primary' : 'secondary';

  // Lofted lower box skirt with rear wheel arches + full-height upper box
  buildLoftedHullSpan(batcher, z0, z1, layout, cfg, boxRole, {
    fixedTopY: d.beltY,
    topWidthFactor: 1.0
  });

  const upperH = Math.max(0.4, boxTopY - d.beltY);
  const upperY = d.beltY + upperH * 0.5;
  batcher.addBox(0, upperY, (z0 + z1) * 0.5, boxHalfW * 2, upperH, s.rear.length, {
    materialRole: boxRole,
    layer: 'body'
  });

  // Top perimeter roof frame trim & corner extrusions
  batcher.addBox(0, boxTopY + 0.02, (z0 + z1) * 0.5, boxHalfW * 2 + 0.03, 0.05, s.rear.length + 0.03, {
    materialRole: 'utility',
    layer: 'body'
  });
  for (const side of [-1, 1]) {
    for (const endZ of [z0 + 0.03, z1 - 0.03]) {
      batcher.addBox(side * boxHalfW, upperY, endZ, 0.05, upperH, 0.06, {
        materialRole: 'utility',
        layer: 'body'
      });
    }
  }

  // Semi trailer fifth-wheel kingpin saddle & retracted landing gear struts
  if (cfg.bodyFamily === 'semi_trailer') {
    const hitchZ = (z1 + s.cabin.startZ) * 0.5;
    batcher.addBox(0, d.groundClearance + 0.34, hitchZ, Math.min(1.1, boxHalfW * 1.1), 0.16, Math.max(0.55, (s.cabin.startZ - z1) + 0.55), {
      materialRole: 'chassis',
      layer: 'chassis'
    });
    const legZ = z1 - 0.85;
    if (legZ > z0 + 0.8) {
      const legH = Math.max(0.24, d.beltY - d.groundClearance - 0.16);
      for (const side of [-1, 1]) {
        batcher.addBox(side * (boxHalfW * 0.62), d.groundClearance + 0.16 + legH * 0.5, legZ, 0.08, legH, 0.09, {
          materialRole: 'chassis',
          layer: 'chassis'
        });
        batcher.addBox(side * (boxHalfW * 0.62), d.groundClearance + 0.16, legZ, 0.18, 0.05, 0.22, {
          materialRole: 'utility',
          layer: 'chassis'
        });
      }
    }
  }
}

function buildDumpBed(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const z0 = s.rear.startZ;
  const z1 = s.rear.endZ;
  const bedLen = Math.max(1.4, z1 - z0);
  const halfW = Math.min(1.3, d.halfWidth + 0.03);
  const bedFloorY = d.groundClearance + 0.24;
  const bedTopY = Math.max(bedFloorY + 0.65, d.cargoRoofTopY - 0.14);
  const sideH = bedTopY - bedFloorY;
  const pivotZ = z0 + 0.28;
  const pivotY = bedFloorY;
  const tilt = cfg.doorsOpen ? -degToRad(24) : 0;

  // Exposed steel subframe & rear hinge trunnions
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.45), bedFloorY - 0.09, (z0 + z1) * 0.5, 0.12, 0.12, bedLen * 0.9, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
  }

  const addBedBox = (lx, ly, lz, w, h, dBox, role = 'secondary', localRx = 0) => {
    const cy = Math.cos(tilt);
    const sy = Math.sin(tilt);
    const ry = ly * cy - lz * sy;
    const rz = ly * sy + lz * cy;
    batcher.addBox(lx, pivotY + ry, pivotZ + rz, w, h, dBox, {
      rotX: tilt + localRx,
      materialRole: role,
      layer: 'body'
    });
  };

  const bedLocalMidZ = (z0 + z1) * 0.5 - pivotZ;
  const bedLocalFrontZ = z1 - 0.1 - pivotZ;
  const bedLocalRearZ = z0 + 0.08 - pivotZ;

  // Steel bed floor, side walls, structural ribs & top spill rails
  addBedBox(0, 0.055, bedLocalMidZ, halfW * 2, 0.11, bedLen, 'secondary');
  for (const side of [-1, 1]) {
    addBedBox(side * (halfW - 0.065), sideH * 0.5 + 0.05, bedLocalMidZ, 0.12, sideH, bedLen, 'secondary');
    addBedBox(side * (halfW - 0.045), sideH + 0.08, bedLocalMidZ, 0.16, 0.08, bedLen + 0.04, 'utility');
    const ribs = 4;
    for (let i = 0; i < ribs; i++) {
      const rz = lerp(bedLocalRearZ + 0.25, bedLocalFrontZ - 0.25, i / Math.max(1, ribs - 1));
      addBedBox(side * (halfW + 0.015), sideH * 0.5 + 0.06, rz, 0.055, sideH * 0.92, 0.12, 'utility');
    }
  }

  // Front bulkhead & cab-protector canopy lip clearing above cab roof
  const canopyLocalY = Math.max(sideH + 0.12, d.height - pivotY + 0.08);
  addBedBox(0, canopyLocalY * 0.5 + 0.02, bedLocalFrontZ, halfW * 2, canopyLocalY + 0.04, 0.12, 'secondary');
  addBedBox(0, canopyLocalY + 0.045, bedLocalFrontZ + 0.34, halfW * 1.94, 0.09, 0.72, 'primary');

  // Hinged rear tailgate (hangs vertical/ajar when bed tilts open)
  const gateSwing = cfg.doorsOpen ? -tilt + degToRad(8) : 0;
  addBedBox(0, sideH * 0.5 + 0.05, bedLocalRearZ, halfW * 1.88, sideH * 0.92, 0.09, 'secondary', gateSwing);

  // Exposed hydraulic telescopic lift piston when tilted
  if (cfg.doorsOpen) {
    const baseZ = z1 - 0.75;
    const baseY = d.groundClearance + 0.18;
    const targetLz = bedLocalFrontZ - 0.55;
    const topY = pivotY - targetLz * Math.sin(tilt);
    const topZ = pivotZ + targetLz * Math.cos(tilt);
    const midY = (baseY + topY) * 0.5;
    const midZ = (baseZ + topZ) * 0.5;
    const pistonLen = Math.hypot(topY - baseY, topZ - baseZ);
    const pistonRx = Math.atan2(topZ - baseZ, topY - baseY);
    batcher.addCylinder(0, midY, midZ, 0.075, 0.095, pistonLen, 10, 'y', 'chrome', 'detail', 0, pistonRx);
  }
}

function buildCementMixerDrum(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const z0 = s.rear.startZ;
  const z1 = s.rear.endZ;
  const bedLen = Math.max(1.8, z1 - z0);
  const deckY = d.groundClearance + 0.24;
  const halfW = d.halfWidth;

  // Heavy subframe rails & rear wheel fenders
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.44), deckY + 0.04, (z0 + z1) * 0.5, 0.12, 0.12, bedLen, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
    batcher.addBox(side * (halfW - 0.14), d.wheelArchTopY + 0.05, lerp(z0, z1, 0.34), 0.34, 0.05, Math.min(bedLen * 0.65, 2.35), {
      materialRole: 'trim',
      layer: 'detail'
    });
  }

  // Front mixer pedestal & cylindrical water wash tank behind cab
  const frontPedZ = z1 - 0.38;
  const rearPedZ = z0 + 0.36;
  const drumMidZ = lerp(rearPedZ, frontPedZ, 0.5);
  const drumMidY = Math.max(deckY + 0.85, (d.beltY + d.cargoRoofTopY) * 0.5 - 0.04);
  const pedH = Math.max(0.55, drumMidY - deckY - 0.15);
  batcher.addBox(0, deckY + pedH * 0.5, frontPedZ, halfW * 0.92, pedH, 0.42, {
    materialRole: 'chassisDark',
    layer: 'body'
  });
  batcher.addCylinder(0, deckY + pedH + 0.18, frontPedZ + 0.12, 0.24, 0.24, halfW * 1.12, 10, 'x', 'chrome', 'detail');

  // Rear roller A-frame cradle & elevated top charging hopper
  const rearSupportH = Math.max(0.75, drumMidY - deckY + 0.24);
  for (const side of [-1, 1]) {
    batcher.addBox(side * 0.38, deckY + rearSupportH * 0.5, rearPedZ, 0.12, rearSupportH, 0.26, {
      materialRole: 'utility',
      layer: 'body'
    });
  }
  batcher.addBox(0, deckY + rearSupportH + 0.28, rearPedZ - 0.08, 0.72, 0.42, 0.46, {
    materialRole: 'utility',
    layer: 'detail'
  });

  // 5-segment coaxial low-poly concrete drum pitched +16 deg up toward the rear
  const tiltRad = degToRad(16);
  const drumSpan = Math.max(2.2, (frontPedZ - rearPedZ) * 0.94);
  const segSpecs = [
    { u: 0.38, rRear: 0.76, rFront: 0.54, role: 'secondary' },
    { u: 0.19, rRear: 0.92, rFront: 0.76, role: 'livery' },
    { u: 0.0, rRear: 0.94, rFront: 0.92, role: 'secondary' },
    { u: -0.2, rRear: 0.78, rFront: 0.94, role: 'livery' },
    { u: -0.39, rRear: 0.48, rFront: 0.78, role: 'secondary' }
  ];
  const segLen = drumSpan / segSpecs.length;
  const maxR = Math.min(0.95, halfW - 0.16);
  const rScale = maxR / 0.94;

  for (const seg of segSpecs) {
    const uDist = seg.u * drumSpan;
    const cy = drumMidY - uDist * Math.sin(tiltRad);
    const cz = drumMidZ + uDist * Math.cos(tiltRad);
    batcher.addCylinder(0, cy, cz, seg.rFront * rScale, seg.rRear * rScale, segLen * 1.03, 12, 'z', seg.role, 'body', 0, tiltRad);
  }
}

function buildFlatbedDeck(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const z0 = s.rear.startZ;
  const z1 = s.rear.endZ;
  const bedLen = Math.max(1.5, z1 - z0);
  const bedMidZ = (z0 + z1) * 0.5;
  const deckY = Math.max(d.wheelArchTopY + 0.08, d.beltY - 0.14);
  const halfW = Math.min(1.32, d.halfWidth + 0.02);

  // Under-deck chassis frame, side toolboxes & deck platform
  batcher.addBox(0, deckY, bedMidZ, halfW * 2, 0.14, bedLen, {
    materialRole: 'utility',
    layer: 'body'
  });
  batcher.addBox(0, deckY + 0.08, bedMidZ, halfW * 1.9, 0.03, bedLen - 0.08, {
    materialRole: 'secondary',
    layer: 'body'
  });

  // Behind-cab mesh headache guard rack
  const guardH = Math.max(0.65, d.height - deckY - 0.06);
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW - 0.08), deckY + guardH * 0.5, z1 - 0.06, 0.08, guardH, 0.08, {
      materialRole: 'trim',
      layer: 'body'
    });
    batcher.addBox(side * (halfW * 0.72), deckY - 0.24, bedMidZ + bedLen * 0.16, 0.36, 0.34, Math.min(1.1, bedLen * 0.28), {
      materialRole: 'utility',
      layer: 'detail'
    });
  }
  batcher.addBox(0, deckY + guardH, z1 - 0.06, halfW * 1.94, 0.08, 0.09, {
    materialRole: 'trim',
    layer: 'body'
  });
  batcher.addBox(0, deckY + guardH * 0.65, z1 - 0.06, halfW * 1.84, guardH * 0.52, 0.04, {
    materialRole: 'chassisDark',
    layer: 'detail'
  });

  // Foldable side stake rails (drop down on hinge when doorsOpen is true)
  const stakeRotZ = cfg.doorsOpen ? degToRad(90) : 0;
  for (const side of [-1, 1]) {
    const railX = side * (halfW - 0.04);
    if (cfg.doorsOpen) {
      batcher.addBox(railX + side * 0.18, deckY - 0.06, bedMidZ, 0.32, 0.045, bedLen * 0.88, {
        materialRole: 'trim',
        layer: 'detail'
      });
    } else {
      batcher.addBox(railX, deckY + 0.34, bedMidZ, 0.045, 0.07, bedLen * 0.9, {
        rotZ: stakeRotZ,
        materialRole: 'trim',
        layer: 'detail'
      });
      const posts = 4;
      for (let i = 0; i < posts; i++) {
        const pz = lerp(z0 + 0.22, z1 - 0.25, i / (posts - 1));
        batcher.addBox(railX, deckY + 0.2, pz, 0.05, 0.3, 0.05, {
          materialRole: 'trim',
          layer: 'detail'
        });
      }
    }
  }

  // Tied-down steel I-beam / timber bundle cargo on rear half of bed
  const cargoMidZ = lerp(z0 + 0.35, z1 - 0.95, 0.42);
  const cargoLen = Math.max(0.95, bedLen * 0.48);
  for (const ox of [-0.36, 0, 0.36]) {
    batcher.addBox(ox, deckY + 0.21, cargoMidZ, 0.24, 0.22, cargoLen, {
      materialRole: ox === 0 ? 'primary' : 'chrome',
      layer: 'detail'
    });
  }
  for (const sz of [cargoMidZ - cargoLen * 0.3, cargoMidZ + cargoLen * 0.3]) {
    batcher.addBox(0, deckY + 0.22, sz, 1.04, 0.25, 0.05, {
      materialRole: 'livery',
      layer: 'detail'
    });
  }
}

function buildWheelLoaderBody(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const cab = s.cabin;
  const halfW = d.halfWidth;
  const beltY = d.beltY;
  const gc = d.groundClearance;

  // Rear heavy engine counterweight hood & radiator grille block
  buildLoftedHullSpan(batcher, s.rear.startZ, cab.endZ, layout, cfg, 'primary', {
    fixedTopY: beltY,
    extraZs: [s.rear.endZ, cab.startZ]
  });
  const counterH = Math.max(0.45, beltY - gc - 0.14);
  batcher.addBox(0, beltY - counterH * 0.38, s.rear.startZ - 0.03, halfW * 1.72, counterH * 0.84, 0.22, {
    materialRole: 'secondary',
    layer: 'body'
  });
  batcher.addBox(0, beltY - 0.12, s.rear.startZ - 0.12, halfW * 1.38, counterH * 0.56, 0.06, {
    materialRole: 'chassisDark',
    layer: 'detail'
  });

  // Center-front lower articulated loader frame & twin heavy boom pivot towers
  const frontMidZ = (s.hood.startZ + s.hood.endZ) * 0.5;
  const frontTopY = Math.max(gc + 0.38, d.wheelArchTopY - 0.08);
  batcher.addBox(0, (gc + frontTopY) * 0.5, frontMidZ, halfW * 0.92, frontTopY - gc, s.hood.length, {
    materialRole: 'secondary',
    layer: 'body'
  });
  const towerH = Math.max(0.48, beltY - frontTopY + 0.24);
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.44), frontTopY + towerH * 0.42, s.hood.startZ + s.hood.length * 0.36, 0.18, towerH, 0.58, {
      materialRole: 'primary',
      layer: 'body'
    });
  }
}

function buildArticulatedBellows(batcher, layout, cfg) {
  if (cfg.bodyFamily !== 'articulated_bus') return;
  const s = layout.sections;
  const d = layout.dimensions;
  const gapStart = s.rear.endZ;
  const gapEnd = s.cabin.startZ;
  const gapLen = gapEnd - gapStart;
  if (gapLen <= 0.05) return;

  const bottomY = d.groundClearance + 0.16;
  const topY = d.height - 0.04;
  const bellowsH = Math.max(0.8, topY - bottomY);
  const midY = bottomY + bellowsH * 0.5;
  const ribs = 4;
  const ribLen = (gapLen + 0.08) / ribs;

  for (let i = 0; i < ribs; i++) {
    const ribZ = gapStart - 0.04 + (i + 0.5) * ribLen;
    const widthFactor = i % 2 === 0 ? 0.91 : 0.84;
    batcher.addBox(0, midY, ribZ, d.width * widthFactor, bellowsH, ribLen * 0.9, {
      materialRole: i % 2 === 0 ? 'tire' : 'trim',
      layer: 'body'
    });
  }

  batcher.addCylinder(0, d.groundClearance + 0.14, (gapStart + gapEnd) * 0.5, d.halfWidth * 0.78, d.halfWidth * 0.78, 0.08, 12, 'y', 'chassisDark', 'chassis');
}

function buildCabinInterior(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const cab = s.cabin;
  const roofHalfW = d.halfWidth * d.roofWidthRatio;
  const eaveY = d.height - clamp(0.08 + cfg.roofRounding * 0.16, 0.07, 0.14);
  const isDoubleDecker = cfg.bodyFamily === 'double_decker';
  const midDeckY = isDoubleDecker ? lerp(d.beltY, eaveY, 0.46) : eaveY;
  const ghH = Math.max(0.28, (isDoubleDecker ? midDeckY - 0.1 : eaveY) - d.beltY);
  const floorY = d.groundClearance + 0.14;
  const seatCushionY = Math.max(floorY + 0.1, d.beltY - clamp(ghH * 0.42, 0.18, 0.3));
  const backH = clamp(ghH * 0.68, 0.28, 0.44);
  const headH = clamp(ghH * 0.2, 0.08, 0.12);
  const maxHeadTopY = d.beltY + ghH * 0.58;
  const backCenterY = Math.min(seatCushionY + backH * 0.54, maxHeadTopY - headH - 0.04);
  const headCenterY = Math.min(backCenterY + backH * 0.5 + headH * 0.45, maxHeadTopY - headH * 0.5);
  const frontSeatZ = clamp(cab.endZ - 0.88, cab.startZ + 0.28, cab.endZ - 0.52);
  const dashZ = clamp(cab.endZ - 0.26, frontSeatZ + 0.34, cab.endZ - 0.16);
  const driverSide = cfg.roleVariant === 'postal' ? 1 : -1;
  const driverX = driverSide * clamp(d.halfWidth * 0.42, 0.28, 0.52);

  // Dashboard & center console tunnel
  batcher.addBox(0, d.beltY - 0.16, dashZ, d.halfWidth * 1.56, 0.26, 0.32, {
    materialRole: 'interiorDark',
    layer: 'interior'
  });
  batcher.addBox(0, seatCushionY + 0.03, (frontSeatZ + dashZ) * 0.5, 0.2, 0.2, Math.max(0.32, dashZ - frontSeatZ + 0.12), {
    materialRole: 'interiorDark',
    layer: 'interior'
  });

  // Steering column & steering wheel on driver side (-X standard, +X curb-side for RHD postal)
  batcher.addBox(driverX, d.beltY - 0.06, dashZ - 0.14, 0.06, 0.06, 0.24, {
    rotX: degToRad(-24),
    materialRole: 'trim',
    layer: 'interior'
  });
  batcher.addCylinder(driverX, d.beltY - 0.01, dashZ - 0.26, 0.15, 0.15, 0.035, 10, 'z', 'tire', 'interior', 0, degToRad(26));

  // Front driver & passenger bucket seats
  for (const side of [-1, 1]) {
    const seatX = side * clamp(d.halfWidth * 0.42, 0.28, 0.52);
    batcher.addBox(seatX, seatCushionY, frontSeatZ, 0.4, 0.11, 0.42, {
      materialRole: 'interiorDark',
      layer: 'interior'
    });
    batcher.addBox(seatX, backCenterY, frontSeatZ - 0.17, 0.38, backH, 0.1, {
      rotX: degToRad(12),
      materialRole: 'interiorDark',
      layer: 'interior'
    });
    batcher.addBox(seatX, headCenterY, frontSeatZ - 0.23, 0.2, headH, 0.08, {
      materialRole: 'trim',
      layer: 'interior'
    });
  }

  // Rear bench or multi-row passenger seats (supports transit, articulated & double-decker buses)
  if (cfg.bodyFamily === 'transit_bus' || cfg.bodyFamily === 'articulated_bus' || isDoubleDecker) {
    const startZ = s.rear.startZ + 0.48;
    const endZ = cab.endZ - 1.1;
    const gapStart = cfg.bodyFamily === 'articulated_bus' ? s.rear.endZ - 0.2 : 999;
    const gapEnd = cfg.bodyFamily === 'articulated_bus' ? s.cabin.startZ + 0.2 : -999;
    if (isDoubleDecker) {
      batcher.addBox(0, midDeckY, (s.rear.startZ + cab.endZ) * 0.5, d.halfWidth * 1.72, 0.12, s.rear.length + s.cabin.length - 0.3, {
        materialRole: 'interiorDark',
        layer: 'interior'
      });
    }
    for (let z = startZ; z <= endZ; z += 0.72) {
      if (z >= gapStart && z <= gapEnd) continue;
      for (const side of [-1, 1]) {
        const seatX = side * (d.halfWidth * 0.54);
        batcher.addBox(seatX, seatCushionY, z, 0.42, 0.1, 0.36, {
          materialRole: 'interiorDark',
          layer: 'interior'
        });
        batcher.addBox(seatX, backCenterY, z - 0.14, 0.4, backH * 0.9, 0.08, {
          materialRole: 'secondary',
          layer: 'interior'
        });
        if (isDoubleDecker) {
          batcher.addBox(seatX, midDeckY + 0.22, z, 0.42, 0.1, 0.36, {
            materialRole: 'interiorDark',
            layer: 'interior'
          });
          batcher.addBox(seatX, midDeckY + 0.46, z - 0.14, 0.4, 0.42, 0.08, {
            materialRole: 'secondary',
            layer: 'interior'
          });
        }
      }
    }
  } else if (
    cfg.bodyFamily === 'three_box' ||
    cfg.bodyFamily === 'two_box' ||
    cfg.bodyFamily === 'fastback' ||
    cfg.bodyFamily === 'van_monobox' ||
    cfg.bodyFamily === 'convertible_open'
  ) {
    if (frontSeatZ - cab.startZ > 0.72) {
      const rearBenchZ = clamp(cab.startZ + 0.34, cab.startZ + 0.2, frontSeatZ - 0.5);
      const benchW = clamp(d.halfWidth * 1.46, 0.72, 1.52);
      batcher.addBox(0, seatCushionY, rearBenchZ, benchW, 0.11, 0.4, {
        materialRole: 'interiorDark',
        layer: 'interior'
      });
      batcher.addBox(0, backCenterY, rearBenchZ - 0.17, benchW, backH * 0.92, 0.1, {
        rotX: degToRad(12),
        materialRole: 'interiorDark',
        layer: 'interior'
      });
    }
  }

  // Convertible roll hoops & folded rear soft-top tonneau stack
  if (cfg.bodyFamily === 'convertible_open') {
    const hoopZ = Math.max(cab.greenhouseBottomStartZ + 0.24, frontSeatZ - 0.32);
    for (const side of [-1, 1]) {
      const hoopX = side * clamp(d.halfWidth * 0.42, 0.26, 0.48);
      batcher.addBox(hoopX - 0.1, d.beltY + 0.16, hoopZ, 0.055, 0.3, 0.055, {
        materialRole: 'trim',
        layer: 'detail'
      });
      batcher.addBox(hoopX + 0.1, d.beltY + 0.16, hoopZ, 0.055, 0.3, 0.055, {
        materialRole: 'trim',
        layer: 'detail'
      });
      batcher.addBox(hoopX, d.beltY + 0.31, hoopZ, 0.26, 0.055, 0.06, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
    batcher.addBox(0, d.beltY + 0.08, cab.greenhouseBottomStartZ + 0.12, roofHalfW * 1.88, 0.14, 0.26, {
      materialRole: 'secondary',
      layer: 'body'
    });
  }
}

function buildCabinStructure(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const cab = s.cabin;
  const beltY = d.beltY;
  const roofY = d.height;
  const roofThick = clamp(0.08 + cfg.roofRounding * 0.16, 0.07, 0.14);
  const eaveY = roofY - roofThick;
  const beltHalfW = d.halfWidth * 0.96;
  const roofHalfW = d.halfWidth * d.roofWidthRatio;
  const pillarW = clamp(0.07 + (1 - cfg.windshieldScale) * 0.12, 0.06, 0.14);
  const isOpenTop = cfg.bodyFamily === 'convertible_open';
  const isArticulated = cfg.bodyFamily === 'articulated_bus';
  const showInterior = Boolean(cfg.interiorDetail) || isOpenTop;

  if (showInterior) {
    buildCabinInterior(batcher, layout, cfg);
  } else {
    // Dark cabin interior core (prevents hollow gaps behind glass)
    const coreZStart = cab.greenhouseBottomStartZ + 0.12;
    const coreZEnd = cab.endZ - 0.12;
    const addInteriorBlock = (zStart, zEnd, rStartZ, rEndZ) => {
      if (zEnd <= zStart + 0.2) return;
      batcher.addLoftedSlices([
        {
          z: zStart,
          bottomY: beltY - 0.02,
          beltY: lerp(beltY, eaveY, 0.5),
          topY: eaveY - 0.01,
          hwBottom: beltHalfW - 0.07,
          hwBelt: beltHalfW - 0.07,
          hwTop: roofHalfW - 0.07,
          chamferBot: 0.02,
          chamferTop: 0.02
        },
        {
          z: clamp(rStartZ, zStart + 0.02, zEnd - 0.02),
          bottomY: beltY - 0.02,
          beltY: lerp(beltY, eaveY, 0.5),
          topY: eaveY - 0.01,
          hwBottom: beltHalfW - 0.07,
          hwBelt: beltHalfW - 0.07,
          hwTop: roofHalfW - 0.07,
          chamferBot: 0.02,
          chamferTop: 0.02
        },
        {
          z: clamp(rEndZ, zStart + 0.04, zEnd - 0.01),
          bottomY: beltY - 0.02,
          beltY: lerp(beltY, eaveY, 0.5),
          topY: eaveY - 0.01,
          hwBottom: beltHalfW - 0.07,
          hwBelt: beltHalfW - 0.07,
          hwTop: roofHalfW - 0.07,
          chamferBot: 0.02,
          chamferTop: 0.02
        },
        {
          z: zEnd,
          bottomY: beltY - 0.02,
          beltY: lerp(beltY, eaveY, 0.5),
          topY: eaveY - 0.01,
          hwBottom: beltHalfW - 0.07,
          hwBelt: beltHalfW - 0.07,
          hwTop: roofHalfW - 0.07,
          chamferBot: 0.02,
          chamferTop: 0.02
        }
      ], 'interiorDark', 'body');
    };
    if (isArticulated) {
      addInteriorBlock(coreZStart, s.rear.endZ - 0.06, cab.roofStartZ, s.rear.endZ - 0.12);
      addInteriorBlock(s.cabin.startZ + 0.06, coreZEnd, s.cabin.startZ + 0.12, cab.roofEndZ);
    } else {
      addInteriorBlock(coreZStart, coreZEnd, cab.roofStartZ, cab.roofEndZ);
    }
  }

  // Sloped A-Pillars (front) and Rear C/D-Pillars
  const addSlopedPillar = (side, zBot, zTop, thickZ) => {
    const yBot = beltY - 0.01;
    const yTop = eaveY + roofThick * 0.25;
    const xBot = side * (beltHalfW - pillarW * 0.42);
    const xTop = side * (roofHalfW - pillarW * 0.42);
    const dz = zTop - zBot;
    const dy = yTop - yBot;
    const dx = xTop - xBot;
    const len = Math.hypot(dx, dy, dz);
    const rotX = Math.atan2(dz, Math.hypot(dx, dy));
    const rotZ = -Math.atan2(dx, dy);
    batcher.addBox((xBot + xTop) * 0.5, (yBot + yTop) * 0.5, (zBot + zTop) * 0.5, pillarW, len, thickZ, {
      rotX,
      rotZ,
      materialRole: 'primary',
      layer: 'body'
    });
  };

  const rCapStart = cab.roofStartZ - pillarW * 0.55;
  const rCapEnd = cab.roofEndZ + pillarW * 0.55;
  const railCenterY = eaveY + roofThick * 0.25 - 0.01;
  const railH = roofThick * 0.5 + 0.02;

  for (const side of [-1, 1]) {
    addSlopedPillar(side, cab.endZ - 0.03, cab.roofEndZ + 0.03, pillarW * 1.15);

    if (!isOpenTop) {
      const rearPillarThick = (cfg.bodyFamily === 'three_box' || cfg.bodyFamily === 'fastback') ? pillarW * 1.75 : pillarW * 1.35;
      addSlopedPillar(side, cab.greenhouseBottomStartZ + 0.03, cab.roofStartZ - 0.03, rearPillarThick);

      if (isArticulated) {
        const rearHeaderLen = Math.max(0.25, s.rear.endZ - rCapStart);
        const frontHeaderLen = Math.max(0.25, rCapEnd - s.cabin.startZ);
        batcher.addBox(side * (roofHalfW - pillarW * 0.42), railCenterY, (rCapStart + s.rear.endZ) * 0.5, pillarW, railH, rearHeaderLen, {
          materialRole: 'primary',
          layer: 'body'
        });
        batcher.addBox(side * (roofHalfW - pillarW * 0.42), railCenterY, (s.cabin.startZ + rCapEnd) * 0.5, pillarW, railH, frontHeaderLen, {
          materialRole: 'primary',
          layer: 'body'
        });
        addSlopedPillar(side, s.rear.endZ - 0.04, s.rear.endZ - 0.04, pillarW * 1.2);
        addSlopedPillar(side, s.cabin.startZ + 0.04, s.cabin.startZ + 0.04, pillarW * 1.2);
      } else {
        // Roof side header rails
        const railLen = Math.max(0.25, rCapEnd - rCapStart);
        batcher.addBox(side * (roofHalfW - pillarW * 0.42), railCenterY, (rCapStart + rCapEnd) * 0.5, pillarW, railH, railLen, {
          materialRole: 'primary',
          layer: 'body'
        });
      }
    }
  }

  // Windshield upper header bar (also serves as top windshield frame for open-top convertibles)
  batcher.addBox(0, railCenterY, cab.roofEndZ + 0.02, roofHalfW * 2, railH, pillarW * 1.35, {
    materialRole: isOpenTop ? 'trim' : 'primary',
    layer: 'body'
  });

  if (isOpenTop) {
    return;
  }

  // Front & Rear Roof Cross-Headers & Interior Headliner Underside
  batcher.addBox(0, railCenterY, cab.roofEndZ, roofHalfW * 2, railH, pillarW * 1.35, {
    materialRole: 'primary',
    layer: 'body'
  });
  batcher.addBox(0, railCenterY, cab.roofStartZ, roofHalfW * 2, railH, pillarW * 1.35, {
    materialRole: 'primary',
    layer: 'body'
  });

  const addHeadlinerSpan = (hStart, hEnd) => {
    const hLen = hEnd - hStart;
    if (hLen <= 0.08) return;
    batcher.addBox(0, eaveY + 0.005, (hStart + hEnd) * 0.5, roofHalfW * 1.92, 0.03, hLen, {
      materialRole: 'interiorDark',
      layer: 'body'
    });
  };
  if (isArticulated) {
    addHeadlinerSpan(rCapStart + 0.04, s.rear.endZ - 0.02);
    addHeadlinerSpan(s.cabin.startZ + 0.02, rCapEnd - 0.04);
  } else {
    addHeadlinerSpan(rCapStart + 0.04, rCapEnd - 0.04);
  }

  // Sloped Rear Cab Bulkhead for Pickups, Box Trucks, Construction Rigs & Semis when solid rear wall is used
  const hasSeparateCabBulkhead = cfg.bodyFamily === 'pickup_cab_bed' ||
    cfg.bodyFamily === 'cab_over_box' ||
    cfg.bodyFamily === 'semi_trailer' ||
    cfg.bodyFamily === 'dump_truck' ||
    cfg.bodyFamily === 'cement_mixer' ||
    cfg.bodyFamily === 'flatbed_truck';
  if (hasSeparateCabBulkhead && cfg.rearWindowScale <= 0.36) {
    const bzBot = cab.greenhouseBottomStartZ + 0.03;
    const bzTop = cab.roofStartZ - 0.02;
    const bdy = (eaveY - beltY) + 0.02;
    const bLen = Math.hypot(bdy, bzTop - bzBot);
    batcher.addBox(0, (beltY + eaveY) * 0.5, (bzBot + bzTop) * 0.5, (beltHalfW + roofHalfW) * 0.88, bLen, 0.075, {
      rotX: Math.atan2(bzTop - bzBot, bdy),
      materialRole: 'primary',
      layer: 'body'
    });
  }

  // Horizontal mid-deck structural fascia ring for double-decker buses
  if (cfg.bodyFamily === 'double_decker') {
    const midDeckY = lerp(beltY, eaveY, 0.46);
    const midHw = lerp(beltHalfW, roofHalfW, 0.46);
    const midZRear = lerp(cab.greenhouseBottomStartZ + 0.025, cab.roofStartZ - 0.025, 0.46);
    const midZFront = lerp(cab.endZ - 0.025, cab.roofEndZ + 0.025, 0.46);
    const midSpan = Math.max(1.0, midZFront - midZRear);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (midHw + 0.008), midDeckY, (midZRear + midZFront) * 0.5, 0.055, 0.22, midSpan + 0.04, {
        materialRole: 'primary',
        layer: 'body'
      });
      batcher.addBox(side * (midHw + 0.024), midDeckY, (midZRear + midZFront) * 0.5, 0.024, 0.1, midSpan + 0.02, {
        materialRole: 'secondary',
        layer: 'detail'
      });
    }
    batcher.addBox(0, midDeckY, midZFront, midHw * 2 + 0.01, 0.22, 0.065, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(0, midDeckY, midZRear, midHw * 2 + 0.01, 0.22, 0.065, {
      materialRole: 'primary',
      layer: 'body'
    });
  }

  // Roof Crown Cap (rooflineStyle variations covering full [rCapStart, rCapEnd] overhang)
  const topWidthCrown = clamp(roofHalfW * (1 - cfg.roofRounding * 0.45), 0.35, roofHalfW - 0.02);
  if (isArticulated) {
    const crownPeak = cfg.rooflineStyle === 'domed' || cfg.rooflineStyle === 'raised_transit' ? 0.055 : 0.015;
    for (const [rStart, rEnd] of [[rCapStart, s.rear.endZ], [s.cabin.startZ, rCapEnd]]) {
      const rMid = (rStart + rEnd) * 0.5;
      batcher.addLoftedSlices([
        { z: rStart, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
        { z: rMid, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: roofY + crownPeak, hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown * 0.96, chamferBot: 0, chamferTop: 0.03 },
        { z: rEnd, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY - 0.005), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 }
      ], 'primary', 'body');
    }
    return;
  }

  const rStart = rCapStart;
  const rEnd = rCapEnd;
  const rMid = (rStart + rEnd) * 0.5;
  const crownPeak = cfg.rooflineStyle === 'domed' || cfg.rooflineStyle === 'raised_transit'
    ? 0.055
    : cfg.rooflineStyle === 'split_aero'
    ? 0.045
    : 0.015;

  if (cfg.rooflineStyle === 'stepped_van' && rEnd - rStart > 1.2) {
    const stepZ = lerp(rEnd, rStart, 0.35);
    batcher.addLoftedSlices([
      { z: rStart, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: roofY + 0.06, hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: stepZ - 0.14, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: roofY + 0.06, hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: stepZ + 0.14, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.55, roofY - 0.02), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: rEnd, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY - 0.025), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 }
    ], 'primary', 'body');
  } else if (cfg.rooflineStyle === 'sloped_fastback') {
    batcher.addLoftedSlices([
      { z: rStart, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.45, topY: Math.max(eaveY + roofThick * 0.5, roofY - 0.04), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: rMid, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: roofY + 0.02, hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: rEnd, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY - 0.01), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 }
    ], 'primary', 'body');
  } else if (cfg.rooflineStyle === 'split_aero') {
    batcher.addLoftedSlices([
      { z: rStart, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.025 },
      { z: rEnd, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.025 }
    ], 'primary', 'body');
    const railSpan = Math.max(0.4, rEnd - rStart - 0.12);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (topWidthCrown * 0.62), roofY + 0.025, rMid, 0.14, 0.05, railSpan, {
        materialRole: 'secondary',
        layer: 'body'
      });
    }
  } else {
    batcher.addLoftedSlices([
      { z: rStart, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 },
      { z: rMid, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: roofY + crownPeak, hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown * 0.96, chamferBot: 0, chamferTop: 0.03 },
      { z: rEnd, bottomY: eaveY - 0.01, beltY: eaveY + roofThick * 0.5, topY: Math.max(eaveY + roofThick * 0.5, roofY - 0.005), hwBottom: roofHalfW, hwBelt: roofHalfW, hwTop: topWidthCrown, chamferBot: 0, chamferTop: 0.03 }
    ], 'primary', 'body');
  }
}

export function buildVehicleBody(batcher, layout, cfg) {
  const s = layout.sections;

  if (cfg.bodyFamily === 'pickup_cab_bed') {
    buildPickupBed(batcher, layout, cfg);
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.hood.startZ, s.hood.startZ + s.hood.length * 0.5]
    });
  } else if (cfg.bodyFamily === 'cab_over_box' || cfg.bodyFamily === 'semi_trailer') {
    buildCargoBox(batcher, layout, cfg);
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.hood.startZ]
    });
  } else if (cfg.bodyFamily === 'dump_truck') {
    buildDumpBed(batcher, layout, cfg);
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.hood.startZ, s.hood.startZ + s.hood.length * 0.5]
    });
  } else if (cfg.bodyFamily === 'cement_mixer') {
    buildCementMixerDrum(batcher, layout, cfg);
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.hood.startZ, s.hood.startZ + s.hood.length * 0.5]
    });
  } else if (cfg.bodyFamily === 'flatbed_truck') {
    buildFlatbedDeck(batcher, layout, cfg);
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.hood.startZ, s.hood.startZ + s.hood.length * 0.5]
    });
  } else if (cfg.bodyFamily === 'wheel_loader') {
    buildWheelLoaderBody(batcher, layout, cfg);
  } else if (cfg.bodyFamily === 'articulated_bus') {
    buildLoftedHullSpan(batcher, s.rear.startZ, s.rear.endZ, layout, cfg, 'primary', {
      extraZs: [s.rear.startZ + 0.45]
    });
    buildLoftedHullSpan(batcher, s.cabin.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.cabin.endZ, s.hood.startZ + s.hood.length * 0.55]
    });
    buildArticulatedBellows(batcher, layout, cfg);
  } else {
    buildLoftedHullSpan(batcher, s.rear.startZ, s.hood.endZ, layout, cfg, 'primary', {
      extraZs: [s.cabin.startZ, s.cabin.endZ, s.hood.startZ + s.hood.length * 0.55]
    });
  }

  buildCabinStructure(batcher, layout, cfg);
}
