import { clamp, degToRad, lerp } from '../utils.js';

function vehWinAddThickQuad(batcher, p0, p1, p2, p3, thick, materialRole, layer) {
  const n = computeQuadNormal(p0, p1, p2);
  const inset = [-n[0] * thick, -n[1] * thick, -n[2] * thick];
  const outer = [p0, p1, p2, p3];
  const inner = outer.map((p) => [p[0] + inset[0], p[1] + inset[1], p[2] + inset[2]]);
  batcher.addQuad(outer[0], outer[1], outer[2], outer[3], n, materialRole, layer);
  batcher.addQuad(inner[0], inner[3], inner[2], inner[1], [-n[0], -n[1], -n[2]], materialRole, layer);
  for (let k = 0; k < 4; k++) {
    const next = (k + 1) % 4;
    batcher.addQuad(outer[k], inner[k], inner[next], outer[next], null, materialRole, layer);
  }
}

function computeQuadNormal(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  return len > 1e-6 ? [nx / len, ny / len, nz / len] : [0, 1, 0];
}

function addFramedTrapezoidWindshield(batcher, zBot, zTop, yBot, yTop, hwBot, hwTop, widthScale, materialRole = 'glass', layer = 'glazing', isFront = true) {
  if (yTop <= yBot + 0.02 || hwBot <= 0.05) return;
  const solidOnly = widthScale <= 0;
  if (solidOnly) {
    const p0 = [isFront ? -hwBot : hwBot, yBot, zBot];
    const p1 = [isFront ? hwBot : -hwBot, yBot, zBot];
    const p2 = [isFront ? hwTop : -hwTop, yTop, zTop];
    const p3 = [isFront ? -hwTop : hwTop, yTop, zTop];
    vehWinAddThickQuad(batcher, p0, p1, p2, p3, 0.045, 'primary', 'body');
    return;
  }

  const clampedScale = clamp(widthScale, 0.55, 0.96);
  const wBot = hwBot * clampedScale;
  const wTop = hwTop * clampedScale;

  // Central windshield/rear glass trapezoid
  const g0 = [isFront ? -wBot : wBot, yBot, zBot];
  const g1 = [isFront ? wBot : -wBot, yBot, zBot];
  const g2 = [isFront ? wTop : -wTop, yTop, zTop];
  const g3 = [isFront ? -wTop : wTop, yTop, zTop];
  vehWinAddThickQuad(batcher, g0, g1, g2, g3, 0.028, materialRole, layer);

  // Left & right painted body cheeks sealing gaps between narrower glass and outer A/C-pillars
  if (hwBot > wBot + 0.008 || hwTop > wTop + 0.008) {
    if (isFront) {
      vehWinAddThickQuad(
        batcher,
        [-hwBot, yBot, zBot],
        [-wBot, yBot, zBot],
        [-wTop, yTop, zTop],
        [-hwTop, yTop, zTop],
        0.045,
        'primary',
        'body'
      );
      vehWinAddThickQuad(
        batcher,
        [wBot, yBot, zBot],
        [hwBot, yBot, zBot],
        [hwTop, yTop, zTop],
        [wTop, yTop, zTop],
        0.045,
        'primary',
        'body'
      );
    } else {
      vehWinAddThickQuad(
        batcher,
        [hwBot, yBot, zBot],
        [wBot, yBot, zBot],
        [wTop, yTop, zTop],
        [hwTop, yTop, zTop],
        0.045,
        'primary',
        'body'
      );
      vehWinAddThickQuad(
        batcher,
        [-wBot, yBot, zBot],
        [-hwBot, yBot, zBot],
        [-hwTop, yTop, zTop],
        [-wTop, yTop, zTop],
        0.045,
        'primary',
        'body'
      );
    }
  }
}

