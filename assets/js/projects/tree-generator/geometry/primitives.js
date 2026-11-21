import { treeClamp } from '../utils.js';

export const TREE_FOLIAGE_BASE_UV_TILES_PER_METER = 1.15;

export function getTreeFoliageColorOptions(cfg, extra = {}) {
  const isNaturalGreen = !['autumn', 'blossom', 'arcane', 'corrupted', 'winter'].includes(cfg.season)
    && !['sakura', 'fantasy', 'dead'].includes(cfg.species);
  return {
    foliageTextureMode: cfg.foliageTextureMode,
    foliageGrassTexture: cfg.foliageGrassTexture,
    foliageTextureScale: cfg.foliageTextureScale,
    foliageTintStrength: cfg.foliageTintStrength,
    foliageTextureVariation: cfg.foliageTextureVariation,
    isNaturalGreen,
    isFoliageSurface: true,
    ...extra
  };
}

export function treeProjectFoliageBoxUVs(geo, textureScale = 1.0, phaseU = 0, phaseV = 0) {
  if (!geo || !geo.attributes || !geo.attributes.position) return geo;
  const pos = geo.attributes.position;
  if (pos.count === 0) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const norm = geo.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);
  const scale = TREE_FOLIAGE_BASE_UV_TILES_PER_METER * treeClamp(Number(textureScale) || 1.0, 0.25, 4.0);

  if (!geo.index) {
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const nx = Math.abs(norm.getX(i) + norm.getX(i + 1) + norm.getX(i + 2));
      const ny = Math.abs(norm.getY(i) + norm.getY(i + 1) + norm.getY(i + 2));
      const nz = Math.abs(norm.getZ(i) + norm.getZ(i + 1) + norm.getZ(i + 2));

      for (let v = 0; v < 3; v++) {
        const idx = i + v;
        const x = pos.getX(idx);
        const y = pos.getY(idx);
        const z = pos.getZ(idx);
        let u;
        let vCoord;
        if (ny >= nx && ny >= nz) {
          u = x * scale + phaseU;
          vCoord = z * scale + phaseV;
        } else if (nx >= nz) {
          u = z * scale + phaseU;
          vCoord = y * scale + phaseV;
        } else {
          u = x * scale + phaseU;
          vCoord = y * scale + phaseV;
        }
        uvs[idx * 2] = u;
        uvs[idx * 2 + 1] = vCoord;
      }
    }
  } else {
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const nz = Math.abs(norm.getZ(i));
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (ny >= nx && ny >= nz) {
        uvs[i * 2] = x * scale + phaseU;
        uvs[i * 2 + 1] = z * scale + phaseV;
      } else if (nx >= nz) {
        uvs[i * 2] = z * scale + phaseU;
        uvs[i * 2 + 1] = y * scale + phaseV;
      } else {
        uvs[i * 2] = x * scale + phaseU;
        uvs[i * 2 + 1] = y * scale + phaseV;
      }
    }
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

export function treeMergeBufferGeometries(geometries) {
  if (!geometries || geometries.length === 0) return new THREE.BufferGeometry();
  let totalVerts = 0;
  const validGeos = [];

  for (let i = 0; i < geometries.length; i++) {
    if (!geometries[i] || !geometries[i].attributes || !geometries[i].attributes.position) continue;
    const g = geometries[i].index ? geometries[i].toNonIndexed() : geometries[i];
    if (g.attributes.position.count === 0) continue;
    validGeos.push(g);
    totalVerts += g.attributes.position.count;
  }

  if (totalVerts === 0) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    empty.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(0), 2));
    return empty;
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

