import { clamp, lerp } from '../utils.js';
import { buildRailEndGangway } from './couplers.js';
import {
  trPartBuildPantographGroup,
  trPartAddPassengerShellWithDoors,
  trPartBuildSlidingDoorGroups
} from './rail-parts.js';

function trPaxExtBuildEndWalls(batcher, bodyEndZ, deckY, eavesY, bodyTopY, width, halfW, gangways) {
  for (const endSign of [-1, 1]) {
    const ez = endSign * (bodyEndZ - 0.08);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - 0.42), (deckY + eavesY) * 0.5, ez, 0.82, eavesY - deckY, 0.16, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
    batcher.addBox(0, eavesY - 0.24, ez, width - 0.1, 0.48, 0.16, { materialRole: 'primary', layer: 'body' });
    if (gangways) {
      buildRailEndGangway(batcher, endSign * bodyEndZ, endSign, deckY, bodyTopY);
    }
  }
}

export function trPaxExtBuildBulletLead(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const noseLen = clamp(cfg.railNoseLength || 4.8, 3.0, 5.8);
  const noseStartZ = halfL - noseLen;
  const bodyStartZ = -halfL + 0.14;
  const eavesY = bodyTopY - 0.24;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Full aerodynamic underbody belly & shrouded bogie skirts
  batcher.addBox(0, deckY - 0.14, -noseLen * 0.2, d.width - 0.06, 0.28, d.length - noseLen * 0.55, {
    materialRole: 'secondary',
    layer: 'chassis'
  });
  for (const bogie of rz.bogies) {
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - 0.04), deckY - 0.36, bogie.pivotZ, 0.08, 0.44, bogie.wheelbase + 1.25, {
        materialRole: 'secondary',
        layer: 'body'
      });
    }
  }

  // Passenger saloon behind sculpted nose
  trPartAddPassengerShellWithDoors(batcher, bodyStartZ, noseStartZ, deckY, eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: deckY + 0.82,
    winTopY: eavesY - 0.18,
    roofRole: 'primary'
  });

  // Rear diaphragm end wall
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW - 0.42), (deckY + eavesY) * 0.5, bodyStartZ + 0.08, 0.82, eavesY - deckY, 0.16, {
      materialRole: 'primary',
      layer: 'body'
    });
  }
  batcher.addBox(0, eavesY - 0.24, bodyStartZ + 0.08, d.width - 0.1, 0.48, 0.16, { materialRole: 'primary', layer: 'body' });
  if (cfg.railGangways) {
    buildRailEndGangway(batcher, bodyStartZ, -1, deckY, bodyTopY);
  }

  // Sculpted 3-stage aerodynamic Shinkansen / high-speed bullet nose
  batcher.addLoftedSlices([
    { z: noseStartZ, bottomY: deckY - 0.24, beltY: lerp(deckY, eavesY, 0.55), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.56, chamferTop: 0.12 },
    { z: lerp(noseStartZ, halfL, 0.36), bottomY: deckY - 0.24, beltY: deckY + 1.22, topY: bodyTopY - 0.38, hwBottom: halfW * 0.94, hwBelt: halfW * 0.88, hwTop: halfW * 0.46, chamferTop: 0.14 },
    { z: lerp(noseStartZ, halfL, 0.74), bottomY: deckY - 0.28, beltY: deckY + 0.68, topY: deckY + 1.15, hwBottom: halfW * 0.68, hwBelt: halfW * 0.62, hwTop: halfW * 0.3, chamferTop: 0.12 },
    { z: halfL, bottomY: deckY - 0.34, beltY: deckY + 0.08, topY: deckY + 0.42, hwBottom: halfW * 0.26, hwBelt: halfW * 0.22, hwTop: halfW * 0.12, chamferTop: 0.06 }
  ], 'primary', 'body');

  // High-speed lower nose spoiler & dark cockpit canopy glass
  batcher.addBox(0, deckY - 0.36, halfL - 0.65, d.width * 0.66, 0.24, 1.35, { materialRole: 'secondary', layer: 'chassis' });
  batcher.addBox(0, bodyTopY - 0.66, noseStartZ + 1.45, d.width * 0.56, 0.54, 1.65, {
    rotX: 0.44,
    materialRole: glassRole,
    layer: 'glass'
  });
  // Speed stripe tapering onto bullet nose
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.82), deckY + 0.62, noseStartZ + noseLen * 0.34, 0.06, 0.15, noseLen * 0.68, {
      rotY: -side * 0.2,
      materialRole: 'livery',
      layer: 'body'
    });
  }

  // Roof aerodynamic pantograph shrouds + articulated single-arm pantograph
  const pantoZ = -halfL + 3.2;
  for (const side of [-1, 1]) {
    batcher.addBox(side * 0.66, bodyTopY + 0.12, pantoZ, 0.12, 0.24, 2.5, { materialRole: 'secondary', layer: 'detail' });
  }
  const pantographs = [];
  if (rz.hasPantograph) {
    const pGrp = trPartBuildPantographGroup('hs_lead', 0, bodyTopY, pantoZ, materialBundle, {
      dir: -1,
      armLen: 0.84,
      heightFactor: cfg.railPantographHeight ?? 0.9
    });
    rootGroup.add(pGrp);
    pantographs.push(pGrp);
  }

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, deckY + 0.82, cfg, materialBundle);
  return { doors, pantographs };
}

