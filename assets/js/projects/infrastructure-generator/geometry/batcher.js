import { infraPolygonArea2D, infraVec3Cross, infraVec3Norm } from '../utils.js';

function geoComputeNormal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return infraVec3Norm(infraVec3Cross(u, v), [0, 1, 0]);
}

const GEO_BOX_FACES = [
  { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];

// Batched BufferGeometry accumulator keyed by chunk|layer|materialKey|surfaceStratum.
// Emits standard THREE.Mesh groups (100% compatible with Three.js r128 GLTFExporter).
export class InfraBatcher {
  constructor(chunkSizeMeters = 128) {
    this.chunkSize = chunkSizeMeters;
    this.buckets = new Map();
    this.partCount = 0;
  }

  _chunkForPos(p) {
    const cx = Math.floor((p[0] || 0) / this.chunkSize);
    const cz = Math.floor((p[2] || 0) / this.chunkSize);
    return `${cx}_${cz}`;
  }

  _getBucket(layer, materialKey, surfaceStratum = 'structure', chunkId = '0_0', expectUpwardNormals = false) {
    const key = `${chunkId}|${layer}|${materialKey}|${surfaceStratum}|${expectUpwardNormals ? 'up' : 'any'}`;
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        key,
        chunkId,
        layer,
        materialKey,
        surfaceStratum,
        expectUpwardNormals,
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
        vertexOffset: 0
      });
    }
    return this.buckets.get(key);
  }

  addTri(p0, p1, p2, options = {}) {
    const layer = options.layer || 'LayerA_PrimaryStructure';
    const materialKey = options.materialKey || 'asphalt';
    const surfaceStratum = options.surfaceStratum || 'structure';
    const chunkId = options.chunkId || this._chunkForPos(p0);
    const n = options.normal || geoComputeNormal(p0, p1, p2);
    const uv0 = options.uv0 || [0, 0];
    const uv1 = options.uv1 || [1, 0];
    const uv2 = options.uv2 || [0, 1];

    const b = this._getBucket(layer, materialKey, surfaceStratum, chunkId, Boolean(options.expectUpwardNormals));
    const base = b.vertexOffset;
    b.positions.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    b.normals.push(n[0], n[1], n[2], n[0], n[1], n[2], n[0], n[1], n[2]);
    b.uvs.push(uv0[0], uv0[1], uv1[0], uv1[1], uv2[0], uv2[1]);
    b.indices.push(base, base + 1, base + 2);
    b.vertexOffset += 3;
    this.partCount += 1;
  }

  addQuad(p0, p1, p2, p3, options = {}) {
    const layer = options.layer || 'LayerA_PrimaryStructure';
    const materialKey = options.materialKey || 'asphalt';
    const surfaceStratum = options.surfaceStratum || 'structure';
    const chunkId = options.chunkId || this._chunkForPos(p0);
    const n = options.normal || geoComputeNormal(p0, p1, p2);
    const uvs = options.uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];

    const b = this._getBucket(layer, materialKey, surfaceStratum, chunkId, Boolean(options.expectUpwardNormals));
    const base = b.vertexOffset;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(n[0], n[1], n[2]);
      b.uvs.push(uvs[i][0], uvs[i][1]);
    }
    b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    b.vertexOffset += 4;
    this.partCount += 1;
  }

  addBoxOriented(center, tangent, right, up, w, h, d, options = {}) {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    const toWorld = (lx, ly, lz) => [
      center[0] + right[0] * (lx * w) + up[0] * (ly * h) + tangent[0] * (lz * d),
      center[1] + right[1] * (lx * w) + up[1] * (ly * h) + tangent[1] * (lz * d),
      center[2] + right[2] * (lx * w) + up[2] * (ly * h) + tangent[2] * (lz * d)
    ];

    for (const face of GEO_BOX_FACES) {
      const pts = face.c.map((v) => toWorld(v[0], v[1], v[2]));
      const n = infraVec3Norm([
        right[0] * face.n[0] + up[0] * face.n[1] + tangent[0] * face.n[2],
        right[1] * face.n[0] + up[1] * face.n[1] + tangent[1] * face.n[2],
        right[2] * face.n[0] + up[2] * face.n[1] + tangent[2] * face.n[2]
      ]);
      this.addQuad(pts[0], pts[1], pts[2], pts[3], {
        ...options,
        normal: n,
        uvs: [[0, 0], [1, 0], [1, 1], [0, 1]]
      });
    }
  }

  addCylinderY(cx, yBottom, cz, rBottom, rTop, height, segments = 8, options = {}) {
    if (height <= 0.001) return;
    const segs = Math.max(5, segments);
    const yTop = yBottom + height;

    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const b0 = [cx + c0 * rBottom, yBottom, cz + s0 * rBottom];
      const b1 = [cx + c1 * rBottom, yBottom, cz + s1 * rBottom];
      const t1 = [cx + c1 * rTop, yTop, cz + s1 * rTop];
      const t0 = [cx + c0 * rTop, yTop, cz + s0 * rTop];

      // Outward CCW around +Y: (b0, t0, t1, b1)
      this.addQuad(b0, t0, t1, b1, {
        ...options,
        uvs: [[i / segs, 0], [i / segs, 1], [(i + 1) / segs, 1], [(i + 1) / segs, 0]]
      });
    }
  }

  // Triangulates a simple 2D XZ polygon on horizontal plane y with guaranteed +Y upward normal.
  addHorizontalPolygonXZ(polyXZ, y, options = {}) {
    if (!Array.isArray(polyXZ) || polyXZ.length < 3) return;
    const uvScale = options.uvScale || 0.25;

    // Deduplicate adjacent near-identical vertices
    const pts = [];
    for (const p of polyXZ) {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-4) {
        pts.push([p[0], p[1]]);
      }
    }
    if (pts.length >= 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4) {
      pts.pop();
    }
    if (pts.length < 3) return;

    // In XZ, area2D > 0 means CCW in (x, z) plane, whose (a, c, b) cross has +Y normal!
    const area = infraPolygonArea2D(pts);
    const ordered = area >= 0 ? pts : pts.slice().reverse();

    const indices = [];
    const remaining = ordered.map((_, idx) => idx);
    const pointInTri = (p, a, b, c) => {
      const cross = (p1, p2, p3) => (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
      const c1 = cross(a, b, p);
      const c2 = cross(b, c, p);
      const c3 = cross(c, a, p);
      return c1 >= -1e-6 && c2 >= -1e-6 && c3 >= -1e-6;
    };

    let guard = 0;
    while (remaining.length > 3 && guard < 1000) {
      guard += 1;
      let earFound = false;
      const n = remaining.length;
      for (let i = 0; i < n; i++) {
        const prevIdx = remaining[(i - 1 + n) % n];
        const currIdx = remaining[i];
        const nextIdx = remaining[(i + 1) % n];
        const a = ordered[prevIdx];
        const b = ordered[currIdx];
        const c = ordered[nextIdx];
        const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (cross <= 1e-7) continue;

        let containsOther = false;
        for (let k = 0; k < n; k++) {
          const testIdx = remaining[k];
          if (testIdx === prevIdx || testIdx === currIdx || testIdx === nextIdx) continue;
          if (pointInTri(ordered[testIdx], a, b, c)) {
            containsOther = true;
            break;
          }
        }
        if (!containsOther) {
          // Reverse vertex order (a, c, b) so cross((c-a), (b-a)) points strictly +Y!
          indices.push([prevIdx, nextIdx, currIdx]);
          remaining.splice(i, 1);
          earFound = true;
          break;
        }
      }
      if (!earFound) break;
    }

    if (remaining.length === 3) {
      indices.push([remaining[0], remaining[2], remaining[1]]);
    }

    for (const [i0, i1, i2] of indices) {
      const a = ordered[i0];
      const b = ordered[i1];
      const c = ordered[i2];
      this.addTri([a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], {
        ...options,
        normal: [0, 1, 0],
        expectUpwardNormals: true,
        uv0: [a[0] * uvScale, a[1] * uvScale],
        uv1: [b[0] * uvScale, b[1] * uvScale],
        uv2: [c[0] * uvScale, c[1] * uvScale]
      });
    }
  }

  buildLayerGroups(resolveMaterial) {
    const layerA = new THREE.Group();
    layerA.name = 'LayerA_PrimaryStructure';
    const layerB = new THREE.Group();
    layerB.name = 'LayerB_StructuralSupports';
    const layerC = new THREE.Group();
    layerC.name = 'LayerC_MarkingsAndSurface';

    let meshCount = 0;
    let triangleCount = 0;

    for (const b of this.buckets.values()) {
      if (b.indices.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2));
      geo.setIndex(b.indices);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      const mat = resolveMaterial(b.materialKey);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `InfraMesh_${b.chunkId}_${b.materialKey}`;
      mesh.castShadow = b.layer === 'LayerB_StructuralSupports' || b.surfaceStratum !== 'top_surface';
      mesh.receiveShadow = true;
      mesh.userData = {
        layer: b.layer,
        materialKey: b.materialKey,
        surfaceStratum: b.surfaceStratum,
        expectUpwardNormals: b.expectUpwardNormals
      };

      meshCount += 1;
      triangleCount += Math.floor(b.indices.length / 3);

      if (b.layer === 'LayerB_StructuralSupports') layerB.add(mesh);
      else if (b.layer === 'LayerC_MarkingsAndSurface') layerC.add(mesh);
      else layerA.add(mesh);
    }

    return {
      layerA,
      layerB,
      layerC,
      stats: {
        meshCount,
        drawCalls: meshCount,
        triangleCount,
        partCount: this.partCount
      }
    };
  }
}