function addTrapezoidSideBay(batcher, side, zBotA, zBotB, zTopA, zTopB, yBot, yTop, hwBot, hwTop, flushOffset = 0, materialRole = 'glass', layer = 'glazing') {
  if (zBotB <= zBotA + 0.08 || zTopB <= zTopA + 0.05 || yTop <= yBot + 0.04) return;
  const xB = side * (hwBot + flushOffset);
  const xT = side * (hwTop + flushOffset);
  const br = [xB, yBot, zBotA];
  const bf = [xB, yBot, zBotB];
  const tf = [xT, yTop, zTopB];
  const tr = [xT, yTop, zTopA];
  if (side > 0) {
    vehWinAddThickQuad(batcher, bf, br, tr, tf, 0.03, materialRole, layer);
  } else {
    vehWinAddThickQuad(batcher, br, bf, tf, tr, 0.03, materialRole, layer);
  }
}

function addSlopedSidePillar(batcher, side, zBot, zTop, widthZ, yBot, yTop, hwBot, hwTop, materialRole = 'trim') {
  const dx = side * (hwTop - hwBot);
  const dy = yTop - yBot;
  const dz = zTop - zBot;
  const len = Math.hypot(dx, dy, dz);
  const rotX = Math.atan2(dz, Math.hypot(dx, dy));
  const rotZ = -Math.atan2(dx, dy);
  const xCenter = side * ((hwBot + hwTop) * 0.5 - 0.006);
  batcher.addBox(
    xCenter,
    (yBot + yTop) * 0.5,
    (zBot + zTop) * 0.5,
    0.052,
    len,
    widthZ,
    {
      rotX,
      rotZ,
      materialRole,
      layer: 'body'
    }
  );
}

