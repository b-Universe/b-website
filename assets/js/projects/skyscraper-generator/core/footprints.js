import { clamp, degToRad, roundNum, polygonAreaSigned } from '../utils.js';

function ensureTopDownCCW(pts) {
  if (!Array.isArray(pts) || pts.length < 3) return pts;
  const cleaned = [];
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.hypot(cur.x - prev.x, cur.z - prev.z) > 0.02) {
      cleaned.push({ ...cur });
    }
  }
  if (cleaned.length > 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) <= 0.02) cleaned.pop();
  }
  if (cleaned.length < 3) return [];
  // Looking down from +Y onto XZ (+X right, +Z front/down), top-down CCW has negative signed area in (x, z)
  return polygonAreaSigned(cleaned) > 0 ? cleaned.reverse() : cleaned;
}

function segmentsIntersect(a, b, c, d) {
  const ccw = (p1, p2, p3) => (p3.z - p1.z) * (p2.x - p1.x) > (p2.z - p1.z) * (p3.x - p1.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

export function isPolygonSimple(pts) {
  const n = pts.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j];
      const d = pts[(j + 1) % n];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return Math.abs(polygonAreaSigned(pts)) > 1.0;
}

function makeRoundedRectPts(hw, hd, radius, segsPerCorner = 4) {
  const r = clamp(radius, 0.2, Math.min(hw, hd) * 0.48);
  const corners = [
    { cx: -hw + r, cz: hd - r, start: Math.PI * 0.5, end: Math.PI },
    { cx: -hw + r, cz: -hd + r, start: Math.PI, end: Math.PI * 1.5 },
    { cx: hw - r, cz: -hd + r, start: Math.PI * 1.5, end: Math.PI * 2 },
    { cx: hw - r, cz: hd - r, start: 0, end: Math.PI * 0.5 }
  ];
  // Build in front-left -> front-right -> back-right -> back-left order:
  // Note: in (x, z) where +Z is front, angles: 0=(+r,0), PI/2=(0,+r), PI=(-r,0), 3PI/2=(0,-r)
  const ordered = [
    { cx: -hw + r, cz: hd - r, a0: Math.PI, a1: Math.PI * 0.5, isCurved: true },      // front-left
    { cx: hw - r, cz: hd - r, a0: Math.PI * 0.5, a1: 0, isCurved: true },             // front-right
    { cx: hw - r, cz: -hd + r, a0: 0, a1: -Math.PI * 0.5, isCurved: true },           // back-right
    { cx: -hw + r, cz: -hd + r, a0: -Math.PI * 0.5, a1: -Math.PI, isCurved: true }    // back-left
  ];
  const pts = [];
  for (const c of ordered) {
    for (let i = 0; i <= segsPerCorner; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / segsPerCorner);
      pts.push({
        x: c.cx + Math.cos(a) * r,
        z: c.cz + Math.sin(a) * r,
        curved: i < segsPerCorner
      });
    }
  }
  return pts;
}

function makeCurvedWingsPts(hw, hd, cornerSize) {
  // Two convex curved wing lobes flanking a recessed central core strip on +Z and -Z
  const wingW = hw * 0.68;
  const coreHalf = hw * 0.24;
  const recess = Math.min(hd * 0.24, Math.max(1.2, cornerSize * 0.65));
  const arcBulge = Math.min(hd * 0.16, 2.2);
  const pts = [];

  // Left-front convex curve: x from -hw to -coreHalf
  const steps = 4;
  pts.push({ x: -hw, z: hd * 0.55, curved: true, role: 'wing_side' });
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -hw + (hw - coreHalf) * t;
    const z = hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge;
    pts.push({ x, z: Math.min(hd, z), curved: true, role: 'wing_front' });
  }
  // Recessed center front bay
  pts.push({ x: -coreHalf, z: hd - recess, curved: false, recessedCenter: true, role: 'center_strip' });
  pts.push({ x: coreHalf, z: hd - recess, curved: false, recessedCenter: true, role: 'center_strip' });
  // Right-front convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = coreHalf + (hw - coreHalf) * t;
    const z = hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge;
    pts.push({ x, z: Math.min(hd, z), curved: true, role: 'wing_front' });
  }
  pts.push({ x: hw, z: hd * 0.55, curved: true, role: 'wing_side' });
  pts.push({ x: hw, z: -hd * 0.55, curved: true, role: 'wing_side' });

  // Right-back convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = hw - (hw - coreHalf) * t;
    const z = -(hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge);
    pts.push({ x, z: Math.max(-hd, z), curved: true, role: 'wing_back' });
  }
  // Recessed center back bay
  pts.push({ x: coreHalf, z: -(hd - recess), curved: false, recessedCenter: true, role: 'center_strip' });
  pts.push({ x: -coreHalf, z: -(hd - recess), curved: false, recessedCenter: true, role: 'center_strip' });
  // Left-back convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -coreHalf - (hw - coreHalf) * t;
    const z = -(hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge);
    pts.push({ x, z: Math.max(-hd, z), curved: true, role: 'wing_back' });
  }
  pts.push({ x: -hw, z: -hd * 0.55, curved: true, role: 'wing_side' });
  return pts;
}

