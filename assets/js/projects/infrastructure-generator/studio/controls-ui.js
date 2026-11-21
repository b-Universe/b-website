import { INFRA_ERA_STYLES } from '../config.js';
import { infraCanRedo, infraCanUndo, infraExecuteCommand, infraFindEdge, infraFindNode } from '../core/network-graph.js';
import { infraGetFamily, infraGetPreset, infraListFamilies, infraListPresets } from '../core/registry.js';
import { infraApplyPresetWithLocks, infraRandomizeParams } from '../core/seeded-generation.js';
import { INFRA_REFERENCE_SCENES, infraGetReferenceScene } from '../presets/reference-scenes.js';
import { wsGetModes } from './workspace-modes.js';

function uiEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let uiCatalogFilter = 'all';

export function uiRenderModeBar(container, doc, onSelectMode) {
  if (!container) return;
  const modes = wsGetModes();
  container.innerHTML = modes
    .map((m) => {
      const isActive = doc.workspaceMode === m.id;
      const badge = !m.available ? `<span class="infra-mode-badge">${uiEsc(m.badge || 'Planned')}</span>` : '';
      return `
        <button type="button"
          class="infra-mode-btn ${isActive ? 'active' : ''} ${!m.available ? 'planned' : ''}"
          data-mode="${uiEsc(m.id)}"
          title="${uiEsc(m.description)}">
          <span>${uiEsc(m.label)}</span>${badge}
        </button>`;
    })
    .join('');

  container.querySelectorAll('.infra-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => onSelectMode(btn.dataset.mode));
  });
}

