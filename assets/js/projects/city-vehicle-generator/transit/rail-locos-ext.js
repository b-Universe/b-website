import { clamp, lerp } from '../utils.js';
import { VehicleBatcher } from '../geometry/primitives.js';
import { trPartBuildPantographGroup } from './rail-parts.js';

export function trLocoExtBuildElectric(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const cabLen = 2.35;
  const bodyMidLen = d.length - cabLen * 2;
  const roofEaveY = bodyTopY - 0.24;
  const winBotY = deckY + 1.08;
  const winTopY = roofEaveY - 0.22;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Heavy underframe skirt, buffer beams & transformer bay between bogies
  batcher.addBox(0, deckY - 0.12, 0, d.width, 0.24, d.length, { materialRole: 'secondary', layer: 'chassis' });
  batcher.addBox(0, deckY - 0.44, 0, d.width * 0.72, 0.46, Math.max(2.2, d.wheelbase - 3.3), {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });

  // Main central equipment machine room body with recessed cooling louver banks
  const bodyH = roofEaveY - deckY;
  batcher.addBox(0, deckY + bodyH * 0.5, 0, d.width, bodyH, bodyMidLen, {
    materialRole: 'primary',
    layer: 'body'
  });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.012), deckY + bodyH * 0.58, 0, 0.03, bodyH * 0.44, bodyMidLen * 0.72, {
      materialRole: 'secondary',
      layer: 'detail'
    });
    for (let i = 0; i < 6; i++) {
      const lz = lerp(-bodyMidLen * 0.34, bodyMidLen * 0.34, i / 5);
      batcher.addBox(side * (halfW + 0.025), deckY + bodyH * 0.58, lz, 0.022, bodyH * 0.38, 0.85, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
    batcher.addBox(side * (halfW + 0.014), deckY + 0.22, 0, 0.025, 0.18, d.length * 0.94, {
      materialRole: 'livery',
      layer: 'body'
    });
  }

  // Twin sloped aerodynamic European cabs (front & rear)
  for (const endSign of [-1, 1]) {
    const cabInnerZ = endSign * (bodyMidLen * 0.5);
    const cabOuterZ = endSign * halfL;
    const zA = endSign > 0 ? cabInnerZ : cabOuterZ;
    const zB = endSign > 0 ? cabOuterZ : cabInnerZ;

    // Lower cab apron & snowplow cowcatcher
    batcher.addBox(0, deckY + (winBotY - deckY) * 0.5, (zA + zB) * 0.5, d.width, winBotY - deckY, cabLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(0, deckY - 0.36, endSign * (halfL - 0.12), d.width * 0.9, 0.34, 0.14, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });

    // Raked upper cab windshield block
    const sInner = { z: cabInnerZ, bottomY: winBotY, beltY: lerp(winBotY, roofEaveY, 0.6), topY: roofEaveY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.9 };
    const sOuter = { z: cabOuterZ - endSign * 0.18, bottomY: winBotY, beltY: lerp(winBotY, roofEaveY, 0.55), topY: roofEaveY - 0.08, hwBottom: halfW * 0.94, hwBelt: halfW * 0.9, hwTop: halfW * 0.78 };
    batcher.addLoftedSlices(endSign > 0 ? [sInner, sOuter] : [sOuter, sInner], 'primary', 'body');

    // Front panoramic twin-pane windshield & cab side windows
    const wsZ = cabOuterZ - endSign * 0.1;
    for (const sx of [-0.62, 0.62]) {
      batcher.addBox(sx, (winBotY + winTopY) * 0.5, wsZ, 1.05, winTopY - winBotY, 0.14, {
        rotX: -endSign * 0.16,
        materialRole: glassRole,
        layer: 'glass'
      });
    }
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW - 0.02), (winBotY + winTopY) * 0.5, endSign * (halfL - cabLen * 0.45), 0.06, (winTopY - winBotY) * 0.85, cabLen * 0.48, {
        materialRole: glassRole,
        layer: 'glass'
      });
      if (cfg.railHandrails) {
        batcher.addBox(side * (halfW + 0.03), deckY + 0.65, endSign * (halfL - cabLen * 0.88), 0.035, 0.95, 0.035, {
          materialRole: 'livery',
          layer: 'detail'
        });
      }
    }
  }

  // Roof crown & high-voltage busbar + dual articulated pantographs
  batcher.addLoftedSlices([
    { z: -halfL + 1.0, bottomY: roofEaveY - 0.02, beltY: lerp(roofEaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW * 0.92, hwBelt: halfW * 0.8, hwTop: halfW * 0.58 },
    { z: halfL - 1.0, bottomY: roofEaveY - 0.02, beltY: lerp(roofEaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW * 0.92, hwBelt: halfW * 0.8, hwTop: halfW * 0.58 }
  ], 'secondary', 'body');

  // Roof HV busbar & resistor grid pods
  batcher.addBox(0, bodyTopY + 0.07, 0, 0.08, 0.06, bodyMidLen * 0.95, { materialRole: 'livery', layer: 'detail' });
  batcher.addBox(0, bodyTopY + 0.11, 0, 1.42, 0.22, 3.2, { materialRole: 'utility', layer: 'detail' });

  const pantographs = [];
  const pantoZ = Math.max(3.6, bodyMidLen * 0.34);
  const pFactor = cfg.railPantographHeight ?? 0.92;
  for (const [idx, pair] of [[-pantoZ, -1], [pantoZ, 1]].entries()) {
    const [pz, dir] = pair;
    const pGrp = trPartBuildPantographGroup(`electric_${idx}`, 0, bodyTopY, pz, materialBundle, {
      dir,
      heightFactor: idx === 1 ? pFactor : Math.max(0.08, pFactor * 0.12)
    });
    rootGroup.add(pGrp);
    pantographs.push(pGrp);
  }

  return { doors: [], pantographs };
}

export function trLocoExtBuildStreamlinedDiesel(batcher, layout, cfg) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const noseLen = clamp(cfg.railNoseLength || 2.4, 1.6, 3.6);
  const eaveY = bodyTopY - 0.28;
  const noseEndZ = halfL;
  const noseStartZ = noseEndZ - noseLen;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Full-length skirted underframe + underslung fuel tank
  batcher.addBox(0, deckY - 0.1, 0, d.width, 0.22, d.length - 0.4, { materialRole: 'secondary', layer: 'chassis' });
  batcher.addBox(0, deckY - 0.44, 0, d.width * 0.76, 0.46, Math.max(2.2, d.wheelbase - 3.7), {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });

  // Main carbody loft from flat rear diaphragm forward to cab shoulder
  batcher.addLoftedSlices([
    { z: -halfL + 0.18, bottomY: deckY, beltY: lerp(deckY, eaveY, 0.72), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.68, chamferTop: 0.12 },
    { z: noseStartZ, bottomY: deckY, beltY: lerp(deckY, eaveY, 0.72), topY: bodyTopY, hwBottom: halfW, hwBelt: halfW, hwTop: halfW * 0.68, chamferTop: 0.12 },
    { z: lerp(noseStartZ, noseEndZ, 0.55), bottomY: deckY, beltY: deckY + 1.45, topY: deckY + 1.92, hwBottom: halfW * 0.94, hwBelt: halfW * 0.88, hwTop: halfW * 0.52, chamferTop: 0.14 },
    { z: noseEndZ - 0.1, bottomY: deckY - 0.2, beltY: deckY + 0.65, topY: deckY + 1.25, hwBottom: halfW * 0.62, hwBelt: halfW * 0.58, hwTop: halfW * 0.36, chamferTop: 0.12 }
  ], 'primary', 'body');

  // Sweeping Warbonnet crimson/secondary nose hood & side accent stripe
  batcher.addLoftedSlices([
    { z: noseStartZ - 0.3, bottomY: deckY + 0.85, beltY: deckY + 1.5, topY: bodyTopY + 0.02, hwBottom: halfW + 0.02, hwBelt: halfW * 0.92, hwTop: halfW * 0.68 },
    { z: lerp(noseStartZ, noseEndZ, 0.55), bottomY: deckY + 0.3, beltY: deckY + 1.45, topY: deckY + 1.94, hwBottom: halfW * 0.96, hwBelt: halfW * 0.9, hwTop: halfW * 0.54 },
    { z: noseEndZ - 0.06, bottomY: deckY - 0.22, beltY: deckY + 0.65, topY: deckY + 1.27, hwBottom: halfW * 0.64, hwBelt: halfW * 0.6, hwTop: halfW * 0.38 }
  ], 'secondary', 'body');

  // Gold/Livery speed stripes along sides & circular chrome porthole windows
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.015), deckY + 0.78, -1.2, 0.025, 0.2, d.length * 0.72, {
      materialRole: 'livery',
      layer: 'body'
    });
    for (let p = 0; p < 4; p++) {
      const pz = lerp(-halfL + 1.6, noseStartZ - 1.2, p / 3);
      batcher.addCylinder(side * (halfW + 0.01), deckY + 1.75, pz, 0.24, 0.24, 0.04, 12, 'x', 'chrome', 'detail');
      batcher.addCylinder(side * (halfW + 0.018), deckY + 1.75, pz, 0.18, 0.18, 0.04, 12, 'x', glassRole, 'glass');
    }
    // Side cab windows
    batcher.addBox(side * (halfW - 0.02), bodyTopY - 0.75, noseStartZ - 0.6, 0.06, 0.58, 1.35, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Twin sloped F-unit cab windshields
  for (const sx of [-0.52, 0.52]) {
    batcher.addBox(sx, bodyTopY - 0.76, noseStartZ + 0.28, 0.76, 0.58, 0.12, {
      rotX: -0.45,
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Roof radiator fan pods & twin exhaust stacks
  for (let f = 0; f < 3; f++) {
    const fz = lerp(-halfL + 2.2, noseStartZ - 2.2, f / 2);
    batcher.addCylinder(0, bodyTopY + 0.08, fz, 0.52, 0.56, 0.14, 12, 'y', 'secondary', 'detail');
    batcher.addCylinder(0, bodyTopY + 0.155, fz, 0.4, 0.4, 0.03, 12, 'y', 'chassisDark', 'detail');
  }
  for (const ez of [-1.2, 0.8]) {
    batcher.addCylinder(0, bodyTopY + 0.14, ez, 0.12, 0.14, 0.26, 10, 'y', 'chassisDark', 'detail');
  }

  return { doors: [] };
}

export function trLocoExtBuildSteam(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Split 18.8m length into Engine ([engineStartZ .. +halfL]) and Coal Tender ([-halfL .. engineStartZ - 0.35])
  const tenderStartZ = -halfL + 0.25;
  const tenderEndZ = tenderStartZ + 5.8;
  const cabStartZ = tenderEndZ + 0.38;
  const cabEndZ = cabStartZ + 2.35;
  const fireboxEndZ = cabEndZ + 1.85;
  const smokeboxEndZ = halfL - 0.85;
  const boilerLen = smokeboxEndZ - cabEndZ;
  const boilerMidZ = (cabEndZ + smokeboxEndZ) * 0.5;
  const boilerR = clamp(halfW * 0.62, 0.78, 1.02);
  const boilerCenterY = deckY + boilerR + 0.38;

  // Engine main chassis frame, cowcatcher pilot, steam cylinders & running boards
  const engLen = halfL - cabStartZ;
  const engMidZ = (cabStartZ + halfL) * 0.5;
  batcher.addBox(0, deckY - 0.14, engMidZ, 1.06, 0.34, engLen - 0.3, { materialRole: 'chassisDark', layer: 'chassis' });

  // Running boards flanking boiler + brass handrail
  for (const side of [-1, 1]) {
    batcher.addBox(side * (boilerR + 0.28), deckY + 0.14, boilerMidZ, 0.38, 0.08, boilerLen + 0.4, {
      materialRole: 'secondary',
      layer: 'body'
    });
    batcher.addBox(side * (boilerR + 0.46), deckY + 0.14, boilerMidZ, 0.03, 0.09, boilerLen + 0.4, {
      materialRole: 'livery',
      layer: 'detail'
    });
    if (cfg.railHandrails) {
      batcher.addBox(side * (boilerR + 0.08), boilerCenterY + 0.18, boilerMidZ, 0.03, 0.03, boilerLen * 0.92, {
        materialRole: 'livery',
        layer: 'detail'
      });
    }
    // Twin outside steam cylinders near front drivers
    batcher.addCylinder(side * 1.12, 0.64, smokeboxEndZ - 0.85, 0.36, 0.36, 1.25, 12, 'z', 'secondary', 'detail');
    batcher.addCylinder(side * 1.08, 1.02, smokeboxEndZ - 0.85, 0.24, 0.24, 1.15, 10, 'z', 'chassisDark', 'detail');
  }

  // Angled slatted cowcatcher pilot at front nose
  const pilotZ = halfL - 0.36;
  batcher.addBox(0, deckY - 0.18, pilotZ, d.width * 0.88, 0.18, 0.55, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * 0.62, 0.52, halfL - 0.22, 1.28, 0.56, 0.08, {
      rotY: -side * 0.44,
      rotX: 0.22,
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
  }

  // Cylindrical Boiler, Brass Bands, Firebox & Smokebox
  batcher.addCylinder(0, boilerCenterY, boilerMidZ, boilerR, boilerR, boilerLen, 16, 'z', 'secondary', 'body');
  // Belpaire firebox widening slightly ahead of cab
  batcher.addBox(0, boilerCenterY - 0.08, (cabEndZ + fireboxEndZ) * 0.5, boilerR * 1.98, boilerR * 1.75, fireboxEndZ - cabEndZ, {
    materialRole: 'secondary',
    layer: 'body'
  });
  // Charcoal smokebox front drum + conical smokebox door
  const sbLen = 1.65;
  const sbZ = smokeboxEndZ - sbLen * 0.5;
  batcher.addCylinder(0, boilerCenterY, sbZ, boilerR + 0.025, boilerR + 0.025, sbLen, 16, 'z', 'primary', 'body');
  batcher.addCylinder(0, boilerCenterY, smokeboxEndZ + 0.1, boilerR * 0.45, boilerR * 0.94, 0.22, 14, 'z', 'primary', 'body');

  // Brass boiler rings, smokestack chimney, steam dome & sand dome
  for (let b = 0; b < 4; b++) {
    const bz = lerp(fireboxEndZ, smokeboxEndZ - sbLen - 0.2, b / 3);
    batcher.addCylinder(0, boilerCenterY, bz, boilerR + 0.02, boilerR + 0.02, 0.055, 16, 'z', 'livery', 'detail');
  }
  const topY = boilerCenterY + boilerR;
  batcher.addCylinder(0, topY + 0.34, sbZ + 0.1, 0.24, 0.18, 0.72, 12, 'y', 'primary', 'detail'); // Chimney stack
  batcher.addCylinder(0, topY + 0.72, sbZ + 0.1, 0.28, 0.24, 0.09, 12, 'y', 'livery', 'detail');
  batcher.addCylinder(0, topY + 0.26, boilerMidZ + 0.75, 0.44, 0.5, 0.54, 12, 'y', 'secondary', 'detail'); // Sand dome
  batcher.addCylinder(0, topY + 0.28, boilerMidZ - 1.15, 0.4, 0.46, 0.58, 12, 'y', 'livery', 'detail'); // Brass steam dome

  // Engineer Cab
  const cabMidZ = (cabStartZ + cabEndZ) * 0.5;
  const cabH = bodyTopY - deckY;
  batcher.addBox(0, deckY + cabH * 0.42, cabMidZ, d.width * 0.94, cabH * 0.84, cabEndZ - cabStartZ, {
    materialRole: 'secondary',
    layer: 'body'
  });
  batcher.addBox(0, bodyTopY - 0.06, cabMidZ - 0.08, d.width * 1.0, 0.16, cabEndZ - cabStartZ + 0.45, {
    materialRole: 'primary',
    layer: 'body'
  });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.94 + 0.01), bodyTopY - 0.56, cabMidZ, 0.05, 0.62, 1.35, {
      materialRole: glassRole,
      layer: 'glass'
    });
    batcher.addBox(side * (halfW * 0.94 + 0.015), deckY + 0.62, cabMidZ, 0.03, 0.12, 2.0, {
      materialRole: 'livery',
      layer: 'body'
    });
  }

  // Coal Tender (rear car body + coal mound!)
  const tMidZ = (tenderStartZ + tenderEndZ) * 0.5;
  const tLen = tenderEndZ - tenderStartZ;
  const tH = Math.max(1.8, bodyTopY - deckY - 0.45);
  batcher.addBox(0, deckY - 0.1, tMidZ, d.width * 0.96, 0.22, tLen, { materialRole: 'chassisDark', layer: 'chassis' });
  batcher.addBox(0, deckY + tH * 0.5, tMidZ, d.width * 0.92, tH, tLen - 0.12, { materialRole: 'secondary', layer: 'body' });
  // Coal pile mound inside tender bunker
  batcher.addBox(0, deckY + tH + 0.14, tMidZ + 0.2, d.width * 0.72, 0.42, tLen * 0.68, {
    materialRole: 'chassisDark',
    layer: 'detail'
  });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.92 + 0.014), deckY + tH * 0.58, tMidZ, 0.025, 0.16, tLen * 0.88, {
      materialRole: 'livery',
      layer: 'body'
    });
  }

  // Large Spoked Steam Driving Wheels (3 coupled axles) + Animated Connecting Rods!
  const driverR = 0.66;
  const driverX = layout.rail.gauge.railCenterHalfX;
  const customWheelsets = [];
  const driverZs = [boilerMidZ - 1.3, boilerMidZ + 0.22, boilerMidZ + 1.74];

  for (let i = 0; i < driverZs.length; i++) {
    const dz = driverZs[i];
    const ws = new THREE.Group();
    ws.name = `SteamDriver_${i}`;
    ws.position.set(0, driverR, dz);
    const wBatch = new VehicleBatcher();
    wBatch.addCylinder(0, 0, 0, 0.075, 0.075, driverX * 2 + 0.24, 10, 'x', 'chassisDark', 'wheel');
    for (const side of [-1, 1]) {
      wBatch.addCylinder(side * driverX, 0, 0, driverR, driverR, 0.12, 16, 'x', 'tire', 'wheel');
      wBatch.addCylinder(side * (driverX - 0.056), 0, 0, driverR + 0.028, driverR + 0.028, 0.024, 16, 'x', 'chrome', 'wheel');
      wBatch.addCylinder(side * (driverX + 0.03), 0, 0, driverR * 0.8, driverR * 0.8, 0.06, 12, 'x', 'rim', 'wheel');
      // Spokes + counterweight crescent
      for (let sp = 0; sp < 4; sp++) {
        wBatch.addBox(side * (driverX + 0.045), 0, 0, 0.024, driverR * 1.48, 0.055, {
          rotX: (sp / 4) * Math.PI,
          materialRole: 'rim',
          layer: 'wheel'
        });
      }
      wBatch.addBox(side * (driverX + 0.048), -driverR * 0.36, 0, 0.03, driverR * 0.34, driverR * 0.72, {
        materialRole: 'livery',
        layer: 'wheel'
      });
    }
    wBatch.finalize(ws, materialBundle);
    rootGroup.add(ws);
    customWheelsets.push(ws);
  }

  // Animated Coupling & Connecting Rods (`SteamRod_left`, `SteamRod_right`)
  const steamRods = [];
  const rodSpan = driverZs[2] - driverZs[0] + 0.35;
  const rodCenterZ = driverZs[1];
  for (const side of [-1, 1]) {
    const rodGrp = new THREE.Group();
    rodGrp.name = `SteamRod_${side < 0 ? 'left' : 'right'}`;
    const rx = side * (driverX + 0.11);
    const ry = driverR - 0.22;
    rodGrp.position.set(rx, ry, rodCenterZ);
    const rBatch = new VehicleBatcher();
    // Main horizontal coupling side rod linking all 3 drivers
    rBatch.addBox(0, 0, 0, 0.045, 0.1, rodSpan, { materialRole: 'chrome', layer: 'detail' });
    // Angled piston main rod reaching forward into steam cylinder crosshead
    rBatch.addBox(0.02 * side, 0.04, rodSpan * 0.45 + 0.85, 0.05, 0.085, 1.95, {
      materialRole: 'utility',
      layer: 'detail'
    });
    rBatch.finalize(rodGrp, materialBundle);
    rodGrp.userData = {
      isSteamRod: true,
      baseX: rx,
      baseY: ry,
      baseZ: rodCenterZ,
      crankRadius: 0.22,
      phaseOffset: side < 0 ? 0 : Math.PI * 0.5
    };
    rootGroup.add(rodGrp);
    steamRods.push(rodGrp);
  }

  return { doors: [], steamRods, customWheelsets };
}

