import { $, clamp, copy, rng32, randBetween, randInt, pick } from '../utils.js';
import { MATERIAL_CHOICES } from '../config.js';
import { generateBuildingBlueprint } from '../core/blueprints.js';
import { computePlayerReferenceSpots } from '../core/entrances.js';
import { solid, clearMaterialCache } from '../geometry/materials.js';
import { box, cylinder, line, worldRoot } from '../geometry/primitives.js';
import { fileDownload, safeName } from './export.js';

export function createDebugLabelSprite(title, subtitle, borderHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(7, 19, 30, 0.92)';
    ctx.fillRect(6, 6, 500, 128);
    ctx.lineWidth = 5;
    ctx.strokeStyle = borderHex;
    ctx.strokeRect(6, 6, 500, 128);
    ctx.fillStyle = '#e9fbff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(title).slice(0, 32), 256, 48);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(subtitle || '').slice(0, 36), 256, 92);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.6, 0.98, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function getEntranceCategoryColor(category, role) {
  if (role === 'main') return '#00f5d4'; // Primary entrance (cyan)
  if (category === 'secondary' || role === 'corner_secondary' || String(role).startsWith('side_')) return '#3a86ff'; // Secondary entrance (blue)
  if (category === 'service' || role === 'rear_service' || role === 'basement_access' || role === 'delivery_entrance') return '#ffbe0b'; // Service entrance (amber)
  if (category === 'roof_access' || role === 'roof_access') return '#9d4edd'; // Rooftop access (purple)
  if (category === 'mission') return '#ff006e'; // Mission entrance (magenta)
  if (category === 'decorative') return '#94a3b8'; // Decorative (slate)
  return '#00f5d4';
}

export function buildEntranceDebugGizmos(parent, blueprint, view = {}) {
  if (!blueprint || !Array.isArray(blueprint.entrances)) return;

  const showVolumes = view.showEntranceVolumes !== false;
  const showDirections = view.showEntranceDirections !== false;
  const showLabels = view.showEntranceLabels !== false;
  const showApproach = view.showEntranceApproach !== false;

  for (const ent of blueprint.entrances) {
    const gizmoRoot = worldRoot(parent);
    gizmoRoot.name = 'EntranceDebug_' + ent.id;

    const isInteractive = Boolean(ent.interactive);
    const isLocked = Boolean(ent.lockedByDefault);
    const categoryColor = getEntranceCategoryColor(ent.category, ent.role);
    const primaryHex = !isInteractive ? '#94a3b8' : (isLocked ? '#fb5607' : categoryColor);
    const anchorHex = '#ff006e';
    const normalHex = '#00bbf9';
    const approachHex = '#38b000';
    const safeHex = '#80ed99';

    // Trigger box
    if (showVolumes) {
      const trig = ent.trigger;
      const trigGroup = worldRoot(gizmoRoot, trig.localCenter.x, trig.localCenter.y, trig.localCenter.z);
      trigGroup.rotation.y = ent.door.rotation.y;

      const boxGeo = new THREE.BoxGeometry(trig.width, trig.height, trig.depth);
      const boxMat = new THREE.MeshBasicMaterial({
        color: primaryHex,
        transparent: true,
        opacity: isInteractive ? 0.22 : 0.10,
        depthWrite: false
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.renderOrder = 990;
      trigGroup.add(boxMesh);

      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: primaryHex,
        transparent: true,
        opacity: 0.95
      });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesMesh.renderOrder = 991;
      trigGroup.add(edgesMesh);
    }

    // Entrance anchor
    const anchorPos = ent.door.position;
    const anchorMat = new THREE.MeshBasicMaterial({ color: anchorHex });
    const anchorMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), anchorMat);
    anchorMarker.position.set(anchorPos.x, anchorPos.y + 0.22, anchorPos.z);
    gizmoRoot.add(anchorMarker);

    const anchorRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.85 })
    );
    anchorRing.position.set(anchorPos.x, anchorPos.y + 0.025, anchorPos.z);
    gizmoRoot.add(anchorRing);

    // Normal arrow
    if (showDirections) {
      const arrowLen = 1.45;
      const arrowY = anchorPos.y + 0.45;
      const arrowGroup = worldRoot(gizmoRoot, anchorPos.x, arrowY, anchorPos.z);
      arrowGroup.rotation.y = ent.door.rotation.y;
      const arrowMat = new THREE.MeshBasicMaterial({ color: normalHex });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, arrowLen, 10), arrowMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 0, arrowLen * 0.5);
      arrowGroup.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 12), arrowMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0, arrowLen + 0.15);
      arrowGroup.add(head);
    }

    // Approach and safe position markers
    const appPos = ent.navigation.approachPosition;
    const nx = ent.door.normal.x;
    const nz = ent.door.normal.z;

    if (showApproach) {
      const appMat = new THREE.MeshBasicMaterial({ color: approachHex });
      const appDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 18), appMat);
      appDisc.position.set(appPos.x, appPos.y + 0.025, appPos.z);
      gizmoRoot.add(appDisc);
      const appBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8), appMat);
      appBeacon.position.set(appPos.x, appPos.y + 0.5, appPos.z);
      gizmoRoot.add(appBeacon);
      const appCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), appMat);
      appCap.position.set(appPos.x, appPos.y + 1.05, appPos.z);
      gizmoRoot.add(appCap);

      const safePos = ent.navigation.safePosition;
      const safeMat = new THREE.MeshBasicMaterial({ color: safeHex, transparent: true, opacity: 0.75 });
      const safeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 16), safeMat);
      safeDisc.position.set(safePos.x, safePos.y + 0.02, safePos.z);
      gizmoRoot.add(safeDisc);

      const linkMat = new THREE.MeshBasicMaterial({ color: normalHex, transparent: true, opacity: 0.55 });
      line(
        gizmoRoot,
        [anchorPos.x + nx * 0.1, anchorPos.y + 0.05, anchorPos.z + nz * 0.1],
        [appPos.x, appPos.y + 0.05, appPos.z],
        0.025,
        linkMat
      );
    }

    // Entrance label
    if (showLabels) {
      const statusTag = !isInteractive
        ? 'DECORATIVE'
        : isLocked
          ? `${(ent.category || '').toUpperCase()} • LOCKED`
          : (ent.category || '').toUpperCase();
      const elev = Number(ent.thresholdElevation ?? ent.door?.thresholdElevation ?? 0).toFixed(1);
      const title = `${ent.id} [${statusTag}]`;
      const subtitle = `${ent.width}x${ent.height}m • Y: ${elev}m • ${ent.facade || ent.door?.facade || 'front'}`;
      const sprite = createDebugLabelSprite(title, subtitle, primaryHex);
      sprite.position.set(
        anchorPos.x + nx * 0.35,
        anchorPos.y + ent.door.height + 0.95,
        anchorPos.z + nz * 0.35
      );
      gizmoRoot.add(sprite);
    }
  }
}

