import { infraFindNode } from '../core/network-graph.js';

export function prvDisposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material && child.userData?.disposeMaterial && typeof child.material.dispose === 'function') {
      child.material.dispose();
    }
  });
}

export function prvAttachFallbackOrbit(camera, domElement, targetVec) {
  let dragging = false;
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  const target = targetVec ? targetVec.clone() : new THREE.Vector3(0, 0, 0);

  const offset = camera.position.clone().sub(target);
  let radius = Math.max(4, offset.length());
  let theta = Math.atan2(offset.x, offset.z);
  let phi = Math.acos(Math.max(-0.98, Math.min(0.98, offset.y / radius)));

  const syncCamera = () => {
    phi = Math.max(0.12, Math.min(Math.PI * 0.48, phi));
    radius = Math.max(5, Math.min(260, radius));
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  };

  let enabled = true;
  const onDown = (e) => {
    if (!enabled) return;
    if (e.button === 2 || e.shiftKey) panning = true;
    else if (e.button === 0) dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMove = (e) => {
    if (!enabled || (!dragging && !panning)) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragging) {
      theta -= dx * 0.008;
      phi -= dy * 0.008;
      syncCamera();
    } else if (panning) {
      const panSpeed = radius * 0.0018;
      const right = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
      const forward = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      target.addScaledVector(right, -dx * panSpeed);
      target.addScaledVector(forward, -dy * panSpeed);
      syncCamera();
    }
  };
  const onUp = () => {
    dragging = false;
    panning = false;
  };
  const onWheel = (e) => {
    if (!enabled) return;
    e.preventDefault();
    radius *= e.deltaY > 0 ? 1.08 : 0.92;
    syncCamera();
  };

  domElement.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  domElement.addEventListener('wheel', onWheel, { passive: false });
  domElement.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    target,
    get enabled() { return enabled; },
    set enabled(v) { enabled = Boolean(v); },
    autoRotate: false,
    update() {
      if (this.autoRotate && !dragging) {
        theta += 0.005;
      }
      const off = camera.position.clone().sub(this.target);
      radius = Math.max(5, off.length());
      theta = Math.atan2(off.x, off.z);
      phi = Math.acos(Math.max(-0.98, Math.min(0.98, off.y / radius)));
      syncCamera();
    }
  };
}

export function prvUpdateLighting(lightingTime, scene, hemiLight, keyLight, rimLight) {
  const presets = {
    day: { bg: 0x162231, hemiSky: 0xdff2ff, hemiGround: 0x3b444f, hemiInt: 0.78, keyCol: 0xfff5e0, keyInt: 0.95, rimInt: 0.35 },
    golden_hour: { bg: 0x261d2b, hemiSky: 0xffcda3, hemiGround: 0x39313d, hemiInt: 0.65, keyCol: 0xffb366, keyInt: 1.05, rimInt: 0.4 },
    dusk: { bg: 0x111726, hemiSky: 0x7da4d4, hemiGround: 0x202736, hemiInt: 0.52, keyCol: 0x99b8ff, keyInt: 0.65, rimInt: 0.45 },
    night: { bg: 0x090e17, hemiSky: 0x45628c, hemiGround: 0x111722, hemiInt: 0.42, keyCol: 0x7da7d9, keyInt: 0.45, rimInt: 0.45 }
  };
  const p = presets[lightingTime] || presets.day;
  if (scene) scene.background = new THREE.Color(p.bg);
  if (hemiLight) {
    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiInt;
  }
  if (keyLight) {
    keyLight.color.setHex(p.keyCol);
    keyLight.intensity = p.keyInt;
  }
  if (rimLight) {
    rimLight.intensity = p.rimInt;
  }
}

export function prvRebuildEnvironment(envRoot, showGrid) {
  while (envRoot.children.length) {
    const c = envRoot.children.pop();
    prvDisposeObject(c);
  }
  if (showGrid) {
    // Ground reference grid lowered cleanly to y = -0.08 so it never z-fights with grade asphalt!
    const grid = new THREE.GridHelper(160, 40, 0x2b506e, 0x1b2d40);
    grid.position.y = -0.08;
    envRoot.add(grid);
  }
}

