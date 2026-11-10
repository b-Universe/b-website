import { $, clamp, copy, rng32, randBetween, randInt, pick } from '../utils.js';
import { MATERIAL_CHOICES } from '../config.js';
import { generateBuildingBlueprint } from '../core/blueprints.js';
import { solid, clearMaterialCache } from '../geometry/materials.js';
import { box, cylinder, line, worldRoot } from '../geometry/primitives.js';
import { fileDownload, safeName } from './export.js';

export function createDebugLabelSprite(text, borderHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(7, 19, 30, 0.88)';
    ctx.fillRect(6, 6, 500, 100);
    ctx.lineWidth = 5;
    ctx.strokeStyle = borderHex;
    ctx.strokeRect(6, 6, 500, 100);
    ctx.fillStyle = '#e9fbff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text).slice(0, 32), 256, 56);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 0.75, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function buildEntranceDebugGizmos(parent, blueprint) {
  if (!blueprint || !Array.isArray(blueprint.entrances)) return;
  for (const ent of blueprint.entrances) {
    const gizmoRoot = worldRoot(parent);
    gizmoRoot.name = 'EntranceDebug_' + ent.id;

    const isInteractive = Boolean(ent.interactive);
    const isLocked = Boolean(ent.lockedByDefault);
    const primaryHex = !isInteractive ? '#94a3b8' : (isLocked ? '#ffbe0b' : '#00f5d4');
    const anchorHex = '#ff4d6d';
    const normalHex = '#00bbf9';
    const approachHex = '#38b000';
    const safeHex = '#80ed99';

    // Trigger box
    const trig = ent.trigger;
    const trigGroup = worldRoot(gizmoRoot, trig.localCenter.x, trig.localCenter.y, trig.localCenter.z);
    trigGroup.rotation.y = ent.door.rotation.y;

    const boxGeo = new THREE.BoxGeometry(trig.width, trig.height, trig.depth);
    const boxMat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: isInteractive ? 0.20 : 0.10,
      depthWrite: false
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.renderOrder = 990;
    trigGroup.add(boxMesh);

    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: 0.9
    });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    edgesMesh.renderOrder = 991;
    trigGroup.add(edgesMesh);

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
    const arrowLen = 1.45;
    const arrowY = anchorPos.y + 0.45;
    const nx = ent.door.normal.x;
    const nz = ent.door.normal.z;
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

    // Approach and safe position markers
    const appPos = ent.navigation.approachPosition;
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

    // Approach path link
    const linkMat = new THREE.MeshBasicMaterial({ color: normalHex, transparent: true, opacity: 0.55 });
    line(
      gizmoRoot,
      [anchorPos.x + nx * 0.1, anchorPos.y + 0.05, anchorPos.z + nz * 0.1],
      [appPos.x, appPos.y + 0.05, appPos.z],
      0.025,
      linkMat
    );

    // Entrance label
    const statusTag = !isInteractive
      ? 'DECORATIVE'
      : isLocked
        ? `${ent.category.toUpperCase()} • LOCKED`
        : ent.category.toUpperCase();
    const sprite = createDebugLabelSprite(`${ent.id} [${statusTag}]`, primaryHex);
    sprite.position.set(
      anchorPos.x + nx * 0.35,
      anchorPos.y + ent.door.height + 0.85,
      anchorPos.z + nz * 0.35
    );
    gizmoRoot.add(sprite);
  }
}

export function rebuildDebugOverlay(debugGroup, view, buildingGroup) {
  if (!debugGroup) return;
  disposeObject(debugGroup, true);
  debugGroup.visible = Boolean(view.entranceDebug);
  if (!view.entranceDebug || !buildingGroup) return;

  for (const child of buildingGroup.children) {
    const bp = child.userData?.blueprint || (child.userData?.settings ? generateBuildingBlueprint(child.userData.settings) : null);
    if (!bp) continue;
    const bldgDebug = worldRoot(debugGroup, child.position.x, child.position.y, child.position.z);
    bldgDebug.rotation.y = child.rotation.y;
    buildEntranceDebugGizmos(bldgDebug, bp);
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
