import { clamp, degToRad, rng32 } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function pwBuildMailboxCluster(group, cfg, b, mats, meta) {
  const cols = Math.max(2, Math.round(cfg.columns || 4));
  const rows = Math.max(2, Math.round(cfg.rows || 4));
  const lockers = Math.max(0, Math.round(cfg.parcelLockers || 2));
  const cw = clamp(cfg.compWidth || 0.2, 0.14, 0.36);
  const ch = clamp(cfg.compHeight || 0.14, 0.1, 0.28);
  const depth = clamp(cfg.cabinetDepth || 0.38, 0.28, 0.58);
  const gap = clamp(cfg.doorGap || 0.01, 0.006, 0.02);
  const mount = cfg.mountStyle || 'pedestal_legs';
  const legH = mount === 'wall_recessed' ? 0 : clamp(cfg.legHeight || 0.68, 0.35, 0.95);

  const innerW = cols * cw + (cols - 1) * gap;
  const lockerRows = lockers > 0 ? Math.ceil(lockers / Math.max(1, Math.min(cols, 2))) : 0;
  const lockerH = ch * 1.9;
  const innerH = rows * ch + (rows - 1) * gap + (lockerRows > 0 ? lockerRows * lockerH + lockerRows * gap : 0);
  const cabW = innerW + 0.08;
  const cabH = innerH + 0.09;
  const cabZ = mount === 'wall_recessed' ? depth * 0.5 : 0;
  const baseY = mount === 'wall_recessed' ? -cabH * 0.5 : legH;
  const cy = baseY + cabH * 0.5;

  // Support pedestals or frame base
  if (mount === 'pedestal_legs') {
    b.addBox(0, 0.02, cabZ, Math.min(cabW * 0.45, 0.36), 0.04, depth * 0.8, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, legH * 0.5 + 0.01, cabZ, 0.085, 0.105, legH, 8, 'y', 'frame', 'body');
    b.addBox(0, legH - 0.02, cabZ, cabW * 0.55, 0.04, depth * 0.72, { materialRole: 'frame', layer: 'body' });
  } else if (mount === 'dual_posts') {
    const px = cabW * 0.36;
    b.addBox(-px, legH * 0.5, cabZ, 0.07, legH, 0.07, { materialRole: 'frame', layer: 'body' });
    b.addBox(px, legH * 0.5, cabZ, 0.07, legH, 0.07, { materialRole: 'frame', layer: 'body' });
    b.addBox(-px, 0.018, cabZ, 0.14, 0.036, 0.14, { materialRole: 'frame', layer: 'detail' });
    b.addBox(px, 0.018, cabZ, 0.14, 0.036, 0.14, { materialRole: 'frame', layer: 'detail' });
  } else if (mount === 'freestanding_base') {
    b.addBox(0, legH * 0.5, cabZ, cabW - 0.04, legH, depth - 0.03, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.03, cabZ, cabW + 0.04, 0.06, depth + 0.04, { materialRole: 'concrete', layer: 'body' });
  } else if (mount === 'wall_recessed') {
    b.addBox(0, cy, 0.015, cabW + 0.06, cabH + 0.06, 0.03, { materialRole: 'frame', layer: 'body' });
  }

  // Main mailbox cabinet shell
  b.addChamferBox(0, cy, cabZ, cabW, cabH, depth, 0.022, { materialRole: 'primary', layer: 'body' });

  // Roof cap styling
  const roofY = baseY + cabH;
  if (cfg.roofTrim === 'sloped_hood') {
    b.addTrapezoidBox(0, roofY + 0.055, cabZ + 0.015, cabW + 0.05, depth + 0.06, cabW * 0.9, depth * 0.68, 0.11, {
      materialRole: 'secondary',
      layer: 'body',
      topOffsetZ: -0.04
    });
  } else if (cfg.roofTrim === 'crown_molding') {
    b.addBox(0, roofY + 0.025, cabZ, cabW + 0.055, 0.05, depth + 0.055, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0, roofY + 0.06, cabZ, cabW - 0.02, 0.03, depth - 0.02, { materialRole: 'secondary', layer: 'detail' });
  } else {
    b.addBox(0, roofY + 0.015, cabZ, cabW + 0.02, 0.03, depth + 0.02, { materialRole: 'secondary', layer: 'detail' });
  }

  const frontZ = cabZ + depth * 0.5 + 0.01;
  const startX = -innerW * 0.5 + cw * 0.5;
  let curTopY = roofY - 0.045;

  // Individual compartment doors
  for (let r = 0; r < rows; r++) {
    const doorY = curTopY - ch * 0.5;
    for (let c = 0; c < cols; c++) {
      const doorX = startX + c * (cw + gap);
      const isOutgoing = Boolean(cfg.outgoingSlot) && r === 0 && c === 0;
      b.addBox(doorX, doorY, frontZ, cw - 0.008, ch - 0.008, 0.018, {
        materialRole: isOutgoing ? 'accent' : 'secondary',
        layer: 'detail'
      });
      if (isOutgoing) {
        b.addBox(doorX, doorY + ch * 0.16, frontZ + 0.012, cw * 0.68, 0.022, 0.012, { materialRole: 'darkMetal', layer: 'detail' });
      } else {
        b.addCylinder(doorX + cw * 0.3, doorY, frontZ + 0.012, 0.011, 0.011, 0.014, 6, 'z', 'brass', 'detail');
      }
      if (cfg.labelPlates) {
        b.addBox(doorX - cw * 0.1, doorY - ch * 0.2, frontZ + 0.01, cw * 0.42, 0.018, 0.006, { materialRole: 'whiteTrim', layer: 'detail' });
      }
    }
    curTopY -= ch + gap;
  }

  // Parcel lockers along bottom tier
  if (lockerRows > 0) {
    const lCols = Math.min(cols, 2);
    const lw = (innerW - (lCols - 1) * gap) / lCols;
    let remaining = lockers;
    for (let lr = 0; lr < lockerRows; lr++) {
      const ly = curTopY - lockerH * 0.5;
      for (let lc = 0; lc < lCols && remaining > 0; lc++) {
        const lx = -innerW * 0.5 + lw * 0.5 + lc * (lw + gap);
        b.addBox(lx, ly, frontZ, lw - 0.01, lockerH - 0.01, 0.02, { materialRole: 'secondary', layer: 'detail' });
        b.addCylinder(lx + lw * 0.34, ly + 0.02, frontZ + 0.014, 0.014, 0.014, 0.018, 6, 'z', 'brass', 'detail');
        b.addBox(lx + lw * 0.34, ly - 0.04, frontZ + 0.014, 0.02, 0.05, 0.012, { materialRole: 'frame', layer: 'detail' });
        remaining--;
      }
      curTopY -= lockerH + gap;
    }
  }

  meta.snapAnchors.push({ id: 'mail_access_front', position: [0, baseY + cabH * 0.5, frontZ + 0.25], normal: [0, 0, 1] });
  meta.interaction = { interactable: true, actionType: 'open_mailbox', slotCount: rows * cols + lockers };
}

