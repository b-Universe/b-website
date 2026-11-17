import { $, $$, clamp } from '../utils.js';
import { SPACE_GROUPS, OBJECT_CATEGORIES } from '../core/categories.js';
import { getAllObjectFamilies, buildDefaultConfigForFamily } from '../core/registry.js';
import { buildCityObject } from '../core/assemblies.js';
import { disposeObjectGroup } from './preview.js';

const CTV_THUMB_W = 220;
const CTV_THUMB_H = 165;
const CTV_BATCH_PER_FRAME = 2;

const ctvThumbCache = new Map();
const ctvPendingQueue = [];
const ctvQueuedCards = new Set();

let ctvRenderer = null;
let ctvScene = null;
let ctvCamera = null;
let ctvFloor = null;
let ctvRafId = 0;
let ctvObserver = null;
let ctvInitialized = false;
let ctvActiveOptions = null;

const ctvFilterState = {
  spaceGroup: 'all',
  categoryId: 'all',
  query: ''
};

function ctvEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ctvFormatLocTag(loc) {
  if (loc === 'interior') return '[In]';
  if (loc === 'both') return '[In/Out]';
  return '[Out]';
}

function ctvEnsureRenderer() {
  if (ctvRenderer || typeof THREE === 'undefined') return ctvRenderer;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = CTV_THUMB_W;
    canvas.height = CTV_THUMB_H;
    ctvRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    ctvRenderer.setSize(CTV_THUMB_W, CTV_THUMB_H, false);
    ctvRenderer.setPixelRatio(1);
    if (THREE.SRGBColorSpace && 'outputColorSpace' in ctvRenderer) {
      ctvRenderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    ctvScene = new THREE.Scene();
    ctvScene.background = new THREE.Color('#131b26');

    ctvCamera = new THREE.PerspectiveCamera(34, CTV_THUMB_W / CTV_THUMB_H, 0.05, 100);

    const hemi = new THREE.HemisphereLight('#dff2ff', '#283344', 0.95);
    ctvScene.add(hemi);

    const key = new THREE.DirectionalLight('#fff8eb', 1.45);
    key.position.set(4.5, 6.5, 5.5);
    ctvScene.add(key);

    const fill = new THREE.DirectionalLight('#8ec5ff', 0.55);
    fill.position.set(-4.5, 2.5, 3.0);
    ctvScene.add(fill);

    const rim = new THREE.DirectionalLight('#54d2ff', 0.45);
    rim.position.set(-2.0, 4.0, -5.0);
    ctvScene.add(rim);

    ctvFloor = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 24),
      new THREE.MeshStandardMaterial({ color: '#1b2636', roughness: 0.92, metalness: 0.05 })
    );
    ctvFloor.rotation.x = -Math.PI * 0.5;
    ctvFloor.position.y = -0.004;
    ctvScene.add(ctvFloor);
  } catch (err) {
    console.warn('Thumbnail renderer unavailable:', err);
    ctvRenderer = null;
  }
  return ctvRenderer;
}

function ctvBuildRenderGroup(familyId, presetId) {
  const cfg = buildDefaultConfigForFamily(familyId, presetId);
  return buildCityObject(cfg, { applyVariation: false }) || null;
}

