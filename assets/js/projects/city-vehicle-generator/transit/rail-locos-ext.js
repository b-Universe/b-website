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
