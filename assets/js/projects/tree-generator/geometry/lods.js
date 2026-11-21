import { treeRng32 } from '../utils.js';
import { sanitiseTreeConfig } from '../config.js';
import { resolveTreeLayout } from '../core/layout.js';
import {
  buildTreeClusterGeometry,
  buildTreePlanterOrPot,
  buildTreeRootButtresses,
  buildTreeStoryProps,
  buildTreeTaperedLimb,
  buildTreeTrunkDetails,
  getTreeFoliageColorOptions,
  treeColorizeGeometry,
  treeJitterGeometryVertices,
  treeMergeBufferGeometries
} from './primitives.js';
import { buildPlacedTreeDetails } from './details.js';

function buildShrubProceduralFoliage(cfg, dims, foliageGeos, rng, simulateTextureError = false) {
  const { clusterCount, polyDetail, spread, height, isLod1 } = dims;
  const clusters = [];
  const leafOpts = (extra = {}) => getTreeFoliageColorOptions(cfg, { simulateTextureError, ...extra });

  for (let c = 0; c < clusterCount; c++) {
    const angle = (c / clusterCount) * Math.PI * 2 + rng() * 0.5;
    const dist = c === 0 ? 0 : (0.25 + rng() * 0.65) * spread * 0.45;
    const cSize = cfg.clusterSize * (0.55 + rng() * 0.45) * 0.75;
    const rx = 1.15 * cSize;
    const ry = 0.85 * cfg.canopyHeight * cSize;
    const rz = 1.15 * cSize;

    const ico = buildTreeClusterGeometry(cfg.leafStyle, cSize, polyDetail);
    ico.scale(1.15, 0.85 * cfg.canopyHeight, 1.15);
    const jittered = treeJitterGeometryVertices(ico, cfg.jitter * cSize, rng);

    const cx = Math.cos(angle) * dist;
    const cy = dims.planterLift + cSize * 0.65 + rng() * height * 0.35;
    const cz = Math.sin(angle) * dist;
    jittered.translate(cx, cy, cz);

    foliageGeos.push(treeColorizeGeometry(jittered, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, leafOpts({
      variance: cfg.colorVar,
      snowCoverage: cfg.snow * 0.5
    })));

    clusters.push({ cx, cy, cz, cSize, rx, ry, rz });
  }

  const variant = cfg.shrubVariant || 'basic';

  if (variant === 'berry') {
    const density = Math.max(0, Math.min(1, cfg.berryDensity !== undefined ? cfg.berryDensity : 0.45));
    if (density > 0.001) {
      const berryColor = cfg.berryColor || '#ff2a55';
      const baseSize = cfg.berrySize || 0.18;

      clusters.forEach((cl) => {
        if (isLod1) {
          if (rng() > density * 0.85) return;
          const theta = rng() * Math.PI * 2;
          const phi = 0.12 * Math.PI + rng() * 0.55 * Math.PI;
          const nx = Math.sin(phi) * Math.cos(theta);
          const ny = Math.cos(phi);
          const nz = Math.sin(phi) * Math.sin(theta);

          const bx = cl.cx + nx * cl.rx * 0.92;
          const by = cl.cy + ny * cl.ry * 0.92;
          const bz = cl.cz + nz * cl.rz * 0.92;
          const bRadius = baseSize * (0.9 + rng() * 0.25) * 1.15;

          const berry = new THREE.TetrahedronGeometry(bRadius, 0);
          berry.translate(bx, by, bz);
          foliageGeos.push(treeColorizeGeometry(berry, berryColor, berryColor, '#ffffff', rng, leafOpts({ variance: 0.05, isFoliageSurface: false })));
          return;
        }

        const count = Math.floor(density * 3.5) + (rng() < ((density * 3.5) % 1) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const theta = (i / Math.max(1, count)) * Math.PI * 2 + rng() * 0.8;
          const phi = 0.10 * Math.PI + rng() * 0.58 * Math.PI;
          const nx = Math.sin(phi) * Math.cos(theta);
          const ny = Math.cos(phi);
          const nz = Math.sin(phi) * Math.sin(theta);

          const factor = 0.90 + rng() * 0.08;
          const bx = cl.cx + nx * cl.rx * factor;
          const by = cl.cy + ny * cl.ry * factor;
          const bz = cl.cz + nz * cl.rz * factor;
          const bRadius = baseSize * (0.85 + rng() * 0.3);

          const berry = new THREE.OctahedronGeometry(bRadius, 0);
          berry.translate(bx, by, bz);
          foliageGeos.push(treeColorizeGeometry(berry, berryColor, berryColor, '#ffffff', rng, leafOpts({ variance: 0.06, isFoliageSurface: false })));
        }
      });
    }
  } else if (variant === 'flowering') {
    const density = Math.max(0, Math.min(1, cfg.blossomDensity !== undefined ? cfg.blossomDensity : 0.45));
    if (density > 0.001) {
      const blossomColor = cfg.blossomColor || '#ffb6c1';
      const baseSize = cfg.blossomSize || 0.20;

      clusters.forEach((cl) => {
        if (isLod1) {
          if (rng() > density * 0.85) return;
          const theta = rng() * Math.PI * 2;
          const phi = 0.08 * Math.PI + rng() * 0.52 * Math.PI;
          const nx = Math.sin(phi) * Math.cos(theta);
          const ny = Math.cos(phi);
          const nz = Math.sin(phi) * Math.sin(theta);

          const fx = cl.cx + nx * cl.rx * 0.94;
          const fy = cl.cy + ny * cl.ry * 0.94;
          const fz = cl.cz + nz * cl.rz * 0.94;
          const fRadius = baseSize * (0.9 + rng() * 0.25) * 1.15;

          const flower = new THREE.CylinderGeometry(fRadius, fRadius * 0.8, fRadius * 0.2, 4, 1);
          const normVec = new THREE.Vector3(nx, ny, nz).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normVec);
          flower.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quat));
          flower.translate(fx, fy, fz);
          foliageGeos.push(treeColorizeGeometry(flower, blossomColor, blossomColor, '#ffffff', rng, leafOpts({ variance: 0.05, isFoliageSurface: false })));
          return;
        }

        const count = Math.floor(density * 3.2) + (rng() < ((density * 3.2) % 1) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const theta = (i / Math.max(1, count)) * Math.PI * 2 + rng() * 0.8;
          const phi = 0.06 * Math.PI + rng() * 0.52 * Math.PI;
          const nx = Math.sin(phi) * Math.cos(theta);
          const ny = Math.cos(phi);
          const nz = Math.sin(phi) * Math.sin(theta);

          const factor = 0.92 + rng() * 0.06;
          const fx = cl.cx + nx * cl.rx * factor;
          const fy = cl.cy + ny * cl.ry * factor;
          const fz = cl.cz + nz * cl.rz * factor;
          const fRadius = baseSize * (0.85 + rng() * 0.3);

          const flower = new THREE.CylinderGeometry(fRadius, fRadius * 0.8, fRadius * 0.22, 5, 1);
          const normVec = new THREE.Vector3(nx, ny, nz).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normVec);
          flower.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quat));
          flower.translate(fx, fy, fz);
          foliageGeos.push(treeColorizeGeometry(flower, blossomColor, blossomColor, '#ffffff', rng, leafOpts({ variance: 0.06, isFoliageSurface: false })));

          const pistil = new THREE.TetrahedronGeometry(fRadius * 0.35, 0);
          pistil.translate(fx + nx * fRadius * 0.12, fy + ny * fRadius * 0.12, fz + nz * fRadius * 0.12);
          foliageGeos.push(treeColorizeGeometry(pistil, '#ffe066', '#ffd166', '#ffffff', rng, leafOpts({ variance: 0.04, isFoliageSurface: false })));
        }
      });
    }
  }
}

