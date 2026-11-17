import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function tvcBuildTransitShelter(group, cfg, b, mats, meta) {
  const style = cfg.transitStyle || 'glass_bus_shelter';
  const len = clamp(cfg.length || 3.2, 1.2, 4.8);
  const wid = clamp(cfg.width || 1.45, 0.75, 2.2);
  const h = clamp(cfg.height || 2.45, 1.1, 2.9);

  if (style === 'arrival_led_board' || style === 'transit_ticket_kiosk') {
    const kw = Math.min(len, 1.25);
    const kd = Math.min(wid, 0.65);
    b.addBox(0, 0.04, 0, kw + 0.14, 0.08, kd + 0.14, { materialRole: 'concrete', layer: 'body' });
    b.addChamferBox(0, h * 0.5 + 0.04, 0, kw, h, kd, 0.03, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.62, kd * 0.5 + 0.015, kw * 0.76, h * 0.34, 0.02, { materialRole: 'darkMetal', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || (style === 'arrival_led_board' ? 'Line 4 - 3 Min' : 'Metro Tickets'), kw * 0.72, 0.24, '#132433', '#52e3ff', {
      x: 0,
      y: h * 0.66,
      z: kd * 0.5 + 0.03,
      lit: true
    });
    meta.lightSources.push({ id: 'transit_screen', position: [0, h * 0.66, kd * 0.5 + 0.1], color: '#52e3ff', radius: 2.0 });
    meta.interaction = { interactable: true, actionType: style === 'arrival_led_board' ? 'read_schedule' : 'buy_transit_ticket' };
    return;
  }

  if (style === 'fare_turnstile') {
    const lanes = Math.max(1, Math.min(3, Math.round(cfg.glassPanels || 2)));
    const laneW = 0.68;
    const totalW = lanes * laneW + 0.28;
    for (let i = 0; i <= lanes; i++) {
      const px = -totalW * 0.5 + 0.12 + i * laneW;
      b.addChamferBox(px, 0.52, 0, 0.2, 1.04, 1.25, 0.025, { materialRole: 'secondary', layer: 'body' });
      b.addBox(px, 1.05, 0.5, 0.14, 0.02, 0.18, { materialRole: 'accent', layer: 'detail' });
      if (i < lanes) {
        b.addCylinder(px + laneW * 0.36, 0.74, 0, 0.02, 0.02, laneW * 0.62, 6, 'x', 'brushed_metal' ? 'secondary' : 'frame', 'detail');
      }
    }
    meta.interaction = { interactable: true, actionType: 'swipe_transit_fare' };
    return;
  }

  if (style === 'subway_entrance_railing') {
    const railH = Math.min(1.25, h);
    b.addBox(-len * 0.5, 0.18, 0, 0.18, 0.36, wid, { materialRole: 'concrete', layer: 'body' });
    b.addBox(len * 0.5, 0.18, 0, 0.18, 0.36, wid, { materialRole: 'concrete', layer: 'body' });
    b.addBox(0, 0.18, -wid * 0.5, len, 0.36, 0.18, { materialRole: 'concrete', layer: 'body' });
    const postCount = Math.max(3, Math.round(len / 0.85));
    for (let i = 0; i < postCount; i++) {
      const px = -len * 0.48 + (i / (postCount - 1)) * (len * 0.96);
      b.addCylinder(px, railH * 0.5, -wid * 0.5, 0.032, 0.032, railH, 8, 'y', 'frame', 'body');
      b.addCylinder(px, railH * 0.5, wid * 0.5, 0.032, 0.032, railH, 8, 'y', 'frame', 'body');
    }
    b.addCylinder(0, railH, -wid * 0.5, 0.04, 0.04, len, 8, 'x', 'primary', 'body');
    b.addCylinder(0, railH, wid * 0.5, 0.04, 0.04, len, 8, 'x', 'primary', 'body');
    // Entrance sign gantry
    b.addCylinder(-len * 0.46, 1.5, wid * 0.5, 0.045, 0.045, 2.5, 8, 'y', 'frame', 'body');
    b.addCylinder(len * 0.46, 1.5, wid * 0.5, 0.045, 0.045, 2.5, 8, 'y', 'frame', 'body');
    b.addBox(0, 2.65, wid * 0.5, len * 0.95, 0.36, 0.14, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Metro Station', len * 0.82, 0.26, cfg.primaryColor || '#204568', '#ffffff', {
      x: 0,
      y: 2.65,
      z: wid * 0.5 + 0.08,
      lit: true
    });
    return;
  }

  // Bus stop shelter or cantilever transit canopy
  const posts = Math.max(2, Math.round(cfg.glassPanels || 3) + 1);
  for (let i = 0; i < posts; i++) {
    const px = -len * 0.46 + (i / (posts - 1)) * (len * 0.92);
    b.addBox(px, h * 0.5, -wid * 0.42, 0.08, h, 0.08, { materialRole: 'frame', layer: 'body' });
  }
  if (style === 'glass_bus_shelter') {
    const panelCount = Math.max(1, posts - 1);
    const panelW = (len * 0.9) / panelCount;
    for (let p = 0; p < panelCount; p++) {
      const gx = -len * 0.45 + panelW * 0.5 + p * panelW;
      b.addBox(gx, h * 0.48, -wid * 0.42, panelW - 0.09, h * 0.78, 0.025, { materialRole: 'glass', layer: 'detail' });
    }
    b.addBox(-len * 0.46, h * 0.48, 0, 0.04, h * 0.78, wid * 0.78, { materialRole: 'glass', layer: 'detail' });
  }

  // Roof canopy
  if (cfg.roofShape === 'arched_barrel') {
    b.addCylinder(0, h + 0.06, 0, wid * 0.55, wid * 0.55, len + 0.18, 8, 'x', 'primary', 'body');
  } else if (cfg.roofShape === 'pitched_canopy') {
    b.addTrapezoidBox(0, h + 0.12, 0, len + 0.2, wid + 0.18, len + 0.1, 0.2, 0.22, { materialRole: 'primary', layer: 'body' });
  } else {
    b.addBox(0, h + 0.05, 0, len + 0.2, 0.1, wid + 0.16, { materialRole: 'primary', layer: 'body' });
  }

  if (cfg.adLightbox) {
    b.addBox(len * 0.46, h * 0.48, 0, 0.16, h * 0.76, wid * 0.78, { materialRole: 'frame', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Metro Route Map', wid * 0.66, h * 0.62, '#eef3f7', '#1a232e', {
      x: len * 0.46 + 0.09,
      y: h * 0.48,
      z: 0,
      rotY: Math.PI * 0.5,
      lit: true
    });
  }

  if (cfg.integratedBench) {
    b.addBox(-0.15, 0.45, -wid * 0.18, len * 0.64, 0.06, 0.38, { materialRole: 'accent', layer: 'body' });
    b.addBox(-len * 0.32, 0.22, -wid * 0.18, 0.08, 0.44, 0.32, { materialRole: 'frame', layer: 'detail' });
    b.addBox(len * 0.12, 0.22, -wid * 0.18, 0.08, 0.44, 0.32, { materialRole: 'frame', layer: 'detail' });
  }

  meta.lightSources.push({ id: 'shelter_roof_light', position: [0, h - 0.06, 0], color: '#fff2c4', radius: 3.5 });
  meta.interaction = { interactable: true, actionType: 'wait_transit_stop' };
}

