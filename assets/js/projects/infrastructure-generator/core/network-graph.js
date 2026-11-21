import {
  INFRA_BASE_BRIDGE_PARAMS,
  INFRA_BASE_ELEVATED_PARAMS,
  INFRA_BASE_FACILITY_PARAMS,
  INFRA_BASE_PEDESTRIAN_PARAMS,
  INFRA_BASE_RAIL_PARAMS,
  INFRA_BASE_ROAD_PARAMS,
  INFRA_BASE_TUNNEL_PARAMS,
  INFRA_BASE_UTILITY_PARAMS,
  INFRA_BASE_WATERWAY_PARAMS,
  INFRA_BLUEPRINT_SCHEMA_VERSION,
  INFRA_DEFAULTS
} from '../config.js';
import { infraClamp, infraCopy, infraRound, infraSegIntersect2D, infraVec2Dist, infraVec2Norm, infraVec3Lerp } from '../utils.js';
import { infraComputeEdgeVerticalEnvelope } from './clearances.js';

function netSnapshotState(doc) {
  return {
    id: doc.id,
    name: doc.name,
    seed: doc.seed,
    eraStyle: doc.eraStyle,
    workspaceMode: doc.workspaceMode,
    nextIds: infraCopy(doc.nextIds),
    nodes: infraCopy(doc.nodes),
    edges: infraCopy(doc.edges),
    selection: infraCopy(doc.selection)
  };
}

function netRestoreState(doc, snap) {
  doc.id = snap.id;
  doc.name = snap.name;
  doc.seed = snap.seed;
  doc.eraStyle = snap.eraStyle;
  doc.workspaceMode = snap.workspaceMode;
  doc.nextIds = infraCopy(snap.nextIds);
  doc.nodes = infraCopy(snap.nodes);
  doc.edges = infraCopy(snap.edges);
  doc.selection = infraCopy(snap.selection);
  infraRecomputeNodeKinds(doc);
}

export function infraExtractMaxNumericId(items = [], prefix = 'n_') {
  let maxId = 0;
  for (const item of items) {
    if (!item?.id) continue;
    const str = String(item.id);
    if (str.startsWith(prefix)) {
      const n = parseInt(str.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxId) maxId = n;
    }
  }
  return maxId;
}

export function infraRecomputeNodeKinds(doc) {
  if (!doc || !Array.isArray(doc.nodes)) return doc;
  const edgeCounts = new Map();
  const elevModes = new Map();
  const domainsMap = new Map();
  for (const node of doc.nodes) {
    edgeCounts.set(node.id, 0);
    elevModes.set(node.id, new Set());
    domainsMap.set(node.id, new Set());
  }
  for (const edge of doc.edges || []) {
    if (edgeCounts.has(edge.startNodeId)) {
      edgeCounts.set(edge.startNodeId, edgeCounts.get(edge.startNodeId) + 1);
      elevModes.get(edge.startNodeId).add(edge.elevationMode || 'grade');
      domainsMap.get(edge.startNodeId).add(edge.domain || 'road');
    }
    if (edgeCounts.has(edge.endNodeId)) {
      edgeCounts.set(edge.endNodeId, edgeCounts.get(edge.endNodeId) + 1);
      elevModes.get(edge.endNodeId).add(edge.elevationMode || 'grade');
      domainsMap.get(edge.endNodeId).add(edge.domain || 'road');
    }
  }
  for (const node of doc.nodes) {
    const count = edgeCounts.get(node.id) || 0;
    const modes = elevModes.get(node.id);
    const doms = domainsMap.get(node.id);
    if (doms && doms.size === 1) {
      node.domain = Array.from(doms)[0];
    }
    if (count >= 3) {
      if (node.domain === 'rail' || node.domain === 'tram') {
        node.kind = 'switch';
        node.params = node.params || {};
        if (!node.params.switchState) node.params.switchState = 'normal';
      } else {
        node.kind = 'junction';
      }
    } else if (count === 2) {
      node.kind = modes && modes.size > 1 ? 'elevation_transition' : 'connector';
    } else {
      node.kind = 'endpoint';
    }
  }
  return doc;
}

