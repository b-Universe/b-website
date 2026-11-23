import { $ } from '../utils.js';
import { createTrackRoute, buildTrackFixtureGroup } from '../transit/track-preview.js';

export function disposeObject(obj) {
  if (!obj) return;
  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeObject(child);
  }
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.userData?._tex) {
    obj.userData._tex.dispose();
  }
  if (obj.userData?._ownedMat && obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material.dispose();
  }
}

function previewMakeLabelSprite(text, bgColor = '#0c2334', borderColor = '#4de2ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 56;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 56);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 50);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 22), 128, 29);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.35, 0.3, 1);
  sprite.userData = { _tex: tex, _ownedMat: true };
  return sprite;
}

function previewBuildSingleGizmo(vehicleGroup, targetRoot, showFrontArrow = true) {
  const bp = vehicleGroup?.userData?.blueprint;
  if (!bp) return;
  const park = bp.parkingFootprint?.meters || { width: 2.5, length: 5.0 };
  const colBox = bp.collisionBounds?.compositeBox;

  // Parking / Track Footprint Wireframe Box on ground
  const padGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(park.width, 0.04, park.length));
  const padMat = new THREE.LineBasicMaterial({ color: '#3af0b8' });
  const padWire = new THREE.LineSegments(padGeo, padMat);
  padWire.position.y = 0.025;
  padWire.userData = { _ownedMat: true };
  targetRoot.add(padWire);

  // Composite Collision Bounds Wireframe
  if (colBox) {
    const colGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(colBox.size.x, colBox.size.y, colBox.size.z));
    const colMat = new THREE.LineBasicMaterial({ color: '#ffbd59' });
    const colWire = new THREE.LineSegments(colGeo, colMat);
    colWire.position.set(colBox.center.x, colBox.center.y, colBox.center.z);
    colWire.userData = { _ownedMat: true };
    targetRoot.add(colWire);
  }

  // Forward (+Z) Direction Arrow
  if (showFrontArrow) {
    const frontZ = (bp.bounds?.meters?.maxZ || 2.2) + 0.15;
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0.12, frontZ),
      0.9,
      0x4de2ff,
      0.26,
      0.16
    );
    targetRoot.add(arrow);
  }

  // Rail Coupler & Bogie Anchors when rail blueprint
  if (bp.pivots?.couplers) {
    const cMat = new THREE.MeshBasicMaterial({ color: '#4de2ff' });
    const sGeo = new THREE.SphereGeometry(0.11, 8, 8);
    for (const endKey of ['front', 'rear']) {
      const anc = bp.pivots.couplers[endKey];
      if (!anc) continue;
      const sp = new THREE.Mesh(sGeo.clone(), cMat);
      sp.position.set(anc.x, anc.y, anc.pullFaceZ ?? anc.z);
      sp.userData = { _ownedMat: true };
      targetRoot.add(sp);
    }
    sGeo.dispose();
  }

  // Axle Line & Wheel Center Markers
  for (const axle of bp.axles || []) {
    const axMat = new THREE.MeshBasicMaterial({ color: '#ff6ec7' });
    const barGeo = new THREE.BoxGeometry(axle.trackWidth + 0.35, 0.03, 0.03);
    const bar = new THREE.Mesh(barGeo, axMat);
    bar.position.set(0, 0.03, axle.z);
    bar.userData = { _ownedMat: true };
    targetRoot.add(bar);

    const lbl = previewMakeLabelSprite(`${axle.id} (${axle.z}m)`, '#1b0f26', '#ff6ec7');
    lbl.position.set(axle.wheelCenterX + 0.65, 0.35, axle.z);
    targetRoot.add(lbl);
  }
}

