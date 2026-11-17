import { clamp, degToRad, lerp } from '../utils.js';
import { distanceOutsidePolygon2D } from '../core/footprints.js';

export function computeSliceTransform(section, frac, height, xCoord = 0) {
  const flare = section.flareBase > 0
    ? Math.pow(Math.max(0, 1 - frac / 0.68), 2.0) * section.flareBase
    : 0;
  const sx = lerp(1, section.taperX || 1, frac) * (1 + flare);
  const sz = lerp(1, section.taperZ || 1, frac) * (1 + flare);
  const rotRad = degToRad((section.baseRotationDeg || 0) + (section.twistDeg || 0) * frac);
  let y = frac * height;
  // Only shear top bearing plane on terminal top sections so intermediate stacked seams stay coplanar and watertight
  if (section.slantedTopDeg && section.isTopSection !== false) {
    const slope = Math.tan(degToRad(section.slantedTopDeg));
    const shear = slope * xCoord * Math.pow(frac, 1.3);
    y = Math.max(frac * height * 0.35, y + shear);
  }
  return { sx, sz, rotRad, y, flare };
}

export function transformVertexXZ(v, sx, sz, rotRad, offsetX = 0, offsetZ = 0) {
  const px = v.x * sx;
  const pz = v.z * sz;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  return {
    x: px * cos + pz * sin + offsetX,
    z: -px * sin + pz * cos + offsetZ
  };
}

export function buildSectionCoreMesh(section, material, materialRole = 'primary', layer = 'structure') {
  const poly = section.polygon;
  const verts = poly.vertices;
  const n = verts.length;
  if (n < 3) return null;

  const needsSlices = Math.abs(section.twistDeg || 0) > 0.5 || (section.flareBase || 0) > 0.01;
  const slices = needsSlices ? 8 : 1;
  const h = section.height;

  const rings = [];
  for (let s = 0; s <= slices; s++) {
    const frac = s / slices;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const v = verts[i];
      const tr = computeSliceTransform(section, frac, h, v.x);
      const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
      ring.push({ x: pt.x, y: section.baseElevation + tr.y, z: pt.z });
    }
    rings.push(ring);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vOff = 0;

  const pushTri = (a, b, c, nx, ny, nz, uvA = [0, 0], uvB = [1, 0], uvC = [1, 1]) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(uvA[0], uvA[1], uvB[0], uvB[1], uvC[0], uvC[1]);
    indices.push(vOff, vOff + 1, vOff + 2);
    vOff += 3;
  };

  // Side walls across slices
  for (let s = 0; s < slices; s++) {
    const r0 = rings[s];
    const r1 = rings[s + 1];
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const a = r0[i];
      const b = r0[next];
      const c = r1[next];
      const d = r1[i];

      const ux = b.x - a.x;
      const uy = b.y - a.y;
      const uz = b.z - a.z;
      const vx = c.x - a.x;
      const vy = c.y - a.y;
      const vz = c.z - a.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
      const uSpan = edgeLen * 0.14;
      const v0 = (s / slices) * h * 0.14;
      const v1 = ((s + 1) / slices) * h * 0.14;

      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
      uvs.push(0, v0, uSpan, v0, uSpan, v1, 0, v1);
      indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
      vOff += 4;
    }
  }

  // Triangulate bottom and top caps
  const contour = verts.map((v) => new THREE.Vector2(v.x, -v.z));
  const capTris = THREE.ShapeUtils.triangulateShape(contour, []);
  const botRing = rings[0];
  const topRing = rings[slices];

  for (const tri of capTris) {
    // Bottom cap (normal ~ -Y; flip if cross.y > 0)
    const ba = botRing[tri[0]];
    const bb = botRing[tri[1]];
    const bc = botRing[tri[2]];
    const crossBotY = (bb.z - ba.z) * (bc.x - ba.x) - (bb.x - ba.x) * (bc.z - ba.z);
    if (crossBotY <= 0) {
      pushTri(ba, bb, bc, 0, -1, 0);
    } else {
      pushTri(ba, bc, bb, 0, -1, 0);
    }

    // Top cap (normal pointing upward)
    const ta = topRing[tri[0]];
    const tb = topRing[tri[1]];
    const tc = topRing[tri[2]];
    const ux = tb.x - ta.x;
    const uy = tb.y - ta.y;
    const uz = tb.z - ta.z;
    const vx = tc.x - ta.x;
    const vy = tc.y - ta.y;
    const vz = tc.z - ta.z;
    let tnx = uy * vz - uz * vy;
    let tny = uz * vx - ux * vz;
    let tnz = ux * vy - uy * vx;
    const tlen = Math.hypot(tnx, tny, tnz) || 1;
    tnx /= tlen;
    tny /= tlen;
    tnz /= tlen;
    if (tny >= 0) {
      pushTri(ta, tb, tc, tnx, tny, tnz);
    } else {
      pushTri(ta, tc, tb, -tnx, -tny, -tnz);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = `SectionCore_${section.id}`;
  mesh.userData = { layer, materialRole, sectionId: section.id };
  return mesh;
}

function getSectionRingXZ(section, frac) {
  const verts = section?.polygon?.vertices || [];
  const h = section?.height || 10;
  const ring = [];
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const tr = computeSliceTransform(section, frac, h, v.x);
    const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
    ring.push({ x: pt.x, z: pt.z });
  }
  return ring;
}

