import { INFRA_WORKSPACE_MODES } from '../config.js';
import { infraExecuteCommand } from '../core/network-graph.js';
import { infraGetReferenceScene } from '../presets/reference-scenes.js';

export function wsGetModes() {
  return INFRA_WORKSPACE_MODES;
}

export function wsSwitchMode(doc, targetMode, toast) {
  const modeMeta = INFRA_WORKSPACE_MODES.find((m) => m.id === targetMode);
  if (!modeMeta) return { switched: false };

  if (!modeMeta.available) {
    if (toast) toast(`${modeMeta.label} mode is planned for ${modeMeta.badge || 'a later milestone'}`);
    return { switched: false, planned: true };
  }

  if (doc.workspaceMode === targetMode) {
    return { switched: false };
  }

  if (targetMode === 'component') {
    const selectedEdge = (doc.edges || []).find((e) => e.id === doc.selection?.id) || doc.edges?.[0];
    const compDoc = infraGetReferenceScene(
      selectedEdge && Math.abs(selectedEdge.curveBulge || 0) > 0.2
        ? 'ref_curved_road_segment'
        : 'ref_single_straight_road'
    );
    compDoc.workspaceMode = 'component';
    compDoc.eraStyle = doc.eraStyle || compDoc.eraStyle;
    compDoc.seed = doc.seed || compDoc.seed;
    if (selectedEdge && compDoc.edges[0]) {
      compDoc.edges[0].domain = selectedEdge.domain;
      compDoc.edges[0].familyId = selectedEdge.familyId;
      compDoc.edges[0].presetId = selectedEdge.presetId;
      compDoc.edges[0].elevationMode = selectedEdge.elevationMode;
      compDoc.edges[0].params = JSON.parse(JSON.stringify(selectedEdge.params));
      compDoc.nodes[0].domain = selectedEdge.domain;
      compDoc.nodes[1].domain = selectedEdge.domain;
      const yMap = selectedEdge.elevationMode === 'suspended' ? 9.4 : selectedEdge.elevationMode === 'elevated' ? 5.6 : selectedEdge.elevationMode === 'underground' ? -6.2 : 0;
      compDoc.nodes[0].position[1] = yMap;
      compDoc.nodes[1].position[1] = yMap;
      compDoc.nodes[0].elevationMode = selectedEdge.elevationMode;
      compDoc.nodes[1].elevationMode = selectedEdge.elevationMode;
    }
    infraExecuteCommand(doc, { type: 'REPLACE_DOCUMENT', nextDoc: compDoc });
    return { switched: true, mode: 'component' };
  }

  if (targetMode === 'network') {
    const netDoc = infraGetReferenceScene('ref_urban_road_network');
    netDoc.workspaceMode = 'network';
    infraExecuteCommand(doc, { type: 'REPLACE_DOCUMENT', nextDoc: netDoc });
    return { switched: true, mode: 'network' };
  }

  if (targetMode === 'assembly') {
    const asmDoc = infraGetReferenceScene('ref_bridge_over_canal');
    asmDoc.workspaceMode = 'assembly';
    infraExecuteCommand(doc, { type: 'REPLACE_DOCUMENT', nextDoc: asmDoc });
    return { switched: true, mode: 'assembly' };
  }

  if (targetMode === 'district') {
    const distDoc = infraGetReferenceScene('ref_urban_district_demo');
    distDoc.workspaceMode = 'district';
    infraExecuteCommand(doc, { type: 'REPLACE_DOCUMENT', nextDoc: distDoc });
    return { switched: true, mode: 'district' };
  }

  return { switched: false };
}