export function prvBuildHumanScaleRef() {
  const g = new THREE.Group();
  g.name = 'ScaleRef_1_82m';
  g.userData = { layer: 'LayerE_DebugAndContext' };

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4de2ff });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x6ce8ac, transparent: true, opacity: 0.35, depthWrite: false });

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.9, 8), bodyMat);
  legs.position.y = 0.45;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.24), bodyMat);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bodyMat);
  head.position.y = 1.68;
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.32, 20), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.18;

  g.add(legs, torso, head, halo);
  g.traverse((o) => {
    o.userData = { ...(o.userData || {}), layer: 'LayerE_DebugAndContext', disposeMaterial: true };
  });
  return g;
}

export function prvRebuildDebugOverlay(debugRoot, doc, solved, overlayOpts = {}) {
  while (debugRoot.children.length) {
    const c = debugRoot.children.pop();
    prvDisposeObject(c);
  }

  debugRoot.userData = { layer: 'LayerE_DebugAndContext' };
  const active = Boolean(overlayOpts.enabled);
  const showNodes = active && overlayOpts.nodes !== false;
  const showPorts = active && overlayOpts.ports !== false;
  const showCenterlines = active && overlayOpts.centerlines !== false;
  const showCrossings = active && overlayOpts.crossings !== false;
  const showMasks = active && Boolean(overlayOpts.terrainMasks);
  const showClearances = active && overlayOpts.clearances !== false;
  const showScaleRef = Boolean(overlayOpts.humanRef);

  const selection = doc?.selection || {};

  // Always keep interactive node hit-handles clickable even when full debug overlays are off
  // (small subtle rings when overlays off; full bright spheres when overlays on)
  const nodeHitGroup = new THREE.Group();
  nodeHitGroup.name = 'Debug_Nodes';
  const sphereGeo = new THREE.SphereGeometry(showNodes ? 0.85 : 0.42, 12, 10);

  for (const node of doc?.nodes || []) {
    const isSel = selection.kind === 'node' && selection.id === node.id;
    const hasErr = (solved?.diagnostics?.issues || []).some((i) => i.targetId === node.id && i.severity === 'error');
    const col = hasErr
      ? 0xff5c7c
      : isSel
        ? 0x6ce8ac
        : node.kind === 'switch'
          ? 0xff9f43
          : node.elevationMode === 'underground'
            ? 0xe08cff
            : node.domain === 'waterway'
              ? 0x26c6da
              : (node.domain === 'power' || node.domain === 'pipe' || node.domain === 'telecom')
                ? 0xffc43d
                : (node.elevationMode === 'suspended' || node.domain === 'suspended_rail')
                  ? 0x7c8cff
                  : node.elevationMode === 'elevated'
                    ? 0xb589ff
                    : node.kind === 'junction'
                      ? 0xffd166
                      : 0x4de2ff;

    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: !showNodes && !isSel,
      opacity: showNodes || isSel ? 0.95 : 0.45
    });
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.set(node.position[0], node.position[1] + 0.45, node.position[2]);
    m.userData = {
      layer: 'LayerE_DebugAndContext',
      pickKind: 'node',
      nodeId: node.id,
      disposeMaterial: true
    };
    nodeHitGroup.add(m);
  }
  debugRoot.add(nodeHitGroup);

  if (showCenterlines && solved?.sampledEdgesById) {
    for (const edge of doc?.edges || []) {
      const samp = solved.sampledEdgesById.get(edge.id);
      if (!samp || samp.frames.length < 2) continue;
      const isSel = selection.kind === 'edge' && selection.id === edge.id;
      const pts = samp.frames.map((f) => new THREE.Vector3(f.position[0], f.position[1] + 0.12, f.position[2]));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const col = isSel ? 0x6ce8ac : (edge.elevationMode === 'elevated' ? 0xc084fc : 0x00fffe);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col }));
      line.userData = { layer: 'LayerE_DebugAndContext', pickKind: 'edge', edgeId: edge.id, disposeMaterial: true };
      debugRoot.add(line);
    }
  }

  if (showPorts && solved?.edgePortsById) {
    const portConeGeo = new THREE.ConeGeometry(0.32, 0.9, 8);
    for (const edge of doc?.edges || []) {
      const ports = solved.edgePortsById.get(edge.id);
      if (!ports) continue;
      for (const port of [ports.startPort, ports.endPort]) {
        const node = infraFindNode(doc, edge.startNodeId === port.ownerId ? null : null);
        void node;
        const p = port.pose.position;
        const t = port.pose.tangent;
        const connected = Boolean(port.connectedTo);
        const col = connected ? 0x6ce8ac : 0x4de2ff;
        const cone = new THREE.Mesh(portConeGeo, new THREE.MeshBasicMaterial({ color: col }));
        cone.position.set(p[0] + t[0] * 1.1, p[1] + 0.35 + t[1] * 1.1, p[2] + t[2] * 1.1);
        const dir = new THREE.Vector3(t[0], t[1], t[2]).normalize();
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        cone.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
        debugRoot.add(cone);
      }
    }
  }

  if (showCrossings && solved?.crossings?.length) {
    for (const c of solved.crossings) {
      const h = Math.max(0.5, c.upperDatumY - c.lowerDatumY);
      const col = c.crossingKind === 'grade_separated' && c.valid ? 0x6ce8ac : 0xff5c7c;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, h, 8),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.72 })
      );
      pillar.position.set(c.intersectionXZ[0], c.lowerDatumY + h * 0.5, c.intersectionXZ[1]);
      pillar.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
      debugRoot.add(pillar);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.35, 24),
        new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.intersectionXZ[0], c.lowerDatumY + 0.08, c.intersectionXZ[1]);
      ring.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
      debugRoot.add(ring);
    }
  }

  if (showMasks && solved?.surfaceOwnership?.terrainOperations?.length) {
    for (const op of solved.surfaceOwnership.terrainOperations) {
      const poly = op.polygonXZ;
      if (!poly || poly.length < 3) continue;
      const y = (op.targetElevationMeters ?? op.deckElevationMeters ?? 0) + 0.2;
      const pts = poly.map((p) => new THREE.Vector3(p[0], y, p[1]));
      pts.push(pts[0].clone());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const col = op.op === 'replace_terrain' ? 0xff9f43 : op.op === 'excavate_terrain' ? 0xff5c7c : (op.op === 'elevated_clearance' ? 0xb589ff : 0x6ce8ac);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col }));
      line.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
      debugRoot.add(line);
    }
  }

  if (showScaleRef) {
    const man = prvBuildHumanScaleRef();
    const firstNode = doc?.nodes?.[0];
    if (firstNode) {
      man.position.set(firstNode.position[0] + 2.8, firstNode.position[1] + 0.15, firstNode.position[2] + 2.8);
    }
    debugRoot.add(man);
  }

  if (showClearances && solved?.sampledEdgesById) {
    for (const edge of doc?.edges || []) {
      const samp = solved.sampledEdgesById.get(edge.id);
      const prof = solved.profilesByEdgeId?.get(edge.id);
      if (!samp?.frames?.length || !prof) continue;

      const isSuspended =
        edge.elevationMode === 'suspended' ||
        edge.domain === 'suspended_rail' ||
        edge.params?.transitSystem === 'suspended_monorail';
      const isSelectedRail =
        selection.kind === 'edge' &&
        selection.id === edge.id &&
        (edge.domain === 'rail' || edge.domain === 'tram' || prof.hasEmbeddedTram);

      if (isSuspended && prof.hangingClearance) {
        const dropH = Number(prof.hangingClearance.dropHeightMeters) || 3.6;
        const hangW = Number(prof.hangingClearance.widthMeters) || 2.4;
        const bogieOff = Number(prof.hangingClearance.bogieOffsetY) || 0.45;
        const trackOffsets = prof.trackCenterOffsets?.length ? prof.trackCenterOffsets : [0];
        const envH = Math.max(0.8, dropH - bogieOff);
        const step = Math.max(2, Math.floor(samp.frames.length / 4));

        for (let i = 1; i < samp.frames.length - 1; i += step) {
          const fr = samp.frames[i];
          const rotY = Math.atan2(fr.tangent[0], fr.tangent[2]);
          for (const tx of trackOffsets) {
            const cx = fr.position[0] + fr.right[0] * tx;
            const cz = fr.position[2] + fr.right[2] * tx;
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(hangW, envH, 5.2),
              new THREE.MeshBasicMaterial({ color: 0x00fffe, transparent: true, opacity: 0.2, depthWrite: false })
            );
            box.position.set(cx, fr.position[1] - bogieOff - envH * 0.5, cz);
            box.rotation.y = rotY;
            box.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
            debugRoot.add(box);

            // Ground clearance vertical plumb line from cabin bottom to ground y=0
            const botY = fr.position[1] - dropH;
            const okClear = botY >= 4.49;
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(cx, Math.max(0, botY), cz),
              new THREE.Vector3(cx, 0, cz)
            ]);
            const plumb = new THREE.Line(
              lineGeo,
              new THREE.LineBasicMaterial({ color: okClear ? 0x6ce8ac : 0xff5c7c })
            );
            plumb.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
            debugRoot.add(plumb);
          }
        }
      } else if (isSelectedRail) {
        const trackOffsets = prof.hasEmbeddedTram ? (prof.tramTrackOffsets || [0]) : (prof.trackCenterOffsets || [0]);
        const midFr = samp.frames[Math.floor(samp.frames.length * 0.5)];
        const rotY = Math.atan2(midFr.tangent[0], midFr.tangent[2]);
        for (const tx of trackOffsets) {
          const envMesh = new THREE.Mesh(
            new THREE.BoxGeometry(2.9, 3.9, Math.min(12, samp.trimmedLengthMeters * 0.4)),
            new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16, depthWrite: false })
          );
          envMesh.position.set(
            midFr.position[0] + midFr.right[0] * tx,
            midFr.position[1] + 2.25,
            midFr.position[2] + midFr.right[2] * tx
          );
          envMesh.rotation.y = rotY;
          envMesh.userData = { layer: 'LayerE_DebugAndContext', disposeMaterial: true };
          debugRoot.add(envMesh);
        }
      }
    }
  }
}

