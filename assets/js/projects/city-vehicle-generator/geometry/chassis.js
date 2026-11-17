import { clamp } from '../utils.js';

export function buildVehicleChassis(batcher, layout, cfg) {
  const d = layout.dimensions;
  const s = layout.sections;
  const halfW = d.halfWidth;
  const gc = d.groundClearance;
  const railX = Math.max(0.24, Math.min(halfW * 0.56, layout.axles[0].wheelCenterX - d.wheelThickness * 0.55 - 0.08));
  const railH = Math.max(0.08, Math.min(0.16, gc * 0.65));
  const railY = gc + railH * 0.35;

  // Longitudinal chassis frame rails (visible under trucks & across cab-cargo gap)
  const railLen = Math.max(1.0, d.length - 0.16);
  for (const side of [-1, 1]) {
    batcher.addBox(side * railX, railY, 0, 0.09, railH, railLen, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
  }

  // Crossmembers tying rails together
  const crossZs = [s.rear.startZ + 0.18, s.hood.endZ - 0.18, ...layout.axles.map((a) => a.z)];
  for (const cz of crossZs) {
    batcher.addBox(0, railY, cz, railX * 2, railH * 0.85, 0.09, {
      materialRole: 'chassisDark',
      layer: 'chassis'
    });
  }

  // Underbody floorpan spanning inside wheel tracks
  const panW = Math.max(0.5, railX * 2 + 0.08);
  batcher.addBox(0, gc + 0.025, 0, panW, 0.05, d.length - 0.24, {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });

  // Wheel well backing tubs (dark inner liners preventing see-through)
  const archR = d.wheelArchRadius;
  const wellTop = d.wheelArchTopY;
  const wellH = Math.max(0.15, wellTop - gc + 0.02);
  for (const axle of layout.axles) {
    const tireSpan = axle.dual ? d.wheelThickness * 2.12 : d.wheelThickness;
    const innerWallX = Math.max(0.24, axle.wheelCenterX - tireSpan * 0.5 - 0.05);
    const wellOuterX = Math.min(halfW - 0.02, axle.wheelCenterX + tireSpan * 0.45);
    const tubW = Math.max(0.08, wellOuterX - innerWallX);
    for (const side of [-1, 1]) {
      // Inner vertical tub backing
      batcher.addBox(side * innerWallX, gc + wellH * 0.5, axle.z, 0.05, wellH, archR * 1.92, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
      // Top wheel-well ceiling liner
      batcher.addBox(side * (innerWallX + tubW * 0.5), wellTop - 0.015, axle.z, tubW, 0.04, archR * 1.4, {
        materialRole: 'chassisDark',
        layer: 'chassis'
      });
    }
  }

  // Flared low-poly wheel arch eyebrows
  const flareOut = clamp(cfg.fenderFlare, 0, 0.16);
  const archTrimThick = 0.045 + flareOut * 0.5;
  const archRole = cfg.bodyFamily === 'three_box' && cfg.sideTrim === 'none' ? 'primary' : 'trim';

  for (const axle of layout.axles) {
    const z0 = axle.z - archR;
    const z1 = axle.z - archR * 0.58;
    const z2 = axle.z - archR * 0.28;
    const z3 = axle.z + archR * 0.28;
    const z4 = axle.z + archR * 0.58;
    const z5 = axle.z + archR;

    const archH = Math.max(0.14, wellTop - gc);
    const y0 = gc;
    const y1 = gc + archH * 0.72;
    const y2 = wellTop;

    const segs = [
      [z0, y0, z1, y1],
      [z1, y1, z2, y2],
      [z2, y2, z3, y2],
      [z3, y2, z4, y1],
      [z4, y1, z5, y0]
    ];

    for (const side of [-1, 1]) {
      const baseX = halfW + flareOut * 0.5;
      for (const [za, ya, zb, yb] of segs) {
        const dz = zb - za;
        const dy = yb - ya;
        const segLen = Math.hypot(dz, dy);
        const angle = Math.atan2(dy, dz);
        batcher.addBox(
          side * baseX,
          (ya + yb) * 0.5 + 0.02,
          (za + zb) * 0.5,
          0.05 + flareOut,
          archTrimThick,
          segLen + 0.03,
          {
            rotX: -angle,
            materialRole: archRole,
            layer: 'chassis'
          }
        );
      }
    }
  }

  // Front & Rear Bumpers
  const bumperStyle = cfg.bumperStyle || 'standard';
  const bumperRole = bumperStyle === 'chrome_classic' ? 'chrome' : 'bumper';
  const frontW = d.width * d.frontWidthRatio + 0.06;
  const rearW = d.width * d.rearWidthRatio + 0.06;
  const bH = bumperStyle === 'heavy_duty' || bumperStyle === 'stepped_utility' ? 0.2 : bumperStyle === 'chrome_classic' ? 0.13 : 0.16;
  const bD = bumperStyle === 'heavy_duty' || bumperStyle === 'stepped_utility' ? 0.16 : 0.12;
  const frontBumperY = gc + bH * 0.5 + 0.02;
  const rearBumperY = gc + bH * 0.5 + 0.02;

  batcher.addBox(0, frontBumperY, s.hood.endZ + bD * 0.32, frontW, bH, bD, {
    materialRole: bumperRole,
    layer: 'chassis'
  });
  // Bumper side wrap cheeks
  for (const side of [-1, 1]) {
    batcher.addBox(side * (frontW * 0.5 - 0.03), frontBumperY, s.hood.endZ - 0.08, 0.06, bH * 0.92, 0.22, {
      materialRole: bumperRole,
      layer: 'chassis'
    });
  }

  if (bumperStyle === 'stepped_utility') {
    batcher.addBox(0, rearBumperY - 0.02, s.rear.startZ - bD * 0.42, rearW, bH * 0.85, bD * 1.35, {
      materialRole: bumperRole,
      layer: 'chassis'
    });
  } else {
    batcher.addBox(0, rearBumperY, s.rear.startZ - bD * 0.32, rearW, bH, bD, {
      materialRole: bumperRole,
      layer: 'chassis'
    });
    for (const side of [-1, 1]) {
      batcher.addBox(side * (rearW * 0.5 - 0.03), rearBumperY, s.rear.startZ + 0.08, 0.06, bH * 0.92, 0.22, {
        materialRole: bumperRole,
        layer: 'chassis'
      });
    }
  }

  // Side steps / running boards between front & mid/rear wheel arches
  const frontAxle = layout.axles[0];
  const innerRearAxle = layout.axles[layout.axles.length === 3 ? 1 : 1];
  const stepZMin = innerRearAxle.z + archR + 0.05;
  const stepZMax = frontAxle.z - archR - 0.05;
  if (cfg.sideSteps && stepZMax - stepZMin > 0.35) {
    const stepLen = stepZMax - stepZMin;
    const stepZ = (stepZMin + stepZMax) * 0.5;
    for (const side of [-1, 1]) {
      batcher.addBox(side * (halfW + 0.045), gc + 0.03, stepZ, 0.13, 0.055, stepLen, {
        materialRole: 'trim',
        layer: 'chassis'
      });
    }
  }

  // Mudguards behind wheels
  if (cfg.mudguards) {
    const flapW = d.wheelThickness * (cfg.dualRearWheels ? 1.55 : 0.96);
    const flapH = Math.max(0.12, Math.min(0.24, gc * 0.9));
    for (const axle of layout.axles) {
      for (const side of [-1, 1]) {
        batcher.addBox(
          side * axle.wheelCenterX,
          gc - flapH * 0.35,
          axle.z - archR + 0.02,
          flapW,
          flapH,
          0.035,
          { materialRole: 'tire', layer: 'detail' }
        );
      }
    }
  }
}