export function buildFireEscapeDebugGizmos(parent, blueprint, view = {}) {
  const feMeta = blueprint?.metadata?.fireEscape;
  if (!feMeta || !Array.isArray(feMeta.components)) return;

  const showLandings = view.showFireEscapeLandings !== false;
  const showTreads = view.showFireEscapeTreads !== false;
  const showStairs = view.showFireEscapeStairs !== false;
  const showRailings = view.showFireEscapeRailings !== false;
  const showLadders = view.showFireEscapeLadders !== false;
  const showClearance = view.showFireEscapeClearance !== false;
  const showRoute = view.showFireEscapeRoute !== false;

  const root = worldRoot(parent);
  root.name = 'FireEscapeDebugGizmos';

  // Player-clearance envelopes
  if (showClearance && Array.isArray(feMeta.clearanceVolumes)) {
    for (const cv of feMeta.clearanceVolumes) {
      if (cv.type === 'landing_clearance' && cv.position && cv.dimensions) {
        const boxGeo = new THREE.BoxGeometry(cv.dimensions.width, cv.dimensions.height, cv.dimensions.depth);
        const boxMat = new THREE.MeshBasicMaterial({
          color: '#06b6d4',
          transparent: true,
          opacity: 0.12,
          depthWrite: false
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(cv.position.x, cv.position.y, cv.position.z);
        boxMesh.renderOrder = 990;
        root.add(boxMesh);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeo),
          new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.45 })
        );
        edges.position.copy(boxMesh.position);
        edges.renderOrder = 991;
        root.add(edges);
      } else if (cv.type === 'flight_clearance' && cv.startPosition && cv.endPosition) {
        const p1 = [cv.startPosition.x, cv.startPosition.y, cv.startPosition.z];
        const p2 = [cv.endPosition.x, cv.endPosition.y, cv.endPosition.z];
        const flightMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.25, depthWrite: false });
        line(root, [p1[0], p1[1] + 1.025, p1[2]], [p2[0], p2[1] + 1.025, p2[2]], cv.clearanceWidth || 0.64, flightMat);
      } else if (cv.type === 'ladder_clearance' && cv.startPosition && cv.endPosition) {
        const lh = Math.abs(cv.endPosition.y - cv.startPosition.y);
        const midY = (cv.startPosition.y + cv.endPosition.y) * 0.5;
        const rad = cv.clearanceRadius || 0.35;
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(rad, rad, lh, 16),
          new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.18, depthWrite: false })
        );
        cyl.position.set(cv.startPosition.x, midY, cv.startPosition.z);
        cyl.renderOrder = 990;
        root.add(cyl);
      }
    }
  }

  // Street-to-rooftop walking route line
  if (showRoute && Array.isArray(feMeta.walkableRoutes)) {
    for (const rDef of feMeta.walkableRoutes) {
      const wps = rDef.waypoints || [];
      if (wps.length >= 2) {
        const isConn = rDef.connected !== false;
        const routeColor = isConn ? '#10b981' : '#f59e0b';
        const routeMat = new THREE.MeshBasicMaterial({ color: routeColor, transparent: true, opacity: 0.95 });

        for (let w = 0; w < wps.length - 1; w++) {
          const ptA = wps[w].position;
          const ptB = wps[w + 1].position;
          line(root, [ptA.x, ptA.y + 0.15, ptA.z], [ptB.x, ptB.y + 0.15, ptB.z], 0.045, routeMat);

          const beaconGeo = new THREE.SphereGeometry(0.09, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: '#6ee7b7' });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(ptA.x, ptA.y + 0.15, ptA.z);
          beacon.renderOrder = 996;
          root.add(beacon);
        }
        const lastPt = wps[wps.length - 1].position;
        const lastBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: '#34d399' }));
        lastBeacon.position.set(lastPt.x, lastPt.y + 0.15, lastPt.z);
        lastBeacon.renderOrder = 996;
        root.add(lastBeacon);
      }
    }
  }

  // Traversal status / warnings billboard
  if (view.showEntranceLabels !== false) {
    const topFloor = (blueprint?.settings?.floors || 5) - 1;
    const floorH = Number(blueprint?.settings?.floorHeight) || 3.3;
    const topY = topFloor * floorH;
    const topComp = feMeta.components.find((c) => c.floor === topFloor && c.type === 'landing');
    const labelX = topComp?.position?.x ?? 0;
    const labelZ = topComp?.position?.z ?? 0;

    if (Array.isArray(feMeta.warnings) && feMeta.warnings.length > 0) {
      const warnSprite = createDebugLabelSprite('Clearance Alert', feMeta.warnings[0], '#ef4444');
      warnSprite.position.set(labelX, topY + 2.2, labelZ);
      root.add(warnSprite);
    } else {
      const statusSprite = createDebugLabelSprite('Traversal Verified', 'Street to Rooftop Connected', '#10b981');
      statusSprite.position.set(labelX, topY + 2.2, labelZ);
      root.add(statusSprite);
    }
  }

  for (const comp of feMeta.components) {
    if (comp.traversal === 'walkable_surface' && showLandings) {
      const dims = comp.dimensions || { width: 1.5, length: 1.1, thickness: 0.08 };
      const deckGeo = new THREE.BoxGeometry(dims.width, 0.06, dims.length || dims.depth || 1.15);
      const deckMat = new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set(comp.position.x, comp.position.y + 0.03, comp.position.z);
      deckMesh.renderOrder = 992;
      root.add(deckMesh);

      const edgesGeo = new THREE.EdgesGeometry(deckGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: '#34d399', transparent: true, opacity: 0.95 });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesMesh.position.copy(deckMesh.position);
      edgesMesh.renderOrder = 993;
      root.add(edgesMesh);

      if (view.showEntranceLabels !== false) {
        const sprite = createDebugLabelSprite(`Landing F${comp.floor}`, `${comp.position.y.toFixed(1)}m elevation`, '#10b981');
        sprite.position.set(comp.position.x, comp.position.y + 0.55, comp.position.z);
        root.add(sprite);
      }
    } else if (comp.traversal === 'stair_tread' && showTreads) {
      const dims = comp.dimensions || { width: 0.36, height: 0.045, depth: 0.24 };
      const treadGeo = new THREE.BoxGeometry(dims.width, Math.max(0.04, dims.height), dims.depth);
      const treadMat = new THREE.MeshBasicMaterial({
        color: '#22c55e',
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      const treadMesh = new THREE.Mesh(treadGeo, treadMat);
      treadMesh.position.set(comp.position.x, comp.position.y, comp.position.z);
      treadMesh.renderOrder = 994;
      root.add(treadMesh);

      const treadEdgesGeo = new THREE.EdgesGeometry(treadGeo);
      const treadEdgesMat = new THREE.LineBasicMaterial({ color: '#86efac', transparent: true, opacity: 0.95 });
      const treadEdges = new THREE.LineSegments(treadEdgesGeo, treadEdgesMat);
      treadEdges.position.copy(treadMesh.position);
      treadEdges.renderOrder = 995;
      root.add(treadEdges);
    } else if ((comp.traversal === 'stair_flight' || comp.traversal === 'stair_ramp') && showStairs) {
      if (comp.startPosition && comp.endPosition) {
        const p1 = [comp.startPosition.x, comp.startPosition.y, comp.startPosition.z];
        const p2 = [comp.endPosition.x, comp.endPosition.y, comp.endPosition.z];
        const stairMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.85 });
        line(root, p1, p2, 0.08, stairMat);

        const mid = [
          (p1[0] + p2[0]) * 0.5,
          (p1[1] + p2[1]) * 0.5,
          (p1[2] + p2[2]) * 0.5
        ];
        const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), stairMat);
        beacon.position.set(mid[0], mid[1] + 0.15, mid[2]);
        root.add(beacon);
      } else if (comp.position && comp.dimensions) {
        const rampMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.35, depthWrite: false });
        const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(comp.dimensions.width, comp.dimensions.height, comp.dimensions.depth), rampMat);
        rampMesh.position.set(comp.position.x, comp.position.y, comp.position.z);
        rampMesh.renderOrder = 992;
        root.add(rampMesh);
      }
    } else if (comp.traversal === 'railing_barrier' && showRailings) {
      const dims = comp.dimensions || { length: 1.2, height: 1.0 };
      const railMat = new THREE.MeshBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.22, depthWrite: false });
      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(dims.length, dims.height, 0.05), railMat);
      railMesh.position.set(comp.position.x, comp.position.y + dims.height * 0.5, comp.position.z);
      railMesh.renderOrder = 991;
      root.add(railMesh);
    } else if (comp.traversal === 'climbable_ladder' && showLadders) {
      const startY = comp.startPosition.y;
      const endY = comp.endPosition.y;
      const lh = Math.abs(endY - startY);
      const midY = (startY + endY) * 0.5;
      const ladderColor = comp.isRoofAccess ? '#8b5cf6' : '#d946ef';

      const ladderMat = new THREE.MeshBasicMaterial({ color: ladderColor, transparent: true, opacity: 0.45, depthWrite: false });
      const ladderCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, lh, 12), ladderMat);
      ladderCyl.position.set(comp.startPosition.x, midY, comp.startPosition.z);
      ladderCyl.renderOrder = 992;
      root.add(ladderCyl);

      const ringMat = new THREE.MeshBasicMaterial({ color: ladderColor });
      for (const y of [startY, endY]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), ringMat);
        ring.position.set(comp.startPosition.x, y, comp.startPosition.z);
        root.add(ring);
      }

      if (view.showEntranceLabels !== false) {
        const tag = comp.isRoofAccess ? 'Roof Access Ladder' : `Drop Ladder [${comp.state.toUpperCase()}]`;
        const sprite = createDebugLabelSprite(tag, `${lh.toFixed(1)}m vertical climb`, ladderColor);
        sprite.position.set(comp.startPosition.x, endY + 0.45, comp.startPosition.z);
        root.add(sprite);
      }
    }
  }
}

