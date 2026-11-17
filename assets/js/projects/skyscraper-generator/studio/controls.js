import { $, $$, clamp, copy, rng32, pick, roundNum } from '../utils.js';
import {
  STORAGE_KEY,
  STYLES,
  PRESETS,
  OPTIONS,
  SCHEMA,
  CATEGORIES,
  getStyle,
  baseForStyle
} from '../config.js';
import {
  resolveStackedSections,
  addSectionToState,
  removeSectionFromState,
  moveSectionInState,
  duplicateSectionInState,
  updateSectionPropertyInState
} from '../core/sections.js';
import { generateCoherentPalette } from '../materials/palettes.js';

const PRESET_CARDS = Object.entries(PRESETS).map(([id, data]) => {
  const styleDesc = getStyle(data.style || id);
  return {
    id,
    label: data.label || styleDesc.label,
    icon: styleDesc.icon,
    data
  };
});

const MATERIAL_INPLACE_KEYS = new Set([
  'primaryMaterial',
  'primaryColor',
  'secondaryMaterial',
  'secondaryColor',
  'framingMaterial',
  'framingColor',
  'glassMaterial',
  'glassColor',
  'mullionMaterial',
  'mullionColor',
  'trimMaterial',
  'trimColor',
  'crownMaterial',
  'crownColor',
  'podiumMaterial',
  'podiumColor',
  'colorVariation'
]);

const SECTION_EDITOR_FIELDS = [
  { key: 'label', name: 'Section Name', type: 'text' },
  { key: 'role', name: 'Architectural Role', type: 'select', optionsKey: 'sectionRole' },
  { key: 'floors', name: 'Section Floors', type: 'range', min: 1, max: 60, step: 1 },
  { key: 'floorHeight', name: 'Floor-to-Floor Height', type: 'range', min: 2.8, max: 6.5, step: 0.1, unit: 'm' },
  { key: 'width', name: 'Section Width', type: 'range', min: 8, max: 80, step: 1, unit: 'm' },
  { key: 'depth', name: 'Section Depth', type: 'range', min: 8, max: 80, step: 1, unit: 'm' },
  { key: 'footprint', name: 'Section Footprint', type: 'select', optionsKey: 'footprint' },
  { key: 'cornerTreatment', name: 'Corner Treatment', type: 'select', optionsKey: 'cornerTreatment' },
  { key: 'cornerSize', name: 'Corner Size', type: 'range', min: 0.2, max: 6.5, step: 0.2, unit: 'm' },
  { key: 'setback', name: 'Setback From Tier Below', type: 'range', min: 0, max: 10, step: 0.5, unit: 'm' },
  { key: 'overhang', name: 'Cantilever Overhang', type: 'range', min: 0, max: 6, step: 0.25, unit: 'm' },
  { key: 'transitionMode', name: 'Section Transition', type: 'select', optionsKey: 'transitionMode' },
  { key: 'offsetX', name: 'Horizontal Offset X', type: 'range', min: -24, max: 24, step: 0.5, unit: 'm' },
  { key: 'offsetZ', name: 'Horizontal Offset Z', type: 'range', min: -24, max: 24, step: 0.5, unit: 'm' },
  { key: 'rotationDeg', name: 'Section Base Rotation', type: 'range', min: -180, max: 180, step: 5, unit: '°' },
  { key: 'twistDeg', name: 'Continuous Twist Angle', type: 'range', min: -60, max: 60, step: 2, unit: '°' },
  { key: 'taperX', name: 'Width Taper Ratio', type: 'range', min: 0.45, max: 1.35, step: 0.02 },
  { key: 'taperZ', name: 'Depth Taper Ratio', type: 'range', min: 0.45, max: 1.35, step: 0.02 },
  { key: 'flareBase', name: 'Flared Lower Facade Skirt', type: 'range', min: 0, max: 0.55, step: 0.02 },
  { key: 'slantedTopDeg', name: 'Slanted Top Slope Angle', type: 'range', min: -45, max: 45, step: 2, unit: '°' },
  { key: 'facadeStyle', name: 'Facade Style', type: 'select', optionsKey: 'facadeStyle' },
  { key: 'windowPattern', name: 'Window Arrangement', type: 'select', optionsKey: 'windowPattern' },
  { key: 'materialRole', name: 'Exterior Material Slot', type: 'select', optionsList: [
    ['primary', 'Primary Material'],
    ['secondary', 'Secondary Material'],
    ['podium', 'Ground Podium'],
    ['crown', 'Crown Material'],
    ['glass', 'Curtain Glass']
  ] },
  { key: 'diagonalBrace', name: 'Section Exterior Braces', type: 'select', optionsKey: 'exteriorBracing' },
  { key: 'fanMotif', name: 'Art Deco Sunburst Motif', type: 'boolean' },
  { key: 'recessedCoreStrip', name: 'Recessed Center Facade Strip', type: 'boolean' }
];

