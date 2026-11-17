import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { getObjectArcadeMarqueeMaterial } from '../materials/materials.js';
import {
  arcAddCoinDoor,
  arcAddJoystick,
  arcAddPlushOrToyPrize,
  arcAddPushbuttons
} from './arcade-controls.js';

function redAddGlassCaseColumns(batcher, cx, y0, h, w, d, role = 'accent') {
  const halfW = w * 0.5 - 0.022;
  const halfD = d * 0.5 - 0.022;
  for (const [px, pz] of [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]]) {
    batcher.addBox(cx + px, y0 + h * 0.5, pz, 0.042, h, 0.042, { materialRole: role, layer: 'body' });
  }
  batcher.addBox(cx, y0 + h * 0.5, 0, w - 0.05, h - 0.04, d - 0.05, { materialRole: 'glass', layer: 'detail' });
}

function redPopulateClawPrizes(batcher, cx, baseY, cz, w, d, density, seed = 17) {
  const kinds = ['bear', 'rabbit', 'cat', 'robot', 'gift_box', 'rocket', 'ball'];
  const roles = ['safetyRed', 'neonGlow', 'warningYellow', 'signalGreen', 'accent', 'safetyOrange'];
  const count = clamp(Math.round(density * 14), 2, 16);
  for (let i = 0; i < count; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const ox = ((col - 1.5) * 0.22 + ((i * 37 + seed) % 7 - 3) * 0.012) * Math.min(1, w / 0.82);
    const oz = ((row - 1.0) * 0.2 + ((i * 53 + seed) % 5 - 2) * 0.012) * Math.min(1, d / 0.78);
    const oy = row >= 2 ? 0.08 : 0;
    arcAddPlushOrToyPrize(batcher, cx + ox, baseY + oy, cz + oz, kinds[(i + seed) % kinds.length], 0.92, {
      role: roles[(i + seed) % roles.length]
    });
  }
}

