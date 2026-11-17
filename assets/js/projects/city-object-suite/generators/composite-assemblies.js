import { registerObjectFamily } from '../core/registry.js';

export const ASM_COMMON_SCHEMA = [
  { group: 'Layout & Composition', tab: 'structure' },
  { key: 'spacingScale', label: 'Layout Spacing Scale', type: 'range', min: 0.8, max: 1.4, step: 0.05, default: 1.0, tab: 'structure' },
  { key: 'includeSecondaryProps', label: 'Include Secondary Props', type: 'boolean', default: true, tab: 'structure' },
  { key: 'includeClutter', label: 'Include Surface Clutter', type: 'boolean', default: true, tab: 'details' },
  { key: 'unifyCondition', label: 'Unify Wear Condition', type: 'boolean', default: true, tab: 'details' },
  { key: 'unifyPalette', label: 'Unify Urban Palette', type: 'boolean', default: false, tab: 'materials' }
];

export function registerCompositeAssemblies() {
  registerObjectFamily({
    id: 'apartment_alley',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Alley & Service',
    label: 'Apartment Alley Cluster',
    description: 'Dumpster, wheeled carts, wall conduit pipes, junction box, and loose alleyway clutter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'older_metropolitan',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'alley', 'dumpster', 'pipes', 'bins', 'clutter'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'main_dumpster', familyId: 'commercial_dumpster', presetId: 'standard_green_dumpster', pos: [0, 0, -0.25], rotDeg: [0, 0, 0] },
        { componentId: 'recycle_cart', familyId: 'wheeled_bin', presetId: 'municipal_blue_recycling_cart', pos: [-1.75, 0, 0.25], rotDeg: [0, 14, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'trash_cart', familyId: 'wheeled_bin', presetId: 'wheeled_household_trash', pos: [-2.45, 0, 0.3], rotDeg: [0, -8, 0] },
          { componentId: 'wall_pipes', familyId: 'exposed_pipes', presetId: 'building_wall_pipe_cluster', pos: [0.1, 1.35, -1.15], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
          { componentId: 'elec_box', familyId: 'utility_cabinet', presetId: 'wall_junction_conduit_box', pos: [1.85, 1.2, -1.15], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'trash_bags', familyId: 'urban_clutter', presetId: 'curbside_garbage_bag_pile', pos: [1.55, 0, 0.6], rotDeg: [0, 22, 0] },
          { componentId: 'oil_stain', familyId: 'urban_clutter', presetId: 'oil_stain_puddle_decal', pos: [-0.45, 0, 0.95], rotDeg: [0, -10, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_apartment_alley_gritty', label: 'Gritty Back Alley', condition: 'weathered', paletteFamily: 'neglected_abandoned', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_apartment_alley_clean', label: 'Managed Service Yard', condition: 'clean', paletteFamily: 'municipal', params: { spacingScale: 1.1, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'downtown_sidewalk',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Sidewalk & Commerce',
    label: 'Downtown Sidewalk Bay',
    description: 'Park bench, classic acorn streetlamp, litter basket, newspaper boxes, parking meter, and bollard.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'modern_downtown',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'sidewalk', 'bench', 'streetlight', 'meter', 'newspaper'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'park_bench', familyId: 'street_bench', presetId: 'downtown_metal_slat_bench', pos: [0, 0, -0.55], rotDeg: [0, 0, 0] },
        { componentId: 'streetlamp', familyId: 'streetlight', presetId: 'heritage_acorn_streetlamp', pos: [-1.95, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'litter_bin', familyId: 'wheeled_bin', presetId: 'wire_mesh_sidewalk_basket', pos: [1.45, 0, -0.5], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'news_boxes', familyId: 'newspaper_box', presetId: 'quad_newspaper_box_row', pos: [2.45, 0, -0.35], rotDeg: [0, -12, 0] },
          { componentId: 'curb_meter', familyId: 'parking_meter', presetId: 'vintage_single_parking_meter', pos: [-1.15, 0, 0.85], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'curb_bollard', familyId: 'bollard_railing', presetId: 'heritage_cast_bollard', pos: [2.85, 0, 0.85], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_downtown_sidewalk_evening', label: 'Evening Boulevard Bay', condition: 'clean', paletteFamily: 'modern_downtown', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_downtown_sidewalk_vintage', label: 'Historic District Curb', condition: 'lightly_worn', paletteFamily: 'vintage_metro', params: { spacingScale: 1.08, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'food_vendor_corner',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Sidewalk & Commerce',
    label: 'Food Vendor Street Corner',
    description: 'Mobile food cart, sidewalk A-frame sign, bistro seating table, litter basket, and plaza planter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'commercial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'vendor', 'food', 'cafe', 'umbrella', 'bistro'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'hotdog_cart', familyId: 'vendor_cart', presetId: 'classic_hot_dog_cart', pos: [-0.25, 0, -0.1], rotDeg: [0, 5, 0] },
        { componentId: 'bistro_table', familyId: 'cafe_storefront', presetId: 'paris_bistro_table_chairs', pos: [1.95, 0, 0.35], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'menu_aframe', familyId: 'newspaper_box', presetId: 'sidewalk_a_frame_sign', pos: [-1.75, 0, 0.5], rotDeg: [0, 22, 0] },
          { componentId: 'trash_basket', familyId: 'wheeled_bin', presetId: 'wire_mesh_sidewalk_basket', pos: [-1.9, 0, -0.65], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'plaza_planter', familyId: 'park_planter', presetId: 'architectural_concrete_planter', pos: [2.75, 0, -0.75], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_vendor_corner_hotdog', label: 'Midtown Hot Dog Corner', condition: 'clean', paletteFamily: 'commercial_vibrant', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_vendor_corner_coffee', label: 'Morning Espresso Patio', condition: 'new', paletteFamily: 'commercial_vibrant', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'industrial_loading_bay',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Alley & Service',
    label: 'Industrial Loading Bay',
    description: 'Pallet stack, heavy shipping crate, steel drums, pad transformer, bollards, and pipe manifold.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'industrial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'industrial', 'cargo', 'pallets', 'drums', 'transformer'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'pallet_stack', familyId: 'industrial_cargo', presetId: 'stacked_wooden_pallets', pos: [-1.1, 0, 0.1], rotDeg: [0, 6, 0] },
        { componentId: 'shipping_crate', familyId: 'industrial_cargo', presetId: 'heavy_shipping_crate', pos: [0.65, 0, -0.25], rotDeg: [0, -8, 0] },
        { componentId: 'oil_drums', familyId: 'industrial_cargo', presetId: 'industrial_oil_drums', pos: [2.05, 0, 0.25], rotDeg: [0, 15, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'pad_transformer', familyId: 'utility_cabinet', presetId: 'green_pad_transformer', pos: [-2.65, 0, -0.35], rotDeg: [0, 0, 0] },
          { componentId: 'steam_manifold', familyId: 'exposed_pipes', presetId: 'industrial_steam_manifold', pos: [0, 1.45, -1.3], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'dock_stain', familyId: 'urban_clutter', presetId: 'oil_stain_puddle_decal', pos: [0.35, 0, 0.95], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_loading_bay_heavy', label: 'Warehouse Freight Dock', condition: 'lightly_worn', paletteFamily: 'industrial', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_loading_bay_aged', label: 'Old Mill Depot Yard', condition: 'weathered', paletteFamily: 'neglected_abandoned', params: { spacingScale: 1.1, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'residential_entrance',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Residential & Rooftop',
    label: 'Residential Building Entry',
    description: 'Apartment wall mailbox bank, brass intercom, wall coach lantern, exterior pipes, and household bin.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    architecturalStyle: 'residential',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'residential', 'mailbox', 'intercom', 'lantern'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'mail_bank', familyId: 'mailbox_cluster', presetId: 'apartment_wall_bank', pos: [-0.85, 1.35, -0.6], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
        { componentId: 'intercom_panel', familyId: 'residential_entry', presetId: 'brass_apartment_intercom', pos: [0.45, 1.4, -0.6], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
        { componentId: 'entry_lantern', familyId: 'streetlight', presetId: 'wall_mounted_coach_lantern', pos: [1.1, 2.05, -0.6], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'entry_planter', familyId: 'park_planter', presetId: 'architectural_concrete_planter', pos: [1.35, 0, 0.35], rotDeg: [0, 0, 0] },
          { componentId: 'curb_trash_bin', familyId: 'wheeled_bin', presetId: 'wheeled_household_trash', pos: [-1.85, 0, 0.2], rotDeg: [0, 12, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_residential_entry_brick', label: 'Brownstone Entry Vestibule', condition: 'clean', paletteFamily: 'residential', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: false } },
      { id: 'asm_residential_entry_worn', label: 'Old Apartment Stoop', condition: 'lightly_worn', paletteFamily: 'vintage_metro', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'rooftop_mechanical_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Residential & Rooftop',
    label: 'Rooftop Mechanical Deck',
    description: 'Commercial rooftop HVAC unit, access stair headhouse, wooden water tank, solar rack, and conduit.',
    attachmentProfile: 'roof_mounted',
    supportedAttachments: ['roof_mounted', 'ground_standing'],
    architecturalStyle: 'industrial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'rooftop', 'hvac', 'water_tank', 'solar', 'mechanical'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'hvac_chiller', familyId: 'rooftop_hvac', presetId: 'commercial_rooftop_hvac_rtu', pos: [-1.15, 0, 0.25], rotDeg: [0, 0, 0] },
        { componentId: 'stair_headhouse', familyId: 'rooftop_hvac', presetId: 'rooftop_access_stair_headhouse', pos: [1.95, 0, -0.35], rotDeg: [0, -90, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'water_tower', familyId: 'rooftop_hvac', presetId: 'classic_wooden_water_tank', pos: [-2.85, 0, -1.65], rotDeg: [0, 0, 0] },
          { componentId: 'solar_bank', familyId: 'rooftop_hvac', presetId: 'commercial_solar_panel_array', pos: [1.25, 0, 1.55], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'roof_ac_small', familyId: 'residential_entry', presetId: 'wall_mounted_ac_condenser', pos: [0.35, 0.45, -0.95], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_rooftop_mech_standard', label: 'Midtown Office Roof Deck', condition: 'lightly_worn', paletteFamily: 'industrial', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_rooftop_mech_solar', label: 'Modern Eco Mechanical Roof', condition: 'clean', paletteFamily: 'modern_downtown', params: { spacingScale: 1.08, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'basic_office_workstation',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Basic Office Workstation',
    description: 'Employee desk, ergonomic chair, desktop Lcd computer, rolling drawer pedestal, Voip phone, and desk organizer.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'office', 'desk', 'workstation', 'computer', 'chair'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'work_desk', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [0, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'task_chair', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [0, 0, 0.62], rotDeg: [0, 172, 0] },
        { componentId: 'pc_station', familyId: 'computer_workstation', presetId: 'modern_single_lcd_pc', pos: [0, 0.74, -0.06], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'side_pedestal', familyId: 'filing_cabinet', presetId: 'rolling_underdesk_pedestal', pos: [-0.88, 0, 0.08], rotDeg: [0, 0, 0] },
          { componentId: 'desk_phone', familyId: 'printer_office_machine', presetId: 'voip_enterprise_desk_phone', pos: [-0.52, 0.74, 0.08], rotDeg: [0, 18, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'organizer_tray', familyId: 'desktop_accessories', presetId: 'tidy_desk_organizer_kit', pos: [0.54, 0.74, 0.1], rotDeg: [0, -14, 0] },
          { componentId: 'task_lamp', familyId: 'desktop_accessories', presetId: 'architect_swing_desk_lamp', pos: [-0.56, 0.74, -0.22], rotDeg: [0, 24, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_basic_workstation_clean', label: 'Corporate Employee Bay', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_basic_workstation_tech', label: 'Clean Engineering Desk', condition: 'new', paletteFamily: 'contemporary_tech', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'executive_office_suite',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Executive Office Suite',
    description: 'Large executive mahogany desk, leather high-back chair, laptop dock, visitor chairs, bookcase, and brass nameplate.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'commercial', 'conference'],
    architecturalStyle: 'classic_executive',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'executive', 'mahogany', 'office', 'leather', 'suite'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'exec_desk', familyId: 'office_desk', presetId: 'executive_mahogany_desk', pos: [0, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'exec_chair', familyId: 'office_chair', presetId: 'executive_leather_highback', pos: [0, 0, -0.68], rotDeg: [0, 0, 0] },
        { componentId: 'exec_laptop', familyId: 'computer_workstation', presetId: 'executive_laptop_dock', pos: [-0.15, 0.76, 0.08], rotDeg: [0, 180, 0], overrides: { attachmentProfile: 'surface_placed' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'rear_bookcase', familyId: 'office_shelving_mailroom', presetId: 'executive_mahogany_bookcase', pos: [0, 0, -1.65], rotDeg: [0, 0, 0] },
          { componentId: 'visitor_left', familyId: 'office_chair', presetId: 'visitor_sled_armchair', pos: [-0.55, 0, 1.02], rotDeg: [0, 168, 0] },
          { componentId: 'visitor_right', familyId: 'office_chair', presetId: 'visitor_sled_armchair', pos: [0.55, 0, 1.02], rotDeg: [0, -168, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'exec_nameplate', familyId: 'desktop_accessories', presetId: 'executive_nameplate_kit', pos: [0.46, 0.76, 0.24], rotDeg: [0, -10, 0] },
          { componentId: 'corner_plant', familyId: 'office_decor_prop', presetId: 'potted_fiddle_leaf_office_plant', pos: [1.55, 0, -1.35], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_exec_suite_mahogany', label: 'Mahogany Corner Suite', condition: 'clean', paletteFamily: 'classic_executive', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_exec_suite_modern', label: 'Minimalist Director Suite', condition: 'new', paletteFamily: 'modern_corporate', params: { spacingScale: 1.08, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'four_person_cubicle_cluster',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: '4-Person Open Cubicle Cluster',
    description: 'Four workstations separated by acoustic glass partitions with task chairs, monitors, and rolling pedestals.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'cubicle', 'cluster', 'open_office', 'workstations'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'spine_wall', familyId: 'cubicle_partition', presetId: 'fabric_glass_cubicle_wall', pos: [0, 0, 0], rotDeg: [0, 0, 0], overrides: { width: 2.35 } },
        { componentId: 'desk_nw', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [-0.85, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'desk_ne', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [0.85, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'desk_sw', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [-0.85, 0, 0.45], rotDeg: [0, 180, 0] },
        { componentId: 'desk_se', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [0.85, 0, 0.45], rotDeg: [0, 180, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'chair_nw', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [-0.85, 0, -1.08], rotDeg: [0, 0, 0] },
          { componentId: 'chair_ne', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [0.85, 0, -1.08], rotDeg: [0, 0, 0] },
          { componentId: 'chair_sw', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [-0.85, 0, 1.08], rotDeg: [0, 180, 0] },
          { componentId: 'chair_se', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [0.85, 0, 1.08], rotDeg: [0, 180, 0] },
          { componentId: 'cross_divider', familyId: 'cubicle_partition', presetId: 'fabric_glass_cubicle_wall', pos: [0, 0, 0], rotDeg: [0, 90, 0], overrides: { width: 1.6 } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'pc_nw', familyId: 'computer_workstation', presetId: 'modern_single_lcd_pc', pos: [-0.85, 0.74, -0.32], rotDeg: [0, 180, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'pc_se', familyId: 'computer_workstation', presetId: 'dual_monitor_developer_rig', pos: [0.85, 0.74, 0.32], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_cubicle_quad_modern', label: 'Modern Quad Bench Cluster', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_cubicle_quad_retro', label: '90s Corporate Call Center Quad', condition: 'lightly_worn', paletteFamily: 'retro_90s_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'reception_lobby_ensemble',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Reception Lobby Vignette',
    description: 'Curved corporate front counter, concierge task chair, lobby directory totem, waiting sofa, wall artwork, and floor planter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['reception', 'lobby', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'reception', 'lobby', 'front_desk', 'sofa', 'directory'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'main_counter', familyId: 'reception_counter', presetId: 'curved_corporate_reception_desk', pos: [0, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'desk_chair', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [0, 0, -1.12], rotDeg: [0, 0, 0] },
        { componentId: 'lobby_sofa', familyId: 'waiting_seating', presetId: 'executive_lobby_sofa', pos: [-2.15, 0, 1.15], rotDeg: [0, 42, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'dir_totem', familyId: 'interior_wayfinding_sign', presetId: 'lobby_directory_totem_board', pos: [2.15, 0, -0.35], rotDeg: [0, -24, 0] },
          { componentId: 'wall_art', familyId: 'office_decor_prop', presetId: 'framed_corporate_wall_art', pos: [0, 1.85, -1.65], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'lobby_plant', familyId: 'office_decor_prop', presetId: 'potted_fiddle_leaf_office_plant', pos: [1.75, 0, 0.95], rotDeg: [0, 0, 0] },
          { componentId: 'welcome_tent', familyId: 'interior_wayfinding_sign', presetId: 'desk_reception_welcome_sign', pos: [0.65, 1.14, -0.05], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_reception_lobby_exec', label: 'Headquarters Atrium Lobby', condition: 'new', paletteFamily: 'luxury_corporate_lobby', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_reception_lobby_minimal', label: 'Streamlined Front Desk Bay', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'waiting_room_arrangement',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Clinic & Public Waiting Room',
    description: 'Twin linked tandem seating benches, club armchair, queue ticket kiosk, bottled water cooler, and indoor planter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['waiting_room', 'medical', 'lobby', 'public_service'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'waiting_room', 'clinic', 'tandem', 'kiosk', 'seating'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'bench_row_1', familyId: 'waiting_seating', presetId: 'medical_tandem_three_seat', pos: [-0.8, 0, -0.75], rotDeg: [0, 0, 0] },
        { componentId: 'bench_row_2', familyId: 'waiting_seating', presetId: 'medical_tandem_three_seat', pos: [-0.8, 0, 0.45], rotDeg: [0, 0, 0] },
        { componentId: 'ticket_kiosk', familyId: 'civic_medical_facility_prop', presetId: 'queue_ticket_dispenser_kiosk', pos: [1.55, 0, -0.45], rotDeg: [0, -24, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'lounge_chair', familyId: 'waiting_seating', presetId: 'reception_club_armchair', pos: [1.55, 0, 0.75], rotDeg: [0, -35, 0] },
          { componentId: 'water_cooler', familyId: 'breakroom_equipment', presetId: 'bottled_water_cooler_dispenser', pos: [-2.15, 0, -0.75], rotDeg: [0, 22, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'corner_plant', familyId: 'office_decor_prop', presetId: 'potted_fiddle_leaf_office_plant', pos: [2.05, 0, -0.95], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_waiting_room_clinic', label: 'Medical Waiting Lobby', condition: 'clean', paletteFamily: 'clean_medical_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_waiting_room_public', label: 'Civic Service Queue Zone', condition: 'lightly_worn', paletteFamily: 'municipal_office', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'conference_room_ensemble',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Boardroom & Conference Room',
    description: '10-seat boardroom table ringed by swivel chairs, magnetic wall whiteboard, speaker lectern, and corner plant.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['conference', 'office', 'commercial'],
    architecturalStyle: 'classic_executive',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'conference', 'boardroom', 'meeting', 'whiteboard', 'lectern'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'board_table', familyId: 'conference_table', presetId: 'executive_ten_seat_boardroom', pos: [0, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'chair_n1', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [-1.1, 0, -0.92], rotDeg: [0, 0, 0] },
        { componentId: 'chair_n2', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [0, 0, -0.92], rotDeg: [0, 0, 0] },
        { componentId: 'chair_n3', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [1.1, 0, -0.92], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'chair_s1', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [-1.1, 0, 0.92], rotDeg: [0, 180, 0] },
          { componentId: 'chair_s2', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [0, 0, 0.92], rotDeg: [0, 180, 0] },
          { componentId: 'chair_s3', familyId: 'office_chair', presetId: 'conference_swivel_chair', pos: [1.1, 0, 0.92], rotDeg: [0, 180, 0] },
          { componentId: 'wall_board', familyId: 'coworking_training_furniture', presetId: 'wall_conference_whiteboard', pos: [0, 1.45, -1.95], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'room_lectern', familyId: 'coworking_training_furniture', presetId: 'corporate_speaker_lectern', pos: [-2.35, 0, -1.15], rotDeg: [0, 48, 0] },
          { componentId: 'room_plant', familyId: 'office_decor_prop', presetId: 'potted_fiddle_leaf_office_plant', pos: [2.45, 0, -1.45], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_conference_exec_board', label: 'Executive Boardroom Suite', condition: 'clean', paletteFamily: 'classic_executive', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_conference_briefing', label: 'Clean Strategy Meeting Room', condition: 'new', paletteFamily: 'modern_corporate', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'copy_printing_room',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Copy, Print & Mailroom Bay',
    description: 'Commercial multifunction copier, blueprint plotter, mailroom pigeonhole station, shredder, cart, and 3-stream bin.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'utility_room', 'storage_room'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'copy_room', 'printer', 'copier', 'mailroom', 'shredder'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'copier_main', familyId: 'printer_office_machine', presetId: 'commercial_multifunction_copier', pos: [-1.15, 0, -0.55], rotDeg: [0, 0, 0] },
        { componentId: 'mail_sorter', familyId: 'office_shelving_mailroom', presetId: 'mailroom_pigeonhole_station', pos: [0.45, 0, -0.65], rotDeg: [0, 0, 0] },
        { componentId: 'wide_plotter', familyId: 'printer_office_machine', presetId: 'architect_wide_plotter', pos: [2.05, 0, -0.45], rotDeg: [0, -24, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'shredder_unit', familyId: 'printer_office_machine', presetId: 'office_paper_shredder', pos: [-2.05, 0, 0.25], rotDeg: [0, 18, 0] },
          { componentId: 'supply_cart', familyId: 'office_shelving_mailroom', presetId: 'rolling_mail_supply_cart', pos: [0.55, 0, 0.72], rotDeg: [0, 8, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'recycle_trio', familyId: 'cleaning_maintenance_prop', presetId: 'office_recycling_trash_trio', pos: [-1.15, 0, 0.88], rotDeg: [0, 180, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_copy_room_corp', label: 'Tower Reprographics & Mailroom', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_copy_room_compact', label: 'Floor Copy Alcove', condition: 'lightly_worn', paletteFamily: 'budget_office', params: { spacingScale: 0.95, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'employee_breakroom_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Employee Breakroom & Kitchenette',
    description: 'Sink cabinet with countertop coffee brewer, fridge, snack vending machine, water cooler, round huddle table, and chairs.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['breakroom', 'office', 'coworking'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'breakroom', 'kitchenette', 'vending', 'coffee', 'fridge'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'sink_base', familyId: 'breakroom_equipment', presetId: 'breakroom_sink_cabinet_unit', pos: [-0.85, 0, -0.85], rotDeg: [0, 0, 0] },
        { componentId: 'break_fridge', familyId: 'breakroom_equipment', presetId: 'office_refrigerator_freezer', pos: [0.55, 0, -0.85], rotDeg: [0, 0, 0] },
        { componentId: 'vending_box', familyId: 'breakroom_equipment', presetId: 'snack_drink_vending_machine', pos: [1.65, 0, -0.78], rotDeg: [0, -14, 0] },
        { componentId: 'coffee_maker', familyId: 'breakroom_equipment', presetId: 'commercial_coffee_brewer_station', pos: [-0.48, 0.92, -0.84], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'dining_table', familyId: 'conference_table', presetId: 'small_round_huddle_table', pos: [0.2, 0, 0.85], rotDeg: [0, 0, 0] },
          { componentId: 'chair_left', familyId: 'office_chair', presetId: 'visitor_sled_armchair', pos: [-0.72, 0, 0.85], rotDeg: [0, 88, 0] },
          { componentId: 'chair_right', familyId: 'office_chair', presetId: 'visitor_sled_armchair', pos: [1.12, 0, 0.85], rotDeg: [0, -88, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'cooler', familyId: 'breakroom_equipment', presetId: 'bottled_water_cooler_dispenser', pos: [-1.95, 0, -0.68], rotDeg: [0, 18, 0] },
          { componentId: 'microwave', familyId: 'breakroom_equipment', presetId: 'breakroom_countertop_microwave', pos: [-1.25, 0.92, -0.84], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_breakroom_standard', label: 'Office Pantry & Cafe Lounge', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_breakroom_budget', label: 'Vending & Coffee Corner', condition: 'lightly_worn', paletteFamily: 'budget_office', params: { spacingScale: 1.04, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'government_service_area',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Municipal Public Service Hall',
    description: 'Glazed civic teller windows, queue stanchions, waiting bench, ticket kiosk, voting privacy booth, and wall directory.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['public_service', 'municipal', 'waiting_room', 'lobby'],
    architecturalStyle: 'municipal',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'civic', 'dmv', 'teller', 'waiting', 'public_service'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'teller_counter', familyId: 'reception_counter', presetId: 'municipal_window_counter', pos: [0, 0, -1.1], rotDeg: [0, 0, 0] },
        { componentId: 'dmv_bench', familyId: 'waiting_seating', presetId: 'municipal_four_seat_beam', pos: [-0.85, 0, 0.85], rotDeg: [0, 180, 0] },
        { componentId: 'ticket_dispenser', familyId: 'civic_medical_facility_prop', presetId: 'queue_ticket_dispenser_kiosk', pos: [1.55, 0, 0.65], rotDeg: [0, -28, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'voting_stall', familyId: 'civic_medical_facility_prop', presetId: 'civic_voting_privacy_booth', pos: [2.25, 0, -0.65], rotDeg: [0, -45, 0] },
          { componentId: 'rope_barrier', familyId: 'civic_medical_facility_prop', presetId: 'roped_bank_queue_barrier', pos: [-0.65, 0, -0.05], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'dir_totem', familyId: 'interior_wayfinding_sign', presetId: 'lobby_directory_totem_board', pos: [-2.15, 0, -0.45], rotDeg: [0, 22, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_gov_service_hall', label: 'City Permit & Service Center', condition: 'clean', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_gov_polling_bay', label: 'Civic Intake Counter Bay', condition: 'lightly_worn', paletteFamily: 'municipal_office', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'security_operations_station',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Security Checkpoint & Command Post',
    description: 'Concierge desk with triple Cctv rig, optical turnstile, walk-through metal detector, biometric column, and 42U server rack.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['security', 'lobby', 'municipal', 'office'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'security', 'turnstile', 'metal_detector', 'cctv', 'biometric'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'guard_desk', familyId: 'reception_counter', presetId: 'security_concierge_station', pos: [-1.25, 0, -0.45], rotDeg: [0, 12, 0] },
        { componentId: 'cctv_rig', familyId: 'computer_workstation', presetId: 'triple_security_cctv_console', pos: [-1.22, 0.76, -0.42], rotDeg: [0, 12, 0], overrides: { attachmentProfile: 'surface_placed' } },
        { componentId: 'turnstile_lane', familyId: 'security_access_control', presetId: 'optical_badge_turnstile_gate', pos: [1.15, 0, 0.35], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'metal_arch', familyId: 'security_access_control', presetId: 'walk_through_metal_detector_arch', pos: [1.15, 0, -0.95], rotDeg: [0, 0, 0] },
          { componentId: 'bio_scanner', familyId: 'futuristic_office_tech', presetId: 'biometric_security_pedestal', pos: [2.25, 0, 0.35], rotDeg: [0, -18, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'sec_rack', familyId: 'computer_workstation', presetId: 'telecom_42u_server_rack', pos: [-2.65, 0, -0.85], rotDeg: [0, 18, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_security_corp_checkpoint', label: 'Corporate Atrium Security Gate', condition: 'new', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_security_ops_cmd', label: 'High-Clearance Access Post', condition: 'new', paletteFamily: 'futuristic_ops_center', params: { spacingScale: 1.08, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'corporate_office_corridor',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Office Elevator Lobby & Corridor',
    description: 'Stainless elevator doors, directory monolith, wall fire extinguisher cabinet, ceiling exit sign, planter divider, and cooler.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'lobby', 'commercial'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'elevator', 'corridor', 'exit_sign', 'fire_extinguisher', 'planter'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'elevator_bank', familyId: 'interior_building_infrastructure', presetId: 'elevator_double_doors_call_panel', pos: [-0.65, 0, -1.1], rotDeg: [0, 0, 0] },
        { componentId: 'dir_board', familyId: 'interior_wayfinding_sign', presetId: 'lobby_directory_totem_board', pos: [1.35, 0, -0.75], rotDeg: [0, -14, 0] },
        { componentId: 'fire_cabinet', familyId: 'interior_building_infrastructure', presetId: 'wall_fire_extinguisher_cabinet', pos: [-2.15, 1.32, -1.05], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'exit_sign', familyId: 'interior_wayfinding_sign', presetId: 'illuminated_ceiling_exit_sign', pos: [0, 2.75, 0.2], rotDeg: [0, 0, 0] },
          { componentId: 'corridor_planter', familyId: 'office_decor_prop', presetId: 'rectangular_lobby_divider_planter', pos: [1.75, 0, 0.65], rotDeg: [0, -90, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'wet_floor', familyId: 'cleaning_maintenance_prop', presetId: 'yellow_wet_floor_caution_cone', pos: [-1.65, 0, 0.55], rotDeg: [0, 24, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_office_corridor_clean', label: 'Elevator Bank & Corridor Vestibule', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_office_corridor_quiet', label: 'Corporate Hallway Bay', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'records_archive_room',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Records & File Archive Vault',
    description: 'Archive steel racks filled with bankers boxes, twin 4-drawer vertical cabinets, wide lateral file, map chest, and cart.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['storage_room', 'office', 'municipal', 'utility_room'],
    architecturalStyle: 'budget_office',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'archive', 'filing_cabinet', 'records', 'storage', 'vault'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'rack_a', familyId: 'office_shelving_mailroom', presetId: 'archive_bankers_box_rack', pos: [-1.1, 0, -0.8], rotDeg: [0, 0, 0] },
        { componentId: 'rack_b', familyId: 'office_shelving_mailroom', presetId: 'archive_bankers_box_rack', pos: [0.55, 0, -0.8], rotDeg: [0, 0, 0] },
        { componentId: 'vert_file_1', familyId: 'filing_cabinet', presetId: 'standard_4drawer_vertical_file', pos: [-1.75, 0, 0.55], rotDeg: [0, 90, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'vert_file_2', familyId: 'filing_cabinet', presetId: 'standard_4drawer_vertical_file', pos: [-1.75, 0, 1.08], rotDeg: [0, 90, 0] },
          { componentId: 'lateral_wide', familyId: 'filing_cabinet', presetId: 'wide_lateral_records_cabinet', pos: [1.85, 0, -0.45], rotDeg: [0, -90, 0] },
          { componentId: 'map_chest', familyId: 'filing_cabinet', presetId: 'blueprint_flat_file_chest', pos: [1.55, 0, 0.78], rotDeg: [0, -90, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'archive_cart', familyId: 'office_shelving_mailroom', presetId: 'rolling_mail_supply_cart', pos: [0.1, 0, 0.65], rotDeg: [0, -16, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_records_vault_municipal', label: 'Municipal Records Archive', condition: 'lightly_worn', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_records_vault_clean', label: 'Corporate File Vault', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'public_library_computer_area',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Public Library Reference Terminal Row',
    description: 'Tall wooden library bookcases flanking twin computer study desks with task chairs and a shared laser printer.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['library', 'public_service', 'coworking', 'municipal'],
    architecturalStyle: 'municipal',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'library', 'bookcase', 'computers', 'public', 'study'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'shelf_left', familyId: 'office_shelving_mailroom', presetId: 'library_double_bookcase', pos: [-1.15, 0, -1.1], rotDeg: [0, 0, 0] },
        { componentId: 'shelf_right', familyId: 'office_shelving_mailroom', presetId: 'library_double_bookcase', pos: [0.75, 0, -1.1], rotDeg: [0, 0, 0] },
        { componentId: 'study_desk_a', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [-0.85, 0, 0.55], rotDeg: [0, 0, 0] },
        { componentId: 'study_desk_b', familyId: 'office_desk', presetId: 'standard_employee_desk', pos: [0.78, 0, 0.55], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'lib_chair_a', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [-0.85, 0, 1.15], rotDeg: [0, 180, 0] },
          { componentId: 'lib_chair_b', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [0.78, 0, 1.15], rotDeg: [0, 180, 0] },
          { componentId: 'term_a', familyId: 'computer_workstation', presetId: 'modern_single_lcd_pc', pos: [-0.85, 0.74, 0.45], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'term_b', familyId: 'computer_workstation', presetId: 'modern_single_lcd_pc', pos: [0.78, 0.74, 0.45], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'shared_printer', familyId: 'printer_office_machine', presetId: 'desktop_laser_printer', pos: [-0.04, 0.74, 0.42], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_library_reference_bay', label: 'Civic Library Computer Row', condition: 'clean', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_library_stacks_only', label: 'Library Reference Study Row', condition: 'clean', paletteFamily: 'classic_executive', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'coworking_desk_cluster',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Coworking Shared Flex Studio',
    description: 'Sit-stand desks, soundproof phone booth, rolling whiteboard divider, lounge ottoman bench, and dual-monitor engineering rig.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['coworking', 'office', 'commercial', 'lobby'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'coworking', 'standing_desk', 'phone_booth', 'whiteboard', 'ottoman'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'flex_desk_1', familyId: 'office_desk', presetId: 'motorized_standing_desk', pos: [-0.95, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'flex_desk_2', familyId: 'office_desk', presetId: 'motorized_standing_desk', pos: [0.65, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'focus_booth', familyId: 'coworking_training_furniture', presetId: 'acoustic_solo_phone_booth', pos: [2.25, 0, -0.45], rotDeg: [0, -32, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'flex_chair_1', familyId: 'office_chair', presetId: 'tall_drafting_stool', pos: [-0.95, 0, 0.32], rotDeg: [0, 175, 0] },
          { componentId: 'flex_chair_2', familyId: 'office_chair', presetId: 'ergonomic_mesh_task_chair', pos: [0.65, 0, 0.32], rotDeg: [0, 180, 0] },
          { componentId: 'rolling_board', familyId: 'cubicle_partition', presetId: 'mobile_whiteboard_room_divider', pos: [-2.25, 0, 0.25], rotDeg: [0, 62, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'dev_rig', familyId: 'computer_workstation', presetId: 'dual_monitor_developer_rig', pos: [-0.95, 1.06, -0.42], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'lounge_cube', familyId: 'waiting_seating', presetId: 'coworking_cube_ottoman', pos: [0.15, 0, 1.45], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_coworking_tech_hub', label: 'Startup Shared Flex Pod', condition: 'new', paletteFamily: 'contemporary_tech', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_coworking_clean_desks', label: 'Open Flex Desk Row', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'medical_exam_clinic_suite',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Medical Clinic Exam & Triage Room',
    description: 'Padded exam table, rolling vitals monitor, Iv infusion stand, privacy curtain screen, wall X-ray lightbox, scale, and sharps bin.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['medical', 'clinic', 'waiting_room', 'public_service'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'clinic', 'medical', 'exam_table', 'vitals', 'iv_drip', 'xray'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'exam_table', familyId: 'clinic_exam_equipment', presetId: 'clinic_padded_exam_table', pos: [-0.35, 0, -0.3], rotDeg: [0, 0, 0] },
        { componentId: 'vitals_cart', familyId: 'civic_medical_facility_prop', presetId: 'clinic_rolling_vitals_monitor', pos: [0.75, 0, -0.2], rotDeg: [0, -28, 0] },
        { componentId: 'iv_stand', familyId: 'clinic_exam_equipment', presetId: 'rolling_iv_infusion_stand', pos: [-1.05, 0, -0.55], rotDeg: [0, 12, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'privacy_screen', familyId: 'clinic_exam_equipment', presetId: 'folding_medical_privacy_screen', pos: [-1.45, 0, 0.35], rotDeg: [0, 72, 0] },
          { componentId: 'xray_box', familyId: 'clinic_exam_equipment', presetId: 'wall_xray_film_lightbox', pos: [0.65, 1.48, -1.25], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
          { componentId: 'scale_unit', familyId: 'civic_medical_facility_prop', presetId: 'medical_exam_scale_station', pos: [1.55, 0, -0.65], rotDeg: [0, -20, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'sharps_bin', familyId: 'clinic_exam_equipment', presetId: 'clinic_biohazard_sharps_station', pos: [0.68, 0, 0.55], rotDeg: [0, -14, 0] },
          { componentId: 'sanitizer_post', familyId: 'civic_medical_facility_prop', presetId: 'lobby_hand_sanitizer_stand', pos: [1.65, 0, 0.72], rotDeg: [0, -35, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_clinic_exam_room_clean', label: 'Outpatient Clinic Exam Room', condition: 'clean', paletteFamily: 'clean_medical_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_clinic_triage_bay', label: 'Compact Triage Bay', condition: 'new', paletteFamily: 'clean_medical_office', params: { spacingScale: 0.96, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'mall_concourse_hub',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Shopping Mall Concourse & Kiosk Bay',
    description: 'Center-court retail island kiosk, atrium tree planter bench, touchscreen map totem, Atm machine, food court tray bin, and photo booth.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['mall', 'commercial', 'lobby', 'waiting_room', 'public_service'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'mall', 'kiosk', 'planter_bench', 'atm', 'directory', 'photo_booth'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'retail_kiosk', familyId: 'mall_concourse_fixture', presetId: 'mall_island_retail_kiosk', pos: [-0.85, 0, -0.55], rotDeg: [0, 8, 0] },
        { componentId: 'planter_bench', familyId: 'waiting_seating', presetId: 'mall_atrium_planter_bench', pos: [1.85, 0, 0.45], rotDeg: [0, 0, 0] },
        { componentId: 'map_directory', familyId: 'mall_concourse_fixture', presetId: 'mall_interactive_map_directory', pos: [-2.45, 0, 0.85], rotDeg: [0, 26, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'atm_unit', familyId: 'mall_concourse_fixture', presetId: 'mall_lobby_atm_machine', pos: [1.55, 0, -1.25], rotDeg: [0, -16, 0] },
          { componentId: 'photo_booth', familyId: 'mall_concourse_fixture', presetId: 'mall_instant_photo_booth', pos: [2.75, 0, -0.95], rotDeg: [0, -32, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'tray_bin', familyId: 'mall_concourse_fixture', presetId: 'food_court_tray_trash_receptacle', pos: [-1.85, 0, 1.35], rotDeg: [0, 14, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_mall_concourse_kiosk_bay', label: 'Mall Center Court Concourse', condition: 'new', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_mall_atrium_lounge', label: 'Mall Atrium Planter Plaza', condition: 'clean', paletteFamily: 'commercial_vibrant', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'public_library_reading_grove',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Public Library Carrel & Checkout Zone',
    description: 'Twin wooden library study carrels with task chairs, Rfid self-checkout kiosk, rolling sloped book cart, card catalog, and periodical rack.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['library', 'public_service', 'coworking', 'office'],
    architecturalStyle: 'municipal',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'library', 'carrel', 'book_cart', 'checkout', 'card_catalog'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'carrel_a', familyId: 'library_study_fixture', presetId: 'library_wood_study_carrel', pos: [-0.85, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'carrel_b', familyId: 'library_study_fixture', presetId: 'library_wood_study_carrel', pos: [0.35, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'checkout_kiosk', familyId: 'library_study_fixture', presetId: 'library_rfid_checkout_station', pos: [1.75, 0, -0.15], rotDeg: [0, -24, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'chair_a', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [-0.85, 0, 0.25], rotDeg: [0, 176, 0] },
          { componentId: 'chair_b', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [0.35, 0, 0.25], rotDeg: [0, 180, 0] },
          { componentId: 'card_catalog', familyId: 'library_study_fixture', presetId: 'vintage_library_card_catalog', pos: [-2.15, 0, -0.55], rotDeg: [0, 20, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'book_cart', familyId: 'library_study_fixture', presetId: 'library_sloped_book_truck', pos: [1.35, 0, 0.95], rotDeg: [0, -18, 0] },
          { componentId: 'magazine_rack', familyId: 'library_study_fixture', presetId: 'library_periodical_magazine_rack', pos: [-1.85, 0, 0.95], rotDeg: [0, 32, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_library_carrel_checkout_bay', label: 'Library Study & Self-Checkout Zone', condition: 'clean', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_library_quiet_study_zone', label: 'Quiet Study Carrel Alcove', condition: 'clean', paletteFamily: 'classic_executive', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'science_research_laboratory',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Research & Diagnostics Laboratory Bay',
    description: 'Epoxy wet-lab island bench with microscope & centrifuge kit, biosafety fume hood, cryo incubator, steam autoclave, and safety shower.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['laboratory', 'medical', 'clinic', 'office', 'industrial_interior'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'laboratory', 'fume_hood', 'microscope', 'cryo', 'autoclave', 'science'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'wet_bench', familyId: 'laboratory_science_equipment', presetId: 'wet_lab_epoxy_island_bench', pos: [-0.25, 0, 0.35], rotDeg: [0, 0, 0] },
        { componentId: 'fume_hood', familyId: 'laboratory_science_equipment', presetId: 'lab_chemical_fume_hood', pos: [-0.95, 0, -1.25], rotDeg: [0, 0, 0] },
        { componentId: 'scope_kit', familyId: 'laboratory_science_equipment', presetId: 'tabletop_microscope_centrifuge_kit', pos: [0.08, 0.9, 0.58], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'cryo_unit', familyId: 'laboratory_science_equipment', presetId: 'cryo_specimen_incubator_chamber', pos: [1.15, 0, -1.2], rotDeg: [0, -14, 0] },
          { componentId: 'autoclave', familyId: 'laboratory_science_equipment', presetId: 'clinical_steam_autoclave_unit', pos: [2.05, 0, -0.55], rotDeg: [0, -32, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'eyewash', familyId: 'laboratory_science_equipment', presetId: 'lab_emergency_eyewash_shower', pos: [-2.25, 0, -0.65], rotDeg: [0, 24, 0] },
          { componentId: 'lab_stool', familyId: 'office_chair', presetId: 'tall_drafting_stool', pos: [0.15, 0, 1.15], rotDeg: [0, 180, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_science_wet_lab_bay', label: 'Clinical Wet-Lab & Diagnostics Bay', condition: 'new', paletteFamily: 'clean_medical_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_future_biotech_lab', label: 'Biotech Cryo & Fume Hood Suite', condition: 'new', paletteFamily: 'futuristic_ops_center', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'police_precinct_booking_desk',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Police Precinct Booking & Holding Wing',
    description: 'Emergency 911 dispatch console, mugshot height-chart booking station, iron holding cell front, wire-mesh evidence cage, and detective string board.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['police_station', 'security', 'municipal', 'office'],
    architecturalStyle: 'municipal',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'police', 'booking', 'holding_cell', 'mugshot', 'dispatch', 'evidence'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'dispatch_console', familyId: 'police_station_booking_cell', presetId: 'emergency_911_dispatch_desk', pos: [-1.45, 0, 0.35], rotDeg: [0, 12, 0] },
        { componentId: 'booking_bay', familyId: 'police_station_booking_cell', presetId: 'police_mugshot_booking_station', pos: [0.65, 0, -0.55], rotDeg: [0, 0, 0] },
        { componentId: 'holding_cell', familyId: 'police_station_booking_cell', presetId: 'precinct_holding_cell_front', pos: [0.45, 0, -2.05], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'evidence_cage', familyId: 'police_station_booking_cell', presetId: 'evidence_mesh_storage_locker', pos: [-2.15, 0, -1.25], rotDeg: [0, 28, 0] },
          { componentId: 'gear_locker', familyId: 'police_station_booking_cell', presetId: 'officer_duty_gear_locker', pos: [2.35, 0, -0.95], rotDeg: [0, -24, 0] },
          { componentId: 'operator_chair', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [-1.45, 0, 1.05], rotDeg: [0, 180, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'case_board', familyId: 'police_station_booking_cell', presetId: 'detective_string_case_board', pos: [2.15, 0, 0.65], rotDeg: [0, -35, 0] },
          { componentId: 'desk_papers', familyId: 'cubicle_job_workstation_kit', presetId: 'overworked_paper_stack_kit', pos: [-1.95, 0.78, 0.3], rotDeg: [0, 8, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_police_precinct_booking', label: 'Metro Precinct Booking & Holding Wing', condition: 'clean', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_police_detective_squad', label: 'Precinct Dispatch & Evidence Wing', condition: 'lightly_worn', paletteFamily: 'municipal_office', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'municipal_dmv_service_hall',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Municipal Dmv & Clerk Service Hall',
    description: 'Multi-bay glass Dmv teller counter, waiting room tandem bench, take-a-number ticket dispenser, license photo backdrop, wall pamphlet rack, and flat-file archive.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['courthouse', 'municipal', 'waiting_room', 'public_service'],
    architecturalStyle: 'municipal',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'dmv', 'courthouse', 'civic', 'teller', 'ticket', 'waiting_room'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'teller_window', familyId: 'municipal_courthouse_hearing', presetId: 'dmv_glass_teller_window', pos: [0, 0, -1.05], rotDeg: [0, 0, 0] },
        { componentId: 'waiting_bench', familyId: 'waiting_seating', presetId: 'medical_tandem_three_seat', pos: [-0.45, 0, 0.95], rotDeg: [0, 180, 0] },
        { componentId: 'ticket_stand', familyId: 'waiting_room_amenity_prop', presetId: 'take_a_number_ticket_stand', pos: [1.55, 0, 0.35], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'photo_rig', familyId: 'municipal_courthouse_hearing', presetId: 'dmv_license_photo_backdrop', pos: [-2.15, 0, -0.35], rotDeg: [0, 22, 0] },
          { componentId: 'clerk_chair', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [0, 0, -1.65], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'pamphlet_rack', familyId: 'waiting_room_amenity_prop', presetId: 'wall_medical_pamphlet_rack', pos: [2.15, 1.35, -1.05], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
          { componentId: 'flat_archive', familyId: 'municipal_courthouse_hearing', presetId: 'municipal_blueprint_flat_file', pos: [-2.15, 0, -1.45], rotDeg: [0, 14, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_dmv_license_service_hall', label: 'Dmv Licensing & Queue Hall', condition: 'clean', paletteFamily: 'municipal_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_city_clerk_records_counter', label: 'Municipal Clerk & Records Counter', condition: 'lightly_worn', paletteFamily: 'municipal_office', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'cubicle_call_center_bullpen',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Office & Public Interiors',
    label: 'Cubicle Job & Call Center Bullpen',
    description: 'Back-to-back call center acoustic carrels with task chairs, overworked inbox paperwork stacks, rolling mailroom parcel cart, watercooler noticeboard, and breakroom cake cart.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['call_center', 'office', 'coworking', 'breakroom'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'cubicle', 'call_center', 'bullpen', 'paperwork', 'watercooler', 'mailroom'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'carrel_left', familyId: 'cubicle_job_workstation_kit', presetId: 'call_center_phone_carrel', pos: [-0.85, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'carrel_right', familyId: 'cubicle_job_workstation_kit', presetId: 'call_center_phone_carrel', pos: [0.65, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'chair_left', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [-0.85, 0, 0.35], rotDeg: [0, 178, 0] },
        { componentId: 'chair_right', familyId: 'office_chair', presetId: 'budget_cloth_task_chair', pos: [0.65, 0, 0.35], rotDeg: [0, 182, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'water_nook', familyId: 'cubicle_job_workstation_kit', presetId: 'office_watercooler_bulletin_nook', pos: [2.05, 0, -0.45], rotDeg: [0, -24, 0] },
          { componentId: 'mail_cart', familyId: 'cubicle_job_workstation_kit', presetId: 'rolling_mailroom_parcel_cart', pos: [-2.1, 0, 0.45], rotDeg: [0, 22, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'paper_pile', familyId: 'cubicle_job_workstation_kit', presetId: 'overworked_paper_stack_kit', pos: [-0.95, 0.76, -0.2], rotDeg: [0, 12, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'cake_cart', familyId: 'cubicle_job_workstation_kit', presetId: 'office_celebration_cake_cart', pos: [1.95, 0, 0.85], rotDeg: [0, -40, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_call_center_bullpen', label: 'Call Center Cubicle Bullpen', condition: 'clean', paletteFamily: 'budget_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_busy_backoffice_row', label: 'Overworked Mail & Support Row', condition: 'lightly_worn', paletteFamily: 'retro_90s_office', params: { spacingScale: 1.04, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'building_mechanical_repair_shop',
    isAssembly: true,
    categoryId: 'assemblies',
    subcategory: 'Alley & Service',
    label: 'Mechanical Utility & Repair Bay',
    description: 'Commercial water heater manifold, open circuit breaker panel, high-voltage switchgear, rolling tool chest, wire spool caddy, pipe vise tripod, step ladder, shop vac, and spider flood tower.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['electrical_room', 'plumbing_mechanical', 'utility_room', 'industrial_interior'],
    architecturalStyle: 'industrial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'electrician', 'plumbing', 'mep', 'boiler', 'breaker', 'tool_chest', 'ladder'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'water_heater', familyId: 'plumbing_hvac_repair_equipment', presetId: 'commercial_water_heater_manifold', pos: [-1.45, 0, -0.85], rotDeg: [0, 0, 0] },
        { componentId: 'switchgear', familyId: 'electrician_repair_equipment', presetId: 'high_voltage_switchgear_cabinet', pos: [1.15, 0, -0.85], rotDeg: [0, 0, 0] },
        { componentId: 'breaker_panel', familyId: 'electrician_repair_equipment', presetId: 'open_circuit_breaker_panel', pos: [0, 1.32, -1.15], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'tool_chest', familyId: 'plumbing_hvac_repair_equipment', presetId: 'rolling_multi_drawer_tool_chest', pos: [0.15, 0, 0.35], rotDeg: [0, 8, 0] },
          { componentId: 'wire_cart', familyId: 'electrician_repair_equipment', presetId: 'electrician_wire_spool_cart', pos: [1.85, 0, 0.55], rotDeg: [0, -28, 0] },
          { componentId: 'pipe_vise', familyId: 'plumbing_hvac_repair_equipment', presetId: 'tripod_chain_pipe_vise_rig', pos: [-1.85, 0, 0.65], rotDeg: [0, 22, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'step_ladder', familyId: 'electrician_repair_equipment', presetId: 'fiberglass_electrician_step_ladder', pos: [-0.85, 0, 0.95], rotDeg: [0, 16, 0] },
          { componentId: 'shop_vac', familyId: 'plumbing_hvac_repair_equipment', presetId: 'industrial_wet_dry_shop_vacuum', pos: [1.15, 0, 1.05], rotDeg: [0, -18, 0] },
          { componentId: 'spider_light', familyId: 'electrician_repair_equipment', presetId: 'jobsite_power_spider_box_light', pos: [2.45, 0, -0.25], rotDeg: [0, -35, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_building_mep_mechanical_room', label: 'Building Mep Utility & Boiler Room', condition: 'clean', paletteFamily: 'industrial', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_contractor_maintenance_bay', label: 'Electrician & Plumbing Repair Bay', condition: 'lightly_worn', paletteFamily: 'industrial', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: false } }
    ]
  });

  registerObjectFamily({
    id: 'classic_arcade_cabinet_row',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Classic Arcade Cabinet Row',
    description: 'Four classic 1980s and 1990s coin-op arcade cabinets lined up on retro arcade carpet beneath a neon Arcade marquee.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'mall', 'bowling_alley'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'arcade', 'cabinet_row', 'retro_arcade', 'neon', 'carpet'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'cab_1', familyId: 'arcade_cabinet', presetId: 'classic_80s_upright_cab', pos: [-1.35, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'cab_2', familyId: 'arcade_cabinet', presetId: 'retro_wood_paneled_cab', pos: [-0.48, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'cab_3', familyId: 'arcade_cabinet', presetId: 'narrow_upright_cab', pos: [0.34, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'cab_4', familyId: 'arcade_cabinet', presetId: 'wide_oversized_90s_cab', pos: [1.32, 0, -0.35], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'row_neon', familyId: 'arcade_neon_sign_decor', presetId: 'neon_arcade_marquee_sign', pos: [0, 2.38, -0.82], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'carpet_pad', familyId: 'arcade_floor_wall_surface', presetId: 'classic_32x32_arcade_carpet_tile', pos: [0, 0, 0.25], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 2.5, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_classic_arcade_row_neon', label: '1980s Neon Arcade Cabinet Row', condition: 'clean', paletteFamily: 'arcade_1980s_retro', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_classic_arcade_row_mall', label: 'Neighborhood Mall Arcade Row', condition: 'lightly_worn', paletteFamily: 'arcade_1990s_mall', params: { spacingScale: 1.05, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'arcade_corner_1980s',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: '1980s Arcade Corner Lounge',
    description: 'Classic coin-op upright cabinets paired with a 1980s pinball table, bill-to-token changer, open neon sign, stool, and arcade carpet.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'gaming_lounge'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', '1980s', 'arcade', 'pinball', 'token_changer', 'neon'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'upright_1', familyId: 'arcade_cabinet', presetId: 'classic_80s_upright_cab', pos: [-1.1, 0, -0.65], rotDeg: [0, 12, 0] },
        { componentId: 'upright_2', familyId: 'arcade_cabinet', presetId: 'retro_wood_paneled_cab', pos: [-0.25, 0, -0.75], rotDeg: [0, 0, 0] },
        { componentId: 'pinball_80s', familyId: 'pinball_machine', presetId: 'neon_80s_pinball', pos: [0.95, 0, -0.25], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'token_unit', familyId: 'token_payment_kiosk', presetId: 'classic_bill_token_changer', pos: [-1.95, 0, -0.45], rotDeg: [0, 28, 0] },
          { componentId: 'open_sign', familyId: 'arcade_neon_sign_decor', presetId: 'neon_open_window_sign', pos: [0, 2.25, -1.15], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'stool_1', familyId: 'arcade_seating_fixture', presetId: 'chrome_swivel_arcade_stool', pos: [-0.25, 0, 0.25], rotDeg: [0, 0, 0] },
          { componentId: 'carpet_80s', familyId: 'arcade_floor_wall_surface', presetId: 'classic_32x32_arcade_carpet_tile', pos: [-0.3, 0, 0.05], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_arcade_corner_1980s', label: '1980s Neon Arcade Corner', condition: 'clean', paletteFamily: 'arcade_1980s_retro', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'mall_arcade_1990s',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: '1990s Shopping Mall Arcade Bay',
    description: 'Four-player brawler cabinet, twin linked racer, dual light-gun shooter, plush claw crane, directional neon banner, and mall carpet.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'mall', 'family_entertainment'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', '1990s', 'mall', 'arcade', 'brawler', 'racing', 'shooter', 'claw'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'coop_cab', familyId: 'specialty_arcade_cabinet', presetId: 'four_player_coop_brawler', pos: [-1.85, 0, -0.55], rotDeg: [0, 8, 0] },
        { componentId: 'twin_racer', familyId: 'racing_driving_machine', presetId: 'twin_linked_racing_cabs', pos: [0.05, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'gun_cab', familyId: 'shooting_action_cabinet', presetId: 'dual_blaster_arcade_cab', pos: [1.95, 0, -0.55], rotDeg: [0, -10, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'mall_claw', familyId: 'claw_prize_machine', presetId: 'classic_plush_claw_crane', pos: [-3.15, 0, 0.25], rotDeg: [0, 26, 0] },
          { componentId: 'dir_sign', familyId: 'arcade_neon_sign_decor', presetId: 'neon_tokens_prizes_directional', pos: [0, 2.42, -1.1], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'mall_carpet', familyId: 'arcade_floor_wall_surface', presetId: 'retro_squiggle_carpet_swatch', pos: [-0.2, 0, 0.2], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_mall_arcade_1990s', label: '1990s Food-Court Mall Arcade', condition: 'clean', paletteFamily: 'arcade_1990s_mall', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'fighting_game_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Fighting Tournament & Co-Op Zone',
    description: 'Head-to-head versus cabinets, six-player mega station, swivel tournament stools, and hanging High Scores leaderboard.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'gaming_lounge', 'mall'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'fighting', 'versus', 'tournament', 'esports', 'multiplayer'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'versus_pair', familyId: 'specialty_arcade_cabinet', presetId: 'linked_opposing_versus_station', pos: [-0.95, 0, 0.05], rotDeg: [0, 90, 0] },
        { componentId: 'fighting_cab', familyId: 'specialty_arcade_cabinet', presetId: 'fighting_2p_versus_cab', pos: [1.35, 0, -0.55], rotDeg: [0, -14, 0] },
        { componentId: 'six_player', familyId: 'specialty_arcade_cabinet', presetId: 'six_player_mega_cabinet', pos: [1.35, 0, 0.95], rotDeg: [0, -32, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'stool_left', familyId: 'arcade_seating_fixture', presetId: 'chrome_swivel_arcade_stool', pos: [-2.15, 0, 0.05], rotDeg: [0, 90, 0] },
          { componentId: 'stool_right', familyId: 'arcade_seating_fixture', presetId: 'chrome_swivel_arcade_stool', pos: [0.25, 0, 0.05], rotDeg: [0, -90, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'leader_board', familyId: 'arcade_neon_sign_decor', presetId: 'neon_high_scores_leaderboard', pos: [0, 2.45, -1.1], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_fighting_tournament_zone', label: 'Fighting Tournament Stage Zone', condition: 'clean', paletteFamily: 'arcade_1990s_mall', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'racing_arcade_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Racing & Motion Simulator Zone',
    description: 'Four-player linked racing bank flanked by a deluxe motion cockpit and motorcycle ride-on simulator over checkered flooring.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'mall'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'racing', 'driving', 'motorcycle', 'motion_cockpit', 'simulator'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'four_row', familyId: 'racing_driving_machine', presetId: 'four_player_linked_racers', pos: [0, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'moto_sim', familyId: 'racing_driving_machine', presetId: 'motorcycle_ride_on_sim', pos: [-2.65, 0, 0.2], rotDeg: [0, 18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'motion_sim', familyId: 'racing_driving_machine', presetId: 'deluxe_motion_cockpit_racer', pos: [2.65, 0, 0.15], rotDeg: [0, -18, 0] },
          { componentId: 'score_header', familyId: 'arcade_neon_sign_decor', presetId: 'neon_high_scores_leaderboard', pos: [0, 2.55, -1.2], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'checker_pad', familyId: 'arcade_floor_wall_surface', presetId: 'arcade_vinyl_checker_floor', pos: [0, 0, 0.3], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_racing_simulator_bay', label: 'Championship Racing Simulator Zone', condition: 'clean', paletteFamily: 'modern_family_entertainment', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'pinball_corner_ensemble',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Pinball Hall Lineup Corner',
    description: 'Four pinball machines across classic 1970s, 1980s neon, 1990s widebody, and superhero eras with a token changer and neon wall tubes.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'gaming_lounge', 'residential_game_room'],
    architecturalStyle: 'retro_arcade_80s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'pinball', 'lineup', 'retro', 'token_changer'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'pin_70s', familyId: 'pinball_machine', presetId: 'classic_70s_em_pinball', pos: [-1.35, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'pin_80s', familyId: 'pinball_machine', presetId: 'neon_80s_pinball', pos: [-0.45, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'pin_90s', familyId: 'pinball_machine', presetId: 'widebody_90s_pinball', pos: [0.48, 0, 0], rotDeg: [0, 0, 0] },
        { componentId: 'pin_hero', familyId: 'pinball_machine', presetId: 'themed_superhero_pinball', pos: [1.45, 0, 0], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'pin_changer', familyId: 'token_payment_kiosk', presetId: 'classic_bill_token_changer', pos: [-2.35, 0, -0.25], rotDeg: [0, 20, 0] },
          { componentId: 'wall_tubes', familyId: 'arcade_neon_sign_decor', presetId: 'geometric_neon_wall_trim', pos: [0, 2.2, -0.95], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'pin_carpet', familyId: 'arcade_floor_wall_surface', presetId: 'classic_32x32_arcade_carpet_tile', pos: [0, 0, 0.25], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 2.5, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_pinball_lineup_hall', label: 'Classic Pinball Lineup Corner', condition: 'clean', paletteFamily: 'arcade_1980s_retro', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'prize_redemption_counter_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Prize Redemption Counter Zone',
    description: 'Glass prize counter backed by wall-mounted plush prize shelves, novelty carousel, jackpot glass showcase, ticket eater, and token bucket kit.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'mall'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'prize_counter', 'tickets', 'redemption', 'plush'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'main_counter', familyId: 'prize_redemption_counter', presetId: 'large_glass_prize_counter', pos: [0, 0, 0.1], rotDeg: [0, 0, 0] },
        { componentId: 'back_pegs', familyId: 'prize_redemption_counter', presetId: 'wall_pegboard_prize_shelves', pos: [0, 1.45, -1.05], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
        { componentId: 'jackpot_case', familyId: 'prize_redemption_counter', presetId: 'plush_showcase_display_case', pos: [1.95, 0, -0.3], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'ticket_eater', familyId: 'token_payment_kiosk', presetId: 'ticket_counting_eater_station', pos: [-1.85, 0, 0.35], rotDeg: [0, 18, 0] },
          { componentId: 'spin_rack', familyId: 'prize_redemption_counter', presetId: 'rotating_novelty_prize_rack', pos: [-1.55, 0, -0.55], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'bucket_kit', familyId: 'token_payment_kiosk', presetId: 'counter_token_bucket_ticket_kit', pos: [0.45, 1.02, 0.12], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_prize_redemption_zone', label: 'Family Arcade Prize Counter', condition: 'clean', paletteFamily: 'modern_family_entertainment', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'claw_machine_corner',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Claw Crane & Capsule Prize Corner',
    description: 'Plush claw crane, double-chamber crane, jumbo prize crane, gashapon capsule bank, stacker locker, and cashless tap-card kiosk.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'mall', 'family_entertainment'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'claw_machine', 'crane', 'gashapon', 'prizes'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'claw_std', familyId: 'claw_prize_machine', presetId: 'classic_plush_claw_crane', pos: [-1.35, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'claw_twin', familyId: 'claw_prize_machine', presetId: 'double_twin_claw_machine', pos: [-0.05, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'claw_jumbo', familyId: 'claw_prize_machine', presetId: 'jumbo_led_prize_crane', pos: [1.45, 0, -0.35], rotDeg: [0, -12, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'gacha_bank', familyId: 'claw_prize_machine', presetId: 'capsule_gashapon_bank', pos: [-2.45, 0, 0.2], rotDeg: [0, 26, 0] },
          { componentId: 'card_kiosk', familyId: 'token_payment_kiosk', presetId: 'tap_card_recharge_kiosk', pos: [2.45, 0, 0.45], rotDeg: [0, -28, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'purple_carpet', familyId: 'arcade_floor_wall_surface', presetId: 'purple_geo_neon_carpet', pos: [0, 0, 0.15], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 2.5, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_claw_crane_alcove', label: 'Mall Claw Crane & Gashapon Alcove', condition: 'clean', paletteFamily: 'modern_family_entertainment', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'dance_rhythm_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Rhythm, Dance & Music Stage',
    description: 'Dual dance stage flanked by electronic drums, Dj turntable mixer, guitar stage, disco blacklight rig, speaker stacks, and Led dance floor.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'family_entertainment', 'mall'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'dance', 'rhythm', 'drums', 'dj', 'guitar', 'disco_ball'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'dance_stage', familyId: 'rhythm_music_machine', presetId: 'dual_dance_stage_cab', pos: [0, 0, -0.2], rotDeg: [0, 0, 0] },
        { componentId: 'drum_cab', familyId: 'rhythm_music_machine', presetId: 'electronic_drum_arcade', pos: [-1.85, 0, -0.35], rotDeg: [0, 14, 0] },
        { componentId: 'dj_cab', familyId: 'rhythm_music_machine', presetId: 'dj_turntable_beat_cab', pos: [1.85, 0, -0.35], rotDeg: [0, -14, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'spk_left', familyId: 'arcade_neon_sign_decor', presetId: 'dual_arcade_speaker_stack', pos: [-2.85, 0, -0.35], rotDeg: [0, 18, 0] },
          { componentId: 'disco_truss', familyId: 'arcade_neon_sign_decor', presetId: 'ceiling_disco_blacklight_truss', pos: [0, 2.85, 0], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'ceiling_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'led_dance_pad', familyId: 'arcade_floor_wall_surface', presetId: 'led_illuminated_dance_tile', pos: [0, 0, 0.35], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_rhythm_dance_stage', label: 'Rhythm & Dance Music Stage', condition: 'clean', paletteFamily: 'modern_family_entertainment', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'modern_arcade_lounge',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Modern Vr & Esports Bar Lounge',
    description: 'Omnidirectional Vr treadmill, holographic game pod, 4-player touchscreen table, retro booth seating, energy drink cooler, and reload kiosk.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'modern_arcade', 'gaming_lounge', 'superhero_base'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'vr', 'lounge', 'touchscreen', 'drinks', 'modern_arcade'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'vr_omni', familyId: 'vr_interactive_attraction', presetId: 'vr_360_walking_treadmill', pos: [-1.65, 0, -0.3], rotDeg: [0, 16, 0] },
        { componentId: 'touch_tbl', familyId: 'vr_interactive_attraction', presetId: 'multiplayer_touchscreen_table', pos: [0.15, 0, 0.45], rotDeg: [0, 0, 0] },
        { componentId: 'holo_pod', familyId: 'vr_interactive_attraction', presetId: 'holo_cyber_game_terminal', pos: [1.85, 0, -0.3], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'booth_seat', familyId: 'arcade_seating_fixture', presetId: 'retro_diner_booth_table', pos: [-1.85, 0, 1.35], rotDeg: [0, 90, 0] },
          { componentId: 'drink_cooler', familyId: 'arcade_concession_stand', presetId: 'cold_energy_drink_cooler', pos: [2.75, 0, -0.65], rotDeg: [0, -25, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'vr_banner', familyId: 'arcade_neon_sign_decor', presetId: 'neon_vr_zone_arch_sign', pos: [0, 2.45, -1.1], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_modern_vr_lounge', label: 'Modern Vr & Barcade Lounge', condition: 'clean', paletteFamily: 'superhero_cyber_arcade', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'family_entertainment_corner',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Family Entertainment Alley & Concessions',
    description: 'Skee-ball lane, dual basketball shootout, air hockey table, giant spinning prize wheel, popcorn cart, and twin slushie counter.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'family_entertainment', 'bowling_alley', 'mall'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'skee_ball', 'basketball', 'air_hockey', 'popcorn', 'slushie'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'skee_lane', familyId: 'skill_redemption_alley', presetId: 'classic_skee_ball_lane', pos: [-2.15, 0, -0.3], rotDeg: [0, 0, 0] },
        { componentId: 'hoop_dual', familyId: 'skill_redemption_alley', presetId: 'dual_basketball_shootout', pos: [-0.25, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'air_hockey', familyId: 'skill_redemption_alley', presetId: 'air_hockey_table', pos: [1.95, 0, 0.15], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'big_wheel', familyId: 'ticket_redemption_game', presetId: 'giant_spinning_prize_wheel', pos: [-3.25, 0, 0.4], rotDeg: [0, 22, 0] },
          { componentId: 'slush_bar', familyId: 'arcade_concession_stand', presetId: 'twin_slush_drink_machine', pos: [3.2, 0, -0.45], rotDeg: [0, -24, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'popcorn', familyId: 'arcade_concession_stand', presetId: 'retro_popcorn_cart', pos: [3.15, 0, 0.95], rotDeg: [0, -32, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_fec_alley_concessions', label: 'Family Fun Center Alley & Snacks', condition: 'clean', paletteFamily: 'modern_family_entertainment', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'arcade_maintenance_area',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Arcade Technician Workshop & Backroom',
    description: 'Pcb soldering bench, out-of-order cabinet under repair, rolling joystick parts cart, cash vault locker, coin door rig, and Cctv bar.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['arcade', 'retro_arcade', 'family_entertainment'],
    architecturalStyle: 'industrial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'maintenance', 'repair', 'pcb', 'vault', 'out_of_order'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'pcb_bench', familyId: 'arcade_operations_maintenance', presetId: 'arcade_electronics_repair_bench', pos: [-0.85, 0, -0.55], rotDeg: [0, 0, 0] },
        { componentId: 'broken_cab', familyId: 'arcade_cabinet', presetId: 'out_of_order_abandoned_cab', pos: [1.05, 0, -0.45], rotDeg: [0, -18, 0] },
        { componentId: 'parts_cart', familyId: 'arcade_operations_maintenance', presetId: 'rolling_arcade_parts_tool_cart', pos: [0.15, 0, 0.65], rotDeg: [0, 12, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'cash_vault', familyId: 'arcade_operations_maintenance', presetId: 'coin_key_security_vault_locker', pos: [-2.15, 0, -0.55], rotDeg: [0, 0, 0] },
          { componentId: 'cctv_rig', familyId: 'arcade_operations_maintenance', presetId: 'twin_ceiling_dome_cctv_bar', pos: [0, 2.55, -0.35], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'ceiling_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'spare_coin_door', familyId: 'arcade_control_rig', presetId: 'coin_door_service_module', pos: [-1.15, 0.89, -0.55], rotDeg: [0, 8, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_arcade_repair_workshop', label: 'Arcade Technician Backroom Workshop', condition: 'lightly_worn', paletteFamily: 'industrial', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'retro_gaming_store_display',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Retro Game Store Showroom Bay',
    description: 'Playable retail demo kiosk, boxed cartridge gondola, glass console showcase counter, wall controller rack, rolling Crt Av cart, and gashapon bank.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['game_store', 'mall', 'retro_arcade'],
    architecturalStyle: 'mall_arcade_90s',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'game_store', 'retail', 'retro_console', 'demo_kiosk', 'crt'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'demo_kiosk', familyId: 'game_store_retro_hardware', presetId: 'playable_crt_store_demo_kiosk', pos: [-1.55, 0, -0.25], rotDeg: [0, 14, 0] },
        { componentId: 'console_counter', familyId: 'game_store_retro_hardware', presetId: 'glass_console_display_counter', pos: [0.35, 0, -0.45], rotDeg: [0, 0, 0] },
        { componentId: 'game_gondola', familyId: 'game_store_retro_hardware', presetId: 'boxed_game_retail_gondola', pos: [1.95, 0, 0.15], rotDeg: [0, -24, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'controller_wall', familyId: 'game_store_retro_hardware', presetId: 'controller_headset_pegboard_wall', pos: [0.35, 1.45, -1.1], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
          { componentId: 'store_gacha', familyId: 'claw_prize_machine', presetId: 'capsule_gashapon_bank', pos: [-2.65, 0, 0.35], rotDeg: [0, 22, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'av_cart', familyId: 'game_store_retro_hardware', presetId: 'rolling_av_cart_crt_vcr', pos: [-0.85, 0, 0.85], rotDeg: [0, 18, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_retro_game_store', label: '1990s Retro Game Store Display', condition: 'clean', paletteFamily: 'arcade_1990s_mall', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'home_game_room',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Basement & Apartment Game Room',
    description: 'Cocktail table arcade, virtual pinball, shuffleboard table, retro console Crt stand, countertop mini bartop, padded stools, and pixel posters.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_game_room', 'retro_arcade', 'gaming_lounge'],
    architecturalStyle: 'home_game_room',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'home_arcade', 'apartment', 'cocktail_table', 'pinball', 'posters'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'cocktail_cab', familyId: 'arcade_cabinet', presetId: 'cocktail_table_arcade', pos: [-1.15, 0, 0.35], rotDeg: [0, 0, 0] },
        { componentId: 'virtual_pin', familyId: 'pinball_machine', presetId: 'modern_virtual_digital_pinball', pos: [0.35, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'shuffle_tbl', familyId: 'skill_redemption_alley', presetId: 'tabletop_shuffleboard', pos: [1.85, 0, 0.15], rotDeg: [0, -14, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'stool_a', familyId: 'arcade_seating_fixture', presetId: 'padded_vinyl_drum_stool', pos: [-1.15, 0, 0.98], rotDeg: [0, 0, 0] },
          { componentId: 'posters', familyId: 'arcade_neon_sign_decor', presetId: 'framed_pixel_poster_trio', pos: [0.1, 1.85, -1.1], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'console_set', familyId: 'game_store_retro_hardware', presetId: 'tabletop_classic_console_crt', pos: [-1.15, 0.78, 0.35], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'game_carpet', familyId: 'arcade_floor_wall_surface', presetId: 'classic_32x32_arcade_carpet_tile', pos: [0, 0, 0.15], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_home_game_room', label: 'Apartment Rec Room Setup', condition: 'clean', paletteFamily: 'home_game_room', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'superhero_base_arcade',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', 'arcades_entertainment'],
    subcategory: 'Arcade Assemblies & Environmental Scenes',
    label: 'Superhero Base Rec Room Lounge',
    description: 'High-tech deluxe pedestal arcade, 6-player hero cab, anti-gravity racer, turret blaster cab, Vr motion pod, headset dock, and blacklight carpet.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['superhero_base', 'gaming_lounge', 'modern_arcade'],
    architecturalStyle: 'modern_fec',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'superhero_base', 'cyber_arcade', 'vr', 'futuristic', 'base_rec_room'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'hero_6p', familyId: 'specialty_arcade_cabinet', presetId: 'six_player_mega_cabinet', pos: [-1.55, 0, -0.45], rotDeg: [0, 10, 0] },
        { componentId: 'pedestal_cab', familyId: 'arcade_cabinet', presetId: 'deluxe_pedestal_showcase', pos: [0.35, 0, -0.5], rotDeg: [0, 0, 0] },
        { componentId: 'hover_racer', familyId: 'racing_driving_machine', presetId: 'futuristic_hover_racer', pos: [2.05, 0, -0.15], rotDeg: [0, -18, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'vr_pod', familyId: 'vr_interactive_attraction', presetId: 'vr_motion_capsule_pod', pos: [-2.65, 0, 0.85], rotDeg: [0, 32, 0] },
          { componentId: 'vr_dock', familyId: 'vr_interactive_attraction', presetId: 'vr_headset_charge_stand', pos: [1.65, 0, 1.15], rotDeg: [0, -28, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'turret_cab', familyId: 'shooting_action_cabinet', presetId: 'mounted_turret_gun_cab', pos: [-0.25, 0, 1.05], rotDeg: [0, 180, 0] },
          { componentId: 'cyber_carpet', familyId: 'arcade_floor_wall_surface', presetId: 'blacklight_bowling_carpet', pos: [0, 0, 0.2], rotDeg: [0, 0, 0], overrides: { width: 4.0, depth: 3.0, repeatCount: 4 } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_superhero_base_rec_room', label: 'Superhero Base Rec & Training Arcade', condition: 'clean', paletteFamily: 'superhero_cyber_arcade', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'living_room_sofa_ensemble',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Sofas, Loveseats & Sectionals'],
    label: 'Apartment Living Room Sofa & Media Lounge',
    description: 'Three-seat sofa, wingback armchair, wood coffee table, media Tv console, floor lamp, woven area rug, and potted houseplant.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'living_room'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'living_room', 'sofa', 'coffee_table', 'tv', 'armchair', 'residential'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'main_sofa', familyId: 'residential_sofa_lounger', presetId: 'classic_3seat_living_sofa', pos: [0, 0, 1.05], rotDeg: [0, 180, 0] },
        { componentId: 'coffee_table', familyId: 'residential_dining_side_table', presetId: 'living_wood_coffee_table', pos: [0, 0, -0.05], rotDeg: [0, 0, 0] },
        { componentId: 'media_unit', familyId: 'residential_bedroom_storage', presetId: 'living_room_tv_stand', pos: [0, 0, -1.35], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'side_armchair', familyId: 'residential_chair_seating', presetId: 'living_wingback_armchair', pos: [-1.55, 0, 0.15], rotDeg: [0, 62, 0] },
          { componentId: 'end_table', familyId: 'residential_dining_side_table', presetId: 'square_sofa_end_table', pos: [1.38, 0, 1.05], rotDeg: [0, 0, 0] },
          { componentId: 'floor_lamp', familyId: 'residential_household_decor', presetId: 'tripod_living_floor_lamp', pos: [-1.42, 0, 1.05], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'area_rug', familyId: 'residential_household_decor', presetId: 'woven_living_area_rug', pos: [0, 0, 0.25], rotDeg: [0, 0, 0] },
          { componentId: 'houseplant', familyId: 'residential_household_decor', presetId: 'potted_living_houseplant', pos: [1.35, 0, -1.15], rotDeg: [0, 20, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_living_room_apartment', label: 'Modern Apartment Living Room', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } },
      { id: 'asm_living_room_classic', label: 'Classic Family Living Lounge', condition: 'clean', paletteFamily: 'wood_office_executive', params: { spacingScale: 1.06, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'family_dining_kitchen_set',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Dining, Coffee & Side Tables'],
    label: 'Family Dining Table & Kitchen Ensemble',
    description: 'Rectangular wooden dining table surrounded by six dining chairs, double-door refrigerator, butcher-block island, and china hutch.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'dining_room', 'kitchen'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'dining_room', 'dining_table', 'dining_chair', 'kitchen', 'fridge', 'residential'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'dining_table', familyId: 'residential_dining_side_table', presetId: 'family_rect_dining_table', pos: [0, 0, 0.2], rotDeg: [0, 0, 0] },
        { componentId: 'chair_n1', familyId: 'residential_chair_seating', presetId: 'wood_slat_dining_chair', pos: [-0.52, 0, -0.46], rotDeg: [0, 0, 0] },
        { componentId: 'chair_n2', familyId: 'residential_chair_seating', presetId: 'wood_slat_dining_chair', pos: [0.52, 0, -0.46], rotDeg: [0, 0, 0] },
        { componentId: 'chair_s1', familyId: 'residential_chair_seating', presetId: 'wood_slat_dining_chair', pos: [-0.52, 0, 0.86], rotDeg: [0, 180, 0] },
        { componentId: 'chair_s2', familyId: 'residential_chair_seating', presetId: 'wood_slat_dining_chair', pos: [0.52, 0, 0.86], rotDeg: [0, 180, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'chair_w', familyId: 'residential_chair_seating', presetId: 'upholstered_dining_chair', pos: [-1.18, 0, 0.2], rotDeg: [0, 90, 0] },
          { componentId: 'chair_e', familyId: 'residential_chair_seating', presetId: 'upholstered_dining_chair', pos: [1.18, 0, 0.2], rotDeg: [0, -90, 0] },
          { componentId: 'kitchen_fridge', familyId: 'residential_kitchen_appliance', presetId: 'stainless_double_refrigerator', pos: [-1.95, 0, -1.25], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'china_hutch', familyId: 'residential_kitchen_appliance', presetId: 'glass_china_pantry_hutch', pos: [1.65, 0, -1.3], rotDeg: [0, -10, 0] },
          { componentId: 'houseplant', familyId: 'residential_household_decor', presetId: 'potted_living_houseplant', pos: [-2.15, 0, 0.95], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_family_dining_six_seat', label: 'Six-Seat Family Dining & Kitchen', condition: 'clean', paletteFamily: 'wood_office_executive', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'cozy_apartment_bedroom_suite',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Beds, Dressers & Home Storage'],
    label: 'Cozy Apartment Bedroom Suite',
    description: 'Queen platform bed, pair of two-drawer nightstands, warm bedside table lamps, tall five-drawer dresser, vanity stool, and laundry hamper.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'bedroom'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'bedroom', 'bed', 'nightstand', 'dresser', 'lamp', 'residential'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'queen_bed', familyId: 'residential_bedroom_storage', presetId: 'queen_platform_bed', pos: [0, 0, -0.25], rotDeg: [0, 0, 0] },
        { componentId: 'nightstand_l', familyId: 'residential_dining_side_table', presetId: 'bedside_nightstand_2drawer', pos: [-1.22, 0, -1.0], rotDeg: [0, 0, 0] },
        { componentId: 'nightstand_r', familyId: 'residential_dining_side_table', presetId: 'bedside_nightstand_2drawer', pos: [1.22, 0, -1.0], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'lamp_l', familyId: 'residential_household_decor', presetId: 'bedside_ceramic_table_lamp', pos: [-1.22, 0.6, -1.0], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'tall_dresser', familyId: 'residential_bedroom_storage', presetId: 'tall_5drawer_chest', pos: [2.15, 0, -0.2], rotDeg: [0, -90, 0] },
          { componentId: 'vanity_stool', familyId: 'residential_chair_seating', presetId: 'padded_bedroom_vanity_stool', pos: [-1.85, 0, 0.45], rotDeg: [0, 42, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'hamper', familyId: 'residential_household_decor', presetId: 'wicker_bedroom_laundry_hamper', pos: [2.05, 0, 0.85], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_cozy_apartment_bedroom', label: 'Apartment Master Bedroom Suite', condition: 'clean', paletteFamily: 'wood_office_executive', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'modern_bathroom_suite',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Bathroom & Laundry Fixtures'],
    label: 'Modern Master Bathroom Suite',
    description: 'Walk-in glass shower stall, master double-sink vanity, porcelain toilet, heated towel warmer, bath hamper/scale caddy, and countertop toiletries.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'bathroom'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'bathroom', 'shower', 'vanity', 'toilet', 'towel_warmer', 'residential'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'glass_shower', familyId: 'bathroom_fixtures_accessories', presetId: 'walk_in_glass_shower_stall', pos: [-1.15, 0, -0.55], rotDeg: [0, 0, 0] },
        { componentId: 'double_vanity', familyId: 'bathroom_fixtures_accessories', presetId: 'master_double_vanity_sconce', pos: [0.65, 0, -0.78], rotDeg: [0, 0, 0] },
        { componentId: 'toilet_unit', familyId: 'residential_bath_laundry', presetId: 'porcelain_flush_toilet', pos: [-0.1, 0, 0.75], rotDeg: [0, 90, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'towel_warmer', familyId: 'bathroom_fixtures_accessories', presetId: 'heated_chrome_towel_warmer', pos: [-1.1, 0, 0.65], rotDeg: [0, 90, 0] },
          { componentId: 'hamper_scale', familyId: 'bathroom_fixtures_accessories', presetId: 'bath_hamper_digital_scale', pos: [1.85, 0, -0.45], rotDeg: [0, -35, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'vanity_tray', familyId: 'bathroom_fixtures_accessories', presetId: 'vanity_toiletries_soap_tray', pos: [0.65, 0.87, -0.76], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_modern_bathroom_suite', label: 'Master Glass Shower Bathroom Suite', condition: 'clean', paletteFamily: 'clean_medical_office', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'chef_kitchen_ensemble',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Kitchen Appliances & Counters'],
    label: 'Chef Kitchen & Breakfast Island Suite',
    description: 'Glass-upper cabinet run, stove range with chimney hood, stainless dishwasher, double refrigerator, breakfast peninsula with barstools, and espresso prep props.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['residential_interior', 'kitchen'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'kitchen', 'dishwasher', 'range_hood', 'peninsula', 'fridge', 'espresso'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'cabinet_run', familyId: 'kitchen_prep_appliances', presetId: 'kitchen_cabinet_glass_uppers', pos: [-1.1, 0, -1.05], rotDeg: [0, 0, 0] },
        { componentId: 'stove_range', familyId: 'residential_kitchen_appliance', presetId: 'four_burner_stove_oven', pos: [0.38, 0, -1.02], rotDeg: [0, 0, 0] },
        { componentId: 'range_hood', familyId: 'kitchen_prep_appliances', presetId: 'stainless_chimney_range_hood', pos: [0.38, 1.38, -1.36], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'wall_mounted' } },
        { componentId: 'peninsula_bar', familyId: 'kitchen_prep_appliances', presetId: 'granite_breakfast_peninsula', pos: [0.15, 0, 0.72], rotDeg: [0, 180, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'dishwasher', familyId: 'kitchen_prep_appliances', presetId: 'stainless_builtin_dishwasher', pos: [1.14, 0, -1.04], rotDeg: [0, 0, 0] },
          { componentId: 'fridge', familyId: 'residential_kitchen_appliance', presetId: 'stainless_double_refrigerator', pos: [1.96, 0, -0.96], rotDeg: [0, 0, 0] },
          { componentId: 'wine_cooler', familyId: 'kitchen_prep_appliances', presetId: 'dual_zone_glass_wine_cooler', pos: [-2.15, 0, 0.35], rotDeg: [0, 90, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'espresso_bar', familyId: 'kitchen_prep_appliances', presetId: 'espresso_stand_mixer_bar', pos: [-1.1, 0.91, -1.02], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'knife_prep', familyId: 'kitchen_prep_appliances', presetId: 'knife_block_skillet_prep', pos: [0.32, 0.99, 0.72], rotDeg: [0, 0, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_chef_kitchen_ensemble', label: 'Full Chef Kitchen & Island Ensemble', condition: 'clean', paletteFamily: 'modern_corporate', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'backyard_patio_bbq_lounge',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '29_residential_household'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Patio & Outdoor Living'],
    label: 'Backyard Patio Grill & Fire Pit Lounge',
    description: 'Stacked-stone fire pit surrounded by slatted Adirondack chairs, propane barbecue grill station, market umbrella dining set, sun lounger, and tiki planters.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'exterior',
    environmentTags: ['patio', 'courtyard', 'outdoor_plaza'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'patio', 'fire_pit', 'grill', 'adirondack', 'umbrella', 'backyard'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'fire_pit', familyId: 'patio_outdoor_living', presetId: 'stacked_stone_fire_pit', pos: [0, 0, 0.45], rotDeg: [0, 0, 0] },
        { componentId: 'chair_left', familyId: 'patio_outdoor_living', presetId: 'slatted_adirondack_chair', pos: [-1.28, 0, 0.3], rotDeg: [0, 62, 0] },
        { componentId: 'chair_right', familyId: 'patio_outdoor_living', presetId: 'slatted_adirondack_chair', pos: [1.28, 0, 0.3], rotDeg: [0, -62, 0] },
        { componentId: 'bbq_grill', familyId: 'patio_outdoor_living', presetId: 'propane_barbecue_grill_station', pos: [-1.85, 0, -1.45], rotDeg: [0, 20, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'umbrella_dining', familyId: 'patio_outdoor_living', presetId: 'patio_umbrella_dining_set', pos: [1.95, 0, -1.55], rotDeg: [0, 15, 0] },
          { componentId: 'chaise_lounger', familyId: 'patio_outdoor_living', presetId: 'poolside_wicker_chaise_lounger', pos: [-2.55, 0, 1.35], rotDeg: [0, 35, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'tiki_planter', familyId: 'patio_outdoor_living', presetId: 'patio_planters_cooler_tiki', pos: [0.1, 0, -1.65], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_backyard_patio_bbq_lounge', label: 'Backyard Patio Grill & Fire Lounge', condition: 'clean', paletteFamily: 'park_heritage', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'fitness_gym_locker_zone',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '27_sims_everyday_misc'],
    subcategory: 'Residential & Rooftop',
    subcategories: ['Residential & Rooftop', 'Gym, Fitness & Locker Room'],
    label: 'Fitness Gym & Locker Room Bay',
    description: 'Squat power rack, 45-degree leg press, Olympic weight plate tree, commercial treadmill, oak locker bench, steel locker bank, yoga mat cart, and refill fountain.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'interior',
    environmentTags: ['gym', 'locker_room', 'fitness', 'recreation_room'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'gym', 'fitness', 'locker', 'squat_rack', 'leg_press', 'treadmill'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'squat_rack', familyId: 'gym_strength_equipment', presetId: 'squat_power_rack_barbell', pos: [-1.55, 0, -1.15], rotDeg: [0, 0, 0] },
        { componentId: 'leg_press', familyId: 'gym_specialty_machines', presetId: 'leg_press_45_machine', pos: [0.35, 0, -1.15], rotDeg: [0, 0, 0] },
        { componentId: 'treadmill', familyId: 'gym_cardio_equipment', presetId: 'commercial_treadmill', pos: [2.05, 0, -0.95], rotDeg: [0, 0, 0] },
        { componentId: 'locker_bank', familyId: 'gym_functional_facilities', presetId: 'gym_steel_locker_bank', pos: [-1.45, 0, 1.35], rotDeg: [0, 180, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'plate_tree', familyId: 'gym_specialty_machines', presetId: 'olympic_weight_plate_tree', pos: [-0.65, 0, -1.25], rotDeg: [0, 0, 0] },
          { componentId: 'locker_bench', familyId: 'gym_locker_studio_recovery', presetId: 'oak_locker_room_bench', pos: [-1.45, 0, 0.42], rotDeg: [0, 0, 0] },
          { componentId: 'refill_station', familyId: 'gym_functional_facilities', presetId: 'bottle_refill_drinking_station', pos: [0.45, 0, 1.35], rotDeg: [0, 180, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'yoga_cart', familyId: 'gym_locker_studio_recovery', presetId: 'yoga_mat_foam_roller_cart', pos: [1.65, 0, 1.1], rotDeg: [0, -25, 0] },
          { componentId: 'locker_scale', familyId: 'gym_locker_studio_recovery', presetId: 'locker_balance_beam_scale', pos: [-0.15, 0, 1.28], rotDeg: [0, 180, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_fitness_gym_locker_zone', label: 'Complete Gym Floor & Locker Zone', condition: 'clean', paletteFamily: 'downtown_steel', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'highway_workzone_rig',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '12_construction', '05_traffic'],
    subcategory: 'Exterior & Streetscape',
    subcategories: ['Exterior & Streetscape', 'Site Equipment', 'Road Barriers'],
    label: 'Highway Workzone & Paving Crew Rig',
    description: 'Compact tracked mini-excavator, ride-on asphalt roller, highway arrow-board trailer, speed limit sign, towable cement mixer, Jersey barriers, and sawhorse barricade.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'exterior',
    environmentTags: ['construction_zone', 'street', 'highway'],
    architecturalStyle: 'industrial',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'construction', 'highway', 'excavator', 'roller', 'arrow_board', 'speed_limit'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'mini_excavator', familyId: 'construction_heavy_vehicles', presetId: 'tracked_mini_excavator', pos: [-1.15, 0, -0.45], rotDeg: [0, 28, 0] },
        { componentId: 'arrow_trailer', familyId: 'construction_heavy_vehicles', presetId: 'highway_arrow_board_trailer', pos: [1.55, 0, 1.05], rotDeg: [0, 0, 0] },
        { componentId: 'jersey_front', familyId: 'traffic_sign_signal', presetId: 'concrete_jersey_barrier', pos: [-1.25, 0, 2.05], rotDeg: [0, 0, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'asphalt_roller', familyId: 'construction_heavy_vehicles', presetId: 'vibratory_asphalt_roller', pos: [1.25, 0, -1.55], rotDeg: [0, -15, 0] },
          { componentId: 'speed_sign', familyId: 'street_regulatory_signage', presetId: 'urban_speed_limit_35_sign', pos: [-2.85, 0, 1.35], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'cement_mixer', familyId: 'construction_heavy_vehicles', presetId: 'towable_concrete_cement_mixer', pos: [-2.65, 0, -1.25], rotDeg: [0, 35, 0] },
          { componentId: 'sawhorse_warn', familyId: 'construction_site', presetId: 'striped_sawhorse_barricade', pos: [2.85, 0, 1.9], rotDeg: [0, -18, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_highway_workzone_rig', label: 'Highway Workzone & Paving Crew', condition: 'lightly_worn', paletteFamily: 'industrial', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'winter_christmas_wonderland_corner',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '30_holidays'],
    subcategory: 'Exterior & Streetscape',
    subcategories: ['Exterior & Streetscape', 'Holiday Assemblies', 'Residential & Rooftop'],
    label: 'Christmas Holiday Plaza & Yard Scene',
    description: 'Decorated Christmas tree with star and presents, top-hat yard snowman, glowing reindeer and gift sleigh, giant candy canes, North Pole sign, and garland lamp post.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'exterior',
    environmentTags: ['holiday', 'christmas', 'winter', 'outdoor_plaza'],
    architecturalStyle: 'residential',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'christmas', 'holiday', 'snowman', 'reindeer', 'tree', 'winter'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'mega_tree', familyId: 'holiday_christmas_trees_wreaths', presetId: 'classic_decorated_christmas_tree', pos: [0, 0, -0.85], rotDeg: [0, 0, 0] },
        { componentId: 'reindeer_sleigh', familyId: 'holiday_outdoor_yard_displays', presetId: 'glowing_reindeer_and_sleigh', pos: [1.55, 0, 0.25], rotDeg: [0, -28, 0] },
        { componentId: 'yard_snowman', familyId: 'holiday_outdoor_yard_displays', presetId: 'yard_top_hat_snowman', pos: [-1.45, 0, 0.35], rotDeg: [0, 22, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'candy_canes', familyId: 'holiday_outdoor_yard_displays', presetId: 'giant_candy_cane_pillars', pos: [-1.85, 0, -1.2], rotDeg: [0, 15, 0] },
          { componentId: 'north_pole', familyId: 'holiday_outdoor_yard_displays', presetId: 'north_pole_workshop_signpost', pos: [1.75, 0, -1.25], rotDeg: [0, -12, 0] },
          { componentId: 'holiday_post', familyId: 'holiday_christmas_trees_wreaths', presetId: 'holiday_garland_lamp_post', pos: [-2.25, 0, 1.15], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'yard_gifts', familyId: 'holiday_outdoor_yard_displays', presetId: 'illuminated_yard_gift_trio', pos: [0.1, 0, 0.95], rotDeg: [0, 0, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_winter_christmas_wonderland', label: 'Festive Christmas Plaza & Yard', condition: 'clean', paletteFamily: 'park_heritage', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'royal_nutcracker_parade_display',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '30_holidays'],
    subcategory: 'Exterior & Streetscape',
    subcategories: ['Exterior & Streetscape', 'Holiday Assemblies', 'Nutcrackers & Holiday Figures'],
    label: 'Royal Nutcracker Parade & Guard Display',
    description: 'Royal crowned Nutcracker King flanked by Giant Lit Porch Guard, Drummer Soldier, Seven-Crown Mouse King, curved Giant Candy Cane arch, and gift stack.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    environmentTags: ['holiday', 'christmas', 'winter', 'lobby', 'outdoor_plaza'],
    architecturalStyle: 'residential',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'nutcracker', 'christmas', 'holiday', 'mouse_king', 'candy_cane', 'parade'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'king_nutcracker', familyId: 'holiday_nutcracker_collection', presetId: 'royal_nutcracker_king', pos: [0, 0, -0.35], rotDeg: [0, 0, 0] },
        { componentId: 'porch_guard_l', familyId: 'holiday_nutcracker_collection', presetId: 'giant_porch_guard_nutcracker', pos: [-1.25, 0, 0.2], rotDeg: [0, 14, 0] },
        { componentId: 'drummer_r', familyId: 'holiday_nutcracker_collection', presetId: 'drummer_boy_nutcracker', pos: [1.22, 0, 0.25], rotDeg: [0, -16, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'mouse_king', familyId: 'holiday_nutcracker_collection', presetId: 'seven_crown_mouse_king', pos: [2.15, 0, -0.4], rotDeg: [0, -28, 0] },
          { componentId: 'candy_arch', familyId: 'holiday_outdoor_yard_displays', presetId: 'giant_candy_cane_pillars', pos: [0, 0, -1.25], rotDeg: [0, 0, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'parade_gifts', familyId: 'holiday_outdoor_yard_displays', presetId: 'illuminated_yard_gift_trio', pos: [-2.1, 0, -0.6], rotDeg: [0, 18, 0] }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_royal_nutcracker_parade', label: 'Royal Nutcracker Guard & Mouse King', condition: 'clean', paletteFamily: 'retro_arcade_90s_bright', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });

  registerObjectFamily({
    id: 'thanksgiving_harvest_feast_scene',
    isAssembly: true,
    categoryId: 'assemblies',
    categories: ['assemblies', '30_holidays'],
    subcategory: 'Exterior & Streetscape',
    subcategories: ['Exterior & Streetscape', 'Holiday Assemblies', 'Thanksgiving & Harvest'],
    label: 'Thanksgiving Harvest & Feast Display',
    description: 'Banquet dining table set with roasted turkey platter and candles flanked by hay bale scarecrow, fanned-tail turkey yard display, pumpkin wheelbarrow, and cornucopia.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing'],
    locationContext: 'both',
    environmentTags: ['holiday', 'thanksgiving', 'autumn', 'dining_room', 'patio'],
    architecturalStyle: 'residential',
    sizeClass: 'assembly',
    functionalRole: 'assembly',
    tags: ['assembly', 'thanksgiving', 'harvest', 'turkey', 'cornucopia', 'pumpkin', 'scarecrow'],
    schema: ASM_COMMON_SCHEMA,
    getComponents: (cfg) => {
      const list = [
        { componentId: 'feast_table', familyId: 'holiday_thanksgiving_feast', presetId: 'thanksgiving_banquet_table_set', pos: [0, 0, 0.35], rotDeg: [0, 0, 0] },
        { componentId: 'yard_turkey', familyId: 'holiday_thanksgiving_harvest', presetId: 'thanksgiving_strutting_turkey', pos: [-1.85, 0, 0.45], rotDeg: [0, 32, 0] },
        { componentId: 'hay_scarecrow', familyId: 'holiday_thanksgiving_harvest', presetId: 'hay_bale_pumpkin_scarecrow', pos: [1.95, 0, -0.75], rotDeg: [0, -24, 0] }
      ];
      if (cfg.includeSecondaryProps !== false) {
        list.push(
          { componentId: 'pumpkin_barrow', familyId: 'holiday_thanksgiving_harvest', presetId: 'pumpkin_gourd_wheelbarrow', pos: [-1.95, 0, -1.05], rotDeg: [0, 42, 0] },
          { componentId: 'market_sign', familyId: 'holiday_thanksgiving_harvest', presetId: 'harvest_market_barrel_sign', pos: [2.05, 0, 0.95], rotDeg: [0, -30, 0] }
        );
      }
      if (cfg.includeClutter !== false) {
        list.push(
          { componentId: 'table_cornucopia', familyId: 'holiday_thanksgiving_feast', presetId: 'harvest_wicker_cornucopia', pos: [-0.45, 0.79, 0.35], rotDeg: [0, 15, 0], overrides: { attachmentProfile: 'surface_placed' } },
          { componentId: 'table_pies', familyId: 'holiday_thanksgiving_feast', presetId: 'pumpkin_pecan_pie_feast_tray', pos: [0.55, 0.79, 0.35], rotDeg: [0, -10, 0], overrides: { attachmentProfile: 'surface_placed' } }
        );
      }
      return list;
    },
    buildGeometry: () => {},
    presets: [
      { id: 'asm_thanksgiving_harvest_feast', label: 'Thanksgiving Harvest & Feast', condition: 'clean', paletteFamily: 'wood_office_executive', params: { spacingScale: 1.0, includeSecondaryProps: true, includeClutter: true } }
    ]
  });
}