export function prvSetCameraFocus(focus, camera, orbit, doc) {
  if (!camera || !orbit) return;
  if (focus === 'street') {
    camera.position.set(-24, 3.2, 16);
    orbit.target.set(0, 1.2, 0);
  } else if (focus === 'overpass') {
    camera.position.set(-34, 14, 24);
    orbit.target.set(-15, 3.2, 0);
  } else if (focus === 'station') {
    const stnEdge = (doc?.edges || []).find((e) => e.params?.includeStation || (e.params?.includePlatform && e.params.includePlatform !== 'none'));
    if (stnEdge) {
      const s = (doc?.nodes || []).find((n) => n.id === stnEdge.startNodeId);
      const e = (doc?.nodes || []).find((n) => n.id === stnEdge.endNodeId);
      const mx = ((s?.position[0] || 0) + (e?.position[0] || 0)) * 0.5;
      const my = ((s?.position[1] || 0) + (e?.position[1] || 0)) * 0.5;
      const mz = ((s?.position[2] || 0) + (e?.position[2] || 0)) * 0.5;
      camera.position.set(mx + 22, Math.max(10, my + 5.5), mz + 31);
      orbit.target.set(mx + 4.5, Math.max(2, my - 3.4), mz + 2.0);
    } else {
      camera.position.set(22, 11, 28);
      orbit.target.set(14, 5.5, 12);
    }
  } else if (focus === 'top') {
    camera.position.set(0, 72, 0.1);
    orbit.target.set(0, 0, 0);
  } else {
    // Overview
    const nodes = doc?.nodes || [];
    let cx = 0;
    let cz = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    if (nodes.length) {
      for (const n of nodes) {
        cx += n.position[0];
        cz += n.position[2];
        minX = Math.min(minX, n.position[0]);
        maxX = Math.max(maxX, n.position[0]);
        minZ = Math.min(minZ, n.position[2]);
        maxZ = Math.max(maxZ, n.position[2]);
      }
      cx /= nodes.length;
      cz /= nodes.length;
    }
    const span = Number.isFinite(maxX - minX) ? Math.max(maxX - minX, maxZ - minZ, 50) : 60;
    const dist = Math.max(42, span * 0.68);
    camera.position.set(cx + dist, dist * 0.78, cz + dist * 1.05);
    orbit.target.set(cx, 1.0, cz);
  }
  orbit.update();
}

export function prvSnapshotPNG(renderer, scene, camera, doc, toast) {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `infrastructure-${doc?.seed || 2026}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (toast) toast('Saved viewport PNG snapshot');
}