export function treeJitterGeometryVertices(geo, jitterAmount, rng, lockBottomY = false) {
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

export function treeColorizeGeometry(geo, baseHex, secondaryHex, accentHex, rng, options = {}) {
  const rand = typeof rng === 'function' ? rng : () => 0.5;
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);

  const phaseU = Math.floor(rand() * 16) / 16;
  const phaseV = Math.floor(rand() * 16) / 16;
  treeProjectFoliageBoxUVs(g, options.foliageTextureScale || 1.0, phaseU, phaseV);

  const c1 = new THREE.Color(baseHex);
  const c2 = new THREE.Color(secondaryHex || baseHex);
  const cAccent = new THREE.Color(accentHex || '#ffffff');
  const cMoss = new THREE.Color('#3b732d');
  const cRef = new THREE.Color();
  const tempColor = new THREE.Color();

  const variance = options.variance !== undefined ? options.variance : 0.12;
  const snowCoverage = options.snowCoverage || 0.0;
  const isBirchBark = Boolean(options.isBirchBark);
  const isBamboo = Boolean(options.isBamboo);
  const isGradientCanopy = Boolean(options.isGradientCanopy);
  const mossCoverage = options.mossCoverage || 0.0;

  const useGrassTexture = (options.foliageTextureMode === 'grass' || options.foliageGrassTexture === true)
    && !options.simulateTextureError;
  const isFoliageSurface = Boolean(options.isFoliageSurface);
  const tintStrength = treeClamp(Number(options.foliageTintStrength !== undefined ? options.foliageTintStrength : 0.90), 0, 1);
  const texVar = treeClamp(Number(options.foliageTextureVariation !== undefined ? options.foliageTextureVariation : 0.55), 0, 1);
  const depth = 0.06 + texVar * 0.44;
  const meanLum = 1.0 - 0.6355 * depth;
  const texBoost = useGrassTexture ? (1.0 / Math.max(0.4, meanLum)) : 1.0;

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const spanY = Math.max(0.001, maxY - minY);

  for (let i = 0; i < pos.count; i += 3) {
    const ny = (norm.getY(i) + norm.getY(i + 1) + norm.getY(i + 2)) / 3;
    const avgY = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const normY = (avgY - minY) / spanY;

    let mixFactor = rand();
    if (isGradientCanopy) {
      mixFactor = Math.min(1, Math.max(0, normY * 0.85 + (rand() - 0.5) * 0.32));
    }

    tempColor.copy(c1).lerp(c2, mixFactor);

    if (isBirchBark) {
      const band = Math.sin(avgY * 11.0 + rand() * 1.4);
      if (band > 0.68) {
        tempColor.setHex(0x2b2623);
      }
    }

    if (isBamboo) {
      const nodeRing = Math.abs(Math.sin(avgY * 4.2));
      if (nodeRing < 0.16) {
        tempColor.offsetHSL(0, 0.05, -0.14);
      }
    }

    if (mossCoverage > 0.02 && normY < mossCoverage * 0.65 && (ny > -0.1 || rand() < mossCoverage)) {
      tempColor.lerp(cMoss, Math.min(0.82, mossCoverage * (1.0 - normY)));
    }

    let isSnowFacet = false;
    if (snowCoverage > 0.01 && ny > (1.0 - snowCoverage * 1.45)) {
      tempColor.copy(cAccent);
      isSnowFacet = true;
    }

    const facetShift = (rand() - 0.5) * variance * 0.65 + ny * 0.06;
    tempColor.offsetHSL(0, 0, facetShift);

    const texJitter = rand() - 0.5;
    if (useGrassTexture) {
      if (isFoliageSurface && !isSnowFacet) {
        if (tintStrength < 0.999) {
          cRef.set(options.isNaturalGreen === false ? '#cccccc' : '#588c3a');
          tempColor.lerp(cRef, (1.0 - tintStrength) * 0.75);
        }
        const texFacetShift = texJitter * (texVar - 0.5) * 0.14;
        if (Math.abs(texFacetShift) > 1e-4) {
          tempColor.offsetHSL(0, 0, texFacetShift);
        }
      }
      tempColor.multiplyScalar(texBoost);
    }

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

export function buildTreeTaperedLimb(params, rng) {
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
    isPalm,
    isBamboo,
    isCactus,
    rootFlare = 0.28,
    mossCoverage = 0.0,
    isRedwood = false
  } = params;

  const cyl = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
    heightSegments,
    false
  );
  cyl.translate(0, height / 2, 0);

  const pos = cyl.attributes.position;
  const dirX = Math.cos(curveAngle);
  const dirZ = Math.sin(curveAngle);

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / Math.max(0.01, height)));
    let x = pos.getX(i);
    let z = pos.getZ(i);

    // Root flare at very base
    if (t < 0.16 && startPoint.y < 0.45 && rootFlare > 0.01) {
      const flare = 1.0 + (1.0 - t / 0.16) * rootFlare * 0.65;
      x *= flare;
      z *= flare;
    }

    // Redwood fluted trunk ribs
    if (isRedwood) {
      const ang = Math.atan2(z, x);
      const flute = 1.0 + Math.sin(ang * radialSegments) * 0.08 * (1 - t * 0.6);
      x *= flute;
      z *= flute;
    }

    // Palm segmented ring ridges
    if (isPalm) {
      const ringScale = 1.0 + Math.sin(t * Math.PI * heightSegments * 1.5) * 0.11;
      x *= ringScale;
      z *= ringScale;
    }

    // Bamboo culm nodes
    if (isBamboo) {
      const nodePulse = Math.pow(Math.max(0, Math.cos(t * Math.PI * heightSegments * 1.3)), 8);
      const nodeScale = 1.0 + nodePulse * 0.22;
      x *= nodeScale;
      z *= nodeScale;
    }

    // Cactus vertical ridges + slight top dome taper
    if (isCactus) {
      const ang = Math.atan2(z, x);
      const rib = 1.0 + Math.cos(ang * radialSegments) * 0.14;
      x *= rib;
      z *= rib;
      if (t > 0.88) {
        const capScale = 1.0 - ((t - 0.88) / 0.12) * 0.35;
        x *= capScale;
        z *= capScale;
      }
    }

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

  const colored = colorizeLimb(cyl, barkColor, barkColor2, rng, {
    isBirch,
    isBamboo,
    mossCoverage
  });

  return { geometry: colored, topTip };
}

