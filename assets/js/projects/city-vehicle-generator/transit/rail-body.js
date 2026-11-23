import { clamp, lerp, rng32 } from '../utils.js';
import { VehicleBatcher } from '../geometry/primitives.js';
import { buildRailEndGangway } from './couplers.js';
import {
  trLocoExtBuildElectric,
  trLocoExtBuildStreamlinedDiesel,
  trLocoExtBuildSteam,
  trLocoExtBuildMaintenance,
  trLocoExtBuildTankSteam,
  trLocoExtBuildArticulatedSteam,
  trLocoExtBuildHeavyDiesel,
  trLocoExtBuildBoxElectric
} from './rail-locos-ext.js';
import {
  trPaxExtBuildBulletLead,
  trPaxExtBuildBulletCoach,
  trPaxExtBuildBilevel,
  trPaxExtBuildDomeCoach,
  trPaxExtBuildSubwayClassic,
  trPaxExtBuildMetroModern,
  trPaxExtBuildPeopleMover,
  trPaxExtBuildHopper,
  trPaxExtBuildCaboose,
  trPaxExtBuildDiningCoach,
  trPaxExtBuildSleeperCoach,
  trPaxExtBuildAutoRack,
  trPaxExtBuildWellCar
} from './rail-passenger-ext.js';
import {
  trSpecBuildHistoricStreetcar,
  trSpecBuildArticulatedTram,
  trSpecBuildOpenTram,
  trSpecBuildStraddleMonorail,
  trSpecBuildSuspendedMonorail,
  trSpecBuildAerialGondola
} from './rail-specialty.js';

function trBodyAddStirrupStep(batcher, x, deckY, z) {
  batcher.addBox(x, deckY - 0.24, z, 0.035, 0.36, 0.035, { materialRole: 'chassisDark', layer: 'chassis' });
  batcher.addBox(x, deckY - 0.24, z + 0.14, 0.035, 0.36, 0.035, { materialRole: 'chassisDark', layer: 'chassis' });
  batcher.addBox(x, deckY - 0.42, z + 0.07, 0.04, 0.035, 0.18, { materialRole: 'utility', layer: 'chassis' });
}

function trBodyAddHandbrakeWheel(batcher, x, y, z) {
  batcher.addBox(x, y - 0.14, z, 0.11, 0.24, 0.09, { materialRole: 'utility', layer: 'detail' });
  batcher.addCylinder(x, y, z - 0.06, 0.21, 0.21, 0.032, 10, 'z', 'livery', 'detail');
  batcher.addBox(x, y, z - 0.065, 0.38, 0.03, 0.025, { materialRole: 'utility', layer: 'detail' });
  batcher.addBox(x, y, z - 0.065, 0.03, 0.38, 0.025, { materialRole: 'utility', layer: 'detail' });
}

function trBodyAddSideLadder(batcher, side, xPos, yBot, yTop, zCenter, width = 0.38) {
  const h = Math.max(0.4, yTop - yBot);
  const midY = (yBot + yTop) * 0.5;
  const railX = xPos + side * 0.035;
  for (const dz of [-width * 0.5, width * 0.5]) {
    batcher.addBox(railX, midY, zCenter + dz, 0.026, h, 0.026, { materialRole: 'utility', layer: 'detail' });
  }
  const rungs = Math.max(3, Math.floor(h / 0.34));
  for (let i = 0; i <= rungs; i++) {
    const ry = lerp(yBot + 0.12, yTop - 0.1, i / Math.max(1, rungs));
    batcher.addBox(railX, ry, zCenter, 0.024, 0.024, width, { materialRole: 'utility', layer: 'detail' });
  }
}

function trBodyAddHandrailSpan(batcher, x1, y1, z1, x2, y2, z2, railRole = 'livery', postRole = 'utility', postSpacing = 1.15) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const spanLen = Math.hypot(dx, dz);
  if (spanLen < 0.08) return;
  const yaw = Math.atan2(dx, dz);
  const mx = (x1 + x2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const topY = (y1 + y2) * 0.5 + 0.96;
  const midY = (y1 + y2) * 0.5 + 0.52;

  batcher.addBox(mx, topY, mz, 0.03, 0.032, spanLen, { rotY: yaw, materialRole: railRole, layer: 'detail' });
  batcher.addBox(mx, midY, mz, 0.024, 0.024, spanLen, { rotY: yaw, materialRole: postRole, layer: 'detail' });

  const posts = Math.max(2, Math.round(spanLen / postSpacing) + 1);
  for (let i = 0; i < posts; i++) {
    const t = posts === 1 ? 0.5 : i / (posts - 1);
    const px = lerp(x1, x2, t);
    const py = lerp(y1, y2, t);
    const pz = lerp(z1, z2, t);
    batcher.addBox(px, py + 0.49, pz, 0.028, 0.98, 0.028, { materialRole: postRole, layer: 'detail' });
  }
}

function trBodyAddLiveryStripe(batcher, halfW, y, zStart, zEnd, height = 0.16, role = 'livery') {
  const len = zEnd - zStart;
  if (len <= 0.1) return;
  const cz = (zStart + zEnd) * 0.5;
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.008), y, cz, 0.02, height, len, {
      materialRole: role,
      layer: 'body'
    });
  }
}

function trBodyAddWindowPane(batcher, cx, cy, cz, w, h, d, glassRole = 'glass') {
  batcher.addBox(cx, cy, cz, w, h, d, {
    materialRole: glassRole,
    layer: 'glass'
  });
}