function tvcBuildVendorCart(group, cfg, b, mats, meta) {
  const style = cfg.cartStyle || 'hot_dog_cart';
  const len = clamp(cfg.length || 1.75, 1.1, 2.8);
  const wid = clamp(cfg.width || 0.9, 0.7, 1.65);
  const counterH = clamp(cfg.counterHeight || 0.94, 0.82, 1.1);
  const wheels = Math.max(0, Math.round(cfg.wheelCount ?? 2));
  const wr = clamp(cfg.wheelRadius || 0.24, 0.14, 0.38);
  const chassisY = wheels > 0 ? wr * 0.95 : 0.08;
  const bodyH = Math.max(0.45, counterH - chassisY);

  // Wheels or leveling legs
  if (wheels >= 2) {
    b.addCylinder(-len * 0.26, wr, wid * 0.5 + 0.04, wr, wr, 0.06, 12, 'z', 'rubber', 'body');
    b.addCylinder(-len * 0.26, wr, -wid * 0.5 - 0.04, wr, wr, 0.06, 12, 'z', 'rubber', 'body');
    b.addCylinder(-len * 0.26, wr, 0, wr * 0.45, wr * 0.45, wid + 0.12, 8, 'z', 'secondary', 'detail');
    if (wheels >= 4) {
      b.addCylinder(len * 0.28, wr * 0.55, wid * 0.42, wr * 0.55, wr * 0.55, 0.05, 10, 'z', 'rubber', 'body');
      b.addCylinder(len * 0.28, wr * 0.55, -wid * 0.42, wr * 0.55, wr * 0.55, 0.05, 10, 'z', 'rubber', 'body');
    } else {
      b.addBox(len * 0.36, chassisY * 0.5, wid * 0.36, 0.05, chassisY, 0.05, { materialRole: 'frame', layer: 'body' });
      b.addBox(len * 0.36, chassisY * 0.5, -wid * 0.36, 0.05, chassisY, 0.05, { materialRole: 'frame', layer: 'body' });
    }
  } else {
    b.addSupportLegs(0, 0, chassisY + 0.05, len * 0.82, wid * 0.8, 0.06, 'frame');
  }

  // Main cart cabinet
  const cabMat = style === 'produce_market_stall' ? 'wood' : 'primary';
  b.addChamferBox(0, chassisY + bodyH * 0.5, 0, len, bodyH, wid, 0.025, { materialRole: cabMat, layer: 'body' });
  b.addBox(0, counterH + 0.02, 0, len + 0.08, 0.045, wid + 0.08, { materialRole: 'secondary', layer: 'body' });

  // Push handle
  if (cfg.pushHandle) {
    b.addBox(len * 0.56, counterH - 0.08, wid * 0.32, 0.18, 0.035, 0.035, { materialRole: 'frame', layer: 'detail' });
    b.addBox(len * 0.56, counterH - 0.08, -wid * 0.32, 0.18, 0.035, 0.035, { materialRole: 'frame', layer: 'detail' });
    b.addCylinder(len * 0.64, counterH - 0.08, 0, 0.022, 0.022, wid * 0.72, 8, 'z', 'rubber', 'detail');
  }

  // Cooking equipment / display crates on counter
  const equip = cfg.cookingEquipment || 'steam_pans';
  if (equip === 'espresso_machine') {
    b.addBox(-len * 0.15, counterH + 0.2, -wid * 0.1, 0.52, 0.34, 0.38, { materialRole: 'secondary', layer: 'detail' });
    b.addCylinder(len * 0.25, counterH + 0.14, 0, 0.12, 0.12, 0.24, 10, 'y', 'glass', 'detail');
  } else if (equip === 'display_crates') {
    for (let c = 0; c < 3; c++) {
      const cx = -len * 0.3 + c * (len * 0.3);
      b.addBox(cx, counterH + 0.12, 0, len * 0.26, 0.18, wid * 0.7, { materialRole: 'wood', layer: 'detail', rotXDeg: 14 });
      b.addCylinder(cx, counterH + 0.22, 0, 0.1, 0.12, 0.1, 8, 'y', c % 2 === 0 ? 'accent' : 'foliage', 'detail');
    }
  } else {
    b.addBox(-len * 0.1, counterH + 0.1, 0, len * 0.55, 0.14, wid * 0.65, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(-len * 0.2, counterH + 0.18, 0, len * 0.22, 0.06, wid * 0.5, { materialRole: 'frame', layer: 'detail' });
  }

  if (cfg.sneezeGuardGlass) {
    b.addBox(0, counterH + 0.26, wid * 0.42, len * 0.78, 0.42, 0.025, { materialRole: 'glass', layer: 'detail' });
  }
  if (cfg.condimentRack) {
    b.addBox(len * 0.36, counterH + 0.14, wid * 0.28, 0.24, 0.22, 0.18, { materialRole: 'accent', layer: 'detail' });
  }

  // Canopy / umbrella
  const canopy = cfg.canopyType || 'striped_umbrella';
  const cSpan = clamp(cfg.canopySpan || 1.9, 1.2, 2.8);
  if (canopy === 'striped_umbrella') {
    const umbY = counterH + 1.28;
    b.addCylinder(0, counterH + 0.64, -wid * 0.15, 0.025, 0.03, 1.32, 8, 'y', 'wood', 'body');
    b.addCylinder(0, umbY, -wid * 0.15, 0.08, cSpan * 0.54, 0.38, 8, 'y', 'fabric', 'body');
  } else if (canopy === 'pitched_fabric_awning' || canopy === 'rigid_sign_roof') {
    const roofY = counterH + 1.18;
    for (const sx of [-len * 0.46, len * 0.46]) {
      for (const sz of [-wid * 0.44, wid * 0.44]) {
        b.addCylinder(sx, counterH + 0.58, sz, 0.024, 0.024, 1.16, 8, 'y', 'frame', 'body');
      }
    }
    if (canopy === 'pitched_fabric_awning') {
      b.addTrapezoidBox(0, roofY + 0.16, 0, cSpan, wid + 0.45, cSpan * 0.92, 0.18, 0.34, { materialRole: 'fabric', layer: 'body' });
    } else {
      b.addBox(0, roofY + 0.08, 0, cSpan, 0.16, wid + 0.38, { materialRole: 'primary', layer: 'body' });
    }
  }

  // Front signboard
  objCreateSignPlane(group, cfg.signText || 'Street Eats', Math.min(len * 0.78, 1.4), 0.32, cfg.accentColor || '#f5c342', '#171c22', {
    x: 0,
    y: chassisY + bodyH * 0.52,
    z: wid * 0.5 + 0.02
  });

  meta.snapAnchors.push({ id: 'vendor_operator_spot', position: [0, 0, -wid * 0.5 - 0.55], normal: [0, 0, -1] });
  meta.snapAnchors.push({ id: 'customer_front', position: [0, 0, wid * 0.5 + 0.55], normal: [0, 0, 1] });
  meta.interaction = { interactable: true, actionType: 'buy_vendor_food', npcExcluded: true };
}

function tvcBuildNewspaperBox(group, cfg, b, mats, meta) {
  const style = cfg.standStyle || 'single_honor_box';
  const count = Math.max(1, Math.round(cfg.unitCount || 1));
  const w = clamp(cfg.width || 0.52, 0.45, 1.8);
  const h = clamp(cfg.height || 1.08, 0.85, 2.2);
  const d = clamp(cfg.depth || 0.46, 0.12, 0.6);

  if (style === 'a_frame_sandwich_board') {
    const legH = h * 0.95;
    const tiltDeg = 14;
    const tiltRad = degToRad(tiltDeg);
    const panelCY = legH * 0.48;
    const panelZ = Math.max(0.11, legH * 0.48 * Math.sin(tiltRad));
    b.addBox(0, panelCY, panelZ, w, legH, 0.04, { materialRole: 'frame', layer: 'body', rotXDeg: -tiltDeg });
    b.addBox(0, panelCY, -panelZ, w, legH, 0.04, { materialRole: 'frame', layer: 'body', rotXDeg: tiltDeg });
    b.addBox(0, legH * 0.94, 0, w * 0.96, 0.035, 0.055, { materialRole: 'frame', layer: 'detail' });
    b.addBox(-w * 0.45, legH * 0.36, 0, 0.016, 0.02, panelZ * 2.1, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(w * 0.45, legH * 0.36, 0, 0.016, 0.02, panelZ * 2.1, { materialRole: 'secondary', layer: 'detail' });
    const dAlong = legH * 0.04;
    const signNormalOffset = 0.024;
    const signY = panelCY + dAlong * Math.cos(tiltRad) + signNormalOffset * Math.sin(tiltRad);
    const signZ = panelZ - dAlong * Math.sin(tiltRad) + signNormalOffset * Math.cos(tiltRad);
    objCreateSignPlane(group, cfg.signText || 'Daily Special', w * 0.82, legH * 0.72, '#1d242b', '#f2f4f7', {
      x: 0,
      y: signY,
      z: signZ,
      rotX: -tiltRad
    });
    objCreateSignPlane(group, cfg.signText || 'Daily Special', w * 0.82, legH * 0.72, '#1d242b', '#f2f4f7', {
      x: 0,
      y: signY,
      z: -signZ,
      rotY: Math.PI,
      rotX: tiltRad,
      name: 'ObjectSignFace_Back'
    });
    return;
  }

  if (style === 'wall_poster_case') {
    b.addBox(0, 0, d * 0.5, w, h, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0, d + 0.01, w * 0.88, h * 0.88, 0.015, { materialRole: 'glass', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'City Events', w * 0.78, h * 0.76, '#f4efe2', '#1b2028', {
      x: 0,
      y: 0,
      z: d + 0.02,
      lit: true
    });
    return;
  }

  if (style === 'illuminated_ad_totem' || style === 'community_bulletin_board') {
    b.addBox(0, 0.08, 0, w + 0.12, 0.16, d + 0.12, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, h * 0.5 + 0.08, 0, w, h, d, 0.03, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'City Notice', w * 0.82, h * 0.74, '#edf2f7', '#1a222d', {
      x: 0,
      y: h * 0.52 + 0.08,
      z: d * 0.5 + 0.018,
      lit: style === 'illuminated_ad_totem',
      doubleSided: true,
      backOffset: d + 0.036
    });
    if (style === 'illuminated_ad_totem') {
      meta.lightSources.push({ id: 'ad_panel_glow', position: [0, h * 0.55, 0], color: '#dff6ff', radius: 2.5 });
    }
    return;
  }

  // Newspaper honor box(es)
  const unitW = style === 'modular_box_cluster' ? clamp(w / count, 0.42, 0.56) : w;
  const totalW = count * unitW + (count - 1) * 0.04;
  const baseH = 0.24;

  if (cfg.pedestalBase === 'concrete_tray') {
    b.addBox(0, 0.04, 0, totalW + 0.14, 0.08, d + 0.14, { materialRole: 'concrete', layer: 'body' });
  }

  for (let i = 0; i < count; i++) {
    const ux = -totalW * 0.5 + unitW * 0.5 + i * (unitW + 0.04);
    const role = i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'accent' : 'secondary';
    b.addBox(ux, baseH * 0.5 + 0.04, 0, unitW * 0.78, baseH, d * 0.8, { materialRole: 'frame', layer: 'body' });
    const boxH = h - baseH - 0.04;
    const boxCY = baseH + 0.04 + boxH * 0.5;
    b.addChamferBox(ux, boxCY, 0, unitW, boxH, d, 0.02, { materialRole: role, layer: 'body' });
    const winRatio = clamp(cfg.windowDisplayRatio || 0.45, 0.3, 0.75);
    b.addBox(ux, boxCY + boxH * 0.1, d * 0.5 + 0.01, unitW * 0.72, boxH * winRatio * 0.7, 0.018, { materialRole: 'glass', layer: 'detail' });
    b.addBox(ux + unitW * 0.26, boxCY + boxH * 0.34, d * 0.5 + 0.02, 0.1, 0.12, 0.04, { materialRole: 'secondary', layer: 'detail' });
    if (cfg.headerCard) {
      objCreateSignPlane(group, cfg.signText || 'City Times', unitW * 0.82, 0.16, '#f4f6f8', '#181c22', {
        x: ux,
        y: baseH + boxH + 0.12,
        z: d * 0.42
      });
    }
  }
  meta.interaction = { interactable: true, actionType: 'grab_newspaper' };
}

function tvcBuildCafeStorefront(group, cfg, b, mats, meta) {
  const style = cfg.propStyle || 'bistro_table_set';
  const w = clamp(cfg.width || 1.4, 0.65, 3.6);
  const h = clamp(cfg.height || 1.15, 0.45, 2.3);
  const d = clamp(cfg.depth || 1.1, 0.35, 2.2);

  if (style === 'storefront_awning') {
    const proj = d;
    const slope = clamp(cfg.awningSlope || 0.38, 0.2, 0.65);
    const dropH = proj * slope;
    b.addBox(0, 0, 0.03, w, 0.06, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addTrapezoidBox(0, -dropH * 0.5, proj * 0.5, w, proj, w, 0.06, dropH, {
      materialRole: 'fabric',
      layer: 'body',
      topOffsetZ: -proj * 0.46
    });
    if (cfg.scallopValance) {
      b.addBox(0, -dropH - 0.07, proj - 0.02, w, 0.14, 0.03, { materialRole: 'fabric', layer: 'detail' });
    }
    objCreateSignPlane(group, cfg.signText || 'Bistro Cafe', Math.min(w * 0.7, 1.8), 0.12, cfg.accentColor || '#b83d35', '#ffffff', {
      x: 0,
      y: -dropH - 0.07,
      z: proj
    });
    return;
  }

  if (style === 'projecting_blade_sign') {
    b.addBox(0, 0, 0.03, 0.12, h * 0.65, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, h * 0.22, d * 0.5, 0.04, 0.04, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, -h * 0.22, d * 0.5, 0.04, 0.04, d, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, 0, d * 0.55, 0.1, h * 0.88, d * 0.78, 0.02, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, cfg.signText || 'Coffee Shop', d * 0.68, h * 0.72, cfg.primaryColor || '#26473a', '#f7efd8', {
      x: 0.06,
      y: 0,
      z: d * 0.55,
      rotY: Math.PI * 0.5,
      lit: Boolean(cfg.illuminatedFace),
      doubleSided: true,
      backOffset: 0.12
    });
    if (cfg.illuminatedFace) {
      meta.lightSources.push({ id: 'blade_sign_glow', position: [0, 0, d * 0.55], color: '#ffe8ad', radius: 2.2 });
    }
    return;
  }

  if (style === 'beverage_vending_machine') {
    b.addBox(0, 0.03, 0, w * 0.92, 0.06, d * 0.92, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, h * 0.5 + 0.04, 0, w, h, d, 0.03, { materialRole: 'primary', layer: 'body' });
    b.addBox(-w * 0.1, h * 0.58 + 0.04, d * 0.5 + 0.015, w * 0.62, h * 0.58, 0.03, {
      materialRole: cfg.illuminatedFace ? 'holoEnergy' : 'glass',
      layer: 'detail'
    });
    b.addBox(w * 0.34, h * 0.55 + 0.04, d * 0.5 + 0.015, w * 0.18, h * 0.38, 0.025, { materialRole: 'darkMetal', layer: 'detail' });
    b.addBox(-w * 0.06, h * 0.18 + 0.04, d * 0.5 + 0.02, w * 0.56, 0.16, 0.04, { materialRole: 'frame', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Cold Drinks', w * 0.58, 0.24, cfg.accentColor || '#f5c342', '#171c22', {
      x: -w * 0.1,
      y: h * 0.78 + 0.04,
      z: d * 0.5 + 0.035,
      lit: Boolean(cfg.illuminatedFace)
    });
    meta.interaction = { interactable: true, actionType: 'use_vending_machine' };
    return;
  }

  if (style === 'outdoor_patio_heater') {
    b.addCylinder(0, 0.16, 0, 0.24, 0.28, 0.32, 10, 'y', 'secondary', 'body');
    b.addCylinder(0, 0.55, 0, 0.18, 0.24, 0.56, 10, 'y', 'primary', 'body');
    b.addCylinder(0, 1.45, 0, 0.04, 0.045, 1.35, 8, 'y', 'secondary', 'body');
    b.addCylinder(0, 2.02, 0, 0.09, 0.09, 0.28, 8, 'y', 'lampGlow', 'detail');
    b.addCylinder(0, 2.2, 0, 0.08, 0.44, 0.16, 10, 'y', 'secondary', 'body');
    meta.lightSources.push({ id: 'patio_heater_flame', position: [0, 2.02, 0], color: '#ffae52', radius: 2.5 });
    return;
  }

  if (style === 'window_flower_box') {
    b.addBox(0, 0, d * 0.5, w, h * 0.55, d, { materialRole: 'wood', layer: 'body' });
    b.addBox(0, h * 0.26, d * 0.5, w * 0.9, 0.18, d * 0.78, { materialRole: 'foliage', layer: 'detail' });
    return;
  }

  // Bistro table set or patio umbrella table
  const tableR = Math.min(w, d) * 0.36;
  const tableH = 0.74;
  b.addCylinder(0, 0.025, 0, tableR * 0.6, tableR * 0.65, 0.05, 10, 'y', 'frame', 'body');
  b.addCylinder(0, tableH * 0.5, 0, 0.038, 0.045, tableH, 8, 'y', 'frame', 'body');
  b.addCylinder(0, tableH, 0, tableR, tableR, 0.04, 12, 'y', 'wood', 'body');

  if (style === 'patio_umbrella_table' && cfg.umbrellaOpen) {
    b.addCylinder(0, tableH + 0.7, 0, 0.024, 0.024, 1.45, 8, 'y', 'wood', 'body');
    b.addCylinder(0, tableH + 1.52, 0, 0.06, w * 0.72, 0.34, 8, 'y', 'fabric', 'body');
  }

  const chairs = Math.max(0, Math.round(cfg.chairCount ?? 2));
  for (let i = 0; i < chairs; i++) {
    const a = (i / Math.max(1, chairs)) * Math.PI * 2 + 0.4;
    const dist = tableR + 0.34;
    const cx = Math.cos(a) * dist;
    const cz = Math.sin(a) * dist;
    b.addCylinder(cx, 0.44, cz, 0.2, 0.2, 0.035, 8, 'y', 'wood', 'body');
    b.addSupportLegs(cx, 0, 0.44, 0.24, 0.24, 0.03, 'frame', cz);
    b.addBox(cx + Math.cos(a) * 0.16, 0.68, cz + Math.sin(a) * 0.16, 0.3, 0.42, 0.03, {
      materialRole: 'frame',
      layer: 'detail',
      rotY: -a + Math.PI * 0.5
    });
  }
  meta.interaction = { interactable: true, actionType: 'sit_cafe_table', chairCount: chairs };
}

export function registerTransitVendorsAndCommercialFamilies() {
  registerObjectFamily({
    id: 'transit_shelter',
    categoryId: '06_transit',
    subcategory: 'Bus Shelters',
    subcategories: ['Bus Shelters', 'Subway Entrances', 'Transit Kiosks & Boards'],
    label: 'Transit Shelter & Station Prop',
    description: 'Bus stop shelters, subway entrance railings, arrival displays, ticket kiosks, and turnstiles.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'modern_downtown',
    sizeClass: 'large',
    functionalRole: 'infrastructure',
    tags: ['transit', 'bus', 'shelter', 'subway', 'kiosk', 'ticket', 'turnstile', 'station'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Transit Structure' },
      {
        key: 'transitStyle',
        name: 'Transit Object Type',
        type: 'select',
        options: [
          ['glass_bus_shelter', 'Glass Bus Stop Shelter'],
          ['cantilever_transit_canopy', 'Cantilever Canopy'],
          ['subway_entrance_railing', 'Subway Stair Railing'],
          ['arrival_led_board', 'Electronic Arrival Board'],
          ['transit_ticket_kiosk', 'Transit Ticket Kiosk'],
          ['fare_turnstile', 'Transit Fare Turnstile']
        ],
        default: 'glass_bus_shelter'
      },
      { key: 'length', name: 'Length', type: 'number', min: 1.2, max: 4.8, step: 0.2, unit: 'm', default: 3.2 },
      { key: 'width', name: 'Depth / Width', type: 'number', min: 0.75, max: 2.2, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'height', name: 'Height', type: 'number', min: 1.1, max: 2.9, step: 0.1, unit: 'm', default: 2.45 },
      {
        key: 'roofShape',
        name: 'Roof Shape',
        type: 'select',
        options: [
          ['arched_barrel', 'Arched Barrel Vault'],
          ['flat_modern', 'Flat Modern Roof'],
          ['pitched_canopy', 'Pitched Canopy']
        ],
        default: 'arched_barrel'
      },
      { group: 'Amenities' },
      { key: 'glassPanels', name: 'Bays / Lanes', type: 'number', min: 1, max: 5, step: 1, default: 3 },
      { key: 'adLightbox', name: 'Ad & Map Lightbox', type: 'boolean', default: true },
      { key: 'integratedBench', name: 'Integrated Bench', type: 'boolean', default: true },
      { key: 'signText', name: 'Station / Route Text', type: 'text', default: 'Metro Bus', maxLength: 24 }
    ],
    presets: [
      {
        id: 'metro_glass_bus_shelter',
        label: 'Metro Glass Bus Shelter',
        subcategory: 'Bus Shelters',
        locationContext: 'exterior',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2d587a',
        frameColor: '#222830',
        accentColor: '#e5a832',
        params: { transitStyle: 'glass_bus_shelter', length: 3.2, width: 1.45, height: 2.45, roofShape: 'arched_barrel', glassPanels: 3, adLightbox: true, integratedBench: true }
      },
      {
        id: 'subway_stair_entrance_railing',
        label: 'Subway Entrance Railing',
        subcategory: 'Subway Entrances',
        locationContext: 'exterior',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'cast_iron',
        primaryColor: '#26473a',
        frameColor: '#1d2421',
        params: { transitStyle: 'subway_entrance_railing', length: 3.0, width: 1.8, height: 1.15, signText: 'Downtown Station' }
      },
      {
        id: 'transit_ticket_vending_machine',
        label: 'Transit Ticket Vending Kiosk',
        subcategory: 'Transit Kiosks & Boards',
        locationContext: 'both',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b588c',
        accentColor: '#3ec7e8',
        params: { transitStyle: 'transit_ticket_kiosk', length: 0.95, width: 0.58, height: 1.85, signText: 'Metro Pass' }
      },
      {
        id: 'electronic_bus_arrival_board',
        label: 'Electronic Bus Arrival Display',
        subcategory: 'Transit Kiosks & Boards',
        locationContext: 'both',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#36424e',
        params: { transitStyle: 'arrival_led_board', length: 0.65, width: 0.35, height: 2.1, signText: 'Bus 12 - 2 Min' }
      }
    ],
    buildGeometry: tvcBuildTransitShelter
  });

  registerObjectFamily({
    id: 'vendor_cart',
    categoryId: '07_vendors',
    subcategory: 'Food Carts',
    subcategories: ['Food Carts', 'Market Stalls', 'Mobile Kiosks'],
    label: 'Food Vendor Cart & Stall',
    description: 'Hot dog carts, coffee carts, taco stands, ice cream carts, and produce stalls (no NPCs).',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    tags: ['vendor', 'food', 'cart', 'hotdog', 'coffee', 'stall', 'market', 'commerce'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Cart Layout' },
      {
        key: 'cartStyle',
        name: 'Vendor Type',
        type: 'select',
        options: [
          ['hot_dog_cart', 'Hot Dog Cart'],
          ['coffee_espresso_cart', 'Coffee & Espresso Cart'],
          ['pretzel_stand', 'Pretzel & Snack Stand'],
          ['produce_market_stall', 'Fruit & Produce Stall'],
          ['ice_cream_cart', 'Ice Cream Cart'],
          ['taco_grill_stand', 'Street Taco Stand']
        ],
        default: 'hot_dog_cart'
      },
      { key: 'length', name: 'Cart Length', type: 'number', min: 1.1, max: 2.8, step: 0.1, unit: 'm', default: 1.75 },
      { key: 'width', name: 'Cart Width', type: 'number', min: 0.7, max: 1.65, step: 0.05, unit: 'm', default: 0.9 },
      { key: 'counterHeight', name: 'Counter Height', type: 'number', min: 0.82, max: 1.1, step: 0.02, unit: 'm', default: 0.94 },
      { key: 'wheelCount', name: 'Wheel Count', type: 'number', min: 0, max: 4, step: 2, default: 2 },
      { key: 'wheelRadius', name: 'Wheel Radius', type: 'number', min: 0.14, max: 0.38, step: 0.02, unit: 'm', default: 0.24 },
      { group: 'Canopy & Equipment' },
      {
        key: 'canopyType',
        name: 'Canopy Style',
        type: 'select',
        options: [
          ['striped_umbrella', 'Striped Umbrella'],
          ['pitched_fabric_awning', 'Pitched Canopy Frame'],
          ['rigid_sign_roof', 'Rigid Kiosk Roof'],
          ['none', 'Open Top']
        ],
        default: 'striped_umbrella'
      },
      { key: 'canopySpan', name: 'Canopy Span', type: 'number', min: 1.2, max: 2.8, step: 0.1, unit: 'm', default: 1.9 },
      {
        key: 'cookingEquipment',
        name: 'Counter Equipment',
        type: 'select',
        options: [
          ['steam_pans', 'Steam Pans & Grill'],
          ['espresso_machine', 'Espresso Machine'],
          ['flat_grill', 'Flat Griddle'],
          ['display_crates', 'Produce Display Crates'],
          ['warmer_cabinet', 'Heated Warmer Case']
        ],
        default: 'steam_pans'
      },
      { key: 'sneezeGuardGlass', name: 'Glass Sneeze Guard', type: 'boolean', default: true },
      { key: 'condimentRack', name: 'Condiment Station', type: 'boolean', default: true },
      { key: 'pushHandle', name: 'Push Handlebar', type: 'boolean', default: true },
      { key: 'signText', name: 'Vendor Sign', type: 'text', default: 'Hot Dogs', maxLength: 24 }
    ],
    presets: [
      {
        id: 'classic_hot_dog_cart',
        label: 'Classic Hot Dog Cart',
        subcategory: 'Food Carts',
        locationContext: 'exterior',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#b8c2cc',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#cfd7df',
        accentColor: '#d93d2e',
        frameColor: '#252c33',
        params: { cartStyle: 'hot_dog_cart', length: 1.75, width: 0.9, wheelCount: 2, canopyType: 'striped_umbrella', cookingEquipment: 'steam_pans', signText: 'City Dogs' }
      },
      {
        id: 'sidewalk_espresso_coffee_cart',
        label: 'Sidewalk Coffee Cart',
        subcategory: 'Mobile Kiosks',
        locationContext: 'both',
        paletteFamily: 'commercial',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2e5947',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#c2cbd4',
        accentColor: '#d48d28',
        frameColor: '#24292e',
        params: { cartStyle: 'coffee_espresso_cart', length: 1.8, width: 0.95, wheelCount: 4, canopyType: 'pitched_fabric_awning', cookingEquipment: 'espresso_machine', signText: 'B Coffee' }
      },
      {
        id: 'farmers_produce_stall',
        label: 'Fruit & Produce Market Stall',
        subcategory: 'Market Stalls',
        locationContext: 'both',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d5b34',
        accentColor: '#4b8c4a',
        woodColor: '#8d5b34',
        params: { cartStyle: 'produce_market_stall', length: 2.3, width: 1.15, wheelCount: 0, canopyType: 'pitched_fabric_awning', cookingEquipment: 'display_crates', sneezeGuardGlass: false, pushHandle: false, signText: 'Fresh Market' }
      },
      {
        id: 'street_taco_grill_cart',
        label: 'Street Taco Grill Cart',
        subcategory: 'Food Carts',
        locationContext: 'exterior',
        paletteFamily: 'commercial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c8502e',
        accentColor: '#f0b429',
        params: { cartStyle: 'taco_grill_stand', length: 2.0, width: 1.0, wheelCount: 2, canopyType: 'rigid_sign_roof', cookingEquipment: 'flat_grill', signText: 'Street Tacos' }
      },
      {
        id: 'retro_ice_cream_cart',
        label: 'Ice Cream Vendor Cart',
        subcategory: 'Food Carts',
        locationContext: 'exterior',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e8e3d8',
        accentColor: '#3ec7e8',
        params: { cartStyle: 'ice_cream_cart', length: 1.4, width: 0.82, wheelCount: 2, canopyType: 'striped_umbrella', cookingEquipment: 'warmer_cabinet', condimentRack: false, signText: 'Ice Cream' }
      }
    ],
    buildGeometry: tvcBuildVendorCart
  });

  registerObjectFamily({
    id: 'newspaper_box',
    categoryId: '08_advertising',
    subcategory: 'Newspaper Boxes',
    subcategories: ['Newspaper Boxes', 'Sidewalk Signs', 'Advertising Panels'],
    label: 'Newspaper Box & Ad Stand',
    description: 'Single and clustered newspaper vending boxes, A-frame boards, ad totems, and poster cases.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'hanging'],
    locationContext: 'both',
    architecturalStyle: 'commercial',
    sizeClass: 'small',
    functionalRole: 'commerce',
    tags: ['newspaper', 'vending', 'advertising', 'sign', 'poster', 'kiosk', 'box'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Stand Configuration' },
      {
        key: 'standStyle',
        name: 'Stand Type',
        type: 'select',
        options: [
          ['single_honor_box', 'Newspaper Vending Box'],
          ['modular_box_cluster', 'Newspaper Box Cluster'],
          ['a_frame_sandwich_board', 'A-Frame Sandwich Board'],
          ['illuminated_ad_totem', 'Illuminated Ad Totem'],
          ['community_bulletin_board', 'Community Notice Board'],
          ['wall_poster_case', 'Wall Poster Frame']
        ],
        default: 'single_honor_box'
      },
      { key: 'unitCount', name: 'Cluster Units', type: 'number', min: 1, max: 4, step: 1, default: 1 },
      { key: 'width', name: 'Width', type: 'number', min: 0.45, max: 1.8, step: 0.05, unit: 'm', default: 0.52 },
      { key: 'height', name: 'Height', type: 'number', min: 0.85, max: 2.2, step: 0.05, unit: 'm', default: 1.08 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.12, max: 0.6, step: 0.02, unit: 'm', default: 0.46 },
      { group: 'Display & Base' },
      { key: 'windowDisplayRatio', name: 'Window Ratio', type: 'number', min: 0.3, max: 0.75, step: 0.05, default: 0.45 },
      {
        key: 'pedestalBase',
        name: 'Base Style',
        type: 'select',
        options: [
          ['wire_loop', 'Pedestal Frame'],
          ['concrete_tray', 'Concrete Anchor Tray'],
          ['ground_feet', 'Weighted Feet']
        ],
        default: 'wire_loop'
      },
      { key: 'headerCard', name: 'Top Title Plaque', type: 'boolean', default: true },
      { key: 'signText', name: 'Publication / Ad Text', type: 'text', default: 'City Daily', maxLength: 24 }
    ],
    presets: [
      {
        id: 'classic_newspaper_honor_box',
        label: 'Single Newspaper Vending Box',
        subcategory: 'Newspaper Boxes',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b588c',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#c84b3a',
        accentColor: '#e5a832',
        frameColor: '#22282d',
        params: { standStyle: 'single_honor_box', unitCount: 1, width: 0.5, height: 1.06, depth: 0.44, signText: 'B Chronicle' }
      },
      {
        id: 'quad_newspaper_box_row',
        label: 'Four-Box Newspaper Cluster',
        subcategory: 'Newspaper Boxes',
        locationContext: 'exterior',
        paletteFamily: 'commercial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#cf3a2e',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#2e6399',
        accentColor: '#2d7a58',
        frameColor: '#23282e',
        params: { standStyle: 'modular_box_cluster', unitCount: 4, width: 1.75, height: 1.08, depth: 0.44, pedestalBase: 'concrete_tray', signText: 'Metro News' }
      },
      {
        id: 'sidewalk_a_frame_sign',
        label: 'A-Frame Sandwich Board',
        subcategory: 'Sidewalk Signs',
        locationContext: 'both',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d5b34',
        frameColor: '#2c2520',
        params: { standStyle: 'a_frame_sandwich_board', width: 0.65, height: 1.05, depth: 0.4, signText: 'Fresh Coffee' }
      },
      {
        id: 'illuminated_city_ad_totem',
        label: 'Illuminated Advertising Totem',
        subcategory: 'Advertising Panels',
        locationContext: 'both',
        paletteFamily: 'modern_downtown',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2b3642',
        accentColor: '#4de2ff',
        params: { standStyle: 'illuminated_ad_totem', width: 1.05, height: 2.1, depth: 0.24, signText: 'City Expo' }
      },
      {
        id: 'wall_mounted_poster_case',
        label: 'Wall-Mounted Poster Frame',
        subcategory: 'Advertising Panels',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#36404a',
        frameColor: '#21272e',
        params: { standStyle: 'wall_poster_case', width: 0.9, height: 1.25, depth: 0.14, signText: 'Now Showing' }
      }
    ],
    buildGeometry: tvcBuildNewspaperBox
  });

  registerObjectFamily({
    id: 'cafe_storefront',
    categoryId: '09_commercial',
    subcategory: 'Cafe Seating',
    subcategories: ['Cafe Seating', 'Storefront Attachments', 'Vending & Heaters'],
    label: 'Cafe, Awning & Vending Prop',
    description: 'Outdoor bistro sets, patio umbrellas, storefront awnings, blade signs, and drink machines.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted', 'hanging'],
    locationContext: 'both',
    architecturalStyle: 'commercial',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    tags: ['cafe', 'storefront', 'awning', 'sign', 'vending', 'table', 'umbrella', 'restaurant'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Storefront Prop' },
      {
        key: 'propStyle',
        name: 'Prop Type',
        type: 'select',
        options: [
          ['bistro_table_set', 'Bistro Cafe Table & Chairs'],
          ['patio_umbrella_table', 'Umbrella Patio Table'],
          ['storefront_awning', 'Wall Storefront Awning'],
          ['projecting_blade_sign', 'Projecting Blade Sign'],
          ['beverage_vending_machine', 'Beverage Vending Machine'],
          ['outdoor_patio_heater', 'Outdoor Patio Heater'],
          ['window_flower_box', 'Wall Window Flower Box']
        ],
        default: 'bistro_table_set'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.65, max: 3.6, step: 0.05, unit: 'm', default: 1.4 },
      { key: 'height', name: 'Height', type: 'number', min: 0.45, max: 2.3, step: 0.05, unit: 'm', default: 1.15 },
      { key: 'depth', name: 'Depth / Projection', type: 'number', min: 0.35, max: 2.2, step: 0.05, unit: 'm', default: 1.1 },
      { group: 'Accessories' },
      { key: 'chairCount', name: 'Cafe Chairs', type: 'number', min: 0, max: 4, step: 1, default: 2 },
      { key: 'umbrellaOpen', name: 'Patio Umbrella Open', type: 'boolean', default: true },
      { key: 'awningSlope', name: 'Awning Slope', type: 'number', min: 0.2, max: 0.65, step: 0.05, default: 0.38 },
      { key: 'scallopValance', name: 'Scallop Valance', type: 'boolean', default: true },
      { key: 'illuminatedFace', name: 'Illuminated Sign / Front', type: 'boolean', default: true },
      { key: 'signText', name: 'Storefront Text', type: 'text', default: 'Bistro', maxLength: 24 }
    ],
    presets: [
      {
        id: 'paris_bistro_table_chairs',
        label: 'Outdoor Bistro Table & Chairs',
        subcategory: 'Cafe Seating',
        locationContext: 'exterior',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'wood',
        primaryColor: '#8d5b34',
        frameMaterial: 'cast_iron',
        frameColor: '#23282e',
        accentColor: '#b83d35',
        params: { propStyle: 'patio_umbrella_table', width: 1.5, height: 2.2, depth: 1.5, chairCount: 2, umbrellaOpen: true }
      },
      {
        id: 'striped_storefront_awning',
        label: 'Striped Storefront Awning',
        subcategory: 'Storefront Attachments',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'fabric',
        primaryColor: '#b83d35',
        accentColor: '#b83d35',
        frameColor: '#24292e',
        params: { propStyle: 'storefront_awning', width: 2.8, height: 0.7, depth: 1.15, awningSlope: 0.4, scallopValance: true, signText: 'Bakery' }
      },
      {
        id: 'illuminated_blade_shop_sign',
        label: 'Projecting Illuminated Shop Sign',
        subcategory: 'Storefront Attachments',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#26473a',
        accentColor: '#f5c342',
        frameColor: '#1e2228',
        params: { propStyle: 'projecting_blade_sign', width: 0.3, height: 1.1, depth: 0.9, illuminatedFace: true, signText: 'Books & Tea' }
      },
      {
        id: 'cold_drink_vending_machine',
        label: 'Beverage Vending Machine',
        subcategory: 'Vending & Heaters',
        locationContext: 'both',
        paletteFamily: 'commercial',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b589c',
        accentColor: '#4de2ff',
        frameColor: '#21262c',
        params: { propStyle: 'beverage_vending_machine', width: 1.05, height: 1.9, depth: 0.82, illuminatedFace: true, signText: 'Fizz Cola' }
      },
      {
        id: 'patio_mushroom_heater',
        label: 'Outdoor Patio Heater',
        subcategory: 'Vending & Heaters',
        locationContext: 'exterior',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#a2acb5',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#bcc5ce',
        params: { propStyle: 'outdoor_patio_heater', width: 0.85, height: 2.25, depth: 0.85 }
      }
    ],
    buildGeometry: tvcBuildCafeStorefront
  });
}
