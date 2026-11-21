import { clamp, lerp } from '../utils.js';
import { VehicleBatcher } from '../geometry/primitives.js';
import { buildRailBogieGroup } from './bogies.js';
import {
  trPartBuildPantographGroup,
  trPartBuildTrolleyPole,
  trPartAddPassengerShellWithDoors,
  trPartBuildSlidingDoorGroups
} from './rail-parts.js';

export function trSpecBuildHistoricStreetcar(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const clereBaseY = bodyTopY - 0.32;
  const eavesY = clereBaseY - 0.18;
  const halfW = d.halfWidth;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Streetcar frame, end safety life-guard fenders & boarding steps
  batcher.addBox(0, deckY - 0.09, 0, d.width * 0.94, 0.18, d.length - 0.25, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    batcher.addBox(0, 0.22, endSign * (d.length * 0.5 - 0.1), d.width * 0.78, 0.08, 0.42, {
      materialRole: 'trim',
      layer: 'chassis'
    });
  }

  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, pax.bodyEndZ, deckY, eavesY, clereBaseY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: eavesY - 0.12,
    roofRole: 'secondary',
    skipRoof: true
  });

  // Curved cream/brass front & rear streetcar dash aprons + windshields
  for (const endSign of [-1, 1]) {
    const ez = endSign * pax.bodyEndZ;
    batcher.addLoftedSlices([
      { z: ez - endSign * 0.22, bottomY: deckY, beltY: deckY + 0.85, topY: eavesY, hwBottom: halfW, hwBelt: halfW * 0.96, hwTop: halfW * 0.88 },
      { z: ez, bottomY: deckY, beltY: deckY + 0.85, topY: eavesY, hwBottom: halfW * 0.78, hwBelt: halfW * 0.76, hwTop: halfW * 0.72 }
    ], 'primary', 'body');
    batcher.addBox(0, (pax.windowSillY + eavesY - 0.1) * 0.5, ez + endSign * 0.015, d.width * 0.64, eavesY - pax.windowSillY - 0.16, 0.05, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Lower deck arched roof + raised Clerestory Monitor Deck with glowing vent windows
  batcher.addLoftedSlices([
    { z: pax.bodyStartZ - 0.1, bottomY: eavesY - 0.02, beltY: clereBaseY - 0.04, topY: clereBaseY, hwBottom: halfW + 0.04, hwBelt: halfW * 0.88, hwTop: halfW * 0.66 },
    { z: pax.bodyEndZ + 0.1, bottomY: eavesY - 0.02, beltY: clereBaseY - 0.04, topY: clereBaseY, hwBottom: halfW + 0.04, hwBelt: halfW * 0.88, hwTop: halfW * 0.66 }
  ], 'trim', 'body');
  const clereLen = (pax.bodyEndZ - pax.bodyStartZ) * 0.72;
  batcher.addBox(0, clereBaseY + 0.16, 0, d.width * 0.52, 0.32, clereLen, { materialRole: 'secondary', layer: 'body' });
  batcher.addBox(0, bodyTopY - 0.02, 0, d.width * 0.58, 0.07, clereLen + 0.22, { materialRole: 'trim', layer: 'body' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (d.width * 0.26 + 0.01), clereBaseY + 0.16, 0, 0.025, 0.14, clereLen * 0.82, {
      materialRole: 'headlight',
      layer: 'detail'
    });
  }

  trPartBuildTrolleyPole(batcher, bodyTopY, -0.4, -1);

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle);
  return { doors };
}