function ctvRenderPresetThumbnail(familyId, presetId) {
  if (ctvThumbCache.has(presetId)) return ctvThumbCache.get(presetId);
  const renderer = ctvEnsureRenderer();
  if (!renderer || !ctvScene || !ctvCamera) return null;

  let group = null;
  try {
    group = ctvBuildRenderGroup(familyId, presetId);
    if (!group) return null;
    ctvScene.add(group);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
      box.getSize(size);
      box.getCenter(center);
    } else {
      size.set(1, 1, 1);
      center.set(0, 0.5, 0);
    }

    const maxDim = Math.max(size.x, size.y, size.z, 0.35);
    const footprint = Math.max(size.x, size.z, 0.5);
    if (ctvFloor) {
      ctvFloor.visible = box.min.y > -0.15;
      ctvFloor.scale.setScalar(clamp(footprint * 0.95, 0.5, 6.0));
      ctvFloor.position.y = Math.min(0, box.min.y) - 0.004;
    }

    const isFlatFrontProp = size.z < size.x * 0.28 && size.y >= size.z * 1.4;
    const azimuth = isFlatFrontProp ? 0.32 : 0.56;
    const elev = size.y < 0.25 && maxDim > 0.7 ? 0.58 : 0.36;
    const dist = clamp(maxDim * 1.85, 0.95, 22);

    const cosE = Math.cos(elev);
    ctvCamera.position.set(
      center.x + Math.sin(azimuth) * cosE * dist,
      center.y + Math.sin(elev) * dist + size.y * 0.06,
      center.z + Math.cos(azimuth) * cosE * dist
    );
    ctvCamera.lookAt(center);
    ctvCamera.updateProjectionMatrix();

    renderer.render(ctvScene, ctvCamera);
    const url = renderer.domElement.toDataURL('image/png');
    ctvThumbCache.set(presetId, url);
    return url;
  } catch (err) {
    console.warn(`Thumbnail render failed for ${presetId}:`, err);
    return null;
  } finally {
    if (group) {
      ctvScene.remove(group);
      disposeObjectGroup(group);
    }
  }
}

function ctvFindPresetEntry(presetId) {
  const families = getAllObjectFamilies();
  for (const fam of families) {
    const preset = (fam.presets || []).find((p) => p.id === presetId);
    if (preset) {
      return { family: fam, preset };
    }
  }
  return null;
}

function ctvApplyThumbToCard(card, dataUrl) {
  const box = card?.querySelector('.ctv-thumb-box');
  if (!box) return;
  if (!dataUrl) {
    box.innerHTML = '<span class="ctv-thumb-fallback"><i class="fa-solid fa-cube"></i></span>';
    return;
  }
  let img = box.querySelector('img.ctv-thumb-img');
  if (!img) {
    box.innerHTML = '';
    img = document.createElement('img');
    img.className = 'ctv-thumb-img';
    img.alt = card.dataset.presetLabel || 'Object Preview';
    box.appendChild(img);
  }
  img.src = dataUrl;
  card.dataset.rendered = 'true';
}

function ctvProcessQueue() {
  ctvRafId = 0;
  const modal = $('#catalog-view-modal');
  if (!modal || modal.hidden) return;

  let count = 0;
  while (ctvPendingQueue.length > 0 && count < CTV_BATCH_PER_FRAME) {
    const card = ctvPendingQueue.shift();
    if (!card) continue;
    ctvQueuedCards.delete(card);
    if (!card.isConnected || card.dataset.rendered === 'true') continue;

    const presetId = card.dataset.presetId;
    const match = ctvFindPresetEntry(presetId);
    if (!match) continue;
    const url = ctvRenderPresetThumbnail(match.family.id, presetId);
    ctvApplyThumbToCard(card, url);
    count += 1;
  }

  if (ctvPendingQueue.length > 0) {
    ctvRafId = requestAnimationFrame(ctvProcessQueue);
  }
}

function ctvEnqueueCard(card) {
  if (!card || card.dataset.rendered === 'true') return;
  const presetId = card.dataset.presetId;
  if (!presetId) return;

  if (ctvThumbCache.has(presetId)) {
    ctvApplyThumbToCard(card, ctvThumbCache.get(presetId));
    return;
  }
  if (ctvQueuedCards.has(card)) return;
  ctvQueuedCards.add(card);
  ctvPendingQueue.push(card);
  if (!ctvRafId) {
    ctvRafId = requestAnimationFrame(ctvProcessQueue);
  }
}

function ctvSetupObserver() {
  const body = $('#ctv-body');
  if (!body) return;
  if (ctvObserver) ctvObserver.disconnect();

  if (typeof IntersectionObserver !== 'undefined') {
    ctvObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ctvEnqueueCard(entry.target);
            ctvObserver.unobserve(entry.target);
          }
        }
      },
      { root: body, rootMargin: '240px 0px' }
    );
    $$('.ctv-card', body).forEach((card) => ctvObserver.observe(card));
  } else {
    $$('.ctv-card', body).forEach((card) => ctvEnqueueCard(card));
  }
}