export function trLocoExtBuildMaintenance(batcher, layout, cfg) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Heavy yellow work frame + hazard striped end sills
  batcher.addBox(0, deckY - 0.11, 0, d.width, 0.22, d.length, { materialRole: 'primary', layer: 'chassis' });
  for (const endSign of [-1, 1]) {
    const ez = endSign * (halfL + 0.01);
    for (let i = -3; i <= 3; i++) {
      batcher.addBox(i * 0.36, deckY - 0.11, ez, 0.18, 0.2, 0.02, {
        materialRole: (i & 1) === 0 ? 'livery' : 'primary',
        layer: 'detail'
      });
    }
  }

  // Forward operator utility cab
  const cabZ = halfL - 2.1;
  const cabH = bodyTopY - deckY;
  batcher.addBox(0, deckY + cabH * 0.46, cabZ, d.width * 0.92, cabH * 0.92, 2.75, {
    materialRole: 'primary',
    layer: 'body'
  });
  batcher.addBox(0, bodyTopY - 0.06, cabZ, d.width * 0.96, 0.14, 2.9, { materialRole: 'secondary', layer: 'body' });
  batcher.addBox(0, bodyTopY - 0.65, cabZ + 1.38, d.width * 0.72, 0.68, 0.06, { materialRole: glassRole, layer: 'glass' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.92 + 0.01), bodyTopY - 0.65, cabZ + 0.2, 0.05, 0.68, 1.45, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Mid-deck tool locker boxes & hydraulic turntable pedestal
  batcher.addBox(0, deckY + 0.55, 0.4, d.width * 0.82, 1.05, 2.6, { materialRole: 'secondary', layer: 'detail' });
  const craneZ = -2.2;
  batcher.addCylinder(0, deckY + 0.34, craneZ, 0.78, 0.86, 0.68, 12, 'y', 'secondary', 'detail');
  batcher.addBox(0, deckY + 0.92, craneZ, 0.96, 0.52, 1.12, { materialRole: 'primary', layer: 'detail' });

  // Articulated yellow lattice crane boom + winch cable + lifting hook
  batcher.addBox(0, deckY + 1.95, craneZ - 1.45, 0.36, 0.42, 4.95, {
    rotX: 0.38,
    materialRole: 'primary',
    layer: 'detail'
  });
  batcher.addBox(0, deckY + 2.42, craneZ - 3.65, 0.16, 0.72, 0.18, { materialRole: 'utility', layer: 'detail' });
  batcher.addCylinder(0, deckY + 1.82, craneZ - 3.65, 0.025, 0.025, 0.75, 6, 'y', 'chassisDark', 'detail');
  batcher.addBox(0, deckY + 1.4, craneZ - 3.65, 0.18, 0.24, 0.18, { materialRole: 'livery', layer: 'detail' });

  // Roof amber warning lightbar on cab
  if (cfg.lightBar && cfg.lightBar !== 'none') {
    batcher.addBox(0, bodyTopY + 0.1, cabZ + 0.55, 1.15, 0.16, 0.24, { materialRole: 'amberLight', layer: 'detail' });
  }
  // Rear rail ties stack cargo on work flat deck
  batcher.addBox(0, deckY + 0.25, -halfL + 1.35, d.width * 0.78, 0.45, 1.85, { materialRole: 'secondary', layer: 'detail' });

  return { doors: [] };
}