export function generateTreeLodData(rawCfg, lodLevel = 0, seedOffset = 0, options = {}) {
  const cfg = sanitiseTreeConfig(rawCfg);
  const simulateTextureError = Boolean(options && options.simulateTextureError);
  const foliageColorOpts = (extra = {}) => getTreeFoliageColorOptions(cfg, { simulateTextureError, ...extra });
  const layout = resolveTreeLayout(cfg, seedOffset);
  const rng = treeRng32(cfg.seed + seedOffset * 7919);

  const isLod1 = lodLevel === 1;
  const radialSegs = isLod1 ? Math.max(3, Math.floor(cfg.radialSegments * 0.65)) : cfg.radialSegments;
  const heightSegs = isLod1 ? 3 : 6;
  const polyDetail = isLod1 ? Math.max(0, cfg.polyDetail - 1) : cfg.polyDetail;
  const clusterCount = isLod1 ? Math.max(3, Math.ceil(cfg.density * 0.5)) : cfg.density;
  const branchCount = isLod1 ? Math.max(1, Math.floor(cfg.branches * 0.5)) : cfg.branches;
  const subBranchCount = isLod1 ? 0 : cfg.secondaryBranches;

  const trunkGeos = [];
  const foliageGeos = [];
  const emissiveGeos = [];
  const planterGeos = buildTreePlanterOrPot(cfg, layout, rng);

  const barkDark = new THREE.Color(cfg.colorBark).offsetHSL(0, 0, -0.07).getStyle();
  const isBirch = cfg.species === 'birch';
  const isPalm = cfg.species === 'palm' || cfg.species === 'banana_palm';
  const isBamboo = cfg.species === 'bamboo';
  const isCactus = cfg.species === 'cactus';
  const isRedwood = cfg.species === 'redwood';

  const height = layout.totalHeight;
  const radius = layout.baseRadius;
  const spread = cfg.spread;
  const trunkHeight = layout.trunkHeight;
  const curve = cfg.curve;
  const curveAngle = layout.curveAngle;

  // Main trunk (bamboo & cactus build specialized multi-culm/ribbed trunks below)
  let trunkTop = new THREE.Vector3(layout.trunkTop.x, layout.trunkTop.y, layout.trunkTop.z);

  if (!isBamboo) {
    const mainTrunk = buildTreeTaperedLimb({
      startPoint: new THREE.Vector3(0, layout.trunkStartY, 0),
      height: trunkHeight,
      radiusBottom: radius,
      radiusTop: isCactus ? radius * 0.88 : layout.topRadius,
      radialSegments: radialSegs,
      heightSegments: heightSegs,
      curveAmount: curve,
      curveAngle,
      gnarlAmount: cfg.gnarl,
      barkColor: cfg.colorBark,
      barkColor2: barkDark,
      isBirch,
      isPalm,
      isCactus,
      isRedwood,
      rootFlare: cfg.rootFlare,
      mossCoverage: cfg.mossCoverage
    }, rng);

    trunkGeos.push(mainTrunk.geometry);
    trunkTop = mainTrunk.topTip;
  }

  // Root Buttresses / Stilt Roots
  const rootGeos = buildTreeRootButtresses(cfg, layout, rng, barkDark);
  trunkGeos.push(...rootGeos);

  // Trunk Details (Hollows, Shelf Mushrooms)
  const trunkDetails = buildTreeTrunkDetails(cfg, layout, rng, isLod1);
  trunkGeos.push(...trunkDetails.trunkDetailGeos);
  trunkGeos.push(...trunkDetails.propGeos);

  function getPointOnTrunk(t) {
    const tt = Math.max(0, Math.min(1, t));
    const bend = Math.pow(tt, 1.65) * curve * trunkHeight * 0.35;
    return new THREE.Vector3(
      Math.cos(curveAngle) * bend,
      layout.trunkStartY + tt * trunkHeight,
      Math.sin(curveAngle) * bend
    );
  }

  const branchTips = [trunkTop.clone()];

  const addBranchesAndSubForks = (count, startMin, startMax, lenFactor, heightFactor, radFactor) => {
    for (let b = 0; b < count; b++) {
      const t = startMin + (b / Math.max(1, count)) * (startMax - startMin);
      const origin = getPointOnTrunk(t);
      const bAngle = (b * 2.399963) + (rng() - 0.5) * 0.5;
      const bLen = spread * lenFactor * (0.78 + rng() * 0.45);
      const bHeight = height * heightFactor * (0.8 + rng() * 0.4) * cfg.branchLift;

      const branch = buildTreeTaperedLimb({
        startPoint: origin,
        height: bHeight,
        radiusBottom: radius * (1 - t * 0.45) * radFactor,
        radiusTop: radius * 0.12,
        radialSegments: Math.max(3, radialSegs - 1),
        heightSegments: isLod1 ? 2 : 3,
        curveAmount: bLen / Math.max(0.4, bHeight),
        curveAngle: bAngle,
        gnarlAmount: cfg.gnarl,
        barkColor: cfg.colorBark,
        barkColor2: barkDark,
        isBirch,
        isPalm: false,
        mossCoverage: cfg.mossCoverage * 0.4
      }, rng);

      trunkGeos.push(branch.geometry);
      branchTips.push(branch.topTip);

      // Secondary forks for LOD0 richness
      for (let sb = 0; sb < subBranchCount; sb++) {
        const subOrigin = branch.topTip.clone().lerp(origin, 0.32 + rng() * 0.25);
        const subAngle = bAngle + (sb % 2 === 0 ? 0.85 : -0.85) + (rng() - 0.5) * 0.35;
        const subHeight = bHeight * (0.48 + rng() * 0.2);
        const subFork = buildTreeTaperedLimb({
          startPoint: subOrigin,
          height: subHeight,
          radiusBottom: radius * 0.2,
          radiusTop: radius * 0.05,
          radialSegments: 4,
          heightSegments: 2,
          curveAmount: 0.72,
          curveAngle: subAngle,
          gnarlAmount: cfg.gnarl * 0.85,
          barkColor: cfg.colorBark,
          barkColor2: barkDark,
          isBirch,
          isPalm: false
        }, rng);
        trunkGeos.push(subFork.geometry);
        branchTips.push(subFork.topTip);
      }
    }
  };

  const pushCluster = (cx, cy, cz, cRadius, scaleX = 1.15, scaleY = 0.78, scaleZ = 1.15, overrideStyle = null) => {
    const geo = buildTreeClusterGeometry(overrideStyle || cfg.leafStyle, cRadius, polyDetail);
    geo.scale(scaleX, scaleY * cfg.canopyHeight, scaleZ);
    const jittered = treeJitterGeometryVertices(geo, cfg.jitter * cRadius, rng);
    jittered.translate(cx, cy, cz);
    foliageGeos.push(treeColorizeGeometry(
      jittered,
      cfg.colorLeaf1,
      cfg.colorLeaf2,
      cfg.colorAccent,
      rng,
      foliageColorOpts({ variance: cfg.colorVar, snowCoverage: cfg.snow, isGradientCanopy: true })
    ));
  };

  if (cfg.species === 'oak' || cfg.species === 'birch' || cfg.species === 'yew') {
    addBranchesAndSubForks(branchCount, cfg.branchStartRatio, 0.93, 0.55, 0.28, cfg.species === 'yew' ? 0.65 : 0.55);
    for (let c = 0; c < clusterCount; c++) {
      const anchor = branchTips[c % branchTips.length];
      const cRadius = cfg.clusterSize * (0.65 + rng() * 0.42) * (isLod1 ? 1.25 : 1.0);
      const offsetAngle = rng() * Math.PI * 2;
      const offsetDist = (c < branchTips.length ? 0.15 : 0.55) * spread * 0.45 * rng();
      const shapeY = cfg.canopyShape === 'oval' ? 1.05 : (cfg.canopyShape === 'umbrella' ? 0.55 : 0.78);
      pushCluster(
        anchor.x + Math.cos(offsetAngle) * offsetDist,
        anchor.y + (rng() - 0.3) * cfg.clusterSize * 0.62,
        anchor.z + Math.sin(offsetAngle) * offsetDist,
        cRadius,
        1.15,
        shapeY,
        1.15
      );
    }
  } else if (cfg.species === 'maple' || cfg.species === 'sakura') {
    addBranchesAndSubForks(branchCount, cfg.branchStartRatio, 0.92, 0.62, 0.30, 0.52);
    for (let c = 0; c < clusterCount; c++) {
      const anchor = branchTips[c % branchTips.length];
      const cRadius = cfg.clusterSize * (0.68 + rng() * 0.38) * (isLod1 ? 1.25 : 1.0);
      const offsetAngle = rng() * Math.PI * 2;
      const offsetDist = spread * 0.38 * rng();
      // Layered wide blossom/maple pads
      pushCluster(
        anchor.x + Math.cos(offsetAngle) * offsetDist,
        anchor.y + (rng() - 0.25) * cfg.clusterSize * 0.45,
        anchor.z + Math.sin(offsetAngle) * offsetDist,
        cRadius,
        1.32,
        0.58,
        1.32
      );
    }
  } else if (cfg.species === 'baobab') {
    addBranchesAndSubForks(Math.max(4, branchCount), 0.78, 0.96, 0.62, 0.20, 0.48);
    for (let c = 0; c < clusterCount; c++) {
      const anchor = branchTips[c % branchTips.length];
      const cRadius = cfg.clusterSize * (0.72 + rng() * 0.35) * (isLod1 ? 1.25 : 1.0);
      pushCluster(
        anchor.x + (rng() - 0.5) * spread * 0.35,
        anchor.y + rng() * 0.4,
        anchor.z + (rng() - 0.5) * spread * 0.35,
        cRadius,
        1.45,
        0.48,
        1.45,
        'faceted_pad'
      );
    }
  } else if (cfg.species === 'pine' || cfg.species === 'cypress') {
    const isCypress = cfg.species === 'cypress';
    const tiers = isLod1 ? Math.max(3, Math.ceil(clusterCount * 0.6)) : Math.max(4, Math.min(14, clusterCount));
    const coneRadial = isLod1 ? Math.max(5, radialSegs) : Math.max(6, radialSegs + 2);

    for (let i = 0; i < tiers; i++) {
      const frac = i / Math.max(1, tiers - 1);
      const tierY = layout.trunkStartY + height * (isCypress ? 0.16 + frac * 0.76 : 0.26 + frac * 0.68);
      const trunkPt = getPointOnTrunk(Math.min(1, (tierY - layout.trunkStartY) / trunkHeight));
      const baseTierRadius = isCypress
        ? spread * 0.42 * Math.sin(Math.pow(1 - frac, 0.65) * Math.PI * 0.85 + 0.2)
        : spread * 0.65 * (1.0 - frac * 0.78) * (cfg.clusterSize * 0.7);
      const tierHeight = (height / tiers) * (isCypress ? 2.1 : 1.65) * cfg.canopyHeight;

      const cone = new THREE.ConeGeometry(Math.max(0.22, baseTierRadius), tierHeight, coneRadial, isLod1 ? 1 : 2);
      const jittered = treeJitterGeometryVertices(cone, cfg.jitter * Math.max(0.2, baseTierRadius) * 0.42, rng);
      jittered.rotateY(i * 0.55);
      jittered.translate(trunkPt.x, tierY + tierHeight * 0.25, trunkPt.z);

      foliageGeos.push(treeColorizeGeometry(jittered, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar,
        snowCoverage: cfg.snow,
        isGradientCanopy: true
      })));
      branchTips.push(new THREE.Vector3(trunkPt.x + baseTierRadius * 0.65, tierY, trunkPt.z));
    }
  } else if (cfg.species === 'redwood') {
    const startFrac = 0.52;
    addBranchesAndSubForks(Math.max(5, branchCount), startFrac, 0.95, 0.45, 0.16, 0.36);
    for (let c = 0; c < clusterCount; c++) {
      const anchor = branchTips[c % branchTips.length];
      const cRadius = cfg.clusterSize * (0.7 + rng() * 0.4) * (isLod1 ? 1.25 : 1.0);
      pushCluster(
        anchor.x + (rng() - 0.5) * spread * 0.3,
        anchor.y + (rng() - 0.3) * 0.6,
        anchor.z + (rng() - 0.5) * spread * 0.3,
        cRadius,
        1.25,
        0.55,
        1.25,
        'cone_tuft'
      );
    }
  } else if (cfg.species === 'willow') {
    const willowBranches = Math.max(4, branchCount);
    addBranchesAndSubForks(willowBranches, 0.58, 0.93, 0.65, 0.24, 0.42);
    for (let c = 0; c < clusterCount; c++) {
      const tip = branchTips[c % branchTips.length];
      const domeSize = cfg.clusterSize * (0.65 + rng() * 0.35);
      pushCluster(tip.x, tip.y, tip.z, domeSize, 1.2, 0.65, 1.2);

      const curtainLen = height * (0.36 + rng() * 0.25) * cfg.canopyHeight;
      const curtain = new THREE.ConeGeometry(domeSize * 0.42, curtainLen, isLod1 ? 4 : 5, 2);
      curtain.rotateX(Math.PI);
      const jitteredCurtain = treeJitterGeometryVertices(curtain, cfg.jitter * 0.25, rng);
      jitteredCurtain.translate(
        tip.x + (rng() - 0.5) * domeSize * 0.8,
        tip.y - curtainLen * 0.45,
        tip.z + (rng() - 0.5) * domeSize * 0.8
      );
      foliageGeos.push(treeColorizeGeometry(jitteredCurtain, cfg.colorLeaf2, cfg.colorLeaf1, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar,
        snowCoverage: cfg.snow * 0.3
      })));
    }
  } else if (cfg.species === 'palm' || cfg.species === 'banana_palm') {
    const isBanana = cfg.species === 'banana_palm';
    const frondCount = isLod1 ? Math.max(5, Math.ceil(clusterCount * 0.65)) : Math.max(6, Math.min(14, clusterCount));
    for (let f = 0; f < frondCount; f++) {
      const fAngle = (f / frondCount) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const frondLen = spread * (isBanana ? 0.58 + rng() * 0.2 : 0.65 + rng() * 0.25);
      const frondWidth = cfg.clusterSize * (isBanana ? 0.72 : 0.48);

      const box = new THREE.BoxGeometry(frondWidth, isBanana ? 0.09 : 0.12, frondLen, 2, 1, isLod1 ? 3 : 5);
      box.translate(0, 0, frondLen / 2);

      const pos = box.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const t = Math.max(0, z / frondLen);
        const archY = Math.sin(t * Math.PI * 0.78) * (height * (isBanana ? 0.24 : 0.14)) - Math.pow(t, 2.0) * (height * 0.26 * cfg.canopyHeight);
        const widthScale = isBanana ? (Math.sin(t * Math.PI) * 0.95 + 0.22) : (Math.sin(t * Math.PI) * 0.9 + 0.15);
        pos.setX(i, pos.getX(i) * widthScale);
        pos.setY(i, pos.getY(i) + archY);
      }

      box.rotateY(fAngle);
      box.translate(trunkTop.x, trunkTop.y - 0.1, trunkTop.z);
      foliageGeos.push(treeColorizeGeometry(box, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar,
        snowCoverage: cfg.snow
      })));
    }
  } else if (cfg.species === 'mangrove') {
    addBranchesAndSubForks(Math.max(4, branchCount), 0.35, 0.92, 0.58, 0.28, 0.5);
    for (let c = 0; c < clusterCount; c++) {
      const anchor = branchTips[c % branchTips.length];
      const cRadius = cfg.clusterSize * (0.65 + rng() * 0.35) * (isLod1 ? 1.25 : 1.0);
      pushCluster(
        anchor.x + (rng() - 0.5) * spread * 0.4,
        anchor.y + (rng() - 0.25) * 0.5,
        anchor.z + (rng() - 0.5) * spread * 0.4,
        cRadius,
        1.2,
        0.72,
        1.2
      );
    }
  } else if (cfg.species === 'cactus') {
    const armCount = Math.min(4, Math.max(1, branchCount));
    for (let a = 0; a < armCount; a++) {
      const t = 0.35 + (a / Math.max(1, armCount)) * 0.35;
      const origin = getPointOnTrunk(t);
      const ang = a * 2.2 + rng() * 0.5;
      const outDist = spread * 0.38;
      const armRad = radius * 0.72;

      const elbow = new THREE.CylinderGeometry(armRad * 0.92, armRad, outDist, radialSegs, 2);
      elbow.rotateZ(Math.PI * 0.45);
      elbow.rotateY(ang);
      elbow.translate(
        origin.x + Math.cos(ang) * outDist * 0.45,
        origin.y + 0.1,
        origin.z + Math.sin(ang) * outDist * 0.45
      );
      trunkGeos.push(treeColorizeGeometry(elbow, cfg.colorBark, cfg.colorLeaf1, '#ffffff', rng, { variance: 0.08 }));

      const upLen = height * (0.25 + rng() * 0.22);
      const upArm = buildTreeTaperedLimb({
        startPoint: new THREE.Vector3(origin.x + Math.cos(ang) * outDist * 0.85, origin.y + 0.15, origin.z + Math.sin(ang) * outDist * 0.85),
        height: upLen,
        radiusBottom: armRad * 0.92,
        radiusTop: armRad * 0.80,
        radialSegments: radialSegs,
        heightSegments: 3,
        curveAmount: 0.06,
        curveAngle: ang,
        gnarlAmount: 0.05,
        barkColor: cfg.colorBark,
        barkColor2: cfg.colorLeaf1,
        isCactus: true
      }, rng);
      trunkGeos.push(upArm.geometry);
      branchTips.push(upArm.topTip);
    }
  } else if (cfg.species === 'bamboo') {
    const culmCount = isLod1 ? Math.max(3, Math.ceil(branchCount * 0.6)) : Math.max(4, Math.min(10, branchCount + 2));
    for (let c = 0; c < culmCount; c++) {
      const ang = (c / culmCount) * Math.PI * 2 + rng() * 0.4;
      const dist = c === 0 ? 0 : (0.18 + rng() * 0.55) * spread * 0.42;
      const culmH = height * (0.72 + rng() * 0.35);
      const culmR = Math.max(0.06, radius * (0.65 + rng() * 0.4));
      const culm = buildTreeTaperedLimb({
        startPoint: new THREE.Vector3(Math.cos(ang) * dist, layout.planterLift, Math.sin(ang) * dist),
        height: culmH,
        radiusBottom: culmR,
        radiusTop: culmR * 0.68,
        radialSegments: Math.max(5, radialSegs),
        heightSegments: isLod1 ? 4 : 8,
        curveAmount: curve * (0.6 + rng() * 0.6),
        curveAngle: ang + (rng() - 0.5) * 0.5,
        gnarlAmount: cfg.gnarl * 0.3,
        barkColor: cfg.colorBark,
        barkColor2: barkDark,
        isBamboo: true
      }, rng);
      trunkGeos.push(culm.geometry);
      branchTips.push(culm.topTip);

      // Feathery leaf tufts at upper nodes
      const tufts = isLod1 ? 1 : 2;
      for (let tf = 0; tf < tufts; tf++) {
        const tuftPos = culm.topTip.clone().lerp(new THREE.Vector3(Math.cos(ang) * dist, layout.planterLift, Math.sin(ang) * dist), tf * 0.25);
        pushCluster(tuftPos.x, tuftPos.y, tuftPos.z, cfg.clusterSize * 0.55, 1.3, 0.55, 1.3, 'octahedron');
      }
    }
  } else if (cfg.species === 'dead') {
    addBranchesAndSubForks(Math.max(3, branchCount), 0.36, 0.92, 0.72, 0.34, 0.6);
  } else if (cfg.species === 'bush') {
    buildShrubProceduralFoliage(cfg, {
      clusterCount,
      polyDetail,
      spread,
      height,
      planterLift: layout.planterLift,
      isLod1
    }, foliageGeos, rng, simulateTextureError);
  } else if (cfg.species === 'topiary') {
    const shape = cfg.topiaryShape || 'tiered_spheres';
    const topY = trunkTop.y;
    if (shape === 'sphere') {
      pushCluster(trunkTop.x, topY + cfg.clusterSize * 0.65, trunkTop.z, cfg.clusterSize * 1.15, 1.0, 1.0, 1.0, 'icosahedron');
    } else if (shape === 'tiered_spheres') {
      const tiers = isLod1 ? 2 : 3;
      for (let i = 0; i < tiers; i++) {
        const r = cfg.clusterSize * (1.05 - i * 0.25);
        pushCluster(trunkTop.x, topY + i * r * 1.45, trunkTop.z, r, 1.0, 0.95, 1.0, 'icosahedron');
      }
    } else if (shape === 'spiral') {
      const steps = isLod1 ? 6 : 12;
      for (let i = 0; i < steps; i++) {
        const frac = i / (steps - 1);
        const ang = frac * Math.PI * 3.5;
        const rad = spread * 0.32 * (1 - frac * 0.65);
        const y = layout.trunkStartY + trunkHeight * 0.25 + frac * height * 0.68;
        pushCluster(Math.cos(ang) * rad, y, Math.sin(ang) * rad, cfg.clusterSize * (0.62 - frac * 0.28), 1.0, 0.85, 1.0);
      }
    } else if (shape === 'cone') {
      const cone = new THREE.ConeGeometry(spread * 0.55, height * 0.68, isLod1 ? 6 : 10, 2);
      cone.translate(trunkTop.x, layout.trunkStartY + height * 0.52, trunkTop.z);
      foliageGeos.push(treeColorizeGeometry(cone, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar * 0.5,
        snowCoverage: cfg.snow,
        isGradientCanopy: true
      })));
    } else {
      // hedge_box
      const box = new THREE.BoxGeometry(spread * 0.95, height * 0.68, spread * 0.58, 2, 2, 2);
      const jittered = treeJitterGeometryVertices(box, cfg.jitter * 0.2, rng);
      jittered.translate(0, layout.planterLift + height * 0.42, 0);
      foliageGeos.push(treeColorizeGeometry(jittered, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar * 0.65,
        snowCoverage: cfg.snow
      })));
    }
  } else if (cfg.species === 'bonsai') {
    addBranchesAndSubForks(Math.max(3, branchCount), 0.45, 0.95, 0.58, 0.22, 0.46);
    for (let c = 0; c < clusterCount; c++) {
      const tip = branchTips[c % branchTips.length];
      pushCluster(
        tip.x + (rng() - 0.5) * 0.25,
        tip.y + (rng() - 0.2) * 0.18,
        tip.z + (rng() - 0.5) * 0.25,
        cfg.clusterSize * (0.55 + rng() * 0.35),
        1.45,
        0.42,
        1.45,
        'faceted_pad'
      );
    }
  } else if (cfg.species === 'fantasy') {
    const fForm = cfg.fantasyForm || 'crystal';
    if (fForm === 'mushroom') {
      const capR = Math.max(1.2, spread * 0.65);
      const capH = Math.max(0.8, height * 0.35 * cfg.canopyHeight);
      const cap = new THREE.SphereGeometry(capR, isLod1 ? 6 : 9, isLod1 ? 3 : 4, 0, Math.PI * 2, 0, Math.PI * 0.58);
      cap.scale(1.0, capH / capR, 1.0);
      const jitteredCap = treeJitterGeometryVertices(cap, cfg.jitter * capR * 0.22, rng, true);
      jitteredCap.translate(trunkTop.x, trunkTop.y - capH * 0.25, trunkTop.z);
      foliageGeos.push(treeColorizeGeometry(jitteredCap, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, foliageColorOpts({
        variance: cfg.colorVar,
        snowCoverage: cfg.snow,
        isGradientCanopy: true
      })));

      // Bioluminescent spots & under-gills
      const spotCount = isLod1 ? 4 : 9;
      for (let sp = 0; sp < spotCount; sp++) {
        const ang = (sp / spotCount) * Math.PI * 2 + rng() * 0.4;
        const elev = 0.2 + rng() * 0.55;
        const sr = Math.sin(elev * Math.PI * 0.5) * capR * 0.92;
        const sy = trunkTop.y - capH * 0.25 + Math.cos(elev * Math.PI * 0.5) * capH * 0.94;
        const spot = new THREE.OctahedronGeometry(0.16 + rng() * 0.14, 0);
        spot.translate(trunkTop.x + Math.cos(ang) * sr, sy, trunkTop.z + Math.sin(ang) * sr);
        emissiveGeos.push(treeColorizeGeometry(spot, cfg.colorAccent, cfg.colorLeaf2, '#ffffff', rng, { variance: 0.08 }));
      }
    } else if (fForm === 'arcane_willow') {
      addBranchesAndSubForks(Math.max(4, branchCount), 0.5, 0.94, 0.62, 0.28, 0.48);
      for (let c = 0; c < clusterCount; c++) {
        const tip = branchTips[c % branchTips.length];
        const cSize = cfg.clusterSize * (0.62 + rng() * 0.35);
        pushCluster(tip.x, tip.y, tip.z, cSize, 1.2, 0.72, 1.2);
        if (c % 2 === 0) {
          const orb = new THREE.OctahedronGeometry(0.18 + rng() * 0.12, 0);
          orb.translate(tip.x + (rng() - 0.5) * 0.4, tip.y - 0.65 - rng() * 0.6, tip.z + (rng() - 0.5) * 0.4);
          emissiveGeos.push(treeColorizeGeometry(orb, cfg.colorAccent, cfg.colorLeaf1, '#ffffff', rng, { variance: 0.05 }));
        }
      }
    } else {
      addBranchesAndSubForks(branchCount, 0.4, 0.9, 0.52, 0.28, 0.45);
      for (let c = 0; c < clusterCount; c++) {
        const tip = branchTips[c % branchTips.length];
        const cSize = cfg.clusterSize * (0.55 + rng() * 0.45);
        const isCrystal = c % 3 === 0;
        const shard = isCrystal
          ? new THREE.OctahedronGeometry(cSize * 0.75, 0)
          : new THREE.IcosahedronGeometry(cSize * 0.85, polyDetail);
        if (isCrystal) shard.scale(0.65, 1.65 * cfg.canopyHeight, 0.65);
        else shard.scale(1.1, 0.8 * cfg.canopyHeight, 1.1);

        const jittered = treeJitterGeometryVertices(shard, cfg.jitter * cSize * 0.4, rng);
        const orbitAngle = (c / clusterCount) * Math.PI * 2;
        const orbitDist = spread * 0.38 * rng();
        jittered.translate(
          tip.x + Math.cos(orbitAngle) * orbitDist,
          tip.y + (rng() - 0.2) * height * 0.22,
          tip.z + Math.sin(orbitAngle) * orbitDist
        );

        const shardOpts = isCrystal
          ? { variance: cfg.colorVar, snowCoverage: cfg.snow, isGradientCanopy: true }
          : foliageColorOpts({ variance: cfg.colorVar, snowCoverage: cfg.snow, isGradientCanopy: true });
        const colored = treeColorizeGeometry(
          jittered,
          isCrystal ? cfg.colorAccent : cfg.colorLeaf1,
          cfg.colorLeaf2,
          cfg.colorAccent,
          rng,
          shardOpts
        );
        if (isCrystal) emissiveGeos.push(colored);
        else foliageGeos.push(colored);
      }
    }
  }

  // Story props, fruit, vines, lanterns
  const story = buildTreeStoryProps(cfg, layout, branchTips, rng, isLod1);
  foliageGeos.push(...story.foliageProps);
  trunkGeos.push(...story.trunkProps);
  emissiveGeos.push(...story.emissiveProps);

  // User-placed flowers, fruits & hanging objects
  const customPlaced = buildPlacedTreeDetails(cfg, rng, isLod1);
  foliageGeos.push(...customPlaced.foliageProps);
  trunkGeos.push(...customPlaced.trunkProps);
  emissiveGeos.push(...customPlaced.emissiveProps);

  const mergedTrunk = treeMergeBufferGeometries(trunkGeos);
  const mergedFoliage = treeMergeBufferGeometries(foliageGeos);
  const mergedEmissive = treeMergeBufferGeometries(emissiveGeos);
  const mergedPlanter = treeMergeBufferGeometries(planterGeos);
  const fullGeo = treeMergeBufferGeometries([mergedTrunk, mergedFoliage, mergedEmissive, mergedPlanter]);
  fullGeo.computeBoundingBox();

  const bbox = fullGeo.boundingBox || new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, height, 1));
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  return {
    layout,
    trunkGeo: mergedTrunk,
    foliageGeo: mergedFoliage,
    emissiveGeo: mergedEmissive,
    planterGeo: mergedPlanter,
    mergedGeo: fullGeo,
    bbox,
    size,
    center,
    trunkTop
  };
}

