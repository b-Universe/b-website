import { clamp, degToRad, lerp, rng32 } from '../utils.js';
import { computeSliceTransform, transformVertexXZ } from './footprints-mesh.js';

function addEdgeSegmentBox(batcher, p1, p2, cy, widthFrac, h, depth, outwardOffset, materialRole, layer = 'facade', centerFrac = 0.5) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const edgeLen = Math.hypot(dx, dz);
  if (edgeLen < 0.05) return;

  const nx = -dz / edgeLen;
  const nz = dx / edgeLen;
  const yaw = Math.atan2(nx, nz);

  const cx = lerp(p1.x, p2.x, centerFrac) + nx * outwardOffset;
  const cz = lerp(p1.z, p2.z, centerFrac) + nz * outwardOffset;
  const w = edgeLen * widthFrac;
  batcher.addBox(cx, cy, cz, w, h, depth, yaw, materialRole, layer);
}

function resolveWindowMaterialRole(cfg, towerIndex, sectionIndex, floorIndex, edgeIndex, bayIndex, floorActive, floorSeed) {
  if (cfg.lightingTime === 'day' && cfg.litWindowRatio <= 0.05) return 'glassUnlit';
  if (!floorActive) return 'glassUnlit';
  const r = rng32((cfg.lightingSeed || 404) + towerIndex * 10007 + sectionIndex * 1999 + floorIndex * 313 + edgeIndex * 59 + bayIndex * 17 + floorSeed);
  const v = r();
  const groupBias = (cfg.occupiedFloorGrouping || 0.7) > 0.3 ? (bayIndex % 3 === 0 ? 0.15 : 0) : 0;
  if (v < clamp(cfg.litWindowRatio + groupBias, 0, 1)) {
    const t = r();
    return t < (cfg.warmCoolBalance ?? 0.5) ? 'glassWarm' : 'glassCool';
  }
  return v < clamp(cfg.litWindowRatio + 0.14, 0, 1) ? 'glassDim' : 'glassUnlit';
}

function addArtDecoFanMotif(batcher, p1, p2, topY, bayW, secH) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const edgeLen = Math.hypot(dx, dz);
  if (edgeLen < 4) return;
  const nx = -dz / edgeLen;
  const nz = dx / edgeLen;
  const mx = (p1.x + p2.x) * 0.5;
  const mz = (p1.z + p2.z) * 0.5;
  const tx = dx / edgeLen;
  const tz = dz / edgeLen;

  const fanR = Math.min(bayW * 0.48, Math.max(3.2, secH * 0.16));
  const hubY = topY - fanR * 1.15 - 1.2;
  const out = 0.28;

  // Recessed dark backing arch
  const yaw = Math.atan2(nx, nz);
  batcher.addBox(mx + nx * 0.1, hubY + fanR * 0.45, mz + nz * 0.1, fanR * 1.9, fanR * 0.95, 0.22, yaw, 'glassUnlit', 'facade');

  // Sunburst radial stone ribs (7 rays)
  const rayCount = 7;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / (rayCount - 1)) * Math.PI;
    const rx = Math.cos(a) * fanR;
    const ry = Math.sin(a) * fanR;
    const aPt = [mx + nx * out, hubY, mz + nz * out];
    const bPt = [mx + tx * rx + nx * out, hubY + ry, mz + tz * rx + nz * out];
    batcher.addBeam(aPt, bPt, 0.22, 0.26, 'trim', 'facade');
  }

  // Semicircular arch ring segments
  const arcSegs = 8;
  for (let i = 0; i < arcSegs; i++) {
    const a0 = (i / arcSegs) * Math.PI;
    const a1 = ((i + 1) / arcSegs) * Math.PI;
    const pA = [mx + tx * Math.cos(a0) * fanR + nx * (out + 0.06), hubY + Math.sin(a0) * fanR, mz + tz * Math.cos(a0) * fanR + nz * (out + 0.06)];
    const pB = [mx + tx * Math.cos(a1) * fanR + nx * (out + 0.06), hubY + Math.sin(a1) * fanR, mz + tz * Math.cos(a1) * fanR + nz * (out + 0.06)];
    batcher.addBeam(pA, pB, 0.28, 0.3, 'framing', 'facade');
  }
}

