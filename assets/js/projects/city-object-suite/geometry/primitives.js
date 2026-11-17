import { degToRad } from '../utils.js';
import { getObjectLabelMaterial, getObjectDecalMaterial, getObjectScreenMaterial } from '../materials/materials.js';

const OBJ_BOX_FACES = [
  { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];

function primComputeTriNormal(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len > 1e-6) {
    nx /= len;
    ny /= len;
    nz /= len;
  } else {
    nx = 0;
    ny = 1;
    nz = 0;
  }
  return [nx, ny, nz];
}

function primRotateXYZ(px, py, pz, rx, ry, rz) {
  let x = px;
  let y = py;
  let z = pz;
  if (rx) {
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const ny = y * cx - z * sx;
    const nz = y * sx + z * cx;
    y = ny;
    z = nz;
  }
  if (ry) {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const nx = x * cy + z * sy;
    const nz = -x * sy + z * cy;
    x = nx;
    z = nz;
  }
  if (rz) {
    const cz = Math.cos(rz);
    const sz = Math.sin(rz);
    const nx = x * cz - y * sz;
    const ny = x * sz + y * cz;
    x = nx;
    y = ny;
  }
  return [x, y, z];
}

function primOrthoBasis(dx, dy, dz) {
  const len = Math.hypot(dx, dy, dz) || 1;
  const tx = dx / len;
  const ty = dy / len;
  const tz = dz / len;
  let ux = 0;
  let uy = 1;
  let uz = 0;
  if (Math.abs(ty) > 0.92) {
    ux = 1;
    uy = 0;
    uz = 0;
  }
  let bx = uy * tz - uz * ty;
  let by = uz * tx - ux * tz;
  let bz = ux * ty - uy * tx;
  const blen = Math.hypot(bx, by, bz) || 1;
  bx /= blen;
  by /= blen;
  bz /= blen;
  const nx = ty * bz - tz * by;
  const ny = tz * bx - tx * bz;
  const nz = tx * by - ty * bx;
  return {
    t: [tx, ty, tz],
    b: [bx, by, bz],
    n: [nx, ny, nz]
  };
}

export class ObjectBatcher {
  constructor() {
    this.buckets = new Map();
    this.partCount = 0;
  }

