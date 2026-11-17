import { $ } from '../utils.js';
import {
  SPACE_GROUPS,
  OBJECT_CATEGORIES,
  ATTACHMENT_PROFILES,
  ARCHITECTURAL_STYLES,
  SIZE_CLASSES,
  FUNCTIONAL_ROLES,
  CONDITION_LEVELS,
  LOCATION_CONTEXTS
} from '../core/categories.js';
import {
  getAllObjectFamilies,
  getAllCatalogTags,
  getAllEnvironmentTags,
  getCategoryMeta,
  searchCatalog
} from '../core/registry.js';
import { generateVariationCandidates } from '../core/variation.js';

const CATALOG_PAGE_SIZE = 36;
let catRenderLimit = CATALOG_PAGE_SIZE;
let catLastFilterKey = '';
let catScrollListenerBound = false;
let catLatestRenderArgs = null;

function catEscapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catFormatLocationBadge(locId) {
  if (locId === 'interior') {
    return '<span class="loc-badge loc-interior">Interior</span>';
  }
  if (locId === 'both') {
    return '<span class="loc-badge loc-both">Indoor &amp; Outdoor</span>';
  }
  return '<span class="loc-badge loc-exterior">Exterior</span>';
}

export function renderCatalogFilterControls(catalogUiState, onFilterChange) {
  const spaceTabs = $('#catalog-space-tabs');
  const catPills = $('#catalog-category-pills');
  const subSelect = $('#catalog-subcategory-select');
  const attachSelect = $('#filter-attachment');
  const styleSelect = $('#filter-style');
  const sizeSelect = $('#filter-size');
  const roleSelect = $('#filter-role');
  const tagSelect = $('#filter-tag');
  const locSelect = $('#filter-location');
  const envSelect = $('#filter-env-tag');

  const allFamilies = getAllObjectFamilies();
  const catCounts = new Map();
  for (const fam of allFamilies) {
    const famCats = Array.isArray(fam.categories) && fam.categories.length > 0
      ? fam.categories
      : [fam.categoryId];
    for (const cid of famCats) {
      catCounts.set(cid, (catCounts.get(cid) || 0) + 1);
    }
  }

  const activeSpace = catalogUiState.filters.spaceGroup || 'all';
  if (spaceTabs) {
    spaceTabs.innerHTML = SPACE_GROUPS.map((sg) => {
      const sgCount = sg.id === 'all'
        ? allFamilies.length
        : searchCatalog('', { spaceGroup: sg.id }).length;
      return `<button type="button" class="space-tab ${activeSpace === sg.id ? 'active' : ''}" data-space="${catEscapeHtml(sg.id)}" title="${catEscapeHtml(sg.label)}">${catEscapeHtml(sg.shortLabel)} <span class="space-count">${sgCount}</span></button>`;
    }).join('');
    spaceTabs.querySelectorAll('.space-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const keepX = typeof window !== 'undefined' ? window.scrollX : 0;
        const keepY = typeof window !== 'undefined' ? window.scrollY : 0;
        btn.blur?.();
        catalogUiState.filters.spaceGroup = btn.dataset.space || 'all';
        catalogUiState.filters.categoryId = 'all';
        catalogUiState.filters.subcategory = 'all';
        const listEl = $('#catalog-family-list');
        if (listEl) listEl.scrollTop = 0;
        renderCatalogFilterControls(catalogUiState, onFilterChange);
        onFilterChange();
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo(keepX, keepY);
        }
      });
    });
  }

  if (catPills) {
    const prevPillsScroll = catPills.scrollTop;
    const activeCat = catalogUiState.filters.categoryId || 'all';
    const spaceTotal = activeSpace === 'all'
      ? allFamilies.length
      : searchCatalog('', { spaceGroup: activeSpace }).length;
    const sections = [
      `<button type="button" class="cat-pill ${activeCat === 'all' ? 'active' : ''}" data-cat="all">All (${spaceTotal})</button>`
    ];
    for (const sg of SPACE_GROUPS) {
      if (sg.id === 'all') continue;
      if (activeSpace !== 'all' && activeSpace !== sg.id) continue;
      const catsInGroup = OBJECT_CATEGORIES.filter((c) => c.spaceGroup === sg.id);
      if (catsInGroup.length === 0) continue;
      sections.push(`<div class="cat-group-header">${catEscapeHtml(sg.label)}</div>`);
      const pillHtml = catsInGroup.map((cat) => {
        const count = catCounts.get(cat.id) || 0;
        return `<button type="button" class="cat-pill ${activeCat === cat.id ? 'active' : ''}" data-cat="${cat.id}" title="${catEscapeHtml(cat.description)}"><span class="cat-code">${catEscapeHtml(cat.code)}</span> ${catEscapeHtml(cat.shortLabel)} <span class="cat-count">${count}</span></button>`;
      }).join('');
      sections.push(`<div class="cat-group-grid">${pillHtml}</div>`);
    }
    catPills.innerHTML = sections.join('');
    catPills.scrollTop = prevPillsScroll;
    catPills.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const keepX = typeof window !== 'undefined' ? window.scrollX : 0;
        const keepY = typeof window !== 'undefined' ? window.scrollY : 0;
        btn.blur?.();
        catalogUiState.filters.categoryId = btn.dataset.cat;
        catalogUiState.filters.subcategory = 'all';
        const listEl = $('#catalog-family-list');
        if (listEl) listEl.scrollTop = 0;
        renderCatalogFilterControls(catalogUiState, onFilterChange);
        onFilterChange();
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo(keepX, keepY);
        }
      });
    });
  }

  if (subSelect) {
    const activeCat = catalogUiState.filters.categoryId || 'all';
    let subs = [];
    if (activeCat === 'all') {
      const seen = new Set();
      for (const cat of OBJECT_CATEGORIES) {
        if (activeSpace !== 'all' && cat.spaceGroup !== activeSpace) continue;
        for (const sub of (cat.subcategories || [])) {
          if (!seen.has(sub)) {
            seen.add(sub);
            subs.push(sub);
          }
        }
      }
      for (const fam of allFamilies) {
        if (fam.subcategory && !seen.has(fam.subcategory)) {
          seen.add(fam.subcategory);
          subs.push(fam.subcategory);
        }
      }
    } else {
      const cat = getCategoryMeta(activeCat);
      subs = cat.subcategories || [];
    }
    subSelect.innerHTML = `<option value="all">All Subcategories</option>`
      + subs.map((s) => `<option value="${catEscapeHtml(s)}">${catEscapeHtml(s)}</option>`).join('');
    subSelect.value = catalogUiState.filters.subcategory || 'all';
  }

  if (attachSelect && !attachSelect.dataset.populated) {
    attachSelect.innerHTML = `<option value="all">All Attachment Profiles</option>`
      + Object.values(ATTACHMENT_PROFILES).map((p) => `<option value="${p.id}">${catEscapeHtml(p.label)}</option>`).join('');
    attachSelect.dataset.populated = '1';
    attachSelect.value = catalogUiState.filters.attachmentProfile || 'all';
  }

  if (styleSelect && !styleSelect.dataset.populated) {
    styleSelect.innerHTML = `<option value="all">All Architectural Styles</option>`
      + ARCHITECTURAL_STYLES.map((s) => `<option value="${s.id}">${catEscapeHtml(s.label)}</option>`).join('');
    styleSelect.dataset.populated = '1';
    styleSelect.value = catalogUiState.filters.architecturalStyle || 'all';
  }

  if (sizeSelect && !sizeSelect.dataset.populated) {
    sizeSelect.innerHTML = `<option value="all">All Size Classes</option>`
      + SIZE_CLASSES.map((s) => `<option value="${s.id}">${catEscapeHtml(s.label)}</option>`).join('');
    sizeSelect.dataset.populated = '1';
    sizeSelect.value = catalogUiState.filters.sizeClass || 'all';
  }

  if (roleSelect && !roleSelect.dataset.populated) {
    roleSelect.innerHTML = `<option value="all">All Functional Roles</option>`
      + FUNCTIONAL_ROLES.map((r) => `<option value="${r.id}">${catEscapeHtml(r.label)}</option>`).join('');
    roleSelect.dataset.populated = '1';
    roleSelect.value = catalogUiState.filters.functionalRole || 'all';
  }

  if (tagSelect) {
    const prev = catalogUiState.filters.tag || 'all';
    const tags = getAllCatalogTags();
    tagSelect.innerHTML = `<option value="all">All Tags (${tags.length})</option>`
      + tags.map((t) => `<option value="${catEscapeHtml(t)}">#${catEscapeHtml(t)}</option>`).join('');
    tagSelect.value = prev;
  }

  if (locSelect && !locSelect.dataset.populated) {
    locSelect.innerHTML = `<option value="all">All Locations</option>`
      + LOCATION_CONTEXTS.map((l) => `<option value="${l.id}">${catEscapeHtml(l.label)}</option>`).join('');
    locSelect.dataset.populated = '1';
    locSelect.value = catalogUiState.filters.locationContext || 'all';
  }

  if (envSelect) {
    const prev = catalogUiState.filters.environmentTag || 'all';
    const envs = getAllEnvironmentTags();
    envSelect.innerHTML = `<option value="all">All Environments (${envs.length})</option>`
      + envs.map((e) => `<option value="${catEscapeHtml(e)}">${catEscapeHtml(e.replace(/_/g, ' '))}</option>`).join('');
    envSelect.value = prev;
  }
}

