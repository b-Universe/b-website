import { $, clamp, slugifyName } from '../utils.js';
import { getObjectMaterial } from '../materials/materials.js';

export function disposeObjectGroup(obj) {
  if (!obj) return;
  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeObjectGroup(child);
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

function prevMakeOwnedMesh(geo, colorHex, options = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: options.roughness !== undefined ? options.roughness : 0.85,
    metalness: options.metalness !== undefined ? options.metalness : 0.08,
    transparent: Boolean(options.transparent),
    opacity: options.opacity !== undefined ? options.opacity : 1.0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = options.receiveShadow !== false;
  mesh.castShadow = Boolean(options.castShadow);
  mesh.userData = { _ownedMat: true };
  return mesh;
}

function prevMakeHumanReference(x, y, z) {
  const g = new THREE.Group();
  g.name = 'ScaleHumanReference';

  const bodyMat = { color: '#58b8d9', roughness: 0.7, transparent: true, opacity: 0.85, castShadow: true };
  const darkMat = { color: '#2b4f61', roughness: 0.8, transparent: true, opacity: 0.85, castShadow: true };

  // Legs (0 to 0.86m)
  const legL = prevMakeOwnedMesh(new THREE.BoxGeometry(0.14, 0.86, 0.16), darkMat.color, darkMat);
  legL.position.set(-0.1, 0.43, 0);
  g.add(legL);

  const legR = prevMakeOwnedMesh(new THREE.BoxGeometry(0.14, 0.86, 0.16), darkMat.color, darkMat);
  legR.position.set(0.1, 0.43, 0);
  g.add(legR);

  // Torso (0.86 to 1.46m)
  const torso = prevMakeOwnedMesh(new THREE.BoxGeometry(0.4, 0.6, 0.22), bodyMat.color, bodyMat);
  torso.position.set(0, 1.16, 0);
  g.add(torso);

  // Arms
  const armL = prevMakeOwnedMesh(new THREE.BoxGeometry(0.11, 0.56, 0.12), bodyMat.color, bodyMat);
  armL.position.set(-0.28, 1.14, 0);
  g.add(armL);

  const armR = prevMakeOwnedMesh(new THREE.BoxGeometry(0.11, 0.56, 0.12), bodyMat.color, bodyMat);
  armR.position.set(0.28, 1.14, 0);
  g.add(armR);

  // Head (1.46 to 1.75m -> 1.75m total height)
  const head = prevMakeOwnedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 10), '#d4e9f5', {
    roughness: 0.65,
    transparent: true,
    opacity: 0.9,
    castShadow: true
  });
  head.position.set(0, 1.62, 0);
  g.add(head);

  // Pedestal base ring
  const base = prevMakeOwnedMesh(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 16), '#346982', {
    roughness: 0.75,
    transparent: true,
    opacity: 0.7
  });
  base.position.set(0, 0.0125, 0);
  g.add(base);

  g.position.set(x, y, z);
  return g;
}