export function buildPlayerScaleReference(parent, blueprint, view = {}) {
  const spots = computePlayerReferenceSpots(blueprint);
  if (!spots.length) return null;
  const requested = view.playerRefSpot || 'front_door';
  const spot = spots.find((s) => s.id === requested) || spots[0];

  const root = worldRoot(parent, spot.position.x, spot.position.y, spot.position.z);
  root.name = 'PlayerScaleReference';
  root.rotation.y = spot.yawRadians || 0;

  const skin = solid('#d8b193');
  const shirt = solid('#1f5a6e');
  const pants = solid('#242c38');
  const boots = solid('#1c1e22');
  const visor = solid('#0ea5e9');

  // Low-poly 1.82m human figure centered at feet (y = 0)
  for (const sx of [-0.10, 0.10]) {
    box(root, sx, 0.05, 0.03, 0.11, 0.10, 0.22, boots);
    box(root, sx, 0.29, 0.0, 0.10, 0.38, 0.11, pants);
    box(root, sx, 0.68, 0.0, 0.12, 0.40, 0.13, pants);
  }
  box(root, 0, 0.91, 0, 0.34, 0.06, 0.20, boots);
  box(root, 0, 1.19, 0, 0.40, 0.50, 0.22, shirt);
  for (const sx of [-0.26, 0.26]) {
    box(root, sx, 1.38, 0, 0.12, 0.13, 0.14, shirt);
    box(root, sx, 1.13, 0.01, 0.10, 0.38, 0.10, skin);
  }
  box(root, 0, 1.48, 0, 0.11, 0.08, 0.11, skin);
  box(root, 0, 1.67, 0, 0.21, 0.28, 0.22, skin);
  box(root, 0, 1.69, 0.105, 0.15, 0.06, 0.03, visor);

  // 0.60m capsule footprint ring + 2.05m headroom halo
  const capMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  });
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 2.05, 16, 1, true), capMat);
  capMesh.position.y = 1.025;
  capMesh.renderOrder = 993;
  root.add(capMesh);

  const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 });
  const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.31, 20), ringMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.015;
  root.add(baseRing);

  if (view.showEntranceLabels !== false) {
    const label = createDebugLabelSprite(`Player Ref (${spot.label})`, '1.82m Human / 0.60m Capsule', '#38bdf8');
    label.position.set(0, 2.38, 0);
    root.add(label);
  }
  return root;
}