export function renderStylePicker(container, activeStyle, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  for (const s of STYLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'style-option' + (s.id === activeStyle ? ' active' : '');
    btn.dataset.style = s.id;
    const icon = document.createElement('i');
    icon.className = 'fas ' + s.icon;
    const lbl = document.createElement('span');
    lbl.textContent = s.label;
    btn.append(icon, lbl);
    btn.addEventListener('click', () => {
      const presetData = PRESETS[s.preset] || baseForStyle(s.id);
      onSelect(copy(presetData), s.label, s.preset);
    });
    container.appendChild(btn);
  }
}

export function updateStylePicker(activeStyle) {
  $$('#style-picker .style-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === activeStyle);
  });
}

export function renderPresetList(container, activePresetId, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  for (const card of PRESET_CARDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-item' + (card.id === activePresetId ? ' active' : '');
    btn.dataset.preset = card.id;
    const icon = document.createElement('i');
    icon.className = 'fas ' + card.icon;
    const lbl = document.createElement('span');
    lbl.textContent = card.label;
    btn.append(icon, lbl);
    btn.addEventListener('click', () => {
      onSelect(copy(card.data), card.label, card.id);
    });
    container.appendChild(btn);
  }
}

export function updatePresetList(activePresetId) {
  $$('#preset-list .preset-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === activePresetId);
  });
}

export function renderCustomPresets(container, onLoad, toast) {
  if (!container) return;
  container.innerHTML = '';
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'studio-help';
    empty.textContent = 'No Saved Complexes Yet.';
    container.appendChild(empty);
    return;
  }

  list.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'custom-preset-row';
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'custom-preset-btn';
    loadBtn.textContent = item.name || `Custom Skyline ${idx + 1}`;
    loadBtn.addEventListener('click', () => {
      onLoad(copy(item.config || item), item.name || 'Saved Complex', null, item.name);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'custom-preset-del';
    delBtn.title = 'Delete Saved Preset';
    const delIcon = document.createElement('i');
    delIcon.className = 'fas fa-trash';
    delBtn.appendChild(delIcon);
    delBtn.addEventListener('click', () => {
      const updated = list.filter((_, i) => i !== idx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      renderCustomPresets(container, onLoad, toast);
      if (toast) toast(`Removed "${item.name}"`);
    });

    row.append(loadBtn, delBtn);
    container.appendChild(row);
  });
}

export function randomizeSettings(cat, state, locks = new Set(), rngFn = null) {
  const r = rngFn || rng32((Date.now() ^ (state.seed || 2026)) >>> 0);
  const categories = cat === 'all'
    ? ['structure', 'facades', 'materials', 'roofs', 'connections', 'ground']
    : [cat];

  if (categories.includes('materials')) {
    const palette = generateCoherentPalette(Math.floor(r() * 999999));
    for (const [k, v] of Object.entries(palette)) {
      if (!locks.has(k)) state[k] = v;
    }
  }

  for (const catKey of categories) {
    if (catKey === 'materials') continue;
    const keys = CATEGORIES[catKey] || [];
    for (const key of keys) {
      if (locks.has(key)) continue;
      let def = null;
      for (const schemaRows of Object.values(SCHEMA)) {
        const hit = schemaRows.find((row) => row.key === key);
        if (hit) {
          def = hit;
          break;
        }
      }
      if (!def) continue;

      if (def.type === 'boolean') {
        state[key] = r() > 0.45;
      } else if (def.type === 'select') {
        const list = def.optionsKey === 'materialFamily'
          ? OPTIONS.materialFamily
          : (OPTIONS[key] || []);
        if (list.length > 0) state[key] = pick(r, list)[0];
      } else if (typeof def.min === 'number' && typeof def.max === 'number') {
        const step = def.step || 1;
        const steps = Math.max(1, Math.round((def.max - def.min) / step));
        const val = def.min + Math.floor(r() * (steps + 1)) * step;
        state[key] = roundNum(clamp(val, def.min, def.max), 3);
      }
    }
  }

  // Randomize unlocked stacked sections
  if (cat === 'all' || cat === 'structure') {
    const fpList = OPTIONS.footprint.map((x) => x[0]);
    const cornerList = OPTIONS.cornerTreatment.map((x) => x[0]);
    if (Array.isArray(state.sections)) {
      state.sections = state.sections.map((sec, idx) => {
        if (sec.locked) return sec;
        const nextFp = idx === 0 && r() > 0.4 ? 'rectangle' : pick(r, fpList);
        return {
          ...sec,
          floors: clamp(Math.round(sec.floors * (0.75 + r() * 0.55)), 2, 45),
          width: clamp(Math.round((sec.width + (r() - 0.5) * 6)), 10, 68),
          depth: clamp(Math.round((sec.depth + (r() - 0.5) * 6)), 10, 68),
          footprint: nextFp,
          cornerTreatment: pick(r, cornerList)
        };
      });
    }
  }

  return state;
}

