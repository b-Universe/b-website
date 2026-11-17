import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { getObjectArcadeMarqueeMaterial } from '../materials/materials.js';
import { arcAddCoinDoor, arcAddPushbuttons } from './arcade-controls.js';

function pinAddLegs(batcher, w, d, frontLegH, backLegH, inset = 0.045) {
  const legW = 0.036;
  const positions = [
    [-w * 0.5 + inset, -d * 0.5 + inset, backLegH],
    [w * 0.5 - inset, -d * 0.5 + inset, backLegH],
    [-w * 0.5 + inset, d * 0.5 - inset, frontLegH],
    [w * 0.5 - inset, d * 0.5 - inset, frontLegH]
  ];
  for (const [lx, lz, lh] of positions) {
    batcher.addBox(lx, lh * 0.5 + 0.02, lz, legW, lh, legW, { materialRole: 'chrome', layer: 'body' });
    batcher.addCylinder(lx, 0.012, lz, 0.024, 0.028, 0.024, 8, 'y', 'frame', 'detail');
  }
}

function pinAddPlayfieldElements(batcher, cx, midY, cz, w, playD, tiltRad, includeRamps) {
  const addTiltedBox = (ox, oy, oz, bw, bh, bd, role = 'accent', rotYDeg = 0) => {
    const cos = Math.cos(tiltRad);
    const sin = Math.sin(tiltRad);
    const wy = midY + oy * cos - oz * sin;
    const wz = cz + oz * cos + oy * sin;
    batcher.addBox(cx + ox, wy, wz, bw, bh, bd, {
      materialRole: role,
      layer: 'detail',
      rotX: tiltRad,
      rotYDeg
    });
  };
  const addTiltedCylinder = (ox, oy, oz, rTop, rBot, h, role = 'neonGlow') => {
    const cos = Math.cos(tiltRad);
    const sin = Math.sin(tiltRad);
    const wy = midY + oy * cos - oz * sin;
    const wz = cz + oz * cos + oy * sin;
    batcher.addCylinder(cx + ox, wy, wz, rTop, rBot, h, 10, 'y', role, 'detail');
  };

  // Two lower flippers + slingshot bumpers
  addTiltedBox(-w * 0.14, 0.022, playD * 0.34, w * 0.2, 0.022, 0.032, 'secondary', -24);
  addTiltedBox(w * 0.14, 0.022, playD * 0.34, w * 0.2, 0.022, 0.032, 'secondary', 24);
  addTiltedBox(-w * 0.28, 0.026, playD * 0.2, 0.028, 0.032, 0.14, 'accent', -18);
  addTiltedBox(w * 0.28, 0.026, playD * 0.2, 0.028, 0.032, 0.14, 'accent', 18);

  // Three classic pop bumpers near upper field
  addTiltedCylinder(-w * 0.14, 0.036, -playD * 0.18, 0.042, 0.034, 0.042, 'accent');
  addTiltedCylinder(w * 0.14, 0.036, -playD * 0.18, 0.042, 0.034, 0.042, 'neonGlow');
  addTiltedCylinder(0, 0.036, -playD * 0.05, 0.042, 0.034, 0.042, 'secondary');

  // Target bank and top lane dividers
  for (let i = -2; i <= 2; i++) {
    addTiltedBox(i * w * 0.11, 0.03, -playD * 0.38, 0.018, 0.045, 0.06, i % 2 === 0 ? 'secondary' : 'neonGlow', 0);
  }
  addTiltedBox(-w * 0.34, 0.028, -playD * 0.02, 0.022, 0.038, playD * 0.24, 'neonGlow', 0);
  addTiltedBox(w * 0.36, 0.028, 0.06, 0.018, 0.035, playD * 0.72, 'chrome', 0);

  if (includeRamps) {
    addTiltedBox(-w * 0.22, 0.072, -playD * 0.04, 0.085, 0.012, playD * 0.44, 'glass', 12);
    addTiltedBox(w * 0.22, 0.082, -playD * 0.06, 0.085, 0.012, playD * 0.42, 'accent', -10);
  }
}