function trLocoExtAddSteamDriversAndRods(rootGroup, layout, materialBundle, driverZs, driverR, prefix = 'Steam') {
  const driverX = layout.rail.gauge.railCenterHalfX;
  const customWheelsets = [];
  for (let i = 0; i < driverZs.length; i++) {
    const dz = driverZs[i];
    const ws = new THREE.Group();
    ws.name = `${prefix}Driver_${i}`;
    ws.position.set(0, driverR, dz);
    const wBatch = new VehicleBatcher();
    wBatch.addCylinder(0, 0, 0, 0.072, 0.072, driverX * 2 + 0.22, 10, 'x', 'chassisDark', 'wheel');
    for (const side of [-1, 1]) {
      wBatch.addCylinder(side * driverX, 0, 0, driverR, driverR, 0.12, 16, 'x', 'tire', 'wheel');
      wBatch.addCylinder(side * (driverX - 0.056), 0, 0, driverR + 0.028, driverR + 0.028, 0.024, 16, 'x', 'chrome', 'wheel');
      wBatch.addCylinder(side * (driverX + 0.03), 0, 0, driverR * 0.78, driverR * 0.78, 0.06, 12, 'x', 'rim', 'wheel');
      for (let sp = 0; sp < 4; sp++) {
        wBatch.addBox(side * (driverX + 0.044), 0, 0, 0.024, driverR * 1.44, 0.05, {
          rotX: (sp / 4) * Math.PI,
          materialRole: 'rim',
          layer: 'wheel'
        });
      }
      wBatch.addBox(side * (driverX + 0.046), -driverR * 0.34, 0, 0.03, driverR * 0.32, driverR * 0.68, {
        materialRole: 'livery',
        layer: 'wheel'
      });
    }
    wBatch.finalize(ws, materialBundle);
    rootGroup.add(ws);
    customWheelsets.push(ws);
  }

  const steamRods = [];
  const rodSpan = driverZs[driverZs.length - 1] - driverZs[0] + 0.32;
  const rodCenterZ = (driverZs[0] + driverZs[driverZs.length - 1]) * 0.5;
  const crankR = Math.min(0.22, driverR * 0.34);
  for (const side of [-1, 1]) {
    const rodGrp = new THREE.Group();
    rodGrp.name = `${prefix}Rod_${side < 0 ? 'left' : 'right'}`;
    const rx = side * (driverX + 0.11);
    const ry = driverR - crankR;
    rodGrp.position.set(rx, ry, rodCenterZ);
    const rBatch = new VehicleBatcher();
    rBatch.addBox(0, 0, 0, 0.044, 0.095, rodSpan, { materialRole: 'chrome', layer: 'detail' });
    rBatch.addBox(0.02 * side, 0.035, rodSpan * 0.44 + 0.68, 0.046, 0.08, 1.45, {
      materialRole: 'utility',
      layer: 'detail'
    });
    rBatch.finalize(rodGrp, materialBundle);
    rodGrp.userData = {
      isSteamRod: true,
      baseX: rx,
      baseY: ry,
      baseZ: rodCenterZ,
      crankRadius: crankR,
      phaseOffset: side < 0 ? 0 : Math.PI * 0.5
    };
    rootGroup.add(rodGrp);
    steamRods.push(rodGrp);
  }
  return { customWheelsets, steamRods };
}