function ctrlBuildFieldRow(def, value, isLocked, onChange, onToggleLock) {
  const wrap = document.createElement('div');
  wrap.className = 'studio-field';

  const head = document.createElement('div');
  head.className = 'studio-field-head';

  const label = document.createElement('label');
  label.textContent = def.name;
  head.appendChild(label);

  const rowEnd = document.createElement('div');
  rowEnd.className = 'studio-row-end';
  head.appendChild(rowEnd);

  if (def.type === 'range' || (!def.type && typeof def.min === 'number' && def.key !== 'seed')) {
    const unitSpan = document.createElement('span');
    unitSpan.className = 'studio-val';
    unitSpan.textContent = String(value) + (def.unit || '');
    rowEnd.appendChild(unitSpan);
    wrap.appendChild(head);

    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(def.min);
    range.max = String(def.max);
    range.step = String(def.step ?? 1);
    range.value = String(value);
    range.addEventListener('input', () => {
      const next = Number(range.value);
      unitSpan.textContent = String(next) + (def.unit || '');
      onChange(next, true);
    });
    range.addEventListener('change', () => onChange(Number(range.value), false));
    wrap.appendChild(range);
  } else if (def.type === 'select') {
    wrap.appendChild(head);
    const select = document.createElement('select');
    let list = [];
    if (def.optionsList) list = def.optionsList;
    else if (def.optionsKey === 'styleList') list = STYLES.map((s) => [s.id, s.label]);
    else if (def.optionsKey) list = OPTIONS[def.optionsKey] || [];
    else list = OPTIONS[def.key] || [];

    for (const [optVal, optLabel] of list) {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optLabel;
      if (optVal === value) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => onChange(select.value, false));
    wrap.appendChild(select);
  } else if (def.type === 'color') {
    const hexSpan = document.createElement('span');
    hexSpan.className = 'studio-val';
    hexSpan.textContent = String(value);
    rowEnd.appendChild(hexSpan);
    wrap.appendChild(head);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = String(value);
    colorInput.addEventListener('input', () => {
      hexSpan.textContent = colorInput.value;
      onChange(colorInput.value, true);
    });
    wrap.appendChild(colorInput);
  } else if (def.type === 'boolean') {
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = Boolean(value);
    check.addEventListener('change', () => onChange(check.checked, false));
    rowEnd.appendChild(check);
    wrap.appendChild(head);
  } else if (def.type === 'number') {
    wrap.appendChild(head);
    const num = document.createElement('input');
    num.type = 'number';
    if (def.min !== undefined) num.min = String(def.min);
    if (def.max !== undefined) num.max = String(def.max);
    num.step = String(def.step ?? 1);
    num.value = String(value);
    num.addEventListener('change', () => onChange(Number(num.value), false));
    wrap.appendChild(num);
  } else {
    wrap.appendChild(head);
    const txt = document.createElement('input');
    txt.type = 'text';
    txt.className = 'studio-textbox';
    txt.value = String(value ?? '');
    txt.addEventListener('change', () => onChange(txt.value, false));
    wrap.appendChild(txt);
  }

  if (onToggleLock) {
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'studio-lock' + (isLocked ? ' locked' : '');
    lockBtn.title = isLocked ? 'Unlock Setting' : 'Lock Setting During Randomization';
    const lockIcon = document.createElement('i');
    lockIcon.className = 'fas ' + (isLocked ? 'fa-lock' : 'fa-unlock');
    lockBtn.appendChild(lockIcon);
    lockBtn.addEventListener('click', () => {
      onToggleLock();
    });
    rowEnd.appendChild(lockBtn);
  }

  if (def.info) {
    const info = document.createElement('p');
    info.className = 'studio-help';
    info.textContent = def.info;
    wrap.appendChild(info);
  }

  return wrap;
}

