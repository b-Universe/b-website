import {
  treeClamp,
  treeDarkenHex,
  treeLightenHex,
  treeNormalizeHex,
  treeRandBetween,
  treeRng32,
  treeRoundNum
} from '../utils.js';
import { treeColorizeGeometry } from './primitives.js';

export const TREE_PLACED_DETAIL_CATEGORIES = [
  { id: 'all', label: 'All Details', icon: 'fa-sparkles' },
  { id: 'flowers', label: 'Flowers', icon: 'fa-spa' },
  { id: 'fruits', label: 'Fruits & Cones', icon: 'fa-apple-whole' },
  { id: 'hanging', label: 'Hanging Objects', icon: 'fa-lightbulb' }
];

export const TREE_PLACED_DETAIL_TYPES = [
  // Flowers
  { id: 'blossom', label: 'Sakura Blossom', category: 'flowers', mode: 'surface', defaultColor: '#ff85a2', defaultAccent: '#ffe066', defaultScale: 1.0, defaultHang: 0.0, defaultEmissive: false },
  { id: 'hibiscus', label: 'Tropical Hibiscus', category: 'flowers', mode: 'surface', defaultColor: '#ff4d6d', defaultAccent: '#ffd166', defaultScale: 1.05, defaultHang: 0.0, defaultEmissive: false },
  { id: 'orchid', label: 'Hanging Orchid', category: 'flowers', mode: 'hanging', defaultColor: '#c77dff', defaultAccent: '#f8edeb', defaultScale: 0.95, defaultHang: 0.28, defaultEmissive: false },
  { id: 'rose', label: 'Velvet Rose', category: 'flowers', mode: 'surface', defaultColor: '#d90429', defaultAccent: '#2b9348', defaultScale: 0.95, defaultHang: 0.0, defaultEmissive: false },
  { id: 'glow_lotus', label: 'Glow Lotus Bud', category: 'flowers', mode: 'surface', defaultColor: '#80ffdb', defaultAccent: '#5e60ce', defaultScale: 1.0, defaultHang: 0.0, defaultEmissive: true },
  // Fruits & Cones
  { id: 'apple', label: 'Orchard Apple', category: 'fruits', mode: 'hanging', defaultColor: '#e63946', defaultAccent: '#52b788', defaultScale: 1.0, defaultHang: 0.14, defaultEmissive: false },
  { id: 'citrus', label: 'Golden Orange', category: 'fruits', mode: 'hanging', defaultColor: '#f77f00', defaultAccent: '#40916c', defaultScale: 1.0, defaultHang: 0.12, defaultEmissive: false },
  { id: 'pear', label: 'Honey Pear', category: 'fruits', mode: 'hanging', defaultColor: '#b5c938', defaultAccent: '#6c584c', defaultScale: 1.0, defaultHang: 0.16, defaultEmissive: false },
  { id: 'berry_cluster', label: 'Berry Bunch', category: 'fruits', mode: 'hanging', defaultColor: '#7209b7', defaultAccent: '#4361ee', defaultScale: 1.0, defaultHang: 0.18, defaultEmissive: false },
  { id: 'acorn', label: 'Oak Acorn', category: 'fruits', mode: 'hanging', defaultColor: '#9c6644', defaultAccent: '#582f0e', defaultScale: 1.0, defaultHang: 0.12, defaultEmissive: false },
  { id: 'pinecone', label: 'Cedar Pinecone', category: 'fruits', mode: 'hanging', defaultColor: '#6b4423', defaultAccent: '#4a2e16', defaultScale: 1.05, defaultHang: 0.15, defaultEmissive: false },
  // Hanging Objects & Perches
  { id: 'paper_lantern', label: 'Paper Lantern', category: 'hanging', mode: 'hanging', defaultColor: '#ff9f1c', defaultAccent: '#2b2d42', defaultScale: 1.0, defaultHang: 0.45, defaultEmissive: true },
  { id: 'iron_lantern', label: 'Iron Cage Lantern', category: 'hanging', mode: 'hanging', defaultColor: '#ffd166', defaultAccent: '#252936', defaultScale: 1.0, defaultHang: 0.50, defaultEmissive: true },
  { id: 'wind_chime', label: 'Bamboo Wind Chime', category: 'hanging', mode: 'hanging', defaultColor: '#e9c46a', defaultAccent: '#8d5524', defaultScale: 1.0, defaultHang: 0.42, defaultEmissive: false },
  { id: 'birdhouse', label: 'Hanging Birdhouse', category: 'hanging', mode: 'hanging', defaultColor: '#b08968', defaultAccent: '#bc4749', defaultScale: 1.0, defaultHang: 0.38, defaultEmissive: false },
  { id: 'beehive', label: 'Wild Beehive', category: 'hanging', mode: 'hanging', defaultColor: '#f4a261', defaultAccent: '#e76f51', defaultScale: 1.0, defaultHang: 0.34, defaultEmissive: false },
  { id: 'bird_nest', label: 'Songbird Nest', category: 'hanging', mode: 'upright', defaultColor: '#7f5539', defaultAccent: '#90e0ef', defaultScale: 1.0, defaultHang: 0.0, defaultEmissive: false },
  { id: 'crystal_charm', label: 'Arcane Dew Charm', category: 'hanging', mode: 'hanging', defaultColor: '#00f5d4', defaultAccent: '#9b5de5', defaultScale: 1.0, defaultHang: 0.44, defaultEmissive: true },
  { id: 'prayer_tag', label: 'Wish Charm Tag', category: 'hanging', mode: 'hanging', defaultColor: '#f8f9fa', defaultAccent: '#e63946', defaultScale: 1.0, defaultHang: 0.32, defaultEmissive: false },
  { id: 'moss_drape', label: 'Moss Tendril', category: 'hanging', mode: 'hanging', defaultColor: '#588157', defaultAccent: '#a3b18a', defaultScale: 1.0, defaultHang: 0.72, defaultEmissive: false }
];