export function trPaxExtBuildBulletCoach(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;

  // Underbody aero fairing + bogie skirts
  batcher.addBox(0, deckY - 0.24, 0, d.width - 0.08, 0.44, pax.bodyEndZ - pax.bodyStartZ, {
    materialRole: 'secondary',
    layer: 'chassis'
  });
  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, pax.bodyEndZ, deckY, pax.eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'primary'
  });
  trPaxExtBuildEndWalls(batcher, pax.bodyEndZ, deckY, pax.eavesY, bodyTopY, d.width, halfW, cfg.railGangways);

  const pantographs = [];
  if (rz.hasPantograph) {
    const pGrp = trPartBuildPantographGroup('hs_coach', 0, bodyTopY, 0, materialBundle, {
      dir: 1,
      armLen: 0.84,
      heightFactor: cfg.railPantographHeight ?? 0
    });
    rootGroup.add(pGrp);
    pantographs.push(pGrp);
  }

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle);
  return { doors, pantographs };
}

export function trPaxExtBuildBilevel(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const wellStart = rz.bogies[1].pivotZ + rz.bogies[1].wheelbase * 0.5 + 0.65;
  const wellEnd = rz.bogies[0].pivotZ - rz.bogies[0].wheelbase * 0.5 - 0.65;
  const wellLen = Math.max(3.5, wellEnd - wellStart);
  const lowFloorY = 0.52;
  const midDeckY = deckY + 1.48;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Dropped center double-decker well between bogies + end frame decks over bogies
  batcher.addBox(0, lowFloorY - 0.08, 0, d.width - 0.04, 0.16, wellLen, { materialRole: 'secondary', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    const endStart = endSign > 0 ? wellEnd : pax.bodyStartZ;
    const endFinish = endSign > 0 ? pax.bodyEndZ : wellStart;
    batcher.addBox(0, deckY - 0.08, (endStart + endFinish) * 0.5, d.width - 0.04, 0.16, Math.abs(endFinish - endStart), {
      materialRole: 'secondary',
      layer: 'chassis'
    });
  }

  // Build lower & upper side walls across central well + end vestibule doors
  const eaveY = bodyTopY - 0.24;
  for (const side of [-1, 1]) {
    const sx = side * (halfW - 0.07);
    // Lower well lower skirt + upper deck divider band + top eaves band
    batcher.addBox(sx, (lowFloorY + 0.85) * 0.5, 0, 0.14, 0.68, wellLen, { materialRole: 'primary', layer: 'body' });
    batcher.addBox(sx, midDeckY, 0, 0.14, 0.34, wellLen, { materialRole: 'secondary', layer: 'body' });
    batcher.addBox(sx, eaveY - 0.12, 0, 0.14, 0.24, pax.bodyEndZ - pax.bodyStartZ, { materialRole: 'primary', layer: 'body' });
    // Continuous livery accent band separating decks
    batcher.addBox(side * (halfW + 0.012), midDeckY, 0, 0.024, 0.16, pax.bodyEndZ - pax.bodyStartZ, {
      materialRole: 'livery',
      layer: 'body'
    });

    // Twin stacked window rows (lower + upper deck) along central well
    const winCols = clamp(Math.round(cfg.railWindowCount || 8), 4, 10);
    const pitch = wellLen / winCols;
    for (let i = 0; i <= winCols; i++) {
      const pz = wellStart + i * pitch;
      batcher.addBox(sx, (lowFloorY + 0.85 + eaveY) * 0.5, pz, 0.14, eaveY - (lowFloorY + 0.8), 0.24, {
        materialRole: 'primary',
        layer: 'body'
      });
      if (i < winCols) {
        const wz = pz + pitch * 0.5;
        batcher.addBox(side * (halfW - 0.05), lowFloorY + 1.24, wz, 0.03, 0.64, pitch * 0.72, {
          materialRole: glassRole,
          layer: 'glass'
        });
        batcher.addBox(side * (halfW - 0.05), midDeckY + 0.68, wz, 0.03, 0.7, pitch * 0.72, {
          materialRole: glassRole,
          layer: 'glass'
        });
      }
    }

    // End walls around vestibule doors
    for (const endSign of [-1, 1]) {
      const drZ = endSign * pax.doorOffsetZ;
      const innerStart = endSign > 0 ? wellEnd : drZ + pax.doorWidth * 0.5;
      const innerEnd = endSign > 0 ? drZ - pax.doorWidth * 0.5 : wellStart;
      if (innerEnd > innerStart + 0.1) {
        batcher.addBox(sx, (deckY + eaveY) * 0.5, (innerStart + innerEnd) * 0.5, 0.14, eaveY - deckY, innerEnd - innerStart, {
          materialRole: 'primary',
          layer: 'body'
        });
      }
      const outerLen = Math.max(0.24, pax.bodyEndZ - (pax.doorOffsetZ + pax.doorWidth * 0.5));
      batcher.addBox(sx, (deckY + eaveY) * 0.5, endSign * (pax.bodyEndZ - outerLen * 0.5), 0.14, eaveY - deckY, outerLen, {
        materialRole: 'primary',
        layer: 'body'
      });
      batcher.addBox(sx, (deckY + pax.doorHeight + eaveY) * 0.5, drZ, 0.14, Math.max(0.1, eaveY - deckY - pax.doorHeight), pax.doorWidth, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
  }

  // Octagonal beveled double-decker roof + HVAC pods
  batcher.addLoftedSlices([
    { z: pax.bodyStartZ, bottomY: eaveY - 0.02, beltY: lerp(eaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW * 0.84, hwTop: halfW * 0.58 },
    { z: pax.bodyEndZ, bottomY: eaveY - 0.02, beltY: lerp(eaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW * 0.84, hwTop: halfW * 0.58 }
  ], 'secondary', 'body');
  for (const hz of [-4.5, 4.5]) {
    batcher.addBox(0, bodyTopY + 0.09, hz, d.width * 0.52, 0.18, 2.0, { materialRole: 'utility', layer: 'detail' });
  }

  // Dual-deck interior floors & seats
  if (cfg.railInteriorEnabled) {
    batcher.addBox(0, lowFloorY + 0.03, 0, d.width - 0.24, 0.06, wellLen - 0.2, { materialRole: 'interiorDark', layer: 'interior' });
    batcher.addBox(0, midDeckY - 0.04, 0, d.width - 0.24, 0.08, wellLen - 0.2, { materialRole: 'interiorDark', layer: 'interior' });
    for (let rIdx = 0; rIdx < 6; rIdx++) {
      const sz = lerp(wellStart + 0.6, wellEnd - 0.6, rIdx / 5);
      for (const side of [-1, 1]) {
        batcher.addBox(side * (halfW - 0.56), lowFloorY + 0.42, sz, 0.7, 0.14, 0.44, { materialRole: 'livery', layer: 'interior' });
        batcher.addBox(side * (halfW - 0.56), midDeckY + 0.42, sz, 0.7, 0.14, 0.44, { materialRole: 'livery', layer: 'interior' });
      }
    }
  }

  trPaxExtBuildEndWalls(batcher, pax.bodyEndZ, deckY, eaveY, bodyTopY, d.width, halfW, cfg.railGangways);
  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, midDeckY, cfg, materialBundle);
  return { doors };
}

export function trPaxExtBuildDomeCoach(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const mainRoofY = bodyTopY - 0.56;
  const mainEavesY = mainRoofY - 0.22;
  const halfW = d.halfWidth;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  batcher.addBox(0, deckY - 0.08, 0, d.width - 0.04, 0.16, pax.bodyEndZ - pax.bodyStartZ, {
    materialRole: 'secondary',
    layer: 'chassis'
  });

  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, pax.bodyEndZ, deckY, mainEavesY, mainRoofY, halfW, rz.doors, cfg, {
    winSillY: deckY + 0.84,
    winTopY: mainEavesY - 0.14,
    roofRole: 'primary'
  });
  trPaxExtBuildEndWalls(batcher, pax.bodyEndZ, deckY, mainEavesY, mainRoofY, d.width, halfW, cfg.railGangways);

  // Raised panoramic Vista-Dome observation bubble centered along coach roof
  const domeLen = clamp(d.length * 0.42, 5.5, 8.2);
  const domeHalfL = domeLen * 0.5;
  const domeFloorY = mainRoofY - 0.15;
  const domeTopY = bodyTopY;

  batcher.addLoftedSlices([
    { z: -domeHalfL - 0.45, bottomY: domeFloorY, beltY: mainRoofY + 0.08, topY: mainRoofY + 0.14, hwBottom: halfW * 0.9, hwBelt: halfW * 0.82, hwTop: halfW * 0.6 },
    { z: -domeHalfL + 0.25, bottomY: domeFloorY, beltY: lerp(domeFloorY, domeTopY, 0.58), topY: domeTopY, hwBottom: halfW * 0.9, hwBelt: halfW * 0.82, hwTop: halfW * 0.54 },
    { z: domeHalfL - 0.25, bottomY: domeFloorY, beltY: lerp(domeFloorY, domeTopY, 0.58), topY: domeTopY, hwBottom: halfW * 0.9, hwBelt: halfW * 0.82, hwTop: halfW * 0.54 },
    { z: domeHalfL + 0.45, bottomY: domeFloorY, beltY: mainRoofY + 0.08, topY: mainRoofY + 0.14, hwBottom: halfW * 0.9, hwBelt: halfW * 0.82, hwTop: halfW * 0.6 }
  ], 'secondary', 'body');

  // Vista-Dome panoramic glass & frame ribs
  batcher.addBox(0, domeTopY - 0.28, 0, d.width * 0.8, 0.52, domeLen - 0.7, {
    materialRole: glassRole,
    layer: 'glass'
  });
  for (let i = 0; i <= 5; i++) {
    const rzPos = lerp(-domeHalfL + 0.35, domeHalfL - 0.35, i / 5);
    batcher.addBox(0, domeTopY - 0.26, rzPos, d.width * 0.84, 0.58, 0.09, {
      materialRole: 'primary',
      layer: 'detail'
    });
  }
  if (cfg.railInteriorEnabled) {
    for (let i = 0; i < 4; i++) {
      const sz = lerp(-domeHalfL + 0.9, domeHalfL - 0.9, i / 3);
      for (const side of [-1, 1]) {
        batcher.addBox(side * 0.58, domeFloorY + 0.24, sz, 0.66, 0.12, 0.42, { materialRole: 'livery', layer: 'interior' });
      }
    }
  }

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, deckY + 0.84, cfg, materialBundle);
  return { doors };
}

export function trPaxExtBuildSubwayClassic(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;

  batcher.addBox(0, deckY - 0.08, 0, d.width - 0.06, 0.16, pax.bodyEndZ - pax.bodyStartZ, {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });
  // Underfloor traction/air boxes
  for (const bz of [-2.0, 0, 2.0]) {
    batcher.addBox(0, deckY - 0.36, bz, d.width * 0.72, 0.42, 1.35, { materialRole: 'chassisDark', layer: 'chassis' });
  }

  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, pax.bodyEndZ, deckY, pax.eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'primary',
    longitudinalSeats: true
  });
  trPaxExtBuildEndWalls(batcher, pax.bodyEndZ, deckY, pax.eavesY, bodyTopY, d.width, halfW, cfg.railGangways);

  // Stainless fluted lower corrugation strips + rooftop HVAC units
  for (const side of [-1, 1]) {
    for (const fy of [deckY + 0.22, deckY + 0.38]) {
      batcher.addBox(side * (halfW + 0.008), fy, 0, 0.02, 0.04, pax.bodyEndZ - pax.bodyStartZ - 0.5, {
        materialRole: 'chrome',
        layer: 'detail'
      });
    }
  }
  for (const hz of [-3.4, 3.4]) {
    batcher.addBox(0, bodyTopY + 0.09, hz, d.width * 0.52, 0.18, 2.0, { materialRole: 'utility', layer: 'detail' });
  }

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle, {
    doorRole: 'chrome'
  });
  return { doors };
}