export function renderCatalogResults(state, catalogUiState, favoritesSet, callbacks) {
  const listEl = $('#catalog-family-list');
  const countEl = $('#catalog-match-count');
  const breadEl = $('#catalog-breadcrumb');
  if (!listEl) return;

  catLatestRenderArgs = [state, catalogUiState, favoritesSet, callbacks];
  const filterKey = `${catalogUiState.query || ''}|${JSON.stringify(catalogUiState.filters || {})}|${favoritesSet?.size || 0}`;
  if (filterKey !== catLastFilterKey) {
    catLastFilterKey = filterKey;
    catRenderLimit = CATALOG_PAGE_SIZE;
  }

  const matches = searchCatalog(catalogUiState.query, catalogUiState.filters, favoritesSet);
  if (countEl) {
    const presetTotal = matches.reduce((sum, f) => sum + (f.presets?.length || 0), 0);
    countEl.textContent = `${matches.length} Families · ${presetTotal} Presets`;
  }

  if (breadEl) {
    const activeCat = getCategoryMeta(
      (getAllObjectFamilies().find((f) => f.id === state.familyId)?.categoryId) || '01_postal'
    );
    const activeFam = getAllObjectFamilies().find((f) => f.id === state.familyId);
    const activePreset = activeFam?.presets?.find((p) => p.id === state.presetId);
    breadEl.textContent = `${activeCat.label} / ${activeFam?.subcategory || ''} / ${activeFam?.label || ''} / ${activePreset?.label || state.presetId}`;
  }

  const prevListScroll = listEl.scrollTop;
  if (matches.length === 0) {
    listEl.innerHTML = `<div class="catalog-empty">No city objects match those filters. Try clearing tags or search terms.</div>`;
    listEl.scrollTop = 0;
    return;
  }

  const activeIdx = matches.findIndex((m) => m.id === state.familyId);
  if (activeIdx >= catRenderLimit) {
    catRenderLimit = Math.ceil((activeIdx + 1) / CATALOG_PAGE_SIZE) * CATALOG_PAGE_SIZE;
  }

  const visibleMatches = matches.slice(0, catRenderLimit);
  const remainingCount = matches.length - visibleMatches.length;

  listEl.innerHTML = visibleMatches.map((fam) => {
    const cat = getCategoryMeta(fam.categoryId);
    const isActiveFam = fam.id === state.familyId;
    const isFav = favoritesSet.has(fam.id);
    const attachMeta = ATTACHMENT_PROFILES[fam.attachmentProfile] || ATTACHMENT_PROFILES.ground_standing;
    const presetButtons = fam.presets.map((p) => {
      const isActivePreset = isActiveFam && p.id === state.presetId;
      const pLoc = p.locationContext || fam.locationContext || 'exterior';
      const locTag = pLoc === 'interior' ? '[In]' : pLoc === 'exterior' ? '[Out]' : '[In/Out]';
      return `<button type="button" class="catalog-preset-chip ${isActivePreset ? 'active' : ''}" data-family="${fam.id}" data-preset="${p.id}" title="${catEscapeHtml(p.label)}">${catEscapeHtml(p.label)}<span class="preset-loc-tag">${locTag}</span></button>`;
    }).join('');

    return `
      <div class="catalog-family-card ${isActiveFam ? 'active' : ''} ${fam.isAssembly ? 'is-assembly' : ''}" data-family="${fam.id}">
        <div class="catalog-family-top">
          <button type="button" class="catalog-family-select" data-family="${fam.id}">
            <span class="cat-badge">${catEscapeHtml(cat.code)}</span>
            <span class="fam-title">${catEscapeHtml(fam.label)}</span>
          </button>
          <button type="button" class="fav-star-btn ${isFav ? 'active' : ''}" data-fav-id="${fam.id}" title="Toggle Favorite">
            <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
          </button>
        </div>
        <div class="catalog-family-meta">
          ${catFormatLocationBadge(fam.locationContext || 'exterior')}
          <span class="meta-dot">·</span>
          <span>${catEscapeHtml(fam.subcategory)}</span>
          <span class="meta-dot">·</span>
          <span>${catEscapeHtml(attachMeta.label)}</span>
          ${fam.isAssembly ? '<span class="assembly-tag">Assembly</span>' : ''}
        </div>
        <div class="catalog-family-desc">${catEscapeHtml(fam.description)}</div>
        <div class="catalog-presets-row">${presetButtons}</div>
      </div>
    `;
  }).join('') + (remainingCount > 0
    ? `<button type="button" class="catalog-load-more-btn" id="btn-catalog-load-more">Show More Families (${remainingCount} Remaining)</button>`
    : '');
  listEl.scrollTop = prevListScroll;

  if (!catScrollListenerBound && typeof listEl.addEventListener === 'function') {
    catScrollListenerBound = true;
    listEl.addEventListener('scroll', () => {
      if (!catLatestRenderArgs) return;
      const btn = listEl.querySelector('#btn-catalog-load-more');
      if (!btn) return;
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 120) {
        catRenderLimit += CATALOG_PAGE_SIZE;
        renderCatalogResults(...catLatestRenderArgs);
      }
    }, { passive: true });
  }

  const catWrapWinScroll = (btn, fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const keepX = typeof window !== 'undefined' ? window.scrollX : 0;
    const keepY = typeof window !== 'undefined' ? window.scrollY : 0;
    btn.blur?.();
    fn();
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(keepX, keepY);
    }
  };

  const loadMoreBtn = listEl.querySelector('#btn-catalog-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', catWrapWinScroll(loadMoreBtn, () => {
      catRenderLimit += CATALOG_PAGE_SIZE;
      renderCatalogResults(state, catalogUiState, favoritesSet, callbacks);
    }));
  }

  listEl.querySelectorAll('.catalog-family-select').forEach((btn) => {
    btn.addEventListener('click', catWrapWinScroll(btn, () => {
      const famId = btn.dataset.family;
      const fam = matches.find((m) => m.id === famId);
      const firstPreset = fam?.presets?.[0]?.id;
      if (callbacks.onSelectPreset && firstPreset) {
        callbacks.onSelectPreset(firstPreset);
      }
    }));
  });

  listEl.querySelectorAll('.catalog-preset-chip').forEach((btn) => {
    btn.addEventListener('click', catWrapWinScroll(btn, () => {
      if (callbacks.onSelectPreset) {
        callbacks.onSelectPreset(btn.dataset.preset);
      }
    }));
  });

  listEl.querySelectorAll('.fav-star-btn').forEach((btn) => {
    btn.addEventListener('click', catWrapWinScroll(btn, () => {
      if (callbacks.onToggleFavorite) {
        callbacks.onToggleFavorite(btn.dataset.favId);
      }
    }));
  });
}