export function rebuildObjectEnvironment(envGroup, cfg, view = {}, blueprint = null) {
  if (!envGroup) return;
  disposeObjectGroup(envGroup);

  const stageChoice = view.stage || 'auto';
  const defaultStage = blueprint?.placement?.defaultStage || 'street_curb';
  const locCtx = blueprint?.identity?.locationContext || 'exterior';
  const envTags = blueprint?.identity?.environmentTags || [];
  let resolvedDefault = defaultStage;
  const isArcadeEnv = envTags.includes('arcade') || envTags.includes('retro_arcade') || envTags.includes('modern_arcade');
  if (cfg?.familyId === 'computer_workstation' && defaultStage === 'desk_surface') {
    resolvedDefault = 'interior_floor';
  } else if (locCtx === 'interior' && isArcadeEnv && defaultStage === 'street_curb' && cfg?.familyId !== 'arcade_floor_wall_surface') {
    resolvedDefault = 'arcade_floor';
  } else if (locCtx === 'interior' && defaultStage === 'street_curb') {
    resolvedDefault = envTags.includes('lobby') || envTags.includes('reception') ? 'reception_lobby' : 'interior_floor';
  }
  const stage = stageChoice === 'auto' ? resolvedDefault : stageChoice;
  const helpers = view.helpers || {};
  const dimW = blueprint?.dimensions?.widthMeters || 2.0;
  const dimH = blueprint?.dimensions?.heightMeters || 1.8;
  const dimD = blueprint?.dimensions?.depthMeters || 1.6;
  const spanW = Math.max(7.0, dimW + 4.5);
  const spanD = Math.max(6.5, dimD + 4.5);

  if (stage === 'desk_surface') {
    const deskTopW = Math.max(1.65, dimW + 0.28);
    const deskTop = prevMakeOwnedMesh(new THREE.BoxGeometry(deskTopW, 0.04, 0.85), '#cfa87e', { roughness: 0.72 });
    deskTop.position.set(0, -0.02, 0);
    deskTop.name = 'EnvDeskSurfaceTop';
    envGroup.add(deskTop);

    const legX = deskTopW * 0.45;
    for (const [lx, lz] of [[-legX, -0.36], [legX, -0.36], [-legX, 0.36], [legX, 0.36]]) {
      const leg = prevMakeOwnedMesh(new THREE.BoxGeometry(0.04, 0.72, 0.04), '#2c333b', { roughness: 0.65 });
      leg.position.set(lx, -0.4, lz);
      envGroup.add(leg);
    }

    const carpetBase = prevMakeOwnedMesh(new THREE.BoxGeometry(3.4, 0.08, 2.8), '#38414a', { roughness: 0.95 });
    carpetBase.position.set(0, -0.78, 0);
    carpetBase.name = 'EnvDeskCarpetPad';
    envGroup.add(carpetBase);
  } else if (stage === 'interior_floor') {
    const floor = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.12, spanD), '#414b57', { roughness: 0.94 });
    floor.position.set(0, -0.06, 0);
    floor.name = 'EnvInteriorFloor';
    envGroup.add(floor);

    const trim = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.14, 0.14), '#2b323b', { roughness: 0.84 });
    trim.position.set(0, 0.07, -spanD * 0.48);
    envGroup.add(trim);
  } else if (stage === 'arcade_floor') {
    const carpetMat = getObjectMaterial('arcade_carpet_original', '#110d20', {
      role: 'primary',
      repeatX: 4,
      repeatY: 4,
      uvScaleMeters: 1.0
    });
    const carpetFloor = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.12, spanD), carpetMat);
    carpetFloor.position.set(0, -0.06, 0);
    carpetFloor.receiveShadow = true;
    carpetFloor.name = 'EnvArcadeCarpetFloor';
    envGroup.add(carpetFloor);

    const trim = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.14, 0.14), '#1a1230', { roughness: 0.72 });
    trim.position.set(0, 0.07, -spanD * 0.48);
    envGroup.add(trim);

    const neonStrip = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.035, 0.04), '#4de2ff', {
      roughness: 0.35,
      emissive: '#4de2ff',
      emissiveIntensity: 0.5
    });
    neonStrip.position.set(0, 0.12, -spanD * 0.46);
    envGroup.add(neonStrip);
  } else if (stage === 'office_corner') {
    const floor = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.12, spanD), '#46515e', { roughness: 0.94 });
    floor.position.set(0, -0.06, 0);
    floor.name = 'EnvInteriorFloor';
    envGroup.add(floor);

    const cornerH = Math.max(3.2, dimH + 1.2);
    const backWall = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, cornerH, 0.18), '#d8dfe6', { roughness: 0.88 });
    backWall.position.set(0, cornerH * 0.5, -spanD * 0.45);
    backWall.name = 'EnvOfficeBackWall';
    envGroup.add(backWall);

    const sideWall = prevMakeOwnedMesh(new THREE.BoxGeometry(0.18, cornerH, spanD), '#cfd7e0', { roughness: 0.88 });
    sideWall.position.set(-spanW * 0.45, cornerH * 0.5, 0);
    sideWall.name = 'EnvOfficeSideWall';
    envGroup.add(sideWall);

    const baseBack = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.14, 0.21), '#282e36', { roughness: 0.8 });
    baseBack.position.set(0, 0.07, -spanD * 0.45);
    envGroup.add(baseBack);

    const baseSide = prevMakeOwnedMesh(new THREE.BoxGeometry(0.21, 0.14, spanD), '#282e36', { roughness: 0.8 });
    baseSide.position.set(-spanW * 0.45, 0.07, 0);
    envGroup.add(baseSide);

    if (blueprint?.placement?.attachmentProfile === 'ceiling_mounted') {
      const ceilingSlab = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW * 0.88, 0.08, spanD * 0.88), '#e6ebf0', { roughness: 0.85 });
      ceilingSlab.position.set(0, 0.045, 0);
      ceilingSlab.name = 'EnvCeilingGrid';
      envGroup.add(ceilingSlab);
    }
  } else if (stage === 'reception_lobby') {
    const stoneFloor = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 0.12, spanD), '#c8cfd6', { roughness: 0.65 });
    stoneFloor.position.set(0, -0.06, 0);
    stoneFloor.name = 'EnvReceptionLobbyFloor';
    envGroup.add(stoneFloor);

    const rug = prevMakeOwnedMesh(
      new THREE.BoxGeometry(Math.max(2.8, dimW + 1.0), 0.02, Math.max(2.2, dimD + 0.8)),
      '#2c4257',
      { roughness: 0.94 }
    );
    rug.position.set(0, 0.005, 0);
    rug.name = 'EnvLobbyRug';
    envGroup.add(rug);

    const featureWall = prevMakeOwnedMesh(new THREE.BoxGeometry(spanW, 3.6, 0.22), '#593d2b', { roughness: 0.82 });
    featureWall.position.set(0, 1.8, -spanD * 0.46);
    featureWall.name = 'EnvLobbyFeatureWall';
    envGroup.add(featureWall);
  } else if (stage === 'street_curb' || stage === 'ground_sidewalk' || helpers.sidewalk) {
    const sidewalk = prevMakeOwnedMesh(
      new THREE.BoxGeometry(spanW, 0.14, spanD * 0.55),
      '#636b73',
      { roughness: 0.92 }
    );
    sidewalk.position.set(0, -0.07, -spanD * 0.18);
    sidewalk.name = 'EnvSidewalkSlab';
    envGroup.add(sidewalk);

    const curb = prevMakeOwnedMesh(
      new THREE.BoxGeometry(spanW, 0.15, 0.2),
      '#7b848d',
      { roughness: 0.88 }
    );
    curb.position.set(0, -0.075, spanD * 0.095);
    curb.name = 'EnvCurb';
    envGroup.add(curb);

    if (stage === 'street_curb') {
      const road = prevMakeOwnedMesh(
        new THREE.BoxGeometry(spanW, 0.08, spanD * 0.45),
        '#2b3138',
        { roughness: 0.95 }
      );
      road.position.set(0, -0.15, spanD * 0.34);
      road.name = 'EnvRoadAsphalt';
      envGroup.add(road);
    }
  } else if (stage === 'rooftop_deck') {
    const roofDeck = prevMakeOwnedMesh(
      new THREE.BoxGeometry(spanW, 0.16, spanD),
      '#4a4e54',
      { roughness: 0.94 }
    );
    roofDeck.position.set(0, -0.08, 0);
    roofDeck.name = 'EnvRooftopDeck';
    envGroup.add(roofDeck);

    const parapet = prevMakeOwnedMesh(
      new THREE.BoxGeometry(spanW, 0.95, 0.28),
      '#6d6f74',
      { roughness: 0.9 }
    );
    parapet.position.set(0, 0.475, -spanD * 0.48);
    parapet.name = 'EnvRooftopParapet';
    envGroup.add(parapet);

    const coping = prevMakeOwnedMesh(
      new THREE.BoxGeometry(spanW + 0.06, 0.08, 0.34),
      '#8d949b',
      { roughness: 0.78 }
    );
    coping.position.set(0, 0.98, -spanD * 0.48);
    envGroup.add(coping);
  } else if (stage === 'studio_pad') {
    const pad = prevMakeOwnedMesh(
      new THREE.CylinderGeometry(Math.max(2.6, Math.max(dimW, dimD) * 0.95), Math.max(2.8, Math.max(dimW, dimD) * 1.0), 0.08, 32),
      '#262d36',
      { roughness: 0.85 }
    );
    pad.position.set(0, -0.04, 0);
    pad.name = 'EnvStudioPad';
    envGroup.add(pad);
  }

  // Reference Wall when stage is wall_facade or Wall helper is toggled on
  const showWall = stage === 'wall_facade' || Boolean(helpers.wall);
  if (showWall) {
    const wallW = Math.max(5.5, dimW + 3.0);
    const wallH = Math.max(3.6, (blueprint?.dimensions?.heightMeters || 2.0) + 1.8);
    const wallOffsetZ = blueprint?.placement?.attachmentProfile === 'wall_mounted' || blueprint?.placement?.attachmentProfile === 'hanging'
      ? -0.14
      : -Math.max(0.85, dimD * 0.5 + 0.55);

    const wall = prevMakeOwnedMesh(
      new THREE.BoxGeometry(wallW, wallH, 0.28),
      '#6e4b3d',
      { roughness: 0.92, castShadow: true }
    );
    wall.position.set(0, wallH * 0.5 - 0.12, wallOffsetZ);
    wall.name = 'EnvWallFacade';
    envGroup.add(wall);

    const trim = prevMakeOwnedMesh(
      new THREE.BoxGeometry(wallW + 0.06, 0.14, 0.32),
      '#848a91',
      { roughness: 0.84 }
    );
    trim.position.set(0, 0.04, wallOffsetZ);
    envGroup.add(trim);
  }

  // Parking Space Outline Helper (2.6m x 5.2m)
  if (helpers.parkingSpace) {
    const stripeMat = { color: '#e5b832', roughness: 0.7 };
    const lineW = 2.6;
    const lineL = 5.2;
    const sL = prevMakeOwnedMesh(new THREE.BoxGeometry(0.11, 0.012, lineL), stripeMat.color, stripeMat);
    sL.position.set(-lineW * 0.5, 0.008, 0);
    envGroup.add(sL);
    const sR = prevMakeOwnedMesh(new THREE.BoxGeometry(0.11, 0.012, lineL), stripeMat.color, stripeMat);
    sR.position.set(lineW * 0.5, 0.008, 0);
    envGroup.add(sR);
    const sB = prevMakeOwnedMesh(new THREE.BoxGeometry(lineW + 0.11, 0.012, 0.11), stripeMat.color, stripeMat);
    sB.position.set(0, 0.008, -lineL * 0.5);
    envGroup.add(sB);
  }

  // Scale Grid Helper
  if (helpers.grid !== false) {
    const gridSize = clamp(Math.ceil(Math.max(spanW, spanD)), 8, 24);
    const grid = new THREE.GridHelper(gridSize, gridSize * 2, 0x3b6f8c, 0x1b2b39);
    grid.position.y = 0.004;
    grid.name = 'EnvScaleGrid';
    envGroup.add(grid);
  }

  // Human Scale Silhouette Helper (1.75m tall)
  if (helpers.humanScale !== false) {
    const hx = -Math.max(1.15, dimW * 0.5 + 0.85);
    const hz = blueprint?.placement?.attachmentProfile === 'wall_mounted' ? 0.45 : 0.1;
    envGroup.add(prevMakeHumanReference(hx, 0, hz));
  }
}

