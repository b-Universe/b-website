import { tree$, treeSlugify } from '../utils.js';
import { TREE_OPTIONS, TREE_SCHEMA } from '../config.js';
import { TREE_CATEGORIES, TREE_PRESETS, TREE_SPECIES, getSpeciesMeta } from '../core/species.js';
import { TREE_SEASON_PALETTES } from '../materials/palettes.js';
import { generateTreeVariations } from '../core/variation.js';
import {
  TREE_PLACED_DETAIL_CATEGORIES,
  TREE_PLACED_DETAIL_TYPES,
  getPlacedDetailMeta
} from '../geometry/details.js';

export function formatTreeFieldValue(item, val) {
  if (item.type === 'checkbox') return val ? 'Enabled' : 'Off';
  if (item.type === 'color') return String(val || '').toUpperCase();
  if (item.type === 'select') {
    const opts = TREE_OPTIONS[item.options] || [];
    const found = opts.find((o) => o.value === val);
    return found ? found.label : String(val);
  }
  const num = Number(val);
  const decimals = item.step && item.step < 1 ? (item.step < 0.05 ? 2 : 1) : 0;
  return `${num.toFixed(decimals)}${item.unit || ''}`;
}

function renderPlacedDetailsStudio(container, state, locks, callbacks) {
  const wrap = document.createElement('div');
  wrap.className = 'placed-details-studio';

  const activeCategory = callbacks.detailCategory || 'all';
  const brush = callbacks.detailBrush || {};
  const meta = getPlacedDetailMeta(brush.kind || 'paper_lantern');
  const placed = Array.isArray(state.placedDetails) ? state.placedDetails : [];
  const isLocked = locks.has('placedDetails');

  const head = document.createElement('div');
  head.className = 'tree-field-group-head placed-details-head';
  head.innerHTML = `
    <div class="tree-field-title-wrap">
      <button type="button" class="tree-lock-btn ${isLocked ? 'locked' : ''}" id="btn-lock-placed-details"
        title="${isLocked ? 'Unlock Placed Details' : 'Lock Placed Details across preset switches'}">
        <i class="fas ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
      </button>
      <span>Custom Flowers, Fruits &amp; Hanging</span>
    </div>
    <span class="active-badge">${placed.length} Placed</span>
  `;
  wrap.appendChild(head);

  const lockBtn = head.querySelector('#btn-lock-placed-details');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      if (locks.has('placedDetails')) locks.delete('placedDetails');
      else locks.add('placedDetails');
      renderTreeControlsTab('details', state, locks, callbacks);
    });
  }

  const catRow = document.createElement('div');
  catRow.className = 'detail-cat-pills';
  TREE_PLACED_DETAIL_CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tree-cat-pill ${activeCategory === cat.id ? 'active' : ''}`;
    btn.innerHTML = `<i class="fas ${cat.icon}"></i><span>${cat.label}</span>`;
    btn.addEventListener('click', () => {
      if (callbacks.onSelectDetailCategory) callbacks.onSelectDetailCategory(cat.id);
    });
    catRow.appendChild(btn);
  });
  wrap.appendChild(catRow);

  const filteredTypes = TREE_PLACED_DETAIL_TYPES.filter(
    (d) => activeCategory === 'all' || d.category === activeCategory
  );

  const kindRow = document.createElement('div');
  kindRow.className = 'tree-field-row';
  kindRow.innerHTML = '<div class="tree-field-top"><label for="detail-brush-kind">Object To Place</label></div>';
  const sel = document.createElement('select');
  sel.id = 'detail-brush-kind';
  sel.className = 'select-field';
  filteredTypes.forEach((d) => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = d.label;
    if (d.id === meta.id) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    if (callbacks.onSelectDetailKind) callbacks.onSelectDetailKind(sel.value);
  });
  kindRow.appendChild(sel);
  wrap.appendChild(kindRow);

  const brushGrid = document.createElement('div');
  brushGrid.className = 'detail-brush-grid';
  brushGrid.innerHTML = `
    <label class="detail-mini-field">
      <span>Color</span>
      <input type="color" id="detail-brush-color" value="${brush.color || meta.defaultColor}" />
    </label>
    <label class="detail-mini-field">
      <span>Stem / Accent</span>
      <input type="color" id="detail-brush-accent" value="${brush.accentColor || meta.defaultAccent}" />
    </label>
    <label class="detail-mini-field">
      <span>Size (<b id="val-brush-scale">${(brush.scale ?? meta.defaultScale).toFixed(2)}×</b>)</span>
      <input type="range" id="detail-brush-scale" min="0.4" max="2.2" step="0.05" value="${brush.scale ?? meta.defaultScale}" />
    </label>
    <label class="detail-mini-field">
      <span>Cord Drop (<b id="val-brush-hang">${(brush.hangLength ?? meta.defaultHang).toFixed(2)}m</b>)</span>
      <input type="range" id="detail-brush-hang" min="0.0" max="1.8" step="0.02" value="${brush.hangLength ?? meta.defaultHang}" />
    </label>
  `;
  wrap.appendChild(brushGrid);

  const glowLabel = document.createElement('label');
  glowLabel.className = 'tree-bool-label';
  const glowChk = document.createElement('input');
  glowChk.type = 'checkbox';
  glowChk.id = 'detail-brush-emissive';
  glowChk.checked = brush.emissive !== undefined ? Boolean(brush.emissive) : Boolean(meta.defaultEmissive);
  glowLabel.appendChild(glowChk);
  const glowSpan = document.createElement('span');
  glowSpan.textContent = 'Glow Emissive (Lanterns & Arcane)';
  glowLabel.appendChild(glowSpan);
  wrap.appendChild(glowLabel);

  const bindBrush = (id, key, isNum = false) => {
    const el = brushGrid.querySelector(id) || wrap.querySelector(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const val = el.type === 'checkbox' ? el.checked : (isNum ? parseFloat(el.value) : el.value);
      if (id === '#detail-brush-scale') {
        const lbl = brushGrid.querySelector('#val-brush-scale');
        if (lbl) lbl.textContent = `${Number(val).toFixed(2)}×`;
      } else if (id === '#detail-brush-hang') {
        const lbl = brushGrid.querySelector('#val-brush-hang');
        if (lbl) lbl.textContent = `${Number(val).toFixed(2)}m`;
      }
      if (callbacks.onDetailBrushChange) callbacks.onDetailBrushChange(key, val);
    });
  };
  bindBrush('#detail-brush-color', 'color', false);
  bindBrush('#detail-brush-accent', 'accentColor', false);
  bindBrush('#detail-brush-scale', 'scale', true);
  bindBrush('#detail-brush-hang', 'hangLength', true);
  bindBrush('#detail-brush-emissive', 'emissive', false);

  const actionRow = document.createElement('div');
  actionRow.className = 'detail-action-row';
  actionRow.innerHTML = `
    <button type="button" class="studio-btn ${callbacks.placementMode ? 'studio-btn-primary active' : 'studio-btn-ghost'} studio-btn-sm" id="btn-toggle-place-mode">
      <i class="fas fa-location-crosshairs"></i> ${callbacks.placementMode ? 'Placing On Tree (D)' : 'Click Tree To Place (D)'}
    </button>
    <button type="button" class="studio-mini-btn" id="btn-scatter-placed-details" title="Attach 6 items onto tree branches & crown">
      <i class="fas fa-wand-magic-sparkles"></i> Scatter +6
    </button>
    <button type="button" class="studio-mini-btn" id="btn-undo-placed-detail" ${placed.length === 0 ? 'disabled' : ''}>
      <i class="fas fa-rotate-left"></i> Undo
    </button>
    <button type="button" class="studio-mini-btn" id="btn-clear-placed-details" ${placed.length === 0 ? 'disabled' : ''}>
      <i class="fas fa-trash"></i> Clear
    </button>
  `;
  wrap.appendChild(actionRow);

  actionRow.querySelector('#btn-toggle-place-mode')?.addEventListener('click', () => {
    if (callbacks.onTogglePlacementMode) callbacks.onTogglePlacementMode();
  });
  actionRow.querySelector('#btn-scatter-placed-details')?.addEventListener('click', () => {
    if (callbacks.onScatterDetails) callbacks.onScatterDetails();
  });
  actionRow.querySelector('#btn-undo-placed-detail')?.addEventListener('click', () => {
    if (callbacks.onUndoDetail) callbacks.onUndoDetail();
  });
  actionRow.querySelector('#btn-clear-placed-details')?.addEventListener('click', () => {
    if (callbacks.onClearDetails) callbacks.onClearDetails();
  });

  const listWrap = document.createElement('div');
  listWrap.className = 'placed-details-list';
  listWrap.id = 'placed-details-list';
  if (placed.length === 0) {
    listWrap.innerHTML = '<div class="studio-hint">No custom details placed yet. Enable Click Tree To Place (D) or use Scatter +6.</div>';
  } else {
    placed.forEach((item, idx) => {
      const m = getPlacedDetailMeta(item.kind);
      const rowEl = document.createElement('div');
      rowEl.className = 'placed-detail-row';
      rowEl.innerHTML = `
        <span class="placed-detail-swatch" style="background:${item.color};"></span>
        <div class="placed-detail-info">
          <strong>${m.label} #${idx + 1}</strong>
          <small>y=${item.position.y.toFixed(1)}m · ×${item.scale.toFixed(2)}${item.hangLength > 0 ? ` · cord ${item.hangLength.toFixed(2)}m` : ''}</small>
        </div>
        <button type="button" class="custom-preset-del" title="Remove ${m.label} #${idx + 1}">
          <i class="fas fa-times"></i>
        </button>
      `;
      rowEl.querySelector('.custom-preset-del').addEventListener('click', () => {
        if (callbacks.onRemoveDetail) callbacks.onRemoveDetail(item.id);
      });
      listWrap.appendChild(rowEl);
    });
  }
  wrap.appendChild(listWrap);

  container.appendChild(wrap);
}

export function renderTreeControlsTab(tabName, state, locks, callbacks) {
  const container = tree$('#tree-tab-content');
  if (!container) return;
  container.innerHTML = '';

  const fields = TREE_SCHEMA[tabName] || [];
  let lastGroup = null;

  if (tabName === 'details') {
    renderPlacedDetailsStudio(container, state, locks, callbacks);
  }

  if (tabName === 'seasons') {
    const seasonBar = document.createElement('div');
    seasonBar.className = 'tree-season-quickgrid';
    ['spring', 'summer', 'autumn', 'winter', 'blossom', 'arcane'].forEach((sKey) => {
      const pal = TREE_SEASON_PALETTES[sKey];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tree-season-chip ${state.season === sKey ? 'active' : ''}`;
      btn.style.setProperty('--chip-c1', pal.leaf1);
      btn.style.setProperty('--chip-c2', pal.leaf2);
      btn.innerHTML = `<span class="season-swatch"></span><span>${pal.label}</span>`;
      btn.addEventListener('click', () => {
        if (callbacks.onSelectSeason) callbacks.onSelectSeason(sKey);
      });
      seasonBar.appendChild(btn);
    });
    container.appendChild(seasonBar);
  }

  fields.forEach((item) => {
    if (Array.isArray(item.speciesFilter) && !item.speciesFilter.includes(state.species)) {
      return;
    }

    if (item.group && item.group !== lastGroup) {
      lastGroup = item.group;
      const head = document.createElement('div');
      head.className = 'tree-field-group-head';
      head.textContent = item.group;
      container.appendChild(head);
    }

    const row = document.createElement('div');
    row.className = `tree-field-row ${item.type === 'checkbox' ? 'is-bool' : ''}`;

    const isLocked = locks.has(item.key);
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = `tree-lock-btn ${isLocked ? 'locked' : ''}`;
    lockBtn.title = isLocked ? `Unlock ${item.label}` : `Lock ${item.label} during randomization`;
    lockBtn.innerHTML = `<i class="fas ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>`;
    lockBtn.addEventListener('click', () => {
      if (locks.has(item.key)) locks.delete(item.key);
      else locks.add(item.key);
      renderTreeControlsTab(tabName, state, locks, callbacks);
    });

    if (item.type === 'checkbox') {
      const label = document.createElement('label');
      label.className = 'tree-bool-label';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(state[item.key]);
      input.addEventListener('change', () => callbacks.onFieldChange(item.key, input.checked));
      const span = document.createElement('span');
      span.textContent = item.label;
      label.appendChild(input);
      label.appendChild(span);
      row.appendChild(lockBtn);
      row.appendChild(label);
      container.appendChild(row);
      return;
    }

    const top = document.createElement('div');
    top.className = 'tree-field-top';

    const left = document.createElement('div');
    left.className = 'tree-field-title-wrap';
    left.appendChild(lockBtn);

    const lbl = document.createElement('label');
    lbl.textContent = item.label;
    lbl.setAttribute('for', `ctrl-${item.key}`);
    left.appendChild(lbl);

    const badge = document.createElement('span');
    badge.className = 'control-val';
    badge.id = `val-${item.key}`;
    badge.textContent = formatTreeFieldValue(item, state[item.key]);

    top.appendChild(left);
    top.appendChild(badge);
    row.appendChild(top);

    if (item.type === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.id = `ctrl-${item.key}`;
      input.min = item.min;
      input.max = item.max;
      input.step = item.step;
      input.value = state[item.key];
      input.addEventListener('input', () => {
        const val = item.step >= 1 ? parseInt(input.value, 10) : parseFloat(input.value);
        badge.textContent = formatTreeFieldValue(item, val);
        callbacks.onFieldChange(item.key, val);
      });
      row.appendChild(input);
    } else if (item.type === 'select') {
      const sel = document.createElement('select');
      sel.id = `ctrl-${item.key}`;
      sel.className = 'select-field';
      const opts = TREE_OPTIONS[item.options] || [];
      opts.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === state[item.key]) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        badge.textContent = formatTreeFieldValue(item, sel.value);
        callbacks.onFieldChange(item.key, sel.value);
      });
      row.appendChild(sel);
    } else if (item.type === 'color') {
      const wrap = document.createElement('label');
      wrap.className = 'color-picker-wrap';
      const input = document.createElement('input');
      input.type = 'color';
      input.id = `ctrl-${item.key}`;
      input.value = state[item.key];
      const hexLabel = document.createElement('span');
      hexLabel.textContent = state[item.key];
      input.addEventListener('input', () => {
        hexLabel.textContent = input.value;
        badge.textContent = formatTreeFieldValue(item, input.value);
        callbacks.onFieldChange(item.key, input.value);
      });
      wrap.appendChild(input);
      wrap.appendChild(hexLabel);
      row.appendChild(wrap);
    }

    container.appendChild(row);
  });
}