export function buildVehicleDebugGizmos(vehicleGroup) {
  const root = new THREE.Group();
  root.name = 'VehicleDebugGizmos';
  if (!vehicleGroup) return root;
  vehicleGroup.updateMatrixWorld(true);

  if (Array.isArray(vehicleGroup.userData?.unitGroups)) {
    const unitGroups = vehicleGroup.userData.unitGroups;
    unitGroups.forEach((uGrp, idx) => {
      const unitFrame = new THREE.Group();
      unitFrame.rotation.order = 'YXZ';
      unitFrame.position.copy(uGrp.position);
      unitFrame.rotation.copy(uGrp.rotation);
      previewBuildSingleGizmo(uGrp, unitFrame, idx === 0);
      root.add(unitFrame);
    });

    // Coupling link status lines between adjacent units
    const couplings = vehicleGroup.userData?.lastSolved?.couplings || [];
    for (let i = 0; i < couplings.length; i++) {
      const link = couplings[i];
      const uA = unitGroups[i];
      const uB = unitGroups[i + 1];
      if (!uA || !uB) continue;
      const bpA = uA.userData?.blueprint;
      const bpB = uB.userData?.blueprint;
      if (!bpA?.pivots?.couplers || !bpB?.pivots?.couplers) continue;
      const revA = Boolean(uA.userData?.reversed);
      const revB = Boolean(uB.userData?.reversed);
      const localA = revA ? bpA.pivots.couplers.front : bpA.pivots.couplers.rear;
      const localB = revB ? bpB.pivots.couplers.rear : bpB.pivots.couplers.front;
      const pA = new THREE.Vector3(localA.x, localA.y, localA.pullFaceZ ?? localA.z).applyMatrix4(uA.matrixWorld);
      const pB = new THREE.Vector3(localB.x, localB.y, localB.pullFaceZ ?? localB.z).applyMatrix4(uB.matrixWorld);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
      const lineMat = new THREE.LineBasicMaterial({
        color: link.compatible && !link.yawExceeded ? '#3af0b8' : '#ff4d5a'
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { _ownedMat: true };
      root.add(line);
    }
    return root;
  }

  if (!vehicleGroup.userData?.blueprint) return root;
  previewBuildSingleGizmo(vehicleGroup, root, true);
  return root;
}

export function rebuildVehicleDebugOverlay(debugGroup, vehicleGroup, enabled) {
  disposeObject(debugGroup);
  if (!enabled || !vehicleGroup) return;
  debugGroup.add(buildVehicleDebugGizmos(vehicleGroup));
}

function addEnvBox(parent, x, y, z, w, h, d, colorHex, receiveShadow = true) {
  const mat = new THREE.MeshLambertMaterial({ color: colorHex });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = receiveShadow;
  mesh.userData = { _ownedMat: true };
  parent.add(mesh);
  return mesh;
}

export function rebuildVehicleEnvironment(environmentGroup, mode, showGrid, boundsMeters = null, lightingTime = 'day', trackOptions = null) {
  disposeObject(environmentGroup);
  if (mode === 'none' && !showGrid) return null;

  const isNight = lightingTime === 'night';
  const span = boundsMeters ? Math.max(boundsMeters.length * 2.2, boundsMeters.width * 4, 14) : 14;
  const gridSpan = Math.max(18, Math.min(220, span * 1.4));

  const railEnvModes = new Set([
    'rail_straight',
    'rail_curved',
    'rail_incline',
    'tram_street',
    'monorail_straddle',
    'monorail_suspended',
    'cableway_aerial'
  ]);
  if (railEnvModes.has(mode)) {
    const route = createTrackRoute({
      mode,
      curved: Boolean(trackOptions?.curved),
      electrified: Boolean(trackOptions?.electrified),
      curveRadius: trackOptions?.curveRadius || 48,
      gradePercent: trackOptions?.gradePercent || 3.0,
      trackGaugeId: trackOptions?.trackGaugeId || undefined,
      totalLength: Math.max(96, (boundsMeters?.length || 18) * 2.6)
    });
    const trackGrp = buildTrackFixtureGroup(route, lightingTime);
    environmentGroup.add(trackGrp);
    if (showGrid) {
      const gridColor = isNight ? 0x1e4b68 : 0x2a6988;
      const subColor = isNight ? 0x0e2334 : 0x163246;
      const grid = new THREE.GridHelper(Math.max(60, gridSpan), 36, gridColor, subColor);
      const gridY = mode === 'monorail_straddle'
        ? -3.75
        : (mode === 'monorail_suspended' || mode === 'cableway_aerial')
          ? -0.95
          : -0.55;
      grid.position.set(0, gridY, 0);
      environmentGroup.add(grid);
    }
    return route;
  }

  if (showGrid) {
    const gridColor = isNight ? 0x1e4b68 : 0x2a6988;
    const subColor = isNight ? 0x0e2334 : 0x163246;
    const grid = new THREE.GridHelper(gridSpan, 24, gridColor, subColor);
    grid.position.y = -0.005;
    environmentGroup.add(grid);
  }

  if (mode === 'studio') {
    const discGeo = new THREE.CylinderGeometry(span * 0.52, span * 0.56, 0.14, 36);
    const discMat = new THREE.MeshLambertMaterial({ color: isNight ? '#0e1924' : '#1a2b3c' });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.08;
    disc.receiveShadow = true;
    disc.userData = { _ownedMat: true };
    environmentGroup.add(disc);
    return null;
  }

  const asphaltColor = isNight ? '#111820' : '#252c34';
  const lineYellow = isNight ? '#8f7226' : '#d6aa38';
  const lineWhite = isNight ? '#687480' : '#cdd5dd';
  const sidewalkColor = isNight ? '#26303a' : '#656e78';

  if (mode === 'helipad') {
    const padRadius = Math.max(7.8, (boundsMeters?.length || 11) * 0.72);
    const padDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(padRadius, padRadius + 0.35, 0.32, 32),
      new THREE.MeshLambertMaterial({ color: isNight ? '#1b222c' : '#3d4550' })
    );
    padDeck.position.y = -0.17;
    padDeck.receiveShadow = true;
    padDeck.userData = { _ownedMat: true };
    environmentGroup.add(padDeck);

    const ringOuter = new THREE.Mesh(
      new THREE.RingGeometry(padRadius * 0.76, padRadius * 0.82, 36),
      new THREE.MeshBasicMaterial({ color: lineYellow, side: THREE.DoubleSide })
    );
    ringOuter.rotation.x = -Math.PI * 0.5;
    ringOuter.position.y = 0.004;
    ringOuter.userData = { _ownedMat: true };
    environmentGroup.add(ringOuter);

    // Classic Helipad "H" center markings
    addEnvBox(environmentGroup, -1.35, 0.003, 0, 0.42, 0.01, 3.6, lineWhite, false);
    addEnvBox(environmentGroup, 1.35, 0.003, 0, 0.42, 0.01, 3.6, lineWhite, false);
    addEnvBox(environmentGroup, 0, 0.003, 0, 2.7, 0.01, 0.42, lineWhite, false);

    // Perimeter safety lights around helipad rim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addEnvBox(environmentGroup, Math.cos(a) * (padRadius - 0.38), 0.08, Math.sin(a) * (padRadius - 0.38), 0.18, 0.16, 0.18, '#f0b429', false);
    }
    return null;
  }

  if (mode === 'street') {
    addEnvBox(environmentGroup, 0, -0.05, 0, 12, 0.08, gridSpan * 1.6, asphaltColor);
    for (let z = -gridSpan * 0.7; z <= gridSpan * 0.7; z += 3.2) {
      addEnvBox(environmentGroup, -1.65, -0.004, z, 0.14, 0.01, 1.5, lineYellow, false);
    }
    addEnvBox(environmentGroup, -3.7, 0.04, 0, 2.2, 0.18, gridSpan * 1.6, sidewalkColor);
    addEnvBox(environmentGroup, 3.7, 0.04, 0, 2.2, 0.18, gridSpan * 1.6, sidewalkColor);
    return;
  }

  if (mode === 'parking_lot') {
    addEnvBox(environmentGroup, 0, -0.05, 0, gridSpan * 1.2, 0.08, gridSpan * 1.2, asphaltColor);
    const stallW = Math.max(2.6, (boundsMeters?.width || 2) + 0.75);
    const stallL = Math.max(5.2, (boundsMeters?.length || 4.5) + 0.9);
    for (let slot = -2; slot <= 2; slot++) {
      const sx = slot * stallW;
      addEnvBox(environmentGroup, sx - stallW * 0.5, -0.004, 0, 0.1, 0.01, stallL, lineWhite, false);
      if (slot === 2) {
        addEnvBox(environmentGroup, sx + stallW * 0.5, -0.004, 0, 0.1, 0.01, stallL, lineWhite, false);
      }
      addEnvBox(environmentGroup, sx, 0.05, -stallL * 0.5 + 0.3, stallW * 0.65, 0.1, 0.16, sidewalkColor);
    }
    addEnvBox(environmentGroup, 0, -0.004, stallL * 0.5 + 0.05, stallW * 5, 0.01, 0.12, lineWhite, false);
    return;
  }

  if (mode === 'city_curb') {
    addEnvBox(environmentGroup, 0, -0.05, 0, 14, 0.08, gridSpan * 1.6, asphaltColor);
    // Curb & sidewalk beside vehicle (+X curb)
    addEnvBox(environmentGroup, -3.5, 0.06, 0, 3.6, 0.22, gridSpan * 1.6, sidewalkColor);
    addEnvBox(environmentGroup, 3.8, 0.06, 0, 3.6, 0.22, gridSpan * 1.6, sidewalkColor);
    addEnvBox(environmentGroup, -1.75, -0.004, 0, 0.12, 0.01, gridSpan * 1.4, lineYellow, false);

    // Stylized background low-poly B Remastered buildings along curb
    const bldgColorA = isNight ? '#1a2433' : '#4a5868';
    const bldgColorB = isNight ? '#1e2b38' : '#5e4b45';
    addEnvBox(environmentGroup, -7.2, 4.5, -4.5, 4.4, 9.0, 5.2, bldgColorA);
    addEnvBox(environmentGroup, -7.4, 6.2, 3.2, 4.6, 12.4, 6.2, bldgColorB);
    addEnvBox(environmentGroup, -7.0, 3.8, 10.5, 4.2, 7.6, 5.0, bldgColorA);

    // Streetlamp posts on sidewalk
    for (const lz of [-5.5, 5.5]) {
      addEnvBox(environmentGroup, -2.35, 1.9, lz, 0.12, 3.8, 0.12, '#343c46');
      addEnvBox(environmentGroup, -1.95, 3.75, lz, 0.85, 0.1, 0.12, '#343c46');
      addEnvBox(environmentGroup, -1.62, 3.66, lz, 0.24, 0.08, 0.16, isNight ? '#ffe39a' : '#cfd6de', false);
    }
  }
}

