import { VehicleBatcher } from '../geometry/primitives.js';

function trBogieBuildWheelsetGroup(axleIdx, localZ, wheelRadius, wheelCenterX, materialBundle) {
  const grp = new THREE.Group();
  grp.name = `Wheelset_${axleIdx}`;
  grp.position.set(0, wheelRadius, localZ);
  grp.userData = {
    pivotType: 'wheelset',
    axleIndex: axleIdx,
    localZ,
    wheelRadius
  };

  const batcher = new VehicleBatcher();

  // Solid steel axle shaft
  batcher.addCylinder(0, 0, 0, 0.062, 0.062, wheelCenterX * 2 + 0.34, 10, 'x', 'chassisDark', 'wheel');

  const treadW = 0.124;
  const flangeR = wheelRadius + 0.028;
  const flangeW = 0.024;
  const flangeX = wheelCenterX - treadW * 0.5 + flangeW * 0.5 - 0.008;

  for (const side of [-1, 1]) {
    const wx = side * wheelCenterX;

    // Steel wheel tread (rides at top-of-rail y = 0)
    batcher.addCylinder(wx, 0, 0, wheelRadius, wheelRadius, treadW, 16, 'x', 'tire', 'wheel');

    // Inner rail-guiding flange
    batcher.addCylinder(side * flangeX, 0, 0, flangeR, flangeR, flangeW, 16, 'x', 'chrome', 'wheel');

    // Outer recessed wheel plate & hub boss (makes wheel spin readable)
    batcher.addCylinder(wx + side * (treadW * 0.34), 0, 0, wheelRadius * 0.72, wheelRadius * 0.72, treadW * 0.42, 12, 'x', 'rim', 'wheel');
    batcher.addCylinder(wx + side * (treadW * 0.55), 0, 0, wheelRadius * 0.28, wheelRadius * 0.28, 0.045, 10, 'x', 'chrome', 'wheel');

    // Paired radial ribs on outer wheel face so wheel rotation reads clearly in motion
    batcher.addBox(wx + side * (treadW * 0.52), 0, 0, 0.018, wheelRadius * 1.15, 0.055, {
      materialRole: 'utility',
      layer: 'wheel'
    });
    batcher.addBox(wx + side * (treadW * 0.52), 0, 0, 0.018, 0.055, wheelRadius * 1.15, {
      materialRole: 'utility',
      layer: 'wheel'
    });
  }

  batcher.finalize(grp, materialBundle);
  return grp;
}

