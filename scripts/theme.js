export function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  window.getCurrentTheme = getCurrentTheme;
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  if (typeof window.updateGlobeTheme === 'function') window.updateGlobeTheme();
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function bindThemeToggle(buttonId = 'theme-toggle') {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}
