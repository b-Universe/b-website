import {
  INFRA_ASSEMBLY_SCHEMA_VERSION,
  INFRA_BLUEPRINT_SCHEMA_VERSION,
  INFRA_DOMAINS,
  INFRA_GENERATOR_META,
  infraBoundsToBGameUnits,
  infraVecToBGameUnits
} from '../config.js';
import { infraCopy, infraHashString, infraRound } from '../utils.js';
import { infraComputeEdgeVerticalEnvelope } from './clearances.js';
import { infraCreateNetworkDocument, infraExtractMaxNumericId } from './network-graph.js';

export function infraGenerateBlueprint(doc, solved = {}, meshStats = {}) {
  const nodes = (doc?.nodes || []).map((n) => ({
    id: n.id,
    domain: n.domain || 'road',
    kind: n.kind || 'endpoint',
    elevationMode: n.elevationMode || 'grade',
    positionMeters: [infraRound(n.position[0], 4), infraRound(n.position[1], 4), infraRound(n.position[2], 4)],
    bGamePosition: infraVecToBGameUnits(n.position[0], n.position[1], n.position[2]),
    params: infraCopy(n.params || {})
  }));

  const edges = (doc?.edges || []).map((e) => {
    const samp = solved.sampledEdgesById?.get(e.id);
    const ports = solved.edgePortsById?.get(e.id);
    const prof = solved.profilesByEdgeId?.get(e.id);
    return {
      id: e.id,
      domain: e.domain || 'road',
      familyId: e.familyId || 'roads',
      presetId: e.presetId || e.params?.presetId || 'residential_2lane',
      startNodeId: e.startNodeId,
      endNodeId: e.endNodeId,
      elevationMode: e.elevationMode || 'grade',
      curveType: e.curveType || 'line',
      curveBulge: infraRound(e.curveBulge || 0, 4),
      verticalProfile: e.verticalProfile || 'smooth',
      bankingStartRad: infraRound(e.bankingStartRad || 0, 5),
      bankingEndRad: infraRound(e.bankingEndRad || 0, 5),
      profileId: prof?.id || 'road_custom',
      lengthMeters: samp?.lengthMeters || 0,
      trimmedLengthMeters: samp?.trimmedLengthMeters || 0,
      maxGradeRatio: samp?.maxGradeRatio || 0,
      minCurveRadiusMeters: samp?.minCurveRadiusMeters ?? null,
      ports: ports ? [ports.startPort, ports.endPort] : [],
      params: infraCopy(e.params || {}),
      locks: Array.isArray(e.locks) ? [...e.locks] : []
    };
  });

  // Derive deterministic bounds across sampled spline frames & profiles
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const edge of doc?.edges || []) {
    const samp = solved.sampledEdgesById?.get(edge.id);
    const prof = solved.profilesByEdgeId?.get(edge.id);
    if (!samp || !prof) continue;
    const hw = prof.halfWidthMeters || 3.2;
    const isSusp = edge.elevationMode === 'suspended' || edge.domain === 'suspended_rail';
    const envBottomOffset = isSusp
      ? -(Number(edge.params?.hangingDropMeters) || 3.6)
      : edge.elevationMode === 'elevated'
        ? -(prof.understructure?.deckThicknessMeters || 0.65)
        : -0.35;
    const envTopOffset = isSusp
      ? (Number(edge.params?.guidewayDepth) || 1.75) + 0.5
      : (prof.maxElevationOffsetMeters || 0.15);
    for (const f of samp.frames) {
      minX = Math.min(minX, f.position[0] - hw);
      maxX = Math.max(maxX, f.position[0] + hw);
      minZ = Math.min(minZ, f.position[2] - hw);
      maxZ = Math.max(maxZ, f.position[2] + hw);
      minY = Math.min(minY, Math.min(0, f.position[1] + envBottomOffset));
      maxY = Math.max(maxY, f.position[1] + envTopOffset);
    }
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    minZ = 0;
    maxX = 0;
    maxY = 0;
    maxZ = 0;
  }

  const minMeters = { x: infraRound(minX, 3), y: infraRound(minY, 3), z: infraRound(minZ, 3) };
  const maxMeters = { x: infraRound(maxX, 3), y: infraRound(maxY, 3), z: infraRound(maxZ, 3) };

  const uniqueProfiles = [];
  const seenProf = new Set();
  if (solved.profilesByEdgeId) {
    for (const prof of solved.profilesByEdgeId.values()) {
      if (!seenProf.has(prof.id)) {
        seenProf.add(prof.id);
        uniqueProfiles.push(infraCopy(prof));
      }
    }
  }

  // Export usable vehicle routes, rail/tram/suspended routes & pedestrian metadata
  const vehicleRoutes = [];
  const railRoutes = [];
  const walkwayZones = [];
  const clearanceEnvelopes = [];

  for (const e of doc?.edges || []) {
    const samp = solved.sampledEdgesById?.get(e.id);
    const prof = solved.profilesByEdgeId?.get(e.id);
    if (!samp || !prof) continue;

    const centerline = samp.frames.map((f) => ({
      meters: [infraRound(f.position[0], 3), infraRound(f.position[1], 3), infraRound(f.position[2], 3)],
      bGameUnits: infraVecToBGameUnits(f.position[0], f.position[1], f.position[2])
    }));
    const midY = samp.frames[Math.floor(samp.frames.length / 2)]?.position[1] ?? 0;
    const isRailDomain = e.domain === 'rail' || e.domain === 'tram' || e.domain === 'monorail' || e.domain === 'suspended_rail';

    if (isRailDomain) {
      const env = infraComputeEdgeVerticalEnvelope(midY, prof, e.elevationMode, null, {
        dropBelowGuidewayMeters: e.params?.hangingDropMeters
      });
      railRoutes.push({
        edgeId: e.id,
        domain: e.domain,
        elevationMode: e.elevationMode,
        mountMode: env.mountMode,
        trackCount: prof.trackCount || 1,
        gaugeMeters: prof.trackGauge || 1.435,
        trackCenterOffsets: prof.trackCenterOffsets || [0],
        electrification: e.params?.electrification || (e.domain === 'suspended_rail' ? 'busbar' : 'none'),
        hangingClearance: env.mountMode === 'top_hung'
          ? {
              widthMeters: e.params?.hangingWidthMeters || 2.55,
              dropBelowGuidewayMeters: env.dropBelowGuidewayMeters,
              bottomClearanceY: env.clearanceBottomY
            }
          : null,
        centerline
      });
    } else {
      vehicleRoutes.push({
        edgeId: e.id,
        domain: e.domain,
        elevationMode: e.elevationMode,
        laneCount: e.params?.laneCount || 2,
        drivableWidthMeters: prof.drivableWidthMeters,
        channels: infraCopy(prof.channels.filter((c) => c.kind !== 'sidewalk')),
        centerline
      });
      if (prof.hasEmbeddedTram) {
        railRoutes.push({
          edgeId: `${e.id}:embedded_tram`,
          embeddedInRoadEdgeId: e.id,
          domain: 'tram',
          elevationMode: e.elevationMode,
          mountMode: 'floor_supported',
          trackCount: prof.tramTrackOffsets?.length || 1,
          gaugeMeters: prof.tramGaugeMeters || 1.435,
          trackCenterOffsets: prof.tramTrackOffsets || [0],
          electrification: e.params?.includeTramPoles ? 'catenary_wire' : 'none',
          hangingClearance: null,
          centerline
        });
      }
    }

    if (prof.leftSidewalkWidth > 0 || prof.rightSidewalkWidth > 0) {
      walkwayZones.push({
        edgeId: e.id,
        leftSidewalkWidthMeters: prof.leftSidewalkWidth,
        rightSidewalkWidthMeters: prof.rightSidewalkWidth,
        curbHeightMeters: prof.curbHeightMeters
      });
    }

    clearanceEnvelopes.push({
      edgeId: e.id,
      clearanceEnvelopeId: prof.clearanceEnvelopeId,
      verticalEnvelopeMeters: infraComputeEdgeVerticalEnvelope(midY, prof, e.elevationMode, null, {
        dropBelowGuidewayMeters: e.params?.hangingDropMeters
      })
    });
  }

  const dynamicElements = [];
  for (const j of solved.junctions || []) {
    if (j.switchMetadata) {
      dynamicElements.push({
        id: `dyn_switch_${j.nodeId}`,
        kind: 'rail_switch',
        nodeId: j.nodeId,
        switchKind: j.switchMetadata.switchKind,
        activeState: j.switchMetadata.activeState,
        branches: infraCopy(j.switchMetadata.branches),
        positionMeters: [...j.position],
        bGamePosition: infraVecToBGameUnits(j.position[0], j.position[1], j.position[2])
      });
    }
  }
  for (const c of solved.crossings || []) {
    if (c.crossingKind === 'at_grade_rail_road') {
      dynamicElements.push({
        id: `dyn_gate_${c.id}`,
        kind: 'railroad_crossing_gate',
        crossingId: c.id,
        roadEdgeId: c.roadEdgeId,
        railEdgeId: c.railEdgeId,
        positionMeters: [c.intersectionXZ[0], c.lowerDatumY, c.intersectionXZ[1]],
        bGamePosition: infraVecToBGameUnits(c.intersectionXZ[0], c.lowerDatumY, c.intersectionXZ[1])
      });
    }
  }
  for (const sig of solved.signals || []) {
    dynamicElements.push({
      ...sig,
      bGamePosition: infraVecToBGameUnits(sig.positionMeters[0], sig.positionMeters[1], sig.positionMeters[2])
    });
  }

  const canonicalPayload = JSON.stringify({
    schemaVersion: INFRA_BLUEPRINT_SCHEMA_VERSION,
    seed: doc.seed,
    eraStyle: doc.eraStyle,
    nodes: nodes.map((n) => ({ id: n.id, pos: n.positionMeters, mode: n.elevationMode, params: n.params })),
    edges: edges.map((e) => ({
      id: e.id,
      s: e.startNodeId,
      e: e.endNodeId,
      mode: e.elevationMode,
      curveType: e.curveType,
      curveBulge: e.curveBulge,
      params: e.params
    }))
  });

  const revHash = infraHashString(canonicalPayload);
  const tplHash = revHash.slice(0, 12);

  return {
    schemaVersion: INFRA_BLUEPRINT_SCHEMA_VERSION,
    generator: infraCopy(INFRA_GENERATOR_META),
    capabilities: {
      implementedDomains: Object.values(INFRA_DOMAINS).filter((d) => d.implemented).map((d) => d.id),
      plannedDomains: Object.values(INFRA_DOMAINS).filter((d) => !d.implemented).map((d) => d.id),
      supportedWorkspaceModes: ['component', 'network', 'assembly', 'district'],
      plannedWorkspaceModes: []
    },
    templateId: `infra_tpl_${infraHashString(doc.id || 'net').slice(0, 6)}_${doc.seed || 2026}_${tplHash}`,
    templateRevision: `rev_${revHash}`,
    name: String(doc.name || 'Infrastructure Network'),
    seed: Number(doc.seed) || 2026,
    eraStyle: doc.eraStyle || 'modern_municipal',
    workspaceMode: doc.workspaceMode || 'network',
    bounds: {
      meters: {
        min: minMeters,
        max: maxMeters,
        size: {
          x: infraRound(maxMeters.x - minMeters.x, 3),
          y: infraRound(maxMeters.y - minMeters.y, 3),
          z: infraRound(maxMeters.z - minMeters.z, 3)
        }
      },
      bGameUnits: infraBoundsToBGameUnits(minMeters, maxMeters)
    },
    profiles: uniqueProfiles,
    networks: [
      {
        id: doc.id || 'net_main',
        domain: new Set(edges.map((e) => e.domain)).size > 1 ? 'mixed' : (edges[0]?.domain || 'road'),
        nodes,
        edges,
        junctions: infraCopy((solved.junctions || []).map((j) => ({
          id: j.id,
          nodeId: j.nodeId,
          domain: j.domain || 'road',
          junctionType: j.junctionType,
          geometryStatus: j.geometryStatus,
          statusReason: j.statusReason,
          legs: j.legs,
          ...(j.switchMetadata ? { switchMetadata: j.switchMetadata } : {}),
          laneConnections: j.laneConnections
        }))),
        crossings: infraCopy(solved.crossings || [])
      }
    ],
    supports: infraCopy(solved.supports || []),
    terrainOperations: infraCopy(solved.surfaceOwnership?.terrainOperations || []),
    vegetationZones: infraCopy(solved.surfaceOwnership?.vegetationZones || []),
    gameplayMetadata: {
      vehicleRoutes,
      railRoutes,
      pedestrianNav: {
        sidewalks: walkwayZones,
        crosswalkCount: (solved.junctions || []).reduce((acc, j) => acc + (j.crosswalkAprons?.length || 0), 0),
        platforms: infraCopy(solved.platforms || []),
        stairs: infraCopy(solved.stairs || [])
      },
      clearanceEnvelopes,
      dynamicElements,
      worldPersistence: {
        requiresDeveloperAuth: true,
        placementAuthority: 'server_validated',
        protectedRegionCheck: true
      }
    },
    diagnostics: infraCopy(solved.diagnostics || { status: 'valid', errorCount: 0, warningCount: 0, issues: [] }),
    geometryStats: {
      triangleCount: Number(meshStats?.triangleCount) || 0,
      meshCount: Number(meshStats?.meshCount) || 0,
      drawCalls: Number(meshStats?.drawCalls) || 0,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      crossingCount: (solved.crossings || []).length,
      supportCount: (solved.supports || []).length
    }
  };
}

