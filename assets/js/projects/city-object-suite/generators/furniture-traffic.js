import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function ftBuildStreetBench(group, cfg, b, mats, meta) {
  const style = cfg.benchStyle || 'wood_slat_cast_iron';
  const len = clamp(cfg.length || 1.85, 1.1, 2.8);
  const depth = clamp(cfg.seatDepth || 0.54, 0.42, 0.85);
  const seatH = clamp(cfg.seatHeight || 0.45, 0.4, 0.54);
  const backH = clamp(cfg.backrestHeight ?? 0.42, 0, 0.58);
  const slats = Math.max(3, Math.round(cfg.slatCount || 5));
  const arms = Math.max(0, Math.round(cfg.armrestCount ?? 2));
  const legStyle = cfg.legStyle || 'scrolled_iron';
  const isWood = style === 'wood_slat_cast_iron' || style === 'picnic_table';
  const seatMatRole = style === 'concrete_monolith' ? 'concrete' : isWood ? 'wood' : 'primary';

  if (style === 'picnic_table') {
    const tableH = seatH + 0.3;
    const topW = len;
    const topD = depth * 1.35;
    b.addSlattedArray(0, tableH, 0, topD * 0.88, Math.max(4, slats), topW, 0.04, 0.11, 'z', 'wood', 'body');
    b.addSlattedArray(0, seatH, topD * 0.72, 0.24, 2, topW, 0.038, 0.1, 'z', 'wood', 'body');
    b.addSlattedArray(0, seatH, -topD * 0.72, 0.24, 2, topW, 0.038, 0.1, 'z', 'wood', 'body');
    for (const sx of [-topW * 0.34, topW * 0.34]) {
      b.addBox(sx, tableH * 0.5, 0, 0.06, tableH, 0.06, { materialRole: 'frame', layer: 'body', rotXDeg: 28 });
      b.addBox(sx, tableH * 0.5, 0, 0.06, tableH, 0.06, { materialRole: 'frame', layer: 'body', rotXDeg: -28 });
      b.addBox(sx, seatH - 0.03, 0, 0.06, 0.05, topD * 1.68, { materialRole: 'frame', layer: 'body' });
    }
    meta.interaction = { interactable: true, actionType: 'sit_bench', seatCount: 4 };
    return;
  }

  if (style === 'concrete_monolith') {
    b.addBox(-len * 0.32, seatH * 0.42, 0, 0.28, seatH * 0.84, depth * 0.86, { materialRole: 'concrete', layer: 'body' });
    b.addBox(len * 0.32, seatH * 0.42, 0, 0.28, seatH * 0.84, depth * 0.86, { materialRole: 'concrete', layer: 'body' });
    b.addChamferBox(0, seatH - 0.05, 0, len, 0.12, depth, 0.025, { materialRole: 'concrete', layer: 'body' });
    if (backH > 0.08) {
      b.addBox(0, seatH + backH * 0.5, -depth * 0.38, len, backH, 0.11, { materialRole: 'concrete', layer: 'body' });
    }
    meta.interaction = { interactable: true, actionType: 'sit_bench', seatCount: 2 };
    return;
  }

  // Leg supports
  const legCount = len > 2.2 ? 3 : 2;
  for (let i = 0; i < legCount; i++) {
    const lx = legCount === 1 ? 0 : -len * 0.42 + (i / (legCount - 1)) * (len * 0.84);
    if (legStyle === 'concrete_slab') {
      b.addBox(lx, seatH * 0.46, 0, 0.14, seatH * 0.92, depth * 0.9, { materialRole: 'concrete', layer: 'body' });
    } else if (legStyle === 'center_pedestal') {
      b.addBox(lx, 0.025, 0, 0.26, 0.05, depth * 0.8, { materialRole: 'frame', layer: 'body' });
      b.addCylinder(lx, seatH * 0.5, 0, 0.05, 0.06, seatH, 8, 'y', 'frame', 'body');
      b.addBox(lx, seatH - 0.03, 0, 0.1, 0.05, depth * 0.9, { materialRole: 'frame', layer: 'detail' });
    } else {
      b.addBox(lx, seatH * 0.5, -depth * 0.38, 0.055, seatH, 0.065, { materialRole: 'frame', layer: 'body' });
      b.addBox(lx, seatH * 0.5, depth * 0.36, 0.055, seatH, 0.065, { materialRole: 'frame', layer: 'body' });
      b.addBox(lx, seatH - 0.03, 0, 0.055, 0.055, depth * 0.92, { materialRole: 'frame', layer: 'body' });
      b.addBox(lx, seatH * 0.35, 0, 0.035, 0.035, depth * 0.72, { materialRole: 'frame', layer: 'detail' });
      if (backH > 0.06) {
        b.addBox(lx, seatH + backH * 0.5, -depth * 0.44, 0.05, backH + 0.04, 0.055, { materialRole: 'frame', layer: 'body', rotXDeg: -10 });
      }
    }
  }

  // Seat slats
  const seatSlats = Math.max(2, Math.ceil(slats * 0.55));
  b.addSlattedArray(0, seatH, 0.03, depth * 0.72, seatSlats, len, 0.036, (depth * 0.65) / seatSlats, 'z', seatMatRole, 'body');

  // Backrest slats
  if (backH > 0.08) {
    const backSlats = Math.max(2, slats - seatSlats + 1);
    const backCenterY = seatH + backH * 0.54;
    b.addSlattedArray(0, backCenterY, -depth * 0.43, backH * 0.76, backSlats, len, (backH * 0.62) / backSlats, 0.034, 'y', seatMatRole, 'body', degToRad(-10));
  }

  // Armrests (left, right, optional center anti-sleep divider)
  if (arms > 0) {
    const armPositions = arms === 1 ? [0] : arms === 2 ? [-len * 0.44, len * 0.44] : [-len * 0.44, 0, len * 0.44];
    for (const ax of armPositions) {
      b.addBox(ax, seatH + 0.18, 0.02, 0.045, 0.04, depth * 0.78, { materialRole: 'frame', layer: 'detail' });
      b.addBox(ax, seatH + 0.09, depth * 0.34, 0.04, 0.18, 0.04, { materialRole: 'frame', layer: 'detail' });
    }
  }

  meta.snapAnchors.push({ id: 'seat_center', position: [0, seatH + 0.02, 0.05], normal: [0, 1, 0] });
  meta.interaction = { interactable: true, actionType: 'sit_bench', seatCount: len > 2.1 ? 3 : 2 };
}

