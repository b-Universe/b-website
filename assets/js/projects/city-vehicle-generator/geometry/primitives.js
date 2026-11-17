import { colorHex, degToRad } from '../utils.js';

export function vehRoot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

export function vehBox(parent, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.002 || h <= 0.002 || d <= 0.002) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotX) mesh.rotation.x = options.rotX;
  if (options.rotY) mesh.rotation.y = options.rotY;
  if (options.rotZ) mesh.rotation.z = options.rotZ;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'body',
    materialRole: options.materialRole || 'primary'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function vehCylinder(parent, x, y, z, rTop, rBottom, h, material, sides = 12, options = {}) {
  if (h <= 0.002) return null;
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotX) mesh.rotation.x = options.rotX;
  if (options.rotY) mesh.rotation.y = options.rotY;
  if (options.rotZ) mesh.rotation.z = options.rotZ;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'wheel',
    materialRole: options.materialRole || 'tire'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function vehSignboard(parent, text, w, h, bgHex = '#f3d163', fgHex = '#181c22', options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorHex(bgHex, '#f3d163');
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = colorHex(fgHex, '#181c22');
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = colorHex(fgHex, '#181c22');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(text || 'City Transit').slice(0, 28);
    let size = 46;
    ctx.font = `bold ${size}px Arial`;
    while (size > 18 && ctx.measureText(label).width > 464) {
      size -= 2;
      ctx.font = `bold ${size}px Arial`;
    }
    ctx.fillText(label, 256, 65);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const faceMat = options.lit
    ? new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff', emissive: colorHex(bgHex, '#f3d163'), emissiveIntensity: 0.45 })
    : new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });

  const grp = vehRoot(parent, options.x || 0, options.y || 0, options.z || 0);
  if (options.rotY) grp.rotation.y = options.rotY;

  const backing = vehBox(grp, 0, 0, 0, w + 0.04, h + 0.04, options.depth || 0.14, options.frameMaterial, {
    layer: options.layer || 'detail',
    materialRole: options.frameRole || 'trim'
  });

  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = (options.depth || 0.14) * 0.5 + 0.004;
  face.userData = { layer: options.layer || 'detail', materialRole: 'signFace', _tex: tex, _ownedMat: true };
  grp.add(face);

  if (options.doubleSided) {
    const backFace = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
    backFace.position.z = -((options.depth || 0.14) * 0.5 + 0.004);
    backFace.rotation.y = Math.PI;
    backFace.userData = { layer: options.layer || 'detail', materialRole: 'signFace' };
    grp.add(backFace);
  }

  return backing;
}

export function vehLicensePlate(parent, plateCode, w, h, x, y, z, rotY = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f2ede0';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#2d5c8a';
    ctx.fillRect(0, 0, 256, 22);
    ctx.strokeStyle = '#1b2028';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B City', 128, 12);
    ctx.fillStyle = '#161b22';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(String(plateCode || 'B-101-RS').slice(0, 10), 128, 60);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.018), mat);
  plateMesh.position.set(x, y, z);
  if (rotY) plateMesh.rotation.y = rotY;
  plateMesh.castShadow = false;
  plateMesh.receiveShadow = true;
  plateMesh.userData = {
    layer: 'detail',
    materialRole: 'plateFace',
    _tex: tex,
    _ownedMat: true
  };
  if (parent) parent.add(plateMesh);
  return plateMesh;
}

