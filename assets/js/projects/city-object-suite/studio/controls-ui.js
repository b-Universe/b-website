import { $, copy, roundNum } from '../utils.js';
import {
  STORAGE_KEY,
  CONDITION_LEVELS,
  VARIATION_MODES,
  ATTACHMENT_PROFILES
} from '../core/categories.js';
import { getObjectFamily } from '../core/registry.js';
import { OBJECT_MATERIAL_FAMILIES, URBAN_PALETTES, generateObjectPalette } from '../materials/palettes.js';

function ctrlEscapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ctrlLockButtonHtml(key, locks) {
  const locked = locks.has(key);
  return `<button type="button" class="studio-lock ${locked ? 'locked' : ''}" data-lock="${key}" title="Lock / Unlock Property">
    <i class="fa-solid ${locked ? 'fa-lock' : 'fa-unlock'}"></i>
  </button>`;
}

function ctrlRenderSchemaField(field, state, locks) {
  if (field.group) {
    return `<div class="ctrl-group-title">${ctrlEscapeHtml(field.group)}</div>`;
  }
  const key = field.key;
  const fieldLabel = field.label || field.name || key;
  const val = state[key];
  const lockBtn = ctrlLockButtonHtml(key, locks);

  if (field.type === 'boolean') {
    return `
      <div class="ctrl-row ctrl-bool-row">
        <label class="ctrl-label" for="ctrl-${key}">${ctrlEscapeHtml(fieldLabel)}</label>
        <div class="ctrl-actions">
          <label class="switch-pill">
            <input type="checkbox" id="ctrl-${key}" data-key="${key}" data-kind="boolean" ${val ? 'checked' : ''}>
            <span>${val ? 'On' : 'Off'}</span>
          </label>
          ${lockBtn}
        </div>
      </div>
    `;
  }

  if (field.type === 'select') {
    const opts = (field.options || []).map(([id, label]) =>
      `<option value="${ctrlEscapeHtml(id)}" ${val === id ? 'selected' : ''}>${ctrlEscapeHtml(label)}</option>`
    ).join('');
    return `
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-${key}">${ctrlEscapeHtml(fieldLabel)}</label>
          ${lockBtn}
        </div>
        <select id="ctrl-${key}" class="ctrl-input" data-key="${key}" data-kind="select">${opts}</select>
      </div>
    `;
  }

  if (field.type === 'text') {
    return `
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-${key}">${ctrlEscapeHtml(fieldLabel)}</label>
          ${lockBtn}
        </div>
        <input type="text" id="ctrl-${key}" class="ctrl-input" data-key="${key}" data-kind="text" value="${ctrlEscapeHtml(val || '')}" maxlength="${field.maxLength || 36}">
      </div>
    `;
  }

  if (field.type === 'color') {
    return `
      <div class="ctrl-row ctrl-color-row">
        <label class="ctrl-label" for="ctrl-${key}">${ctrlEscapeHtml(fieldLabel)}</label>
        <div class="ctrl-actions">
          <input type="color" id="ctrl-${key}" class="ctrl-color" data-key="${key}" data-kind="color" value="${ctrlEscapeHtml(val || '#ffffff')}">
          ${lockBtn}
        </div>
      </div>
    `;
  }

  // Range / Numeric slider
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step || 0.05;
  const unit = field.unit ? ` ${field.unit}` : '';
  return `
    <div class="ctrl-row">
      <div class="ctrl-row-head">
        <label class="ctrl-label" for="ctrl-${key}">${ctrlEscapeHtml(fieldLabel)}</label>
        <div class="ctrl-readout-wrap">
          <span class="ctrl-readout" id="val-${key}">${ctrlEscapeHtml(val)}${ctrlEscapeHtml(unit)}</span>
          ${lockBtn}
        </div>
      </div>
      <input type="range" id="ctrl-${key}" class="ctrl-range" data-key="${key}" data-kind="range" data-unit="${ctrlEscapeHtml(unit)}" min="${min}" max="${max}" step="${step}" value="${val}">
    </div>
  `;
}

