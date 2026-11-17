import { sanitiseTreeConfig } from '../config.js';
import { generateTreeBlueprint } from '../core/blueprints.js';
import { createTreeMaterialBundle } from '../materials/materials.js';
import {
  buildTreeBillboardMesh,
  buildTreeHemisphereGeo,
  buildTreeLod3Mesh,
  generateTreeLodData
} from './lods.js';

export function countTreeObjectStats(obj) {
  let tris = 0;
  let verts = 0;
  let drawCalls = 0;
  if (!obj) return { tris: 0, verts: 0, drawCalls: 0 };
  obj.traverse((child) => {
    if (child.isMesh && child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
      drawCalls++;
      const count = child.geometry.attributes.position.count;
      verts += count;
      tris += child.geometry.index ? Math.floor(child.geometry.index.count / 3) : Math.floor(count / 3);
    }
  });
  return { tris, verts, drawCalls };
}

export function createProceduralTree(rawCfg, options = {}) {
  const cfg = sanitiseTreeConfig(rawCfg);
  const lodLevel = options.lodLevel !== undefined ? Number(options.lodLevel) : 0;
  const seedOffset = options.seedOffset || 0;
  const matBundle = options.materialBundle || createTreeMaterialBundle(cfg, {
    wireframe: options.wireframe,
    silhouetteMode: options.silhouetteMode
  });

  const lod0Data = options.lod0Data || generateTreeLodData(cfg, 0, seedOffset);
  const root = new THREE.Group();
  root.name = `BTree_${cfg.species}_${cfg.seed}_LOD${lodLevel}`;

  const windTargets = [];

  if (lodLevel === 0 || lodLevel === 1) {
    const data = lodLevel === 0 ? lod0Data : generateTreeLodData(cfg, 1, seedOffset);

    const hasPos = (geo) => Boolean(geo && geo.attributes && geo.attributes.position && geo.attributes.position.count > 0);

    if (hasPos(data.trunkGeo)) {
      const trunkMesh = new THREE.Mesh(data.trunkGeo, matBundle.trunkMat);
      trunkMesh.name = 'TrunkAndLimbs';
      trunkMesh.userData.materialRole = 'trunk';
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      root.add(trunkMesh);
    }

    if (hasPos(data.foliageGeo)) {
      const foliageMesh = new THREE.Mesh(data.foliageGeo, matBundle.foliageMat);
      foliageMesh.name = 'CanopyFoliage';
      foliageMesh.userData.materialRole = 'foliage';
      foliageMesh.castShadow = true;
      foliageMesh.receiveShadow = true;
      root.add(foliageMesh);
      windTargets.push(foliageMesh);
    }

    if (hasPos(data.emissiveGeo)) {
      const emissiveMesh = new THREE.Mesh(data.emissiveGeo, matBundle.emissiveMat);
      emissiveMesh.name = 'ArcaneAndLanternGlow';
      emissiveMesh.userData.materialRole = 'emissive';
      emissiveMesh.castShadow = true;
      root.add(emissiveMesh);
      windTargets.push(emissiveMesh);
    }

    if (hasPos(data.planterGeo)) {
      const planterMesh = new THREE.Mesh(data.planterGeo, matBundle.planterMat);
      planterMesh.name = 'PlanterAndGrate';
      planterMesh.userData.materialRole = 'planter';
      planterMesh.castShadow = true;
      planterMesh.receiveShadow = true;
      root.add(planterMesh);
    }
  } else if (lodLevel === 2) {
    const style = options.lod2Style || cfg.lod2Style || 'billboard';
    if (style === 'billboard') {
      const bb = buildTreeBillboardMesh(lod0Data, options.atlasTexture || null, {
        includeIsoCap: true,
        species: cfg.species,
        wireframe: options.wireframe
      });
      bb.name = 'BillboardImpostor';
      root.add(bb);
      windTargets.push(bb);
    } else if (style === 'hemisphere') {
      const hemiGeo = buildTreeHemisphereGeo(cfg, lod0Data, seedOffset);
      const hemiMesh = new THREE.Mesh(hemiGeo, matBundle.foliageMat);
      hemiMesh.name = 'HemisphereImpostor';
      hemiMesh.userData.materialRole = 'foliage';
      hemiMesh.castShadow = true;
      hemiMesh.receiveShadow = true;
      root.add(hemiMesh);
      windTargets.push(hemiMesh);
    } else {
      const hemiGeo = buildTreeHemisphereGeo(cfg, lod0Data, seedOffset);
      const hemiMesh = new THREE.Mesh(hemiGeo, matBundle.foliageMat);
      hemiMesh.name = 'HybridHemisphere';
      hemiMesh.userData.materialRole = 'foliage';
      hemiMesh.castShadow = true;
      root.add(hemiMesh);
      const bb = buildTreeBillboardMesh(lod0Data, options.atlasTexture || null, {
        includeIsoCap: false,
        species: cfg.species,
        wireframe: options.wireframe
      });
      bb.name = 'HybridBillboard';
      root.add(bb);
      windTargets.push(hemiMesh, bb);
    }
  } else {
    const lod3 = buildTreeLod3Mesh(lod0Data, options.atlasTexture || null, options.wireframe);
    lod3.name = 'DistantProxyLOD3';
    root.add(lod3);
  }

  const stats = countTreeObjectStats(root);
  const blueprint = generateTreeBlueprint(cfg, {
    layout: lod0Data.layout,
    lodStats: {
      lod0Tris: countTreeObjectStats({ traverse: (fn) => fn({ isMesh: true, geometry: lod0Data.mergedGeo }) }).tris,
      activeLod: lodLevel,
      activeTris: stats.tris,
      lod2Style: cfg.lod2Style,
      atlasResolution: cfg.atlasRes
    }
  });

  root.userData = {
    blueprint,
    config: cfg,
    lodLevel,
    lod0Data,
    windTargets,
    stats,
    _materialBundle: matBundle
  };

  return root;
}
