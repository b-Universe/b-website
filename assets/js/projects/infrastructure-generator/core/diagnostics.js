import { INFRA_DEFAULTS } from '../config.js';
import { infraClipPoly2D, infraPolygonArea2D, infraRound } from '../utils.js';
import { infraFindNode, infraGetAttachedEdges } from './network-graph.js';
import { infraCheckPortCompatibility } from './ports.js';
import { infraListValidators } from './registry.js';

export function infraRunCoreDiagnostics(doc, solved) {
  const issues = [];
  const { sampledEdgesById, profilesByEdgeId, edgePortsById, junctions, crossings, supports } = solved;

  // 1. Validate edges (grade, curve radius, length, port elevation deltas at connected nodes)
  for (const edge of doc.edges || []) {
    const samp = sampledEdgesById.get(edge.id);
    const prof = profilesByEdgeId.get(edge.id);
    if (!samp) {
      issues.push({
        id: `diag_missing_samp_${edge.id}`,
        severity: 'error',
        category: 'geometry',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Edge ${edge.id} references missing endpoint node`
      });
      continue;
    }

    if (samp.lengthMeters < 1.5) {
      issues.push({
        id: `diag_short_${edge.id}`,
        severity: 'warning',
        category: 'geometry',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Segment ${edge.id} is very short (${infraRound(samp.lengthMeters, 2)}m)`
      });
    }

    const isRail = edge.domain === 'rail';
    const isTramOrMono = edge.domain === 'tram' || edge.domain === 'monorail' || edge.domain === 'suspended_rail';
    const maxGrade = isRail
      ? INFRA_DEFAULTS.maxRailGradeRatio
      : isTramOrMono
        ? INFRA_DEFAULTS.maxTramGradeRatio
        : edge.familyId === 'pedestrian' && edge.params?.pedestrianType === 'stairs_corridor'
          ? 0.85
          : edge.familyId === 'pedestrian' && edge.params?.pedestrianType === 'ada_ramp'
            ? 0.125
            : INFRA_DEFAULTS.maxRoadGradeRatio;
    const minRadius = isRail
      ? INFRA_DEFAULTS.minRailCurveRadiusMeters
      : isTramOrMono
        ? INFRA_DEFAULTS.minTramCurveRadiusMeters
        : INFRA_DEFAULTS.minRoadCurveRadiusMeters;

    if (samp.maxGradeRatio > maxGrade) {
      issues.push({
        id: `diag_grade_${edge.id}`,
        severity: edge.familyId === 'pedestrian' && edge.params?.pedestrianType === 'ada_ramp' ? 'error' : 'warning',
        category: 'structural',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Segment ${edge.id} grade ${(samp.maxGradeRatio * 100).toFixed(1)}% exceeds gameplay target ${(maxGrade * 100).toFixed(1)}%`
      });
    }

    if (samp.minCurveRadiusMeters !== null && samp.minCurveRadiusMeters < minRadius) {
      issues.push({
        id: `diag_curve_${edge.id}`,
        severity: 'warning',
        category: 'geometry',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Segment ${edge.id} minimum curve radius ${samp.minCurveRadiusMeters}m is tighter than ${minRadius}m`
      });
    }

    // Check suspended hanging vehicle bottom clearance above ground level y=0
    if (edge.domain === 'suspended_rail' || edge.elevationMode === 'suspended') {
      const dropH = Number(edge.params?.hangingDropMeters) || INFRA_DEFAULTS.suspendedHangingDropMeters;
      const minGuidewayY = Math.min(...samp.frames.map((f) => f.position[1]));
      const bottomClearance = minGuidewayY - dropH;
      if (bottomClearance < INFRA_DEFAULTS.suspendedMinStreetClearanceMeters - 1e-3) {
        issues.push({
          id: `diag_susp_clear_${edge.id}`,
          severity: 'error',
          category: 'clearance',
          targetKind: 'edge',
          targetId: edge.id,
          message: `Suspended envelope bottom (${infraRound(bottomClearance, 2)}m) clears ground by less than ${INFRA_DEFAULTS.suspendedMinStreetClearanceMeters}m`
        });
      }
    }

    // Check unsupported span on elevated or suspended decks (skip self-supporting bridges / skybridge towers)
    const hasIntegratedSpan =
      edge.familyId === 'bridges' ||
      edge.familyId === 'utilities' ||
      edge.familyId === 'tunnels' ||
      edge.familyId === 'waterways' ||
      edge.familyId === 'pedestrian';
    if (!hasIntegratedSpan && (edge.elevationMode === 'elevated' || edge.elevationMode === 'suspended')) {
      const edgeSupports = (supports || []).filter((s) => s.edgeId === edge.id);
      if (samp.trimmedLengthMeters > INFRA_DEFAULTS.maxUnsupportedRoadSpanMeters && edgeSupports.length === 0) {
        issues.push({
          id: `diag_nosupp_${edge.id}`,
          severity: 'error',
          category: 'structural',
          targetKind: 'edge',
          targetId: edge.id,
          message: `Elevated/suspended segment ${edge.id} (${infraRound(samp.trimmedLengthMeters, 1)}m) has no structural supports`
        });
      }
    }

    // Run extensible domain validators registered in core/registry.js
    const validators = infraListValidators(edge.domain);
    for (const v of validators) {
      const extra = v.validate({ edge, sampled: samp, profile: prof, doc });
      if (Array.isArray(extra)) issues.push(...extra);
    }
  }

  // 2. Validate port compatibility across shared nodes (degree == 2 splice checks)
  for (const node of doc.nodes || []) {
    const attached = infraGetAttachedEdges(doc, node.id);
    if (attached.length === 2) {
      const eA = attached[0];
      const eB = attached[1];
      const pSetA = edgePortsById.get(eA.id);
      const pSetB = edgePortsById.get(eB.id);
      const portA = eA.startNodeId === node.id ? pSetA?.startPort : pSetA?.endPort;
      const portB = eB.startNodeId === node.id ? pSetB?.startPort : pSetB?.endPort;
      const compat = infraCheckPortCompatibility(portA, portB, {
        allowElevationModeTransition: true
      });
      if (!compat.compatible) {
        issues.push({
          id: `diag_port_${node.id}`,
          severity: 'error',
          category: 'network',
          targetKind: 'node',
          targetId: node.id,
          message: `Incompatible connection at ${node.id}: ${compat.reasons.join('; ')}`
        });
      }
    }
  }

  // 3. Validate junctions (report unsupported or clamped junctions clearly)
  for (const junc of junctions || []) {
    if (junc.geometryStatus === 'unsupported_reported') {
      issues.push({
        id: `diag_junc_${junc.nodeId}`,
        severity: 'warning',
        category: 'network',
        targetKind: 'node',
        targetId: junc.nodeId,
        message: `Intersection ${junc.nodeId} deferred (${junc.statusReason}) — pulled back without overlapping slabs`
      });
    } else if (junc.geometryStatus === 'constrained_warning') {
      issues.push({
        id: `diag_junc_warn_${junc.nodeId}`,
        severity: 'warning',
        category: 'geometry',
        targetKind: 'node',
        targetId: junc.nodeId,
        message: `Intersection ${junc.nodeId}: ${junc.statusReason}`
      });
    }
  }

  // 4. Validate 3D crossings (non-connecting overpasses, level rail-road crossings vs illegal same-level overlaps)
  for (const cross of crossings || []) {
    if (cross.crossingKind === 'at_grade_rail_road') {
      continue;
    }
    if (cross.crossingKind === 'unconnected_overlap') {
      issues.push({
        id: `diag_cross_overlap_${cross.id}`,
        severity: 'error',
        category: 'network',
        targetKind: 'edge',
        targetId: cross.upperEdgeId,
        message: `Edges ${cross.upperEdgeId} & ${cross.lowerEdgeId} cross at same level without a junction node`
      });
    } else if (!cross.valid) {
      issues.push({
        id: `diag_cross_clear_${cross.id}`,
        severity: 'error',
        category: 'structural',
        targetKind: 'edge',
        targetId: cross.upperEdgeId,
        message: `Insufficient vertical clearance (${cross.verticalClearanceMeters}m < ${cross.requiredClearanceMeters}m) where ${cross.upperEdgeId} crosses over ${cross.lowerEdgeId}`
      });
    }
  }

  // 5. Validate supports (grounded & clear of lower travel lanes)
  for (const supp of supports || []) {
    if (!supp.clearOfCrossings) {
      issues.push({
        id: `diag_supp_lane_${supp.id}`,
        severity: 'error',
        category: 'structural',
        targetKind: 'edge',
        targetId: supp.edgeId,
        message: `Support ${supp.id} on ${supp.edgeId} encroaches on a lower road clearance envelope`
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return {
    status: errorCount > 0 ? 'errors' : (warningCount > 0 ? 'warnings' : 'valid'),
    errorCount,
    warningCount,
    issues
  };
}

// Audits generated Three.js geometry for NaNs, degenerate triangles, inverted deck normals,
// and coplanar XZ z-fighting overlap across distinct surface owners/materials.
export function infraAuditThreeGeometry(root) {
  const report = {
    valid: true,
    meshCount: 0,
    triangleCount: 0,
    nanCount: 0,
    degenerateCount: 0,
    invertedHorizontalCount: 0,
    coplanarOverlapCount: 0,
    maxOverlapAreaMeters2: 0,
    coplanarSamples: []
  };

  if (!root) return report;

  const horizontalTris = [];

  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    if (obj.userData?.layer === 'LayerE_DebugAndContext') return;

    report.meshCount += 1;
    const geo = obj.geometry;
    const pos = geo.attributes?.position;
    const norm = geo.attributes?.normal;
    if (!pos) return;

    const index = geo.index;
    const triTotal = index ? Math.floor(index.count / 3) : Math.floor(pos.count / 3);
    report.triangleCount += triTotal;

    const getV = (idx) => [pos.getX(idx), pos.getY(idx), pos.getZ(idx)];
    const getN = (idx) => (norm ? [norm.getX(idx), norm.getY(idx), norm.getZ(idx)] : [0, 1, 0]);

    for (let t = 0; t < triTotal; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const a = getV(i0);
      const b = getV(i1);
      const c = getV(i2);
      const n0 = getN(i0);

      if (
        !Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
        !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2]) ||
        !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !Number.isFinite(c[2])
      ) {
        report.nanCount += 1;
        continue;
      }

      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const uz = b[2] - a[2];
      const vx = c[0] - a[0];
      const vy = c[1] - a[1];
      const vz = c[2] - a[2];
      const cx = uy * vz - uz * vy;
      const cy = uz * vx - ux * vz;
      const cz = ux * vy - uy * vx;
      const area2 = Math.hypot(cx, cy, cz);

      if (area2 < 1e-6) {
        report.degenerateCount += 1;
        continue;
      }

      const ny = cy / area2;
      // Top road/sidewalk surfaces with upward normal metadata should face upward
      if (obj.userData?.expectUpwardNormals && ny < -0.5) {
        report.invertedHorizontalCount += 1;
      }

      // Collect near-horizontal upward surfaces for coplanar overlap detection
      if (Math.abs(ny) > 0.85 && ny > 0 && obj.userData?.surfaceStratum === 'top_surface') {
        const avgY = (a[1] + b[1] + c[1]) / 3;
        const minX = Math.min(a[0], b[0], c[0]);
        const maxX = Math.max(a[0], b[0], c[0]);
        const minZ = Math.min(a[2], b[2], c[2]);
        const maxZ = Math.max(a[2], b[2], c[2]);
        horizontalTris.push({
          meshUuid: obj.uuid,
          materialKey: obj.userData?.materialKey || obj.name,
          avgY,
          minX,
          maxX,
          minZ,
          maxZ,
          polyXZ: [
            [a[0], a[2]],
            [b[0], b[2]],
            [c[0], c[2]]
          ],
          normalLen: Math.hypot(n0[0], n0[1], n0[2])
        });
      }
    }
  });

  // Spatial 2m grid hash for fast exact polygon overlap auditing
  const cellSize = 2.0;
  const grid = new Map();
  for (let i = 0; i < horizontalTris.length; i++) {
    const tr = horizontalTris[i];
    const gx0 = Math.floor(tr.minX / cellSize);
    const gx1 = Math.floor(tr.maxX / cellSize);
    const gz0 = Math.floor(tr.minZ / cellSize);
    const gz1 = Math.floor(tr.maxZ / cellSize);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const key = `${gx},${gz}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
    }
  }

  const testedPairs = new Set();
  for (const list of grid.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const idxA = list[i];
        const idxB = list[j];
        const pairKey = idxA < idxB ? `${idxA}:${idxB}` : `${idxB}:${idxA}`;
        if (testedPairs.has(pairKey)) continue;
        testedPairs.add(pairKey);

        const A = horizontalTris[idxA];
        const B = horizontalTris[idxB];
        if (Math.abs(A.avgY - B.avgY) > 0.015) continue;
        if (A.maxX <= B.minX + 1e-4 || B.maxX <= A.minX + 1e-4 || A.maxZ <= B.minZ + 1e-4 || B.maxZ <= A.minZ + 1e-4) {
          continue;
        }

        const clipped = infraClipPoly2D(A.polyXZ, B.polyXZ);
        if (clipped.length >= 3) {
          const area = Math.abs(infraPolygonArea2D(clipped));
          if (area > 0.01) {
            report.coplanarOverlapCount += 1;
            if (area > report.maxOverlapAreaMeters2) {
              report.maxOverlapAreaMeters2 = infraRound(area, 4);
            }
            if (report.coplanarSamples.length < 5) {
              report.coplanarSamples.push({
                areaMeters2: infraRound(area, 4),
                yA: infraRound(A.avgY, 4),
                yB: infraRound(B.avgY, 4),
                matA: A.materialKey,
                matB: B.materialKey
              });
            }
          }
        }
      }
    }
  }

  report.valid =
    report.nanCount === 0 &&
    report.degenerateCount === 0 &&
    report.invertedHorizontalCount === 0 &&
    report.coplanarOverlapCount === 0;

  return report;
}