export function trPaxExtBuildMetroModern(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const cabLen = 1.65;
  const noseStartZ = halfL - cabLen;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  batcher.addBox(0, deckY - 0.1, -cabLen * 0.4, d.width - 0.06, 0.2, d.length - cabLen * 0.8, {
    materialRole: 'secondary',
    layer: 'chassis'
  });

  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, noseStartZ, deckY, pax.eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'secondary',
    longitudinalSeats: true
  });

  // Rear gangway end wall
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW - 0.42), (deckY + pax.eavesY) * 0.5, pax.bodyStartZ + 0.08, 0.82, pax.eavesY - deckY, 0.16, {
      materialRole: 'primary',
      layer: 'body'
    });
  }
  batcher.addBox(0, pax.eavesY - 0.24, pax.bodyStartZ + 0.08, d.width - 0.1, 0.48, 0.16, { materialRole: 'primary', layer: 'body' });
  if (cfg.railGangways) {
    buildRailEndGangway(batcher, pax.bodyStartZ, -1, deckY, bodyTopY);
  }

  // Sleek rounded modern metro cab front with dark visor mask
  batcher.addLoftedSlices([
    { z: noseStartZ, bottomY: deckY - 0.14, beltY: lerp(deckY, pax.eavesY, 0.55), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.56 },
    { z: halfL - 0.35, bottomY: deckY - 0.14, beltY: lerp(deckY, pax.eavesY, 0.55), topY: bodyTopY - 0.12, hwBottom: halfW * 0.94, hwBelt: halfW * 0.9, hwTop: halfW * 0.5 },
    { z: halfL, bottomY: deckY - 0.1, beltY: deckY + 1.05, topY: bodyTopY - 0.34, hwBottom: halfW * 0.8, hwBelt: halfW * 0.76, hwTop: halfW * 0.42 }
  ], 'primary', 'body');

  batcher.addBox(0, pax.windowSillY + 0.45, halfL - 0.16, d.width * 0.76, 1.32, 0.34, {
    rotX: 0.16,
    materialRole: 'secondary',
    layer: 'body'
  });
  batcher.addBox(0, pax.windowSillY + 0.46, halfL - 0.02, d.width * 0.66, 0.92, 0.12, {
    rotX: 0.16,
    materialRole: glassRole,
    layer: 'glass'
  });

  // Roof HVAC shroud
  batcher.addBox(0, bodyTopY + 0.09, -0.8, d.width * 0.58, 0.18, d.length * 0.55, {
    materialRole: 'utility',
    layer: 'detail'
  });

  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle, {
    doorRole: 'livery'
  });
  return { doors };
}

