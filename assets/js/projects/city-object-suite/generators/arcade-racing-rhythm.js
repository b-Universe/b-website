import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import {
  arcAddCoinDoor,
  arcAddFootPedals,
  arcAddLightGun,
  arcAddMarqueeBox,
  arcAddMotorcycleHandlebars,
  arcAddPushbuttons,
  arcAddSteeringWheel,
  arcAddThrottleLever,
  arcAddCRTMonitorAssembly,
  ARCADE_SCREEN_CHOICES
} from './arcade-controls.js';

function racBuildSeatUnit(batcher, cx, cz, width = 0.56, angleDeg = 12, options = {}) {
  const rx = degToRad(-angleDeg);
  batcher.addBox(cx, 0.18, cz, width * 0.85, 0.34, 0.56, { materialRole: 'frame', layer: 'body' });
  batcher.addBox(cx, 0.39, cz + 0.02, width, 0.08, 0.52, { materialRole: 'upholstery', layer: 'body' });
  batcher.addBox(cx, 0.74, cz + 0.25, width * 0.94, 0.66, 0.1, { materialRole: 'upholstery', rotX: rx, layer: 'body' });
  // Bucket side bolsters
  batcher.addBox(cx - width * 0.48, 0.68, cz + 0.16, 0.06, 0.52, 0.16, { materialRole: 'accent', rotX: rx, layer: 'detail' });
  batcher.addBox(cx + width * 0.48, 0.68, cz + 0.16, 0.06, 0.52, 0.16, { materialRole: 'accent', rotX: rx, layer: 'detail' });
  if (options.rearSpeakers !== false) {
    batcher.addBox(cx, 1.02, cz + 0.28, width * 0.72, 0.14, 0.12, { materialRole: 'frame', layer: 'detail' });
  }
}