export function loadSavedCityObjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedCityObjects(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

export function renderObjectControlsPanel(state, view, locks, activeTab, blueprint, callbacks) {
  const container = $('#studio-tab-content');
  if (!container) return;

  const viewKey = `${state.familyId}:${activeTab}`;
  const sameView = container.dataset?.lastViewKey === viewKey;
  const prevScrollTop = sameView ? container.scrollTop : 0;
  if (container.dataset) container.dataset.lastViewKey = viewKey;

  const family = getObjectFamily(state.familyId);
  const schema = family?.schema || [];

  if (activeTab === 'structure') {
    const fieldsHtml = schema
      .filter((f) => !f.tab || f.tab === 'structure')
      .map((f) => ctrlRenderSchemaField(f, state, locks))
      .join('');

    const varOpts = VARIATION_MODES.map((m) =>
      `<option value="${m.id}" ${state.variationMode === m.id ? 'selected' : ''}>${ctrlEscapeHtml(m.label)}</option>`
    ).join('');

    container.innerHTML = `
      <div class="ctrl-group-title">Seed &amp; Procedural Variation</div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-seed">Deterministic Seed</label>
          ${ctrlLockButtonHtml('seed', locks)}
        </div>
        <div class="ctrl-seed-row">
          <input type="number" id="ctrl-seed" class="ctrl-input" min="1" max="99999999" value="${state.seed}">
          <button type="button" id="btn-seed-bump" class="studio-btn ghost" title="New Random Seed">
            <i class="fa-solid fa-dice"></i>
          </button>
        </div>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-variationMode">Variation Spread</label>
          ${ctrlLockButtonHtml('variationMode', locks)}
        </div>
        <select id="ctrl-variationMode" class="ctrl-input" data-key="variationMode" data-kind="select">${varOpts}</select>
      </div>
      ${fieldsHtml || '<div class="ctrl-empty">No structural controls defined for this prop.</div>'}
    `;
  } else if (activeTab === 'details') {
    const condOpts = CONDITION_LEVELS.map((c) =>
      `<option value="${c.id}" ${state.condition === c.id ? 'selected' : ''}>${ctrlEscapeHtml(c.label)}</option>`
    ).join('');
    const detailFields = schema
      .filter((f) => f.tab === 'details')
      .map((f) => ctrlRenderSchemaField(f, state, locks))
      .join('');

    container.innerHTML = `
      <div class="ctrl-group-title">Wear &amp; Environmental Condition</div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-condition">Condition Level</label>
          ${ctrlLockButtonHtml('condition', locks)}
        </div>
        <select id="ctrl-condition" class="ctrl-input" data-key="condition" data-kind="select">${condOpts}</select>
      </div>
      ${detailFields || '<div class="ctrl-empty">Condition controls all weathering decals on this prop.</div>'}
      <div class="ctrl-group-title">Quick Randomize Sub-Scopes</div>
      <div class="ctrl-btn-grid">
        <button type="button" class="studio-btn ghost" data-rand-scope="dimensions">Rand Dims</button>
        <button type="button" class="studio-btn ghost" data-rand-scope="details">Rand Details</button>
        <button type="button" class="studio-btn ghost" data-rand-scope="condition">Rand Condition</button>
      </div>
    `;
  } else if (activeTab === 'materials') {
    const palOpts = Object.values(URBAN_PALETTES).map((p) =>
      `<option value="${p.id}" ${state.paletteFamily === p.id ? 'selected' : ''}>${ctrlEscapeHtml(p.label)}</option>`
    ).join('');
    const matFamOpts = (current) => Object.values(OBJECT_MATERIAL_FAMILIES).map((mf) =>
      `<option value="${mf.id}" ${current === mf.id ? 'selected' : ''}>${ctrlEscapeHtml(mf.label)}</option>`
    ).join('');
    const customMatFields = schema
      .filter((f) => f.tab === 'materials')
      .map((f) => ctrlRenderSchemaField(f, state, locks))
      .join('');

    container.innerHTML = `
      <div class="ctrl-group-title">Urban Palette Generator</div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-paletteFamily">Palette Theme</label>
          ${ctrlLockButtonHtml('paletteFamily', locks)}
        </div>
        <div class="ctrl-seed-row">
          <select id="ctrl-paletteFamily" class="ctrl-input" data-key="paletteFamily" data-kind="select">${palOpts}</select>
          <button type="button" id="btn-apply-palette" class="studio-btn ghost" title="Apply Palette Theme Now">Apply</button>
        </div>
      </div>

      <div class="ctrl-group-title">Material Surfaces &amp; Colors</div>
      <div class="ctrl-mat-slot">
        <div class="ctrl-row-head">
          <span class="ctrl-label">Primary Surface</span>
          <div class="ctrl-actions">
            ${ctrlLockButtonHtml('primaryMaterial', locks)}
            ${ctrlLockButtonHtml('primaryColor', locks)}
          </div>
        </div>
        <div class="ctrl-slot-pair">
          <select class="ctrl-input" data-key="primaryMaterial" data-kind="select">${matFamOpts(state.primaryMaterial)}</select>
          <input type="color" class="ctrl-color" data-key="primaryColor" data-kind="color" value="${state.primaryColor}">
        </div>
      </div>

      <div class="ctrl-mat-slot">
        <div class="ctrl-row-head">
          <span class="ctrl-label">Secondary / Trim</span>
          <div class="ctrl-actions">
            ${ctrlLockButtonHtml('secondaryMaterial', locks)}
            ${ctrlLockButtonHtml('secondaryColor', locks)}
          </div>
        </div>
        <div class="ctrl-slot-pair">
          <select class="ctrl-input" data-key="secondaryMaterial" data-kind="select">${matFamOpts(state.secondaryMaterial)}</select>
          <input type="color" class="ctrl-color" data-key="secondaryColor" data-kind="color" value="${state.secondaryColor}">
        </div>
      </div>

      <div class="ctrl-mat-slot">
        <div class="ctrl-row-head">
          <span class="ctrl-label">Accent / Signage</span>
          <div class="ctrl-actions">
            ${ctrlLockButtonHtml('accentMaterial', locks)}
            ${ctrlLockButtonHtml('accentColor', locks)}
          </div>
        </div>
        <div class="ctrl-slot-pair">
          <select class="ctrl-input" data-key="accentMaterial" data-kind="select">${matFamOpts(state.accentMaterial)}</select>
          <input type="color" class="ctrl-color" data-key="accentColor" data-kind="color" value="${state.accentColor}">
        </div>
      </div>

      <div class="ctrl-mat-slot">
        <div class="ctrl-row-head">
          <span class="ctrl-label">Frame / Hardware</span>
          <div class="ctrl-actions">
            ${ctrlLockButtonHtml('frameMaterial', locks)}
            ${ctrlLockButtonHtml('frameColor', locks)}
          </div>
        </div>
        <div class="ctrl-slot-pair">
          <select class="ctrl-input" data-key="frameMaterial" data-kind="select">${matFamOpts(state.frameMaterial)}</select>
          <input type="color" class="ctrl-color" data-key="frameColor" data-kind="color" value="${state.frameColor}">
        </div>
      </div>

      <div class="ctrl-color-mini-grid">
        <label class="ctrl-mini-color">
          <span>Wood</span>
          <input type="color" data-key="woodColor" data-kind="color" value="${state.woodColor}">
        </label>
        <label class="ctrl-mini-color">
          <span>Concrete</span>
          <input type="color" data-key="concreteColor" data-kind="color" value="${state.concreteColor}">
        </label>
        <label class="ctrl-mini-color">
          <span>Glass</span>
          <input type="color" data-key="glassColor" data-kind="color" value="${state.glassColor}">
        </label>
        <label class="ctrl-mini-color">
          <span>Emissive</span>
          <input type="color" data-key="emissiveColor" data-kind="color" value="${state.emissiveColor}">
        </label>
      </div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-glassOpacity">Glass Opacity (0.05 Clear – 1 Solid)</label>
          <div class="ctrl-readout-wrap">
            <span class="ctrl-readout" id="val-glassOpacity">${ctrlEscapeHtml(state.glassOpacity !== undefined ? state.glassOpacity : 0.35)}</span>
            ${ctrlLockButtonHtml('glassOpacity', locks)}
          </div>
        </div>
        <input type="range" id="ctrl-glassOpacity" class="ctrl-range" data-key="glassOpacity" data-kind="range" data-unit="" min="0.05" max="1" step="0.05" value="${ctrlEscapeHtml(state.glassOpacity !== undefined ? state.glassOpacity : 0.35)}">
      </div>
      ${customMatFields}
      <div class="ctrl-btn-grid">
        <button type="button" class="studio-btn ghost" data-rand-scope="materials">Randomize Palette &amp; Colors</button>
      </div>
    `;
  } else if (activeTab === 'placement') {
    const supported = family?.supportedAttachments || [family?.attachmentProfile || 'ground_standing'];
    const attachOpts = supported.map((id) => {
      const meta = ATTACHMENT_PROFILES[id] || ATTACHMENT_PROFILES.ground_standing;
      return `<option value="${id}" ${state.attachmentProfile === id ? 'selected' : ''}>${ctrlEscapeHtml(meta.label)}</option>`;
    }).join('');
    const currentAttach = ATTACHMENT_PROFILES[state.attachmentProfile] || ATTACHMENT_PROFILES.ground_standing;

    const stageOptions = [
      ['auto', 'Auto From Object Profile'],
      ['desk_surface', 'Office Desk Surface'],
      ['interior_floor', 'Interior Carpet Floor'],
      ['arcade_floor', 'Arcade Carpet Floor'],
      ['office_corner', 'Office Room Corner'],
      ['reception_lobby', 'Corporate Reception Lobby'],
      ['street_curb', 'Street Curb & Sidewalk'],
      ['ground_sidewalk', 'Flat Concrete Sidewalk'],
      ['wall_facade', 'Brick Wall Facade'],
      ['rooftop_deck', 'Rooftop Deck & Parapet'],
      ['studio_pad', 'Neutral Studio Disc'],
      ['none', 'Void / No Stage']
    ];
    const stageSelectHtml = stageOptions.map(([id, label]) =>
      `<option value="${id}" ${(view.stage || 'auto') === id ? 'selected' : ''}>${ctrlEscapeHtml(label)}</option>`
    ).join('');

    const dim = blueprint?.dimensions || { widthMeters: 0, heightMeters: 0, depthMeters: 0 };
    const col = blueprint?.placement?.collisionProxy;
    const compListHtml = Array.isArray(blueprint?.components)
      ? `<div class="ctrl-group-title">Assembly Children (${blueprint.components.length})</div>
         <div class="bp-comp-list">
           ${blueprint.components.map((c) => `
             <div class="bp-comp-row">
               <strong>${ctrlEscapeHtml(c.label)}</strong>
               <span>(${c.localPositionMeters.join(', ')})m · Rot ${c.localRotationDeg[1]}°</span>
             </div>
           `).join('')}
         </div>`
      : '';

    container.innerHTML = `
      <div class="ctrl-group-title">Placement &amp; Attachment Profile</div>
      <div class="ctrl-row">
        <div class="ctrl-row-head">
          <label class="ctrl-label" for="ctrl-attachmentProfile">Attachment Profile</label>
          ${ctrlLockButtonHtml('attachmentProfile', locks)}
        </div>
        <select id="ctrl-attachmentProfile" class="ctrl-input" data-key="attachmentProfile" data-kind="select">${attachOpts}</select>
        <div class="ctrl-hint">Origin: ${ctrlEscapeHtml(currentAttach.originDesc)} · Normal [${currentAttach.surfaceNormal.join(', ')}]</div>
      </div>

      <div class="ctrl-group-title">Viewport Context Stage</div>
      <div class="ctrl-row">
        <label class="ctrl-label" for="ctrl-stage-select">Stage Environment</label>
        <select id="ctrl-stage-select" class="ctrl-input">${stageSelectHtml}</select>
      </div>
      <div class="ctrl-helper-checks">
        <label><input type="checkbox" data-helper="grid" ${view.helpers?.grid !== false ? 'checked' : ''}> Reference Grid</label>
        <label><input type="checkbox" data-helper="humanScale" ${view.helpers?.humanScale !== false ? 'checked' : ''}> 1.75m Human Reference</label>
        <label><input type="checkbox" data-helper="wall" ${view.helpers?.wall ? 'checked' : ''}> Back Masonry Wall</label>
        <label><input type="checkbox" data-helper="sidewalk" ${view.helpers?.sidewalk ? 'checked' : ''}> Sidewalk Curb Base</label>
        <label><input type="checkbox" data-helper="parkingSpace" ${view.helpers?.parkingSpace ? 'checked' : ''}> Parking Bay Stripes</label>
      </div>

      <div class="ctrl-group-title">Blueprint Readout</div>
      <div class="bp-summary-card">
        <div><span>Meters (W×H×D)</span><strong>${roundNum(dim.widthMeters, 2)} × ${roundNum(dim.heightMeters, 2)} × ${roundNum(dim.depthMeters, 2)} m</strong></div>
        <div><span>B Units</span><strong>${roundNum(dim.bGameUnits?.width || 0, 1)} × ${roundNum(dim.bGameUnits?.height || 0, 1)} × ${roundNum(dim.bGameUnits?.depth || 0, 1)}</strong></div>
        <div><span>Location Context</span><strong>${ctrlEscapeHtml(blueprint?.identity?.locationContext || 'exterior')}</strong></div>
        <div><span>Snap Anchors</span><strong>${blueprint?.placement?.anchors?.length || 0}</strong></div>
        <div><span>Collision</span><strong>${col?.passable ? 'Passable' : 'Solid Proxy'}</strong></div>
        <div><span>Interaction</span><strong>${ctrlEscapeHtml(blueprint?.interaction?.actionType || 'none')}</strong></div>
        <div><span>Light Emitters</span><strong>${blueprint?.lighting?.lightCount || 0}</strong></div>
        <div><span>Revision Hash</span><code>${ctrlEscapeHtml(blueprint?.identity?.revisionHash || '')}</code></div>
      </div>
      ${compListHtml}
    `;
  } else if (activeTab === 'export') {
    const savedList = loadSavedCityObjects();
    const isAssembly = Boolean(family?.isAssembly);
    const savedHtml = savedList.length === 0
      ? '<div class="ctrl-empty">No saved custom objects in browser storage yet.</div>'
      : savedList.map((item, idx) => `
        <div class="saved-obj-row">
          <div class="saved-obj-info">
            <strong>${ctrlEscapeHtml(item.name)}</strong>
            <span>${ctrlEscapeHtml(item.config?.familyId || '')} · #${item.config?.seed || 1}</span>
          </div>
          <div class="saved-obj-btns">
            <button type="button" class="studio-btn ghost" data-load-saved="${idx}">Load</button>
            <button type="button" class="studio-btn ghost danger" data-del-saved="${idx}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('');

    container.innerHTML = `
      <div class="ctrl-group-title">Export 3d &amp; Metadata</div>
      <div class="export-stack">
        <button type="button" id="btn-tab-export-glb" class="studio-btn primary">
          <i class="fa-solid fa-cube"></i> Export Binary .Glb Mesh
        </button>
        <button type="button" id="btn-tab-export-bp" class="studio-btn">
          <i class="fa-solid fa-file-code"></i> Export Blueprint .Json (${isAssembly ? 'Assembly v1' : 'Object v1'})
        </button>
        <button type="button" id="btn-tab-export-pack" class="studio-btn">
          <i class="fa-solid fa-boxes-stacked"></i> Export Family Seed Pack (.Json)
        </button>
        <button type="button" id="btn-tab-import-json" class="studio-btn ghost">
          <i class="fa-solid fa-file-import"></i> Import Blueprint / Preset Json
        </button>
      </div>

      <div class="ctrl-group-title">Saved Custom Objects</div>
      <div class="ctrl-seed-row">
        <input type="text" id="save-obj-name" class="ctrl-input" placeholder="${ctrlEscapeHtml(family?.label || 'Custom Prop')}" maxlength="40">
        <button type="button" id="btn-save-custom-obj" class="studio-btn">Save</button>
      </div>
      <div class="saved-objs-list">${savedHtml}</div>
    `;
  }

  // Bind control inputs inside container
  container.querySelectorAll('[data-lock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (callbacks.onToggleLock) callbacks.onToggleLock(btn.dataset.lock);
    });
  });

  container.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.dataset.key;
    const kind = el.dataset.kind;
    if (kind === 'range') {
      el.addEventListener('input', () => {
        const readout = document.getElementById(`val-${key}`);
        if (readout) readout.textContent = `${el.value}${el.dataset.unit || ''}`;
        if (callbacks.onChangeField) callbacks.onChangeField(key, Number(el.value), { skipControlRerender: true });
      });
    } else if (kind === 'text') {
      el.addEventListener('input', () => {
        if (callbacks.onChangeField) callbacks.onChangeField(key, el.value, { skipControlRerender: true });
      });
    } else if (kind === 'color') {
      el.addEventListener('input', () => {
        if (callbacks.onChangeField) callbacks.onChangeField(key, el.value, { skipControlRerender: true });
      });
    } else if (kind === 'boolean') {
      el.addEventListener('change', () => {
        const span = el.parentElement?.querySelector('span');
        if (span) span.textContent = el.checked ? 'On' : 'Off';
        if (callbacks.onChangeField) callbacks.onChangeField(key, el.checked);
      });
    } else {
      el.addEventListener('change', () => {
        if (callbacks.onChangeField) callbacks.onChangeField(key, el.value);
      });
    }
  });

  const seedInput = $('#ctrl-seed');
  if (seedInput) {
    seedInput.addEventListener('change', () => {
      if (callbacks.onChangeField) callbacks.onChangeField('seed', Number(seedInput.value) || 1024);
    });
  }

  $('#btn-seed-bump')?.addEventListener('click', () => {
    const nextSeed = Math.floor(Math.random() * 900000) + 10000;
    if (callbacks.onChangeField) callbacks.onChangeField('seed', nextSeed, { rerenderControls: true });
  });

  $('#btn-apply-palette')?.addEventListener('click', () => {
    const pal = generateObjectPalette(state.paletteFamily, state.seed, state.condition);
    if (callbacks.onApplyPalette) callbacks.onApplyPalette(pal);
  });

  $('#ctrl-stage-select')?.addEventListener('change', (e) => {
    if (callbacks.onChangeStage) callbacks.onChangeStage(e.target.value);
  });

  container.querySelectorAll('[data-helper]').forEach((chk) => {
    chk.addEventListener('change', () => {
      if (callbacks.onToggleHelper) callbacks.onToggleHelper(chk.dataset.helper, chk.checked);
    });
  });

  container.querySelectorAll('[data-rand-scope]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (callbacks.onRandomizeScope) callbacks.onRandomizeScope(btn.dataset.randScope);
    });
  });

  $('#btn-tab-export-glb')?.addEventListener('click', () => callbacks.onExportGlb?.());
  $('#btn-tab-export-bp')?.addEventListener('click', () => callbacks.onExportBlueprint?.());
  $('#btn-tab-export-pack')?.addEventListener('click', () => callbacks.onExportPack?.());
  $('#btn-tab-import-json')?.addEventListener('click', () => callbacks.onTriggerImport?.());

  $('#btn-save-custom-obj')?.addEventListener('click', () => {
    const nameEl = $('#save-obj-name');
    const customName = (nameEl?.value || '').trim() || `${family?.label || state.familyId} #${state.seed}`;
    const list = loadSavedCityObjects();
    list.unshift({
      name: customName,
      savedAt: new Date().toISOString(),
      config: copy(state)
    });
    persistSavedCityObjects(list.slice(0, 36));
    if (callbacks.onRefreshSaved) callbacks.onRefreshSaved('Saved Custom Object');
  });

  container.querySelectorAll('[data-load-saved]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.loadSaved);
      const list = loadSavedCityObjects();
      if (list[idx]?.config && callbacks.onLoadSavedConfig) {
        callbacks.onLoadSavedConfig(list[idx].config, list[idx].name);
      }
    });
  });

  container.querySelectorAll('[data-del-saved]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.delSaved);
      const list = loadSavedCityObjects();
      list.splice(idx, 1);
      persistSavedCityObjects(list);
      if (callbacks.onRefreshSaved) callbacks.onRefreshSaved('Removed Saved Object');
    });
  });

  container.scrollTop = prevScrollTop;
}
