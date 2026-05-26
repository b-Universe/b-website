(function() {
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
    if (themeToggle) {
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
    if (hamburger && mainNav) {
      hamburger.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        mainNav.classList.toggle('nav-open');
      });
    }
    
    // Auto-wrap literal asterisks for the Ecstatic theme rainbow effect
    const walker = document.createTreeWalker(
      document.body,
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGlobal);
  else initGlobal();
})();