export function trLocoExtBuildTankSteam(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  const bunkerStartZ = -halfL + 0.38;
  const bunkerEndZ = bunkerStartZ + 1.55;
  const cabStartZ = bunkerEndZ;
  const cabEndZ = cabStartZ + 2.25;
  const smokeboxEndZ = halfL - 0.65;
  const boilerLen = smokeboxEndZ - cabEndZ;
  const boilerMidZ = (cabEndZ + smokeboxEndZ) * 0.5;
  const boilerR = clamp(halfW * 0.54, 0.68, 0.86);
  const boilerCenterY = deckY + boilerR + 0.24;

  // Heavy plate frame, crimson buffer beams & side running boards
  batcher.addBox(0, deckY - 0.14, 0, 1.08, 0.36, d.length - 0.4, { materialRole: 'chassisDark', layer: 'chassis' });
  batcher.addBox(0, deckY + 0.06, 0, d.width * 0.94, 0.14, d.length - 0.2, { materialRole: 'secondary', layer: 'body' });
  for (const endSign of [-1, 1]) {
    batcher.addBox(0, deckY - 0.18, endSign * (halfL - 0.12), d.width * 0.96, 0.34, 0.2, { materialRole: 'bumper', layer: 'chassis' });
  }

  // Boiler barrel, smokebox & iconic tall flanking side water tanks!
  batcher.addCylinder(0, boilerCenterY, boilerMidZ, boilerR, boilerR, boilerLen, 16, 'z', 'primary', 'body');
  const sbLen = 1.3;
  const sbZ = smokeboxEndZ - sbLen * 0.5;
  batcher.addCylinder(0, boilerCenterY, sbZ, boilerR + 0.025, boilerR + 0.025, sbLen, 16, 'z', 'secondary', 'body');
  batcher.addCylinder(0, boilerCenterY, smokeboxEndZ + 0.09, boilerR * 0.42, boilerR * 0.92, 0.2, 12, 'z', 'secondary', 'body');

  const tankLen = boilerLen - sbLen - 0.1;
  const tankMidZ = cabEndZ + tankLen * 0.5;
  const tankH = boilerR * 1.62;
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW - 0.34), deckY + 0.12 + tankH * 0.5, tankMidZ, 0.58, tankH, tankLen, {
      materialRole: 'primary',
      layer: 'body'
    });
    batcher.addBox(side * (halfW - 0.04), deckY + 0.12 + tankH * 0.5, tankMidZ, 0.03, 0.12, tankLen * 0.9, {
      materialRole: 'livery',
      layer: 'body'
    });
    batcher.addCylinder(side * 1.05, 0.56, smokeboxEndZ - 0.6, 0.3, 0.3, 1.0, 10, 'z', 'secondary', 'detail');
  }

  // Copper-rimmed smokestack & brass steam dome
  const topY = boilerCenterY + boilerR;
  batcher.addCylinder(0, topY + 0.36, sbZ + 0.06, 0.21, 0.16, 0.72, 12, 'y', 'secondary', 'detail');
  batcher.addCylinder(0, topY + 0.74, sbZ + 0.06, 0.25, 0.21, 0.09, 12, 'y', 'livery', 'detail');
  batcher.addCylinder(0, topY + 0.26, tankMidZ + 0.15, 0.38, 0.44, 0.52, 12, 'y', 'livery', 'detail');

  // Cab & rear integral coal bunker
  const cabMidZ = (cabStartZ + cabEndZ) * 0.5;
  const cabH = bodyTopY - deckY;
  batcher.addBox(0, deckY + cabH * 0.44, cabMidZ, d.width * 0.92, cabH * 0.88, cabEndZ - cabStartZ, { materialRole: 'primary', layer: 'body' });
  batcher.addBox(0, bodyTopY - 0.05, cabMidZ, d.width * 0.98, 0.14, cabEndZ - cabStartZ + 0.35, { materialRole: 'secondary', layer: 'body' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.92 + 0.01), bodyTopY - 0.54, cabMidZ, 0.05, 0.58, 1.25, { materialRole: glassRole, layer: 'glass' });
  }
  const bunkMidZ = (bunkerStartZ + bunkerEndZ) * 0.5;
  batcher.addBox(0, deckY + 0.86, bunkMidZ, d.width * 0.88, 1.48, bunkerEndZ - bunkerStartZ, { materialRole: 'primary', layer: 'body' });
  batcher.addBox(0, deckY + 1.66, bunkMidZ, d.width * 0.72, 0.32, (bunkerEndZ - bunkerStartZ) * 0.78, { materialRole: 'chassisDark', layer: 'detail' });

  // 0-6-0 Rigid Coupled Drivers (3 big spoked wheels + coupling rods; empty dummy bogie pivots so no diesel truck spawns)
  const driverR = clamp(cfg.railWheelRadius || 0.56, 0.48, 0.64);
  const { customWheelsets, steamRods } = trLocoExtAddSteamDriversAndRods(
    rootGroup,
    layout,
    materialBundle,
    [-2.05, 0.0, 2.05],
    driverR,
    'TankSteam'
  );
  const customBogies = ['front', 'rear'].map((id) => {
    const g = new THREE.Group();
    g.name = `Bogie_${id}`;
    g.userData = { pivotType: 'bogie', bogieId: id, wheelsets: [] };
    rootGroup.add(g);
    return g;
  });

  return { doors: [], steamRods, customBogies, customWheelsets };
}