export function resetCameraForFocus(camera, orbit, vehicleGroup, focusMode = 'hero', scene = null) {
  if (!camera || !orbit || !vehicleGroup) return;
  vehicleGroup.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(vehicleGroup);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const safeLen = Math.max(3.2, size.z || 4.5);
  const safeW = Math.max(1.6, size.x || 1.9);
  const safeH = Math.max(1.2, size.y || 1.6);
  const maxDim = Math.max(safeLen, safeW, safeH);
  const aspect = Math.max(0.45, Number(camera.aspect) || 1.3);
  const aspectPad = aspect < 1.05 ? Math.min(2.1, 1.08 / aspect) : 1.0;

  camera.far = Math.max(600, maxDim * 35);
  camera.near = 0.08;
  camera.updateProjectionMatrix();
  orbit.minDistance = Math.max(1.8, Math.min(8, maxDim * 0.18));
  orbit.maxDistance = Math.max(48, maxDim * 5.8 * aspectPad);

  if (scene?.fog) {
    scene.fog.near = Math.max(45, maxDim * 4.2 * aspectPad);
    scene.fog.far = Math.max(180, maxDim * 15 * aspectPad);
  }

  const leadUnit = Array.isArray(vehicleGroup.userData?.unitGroups)
    ? vehicleGroup.userData.unitGroups[0]
    : vehicleGroup;

  if (focusMode === 'profile') {
    orbit.target.set(center.x, center.y, center.z);
    const dist = Math.max(5.0, maxDim * 1.18 * aspectPad, safeH * 2.2);
    camera.position.set(center.x + dist, center.y + safeH * 0.28, center.z);
  } else if (focusMode === 'street') {
    orbit.target.set(center.x, center.y, center.z + safeLen * 0.08);
    const dist = Math.max(4.4, maxDim * 1.18 * aspectPad);
    camera.position.set(center.x + dist * 0.58, Math.max(1.25, center.y + safeH * 0.24), center.z + dist * 0.82);
  } else if (focusMode === 'top') {
    orbit.target.set(center.x, center.y * 0.5, center.z);
    const dist = Math.max(6.5, maxDim * 1.28 * aspectPad);
    camera.position.set(center.x + 0.01, center.y + dist, center.z);
  } else if (focusMode === 'fit_train') {
    orbit.target.set(center.x, center.y * 0.72, center.z);
    const dist = Math.max(9.0, maxDim * 1.22 * aspectPad);
    camera.position.set(center.x + dist * 0.72, center.y + dist * 0.42, center.z + dist * 0.68);
  } else if (focusMode === 'cab' && leadUnit) {
    const uBox = new THREE.Box3().setFromObject(leadUnit);
    const uCenter = new THREE.Vector3();
    const uSize = new THREE.Vector3();
    uBox.getCenter(uCenter);
    uBox.getSize(uSize);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(leadUnit.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(leadUnit.quaternion);
    const frontPt = uCenter.clone().addScaledVector(fwd, uSize.z * 0.34);
    orbit.target.copy(frontPt).setY(uCenter.y + 0.4);
    camera.position.copy(frontPt).addScaledVector(fwd, 5.2 * aspectPad).addScaledVector(right, 4.4 * aspectPad);
    camera.position.y = uCenter.y + 2.0;
  } else if (focusMode === 'bogie' && leadUnit) {
    const bPivot = leadUnit.userData?.railParts?.bogieMap?.front;
    const targetWorld = new THREE.Vector3();
    if (bPivot) bPivot.getWorldPosition(targetWorld);
    else leadUnit.getWorldPosition(targetWorld);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(leadUnit.quaternion);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(leadUnit.quaternion);
    orbit.target.set(targetWorld.x, targetWorld.y + 0.52, targetWorld.z);
    camera.position.copy(orbit.target).addScaledVector(right, 3.6).addScaledVector(fwd, 1.4);
    camera.position.y = targetWorld.y + 1.05;
  } else {
    // Hero 3/4 view
    orbit.target.set(center.x, center.y * 0.86, center.z);
    const dist = Math.max(4.8, maxDim * 1.24 * aspectPad);
    camera.position.set(center.x + dist * 0.72, center.y + safeH * 0.3 + dist * 0.28, center.z + dist * 0.74);
  }

  orbit.update();
}

export function snapshot(renderer, scene, camera, state, ready, toast) {
  if (!ready || !renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-${state.style || 'design'}-${state.seed || 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (toast) toast('Saved Preview Snapshot');
  }, 'image/png');
}

export function toggleVehTheatreMode(view, toast, resizeFn) {
  view.theatre = !view.theatre;
  const shell = $('.studio-shell');
  if (shell) shell.classList.toggle('theatre-mode', view.theatre);
  $('#btn-theatre')?.classList.toggle('active', view.theatre);
  $('#btn-theatre-quick')?.classList.toggle('active', view.theatre);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast(view.theatre ? 'Theatre Mode On' : 'Theatre Mode Off');
}

export function isVehFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return Boolean(
    document.fullscreenElement === frame ||
    (frame && frame.classList.contains('is-fullscreen'))
  );
}