const PLACED_DETAIL_MAP = new Map(TREE_PLACED_DETAIL_TYPES.map((d) => [d.id, d]));

export function getPlacedDetailMeta(kind) {
  return PLACED_DETAIL_MAP.get(kind) || TREE_PLACED_DETAIL_TYPES[0];
}

export function sanitisePlacedDetail(raw = {}, index = 0) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const meta = getPlacedDetailMeta(src.kind);
  const pos = src.position && typeof src.position === 'object' ? src.position : {};
  const norm = src.normal && typeof src.normal === 'object' ? src.normal : {};

  let nx = Number(norm.x);
  let ny = Number(norm.y);
  let nz = Number(norm.z);
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) {
    nx = 0;
    ny = 1;
    nz = 0;
  }
  const nLen = Math.hypot(nx, ny, nz) || 1;

  const defaultHang = meta.mode === 'surface' || meta.mode === 'upright' ? 0 : meta.defaultHang;
  const hangRaw = src.hangLength !== undefined ? Number(src.hangLength) : defaultHang;

  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim().slice(0, 48) : `det_${index + 1}`,
    kind: meta.id,
    position: {
      x: treeRoundNum(treeClamp(Number(pos.x) || 0, -14, 14), 3),
      y: treeRoundNum(treeClamp(Number(pos.y) || 2, 0.15, 28), 3),
      z: treeRoundNum(treeClamp(Number(pos.z) || 0, -14, 14), 3)
    },
    normal: {
      x: treeRoundNum(nx / nLen, 3),
      y: treeRoundNum(ny / nLen, 3),
      z: treeRoundNum(nz / nLen, 3)
    },
    scale: treeRoundNum(treeClamp(Number(src.scale) || meta.defaultScale || 1, 0.35, 2.5), 2),
    hangLength: treeRoundNum(treeClamp(Number.isFinite(hangRaw) ? hangRaw : defaultHang, 0, 2.2), 2),
    color: treeNormalizeHex(src.color, meta.defaultColor),
    accentColor: treeNormalizeHex(src.accentColor, meta.defaultAccent),
    emissive: src.emissive !== undefined ? Boolean(src.emissive) : Boolean(meta.defaultEmissive),
    rotation: treeRoundNum(Number.isFinite(Number(src.rotation)) ? Number(src.rotation) : (index * 1.17) % (Math.PI * 2), 3)
  };
}

export function sanitisePlacedDetailsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const limit = Math.min(rawList.length, 128);
  const out = [];
  for (let i = 0; i < limit; i++) {
    out.push(sanitisePlacedDetail(rawList[i], i));
  }
  return out;
}

