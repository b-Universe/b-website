/* B Remastered - 3D Building Generator */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const STORAGE_KEY = 'b-remastered-building-presets-v1';

  const STYLES = [
    { id: 'brick', label: 'Red Brick', icon: 'fa-building', preset: 'paragon_brick' },
    { id: 'brownstone', label: 'Brownstone', icon: 'fa-home', preset: 'kings_row' },
    { id: 'commercial', label: 'Downtown', icon: 'fa-city', preset: 'old_downtown' },
    { id: 'mixed', label: 'Mixed Use', icon: 'fa-store', preset: 'market_street' },
    { id: 'artdeco', label: 'Art Deco', icon: 'fa-landmark', preset: 'golden_age' },
    { id: 'modern', label: 'Modern', icon: 'fa-th-large', preset: 'new_harbor' },
    { id: 'abandoned', label: 'Derelict', icon: 'fa-ghost', preset: 'abandoned_flats' },
    { id: 'corner', label: 'Corner', icon: 'fa-vector-square', preset: 'corner_block' }
  ];

  const BASE = {
    style: 'brick', seed: 1337,
    width: 13, depth: 11, floors: 5, floorHeight: 3.3, wallThickness: 0.22,
    footprint: 'rectangle', extension: 0, setback: 0, cornerCut: 0,
    roofType: 'flat', parapet: true, parapetHeight: 0.65, roofColor: '#343b43',
    wallMaterial: 'brick', wallColor: '#a64a40', secondaryWallColor: '#7c3431', mortarColor: '#c3aaa0',
    brickScale: 1.1, colorVariation: 0.24, groundFloorMaterial: 'stone', groundFloorColor: '#747576',
    trimColor: '#d6c9ad', trimAmount: 0.55, facadeAccent: 'cornice',
    windowsX: 4, windowsSide: 3, windowWidth: 1.4, windowHeight: 1.85,
    windowStyle: 'sash', windowFrameColor: '#d6cdbb', glassColor: '#384955',
    windowLighting: 0.20, shutters: false, curtains: true, balconies: 0.0, acUnits: false, fireEscape: true,
    doorStyle: 'stoop', doorColor: '#5f4134', entranceSteps: 3,
    groundUse: 'residential', awning: false, awningColor: '#8e3b3b',
    signage: 'none', signText: 'CORNER MARKET', signColor: '#f2e1aa',
    rooftopProps: 0.65, rooftopWaterTank: true, skylights: false, chimneys: 2, antennas: true, rooftopPipes: true,
    age: 0.18, damage: 0, windowDamageStyle: 'mixed', tarPatches: false, roofPuddles: false, overgrowth: 0, grimeColor: '#282b2a',
    interiorMode: 'none', cutaway: false, inspectedFloor: 0,
    stairwell: true, elevator: false, roomsPerFloor: 4,
    accentFloor: 0, accentSide: 'front', accentFloorColor: '#b58867', floorOverrides: []
  };

  const CONFIG_KEYS = Object.keys(BASE).filter((k) => k !== 'floorOverrides');

  const PRESETS = {
    paragon_brick: { label: 'Paragon Brick', style: 'brick', seed: 1337, wallColor: '#a64a40', floors: 5, width: 13, depth: 11, curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: true, rooftopPipes: true },
    kings_row: { label: "King's Row Brownstone", style: 'brownstone', seed: 4612, width: 9, depth: 14, floors: 4, floorHeight: 3.4, roofType: 'mansard', wallColor: '#946d55', secondaryWallColor: '#6e5344', groundFloorColor: '#8b776b', roofColor: '#4a4040', wallMaterial: 'brick', trimAmount: 0.85, facadeAccent: 'ornate', windowsX: 3, windowsSide: 3, windowStyle: 'arched', windowFrameColor: '#e2c5a7', curtains: true, shutters: true, doorStyle: 'stoop', entranceSteps: 5, fireEscape: false, acUnits: false, balconies: 0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 2, rooftopProps: 0.2 },
    old_downtown: { label: 'Old Downtown', style: 'commercial', seed: 5821, floors: 7, width: 19, depth: 15, groundUse: 'shop', groundFloorMaterial: 'stone', groundFloorColor: '#777167', wallColor: '#86765e', secondaryWallColor: '#6f6250', roofType: 'flat', trimAmount: 0.85, facadeAccent: 'cornice', windowsX: 7, windowsSide: 5, windowStyle: 'tall', curtains: false, fireEscape: false, acUnits: false, rooftopWaterTank: false, rooftopPipes: true, rooftopProps: 0.75, signage: 'marquee', signText: 'DOWNTOWN' },
    market_street: { label: 'Market Street Shops', style: 'mixed', seed: 3009, width: 16, depth: 11, floors: 4, wallColor: '#a95f4b', secondaryWallColor: '#864b3f', groundUse: 'shop', groundFloorColor: '#625d62', awning: true, awningColor: '#a14248', signage: 'shop', signText: 'THE MARKET', roofType: 'flat', curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: false, rooftopPipes: true, windowsX: 5 },
    golden_age: { label: 'Golden Age Deco', style: 'artdeco', seed: 1017, floors: 8, width: 17, depth: 14, wallMaterial: 'stone', wallColor: '#bbad8d', secondaryWallColor: '#8d826b', groundFloorColor: '#746e61', trimColor: '#e1c98a', roofColor: '#615c55', facadeAccent: 'vertical', trimAmount: 0.9, windowsX: 6, windowStyle: 'tall', curtains: false, roofType: 'stepped', setback: 1.0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 0, fireEscape: false, acUnits: false, groundUse: 'lobby', doorStyle: 'double', rooftopProps: 0.2 },
    new_harbor: { label: 'New Harbor Apartments', style: 'modern', seed: 9135, floors: 9, width: 20, depth: 14, floorHeight: 3.1, wallMaterial: 'concrete', wallColor: '#9daab1', secondaryWallColor: '#71838c', groundFloorMaterial: 'concrete', groundFloorColor: '#556b78', roofColor: '#363f48', trimColor: '#d4e1e5', trimAmount: 0.2, facadeAccent: 'none', windowsX: 7, windowsSide: 4, windowStyle: 'modern', windowFrameColor: '#293d48', glassColor: '#2a526a', windowWidth: 1.8, windowHeight: 2.25, curtains: true, balconies: 0.8, acUnits: false, fireEscape: false, rooftopWaterTank: false, skylights: true, rooftopPipes: true, rooftopProps: 0.9, chimneys: 0, entranceSteps: 0, doorStyle: 'double', groundUse: 'lobby' },
    abandoned_flats: { label: 'Abandoned Flats', style: 'abandoned', seed: 6697, width: 15, depth: 12, floors: 6, wallColor: '#695e53', secondaryWallColor: '#474641', trimColor: '#827864', trimAmount: 0.2, windowFrameColor: '#554b42', glassColor: '#252d2d', windowLighting: 0, shutters: true, curtains: true, acUnits: true, fireEscape: true, age: 0.85, damage: 0.48, windowDamageStyle: 'mixed', tarPatches: true, roofPuddles: true, rooftopPipes: true, overgrowth: 0.48, chimneys: 1, rooftopWaterTank: true },
    corner_block: { label: 'Corner Block', style: 'corner', seed: 7284, width: 18, depth: 17, floors: 5, footprint: 'corner', cornerCut: 1.75, wallColor: '#ad6c56', secondaryWallColor: '#915342', groundUse: 'shop', groundFloorColor: '#786d5c', windowStyle: 'arched', windowsX: 6, windowsSide: 5, curtains: true, acUnits: true, signage: 'shop', signText: 'CORNER GOODS', awning: true, awningColor: '#45647b', fireEscape: false, rooftopWaterTank: true, rooftopPipes: true, balconies: 0.25 }
  };

  const OPTIONS = {
    footprint: [['rectangle', 'Rectangle'], ['L', 'L-shaped'], ['U', 'U-shaped courtyard'], ['corner', 'Corner lot']],
    roofType: [['flat', 'Flat roof'], ['pitched', 'Gabled'], ['mansard', 'Mansard'], ['stepped', 'Stepped crown']],
    wallMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
    groundFloorMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
    facadeAccent: [['none', 'None'], ['cornice', 'Classic cornices'], ['ornate', 'Ornate stonework'], ['vertical', 'Art Deco verticals']],
    windowStyle: [['sash', 'Classic sash'], ['arched', 'Arched'], ['tall', 'Tall panes'], ['modern', 'Modern glass'], ['square', 'Square']],
    windowDamageStyle: [['mixed', 'Mixed (broken & boarded)'], ['boarded', 'Fully boarded'], ['partial', 'Partially boarded'], ['broken', 'Broken glass only']],
    doorStyle: [['stoop', 'Raised stoop'], ['single', 'Single entrance'], ['double', 'Double doors']],
    groundUse: [['residential', 'Residential'], ['shop', 'Shops'], ['lobby', 'Shared lobby']],
    signage: [['none', 'None'], ['shop', 'Storefront sign'], ['marquee', 'Wall marquee']],
    interiorMode: [['none', 'None'], ['basic', 'Floor plans'], ['apartments', 'Apartments & rooms']],
    accentSide: [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['all', 'All walls']]
  };

  const SCHEMA = {
    form: [
      { group: 'BUILDING FORM' },
      { key: 'width', name: 'Building width', min: 6, max: 32, step: 0.5, unit: 'm' },
      { key: 'depth', name: 'Building depth', min: 6, max: 30, step: 0.5, unit: 'm' },
      { key: 'floors', name: 'Number of floors', min: 1, max: 14, step: 1 },
      { key: 'floorHeight', name: 'Floor height', min: 2.5, max: 5, step: 0.1, unit: 'm' },
      { key: 'wallThickness', name: 'Wall thickness', min: 0.12, max: 0.5, step: 0.02, unit: 'm' },
      { key: 'footprint', name: 'Building footprint', type: 'select' },
      { key: 'extension', name: 'Rear & side extensions', min: 0, max: 3, step: 1 },
      { key: 'setback', name: 'Upper-floor setbacks', min: 0, max: 2, step: 0.25, unit: 'm' },
      { key: 'cornerCut', name: 'Cut corner entrance', min: 0, max: 2.5, step: 0.25, unit: 'm', info: 'Angled front-right corner chamfer across any footprint.' },
      { group: 'ROOFLINE' },
      { key: 'roofType', name: 'Roof silhouette', type: 'select' },
      { key: 'roofColor', name: 'Roof color', type: 'color' },
      { key: 'parapet', name: 'Parapet walls', type: 'boolean' },
      { key: 'parapetHeight', name: 'Parapet height', min: 0.2, max: 1.5, step: 0.05, unit: 'm' }
    ],
    facade: [
      { group: 'WALL MATERIALS' },
      { key: 'wallMaterial', name: 'Main wall material', type: 'select' },
      { key: 'wallColor', name: 'Primary wall color', type: 'color' },
      { key: 'secondaryWallColor', name: 'Secondary wall color', type: 'color' },
      { key: 'mortarColor', name: 'Mortar / grout', type: 'color' },
      { key: 'brickScale', name: 'Brick & stone size', min: 0.5, max: 2.4, step: 0.1 },
      { key: 'colorVariation', name: 'Color variation', min: 0, max: 1, step: 0.05 },
      { key: 'groundFloorMaterial', name: 'Ground-floor material', type: 'select' },
      { key: 'groundFloorColor', name: 'Ground-floor color', type: 'color' },
      { key: 'trimColor', name: 'Trim & ledge color', type: 'color' },
      { key: 'trimAmount', name: 'Trim amount', min: 0, max: 1, step: 0.05 },
      { key: 'facadeAccent', name: 'Architectural detailing', type: 'select' },
      { group: 'WINDOWS' },
      { key: 'windowsX', name: 'Front window columns', min: 1, max: 10, step: 1 },
      { key: 'windowsSide', name: 'Side window columns', min: 1, max: 8, step: 1 },
      { key: 'windowWidth', name: 'Window width', min: 0.55, max: 2.8, step: 0.05, unit: 'm' },
      { key: 'windowHeight', name: 'Window height', min: 0.65, max: 3.15, step: 0.05, unit: 'm' },
      { key: 'windowStyle', name: 'Window style', type: 'select' },
      { key: 'windowFrameColor', name: 'Frame color', type: 'color' },
      { key: 'glassColor', name: 'Glass color', type: 'color' },
      { key: 'windowLighting', name: 'Interior lights', min: 0, max: 1, step: 0.05 },
      { key: 'curtains', name: 'Window curtains', type: 'boolean' },
      { key: 'shutters', name: 'Window shutters', type: 'boolean' }
    ],
    features: [
      { group: 'ENTRANCES & STREET' },
      { key: 'groundUse', name: 'Ground-floor use', type: 'select' },
      { key: 'doorStyle', name: 'Entrance style', type: 'select' },
      { key: 'doorColor', name: 'Door color', type: 'color' },
      { key: 'entranceSteps', name: 'Entrance steps', min: 0, max: 6, step: 1 },
      { key: 'awning', name: 'Shop / door awning', type: 'boolean' },
      { key: 'awningColor', name: 'Awning color', type: 'color' },
      { key: 'signage', name: 'Sign type', type: 'select' },
      { key: 'signText', name: 'Sign lettering', type: 'text' },
      { key: 'signColor', name: 'Sign color', type: 'color' },
      { group: 'EXTERIOR DETAILS' },
      { key: 'balconies', name: 'Balcony frequency', min: 0, max: 1, step: 0.1 },
      { key: 'acUnits', name: 'Window A/C units', type: 'boolean' },
      { key: 'fireEscape', name: 'Exterior fire escape', type: 'boolean' },
      { key: 'rooftopProps', name: 'Rooftop equipment', min: 0, max: 1, step: 0.1 },
      { key: 'rooftopWaterTank', name: 'Rooftop water tank', type: 'boolean' },
      { key: 'rooftopPipes', name: 'Exposed pipes & cables', type: 'boolean' },
      { key: 'skylights', name: 'Rooftop skylights', type: 'boolean' },
      { key: 'chimneys', name: 'Chimneys', min: 0, max: 5, step: 1 },
      { key: 'antennas', name: 'Rooftop antenna', type: 'boolean' },
      { group: 'AGE & CHARACTER' },
      { key: 'age', name: 'Weathering / dirt', min: 0, max: 1, step: 0.05 },
      { key: 'damage', name: 'Damaged windows & walls', min: 0, max: 1, step: 0.05 },
      { key: 'windowDamageStyle', name: 'Window damage style', type: 'select' },
      { key: 'tarPatches', name: 'Tar patches & roof repairs', type: 'boolean' },
      { key: 'roofPuddles', name: 'Roof puddles & water stains', type: 'boolean' },
      { key: 'overgrowth', name: 'Vines & overgrowth', min: 0, max: 1, step: 0.05 },
      { key: 'grimeColor', name: 'Grime tone', type: 'color' }
    ],
    interior: [
      { group: 'BUILDING INTERIOR' },
      { key: 'interiorMode', name: 'Interior layout', type: 'select' },
      { key: 'cutaway', name: 'Show cutaway / hide front wall', type: 'boolean' },
      { key: 'inspectedFloor', name: 'Inspect through floor', type: 'floor' },
      { key: 'roomsPerFloor', name: 'Rooms per floor', min: 1, max: 8, step: 1 },
      { key: 'stairwell', name: 'Include stairs', type: 'boolean' },
      { key: 'elevator', name: 'Elevator shaft', type: 'boolean' },
      { group: 'CUSTOM FLOOR COLORS' },
      { key: 'accentFloor', name: 'Floor to customize', type: 'floorNumber' },
      { key: 'accentSide', name: 'Wall to customize', type: 'select' },
      { key: 'accentFloorColor', name: 'Custom wall color', type: 'color' }
    ]
  };

  const CATEGORIES = {
    form: SCHEMA.form.filter((x) => x.key).map((x) => x.key).filter((k) => !['roofColor'].includes(k)),
    facade: SCHEMA.facade.filter((x) => x.key).map((x) => x.key),
    features: SCHEMA.features.filter((x) => x.key).map((x) => x.key),
    palette: ['wallColor', 'secondaryWallColor', 'groundFloorColor', 'trimColor', 'windowFrameColor', 'doorColor', 'roofColor', 'awningColor', 'signColor']
  };

  const MATERIAL_CHOICES = ['#9f4b3d', '#a97455', '#9b8674', '#beb19c', '#73818b', '#817e77', '#d1bd93', '#5d675a', '#7a5661', '#bc8550', '#aeb5aa'];
  const COLOR_CHOICES = ['#2c4e6a', '#425c6e', '#575753', '#8d392f', '#ab6752', '#d1b9a0', '#cdb78e', '#7e5c47', '#718580', '#5e625b'];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const rng32 = (seed) => {
    let a = (seed >>> 0) || 1337;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const randBetween = (r, a, b) => a + (b - a) * r();
  const randInt = (r, a, b) => Math.floor(randBetween(r, a, b + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const colorHex = (value) => (/^#[a-f\d]{6}$/i.test(value) ? value : '#777777');
  const hexToRgb = (hex) => {
    const clean = colorHex(hex).slice(1);
    const num = parseInt(clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  let state = { ...copy(BASE), ...copy(PRESETS.paragon_brick) };
  delete state.label;
  let locks = new Set();
  let activeTab = 'form';
  let activePreset = 'paragon_brick';
  let savedPresets = {};
  const view = { mode: 'single', lighting: 'day', environment: 'street', grid: true, autoRotate: false, wireframe: false, theatre: false, fullscreen: false };
  let scene, camera, renderer, orbit, buildingGroup, environmentGroup, hemi, sun, ambient, groundGrid;
  let lastCameraTarget = null;
  let refocusAfterBuild = false;
  let buildStats = { buildings: 1, triangles: 0 };
  let renderScheduled = false;
  let ready = false;

  function toast(message) {
    const item = document.createElement('div');
    item.className = 'studio-toast';
    item.textContent = message;
    $('#studio-toasts').appendChild(item);
    setTimeout(() => item.remove(), 3300);
  }

  function getStyle(id) {
    return STYLES.find((x) => x.id === id) || STYLES[0];
  }

  function baseForStyle(style) {
    const descriptor = getStyle(style);
    return { ...copy(BASE), ...copy(PRESETS[descriptor.preset]) };
  }

  function sanitisePreset(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid building settings');
    const style = STYLES.some((x) => x.id === data.style) ? data.style : 'brick';
    const merged = { ...baseForStyle(style), ...Object.fromEntries(Object.entries(data).filter(([k]) => k in BASE)), style };
    for (const [, rows] of Object.entries(SCHEMA)) {
      for (const def of rows) {
        if (!def.key) continue;
        const key = def.key;
        const fallback = baseForStyle(style)[key];
        if (def.type === 'color') merged[key] = colorHex(merged[key]);
        else if (def.type === 'boolean') merged[key] = typeof merged[key] === 'boolean' ? merged[key] : fallback;
        else if (def.type === 'select') merged[key] = OPTIONS[key].some((x) => x[0] === merged[key]) ? merged[key] : fallback;
        else if (def.type === 'text') merged[key] = String(merged[key] ?? fallback).slice(0, 48);
        else if (typeof merged[key] !== 'number' || !Number.isFinite(merged[key])) merged[key] = fallback;
        else merged[key] = clamp(merged[key], def.min ?? (def.type === 'floorNumber' ? 0 : 0), def.max ?? (def.type === 'floorNumber' ? 14 : 14));
      }
    }
    merged.seed = clamp(Math.floor(Number(merged.seed) || 1337), 1, 99999999);
    merged.inspectedFloor = clamp(Math.floor(merged.inspectedFloor), 0, merged.floors);
    merged.accentFloor = clamp(Math.floor(merged.accentFloor), 0, merged.floors);
    merged.floorOverrides = Array.isArray(data.floorOverrides)
      ? data.floorOverrides.slice(0, 80).filter((o) => o && Number.isInteger(o.floor) && o.floor >= 1 && o.floor <= merged.floors && ['front', 'back', 'left', 'right', 'all'].includes(o.side) && /^#[a-f\d]{6}$/i.test(o.color)).map((o) => ({ floor: o.floor, side: o.side, color: o.color }))
      : [];
    delete merged.label;
    return merged;
  }

  function loadPreset(data, name, id = null) {
    state = sanitisePreset(data);
    activePreset = id;
    $('#seed-input').value = String(state.seed);
    updateStylePicker();
    updatePresetList();
    renderControls();
    if (ready) {
      refocusAfterBuild = true;
      scheduleRebuild();
    }
    toast('Loaded ' + name);
  }

  function updateStylePicker() {
    $$('#style-picker .style-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.style === state.style));
    $('#active-style-name').textContent = getStyle(state.style).label;
    $('#scene-label').textContent = `${String(STYLES.findIndex((x) => x.id === state.style) + 1).padStart(2, '0')} / ${getStyle(state.style).label.toUpperCase()}`;
  }

  function renderStylePicker() {
    $('#style-picker').innerHTML = '';
    for (const entry of STYLES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'style-option';
      button.dataset.style = entry.id;
      button.innerHTML = `<i class="fas ${entry.icon}" aria-hidden="true"></i><span>${entry.label}</span>`;
      button.addEventListener('click', () => loadPreset(baseForStyle(entry.id), entry.label, entry.preset));
      $('#style-picker').appendChild(button);
    }
    updateStylePicker();
  }

  function updatePresetList() {
    $$('#preset-list .preset-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.preset === activePreset));
  }

  function renderPresetList() {
    $('#preset-list').innerHTML = '';
    for (const entry of STYLES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset-item';
      button.dataset.preset = entry.preset;
      const icon = document.createElement('i');
      icon.className = 'fas ' + entry.icon;
      const label = document.createElement('span');
      label.textContent = PRESETS[entry.preset].label;
      button.append(icon, label);
      button.addEventListener('click', () => loadPreset(baseForStyle(entry.id), PRESETS[entry.preset].label, entry.preset));
      $('#preset-list').appendChild(button);
    }
    updatePresetList();
  }

  function renderControls() {
    const panel = $('#tab-content');
    panel.innerHTML = '';
    const rows = SCHEMA[activeTab];
    for (const item of rows) {
      if (item.group) {
        const group = document.createElement('div');
        group.className = 'studio-group-label';
        group.textContent = item.group;
        panel.appendChild(group);
        continue;
      }
      const key = item.key;
      const wrap = document.createElement('div');
      wrap.className = 'studio-control-group studio-field';
      wrap.dataset.key = key;
      const head = document.createElement('div');
      head.className = 'studio-row-head';
      const label = document.createElement('label');
      label.htmlFor = 'control-' + key;
      label.textContent = item.name;
      const end = document.createElement('span');
      end.className = 'studio-row-end';
      let valueBadge = null;
      if (!item.type || ['floor', 'floorNumber'].includes(item.type)) {
        valueBadge = document.createElement('span');
        valueBadge.className = 'studio-field-value';
        end.appendChild(valueBadge);
      }
      const lock = document.createElement('button');
      lock.type = 'button';
      lock.className = 'studio-lock' + (locks.has(key) ? ' locked' : '');
      lock.title = locks.has(key) ? 'Unlock this setting' : 'Lock this setting during randomization';
      lock.setAttribute('aria-label', lock.title);
      lock.innerHTML = `<i class="fas fa-${locks.has(key) ? 'lock' : 'lock-open'}"></i>`;
      lock.addEventListener('click', () => {
        if (locks.has(key)) locks.delete(key);
        else locks.add(key);
        renderControls();
      });
      end.appendChild(lock);
      head.append(label, end);
      wrap.appendChild(head);

      let input;
      if (item.type === 'select') {
        input = document.createElement('select');
        for (const [val, title] of OPTIONS[key]) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = title;
          input.appendChild(opt);
        }
      } else if (item.type === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
      } else if (item.type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
      } else if (item.type === 'text') {
        input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 48;
        input.className = 'studio-textbox';
        input.style.width = '100%';
      } else if (item.type === 'floor') {
        input = document.createElement('input');
        input.type = 'range';
        input.min = 0;
        input.max = state.floors;
        input.step = 1;
      } else if (item.type === 'floorNumber') {
        input = document.createElement('input');
        input.type = 'range';
        input.min = 1;
        input.max = state.floors;
        input.step = 1;
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step || 1;
      }

      input.id = 'control-' + key;
      input.dataset.key = key;
      if (item.type === 'boolean') input.checked = !!state[key];
      else input.value = String(item.type === 'floorNumber' && !state[key] ? 1 : state[key]);
      if (valueBadge) valueBadge.textContent = (item.type === 'floor' && state[key] === 0 ? 'All' : input.value) + (item.unit || '');

      input.addEventListener(['color', 'text', 'select', 'boolean'].includes(item.type) ? 'change' : 'input', () => {
        const value = item.type === 'boolean'
          ? input.checked
          : (!item.type || item.type === 'floor' || item.type === 'floorNumber')
            ? Number(input.value)
            : input.value;
        state[key] = value;

        if (key === 'floors') {
          state.inspectedFloor = clamp(state.inspectedFloor, 0, value);
          state.accentFloor = clamp(state.accentFloor, 1, value);
        }
        if (key === 'footprint' && value === 'corner' && state.cornerCut <= 0) {
          state.cornerCut = 1.5;
        }
        if (key === 'windowDamageStyle' && state.damage <= 0) {
          state.damage = 0.35;
          renderControls();
        }
        if (key === 'signText' && state.signage === 'none' && String(value).trim().length > 0) {
          state.signage = state.groundUse === 'shop' ? 'shop' : 'marquee';
        }
        if (['roomsPerFloor', 'stairwell', 'elevator'].includes(key) && state.interiorMode === 'none') {
          state.interiorMode = key === 'roomsPerFloor' ? 'apartments' : 'basic';
          if (!state.cutaway && state.inspectedFloor === 0) state.cutaway = true;
          renderControls();
        }
        if (valueBadge) valueBadge.textContent = (item.type === 'floor' && value === 0 ? 'All' : value) + (item.unit || '');
        if (key === 'accentFloor' || key === 'accentSide') {
          const prev = state.floorOverrides.find((o) => o.floor === (state.accentFloor || 1) && o.side === state.accentSide);
          if (prev) state.accentFloorColor = prev.color;
        }
        if (!['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) activePreset = null;
        updatePresetList();
        if (['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) return;
        scheduleRebuild();
      });

      if (['floors', 'footprint', 'accentFloor', 'accentSide'].includes(key)) {
        input.addEventListener('change', renderControls);
      }

      wrap.appendChild(input);
      if (item.info) {
        const help = document.createElement('p');
        help.className = 'studio-help';
        help.textContent = item.info;
        wrap.appendChild(help);
      }
      panel.appendChild(wrap);
    }

    if (activeTab === 'interior') {
      const actions = document.createElement('div');
      actions.className = 'studio-save-row';
      actions.style.marginTop = '12px';
      const apply = document.createElement('button');
      apply.className = 'studio-btn studio-btn-primary';
      apply.type = 'button';
      apply.textContent = 'Apply floor color';
      apply.onclick = () => {
        const floor = state.accentFloor || 1;
        const side = state.accentSide;
        colorHex(state.accentFloorColor);
        state.floorOverrides = state.floorOverrides.filter((o) => !(o.floor === floor && o.side === side));
        state.floorOverrides.push({ floor, side, color: state.accentFloorColor });
        scheduleRebuild();
        toast('Floor color applied');
      };
      const clear = document.createElement('button');
      clear.className = 'studio-btn studio-btn-ghost';
      clear.type = 'button';
      clear.textContent = 'Clear this override';
      clear.onclick = () => {
        state.floorOverrides = state.floorOverrides.filter((o) => !(o.floor === (state.accentFloor || 1) && o.side === state.accentSide));
        scheduleRebuild();
        toast('Floor override cleared');
      };
      actions.append(apply, clear);
      panel.appendChild(actions);
      const hint = document.createElement('p');
      hint.className = 'studio-help';
      hint.style.marginTop = '10px';
      hint.textContent = 'Choose a floor and wall, then apply its custom color. Use Cutaway or Inspect through floor to view rooms.';
      panel.appendChild(hint);
    }
  }

  function initUI() {
    renderStylePicker();
    renderPresetList();
    renderControls();
    $$('.studio-tab').forEach((btn) => btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      $$('.studio-tab').forEach((t) => {
        const on = t === btn;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      renderControls();
    }));
    $('#seed-input').value = String(state.seed);
    $('#seed-input').addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number($('#seed-input').value) || 1337), 1, 99999999);
      $('#seed-input').value = state.seed;
      activePreset = null;
      updatePresetList();
      scheduleRebuild();
    });
    $('#btn-new-seed').onclick = () => {
      state.seed = Math.floor(Math.random() * 99999998) + 1;
      $('#seed-input').value = state.seed;
      activePreset = null;
      updatePresetList();
      scheduleRebuild();
      toast('New seed: ' + state.seed);
    };
    $('#btn-random-all').onclick = () => randomize('all');
    $$('[data-random]').forEach((b) => b.addEventListener('click', () => randomize(b.dataset.random)));
    $$('.view-mode').forEach((b) => b.addEventListener('click', () => {
      view.mode = b.dataset.mode;
      $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn === b));
      scheduleRebuild();
    }));
    $('#btn-reset-camera').onclick = () => {
      if (ready) resetCamera();
    };
    $('#btn-rotate').onclick = () => {
      view.autoRotate = !view.autoRotate;
      if (orbit) orbit.autoRotate = view.autoRotate;
      $('#btn-rotate').classList.toggle('active', view.autoRotate);
      toast(view.autoRotate ? 'Turntable on' : 'Turntable off');
    };
    $('#btn-wireframe').onclick = () => {
      view.wireframe = !view.wireframe;
      $('#btn-wireframe').classList.toggle('active', view.wireframe);
      scheduleRebuild();
    };
    $('#lighting-select').onchange = (e) => {
      view.lighting = e.target.value;
      updateLighting();
      scheduleRebuild();
    };
    $('#environment-select').onchange = (e) => {
      view.environment = e.target.value;
      rebuildEnvironment();
    };
    $('#ground-grid').onchange = (e) => {
      view.grid = e.target.checked;
      rebuildEnvironment();
    };
    $('#btn-save-custom').onclick = saveCustom;
    $('#btn-export-json').onclick = downloadJSON;
    $('#btn-import-json').onclick = () => $('#file-import').click();
    $('#file-import').onchange = importJSON;
    $('#btn-export-glb').onclick = exportGLB;
    $('#btn-export-glb-side').onclick = exportGLB;
    $('#btn-screenshot').onclick = snapshot;
    $('#btn-screenshot-side').onclick = snapshot;
    $('#btn-stage-snapshot')?.addEventListener('click', snapshot);
    $('#btn-theatre')?.addEventListener('click', toggleTheatreMode);
    $('#btn-theatre-quick')?.addEventListener('click', toggleTheatreMode);
    $('#btn-fullscreen')?.addEventListener('click', toggleFullscreenViewport);
    $('#btn-fullscreen-quick')?.addEventListener('click', toggleFullscreenViewport);
    window.addEventListener('keydown', handleStudioKeydown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    try {
      savedPresets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      savedPresets = {};
    }
    renderCustomPresets();
  }

  function randomize(category) {
    const all = category === 'all';
    const keys = all
      ? [...new Set([...CATEGORIES.form, ...CATEGORIES.facade, ...CATEGORIES.features, ...CATEGORIES.palette])]
      : CATEGORIES[category];
    const r = rng32(Math.floor(Math.random() * 0xffffffff));
    for (const key of keys) {
      if (locks.has(key) || !CONFIG_KEYS.includes(key)) continue;
      const def = Object.values(SCHEMA).flat().find((x) => x.key === key);
      if (!def) continue;
      if (def.type === 'color') state[key] = pick(r, key === 'wallColor' || key === 'groundFloorColor' ? MATERIAL_CHOICES : COLOR_CHOICES);
      else if (def.type === 'select') {
        if (['wallMaterial', 'groundFloorMaterial', 'footprint', 'roofType', 'windowStyle', 'windowDamageStyle', 'facadeAccent', 'groundUse', 'signage', 'doorStyle'].includes(key)) {
          state[key] = pick(r, OPTIONS[key])[0];
        }
      } else if (def.type === 'boolean') state[key] = r() > 0.55;
      else if (def.type === 'text' || def.type === 'floor' || def.type === 'floorNumber') continue;
      else if (typeof def.min === 'number') {
        const steps = Math.round((def.max - def.min) / def.step);
        state[key] = Number((def.min + randInt(r, 0, steps) * def.step).toFixed(3));
      }
    }
    state.seed = Math.floor(Math.random() * 99999998) + 1;
    state.inspectedFloor = clamp(state.inspectedFloor, 0, state.floors);
    $('#seed-input').value = state.seed;
    activePreset = null;
    updatePresetList();
    renderControls();
    refocusAfterBuild = true;
    scheduleRebuild();
    toast(`Randomized ${all ? 'unlocked settings' : category}`);
  }

  function saveCustom() {
    const name = $('#custom-name').value.trim();
    if (!name) {
      toast('Give this building a name first');
      return;
    }
    savedPresets[name] = copy(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
    } catch {
      toast('Storage unavailable - use JSON export instead');
      return;
    }
    $('#custom-name').value = '';
    renderCustomPresets();
    toast('Saved ' + name);
  }

  function renderCustomPresets() {
    const panel = $('#custom-presets');
    panel.innerHTML = '';
    const names = Object.keys(savedPresets).sort();
    if (!names.length) {
      const p = document.createElement('p');
      p.className = 'studio-help';
      p.textContent = 'No saved buildings yet.';
      panel.appendChild(p);
      return;
    }
    for (const name of names) {
      const row = document.createElement('div');
      row.className = 'custom-preset-row';
      const load = document.createElement('button');
      load.className = 'load-custom';
      load.textContent = name;
      load.onclick = () => loadPreset(savedPresets[name], name);
      const del = document.createElement('button');
      del.className = 'delete-custom';
      del.title = 'Delete ' + name;
      del.innerHTML = '<i class="fas fa-trash"></i>';
      del.onclick = () => {
        if (confirm('Delete saved building "' + name + '"?')) {
          delete savedPresets[name];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
          renderCustomPresets();
        }
      };
      row.append(load, del);
      panel.appendChild(row);
    }
  }

  function fileDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const safeName = () => String(state.style) + '-' + String(state.seed);

  function downloadJSON() {
    fileDownload(
      new Blob([JSON.stringify({ generator: 'B-3D-Building-Generator', version: 1, settings: state }, null, 2)], { type: 'application/json' }),
      'b-building-' + safeName() + '.json'
    );
    toast('Building settings exported');
  }

  async function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      loadPreset(parsed.settings || parsed, file.name);
    } catch (err) {
      toast('Cannot import file: ' + err.message);
    }
    e.target.value = '';
  }

  /* --- Procedural materials and lightweight building primitives --- */
  let materials = new Map();
  let modelTextures = new Map();

  function solid(hex, options = {}) {
    const key = 'solid:' + hex + ':' + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color: hex, ...options }));
    return materials.get(key);
  }

  function puddleMaterial() {
    const key = 'puddle-water';
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshPhongMaterial({
        color: '#233846',
        emissive: '#0a1620',
        emissiveIntensity: 0.25,
        specular: '#c8e6ff',
        shininess: 140
      }));
    }
    return materials.get(key);
  }

  function glassMaterial(hex, lit = false) {
    const isDay = view.lighting === 'day';
    const key = 'glass:' + hex + ':' + lit + ':' + isDay;
    if (!materials.has(key)) {
      const color = new THREE.Color(hex);
      if (lit) color.lerp(new THREE.Color('#ffda88'), isDay ? 0.58 : 0.85);
      materials.set(key, new THREE.MeshPhongMaterial({
        color,
        emissive: lit ? (isDay ? '#8f6f38' : '#c79e54') : '#050b10',
        emissiveIntensity: lit ? (isDay ? 0.42 : 0.72) : 0.08,
        shininess: 90,
        specular: '#3d4f58'
      }));
    }
    return materials.get(key);
  }

  function textureMaterial(kind, mainHex, secondaryHex, mortarHex, cfg, keySeed, width, height) {
    const n = Math.floor(cfg.brickScale * 10);
    const v = Math.floor(cfg.colorVariation * 100);
    const age = Math.floor(cfg.age * 100);
    const dmg = Math.floor(cfg.damage * 100);
    const grimeHex = colorHex(cfg.grimeColor);
    const id = [kind, mainHex, secondaryHex, mortarHex, grimeHex, n, v, age, dmg, keySeed, Math.round(width * 10), Math.round(height * 10)].join('|');
    if (materials.has(id)) return materials.get(id);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const r = rng32(keySeed + 7919);
    const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
    const grime = hexToRgb(grimeHex);

    ctx.fillStyle = kind === 'brick' || kind === 'stone' ? mortarHex : mainHex;
    ctx.fillRect(0, 0, 256, 256);

    if (kind === 'brick' || kind === 'stone') {
      const rows = kind === 'brick' ? 12 : 7;
      const cols = kind === 'brick' ? 5 : 4;
      const bh = 256 / rows;
      const bw = 256 / cols;
      for (let y = 0; y < rows; y++) {
        for (let x = -1; x < cols + 1; x++) {
          const shift = (y % 2) * bw * 0.5;
          const px = x * bw + shift;
          const py = y * bh;
          const brightness = (r() - 0.5) * cfg.colorVariation * 1.1;
          ctx.fillStyle = mix(mainHex, secondaryHex, clamp(0.34 + brightness, 0, 1));
          const grout = kind === 'brick' ? 2.2 : 3.5;
          ctx.fillRect(px + grout, py + grout, bw - grout * 1.7, bh - grout * 1.8);
          if (cfg.age > 0.08 && r() < cfg.age * 0.55) {
            const alpha = (r() * cfg.age * 0.35).toFixed(3);
            ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
            ctx.fillRect(px + 3, py + bh * 0.52, bw - 6, bh * 0.34);
          }
        }
      }
    } else {
      ctx.strokeStyle = mix(mainHex, mortarHex, 0.38);
      ctx.lineWidth = kind === 'concrete' ? 2 : 1;
      const panelStep = kind === 'concrete' ? 64 : 128;
      for (let p = panelStep; p < 256; p += panelStep) {
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(256, p);
        ctx.moveTo(p, 0);
        ctx.lineTo(p, 256);
        ctx.stroke();
      }
      for (let i = 0; i < 240; i++) {
        const patchColor = r() > 0.5 ? secondaryHex : mortarHex;
        ctx.fillStyle = patchColor;
        ctx.globalAlpha = r() * 0.14 * (cfg.colorVariation + 0.15);
        ctx.fillRect(r() * 256, r() * 256, randBetween(r, 3, 22), randBetween(r, 2, 12));
      }
      ctx.globalAlpha = 1;
    }

    if (cfg.age > 0.05) {
      const streaks = Math.floor(95 * cfg.age);
      for (let i = 0; i < streaks; i++) {
        const alpha = (r() * cfg.age * 0.38).toFixed(3);
        ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${alpha})`;
        ctx.fillRect(r() * 255, r() * 255, randBetween(r, 3, 42), randBetween(r, 3, 26));
      }
    }

    if (cfg.damage > 0.05) {
      const cracks = Math.ceil(cfg.damage * 14);
      for (let i = 0; i < cracks; i++) {
        ctx.fillStyle = `rgba(${grime.r},${grime.g},${grime.b},${(0.35 + cfg.damage * 0.4).toFixed(2)})`;
        const cx = r() * 230;
        const cy = r() * 230;
        ctx.fillRect(cx, cy, randBetween(r, 8, 28), randBetween(r, 4, 16));
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(
      Math.max(1, (width / (kind === 'brick' ? 4.5 : 6)) * cfg.brickScale),
      Math.max(0.7, (height / (kind === 'brick' ? 3 : 4)) * cfg.brickScale)
    );
    texture.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, 4);
    const mat = new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff });
    materials.set(id, mat);
    modelTextures.set(id, texture);
    return mat;
  }

  function box(group, x, y, z, w, h, d, material, options = {}) {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function slabBox(group, seg, y, h, inset, material, options = {}) {
    const w = seg.w - inset * 2;
    const d = seg.d - inset * 2;
    const cut = Math.max(0, Math.min(seg.cornerCut || 0, w * 0.48, d * 0.48) - inset * 0.5);
    if (w <= 0.01 || d <= 0.01 || h <= 0.001) return null;
    if (cut <= 0.01) {
      return box(group, seg.x, y, seg.z, w, h, d, material, options);
    }
    const hw = w * 0.5;
    const hd = d * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd - cut);
    shape.lineTo(hw - cut, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(seg.x, y + h * 0.5, seg.z);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function cylinder(group, x, y, z, top, bottom, h, material, sides = 8) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function line(group, a, b, width, material) {
    const p = new THREE.Vector3(...a);
    const q = new THREE.Vector3(...b);
    const direction = q.clone().sub(p);
    const len = direction.length();
    if (len <= 0.001) return null;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 6), material);
    mesh.position.copy(p).add(q).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  function sagCable(group, a, b, sag, radius, material, segments = 6) {
    const p = new THREE.Vector3(...a);
    const q = new THREE.Vector3(...b);
    let prev = p;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const pt = new THREE.Vector3().lerpVectors(p, q, t);
      pt.y -= Math.sin(t * Math.PI) * sag;
      line(group, [prev.x, prev.y, prev.z], [pt.x, pt.y, pt.z], radius, material);
      prev = pt;
    }
  }

  function signboard(group, txt, w, h, base = '#302e32', fg = '#f5dea6') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 7;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px Arial';
    const text = (txt || 'CITY').toUpperCase().slice(0, 28);
    let size = 54;
    while (size > 18 && ctx.measureText(text).width > 460) {
      size -= 3;
      ctx.font = `bold ${size}px Arial`;
    }
    ctx.fillText(text, 256, 65);
    const tex = new THREE.CanvasTexture(canvas);
    modelTextures.set('sign-' + modelTextures.size, tex);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    face.position.z = 0.065;
    const frame = box(group, 0, 0, 0, w + 0.14, h + 0.14, 0.11, solid('#191c20'));
    group.add(face);
    return frame;
  }

  function worldRoot(parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  function pickWindowDamageMode(cfg, r, forceBroken = false) {
    const isDamaged = forceBroken || (cfg.damage > 0 && r() < cfg.damage * 0.72);
    if (!isDamaged) return 'none';
    const style = cfg.windowDamageStyle || 'mixed';
    if (style === 'boarded') return 'boarded';
    if (style === 'partial') return 'partial';
    if (style === 'broken') return 'broken';
    const roll = r();
    if (roll < 0.36) return 'boarded';
    if (roll < 0.7) return 'partial';
    return 'broken';
  }

  function addWindow(parent, side, baseX, baseY, baseZ, cfg, r, width, height, options = {}) {
    const group = worldRoot(parent, baseX, baseY, baseZ);
    const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
    group.rotation.y = rotMap[side] || 0;

    const damageMode = options.damageMode || 'none';
    const frame = solid(cfg.windowFrameColor);
    const lit = damageMode === 'none' && cfg.windowLighting > 0 && (cfg.windowLighting >= 0.99 || r() < cfg.windowLighting);
    const glass = glassMaterial(cfg.glassColor, lit);
    const dark = solid('#151a1d');
    const trim = solid(cfg.trimColor);

    let w = Math.min(width, options.maxW || width);
    let h = Math.min(height, cfg.floorHeight * 0.76);
    if (cfg.windowStyle === 'square') h = Math.min(h, w * 1.02);
    if (cfg.windowStyle === 'tall') h = Math.min(cfg.floorHeight * 0.78, h * 1.14);
    if (cfg.windowStyle === 'modern') w = Math.min(w * 1.06, options.maxW || w);

    const showShutters = cfg.shutters && !options.noShutters;
    const shutterW = showShutters ? clamp(w * 0.22, 0.16, 0.28) : 0;
    if (showShutters && options.maxW && w + shutterW * 2 + 0.22 > options.maxW) {
      w = Math.max(0.48, options.maxW - shutterW * 2 - 0.22);
    }

    const isArched = cfg.windowStyle === 'arched';
    const archRadius = isArched ? w * 0.5 : 0;
    const rectH = isArched ? Math.max(0.45, h - archRadius * 0.7) : h;
    const rectY = isArched ? -archRadius * 0.35 : 0;

    // Thin recess backing plate strictly behind the glass plane (z = 0.00 to 0.014)
    box(group, 0, rectY, 0.007, w + 0.04, rectH + 0.04, 0.014, dark, { cast: false });

    // Hollow 4-sided perimeter window frame so the center glass pane is never covered by a solid frame block
    const frameT = 0.085;
    const frameD = 0.095;
    const frameZ = frameD * 0.5;
    box(group, -w * 0.5 - frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
    box(group, w * 0.5 + frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
    box(group, 0, rectY - rectH * 0.5 - frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);

    if (isArched) {
      const archY = rectY + rectH * 0.5;
      const archShape = new THREE.Shape();
      archShape.absarc(0, 0, archRadius + 0.01, 0, Math.PI, false);
      archShape.closePath();

      // Extrudes along +Z from z = 0.012 to z = 0.056 (flush with rectangular glass, never protruding into -Z)
      const archGlassGeo = new THREE.ExtrudeGeometry(archShape, { depth: 0.044, bevelEnabled: false, curveSegments: 16 });
      const archMat = (damageMode === 'broken' || damageMode === 'partial') ? dark : glass;
      const archGlass = new THREE.Mesh(archGlassGeo, archMat);
      archGlass.position.set(0, archY, 0.012);
      group.add(archGlass);

      // Springline bar and vertical radial muntin inside the arch
      box(group, 0, archY, 0.068, w, 0.05, 0.036, frame);
      box(group, 0, archY + archRadius * 0.5, 0.068, 0.05, archRadius, 0.036, frame);

      const archFrame = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT * 0.45, frameT * 0.55, 8, 18, Math.PI), frame);
      archFrame.position.set(0, archY, frameZ);
      group.add(archFrame);

      if (cfg.trimAmount > 0.05) {
        const archTrim = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT + 0.03, 0.045, 8, 18, Math.PI), trim);
        archTrim.position.set(0, archY, frameZ + 0.015);
        group.add(archTrim);
      }
    } else {
      box(group, 0, rectY + rectH * 0.5 + frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);
      if (cfg.trimAmount > 0.12) {
        box(group, 0, rectY + rectH * 0.5 + frameT + 0.055, frameZ + 0.02, w + frameT * 2 + 0.14, 0.1, 0.13, trim);
      }
    }

    // Main glass pane (front face at z = 0.056) or shattered cavity
    if (damageMode === 'broken' || damageMode === 'partial') {
      box(group, 0, rectY, 0.025, w, rectH, 0.028, dark, { cast: false });
      const shardMat = glassMaterial(cfg.glassColor, false);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          if (r() < 0.78) {
            const sw = w * randBetween(r, 0.18, 0.34);
            const sh = rectH * randBetween(r, 0.16, 0.32);
            const shard = box(group, sx * (w * 0.5 - sw * 0.45), rectY + sy * (rectH * 0.5 - sh * 0.45), 0.045, sw, sh, 0.025, shardMat, { cast: false });
            if (shard) shard.rotation.z = sx * sy * randBetween(r, 0.15, 0.42);
          }
        }
      }
      line(group, [-w * 0.38, rectY - rectH * 0.34, 0.052], [w * 0.32, rectY + rectH * 0.32, 0.052], 0.012, frame);
    } else {
      box(group, 0, rectY, 0.034, w, rectH, 0.044, glass, { cast: false });
    }

    // Curtains layered cleanly at z = 0.058 (in front of glass at 0.056, behind muntins at 0.068)
    if (cfg.curtains && !options.noCurtains && damageMode !== 'boarded') {
      const curtainTone = lit ? '#ebd8b7' : (r() > 0.5 ? '#a39788' : '#7f8c96');
      const curtainMat = solid(curtainTone);
      const panelW = w * 0.25;
      box(group, 0, rectY + rectH * 0.5 - 0.05, 0.058, w * 0.96, 0.09, 0.012, curtainMat, { cast: false });
      for (const dir of [-1, 1]) {
        if (damageMode !== 'none' && r() < 0.35) continue;
        const cGroup = worldRoot(group, dir * (w * 0.5 - panelW * 0.54), rectY, 0.058);
        if (damageMode !== 'none') cGroup.rotation.z = dir * randBetween(r, -0.14, 0.18);
        box(cGroup, 0, rectH * 0.04, 0, panelW, rectH * 0.88, 0.012, curtainMat, { cast: false });
        box(cGroup, -dir * panelW * 0.16, -rectH * 0.18, 0.004, panelW * 0.62, rectH * 0.46, 0.012, curtainMat, { cast: false });
      }
    }

    // Muntins / sash bars at z = 0.068 (front face at z = 0.086)
    if (cfg.windowStyle === 'sash' || cfg.windowStyle === 'arched') {
      if (damageMode === 'none' || r() < 0.5) box(group, 0, rectY, 0.068, 0.052, rectH, 0.036, frame);
      box(group, 0, rectY, 0.068, w, 0.052, 0.036, frame);
    } else if (cfg.windowStyle === 'modern') {
      box(group, 0, rectY, 0.068, 0.048, rectH, 0.036, frame);
    } else if (cfg.windowStyle === 'tall') {
      box(group, 0, rectY - rectH * 0.18, 0.068, w, 0.052, 0.036, frame);
      box(group, 0, rectY + rectH * 0.22, 0.068, w, 0.045, 0.036, frame);
    }

    // Window sill anchored below the bottom frame rail
    box(group, 0, rectY - rectH * 0.5 - frameT - 0.035, 0.065, w + frameT * 2 + 0.16, 0.095, 0.18, trim);

    // Shutters with horizontal louver slats (and crooked tilt on aged or damaged buildings)
    if (showShutters) {
      const shutterMat = solid(cfg.doorColor);
      const sx = w * 0.5 + frameT + 0.02 + shutterW * 0.5;
      const wearAmount = Math.max(cfg.damage, cfg.age > 0.35 ? (cfg.age - 0.35) * 0.85 : 0);
      for (const dir of [-1, 1]) {
        if (cfg.damage > 0.45 && r() < cfg.damage * 0.22) continue;
        const shGroup = worldRoot(group, dir * sx, rectY, 0.042);
        if (wearAmount > 0.06 && r() < 0.78) {
          shGroup.rotation.z = dir * randBetween(r, -0.24, 0.28) * wearAmount;
          shGroup.rotation.y = -dir * randBetween(r, 0, 0.26) * wearAmount;
        }
        box(shGroup, 0, 0, 0, shutterW, rectH + 0.04, 0.055, shutterMat);
        box(shGroup, 0, 0, 0.03, shutterW * 0.76, 0.05, 0.02, frame);
        box(shGroup, 0, rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
        box(shGroup, 0, -rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
      }
    }

    // Boarded and partially-boarded wooden planks positioned in front of the frame
    if (damageMode === 'boarded') {
      const planks = Math.max(3, Math.min(5, Math.round(rectH / 0.38)));
      const plankColors = ['#69503c', '#5b4331', '#755a43', '#4f3a2b'];
      for (const dir of [-1, 1]) {
        box(group, dir * (w * 0.38), rectY, 0.095, 0.11, rectH * 0.94, 0.03, solid('#4e392a'));
      }
      for (let p = 0; p < planks; p++) {
        const py = rectY - rectH * 0.4 + (p / (planks - 1)) * (rectH * 0.8);
        const plank = box(group, 0, py, 0.115, w + 0.22, (rectH / planks) * 0.82, 0.038, solid(pick(r, plankColors)));
        if (plank) plank.rotation.z = randBetween(r, -0.06, 0.06);
      }
    } else if (damageMode === 'partial') {
      const plankColors = ['#69503c', '#5b4331', '#755a43'];
      const p1 = box(group, 0, rectY + rectH * 0.14, 0.105, w + 0.18, 0.17, 0.038, solid(pick(r, plankColors)));
      if (p1) p1.rotation.z = randBetween(r, 0.08, 0.24);
      if (r() < 0.78) {
        const p2 = box(group, 0, rectY - rectH * 0.18, 0.112, w + 0.16, 0.16, 0.038, solid(pick(r, plankColors)));
        if (p2) p2.rotation.z = randBetween(r, -0.22, -0.06);
      }
    }

    // Window A/C unit mounted on lower sill
    if (options.hasAC && damageMode !== 'boarded') {
      const acW = clamp(w * 0.58, 0.52, 0.82);
      const acH = clamp(rectH * 0.28, 0.34, 0.48);
      const acD = 0.46;
      const acY = rectY - rectH * 0.5 + acH * 0.5 + 0.02;
      const acGroup = worldRoot(group, 0, acY, acD * 0.42);
      if (cfg.age > 0.3 || cfg.damage > 0.15) {
        acGroup.rotation.x = 0.065;
        acGroup.rotation.z = randBetween(r, -0.04, 0.04);
      }
      box(acGroup, 0, 0, 0, acW, acH, acD, solid(cfg.age > 0.45 ? '#787d7a' : '#8e9699'));
      box(acGroup, 0, 0, acD * 0.5 + 0.01, acW * 0.9, acH * 0.84, 0.03, solid('#343a3e'));
      box(acGroup, -acW * 0.18, 0, acD * 0.5 + 0.025, acW * 0.44, acH * 0.68, 0.02, solid('#1d2225'));
      box(acGroup, acW * 0.24, 0, acD * 0.5 + 0.025, acW * 0.28, acH * 0.68, 0.02, solid('#495156'));
      for (const sx of [-1, 1]) {
        line(acGroup, [sx * acW * 0.36, -acH * 0.5 - 0.18, -acD * 0.28], [sx * acW * 0.36, -acH * 0.5, acD * 0.35], 0.022, solid('#454b4e'));
      }
    }

    return group;
  }

  function addDoor(parent, side, x, y, z, cfg, wide = false) {
    const group = worldRoot(parent, x, y, z);
    const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
    group.rotation.y = rotMap[side] || 0;

    const w = wide ? 2.5 : 1.55;
    const h = cfg.floorHeight * 0.68;
    const trim = solid(cfg.trimColor);
    const doorMat = wide ? glassMaterial(cfg.glassColor, cfg.windowLighting > 0.25 || view.lighting === 'night') : solid(cfg.doorColor);

    // Hollow door surround jambs and lintel so the door leaf is never buried inside the trim
    const jambT = 0.17;
    box(group, -w * 0.5 - jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
    box(group, w * 0.5 + jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
    box(group, 0, h + jambT * 0.5, 0.06, w + jambT * 2, jambT, 0.14, trim);
    box(group, 0, h * 0.5, 0.038, w, h, 0.065, doorMat);
    if (wide) {
      box(group, 0, h * 0.5, 0.075, 0.06, h, 0.04, trim);
    }
    box(group, wide ? 0.16 : w * 0.32, h * 0.46, 0.088, 0.08, 0.16, 0.06, solid('#d5b66c'));
    box(group, 0, h + jambT + 0.08, 0.09, w + 0.56, 0.18, 0.22, trim);

    if (cfg.doorStyle === 'stoop') {
      for (const dir of [-1, 1]) {
        box(group, dir * (w * 0.5 + 0.24), h * 0.5, 0.14, 0.18, h + 0.16, 0.26, trim);
      }
      box(group, 0, h + 0.26, 0.22, w + 0.82, 0.22, 0.48, trim);
    }
    return group;
  }

  function addBalcony(parent, side, x, y, z, w, cfg) {
    const group = worldRoot(parent, x, y, z);
    const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
    group.rotation.y = rotMap[side] || 0;

    const steel = solid(cfg.windowFrameColor);
    const deck = solid('#525452');
    const depth = 1.15;
    const baseY = -cfg.floorHeight * 0.36;

    box(group, 0, baseY, depth * 0.5, w, 0.12, depth, deck);
    box(group, 0, baseY + 0.86, depth - 0.04, w + 0.04, 0.06, 0.06, steel);
    box(group, -w * 0.5 + 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);
    box(group, w * 0.5 - 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);

    const posts = Math.max(4, Math.round(w * 2.5));
    for (let j = 0; j <= posts; j++) {
      const px = -w * 0.5 + 0.03 + (j / posts) * (w - 0.06);
      box(group, px, baseY + 0.44, depth - 0.04, 0.04, 0.8, 0.04, steel);
    }
    for (const sx of [-w * 0.5 + 0.03, w * 0.5 - 0.03]) {
      box(group, sx, baseY + 0.44, depth * 0.5, 0.04, 0.8, 0.04, steel);
    }
  }

  function chooseFireEscapePlacement(groundSegments, cfg, r) {
    if (!cfg.fireEscape || cfg.floors < 2) return null;
    const segs = Array.isArray(groundSegments) ? groundSegments : [groundSegments];
    const seg = segs[0];
    const topSeg = segmentsForFloor(cfg, cfg.floors - 1)[0] || seg;
    const frontBusy = cfg.awning || cfg.groundUse === 'shop' || cfg.signage !== 'none' || cfg.cutaway || cfg.doorStyle === 'stoop';
    const order = frontBusy
      ? ['right', 'left', 'back']
      : (cfg.seed % 3 === 0 ? ['front', 'right', 'left', 'back'] : ['right', 'left', 'front', 'back']);

    const pickFromSpan = (targetSeg, side, s, e, extIndex = -1) => {
      const avail = e - s;
      const long = side === 'front' || side === 'back';
      const totalLength = long ? targetSeg.w : targetSeg.d;
      const desiredCols = long ? cfg.windowsX : cfg.windowsSide;
      const shutterPad = cfg.shutters ? 0.62 : 0.34;
      const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
      const maxFit = Math.max(1, Math.floor(avail / (cfg.windowWidth + shutterPad)));
      const windowCount = Math.max(1, Math.min(proportional, maxFit));
      const spacing = avail / windowCount;

      const colIdx = side === 'front'
        ? windowCount - 1
        : Math.min(windowCount - 1, Math.floor(r() * windowCount));
      const deckW = clamp(spacing * 0.95, 1.8, Math.min(2.55, avail - 0.08));
      const rawCoord = s + (colIdx + 0.5) * spacing;
      const coord = clamp(rawCoord, s + deckW * 0.5, e - deckW * 0.5);
      return { side, coord, deckW, extIndex };
    };

    // Pass 1A: Look for an unoccluded span on the primary building body that aligns with upper setback floors
    for (const side of order) {
      if (side === 'front' && (frontBusy || cfg.cutaway)) continue;
      if (seg.skipWalls?.[side]) continue;

      const long = side === 'front' || side === 'back';
      const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
      const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.45;
      const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - 0.45;
      if (spanEnd - spanStart < 1.9) continue;

      const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
      const topCut = (side === 'front' || side === 'right') ? (topSeg.cornerCut || 0) : 0;
      const topStart = (long ? topSeg.x - topSeg.w * 0.5 : topSeg.z - topSeg.d * 0.5) + 0.35;
      const topEnd = (long ? topSeg.x + topSeg.w * 0.5 : topSeg.z + topSeg.d * 0.5) - topCut - 0.35;

      const candidates = [];
      for (const [s, e] of exposed) {
        if (e - s < 1.9) continue;
        if (cfg.setback > 0) {
          const os = Math.max(s, topStart);
          const oe = Math.min(e, topEnd);
          if (oe - os >= 1.85) candidates.push([os, oe]);
        } else {
          candidates.push([s, e]);
        }
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
        const [bestS, bestE] = candidates[0];
        return pickFromSpan(seg, side, bestS, bestE, -1);
      }
    }

    // Pass 2: If extensions occlude the main walls (or setback corners don't align), mount on the exterior wall of an extension
    const extSegments = segs.filter((s) => s.isExtension);
    for (const extSeg of extSegments) {
      const extSide = extSeg.skipWalls?.front ? 'back' : (extSeg.skipWalls?.right ? 'left' : 'right');
      const long = extSide === 'front' || extSide === 'back';
      const spanStart = (long ? extSeg.x - extSeg.w * 0.5 : extSeg.z - extSeg.d * 0.5) + 0.35;
      const spanEnd = (long ? extSeg.x + extSeg.w * 0.5 : extSeg.z + extSeg.d * 0.5) - 0.35;
      if (spanEnd - spanStart >= 1.8) {
        return pickFromSpan(extSeg, extSide, spanStart, spanEnd, extSeg.extIndex);
      }
    }

    // Pass 3: Fallback to any unoccluded span on the primary building body
    for (const side of order) {
      if (side === 'front' && (frontBusy || cfg.cutaway)) continue;
      if (seg.skipWalls?.[side]) continue;
      const long = side === 'front' || side === 'back';
      const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
      const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.45;
      const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - 0.45;
      const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []).filter(([s, e]) => e - s >= 1.85);
      if (exposed.length > 0) {
        return pickFromSpan(seg, side, exposed[0][0], exposed[0][1], -1);
      }
    }

    return {
      side: 'right',
      coord: seg.z - (seg.cornerCut || 0) * 0.25,
      deckW: clamp(seg.d * 0.32, 1.8, 2.4),
      extIndex: -1
    };
  }

  function getFireEscapeWallAnchor(seg, side, desiredCoord, deckW) {
    const long = side === 'front' || side === 'back';
    const cut = (side === 'front' || side === 'right') ? (seg.cornerCut || 0) : 0;
    const minC = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + deckW * 0.5 + 0.15;
    const maxC = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - cut - deckW * 0.5 - 0.15;
    let coord = maxC >= minC ? clamp(desiredCoord, minC, maxC) : (minC + maxC) * 0.5;

    const blocked = seg.occlusions?.[side] || [];
    if (blocked.length > 0 && maxC >= minC) {
      const spans = subtractIntervals(minC - deckW * 0.5, maxC + deckW * 0.5, blocked)
        .filter(([s, e]) => e - s >= deckW * 0.85);
      if (spans.length > 0) {
        let bestSpan = spans[0];
        let bestDist = Infinity;
        for (const sp of spans) {
          const clamped = clamp(desiredCoord, sp[0] + deckW * 0.5, sp[1] - deckW * 0.5);
          const dist = Math.abs(clamped - desiredCoord);
          if (dist < bestDist) {
            bestDist = dist;
            bestSpan = sp;
          }
        }
        coord = clamp(desiredCoord, bestSpan[0] + deckW * 0.5, bestSpan[1] - deckW * 0.5);
      }
    }

    if (side === 'front') return { x: coord, z: seg.z + seg.d * 0.5, coord };
    if (side === 'back') return { x: coord, z: seg.z - seg.d * 0.5, coord };
    if (side === 'left') return { x: seg.x - seg.w * 0.5, z: coord, coord };
    return { x: seg.x + seg.w * 0.5, z: coord, coord };
  }

  function addFireEscape(parent, seg, placement, cfg) {
    if (!placement || cfg.floors < 2) return;
    const { side, coord, deckW, extIndex = -1 } = placement;
    const steel = solid('#3a4347');
    const deckD = 1.22;
    const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

    const segForFloor = (flIdx) => {
      const flSegs = segmentsForFloor(cfg, flIdx);
      if (extIndex >= 0) {
        const ext = flSegs.find((s) => s.isExtension && s.extIndex === extIndex);
        if (ext) return ext;
      }
      return flSegs[0] || seg;
    };

    const wallAnchorForFloor = (flIdx) => getFireEscapeWallAnchor(segForFloor(flIdx), side, coord, deckW);

    // Local coordinate helper: convert world (wx, wz) into local (lx, lz) of a floor anchor
    const toLocalXZ = (anchor, wx, wz) => {
      const dx = wx - anchor.x;
      const dz = wz - anchor.z;
      if (side === 'front') return { x: dx, z: dz };
      if (side === 'back') return { x: -dx, z: -dz };
      if (side === 'left') return { x: dz, z: -dx };
      return { x: -dz, z: dx };
    };

    // Two distinct stair lanes in Z:
    // Inner lane (near building wall): center at 0.44m
    // Outer lane (near outer railing): center at 0.86m
    const zInner = 0.44;
    const zOuter = 0.86;
    const stairHW = 0.18; // Half-width of stair in Z (0.36m width)
    const stairTreadD = 0.36;

    const xSpan = deckW * 0.34;
    const halfDeckW = deckW * 0.5;
    const deckT = 0.08;

    // Precompute anchors and stair flight lanes per floor so arriving openings and departing flights never collide
    const anchors = [];
    for (let f = 0; f < cfg.floors; f++) {
      anchors.push(wallAnchorForFloor(f));
    }

    const flightLanes = [];
    for (let i = 1; i < cfg.floors - 1; i++) {
      const anchorBelow = anchors[i - 1];
      const anchorAbove = anchors[i];
      const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
      const stepBackZ = Math.max(0, stepOffset.z);

      let lane = i % 2 === 1 ? zOuter : zInner;
      if (i > 1) {
        const prevArriveZ = stepBackZ + flightLanes[i - 1];
        if (Math.abs(lane - prevArriveZ) < stairHW * 2 + 0.06) {
          const altLane = lane === zOuter ? zInner : zOuter;
          if (Math.abs(altLane - prevArriveZ) >= Math.abs(lane - prevArriveZ)) {
            lane = altLane;
          }
        }
      }
      flightLanes[i] = lane;
    }

    for (let i = 1; i < cfg.floors; i++) {
      const y = i * cfg.floorHeight + 0.12;
      const anchorBelow = anchors[i - 1];
      const anchorAbove = anchors[i];
      const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
      const stepBackZ = Math.max(0, stepOffset.z);
      const shiftX = stepOffset.x;

      const group = worldRoot(parent, anchorAbove.x, 0, anchorAbove.z);
      group.rotation.y = rotMap[side] || 0;

      const totalDeckD = stepBackZ + deckD;
      const zCenter = totalDeckD * 0.5;
      const minDeckX = Math.min(-halfDeckW, shiftX - halfDeckW);
      const maxDeckX = Math.max(halfDeckW, shiftX + halfDeckW);
      const fullDeckW = maxDeckX - minDeckX;
      const centerDeckX = (minDeckX + maxDeckX) * 0.5;

      if (i === 1) {
        // Floor 1 (lowest landing): Solid walking deck with ground ladder
        box(group, centerDeckX, y, zCenter, fullDeckW, deckT, totalDeckD, steel);
      } else {
        // Upper landings: Contains actual stairwell opening for flight arriving from floor i - 1
        // Flight i - 1 climbed along floor (i - 1)'s exterior wall (offset by shiftX, stepBackZ)
        const prevDir = (i - 1) % 2 === 1 ? 1 : -1;
        const prevLaneZ = stepBackZ + flightLanes[i - 1];
        const xArrive = shiftX + prevDir * xSpan;

        // Headroom clearance opening extends back along the arriving stair flight
        const openLen = Math.min(xSpan * 1.6, 1.25);
        const xOpen1 = Math.min(xArrive, xArrive - prevDir * openLen);
        const xOpen2 = Math.max(xArrive, xArrive - prevDir * openLen);

        const zOpenMin = prevLaneZ - stairHW - 0.03;
        const zOpenMax = prevLaneZ + stairHW + 0.03;

        // 1. Continuous wall-side walkway from the upper wall (z = 0) up to the stairwell opening (z = zOpenMin)
        if (zOpenMin > 0.04) {
          box(group, centerDeckX, y, zOpenMin * 0.5, fullDeckW, deckT, zOpenMin, steel);
        }

        // 2. Outer deck plate (between zOpenMax and outer railing at totalDeckD)
        const outerD = totalDeckD - zOpenMax;
        if (outerD > 0.03) {
          box(group, centerDeckX, y, zOpenMax + outerD * 0.5, fullDeckW, deckT, outerD, steel);
        }

        // 3. Solid end landing plates on both sides of the opening in X (spanning zOpenMin to zOpenMax)
        const openSpanD = zOpenMax - zOpenMin;
        if (maxDeckX - xOpen2 > 0.03) {
          const wRight = maxDeckX - xOpen2;
          box(group, xOpen2 + wRight * 0.5, y, zOpenMin + openSpanD * 0.5, wRight, deckT, openSpanD, steel);
        }
        if (xOpen1 - minDeckX > 0.03) {
          const wLeft = xOpen1 - minDeckX;
          box(group, minDeckX + wLeft * 0.5, y, zOpenMin + openSpanD * 0.5, wLeft, deckT, openSpanD, steel);
        }

        // Structural coaming / header framing around the 4 sides of the stairwell opening
        const frameT = 0.035;
        box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMin, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
        box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMax, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
        const backX = prevDir === 1 ? xOpen1 : xOpen2;
        box(group, backX, y, (zOpenMin + zOpenMax) * 0.5, frameT, deckT + 0.02, openSpanD, steel);

        // Guardrail along the inner walkway side of the opening to prevent falling into the stairwell
        // Only place the inner opening rail when it doesn't block a departing flight on a narrow landing
        const departLaneZ = i < cfg.floors - 1 ? flightLanes[i] : -1;
        const railClearOfDepart = departLaneZ < 0 || Math.abs(zOpenMin - departLaneZ) > stairHW + 0.06;
        if (railClearOfDepart) {
          const openRailY = y + 0.88;
          const openRailZ = zOpenMin;
          line(group, [xOpen1, openRailY, openRailZ], [xOpen2, openRailY, openRailZ], 0.03, steel);
          line(group, [backX, openRailY, zOpenMin], [backX, openRailY, zOpenMax], 0.03, steel);
          const railPosts = 4;
          for (let p = 0; p <= railPosts; p++) {
            const rx = xOpen1 + (p / railPosts) * (xOpen2 - xOpen1);
            line(group, [rx, y + 0.04, openRailZ], [rx, openRailY, openRailZ], 0.024, steel);
          }
        }
      }

      // Diagonal structural wall support struts anchored to floor (i - 1)'s exterior wall at z = stepBackZ
      for (const dx of [shiftX - deckW * 0.42, shiftX + deckW * 0.42]) {
        line(group, [dx, y - 0.58, stepBackZ + 0.02], [dx, y - 0.03, totalDeckD - 0.12], 0.04, steel);
      }

      // Outer street-side guardrail & balusters
      const railY = y + 0.88;
      box(group, centerDeckX, railY, totalDeckD - 0.04, fullDeckW, 0.06, 0.06, steel);
      box(group, minDeckX + 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);
      box(group, maxDeckX - 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);

      const frontBalusters = Math.max(6, Math.round(fullDeckW * 2.5));
      for (let j = 0; j < frontBalusters; j++) {
        const bx = minDeckX + 0.04 + (j / (frontBalusters - 1)) * (fullDeckW - 0.08);
        box(group, bx, y + 0.46, totalDeckD - 0.04, 0.04, 0.82, 0.04, steel);
      }
      const sideBalusters = Math.max(2, Math.round(totalDeckD * 1.8));
      for (const sx of [minDeckX + 0.03, maxDeckX - 0.03]) {
        for (let k = 1; k <= sideBalusters; k++) {
          box(group, sx, y + 0.46, (k / (sideBalusters + 1)) * totalDeckD, 0.04, 0.82, 0.04, steel);
        }
      }

      // Stairs climbing from floor i to floor i + 1 (mounted outside floor i's wall, z in [0, deckD])
      if (i < cfg.floors - 1) {
        const nextY = (i + 1) * cfg.floorHeight + 0.12;
        const dir = i % 2 === 1 ? 1 : -1;
        const laneZ = flightLanes[i];
        const xStart = -dir * xSpan;
        const xEnd = dir * xSpan;

        // Stringers and handrails
        for (const dz of [-stairHW, stairHW]) {
          line(group, [xStart, y, laneZ + dz], [xEnd, nextY, laneZ + dz], 0.042, steel);
          line(group, [xStart, y + 0.82, laneZ + dz], [xEnd, nextY + 0.82, laneZ + dz], 0.032, steel);
        }

        // Treads
        const steps = 9;
        for (let s = 1; s <= steps; s++) {
          const frac = s / steps;
          const sx = xStart + (xEnd - xStart) * frac;
          const sy = y + cfg.floorHeight * frac;
          box(group, sx, sy, laneZ, 0.24, 0.045, stairTreadD, steel);
        }
      }

      // Ground-access ladder at lowest landing (floor 1)
      if (i === 1) {
        const lx = maxDeckX + 0.18;
        const lz = stepBackZ + deckD * 0.55;
        const botY = 0.45;
        const topY = y + 1.05;
        box(group, maxDeckX + 0.09, y, lz, 0.18, 0.06, 0.38, steel);
        for (const dz of [-0.16, 0.16]) {
          line(group, [lx, botY, lz + dz], [lx, topY, lz + dz], 0.03, steel);
        }
        const rungs = Math.max(4, Math.floor((topY - botY) / 0.32));
        for (let rIdx = 0; rIdx <= rungs; rIdx++) {
          const ry = botY + (rIdx / rungs) * (topY - botY - 0.15);
          box(group, lx, ry, lz, 0.04, 0.035, 0.32, steel);
        }
      }
    }
  }

  function addAwning(parent, cx, wallZ, spanW, h, cfg, isDoorCanopy = false) {
    if (!cfg.awning || spanW < 1.4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = cfg.awningColor;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#e5d5bb';
    for (let i = 0; i < 128; i += 32) ctx.fillRect(i, 0, 14, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(isDoorCanopy ? 2 : 4, 1);
    modelTextures.set('awning-' + modelTextures.size, tex);

    const depth = isDoorCanopy ? 1.25 : 1.45;
    const mountY = isDoorCanopy ? Math.min(h * 0.84, h - 0.35) : h * 0.74;
    const mesh = box(parent, cx, mountY, wallZ + depth * 0.5, spanW, 0.09, depth, new THREE.MeshLambertMaterial({ map: tex }));
    if (mesh) mesh.rotation.x = 0.22;
    box(parent, cx, mountY - 0.16, wallZ + depth - 0.04, spanW, 0.16, 0.06, solid(cfg.awningColor));
    for (const dx of [-spanW * 0.48, spanW * 0.48]) {
      line(parent, [cx + dx, mountY - 0.32, wallZ + 0.02], [cx + dx, mountY - 0.16, wallZ + depth - 0.06], 0.03, solid('#343a3d'));
    }
  }

  function addEntrance(parent, seg, cfg, r) {
    const cut = seg.cornerCut || 0;
    const usableW = seg.w - cut;
    const cx = seg.x - cut * 0.5;
    const wallZ = seg.z + seg.d * 0.5;
    const wideDoor = cfg.doorStyle === 'double' || cfg.groundUse === 'lobby' || cfg.groundUse === 'shop';
    const steps = cfg.groundUse === 'shop' ? 0 : (cfg.doorStyle === 'stoop' ? Math.max(1, cfg.entranceSteps) : cfg.entranceSteps);
    const stepH = 0.14;
    const stepD = 0.34;
    const landingD = cfg.doorStyle === 'stoop' ? 0.95 : 0.65;
    const totalRise = steps * stepH;

    addDoor(parent, 'front', cx, totalRise, wallZ, cfg, wideDoor);

    if (steps > 0) {
      const stairMat = solid('#888882');
      const railMat = solid('#424749');
      const stoopW = wideDoor ? 3.2 : 2.4;
      for (let i = 0; i < steps; i++) {
        const levelH = (i + 1) * stepH;
        const depth = landingD + (steps - 1 - i) * stepD;
        box(parent, cx, levelH * 0.5, wallZ + depth * 0.5, stoopW, levelH, depth, stairMat);
      }
      const totalDepth = landingD + (steps - 1) * stepD;
      const railH = 0.78;
      for (const dx of [-stoopW * 0.5 + 0.09, stoopW * 0.5 - 0.09]) {
        const rx = cx + dx;
        box(parent, rx, (totalRise + railH) * 0.5, wallZ + landingD * 0.5, 0.14, totalRise + railH, landingD, stairMat);
        box(parent, rx, (stepH + railH) * 0.5, wallZ + totalDepth - 0.1, 0.16, stepH + railH, 0.2, stairMat);
        line(parent, [rx, totalRise + railH, wallZ + landingD - 0.06], [rx, stepH + railH, wallZ + totalDepth - 0.1], 0.045, railMat);
      }
    }

    if (cfg.groundUse === 'shop') {
      const doorHalfW = (wideDoor ? 2.5 : 1.55) * 0.5 + 0.45;
      const sideSpace = usableW * 0.5 - doorHalfW - 0.45;
      if (sideSpace >= 1.1) {
        const bayW = Math.min(3.4, sideSpace * 0.88);
        const bayOffset = doorHalfW + sideSpace * 0.5;
        const shopCfg = { ...cfg, windowStyle: 'modern', windowLighting: Math.max(0.75, cfg.windowLighting) };
        const shopDmgL = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
        const shopDmgR = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
        addWindow(parent, 'front', cx - bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgL });
        addWindow(parent, 'front', cx + bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgR });
      }
      addAwning(parent, cx, wallZ, usableW * 0.82, cfg.floorHeight, cfg, false);
    } else if (cfg.awning) {
      const canopyW = Math.min(usableW * 0.55, wideDoor ? 3.8 : 2.9);
      addAwning(parent, cx, wallZ, canopyW, cfg.floorHeight + totalRise * 0.6, cfg, true);
    }

    if (cfg.signage !== 'none') {
      const signY = cfg.awning ? cfg.floorHeight * 0.94 : cfg.floorHeight * 0.86;
      const sign = worldRoot(parent, cx, signY, wallZ + 0.08);
      signboard(sign, cfg.signText, Math.min(usableW * 0.68, 9.5), 0.62, cfg.signage === 'marquee' ? '#302b2b' : '#40322d', cfg.signColor);
    }

    if (cfg.groundUse !== 'shop') {
      const doorHalf = (wideDoor ? 2.5 : 1.55) * 0.5;
      const plaque = worldRoot(parent, cx - doorHalf - 0.55, totalRise + 1.45, wallZ + 0.06);
      signboard(plaque, String((cfg.seed % 900) + 100), 0.54, 0.32, '#323437', '#ead6ac');
      for (const s of [-1, 1]) {
        box(parent, cx + s * (doorHalf + 0.28), totalRise + 1.65, wallZ + 0.08, 0.1, 0.36, 0.12, solid('#d8ad70'));
      }
    }
  }

  function subtractIntervals(start, end, blocked = []) {
    let spans = [[start, end]];
    for (const [bStart, bEnd] of blocked) {
      const next = [];
      for (const [s, e] of spans) {
        if (bEnd <= s || bStart >= e) {
          next.push([s, e]);
        } else {
          if (bStart > s) next.push([s, bStart]);
          if (bEnd < e) next.push([bEnd, e]);
        }
      }
      spans = next;
    }
    return spans.filter(([s, e]) => e - s > 0.25);
  }

  function makeSeg(x, z, w, d, props = {}) {
    return {
      x,
      z,
      w,
      d,
      isMain: !!props.isMain,
      hasEntrance: !!props.hasEntrance,
      isExtension: !!props.isExtension,
      extIndex: props.extIndex ?? -1,
      cornerCut: props.cornerCut || 0,
      skipWalls: props.skipWalls || {},
      occlusions: {
        front: [...(props.occlusions?.front || [])],
        back: [...(props.occlusions?.back || [])],
        left: [...(props.occlusions?.left || [])],
        right: [...(props.occlusions?.right || [])]
      }
    };
  }

  function segmentsForFloor(cfg, index) {
    const setbackStart = Math.floor(cfg.floors * 0.6);
    const rawShrink = cfg.setback > 0 && index >= setbackStart
      ? cfg.setback * (1 + Math.floor((index - setbackStart) / 3) * 0.4)
      : 0;
    const baseW = cfg.width;
    const baseD = cfg.depth;
    const maxShrink = Math.max(0, Math.min((baseW - 5) * 0.45, (baseD - 5) * 0.45));
    const shrink = Math.min(rawShrink, maxShrink);

    const w = Math.max(5, baseW - shrink * 2);
    const d = Math.max(5, baseD - shrink * 2);
    const cut = cfg.cornerCut > 0 ? Math.min(cfg.cornerCut, w * 0.28, d * 0.28) : 0;

    const segments = [];
    if (cfg.footprint === 'L') {
      const lShrink = Math.min(shrink, Math.max(0.3, baseW * 0.46 - 2.0));
      const lw = Math.max(5, baseW - lShrink * 2);
      const lCut = cfg.cornerCut > 0 ? Math.min(cfg.cornerCut, lw * 0.28, d * 0.28) : 0;

      const seamZ = -baseD * 0.5 + baseD * 0.56;
      const backMinZ = -baseD * 0.5 + lShrink;
      const backMaxZ = seamZ;
      const backD = Math.max(2.4, backMaxZ - backMinZ);
      const backZ = (backMinZ + backMaxZ) * 0.5;

      const wingMinX = -baseW * 0.5 + lShrink;
      const wingMaxX = -baseW * 0.5 + baseW * 0.46;
      const frontW = Math.max(1.8, wingMaxX - wingMinX);
      const frontX = (wingMinX + wingMaxX) * 0.5;
      const frontMaxZ = Math.max(backMaxZ + 1.8, baseD * 0.5 - lShrink);
      const frontD = frontMaxZ - backMaxZ;
      const frontZ = backMaxZ + frontD * 0.5;

      segments.push(makeSeg(0, backZ, lw, backD, {
        isMain: true,
        hasEntrance: true,
        cornerCut: lCut,
        occlusions: { front: [[wingMinX, wingMaxX]] }
      }));
      segments.push(makeSeg(frontX, frontZ, frontW, frontD, {
        skipWalls: { back: true }
      }));
    } else if (cfg.footprint === 'U') {
      const uShrink = Math.min(shrink, Math.max(0.3, baseW * 0.31 - 1.8));
      const uw = Math.max(5, baseW - uShrink * 2);

      const seamZ = -baseD * 0.5 + baseD * 0.46;
      const backMinZ = -baseD * 0.5 + uShrink;
      const backMaxZ = seamZ;
      const backD = Math.max(2.4, backMaxZ - backMinZ);
      const backZ = (backMinZ + backMaxZ) * 0.5;

      const leftMinX = -baseW * 0.5 + uShrink;
      const leftMaxX = -baseW * 0.5 + baseW * 0.31;
      const rightMinX = baseW * 0.5 - baseW * 0.31;
      const rightMaxX = baseW * 0.5 - uShrink;
      const wingW = Math.max(1.8, leftMaxX - leftMinX);

      const wingMaxZ = Math.max(backMaxZ + 1.8, baseD * 0.5 - uShrink);
      const wingD = wingMaxZ - backMaxZ;
      const wingZ = backMaxZ + wingD * 0.5;

      segments.push(makeSeg(0, backZ, uw, backD, {
        isMain: true,
        hasEntrance: true,
        occlusions: {
          front: [
            [leftMinX, leftMaxX],
            [rightMinX, rightMaxX]
          ]
        }
      }));
      segments.push(makeSeg((leftMinX + leftMaxX) * 0.5, wingZ, wingW, wingD, {
        skipWalls: { back: true }
      }));
      segments.push(makeSeg((rightMinX + rightMaxX) * 0.5, wingZ, wingW, wingD, {
        cornerCut: Math.min(cut, wingW * 0.35),
        skipWalls: { back: true }
      }));
    } else {
      segments.push(makeSeg(0, 0, w, d, {
        isMain: true,
        hasEntrance: true,
        cornerCut: cut
      }));
    }

    const extLimit = Math.max(1, Math.ceil(cfg.floors * 0.45));
    if (cfg.extension > 0 && index < extLimit) {
      const main = segments[0];
      const extSpecs = [
        {
          side: 'back',
          w: main.w * 0.48,
          d: d * 0.28,
          x: main.x,
          z: main.z - main.d * 0.5 - d * 0.14,
          skip: 'front',
          occ: [main.x - main.w * 0.24, main.x + main.w * 0.24]
        },
        {
          side: 'left',
          w: w * 0.24,
          d: main.d * 0.58,
          x: main.x - main.w * 0.5 - w * 0.12,
          z: main.z,
          skip: 'right',
          occ: [main.z - main.d * 0.29, main.z + main.d * 0.29]
        },
        {
          side: 'right',
          w: w * 0.24,
          d: main.d * (main.cornerCut > 0 ? 0.42 : 0.58),
          x: main.x + main.w * 0.5 + w * 0.12,
          z: main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0),
          skip: 'left',
          occ: [
            main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0) - main.d * (main.cornerCut > 0 ? 0.21 : 0.29),
            main.z - (main.cornerCut > 0 ? main.cornerCut * 0.35 : 0) + main.d * (main.cornerCut > 0 ? 0.21 : 0.29)
          ]
        }
      ];

      for (let i = 0; i < Math.min(cfg.extension, extSpecs.length); i++) {
        const spec = extSpecs[i];
        main.occlusions[spec.side].push(spec.occ);
        segments.push(makeSeg(spec.x, spec.z, spec.w, spec.d, {
          isExtension: true,
          extIndex: i,
          skipWalls: { [spec.skip]: true }
        }));
      }
    }

    return segments;
  }

  function overrideColor(cfg, floor, side, base) {
    let value = base;
    for (const item of cfg.floorOverrides || []) {
      if (item.floor === floor && (item.side === side || item.side === 'all')) value = item.color;
    }
    return value;
  }

  function wallForSide(group, seg, index, side, cfg, r, cutaway, seed, firePlacement = null) {
    if (cutaway && side === 'front') return;
    if (seg.skipWalls && seg.skipWalls[side]) return;

    const floorNum = index + 1;
    const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
    const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
    const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
    const override = overrideColor(cfg, floorNum, side, main);
    const long = side === 'front' || side === 'back';
    const cut = seg.cornerCut || 0;
    const t = cfg.wallThickness;

    const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
    const spanEnd = long
      ? seg.x + seg.w * 0.5 - (side === 'front' ? cut : 0)
      : seg.z + seg.d * 0.5 - (side === 'right' ? cut : 0);
    if (spanEnd - spanStart <= 0.2) return;

    const blocked = [...(seg.occlusions?.[side] || [])];
    const exposedSpans = subtractIntervals(spanStart, spanEnd, blocked);

    for (const [s, e] of exposedSpans) {
      let ws = s;
      let we = e;
      if (!long) {
        if (Math.abs(ws - (seg.z - seg.d * 0.5)) < 0.02 && !seg.skipWalls?.back) ws += t;
        if (Math.abs(we - (seg.z + seg.d * 0.5)) < 0.02 && !seg.skipWalls?.front && (side !== 'right' || cut <= 0.01)) we -= t;
      }
      const len = we - ws;
      if (len <= 0.05) continue;
      const mid = (ws + we) * 0.5;
      const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed, len, cfg.floorHeight);

      if (side === 'front') {
        box(group, mid, y, seg.z + seg.d * 0.5 - t * 0.5, len, cfg.floorHeight, t, mat);
      } else if (side === 'back') {
        box(group, mid, y, seg.z - seg.d * 0.5 + t * 0.5, len, cfg.floorHeight, t, mat);
      } else if (side === 'left') {
        box(group, seg.x - seg.w * 0.5 + t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
      } else if (side === 'right') {
        box(group, seg.x + seg.w * 0.5 - t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
      }
    }

    const trim = solid(cfg.trimColor);

    if (index === 0 && cfg.age > 0.05) {
      const grimeMat = solid(cfg.grimeColor);
      const grimeH = 0.22 + cfg.age * 0.35;
      for (const [s, e] of exposedSpans) {
        const len = e - s;
        const mid = (s + e) * 0.5;
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.015 : seg.z - seg.d * 0.5 - 0.015;
          box(group, mid, grimeH * 0.5, zOut, len, grimeH, 0.03, grimeMat, { cast: false });
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.015 : seg.x + seg.w * 0.5 + 0.015;
          box(group, xOut, grimeH * 0.5, mid, 0.03, grimeH, len, grimeMat, { cast: false });
        }
      }
    }

    if (index === cfg.floors - 1 && (cfg.roofPuddles || cfg.age > 0.45)) {
      const stainMat = solid(cfg.grimeColor);
      const topY = (index + 1) * cfg.floorHeight;
      for (const [s, e] of exposedSpans) {
        const drips = Math.max(1, Math.floor((e - s) / 3.2));
        for (let dIdx = 0; dIdx < drips; dIdx++) {
          const pos = randBetween(r, s + 0.35, e - 0.35);
          const dripH = randBetween(r, 0.45, 1.25);
          const dripW = randBetween(r, 0.25, 0.65);
          if (long) {
            const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.014 : seg.z - seg.d * 0.5 - 0.014;
            box(group, pos, topY - dripH * 0.5 - 0.14, zOut, dripW, dripH, 0.02, stainMat, { cast: false });
          } else {
            const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.014 : seg.x + seg.w * 0.5 + 0.014;
            box(group, xOut, topY - dripH * 0.5 - 0.14, pos, 0.02, dripH, dripW, stainMat, { cast: false });
          }
        }
      }
    }

    if (cfg.damage > 0.15) {
      const spallMat = solid(cfg.secondaryWallColor);
      const darkCore = solid('#322926');
      for (const [s, e] of exposedSpans) {
        if (e - s > 2.2 && r() < cfg.damage * 0.6) {
          const pos = randBetween(r, s + 0.6, e - 0.6);
          const sy = index * cfg.floorHeight + randBetween(r, 0.35, cfg.floorHeight - 0.35);
          const pw = randBetween(r, 0.45, 1.1);
          const ph = randBetween(r, 0.28, 0.62);
          if (long) {
            const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.012 : seg.z - seg.d * 0.5 - 0.012;
            box(group, pos, sy, zOut, pw, ph, 0.025, spallMat, { cast: false });
            box(group, pos, sy, zOut + (side === 'front' ? 0.006 : -0.006), pw * 0.6, ph * 0.55, 0.02, darkCore, { cast: false });
          } else {
            const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.012 : seg.x + seg.w * 0.5 + 0.012;
            box(group, xOut, sy, pos, 0.025, ph, pw, spallMat, { cast: false });
            box(group, xOut + (side === 'left' ? -0.006 : 0.006), sy, pos, 0.02, ph * 0.55, pw * 0.6, darkCore, { cast: false });
          }
        }
      }
    }

    if (cfg.trimAmount > 0.04) {
      const trimH = 0.11 + cfg.trimAmount * 0.11;
      const topTrimH = 0.13 + cfg.trimAmount * 0.16;
      for (const [s, e] of exposedSpans) {
        const len = e - s;
        const mid = (s + e) * 0.5;
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.04 : seg.z - seg.d * 0.5 - 0.04;
          box(group, mid, index * cfg.floorHeight + trimH * 0.5 + 0.005, zOut, len + 0.04, trimH, 0.12, trim);
          if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
            box(group, mid, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, zOut, len + 0.08, topTrimH, 0.18, trim);
          }
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.04 : seg.x + seg.w * 0.5 + 0.04;
          box(group, xOut, index * cfg.floorHeight + trimH * 0.5 + 0.005, mid, 0.12, trimH, len + 0.04, trim);
          if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
            box(group, xOut, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, mid, 0.18, topTrimH, len + 0.08, trim);
          }
        }
      }
    }

    if (index === 0 && side === 'front' && seg.hasEntrance && cfg.groundUse === 'shop') return;
    const windowBlocked = [...blocked];
    if (index === 0 && side === 'front' && seg.hasEntrance) {
      const doorCenter = seg.x - cut * 0.5;
      windowBlocked.push([doorCenter - 1.95, doorCenter + 1.95]);
    }

    const windowSpans = subtractIntervals(spanStart + 0.45, spanEnd - 0.45, windowBlocked);
    const totalLength = long ? seg.w : seg.d;
    const desiredCols = long ? cfg.windowsX : cfg.windowsSide;
    const shutterPad = cfg.shutters ? 0.62 : 0.34;
    const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
    const wy = index * cfg.floorHeight + cfg.floorHeight * 0.51;

    const fireCoordOnFloor = firePlacement && firePlacement.side === side
      ? getFireEscapeWallAnchor(seg, side, firePlacement.coord, firePlacement.deckW).coord
      : null;

    for (const [s, e] of windowSpans) {
      const avail = e - s;
      if (avail < Math.min(0.85, cfg.windowWidth * 0.7)) continue;
      const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
      const maxFit = Math.max(1, Math.floor(avail / (cfg.windowWidth + shutterPad)));
      const windowCount = Math.max(1, Math.min(proportional, maxFit));
      const spacing = avail / windowCount;
      const ww = Math.min(cfg.windowWidth, spacing * (cfg.shutters ? 0.58 : 0.74), avail - 0.16);

      for (let j = 0; j < windowCount; j++) {
        const pos = s + (j + 0.5) * spacing;
        const x = long ? pos : (side === 'left' ? seg.x - seg.w * 0.5 : seg.x + seg.w * 0.5);
        const z = long ? (side === 'front' ? seg.z + seg.d * 0.5 : seg.z - seg.d * 0.5) : pos;

        const hasFireHere = fireCoordOnFloor !== null && Math.abs(pos - fireCoordOnFloor) < firePlacement.deckW * 0.58;
        const forceFirstDamage = cfg.damage >= 0.05 && index === Math.min(1, cfg.floors - 1) && j === 0 && side === 'front';
        const damageMode = pickWindowDamageMode(cfg, r, forceFirstDamage);

        let hasBalcony = false;
        if (!hasFireHere && cfg.balconies > 0 && (index > 0 || cfg.floors === 1)) {
          const guaranteedFront = side === 'front' && index === Math.min(1, cfg.floors - 1) && j === 0;
          const sideChance = side === 'front' ? cfg.balconies * 0.85 : cfg.balconies * 0.72;
          if (guaranteedFront || r() < sideChance) {
            addBalcony(group, side, x, wy, z, ww + 0.75, cfg);
            hasBalcony = true;
          }
        }

        const hasAC = !hasBalcony && !hasFireHere && cfg.acUnits && (index > 0 || cfg.groundUse === 'residential') && (r() < 0.38 || (index === 1 && j === windowCount - 1));
        addWindow(group, side, x, wy, z, cfg, r, ww, wh, {
          maxW: spacing * 0.88,
          damageMode,
          hasAC
        });
      }
    }
  }

  function addSetbackTerrace(group, lowerSeg, upperSeg, y, cfg, r, segIdx = 0, firePlacement = null) {
    const roofMat = solid(cfg.roofColor);
    const trimMat = solid(cfg.trimColor);
    const wallMat = solid(cfg.wallColor);
    const yLift = segIdx * 0.003;
    const slabH = 0.14;
    const slabTopY = y + 0.004 + yLift;
    const slabY = slabTopY - slabH * 0.5;
    const overlap = Math.min(0.08, cfg.wallThickness * 0.45);
    const wallInset = 0.02;

    const lX1 = lowerSeg.x - lowerSeg.w * 0.5;
    const lX2 = lowerSeg.x + lowerSeg.w * 0.5;
    const lZ1 = lowerSeg.z - lowerSeg.d * 0.5;
    const lZ2 = lowerSeg.z + lowerSeg.d * 0.5;
    const lCut = Math.max(0, Math.min(lowerSeg.cornerCut || 0, lowerSeg.w * 0.45, lowerSeg.d * 0.45));

    // Inset outer terrace slab faces by 2cm inside the lower exterior brick walls to prevent coplanar Z-fighting
    const oX1 = lX1 + (lowerSeg.skipWalls?.left ? 0.01 : wallInset);
    const oX2 = lX2 - (lowerSeg.skipWalls?.right ? 0.01 : wallInset);
    const oZ1 = lZ1 + (lowerSeg.skipWalls?.back ? 0.01 : wallInset);
    const oZ2 = lZ2 - (lowerSeg.skipWalls?.front ? 0.01 : wallInset);
    const oCut = lCut > 0.015 ? Math.max(0, lCut - wallInset * 0.5) : 0;

    const uX1 = upperSeg.x - upperSeg.w * 0.5;
    const uX2 = upperSeg.x + upperSeg.w * 0.5;
    const uZ1 = upperSeg.z - upperSeg.d * 0.5;
    const uZ2 = upperSeg.z + upperSeg.d * 0.5;
    const uCutRaw = Math.max(0, Math.min(upperSeg.cornerCut || 0, upperSeg.w * 0.45, upperSeg.d * 0.45));

    const in_uX1 = uX1 + (uX1 > lX1 + 0.04 ? overlap : 0);
    const in_uX2 = uX2 - (uX2 < lX2 - 0.04 ? overlap : 0);
    const in_uZ1 = uZ1 + (uZ1 > lZ1 + 0.04 ? overlap : 0);
    const in_uZ2 = uZ2 - (uZ2 < lZ2 - 0.04 ? overlap : 0);
    const in_uCut = uCutRaw > 0.02 ? Math.max(0, uCutRaw - overlap * 0.5) : 0;

    const hasBack = in_uZ1 - oZ1 > 0.04;
    const hasFront = oZ2 - in_uZ2 > 0.04;
    const hasLeft = in_uX1 - oX1 > 0.04;
    const hasRight = oX2 - in_uX2 > 0.04;

    const zL1 = hasBack ? in_uZ1 : oZ1;
    const zL2 = hasFront ? in_uZ2 : oZ2;

    // 1. Back terrace slab
    if (hasBack && oX2 - oX1 > 0.04) {
      box(group, (oX1 + oX2) * 0.5, slabY, (oZ1 + in_uZ1) * 0.5, oX2 - oX1, slabH, in_uZ1 - oZ1, roofMat);
    }

    // 2. Left terrace slab
    if (hasLeft && zL2 - zL1 > 0.04) {
      box(group, (oX1 + in_uX1) * 0.5, slabY, (zL1 + zL2) * 0.5, in_uX1 - oX1, slabH, zL2 - zL1, roofMat);
    }

    if (oCut <= 0.02 && in_uCut <= 0.02) {
      // Standard rectangular setback terrace (zero corner cut)
      if (hasFront && oX2 - oX1 > 0.04) {
        box(group, (oX1 + oX2) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, oX2 - oX1, slabH, oZ2 - in_uZ2, roofMat);
      }
      if (hasRight && zL2 - zL1 > 0.04) {
        box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zL2) * 0.5, oX2 - in_uX2, slabH, zL2 - zL1, roofMat);
      }
    } else {
      // Setback terrace with diagonal corner chamfer
      const xCorner = Math.min(oX2 - oCut, in_uX2 - in_uCut);
      const zCorner = Math.min(oZ2 - oCut, in_uZ2 - in_uCut);

      // Front slab (left of chamfer zone)
      if (hasFront && xCorner - oX1 > 0.04) {
        box(group, (oX1 + xCorner) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, xCorner - oX1, slabH, oZ2 - in_uZ2, roofMat);
      }

      // Right slab (behind chamfer zone)
      if (hasRight && zCorner - zL1 > 0.04) {
        box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zCorner) * 0.5, oX2 - in_uX2, slabH, zCorner - zL1, roofMat);
      }

      // Diagonal corner terrace polygon connecting front, right, and chamfers
      const pts = [];
      const addPt = (px, pz) => {
        if (!pts.length) { pts.push({ x: px, z: pz }); return; }
        const prev = pts[pts.length - 1];
        if (Math.hypot(px - prev.x, pz - prev.z) > 0.015) pts.push({ x: px, z: pz });
      };

      // Counter-clockwise polygon boundary:
      addPt(in_uX2, zCorner);
      addPt(oX2, zCorner);
      if (oZ2 - oCut > zCorner + 0.015) addPt(oX2, oZ2 - oCut);
      addPt(oX2 - oCut, oZ2);
      if (xCorner < oX2 - oCut - 0.015) addPt(xCorner, oZ2);
      addPt(xCorner, in_uZ2);
      addPt(in_uX2 - in_uCut, in_uZ2);
      addPt(in_uX2, in_uZ2 - in_uCut);

      if (pts.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(pts[0].x, pts[0].z);
        for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k].x, pts[k].z);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: slabH, bevelEnabled: false });
        geo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geo, roofMat);
        mesh.position.set(0, slabTopY, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }

    // Parapets and decorative trim aligned with outer edges and respecting occlusions & fire escape
    const ledgeH = cfg.parapet ? Math.min(0.55, Math.max(0.24, cfg.parapetHeight || 0.4)) : 0.16;
    const ledgeT = Math.max(0.18, Math.min(0.25, cfg.wallThickness));
    const ledgeMat = cfg.parapet ? wallMat : trimMat;
    const py = slabTopY + ledgeH * 0.5;
    const capY = slabTopY + ledgeH + 0.03;

    const getBlockedForSide = (side) => {
      const list = [...(lowerSeg.occlusions?.[side] || [])];
      if (firePlacement && firePlacement.side === side) {
        const fa = getFireEscapeWallAnchor(lowerSeg, side, firePlacement.coord, firePlacement.deckW);
        const ua = getFireEscapeWallAnchor(upperSeg, side, firePlacement.coord, firePlacement.deckW);
        const fMin = Math.min(fa.coord, ua.coord, firePlacement.coord) - firePlacement.deckW * 0.54;
        const fMax = Math.max(fa.coord, ua.coord, firePlacement.coord) + firePlacement.deckW * 0.54;
        list.push([fMin, fMax]);
      }
      return list;
    };

    const hasBackParapet = hasBack && !lowerSeg.skipWalls?.back;
    const hasFrontParapet = hasFront && !lowerSeg.skipWalls?.front;

    if (hasBackParapet) {
      const spans = subtractIntervals(lX1, lX2, getBlockedForSide('back'));
      for (const [s, e] of spans) {
        box(group, (s + e) * 0.5, py, lZ1 + ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
        if (cfg.trimAmount > 0.15) {
          box(group, (s + e) * 0.5, capY, lZ1 + ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
        }
      }
    }
    if (hasFrontParapet) {
      const fEnd = lCut > 0.015 ? lX2 - lCut : lX2;
      const spans = subtractIntervals(lX1, fEnd, getBlockedForSide('front'));
      for (const [s, e] of spans) {
        box(group, (s + e) * 0.5, py, lZ2 - ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
        if (cfg.trimAmount > 0.15) {
          box(group, (s + e) * 0.5, capY, lZ2 - ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
        }
      }
    }
    if (hasLeft && !lowerSeg.skipWalls?.left) {
      const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
      const zEnd = lZ2 - (hasFrontParapet ? ledgeT : 0);
      const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('left'));
      for (const [s, e] of spans) {
        box(group, lX1 + ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
        if (cfg.trimAmount > 0.15) {
          box(group, lX1 + ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
        }
      }
    }
    if (hasRight && !lowerSeg.skipWalls?.right) {
      const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
      const zEnd = lCut > 0.015 ? lZ2 - lCut : lZ2 - (hasFrontParapet ? ledgeT : 0);
      const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('right'));
      for (const [s, e] of spans) {
        box(group, lX2 - ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
        if (cfg.trimAmount > 0.15) {
          box(group, lX2 - ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
        }
      }
    }

    if (lCut > 0.015 && (hasFront || hasRight)) {
      const cx = lowerSeg.x + lowerSeg.w * 0.5 - lCut * 0.5;
      const cz = lowerSeg.z + lowerSeg.d * 0.5 - lCut * 0.5;
      const diagLen = lCut * Math.SQRT2;
      const wedge = worldRoot(group, cx, slabTopY, cz);
      wedge.rotation.y = Math.PI / 4;
      box(wedge, 0, ledgeH * 0.5, -ledgeT * 0.5, diagLen + ledgeT * 0.2, ledgeH, ledgeT, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(wedge, 0, ledgeH + 0.03, -ledgeT * 0.5, diagLen + ledgeT * 0.3, 0.06, ledgeT + 0.04, trimMat);
      }
    }

    const frontD = oZ2 - in_uZ2;
    if (frontD > 0.65 && (cfg.tarPatches || cfg.roofPuddles || cfg.age > 0.45)) {
      const weathW = Math.max(1, (oX2 - oCut) - oX1 - 0.6);
      addSurfaceWeathering(group, (oX1 + (oX2 - oCut)) * 0.5, slabTopY, in_uZ2 + frontD * 0.5, weathW, frontD - 0.35, cfg, r);
    }
  }

  function addSurfaceWeathering(group, cx, surfaceY, cz, spanW, spanD, cfg, r) {
    if (spanW < 0.8 || spanD < 0.45) return;

    if (cfg.tarPatches || cfg.damage > 0.25 || cfg.age > 0.55) {
      const tarMat = solid('#1b1e20');
      const seamMat = solid('#282c2f');
      const metalPatchMat = solid('#6b6358');
      const count = Math.max(2, Math.ceil((spanW * spanD) / 18) + (cfg.tarPatches ? 3 : 0));
      for (let i = 0; i < count; i++) {
        const pw = randBetween(r, 0.55, Math.min(2.4, spanW * 0.45));
        const pd = randBetween(r, 0.38, Math.min(1.9, spanD * 0.45));
        const px = cx + randBetween(r, -spanW * 0.45 + pw * 0.5, spanW * 0.45 - pw * 0.5);
        const pz = cz + randBetween(r, -spanD * 0.45 + pd * 0.5, spanD * 0.45 - pd * 0.5);
        const patch = box(group, px, surfaceY + 0.008 + i * 0.001, pz, pw, 0.014, pd, i % 3 === 0 && cfg.damage > 0.15 ? metalPatchMat : (i % 2 === 0 ? tarMat : seamMat), { cast: false });
        if (patch) patch.rotation.y = randBetween(r, -0.35, 0.35);
      }
    }

    if (cfg.roofPuddles || cfg.age > 0.5) {
      const stainMat = solid(cfg.grimeColor);
      const waterMat = puddleMaterial();
      const puddleCount = Math.max(1, Math.min(4, Math.ceil((spanW * spanD) / 28) + (cfg.roofPuddles ? 2 : 0)));
      for (let i = 0; i < puddleCount; i++) {
        const rad = randBetween(r, 0.35, Math.min(1.35, Math.min(spanW, spanD) * 0.32));
        const px = cx + randBetween(r, -spanW * 0.42 + rad, spanW * 0.42 - rad);
        const pz = cz + randBetween(r, -spanD * 0.42 + rad, spanD * 0.42 - rad);
        const scaleZ = randBetween(r, 0.65, 1.25);

        const stain = cylinder(group, px, surfaceY + 0.006 + i * 0.001, pz, rad * 1.28, rad * 1.28, 0.008, stainMat, 14);
        stain.scale.z = scaleZ;
        stain.castShadow = false;

        const water = cylinder(group, px, surfaceY + 0.012 + i * 0.001, pz, rad, rad, 0.01, waterMat, 14);
        water.scale.z = scaleZ;
        water.castShadow = false;
      }
    }
  }

  function addCornerChamfer(group, seg, index, cfg, r, cutaway, seed) {
    const cut = seg.cornerCut || 0;
    if (cut <= 0.05 || cutaway) return;

    const floorNum = index + 1;
    const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
    const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
    const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
    const override = overrideColor(cfg, floorNum, 'front', main);
    const diagLen = cut * Math.SQRT2;
    const t = cfg.wallThickness;
    const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed + 503, diagLen, cfg.floorHeight);

    const cx = seg.x + seg.w * 0.5 - cut * 0.5;
    const cz = seg.z + seg.d * 0.5 - cut * 0.5;
    const wedge = worldRoot(group, cx, 0, cz);
    wedge.rotation.y = Math.PI / 4;

    box(wedge, 0, y, -t * 0.5, diagLen + t * 0.5, cfg.floorHeight, t, mat);

    if (cfg.trimAmount > 0.04) {
      const trimH = 0.11 + cfg.trimAmount * 0.11;
      box(wedge, 0, index * cfg.floorHeight + trimH * 0.5 + 0.005, 0.04, diagLen + 0.12, trimH, 0.14, solid(cfg.trimColor));
      if (index === cfg.floors - 1 && cfg.trimAmount > 0.2) {
        box(wedge, 0, (index + 1) * cfg.floorHeight - 0.13, 0.1, diagLen + 0.28, 0.24, 0.3, solid(cfg.trimColor));
      }
    }

    if (index === 0 && cfg.groundUse === 'shop') {
      addDoor(group, 'corner', cx, 0, cz, cfg, false);
    } else if (diagLen >= 1.05) {
      const ww = Math.min(cfg.windowWidth, diagLen * 0.62);
      const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
      const damageMode = pickWindowDamageMode(cfg, r, false);
      addWindow(group, 'corner', cx, index * cfg.floorHeight + cfg.floorHeight * 0.51, cz, cfg, r, ww, wh, {
        maxW: diagLen * 0.7,
        noShutters: true,
        damageMode
      });
    }
  }

  function addVerticalDetails(group, seg, sectionHeight, cfg) {
    if (cfg.facadeAccent === 'none' || cfg.trimAmount <= 0.02) return;
    const trim = solid(cfg.trimColor);
    const cut = seg.cornerCut || 0;
    const usableH = sectionHeight - 0.18;

    for (const side of ['front', 'back', 'left', 'right']) {
      if (seg.skipWalls?.[side]) continue;
      const long = side === 'front' || side === 'back';
      const sideCut = (side === 'front' || side === 'right') ? cut : 0;
      const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
      const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut;
      const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
      if (!exposed.length) continue;

      if (cfg.facadeAccent === 'vertical' && (side === 'front' || side === 'left' || side === 'right')) {
        const spanLen = spanEnd - spanStart;
        const col = Math.max(2, Math.floor(spanLen / 3.2));
        for (let i = 0; i <= col; i++) {
          const p = spanStart + (spanLen * i) / col;
          if (exposed.some(([s, e]) => p >= s - 0.05 && p <= e + 0.05)) {
            if (long) {
              const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.025 : seg.z - seg.d * 0.5 - 0.025;
              box(group, p, usableH * 0.5, zOut, 0.15, usableH, 0.06, trim);
            } else {
              const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.025 : seg.x + seg.w * 0.5 + 0.025;
              box(group, xOut, usableH * 0.5, p, 0.06, usableH, 0.15, trim);
            }
          }
        }
      } else if (cfg.facadeAccent === 'ornate' && side === 'front') {
        for (const px of [spanStart + 0.32, spanEnd - 0.32]) {
          if (exposed.some(([s, e]) => px >= s - 0.1 && px <= e + 0.1)) {
            box(group, px, usableH * 0.5, seg.z + seg.d * 0.5 + 0.08, 0.3, usableH, 0.16, trim);
          }
        }
      }

      if (cfg.trimAmount > 0.2) {
        const depth = cfg.facadeAccent === 'cornice' ? 0.34 : 0.22;
        const corniceH = 0.22 + cfg.trimAmount * 0.16;
        const corniceY = sectionHeight - corniceH * 0.5 - 0.14;
        for (const [s, e] of exposed) {
          const len = e - s;
          const mid = (s + e) * 0.5;
          if (long) {
            const zOut = side === 'front' ? seg.z + seg.d * 0.5 + depth * 0.42 : seg.z - seg.d * 0.5 - depth * 0.42;
            box(group, mid, corniceY, zOut, len + 0.18, corniceH, depth, trim);
          } else {
            const xOut = side === 'left' ? seg.x - seg.w * 0.5 - depth * 0.42 : seg.x + seg.w * 0.5 + depth * 0.42;
            box(group, xOut, corniceY, mid, depth, corniceH, len + 0.18, trim);
          }
        }
      }
    }
  }

  function addInteriors(group, seg, index, cfg) {
    const inspectActive = cfg.cutaway || (cfg.inspectedFloor > 0 && cfg.inspectedFloor <= cfg.floors);
    if (cfg.interiorMode === 'none' && !inspectActive) return;

    const baseY = index * cfg.floorHeight;
    const tWall = cfg.wallThickness;
    const floorMat = solid(index % 2 ? '#746d60' : '#8c7d68');
    const yMicro = (seg.extIndex >= 0 ? (seg.extIndex + 1) : 0) * 0.002;
    slabBox(group, seg, baseY + 0.08 + yMicro, 0.15, tWall * 0.95, floorMat);

    const h = cfg.floorHeight * 0.82;
    const t = 0.09;
    const wall = solid('#c8c0ac');
    const innerW = seg.w - tWall * 2 - 0.12;
    const innerD = seg.d - tWall * 2 - 0.12;
    if (innerW <= 1.5 || innerD <= 1.5) return;

    const hasStairBay = seg.isMain && cfg.stairwell && innerW >= 4.2 && innerD >= 3.2;
    const stairBayW = hasStairBay ? Math.min(2.6, innerW * 0.32) : 0;
    const roomStartX = seg.x - innerW * 0.5 + stairBayW;
    const roomSpanW = innerW - stairBayW;

    if (cfg.interiorMode === 'apartments' && roomSpanW >= 2.2) {
      const rooms = clamp(cfg.roomsPerFloor, 1, Math.max(1, Math.floor(roomSpanW / 1.6)));
      box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW, h, t, wall);
      if (hasStairBay) {
        box(group, roomStartX, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.22, t, h, innerD * 0.52, wall);
      }
      for (let i = 1; i < rooms; i++) {
        const xx = roomStartX + (roomSpanW * i) / rooms;
        box(group, xx, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.25, t, h, innerD * 0.48, wall);
        box(group, xx, baseY + h * 0.5 + 0.16, seg.z + innerD * 0.25, t, h, innerD * 0.48, wall);
      }
      for (let i = 0; i < Math.min(rooms * 2, 12); i++) {
        const xx = roomStartX + (i % rooms + 0.5) * (roomSpanW / rooms);
        const zz = seg.z + (i < rooms ? -0.26 : 0.26) * innerD;
        box(group, xx, baseY + 0.3, zz, Math.min(0.64, (roomSpanW / rooms) * 0.5), 0.28, 0.8, solid(i % 3 === 0 ? '#8e5855' : '#576b79'));
      }
    } else if (cfg.interiorMode === 'basic' && roomSpanW >= 2.0) {
      box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW - 0.3, h, t, wall);
      box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.24, t, h, innerD * 0.44, wall);
    }

    if (hasStairBay) {
      const stairMat = solid('#77766d');
      const railMat = solid('#454a4d');
      const bayCenterX = seg.x - innerW * 0.5 + stairBayW * 0.5;
      const bayZ = seg.z - innerD * 0.24;
      const runW = Math.max(1.2, stairBayW - 0.55);
      const halfH = cfg.floorHeight * 0.5;
      const midY = baseY + halfH;

      box(group, seg.x - innerW * 0.5 + 0.32, midY, bayZ, 0.62, 0.12, 1.45, stairMat);

      const stepsPerFlight = 6;
      const stepW = runW / stepsPerFlight;
      for (let i = 0; i < stepsPerFlight; i++) {
        const tFrac = (i + 0.5) / stepsPerFlight;
        const x1 = bayCenterX + runW * 0.45 - tFrac * runW;
        const y1 = baseY + 0.16 + ((i + 1) / stepsPerFlight) * (halfH - 0.16);
        box(group, x1, y1, bayZ - 0.34, stepW + 0.04, 0.11, 0.62, stairMat);

        const x2 = bayCenterX - runW * 0.45 + tFrac * runW;
        const y2 = midY + ((i + 1) / stepsPerFlight) * halfH;
        box(group, x2, y2, bayZ + 0.34, stepW + 0.04, 0.11, 0.62, stairMat);
      }

      const topLandingY = baseY + cfg.floorHeight - 0.08;
      const topRailEndY = (index === cfg.floors - 1 || (cfg.setback > 0 && index + 1 >= Math.floor(cfg.floors * 0.6)))
        ? baseY + cfg.floorHeight - 0.1
        : baseY + cfg.floorHeight + 0.7;
      line(group, [bayCenterX + runW * 0.45, baseY + 0.16, bayZ - 0.34], [bayCenterX - runW * 0.45, midY, bayZ - 0.34], 0.05, stairMat);
      line(group, [bayCenterX - runW * 0.45, midY, bayZ + 0.34], [bayCenterX + runW * 0.45, topLandingY, bayZ + 0.34], 0.05, stairMat);
      line(group, [bayCenterX + runW * 0.45, baseY + 0.85, bayZ], [bayCenterX - runW * 0.45, midY + 0.7, bayZ], 0.03, railMat);
      line(group, [bayCenterX - runW * 0.45, midY + 0.7, bayZ], [bayCenterX + runW * 0.45, topRailEndY, bayZ], 0.03, railMat);
    }

    if (seg.isMain && cfg.elevator && innerW >= 3.5) {
      const cut = seg.cornerCut || 0;
      const elevH = cfg.floorHeight - 0.12;
      const x = seg.x + innerW * 0.5 - cut - 0.72;
      const z = seg.z - innerD * 0.5 + 0.72;
      box(group, x, baseY + elevH * 0.5 + 0.04, z, 1.24, elevH, 1.2, solid('#8b9194'));
      box(group, x, baseY + cfg.floorHeight * 0.42, z + 0.62, 0.9, Math.min(2.1, cfg.floorHeight * 0.68), 0.06, glassMaterial('#28383d'));
    }
  }

  function addVines(group, seg, totalHeight, cfg, r) {
    if (cfg.overgrowth <= 0) return;
    const ivy = solid('#415f37');
    const cut = seg.cornerCut || 0;
    const sides = ['front', 'left', 'right', 'back'];

    for (const side of sides) {
      if (seg.skipWalls?.[side]) continue;
      const long = side === 'front' || side === 'back';
      const sideCut = (side === 'front' || side === 'right') ? cut : 0;
      const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.3;
      const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut - 0.3;
      const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
      if (!exposed.length) continue;

      const clusters = Math.max(1, Math.ceil(cfg.overgrowth * (side === 'front' ? 16 : 9)));
      for (let i = 0; i < clusters; i++) {
        const span = pick(r, exposed);
        const pos = randBetween(r, span[0], span[1]);
        const pos2 = clamp(pos + randBetween(r, -0.55, 0.55), span[0], span[1]);
        const y = randBetween(r, 0.4, totalHeight * 0.88);
        const y2 = Math.min(totalHeight - 0.2, y + randBetween(r, 0.4, 1.5));

        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.06 : seg.z - seg.d * 0.5 - 0.06;
          line(group, [pos, y, zOut], [pos2, y2, zOut], 0.028, ivy);
          for (let j = 0; j < 3; j++) {
            const leaf = new THREE.Mesh(
              new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
              solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
            );
            leaf.position.set(clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]), y + j * 0.25, zOut + (side === 'front' ? 0.04 : -0.04));
            group.add(leaf);
          }
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.06 : seg.x + seg.w * 0.5 + 0.06;
          line(group, [xOut, y, pos], [xOut, y2, pos2], 0.028, ivy);
          for (let j = 0; j < 3; j++) {
            const leaf = new THREE.Mesh(
              new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
              solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
            );
            leaf.position.set(xOut + (side === 'left' ? -0.04 : 0.04), y + j * 0.25, clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]));
            group.add(leaf);
          }
        }
      }
    }
  }

  function addRoof(group, seg, y, cfg, r, segIdx = 0) {
    const roof = solid(cfg.roofColor);
    const trim = solid(cfg.trimColor);
    const wallMat = solid(cfg.wallColor);
    const cut = seg.cornerCut || 0;
    const yLift = segIdx * 0.003;

    slabBox(group, seg, y - 0.07 + yLift, 0.14, 0.01, roof);

    let deckTopY = y + yLift;
    const pitchedW = seg.w - cut;
    const pitchedX = seg.x - cut * 0.5;
    const ridgeH = Math.min(2.6, Math.max(1.4, Math.min(pitchedW, seg.d) * 0.26));

    if (cfg.roofType === 'pitched') {
      const overW = pitchedW + 0.24;
      const overD = seg.d + (seg.skipWalls?.back ? -0.04 : 0.24);
      const shape = new THREE.Shape();
      shape.moveTo(-overW * 0.5, 0);
      shape.lineTo(0, ridgeH);
      shape.lineTo(overW * 0.5, 0);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: overD, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, roof);
      mesh.position.set(pitchedX, y + yLift, seg.z - overD * 0.5);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      if (cfg.tarPatches || cfg.damage > 0.3) {
        const slopeAngle = Math.atan2(ridgeH, overW * 0.5);
        for (const s of [-1, 1]) {
          const patch = box(group, pitchedX + s * (pitchedW * 0.24), y + ridgeH * 0.48, seg.z + randBetween(r, -seg.d * 0.22, seg.d * 0.22), pitchedW * 0.22, 0.04, seg.d * 0.28, solid(s < 0 ? '#1d2022' : '#6c6256'));
          if (patch) patch.rotation.z = -s * slopeAngle;
        }
      }
    } else if (cfg.roofType === 'mansard') {
      slabBox(group, seg, y + 0.28 + yLift, 0.56, seg.w * 0.05, roof);
      slabBox(group, seg, y + 0.70 + yLift, 0.28, seg.w * 0.12, solid(cfg.secondaryWallColor));
      deckTopY = y + 0.84 + yLift;
    } else if (cfg.roofType === 'stepped') {
      slabBox(group, seg, y + 0.22 + yLift, 0.44, seg.w * 0.06, wallMat);
      slabBox(group, seg, y + 0.57 + yLift, 0.26, seg.w * 0.16, trim);
      deckTopY = y + 0.7 + yLift;
    }

    if (cfg.roofType !== 'pitched') {
      const insetFactor = cfg.roofType === 'flat' ? 0.82 : 0.62;
      addSurfaceWeathering(group, seg.x - cut * 0.35, deckTopY, seg.z, (seg.w - cut) * insetFactor, seg.d * insetFactor, cfg, r);
    }

    if (cfg.skylights && seg.w >= 4.5 && seg.d >= 4.5) {
      if (cfg.roofType === 'pitched') {
        const slopeAngle = Math.atan2(ridgeH, pitchedW * 0.5);
        for (const s of [-1, 1]) {
          const sx = pitchedX + s * (pitchedW * 0.22);
          const sy = y + ridgeH * 0.52;
          const sky = box(group, sx, sy, seg.z, pitchedW * 0.22, 0.12, seg.d * 0.32, glassMaterial('#577d90', cfg.windowLighting > 0.3));
          if (sky) sky.rotation.z = -s * slopeAngle;
        }
      } else {
        const insetScale = cfg.roofType === 'flat' ? 1 : 0.72;
        for (const s of [-1, 1]) {
          const sx = seg.x - cut * 0.25 + s * (seg.w - cut) * 0.18 * insetScale;
          box(group, sx, deckTopY + 0.05, seg.z, seg.w * 0.19 * insetScale, 0.1, seg.d * 0.22 * insetScale, trim);
          const sky = box(group, sx, deckTopY + 0.14, seg.z, seg.w * 0.18 * insetScale, 0.14, seg.d * 0.2 * insetScale, glassMaterial('#577d90', cfg.windowLighting > 0.3));
          if (sky) sky.rotation.x = -0.08;
        }
      }
    }

    if (cfg.parapet) {
      const ph = cfg.parapetHeight;
      const pt = Math.max(0.2, cfg.wallThickness);
      const frontExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5 - cut, seg.occlusions?.front || []);
      const backExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5, seg.occlusions?.back || []);
      const leftExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5, seg.occlusions?.left || []);
      const rightExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5 - cut, seg.occlusions?.right || []);

      if (!seg.skipWalls?.front && cfg.roofType !== 'pitched') {
        for (const [s, e] of frontExposed) {
          box(group, (s + e) * 0.5, y + ph * 0.5, seg.z + seg.d * 0.5 - pt * 0.5, e - s + 0.04, ph, pt, wallMat);
          if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z + seg.d * 0.5 - pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
        }
      }
      if (!seg.skipWalls?.back && cfg.roofType !== 'pitched') {
        for (const [s, e] of backExposed) {
          box(group, (s + e) * 0.5, y + ph * 0.5, seg.z - seg.d * 0.5 + pt * 0.5, e - s + 0.04, ph, pt, wallMat);
          if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z - seg.d * 0.5 + pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
        }
      }
      if (!seg.skipWalls?.left) {
        for (const [s, e] of leftExposed) {
          box(group, seg.x - seg.w * 0.5 + pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
        }
      }
      if (!seg.skipWalls?.right) {
        for (const [s, e] of rightExposed) {
          box(group, seg.x + seg.w * 0.5 - pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
        }
      }
      if (cut > 0.05) {
        const cx = seg.x + seg.w * 0.5 - cut * 0.5;
        const cz = seg.z + seg.d * 0.5 - cut * 0.5;
        const wedge = worldRoot(group, cx, y, cz);
        wedge.rotation.y = Math.PI / 4;
        box(wedge, 0, ph * 0.5, -pt * 0.5, cut * Math.SQRT2 + pt * 0.4, ph, pt, wallMat);
      }
    }
  }

  function addRooftopProps(group, topSegments, groundMain, cfg, r, baseHeight) {
    if (!topSegments.length) return;
    const roof = solid('#697277');
    const roofDark = solid('#363d40');
    const metal = solid('#858d8e');
    const pipeMat = solid('#5b6468');
    const cableMat = solid('#1d2225');
    const mainSeg = topSegments[0];
    const cut = mainSeg.cornerCut || 0;
    const isPitched = cfg.roofType === 'pitched';
    const pitchedW = mainSeg.w - cut;
    const ridgeH = isPitched ? Math.min(2.6, Math.max(1.4, Math.min(pitchedW, mainSeg.d) * 0.26)) : 0;
    const roofLift = cfg.roofType === 'mansard' ? 0.84 : cfg.roofType === 'stepped' ? 0.7 : (isPitched ? ridgeH * 0.55 : 0);
    const height = baseHeight + roofLift;

    const insetMargin = (cfg.roofType === 'mansard' || cfg.roofType === 'stepped') ? 1.8 : 1.4;
    const safeBounds = (seg, margin) => ({
      minX: seg.x - seg.w * 0.5 + margin,
      maxX: seg.x + seg.w * 0.5 - (seg.cornerCut || 0) - margin,
      minZ: seg.z - seg.d * 0.5 + margin,
      maxZ: seg.z + seg.d * 0.5 - (seg.cornerCut || 0) - margin
    });

    const b0 = safeBounds(mainSeg, insetMargin);
    const cableAnchors = [];

    if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
      const x = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
      const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
      const legBaseH = isPitched ? 2.4 : 1.8;
      for (const dx of [-0.66, 0.66]) {
        for (const dz of [-0.66, 0.66]) {
          box(group, x + dx, height + 0.58, z + dz, 0.12, legBaseH, 0.12, roofDark);
        }
      }
      cylinder(group, x, height + 2.22, z, 1.15, 1.12, 1.35, solid('#655449'), 10);
      cylinder(group, x, height + 2.98, z, 1.22, 1.0, 0.25, roofDark, 10);
      for (let i = 0; i < 3; i++) {
        cylinder(group, x, height + 1.8 + i * 0.4, z, 1.16, 1.16, 0.07, metal, 10);
      }
      cableAnchors.push([x, height + 2.5, z]);
    }

    for (let i = 0; i < cfg.chimneys; i++) {
      const seg = pick(r, topSegments);
      const b = safeBounds(seg, 0.9);
      if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
      const x = randBetween(r, b.minX, b.maxX);
      const z = randBetween(r, b.minZ, b.maxZ);
      const chimH = isPitched ? 2.2 : 1.4;
      box(group, x, baseHeight + chimH * 0.5, z, 0.62, chimH, 0.55, solid('#676663'));
      box(group, x, baseHeight + chimH + 0.07, z, 0.81, 0.15, 0.74, roofDark);
      cableAnchors.push([x, baseHeight + chimH * 0.85, z]);
    }

    const hvacPositions = [];
    const units = Math.round(cfg.rooftopProps * 8);
    for (let i = 0; i < units; i++) {
      const seg = pick(r, topSegments);
      const b = safeBounds(seg, insetMargin);
      if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
      const x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
      const z = randBetween(r, b.minZ, b.maxZ);
      const propBaseY = isPitched ? baseHeight + ridgeH - 0.15 : height;
      if (r() < 0.67) {
        const uw = randBetween(r, 0.7, 1.4);
        const ud = randBetween(r, 0.7, 1.2);
        box(group, x, propBaseY + 0.4, z, uw, 0.8, ud, roof);
        for (let j = 0; j < 3; j++) {
          box(group, x + (j - 1) * (uw * 0.24), propBaseY + 0.4, z + ud * 0.5 + 0.02, 0.08, 0.42, 0.04, roofDark);
        }
        hvacPositions.push([x, propBaseY, z]);
        cableAnchors.push([x, propBaseY + 0.76, z]);
      } else {
        cylinder(group, x, propBaseY + 0.13, z, 0.45, 0.45, 0.26, metal, 8);
        cylinder(group, x, propBaseY + 0.38, z, 0.18, 0.18, 0.32, roofDark, 8);
      }
    }

    if (cfg.antennas && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
      const x = isPitched ? mainSeg.x - cut * 0.5 : clamp(mainSeg.x - mainSeg.w * 0.28, b0.minX, b0.maxX);
      const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
      const antBaseY = isPitched ? baseHeight + ridgeH : height;
      line(group, [x, antBaseY, z], [x, antBaseY + 3, z], 0.055, roof);
      line(group, [x - 0.8, antBaseY + 2.15, z], [x + 0.8, antBaseY + 2.15, z], 0.045, metal);
      line(group, [x - 0.43, antBaseY + 2.55, z], [x + 0.43, antBaseY + 2.55, z], 0.045, metal);
      cableAnchors.push([x, antBaseY + 2.1, z]);
    }

    if (cfg.rooftopPipes) {
      const pipeY = height + 0.09;
      if (!isPitched && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
        const backRunZ = mainSeg.z - mainSeg.d * 0.5 + 0.42;
        const leftRunX = mainSeg.x - mainSeg.w * 0.5 + 0.42;
        const rightRunX = mainSeg.x + mainSeg.w * 0.5 - cut - 0.42;

        line(group, [leftRunX, pipeY, backRunZ], [rightRunX, pipeY, backRunZ], 0.055, pipeMat);
        line(group, [leftRunX, pipeY, backRunZ], [leftRunX, pipeY, mainSeg.z + mainSeg.d * 0.32], 0.05, pipeMat);
        if (cfg.parapet) {
          line(group, [leftRunX, pipeY, backRunZ], [leftRunX, baseHeight + cfg.parapetHeight + 0.12, backRunZ], 0.05, pipeMat);
        }

        for (let i = 0; i < Math.min(3, hvacPositions.length); i++) {
          const [hx, , hz] = hvacPositions[i];
          line(group, [hx, pipeY, hz], [hx, pipeY, backRunZ], 0.04, metal);
        }

        const postA = [leftRunX + 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, mainSeg.z + mainSeg.d * 0.38];
        const postB = [rightRunX - 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, backRunZ + 0.15];
        line(group, [postA[0], height, postA[2]], postA, 0.04, roofDark);
        line(group, [postB[0], height, postB[2]], postB, 0.04, roofDark);
        cableAnchors.push(postA, postB);
      }

      for (let i = 0; i < cableAnchors.length - 1; i++) {
        sagCable(group, cableAnchors[i], cableAnchors[i + 1], randBetween(r, 0.22, 0.48), 0.018, cableMat, 6);
      }

      if (groundMain && !cfg.cutaway) {
        const mainH = cfg.setback > 0 ? Math.floor(cfg.floors * 0.6) * cfg.floorHeight : baseHeight;
        const spoutX = groundMain.x - groundMain.w * 0.5 + 0.32;
        const spoutZ = groundMain.z - groundMain.d * 0.5 - 0.06;
        line(group, [spoutX, 0.1, spoutZ], [spoutX, mainH - 0.1, spoutZ], 0.048, pipeMat);
        const sideSpoutX = groundMain.x - groundMain.w * 0.5 - 0.06;
        const sideSpoutZ = groundMain.z + groundMain.d * 0.32;
        line(group, [sideSpoutX, 0.1, sideSpoutZ], [sideSpoutX, mainH - 0.1, sideSpoutZ], 0.045, pipeMat);
        box(group, sideSpoutX - 0.04, 1.35, sideSpoutZ - 0.45, 0.12, 0.42, 0.32, roofDark);
        line(group, [sideSpoutX, 1.56, sideSpoutZ - 0.45], [sideSpoutX, mainH * 0.65, sideSpoutZ - 0.45], 0.025, metal);
      }
    }
  }

  function createBuilding(cfg, options = {}) {
    const root = new THREE.Group();
    root.name = 'B Building ' + getStyle(cfg.style).label;
    const r = rng32((cfg.seed + (options.seedOffset || 0) * 9119) >>> 0);
    const count = cfg.floors;
    const fh = cfg.floorHeight;
    const cutaway = !!cfg.cutaway;
    const selectedFloor = clamp(cfg.inspectedFloor || 0, 0, count);
    const visibleFloors = selectedFloor > 0 ? selectedFloor : count;
    const roofOn = !cutaway && selectedFloor === 0;

    const groundSegments = segmentsForFloor(cfg, 0);
    const primary = groundSegments[0];
    const firePlacement = chooseFireEscapePlacement(groundSegments, cfg, rng32(cfg.seed + 313));

    for (let floor = 0; floor < visibleFloors; floor++) {
      const segments = segmentsForFloor(cfg, floor);
      const nextSegments = floor < visibleFloors - 1 ? segmentsForFloor(cfg, floor + 1) : null;
      const hasFireExtOnFloor = firePlacement && firePlacement.extIndex >= 0
        && segments.some((s) => s.isExtension && s.extIndex === firePlacement.extIndex);

      for (let j = 0; j < segments.length; j++) {
        const seg = segments[j];
        const isFireTarget = firePlacement && (
          hasFireExtOnFloor
            ? (seg.isExtension && seg.extIndex === firePlacement.extIndex)
            : (j === 0)
        );
        const segFire = isFireTarget ? firePlacement : null;
        for (const side of ['front', 'back', 'left', 'right']) {
          wallForSide(root, seg, floor, side, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17, segFire);
        }
        addCornerChamfer(root, seg, floor, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17);
        addInteriors(root, seg, floor, cfg);

        if (floor === 0) {
          slabBox(root, seg, -0.08 - j * 0.002, 0.15, 0.01, solid('#716f67'));
        }
        if (floor === visibleFloors - 1 && selectedFloor === 0 && cfg.interiorMode !== 'none') {
          slabBox(root, seg, (floor + 1) * fh - 0.08 - j * 0.002, 0.12, cfg.wallThickness * 0.8, solid('#817b6d'));
        }

        if (nextSegments && !cutaway) {
          if (seg.isExtension) {
            const hasAbove = nextSegments.some((ns) => ns.isExtension && ns.extIndex === seg.extIndex);
            if (!hasAbove) {
              const roofSeg = segFire
                ? {
                    ...seg,
                    occlusions: {
                      ...seg.occlusions,
                      [segFire.side]: [
                        ...(seg.occlusions?.[segFire.side] || []),
                        [segFire.coord - segFire.deckW * 0.54, segFire.coord + segFire.deckW * 0.54]
                      ]
                    }
                  }
                : seg;
              addRoof(root, roofSeg, (floor + 1) * fh, { ...cfg, roofType: 'flat', skylights: false, parapetHeight: Math.min(0.32, cfg.parapetHeight) }, r, j + 1);
            }
          } else if (nextSegments[j] && (nextSegments[j].w < seg.w - 0.05 || nextSegments[j].d < seg.d - 0.05)) {
            addSetbackTerrace(root, seg, nextSegments[j], (floor + 1) * fh, cfg, r, j, j === 0 ? firePlacement : segFire);
          }
        }
      }
    }

    if (!cutaway) {
      addEntrance(root, primary, cfg, r);
    }
    if (firePlacement) {
      addFireEscape(root, primary, firePlacement, cfg);
    }

    if (roofOn) {
      const topSegments = segmentsForFloor(cfg, count - 1).filter((s) => !s.isExtension);
      for (let j = 0; j < topSegments.length; j++) {
        addRoof(root, topSegments[j], count * fh, cfg, r, j);
      }
      addRooftopProps(root, topSegments, primary, cfg, r, count * fh);
    }

    if (!cutaway) {
      const setbackFloor = Math.floor(count * 0.6);
      const mainH = cfg.setback > 0 && setbackFloor > 0 ? setbackFloor * fh : count * fh;
      for (const seg of groundSegments.filter((s) => !s.isExtension)) {
        addVerticalDetails(root, seg, mainH, cfg);
        addVines(root, seg, mainH, cfg, r);
      }
    }

    root.userData = { preset: cfg.style, seed: cfg.seed, floors: cfg.floors, settings: copy(cfg) };
    return root;
  }

  /* --- Scene, lighting, environment, and preview modes --- */
  function addStreetlamp(parent, x, z) {
    const metal = solid('#41464a');
    cylinder(parent, x, 2.2, z, 0.1, 0.15, 4.4, metal, 7);
    line(parent, [x, 4.3, z], [x + 0.75, 4.3, z], 0.085, metal);
    const lamp = solid(view.lighting === 'night' ? '#fff2c4' : '#dde7db');
    box(parent, x + 0.75, 4.15, z, 0.36, 0.22, 0.44, lamp);
    if (view.lighting === 'night') {
      const light = new THREE.PointLight('#ffe0ab', 0.5, 8, 2);
      light.position.set(x + 0.75, 4.05, z);
      parent.add(light);
    }
  }

  function cityRoad(parent, central = false) {
    const roadway = solid('#343d43');
    const sidewalk = solid('#777b78');
    const white = solid('#d2cc9f');
    const roadZ = central ? 0 : Math.max(13, state.depth * 0.5 + 8);
    box(parent, 0, -0.21, roadZ, 210, 0.26, 12, roadway, { cast: false });
    box(parent, 0, -0.16, roadZ - 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
    box(parent, 0, -0.16, roadZ + 7.55, 210, 0.22, 3.0, sidewalk, { cast: false });
    for (let x = -100; x < 105; x += 9) box(parent, x, -0.062, roadZ, 4, 0.015, 0.18, white, { cast: false });
    for (let x = -65; x <= 65; x += 27) {
      addStreetlamp(parent, x, roadZ + 8.4);
      if (central) addStreetlamp(parent, x, roadZ - 8.4);
    }
    for (let x = -90; x < 91; x += 11) {
      box(parent, x, -0.1, roadZ + 5.85, 1.45, 0.028, 0.12, white, { cast: false });
      box(parent, x, -0.1, roadZ - 5.85, 1.45, 0.028, 0.12, white, { cast: false });
    }
  }

  function initScene() {
    const canvas = $('#building-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor('#0c1b29', 1);
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1b29');
    scene.fog = new THREE.Fog('#0c1b29', 70, 155);
    camera = new THREE.PerspectiveCamera(47, 1, 0.1, 500);
    camera.position.set(28, 20, 30);
    orbit = new THREE.OrbitControls(camera, canvas);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.07;
    orbit.minDistance = 8;
    orbit.maxDistance = 160;
    orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.target.set(0, 8, 0);
    buildingGroup = worldRoot(scene);
    environmentGroup = worldRoot(scene);
    hemi = new THREE.HemisphereLight('#d6ecff', '#27302e', 0.85);
    scene.add(hemi);
    ambient = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambient);
    sun = new THREE.DirectionalLight('#ffe3b5', 1.25);
    sun.position.set(28, 46, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 190;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    updateLighting();
    const observer = new ResizeObserver(resizeRenderer);
    observer.observe($('#building-stage'));
    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();
    ready = true;
    rebuild();
    function tick() {
      requestAnimationFrame(tick);
      if (!renderer || !scene) return;
      orbit.autoRotate = view.autoRotate;
      orbit.autoRotateSpeed = 0.45;
      orbit.update();
      renderer.render(scene, camera);
    }
    tick();
  }

  function resizeRenderer() {
    if (!renderer) return;
    const area = $('#building-stage');
    const w = Math.max(1, area.clientWidth);
    const h = Math.max(1, area.clientHeight);
    const size = new THREE.Vector2();
    renderer.getSize(size);
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function updateLighting() {
    if (!scene) return;
    const mode = view.lighting;
    if (mode === 'day') {
      scene.background.set('#0e2230');
      scene.fog.color.set('#0e2230');
      hemi.intensity = 0.95;
      ambient.intensity = 0.36;
      sun.intensity = 1.3;
      sun.color.set('#fff1d1');
      sun.position.set(28, 45, 20);
    } else if (mode === 'evening') {
      scene.background.set('#211d2d');
      scene.fog.color.set('#211d2d');
      hemi.intensity = 0.55;
      ambient.intensity = 0.32;
      sun.intensity = 0.95;
      sun.color.set('#ffc78b');
      sun.position.set(29, 17, -14);
    } else {
      scene.background.set('#080f22');
      scene.fog.color.set('#080f22');
      hemi.intensity = 0.32;
      ambient.intensity = 0.2;
      sun.intensity = 0.35;
      sun.color.set('#9ca9ec');
      sun.position.set(-17, 25, 12);
    }
  }

  function disposeObject(group, disposeMaterials = true) {
    if (!group) return;
    const geometries = new Set();
    const mats = new Set();
    const textures = new Set();
    group.traverse((obj) => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) {
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) mats.add(mat);
      }
    });
    geometries.forEach((g) => g.dispose());
    if (disposeMaterials) {
      mats.forEach((m) => {
        if (m.map) textures.add(m.map);
        m.dispose();
      });
      textures.forEach((t) => t.dispose());
    }
    group.clear();
  }

  function clearMaterialCache() {
    for (const mat of materials.values()) mat.dispose();
    for (const tex of modelTextures.values()) tex.dispose();
    materials.clear();
    modelTextures.clear();
  }

  function rebuildEnvironment() {
    if (!environmentGroup) return;
    disposeObject(environmentGroup, false);
    const plat = solid(view.environment === 'studio' ? '#40545d' : '#5d655b');
    if (view.environment !== 'none') {
      const extent = view.mode === 'single' ? 55 : 125;
      box(environmentGroup, 0, -0.41, 0, extent * 2, 0.38, extent * 2, plat, { cast: false });
      if (view.environment === 'street') {
        cityRoad(environmentGroup, view.mode === 'block');
        const curb = solid('#8e928b');
        if (view.mode === 'single') {
          for (const s of [-1, 1]) box(environmentGroup, s * (state.width * 0.5 + 3), -0.06, state.depth * 0.5 + 2.5, 4, 0.12, 4, curb, { cast: false });
        }
      }
    }
    if (view.grid) {
      const size = view.mode === 'single' ? 65 : 130;
      groundGrid = new THREE.GridHelper(size, Math.round(size / 2), 0x315663, 0x264451);
      groundGrid.position.y = -0.115;
      environmentGroup.add(groundGrid);
    }
  }

  function buildingAt(group, cfg, x, z, rotation, seedOffset) {
    const fresh = createBuilding({ ...cfg, seed: cfg.seed + seedOffset }, { seedOffset });
    fresh.position.set(x, 0, z);
    fresh.rotation.y = rotation;
    group.add(fresh);
    return fresh;
  }

  function rebuild() {
    if (!ready) return;
    const wasMode = buildStats.mode;
    disposeObject(buildingGroup);
    disposeObject(environmentGroup);
    clearMaterialCache();
    const mode = view.mode;
    let count = 1;
    if (mode === 'single') {
      buildingAt(buildingGroup, state, 0, 0, 0, 0);
    } else if (mode === 'compare') {
      for (let i = -1; i <= 1; i++) {
        const cfg = { ...copy(state), seed: state.seed + (i + 1) * 7919 };
        cfg.width = clamp(state.width + (i === 0 ? 0 : i * 1.1), 6, 32);
        cfg.floors = clamp(state.floors + (i === 0 ? 0 : i), 1, 14);
        cfg.inspectedFloor = 0;
        buildingAt(buildingGroup, cfg, i * Math.max(26, state.width + 7), 0, 0, i + 1);
      }
      count = 3;
    } else {
      for (let side = 0; side < 2; side++) {
        for (let n = 0; n < 5; n++) {
          const seed = state.seed + side * 3001 + n * 4177;
          const r = rng32(seed);
          const cfg = { ...copy(state), seed, cutaway: false, inspectedFloor: 0 };
          cfg.width = clamp(state.width + randBetween(r, -3, 3), 6, 32);
          cfg.depth = clamp(state.depth + randBetween(r, -2, 3), 6, 30);
          cfg.floors = clamp(state.floors + randInt(r, -2, 2), 1, 14);
          if (n % 3 === 2) cfg.wallColor = pick(r, [state.wallColor, state.secondaryWallColor, '#986657', '#9d9381', '#8a5548']);
          cfg.windowLighting = clamp(state.windowLighting + randBetween(r, -0.1, 0.2), 0, 1);
          cfg.windowsX = Math.max(2, Math.min(4, Math.ceil(cfg.windowsX * 0.65)));
          cfg.windowsSide = Math.max(1, Math.min(3, Math.ceil(cfg.windowsSide * 0.65)));
          cfg.balconies = Math.min(cfg.balconies, 0.25);
          cfg.rooftopProps = Math.min(cfg.rooftopProps, 0.35);
          cfg.fireEscape = false;
          cfg.interiorMode = 'none';
          buildingAt(buildingGroup, cfg, (n - 2) * Math.max(state.width + 2.5, 20), side === 0 ? -18 : 18, side === 0 ? 0 : Math.PI, side * 5 + n);
        }
      }
      count = 10;
    }
    buildStats = { mode, buildings: count };
    rebuildEnvironment();
    buildingGroup.traverse((obj) => {
      if (obj.isMesh && obj.material) obj.material.wireframe = view.wireframe;
    });
    $('#stat-buildings').textContent = count;
    $('#stat-floors').textContent = state.floors;
    let triangles = 0;
    buildingGroup.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        triangles += obj.geometry.index ? obj.geometry.index.count / 3 : obj.geometry.attributes.position.count / 3;
      }
    });
    $('#stat-triangles').textContent = Math.round(triangles).toLocaleString('en-US');
    $('#render-status').textContent = mode === 'block' ? 'NEIGHBORHOOD VIEW' : mode === 'compare' ? 'THREE VARIATIONS' : 'LIVE MODEL';
    if (wasMode !== mode || !lastCameraTarget || refocusAfterBuild) {
      resetCamera();
      refocusAfterBuild = false;
    }
    $('#studio-loading').classList.add('hidden');
  }

  function scheduleRebuild() {
    if (!ready || renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      rebuild();
    });
  }

  function resetCamera() {
    if (!camera || !buildingGroup) return;
    const bbox = new THREE.Box3().setFromObject(buildingGroup);
    if (bbox.isEmpty()) return;
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const dist = clamp(Math.max(size.x, size.z) * 1.4 + size.y * 0.5, 23, 135);
    camera.position.set(center.x + dist * 0.83, center.y + dist * 0.54, center.z + dist * 0.87);
    orbit.target.set(center.x, center.y * 0.83, center.z);
    lastCameraTarget = center;
    camera.far = Math.max(300, dist * 5);
    camera.updateProjectionMatrix();
    orbit.update();
  }

  async function snapshot() {
    if (!ready) {
      toast('3D preview is not ready yet');
      return;
    }
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    canvas.toBlob((blob) => {
      if (blob) {
        fileDownload(blob, 'b-building-' + safeName() + '.png');
        toast('Preview saved');
      }
    }, 'image/png');
  }

  function toggleTheatreMode() {
    view.theatre = !view.theatre;
    const studio = $('#building-studio');
    const btn = $('#btn-theatre');
    const btnTop = $('#btn-theatre-quick');
    if (studio) studio.classList.toggle('theatre-mode', view.theatre);
    if (btn) {
      btn.classList.toggle('active', view.theatre);
      btn.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
    }
    if (btnTop) {
      btnTop.classList.toggle('active', view.theatre);
      btnTop.innerHTML = view.theatre
        ? '<i class="fas fa-columns"></i><span> Standard Layout</span>'
        : '<i class="fas fa-film"></i><span> Theatre</span>';
      btnTop.title = view.theatre ? 'Exit Theatre Mode (T)' : 'Toggle Theatre Mode (T)';
    }
    toast(view.theatre ? 'Theatre mode on (T)' : 'Standard layout restored');
    setTimeout(resizeRenderer, 40);
    setTimeout(resizeRenderer, 220);
  }

  function isFullscreenActive() {
    const frame = $('.studio-viewport-frame');
    return !!(document.fullscreenElement || (frame && frame.classList.contains('is-fullscreen')));
  }

  function updateFullscreenUI(active) {
    view.fullscreen = active;
    const frame = $('.studio-viewport-frame');
    const btn = $('#btn-fullscreen');
    const btnTop = $('#btn-fullscreen-quick');
    if (frame) frame.classList.toggle('is-fullscreen', active);
    document.body.classList.toggle('studio-fullscreen-active', active);

    if (btn) {
      btn.classList.toggle('active', active);
      btn.innerHTML = active ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
      btn.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
      btn.setAttribute('aria-label', btn.title);
    }
    if (btnTop) {
      btnTop.classList.toggle('active', active);
      btnTop.innerHTML = active
        ? '<i class="fas fa-compress"></i><span> Exit Fullscreen</span>'
        : '<i class="fas fa-expand"></i><span> Fullscreen</span>';
      btnTop.title = active ? 'Exit Full-Screen Mode (Esc or F)' : 'Toggle Full-Screen Mode (F)';
    }
    setTimeout(resizeRenderer, 40);
    setTimeout(resizeRenderer, 220);
  }

  function enterFullscreenViewport() {
    const frame = $('.studio-viewport-frame');
    updateFullscreenUI(true);
    if (frame && !document.fullscreenElement && frame.requestFullscreen) {
      frame.requestFullscreen().catch(() => {
        // Fallback CSS is already applied!
      });
    }
    toast('Full-Screen Mode active (Esc or F to exit)');
  }

  function exitFullscreenViewport() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    updateFullscreenUI(false);
    toast('Exited Full-Screen Mode');
  }

  function toggleFullscreenViewport() {
    if (isFullscreenActive()) {
      exitFullscreenViewport();
    } else {
      enterFullscreenViewport();
    }
  }

  function handleStudioKeydown(e) {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullscreenViewport();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleTheatreMode();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      snapshot();
    } else if (e.key === 'Escape') {
      if (isFullscreenActive()) {
        exitFullscreenViewport();
      }
    }
  }

  function handleFullscreenChange() {
    const frame = $('.studio-viewport-frame');
    const isNowFull = !!document.fullscreenElement;
    if (isNowFull) {
      updateFullscreenUI(true);
    } else if (frame && frame.classList.contains('is-fullscreen')) {
      updateFullscreenUI(false);
    }
  }

  function loadScript(url, check, timeout = 14000) {
    if (check()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      let done = false;
      const timer = setTimeout(() => finish(new Error('Timed out loading ' + url)), timeout);
      function finish(error) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      }
      script.onload = () => (check() ? finish() : finish(new Error('Library loaded but expected feature is missing')));
      script.onerror = () => finish(new Error('Unable to load ' + url));
      document.head.appendChild(script);
    });
  }

  async function loadOneOf(urls, check) {
    if (check()) return;
    let lastError = null;
    for (const url of urls) {
      try {
        await loadScript(url, check);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Missing 3D dependency');
  }

  async function loadDependencies() {
    await loadOneOf([
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
    ], () => !!window.THREE?.WebGLRenderer);
    await loadOneOf([
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
      'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
    ], () => !!window.THREE?.OrbitControls);
  }

  async function loadExporter() {
    await loadOneOf([
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
      'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js'
    ], () => !!window.THREE?.GLTFExporter);
  }

  async function exportGLB() {
    if (!ready) {
      toast('The 3D generator is not ready');
      return;
    }
    $('#btn-export-glb').disabled = true;
    try {
      await loadExporter();
      const group = createBuilding(state);
      const exporter = new THREE.GLTFExporter();
      const data = await new Promise((resolve, reject) => {
        try {
          exporter.parse(group, resolve, { binary: true, onlyVisible: true, truncateDrawRange: true }, reject);
        } catch (e) {
          reject(e);
        }
      });
      fileDownload(new Blob([data], { type: 'model/gltf-binary' }), 'b-building-' + safeName() + '.glb');
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      toast('Building model exported');
    } catch (error) {
      console.error('Building export failed', error);
      toast('GLB export failed: ' + error.message);
    } finally {
      $('#btn-export-glb').disabled = false;
    }
  }

  function showLoadError(error) {
    console.error('Unable to start B Building Generator', error);
    const screen = $('#studio-loading');
    screen.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = '3D preview unavailable';
    const body = document.createElement('span');
    body.textContent = 'The Three.js library could not be loaded. Check your connection and reload this page.';
    const detail = document.createElement('span');
    detail.textContent = error.message;
    screen.append(title, body, detail);
    $('#render-status').textContent = 'LIBRARY ERROR';
  }

  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
})();
