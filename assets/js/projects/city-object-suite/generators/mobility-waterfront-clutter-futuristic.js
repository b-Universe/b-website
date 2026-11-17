import { clamp, rng32 } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane, objCreateGroundDecal } from '../geometry/primitives.js';

function mwcfBuildBikeRack(group, cfg, b, mats, meta) {
  const style = cfg.mobilityStyle || 'wave_ribbon_rack';
  const count = Math.max(1, Math.round(cfg.unitCount || 3));
  const len = clamp(cfg.length || 1.9, 0.8, 3.6);
  const h = clamp(cfg.height || 0.85, 0.7, 1.25);
  const d = clamp(cfg.depth || 0.65, 0.35, 1.2);
  const tubeR = clamp(cfg.tubeRadius || 0.028, 0.02, 0.05);
  const wr = clamp((cfg.wheelDiameter || 0.6) * 0.5, 0.11, 0.34);

  const drawSimpleBike = (bx, bz, yaw = 0) => {
    const r = Math.min(0.32, wr);
    const wb = r * 2.3;
    const fz = bz + Math.cos(yaw) * wb * 0.45;
    const rz = bz - Math.cos(yaw) * wb * 0.45;
    b.addPrismRing(bx, r, fz, r, r * 0.82, 0.045, 10, 'x', 'rubber', 'detail');
    b.addPrismRing(bx, r, rz, r, r * 0.82, 0.045, 10, 'x', 'rubber', 'detail');
    b.addPipeSegment(bx, r, rz, bx, r * 2.0, rz + 0.14, 0.02, 6, 'accent', 'detail');
    b.addPipeSegment(bx, r * 2.0, rz + 0.14, bx, r * 2.1, fz - 0.14, 0.02, 6, 'accent', 'detail');
    b.addPipeSegment(bx, r, fz, bx, r * 2.4, fz - 0.16, 0.02, 6, 'accent', 'detail');
    b.addBox(bx, r * 2.42, fz - 0.18, 0.42, 0.03, 0.03, { materialRole: 'frame', layer: 'detail' });
    b.addBox(bx, r * 2.12, rz + 0.12, 0.12, 0.04, 0.22, { materialRole: 'rubber', layer: 'detail' });
  };

  if (style === 'parked_city_bicycle') {
    drawSimpleBike(0, 0, 0);
    b.addPipeSegment(0, 0.22, 0, -0.18, 0, -0.04, 0.015, 6, 'frame', 'detail');
    meta.interaction = { interactable: true, actionType: 'ride_bicycle' };
    return;
  }

  if (style === 'electric_scooter_stand') {
    b.addBox(0, 0.03, 0, len, 0.06, d, { materialRole: 'frame', layer: 'body' });
    for (let i = 0; i < count; i++) {
      const sx = count === 1 ? 0 : -len * 0.38 + (i / (count - 1)) * (len * 0.76);
      b.addBox(sx, 0.45, -d * 0.28, 0.14, 0.85, 0.16, { materialRole: 'primary', layer: 'body' });
      b.addBox(sx, 0.12, 0.08, 0.18, 0.05, 0.65, { materialRole: 'accent', layer: 'detail' });
      b.addCylinder(sx, 0.56, 0.34, 0.02, 0.02, 0.88, 6, 'y', 'frame', 'detail');
      b.addBox(sx, 1.0, 0.34, 0.34, 0.035, 0.035, { materialRole: 'rubber', layer: 'detail' });
    }
    return;
  }

  if (style === 'bike_share_dock_row') {
    b.addBox(0, 0.035, 0, len, 0.07, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(-len * 0.44, 0.92, -d * 0.18, 0.32, 1.75, 0.24, { materialRole: 'primary', layer: 'body' });
    objCreateSignPlane(group, 'Bike Share', 0.26, 0.38, '#2b588c', '#ffffff', {
      x: -len * 0.44,
      y: 1.38,
      z: -d * 0.18 + 0.125,
      lit: true
    });
    for (let i = 0; i < count; i++) {
      const dx = -len * 0.18 + (i / Math.max(1, count - 1)) * (len * 0.6);
      b.addBox(dx, 0.38, -d * 0.15, 0.12, 0.68, 0.22, { materialRole: 'secondary', layer: 'body' });
      if (cfg.includeDockedBikes && i % 2 === 0) {
        drawSimpleBike(dx, 0.16, 0);
      }
    }
    meta.interaction = { interactable: true, actionType: 'rent_city_bike' };
    return;
  }

  if (style === 'shopping_trolley_bay') {
    b.addCylinder(-len * 0.46, h * 0.5, -d * 0.42, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(len * 0.46, h * 0.5, -d * 0.42, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(-len * 0.46, h * 0.5, d * 0.42, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(len * 0.46, h * 0.5, d * 0.42, 0.03, 0.03, h, 8, 'y', 'secondary', 'body');
    b.addCylinder(0, h * 0.85, -d * 0.42, 0.025, 0.025, len * 0.92, 8, 'x', 'primary', 'body');
    b.addCylinder(0, h * 0.85, d * 0.42, 0.025, 0.025, len * 0.92, 8, 'x', 'primary', 'body');
    return;
  }

  // Wave ribbon or U-loop staple bike rack
  b.addBox(0, 0.015, 0, len + 0.12, 0.03, d, { materialRole: 'frame', layer: 'body' });
  const loops = count;
  if (style === 'u_loop_staple_rack') {
    for (let i = 0; i < loops; i++) {
      const lx = loops === 1 ? 0 : -len * 0.42 + (i / (loops - 1)) * (len * 0.84);
      b.addPipeSegment(lx, 0.03, -d * 0.36, lx, h, -d * 0.36, tubeR, 8, 'primary', 'body');
      b.addPipeSegment(lx, 0.03, d * 0.36, lx, h, d * 0.36, tubeR, 8, 'primary', 'body');
      b.addPipeSegment(lx, h, -d * 0.36, lx, h, d * 0.36, tubeR, 8, 'primary', 'body');
      if (cfg.includeDockedBikes && i === 0) drawSimpleBike(lx + 0.12, 0, 0);
    }
  } else {
    const stepX = len / loops;
    for (let i = 0; i < loops; i++) {
      const x0 = -len * 0.5 + i * stepX;
      const xMid = x0 + stepX * 0.5;
      const x1 = x0 + stepX;
      b.addPipeSegment(x0, 0.03, 0, x0 + stepX * 0.18, h, 0, tubeR, 8, 'primary', 'body');
      b.addPipeSegment(x0 + stepX * 0.18, h, 0, xMid + stepX * 0.32, h, 0, tubeR, 8, 'primary', 'body');
      b.addPipeSegment(xMid + stepX * 0.32, h, 0, x1, 0.03, 0, tubeR, 8, 'primary', 'body');
      if (cfg.includeDockedBikes && i === 1) drawSimpleBike(xMid, 0.15, 0);
    }
  }
}

function mwcfBuildWaterfrontDrainage(group, cfg, b, mats, meta) {
  const style = cfg.waterStyle || 'sewer_manhole_cover';
  const w = clamp(cfg.width || 0.8, 0.55, 2.4);
  const h = clamp(cfg.height || 0.05, 0.04, 1.8);
  const d = clamp(cfg.depth || 0.8, 0.45, 1.2);
  const slots = Math.max(4, Math.round(cfg.slotCount || 7));

  if (style === 'sewer_manhole_cover') {
    const r = Math.min(w, d) * 0.48;
    b.addPrismRing(0, 0.015, 0, r * 1.08, r * 0.92, 0.03, 14, 'y', 'frame', 'body');
    b.addCylinder(0, 0.018, 0, r * 0.94, r * 0.94, 0.028, 14, 'y', 'primary', 'body');
    b.addPrismRing(0, 0.032, 0, r * 0.62, r * 0.54, 0.012, 12, 'y', 'secondary', 'detail');
    return;
  }

  if (style === 'curb_storm_drain_grate') {
    b.addBox(0, 0.015, 0, w, 0.03, d, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, 0.01, 0, w * 0.86, 0.018, d * 0.82, { materialRole: 'darkMetal', layer: 'detail' });
    b.addSlattedArray(0, 0.026, 0, w * 0.78, slots, 0.035, 0.02, d * 0.78, 'x', 'primary', 'detail');
    return;
  }

  if (style === 'cast_mooring_bollard') {
    const bh = Math.max(0.48, h);
    b.addBox(0, 0.04, 0, 0.52, 0.08, 0.52, { materialRole: 'frame', layer: 'body' });
    b.addCylinder(0, bh * 0.48, 0, 0.14, 0.17, bh * 0.76, 10, 'y', 'frame', 'body');
    b.addCylinder(0, bh * 0.9, 0, 0.21, 0.14, bh * 0.18, 10, 'y', 'frame', 'body');
    if (cfg.ropeCoils) {
      b.addPrismRing(0, bh * 0.46, 0, 0.22, 0.15, 0.12, 10, 'y', 'wood', 'detail');
    }
    return;
  }

  if (style === 'lifebuoy_cabinet_post') {
    const ph = Math.max(1.2, h);
    b.addBox(0, ph * 0.5, 0, 0.1, ph, 0.1, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, ph * 0.68, 0.08, 0.72, 0.76, 0.14, { materialRole: 'primary', layer: 'body' });
    if (cfg.ringBuoyIncluded) {
      b.addPrismRing(0, ph * 0.68, 0.17, 0.28, 0.15, 0.08, 12, 'z', 'safetyRed', 'detail');
    }
    return;
  }

  // Canal safety railing
  const rh = Math.max(0.95, h);
  b.addBox(-w * 0.46, rh * 0.5, 0, 0.07, rh, 0.07, { materialRole: 'frame', layer: 'body' });
  b.addBox(w * 0.46, rh * 0.5, 0, 0.07, rh, 0.07, { materialRole: 'frame', layer: 'body' });
  b.addCylinder(0, rh, 0, 0.04, 0.04, w, 8, 'x', 'primary', 'body');
  b.addCylinder(0, rh * 0.55, 0, 0.025, 0.025, w * 0.92, 8, 'x', 'secondary', 'body');
}

function mwcfBuildUrbanClutter(group, cfg, b, mats, meta) {
  const style = cfg.clutterStyle || 'garbage_bag_pile';
  const sw = clamp(cfg.spreadWidth || 1.35, 0.6, 2.6);
  const sd = clamp(cfg.spreadDepth || 1.15, 0.6, 2.6);
  const h = clamp(cfg.height || 0.55, 0.02, 1.2);
  const count = Math.max(2, Math.round(cfg.itemCount || 5));
  const mess = clamp(cfg.messiness ?? 0.5, 0.1, 1.0);
  const r = rng32((cfg.seed || 1024) + 19);

  if (style === 'puddle_oil_decal' || style === 'pavement_crack_patch') {
    objCreateGroundDecal(group, style, sw, sd, cfg.frameColor || '#262b30', cfg.accentColor || '#465e73', cfg.seed || 101, cfg.decalOpacity || 0.85, {
      y: 0.008
    });
    return;
  }

  if (style === 'wall_graffiti_poster_decal') {
    objCreateGroundDecal(group, 'wall_graffiti', sw, Math.max(0.8, h), cfg.primaryColor || '#b83d35', cfg.accentColor || '#f5c342', cfg.seed || 101, cfg.decalOpacity || 0.9, {
      x: 0,
      y: 0,
      z: 0.012,
      rotX: Math.PI * 0.5
    });
    return;
  }

  if (style === 'flattened_cardboard_stack') {
    for (let i = 0; i < count; i++) {
      const oy = 0.03 + i * 0.065;
      b.addBox((r() - 0.5) * 0.18 * mess, oy, (r() - 0.5) * 0.18 * mess, sw * (0.7 + r() * 0.25), 0.055, sd * (0.65 + r() * 0.25), {
        materialRole: 'wood',
        layer: 'body',
        rotY: (r() - 0.5) * mess * 0.8
      });
    }
    return;
  }

  if (style === 'traffic_cone_tangle') {
    for (let i = 0; i < count; i++) {
      const cx = (r() - 0.5) * sw * 0.7;
      const cz = (r() - 0.5) * sd * 0.7;
      const tipped = i % 2 === 1 && mess > 0.3;
      if (tipped) {
        b.addCylinder(cx, 0.14, cz, 0.04, 0.14, 0.62, 8, 'x', 'accent', 'body', r() * Math.PI);
      } else {
        b.addBox(cx, 0.02, cz, 0.34, 0.04, 0.34, { materialRole: 'rubber', layer: 'body' });
        b.addCylinder(cx, 0.34, cz, 0.04, 0.14, 0.62, 8, 'y', 'accent', 'body');
      }
    }
    return;
  }

  if (style === 'abandoned_mattress_prop') {
    b.addChamferBox(0, 0.12, 0, sw, 0.22, sd, 0.04, { materialRole: 'secondary', layer: 'body', rotY: (r() - 0.5) * 0.4 });
    b.addBox(0.1, 0.24, 0.05, sw * 0.4, 0.02, sd * 0.35, { materialRole: 'concrete', layer: 'detail' });
    return;
  }

  // Garbage bag pile
  for (let i = 0; i < count; i++) {
    const bx = (r() - 0.5) * sw * 0.65 * mess;
    const bz = (r() - 0.5) * sd * 0.65 * mess;
    const bagR = 0.18 + r() * 0.14;
    const bagH = clamp(h * (0.55 + r() * 0.45), 0.28, 0.62);
    const tierY = i >= count - 2 && count >= 4 ? bagH * 0.82 : bagH * 0.45;
    b.addCylinder(bx, tierY, bz, bagR * 0.65, bagR, bagH, 7, 'y', i % 3 === 0 ? 'frame' : 'rubber', 'body');
    b.addCylinder(bx, tierY + bagH * 0.52, bz, 0.05, 0.03, 0.08, 6, 'y', 'frame', 'detail');
  }
}

function mwcfBuildFuturisticProp(group, cfg, b, mats, meta) {
  const style = cfg.techStyle || 'holo_info_pedestal';
  const w = clamp(cfg.width || 0.95, 0.55, 2.4);
  const h = clamp(cfg.height || 1.45, 0.35, 2.8);
  const d = clamp(cfg.depth || 0.95, 0.55, 2.4);
  const fins = Math.max(2, Math.round(cfg.emitterFins || 4));

  if (style === 'drone_landing_pad') {
    const padR = Math.min(w, d) * 0.48;
    b.addCylinder(0, 0.06, 0, padR * 0.94, padR, 0.12, 8, 'y', 'frame', 'body');
    b.addPrismRing(0, 0.13, 0, padR * 0.78, padR * 0.68, 0.025, 8, 'y', 'holoEnergy', 'detail');
    b.addBox(0, 0.13, 0, padR * 0.55, 0.02, 0.08, { materialRole: 'holoEnergy', layer: 'detail' });
    b.addBox(0, 0.13, 0, 0.08, 0.02, padR * 0.55, { materialRole: 'holoEnergy', layer: 'detail' });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      b.addCylinder(Math.cos(a) * padR * 0.9, 0.15, Math.sin(a) * padR * 0.9, 0.06, 0.08, 0.1, 6, 'y', 'accent', 'detail');
    }
    meta.lightSources.push({ id: 'drone_pad_ring', position: [0, 0.16, 0], color: cfg.emissiveColor || '#4de2ff', radius: 3.5 });
    meta.interaction = { interactable: true, actionType: 'call_delivery_drone' };
    return;
  }

  if (style === 'energy_barrier_emitter') {
    b.addCylinder(0, 0.08, 0, w * 0.44, w * 0.5, 0.16, 8, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.48, 0, w * 0.26, w * 0.34, h * 0.76, 8, 'y', 'primary', 'body');
    b.addCylinder(0, h * 0.65, 0, w * 0.18, w * 0.18, h * 0.4, 8, 'y', 'holoEnergy', 'detail');
    for (let i = 0; i < fins; i++) {
      const a = (i / fins) * Math.PI * 2;
      b.addBox(Math.cos(a) * w * 0.3, h * 0.52, Math.sin(a) * w * 0.3, 0.05, h * 0.78, 0.14, {
        materialRole: 'secondary',
        layer: 'detail',
        rotY: -a
      });
    }
    meta.lightSources.push({ id: 'emitter_core', position: [0, h * 0.65, 0], color: cfg.emissiveColor || '#4de2ff', radius: 4.5 });
    return;
  }

  // Holographic info pedestal / robotic dock / power core cabinet
  b.addCylinder(0, 0.06, 0, w * 0.46, w * 0.5, 0.12, 8, 'y', 'frame', 'body');
  b.addChamferBox(0, h * 0.46 + 0.08, 0, w * 0.72, h * 0.86, d * 0.72, 0.04, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, h * 0.56 + 0.08, d * 0.36 + 0.01, w * 0.46, h * 0.42, 0.025, { materialRole: 'holoEnergy', layer: 'detail' });

  if (cfg.holoProjectorRing && style === 'holo_info_pedestal') {
    const holoH = clamp(cfg.holoHeight || 0.75, 0.4, 1.4);
    b.addPrismRing(0, h + 0.06, 0, w * 0.32, w * 0.22, 0.06, 10, 'y', 'secondary', 'detail');
    b.addBox(0, h + 0.12 + holoH * 0.5, 0, w * 0.48, holoH * 0.7, 0.04, { materialRole: 'holoEnergy', layer: 'detail' });
    objCreateSignPlane(group, cfg.signText || 'Metro Grid', w * 0.44, holoH * 0.42, '#0d2e3d', cfg.emissiveColor || '#4de2ff', {
      x: 0,
      y: h + 0.12 + holoH * 0.5,
      z: 0.028,
      lit: true
    });
  }
  meta.lightSources.push({ id: 'tech_terminal_glow', position: [0, h * 0.85, d * 0.25], color: cfg.emissiveColor || '#4de2ff', radius: 3.5 });
  meta.interaction = { interactable: true, actionType: 'access_city_terminal' };
}

export function registerMobilityWaterfrontClutterAndFuturisticFamilies() {
  registerObjectFamily({
    id: 'bike_rack',
    categoryId: '17_mobility',
    subcategory: 'Bike Racks',
    subcategories: ['Bike Racks', 'Bike Share Docks', 'Personal Mobility'],
    label: 'Bike Rack & Mobility Dock',
    description: 'Wave and U-loop bike racks, bike-share docking stations, city bicycles, and scooter stands.',
    attachmentProfile: 'ground_standing',
    locationContext: 'exterior',
    architecturalStyle: 'modern_downtown',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['bike', 'bicycle', 'rack', 'mobility', 'scooter', 'dock', 'trolley'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Mobility Rack' },
      {
        key: 'mobilityStyle',
        name: 'Mobility Type',
        type: 'select',
        options: [
          ['wave_ribbon_rack', 'Wave Ribbon Bike Rack'],
          ['u_loop_staple_rack', 'U-Loop Staple Bike Rack'],
          ['bike_share_dock_row', 'Bike-Share Dock Station'],
          ['parked_city_bicycle', 'Standard City Bicycle'],
          ['electric_scooter_stand', 'Electric Scooter Dock'],
          ['shopping_trolley_bay', 'Shopping Trolley Corral']
        ],
        default: 'wave_ribbon_rack'
      },
      { key: 'unitCount', name: 'Loops / Docks', type: 'number', min: 1, max: 6, step: 1, default: 3 },
      { key: 'length', name: 'Length', type: 'number', min: 0.8, max: 3.6, step: 0.1, unit: 'm', default: 1.9 },
      { key: 'height', name: 'Height', type: 'number', min: 0.7, max: 1.25, step: 0.05, unit: 'm', default: 0.85 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.35, max: 1.2, step: 0.05, unit: 'm', default: 0.65 },
      { key: 'tubeRadius', name: 'Pipe Tube Radius', type: 'number', min: 0.02, max: 0.05, step: 0.004, unit: 'm', default: 0.028 },
      { key: 'includeDockedBikes', name: 'Include Docked Bicycle', type: 'boolean', default: false },
      { key: 'wheelDiameter', name: 'Wheel Diameter', type: 'number', min: 0.22, max: 0.68, step: 0.04, unit: 'm', default: 0.6 }
    ],
    presets: [
      {
        id: 'serpentine_wave_bike_rack',
        label: 'Wave Ribbon Bike Rack',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c3844',
        frameColor: '#20262c',
        params: { mobilityStyle: 'wave_ribbon_rack', unitCount: 3, length: 1.9, height: 0.85, depth: 0.65, includeDockedBikes: true }
      },
      {
        id: 'stainless_u_loop_rack',
        label: 'U-Loop Sidewalk Bike Rack',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'brushed_metal',
        primaryColor: '#b5bfc9',
        frameColor: '#36404a',
        params: { mobilityStyle: 'u_loop_staple_rack', unitCount: 3, length: 2.1, height: 0.85, depth: 0.65, includeDockedBikes: false }
      },
      {
        id: 'city_bike_share_dock_station',
        label: 'City Bike-Share Station',
        subcategory: 'Bike Share Docks',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2b588c',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#aeb7c0',
        frameColor: '#242b33',
        params: { mobilityStyle: 'bike_share_dock_row', unitCount: 4, length: 3.1, height: 1.0, depth: 0.85, includeDockedBikes: true }
      },
      {
        id: 'commuter_city_bicycle',
        label: 'Commuter City Bicycle',
        subcategory: 'Personal Mobility',
        locationContext: 'both',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#3b6d96',
        accentColor: '#c94c38',
        params: { mobilityStyle: 'parked_city_bicycle', wheelDiameter: 0.62 }
      },
      {
        id: 'electric_scooter_charging_rack',
        label: 'Electric Scooter Charging Dock',
        subcategory: 'Bike Share Docks',
        locationContext: 'exterior',
        paletteFamily: 'clean_futuristic',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#25384b',
        accentColor: '#3ee6ff',
        params: { mobilityStyle: 'electric_scooter_stand', unitCount: 3, length: 1.8, depth: 0.85 }
      }
    ],
    buildGeometry: mwcfBuildBikeRack
  });

  registerObjectFamily({
    id: 'waterfront_drainage',
    categoryId: '18_waterfront',
    subcategory: 'Manholes & Drains',
    subcategories: ['Manholes & Drains', 'Dock Moorings', 'Waterfront Safety'],
    label: 'Drainage, Manhole & Dock Prop',
    description: 'Sewer manhole covers, street storm drain grates, mooring bollards, and lifebuoy stations.',
    attachmentProfile: 'ground_embedded',
    supportedAttachments: ['ground_embedded', 'ground_standing'],
    locationContext: 'exterior',
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    tags: ['waterfront', 'drain', 'manhole', 'sewer', 'dock', 'mooring', 'lifebuoy', 'canal'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Drainage & Waterfront' },
      {
        key: 'waterStyle',
        name: 'Object Type',
        type: 'select',
        options: [
          ['sewer_manhole_cover', 'Sewer Manhole Cover'],
          ['curb_storm_drain_grate', 'Street Storm Drain Grate'],
          ['cast_mooring_bollard', 'Dock Mooring Bollard'],
          ['lifebuoy_cabinet_post', 'Lifebuoy Safety Station'],
          ['canal_safety_railing', 'Canal Promenade Railing']
        ],
        default: 'sewer_manhole_cover'
      },
      { key: 'width', name: 'Width / Diameter', type: 'number', min: 0.55, max: 2.4, step: 0.05, unit: 'm', default: 0.8 },
      { key: 'height', name: 'Height', type: 'number', min: 0.04, max: 1.8, step: 0.04, unit: 'm', default: 0.05 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.45, max: 1.2, step: 0.05, unit: 'm', default: 0.8 },
      { key: 'slotCount', name: 'Grate Slots', type: 'number', min: 4, max: 12, step: 1, default: 7 },
      { key: 'ropeCoils', name: 'Mooring Rope Coils', type: 'boolean', default: true },
      { key: 'ringBuoyIncluded', name: 'Include Life Ring', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'cast_iron_sewer_manhole',
        label: 'Cast Iron Sewer Manhole',
        attachmentProfile: 'ground_embedded',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'cast_iron',
        primaryColor: '#363b40',
        secondaryMaterial: 'cast_iron',
        secondaryColor: '#484e54',
        frameColor: '#25292e',
        params: { waterStyle: 'sewer_manhole_cover', width: 0.82, height: 0.05, depth: 0.82 }
      },
      {
        id: 'street_storm_drain_grate',
        label: 'Street Storm Drain Grate',
        attachmentProfile: 'ground_embedded',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'cast_iron',
        primaryColor: '#31363b',
        frameColor: '#22262b',
        params: { waterStyle: 'curb_storm_drain_grate', width: 0.95, height: 0.05, depth: 0.58, slotCount: 8 }
      },
      {
        id: 'harbor_mooring_bollard',
        label: 'Dock Mooring Bollard',
        subcategory: 'Dock Moorings',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'cast_iron',
        primaryColor: '#262b30',
        frameColor: '#21252a',
        woodColor: '#a68b5b',
        params: { waterStyle: 'cast_mooring_bollard', width: 0.55, height: 0.65, depth: 0.55, ropeCoils: true }
      },
      {
        id: 'waterfront_lifebuoy_station',
        label: 'Waterfront Lifebuoy Station',
        subcategory: 'Waterfront Safety',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e8b228',
        frameColor: '#23282e',
        params: { waterStyle: 'lifebuoy_cabinet_post', width: 0.78, height: 1.5, depth: 0.35, ringBuoyIncluded: true }
      },
      {
        id: 'canal_promenade_railing',
        label: 'Canal Safety Railing',
        subcategory: 'Waterfront Safety',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2c3844',
        frameColor: '#20262c',
        params: { waterStyle: 'canal_safety_railing', width: 2.0, height: 1.05, depth: 0.2 }
      }
    ],
    buildGeometry: mwcfBuildWaterfrontDrainage
  });

  registerObjectFamily({
    id: 'urban_clutter',
    categoryId: '19_clutter',
    subcategory: 'Loose Trash & Piles',
    subcategories: ['Loose Trash & Piles', 'Abandoned Props', 'Surface Decals'],
    label: 'Urban Clutter & Weathering Decal',
    description: 'Garbage bag piles, flattened cardboard, traffic cone piles, oil puddles, and wall graffiti.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_decal', 'wall_mounted'],
    locationContext: 'both',
    architecturalStyle: 'neglected_abandoned',
    sizeClass: 'small',
    functionalRole: 'clutter',
    tags: ['clutter', 'garbage', 'trash', 'bags', 'cardboard', 'decal', 'puddle', 'graffiti', 'alley'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Clutter & Decal Type' },
      {
        key: 'clutterStyle',
        name: 'Clutter / Decal Style',
        type: 'select',
        options: [
          ['garbage_bag_pile', 'Garbage Bag Pile'],
          ['flattened_cardboard_stack', 'Cardboard Recycling Bundle'],
          ['traffic_cone_tangle', 'Traffic Cone Pile'],
          ['abandoned_mattress_prop', 'Discarded Old Mattress'],
          ['puddle_oil_decal', 'Oil Stain & Puddle Decal'],
          ['pavement_crack_patch', 'Pavement Cracks Decal'],
          ['wall_graffiti_poster_decal', 'Wall Graffiti & Torn Posters']
        ],
        default: 'garbage_bag_pile'
      },
      { key: 'spreadWidth', name: 'Spread Width', type: 'number', min: 0.6, max: 2.6, step: 0.1, unit: 'm', default: 1.35 },
      { key: 'spreadDepth', name: 'Spread Depth', type: 'number', min: 0.6, max: 2.6, step: 0.1, unit: 'm', default: 1.15 },
      { key: 'height', name: 'Pile / Decal Height', type: 'number', min: 0.02, max: 1.2, step: 0.04, unit: 'm', default: 0.55 },
      { key: 'itemCount', name: 'Item Count', type: 'number', min: 2, max: 9, step: 1, default: 5 },
      { key: 'messiness', name: 'Scatter Messiness', type: 'number', min: 0.1, max: 1.0, step: 0.05, default: 0.55 },
      { key: 'decalOpacity', name: 'Decal Opacity', type: 'number', min: 0.4, max: 1.0, step: 0.05, default: 0.85 }
    ],
    presets: [
      {
        id: 'curbside_garbage_bag_pile',
        label: 'Curbside Garbage Bag Pile',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'neglected_abandoned',
        condition: 'weathered',
        frameColor: '#1f2328',
        params: { clutterStyle: 'garbage_bag_pile', spreadWidth: 1.35, spreadDepth: 1.15, height: 0.55, itemCount: 5, messiness: 0.6 }
      },
      {
        id: 'flattened_cardboard_bundle',
        label: 'Cardboard Recycling Bundle',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        woodColor: '#9e784b',
        params: { clutterStyle: 'flattened_cardboard_stack', spreadWidth: 1.0, spreadDepth: 0.85, itemCount: 6, messiness: 0.35 }
      },
      {
        id: 'oil_stain_puddle_decal',
        label: 'Oil Stain & Puddle Decal',
        subcategory: 'Surface Decals',
        locationContext: 'both',
        attachmentProfile: 'surface_decal',
        paletteFamily: 'neglected_abandoned',
        condition: 'clean',
        frameColor: '#1e2328',
        accentColor: '#3f5a70',
        params: { clutterStyle: 'puddle_oil_decal', spreadWidth: 1.6, spreadDepth: 1.3, height: 0.02, decalOpacity: 0.85 }
      },
      {
        id: 'asphalt_crack_patch_decal',
        label: 'Pavement Cracks Decal',
        subcategory: 'Surface Decals',
        locationContext: 'exterior',
        attachmentProfile: 'surface_decal',
        paletteFamily: 'neglected_abandoned',
        condition: 'clean',
        frameColor: '#25282c',
        params: { clutterStyle: 'pavement_crack_patch', spreadWidth: 1.8, spreadDepth: 1.5, height: 0.02, decalOpacity: 0.8 }
      },
      {
        id: 'alley_graffiti_posters_wall',
        label: 'Wall Graffiti & Torn Posters',
        subcategory: 'Surface Decals',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'commercial',
        condition: 'weathered',
        primaryColor: '#b83d35',
        accentColor: '#f5c342',
        params: { clutterStyle: 'wall_graffiti_poster_decal', spreadWidth: 1.9, height: 1.15, decalOpacity: 0.9 }
      }
    ],
    buildGeometry: mwcfBuildUrbanClutter
  });

  registerObjectFamily({
    id: 'futuristic_prop',
    categoryId: '20_futuristic',
    subcategory: 'Holo Terminals',
    subcategories: ['Holo Terminals', 'Autonomous Docks', 'Security & Power'],
    label: 'Superhero Tech & Holo Prop',
    description: 'Restrained futuristic info pedestals, drone landing pads, bot docks, and energy emitters.',
    attachmentProfile: 'ground_standing',
    locationContext: 'both',
    architecturalStyle: 'clean_futuristic',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['futuristic', 'superhero', 'holo', 'drone', 'robot', 'tech', 'scanner', 'energy'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Futuristic Tech' },
      {
        key: 'techStyle',
        name: 'Tech Archetype',
        type: 'select',
        options: [
          ['holo_info_pedestal', 'Holographic Info Pedestal'],
          ['drone_landing_pad', 'Compact Drone Landing Pad'],
          ['robotic_charging_alcove', 'Robotic Charging Dock'],
          ['energy_barrier_emitter', 'Energy Barrier Emitter'],
          ['security_biometric_scanner', 'Security Scanner Terminal'],
          ['power_core_cabinet', 'Power Distribution Core']
        ],
        default: 'holo_info_pedestal'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.55, max: 2.4, step: 0.05, unit: 'm', default: 0.95 },
      { key: 'height', name: 'Height', type: 'number', min: 0.35, max: 2.8, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.55, max: 2.4, step: 0.05, unit: 'm', default: 0.95 },
      { group: 'Hologram & Core' },
      { key: 'holoProjectorRing', name: 'Hologram Projection', type: 'boolean', default: true },
      { key: 'holoHeight', name: 'Hologram Height', type: 'number', min: 0.4, max: 1.4, step: 0.05, unit: 'm', default: 0.75 },
      { key: 'energyCoreGlow', name: 'Core Glow Intensity', type: 'number', min: 0.2, max: 1.2, step: 0.1, default: 0.8 },
      { key: 'emitterFins', name: 'Cooling / Emitter Fins', type: 'number', min: 2, max: 6, step: 1, default: 4 },
      { key: 'signText', name: 'Terminal Label', type: 'text', default: 'Paragon Grid', maxLength: 24 }
    ],
    presets: [
      {
        id: 'holographic_info_pedestal',
        label: 'Holographic Info Pedestal',
        subcategory: 'Holo Terminals',
        locationContext: 'both',
        paletteFamily: 'clean_futuristic',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#2d445c',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#cfd9e3',
        emissiveColor: '#3ee6ff',
        params: { techStyle: 'holo_info_pedestal', width: 0.85, height: 1.35, depth: 0.85, holoProjectorRing: true, holoHeight: 0.75, signText: 'City Info' }
      },
      {
        id: 'autonomous_drone_landing_pad',
        label: 'Compact Drone Landing Pad',
        subcategory: 'Autonomous Docks',
        locationContext: 'exterior',
        paletteFamily: 'clean_futuristic',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#25384b',
        accentColor: '#3ee6ff',
        emissiveColor: '#3ee6ff',
        params: { techStyle: 'drone_landing_pad', width: 1.85, height: 0.24, depth: 1.85 }
      },
      {
        id: 'service_bot_charging_dock',
        label: 'Robotic Charging Dock',
        subcategory: 'Autonomous Docks',
        locationContext: 'both',
        paletteFamily: 'clean_futuristic',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd9e3',
        frameColor: '#222d38',
        emissiveColor: '#5cffb8',
        params: { techStyle: 'robotic_charging_alcove', width: 1.05, height: 1.45, depth: 0.85, holoProjectorRing: false }
      },
      {
        id: 'energy_shield_barrier_pylon',
        label: 'Energy Barrier Emitter Pylon',
        subcategory: 'Security & Power',
        locationContext: 'both',
        paletteFamily: 'retro_futuristic',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3e7c82',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#b8c4c8',
        emissiveColor: '#4ef0e0',
        params: { techStyle: 'energy_barrier_emitter', width: 0.65, height: 1.75, depth: 0.65, emitterFins: 4 }
      },
      {
        id: 'power_distribution_core_unit',
        label: 'Advanced Power Distribution Unit',
        subcategory: 'Security & Power',
        locationContext: 'both',
        paletteFamily: 'clean_futuristic',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#3b5b78',
        frameColor: '#1a222c',
        emissiveColor: '#75aaff',
        params: { techStyle: 'power_core_cabinet', width: 1.35, height: 1.65, depth: 0.95, holoProjectorRing: false }
      }
    ],
    buildGeometry: mwcfBuildFuturisticProp
  });
}