export function generateSectionFacades(batcher, section, cfg, towerIndex = 0) {
  const poly = section.polygon;
  if (!poly || !poly.edges || poly.edges.length === 0) return;

  const pattern = section.windowPattern !== 'inherit' ? section.windowPattern : cfg.windowPattern;
  const fStyle = section.facadeStyle !== 'inherit' ? section.facadeStyle : 'default';
  const floors = section.floors;
  const fh = section.floorHeight;
  const secH = section.height;
  const baseY = section.baseElevation;
  const recess = clamp(cfg.windowRecess || 0.22, 0.04, 0.8);
  const bandInterval = Math.max(1, Math.round(cfg.floorBandInterval || 1));
  const ribDensity = clamp(cfg.ribDensity ?? 0.7, 0, 1.2);
  const colThick = clamp(cfg.columnThickness || 0.6, 0.15, 2.0);
  const mullionThick = clamp(cfg.mullionThickness || 0.14, 0.05, 0.45);
  const bandThick = clamp(cfg.floorBandThickness || 0.35, 0.08, 1.4);
  const balconyRatio = clamp(cfg.balconyRatio || 0, 0, 1);

  const floorRng = rng32((cfg.lightingSeed || 404) + towerIndex * 997 + section.index * 131);

  // Track section top cornice ring
  const topTransform = computeSliceTransform(section, 1, secH, 0);
  const topVerts = poly.vertices.map((v) => {
    const tr = computeSliceTransform(section, 1, secH, v.x);
    const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
    return { x: pt.x, y: baseY + tr.y, z: pt.z };
  });

  // Cornice / Setback cap ring along top edges (only when bearing top is horizontal)
  const hasEffectiveSlant = Math.abs(section.slantedTopDeg || 0) >= 1 && section.isTopSection !== false;
  if ((cfg.corniceSize || 0) > 0.05 && !hasEffectiveSlant) {
    const cSize = clamp(cfg.corniceSize, 0.1, 1.6);
    for (let i = 0; i < topVerts.length; i++) {
      const a = topVerts[i];
      const b = topVerts[(i + 1) % topVerts.length];
      addEdgeSegmentBox(batcher, a, b, a.y - cSize * 0.25, 1.02, cSize * 0.55, cSize * 0.7, cSize * 0.18, 'trim', 'facade');
    }
  }

  // Vertical corner piers / columns along section height (sliced for flare/twist)
  const vSlices = Math.abs(section.twistDeg || 0) > 0.5 || (section.flareBase || 0) > 0.01 ? 8 : 1;
  const cornerScale = section.cornerTreatment === 'stepped_piers'
    ? 1.35
    : section.cornerTreatment === 'fluted_columns'
      ? 1.15
      : 0.7;

  if (ribDensity > 0.1 && (section.cornerTreatment !== 'rounded' || fStyle === 'art_deco' || fStyle === 'gothic')) {
    for (let vi = 0; vi < poly.vertices.length; vi++) {
      const v = poly.vertices[vi];
      if (v.curved && poly.vertices.length > 10 && vi % 2 === 1) continue;
      for (let s = 0; s < vSlices; s++) {
        const f0 = s / vSlices;
        const f1 = (s + 1) / vSlices;
        const t0 = computeSliceTransform(section, f0, secH, v.x);
        const t1 = computeSliceTransform(section, f1, secH, v.x);
        const p0 = transformVertexXZ(v, t0.sx, t0.sz, t0.rotRad, section.offsetX || 0, section.offsetZ || 0);
        const p1 = transformVertexXZ(v, t1.sx, t1.sz, t1.rotRad, section.offsetX || 0, section.offsetZ || 0);
        const pierR = colThick * 0.48 * cornerScale;
        batcher.addBeam([p0.x, baseY + t0.y, p0.z], [p1.x, baseY + t1.y, p1.z], pierR, pierR, 'framing', 'facade');
      }
    }
  }

  // Per-floor perimeter facade generation
  for (let f = 0; f < floors; f++) {
    const frac = (f + 0.5) / floors;
    const floorSeed = Math.floor(floorRng() * 10000);
    const isDarkFloor = floorRng() < (cfg.darkFloorChance || 0);
    const floorActive = !isDarkFloor;
    const cy = baseY + frac * secH;
    const showBand = f === 0 || f === floors - 1 || (f % bandInterval === 0);

    for (let ei = 0; ei < poly.edges.length; ei++) {
      const edge = poly.edges[ei];
      const tr1 = computeSliceTransform(section, frac, secH, edge.p1.x);
      const tr2 = computeSliceTransform(section, frac, secH, edge.p2.x);
      const maxAllowY = baseY + Math.min(tr1.y, tr2.y);

      const p1 = transformVertexXZ(edge.p1, tr1.sx, tr1.sz, tr1.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const p2 = transformVertexXZ(edge.p2, tr2.sx, tr2.sz, tr2.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const eLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (eLen < 0.8) continue;

      // Skip windows near/above a slanted top edge
      if (section.slantedTopDeg && section.isTopSection !== false) {
        const top1 = computeSliceTransform(section, 1, secH, edge.p1.x);
        const top2 = computeSliceTransform(section, 1, secH, edge.p2.x);
        const roofMin = baseY + Math.min(top1.y, top2.y);
        if (cy + fh * 0.38 > roofMin) continue;
      }

      const isCenterStrip = edge.isRecessedCenter || (section.recessedCoreStrip && Math.abs(edge.normal.z) > 0.85 && eLen > 9);
      const winH = clamp(
        pattern === 'floor_to_ceiling' || pattern === 'curtain_wall'
          ? fh * 0.84
          : pattern === 'horizontal_ribbon'
            ? fh * 0.6
            : (cfg.windowHeight || fh * 0.65),
        0.8,
        fh * 0.9
      );

      // Horizontal floor band
      if (showBand && !edge.isCurved) {
        const bandOut = pattern === 'recessed_bays' ? 0.24 : 0.1;
        addEdgeSegmentBox(batcher, p1, p2, baseY + f * fh + bandThick * 0.4, 1.0, bandThick, bandOut * 2 + 0.14, bandOut * 0.5, 'trim', 'facade');
      } else if (edge.isCurved && (showBand || pattern === 'horizontal_ribbon')) {
        addEdgeSegmentBox(batcher, p1, p2, baseY + f * fh + bandThick * 0.4, 1.02, bandThick, 0.22, 0.08, 'trim', 'facade');
      }

      // Curved / ribbon horizontal glass strip mode
      if (pattern === 'horizontal_ribbon' && !edge.isRecessedCenter) {
        const paneMat = resolveWindowMaterialRole(cfg, towerIndex, section.index, f, ei, 0, floorActive, floorSeed);
        addEdgeSegmentBox(batcher, p1, p2, cy, 0.96, winH, 0.16, 0.05, paneMat, 'facade');
        if (eLen > 2.2) {
          addEdgeSegmentBox(batcher, p1, p2, cy, 0.04, winH, 0.22, 0.08, 'mullion', 'facade', 0.5);
        }
        continue;
      }

      // Compute bay count for this edge
      const targetBayPitch = clamp(cfg.columnSpacing || 3.4, 1.8, 7.5);
      const minBays = edge.isCurved ? 1 : (isCenterStrip ? 3 : 1);
      const bays = clamp(Math.round(eLen / targetBayPitch), minBays, 22);
      const bayLen = eLen / bays;

      for (let b = 0; b < bays; b++) {
        const u0 = b / bays;
        const u1 = (b + 1) / bays;
        const uMid = (u0 + u1) * 0.5;

        // Vertical ribs / pilasters at bay dividers
        if (b > 0 && ribDensity > 0.05 && !edge.isCurved) {
          const ribW = clamp((colThick * 0.45 * ribDensity) / eLen, 0.015, 0.18);
          const ribOut = fStyle === 'art_deco' || fStyle === 'gothic' ? 0.26 : 0.12;
          const ribRole = fStyle === 'art_deco' || pattern === 'vertical_strips' ? 'framing' : 'mullion';
          addEdgeSegmentBox(batcher, p1, p2, cy, ribW, fh * 0.99, ribOut * 2 + 0.12, ribOut * 0.5, ribRole, 'facade', u0);
        }

        // Determine window width within bay
        let winFrac = 0.72;
        if (pattern === 'vertical_strips') winFrac = 0.48;
        else if (pattern === 'curtain_wall' || pattern === 'floor_to_ceiling') winFrac = 0.9;
        else if (pattern === 'corner_wrap') winFrac = 0.88;
        else if (pattern === 'alternating_widths') winFrac = b % 2 === 0 ? 0.78 : 0.44;
        else if (pattern === 'grouped_decorative') winFrac = b % 3 === 1 ? 0.3 : 0.74;
        else if (isCenterStrip && section.recessedCoreStrip) winFrac = 0.62;

        const paneRole = resolveWindowMaterialRole(cfg, towerIndex, section.index, f, ei, b, floorActive, floorSeed);
        const winOut = pattern === 'curtain_wall' || pattern === 'corner_wrap' ? 0.06 : 0.03;
        addEdgeSegmentBox(batcher, p1, p2, cy, (winFrac / bays), winH, 0.14, winOut, paneRole, 'facade', uMid);

        // Mullions inside wide bays
        if (bayLen > 2.4 && pattern !== 'vertical_strips') {
          addEdgeSegmentBox(batcher, p1, p2, cy, (mullionThick / eLen), winH, 0.19, winOut + 0.03, 'mullion', 'facade', uMid);
        }

        // Recessed bay deep framing surround
        if (pattern === 'recessed_bays' || fStyle === 'brutalist') {
          addEdgeSegmentBox(batcher, p1, p2, cy + winH * 0.48, (1 / bays), 0.22, recess * 0.9, recess * 0.45, 'framing', 'facade', uMid);
        }

        // Arched monumental lintel cap
        if (pattern === 'arched_monumental') {
          addEdgeSegmentBox(batcher, p1, p2, cy + winH * 0.46, (winFrac * 0.85) / bays, 0.24, 0.24, 0.14, 'trim', 'facade', uMid);
        }

        // Balconies on residential / luxury sections (proportional depth)
        if (balconyRatio > 0.05 && !edge.isCurved && !edge.isRecessedCenter && f > 0 && ((f + b) % 2 === 0)) {
          const br = rng32(cfg.seed + f * 31 + b * 17 + ei * 7)();
          if (br < balconyRatio) {
            addEdgeSegmentBox(batcher, p1, p2, cy - winH * 0.48, (0.72 / bays), 0.16, 0.96, 0.48, 'trim', 'facade', uMid);
            addEdgeSegmentBox(batcher, p1, p2, cy - winH * 0.48 + 0.48, (0.72 / bays), 0.86, 0.08, 0.92, 'glassDim', 'facade', uMid);
          }
        }
      }
    }
  }

  // Exterior diagonal braces (section or global)
  const braceMode = section.diagonalBrace && section.diagonalBrace !== 'none'
    ? section.diagonalBrace
    : (section.role !== 'podium' ? (cfg.exteriorBracing || 'none') : 'none');

  if (braceMode !== 'none' && section.floors >= 4) {
    const tierStep = Math.max(4, Math.min(8, Math.floor(floors / 2)));
    for (let f0 = 0; f0 < floors - 1; f0 += tierStep) {
      const f1 = Math.min(floors, f0 + tierStep);
      const frac0 = f0 / floors;
      const frac1 = f1 / floors;
      for (let ei = 0; ei < poly.edges.length; ei++) {
        const edge = poly.edges[ei];
        if (edge.length < 6 || edge.isCurved) continue;
        const trA0 = computeSliceTransform(section, frac0, secH, edge.p1.x);
        const trB0 = computeSliceTransform(section, frac0, secH, edge.p2.x);
        const trA1 = computeSliceTransform(section, frac1, secH, edge.p1.x);
        const trB1 = computeSliceTransform(section, frac1, secH, edge.p2.x);
        const out = 0.25;
        const nx = edge.normal.x * out;
        const nz = edge.normal.z * out;
        const a0 = transformVertexXZ(edge.p1, trA0.sx, trA0.sz, trA0.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const b0 = transformVertexXZ(edge.p2, trB0.sx, trB0.sz, trB0.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const a1 = transformVertexXZ(edge.p1, trA1.sx, trA1.sz, trA1.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const b1 = transformVertexXZ(edge.p2, trB1.sx, trB1.sz, trB1.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);

        const pA0 = [a0.x, baseY + trA0.y, a0.z];
        const pB0 = [b0.x, baseY + trB0.y, b0.z];
        const pA1 = [a1.x, baseY + trA1.y, a1.z];
        const pB1 = [b1.x, baseY + trB1.y, b1.z];

        if (braceMode === 'left_to_right' || braceMode === 'x_brace') {
          batcher.addBeam(pA0, pB1, 0.24, 0.24, 'framing', 'facade');
        }
        if (braceMode === 'right_to_left' || braceMode === 'x_brace') {
          batcher.addBeam(pB0, pA1, 0.24, 0.24, 'framing', 'facade');
        }
        if (braceMode === 'diamond') {
          const midBot = [(pA0[0] + pB0[0]) * 0.5, (pA0[1] + pB0[1]) * 0.5, (pA0[2] + pB0[2]) * 0.5];
          const midTop = [(pA1[0] + pB1[0]) * 0.5, (pA1[1] + pB1[1]) * 0.5, (pA1[2] + pB1[2]) * 0.5];
          const midL = [(pA0[0] + pA1[0]) * 0.5, (pA0[1] + pA1[1]) * 0.5, (pA0[2] + pA1[2]) * 0.5];
          const midR = [(pB0[0] + pB1[0]) * 0.5, (pB0[1] + pB1[1]) * 0.5, (pB0[2] + pB1[2]) * 0.5];
          batcher.addBeam(midBot, midL, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midL, midTop, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midTop, midR, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midR, midBot, 0.2, 0.2, 'framing', 'facade');
        }
      }
    }
  }

  // Art Deco sunburst fan motif on upper front & back facades
  if (section.fanMotif) {
    for (const edge of poly.edges) {
      if (Math.abs(edge.normal.z) < 0.85 || edge.length < 6) continue;
      const tr1 = computeSliceTransform(section, 1, secH, edge.p1.x);
      const tr2 = computeSliceTransform(section, 1, secH, edge.p2.x);
      const p1 = transformVertexXZ(edge.p1, tr1.sx, tr1.sz, tr1.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const p2 = transformVertexXZ(edge.p2, tr2.sx, tr2.sz, tr2.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const fanTopY = baseY + Math.min(tr1.y, tr2.y);
      addArtDecoFanMotif(batcher, p1, p2, fanTopY, edge.length * 0.48, secH);
    }
  }
}