export function infraCreateNetworkDocument(options = {}) {
  const nodes = Array.isArray(options.nodes) ? infraCopy(options.nodes) : [];
  const edges = Array.isArray(options.edges) ? infraCopy(options.edges) : [];

  const doc = {
    schemaVersion: INFRA_BLUEPRINT_SCHEMA_VERSION,
    id: String(options.id || 'net_doc_1'),
    name: String(options.name || 'Untitled Infrastructure Network'),
    seed: Number.isFinite(Number(options.seed)) ? Number(options.seed) : 2026,
    eraStyle: options.eraStyle || 'modern_municipal',
    workspaceMode: options.workspaceMode || 'network',
    nextIds: {
      node: Math.max(Number(options.nextIds?.node) || 1, infraExtractMaxNumericId(nodes, 'n_') + 1),
      edge: Math.max(Number(options.nextIds?.edge) || 1, infraExtractMaxNumericId(edges, 'e_') + 1)
    },
    nodes,
    edges,
    selection: options.selection ? infraCopy(options.selection) : { kind: edges[0] ? 'edge' : 'none', id: edges[0]?.id || null },
    history: {
      undoStack: [],
      redoStack: [],
      maxDepth: 60
    }
  };

  infraRecomputeNodeKinds(doc);
  return doc;
}

export function infraFindNode(doc, nodeId) {
  return (doc?.nodes || []).find((n) => n.id === nodeId) || null;
}

export function infraFindEdge(doc, edgeId) {
  return (doc?.edges || []).find((e) => e.id === edgeId) || null;
}

export function infraGetAttachedEdges(doc, nodeId) {
  return (doc?.edges || []).filter((e) => e.startNodeId === nodeId || e.endNodeId === nodeId);
}

function netAllocNodeId(doc, requestedId = null) {
  if (requestedId && !infraFindNode(doc, requestedId)) return String(requestedId);
  const id = `n_${doc.nextIds.node}`;
  doc.nextIds.node += 1;
  return id;
}

function netAllocEdgeId(doc, requestedId = null) {
  if (requestedId && !infraFindEdge(doc, requestedId)) return String(requestedId);
  const id = `e_${doc.nextIds.edge}`;
  doc.nextIds.edge += 1;
  return id;
}