function ctvBuildFilteredSections() {
  const q = ctvFilterState.query.trim().toLowerCase();
  const families = getAllObjectFamilies();
  const byCategory = new Map();

  for (const cat of OBJECT_CATEGORIES) {
    if (ctvFilterState.spaceGroup !== 'all' && cat.spaceGroup !== ctvFilterState.spaceGroup) continue;
    if (ctvFilterState.categoryId !== 'all' && cat.id !== ctvFilterState.categoryId) continue;
    byCategory.set(cat.id, { category: cat, items: [] });
  }

  for (const fam of families) {
    const famCats = Array.isArray(fam.categories) && fam.categories.length ? fam.categories : [fam.categoryId];
    for (const preset of (fam.presets || [])) {
      if (q) {
        const hay = `${preset.label} ${fam.name} ${fam.subcategory || ''} ${(fam.tags || []).join(' ')} ${(fam.environmentTags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      for (const cid of famCats) {
        const bucket = byCategory.get(cid);
        if (bucket) {
          bucket.items.push({ family: fam, preset });
        }
      }
    }
  }

  return Array.from(byCategory.values()).filter((sec) => sec.items.length > 0);
}

function ctvRenderFilters() {
  const spaceWrap = $('#ctv-space-filters');
  const catSelect = $('#ctv-category-select');

  if (spaceWrap) {
    const chips = SPACE_GROUPS.map((g) => ({ id: g.id, label: g.label }));
    spaceWrap.innerHTML = chips.map((chip) => {
      const active = ctvFilterState.spaceGroup === chip.id ? 'active' : '';
      return `<button type="button" class="ctv-space-btn ${active}" data-space="${ctvEscape(chip.id)}">${ctvEscape(chip.label)}</button>`;
    }).join('');
  }

  if (catSelect) {
    const visibleCats = OBJECT_CATEGORIES.filter(
      (cat) => ctvFilterState.spaceGroup === 'all' || cat.spaceGroup === ctvFilterState.spaceGroup
    );
    if (ctvFilterState.categoryId !== 'all' && !visibleCats.some((c) => c.id === ctvFilterState.categoryId)) {
      ctvFilterState.categoryId = 'all';
    }
    const opts = [
      `<option value="all">All Categories (${visibleCats.length})</option>`,
      ...visibleCats.map((c) => `<option value="${ctvEscape(c.id)}"${ctvFilterState.categoryId === c.id ? ' selected' : ''}>${ctvEscape(c.code)} · ${ctvEscape(c.label)}</option>`)
    ];
    catSelect.innerHTML = opts.join('');
  }
}

export function renderCatalogThumbnailGrid() {
  const body = $('#ctv-body');
  const countBadge = $('#ctv-count-badge');
  if (!body) return;

  ctvPendingQueue.length = 0;
  ctvQueuedCards.clear();

  const sections = ctvBuildFilteredSections();
  const activePresetId = ctvActiveOptions?.getActivePresetId?.() || '';
  let totalVisible = 0;

  if (!sections.length) {
    if (countBadge) countBadge.textContent = '0 Models Shown';
    body.innerHTML = `
      <div class="ctv-empty">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>No 3d objects match the active Catalog View filters.</p>
      </div>
    `;
    return;
  }

  const html = sections.map((sec) => {
    totalVisible += sec.items.length;
    const spaceMeta = SPACE_GROUPS.find((s) => s.id === sec.category.spaceGroup);
    const cardsHtml = sec.items.map(({ family, preset }) => {
      const isSelected = preset.id === activePresetId;
      const loc = preset.locationContext || family.locationContext || 'exterior';
      const cached = ctvThumbCache.get(preset.id);
      const thumbInner = cached
        ? `<img class="ctv-thumb-img" src="${cached}" alt="${ctvEscape(preset.label)}">`
        : '<span class="ctv-thumb-loading"><i class="fa-solid fa-cube"></i> Rendering...</span>';

      return `
        <button
          type="button"
          class="ctv-card ${isSelected ? 'is-active' : ''}"
          data-preset-id="${ctvEscape(preset.id)}"
          data-family-id="${ctvEscape(family.id)}"
          data-preset-label="${ctvEscape(preset.label)}"
          data-rendered="${cached ? 'true' : 'false'}"
          title="Load ${ctvEscape(preset.label)} Into Editor"
        >
          <div class="ctv-thumb-box">${thumbInner}</div>
          <div class="ctv-card-meta">
            <div class="ctv-card-title">${ctvEscape(preset.label)}</div>
            <div class="ctv-card-sub">
              <span>${ctvEscape(family.name)}</span>
              <span class="ctv-loc-tag">${ctvEscape(ctvFormatLocTag(loc))}</span>
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <section class="ctv-category-section" data-category-id="${ctvEscape(sec.category.id)}">
        <header class="ctv-category-header">
          <div class="ctv-category-title-wrap">
            <span class="ctv-cat-code">${ctvEscape(sec.category.code)}</span>
            <h3>${ctvEscape(sec.category.label)}</h3>
            <span class="ctv-space-label">${ctvEscape(spaceMeta?.label || sec.category.spaceGroup)}</span>
          </div>
          <span class="ctv-cat-count">${sec.items.length} ${sec.items.length === 1 ? 'Model' : 'Models'}</span>
        </header>
        <div class="ctv-grid">${cardsHtml}</div>
      </section>
    `;
  }).join('');

  if (countBadge) {
    countBadge.textContent = `${totalVisible} Models Across ${sections.length} Categories`;
  }
  body.innerHTML = html;
  ctvSetupObserver();
}

export function openCatalogThumbnailView() {
  const modal = $('#catalog-view-modal');
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ctv-modal-open');
  ctvRenderFilters();
  renderCatalogThumbnailGrid();
  $('#ctv-search-input')?.focus();
}

export function closeCatalogThumbnailView() {
  const modal = $('#catalog-view-modal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ctv-modal-open');
  ctvPendingQueue.length = 0;
  ctvQueuedCards.clear();
  if (ctvRafId) {
    cancelAnimationFrame(ctvRafId);
    ctvRafId = 0;
  }
  if (ctvObserver) {
    ctvObserver.disconnect();
  }
}

export function initCatalogThumbnailView(options = {}) {
  ctvActiveOptions = options;
  if (ctvInitialized) return;
  ctvInitialized = true;

  const modal = $('#catalog-view-modal');
  const openBtn = $('#btn-catalog-view');
  const closeBtn = $('#ctv-close-btn');
  const searchInput = $('#ctv-search-input');
  const spaceFilters = $('#ctv-space-filters');
  const catSelect = $('#ctv-category-select');
  const body = $('#ctv-body');

  openBtn?.addEventListener('click', () => openCatalogThumbnailView());
  closeBtn?.addEventListener('click', () => closeCatalogThumbnailView());

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCatalogThumbnailView();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      e.preventDefault();
      e.stopPropagation();
      closeCatalogThumbnailView();
    }
  });

  searchInput?.addEventListener('input', (e) => {
    ctvFilterState.query = e.target.value || '';
    renderCatalogThumbnailGrid();
  });

  spaceFilters?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-space]');
    if (!btn) return;
    ctvFilterState.spaceGroup = btn.dataset.space || 'all';
    ctvRenderFilters();
    renderCatalogThumbnailGrid();
  });

  catSelect?.addEventListener('change', (e) => {
    ctvFilterState.categoryId = e.target.value || 'all';
    renderCatalogThumbnailGrid();
  });

  body?.addEventListener('click', (e) => {
    const card = e.target.closest('.ctv-card');
    if (!card) return;
    const presetId = card.dataset.presetId;
    const familyId = card.dataset.familyId;
    if (!presetId) return;
    closeCatalogThumbnailView();
    if (ctvActiveOptions?.onSelectPreset) {
      ctvActiveOptions.onSelectPreset(presetId, familyId);
    }
  });
}
