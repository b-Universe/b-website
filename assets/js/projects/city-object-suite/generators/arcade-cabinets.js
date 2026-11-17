import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { getObjectArcadeSideArtMaterial } from '../materials/materials.js';
import { objCreateSignPlane } from '../geometry/primitives.js';
import {
  ARCADE_SCREEN_CHOICES,
  ARCADE_CONTROL_LAYOUTS,
  arcAddCoinDoor,
  arcAddControlPanel,
  arcAddCRTMonitorAssembly,
  arcAddMarqueeBox
} from './arcade-controls.js';

export const CABINET_PROFILE_CHOICES = [
  ['classic_angled', 'Classic 1980s Angled Upright'],
  ['straight_upright', 'Straight Vertical Upright'],
  ['deep_crt', 'Deep Crt Classic'],
  ['slim_modern', 'Modern Slim Lcd'],
  ['rounded_front', 'Japanese Candy / Rounded'],
  ['wide_showcase', '1990s Oversized Showcase'],
  ['slanted_wedge', 'Slanted Wedge Upright'],
  ['compact_countertop', 'Countertop / Bartop'],
  ['deluxe_pedestal', 'Deluxe Pedestal Arcade'],
  ['cocktail_table', 'Head-To-Head Cocktail Table'],
  ['back_to_back', 'Back-To-Back Twin Upright']
];