export function infraNormalizeEdge(rawEdge = {}, id = 'e_1') {
  const famHint =
    rawEdge.familyId ||
    (rawEdge.domain === 'rail' || rawEdge.domain === 'tram'
      ? 'railways'
      : rawEdge.domain === 'suspended_rail' || rawEdge.domain === 'monorail'
        ? 'elevated_transit'
        : rawEdge.domain === 'waterway'
          ? 'waterways'
          : rawEdge.domain === 'pedestrian'
            ? 'pedestrian'
            : rawEdge.domain === 'power' || rawEdge.domain === 'telecom' || rawEdge.domain === 'pipe' || rawEdge.domain === 'cableway'
              ? 'utilities'
              : rawEdge.domain === 'cycle'
                ? 'facilities'
                : rawEdge.elevationMode === 'underground'
                  ? 'tunnels'
                  : 'roads');
  const familyId = String(famHint);
  const baseByFam = {
    roads: INFRA_BASE_ROAD_PARAMS,
    railways: INFRA_BASE_RAIL_PARAMS,
    elevated_transit: INFRA_BASE_ELEVATED_PARAMS,
    bridges: INFRA_BASE_BRIDGE_PARAMS,
    pedestrian: INFRA_BASE_PEDESTRIAN_PARAMS,
    tunnels: INFRA_BASE_TUNNEL_PARAMS,
    waterways: INFRA_BASE_WATERWAY_PARAMS,
    utilities: INFRA_BASE_UTILITY_PARAMS,
    facilities: INFRA_BASE_FACILITY_PARAMS
  };
  const baseParams = baseByFam[familyId] || INFRA_BASE_ROAD_PARAMS;

  const defaultDomain =
    familyId === 'railways'
      ? 'rail'
      : familyId === 'elevated_transit'
        ? (rawEdge.params?.transitSystem === 'straddle_monorail' ? 'monorail' : rawEdge.params?.transitSystem === 'elevated_steel_metro' ? 'rail' : 'suspended_rail')
        : familyId === 'pedestrian'
          ? 'pedestrian'
          : familyId === 'waterways'
            ? 'waterway'
            : familyId === 'utilities'
              ? (rawEdge.params?.utilityType === 'pipe_rack_elevated' || rawEdge.params?.utilityType === 'industrial_pipeline' ? 'pipe' : rawEdge.params?.utilityType === 'telecom_trunk' ? 'telecom' : 'power')
              : familyId === 'facilities'
                ? (rawEdge.params?.facilityType === 'protected_bikeway' ? 'cycle' : 'road')
                : familyId === 'tunnels'
                  ? (rawEdge.params?.interiorMode === 'metro' || rawEdge.params?.interiorMode === 'rail' ? 'rail' : 'road')
                  : 'road';

  const defaultElev =
    familyId === 'elevated_transit'
      ? (defaultDomain === 'suspended_rail' ? 'suspended' : 'elevated')
      : familyId === 'bridges'
        ? 'elevated'
        : familyId === 'tunnels'
          ? 'underground'
          : familyId === 'utilities'
            ? (defaultDomain === 'pipe' ? 'grade' : 'aerial')
            : familyId === 'pedestrian' && rawEdge.params?.pedestrianType === 'skybridge'
              ? 'elevated'
              : 'grade';

  return {
    id: String(rawEdge.id || id),
    domain: String(rawEdge.domain || defaultDomain),
    familyId,
    presetId: String(rawEdge.presetId || rawEdge.params?.presetId || baseParams.presetId),
    startNodeId: String(rawEdge.startNodeId),
    endNodeId: String(rawEdge.endNodeId),
    elevationMode: rawEdge.elevationMode || defaultElev,
    curveType: rawEdge.curveType || 'line',
    curveBulge: Number.isFinite(Number(rawEdge.curveBulge)) ? Number(rawEdge.curveBulge) : 0,
    verticalProfile: rawEdge.verticalProfile || 'smooth',
    bankingStartRad: Number(rawEdge.bankingStartRad) || 0,
    bankingEndRad: Number(rawEdge.bankingEndRad) || 0,
    params: {
      ...infraCopy(baseParams),
      ...(rawEdge.params ? infraCopy(rawEdge.params) : {})
    },
    locks: Array.isArray(rawEdge.locks) ? [...rawEdge.locks] : []
  };
}

export function infraNormalizeNode(rawNode = {}, id = 'n_1') {
  const pos = Array.isArray(rawNode.position) ? rawNode.position : [0, 0, 0];
  return {
    id: String(rawNode.id || id),
    domain: String(rawNode.domain || 'road'),
    kind: rawNode.kind || 'endpoint',
    position: [infraRound(pos[0], 4), infraRound(pos[1], 4), infraRound(pos[2], 4)],
    elevationMode: rawNode.elevationMode || (Math.abs(pos[1]) > 0.75 ? 'elevated' : 'grade'),
    params: {
      cornerRadius: Number.isFinite(Number(rawNode.params?.cornerRadius)) ? Number(rawNode.params.cornerRadius) : INFRA_DEFAULTS.cornerRadiusMeters,
      includeCrosswalks: rawNode.params?.includeCrosswalks !== false,
      crosswalkDepth: Number.isFinite(Number(rawNode.params?.crosswalkDepth)) ? Number(rawNode.params.crosswalkDepth) : INFRA_DEFAULTS.crosswalkDepthMeters,
      ...(rawNode.params ? infraCopy(rawNode.params) : {})
    }
  };
}