function orientGeometryToSurface(geo, item) {
  const n = new THREE.Vector3(item.normal.x, item.normal.y, item.normal.z).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.rotation || 0);
  quat.multiply(rotY);
  geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quat));
  geo.translate(item.position.x, item.position.y, item.position.z);
  return geo;
}

function placeAtPoint(geo, x, y, z, rotY = 0) {
  if (rotY) geo.rotateY(rotY);
  geo.translate(x, y, z);
  return geo;
}

function addDetailGeo(targetArr, geo, c1, c2, rng, variance = 0.06) {
  targetArr.push(treeColorizeGeometry(geo, c1, c2 || c1, '#ffffff', rng, { variance }));
}

function addHangingCord(trunkProps, item, topY, dropLen, cordHex, rng, thickness = 0.012) {
  const anchorOverlap = 0.05;
  const fullLen = dropLen + anchorOverlap;
  if (fullLen <= 0.06) return;
  const cord = new THREE.CylinderGeometry(thickness, thickness * 0.9, fullLen, 4, 1);
  placeAtPoint(cord, item.position.x, topY - fullLen * 0.5 + anchorOverlap, item.position.z);
  addDetailGeo(trunkProps, cord, cordHex, treeDarkenHex(cordHex, 0.25), rng, 0.04);

  const knot = new THREE.OctahedronGeometry(thickness * 2.2, 0);
  placeAtPoint(knot, item.position.x, topY, item.position.z);
  addDetailGeo(trunkProps, knot, cordHex, treeDarkenHex(cordHex, 0.2), rng, 0.04);
}

function buildFlowerDetail(item, s, isLod1, rng, out) {
  const { foliageProps, trunkProps, emissiveProps } = out;
  const px = item.position.x;
  const py = item.position.y;
  const pz = item.position.z;
  const primary = item.color;
  const secondary = treeLightenHex(primary, 0.22);
  const targetArr = item.emissive ? emissiveProps : foliageProps;

  if (item.kind === 'orchid') {
    const drop = Math.max(0.14, item.hangLength);
    addHangingCord(trunkProps, item, py, drop, '#4a6b38', rng, 0.011 * s);
    const segCount = isLod1 ? 2 : 3;
    for (let i = 0; i < segCount; i++) {
      const frac = (i + 1) / segCount;
      const by = py - drop * frac;
      const side = (i % 2 === 0 ? 1 : -1) * 0.055 * s;
      const petal = new THREE.CylinderGeometry(0.085 * s, 0.03 * s, 0.03 * s, 5, 1);
      petal.rotateX(Math.PI * 0.35);
      petal.rotateY(item.rotation + i * 0.8);
      placeAtPoint(petal, px + side, by, pz + (i - 1) * 0.03 * s);
      addDetailGeo(targetArr, petal, primary, secondary, rng, 0.07);

      const core = new THREE.OctahedronGeometry(0.025 * s, 0);
      placeAtPoint(core, px + side, by + 0.01 * s, pz + (i - 1) * 0.03 * s);
      addDetailGeo(targetArr, core, item.accentColor, primary, rng, 0.05);
    }
    return;
  }

  if (item.kind === 'glow_lotus') {
    const cup = new THREE.DodecahedronGeometry(0.13 * s, 0);
    cup.scale(1.15, 0.9, 1.15);
    cup.translate(0, 0.07 * s, 0);
    orientGeometryToSurface(cup, item);
    addDetailGeo(targetArr, cup, primary, secondary, rng, 0.06);

    const spire = new THREE.ConeGeometry(0.075 * s, 0.16 * s, 5, 1);
    spire.translate(0, 0.15 * s, 0);
    orientGeometryToSurface(spire, item);
    addDetailGeo(targetArr, spire, item.accentColor, primary, rng, 0.05);
    return;
  }

  if (item.kind === 'rose') {
    const layers = isLod1 ? 2 : 3;
    for (let l = 0; l < layers; l++) {
      const r = (0.12 - l * 0.03) * s;
      const cup = new THREE.CylinderGeometry(r * 1.1, r * 0.55, 0.07 * s, 6, 1);
      cup.translate(0, (0.035 + l * 0.025) * s, 0);
      orientGeometryToSurface(cup, item);
      addDetailGeo(targetArr, cup, l === layers - 1 ? treeDarkenHex(primary, 0.15) : primary, secondary, rng, 0.06);
    }
    const baseLeaf = new THREE.CylinderGeometry(0.14 * s, 0.04 * s, 0.025 * s, 4, 1);
    baseLeaf.translate(0, 0.012 * s, 0);
    orientGeometryToSurface(baseLeaf, item);
    addDetailGeo(foliageProps, baseLeaf, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.05);
    return;
  }

  // Blossom / Hibiscus multi-petal crown
  const petalCount = isLod1 ? 4 : 5;
  const petalSpread = (item.kind === 'hibiscus' ? 0.105 : 0.085) * s;
  for (let p = 0; p < petalCount; p++) {
    const ang = (p / petalCount) * Math.PI * 2;
    const petal = new THREE.DodecahedronGeometry(0.065 * s, 0);
    petal.scale(1.15, 0.28, 0.85);
    petal.translate(Math.cos(ang) * petalSpread, 0.035 * s, Math.sin(ang) * petalSpread);
    orientGeometryToSurface(petal, item);
    addDetailGeo(targetArr, petal, primary, secondary, rng, 0.07);
  }
  const stamen = new THREE.OctahedronGeometry((item.kind === 'hibiscus' ? 0.052 : 0.04) * s, 0);
  stamen.translate(0, 0.05 * s, 0);
  orientGeometryToSurface(stamen, item);
  addDetailGeo(targetArr, stamen, item.accentColor, treeLightenHex(item.accentColor, 0.2), rng, 0.04);
}