export function renderSpeciesPicker(activeSpeciesId, activeCategory, onSelectSpecies, onSelectCategory) {
  const catWrap = tree$('#tree-category-tabs');
  if (catWrap) {
    catWrap.innerHTML = '';
    TREE_CATEGORIES.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tree-cat-pill ${activeCategory === cat.id ? 'active' : ''}`;
      btn.innerHTML = `<i class="fas ${cat.icon}"></i><span>${cat.label}</span>`;
      btn.addEventListener('click', () => onSelectCategory(cat.id));
      catWrap.appendChild(btn);
    });
  }

  const grid = tree$('#species-selector');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = TREE_SPECIES.filter((s) => activeCategory === 'all' || s.category === activeCategory);
  filtered.forEach((sp) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `species-btn ${sp.id === activeSpeciesId ? 'active' : ''}`;
    btn.dataset.species = sp.id;
    btn.title = sp.description;
    btn.innerHTML = `<i class="fas ${sp.icon}"></i><span>${sp.shortName}</span>`;
    btn.addEventListener('click', () => onSelectSpecies(sp.id));
    grid.appendChild(btn);
  });

  const activeMeta = getSpeciesMeta(activeSpeciesId);
  const badge = tree$('#active-species-badge');
  if (badge) badge.textContent = activeMeta.name;
}

export function renderPresetLibrary(activeCategory, searchQuery, onLoadPreset) {
  const container = tree$('#builtin-presets');
  const countBadge = tree$('#preset-count-badge');
  if (!container) return;
  container.innerHTML = '';

  const q = (searchQuery || '').trim().toLowerCase();
  const list = Object.values(TREE_PRESETS).filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q);
  });

  if (countBadge) countBadge.textContent = `${list.length} Presets`;

  list.forEach((preset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-chip';
    btn.dataset.preset = preset.id;
    btn.innerHTML = `<span class="preset-name">${preset.name}</span><small>${preset.species}</small>`;
    btn.addEventListener('click', () => onLoadPreset(preset));
    container.appendChild(btn);
  });
}

export function renderCustomPresetsList(onLoadPreset) {
  const container = tree$('#custom-presets-list');
  if (!container) return;
  try {
    const raw = localStorage.getItem('b_remastered_tree_presets');
    const list = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(list);
    container.innerHTML = '';
    if (keys.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'grid';
    keys.forEach((name) => {
      const wrap = document.createElement('div');
      wrap.className = 'custom-preset-item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip custom-chip';
      btn.textContent = name;
      btn.addEventListener('click', () => onLoadPreset(list[name], name));

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'custom-preset-del';
      del.title = `Delete ${name}`;
      del.innerHTML = '<i class="fas fa-times"></i>';
      del.addEventListener('click', () => {
        delete list[name];
        localStorage.setItem('b_remastered_tree_presets', JSON.stringify(list));
        renderCustomPresetsList(onLoadPreset);
      });

      wrap.appendChild(btn);
      wrap.appendChild(del);
      container.appendChild(wrap);
    });
  } catch (_) {
    container.style.display = 'none';
  }
}

export function renderVariationStrip(state, locks, onApplyVariant) {
  const grid = tree$('#variation-browser-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const variants = generateTreeVariations(state, 6, locks);
  variants.forEach((v) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `variation-card ${v.seed === state.seed ? 'active' : ''}`;
    card.innerHTML = `
      <div class="variation-swatches">
        <span style="background:${v.config.colorLeaf1}"></span>
        <span style="background:${v.config.colorLeaf2}"></span>
        <span style="background:${v.config.colorBark}"></span>
      </div>
      <strong>${v.label}</strong>
      <small>${v.config.height.toFixed(1)}m · ${v.config.branches} limbs</small>
    `;
    card.addEventListener('click', () => onApplyVariant(v.config));
    grid.appendChild(card);
  });
}

export function saveCustomTreePreset(name, state, onDone) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return false;
  try {
    const raw = localStorage.getItem('b_remastered_tree_presets');
    const list = raw ? JSON.parse(raw) : {};
    list[cleanName] = { ...state, id: treeSlugify(cleanName) };
    localStorage.setItem('b_remastered_tree_presets', JSON.stringify(list));
    if (onDone) onDone();
    return true;
  } catch (_) {
    return false;
  }
}
