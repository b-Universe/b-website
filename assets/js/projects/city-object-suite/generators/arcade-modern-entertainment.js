import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { arcAddControlPanel, arcAddPlushOrToyPrize } from './arcade-controls.js';

export function registerArcadeModernAndRetailFamilies() {
  registerObjectFamily({
    id: 'vr_interactive_attraction',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Modern Vr & Interactive Attractions',
    label: 'Modern Vr & Interactive Attractions',
    description: 'Omnidirectional Vr treadmills, enclosed Vr motion capsules, overhead cable gantry booths, headset charging docks, touch tables, and holographic pods.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'large',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'superhero_base', 'gaming_lounge'],
    tags: ['vr', 'treadmill', 'motion_capsule', 'gantry', 'touchscreen', 'hologram', 'modern'],
    schema: [
      { group: 'Vr Attraction System', tab: 'structure' },
      {
        key: 'vrType',
        label: 'Attraction Format',
        type: 'select',
        tab: 'structure',
        default: 'vr_treadmill',
        options: [
          ['vr_treadmill', '360-Degree Vr Walking Treadmill'],
          ['motion_capsule', 'Enclosed Vr Motion Capsule Pod'],
          ['overhead_gantry', 'Arena Vr Overhead Gantry Booth'],
          ['headset_dock', 'Vr Headset & Controller Charge Stand'],
          ['touch_table', 'Multiplayer Capacitive Touch Table'],
          ['holo_pod', 'Futuristic Holographic Game Pod']
        ]
      },
      { key: 'signText', label: 'Zone Banner', type: 'text', tab: 'details', default: 'Vr Arena', maxLength: 18 }
    ],
    presets: [
      { id: 'vr_360_walking_treadmill', label: '360-Degree Vr Omnidirectional Treadmill', locationContext: 'interior', values: { vrType: 'vr_treadmill', signText: 'Omni Vr', paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'vr_motion_capsule_pod', label: 'Enclosed Vr Motion Capsule Pod', locationContext: 'interior', values: { vrType: 'motion_capsule', signText: 'Vr Motion', paletteFamily: 'modern_family_entertainment' } },
      { id: 'vr_overhead_gantry_booth', label: 'Arena Vr Overhead Cable Gantry', locationContext: 'interior', values: { vrType: 'overhead_gantry', signText: 'Vr Zone', paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'vr_headset_charge_stand', label: 'Multi-Headset Vr Locker & Charge Dock', locationContext: 'interior', values: { vrType: 'headset_dock', signText: 'Vr Gear', paletteFamily: 'modern_family_entertainment' } },
      { id: 'multiplayer_touchscreen_table', label: '4-Player Capacitive Touch Game Table', locationContext: 'interior', values: { vrType: 'touch_table', paletteFamily: 'modern_family_entertainment' } },
      { id: 'holo_cyber_game_terminal', label: 'Futuristic Holographic Game Pod', locationContext: 'interior', values: { vrType: 'holo_pod', signText: 'Holo Sim', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const vType = cfg.vrType || 'vr_treadmill';
      const banner = cfg.signText || 'Vr Arena';

      if (vType === 'touch_table') {
        const w = 1.48;
        const d = 1.02;
        batcher.addBox(0, 0.36, 0, w * 0.55, 0.68, d * 0.55, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 0.74, 0, w, 0.1, d, { materialRole: 'primary', layer: 'body' });
        objCreateScreenPlane(group, 'futuristic_hud', w - 0.14, d - 0.14, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 73, { x: 0, y: 0.798, z: 0, rotX: -Math.PI * 0.5, name: 'TouchTableScreen' });
        meta.lightSources = [{ type: 'point', position: [0, 1.05, 0], color: cfg.emissiveColor || '#4de2ff', intensity: 0.65, distance: 2.2 }];
        meta.interaction = { interactable: true, actionType: 'arcade_touch_table', playerStandingPosition: [0, 0, 0.9] };
        return;
      }

      if (vType === 'headset_dock') {
        batcher.addBox(0, 0.9, 0, 0.95, 1.8, 0.48, { materialRole: 'primary', layer: 'body' });
        for (const hy of [0.82, 1.28]) {
          for (const hx of [-0.24, 0.24]) {
            batcher.addBox(hx, hy, 0.25, 0.2, 0.1, 0.12, { materialRole: 'frame', layer: 'detail' });
            batcher.addBox(hx, hy, 0.315, 0.16, 0.03, 0.02, { materialRole: 'neonGlow', layer: 'detail' });
          }
        }
        objCreateSignPlane(group, banner, 0.8, 0.18, cfg.primaryColor || '#141a2e', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.66, z: 0.248, name: 'VrDockSign' });
        meta.interaction = { interactable: true, actionType: 'arcade_vr_dock', playerStandingPosition: [0, 0, 0.72], headsetRackPos: [0, 1.28, 0.3] };
        return;
      }

      if (vType === 'holo_pod') {
        batcher.addCylinder(0, 0.12, 0, 0.72, 0.78, 0.24, 12, 'y', 'frame', 'body');
        batcher.addCylinder(0, 0.42, 0, 0.46, 0.54, 0.36, 12, 'y', 'primary', 'body');
        batcher.addCylinder(0, 0.62, 0, 0.4, 0.4, 0.04, 12, 'y', 'neonGlow', 'detail');
        batcher.addChamferBox(0, 1.18, 0, 0.48, 0.58, 0.48, 0.08, { materialRole: 'glass', layer: 'detail' });
        batcher.addBox(0, 1.16, -0.58, 0.96, 2.24, 0.18, { materialRole: 'frame', layer: 'body' });
        objCreateSignPlane(group, banner, 0.84, 0.2, cfg.primaryColor || '#101828', cfg.emissiveColor || '#4de2ff', { x: 0, y: 2.14, z: -0.48, name: 'HoloPodBanner' });
        meta.lightSources = [{ type: 'point', position: [0, 1.18, 0], color: cfg.emissiveColor || '#4de2ff', intensity: 0.9, distance: 2.8 }];
        meta.interaction = { interactable: true, actionType: 'arcade_holo_pod', playerStandingPosition: [0, 0, 1.05] };
        return;
      }

      if (vType === 'motion_capsule') {
        batcher.addBox(0, 0.14, 0, 1.38, 0.28, 1.88, { materialRole: 'frame', layer: 'body' });
        batcher.addChamferBox(0, 1.06, -0.1, 1.24, 1.56, 1.48, 0.18, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 0.82, 0.08, 0.72, 0.86, 0.72, { materialRole: 'accent', layer: 'detail' });
        objCreateScreenPlane(group, 'futuristic_hud', 0.86, 0.48, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 74, { x: 0, y: 1.56, z: 0.66, name: 'MotionCapsuleFrontScreen' });
        objCreateSignPlane(group, banner, 0.96, 0.2, cfg.primaryColor || '#101828', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.98, z: 0.45, name: 'VrMotionBanner' });
        meta.interaction = { interactable: true, actionType: 'arcade_vr_capsule', seatPosition: [0, 0.82, 0.08] };
        return;
      }

      if (vType === 'overhead_gantry') {
        const w = 1.68;
        const d = 1.68;
        batcher.addBox(0, 0.03, 0, w, 0.06, d, { materialRole: 'frame', layer: 'body' });
        for (const [px, pz] of [[-w * 0.45, -d * 0.45], [w * 0.45, -d * 0.45], [-w * 0.45, d * 0.45], [w * 0.45, d * 0.45]]) {
          batcher.addBox(px, 1.24, pz, 0.08, 2.42, 0.08, { materialRole: 'frame', layer: 'body' });
        }
        batcher.addBox(0, 2.46, 0, w, 0.12, d, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 1.38, -d * 0.45, w * 0.78, 0.65, 0.08, { materialRole: 'frame', layer: 'detail' });
        objCreateScreenPlane(group, 'futuristic_hud', w * 0.68, 0.46, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 75, { x: 0, y: 1.38, z: -d * 0.4, name: 'GantrySpectatorMonitor' });
        objCreateSignPlane(group, banner, 1.15, 0.22, cfg.primaryColor || '#101828', cfg.emissiveColor || '#4de2ff', { x: 0, y: 2.46, z: d * 0.5 + 0.01, name: 'GantryBanner' });
        meta.interaction = { interactable: true, actionType: 'arcade_vr_arena', playerStandingPosition: [0, 0.06, 0] };
        return;
      }

      // 360-Degree VR omnidirectional walking treadmill
      batcher.addCylinder(0, 0.1, 0, 0.68, 0.72, 0.2, 14, 'y', 'frame', 'body');
      batcher.addCylinder(0, 0.21, 0, 0.56, 0.56, 0.02, 14, 'y', 'neonGlow', 'detail');
      batcher.addBox(0, 0.68, -0.58, 0.2, 1.18, 0.16, { materialRole: 'primary', layer: 'body' });
      batcher.addCylinder(0, 1.06, -0.08, 0.42, 0.42, 0.05, 14, 'y', 'accent', 'detail');
      batcher.addBox(0, 1.48, -0.78, 0.62, 0.52, 0.12, { materialRole: 'frame', layer: 'body' });
      objCreateScreenPlane(group, 'futuristic_hud', 0.54, 0.34, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 76, { x: 0, y: 1.48, z: -0.71, name: 'TreadmillSpectatorDisplay' });
      meta.lightSources = [{ type: 'point', position: [0, 1.2, 0], color: cfg.emissiveColor || '#4de2ff', intensity: 0.7, distance: 2.5 }];
      meta.interaction = { interactable: true, actionType: 'arcade_vr_treadmill', playerStandingPosition: [0, 0.22, 0] };
    }
  });

  registerObjectFamily({
    id: 'game_store_retro_hardware',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Game Store & Retail Displays',
    subcategories: ['Game Store & Retail Displays', 'Retro Electronics & Accessories'],
    label: 'Game Store Displays & Retro Electronics',
    description: 'Playable store demo Crt kiosks, boxed cartridge gondolas, console glass showcases, pegboard controller walls, rolling Av carts, and retro home consoles.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed', 'wall_mounted'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'commerce',
    locationContext: 'interior',
    environmentTags: ['game_store', 'mall', 'retro_arcade', 'residential_game_room'],
    tags: ['retro', 'console', 'crt', 'demo_kiosk', 'cartridge', 'game_store', 'av_cart', 'handheld'],
    schema: [
      { group: 'Display & Hardware Type', tab: 'structure' },
      {
        key: 'retailType',
        label: 'Display / Hardware',
        type: 'select',
        tab: 'structure',
        default: 'demo_kiosk',
        options: [
          ['demo_kiosk', 'Playable Crt Store Demo Kiosk'],
          ['game_gondola', 'Boxed Game & Cartridge Gondola'],
          ['glass_counter', 'Glass Console Showcase Counter'],
          ['pegboard_wall', 'Wall Controller & Cartridge Rack'],
          ['rolling_av_cart', 'Rolling Crt Tv & Vcr Av Cart'],
          ['home_console_set', 'Tabletop Classic Console & Crt Tv'],
          ['handheld_kit', 'Handheld Console & Cartridge Set'],
          ['custom_homebrew_cab', 'Custom Home Arcade Specialty Frame']
        ]
      },
      { key: 'signText', label: 'Display Banner', type: 'text', tab: 'details', default: 'Play Demo', maxLength: 18 }
    ],
    presets: [
      { id: 'playable_crt_store_demo_kiosk', label: '1990s Playable Crt Retail Demo Kiosk', locationContext: 'interior', values: { retailType: 'demo_kiosk', signText: 'Try It Now', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'boxed_game_retail_gondola', label: 'Double-Sided Boxed Game Shelf Gondola', locationContext: 'interior', values: { retailType: 'game_gondola', signText: 'New Releases', paletteFamily: 'modern_family_entertainment' } },
      { id: 'glass_console_display_counter', label: 'Illuminated Glass Console Collector Counter', locationContext: 'interior', values: { retailType: 'glass_counter', signText: 'Retro Consoles', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'controller_headset_pegboard_wall', label: 'Wall Pegboard Controller & Cartridge Rack', locationContext: 'interior', values: { retailType: 'pegboard_wall', attachmentProfile: 'wall_mounted', paletteFamily: 'home_game_room' } },
      { id: 'rolling_av_cart_crt_vcr', label: 'Rolling Crt Television & Console Av Cart', locationContext: 'interior', values: { retailType: 'rolling_av_cart', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'tabletop_classic_console_crt', label: 'Retro Home Console + Crt Set', locationContext: 'interior', values: { retailType: 'home_console_set', attachmentProfile: 'surface_placed', paletteFamily: 'home_game_room' } },
      { id: 'retro_handheld_cartridge_kit', label: 'Handheld Consoles & Cartridge Tray', locationContext: 'interior', values: { retailType: 'handheld_kit', attachmentProfile: 'surface_placed', paletteFamily: 'home_game_room' } },
      { id: 'custom_homebrew_specialty_cab', label: 'Custom Tabletop Fight-Stick Pedestal', locationContext: 'interior', values: { retailType: 'custom_homebrew_cab', signText: 'Homebrew', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const rType = cfg.retailType || 'demo_kiosk';
      const label = cfg.signText || 'Play Demo';

      if (rType === 'handheld_kit') {
        batcher.addBox(0, 0.02, 0, 0.46, 0.04, 0.3, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(-0.1, 0.06, 0.02, 0.1, 0.03, 0.16, { materialRole: 'primary', layer: 'detail' });
        objCreateScreenPlane(group, 'arcade_platform', 0.07, 0.06, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 21, { x: -0.1, y: 0.078, z: -0.01, rotX: -Math.PI * 0.5, name: 'HandheldScreen' });
        for (let i = 0; i < 4; i++) {
          batcher.addBox(0.06 + (i % 2) * 0.08, 0.055, -0.05 + Math.floor(i / 2) * 0.09, 0.065, 0.02, 0.075, { materialRole: i % 2 === 0 ? 'accent' : 'secondary', layer: 'detail' });
        }
        return;
      }

      if (rType === 'home_console_set') {
        batcher.addBox(-0.1, 0.24, -0.06, 0.48, 0.44, 0.42, { materialRole: 'frame', layer: 'body' });
        objCreateScreenPlane(group, 'arcade_platform', 0.38, 0.3, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 22, { x: -0.1, y: 0.26, z: 0.155, name: 'HomeCrtScreen' });
        batcher.addBox(0.24, 0.045, 0.04, 0.26, 0.08, 0.22, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0.24, 0.09, 0.02, 0.12, 0.03, 0.08, { materialRole: 'accent', layer: 'detail' });
        meta.interaction = { interactable: true, actionType: 'retro_home_console' };
        return;
      }

      if (rType === 'pegboard_wall') {
        batcher.addBox(0, 0, -0.03, 1.48, 1.15, 0.04, { materialRole: 'primary', layer: 'body' });
        for (let r = -1; r <= 1; r += 2) {
          for (let c = -2; c <= 2; c++) {
            batcher.addBox(c * 0.26, r * 0.26, 0.07, 0.14, 0.08, 0.14, { materialRole: c % 2 === 0 ? 'accent' : 'secondary', layer: 'detail' });
          }
        }
        return;
      }

      if (rType === 'rolling_av_cart') {
        for (const [cx, cz] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]]) {
          batcher.addCylinder(cx, 0.04, cz, 0.035, 0.035, 0.04, 8, 'x', 'frame', 'body');
          batcher.addBox(cx, 0.56, cz, 0.04, 1.0, 0.04, { materialRole: 'frame', layer: 'body' });
        }
        for (const sy of [0.2, 0.62, 1.06]) {
          batcher.addBox(0, sy, 0, 0.72, 0.04, 0.56, { materialRole: 'primary', layer: 'body' });
        }
        batcher.addBox(0, 0.7, 0, 0.46, 0.12, 0.34, { materialRole: 'secondary', layer: 'detail' });
        batcher.addBox(0, 1.32, -0.02, 0.56, 0.48, 0.44, { materialRole: 'frame', layer: 'body' });
        objCreateScreenPlane(group, 'arcade_attract', 0.44, 0.34, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 23, { x: 0, y: 1.34, z: 0.205, name: 'AvCartCrtScreen' });
        return;
      }

      if (rType === 'game_gondola') {
        const w = 1.65;
        batcher.addBox(0, 0.75, 0, w, 1.48, 0.56, { materialRole: 'primary', layer: 'body' });
        for (const sy of [0.35, 0.72, 1.08]) {
          batcher.addBox(0, sy, 0.3, w - 0.08, 0.03, 0.22, { materialRole: 'secondary', layer: 'detail' });
          for (let c = -3; c <= 3; c++) {
            batcher.addBox(c * 0.2, sy + 0.11, 0.32, 0.14, 0.19, 0.04, { materialRole: c % 2 === 0 ? 'accent' : 'neonGlow', layer: 'detail' });
          }
        }
        objCreateSignPlane(group, label, 0.95, 0.18, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.58, z: 0.02, name: 'GondolaHeader' });
        return;
      }

      if (rType === 'glass_counter') {
        batcher.addBox(0, 0.25, 0, 1.65, 0.5, 0.68, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 0.74, 0, 1.62, 0.46, 0.64, { materialRole: 'glass', layer: 'detail' });
        batcher.addBox(0, 0.99, 0, 1.68, 0.05, 0.7, { materialRole: 'secondary', layer: 'body' });
        for (const cx of [-0.45, 0, 0.45]) {
          batcher.addBox(cx, 0.58, 0, 0.28, 0.08, 0.24, { materialRole: 'frame', layer: 'detail' });
        }
        objCreateSignPlane(group, label, 0.85, 0.16, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 0.26, z: 0.345, name: 'ConsoleCounterSign' });
        return;
      }

      // Playable CRT retail demo kiosk / custom homebrew cab
      const w = 0.74;
      const d = 0.68;
      batcher.addBox(0, 0.96, -0.08, w, 1.92, d * 0.72, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, 0.92, 0.22, w * 0.86, 0.08, 0.32, { materialRole: 'frame', layer: 'body' });
      arcAddControlPanel(batcher, 0, 0.96, 0.24, w * 0.78, 0.24, rType === 'custom_homebrew_cab' ? 'two_player_6btn' : 'single_6btn');
      batcher.addBox(0, 1.42, 0.06, w * 0.76, 0.52, 0.22, { materialRole: 'frame', layer: 'body' });
      objCreateScreenPlane(group, 'arcade_platform', 0.48, 0.36, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 25, { x: 0, y: 1.42, z: 0.175, name: 'StoreDemoCrtScreen' });
      objCreateSignPlane(group, label, w * 0.82, 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.84, z: 0.175, name: 'DemoKioskBanner' });
      meta.interaction = { interactable: true, actionType: 'arcade_demo_kiosk', playerStandingPosition: [0, 0, 0.92] };
    }
  });

  registerObjectFamily({
    id: 'arcade_operations_maintenance',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Security, Maintenance & Operations',
    label: 'Arcade Maintenance, Security & Operations',
    description: 'Pcb soldering & arcade repair benches, rolling joystick parts carts, coin key vaults, dual Cctv dome bars, and attendant service desks.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'ceiling_mounted'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'medium',
    functionalRole: 'maintenance',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'family_entertainment', 'game_store'],
    tags: ['repair_bench', 'soldering', 'parts_cart', 'vault', 'cctv', 'attendant_desk', 'maintenance'],
    schema: [
      { group: 'Operations Unit Type', tab: 'structure' },
      {
        key: 'opsType',
        label: 'Equipment Type',
        type: 'select',
        tab: 'structure',
        default: 'repair_bench',
        options: [
          ['repair_bench', 'Pcb & Arcade Electronics Repair Bench'],
          ['parts_cart', 'Rolling Joystick & Token Parts Cart'],
          ['vault_locker', 'Coin Cash-Box Vault & Key Locker'],
          ['cctv_bar', 'Dual Ceiling Dome Cctv Camera Bar'],
          ['attendant_desk', 'Attendant Change Booth & Desk']
        ]
      }
    ],
    presets: [
      { id: 'arcade_electronics_repair_bench', label: 'Pcb Soldering & Arcade Repair Bench', locationContext: 'interior', values: { opsType: 'repair_bench', paletteFamily: 'industrial' } },
      { id: 'rolling_arcade_parts_tool_cart', label: 'Rolling Token & Joystick Parts Cart', locationContext: 'interior', values: { opsType: 'parts_cart', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'coin_key_security_vault_locker', label: 'Cash Box Vault & Key Peg Locker', locationContext: 'interior', values: { opsType: 'vault_locker', paletteFamily: 'municipal' } },
      { id: 'twin_ceiling_dome_cctv_bar', label: 'Dual Dome Cctv Camera & Security Bar', locationContext: 'interior', values: { opsType: 'cctv_bar', attachmentProfile: 'ceiling_mounted', paletteFamily: 'modern_family_entertainment' } },
      { id: 'attendant_token_service_desk', label: 'Attendant Change Booth & Prize Desk', locationContext: 'interior', values: { opsType: 'attendant_desk', paletteFamily: 'arcade_1980s_retro' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const oType = cfg.opsType || 'repair_bench';

      if (oType === 'cctv_bar') {
        batcher.addBox(0, -0.06, 0, 1.08, 0.08, 0.14, { materialRole: 'frame', layer: 'body' });
        for (const cx of [-0.38, 0.38]) {
          batcher.addCylinder(cx, -0.14, 0, 0.08, 0.08, 0.06, 12, 'y', 'primary', 'body');
          batcher.addChamferBox(cx, -0.21, 0, 0.12, 0.1, 0.12, 0.035, { materialRole: 'frame', layer: 'detail' });
        }
        return;
      }

      if (oType === 'vault_locker') {
        batcher.addBox(0, 0.86, 0, 0.78, 1.72, 0.56, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 0.86, 0.29, 0.68, 1.58, 0.04, { materialRole: 'frame', layer: 'detail' });
        batcher.addCylinder(0.2, 0.92, 0.32, 0.06, 0.06, 0.04, 12, 'z', 'chrome', 'detail');
        return;
      }

      if (oType === 'parts_cart') {
        for (const [cx, cz] of [[-0.36, -0.22], [0.36, -0.22], [-0.36, 0.22], [0.36, 0.22]]) {
          batcher.addCylinder(cx, 0.04, cz, 0.035, 0.035, 0.04, 8, 'x', 'frame', 'body');
          batcher.addBox(cx, 0.48, cz, 0.035, 0.84, 0.035, { materialRole: 'chrome', layer: 'body' });
        }
        for (const sy of [0.16, 0.5, 0.86]) {
          batcher.addBox(0, sy, 0, 0.84, 0.04, 0.54, { materialRole: 'primary', layer: 'body' });
        }
        arcAddPlushOrToyPrize(batcher, -0.2, 0.9, 0, 'robot', 0.75, { role: 'accent' });
        batcher.addBox(0.18, 0.96, 0, 0.26, 0.14, 0.3, { materialRole: 'frame', layer: 'detail' });
        return;
      }

      if (oType === 'attendant_desk') {
        batcher.addBox(0, 0.5, 0, 1.65, 1.0, 0.72, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 1.03, 0, 1.72, 0.06, 0.78, { materialRole: 'secondary', layer: 'body' });
        batcher.addBox(-0.32, 1.24, -0.05, 0.34, 0.32, 0.26, { materialRole: 'frame', layer: 'detail' });
        objCreateScreenPlane(group, 'arcade_highscore', 0.28, 0.22, cfg.emissiveColor || '#ffe45e', cfg.condition, cfg.seed || 44, { x: -0.32, y: 1.26, z: 0.085, name: 'AttendantPosScreen' });
        objCreateSignPlane(group, 'Change & Info', 0.98, 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 0.54, z: 0.368, name: 'AttendantSign' });
        meta.interaction = { interactable: true, actionType: 'arcade_attendant_desk', employeePosition: [0, 0, -0.82], customerInteractionPos: [0, 0, 0.82] };
        return;
      }

      // Electronics PCB repair bench
      batcher.addBox(0, 0.42, 0, 1.56, 0.84, 0.76, { materialRole: 'frame', layer: 'body' });
      batcher.addBox(0, 0.86, 0, 1.62, 0.06, 0.8, { materialRole: 'secondary', layer: 'body' });
      batcher.addBox(0, 1.28, -0.34, 1.56, 0.82, 0.06, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(-0.35, 0.98, -0.1, 0.44, 0.2, 0.3, { materialRole: 'accent', layer: 'detail' });
      batcher.addBox(0.32, 1.06, -0.14, 0.32, 0.32, 0.28, { materialRole: 'frame', layer: 'detail' });
      objCreateScreenPlane(group, 'futuristic_hud', 0.26, 0.22, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 45, { x: 0.32, y: 1.06, z: 0.005, name: 'OscilloscopeCrtScreen' });
      meta.interaction = { interactable: true, actionType: 'arcade_repair_bench', playerStandingPosition: [0, 0, 0.88] };
    }
  });
}
