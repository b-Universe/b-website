import { clamp, degToRad, lerp, pick, rng32 } from '../utils.js';
import { vehLicensePlate, vehSignboard } from './primitives.js';

function evalNoseTipTopY(layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const wedgeLift = clamp(cfg.wedgeProfile, 0, 0.35);
  const minNoseTop = Math.max(d.groundClearance + 0.28, d.wheelArchTopY + 0.04);
  const drop = s.hood.length * cfg.hoodSlope * 0.58 + wedgeLift * 0.26;
  return Math.max(minNoseTop, d.beltY - drop);
}

export function buildVehicleDetails(batcher, rootGroup, layout, cfg, materialBundle) {
  const d = layout.dimensions;
  const s = layout.sections;
  const frontZ = s.hood.endZ;
  const rearZ = s.rear.startZ;
  const gc = d.groundClearance;

  const frontHalfW = d.halfWidth * d.frontWidthRatio * 0.92;
  const rearHalfW = d.halfWidth * d.rearWidthRatio * 0.92;
  const noseTopY = evalNoseTipTopY(layout, cfg);
  const fasciaBotY = gc + 0.19;
  const fasciaMidY = lerp(fasciaBotY, noseTopY, 0.48);
  const fasciaH = Math.max(0.14, noseTopY - fasciaBotY);

  // 1. Front Grille & Headlights
  const grilleW = clamp(frontHalfW * 0.88, 0.45, 1.25);
  const grilleH = clamp(fasciaH * 0.54, 0.12, 0.48);
  if (cfg.grilleStyle !== 'minimal_ev') {
    batcher.addBox(0, fasciaMidY, frontZ + 0.012, grilleW, grilleH, 0.035, {
      materialRole: cfg.grilleStyle === 'heavy_horizontal' ? 'chrome' : 'chassisDark',
      layer: 'detail'
    });
    if (cfg.grilleStyle === 'slatted' || cfg.grilleStyle === 'heavy_horizontal') {
      const bars = cfg.grilleStyle === 'heavy_horizontal' ? 3 : 4;
      for (let i = 0; i < bars; i++) {
        const yOff = (i / Math.max(1, bars - 1) - 0.5) * (grilleH * 0.65);
        batcher.addBox(0, fasciaMidY + yOff, frontZ + 0.032, grilleW * 0.92, 0.022, 0.016, {
          materialRole: 'chrome',
          layer: 'detail'
        });
      }
    } else if (cfg.grilleStyle === 'split_bar') {
      batcher.addBox(0, fasciaMidY, frontZ + 0.032, 0.06, grilleH + 0.02, 0.02, {
        materialRole: 'primary',
        layer: 'detail'
      });
    }
  }

  const headX = Math.max(grilleW * 0.5 + 0.14, frontHalfW - 0.18);
  const headY = fasciaMidY + fasciaH * 0.08;
  for (const side of [-1, 1]) {
    if (cfg.headlightStyle === 'round_classic') {
      batcher.addCylinder(side * headX, headY, frontZ + 0.018, 0.095, 0.095, 0.03, 10, 'z', 'headlight', 'detail');
    } else if (cfg.headlightStyle === 'twin_quad') {
      batcher.addBox(side * (headX - 0.08), headY, frontZ + 0.016, 0.11, 0.1, 0.03, {
        materialRole: 'headlight',
        layer: 'detail'
      });
      batcher.addBox(side * (headX + 0.06), headY, frontZ + 0.016, 0.11, 0.1, 0.03, {
        materialRole: 'headlight',
        layer: 'detail'
      });
    } else if (cfg.headlightStyle === 'slit_modern') {
      batcher.addBox(side * headX, headY + 0.02, frontZ + 0.016, 0.24, 0.065, 0.03, {
        materialRole: 'headlight',
        layer: 'detail'
      });
    } else if (cfg.headlightStyle === 'flush_bar') {
      batcher.addBox(side * headX, headY, frontZ + 0.018, 0.28, 0.075, 0.03, {
        materialRole: 'headlight',
        layer: 'detail'
      });
    } else {
      batcher.addBox(side * headX, headY, frontZ + 0.016, 0.22, 0.11, 0.03, {
        materialRole: 'headlight',
        layer: 'detail'
      });
    }
    // Amber corner turn indicator
    batcher.addBox(side * (headX + 0.12), headY - 0.02, frontZ + 0.008, 0.05, 0.07, 0.03, {
      materialRole: 'amberLight',
      layer: 'detail'
    });
  }
  if (cfg.headlightStyle === 'flush_bar') {
    batcher.addBox(0, headY, frontZ + 0.016, headX * 1.8, 0.045, 0.024, {
      materialRole: 'headlight',
      layer: 'detail'
    });
  }

  // 2. Rear Taillights & License Plates
  const tailY = clamp(d.beltY - 0.16, gc + 0.28, d.beltY - 0.06);
  const tailX = rearHalfW - 0.17;
  if (cfg.taillightStyle === 'wide_bar') {
    batcher.addBox(0, tailY, rearZ - 0.015, rearHalfW * 1.82, 0.085, 0.03, {
      materialRole: 'taillight',
      layer: 'detail'
    });
  } else {
    for (const side of [-1, 1]) {
      if (cfg.taillightStyle === 'vertical_stack') {
        batcher.addBox(side * tailX, tailY + 0.06, rearZ - 0.016, 0.11, 0.26, 0.03, {
          materialRole: 'taillight',
          layer: 'detail'
        });
        batcher.addBox(side * tailX, tailY + 0.22, rearZ - 0.018, 0.11, 0.06, 0.03, {
          materialRole: 'amberLight',
          layer: 'detail'
        });
      } else if (cfg.taillightStyle === 'round_dual') {
        batcher.addCylinder(side * (tailX - 0.07), tailY, rearZ - 0.018, 0.055, 0.055, 0.03, 10, 'z', 'taillight', 'detail');
        batcher.addCylinder(side * (tailX + 0.06), tailY, rearZ - 0.018, 0.055, 0.055, 0.03, 10, 'z', 'amberLight', 'detail');
      } else {
        batcher.addBox(side * tailX, tailY, rearZ - 0.016, 0.22, 0.1, 0.03, {
          materialRole: 'taillight',
          layer: 'detail'
        });
        batcher.addBox(side * (tailX + 0.08), tailY, rearZ - 0.018, 0.06, 0.09, 0.03, {
          materialRole: 'amberLight',
          layer: 'detail'
        });
      }
    }
  }

  if (cfg.licensePlates) {
    const plateRng = rng32((Number(cfg.seed) || 1024) + 503);
    const digits = Math.floor(100 + plateRng() * 899);
    const suffix = pick(plateRng, ['Ct', 'Rd', 'St', 'Vn', 'Tx', 'Bs', 'Zk', 'Lm']);
    const plateCode = `B-${digits}-${suffix}`;
    vehLicensePlate(rootGroup, plateCode, 0.34, 0.11, 0, fasciaBotY + 0.04, frontZ + 0.075, 0);
    vehLicensePlate(rootGroup, plateCode, 0.34, 0.11, 0, Math.max(fasciaBotY + 0.14, tailY - 0.08), rearZ - 0.024, Math.PI);
  }

  // 3. Exhaust Pipes
  if (cfg.exhaustStyle === 'vertical_stack') {
    const stackX = d.halfWidth - 0.16;
    const stackZ = s.cabin.startZ + 0.05;
    const stackH = Math.max(0.8, d.height - d.beltY + 0.35);
    batcher.addCylinder(stackX, d.beltY + stackH * 0.42, stackZ, 0.045, 0.045, stackH, 8, 'y', 'chrome', 'detail');
  } else if (cfg.exhaustStyle !== 'hidden') {
    const pipeX = rearHalfW * 0.56;
    batcher.addCylinder(pipeX, gc + 0.03, rearZ - 0.04, 0.035, 0.035, 0.24, 8, 'z', 'chrome', 'detail');
    if (cfg.exhaustStyle === 'dual') {
      batcher.addCylinder(-pipeX, gc + 0.03, rearZ - 0.04, 0.035, 0.035, 0.24, 8, 'z', 'chrome', 'detail');
    }
  }

  // 4. Side Mirrors
  if (cfg.mirrorStyle !== 'none') {
    const mirZ = s.cabin.endZ - 0.14;
    const mirY = d.beltY + 0.1;
    const armOut = cfg.mirrorStyle === 'bus_extended' ? 0.2 : cfg.mirrorStyle === 'truck_tow' ? 0.16 : 0.11;
    const mirW = cfg.mirrorStyle === 'compact' ? 0.11 : 0.14;
    const mirH = cfg.mirrorStyle === 'truck_tow' || cfg.mirrorStyle === 'bus_extended' ? 0.22 : 0.1;
    for (const side of [-1, 1]) {
      const baseX = side * d.halfWidth * 0.94;
      batcher.addBox(baseX + side * (armOut * 0.45), mirY, mirZ, armOut, 0.028, 0.03, {
        materialRole: 'trim',
        layer: 'detail'
      });
      batcher.addBox(baseX + side * armOut, mirY + (cfg.mirrorStyle === 'truck_tow' ? 0.04 : 0.01), mirZ, mirW, mirH, 0.06, {
        materialRole: cfg.mirrorStyle === 'standard' ? 'primary' : 'trim',
        layer: 'detail'
      });
    }
  }

  // 5. Side Trim & Livery / Utility Panels
  const trimLen = Math.max(0.8, s.hood.startZ - s.rear.startZ - 0.35);
  const trimZ = (s.rear.startZ + s.hood.startZ) * 0.5;
  const trimY = lerp(gc, d.beltY, 0.48);

  if (cfg.sideTrim === 'rub_strip' || cfg.sideTrim === 'chrome_band') {
    const matRole = cfg.sideTrim === 'chrome_band' ? 'chrome' : 'trim';
    for (const side of [-1, 1]) {
      batcher.addBox(side * (d.halfWidth + 0.008), trimY, trimZ, 0.024, 0.055, trimLen, {
        materialRole: matRole,
        layer: 'detail'
      });
    }
  } else if (cfg.sideTrim === 'lower_cladding') {
    const frontAxle = layout.axles[0];
    const rearAxle = layout.axles[1];
    const midSpan = (frontAxle.z - d.wheelArchRadius) - (rearAxle.z + d.wheelArchRadius);
    if (midSpan > 0.35) {
      const midZ = (frontAxle.z + rearAxle.z) * 0.5;
      for (const side of [-1, 1]) {
        batcher.addBox(side * (d.halfWidth + 0.01), gc + 0.1, midZ, 0.032, 0.18, midSpan - 0.04, {
          materialRole: 'trim',
          layer: 'detail'
        });
      }
    }
  }

  if (cfg.sideUtility === 'checker_trim') {
    const chkLen = Math.max(0.8, d.length * 0.44);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (d.halfWidth + 0.012), trimY + 0.07, 0, 0.022, 0.11, chkLen, {
        materialRole: 'checker',
        layer: 'detail'
      });
    }
  } else if (cfg.sideUtility === 'livery_stripe') {
    const stLen = Math.max(1.0, d.length - 0.45);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (d.halfWidth + 0.012), trimY + 0.06, 0, 0.022, 0.12, stLen, {
        materialRole: 'livery',
        layer: 'detail'
      });
    }
  } else if (cfg.sideUtility === 'branding_panels') {
    const panelZ0 = s.rear.startZ + 0.25;
    const panelZ1 = Math.min(s.cabin.endZ - 0.35, s.rear.endZ + 0.8);
    const panelLen = Math.max(0.8, panelZ1 - panelZ0);
    const panelMidZ = (panelZ0 + panelZ1) * 0.5;
    const panelY = cfg.bodyFamily === 'cab_over_box' ? lerp(d.beltY, d.cargoRoofTopY, 0.5) : d.beltY - 0.12;
    const panelH = cfg.bodyFamily === 'cab_over_box' ? 0.52 : 0.28;
    const panelX = d.halfWidth + (cfg.bodyFamily === 'cab_over_box' ? 0.045 : 0.014);
    for (const side of [-1, 1]) {
      batcher.addBox(side * panelX, panelY, panelMidZ, 0.024, panelH, panelLen, {
        materialRole: 'secondary',
        layer: 'detail'
      });
      batcher.addBox(side * (panelX + side * 0.008), panelY, panelMidZ, 0.016, panelH * 0.28, panelLen * 0.86, {
        materialRole: 'livery',
        layer: 'detail'
      });
    }
  } else if (cfg.sideUtility === 'utility_bins') {
    const binLen = Math.max(0.7, s.rear.length * 0.68);
    const binZ = (s.rear.startZ + s.rear.endZ) * 0.5;
    for (const side of [-1, 1]) {
      batcher.addBox(side * (d.halfWidth + 0.03), d.beltY - 0.18, binZ, 0.08, 0.32, binLen, {
        materialRole: 'utility',
        layer: 'detail'
      });
      batcher.addBox(side * (d.halfWidth + 0.075), d.beltY - 0.16, binZ, 0.018, 0.05, 0.12, {
        materialRole: 'chrome',
        layer: 'detail'
      });
    }
  } else if (cfg.sideUtility === 'serving_window') {
    // Food truck curb-side (+X) service hatch, fold-out counter shelf & striped awning
    const winLen = clamp(s.rear.length * 0.64, 1.1, 2.6);
    const winZ = (s.rear.startZ + s.rear.endZ) * 0.5;
    const winX = d.halfWidth + 0.045;
    const winBotY = d.beltY - 0.06;
    const winTopY = Math.max(winBotY + 0.65, d.cargoRoofTopY - 0.24);
    const winMidY = (winBotY + winTopY) * 0.5;
    const winH = winTopY - winBotY;

    batcher.addBox(winX - 0.015, winMidY, winZ, 0.045, winH, winLen, {
      materialRole: 'interiorDark',
      layer: 'detail'
    });
    batcher.addBox(winX + 0.09, winBotY + 0.02, winZ, 0.24, 0.045, winLen + 0.08, {
      materialRole: 'chrome',
      layer: 'detail'
    });
    const slats = 6;
    const slatStep = (winLen + 0.18) / slats;
    for (let i = 0; i < slats; i++) {
      const sz = winZ - (winLen + 0.18) * 0.5 + (i + 0.5) * slatStep;
      batcher.addBox(winX + 0.26, winTopY + 0.02, sz, 0.54, 0.04, slatStep * 0.96, {
        rotZ: degToRad(-18),
        materialRole: i % 2 === 0 ? 'livery' : 'secondary',
        layer: 'detail'
      });
    }
    if (!cfg.taxiSign && !cfg.busRouteSign && rootGroup) {
      vehSignboard(rootGroup, cfg.signText || 'City Bites', Math.min(1.5, winLen * 0.65), 0.22, '#f5ede0', '#b83c24', {
        x: 0,
        y: Math.max(d.height, d.cargoRoofTopY) + 0.14,
        z: winZ,
        depth: 0.08,
        lit: cfg.emergencyLightsLit,
        frameMaterial: materialBundle.trim,
        frameRole: 'trim',
        layer: 'detail'
      });
    }
  }

  // Role-specific side emblems (police door star/plaque, ambulance medical cross)
  if (cfg.roleVariant === 'police') {
    const badgeZ = lerp(s.cabin.startZ, s.cabin.endZ, 0.58);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (d.halfWidth + 0.014), trimY + 0.09, badgeZ, 0.02, 0.16, 0.22, {
        materialRole: 'amberLight',
        layer: 'detail'
      });
      batcher.addBox(side * (d.halfWidth + 0.018), trimY + 0.09, badgeZ, 0.022, 0.09, 0.12, {
        materialRole: 'livery',
        layer: 'detail'
      });
    }
  } else if (cfg.roleVariant === 'ambulance') {
    const crossZ = (s.rear.startZ + s.rear.endZ) * 0.5;
    const crossY = lerp(d.beltY, Math.max(d.height, d.cargoRoofTopY), 0.52);
    const crossX = d.halfWidth + (cfg.bodyFamily === 'cab_over_box' ? 0.05 : 0.016);
    for (const side of [-1, 1]) {
      batcher.addBox(side * crossX, crossY, crossZ, 0.022, 0.34, 0.11, {
        materialRole: 'redLight',
        layer: 'detail'
      });
      batcher.addBox(side * crossX, crossY, crossZ, 0.022, 0.11, 0.34, {
        materialRole: 'redLight',
        layer: 'detail'
      });
    }
  }

  // 6. Front & Rear Attachments
  if (cfg.frontAttachment !== 'none') {
    const attZ = frontZ + 0.12;
    const barW = cfg.frontAttachment === 'bumper_guards' ? grilleW * 0.72 : frontHalfW * 1.45;
    const barH = cfg.frontAttachment === 'bull_bar' ? 0.34 : 0.26;
    const barY = gc + 0.16 + barH * 0.45;
    for (const side of [-1, 1]) {
      batcher.addBox(side * (barW * 0.38), barY, attZ, 0.055, barH, 0.06, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
    if (cfg.frontAttachment === 'bull_bar' || cfg.frontAttachment === 'winch_bumper') {
      batcher.addBox(0, barY + barH * 0.36, attZ, barW, 0.05, 0.055, {
        materialRole: 'trim',
        layer: 'detail'
      });
      batcher.addBox(0, barY - barH * 0.12, attZ, barW, 0.05, 0.055, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
    if (cfg.frontAttachment === 'winch_bumper') {
      batcher.addBox(0, gc + 0.24, attZ + 0.02, 0.38, 0.14, 0.14, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
  }

  if (cfg.rearAttachment === 'spare_tire') {
    batcher.addCylinder(0, tailY + 0.06, rearZ - 0.14, d.wheelRadius * 0.85, d.wheelRadius * 0.85, d.wheelThickness * 0.88, 12, 'z', 'tire', 'detail');
    batcher.addCylinder(0, tailY + 0.06, rearZ - 0.19, d.wheelRadius * 0.46, d.wheelRadius * 0.46, 0.08, 10, 'z', 'rim', 'detail');
  } else if (cfg.rearAttachment === 'cargo_step') {
    batcher.addBox(0, gc + 0.08, rearZ - 0.16, rearHalfW * 1.5, 0.05, 0.22, {
      materialRole: 'utility',
      layer: 'detail'
    });
  } else if (cfg.rearAttachment === 'tow_hook') {
    batcher.addBox(0, gc + 0.08, rearZ - 0.12, 0.12, 0.08, 0.18, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    batcher.addCylinder(0, gc + 0.14, rearZ - 0.19, 0.032, 0.032, 0.06, 8, 'y', 'chrome', 'detail');
  } else if (cfg.rearAttachment === 'rear_ladder') {
    const ladTop = Math.max(d.height, d.cargoRoofTopY) - 0.05;
    const ladBot = gc + 0.24;
    const ladH = ladTop - ladBot;
    const ladX = rearHalfW * 0.56;
    for (const rail of [-0.14, 0.14]) {
      batcher.addBox(ladX + rail, ladBot + ladH * 0.5, rearZ - 0.08, 0.035, ladH, 0.035, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
    const rungs = Math.max(4, Math.floor(ladH / 0.26));
    for (let i = 1; i < rungs; i++) {
      batcher.addBox(ladX, ladBot + (i / rungs) * ladH, rearZ - 0.08, 0.28, 0.028, 0.028, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
  } else if (cfg.rearAttachment === 'tow_boom') {
    const boomBaseZ = s.rear.endZ - 0.35;
    const boomTipZ = rearZ - 0.38;
    const boomBaseY = d.beltY - 0.05;
    const boomTipY = d.beltY + 0.72;
    const dy = boomTipY - boomBaseY;
    const dz = boomTipZ - boomBaseZ;
    const boomLen = Math.hypot(dy, dz);
    const rotX = -Math.atan2(dz, dy);
    for (const side of [-1, 1]) {
      batcher.addBox(side * 0.26, (boomBaseY + boomTipY) * 0.5, (boomBaseZ + boomTipZ) * 0.5, 0.09, boomLen, 0.11, {
        rotX,
        materialRole: 'utility',
        layer: 'detail'
      });
    }
    batcher.addBox(0, boomTipY, boomTipZ, 0.64, 0.12, 0.14, {
      materialRole: 'trim',
      layer: 'detail'
    });
    batcher.addCylinder(0, d.beltY + 0.08, boomBaseZ - 0.12, 0.16, 0.16, 0.54, 10, 'x', 'chrome', 'detail');
    // Under-lift wheel cradle T-bar
    batcher.addBox(0, gc + 0.16, rearZ - 0.32, 0.14, 0.1, 0.72, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    batcher.addBox(0, gc + 0.16, rearZ - 0.64, 1.32, 0.09, 0.11, {
      materialRole: 'utility',
      layer: 'detail'
    });
  } else if (cfg.rearAttachment === 'compactor_hopper') {
    const hopTopY = Math.max(d.height, d.cargoRoofTopY) - 0.06;
    const hopBotY = gc + 0.24;
    const hopH = Math.max(0.95, hopTopY - hopBotY);
    const hopMidY = (hopTopY + hopBotY) * 0.5;
    const hopW = rearHalfW * 1.9;
    batcher.addBox(0, hopMidY, rearZ - 0.28, hopW, hopH * 0.92, 0.68, {
      materialRole: 'secondary',
      layer: 'body'
    });
    batcher.addBox(0, hopBotY + 0.28, rearZ - 0.62, hopW * 0.88, 0.42, 0.26, {
      materialRole: 'interiorDark',
      layer: 'detail'
    });
    batcher.addBox(0, hopTopY - 0.18, rearZ - 0.56, hopW * 0.96, 0.22, 0.34, {
      rotX: degToRad(26),
      materialRole: 'utility',
      layer: 'detail'
    });
    for (const side of [-1, 1]) {
      batcher.addCylinder(side * (hopW * 0.48), hopMidY, rearZ - 0.35, 0.048, 0.048, hopH * 0.62, 8, 'y', 'chrome', 'detail');
    }
  }

  // 7. Rooftop Equipment, Beacons, Taxi Sign & Bus Route Sign
  const isOpenTop = cfg.bodyFamily === 'convertible_open';
  const cabRoofY = s.roofMount.cabRoofY;
  const cabMidZ = (s.roofMount.cabRoofMinZ + s.roofMount.cabRoofMaxZ) * 0.5;
  const rackSurfaceY = s.roofMount.surfaceY;
  const rackMidZ = (s.roofMount.minZ + s.roofMount.maxZ) * 0.5;
  const rackSpanZ = Math.max(0.5, s.roofMount.maxZ - s.roofMount.minZ);
  const roofW = d.width * d.roofWidthRatio * 0.78;

  if (!isOpenTop && cfg.lightBar !== 'none') {
    const barY = cabRoofY + 0.065;
    const barZ = lerp(s.roofMount.cabRoofMinZ, s.roofMount.cabRoofMaxZ, 0.62);
    if (cfg.lightBar === 'vintage_beacon') {
      batcher.addCylinder(0, barY + 0.02, barZ, 0.08, 0.095, 0.13, 10, 'y', 'redLight', 'detail');
      batcher.addCylinder(0, cabRoofY + 0.02, barZ, 0.105, 0.11, 0.04, 10, 'y', 'chrome', 'detail');
    } else {
      const barW = clamp(roofW * 0.88, 0.78, 1.38);
      batcher.addBox(0, cabRoofY + 0.025, barZ, barW * 0.94, 0.035, 0.18, {
        materialRole: 'trim',
        layer: 'detail'
      });
      if (cfg.lightBar === 'police_bar') {
        batcher.addBox(-barW * 0.32, barY + 0.01, barZ, barW * 0.34, 0.08, 0.18, { materialRole: 'redLight', layer: 'detail' });
        batcher.addBox(0, barY + 0.01, barZ, barW * 0.24, 0.08, 0.18, { materialRole: 'headlight', layer: 'detail' });
        batcher.addBox(barW * 0.32, barY + 0.01, barZ, barW * 0.34, 0.08, 0.18, { materialRole: 'blueLight', layer: 'detail' });
      } else if (cfg.lightBar === 'ambulance_bar') {
        batcher.addBox(-barW * 0.32, barY + 0.01, barZ, barW * 0.34, 0.085, 0.19, { materialRole: 'redLight', layer: 'detail' });
        batcher.addBox(0, barY + 0.01, barZ, barW * 0.26, 0.085, 0.19, { materialRole: 'headlight', layer: 'detail' });
        batcher.addBox(barW * 0.32, barY + 0.01, barZ, barW * 0.34, 0.085, 0.19, { materialRole: 'redLight', layer: 'detail' });
      } else {
        batcher.addBox(0, barY + 0.01, barZ, barW, 0.08, 0.18, { materialRole: 'amberLight', layer: 'detail' });
      }
    }
  }

  if (!isOpenTop && cfg.taxiSign) {
    const signZ = cfg.lightBar !== 'none' ? cabMidZ - 0.28 : cabMidZ + 0.08;
    vehSignboard(rootGroup, cfg.signText || 'City Taxi', 0.48, 0.13, '#f3d163', '#191d22', {
      x: 0,
      y: cabRoofY + 0.085,
      z: signZ,
      depth: 0.14,
      doubleSided: true,
      lit: cfg.emergencyLightsLit,
      frameMaterial: materialBundle.trim,
      frameRole: 'trim',
      layer: 'detail'
    });
  }

  if (cfg.busRouteSign) {
    const signW = clamp(roofW * 0.82, 0.72, 1.45);
    const signY = d.height - 0.14;
    const signZ = s.cabin.roofEndZ + 0.05;
    vehSignboard(rootGroup, cfg.signText || 'Metro 42', signW, 0.18, '#17222d', '#f5c242', {
      x: 0,
      y: signY,
      z: signZ,
      depth: 0.08,
      lit: cfg.emergencyLightsLit,
      frameMaterial: materialBundle.trim,
      frameRole: 'trim',
      layer: 'detail'
    });
  }

  if (!isOpenTop && (cfg.roofRack === 'luggage_rack' || cfg.roofRack === 'utility_rack')) {
    const rkLen = Math.max(0.55, rackSpanZ * 0.72);
    const rkW = clamp(roofW * 0.82, 0.75, 1.5);
    const rkZ = cfg.lightBar !== 'none' && rackSurfaceY === cabRoofY ? rackMidZ - 0.22 : rackMidZ;
    for (const side of [-1, 1]) {
      batcher.addBox(side * (rkW * 0.5), rackSurfaceY + 0.045, rkZ, 0.04, 0.07, rkLen, {
        materialRole: 'trim',
        layer: 'detail'
      });
    }
    const bars = 4;
    for (let i = 0; i < bars; i++) {
      const bz = rkZ - rkLen * 0.45 + (i / (bars - 1)) * (rkLen * 0.9);
      batcher.addBox(0, rackSurfaceY + 0.045, bz, rkW, 0.035, 0.04, {
        materialRole: 'utility',
        layer: 'detail'
      });
    }
    // Seed-driven deterministic rooftop crates & cargo cases
    const cargoRng = rng32((Number(cfg.seed) || 1024) + 709);
    const crateCount = cfg.roofRack === 'utility_rack' ? 2 + Math.floor(cargoRng() * 2) : 1 + Math.floor(cargoRng() * 2);
    for (let k = 0; k < crateCount; k++) {
      const cw = clamp(rkW * (0.28 + cargoRng() * 0.24), 0.24, rkW * 0.56);
      const cd = clamp(rkLen * (0.22 + cargoRng() * 0.22), 0.22, rkLen * 0.44);
      const ch = clamp(0.12 + cargoRng() * 0.14, 0.12, 0.26);
      const cx = (cargoRng() - 0.5) * Math.max(0.06, rkW - cw - 0.12);
      const cz = rkZ - rkLen * 0.28 + (k / Math.max(1, crateCount - 1)) * (rkLen * 0.54) + (cargoRng() - 0.5) * 0.06;
      const role = cfg.roofRack === 'utility_rack'
        ? pick(cargoRng, ['utility', 'trim', 'secondary'])
        : pick(cargoRng, ['livery', 'secondary', 'utility']);
      batcher.addBox(cx, rackSurfaceY + 0.06 + ch * 0.5, cz, cw, ch, cd, {
        materialRole: role,
        layer: 'detail'
      });
    }
  } else if (!isOpenTop && cfg.roofRack === 'ladder_rack') {
    const rkLen = Math.max(0.9, rackSpanZ * 0.85);
    const rkW = clamp(roofW * 0.88, 0.85, 1.65);
    for (const side of [-1, 1]) {
      batcher.addBox(side * (rkW * 0.5), rackSurfaceY + 0.12, rackMidZ, 0.045, 0.22, 0.05, { materialRole: 'utility', layer: 'detail' });
      batcher.addBox(side * (rkW * 0.5), rackSurfaceY + 0.12, rackMidZ - rkLen * 0.35, 0.045, 0.22, 0.05, { materialRole: 'utility', layer: 'detail' });
      batcher.addBox(side * (rkW * 0.5), rackSurfaceY + 0.12, rackMidZ + rkLen * 0.35, 0.045, 0.22, 0.05, { materialRole: 'utility', layer: 'detail' });
    }
    // Stylized ladder resting on rack
    for (const rail of [-0.2, 0.2]) {
      batcher.addBox(rail, rackSurfaceY + 0.25, rackMidZ, 0.04, 0.05, rkLen * 1.05, { materialRole: 'chrome', layer: 'detail' });
    }
    const rungs = Math.max(4, Math.floor(rkLen / 0.32));
    for (let i = 0; i < rungs; i++) {
      const rz = rackMidZ - rkLen * 0.45 + (i / Math.max(1, rungs - 1)) * (rkLen * 0.9);
      batcher.addBox(0, rackSurfaceY + 0.25, rz, 0.4, 0.03, 0.03, { materialRole: 'chrome', layer: 'detail' });
    }
  } else if (!isOpenTop && cfg.roofRack === 'delivery_pod') {
    const podZ = cfg.bodyFamily === 'cab_over_box' ? cabMidZ : lerp(s.roofMount.minZ, s.roofMount.maxZ, 0.72);
    const podY = cfg.bodyFamily === 'cab_over_box' ? cabRoofY : rackSurfaceY;
    const podW = clamp(roofW * 0.82, 0.8, 1.5);
    const podH = cfg.bodyFamily === 'cab_over_box' ? Math.max(0.24, (d.cargoRoofTopY - cabRoofY) * 0.78) : 0.24;
    batcher.addLoftedSlices([
      { z: podZ - 0.42, bottomY: podY, beltY: podY + podH * 0.5, topY: podY + podH, hwBottom: podW * 0.5, hwBelt: podW * 0.5, hwTop: podW * 0.42, chamferBot: 0.02, chamferTop: 0.04 },
      { z: podZ + 0.42, bottomY: podY, beltY: podY + podH * 0.25, topY: podY + 0.06, hwBottom: podW * 0.46, hwBelt: podW * 0.44, hwTop: podW * 0.38, chamferBot: 0.01, chamferTop: 0.02 }
    ], 'primary', 'detail');
  } else if (!isOpenTop && cfg.roofRack === 'bus_ac_unit') {
    const acW = clamp(roofW * 0.7, 0.75, 1.48);
    const acL = clamp(rackSpanZ * 0.38, 0.75, 2.2);
    batcher.addBox(0, rackSurfaceY + 0.1, rackMidZ, acW, 0.2, acL, {
      materialRole: 'utility',
      layer: 'detail'
    });
    batcher.addBox(0, rackSurfaceY + 0.205, rackMidZ, acW * 0.82, 0.02, acL * 0.75, {
      materialRole: 'trim',
      layer: 'detail'
    });
  }

  // Antennas (mount on rear fender deck for open convertibles)
  const antCount = clamp(Math.round(cfg.antennaCount || 0), 0, 2);
  for (let i = 0; i < antCount; i++) {
    const ax = antCount === 1
      ? (isOpenTop ? d.halfWidth * 0.72 : roofW * 0.32)
      : (i === 0 ? -roofW * 0.35 : roofW * 0.35);
    const az = isOpenTop ? s.rear.startZ + 0.24 : s.roofMount.cabRoofMinZ + 0.14;
    const ay = (isOpenTop ? d.beltY : cabRoofY) + 0.22;
    batcher.addCylinder(ax, ay, az, 0.01, 0.016, 0.44, 6, 'y', 'trim', 'detail');
  }
}