  _getBucket(layer, materialRole) {
    const key = `${layer}|${materialRole}`;
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        layer,
        materialRole,
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
        vertexOffset: 0
      });
    }
    return this.buckets.get(key);
  }

  addTri(p0, p1, p2, normal = null, materialRole = 'primary', layer = 'body') {
    const b = this._getBucket(layer, materialRole);
    const n = normal || primComputeTriNormal(p0, p1, p2);
    const baseV = b.vertexOffset;
    const pts = [p0, p1, p2];
    for (let i = 0; i < 3; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(n[0], n[1], n[2]);
    }
    b.uvs.push(0, 0, 0.5, 0, 0.25, 0.5);
    b.indices.push(baseV, baseV + 1, baseV + 2);
    b.vertexOffset += 3;
    this.partCount++;
  }

  addQuad(p0, p1, p2, p3, normal = null, materialRole = 'primary', layer = 'body') {
    const b = this._getBucket(layer, materialRole);
    const n = normal || primComputeTriNormal(p0, p1, p2);
    const baseV = b.vertexOffset;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(n[0], n[1], n[2]);
    }
    const uLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) * 0.6;
    const vLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) * 0.6;
    b.uvs.push(0, 0, uLen, 0, uLen, vLen, 0, vLen);
    b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
    b.vertexOffset += 4;
    this.partCount++;
  }

  addBox(cx, cy, cz, w, h, d, options = {}) {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    const materialRole = options.materialRole || 'primary';
    const layer = options.layer || 'body';
    const uvScale = options.uvScale || 1;
    const rx = options.rotX || degToRad(options.rotXDeg || 0);
    const ry = options.rotY || degToRad(options.rotYDeg || 0);
    const rz = options.rotZ || degToRad(options.rotZDeg || 0);
    const b = this._getBucket(layer, materialRole);
    this.partCount++;

    for (let f = 0; f < 6; f++) {
      const face = OBJ_BOX_FACES[f];
      const [nx, ny, nz] = primRotateXYZ(face.n[0], face.n[1], face.n[2], rx, ry, rz);
      const baseV = b.vertexOffset;
      for (let i = 0; i < 4; i++) {
        const lx = face.c[i][0] * w;
        const ly = face.c[i][1] * h;
        const lz = face.c[i][2] * d;
        const [rxp, ryp, rzp] = primRotateXYZ(lx, ly, lz, rx, ry, rz);
        b.positions.push(cx + rxp, cy + ryp, cz + rzp);
        b.normals.push(nx, ny, nz);
      }
      const uMax = (f < 2 ? d : w) * 0.5 * uvScale;
      const vMax = (f === 2 || f === 3 ? d : h) * 0.5 * uvScale;
      b.uvs.push(0, 0, uMax, 0, uMax, vMax, 0, vMax);
      b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
      b.vertexOffset += 4;
    }
  }

  addChamferBox(cx, cy, cz, w, h, d, chamfer = 0.03, options = {}) {
    if (w <= 0.002 || h <= 0.002 || d <= 0.002) return;
    const c = Math.max(0.003, Math.min(chamfer, w * 0.25, h * 0.25, d * 0.25));
    const materialRole = options.materialRole || 'primary';
    const layer = options.layer || 'body';
    const rx = options.rotX || degToRad(options.rotXDeg || 0);
    const ry = options.rotY || degToRad(options.rotYDeg || 0);
    const rz = options.rotZ || degToRad(options.rotZDeg || 0);

    const hw = w * 0.5;
    const hh = h * 0.5;
    const hd = d * 0.5;
    const iw = hw - c;
    const id = hd - c;

    const ringPts = (y, scaleXZ = 1) => {
      const ow = hw * scaleXZ;
      const od = hd * scaleXZ;
      const kw = Math.max(0.001, iw * scaleXZ);
      const kd = Math.max(0.001, id * scaleXZ);
      const pts = [
        [kw, y, od],
        [ow, y, kd],
        [ow, y, -kd],
        [kw, y, -od],
        [-kw, y, -od],
        [-ow, y, -kd],
        [-ow, y, kd],
        [-kw, y, od]
      ];
      return pts.map((p) => {
        const r = primRotateXYZ(p[0], p[1], p[2], rx, ry, rz);
        return [cx + r[0], cy + r[1], cz + r[2]];
      });
    };

    const yLevels = [
      { y: -hh, s: Math.max(0.35, (hw - c) / hw) },
      { y: -hh + c, s: 1 },
      { y: hh - c, s: 1 },
      { y: hh, s: Math.max(0.35, (hw - c) / hw) }
    ];
    const rings = yLevels.map((lv) => ringPts(lv.y, lv.s));

    for (let rIdx = 0; rIdx < rings.length - 1; rIdx++) {
      const rA = rings[rIdx];
      const rB = rings[rIdx + 1];
      for (let i = 0; i < 8; i++) {
        const next = (i + 1) % 8;
        this.addQuad(rA[i], rA[next], rB[next], rB[i], null, materialRole, layer);
      }
    }

    const botRot = primRotateXYZ(0, -hh, 0, rx, ry, rz);
    const topRot = primRotateXYZ(0, hh, 0, rx, ry, rz);
    const cBot = [cx + botRot[0], cy + botRot[1], cz + botRot[2]];
    const cTop = [cx + topRot[0], cy + topRot[1], cz + topRot[2]];
    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8;
      this.addTri(cBot, rings[0][next], rings[0][i], null, materialRole, layer);
      this.addTri(cTop, rings[3][i], rings[3][next], null, materialRole, layer);
    }
  }

  addTrapezoidBox(cx, cy, cz, wBot, dBot, wTop, dTop, h, options = {}) {
    if (h <= 0.002) return;
    const materialRole = options.materialRole || 'primary';
    const layer = options.layer || 'body';
    const rx = options.rotX || degToRad(options.rotXDeg || 0);
    const ry = options.rotY || degToRad(options.rotYDeg || 0);
    const rz = options.rotZ || degToRad(options.rotZDeg || 0);
    const hh = h * 0.5;
    const hbW = Math.max(0.002, wBot * 0.5);
    const hbD = Math.max(0.002, dBot * 0.5);
    const htW = Math.max(0.002, wTop * 0.5);
    const htD = Math.max(0.002, dTop * 0.5);
    const shiftZ = options.topOffsetZ || 0;
    const shiftX = options.topOffsetX || 0;

    const xf = (x, y, z) => {
      const r = primRotateXYZ(x, y, z, rx, ry, rz);
      return [cx + r[0], cy + r[1], cz + r[2]];
    };

    const bot = [
      xf(-hbW, -hh, hbD),
      xf(hbW, -hh, hbD),
      xf(hbW, -hh, -hbD),
      xf(-hbW, -hh, -hbD)
    ];
    const top = [
      xf(-htW + shiftX, hh, htD + shiftZ),
      xf(htW + shiftX, hh, htD + shiftZ),
      xf(htW + shiftX, hh, -htD + shiftZ),
      xf(-htW + shiftX, hh, -htD + shiftZ)
    ];

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      this.addQuad(bot[i], bot[next], top[next], top[i], null, materialRole, layer);
    }
    if (options.capBottom !== false) {
      this.addQuad(bot[3], bot[2], bot[1], bot[0], null, materialRole, layer);
    }
    if (options.capTop !== false) {
      this.addQuad(top[0], top[1], top[2], top[3], null, materialRole, layer);
    }
  }

  addCylinder(cx, cy, cz, rTop, rBottom, h, sides = 12, axis = 'y', materialRole = 'secondary', layer = 'body', rotY = 0) {
    if (h <= 0.001 || (rTop <= 0.0005 && rBottom <= 0.0005)) return;
    const halfH = h * 0.5;
    const ringTop = [];
    const ringBot = [];

    const toWorld = (lx, ly, lz) => {
      let ox = lx;
      let oy = ly;
      let oz = lz;
      if (axis === 'x') {
        ox = ly;
        oy = lz;
        oz = lx;
      } else if (axis === 'z') {
        ox = lx;
        oy = -lz;
        oz = ly;
      }
      if (rotY) {
        const r = primRotateXYZ(ox, oy, oz, 0, rotY, 0);
        return [cx + r[0], cy + r[1], cz + r[2]];
      }
      return [cx + ox, cy + oy, cz + oz];
    };

    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ringTop.push(toWorld(ca * rTop, halfH, sa * rTop));
      ringBot.push(toWorld(ca * rBottom, -halfH, sa * rBottom));
    }

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      this.addQuad(ringBot[next], ringBot[i], ringTop[i], ringTop[next], null, materialRole, layer);
    }

    if (rTop > 0.001) {
      const topCenter = toWorld(0, halfH, 0);
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        this.addTri(topCenter, ringTop[next], ringTop[i], null, materialRole, layer);
      }
    }

    if (rBottom > 0.001) {
      const botCenter = toWorld(0, -halfH, 0);
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        this.addTri(botCenter, ringBot[i], ringBot[next], null, materialRole, layer);
      }
    }
  }

  addCone(cx, cy, cz, radius, h, sides = 12, materialRole = 'secondary', layer = 'body', axis = 'y') {
    this.addCylinder(cx, cy, cz, 0.001, radius, h, sides, axis, materialRole, layer);
  }

  addPrismRing(cx, cy, cz, outerR, innerR, h, sides = 12, axis = 'y', materialRole = 'frame', layer = 'body') {
    if (h <= 0.001 || outerR <= innerR + 0.001) return;
    const halfH = h * 0.5;
    const toWorld = (lx, ly, lz) => {
      if (axis === 'x') return [cx + ly, cy + lz, cz + lx];
      if (axis === 'z') return [cx + lx, cy - lz, cz + ly];
      return [cx + lx, cy + ly, cz + lz];
    };

    const oTop = [];
    const oBot = [];
    const iTop = [];
    const iBot = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      oTop.push(toWorld(ca * outerR, halfH, sa * outerR));
      oBot.push(toWorld(ca * outerR, -halfH, sa * outerR));
      iTop.push(toWorld(ca * innerR, halfH, sa * innerR));
      iBot.push(toWorld(ca * innerR, -halfH, sa * innerR));
    }

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      this.addQuad(oBot[next], oBot[i], oTop[i], oTop[next], null, materialRole, layer);
      this.addQuad(iBot[i], iBot[next], iTop[next], iTop[i], null, materialRole, layer);
      this.addQuad(oTop[next], oTop[i], iTop[i], iTop[next], null, materialRole, layer);
      this.addQuad(iBot[next], iBot[i], oBot[i], oBot[next], null, materialRole, layer);
    }
  }

  addPipeSegment(x0, y0, z0, x1, y1, z1, radius = 0.05, sides = 10, materialRole = 'secondary', layer = 'body', capEnds = true) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dy, dz);
    if (len <= 0.002 || radius <= 0.001) return;

    const basis = primOrthoBasis(dx, dy, dz);
    const ring0 = [];
    const ring1 = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ca = Math.cos(a) * radius;
      const sa = Math.sin(a) * radius;
      const ox = basis.b[0] * ca + basis.n[0] * sa;
      const oy = basis.b[1] * ca + basis.n[1] * sa;
      const oz = basis.b[2] * ca + basis.n[2] * sa;
      ring0.push([x0 + ox, y0 + oy, z0 + oz]);
      ring1.push([x1 + ox, y1 + oy, z1 + oz]);
    }

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      this.addQuad(ring0[next], ring0[i], ring1[i], ring1[next], null, materialRole, layer);
    }

    if (capEnds) {
      const c0 = [x0, y0, z0];
      const c1 = [x1, y1, z1];
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        this.addTri(c0, ring0[i], ring0[next], null, materialRole, layer);
        this.addTri(c1, ring1[next], ring1[i], null, materialRole, layer);
      }
    }
  }

  addPipeElbow(cx, cy, cz, pipeRadius = 0.05, bendRadius = 0.14, startDir = [0, 1, 0], endDir = [1, 0, 0], materialRole = 'secondary', layer = 'body') {
    const r = Math.max(pipeRadius * 1.15, bendRadius);
    const s = startDir;
    const e = endDir;
    const steps = 4;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = t * Math.PI * 0.5;
      const px = cx - s[0] * r * (1 - Math.sin(a)) + e[0] * r * (1 - Math.cos(a));
      const py = cy - s[1] * r * (1 - Math.sin(a)) + e[1] * r * (1 - Math.cos(a));
      const pz = cz - s[2] * r * (1 - Math.sin(a)) + e[2] * r * (1 - Math.cos(a));
      pts.push([px, py, pz]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      this.addPipeSegment(
        pts[i][0], pts[i][1], pts[i][2],
        pts[i + 1][0], pts[i + 1][1], pts[i + 1][2],
        pipeRadius * 1.08,
        10,
        materialRole,
        layer,
        true
      );
    }
  }

  addFlangeAndBolts(cx, cy, cz, pipeRadius = 0.06, axis = 'y', materialRole = 'frame', boltRole = 'secondary') {
    const flangeR = pipeRadius * 1.55;
    const flangeH = Math.max(0.02, pipeRadius * 0.42);
    this.addCylinder(cx, cy, cz, flangeR, flangeR, flangeH, 10, axis, materialRole, 'detail');
    const boltOffset = pipeRadius * 1.28;
    const boltR = Math.max(0.008, pipeRadius * 0.15);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const c = Math.cos(a) * boltOffset;
      const s = Math.sin(a) * boltOffset;
      if (axis === 'y') {
        this.addCylinder(cx + c, cy, cz + s, boltR, boltR, flangeH * 1.45, 6, 'y', boltRole, 'detail');
      } else if (axis === 'x') {
        this.addCylinder(cx, cy + c, cz + s, boltR, boltR, flangeH * 1.45, 6, 'x', boltRole, 'detail');
      } else {
        this.addCylinder(cx + c, cy + s, cz, boltR, boltR, flangeH * 1.45, 6, 'z', boltRole, 'detail');
      }
    }
  }

  addValveWheel(cx, cy, cz, wheelRadius = 0.09, stemLen = 0.08, axis = 'z', wheelRole = 'accent', stemRole = 'frame') {
    const dir = axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1];
    const wx = cx + dir[0] * stemLen;
    const wy = cy + dir[1] * stemLen;
    const wz = cz + dir[2] * stemLen;
    this.addPipeSegment(cx, cy, cz, wx, wy, wz, Math.max(0.012, wheelRadius * 0.18), 8, stemRole, 'detail');
    this.addPrismRing(wx, wy, wz, wheelRadius, wheelRadius * 0.72, Math.max(0.018, wheelRadius * 0.22), 10, axis, wheelRole, 'detail');
    this.addCylinder(wx, wy, wz, wheelRadius * 0.25, wheelRadius * 0.25, Math.max(0.022, wheelRadius * 0.26), 8, axis, stemRole, 'detail');
    const spokeW = Math.max(0.01, wheelRadius * 0.14);
    if (axis === 'z') {
      this.addBox(wx, wy, wz, wheelRadius * 1.7, spokeW, spokeW, { materialRole: wheelRole, layer: 'detail' });
      this.addBox(wx, wy, wz, spokeW, wheelRadius * 1.7, spokeW, { materialRole: wheelRole, layer: 'detail' });
    } else if (axis === 'x') {
      this.addBox(wx, wy, wz, spokeW, wheelRadius * 1.7, spokeW, { materialRole: wheelRole, layer: 'detail' });
      this.addBox(wx, wy, wz, spokeW, spokeW, wheelRadius * 1.7, { materialRole: wheelRole, layer: 'detail' });
    } else {
      this.addBox(wx, wy, wz, wheelRadius * 1.7, spokeW, spokeW, { materialRole: wheelRole, layer: 'detail' });
      this.addBox(wx, wy, wz, spokeW, spokeW, wheelRadius * 1.7, { materialRole: wheelRole, layer: 'detail' });
    }
  }

  addSlattedArray(cx, cy, cz, totalSpan, slatCount, slatW, slatH, slatD, axis = 'z', materialRole = 'wood', layer = 'body', rotX = 0) {
    const count = Math.max(1, Math.round(slatCount));
    const step = count > 1 ? totalSpan / (count - 1) : 0;
    const start = -totalSpan * 0.5;
    for (let i = 0; i < count; i++) {
      const offset = start + i * step;
      if (axis === 'x') {
        this.addBox(cx + offset, cy, cz, slatW, slatH, slatD, { materialRole, layer, rotX });
      } else if (axis === 'y') {
        this.addBox(cx, cy + offset, cz, slatW, slatH, slatD, { materialRole, layer, rotX });
      } else {
        this.addBox(cx, cy, cz + offset, slatW, slatH, slatD, { materialRole, layer, rotX });
      }
    }
  }

  addLouverGrille(cx, cy, cz, w, h, bladeCount = 5, faceAxis = 'z', materialRole = 'frame', layer = 'detail') {
    const count = Math.max(2, Math.round(bladeCount));
    const frameT = 0.018;
    if (faceAxis === 'x') {
      this.addBox(cx, cy, cz, 0.02, h, w, { materialRole: 'darkMetal', layer });
      this.addBox(cx + 0.008, cy + h * 0.5, cz, 0.025, frameT, w, { materialRole, layer });
      this.addBox(cx + 0.008, cy - h * 0.5, cz, 0.025, frameT, w, { materialRole, layer });
      for (let i = 0; i < count; i++) {
        const y = cy - h * 0.38 + (i / (count - 1)) * h * 0.76;
        this.addBox(cx + 0.012, y, cz, 0.022, 0.014, w * 0.88, { materialRole, layer, rotZDeg: -22 });
      }
    } else {
      this.addBox(cx, cy, cz, w, h, 0.02, { materialRole: 'darkMetal', layer });
      this.addBox(cx, cy + h * 0.5, cz + 0.008, w, frameT, 0.025, { materialRole, layer });
      this.addBox(cx, cy - h * 0.5, cz + 0.008, w, frameT, 0.025, { materialRole, layer });
      for (let i = 0; i < count; i++) {
        const y = cy - h * 0.38 + (i / (count - 1)) * h * 0.76;
        this.addBox(cx, y, cz + 0.012, w * 0.88, 0.014, 0.022, { materialRole, layer, rotXDeg: 22 });
      }
    }
  }

  addSupportLegs(cx, bottomY, topY, spanX, spanZ, legThickness = 0.06, materialRole = 'frame', cz = 0) {
    const h = Math.max(0.02, topY - bottomY);
    const cy = bottomY + h * 0.5;
    const hx = spanX * 0.5;
    const hz = spanZ * 0.5;
    const corners = [
      [-hx, -hz],
      [hx, -hz],
      [-hx, hz],
      [hx, hz]
    ];
    for (const [ox, oz] of corners) {
      this.addBox(cx + ox, cy, cz + oz, legThickness, h, legThickness, { materialRole, layer: 'body' });
      this.addBox(cx + ox, bottomY + 0.012, cz + oz, legThickness * 1.45, 0.024, legThickness * 1.45, { materialRole, layer: 'detail' });
    }
  }

  addCasterWheels(cx, bottomY, spanX, spanZ, wheelRadius = 0.075, tireRole = 'rubber', frameRole = 'frame', cz = 0) {
    const hx = spanX * 0.5;
    const hz = spanZ * 0.5;
    const wheelW = Math.max(0.03, wheelRadius * 0.55);
    const corners = [
      [-hx, -hz],
      [hx, -hz],
      [-hx, hz],
      [hx, hz]
    ];
    for (const [ox, oz] of corners) {
      this.addCylinder(cx + ox, bottomY + wheelRadius, cz + oz, wheelRadius, wheelRadius, wheelW, 10, 'x', tireRole, 'body');
      this.addCylinder(cx + ox, bottomY + wheelRadius, cz + oz, wheelRadius * 0.42, wheelRadius * 0.42, wheelW + 0.01, 8, 'x', frameRole, 'detail');
      this.addBox(cx + ox, bottomY + wheelRadius * 1.85, cz + oz, wheelW * 1.3, wheelRadius * 0.65, wheelRadius * 1.1, { materialRole: frameRole, layer: 'detail' });
    }
  }

  addDrawerStack(cx, bottomY, cz, w, totalH, d, drawerCount = 3, options = {}) {
    const count = Math.max(1, Math.min(12, Math.round(drawerCount)));
    const bodyRole = options.bodyRole || 'primary';
    const frontRole = options.frontRole || 'secondary';
    const handleRole = options.handleRole || 'metal';
    const faceDir = options.faceDir === -1 ? -1 : 1;
    const handleStyle = options.handleStyle || 'bar';
    const gap = 0.012;
    const usableH = Math.max(0.08, totalH - gap * (count + 1));
    const drawerH = usableH / count;

    this.addBox(cx, bottomY + totalH * 0.5, cz, w, totalH, d, { materialRole: bodyRole, layer: 'body' });
    const frontZ = cz + faceDir * (d * 0.5 + 0.008);
    const handleZ = frontZ + faceDir * 0.016;
    const faceW = Math.max(0.06, w - 0.036);
    const handleW = Math.min(faceW * 0.42, 0.16);

    for (let i = 0; i < count; i++) {
      const dy = bottomY + gap + drawerH * 0.5 + i * (drawerH + gap);
      this.addBox(cx, dy, frontZ, faceW, Math.max(0.03, drawerH - 0.006), 0.018, { materialRole: frontRole, layer: 'detail' });
      if (handleStyle === 'knob') {
        this.addCylinder(cx, dy, handleZ, 0.011, 0.011, 0.018, 8, 'z', handleRole, 'detail');
      } else if (handleStyle === 'recessed') {
        this.addBox(cx, dy + drawerH * 0.24, frontZ + faceDir * 0.009, handleW, 0.014, 0.008, { materialRole: handleRole, layer: 'detail' });
      } else {
        this.addBox(cx, dy, handleZ, handleW, 0.014, 0.016, { materialRole: handleRole, layer: 'detail' });
      }
    }
  }

  addPedestalPost(cx, bottomY, cz, baseRadius = 0.22, postRadius = 0.04, postH = 0.9, options = {}) {
    const baseRole = options.baseRole || 'frame';
    const postRole = options.postRole || 'metal';
    const baseH = options.baseH || 0.028;
    const collarH = options.collarH || 0.035;
    const sides = options.sides || 12;

    this.addCylinder(cx, bottomY + baseH * 0.5, cz, baseRadius, baseRadius * 0.9, baseH, sides, 'y', baseRole, 'body');
    const usablePostH = Math.max(0.06, postH - baseH);
    this.addCylinder(cx, bottomY + baseH + usablePostH * 0.5, cz, postRadius, postRadius * 0.94, usablePostH, sides, 'y', postRole, 'body');
    if (options.includeCollar !== false) {
      this.addCylinder(cx, bottomY + baseH + collarH * 0.5, cz, postRadius * 1.45, postRadius * 1.25, collarH, sides, 'y', baseRole, 'detail');
    }
  }

  finalize(parentGroup, materialBundle, options = {}) {
    const meshes = [];
    for (const bucket of this.buckets.values()) {
      if (bucket.indices.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
      geo.setIndex(bucket.indices);
      geo.computeBoundingSphere();
      const mat = materialBundle[bucket.materialRole] || materialBundle.primary;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = options.castShadow !== false;
      mesh.receiveShadow = options.receiveShadow !== false;
      mesh.name = `ObjBatch_${bucket.layer}_${bucket.materialRole}`;
      mesh.userData = {
        layer: bucket.layer,
        materialRole: bucket.materialRole,
        batchedCount: this.partCount
      };
      parentGroup.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}

export function objCreateSignPlane(parent, text, w, h, bgHex = '#f2f4f7', fgHex = '#192028', options = {}) {
  const mat = getObjectLabelMaterial(text, bgHex, fgHex, { lit: Boolean(options.lit) });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.set(options.x || 0, options.y || 0, options.z || 0);
  if (options.rotX) plane.rotation.x = options.rotX;
  if (options.rotY) plane.rotation.y = options.rotY;
  if (options.rotZ) plane.rotation.z = options.rotZ;
  plane.name = options.name || 'ObjectSignFace';
  plane.userData = {
    layer: options.layer || 'detail',
    materialRole: 'signFace'
  };
  if (parent) parent.add(plane);

  if (options.doubleSided) {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const offset = options.backOffset || 0.02;
    back.position.set(
      (options.x || 0) - Math.sin(options.rotY || 0) * offset,
      options.y || 0,
      (options.z || 0) - Math.cos(options.rotY || 0) * offset
    );
    back.rotation.y = (options.rotY || 0) + Math.PI;
    back.name = `${plane.name}_Back`;
    back.userData = { layer: options.layer || 'detail', materialRole: 'signFace' };
    if (parent) parent.add(back);
  }
  return plane;
}

export function objCreateGroundDecal(parent, style, w, d, primaryHex, secondaryHex, seed = 101, opacity = 0.85, options = {}) {
  const mat = getObjectDecalMaterial(style, primaryHex, secondaryHex, seed, opacity);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mat);
  mesh.position.set(options.x || 0, options.y !== undefined ? options.y : 0.008, options.z || 0);
  if (options.rotX) mesh.rotation.x = options.rotX;
  if (options.rotY) mesh.rotation.y = options.rotY;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = options.name || `SurfaceDecal_${style}`;
  mesh.userData = {
    layer: 'decal',
    materialRole: 'decalFace'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function objCreateScreenPlane(parent, screenMode, w, h, accentHex = '#4de2ff', condition = 'clean', seed = 101, options = {}) {
  const mat = getObjectScreenMaterial(screenMode, accentHex, condition, seed);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.set(options.x || 0, options.y || 0, options.z || 0);
  if (options.rotX) plane.rotation.x = options.rotX;
  if (options.rotY) plane.rotation.y = options.rotY;
  if (options.rotZ) plane.rotation.z = options.rotZ;
  plane.name = options.name || `ScreenFace_${screenMode}`;
  plane.userData = {
    layer: options.layer || 'detail',
    materialRole: 'screenFace',
    screenSurface: {
      role: options.role || 'display_screen',
      mode: String(screenMode || 'desktop_ui'),
      widthMeters: Number(Number(w).toFixed(4)),
      heightMeters: Number(Number(h).toFixed(4)),
      shape: options.shape || 'flat_lcd',
      isCurvedCRT: Boolean(options.isCurvedCRT)
    }
  };
  if (parent) parent.add(plane);
  return plane;
}

export function objCreateFramedMonitor(parent, batcher, x, y, z, w, h, options = {}) {
  const bezelDepth = options.depth || 0.032;
  const bezelColorRole = options.bezelRole || 'dark';
  const standRole = options.standRole || 'metal';
  const screenMode = options.screenMode || 'desktop_ui';
  const accentHex = options.accentHex || '#4de2ff';
  const condition = options.condition || 'clean';
  const seed = options.seed ?? 101;
  const screenCenterY = y + (options.includeStand === false ? 0 : (options.standH || 0.14) + h * 0.5);

  if (options.includeStand !== false && batcher) {
    const standH = options.standH || 0.14;
    batcher.addBox(x, y + 0.012, z - 0.02, Math.min(w * 0.45, 0.24), 0.024, 0.18, { materialRole: standRole, layer: 'detail' });
    batcher.addBox(x, y + standH * 0.5 + 0.012, z - bezelDepth * 0.6, 0.036, standH, 0.036, { materialRole: standRole, layer: 'detail' });
  }

  if (batcher) {
    batcher.addBox(x, screenCenterY, z, w, h, bezelDepth, { materialRole: bezelColorRole, layer: 'body' });
  }

  const faceZ = z + bezelDepth * 0.5 + 0.004;
  return objCreateScreenPlane(
    parent,
    screenMode,
    Math.max(0.08, w - 0.036),
    Math.max(0.06, h - 0.036),
    accentHex,
    condition,
    seed,
    { x, y: screenCenterY, z: faceZ, name: options.name || `FramedMonitor_${screenMode}` }
  );
}