function pwBuildPostalDropBox(group, cfg, b, mats, meta) {
  const style = cfg.boxType || 'classic_street_drop';
  const w = clamp(cfg.width || 0.58, 0.35, 1.1);
  const h = clamp(cfg.height || 1.25, 0.85, 1.65);
  const d = clamp(cfg.depth || 0.58, 0.35, 0.95);
  const chute = clamp(cfg.chuteExtension || 0.14, 0.06, 0.28);

  if (style === 'residential_post_mailbox') {
    const postH = clamp(cfg.postHeight || 0.95, 0.65, 1.2);
    b.addBox(0, postH * 0.5, 0, 0.11, postH, 0.11, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, postH - 0.08, 0.06, 0.12, 0.07, d * 0.72, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, postH + 0.02, 0.05, w * 0.55, 0.03, d * 0.85, { materialRole: 'wood', layer: 'detail' });
    const boxY = postH + 0.16;
    b.addBox(0, boxY, 0.06, w * 0.48, 0.24, d * 0.86, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, boxY + 0.12, 0.06, w * 0.24, w * 0.24, d * 0.86, 10, 'z', 'primary', 'body');
    b.addBox(0, boxY + 0.05, 0.06 + d * 0.44, w * 0.44, 0.2, 0.024, { materialRole: 'secondary', layer: 'detail' });
    // Red flag
    const flagRot = cfg.flagRaised ? 0 : degToRad(88);
    b.addBox(w * 0.27, boxY + 0.09, 0.14, 0.018, 0.15, 0.03, { materialRole: 'safetyRed', layer: 'detail', rotX: flagRot });
    if (cfg.flagRaised) {
      b.addBox(w * 0.27, boxY + 0.16, 0.18, 0.018, 0.055, 0.08, { materialRole: 'safetyRed', layer: 'detail' });
    }
  } else if (style === 'parcel_storage_cage') {
    b.addBox(0, 0.03, 0, w, 0.06, d, { materialRole: 'frame', layer: 'body' });
    b.addSupportLegs(0, 0.06, h, w - 0.07, d - 0.07, 0.055, 'frame');
    b.addBox(0, h - 0.03, 0, w, 0.06, d, { materialRole: 'frame', layer: 'body' });
    const bars = 4;
    for (let i = 0; i < bars; i++) {
      const y = 0.24 + (i / (bars - 1)) * (h - 0.36);
      b.addBox(0, y, -d * 0.48, w - 0.08, 0.025, 0.02, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(-w * 0.48, y, 0, 0.02, 0.025, d - 0.08, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(w * 0.48, y, 0, 0.02, 0.025, d - 0.08, { materialRole: 'secondary', layer: 'detail' });
    }
    b.addBox(0, h * 0.5, d * 0.48, w * 0.88, h * 0.86, 0.02, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(w * 0.34, h * 0.5, d * 0.5, 0.04, 0.14, 0.03, { materialRole: 'accent', layer: 'detail' });
  } else {
    // Classic street drop or express courier box
    b.addSupportLegs(0, 0, 0.12, w * 0.84, d * 0.84, 0.08, 'frame');
    const bodyH = h - 0.34;
    b.addChamferBox(0, 0.12 + bodyH * 0.5, 0, w, bodyH, d, 0.03, { materialRole: 'primary', layer: 'body' });
    if (style === 'classic_street_drop') {
      b.addCylinder(0, 0.12 + bodyH, 0, w * 0.48, w * 0.48, d * 0.96, 12, 'z', 'primary', 'body');
    } else {
      b.addTrapezoidBox(0, 0.12 + bodyH + 0.09, 0, w, d, w * 0.86, d * 0.72, 0.18, { materialRole: 'primary', layer: 'body' });
    }
    // Pull-down mail chute
    b.addBox(0, 0.12 + bodyH * 0.76, d * 0.5 + chute * 0.4, w * 0.78, 0.22, chute, { materialRole: 'secondary', layer: 'detail', rotXDeg: 14 });
    b.addBox(0, 0.12 + bodyH * 0.84, d * 0.5 + chute * 0.85, w * 0.55, 0.035, 0.03, { materialRole: 'accent', layer: 'detail' });
    if (cfg.schedulePlaca) {
      objCreateSignPlane(group, cfg.signText || 'City Post', w * 0.68, 0.22, cfg.accentColor || '#e5a832', '#171c22', {
        x: 0,
        y: 0.12 + bodyH * 0.44,
        z: d * 0.5 + 0.015
      });
    }
  }
  meta.interaction = { interactable: true, actionType: 'deposit_mail' };
}

function pwBuildCommercialDumpster(group, cfg, b, mats, meta) {
  const style = cfg.dumpsterStyle || 'front_load';
  const len = clamp(cfg.length || 2.1, 1.4, 4.2);
  const wid = clamp(cfg.width || 1.35, 1.0, 2.2);
  const hgt = clamp(cfg.height || 1.35, 1.0, 2.1);
  const wheels = Boolean(cfg.casterWheels) && style !== 'roll_off_open';
  const wheelH = wheels ? 0.15 : 0.04;
  const tubH = Math.max(0.75, hgt - wheelH);
  const tubCY = wheelH + tubH * 0.5;

  if (wheels) {
    b.addCasterWheels(0, 0, len - 0.28, wid - 0.24, 0.075, 'rubber', 'frame');
  } else {
    b.addBox(-len * 0.42, 0.02, 0, 0.1, 0.04, wid * 0.92, { materialRole: 'frame', layer: 'body' });
    b.addBox(len * 0.42, 0.02, 0, 0.1, 0.04, wid * 0.92, { materialRole: 'frame', layer: 'body' });
  }

  // Main tub body
  if (style === 'rear_load') {
    b.addTrapezoidBox(0, tubCY, 0, len * 0.78, wid * 0.88, len, wid, tubH, { materialRole: 'primary', layer: 'body' });
  } else if (style === 'roll_off_open') {
    b.addBox(0, wheelH + 0.06, 0, len, 0.12, wid, { materialRole: 'frame', layer: 'body' });
    const wallT = 0.08;
    b.addBox(0, tubCY, wid * 0.5 - wallT * 0.5, len, tubH, wallT, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, tubCY, -wid * 0.5 + wallT * 0.5, len, tubH, wallT, { materialRole: 'primary', layer: 'body' });
    b.addBox(-len * 0.5 + wallT * 0.5, tubCY, 0, wallT, tubH, wid - wallT * 2, { materialRole: 'primary', layer: 'body' });
    b.addBox(len * 0.5 - wallT * 0.5, tubCY, 0, wallT, tubH, wid - wallT * 2, { materialRole: 'primary', layer: 'body' });
  } else {
    b.addTrapezoidBox(0, tubCY, 0, len * 0.92, wid * 0.9, len, wid, tubH, { materialRole: 'primary', layer: 'body' });
  }

  // Top rim collar
  const topY = wheelH + tubH;
  b.addBox(0, topY - 0.035, wid * 0.5 + 0.015, len + 0.06, 0.07, 0.05, { materialRole: 'frame', layer: 'body' });
  b.addBox(0, topY - 0.035, -wid * 0.5 - 0.015, len + 0.06, 0.07, 0.05, { materialRole: 'frame', layer: 'body' });
  b.addBox(-len * 0.5 - 0.015, topY - 0.035, 0, 0.05, 0.07, wid + 0.04, { materialRole: 'frame', layer: 'body' });
  b.addBox(len * 0.5 + 0.015, topY - 0.035, 0, 0.05, 0.07, wid + 0.04, { materialRole: 'frame', layer: 'body' });

  // Vertical reinforcing ribs
  const ribCount = Math.max(0, Math.round(cfg.ribCount ?? 4));
  if (ribCount > 0) {
    for (let i = 0; i < ribCount; i++) {
      const rx = ribCount === 1 ? 0 : -len * 0.38 + (i / (ribCount - 1)) * (len * 0.76);
      b.addBox(rx, tubCY, wid * 0.5 + 0.02, 0.06, tubH * 0.88, 0.04, { materialRole: 'primary', layer: 'detail' });
      b.addBox(rx, tubCY, -wid * 0.5 - 0.02, 0.06, tubH * 0.88, 0.04, { materialRole: 'primary', layer: 'detail' });
    }
  }

  // Side pockets / trunnions / handles
  if (cfg.sidePockets === 'fork_sleeves') {
    for (const sx of [-len * 0.5 - 0.04, len * 0.5 + 0.04]) {
      b.addBox(sx, tubCY - 0.08, 0, 0.08, 0.18, wid * 0.36, { materialRole: 'frame', layer: 'detail' });
      b.addBox(sx, tubCY - 0.08, 0, 0.09, 0.11, wid * 0.24, { materialRole: 'darkMetal', layer: 'detail' });
    }
  } else if (cfg.sidePockets === 'trunnion_bar') {
    b.addCylinder(0, tubCY + 0.08, 0, 0.04, 0.04, len + 0.34, 8, 'x', 'frame', 'detail');
  } else if (cfg.sidePockets === 'side_handles') {
    for (const sx of [-len * 0.5 - 0.04, len * 0.5 + 0.04]) {
      b.addBox(sx, tubCY + 0.14, 0, 0.06, 0.04, wid * 0.42, { materialRole: 'frame', layer: 'detail' });
    }
  }

  // Lids
  const lidCount = Math.max(1, Math.round(cfg.lidCount || 2));
  const lidType = style === 'roll_off_open' ? 'open_top' : (cfg.lidType || 'ribbed_plastic');
  const openRad = degToRad(clamp(cfg.lidOpenAngle || 0, 0, 75));

  if (lidType !== 'open_top') {
    const lidW = (len - 0.06) / lidCount;
    const hingeZ = -wid * 0.48;
    const lidD = wid * 0.96;
    for (let i = 0; i < lidCount; i++) {
      const lx = -len * 0.5 + 0.03 + lidW * 0.5 + i * lidW;
      const offsetAngle = i % 2 === 1 ? openRad * 0.55 : openRad;
      const pivotD = lidD * 0.5;
      const cy = topY + 0.035 + Math.sin(offsetAngle) * pivotD;
      const cz = hingeZ + Math.cos(offsetAngle) * pivotD;
      const lidMatRole = lidType === 'ribbed_plastic' ? 'rubber' : 'secondary';
      b.addBox(lx, cy, cz, lidW - 0.025, 0.05, lidD, {
        materialRole: lidMatRole,
        layer: 'body',
        rotX: -offsetAngle
      });
      b.addCylinder(lx, topY + 0.02, hingeZ, 0.024, 0.024, lidW * 0.65, 6, 'x', 'frame', 'detail');
    }
  }

  // Overflow garbage bags if enabled or open
  if (cfg.overflowBags) {
    const r = rng32((cfg.seed || 1024) + 55);
    for (let i = 0; i < 4; i++) {
      const bx = -len * 0.3 + i * (len * 0.2);
      const bz = (r() - 0.5) * wid * 0.45;
      b.addCylinder(bx, topY + 0.16, bz, 0.18 + r() * 0.08, 0.24 + r() * 0.08, 0.34, 7, 'y', 'rubber', 'detail');
    }
  }

  // Decals
  if (cfg.decalPlacement && cfg.decalPlacement !== 'none') {
    if (cfg.decalPlacement === 'front_warning' || cfg.decalPlacement === 'both') {
      objCreateSignPlane(group, 'Caution Waste', Math.min(len * 0.46, 0.85), 0.24, '#e8b228', '#191d22', {
        x: 0,
        y: tubCY + 0.12,
        z: wid * 0.5 + 0.015
      });
    }
    if (cfg.decalPlacement === 'side_recycle' || cfg.decalPlacement === 'both') {
      objCreateSignPlane(group, 'Waste Disposal', Math.min(wid * 0.58, 0.72), 0.22, '#2d6847', '#f0f5f2', {
        x: len * 0.5 + 0.015,
        y: tubCY + 0.1,
        z: 0,
        rotY: Math.PI * 0.5
      });
    }
  }

  meta.snapAnchors.push({ id: 'dumpster_front', position: [0, 0, wid * 0.5 + 0.35], normal: [0, 0, 1] });
  meta.interaction = { interactable: true, actionType: 'open_dumpster_lid', lidCount };
}

function pwBuildWheeledBin(group, cfg, b, mats, meta) {
  const style = cfg.binStyle || 'wheeled_cart';
  const w = clamp(cfg.width || 0.62, 0.42, 1.4);
  const h = clamp(cfg.height || 1.05, 0.75, 1.35);
  const d = clamp(cfg.depth || 0.66, 0.42, 0.95);
  const wheelD = clamp(cfg.wheelDiameter || 0.2, 0.14, 0.3);
  const lidOpen = cfg.lidState === 'open' ? degToRad(68) : cfg.lidState === 'ajar' ? degToRad(18) : 0;

  if (style === 'wire_mesh_basket') {
    const r = Math.min(w, d) * 0.46;
    b.addCylinder(0, 0.03, 0, r * 0.9, r * 0.9, 0.06, 10, 'y', 'frame', 'body');
    b.addPrismRing(0, h - 0.04, 0, r * 1.04, r * 0.88, 0.06, 10, 'y', 'frame', 'body');
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.addCylinder(Math.cos(a) * r * 0.94, h * 0.5, Math.sin(a) * r * 0.94, 0.014, 0.014, h - 0.08, 6, 'y', 'secondary', 'body');
    }
    b.addPrismRing(0, h * 0.5, 0, r * 0.98, r * 0.9, 0.04, 10, 'y', 'frame', 'detail');
    if (cfg.linerBagRim) {
      b.addCylinder(0, h * 0.46, 0, r * 0.84, r * 0.78, h * 0.84, 8, 'y', 'rubber', 'detail');
    }
  } else if (style === 'dual_recycling_station') {
    b.addBox(0, h * 0.46, 0, w, h * 0.92, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(-w * 0.24, h * 0.48, d * 0.5 + 0.01, w * 0.42, h * 0.72, 0.02, { materialRole: 'primary', layer: 'detail' });
    b.addBox(w * 0.24, h * 0.48, d * 0.5 + 0.01, w * 0.42, h * 0.72, 0.02, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0, h * 0.96, 0, w + 0.04, 0.08, d + 0.04, { materialRole: 'secondary', layer: 'body' });
    objCreateSignPlane(group, 'Recycle & Trash', w * 0.76, 0.18, '#2d6847', '#ffffff', {
      x: 0,
      y: h * 0.82,
      z: d * 0.5 + 0.022
    });
  } else if (style === 'dog_waste_station') {
    b.addBox(0, h * 0.5, 0, 0.08, h * 1.15, 0.08, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.42, 0.22, w * 0.7, h * 0.52, d * 0.56, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.86, 0.14, w * 0.52, 0.34, 0.18, { materialRole: 'accent', layer: 'detail' });
    objCreateSignPlane(group, 'Pet Waste', w * 0.46, 0.16, '#2d6847', '#ffffff', {
      x: 0,
      y: h * 0.92,
      z: 0.24
    });
  } else if (style === 'dome_litter_bin') {
    b.addCylinder(0, 0.04, 0, w * 0.48, w * 0.5, 0.08, 10, 'y', 'concrete', 'body');
    b.addCylinder(0, h * 0.44, 0, w * 0.46, w * 0.42, h * 0.74, 10, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.88, 0, w * 0.28, w * 0.48, h * 0.22, 10, 'y', 'secondary', 'body');
    b.addBox(0, h * 0.74, w * 0.4, w * 0.38, 0.14, 0.12, { materialRole: 'darkMetal', layer: 'detail' });
  } else {
    // Wheeled household trash / recycle / compost cart
    const wr = wheelD * 0.5;
    b.addCylinder(-w * 0.46, wr, -d * 0.36, wr, wr, 0.05, 10, 'x', 'rubber', 'body');
    b.addCylinder(w * 0.46, wr, -d * 0.36, wr, wr, 0.05, 10, 'x', 'rubber', 'body');
    b.addCylinder(0, wr, -d * 0.36, 0.016, 0.016, w * 0.95, 6, 'x', 'frame', 'detail');

    const bodyH = h - wr * 0.7 - 0.08;
    const bodyCY = wr * 0.7 + bodyH * 0.5;
    b.addTrapezoidBox(0, bodyCY, 0.02, w * 0.78, d * 0.76, w, d, bodyH, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, wr * 0.7 + bodyH - 0.02, 0.02, w + 0.04, 0.05, d + 0.04, { materialRole: 'primary', layer: 'detail' });
    // Rear push handle
    b.addCylinder(0, wr * 0.7 + bodyH - 0.04, -d * 0.56, 0.018, 0.018, w * 0.75, 6, 'x', 'frame', 'detail');

    const lidY = wr * 0.7 + bodyH + 0.03;
    const hingeZ = -d * 0.48;
    b.addBox(
      0,
      lidY + Math.sin(lidOpen) * d * 0.5,
      hingeZ + Math.cos(lidOpen) * d * 0.5,
      w + 0.05,
      0.05,
      d + 0.05,
      { materialRole: cfg.recyclingSlot ? 'accent' : 'secondary', layer: 'body', rotX: -lidOpen }
    );
  }

  meta.interaction = { interactable: true, actionType: 'toggle_bin_lid' };
}

export function registerPostalAndWasteFamilies() {
  registerObjectFamily({
    id: 'mailbox_cluster',
    categoryId: '01_postal',
    subcategory: 'Apartment Banks',
    subcategories: ['Apartment Banks', 'Parcel Lockers'],
    label: 'Apartment Mailbox Cluster',
    description: 'Configurable cluster box units, recessed apartment banks, and parcel lockers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'both',
    architecturalStyle: 'residential',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['mailbox', 'postal', 'apartment', 'cbu', 'parcel', 'mail'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Compartment Grid' },
      { key: 'columns', name: 'Mailbox Columns', type: 'number', min: 2, max: 8, step: 1, default: 4 },
      { key: 'rows', name: 'Mailbox Rows', type: 'number', min: 2, max: 7, step: 1, default: 4 },
      { key: 'parcelLockers', name: 'Parcel Lockers', type: 'number', min: 0, max: 4, step: 1, default: 2 },
      { key: 'compWidth', name: 'Compartment Width', type: 'number', min: 0.14, max: 0.36, step: 0.01, unit: 'm', default: 0.2 },
      { key: 'compHeight', name: 'Compartment Height', type: 'number', min: 0.1, max: 0.28, step: 0.01, unit: 'm', default: 0.14 },
      { key: 'cabinetDepth', name: 'Cabinet Depth', type: 'number', min: 0.28, max: 0.58, step: 0.02, unit: 'm', default: 0.38 },
      { key: 'doorGap', name: 'Door Seam Gap', type: 'number', min: 0.006, max: 0.02, step: 0.002, unit: 'm', default: 0.01 },
      { group: 'Mounting & Trim' },
      {
        key: 'mountStyle',
        name: 'Support / Mount',
        type: 'select',
        options: [
          ['pedestal_legs', 'Single Pedestal'],
          ['dual_posts', 'Dual Support Posts'],
          ['wall_recessed', 'Wall-Mounted Bank'],
          ['freestanding_base', 'Cabinet Plinth']
        ],
        default: 'pedestal_legs'
      },
      { key: 'legHeight', name: 'Support Leg Height', type: 'number', min: 0.35, max: 0.95, step: 0.05, unit: 'm', default: 0.68 },
      {
        key: 'roofTrim',
        name: 'Top Trim Profile',
        type: 'select',
        options: [
          ['sloped_hood', 'Sloped Rain Hood'],
          ['crown_molding', 'Crown Molding'],
          ['flat', 'Flat Cap']
        ],
        default: 'sloped_hood'
      },
      { key: 'outgoingSlot', name: 'Outgoing Mail Slot', type: 'boolean', default: true },
      { key: 'labelPlates', name: 'Unit Label Plates', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'cbu_pedestal_standard',
        label: 'Standard Pedestal Cluster',
        subcategory: 'Apartment Banks',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#768899',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#bfc8d1',
        accentColor: '#3b6d96',
        frameColor: '#2c343d',
        params: { columns: 4, rows: 4, parcelLockers: 2, mountStyle: 'pedestal_legs', roofTrim: 'sloped_hood' }
      },
      {
        id: 'apartment_wall_bank',
        label: 'Wall-Mounted Apartment Bank',
        subcategory: 'Apartment Banks',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#a8b2bc',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#cbd3db',
        accentColor: '#c9873c',
        frameColor: '#2d333b',
        params: { columns: 6, rows: 5, parcelLockers: 2, mountStyle: 'wall_recessed', roofTrim: 'crown_molding', cabinetDepth: 0.32 }
      },
      {
        id: 'modern_parcel_locker_station',
        label: 'Modern Parcel Locker Station',
        subcategory: 'Parcel Lockers',
        locationContext: 'both',
        paletteFamily: 'modern_downtown',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#3b4958',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd7df',
        accentColor: '#3ec7e8',
        frameColor: '#1f252c',
        params: { columns: 4, rows: 2, parcelLockers: 4, compWidth: 0.28, compHeight: 0.2, mountStyle: 'freestanding_base', legHeight: 0.35, roofTrim: 'flat' }
      },
      {
        id: 'brass_lobby_mail_bank',
        label: 'Heritage Brass Mail Bank',
        subcategory: 'Apartment Banks',
        locationContext: 'interior',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'cast_iron',
        primaryColor: '#2c353d',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#c49b45',
        accentColor: '#9c3c31',
        frameColor: '#1d2126',
        params: { columns: 5, rows: 4, parcelLockers: 0, mountStyle: 'dual_posts', roofTrim: 'crown_molding' }
      },
      {
        id: 'worn_urban_cbu',
        label: 'Worn Urban Cluster Box',
        subcategory: 'Apartment Banks',
        locationContext: 'exterior',
        paletteFamily: 'neglected_abandoned',
        condition: 'weathered',
        primaryMaterial: 'weathered_surface',
        primaryColor: '#6b675e',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d9196',
        accentColor: '#8a4836',
        frameColor: '#2b2824',
        params: { columns: 4, rows: 3, parcelLockers: 2, mountStyle: 'pedestal_legs', roofTrim: 'sloped_hood' }
      }
    ],
    buildGeometry: pwBuildMailboxCluster
  });

  registerObjectFamily({
    id: 'postal_drop_box',
    categoryId: '01_postal',
    subcategory: 'Street Collection',
    subcategories: ['Street Collection', 'Residential Mailboxes', 'Parcel Lockers'],
    label: 'Street Postal Drop & Mailbox',
    description: 'Street postal collection boxes, courier drop cabinets, post mailboxes, and parcel cages.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['postal', 'mailbox', 'dropbox', 'courier', 'package', 'mail'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Box Type & Scale' },
      {
        key: 'boxType',
        name: 'Drop Box Type',
        type: 'select',
        options: [
          ['classic_street_drop', 'Street Postal Collection'],
          ['courier_express_box', 'Courier Express Drop'],
          ['residential_post_mailbox', 'Residential Post Mailbox'],
          ['parcel_storage_cage', 'Package Storage Cage']
        ],
        default: 'classic_street_drop'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.35, max: 1.1, step: 0.02, unit: 'm', default: 0.58 },
      { key: 'height', name: 'Total Height', type: 'number', min: 0.85, max: 1.65, step: 0.05, unit: 'm', default: 1.25 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.35, max: 0.95, step: 0.02, unit: 'm', default: 0.58 },
      { group: 'Details' },
      { key: 'chuteExtension', name: 'Chute Depth', type: 'number', min: 0.06, max: 0.28, step: 0.02, unit: 'm', default: 0.14 },
      { key: 'postHeight', name: 'Mailbox Post Height', type: 'number', min: 0.65, max: 1.2, step: 0.05, unit: 'm', default: 0.95 },
      { key: 'flagRaised', name: 'Flag Raised', type: 'boolean', default: true },
      { key: 'schedulePlaca', name: 'Schedule Plaque', type: 'boolean', default: true },
      { key: 'signText', name: 'Box Label', type: 'text', default: 'City Post', maxLength: 24 }
    ],
    presets: [
      {
        id: 'blue_street_collection_box',
        label: 'Street Postal Collection Box',
        subcategory: 'Street Collection',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#264d7a',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#36659c',
        accentColor: '#e04838',
        frameColor: '#1f252c',
        params: { boxType: 'classic_street_drop', width: 0.58, height: 1.24, depth: 0.58, signText: 'City Mail' }
      },
      {
        id: 'express_courier_cabinet',
        label: 'Express Courier Drop Box',
        subcategory: 'Street Collection',
        locationContext: 'both',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#4e3570',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#e87a2e',
        accentColor: '#f2f4f7',
        frameColor: '#252a32',
        params: { boxType: 'courier_express_box', width: 0.54, height: 1.32, depth: 0.52, signText: 'B Express' }
      },
      {
        id: 'suburban_post_mailbox',
        label: 'Residential Post Mailbox',
        subcategory: 'Residential Mailboxes',
        locationContext: 'exterior',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#23282e',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#aeb7c0',
        accentColor: '#d1382e',
        frameColor: '#2a3036',
        woodColor: '#8d5b34',
        params: { boxType: 'residential_post_mailbox', width: 0.44, postHeight: 0.95, depth: 0.54, flagRaised: true }
      },
      {
        id: 'loading_parcel_cage',
        label: 'Package Storage Cage',
        subcategory: 'Parcel Lockers',
        locationContext: 'both',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#8d969f',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#a4adb5',
        accentColor: '#e0a124',
        frameColor: '#343b42',
        params: { boxType: 'parcel_storage_cage', width: 0.96, height: 1.55, depth: 0.84, schedulePlaca: false }
      }
    ],
    buildGeometry: pwBuildPostalDropBox
  });

  registerObjectFamily({
    id: 'commercial_dumpster',
    categoryId: '02_waste',
    subcategory: 'Commercial Dumpsters',
    subcategories: ['Commercial Dumpsters'],
    label: 'Commercial Dumpster',
    description: 'Front-loading, rear-loading, and open-top roll-off dumpsters with configurable lids and wear.',
    attachmentProfile: 'ground_standing',
    locationContext: 'exterior',
    architecturalStyle: 'industrial',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['dumpster', 'waste', 'garbage', 'alley', 'commercial', 'trash'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Dimensions & Type' },
      {
        key: 'dumpsterStyle',
        name: 'Dumpster Type',
        type: 'select',
        options: [
          ['front_load', 'Front-Loading Dumpster'],
          ['rear_load', 'Rear-Loading Slanted'],
          ['roll_off_open', 'Open-Top Roll-Off'],
          ['industrial_hopper', 'Industrial Container']
        ],
        default: 'front_load'
      },
      { key: 'length', name: 'Length', type: 'number', min: 1.4, max: 4.2, step: 0.1, unit: 'm', default: 2.1 },
      { key: 'width', name: 'Width', type: 'number', min: 1.0, max: 2.2, step: 0.05, unit: 'm', default: 1.35 },
      { key: 'height', name: 'Height', type: 'number', min: 1.0, max: 2.1, step: 0.05, unit: 'm', default: 1.35 },
      { group: 'Lids & Hardware' },
      { key: 'lidCount', name: 'Number of Lids', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      {
        key: 'lidType',
        name: 'Lid Configuration',
        type: 'select',
        options: [
          ['ribbed_plastic', 'Ribbed Plastic Lids'],
          ['split_metal', 'Split Steel Lids'],
          ['flat_flip', 'Flat Flip Covers'],
          ['open_top', 'Open Top']
        ],
        default: 'ribbed_plastic'
      },
      { key: 'lidOpenAngle', name: 'Lid Open Angle', type: 'number', min: 0, max: 75, step: 5, unit: 'deg', default: 0 },
      {
        key: 'sidePockets',
        name: 'Side Handles / Pockets',
        type: 'select',
        options: [
          ['fork_sleeves', 'Forklift Sleeves'],
          ['trunnion_bar', 'Trunnion Lift Bar'],
          ['side_handles', 'Grab Handles'],
          ['none', 'Smooth Sides']
        ],
        default: 'fork_sleeves'
      },
      { key: 'ribCount', name: 'Reinforcing Ribs', type: 'number', min: 0, max: 7, step: 1, default: 4 },
      { key: 'casterWheels', name: 'Caster Wheels', type: 'boolean', default: true },
      { group: 'Wear & Decals' },
      { key: 'rustAmount', name: 'Rust Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.2 },
      {
        key: 'decalPlacement',
        name: 'Warning Decals',
        type: 'select',
        options: [
          ['front_warning', 'Front Warning'],
          ['side_recycle', 'Side Emblem'],
          ['both', 'Front & Side'],
          ['none', 'None']
        ],
        default: 'front_warning'
      },
      { key: 'overflowBags', name: 'Overflow Trash Bags', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'standard_green_dumpster',
        label: 'Standard Green Dumpster',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#266343',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#367554',
        accentColor: '#e8b228',
        frameColor: '#20262b',
        params: { dumpsterStyle: 'front_load', length: 2.1, width: 1.35, height: 1.35, lidCount: 2, ribCount: 4, casterWheels: true, rustAmount: 0.15 }
      },
      {
        id: 'industrial_blue_dumpster',
        label: 'Industrial Blue Dumpster',
        paletteFamily: 'industrial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b5885',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d97a0',
        accentColor: '#e0a124',
        frameColor: '#222830',
        params: { dumpsterStyle: 'front_load', length: 2.3, width: 1.4, height: 1.45, lidCount: 2, ribCount: 5, casterWheels: true, rustAmount: 0.08 }
      },
      {
        id: 'rusted_alley_dumpster',
        label: 'Rusted Steel Alley Dumpster',
        paletteFamily: 'neglected_abandoned',
        condition: 'neglected',
        primaryMaterial: 'weathered_surface',
        primaryColor: '#664a38',
        secondaryMaterial: 'weathered_surface',
        secondaryColor: '#585149',
        accentColor: '#9e6f34',
        frameColor: '#292420',
        params: { dumpsterStyle: 'front_load', length: 2.1, width: 1.35, height: 1.3, lidCount: 2, lidOpenAngle: 20, ribCount: 4, rustAmount: 0.88, overflowBags: true }
      },
      {
        id: 'roll_off_construction_dumpster',
        label: 'Construction Roll-Off Dumpster',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'painted_steel',
        primaryColor: '#995328',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#7b8288',
        accentColor: '#e0a124',
        frameColor: '#23272c',
        params: { dumpsterStyle: 'roll_off_open', length: 3.6, width: 1.85, height: 1.45, lidType: 'open_top', ribCount: 7, casterWheels: false, sidePockets: 'side_handles', rustAmount: 0.45 }
      },
      {
        id: 'rear_load_slant_dumpster',
        label: 'Rear-Loading Slanted Dumpster',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#385769',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#2b3238',
        accentColor: '#e8b228',
        frameColor: '#1f242a',
        params: { dumpsterStyle: 'rear_load', length: 1.9, width: 1.25, height: 1.35, lidCount: 2, sidePockets: 'trunnion_bar', ribCount: 3, casterWheels: true }
      }
    ],
    buildGeometry: pwBuildCommercialDumpster
  });

  registerObjectFamily({
    id: 'wheeled_bin',
    categoryId: '02_waste',
    subcategory: 'Wheeled Carts',
    subcategories: ['Wheeled Carts', 'Street Litter Bins', 'Recycling Stations'],
    label: 'Waste & Recycling Bin',
    description: 'Wheeled household trash carts, recycling bins, wire litter baskets, and public stations.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['bin', 'trash', 'recycling', 'compost', 'waste', 'litter', 'garbage'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Bin Configuration' },
      {
        key: 'binStyle',
        name: 'Receptacle Style',
        type: 'select',
        options: [
          ['wheeled_cart', 'Wheeled Trash / Recycle Cart'],
          ['wire_mesh_basket', 'Wire Mesh Litter Basket'],
          ['dome_litter_bin', 'Dome Street Litter Bin'],
          ['dual_recycling_station', 'Public Recycling Station'],
          ['dog_waste_station', 'Dog-Waste Station']
        ],
        default: 'wheeled_cart'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.42, max: 1.4, step: 0.04, unit: 'm', default: 0.62 },
      { key: 'height', name: 'Height', type: 'number', min: 0.75, max: 1.35, step: 0.05, unit: 'm', default: 1.05 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.42, max: 0.95, step: 0.04, unit: 'm', default: 0.66 },
      { group: 'Details' },
      { key: 'wheelDiameter', name: 'Wheel Diameter', type: 'number', min: 0.14, max: 0.3, step: 0.02, unit: 'm', default: 0.2 },
      {
        key: 'lidState',
        name: 'Lid Position',
        type: 'select',
        options: [
          ['closed', 'Closed'],
          ['ajar', 'Slightly Ajar'],
          ['open', 'Swung Open']
        ],
        default: 'closed'
      },
      { key: 'recyclingSlot', name: 'Accent Recycling Lid', type: 'boolean', default: false },
      { key: 'linerBagRim', name: 'Inner Liner Bag', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'wheeled_household_trash',
        label: 'Wheeled Household Trash Bin',
        paletteFamily: 'residential',
        condition: 'lightly_worn',
        primaryMaterial: 'plastic',
        primaryColor: '#363d45',
        secondaryMaterial: 'plastic',
        secondaryColor: '#292f36',
        accentColor: '#5c6670',
        frameColor: '#1f2428',
        params: { binStyle: 'wheeled_cart', width: 0.6, height: 1.05, depth: 0.66, lidState: 'closed', recyclingSlot: false }
      },
      {
        id: 'municipal_blue_recycling_cart',
        label: 'Blue Wheeled Recycling Bin',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'plastic',
        primaryColor: '#29639c',
        secondaryMaterial: 'plastic',
        secondaryColor: '#215080',
        accentColor: '#489ce8',
        frameColor: '#1f252c',
        params: { binStyle: 'wheeled_cart', width: 0.62, height: 1.08, depth: 0.66, lidState: 'closed', recyclingSlot: true }
      },
      {
        id: 'green_compost_cart',
        label: 'Green Organic Compost Bin',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'plastic',
        primaryColor: '#2e754a',
        secondaryMaterial: 'plastic',
        secondaryColor: '#235c3a',
        accentColor: '#69b879',
        frameColor: '#22282d',
        params: { binStyle: 'wheeled_cart', width: 0.56, height: 0.98, depth: 0.6, lidState: 'ajar', recyclingSlot: false }
      },
      {
        id: 'wire_mesh_sidewalk_basket',
        label: 'Wire Mesh Sidewalk Basket',
        subcategory: 'Street Litter Bins',
        locationContext: 'exterior',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#8d969e',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#9ea7b0',
        accentColor: '#2d6847',
        frameColor: '#2b3036',
        params: { binStyle: 'wire_mesh_basket', width: 0.54, height: 0.9, depth: 0.54, linerBagRim: true }
      },
      {
        id: 'public_dual_recycling_station',
        label: 'Public Dual Recycling Station',
        subcategory: 'Recycling Stations',
        locationContext: 'both',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2d5e8a',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#b8c2cc',
        accentColor: '#3c8a5c',
        frameColor: '#252c33',
        params: { binStyle: 'dual_recycling_station', width: 1.15, height: 1.08, depth: 0.58 }
      },
      {
        id: 'park_dog_waste_station',
        label: 'Park Dog-Waste Station',
        subcategory: 'Street Litter Bins',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2b6b49',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#9aa4ad',
        accentColor: '#3c855d',
        frameColor: '#22282d',
        params: { binStyle: 'dog_waste_station', width: 0.48, height: 1.25, depth: 0.46 }
      }
    ],
    buildGeometry: pwBuildWheeledBin
  });
}