export function renderVariationBrowser(state, locks, callbacks) {
  const grid = $('#variation-browser-grid');
  if (!grid) return;

  const candidates = generateVariationCandidates(state, 6, locks);
  grid.innerHTML = candidates.map((cand) => {
    const condMeta = CONDITION_LEVELS.find((c) => c.id === cand.config.condition) || CONDITION_LEVELS[1];
    const isCurrent = cand.seed === state.seed && cand.index === 0;
    return `
      <button type="button" class="variation-card ${isCurrent ? 'active' : ''}" data-var-idx="${cand.index}">
        <div class="var-swatches">
          <span style="background:${cand.config.primaryColor}"></span>
          <span style="background:${cand.config.secondaryColor}"></span>
          <span style="background:${cand.config.accentColor}"></span>
          <span style="background:${cand.config.frameColor}"></span>
        </div>
        <div class="var-title">${catEscapeHtml(cand.label)}</div>
        <div class="var-sub">${catEscapeHtml(condMeta.label)} · #${cand.seed}</div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.variation-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const keepX = typeof window !== 'undefined' ? window.scrollX : 0;
      const keepY = typeof window !== 'undefined' ? window.scrollY : 0;
      card.blur?.();
      const idx = Number(card.dataset.varIdx);
      const picked = candidates[idx];
      if (picked && callbacks.onApplyVariation) {
        callbacks.onApplyVariation(picked.config, picked.label);
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo(keepX, keepY);
      }
    });
  });
}
