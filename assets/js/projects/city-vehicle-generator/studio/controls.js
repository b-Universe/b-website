import { clamp, copy, rng32, pick, roundNum } from '../utils.js';
import {
  STORAGE_KEY,
  STYLES,
  BASE,
  PRESETS,
  SILHOUETTE_PROFILES,
  OPTIONS,
  SCHEMA,
  CATEGORIES,
  PALETTE_FAMILIES,
  getStyle,
  sanitiseConfig
} from '../config.js';
import { generateCoherentPalette } from '../materials/palettes.js';

function ctrlFormatVal(val, step = 0.01, unit = '') {
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val ?? '');
  let txt;
  if (step >= 1) txt = String(Math.round(num));
  else if (step < 0.01) txt = num.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  else if (step < 0.1) txt = num.toFixed(2);
  else txt = num.toFixed(1);
  return unit ? `${txt}${unit}` : txt;
}

function ctrlPickOption(r, list) {
  if (!Array.isArray(list) || !list.length) return undefined;
  return pick(r, list)[0];
}

function ctrlBuildLockedToggle(key, locks, onToggle) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'studio-lock' + (locks.has(key) ? ' locked' : '');
  btn.title = locks.has(key) ? 'Unlock Control For Randomization' : 'Lock Control Against Randomization';
  btn.innerHTML = `<i class="fa-solid ${locks.has(key) ? 'fa-lock' : 'fa-lock-open'}" aria-hidden="true"></i>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (locks.has(key)) locks.delete(key);
    else locks.add(key);
    const locked = locks.has(key);
    btn.classList.toggle('locked', locked);
    btn.title = locked ? 'Unlock Control For Randomization' : 'Lock Control Against Randomization';
    const icon = btn.querySelector('i');
    if (icon) icon.className = `fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`;
    if (onToggle) onToggle(key, locked);
  });
  return btn;
}

function ctrlSchemaDefForKey(key) {
  for (const rows of Object.values(SCHEMA)) {
    for (const def of rows) {
      if (def.key === key) return def;
    }
  }
  return null;
}

function ctrlSnapValue(num, def) {
  const min = def.min ?? -Infinity;
  const max = def.max ?? Infinity;
  const step = def.step || 0.01;
  const clamped = clamp(num, min, max);
  const snapped = Math.round(clamped / step) * step;
  return clamp(roundNum(snapped, 4), min, max);
}

export function renderStylePicker(container, activeStyle, onSelect) {
  if (!container) return;
  container.innerHTML = '';

  for (const arch of STYLES) {
    const preset = PRESETS[arch.preset] || {};
    const swatch = preset.bodyPrimaryColor || '#4c7ca8';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'style-card' + (arch.id === activeStyle ? ' active' : '');
    card.dataset.style = arch.id;
    card.title = arch.description || arch.label;
    card.innerHTML = `
      <span class="style-card-top">
        <span class="style-swatch" style="background:${swatch}"></span>
        <span class="style-name">${arch.label}</span>
      </span>
      <span class="style-meta">${SILHOUETTE_PROFILES[preset.silhouetteFamily]?.label || arch.shortClass || arch.silhouette || ''}</span>
    `;
    card.addEventListener('click', () => {
      if (onSelect) onSelect(arch.id);
    });
    container.appendChild(card);
  }
}

export function updateStylePicker(activeStyle) {
  const cards = document.querySelectorAll('#style-picker .style-card');
  for (const card of cards) {
    card.classList.toggle('active', card.dataset.style === activeStyle);
  }
}

export function renderPresetList(container, activePresetId, onSelect) {
  if (!container) return;
  container.innerHTML = '';

  for (const [id, preset] of Object.entries(PRESETS)) {
    const arch = STYLES.find((s) => s.preset === id || s.id === id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn' + (id === activePresetId ? ' active' : '');
    btn.dataset.preset = id;
    btn.innerHTML = `
      <span class="preset-swatch" style="background:${preset.bodyPrimaryColor || '#4c7ca8'}"></span>
      <span class="preset-text">
        <span class="preset-title">${preset.label || id}</span>
        <span class="preset-sub">${SILHOUETTE_PROFILES[preset.silhouetteFamily]?.label || arch?.shortClass || arch?.silhouette || arch?.label || ''}</span>
      </span>
    `;
    btn.addEventListener('click', () => {
      if (onSelect) onSelect(id);
    });
    container.appendChild(btn);
  }
}

export function updatePresetList(activePresetId) {
  const btns = document.querySelectorAll('#preset-list .preset-btn');
  for (const btn of btns) {
    btn.classList.toggle('active', btn.dataset.preset === activePresetId);
  }
}

export function renderCustomPresets(container, onLoad, toast) {
  if (!container) return;
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }

  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<div class="studio-empty-note">No saved custom vehicles yet.</div>';
    return;
  }

  items.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'custom-preset-item';

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'custom-preset-load';
    loadBtn.innerHTML = `
      <span class="preset-swatch" style="background:${entry.config?.bodyPrimaryColor || '#4c7ca8'}"></span>
      <span>${entry.name || `Custom Vehicle ${idx + 1}`}</span>
    `;
    loadBtn.addEventListener('click', () => {
      if (onLoad) onLoad(entry.config, entry.name);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'custom-preset-del';
    delBtn.title = 'Delete Saved Preset';
    delBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
    delBtn.addEventListener('click', () => {
      const updated = items.filter((_, i) => i !== idx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      renderCustomPresets(container, onLoad, toast);
      if (toast) toast(`Removed "${entry.name}"`);
    });

    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

function ctrlApplyJitteredNumeric(next, key, baseVal, r, spanRatio = 0.14) {
  const def = ctrlSchemaDefForKey(key);
  if (!def || def.type) return;
  const spread = Math.max((def.step || 0.01) * 2, Math.abs(baseVal) * spanRatio);
  const candidate = baseVal + (r() * 2 - 1) * spread;
  next[key] = ctrlSnapValue(candidate, def);
}

export function applySeedVariation(state, locks = new Set()) {
  const seedInt = (Number(state.seed) || 1024) >>> 0;
  const r = rng32(seedInt);
  const arch = getStyle(state.style);
  const presetBase = PRESETS[arch.preset] || PRESETS.sedan;

  const setIfUnlocked = (key, val) => {
    if (!locks.has(key) && val !== undefined) {
      state[key] = val;
    }
  };

  let chosenFamily = state.paletteFamily || presetBase.paletteFamily || 'civilian_neutrals';
  if (!locks.has('paletteFamily')) {
    if (!state.roleVariant || state.roleVariant === 'civilian') {
      chosenFamily = pick(r, ['civilian_neutrals', 'bright_city', 'muted_industrial']);
    } else {
      chosenFamily = presetBase.paletteFamily || chosenFamily;
    }
  }

  const pal = generateCoherentPalette(chosenFamily, seedInt + 17, state.roleVariant);
  for (const [k, v] of Object.entries(pal)) {
    setIfUnlocked(k, v);
  }
  setIfUnlocked('colorVariation', ctrlSnapValue(0.04 + r() * 0.12, ctrlSchemaDefForKey('colorVariation')));
  setIfUnlocked('hubcapStyle', ctrlPickOption(r, OPTIONS.hubcapStyle));

  // Subtle +/- 6% deterministic proportion variation anchored to archetype preset defaults
  const jitterKeys = [
    'overallLength',
    'overallWidth',
    'overallHeight',
    'groundClearance',
    'wheelRadius',
    'wheelThickness'
  ];
  for (const key of jitterKeys) {
    if (!locks.has(key)) {
      const anchor = presetBase[key] !== undefined ? presetBase[key] : (BASE[key] !== undefined ? BASE[key] : state[key]);
      ctrlApplyJitteredNumeric(state, key, anchor, r, 0.06);
    }
  }

  const clean = sanitiseConfig(state);
  Object.assign(state, clean);
  return state;
}

export function randomizeSettings(cat, state, locks = new Set(), rngFn = null) {
  const r = rngFn || rng32(((Number(state.seed) || 1024) + Math.floor(Math.random() * 99999)) >>> 0);
  const arch = getStyle(state.style);
  const presetBase = PRESETS[arch.preset] || PRESETS.sedan;
  const next = copy(state);
  const targetCats = cat === 'all' ? ['structure', 'body', 'doors', 'wheels', 'details', 'materials', 'variants'] : [cat];

  const writeIfUnlocked = (key, value) => {
    if (!locks.has(key) && value !== undefined) {
      next[key] = value;
    }
  };

  for (const activeCat of targetCats) {
    if (activeCat === 'materials') {
      const famKeys = Object.keys(PALETTE_FAMILIES);
      const chosenFamily = locks.has('paletteFamily') && next.paletteFamily
        ? next.paletteFamily
        : pick(r, famKeys);
      const pal = generateCoherentPalette(chosenFamily, Math.floor(r() * 999999) + 1, next.roleVariant);
      for (const [k, v] of Object.entries(pal)) {
        writeIfUnlocked(k, v);
      }
      writeIfUnlocked('wearLevel', ctrlPickOption(r, OPTIONS.wearLevel));
      writeIfUnlocked('colorVariation', ctrlSnapValue(r() * 0.24, ctrlSchemaDefForKey('colorVariation')));
      continue;
    }

    if (activeCat === 'structure') {
      const familyChoices = [presetBase.bodyFamily, arch.bodyFamily].filter(Boolean);
      if (familyChoices.length) writeIfUnlocked('bodyFamily', pick(r, familyChoices));
      writeIfUnlocked('silhouetteFamily', ctrlPickOption(r, OPTIONS.silhouetteFamily));

      const numericKeys = [
        'overallLength',
        'overallWidth',
        'overallHeight',
        'groundClearance',
        'roofHeight',
        'wheelbase',
        'frontOverhang',
        'rearOverhang',
        'hoodLength',
        'cabinLength',
        'cargoLength'
      ];
      for (const k of numericKeys) {
        if (!locks.has(k)) {
          const anchor = presetBase[k] !== undefined ? presetBase[k] : next[k];
          ctrlApplyJitteredNumeric(next, k, anchor, r, 0.14);
        }
      }
      if (!locks.has('cabCargoSeparation')) {
        const isTruck = next.bodyFamily === 'pickup_cab_bed' ||
          next.bodyFamily === 'cab_over_box' ||
          next.bodyFamily === 'dump_truck' ||
          next.bodyFamily === 'cement_mixer' ||
          next.bodyFamily === 'flatbed_truck';
        const anchorGap = presetBase.cabCargoSeparation || 0.08;
        next.cabCargoSeparation = isTruck
          ? ctrlSnapValue(anchorGap + (r() * 0.08 - 0.02), ctrlSchemaDefForKey('cabCargoSeparation'))
          : 0;
      }
      continue;
    }

    if (activeCat === 'body') {
      writeIfUnlocked('rooflineStyle', ctrlPickOption(r, OPTIONS.rooflineStyle));
      for (const k of CATEGORIES.body) {
        if (k === 'rooflineStyle' || locks.has(k)) continue;
        const anchor = presetBase[k] !== undefined ? presetBase[k] : next[k];
        ctrlApplyJitteredNumeric(next, k, anchor, r, 0.28);
      }
      continue;
    }

    if (activeCat === 'doors') {
      for (const k of CATEGORIES.doors) {
        if (locks.has(k)) continue;
        const def = ctrlSchemaDefForKey(k);
        if (!def) continue;
        if (def.type === 'boolean') {
          if (k === 'slidingDoor' && next.bodyFamily !== 'van_monobox' && next.bodyFamily !== 'transit_bus') {
            next[k] = false;
          } else if (k === 'vanPartialWindows' && next.bodyFamily !== 'van_monobox') {
            next[k] = false;
          } else {
            next[k] = r() > 0.45;
          }
        } else if (def.type === 'select') {
          next[k] = ctrlPickOption(r, OPTIONS[k]);
        } else {
          const anchor = presetBase[k] !== undefined ? presetBase[k] : next[k];
          ctrlApplyJitteredNumeric(next, k, anchor, r, 0.25);
        }
      }
      continue;
    }

    if (activeCat === 'wheels') {
      const heavy = next.bodyFamily === 'cab_over_box' ||
        next.bodyFamily === 'transit_bus' ||
        next.bodyFamily === 'dump_truck' ||
        next.bodyFamily === 'cement_mixer' ||
        next.bodyFamily === 'flatbed_truck' ||
        next.bodyFamily === 'double_decker' ||
        next.bodyFamily === 'articulated_bus' ||
        next.bodyFamily === 'semi_trailer';
      for (const k of CATEGORIES.wheels) {
        if (locks.has(k)) continue;
        const def = ctrlSchemaDefForKey(k);
        if (!def) continue;
        if (def.type === 'boolean') {
          next[k] = heavy ? r() > 0.35 : r() > 0.85;
        } else if (def.type === 'select') {
          next[k] = ctrlPickOption(r, OPTIONS[k]);
        } else if (k === 'axleCount') {
          next[k] = heavy && next.overallLength > 7.0 ? (r() > 0.45 ? 3 : 2) : 2;
        } else {
          const anchor = presetBase[k] !== undefined ? presetBase[k] : next[k];
          ctrlApplyJitteredNumeric(next, k, anchor, r, 0.16);
        }
      }
      continue;
    }

    if (activeCat === 'details') {
      for (const k of CATEGORIES.details) {
        if (locks.has(k)) continue;
        const def = ctrlSchemaDefForKey(k);
        if (!def) continue;
        if (def.type === 'boolean') {
          next[k] = r() > 0.38;
        } else if (def.type === 'select') {
          next[k] = ctrlPickOption(r, OPTIONS[k]);
        } else {
          const anchor = presetBase[k] !== undefined ? presetBase[k] : next[k];
          ctrlApplyJitteredNumeric(next, k, anchor, r, 0.5);
        }
      }
      continue;
    }

    if (activeCat === 'variants') {
      const roles = ['civilian', 'taxi', 'delivery', 'postal', 'food_vendor', 'service', 'construction', 'police', 'ambulance', 'fire', 'armored', 'transit'];
      const chosenRole = locks.has('roleVariant') ? next.roleVariant : pick(r, roles);
      writeIfUnlocked('roleVariant', chosenRole);
      writeIfUnlocked('taxiSign', chosenRole === 'taxi');
      writeIfUnlocked(
        'lightBar',
        chosenRole === 'police'
          ? 'police_bar'
          : (chosenRole === 'ambulance' || chosenRole === 'fire')
            ? 'ambulance_bar'
            : (chosenRole === 'service' || chosenRole === 'construction' || chosenRole === 'postal')
              ? pick(r, ['amber_work_bar', 'vintage_beacon'])
              : 'none'
      );
      writeIfUnlocked('busRouteSign', chosenRole === 'transit' || next.bodyFamily === 'transit_bus' || next.bodyFamily === 'double_decker');
      writeIfUnlocked('roofRack', ctrlPickOption(r, OPTIONS.roofRack));
      writeIfUnlocked('frontAttachment', r() > 0.55 ? ctrlPickOption(r, OPTIONS.frontAttachment) : 'none');
      writeIfUnlocked('rearAttachment', r() > 0.5 ? ctrlPickOption(r, OPTIONS.rearAttachment) : 'none');
      writeIfUnlocked('sideUtility', r() > 0.45 ? ctrlPickOption(r, OPTIONS.sideUtility) : 'none');
    }
  }

  const clean = sanitiseConfig(next);
  Object.assign(state, clean);
  return clean;
}

function ctrlBuildPresetsTab(container, state, ctx) {
  const arch = getStyle(state.style);
  const intro = document.createElement('div');
  intro.className = 'studio-tab-summary';
  intro.innerHTML = `
    <div class="studio-group-label">Active Archetype</div>
    <p class="studio-hint">${arch.description || 'Procedural stylized low-poly city vehicle.'}</p>
    <p class="studio-hint">Use the archetype bar above or presets panel on the right to switch classes. Locked controls stay fixed when loading a preset.</p>
  `;
  container.appendChild(intro);

  for (const def of SCHEMA.presets) {
    if (def.group) {
      const grp = document.createElement('div');
      grp.className = 'studio-group-label';
      grp.textContent = def.group;
      container.appendChild(grp);
      continue;
    }

    const field = document.createElement('div');
    field.className = 'studio-control-group studio-field';
    const head = document.createElement('div');
    head.className = 'studio-row-head';
    head.innerHTML = `<label>${def.name}</label>`;
    field.appendChild(head);

    if (def.key === 'style') {
      const select = document.createElement('select');
      select.className = 'studio-select';
      for (const s of STYLES) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.label;
        if (s.id === state.style) opt.selected = true;
        select.appendChild(opt);
      }
      select.addEventListener('change', () => {
        if (ctx.onStyleSelected) ctx.onStyleSelected(select.value);
      });
      field.appendChild(select);
    } else if (def.key === 'seed') {
      const row = document.createElement('div');
      row.className = 'studio-row-inline';
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'studio-input';
      input.min = String(def.min || 1);
      input.max = String(def.max || 99999999);
      input.value = String(state.seed || 1024);
      input.addEventListener('change', () => {
        state.seed = clamp(Math.floor(Number(input.value) || 1024), 1, 99999999);
        const seedTop = document.getElementById('seed-input');
        if (seedTop) seedTop.value = String(state.seed);
        if (ctx.onStructureChanged) ctx.onStructureChanged(false);
      });
      const rollBtn = document.createElement('button');
      rollBtn.type = 'button';
      rollBtn.className = 'studio-mini-btn';
      rollBtn.textContent = 'New Seed';
      rollBtn.addEventListener('click', () => {
        if (ctx.onNewSeed) ctx.onNewSeed();
      });
      row.appendChild(input);
      row.appendChild(rollBtn);
      field.appendChild(row);
    }
    container.appendChild(field);
  }
}

function ctrlBuildExportTab(container, ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'studio-export-tab';
  wrap.innerHTML = `
    <div class="studio-group-label">Game-Ready Export</div>
    <p class="studio-hint">Models export as binary 3d Glb matching the live stylized preview, plus versioned <code>b.vehicle.v1</code> Json blueprints with B Game Units collision and parking bounds.</p>
    <div class="studio-export-actions">
      <button type="button" class="studio-btn studio-btn-primary" id="tab-export-glb"><i class="fa-solid fa-cube"></i> Export 3d Model (Glb)</button>
      <button type="button" class="studio-btn" id="tab-export-bp"><i class="fa-solid fa-diagram-project"></i> Export Blueprint (Json)</button>
      <button type="button" class="studio-btn" id="tab-export-fleet"><i class="fa-solid fa-car-on"></i> Export Traffic Fleet Pack</button>
      <button type="button" class="studio-btn" id="tab-export-settings"><i class="fa-solid fa-sliders"></i> Export Generator Settings</button>
      <button type="button" class="studio-btn" id="tab-import-json"><i class="fa-solid fa-file-import"></i> Import Blueprint / Settings</button>
      <button type="button" class="studio-btn" id="tab-snapshot"><i class="fa-solid fa-camera"></i> Capture Png Snapshot</button>
    </div>
  `;
  container.appendChild(wrap);

  wrap.querySelector('#tab-export-glb')?.addEventListener('click', () => ctx.onExportGLB && ctx.onExportGLB());
  wrap.querySelector('#tab-export-bp')?.addEventListener('click', () => ctx.onExportBlueprint && ctx.onExportBlueprint());
  wrap.querySelector('#tab-export-fleet')?.addEventListener('click', () => ctx.onExportFleet && ctx.onExportFleet());
  wrap.querySelector('#tab-export-settings')?.addEventListener('click', () => ctx.onExportJSON && ctx.onExportJSON());
  wrap.querySelector('#tab-import-json')?.addEventListener('click', () => ctx.onImportTrigger && ctx.onImportTrigger());
  wrap.querySelector('#tab-snapshot')?.addEventListener('click', () => ctx.onSnapshot && ctx.onSnapshot());
}

export function renderControls(tabId, container, state, locks, ctx) {
  if (!container) return;
  container.innerHTML = '';

  if (tabId === 'presets') {
    ctrlBuildPresetsTab(container, state, ctx);
    return;
  }

  if (tabId === 'export') {
    ctrlBuildExportTab(container, ctx);
    return;
  }

  const rows = SCHEMA[tabId] || [];
  const materialOnlyKeys = new Set([
    ...CATEGORIES.materials,
    'windowTint',
    'headlightsLit',
    'emergencyLightsLit'
  ]);

  for (const item of rows) {
    if (item.group) {
      const grp = document.createElement('div');
      grp.className = 'studio-group-label';
      grp.textContent = item.group;
      container.appendChild(grp);
      continue;
    }

    const key = item.key;
    const field = document.createElement('div');
    field.className = 'studio-control-group studio-field';

    const head = document.createElement('div');
    head.className = 'studio-row-head';

    const label = document.createElement('label');
    label.textContent = item.name;
    if (item.info) label.title = item.info;
    head.appendChild(label);

    const end = document.createElement('div');
    end.className = 'studio-row-end';

    let valBadge = null;
    if (!item.type || item.type === 'number' || item.type === 'color') {
      valBadge = document.createElement('span');
      valBadge.className = 'studio-field-value';
      valBadge.textContent = item.type === 'color'
        ? String(state[key] || '#000000')
        : ctrlFormatVal(state[key], item.step, item.unit);
      end.appendChild(valBadge);
    }

    if (tabId !== 'scene') {
      end.appendChild(ctrlBuildLockedToggle(key, locks));
    }

    head.appendChild(end);
    field.appendChild(head);

    if (item.type === 'select') {
      const select = document.createElement('select');
      select.className = 'studio-select';
      const optList = item.optionsKey === 'materialFamily'
        ? OPTIONS.materialFamily
        : (OPTIONS[key] || []);

      for (const [optVal, optLabel] of optList) {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optLabel;
        if (state[key] === optVal) opt.selected = true;
        select.appendChild(opt);
      }

      select.addEventListener('change', () => {
        state[key] = select.value;
        if (key === 'paletteFamily') {
          const pal = generateCoherentPalette(select.value, state.seed || 1024, state.roleVariant);
          for (const [pKey, pVal] of Object.entries(pal)) {
            if (!locks.has(pKey)) state[pKey] = pVal;
          }
          renderControls(tabId, container, state, locks, ctx);
          if (ctx.onMaterialChanged) ctx.onMaterialChanged(false);
          return;
        }
        if (key === 'lightingTime') {
          if (ctx.onLightingChanged) ctx.onLightingChanged();
          return;
        }
        if (materialOnlyKeys.has(key)) {
          if (ctx.onMaterialChanged) ctx.onMaterialChanged(false);
        } else if (ctx.onStructureChanged) {
          ctx.onStructureChanged(false);
        }
      });

      field.appendChild(select);
    } else if (item.type === 'boolean') {
      const wrap = document.createElement('label');
      wrap.className = 'studio-row-inline studio-check-row';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = Boolean(state[key]);
      chk.addEventListener('change', () => {
        state[key] = chk.checked;
        if (materialOnlyKeys.has(key)) {
          if (ctx.onMaterialChanged) ctx.onMaterialChanged(false);
        } else if (ctx.onStructureChanged) {
          ctx.onStructureChanged(false);
        }
      });
      const txt = document.createElement('span');
      txt.textContent = chk.checked ? 'Enabled' : 'Disabled';
      chk.addEventListener('change', () => {
        txt.textContent = chk.checked ? 'Enabled' : 'Disabled';
      });
      wrap.appendChild(chk);
      wrap.appendChild(txt);
      field.appendChild(wrap);
    } else if (item.type === 'color') {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'studio-color-input';
      colorInput.value = String(state[key] || '#4c7ca8');
      colorInput.addEventListener('input', () => {
        state[key] = colorInput.value;
        if (valBadge) valBadge.textContent = colorInput.value;
        if (ctx.onMaterialChanged) ctx.onMaterialChanged(true);
      });
      colorInput.addEventListener('change', () => {
        if (ctx.onMaterialChanged) ctx.onMaterialChanged(false);
      });
      field.appendChild(colorInput);
    } else if (item.type === 'text') {
      const txtInput = document.createElement('input');
      txtInput.type = 'text';
      txtInput.className = 'studio-input';
      txtInput.maxLength = 40;
      txtInput.value = String(state[key] || '');
      txtInput.addEventListener('input', () => {
        state[key] = txtInput.value.slice(0, 40);
        if (ctx.onStructureChanged) ctx.onStructureChanged(true);
      });
      field.appendChild(txtInput);
    } else {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'studio-range';
      slider.min = String(item.min ?? 0);
      slider.max = String(item.max ?? 10);
      slider.step = String(item.step ?? 0.01);
      slider.value = String(state[key] ?? item.min ?? 0);

      slider.addEventListener('input', () => {
        const num = Number(slider.value);
        state[key] = num;
        if (valBadge) valBadge.textContent = ctrlFormatVal(num, item.step, item.unit);
        if (materialOnlyKeys.has(key)) {
          if (ctx.onMaterialChanged) ctx.onMaterialChanged(true);
        } else if (ctx.onStructureChanged) {
          ctx.onStructureChanged(true);
        }
      });
      slider.addEventListener('change', () => {
        if (materialOnlyKeys.has(key)) {
          if (ctx.onMaterialChanged) ctx.onMaterialChanged(false);
        } else if (ctx.onStructureChanged) {
          ctx.onStructureChanged(false);
        }
      });

      field.appendChild(slider);
    }

    container.appendChild(field);
  }
}
