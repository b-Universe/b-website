import { infraFindNode, infraDetectNetworkCrossings } from './network-graph.js';
import { infraBuildEdgePorts } from './ports.js';
import { infraBuildRoadProfileFromParams } from './profiles.js';
import { infraGetFamily } from './registry.js';
import { infraBuildEdgeSplineSpec, infraSampleSpline } from './spline.js';
import { infraSolveJunctions } from './junction-solver.js';
import { infraSolveSupports } from './support-solver.js';
import { infraComputeSurfaceOwnership } from './surface-ownership.js';
import { infraRunCoreDiagnostics } from './diagnostics.js';

export function infraSolveNetwork(doc) {
  const profilesByEdgeId = new Map();
  const sampledRawByEdgeId = new Map();
  const sampledEdgesById = new Map();
  const edgePortsById = new Map();

  // 1. Compile cross-section profiles and initial raw spline samples
  for (const edge of doc?.edges || []) {
    const family = infraGetFamily(edge.familyId || 'roads');
    const prof = family && typeof family.buildProfile === 'function'
      ? family.buildProfile(edge.params, edge.elevationMode, doc.eraStyle)
      : infraBuildRoadProfileFromParams(edge.params, edge.elevationMode, doc.eraStyle);
    profilesByEdgeId.set(edge.id, prof);

    const startNode = infraFindNode(doc, edge.startNodeId);
    const endNode = infraFindNode(doc, edge.endNodeId);
    if (!startNode || !endNode) continue;

    const spec = infraBuildEdgeSplineSpec(edge, startNode, endNode);
    const rawSamp = infraSampleSpline(spec, { trimStartMeters: 0, trimEndMeters: 0 });
    sampledRawByEdgeId.set(edge.id, rawSamp);
  }

  // 2. Solve intersections, degree-2 connector bends & pullback trims
  const { junctions, connectorBends, edgeTrimMap } = infraSolveJunctions(doc, profilesByEdgeId, sampledRawByEdgeId);

  // 3. Resample trimmed splines and build typed semantic ports
  for (const edge of doc?.edges || []) {
    const startNode = infraFindNode(doc, edge.startNodeId);
    const endNode = infraFindNode(doc, edge.endNodeId);
    if (!startNode || !endNode) continue;

    const trims = edgeTrimMap.get(edge.id) || { trimStartMeters: 0, trimEndMeters: 0 };
    const spec = infraBuildEdgeSplineSpec(edge, startNode, endNode);
    const samp = infraSampleSpline(spec, trims);
    sampledEdgesById.set(edge.id, samp);

    const prof = profilesByEdgeId.get(edge.id);
    const ports = infraBuildEdgePorts(edge, prof, samp.startRawFrame, samp.endRawFrame, {
      startConnectedTo: { nodeId: startNode.id, portId: `${startNode.id}:hub` },
      endConnectedTo: { nodeId: endNode.id, portId: `${endNode.id}:hub` }
    });
    edgePortsById.set(edge.id, ports);
  }

  // 4. Detect non-connecting 3D crossings & same-level overlaps
  const crossings = infraDetectNetworkCrossings(doc, sampledEdgesById, profilesByEdgeId);

  // 5. Solve grounded structural supports clear of lower road corridors
  const supports = infraSolveSupports(doc, sampledEdgesById, profilesByEdgeId);

  // 6. Compute explicit terrain ownership operations & vegetation exclusion zones
  const surfaceOwnership = infraComputeSurfaceOwnership(doc, sampledEdgesById, profilesByEdgeId, junctions);

  const solved = {
    profilesByEdgeId,
    sampledEdgesById,
    edgePortsById,
    junctions,
    connectorBends,
    edgeTrimMap,
    crossings,
    supports,
    surfaceOwnership
  };

  // 7. Run core topology, structural & clearance diagnostics
  solved.diagnostics = infraRunCoreDiagnostics(doc, solved);

  return solved;
}
