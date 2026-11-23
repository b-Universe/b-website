import { solidMaterial, surfaceMaterial } from '../materials/materials.js';
import { addBox, addCylinder } from './arch-primitives.js';

export function addParkingStallMarkings(parent, stall, surfaceY = 0) {
  const group = new THREE.Group();
  group.position.set(stall.x, surfaceY + 0.012, stall.z);
  group.rotation.y = stall.rotationY || 0;
  const stripeMat = solidMaterial('#e8ecf0');
  const stopMat = solidMaterial('#b0b6bc');
  for (const edge of [-0.48, 0.48]) {
    addBox(group, stall.width * edge, 0, 0, 0.08, 0.015, stall.depth, stripeMat, { cast: false });
  }
  addBox(group, 0, 0.06, -stall.depth * 0.36, stall.width * 0.65, 0.11, 0.16, stopMat);
  parent.add(group);
}

export function buildLotLayerMesh(lotLayout, cfg) {
  const group = new THREE.Group();
  group.name = 'LayerB_PropertyLot';

  if (!lotLayout || !lotLayout.enabled) {
    return group;
  }

  const { bounds, surfaceKind, sidewalks, driveways, parkingStalls, landscapingBeds, fences, serviceYard, patio, loadingApron } = lotLayout;
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;

  const baseHex = surfaceKind === 'plaza_stone' ? '#b3aba0' : surfaceKind === 'concrete' ? '#8c9298' : '#353a40';
  const baseKind = surfaceKind === 'plaza_stone' ? 'stone' : surfaceKind === 'concrete' ? 'concrete' : 'asphalt';
  const baseMat = surfaceMaterial(baseKind, baseHex, cfg.condition, cfg.seed + 71, Math.max(2, Math.round(bounds.width / 5)), Math.max(2, Math.round(bounds.depth / 5)));

  // Base lot slab
  addBox(group, cx, -0.04, cz, bounds.width, 0.08, bounds.depth, baseMat, { cast: false });

  // Sidewalks & curbs
  const sidewalkMat = surfaceMaterial('concrete', '#b8bec4', cfg.condition, cfg.seed + 83, 4, 1);
  const curbMat = solidMaterial('#99a0a6');
  for (const sw of sidewalks) {
    addBox(group, sw.x, sw.y * 0.5, sw.z, sw.width, sw.y, sw.depth, sidewalkMat, { cast: false });
    // Curb trim along street edge
    if (sw.id === 'sw_front') {
      addBox(group, sw.x, sw.y + 0.02, sw.z + sw.depth * 0.5 - 0.08, sw.width, 0.05, 0.16, curbMat, { cast: false });
    }
  }

  // Driveway aprons (darker asphalt cut across front sidewalk)
  const apronMat = solidMaterial('#2e3338');
  for (const dw of driveways) {
    addBox(group, dw.x, 0.052, dw.z, dw.width, 0.095, dw.depth, apronMat, { cast: false });
  }

  // Parking stall stripes & concrete wheel stops
  for (const st of parkingStalls) {
    addParkingStallMarkings(group, st);
  }

  // Service yard concrete pad
  if (serviceYard) {
    addBox(group, serviceYard.x, 0.02, serviceYard.z, serviceYard.width, 0.04, serviceYard.depth, sidewalkMat, { cast: false });
  }

  // Loading apron slab
  if (loadingApron) {
    addBox(group, loadingApron.x, 0.025, loadingApron.z, loadingApron.width, 0.05, loadingApron.depth, sidewalkMat, { cast: false });
  }

  // Patio deck
  if (patio) {
    const patioMat = surfaceMaterial('tile', '#a87d56', cfg.condition, cfg.seed + 109, 3, 2);
    addBox(group, patio.x, 0.05, patio.z, patio.width, 0.1, patio.depth, patioMat, { cast: false });
    const railMat = solidMaterial(cfg.trimColor || '#2b323a');
    addBox(group, patio.x, 0.55, patio.z + patio.depth * 0.5 - 0.04, patio.width, 0.06, 0.06, railMat);
    addBox(group, patio.x - patio.width * 0.5 + 0.04, 0.55, patio.z, 0.06, 0.06, patio.depth, railMat);
    addBox(group, patio.x + patio.width * 0.5 - 0.04, 0.55, patio.z, 0.06, 0.06, patio.depth, railMat);
    for (let i = -2; i <= 2; i++) {
      addBox(group, patio.x + (i / 2.2) * (patio.width * 0.46), 0.3, patio.z + patio.depth * 0.5 - 0.04, 0.05, 0.5, 0.05, railMat);
    }
  }

  // Fences (chainlink / industrial security perimeter)
  const postMat = solidMaterial('#5c646d');
  const meshMat = solidMaterial('#77818c');
  for (const fence of fences) {
    const h = fence.height || 1.9;
    const fw = fence.maxX - fence.minX;
    const fd = fence.maxZ - fence.minZ;
    const fcx = (fence.minX + fence.maxX) * 0.5;
    const fcz = (fence.minZ + fence.maxZ) * 0.5;

    // Back, left, right rails + posts
    addBox(group, fcx, h * 0.5, fence.minZ, fw, h, 0.05, meshMat);
    addBox(group, fence.minX, h * 0.5, fcz, 0.05, h, fd, meshMat);
    addBox(group, fence.maxX, h * 0.5, fcz, 0.05, h, fd, meshMat);
    if (!fence.gateOpenFront) {
      addBox(group, fcx, h * 0.5, fence.maxZ, fw, h, 0.05, meshMat);
    } else {
      const wing = Math.max(0.8, fw * 0.25);
      addBox(group, fence.minX + wing * 0.5, h * 0.5, fence.maxZ, wing, h, 0.05, meshMat);
      addBox(group, fence.maxX - wing * 0.5, h * 0.5, fence.maxZ, wing, h, 0.05, meshMat);
    }
    // Posts
    for (let i = 0; i <= 4; i++) {
      const px = fence.minX + (i / 4) * fw;
      addCylinder(group, px, h * 0.52, fence.minZ, 0.04, 0.04, h + 0.08, postMat, 6);
    }
  }

  // Landscaping beds & stylized OSRS low-poly trees/shrubs
  const mulchMat = solidMaterial('#4b382a');
  const leafMat = solidMaterial('#3f7a42');
  const trunkMat = solidMaterial('#6b472b');
  for (const bed of landscapingBeds) {
    addBox(group, bed.x, 0.09, bed.z, bed.width, 0.18, bed.depth, curbMat);
    addBox(group, bed.x, 0.18, bed.z, bed.width - 0.18, 0.06, bed.depth - 0.18, mulchMat, { cast: false });
    if (bed.hasTree) {
      addCylinder(group, bed.x, 0.85, bed.z, 0.11, 0.16, 1.4, trunkMat, 7);
      addCylinder(group, bed.x, 1.85, bed.z, 0.25, 0.92, 1.35, leafMat, 7);
      addCylinder(group, bed.x, 2.55, bed.z, 0.08, 0.62, 0.95, leafMat, 7);
    } else {
      addBox(group, bed.x, 0.42, bed.z, bed.width * 0.58, 0.42, bed.depth * 0.55, leafMat);
    }
  }

  return group;
}