export function renderSectionStackManager(container, state, selectedIdx, onSelectSection, onMutateState, onRerender) {
  const stack = resolveStackedSections(state);
  const safeIdx = clamp(selectedIdx, 0, Math.max(0, state.sections.length - 1));

  const summary = document.createElement('div');
  summary.className = 'section-summary-banner';
  summary.textContent = `${state.sections.length} Stacked Tiers · ${stack.totalFloors} Floors · ${roundNum(stack.totalHeight, 1)}m Core Height`;
  container.appendChild(summary);

  const toolbar = document.createElement('div');
  toolbar.className = 'section-stack-toolbar';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'studio-btn studio-btn-primary';
  addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Tier';
  addBtn.addEventListener('click', () => {
    const added = addSectionToState(state);
    if (added) {
      onSelectSection(state.sections.length - 1);
      onMutateState(true);
      onRerender();
    }
  });

  const dupActiveBtn = document.createElement('button');
  dupActiveBtn.type = 'button';
  dupActiveBtn.className = 'studio-btn studio-btn-ghost';
  dupActiveBtn.innerHTML = '<i class="fas fa-copy"></i> Duplicate';
  dupActiveBtn.addEventListener('click', () => {
    if (duplicateSectionInState(state, safeIdx)) {
      onSelectSection(safeIdx + 1);
      onMutateState(true);
      onRerender();
    }
  });

  toolbar.append(addBtn, dupActiveBtn);
  container.appendChild(toolbar);

  const listEl = document.createElement('div');
  listEl.className = 'section-stack-list';

  stack.sections.forEach((sec, idx) => {
    const rawSec = state.sections[idx];
    const card = document.createElement('div');
    card.className = 'section-card' + (idx === safeIdx ? ' active' : '');
    card.dataset.sectionIndex = String(idx);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.section-mini-btn')) return;
      onSelectSection(idx);
      onRerender();
    });

    const head = document.createElement('div');
    head.className = 'section-card-head';

    const title = document.createElement('span');
    title.className = 'section-card-title';
    title.textContent = `${idx + 1}. ${rawSec.label || sec.label}`;

    const actions = document.createElement('div');
    actions.className = 'section-card-actions';

    const mkAction = (iconCls, tip, disabled, extraCls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'section-mini-btn' + (extraCls ? ' ' + extraCls : '');
      b.title = tip;
      b.disabled = Boolean(disabled);
      const ic = document.createElement('i');
      ic.className = 'fas ' + iconCls;
      b.appendChild(ic);
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        fn();
      });
      return b;
    };

    actions.append(
      mkAction('fa-arrow-up', 'Move Lower (Earlier in Stack)', idx === 0, '', () => {
        if (moveSectionInState(state, idx, -1)) {
          onSelectSection(idx - 1);
          onMutateState(true);
          onRerender();
        }
      }),
      mkAction('fa-arrow-down', 'Move Higher (Later in Stack)', idx >= state.sections.length - 1, '', () => {
        if (moveSectionInState(state, idx, 1)) {
          onSelectSection(idx + 1);
          onMutateState(true);
          onRerender();
        }
      }),
      mkAction(rawSec.locked ? 'fa-lock' : 'fa-unlock', rawSec.locked ? 'Unlock Section' : 'Lock Section', false, rawSec.locked ? 'locked' : '', () => {
        updateSectionPropertyInState(state, idx, 'locked', !rawSec.locked);
        onRerender();
      }),
      mkAction('fa-trash', 'Remove Section', state.sections.length <= 1, 'danger', () => {
        if (removeSectionFromState(state, idx)) {
          onSelectSection(Math.max(0, Math.min(safeIdx, state.sections.length - 1)));
          onMutateState(true);
          onRerender();
        }
      })
    );

    head.append(title, actions);

    const diagParts = [];
    if (sec.transitionDiagnostics?.clamped) diagParts.push('Clamped');
    if (sec.transitionDiagnostics?.needsCantileverSupport || sec.transitionMode === 'supported_cantilever') diagParts.push('Cantilever');
    const diagSuffix = diagParts.length ? ` · ${diagParts.join(' · ')}` : '';
    const meta = document.createElement('div');
    meta.className = 'section-card-meta';
    meta.textContent = `Fl ${sec.startFloor + 1}–${sec.endFloor} · ${roundNum(sec.width, 1)}×${roundNum(sec.depth, 1)}m · ${sec.footprint.replace(/_/g, ' ')}${diagSuffix}`;

    card.append(head, meta);
    listEl.appendChild(card);
  });

  container.appendChild(listEl);

  // Active Section Detail Editor
  const activeSec = state.sections[safeIdx];
  if (activeSec) {
    const editor = document.createElement('div');
    editor.className = 'section-editor-box';
    const editorHead = document.createElement('div');
    editorHead.className = 'studio-group';
    editorHead.textContent = `Editing Tier ${safeIdx + 1}: ${activeSec.label}`;
    editor.appendChild(editorHead);

    for (const def of SECTION_EDITOR_FIELDS) {
      const f = ctrlBuildFieldRow(
        def,
        activeSec[def.key],
        false,
        (nextVal, isLiveInput) => {
          updateSectionPropertyInState(state, safeIdx, def.key, nextVal);
          onMutateState(!isLiveInput);
          if (!isLiveInput && ['label', 'role', 'floors', 'width', 'depth', 'footprint'].includes(def.key)) {
            onRerender();
          }
        },
        null
      );
      editor.appendChild(f);
    }
    container.appendChild(editor);
  }
}