export function infraValidateBlueprint(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Blueprint payload must be a JSON object'], warnings };
  }
  if (data.schemaVersion !== INFRA_BLUEPRINT_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion "${data.schemaVersion}" (expected "${INFRA_BLUEPRINT_SCHEMA_VERSION}")`);
  }
  if (!Array.isArray(data.networks) || data.networks.length === 0) {
    errors.push('Blueprint must contain at least one network entry');
    return { valid: false, errors, warnings };
  }

  for (const net of data.networks) {
    if (!Array.isArray(net.nodes) || !Array.isArray(net.edges)) {
      errors.push(`Network "${net.id}" missing nodes or edges arrays`);
      continue;
    }
    const nodeIds = new Set();
    for (const n of net.nodes) {
      if (!n?.id) {
        errors.push('Node missing id');
        continue;
      }
      if (nodeIds.has(n.id)) errors.push(`Duplicate node id "${n.id}"`);
      nodeIds.add(n.id);
      const pos = n.positionMeters || n.position;
      if (!Array.isArray(pos) || pos.length !== 3 || pos.some((v) => !Number.isFinite(Number(v)))) {
        errors.push(`Node "${n.id}" has invalid 3D position`);
      }
    }

    for (const e of net.edges) {
      if (!e?.id) {
        errors.push('Edge missing id');
        continue;
      }
      if (!nodeIds.has(e.startNodeId) || !nodeIds.has(e.endNodeId)) {
        errors.push(`Edge "${e.id}" references missing node(s)`);
      }
      if (e.domain && !INFRA_DOMAINS[e.domain]) {
        errors.push(`Edge "${e.id}" specifies unknown domain "${e.domain}"`);
      } else if (e.domain && !INFRA_DOMAINS[e.domain].implemented) {
        warnings.push(`Edge "${e.id}" uses unimplemented planned domain "${e.domain}"`);
      }
      if (e.params?.laneWidth !== undefined && Number(e.params.laneWidth) <= 0) {
        errors.push(`Edge "${e.id}" has non-positive laneWidth`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function infraHydrateDocumentFromBlueprint(data) {
  const check = infraValidateBlueprint(data);
  if (!check.valid) {
    throw new Error(`Invalid b.infrastructure.v1 blueprint: ${check.errors.join('; ')}`);
  }
  const primaryNet = data.networks[0];
  const nodes = primaryNet.nodes.map((n) => ({
    id: n.id,
    domain: n.domain || 'road',
    kind: n.kind || 'endpoint',
    elevationMode: n.elevationMode || 'grade',
    position: [...(n.positionMeters || n.position)],
    params: infraCopy(n.params || {})
  }));
  const edges = primaryNet.edges.map((e) => ({
    id: e.id,
    domain: e.domain || 'road',
    familyId: e.familyId || 'roads',
    presetId: e.presetId || e.params?.presetId || 'residential_2lane',
    startNodeId: e.startNodeId,
    endNodeId: e.endNodeId,
    elevationMode: e.elevationMode || 'grade',
    curveType: e.curveType || 'line',
    curveBulge: Number(e.curveBulge) || 0,
    verticalProfile: e.verticalProfile || 'smooth',
    bankingStartRad: Number(e.bankingStartRad) || 0,
    bankingEndRad: Number(e.bankingEndRad) || 0,
    params: infraCopy(e.params || {}),
    locks: Array.isArray(e.locks) ? [...e.locks] : []
  }));

  return infraCreateNetworkDocument({
    id: primaryNet.id || 'net_main',
    name: data.name || 'Imported Infrastructure Network',
    seed: data.seed || 2026,
    eraStyle: data.eraStyle || 'modern_municipal',
    workspaceMode: data.workspaceMode === 'component' || data.workspaceMode === 'assembly' || data.workspaceMode === 'district'
      ? data.workspaceMode
      : 'network',
    nextIds: {
      node: infraExtractMaxNumericId(nodes, 'n_') + 1,
      edge: infraExtractMaxNumericId(edges, 'e_') + 1
    },
    nodes,
    edges
  });
}

export function infraGenerateAssemblyBlueprint(doc, solved = {}, meshStats = {}) {
  const blueprint = infraGenerateBlueprint(doc, solved, meshStats);
  const net = blueprint.networks[0] || { nodes: [], edges: [] };
  const externalPorts = [];
  for (const node of net.nodes) {
    const attached = net.edges.filter((e) => e.startNodeId === node.id || e.endNodeId === node.id);
    if (attached.length === 1) {
      const edge = attached[0];
      const port = edge.startNodeId === node.id ? edge.ports?.[0] : edge.ports?.[1];
      if (port) {
        externalPorts.push({
          socketId: `socket_${node.id}`,
          nodeId: node.id,
          domain: port.domain,
          elevationMode: port.elevationMode,
          positionMeters: port.pose?.position || node.positionMeters,
          bGamePosition: node.bGamePosition,
          tangent: port.pose?.tangent || [0, 0, 1],
          widthMeters: port.widthMeters,
          clearanceEnvelopeId: port.clearanceEnvelopeId
        });
      }
    }
  }
  return {
    schemaVersion: INFRA_ASSEMBLY_SCHEMA_VERSION,
    assemblyId: `asm_${blueprint.templateId}`,
    templateRevision: blueprint.templateRevision,
    name: blueprint.name,
    seed: blueprint.seed,
    eraStyle: blueprint.eraStyle,
    externalPorts,
    bounds: blueprint.bounds,
    blueprint
  };
}
