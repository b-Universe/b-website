import { tree$ } from '../utils.js';
import { TREE_CATEGORIES, TREE_PRESETS, getSpeciesMeta } from '../core/species.js';
import { createProceduralTree } from '../geometry/tree.js';
import { disposeTreeHierarchy } from './preview.js';

const thumbCache = new Map();
let thumbRenderer = null;
let thumbScene = null;
let thumbCam = null;
let thumbObserver = null;

function ensureThumbRenderer() {
  if (thumbRenderer) return;
  thumbRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  thumbRenderer.setSize(192, 192);
  thumbRenderer.setClearColor(0x000000, 0);

  thumbScene = new THREE.Scene();
  const amb = new THREE.AmbientLight(0xffffff, 0.72);
  const dir = new THREE.DirectionalLight(0xfff8e7, 0.9);
  dir.position.set(8, 14, 10);
  const rim = new THREE.DirectionalLight(0x00e0ff, 0.35);
  rim.position.set(-8, 6, -6);
  thumbScene.add(amb, dir, rim);

  thumbCam = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
}

function renderPresetThumbnail(presetId) {
  if (thumbCache.has(presetId)) return thumbCache.get(presetId);
  const preset = TREE_PRESETS[presetId];
  if (!preset || typeof THREE === 'undefined') return '';

  ensureThumbRenderer();

  const toClean = [];
  thumbScene.traverse((o) => {
    if (o.userData && o.userData._isThumbRoot) toClean.push(o);
  });
  toClean.forEach((o) => {
    thumbScene.remove(o);
    disposeTreeHierarchy(o);
  });

  const tree = createProceduralTree(preset, { lodLevel: 0 });
  tree.userData._isThumbRoot = true;
  thumbScene.add(tree);

  const box = new THREE.Box3().setFromObject(tree);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 1.8);
  const dist = maxDim * 1.65;
  thumbCam.position.set(center.x + dist * 0.65, center.y + dist * 0.35, center.z + dist * 0.85);
  thumbCam.lookAt(center);

  thumbRenderer.render(thumbScene, thumbCam);
  const url = thumbRenderer.domElement.toDataURL('image/png');
  thumbCache.set(presetId, url);

  thumbScene.remove(tree);
  disposeTreeHierarchy(tree);
  return url;
}

export function initTreeCatalogModal(onSelectPreset) {
  const modal = tree$('#tree-catalog-modal');
  const openBtn = tree$('#btn-catalog-modal');
  const closeBtn = tree$('#btn-close-catalog');
  const searchInput = tree$('#catalog-search-input');
  const catFilterWrap = tree$('#catalog-category-filters');
  const grid = tree$('#catalog-modal-grid');
  const countBadge = tree$('#catalog-modal-count');
  if (!modal || !grid) return;

  let activeCategory = 'all';
  let query = '';

  function renderCategoryPills() {
    if (!catFilterWrap) return;
    catFilterWrap.innerHTML = '';
    TREE_CATEGORIES.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `studio-btn ${activeCategory === cat.id ? 'studio-btn-primary' : 'studio-btn-ghost'}`;
      btn.innerHTML = `<i class="fas ${cat.icon}"></i><span>${cat.label}</span>`;
      btn.addEventListener('click', () => {
        activeCategory = cat.id;
        renderCategoryPills();
        renderGrid();
      });
      catFilterWrap.appendChild(btn);
    });
  }

  function renderGrid() {
    if (thumbObserver) {
      thumbObserver.disconnect();
      thumbObserver = null;
    }

    const q = query.trim().toLowerCase();
    const entries = Object.values(TREE_PRESETS).filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (!q) return true;
      const sp = getSpeciesMeta(p.species);
      return (
        p.name.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        sp.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });

    if (countBadge) {
      countBadge.textContent = `${entries.length} Flora Presets`;
    }

    grid.innerHTML = '';
    entries.forEach((preset) => {
      const sp = getSpeciesMeta(preset.species);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'catalog-thumb-card';
      card.dataset.presetId = preset.id;
      card.innerHTML = `
        <div class="catalog-thumb-img-wrap">
          <img alt="${preset.name}" class="catalog-thumb-img" />
          <span class="catalog-thumb-badge">${sp.shortName}</span>
        </div>
        <div class="catalog-thumb-meta">
          <strong>${preset.name}</strong>
          <small>${preset.height}m • ${preset.season}</small>
        </div>
      `;
      card.addEventListener('click', () => {
        closeModal();
        if (onSelectPreset) onSelectPreset(preset);
      });
      grid.appendChild(card);
    });

    if ('IntersectionObserver' in window) {
      thumbObserver = new IntersectionObserver((items) => {
        items.forEach((item) => {
          if (!item.isIntersecting) return;
          const card = item.target;
          const id = card.dataset.presetId;
          const img = card.querySelector('.catalog-thumb-img');
          if (img && !img.src) {
            img.src = renderPresetThumbnail(id);
          }
          thumbObserver.unobserve(card);
        });
      }, { root: grid, rootMargin: '80px' });

      grid.querySelectorAll('.catalog-thumb-card').forEach((c) => thumbObserver.observe(c));
    } else {
      grid.querySelectorAll('.catalog-thumb-card').forEach((c) => {
        const img = c.querySelector('.catalog-thumb-img');
        if (img) img.src = renderPresetThumbnail(c.dataset.presetId);
      });
    }
  }

  function openModal() {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    renderCategoryPills();
    renderGrid();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      query = e.target.value || '';
      renderGrid();
    });
  }

  return { openModal, closeModal };
}

export function disposeTreeCatalogThumbs() {
  if (thumbObserver) {
    thumbObserver.disconnect();
    thumbObserver = null;
  }
  if (thumbRenderer) {
    thumbRenderer.dispose();
    try { thumbRenderer.forceContextLoss(); } catch (_) {}
    thumbRenderer = null;
  }
  thumbScene = null;
  thumbCam = null;
  thumbCache.clear();
}
