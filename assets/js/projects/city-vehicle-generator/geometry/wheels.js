import { clamp, degToRad } from '../utils.js';

function addSingleWheelAssembly(batcher, cx, cy, cz, radius, width, sideSign, cfg, layout, yawRad = 0) {
  const sides = 14;
  const rimR = clamp(radius * 0.58, 0.11, radius - 0.05);
  const inset = clamp(cfg.rimInset, 0.02, width * 0.42);
  const hubStyle = cfg.hubcapStyle || 'five_spoke';
  const cosY = yawRad ? Math.cos(yawRad) : 1;
  const sinY = yawRad ? Math.sin(yawRad) : 0;

  const worldAt = (ox, oy, oz) => ([
    cx + ox * cosY + oz * sinY,
    cy + oy,
    cz - ox * sinY + oz * cosY
  ]);

  // Main low-poly tire cylinder
  batcher.addCylinder(cx, cy, cz, radius, radius, width, sides, 'x', 'tire', 'wheel', yawRad);

  // Outer tire sidewall bevel rings (recessed hub cavity)
  const rimWidth = Math.max(0.04, width - inset * 0.8);
  const [rimCx, rimCy, rimCz] = worldAt(-sideSign * (inset * 0.35), 0, 0);
  batcher.addCylinder(rimCx, rimCy, rimCz, rimR, rimR, rimWidth, 12, 'x', 'rim', 'wheel', yawRad);

  const faceOffsetX = sideSign * (width * 0.5 - inset * 0.68);
  const [faceCx, faceCy, faceCz] = worldAt(faceOffsetX, 0, 0);

  if (hubStyle === 'solid_steel') {
    batcher.addCylinder(faceCx, faceCy, faceCz, rimR * 0.65, rimR * 0.65, 0.03, 10, 'x', 'rim', 'wheel', yawRad);
    const [capX, capY, capZ] = worldAt(faceOffsetX + sideSign * 0.015, 0, 0);
    batcher.addCylinder(capX, capY, capZ, rimR * 0.25, rimR * 0.25, 0.03, 8, 'x', 'chrome', 'wheel', yawRad);
  } else if (hubStyle === 'classic_dish') {
    const [d1x, d1y, d1z] = worldAt(faceOffsetX + sideSign * 0.012, 0, 0);
    const [d2x, d2y, d2z] = worldAt(faceOffsetX + sideSign * 0.025, 0, 0);
    batcher.addCylinder(d1x, d1y, d1z, rimR * 0.72, rimR * 0.56, 0.035, 12, 'x', 'chrome', 'wheel', yawRad);
    batcher.addCylinder(d2x, d2y, d2z, rimR * 0.22, rimR * 0.22, 0.025, 8, 'x', 'rim', 'wheel', yawRad);
  } else if (hubStyle === 'aero_disc') {
    const [a1x, a1y, a1z] = worldAt(faceOffsetX + sideSign * 0.015, 0, 0);
    const [a2x, a2y, a2z] = worldAt(faceOffsetX + sideSign * 0.024, 0, 0);
    batcher.addCylinder(a1x, a1y, a1z, rimR * 0.92, rimR * 0.92, 0.022, 12, 'x', 'rim', 'wheel', yawRad);
    batcher.addCylinder(a2x, a2y, a2z, rimR * 0.32, rimR * 0.32, 0.024, 10, 'x', 'livery', 'wheel', yawRad);
  } else if (hubStyle === 'heavy_lug') {
    const [hx, hy, hz] = worldAt(faceOffsetX + sideSign * 0.012, 0, 0);
    batcher.addCylinder(hx, hy, hz, rimR * 0.42, rimR * 0.42, 0.05, 8, 'x', 'utility', 'wheel', yawRad);
    const lugCount = clamp(Math.round(cfg.spokeCount || 6), 4, 8);
    const lugRingR = rimR * 0.62;
    for (let i = 0; i < lugCount; i++) {
      const a = (i / lugCount) * Math.PI * 2;
      const [lx, ly, lz] = worldAt(faceOffsetX + sideSign * 0.015, Math.sin(a) * lugRingR, Math.cos(a) * lugRingR);
      batcher.addBox(lx, ly, lz, 0.028, 0.028, 0.028, {
        rotY: yawRad,
        materialRole: 'chrome',
        layer: 'wheel'
      });
    }
  } else {
    // five_spoke (or N-spoke alloy)
    const spokes = clamp(Math.round(cfg.spokeCount || 5), 3, 8);
    const spokeLen = rimR * 0.88;
    const spokeThick = clamp(rimR * 0.2, 0.024, 0.048);
    const [hubX, hubY, hubZ] = worldAt(faceOffsetX + sideSign * 0.015, 0, 0);
    batcher.addCylinder(hubX, hubY, hubZ, rimR * 0.24, rimR * 0.24, 0.032, 8, 'x', 'chrome', 'wheel', yawRad);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const [sx, sy, sz] = worldAt(
        faceOffsetX + sideSign * 0.008,
        Math.sin(a) * spokeLen * 0.48,
        Math.cos(a) * spokeLen * 0.48
      );
      batcher.addBox(sx, sy, sz, 0.028, spokeThick, spokeLen, {
        rotX: -a,
        rotY: yawRad,
        materialRole: 'chrome',
        layer: 'wheel'
      });
    }
  }
}

export function buildVehicleWheels(batcher, layout, cfg) {
  const d = layout.dimensions;
  const r = d.wheelRadius;
  const w = d.wheelThickness;
  const steerRad = degToRad(clamp(cfg.steerAngle || 0, -35, 35));

  for (const axle of layout.axles) {
    // Solid steel axle shaft connecting left & right hubs
    const shaftLen = Math.max(0.8, axle.wheelCenterX * 2 - 0.06);
    batcher.addCylinder(0, r, axle.z, 0.045, 0.045, shaftLen, 8, 'x', 'chassisDark', 'wheel');
    const yawRad = axle.role === 'steer' ? steerRad : 0;

    for (const side of [-1, 1]) {
      if (axle.dual) {
        const outerX = side * (axle.wheelCenterX + w * 0.52);
        const innerX = side * (axle.wheelCenterX - w * 0.52);
        addSingleWheelAssembly(batcher, outerX, r, axle.z, r, w * 0.94, side, cfg, layout, yawRad);
        addSingleWheelAssembly(batcher, innerX, r, axle.z, r, w * 0.92, side, cfg, layout, yawRad);
      } else {
        addSingleWheelAssembly(batcher, side * axle.wheelCenterX, r, axle.z, r, w, side, cfg, layout, yawRad);
      }
    }
  }
}