export function trLocoExtBuildArticulatedSteam(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Split 23.2m Big Boy into oversized 12-wheel coal tender + cab + huge articulated boiler!
  const tenderStartZ = -halfL + 0.25;
  const tenderEndZ = tenderStartZ + 7.4;
  const cabStartZ = tenderEndZ + 0.36;
  const cabEndZ = cabStartZ + 2.45;
  const smokeboxEndZ = halfL - 0.82;
  const boilerLen = smokeboxEndZ - cabEndZ;
  const boilerMidZ = (cabEndZ + smokeboxEndZ) * 0.5;
  const boilerR = clamp(halfW * 0.66, 0.86, 1.08);
  const boilerCenterY = deckY + boilerR + 0.42;

  batcher.addBox(0, deckY - 0.14, (cabStartZ + halfL) * 0.5, 1.16, 0.38, halfL - cabStartZ - 0.25, { materialRole: 'chassisDark', layer: 'chassis' });
  // Cowcatcher pilot & twin air-compressor shields on smokebox front
  batcher.addBox(0, deckY - 0.18, halfL - 0.35, d.width * 0.92, 0.22, 0.56, { materialRole: 'chassisDark', layer: 'chassis' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * 0.66, 0.52, halfL - 0.2, 1.32, 0.58, 0.08, { rotY: -side * 0.44, rotX: 0.22, materialRole: 'chassisDark', layer: 'chassis' });
    batcher.addBox(side * (boilerR + 0.3), deckY + 0.16, boilerMidZ, 0.42, 0.09, boilerLen + 0.35, { materialRole: 'secondary', layer: 'body' });
    // Front & rear articulated pairs of outside steam cylinders!
    for (const cz of [smokeboxEndZ - 0.85, boilerMidZ - 0.65]) {
      batcher.addCylinder(side * 1.18, 0.64, cz, 0.38, 0.38, 1.35, 12, 'z', 'secondary', 'detail');
      batcher.addCylinder(side * 1.12, 1.04, cz, 0.25, 0.25, 1.2, 10, 'z', 'chassisDark', 'detail');
    }
  }

  // Massive boiler, wide firebox, twin exhaust stacks & triple sand/steam domes
  batcher.addCylinder(0, boilerCenterY, boilerMidZ, boilerR, boilerR, boilerLen, 18, 'z', 'primary', 'body');
  batcher.addBox(0, boilerCenterY - 0.1, cabEndZ + 1.25, boilerR * 2.08, boilerR * 1.82, 2.5, { materialRole: 'primary', layer: 'body' });
  const sbLen = 2.05;
  const sbZ = smokeboxEndZ - sbLen * 0.5;
  batcher.addCylinder(0, boilerCenterY, sbZ, boilerR + 0.03, boilerR + 0.03, sbLen, 18, 'z', 'secondary', 'body');
  batcher.addCylinder(0, boilerCenterY, smokeboxEndZ + 0.12, boilerR * 0.48, boilerR * 0.95, 0.24, 14, 'z', 'secondary', 'body');

  const topY = boilerCenterY + boilerR;
  for (const sz of [sbZ + 0.32, sbZ - 0.32]) {
    batcher.addCylinder(0, topY + 0.28, sz, 0.22, 0.19, 0.56, 10, 'y', 'secondary', 'detail');
  }
  for (const dz of [boilerMidZ + 2.1, boilerMidZ + 0.2, boilerMidZ - 1.9]) {
    batcher.addCylinder(0, topY + 0.24, dz, 0.46, 0.54, 0.48, 12, 'y', 'primary', 'detail');
  }

  // Engineer Cab + Giant Centipede Coal Tender
  const cabMidZ = (cabStartZ + cabEndZ) * 0.5;
  const cabH = bodyTopY - deckY;
  batcher.addBox(0, deckY + cabH * 0.42, cabMidZ, d.width * 0.96, cabH * 0.84, cabEndZ - cabStartZ, { materialRole: 'primary', layer: 'body' });
  batcher.addBox(0, bodyTopY - 0.05, cabMidZ - 0.06, d.width * 1.0, 0.16, cabEndZ - cabStartZ + 0.4, { materialRole: 'secondary', layer: 'body' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.96 + 0.01), bodyTopY - 0.58, cabMidZ, 0.05, 0.64, 1.45, { materialRole: glassRole, layer: 'glass' });
  }
  const tMidZ = (tenderStartZ + tenderEndZ) * 0.5;
  const tLen = tenderEndZ - tenderStartZ;
  const tH = Math.max(1.9, bodyTopY - deckY - 0.48);
  batcher.addBox(0, deckY - 0.1, tMidZ, d.width * 0.96, 0.22, tLen, { materialRole: 'chassisDark', layer: 'chassis' });
  batcher.addBox(0, deckY + tH * 0.5, tMidZ, d.width * 0.94, tH, tLen - 0.1, { materialRole: 'primary', layer: 'body' });
  batcher.addBox(0, deckY + tH + 0.16, tMidZ + 0.3, d.width * 0.74, 0.45, tLen * 0.65, { materialRole: 'chassisDark', layer: 'detail' });

  // Twin articulated driver sets (front 3 drivers + rear 3 drivers) + dual orbiting coupling rods!
  const driverR = 0.62;
  const frontSet = trLocoExtAddSteamDriversAndRods(rootGroup, layout, materialBundle, [boilerMidZ + 1.35, boilerMidZ + 2.75, boilerMidZ + 4.15], driverR, 'BigBoyFront');
  const rearSet = trLocoExtAddSteamDriversAndRods(rootGroup, layout, materialBundle, [boilerMidZ - 3.65, boilerMidZ - 2.25, boilerMidZ - 0.85], driverR, 'BigBoyRear');

  return {
    doors: [],
    steamRods: [...frontSet.steamRods, ...rearSet.steamRods],
    customWheelsets: [...frontSet.customWheelsets, ...rearSet.customWheelsets]
  };
}

