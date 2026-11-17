import { colorHex, degToRad } from '../utils.js';

export function skyRoot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

export function skyBox(parent, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.002 || h <= 0.002 || d <= 0.002) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotY) mesh.rotation.y = options.rotY;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'structure',
    materialRole: options.materialRole || 'primary'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function skyCylinder(parent, x, y, z, rTop, rBottom, h, material, sides = 12, options = {}) {
  if (h <= 0.002) return null;
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'roof',
    materialRole: options.materialRole || 'crown'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function skySignboard(parent, text, w, h, bgHex = '#19222d', fgHex = '#e6f6ff', options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorHex(bgHex, '#19222d');
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = colorHex(fgHex, '#e6f6ff');
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = colorHex(fgHex, '#e6f6ff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(text || 'Skyscraper').slice(0, 28);
    let size = 48;
    ctx.font = `bold ${size}px Arial`;
    while (size > 18 && ctx.measureText(label).width > 460) {
      size -= 2;
      ctx.font = `bold ${size}px Arial`;
    }
    ctx.fillText(label, 256, 65);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = 0.09;
  face.userData = { layer: 'ground', materialRole: 'signFace', _tex: tex };
  const backing = skyBox(parent, 0, 0, 0, w + 0.16, h + 0.16, 0.15, options.frameMaterial, {
    layer: 'ground',
    materialRole: 'trim'
  });
  parent.add(face);
  return backing;
}

const BOX_FACES = [
  // +X
  { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  // -X
  { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  // +Y
  { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  // -Y
  { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  // +Z
  { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  // -Z
  { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];

export class SkyscraperBatcher {
  constructor() {
    this.buckets = new Map();
    this.instanceCount = 0;
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

  addBox(cx, cy, cz, w, h, d, yawRad = 0, materialRole = 'primary', layer = 'facade', uvScale = 1) {
    if (w <= 0.002 || h <= 0.002 || d <= 0.002) return;
    const b = this._getBucket(layer, materialRole);
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    this.instanceCount++;

    for (let f = 0; f < 6; f++) {
      const face = BOX_FACES[f];
      const nx = face.n[0] * cosY + face.n[2] * sinY;
      const ny = face.n[1];
      const nz = -face.n[0] * sinY + face.n[2] * cosY;
      const baseV = b.vertexOffset;

      for (let i = 0; i < 4; i++) {
        const lx = face.c[i][0] * w;
        const ly = face.c[i][1] * h;
        const lz = face.c[i][2] * d;
        const wx = cx + lx * cosY + lz * sinY;
        const wy = cy + ly;
        const wz = cz - lx * sinY + lz * cosY;
        b.positions.push(wx, wy, wz);
        b.normals.push(nx, ny, nz);
      }

      const uMax = (f < 2 ? d : w) * 0.25 * uvScale;
      const vMax = (f === 2 || f === 3 ? d : h) * 0.25 * uvScale;
      b.uvs.push(0, 0, uMax, 0, uMax, vMax, 0, vMax);
      b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
      b.vertexOffset += 4;
    }
  }

  addQuad(p0, p1, p2, p3, normal, materialRole = 'primary', layer = 'facade') {
    const b = this._getBucket(layer, materialRole);
    const baseV = b.vertexOffset;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(normal[0], normal[1], normal[2]);
    }
    const uLen = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) * 0.25;
    const vLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) * 0.25;
    b.uvs.push(0, 0, uLen, 0, uLen, vLen, 0, vLen);
    b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
    b.vertexOffset += 4;
    this.instanceCount++;
  }

  addBeam(a, bPt, halfWidth = 0.22, halfDepth = 0.22, materialRole = 'framing', layer = 'facade') {
    const dx = bPt[0] - a[0];
    const dy = bPt[1] - a[1];
    const dz = bPt[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len <= 0.01) return;

    const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    const upRef = Math.abs(dir.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(upRef, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();

    const pA = new THREE.Vector3(a[0], a[1], a[2]);
    const pB = new THREE.Vector3(bPt[0], bPt[1], bPt[2]);
    const offsets = [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [halfWidth, halfDepth],
      [-halfWidth, halfDepth]
    ];
    const ringA = offsets.map(([ox, oy]) => {
      const v = pA.clone().addScaledVector(right, ox).addScaledVector(up, oy);
      return [v.x, v.y, v.z];
    });
    const ringB = offsets.map(([ox, oy]) => {
      const v = pB.clone().addScaledVector(right, ox).addScaledVector(up, oy);
      return [v.x, v.y, v.z];
    });

    const sideNormals = [
      up.clone().negate(),
      right.clone(),
      up.clone(),
      right.clone().negate()
    ];

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const n = sideNormals[i];
      this.addQuad(ringA[i], ringA[next], ringB[next], ringB[i], [n.x, n.y, n.z], materialRole, layer);
    }
    this.addQuad(ringA[3], ringA[2], ringA[1], ringA[0], [-dir.x, -dir.y, -dir.z], materialRole, layer);
    this.addQuad(ringB[0], ringB[1], ringB[2], ringB[3], [dir.x, dir.y, dir.z], materialRole, layer);
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
      mesh.name = `SkyscraperBatch_${bucket.layer}_${bucket.materialRole}`;
      mesh.userData = {
        layer: bucket.layer,
        materialRole: bucket.materialRole,
        batchedCount: this.instanceCount
      };
      parentGroup.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}
