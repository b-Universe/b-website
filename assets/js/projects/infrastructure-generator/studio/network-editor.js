import { infraGetPreset } from '../core/registry.js';
import { infraCheckPortCompatibility, infraCreatePort } from '../core/ports.js';
import { infraExecuteCommand, infraFindNode } from '../core/network-graph.js';

const ED_CORRIDOR_MODES = {
  road: { domain: 'road', familyId: 'roads', elevationMode: 'grade', presetId: 'residential_2lane', defaultY: 0 },
  tram_road: { domain: 'road', familyId: 'railways', elevationMode: 'grade', presetId: 'street_tram_boulevard', defaultY: 0 },
  rail: { domain: 'rail', familyId: 'railways', elevationMode: 'grade', presetId: 'freight_single_track', defaultY: 0 },
  suspended_monorail: { domain: 'suspended_rail', familyId: 'elevated_transit', elevationMode: 'suspended', presetId: 'wuppertal_steel_double', defaultY: 9.4 },
  bridge: { domain: 'road', familyId: 'bridges', elevationMode: 'elevated', presetId: 'cable_stayed_bridge', defaultY: 6.4 },
  pedestrian: { domain: 'pedestrian', familyId: 'pedestrian', elevationMode: 'grade', presetId: 'city_promenade', defaultY: 0 },
  tunnel: { domain: 'road', familyId: 'tunnels', elevationMode: 'underground', presetId: 'highway_arch_tunnel', defaultY: -6.4 },
  waterway: { domain: 'waterway', familyId: 'waterways', elevationMode: 'grade', presetId: 'urban_stone_canal', defaultY: 0 },
  utility: { domain: 'power', familyId: 'utilities', elevationMode: 'aerial', presetId: 'hv_transmission_line', defaultY: 0 },
  facility: { domain: 'cycle', familyId: 'facilities', elevationMode: 'grade', presetId: 'protected_bikeway', defaultY: 0 }
};