export function infraCanUndo(doc) {
  return Boolean(doc?.history?.undoStack?.length);
}

export function infraCanRedo(doc) {
  return Boolean(doc?.history?.redoStack?.length);
}

export function infraUndo(doc) {
  if (!infraCanUndo(doc)) return { ok: false, reason: 'Nothing to undo' };
  const current = netSnapshotState(doc);
  const prev = doc.history.undoStack.pop();
  doc.history.redoStack.push(current);
  netRestoreState(doc, prev);
  return { ok: true };
}

export function infraRedo(doc) {
  if (!infraCanRedo(doc)) return { ok: false, reason: 'Nothing to redo' };
  const current = netSnapshotState(doc);
  const next = doc.history.redoStack.pop();
  doc.history.undoStack.push(current);
  netRestoreState(doc, next);
  return { ok: true };
}

export function infraExecuteCommand(doc, cmd) {
  if (!doc || !cmd || !cmd.type) {
    return { ok: false, reason: 'Invalid network command' };
  }

  const recordUndo = cmd.recordHistory !== false;
  const beforeSnap = recordUndo ? netSnapshotState(doc) : null;

  const commit = (result) => {
    if (!result.ok) return result;
    infraRecomputeNodeKinds(doc);
    if (recordUndo && beforeSnap) {
      doc.history.undoStack.push(beforeSnap);
      if (doc.history.undoStack.length > doc.history.maxDepth) {
        doc.history.undoStack.shift();
      }
      doc.history.redoStack.length = 0;
    }
    return result;
  };

  switch (cmd.type) {
    case 'ADD_NODE': {
      const id = netAllocNodeId(doc, cmd.node?.id);
      const node = infraNormalizeNode(cmd.node || { position: cmd.position || [0, 0, 0] }, id);
      doc.nodes.push(node);
      doc.selection = { kind: 'node', id: node.id };
      return commit({ ok: true, createdId: node.id, node });
    }

    case 'MOVE_NODE': {
      const node = infraFindNode(doc, cmd.nodeId);
      if (!node) return { ok: false, reason: `Node "${cmd.nodeId}" not found` };
      const pos = cmd.position || node.position;
      node.position = [infraRound(pos[0], 4), infraRound(pos[1], 4), infraRound(pos[2], 4)];
      if (cmd.elevationMode) {
        node.elevationMode = cmd.elevationMode;
      }
      return commit({ ok: true, node });
    }

    case 'UPDATE_NODE': {
      const node = infraFindNode(doc, cmd.nodeId);
      if (!node) return { ok: false, reason: `Node "${cmd.nodeId}" not found` };
      if (Array.isArray(cmd.position)) {
        node.position = [infraRound(cmd.position[0], 4), infraRound(cmd.position[1], 4), infraRound(cmd.position[2], 4)];
      }
      if (cmd.elevationMode) node.elevationMode = cmd.elevationMode;
      if (cmd.params && typeof cmd.params === 'object') {
        node.params = { ...node.params, ...infraCopy(cmd.params) };
      }
      return commit({ ok: true, node });
    }

    case 'DELETE_NODE': {
      const idx = doc.nodes.findIndex((n) => n.id === cmd.nodeId);
      if (idx === -1) return { ok: false, reason: `Node "${cmd.nodeId}" not found` };
      doc.nodes.splice(idx, 1);
      doc.edges = doc.edges.filter((e) => e.startNodeId !== cmd.nodeId && e.endNodeId !== cmd.nodeId);
      if (doc.selection?.id === cmd.nodeId) {
        doc.selection = doc.edges[0] ? { kind: 'edge', id: doc.edges[0].id } : { kind: 'none', id: null };
      }
      return commit({ ok: true });
    }

    case 'ADD_EDGE': {
      const startNode = infraFindNode(doc, cmd.startNodeId);
      const endNode = infraFindNode(doc, cmd.endNodeId);
      if (!startNode || !endNode) {
        return { ok: false, reason: 'ADD_EDGE requires valid startNodeId and endNodeId' };
      }
      if (startNode.id === endNode.id) {
        return { ok: false, reason: 'Cannot connect a node to itself' };
      }
      const duplicate = doc.edges.find(
        (e) =>
          (e.startNodeId === startNode.id && e.endNodeId === endNode.id) ||
          (e.startNodeId === endNode.id && e.endNodeId === startNode.id)
      );
      if (duplicate && !cmd.allowParallel) {
        return { ok: false, reason: `Edge "${duplicate.id}" already connects ${startNode.id} and ${endNode.id}` };
      }
      const id = netAllocEdgeId(doc, cmd.edge?.id);
      const edge = infraNormalizeEdge(
        {
          ...(cmd.edge || {}),
          startNodeId: startNode.id,
          endNodeId: endNode.id
        },
        id
      );
      doc.edges.push(edge);
      doc.selection = { kind: 'edge', id: edge.id };
      return commit({ ok: true, createdId: edge.id, edge });
    }

    case 'CONNECT_NODES': {
      let startNode = cmd.startNodeId ? infraFindNode(doc, cmd.startNodeId) : null;
      let endNode = cmd.endNodeId ? infraFindNode(doc, cmd.endNodeId) : null;
      if (!startNode && Array.isArray(cmd.startPosition)) {
        const nid = netAllocNodeId(doc);
        startNode = infraNormalizeNode({ position: cmd.startPosition, elevationMode: cmd.elevationMode || 'grade', domain: cmd.domain || 'road' }, nid);
        doc.nodes.push(startNode);
      }
      if (!endNode && Array.isArray(cmd.endPosition)) {
        const nid = netAllocNodeId(doc);
        endNode = infraNormalizeNode({ position: cmd.endPosition, elevationMode: cmd.elevationMode || 'grade', domain: cmd.domain || 'road' }, nid);
        doc.nodes.push(endNode);
      }
      if (!startNode || !endNode || startNode.id === endNode.id) {
        return { ok: false, reason: 'Invalid start/end nodes for CONNECT_NODES' };
      }
      const elevDelta = Math.abs((startNode.position[1] || 0) - (endNode.position[1] || 0));
      const mode = cmd.elevationMode || (startNode.position[1] > 0.75 && endNode.position[1] > 0.75 ? 'elevated' : 'grade');
      if (startNode.domain !== endNode.domain) {
        return { ok: false, reason: `Domain mismatch: ${startNode.domain} cannot connect to ${endNode.domain}` };
      }
      const eid = netAllocEdgeId(doc);
      const edge = infraNormalizeEdge(
        {
          domain: cmd.domain || 'road',
          familyId: cmd.familyId || 'roads',
          presetId: cmd.presetId || cmd.params?.presetId || 'residential_2lane',
          startNodeId: startNode.id,
          endNodeId: endNode.id,
          elevationMode: mode,
          curveType: cmd.curveType || (Math.abs(Number(cmd.curveBulge) || 0) > 0.05 ? 'arc' : 'line'),
          curveBulge: Number(cmd.curveBulge) || 0,
          params: cmd.params || {}
        },
        eid
      );
      doc.edges.push(edge);
      doc.selection = { kind: 'edge', id: edge.id };
      return commit({ ok: true, createdEdgeId: edge.id, startNodeId: startNode.id, endNodeId: endNode.id, elevDelta });
    }

    case 'UPDATE_EDGE': {
      const edge = infraFindEdge(doc, cmd.edgeId);
      if (!edge) return { ok: false, reason: `Edge "${cmd.edgeId}" not found` };
      if (cmd.domain !== undefined) edge.domain = cmd.domain;
      if (cmd.familyId !== undefined) edge.familyId = cmd.familyId;
      if (cmd.curveType !== undefined) edge.curveType = cmd.curveType;
      if (cmd.curveBulge !== undefined) edge.curveBulge = Number(cmd.curveBulge) || 0;
      if (cmd.elevationMode !== undefined) edge.elevationMode = cmd.elevationMode;
      if (cmd.presetId !== undefined) edge.presetId = cmd.presetId;
      if (cmd.bankingStartRad !== undefined) edge.bankingStartRad = Number(cmd.bankingStartRad) || 0;
      if (cmd.bankingEndRad !== undefined) edge.bankingEndRad = Number(cmd.bankingEndRad) || 0;
      if (Array.isArray(cmd.locks)) edge.locks = [...cmd.locks];
      if (cmd.params && typeof cmd.params === 'object') {
        edge.params = { ...edge.params, ...infraCopy(cmd.params) };
      }
      return commit({ ok: true, edge });
    }

    case 'DELETE_EDGE': {
      const idx = doc.edges.findIndex((e) => e.id === cmd.edgeId);
      if (idx === -1) return { ok: false, reason: `Edge "${cmd.edgeId}" not found` };
      doc.edges.splice(idx, 1);
      if (doc.selection?.id === cmd.edgeId) {
        doc.selection = doc.edges[0] ? { kind: 'edge', id: doc.edges[0].id } : { kind: 'none', id: null };
      }
      return commit({ ok: true });
    }

    case 'SPLIT_EDGE': {
      const edge = infraFindEdge(doc, cmd.edgeId);
      if (!edge) return { ok: false, reason: `Edge "${cmd.edgeId}" not found` };
      const startNode = infraFindNode(doc, edge.startNodeId);
      const endNode = infraFindNode(doc, edge.endNodeId);
      if (!startNode || !endNode) return { ok: false, reason: 'Edge endpoints missing' };

      const t = infraClamp(cmd.t !== undefined ? cmd.t : 0.5, 0.15, 0.85);
      const splitPos = Array.isArray(cmd.position)
        ? cmd.position
        : infraVec3Lerp(startNode.position, endNode.position, t);

      const midId = netAllocNodeId(doc, cmd.newNodeId);
      const midNode = infraNormalizeNode(
        {
          domain: edge.domain,
          position: splitPos,
          elevationMode: edge.elevationMode
        },
        midId
      );
      doc.nodes.push(midNode);

      const originalEndNodeId = edge.endNodeId;
      const originalBulge = Number(edge.curveBulge) || 0;
      edge.endNodeId = midNode.id;
      edge.curveBulge = infraRound(originalBulge * 0.25, 3);
      edge.curveType = Math.abs(edge.curveBulge) > 0.05 ? 'arc' : 'line';

      const secondEdgeId = netAllocEdgeId(doc, cmd.newEdgeId);
      const secondEdge = infraNormalizeEdge(
        {
          ...infraCopy(edge),
          id: secondEdgeId,
          startNodeId: midNode.id,
          endNodeId: originalEndNodeId,
          curveBulge: infraRound(originalBulge * 0.25, 3),
          curveType: Math.abs(originalBulge * 0.25) > 0.05 ? 'arc' : 'line'
        },
        secondEdgeId
      );
      doc.edges.push(secondEdge);
      doc.selection = { kind: 'node', id: midNode.id };
      return commit({ ok: true, splitNodeId: midNode.id, edgeAId: edge.id, edgeBId: secondEdge.id });
    }

    case 'UPDATE_DOC_META': {
      if (cmd.name !== undefined) doc.name = String(cmd.name);
      if (cmd.seed !== undefined) doc.seed = Number(cmd.seed) || 2026;
      if (cmd.eraStyle !== undefined) doc.eraStyle = String(cmd.eraStyle);
      if (cmd.workspaceMode !== undefined) doc.workspaceMode = String(cmd.workspaceMode);
      return commit({ ok: true });
    }

    case 'REPLACE_DOCUMENT': {
      if (!cmd.nextDoc) return { ok: false, reason: 'REPLACE_DOCUMENT requires nextDoc' };
      const nextSnap = netSnapshotState(cmd.nextDoc);
      netRestoreState(doc, nextSnap);
      return commit({ ok: true });
    }

    default:
      return { ok: false, reason: `Unknown command type "${cmd.type}"` };
  }
}

