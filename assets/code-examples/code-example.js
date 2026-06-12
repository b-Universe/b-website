// Theme Cycling Logic Snippet
const themeToggle = document.getElementById('theme-toggle');
const themes = [ 'dark', 'light', 'ecstatic'];
let currentTheme = localStorage.getItem('theme') || 'dark';

function cycleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    currentTheme = themes[nextIndex];

    // Apply the class to the body/html
    document.documentElement.className = currentTheme === 'dark' ? '' : currentTheme;
    localStorage.setItem('theme', currentTheme);
}

themeToggle.addEventListener('click', cycleTheme);