function buildFruitDetail(item, s, isLod1, rng, out) {
  const { foliageProps, trunkProps, emissiveProps } = out;
  const px = item.position.x;
  const py = item.position.y;
  const pz = item.position.z;
  const drop = Math.max(0.04, item.hangLength);
  const attachY = py - drop;
  const bodyArr = item.emissive ? emissiveProps : foliageProps;

  addHangingCord(trunkProps, item, py, drop, '#594126', rng, 0.01 * s);

  if (item.kind === 'berry_cluster') {
    const berryCount = isLod1 ? 3 : 5;
    for (let i = 0; i < berryCount; i++) {
      const ang = (i / berryCount) * Math.PI * 2;
      const tier = Math.floor(i / 2);
      const b = new THREE.OctahedronGeometry(0.055 * s, 0);
      placeAtPoint(
        b,
        px + Math.cos(ang) * 0.04 * s,
        attachY - 0.04 * s - tier * 0.045 * s,
        pz + Math.sin(ang) * 0.04 * s
      );
      addDetailGeo(bodyArr, b, item.color, item.accentColor, rng, 0.08);
    }
    return;
  }

  if (item.kind === 'acorn') {
    const cap = new THREE.CylinderGeometry(0.082 * s, 0.075 * s, 0.065 * s, 6, 1);
    placeAtPoint(cap, px, attachY - 0.03 * s, pz, item.rotation);
    addDetailGeo(trunkProps, cap, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.06);

    const nut = new THREE.ConeGeometry(0.07 * s, 0.14 * s, 6, 1);
    nut.rotateX(Math.PI);
    placeAtPoint(nut, px, attachY - 0.12 * s, pz, item.rotation);
    addDetailGeo(bodyArr, nut, item.color, treeLightenHex(item.color, 0.15), rng, 0.06);
    return;
  }

  if (item.kind === 'pinecone') {
    const cone = new THREE.ConeGeometry(0.095 * s, 0.23 * s, 5, 1);
    cone.rotateX(Math.PI);
    placeAtPoint(cone, px, attachY - 0.11 * s, pz, item.rotation);
    addDetailGeo(trunkProps, cone, item.color, item.accentColor, rng, 0.09);
    return;
  }

  if (item.kind === 'pear') {
    const bulb = new THREE.DodecahedronGeometry(0.095 * s, 0);
    bulb.scale(0.95, 1.25, 0.95);
    placeAtPoint(bulb, px, attachY - 0.10 * s, pz, item.rotation);
    addDetailGeo(bodyArr, bulb, item.color, treeLightenHex(item.color, 0.16), rng, 0.06);
  } else {
    // Apple or Citrus
    const fruit = new THREE.DodecahedronGeometry(0.105 * s, 0);
    placeAtPoint(fruit, px, attachY - 0.09 * s, pz, item.rotation);
    addDetailGeo(bodyArr, fruit, item.color, treeLightenHex(item.color, 0.15), rng, 0.07);
  }

  if (!isLod1) {
    const leaf = new THREE.BoxGeometry(0.09 * s, 0.015 * s, 0.045 * s);
    leaf.rotateZ(0.35);
    placeAtPoint(leaf, px + 0.045 * s, attachY - 0.015 * s, pz, item.rotation);
    addDetailGeo(foliageProps, leaf, item.accentColor, treeDarkenHex(item.accentColor, 0.15), rng, 0.05);
  }
}

