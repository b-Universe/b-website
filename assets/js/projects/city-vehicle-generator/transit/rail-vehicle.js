import { clamp, degToRad } from '../utils.js';
import { sanitiseConfig } from '../config.js';
import { resolveRailVehicleLayout } from './rail-layout.js';
import { generateVehicleBlueprint } from '../core/blueprints.js';
import { resolveVehicleMaterialBundle } from '../materials/materials.js';
import { VehicleBatcher, vehRoot } from '../geometry/primitives.js';
import { buildRailBogieGroup } from './bogies.js';
import { buildRailCouplerGroup } from './couplers.js';
import { buildRailCarbody } from './rail-body.js';
import { buildRailDetails } from './rail-details.js';
import { trPartSetPantographHeight } from './rail-parts.js';

export function applyRailVehiclePose(railRoot, pose = {}) {
  if (!railRoot || !railRoot.userData?.railParts) return;
  const parts = railRoot.userData.railParts;

  if (Number.isFinite(pose.frontBogieYawRad) && parts.bogieMap?.front) {
    parts.bogieMap.front.rotation.y = pose.frontBogieYawRad;
  }
  if (Number.isFinite(pose.rearBogieYawRad) && parts.bogieMap?.rear) {
    parts.bogieMap.rear.rotation.y = pose.rearBogieYawRad;
  }
  if (Number.isFinite(pose.wheelSpinRad)) {
    for (const ws of parts.wheelsets || []) {
      ws.rotation.x = pose.wheelSpinRad;
    }
    for (const rod of parts.steamRods || []) {
      const ud = rod.userData || {};
      const r = ud.crankRadius || 0.22;
      const theta = pose.wheelSpinRad + (ud.phaseOffset || 0);
      const axleY = (ud.baseY ?? 0.44) + r;
      rod.position.set(
        ud.baseX || 0,
        axleY - Math.cos(theta) * r,
        (ud.baseZ || 0) - Math.sin(theta) * r
      );
    }
  }
  if (Number.isFinite(pose.doorOpenFactor)) {
    const f = clamp(pose.doorOpenFactor, 0, 1);
    for (const dr of parts.doors || []) {
      const base = dr.userData?.basePos || [0, 0, 0];
      const vec = dr.userData?.slideVector || [0, 0, 0];
      dr.position.set(base[0] + vec[0] * f, base[1] + vec[1] * f, base[2] + vec[2] * f);
    }
  }
  if (Number.isFinite(pose.pantographHeight)) {
    const ph = clamp(pose.pantographHeight, 0, 1);
    for (const pGrp of parts.pantographs || []) {
      trPartSetPantographHeight(pGrp, ph);
    }
  }
  if (Number.isFinite(pose.tramArticulationRad)) {
    const art = clamp(pose.tramArticulationRad, -0.4, 0.4);
    for (const sec of parts.tramSections || []) {
      sec.rotation.y = (sec.userData?.endSign || 1) * art;
    }
  }
  if (Number.isFinite(pose.cabinSwingRad) && parts.cabinPivot) {
    parts.cabinPivot.rotation.z = clamp(pose.cabinSwingRad, -0.25, 0.25);
  }
}

export function createRailVehicle(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const layout = resolveRailVehicleLayout(cfg);
  const root = vehRoot(null, 0, 0, 0);
  root.name = `RailVehicle_${cfg.style}_${cfg.seed}`;

  const materialBundle = resolveVehicleMaterialBundle(cfg, {
    lightingTime: options.lightingTime || cfg.lightingTime
  });

  const carbodyGroup = new THREE.Group();
  carbodyGroup.name = 'Carbody';
  root.add(carbodyGroup);

  const batcher = new VehicleBatcher();
  const bodyResult = buildRailCarbody(batcher, carbodyGroup, layout, cfg, materialBundle);
  buildRailDetails(batcher, carbodyGroup, layout, cfg, materialBundle);

  const bodyMeshes = batcher.finalize(carbodyGroup, materialBundle, {
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow !== false
  });

  const bogies = [];
  const bogieMap = {};
  const wheelsets = [];
  if (bodyResult?.customBogies?.length) {
    for (const bg of bodyResult.customBogies) {
      bogies.push(bg);
      if (bg.userData?.bogieId) bogieMap[bg.userData.bogieId] = bg;
    }
  } else {
    for (const bogieSpec of layout.rail.bogies) {
      const bogieGrp = buildRailBogieGroup(bogieSpec, layout, cfg, materialBundle);
      root.add(bogieGrp);
      bogies.push(bogieGrp);
      bogieMap[bogieSpec.id] = bogieGrp;
      for (const ws of bogieGrp.userData.wheelsets || []) {
        wheelsets.push(ws);
      }
    }
  }
  for (const ws of bodyResult?.customWheelsets || []) {
    wheelsets.push(ws);
  }

  const couplers = [];
  for (const endId of ['front', 'rear']) {
    const couplerGrp = buildRailCouplerGroup(layout.rail.couplers, endId, layout, cfg, materialBundle);
    carbodyGroup.add(couplerGrp);
    couplers.push(couplerGrp);
  }

  let triangles = 0;
  let vertices = 0;
  let drawCalls = 0;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    drawCalls++;
    const geo = obj.geometry;
    if (geo) {
      if (geo.index) triangles += geo.index.count / 3;
      else if (geo.attributes?.position) triangles += geo.attributes.position.count / 3;
      if (geo.attributes?.position) vertices += geo.attributes.position.count;
    }
  });

  const geometryStats = {
    drawCalls,
    batchedBuckets: bodyMeshes.length,
    triangles: Math.round(triangles),
    vertices: Math.round(vertices)
  };

  const blueprint = generateVehicleBlueprint(cfg, {
    layout,
    geometryStats
  });

  root.userData.blueprint = blueprint;
  root.userData.layout = layout;
  root.userData.unitConfig = cfg;
  root.userData.railParts = {
    carbody: carbodyGroup,
    bogies,
    bogieMap,
    wheelsets,
    couplers,
    doors: bodyResult?.doors || [],
    pantographs: bodyResult?.pantographs || [],
    steamRods: bodyResult?.steamRods || [],
    tramSections: bodyResult?.tramSections || [],
    cabinPivot: bodyResult?.cabinPivot || null
  };

  const yawRad = degToRad(clamp(cfg.railBogieYawDeg || 0, -15, 15));
  applyRailVehiclePose(root, {
    frontBogieYawRad: yawRad,
    rearBogieYawRad: -yawRad,
    wheelSpinRad: degToRad(cfg.railWheelSpinDeg || 0),
    doorOpenFactor: clamp(cfg.railDoorsOpen ?? (cfg.doorsOpen ? 1 : 0), 0, 1),
    pantographHeight: cfg.railPantographHeight ?? 0.85,
    tramArticulationRad: options.tramArticulationRad ?? degToRad(clamp(yawRad * 25, -18, 18)),
    cabinSwingRad: degToRad(clamp(cfg.railCabinSwingDeg || 0, -12, 12))
  });

  return root;
}
