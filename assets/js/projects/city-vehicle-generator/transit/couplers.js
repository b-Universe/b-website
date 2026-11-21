import { VehicleBatcher } from '../geometry/primitives.js';

export function buildRailCouplerGroup(couplerSpec, endId, layout, cfg, materialBundle) {
  const grp = new THREE.Group();
  grp.name = `Coupler_${endId}`;
  const isFront = endId === 'front';
  const dir = isFront ? 1 : -1;
  const pivotZ = isFront ? couplerSpec.frontPivotZ : couplerSpec.rearPivotZ;
  const couplerType = isFront ? couplerSpec.frontType : couplerSpec.rearType;

  grp.position.set(0, couplerSpec.y, pivotZ);
  grp.userData = {
    pivotType: 'coupler',
    endId,
    couplerType,
    pivotZ,
    pullFaceZ: isFront ? couplerSpec.frontPullFaceZ : couplerSpec.rearPullFaceZ
  };
  if (couplerType === 'cable_grip') {
    grp.userData.disabled = true;
    return grp;
  }

  const batcher = new VehicleBatcher();
  const reach = Math.max(0.32, couplerSpec.protrusion + 0.12);

  // Draft gear pocket under end sill
  batcher.addBox(0, 0.02, -dir * 0.08, 0.34, 0.24, 0.34, {
    materialRole: 'chassisDark',
    layer: 'chassis'
  });

  if (couplerType === 'buffer_chain') {
    // Classic European buffers + center drawbar hook & chain
    const endSillZ = dir * 0.12;
    for (const side of [-1, 1]) {
      const bx = side * 0.875;
      const rTop = dir > 0 ? 0.095 : 0.12;
      const rBot = dir > 0 ? 0.12 : 0.095;
      batcher.addCylinder(bx, 0.04, endSillZ + dir * 0.16, rTop, rBot, 0.34, 10, 'z', 'chassisDark', 'detail');
      batcher.addCylinder(bx, 0.04, endSillZ + dir * 0.36, 0.19, 0.19, 0.055, 12, 'z', 'utility', 'detail');
    }
    // Center drawbar hook & hanging screw-link chain
    batcher.addBox(0, 0.02, dir * (reach * 0.45), 0.1, 0.11, reach * 0.72, {
      materialRole: 'utility',
      layer: 'detail'
    });
    batcher.addBox(0, -0.09, dir * (reach * 0.78), 0.07, 0.2, 0.1, {
      rotX: dir * 0.22,
      materialRole: 'chassisDark',
      layer: 'detail'
    });
  } else if (couplerType === 'automatic_schaku') {
    // Modern Scharfenberg coupler arm, drum head, alignment horn & MU box
    batcher.addBox(0, 0, dir * (reach * 0.38), 0.14, 0.13, reach * 0.76, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    batcher.addCylinder(0, 0, dir * (reach * 0.82), 0.18, 0.18, 0.18, 12, 'z', 'utility', 'detail');
    batcher.addCylinder(0.08, 0.02, dir * (reach * 0.94), dir > 0 ? 0.02 : 0.055, dir > 0 ? 0.055 : 0.02, 0.12, 8, 'z', 'chrome', 'detail');
    batcher.addBox(0, -0.11, dir * (reach * 0.78), 0.24, 0.09, 0.14, {
      materialRole: 'bumper',
      layer: 'detail'
    });
  } else if (couplerType === 'close_passenger') {
    // Semi-permanent close-coupled passenger bar & jumper cables
    batcher.addBox(0, 0, dir * (reach * 0.42), 0.13, 0.12, reach * 0.84, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    batcher.addBox(0, 0, dir * (reach * 0.84), 0.26, 0.18, 0.12, {
      materialRole: 'utility',
      layer: 'detail'
    });
    for (const side of [-1, 1]) {
      batcher.addCylinder(side * 0.26, -0.08, dir * (reach * 0.6), 0.028, 0.028, reach * 0.7, 6, 'z', 'tire', 'detail');
    }
  } else {
    // Standard AAR Knuckle Coupler (shank + chunky knuckle head + lock pin + brake air hose)
    batcher.addBox(0, 0, dir * (reach * 0.38), 0.15, 0.13, reach * 0.74, {
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    // Coupler head block & curved knuckle jaw
    const headZ = dir * (reach * 0.82);
    batcher.addBox(-0.04, 0.01, headZ, 0.26, 0.21, 0.22, {
      materialRole: 'utility',
      layer: 'detail'
    });
    batcher.addBox(0.08, 0.01, headZ + dir * 0.07, 0.13, 0.19, 0.14, {
      rotY: dir * 0.35,
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    // Cut-lever bar & hanging brake air hose
    batcher.addBox(0.28, 0.07, dir * 0.12, 0.56, 0.024, 0.024, {
      materialRole: 'chrome',
      layer: 'detail'
    });
    batcher.addBox(-0.22, -0.14, dir * (reach * 0.45), 0.045, 0.28, 0.045, {
      rotX: dir * 0.38,
      materialRole: 'tire',
      layer: 'detail'
    });
  }

  batcher.finalize(grp, materialBundle);
  return grp;
}

export function buildRailEndGangway(batcher, endZ, dir, deckY, bodyTopY) {
  const gwW = 1.24;
  const gwH = Math.max(1.5, Math.min(2.18, bodyTopY - deckY - 0.35));
  const gwMidY = deckY + 0.1 + gwH * 0.5;
  const depth = 0.24;
  const zCenter = endZ + dir * (depth * 0.5);

  // Ribbed dark rubber diaphragm folds
  for (let i = 0; i < 3; i++) {
    const segZ = endZ + dir * ((i + 0.5) * (depth / 3));
    batcher.addBox(0, gwMidY, segZ, gwW - (i % 2) * 0.05, gwH - (i % 2) * 0.04, depth / 3.4, {
      materialRole: 'chassisDark',
      layer: 'body'
    });
  }
  // Steel face-plate frame around doorway
  const plateZ = zCenter + dir * (depth * 0.5 + 0.012);
  batcher.addBox(-gwW * 0.46, gwMidY, plateZ, 0.09, gwH, 0.03, { materialRole: 'utility', layer: 'detail' });
  batcher.addBox(gwW * 0.46, gwMidY, plateZ, 0.09, gwH, 0.03, { materialRole: 'utility', layer: 'detail' });
  batcher.addBox(0, deckY + 0.1 + gwH - 0.045, plateZ, gwW, 0.09, 0.03, { materialRole: 'utility', layer: 'detail' });
  batcher.addBox(0, deckY + 0.08, plateZ, gwW * 0.88, 0.06, 0.12, { materialRole: 'utility', layer: 'detail' });
}