function buildHangingObjectDetail(item, s, isLod1, rng, out) {
  const { foliageProps, trunkProps, emissiveProps } = out;
  const px = item.position.x;
  const py = item.position.y;
  const pz = item.position.z;
  const drop = item.hangLength;
  const attachY = py - drop;
  const glowArr = item.emissive ? emissiveProps : foliageProps;

  if (item.kind === 'bird_nest') {
    const n = new THREE.Vector3(item.normal.x, item.normal.y, item.normal.z).normalize();
    const cx = px + n.x * 0.08 * s;
    const cy = py + Math.max(0.03, n.y * 0.06) * s;
    const cz = pz + n.z * 0.08 * s;

    const rim = new THREE.TorusGeometry(0.18 * s, 0.055 * s, 4, isLod1 ? 6 : 8);
    rim.rotateX(Math.PI * 0.5);
    placeAtPoint(rim, cx, cy + 0.04 * s, cz, item.rotation);
    addDetailGeo(trunkProps, rim, item.color, treeDarkenHex(item.color, 0.25), rng, 0.12);

    const floor = new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.06 * s, 6, 1);
    placeAtPoint(floor, cx, cy + 0.02 * s, cz);
    addDetailGeo(trunkProps, floor, treeDarkenHex(item.color, 0.18), item.color, rng, 0.1);

    const eggCount = isLod1 ? 2 : 3;
    for (let e = 0; e < eggCount; e++) {
      const ang = (e / eggCount) * Math.PI * 2 + 0.3;
      const egg = new THREE.OctahedronGeometry(0.042 * s, 0);
      egg.scale(0.85, 1.25, 0.85);
      placeAtPoint(egg, cx + Math.cos(ang) * 0.055 * s, cy + 0.075 * s, cz + Math.sin(ang) * 0.055 * s);
      addDetailGeo(foliageProps, egg, item.accentColor, '#ffffff', rng, 0.05);
    }
    return;
  }

  if (item.kind === 'moss_drape') {
    const len = Math.max(0.25, drop || 0.72) * s;
    const strands = isLod1 ? 2 : 3;
    for (let i = 0; i < strands; i++) {
      const sl = len * (0.68 + (i % 3) * 0.18);
      const sx = px + ((i - 1) * 0.055) * s;
      const strand = new THREE.ConeGeometry(0.042 * s, sl, 4, isLod1 ? 1 : 2);
      strand.rotateX(Math.PI);
      placeAtPoint(strand, sx, py - sl * 0.45, pz + (i % 2 === 0 ? 0.02 : -0.02) * s);
      addDetailGeo(foliageProps, strand, item.color, item.accentColor, rng, 0.14);
    }
    return;
  }

  addHangingCord(trunkProps, item, py, Math.max(0.08, drop), item.kind === 'prayer_tag' ? item.accentColor : '#3a352f', rng, 0.013 * s);

  if (item.kind === 'paper_lantern') {
    const cap = new THREE.CylinderGeometry(0.11 * s, 0.15 * s, 0.05 * s, 6, 1);
    placeAtPoint(cap, px, attachY - 0.025 * s, pz, item.rotation);
    addDetailGeo(trunkProps, cap, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.04);

    const body = new THREE.CylinderGeometry(0.16 * s, 0.13 * s, 0.24 * s, 6, 1);
    placeAtPoint(body, px, attachY - 0.165 * s, pz, item.rotation);
    addDetailGeo(glowArr, body, item.color, treeLightenHex(item.color, 0.25), rng, 0.06);

    const base = new THREE.CylinderGeometry(0.12 * s, 0.07 * s, 0.04 * s, 6, 1);
    placeAtPoint(base, px, attachY - 0.30 * s, pz, item.rotation);
    addDetailGeo(trunkProps, base, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.04);

    if (!isLod1) {
      const tassel = new THREE.ConeGeometry(0.03 * s, 0.12 * s, 4, 1);
      tassel.rotateX(Math.PI);
      placeAtPoint(tassel, px, attachY - 0.37 * s, pz);
      addDetailGeo(foliageProps, tassel, item.color, item.accentColor, rng, 0.05);
    }
    return;
  }

  if (item.kind === 'iron_lantern') {
    const roof = new THREE.ConeGeometry(0.18 * s, 0.12 * s, 4, 1);
    placeAtPoint(roof, px, attachY - 0.05 * s, pz, item.rotation + Math.PI / 4);
    addDetailGeo(trunkProps, roof, item.accentColor, '#171922', rng, 0.04);

    const core = new THREE.BoxGeometry(0.15 * s, 0.20 * s, 0.15 * s);
    placeAtPoint(core, px, attachY - 0.19 * s, pz, item.rotation);
    addDetailGeo(glowArr, core, item.color, treeLightenHex(item.color, 0.28), rng, 0.05);

    const basePlate = new THREE.BoxGeometry(0.20 * s, 0.04 * s, 0.20 * s);
    placeAtPoint(basePlate, px, attachY - 0.305 * s, pz, item.rotation);
    addDetailGeo(trunkProps, basePlate, item.accentColor, '#171922', rng, 0.04);
    return;
  }

  if (item.kind === 'wind_chime') {
    const disc = new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.035 * s, 6, 1);
    placeAtPoint(disc, px, attachY - 0.02 * s, pz, item.rotation);
    addDetailGeo(trunkProps, disc, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.05);

    const tubes = isLod1 ? 3 : 4;
    for (let t = 0; t < tubes; t++) {
      const ang = (t / tubes) * Math.PI * 2 + item.rotation;
      const len = (0.20 + (t % 3) * 0.06) * s;
      const tube = new THREE.CylinderGeometry(0.016 * s, 0.016 * s, len, 4, 1);
      placeAtPoint(tube, px + Math.cos(ang) * 0.085 * s, attachY - 0.04 * s - len * 0.5, pz + Math.sin(ang) * 0.085 * s);
      addDetailGeo(foliageProps, tube, item.color, treeLightenHex(item.color, 0.18), rng, 0.06);
    }
    return;
  }

  if (item.kind === 'birdhouse') {
    const body = new THREE.BoxGeometry(0.24 * s, 0.26 * s, 0.22 * s);
    placeAtPoint(body, px, attachY - 0.16 * s, pz, item.rotation);
    addDetailGeo(trunkProps, body, item.color, treeDarkenHex(item.color, 0.18), rng, 0.07);

    const roof = new THREE.ConeGeometry(0.22 * s, 0.15 * s, 4, 1);
    placeAtPoint(roof, px, attachY - 0.02 * s, pz, item.rotation + Math.PI / 4);
    addDetailGeo(trunkProps, roof, item.accentColor, treeDarkenHex(item.accentColor, 0.2), rng, 0.06);
    return;
  }

  if (item.kind === 'beehive') {
    const rings = isLod1 ? 2 : 3;
    for (let r = 0; r < rings; r++) {
      const rad = (0.14 - Math.abs(r - 1) * 0.03) * s;
      const tier = new THREE.CylinderGeometry(rad * 0.9, rad, 0.095 * s, 6, 1);
      placeAtPoint(tier, px, attachY - (0.06 + r * 0.088) * s, pz);
      addDetailGeo(foliageProps, tier, r % 2 === 0 ? item.color : item.accentColor, item.color, rng, 0.06);
    }
    return;
  }

  if (item.kind === 'crystal_charm') {
    const shard = new THREE.OctahedronGeometry(0.13 * s, 0);
    shard.scale(0.68, 1.65, 0.68);
    placeAtPoint(shard, px, attachY - 0.18 * s, pz, item.rotation);
    addDetailGeo(glowArr, shard, item.color, item.accentColor, rng, 0.08);
    return;
  }

  // Prayer / Wish Charm Tag
  const plaque = new THREE.BoxGeometry(0.14 * s, 0.24 * s, 0.022 * s);
  placeAtPoint(plaque, px, attachY - 0.12 * s, pz, item.rotation);
  addDetailGeo(foliageProps, plaque, item.color, treeDarkenHex(item.color, 0.08), rng, 0.03);

  const seal = new THREE.BoxGeometry(0.08 * s, 0.06 * s, 0.03 * s);
  placeAtPoint(seal, px, attachY - 0.16 * s, pz, item.rotation);
  addDetailGeo(foliageProps, seal, item.accentColor, item.accentColor, rng, 0.04);
}