export function rebuildDebugOverlay(debugGroup, view, buildingGroup) {
  if (!debugGroup) return;
  disposeObject(debugGroup, true);
  const showEntrances = Boolean(view.entranceDebug);
  const showFireEscape = Boolean(view.fireEscapeDebug);
  const showPlayerRef = Boolean(view.playerScaleRef);
  debugGroup.visible = showEntrances || showFireEscape || showPlayerRef;
  if (!debugGroup.visible || !buildingGroup) return;

  for (let i = 0; i < buildingGroup.children.length; i++) {
    const child = buildingGroup.children[i];
    const bp = child.userData?.blueprint || (child.userData?.settings ? generateBuildingBlueprint(child.userData.settings) : null);
    if (!bp) continue;
    const bldgDebug = worldRoot(debugGroup, child.position.x, child.position.y, child.position.z);
    bldgDebug.rotation.y = child.rotation.y;
    if (showEntrances) buildEntranceDebugGizmos(bldgDebug, bp, view);
    if (showFireEscape) buildFireEscapeDebugGizmos(bldgDebug, bp, view);
    if (showPlayerRef && i === 0) buildPlayerScaleReference(bldgDebug, bp, view);
  }
}

export function addStreetlamp(parent, x, z, lighting = 'day') {
  const metal = solid('#41464a');
  cylinder(parent, x, 2.2, z, 0.1, 0.15, 4.4, metal, 7);
  line(parent, [x, 4.3, z], [x + 0.75, 4.3, z], 0.085, metal);
  const lamp = solid(lighting === 'night' ? '#fff2c4' : '#dde7db');
  box(parent, x + 0.75, 4.15, z, 0.36, 0.22, 0.44, lamp);
  if (lighting === 'night') {
    const light = new THREE.PointLight('#ffe0ab', 0.5, 8, 2);
    light.position.set(x + 0.75, 4.05, z);
    parent.add(light);
  }
}