export function uiRenderCatalogPanel(container, doc, ctx) {
  if (!container) return;
  const refScenes = Object.values(INFRA_REFERENCE_SCENES);
  const allPresets = infraListPresets();
  const filteredPresets = uiCatalogFilter === 'all'
    ? allPresets
    : allPresets.filter((p) => p.familyId === uiCatalogFilter);
  const plannedFamilies = infraListFamilies().filter((f) => !f.implemented);
  const selectedEdge = doc.selection?.kind === 'edge' ? infraFindEdge(doc, doc.selection.id) : doc.edges?.[0];
  const activePresetId = selectedEdge?.presetId || '';

  const countByFam = (fid) => allPresets.filter((p) => p.familyId === fid).length;
  const filterTabs = [
    { id: 'all', label: `All (${allPresets.length})` },
    { id: 'roads', label: `Roads (${countByFam('roads')})` },
    { id: 'railways', label: `Rail (${countByFam('railways')})` },
    { id: 'elevated_transit', label: `Suspended (${countByFam('elevated_transit')})` },
    { id: 'bridges', label: `Bridges (${countByFam('bridges')})` },
    { id: 'pedestrian', label: `Pedestrian (${countByFam('pedestrian')})` },
    { id: 'tunnels', label: `Tunnels (${countByFam('tunnels')})` },
    { id: 'waterways', label: `Water (${countByFam('waterways')})` },
    { id: 'utilities', label: `Utilities (${countByFam('utilities')})` },
    { id: 'facilities', label: `Facilities (${countByFam('facilities')})` }
  ];

  container.innerHTML = `
    <div class="infra-catalog-section">
      <div class="infra-section-label"><i class="fa-solid fa-map"></i> Reference Scenes (${refScenes.length})</div>
      <div class="infra-card-list">
        ${refScenes
          .map(
            (r) => `
          <button type="button" class="infra-card-btn ${doc.id === r.id ? 'active' : ''}" data-ref-scene="${uiEsc(r.id)}">
            <strong>${uiEsc(r.label)}</strong>
            <small>${uiEsc(r.description)}</small>
          </button>`
          )
          .join('')}
      </div>
    </div>

    <div class="infra-catalog-section">
      <div class="infra-section-label"><i class="fa-solid fa-sliders"></i> Infrastructure Presets <span class="infra-pill-mini">${filteredPresets.length}</span></div>
      <div class="infra-filter-pills" role="group" aria-label="Preset Family Filter">
        ${filterTabs
          .map(
            (ft) => `
          <button type="button" class="infra-filter-pill ${uiCatalogFilter === ft.id ? 'active' : ''}" data-cat-filter="${uiEsc(ft.id)}">${uiEsc(ft.label)}</button>`
          )
          .join('')}
      </div>
      <div class="infra-card-list">
        ${filteredPresets
          .map(
            (p) => `
          <button type="button" class="infra-card-btn ${activePresetId === p.id ? 'active' : ''}" data-preset-id="${uiEsc(p.id)}">
            <div class="infra-card-head">
              <strong>${uiEsc(p.label)}</strong>
              <span class="infra-tag">${uiEsc(p.elevationMode)}</span>
            </div>
            <small>${uiEsc(p.description)}</small>
          </button>`
          )
          .join('')}
      </div>
    </div>

    ${
      plannedFamilies.length
        ? `
    <details class="infra-planned-details">
      <summary class="infra-section-label"><i class="fa-solid fa-layer-group"></i> Roadmap Families (${plannedFamilies.length} Planned)</summary>
      <div class="infra-planned-list">
        ${plannedFamilies
          .map(
            (f) => `
          <div class="infra-planned-item">
            <div>
              <strong>${uiEsc(f.label)}</strong>
              <small>${uiEsc(f.description)}</small>
            </div>
            <span class="infra-mode-badge">${uiEsc(f.plannedMilestone || 'Planned')}</span>
          </div>`
          )
          .join('')}
      </div>
    </details>`
        : ''
    }
  `;

  container.querySelectorAll('[data-cat-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      uiCatalogFilter = btn.dataset.catFilter || 'all';
      uiRenderCatalogPanel(container, doc, ctx);
    });
  });

  container.querySelectorAll('[data-ref-scene]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = infraGetReferenceScene(btn.dataset.refScene);
      infraExecuteCommand(doc, { type: 'REPLACE_DOCUMENT', nextDoc: next });
      ctx.rebuildAll(`Loaded ${next.name}`);
      ctx.resetCamera('overview');
    });
  });

  container.querySelectorAll('[data-preset-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = infraGetPreset(btn.dataset.presetId);
      if (!preset) return;
      const targetEdge =
        (doc.selection?.kind === 'edge' && infraFindEdge(doc, doc.selection.id)) ||
        doc.edges?.[0];
      if (!targetEdge) return;

      const locks = new Set(targetEdge.locks || []);
      const sameFamily = (targetEdge.familyId || 'roads') === preset.familyId && (targetEdge.domain || 'road') === (preset.domain || targetEdge.domain);
      const merged = sameFamily
        ? infraApplyPresetWithLocks(targetEdge.params, preset.params, locks)
        : infraApplyPresetWithLocks({}, preset.params, locks);
      const nextMode = locks.has('elevationMode') ? targetEdge.elevationMode : preset.elevationMode;

      infraExecuteCommand(doc, {
        type: 'UPDATE_EDGE',
        edgeId: targetEdge.id,
        familyId: preset.familyId,
        domain: preset.domain || targetEdge.domain,
        presetId: preset.id,
        elevationMode: nextMode,
        params: merged
      });

      if (!locks.has('elevationMode')) {
        const edgeDegree = (nodeId) => (doc.edges || []).filter((e) => e.startNodeId === nodeId || e.endNodeId === nodeId).length;
        for (const nid of [targetEdge.startNodeId, targetEdge.endNodeId]) {
          const node = infraFindNode(doc, nid);
          if (!node) continue;
          const deg = edgeDegree(nid);
          const nextDom = deg <= 1 ? (preset.domain || node.domain) : node.domain;
          let nextY = node.position[1];
          if (preset.elevationMode === 'suspended' && node.position[1] < 8.4) nextY = 9.4;
          else if (preset.elevationMode === 'elevated' && node.position[1] < 4.8) nextY = preset.familyId === 'bridges' ? 6.4 : 5.6;
          else if (preset.elevationMode === 'underground' && node.position[1] > -3.0) nextY = -6.2;
          else if ((preset.elevationMode === 'grade' || preset.elevationMode === 'aerial') && deg <= 1 && node.elevationMode !== preset.elevationMode) nextY = 0;

          if (nextY !== node.position[1] || nextDom !== node.domain || (deg <= 1 && node.elevationMode !== nextMode)) {
            infraExecuteCommand(doc, {
              type: 'UPDATE_NODE',
              nodeId: node.id,
              position: [node.position[0], nextY, node.position[2]],
              domain: nextDom,
              elevationMode: deg <= 1 ? nextMode : node.elevationMode
            });
          }
        }
      }
      ctx.rebuildAll(`Applied preset: ${preset.label}`);
    });
  });
}