function ftBuildBollardRailing(group, cfg, b, mats, meta) {
  const style = cfg.barrierStyle || 'cast_iron_bollard';
  const count = Math.max(1, Math.round(cfg.postCount || 1));
  const spacing = clamp(cfg.spacing || 1.35, 0.8, 2.2);
  const h = clamp(cfg.height || 0.95, 0.75, 3.2);
  const d = clamp(cfg.diameter || 0.18, 0.1, 0.34);
  const r = d * 0.5;
  const cap = cfg.topCapStyle || 'dome';

  if (style === 'street_clock_post') {
    const clockH = Math.max(2.4, h);
    b.addCylinder(0, 0.18, 0, r * 1.5, r * 1.85, 0.36, 10, 'y', 'frame', 'body');
    b.addCylinder(0, 0.56, 0, r * 1.15, r * 1.45, 0.42, 10, 'y', 'frame', 'body');
    b.addCylinder(0, clockH * 0.52, 0, r * 0.55, r * 0.82, clockH * 0.7, 10, 'y', 'frame', 'body');
    b.addCylinder(0, clockH - 0.34, 0, r * 2.2, r * 2.2, 0.22, 12, 'z', 'frame', 'body');
    b.addCylinder(0, clockH - 0.34, 0.115, r * 1.75, r * 1.75, 0.02, 12, 'z', 'whiteTrim', 'detail');
    b.addCylinder(0, clockH - 0.34, -0.115, r * 1.75, r * 1.75, 0.02, 12, 'z', 'whiteTrim', 'detail');
    b.addCylinder(0, clockH - 0.06, 0, 0.04, r * 1.1, 0.2, 8, 'y', 'accent', 'detail');
    meta.lightSources.push({ id: 'clock_face', position: [0, clockH - 0.34, 0], color: '#fff2c4', radius: 2.5 });
    return;
  }

  const startX = -((count - 1) * spacing) * 0.5;
  for (let i = 0; i < count; i++) {
    const px = startX + i * spacing;
    if (style === 'security_steel_bollard') {
      b.addCylinder(px, 0.02, 0, r * 1.3, r * 1.3, 0.04, 10, 'y', 'frame', 'body');
      b.addCylinder(px, h * 0.5, 0, r, r, h, 10, 'y', 'primary', 'body');
      b.addCylinder(px, h * 0.82, 0, r * 1.04, r * 1.04, 0.1, 10, 'y', 'accent', 'detail');
    } else if (style === 'pedestrian_guardrail') {
      b.addBox(px, 0.02, 0, d * 1.1, 0.04, d * 1.1, { materialRole: 'frame', layer: 'body' });
      b.addBox(px, h * 0.5, 0, d * 0.55, h, d * 0.55, { materialRole: 'frame', layer: 'body' });
    } else {
      b.addCylinder(px, 0.08, 0, r * 1.25, r * 1.45, 0.16, 10, 'y', 'frame', 'body');
      b.addCylinder(px, h * 0.48, 0, r * 0.85, r * 1.1, h * 0.72, 10, 'y', 'frame', 'body');
      b.addCylinder(px, h * 0.76, 0, r * 1.05, r * 1.05, 0.06, 10, 'y', 'accent', 'detail');
      if (cap === 'dome') {
        b.addCylinder(px, h * 0.9, 0, r * 0.45, r * 0.88, h * 0.14, 10, 'y', 'frame', 'body');
      } else if (cap === 'ornate_finial') {
        b.addCylinder(px, h * 0.92, 0, 0.02, r * 0.72, h * 0.18, 8, 'y', 'brass', 'detail');
      } else if (cap === 'reflective_band') {
        b.addCylinder(px, h * 0.86, 0, r * 0.9, r * 0.9, 0.1, 10, 'y', 'warningYellow', 'detail');
      }
    }

    if (i < count - 1) {
      const nx = startX + (i + 1) * spacing;
      if (style === 'pedestrian_guardrail') {
        b.addBox((px + nx) * 0.5, h * 0.92, 0, spacing, 0.055, 0.055, { materialRole: 'primary', layer: 'body' });
        b.addBox((px + nx) * 0.5, h * 0.48, 0, spacing, 0.045, 0.045, { materialRole: 'primary', layer: 'body' });
        const pickets = 4;
        for (let p = 1; p < pickets; p++) {
          const kx = px + (p / pickets) * spacing;
          b.addBox(kx, h * 0.7, 0, 0.025, h * 0.44, 0.025, { materialRole: 'secondary', layer: 'detail' });
        }
      } else if (style === 'chain_post_run') {
        const sag = clamp(cfg.chainSag || 0.14, 0.05, 0.28);
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          const t0 = s / segs;
          const t1 = (s + 1) / segs;
          const x0 = px + t0 * spacing;
          const x1 = px + t1 * spacing;
          const y0 = h * 0.76 - Math.sin(t0 * Math.PI) * sag;
          const y1 = h * 0.76 - Math.sin(t1 * Math.PI) * sag;
          b.addPipeSegment(x0, y0, 0, x1, y1, 0, 0.018, 6, 'secondary', 'detail');
        }
      }
    }
  }
}