export function cityRoad(parent, central = false, depth = 11, lighting = 'day') {
  const roadway = solid('#343d43');
  const sidewalk = solid('#777b78');
  const white = solid('#d2cc9f');
  const roadZ = central ? 0 : Math.max(13, depth * 0.5 + 8);
  box(parent, 0, -0.21, roadZ, 210, 0.26, 12, roadway, { cast: false });
  box(parent, 0, -0.16, roadZ - 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
  box(parent, 0, -0.16, roadZ + 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
  for (let x = -100; x < 105; x += 9) box(parent, x, -0.062, roadZ, 4, 0.015, 0.18, white, { cast: false });
  for (let x = -65; x <= 65; x += 27) {
    addStreetlamp(parent, x, roadZ + 8.4, lighting);
    if (central) addStreetlamp(parent, x, roadZ - 8.4, lighting);
  }
  for (let x = -90; x < 91; x += 11) {
    box(parent, x, -0.1, roadZ + 5.85, 1.45, 0.028, 0.12, white, { cast: false });
    box(parent, x, -0.1, roadZ - 5.85, 1.45, 0.028, 0.12, white, { cast: false });
  }
}

export function disposeObject(group, disposeMaterials = true) {
  if (!group) return;
  const geometries = new Set();
  const mats = new Set();
  const textures = new Set();
  group.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    if (obj.material) {
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) mats.add(mat);
    }
  });
  geometries.forEach((g) => g.dispose());
  if (disposeMaterials) {
    mats.forEach((m) => {
      if (m.map) textures.add(m.map);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
  }
  group.clear();
}

export function rebuildEnvironment(environmentGroup, view, state) {
  if (!environmentGroup) return;
  disposeObject(environmentGroup, false);
  const plat = solid(view.environment === 'studio' ? '#40545d' : '#5d655b');
  if (view.environment !== 'none') {
    const extent = view.mode === 'single' ? 55 : 125;
    box(environmentGroup, 0, -0.41, 0, extent * 2, 0.38, extent * 2, plat, { cast: false });
    if (view.environment === 'street') {
      cityRoad(environmentGroup, view.mode === 'block', state.depth, view.lighting);
      const curb = solid('#8e928b');
      if (view.mode === 'single') {
        for (const s of [-1, 1]) box(environmentGroup, s * (state.width * 0.5 + 3), -0.06, state.depth * 0.5 + 2.5, 4, 0.12, 4, curb, { cast: false });
      }
    }
  }
  if (view.grid) {
    const size = view.mode === 'single' ? 65 : 130;
    const groundGrid = new THREE.GridHelper(size, Math.round(size / 2), 0x315663, 0x264451);
    groundGrid.position.y = -0.115;
    environmentGroup.add(groundGrid);
  }
}

const BLOCK_SIGN_TEXTS = [
  'CORNER MARKET', 'BAKERY & CAFE', 'APOTHECARY', 'HARDWARE CO.', 'BOOKSHOP',
  'DELI & GROCERY', 'CITY DINER', 'TAILOR & DRY CLEAN', 'ARCADE', 'PHARMACY',
  'BARBERSHOP', 'HARDWARE & TOOLS', 'TEA HOUSE', 'NEWSSTAND'
];

const AWNING_PALETTE = [
  '#8e3b3b', '#a14248', '#2f5d50', '#35546c', '#7a5230', '#5a3d5c', '#3d4f60', '#8c583a'
];

export function createBlockVariant(baseCfg, side, n, totalOnSide = 5, locks = new Set()) {
  const seed = baseCfg.seed + side * 3001 + n * 4177;
  const r = rng32(seed);
  const cfg = { ...copy(baseCfg), seed, cutaway: false, inspectedFloor: 0, interiorMode: 'none' };
  const isEndLot = n === 0 || n === totalOnSide - 1;
  const isHero = side === 0 && n === Math.floor(totalOnSide / 2);

  if (isHero) return cfg;

  const canVary = (key) => !locks.has(key);

  if (canVary('width')) {
    const wDelta = Math.round(randBetween(r, -3.5, 4.0) * 2) * 0.5;
    cfg.width = clamp(baseCfg.width + wDelta, 7, 28);
  }
  if (canVary('depth')) {
    const dDelta = Math.round(randBetween(r, -2.5, 3.5) * 2) * 0.5;
    cfg.depth = clamp(baseCfg.depth + dDelta, 7, 26);
  }
  if (canVary('floors')) {
    cfg.floors = clamp(baseCfg.floors + randInt(r, -2, 3), 2, 14);
  }
  if (canVary('floorHeight')) {
    const fhDelta = Math.round(randBetween(r, -0.25, 0.3) * 10) / 10;
    cfg.floorHeight = clamp(Number((baseCfg.floorHeight + fhDelta).toFixed(1)), 2.8, 4.4);
  }
  if (canVary('footprint')) {
    const fpPool = isEndLot
      ? [baseCfg.footprint, 'corner', 'L', 'rectangle', 'corner']
      : [baseCfg.footprint, 'rectangle', 'L', 'U', 'rectangle', 'corner'];
    cfg.footprint = pick(r, fpPool);
  }
  if (canVary('extension')) {
    const extPool = [baseCfg.extension, 0, 0, 1, 1, 2, 3];
    cfg.extension = pick(r, extPool);
  }
  if (canVary('setback')) {
    if (cfg.floors >= 4 && r() < (baseCfg.setback > 0 ? 0.72 : 0.45)) {
      cfg.setback = pick(r, [0.5, 0.75, 1.0, 1.25, 1.5, 1.75]);
    } else {
      cfg.setback = 0;
    }
  }
  if (canVary('cornerCut')) {
    if (cfg.footprint === 'corner') {
      cfg.cornerCut = pick(r, [1.25, 1.5, 1.75, 2.0, 2.25]);
    } else if ((isEndLot && r() < 0.55) || r() < 0.28) {
      cfg.cornerCut = pick(r, [1.0, 1.25, 1.5, 1.75, 2.0]);
    } else {
      cfg.cornerCut = 0;
    }
  }

  if (canVary('roofType')) {
    const styleRoofPools = {
      brownstone: ['mansard', 'flat', 'stepped', 'pitched'],
      artdeco: ['stepped', 'flat', 'stepped'],
      modern: ['flat', 'stepped', 'flat'],
      commercial: ['flat', 'stepped', 'mansard'],
      brick: ['flat', 'stepped', 'mansard', 'pitched']
    };
    const pool = styleRoofPools[cfg.style] || ['flat', 'stepped', 'mansard', 'pitched'];
    cfg.roofType = r() < 0.45 ? baseCfg.roofType : pick(r, pool);
  }
  if (canVary('parapet')) {
    cfg.parapet = cfg.roofType === 'pitched' ? r() < 0.35 : r() < 0.82;
  }
  if (canVary('parapetHeight')) {
    cfg.parapetHeight = Number((0.3 + randInt(r, 0, 14) * 0.05).toFixed(2));
  }
  if (canVary('roofColor') && r() < 0.6) {
    cfg.roofColor = pick(r, [baseCfg.roofColor, '#343b43', '#3d3938', '#464d52', '#2f353b', '#4d443f']);
  }

  if (canVary('wallColor') && r() < 0.65) {
    cfg.wallColor = pick(r, [
      baseCfg.wallColor,
      baseCfg.secondaryWallColor,
      ...MATERIAL_CHOICES
    ]);
  }
  if (canVary('groundFloorMaterial') && r() < 0.45) {
    cfg.groundFloorMaterial = pick(r, ['stone', 'brick', 'concrete', 'painted']);
  }
  if (canVary('facadeAccent') && r() < 0.55) {
    cfg.facadeAccent = pick(r, [baseCfg.facadeAccent, 'cornice', 'ornate', 'vertical', 'none']);
  }
  if (canVary('trimAmount')) {
    cfg.trimAmount = clamp(Number((baseCfg.trimAmount + randBetween(r, -0.25, 0.25)).toFixed(2)), 0.1, 0.95);
  }
  if (canVary('windowStyle') && r() < 0.5) {
    cfg.windowStyle = pick(r, [baseCfg.windowStyle, 'sash', 'arched', 'tall', 'modern', 'square']);
  }
  if (canVary('windowsX')) {
    const idealCols = clamp(Math.round(cfg.width / 3.1) + randInt(r, -1, 1), 2, 7);
    cfg.windowsX = idealCols;
  }
  if (canVary('windowsSide')) {
    cfg.windowsSide = clamp(Math.round(cfg.depth / 3.4) + randInt(r, -1, 1), 2, 5);
  }
  if (canVary('windowLighting')) {
    cfg.windowLighting = clamp(baseCfg.windowLighting + randBetween(r, -0.12, 0.25), 0, 1);
  }
  if (canVary('shutters')) {
    cfg.shutters = r() < (baseCfg.shutters ? 0.65 : 0.28);
  }
  if (canVary('curtains')) {
    cfg.curtains = r() < (baseCfg.curtains ? 0.75 : 0.45);
  }

  if (canVary('groundUse')) {
    const groundPools = {
      brownstone: ['residential', 'residential', 'shop', 'lobby'],
      commercial: ['shop', 'shop', 'lobby', 'residential'],
      mixed: ['shop', 'residential', 'shop', 'lobby'],
      artdeco: ['lobby', 'shop', 'lobby', 'residential'],
      modern: ['lobby', 'shop', 'residential']
    };
    const gPool = groundPools[cfg.style] || [baseCfg.groundUse, 'residential', 'shop', 'lobby'];
    cfg.groundUse = pick(r, gPool);
  }
  if (canVary('doorStyle')) {
    const doorPool = cfg.groundUse === 'shop'
      ? ['double', 'single', 'double']
      : cfg.groundUse === 'lobby'
        ? ['double', 'stoop', 'single']
        : ['stoop', 'single', 'double', 'stoop'];
    cfg.doorStyle = pick(r, doorPool);
  }
  if (canVary('entranceSteps')) {
    if (cfg.groundUse === 'shop') {
      cfg.entranceSteps = 0;
    } else if (cfg.doorStyle === 'stoop') {
      cfg.entranceSteps = randInt(r, 2, 6);
    } else {
      cfg.entranceSteps = pick(r, [0, 0, 1, 2, 3, 4]);
    }
  }
  if (canVary('awning')) {
    const awningChance = cfg.groundUse === 'shop' ? 0.72 : (cfg.groundUse === 'lobby' ? 0.48 : 0.32);
    cfg.awning = r() < awningChance;
  }
  if (canVary('awningColor') && cfg.awning) {
    cfg.awningColor = pick(r, [baseCfg.awningColor, ...AWNING_PALETTE]);
  }
  if (canVary('signage')) {
    if (cfg.groundUse === 'shop') {
      cfg.signage = pick(r, ['shop', 'shop', 'marquee', 'none']);
    } else if (cfg.groundUse === 'lobby') {
      cfg.signage = pick(r, ['none', 'marquee', 'none']);
    } else {
      cfg.signage = r() < 0.15 ? 'marquee' : 'none';
    }
  }
  if (canVary('signText') && cfg.signage !== 'none') {
    cfg.signText = pick(r, [baseCfg.signText, ...BLOCK_SIGN_TEXTS]);
  }

  if (canVary('fireEscape')) {
    cfg.fireEscape = cfg.floors >= 3 && r() < (baseCfg.fireEscape ? 0.58 : 0.35);
  }
  if (canVary('balconies')) {
    cfg.balconies = r() < 0.45 ? pick(r, [0.15, 0.25, 0.4, 0.6]) : 0;
  }
  if (canVary('acUnits')) {
    cfg.acUnits = r() < (baseCfg.acUnits ? 0.68 : 0.38);
  }
  if (canVary('rooftopProps')) {
    cfg.rooftopProps = Number(randBetween(r, 0.15, 0.65).toFixed(2));
  }
  if (canVary('rooftopWaterTank')) {
    cfg.rooftopWaterTank = cfg.floors >= 4 && r() < (baseCfg.rooftopWaterTank ? 0.6 : 0.35);
  }
  if (canVary('skylights')) {
    cfg.skylights = r() < 0.35;
  }
  if (canVary('chimneys')) {
    cfg.chimneys = randInt(r, 0, 3);
  }
  if (canVary('antennas')) {
    cfg.antennas = r() < 0.55;
  }
  if (canVary('rooftopPipes')) {
    cfg.rooftopPipes = r() < 0.65;
  }

  return cfg;
}

export function buildingAt(group, createBuilding, cfg, x, z, rotation, seedOffset) {
  const fresh = createBuilding({ ...cfg, seed: cfg.seed + seedOffset }, { seedOffset });
  fresh.position.set(x, 0, z);
  fresh.rotation.y = rotation;
  group.add(fresh);
  return fresh;
}

export function resetCamera(camera, orbit, buildingGroup) {
  if (!camera || !buildingGroup) return null;
  const bbox = new THREE.Box3().setFromObject(buildingGroup);
  if (bbox.isEmpty()) return null;
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const dist = clamp(Math.max(size.x, size.z) * 1.4 + size.y * 0.5, 23, 135);
  camera.position.set(center.x + dist * 0.83, center.y + dist * 0.54, center.z + dist * 0.87);
  orbit.target.set(center.x, center.y * 0.83, center.z);
  camera.far = Math.max(300, dist * 5);
  camera.updateProjectionMatrix();
  orbit.update();
  return center;
}

export async function snapshot(renderer, scene, camera, state, ready, toast) {
  if (!ready) {
    if (toast) toast('3D preview is not ready yet');
    return;
  }
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (blob) {
      fileDownload(blob, 'b-building-' + safeName(state) + '.png');
      if (toast) toast('Preview saved');
    }
  }, 'image/png');
}