export function rebuildObjectDebugOverlay(debugGroup, objectGroup, view = {}) {
  if (!debugGroup) return;
  disposeObjectGroup(debugGroup);
  if (!view.debugOverlay || !objectGroup) return;

  const bp = objectGroup.userData?.blueprint || objectGroup.blueprint;
  if (!bp) return;

  const bounds = bp.dimensions?.boundsMeters;
  const col = bp.placement?.collisionProxy;

  // Footprint rectangle on base plane
  if (bp.placement?.footprintMeters) {
    const fw = Math.max(0.08, bp.placement.footprintMeters.width);
    const fd = Math.max(0.08, bp.placement.footprintMeters.depth);
    const footGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(fw, 0.03, fd));
    const footMat = new THREE.LineBasicMaterial({ color: '#3af0b8' });
    const footWire = new THREE.LineSegments(footGeo, footMat);
    footWire.position.set(bounds?.center?.x || 0, Math.max(0.02, bounds?.min?.y || 0.02), bounds?.center?.z || 0);
    footWire.userData = { _ownedMat: true };
    debugGroup.add(footWire);
  }

  // Collision proxy wireframe box
  if (col) {
    const sx = (col.halfExtentsMeters?.[0] || 0.25) * 2;
    const sy = (col.halfExtentsMeters?.[1] || 0.25) * 2;
    const sz = (col.halfExtentsMeters?.[2] || 0.25) * 2;
    const colGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz));
    const colMat = new THREE.LineBasicMaterial({ color: col.passable ? '#8fa3b5' : '#ffbd59' });
    const colWire = new THREE.LineSegments(colGeo, colMat);
    colWire.position.set(col.centerMeters?.[0] || 0, col.centerMeters?.[1] || sy * 0.5, col.centerMeters?.[2] || 0);
    colWire.userData = { _ownedMat: true };
    debugGroup.add(colWire);
  }

  // Attachment origin marker & normal arrow
  const originSphere = prevMakeOwnedMesh(new THREE.SphereGeometry(0.055, 10, 8), '#ff6ec7', {
    roughness: 0.4
  });
  originSphere.position.set(0, 0, 0);
  debugGroup.add(originSphere);

  const sn = bp.placement?.surfaceNormal || [0, 1, 0];
  const arrowDir = new THREE.Vector3(sn[0], sn[1], sn[2]).normalize();
  const arrow = new THREE.ArrowHelper(
    arrowDir,
    new THREE.Vector3(0, 0, 0),
    0.75,
    0x4de2ff,
    0.18,
    0.12
  );
  debugGroup.add(arrow);

  // Light source indicators
  for (const ls of bp.lighting?.lightSources || []) {
    const lm = prevMakeOwnedMesh(new THREE.SphereGeometry(0.075, 10, 8), ls.color || '#ffe394', {
      roughness: 0.2
    });
    lm.position.set(ls.positionMeters?.[0] || 0, ls.positionMeters?.[1] || 1, ls.positionMeters?.[2] || 0);
    debugGroup.add(lm);
  }

  // Assembly child origin pips
  for (const comp of bp.components || []) {
    const cm = prevMakeOwnedMesh(new THREE.BoxGeometry(0.11, 0.04, 0.11), '#4de2ff', { roughness: 0.4 });
    cm.position.set(
      comp.localPositionMeters?.[0] || 0,
      (comp.localPositionMeters?.[1] || 0) + 0.025,
      comp.localPositionMeters?.[2] || 0
    );
    debugGroup.add(cm);
  }
}