function closestPointOnRing2D(pt, ring) {
  let best = ring[0] || { x: 0, z: 0 };
  let bestDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 1e-6 ? clamp(((pt.x - a.x) * dx + (pt.z - a.z) * dz) / lenSq, 0, 1) : 0;
    const cx = a.x + t * dx;
    const cz = a.z + t * dz;
    const d = Math.hypot(pt.x - cx, pt.z - cz);
    if (d < bestDist) {
      bestDist = d;
      best = { x: cx, z: cz };
    }
  }
  return { pt: best, dist: bestDist };
}

function buildLoftedCollarMesh(lowRing, upRing, y0, y1, material, matRole) {
  if (!lowRing.length || !upRing.length) return null;
  const cx = lowRing.reduce((s, p) => s + p.x, 0) / lowRing.length;
  const cz = lowRing.reduce((s, p) => s + p.z, 0) / lowRing.length;

  const sampleRay = (ring, angle) => {
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let bestT = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const sx = b.x - a.x;
      const sz = b.z - a.z;
      const denom = dx * sz - dz * sx;
      if (Math.abs(denom) < 1e-6) continue;
      const qpx = a.x - cx;
      const qpz = a.z - cz;
      const t = (qpx * sz - qpz * sx) / denom;
      const u = (qpx * dz - qpz * dx) / denom;
      if (t > 0 && u >= -0.005 && u <= 1.005) {
        bestT = Math.max(bestT, t);
      }
    }
    return { x: cx + dx * bestT, z: cz + dz * bestT };
  };

  const steps = 28;
  const bot = [];
  const top = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    bot.push(sampleRay(lowRing, a));
    top.push(sampleRay(upRing, a));
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vOff = 0;

  for (let i = 0; i < steps; i++) {
    const next = (i + 1) % steps;
    const p0 = { x: bot[i].x, y: y0, z: bot[i].z };
    const p1 = { x: bot[next].x, y: y0, z: bot[next].z };
    const p2 = { x: top[next].x, y: y1, z: top[next].z };
    const p3 = { x: top[i].x, y: y1, z: top[i].z };

    const ux = p1.x - p0.x;
    const uy = p1.y - p0.y;
    const uz = p1.z - p0.z;
    const vx = p2.x - p0.x;
    const vy = p2.y - p0.y;
    const vz = p2.z - p0.z;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
    vOff += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'SectionTransitionCollar';
  mesh.userData = { layer: 'structure', materialRole: matRole };
  return mesh;
}

