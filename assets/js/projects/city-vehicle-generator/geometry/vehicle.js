import { sanitiseConfig, isRailConfig } from '../config.js';
import { resolveVehicleLayout } from '../core/layout.js';
import { generateVehicleBlueprint } from '../core/blueprints.js';
import { resolveVehicleMaterialBundle } from '../materials/materials.js';
import { VehicleBatcher, vehRoot } from './primitives.js';
import { buildVehicleChassis } from './chassis.js';
import { buildVehicleBody } from './body.js';
import { buildVehicleDoorsAndWindows } from './doors-windows.js';
import { buildVehicleWheels } from './wheels.js';
import { buildVehicleDetails } from './details.js';
import { createRailVehicle } from '../transit/rail-vehicle.js';

export function createCityVehicle(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  if (isRailConfig(cfg)) {
    return createRailVehicle(cfg, options);
  }
  const layout = resolveVehicleLayout(cfg);
  const root = vehRoot(null, 0, 0, 0);
  root.name = `CityVehicle_${cfg.style}_${cfg.seed}`;

  const materialBundle = resolveVehicleMaterialBundle(cfg, {
    lightingTime: options.lightingTime || cfg.lightingTime
  });
  const batcher = new VehicleBatcher();

  buildVehicleChassis(batcher, layout, cfg);
  buildVehicleBody(batcher, layout, cfg);
  buildVehicleDoorsAndWindows(batcher, layout, cfg);
  buildVehicleWheels(batcher, layout, cfg);
  buildVehicleDetails(batcher, root, layout, cfg, materialBundle);

  const meshes = batcher.finalize(root, materialBundle, {
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow !== false
  });

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
    batchedBuckets: meshes.length,
    triangles: Math.round(triangles),
    vertices: Math.round(vertices)
  };

  const blueprint = generateVehicleBlueprint(cfg, {
    layout,
    geometryStats
  });

  root.userData.blueprint = blueprint;
  root.userData.layout = layout;
  return root;
}