function cabBuildSidePanels(group, batcher, profile, w, h, d, cfg) {
  const halfW = w * 0.5;
  const sideThick = 0.028;
  const showSideArt = cfg.includeSideArt !== false;

  if (profile === 'cocktail_table') {
    const tableH = Math.min(0.84, h * 0.45);
    batcher.addBox(0, tableH * 0.5 + 0.14, 0, w, tableH - 0.14, d, { materialRole: 'wood', layer: 'body' });
    batcher.addBox(0, tableH + 0.015, 0, w + 0.06, 0.03, d + 0.06, { materialRole: 'frame', layer: 'body' });
    for (const [lx, lz] of [[-halfW * 0.78, -d * 0.36], [halfW * 0.78, -d * 0.36], [-halfW * 0.78, d * 0.36], [halfW * 0.78, d * 0.36]]) {
      batcher.addCylinder(lx, 0.09, lz, 0.022, 0.018, 0.18, 8, 'y', 'chrome', 'body');
    }
    return { surfaceY: tableH, deckY: tableH * 0.76, screenY: tableH + 0.025, hasMarquee: false };
  }

  if (profile === 'compact_countertop') {
    const btH = Math.min(0.68, h * 0.55);
    batcher.addBox(0, btH * 0.45, -d * 0.24, w, btH * 0.9, d * 0.44, { materialRole: 'primary', layer: 'body' });
    batcher.addTrapezoidBox(-halfW + sideThick * 0.5, btH * 0.5, 0, sideThick, d, sideThick, d * 0.72, btH, { materialRole: 'primary', layer: 'body' });
    batcher.addTrapezoidBox(halfW - sideThick * 0.5, btH * 0.5, 0, sideThick, d, sideThick, d * 0.72, btH, { materialRole: 'primary', layer: 'body' });
    return { deckY: 0.14, screenY: btH * 0.54, marqueeY: btH * 0.88, hasMarquee: true, screenZ: d * 0.08, screenTiltDeg: -16 };
  }

  if (profile === 'deluxe_pedestal') {
    const pedH = Math.min(1.02, h * 0.56);
    batcher.addTrapezoidBox(0, pedH * 0.5, 0.12, w * 0.65, d * 0.52, w * 0.96, d * 0.68, pedH, { materialRole: 'primary', layer: 'body' });
    batcher.addBox(0, h * 0.48, -d * 0.36, w * 0.22, h * 0.96, 0.14, { materialRole: 'frame', layer: 'body' });
    batcher.addBox(0, h * 0.74, -d * 0.26, w * 1.12, h * 0.42, 0.1, { materialRole: 'secondary', layer: 'body' });
    return { deckY: pedH, screenY: h * 0.74, marqueeY: h * 0.98, hasMarquee: true, screenZ: -d * 0.16, screenTiltDeg: -4 };
  }

  if (profile === 'slim_modern') {
    const slimD = d * 0.54;
    const deckY = h * 0.48;
    batcher.addChamferBox(0, h * 0.48, -slimD * 0.14, w * 0.68, h * 0.94, slimD * 0.58, 0.025, { materialRole: 'primary', layer: 'body' });
    batcher.addChamferBox(0, h * 0.72, slimD * 0.04, w + 0.04, h * 0.42, 0.07, 0.015, { materialRole: 'frame', layer: 'body' });
    for (const sx of [-halfW - 0.01, halfW + 0.01]) {
      batcher.addBox(sx, h * 0.52, slimD * 0.02, 0.024, h * 0.88, 0.045, { materialRole: 'accent', layer: 'detail' });
    }
    return {
      deckY,
      screenY: h * 0.72,
      marqueeY: h * 0.96,
      hasMarquee: true,
      bodyD: slimD,
      topD: slimD * 0.58,
      screenZ: slimD * 0.04 + 0.075,
      screenTiltDeg: -4
    };
  }

  // Standard & specialty upright cabinet side profile silhouettes
  const isCandy = profile === 'rounded_front';
  const isStraight = profile === 'straight_upright';
  const isDeep = profile === 'deep_crt';
  const isWedge = profile === 'slanted_wedge';
  const isWide = profile === 'wide_showcase';

  const lowerH = isCandy ? h * 0.36 : isWedge ? h * 0.4 : h * 0.46;
  const deckY = lowerH + 0.02;
  const upperH = h - lowerH;
  const bodyD = isDeep ? d * 1.18 : isStraight ? d * 0.92 : d;
  const topD = isWedge
    ? bodyD * 0.46
    : isStraight
      ? bodyD * 0.94
      : isCandy
        ? bodyD * 0.76
        : isDeep
          ? bodyD * 0.82
          : bodyD * 0.66;

  batcher.addBox(0, lowerH * 0.5, -bodyD * 0.04, w - sideThick * 2, lowerH, bodyD * 0.88, { materialRole: 'primary', layer: 'body' });
  // Recessed rear spine behind the monitor alcove so tilted CRT screens are never clipped
  batcher.addBox(0, lowerH + upperH * 0.48, -bodyD * 0.31, w - sideThick * 2, upperH * 0.96, Math.max(0.14, topD * 0.36), { materialRole: 'primary', layer: 'body' });

  for (const sx of [-halfW + sideThick * 0.5, halfW - sideThick * 0.5]) {
    batcher.addBox(sx, lowerH * 0.5, 0, sideThick, lowerH, bodyD, { materialRole: 'primary', layer: 'body' });
    if (isCandy) {
      batcher.addChamferBox(sx, lowerH + upperH * 0.5, -bodyD * 0.08, sideThick + 0.014, upperH, topD, 0.08, { materialRole: 'secondary', layer: 'body' });
      batcher.addBox(sx, lowerH * 0.5, bodyD * 0.44, 0.022, lowerH * 0.9, 0.06, { materialRole: 'accent', layer: 'detail' });
    } else if (isStraight) {
      batcher.addBox(sx, lowerH + upperH * 0.5, -bodyD * 0.03, sideThick, upperH, topD, { materialRole: 'primary', layer: 'body' });
    } else {
      batcher.addTrapezoidBox(sx, lowerH + upperH * 0.5, -bodyD * 0.08, sideThick, bodyD * 0.9, sideThick, topD, upperH, { materialRole: 'primary', layer: 'body' });
    }
    // T-molding colored front edge trim strip
    if (cfg.edgeTrim !== false) {
      batcher.addBox(sx, h * 0.5, bodyD * (isStraight ? 0.45 : 0.36), 0.016, h * 0.92, 0.022, { materialRole: 'accent', layer: 'detail' });
    }
  }

  if (isCandy) {
    batcher.addChamferBox(0, lowerH + upperH * 0.5, -bodyD * 0.04, w + 0.02, upperH * 0.62, 0.09, 0.028, { materialRole: 'secondary', layer: 'body' });
  }
  if (isDeep || isWide) {
    batcher.addChamferBox(0, h - 0.02, -bodyD * 0.02, w + (isWide ? 0.08 : 0.02), 0.045, topD + 0.16, 0.01, { materialRole: 'primary', layer: 'body' });
  }

  // Kickplate & ventilation slots on lower cabinet back/front
  batcher.addBox(0, 0.09, bodyD * 0.41, w - sideThick * 2, 0.16, 0.014, { materialRole: 'frame', layer: 'detail' });
  if (cfg.casters) {
    batcher.addCasterWheels(0, 0, w * 0.72, bodyD * 0.7, 0.028, 'frame', 'frame');
  }

  // Speaker grille panel below marquee
  if (cfg.speakerGrille !== false) {
    for (let s = 0; s < 5; s++) {
      batcher.addBox((s - 2) * (w * 0.12), h * 0.83, topD * 0.32 - bodyD * 0.08, w * 0.06, 0.016, 0.014, { materialRole: 'frame', layer: 'detail' });
    }
  }

  // Decorative side artwork planes
  if (showSideArt) {
    const artMat = getObjectArcadeSideArtMaterial(cfg.primaryColor || '#26479c', cfg.accentColor || '#ff3ec8', cfg.seed || 101);
    for (const dir of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(bodyD * 0.72, h * 0.68), artMat);
      plane.position.set(dir * (halfW + 0.004), h * 0.44, -bodyD * 0.04);
      plane.rotation.y = dir === 1 ? Math.PI * 0.5 : -Math.PI * 0.5;
      plane.name = dir === 1 ? 'SideArt_R' : 'SideArt_L';
      plane.userData = { layer: 'detail', materialRole: 'sideArt' };
      group.add(plane);
    }
  }

  return {
    deckY,
    screenY: lowerH + upperH * 0.42,
    marqueeY: h - 0.11,
    hasMarquee: true,
    bodyD,
    topD,
    screenZ: isStraight ? bodyD * 0.16 : isCandy ? bodyD * 0.14 : bodyD * 0.1,
    screenTiltDeg: isStraight ? -10 : isWedge ? -26 : -20
  };
}