export function trPaxExtBuildPeopleMover(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  batcher.addBox(0, deckY - 0.08, 0, d.width - 0.06, 0.16, pax.bodyEndZ - pax.bodyStartZ, {
    materialRole: 'secondary',
    layer: 'chassis'
  });

  trPartAddPassengerShellWithDoors(batcher, pax.bodyStartZ, pax.bodyEndZ, deckY, pax.eavesY, bodyTopY, halfW, rz.doors, cfg, {
    winSillY: pax.windowSillY,
    winTopY: pax.windowTopY,
    roofRole: 'primary',
    longitudinalSeats: true
  });

  // Panoramic driverless end windshields on BOTH ends
  for (const endSign of [-1, 1]) {
    const ez = endSign * pax.bodyEndZ;
    batcher.addBox(0, deckY + (pax.windowSillY - deckY) * 0.5, ez - endSign * 0.08, d.width - 0.08, pax.windowSillY - deckY, 0.18, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(0, pax.eavesY - 0.12, ez - endSign * 0.08, d.width - 0.08, 0.26, 0.18, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(0, (pax.windowSillY + pax.windowTopY) * 0.5, ez - endSign * 0.04, d.width * 0.78, (pax.windowTopY - pax.windowSillY) * 0.9, 0.06, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  batcher.addBox(0, bodyTopY + 0.08, 0, d.width * 0.56, 0.16, 2.2, { materialRole: 'utility', layer: 'detail' });
  const doors = trPartBuildSlidingDoorGroups(rootGroup, rz.doors, halfW, deckY, pax.windowSillY, cfg, materialBundle, {
    doorRole: 'livery'
  });
  return { doors };
}

export function trPaxExtBuildHopper(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const bodyLen = d.length - 0.85;
  const bodyH = bodyTopY - deckY;

  // Underframe end sills + central sill + 3 sloped underside discharge hoppers
  batcher.addBox(0, deckY - 0.12, 0, 0.4, 0.24, d.length, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    batcher.addBox(0, deckY - 0.1, endSign * (halfL - 0.18), d.width, 0.22, 0.36, { materialRole: 'primary', layer: 'chassis' });
  }
  const chuteStart = rz.bogies[1].pivotZ + rz.bogies[1].wheelbase * 0.5 + 0.55;
  const chuteEnd = rz.bogies[0].pivotZ - rz.bogies[0].wheelbase * 0.5 - 0.55;
  const chuteSpan = Math.max(2.0, chuteEnd - chuteStart);
  for (let c = 0; c < 3; c++) {
    const cz = lerp(chuteStart + 0.65, chuteEnd - 0.65, c / 2);
    const bayW = Math.min(2.1, chuteSpan * 0.28);
    batcher.addLoftedSlices([
      { z: cz - bayW * 0.5, bottomY: deckY - 0.58, beltY: deckY - 0.3, topY: deckY, hwBottom: halfW * 0.24, hwBelt: halfW * 0.58, hwTop: halfW * 0.92 },
      { z: cz + bayW * 0.5, bottomY: deckY - 0.58, beltY: deckY - 0.3, topY: deckY, hwBottom: halfW * 0.24, hwBelt: halfW * 0.58, hwTop: halfW * 0.92 }
    ], 'primary', 'body');
  }

  // Open-top hopper tub side walls, top rim chord & sloped inner end sheets
  const wallT = 0.14;
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW - wallT * 0.5), deckY + bodyH * 0.5, 0, wallT, bodyH, bodyLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(side * (halfW - 0.04), bodyTopY - 0.05, 0, 0.18, 0.1, bodyLen + 0.06, {
      materialRole: 'secondary',
      layer: 'body'
    });
    // Vertical exterior structural posts
    for (let r = 0; r < 10; r++) {
      const rzPos = lerp(-bodyLen * 0.45, bodyLen * 0.45, r / 9);
      batcher.addBox(side * (halfW + 0.025), deckY + bodyH * 0.5, rzPos, 0.06, bodyH - 0.06, 0.09, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
  }
  for (const endSign of [-1, 1]) {
    batcher.addBox(0, deckY + bodyH * 0.54, endSign * (bodyLen * 0.5 - 0.32), d.width - 0.12, bodyH * 0.88, 0.14, {
      rotX: endSign * 0.28,
      materialRole: 'primary',
      layer: 'body'
    });
  }

  // Interior dark steel floor & optional bulk heap cargo
  batcher.addBox(0, deckY + 0.08, 0, d.width - 0.32, 0.12, bodyLen - 0.65, { materialRole: 'interiorDark', layer: 'interior' });
  const cargoMode = cfg.railHopperCargo || 'coal_heap';
  if (cargoMode !== 'none') {
    const cargoRole = cargoMode === 'iron_ore' ? 'secondary' : (cargoMode === 'gravel_ballast' ? 'utility' : 'chassisDark');
    const heapBaseY = bodyTopY - 0.45;
    for (let h = 0; h < 3; h++) {
      const hz = lerp(-bodyLen * 0.28, bodyLen * 0.28, h / 2);
      batcher.addCylinder(0, heapBaseY + 0.24, hz, d.width * 0.34, d.width * 0.46, 0.48, 10, 'y', cargoRole, 'detail');
    }
    batcher.addBox(0, heapBaseY, 0, d.width - 0.36, 0.35, bodyLen - 1.4, { materialRole: cargoRole, layer: 'detail' });
  }

  return { doors: [] };
}

export function trPaxExtBuildCaboose(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const cupolaTopY = bodyTopY;
  const mainRoofY = bodyTopY - 0.68;
  const eavesY = mainRoofY - 0.18;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const bodyLen = Math.max(5.5, d.length - 1.9);
  const bodyHalfL = bodyLen * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Underframe & front/rear open observation porches
  batcher.addBox(0, deckY - 0.1, 0, d.width, 0.2, d.length, { materialRole: 'secondary', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - 0.14), deckY - 0.28, endSign * (halfL - 0.3), 0.26, 0.38, 0.34, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
      if (cfg.railHandrails) {
        const porchZ = endSign * (halfL - 0.06);
        batcher.addBox(side * (halfW - 0.08), deckY + 0.48, porchZ, 0.03, 0.96, 0.03, { materialRole: 'livery', layer: 'detail' });
        batcher.addBox(side * 0.52, deckY + 0.48, porchZ, 0.03, 0.96, 0.03, { materialRole: 'livery', layer: 'detail' });
        batcher.addBox(side * ((halfW + 0.44) * 0.5), deckY + 0.94, porchZ, halfW - 0.54, 0.035, 0.035, { materialRole: 'livery', layer: 'detail' });
      }
    }
  }

  // Main caboose cabin + overhanging end roofs + livery belt stripe
  const cabinH = eavesY - deckY;
  batcher.addBox(0, deckY + cabinH * 0.5, 0, d.width, cabinH, bodyLen, { materialRole: 'primary', layer: 'body' });
  batcher.addLoftedSlices([
    { z: -halfL + 0.12, bottomY: eavesY - 0.02, beltY: lerp(eavesY, mainRoofY, 0.5), topY: mainRoofY, hwBottom: halfW + 0.04, hwBelt: halfW * 0.72, hwTop: 0.34 },
    { z: halfL - 0.12, bottomY: eavesY - 0.02, beltY: lerp(eavesY, mainRoofY, 0.5), topY: mainRoofY, hwBottom: halfW + 0.04, hwBelt: halfW * 0.72, hwTop: 0.34 }
  ], 'secondary', 'body');

  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.012), deckY + 0.78, 0, 0.022, 0.16, bodyLen * 0.96, { materialRole: 'livery', layer: 'body' });
    for (const wz of [-bodyHalfL * 0.54, bodyHalfL * 0.54]) {
      batcher.addBox(side * (halfW - 0.01), deckY + 1.38, wz, 0.05, 0.62, 0.78, { materialRole: glassRole, layer: 'glass' });
    }
  }

  // Raised central observation Cupola + stove chimney
  const cupLen = 2.6;
  const cupW = d.width * 0.74;
  batcher.addBox(0, (mainRoofY + cupolaTopY) * 0.5 - 0.08, 0, cupW, 0.72, cupLen, { materialRole: 'primary', layer: 'body' });
  batcher.addLoftedSlices([
    { z: -cupLen * 0.54, bottomY: cupolaTopY - 0.16, beltY: cupolaTopY - 0.06, topY: cupolaTopY, hwBottom: cupW * 0.55, hwBelt: cupW * 0.38, hwTop: 0.2 },
    { z: cupLen * 0.54, bottomY: cupolaTopY - 0.16, beltY: cupolaTopY - 0.06, topY: cupolaTopY, hwBottom: cupW * 0.55, hwBelt: cupW * 0.38, hwTop: 0.2 }
  ], 'secondary', 'body');
  for (const endSign of [-1, 1]) {
    for (const sx of [-0.42, 0.42]) {
      batcher.addBox(sx, cupolaTopY - 0.38, endSign * (cupLen * 0.5 + 0.01), 0.54, 0.34, 0.04, { materialRole: glassRole, layer: 'glass' });
    }
  }
  batcher.addCylinder(0.45, mainRoofY + 0.32, 2.2, 0.08, 0.09, 0.65, 8, 'y', 'chassisDark', 'detail');

  return { doors: [] };
}