export function buildPlacedTreeDetails(cfg, rng, isLod1 = false) {
  const out = { foliageProps: [], trunkProps: [], emissiveProps: [] };
  const items = sanitisePlacedDetailsList(cfg && cfg.placedDetails);
  if (items.length === 0) return out;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const meta = getPlacedDetailMeta(item.kind);
    const localRng = treeRng32(((Number(cfg.seed) || 1337) + i * 7919 + item.kind.length * 131) >>> 0);
    if (meta.category === 'flowers') {
      buildFlowerDetail(item, item.scale, isLod1, rng || localRng, out);
    } else if (meta.category === 'fruits') {
      buildFruitDetail(item, item.scale, isLod1, rng || localRng, out);
    } else {
      buildHangingObjectDetail(item, item.scale, isLod1, rng || localRng, out);
    }
  }
  return out;
}

export function buildSmartPlacedDetailBatch(cfg, layout, brush = {}, count = 6) {
  const meta = getPlacedDetailMeta(brush.kind || 'paper_lantern');
  const seed = ((Number(cfg.seed) || 1337) + (Array.isArray(cfg.placedDetails) ? cfg.placedDetails.length : 0) * 977 + count * 53) >>> 0;
  const rng = treeRng32(seed);
  const existingCount = Array.isArray(cfg.placedDetails) ? cfg.placedDetails.length : 0;
  const anchors = Array.isArray(layout && layout.branchAnchors) ? layout.branchAnchors : [];
  const results = [];

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = (layout ? layout.crownBaseY : 2.2) + 0.5;
    let z = 0;
    let nx = 0;
    let ny = meta.mode === 'hanging' ? -1 : 0.75;
    let nz = 0;

    if (anchors.length > 0 && (meta.mode === 'hanging' || meta.mode === 'upright' || i % 2 === 0)) {
      const anchor = anchors[(i + existingCount) % anchors.length];
      const tipRatio = meta.mode === 'upright' ? treeRandBetween(rng, 0.38, 0.65) : treeRandBetween(rng, 0.55, 0.92);
      x = anchor.origin.x + Math.cos(anchor.angle) * anchor.length * tipRatio;
      z = anchor.origin.z + Math.sin(anchor.angle) * anchor.length * tipRatio;
      y = anchor.origin.y + anchor.height * tipRatio - (meta.mode === 'hanging' ? 0.05 : -0.04);
      nx = Math.cos(anchor.angle) * 0.4;
      nz = Math.sin(anchor.angle) * 0.4;
    } else {
      const ang = ((i + existingCount * 0.37) / Math.max(1, count)) * Math.PI * 2 + treeRandBetween(rng, -0.3, 0.3);
      const rad = Math.max(0.55, (layout ? layout.canopyRadius : 2.0) * treeRandBetween(rng, 0.48, 0.85));
      const cBase = layout ? layout.crownBaseY : 2.0;
      const cTop = layout ? layout.crownTopY : 5.5;
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
      y = cBase + (cTop - cBase) * treeRandBetween(rng, 0.22, 0.72);
      nx = Math.cos(ang);
      ny = meta.mode === 'hanging' ? -0.6 : 0.45;
      nz = Math.sin(ang);
    }

    results.push(sanitisePlacedDetail({
      id: `det_${Date.now().toString(36)}_${existingCount + i + 1}_${Math.floor(rng() * 999)}`,
      kind: meta.id,
      position: { x, y, z },
      normal: { x: nx, y: ny, z: nz },
      scale: brush.scale !== undefined ? brush.scale : meta.defaultScale,
      hangLength: brush.hangLength !== undefined ? brush.hangLength : meta.defaultHang,
      color: brush.color || meta.defaultColor,
      accentColor: brush.accentColor || meta.defaultAccent,
      emissive: brush.emissive !== undefined ? brush.emissive : meta.defaultEmissive,
      rotation: treeRandBetween(rng, 0, Math.PI * 2)
    }, existingCount + i));
  }
  return results;
}