export function registerArcadePinballAndSkillFamilies() {
  registerObjectFamily({
    id: 'pinball_machine',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Pinball Machines',
    label: 'Pinball Machines',
    description: 'Sloped pinball cabinets with chrome legs, glass playfields, pop bumpers, flippers, plungers, and illuminated backboxes.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'gaming_lounge', 'residential_game_room', 'superhero_base', 'bowling_alley'],
    tags: ['pinball', 'flippers', 'backbox', 'dmd', 'plunger', 'arcade', 'table'],
    schema: [
      { group: 'Pinball Cabinet Style', tab: 'structure' },
      {
        key: 'pinballStyle',
        label: 'Machine Era',
        type: 'select',
        tab: 'structure',
        default: 'widebody_90s',
        options: [
          ['classic_70s', 'Classic 1970s Electro-Mechanical'],
          ['neon_80s', '1980s Neon Electronic'],
          ['widebody_90s', '1990s Widebody Dmd'],
          ['virtual_digital', 'Modern Virtual Digital Pinball'],
          ['mini_tabletop', 'Mini Tabletop Pinball'],
          ['futuristic_holo', 'Futuristic Holographic Pinball']
        ]
      },
      { key: 'width', label: 'Cabinet Width', type: 'range', tab: 'structure', min: 0.44, max: 0.88, step: 0.02, unit: 'm', default: 0.66 },
      { key: 'depth', label: 'Cabinet Length', type: 'range', tab: 'structure', min: 0.68, max: 1.52, step: 0.02, unit: 'm', default: 1.32 },
      { key: 'cabinetTilt', label: 'Playfield Slope', type: 'range', tab: 'structure', min: 3, max: 12, step: 0.5, unit: 'deg', default: 6.5 },
      { group: 'Backbox, Playfield & Coin Unit', tab: 'details' },
      { key: 'marqueeText', label: 'Backglass Title', type: 'text', tab: 'details', default: 'Comet Strike', maxLength: 22 },
      { key: 'includeRamps', label: 'Wireform & Plastic Ramps', type: 'boolean', tab: 'details', default: true },
      { key: 'includeTopper', label: 'Backbox Neon Topper', type: 'boolean', tab: 'details', default: true },
      { key: 'paymentStyle', label: 'Payment Hardware', type: 'select', tab: 'details', default: 'coin', options: [['coin', 'Coin Door'], ['card', 'Card Reader'], ['hybrid', 'Coin + Card']] }
    ],
    presets: [
      { id: 'classic_70s_em_pinball', label: 'Classic 1970s Score-Reel Pinball', locationContext: 'interior', values: { pinballStyle: 'classic_70s', width: 0.58, depth: 1.28, includeRamps: false, includeTopper: false, marqueeText: 'Lucky Aces', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'neon_80s_pinball', label: '1980s Neon Pinball Machine', locationContext: 'interior', values: { pinballStyle: 'neon_80s', width: 0.62, depth: 1.3, includeRamps: true, marqueeText: 'Laser Knights', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'widebody_90s_pinball', label: '1990s Widebody Dmd Pinball', locationContext: 'interior', values: { pinballStyle: 'widebody_90s', width: 0.72, depth: 1.38, includeRamps: true, includeTopper: true, marqueeText: 'Titan Quest', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'modern_virtual_digital_pinball', label: 'Modern Virtual Digital Pinball', locationContext: 'interior', values: { pinballStyle: 'virtual_digital', width: 0.68, depth: 1.32, paymentStyle: 'card', marqueeText: 'Ultra Pinball', paletteFamily: 'modern_family_entertainment' } },
      { id: 'compact_mini_tabletop_pinball', label: 'Mini Tabletop Pinball', locationContext: 'interior', values: { pinballStyle: 'mini_tabletop', attachmentProfile: 'surface_placed', width: 0.46, depth: 0.74, includeRamps: false, includeTopper: false, marqueeText: 'Pocket Flip', paletteFamily: 'home_game_room' } },
      { id: 'futuristic_cyber_pinball', label: 'Futuristic Holo Pinball Table', locationContext: 'interior', values: { pinballStyle: 'futuristic_holo', width: 0.7, depth: 1.36, paymentStyle: 'card', marqueeText: 'Cyber Orbit', paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'themed_superhero_pinball', label: 'Superhero Collector Pinball', locationContext: 'interior', values: { pinballStyle: 'widebody_90s', width: 0.72, depth: 1.38, includeTopper: true, marqueeText: 'Hero Strike', paletteFamily: 'arcade_1990s_mall' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const style = cfg.pinballStyle || 'widebody_90s';
      const w = clamp(Number(cfg.width) || 0.66, 0.44, 0.88);
      const d = clamp(Number(cfg.depth) || 1.32, 0.68, 1.52);
      const tiltDeg = clamp(Number(cfg.cabinetTilt) || 6.5, 3, 12);
      const tiltRad = degToRad(tiltDeg);
      const isMini = style === 'mini_tabletop';

      const frontLegH = isMini ? 0.04 : 0.72;
      const backLegH = isMini ? 0.08 : 0.76 + Math.sin(tiltRad) * d * 0.4;
      const midY = (frontLegH + backLegH) * 0.5 + 0.16;
      const bodyH = isMini ? 0.16 : 0.28;

      if (!isMini) {
        pinAddLegs(batcher, w, d, frontLegH, backLegH);
      } else {
        batcher.addBox(0, 0.02, 0, w * 0.9, 0.04, d * 0.9, { materialRole: 'frame', layer: 'body' });
      }

      // Main cabinet box tilted slightly toward player
      batcher.addBox(0, midY, 0, w, bodyH, d, { materialRole: 'primary', layer: 'body', rotX: tiltRad });
      // Lockdown bar + side rails
      batcher.addBox(0, midY - Math.sin(tiltRad) * d * 0.46 + bodyH * 0.48, d * 0.48, w + 0.016, 0.045, 0.075, { materialRole: 'chrome', layer: 'detail' });
      batcher.addBox(-w * 0.5 + 0.01, midY + bodyH * 0.49, 0, 0.022, 0.028, d * 0.98, { materialRole: 'chrome', layer: 'detail', rotX: tiltRad });
      batcher.addBox(w * 0.5 - 0.01, midY + bodyH * 0.49, 0, 0.022, 0.028, d * 0.98, { materialRole: 'chrome', layer: 'detail', rotX: tiltRad });

      // Inner playfield surface + glass cover
      if (style === 'virtual_digital' || style === 'futuristic_holo') {
        const pfMode = style === 'futuristic_holo' ? 'futuristic_hud' : 'arcade_maze';
        objCreateScreenPlane(group, pfMode, w - 0.06, d - 0.12, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 41, {
          x: 0,
          y: midY + bodyH * 0.36,
          z: 0,
          rotX: -Math.PI * 0.5 + tiltRad,
          name: 'VirtualPinballPlayfield',
          role: 'pinball_playfield'
        });
      } else {
        batcher.addBox(0, midY + bodyH * 0.34, 0, w - 0.06, 0.02, d - 0.1, { materialRole: 'accent', layer: 'detail', rotX: tiltRad });
        pinAddPlayfieldElements(batcher, 0, midY + bodyH * 0.36, 0, w - 0.08, d - 0.14, tiltRad, cfg.includeRamps !== false);
      }

      batcher.addBox(0, midY + bodyH * 0.51, 0, w - 0.04, 0.012, d - 0.06, { materialRole: 'glass', layer: 'detail', rotX: tiltRad });

      // Side flipper buttons & right front ball plunger
      const frontY = frontLegH + bodyH * 0.55;
      batcher.addCylinder(-w * 0.5 - 0.012, frontY + 0.02, d * 0.34, 0.018, 0.018, 0.022, 8, 'x', 'accent', 'detail');
      batcher.addCylinder(w * 0.5 + 0.012, frontY + 0.02, d * 0.34, 0.018, 0.018, 0.022, 8, 'x', 'accent', 'detail');
      batcher.addCylinder(w * 0.38, frontY - 0.02, d * 0.5 + 0.03, 0.008, 0.008, 0.06, 8, 'z', 'chrome', 'detail');
      batcher.addCylinder(w * 0.38, frontY - 0.02, d * 0.5 + 0.065, 0.02, 0.016, 0.022, 10, 'z', 'frame', 'detail');

      if (!isMini) {
        arcAddCoinDoor(batcher, -w * 0.08, frontY - 0.04, d * 0.5 + 0.008, w * 0.42, 0.24, {
          coinSlots: 2,
          paymentStyle: cfg.paymentStyle || 'coin'
        });
      }

      // Vertical backbox + translite art + DMD / score display
      const backW = w + 0.04;
      const backH = isMini ? 0.32 : 0.72;
      const backD = isMini ? 0.14 : 0.24;
      const backBaseY = backLegH + bodyH * 0.78;
      const backCenterY = backBaseY + backH * 0.5;
      const backZ = -d * 0.46;

      batcher.addBox(0, backCenterY, backZ, backW, backH, backD, { materialRole: 'primary', layer: 'body' });
      const transliteMat = getObjectArcadeMarqueeMaterial(
        cfg.marqueeText || 'Comet Strike',
        cfg.primaryColor || '#281642',
        cfg.emissiveColor || '#4de2ff',
        { lit: true, seed: cfg.seed || 77 }
      );
      const translite = new THREE.Mesh(new THREE.PlaneGeometry(backW - 0.06, backH * 0.56), transliteMat);
      translite.position.set(0, backCenterY + backH * 0.14, backZ + backD * 0.5 + 0.006);
      translite.name = 'PinballBackglass';
      group.add(translite);

      // Lower speaker & DMD display panel
      batcher.addBox(0, backBaseY + backH * 0.16, backZ + backD * 0.5 + 0.008, backW - 0.05, backH * 0.24, 0.016, { materialRole: 'frame', layer: 'detail' });
      batcher.addBox(0, backBaseY + backH * 0.16, backZ + backD * 0.5 + 0.018, backW * 0.46, backH * 0.14, 0.01, {
        materialRole: style === 'classic_70s' ? 'secondary' : 'neonGlow',
        layer: 'detail'
      });

      if (cfg.includeTopper !== false && !isMini) {
        batcher.addChamferBox(0, backBaseY + backH + 0.075, backZ, backW * 0.72, 0.14, 0.07, 0.025, { materialRole: 'accent', layer: 'detail' });
      }

      meta.lightSources = [
        { type: 'point', position: [0, backCenterY, backZ + 0.24], color: cfg.emissiveColor || '#4de2ff', intensity: 0.75, distance: 2.2 },
        { type: 'point', position: [0, midY + 0.25, 0], color: cfg.accentColor || '#ff2b8a', intensity: 0.55, distance: 1.8 }
      ];
      meta.interaction = {
        interactable: true,
        actionType: 'arcade_pinball_play',
        playerStandingPosition: [0, 0, d * 0.5 + 0.52],
        flipperButtonPositions: [
          [-w * 0.52, frontY + 0.02, d * 0.34],
          [w * 0.52, frontY + 0.02, d * 0.34]
        ],
        plungerPos: [w * 0.38, frontY - 0.02, d * 0.5 + 0.065],
        cabinetState: 'active'
      };
    }
  });

  registerObjectFamily({
    id: 'skill_redemption_alley',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Mechanical & Skill Games',
    subcategories: ['Mechanical & Skill Games', 'Specialty Arcade Cabinets'],
    label: 'Mechanical & Skill Arcade Games',
    description: 'Skee-ball lanes, arcade basketball shootouts, air hockey tables, whack-a-mole, high strikers, mini bowling, shuffleboard, and coin-op kiddie rides.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'large',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'family_entertainment', 'bowling_alley', 'mall'],
    tags: ['skee_ball', 'basketball', 'air_hockey', 'whack_a_mole', 'high_striker', 'shuffleboard', 'bowling', 'kiddie_ride'],
    schema: [
      { group: 'Skill Game Variant', tab: 'structure' },
      {
        key: 'skillType',
        label: 'Game Machine',
        type: 'select',
        tab: 'structure',
        default: 'skee_ball_single',
        options: [
          ['skee_ball_single', 'Classic Skee-Ball Alley'],
          ['skee_ball_twin', 'Twin Skee-Ball Lane Bank'],
          ['basketball_single', 'Single Arcade Basketball'],
          ['basketball_dual', 'Dual Basketball Shootout'],
          ['air_hockey', 'Commercial Air Hockey Table'],
          ['whack_a_mole', 'Whack-A-Mole Hammer Game'],
          ['high_striker', 'Arcade High-Striker Bell Tower'],
          ['kiddie_rocket_ride', 'Coin-Op Mechanical Rocket Ride'],
          ['shuffleboard', 'Arcade Table Shuffleboard'],
          ['mini_bowling', 'Alley Mini-Bowling Cabinet']
        ]
      },
      { key: 'marqueeText', label: 'Header Sign', type: 'text', tab: 'details', default: 'Super Alley', maxLength: 20 },
      { key: 'paymentStyle', label: 'Payment Mechanism', type: 'select', tab: 'details', default: 'hybrid', options: [['coin', 'Coin / Token'], ['card', 'Tap-Card'], ['hybrid', 'Coin + Card']] }
    ],
    presets: [
      { id: 'classic_skee_ball_lane', label: 'Classic Skee-Ball Alley Lane', locationContext: 'interior', values: { skillType: 'skee_ball_single', marqueeText: 'Skee Alley', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'multi_lane_skee_ball_bank', label: 'Twin Skee-Ball Alley Bank', locationContext: 'interior', values: { skillType: 'skee_ball_twin', marqueeText: 'Twin Roll', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'arcade_basketball_single', label: 'Single Arcade Basketball Hoop', locationContext: 'interior', values: { skillType: 'basketball_single', marqueeText: 'Hoop Fever', paletteFamily: 'modern_family_entertainment' } },
      { id: 'dual_basketball_shootout', label: 'Twin Linked Basketball Shootout', locationContext: 'interior', values: { skillType: 'basketball_dual', marqueeText: 'All-Star Dual', paletteFamily: 'modern_family_entertainment' } },
      { id: 'air_hockey_table', label: 'Commercial Air Hockey Table', locationContext: 'interior', values: { skillType: 'air_hockey', marqueeText: 'Turbo Puck', paletteFamily: 'modern_family_entertainment' } },
      { id: 'whack_a_mole_cabinet', label: 'Whack-A-Mole Hammer Cabinet', locationContext: 'interior', values: { skillType: 'whack_a_mole', marqueeText: 'Whack Critters', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'high_striker_bell_tower', label: 'Kiddie & Arcade Hammer Striker', locationContext: 'interior', values: { skillType: 'high_striker', marqueeText: 'Power Test', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'coin_operated_rocket_ride', label: 'Coin-Operated Mechanical Kiddie Ride', locationContext: 'interior', values: { skillType: 'kiddie_rocket_ride', marqueeText: 'Astro Ride', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'tabletop_shuffleboard', label: 'Arcade Table Shuffleboard', locationContext: 'interior', values: { skillType: 'shuffleboard', marqueeText: 'Shuffle Pro', paletteFamily: 'gaming_lounge' in ['a'] ? 'arcade_1980s_retro' : 'home_game_room' } },
      { id: 'arcade_bowling_lane', label: 'Mini Alley Arcade Bowling Lane', locationContext: 'interior', values: { skillType: 'mini_bowling', marqueeText: 'Strike Bowl', paletteFamily: 'modern_family_entertainment' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const kind = cfg.skillType || 'skee_ball_single';
      const title = cfg.marqueeText || 'Super Alley';

      if (kind === 'skee_ball_single' || kind === 'skee_ball_twin' || kind === 'mini_bowling') {
        const lanes = kind === 'skee_ball_twin' ? 2 : 1;
        const laneW = 0.72;
        const totalW = laneW * lanes;
        const len = kind === 'mini_bowling' ? 2.85 : 2.55;
        for (let i = 0; i < lanes; i++) {
          const cx = (i - (lanes - 1) * 0.5) * laneW;
          batcher.addBox(cx, 0.34, 0.1, laneW - 0.04, 0.68, len, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, 0.69, 0.1, laneW - 0.1, 0.03, len - 0.08, { materialRole: 'wood', layer: 'detail' });
          batcher.addBox(cx - laneW * 0.45, 0.78, 0.1, 0.05, 0.16, len, { materialRole: 'accent', layer: 'body' });
          batcher.addBox(cx + laneW * 0.45, 0.78, 0.1, 0.05, 0.16, len, { materialRole: 'accent', layer: 'body' });
          // Target hood / pin deck at rear
          batcher.addBox(cx, 1.32, -len * 0.42, laneW - 0.04, 1.38, 0.58, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, 1.88, -len * 0.35, laneW - 0.08, 0.24, 0.42, { materialRole: 'neonGlow', layer: 'detail' });
          if (kind === 'mini_bowling') {
            for (const px of [-0.14, 0, 0.14]) {
              batcher.addCylinder(cx + px, 0.82, -len * 0.28, 0.025, 0.034, 0.22, 8, 'y', 'secondary', 'detail');
            }
          } else {
            // Sloped target rings
            batcher.addCylinder(cx, 0.92, -len * 0.28, 0.24, 0.24, 0.04, 12, 'y', 'accent', 'detail');
            batcher.addCylinder(cx, 0.94, -len * 0.3, 0.15, 0.15, 0.05, 12, 'y', 'secondary', 'detail');
            batcher.addCylinder(cx, 0.96, -len * 0.32, 0.07, 0.07, 0.06, 10, 'y', 'neonGlow', 'detail');
          }
          // Ball return trough on front right
          batcher.addBox(cx + laneW * 0.3, 0.76, len * 0.42, 0.12, 0.1, 0.46, { materialRole: 'frame', layer: 'detail' });
          arcAddCoinDoor(batcher, cx, 0.44, len * 0.5 + 0.06, 0.28, 0.24, { coinSlots: 2, paymentStyle: cfg.paymentStyle || 'hybrid' });
        }
        objCreateSignPlane(group, title, totalW * 0.86, 0.22, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 1.88, z: -len * 0.13, name: 'AlleyScoreMarquee', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_skee_ball', playerStandingPosition: [0, 0, len * 0.5 + 0.58], cabinetState: 'active' };
        return;
      }

      if (kind === 'basketball_single' || kind === 'basketball_dual') {
        const units = kind === 'basketball_dual' ? 2 : 1;
        const unitW = 0.92;
        const len = 2.35;
        const tall = 2.45;
        for (let i = 0; i < units; i++) {
          const cx = (i - (units - 1) * 0.5) * unitW;
          batcher.addBox(cx, 0.42, 0, unitW - 0.04, 0.84, len, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(cx, 0.86, -0.05, unitW - 0.12, 0.04, len - 0.2, { materialRole: 'accent', layer: 'detail', rotXDeg: 10 });
          // Side cage poles + net rails
          for (const sx of [cx - unitW * 0.46, cx + unitW * 0.46]) {
            batcher.addCylinder(sx, tall * 0.52, -len * 0.45, 0.025, 0.025, tall, 8, 'y', 'chrome', 'body');
            batcher.addCylinder(sx, tall * 0.46, len * 0.1, 0.022, 0.022, tall * 0.68, 8, 'y', 'chrome', 'body');
            batcher.addBox(sx, tall * 0.72, -len * 0.18, 0.03, 0.03, len * 0.65, { materialRole: 'chrome', layer: 'detail' });
          }
          // Backboard & hoop rim
          batcher.addBox(cx, tall - 0.42, -len * 0.42, unitW * 0.78, 0.54, 0.04, { materialRole: 'secondary', layer: 'detail' });
          batcher.addCylinder(cx, tall - 0.54, -len * 0.26, 0.21, 0.19, 0.035, 12, 'y', 'accent', 'detail');
          batcher.addCylinder(cx, tall - 0.66, -len * 0.26, 0.18, 0.12, 0.22, 10, 'y', 'secondary', 'detail');
          // Basketballs in return trough
          batcher.addChamferBox(cx - 0.18, 0.94, len * 0.36, 0.21, 0.21, 0.21, 0.06, { materialRole: 'safetyOrange', layer: 'detail' });
          batcher.addChamferBox(cx + 0.14, 0.94, len * 0.32, 0.21, 0.21, 0.21, 0.06, { materialRole: 'safetyOrange', layer: 'detail' });
          arcAddCoinDoor(batcher, cx, 0.42, len * 0.5 + 0.01, 0.32, 0.28, { coinSlots: 2, paymentStyle: cfg.paymentStyle || 'hybrid' });
        }
        objCreateSignPlane(group, title, unitW * units * 0.85, 0.24, cfg.primaryColor || '#141a2e', cfg.emissiveColor || '#ff6430', { x: 0, y: tall + 0.02, z: -len * 0.4, name: 'BasketballHeader', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_basketball_shootout', playerStandingPosition: [0, 0, len * 0.5 + 0.55], cabinetState: 'active' };
        return;
      }

      if (kind === 'air_hockey' || kind === 'shuffleboard') {
        const w = kind === 'shuffleboard' ? 0.78 : 1.18;
        const len = kind === 'shuffleboard' ? 2.75 : 2.18;
        const h = 0.82;
        batcher.addBox(0, h * 0.78, 0, w, 0.28, len, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, h + 0.02, 0, w - 0.12, 0.025, len - 0.12, { materialRole: kind === 'shuffleboard' ? 'wood' : 'secondary', layer: 'detail' });
        for (const [lx, lz] of [[-w * 0.4, -len * 0.4], [w * 0.4, -len * 0.4], [-w * 0.4, len * 0.4], [w * 0.4, len * 0.4]]) {
          batcher.addBox(lx, h * 0.36, lz, 0.12, h * 0.72, 0.12, { materialRole: 'frame', layer: 'body' });
        }
        if (kind === 'air_hockey') {
          batcher.addBox(0, h + 0.045, 0, w - 0.14, 0.01, 0.025, { materialRole: 'accent', layer: 'detail' });
          // Goal slots + mallets + puck
          batcher.addBox(0, h + 0.04, -len * 0.47, 0.28, 0.04, 0.05, { materialRole: 'frame', layer: 'detail' });
          batcher.addBox(0, h + 0.04, len * 0.47, 0.28, 0.04, 0.05, { materialRole: 'frame', layer: 'detail' });
          batcher.addCylinder(0, h + 0.055, -len * 0.26, 0.05, 0.05, 0.025, 12, 'y', 'accent', 'detail');
          batcher.addCylinder(0.12, h + 0.055, len * 0.28, 0.05, 0.05, 0.025, 12, 'y', 'neonGlow', 'detail');
          batcher.addCylinder(-0.08, h + 0.045, 0.04, 0.036, 0.036, 0.015, 12, 'y', 'secondary', 'detail');
          // Overhead bridge scoreboard
          batcher.addBox(-w * 0.48, h + 0.42, 0, 0.05, 0.82, 0.12, { materialRole: 'chrome', layer: 'body' });
          batcher.addBox(w * 0.48, h + 0.42, 0, 0.05, 0.82, 0.12, { materialRole: 'chrome', layer: 'body' });
          batcher.addBox(0, h + 0.82, 0, w + 0.04, 0.22, 0.18, { materialRole: 'frame', layer: 'body' });
          objCreateSignPlane(group, 'Air Hockey', w * 0.8, 0.16, cfg.primaryColor || '#141a2e', cfg.emissiveColor || '#4de2ff', { x: 0, y: h + 0.82, z: 0.095, name: 'AirHockeyScoreboard', lit: true });
          meta.interaction = { interactable: true, actionType: 'arcade_air_hockey', playerStandingPosition: [0, 0, len * 0.5 + 0.55], cabinetState: 'active' };
        } else {
          batcher.addCylinder(-0.12, h + 0.05, -0.55, 0.032, 0.032, 0.025, 10, 'y', 'accent', 'detail');
          batcher.addCylinder(0.14, h + 0.05, 0.42, 0.032, 0.032, 0.025, 10, 'y', 'neonGlow', 'detail');
          meta.interaction = { interactable: true, actionType: 'arcade_shuffleboard', playerStandingPosition: [0, 0, len * 0.5 + 0.55], cabinetState: 'active' };
        }
        return;
      }

      if (kind === 'whack_a_mole') {
        const w = 0.86;
        const d = 0.94;
        batcher.addBox(0, 0.45, 0, w, 0.9, d, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 0.94, 0, w - 0.06, 0.08, d - 0.16, { materialRole: 'secondary', layer: 'detail' });
        for (const [mx, mz] of [[-0.22, -0.18], [0, -0.18], [0.22, -0.18], [-0.14, 0.12], [0.14, 0.12]]) {
          batcher.addCylinder(mx, 0.99, mz, 0.075, 0.08, 0.03, 10, 'y', 'frame', 'detail');
          batcher.addCylinder(mx, 1.04, mz, 0.055, 0.06, 0.08, 10, 'y', mx === 0 ? 'neonGlow' : 'accent', 'detail');
        }
        // Rested foam hammer + back marquee
        batcher.addCylinder(0.28, 1.02, 0.28, 0.015, 0.015, 0.24, 8, 'z', 'secondary', 'detail');
        batcher.addCylinder(0.28, 1.02, 0.16, 0.045, 0.045, 0.11, 10, 'x', 'accent', 'detail');
        batcher.addBox(0, 1.48, -d * 0.4, w, 1.05, 0.18, { materialRole: 'primary', layer: 'body' });
        objCreateSignPlane(group, title, w * 0.84, 0.24, cfg.primaryColor || '#241838', cfg.emissiveColor || '#ffe45e', { x: 0, y: 1.82, z: -d * 0.3, name: 'WhackMarquee', lit: true });
        arcAddCoinDoor(batcher, 0, 0.42, d * 0.5 + 0.008, 0.34, 0.32, { coinSlots: 2, paymentStyle: cfg.paymentStyle || 'coin' });
        meta.interaction = { interactable: true, actionType: 'arcade_whack_a_mole', playerStandingPosition: [0, 0, d * 0.5 + 0.5], cabinetState: 'active' };
        return;
      }

      if (kind === 'high_striker') {
        const tall = 2.48;
        batcher.addBox(0, 0.22, 0.12, 0.68, 0.44, 0.84, { materialRole: 'primary', layer: 'body' });
        batcher.addCylinder(0, 0.46, 0.32, 0.14, 0.16, 0.08, 12, 'y', 'accent', 'detail');
        batcher.addBox(0, tall * 0.54, -0.22, 0.42, tall * 0.88, 0.18, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, tall * 0.54, -0.12, 0.16, tall * 0.78, 0.03, { materialRole: 'neonGlow', layer: 'detail' });
        batcher.addCylinder(0, tall - 0.1, -0.06, 0.14, 0.15, 0.08, 12, 'y', 'chrome', 'detail');
        arcAddCoinDoor(batcher, 0, 0.22, 0.548, 0.28, 0.22, { coinSlots: 1, paymentStyle: cfg.paymentStyle || 'hybrid' });
        objCreateSignPlane(group, title, 0.48, 0.18, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: tall + 0.06, z: -0.11, name: 'StrikerMarquee', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_high_striker', playerStandingPosition: [0, 0, 0.92], cabinetState: 'active' };
        return;
      }

      // Coin-operated mechanical rocket ride
      batcher.addBox(0, 0.16, 0, 0.72, 0.32, 1.18, { materialRole: 'frame', layer: 'body' });
      batcher.addCylinder(0, 0.44, 0, 0.09, 0.11, 0.26, 10, 'y', 'secondary', 'detail');
      batcher.addCylinder(0, 0.72, 0, 0.24, 0.26, 0.92, 12, 'z', 'primary', 'body');
      batcher.addCone(0, 0.72, 0.64, 0.24, 0.36, 12, 'accent', 'detail', 'z');
      batcher.addBox(-0.34, 0.62, -0.22, 0.24, 0.04, 0.32, { materialRole: 'accent', layer: 'detail', rotZDeg: -22 });
      batcher.addBox(0.34, 0.62, -0.22, 0.24, 0.04, 0.32, { materialRole: 'accent', layer: 'detail', rotZDeg: 22 });
      batcher.addBox(0, 0.45, 0.62, 0.34, 0.55, 0.26, { materialRole: 'secondary', layer: 'body' });
      arcAddPushbuttons(batcher, 0, 0.74, 0.62, 2, 'illuminated');
      arcAddCoinDoor(batcher, 0.365, 0.16, 0.3, 0.22, 0.2, { coinSlots: 1, paymentStyle: 'coin' });
      meta.interaction = { interactable: true, actionType: 'arcade_kiddie_ride', seatPosition: [0, 0.86, -0.05], cabinetState: 'active' };
    }
  });
}