export function trLocoExtBuildHeavyDiesel(batcher, layout, cfg) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Heavy underframe sill, end anticlimber decks, giant central fuel tank & snowplow
  batcher.addBox(0, deckY - 0.13, 0, d.width, 0.26, d.length, { materialRole: 'secondary', layer: 'chassis' });
  batcher.addBox(0, deckY - 0.54, -0.35, d.width * 0.68, 0.66, clamp(cfg.railFuelTankLength || 5.6, 3.0, 6.8), {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });
  batcher.addBox(0, deckY - 0.44, halfL - 0.22, d.width * 0.92, 0.44, 0.22, { materialRole: 'chassisDark', layer: 'chassis' });

  // Modern North American Wide-Nose Safety Cab (full width!)
  const noseEndZ = halfL - 0.82;
  const cabEndZ = noseEndZ - 1.95;
  const cabStartZ = cabEndZ - 2.65;
  const cabH = bodyTopY - deckY;
  const noseTopY = deckY + cabH * 0.56;

  batcher.addLoftedSlices([
    { z: cabEndZ, bottomY: deckY, beltY: noseTopY - 0.24, topY: noseTopY, hwBottom: halfW * 0.96, hwBelt: halfW * 0.94, hwTop: halfW * 0.86 },
    { z: noseEndZ, bottomY: deckY, beltY: noseTopY - 0.34, topY: noseTopY - 0.14, hwBottom: halfW * 0.92, hwBelt: halfW * 0.84, hwTop: halfW * 0.64 }
  ], 'primary', 'body');
  batcher.addBox(0, deckY + cabH * 0.5, (cabStartZ + cabEndZ) * 0.5, d.width * 0.96, cabH, cabEndZ - cabStartZ, {
    materialRole: 'primary',
    layer: 'body'
  });
  batcher.addBox(0, bodyTopY - 0.06, (cabStartZ + cabEndZ) * 0.5, d.width * 0.92, 0.16, cabEndZ - cabStartZ + 0.12, {
    materialRole: 'secondary',
    layer: 'body'
  });
  for (const sx of [-0.62, 0.62]) {
    batcher.addBox(sx, bodyTopY - 0.56, cabEndZ + 0.02, 1.02, 0.62, 0.08, { rotX: -0.14, materialRole: glassRole, layer: 'glass' });
  }
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW * 0.96 + 0.01), bodyTopY - 0.56, (cabStartZ + cabEndZ) * 0.5, 0.05, 0.58, 1.68, { materialRole: glassRole, layer: 'glass' });
  }

  // Long engine hood + iconic GE/EMD Flared Rear Radiator Wings!
  const hoodStartZ = -halfL + 0.85;
  const hoodLen = cabStartZ - hoodStartZ;
  const hoodMidZ = (hoodStartZ + cabStartZ) * 0.5;
  const hoodW = d.width * 0.64;
  const hoodH = cabH - 0.12;
  batcher.addBox(0, deckY + hoodH * 0.5, hoodMidZ, hoodW, hoodH, hoodLen, { materialRole: 'primary', layer: 'body' });
  // Flared radiator wings at rear third of hood
  const radLen = Math.min(4.8, hoodLen * 0.42);
  const radZ = hoodStartZ + radLen * 0.5 + 0.25;
  batcher.addBox(0, deckY + hoodH - 0.42, radZ, d.width * 0.94, 0.72, radLen, { materialRole: 'secondary', layer: 'body' });
  for (const fz of [radZ - 1.35, radZ, radZ + 1.35]) {
    batcher.addCylinder(0, deckY + hoodH + 0.05, fz, 0.56, 0.58, 0.14, 12, 'y', 'utility', 'detail');
  }
  // Exhaust stack & side stripe along walkways
  batcher.addBox(0, deckY + hoodH + 0.14, cabStartZ - 2.4, 0.46, 0.28, 0.92, { materialRole: 'chassisDark', layer: 'detail' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (halfW + 0.014), deckY - 0.02, 0, 0.024, 0.16, d.length * 0.96, { materialRole: 'livery', layer: 'body' });
    if (cfg.railHandrails) {
      batcher.addBox(side * (halfW - 0.06), deckY + 0.94, hoodMidZ, 0.03, 0.032, hoodLen + 0.4, { materialRole: 'livery', layer: 'detail' });
      for (let p = 0; p < 7; p++) {
        const pz = lerp(hoodStartZ, cabStartZ, p / 6);
        batcher.addBox(side * (halfW - 0.06), deckY + 0.48, pz, 0.026, 0.94, 0.026, { materialRole: 'utility', layer: 'detail' });
      }
    }
  }

  return { doors: [] };
}

