(function() {
  function initPortfolio() {
    const portfolioContainer = document.getElementById('portfolio-container');
    if (!portfolioContainer) return;

    const portfolioItems = [
      '/articles/dev-blog-3-webgl-landscape-multiplayer.html',
      '/articles/dev-blog-2-elevation-webgl-multiplayer.html',
      '/articles/dev-blog-1-landscape-sprites.html',
      '/articles/riley-wedding-2027.html',
      '/projects/armor_stand-generator.html',
      '/projects/b-the-game.html',
      '/projects/discord-timestamp-generator.html',
      '/projects/b-website.html',
      '/portfolio-scripts/discord/discord-web-redirect.html',
      '/projects/tiny-b-links.html'
    ];

    let cachedCards = [];

    async function loadPortfolio() {
      const fetches = portfolioItems.map(async (path) => {
        try {
          const response = await fetch(path);
          if (!response.ok) return null;
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const getMeta = (n) => doc.querySelector(`meta[name="${n}"]`)?.getAttribute('content');

          return {
            path,
            title: getMeta('portfolio-title') || doc.title.replace('B - ', ''),
            category: getMeta('portfolio-category') || 'article',
            date: getMeta('portfolio-date') || '1970-01-01',
            thumb: getMeta('portfolio-thumbnail') || '',
            desc: getMeta('portfolio-description') || ''
          };
        } catch (e) {
          return null;
        }
      });

      cachedCards = (await Promise.all(fetches)).filter(c => c !== null);
      updatePortfolio();
    }

    function updatePortfolio() {
      const filter = document.querySelector("#category-filters .active")?.dataset.filter || 'all';
      const sort = document.querySelector("#sort-filters .active")?.dataset.filter || 'latest';

      const sorted = [...cachedCards].sort((a, b) => {
        return sort === 'latest' 
          ? new Date(b.date) - new Date(a.date) 
          : new Date(a.date) - new Date(b.date);
      });

      const filtered = filter === 'all' ? sorted : sorted.filter(i => i.category === filter);

      const renderDOM = () => {
        portfolioContainer.innerHTML = filtered.map(item => {
          const safeName = 'card-' + item.path.replace(/[^a-zA-Z0-9]/g, '');
          
          return `
            <a href="${item.path}" class="portfolio-card" data-category="${item.category}" style="view-transition-name: ${safeName}">
              <div class="portfolio-image">
                ${item.thumb ? `<img src="${item.thumb}" alt="${item.title}" onerror="this.style.display='none'">` : ''}
                <span class="portfolio-tag ${item.category}-tag">${item.category}</span>
              </div>
              <div class="portfolio-content">
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
              </div>
            </a>
          `;
        }).join('');
      };

      if (document.startViewTransition) {
        document.startViewTransition(() => renderDOM());
      } else {
        renderDOM();
      }
    }

    document.querySelectorAll('.filter-button').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.parentElement.querySelector('.active').classList.remove('active');
        btn.classList.add('active');
        updatePortfolio();
      });
    });

    loadPortfolio();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPortfolio);
  else initPortfolio();
})();