export function scatterPlacedDetailsOnObject3D(treeObj, cfg, layout, brush = {}, count = 6) {
  if (!treeObj || typeof THREE === 'undefined' || typeof THREE.Raycaster !== 'function') {
    return buildSmartPlacedDetailBatch(cfg, layout, brush, count);
  }

  treeObj.updateMatrixWorld(true);
  const targets = [];
  const meta = getPlacedDetailMeta(brush.kind || 'paper_lantern');
  treeObj.traverse((node) => {
    if (!node.isMesh) return;
    if (meta.mode === 'surface' && (node.name === 'CanopyFoliage' || node.name === 'TrunkAndLimbs')) {
      targets.push(node);
    } else if (meta.mode === 'upright' && node.name === 'TrunkAndLimbs') {
      targets.push(node);
    } else if (node.name === 'TrunkAndLimbs' || node.name === 'CanopyFoliage') {
      targets.push(node);
    }
  });

  if (targets.length === 0) {
    return buildSmartPlacedDetailBatch(cfg, layout, brush, count);
  }

  const invWorld = new THREE.Matrix4().copy(treeObj.matrixWorld).invert();
  const normalMat = new THREE.Matrix3().getNormalMatrix(invWorld);
  const box = new THREE.Box3().setFromObject(treeObj);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const seed = ((Number(cfg.seed) || 1337) + Date.now() % 100000 + (cfg.placedDetails?.length || 0) * 193) >>> 0;
  const rng = treeRng32(seed);
  const raycaster = new THREE.Raycaster();
  const placed = [];
  const existingCount = Array.isArray(cfg.placedDetails) ? cfg.placedDetails.length : 0;

  for (let attempt = 0; attempt < count * 5 && placed.length < count; attempt++) {
    const ang = rng() * Math.PI * 2;
    let origin;
    let dir;

    if (meta.mode === 'hanging') {
      // Cast upward from underneath the canopy to catch underside of branches & boughs
      const rDist = treeRandBetween(rng, 0.2, Math.max(0.6, Math.max(size.x, size.z) * 0.42));
      origin = new THREE.Vector3(center.x + Math.cos(ang) * rDist, box.min.y + 0.1, center.z + Math.sin(ang) * rDist);
      dir = new THREE.Vector3(treeRandBetween(rng, -0.15, 0.15), 1, treeRandBetween(rng, -0.15, 0.15)).normalize();
    } else {
      // Cast inward from outer canopy perimeter toward upper crown center
      const ringR = Math.max(size.x, size.z) * 0.8 + 1.5;
      const aimY = box.min.y + size.y * treeRandBetween(rng, 0.35, 0.9);
      origin = new THREE.Vector3(center.x + Math.cos(ang) * ringR, aimY + size.y * 0.15, center.z + Math.sin(ang) * ringR);
      const targetPt = new THREE.Vector3(center.x, aimY, center.z);
      dir = targetPt.sub(origin).normalize();
    }

    raycaster.set(origin, dir);
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits || hits.length === 0) continue;

    const hit = hits[0];
    const localPt = hit.point.clone().applyMatrix4(invWorld);
    const localNorm = hit.face
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).applyMatrix3(normalMat).normalize()
      : new THREE.Vector3(0, meta.mode === 'hanging' ? -1 : 1, 0);

    placed.push(sanitisePlacedDetail({
      id: `det_${seed.toString(36)}_${existingCount + placed.length + 1}`,
      kind: meta.id,
      position: { x: localPt.x, y: localPt.y, z: localPt.z },
      normal: { x: localNorm.x, y: localNorm.y, z: localNorm.z },
      scale: brush.scale !== undefined ? brush.scale : meta.defaultScale,
      hangLength: brush.hangLength !== undefined ? brush.hangLength : meta.defaultHang,
      color: brush.color || meta.defaultColor,
      accentColor: brush.accentColor || meta.defaultAccent,
      emissive: brush.emissive !== undefined ? brush.emissive : meta.defaultEmissive,
      rotation: treeRandBetween(rng, 0, Math.PI * 2)
    }, existingCount + placed.length));
  }

  if (placed.length < count) {
    const extra = buildSmartPlacedDetailBatch(cfg, layout, brush, count - placed.length);
    placed.push(...extra);
  }

  return placed;
}