export function trLocoExtBuildBoxElectric(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const bodyTopY = layout.rail.zones.bodyTopY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const glassRole = cfg.railInteriorEnabled ? 'railGlass' : 'glass';

  // Heavy riveted underframe & twin stepped GG1-inspired end noses
  batcher.addBox(0, deckY - 0.13, 0, d.width, 0.26, d.length, { materialRole: 'secondary', layer: 'chassis' });
  const bodyHalfL = halfL - 2.25;
  const roofEaveY = bodyTopY - 0.26;
  const bodyH = roofEaveY - deckY;
  batcher.addBox(0, deckY + bodyH * 0.5, 0, d.width * 0.96, bodyH, bodyHalfL * 2, { materialRole: 'primary', layer: 'body' });

  // Rounded streamlined roof arch
  batcher.addLoftedSlices([
    { z: -bodyHalfL, bottomY: roofEaveY - 0.02, beltY: lerp(roofEaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW * 0.96, hwBelt: halfW * 0.78, hwTop: halfW * 0.5 },
    { z: bodyHalfL, bottomY: roofEaveY - 0.02, beltY: lerp(roofEaveY, bodyTopY, 0.5), topY: bodyTopY, hwBottom: halfW * 0.96, hwBelt: halfW * 0.78, hwTop: halfW * 0.5 }
  ], 'secondary', 'body');

  // Twin sloped classic end hoods & recessed cab windshields
  const hoodH = bodyH * 0.64;
  for (const endSign of [-1, 1]) {
    const zIn = endSign * bodyHalfL;
    const zOut = endSign * (halfL - 0.22);
    const sIn = { z: zIn, bottomY: deckY, beltY: deckY + hoodH * 0.72, topY: deckY + hoodH, hwBottom: halfW * 0.92, hwBelt: halfW * 0.88, hwTop: halfW * 0.7 };
    const sOut = { z: zOut, bottomY: deckY, beltY: deckY + hoodH * 0.56, topY: deckY + hoodH * 0.82, hwBottom: halfW * 0.82, hwBelt: halfW * 0.76, hwTop: halfW * 0.54 };
    batcher.addLoftedSlices(endSign > 0 ? [sIn, sOut] : [sOut, sIn], 'primary', 'body');
    for (const sx of [-0.54, 0.54]) {
      batcher.addBox(sx, roofEaveY - 0.44, zIn + endSign * 0.02, 0.86, 0.58, 0.08, { materialRole: glassRole, layer: 'glass' });
    }
  }

  // Classic gold cat-whisker pinstripes & porthole louver windows along sides
  for (const side of [-1, 1]) {
    for (const sy of [deckY + 0.34, deckY + 0.56]) {
      batcher.addBox(side * (halfW * 0.96 + 0.015), sy, 0, 0.024, 0.08, bodyHalfL * 1.94, { materialRole: 'livery', layer: 'body' });
    }
    for (let i = 0; i < 5; i++) {
      const wz = lerp(-bodyHalfL * 0.72, bodyHalfL * 0.72, i / 4);
      batcher.addCylinder(side * (halfW * 0.96 + 0.01), deckY + bodyH * 0.62, wz, 0.28, 0.28, 0.06, 12, 'x', glassRole, 'glass');
    }
  }

  // Twin articulated roof pantographs + ceramic busbar
  batcher.addBox(0, bodyTopY + 0.07, 0, 0.08, 0.06, bodyHalfL * 1.6, { materialRole: 'livery', layer: 'detail' });
  const pantographs = [];
  for (const [idx, pz, dir] of [[0, bodyHalfL * 0.55, 1], [1, -bodyHalfL * 0.55, -1]]) {
    const pGrp = trPartBuildPantographGroup(`box_${idx}`, 0, bodyTopY, pz, materialBundle, {
      dir,
      armLen: 0.94,
      heightFactor: cfg.railPantographHeight ?? 0.88
    });
    rootGroup.add(pGrp);
    pantographs.push(pGrp);
  }

  return { doors: [], pantographs };
}