export function trSpecBuildArticulatedTram(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const eavesY = pax.eavesY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Split 21.6m tram into 3 genuine articulated modules joined at flexible bellows (jointZ = ±3.1m)
  const jointZ = clamp(d.length * 0.145, 2.4, 3.6);
  const centerLen = jointZ * 2 - 0.56;
  const endLen = halfL - jointZ - 0.28;

  // Center floating section (built directly into main batcher)
  batcher.addBox(0, deckY - 0.08, 0, d.width - 0.06, 0.16, centerLen, { materialRole: 'secondary', layer: 'chassis' });
  trPartAddPassengerShellWithDoors(batcher, -centerLen * 0.5, centerLen * 0.5, deckY, eavesY, bodyTopY, halfW, [], cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'primary'
  });
  batcher.addBox(0, bodyTopY + 0.09, 0, d.width * 0.58, 0.18, centerLen * 0.72, { materialRole: 'utility', layer: 'detail' });

  // Ribbed accordion articulation bellows at both joints
  for (const endSign of [-1, 1]) {
    for (let b = 0; b < 3; b++) {
      const bz = endSign * (jointZ - 0.22 + b * 0.22);
      batcher.addBox(0, (deckY + bodyTopY) * 0.5, bz, d.width - 0.12 - (b % 2) * 0.06, bodyTopY - deckY - 0.16, 0.16, {
        materialRole: 'chassisDark',
        layer: 'body'
      });
    }
  }

  // Front & Rear articulated cab sections pivoted right at ±jointZ!
  const tramSections = [];
  const allDoors = [];
  for (const endSign of [1, -1]) {
    const secGrp = new THREE.Group();
    secGrp.name = `TramSection_${endSign > 0 ? 'front' : 'rear'}`;
    secGrp.position.set(0, 0, endSign * jointZ);
    const sBatch = new VehicleBatcher();

    const sStart = endSign > 0 ? 0.28 : -endLen - 0.28;
    const sEnd = endSign > 0 ? endLen + 0.28 : -0.28;
    const cabLen = 1.65;
    const cabCutZ = endSign > 0 ? sEnd - cabLen : sStart + cabLen;
    const passA = endSign > 0 ? sStart : cabCutZ;
    const passB = endSign > 0 ? cabCutZ : sEnd;

    const localDoors = rz.doors
      .filter((dr) => (endSign > 0 ? dr.z > 0 : dr.z < 0))
      .map((dr) => ({ ...dr, z: dr.z - endSign * jointZ }));

    sBatch.addBox(0, deckY - 0.08, (sStart + sEnd) * 0.5, d.width - 0.06, 0.16, endLen, {
      materialRole: 'secondary',
      layer: 'chassis'
    });
    trPartAddPassengerShellWithDoors(sBatch, passA, passB, deckY, eavesY, bodyTopY, halfW, localDoors, cfg, {
      winSillY: pax.windowSillY,
      winTopY: pax.windowTopY,
      roofRole: 'primary'
    });

    // Sleek angled low-floor tram cab front/rear nose
    const tipZ = endSign > 0 ? sEnd : sStart;
    const sBase = { z: cabCutZ, bottomY: deckY - 0.12, beltY: lerp(deckY, eavesY, 0.52), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.56 };
    const sTip = { z: tipZ, bottomY: deckY - 0.18, beltY: deckY + 0.95, topY: bodyTopY - 0.3, hwBottom: halfW * 0.72, hwBelt: halfW * 0.68, hwTop: halfW * 0.36 };
    sBatch.addLoftedSlices(endSign > 0 ? [sBase, sTip] : [sTip, sBase], 'secondary', 'body');
    sBatch.addBox(0, pax.windowSillY + 0.42, tipZ - endSign * 0.42, d.width * 0.64, 1.04, 0.14, {
      rotX: endSign * 0.32,
      materialRole: glassRole,
      layer: 'glass'
    });

    sBatch.finalize(secGrp, materialBundle);
    const secDoors = trPartBuildSlidingDoorGroups(secGrp, localDoors, halfW, deckY, pax.windowSillY, cfg, materialBundle, {
      doorRole: 'livery'
    });
    allDoors.push(...secDoors);

    secGrp.userData = {
      isTramSection: true,
      endSign,
      jointZ: endSign * jointZ
    };
    rootGroup.add(secGrp);
    tramSections.push(secGrp);
  }

  // Add standard tram bogies at layout.rail.bogies + pantograph on center section
  const customBogies = [];
  const customWheelsets = [];
  for (const bSpec of rz.bogies) {
    const bg = buildRailBogieGroup(bSpec, layout, cfg, materialBundle);
    rootGroup.add(bg);
    customBogies.push(bg);
    customWheelsets.push(...(bg.userData.wheelsets || []));
  }

  const pantographs = [];
  if (rz.hasPantograph) {
    const pGrp = trPartBuildPantographGroup('tram_main', 0, bodyTopY, 0, materialBundle, {
      dir: 1,
      armLen: 0.9,
      heightFactor: cfg.railPantographHeight ?? 0.9
    });
    rootGroup.add(pGrp);
    pantographs.push(pGrp);
  }

  return { doors: allDoors, pantographs, tramSections, customBogies, customWheelsets };
}