export function toggleTheatreMode(view, toast, onResize) {
  view.theatre = !view.theatre;
  const studio = $('#building-studio');
  const btn = $('#btn-theatre');
  const btnTop = $('#btn-theatre-quick');
  if (studio) studio.classList.toggle('theatre-mode', view.theatre);
  if (btn) {
    btn.classList.toggle('active', view.theatre);
    btn.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
  }
  if (btnTop) {
    btnTop.classList.toggle('active', view.theatre);
    btnTop.innerHTML = view.theatre
      ? '<i class="fas fa-columns"></i><span> Standard Layout</span>'
      : '<i class="fas fa-film"></i><span> Theatre</span>';
    btnTop.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
  }
  if (toast) toast(view.theatre ? 'Theatre mode on (T)' : 'Standard layout restored');
  if (onResize) {
    setTimeout(onResize, 40);
    setTimeout(onResize, 220);
  }
}

export function isFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return !!(document.fullscreenElement || (frame && frame.classList.contains('is-fullscreen')));
}

export function updateFullscreenUI(view, active, onResize) {
  view.fullscreen = active;
  const frame = $('.studio-viewport-frame');
  const btn = $('#btn-fullscreen');
  const btnTop = $('#btn-fullscreen-quick');
  if (frame) frame.classList.toggle('is-fullscreen', active);
  document.body.classList.toggle('studio-fullscreen-active', active);

  if (btn) {
    btn.classList.toggle('active', active);
    btn.innerHTML = active ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
    btn.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
    btn.setAttribute('aria-label', btn.title);
  }
  if (btnTop) {
    btnTop.classList.toggle('active', active);
    btnTop.innerHTML = active
      ? '<i class="fas fa-compress"></i><span> Exit Fullscreen</span>'
      : '<i class="fas fa-expand"></i><span> Fullscreen</span>';
    btnTop.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
  }
  if (onResize) {
    setTimeout(onResize, 40);
    setTimeout(onResize, 220);
  }
}

