import { $, $$, clamp, copy, colorHex, randBetween, randInt, pick, rng32 } from '../utils.js';
import {
  STYLES,
  BASE,
  PRESETS,
  OPTIONS,
  SCHEMA,
  CATEGORIES,
  MATERIAL_CHOICES,
  COLOR_CHOICES,
  STORAGE_KEY,
  getStyle,
  baseForStyle
} from '../config.js';
import { computeDefaultEntranceGameplay } from '../core/entrances.js';

export function createInputControl(item, currentValue, options = {}) {
  const { maxFloors = 14 } = options;
  const key = item.key;
  let input;

  if (item.type === 'select') {
    input = document.createElement('select');
    for (const [val, title] of (OPTIONS[key] || [])) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = title;
      input.appendChild(opt);
    }
    input.value = String(currentValue);
  } else if (item.type === 'boolean') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(currentValue);
  } else if (item.type === 'color') {
    input = document.createElement('input');
    input.type = 'color';
    input.value = colorHex(currentValue);
  } else if (item.type === 'text') {
    input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 48;
    input.className = 'studio-textbox';
    input.style.width = '100%';
    input.value = String(currentValue ?? '');
  } else if (item.type === 'floor') {
    input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = maxFloors;
    input.step = 1;
    input.value = String(currentValue ?? 0);
  } else if (item.type === 'floorNumber') {
    input = document.createElement('input');
    input.type = 'range';
    input.min = 1;
    input.max = maxFloors;
    input.step = 1;
    input.value = String(currentValue || 1);
  } else {
    input = document.createElement('input');
    input.type = 'range';
    input.min = item.min;
    input.max = item.max;
    input.step = item.step || 1;
    input.value = String(currentValue);
  }

  input.id = 'control-' + key;
  input.dataset.key = key;
  return input;
}

export function createLockButton(key, isLocked, onToggle) {
  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = 'studio-lock' + (isLocked ? ' locked' : '');
  lock.title = isLocked ? 'Unlock this setting' : 'Lock this setting during randomization';
  lock.setAttribute('aria-label', lock.title);
  lock.innerHTML = `<i class="fas fa-${isLocked ? 'lock' : 'lock-open'}"></i>`;
  lock.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle(key);
  });
  return lock;
}

export function renderStandardFieldLayout(item, state, isLocked, input, onToggleLock) {
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
    const displayVal = (item.type === 'floor' && state[key] === 0) ? 'All' : state[key];
    valueBadge.textContent = displayVal + (item.unit || '');
    end.appendChild(valueBadge);
  }

  const lock = createLockButton(key, isLocked, onToggleLock);
  end.appendChild(lock);

  head.append(label, end);
  wrap.appendChild(head);
  wrap.appendChild(input);

  if (item.info) {
    const help = document.createElement('p');
    help.className = 'studio-help';
    help.textContent = item.info;
    wrap.appendChild(help);
  }

  return { wrap, valueBadge };
}

export function renderInlineBooleanFieldLayout(item, state, isLocked, input, onToggleLock) {
  const key = item.key;
  const wrap = document.createElement('div');
  wrap.className = 'studio-control-group studio-field studio-field-inline';
  wrap.dataset.key = key;

  const row = document.createElement('div');
  row.className = 'studio-row-inline';

  const lock = createLockButton(key, isLocked, onToggleLock);

  const label = document.createElement('label');
  label.htmlFor = 'control-' + key;
  label.textContent = item.name;

  row.append(input, lock, label);
  wrap.appendChild(row);

  if (item.info) {
    const help = document.createElement('p');
    help.className = 'studio-help';
    help.textContent = item.info;
    wrap.appendChild(help);
  }

  return { wrap, valueBadge: null };
}

export function renderFieldLayout(item, state, isLocked, input, onToggleLock, options = {}) {
  if (options.useInlineBooleans && item.type === 'boolean') {
    return renderInlineBooleanFieldLayout(item, state, isLocked, input, onToggleLock);
  }
  return renderStandardFieldLayout(item, state, isLocked, input, onToggleLock);
}

