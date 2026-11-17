import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateSignPlane } from '../geometry/primitives.js';

function upBuildExposedPipes(group, cfg, b, mats, meta) {
  const count = Math.max(1, Math.round(cfg.pipeCount || 2));
  const r = clamp(cfg.pipeDiameter || 0.1, 0.04, 0.24) * 0.5;
  const spacing = clamp(cfg.pipeSpacing || 0.2, 0.1, 0.42);
  const vLen = clamp(cfg.verticalLength || 2.4, 0.8, 4.2);
  const hLen = clamp(cfg.horizontalLength || 1.6, 0.6, 3.4);
  const wallGap = clamp(cfg.wallSpacing || 0.14, 0.06, 0.28);
  const layout = cfg.routingLayout || 'l_bend';
  const bendCount = Math.max(0, Math.round(cfg.bendCount ?? 1));
  const valveCount = Math.max(0, Math.round(cfg.valveCount ?? 1));
  const bracketCount = Math.max(2, Math.round(cfg.bracketCount || 3));
  const conn = cfg.connectionType || 'bolted_flange';
  const isWall = cfg.attachmentProfile === 'wall_mounted' || layout !== 'u_manifold';
  const zBase = isWall ? wallGap : 0;
  const yFloor = isWall ? -vLen * 0.45 : 0;
  const pipeRole = mats.secondary ? 'secondary' : 'primary';

  const drawConnector = (cx, cy, cz, axis) => {
    if (conn === 'bolted_flange') {
      b.addFlangeAndBolts(cx, cy, cz, r, axis, 'frame', 'secondary');
    } else if (conn === 'threaded_collar') {
      b.addCylinder(cx, cy, cz, r * 1.32, r * 1.32, r * 0.9, 10, axis, 'frame', 'detail');
    } else {
      b.addCylinder(cx, cy, cz, r * 1.12, r * 1.12, r * 0.35, 10, axis, 'primary', 'detail');
    }
  };

  for (let i = 0; i < count; i++) {
    const px = -((count - 1) * spacing) * 0.5 + i * spacing;
    const pz = zBase;

    if (layout === 'vertical_riser') {
      const y0 = yFloor;
      const y1 = y0 + vLen;
      b.addPipeSegment(px, y0, pz, px, y1, pz, r, 10, pipeRole, 'body');
      drawConnector(px, y0 + vLen * 0.3, pz, 'y');
      drawConnector(px, y0 + vLen * 0.72, pz, 'y');
      if (cfg.steamVentTop) {
        b.addCylinder(px, y1 + 0.08, pz, r * 1.45, r * 0.9, 0.16, 10, 'y', 'frame', 'detail');
      }
      if (i < valveCount) {
        if (cfg.valveStyle === 'pressure_gauge') {
          b.addBox(px, y0 + vLen * 0.48, pz + r + 0.05, 0.1, 0.1, 0.08, { materialRole: 'frame', layer: 'detail' });
          b.addCylinder(px, y0 + vLen * 0.48, pz + r + 0.095, 0.055, 0.055, 0.025, 10, 'z', 'whiteTrim', 'detail');
        } else {
          b.addValveWheel(px, y0 + vLen * 0.48, pz + r, Math.max(0.06, r * 1.5), 0.09, 'z', 'accent', 'frame');
        }
      }
    } else if (layout === 'u_manifold') {
      const span = Math.max(0.5, hLen * 0.65);
      const topY = yFloor + Math.min(1.15, vLen * 0.55);
      const xL = px - span * 0.5;
      const xR = px + span * 0.5;
      b.addPipeSegment(xL, yFloor, pz, xL, topY, pz, r, 10, pipeRole, 'body');
      b.addPipeSegment(xR, yFloor, pz, xR, topY, pz, r, 10, pipeRole, 'body');
      b.addPipeSegment(xL, topY, pz, xR, topY, pz, r, 10, pipeRole, 'body');
      b.addPipeElbow(xL, topY, pz, r, r * 1.6, [0, 1, 0], [1, 0, 0], 'frame', 'body');
      b.addPipeElbow(xR, topY, pz, r, r * 1.6, [1, 0, 0], [0, -1, 0], 'frame', 'body');
      drawConnector(xL, yFloor + 0.25, pz, 'y');
      drawConnector(xR, yFloor + 0.25, pz, 'y');
      if (i < valveCount) {
        if (cfg.valveStyle === 'backflow_preventer') {
          b.addCylinder((xL + xR) * 0.5, topY + 0.09, pz, r * 1.4, r * 1.4, 0.22, 10, 'y', 'brass', 'detail');
        } else {
          b.addValveWheel((xL + xR) * 0.5, topY + r, pz, Math.max(0.065, r * 1.6), 0.09, 'y', 'accent', 'frame');
        }
      }
    } else if (layout === 'z_offset' && bendCount >= 2) {
      const y0 = yFloor;
      const yMid = y0 + vLen * 0.45;
      const yTop = y0 + vLen;
      const shiftX = px + hLen * 0.55;
      b.addPipeSegment(px, y0, pz, px, yMid, pz, r, 10, pipeRole, 'body');
      b.addPipeSegment(px, yMid, pz, shiftX, yMid, pz, r, 10, pipeRole, 'body');
      b.addPipeSegment(shiftX, yMid, pz, shiftX, yTop, pz, r, 10, pipeRole, 'body');
      b.addPipeElbow(px, yMid, pz, r, r * 1.5, [0, 1, 0], [1, 0, 0], 'frame', 'body');
      b.addPipeElbow(shiftX, yMid, pz, r, r * 1.5, [1, 0, 0], [0, 1, 0], 'frame', 'body');
      drawConnector(px, y0 + vLen * 0.22, pz, 'y');
      drawConnector(shiftX, yMid + (yTop - yMid) * 0.5, pz, 'y');
      if (i < valveCount) {
        b.addValveWheel((px + shiftX) * 0.5, yMid, pz + r, Math.max(0.06, r * 1.5), 0.08, 'z', 'accent', 'frame');
      }
    } else {
      // L-bend or header cluster
      const y0 = yFloor;
      const yTop = y0 + vLen * 0.72;
      const xEnd = px + (bendCount > 0 ? hLen : 0);
      b.addPipeSegment(px, y0, pz, px, yTop, pz, r, 10, pipeRole, 'body');
      if (bendCount > 0) {
        b.addPipeSegment(px, yTop, pz, xEnd, yTop, pz, r, 10, pipeRole, 'body');
        b.addPipeElbow(px, yTop, pz, r, r * 1.5, [0, 1, 0], [1, 0, 0], 'frame', 'body');
        drawConnector(px + hLen * 0.5, yTop, pz, 'x');
      }
      if (bendCount >= 2) {
        const dropY = yTop - vLen * 0.35;
        b.addPipeSegment(xEnd, yTop, pz, xEnd, dropY, pz, r, 10, pipeRole, 'body');
        b.addPipeElbow(xEnd, yTop, pz, r, r * 1.5, [1, 0, 0], [0, -1, 0], 'frame', 'body');
      }
      drawConnector(px, y0 + vLen * 0.32, pz, 'y');
      if (i < valveCount) {
        b.addValveWheel(px, y0 + vLen * 0.48, pz + r, Math.max(0.06, r * 1.5), 0.085, 'z', 'accent', 'frame');
      }
    }
  }

  // Wall mounting brackets / channel struts
  if (isWall) {
    const spanW = Math.max(0.28, (count - 1) * spacing + 0.18);
    for (let k = 0; k < bracketCount; k++) {
      const by = yFloor + 0.25 + (k / Math.max(1, bracketCount - 1)) * (vLen * 0.65);
      b.addBox(0, by, wallGap * 0.5, spanW, 0.045, wallGap, { materialRole: 'frame', layer: 'detail' });
      b.addBox(0, by, 0.012, spanW + 0.08, 0.09, 0.024, { materialRole: 'frame', layer: 'detail' });
    }
  }

  meta.snapAnchors.push({ id: 'pipe_outlet', position: [0, yFloor, zBase], normal: [0, -1, 0] });
}