export function treeRemapPlaneUVs(planeGeo, uMin, vMin, uMax, vMax) {
  const uv = planeGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
  }
  uv.needsUpdate = true;
}

export function buildTreeBillboardMesh(lod0Data, atlasTexture, options = {}) {
  const includeIsoCap = options.includeIsoCap !== false;
  const species = options.species || 'oak';
  const wireframe = Boolean(options.wireframe);
  const maxDim = Math.max(lod0Data.size.x, lod0Data.size.y, lod0Data.size.z, 2.0) * 1.12;
  const center = lod0Data.center;

  const p1 = new THREE.PlaneGeometry(maxDim, maxDim);
  treeRemapPlaneUVs(p1, 0.0, 0.5, 0.5, 1.0);
  p1.translate(center.x, center.y, center.z);

  const p2 = new THREE.PlaneGeometry(maxDim, maxDim);
  treeRemapPlaneUVs(p2, 0.5, 0.5, 1.0, 1.0);
  p2.rotateY(Math.PI / 4);
  p2.translate(center.x, center.y, center.z);

  const p3 = new THREE.PlaneGeometry(maxDim, maxDim);
  treeRemapPlaneUVs(p3, 0.0, 0.0, 0.5, 0.5);
  p3.rotateY(Math.PI / 2);
  p3.translate(center.x, center.y, center.z);

  const planes = [p1, p2, p3];

  if (includeIsoCap && species !== 'dead') {
    const pCap = new THREE.PlaneGeometry(maxDim * 0.92, maxDim * 0.92);
    treeRemapPlaneUVs(pCap, 0.5, 0.0, 1.0, 0.5);
    pCap.rotateX(-Math.PI / 2.35);
    pCap.translate(center.x, center.y + lod0Data.size.y * 0.14, center.z);
    planes.push(pCap);
  }

  const mergedBillboardGeo = treeMergeBufferGeometries(planes);
  const billboardMat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    alphaTest: 0.35,
    transparent: true,
    side: THREE.DoubleSide,
    wireframe
  });

  const mesh = new THREE.Mesh(mergedBillboardGeo, billboardMat);
  mesh.userData.isBillboardImpostor = true;
  mesh.userData._ownedMat = true;
  return mesh;
}