export function buildRailBogieGroup(bogieSpec, layout, cfg, materialBundle) {
  const grp = new THREE.Group();
  grp.name = `Bogie_${bogieSpec.id}`;
  grp.position.set(0, 0, bogieSpec.pivotZ);

  const d = layout.dimensions;
  const deckY = layout.rail.zones.deckY;
  const r = bogieSpec.wheelRadius;
  const wx = bogieSpec.wheelCenterX;
  const style = bogieSpec.style || cfg.railBogieStyle || 'loco_heavy';
  const isHeavyLoco = style === 'loco_heavy' || style === 'freight_3axle';
  const isPassenger = style === 'passenger_coil';

  const sideFrameX = wx + 0.22;
  const frameLen = bogieSpec.wheelbase + r * 2.15;
  const frameTopY = Math.min(deckY - 0.14, r * 1.48);
  const frameMidY = r * 0.92;

  const batcher = new VehicleBatcher();

  // Central bolster beam & kingpin column connecting cleanly up to carbody frame
  const bolsterW = sideFrameX * 2 + 0.16;
  batcher.addBox(0, frameTopY - 0.06, 0, bolsterW, 0.18, isHeavyLoco ? 0.58 : 0.44, {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });
  const kingpinTop = Math.max(frameTopY + 0.06, deckY - 0.02);
  batcher.addCylinder(0, (frameTopY + kingpinTop) * 0.5, 0, 0.34, 0.38, kingpinTop - frameTopY + 0.08, 12, 'y', 'chassisDark', 'chassis');

  // Longitudinal inner traction/brake support bars
  for (const side of [-1, 1]) {
    batcher.addBox(side * (wx * 0.48), frameMidY, 0, 0.09, 0.14, frameLen * 0.86, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
  }

  // Left & Right sideframes, coil/air suspension packs, journal bearing boxes, and brake shoes
  for (const side of [-1, 1]) {
    const sx = side * sideFrameX;

    // Upper sideframe beam
    batcher.addBox(sx, frameTopY, 0, 0.14, 0.16, frameLen, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });

    // Lower stepped sideframe bar between axles
    const lowerLen = Math.max(0.7, bogieSpec.wheelbase * 0.68);
    batcher.addBox(sx, r * 0.56, 0, 0.13, 0.13, lowerLen, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });

    // End tie cross-beams tying sideframes at front and rear of bogie
    const endTieZ = frameLen * 0.47;
    batcher.addBox(0, frameTopY - 0.02, endTieZ, sideFrameX * 2, 0.11, 0.11, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
    batcher.addBox(0, frameTopY - 0.02, -endTieZ, sideFrameX * 2, 0.11, 0.11, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });

    // Secondary suspension coils or passenger air-spring pods
    if (isPassenger) {
      batcher.addCylinder(sx, frameTopY + 0.04, 0, 0.19, 0.19, 0.24, 12, 'y', 'tire', 'chassis');
      batcher.addBox(sx, frameTopY - 0.06, 0.34, 0.08, 0.08, 0.42, { materialRole: 'utility', layer: 'chassis' });
    } else {
      for (const sOff of [-0.14, 0.14]) {
        batcher.addCylinder(sx + side * 0.01, frameMidY - 0.02, sOff, 0.085, 0.085, 0.28, 10, 'y', 'utility', 'chassis');
      }
    }

    // Axle pedestal jaws, roller bearing end-caps, brake beams & traction motors
    bogieSpec.localAxleZs.forEach((az) => {
      // Bearing housing box
      batcher.addBox(sx + side * 0.04, r, az, 0.16, 0.24, 0.26, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
      // Outer Timken-style journal end-cap
      batcher.addCylinder(sx + side * 0.12, r, az, 0.085, 0.085, 0.06, 8, 'x', 'utility', 'chassis');

      // Primary coil springs flanking each journal box
      for (const pOff of [-0.16, 0.16]) {
        batcher.addCylinder(sx, r + 0.13, az + pOff, 0.048, 0.048, 0.16, 8, 'y', 'utility', 'chassis');
      }

      // Brake shoe blocks beside wheel tread
      const shoeDir = az >= 0 ? -1 : 1;
      batcher.addBox(side * wx, r, az + shoeDir * (r * 0.96), 0.11, 0.19, 0.07, {
        materialRole: 'bumper',
        layer: 'chassis'
      });
    });

    // Sandboxes / lifeguards at outer bogie corners for locomotives
    if (isHeavyLoco) {
      for (const endSign of [-1, 1]) {
        batcher.addBox(side * wx, r * 0.58, endSign * (frameLen * 0.46), 0.11, 0.18, 0.1, {
          materialRole: 'utility',
          layer: 'chassis'
        });
      }
    }
  }

  // Traction motor blocks inside wheelset spans for powered / heavy bogies
  if (cfg.railPowered || isHeavyLoco) {
    bogieSpec.localAxleZs.forEach((az, i) => {
      const dir = i === 0 ? -1 : 1;
      batcher.addBox(0, r + 0.02, az + dir * 0.24, wx * 1.15, 0.28, 0.34, {
        materialRole: 'utility',
        layer: 'chassis'
      });
    });
  }

  batcher.finalize(grp, materialBundle);

  const wheelsets = bogieSpec.localAxleZs.map((az, idx) => {
    const ws = trBogieBuildWheelsetGroup(idx, az, r, wx, materialBundle);
    grp.add(ws);
    return ws;
  });

  grp.userData = {
    pivotType: 'bogie',
    bogieId: bogieSpec.id,
    pivotZ: bogieSpec.pivotZ,
    axleCount: bogieSpec.axleCount,
    wheelsets
  };

  return grp;
}