function ftBuildParkingMeter(group, cfg, b, mats, meta) {
  const style = cfg.meterStyle || 'single_coin_meter';
  const poleH = clamp(cfg.poleHeight || 1.15, 0.85, 1.65);
  const headW = clamp(cfg.headWidth || 0.22, 0.18, 0.55);
  const headH = clamp(cfg.headHeight || 0.36, 0.28, 0.85);

  if (style === 'automated_barrier_arm') {
    const armLen = clamp(cfg.barrierArmLength || 3.1, 2.2, 4.2);
    const armRad = degToRad(clamp(cfg.barrierArmAngle || 0, 0, 85));
    b.addBox(0, 0.04, 0, 0.48, 0.08, 0.48, { materialRole: 'concrete', layer: 'body' });
    b.addChamferBox(0, 0.56, 0, 0.38, 0.96, 0.38, 0.025, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, 0.84, 0.2, 0.22, 0.12, 0.03, { materialRole: 'accent', layer: 'detail' });
    const pivotY = 0.88;
    const armCZ = armLen * 0.5 * Math.cos(armRad);
    const armCY = pivotY + armLen * 0.5 * Math.sin(armRad);
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      const sz = 0.22 + t * armLen * Math.cos(armRad);
      const sy = pivotY + t * armLen * Math.sin(armRad);
      b.addBox(0.22, sy, sz, 0.04, 0.085, armLen / segs, {
        materialRole: i % 2 === 0 ? 'safetyRed' : 'whiteTrim',
        layer: 'body',
        rotX: -armRad
      });
    }
    b.addCylinder(0.22, pivotY, 0, 0.09, 0.09, 0.1, 10, 'x', 'frame', 'detail');
    if (armCY < 0) b.addBox(0.22, pivotY, armCZ, 0.02, 0.02, 0.02, { materialRole: 'frame', layer: 'detail' });
    meta.interaction = { interactable: true, actionType: 'raise_barrier_arm' };
    return;
  }

  if (style === 'solar_pay_kiosk' || style === 'garage_ticket_machine') {
    const kw = Math.max(0.36, headW);
    const kh = Math.max(1.28, poleH + 0.25);
    b.addBox(0, 0.035, 0, kw + 0.12, 0.07, 0.46, { materialRole: 'concrete', layer: 'body' });
    b.addChamferBox(0, kh * 0.5 + 0.03, 0, kw, kh, 0.36, 0.025, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, kh * 0.62, 0.19, kw * 0.72, 0.22, 0.02, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, kh * 0.42, 0.19, kw * 0.65, 0.14, 0.02, { materialRole: 'secondary', layer: 'detail' });
    if (cfg.solarPanelTop && style === 'solar_pay_kiosk') {
      b.addCylinder(0, kh + 0.2, -0.05, 0.03, 0.03, 0.34, 8, 'y', 'frame', 'detail');
      b.addBox(0, kh + 0.38, -0.02, kw * 0.95, 0.035, 0.34, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 22 });
    }
    objCreateSignPlane(group, style === 'solar_pay_kiosk' ? 'Pay Parking' : 'Take Ticket', kw * 0.8, 0.16, '#2b588c', '#ffffff', {
      x: 0,
      y: kh * 0.86,
      z: 0.195
    });
    meta.interaction = { interactable: true, actionType: 'pay_parking_kiosk' };
    return;
  }

  // Classic single or double coin meter
  b.addCylinder(0, 0.02, 0, 0.1, 0.12, 0.04, 10, 'y', 'frame', 'body');
  b.addCylinder(0, poleH * 0.5, 0, 0.035, 0.042, poleH, 8, 'y', 'frame', 'body');

  const drawHead = (hx, hy) => {
    b.addChamferBox(hx, hy, 0, headW, headH, 0.16, 0.02, { materialRole: 'secondary', layer: 'body' });
    b.addBox(hx, hy + headH * 0.14, 0.085, headW * 0.62, headH * 0.34, 0.018, { materialRole: 'glass', layer: 'detail' });
    if (cfg.expiredFlag) {
      b.addBox(hx + headW * 0.1, hy + headH * 0.14, 0.095, headW * 0.38, headH * 0.18, 0.01, { materialRole: 'safetyRed', layer: 'detail' });
    }
  };

  if (style === 'double_head_meter') {
    b.addBox(0, poleH + 0.02, 0, headW * 1.45, 0.045, 0.06, { materialRole: 'frame', layer: 'body' });
    drawHead(-headW * 0.62, poleH + headH * 0.5 + 0.04);
    drawHead(headW * 0.62, poleH + headH * 0.5 + 0.04);
  } else {
    drawHead(0, poleH + headH * 0.5);
  }

  meta.interaction = { interactable: true, actionType: 'feed_parking_meter' };
}

