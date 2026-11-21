import { infraGenerateBlueprint } from '../core/blueprints.js';
import { infraAuditThreeGeometry } from '../core/diagnostics.js';
import { infraSolveNetwork } from '../core/solver.js';
import { infraEnsureRegistry } from '../families/register-all.js';
import { matResolveDescriptor } from '../materials/materials.js';
import { InfraBatcher } from './batcher.js';
import { geoBuildBridgeEdge } from './bridge-mesh.js';
import { geoBuildConnectorBend, geoBuildJunction } from './junction-mesh.js';
import { geoBuildFacilityEdge } from './facility-mesh.js';
import { geoBuildPedestrianEdge } from './pedestrian-mesh.js';
import { geoBuildLevelCrossing, geoBuildRailEdge, geoBuildRailSwitch } from './rail-mesh.js';
import { geoSweepEdge } from './sweeper.js';
import { geoBuildSupport } from './support-mesh.js';
import { geoBuildElevatedTransitEdge } from './suspended-mesh.js';
import { geoBuildTunnelEdge } from './tunnel-mesh.js';
import { geoBuildUtilityEdge } from './utility-mesh.js';
import { geoBuildWaterwayEdge } from './waterway-mesh.js';

export function infraBuildScene(doc, options = {}) {
  infraEnsureRegistry();

  const solved = infraSolveNetwork(doc);
  const batcher = new InfraBatcher(128);
  const collectors = { platforms: [], stairs: [], signals: [] };

  // 1. Sweep all trimmed edges by domain/family
  for (const edge of doc?.edges || []) {
    const samp = solved.sampledEdgesById.get(edge.id);
    const prof = solved.profilesByEdgeId.get(edge.id);
    if (edge.familyId === 'bridges') {
      geoBuildBridgeEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (edge.familyId === 'pedestrian' || edge.domain === 'pedestrian') {
      geoBuildPedestrianEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (edge.familyId === 'tunnels' || edge.elevationMode === 'underground') {
      geoBuildTunnelEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (edge.familyId === 'waterways' || edge.domain === 'waterway') {
      geoBuildWaterwayEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (
      edge.familyId === 'utilities' ||
      edge.domain === 'power' ||
      edge.domain === 'telecom' ||
      edge.domain === 'pipe' ||
      edge.domain === 'cableway'
    ) {
      geoBuildUtilityEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (edge.familyId === 'facilities' || edge.domain === 'cycle') {
      geoBuildFacilityEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (
      edge.familyId === 'elevated_transit' ||
      edge.domain === 'suspended_rail' ||
      edge.domain === 'monorail'
    ) {
      geoBuildElevatedTransitEdge(batcher, edge, samp, prof, doc, collectors);
    } else if (prof?.domain === 'road') {
      geoSweepEdge(batcher, edge, samp, prof, doc, collectors);
    } else {
      geoBuildRailEdge(batcher, edge, samp, prof, doc, collectors, solved.crossings || []);
    }
  }

  // 2. Build trimmed road intersections, rail switches, connector bends, and level crossings
  for (const junc of solved.junctions || []) {
    if (junc.domain === 'rail' || junc.domain === 'tram') {
      geoBuildRailSwitch(batcher, junc, doc);
    } else {
      geoBuildJunction(batcher, junc, doc);
    }
  }
  for (const bend of solved.connectorBends || []) {
    geoBuildConnectorBend(
      batcher,
      bend,
      solved.sampledEdgesById.get(bend.edgeAId),
      solved.profilesByEdgeId.get(bend.edgeAId),
      solved.sampledEdgesById.get(bend.edgeBId),
      solved.profilesByEdgeId.get(bend.edgeBId)
    );
  }
  for (const cross of solved.crossings || []) {
    if (cross.crossingKind === 'at_grade_rail_road') {
      geoBuildLevelCrossing(batcher, cross, doc, solved);
    }
  }

  // 3. Build grounded structural supports
  for (const supp of solved.supports || []) {
    geoBuildSupport(batcher, supp);
  }

  solved.platforms = collectors.platforms;
  solved.stairs = collectors.stairs;
  solved.signals = collectors.signals;

  const wearAvg = (doc?.edges || []).length
    ? doc.edges.reduce((acc, e) => acc + (Number(e.params?.wear) || 0.15), 0) / doc.edges.length
    : 0.15;

  const { layerA, layerB, layerC, stats } = batcher.buildLayerGroups((matKey) =>
    matResolveDescriptor(matKey, doc.eraStyle || 'modern_municipal', wearAvg, doc.seed || 2026)
  );

  const root = new THREE.Group();
  root.name = `InfraNetwork_${doc.id || 'main'}`;
  root.add(layerA);
  root.add(layerB);
  root.add(layerC);

  // Run automated Three.js geometry & z-fighting audit if requested or default
  let geoAudit = null;
  if (options.auditGeometry !== false) {
    geoAudit = infraAuditThreeGeometry(root);
    if (!geoAudit.valid) {
      if (geoAudit.coplanarOverlapCount > 0) {
        solved.diagnostics.issues.push({
          id: 'diag_geo_zfight',
          severity: 'error',
          category: 'geometry',
          targetKind: 'scene',
          targetId: doc.id,
          message: `Detected ${geoAudit.coplanarOverlapCount} coplanar z-fighting overlap(s) (max area ${geoAudit.maxOverlapAreaMeters2}m^2)`
        });
      }
      if (geoAudit.nanCount > 0 || geoAudit.degenerateCount > 0 || geoAudit.invertedHorizontalCount > 0) {
        solved.diagnostics.issues.push({
          id: 'diag_geo_invalid',
          severity: 'error',
          category: 'geometry',
          targetKind: 'scene',
          targetId: doc.id,
          message: `Geometry integrity error (NaNs:${geoAudit.nanCount}, Degenerate:${geoAudit.degenerateCount}, Inverted:${geoAudit.invertedHorizontalCount})`
        });
      }
      solved.diagnostics.errorCount = solved.diagnostics.issues.filter((i) => i.severity === 'error').length;
      solved.diagnostics.warningCount = solved.diagnostics.issues.filter((i) => i.severity === 'warning').length;
      solved.diagnostics.status = solved.diagnostics.errorCount > 0 ? 'errors' : (solved.diagnostics.warningCount > 0 ? 'warnings' : 'valid');
    }
  }

  const blueprint = infraGenerateBlueprint(doc, solved, stats);
  root.userData = {
    blueprint,
    solved,
    diagnostics: solved.diagnostics,
    geoAudit,
    stats
  };

  return root;
}