export function buildVehicleDoorsAndWindows(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const cab = s.cabin;
  const beltY = d.beltY;
  const roofEaveY = d.height - clamp(0.08 + cfg.roofRounding * 0.16, 0.07, 0.14);
  const beltHalfW = d.halfWidth * 0.96;
  const roofHalfW = d.halfWidth * d.roofWidthRatio;
  const flushOffset = cfg.framelessWindows ? 0.012 : -0.008;
  const isCargoBox = cfg.bodyFamily === 'cab_over_box' || cfg.bodyFamily === 'semi_trailer';
  const isOpenTop = cfg.bodyFamily === 'convertible_open';
  const isArticulated = cfg.bodyFamily === 'articulated_bus';
  const isDoubleDecker = cfg.bodyFamily === 'double_decker';
  const isCargoVanSolid = cfg.bodyFamily === 'van_monobox' && cfg.doorLayout !== 'transit_bus';
  const midDeckY = isDoubleDecker ? lerp(beltY, roofEaveY, 0.46) : roofEaveY;
  const midHalfW = isDoubleDecker ? lerp(beltHalfW, roofHalfW, 0.46) : roofHalfW;

  // Front Windshield (trapezoidal glass + body cheeks, dual deck when double_decker)
  const wsBotY = beltY - 0.01;
  const wsTopY = roofEaveY + 0.015;
  const wsZBot = cab.endZ - 0.025;
  const wsZTop = cab.roofEndZ + 0.025;
  if (isDoubleDecker) {
    const wsZMid = lerp(wsZBot, wsZTop, 0.46);
    addFramedTrapezoidWindshield(batcher, wsZBot, wsZMid, wsBotY, midDeckY - 0.1, beltHalfW - 0.03, midHalfW - 0.03, cfg.windshieldScale, 'glass', 'glazing', true);
    addFramedTrapezoidWindshield(batcher, wsZMid, wsZTop, midDeckY + 0.1, wsTopY, midHalfW - 0.03, roofHalfW - 0.03, cfg.windshieldScale, 'glass', 'glazing', true);
  } else {
    addFramedTrapezoidWindshield(batcher, wsZBot, wsZTop, wsBotY, wsTopY, beltHalfW - 0.03, roofHalfW - 0.03, cfg.windshieldScale, 'glass', 'glazing', true);
  }

  // Wraparound windshield corner glass accent on modern hatch/bus/retro-futuristic
  if (cfg.wraparoundGlass) {
    const cornerDy = wsTopY - wsBotY;
    const cornerDz = wsZTop - wsZBot;
    for (const side of [-1, 1]) {
      batcher.addBox(
        side * ((beltHalfW + roofHalfW) * 0.5 - 0.035),
        (wsBotY + wsTopY) * 0.5,
        (wsZBot + wsZTop) * 0.5,
        0.04,
        Math.hypot(cornerDy, cornerDz),
        0.16,
        {
          rotX: Math.atan2(cornerDz, cornerDy),
          materialRole: 'glass',
          layer: 'glazing'
        }
      );
    }
  }

  // Rear Window or Solid Trapezoid Closure
  if (!isOpenTop) {
    const rwZBot = cab.greenhouseBottomStartZ + 0.025;
    const rwZTop = cab.roofStartZ - 0.025;
    if (isDoubleDecker) {
      const rwZMid = lerp(rwZBot, rwZTop, 0.46);
      const ddRwScale = cfg.rearWindowScale > 0.36 ? cfg.rearWindowScale : 0;
      addFramedTrapezoidWindshield(batcher, rwZBot, rwZMid, wsBotY, midDeckY - 0.1, beltHalfW - 0.03, midHalfW - 0.03, ddRwScale, 'glass', 'glazing', false);
      addFramedTrapezoidWindshield(batcher, rwZMid, rwZTop, midDeckY + 0.1, wsTopY, midHalfW - 0.03, roofHalfW - 0.03, ddRwScale, 'glass', 'glazing', false);
    } else if (!isCargoBox && cfg.rearWindowScale > 0.36) {
      const rwScale = isCargoVanSolid ? Math.min(0.65, cfg.rearWindowScale) : cfg.rearWindowScale;
      const rwBotY = isCargoVanSolid ? beltY + 0.12 : wsBotY;
      addFramedTrapezoidWindshield(batcher, rwZBot, rwZTop, rwBotY, wsTopY, beltHalfW - 0.03, roofHalfW - 0.03, rwScale, 'glass', 'glazing', false);
      if (isCargoVanSolid) {
        addFramedTrapezoidWindshield(batcher, rwZBot, lerp(rwZBot, rwZTop, 0.25), wsBotY, rwBotY + 0.01, beltHalfW - 0.03, lerp(beltHalfW, roofHalfW, 0.25) - 0.03, 0, 'primary', 'body', false);
      }
    } else {
      addFramedTrapezoidWindshield(batcher, rwZBot, rwZTop, wsBotY, wsTopY, beltHalfW - 0.03, roofHalfW - 0.03, 0, 'primary', 'body', false);
    }
  }

  // Side Windows & Pillars (trapezoidal spans matching sloped A/C-pillars and roof header rails)
  const zBotRear = cab.greenhouseBottomStartZ + 0.04;
  const zBotFront = cab.endZ - 0.04;
  const zTopRear = cab.roofStartZ + 0.02;
  const zTopFront = cab.roofEndZ - 0.02;
  const winBotY = beltY - 0.008;
  const winTopY = roofEaveY + 0.015;
  const sideHwBot = beltHalfW - 0.025;
  const sideHwTop = roofHalfW - 0.025;
  const sideHwMid = isDoubleDecker ? midHalfW - 0.025 : sideHwTop;

  if (isOpenTop) {
    // Low rolled-down door glass trim strip on front doors only
    const ventZStart = Math.max(zBotRear + 0.1, cab.endZ - 1.15);
    const ventZEnd = cab.endZ - 0.22;
    if (ventZEnd > ventZStart + 0.18) {
      for (const side of [-1, 1]) {
        batcher.addBox(side * (beltHalfW - 0.03), beltY + 0.045, (ventZStart + ventZEnd) * 0.5, 0.028, 0.065, ventZEnd - ventZStart, {
          materialRole: 'glass',
          layer: 'glazing'
        });
      }
    }
  } else if (cfg.doorLayout === 'transit_bus') {
    const bays = clamp(Math.round(cfg.busWindowBays || 6), 2, 12);
    const mullionW = 0.075;
    const gapMinZ = isArticulated ? s.rear.endZ - 0.12 : 999;
    const gapMaxZ = isArticulated ? s.cabin.startZ + 0.12 : -999;
    const busSpan = Math.max(1.2, zBotFront - zBotRear);
    const padU = (mullionW * 0.42) / busSpan;

    for (let i = 0; i < bays; i++) {
      const uA = i / bays + (i === 0 ? 0.005 : padU);
      const uB = (i + 1) / bays - (i === bays - 1 ? 0.005 : padU);
      const bzBotA = lerp(zBotRear, zBotFront, uA);
      const bzBotB = lerp(zBotRear, zBotFront, uB);
      const bzTopA = lerp(zTopRear, zTopFront, uA);
      const bzTopB = lerp(zTopRear, zTopFront, uB);
      const bayMidZ = (bzBotA + bzBotB) * 0.5;
      if (isArticulated && bzBotB > gapMinZ && bzBotA < gapMaxZ) continue;

      const onBusDoor = layout.busDoors.some((bd) => Math.abs(bayMidZ - bd.z) < bd.width * 0.55);
      const mulBotZ = lerp(zBotRear, zBotFront, i / bays);
      const mulTopZ = lerp(zTopRear, zTopFront, i / bays);
      const mulInGap = isArticulated && mulBotZ > gapMinZ && mulBotZ < gapMaxZ;
      const mulOnDoor = layout.busDoors.some((bd) => Math.abs(mulBotZ - bd.z) < bd.width * 0.45);
      if (isDoubleDecker) {
        const bzMidA = lerp(bzBotA, bzTopA, 0.46);
        const bzMidB = lerp(bzBotB, bzTopB, 0.46);
        const mulMidZ = lerp(mulBotZ, mulTopZ, 0.46);
        for (const side of [-1, 1]) {
          addTrapezoidSideBay(batcher, side, bzMidA, bzMidB, bzTopA, bzTopB, midDeckY + 0.105, winTopY, sideHwMid, sideHwTop, flushOffset, 'glass', 'glazing');
          if (i > 0) {
            addSlopedSidePillar(batcher, side, mulMidZ, mulTopZ, mullionW, midDeckY + 0.105, winTopY, sideHwMid, sideHwTop, 'trim');
          }
          if (side === 1 && onBusDoor) continue;
          addTrapezoidSideBay(batcher, side, bzBotA, bzBotB, bzMidA, bzMidB, winBotY, midDeckY - 0.105, sideHwBot, sideHwMid, flushOffset, 'glass', 'glazing');
          if (i > 0 && !(side === 1 && mulOnDoor)) {
            addSlopedSidePillar(batcher, side, mulBotZ, mulMidZ, mullionW, winBotY, midDeckY - 0.105, sideHwBot, sideHwMid, 'trim');
          }
        }
      } else {
        for (const side of [-1, 1]) {
          if (side === 1 && onBusDoor) continue;
          addTrapezoidSideBay(batcher, side, bzBotA, bzBotB, bzTopA, bzTopB, winBotY, winTopY, sideHwBot, sideHwTop, flushOffset, 'glass', 'glazing');
          if (i > 0 && !mulInGap && !(side === 1 && mulOnDoor)) {
            addSlopedSidePillar(batcher, side, mulBotZ, mulTopZ, mullionW, winBotY, winTopY, sideHwBot, sideHwTop, 'trim');
          }
        }
      }
    }

    // Build recessed Bus Folding Entry Doors on curb side (+X)
    for (const bd of layout.busDoors) {
      const doorTopY = isDoubleDecker ? midDeckY - 0.115 : winTopY - 0.025;
      const doorBotY = d.groundClearance + 0.06;
      const doorH = doorTopY - doorBotY;
      const doorHalfW = bd.width * 0.5 - 0.03;
      const doorX = beltHalfW - 0.025;
      // Door frame
      batcher.addBox(doorX, doorBotY + doorH * 0.5, bd.z - bd.width * 0.5 + 0.03, 0.06, doorH, 0.05, {
        materialRole: 'trim',
        layer: 'detail'
      });
      batcher.addBox(doorX, doorBotY + doorH * 0.5, bd.z + bd.width * 0.5 - 0.03, 0.06, doorH, 0.05, {
        materialRole: 'trim',
        layer: 'detail'
      });
      // Twin door leaves with large upper & lower glass
      for (const leaf of [-1, 1]) {
        const lz = bd.z + leaf * (doorHalfW * 0.5);
        batcher.addBox(doorX - 0.015, doorBotY + doorH * 0.5, lz, 0.03, doorH - 0.06, doorHalfW - 0.03, {
          materialRole: 'glass',
          layer: 'glazing'
        });
        batcher.addBox(doorX - 0.005, doorBotY + doorH * 0.45, lz, 0.04, 0.14, doorHalfW - 0.02, {
          materialRole: 'trim',
          layer: 'detail'
        });
      }
    }
  } else if (isCargoVanSolid) {
    // Solid tapered cargo walls + front cab door windows (+ optional partial rear panel window)
    const spanLen = Math.max(1.4, zBotFront - zBotRear);
    const uCab = clamp(1 - 1.05 / spanLen, 0.35, 0.78);
    const cabSplitBotZ = lerp(zBotRear, zBotFront, uCab);
    const cabSplitTopZ = lerp(zTopRear, zTopFront, uCab);
    const partialBayLen = cabSplitBotZ - zBotRear;

    for (const side of [-1, 1]) {
      addTrapezoidSideBay(batcher, side, cabSplitBotZ + 0.03, zBotFront, cabSplitTopZ + 0.03, zTopFront, winBotY, winTopY, sideHwBot, sideHwTop, flushOffset, 'glass', 'glazing');
      addSlopedSidePillar(batcher, side, cabSplitBotZ, cabSplitTopZ, 0.085, winBotY, winTopY, sideHwBot, sideHwTop, 'primary');
      addTrapezoidSideBay(batcher, side, zBotRear, cabSplitBotZ - 0.02, zTopRear, cabSplitTopZ - 0.02, winBotY - 0.01, winTopY, sideHwBot, sideHwTop, 0.0, 'primary', 'body');
    }
    if (cfg.vanPartialWindows && partialBayLen > 0.65) {
      const partBot0 = Math.max(zBotRear + 0.12, cabSplitBotZ - 0.88);
      const partBot1 = cabSplitBotZ - 0.16;
      const partTop0 = lerp(zTopRear, zTopFront, clamp((partBot0 - zBotRear) / spanLen, 0.04, uCab - 0.04));
      const partTop1 = lerp(zTopRear, zTopFront, clamp((partBot1 - zBotRear) / spanLen, 0.08, uCab - 0.03));
      for (const side of [-1, 1]) {
        addTrapezoidSideBay(batcher, side, partBot0, partBot1, partTop0, partTop1, winBotY + 0.1, winTopY - 0.08, sideHwBot, sideHwTop, 0.022, 'glass', 'glazing');
      }
    }
  } else {
    // Standard 1..4 side window bays framed by sloped body pillars
    const segs = cfg.doorLayout === '2_door' || cfg.doorLayout === 'truck_cab'
      ? Math.min(2, cfg.sideWindowSegmentation)
      : clamp(Math.round(cfg.sideWindowSegmentation || 3), 1, 4);
    const pillarW = cfg.framelessWindows ? 0.045 : 0.08;
    const spanLen = Math.max(0.6, zBotFront - zBotRear);
    const padU = cfg.framelessWindows ? 0.005 : (pillarW * 0.45) / spanLen;
    for (let i = 0; i < segs; i++) {
      const uA = i / segs + (i === 0 ? 0.004 : padU);
      const uB = (i + 1) / segs - (i === segs - 1 ? 0.004 : padU);
      const wzBotA = lerp(zBotRear, zBotFront, uA);
      const wzBotB = lerp(zBotRear, zBotFront, uB);
      const wzTopA = lerp(zTopRear, zTopFront, uA);
      const wzTopB = lerp(zTopRear, zTopFront, uB);
      const pu = i / segs;
      const pilBotZ = lerp(zBotRear, zBotFront, pu);
      const pilTopZ = lerp(zTopRear, zTopFront, pu);
      for (const side of [-1, 1]) {
        addTrapezoidSideBay(batcher, side, wzBotA, wzBotB, wzTopA, wzTopB, winBotY, winTopY, sideHwBot, sideHwTop, flushOffset, 'glass', 'glazing');
        if (i > 0 && !cfg.framelessWindows) {
          addSlopedSidePillar(batcher, side, pilBotZ, pilTopZ, pillarW, winBotY, winTopY, sideHwBot, sideHwTop, 'trim');
        }
      }
    }
  }

  // Door Panel Seams & Door Handles along Lower Body
  const handleStyle = cfg.doorHandleStyle || 'bar';
  const doorZoneStart = Math.max(s.rear.startZ + 0.35, cab.startZ + 0.08);
  const doorZoneEnd = cab.endZ - 0.15;
  const seamH = Math.max(0.28, beltY - d.groundClearance - 0.18);
  const seamY = d.groundClearance + 0.12 + seamH * 0.5;
  const handleY = beltY - 0.12;

  const doorPositions = [];
  if (cfg.doorLayout === '4_door' || cfg.doorLayout === '5_door_hatch') {
    const midZ = (doorZoneStart + doorZoneEnd) * 0.5;
    doorPositions.push({ seamZ: midZ, handleZ: midZ + 0.14, isFront: true });
    doorPositions.push({ seamZ: doorZoneStart + 0.06, handleZ: doorZoneStart + 0.18, isFront: false });
  } else if (cfg.doorLayout === '2_door' || cfg.doorLayout === 'truck_cab') {
    const dFrontZ = lerp(doorZoneStart, doorZoneEnd, 0.25);
    doorPositions.push({ seamZ: dFrontZ, handleZ: dFrontZ + 0.15, isFront: true });
  } else if (cfg.doorLayout === 'van_sliding') {
    const dCabRear = cab.endZ - 0.95;
    doorPositions.push({ seamZ: dCabRear, handleZ: dCabRear + 0.14, isFront: true });
    if (cfg.slidingDoor) {
      const slideBack = Math.max(s.rear.startZ + 0.55, dCabRear - 1.15);
      doorPositions.push({ seamZ: slideBack, handleZ: dCabRear - 0.14, isSliding: true });
    }
  }

  for (const dp of doorPositions) {
    for (const side of [-1, 1]) {
      if (dp.isSliding && side === -1) continue;
      const sideX = side * (d.halfWidth - 0.008);
      batcher.addBox(sideX, seamY, dp.seamZ, 0.016, seamH, 0.018, {
        materialRole: 'trim',
        layer: 'detail'
      });

      if (dp.isSliding) {
        const trackLen = Math.max(0.6, dp.handleZ - dp.seamZ + 0.3);
        batcher.addBox(sideX + side * 0.006, beltY - 0.06, (dp.seamZ + dp.handleZ) * 0.5 - 0.15, 0.02, 0.024, trackLen, {
          materialRole: 'trim',
          layer: 'detail'
        });
        if (cfg.doorsOpen) {
          const slideSpan = clamp(dp.handleZ - dp.seamZ + 0.15, 0.72, 1.05);
          batcher.addBox(side * (d.halfWidth - 0.05), seamY + 0.08, (dp.seamZ + dp.handleZ) * 0.5, 0.08, seamH + 0.25, slideSpan * 0.9, {
            materialRole: 'interiorDark',
            layer: 'interior'
          });
          batcher.addBox(side * (d.halfWidth + 0.085), seamY + 0.06, dp.seamZ - 0.36, 0.06, seamH + 0.18, slideSpan, {
            materialRole: 'primary',
            layer: 'body'
          });
        }
      } else if (dp.isFront && cfg.doorsOpen) {
        const doorLen = clamp(doorZoneEnd - dp.seamZ, 0.68, 1.08);
        const hingeZ = dp.seamZ + doorLen;
        const swingRad = -side * degToRad(38);
        const leafX = side * (d.halfWidth - 0.02) + (-doorLen * 0.5) * Math.sin(swingRad);
        const leafZ = hingeZ - (doorLen * 0.5) * Math.cos(swingRad);
        // Dark interior doorway cutout behind open door
        batcher.addBox(side * (d.halfWidth - 0.04), seamY + 0.02, hingeZ - doorLen * 0.5, 0.07, seamH * 0.94, doorLen * 0.88, {
          materialRole: 'interiorDark',
          layer: 'interior'
        });
        // Swung door lower panel & mirror/handle pocket
        batcher.addBox(leafX, seamY, leafZ, 0.065, seamH, doorLen, {
          rotY: swingRad,
          materialRole: 'primary',
          layer: 'body'
        });
        if (!isOpenTop) {
          batcher.addBox(leafX - side * 0.03, (beltY + roofEaveY) * 0.5, leafZ, 0.038, Math.max(0.24, roofEaveY - beltY - 0.08), doorLen * 0.82, {
            rotY: swingRad,
            materialRole: 'glass',
            layer: 'glazing'
          });
        }
      }

      if (handleStyle !== 'none') {
        const hw = handleStyle === 'bar' ? 0.032 : 0.016;
        const hl = handleStyle === 'bar' ? 0.13 : 0.11;
        batcher.addBox(side * (d.halfWidth + hw * 0.35), handleY, dp.handleZ, hw, 0.032, hl, {
          materialRole: handleStyle === 'bar' ? 'chrome' : 'trim',
          layer: 'detail'
        });
      }
    }
  }

  // Rear Cargo Doors (Double Barn Doors or Roll-Up Shutter on Vans / Box Trucks / Semi Trailers)
  if (isCargoBox || isCargoVanSolid) {
    const rearZ = s.rear.startZ - 0.008;
    const doorTop = (isCargoBox ? d.cargoRoofTopY : roofEaveY) - 0.08;
    const doorBot = d.beltY - 0.25;
    const doorH = Math.max(0.45, doorTop - doorBot);
    const doorMidY = (doorTop + doorBot) * 0.5;
    const doorW = Math.max(0.8, d.width * d.rearWidthRatio * 0.72);

    if (cfg.rearCargoDoor === 'rollup_shutter') {
      if (cfg.doorsOpen) {
        batcher.addBox(0, doorMidY, rearZ + 0.025, doorW, doorH, 0.05, {
          materialRole: 'interiorDark',
          layer: 'interior'
        });
        const openShutterH = doorH * 0.28;
        const openShutterY = doorTop - openShutterH * 0.5;
        batcher.addBox(0, openShutterY, rearZ, doorW, openShutterH, 0.04, {
          materialRole: 'utility',
          layer: 'detail'
        });
        for (let k = 1; k < 3; k++) {
          batcher.addBox(0, doorTop - (k / 3) * openShutterH, rearZ - 0.014, doorW - 0.04, 0.022, 0.02, {
            materialRole: 'trim',
            layer: 'detail'
          });
        }
      } else {
        batcher.addBox(0, doorMidY, rearZ, doorW, doorH, 0.035, {
          materialRole: 'utility',
          layer: 'detail'
        });
        const slats = Math.max(4, Math.floor(doorH / 0.18));
        for (let k = 1; k < slats; k++) {
          batcher.addBox(0, doorBot + (k / slats) * doorH, rearZ - 0.012, doorW - 0.04, 0.022, 0.02, {
            materialRole: 'trim',
            layer: 'detail'
          });
        }
      }
    } else if (cfg.rearCargoDoor === 'double_barn') {
      if (cfg.doorsOpen) {
        batcher.addBox(0, doorMidY, rearZ + 0.025, doorW, doorH, 0.05, {
          materialRole: 'interiorDark',
          layer: 'interior'
        });
        const leafW = doorW * 0.48;
        for (const side of [-1, 1]) {
          const swingRad = -side * degToRad(105);
          const vecX = -side * (leafW * 0.5);
          const leafX = side * (doorW * 0.5) + vecX * Math.cos(swingRad);
          const leafZ = rearZ - vecX * Math.sin(swingRad);
          batcher.addBox(leafX, doorMidY, leafZ, leafW, doorH, 0.045, {
            rotY: swingRad,
            materialRole: 'secondary',
            layer: 'body'
          });
          batcher.addBox(leafX, doorMidY, leafZ, leafW * 0.96, 0.03, 0.055, {
            rotY: swingRad,
            materialRole: 'trim',
            layer: 'detail'
          });
        }
      } else {
        batcher.addBox(0, doorMidY, rearZ - 0.008, 0.03, doorH, 0.028, {
          materialRole: 'trim',
          layer: 'detail'
        });
        for (const side of [-1, 1]) {
          batcher.addBox(side * (doorW * 0.5 - 0.02), doorMidY, rearZ, 0.028, doorH, 0.025, {
            materialRole: 'trim',
            layer: 'detail'
          });
          batcher.addBox(side * 0.08, doorMidY - 0.1, rearZ - 0.015, 0.024, 0.14, 0.022, {
            materialRole: 'chrome',
            layer: 'detail'
          });
        }
      }
    }
  }
}