function colorizeLimb(geo, barkColor, barkColor2, rng, opts) {
  return treeColorizeGeometry(geo, barkColor, barkColor2, '#ffffff', rng, {
    variance: 0.1,
    isBirchBark: opts.isBirch,
    isBamboo: opts.isBamboo,
    mossCoverage: opts.mossCoverage
  });
}

export function buildTreeClusterGeometry(leafStyle, radius, polyDetail) {
  if (leafStyle === 'octahedron') {
    return new THREE.OctahedronGeometry(radius, Math.min(1, polyDetail));
  }
  if (leafStyle === 'dodecahedron') {
    return new THREE.DodecahedronGeometry(radius * 0.95, Math.min(1, polyDetail));
  }
  if (leafStyle === 'faceted_pad') {
    const cyl = new THREE.CylinderGeometry(radius * 0.85, radius * 1.05, radius * 0.55, polyDetail > 0 ? 7 : 5, 1);
    return cyl;
  }
  if (leafStyle === 'cone_tuft') {
    return new THREE.ConeGeometry(radius * 0.95, radius * 1.45, polyDetail > 0 ? 7 : 5, 1);
  }
  return new THREE.IcosahedronGeometry(radius, polyDetail);
}

export function buildTreeRootButtresses(cfg, layout, rng, barkDark) {
  const geos = [];
  const style = cfg.rootStyle || 'none';
  if (style === 'none' || cfg.groundAttachment === 'bonsai_pot') return geos;

  const count = layout.rootCount;
  const rBase = layout.baseRadius;
  const flare = Math.max(0.15, cfg.rootFlare);
  const baseY = layout.planterLift;

  if (style === 'stilt') {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const attachH = layout.trunkStartY + layout.trunkHeight * (0.08 + rng() * 0.14);
      const outR = rBase * (2.2 + flare * 2.4);
      const rootLen = Math.hypot(outR, attachH - baseY);
      const rootLimb = new THREE.CylinderGeometry(rBase * 0.18, rBase * 0.28, rootLen, 4, 3);
      rootLimb.translate(0, rootLen * 0.5, 0);
      const tilt = Math.atan2(outR, Math.max(0.2, attachH - baseY));
      rootLimb.rotateZ(tilt);
      rootLimb.rotateY(ang);
      rootLimb.translate(Math.cos(ang) * outR, baseY, Math.sin(ang) * outR);
      geos.push(treeColorizeGeometry(rootLimb, cfg.colorBark, barkDark, '#ffffff', rng, {
        variance: 0.1,
        mossCoverage: Math.min(1, cfg.mossCoverage + 0.25)
      }));
    }
    return geos;
  }

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const len = rBase * (1.1 + flare * 1.45) * (0.85 + rng() * 0.35);
    const rH = Math.max(0.25, layout.trunkHeight * (0.12 + flare * 0.14));

    if (style === 'buttress') {
      const fin = new THREE.ConeGeometry(rBase * 0.48, rH, 4, 1);
      fin.scale(0.65, 1.0, len / Math.max(0.2, rBase));
      fin.translate(0, rH * 0.45, len * 0.42);
      fin.rotateY(ang);
      fin.translate(0, baseY, 0);
      geos.push(treeColorizeGeometry(fin, cfg.colorBark, barkDark, '#ffffff', rng, {
        variance: 0.1,
        mossCoverage: cfg.mossCoverage
      }));
    } else if (style === 'twisted') {
      const segs = 3;
      for (let s = 0; s < segs; s++) {
        const frac = s / segs;
        const segLen = len * 0.45;
        const limb = new THREE.CylinderGeometry(rBase * (0.28 - frac * 0.08), rBase * (0.36 - frac * 0.08), segLen, 4, 1);
        limb.rotateX(Math.PI * 0.42 + frac * 0.12);
        const swirl = ang + Math.sin(frac * Math.PI) * 0.4;
        limb.rotateY(swirl);
        const dist = rBase * 0.55 + frac * len * 0.55;
        limb.translate(Math.sin(swirl) * dist, baseY + (1 - frac) * rBase * 0.32, Math.cos(swirl) * dist);
        geos.push(treeColorizeGeometry(limb, cfg.colorBark, barkDark, '#ffffff', rng, {
          variance: 0.1,
          mossCoverage: cfg.mossCoverage
        }));
      }
    } else if (style === 'flared') {
      const knob = new THREE.DodecahedronGeometry(rBase * (0.45 + flare * 0.3), 0);
      knob.scale(1.2, 0.75, 1.4);
      knob.rotateY(ang);
      knob.translate(Math.cos(ang) * rBase * 0.85, baseY + rBase * 0.18, Math.sin(ang) * rBase * 0.85);
      geos.push(treeColorizeGeometry(knob, cfg.colorBark, barkDark, '#ffffff', rng, {
        variance: 0.1,
        mossCoverage: cfg.mossCoverage
      }));
    }
  }

  return geos;
}

