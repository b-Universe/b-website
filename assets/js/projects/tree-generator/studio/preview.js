import { tree$ } from '../utils.js';
import { createTreeMaterialBundle } from '../materials/materials.js';
import { generateTreeLodData } from '../geometry/lods.js';

export function disposeTreeHierarchy(obj) {
  if (!obj) return;
  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeTreeHierarchy(child);
  }
  if (obj.geometry) obj.geometry.dispose();
  if (obj.userData && obj.userData._tex) obj.userData._tex.dispose();
  if (obj.userData && obj.userData._ownedMat && obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material.dispose();
  }
  if (obj.userData && obj.userData._materialBundle) {
    const b = obj.userData._materialBundle;
    if (b.ownedMaterials) b.ownedMaterials.forEach((m) => m.dispose());
    if (b.ownedTextures) b.ownedTextures.forEach((t) => t.dispose());
    obj.userData._materialBundle = null;
  }
}

function makeDebugLabelSprite(text, bgColor = '#0c2334', borderColor = '#4de2ff') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 56;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 280, 56);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 274, 50);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 26), 140, 29);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.1, 0.42, 1);
  sprite.userData = { _tex: tex, _ownedMat: true };
  return sprite;
}

export function buildTreeDebugGizmos(treeGroup) {
  const root = new THREE.Group();
  root.name = 'TreeDebugGizmos';
  if (!treeGroup || !treeGroup.userData || !treeGroup.userData.blueprint) return root;

  const bp = treeGroup.userData.blueprint;
  const col = bp.collisionBounds;
  const inter = bp.interaction;
  const m = bp.bounds.meters;

  // Trunk cylinder collider wireframe
  if (col && col.trunkCylinder) {
    const tc = col.trunkCylinder;
    const cylGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(tc.radius, tc.radius, tc.height, 12));
    const cylMat = new THREE.LineBasicMaterial({ color: tc.passable ? 0x52c41a : 0xffbd59 });
    const cylWire = new THREE.LineSegments(cylGeo, cylMat);
    cylWire.position.set(tc.center.x, tc.center.y, tc.center.z);
    cylWire.userData = { _ownedMat: true };
    root.add(cylWire);
  }

  // Canopy bounding box wireframe
  if (col && col.canopyBox) {
    const cb = col.canopyBox;
    const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(cb.size.x, cb.size.y, cb.size.z));
    const boxMat = new THREE.LineBasicMaterial({ color: 0x00e0ff });
    const boxWire = new THREE.LineSegments(boxGeo, boxMat);
    boxWire.position.set(cb.center.x, cb.center.y, cb.center.z);
    boxWire.userData = { _ownedMat: true };
    root.add(boxWire);
  }

  // Harvest / Interaction ring & Shade radius ring
  if (inter) {
    const ringGeo = new THREE.RingGeometry(inter.harvestRingRadius - 0.04, inter.harvestRingRadius, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6ce8ac, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.03;
    ring.userData = { _ownedMat: true };
    root.add(ring);

    const shadeGeo = new THREE.RingGeometry(inter.shadeRadius - 0.03, inter.shadeRadius, 36);
    shadeGeo.rotateX(-Math.PI / 2);
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0x4de2ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = 0.025;
    shade.userData = { _ownedMat: true };
    root.add(shade);

    if (Array.isArray(inter.approachPositions)) {
      inter.approachPositions.forEach((pt) => {
        const markerGeo = new THREE.OctahedronGeometry(0.11, 0);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0x6ce8ac });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(pt.x, 0.14, pt.z);
        marker.userData = { _ownedMat: true };
        root.add(marker);
      });
    }
  }

  const label = makeDebugLabelSprite(`${m.width.toFixed(1)}m × ${m.height.toFixed(1)}m (${bp.bounds.bGameUnits.height.toFixed(0)}B)`);
  if (label) {
    label.position.set(0, m.height + 0.65, 0);
    root.add(label);
  }

  return root;
}

export function buildHumanScaleReference() {
  const group = new THREE.Group();
  group.name = 'HumanScale182cm';
  const mat = new THREE.MeshLambertMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.85 });

  // Stylized 1.82m humanoid silhouette
  const legs = new THREE.BoxGeometry(0.36, 0.86, 0.22);
  legs.translate(0, 0.43, 0);
  const torso = new THREE.BoxGeometry(0.46, 0.64, 0.24);
  torso.translate(0, 1.18, 0);
  const head = new THREE.SphereGeometry(0.14, 8, 6);
  head.translate(0, 1.68, 0);

  [legs, torso, head].forEach((geo) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.userData = { _ownedMat: true };
    group.add(m);
  });

  const label = makeDebugLabelSprite('1.82m Player Ref', '#061b29', '#00e0ff');
  if (label) {
    label.scale.set(1.4, 0.28, 1);
    label.position.set(0, 2.08, 0);
    group.add(label);
  }

  return group;
}