function cabAssembleCabinet(group, cfg, batcher, meta, options = {}) {
  const profile = cfg.sideProfile || 'classic_angled';
  const w = clamp(Number(cfg.width) || 0.72, 0.45, 1.85);
  const h = clamp(Number(cfg.height) || 1.82, 0.55, 2.25);
  const d = clamp(Number(cfg.depth) || 0.82, 0.38, 1.4);
  const titleText = cfg.marqueeText || options.defaultTitle || 'Pixel Quest';
  const layout = cfg.controlLayout || options.defaultLayout || 'two_player_6btn';
  const outOfOrder = Boolean(cfg.outOfOrder || cfg.condition === 'damaged');
  const screenMode = outOfOrder ? 'crt_arcade_off' : (cfg.screenMode || options.defaultScreen || 'arcade_platform');

  if (profile === 'back_to_back' && options.mats) {
    const halfD = Math.max(0.42, d * 0.45);
    for (const dir of [-1, 1]) {
      const sub = new THREE.Group();
      sub.position.set(0, 0, dir * halfD);
      if (dir === -1) sub.rotation.y = Math.PI;
      const subBatch = new batcher.constructor();
      cabAssembleCabinet(sub, {
        ...cfg,
        sideProfile: 'classic_angled',
        depth: Math.min(d * 0.78, 0.72),
        seed: (cfg.seed || 101) + (dir > 0 ? 11 : 23)
      }, subBatch, { lightSources: meta.lightSources || [] }, { ...options, isBackToBackHalf: true });
      subBatch.finalize(sub, options.mats);
      group.add(sub);
    }
    batcher.addBox(0, h * 0.5, 0, w - 0.04, h * 0.94, 0.12, { materialRole: 'frame', layer: 'body' });
    batcher.addBox(0, h + 0.02, 0, w + 0.02, 0.06, 0.24, { materialRole: 'accent', layer: 'body' });
    meta.interaction = {
      interactable: true,
      actionType: 'arcade_back_to_back_play',
      playerStandingPosition: [0, 0, halfD + d * 0.72],
      cabinetState: outOfOrder ? 'out_of_order' : 'active'
    };
    return;
  }

  const geom = cabBuildSidePanels(group, batcher, profile, w, h, d, cfg);

  if (profile === 'cocktail_table') {
    const scrW = Math.min(w * 0.56, 0.48);
    const scrD = Math.min(d * 0.44, 0.36);
    arcAddCRTMonitorAssembly(group, batcher, 0, geom.screenY, 0, scrW, scrD, { ...cfg, screenMode }, {
      tiltDeg: -90,
      screenStyle: 'crt_curved',
      screenMode,
      bezelThickness: 0.032
    });
    arcAddControlPanel(batcher, 0, geom.deckY, d * 0.46, w * 0.65, 0.18, 'single_6btn', { damaged: outOfOrder });
    arcAddControlPanel(batcher, 0, geom.deckY, -d * 0.46, w * 0.65, 0.18, 'single_6btn', { damaged: outOfOrder });
    arcAddCoinDoor(batcher, 0, geom.deckY * 0.52, d * 0.5 + 0.01, 0.24, 0.24, {
      coinSlots: cfg.coinSlotCount ?? 2,
      paymentStyle: cfg.paymentStyle || 'coin'
    });
    meta.interaction = {
      interactable: true,
      actionType: 'arcade_cabinet_cocktail',
      playerStandingPosition: [0, 0, d * 0.75],
      controlPanelPos: [0, geom.deckY, d * 0.46],
      screenPos: [0, geom.screenY, 0],
      cabinetState: outOfOrder ? 'out_of_order' : 'active'
    };
    return;
  }

  const deckZ = (geom.bodyD || d) * 0.38;
  const ctrlW = layout.includes('four') || layout.includes('six') || profile === 'wide_showcase' ? Math.max(w, 1.15) : w + 0.04;
  arcAddControlPanel(batcher, 0, geom.deckY, deckZ, ctrlW, 0.28, layout, {
    joystickStyle: cfg.joystickStyle || 'ball_top',
    damaged: outOfOrder
  });

  const screenZ = geom.screenZ ?? (geom.bodyD || d) * 0.05;
  const scrW = clamp(w * 0.72, 0.34, 1.25);
  const scrH = profile === 'compact_countertop' ? scrW * 0.68 : clamp(scrW * 0.82, 0.28, 0.72);
  const scrStyle = profile === 'slim_modern' || profile === 'deluxe_pedestal' ? 'lcd_flat' : (cfg.screenStyle || 'crt_curved');
  arcAddCRTMonitorAssembly(group, batcher, 0, geom.screenY, screenZ, scrW, scrH, { ...cfg, screenMode }, {
    tiltDeg: cfg.monitorAngle !== undefined ? Number(cfg.monitorAngle) : (geom.screenTiltDeg ?? -22),
    screenStyle: scrStyle,
    screenMode,
    bezelThickness: Number(cfg.bezelThickness) || 0.04
  });

  if (geom.hasMarquee && geom.marqueeY) {
    const mqH = clamp(Number(cfg.marqueeHeight) || 0.22, 0.14, 0.36);
    const mqZ = (geom.topD || d * 0.6) * 0.28;
    arcAddMarqueeBox(group, batcher, 0, geom.marqueeY, mqZ, w - 0.02, mqH, 0.14, Number(cfg.marqueeAngle) || 14, titleText, cfg, {
      damaged: outOfOrder
    });
    meta.lightSources.push({
      id: 'marquee_glow',
      position: [0, geom.marqueeY, mqZ + 0.12],
      color: cfg.emissiveColor || '#4de2ff',
      radius: 2.2,
      enabled: cfg.lampLit !== false && !outOfOrder
    });
  }

  let coinSlotPos = null;
  if (profile !== 'compact_countertop') {
    const coinRes = arcAddCoinDoor(batcher, 0, geom.deckY * 0.52, (geom.bodyD || d) * 0.41, Math.min(0.32, w * 0.44), 0.34, {
      coinSlots: cfg.coinSlotCount ?? 2,
      paymentStyle: cfg.paymentStyle || 'coin',
      includeTicketDispenser: Boolean(cfg.includeTicketDispenser)
    });
    coinSlotPos = coinRes.coinSlotPosition;
  }
  if (outOfOrder) {
    objCreateSignPlane(group, 'Out Of Order', Math.min(w * 0.62, 0.42), 0.14, '#ffe142', '#991b1b', {
      x: 0,
      y: geom.screenY,
      z: screenZ + 0.14,
      name: 'OutOfOrderPlacard'
    });
  }
  meta.interaction = {
    interactable: true,
    actionType: 'arcade_cabinet_play',
    playerStandingPosition: [0, 0, deckZ + 0.55],
    facingDirection: [0, 0, -1],
    controlPanelPos: [0, geom.deckY, deckZ],
    screenPos: [0, geom.screenY, screenZ],
    coinSlotPos,
    optionalSeatPos: profile === 'rounded_front' ? [0, 0.44, deckZ + 0.45] : null,
    cabinetState: outOfOrder ? 'out_of_order' : 'active'
  };
}