// The word is mesh geometry so the standalone GLB needs no fonts or canvas text support.
function ftAddStopSignFace(group, height) {
  const radius = 0.38;
  const vertices = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + Math.PI * i / 4;
    return new THREE.Vector2(Math.cos(a), Math.sin(a));
  });
  const outline = (scale) => new THREE.Shape(vertices.map((p) => p.clone().multiplyScalar(scale)));
  const white = new THREE.MeshStandardMaterial({ color: '#f6f4e8', roughness: 0.64 });
  const red = new THREE.MeshStandardMaterial({ color: '#be261e', roughness: 0.68 });
  const back = new THREE.MeshStandardMaterial({ color: '#81898e', roughness: 0.84 });

  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(outline(radius), {
    depth: 0.024, bevelEnabled: false
  }), back);
  plate.position.set(0, height, 0.04);
  group.add(plate);
  const borderOutline = outline(radius - 0.004);
  borderOutline.holes.push(new THREE.Path(vertices.map((p) => p.clone().multiplyScalar(radius - 0.025)).reverse()));
  const border = new THREE.Mesh(new THREE.ShapeGeometry(borderOutline), white);
  border.position.set(0, height, 0.066);
  group.add(border);
  const face = new THREE.Mesh(new THREE.ShapeGeometry(outline(radius - 0.025)), red);
  face.position.set(0, height, 0.068);
  group.add(face);

  const glyphs = [
    ['01111','11000','11000','01110','00011','00011','11110'],
    ['11111','00100','00100','00100','00100','00100','00100'],
    ['01110','11011','10001','10001','10001','11011','01110'],
    ['11110','11011','11011','11110','11000','11000','11000']
  ];
  const vertexPositions = [];
  const dx = 0.0226;
  const dy = 0.034;
  for (const [letter, rows] of glyphs.entries()) {
    for (const [row, pixels] of rows.entries()) {
      for (let col = 0; col < 5; col++) {
        if (pixels[col] !== '1') continue;
        const x = (letter * 6 + col - 11.5) * dx;
        const y = height + (2.5 - row) * dy;
        const z = 0.070;
        vertexPositions.push(x, y, z, x + dx, y, z, x + dx, y + dy, z,
          x, y, z, x + dx, y + dy, z, x, y + dy, z);
      }
    }
  }
  const text = new THREE.BufferGeometry();
  text.setAttribute('position', new THREE.Float32BufferAttribute(vertexPositions, 3));
  text.computeVertexNormals();
  group.add(new THREE.Mesh(text, white));
}