export function renderControls(tabId, container, state, locks, ctx) {
  if (!container) return;
  container.innerHTML = '';

  if (tabId === 'sections') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Stacked Building Sections';
    container.appendChild(grp);
    renderSectionStackManager(
      container,
      state,
      ctx.selectedSectionIndex || 0,
      ctx.onSelectSection,
      (immediateRebuild) => ctx.onStructureChanged(immediateRebuild),
      () => renderControls(tabId, container, state, locks, ctx)
    );
    return;
  }

  if (tabId === 'presets') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Architectural Styles & Presets';
    container.appendChild(grp);

    const grid = document.createElement('div');
    grid.className = 'preset-list';
    renderPresetList(grid, ctx.activePreset, ctx.onSelectPreset);
    container.appendChild(grid);
  }

  if (tabId === 'export') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Blueprint & Glb Model Export';
    container.appendChild(grp);

    const info = document.createElement('p');
    info.className = 'studio-help';
    info.textContent = 'All exports use unified preview geometry and preserve multi-tower positions, skybridges, sections, materials, and B Remastered entrance coordinates.';
    container.appendChild(info);

    const actions = [
      { id: 'tab-exp-bp', label: 'Export Blueprint (.skyscraper.json)', icon: 'fa-drafting-compass', primary: true, fn: ctx.onExportBlueprint },
      { id: 'tab-exp-glb', label: 'Export 3d Model (.glb)', icon: 'fa-cube', primary: false, fn: ctx.onExportGLB },
      { id: 'tab-exp-json', label: 'Export Settings (.json)', icon: 'fa-file-code', primary: false, fn: ctx.onExportJSON },
      { id: 'tab-exp-png', label: 'Capture Preview (.png)', icon: 'fa-camera', primary: false, fn: ctx.onSnapshot }
    ];
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = act.id;
      btn.className = 'studio-btn ' + (act.primary ? 'studio-btn-primary' : 'studio-btn-ghost');
      btn.style.width = '100%';
      btn.style.marginBottom = '7px';
      btn.innerHTML = `<i class="fas ${act.icon}"></i> ${act.label}`;
      btn.addEventListener('click', act.fn);
      container.appendChild(btn);
    }
    return;
  }

  const schemaRows = SCHEMA[tabId] || [];
  for (const row of schemaRows) {
    if (row.group) {
      const g = document.createElement('div');
      g.className = 'studio-group';
      g.textContent = row.group;
      container.appendChild(g);
      continue;
    }

    const key = row.key;
    const def = { ...row, type: row.type || 'range' };
    const isLocked = locks.has(key);

    const fieldEl = ctrlBuildFieldRow(
      def,
      state[key],
      isLocked,
      (val, isLiveInput) => {
        if (key === 'style') {
          const preset = PRESETS[getStyle(val).preset] || baseForStyle(val);
          ctx.onSelectPreset(copy(preset), getStyle(val).label, getStyle(val).preset);
          return;
        }
        state[key] = val;
        if (key === 'lightingTime') {
          ctx.onLightingTimeChanged(val);
          return;
        }
        if (key === 'crownLighting') {
          ctx.onMaterialChanged(true);
          return;
        }
        if (MATERIAL_INPLACE_KEYS.has(key)) {
          ctx.onMaterialChanged(false);
          return;
        }
        ctx.onStructureChanged(!isLiveInput);
      },
      key === 'seed' || key === 'style'
        ? null
        : () => {
            if (locks.has(key)) locks.delete(key);
            else locks.add(key);
            renderControls(tabId, container, state, locks, ctx);
          }
    );
    container.appendChild(fieldEl);
  }
}