export function updateVehFullscreenUI(view) {
  const active = isVehFullscreenActive();
  view.fullscreen = active;
  document.body.classList.toggle('studio-fullscreen-active', active);
  $('#btn-fullscreen')?.classList.toggle('active', active);
  $('#btn-fullscreen-quick')?.classList.toggle('active', active);
}

export async function enterVehFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (!frame) return;
  frame.classList.add('is-fullscreen');
  if (frame.requestFullscreen && !document.fullscreenElement) {
    try {
      await frame.requestFullscreen();
    } catch {
    }
  }
  updateVehFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode On (Press Esc To Exit)');
}

export async function exitVehFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame) frame.classList.remove('is-fullscreen');
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if already exited
    }
  }
  updateVehFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode Off');
}

export function toggleVehFullscreenViewport(view, toast, resizeFn) {
  if (isVehFullscreenActive()) return exitVehFullscreenViewport(view, toast, resizeFn);
  return enterVehFullscreenViewport(view, toast, resizeFn);
}

export function handleVehFullscreenChange(view, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame && !document.fullscreenElement) {
    frame.classList.remove('is-fullscreen');
  }
  updateVehFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
}

export function handleVehStudioKeydown(e, actions) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const key = (e.key || '').toLowerCase();
  if (key === 'f') {
    e.preventDefault();
    actions.toggleFullscreen();
  } else if (key === 't') {
    e.preventDefault();
    actions.toggleTheatre();
  } else if (key === 'e') {
    e.preventDefault();
    actions.toggleDebug();
  } else if (key === 's') {
    e.preventDefault();
    actions.toggleSilhouette();
  } else if (key === 'p') {
    e.preventDefault();
    actions.snapshot();
  } else if (e.key === 'Escape' && isVehFullscreenActive()) {
    actions.exitFullscreen();
  }
}