export function enterFullscreenViewport(view, toast, onResize) {
  const frame = $('.studio-viewport-frame');
  updateFullscreenUI(view, true, onResize);
  if (frame && !document.fullscreenElement && frame.requestFullscreen) {
    frame.requestFullscreen().catch(() => {});
  }
  if (toast) toast('Full-Screen Mode active (Esc or F to exit)');
}

export function exitFullscreenViewport(view, toast, onResize) {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  updateFullscreenUI(view, false, onResize);
  if (toast) toast('Exited Full-Screen Mode');
}

export function toggleFullscreenViewport(view, toast, onResize) {
  if (isFullscreenActive()) {
    exitFullscreenViewport(view, toast, onResize);
  } else {
    enterFullscreenViewport(view, toast, onResize);
  }
}

export function handleFullscreenChange(view, onResize) {
  const frame = $('.studio-viewport-frame');
  const isNowFull = !!document.fullscreenElement;
  if (isNowFull) {
    updateFullscreenUI(view, true, onResize);
  } else if (frame && frame.classList.contains('is-fullscreen')) {
    updateFullscreenUI(view, false, onResize);
  }
}

export function handleStudioKeydown(e, actions = {}) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    if (actions.toggleFullscreen) actions.toggleFullscreen();
  } else if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    if (actions.toggleTheatre) actions.toggleTheatre();
  } else if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    if (actions.toggleEntranceDebug) actions.toggleEntranceDebug();
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (actions.snapshot) actions.snapshot();
  } else if (e.key === 'Escape') {
    if (isFullscreenActive() && actions.exitFullscreen) {
      actions.exitFullscreen();
    }
  }
}