function uiCreateFieldRow(field, value, isLocked, onChange, onToggleLock) {
  const row = document.createElement('div');
  row.className = 'infra-field-row';

  const top = document.createElement('div');
  top.className = 'infra-field-top';

  const label = document.createElement('label');
  label.textContent = field.label;

  const rightWrap = document.createElement('div');
  rightWrap.className = 'infra-field-right';

  if (field.type === 'range') {
    const valBadge = document.createElement('span');
    valBadge.className = 'infra-val-badge';
    valBadge.textContent = String(value);
    rightWrap.appendChild(valBadge);
  }

  const lockBtn = document.createElement('button');
  lockBtn.type = 'button';
  lockBtn.className = `infra-lock-btn ${isLocked ? 'locked' : ''}`;
  lockBtn.title = isLocked ? 'Unlock property' : 'Lock property against presets/randomizer';
  lockBtn.innerHTML = `<i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>`;
  lockBtn.addEventListener('click', () => onToggleLock(field.key));
  rightWrap.appendChild(lockBtn);

  top.appendChild(label);
  top.appendChild(rightWrap);
  row.appendChild(top);

  if (field.type === 'boolean') {
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = Boolean(value);
    chk.addEventListener('change', () => onChange(field.key, chk.checked));
    top.prepend(chk);
  } else if (field.type === 'range') {
    const range = document.createElement('input');
    range.type = 'range';
    range.min = field.min;
    range.max = field.max;
    range.step = field.step;
    range.value = value;
    range.addEventListener('input', () => {
      const num = Number(range.value);
      const badge = rightWrap.querySelector('.infra-val-badge');
      if (badge) badge.textContent = String(num);
      onChange(field.key, num);
    });
    row.appendChild(range);
  } else if (field.type === 'select') {
    const sel = document.createElement('select');
    sel.className = 'infra-select';
    for (const opt of field.options || []) {
      const o = document.createElement('option');
      o.value = Array.isArray(opt) ? opt[0] : opt;
      o.textContent = Array.isArray(opt) ? opt[1] : opt;
      if (o.value === String(value) || (Number.isFinite(Number(o.value)) && Number.isFinite(Number(value)) && Math.abs(Number(o.value) - Number(value)) < 1e-4)) {
        o.selected = true;
      }
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      const raw = sel.value;
      const parsed = /^(?:\d+|\d*\.\d+)$/.test(raw) ? Number(raw) : raw;
      onChange(field.key, parsed);
    });
    row.appendChild(sel);
  }

  return row;
}