export function buildTreeHemisphereGeo(cfg, lod0Data, seedOffset = 0, options = {}) {
  const rng = treeRng32(cfg.seed + seedOffset * 313 + 99);
  const simulateTextureError = Boolean(options && options.simulateTextureError);
  const geos = [];

  const stemHeight = cfg.species === 'bush' ? cfg.height * 0.25 : cfg.height * 0.55;
  const stem = new THREE.CylinderGeometry(cfg.radius * 0.35, cfg.radius * 0.85, stemHeight, 4, 1);
  stem.translate(0, stemHeight / 2, 0);
  geos.push(treeColorizeGeometry(stem, cfg.colorBark, cfg.colorBark, '#ffffff', rng, getTreeFoliageColorOptions(cfg, {
    simulateTextureError,
    variance: 0.08,
    isBirchBark: cfg.species === 'birch',
    isFoliageSurface: false
  })));

  if (cfg.species !== 'dead') {
    const domeRadius = Math.max(0.85, cfg.spread * 0.55);
    const domeHeight = Math.max(0.85, cfg.height * 0.62 * cfg.canopyHeight);
    const isConifer = cfg.species === 'pine' || cfg.species === 'cypress';

    const domeGeo = isConifer
      ? new THREE.ConeGeometry(domeRadius, domeHeight * 1.25, 6, 1)
      : new THREE.SphereGeometry(domeRadius, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.62);

    if (!isConifer) {
      domeGeo.scale(1.0, domeHeight / domeRadius, 1.0);
    }
    const jitteredHemi = treeJitterGeometryVertices(domeGeo, cfg.jitter * domeRadius * 0.32, rng, true);
    const domeY = cfg.species === 'bush' ? domeHeight * 0.25 : (isConifer ? cfg.height * 0.56 : cfg.height * 0.38);
    jitteredHemi.translate(lod0Data.center.x, domeY, lod0Data.center.z);

    geos.push(treeColorizeGeometry(jitteredHemi, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, getTreeFoliageColorOptions(cfg, {
      simulateTextureError,
      variance: cfg.colorVar * 1.2,
      snowCoverage: cfg.snow,
      isGradientCanopy: true
    })));
  }

  return treeMergeBufferGeometries(geos);
}

export function buildTreeLod3Mesh(lod0Data, atlasTexture, wireframe = false) {
  const maxDim = Math.max(lod0Data.size.x, lod0Data.size.y, lod0Data.size.z, 2.0) * 1.1;
  const center = lod0Data.center;

  const pA = new THREE.PlaneGeometry(maxDim, maxDim);
  treeRemapPlaneUVs(pA, 0.0, 0.5, 0.5, 1.0);
  pA.translate(center.x, center.y, center.z);

  const pB = new THREE.PlaneGeometry(maxDim, maxDim);
  treeRemapPlaneUVs(pB, 0.0, 0.0, 0.5, 0.5);
  pB.rotateY(Math.PI / 2);
  pB.translate(center.x, center.y, center.z);

  const lod3Geo = treeMergeBufferGeometries([pA, pB]);
  const lod3Mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    alphaTest: 0.38,
    transparent: true,
    side: THREE.DoubleSide,
    wireframe
  });
  const mesh = new THREE.Mesh(lod3Geo, lod3Mat);
  mesh.userData.isBillboardImpostor = true;
  mesh.userData._ownedMat = true;
  return mesh;
}