export function registerArcadeCabinetFamilies() {
  registerObjectFamily({
    id: 'arcade_cabinet',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment', '27_sims_everyday_misc'],
    subcategory: 'Classic Arcade Cabinets',
    label: 'Classic Upright & Modular Arcade Cabinet',
    description: 'Procedural 1980s and 1990s coin-op upright, bartop, candy, cocktail, pedestal, and widescreen modern arcade cabinets.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed', 'wall_mounted'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'small',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'bowling_alley', 'residential_game_room', 'superhero_base', 'gaming_lounge'],
    tags: ['arcade', 'cabinet', 'crt', 'coin_op', 'bartop', 'cocktail', 'joystick', 'marquee', 'retro'],
    schema: [
      { group: 'Cabinet Silhouette & Dimensions', tab: 'structure' },
      { key: 'sideProfile', label: 'Cabinet Silhouette', type: 'select', tab: 'structure', default: 'classic_angled', options: CABINET_PROFILE_CHOICES },
      { key: 'width', label: 'Cabinet Width', type: 'range', tab: 'structure', min: 0.46, max: 1.85, step: 0.02, unit: 'm', default: 0.72 },
      { key: 'height', label: 'Cabinet Height', type: 'range', tab: 'structure', min: 0.58, max: 2.25, step: 0.02, unit: 'm', default: 1.82 },
      { key: 'depth', label: 'Cabinet Depth', type: 'range', tab: 'structure', min: 0.42, max: 1.35, step: 0.02, unit: 'm', default: 0.82 },
      { key: 'monitorAngle', label: 'Monitor Tilt', type: 'range', tab: 'structure', min: -48, max: -5, step: 1, unit: 'deg', default: -22 },
      { key: 'marqueeHeight', label: 'Marquee Height', type: 'range', tab: 'structure', min: 0.14, max: 0.36, step: 0.02, unit: 'm', default: 0.22 },
      { key: 'marqueeAngle', label: 'Marquee Angle', type: 'range', tab: 'structure', min: 0, max: 28, step: 1, unit: 'deg', default: 14 },
      { group: 'Controls, Screen & Coin Hardware', tab: 'details' },
      { key: 'controlLayout', label: 'Control Layout', type: 'select', tab: 'details', default: 'two_player_6btn', options: ARCADE_CONTROL_LAYOUTS },
      { key: 'joystickStyle', label: 'Joystick Style', type: 'select', tab: 'details', default: 'ball_top', options: [['ball_top', 'Ball-Top'], ['bat_top', 'Bat-Top'], ['mini', 'Mini'], ['flight_stick', 'Flight Stick']] },
      { key: 'screenMode', label: 'Screen Display', type: 'select', tab: 'details', default: 'arcade_platform', options: ARCADE_SCREEN_CHOICES },
      { key: 'marqueeText', label: 'Marquee Title', type: 'text', tab: 'details', default: 'Pixel Quest', maxLength: 22 },
      { key: 'paymentStyle', label: 'Payment Hardware', type: 'select', tab: 'details', default: 'coin', options: [['coin', 'Coin / Token Door'], ['card', 'Cashless Tap Card'], ['hybrid', 'Coin + Card Hybrid']] },
      { key: 'coinSlotCount', label: 'Coin Slots', type: 'range', tab: 'details', min: 1, max: 4, step: 1, default: 2 },
      { key: 'includeSideArt', label: 'Decorative Side Art', type: 'boolean', tab: 'details', default: true },
      { key: 'edgeTrim', label: 'T-Molding Trim', type: 'boolean', tab: 'details', default: true },
      { key: 'speakerGrille', label: 'Speaker Grille', type: 'boolean', tab: 'details', default: true },
      { key: 'casters', label: 'Base Casters', type: 'boolean', tab: 'details', default: false },
      { key: 'lampLit', label: 'Backlit Marquee', type: 'boolean', tab: 'details', default: true },
      { key: 'outOfOrder', label: 'Out Of Order Sign', type: 'boolean', tab: 'details', default: false }
    ],
    presets: [
      { id: 'classic_80s_upright_cab', label: 'Classic 1980s Upright Cabinet', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', params: { sideProfile: 'classic_angled', width: 0.72, height: 1.82, depth: 0.82, controlLayout: 'single_2btn', screenMode: 'arcade_platform', marqueeText: 'Star Runner' } },
      { id: 'retro_wood_paneled_cab', label: '1980s Wood-Paneled Cabinet', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', primaryMaterial: 'wood', params: { sideProfile: 'deep_crt', width: 0.74, height: 1.84, depth: 0.9, controlLayout: 'single_2btn', screenMode: 'arcade_maze', marqueeText: 'Maze Chaser' } },
      { id: 'narrow_upright_cab', label: 'Narrow Upright Arcade', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', params: { sideProfile: 'straight_upright', width: 0.56, height: 1.76, depth: 0.74, controlLayout: 'single_6btn', screenMode: 'arcade_shooter', marqueeText: 'Galactic Wing' } },
      { id: 'wide_oversized_90s_cab', label: '1990s Oversized Wide Cabinet', locationContext: 'interior', paletteFamily: 'arcade_1990s_mall', params: { sideProfile: 'wide_showcase', width: 1.24, height: 1.98, depth: 0.98, controlLayout: 'four_player', screenMode: 'arcade_fighting', marqueeText: 'Brawler Force' } },
      { id: 'japanese_candy_cab', label: 'Japanese Candy Sit-Down Cab', locationContext: 'interior', paletteFamily: 'modern_family_entertainment', primaryMaterial: 'plastic', params: { sideProfile: 'rounded_front', width: 0.76, height: 1.54, depth: 0.84, controlLayout: 'fighting_pro', screenMode: 'arcade_fighting', marqueeText: 'Super Clash Ex' } },
      { id: 'countertop_bartop_cab', label: 'Countertop / Bartop Mini Arcade', locationContext: 'interior', attachmentProfile: 'surface_placed', paletteFamily: 'home_game_room', params: { sideProfile: 'compact_countertop', width: 0.54, height: 0.64, depth: 0.48, controlLayout: 'single_6btn', screenMode: 'arcade_attract', marqueeText: 'Mini Classics' } },
      { id: 'cocktail_table_arcade', label: 'Cocktail Table Arcade Machine', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', params: { sideProfile: 'cocktail_table', width: 0.92, height: 0.76, depth: 0.72, controlLayout: 'single_6btn', screenMode: 'arcade_maze', marqueeText: 'Retro Lounge' } },
      { id: 'deluxe_pedestal_showcase', label: 'Deluxe Pedestal Widescreen Cab', locationContext: 'interior', paletteFamily: 'superhero_cyber_arcade', params: { sideProfile: 'deluxe_pedestal', width: 1.12, height: 1.92, depth: 0.96, controlLayout: 'four_player', paymentStyle: 'card', screenMode: 'futuristic_hud', marqueeText: 'Cyber Arena' } },
      { id: 'modern_flatscreen_arcade', label: 'Modern Flat-Screen Arcade Cab', locationContext: 'interior', paletteFamily: 'modern_family_entertainment', params: { sideProfile: 'slim_modern', width: 0.78, height: 1.92, depth: 0.64, controlLayout: 'two_player_6btn', paymentStyle: 'hybrid', screenMode: 'arcade_puzzle', marqueeText: 'Neon Prism' } },
      { id: 'out_of_order_abandoned_cab', label: 'Neglected Out-Of-Order Cabinet', locationContext: 'interior', condition: 'neglected', paletteFamily: 'neglected_abandoned', params: { sideProfile: 'slanted_wedge', width: 0.72, height: 1.8, depth: 0.8, outOfOrder: true, lampLit: false, marqueeText: 'Dungeon Quest' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      cabAssembleCabinet(group, cfg, batcher, meta, { mats });
    }
  });

  registerObjectFamily({
    id: 'specialty_arcade_cabinet',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Fighting & Multiplayer Stations',
    label: 'Specialty & Multiplayer Arcade Stations',
    description: 'Two-player fighting tournament cabinets, 4-player and 6-player oversized cabinets, linked opposing versus rigs, and genre-themed cabinets.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'gaming_lounge', 'superhero_base'],
    tags: ['arcade', 'fighting', 'multiplayer', 'four_player', 'six_player', 'versus', 'shooter', 'puzzle'],
    schema: [
      { group: 'Multiplayer Station Configuration', tab: 'structure' },
      {
        key: 'stationType',
        label: 'Station Layout',
        type: 'select',
        tab: 'structure',
        default: 'four_player_coop',
        options: [
          ['two_player_fighting', 'Two-Player Fighting Pro'],
          ['four_player_coop', 'Four-Player Co-Op Cabinet'],
          ['six_player_oversized', 'Six-Player Oversized Cabinet'],
          ['linked_opposing_versus', 'Linked Opposing Versus Pair'],
          ['back_to_back_duo', 'Back-To-Back Twin Upright'],
          ['adventure_vertical_cab', 'Vertical Scrolling Shmup Cab']
        ]
      },
      { key: 'width', label: 'Cabinet Width', type: 'range', tab: 'structure', min: 0.72, max: 1.85, step: 0.04, unit: 'm', default: 1.32 },
      { key: 'height', label: 'Cabinet Height', type: 'range', tab: 'structure', min: 1.5, max: 2.25, step: 0.04, unit: 'm', default: 2.02 },
      { group: 'Display & Artwork', tab: 'details' },
      { key: 'screenMode', label: 'Screen Display', type: 'select', tab: 'details', default: 'arcade_fighting', options: ARCADE_SCREEN_CHOICES },
      { key: 'marqueeText', label: 'Marquee Title', type: 'text', tab: 'details', default: 'Turbo Clash', maxLength: 22 },
      { key: 'paymentStyle', label: 'Payment Hardware', type: 'select', tab: 'details', default: 'hybrid', options: [['coin', 'Coin Door'], ['card', 'Tap-Card'], ['hybrid', 'Coin + Card']] }
    ],
    presets: [
      { id: 'fighting_2p_versus_cab', label: 'Two-Player Fighting Cabinet', locationContext: 'interior', paletteFamily: 'arcade_1990s_mall', params: { stationType: 'two_player_fighting', width: 0.92, height: 1.92, screenMode: 'arcade_fighting', marqueeText: 'Hyper Fighters' } },
      { id: 'four_player_coop_brawler', label: 'Four-Player Cooperative Cabinet', locationContext: 'interior', paletteFamily: 'arcade_1990s_mall', params: { stationType: 'four_player_coop', width: 1.38, height: 2.04, screenMode: 'arcade_platform', marqueeText: 'Metro Guardians' } },
      { id: 'six_player_mega_cabinet', label: 'Six-Player Oversized Mega Cab', locationContext: 'interior', paletteFamily: 'superhero_cyber_arcade', params: { stationType: 'six_player_oversized', width: 1.78, height: 2.15, screenMode: 'arcade_fighting', marqueeText: 'Hero Alliance X6' } },
      { id: 'linked_opposing_versus_station', label: 'Linked Opposing Versus Cabinets', locationContext: 'interior', paletteFamily: 'modern_family_entertainment', params: { stationType: 'linked_opposing_versus', width: 0.86, height: 1.84, screenMode: 'arcade_fighting', marqueeText: 'Versus Arena' } },
      { id: 'back_to_back_arcade_twin', label: 'Back-To-Back Twin Arcade', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', params: { stationType: 'back_to_back_duo', width: 0.84, height: 1.9, screenMode: 'arcade_shooter', marqueeText: 'Nova Blaster' } },
      { id: 'vertical_shmup_arcade_cab', label: 'Vertical Scrolling Shooter Cab', locationContext: 'interior', paletteFamily: 'arcade_1980s_retro', params: { stationType: 'adventure_vertical_cab', width: 0.74, height: 1.88, screenMode: 'arcade_shooter', marqueeText: 'Sky Fortress' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const st = cfg.stationType || 'four_player_coop';
      const w = clamp(Number(cfg.width) || 1.32, 0.72, 1.85);
      const h = clamp(Number(cfg.height) || 2.02, 1.5, 2.25);
      if (st === 'linked_opposing_versus' || st === 'back_to_back_duo') {
        for (const dir of [-1, 1]) {
          const sub = new THREE.Group();
          sub.position.set(0, 0, dir * 0.54);
          if (dir === -1) sub.rotation.y = Math.PI;
          const b = new batcher.constructor();
          cabAssembleCabinet(sub, {
            ...cfg,
            sideProfile: st === 'linked_opposing_versus' ? 'rounded_front' : 'classic_angled',
            width: Math.min(w, 0.94),
            height: h * 0.88,
            depth: 0.78,
            controlLayout: 'two_player_6btn'
          }, b, { lightSources: [] }, { defaultTitle: cfg.marqueeText || 'Versus' });
          b.finalize(sub, mats);
          group.add(sub);
        }
        batcher.addBox(0, h * 0.92, 0, Math.min(w, 0.94) * 0.65, 0.14, 0.28, { materialRole: 'frame', layer: 'body' });
        arcAddMarqueeBox(group, batcher, 0, h * 1.0, 0.15, Math.min(w, 0.94) * 0.8, 0.22, 0.08, 6, cfg.marqueeText || 'Versus Link', cfg);
        meta.interaction = {
          interactable: true,
          actionType: 'arcade_linked_versus',
          playerStandingPosition: [0, 0, 1.25],
          cabinetState: 'active'
        };
        return;
      }

      const layout = st === 'six_player_oversized'
        ? 'six_player'
        : st === 'four_player_coop'
          ? 'four_player'
          : st === 'adventure_vertical_cab'
            ? 'single_6btn'
            : 'fighting_pro';

      cabAssembleCabinet(group, {
        ...cfg,
        sideProfile: st === 'adventure_vertical_cab' ? 'classic_angled' : 'wide_showcase',
        width: w,
        height: h,
        depth: st === 'six_player_oversized' ? 1.08 : 0.92,
        controlLayout: layout
      }, batcher, meta, { defaultTitle: cfg.marqueeText || 'Brawler Force' });
    }
  });
}