// Detects 3D crossings between non-adjacent edges without ever fusing them into graph nodes.
export function infraDetectNetworkCrossings(doc, sampledEdgesById, profilesByEdgeId) {
  const crossings = [];
  const edges = doc?.edges || [];
  let idx = 1;

  for (let i = 0; i < edges.length; i++) {
    const eA = edges[i];
    const sampA = sampledEdgesById.get(eA.id);
    if (!sampA || sampA.frames.length < 2) continue;
    const profA = profilesByEdgeId.get(eA.id);

    for (let j = i + 1; j < edges.length; j++) {
      const eB = edges[j];
      // Adjacent edges share a node and are explicitly connected topology, not crossings
      if (
        eA.startNodeId === eB.startNodeId ||
        eA.startNodeId === eB.endNodeId ||
        eA.endNodeId === eB.startNodeId ||
        eA.endNodeId === eB.endNodeId
      ) {
        continue;
      }
      const sampB = sampledEdgesById.get(eB.id);
      if (!sampB || sampB.frames.length < 2) continue;
      const profB = profilesByEdgeId.get(eB.id);

      // Quick XZ AABB reject
      if (
        sampA.boundsXZ.maxX + 1 < sampB.boundsXZ.minX ||
        sampB.boundsXZ.maxX + 1 < sampA.boundsXZ.minX ||
        sampA.boundsXZ.maxZ + 1 < sampB.boundsXZ.minZ ||
        sampB.boundsXZ.maxZ + 1 < sampA.boundsXZ.minZ
      ) {
        continue;
      }

      let foundHit = null;
      for (let a = 0; a < sampA.frames.length - 1 && !foundHit; a++) {
        const pA0 = sampA.frames[a].position;
        const pA1 = sampA.frames[a + 1].position;
        for (let b = 0; b < sampB.frames.length - 1; b++) {
          const pB0 = sampB.frames[b].position;
          const pB1 = sampB.frames[b + 1].position;
          const hit = infraSegIntersect2D([pA0[0], pA0[2]], [pA1[0], pA1[2]], [pB0[0], pB0[2]], [pB1[0], pB1[2]], 1e-4);
          if (hit.hit) {
            const yA = pA0[1] + (pA1[1] - pA0[1]) * hit.t;
            const yB = pB0[1] + (pB1[1] - pB0[1]) * hit.u;
            const tanA = infraVec2Norm([pA1[0] - pA0[0], pA1[2] - pA0[2]], [1, 0]);
            const tanB = infraVec2Norm([pB1[0] - pB0[0], pB1[2] - pB0[2]], [0, 1]);
            foundHit = { x: hit.x, z: hit.z, yA, yB, tanA, tanB };
            break;
          }
        }
      }

      if (!foundHit) continue;

      const effElevY = (e, y) => (e.elevationMode === 'aerial' ? y + (Number(e.params?.towerHeightMeters) || 12) : y);
      const aIsUpper = effElevY(eA, foundHit.yA) >= effElevY(eB, foundHit.yB);
      const upperEdge = aIsUpper ? eA : eB;
      const lowerEdge = aIsUpper ? eB : eA;
      const upperProf = aIsUpper ? profA : profB;
      const lowerProf = aIsUpper ? profB : profA;
      const upperY = aIsUpper ? foundHit.yA : foundHit.yB;
      const lowerY = aIsUpper ? foundHit.yB : foundHit.yA;

      const envOptsFor = (ed) => ({
        dropBelowGuidewayMeters: ed.params?.hangingDropMeters,
        towerHeightMeters: ed.params?.towerHeightMeters,
        wireClearanceY: ed.elevationMode === 'aerial' ? Math.max(2.0, (Number(ed.params?.towerHeightMeters) || 12) - 3.0) : undefined
      });
      const upperEnv = infraComputeEdgeVerticalEnvelope(upperY, upperProf, upperEdge.elevationMode, null, envOptsFor(upperEdge));
      const lowerEnv = infraComputeEdgeVerticalEnvelope(lowerY, lowerProf, lowerEdge.elevationMode, null, envOptsFor(lowerEdge));
      const verticalClearance = upperEnv.clearanceBottomY - lowerEnv.datumY;
      const requiredClearance = lowerEnv.requiredHeadroomAboveDatum;

      const isGradeRailRoad =
        Math.abs(upperY - lowerY) <= 0.45 &&
        upperEdge.elevationMode === 'grade' &&
        lowerEdge.elevationMode === 'grade' &&
        (
          ((eA.domain === 'rail' || eA.domain === 'tram') && eB.domain === 'road') ||
          ((eB.domain === 'rail' || eB.domain === 'tram') && eA.domain === 'road')
        );

      if (isGradeRailRoad) {
        const roadIsA = eA.domain === 'road';
        const roadEdge = roadIsA ? eA : eB;
        const railEdge = roadIsA ? eB : eA;
        const roadProf = roadIsA ? profA : profB;
        const railProf = roadIsA ? profB : profA;
        const roadTan = roadIsA ? foundHit.tanA : foundHit.tanB;
        const railTan = roadIsA ? foundHit.tanB : foundHit.tanA;

        crossings.push({
          id: `cross_${idx++}`,
          upperEdgeId: railEdge.id,
          lowerEdgeId: roadEdge.id,
          roadEdgeId: roadEdge.id,
          railEdgeId: railEdge.id,
          crossingKind: 'at_grade_rail_road',
          intersectionXZ: [infraRound(foundHit.x, 3), infraRound(foundHit.z, 3)],
          roadTangentXZ: roadTan,
          railTangentXZ: railTan,
          roadWidthMeters: roadProf?.totalWidthMeters || 8.0,
          railWidthMeters: railProf?.totalWidthMeters || 4.8,
          railTrackOffsets: railProf?.trackCenterOffsets || [0],
          railGaugeMeters: railEdge.params?.trackGauge || 1.435,
          upperDatumY: infraRound(upperY, 3),
          upperBottomY: infraRound(upperEnv.clearanceBottomY, 3),
          lowerDatumY: infraRound(lowerY, 3),
          verticalClearanceMeters: 0,
          requiredClearanceMeters: 0,
          valid: true,
          note: 'At-grade rail-road level crossing with safety gates & warning signals'
        });
        continue;
      }

      const isSeparated =
        upperEdge.elevationMode !== lowerEdge.elevationMode ||
        Math.abs(upperY - lowerY) > 1.2;

      crossings.push({
        id: `cross_${idx++}`,
        upperEdgeId: upperEdge.id,
        lowerEdgeId: lowerEdge.id,
        crossingKind: isSeparated ? 'grade_separated' : 'unconnected_overlap',
        intersectionXZ: [infraRound(foundHit.x, 3), infraRound(foundHit.z, 3)],
        upperDatumY: infraRound(upperY, 3),
        upperBottomY: infraRound(upperEnv.clearanceBottomY, 3),
        lowerDatumY: infraRound(lowerY, 3),
        verticalClearanceMeters: infraRound(verticalClearance, 3),
        requiredClearanceMeters: infraRound(requiredClearance, 3),
        valid: isSeparated ? verticalClearance >= requiredClearance - 1e-3 : false,
        note: isSeparated
          ? 'Vertically separated crossing — intentionally NOT connected in network graph'
          : 'Unconnected same-level overlap — insert a junction node or raise one path'
      });
    }
  }

  // Also ensure node positions stay valid after detection
  for (const edge of edges) {
    const s = infraFindNode(doc, edge.startNodeId);
    const e = infraFindNode(doc, edge.endNodeId);
    if (s && e && infraVec2Dist([s.position[0], s.position[2]], [e.position[0], e.position[2]]) < 0.01) {
      // Zero-length edge handled in diagnostics
    }
  }

  return crossings;
}