export function rebuildTreeEnvironment(groundGroup, stage = 'meadow', showGrid = true, radius = 6.5, cfg = {}) {
  disposeTreeHierarchy(groundGroup);
  if (!groundGroup || stage === 'none') return;

  let groundColor = 0x264527;
  if (stage === 'forest_floor') groundColor = 0x1e3521;
  else if (stage === 'city_sidewalk') groundColor = 0x5c636b;
  else if (stage === 'desert_sand') groundColor = 0xc29b61;
  else if (stage === 'snow_tundra') groundColor = 0xdcebf2;
  else if (stage === 'studio') groundColor = 0x18212b;
  else if (cfg.season === 'winter') groundColor = 0xdcebf2;
  else if (cfg.season === 'autumn') groundColor = 0x3b4d28;

  const discGeo = new THREE.CylinderGeometry(radius, radius * 1.06, 0.35, 28);
  discGeo.translate(0, -0.175, 0);
  const discMat = new THREE.MeshLambertMaterial({ color: groundColor });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.receiveShadow = true;
  disc.userData = { _ownedMat: true };
  groundGroup.add(disc);

  if (stage === 'city_sidewalk') {
    const curbGeo = new THREE.BoxGeometry(radius * 1.85, 0.08, 0.25);
    curbGeo.translate(0, 0.04, radius * 0.62);
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x8d959e });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.receiveShadow = true;
    curb.userData = { _ownedMat: true };
    groundGroup.add(curb);
  } else if (stage === 'forest_floor' || stage === 'meadow') {
    // Low-poly accent pebbles around perimeter
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x555e66 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.35;
      const dist = radius * 0.72;
      const rGeo = new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.08, 0);
      rGeo.scale(1.3, 0.65, 1.0);
      rGeo.translate(Math.cos(ang) * dist, 0.06, Math.sin(ang) * dist);
      const rock = new THREE.Mesh(rGeo, rockMat);
      rock.receiveShadow = true;
      rock.castShadow = true;
      rock.userData = { _ownedMat: true };
      groundGroup.add(rock);
    }
  }

  if (showGrid) {
    const grid = new THREE.GridHelper(radius * 2, Math.min(32, Math.round(radius * 2)), 0x00e0ff, 0x1a3344);
    grid.position.y = 0.012;
    grid.material.opacity = 0.26;
    grid.material.transparent = true;
    grid.userData = { _ownedMat: true };
    groundGroup.add(grid);
  }
}

export function applyTreeLightingMode(scene, lights, mode = 'day') {
  if (!scene || !lights) return;
  const { hemiLight, sunLight, rimLight } = lights;
  if (mode === 'golden_hour') {
    scene.fog = new THREE.FogExp2(0x2b1b17, 0.008);
    hemiLight.color.setHex(0xffd6a5);
    hemiLight.groundColor.setHex(0x3a241b);
    hemiLight.intensity = 0.62;
    sunLight.color.setHex(0xff9f43);
    sunLight.intensity = 1.05;
    sunLight.position.set(22, 11, 14);
    rimLight.color.setHex(0xffbe76);
    rimLight.intensity = 0.35;
  } else if (mode === 'dusk') {
    scene.fog = new THREE.FogExp2(0x13172b, 0.010);
    hemiLight.color.setHex(0x748cab);
    hemiLight.groundColor.setHex(0x141824);
    hemiLight.intensity = 0.45;
    sunLight.color.setHex(0xc77dff);
    sunLight.intensity = 0.55;
    sunLight.position.set(-18, 12, 14);
    rimLight.color.setHex(0x00e0ff);
    rimLight.intensity = 0.42;
  } else if (mode === 'night') {
    scene.fog = new THREE.FogExp2(0x050912, 0.011);
    hemiLight.color.setHex(0x3b5284);
    hemiLight.groundColor.setHex(0x090d16);
    hemiLight.intensity = 0.36;
    sunLight.color.setHex(0x90caf9);
    sunLight.intensity = 0.42;
    sunLight.position.set(-14, 24, -12);
    rimLight.color.setHex(0x00e0ff);
    rimLight.intensity = 0.48;
  } else {
    scene.fog = new THREE.FogExp2(0x091018, 0.0085);
    hemiLight.color.setHex(0xdff4ff);
    hemiLight.groundColor.setHex(0x1d2b1f);
    hemiLight.intensity = 0.68;
    sunLight.color.setHex(0xfff4d6);
    sunLight.intensity = 0.88;
    sunLight.position.set(18, 28, 16);
    rimLight.color.setHex(0x00e0ff);
    rimLight.intensity = 0.25;
  }
}

