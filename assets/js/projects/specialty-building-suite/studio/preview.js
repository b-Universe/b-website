import { $, clamp, slugify } from '../utils.js';

export function disposeSpecialtyGroup(obj) {
  if (!obj) return;
  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeSpecialtyGroup(child);
  }
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.userData?._ownedMat && obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material.dispose();
  }
}

function makePreviewOwnedMesh(geo, colorHex, options = {}) {
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

function makeScaleHumanFigure(x, y, z) {
  const g = new THREE.Group();
  g.name = 'ScaleReferenceHuman_1_82m';
  const body = { color: '#58b8d9', roughness: 0.72, transparent: true, opacity: 0.88, castShadow: true };
  const pants = { color: '#2b4f61', roughness: 0.8, transparent: true, opacity: 0.88, castShadow: true };

  const legL = makePreviewOwnedMesh(new THREE.BoxGeometry(0.15, 0.9, 0.16), pants.color, pants);
  legL.position.set(-0.1, 0.45, 0);
  g.add(legL);

  const legR = makePreviewOwnedMesh(new THREE.BoxGeometry(0.15, 0.9, 0.16), pants.color, pants);
  legR.position.set(0.1, 0.45, 0);
  g.add(legR);

  const torso = makePreviewOwnedMesh(new THREE.BoxGeometry(0.42, 0.62, 0.22), body.color, body);
  torso.position.set(0, 1.21, 0);
  g.add(torso);

  const head = makePreviewOwnedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.25, 10), '#d4e9f5', body);
  head.position.set(0, 1.695, 0);
  g.add(head);

  const base = makePreviewOwnedMesh(new THREE.CylinderGeometry(0.35, 0.37, 0.025, 16), '#346982', { roughness: 0.75, transparent: true, opacity: 0.7 });
  base.position.set(0, 0.0125, 0);
  g.add(base);

  g.position.set(x, y, z);
  return g;
}

function rebuildBlueprintDebugOverlay(debugGroup, buildingGroup, showGizmos) {
  disposeSpecialtyGroup(debugGroup);
  if (!showGizmos || !buildingGroup) return;

  const bp = buildingGroup.userData?.blueprint;
  if (!bp) return;

  // Entrance arrows + clearance plates
  for (const ent of (bp.entrances || [])) {
    const color = ent.role === 'emergency' ? '#ff3838' : ent.role === 'garage' || ent.role === 'loading_dock' ? '#f59e0b' : '#22c55e';
    const ex = ent.position?.x || 0;
    const ey = (ent.position?.y || 0) + 0.06;
    const ez = ent.position?.z || 0;
    const nx = ent.normal?.x || 0;
    const nz = ent.normal?.z || 0;

    const pad = makePreviewOwnedMesh(new THREE.BoxGeometry(ent.width || 2.0, 0.06, 0.8), color, { transparent: true, opacity: 0.65 });
    pad.position.set(ex + nx * 0.6, ey, ez + nz * 0.6);
    debugGroup.add(pad);
  }

  // Placement anchor pins (green = used or open)
  for (const anchor of (bp.placementAnchors || [])) {
    const pin = makePreviewOwnedMesh(new THREE.CylinderGeometry(0.16, 0.04, 0.45, 8), '#38bdf8', { transparent: true, opacity: 0.85 });
    pin.position.set(anchor.position.x, (anchor.position.y || 0) + 0.25, anchor.position.z);
    debugGroup.add(pin);
  }
}

