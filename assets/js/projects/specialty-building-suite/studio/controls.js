import { $, $$ } from '../utils.js';
import {
  BUILDING_CATEGORIES,
  ENVIRONMENT_TAGS,
  SHARED_CONTROL_TABS,
  VARIATION_STRENGTHS
} from '../config.js';
import {
  getAllSpecialtyFamilies,
  getSpecialtyFamily,
  getSchemaForFamily,
  searchSpecialtyCatalog
} from '../core/registry.js';
import { OBJECT_GROUP_LABELS } from '../core/object-integration.js';
import {
  loadSavedSpecialtyConfigs,
  saveSpecialtyConfig,
  deleteSavedSpecialtyConfig,
  parseImportedSpecialtyJson
} from './export.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleTagLabel(tag) {
  return String(tag || '')
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function createSpecialtyControls(studioApi) {
  const {
    state,
    locks,
    onStateChange,
    onSelectPreset,
    onSelectFamily,
    onRandomizeSeed,
    onRandomizeAll,
    onResetPreset,
    onExportGLB,
    onExportBlueprint,
    onExportSettings,
    onImportParsed,
    toast
  } = studioApi;

  let activeCategory = 'all';
  let activeEnvTag = '';
  let searchQuery = '';
  let activeTab = 'structure';

  const categorySelectEl = $('#spec-category-select');
  const envSelectEl = $('#spec-env-select');
  const searchInputEl = $('#spec-search-input');
  const familyListEl = $('#spec-family-list');
  const presetGridEl = $('#spec-preset-grid');
  const presetCountEl = $('#spec-preset-count');
  const seedInputEl = $('#spec-seed-input');
  const varStrengthEl = $('#spec-variation-select');
  const savedListEl = $('#spec-saved-list');
  const tabsBarEl = $('#spec-tabs-bar');
  const tabContentEl = $('#spec-tab-content');

  // Layer quick checkboxes in left bar
  const chkLayerA = $('#spec-toggle-layer-a');
  const chkLayerB = $('#spec-toggle-layer-b');
  const chkLayerC = $('#spec-toggle-layer-c');

  function populateStaticFilters() {
    if (categorySelectEl) {
      categorySelectEl.innerHTML = BUILDING_CATEGORIES.map((cat) => (
        `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</option>`
      )).join('');
      categorySelectEl.value = activeCategory;
    }
    if (envSelectEl) {
      envSelectEl.innerHTML = `<option value="">All Environments</option>` +
        ENVIRONMENT_TAGS.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(titleTagLabel(t))}</option>`).join('');
      envSelectEl.value = activeEnvTag;
    }
    if (varStrengthEl) {
      varStrengthEl.innerHTML = VARIATION_STRENGTHS.map((v) => (
        `<option value="${escapeHtml(v.id)}">${escapeHtml(v.label)}</option>`
      )).join('');
      varStrengthEl.value = state.variationStrength || 'subtle';
    }
  }

  function renderCatalog() {
    const matches = searchSpecialtyCatalog(searchQuery, {
      categoryId: activeCategory,
      environmentTag: activeEnvTag || undefined
    });

    if (familyListEl) {
      const prevFamilyScroll = familyListEl.scrollTop;
      if (matches.length === 0) {
        familyListEl.innerHTML = '<div class="spec-empty-note">No matching building families found.</div>';
      } else {
        familyListEl.innerHTML = matches.map((fam) => {
          const isCurrent = fam.id === state.familyId;
          return `
            <button type="button" class="spec-family-card ${isCurrent ? 'is-active' : ''}" data-family-id="${escapeHtml(fam.id)}">
              <div class="spec-family-title">${escapeHtml(fam.label)}</div>
              <div class="spec-family-meta">${fam.presets.length} Presets</div>
            </button>
          `;
        }).join('');

        $$('.spec-family-card', familyListEl).forEach((btn) => {
          btn.addEventListener('click', () => {
            onSelectFamily(btn.dataset.familyId);
          });
        });
      }
      familyListEl.scrollTop = prevFamilyScroll;
    }

    const activeFam = getSpecialtyFamily(state.familyId) || getAllSpecialtyFamilies()[0];
    if (presetGridEl && activeFam) {
      const prevPresetScroll = presetGridEl.scrollTop;
      const sameFamily = presetGridEl.dataset.renderedFamilyId === activeFam.id;
      presetGridEl.dataset.renderedFamilyId = activeFam.id;
      if (presetCountEl) presetCountEl.textContent = `${activeFam.presets.length} Presets`;
      presetGridEl.innerHTML = activeFam.presets.map((preset) => {
        const isCurrent = preset.id === state.presetId;
        return `
          <button type="button" class="spec-preset-btn ${isCurrent ? 'is-active' : ''}" data-preset-id="${escapeHtml(preset.id)}">
            ${escapeHtml(preset.label)}
          </button>
        `;
      }).join('');

      $$('.spec-preset-btn', presetGridEl).forEach((btn) => {
        btn.addEventListener('click', () => {
          onSelectPreset(btn.dataset.presetId);
        });
      });
      presetGridEl.scrollTop = sameFamily ? prevPresetScroll : 0;
    }
  }

  function renderSavedConfigs() {
    if (!savedListEl) return;
    const saved = loadSavedSpecialtyConfigs();
    if (!saved.length) {
      savedListEl.innerHTML = '<div class="spec-empty-note">No saved buildings yet.</div>';
      return;
    }
    savedListEl.innerHTML = saved.map((entry) => `
      <div class="spec-saved-row">
        <button type="button" class="spec-saved-load" data-load-id="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</button>
        <button type="button" class="spec-saved-del" data-del-id="${escapeHtml(entry.id)}" title="Delete Saved Config"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');

    $$('.spec-saved-load', savedListEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = loadSavedSpecialtyConfigs().find((item) => item.id === btn.dataset.loadId);
        if (found) {
          onImportParsed({ kind: 'settings', settings: found.config });
          toast(`Loaded "${found.name}"`);
        }
      });
    });

    $$('.spec-saved-del', savedListEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteSavedSpecialtyConfig(btn.dataset.delId);
        renderSavedConfigs();
      });
    });
  }

  function renderTabsBar() {
    if (!tabsBarEl) return;
    tabsBarEl.innerHTML = SHARED_CONTROL_TABS.map((tab) => `
      <button type="button" class="spec-tab-btn ${tab.id === activeTab ? 'is-active' : ''}" data-tab-id="${escapeHtml(tab.id)}">
        <i class="fas ${escapeHtml(tab.icon)}"></i>
        <span>${escapeHtml(tab.label)}</span>
      </button>
    `).join('');

    $$('.spec-tab-btn', tabsBarEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tabId;
        renderTabsBar();
        renderTabBody();
      });
    });
  }

  function buildFieldHtml(field) {
    const val = state[field.key];
    const isLocked = locks.has(field.key);
    const lockBtn = `<button type="button" class="spec-lock-btn ${isLocked ? 'is-locked' : ''}" data-lock-key="${escapeHtml(field.key)}" title="Lock Parameter Across Presets"><i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock'}"></i></button>`;

    if (field.type === 'boolean') {
      return `
        <div class="spec-field-row spec-field-check">
          <label class="spec-check-label">
            <input type="checkbox" data-field-key="${escapeHtml(field.key)}" data-field-type="boolean" ${val ? 'checked' : ''} />
            <span>${escapeHtml(field.label)}</span>
          </label>
          ${lockBtn}
        </div>
      `;
    }

    if (field.type === 'select') {
      const opts = (field.options || []).map((opt) => {
        const optId = Array.isArray(opt) ? opt[0] : opt.id;
        const optLabel = Array.isArray(opt) ? opt[1] : opt.label;
        return `<option value="${escapeHtml(optId)}" ${val === optId ? 'selected' : ''}>${escapeHtml(optLabel)}</option>`;
      }).join('');
      return `
        <div class="spec-field-row">
          <div class="spec-field-head">
            <label>${escapeHtml(field.label)}</label>
            ${lockBtn}
          </div>
          <select class="spec-input" data-field-key="${escapeHtml(field.key)}" data-field-type="select">${opts}</select>
        </div>
      `;
    }

    if (field.type === 'color') {
      return `
        <div class="spec-field-row spec-field-inline">
          <label>${escapeHtml(field.label)}</label>
          <div class="spec-inline-right">
            <input type="color" class="spec-color-input" data-field-key="${escapeHtml(field.key)}" data-field-type="color" value="${escapeHtml(val || '#ffffff')}" />
            ${lockBtn}
          </div>
        </div>
      `;
    }

    if (field.type === 'text') {
      return `
        <div class="spec-field-row">
          <div class="spec-field-head">
            <label>${escapeHtml(field.label)}</label>
            ${lockBtn}
          </div>
          <input type="text" class="spec-input" data-field-key="${escapeHtml(field.key)}" data-field-type="text" value="${escapeHtml(val || '')}" />
        </div>
      `;
    }

    // range + numeric readout
    const numVal = Number(val ?? field.min ?? 0);
    const unit = field.unit ? ` ${field.unit}` : '';
    return `
      <div class="spec-field-row">
        <div class="spec-field-head">
          <label>${escapeHtml(field.label)}</label>
          <div class="spec-head-right">
            <span class="spec-val-readout" data-readout-key="${escapeHtml(field.key)}">${escapeHtml(numVal)}${escapeHtml(unit)}</span>
            ${lockBtn}
          </div>
        </div>
        <div class="spec-range-pair">
          <input type="range" class="spec-range" data-field-key="${escapeHtml(field.key)}" data-field-type="range" data-unit="${escapeHtml(unit)}" min="${field.min}" max="${field.max}" step="${field.step || 1}" value="${numVal}" />
          <input type="number" class="spec-num-box" data-num-key="${escapeHtml(field.key)}" min="${field.min}" max="${field.max}" step="${field.step || 1}" value="${numVal}" />
        </div>
      </div>
    `;
  }

  function renderObjectsTabExtras(blueprint) {
    const fam = getSpecialtyFamily(state.familyId);
    const availGroups = Array.from(new Set([
      ...(fam?.defaultObjectGroups || []),
      ...Object.keys(OBJECT_GROUP_LABELS)
    ]));
    const disabledSet = new Set(state.disabledObjectGroups || []);

    const groupsHtml = availGroups.map((gk) => {
      const checked = !disabledSet.has(gk);
      const label = OBJECT_GROUP_LABELS[gk] || titleTagLabel(gk);
      return `
        <label class="spec-check-label spec-obj-group-row">
          <input type="checkbox" class="spec-obj-group-chk" data-group-key="${escapeHtml(gk)}" ${checked ? 'checked' : ''} />
          <span>${escapeHtml(label)}</span>
        </label>
      `;
    }).join('');

    const placed = blueprint?.objectDependencies || [];
    const missing = blueprint?.missingObjectDependencies || [];

    const missingHtml = missing.length > 0
      ? `<div class="spec-warning-box">Missing Object Dependencies: ${escapeHtml(missing.map((m) => `${m.familyId} (${m.reason})`).join(', '))}</div>`
      : '';

    const placedListHtml = placed.length > 0
      ? `<div class="spec-deps-list">${placed.slice(0, 14).map((p) => `<div class="spec-dep-chip">${escapeHtml(p.familyId)} / ${escapeHtml(p.presetId || 'default')}</div>`).join('')}${placed.length > 14 ? `<div class="spec-dep-chip">+${placed.length - 14} more</div>` : ''}</div>`
      : '<div class="spec-empty-note">No outdoor objects active for current settings.</div>';

    return `
      <div class="spec-section-subtitle">Object Category Filters</div>
      <div class="spec-obj-groups">${groupsHtml}</div>
      ${missingHtml}
      <div class="spec-section-subtitle">Active City Object Suite Placements (${placed.length})</div>
      ${placedListHtml}
    `;
  }

  function renderExportTabExtras() {
    return `
      <div class="spec-section-subtitle">Coordinate & Unit Format</div>
      <div class="spec-field-row">
        <label>Export Coordinate Axis</label>
        <select class="spec-input" id="spec-export-axis-select">
          <option value="y_up" ${state.exportAxis !== 'z_up' ? 'selected' : ''}>Standard glTF (Y-Up)</option>
          <option value="z_up" ${state.exportAxis === 'z_up' ? 'selected' : ''}>B Remastered (Z-Up)</option>
        </select>
      </div>
      <div class="spec-field-row">
        <label>Export Scale Units</label>
        <select class="spec-input" id="spec-export-units-select">
          <option value="meters" ${state.exportUnits !== 'b_units' ? 'selected' : ''}>Meters (1.0x)</option>
          <option value="b_units" ${state.exportUnits === 'b_units' ? 'selected' : ''}>B Game Units (16.404x)</option>
        </select>
      </div>
      <div class="spec-export-actions">
        <button type="button" class="spec-btn spec-btn-primary" id="spec-btn-export-glb"><i class="fas fa-cube"></i> Download Binary .Glb Model</button>
        <button type="button" class="spec-btn" id="spec-btn-export-bp"><i class="fas fa-drafting-compass"></i> Export Blueprint (.Specialty.Json)</button>
        <button type="button" class="spec-btn" id="spec-btn-export-json"><i class="fas fa-sliders"></i> Export Preset Settings (.Json)</button>
        <label class="spec-btn spec-file-btn">
          <i class="fas fa-file-import"></i> Import Blueprint or Settings (.Json)
          <input type="file" id="spec-import-file-input" accept=".json" hidden />
        </label>
      </div>
    `;
  }

  function renderTabBody(latestBlueprint = null) {
    if (!tabContentEl) return;
    const schema = getSchemaForFamily(state.familyId);
    const fields = schema.filter((f) => f.tab === activeTab);

    let lastGroup = '';
    const fieldHtml = fields.map((f) => {
      let hdr = '';
      if (f.group && f.group !== lastGroup) {
        lastGroup = f.group;
        hdr = `<div class="spec-section-subtitle">${escapeHtml(f.group)}</div>`;
      }
      return hdr + buildFieldHtml(f);
    }).join('');

    let extraHtml = '';
    if (activeTab === 'objects') extraHtml = renderObjectsTabExtras(latestBlueprint || studioApi.getLatestBlueprint());
    if (activeTab === 'export') extraHtml = renderExportTabExtras();

    tabContentEl.innerHTML = (fieldHtml || '<div class="spec-empty-note">No additional controls in this tab.</div>') + extraHtml;

    // Bind input listeners
    $$('[data-field-key]', tabContentEl).forEach((el) => {
      const key = el.dataset.fieldKey;
      const type = el.dataset.fieldType;
      const handler = () => {
        let nextVal;
        if (type === 'boolean') nextVal = Boolean(el.checked);
        else if (type === 'range') nextVal = Number(el.value);
        else nextVal = el.value;

        if (type === 'range') {
          const readout = $(`[data-readout-key="${key}"]`, tabContentEl);
          if (readout) readout.textContent = `${nextVal}${el.dataset.unit || ''}`;
          const numBox = $(`[data-num-key="${key}"]`, tabContentEl);
          if (numBox) numBox.value = String(nextVal);
        }
        onStateChange(key, nextVal);
      };
      el.addEventListener(type === 'range' || type === 'color' || type === 'text' ? 'input' : 'change', handler);
    });

    $$('[data-num-key]', tabContentEl).forEach((numEl) => {
      numEl.addEventListener('change', () => {
        const key = numEl.dataset.numKey;
        const val = Number(numEl.value);
        const rangeEl = $(`[data-field-key="${key}"]`, tabContentEl);
        if (rangeEl) rangeEl.value = String(val);
        const readout = $(`[data-readout-key="${key}"]`, tabContentEl);
        if (readout) readout.textContent = `${val}${rangeEl?.dataset.unit || ''}`;
        onStateChange(key, val);
      });
    });

    $$('[data-lock-key]', tabContentEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.lockKey;
        if (locks.has(key)) locks.delete(key);
        else locks.add(key);
        renderTabBody();
      });
    });

    // Objects group checkboxes
    $$('.spec-obj-group-chk', tabContentEl).forEach((chk) => {
      chk.addEventListener('change', () => {
        const gk = chk.dataset.groupKey;
        const nextDisabled = new Set(state.disabledObjectGroups || []);
        if (chk.checked) nextDisabled.delete(gk);
        else nextDisabled.add(gk);
        onStateChange('disabledObjectGroups', Array.from(nextDisabled));
      });
    });

    // Export actions
    const axisSel = $('#spec-export-axis-select', tabContentEl);
    if (axisSel) axisSel.addEventListener('change', () => onStateChange('exportAxis', axisSel.value));
    const unitSel = $('#spec-export-units-select', tabContentEl);
    if (unitSel) unitSel.addEventListener('change', () => onStateChange('exportUnits', unitSel.value));
    const btnGlb = $('#spec-btn-export-glb', tabContentEl);
    if (btnGlb) btnGlb.addEventListener('click', onExportGLB);
    const btnBp = $('#spec-btn-export-bp', tabContentEl);
    if (btnBp) btnBp.addEventListener('click', onExportBlueprint);
    const btnJson = $('#spec-btn-export-json', tabContentEl);
    if (btnJson) btnJson.addEventListener('click', onExportSettings);

    const fileInput = $('#spec-import-file-input', tabContentEl);
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = parseImportedSpecialtyJson(text);
          onImportParsed(parsed);
          toast(`Imported ${file.name}`);
        } catch (err) {
          toast(`Import Error: ${err.message}`);
        }
        fileInput.value = '';
      });
    }
  }

  function syncToolbarInputs() {
    if (seedInputEl) seedInputEl.value = String(state.seed || 2026);
    if (varStrengthEl) varStrengthEl.value = state.variationStrength || 'subtle';
    if (chkLayerA) chkLayerA.checked = state.includeBuildingLayer !== false;
    if (chkLayerB) chkLayerB.checked = state.includeLot !== false;
    if (chkLayerC) chkLayerC.checked = state.includeObjectsLayer !== false;
  }

  // Bind persistent catalog & toolbar controls
  if (categorySelectEl) {
    categorySelectEl.addEventListener('change', () => {
      activeCategory = categorySelectEl.value;
      renderCatalog();
    });
  }
  if (envSelectEl) {
    envSelectEl.addEventListener('change', () => {
      activeEnvTag = envSelectEl.value;
      renderCatalog();
    });
  }
  if (searchInputEl) {
    searchInputEl.addEventListener('input', () => {
      searchQuery = searchInputEl.value;
      renderCatalog();
    });
  }
  if (seedInputEl) {
    seedInputEl.addEventListener('change', () => {
      onStateChange('seed', Math.max(1, parseInt(seedInputEl.value, 10) || 2026));
    });
  }
  if (varStrengthEl) {
    varStrengthEl.addEventListener('change', () => {
      onStateChange('variationStrength', varStrengthEl.value);
    });
  }
  if (chkLayerA) chkLayerA.addEventListener('change', () => onStateChange('includeBuildingLayer', chkLayerA.checked));
  if (chkLayerB) chkLayerB.addEventListener('change', () => onStateChange('includeLot', chkLayerB.checked));
  if (chkLayerC) chkLayerC.addEventListener('change', () => onStateChange('includeObjectsLayer', chkLayerC.checked));

  const btnSeedRand = $('#spec-btn-rand-seed');
  if (btnSeedRand) btnSeedRand.addEventListener('click', onRandomizeSeed);
  const btnRandAll = $('#spec-btn-rand-all');
  if (btnRandAll) btnRandAll.addEventListener('click', onRandomizeAll);
  const btnReset = $('#spec-btn-reset-preset');
  if (btnReset) btnReset.addEventListener('click', onResetPreset);
  const btnSaveCfg = $('#spec-btn-save-config');
  if (btnSaveCfg) {
    btnSaveCfg.addEventListener('click', () => {
      const fam = getSpecialtyFamily(state.familyId);
      const savedName = $('#spec-save-name-input')?.value?.trim() || `${fam?.label || state.familyId} (${state.seed})`;
      saveSpecialtyConfig(savedName, state);
      if ($('#spec-save-name-input')) $('#spec-save-name-input').value = '';
      renderSavedConfigs();
      toast(`Saved "${savedName}"`);
    });
  }

  populateStaticFilters();
  renderCatalog();
  renderSavedConfigs();
  renderTabsBar();
  renderTabBody();
  syncToolbarInputs();

  return {
    refresh(blueprint) {
      renderCatalog();
      syncToolbarInputs();
      renderTabBody(blueprint);
    },
    setActiveTab(tabId) {
      activeTab = tabId;
      renderTabsBar();
      renderTabBody();
    }
  };
}