export function applyDependentRules(key, value, state, locks, prevDefaults) {
  let needsRerender = false;

  if (['groundUse', 'doorStyle', 'entranceSteps', 'floorHeight'].includes(key)) {
    const nextDefaults = computeDefaultEntranceGameplay(state);
    if (!locks.has('triggerWidth') && Math.abs(state.triggerWidth - prevDefaults.triggerWidth) < 0.05) {
      state.triggerWidth = nextDefaults.triggerWidth;
    }
    if (!locks.has('triggerHeight') && Math.abs(state.triggerHeight - prevDefaults.triggerHeight) < 0.05) {
      state.triggerHeight = nextDefaults.triggerHeight;
    }
    if (!locks.has('triggerDepth') && Math.abs(state.triggerDepth - prevDefaults.triggerDepth) < 0.05) {
      state.triggerDepth = nextDefaults.triggerDepth;
    }
    if (key === 'groundUse') {
      if (!locks.has('entranceCategory') && state.entranceCategory === prevDefaults.entranceCategory) {
        state.entranceCategory = nextDefaults.entranceCategory;
      }
      if (!locks.has('interactionLabel') && state.interactionLabel === prevDefaults.interactionLabel) {
        state.interactionLabel = nextDefaults.interactionLabel;
      }
    }
  }

  if (key === 'floors') {
    state.inspectedFloor = clamp(state.inspectedFloor, 0, value);
    state.accentFloor = clamp(state.accentFloor, 1, value);
  }
  if (key === 'footprint' && value === 'corner' && state.cornerCut <= 0) {
    state.cornerCut = 1.5;
  }
  if (key === 'windowDamageStyle' && state.damage <= 0) {
    state.damage = 0.35;
    needsRerender = true;
  }
  if (key === 'signText' && state.signage === 'none' && String(value).trim().length > 0) {
    state.signage = state.groundUse === 'shop' ? 'shop' : 'marquee';
  }
  if (['roomsPerFloor', 'stairwell', 'elevator'].includes(key) && state.interiorMode === 'none') {
    state.interiorMode = key === 'roomsPerFloor' ? 'apartments' : 'basic';
    if (!state.cutaway && state.inspectedFloor === 0) state.cutaway = true;
    needsRerender = true;
  }

  if (key === 'accentFloor' || key === 'accentSide') {
    const prev = state.floorOverrides.find((o) => o.floor === (state.accentFloor || 1) && o.side === state.accentSide);
    if (prev) state.accentFloorColor = prev.color;
  }

  return needsRerender;
}

export function renderSpecializedActions(panel, key, activeTab, state, context) {
  const { view, toggleEntranceDebug, renderControls, scheduleRebuild, toast } = context;

  if (key === 'triggerDepth') {
    const bar = document.createElement('div');
    bar.className = 'studio-blueprint-bar';

    const autoFitBtn = document.createElement('button');
    autoFitBtn.type = 'button';
    autoFitBtn.className = 'studio-btn studio-btn-ghost';
    autoFitBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Auto-Fit Trigger to Door';
    autoFitBtn.onclick = () => {
      const def = computeDefaultEntranceGameplay(state);
      state.triggerWidth = def.triggerWidth;
      state.triggerHeight = def.triggerHeight;
      state.triggerDepth = def.triggerDepth;
      renderControls();
      scheduleRebuild();
      if (toast) toast('Trigger dimensions fitted to door & stoop geometry');
    };

    const debugBtn = document.createElement('button');
    debugBtn.type = 'button';
    debugBtn.className = 'studio-btn ' + (view.entranceDebug ? 'studio-btn-primary' : 'studio-btn-ghost');
    debugBtn.innerHTML = `<i class="fas fa-door-open"></i> ${view.entranceDebug ? 'Hide Entrance Debug' : 'Show Entrance Debug'}`;
    debugBtn.onclick = () => {
      toggleEntranceDebug();
      renderControls();
    };

    bar.append(autoFitBtn, debugBtn);
    panel.appendChild(bar);
  }

  if (activeTab === 'interior' && key === 'accentFloorColor') {
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
      if (toast) toast('Floor color applied');
    };

    const clear = document.createElement('button');
    clear.className = 'studio-btn studio-btn-ghost';
    clear.type = 'button';
    clear.textContent = 'Clear this override';
    clear.onclick = () => {
      state.floorOverrides = state.floorOverrides.filter((o) => !(o.floor === (state.accentFloor || 1) && o.side === state.accentSide));
      scheduleRebuild();
      if (toast) toast('Floor override cleared');
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

export function renderControls(panel, activeTab, state, locks, context = {}) {
  if (!panel) return;
  panel.innerHTML = '';
  const rows = SCHEMA[activeTab] || [];

  const onToggleLock = (k) => {
    if (locks.has(k)) locks.delete(k);
    else locks.add(k);
    renderControls(panel, activeTab, state, locks, context);
  };

  for (const item of rows) {
    if (item.group) {
      const group = document.createElement('div');
      group.className = 'studio-group-label';
      group.textContent = item.group;
      panel.appendChild(group);
      continue;
    }

    const key = item.key;
    const input = createInputControl(item, state[key], { maxFloors: state.floors });
    const { wrap, valueBadge } = renderFieldLayout(item, state, locks.has(key), input, onToggleLock);

    const eventName = ['color', 'text', 'select', 'boolean'].includes(item.type) ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      const prevDefaults = computeDefaultEntranceGameplay(state);
      const value = item.type === 'boolean'
        ? input.checked
        : (!item.type || item.type === 'floor' || item.type === 'floorNumber')
          ? Number(input.value)
          : input.value;
      state[key] = value;

      const needsRerender = applyDependentRules(key, value, state, locks, prevDefaults);

      if (valueBadge) {
        valueBadge.textContent = (item.type === 'floor' && value === 0 ? 'All' : value) + (item.unit || '');
      }

      if (context.onSettingChanged) {
        context.onSettingChanged(key, value);
      }

      if (needsRerender) {
        renderControls(panel, activeTab, state, locks, context);
      }

      if (['accentFloor', 'accentSide', 'accentFloorColor'].includes(key)) return;
      if (context.scheduleRebuild) context.scheduleRebuild();
    });

    if (['floors', 'footprint', 'groundUse', 'doorStyle', 'entranceSteps', 'accentFloor', 'accentSide'].includes(key)) {
      input.addEventListener('change', () => renderControls(panel, activeTab, state, locks, context));
    }

    panel.appendChild(wrap);
    renderSpecializedActions(panel, key, activeTab, state, context);
  }
}