export function createSpecialtyPreview(canvasEl) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#131b26');

  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.2, 420);
  camera.position.set(22, 16, 26);

  const controls = new THREE.OrbitControls(camera, canvasEl);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 4;
  controls.maxDistance = 140;
  controls.target.set(0, 2.5, 0);

  // Lights
  const hemiLight = new THREE.HemisphereLight('#d6e7ff', '#28303b', 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff2dc', 1.15);
  sunLight.position.set(26, 36, 24);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 140;
  sunLight.shadow.camera.left = -35;
  sunLight.shadow.camera.right = 35;
  sunLight.shadow.camera.top = 35;
  sunLight.shadow.camera.bottom = -35;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight('#85b6ff', 0.38);
  rimLight.position.set(-22, 18, -24);
  scene.add(rimLight);

  // Subtle distant backdrop road + ground plane
  const stageGroup = new THREE.Group();
  stageGroup.name = 'PreviewStageGround';
  const groundMesh = makePreviewOwnedMesh(new THREE.PlaneGeometry(180, 180), '#1b232e', { roughness: 0.96, metalness: 0.02 });
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.02;
  stageGroup.add(groundMesh);

  const gridHelper = new THREE.GridHelper(90, 45, '#2e3e52', '#222d3b');
  gridHelper.position.y = -0.01;
  stageGroup.add(gridHelper);
  scene.add(stageGroup);

  const modelRoot = new THREE.Group();
  modelRoot.name = 'SpecialtyModelRoot';
  scene.add(modelRoot);

  const scaleHumanGroup = new THREE.Group();
  scaleHumanGroup.name = 'PreviewScaleHumanGroup';
  scene.add(scaleHumanGroup);

  const debugGizmoGroup = new THREE.Group();
  debugGizmoGroup.name = 'PreviewBlueprintGizmos';
  scene.add(debugGizmoGroup);

  let currentModel = null;
  let turntable = false;
  let turntableSpeed = 0.28;
  let showGrid = true;
  let showScaleHuman = true;
  let showGizmos = false;
  let wireframe = false;
  let silhouette = false;
  let lastFrameTime = performance.now();

  function resize() {
    const parent = canvasEl.parentElement;
    if (!parent) return;
    const w = Math.max(200, parent.clientWidth);
    const h = Math.max(200, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyLightingPreset(timeOfDay = 'day') {
    if (timeOfDay === 'night') {
      scene.background.set('#0b1019');
      hemiLight.color.set('#385380');
      hemiLight.groundColor.set('#0e131b');
      hemiLight.intensity = 0.42;
      sunLight.color.set('#7aa4db');
      sunLight.intensity = 0.52;
      sunLight.position.set(-18, 28, 18);
      rimLight.intensity = 0.55;
    } else if (timeOfDay === 'dusk') {
      scene.background.set('#231d2b');
      hemiLight.color.set('#f4a27e');
      hemiLight.groundColor.set('#22212e');
      hemiLight.intensity = 0.62;
      sunLight.color.set('#ff8f5c');
      sunLight.intensity = 1.05;
      sunLight.position.set(-28, 16, 20);
      rimLight.intensity = 0.48;
    } else if (timeOfDay === 'overcast') {
      scene.background.set('#27313d');
      hemiLight.color.set('#cfdbe8');
      hemiLight.groundColor.set('#333942');
      hemiLight.intensity = 0.92;
      sunLight.color.set('#dde5ed');
      sunLight.intensity = 0.65;
      sunLight.position.set(16, 38, 18);
      rimLight.intensity = 0.3;
    } else {
      scene.background.set('#141d29');
      hemiLight.color.set('#d6e7ff');
      hemiLight.groundColor.set('#29313c');
      hemiLight.intensity = 0.74;
      sunLight.color.set('#fff3df');
      sunLight.intensity = 1.18;
      sunLight.position.set(26, 36, 24);
      rimLight.intensity = 0.36;
    }
  }

  function applyRenderModes() {
    if (!currentModel) return;
    currentModel.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m.wireframe = Boolean(wireframe);
        if (silhouette) {
          if (m.userData && m.userData._origColorHex === undefined && m.color) {
            m.userData._origColorHex = m.color.getHex();
          }
          if (m.color) m.color.set('#0b0e12');
          if (m.emissive) m.emissive.set('#000000');
        } else if (m.userData && m.userData._origColorHex !== undefined && m.color) {
          m.color.setHex(m.userData._origColorHex);
          delete m.userData._origColorHex;
        }
      }
    });
  }

  function setModel(buildingGroup, cfg) {
    if (currentModel) {
      modelRoot.remove(currentModel);
      disposeSpecialtyGroup(currentModel);
    }
    currentModel = buildingGroup;
    modelRoot.add(buildingGroup);

    applyLightingPreset(cfg?.lightingTime || 'day');
    applyRenderModes();

    // Update scale human beside main entrance sidewalk
    disposeSpecialtyGroup(scaleHumanGroup);
    if (showScaleHuman) {
      const dims = buildingGroup.userData?.blueprint?.bounds?.buildingMeters?.size;
      const hx = -(dims?.x || 8) * 0.5 - 1.2;
      const hz = (dims?.z || 6) * 0.5 + 1.5;
      scaleHumanGroup.add(makeScaleHumanFigure(hx, 0.08, hz));
    }

    rebuildBlueprintDebugOverlay(debugGizmoGroup, buildingGroup, showGizmos);
  }

  function frameCamera(mode = 'full') {
    if (!currentModel) return;
    const box = new THREE.Box3().setFromObject(currentModel);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const span = Math.max(size.x, size.z, size.y * 1.4, 8);
    if (mode === 'street') {
      controls.target.set(center.x, Math.max(1.8, size.y * 0.25), center.z + size.z * 0.12);
      camera.position.set(center.x + span * 0.45, Math.max(3.2, size.y * 0.35), center.z + span * 0.92);
    } else if (mode === 'roof') {
      controls.target.set(center.x, center.y, center.z);
      camera.position.set(center.x + span * 0.32, span * 1.25, center.z + span * 0.32);
    } else if (mode === 'building') {
      const layerA = currentModel.getObjectByName('LayerA_BuildingStructure');
      if (layerA) {
        const bBox = new THREE.Box3().setFromObject(layerA);
        bBox.getSize(size);
        bBox.getCenter(center);
      }
      const bSpan = Math.max(size.x, size.z, size.y * 1.3, 6);
      controls.target.set(center.x, center.y * 0.85, center.z);
      camera.position.set(center.x + bSpan * 0.85, bSpan * 0.62, center.z + bSpan * 0.95);
    } else {
      controls.target.set(center.x, center.y * 0.72, center.z);
      camera.position.set(center.x + span * 0.82, span * 0.58, center.z + span * 0.94);
    }
    controls.update();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.08, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    if (turntable && currentModel) {
      modelRoot.rotation.y += turntableSpeed * dt;
      debugGizmoGroup.rotation.y = modelRoot.rotation.y;
      scaleHumanGroup.rotation.y = modelRoot.rotation.y;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(animate);

  return {
    renderer,
    scene,
    camera,
    controls,
    resize,
    setModel,
    frameCamera,
    applyLightingPreset,
    setTurntable(enabled, speed = 0.28) {
      turntable = Boolean(enabled);
      turntableSpeed = clamp(speed, 0.05, 1.5);
      if (!turntable) {
        modelRoot.rotation.y = 0;
        debugGizmoGroup.rotation.y = 0;
        scaleHumanGroup.rotation.y = 0;
      }
    },
    setGridVisible(v) {
      showGrid = Boolean(v);
      gridHelper.visible = showGrid;
    },
    setScaleHumanVisible(v) {
      showScaleHuman = Boolean(v);
      scaleHumanGroup.visible = showScaleHuman;
    },
    setGizmosVisible(v) {
      showGizmos = Boolean(v);
      rebuildBlueprintDebugOverlay(debugGizmoGroup, currentModel, showGizmos);
    },
    setWireframe(v) {
      wireframe = Boolean(v);
      applyRenderModes();
    },
    setSilhouette(v) {
      silhouette = Boolean(v);
      applyRenderModes();
    },
    captureSnapshot(cfg) {
      renderer.render(scene, camera);
      const url = canvasEl.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `specialty-${slugify(cfg?.presetId || cfg?.familyId || 'building')}-${cfg?.seed || 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };
}