export function buildTreePlanterOrPot(cfg, layout, rng) {
  const geos = [];
  const mode = cfg.groundAttachment;
  if (!mode || mode === 'natural') return geos;

  const pRadius = layout.planterRadius;
  const baseCol = cfg.planterColor || '#6d757d';
  const darkCol = new THREE.Color(baseCol).offsetHSL(0, 0, -0.12).getStyle();
  const soilCol = '#3b2b1e';

  if (mode === 'city_grate') {
    const frame = new THREE.BoxGeometry(pRadius * 2.1, 0.06, pRadius * 2.1);
    frame.translate(0, 0.03, 0);
    geos.push(treeColorizeGeometry(frame, '#3a4046', '#2a2f33', '#ffffff', rng, { variance: 0.06 }));

    for (let g = -2; g <= 2; g++) {
      if (g === 0) continue;
      const bar = new THREE.BoxGeometry(pRadius * 1.95, 0.075, 0.06);
      bar.translate(0, 0.04, g * (pRadius * 0.36));
      geos.push(treeColorizeGeometry(bar, '#495057', '#343a40', '#ffffff', rng, { variance: 0.05 }));
    }
  } else if (mode === 'stone_planter' || mode === 'wood_planter') {
    const isWood = mode === 'wood_planter';
    const wallCol = isWood ? '#704a2b' : baseCol;
    const wallDark = isWood ? '#52341d' : darkCol;
    const w = pRadius * 2.0;
    const h = 0.44;
    const box = new THREE.BoxGeometry(w, h, w);
    box.translate(0, h / 2, 0);
    geos.push(treeColorizeGeometry(box, wallCol, wallDark, '#ffffff', rng, { variance: 0.08 }));

    const rim = new THREE.BoxGeometry(w + 0.14, 0.09, w + 0.14);
    rim.translate(0, h + 0.02, 0);
    geos.push(treeColorizeGeometry(rim, wallDark, wallCol, '#ffffff', rng, { variance: 0.06 }));

    const soil = new THREE.BoxGeometry(w - 0.16, 0.06, w - 0.16);
    soil.translate(0, h + 0.03, 0);
    geos.push(treeColorizeGeometry(soil, soilCol, '#2b1e14', '#ffffff', rng, { variance: 0.1 }));
  } else if (mode === 'bonsai_pot') {
    const potW = pRadius * 2.1;
    const potD = pRadius * 1.55;
    const potH = 0.36;
    const body = new THREE.CylinderGeometry(potW * 0.56, potW * 0.45, potH, 8, 1);
    body.scale(1.0, 1.0, potD / potW);
    body.translate(0, potH / 2 + 0.05, 0);
    geos.push(treeColorizeGeometry(body, baseCol, darkCol, '#ffffff', rng, { variance: 0.06 }));

    for (let fx = -1; fx <= 1; fx += 2) {
      for (let fz = -1; fz <= 1; fz += 2) {
        const foot = new THREE.BoxGeometry(0.14, 0.07, 0.14);
        foot.translate(fx * potW * 0.3, 0.035, fz * potD * 0.25);
        geos.push(treeColorizeGeometry(foot, darkCol, baseCol, '#ffffff', rng, { variance: 0.04 }));
      }
    }

    const soil = new THREE.CylinderGeometry(potW * 0.48, potW * 0.48, 0.05, 8, 1);
    soil.scale(1.0, 1.0, potD / potW);
    soil.translate(0, potH + 0.04, 0);
    geos.push(treeColorizeGeometry(soil, soilCol, '#4a6b35', '#ffffff', rng, { variance: 0.12 }));
  }

  return geos;
}