export function registerArcadeRedemptionAndPrizeFamilies() {
  registerObjectFamily({
    id: 'claw_prize_machine',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Prize & Claw Machines',
    label: 'Claw & Prize Machines',
    description: 'Single, twin, jumbo, and tabletop plush claw cranes, capsule gashapon banks, gumball globe racks, and modern prize lockers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'family_entertainment', 'bowling_alley', 'game_store'],
    tags: ['claw', 'crane', 'plush', 'prize', 'gashapon', 'capsule', 'gumball', 'stacker'],
    schema: [
      { group: 'Prize Machine Type', tab: 'structure' },
      {
        key: 'machineType',
        label: 'Machine Variant',
        type: 'select',
        tab: 'structure',
        default: 'classic_claw',
        options: [
          ['classic_claw', 'Classic Plush Claw Crane'],
          ['double_claw', 'Twin Double-Chamber Claw'],
          ['jumbo_claw', 'Oversized Jumbo Claw'],
          ['mini_tabletop_claw', 'Mini Countertop Claw'],
          ['capsule_gashapon', 'Capsule Gashapon Machine Bank'],
          ['gumball_rack', 'Classic Gumball & Spiral Rack'],
          ['stacker_locker', 'Modern Prize Locker / Stacker']
        ]
      },
      { key: 'width', label: 'Machine Width', type: 'range', tab: 'structure', min: 0.42, max: 1.56, step: 0.02, unit: 'm', default: 0.84 },
      { key: 'height', label: 'Machine Height', type: 'range', tab: 'structure', min: 0.72, max: 2.35, step: 0.02, unit: 'm', default: 1.98 },
      { group: 'Prizes, Claw & Header', tab: 'details' },
      { key: 'prizeDensity', label: 'Prize Fill Density', type: 'range', tab: 'details', min: 0.2, max: 1.0, step: 0.1, default: 0.8 },
      { key: 'marqueeText', label: 'Header Sign', type: 'text', tab: 'details', default: 'Prize Crane', maxLength: 20 },
      { key: 'paymentStyle', label: 'Payment Mechanism', type: 'select', tab: 'details', default: 'hybrid', options: [['coin', 'Coin / Bill'], ['card', 'Tap-Card'], ['hybrid', 'Coin + Card']] }
    ],
    presets: [
      { id: 'classic_plush_claw_crane', label: 'Classic Plush Claw Crane', locationContext: 'interior', values: { machineType: 'classic_claw', width: 0.84, height: 1.98, prizeDensity: 0.8, marqueeText: 'Toy Crane', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'double_twin_claw_machine', label: 'Double Twin-Chamber Claw Machine', locationContext: 'interior', values: { machineType: 'double_claw', width: 1.44, height: 2.02, prizeDensity: 0.9, marqueeText: 'Twin Claw', paletteFamily: 'modern_family_entertainment' } },
      { id: 'jumbo_led_prize_crane', label: 'Oversized Jumbo Prize Crane', locationContext: 'interior', values: { machineType: 'jumbo_claw', width: 1.24, height: 2.28, prizeDensity: 0.9, marqueeText: 'Mega Plush', paletteFamily: 'modern_family_entertainment' } },
      { id: 'mini_tabletop_claw_crane', label: 'Mini Countertop Claw Machine', locationContext: 'interior', values: { machineType: 'mini_tabletop_claw', attachmentProfile: 'surface_placed', width: 0.44, height: 0.78, prizeDensity: 0.7, marqueeText: 'Mini Claw', paletteFamily: 'home_game_room' } },
      { id: 'capsule_gashapon_bank', label: 'Japanese Gashapon Capsule Bank', locationContext: 'interior', values: { machineType: 'capsule_gashapon', width: 0.96, height: 1.62, prizeDensity: 1.0, marqueeText: 'Gacha Toy', paletteFamily: 'modern_family_entertainment' } },
      { id: 'classic_globe_gumball_rack', label: 'Spiral & Triple Gumball Globe Rack', locationContext: 'interior', values: { machineType: 'gumball_rack', width: 0.74, height: 1.42, prizeDensity: 0.8, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'stacker_prize_locker', label: 'Modern Prize Locker / Stacker', locationContext: 'interior', values: { machineType: 'stacker_locker', width: 0.92, height: 2.08, paymentStyle: 'card', marqueeText: 'Prize Lock', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const mType = cfg.machineType || 'classic_claw';
      const w = clamp(Number(cfg.width) || 0.84, 0.42, 1.56);
      const h = clamp(Number(cfg.height) || 1.98, 0.72, 2.35);
      const d = mType === 'mini_tabletop_claw' ? 0.46 : mType === 'capsule_gashapon' ? 0.56 : 0.82;
      const density = clamp(Number(cfg.prizeDensity) ?? 0.8, 0.2, 1.0);

      if (mType === 'capsule_gashapon') {
        const cols = 3;
        batcher.addBox(0, 0.08, 0, w, 0.16, d, { materialRole: 'frame', layer: 'body' });
        for (let r = 0; r < 2; r++) {
          const y0 = 0.18 + r * 0.64;
          for (let c = 0; c < cols; c++) {
            const cx = (c - 1) * (w / cols);
            batcher.addBox(cx, y0 + 0.3, 0, w / cols - 0.03, 0.58, d - 0.04, { materialRole: r === 0 ? 'secondary' : 'primary', layer: 'body' });
            batcher.addBox(cx, y0 + 0.42, d * 0.49, w / cols - 0.08, 0.28, 0.02, { materialRole: 'glass', layer: 'detail' });
            for (let k = 0; k < 3; k++) {
              arcAddPlushOrToyPrize(batcher, cx + (k - 1) * 0.06, y0 + 0.32, 0.1, 'capsule', 0.9, { role: k === 1 ? 'accent' : 'neonGlow' });
            }
            batcher.addCylinder(cx, y0 + 0.18, d * 0.5, 0.028, 0.028, 0.025, 10, 'z', 'chrome', 'detail');
            batcher.addBox(cx, y0 + 0.08, d * 0.48, 0.11, 0.09, 0.04, { materialRole: 'frame', layer: 'detail' });
          }
        }
        objCreateSignPlane(group, cfg.marqueeText || 'Gacha Toy', w * 0.86, 0.18, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.54, z: d * 0.5 + 0.01, name: 'GashaponSign' });
        meta.interaction = { interactable: true, actionType: 'arcade_capsule_dispense', playerPosition: [0, 0, d * 0.5 + 0.52], cabinetState: 'active' };
        return;
      }

      if (mType === 'gumball_rack') {
        batcher.addBox(0, 0.04, 0, w * 0.86, 0.08, 0.44, { materialRole: 'frame', layer: 'body' });
        batcher.addCylinder(-w * 0.25, 0.46, 0, 0.025, 0.025, 0.78, 8, 'y', 'chrome', 'body');
        batcher.addCylinder(w * 0.25, 0.46, 0, 0.025, 0.025, 0.78, 8, 'y', 'chrome', 'body');
        batcher.addBox(0, 0.86, 0, w * 0.88, 0.04, 0.34, { materialRole: 'frame', layer: 'body' });
        for (const [gx, gRole] of [[-w * 0.28, 'accent'], [0, 'neonGlow'], [w * 0.28, 'secondary']]) {
          batcher.addBox(gx, 1.0, 0, 0.18, 0.24, 0.18, { materialRole: 'primary', layer: 'body' });
          batcher.addChamferBox(gx, 1.24, 0, 0.22, 0.24, 0.22, 0.06, { materialRole: 'glass', layer: 'detail' });
          batcher.addChamferBox(gx, 1.21, 0, 0.16, 0.16, 0.16, 0.04, { materialRole: gRole, layer: 'detail' });
          batcher.addCylinder(gx, 1.01, 0.1, 0.024, 0.024, 0.025, 10, 'z', 'chrome', 'detail');
        }
        meta.interaction = { interactable: true, actionType: 'arcade_gumball_vend', playerPosition: [0, 0, 0.62], cabinetState: 'active' };
        return;
      }

      if (mType === 'stacker_locker') {
        const baseH = h * 0.36;
        batcher.addBox(0, h * 0.5, 0, w, h, d, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, baseH + (h - baseH) * 0.42, d * 0.48, w - 0.14, h * 0.46, 0.03, { materialRole: 'glass', layer: 'detail' });
        // Prize pegs inside upper window
        for (let row = 0; row < 2; row++) {
          for (let col = -1; col <= 1; col++) {
            batcher.addBox(col * w * 0.24, baseH + 0.24 + row * 0.34, 0.04, 0.16, 0.02, 0.24, { materialRole: 'chrome', layer: 'detail' });
            arcAddPlushOrToyPrize(batcher, col * w * 0.24, baseH + 0.26 + row * 0.34, 0.05, row === 0 ? 'gift_box' : 'robot', 0.88, { role: col === 0 ? 'secondary' : 'accent' });
          }
        }
        batcher.addBox(-w * 0.24, baseH + 0.12, d * 0.49, 0.26, 0.56, 0.03, { materialRole: 'frame', layer: 'detail' });
        objCreateScreenPlane(group, 'arcade_puzzle', w * 0.38, 0.56, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 92, { x: 0, y: baseH + 0.45, z: d * 0.51, name: 'StackerMatrixScreen' });
        arcAddPushbuttons(batcher, 0, baseH - 0.04, d * 0.56, 2, 'impact');
        batcher.addBox(0, 0.35, d * 0.49, 0.38, 0.28, 0.04, { materialRole: 'frame', layer: 'detail' });
        meta.interaction = { interactable: true, actionType: 'arcade_prize_stacker', playerPosition: [0, 0, d * 0.5 + 0.55], cabinetState: 'active' };
        return;
      }

      // Claw crane cabinets (single, double, jumbo, or mini tabletop)
      const chambers = mType === 'double_claw' ? 2 : 1;
      const baseH = mType === 'mini_tabletop_claw' ? 0.22 : 0.78;
      const chamberH = h - baseH - 0.22;
      batcher.addBox(0, baseH * 0.5, 0, w, baseH, d, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, baseH + 0.04, d * 0.5 + 0.08, w * 0.92, 0.07, 0.18, { materialRole: 'frame', layer: 'body' });

      const chW = w / chambers;
      for (let i = 0; i < chambers; i++) {
        const cx = (i - (chambers - 1) * 0.5) * chW;
        redAddGlassCaseColumns(batcher, cx, baseH, chamberH, chW - 0.02, d, 'accent');
        redPopulateClawPrizes(batcher, cx, baseH + 0.03, 0.04, chW - 0.12, d - 0.14, density, (cfg.seed || 11) + i * 7);
        // Overhead gantry rails + 3-prong mechanical claw
        batcher.addBox(cx, baseH + chamberH - 0.08, 0, chW - 0.1, 0.03, 0.04, { materialRole: 'chrome', layer: 'detail' });
        batcher.addCylinder(cx + 0.04, baseH + chamberH - 0.26, 0.05, 0.012, 0.012, 0.32, 8, 'y', 'chrome', 'detail');
        batcher.addCone(cx + 0.04, baseH + chamberH - 0.44, 0.05, 0.055, 0.08, 6, 'secondary', 'detail');
        // Joystick + drop button
        arcAddJoystick(batcher, cx - chW * 0.16, baseH + 0.08, d * 0.5 + 0.08, 'ball_top');
        arcAddPushbuttons(batcher, cx + chW * 0.08, baseH + 0.08, d * 0.5 + 0.08, 1, 'impact');
        // Prize retrieval chute
        batcher.addBox(cx + chW * 0.24, baseH * 0.56, d * 0.5 + 0.015, 0.22, 0.22, 0.03, { materialRole: 'frame', layer: 'detail' });
      }
      // Illuminated top marquee hood
      batcher.addBox(0, h - 0.11, 0, w, 0.22, d, { materialRole: 'primary', layer: 'body' });
      const topMat = getObjectArcadeMarqueeMaterial(
        cfg.marqueeText || 'Prize Crane',
        cfg.primaryColor || '#2a1640',
        cfg.emissiveColor || '#ff4298',
        { lit: true, seed: cfg.seed || 29 }
      );
      const marquee = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, 0.16), topMat);
      marquee.position.set(0, h - 0.11, d * 0.5 + 0.008);
      marquee.name = 'ClawHeaderMarquee';
      group.add(marquee);

      arcAddCoinDoor(batcher, -w * 0.18, baseH * 0.46, d * 0.5 + 0.008, 0.26, 0.28, { coinSlots: 2, paymentStyle: cfg.paymentStyle || 'hybrid' });
      meta.lightSources = [{ type: 'point', position: [0, h - 0.26, 0.1], color: cfg.emissiveColor || '#fff3c4', intensity: 0.7, distance: 2.0 }];
      meta.interaction = {
        interactable: true,
        actionType: 'arcade_claw_crane',
        playerPosition: [0, 0, d * 0.5 + 0.55],
        joystickPos: [-w * 0.14, baseH + 0.12, d * 0.5 + 0.08],
        prizeChutePos: [w * 0.24, baseH * 0.56, d * 0.5 + 0.03],
        cabinetState: 'active'
      };
    }
  });

  registerObjectFamily({
    id: 'ticket_redemption_game',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Ticket Redemption Games',
    label: 'Ticket Redemption Games',
    description: 'Coin-pusher token cabinets, giant spinning prize wheels, cyclone timing rings, marble drops, plinko boards, and jackpot towers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'mall', 'bowling_alley'],
    tags: ['ticket', 'redemption', 'coin_pusher', 'prize_wheel', 'cyclone', 'plinko', 'jackpot'],
    schema: [
      { group: 'Redemption Game Type', tab: 'structure' },
      {
        key: 'redemptionType',
        label: 'Game Style',
        type: 'select',
        tab: 'structure',
        default: 'coin_pusher',
        options: [
          ['coin_pusher', 'Token Coin-Pusher Cabinet'],
          ['prize_wheel', 'Giant Spinning Prize Wheel'],
          ['cyclone_ring', 'Circular Timing Cyclone Game'],
          ['marble_drop', 'Timing Marble Drop Cabinet'],
          ['plinko_board', 'Illuminated Plinko Prize Drop'],
          ['jackpot_tower', 'Double-Decker Jackpot Spinner']
        ]
      },
      { key: 'marqueeText', label: 'Header Sign', type: 'text', tab: 'details', default: 'Mega Tickets', maxLength: 20 }
    ],
    presets: [
      { id: 'token_coin_pusher_cabinet', label: 'Token Coin-Pusher Machine', locationContext: 'interior', values: { redemptionType: 'coin_pusher', marqueeText: 'Token Push', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'giant_spinning_prize_wheel', label: 'Giant Big-Wheel Ticket Spinner', locationContext: 'interior', values: { redemptionType: 'prize_wheel', marqueeText: 'Big Spin', paletteFamily: 'modern_family_entertainment' } },
      { id: 'cyclone_light_ring_game', label: 'Circular Light-Timing Cyclone Game', locationContext: 'interior', values: { redemptionType: 'cyclone_ring', marqueeText: 'Light Cyclone', paletteFamily: 'modern_family_entertainment' } },
      { id: 'monster_marble_drop_game', label: 'Timing Ball-Drop Redemption Cabinet', locationContext: 'interior', values: { redemptionType: 'marble_drop', marqueeText: 'Drop Bonus', paletteFamily: 'modern_family_entertainment' } },
      { id: 'plinko_prize_drop_board', label: 'Illuminated Pegboard Prize Drop', locationContext: 'interior', values: { redemptionType: 'plinko_board', marqueeText: 'Chip Drop', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'ticket_jackpot_spinner', label: 'Double-Decker Jackpot Spinner Tower', locationContext: 'interior', values: { redemptionType: 'jackpot_tower', marqueeText: 'Jackpot 1000', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const rType = cfg.redemptionType || 'coin_pusher';
      const title = cfg.marqueeText || 'Mega Tickets';

      if (rType === 'cyclone_ring') {
        batcher.addCylinder(0, 0.46, 0, 0.62, 0.66, 0.92, 12, 'y', 'primary', 'body');
        batcher.addCylinder(0, 0.94, 0, 0.64, 0.64, 0.05, 12, 'y', 'accent', 'detail');
        batcher.addCylinder(0, 1.0, 0, 0.56, 0.56, 0.04, 12, 'y', 'neonGlow', 'detail');
        batcher.addCylinder(0, 1.56, 0, 0.14, 0.16, 1.12, 8, 'y', 'chrome', 'body');
        batcher.addBox(0, 2.22, 0, 0.88, 0.28, 0.32, { materialRole: 'primary', layer: 'body' });
        arcAddPushbuttons(batcher, 0, 0.96, 0.62, 3, 'impact');
        objCreateSignPlane(group, title, 0.78, 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 2.22, z: 0.168, name: 'CycloneSign', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_ticket_redemption', playerStandingPosition: [0, 0, 1.15], cabinetState: 'active' };
        return;
      }

      if (rType === 'prize_wheel' || rType === 'jackpot_tower') {
        const tall = rType === 'jackpot_tower' ? 2.45 : 2.15;
        batcher.addBox(0, 0.44, 0, 0.96, 0.88, 0.72, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 1.48, -0.18, 0.96, 1.38, 0.36, { materialRole: 'primary', layer: 'body' });
        batcher.addCylinder(0, 1.46, 0.04, 0.42, 0.42, 0.06, 14, 'z', 'secondary', 'detail');
        batcher.addCylinder(0, 1.46, 0.08, 0.14, 0.14, 0.05, 10, 'z', 'accent', 'detail');
        batcher.addBox(0, 0.92, 0.32, 0.44, 0.08, 0.28, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 0.98, 0.38, 0.06, 0.08, 0.24, { materialRole: 'accent', layer: 'detail', rotXDeg: -24 });
        objCreateSignPlane(group, title, 0.84, 0.22, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ff2b8a', { x: 0, y: tall - 0.12, z: 0.02, name: 'WheelJackpotSign', lit: true });
        arcAddCoinDoor(batcher, 0, 0.42, 0.368, 0.34, 0.36, { coinSlots: 2, includeTicketDispenser: true });
        meta.interaction = { interactable: true, actionType: 'arcade_ticket_redemption', playerStandingPosition: [0, 0, 0.95], cabinetState: 'active' };
        return;
      }

      // Coin pusher, marble drop, or plinko cabinet
      const w = 0.88;
      const d = rType === 'coin_pusher' ? 0.94 : 0.78;
      const h = 2.02;
      batcher.addBox(0, 0.44, 0, w, 0.88, d, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, 1.38, -d * 0.06, w, 1.0, d * 0.84, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, 1.36, d * 0.38, w - 0.08, 0.86, 0.03, { materialRole: 'glass', layer: 'detail' });
      if (rType === 'coin_pusher') {
        batcher.addBox(0, 1.08, 0.02, w - 0.12, 0.08, 0.56, { materialRole: 'secondary', layer: 'detail' });
        batcher.addBox(0, 1.18, -0.1, w - 0.14, 0.14, 0.26, { materialRole: 'chrome', layer: 'detail' });
      } else {
        for (let row = 0; row < 3; row++) {
          for (let col = -2; col <= 2; col++) {
            batcher.addCylinder(col * 0.13 + (row % 2) * 0.06, 1.18 + row * 0.16, 0.22, 0.014, 0.014, 0.04, 8, 'z', 'secondary', 'detail');
          }
        }
        batcher.addBox(0, 1.72, 0.18, 0.14, 0.14, 0.06, { materialRole: 'accent', layer: 'detail' });
      }
      batcher.addBox(0, h - 0.12, 0, w, 0.24, d * 0.9, { materialRole: 'accent', layer: 'body' });
      objCreateSignPlane(group, title, w * 0.84, 0.18, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: h - 0.12, z: d * 0.455, name: 'RedemptionHeader', lit: true });
      arcAddCoinDoor(batcher, 0, 0.42, d * 0.5 + 0.008, 0.36, 0.34, { coinSlots: 2, includeTicketDispenser: true });
      meta.interaction = { interactable: true, actionType: 'arcade_ticket_redemption', playerStandingPosition: [0, 0, d * 0.5 + 0.55], cabinetState: 'active' };
    }
  });

  registerObjectFamily({
    id: 'token_payment_kiosk',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Tokens, Tickets & Payment',
    label: 'Token, Ticket & Card Kiosks',
    description: 'Bill-to-token change machines, dual coin dispensers, tap-card recharge kiosks, ticket-eating counting stations, and countertop token kits.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'small',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'family_entertainment', 'bowling_alley'],
    tags: ['token', 'change_machine', 'kiosk', 'game_card', 'ticket_eater', 'payment'],
    schema: [
      { group: 'Kiosk Function', tab: 'structure' },
      {
        key: 'kioskType',
        label: 'Machine Type',
        type: 'select',
        tab: 'structure',
        default: 'token_changer',
        options: [
          ['token_changer', 'Classic Bill-To-Token Changer'],
          ['dual_changer', 'Twin Heavy-Duty Token Dispenser'],
          ['card_kiosk', 'Modern Tap-Card Recharge Kiosk'],
          ['ticket_eater', 'Self-Service Ticket Eater Station'],
          ['token_bucket_kit', 'Countertop Token Bucket & Ticket Rolls']
        ]
      },
      { key: 'signText', label: 'Front Sign', type: 'text', tab: 'details', default: 'Tokens', maxLength: 18 }
    ],
    presets: [
      { id: 'classic_bill_token_changer', label: 'Classic Bill-To-Token Changer', locationContext: 'interior', values: { kioskType: 'token_changer', signText: 'Tokens Here', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'dual_coin_change_machine', label: 'Twin Heavy-Duty Token Dispenser', locationContext: 'interior', values: { kioskType: 'dual_changer', signText: 'Change', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'tap_card_recharge_kiosk', label: 'Modern Cashless Game-Card Kiosk', locationContext: 'interior', values: { kioskType: 'card_kiosk', signText: 'Reload Card', paletteFamily: 'modern_family_entertainment' } },
      { id: 'ticket_counting_eater_station', label: 'Self-Service Ticket Eater Station', locationContext: 'interior', values: { kioskType: 'ticket_eater', signText: 'Feed Tickets', paletteFamily: 'modern_family_entertainment' } },
      { id: 'counter_token_bucket_ticket_kit', label: 'Countertop Token Bucket & Ticket Rolls', locationContext: 'interior', values: { kioskType: 'token_bucket_kit', attachmentProfile: 'surface_placed', paletteFamily: 'arcade_1980s_retro' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const kType = cfg.kioskType || 'token_changer';
      const label = cfg.signText || 'Tokens';

      if (kType === 'token_bucket_kit') {
        batcher.addCylinder(-0.12, 0.08, 0, 0.08, 0.06, 0.16, 10, 'y', 'primary', 'body');
        batcher.addCylinder(-0.12, 0.155, 0, 0.072, 0.072, 0.02, 10, 'y', 'accent', 'detail');
        batcher.addCylinder(0.1, 0.035, 0.04, 0.065, 0.065, 0.07, 12, 'y', 'accent', 'detail');
        batcher.addCylinder(0.18, 0.035, -0.05, 0.055, 0.055, 0.07, 12, 'y', 'secondary', 'detail');
        meta.interaction = { interactable: true, actionType: 'arcade_token_kit', playerPosition: [0, 0, 0.45] };
        return;
      }

      const w = kType === 'dual_changer' ? 0.88 : 0.62;
      const d = 0.54;
      const h = 1.66;
      batcher.addBox(0, h * 0.44, 0, w, h * 0.88, d, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, h * 0.92, 0, w + 0.03, 0.24, d + 0.02, { materialRole: 'accent', layer: 'body' });
      objCreateSignPlane(group, label, w * 0.84, 0.17, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: h * 0.92, z: d * 0.5 + 0.02, name: 'KioskHeaderSign', lit: true });

      if (kType === 'card_kiosk') {
        objCreateScreenPlane(group, 'futuristic_hud', w * 0.66, 0.42, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed || 51, { x: 0, y: 1.12, z: d * 0.5 + 0.012, name: 'CardKioskTouchscreen' });
        batcher.addBox(-0.1, 0.72, d * 0.5 + 0.02, 0.1, 0.12, 0.04, { materialRole: 'neonGlow', layer: 'detail' });
        batcher.addBox(0.1, 0.72, d * 0.5 + 0.02, 0.12, 0.08, 0.04, { materialRole: 'frame', layer: 'detail' });
      } else if (kType === 'ticket_eater') {
        batcher.addBox(0, 1.08, d * 0.5 + 0.03, w * 0.56, 0.18, 0.08, { materialRole: 'frame', layer: 'detail' });
        batcher.addBox(0, 1.12, d * 0.5 + 0.075, w * 0.36, 0.03, 0.02, { materialRole: 'neonGlow', layer: 'detail' });
        objCreateScreenPlane(group, 'arcade_highscore', w * 0.48, 0.18, cfg.emissiveColor || '#ffe45e', cfg.condition, cfg.seed || 52, { x: 0, y: 1.32, z: d * 0.5 + 0.012, name: 'TicketCounterScreen' });
      } else {
        const units = kType === 'dual_changer' ? 2 : 1;
        for (let i = 0; i < units; i++) {
          const ux = (i - (units - 1) * 0.5) * 0.34;
          batcher.addBox(ux, 1.12, d * 0.5 + 0.01, 0.14, 0.16, 0.03, { materialRole: 'frame', layer: 'detail' });
          batcher.addBox(ux, 0.78, d * 0.5 + 0.02, 0.16, 0.14, 0.05, { materialRole: 'secondary', layer: 'detail' });
        }
      }
      meta.interaction = { interactable: true, actionType: `arcade_${kType}`, playerPosition: [0, 0, d * 0.5 + 0.55], cabinetState: 'active' };
    }
  });

  registerObjectFamily({
    id: 'prize_redemption_counter',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Tokens, Tickets & Payment',
    subcategories: ['Tokens, Tickets & Payment', 'Prize & Claw Machines'],
    label: 'Prize Redemption Counters & Racks',
    description: 'Glass-front prize redemption counters, plush pegboard prize walls, rotating novelty carousels, and illuminated jackpot prize showcases.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'wall_mounted'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'large',
    functionalRole: 'furniture',
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'mall', 'family_entertainment', 'game_store'],
    tags: ['prize_counter', 'redemption', 'display_case', 'plush', 'pegboard', 'carousel'],
    schema: [
      { group: 'Counter & Rack Style', tab: 'structure' },
      {
        key: 'counterStyle',
        label: 'Fixture Type',
        type: 'select',
        tab: 'structure',
        default: 'glass_counter',
        options: [
          ['glass_counter', 'Large Glass Prize Counter'],
          ['wall_pegboard', 'Wall Pegboard Prize Shelves'],
          ['rotating_rack', 'Rotating Novelty Prize Rack'],
          ['showcase_cabinet', 'Tall Jackpot Glass Showcase']
        ]
      },
      { key: 'width', label: 'Fixture Width', type: 'range', tab: 'structure', min: 0.65, max: 2.6, step: 0.05, unit: 'm', default: 1.95 },
      { key: 'signText', label: 'Banner Title', type: 'text', tab: 'details', default: 'Prizes', maxLength: 18 }
    ],
    presets: [
      { id: 'large_glass_prize_counter', label: 'Glass Display Prize Redemption Counter', locationContext: 'interior', values: { counterStyle: 'glass_counter', width: 2.1, signText: 'Prize Counter', paletteFamily: 'modern_family_entertainment' } },
      { id: 'wall_pegboard_prize_shelves', label: 'Wall-Mounted Plush & Toy Prize Rack', locationContext: 'interior', values: { counterStyle: 'wall_pegboard', attachmentProfile: 'wall_mounted', width: 1.8, signText: 'Ticket Prizes', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'rotating_novelty_prize_rack', label: 'Spinning Retail & Novelty Prize Carousel', locationContext: 'interior', values: { counterStyle: 'rotating_rack', width: 0.68, paletteFamily: 'arcade_1990s_mall' } },
      { id: 'plush_showcase_display_case', label: 'Grand Ticket Jackpot Glass Showcase', locationContext: 'interior', values: { counterStyle: 'showcase_cabinet', width: 1.25, signText: 'Jackpot Vault', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const style = cfg.counterStyle || 'glass_counter';
      const w = clamp(Number(cfg.width) || 1.95, 0.65, 2.6);

      if (style === 'wall_pegboard') {
        const h = 1.65;
        batcher.addBox(0, 0, -0.04, w, h, 0.05, { materialRole: 'primary', layer: 'body' });
        for (const sy of [-0.42, 0.08, 0.56]) {
          batcher.addBox(0, sy, 0.14, w - 0.08, 0.03, 0.3, { materialRole: 'secondary', layer: 'detail' });
          for (let px = -w * 0.36; px <= w * 0.36 + 0.01; px += 0.32) {
            arcAddPlushOrToyPrize(batcher, px, sy + 0.02, 0.14, sy > 0.2 ? 'bear' : 'robot', 0.9, { role: px < 0 ? 'accent' : 'neonGlow' });
          }
        }
        objCreateSignPlane(group, cfg.signText || 'Ticket Prizes', w * 0.72, 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: h * 0.5 + 0.14, z: 0.02, name: 'PrizeWallBanner', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_prize_wall' };
        return;
      }

      if (style === 'rotating_rack') {
        batcher.addCylinder(0, 0.04, 0, 0.3, 0.32, 0.08, 12, 'y', 'frame', 'body');
        batcher.addCylinder(0, 0.92, 0, 0.025, 0.025, 1.72, 10, 'y', 'chrome', 'body');
        for (const ty of [0.58, 1.05, 1.5]) {
          batcher.addCylinder(0, ty, 0, 0.24, 0.24, 0.02, 12, 'y', 'primary', 'detail');
          arcAddPlushOrToyPrize(batcher, -0.14, ty + 0.02, 0, 'gift_box', 0.75, { role: 'accent' });
          arcAddPlushOrToyPrize(batcher, 0.14, ty + 0.02, 0, 'car', 0.85, { role: 'secondary' });
        }
        meta.interaction = { interactable: true, actionType: 'arcade_prize_carousel', playerPosition: [0, 0, 0.65] };
        return;
      }

      if (style === 'showcase_cabinet') {
        const h = 2.08;
        batcher.addBox(0, 0.25, 0, w, 0.5, 0.58, { materialRole: 'primary', layer: 'body' });
        redAddGlassCaseColumns(batcher, 0, 0.5, h - 0.72, w, 0.56, 'accent');
        batcher.addBox(0, 1.08, 0, w - 0.08, 0.02, 0.48, { materialRole: 'glass', layer: 'detail' });
        for (const sx of [-w * 0.28, 0, w * 0.28]) {
          arcAddPlushOrToyPrize(batcher, sx, 0.52, 0, 'robot', 1.05, { role: sx === 0 ? 'secondary' : 'neonGlow' });
          arcAddPlushOrToyPrize(batcher, sx, 1.1, 0, 'rocket', 1.0, { role: 'accent' });
        }
        batcher.addBox(0, h - 0.11, 0, w, 0.22, 0.58, { materialRole: 'frame', layer: 'body' });
        objCreateSignPlane(group, cfg.signText || 'Jackpot Vault', w * 0.8, 0.16, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#4de2ff', { x: 0, y: h - 0.11, z: 0.295, name: 'ShowcaseSign', lit: true });
        meta.interaction = { interactable: true, actionType: 'arcade_prize_showcase', playerPosition: [0, 0, 0.88] };
        return;
      }

      // Large glass prize redemption counter
      const d = 0.74;
      const h = 1.02;
      batcher.addBox(0, 0.22, 0, w, 0.44, d, { materialRole: 'primary', layer: 'body' });
      redAddGlassCaseColumns(batcher, 0, 0.44, h - 0.5, w, d, 'frame');
      batcher.addBox(0, h - 0.03, 0, w + 0.04, 0.06, d + 0.04, { materialRole: 'secondary', layer: 'body' });
      // Countertop ticket register & sample prizes
      batcher.addBox(-w * 0.3, h + 0.12, -0.05, 0.34, 0.22, 0.28, { materialRole: 'frame', layer: 'detail' });
      const kinds = ['bear', 'robot', 'gift_box', 'rocket', 'car'];
      const nPrizes = Math.max(3, Math.floor(w / 0.36));
      for (let i = 0; i < nPrizes; i++) {
        const px = (i - (nPrizes - 1) * 0.5) * (w * 0.78 / Math.max(1, nPrizes - 1));
        arcAddPlushOrToyPrize(batcher, px, 0.46, 0, kinds[i % kinds.length], 0.9, { role: i % 2 === 0 ? 'accent' : 'neonGlow' });
      }
      objCreateSignPlane(group, cfg.signText || 'Prize Counter', Math.min(w * 0.6, 1.1), 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 0.24, z: d * 0.5 + 0.01, name: 'CounterBannerSign', lit: true });
      meta.interaction = {
        interactable: true,
        actionType: 'arcade_prize_counter',
        employeePosition: [0, 0, -0.82],
        customerInteractionPos: [0, 0, 0.82]
      };
    }
  });
}