export function trSpecBuildOpenTram(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const clereBaseY = bodyTopY - 0.28;
  const eavesY = clereBaseY - 0.14;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Teak deck + side boarding running steps
  batcher.addBox(0, deckY - 0.08, 0, d.width, 0.16, d.length - 0.3, { materialRole: 'primary', layer: 'body' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.12), deckY - 0.22, 0, 0.24, 0.06, d.length * 0.78, {
      materialRole: 'utility',
      layer: 'chassis'
    });
  }

  // End bulkheads with windshields
  for (const endSign of [-1, 1]) {
    const ez = endSign * (halfL - 0.32);
    batcher.addBox(0, deckY + 0.52, ez, d.width * 0.92, 1.04, 0.18, { materialRole: 'primary', layer: 'body' });
    batcher.addBox(0, (deckY + 1.04 + eavesY) * 0.5, ez, d.width * 0.72, eavesY - deckY - 1.15, 0.06, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Open side brass stanchion poles + 6 cross slatted wooden benches!
  const posts = 6;
  const span = d.length - 1.3;
  for (let i = 0; i < posts; i++) {
    const pz = lerp(-span * 0.5, span * 0.5, i / (posts - 1));
    for (const side of [-1, 1]) {
      batcher.addCylinder(side * (halfW - 0.08), (deckY + eavesY) * 0.5, pz, 0.032, 0.032, eavesY - deckY, 8, 'y', 'livery', 'detail');
    }
    if (i < posts - 1) {
      const bz = pz + span / ((posts - 1) * 2);
      batcher.addBox(0, deckY + 0.42, bz, d.width * 0.84, 0.11, 0.46, { materialRole: 'primary', layer: 'interior' });
      batcher.addBox(0, deckY + 0.78, bz - 0.16, d.width * 0.82, 0.58, 0.09, { materialRole: 'primary', layer: 'interior' });
    }
  }

  // Canopy roof & clerestory deck + trolley pole
  batcher.addLoftedSlices([
    { z: -halfL + 0.1, bottomY: eavesY, beltY: clereBaseY - 0.04, topY: clereBaseY, hwBottom: halfW + 0.08, hwBelt: halfW * 0.86, hwTop: halfW * 0.62 },
    { z: halfL - 0.1, bottomY: eavesY, beltY: clereBaseY - 0.04, topY: clereBaseY, hwBottom: halfW + 0.08, hwBelt: halfW * 0.86, hwTop: halfW * 0.62 }
  ], 'secondary', 'body');
  batcher.addBox(0, clereBaseY + 0.14, 0, d.width * 0.48, 0.26, d.length * 0.66, { materialRole: 'primary', layer: 'body' });
  batcher.addBox(0, bodyTopY - 0.02, 0, d.width * 0.54, 0.06, d.length * 0.7, { materialRole: 'trim', layer: 'body' });
  trPartBuildTrolleyPole(batcher, bodyTopY, -0.3, -1);

  return { doors: [] };
}

export function trSpecBuildStraddleMonorail(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const noseLen = 2.05;
  const noseStartZ = halfL - noseLen;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Deep slotted straddle skirts hanging below floor deck around the central guideway beam (clearing pier caps at y <= 0.28m)
  const skirtBotY = 0.34;
  const skirtH = deckY - skirtBotY;
  const beamHalfClear = 0.52;
  const skirtThick = Math.max(0.28, halfW - beamHalfClear);
  const skirtCenterX = beamHalfClear + skirtThick * 0.5;
  for (const side of [-1, 1]) {
    batcher.addBox(side * skirtCenterX, skirtBotY + skirtH * 0.5, 0, skirtThick, skirtH, d.length - 0.9, {
      materialRole: 'secondary',
      layer: 'body'
    });
    batcher.addBox(side * (halfW + 0.008), skirtBotY + 0.14, 0, 0.025, 0.12, d.length - 1.1, {
      materialRole: 'livery',
      layer: 'body'
    });
  }

  trPartAddPassengerShellWithDoors(batcher, -halfL + 1.25, noseStartZ, deckY, pax.eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'primary'
  });

  // Sculpted panoramic monorail nose at +Z & aerodynamic tail at -Z
  for (const endSign of [1, -1]) {
    const baseZ = endSign > 0 ? noseStartZ : -halfL + 1.25;
    const tipZ = endSign * halfL;
    const sA = { z: baseZ, bottomY: deckY, beltY: lerp(deckY, pax.eavesY, 0.55), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.56 };
    const sB = { z: tipZ, bottomY: deckY - 0.1, beltY: deckY + 1.0, topY: bodyTopY - 0.42, hwBottom: halfW * 0.72, hwBelt: halfW * 0.66, hwTop: halfW * 0.34 };
    batcher.addLoftedSlices(endSign > 0 ? [sA, sB] : [sB, sA], 'secondary', 'body');
    batcher.addBox(0, pax.windowSillY + 0.42, lerp(baseZ, tipZ, 0.62), d.width * 0.64, 0.98, 0.24, {
      rotX: endSign * 0.38,
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Custom straddle-beam bogies with vertical load-bearing wheels (top of 1.15m beam) + horizontal side guide wheels!
  const customBogies = [];
  const customWheelsets = [];
  for (const bSpec of rz.bogies) {
    const bg = new THREE.Group();
    bg.name = `Bogie_${bSpec.id}`;
    bg.position.set(0, 0, bSpec.pivotZ);
    const bBatch = new VehicleBatcher();
    for (const side of [-1, 1]) {
      bBatch.addBox(side * 0.56, 0.78, 0, 0.14, 0.72, bSpec.wheelbase + 0.65, { materialRole: 'chassisDark', layer: 'chassis' });
      // Side guide wheel drums hugging the 0.85m beam flanks
      for (const gz of [-bSpec.wheelbase * 0.38, bSpec.wheelbase * 0.38]) {
        bBatch.addCylinder(side * 0.48, 0.52, gz, 0.18, 0.18, 0.12, 10, 'y', 'livery', 'wheel');
      }
    }
    bBatch.finalize(bg, materialBundle);

    const wsList = [];
    for (let i = 0; i < bSpec.localAxleZs.length; i++) {
      const az = bSpec.localAxleZs[i];
      const ws = new THREE.Group();
      ws.name = `Wheelset_${i}`;
      ws.position.set(0, 1.15 + 0.34, az);
      const wBatch = new VehicleBatcher();
      wBatch.addCylinder(0, 0, 0, 0.34, 0.34, 0.42, 14, 'x', 'tire', 'wheel');
      wBatch.addCylinder(0, 0, 0, 0.18, 0.18, 0.52, 10, 'x', 'rim', 'wheel');
      wBatch.finalize(ws, materialBundle);
      bg.add(ws);
      wsList.push(ws);
      customWheelsets.push(ws);
    }
    bg.userData = { pivotType: 'bogie', bogieId: bSpec.id, wheelsets: wsList };
    rootGroup.add(bg);
    customBogies.push(bg);
  }

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle, {
    doorRole: 'livery'
  });
  return { doors, customBogies, customWheelsets };
}

export function trSpecBuildSuspendedMonorail(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const cabinRoofY = Math.min(rz.zones.bodyTopY - 1.55, deckY + 2.48);
  const eavesY = pax.eavesY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Upper overhead running-gear bogies at y = 4.55m (gliding along the suspended steel girder)
  const customBogies = [];
  const customWheelsets = [];
  const overheadRailY = 4.55;
  for (const bSpec of rz.bogies) {
    const bg = new THREE.Group();
    bg.name = `Bogie_${bSpec.id}`;
    bg.position.set(0, 0, bSpec.pivotZ);
    const bBatch = new VehicleBatcher();
    bBatch.addBox(0, overheadRailY + 0.08, 0, 0.92, 0.24, bSpec.wheelbase + 0.72, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
    // Vertical steel drop neck descending beneath overhead rail beam
    bBatch.addBox(0, lerp(cabinRoofY, overheadRailY, 0.5), 0, 0.34, overheadRailY - cabinRoofY + 0.1, 0.46, {
      materialRole: 'utility',
      layer: 'chassis'
    });
    // C-shaped curved overhead hanger bracket wrapping around roof edge
    bBatch.addBox(-halfW * 0.24, cabinRoofY + 0.28, 0, halfW * 0.48, 0.22, 0.44, {
      materialRole: 'utility',
      layer: 'chassis'
    });
    bBatch.finalize(bg, materialBundle);

    const wsList = [];
    for (let i = 0; i < bSpec.localAxleZs.length; i++) {
      const az = bSpec.localAxleZs[i];
      const ws = new THREE.Group();
      ws.name = `Wheelset_${i}`;
      ws.position.set(0, overheadRailY + 0.2, az);
      const wBatch = new VehicleBatcher();
      wBatch.addCylinder(0, 0, 0, 0.055, 0.055, 0.95, 8, 'x', 'chassisDark', 'wheel');
      for (const side of [-1, 1]) {
        wBatch.addCylinder(side * 0.3, 0, 0, 0.26, 0.26, 0.1, 12, 'x', 'tire', 'wheel');
        wBatch.addCylinder(side * 0.3, 0, 0, 0.14, 0.14, 0.14, 10, 'x', 'chrome', 'wheel');
      }
      wBatch.finalize(ws, materialBundle);
      bg.add(ws);
      wsList.push(ws);
      customWheelsets.push(ws);
    }
    bg.userData = { pivotType: 'bogie', bogieId: bSpec.id, wheelsets: wsList };
    rootGroup.add(bg);
    customBogies.push(bg);
  }

  // Hanging Cabin Suspension Pivot Group at y = cabinRoofY (so cabin swings gently as a real pendulum!)
  const cabinPivot = new THREE.Group();
  cabinPivot.name = 'CabinSuspension';
  cabinPivot.position.set(0, cabinRoofY, 0);
  const cBatch = new VehicleBatcher();
  const relDeckY = deckY - cabinRoofY;
  const relEavesY = eavesY - cabinRoofY;
  const relWinSillY = pax.windowSillY - cabinRoofY;
  const relWinTopY = pax.windowTopY - cabinRoofY;

  // Suspension mounting bolster bar atop hanging cabin roof
  cBatch.addBox(0, 0.08, 0, 0.68, 0.18, d.length * 0.68, { materialRole: 'utility', layer: 'chassis' });

  const localDoors = rz.doors.map((dr) => ({ ...dr, sillY: dr.sillY - cabinRoofY }));
  const noseLen = 1.35;
  trPartAddPassengerShellWithDoors(cBatch, -halfL + noseLen, halfL - noseLen, relDeckY, relEavesY, 0, halfW, localDoors, cfg, {
    winSillY: relWinSillY,
    winTopY: relWinTopY,
    roofRole: 'secondary'
  });

  // Tapered front & rear panoramic skytrain noses
  for (const endSign of [1, -1]) {
    const baseZ = endSign * (halfL - noseLen);
    const tipZ = endSign * halfL;
    const sA = { z: baseZ, bottomY: relDeckY, beltY: lerp(relDeckY, relEavesY, 0.55), topY: 0, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.56 };
    const sB = { z: tipZ, bottomY: relDeckY + 0.08, beltY: lerp(relDeckY, 0, 0.45), topY: -0.28, hwBottom: halfW * 0.72, hwBelt: halfW * 0.68, hwTop: halfW * 0.36 };
    cBatch.addLoftedSlices(endSign > 0 ? [sA, sB] : [sB, sA], 'primary', 'body');
    cBatch.addBox(0, (relWinSillY + relWinTopY) * 0.5, lerp(baseZ, tipZ, 0.58), d.width * 0.64, (relWinTopY - relWinSillY) * 0.92, 0.2, {
      rotX: endSign * 0.25,
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  cBatch.finalize(cabinPivot, materialBundle);
  const doors = trPartBuildSlidingDoorGroups(cabinPivot, localDoors, halfW, relDeckY, relWinSillY, cfg, materialBundle, {
    doorRole: 'livery'
  });
  rootGroup.add(cabinPivot);

  return { doors, cabinPivot, customBogies, customWheelsets };
}

export function trSpecBuildAerialGondola(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const cabinRoofY = Math.min(3.75, deckY + 2.15);
  const cableY = 4.85;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Overhead Detachable Cable Grip & Haul-Rope Sheave Truck at y = cableY (4.85m)
  const customBogies = [];
  const customWheelsets = [];
  const gripGrp = new THREE.Group();
  gripGrp.name = 'Bogie_front';
  const gBatch = new VehicleBatcher();
  gBatch.addBox(0, cableY + 0.05, 0, 0.24, 0.18, 0.92, { materialRole: 'utility', layer: 'chassis' });
  gBatch.addBox(0, cableY - 0.14, 0, 0.14, 0.26, 0.22, { materialRole: 'chassisDark', layer: 'chassis' });
  // Swept C-arm steel hanger struts joining cable grip (0, cableY - 0.12) via outer elbow to cabin roof bolster (0, cabinRoofY + 0.08)
  const addHangerStrut = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) + 0.08;
    gBatch.addBox((x1 + x2) * 0.5, (y1 + y2) * 0.5, 0, 0.11, len, 0.12, {
      rotZ: -Math.atan2(dx, dy),
      materialRole: 'utility',
      layer: 'chassis'
    });
  };
  const elbowX = halfW * 0.88;
  const elbowY = lerp(cabinRoofY + 0.08, cableY - 0.14, 0.52);
  addHangerStrut(0, cabinRoofY + 0.08, elbowX, elbowY);
  addHangerStrut(elbowX, elbowY, 0, cableY - 0.12);
  gBatch.addBox(elbowX, elbowY, 0, 0.14, 0.14, 0.14, { materialRole: 'utility', layer: 'chassis' });
  gBatch.addBox(0, cabinRoofY + 0.08, 0, halfW * 0.85, 0.14, 0.28, { materialRole: 'utility', layer: 'chassis' });
  gBatch.finalize(gripGrp, materialBundle);

  const wsList = [];
  for (const [idx, sz] of [-0.34, 0.34].entries()) {
    const ws = new THREE.Group();
    ws.name = `Wheelset_${idx}`;
    ws.position.set(0, cableY + 0.08, sz);
    const wBatch = new VehicleBatcher();
    wBatch.addCylinder(0, 0, 0, 0.16, 0.16, 0.08, 12, 'x', 'chrome', 'wheel');
    wBatch.finalize(ws, materialBundle);
    gripGrp.add(ws);
    wsList.push(ws);
    customWheelsets.push(ws);
  }
  gripGrp.userData = { pivotType: 'bogie', bogieId: 'front', wheelsets: wsList };
  rootGroup.add(gripGrp);
  customBogies.push(gripGrp);

  // Hanging Gondola Cabin Suspension Pivot at y = cabinRoofY
  const cabinPivot = new THREE.Group();
  cabinPivot.name = 'CabinSuspension';
  cabinPivot.position.set(0, cabinRoofY, 0);
  const cBatch = new VehicleBatcher();
  const relDeck = deckY - cabinRoofY;
  const relBelt = relDeck + 0.82;
  const relRoof = 0;

  // Faceted panoramic gondola hull (lower painted tub + roof crown)
  cBatch.addLoftedSlices([
    { z: -halfL + 0.12, bottomY: relDeck, beltY: lerp(relDeck, relBelt, 0.6), topY: relBelt, hwBottom: halfW * 0.68, hwBelt: halfW * 0.86, hwTop: halfW * 0.88 },
    { z: -halfL * 0.45, bottomY: relDeck - 0.04, beltY: lerp(relDeck, relBelt, 0.6), topY: relBelt, hwBottom: halfW * 0.86, hwBelt: halfW, hwTop: halfW },
    { z: halfL * 0.45, bottomY: relDeck - 0.04, beltY: lerp(relDeck, relBelt, 0.6), topY: relBelt, hwBottom: halfW * 0.86, hwBelt: halfW, hwTop: halfW },
    { z: halfL - 0.12, bottomY: relDeck, beltY: lerp(relDeck, relBelt, 0.6), topY: relBelt, hwBottom: halfW * 0.68, hwBelt: halfW * 0.86, hwTop: halfW * 0.88 }
  ], 'primary', 'body');

  // Roof cap & vent pod
  cBatch.addLoftedSlices([
    { z: -halfL + 0.25, bottomY: relRoof - 0.16, beltY: relRoof - 0.06, topY: relRoof, hwBottom: halfW * 0.78, hwBelt: halfW * 0.68, hwTop: halfW * 0.48 },
    { z: halfL - 0.25, bottomY: relRoof - 0.16, beltY: relRoof - 0.06, topY: relRoof, hwBottom: halfW * 0.78, hwBelt: halfW * 0.68, hwTop: halfW * 0.48 }
  ], 'secondary', 'body');

  // Corner window mullions + side panoramic glass split cleanly around the central doorway
  const winH = relRoof - 0.16 - relBelt;
  const winMidY = relBelt + winH * 0.5;
  const doorHalfSpan = (rz.doors[0]?.width || 0.92) * 0.5 + 0.03;
  const paneOuterZ = halfL * 0.65;
  const sidePaneLen = Math.max(0.18, paneOuterZ - doorHalfSpan);
  const sidePaneCenterZ = (paneOuterZ + doorHalfSpan) * 0.5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cBatch.addBox(sx * (halfW * 0.84), winMidY, sz * paneOuterZ, 0.1, winH + 0.05, 0.1, {
        materialRole: 'trim',
        layer: 'body'
      });
      cBatch.addBox(sx * (halfW * 0.88), winMidY, sz * doorHalfSpan, 0.05, winH + 0.03, 0.05, {
        materialRole: 'trim',
        layer: 'body'
      });
      cBatch.addBox(sx * (halfW * 0.9), winMidY, sz * sidePaneCenterZ, 0.04, winH * 0.92, sidePaneLen, {
        materialRole: glassRole,
        layer: 'glass'
      });
    }
  }
  for (const sz of [-1, 1]) {
    cBatch.addBox(0, winMidY, sz * (halfL * 0.78), d.width * 0.72, winH * 0.92, 0.04, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Interior facing benches inside gondola cabin
  if (cfg.railInteriorEnabled) {
    for (const sz of [-halfL * 0.46, halfL * 0.46]) {
      cBatch.addBox(0, relDeck + 0.36, sz, d.width * 0.66, 0.12, 0.42, { materialRole: 'secondary', layer: 'interior' });
    }
  }

  cBatch.finalize(cabinPivot, materialBundle);
  const localDoors = rz.doors.map((dr) => ({ ...dr, sillY: dr.sillY - cabinRoofY, height: Math.min(dr.height, winH + 0.72) }));
  const doors = trPartBuildSlidingDoorGroups(cabinPivot, localDoors, halfW * 0.94, relDeck, relBelt, cfg, materialBundle, {
    doorRole: 'livery'
  });
  rootGroup.add(cabinPivot);

  return { doors, cabinPivot, customBogies, customWheelsets };
}
