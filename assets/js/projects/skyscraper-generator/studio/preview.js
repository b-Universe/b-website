import { $ } from '../utils.js';

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
  canvas.width = 320;
  canvas.height = 68;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 320, 68);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 314, 62);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 24), 160, 35);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9.5, 2.1, 1);
  sprite.userData = { _tex: tex, _ownedMat: true };
  return sprite;
}

export function buildSkyscraperDebugGizmos(skyscraperGroup, state) {
  const root = new THREE.Group();
  root.name = 'SkyscraperDebugGizmos';
  if (!skyscraperGroup?.userData?.blueprint) return root;

  const bp = skyscraperGroup.userData.blueprint;
  const complex = skyscraperGroup.userData.complex;

  // Entrance & Service Portal Markers
  for (const ent of bp.entrances || []) {
    const { x, y, z } = ent.position;
    const isMain = ent.role === 'primary' || ent.role === 'podium_portal';
    const col = isMain ? '#3af0b8' : ent.role === 'service' ? '#ffb74d' : '#64b5f6';

    const ringGeo = new THREE.RingGeometry(
      Math.max(0.4, (ent.interactionRadius || 3) - 0.16),
      ent.interactionRadius || 3,
      24
    );
    const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.set(x, y + 0.12, z);
    ring.userData = { _ownedMat: true };
    root.add(ring);

    const f = ent.facing || { x: 0, y: 0, z: 1 };
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(f.x, f.y, f.z).normalize(),
      new THREE.Vector3(x, y + 0.8, z),
      4.2,
      new THREE.Color(col).getHex(),
      1.0,
      0.55
    );
    root.add(arrow);

    const lbl = previewMakeLabelSprite(
      ent.role === 'primary' ? 'Main Lobby' : ent.role === 'service' ? 'Loading Dock' : ent.role === 'parking' ? 'Parking Entry' : 'Portal',
      '#081d2b',
      col
    );
    lbl.position.set(x, y + 5.8, z);
    root.add(lbl);
  }

  const deg2Rad = Math.PI / 180;
  const makeXZLoop = (ptsXZ, yPos, colorHex) => {
    const vecs = ptsXZ.map(([px, pz]) => new THREE.Vector3(px, yPos, pz));
    const geo = new THREE.BufferGeometry().setFromPoints(vecs);
    const mat = new THREE.LineBasicMaterial({ color: colorHex });
    const loop = new THREE.LineLoop(geo, mat);
    loop.userData = { _ownedMat: true };
    return loop;
  };

  const getLocalSectionOutline = (sec) => {
    const hw = Math.max(0.5, (sec.width || 10) * 0.5);
    const hd = Math.max(0.5, (sec.depth || 10) * 0.5);
    const fp = sec.footprint || 'rectangle';
    if (fp === 'circle' || fp === 'ellipse') {
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pts.push([Math.cos(a) * hw, Math.sin(a) * hd]);
      }
      return pts;
    }
    if (fp === 'octagon') {
      const c = 0.4142;
      return [
        [-hw * c, -hd], [hw * c, -hd], [hw, -hd * c], [hw, hd * c],
        [hw * c, hd], [-hw * c, hd], [-hw, hd * c], [-hw, -hd * c]
      ];
    }
    if (fp === 'triangle' || fp === 'triangular_wedge') {
      return [[0, -hd], [hw, hd], [-hw, hd]];
    }
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  };

  const transformToWorldXZ = (lx, lz, sec, tower) => {
    const sRad = (sec.rotationDeg || sec.rotDeg || 0) * deg2Rad;
    const mirrorSign = tower.mirrorX ? -1 : 1;
    const sx = (lx * Math.cos(sRad) + lz * Math.sin(sRad) + (sec.offsetX || 0)) * mirrorSign;
    const sz = -lx * Math.sin(sRad) + lz * Math.cos(sRad) + (sec.offsetZ || 0);
    const tRad = (tower.rotDeg || 0) * deg2Rad;
    const tx = tower.x ?? tower.centerX ?? 0;
    const tz = tower.z ?? tower.centerZ ?? 0;
    return [
      sx * Math.cos(tRad) + sz * Math.sin(tRad) + tx,
      -sx * Math.sin(tRad) + sz * Math.cos(tRad) + tz
    ];
  };

  // Per-Tower Section Boundary Loops & Cantilever Support Indicators
  for (const tower of complex?.towers || []) {
    const secs = tower.stack?.sections || tower.sections || [];
    for (const sec of secs) {
      const diag = sec.transitionDiagnostics || {};
      const isCantilever = Boolean(diag.clamped || diag.needsCantileverSupport || sec.transitionMode === 'supported_cantilever');
      const loopColor = isCantilever ? '#f59e0b' : '#38bdf8';
      const localPts = getLocalSectionOutline(sec);
      const worldPts = localPts.map(([lx, lz]) => transformToWorldXZ(lx, lz, sec, tower));
      root.add(makeXZLoop(worldPts, sec.baseElevation + 0.06, loopColor));
      root.add(makeXZLoop(worldPts, sec.topElevation - 0.04, loopColor));

      if (isCantilever) {
        const [cx, cz] = transformToWorldXZ(0, 0, sec, tower);
        const cornerStride = Math.max(1, Math.floor(worldPts.length / 4));
        const strutVerts = [];
        for (let i = 0; i < worldPts.length; i += cornerStride) {
          const [wx, wz] = worldPts[i];
          const inX = cx + (wx - cx) * 0.72;
          const inZ = cz + (wz - cz) * 0.72;
          strutVerts.push(new THREE.Vector3(wx, sec.baseElevation, wz), new THREE.Vector3(inX, Math.max(0, sec.baseElevation - 2.2), inZ));
        }
        const strutGeo = new THREE.BufferGeometry().setFromPoints(strutVerts);
        const strutMat = new THREE.LineBasicMaterial({ color: '#f59e0b' });
        const strutLines = new THREE.LineSegments(strutGeo, strutMat);
        strutLines.userData = { _ownedMat: true };
        root.add(strutLines);
      }
    }
  }

  // Skybridge Attachment Vectors & Elevations
  for (const sb of complex?.skybridges || []) {
    const yMid = sb.elevationY + sb.height * 0.5;
    for (const endPt of [sb.start, sb.end]) {
      const markerGeo = new THREE.SphereGeometry(0.68, 10, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: '#ff6ec7' });
      const sphere = new THREE.Mesh(markerGeo, markerMat);
      sphere.position.set(endPt.x, yMid, endPt.z);
      sphere.userData = { _ownedMat: true };
      root.add(sphere);
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(sb.start.x, yMid, sb.start.z),
      new THREE.Vector3(sb.end.x, yMid, sb.end.z)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: '#ff6ec7' });
    const bridgeVec = new THREE.Line(lineGeo, lineMat);
    bridgeVec.userData = { _ownedMat: true };
    root.add(bridgeVec);

    const midLbl = previewMakeLabelSprite(`Bridge Fl ${sb.floor}`, '#250e28', '#ff6ec7');
    midLbl.position.set((sb.start.x + sb.end.x) * 0.5, sb.elevationY + sb.height + 2.2, (sb.start.z + sb.end.z) * 0.5);
    root.add(midLbl);
  }

  // Truss Endpoint Markers
  for (const tr of complex?.trusses || []) {
    if (!tr?.start || !tr?.end) continue;
    const ys = tr.bottomY !== undefined && tr.topY !== undefined ? [tr.bottomY, tr.topY] : [tr.y ?? tr.elevationY ?? 0];
    for (const trY of ys) {
      for (const endPt of [tr.start, tr.end]) {
        const tGeo = new THREE.SphereGeometry(0.55, 8, 6);
        const tMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
        const tMesh = new THREE.Mesh(tGeo, tMat);
        tMesh.position.set(endPt.x, trY, endPt.z);
        tMesh.userData = { _ownedMat: true };
        root.add(tMesh);
      }
    }
  }

  return root;
}