export function buildSectionTransitionMesh(lowerSec, upperSec, batcher, materials, cfg) {
  if (!lowerSec || !upperSec) return null;
  const lowRing = getSectionRingXZ(lowerSec, 1);
  const upRing = getSectionRingXZ(upperSec, 0);
  if (lowRing.length < 3 || upRing.length < 3) return null;

  const joinY = upperSec.baseElevation;
  const mode = upperSec.transitionMode || 'setback';
  const diag = upperSec.transitionDiagnostics || {};
  let collarMesh = null;

  // 1. Lofted sloped collar for tapered transitions between distinct shapes or sizes
  if (mode === 'tapered' || mode === 'stepped') {
    const collarH = mode === 'tapered' ? 1.5 : 0.75;
    collarMesh = buildLoftedCollarMesh(lowRing, upRing, joinY - 0.15, joinY + collarH, materials.framing || materials.trim, 'framing');
  }

  // 2. Cantilever transfer collar & diagonal structural knee braces for intentional overhangs
  if (mode === 'supported_cantilever' || mode === 'outward_expansion' || diag.needsCantileverSupport) {
    const braceDrop = Math.min(lowerSec.height * 0.55, 5.2);
    const seen = new Set();
    for (let i = 0; i < upRing.length; i++) {
      const v = upRing[i];
      const outDist = distanceOutsidePolygon2D(v, lowRing);
      if (outDist > 0.55) {
        const key = `${Math.round(v.x * 0.5)},${Math.round(v.z * 0.5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const anchor = closestPointOnRing2D(v, lowRing).pt;
        batcher.addBeam(
          [anchor.x, joinY - braceDrop, anchor.z],
          [v.x * 0.96 + anchor.x * 0.04, joinY - 0.1, v.z * 0.96 + anchor.z * 0.04],
          0.38,
          0.42,
          'framing',
          'facade'
        );
      }
    }
    // Transfer belt around base of upper section
    for (let i = 0; i < upRing.length; i++) {
      const a = upRing[i];
      const b = upRing[(i + 1) % upRing.length];
      batcher.addBeam([a.x, joinY + 0.18, a.z], [b.x, joinY + 0.18, b.z], 0.5, 0.58, 'framing', 'facade');
    }
  }

  // 3. Open transition structural collar (transfer portal columns & truss ring)
  if (mode === 'open_transition') {
    const step = Math.max(1, Math.floor(upRing.length / 8));
    for (let i = 0; i < upRing.length; i += step) {
      const a = upRing[i];
      const b = upRing[(i + 1) % upRing.length];
      batcher.addBeam([a.x, joinY, a.z], [a.x, joinY + 3.2, a.z], 0.52, 0.52, 'framing', 'facade');
      batcher.addBeam([a.x, joinY + 3.1, a.z], [b.x, joinY + 3.1, b.z], 0.42, 0.46, 'trim', 'facade');
    }
  }

  // 4. Terrace coping & greenery planters on stepped setback ledges
  if (cfg.terracePlanters || cfg.style === 'terraced_garden') {
    for (let i = 0; i < lowRing.length; i++) {
      const a = lowRing[i];
      const b = lowRing[(i + 1) % lowRing.length];
      const mid = { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
      if (distanceOutsidePolygon2D(mid, upRing) > 0.75) {
        const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
        if (edgeLen < 2.2) continue;
        const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
        batcher.addBox(mid.x, joinY + 0.28, mid.z, Math.min(edgeLen * 0.65, 8.5), 0.56, 0.85, yaw, 'trim', 'facade');
        batcher.addBox(mid.x, joinY + 0.76, mid.z, Math.min(edgeLen * 0.58, 7.6), 0.46, 0.62, yaw, 'crown', 'facade');
      }
    }
  }

  return collarMesh;
}