export function edCreateNetworkEditor(ctx) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let activeTool = 'select'; // 'select' | 'move_node' | 'add_road' | 'split_road'
  let corridorMode = 'road';
  let dragNodeId = null;
  let dragPlaneY = 0;
  let dragOriginPos = null;
  let dragChanged = false;
  let addStartNodeId = null;
  let addStartPos = null;
  let rubberBandLine = null;
  let rubberBandValid = true;

  const getActiveCorridorCfg = () => ED_CORRIDOR_MODES[corridorMode] || ED_CORRIDOR_MODES.road;

  const updatePointer = (e) => {
    const canvas = ctx.getCanvas();
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  };

  const raycastPlaneY = (y) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const out = new THREE.Vector3();
    raycaster.setFromCamera(pointer, ctx.getCamera());
    const hit = raycaster.ray.intersectPlane(plane, out);
    return hit ? [Math.round(hit.x * 2) / 2, y, Math.round(hit.z * 2) / 2] : null;
  };

  const pickNodeHandle = () => {
    const debugRoot = ctx.getDebugRoot();
    if (!debugRoot) return null;
    raycaster.setFromCamera(pointer, ctx.getCamera());
    const hits = raycaster.intersectObjects(debugRoot.children, true);
    for (const h of hits) {
      if (h.object?.userData?.pickKind === 'node') {
        return h.object.userData.nodeId;
      }
    }
    return null;
  };

  const pickSceneEdgeClosest = (pointXZ) => {
    const solved = ctx.getSolved();
    const doc = ctx.getDoc();
    if (!solved?.sampledEdgesById || !doc?.edges?.length) return null;
    let best = null;
    let bestDist = 4.5;
    for (const edge of doc.edges) {
      const samp = solved.sampledEdgesById.get(edge.id);
      if (!samp?.frames?.length) continue;
      for (let i = 0; i < samp.frames.length; i++) {
        const fp = samp.frames[i].position;
        const d = Math.hypot(fp[0] - pointXZ[0], fp[2] - pointXZ[2]);
        if (d < bestDist) {
          bestDist = d;
          best = { edgeId: edge.id, t: samp.frames[i].t, position: [...fp] };
        }
      }
    }
    return best;
  };

  const clearRubberBand = () => {
    const scene = ctx.getScene();
    if (rubberBandLine && scene) {
      scene.remove(rubberBandLine);
      if (rubberBandLine.geometry) rubberBandLine.geometry.dispose();
      if (rubberBandLine.material) rubberBandLine.material.dispose();
    }
    rubberBandLine = null;
  };

  const updateRubberBand = (fromPos, toPos, isValid) => {
    const scene = ctx.getScene();
    if (!scene) return;
    if (!rubberBandLine) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...fromPos),
        new THREE.Vector3(...toPos)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: isValid ? 0x6ce8ac : 0xff5c7c });
      rubberBandLine = new THREE.Line(geo, mat);
      scene.add(rubberBandLine);
    } else {
      const posAttr = rubberBandLine.geometry.attributes.position;
      posAttr.setXYZ(0, fromPos[0], fromPos[1] + 0.3, fromPos[2]);
      posAttr.setXYZ(1, toPos[0], toPos[1] + 0.3, toPos[2]);
      posAttr.needsUpdate = true;
      rubberBandLine.material.color.setHex(isValid ? 0x6ce8ac : 0xff5c7c);
    }
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 || !updatePointer(e)) return;
    const doc = ctx.getDoc();

    const hitNodeId = pickNodeHandle();

    if (activeTool === 'select') {
      if (hitNodeId) {
        doc.selection = { kind: 'node', id: hitNodeId };
        ctx.onSelectionChanged();
        return;
      }
      const groundPt = raycastPlaneY(0);
      if (groundPt) {
        const hitEdge = pickSceneEdgeClosest(groundPt);
        if (hitEdge) {
          doc.selection = { kind: 'edge', id: hitEdge.edgeId };
          ctx.onSelectionChanged();
        }
      }
      return;
    }

    if (activeTool === 'move_node') {
      if (hitNodeId) {
        const node = infraFindNode(doc, hitNodeId);
        if (!node) return;
        dragNodeId = hitNodeId;
        dragPlaneY = node.position[1];
        dragOriginPos = [...node.position];
        dragChanged = false;
        doc.selection = { kind: 'node', id: hitNodeId };
        const orbit = ctx.getOrbit();
        if (orbit) orbit.enabled = false;
        ctx.onSelectionChanged();
      }
      return;
    }

    if (activeTool === 'split_road') {
      const groundPt = raycastPlaneY(0);
      if (!groundPt) return;
      const hitEdge = pickSceneEdgeClosest(groundPt);
      if (hitEdge) {
        const res = infraExecuteCommand(doc, {
          type: 'SPLIT_EDGE',
          edgeId: hitEdge.edgeId,
          t: hitEdge.t,
          position: hitEdge.position
        });
        if (res.ok) {
          ctx.rebuildAll('Split road segment');
        }
      }
      return;
    }

    if (activeTool === 'add_road') {
      const cfg = getActiveCorridorCfg();
      if (!addStartPos) {
        if (hitNodeId) {
          const n = infraFindNode(doc, hitNodeId);
          addStartNodeId = hitNodeId;
          addStartPos = [...n.position];
          doc.selection = { kind: 'node', id: hitNodeId };
          ctx.onSelectionChanged();
        } else {
          const pt = raycastPlaneY(cfg.defaultY);
          if (!pt) return;
          addStartNodeId = null;
          addStartPos = pt;
        }
        ctx.setStatus(`Click destination node or ground point (y=${addStartPos[1]}m) to connect corridor...`);
      } else {
        let targetNodeId = hitNodeId;
        let targetPos = null;
        if (targetNodeId) {
          const tn = infraFindNode(doc, targetNodeId);
          targetPos = tn ? [...tn.position] : null;
        } else {
          targetPos = raycastPlaneY(addStartPos[1]);
        }

        if (targetPos && (!targetNodeId || targetNodeId !== addStartNodeId)) {
          const startNodeObj = addStartNodeId ? infraFindNode(doc, addStartNodeId) : null;
          const endNodeObj = targetNodeId ? infraFindNode(doc, targetNodeId) : null;
          const domainA = startNodeObj?.domain || cfg.domain;
          const elevA = startNodeObj?.elevationMode || cfg.elevationMode;
          const domainB = endNodeObj?.domain || domainA;
          const elevB = endNodeObj?.elevationMode || elevA;

          const portA = infraCreatePort({
            domain: domainA,
            elevationMode: elevA,
            pose: { position: addStartPos, elevationMeters: addStartPos[1] }
          });
          const portB = infraCreatePort({
            domain: domainB,
            elevationMode: elevB,
            pose: { position: targetPos, elevationMeters: targetPos[1] }
          });
          const compat = infraCheckPortCompatibility(portA, portB, { allowElevationModeTransition: true });
          if (!compat.compatible) {
            ctx.toast(`Cannot connect: ${compat.reasons.join('; ')}`);
          } else {
            const attachedEdge = startNodeObj
              ? (doc.edges || []).find((ed) => ed.startNodeId === startNodeObj.id || ed.endNodeId === startNodeObj.id)
              : null;
            const matchByDomain = attachedEdge && attachedEdge.domain === domainA
              ? attachedEdge
              : null;
            const fallbackPreset = domainA === cfg.domain
              ? infraGetPreset(cfg.presetId)
              : (doc.edges || []).find((ed) => ed.domain === domainA);
            const useFamilyId = matchByDomain?.familyId || (domainA === cfg.domain ? cfg.familyId : (fallbackPreset?.familyId || 'roads'));
            const usePresetId = matchByDomain?.presetId || fallbackPreset?.id || cfg.presetId;
            const baseParams = matchByDomain?.params || fallbackPreset?.params || infraGetPreset(cfg.presetId)?.params;

            const res = infraExecuteCommand(doc, {
              type: 'CONNECT_NODES',
              domain: domainA,
              familyId: useFamilyId,
              presetId: usePresetId,
              startNodeId: addStartNodeId,
              startPosition: addStartNodeId ? undefined : addStartPos,
              endNodeId: targetNodeId,
              endPosition: targetNodeId ? undefined : targetPos,
              elevationMode: elevA,
              params: baseParams ? JSON.parse(JSON.stringify(baseParams)) : undefined
            });
            if (res.ok) {
              ctx.rebuildAll(`Connected new ${domainA} segment`);
            } else {
              ctx.toast(res.reason || 'Connection failed');
            }
          }
        }
        addStartNodeId = null;
        addStartPos = null;
        clearRubberBand();
      }
    }
  };

  const onPointerMove = (e) => {
    if (!updatePointer(e)) return;
    const doc = ctx.getDoc();

    if (activeTool === 'move_node' && dragNodeId) {
      const node = infraFindNode(doc, dragNodeId);
      const pt = raycastPlaneY(dragPlaneY);
      if (node && pt) {
        node.position[0] = pt[0];
        node.position[2] = pt[2];
        dragChanged = true;
        ctx.rebuildLivePreview();
      }
      return;
    }

    if (activeTool === 'add_road' && addStartPos) {
      const cfg = getActiveCorridorCfg();
      const hitNodeId = pickNodeHandle();
      let dest = null;
      let valid = true;
      if (hitNodeId) {
        const tn = infraFindNode(doc, hitNodeId);
        if (tn && hitNodeId !== addStartNodeId) {
          dest = tn.position;
          const startNode = addStartNodeId ? infraFindNode(doc, addStartNodeId) : null;
          const domainA = startNode?.domain || cfg.domain;
          const elevA = startNode?.elevationMode || cfg.elevationMode;
          const compat = infraCheckPortCompatibility(
            infraCreatePort({ domain: domainA, elevationMode: elevA, pose: { position: addStartPos, elevationMeters: addStartPos[1] } }),
            infraCreatePort({ domain: tn.domain, elevationMode: tn.elevationMode, pose: { position: tn.position, elevationMeters: tn.position[1] } }),
            { allowElevationModeTransition: true }
          );
          valid = compat.compatible;
        }
      } else {
        dest = raycastPlaneY(addStartPos[1]);
      }
      if (dest) {
        rubberBandValid = valid;
        updateRubberBand(addStartPos, dest, rubberBandValid);
      }
    }
  };

  const onPointerUp = () => {
    if (dragNodeId) {
      const doc = ctx.getDoc();
      const node = infraFindNode(doc, dragNodeId);
      const finalPos = node ? [...node.position] : null;
      const movedId = dragNodeId;
      dragNodeId = null;
      const orbit = ctx.getOrbit();
      if (orbit) orbit.enabled = true;

      if (dragChanged && finalPos && node) {
        if (dragOriginPos) {
          node.position = [...dragOriginPos];
        }
        infraExecuteCommand(doc, {
          type: 'MOVE_NODE',
          nodeId: movedId,
          position: finalPos
        });
        ctx.rebuildAll(`Moved ${movedId}`);
      }
      dragOriginPos = null;
      dragChanged = false;
    }
  };

  return {
    attach(canvas) {
      if (!canvas) return;
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    setTool(tool) {
      activeTool = tool || 'select';
      addStartNodeId = null;
      addStartPos = null;
      dragNodeId = null;
      clearRubberBand();
      const orbit = ctx.getOrbit();
      if (orbit) orbit.enabled = true;
    },
    getTool() {
      return activeTool;
    },
    setCorridorMode(mode) {
      if (ED_CORRIDOR_MODES[mode]) corridorMode = mode;
    },
    getCorridorMode() {
      return corridorMode;
    }
  };
}