export function uiRenderInspectorPanel(container, activeTab, doc, sceneRoot, ctx) {
  if (!container) return;
  const solved = sceneRoot?.userData?.solved;
  const diagnostics = sceneRoot?.userData?.diagnostics || { status: 'valid', errorCount: 0, warningCount: 0, issues: [] };
  const geoAudit = sceneRoot?.userData?.geoAudit;
  const blueprint = sceneRoot?.userData?.blueprint;

  container.innerHTML = '';

  if (activeTab === 'inspector') {
    // Undo/Redo & Scene Era Header
    const histBar = document.createElement('div');
    histBar.className = 'infra-action-row';
    histBar.innerHTML = `
      <button type="button" class="infra-btn-sm" id="insp-undo" ${infraCanUndo(doc) ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> Undo</button>
      <button type="button" class="infra-btn-sm" id="insp-redo" ${infraCanRedo(doc) ? '' : 'disabled'}><i class="fa-solid fa-rotate-right"></i> Redo</button>
      <button type="button" class="infra-btn-sm" id="insp-rand-edge"><i class="fa-solid fa-dice"></i> Randomize</button>
    `;
    container.appendChild(histBar);

    histBar.querySelector('#insp-undo')?.addEventListener('click', () => ctx.undo());
    histBar.querySelector('#insp-redo')?.addEventListener('click', () => ctx.redo());
    histBar.querySelector('#insp-rand-edge')?.addEventListener('click', () => {
      const targetEdge = (doc.selection?.kind === 'edge' && infraFindEdge(doc, doc.selection.id)) || doc.edges?.[0];
      if (!targetEdge) return;
      const famId = targetEdge.familyId === 'railways' && targetEdge.domain === 'road' ? 'roads' : (targetEdge.familyId || 'roads');
      const targetFam = infraGetFamily(famId);
      const nextSeed = (doc.seed || 2026) + 1;
      const nextParams = infraRandomizeParams(targetFam?.schema || [], targetEdge.params, nextSeed, new Set(targetEdge.locks || []));
      infraExecuteCommand(doc, { type: 'UPDATE_DOC_META', seed: nextSeed });
      infraExecuteCommand(doc, { type: 'UPDATE_EDGE', edgeId: targetEdge.id, params: nextParams });
      ctx.rebuildAll(`Randomized ${targetEdge.id} (seed ${nextSeed})`);
    });

    // Global Era Style
    const eraCard = document.createElement('div');
    eraCard.className = 'infra-group-box';
    eraCard.innerHTML = `<div class="infra-group-title">Environment & Era</div>`;
    const eraSel = document.createElement('select');
    eraSel.className = 'infra-select';
    for (const era of Object.values(INFRA_ERA_STYLES)) {
      const o = document.createElement('option');
      o.value = era.id;
      o.textContent = era.label;
      if (doc.eraStyle === era.id) o.selected = true;
      eraSel.appendChild(o);
    }
    eraSel.addEventListener('change', () => {
      infraExecuteCommand(doc, { type: 'UPDATE_DOC_META', eraStyle: eraSel.value });
      ctx.rebuildAll(`Era: ${eraSel.value}`);
    });
    eraCard.appendChild(eraSel);
    container.appendChild(eraCard);

    if (doc.selection?.kind === 'node') {
      const node = infraFindNode(doc, doc.selection.id);
      if (node) {
        const nodeBox = document.createElement('div');
        nodeBox.className = 'infra-group-box';
        nodeBox.innerHTML = `
          <div class="infra-group-title">Selected Node: ${uiEsc(node.id)} <span class="infra-tag">${uiEsc(node.kind)}</span></div>
          <div class="infra-coord-grid">
            <label>X (m)<input type="number" step="0.5" id="node-pos-x" value="${node.position[0]}"></label>
            <label>Elev Y (m)<input type="number" step="0.2" id="node-pos-y" value="${node.position[1]}"></label>
            <label>Z (m)<input type="number" step="0.5" id="node-pos-z" value="${node.position[2]}"></label>
          </div>
          <div class="infra-field-row">
            <div class="infra-field-top"><label>Elevation Mode</label></div>
            <select class="infra-select" id="node-elev-mode">
              <option value="grade" ${node.elevationMode === 'grade' ? 'selected' : ''}>At-Grade</option>
              <option value="elevated" ${node.elevationMode === 'elevated' ? 'selected' : ''}>Elevated</option>
              <option value="suspended" ${node.elevationMode === 'suspended' ? 'selected' : ''}>Suspended Guideway</option>
            </select>
          </div>
          ${
            node.kind === 'switch'
              ? `
            <div class="infra-field-row">
              <div class="infra-field-top"><label>Switch Route State</label><span class="infra-tag">${uiEsc(node.params?.switchState || 'normal')}</span></div>
              <select class="infra-select" id="node-switch-state">
                <option value="normal" ${(node.params?.switchState || 'normal') === 'normal' ? 'selected' : ''}>Normal (Mainline)</option>
                <option value="reverse" ${node.params?.switchState === 'reverse' ? 'selected' : ''}>Reverse (Diverging Siding)</option>
              </select>
            </div>
            <div class="infra-action-row" style="margin-bottom:6px;">
              <button type="button" class="infra-btn-sm" id="btn-toggle-switch"><i class="fa-solid fa-code-branch"></i> Toggle Switch State</button>
            </div>`
              : ''
          }
          ${
            node.kind === 'junction' && node.domain === 'road'
              ? `
            <div class="infra-field-row">
              <div class="infra-field-top"><label>Corner Radius (m)</label><span class="infra-val-badge">${node.params?.cornerRadius ?? 3.2}</span></div>
              <input type="range" min="1.2" max="8.0" step="0.2" id="node-corner-r" value="${node.params?.cornerRadius ?? 3.2}">
            </div>
            <div class="infra-field-row">
              <div class="infra-field-top">
                <input type="checkbox" id="node-crosswalks" ${node.params?.includeCrosswalks !== false ? 'checked' : ''}>
                <label>Intersection Crosswalks</label>
              </div>
            </div>`
              : ''
          }
          <button type="button" class="infra-btn-danger" id="btn-del-node"><i class="fa-solid fa-trash"></i> Delete Node & Connected Segments</button>
        `;
        container.appendChild(nodeBox);

        const applyCoords = () => {
          const x = Number(nodeBox.querySelector('#node-pos-x').value) || 0;
          const y = Number(nodeBox.querySelector('#node-pos-y').value) || 0;
          const z = Number(nodeBox.querySelector('#node-pos-z').value) || 0;
          const mode = nodeBox.querySelector('#node-elev-mode').value;
          infraExecuteCommand(doc, { type: 'UPDATE_NODE', nodeId: node.id, position: [x, y, z], elevationMode: mode });
          ctx.rebuildAll(`Updated ${node.id}`);
        };
        nodeBox.querySelectorAll('#node-pos-x, #node-pos-y, #node-pos-z, #node-elev-mode').forEach((el) =>
          el.addEventListener('change', applyCoords)
        );
        nodeBox.querySelector('#node-switch-state')?.addEventListener('change', (e) => {
          infraExecuteCommand(doc, { type: 'UPDATE_NODE', nodeId: node.id, params: { switchState: e.target.value } });
          ctx.rebuildAll(`Switch ${node.id} set to ${e.target.value}`);
        });
        nodeBox.querySelector('#btn-toggle-switch')?.addEventListener('click', () => {
          const nextState = (node.params?.switchState || 'normal') === 'normal' ? 'reverse' : 'normal';
          infraExecuteCommand(doc, { type: 'UPDATE_NODE', nodeId: node.id, params: { switchState: nextState } });
          ctx.rebuildAll(`Toggled switch ${node.id} → ${nextState}`);
        });
        nodeBox.querySelector('#node-corner-r')?.addEventListener('change', (e) => {
          infraExecuteCommand(doc, { type: 'UPDATE_NODE', nodeId: node.id, params: { cornerRadius: Number(e.target.value) } });
          ctx.rebuildAll('Updated intersection radius');
        });
        nodeBox.querySelector('#node-crosswalks')?.addEventListener('change', (e) => {
          infraExecuteCommand(doc, { type: 'UPDATE_NODE', nodeId: node.id, params: { includeCrosswalks: Boolean(e.target.checked) } });
          ctx.rebuildAll('Updated intersection crosswalks');
        });
        nodeBox.querySelector('#btn-del-node')?.addEventListener('click', () => {
          infraExecuteCommand(doc, { type: 'DELETE_NODE', nodeId: node.id });
          ctx.rebuildAll(`Deleted ${node.id}`);
        });
      }
      return;
    }

    // Selected Edge (or default first edge)
    const edge = (doc.selection?.kind === 'edge' && infraFindEdge(doc, doc.selection.id)) || doc.edges?.[0];
    if (!edge) {
      container.innerHTML += '<p class="infra-muted">No road segment selected. Use "Add Road" in the viewport toolbar to draw one.</p>';
      return;
    }

    const segLabel = edge.familyId === 'bridges'
      ? 'Bridge Span'
      : edge.familyId === 'pedestrian' || edge.domain === 'pedestrian'
        ? 'Pedestrian Corridor'
        : edge.familyId === 'tunnels' || edge.elevationMode === 'underground'
          ? 'Underground Tunnel'
          : edge.familyId === 'waterways' || edge.domain === 'waterway'
            ? 'Waterway Canal'
            : edge.familyId === 'utilities' || edge.domain === 'power' || edge.domain === 'pipe' || edge.domain === 'telecom'
              ? 'Utility Corridor'
              : edge.familyId === 'facilities' || edge.domain === 'cycle'
                ? 'Facility / Cycle Corridor'
                : edge.domain === 'suspended_rail'
                  ? 'Suspended Guideway'
                  : edge.domain === 'monorail'
                    ? 'Monorail Segment'
                    : edge.domain === 'rail'
                      ? 'Railway Track'
                      : edge.domain === 'tram'
                        ? 'Tram Corridor'
                        : 'Road Segment';
    const pathBox = document.createElement('div');
    pathBox.className = 'infra-group-box';
    pathBox.innerHTML = `
      <div class="infra-group-title">${uiEsc(segLabel)}: ${uiEsc(edge.id)} <span class="infra-tag">${uiEsc(edge.elevationMode)}</span></div>
      <div class="infra-field-row">
        <div class="infra-field-top"><label>Curve Shape</label></div>
        <select class="infra-select" id="edge-curve-type">
          <option value="line" ${edge.curveType === 'line' ? 'selected' : ''}>Straight Line</option>
          <option value="arc" ${edge.curveType === 'arc' ? 'selected' : ''}>Curved Arc</option>
        </select>
      </div>
      <div class="infra-field-row">
        <div class="infra-field-top"><label>Curvature Bulge (m)</label><span class="infra-val-badge" id="bulge-val">${edge.curveBulge || 0}</span></div>
        <input type="range" min="-20" max="20" step="0.5" id="edge-curve-bulge" value="${edge.curveBulge || 0}">
      </div>
      <div class="infra-field-row">
        <div class="infra-field-top"><label>Elevation Mode</label></div>
        <select class="infra-select" id="edge-elev-mode">
          <option value="grade" ${edge.elevationMode === 'grade' ? 'selected' : ''}>At-Grade (Terrain)</option>
          <option value="elevated" ${edge.elevationMode === 'elevated' ? 'selected' : ''}>Elevated Structure</option>
          <option value="suspended" ${edge.elevationMode === 'suspended' ? 'selected' : ''}>Suspended Overhead Guideway</option>
          <option value="underground" ${edge.elevationMode === 'underground' ? 'selected' : ''}>Underground / Tunnel</option>
          <option value="aerial" ${edge.elevationMode === 'aerial' ? 'selected' : ''}>Aerial Utility / Span</option>
        </select>
      </div>
      <div class="infra-action-row" style="margin-top:6px;">
        <button type="button" class="infra-btn-sm" id="btn-split-selected"><i class="fa-solid fa-scissors"></i> Split Midpoint</button>
        <button type="button" class="infra-btn-danger" id="btn-del-edge"><i class="fa-solid fa-trash"></i> Delete Segment</button>
      </div>
    `;
    container.appendChild(pathBox);

    pathBox.querySelector('#edge-curve-type')?.addEventListener('change', (e) => {
      const ct = e.target.value;
      const bulge = ct === 'arc' && Math.abs(edge.curveBulge || 0) < 0.5 ? 5.0 : (ct === 'line' ? 0 : edge.curveBulge);
      infraExecuteCommand(doc, { type: 'UPDATE_EDGE', edgeId: edge.id, curveType: ct, curveBulge: bulge });
      ctx.rebuildAll('Updated curve type');
    });
    let origBulge = edge.curveBulge || 0;
    let origCurveType = edge.curveType || 'line';
    pathBox.querySelector('#edge-curve-bulge')?.addEventListener('pointerdown', () => {
      origBulge = edge.curveBulge || 0;
      origCurveType = edge.curveType || 'line';
    });
    pathBox.querySelector('#edge-curve-bulge')?.addEventListener('input', (e) => {
      const b = Number(e.target.value) || 0;
      pathBox.querySelector('#bulge-val').textContent = String(b);
      edge.curveBulge = b;
      edge.curveType = Math.abs(b) > 0.05 ? 'arc' : 'line';
      ctx.rebuildLivePreview();
    });
    pathBox.querySelector('#edge-curve-bulge')?.addEventListener('change', (e) => {
      const b = Number(e.target.value) || 0;
      edge.curveBulge = origBulge;
      edge.curveType = origCurveType;
      infraExecuteCommand(doc, {
        type: 'UPDATE_EDGE',
        edgeId: edge.id,
        curveType: Math.abs(b) > 0.05 ? 'arc' : 'line',
        curveBulge: b
      });
      origBulge = b;
      origCurveType = Math.abs(b) > 0.05 ? 'arc' : 'line';
      ctx.rebuildAll('Updated curvature');
    });
    pathBox.querySelector('#edge-elev-mode')?.addEventListener('change', (e) => {
      const mode = e.target.value;
      infraExecuteCommand(doc, { type: 'UPDATE_EDGE', edgeId: edge.id, elevationMode: mode });
      ctx.rebuildAll(`Set ${edge.id} to ${mode}`);
    });
    pathBox.querySelector('#btn-split-selected')?.addEventListener('click', () => {
      infraExecuteCommand(doc, { type: 'SPLIT_EDGE', edgeId: edge.id, t: 0.5 });
      ctx.rebuildAll(`Split ${edge.id}`);
    });
    pathBox.querySelector('#btn-del-edge')?.addEventListener('click', () => {
      infraExecuteCommand(doc, { type: 'DELETE_EDGE', edgeId: edge.id });
      ctx.rebuildAll(`Deleted ${edge.id}`);
    });

    // Family Schema Controls grouped cleanly
    const schemaFamId = edge.familyId === 'railways' && edge.domain === 'road' ? 'roads' : (edge.familyId || 'roads');
    const targetFam = infraGetFamily(schemaFamId);
    const locks = new Set(edge.locks || []);
    const groups = new Map();
    for (const f of targetFam?.schema || []) {
      if (f.group === 'Structural Supports' && edge.elevationMode !== 'elevated' && edge.elevationMode !== 'suspended') continue;
      if (!groups.has(f.group)) groups.set(f.group, []);
      groups.get(f.group).push(f);
    }

    for (const [gName, fields] of groups.entries()) {
      const gBox = document.createElement('div');
      gBox.className = 'infra-group-box';
      gBox.innerHTML = `<div class="infra-group-title">${uiEsc(gName)}</div>`;
      for (const field of fields) {
        gBox.appendChild(
          uiCreateFieldRow(
            field,
            edge.params?.[field.key],
            locks.has(field.key),
            (key, val) => {
              infraExecuteCommand(doc, { type: 'UPDATE_EDGE', edgeId: edge.id, params: { [key]: val } });
              ctx.rebuildAll(`Updated ${field.label}`);
            },
            (key) => {
              const nextLocks = new Set(edge.locks || []);
              if (nextLocks.has(key)) nextLocks.delete(key);
              else nextLocks.add(key);
              infraExecuteCommand(doc, { type: 'UPDATE_EDGE', edgeId: edge.id, locks: Array.from(nextLocks) });
              ctx.renderInspector();
            }
          )
        );
      }
      container.appendChild(gBox);
    }
    return;
  }

  if (activeTab === 'topology') {
    const crossings = solved?.crossings || [];
    const ports = solved?.edgePortsById ? Array.from(solved.edgePortsById.entries()) : [];
    const switches = (solved?.junctions || []).filter((j) => j.switchMetadata);
    const platforms = solved?.platforms || [];
    const stairs = solved?.stairs || [];
    const envList = blueprint?.gameplayMetadata?.clearanceEnvelopes || [];
    container.innerHTML = `
      <div class="infra-group-box">
        <div class="infra-group-title">3D Crossings (${crossings.length})</div>
        ${
          crossings.length
            ? crossings
                .map(
                  (c) => `
          <div class="infra-diag-item ${c.valid ? 'ok' : 'err'}">
            <strong>${uiEsc(c.upperEdgeId)} over ${uiEsc(c.lowerEdgeId)}</strong>
            <small>Kind: ${uiEsc(c.crossingKind)} · Clearance: ${c.verticalClearanceMeters}m (req ${c.requiredClearanceMeters}m)</small>
            <small>${uiEsc(c.note)}</small>
          </div>`
                )
                .join('')
            : '<small class="infra-muted">No non-adjacent 3D crossings detected in current graph.</small>'
        }
      </div>
      <div class="infra-group-box">
        <div class="infra-group-title">Rail Switches, Platforms & Stairs</div>
        ${
          switches.length
            ? switches
                .map(
                  (sw) => `
          <div class="infra-diag-item ok">
            <strong>Switch ${uiEsc(sw.nodeId)} (${uiEsc(sw.switchMetadata.switchKind)})</strong>
            <small>Active State: ${uiEsc(sw.switchMetadata.activeState)} · Trunk: ${uiEsc(sw.switchMetadata.trunkEdgeId)} · Branches: ${sw.switchMetadata.branches.length}</small>
          </div>`
                )
                .join('')
            : ''
        }
        ${
          platforms.length || stairs.length
            ? `
          <div class="infra-diag-item ok">
            <strong>Transit Stations & Access</strong>
            <small>Platforms: ${platforms.length} · Stair Flights: ${stairs.length}</small>
            ${stairs
              .map(
                (st) => `<small>${uiEsc(st.id)}: ${st.stepCount} steps @ ${st.stepRiseMeters}m rise (max 0.2438m) · headroom ${st.headroomMeters}m</small>`
              )
              .join('')}
          </div>`
            : (!switches.length ? '<small class="infra-muted">No active rail switches or station assemblies in scene.</small>' : '')
        }
      </div>
      <div class="infra-group-box">
        <div class="infra-group-title">Suspended & Corridor Clearances (${envList.length})</div>
        <div class="infra-port-list">
          ${envList
            .map(
              (ev) => `
            <div class="infra-port-item">
              <strong>${uiEsc(ev.edgeId)}</strong> (${uiEsc(ev.clearanceEnvelopeId)})
              <small>Range Y: [${ev.verticalEnvelopeMeters.clearanceBottomY}m .. ${ev.verticalEnvelopeMeters.clearanceTopY}m] · Req Headroom: ${ev.verticalEnvelopeMeters.requiredHeadroomAboveDatum}m</small>
            </div>`
            )
            .join('')}
        </div>
      </div>
      <div class="infra-group-box">
        <div class="infra-group-title">Semantic Edge Ports (${ports.length * 2})</div>
        <div class="infra-port-list">
          ${ports
            .map(
              ([eid, pair]) => `
            <div class="infra-port-item">
              <strong>${uiEsc(eid)}</strong> (${uiEsc(pair.startPort.domain)} · ${uiEsc(pair.startPort.elevationMode)})
              <small>Width: ${pair.startPort.widthMeters}m · Channels: ${pair.startPort.channels.length}</small>
              <small>Start→${uiEsc(pair.startPort.connectedTo?.nodeId || 'open')} | End→${uiEsc(pair.endPort.connectedTo?.nodeId || 'open')}</small>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
    return;
  }

  if (activeTab === 'diagnostics') {
    const terrOps = solved?.surfaceOwnership?.terrainOperations || [];
    const vegZones = solved?.surfaceOwnership?.vegetationZones || [];
    container.innerHTML = `
      <div class="infra-group-box">
        <div class="infra-group-title">Surface Ownership & Z-Fighting Audit</div>
        <div class="infra-diag-item ${geoAudit?.valid !== false ? 'ok' : 'err'}">
          <strong>Coplanar Z-Fighting Overlaps: ${geoAudit?.coplanarOverlapCount ?? 0}</strong>
          <small>Degenerate Tris: ${geoAudit?.degenerateCount ?? 0} · Inverted Horizontal: ${geoAudit?.invertedHorizontalCount ?? 0}</small>
          <small>Terrain Masks: ${terrOps.length} · Vegetation Exclusion Zones: ${vegZones.length}</small>
        </div>
      </div>
      <div class="infra-group-box">
        <div class="infra-group-title">Network & Structural Diagnostics (${diagnostics.issues.length})</div>
        ${
          diagnostics.issues.length
            ? diagnostics.issues
                .map(
                  (iss) => `
          <button type="button" class="infra-diag-item ${iss.severity === 'error' ? 'err' : 'warn'}" data-diag-kind="${uiEsc(iss.targetKind)}" data-diag-id="${uiEsc(iss.targetId)}">
            <strong>[${uiEsc(iss.severity.toUpperCase())}] ${uiEsc(iss.category)}</strong>
            <small>${uiEsc(iss.message)}</small>
          </button>`
                )
                .join('')
            : '<div class="infra-diag-item ok"><strong>All Checks Passed</strong><small>Connections, clearances, supports, and surface ownership are clean.</small></div>'
        }
      </div>
    `;
    container.querySelectorAll('[data-diag-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.diagKind === 'node' || btn.dataset.diagKind === 'edge') {
          doc.selection = { kind: btn.dataset.diagKind, id: btn.dataset.diagId };
          ctx.onSelectionChanged();
        }
      });
    });
    return;
  }

  if (activeTab === 'export') {
    const vault = ctx.getVault();
    const bpText = blueprint ? JSON.stringify(blueprint, null, 2).slice(0, 4200) : '';
    container.innerHTML = `
      <div class="infra-group-box">
        <div class="infra-group-title">Export Options (b.infrastructure.v1 & .GLB)</div>
        <div class="infra-field-row">
          <div class="infra-field-top"><label>GLB Units</label></div>
          <select class="infra-select" id="exp-units">
            <option value="meters" ${ctx.exportOpts.exportUnits === 'meters' ? 'selected' : ''}>Meters (1.0m)</option>
            <option value="b_units" ${ctx.exportOpts.exportUnits === 'b_units' ? 'selected' : ''}>B Remastered Units (16.4042/m)</option>
          </select>
        </div>
        <div class="infra-field-row">
          <div class="infra-field-top"><label>GLB Up Axis</label></div>
          <select class="infra-select" id="exp-axis">
            <option value="y_up" ${ctx.exportOpts.exportAxis === 'y_up' ? 'selected' : ''}>Y-Up (Standard glTF / Preview)</option>
            <option value="z_up" ${ctx.exportOpts.exportAxis === 'z_up' ? 'selected' : ''}>Z-Up (B Remastered Engine)</option>
          </select>
        </div>
        <div class="infra-export-stack">
          <button type="button" class="infra-btn-primary" id="exp-btn-glb"><i class="fa-solid fa-cube"></i> Export Binary .GLB</button>
          <button type="button" class="infra-btn" id="exp-btn-bp"><i class="fa-solid fa-file-code"></i> Export b.infrastructure.v1 JSON</button>
          <button type="button" class="infra-btn" id="exp-btn-asm"><i class="fa-solid fa-diagram-project"></i> Export Assembly Sockets (v1)</button>
          <button type="button" class="infra-btn" id="exp-btn-imp"><i class="fa-solid fa-file-import"></i> Import Blueprint JSON</button>
        </div>
      </div>

      <div class="infra-group-box">
        <div class="infra-group-title">Saved Blueprints (LocalStorage)</div>
        <div class="infra-vault-save">
          <input type="text" id="vault-name" class="infra-input" placeholder="Network name..." maxlength="48">
          <button type="button" class="infra-btn-sm" id="vault-save-btn">Save</button>
        </div>
        <div class="infra-vault-list">
          ${
            vault.length
              ? vault
                  .map(
                    (v) => `
            <div class="infra-vault-row">
              <button type="button" class="infra-vault-load" data-load-vault="${uiEsc(v.id)}">${uiEsc(v.name)}</button>
              <button type="button" class="infra-vault-del" data-del-vault="${uiEsc(v.id)}" title="Delete"><i class="fa-solid fa-xmark"></i></button>
            </div>`
                  )
                  .join('')
              : '<small class="infra-muted">No locally saved blueprints yet.</small>'
          }
        </div>
      </div>

      <details class="infra-group-box">
        <summary class="infra-group-title" style="cursor:pointer;">Blueprint Preview (${uiEsc(blueprint?.templateRevision || 'rev')})</summary>
        <pre class="infra-json-pre">${uiEsc(bpText)}${bpText.length >= 4200 ? '\n... (truncated preview)' : ''}</pre>
      </details>
    `;

    container.querySelector('#exp-units')?.addEventListener('change', (e) => (ctx.exportOpts.exportUnits = e.target.value));
    container.querySelector('#exp-axis')?.addEventListener('change', (e) => (ctx.exportOpts.exportAxis = e.target.value));
    container.querySelector('#exp-btn-glb')?.addEventListener('click', () => ctx.exportGLB());
    container.querySelector('#exp-btn-bp')?.addEventListener('click', () => ctx.exportBlueprint());
    container.querySelector('#exp-btn-asm')?.addEventListener('click', () => ctx.exportAssembly?.());
    container.querySelector('#exp-btn-imp')?.addEventListener('click', () => ctx.triggerImport());
    container.querySelector('#vault-save-btn')?.addEventListener('click', () => {
      const val = container.querySelector('#vault-name')?.value;
      ctx.saveVault(val);
    });
    container.querySelectorAll('[data-load-vault]').forEach((b) =>
      b.addEventListener('click', () => ctx.loadVault(b.dataset.loadVault))
    );
    container.querySelectorAll('[data-del-vault]').forEach((b) =>
      b.addEventListener('click', () => ctx.deleteVault(b.dataset.delVault))
    );
  }
}