function upBuildUtilityCabinet(group, cfg, b, mats, meta) {
  const style = cfg.cabinetStyle || 'telecom_pedestal';
  const w = clamp(cfg.width || 0.9, 0.4, 1.85);
  const h = clamp(cfg.height || 1.25, 0.55, 1.9);
  const d = clamp(cfg.depth || 0.55, 0.22, 1.25);
  const padH = style === 'wall_meter_bank' || style === 'electrical_junction_box' ? 0 : clamp(cfg.padHeight || 0.1, 0, 0.24);
  const isWall = cfg.attachmentProfile === 'wall_mounted' || style === 'wall_meter_bank' || style === 'electrical_junction_box';
  const zOffset = isWall ? d * 0.5 : 0;
  const baseY = isWall ? -h * 0.5 : padH;
  const cy = baseY + h * 0.5;

  if (style === 'fire_standpipe_siamese') {
    b.addCylinder(0, 0.03, 0, 0.14, 0.16, 0.06, 10, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.35, 0, 0.065, 0.075, h * 0.7, 10, 'y', 'brass', 'body');
    b.addBox(0, h * 0.66, 0, 0.34, 0.14, 0.14, { materialRole: 'brass', layer: 'body' });
    b.addCylinder(-0.14, h * 0.72, 0.08, 0.065, 0.05, 0.16, 10, 'z', 'brass', 'detail');
    b.addCylinder(0.14, h * 0.72, 0.08, 0.065, 0.05, 0.16, 10, 'z', 'brass', 'detail');
    b.addPrismRing(-0.14, h * 0.72, 0.16, 0.07, 0.045, 0.04, 10, 'z', 'safetyRed', 'detail');
    b.addPrismRing(0.14, h * 0.72, 0.16, 0.07, 0.045, 0.04, 10, 'z', 'safetyRed', 'detail');
    return;
  }

  if (padH > 0.01 && !isWall) {
    b.addBox(0, padH * 0.5, 0, w + 0.16, padH, d + 0.16, { materialRole: 'concrete', layer: 'body' });
  }

  // Main enclosure
  b.addChamferBox(0, cy, zOffset, w, h, d, 0.025, { materialRole: 'primary', layer: 'body' });
  b.addBox(0, baseY + h + 0.02, zOffset, w + 0.04, 0.04, d + 0.04, { materialRole: 'secondary', layer: 'detail' });

  // Doors on front face
  const doors = Math.max(1, Math.round(cfg.doorCount || 2));
  const doorW = (w - 0.08 - (doors - 1) * 0.02) / doors;
  const frontZ = zOffset + d * 0.5 + 0.01;
  for (let i = 0; i < doors; i++) {
    const dx = -w * 0.5 + 0.04 + doorW * 0.5 + i * (doorW + 0.02);
    b.addBox(dx, cy, frontZ, doorW, h - 0.1, 0.018, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(dx + doorW * 0.34, cy - 0.02, frontZ + 0.016, 0.025, 0.11, 0.02, { materialRole: 'frame', layer: 'detail' });
  }

  // Louver vents
  const louvers = Math.max(0, Math.round(cfg.louverRows || 0));
  if (louvers >= 2) {
    b.addLouverGrille(0, baseY + h * 0.24, frontZ + 0.014, w * 0.52, Math.min(0.28, h * 0.24), louvers, 'z', 'frame', 'detail');
  }

  // Analog meter dials
  const meters = Math.max(0, Math.round(cfg.meterCount || 0));
  if (meters > 0) {
    const mCols = Math.min(meters, Math.max(1, Math.floor(w / 0.24)));
    for (let m = 0; m < meters; m++) {
      const col = m % mCols;
      const row = Math.floor(m / mCols);
      const mx = -((mCols - 1) * 0.2) * 0.5 + col * 0.2;
      const my = baseY + h * 0.72 - row * 0.22;
      b.addCylinder(mx, my, frontZ + 0.024, 0.07, 0.07, 0.04, 10, 'z', 'frame', 'detail');
      b.addCylinder(mx, my, frontZ + 0.048, 0.052, 0.052, 0.015, 10, 'z', 'glass', 'detail');
    }
  }

  // Conduit risers
  const conduits = Math.max(0, Math.round(cfg.conduitCount || 0));
  for (let c = 0; c < conduits; c++) {
    const cx = -w * 0.32 + (conduits > 1 ? (c / (conduits - 1)) * w * 0.64 : w * 0.32);
    b.addCylinder(cx, baseY + h + 0.22, zOffset - d * 0.15, 0.024, 0.024, 0.44, 8, 'y', 'frame', 'detail');
  }

  if (cfg.warningPlacard) {
    objCreateSignPlane(group, 'High Voltage', Math.min(w * 0.48, 0.42), 0.14, '#e8b228', '#171b20', {
      x: 0,
      y: baseY + h * 0.82,
      z: frontZ + 0.022
    });
  }

  meta.interaction = { interactable: true, actionType: 'inspect_utility_panel' };
}

export function registerUtilitiesAndPipesFamilies() {
  registerObjectFamily({
    id: 'exposed_pipes',
    categoryId: '03_utilities',
    categories: ['03_utilities', '26_trades_plumbing_electrical'],
    subcategory: 'Exposed Pipes',
    subcategories: ['Exposed Pipes', 'Valves & Standpipes', 'Plumbing, Boilers & Pumps'],
    label: 'Exposed Pipe & Conduit Assembly',
    description: 'Modular exterior wall pipe clusters, steam manifolds, gas risers, and downspouts.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'ground_standing'],
    locationContext: 'both',
    environmentTags: ['plumbing_mechanical', 'utility_room', 'industrial_interior'],
    architecturalStyle: 'industrial',
    sizeClass: 'medium',
    functionalRole: 'infrastructure',
    tags: ['pipes', 'conduit', 'utilities', 'wall', 'valve', 'steam', 'gas', 'water'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Pipe Assembly' },
      {
        key: 'routingLayout',
        name: 'Routing Layout',
        type: 'select',
        options: [
          ['l_bend', 'L-Bend Wall Run'],
          ['z_offset', 'Z-Offset Routing'],
          ['u_manifold', 'Ground U-Manifold'],
          ['vertical_riser', 'Vertical Riser Stack'],
          ['header_cluster', 'Header Manifold Cluster']
        ],
        default: 'l_bend'
      },
      { key: 'pipeCount', name: 'Parallel Pipes', type: 'number', min: 1, max: 4, step: 1, default: 2 },
      { key: 'pipeDiameter', name: 'Pipe Diameter', type: 'number', min: 0.04, max: 0.24, step: 0.01, unit: 'm', default: 0.1 },
      { key: 'pipeSpacing', name: 'Pipe Spacing', type: 'number', min: 0.1, max: 0.42, step: 0.02, unit: 'm', default: 0.2 },
      { key: 'verticalLength', name: 'Vertical Run', type: 'number', min: 0.8, max: 4.2, step: 0.1, unit: 'm', default: 2.4 },
      { key: 'horizontalLength', name: 'Horizontal Run', type: 'number', min: 0.6, max: 3.4, step: 0.1, unit: 'm', default: 1.6 },
      { key: 'bendCount', name: 'Elbow Bends', type: 'number', min: 0, max: 3, step: 1, default: 1 },
      { group: 'Fittings & Valves' },
      {
        key: 'connectionType',
        name: 'Joint Style',
        type: 'select',
        options: [
          ['bolted_flange', 'Bolted Flanges'],
          ['threaded_collar', 'Threaded Collars'],
          ['welded_seam', 'Welded Seams']
        ],
        default: 'bolted_flange'
      },
      { key: 'wallSpacing', name: 'Wall Clearance', type: 'number', min: 0.06, max: 0.28, step: 0.02, unit: 'm', default: 0.14 },
      { key: 'valveCount', name: 'Valve Wheels', type: 'number', min: 0, max: 3, step: 1, default: 1 },
      {
        key: 'valveStyle',
        name: 'Valve / Meter Type',
        type: 'select',
        options: [
          ['handwheel', 'Red Handwheel'],
          ['lever_ball', 'Lever Ball Valve'],
          ['pressure_gauge', 'Pressure Regulator'],
          ['backflow_preventer', 'Backflow Preventer']
        ],
        default: 'handwheel'
      },
      { key: 'bracketCount', name: 'Wall Brackets', type: 'number', min: 2, max: 6, step: 1, default: 3 },
      { key: 'steamVentTop', name: 'Steam Vent Cap', type: 'boolean', default: false }
    ],
    presets: [
      {
        id: 'building_wall_pipe_cluster',
        label: 'Wall-Mounted Pipe Cluster',
        subcategory: 'Exposed Pipes',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#56626c',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#98a3ad',
        accentColor: '#c9382e',
        frameColor: '#293036',
        params: { routingLayout: 'l_bend', pipeCount: 3, pipeDiameter: 0.09, verticalLength: 2.6, horizontalLength: 1.5, bendCount: 1, valveCount: 2, bracketCount: 4 }
      },
      {
        id: 'industrial_steam_manifold',
        label: 'Industrial Steam Manifold',
        subcategory: 'Exposed Pipes',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'weathered_surface',
        primaryColor: '#696256',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#8d9499',
        accentColor: '#d9482e',
        frameColor: '#25292e',
        params: { routingLayout: 'z_offset', pipeCount: 2, pipeDiameter: 0.16, verticalLength: 2.8, horizontalLength: 1.8, bendCount: 2, valveCount: 2, steamVentTop: true }
      },
      {
        id: 'copper_gas_riser_meters',
        label: 'Gas Pipe Riser & Regulators',
        subcategory: 'Valves & Standpipes',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'older_metropolitan',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#7a5c38',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#9b7b4c',
        accentColor: '#e0a124',
        frameColor: '#282d33',
        params: { routingLayout: 'vertical_riser', pipeCount: 2, pipeDiameter: 0.07, verticalLength: 2.2, bendCount: 0, valveCount: 2, valveStyle: 'pressure_gauge' }
      },
      {
        id: 'exterior_downspout_drain',
        label: 'Exterior Downspout Drain',
        subcategory: 'Exposed Pipes',
        locationContext: 'exterior',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'residential',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#586673',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#71808e',
        accentColor: '#4e5b66',
        frameColor: '#2c343c',
        params: { routingLayout: 'vertical_riser', pipeCount: 1, pipeDiameter: 0.11, verticalLength: 3.4, bendCount: 0, valveCount: 0, connectionType: 'threaded_collar', bracketCount: 4 }
      },
      {
        id: 'ground_backflow_preventer',
        label: 'Ground Backflow Preventer',
        subcategory: 'Valves & Standpipes',
        locationContext: 'exterior',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'municipal',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2b5d8a',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#a3adb5',
        accentColor: '#d93d2e',
        frameColor: '#232a32',
        params: { routingLayout: 'u_manifold', pipeCount: 1, pipeDiameter: 0.12, verticalLength: 1.8, horizontalLength: 1.2, bendCount: 2, valveCount: 1, valveStyle: 'backflow_preventer' }
      }
    ],
    buildGeometry: upBuildExposedPipes
  });

  registerObjectFamily({
    id: 'utility_cabinet',
    categoryId: '03_utilities',
    categories: ['03_utilities', '26_trades_plumbing_electrical'],
    subcategory: 'Utility Cabinets',
    subcategories: ['Utility Cabinets', 'Transformers & Meters', 'Valves & Standpipes', 'Electrical Panels & Distribution'],
    label: 'Utility & Electrical Cabinet',
    description: 'Street telecom boxes, pad transformers, wall meter banks, and fire standpipe connections.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    locationContext: 'both',
    environmentTags: ['electrical_room', 'utility_room', 'industrial_interior'],
    architecturalStyle: 'municipal',
    sizeClass: 'small',
    functionalRole: 'infrastructure',
    tags: ['utility', 'cabinet', 'electrical', 'transformer', 'telecom', 'meter', 'standpipe'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Cabinet Type & Size' },
      {
        key: 'cabinetStyle',
        name: 'Equipment Type',
        type: 'select',
        options: [
          ['telecom_pedestal', 'Telecom Distribution Box'],
          ['pad_transformer', 'Pad-Mounted Transformer'],
          ['wall_meter_bank', 'Wall Electrical Meter Bank'],
          ['electrical_junction_box', 'Wall Junction Cabinet'],
          ['fire_standpipe_siamese', 'Fire Dept Standpipe']
        ],
        default: 'telecom_pedestal'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.4, max: 1.85, step: 0.05, unit: 'm', default: 0.9 },
      { key: 'height', name: 'Height', type: 'number', min: 0.55, max: 1.9, step: 0.05, unit: 'm', default: 1.25 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.22, max: 1.25, step: 0.04, unit: 'm', default: 0.55 },
      { group: 'Cabinet Features' },
      { key: 'doorCount', name: 'Access Doors', type: 'number', min: 1, max: 3, step: 1, default: 2 },
      { key: 'louverRows', name: 'Vent Louver Blades', type: 'number', min: 0, max: 6, step: 1, default: 4 },
      { key: 'meterCount', name: 'Analog Meters', type: 'number', min: 0, max: 8, step: 1, default: 0 },
      { key: 'conduitCount', name: 'Top Conduit Risers', type: 'number', min: 0, max: 4, step: 1, default: 0 },
      { key: 'padHeight', name: 'Concrete Pad Height', type: 'number', min: 0, max: 0.24, step: 0.02, unit: 'm', default: 0.1 },
      { key: 'warningPlacard', name: 'High Voltage Sign', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'green_pad_transformer',
        label: 'Green Pad-Mount Transformer',
        subcategory: 'Transformers & Meters',
        locationContext: 'exterior',
        paletteFamily: 'municipal',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#29573f',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#34694d',
        accentColor: '#e8b228',
        frameColor: '#22282d',
        params: { cabinetStyle: 'pad_transformer', width: 1.35, height: 1.25, depth: 1.05, doorCount: 2, louverRows: 5, meterCount: 0, padHeight: 0.12, warningPlacard: true }
      },
      {
        id: 'street_telecom_cabinet',
        label: 'Sidewalk Telecom Cabinet',
        subcategory: 'Utility Cabinets',
        locationContext: 'exterior',
        paletteFamily: 'modern_downtown',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#8d969f',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#aeb7c0',
        accentColor: '#e0a124',
        frameColor: '#2a3138',
        params: { cabinetStyle: 'telecom_pedestal', width: 0.95, height: 1.35, depth: 0.52, doorCount: 2, louverRows: 4, padHeight: 0.08, warningPlacard: false }
      },
      {
        id: 'apartment_electric_meter_bank',
        label: 'Apartment Electric Meter Bank',
        subcategory: 'Transformers & Meters',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'industrial',
        condition: 'lightly_worn',
        primaryMaterial: 'galvanized_metal',
        primaryColor: '#7b858e',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#98a2ab',
        accentColor: '#e8b228',
        frameColor: '#262b30',
        params: { cabinetStyle: 'wall_meter_bank', width: 1.15, height: 0.92, depth: 0.26, doorCount: 1, louverRows: 0, meterCount: 6, conduitCount: 3, padHeight: 0 }
      },
      {
        id: 'wall_junction_conduit_box',
        label: 'Wall Junction Conduit Box',
        subcategory: 'Utility Cabinets',
        locationContext: 'both',
        attachmentProfile: 'wall_mounted',
        paletteFamily: 'industrial',
        condition: 'weathered',
        primaryMaterial: 'painted_steel',
        primaryColor: '#5c6670',
        secondaryMaterial: 'galvanized_metal',
        secondaryColor: '#7a848c',
        accentColor: '#e0a124',
        frameColor: '#25292e',
        params: { cabinetStyle: 'electrical_junction_box', width: 0.52, height: 0.68, depth: 0.24, doorCount: 1, louverRows: 3, meterCount: 0, conduitCount: 2, padHeight: 0 }
      },
      {
        id: 'brass_fire_standpipe',
        label: 'Fire Dept Standpipe Connection',
        subcategory: 'Valves & Standpipes',
        locationContext: 'exterior',
        paletteFamily: 'older_metropolitan',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#c23c2d',
        secondaryMaterial: 'brushed_metal',
        secondaryColor: '#c99a3a',
        accentColor: '#cf342b',
        frameColor: '#25292e',
        params: { cabinetStyle: 'fire_standpipe_siamese', width: 0.44, height: 0.85, depth: 0.36, warningPlacard: false }
      }
    ],
    buildGeometry: upBuildUtilityCabinet
  });
}
