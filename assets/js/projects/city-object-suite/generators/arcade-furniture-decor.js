import { clamp } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { ARCADE_SURFACE_MATERIALS } from '../materials/palettes.js';
import { getObjectArcadeMarqueeMaterial, getObjectMaterial } from '../materials/materials.js';

export function registerArcadeFurnitureAndDecorFamilies() {
  registerObjectFamily({
    id: 'arcade_seating_fixture',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Arcade Furniture & Seating',
    label: 'Arcade Seating & Queue Fixtures',
    description: 'Chrome swivel arcade stools, padded drum stools, retro diner booth sets, party-room tables, cubby lockers, and blacklight crowd queue rails.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'small',
    functionalRole: 'seating',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'bowling_alley', 'gaming_lounge', 'residential_game_room'],
    tags: ['stool', 'seating', 'booth', 'party_table', 'lockers', 'stanchion', 'queue'],
    schema: [
      { group: 'Fixture Variant', tab: 'structure' },
      {
        key: 'fixtureType',
        label: 'Furniture Type',
        type: 'select',
        tab: 'structure',
        default: 'swivel_stool',
        options: [
          ['swivel_stool', 'Chrome Ring Swivel Arcade Stool'],
          ['drum_stool', 'Padded Vinyl Drum Stool'],
          ['diner_booth', 'Retro Diner Booth & Table'],
          ['party_table', 'Party Room Table & Bench Set'],
          ['cubby_lockers', 'Arcade Locker & Backpack Cubbies'],
          ['queue_rail', 'Blacklight Crowd Queue Stanchion Pair']
        ]
      },
      { key: 'seatHeight', label: 'Stool / Table Height', type: 'range', tab: 'structure', min: 0.44, max: 0.86, step: 0.02, unit: 'm', default: 0.68 }
    ],
    presets: [
      { id: 'chrome_swivel_arcade_stool', label: 'Chrome Ring Swivel Arcade Stool', locationContext: 'interior', values: { fixtureType: 'swivel_stool', seatHeight: 0.68, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'padded_vinyl_drum_stool', label: 'Padded Vinyl Cocktail Arcade Stool', locationContext: 'interior', values: { fixtureType: 'drum_stool', seatHeight: 0.48, paletteFamily: 'arcade_1990s_mall' } },
      { id: 'retro_diner_booth_table', label: 'Retro Vinyl Booth & Table Set', locationContext: 'interior', values: { fixtureType: 'diner_booth', seatHeight: 0.74, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'party_room_folding_table_bench', label: 'Birthday Party Table & Bench Set', locationContext: 'interior', values: { fixtureType: 'party_table', seatHeight: 0.72, paletteFamily: 'modern_family_entertainment' } },
      { id: 'arcade_locker_backpack_cubbies', label: 'Player Backpack & Coat Cubby Bank', locationContext: 'interior', values: { fixtureType: 'cubby_lockers', paletteFamily: 'modern_family_entertainment' } },
      { id: 'retractable_arcade_queue_rail', label: 'Blacklight Crowd Queue Stanchion Pair', locationContext: 'interior', values: { fixtureType: 'queue_rail', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const fType = cfg.fixtureType || 'swivel_stool';
      const sh = clamp(Number(cfg.seatHeight) || 0.68, 0.44, 0.86);

      if (fType === 'swivel_stool' || fType === 'drum_stool') {
        const seatY = fType === 'drum_stool' ? Math.min(sh, 0.56) : sh;
        if (fType === 'swivel_stool') {
          for (const ang of [45, 135, 225, 315]) {
            const rad = ang * Math.PI / 180;
            batcher.addBox(Math.cos(rad) * 0.14, seatY * 0.46, Math.sin(rad) * 0.14, 0.025, seatY * 0.92, 0.025, { materialRole: 'frame', layer: 'body' });
          }
          batcher.addCylinder(0, seatY * 0.36, 0, 0.18, 0.18, 0.022, 14, 'y', 'chrome', 'detail');
          batcher.addCylinder(0, seatY - 0.04, 0, 0.18, 0.18, 0.08, 12, 'y', 'primary', 'body');
        } else {
          batcher.addCylinder(0, seatY * 0.5, 0, 0.18, 0.2, seatY, 12, 'y', 'primary', 'body');
          batcher.addCylinder(0, seatY - 0.03, 0, 0.19, 0.19, 0.08, 12, 'y', 'accent', 'detail');
        }
        batcher.addCylinder(0, seatY + 0.015, 0, 0.18, 0.17, 0.03, 12, 'y', 'upholstery', 'detail');
        meta.interaction = { interactable: true, actionType: 'arcade_seat', seatPosition: [0, seatY + 0.03, 0], facingDirection: [0, 0, -1] };
        return;
      }

      if (fType === 'diner_booth') {
        const tableW = 1.18;
        batcher.addBox(0, sh, 0, tableW, 0.045, 0.72, { materialRole: 'secondary', layer: 'body' });
        batcher.addCylinder(-0.32, sh * 0.5, 0, 0.04, 0.04, sh, 10, 'y', 'frame', 'body');
        batcher.addCylinder(0.32, sh * 0.5, 0, 0.04, 0.04, sh, 10, 'y', 'frame', 'body');
        for (const dz of [-0.64, 0.64]) {
          batcher.addBox(0, 0.22, dz, tableW, 0.44, 0.48, { materialRole: 'accent', layer: 'body' });
          batcher.addBox(0, 0.62, dz + Math.sign(dz) * 0.18, tableW, 0.52, 0.12, { materialRole: 'primary', layer: 'body' });
        }
        meta.interaction = { interactable: true, actionType: 'arcade_booth_seat', seatPosition: [0, 0.46, 0.6], facingDirection: [0, 0, -1] };
        return;
      }

      if (fType === 'party_table') {
        const w = 1.65;
        batcher.addBox(0, sh, 0, w, 0.045, 0.78, { materialRole: 'secondary', layer: 'body' });
        for (const [lx, lz] of [[-w * 0.42, -0.3], [w * 0.42, -0.3], [-w * 0.42, 0.3], [w * 0.42, 0.3]]) {
          batcher.addCylinder(lx, sh * 0.5, lz, 0.02, 0.02, sh, 8, 'y', 'frame', 'body');
        }
        for (const bz of [-0.56, 0.56]) {
          batcher.addBox(0, 0.42, bz, w * 0.92, 0.04, 0.3, { materialRole: 'primary', layer: 'body' });
          batcher.addBox(-w * 0.38, 0.21, bz, 0.04, 0.42, 0.24, { materialRole: 'frame', layer: 'body' });
          batcher.addBox(w * 0.38, 0.21, bz, 0.04, 0.42, 0.24, { materialRole: 'frame', layer: 'body' });
        }
        meta.interaction = { interactable: true, actionType: 'arcade_party_table', seatPosition: [0, 0.44, 0.56], facingDirection: [0, 0, -1] };
        return;
      }

      if (fType === 'cubby_lockers') {
        const w = 1.05;
        const h = 1.78;
        batcher.addBox(0, h * 0.5, 0, w, h, 0.44, { materialRole: 'primary', layer: 'body' });
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const cx = (c - 1) * 0.33;
            const cy = 0.32 + r * 0.52;
            batcher.addBox(cx, cy, 0.225, 0.3, 0.46, 0.025, { materialRole: (r + c) % 2 === 0 ? 'accent' : 'secondary', layer: 'detail' });
            batcher.addBox(cx + 0.1, cy, 0.245, 0.025, 0.06, 0.02, { materialRole: 'chrome', layer: 'detail' });
          }
        }
        meta.interaction = { interactable: true, actionType: 'arcade_locker_storage', playerPosition: [0, 0, 0.65] };
        return;
      }

      // Crowd queue stanchion pair with neon retractable belt
      for (const sx of [-0.85, 0.85]) {
        batcher.addCylinder(sx, 0.02, 0, 0.16, 0.17, 0.04, 12, 'y', 'frame', 'body');
        batcher.addCylinder(sx, 0.5, 0, 0.032, 0.032, 0.94, 10, 'y', 'primary', 'body');
        batcher.addCylinder(sx, 0.97, 0, 0.042, 0.042, 0.04, 10, 'y', 'neonGlow', 'detail');
      }
      batcher.addBox(0, 0.88, 0, 1.66, 0.06, 0.018, { materialRole: 'accent', layer: 'detail' });
      meta.interaction = { interactable: true, actionType: 'arcade_queue_barrier' };
    }
  });

  registerObjectFamily({
    id: 'arcade_neon_sign_decor',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Signage, Lighting & Decorations',
    label: 'Neon Arcade Signage, Lighting & Wall Decor',
    description: 'Glowing neon word signs, geometric neon trim tubes, hanging high-score boards, pixel posters, disco truss, and dual PA speaker stacks.',
    attachmentProfile: 'wall_mounted',
    supportedAttachments: ['wall_mounted', 'ceiling_mounted', 'hanging', 'ground_standing'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'small',
    functionalRole: 'lighting',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'gaming_lounge', 'bowling_alley', 'game_store', 'residential_game_room'],
    tags: ['neon', 'sign', 'marquee', 'poster', 'disco_ball', 'blacklight', 'speakers', 'scoreboard'],
    schema: [
      { group: 'Sign & Decor Configuration', tab: 'structure' },
      {
        key: 'decorType',
        label: 'Sign / Decor Type',
        type: 'select',
        tab: 'structure',
        default: 'neon_word_sign',
        options: [
          ['neon_word_sign', 'Illuminated Neon Marquee Sign'],
          ['directional_sign', 'Dual-Arrow Direction Sign'],
          ['leaderboard_panel', 'High Scores Hanging Board'],
          ['geometric_neon', 'Geometric Neon Wall Tubes'],
          ['pixel_poster_trio', 'Framed Retro Pixel Posters'],
          ['disco_blacklight', 'Ceiling Disco Ball & Blacklight Truss'],
          ['speaker_stack', 'Dual Illuminated Pa Speaker Stack']
        ]
      },
      { key: 'signText', label: 'Sign Text', type: 'text', tab: 'details', default: 'Arcade', maxLength: 24 },
      { key: 'width', label: 'Display Width', type: 'range', tab: 'structure', min: 0.55, max: 2.6, step: 0.05, unit: 'm', default: 1.45 },
      { key: 'lampLit', label: 'Neon Illuminated', type: 'boolean', tab: 'details', default: true }
    ],
    presets: [
      { id: 'neon_arcade_marquee_sign', label: 'Neon Arcade Marquee Sign', locationContext: 'interior', values: { decorType: 'neon_word_sign', signText: 'Arcade', width: 1.65, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'neon_open_window_sign', label: 'Neon Open Window Sign', locationContext: 'interior', values: { decorType: 'neon_word_sign', signText: 'Open', width: 0.85, paletteFamily: 'arcade_1990s_mall' } },
      { id: 'neon_tokens_prizes_directional', label: 'Tokens & Prizes Directional Sign', locationContext: 'interior', values: { decorType: 'directional_sign', signText: 'Tokens & Prizes', width: 1.35, paletteFamily: 'modern_family_entertainment' } },
      { id: 'neon_high_scores_leaderboard', label: 'Hanging High Scores Leaderboard', locationContext: 'interior', values: { decorType: 'leaderboard_panel', signText: 'High Scores', width: 1.55, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'neon_vr_zone_arch_sign', label: 'Vr Zone Glowing Marquee Sign', locationContext: 'interior', values: { decorType: 'neon_word_sign', signText: 'Vr Zone', width: 1.75, paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'neon_insert_coin_gameover_sign', label: 'Insert Coin / Game Over Neon Sign', locationContext: 'interior', values: { decorType: 'neon_word_sign', signText: 'Insert Coin', width: 1.3, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'geometric_neon_wall_trim', label: 'Geometric Neon Wall Light Strips', locationContext: 'interior', values: { decorType: 'geometric_neon', width: 1.9, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'framed_pixel_poster_trio', label: 'Framed Pixel Art Poster Trio', locationContext: 'interior', values: { decorType: 'pixel_poster_trio', width: 1.85, paletteFamily: 'home_game_room' } },
      { id: 'ceiling_disco_blacklight_truss', label: 'Disco Ball & Blacklight Rig', locationContext: 'interior', values: { decorType: 'disco_blacklight', attachmentProfile: 'ceiling_mounted', width: 1.6, paletteFamily: 'modern_family_entertainment' } },
      { id: 'dual_arcade_speaker_stack', label: 'Dual Arcade Speaker Tower Stack', locationContext: 'interior', values: { decorType: 'speaker_stack', attachmentProfile: 'ground_standing', width: 0.72, paletteFamily: 'arcade_1990s_mall' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const dType = cfg.decorType || 'neon_word_sign';
      const w = clamp(Number(cfg.width) || 1.45, 0.55, 2.6);
      const text = cfg.signText || 'Arcade';
      const lit = cfg.lampLit !== false;

      if (dType === 'speaker_stack') {
        const stackW = clamp(w, 0.55, 0.95);
        batcher.addBox(0, 0.42, 0, stackW, 0.84, 0.48, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 1.18, 0, stackW * 0.9, 0.64, 0.42, { materialRole: 'primary', layer: 'body' });
        for (const [cy, cr] of [[0.42, 0.2], [1.04, 0.14], [1.34, 0.08]]) {
          batcher.addCylinder(0, cy, 0.245, cr, cr, 0.03, 12, 'z', 'accent', 'detail');
          batcher.addCylinder(0, cy, 0.26, cr * 0.45, cr * 0.45, 0.02, 10, 'z', 'neonGlow', 'detail');
        }
        meta.interaction = { interactable: true, actionType: 'arcade_audio_stack' };
        return;
      }

      if (dType === 'disco_blacklight') {
        batcher.addBox(0, -0.08, 0, w, 0.1, 0.18, { materialRole: 'frame', layer: 'body' });
        batcher.addCylinder(0, -0.26, 0, 0.012, 0.012, 0.26, 8, 'y', 'chrome', 'detail');
        batcher.addChamferBox(0, -0.48, 0, 0.34, 0.34, 0.34, 0.09, { materialRole: 'chrome', layer: 'detail' });
        for (const lx of [-w * 0.36, w * 0.36]) {
          batcher.addBox(lx, -0.18, 0, 0.42, 0.06, 0.1, { materialRole: 'neonGlow', layer: 'detail' });
        }
        meta.lightSources = [{ type: 'point', position: [0, -0.55, 0], color: cfg.emissiveColor || '#aa66ff', intensity: lit ? 0.95 : 0.15, distance: 4.5 }];
        meta.interaction = { interactable: true, actionType: 'arcade_lighting_rig', state: lit ? 'on' : 'off' };
        return;
      }

      if (dType === 'pixel_poster_trio') {
        const screens = ['arcade_platform', 'arcade_shooter', 'arcade_fighting'];
        for (let i = 0; i < 3; i++) {
          const px = (i - 1) * (w * 0.34);
          batcher.addBox(px, 0, 0, w * 0.29, 0.68, 0.04, { materialRole: 'frame', layer: 'body' });
          objCreateScreenPlane(group, screens[i], w * 0.25, 0.58, cfg.emissiveColor || '#4de2ff', cfg.condition, (cfg.seed || 7) + i, { x: px, y: 0, z: 0.024, name: `PixelPoster${i}`, role: 'poster_screen' });
        }
        return;
      }

      if (dType === 'geometric_neon') {
        batcher.addBox(0, 0, -0.02, w, 0.52, 0.03, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(0, 0.14, 0.01, w * 0.92, 0.035, 0.03, { materialRole: 'neonGlow', layer: 'detail' });
        batcher.addBox(0, -0.14, 0.01, w * 0.92, 0.035, 0.03, { materialRole: 'accent', layer: 'detail' });
        batcher.addBox(-w * 0.25, 0, 0.015, w * 0.36, 0.035, 0.03, { materialRole: 'secondary', layer: 'detail', rotZDeg: 28 });
        batcher.addBox(w * 0.25, 0, 0.015, w * 0.36, 0.035, 0.03, { materialRole: 'primary', layer: 'detail', rotZDeg: -28 });
        meta.lightSources = [{ type: 'point', position: [0, 0, 0.25], color: cfg.emissiveColor || '#4de2ff', intensity: lit ? 0.7 : 0.1, distance: 3.0 }];
        return;
      }

      if (dType === 'leaderboard_panel') {
        batcher.addBox(0, 0, 0, w, 0.78, 0.09, { materialRole: 'frame', layer: 'body' });
        objCreateScreenPlane(group, 'arcade_highscore', w - 0.1, 0.66, cfg.emissiveColor || '#ffe45e', cfg.condition, cfg.seed || 81, { x: 0, y: 0, z: 0.05, name: 'HighScoreBoardScreen' });
        meta.lightSources = [{ type: 'point', position: [0, 0, 0.3], color: cfg.emissiveColor || '#ffe45e', intensity: lit ? 0.6 : 0.1, distance: 2.5 }];
        return;
      }

      // Illuminated Neon Marquee / Word / Directional Sign
      batcher.addBox(0, 0, 0, w, 0.42, 0.1, { materialRole: 'frame', layer: 'body' });
      const signAccentHex = cfg.emissiveColor || cfg.accentColor || (dType === 'directional_sign' ? '#4de2ff' : '#ff2b8a');
      const signMat = getObjectArcadeMarqueeMaterial(
        text,
        cfg.primaryColor || '#1e1438',
        signAccentHex,
        { lit, seed: cfg.seed || 33 }
      );
      const front = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, 0.34), signMat);
      front.position.set(0, 0, 0.056);
      front.name = 'NeonSignFace';
      group.add(front);
      meta.lightSources = [{ type: 'point', position: [0, 0, 0.28], color: signAccentHex, intensity: lit ? 0.85 : 0.1, distance: 3.2 }];
    }
  });

  registerObjectFamily({
    id: 'arcade_floor_wall_surface',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Arcade Carpets, Flooring & Walls',
    label: 'Arcade Carpets, Flooring & Wall Panels',
    description: 'Modular tileable arcade carpets including the exact 32x32 B Remastered nearest-neighbor arcade-carpet.png texture, seamless variants, Led floors, and neon wall panels.',
    attachmentProfile: 'surface_decal',
    supportedAttachments: ['surface_decal', 'wall_mounted', 'ground_standing'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'large',
    functionalRole: 'decoration',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'bowling_alley', 'gaming_lounge', 'residential_game_room', 'superhero_base'],
    tags: ['carpet', 'flooring', 'wall_panel', 'arcade_carpet', 'nearest_filter', 'apartment_material', 'tileable'],
    schema: [
      { group: 'Surface Material & Tiling', tab: 'structure' },
      {
        key: 'surfacePreset',
        label: 'Surface Pattern',
        type: 'select',
        tab: 'structure',
        default: 'arcade_carpet_original',
        options: ARCADE_SURFACE_MATERIALS.map((item) => [item.id, item.label])
      },
      { key: 'width', label: 'Tile Width', type: 'range', tab: 'structure', min: 1.0, max: 4.0, step: 0.5, unit: 'm', default: 2.0 },
      { key: 'depth', label: 'Tile Depth / Height', type: 'range', tab: 'structure', min: 1.0, max: 4.0, step: 0.5, unit: 'm', default: 2.0 },
      { key: 'repeatCount', label: 'Uv Tile Repeat', type: 'range', tab: 'details', min: 1, max: 8, step: 1, default: 2 }
    ],
    presets: [
      { id: 'classic_32x32_arcade_carpet_tile', label: 'Classic B Remastered 32x32 Arcade Carpet', locationContext: 'interior', values: { surfacePreset: 'arcade_carpet_original', width: 2.0, depth: 2.0, repeatCount: 2, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'seamless_arcade_carpet_runner', label: 'Seamless Arcade Carpet Runner', locationContext: 'interior', values: { surfacePreset: 'arcade_carpet_seamless', width: 3.0, depth: 1.5, repeatCount: 3, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'purple_geo_neon_carpet', label: '1980s Purple Neon Geometric Carpet', locationContext: 'interior', values: { surfacePreset: 'arcade_carpet_purple_geo', width: 2.0, depth: 2.0, repeatCount: 2, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'retro_squiggle_carpet_swatch', label: '1990s Mall Arcade Squiggle Carpet', locationContext: 'interior', values: { surfacePreset: 'arcade_carpet_retro_squiggle', width: 2.0, depth: 2.0, repeatCount: 2, paletteFamily: 'arcade_1990s_mall' } },
      { id: 'blacklight_bowling_carpet', label: 'Blacklight Cosmic Bowling Carpet', locationContext: 'interior', values: { surfacePreset: 'arcade_carpet_blacklight', width: 2.5, depth: 2.5, repeatCount: 3, paletteFamily: 'modern_family_entertainment' } },
      { id: 'arcade_vinyl_checker_floor', label: 'Neon Glossy Checkerboard Floor', locationContext: 'interior', values: { surfacePreset: 'arcade_vinyl_checker', width: 2.0, depth: 2.0, repeatCount: 2, paletteFamily: 'modern_family_entertainment' } },
      { id: 'led_illuminated_dance_tile', label: 'Illuminated Led Dance Floor Panel', locationContext: 'interior', values: { surfacePreset: 'arcade_led_floor', width: 2.0, depth: 2.0, repeatCount: 2, paletteFamily: 'superhero_cyber_arcade' } },
      { id: 'retro_stripe_arcade_wall_panel', label: 'Retro Neon Stripe Wall Panel', locationContext: 'interior', values: { surfacePreset: 'arcade_wall_retro_stripe', attachmentProfile: 'wall_mounted', width: 2.0, depth: 2.5, repeatCount: 2, paletteFamily: 'arcade_1980s_retro' } },
      { id: 'pixel_mural_acoustic_wall_panel', label: 'Pixel Mural Acoustic Wall Panel', locationContext: 'interior', values: { surfacePreset: 'arcade_wall_pixel_mural', attachmentProfile: 'wall_mounted', width: 2.0, depth: 2.5, repeatCount: 2, paletteFamily: 'arcade_1990s_mall' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const surfaceId = cfg.surfacePreset || 'neon_confetti_carpet';
      const entry = ARCADE_SURFACE_MATERIALS.find((s) => s.id === surfaceId || s.materialFamily === surfaceId) || ARCADE_SURFACE_MATERIALS[0];
      const familyKey = entry.materialFamily || entry.family || 'arcade_carpet_original';
      const w = clamp(Number(cfg.width) || 2.0, 1.0, 4.0);
      const d = clamp(Number(cfg.depth) || 2.0, 1.0, 4.0);
      const repeat = clamp(Math.round(Number(cfg.repeatCount) || 2), 1, 8);
      const isWall = entry.surfaceKind === 'wall' || entry.surfaceRole === 'wall' || cfg.attachmentProfile === 'wall_mounted';

      const surfaceMat = getObjectMaterial(familyKey, cfg.primaryColor || entry.defaultColor || '#110d20', {
        role: 'primary',
        repeatX: repeat,
        repeatY: repeat,
        uvScaleMeters: entry.uvScaleMeters || 1.0,
        seed: cfg.seed || 101
      });

      const geom = isWall ? new THREE.BoxGeometry(w, d, 0.06) : new THREE.BoxGeometry(w, 0.03, d);
      const mesh = new THREE.Mesh(geom, surfaceMat);
      mesh.position.set(0, isWall ? 0 : 0.015, 0);
      mesh.receiveShadow = true;
      mesh.castShadow = isWall;
      mesh.name = isWall ? 'ArcadeWallPanelMesh' : 'ArcadeCarpetFloorMesh';
      mesh.userData = {
        layer: 'body',
        materialRole: 'primary',
        materialFamily: familyKey,
        bGameMaterial: surfaceMat.userData?.bGameMaterial || null
      };
      group.add(mesh);

      if (isWall) {
        batcher.addBox(0, d * 0.5 - 0.03, 0.04, w, 0.05, 0.03, { materialRole: 'neonGlow', layer: 'detail' });
        batcher.addBox(0, -d * 0.5 + 0.04, 0.04, w, 0.08, 0.03, { materialRole: 'frame', layer: 'detail' });
      } else {
        batcher.addBox(0, 0.006, 0, w + 0.04, 0.012, d + 0.04, { materialRole: 'frame', layer: 'detail' });
      }

      meta.reusableSurfaceMaterial = {
        id: entry.id,
        family: familyKey,
        surfaceRole: entry.surfaceKind || entry.surfaceRole || 'floor',
        apartmentBuildable: entry.apartmentBuildable !== false,
        filter: entry.filter || 'nearest',
        uvScaleMeters: entry.uvScaleMeters || 1.0,
        bGameTileId: entry.bGameTileId || 'arcade-carpet',
        textureResolution: familyKey === 'arcade_carpet_original' ? '32x32' : 'procedural'
      };
    }
  });

  registerObjectFamily({
    id: 'arcade_concession_stand',
    categoryId: 'arcades_entertainment',
    categories: ['arcades_entertainment'],
    subcategory: 'Food, Candy & Refreshments',
    label: 'Arcade Food, Candy & Drink Stations',
    description: 'Retro popcorn carts, twin slushie dispensers, nacho & hot dog roller bars, soda fountains, candy counters, and energy drink coolers.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'modern_arcade', 'mall', 'bowling_alley', 'family_entertainment'],
    tags: ['popcorn', 'slushie', 'soda_fountain', 'candy', 'snacks', 'cooler', 'concessions'],
    schema: [
      { group: 'Concession Station Type', tab: 'structure' },
      {
        key: 'concessionType',
        label: 'Refreshment Unit',
        type: 'select',
        tab: 'structure',
        default: 'popcorn_cart',
        options: [
          ['popcorn_cart', 'Vintage Popcorn Kettle Cart'],
          ['slush_machine', 'Twin Illuminated Slushie Station'],
          ['nacho_hotdog_bar', 'Nacho & Hot Dog Warmer Counter'],
          ['soda_fountain', 'Arcade 6-Valve Soda Fountain'],
          ['candy_counter', 'Glass Candy Jar Snack Counter'],
          ['energy_cooler', 'Illuminated Drink Glass Cooler']
        ]
      },
      { key: 'signText', label: 'Menu Banner', type: 'text', tab: 'details', default: 'Snacks', maxLength: 18 }
    ],
    presets: [
      { id: 'retro_popcorn_cart', label: 'Vintage Arcade Popcorn Kettle Cart', locationContext: 'interior', values: { concessionType: 'popcorn_cart', signText: 'Fresh Popcorn', paletteFamily: 'arcade_1980s_retro' } },
      { id: 'twin_slush_drink_machine', label: 'Twin Illuminated Slushie Dispenser', locationContext: 'interior', values: { concessionType: 'slush_machine', signText: 'Ice Slush', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'nacho_hot_dog_warmer_bar', label: 'Nacho & Hot Dog Roller Station', locationContext: 'interior', values: { concessionType: 'nacho_hotdog_bar', signText: 'Hot Snacks', paletteFamily: 'modern_family_entertainment' } },
      { id: 'arcade_soda_fountain_station', label: '6-Valve Soda Fountain & Ice Tower', locationContext: 'interior', values: { concessionType: 'soda_fountain', signText: 'Cold Drinks', paletteFamily: 'modern_family_entertainment' } },
      { id: 'candy_jar_concession_counter', label: 'Glass Candy Bar & Snack Counter', locationContext: 'interior', values: { concessionType: 'candy_counter', signText: 'Candy Bar', paletteFamily: 'arcade_1990s_mall' } },
      { id: 'cold_energy_drink_cooler', label: 'Glass-Door Energy Drink Fridge', locationContext: 'interior', values: { concessionType: 'energy_cooler', signText: 'Energy Fuel', paletteFamily: 'superhero_cyber_arcade' } }
    ],
    buildGeometry(group, cfg, batcher, mats, meta) {
      const cType = cfg.concessionType || 'popcorn_cart';
      const label = cfg.signText || 'Snacks';

      if (cType === 'popcorn_cart') {
        batcher.addBox(0, 0.42, 0, 0.78, 0.68, 0.56, { materialRole: 'primary', layer: 'body' });
        batcher.addCylinder(-0.42, 0.24, 0, 0.24, 0.24, 0.04, 14, 'x', 'chrome', 'body');
        batcher.addCylinder(0.42, 0.24, 0, 0.24, 0.24, 0.04, 14, 'x', 'chrome', 'body');
        batcher.addBox(0, 1.12, 0, 0.68, 0.72, 0.5, { materialRole: 'glass', layer: 'detail' });
        batcher.addBox(0, 0.86, 0, 0.58, 0.16, 0.42, { materialRole: 'accent', layer: 'detail' });
        batcher.addCylinder(0, 1.24, 0, 0.12, 0.12, 0.14, 10, 'y', 'chrome', 'detail');
        batcher.addBox(0, 1.56, 0, 0.76, 0.18, 0.56, { materialRole: 'primary', layer: 'body' });
        objCreateSignPlane(group, label, 0.64, 0.14, cfg.primaryColor || '#2a1018', cfg.emissiveColor || '#ffe45e', { x: 0, y: 1.56, z: 0.285, name: 'PopcornBanner' });
        meta.interaction = { interactable: true, actionType: 'arcade_concession', playerPosition: [0, 0, 0.72] };
        return;
      }

      if (cType === 'energy_cooler') {
        batcher.addBox(0, 1.0, 0, 0.76, 2.0, 0.66, { materialRole: 'primary', layer: 'body' });
        batcher.addBox(0, 0.94, 0.335, 0.66, 1.48, 0.025, { materialRole: 'glass', layer: 'detail' });
        for (let row = 0; row < 4; row++) {
          const sy = 0.42 + row * 0.36;
          batcher.addBox(0, sy, 0.02, 0.64, 0.02, 0.48, { materialRole: 'secondary', layer: 'detail' });
          for (let col = -2; col <= 2; col++) {
            batcher.addCylinder(col * 0.11, sy + 0.09, 0.14, 0.03, 0.03, 0.14, 8, 'y', row % 2 === 0 ? 'neonGlow' : 'accent', 'detail');
          }
        }
        batcher.addBox(0, 1.84, 0.335, 0.7, 0.22, 0.03, { materialRole: 'accent', layer: 'detail' });
        objCreateSignPlane(group, label, 0.62, 0.16, cfg.primaryColor || '#141a2e', cfg.emissiveColor || '#4de2ff', { x: 0, y: 1.84, z: 0.355, name: 'CoolerHeader' });
        meta.interaction = { interactable: true, actionType: 'arcade_drink_cooler', playerPosition: [0, 0, 0.82] };
        return;
      }

      // Base concession counter for slushie, soda, nachos, or candy jars
      batcher.addBox(0, 0.44, 0, 1.38, 0.88, 0.74, { materialRole: 'primary', layer: 'body' });
      batcher.addBox(0, 0.9, 0, 1.44, 0.05, 0.78, { materialRole: 'secondary', layer: 'body' });
      if (cType === 'slush_machine') {
        batcher.addBox(0, 1.08, 0, 0.62, 0.32, 0.46, { materialRole: 'frame', layer: 'body' });
        batcher.addBox(-0.15, 1.4, 0.02, 0.24, 0.36, 0.34, { materialRole: 'accent', layer: 'detail' });
        batcher.addBox(0.15, 1.4, 0.02, 0.24, 0.36, 0.34, { materialRole: 'neonGlow', layer: 'detail' });
      } else if (cType === 'soda_fountain') {
        batcher.addBox(0, 1.32, -0.06, 0.84, 0.78, 0.48, { materialRole: 'frame', layer: 'body' });
        for (let i = -2; i <= 2; i++) {
          batcher.addCylinder(i * 0.13, 1.12, 0.22, 0.022, 0.018, 0.1, 8, 'y', 'chrome', 'detail');
        }
      } else if (cType === 'nacho_hotdog_bar') {
        batcher.addBox(-0.32, 1.14, 0, 0.52, 0.44, 0.46, { materialRole: 'glass', layer: 'detail' });
        batcher.addBox(-0.32, 1.02, 0, 0.42, 0.16, 0.36, { materialRole: 'accent', layer: 'detail' });
        batcher.addBox(0.34, 1.04, 0, 0.54, 0.22, 0.44, { materialRole: 'frame', layer: 'detail' });
      } else {
        for (let i = -2; i <= 2; i++) {
          batcher.addCylinder(i * 0.22, 1.08, 0, 0.075, 0.075, 0.28, 10, 'y', 'glass', 'detail');
          batcher.addCylinder(i * 0.22, 1.02, 0, 0.062, 0.062, 0.14, 10, 'y', i % 2 === 0 ? 'accent' : 'neonGlow', 'detail');
        }
      }
      objCreateSignPlane(group, label, 0.92, 0.2, cfg.primaryColor || '#1a2038', cfg.emissiveColor || '#ffe45e', { x: 0, y: 0.52, z: 0.378, name: 'ConcessionSign' });
      meta.interaction = { interactable: true, actionType: 'arcade_concession', employeePosition: [0, 0, -0.82], customerInteractionPos: [0, 0, 0.82] };
    }
  });
}