export function rebuildSkyscraperDebugOverlay(debugGroup, skyscraperGroup, state, enabled) {
  disposeObject(debugGroup);
  if (!enabled || !skyscraperGroup) return;
  const gizmos = buildSkyscraperDebugGizmos(skyscraperGroup, state);
  debugGroup.add(gizmos);
}

export function rebuildEnvironment(environmentGroup, mode, showGrid, complexBounds = null, lightingTime = 'day') {
  disposeObject(environmentGroup);
  if (mode === 'none' && !showGrid) return;

  const span = complexBounds
    ? Math.max(complexBounds.plazaWidth || 50, complexBounds.plazaDepth || 50, 56)
    : 64;
  const gridSpan = Math.max(220, span * 3.2);

  if (showGrid) {
    const gridColor = lightingTime === 'night' ? 0x1e4b68 : 0x2a6988;
    const subColor = lightingTime === 'night' ? 0x0e2334 : 0x163246;
    const grid = new THREE.GridHelper(gridSpan, 40, gridColor, subColor);
    grid.position.y = -0.02;
    environmentGroup.add(grid);
  }

  if (mode === 'studio') {
    const discGeo = new THREE.CylinderGeometry(span * 0.78, span * 0.84, 0.4, 48);
    const discMat = new THREE.MeshLambertMaterial({ color: lightingTime === 'night' ? '#0d1822' : '#182838' });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.45;
    disc.receiveShadow = true;
    disc.userData = { _ownedMat: true };
    environmentGroup.add(disc);
    return;
  }

  if (mode === 'city') {
    // Ground asphalt sheet + roads framing the complex
    const roadMat = new THREE.MeshLambertMaterial({ color: lightingTime === 'night' ? '#0f161f' : '#242c36' });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gridSpan * 1.4, gridSpan * 1.4), roadMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.y = -0.36;
    ground.receiveShadow = true;
    ground.userData = { _ownedMat: true };
    environmentGroup.add(ground);

    // Background neighbor silhouettes outside central plaza
    const ringRadius = Math.max(span * 0.88, 66);
    const contextMat = new THREE.MeshLambertMaterial({
      color: lightingTime === 'night' ? '#131d2b' : lightingTime === 'dusk' ? '#243248' : '#2b3e52'
    });
    const neighborSpecs = [
      { angle: 0.45, dist: 1.0, w: 22, d: 20, h: 48 },
      { angle: 1.35, dist: 1.15, w: 26, d: 24, h: 86 },
      { angle: 2.25, dist: 1.05, w: 20, d: 22, h: 62 },
      { angle: 3.05, dist: 1.2, w: 28, d: 22, h: 112 },
      { angle: 3.95, dist: 1.1, w: 24, d: 24, h: 55 },
      { angle: 5.05, dist: 1.18, w: 22, d: 26, h: 94 }
    ];
    for (const n of neighborSpecs) {
      const bx = Math.cos(n.angle) * ringRadius * n.dist;
      const bz = Math.sin(n.angle) * ringRadius * n.dist;
      const block = new THREE.Mesh(new THREE.BoxGeometry(n.w, n.h, n.d), contextMat);
      block.position.set(bx, n.h * 0.5 - 0.35, bz);
      block.receiveShadow = true;
      block.userData = { _ownedMat: true };
      environmentGroup.add(block);
    }
  }
}

