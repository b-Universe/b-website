import { solid, registerTexture } from './materials.js';

let signCounter = 0;

export function resetPrimitiveCounters() {
  signCounter = 0;
}

export function box(group, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function slabBox(group, seg, y, h, inset, material, options = {}) {
  const w = seg.w - inset * 2;
  const d = seg.d - inset * 2;
  const cut = Math.max(0, Math.min(seg.cornerCut || 0, w * 0.48, d * 0.48) - inset * 0.5);
  if (w <= 0.01 || d <= 0.01 || h <= 0.001) return null;
  if (cut <= 0.01) {
    return box(group, seg.x, y, seg.z, w, h, d, material, options);
  }
  const hw = w * 0.5;
  const hd = d * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd - cut);
  shape.lineTo(hw - cut, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(seg.x, y + h * 0.5, seg.z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function cylinder(group, x, y, z, top, bottom, h, material, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function line(group, a, b, width, material) {
  const p = new THREE.Vector3(...a);
  const q = new THREE.Vector3(...b);
  const direction = q.clone().sub(p);
  const len = direction.length();
  if (len <= 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 6), material);
  mesh.position.copy(p).add(q).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

export function sagCable(group, a, b, sag, radius, material, segments = 6) {
  const p = new THREE.Vector3(...a);
  const q = new THREE.Vector3(...b);
  let prev = p;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(p, q, t);
    pt.y -= Math.sin(t * Math.PI) * sag;
    line(group, [prev.x, prev.y, prev.z], [pt.x, pt.y, pt.z], radius, material);
    prev = pt;
  }
}

export function signboard(group, txt, w, h, base = '#302e32', fg = '#f5dea6') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px Arial';
  const text = (txt || 'CITY').toUpperCase().slice(0, 28);
  let size = 54;
  while (size > 18 && ctx.measureText(text).width > 460) {
    size -= 3;
    ctx.font = `bold ${size}px Arial`;
  }
  ctx.fillText(text, 256, 65);
  const tex = new THREE.CanvasTexture(canvas);
  signCounter++;
  registerTexture('sign-' + signCounter, tex);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  face.position.z = 0.065;
  const frame = box(group, 0, 0, 0, w + 0.14, h + 0.14, 0.11, solid('#191c20'));
  group.add(face);
  return frame;
}

export function worldRoot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
