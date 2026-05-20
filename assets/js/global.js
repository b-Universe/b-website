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
    
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGlobal);
  else initGlobal();
})();