export function updateStylePicker(currentStyle) {
  $$('#style-picker .style-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.style === currentStyle));
  const descriptor = getStyle(currentStyle);
  const nameEl = $('#active-style-name');
  if (nameEl) nameEl.textContent = descriptor.label;
  const labelEl = $('#scene-label');
  if (labelEl) {
    labelEl.textContent = `${String(STYLES.findIndex((x) => x.id === currentStyle) + 1).padStart(2, '0')} / ${descriptor.label.toUpperCase()}`;
  }
}

export function renderStylePicker(container, currentStyle, onLoadPreset) {
  if (!container) return;
  container.innerHTML = '';
  for (const entry of STYLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'style-option';
    button.dataset.style = entry.id;
    button.innerHTML = `<i class="fas ${entry.icon}" aria-hidden="true"></i><span>${entry.label}</span>`;
    button.addEventListener('click', () => onLoadPreset(baseForStyle(entry.id), entry.label, entry.preset));
    container.appendChild(button);
  }
  updateStylePicker(currentStyle);
}

export function updatePresetList(activePreset) {
  $$('#preset-list .preset-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.preset === activePreset));
}

export function renderPresetList(container, activePreset, onLoadPreset) {
  if (!container) return;
  container.innerHTML = '';
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
    button.addEventListener('click', () => onLoadPreset(baseForStyle(entry.id), PRESETS[entry.preset].label, entry.preset));
    container.appendChild(button);
  }
  updatePresetList(activePreset);
}

export function renderCustomPresets(container, savedPresets, onLoadCustom, onDeleteCustom) {
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(savedPresets);
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-help';
    empty.textContent = 'Save your custom buildings to reload them later.';
    container.appendChild(empty);
    return;
  }
  for (const [name, data] of entries) {
    const row = document.createElement('div');
    row.className = 'custom-preset-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-preset-btn';
    btn.textContent = name;
    btn.onclick = () => onLoadCustom(data, name);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'custom-preset-del';
    del.innerHTML = '&times;';
    del.title = 'Delete preset';
    del.onclick = (e) => {
      e.stopPropagation();
      onDeleteCustom(name);
    };
    row.append(btn, del);
    container.appendChild(row);
  }
}

const GAMEPLAY_ENTRANCE_KEYS = new Set([
  'entranceEnabled', 'entranceCategory', 'interactionDistance',
  'triggerWidth', 'triggerHeight', 'triggerDepth',
  'entranceLocked', 'interactionLabel'
]);

export function randomizeSettings(category, state, locks, context = {}) {
  const all = category === 'all';
  const keys = all
    ? [...new Set([...CATEGORIES.form, ...CATEGORIES.facade, ...CATEGORIES.features, ...CATEGORIES.palette])]
    : (CATEGORIES[category] || []);
  const r = rng32(Math.floor(Math.random() * 0xffffffff));

  for (const key of keys) {
    if (locks.has(key) || GAMEPLAY_ENTRANCE_KEYS.has(key)) continue;
    const def = Object.values(SCHEMA).flat().find((x) => x.key === key);
    if (!def) continue;

    if (def.type === 'color') {
      state[key] = pick(r, key === 'wallColor' || key === 'groundFloorColor' ? MATERIAL_CHOICES : COLOR_CHOICES);
    } else if (def.type === 'select') {
      if (['wallMaterial', 'groundFloorMaterial', 'footprint', 'roofType', 'windowStyle', 'windowDamageStyle', 'facadeAccent', 'groundUse', 'signage', 'doorStyle'].includes(key)) {
        state[key] = pick(r, OPTIONS[key])[0];
      }
    } else if (def.type === 'boolean') {
      state[key] = r() > 0.55;
    } else if (def.type === 'text' || def.type === 'floor' || def.type === 'floorNumber') {
      continue;
    } else if (typeof def.min === 'number') {
      const steps = Math.round((def.max - def.min) / def.step);
      state[key] = Number((def.min + randInt(r, 0, steps) * def.step).toFixed(3));
    }
  }

  const autoEntrance = computeDefaultEntranceGameplay(state);
  for (const [k, v] of Object.entries(autoEntrance)) {
    if (!locks.has(k)) state[k] = v;
  }

  state.seed = Math.floor(Math.random() * 99999998) + 1;
  state.inspectedFloor = clamp(state.inspectedFloor, 0, state.floors);
  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = state.seed;

  if (context.onResetActivePreset) context.onResetActivePreset();
  if (context.renderControlsUI) context.renderControlsUI();
  if (context.scheduleRebuild) context.scheduleRebuild();
  if (context.toast) context.toast(`Randomized ${all ? 'unlocked settings' : category}`);
}