export function buildTreeTrunkDetails(cfg, layout, rng, isLod1) {
  const trunkDetailGeos = [];
  const propGeos = [];

  // Hollow knot on main trunk
  if (cfg.hollowEnabled && layout.baseRadius >= 0.24) {
    const hollowY = layout.trunkStartY + layout.trunkHeight * 0.42;
    const ang = layout.curveAngle + Math.PI * 0.5;
    const r = layout.baseRadius * 0.85;
    const rim = new THREE.TorusGeometry(r * 0.34, r * 0.1, 4, 6);
    rim.rotateY(ang + Math.PI / 2);
    rim.translate(Math.cos(ang) * r * 0.85, hollowY, Math.sin(ang) * r * 0.85);
    trunkDetailGeos.push(treeColorizeGeometry(rim, cfg.colorBark, '#2b1e16', '#ffffff', rng, { variance: 0.08 }));

    const darkCore = new THREE.CylinderGeometry(r * 0.24, r * 0.24, r * 0.25, 6);
    darkCore.rotateZ(Math.PI / 2);
    darkCore.rotateY(-ang);
    darkCore.translate(Math.cos(ang) * r * 0.82, hollowY, Math.sin(ang) * r * 0.82);
    trunkDetailGeos.push(treeColorizeGeometry(darkCore, '#140e0b', '#0d0907', '#ffffff', rng, { variance: 0.02 }));
  }

  // Shelf mushrooms on trunk
  if (!isLod1 && (cfg.shelfMushrooms || 0) > 0.05) {
    const shroomCount = Math.max(2, Math.round(cfg.shelfMushrooms * 7));
    for (let i = 0; i < shroomCount; i++) {
      const frac = 0.18 + rng() * 0.55;
      const y = layout.trunkStartY + layout.trunkHeight * frac;
      const ang = rng() * Math.PI * 2;
      const rAtY = layout.baseRadius * (1 - frac * cfg.taper * 0.7);
      const capR = Math.max(0.09, rAtY * (0.45 + rng() * 0.35));

      const cap = new THREE.CylinderGeometry(capR, capR * 0.7, capR * 0.26, 5, 1, false, 0, Math.PI);
      cap.rotateY(ang);
      cap.translate(Math.cos(ang) * rAtY * 0.9, y, Math.sin(ang) * rAtY * 0.9);
      propGeos.push(treeColorizeGeometry(cap, '#e6ccb2', '#b08968', '#ffffff', rng, { variance: 0.08 }));
    }
  }

  return { trunkDetailGeos, propGeos };
}