export function resetObjectCameraForFocus(camera, controls, blueprint, objectGroup) {
  if (!camera || !controls) return;
  const dim = blueprint?.dimensions || { widthMeters: 1.5, heightMeters: 1.5, depthMeters: 1.2 };
  const center = dim.boundsMeters?.center || { x: 0, y: dim.heightMeters * 0.5, z: 0 };
  const maxSpan = Math.max(0.28, dim.widthMeters, dim.heightMeters, dim.depthMeters);
  const dist = clamp(maxSpan * 2.15, 0.65, 18.0);
  const isWallMounted = blueprint?.placement?.attachmentProfile === 'wall_mounted' || blueprint?.placement?.attachmentProfile === 'hanging';

  controls.target.set(center.x, center.y, center.z);
  if (isWallMounted) {
    camera.position.set(center.x + dist * 0.48, center.y + dist * 0.28, center.z + dist * 0.88);
  } else {
    camera.position.set(center.x + dist * 0.72, center.y + dist * 0.52, center.z + dist * 0.78);
  }
  controls.update();
}

export function snapshotObjectPreview(renderer, scene, camera, state, toast) {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `city-object-${slugifyName(state.familyId || 'prop')}-${state.seed || 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (toast) toast('Saved Preview Snapshot');
  }, 'image/png');
}

export function toggleObjTheatreMode(view, toast, resizeFn) {
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

export function isObjFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return Boolean(
    document.fullscreenElement === frame ||
    (frame && frame.classList.contains('is-fullscreen'))
  );
}

export function updateObjFullscreenUI(view) {
  const active = isObjFullscreenActive();
  view.fullscreen = active;
  document.body.classList.toggle('studio-fullscreen-active', active);
  $('#btn-fullscreen')?.classList.toggle('active', active);
  $('#btn-fullscreen-quick')?.classList.toggle('active', active);
}

export async function enterObjFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (!frame) return;
  frame.classList.add('is-fullscreen');
  if (frame.requestFullscreen && !document.fullscreenElement) {
    try {
      await frame.requestFullscreen();
    } catch {
    }
  }
  updateObjFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode On (Press Esc To Exit)');
}

export async function exitObjFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame) frame.classList.remove('is-fullscreen');
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if already exited
    }
  }
  updateObjFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode Off');
}

export function toggleObjFullscreenViewport(view, toast, resizeFn) {
  if (isObjFullscreenActive()) return exitObjFullscreenViewport(view, toast, resizeFn);
  return enterObjFullscreenViewport(view, toast, resizeFn);
}

export function handleObjFullscreenChange(view, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame && !document.fullscreenElement) {
    frame.classList.remove('is-fullscreen');
  }
  updateObjFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
}

export function handleObjStudioKeydown(e, actions) {
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
  } else if (key === 'h') {
    e.preventDefault();
    actions.toggleHumanScale();
  } else if (key === 'p') {
    e.preventDefault();
    actions.snapshot();
  } else if (e.key === 'Escape' && isObjFullscreenActive()) {
    actions.exitFullscreen();
  }
}