function trBodyBuildLocomotive(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const loco = rz.zones.loco;
  const halfW = d.halfWidth;
  const length = d.length;
  const isSwitcher = cfg.bodyFamily === 'rail_diesel_switcher';

  // 1. Heavy locomotive frame sill & deck plate
  const frameH = 0.24;
  const frameMidY = deckY - frameH * 0.5;
  batcher.addBox(0, frameMidY, 0, d.width, frameH, length, {
    materialRole: 'secondary',
    layer: 'chassis'
  });
  // Side sill safety band
  trBodyAddLiveryStripe(batcher, halfW, frameMidY, -length * 0.49, length * 0.49, 0.09, 'livery');

  // Hazard chevrons on switcher end sills
  if (cfg.railLiveryPattern === 'hazard_switcher') {
    for (const endSign of [-1, 1]) {
      const ez = endSign * (length * 0.5 + 0.01);
      for (let i = -3; i <= 3; i++) {
        batcher.addBox(i * 0.36, frameMidY, ez, 0.18, frameH * 0.85, 0.02, {
          materialRole: (i & 1) === 0 ? 'livery' : 'primary',
          layer: 'detail'
        });
      }
    }
  }

  // 2. Front & Rear Snowplow Pilots + Corner Step Wells
  for (const endSign of [-1, 1]) {
    const endZ = endSign * (length * 0.5);
    const pilotTopY = deckY - frameH;
    const pilotBotY = Math.max(0.24, rz.zones.underbodyClearanceY - 0.04);
    const pilotH = Math.max(0.32, pilotTopY - pilotBotY);
    const pilotMidY = pilotBotY + pilotH * 0.5;

    if (!isSwitcher) {
      // V-shaped snowplow pilot blades
      for (const side of [-1, 1]) {
        batcher.addBox(side * (halfW * 0.36), pilotMidY, endZ - endSign * 0.08, halfW * 0.78, pilotH, 0.08, {
          rotY: -endSign * side * 0.38,
          materialRole: 'chassisDark',
          layer: 'chassis'
        });
      }
      // Central coupler pocket cutout reinforcement
      batcher.addBox(0, pilotMidY + 0.06, endZ - endSign * 0.18, 0.56, pilotH * 0.78, 0.18, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
    } else {
      // Switcher stepped end footboards
      batcher.addBox(0, pilotBotY + 0.08, endZ - endSign * 0.06, d.width * 0.88, 0.16, 0.16, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
    }

    // Corner boarding steps on both sides at front and rear
    for (const side of [-1, 1]) {
      const stepX = side * (halfW - 0.16);
      const stepZ = endZ - endSign * 0.34;
      batcher.addBox(stepX, deckY - 0.44, stepZ, 0.28, 0.05, 0.38, { materialRole: 'utility', layer: 'chassis' });
      batcher.addBox(stepX, deckY - 0.68, stepZ, 0.28, 0.05, 0.34, { materialRole: 'utility', layer: 'chassis' });
      batcher.addBox(side * (halfW - 0.02), deckY - 0.44, stepZ, 0.04, 0.52, 0.38, { materialRole: 'chassisDark', layer: 'chassis' });
    }
  }

  // 3. Underslung Diesel Fuel Tank & Air Reservoirs
  const ft = rz.zones.fuelTank;
  if (ft) {
    const ftH = Math.max(0.45, ft.topY - ft.bottomY);
    const ftMidY = ft.bottomY + ftH * 0.5;
    batcher.addBox(0, ftMidY, (ft.startZ + ft.endZ) * 0.5, ft.width, ftH, ft.length, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
    // Side fuel gauge sight glass & filler cap
    for (const side of [-1, 1]) {
      batcher.addBox(side * (ft.width * 0.5 + 0.02), ftMidY + 0.06, 0, 0.05, 0.22, ft.length * 0.72, {
        materialRole: 'utility',
        layer: 'chassis'
      });
      batcher.addCylinder(side * (ft.width * 0.42), ft.topY - 0.04, ft.startZ + 0.42, 0.15, 0.15, ft.length * 0.56, 10, 'z', 'utility', 'chassis');
    }
  }

  // 4. Short Nose (if present)
  if (loco.shortNose && loco.shortNose.length > 0.35) {
    const sn = loco.shortNose;
    const snLen = sn.length;
    const snMidZ = (sn.startZ + sn.endZ) * 0.5;
    const snTopY = loco.shortNoseRoofY;
    const snH = Math.max(0.9, snTopY - deckY);
    const noseW = cfg.railNoseSlope === 'flat_switcher' ? loco.hoodWidth : d.width * 0.92;
    const noseHalfW = noseW * 0.5;

    batcher.addLoftedSlices([
      {
        z: sn.startZ,
        bottomY: deckY,
        beltY: lerp(deckY, snTopY, 0.7),
        topY: snTopY,
        hwBottom: noseHalfW,
        hwBelt: noseHalfW,
        hwTop: noseHalfW * 0.88,
        chamferBot: 0.02,
        chamferTop: 0.1
      },
      {
        z: sn.endZ,
        bottomY: deckY,
        beltY: lerp(deckY, snTopY - 0.08, 0.72),
        topY: snTopY - (cfg.railNoseSlope === 'low_sloped' ? 0.14 : 0.04),
        hwBottom: noseHalfW * 0.96,
        hwBelt: noseHalfW * 0.96,
        hwTop: noseHalfW * 0.82,
        chamferBot: 0.02,
        chamferTop: 0.12
      }
    ], 'primary', 'body');

    // Nose side stripes & front nose door
    trBodyAddLiveryStripe(batcher, noseHalfW * 0.96, deckY + snH * 0.5, sn.startZ + 0.08, sn.endZ - 0.08, 0.18, 'livery');
    batcher.addBox(0, deckY + snH * 0.46, sn.endZ + 0.015, 0.58, snH * 0.74, 0.03, {
      materialRole: 'secondary',
      layer: 'detail'
    });
    // Anti-climber nose rib
    batcher.addBox(0, deckY + 0.06, sn.endZ + 0.06, noseW * 0.92, 0.11, 0.12, {
      materialRole: 'utility',
      layer: 'chassis'
    });
  }

  // 5. Locomotive Cab
  if (loco.cab) {
    const cab = loco.cab;
    const cabLen = cab.length;
    const cabMidZ = (cab.startZ + cab.endZ) * 0.5;
    const cabTopY = loco.cabRoofY;
    const cabH = Math.max(1.8, cabTopY - deckY);
    const cabW = d.width * 0.96;
    const cabHalfW = cabW * 0.5;
    const cabShoulderY = cabTopY - 0.26;
    const cabFloorThick = 0.12;

    // Lower cab body below window belt
    const winBotY = Math.max(loco.shortNoseRoofY + 0.04, deckY + cabH * 0.48);
    const winTopY = cabShoulderY - 0.1;
    const lowerCabH = winBotY - deckY;
    batcher.addBox(0, deckY + lowerCabH * 0.5, cabMidZ, cabW, lowerCabH, cabLen, {
      materialRole: 'primary',
      layer: 'body'
    });

    // Cab corner & center pillars framing windows
    const pThick = 0.18;
    const winH = Math.max(0.45, winTopY - winBotY);
    const winMidY = (winBotY + winTopY) * 0.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        batcher.addBox(sx * (cabHalfW - pThick * 0.5), winMidY, cabMidZ + sz * (cabLen * 0.5 - pThick * 0.5), pThick, winH + 0.04, pThick, {
          materialRole: 'primary',
          layer: 'body'
        });
      }
      // Side window vertical mullion
      batcher.addBox(sx * (cabHalfW - 0.04), winMidY, cabMidZ, 0.09, winH, 0.14, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
    // Center front/rear windshield mullions
    for (const sz of [-1, 1]) {
      batcher.addBox(0, winMidY, cabMidZ + sz * (cabLen * 0.5 - 0.05), 0.14, winH, 0.1, {
        materialRole: 'primary',
        layer: 'body'
      });
    }

    // Cab ceiling / pitched roof crown
    batcher.addLoftedSlices([
      {
        z: cab.startZ,
        bottomY: winTopY,
        beltY: cabShoulderY,
        topY: cabTopY,
        hwBottom: cabHalfW,
        hwBelt: cabHalfW,
        hwTop: cabHalfW * 0.72,
        chamferBot: 0.01,
        chamferTop: 0.12
      },
      {
        z: cab.endZ,
        bottomY: winTopY,
        beltY: cabShoulderY,
        topY: cabTopY,
        hwBottom: cabHalfW,
        hwBelt: cabHalfW,
        hwTop: cabHalfW * 0.72,
        chamferBot: 0.01,
        chamferTop: 0.12
      }
    ], 'primary', 'body');

    // Roof secondary paint cap & cab sun visors
    batcher.addBox(0, cabTopY - 0.02, cabMidZ, cabW * 0.7, 0.07, cabLen * 0.94, {
      materialRole: 'secondary',
      layer: 'body'
    });
    for (const sz of [-1, 1]) {
      batcher.addBox(0, winTopY + 0.03, cabMidZ + sz * (cabLen * 0.5 + 0.09), cabW * 0.88, 0.04, 0.2, {
        rotX: sz * 0.2,
        materialRole: 'trim',
        layer: 'detail'
      });
    }

    // Cab glazing (translucent when interior enabled so control desk shows)
    const cabGlassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';
    for (const sz of [-1, 1]) {
      const wz = cabMidZ + sz * (cabLen * 0.5 - 0.02);
      for (const sx of [-1, 1]) {
        trBodyAddWindowPane(batcher, sx * (cabHalfW * 0.48), winMidY, wz, cabHalfW * 0.68, winH * 0.84, 0.04, cabGlassRole);
      }
    }
    for (const sx of [-1, 1]) {
      const wx = sx * (cabHalfW - 0.03);
      for (const subZ of [-cabLen * 0.22, cabLen * 0.22]) {
        trBodyAddWindowPane(batcher, wx, winMidY, cabMidZ + subZ, 0.04, winH * 0.84, cabLen * 0.32, cabGlassRole);
      }
    }

    // Cab side livery stripe
    trBodyAddLiveryStripe(batcher, cabHalfW, deckY + lowerCabH * 0.58, cab.startZ + 0.04, cab.endZ - 0.04, 0.18, 'livery');

    // Simplified Engineer Cab Interior (control desk + 2 seats)
    if (cfg.railInteriorEnabled) {
      batcher.addBox(0, deckY + cabFloorThick * 0.5, cabMidZ, cabW * 0.86, cabFloorThick, cabLen * 0.86, {
        materialRole: 'interiorDark',
        layer: 'interior'
      });
      batcher.addBox(0.45, deckY + 0.52, cabMidZ + (loco.cabPosition === 'rear' ? 0.55 : 0.45), 0.78, 0.72, 0.52, {
        materialRole: 'trim',
        layer: 'interior'
      });
      for (const sx of [-0.55, 0.55]) {
        batcher.addBox(sx, deckY + 0.48, cabMidZ - 0.25, 0.44, 0.14, 0.42, { materialRole: 'secondary', layer: 'interior' });
        batcher.addBox(sx, deckY + 0.82, cabMidZ - 0.42, 0.42, 0.56, 0.1, { materialRole: 'secondary', layer: 'interior' });
      }
    }
  }

  // 6. Narrower Long Engine Hood with Walkways, Louver Grilles, Exhausts & Radiator Fans
  if (loco.longHood && loco.longHood.length > 0.5) {
    const lh = loco.longHood;
    const lhLen = lh.length;
    const lhMidZ = (lh.startZ + lh.endZ) * 0.5;
    const hoodW = loco.hoodWidth;
    const hoodHalfW = hoodW * 0.5;
    const hoodTopY = loco.longHoodRoofY;
    const hoodH = hoodTopY - deckY;

    batcher.addLoftedSlices([
      {
        z: lh.startZ,
        bottomY: deckY,
        beltY: lerp(deckY, hoodTopY, 0.8),
        topY: hoodTopY,
        hwBottom: hoodHalfW,
        hwBelt: hoodHalfW,
        hwTop: hoodHalfW * 0.78,
        chamferBot: 0.01,
        chamferTop: 0.14
      },
      {
        z: lh.endZ,
        bottomY: deckY,
        beltY: lerp(deckY, hoodTopY, 0.8),
        topY: hoodTopY,
        hwBottom: hoodHalfW,
        hwBelt: hoodHalfW,
        hwTop: hoodHalfW * 0.78,
        chamferBot: 0.01,
        chamferTop: 0.14
      }
    ], 'primary', 'body');

    // Dynamic brake blister on road-switcher hood
    if (!isSwitcher && lhLen > 3.2) {
      const dbZ = lerp(lh.startZ, lh.endZ, loco.cabPosition === 'forward' ? 0.74 : 0.35);
      batcher.addBox(0, hoodTopY - 0.48, dbZ, hoodW + 0.24, 0.62, Math.min(2.4, lhLen * 0.32), {
        materialRole: 'primary',
        layer: 'body'
      });
    }

    // Engine hood side livery band
    trBodyAddLiveryStripe(batcher, hoodHalfW, deckY + hoodH * 0.42, lh.startZ + 0.1, lh.endZ - 0.1, 0.18, 'livery');

    // Engine compartment door seams & upper side radiator intake grilles
    const bays = Math.max(3, Math.floor(lhLen / 1.15));
    for (let i = 0; i < bays; i++) {
      const bz = lerp(lh.startZ + 0.55, lh.endZ - 0.55, i / Math.max(1, bays - 1));
      for (const side of [-1, 1]) {
        batcher.addBox(side * (hoodHalfW + 0.01), deckY + hoodH * 0.36, bz, 0.018, hoodH * 0.58, 0.04, {
          materialRole: 'trim',
          layer: 'detail'
        });
        if (i < 2 || (isSwitcher && i === 0)) {
          // Dark louvered radiator grille panels near rear/radiator end
          batcher.addBox(side * (hoodHalfW + 0.012), hoodTopY - 0.58, bz, 0.025, 0.64, 0.82, {
            materialRole: 'chassisDark',
            layer: 'detail'
          });
        }
      }
    }

    // Front/Rear radiator end screen
    const radEndZ = loco.cabPosition === 'rear' ? lh.endZ + 0.015 : lh.startZ - 0.015;
    batcher.addBox(0, deckY + hoodH * 0.55, radEndZ, hoodW * 0.68, hoodH * 0.52, 0.03, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });

    // Roof radiator fans & diesel exhaust stacks
    if (cfg.railRoofEquipment === 'diesel_radiator') {
      const fanCount = isSwitcher ? 1 : 3;
      const fanDir = loco.cabPosition === 'rear' ? 0.72 : 0.24;
      for (let f = 0; f < fanCount; f++) {
        const fz = lerp(lh.startZ + 0.9, lh.endZ - 0.9, clamp(fanDir + f * 0.13, 0.12, 0.88));
        batcher.addCylinder(0, hoodTopY + 0.08, fz, 0.48, 0.52, 0.16, 12, 'y', 'secondary', 'detail');
        batcher.addCylinder(0, hoodTopY + 0.165, fz, 0.39, 0.39, 0.03, 12, 'y', 'chassisDark', 'detail');
      }
    }

    const exhCount = clamp(Math.round(cfg.railExhaustCount), 0, 3);
    for (let e = 0; e < exhCount; e++) {
      const ez = lerp(lh.startZ + 1.2, lh.endZ - 1.2, clamp(0.48 + e * 0.15, 0.2, 0.85));
      batcher.addCylinder(0, hoodTopY + 0.14, ez, 0.11, 0.13, 0.28, 10, 'y', 'chassisDark', 'detail');
    }
  }

  // 7. Walkway Safety Handrails & End Stanchions
  if (cfg.railHandrails) {
    const railX = halfW - 0.06;
    const endZ = length * 0.5 - 0.06;
    for (const side of [-1, 1]) {
      // Side walkway safety rails (broken around full-width cab)
      if (loco.cab) {
        const rearLen = loco.cab.startZ - (-endZ);
        if (rearLen > 0.6) {
          trBodyAddHandrailSpan(batcher, side * railX, deckY, -endZ, side * railX, deckY, loco.cab.startZ - 0.06);
        }
        const frontLen = endZ - loco.cab.endZ;
        if (frontLen > 0.6) {
          trBodyAddHandrailSpan(batcher, side * railX, deckY, loco.cab.endZ + 0.06, side * railX, deckY, endZ);
        }
      } else {
        trBodyAddHandrailSpan(batcher, side * railX, deckY, -endZ, side * railX, deckY, endZ);
      }

      // End platform railings leaving central gangway gap
      trBodyAddHandrailSpan(batcher, side * railX, deckY, endZ, side * 0.48, deckY, endZ, 'livery', 'utility', 0.5);
      trBodyAddHandrailSpan(batcher, side * railX, deckY, -endZ, side * 0.48, deckY, -endZ, 'livery', 'utility', 0.5);
    }
  }

  return { doors: [] };
}

function trBodyBuildBoxcar(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const box = rz.zones.boxcar;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const eavesY = box.eavesY;
  const halfW = d.halfWidth;
  const wallH = eavesY - deckY;
  const doorW = box.doorWidth;
  const halfDoorW = doorW * 0.5;
  const bodyLen = box.bodyEndZ - box.bodyStartZ;

  // Underframe center sill, bolsters, end sills & air brake cylinder
  batcher.addBox(0, deckY - 0.14, 0, 0.42, 0.28, d.length, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const bogie of rz.bogies) {
    batcher.addBox(0, deckY - 0.12, bogie.pivotZ, d.width * 0.9, 0.18, 0.34, { materialRole: 'chassisDark', layer: 'chassis' });
  }
  for (const endSign of [-1, 1]) {
    batcher.addBox(0, deckY - 0.12, endSign * (d.length * 0.5 - 0.14), d.width, 0.24, 0.28, {
      materialRole: 'primary',
      layer: 'chassis'
    });
    for (const side of [-1, 1]) {
      trBodyAddStirrupStep(batcher, side * (halfW - 0.08), deckY, endSign * (d.length * 0.5 - 0.46));
    }
  }
  batcher.addCylinder(0.45, deckY - 0.24, 1.4, 0.16, 0.16, 0.85, 10, 'z', 'chassisDark', 'chassis');

  // Interior timber floor deck & dark inner shell (visible when sliding door opens)
  batcher.addBox(0, deckY + 0.04, 0, d.width - 0.16, 0.08, bodyLen - 0.12, {
    materialRole: 'secondary',
    layer: 'interior'
  });
  batcher.addBox(0, deckY + wallH * 0.5, 0, d.width - 0.34, wallH - 0.12, bodyLen - 0.24, {
    materialRole: 'interiorDark',
    layer: 'interior'
  });

  // Interior freight crates visible through open door
  const crateRng = rng32((cfg.seed || 7421) + 33);
  for (let c = 0; c < 3; c++) {
    const cz = -0.8 + c * 0.82;
    const cw = 0.72 + crateRng() * 0.35;
    const ch = 0.68 + crateRng() * 0.55;
    batcher.addBox((c % 2 === 0 ? -0.32 : 0.28), deckY + 0.08 + ch * 0.5, cz, cw, ch, 0.68, {
      materialRole: c === 1 ? 'livery' : 'utility',
      layer: 'interior'
    });
  }

  // Split side walls around center sliding doorway + overhead header lintel
  const segThickness = 0.14;
  const sideWallX = halfW - segThickness * 0.5;
  const rearSegLen = Math.max(0.5, -halfDoorW - box.bodyStartZ);
  const rearSegZ = (box.bodyStartZ - halfDoorW) * 0.5;
  const frontSegLen = Math.max(0.5, box.bodyEndZ - halfDoorW);
  const frontSegZ = (box.bodyEndZ + halfDoorW) * 0.5;
  const headerH = 0.28;

  for (const side of [-1, 1]) {
    const sx = side * sideWallX;
    batcher.addBox(sx, deckY + wallH * 0.5, rearSegZ, segThickness, wallH, rearSegLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(sx, deckY + wallH * 0.5, frontSegZ, segThickness, wallH, frontSegLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    // Header lintel above doorway
    batcher.addBox(sx, eavesY - headerH * 0.5, 0, segThickness, headerH, doorW, {
      materialRole: 'primary',
      layer: 'body'
    });
    // Door upper & lower guide rails spanning doorway + slide zone
    batcher.addBox(side * (halfW + 0.03), eavesY - 0.12, halfDoorW * 0.65, 0.07, 0.08, doorW * 1.95, {
      materialRole: 'trim',
      layer: 'detail'
    });
    batcher.addBox(side * (halfW + 0.03), deckY + 0.06, halfDoorW * 0.65, 0.07, 0.08, doorW * 1.95, {
      materialRole: 'trim',
      layer: 'detail'
    });
  }

  // Exterior structural steel side posts & corrugated end walls
  for (const zSpan of [[box.bodyStartZ + 0.18, -halfDoorW - 0.14], [halfDoorW + 0.14, box.bodyEndZ - 0.18]]) {
    const ribCount = 5;
    for (let i = 0; i < ribCount; i++) {
      const rzPos = lerp(zSpan[0], zSpan[1], i / (ribCount - 1));
      for (const side of [-1, 1]) {
        batcher.addBox(side * (halfW + 0.018), deckY + wallH * 0.5, rzPos, 0.055, wallH - 0.06, 0.09, {
          materialRole: 'primary',
          layer: 'body'
        });
      }
    }
  }

  // End walls with horizontal corrugation ribs
  for (const endSign of [-1, 1]) {
    const ez = endSign * (d.length * 0.5 - 0.34);
    batcher.addBox(0, deckY + wallH * 0.5, ez, d.width - 0.08, wallH, 0.16, {
      materialRole: 'primary',
      layer: 'body'
    });
    for (let rIdx = 0; rIdx < 6; rIdx++) {
      const ry = lerp(deckY + 0.35, eavesY - 0.25, rIdx / 5);
      batcher.addBox(0, ry, ez + endSign * 0.09, d.width - 0.24, 0.09, 0.04, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
  }

  // Pitched steel boxcar roof & roofwalk
  batcher.addLoftedSlices([
    { z: box.bodyStartZ, bottomY: eavesY - 0.02, beltY: eavesY + 0.05, topY: bodyTopY, hwBottom: halfW + 0.02, hwBelt: halfW * 0.6, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.02 },
    { z: box.bodyEndZ, bottomY: eavesY - 0.02, beltY: eavesY + 0.05, topY: bodyTopY, hwBottom: halfW + 0.02, hwBelt: halfW * 0.6, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.02 }
  ], 'secondary', 'body');

  if (cfg.railRoofEquipment === 'roofwalk_only' || cfg.railRoofEquipment === 'diesel_radiator') {
    batcher.addBox(0, bodyTopY + 0.045, 0, 0.72, 0.05, bodyLen + 0.24, {
      materialRole: 'utility',
      layer: 'detail'
    });
  }

  // Side livery belt stripe
  if (cfg.railLiveryPattern !== 'solid') {
    trBodyAddLiveryStripe(batcher, halfW, deckY + wallH * 0.72, box.bodyStartZ + 0.1, -halfDoorW - 0.04, 0.16, 'livery');
    trBodyAddLiveryStripe(batcher, halfW, deckY + wallH * 0.72, halfDoorW + 0.04, box.bodyEndZ - 0.1, 0.16, 'livery');
  }

  // Ladders & B-end handbrake wheel
  if (cfg.railHandrails) {
    trBodyAddSideLadder(batcher, -1, -halfW, deckY + 0.08, eavesY - 0.06, box.bodyStartZ + 0.35);
    trBodyAddSideLadder(batcher, 1, halfW, deckY + 0.08, eavesY - 0.06, box.bodyEndZ - 0.35);
  }
  trBodyAddHandbrakeWheel(batcher, -0.58, deckY + wallH * 0.56, box.bodyStartZ - 0.12);

  // Articulated Sliding Boxcar Doors (Left & Right)
  const doorGroups = [];
  const doorH = Math.max(1.2, wallH - headerH - 0.06);
  const doorMidY = deckY + 0.04 + doorH * 0.5;
  for (const dr of rz.doors) {
    const grp = new THREE.Group();
    grp.name = `Door_${dr.id}`;
    const dBatch = new VehicleBatcher();
    const dx = dr.side * (halfW + 0.018);

    dBatch.addBox(dx, doorMidY, dr.z, 0.065, doorH, dr.width, {
      materialRole: 'primary',
      layer: 'body'
    });
    // Door structural ribs & central lock rod
    for (let r = -2; r <= 2; r++) {
      dBatch.addBox(dx + dr.side * 0.032, doorMidY, dr.z + r * (dr.width * 0.2), 0.028, doorH * 0.92, 0.08, {
        materialRole: 'secondary',
        layer: 'detail'
      });
    }
    dBatch.addBox(dx + dr.side * 0.042, doorMidY - 0.1, dr.z - dr.width * 0.36, 0.04, doorH * 0.5, 0.05, {
      materialRole: 'utility',
      layer: 'detail'
    });
    if (cfg.railLiveryPattern !== 'solid') {
      dBatch.addBox(dx + dr.side * 0.038, deckY + wallH * 0.72, dr.z, 0.02, 0.16, dr.width * 0.96, {
        materialRole: 'livery',
        layer: 'body'
      });
    }

    dBatch.finalize(grp, materialBundle);
    grp.userData = {
      pivotType: 'door',
      doorId: dr.id,
      basePos: [0, 0, 0],
      slideVector: [0, 0, dr.slideDir * dr.maxSlide]
    };
    rootGroup.add(grp);
    doorGroups.push(grp);
  }

  return { doors: doorGroups };
}

function trBodyAddShippingContainer(batcher, cx, baseY, cz, w, h, len, bodyRole, accentRole) {
  batcher.addBox(cx, baseY + h * 0.5, cz, w, h, len, {
    materialRole: bodyRole,
    layer: 'body'
  });
  // Corrugated vertical ribs along container sides
  const ribCount = Math.max(6, Math.floor(len / 0.62));
  for (let i = 0; i < ribCount; i++) {
    const rz = lerp(cz - len * 0.44, cz + len * 0.44, i / (ribCount - 1));
    for (const side of [-1, 1]) {
      batcher.addBox(cx + side * (w * 0.5 + 0.012), baseY + h * 0.5, rz, 0.03, h * 0.88, 0.09, {
        materialRole: bodyRole,
        layer: 'body'
      });
    }
  }
  // Corner castings & twist-lock pillars
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batcher.addBox(cx + sx * (w * 0.5 - 0.04), baseY + h * 0.5, cz + sz * (len * 0.5 - 0.04), 0.12, h + 0.02, 0.12, {
        materialRole: accentRole,
        layer: 'detail'
      });
    }
  }
  // End double-door locking bars
  for (const bx of [-0.36, -0.14, 0.14, 0.36]) {
    batcher.addBox(cx + bx, baseY + h * 0.5, cz + len * 0.5 + 0.015, 0.035, h * 0.86, 0.028, {
      materialRole: 'utility',
      layer: 'detail'
    });
  }
}

function trBodyBuildFlatcar(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const fc = rz.zones.flatcar;
  const deckY = rz.zones.deckY;
  const halfW = d.halfWidth;
  const r = rng32((cfg.seed || 3090) + 19);

  // Heavy side sills + timber/steel planked deck
  batcher.addBox(0, deckY - 0.11, 0, d.width, 0.24, d.length, {
    materialRole: 'primary',
    layer: 'chassis'
  });
  batcher.addBox(0, fc.deckTopY - 0.025, 0, d.width - 0.14, 0.05, d.length - 0.24, {
    materialRole: 'secondary',
    layer: 'body'
  });

  // Iconic tapered Fishbelly Center Sill between bogies
  const fbStart = rz.bogies[1].pivotZ + rz.bogies[1].wheelbase * 0.55;
  const fbEnd = rz.bogies[0].pivotZ - rz.bogies[0].wheelbase * 0.55;
  if (fbEnd - fbStart > 2.0) {
    batcher.addLoftedSlices([
      { z: fbStart, bottomY: deckY - 0.24, beltY: deckY - 0.14, topY: deckY - 0.04, hwBottom: 0.24, hwBelt: 0.28, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.01 },
      { z: lerp(fbStart, fbEnd, 0.18), bottomY: deckY - 0.58, beltY: deckY - 0.28, topY: deckY - 0.04, hwBottom: 0.24, hwBelt: 0.28, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.01 },
      { z: lerp(fbStart, fbEnd, 0.82), bottomY: deckY - 0.58, beltY: deckY - 0.28, topY: deckY - 0.04, hwBottom: 0.24, hwBelt: 0.28, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.01 },
      { z: fbEnd, bottomY: deckY - 0.24, beltY: deckY - 0.14, topY: deckY - 0.04, hwBottom: 0.24, hwBelt: 0.28, hwTop: 0.28, chamferBot: 0.01, chamferTop: 0.01 }
    ], 'chassisDark', 'chassis');
  }

  // Side stake pockets & corner stirrups
  const pocketCount = Math.max(6, Math.floor(d.length / 1.5));
  for (let i = 0; i < pocketCount; i++) {
    const pz = lerp(-d.length * 0.45, d.length * 0.45, i / (pocketCount - 1));
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW + 0.03), deckY - 0.09, pz, 0.07, 0.18, 0.11, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
  }
  for (const endSign of [-1, 1]) {
    for (const side of [-1, 1]) {
      trBodyAddStirrupStep(batcher, side * (halfW - 0.08), deckY, endSign * (d.length * 0.5 - 0.4));
    }
  }
  trBodyAddHandbrakeWheel(batcher, -halfW + 0.28, deckY + 0.26, -d.length * 0.5 + 0.1);

  // Deterministic Procedural Cargo
  const cargoType = cfg.railCargoType || 'containers_double_20';
  const maxW = fc.cargoMaxW;
  const maxL = fc.cargoMaxL;
  const maxH = Math.max(1.2, fc.cargoMaxTopY - fc.deckTopY);

  if (cargoType === 'containers_double_20') {
    const cLen = Math.min(6.05, (maxL - 0.5) * 0.5);
    const cW = Math.min(2.44, maxW);
    const cH = Math.min(2.55, maxH);
    const gap = 0.26;
    const zRear = -(cLen * 0.5 + gap * 0.5);
    const zFront = cLen * 0.5 + gap * 0.5;
    trBodyAddShippingContainer(batcher, 0, fc.deckTopY, zFront, cW, cH, cLen, 'livery', 'chassisDark');
    trBodyAddShippingContainer(batcher, 0, fc.deckTopY, zRear, cW, cH, cLen, 'secondary', 'chassisDark');
  } else if (cargoType === 'container_40') {
    const cLen = Math.min(12.15, maxL - 0.25);
    const cW = Math.min(2.44, maxW);
    const cH = Math.min(2.58, maxH);
    trBodyAddShippingContainer(batcher, 0, fc.deckTopY, 0, cW, cH, cLen, 'livery', 'chassisDark');
  } else if (cargoType === 'lumber_stack') {
    const stackW = Math.min(2.35, maxW - 0.18);
    const stackL = Math.min(maxL - 0.6, d.length * 0.82);
    const rows = 3;
    const bundleH = 0.54;
    for (let row = 0; row < rows; row++) {
      const by = fc.deckTopY + 0.08 + row * (bundleH + 0.07) + bundleH * 0.5;
      batcher.addBox(0, by, 0, stackW, bundleH, stackL, {
        materialRole: row % 2 === 0 ? 'livery' : 'secondary',
        layer: 'body'
      });
      // Tie-down straps & dunnage cross-bars
      for (let s = -2; s <= 2; s++) {
        batcher.addBox(0, by, s * (stackL * 0.21), stackW + 0.04, bundleH + 0.06, 0.06, {
          materialRole: 'chassisDark',
          layer: 'detail'
        });
      }
    }
    // Upright steel stakes in side pockets
    for (let i = 0; i < 4; i++) {
      const sz = lerp(-stackL * 0.44, stackL * 0.44, i / 3);
      for (const side of [-1, 1]) {
        batcher.addBox(side * (stackW * 0.5 + 0.08), fc.deckTopY + 1.05, sz, 0.08, 2.1, 0.08, {
          materialRole: 'utility',
          layer: 'detail'
        });
      }
    }
  } else if (cargoType === 'steel_pipes') {
    const pipeLen = Math.min(maxL - 0.7, d.length * 0.8);
    const pipeR = 0.26;
    const cols = [[-0.65, -0.02], [0, -0.02], [0.65, -0.02], [-0.33, 0.44], [0.33, 0.44], [0, 0.9]];
    for (const [px, pyOff] of cols) {
      batcher.addCylinder(px, fc.deckTopY + pipeR + 0.08 + pyOff, 0, pipeR, pipeR, pipeLen, 10, 'z', 'utility', 'body');
      batcher.addCylinder(px, fc.deckTopY + pipeR + 0.08 + pyOff, 0, pipeR * 0.74, pipeR * 0.74, pipeLen + 0.015, 10, 'z', 'chassisDark', 'detail');
    }
    for (let i = 0; i < 4; i++) {
      const sz = lerp(-pipeLen * 0.42, pipeLen * 0.42, i / 3);
      batcher.addBox(0, fc.deckTopY + 0.06, sz, maxW - 0.1, 0.12, 0.14, { materialRole: 'secondary', layer: 'detail' });
      for (const side of [-1, 1]) {
        batcher.addBox(side * (maxW * 0.46), fc.deckTopY + 0.78, sz, 0.08, 1.56, 0.08, { materialRole: 'livery', layer: 'detail' });
      }
    }
  } else if (cargoType === 'crates_machinery') {
    const crateCount = 4;
    const span = maxL * 0.82;
    for (let i = 0; i < crateCount; i++) {
      const cz = lerp(-span * 0.38, span * 0.38, i / (crateCount - 1));
      const cw = 1.45 + r() * 0.65;
      const ch = 1.15 + r() * 0.85;
      const cl = 1.65 + r() * 0.85;
      batcher.addBox(0, fc.deckTopY + ch * 0.5, cz, cw, ch, cl, {
        materialRole: i === 1 ? 'livery' : (i === 2 ? 'utility' : 'secondary'),
        layer: 'body'
      });
      batcher.addBox(0, fc.deckTopY + ch + 0.02, cz, cw * 0.92, 0.05, cl * 0.92, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
  }

  return { doors: [] };
}

function trBodyBuildTankCar(batcher, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const tk = rz.zones.tank;
  const deckY = rz.zones.deckY;
  const halfW = d.halfWidth;

  // Stub/frame sills & end walkways
  batcher.addBox(0, deckY - 0.12, 0, 0.46, 0.24, d.length, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    const ez = endSign * (d.length * 0.5 - 0.45);
    batcher.addBox(0, deckY - 0.06, ez, d.width, 0.16, 0.9, { materialRole: 'primary', layer: 'chassis' });
    batcher.addBox(0, deckY + 0.04, ez, d.width * 0.92, 0.05, 0.72, { materialRole: 'utility', layer: 'detail' });
    for (const side of [-1, 1]) {
      trBodyAddStirrupStep(batcher, side * (halfW - 0.08), deckY, endSign * (d.length * 0.5 - 0.28));
    }
  }

  // Curved cradle saddles over both bogies holding the cylindrical barrel
  for (const bogie of rz.bogies) {
    batcher.addBox(0, deckY + 0.16, bogie.pivotZ, tk.radius * 1.48, 0.42, 0.58, {
      materialRole: 'secondary',
      layer: 'chassis'
    });
  }

  // Horizontal cylindrical pressure tank + stepped dome caps
  const barrelMidY = tk.centerY;
  const barrelLen = tk.barrelLength;
  batcher.addCylinder(0, barrelMidY, 0, tk.radius, tk.radius, barrelLen, 16, 'z', 'primary', 'body');

  for (const endSign of [-1, 1]) {
    const capBaseZ = endSign * (barrelLen * 0.5);
    const addDomeRing = (zOffset, len, rInner, rOuter, matRole) => {
      const rTop = endSign > 0 ? rOuter : rInner;
      const rBot = endSign > 0 ? rInner : rOuter;
      batcher.addCylinder(0, barrelMidY, capBaseZ + endSign * zOffset, rTop, rBot, len, 16, 'z', matRole, 'body');
    };
    addDomeRing(0.14, 0.28, tk.radius * 0.99, tk.radius * 0.8, 'primary');
    addDomeRing(0.34, 0.16, tk.radius * 0.8, tk.radius * 0.46, 'primary');
    addDomeRing(0.43, 0.06, tk.radius * 0.46, tk.radius * 0.24, 'secondary');
  }

  // Center hazard / livery stripe band wrapped around tank barrel
  if (cfg.railLiveryPattern !== 'solid') {
    batcher.addCylinder(0, barrelMidY, 0, tk.radius + 0.015, tk.radius + 0.015, 0.72, 16, 'z', 'livery', 'body');
  }
  // Tank support band rings
  for (const bogie of rz.bogies) {
    batcher.addCylinder(0, barrelMidY, bogie.pivotZ, tk.radius + 0.02, tk.radius + 0.02, 0.12, 16, 'z', 'chassisDark', 'detail');
  }

  // Top central Manway Dome, relief valve stack & grated catwalk
  const tankTopY = barrelMidY + tk.radius;
  batcher.addCylinder(0, tankTopY + 0.14, 0, 0.48, 0.52, 0.28, 12, 'y', 'secondary', 'detail');
  batcher.addCylinder(0, tankTopY + 0.31, 0, 0.38, 0.38, 0.06, 12, 'y', 'utility', 'detail');
  batcher.addCylinder(0.18, tankTopY + 0.36, 0.15, 0.07, 0.09, 0.18, 8, 'y', 'livery', 'detail');

  if (cfg.railRoofEquipment === 'tank_catwalk' || cfg.railRoofEquipment === 'diesel_radiator') {
    batcher.addBox(0, tankTopY + 0.04, 0, 0.68, 0.05, Math.min(4.4, barrelLen * 0.52), {
      materialRole: 'utility',
      layer: 'detail'
    });
    if (cfg.railHandrails) {
      for (const side of [-1, 1]) {
        trBodyAddHandrailSpan(batcher, side * 0.38, tankTopY - 0.16, -1.75, side * 0.38, tankTopY - 0.16, 1.75, 'livery', 'utility', 0.85);
      }
    }
  }

  // Bottom discharge valve manifold & side vertical access ladders
  batcher.addCylinder(0, barrelMidY - tk.radius - 0.12, 0, 0.14, 0.14, 0.26, 8, 'y', 'utility', 'chassis');
  if (cfg.railHandrails) {
    for (const side of [-1, 1]) {
      trBodyAddSideLadder(batcher, side, side * tk.radius, deckY, tankTopY + 0.04, 0, 0.42);
      const endZ = d.length * 0.5 - 0.12;
      trBodyAddHandrailSpan(batcher, side * (halfW - 0.06), deckY, endZ, side * 0.48, deckY, endZ, 'livery', 'utility', 0.5);
    }
  }
  trBodyAddHandbrakeWheel(batcher, -halfW + 0.32, deckY + 0.36, -d.length * 0.5 + 0.08);

  return { doors: [] };
}

function trBodyBuildPassengerCoach(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const pax = rz.zones.passenger;
  const deckY = rz.zones.deckY;
  const bodyTopY = rz.zones.bodyTopY;
  const eavesY = pax.eavesY;
  const halfW = d.halfWidth;
  const wallThick = 0.13;
  const wallX = halfW - wallThick * 0.5;
  const bodyLen = pax.bodyEndZ - pax.bodyStartZ;

  // 1. Underframe floor & equipment skirts/boxes between bogies
  batcher.addBox(0, deckY - 0.08, 0, d.width - 0.04, 0.16, bodyLen, {
    materialRole: 'secondary',
    layer: 'chassis'
  });

  const equipStart = rz.bogies[1].pivotZ + rz.bogies[1].wheelbase * 0.55 + 0.45;
  const equipEnd = rz.bogies[0].pivotZ - rz.bogies[0].wheelbase * 0.55 - 0.45;
  if (equipEnd - equipStart > 1.8) {
    const equipSpan = equipEnd - equipStart;
    const boxCount = Math.max(3, Math.floor(equipSpan / 2.2));
    for (let i = 0; i < boxCount; i++) {
      const bz = lerp(equipStart + 0.75, equipEnd - 0.75, i / Math.max(1, boxCount - 1));
      batcher.addBox(0, deckY - 0.42, bz, d.width * 0.76, 0.52, Math.min(1.65, equipSpan / (boxCount + 0.4)), {
        materialRole: i % 2 === 0 ? 'chassisDark' : 'secondary',
        layer: 'chassis'
      });
    }
  }

  // 2. Vestibule door pockets, boarding steps & end corner walls
  const doorOffset = pax.doorOffsetZ;
  const halfDoorW = pax.doorWidth * 0.5;
  const lowerWallH = pax.windowSillY - deckY;
  const winH = pax.windowTopY - pax.windowSillY;
  const upperBandH = eavesY - pax.windowTopY;
  const doorTopY = deckY + 0.04 + pax.doorHeight;

  for (const side of [-1, 1]) {
    const sx = side * wallX;
    // Lower skirt & sill wall along saloon only (open at doorways)
    const saloonWallLen = pax.saloonEndZ - pax.saloonStartZ + 0.72;
    batcher.addBox(sx, deckY + lowerWallH * 0.5, 0, wallThick, lowerWallH, saloonWallLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    // Upper frieze header spanning full body length above doors & windows
    batcher.addBox(sx, eavesY - upperBandH * 0.5, 0, wallThick, upperBandH, bodyLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    // End corner body walls beyond vestibule doors
    const cornerLen = Math.max(0.28, pax.bodyEndZ - (doorOffset + halfDoorW));
    for (const endSign of [-1, 1]) {
      const cz = endSign * (doorOffset + halfDoorW + cornerLen * 0.5);
      batcher.addBox(sx, (deckY + eavesY) * 0.5, cz, wallThick, eavesY - deckY, cornerLen, {
        materialRole: 'primary',
        layer: 'body'
      });
      // Door header lintel
      batcher.addBox(sx, (doorTopY + eavesY) * 0.5, endSign * doorOffset, wallThick, Math.max(0.08, eavesY - doorTopY), pax.doorWidth, {
        materialRole: 'primary',
        layer: 'body'
      });
      // Entry boarding step plate inside vestibule
      batcher.addBox(side * (halfW - 0.18), deckY - 0.14, endSign * doorOffset, 0.34, 0.06, pax.doorWidth * 0.92, {
        materialRole: 'utility',
        layer: 'chassis'
      });
    }
  }

  // 3. Coach End Walls & Gangways
  for (const endSign of [-1, 1]) {
    const ez = endSign * (pax.bodyEndZ - 0.08);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - 0.42), (deckY + eavesY) * 0.5, ez, 0.82, eavesY - deckY, 0.16, {
        materialRole: 'primary',
        layer: 'body'
      });
    }
    batcher.addBox(0, eavesY - 0.25, ez, d.width - 0.1, 0.5, 0.16, { materialRole: 'primary', layer: 'body' });
    if (cfg.railGangways) {
      buildRailEndGangway(batcher, endSign * pax.bodyEndZ, endSign, deckY, bodyTopY);
    }
  }

  // 4. Gently Curved Coach Roof & Rooftop Twin HVAC Pods
  batcher.addLoftedSlices([
    {
      z: pax.bodyStartZ,
      bottomY: eavesY - 0.02,
      beltY: lerp(eavesY, bodyTopY, 0.55),
      topY: bodyTopY,
      hwBottom: halfW,
      hwBelt: halfW * 0.88,
      hwTop: halfW * 0.58,
      chamferBot: 0.02,
      chamferTop: 0.08
    },
    {
      z: pax.bodyEndZ,
      bottomY: eavesY - 0.02,
      beltY: lerp(eavesY, bodyTopY, 0.55),
      topY: bodyTopY,
      hwBottom: halfW,
      hwBelt: halfW * 0.88,
      hwTop: halfW * 0.58,
      chamferBot: 0.02,
      chamferTop: 0.08
    }
  ], 'secondary', 'body');

  if (cfg.railRoofEquipment === 'hvac_twin' || cfg.railRoofEquipment === 'diesel_radiator') {
    for (const hz of [-bodyLen * 0.24, bodyLen * 0.24]) {
      batcher.addBox(0, bodyTopY + 0.1, hz, d.width * 0.54, 0.24, 2.35, {
        materialRole: 'utility',
        layer: 'detail'
      });
      batcher.addBox(0, bodyTopY + 0.225, hz, d.width * 0.44, 0.03, 1.85, {
        materialRole: 'chassisDark',
        layer: 'detail'
      });
    }
  }

  // 5. Passenger Side Window Bays & Pillar Mullions
  const winCount = clamp(Math.round(cfg.railWindowCount || 8), 4, 12);
  const saloonStart = pax.saloonStartZ;
  const saloonEnd = pax.saloonEndZ;
  const saloonLen = saloonEnd - saloonStart;
  const bayPitch = saloonLen / winCount;
  const pillarLen = clamp(bayPitch * 0.22, 0.16, 0.34);
  const paneLen = Math.max(0.45, bayPitch - pillarLen);
  const winMidY = (pax.windowSillY + pax.windowTopY) * 0.5;
  const paxGlassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  for (const side of [-1, 1]) {
    // Window band accent framing
    if (cfg.railLiveryPattern === 'window_band') {
      batcher.addBox(side * (halfW - 0.03), winMidY, 0, 0.08, winH + 0.12, saloonLen, {
        materialRole: 'secondary',
        layer: 'body'
      });
    }
    for (let i = 0; i <= winCount; i++) {
      const pz = saloonStart + i * bayPitch;
      batcher.addBox(side * wallX, winMidY, pz, wallThick, winH + 0.06, pillarLen, {
        materialRole: cfg.railLiveryPattern === 'window_band' ? 'secondary' : 'primary',
        layer: 'body'
      });
      if (i < winCount) {
        const wz = pz + bayPitch * 0.5;
        trBodyAddWindowPane(batcher, side * (halfW - 0.055), winMidY, wz, 0.03, winH * 0.88, paneLen * 0.94, paxGlassRole);
      }
    }
  }

  // Side livery stripe below window line & lower skirt band
  if (cfg.railLiveryPattern !== 'solid') {
    trBodyAddLiveryStripe(batcher, halfW, pax.windowSillY - 0.16, saloonStart - 0.3, saloonEnd + 0.3, 0.16, 'livery');
    trBodyAddLiveryStripe(batcher, halfW, deckY + 0.14, saloonStart - 0.3, saloonEnd + 0.3, 0.14, 'secondary');
  }

  // 6. Simplified Low-Poly Passenger Interior (strictly clear of vestibule doorways!)
  if (cfg.railInteriorEnabled) {
    // Continuous interior floor & ceiling light strip
    batcher.addBox(0, deckY + 0.03, 0, d.width - 0.24, 0.06, bodyLen - 0.18, {
      materialRole: 'interiorDark',
      layer: 'interior'
    });
    batcher.addBox(0, eavesY - 0.06, 0, 0.34, 0.04, bodyLen - 1.2, {
      materialRole: 'headlight',
      layer: 'interior'
    });

    // Vestibule bulkhead partitions separating passenger saloon from doors
    for (const endSign of [-1, 1]) {
      const bulkZ = endSign * (doorOffset - halfDoorW - 0.22);
      for (const side of [-1, 1]) {
        batcher.addBox(side * (halfW - 0.56), deckY + 1.02, bulkZ, 0.82, 1.96, 0.09, {
          materialRole: 'secondary',
          layer: 'interior'
        });
      }
    }

    // Paired low-poly passenger seats along saloon
    const rowCount = Math.max(4, Math.floor((saloonLen - 0.6) / 1.05));
    for (let rIdx = 0; rIdx < rowCount; rIdx++) {
      const sz = lerp(saloonStart + 0.45, saloonEnd - 0.45, rIdx / Math.max(1, rowCount - 1));
      for (const side of [-1, 1]) {
        const seatX = side * (halfW - 0.62);
        batcher.addBox(seatX, deckY + 0.44, sz, 0.78, 0.16, 0.46, { materialRole: 'livery', layer: 'interior' });
        batcher.addBox(seatX, deckY + 0.82, sz - 0.18, 0.76, 0.68, 0.11, { materialRole: 'livery', layer: 'interior' });
      }
    }
  }

  // 7. Articulated Sliding Passenger Vestibule Doors (4 doors)
  const doorGroups = [];
  const dMidY = deckY + 0.04 + pax.doorHeight * 0.5;
  for (const dr of rz.doors) {
    const grp = new THREE.Group();
    grp.name = `Door_${dr.id}`;
    const dBatch = new VehicleBatcher();
    const dx = dr.side * (halfW - 0.025);

    dBatch.addBox(dx, dMidY, dr.z, 0.07, pax.doorHeight, dr.width * 0.96, {
      materialRole: 'secondary',
      layer: 'body'
    });
    // Door upper glass window
    dBatch.addBox(dx + dr.side * 0.015, dMidY + pax.doorHeight * 0.18, dr.z, 0.055, pax.doorHeight * 0.36, dr.width * 0.64, {
      materialRole: paxGlassRole,
      layer: 'glass'
    });
    // Door center accent stripe
    dBatch.addBox(dx + dr.side * 0.032, pax.windowSillY - 0.16, dr.z, 0.02, 0.16, dr.width * 0.92, {
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
    doorGroups.push(grp);
  }

  return { doors: doorGroups };
}

export function buildRailCarbody(batcher, rootGroup, layout, cfg, materialBundle) {
  switch (cfg.bodyFamily) {
    case 'rail_diesel_road_switcher':
    case 'rail_diesel_switcher':
      return trBodyBuildLocomotive(batcher, layout, cfg);
    case 'rail_electric_loco':
      return trLocoExtBuildElectric(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_streamlined_diesel':
      return trLocoExtBuildStreamlinedDiesel(batcher, layout, cfg);
    case 'rail_steam_loco':
      return trLocoExtBuildSteam(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_tank_steam':
      return trLocoExtBuildTankSteam(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_articulated_steam':
      return trLocoExtBuildArticulatedSteam(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_heavy_diesel':
      return trLocoExtBuildHeavyDiesel(batcher, layout, cfg);
    case 'rail_box_electric':
      return trLocoExtBuildBoxElectric(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_maintenance':
      return trLocoExtBuildMaintenance(batcher, layout, cfg);
    case 'rail_highspeed_lead':
      return trPaxExtBuildBulletLead(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_highspeed_coach':
      return trPaxExtBuildBulletCoach(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_bilevel_coach':
      return trPaxExtBuildBilevel(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_dome_coach':
      return trPaxExtBuildDomeCoach(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_dining_coach':
      return trPaxExtBuildDiningCoach(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_sleeper_coach':
      return trPaxExtBuildSleeperCoach(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_subway_classic':
      return trPaxExtBuildSubwayClassic(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_metro_modern':
      return trPaxExtBuildMetroModern(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_people_mover':
      return trPaxExtBuildPeopleMover(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_freight_boxcar':
      return trBodyBuildBoxcar(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_freight_flatcar':
      return trBodyBuildFlatcar(batcher, layout, cfg);
    case 'rail_freight_tank':
      return trBodyBuildTankCar(batcher, layout, cfg);
    case 'rail_freight_hopper':
      return trPaxExtBuildHopper(batcher, layout, cfg);
    case 'rail_freight_caboose':
      return trPaxExtBuildCaboose(batcher, layout, cfg);
    case 'rail_freight_autorack':
      return trPaxExtBuildAutoRack(batcher, layout, cfg);
    case 'rail_freight_wellcar':
      return trPaxExtBuildWellCar(batcher, layout);
    case 'rail_passenger_coach':
      return trBodyBuildPassengerCoach(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_historic_streetcar':
      return trSpecBuildHistoricStreetcar(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_articulated_tram':
      return trSpecBuildArticulatedTram(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_open_tram':
      return trSpecBuildOpenTram(batcher, layout, cfg);
    case 'rail_straddle_monorail':
      return trSpecBuildStraddleMonorail(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_suspended_monorail':
      return trSpecBuildSuspendedMonorail(batcher, rootGroup, layout, cfg, materialBundle);
    case 'rail_aerial_gondola':
      return trSpecBuildAerialGondola(batcher, rootGroup, layout, cfg, materialBundle);
    default:
      return trBodyBuildLocomotive(batcher, layout, cfg);
  }
}