export function buildTreeStoryProps(cfg, layout, branchTips, rng, isLod1) {
  const foliageProps = [];
  const trunkProps = [];
  const emissiveProps = [];

  // Hanging Vines
  if ((cfg.vineDensity || 0) > 0.05 && branchTips.length > 0) {
    const vineCount = isLod1
      ? Math.max(2, Math.round(cfg.vineDensity * 4))
      : Math.max(3, Math.round(cfg.vineDensity * 10));
    for (let i = 0; i < vineCount; i++) {
      const tip = branchTips[i % branchTips.length];
      const vLen = Math.max(0.7, layout.trunkHeight * (0.28 + rng() * 0.35));
      const ox = tip.x + (rng() - 0.5) * cfg.spread * 0.45;
      const oz = tip.z + (rng() - 0.5) * cfg.spread * 0.45;
      const oy = tip.y - vLen * 0.5;
      const vine = new THREE.CylinderGeometry(0.035, 0.015, vLen, 3, isLod1 ? 1 : 3);
      vine.translate(ox, oy, oz);
      foliageProps.push(treeColorizeGeometry(
        vine,
        cfg.colorLeaf1,
        cfg.colorLeaf2,
        '#ffffff',
        rng,
        getTreeFoliageColorOptions(cfg, { variance: 0.14 })
      ));
    }
  }

  // Fruits / Cones / Coconuts / Bananas / Cactus Blooms
  if (!isLod1 && cfg.fruitType && cfg.fruitType !== 'none' && (cfg.fruitDensity || 0) > 0.05 && branchTips.length > 0) {
    const fDensity = cfg.fruitDensity;
    const count = Math.max(2, Math.round(fDensity * 12));
    const fruitCol = cfg.fruitColor || '#e63946';

    if (cfg.fruitType === 'coconuts') {
      const cCount = Math.max(2, Math.round(fDensity * 5));
      for (let c = 0; c < cCount; c++) {
        const ang = (c / cCount) * Math.PI * 2;
        const nut = new THREE.DodecahedronGeometry(layout.baseRadius * 0.48, 0);
        nut.translate(
          layout.trunkTop.x + Math.cos(ang) * layout.baseRadius * 0.65,
          layout.trunkTop.y - layout.baseRadius * 0.48,
          layout.trunkTop.z + Math.sin(ang) * layout.baseRadius * 0.65
        );
        trunkProps.push(treeColorizeGeometry(nut, '#3d2614', '#54351d', '#ffffff', rng, { variance: 0.08 }));
      }
    } else if (cfg.fruitType === 'bananas') {
      const bCount = Math.max(2, Math.round(fDensity * 4));
      for (let b = 0; b < bCount; b++) {
        const ang = (b / bCount) * Math.PI * 2;
        const hand = new THREE.ConeGeometry(0.14, 0.48, 5, 1);
        hand.rotateX(Math.PI);
        hand.translate(
          layout.trunkTop.x + Math.cos(ang) * layout.baseRadius * 0.75,
          layout.trunkTop.y - 0.35,
          layout.trunkTop.z + Math.sin(ang) * layout.baseRadius * 0.75
        );
        foliageProps.push(treeColorizeGeometry(
          hand,
          '#f4d35e',
          '#ee964b',
          '#ffffff',
          rng,
          getTreeFoliageColorOptions(cfg, { variance: 0.06, isFoliageSurface: false })
        ));
      }
    } else if (cfg.fruitType === 'pinecones') {
      for (let i = 0; i < count; i++) {
        const tip = branchTips[i % branchTips.length];
        const cone = new THREE.ConeGeometry(0.11, 0.24, 5, 1);
        cone.rotateX(Math.PI);
        cone.translate(
          tip.x + (rng() - 0.5) * cfg.spread * 0.5,
          tip.y - 0.15 + (rng() - 0.5) * 0.5,
          tip.z + (rng() - 0.5) * cfg.spread * 0.5
        );
        trunkProps.push(treeColorizeGeometry(cone, '#6b4423', '#4a2e16', '#ffffff', rng, { variance: 0.08 }));
      }
    } else if (cfg.fruitType === 'cactus_bloom') {
      for (let i = 0; i < Math.min(6, branchTips.length); i++) {
        const tip = branchTips[i];
        const bloom = new THREE.OctahedronGeometry(0.16, 0);
        bloom.scale(1.1, 0.7, 1.1);
        bloom.translate(tip.x, tip.y + 0.1, tip.z);
        foliageProps.push(treeColorizeGeometry(
          bloom,
          fruitCol,
          '#ffccd5',
          '#ffffff',
          rng,
          getTreeFoliageColorOptions(cfg, { variance: 0.06, isFoliageSurface: false })
        ));
      }
    } else {
      // Apples / Fruit
      for (let i = 0; i < count; i++) {
        const tip = branchTips[i % branchTips.length];
        const apple = new THREE.OctahedronGeometry(0.14, 0);
        apple.translate(
          tip.x + (rng() - 0.5) * cfg.clusterSize * 0.9,
          tip.y - 0.1 + (rng() - 0.5) * 0.55,
          tip.z + (rng() - 0.5) * cfg.clusterSize * 0.9
        );
        foliageProps.push(treeColorizeGeometry(
          apple,
          fruitCol,
          '#ff758f',
          '#ffffff',
          rng,
          getTreeFoliageColorOptions(cfg, { variance: 0.06, isFoliageSurface: false })
        ));
      }
    }
  }

  // Storytelling Detail Props
  if (!isLod1 && cfg.detailProp && cfg.detailProp !== 'none') {
    if (cfg.detailProp === 'lanterns' && branchTips.length > 0) {
      const lCount = Math.min(3, branchTips.length);
      for (let i = 0; i < lCount; i++) {
        const tip = branchTips[i];
        const cord = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4);
        cord.translate(tip.x, tip.y - 0.275, tip.z);
        trunkProps.push(treeColorizeGeometry(cord, '#2b2d42', '#1a1b26', '#ffffff', rng, { variance: 0.04 }));

        const cap = new THREE.ConeGeometry(0.18, 0.12, 4);
        cap.translate(tip.x, tip.y - 0.55, tip.z);
        trunkProps.push(treeColorizeGeometry(cap, '#2b2d42', '#1a1b26', '#ffffff', rng, { variance: 0.04 }));

        const glow = new THREE.BoxGeometry(0.16, 0.22, 0.16);
        glow.translate(tip.x, tip.y - 0.70, tip.z);
        emissiveProps.push(treeColorizeGeometry(glow, '#ffd166', '#ff9f1c', '#ffffff', rng, { variance: 0.05 }));
      }
    } else if (cfg.detailProp === 'birdhouse') {
      const bhY = layout.trunkStartY + layout.trunkHeight * 0.58;
      const ang = layout.curveAngle + Math.PI * 0.65;
      const bx = Math.cos(ang) * (layout.baseRadius * 0.9 + 0.18);
      const bz = Math.sin(ang) * (layout.baseRadius * 0.9 + 0.18);

      const house = new THREE.BoxGeometry(0.28, 0.32, 0.26);
      house.rotateY(-ang);
      house.translate(bx, bhY, bz);
      trunkProps.push(treeColorizeGeometry(house, '#b08968', '#9c6644', '#ffffff', rng, { variance: 0.08 }));

      const roof = new THREE.ConeGeometry(0.25, 0.18, 4);
      roof.rotateY(Math.PI / 4 - ang);
      roof.translate(bx, bhY + 0.24, bz);
      trunkProps.push(treeColorizeGeometry(roof, '#bc4749', '#9e2a2b', '#ffffff', rng, { variance: 0.06 }));
    } else if (cfg.detailProp === 'swing' && branchTips.length > 1) {
      const tip = branchTips[1] || branchTips[0];
      const swingY = Math.max(0.65, layout.planterLift + 0.72);
      const ropeLen = Math.max(0.8, tip.y - swingY);
      for (const side of [-0.28, 0.28]) {
        const rope = new THREE.CylinderGeometry(0.018, 0.018, ropeLen, 4);
        rope.translate(tip.x + side, swingY + ropeLen * 0.5, tip.z);
        trunkProps.push(treeColorizeGeometry(rope, '#c2a878', '#a68a5b', '#ffffff', rng, { variance: 0.05 }));
      }
      const seat = new THREE.BoxGeometry(0.72, 0.06, 0.26);
      seat.translate(tip.x, swingY, tip.z);
      trunkProps.push(treeColorizeGeometry(seat, '#7f4f24', '#582f0e', '#ffffff', rng, { variance: 0.06 }));
    } else if (cfg.detailProp === 'fallen_leaves') {
      const leafCount = 14;
      for (let i = 0; i < leafCount; i++) {
        const ang = (i / leafCount) * Math.PI * 2 + rng() * 0.4;
        const dist = layout.baseRadius * 1.4 + rng() * (cfg.spread * 0.48);
        const leaf = new THREE.OctahedronGeometry(0.16 + rng() * 0.14, 0);
        leaf.scale(1.4, 0.18, 1.0);
        leaf.rotateY(rng() * Math.PI);
        leaf.translate(Math.cos(ang) * dist, layout.planterLift + 0.03, Math.sin(ang) * dist);
        foliageProps.push(treeColorizeGeometry(
          leaf,
          cfg.colorLeaf1,
          cfg.colorLeaf2,
          cfg.colorAccent,
          rng,
          getTreeFoliageColorOptions(cfg, { variance: 0.2 })
        ));
      }
    }
  }

  return { foliageProps, trunkProps, emissiveProps };
}
