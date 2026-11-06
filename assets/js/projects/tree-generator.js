(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Deterministic Seeded PRNG (Mulberry32)
     Ensures reproducible procedural trees and consistent forest variations
     ------------------------------------------------------------------------ */
  function createPRNG(seed) {
    let a = (seed >>> 0) || 1337;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const state = {
    species: 'oak',
    seed: 1337,
    variation: 0.25,
    // Trunk & Branches
    height: 6.5,
    radius: 0.48,
    taper: 0.62,
    curve: 0.22,
    branches: 5,
    gnarl: 0.30,
    radialSegments: 6,
    // Canopy & Foliage
    spread: 3.6,
    canopyHeight: 1.0,
    density: 14,
    clusterSize: 1.45,
    polyDetail: 1,
    jitter: 0.18,
    // Seasons & Colors
    season: 'summer',
    colorLeaf1: '#3b7a2e',
    colorLeaf2: '#5a9e38',
    colorBark: '#5c4028',
    colorAccent: '#e8f4f8',
    colorVar: 0.16,
    snow: 0.0,
    // Preview & LOD Options
    viewMode: 'single',      // 'single' | 'compare' | 'forest'
    singleLod: 0,            // 0, 1, 2, 3
    lod2Style: 'billboard',  // 'billboard' | 'hemisphere' | 'hybrid'
    forestQuality: 'dynamic',
    forestCount: 120,
    atlasRes: 512,
    wireframe: false,
    autoRotate: false,
    isometricCam: false
  };

  /* Seasonal Color Presets per Archetype */
  const SEASON_PALETTES = {
    spring: {
      leaf1: '#4ea832',
      leaf2: '#82d159',
      accent: '#ffb3d9',
      snow: 0.22
    },
    summer: {
      leaf1: '#3b7a2e',
      leaf2: '#5a9e38',
      accent: '#d9f7be',
      snow: 0.0
    },
    autumn: {
      leaf1: '#d45b18',
      leaf2: '#e89c1e',
      accent: '#9e2a1c',
      snow: 0.18
    },
    winter: {
      leaf1: '#2f5249',
      leaf2: '#466961',
      accent: '#eef7fc',
      snow: 0.68
    }
  };

  /* Built-in low-poly / B Remastered Presets */
  const BUILTIN_PRESETS = {
    lumbridge_oak: {
      species: 'oak', seed: 1337, height: 6.5, radius: 0.52, taper: 0.62, curve: 0.22,
      branches: 5, gnarl: 0.30, radialSegments: 6, spread: 3.7, canopyHeight: 1.0,
      density: 14, clusterSize: 1.45, polyDetail: 1, jitter: 0.18, season: 'summer',
      colorLeaf1: '#3b7a2e', colorLeaf2: '#5a9e38', colorBark: '#5c4028', colorAccent: '#e8f4f8',
      colorVar: 0.16, snow: 0.0
    },
    seers_maple: {
      species: 'oak', seed: 4092, height: 7.4, radius: 0.46, taper: 0.65, curve: 0.18,
      branches: 6, gnarl: 0.25, radialSegments: 6, spread: 4.1, canopyHeight: 1.15,
      density: 18, clusterSize: 1.50, polyDetail: 1, jitter: 0.22, season: 'autumn',
      colorLeaf1: '#c93b18', colorLeaf2: '#e67e17', colorBark: '#4a3525', colorAccent: '#ffbe3d',
      colorVar: 0.22, snow: 0.15
    },
    silver_birch: {
      species: 'birch', seed: 8821, height: 7.8, radius: 0.30, taper: 0.72, curve: 0.28,
      branches: 5, gnarl: 0.20, radialSegments: 6, spread: 2.8, canopyHeight: 1.35,
      density: 13, clusterSize: 1.20, polyDetail: 1, jitter: 0.16, season: 'spring',
      colorLeaf1: '#64b543', colorLeaf2: '#91d966', colorBark: '#dcd6cd', colorAccent: '#fff0f6',
      colorVar: 0.14, snow: 0.0
    },
    draynor_willow: {
      species: 'willow', seed: 3105, height: 6.2, radius: 0.58, taper: 0.58, curve: 0.42,
      branches: 6, gnarl: 0.45, radialSegments: 6, spread: 4.4, canopyHeight: 1.1,
      density: 18, clusterSize: 1.35, polyDetail: 1, jitter: 0.15, season: 'summer',
      colorLeaf1: '#3d7040', colorLeaf2: '#5d9152', colorBark: '#4a3b28', colorAccent: '#a3c98d',
      colorVar: 0.14, snow: 0.0
    },
    rellekka_pine: {
      species: 'pine', seed: 7741, height: 9.2, radius: 0.42, taper: 0.80, curve: 0.08,
      branches: 6, gnarl: 0.12, radialSegments: 6, spread: 3.1, canopyHeight: 1.45,
      density: 7, clusterSize: 1.55, polyDetail: 1, jitter: 0.12, season: 'winter',
      colorLeaf1: '#1f4d36', colorLeaf2: '#2d6648', colorBark: '#422c1d', colorAccent: '#f0f8ff',
      colorVar: 0.10, snow: 0.58
    },
    karamja_palm: {
      species: 'palm', seed: 5519, height: 7.6, radius: 0.36, taper: 0.55, curve: 0.68,
      branches: 8, gnarl: 0.15, radialSegments: 6, spread: 4.2, canopyHeight: 0.8,
      density: 9, clusterSize: 1.4, polyDetail: 1, jitter: 0.10, season: 'summer',
      colorLeaf1: '#4d9c2d', colorLeaf2: '#76bf43', colorBark: '#755638', colorAccent: '#4a321a',
      colorVar: 0.12, snow: 0.0
    },
    wildy_dead: {
      species: 'dead', seed: 6660, height: 6.4, radius: 0.50, taper: 0.68, curve: 0.48,
      branches: 7, gnarl: 0.72, radialSegments: 5, spread: 3.5, canopyHeight: 1.0,
      density: 6, clusterSize: 0.8, polyDetail: 0, jitter: 0.25, season: 'autumn',
      colorLeaf1: '#3b322c', colorLeaf2: '#4f433b', colorBark: '#382f29', colorAccent: '#6e5f53',
      colorVar: 0.10, snow: 0.0
    },
    prif_crystal: {
      species: 'fantasy', seed: 9999, height: 7.5, radius: 0.46, taper: 0.65, curve: 0.35,
      branches: 6, gnarl: 0.40, radialSegments: 6, spread: 3.8, canopyHeight: 1.25,
      density: 16, clusterSize: 1.35, polyDetail: 1, jitter: 0.20, season: 'spring',
      colorLeaf1: '#00d4ff', colorLeaf2: '#9d4edd', colorBark: '#232946', colorAccent: '#e0fbfc',
      colorVar: 0.25, snow: 0.35
    },
    varrock_bush: {
      species: 'bush', seed: 2048, height: 2.4, radius: 0.24, taper: 0.70, curve: 0.20,
      branches: 4, gnarl: 0.30, radialSegments: 5, spread: 2.8, canopyHeight: 0.85,
      density: 12, clusterSize: 1.25, polyDetail: 1, jitter: 0.20, season: 'spring',
      colorLeaf1: '#397d28', colorLeaf2: '#559e3e', colorBark: '#4f3824', colorAccent: '#ff3860',
      colorVar: 0.15, snow: 0.35
    }
  };

  /* UI Toast Notification */
  function showToast(message, iconClass = 'fa-check-circle') {
    const container = document.getElementById('tree-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.innerHTML = `<i class="fas ${iconClass}" style="color: var(--accent);"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  /* ------------------------------------------------------------------------
     Low-Poly Geometry Utilities & Vertex Color Engine
     Convert all geometry to non-indexed flat-shaded BufferGeometries
     with explicit vertex colors so style facets look crisp and export cleanly
     ------------------------------------------------------------------------ */
  function mergeBufferGeometries(geometries) {
    if (!geometries || geometries.length === 0) return new THREE.BufferGeometry();
    let totalVerts = 0;
    const validGeos = [];

    for (let i = 0; i < geometries.length; i++) {
      if (!geometries[i] || !geometries[i].attributes || !geometries[i].attributes.position) continue;
      const g = geometries[i].index ? geometries[i].toNonIndexed() : geometries[i];
      validGeos.push(g);
      totalVerts += g.attributes.position.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);

    let offset3 = 0;
    let offset2 = 0;

    for (let i = 0; i < validGeos.length; i++) {
      const g = validGeos[i];
      const posAttr = g.attributes.position;
      g.computeVertexNormals();
      const normAttr = g.attributes.normal;
      const colAttr = g.attributes.color;
      const uvAttr = g.attributes.uv;

      positions.set(posAttr.array, offset3);
      if (normAttr) normals.set(normAttr.array, offset3);

      if (colAttr) {
        colors.set(colAttr.array, offset3);
      } else {
        for (let j = 0; j < posAttr.count * 3; j++) colors[offset3 + j] = 1.0;
      }

      if (uvAttr) {
        uvs.set(uvAttr.array, offset2);
      }

      offset3 += posAttr.count * 3;
      offset2 += posAttr.count * 2;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return merged;
  }

  /* Perturb shared vertices */
  function jitterGeometryVertices(geo, jitterAmount, rng, lockBottomY = false) {
    if (jitterAmount <= 0.001) return geo;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const pos = g.attributes.position;
    const vertexMap = new Map();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (lockBottomY && y < 0.05) continue;

      const key = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}`;
      let offset = vertexMap.get(key);
      if (!offset) {
        offset = [
          (rng() - 0.5) * 2 * jitterAmount,
          (rng() - 0.5) * 2 * jitterAmount,
          (rng() - 0.5) * 2 * jitterAmount
        ];
        vertexMap.set(key, offset);
      }
      pos.setXYZ(i, x + offset[0], y + offset[1], z + offset[2]);
    }
    g.computeVertexNormals();
    return g;
  }

  /* Apply per-face flat-shaded vertex colors with optional snow/blossom top cap & birch bands */
  function colorizeGeometry(geo, baseHex, secondaryHex, accentHex, rng, options = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const colors = new Float32Array(pos.count * 3);

    const c1 = new THREE.Color(baseHex);
    const c2 = new THREE.Color(secondaryHex || baseHex);
    const cAccent = new THREE.Color(accentHex || '#ffffff');
    const tempColor = new THREE.Color();

    const variance = options.variance !== undefined ? options.variance : 0.12;
    const snowCoverage = options.snowCoverage || 0.0;
    const isBirchBark = options.isBirchBark || false;
    const isGradientCanopy = options.isGradientCanopy || false;

    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanY = Math.max(0.001, maxY - minY);

    // Assign vertex colors per triangle face for flat shading
    for (let i = 0; i < pos.count; i += 3) {
      const ny = (norm.getY(i) + norm.getY(i + 1) + norm.getY(i + 2)) / 3;
      const avgY = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const normY = (avgY - minY) / spanY;

      let mixFactor = rng();
      if (isGradientCanopy) {
        mixFactor = Math.min(1, Math.max(0, normY * 0.85 + (rng() - 0.5) * 0.35));
      }

      tempColor.copy(c1).lerp(c2, mixFactor);

      // Birch bark dark horizontal lenticel notches
      if (isBirchBark) {
        const band = Math.sin(avgY * 11.0 + rng() * 1.5);
        if (band > 0.68) {
          tempColor.setHex(0x2b2623);
        }
      }

      // Top-facing snow / blossom cap
      if (snowCoverage > 0.01 && ny > (1.0 - snowCoverage * 1.45)) {
        tempColor.copy(cAccent);
      }

      // Subtle per-facet low-poly lightness variation
      const facetShift = (rng() - 0.5) * variance * 0.65 + ny * 0.06;
      tempColor.offsetHSL(0, 0, facetShift);

      for (let v = 0; v < 3; v++) {
        const idx = (i + v) * 3;
        colors[idx] = Math.min(1, Math.max(0, tempColor.r));
        colors[idx + 1] = Math.min(1, Math.max(0, tempColor.g));
        colors[idx + 2] = Math.min(1, Math.max(0, tempColor.b));
      }
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }

  /* Build a curved, tapered low-poly trunk or branch tube */
  function buildTaperedLimb(params, rng) {
    const {
      startPoint,
      height,
      radiusBottom,
      radiusTop,
      radialSegments,
      heightSegments,
      curveAmount,
      curveAngle,
      gnarlAmount,
      barkColor,
      barkColor2,
      isBirch,
      isPalm
    } = params;

    const cyl = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments,
      false
    );
    // Shift cylinder so bottom is at (0,0,0) and top is at (0,height,0)
    // The cylinder must remain intact, the cylinder must not be harmed
    cyl.translate(0, height / 2, 0);

    const pos = cyl.attributes.position;
    const dirX = Math.cos(curveAngle);
    const dirZ = Math.sin(curveAngle);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, y / height));
      let x = pos.getX(i);
      let z = pos.getZ(i);

      // Root flare at very base
      if (t < 0.12 && startPoint.y < 0.05) {
        const flare = 1.0 + (1.0 - t / 0.12) * 0.28;
        x *= flare;
        z *= flare;
      }

      // Palm segmented ring ridges
      if (isPalm) {
        const ringScale = 1.0 + Math.sin(t * Math.PI * heightSegments * 1.5) * 0.1;
        x *= ringScale;
        z *= ringScale;
      }

      // Smooth quadratic curve + gnarl wave
      const bend = Math.pow(t, 1.65) * curveAmount * height * 0.35;
      const gnarlX = Math.sin(t * Math.PI * 2.5) * gnarlAmount * 0.25 * t;
      const gnarlZ = Math.cos(t * Math.PI * 2.0) * gnarlAmount * 0.25 * t;

      pos.setXYZ(
        i,
        x + startPoint.x + dirX * bend + gnarlX,
        y + startPoint.y,
        z + startPoint.z + dirZ * bend + gnarlZ
      );
    }

    const topTip = new THREE.Vector3(
      startPoint.x + dirX * (curveAmount * height * 0.35),
      startPoint.y + height,
      startPoint.z + dirZ * (curveAmount * height * 0.35)
    );

    const colored = colorizeGeometry(cyl, barkColor, barkColor2, '#ffffff', rng, {
      variance: 0.1,
      isBirchBark: isBirch
    });

    return { geometry: colored, topTip };
  }

  /* ------------------------------------------------------------------------
     Procedural Species Generators (LOD0 High & LOD1 Medium)
     Returns { trunkGeo, foliageGeo, mergedGeo, canopyCenter, canopyRadius, bounds }
     ------------------------------------------------------------------------ */
  function generateProceduralTreeData(cfg, lodLevel = 0, seedOffset = 0) {
    const rng = createPRNG(cfg.seed + seedOffset * 7919);

    // Apply subtle species variation jitter when generating forest instances (seedOffset > 0)
    const vScale = seedOffset > 0 ? cfg.variation : 0;
    const height = cfg.height * (1 + (rng() - 0.5) * vScale * 0.7);
    const radius = cfg.radius * (1 + (rng() - 0.5) * vScale * 0.5);
    const spread = cfg.spread * (1 + (rng() - 0.5) * vScale * 0.65);
    const curve = cfg.curve + (rng() - 0.5) * vScale * 0.4;
    const curveAngle = rng() * Math.PI * 2;

    // Adjust detail based on LOD level (LOD0 = full low-poly, LOD1 = simplified ~40% tris)
    const isLod1 = lodLevel === 1;
    const radialSegs = isLod1 ? Math.max(3, Math.floor(cfg.radialSegments * 0.65)) : cfg.radialSegments;
    const heightSegs = isLod1 ? 3 : 6;
    const polyDetail = isLod1 ? Math.max(0, cfg.polyDetail - 1) : cfg.polyDetail;
    const clusterCount = isLod1 ? Math.max(3, Math.ceil(cfg.density * 0.5)) : cfg.density;
    const branchCount = isLod1 ? Math.max(1, Math.floor(cfg.branches * 0.5)) : cfg.branches;

    const trunkGeos = [];
    const foliageGeos = [];

    const barkDark = new THREE.Color(cfg.colorBark).offsetHSL(0, 0, -0.06).getStyle();
    const isBirch = cfg.species === 'birch';
    const isPalm = cfg.species === 'palm';

    // Build Primary Trunk (except bushes which have short multi-stems)
    const trunkHeight = cfg.species === 'bush' ? height * 0.35 : height * 0.72;
    const topRadius = radius * (1.0 - cfg.taper * 0.85);

    const mainTrunk = buildTaperedLimb({
      startPoint: new THREE.Vector3(0, 0, 0),
      height: trunkHeight,
      radiusBottom: radius,
      radiusTop: Math.max(0.05, topRadius),
      radialSegments: radialSegs,
      heightSegments: heightSegs,
      curveAmount: curve,
      curveAngle: curveAngle,
      gnarlAmount: cfg.gnarl,
      barkColor: cfg.colorBark,
      barkColor2: barkDark,
      isBirch,
      isPalm
    }, rng);

    trunkGeos.push(mainTrunk.geometry);
    const trunkTop = mainTrunk.topTip;

    // Helper to evaluate point along main trunk at fraction t (0..1)
    function getPointOnTrunk(t) {
      const bend = Math.pow(t, 1.65) * curve * trunkHeight * 0.35;
      return new THREE.Vector3(
        Math.cos(curveAngle) * bend,
        t * trunkHeight,
        Math.sin(curveAngle) * bend
      );
    }

    // Archetype-Specific Branch & Canopy Generation
    const branchTips = [trunkTop.clone()];

    if (cfg.species === 'oak' || cfg.species === 'birch') {
      // Broadleaf branches + faceted foliage clusters
      for (let b = 0; b < branchCount; b++) {
        const t = 0.45 + (b / Math.max(1, branchCount)) * 0.48;
        const origin = getPointOnTrunk(t);
        const bAngle = (b * 2.39996) + (rng() - 0.5) * 0.5;
        const bLen = spread * (0.45 + rng() * 0.35);
        const bHeight = height * (0.22 + rng() * 0.18);

        const branch = buildTaperedLimb({
          startPoint: origin,
          height: bHeight,
          radiusBottom: radius * (1 - t * 0.5) * 0.55,
          radiusTop: radius * 0.14,
          radialSegments: Math.max(3, radialSegs - 1),
          heightSegments: isLod1 ? 2 : 3,
          curveAmount: bLen / Math.max(0.5, bHeight),
          curveAngle: bAngle,
          gnarlAmount: cfg.gnarl,
          barkColor: cfg.colorBark,
          barkColor2: barkDark,
          isBirch,
          isPalm: false
        }, rng);

        trunkGeos.push(branch.geometry);
        branchTips.push(branch.topTip);
      }

      // Broadleaf Foliage Clusters around branch tips and crown
      for (let c = 0; c < clusterCount; c++) {
        const anchor = branchTips[c % branchTips.length];
        const cRadius = cfg.clusterSize * (0.65 + rng() * 0.45) * (isLod1 ? 1.25 : 1.0);
        const ico = new THREE.IcosahedronGeometry(cRadius, polyDetail);

        // Flatten slightly along Y for layered canopy structure
        ico.scale(1.15, 0.78 * cfg.canopyHeight, 1.15);
        const jittered = jitterGeometryVertices(ico, cfg.jitter * cRadius, rng);

        const offsetAngle = rng() * Math.PI * 2;
        const offsetDist = (c < branchTips.length ? 0.15 : 0.55) * spread * 0.45 * rng();
        const posX = anchor.x + Math.cos(offsetAngle) * offsetDist;
        const posY = anchor.y + (rng() - 0.3) * cfg.clusterSize * 0.65;
        const posZ = anchor.z + Math.sin(offsetAngle) * offsetDist;

        jittered.translate(posX, posY, posZ);

        const colored = colorizeGeometry(
          jittered,
          cfg.colorLeaf1,
          cfg.colorLeaf2,
          cfg.colorAccent,
          rng,
          {
            variance: cfg.colorVar,
            snowCoverage: cfg.snow,
            isGradientCanopy: true
          }
        );
        foliageGeos.push(colored);
      }

    } else if (cfg.species === 'pine') {
      // Conifer tiered conical skirts from 30% height up to peak
      const tiers = isLod1 ? Math.max(3, Math.ceil(clusterCount * 0.6)) : Math.max(4, Math.min(12, clusterCount));
      const coneRadial = isLod1 ? Math.max(5, radialSegs) : Math.max(6, radialSegs + 2);

      for (let i = 0; i < tiers; i++) {
        const frac = i / Math.max(1, tiers - 1);
        const tierY = height * (0.26 + frac * 0.68);
        const trunkPt = getPointOnTrunk(Math.min(1, tierY / trunkHeight));
        const tierRadius = spread * 0.65 * (1.0 - frac * 0.78) * (cfg.clusterSize * 0.7);
        const tierHeight = (height / tiers) * 1.65 * cfg.canopyHeight;

        const cone = new THREE.ConeGeometry(Math.max(0.25, tierRadius), tierHeight, coneRadial, isLod1 ? 1 : 2);
        const jittered = jitterGeometryVertices(cone, cfg.jitter * tierRadius * 0.45, rng);
        jittered.rotateY(i * 0.55);
        jittered.translate(trunkPt.x, tierY + tierHeight * 0.25, trunkPt.z);

        const colored = colorizeGeometry(
          jittered,
          cfg.colorLeaf1,
          cfg.colorLeaf2,
          cfg.colorAccent,
          rng,
          {
            variance: cfg.colorVar,
            snowCoverage: cfg.snow,
            isGradientCanopy: true
          }
        );
        foliageGeos.push(colored);
      }

    } else if (cfg.species === 'willow') {
      // Wide umbrella branches + hanging low-poly frond curtains
      const willowBranches = Math.max(4, branchCount);
      for (let b = 0; b < willowBranches; b++) {
        const t = 0.58 + (b / willowBranches) * 0.35;
        const origin = getPointOnTrunk(t);
        const bAngle = (b / willowBranches) * Math.PI * 2 + (rng() - 0.5) * 0.3;
        const bSpread = spread * (0.55 + rng() * 0.3);
        const bHeight = height * 0.25;

        const branch = buildTaperedLimb({
          startPoint: origin,
          height: bHeight,
          radiusBottom: radius * 0.42,
          radiusTop: radius * 0.12,
          radialSegments: Math.max(3, radialSegs - 1),
          heightSegments: 3,
          curveAmount: bSpread / bHeight,
          curveAngle: bAngle,
          gnarlAmount: cfg.gnarl,
          barkColor: cfg.colorBark,
          barkColor2: barkDark,
          isBirch: false,
          isPalm: false
        }, rng);

        trunkGeos.push(branch.geometry);
        branchTips.push(branch.topTip);
      }

      // Dome crown clusters + hanging willow curtains
      for (let c = 0; c < clusterCount; c++) {
        const tip = branchTips[c % branchTips.length];
        const domeSize = cfg.clusterSize * (0.65 + rng() * 0.35);

        // Crown puff
        const dome = new THREE.IcosahedronGeometry(domeSize, polyDetail);
        dome.scale(1.2, 0.65, 1.2);
        const jitteredDome = jitterGeometryVertices(dome, cfg.jitter * domeSize * 0.6, rng);
        jitteredDome.translate(tip.x, tip.y, tip.z);
        foliageGeos.push(colorizeGeometry(jitteredDome, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, {
          variance: cfg.colorVar,
          snowCoverage: cfg.snow
        }));

        // Hanging weeping frond curtain
        const curtainLen = height * (0.38 + rng() * 0.25) * cfg.canopyHeight;
        const curtain = new THREE.ConeGeometry(domeSize * 0.42, curtainLen, isLod1 ? 4 : 5, 2);
        // Invert or droop cone downward
        curtain.rotateX(Math.PI);
        const jitteredCurtain = jitterGeometryVertices(curtain, cfg.jitter * 0.25, rng);
        const hangX = tip.x + (rng() - 0.5) * domeSize * 0.8;
        const hangZ = tip.z + (rng() - 0.5) * domeSize * 0.8;
        jitteredCurtain.translate(hangX, tip.y - curtainLen * 0.45, hangZ);

        foliageGeos.push(colorizeGeometry(jitteredCurtain, cfg.colorLeaf2, cfg.colorLeaf1, cfg.colorAccent, rng, {
          variance: cfg.colorVar,
          snowCoverage: cfg.snow * 0.3
        }));
      }

    } else if (cfg.species === 'palm') {
      // Crown of arched palm fronds + coconuts at trunkTop
      const frondCount = isLod1 ? Math.max(5, Math.ceil(clusterCount * 0.6)) : Math.max(6, Math.min(14, clusterCount));
      for (let f = 0; f < frondCount; f++) {
        const fAngle = (f / frondCount) * Math.PI * 2 + (rng() - 0.5) * 0.2;
        const frondLen = spread * (0.65 + rng() * 0.25);
        const frondWidth = cfg.clusterSize * 0.48;

        const box = new THREE.BoxGeometry(frondWidth, 0.12, frondLen, 2, 1, isLod1 ? 3 : 5);
        box.translate(0, 0, frondLen / 2);

        // Arch the frond downward along Z and taper width at tip
        const pos = box.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          const t = Math.max(0, z / frondLen);
          const archY = Math.sin(t * Math.PI * 0.75) * (height * 0.14) - Math.pow(t, 2.1) * (height * 0.28 * cfg.canopyHeight);
          const widthScale = Math.sin(t * Math.PI) * 0.9 + 0.15;
          pos.setX(i, pos.getX(i) * widthScale);
          pos.setY(i, pos.getY(i) + archY);
        }

        box.rotateY(fAngle);
        box.translate(trunkTop.x, trunkTop.y - 0.1, trunkTop.z);

        foliageGeos.push(colorizeGeometry(box, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, {
          variance: cfg.colorVar,
          snowCoverage: cfg.snow
        }));
      }

      // Coconuts cluster under the crown
      const coconutCount = isLod1 ? 2 : 4;
      for (let c = 0; c < coconutCount; c++) {
        const cAngle = (c / coconutCount) * Math.PI * 2;
        const nut = new THREE.DodecahedronGeometry(radius * 0.52, 0);
        nut.translate(
          trunkTop.x + Math.cos(cAngle) * radius * 0.65,
          trunkTop.y - radius * 0.5,
          trunkTop.z + Math.sin(cAngle) * radius * 0.65
        );
        trunkGeos.push(colorizeGeometry(nut, '#3d2614', '#54351d', cfg.colorAccent, rng, { variance: 0.08 }));
      }

    } else if (cfg.species === 'dead') {
      // Gnarled multi-forked deadwood branches with sub-forks
      const mainForks = Math.max(3, branchCount);
      for (let b = 0; b < mainForks; b++) {
        const t = 0.38 + (b / mainForks) * 0.55;
        const origin = getPointOnTrunk(t);
        const bAngle = (b * 2.1) + (rng() - 0.5) * 0.6;
        const bHeight = height * (0.28 + rng() * 0.22);

        const branch = buildTaperedLimb({
          startPoint: origin,
          height: bHeight,
          radiusBottom: radius * (1 - t * 0.45) * 0.6,
          radiusTop: radius * 0.12,
          radialSegments: Math.max(3, radialSegs - 1),
          heightSegments: 4,
          curveAmount: 0.65 + rng() * 0.6,
          curveAngle: bAngle,
          gnarlAmount: cfg.gnarl * 1.4,
          barkColor: cfg.colorBark,
          barkColor2: barkDark,
          isBirch: false,
          isPalm: false
        }, rng);

        trunkGeos.push(branch.geometry);

        // Secondary dead twig fork
        if (!isLod1 || b % 2 === 0) {
          const subAngle = bAngle + (rng() > 0.5 ? 0.8 : -0.8);
          const subBranch = buildTaperedLimb({
            startPoint: branch.topTip.clone().lerp(origin, 0.35),
            height: bHeight * 0.58,
            radiusBottom: radius * 0.22,
            radiusTop: radius * 0.04,
            radialSegments: 4,
            heightSegments: 2,
            curveAmount: 0.8,
            curveAngle: subAngle,
            gnarlAmount: cfg.gnarl,
            barkColor: cfg.colorBark,
            barkColor2: barkDark,
            isBirch: false,
            isPalm: false
          }, rng);
          trunkGeos.push(subBranch.geometry);
        }
      }

    } else if (cfg.species === 'bush') {
      // Low multi-cluster shrub with berries/blossoms
      for (let c = 0; c < clusterCount; c++) {
        const angle = (c / clusterCount) * Math.PI * 2 + rng() * 0.5;
        const dist = (c === 0 ? 0 : (0.25 + rng() * 0.65) * spread * 0.45);
        const cSize = cfg.clusterSize * (0.55 + rng() * 0.45) * 0.75;
        const ico = new THREE.IcosahedronGeometry(cSize, polyDetail);
        ico.scale(1.15, 0.85 * cfg.canopyHeight, 1.15);
        const jittered = jitterGeometryVertices(ico, cfg.jitter * cSize, rng);

        const cx = Math.cos(angle) * dist;
        const cy = cSize * 0.65 + rng() * height * 0.35;
        const cz = Math.sin(angle) * dist;
        jittered.translate(cx, cy, cz);

        foliageGeos.push(colorizeGeometry(jittered, cfg.colorLeaf1, cfg.colorLeaf2, cfg.colorAccent, rng, {
          variance: cfg.colorVar,
          snowCoverage: cfg.snow * 0.5
        }));

        // Optional low-poly berries / blossoms when snow/accent > 0.05
        if (!isLod1 && cfg.snow > 0.05 && c % 2 === 0) {
          const berry = new THREE.OctahedronGeometry(cSize * 0.22, 0);
          berry.translate(
            cx + Math.cos(angle) * cSize * 0.78,
            cy + cSize * 0.45,
            cz + Math.sin(angle) * cSize * 0.78
          );
          foliageGeos.push(colorizeGeometry(berry, cfg.colorAccent, cfg.colorAccent, '#ffffff', rng, { variance: 0.05 }));
        }
      }

    } else if (cfg.species === 'fantasy') {
      // Crystal / Magic Spire Tree: Spiraling branches + floating octahedron crystal shards & glowing canopy
      for (let b = 0; b < branchCount; b++) {
        const t = 0.4 + (b / Math.max(1, branchCount)) * 0.5;
        const origin = getPointOnTrunk(t);
        const bAngle = b * 1.8 + rng() * 0.3;
        const branch = buildTaperedLimb({
          startPoint: origin,
          height: height * 0.28,
          radiusBottom: radius * 0.45,
          radiusTop: radius * 0.08,
          radialSegments: radialSegs,
          heightSegments: 3,
          curveAmount: 0.75,
          curveAngle: bAngle,
          gnarlAmount: cfg.gnarl,
          barkColor: cfg.colorBark,
          barkColor2: barkDark,
          isBirch: false,
          isPalm: false
        }, rng);
        trunkGeos.push(branch.geometry);
        branchTips.push(branch.topTip);
      }

      for (let c = 0; c < clusterCount; c++) {
        const tip = branchTips[c % branchTips.length];
        const cSize = cfg.clusterSize * (0.55 + rng() * 0.45);
        const crystal = (c % 3 === 0)
          ? new THREE.OctahedronGeometry(cSize * 0.75, 0)
          : new THREE.IcosahedronGeometry(cSize * 0.85, polyDetail);

        if (c % 3 === 0) {
          crystal.scale(0.65, 1.65 * cfg.canopyHeight, 0.65);
        } else {
          crystal.scale(1.1, 0.8 * cfg.canopyHeight, 1.1);
        }

        const jittered = jitterGeometryVertices(crystal, cfg.jitter * cSize * 0.4, rng);
        const orbitAngle = (c / clusterCount) * Math.PI * 2;
        const orbitDist = spread * 0.38 * rng();
        jittered.translate(
          tip.x + Math.cos(orbitAngle) * orbitDist,
          tip.y + (rng() - 0.2) * height * 0.22,
          tip.z + Math.sin(orbitAngle) * orbitDist
        );

        foliageGeos.push(colorizeGeometry(
          jittered,
          c % 3 === 0 ? cfg.colorAccent : cfg.colorLeaf1,
          cfg.colorLeaf2,
          cfg.colorAccent,
          rng,
          { variance: cfg.colorVar, snowCoverage: cfg.snow, isGradientCanopy: true }
        ));
      }
    }

    const mergedTrunk = mergeBufferGeometries(trunkGeos);
    const mergedFoliage = mergeBufferGeometries(foliageGeos);
    const fullGeo = mergeBufferGeometries([mergedTrunk, mergedFoliage]);
    fullGeo.computeBoundingBox();

    const bbox = fullGeo.boundingBox || new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, height, 1));
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    return {
      trunkGeo: mergedTrunk,
      foliageGeo: mergedFoliage,
      mergedGeo: fullGeo,
      bbox,
      size,
      center,
      trunkTop
    };
  }

  /* ------------------------------------------------------------------------
     Offscreen Multi-Angle Billboard Atlas Baker
     Render the generated low-poly LOD0 tree from 4 camera angles
     (0° Front, 45° Oblique, 90° Side, Isometric Top Cap) onto #atlas-canvas.
     ------------------------------------------------------------------------ */
  let bakerRenderer = null;
  let bakerScene = null;
  let bakerCamera = null;
  let sharedAtlasTexture = null;

  function initOffscreenBaker() {
    const atlasCanvas = document.getElementById('atlas-canvas');
    bakerScene = new THREE.Scene();

    const amb = new THREE.AmbientLight(0xffffff, 0.72);
    const dir1 = new THREE.DirectionalLight(0xfff8e7, 0.78);
    dir1.position.set(6, 12, 8);
    const dir2 = new THREE.DirectionalLight(0x90caf9, 0.32);
    dir2.position.set(-6, 4, -6);
    bakerScene.add(amb, dir1, dir2);

    bakerCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);

    bakerRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    bakerRenderer.setSize(state.atlasRes, state.atlasRes);
    bakerRenderer.setClearColor(0x000000, 0);

    sharedAtlasTexture = new THREE.CanvasTexture(atlasCanvas);
    sharedAtlasTexture.magFilter = THREE.LinearFilter;
    sharedAtlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  function bakeBillboardAtlas(lod0TreeData) {
    if (!bakerRenderer) initOffscreenBaker();

    const res = state.atlasRes;
    const atlasCanvas = document.getElementById('atlas-canvas');
    if (atlasCanvas.width !== res) {
      atlasCanvas.width = res;
      atlasCanvas.height = res;
      bakerRenderer.setSize(res, res);
    }

    const toRemove = [];
    bakerScene.traverse((obj) => {
      if (obj.isMesh) toRemove.push(obj);
    });
    toRemove.forEach((m) => bakerScene.remove(m));

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });
    const tempMesh = new THREE.Mesh(lod0TreeData.mergedGeo, mat);
    bakerScene.add(tempMesh);

    const size = lod0TreeData.size;
    const center = lod0TreeData.center;
    const maxDim = Math.max(size.x, size.y, size.z, 2.0) * 0.56;

    bakerCamera.left = -maxDim;
    bakerCamera.right = maxDim;
    bakerCamera.top = maxDim;
    bakerCamera.bottom = -maxDim;
    bakerCamera.updateProjectionMatrix();

    const half = res / 2;
    bakerRenderer.setScissorTest(true);
    bakerRenderer.clear();

    // Quadrant 1 (Top-Left in UV / WebGL Bottom-Left): 0° Front View
    bakerRenderer.setViewport(0, half, half, half);
    bakerRenderer.setScissor(0, half, half, half);
    bakerCamera.position.set(center.x, center.y, center.z + 25);
    bakerCamera.up.set(0, 1, 0);
    bakerCamera.lookAt(center);
    bakerRenderer.render(bakerScene, bakerCamera);

    // Quadrant 2 (Top-Right): 45° Oblique View
    bakerRenderer.setViewport(half, half, half, half);
    bakerRenderer.setScissor(half, half, half, half);
    bakerCamera.position.set(center.x + 18, center.y, center.z + 18);
    bakerCamera.up.set(0, 1, 0);
    bakerCamera.lookAt(center);
    bakerRenderer.render(bakerScene, bakerCamera);

    // Quadrant 3 (Bottom-Left): 90° Side View
    bakerRenderer.setViewport(0, 0, half, half);
    bakerRenderer.setScissor(0, 0, half, half);
    bakerCamera.position.set(center.x + 25, center.y, center.z);
    bakerCamera.up.set(0, 1, 0);
    bakerCamera.lookAt(center);
    bakerRenderer.render(bakerScene, bakerCamera);

    // Quadrant 4 (Bottom-Right): Elevated Isometric Top Cap View
    bakerRenderer.setViewport(half, 0, half, half);
    bakerRenderer.setScissor(half, 0, half, half);
    bakerCamera.position.set(center.x, center.y + 25, center.z + 0.01);
    bakerCamera.up.set(0, 0, -1);
    bakerCamera.lookAt(center);
    bakerRenderer.render(bakerScene, bakerCamera);

    bakerRenderer.setScissorTest(false);

    const ctx = atlasCanvas.getContext('2d');
    ctx.clearRect(0, 0, res, res);
    ctx.drawImage(bakerRenderer.domElement, 0, 0, res, res);

    if (sharedAtlasTexture) {
      sharedAtlasTexture.needsUpdate = true;
    }

    mat.dispose();
    return { maxDim, center, size };
  }

  /* ------------------------------------------------------------------------
     LOD2 (Billboard / Hemisphere Impostor) & LOD3 (Distant Proxy) Builders
     ------------------------------------------------------------------------ */
  function remapPlaneUVs(planeGeo, uMin, vMin, uMax, vMax) {
    const uv = planeGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
    }
    uv.needsUpdate = true;
  }

  /* Build Multi-Angle Crossed Billboard + Elevated Isometric Cap Plane */
  function buildMultiAngleBillboardMesh(lod0Data, includeIsoCap = true) {
    const maxDim = Math.max(lod0Data.size.x, lod0Data.size.y, lod0Data.size.z, 2.0) * 1.12;
    const center = lod0Data.center;

    // Plane 1: 0° Front (Top-Left Quadrant: u:[0, 0.5], v:[0.5, 1.0])
    const p1 = new THREE.PlaneGeometry(maxDim, maxDim);
    remapPlaneUVs(p1, 0.0, 0.5, 0.5, 1.0);
    p1.translate(center.x, center.y, center.z);

    // Plane 2: 45° Oblique (Top-Right Quadrant: u:[0.5, 1.0], v:[0.5, 1.0])
    const p2 = new THREE.PlaneGeometry(maxDim, maxDim);
    remapPlaneUVs(p2, 0.5, 0.5, 1.0, 1.0);
    p2.rotateY(Math.PI / 4);
    p2.translate(center.x, center.y, center.z);

    // Plane 3: 90° Side (Bottom-Left Quadrant: u:[0.0, 0.5], v:[0.0, 0.5])
    const p3 = new THREE.PlaneGeometry(maxDim, maxDim);
    remapPlaneUVs(p3, 0.0, 0.0, 0.5, 0.5);
    p3.rotateY(Math.PI / 2);
    p3.translate(center.x, center.y, center.z);

    const planes = [p1, p2, p3];

    // Plane 4: Isometric top canopy cap plane for elevated camera angles
    if (includeIsoCap && state.species !== 'dead') {
      const pCap = new THREE.PlaneGeometry(maxDim * 0.92, maxDim * 0.92);
      remapPlaneUVs(pCap, 0.5, 0.0, 1.0, 0.5);
      pCap.rotateX(-Math.PI / 2.35);
      pCap.translate(center.x, center.y + lod0Data.size.y * 0.14, center.z);
      planes.push(pCap);
    }

    const mergedBillboardGeo = mergeBufferGeometries(planes);
    const billboardMat = new THREE.MeshLambertMaterial({
      map: sharedAtlasTexture,
      alphaTest: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: state.wireframe
    });

    return new THREE.Mesh(mergedBillboardGeo, billboardMat);
  }

  /* Build Seasonal Hemisphere Impostor */
  function buildHemisphereImpostorGeo(cfg, lod0Data, seedOffset = 0) {
    const rng = createPRNG(cfg.seed + seedOffset * 313 + 99);
    const geos = [];

    // Minimal 4-sided low-poly trunk stem
    const stemHeight = cfg.species === 'bush' ? cfg.height * 0.25 : cfg.height * 0.55;
    const stem = new THREE.CylinderGeometry(cfg.radius * 0.35, cfg.radius * 0.85, stemHeight, 4, 1);
    stem.translate(0, stemHeight / 2, 0);
    geos.push(colorizeGeometry(stem, cfg.colorBark, cfg.colorBark, '#ffffff', rng, {
      variance: 0.08,
      isBirchBark: cfg.species === 'birch'
    }));

    if (cfg.species !== 'dead') {
      // Seasonal Hemisphere Dome Canopy (with gradient vertex colors + snow/blossom cap)
      const domeRadius = Math.max(1.2, cfg.spread * 0.55);
      const domeHeight = Math.max(1.2, cfg.height * 0.62 * cfg.canopyHeight);

      const hemi = new THREE.SphereGeometry(
        domeRadius,
        7,
        4,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.62
      );
      hemi.scale(1.0, domeHeight / domeRadius, 1.0);
      const jitteredHemi = jitterGeometryVertices(hemi, cfg.jitter * domeRadius * 0.35, rng, true);
      jitteredHemi.translate(
        lod0Data.center.x,
        cfg.species === 'bush' ? domeHeight * 0.2 : cfg.height * 0.38,
        lod0Data.center.z
      );

      geos.push(colorizeGeometry(
        jitteredHemi,
        cfg.colorLeaf1,
        cfg.colorLeaf2,
        cfg.colorAccent,
        rng,
        {
          variance: cfg.colorVar * 1.2,
          snowCoverage: cfg.snow,
          isGradientCanopy: true
        }
      ));
    }

    return mergeBufferGeometries(geos);
  }

  /* Build Complete LOD Group (LOD0, LOD1, LOD2, LOD3) for the active tree */
  function createTreeLODObject(cfg, lodLevel, lod0Reference, seedOffset = 0) {
    const flatMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      wireframe: state.wireframe
    });

    if (lodLevel === 0) {
      const data = seedOffset === 0 ? lod0Reference : generateProceduralTreeData(cfg, 0, seedOffset);
      return new THREE.Mesh(data.mergedGeo, flatMat);
    }

    if (lodLevel === 1) {
      const data = generateProceduralTreeData(cfg, 1, seedOffset);
      return new THREE.Mesh(data.mergedGeo, flatMat);
    }

    if (lodLevel === 2) {
      if (state.lod2Style === 'billboard') {
        return buildMultiAngleBillboardMesh(lod0Reference, true);
      } else if (state.lod2Style === 'hemisphere') {
        const hemiGeo = buildHemisphereImpostorGeo(cfg, lod0Reference, seedOffset);
        return new THREE.Mesh(hemiGeo, flatMat);
      } else {
        // Hybrid: Seasonal Hemisphere Dome + Crossed Billboard Planes
        const group = new THREE.Group();
        const hemiGeo = buildHemisphereImpostorGeo(cfg, lod0Reference, seedOffset);
        group.add(new THREE.Mesh(hemiGeo, flatMat));
        group.add(buildMultiAngleBillboardMesh(lod0Reference, false));
        return group;
      }
    }

    // LOD 3: Very Low Detail (Ultra-lightweight 2-plane cross billboard or 8-tri pyramid)
    const maxDim = Math.max(lod0Reference.size.x, lod0Reference.size.y, lod0Reference.size.z, 2.0) * 1.1;
    const center = lod0Reference.center;
    const pA = new THREE.PlaneGeometry(maxDim, maxDim);
    remapPlaneUVs(pA, 0.0, 0.5, 0.5, 1.0);
    pA.translate(center.x, center.y, center.z);

    const pB = new THREE.PlaneGeometry(maxDim, maxDim);
    remapPlaneUVs(pB, 0.0, 0.0, 0.5, 0.5);
    pB.rotateY(Math.PI / 2);
    pB.translate(center.x, center.y, center.z);

    const lod3Geo = mergeBufferGeometries([pA, pB]);
    const lod3Mat = new THREE.MeshLambertMaterial({
      map: sharedAtlasTexture,
      alphaTest: 0.38,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: state.wireframe
    });
    return new THREE.Mesh(lod3Geo, lod3Mat);
  }

  /* Count triangles & vertices inside any Three.js Object3D */
  function countGeometryStats(obj) {
    let tris = 0;
    let verts = 0;
    obj.traverse((child) => {
      if (child.isMesh && child.geometry && child.geometry.attributes.position) {
        const count = child.geometry.attributes.position.count;
        verts += count;
        tris += child.geometry.index ? (child.geometry.index.count / 3) : (count / 3);
      }
    });
    return { tris: Math.round(tris), verts: Math.round(verts) };
  }

  /* ------------------------------------------------------------------------
     Main 3D Viewport Scene, Camera & Render Loop
     ------------------------------------------------------------------------ */
  let scene, camera, renderer, controls, contentGroup, groundGroup, resizeObserver = null;
  let cachedLod0Data = null;

  function initViewport() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('tree-canvas');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x091018, 0.0085);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 400);
    camera.position.set(9, 7.5, 12);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 3.0, 0);
    controls.maxPolarAngle = Math.PI * 0.495;

    // Stylized B Remastered Lighting
    const hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x1d2b1f, 0.68);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4d6, 0.85);
    sunLight.position.set(18, 28, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 90;
    const d = 32;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x00e0ff, 0.25);
    rimLight.position.set(-15, 10, -12);
    scene.add(rimLight);

    groundGroup = new THREE.Group();
    scene.add(groundGroup);

    contentGroup = new THREE.Group();
    scene.add(contentGroup);

    window.addEventListener('resize', onViewportResize);
  }

  function onViewportResize() {
    const container = document.getElementById('canvas-container');
    if (!container || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /* Build Stylized Low-Poly Ground Pad / Forest Terrain */
  function rebuildGround(radius = 6.5) {
    while (groundGroup.children.length > 0) {
      const c = groundGroup.children[0];
      groundGroup.remove(c);
    }

    const groundColor = state.season === 'winter'
      ? 0xdcebf2
      : (state.season === 'autumn' ? 0x3b4d28 : 0x264527);

    const discGeo = new THREE.CylinderGeometry(radius, radius * 1.06, 0.35, 24);
    discGeo.translate(0, -0.175, 0);
    const discMat = new THREE.MeshLambertMaterial({ color: groundColor, flatShading: true });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.receiveShadow = true;
    groundGroup.add(disc);

    const grid = new THREE.GridHelper(radius * 2, Math.min(30, Math.round(radius * 2)), 0x00e0ff, 0x1a3344);
    grid.position.y = 0.01;
    grid.material.opacity = 0.28;
    grid.material.transparent = true;
    groundGroup.add(grid);
  }

  /* ------------------------------------------------------------------------
     Scene Rebuilder For Single, Side-By-Side LOD Compare & Forest Modes
     ------------------------------------------------------------------------ */
  function rebuildScene() {
    while (contentGroup.children.length > 0) {
      const child = contentGroup.children[0];
      contentGroup.remove(child);
    }

    // Always generate primary LOD0 tree data and bake its 4-angle Billboard Atlas
    cachedLod0Data = generateProceduralTreeData(state, 0, 0);
    bakeBillboardAtlas(cachedLod0Data);

    const overlayCards = document.getElementById('lod-cards-overlay');
    overlayCards.classList.toggle('visible', state.viewMode === 'compare');

    if (state.viewMode === 'single') {
      rebuildGround(5.0);
      const treeObj = createTreeLODObject(state, state.singleLod, cachedLod0Data, 0);
      treeObj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      contentGroup.add(treeObj);

      const stats = countGeometryStats(treeObj);
      updateHudTelemetry(stats.tris, stats.verts, 1);

    } else if (state.viewMode === 'compare') {
      rebuildGround(14.5);
      const spacing = Math.max(4.5, state.spread * 1.45);
      const offsets = [-1.5 * spacing, -0.5 * spacing, 0.5 * spacing, 1.5 * spacing];

      let totalTris = 0, totalVerts = 0;
      let lod0Tris = 1;

      for (let lod = 0; lod < 4; lod++) {
        const obj = createTreeLODObject(state, lod, cachedLod0Data, 0);
        obj.position.set(offsets[lod], 0, 0);
        obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        contentGroup.add(obj);

        // Pedestal ring under each LOD
        const ringGeo = new THREE.RingGeometry(state.spread * 0.42, state.spread * 0.48, 16);
        ringGeo.rotateX(-Math.PI / 2);
        ringGeo.translate(offsets[lod], 0.03, 0);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e0ff, side: THREE.DoubleSide });
        contentGroup.add(new THREE.Mesh(ringGeo, ringMat));

        const st = countGeometryStats(obj);
        if (lod === 0) lod0Tris = Math.max(1, st.tris);
        totalTris += st.tris;
        totalVerts += st.verts;

        const pct = Math.round((st.tris / lod0Tris) * 100);
        const cardEl = document.getElementById(`card-lod${lod}-stats`);
        if (cardEl) {
          cardEl.textContent = `${st.tris.toLocaleString()} Tris • ${pct}%`;
        }
      }

      updateHudTelemetry(totalTris, totalVerts, 4);

    } else if (state.viewMode === 'forest') {
      const count = state.forestCount;
      const forestRadius = Math.max(18, Math.sqrt(count) * state.spread * 0.92);
      rebuildGround(forestRadius * 1.15);

      // Pre-build a pool of 6 randomized species variations for LOD0, LOD1, and Hemisphere LOD2
      const variationPoolSize = 6;
      const poolLod0 = [];
      const poolLod1 = [];
      const poolHemi = [];

      for (let v = 0; v < variationPoolSize; v++) {
        const d0 = v === 0 ? cachedLod0Data : generateProceduralTreeData(state, 0, v + 1);
        const d1 = generateProceduralTreeData(state, 1, v + 1);
        const hGeo = buildHemisphereImpostorGeo(state, d0, v + 1);
        poolLod0.push(d0);
        poolLod1.push(d1);
        poolHemi.push(hGeo);
      }

      const flatMat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
        wireframe: state.wireframe
      });

      const rng = createPRNG(state.seed + 9001);
      let totalTris = 0;
      let totalVerts = 0;

      // Golden-angle spiral + jitter distribution for natural forest clearings & clusters
      for (let i = 0; i < count; i++) {
        const frac = (i + 0.5) / count;
        const r = Math.sqrt(frac) * forestRadius * (0.88 + (rng() - 0.5) * 0.22);
        const theta = i * 2.399963 + (rng() - 0.5) * 0.45;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const scale = 0.82 + rng() * 0.38;
        const rotY = rng() * Math.PI * 2;
        const poolIdx = i % variationPoolSize;

        let chosenLod = 0;
        let forceStyle = null;

        if (state.forestQuality === 'lod0') {
          chosenLod = 0;
        } else if (state.forestQuality === 'lod1') {
          chosenLod = 1;
        } else if (state.forestQuality === 'lod2-billboard') {
          chosenLod = 2;
          forceStyle = 'billboard';
        } else if (state.forestQuality === 'lod2-hemisphere') {
          chosenLod = 2;
          forceStyle = 'hemisphere';
        } else if (state.forestQuality === 'lod3') {
          chosenLod = 3;
        } else if (state.forestQuality === 'split') {
          // Left half (x < 0) = Full LOD0 Geometry; Right half (x >= 0) = LOD2 Impostor
          chosenLod = x < 0 ? 0 : 2;
        } else {
          // Dynamic Distance LOD rings from center
          const normDist = r / forestRadius;
          if (normDist < 0.30) chosenLod = 0;
          else if (normDist < 0.58) chosenLod = 1;
          else if (normDist < 0.84) chosenLod = 2;
          else chosenLod = 3;
        }

        let inst;
        if (chosenLod === 0) {
          inst = new THREE.Mesh(poolLod0[poolIdx].mergedGeo, flatMat);
        } else if (chosenLod === 1) {
          inst = new THREE.Mesh(poolLod1[poolIdx].mergedGeo, flatMat);
        } else if (chosenLod === 2) {
          const style = forceStyle || state.lod2Style;
          if (style === 'hemisphere') {
            inst = new THREE.Mesh(poolHemi[poolIdx], flatMat);
          } else if (style === 'billboard') {
            inst = buildMultiAngleBillboardMesh(poolLod0[0], true);
          } else {
            inst = new THREE.Group();
            inst.add(new THREE.Mesh(poolHemi[poolIdx], flatMat));
            inst.add(buildMultiAngleBillboardMesh(poolLod0[0], false));
          }
        } else {
          inst = createTreeLODObject(state, 3, poolLod0[0], 0);
        }

        inst.position.set(x, 0, z);
        inst.rotation.y = rotY;
        inst.scale.setScalar(scale);
        inst.traverse((m) => { if (m.isMesh) { m.castShadow = chosenLod <= 1; m.receiveShadow = true; } });
        contentGroup.add(inst);

        const st = countGeometryStats(inst);
        totalTris += st.tris;
        totalVerts += st.verts;
      }

      updateHudTelemetry(totalTris, totalVerts, count);
    }
  }

  function updateHudTelemetry(tris, verts, instances) {
    document.getElementById('hud-tris').textContent = tris.toLocaleString();
    document.getElementById('hud-verts').textContent = verts.toLocaleString();
    document.getElementById('hud-instances').textContent = instances.toLocaleString();
  }

  let animFrameId = null;

  function animateViewport() {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas || !canvas.isConnected) {
      if (typeof window.__disposeTreeGenerator === 'function') {
        window.__disposeTreeGenerator();
      }
      return;
    }

    animFrameId = requestAnimationFrame(animateViewport);
    if (state.autoRotate && contentGroup) {
      contentGroup.rotation.y += 0.0045;
    }
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  /* ------------------------------------------------------------------------
     GLB & PNG Exporting
     ------------------------------------------------------------------------ */
  function triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportObjectAsGLB(object3D, filename) {
    if (!THREE.GLTFExporter) {
      showToast('GLTFExporter not loaded yet.', 'fa-exclamation-triangle');
      return;
    }
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      object3D,
      function (result) {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          triggerDownloadBlob(blob, filename);
          showToast(`Exported ${filename} successfully!`, 'fa-cube');
        } else {
          const json = JSON.stringify(result, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          triggerDownloadBlob(blob, filename.replace('.glb', '.gltf'));
          showToast(`Exported ${filename} successfully!`, 'fa-cube');
        }
      },
      { binary: true }
    );
  }

  function exportAllLODsBundle() {
    const bundleGroup = new THREE.Group();
    bundleGroup.name = `BRemastered_${state.species}_${state.season}_${state.seed}`;

    const d0 = cachedLod0Data || generateProceduralTreeData(state, 0, 0);
    for (let lod = 0; lod < 4; lod++) {
      const mesh = createTreeLODObject(state, lod, d0, 0);
      mesh.name = `${state.species}_LOD${lod}`;
      mesh.position.set(lod * (state.spread * 1.4), 0, 0);
      bundleGroup.add(mesh);
    }

    exportObjectAsGLB(bundleGroup, `b_tree_${state.species}_${state.season}_all_lods.glb`);
  }

  function downloadAtlasPNG() {
    const atlasCanvas = document.getElementById('atlas-canvas');
    atlasCanvas.toBlob((blob) => {
      if (blob) {
        triggerDownloadBlob(blob, `b_tree_${state.species}_${state.season}_billboard_atlas.png`);
        showToast('Downloaded Multi-Angle Billboard Atlas (.PNG)', 'fa-image');
      }
    }, 'image/png');
  }

  /* ------------------------------------------------------------------------
     UI Bindings, Preset Manager & Starfield Background
     ------------------------------------------------------------------------ */
  function syncUIFromState() {
    // Species buttons
    document.querySelectorAll('#species-selector .species-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.species === state.species);
    });
    document.getElementById('active-species-badge').textContent =
      state.species.charAt(0).toUpperCase() + state.species.slice(1);

    // Season buttons
    document.querySelectorAll('.season-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.season === state.season);
    });

    // Inputs & Value Badges
    const map = [
      ['param-seed', state.seed, null, ''],
      ['param-variation', state.variation, 'val-variation', (v) => `Var: ${Number(v).toFixed(2)}`],
      ['param-height', state.height, 'val-height', (v) => `${Number(v).toFixed(1)}m`],
      ['param-radius', state.radius, 'val-radius', (v) => `${Number(v).toFixed(2)}m`],
      ['param-taper', state.taper, 'val-taper', (v) => Number(v).toFixed(2)],
      ['param-curve', state.curve, 'val-curve', (v) => Number(v).toFixed(2)],
      ['param-branches', state.branches, 'val-branches', (v) => `${v}`],
      ['param-gnarl', state.gnarl, 'val-gnarl', (v) => Number(v).toFixed(2)],
      ['param-radial', state.radialSegments, 'val-radial', (v) => `${v} sides`],
      ['param-spread', state.spread, 'val-spread', (v) => `${Number(v).toFixed(1)}m`],
      ['param-canopy-height', state.canopyHeight, 'val-canopy-height', (v) => Number(v).toFixed(2)],
      ['param-density', state.density, 'val-density', (v) => `${v}`],
      ['param-cluster-size', state.clusterSize, 'val-cluster-size', (v) => Number(v).toFixed(2)],
      ['param-poly-detail', state.polyDetail, 'val-poly-detail', (v) => v == 0 ? '0 (Blocky)' : (v == 1 ? '1 (Low-Poly)' : '2 (Smooth)')],
      ['param-jitter', state.jitter, 'val-jitter', (v) => Number(v).toFixed(2)],
      ['param-color-var', state.colorVar, 'val-color-var', (v) => Number(v).toFixed(2)],
      ['param-snow', state.snow, 'val-snow', (v) => Number(v).toFixed(2)],
      ['param-forest-count', state.forestCount, 'val-forest-count', (v) => `${v}`]
    ];

    map.forEach(([inputId, val, badgeId, fmt]) => {
      const el = document.getElementById(inputId);
      if (el) el.value = val;
      if (badgeId && fmt) {
        const b = document.getElementById(badgeId);
        if (b) b.textContent = fmt(val);
      }
    });

    document.getElementById('color-leaf-1').value = state.colorLeaf1;
    document.getElementById('color-leaf-2').value = state.colorLeaf2;
    document.getElementById('color-bark').value = state.colorBark;
    document.getElementById('color-accent').value = state.colorAccent;
  }

  function applyPresetObject(presetObj, label = 'Preset') {
    Object.assign(state, presetObj);
    syncUIFromState();
    rebuildScene();
    showToast(`Loaded ${label}`, 'fa-Magic');
  }

  function loadCustomPresetsFromStorage() {
    const container = document.getElementById('custom-presets-list');
    try {
      const raw = localStorage.getItem('b_remastered_tree_presets');
      const list = raw ? JSON.parse(raw) : {};
      const keys = Object.keys(list);
      container.innerHTML = '';
      if (keys.length === 0) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'grid';
      keys.forEach((name) => {
        const btn = document.createElement('button');
        btn.className = 'preset-chip';
        btn.style.borderColor = 'var(--accent)';
        btn.textContent = name;
        btn.addEventListener('click', () => applyPresetObject(list[name], name));
        container.appendChild(btn);
      });
    } catch (e) {
      container.style.display = 'none';
    }
  }

  function bindUIEvents() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Species Selector
    document.querySelectorAll('#species-selector .species-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.species = btn.dataset.species;
        // Archetype defaults applied on species change
        if (state.species === 'birch') {
          state.colorBark = '#dcd6cd';
          state.radius = 0.32;
        } else if (state.species === 'pine') {
          state.colorBark = '#422c1d';
          state.colorLeaf1 = '#1f4d36';
          state.colorLeaf2 = '#2d6648';
        } else if (state.species === 'fantasy') {
          state.colorLeaf1 = '#00d4ff';
          state.colorLeaf2 = '#9d4edd';
          state.colorBark = '#232946';
          state.colorAccent = '#e0fbfc';
        } else if (state.species === 'bush') {
          state.height = 2.5;
          state.spread = 2.8;
        } else if (state.height < 3.5) {
          state.height = 6.5;
          state.colorBark = '#5c4028';
        }
        syncUIFromState();
        rebuildScene();
      });
    });

    // Season Selector
    document.querySelectorAll('.season-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.season;
        state.season = s;
        const pal = SEASON_PALETTES[s];
        if (pal && state.species !== 'fantasy') {
          state.colorLeaf1 = pal.leaf1;
          state.colorLeaf2 = pal.leaf2;
          state.colorAccent = pal.accent;
          state.snow = pal.snow;
        }
        syncUIFromState();
        rebuildScene();
      });
    });

    // Range Sliders & Number Inputs
    const sliderBindings = [
      ['param-seed', 'seed', true],
      ['param-variation', 'variation', false],
      ['param-height', 'height', false],
      ['param-radius', 'radius', false],
      ['param-taper', 'taper', false],
      ['param-curve', 'curve', false],
      ['param-branches', 'branches', true],
      ['param-gnarl', 'gnarl', false],
      ['param-radial', 'radialSegments', true],
      ['param-spread', 'spread', false],
      ['param-canopy-height', 'canopyHeight', false],
      ['param-density', 'density', true],
      ['param-cluster-size', 'clusterSize', false],
      ['param-poly-detail', 'polyDetail', true],
      ['param-jitter', 'jitter', false],
      ['param-color-var', 'colorVar', false],
      ['param-snow', 'snow', false],
      ['param-forest-count', 'forestCount', true]
    ];

    sliderBindings.forEach(([id, key, isInt]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        state[key] = isInt ? parseInt(el.value, 10) : parseFloat(el.value);
        syncUIFromState();
        rebuildScene();
      });
    });

    // Color Pickers
    const colorBindings = [
      ['color-leaf-1', 'colorLeaf1'],
      ['color-leaf-2', 'colorLeaf2'],
      ['color-bark', 'colorBark'],
      ['color-accent', 'colorAccent']
    ];
    colorBindings.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        state[key] = el.value;
        rebuildScene();
      });
    });

    // Randomize Seed buttons
    const randomizeSeed = () => {
      state.seed = Math.floor(100 + Math.random() * 998999);
      syncUIFromState();
      rebuildScene();
    };
    document.getElementById('btn-seed-dice').addEventListener('click', randomizeSeed);
    document.getElementById('btn-random-tree').addEventListener('click', randomizeSeed);
    document.getElementById('btn-reshuffle-forest').addEventListener('click', randomizeSeed);

    // View Mode Pills (Single / Compare / Forest)
    document.querySelectorAll('.mode-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.mode-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.viewMode = pill.dataset.view;

        document.getElementById('single-context-controls').style.display =
          state.viewMode === 'single' ? 'flex' : 'none';
        document.getElementById('forest-context-controls').style.display =
          state.viewMode === 'forest' ? 'flex' : 'none';

        // Adjust camera distance smoothly for each mode
        if (state.viewMode === 'single') {
          camera.position.set(8, 6.5, 11);
          controls.target.set(0, state.height * 0.45, 0);
        } else if (state.viewMode === 'compare') {
          camera.position.set(0, 8.5, 22);
          controls.target.set(0, state.height * 0.45, 0);
        } else if (state.viewMode === 'forest') {
          camera.position.set(0, 22, 34);
          controls.target.set(0, 2, 0);
        }
        controls.update();
        rebuildScene();
      });
    });

    // Single LOD & LOD2 Style selectors
    document.getElementById('select-single-lod').addEventListener('change', (e) => {
      state.singleLod = parseInt(e.target.value, 10);
      rebuildScene();
    });

    document.getElementById('select-lod2-style').addEventListener('change', (e) => {
      state.lod2Style = e.target.value;
      rebuildScene();
    });

    document.getElementById('select-forest-quality').addEventListener('change', (e) => {
      state.forestQuality = e.target.value;
      rebuildScene();
    });

    document.getElementById('select-atlas-res').addEventListener('change', (e) => {
      state.atlasRes = parseInt(e.target.value, 10);
      document.getElementById('atlas-res-badge').textContent = `${state.atlasRes}×${state.atlasRes}`;
      rebuildScene();
    });

    // Viewport Quick Toggles (Isometric B Camera, Wireframe, Turntable)
    document.getElementById('btn-iso-cam').addEventListener('click', (e) => {
      state.isometricCam = !state.isometricCam;
      e.currentTarget.classList.toggle('btn-primary', state.isometricCam);
      e.currentTarget.classList.toggle('btn-outline', !state.isometricCam);
      if (state.isometricCam) {
        const dist = state.viewMode === 'forest' ? 32 : (state.viewMode === 'compare' ? 22 : 13);
        camera.position.set(dist * 0.85, dist * 0.95, dist * 0.85);
        controls.target.set(0, state.height * 0.35, 0);
        document.getElementById('hud-cam-mode').textContent = 'B Elevated Isometric (45°)';
      } else {
        document.getElementById('hud-cam-mode').textContent = 'Perspective Orbit';
      }
      controls.update();
    });

    document.getElementById('btn-wireframe').addEventListener('click', (e) => {
      state.wireframe = !state.wireframe;
      e.currentTarget.classList.toggle('btn-primary', state.wireframe);
      e.currentTarget.classList.toggle('btn-outline', !state.wireframe);
      rebuildScene();
    });

    document.getElementById('btn-autorotate').addEventListener('click', (e) => {
      state.autoRotate = !state.autoRotate;
      e.currentTarget.classList.toggle('btn-primary', state.autoRotate);
      e.currentTarget.classList.toggle('btn-outline', !state.autoRotate);
      if (!state.autoRotate && contentGroup) contentGroup.rotation.y = 0;
    });

    // Built-in Presets
    document.querySelectorAll('#builtin-presets .preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.preset;
        if (BUILTIN_PRESETS[key]) {
          applyPresetObject(BUILTIN_PRESETS[key], chip.textContent);
        }
      });
    });

    // Save Custom Preset
    document.getElementById('btn-save-preset').addEventListener('click', () => {
      const input = document.getElementById('input-preset-name');
      const name = (input.value || '').trim();
      if (!name) {
        showToast('Enter a name for your preset first.', 'fa-info-circle');
        return;
      }
      try {
        const raw = localStorage.getItem('b_remastered_tree_presets');
        const list = raw ? JSON.parse(raw) : {};
        const snapshot = { ...state };
        delete snapshot.viewMode;
        list[name] = snapshot;
        localStorage.setItem('b_remastered_tree_presets', JSON.stringify(list));
        input.value = '';
        loadCustomPresetsFromStorage();
        showToast(`Saved preset "${name}"!`, 'fa-bookmark');
      } catch (err) {
        showToast('Could not save preset to storage.', 'fa-exclamation-circle');
      }
    });

    // Export / Import JSON Preset
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      triggerDownloadBlob(blob, `b_tree_preset_${state.species}_${state.seed}.json`);
      showToast('Exported Preset JSON!', 'fa-file-code');
    });

    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('file-import-json').click();
    });

    document.getElementById('file-import-json').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          applyPresetObject(parsed, file.name);
        } catch (err) {
          showToast('Invalid JSON preset file.', 'fa-exclamation-triangle');
        }
      };
      reader.readAsText(file);
    });

    // Export GLB & PNG Buttons
    const exportActiveGLB = () => {
      exportObjectAsGLB(contentGroup, `b_tree_${state.species}_${state.season}_seed${state.seed}.glb`);
    };
    document.getElementById('btn-export-glb-top').addEventListener('click', exportActiveGLB);
    document.getElementById('btn-export-current-glb').addEventListener('click', exportActiveGLB);
    document.getElementById('btn-export-all-lods').addEventListener('click', exportAllLODsBundle);
    document.getElementById('btn-download-atlas').addEventListener('click', downloadAtlasPNG);


  }

  /* ------------------------------------------------------------------------
     Application Initialization & SPA Router Lifecycle
     ------------------------------------------------------------------------ */
  function disposeThreeHierarchy(obj) {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      }
    });
  }

  function startApp() {
    if (typeof window.__disposeTreeGenerator === 'function') {
      window.__disposeTreeGenerator();
    }

    initOffscreenBaker();
    initViewport();
    bindUIEvents();
    loadCustomPresetsFromStorage();
    syncUIFromState();
    rebuildScene();
    animateViewport();

    const container = document.getElementById('canvas-container');
    if ('ResizeObserver' in window && container) {
      resizeObserver = new ResizeObserver(() => onViewportResize());
      resizeObserver.observe(container);
    }

    window.__disposeTreeGenerator = function () {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      window.removeEventListener('resize', onViewportResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (controls) {
        controls.dispose();
        controls = null;
      }
      if (contentGroup) {
        disposeThreeHierarchy(contentGroup);
        contentGroup.clear();
      }
      if (groundGroup) {
        disposeThreeHierarchy(groundGroup);
        groundGroup = null;
      }
      if (scene) {
        disposeThreeHierarchy(scene);
        scene.clear();
        scene = null;
      }
      if (bakerScene) {
        disposeThreeHierarchy(bakerScene);
        bakerScene.clear();
        bakerScene = null;
      }
      if (renderer) {
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (_) { }
        renderer = null;
      }
      if (bakerRenderer) {
        bakerRenderer.dispose();
        try { bakerRenderer.forceContextLoss(); } catch (_) { }
        bakerRenderer = null;
      }
    };
  }

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing && existing.hasAttribute('data-loaded')) {
        resolve();
        return;
      }
      const script = existing || document.createElement('script');
      if (!existing) {
        script.src = src;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
      script.addEventListener('load', () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
    });
  }

  async function ensureDependencies() {
    if (!window.THREE) {
      await loadScript(THREE_URL);
    }
    if (!window.THREE.OrbitControls) {
      await loadScript(ORBIT_URL);
    }
    if (!window.THREE.GLTFExporter) {
      await loadScript(GLTF_URL);
    }
    return window.THREE;
  }

  ensureDependencies().then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApp, { once: true });
    } else {
      startApp();
    }
  }).catch((err) => {
    console.error('Tree Generator dependency loading error:', err);
  });

})();