export function resolveAmbientFxMode(cfg) {
  if (!cfg.ambientFx || cfg.ambientFx === 'none') return 'none';
  if (cfg.ambientFx !== 'auto') return cfg.ambientFx;
  if (cfg.species === 'sakura' || cfg.season === 'blossom') return 'petals';
  if (cfg.season === 'winter' || cfg.snow > 0.45) return 'snow';
  if (cfg.season === 'autumn') return 'leaves';
  if (cfg.species === 'fantasy' || cfg.lightingMode === 'night') return 'fireflies';
  return 'none';
}

export function rebuildAmbientParticles(particleGroup, cfg, spread = 4.0, height = 7.0) {
  disposeTreeHierarchy(particleGroup);
  const mode = resolveAmbientFxMode(cfg);
  if (mode === 'none') return;

  const count = 28;
  let col = 0xffb3d9;
  if (mode === 'snow') col = 0xf0f8ff;
  else if (mode === 'leaves') col = 0xe87a24;
  else if (mode === 'fireflies') col = 0x80ffdb;

  const mat = new THREE.MeshBasicMaterial({ color: col });
  const geo = mode === 'snow' || mode === 'fireflies'
    ? new THREE.OctahedronGeometry(0.055, 0)
    : new THREE.BoxGeometry(0.11, 0.02, 0.07);

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat);
    const angle = (i / count) * Math.PI * 2 + (i % 5);
    const rad = 0.5 + ((i * 37) % 100) / 100 * (spread * 0.9);
    const py = ((i * 53) % 100) / 100 * height;
    p.position.set(Math.cos(angle) * rad, py, Math.sin(angle) * rad);
    p.userData = {
      _ownedMat: i === 0,
      baseX: p.position.x,
      baseZ: p.position.z,
      speed: mode === 'fireflies' ? 0.5 : (0.7 + (i % 4) * 0.25),
      phase: i * 0.7,
      maxH: height + 1.0,
      mode
    };
    particleGroup.add(p);
  }
}

export function tickAmbientParticles(particleGroup, dt, elapsed) {
  if (!particleGroup || particleGroup.children.length === 0) return;
  for (let i = 0; i < particleGroup.children.length; i++) {
    const p = particleGroup.children[i];
    const ud = p.userData;
    if (!ud || !ud.mode) continue;
    if (ud.mode === 'fireflies') {
      p.position.x = ud.baseX + Math.sin(elapsed * 1.1 + ud.phase) * 0.45;
      p.position.y += Math.sin(elapsed * 1.6 + ud.phase) * dt * 0.35;
      p.position.z = ud.baseZ + Math.cos(elapsed * 0.9 + ud.phase) * 0.45;
    } else {
      p.position.y -= dt * ud.speed;
      p.position.x = ud.baseX + Math.sin(elapsed * 1.2 + ud.phase) * 0.35;
      p.rotation.y += dt * 1.4;
      p.rotation.z += dt * 0.8;
      if (p.position.y < 0.08) {
        p.position.y = ud.maxH;
      }
    }
  }
}

export function applyTreeWindSway(contentGroup, cfg, elapsed) {
  const wind = Number(cfg.windStrength) || 0;
  if (!contentGroup || wind <= 0.01) return;
  const freq = cfg.species === 'bamboo' || cfg.species === 'palm' ? 1.5 : 1.05;
  const amp = wind * 0.032;

  contentGroup.traverse((obj) => {
    if (!obj.userData || !Array.isArray(obj.userData.windTargets)) return;
    const targets = obj.userData.windTargets;
    for (let i = 0; i < targets.length; i++) {
      const mesh = targets[i];
      mesh.rotation.z = Math.sin(elapsed * freq + i) * amp;
      mesh.rotation.x = Math.cos(elapsed * freq * 0.8 + i) * amp * 0.7;
    }
  });
}

export class OffscreenTreeAtlasBaker {
  constructor(initialRes = 512) {
    this.res = initialRes;
    this.scene = new THREE.Scene();
    const amb = new THREE.AmbientLight(0xffffff, 0.72);
    const dir1 = new THREE.DirectionalLight(0xfff8e7, 0.78);
    dir1.position.set(6, 12, 8);
    const dir2 = new THREE.DirectionalLight(0x90caf9, 0.32);
    dir2.position.set(-6, 4, -6);
    this.scene.add(amb, dir1, dir2);

    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(this.res, this.res);
    this.renderer.setClearColor(0x000000, 0);

    const atlasCanvas = tree$('#atlas-canvas');
    this.sharedTexture = atlasCanvas ? new THREE.CanvasTexture(atlasCanvas) : null;
    if (this.sharedTexture) {
      this.sharedTexture.magFilter = THREE.LinearFilter;
      this.sharedTexture.minFilter = THREE.LinearMipmapLinearFilter;
    }
  }

