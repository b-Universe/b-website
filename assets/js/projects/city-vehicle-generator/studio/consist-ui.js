import { clamp, copy } from '../utils.js';
import { RAIL_ARCHETYPES, getStyle } from '../config.js';
import { RAIL_DEFAULT_CONSISTS } from '../transit/rail-archetypes.js';
import { TRAINSET_STORAGE_KEY } from '../transit/consist.js';

function consistUiGetSavedList() {
  try {
    const raw = JSON.parse(localStorage.getItem(TRAINSET_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function renderConsistPanel(container, ctx) {
  if (!container || !ctx) return;
  container.innerHTML = '';

  const consist = ctx.consist;
  if (!consist) return;
  const validation = ctx.consistValidation || { ok: true, errors: [], warnings: [], summary: {}, solved: { couplings: [] } };
  const selectedIdx = clamp(ctx.selectedUnitIndex || 0, 0, Math.max(0, consist.units.length - 1));

  // 1. Consist Preset Selector & Mode Prompt
  const headerGrp = document.createElement('div');
  headerGrp.className = 'studio-group-label';
  headerGrp.textContent = 'Trainset & Consist Composer';
  container.appendChild(headerGrp);

  if (ctx.studioMode !== 'trainset') {
    const banner = document.createElement('div');
    banner.className = 'studio-control-group studio-field consist-mode-banner';
    banner.innerHTML = `
      <p class="studio-hint">You are currently previewing a single vehicle. Switch to <strong>Trainset Mode</strong> to assemble and run a multi-car consist on the track.</p>
      <button type="button" class="studio-btn studio-btn-primary" id="btn-enter-trainset-mode"><i class="fa-solid fa-train"></i> Switch To Trainset Mode</button>
    `;
    container.appendChild(banner);
    banner.querySelector('#btn-enter-trainset-mode')?.addEventListener('click', () => {
      if (ctx.onEnterTrainsetMode) ctx.onEnterTrainsetMode();
    });
  }

  // Preset dropdown
  const presetBox = document.createElement('div');
  presetBox.className = 'studio-control-group studio-field';
  presetBox.innerHTML = `<div class="studio-row-head"><label>Curated Consist Preset</label></div>`;
  const presetSel = document.createElement('select');
  presetSel.className = 'studio-select';
  for (const [id, def] of Object.entries(RAIL_DEFAULT_CONSISTS)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${def.name} (${def.units.length} cars)`;
    if (consist.presetId === id) opt.selected = true;
    presetSel.appendChild(opt);
  }
  if (!RAIL_DEFAULT_CONSISTS[consist.presetId]) {
    const customOpt = document.createElement('option');
    customOpt.value = consist.presetId;
    customOpt.textContent = `${consist.name || 'Custom Consist'} (${consist.units.length} cars)`;
    customOpt.selected = true;
    presetSel.appendChild(customOpt);
  }
  presetSel.addEventListener('change', () => {
    if (ctx.onLoadConsistPreset && RAIL_DEFAULT_CONSISTS[presetSel.value]) {
      ctx.onLoadConsistPreset(presetSel.value);
    }
  });
  presetBox.appendChild(presetSel);
  container.appendChild(presetBox);

  // 2. Formation Unit List + Inter-Car Coupler Status
  const unitGrp = document.createElement('div');
  unitGrp.className = 'studio-group-label';
  unitGrp.textContent = `Formation Order (${consist.units.length} Units)`;
  container.appendChild(unitGrp);

  const listWrap = document.createElement('div');
  listWrap.className = 'consist-unit-list';

  const couplings = validation.solved?.couplings || [];
  consist.units.forEach((unit, idx) => {
    const arch = getStyle(unit.config.style);
    const isSel = idx === selectedIdx;
    const row = document.createElement('div');
    row.className = 'consist-unit-row' + (isSel ? ' active' : '');
    row.dataset.unitIndex = String(idx);

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'consist-unit-select';
    mainBtn.innerHTML = `
      <span class="preset-swatch" style="background:${unit.config.bodyPrimaryColor || '#4c7ca8'}"></span>
      <span class="consist-unit-info">
        <span class="consist-unit-title">#${idx + 1} ${unit.config.railUnitNumber || arch.label}${unit.reversed ? ' (Rev)' : ''}</span>
        <span class="consist-unit-sub">${arch.label} · ${Number(unit.config.overallLength).toFixed(1)}m · ${unit.config.railPowered ? 'Powered' : 'Unpowered'}</span>
      </span>
    `;
    mainBtn.addEventListener('click', () => {
      if (ctx.onSelectConsistUnit) ctx.onSelectConsistUnit(idx);
    });

    const actions = document.createElement('div');
    actions.className = 'consist-unit-actions';

    const makeActBtn = (title, iconClass, onClick, disabled = false) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'consist-mini-icon';
      b.title = title;
      b.disabled = disabled;
      b.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return b;
    };

    actions.appendChild(makeActBtn('Move Up', 'fa-arrow-up', () => ctx.onReorderConsistUnit?.(idx, idx - 1), idx === 0));
    actions.appendChild(makeActBtn('Move Down', 'fa-arrow-down', () => ctx.onReorderConsistUnit?.(idx, idx + 1), idx === consist.units.length - 1));
    actions.appendChild(makeActBtn('Reverse Orientation', 'fa-right-left', () => ctx.onReverseConsistUnit?.(idx)));
    actions.appendChild(makeActBtn('Duplicate Car', 'fa-copy', () => ctx.onDuplicateConsistUnit?.(idx), consist.units.length >= 16));
    actions.appendChild(makeActBtn('Randomize Unit', 'fa-dice', () => ctx.onRandomizeConsistUnit?.(idx)));
    actions.appendChild(makeActBtn('Remove Car', 'fa-trash', () => ctx.onRemoveConsistUnit?.(idx), consist.units.length <= 1));

    row.appendChild(mainBtn);
    row.appendChild(actions);
    listWrap.appendChild(row);

    // Coupler link indicator between unit idx and idx+1
    if (idx < consist.units.length - 1) {
      const link = couplings[idx];
      const couplerBadge = document.createElement('div');
      const isOk = !link || (link.compatible && !link.yawExceeded);
      couplerBadge.className = 'consist-coupler-link ' + (isOk ? 'ok' : 'bad');
      const labelTxt = link
        ? `${link.fromCouplerType} ↔ ${link.toCouplerType} (${link.gapMeters}m${link.relativeYawDeg ? ` · ${link.relativeYawDeg}°` : ''})`
        : `${consist.couplingGap}m coupler gap`;
      couplerBadge.innerHTML = `<i class="fa-solid ${isOk ? 'fa-link' : 'fa-link-slash'}" aria-hidden="true"></i> <span>${labelTxt}</span>`;
      listWrap.appendChild(couplerBadge);
    }
  });
  container.appendChild(listWrap);

  // 3. Add Vehicle Unit Bar
  const addBox = document.createElement('div');
  addBox.className = 'studio-control-group studio-field';
  addBox.innerHTML = `<div class="studio-row-head"><label>Add Car To Formation</label></div>`;
  const addRow = document.createElement('div');
  addRow.className = 'studio-row-inline';
  const addSel = document.createElement('select');
  addSel.className = 'studio-select';
  for (const arch of RAIL_ARCHETYPES) {
    const opt = document.createElement('option');
    opt.value = arch.preset;
    opt.textContent = arch.label;
    if (arch.preset === 'freight_boxcar') opt.selected = true;
    addSel.appendChild(opt);
  }
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'studio-mini-btn';
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
  addBtn.addEventListener('click', () => {
    ctx.onAddConsistUnit?.(addSel.value);
  });
  addRow.appendChild(addSel);
  addRow.appendChild(addBtn);
  addBox.appendChild(addRow);
  container.appendChild(addBox);

  // 4. Consist-Level Coupling & Shared Livery Controls
  const cfgGrp = document.createElement('div');
  cfgGrp.className = 'studio-group-label';
  cfgGrp.textContent = 'Consist Livery & Coupling';
  container.appendChild(cfgGrp);

  const gapField = document.createElement('div');
  gapField.className = 'studio-control-group studio-field';
  gapField.innerHTML = `
    <div class="studio-row-head">
      <label>Coupling Gap</label>
      <span class="studio-field-value">${Number(consist.couplingGap || 0.16).toFixed(2)}m</span>
    </div>
  `;
  const gapSlider = document.createElement('input');
  gapSlider.type = 'range';
  gapSlider.className = 'studio-range';
  gapSlider.min = '0.06';
  gapSlider.max = '0.55';
  gapSlider.step = '0.02';
  gapSlider.value = String(consist.couplingGap || 0.16);
  gapSlider.addEventListener('input', () => {
    const valEl = gapField.querySelector('.studio-field-value');
    if (valEl) valEl.textContent = `${Number(gapSlider.value).toFixed(2)}m`;
  });
  gapSlider.addEventListener('change', () => {
    ctx.onConsistGapChanged?.(Number(gapSlider.value));
  });
  gapField.appendChild(gapSlider);
  container.appendChild(gapField);

  const liveryBox = document.createElement('div');
  liveryBox.className = 'studio-control-group studio-field';
  liveryBox.innerHTML = `
    <div class="studio-row-head"><label>Shared Trainset Livery</label></div>
    <label class="studio-row-inline studio-check-row">
      <input type="checkbox" id="consist-shared-livery" ${consist.sharedLivery ? 'checked' : ''} />
      <span>Sync Livery Colors Across Units</span>
    </label>
    <div class="consist-color-row">
      <label><span>Primary</span><input type="color" id="consist-col-primary" class="studio-color-input" value="${consist.sharedPalette?.bodyPrimaryColor || '#253c59'}" /></label>
      <label><span>Secondary</span><input type="color" id="consist-col-secondary" class="studio-color-input" value="${consist.sharedPalette?.bodySecondaryColor || '#c8d2dc'}" /></label>
      <label><span>Stripe</span><input type="color" id="consist-col-stripe" class="studio-color-input" value="${consist.sharedPalette?.liveryStripeColor || '#25a58d'}" /></label>
    </div>
    <div class="studio-row-inline consist-btn-pair">
      <button type="button" class="studio-mini-btn" id="btn-apply-shared-livery"><i class="fa-solid fa-fill-drip"></i> Apply Livery</button>
      <button type="button" class="studio-mini-btn" id="btn-rand-consist"><i class="fa-solid fa-dice"></i> Randomize Train</button>
    </div>
  `;
  container.appendChild(liveryBox);

  const getPaletteInputs = () => ({
    bodyPrimaryColor: liveryBox.querySelector('#consist-col-primary')?.value || '#253c59',
    bodySecondaryColor: liveryBox.querySelector('#consist-col-secondary')?.value || '#c8d2dc',
    liveryStripeColor: liveryBox.querySelector('#consist-col-stripe')?.value || '#25a58d'
  });

  liveryBox.querySelector('#consist-shared-livery')?.addEventListener('change', (e) => {
    ctx.onToggleSharedLivery?.(Boolean(e.target.checked), getPaletteInputs());
  });
  liveryBox.querySelector('#btn-apply-shared-livery')?.addEventListener('click', () => {
    ctx.onApplySharedLivery?.(getPaletteInputs());
  });
  liveryBox.querySelector('#btn-rand-consist')?.addEventListener('click', () => {
    ctx.onRandomizeWholeConsist?.();
  });

  // 5. Validation & Compatibility Diagnostics
  const diagGrp = document.createElement('div');
  diagGrp.className = 'studio-group-label';
  diagGrp.textContent = 'Consist Diagnostics';
  container.appendChild(diagGrp);

  const sum = validation.summary || {};
  const diagBox = document.createElement('div');
  diagBox.className = 'studio-control-group studio-field consist-diag-box';
  diagBox.innerHTML = `
    <div class="consist-diag-grid">
      <span>Length: <strong>${sum.totalLengthMeters || 0}m</strong></span>
      <span>Axles: <strong>${sum.totalAxles || 0}</strong></span>
      <span>Powered: <strong>${sum.poweredUnits || 0}</strong></span>
      <span>Min Curve: <strong>${sum.minimumCurveRadiusMeters || 24}m</strong></span>
    </div>
    <div class="studio-hint">${sum.trackGaugeLabel || 'Standard Gauge (1435mm)'}</div>
  `;
  if (validation.errors?.length) {
    const errList = document.createElement('div');
    errList.className = 'consist-diag-errors';
    errList.innerHTML = validation.errors.map((e) => `<div><i class="fa-solid fa-circle-exclamation"></i> ${e}</div>`).join('');
    diagBox.appendChild(errList);
  }
  if (validation.warnings?.length) {
    const warnList = document.createElement('div');
    warnList.className = 'consist-diag-warnings';
    warnList.innerHTML = validation.warnings.map((w) => `<div><i class="fa-solid fa-triangle-exclamation"></i> ${w}</div>`).join('');
    diagBox.appendChild(warnList);
  }
  container.appendChild(diagBox);

  // 6. Save / Load Custom Consist Presets
  const saveGrp = document.createElement('div');
  saveGrp.className = 'studio-group-label';
  saveGrp.textContent = 'Saved Consist Library';
  container.appendChild(saveGrp);

  const saveCard = document.createElement('div');
  saveCard.className = 'studio-control-group studio-field';
  saveCard.innerHTML = `
    <div class="studio-custom-save">
      <input type="text" id="consist-save-name" class="studio-input" placeholder="Trainset Name..." maxlength="40" value="${consist.name || ''}" />
      <button type="button" class="studio-mini-btn" id="btn-save-consist">Save</button>
    </div>
    <div class="studio-custom-list" id="consist-saved-list"></div>
  `;
  container.appendChild(saveCard);

  const savedWrap = saveCard.querySelector('#consist-saved-list');
  const renderSavedConsists = () => {
    const entries = consistUiGetSavedList();
    savedWrap.innerHTML = '';
    if (!entries.length) {
      savedWrap.innerHTML = '<div class="studio-empty-note">No saved consist presets yet.</div>';
      return;
    }
    entries.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'custom-preset-item';
      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'custom-preset-load';
      loadBtn.innerHTML = `<span class="preset-swatch" style="background:${item.consist?.units?.[0]?.config?.bodyPrimaryColor || '#24426b'}"></span><span>${item.name} (${item.consist?.units?.length || 0})</span>`;
      loadBtn.addEventListener('click', () => {
        ctx.onLoadSavedConsist?.(copy(item.consist), item.name);
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'custom-preset-del';
      delBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
      delBtn.addEventListener('click', () => {
        const updated = entries.filter((_, i) => i !== idx);
        localStorage.setItem(TRAINSET_STORAGE_KEY, JSON.stringify(updated));
        renderSavedConsists();
        ctx.onToast?.(`Removed "${item.name}"`);
      });
      row.appendChild(loadBtn);
      row.appendChild(delBtn);
      savedWrap.appendChild(row);
    });
  };
  renderSavedConsists();

  saveCard.querySelector('#btn-save-consist')?.addEventListener('click', () => {
    const nameInput = saveCard.querySelector('#consist-save-name');
    const name = (nameInput?.value || '').trim() || `Custom Trainset #${consist.seed % 1000}`;
    const existing = consistUiGetSavedList();
    const savedCopy = copy(consist);
    savedCopy.name = name;
    existing.unshift({ name, savedAt: new Date().toISOString(), consist: savedCopy });
    localStorage.setItem(TRAINSET_STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
    renderSavedConsists();
    ctx.onToast?.(`Saved Trainset "${name}"`);
  });
}