export function resetCameraForFocus(camera, orbit, skyscraperGroup, focusMode = 'full', scene = null) {
  if (!camera || !orbit || !skyscraperGroup) return;

  const box = new THREE.Box3().setFromObject(skyscraperGroup);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (box.isEmpty()) {
    size.set(32, 120, 32);
    center.set(0, 60, 0);
    box.min.set(-16, 0, -16);
    box.max.set(16, 120, 16);
  } else {
    box.getSize(size);
    box.getCenter(center);
  }

  const sx = Math.max(18, size.x || 30);
  const sy = Math.max(24, size.y || 120);
  const sz = Math.max(18, size.z || 30);
  const safeSpan = Math.max(24, sx, sz);
  const maxDim = Math.max(sy, safeSpan);

  const fovRad = ((camera.fov || 46) * Math.PI) / 180;
  const aspect = Math.max(0.4, camera.aspect || 1.33);
  const tanV = Math.max(0.1, Math.tan(fovRad * 0.5));
  const tanH = Math.max(0.1, tanV * aspect);
  const margin = 1.24;

  let activeDist = maxDim * 1.5;

  if (focusMode === 'street') {
    const targetY = box.min.y + Math.min(16, sy * 0.16);
    const frontZ = box.max.z || safeSpan * 0.5;
    const distStreet = Math.max(
      34,
      ((Math.max(sx, sz) * 0.55) / tanH) * 1.15,
      (Math.min(28, sy * 0.28) * 0.55) / tanV
    );
    activeDist = distStreet;
    orbit.target.set(center.x, targetY, center.z * 0.4 + frontZ * 0.25);
    camera.position.set(center.x + distStreet * 0.56, Math.max(8, box.min.y + 8), frontZ + distStreet * 0.84);
  } else if (focusMode === 'crown') {
    const crownH = Math.max(24, sy * 0.28);
    const crownSpan = Math.hypot(sx, sz);
    const crownY = box.min.y + sy * 0.84;
    const lookDir = new THREE.Vector3(0.58, 0.22, 0.78).normalize();
    activeDist = Math.max(34, (crownH * 0.62) / tanV, (crownSpan * 0.52) / tanH) * 1.18;
    orbit.target.set(center.x, crownY, center.z);
    camera.position.copy(orbit.target).addScaledVector(lookDir, activeDist);
  } else {
    // FOV and aspect-aware hero 3/4 view fitting all towers, crowns, and spires
    const lookDir = new THREE.Vector3(0.58, 0.2, 0.79).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const camRight = new THREE.Vector3().crossVectors(worldUp, lookDir).normalize();
    const camUp = new THREE.Vector3().crossVectors(lookDir, camRight).normalize();

    const halfProjX = 0.5 * (Math.abs(camRight.x) * sx + Math.abs(camRight.y) * sy + Math.abs(camRight.z) * sz);
    const halfProjY = 0.5 * (Math.abs(camUp.x) * sx + Math.abs(camUp.y) * sy + Math.abs(camUp.z) * sz);
    const halfProjZ = 0.5 * (Math.abs(lookDir.x) * sx + Math.abs(lookDir.y) * sy + Math.abs(lookDir.z) * sz);

    const distV = (halfProjY / tanV + halfProjZ * 0.55) * margin;
    const distH = (halfProjX / tanH + halfProjZ * 0.55) * margin;
    activeDist = Math.max(48, distV, distH);

    orbit.target.set(center.x, box.min.y + sy * 0.49, center.z);
    camera.position.copy(orbit.target).addScaledVector(lookDir, activeDist);
  }

  // Expand camera clip planes and fog for supertall complexes
  const envScale = Math.max(maxDim, activeDist * 1.45);
  camera.far = Math.max(3200, envScale * 10);
  camera.near = Math.max(0.25, Math.min(1.5, maxDim * 0.002));
  camera.updateProjectionMatrix();
  orbit.maxDistance = Math.max(520, envScale * 4.6);

  if (scene?.fog) {
    scene.fog.near = Math.max(220, envScale * 1.45);
    scene.fog.far = Math.max(1150, envScale * 5.6);
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
    a.download = `skyscraper-${state.style || 'design'}-${state.seed || 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (toast) toast('Saved Preview Snapshot');
  }, 'image/png');
}

export function toggleSkyTheatreMode(view, toast, resizeFn) {
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

export function isSkyFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return Boolean(
    document.fullscreenElement === frame ||
    (frame && frame.classList.contains('is-fullscreen'))
  );
}

export function updateSkyFullscreenUI(view) {
  const active = isSkyFullscreenActive();
  view.fullscreen = active;
  document.body.classList.toggle('studio-fullscreen-active', active);
  $('#btn-fullscreen')?.classList.toggle('active', active);
  $('#btn-fullscreen-quick')?.classList.toggle('active', active);
}

export async function enterSkyFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (!frame) return;
  frame.classList.add('is-fullscreen');
  if (frame.requestFullscreen && !document.fullscreenElement) {
    try {
      await frame.requestFullscreen();
    } catch {
    }
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode On (Press Esc To Exit)');
}

export async function exitSkyFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame) frame.classList.remove('is-fullscreen');
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if already exited
    }
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode Off');
}

export function toggleSkyFullscreenViewport(view, toast, resizeFn) {
  if (isSkyFullscreenActive()) return exitSkyFullscreenViewport(view, toast, resizeFn);
  return enterSkyFullscreenViewport(view, toast, resizeFn);
}

export function handleSkyFullscreenChange(view, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame && !document.fullscreenElement) {
    frame.classList.remove('is-fullscreen');
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
}

export function handleSkyStudioKeydown(e, actions) {
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
  } else if (e.key === 'Escape' && isSkyFullscreenActive()) {
    actions.exitFullscreen();
  }
}