  bake(lod0Data, res = 512) {
    const atlasCanvas = tree$('#atlas-canvas');
    if (res !== this.res) {
      this.res = res;
      this.renderer.setSize(res, res);
    }
    if (atlasCanvas && atlasCanvas.width !== res) {
      atlasCanvas.width = res;
      atlasCanvas.height = res;
    }

    const toRemove = [];
    this.scene.traverse((obj) => {
      if (obj.isMesh) toRemove.push(obj);
    });
    toRemove.forEach((m) => this.scene.remove(m));

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const tempMesh = new THREE.Mesh(lod0Data.mergedGeo, mat);
    this.scene.add(tempMesh);

    const size = lod0Data.size;
    const center = lod0Data.center;
    const maxDim = Math.max(size.x, size.y, size.z, 2.0) * 0.56;

    this.camera.left = -maxDim;
    this.camera.right = maxDim;
    this.camera.top = maxDim;
    this.camera.bottom = -maxDim;
    this.camera.updateProjectionMatrix();

    const half = res / 2;
    this.renderer.setScissorTest(true);
    this.renderer.clear();

    // 0 deg Front
    this.renderer.setViewport(0, half, half, half);
    this.renderer.setScissor(0, half, half, half);
    this.camera.position.set(center.x, center.y, center.z + 25);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(center);
    this.renderer.render(this.scene, this.camera);

    // 45 deg Oblique
    this.renderer.setViewport(half, half, half, half);
    this.renderer.setScissor(half, half, half, half);
    this.camera.position.set(center.x + 18, center.y, center.z + 18);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(center);
    this.renderer.render(this.scene, this.camera);

    // 90 deg Side
    this.renderer.setViewport(0, 0, half, half);
    this.renderer.setScissor(0, 0, half, half);
    this.camera.position.set(center.x + 25, center.y, center.z);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(center);
    this.renderer.render(this.scene, this.camera);

    // Iso Top Cap
    this.renderer.setViewport(half, 0, half, half);
    this.renderer.setScissor(half, 0, half, half);
    this.camera.position.set(center.x, center.y + 25, center.z + 0.01);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(center);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setScissorTest(false);

    if (atlasCanvas) {
      const ctx = atlasCanvas.getContext('2d');
      ctx.clearRect(0, 0, res, res);
      ctx.drawImage(this.renderer.domElement, 0, 0, res, res);
    }
    if (this.sharedTexture) {
      this.sharedTexture.needsUpdate = true;
    }

    mat.dispose();
    return { maxDim, center, size };
  }

  dispose() {
    disposeTreeHierarchy(this.scene);
    this.scene.clear();
    if (this.sharedTexture) this.sharedTexture.dispose();
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (_) {}
  }
}

export function buildPlacementCursorHelper() {
  const group = new THREE.Group();
  group.name = 'PlacementCursorHelper';
  group.visible = false;

  const ringGeo = new THREE.RingGeometry(0.10, 0.145, 20);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00fffe,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthTest: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.userData = { _ownedMat: true };
  group.add(ring);

  const dotGeo = new THREE.OctahedronGeometry(0.055, 0);
  const dotMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.name = 'PlacementDropOrb';
  dot.userData = { _ownedMat: true };
  group.add(dot);

  const cordGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.4, 0)
  ]);
  const cordMat = new THREE.LineBasicMaterial({ color: 0x00fffe, transparent: true, opacity: 0.85, depthTest: false });
  const cordLine = new THREE.Line(cordGeo, cordMat);
  cordLine.name = 'PlacementDropLine';
  cordLine.userData = { _ownedMat: true };
  group.add(cordLine);

  group.userData = { ring, dot, cordLine };
  return group;
}

export function updatePlacementCursorHelper(cursorGroup, worldPoint, worldNormal, brush = {}) {
  if (!cursorGroup) return;
  if (!worldPoint) {
    cursorGroup.visible = false;
    return;
  }

  cursorGroup.visible = true;
  cursorGroup.position.copy(worldPoint);

  const { ring, dot, cordLine } = cursorGroup.userData || {};
  const n = worldNormal ? worldNormal.clone().normalize() : new THREE.Vector3(0, 1, 0);
  if (ring) {
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    ring.material.color.set(brush.color || '#00fffe');
  }

  const drop = Number(brush.hangLength) || 0;
  const scale = Number(brush.scale) || 1;
  if (cordLine && dot) {
    if (drop > 0.02) {
      cordLine.visible = true;
      const posAttr = cordLine.geometry.attributes.position;
      posAttr.setXYZ(0, 0, 0, 0);
      posAttr.setXYZ(1, 0, -drop, 0);
      posAttr.needsUpdate = true;
      dot.position.set(0, -drop - 0.04 * scale, 0);
    } else {
      cordLine.visible = false;
      dot.position.copy(n).multiplyScalar(0.05 * scale);
    }
    dot.scale.setScalar(scale);
    dot.material.color.set(brush.color || '#ffffff');
  }
}