function ftBuildTrafficSignSignal(group, cfg, b, mats, meta) {
  const style = cfg.deviceStyle || 'traffic_signal_mast';
  const poleH = clamp(cfg.poleHeight || 4.6, 2.1, 6.2);
  const armLen = clamp(cfg.armLength || 3.4, 1.8, 5.2);
  const heads = Math.max(1, Math.round(cfg.signalHeads || 2));
  const aspects = Math.max(2, Math.round(cfg.aspectCount || 3));

  if (style === 'concrete_jersey_barrier') {
    const bLen = clamp(cfg.barrierLength || 2.4, 1.5, 3.6);
    b.addTrapezoidBox(0, 0.12, 0, bLen, 0.62, bLen, 0.42, 0.24, { materialRole: 'concrete', layer: 'body' });
    b.addTrapezoidBox(0, 0.54, 0, bLen, 0.42, bLen, 0.18, 0.6, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0, 0.72, 0.12, bLen * 0.85, 0.07, 0.02, { materialRole: 'warningYellow', layer: 'detail' });
    return;
  }

  if (style === 'traffic_cone_row') {
    const cones = Math.max(2, heads + 1);
    const span = clamp(cfg.barrierLength || 2.2, 1.2, 3.6);
    for (let i = 0; i < cones; i++) {
      const cx = -span * 0.5 + (i / (cones - 1)) * span;
      b.addBox(cx, 0.02, 0, 0.36, 0.04, 0.36, { materialRole: 'rubber', layer: 'body' });
      b.addCylinder(cx, 0.36, 0, 0.045, 0.145, 0.68, 8, 'y', 'accent', 'body');
      b.addCylinder(cx, 0.44, 0, 0.088, 0.106, 0.11, 8, 'y', 'whiteTrim', 'detail');
    }
    return;
  }

  if (style === 'octagon_stop_sign') {
    const sh = Math.min(3.0, poleH);
    b.addCylinder(0, sh * 0.5, 0, 0.035, 0.038, sh, 8, 'y', 'secondary', 'body');
    ftAddStopSignFace(group, sh - 0.34);
    return;
  }

  if (style === 'street_name_post') {
    const sh = Math.min(3.3, poleH);
    b.addCylinder(0, 0.06, 0, 0.08, 0.1, 0.12, 8, 'y', 'frame', 'body');
    b.addCylinder(0, sh * 0.5, 0, 0.042, 0.046, sh, 8, 'y', 'frame', 'body');
    const blades = Math.max(1, Math.round(cfg.streetBlades || 2));
    for (let i = 0; i < blades; i++) {
      const by = sh - 0.16 - i * 0.22;
      const rot = i % 2 === 0 ? 0 : Math.PI * 0.5;
      b.addBox(0, by, 0, 0.92, 0.16, 0.03, { materialRole: 'primary', layer: 'body', rotY: rot });
      objCreateSignPlane(group, cfg.signText || (i % 2 === 0 ? 'Main St' : '1st Ave'), 0.84, 0.13, cfg.primaryColor || '#266343', '#ffffff', {
        x: Math.sin(rot) * 0.018,
        y: by,
        z: Math.cos(rot) * 0.018,
        rotY: rot,
        doubleSided: true,
        backOffset: 0.036
      });
    }
    return;
  }

  // Traffic signal mast or pedestrian beacon
  b.addCylinder(0, 0.12, 0, 0.18, 0.22, 0.24, 10, 'y', 'frame', 'body');
  b.addCylinder(0, poleH * 0.5, 0, 0.08, 0.13, poleH, 10, 'y', 'frame', 'body');

  if (style === 'pedestrian_cross_beacon') {
    const boxY = Math.min(poleH - 0.35, 2.55);
    b.addBox(0, boxY, 0.2, 0.34, 0.42, 0.26, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, boxY + 0.08, 0.34, 0.22, 0.14, 0.02, { materialRole: 'signalAmber', layer: 'detail' });
    b.addBox(0, boxY - 0.1, 0.34, 0.22, 0.14, 0.02, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(0, 1.1, 0.14, 0.1, 0.18, 0.08, { materialRole: 'accent', layer: 'detail' });
    meta.lightSources.push({ id: 'crosswalk_beacon', position: [0, boxY, 0.36], color: '#ff9d1a', radius: 2.5 });
    return;
  }

  const armY = poleH - 0.35;
  b.addCylinder(armLen * 0.5, armY, 0, 0.06, 0.085, armLen, 8, 'x', 'frame', 'body');
  for (let hIdx = 0; hIdx < heads; hIdx++) {
    const hx = armLen * (0.42 + (hIdx / Math.max(1, heads)) * 0.52);
    const sigH = aspects * 0.26 + 0.14;
    const hy = armY - sigH * 0.5 - 0.05;
    b.addBox(hx, hy, 0.06, 0.32, sigH, 0.26, { materialRole: 'warningYellow', layer: 'body' });
    const roles = ['signalRed', 'signalAmber', 'signalGreen'];
    for (let a = 0; a < aspects; a++) {
      const ly = hy + (sigH * 0.5 - 0.18) - a * 0.24;
      b.addCylinder(hx, ly, 0.19, 0.075, 0.075, 0.04, 8, 'z', roles[a % 3], 'detail');
      b.addBox(hx, ly + 0.07, 0.24, 0.18, 0.025, 0.11, { materialRole: 'darkMetal', layer: 'detail' });
    }
    meta.lightSources.push({ id: `signal_head_${hIdx}`, position: [hx, hy, 0.22], color: '#ff9d1a', radius: 3.5 });
  }
}

export function registerFurnitureAndTrafficFamilies() {
  registerObjectFamily({
    id: 'street_bench',
    categoryId: '04_street_furniture',
    subcategory: 'Benches & Tables',
    subcategories: ['Benches & Tables'],
    label: 'Park & Street Bench',
    description: 'Slatted wooden park benches, downtown metal benches, concrete monoliths, and picnic tables.',
    attachmentProfile: 'ground_standing',
    locationContext: 'exterior',
    architecturalStyle: 'older_metropolitan',
    sizeClass: 'medium',
    functionalRole: 'decorative',
    tags: ['bench', 'park', 'seat', 'furniture', 'sidewalk', 'wood', 'picnic'],
    materialSlots: ['primary', 'frame', 'wood', 'concrete'],
    schema: [
      { group: 'Bench Form' },
      {
        key: 'benchStyle',
        name: 'Bench Archetype',
        type: 'select',
        options: [
          ['wood_slat_cast_iron', 'Wood Slat & Cast Iron'],
          ['metal_slatted', 'Downtown Metal Slat'],
          ['concrete_monolith', 'Concrete Seating Block'],
          ['bus_stop_backed', 'Transit Metal Bench'],
          ['picnic_table', 'Park Picnic Table']
        ],
        default: 'wood_slat_cast_iron'
      },
      { key: 'length', name: 'Length', type: 'number', min: 1.1, max: 2.8, step: 0.1, unit: 'm', default: 1.85 },
      { key: 'seatDepth', name: 'Seat Depth', type: 'number', min: 0.42, max: 0.85, step: 0.02, unit: 'm', default: 0.54 },
      { key: 'seatHeight', name: 'Seat Height', type: 'number', min: 0.4, max: 0.54, step: 0.02, unit: 'm', default: 0.45 },
      { key: 'backrestHeight', name: 'Backrest Height', type: 'number', min: 0, max: 0.58, step: 0.04, unit: 'm', default: 0.42 },
      { group: 'Slats & Supports' },
      { key: 'slatCount', name: 'Total Slats', type: 'number', min: 3, max: 10, step: 1, default: 6 },
      { key: 'armrestCount', name: 'Armrest Dividers', type: 'number', min: 0, max: 3, step: 1, default: 2 },
      {
        key: 'legStyle',
        name: 'Support Style',
        type: 'select',
        options: [
          ['scrolled_iron', 'Cast Iron Frame'],
          ['tubular_loop', 'Tubular Steel Loop'],
          ['concrete_slab', 'Concrete End Slabs'],
          ['center_pedestal', 'Pedestal Posts']
        ],
        default: 'scrolled_iron'
      }
    ],
    presets: [
      {
        id: 'classic_park_wood_bench',
        label: 'Classic Wood Park Bench',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d5b34',
        frameMaterial: 'cast_iron',
        frameColor: '#22272c',
        woodColor: '#8d5b34',
        params: { benchStyle: 'wood_slat_cast_iron', length: 1.85, seatDepth: 0.54, seatHeight: 0.45, backrestHeight: 0.44, slatCount: 6, armrestCount: 2, legStyle: 'scrolled_iron' }
      },
      {
        id: 'downtown_metal_slat_bench',
        label: 'Downtown Steel Slatted Bench',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c3844',
        frameMaterial: 'painted_steel',
        frameColor: '#1e252d',
        params: { benchStyle: 'metal_slatted', length: 2.0, seatDepth: 0.52, seatHeight: 0.44, backrestHeight: 0.4, slatCount: 7, armrestCount: 3, legStyle: 'tubular_loop' }
      },
      {
        id: 'brutalist_concrete_bench',
        label: 'Concrete Plaza Seating Block',
        paletteFamily: 'modern_downtown',
        condition: 'lightly_worn',
        primaryMaterial: 'concrete',
        primaryColor: '#8b9096',
        concreteColor: '#8b9096',
        params: { benchStyle: 'concrete_monolith', length: 2.1, seatDepth: 0.62, seatHeight: 0.46, backrestHeight: 0, legStyle: 'concrete_slab' }
      },
      {
        id: 'park_picnic_table',
        label: 'Park Timber Picnic Table',
        paletteFamily: 'residential',
        condition: 'lightly_worn',
        primaryMaterial: 'wood',
        primaryColor: '#96653d',
        frameMaterial: 'galvanized_metal',
        frameColor: '#4c545c',
        woodColor: '#96653d',
        params: { benchStyle: 'picnic_table', length: 1.9, seatDepth: 0.62, seatHeight: 0.44, slatCount: 5, armrestCount: 0 }
      }
    ],
    buildGeometry: ftBuildStreetBench
  });

  registerObjectFamily({
    id: 'bollard_railing',
    categoryId: '04_street_furniture',
    subcategory: 'Bollards & Guardrails',
    subcategories: ['Bollards & Guardrails', 'Public Clocks'],
    label: 'Bollards, Railings & Street Clock',
    description: 'Security bollards, decorative cast posts, chain-linked barriers, guardrails, and street clocks.',
    attachmentProfile: 'ground_standing',
    locationContext: 'exterior',
    architecturalStyle: 'older_metropolitan',
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    tags: ['bollard', 'railing', 'chain', 'clock', 'sidewalk', 'barrier', 'post'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Barrier Configuration' },
      {
        key: 'barrierStyle',
        name: 'Object Type',
        type: 'select',
        options: [
          ['cast_iron_bollard', 'Decorative Cast Bollard'],
          ['security_steel_bollard', 'Security Steel Bollard'],
          ['chain_post_run', 'Chain-Linked Post Run'],
          ['pedestrian_guardrail', 'Pedestrian Guardrail'],
          ['street_clock_post', 'Downtown Street Clock']
        ],
        default: 'cast_iron_bollard'
      },
      { key: 'postCount', name: 'Post Count', type: 'number', min: 1, max: 5, step: 1, default: 1 },
      { key: 'spacing', name: 'Post Spacing', type: 'number', min: 0.8, max: 2.2, step: 0.1, unit: 'm', default: 1.35 },
      { key: 'height', name: 'Height', type: 'number', min: 0.75, max: 3.2, step: 0.05, unit: 'm', default: 0.95 },
      { key: 'diameter', name: 'Post Diameter', type: 'number', min: 0.1, max: 0.34, step: 0.02, unit: 'm', default: 0.18 },
      {
        key: 'topCapStyle',
        name: 'Top Cap Style',
        type: 'select',
        options: [
          ['dome', 'Rounded Dome'],
          ['ornate_finial', 'Ornate Brass Finial'],
          ['reflective_band', 'Reflective Safety Band'],
          ['flat_bevel', 'Flat Bevel']
        ],
        default: 'dome'
      },
      { key: 'chainSag', name: 'Chain Sag', type: 'number', min: 0.05, max: 0.28, step: 0.02, unit: 'm', default: 0.14 }
    ],
    presets: [
      {
        id: 'heritage_cast_bollard',
        label: 'Decorative Cast Iron Bollard',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#24292e',
        accentColor: '#c99a3a',
        frameColor: '#202429',
        params: { barrierStyle: 'cast_iron_bollard', postCount: 1, height: 0.95, diameter: 0.2, topCapStyle: 'ornate_finial' }
      },
      {
        id: 'chain_linked_sidewalk_posts',
        label: 'Chain-Linked Sidewalk Posts',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#252c33',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#9aa4ad',
        accentColor: '#d4a63a',
        frameColor: '#1f252b',
        params: { barrierStyle: 'chain_post_run', postCount: 3, spacing: 1.4, height: 0.98, diameter: 0.16, topCapStyle: 'dome' }
      },
      {
        id: 'steel_pedestrian_guardrail',
        label: 'Pedestrian Guardrail Section',
        paletteFamily: 'modern_downtown',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3a4652',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d969f',
        frameColor: '#252c34',
        params: { barrierStyle: 'pedestrian_guardrail', postCount: 3, spacing: 1.5, height: 1.05, diameter: 0.12 }
      },
      {
        id: 'downtown_street_clock',
        label: 'Downtown Heritage Street Clock',
        subcategory: 'Public Clocks',
        locationContext: 'exterior',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'cast_iron',
        primaryColor: '#223830',
        accentColor: '#d4a63a',
        frameColor: '#1b2622',
        params: { barrierStyle: 'street_clock_post', postCount: 1, height: 3.1, diameter: 0.26 }
      }
    ],
    buildGeometry: ftBuildBollardRailing
  });

  registerObjectFamily({
    id: 'parking_meter',
    categoryId: '05_traffic',
    subcategory: 'Parking Meters & Kiosks',
    subcategories: ['Parking Meters & Kiosks', 'Road Barriers'],
    label: 'Parking Meter & Gate Barrier',
    description: 'Single and twin parking meters, solar pay kiosks, ticket machines, and gate barrier arms.',
    attachmentProfile: 'ground_standing',
    locationContext: 'exterior',
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    tags: ['parking', 'meter', 'kiosk', 'traffic', 'gate', 'ticket', 'curb'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Meter & Gate Type' },
      {
        key: 'meterStyle',
        name: 'Device Style',
        type: 'select',
        options: [
          ['single_coin_meter', 'Single Parking Meter'],
          ['double_head_meter', 'Dual-Head Parking Meter'],
          ['solar_pay_kiosk', 'Solar Pay-and-Display Kiosk'],
          ['garage_ticket_machine', 'Garage Ticket Dispenser'],
          ['automated_barrier_arm', 'Automated Gate Barrier Arm']
        ],
        default: 'single_coin_meter'
      },
      { key: 'poleHeight', name: 'Post / Kiosk Height', type: 'number', min: 0.85, max: 1.65, step: 0.05, unit: 'm', default: 1.15 },
      { key: 'headWidth', name: 'Head / Kiosk Width', type: 'number', min: 0.18, max: 0.55, step: 0.02, unit: 'm', default: 0.22 },
      { key: 'headHeight', name: 'Meter Head Height', type: 'number', min: 0.28, max: 0.85, step: 0.04, unit: 'm', default: 0.36 },
      { group: 'Options' },
      { key: 'solarPanelTop', name: 'Solar Panel Cap', type: 'boolean', default: true },
      { key: 'expiredFlag', name: 'Expired Red Flag', type: 'boolean', default: true },
      { key: 'barrierArmLength', name: 'Barrier Arm Length', type: 'number', min: 2.2, max: 4.2, step: 0.1, unit: 'm', default: 3.1 },
      { key: 'barrierArmAngle', name: 'Barrier Arm Angle', type: 'number', min: 0, max: 85, step: 5, unit: 'deg', default: 0 }
    ],
    presets: [
      {
        id: 'vintage_single_parking_meter',
        label: 'Classic Single Parking Meter',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#7c8791',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#a2acb5',
        accentColor: '#cf342b',
        frameColor: '#363e47',
        params: { meterStyle: 'single_coin_meter', poleHeight: 1.15, headWidth: 0.2, headHeight: 0.36, expiredFlag: true }
      },
      {
        id: 'twin_head_curb_meter',
        label: 'Twin-Head Curb Parking Meter',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#485664',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#98a3ad',
        accentColor: '#38b583',
        frameColor: '#252c33',
        params: { meterStyle: 'double_head_meter', poleHeight: 1.1, headWidth: 0.2, headHeight: 0.34, expiredFlag: false }
      },
      {
        id: 'solar_pay_and_display_kiosk',
        label: 'Solar Pay-and-Display Kiosk',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b4b6e',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#b5bfc9',
        accentColor: '#3ec7e8',
        frameColor: '#202830',
        params: { meterStyle: 'solar_pay_kiosk', poleHeight: 1.35, headWidth: 0.42, solarPanelTop: true }
      },
      {
        id: 'parking_gate_barrier_arm',
        label: 'Automated Parking Gate Arm',
        subcategory: 'Road Barriers',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#d99626',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#eceff2',
        accentColor: '#cf342b',
        frameColor: '#23282e',
        params: { meterStyle: 'automated_barrier_arm', barrierArmLength: 3.1, barrierArmAngle: 15 }
      }
    ],
    buildGeometry: ftBuildParkingMeter
  });

  registerObjectFamily({
    id: 'traffic_sign_signal',
    categoryId: '05_traffic',
    subcategory: 'Traffic Signals & Signs',
    subcategories: ['Traffic Signals & Signs', 'Road Barriers'],
    label: 'Traffic Signal, Sign & Barrier',
    description: 'Intersection mast signals, crosswalk beacons, stop signs, street name posts, and Jersey barriers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'pole_mounted', 'hanging'],
    locationContext: 'exterior',
    architecturalStyle: 'municipal',
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    tags: ['traffic', 'signal', 'sign', 'stop', 'crosswalk', 'barrier', 'road', 'street'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Traffic Device' },
      {
        key: 'deviceStyle',
        name: 'Device Archetype',
        type: 'select',
        options: [
          ['traffic_signal_mast', 'Intersection Signal Mast'],
          ['pedestrian_cross_beacon', 'Pedestrian Crosswalk Signal'],
          ['octagon_stop_sign', 'Stop Sign Post'],
          ['street_name_post', 'Street-Name Sign Post'],
          ['concrete_jersey_barrier', 'Concrete Jersey Barrier'],
          ['traffic_cone_row', 'Traffic Cone Array']
        ],
        default: 'traffic_signal_mast'
      },
      { key: 'poleHeight', name: 'Pole Height', type: 'number', min: 2.1, max: 6.2, step: 0.2, unit: 'm', default: 4.8 },
      { key: 'armLength', name: 'Mast Arm Length', type: 'number', min: 1.8, max: 5.2, step: 0.2, unit: 'm', default: 3.6 },
      { key: 'signalHeads', name: 'Signal Heads', type: 'number', min: 1, max: 3, step: 1, default: 2 },
      { key: 'aspectCount', name: 'Lights Per Head', type: 'number', min: 2, max: 3, step: 1, default: 3 },
      { key: 'streetBlades', name: 'Street Sign Blades', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      { key: 'barrierLength', name: 'Barrier / Row Span', type: 'number', min: 1.5, max: 3.6, step: 0.1, unit: 'm', default: 2.4 },
      { key: 'signText', name: 'Sign Text', type: 'text', default: 'Main St', maxLength: 22 }
    ],
    presets: [
      {
        id: 'intersection_traffic_signal',
        label: 'Intersection Traffic Signal Mast',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2d353d',
        accentColor: '#e8b228',
        frameColor: '#20262c',
        params: { deviceStyle: 'traffic_signal_mast', poleHeight: 4.8, armLength: 3.6, signalHeads: 2, aspectCount: 3 }
      },
      {
        id: 'crosswalk_pedestrian_signal',
        label: 'Pedestrian Crossing Signal',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c333a',
        accentColor: '#e8b228',
        frameColor: '#1f252b',
        params: { deviceStyle: 'pedestrian_cross_beacon', poleHeight: 2.9 }
      },
      {
        id: 'corner_street_name_sign',
        label: 'Corner Street-Name Sign',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#266343',
        frameColor: '#22282d',
        params: { deviceStyle: 'street_name_post', poleHeight: 2.9, streetBlades: 2, signText: 'Atlas Ave' }
      },
      {
        id: 'stop_sign_post',
        label: 'Octagon Stop Sign Post',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf342b',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#98a3ad',
        params: { deviceStyle: 'octagon_stop_sign', poleHeight: 2.7, signText: 'Stop' }
      },
      {
        id: 'concrete_jersey_barrier',
        label: 'Concrete Jersey Barrier',
        subcategory: 'Road Barriers',
        locationContext: 'exterior',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'concrete',
        primaryColor: '#868b90',
        concreteColor: '#868b90',
        params: { deviceStyle: 'concrete_jersey_barrier', barrierLength: 2.4 }
      }
    ],
    buildGeometry: ftBuildTrafficSignSignal
  });
}
