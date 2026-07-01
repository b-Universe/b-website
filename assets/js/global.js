(function() {
  function applyMagicStars(root) {
    // Auto-wrap literal asterisks for the Ecstatic theme rainbow effect
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_SKIP;
          const tag = parent.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.classList && parent.classList.contains('magic-star')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.nodeValue.includes('*')) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const nodesToReplace = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      nodesToReplace.push(currentNode);
    }

    nodesToReplace.forEach(node => {
      const parts = node.nodeValue.split('*');
      const fragment = document.createDocumentFragment();
      parts.forEach((part, i) => {
        fragment.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) {
          const starSpan = document.createElement('span');
          starSpan.className = 'magic-star';
          starSpan.textContent = '*';
          fragment.appendChild(starSpan);
        }
      });
      node.parentNode.replaceChild(fragment, node);
    });
  }

  function executePageScripts(newDoc) {
    const globalScripts = [
      '/assets/js/scrolling-nebula.js',
      '/assets/js/global.js'
    ];

    const newScripts = newDoc.querySelectorAll('script');
    newScripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && globalScripts.includes(src)) return; // skip global scripts

      if (src) {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) existing.remove();
      }

      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    });
  }

  function executePageStylesheets(newDoc) {
    const oldLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const newLinks = Array.from(newDoc.querySelectorAll('link[rel="stylesheet"]'));
    
    const oldHrefs = oldLinks.map(s => s.getAttribute('href'));
    const newHrefs = newLinks.map(s => s.getAttribute('href'));
    
    // Remove stylesheets that are not in the new document
    oldLinks.forEach(style => {
      if (!newHrefs.includes(style.getAttribute('href'))) {
        style.remove();
      }
    });
    
    // Add stylesheets that are new
    newLinks.forEach(style => {
      const href = style.getAttribute('href');
      if (href && !oldHrefs.includes(href)) {
        const newStyle = document.createElement('link');
        Array.from(style.attributes).forEach(attr => newStyle.setAttribute(attr.name, attr.value));
        document.head.appendChild(newStyle);
      }
    });

    // Handle inline styles with a custom attribute to identify them
    const oldInlineStyles = Array.from(document.querySelectorAll('style[data-spa-style="true"]'));
    oldInlineStyles.forEach(style => style.remove()); // clear out previous page's inline styles
    
    const newInlineStyles = Array.from(newDoc.querySelectorAll('head style'));
    newInlineStyles.forEach(style => {
      const newStyle = document.createElement('style');
      newStyle.textContent = style.textContent;
      newStyle.setAttribute('data-spa-style', 'true');
      document.head.appendChild(newStyle);
    });
  }

  async function handleRoute(url, isPopState = false, targetScroll = 0) {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    if (!main) {
      window.location.href = url;
      return;
    }

    main.classList.add('page-transitioning');
    if (isPopState && header) {
      header.classList.add('page-transitioning');
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const htmlText = await response.text();
      
      // Wait for the fade out to finish (500ms) before replacing content
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      const newMain = doc.querySelector('main');
      if (newMain) {
        document.title = doc.title;
        main.innerHTML = newMain.innerHTML;
        
        applyMagicStars(main);
        executePageStylesheets(doc);
        executePageScripts(doc);
        
        // Scroll to the target position
        window.scrollTo(0, targetScroll);
      } else {
        throw new Error('No main element found in fetched page');
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      window.location.href = url; // Fallback
    } finally {
      // Small delay to ensure DOM is updated before fading in
      setTimeout(() => {
        main.classList.remove('page-transitioning');
        if (header) header.classList.remove('page-transitioning');
      }, 50);
    }
  }

  function setupRouter() {
    document.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link || !link.href) return;
      
      const href = link.href;
      const isInternal = link.host === window.location.host;
      
      // Ignore specific links
      if (link.target === '_blank' || href.startsWith('javascript:')) return;
      if (href.includes('#') && href.split('#')[0] === window.location.href.split('#')[0]) return;
      
      // If it's a download link or something we don't want to route, we can skip
      if (link.hasAttribute('download')) return;

      if (!isInternal) {
        // External link: fade whole page
        e.preventDefault();
        document.body.classList.add('page-leaving');
        setTimeout(() => {
          window.location.href = href;
        }, 500);
      } else {
        // Internal link: SPA route
        e.preventDefault();
        if (window.location.href === href) return; // Same page
        
        // Save current scroll position before navigating away
        history.replaceState({ scrollY: window.scrollY }, '', window.location.href);
        
        window.history.pushState({ scrollY: 0 }, '', href);
        handleRoute(href, false, 0);
      }
    });

    window.addEventListener('popstate', (e) => {
      const targetScroll = e.state ? e.state.scrollY : 0;
      handleRoute(window.location.href, true, targetScroll);
    });
  }

  function initGlobal() {
    console.log("B - System Initializing...");

    // Year logic
    const yearElement = document.getElementById('year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();

    // Theme logic
    const themes = ['dark', 'light', 'ecstatic'];
    const nextTextMap = {
      'dark': '<i class="fa-solid fa-moon"></i>Dark',
      'light': '<i class="fa-solid fa-sun"></i>Light',
      'ecstatic': '<i class="fa-solid fa-rainbow"></i>Ecstatic!'
    };

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.hasAttribute('data-bound')) {
      themeToggle.setAttribute('data-bound', 'true');
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.className = savedTheme === 'dark' ? '' : savedTheme;
      themeToggle.innerHTML = nextTextMap[savedTheme];

      themeToggle.addEventListener('click', () => {
        const currentClass = document.documentElement.className || 'dark';
        const nextTheme = themes[(themes.indexOf(currentClass) + 1) % themes.length];
        document.documentElement.className = nextTheme === 'dark' ? '' : nextTheme;
        themeToggle.innerHTML = nextTextMap[nextTheme];
        localStorage.setItem('theme', nextTheme);
      });
    }

    // Mobile navigation
    const hamburger = document.getElementById('hamburger');
    const mainNav = document.getElementById('main-nav');
    if (hamburger && mainNav && !hamburger.hasAttribute('data-bound')) {
      hamburger.setAttribute('data-bound', 'true');
      hamburger.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        mainNav.classList.toggle('nav-open');
      });
    }
    
    // Initial setup
    applyMagicStars(document.body);
    
    // Disable native scroll restoration so we can handle it smoothly
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Only setup router once
    if (!window.routerInitialized) {
      window.routerInitialized = true;
      setupRouter();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGlobal);
  else initGlobal();
})();
