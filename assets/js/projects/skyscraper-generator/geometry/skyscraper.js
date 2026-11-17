import { degToRad } from '../utils.js';
import { sanitiseConfig } from '../config.js';
import { resolveMaterialBundle } from '../materials/materials.js';
import { SkyscraperBatcher } from './primitives.js';
import { buildSectionCoreMesh, buildSectionTransitionMesh } from './footprints-mesh.js';
import { generateSectionFacades } from './facades.js';
import { buildTowerCrownAndRoof } from './roofs.js';
import { buildSkybridgesAndTrusses } from './bridges.js';
import { buildGroundAndPodiums } from './podiums.js';
import { resolveTowerComplex } from '../core/towers.js';
import { computeSkyscraperEntrances } from '../core/entrances.js';
import { generateSkyscraperBlueprint } from '../core/blueprints.js';

export function createSkyscraper(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const complex = resolveTowerComplex(cfg);
  const entrances = computeSkyscraperEntrances(cfg, complex);
  const materials = resolveMaterialBundle(cfg, options.lightingTime);

  const root = new THREE.Group();
  root.name = `Skyscraper_${cfg.style}_${cfg.seed}`;

  let maxCrownTopY = 0;
  let maxOverallTopY = 0;
  let totalBatchedInstances = 0;

  // Build each tower in local space before applying offset/rotation
  for (const tower of complex.towers) {
    const towerGroup = new THREE.Group();
    towerGroup.name = `Tower_${tower.index}`;
    towerGroup.position.set(tower.x, 0, tower.z);
    towerGroup.rotation.y = degToRad(tower.rotDeg || 0);
    root.add(towerGroup);

    const towerBatcher = new SkyscraperBatcher();

    for (let si = 0; si < tower.stack.sections.length; si++) {
      const sec = tower.stack.sections[si];
      const matRole = sec.materialRole || 'primary';
      const secMat = materials[matRole] || materials.primary;
      const coreMesh = buildSectionCoreMesh(sec, secMat, matRole, 'structure');
      if (coreMesh) {
        coreMesh.name = `Tower_${tower.index}_Section_${sec.index}_${sec.role}`;
        towerGroup.add(coreMesh);
      }

      if (si > 0) {
        const prevSec = tower.stack.sections[si - 1];
        const collarMesh = buildSectionTransitionMesh(prevSec, sec, towerBatcher, materials, cfg);
        if (collarMesh) {
          collarMesh.name = `Tower_${tower.index}_Transition_${si}`;
          towerGroup.add(collarMesh);
        }
      }

      generateSectionFacades(towerBatcher, sec, cfg, tower.index);
    }

    const topSection = tower.stack.sections[tower.stack.sections.length - 1];
    let crownMetrics = null;
    if (topSection) {
      crownMetrics = buildTowerCrownAndRoof(towerGroup, topSection, cfg, tower, towerBatcher, materials);
      maxCrownTopY = Math.max(maxCrownTopY, crownMetrics.crownTopY);
      maxOverallTopY = Math.max(maxOverallTopY, crownMetrics.topY);
    }

    towerBatcher.finalize(towerGroup, materials);
    totalBatchedInstances += towerBatcher.instanceCount;
  }

  // World-space complex bridges, trusses, plazas, podiums, and entrances
  const complexBatcher = new SkyscraperBatcher();
  buildSkybridgesAndTrusses(root, complex, cfg, complexBatcher, materials);
  buildGroundAndPodiums(root, complex, entrances, cfg, complexBatcher, materials);
  complexBatcher.finalize(root, materials);
  totalBatchedInstances += complexBatcher.instanceCount;

  // Measure draw calls and triangle counts for studio telemetry & blueprint metadata
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    meshCount++;
    const g = obj.geometry;
    if (g.index) triangleCount += g.index.count / 3;
    else if (g.attributes?.position) triangleCount += g.attributes.position.count / 3;
  });

  const crownMetrics = {
    crownTopY: maxCrownTopY || complex.maxTowerHeight,
    topY: maxOverallTopY || complex.maxTowerHeight
  };

  const blueprint = generateSkyscraperBlueprint(cfg, {
    complex,
    entrances,
    crownMetrics,
    geometryStats: {
      drawCalls: meshCount,
      batchedPrimitives: totalBatchedInstances,
      triangles: Math.round(triangleCount)
    }
  });

  root.userData.blueprint = blueprint;
  root.userData.complex = complex;
  return root;
}