export function registerArcadeRacingAndRhythmFamilies() {
  registerObjectFamily({
    id: 'racing_driving_machine',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Racing & Driving Machines',
    label: 'Racing & Driving Simulators',
    description: 'Classic upright racers, twin linked arcade driving cabs, deluxe hydraulic cockpits, motorcycle lean-on sims, truck/bus rigs, and multi-screen racers.',
    attachmentProfile: 'ground_standing',
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'family_entertainment', 'mall', 'bowling_alley', 'superhero_base'],
    tags: ['racing', 'driving', 'simulator', 'steering_wheel', 'motorcycle', 'twin', 'cockpit'],
    schema: [
      { group: 'Racing Simulator Type', tab: 'structure' },
      {
        key: 'machineType',
        label: 'Machine Style',
        type: 'select',
        tab: 'structure',
        default: 'twin_seated',
        options: [
          ['upright_racer', 'Classic Upright Racer'],
          ['seated_cockpit', 'Seated Racing Cockpit'],
          ['twin_seated', 'Twin Linked Racing Pair'],
          ['linked_four_row', 'Linked 4-Player Racing Row'],
          ['deluxe_motion', 'Deluxe Motion Cockpit'],
          ['motorcycle_sim', 'Motorcycle Ride-On Sim'],
          ['truck_bus_sim', 'Heavy Truck / Bus Simulator'],
          ['hover_craft', 'Futuristic Hover Sim']
        ]
      },
      { key: 'seatCount', label: 'Linked Seats', type: 'range', tab: 'structure', min: 1, max: 4, step: 1, default: 2 },
      { key: 'machineLength', label: 'Cabinet Length', type: 'range', tab: 'structure', min: 0.95, max: 2.4, step: 0.05, unit: 'm', default: 1.68 },
      { key: 'monitorSize', label: 'Monitor Size', type: 'range', tab: 'structure', min: 0.55, max: 1.25, step: 0.05, unit: 'm', default: 0.82 },
      { group: 'Cockpit Details & Displays', tab: 'details' },
      { key: 'tripleMonitors', label: 'Triple Surround Screens', type: 'boolean', tab: 'details', default: false },
      { key: 'rearSpoiler', label: 'Decorative Rear Spoiler', type: 'boolean', tab: 'details', default: true },
      { key: 'marqueeText', label: 'Header Sign', type: 'text', tab: 'details', default: 'Turbo Outrun', maxLength: 20 },
      { key: 'screenMode', label: 'Screen Content', type: 'select', tab: 'details', default: 'arcade_racing', options: ARCADE_SCREEN_CHOICES }
    ],
    presets: [
      { id: 'classic_upright_racer', label: 'Classic Upright Racing Cab', locationContext: 'interior', values: { machineType: 'upright_racer', seatCount: 1, machineLength: 1.05, monitorSize: 0.65, rearSpoiler: false, marqueeText: 'Apex Highway', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'twin_linked_racing_cabs', label: 'Twin Linked Racing Cabinets', locationContext: 'interior', values: { machineType: 'twin_seated', seatCount: 2, machineLength: 1.68, monitorSize: 0.82, rearSpoiler: true, marqueeText: 'Twin Grand Prix', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'four_player_linked_racers', label: 'Linked Four-Player Racing Row', locationContext: 'interior', values: { machineType: 'linked_four_row', seatCount: 4, machineLength: 1.62, monitorSize: 0.78, marqueeText: 'Championship 4x', paletteFamily: 'modern_family_entertainment' } },
      { id: 'deluxe_motion_cockpit_racer', label: 'Deluxe Motion-Platform Racer', locationContext: 'interior', values: { machineType: 'deluxe_motion', seatCount: 1, machineLength: 2.15, monitorSize: 1.08, tripleMonitors: true, marqueeText: 'Hyper Velocity', paletteFamily: 'modern_family_entertainment' } },
      { id: 'motorcycle_ride_on_sim', label: 'Motorcycle Ride-On Simulator', locationContext: 'interior', values: { machineType: 'motorcycle_sim', seatCount: 1, machineLength: 1.72, monitorSize: 0.88, marqueeText: 'Moto Turbo', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'heavy_truck_bus_sim', label: 'Heavy Truck / Bus Simulator', locationContext: 'interior', values: { machineType: 'truck_bus_sim', seatCount: 1, machineLength: 1.85, monitorSize: 0.96, tripleMonitors: true, marqueeText: 'Highway Hauler', paletteFamily: 'modern_family_entertainment' } },
      { id: 'futuristic_hover_racer', label: 'Futuristic Hovercraft Simulator', locationContext: 'interior', values: { machineType: 'hover_craft', seatCount: 1, machineLength: 1.98, monitorSize: 1.02, screenMode: 'futuristic_hud', marqueeText: 'Anti-Grav Race', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const mType = cfg.machineType || 'twin_seated';
      const count = mType === 'twin_seated'
        ? Math.max(2, Number(cfg.seatCount) || 2)
        : mType === 'linked_four_row'
          ? Math.max(2, Number(cfg.seatCount) || 4)
          : clamp(Math.round(cfg.seatCount || 1), 1, 4);
      const len = clamp(Number(cfg.machineLength) || 1.68, 0.95, 2.4);
      const monW = clamp(Number(cfg.monitorSize) || 0.82, 0.55, 1.25);
      const laneW = 0.86;
      const laneGap = 0.08;
      const stride = laneW + laneGap;
      const totalSpan = count * stride;

      for (let i = 0; i < count; i++) {
        const cx = (i - (count - 1) * 0.5) * stride;
        const dashZ = -len * 0.24;

        if (mType === 'upright_racer') {
          batcher.addBox(cx, 0.9, dashZ - 0.24, laneW * 0.9, 1.8, 0.48, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, 0.82, dashZ + 0.28, laneW * 0.88, 0.24, 0.26, { materialRole: 'secondary', layer: 'body' });
          arcAddCRTMonitorAssembly(group, batcher, cx, 1.28, dashZ + 0.16, monW * 0.78, monW * 0.54, cfg, { tiltDeg: -14, screenMode: cfg.screenMode || 'arcade_racing' });
          arcAddSteeringWheel(batcher, cx, 1.02, dashZ + 0.36, 20, 0.14);
          arcAddFootPedals(batcher, cx, 0.04, dashZ + 0.22, 2);
          arcAddCoinDoor(batcher, cx, 0.36, dashZ + 0.23, 0.26, 0.3, { paymentStyle: 'hybrid' });
        } else if (mType === 'motorcycle_sim') {
          batcher.addBox(cx, 0.08, 0, laneW * 0.94, 0.16, len, { materialRole: 'frame', layer: 'body' });
          batcher.addBox(cx, 0.96, -len * 0.38, laneW * 0.88, 1.68, 0.44, { materialRole: 'primary', layer: 'body' });
          // Stylized motorcycle body
          batcher.addBox(cx, 0.44, 0.12, 0.32, 0.42, 1.08, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, 0.62, 0.28, 0.24, 0.12, 0.48, { materialRole: 'rubber', layer: 'body' });
          batcher.addBox(cx, 0.7, -0.26, 0.28, 0.26, 0.34, { materialRole: 'glass', rotXDeg: 28, layer: 'detail' });
          arcAddMotorcycleHandlebars(batcher, cx, 0.84, -0.18, 0.52);
          arcAddCRTMonitorAssembly(group, batcher, cx, 1.16, -len * 0.12, monW * 0.88, monW * 0.54, cfg, { tiltDeg: -10, screenMode: cfg.screenMode || 'arcade_racing' });
        } else {
          // Seated driving cockpit / twin / linked / deluxe motion / truck
          const platformH = mType === 'deluxe_motion' ? 0.26 : 0.1;
          batcher.addBox(cx, platformH * 0.5, 0, laneW, platformH, len, { materialRole: 'frame', layer: 'body' });
          if (mType === 'deluxe_motion') {
            batcher.addCylinder(cx - 0.26, 0.14, 0.32, 0.05, 0.06, 0.24, 8, 'y', 'chrome', 'detail');
            batcher.addCylinder(cx + 0.26, 0.14, 0.32, 0.05, 0.06, 0.24, 8, 'y', 'chrome', 'detail');
          }
          // Front monitor cowl
          batcher.addBox(cx, platformH + 0.68, dashZ - 0.28, laneW * 0.94, 1.36, 0.44, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, platformH + 0.54, dashZ + 0.16, laneW * 0.84, 0.42, 0.24, { materialRole: 'secondary', rotXDeg: 18, layer: 'body' });
          arcAddCRTMonitorAssembly(group, batcher, cx, platformH + 0.98, dashZ + 0.08, monW * 0.86, monW * 0.5, cfg, { tiltDeg: -8, screenMode: cfg.screenMode || 'arcade_racing' });
          if (cfg.tripleMonitors) {
            arcAddCRTMonitorAssembly(group, batcher, cx - monW * 0.72, platformH + 0.98, dashZ + 0.18, monW * 0.54, monW * 0.46, cfg, { tiltDeg: 0, screenMode: cfg.screenMode || 'arcade_racing' });
            arcAddCRTMonitorAssembly(group, batcher, cx + monW * 0.72, platformH + 0.98, dashZ + 0.18, monW * 0.54, monW * 0.46, cfg, { tiltDeg: 0, screenMode: cfg.screenMode || 'arcade_racing' });
          }
          arcAddSteeringWheel(batcher, cx - 0.05, platformH + 0.76, dashZ + 0.34, mType === 'truck_bus_sim' ? 42 : 24, mType === 'truck_bus_sim' ? 0.18 : 0.145);
          arcAddThrottleLever(batcher, cx + 0.26, platformH + 0.64, dashZ + 0.28);
          arcAddFootPedals(batcher, cx, platformH, dashZ + 0.18, 2);
          racBuildSeatUnit(batcher, cx, len * 0.26, 0.54, 12, { rearSpeakers: true });
          if (cfg.rearSpoiler !== false) {
            batcher.addBox(cx, platformH + 1.18, len * 0.34, laneW * 0.88, 0.06, 0.16, { materialRole: 'accent', layer: 'detail' });
          }
          if (i < count - 1) {
            batcher.addBox(cx + stride * 0.5, platformH + 0.4, 0, laneGap, 0.4, len * 0.78, { materialRole: 'frame', layer: 'detail' });
          }
        }
      }

      arcAddMarqueeBox(group, batcher, 0, 1.96, -len * 0.28, Math.max(0.84, totalSpan * 0.92), 0.28, 0.16, 10, cfg.marqueeText || 'Twin Grand Prix', cfg);
      meta.lightSources.push({ id: 'racing_header_glow', position: [0, 1.96, -len * 0.15], color: cfg.emissiveColor || '#4de2ff', radius: 3.2, enabled: cfg.lampLit !== false });
      meta.interaction = {
        interactable: true,
        actionType: 'arcade_racing_drive',
        driverSeatPosition: [0, 0.44, len * 0.26],
        facingDirection: [0, 0, -1],
        steeringWheelPos: [-0.05, 0.86, -len * 0.24 + 0.34],
        pedalLocation: [0, 0.12, -len * 0.24 + 0.18]
      };
    }
  });

  registerObjectFamily({
    id: 'shooting_action_cabinet',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Shooting & Action Machines',
    label: 'Shooting & Light-Gun Arcade Cabinets',
    description: 'Light-gun shooter cabinets, dual-blaster theater booths, mounted turret guns, and western/sci-fi target galleries.',
    attachmentProfile: 'ground_standing',
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'family_entertainment'],
    tags: ['shooter', 'light_gun', 'turret', 'gallery', 'blaster', 'arcade'],
    schema: [
      { group: 'Shooter Machine Layout', tab: 'structure' },
      {
        key: 'shooterStyle',
        label: 'Cabinet Style',
        type: 'select',
        tab: 'structure',
        default: 'dual_gun_upright',
        options: [
          ['classic_single_gun', 'Classic Single Light-Gun'],
          ['dual_gun_upright', 'Dual-Gun Upright Cabinet'],
          ['seated_theater', 'Seated Rail-Shooter Booth'],
          ['mounted_turret', 'Mounted Twin-Turret Blaster'],
          ['western_gallery', 'Western Target Gallery']
        ]
      },
      { key: 'width', label: 'Width', type: 'range', tab: 'structure', min: 0.78, max: 1.65, step: 0.04, unit: 'm', default: 1.08 },
      { key: 'depth', label: 'Depth', type: 'range', tab: 'structure', min: 0.82, max: 2.15, step: 0.05, unit: 'm', default: 1.28 },
      { key: 'marqueeText', label: 'Marquee Title', type: 'text', tab: 'details', default: 'Alien Siege', maxLength: 22 },
      { key: 'screenMode', label: 'Screen Display', type: 'select', tab: 'details', default: 'arcade_shooter', options: ARCADE_SCREEN_CHOICES }
    ],
    presets: [
      { id: 'classic_light_gun_cab', label: 'Classic Light-Gun Cabinet', locationContext: 'interior', values: { shooterStyle: 'classic_single_gun', width: 0.8, depth: 0.94, marqueeText: 'Target Zero', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'dual_blaster_arcade_cab', label: 'Dual-Blaster Shooting Cab', locationContext: 'interior', values: { shooterStyle: 'dual_gun_upright', width: 1.08, depth: 1.24, marqueeText: 'Time Crisis 90', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'seated_rail_shooter_booth', label: 'Seated Rail-Shooter Booth', locationContext: 'interior', values: { shooterStyle: 'seated_theater', width: 1.38, depth: 1.98, marqueeText: 'Star Defender', paletteFamily: 'modern_family_entertainment' } },
      { id: 'mounted_turret_gun_cab', label: 'Mounted Turret Blaster Arcade', locationContext: 'interior', values: { shooterStyle: 'mounted_turret', width: 1.18, depth: 1.38, marqueeText: 'Mecha Storm', paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'western_target_gallery', label: 'Western Target Shooting Gallery', locationContext: 'interior', values: { shooterStyle: 'western_gallery', width: 1.48, depth: 1.12, marqueeText: 'Outlaw Trail', paletteFamily: 'home_game_room' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const style = cfg.shooterStyle || 'dual_gun_upright';
      const w = clamp(Number(cfg.width) || 1.08, 0.78, 1.65);
      const d = clamp(Number(cfg.depth) || 1.28, 0.82, 2.15);

      batcher.addBox(0, 0.98, -d * 0.28, w, 1.96, 0.42, { materialRole: 'primary', layer: 'body' });
      // Side speaker columns
      batcher.addBox(-w * 0.45, 1.05, 0.08, 0.14, 1.85, 0.24, { materialRole: 'accent', layer: 'detail' });
      batcher.addBox(w * 0.45, 1.05, 0.08, 0.14, 1.85, 0.24, { materialRole: 'accent', layer: 'detail' });

      if (style === 'western_gallery') {
        batcher.addBox(0, 1.22, -d * 0.24, w * 0.84, 0.92, 0.4, { materialRole: 'wood', layer: 'body' });
        for (let t = 0; t < 4; t++) {
          batcher.addCylinder((t - 1.5) * (w * 0.18), 1.32 - (t % 2) * 0.22, -d * 0.24 + 0.22, 0.06, 0.06, 0.03, 12, 'z', t % 2 === 0 ? 'accent' : 'secondary', 'detail');
        }
      } else {
        arcAddCRTMonitorAssembly(group, batcher, 0, 1.34, -d * 0.02, w * 0.74, 0.58, cfg, { tiltDeg: -10, screenMode: cfg.screenMode || 'arcade_shooter' });
      }

      const gunPedZ = d * 0.24;
      batcher.addBox(0, 0.46, gunPedZ, w * 0.82, 0.92, 0.34, { materialRole: 'secondary', layer: 'body' });
      const mounted = style === 'mounted_turret' || style === 'western_gallery';
      if (style === 'classic_single_gun') {
        arcAddLightGun(batcher, 0, 0.92, gunPedZ, mounted, { gunRole: 'accent' });
      } else {
        arcAddLightGun(batcher, -w * 0.24, 0.92, gunPedZ, mounted, { gunRole: 'accent' });
        arcAddLightGun(batcher, w * 0.24, 0.92, gunPedZ, mounted, { gunRole: 'neonGlow' });
      }

      if (style === 'seated_theater') {
        batcher.addBox(0, 0.04, 0, w, 0.08, d, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(-w * 0.48, 1.0, 0.12, 0.06, 1.9, d * 0.75, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(w * 0.48, 1.0, 0.12, 0.06, 1.9, d * 0.75, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 1.96, 0.12, w, 0.08, d * 0.75, { materialRole: 'frame', layer: 'body' });
        racBuildSeatUnit(batcher, 0, d * 0.36, w * 0.72, 8, { rearSpeakers: false });
      }

      arcAddCoinDoor(batcher, 0, 0.36, gunPedZ + 0.17, 0.26, 0.32, { paymentStyle: 'hybrid' });
      arcAddMarqueeBox(group, batcher, 0, 2.02, -d * 0.08, w * 0.96, 0.28, 0.18, 12, cfg.marqueeText || 'Alien Siege', cfg);
      meta.lightSources.push({ id: 'shooter_marquee', position: [0, 2.02, 0.1], color: cfg.emissiveColor || '#4de2ff', radius: 2.8, enabled: cfg.lampLit !== false });
      meta.interaction = {
        interactable: true,
        actionType: 'arcade_light_gun_play',
        playerStandingPosition: [0, 0, d * 0.6],
        controlPanelPos: [0, 0.96, gunPedZ]
      };
    }
  });

  registerObjectFamily({
    id: 'rhythm_music_machine',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Rhythm & Music Games',
    label: 'Rhythm, Dance & Music Arcade Machines',
    description: 'Single/dual arrow dance floor stages, 5-pad drum cabinets, guitar stations, DJ turntables, 4x4 cube rhythm grids, and karaoke booths.',
    attachmentProfile: 'ground_standing',
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'mall', 'gaming_lounge', 'bowling_alley'],
    tags: ['rhythm', 'dance', 'ddr', 'music', 'drum', 'dj', 'karaoke', 'guitar', 'neon'],
    schema: [
      { group: 'Rhythm Station Type', tab: 'structure' },
      {
        key: 'rhythmType',
        label: 'Machine Type',
        type: 'select',
        tab: 'structure',
        default: 'dual_dance',
        options: [
          ['single_dance', 'Compact Single Dance Stage'],
          ['dual_dance', 'Dual Dance Floor Stage'],
          ['drum_station', 'Electronic Drum Kit Cabinet'],
          ['dj_turntable', 'Dj Turntable & Keys Station'],
          ['guitar_stage', 'Dual Guitar Rhythm Rig'],
          ['matrix_grid', 'Glowing Cube Button Grid'],
          ['karaoke_booth', 'Private Karaoke Booth']
        ]
      },
      { key: 'padCount', label: 'Stage Dance Pads', type: 'range', tab: 'structure', min: 1, max: 2, step: 1, default: 2 },
      { key: 'supportBar', label: 'Rear Support Bar', type: 'boolean', tab: 'details', default: true },
      { key: 'lightTowers', label: 'Speaker Light Towers', type: 'boolean', tab: 'details', default: true },
      { key: 'marqueeText', label: 'Title Marquee', type: 'text', tab: 'details', default: 'Dance Fever', maxLength: 20 }
    ],
    presets: [
      { id: 'dual_dance_stage_cab', label: 'Dual Dance Pad Machine', locationContext: 'interior', values: { rhythmType: 'dual_dance', padCount: 2, marqueeText: 'Step Mania Dx', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'compact_single_dance_cab', label: 'Compact Single Dance Cab', locationContext: 'interior', values: { rhythmType: 'single_dance', padCount: 1, marqueeText: 'Beat Step Mini', paletteFamily: 'modern_family_entertainment' } },
      { id: 'electronic_drum_arcade', label: 'Electronic Drum Rhythm Station', locationContext: 'interior', values: { rhythmType: 'drum_station', marqueeText: 'Drum Hero Live', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'dj_turntable_beat_cab', label: 'Dj Turntable & Key Cabinet', locationContext: 'interior', values: { rhythmType: 'dj_turntable', marqueeText: 'Beat Mix 2x', paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'guitar_shredder_station', label: 'Twin Guitar Rhythm Cabinet', locationContext: 'interior', values: { rhythmType: 'guitar_stage', marqueeText: 'Chord Legend', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'neon_cube_matrix_cab', label: 'Musical 4x4 Button Grid Cab', locationContext: 'interior', values: { rhythmType: 'matrix_grid', marqueeText: 'Pulse Grid', paletteFamily: 'modern_family_entertainment' } },
      { id: 'enclosed_karaoke_booth', label: 'Karaoke Singing Booth', locationContext: 'interior', values: { rhythmType: 'karaoke_booth', marqueeText: 'Karaoke Star', paletteFamily: 'modern_family_entertainment' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const rType = cfg.rhythmType || 'dual_dance';

      if (rType === 'karaoke_booth') {
        batcher.addBox(0, 0.05, 0, 1.48, 0.1, 1.42, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 1.08, -0.66, 1.48, 2.06, 0.1, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(-0.7, 1.08, 0, 0.08, 2.06, 1.32, { materialRole: 'glass', layer: 'body' });
        batcher.addBox(0.7, 1.08, 0, 0.08, 2.06, 1.32, { materialRole: 'glass', layer: 'body' });
        batcher.addBox(0, 2.12, 0, 1.48, 0.08, 1.42, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 0.42, 0.36, 1.18, 0.46, 0.38, { materialRole: 'upholstery', layer: 'body' });
        arcAddCRTMonitorAssembly(group, batcher, 0, 1.24, -0.52, 0.84, 0.48, cfg, { tiltDeg: -6, screenStyle: 'lcd_flat', screenMode: 'arcade_rhythm' });
        // Twin karaoke mic stands
        for (const mx of [-0.28, 0.28]) {
          batcher.addCylinder(mx, 0.72, -0.18, 0.012, 0.016, 0.96, 8, 'y', 'chrome', 'detail');
          batcher.addChamferBox(mx, 1.22, -0.18, 0.036, 0.056, 0.036, 0.01, { materialRole: 'accent', layer: 'detail' });
        }
        arcAddMarqueeBox(group, batcher, 0, 2.24, 0.62, 1.12, 0.24, 0.12, 0, cfg.marqueeText || 'Karaoke', cfg);
        meta.lightSources.push({ id: 'karaoke_glow', position: [0, 1.9, 0], color: cfg.emissiveColor || '#ff4da6', radius: 2.5, enabled: cfg.lampLit !== false });
        return;
      }

      if (rType === 'single_dance' || rType === 'dual_dance') {
        const pads = rType === 'single_dance' ? 1 : clamp(Math.round(cfg.padCount || 2), 1, 2);
        const stageW = pads === 2 ? 1.92 : 1.04;
        batcher.addBox(0, 0.98, -0.78, stageW * 0.92, 1.92, 0.56, { materialRole: 'primary', layer: 'body' });
        arcAddCRTMonitorAssembly(group, batcher, 0, 1.38, -0.48, Math.min(1.18, stageW * 0.64), 0.68, cfg, { tiltDeg: -8, screenMode: 'arcade_rhythm' });

        // Illuminated arrow stage deck
        batcher.addBox(0, 0.045, 0.26, stageW, 0.09, 1.18, { materialRole: 'frame', layer: 'body' });
        for (let p = 0; p < pads; p++) {
          const px = pads === 2 ? (p === 0 ? -0.48 : 0.48) : 0;
          batcher.addBox(px, 0.092, 0.26, 0.82, 0.012, 0.82, { materialRole: 'secondary', layer: 'detail' });
          for (const [ax, az, role] of [[0, -0.25, 'accent'], [0, 0.25, 'signalGreen'], [-0.25, 0, 'neonGlow'], [0.25, 0, 'accent']]) {
            batcher.addBox(px + ax, 0.1, 0.26 + az, 0.22, 0.014, 0.22, { materialRole: role, layer: 'detail' });
          }
          if (cfg.supportBar !== false) {
            batcher.addCylinder(px - 0.34, 0.54, 0.72, 0.022, 0.022, 0.92, 8, 'y', 'chrome', 'detail');
            batcher.addCylinder(px + 0.34, 0.54, 0.72, 0.022, 0.022, 0.92, 8, 'y', 'chrome', 'detail');
            batcher.addCylinder(px, 1.0, 0.72, 0.024, 0.024, 0.7, 8, 'x', 'chrome', 'detail');
          }
        }
        if (cfg.lightTowers !== false) {
          for (const sx of [-stageW * 0.44, stageW * 0.44]) {
            batcher.addBox(sx, 1.18, -0.48, 0.16, 1.75, 0.22, { materialRole: 'frame', layer: 'detail' });
            batcher.addBox(sx, 1.18, -0.36, 0.08, 1.45, 0.02, { materialRole: 'neonGlow', layer: 'detail' });
          }
        }
        arcAddMarqueeBox(group, batcher, 0, 2.06, -0.58, stageW * 0.94, 0.28, 0.18, 12, cfg.marqueeText || 'Step Mania', cfg);
        meta.lightSources.push({ id: 'dance_marquee', position: [0, 2.06, -0.3], color: cfg.emissiveColor || '#ff4da6', radius: 3.4, enabled: cfg.lampLit !== false });
        meta.interaction = {
          interactable: true,
          actionType: 'arcade_dance_stage',
          playerStandingPosition: [0, 0.09, 0.26]
        };
        return;
      }

      // Drum, DJ, Guitar, Matrix grid cabinets
      const cabW = rType === 'guitar_stage' ? 1.38 : 0.94;
      batcher.addBox(0, 0.92, -0.26, cabW, 1.84, 0.44, { materialRole: 'primary', layer: 'body' });
      arcAddCRTMonitorAssembly(group, batcher, 0, 1.36, 0.06, cabW * 0.74, 0.56, cfg, { tiltDeg: -10, screenMode: 'arcade_rhythm' });
      batcher.addBox(0, 0.46, 0.24, cabW * 0.88, 0.92, 0.36, { materialRole: 'secondary', layer: 'body' });

      if (rType === 'drum_station') {
        for (let d = 0; d < 5; d++) {
          const dx = (d - 2) * 0.16;
          const dy = d % 2 === 1 ? 1.04 : 0.94;
          batcher.addCylinder(dx, dy, 0.26 - (d % 2) * 0.06, 0.072, 0.072, 0.032, 12, 'y', d === 2 ? 'accent' : 'neonGlow', 'detail');
        }
        arcAddFootPedals(batcher, 0, 0.02, 0.46, 1);
      } else if (rType === 'guitar_stage') {
        for (const gx of [-0.34, 0.34]) {
          batcher.addBox(gx, 0.98, 0.32, 0.18, 0.26, 0.04, { materialRole: gx < 0 ? 'accent' : 'neonGlow', rotXDeg: 24, layer: 'detail' });
          batcher.addBox(gx + 0.06, 1.18, 0.38, 0.04, 0.38, 0.025, { materialRole: 'wood', rotXDeg: 24, rotZDeg: -22, layer: 'detail' });
        }
      } else if (rType === 'matrix_grid') {
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            batcher.addBox((col - 1.5) * 0.11, 0.94 + (row - 1.5) * 0.02, 0.18 + (row - 1.5) * 0.07, 0.082, 0.024, 0.056, {
              materialRole: (row + col) % 2 === 0 ? 'neonGlow' : 'accent',
              layer: 'detail'
            });
          }
        }
      } else {
        // DJ turntable station
        for (const tx of [-0.26, 0.26]) {
          batcher.addCylinder(tx, 0.94, 0.24, 0.12, 0.12, 0.024, 14, 'y', 'frame', 'detail');
          batcher.addCylinder(tx, 0.955, 0.24, 0.045, 0.045, 0.01, 10, 'y', 'neonGlow', 'detail');
        }
        arcAddPushbuttons(batcher, 0, 0.93, 0.24, 6, 'illuminated');
      }

      arcAddCoinDoor(batcher, 0, 0.36, 0.42, 0.24, 0.3, { paymentStyle: 'hybrid' });
      arcAddMarqueeBox(group, batcher, 0, 1.96, 0.02, cabW * 0.96, 0.26, 0.18, 12, cfg.marqueeText || 'Beat Mix', cfg);
      meta.lightSources.push({ id: 'rhythm_marquee', position: [0, 1.96, 0.18], color: cfg.emissiveColor || '#4de2ff', radius: 2.8, enabled: cfg.lampLit !== false });
    }
  });
}