const BOX_FACES = [
  { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];

function computeTriNormal(a, b, c) {
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

function rotatePointXYZ(px, py, pz, rx, ry, rz) {
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

export class VehicleBatcher {
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

  addBox(cx, cy, cz, w, h, d, options = {}) {
    if (w <= 0.002 || h <= 0.002 || d <= 0.002) return;
    const materialRole = options.materialRole || 'primary';
    const layer = options.layer || 'body';
    const uvScale = options.uvScale || 1;
    const rx = options.rotX || degToRad(options.rotXDeg || 0);
    const ry = options.rotY || degToRad(options.rotYDeg || 0);
    const rz = options.rotZ || degToRad(options.rotZDeg || 0);
    const b = this._getBucket(layer, materialRole);
    this.partCount++;

    for (let f = 0; f < 6; f++) {
      const face = BOX_FACES[f];
      const [nx, ny, nz] = rotatePointXYZ(face.n[0], face.n[1], face.n[2], rx, ry, rz);
      const baseV = b.vertexOffset;

      for (let i = 0; i < 4; i++) {
        const lx = face.c[i][0] * w;
        const ly = face.c[i][1] * h;
        const lz = face.c[i][2] * d;
        const [rxp, ryp, rzp] = rotatePointXYZ(lx, ly, lz, rx, ry, rz);
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

  addTri(p0, p1, p2, normal = null, materialRole = 'primary', layer = 'body') {
    const b = this._getBucket(layer, materialRole);
    const n = normal || computeTriNormal(p0, p1, p2);
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
    const n = normal || computeTriNormal(p0, p1, p2);
    const baseV = b.vertexOffset;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(n[0], n[1], n[2]);
    }
    const uLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) * 0.5;
    const vLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) * 0.5;
    b.uvs.push(0, 0, uLen, 0, uLen, vLen, 0, vLen);
    b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
    b.vertexOffset += 4;
    this.partCount++;
  }

  addCylinder(cx, cy, cz, rTop, rBottom, h, sides = 12, axis = 'y', materialRole = 'tire', layer = 'wheel', rotY = 0) {
    if (h <= 0.002 || (rTop <= 0.001 && rBottom <= 0.001)) return;
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
        const [rx, ry, rz] = rotatePointXYZ(ox, oy, oz, 0, rotY, 0);
        return [cx + rx, cy + ry, cz + rz];
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

    if (rTop > 0.002) {
      const topCenter = toWorld(0, halfH, 0);
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        this.addTri(topCenter, ringTop[next], ringTop[i], null, materialRole, layer);
      }
    }

    if (rBottom > 0.002) {
      const botCenter = toWorld(0, -halfH, 0);
      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        this.addTri(botCenter, ringBot[i], ringBot[next], null, materialRole, layer);
      }
    }
  }

  addLoftedSlices(slices, materialRole = 'primary', layer = 'body', options = {}) {
    if (!Array.isArray(slices) || slices.length < 2) return;
    const rings = slices.map((s) => {
      const z = s.z;
      const yBot = s.bottomY;
      const yTop = Math.max(yBot + 0.02, s.topY);
      const yBelt = Math.max(yBot + 0.01, Math.min(yTop - 0.01, s.beltY));
      const hwBot = Math.max(0.05, s.hwBottom);
      const hwBelt = Math.max(0.05, s.hwBelt);
      const hwTop = Math.max(0.05, s.hwTop);
      const cB = Math.min(s.chamferBot ?? 0.04, (yBelt - yBot) * 0.45, hwBelt * 0.45);
      const cT = Math.min(s.chamferTop ?? 0.04, (yTop - yBelt) * 0.45, hwTop * 0.45);
      const hwB0 = Math.max(0.03, hwBot - cB);
      const hwT0 = Math.max(0.03, hwTop - cT);
      return [
        [hwB0, yBot, z],
        [hwBelt, yBot + cB, z],
        [hwBelt, yBelt, z],
        [hwTop, yTop - cT, z],
        [hwT0, yTop, z],
        [-hwT0, yTop, z],
        [-hwTop, yTop - cT, z],
        [-hwBelt, yBelt, z],
        [-hwBelt, yBot + cB, z],
        [-hwB0, yBot, z]
      ];
    });

    const ringLen = rings[0].length;
    for (let si = 0; si < rings.length - 1; si++) {
      const rA = rings[si];
      const rB = rings[si + 1];
      if (Math.abs(slices[si + 1].z - slices[si].z) < 0.001) continue;
      for (let k = 0; k < ringLen; k++) {
        const next = (k + 1) % ringLen;
        this.addQuad(rA[k], rA[next], rB[next], rB[k], null, materialRole, layer);
      }
    }

    if (options.capRear !== false) {
      const r0 = rings[0];
      const c0 = [0, (slices[0].bottomY + slices[0].topY) * 0.5, slices[0].z];
      for (let k = 0; k < ringLen; k++) {
        const next = (k + 1) % ringLen;
        this.addTri(c0, r0[next], r0[k], [0, 0, -1], materialRole, layer);
      }
    }

    if (options.capFront !== false) {
      const rN = rings[rings.length - 1];
      const sN = slices[slices.length - 1];
      const cN = [0, (sN.bottomY + sN.topY) * 0.5, sN.z];
      for (let k = 0; k < ringLen; k++) {
        const next = (k + 1) % ringLen;
        this.addTri(cN, rN[k], rN[next], [0, 0, 1], materialRole, layer);
      }
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
      mesh.name = `VehicleBatch_${bucket.layer}_${bucket.materialRole}`;
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