export function generateFootprintPolygon(footprintType, width, depth, options = {}) {
  const w = clamp(Number(width) || 22, 6, 90);
  const d = clamp(Number(depth) || 20, 6, 90);
  const hw = w * 0.5;
  const hd = d * 0.5;
  const cornerSize = clamp(Number(options.cornerSize) || 2.0, 0.3, Math.min(hw, hd) * 0.45);
  const cornerTreatment = options.cornerTreatment || 'sharp';
  const asymmetry = clamp(Number(options.asymmetry) || 0.25, 0.05, 0.45);

  let rawPts = [];

  switch (footprintType) {
    case 'square': {
      const s = Math.min(hw, hd);
      rawPts = [
        { x: -s, z: s },
        { x: s, z: s },
        { x: s, z: -s },
        { x: -s, z: -s }
      ];
      break;
    }
    case 'rounded_rectangle': {
      rawPts = makeRoundedRectPts(hw, hd, cornerSize, 4);
      break;
    }
    case 'octagon': {
      const cx = hw * 0.42;
      const cz = hd * 0.42;
      rawPts = [
        { x: -hw + cx, z: hd },
        { x: hw - cx, z: hd },
        { x: hw, z: hd - cz },
        { x: hw, z: -hd + cz },
        { x: hw - cx, z: -hd },
        { x: -hw + cx, z: -hd },
        { x: -hw, z: -hd + cz },
        { x: -hw, z: hd - cz }
      ];
      break;
    }
    case 'circle': {
      const r = Math.min(hw, hd);
      const sides = 20;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        rawPts.push({ x: Math.cos(a) * r, z: -Math.sin(a) * r, curved: true });
      }
      break;
    }
    case 'ellipse': {
      const sides = 20;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        rawPts.push({ x: Math.cos(a) * hw, z: -Math.sin(a) * hd, curved: true });
      }
      break;
    }
    case 'chamfered': {
      const c = cornerSize;
      if (cornerTreatment === 'stepped_piers') {
        const c1 = c * 0.55;
        const c2 = c * 1.1;
        rawPts = [
          { x: -hw + c2, z: hd },
          { x: hw - c2, z: hd },
          { x: hw - c2, z: hd - c1 },
          { x: hw - c1, z: hd - c1 },
          { x: hw - c1, z: hd - c2 },
          { x: hw, z: hd - c2 },
          { x: hw, z: -hd + c2 },
          { x: hw - c1, z: -hd + c2 },
          { x: hw - c1, z: -hd + c1 },
          { x: hw - c2, z: -hd + c1 },
          { x: hw - c2, z: -hd },
          { x: -hw + c2, z: -hd },
          { x: -hw + c2, z: -hd + c1 },
          { x: -hw + c1, z: -hd + c1 },
          { x: -hw + c1, z: -hd + c2 },
          { x: -hw, z: -hd + c2 },
          { x: -hw, z: hd - c2 },
          { x: -hw + c1, z: hd - c2 },
          { x: -hw + c1, z: hd - c1 },
          { x: -hw + c2, z: hd - c1 }
        ];
      } else {
        rawPts = [
          { x: -hw + c, z: hd },
          { x: hw - c, z: hd },
          { x: hw, z: hd - c },
          { x: hw, z: -hd + c },
          { x: hw - c, z: -hd },
          { x: -hw + c, z: -hd },
          { x: -hw, z: -hd + c },
          { x: -hw, z: hd - c }
        ];
      }
      break;
    }
    case 'cross': {
      const wx = hw * 0.42;
      const wz = hd * 0.42;
      rawPts = [
        { x: -wx, z: hd },
        { x: wx, z: hd },
        { x: wx, z: wz },
        { x: hw, z: wz },
        { x: hw, z: -wz },
        { x: wx, z: -wz },
        { x: wx, z: -hd },
        { x: -wx, z: -hd },
        { x: -wx, z: -wz },
        { x: -hw, z: -wz },
        { x: -hw, z: wz },
        { x: -wx, z: wz }
      ];
      break;
    }
    case 'h_shape': {
      const barW = hw * 0.42;
      const barD = hd * 0.38;
      rawPts = [
        { x: -hw, z: hd },
        { x: -barW, z: hd },
        { x: -barW, z: barD },
        { x: barW, z: barD },
        { x: barW, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: barW, z: -hd },
        { x: barW, z: -barD },
        { x: -barW, z: -barD },
        { x: -barW, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'l_shape': {
      const wingX = hw * 0.1;
      const wingZ = hd * 0.1;
      rawPts = [
        { x: -hw, z: hd },
        { x: hw, z: hd },
        { x: hw, z: wingZ },
        { x: wingX, z: wingZ },
        { x: wingX, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'u_shape': {
      const armW = hw * 0.38;
      const courtD = hd * 0.25;
      rawPts = [
        { x: -hw, z: hd },
        { x: -armW, z: hd },
        { x: -armW, z: -courtD },
        { x: armW, z: -courtD },
        { x: armW, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'tapered_polygon': {
      rawPts = [
        { x: -hw * 0.72, z: hd },
        { x: hw * 0.72, z: hd },
        { x: hw, z: 0 },
        { x: hw * 0.55, z: -hd },
        { x: -hw * 0.55, z: -hd },
        { x: -hw, z: 0 }
      ];
      break;
    }
    case 'asymmetrical_polygon': {
      rawPts = [
        { x: -hw, z: hd * 0.85 },
        { x: hw * (1 - asymmetry * 0.5), z: hd },
        { x: hw, z: -hd * 0.3 },
        { x: hw * 0.35, z: -hd },
        { x: -hw * 0.88, z: -hd * 0.72 }
      ];
      break;
    }
    case 'multi_wing': {
      const stepX = hw * 0.26;
      const stepZ = hd * 0.32;
      rawPts = [
        { x: -hw, z: hd * 0.75 },
        { x: stepX, z: hd * 0.75 },
        { x: stepX, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd * 0.65 },
        { x: -stepX, z: -hd * 0.65 },
        { x: -stepX, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'curved_wings': {
      rawPts = makeCurvedWingsPts(hw, hd, cornerSize);
      break;
    }
    case 'triangle':
    case 'triangular_wedge': {
      // Three-sided architectural wedge centered near its structural centroid
      const zFront = hd * 0.56;
      const zBack = -hd * 0.98;
      if (cornerTreatment !== 'sharp') {
        const bev = clamp(cornerSize / Math.max(8, Math.min(w, d)), 0.05, 0.22);
        const pts3 = [
          { x: -hw, z: zFront },
          { x: hw, z: zFront },
          { x: 0, z: zBack }
        ];
        for (let i = 0; i < 3; i++) {
          const prev = pts3[(i + 2) % 3];
          const cur = pts3[i];
          const next = pts3[(i + 1) % 3];
          rawPts.push({
            x: cur.x + (prev.x - cur.x) * bev,
            z: cur.z + (prev.z - cur.z) * bev,
            curved: cornerTreatment === 'rounded'
          });
          rawPts.push({
            x: cur.x + (next.x - cur.x) * bev,
            z: cur.z + (next.z - cur.z) * bev,
            curved: cornerTreatment === 'rounded'
          });
        }
      } else {
        rawPts = [
          { x: -hw, z: zFront },
          { x: hw, z: zFront },
          { x: 0, z: zBack }
        ];
      }
      break;
    }
    case 'rectangle':
    default: {
      rawPts = [
        { x: -hw, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
  }

  let vertices = ensureTopDownCCW(rawPts);
  if (!isPolygonSimple(vertices)) {
    vertices = ensureTopDownCCW([
      { x: -hw, z: hd },
      { x: hw, z: hd },
      { x: hw, z: -hd },
      { x: -hw, z: -hd }
    ]);
  }

  const edges = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    minX = Math.min(minX, p1.x);
    maxX = Math.max(maxX, p1.x);
    minZ = Math.min(minZ, p1.z);
    maxZ = Math.max(maxZ, p1.z);
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.02) continue;
    const nx = -dz / length;
    const nz = dx / length;
    const isRecessedCenter = Boolean(p1.recessedCenter && p2.recessedCenter);
    edges.push({
      index: edges.length,
      p1: { x: roundNum(p1.x, 4), z: roundNum(p1.z, 4) },
      p2: { x: roundNum(p2.x, 4), z: roundNum(p2.z, 4) },
      mid: { x: roundNum((p1.x + p2.x) * 0.5, 4), z: roundNum((p1.z + p2.z) * 0.5, 4) },
      length: roundNum(length, 4),
      tangent: { x: dx / length, z: dz / length },
      normal: { x: roundNum(nx, 4), z: roundNum(nz, 4) },
      yawRadians: Math.atan2(nx, nz),
      isCurved: Boolean(p1.curved || p2.curved),
      isRecessedCenter,
      facadeRole: isRecessedCenter ? 'center_strip' : (p1.role || 'main')
    });
  }

  const normalizedType = footprintType === 'triangular_wedge' ? 'triangle' : footprintType;
  return {
    type: normalizedType,
    width: roundNum(w, 3),
    depth: roundNum(d, 3),
    vertices: vertices.map((v) => ({ x: roundNum(v.x, 4), z: roundNum(v.z, 4), curved: Boolean(v.curved) })),
    edges,
    bounds: {
      minX: roundNum(minX, 4),
      maxX: roundNum(maxX, 4),
      minZ: roundNum(minZ, 4),
      maxZ: roundNum(maxZ, 4)
    },
    area: roundNum(Math.abs(polygonAreaSigned(vertices)), 3)
  };
}

export function scaleFootprintVertices(vertices, scaleX, scaleZ) {
  return vertices.map((v) => ({
    ...v,
    x: v.x * scaleX,
    z: v.z * scaleZ
  }));
}

export function transformFootprintVertices2D(vertices, sx = 1, sz = 1, rotDeg = 0, offsetX = 0, offsetZ = 0) {
  const rad = degToRad(rotDeg || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return vertices.map((v) => {
    const px = v.x * sx;
    const pz = v.z * sz;
    return {
      x: px * cos + pz * sin + offsetX,
      z: -px * sin + pz * cos + offsetZ
    };
  });
}

export function pointInPolygon2D(pt, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x;
    const zi = verts[i].z;
    const xj = verts[j].x;
    const zj = verts[j].z;
    const intersect = ((zi > pt.z) !== (zj > pt.z)) &&
      (pt.x < ((xj - xi) * (pt.z - zi)) / ((zj - zi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distanceToSegment2D(pt, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return Math.hypot(pt.x - a.x, pt.z - a.z);
  const t = clamp(((pt.x - a.x) * dx + (pt.z - a.z) * dz) / lenSq, 0, 1);
  return Math.hypot(pt.x - (a.x + t * dx), pt.z - (a.z + t * dz));
}

export function distanceOutsidePolygon2D(pt, verts) {
  if (!verts || verts.length < 3) return 0;
  if (pointInPolygon2D(pt, verts)) return 0;
  let minDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    minDist = Math.min(minDist, distanceToSegment2D(pt, a, b));
  }
  return minDist === Infinity ? 0 : minDist;
}

export function computeConvexHull2D(verts) {
  if (!verts || verts.length <= 3) return verts ? [...verts] : [];
  const pts = verts
    .map((p) => ({ x: p.x, z: p.z }))
    .sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function computePolygonSupportMetrics(lowerTopVerts, upperBaseVerts) {
  if (!lowerTopVerts || lowerTopVerts.length < 3 || !upperBaseVerts || upperBaseVerts.length < 3) {
    return {
      maxHullProtrusion: 0,
      maxPolyProtrusion: 0,
      unsupportedSamples: 0,
      sampleCount: 0,
      supportedRatio: 1,
      worstPoint: null
    };
  }
  const lowerHull = computeConvexHull2D(lowerTopVerts);
  const samples = [];
  for (let i = 0; i < upperBaseVerts.length; i++) {
    const a = upperBaseVerts[i];
    const b = upperBaseVerts[(i + 1) % upperBaseVerts.length];
    samples.push(a);
    const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (edgeLen > 3.5) {
      samples.push({ x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 });
    }
  }

  let maxHullProtrusion = 0;
  let maxPolyProtrusion = 0;
  let unsupportedSamples = 0;
  let worstPoint = null;

  for (const pt of samples) {
    const dHull = distanceOutsidePolygon2D(pt, lowerHull);
    const dPoly = distanceOutsidePolygon2D(pt, lowerTopVerts);
    if (dHull > maxHullProtrusion) {
      maxHullProtrusion = dHull;
      worstPoint = { x: roundNum(pt.x, 3), z: roundNum(pt.z, 3), protrusion: roundNum(dHull, 3) };
    }
    if (dPoly > maxPolyProtrusion) maxPolyProtrusion = dPoly;
    if (dPoly > 0.4) unsupportedSamples++;
  }

  return {
    maxHullProtrusion: roundNum(maxHullProtrusion, 3),
    maxPolyProtrusion: roundNum(maxPolyProtrusion, 3),
    unsupportedSamples,
    sampleCount: samples.length,
    supportedRatio: roundNum((samples.length - unsupportedSamples) / Math.max(1, samples.length), 3),
    worstPoint
  };
}

export function validateSectionTransition(lowerSection, upperSection, cfg = {}) {
  if (!lowerSection) {
    return {
      ...upperSection,
      transitionDiagnostics: {
        mode: upperSection.transitionMode || 'direct',
        maxHullProtrusion: 0,
        maxPolyProtrusion: 0,
        supportedRatio: 1,
        clamped: false,
        needsCantileverSupport: false,
        warnings: []
      }
    };
  }

  const mode = upperSection.transitionMode || 'setback';
  const explicitOverhang = Number(upperSection.overhang) || 0;
  const isCantileverMode = mode === 'supported_cantilever' || mode === 'outward_expansion' || Boolean(cfg.allowCantileveredSteps);
  const cfgMaxRatio = clamp(Number(cfg.maxOutwardExpansionRatio ?? 0.12), 0, 0.6);
  const effectiveRatio = isCantileverMode ? Math.max(0.32, cfgMaxRatio) : cfgMaxRatio;

  const lowPoly = lowerSection.polygon;
  const lowTopVerts = lowPoly && lowPoly.vertices
    ? transformFootprintVertices2D(
      lowPoly.vertices,
      lowerSection.taperX || 1,
      lowerSection.taperZ || 1,
      (lowerSection.baseRotationDeg || 0) + (lowerSection.twistDeg || 0),
      lowerSection.offsetX || 0,
      lowerSection.offsetZ || 0
    )
    : null;

  let lowMinX = Infinity;
  let lowMaxX = -Infinity;
  let lowMinZ = Infinity;
  let lowMaxZ = -Infinity;
  if (lowTopVerts) {
    for (const v of lowTopVerts) {
      lowMinX = Math.min(lowMinX, v.x);
      lowMaxX = Math.max(lowMaxX, v.x);
      lowMinZ = Math.min(lowMinZ, v.z);
      lowMaxZ = Math.max(lowMaxZ, v.z);
    }
  }
  const lowTopW = lowTopVerts ? Math.max(6, lowMaxX - lowMinX) : lowerSection.width;
  const lowTopD = lowTopVerts ? Math.max(6, lowMaxZ - lowMinZ) : lowerSection.depth;
  const lowCenterX = lowTopVerts ? (lowMinX + lowMaxX) * 0.5 : (lowerSection.offsetX || 0);
  const lowCenterZ = lowTopVerts ? (lowMinZ + lowMaxZ) * 0.5 : (lowerSection.offsetZ || 0);
  const minSpan = Math.max(6, Math.min(lowTopW, lowTopD));

  const maxScalarRatio = isCantileverMode ? 1.48 : 1.4;
  let safeW = clamp(upperSection.width, 8, Math.min(lowerSection.width * 1.4, lowTopW * maxScalarRatio));
  let safeD = clamp(upperSection.depth, 8, Math.min(lowerSection.depth * 1.4, lowTopD * maxScalarRatio));

  const maxOffsetX = Math.max(2, lowTopW * (isCantileverMode ? 0.42 : 0.34));
  const maxOffsetZ = Math.max(2, lowTopD * (isCantileverMode ? 0.42 : 0.34));
  let safeOffX = clamp(upperSection.offsetX || 0, lowCenterX - maxOffsetX, lowCenterX + maxOffsetX);
  let safeOffZ = clamp(upperSection.offsetZ || 0, lowCenterZ - maxOffsetZ, lowCenterZ + maxOffsetZ);

  const allowedHullProtrusion = minSpan * effectiveRatio + (!isCantileverMode && explicitOverhang > 0.25 ? Math.min(1.6, explicitOverhang * 0.5) : 0);
  let clamped = Math.abs(safeW - upperSection.width) > 0.05 ||
    Math.abs(safeD - upperSection.depth) > 0.05 ||
    Math.abs(safeOffX - (upperSection.offsetX || 0)) > 0.05 ||
    Math.abs(safeOffZ - (upperSection.offsetZ || 0)) > 0.05;

  let metrics = { maxHullProtrusion: 0, maxPolyProtrusion: 0, unsupportedSamples: 0, sampleCount: 0, supportedRatio: 1, worstPoint: null };
  if (lowTopVerts) {
    const cornerSize = upperSection.cornerSize || cfg.cornerRadius || 2.0;
    for (let iter = 0; iter < 10; iter++) {
      const candPoly = generateFootprintPolygon(upperSection.footprint, safeW, safeD, {
        cornerSize,
        cornerTreatment: upperSection.cornerTreatment
      });
      const upBaseVerts = transformFootprintVertices2D(
        candPoly.vertices,
        1,
        1,
        upperSection.baseRotationDeg || 0,
        safeOffX,
        safeOffZ
      );
      metrics = computePolygonSupportMetrics(lowTopVerts, upBaseVerts);
      if (metrics.maxHullProtrusion <= allowedHullProtrusion + 0.08) break;

      const excess = metrics.maxHullProtrusion - allowedHullProtrusion;
      safeW = Math.max(8, safeW - Math.min(safeW - 8, excess * 1.15));
      safeD = Math.max(8, safeD - Math.min(safeD - 8, excess * 1.15));
      safeOffX = lowCenterX + (safeOffX - lowCenterX) * 0.65;
      safeOffZ = lowCenterZ + (safeOffZ - lowCenterZ) * 0.65;
      clamped = true;
    }
  }

  const warnings = [];
  if (clamped) {
    warnings.push(`Transition on "${upperSection.label || upperSection.role}" adjusted to respect structural support limits.`);
  }
  const needsCantileverSupport = (mode === 'supported_cantilever' || metrics.maxHullProtrusion > 0.65 || (metrics.maxPolyProtrusion > 1.8 && isCantileverMode));
  if (metrics.maxHullProtrusion > 0.65 && !isCantileverMode) {
    warnings.push(`Outward overhang (${metrics.maxHullProtrusion}m) receives automatic transfer support brackets.`);
  }

  return {
    ...upperSection,
    width: roundNum(safeW, 3),
    depth: roundNum(safeD, 3),
    offsetX: roundNum(safeOffX, 3),
    offsetZ: roundNum(safeOffZ, 3),
    transitionDiagnostics: {
      mode,
      maxHullProtrusion: metrics.maxHullProtrusion,
      maxPolyProtrusion: metrics.maxPolyProtrusion,
      supportedRatio: metrics.supportedRatio,
      clamped,
      needsCantileverSupport,
      warnings
    }
  };
}
