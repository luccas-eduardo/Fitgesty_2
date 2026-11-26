/*
  =============================================================================
  FitGesty — Gerenciador Global de Tema e Acessibilidade
  Sincroniza data-theme + body.light-theme + alto contraste + fonte maior
  =============================================================================
*/
(function () {
  const THEME_KEY = 'fitgesty_theme';
  const CONTRAST_KEY = 'fitgesty_contrast';
  const FONT_KEY = 'fitgesty_large_font';
  const root = document.documentElement;

  function syncThemeUI(theme) {
    const isLight = theme !== 'dark';
    root.setAttribute('data-theme', isLight ? 'light' : 'dark');
    if (document.body) {
      document.body.classList.toggle('light-theme', isLight);
    }
    const label = isLight ? ' Modo Escuro' : ' Modo Claro';
    document.querySelectorAll('#themeToggleBtn, #btnThemeToggle, [data-theme-toggle]').forEach((btn) => {
      btn.textContent = label;
      btn.setAttribute('aria-pressed', isLight ? 'false' : 'true');
    });
  }

  function syncA11yUI() {
    if (!document.body) return;
    const highContrast = localStorage.getItem(CONTRAST_KEY) === 'true';
    const largeFont = localStorage.getItem(FONT_KEY) === 'true';

    document.body.classList.toggle('high-contrast', highContrast);
    document.body.classList.toggle('large-font', largeFont);

    const cBtn = document.getElementById('contrastButton');
    if (cBtn) {
      cBtn.textContent = highContrast ? '◐ Contraste Normal' : '◐ Alto Contraste';
      cBtn.setAttribute('aria-pressed', highContrast ? 'true' : 'false');
    }

    const fBtn = document.getElementById('fontButton');
    if (fBtn) {
      fBtn.textContent = largeFont ? 'A- Fonte Normal' : 'A+ Fonte Maior';
      fBtn.setAttribute('aria-pressed', largeFont ? 'true' : 'false');
    }
  }

  function applyTheme(theme) {
    const valid = theme === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, valid); } catch (_) {}
    syncThemeUI(valid);
  }

  const savedTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', savedTheme);

  window.toggleFitTheme = function () {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  document.addEventListener('DOMContentLoaded', () => {
    syncThemeUI(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
    syncA11yUI();

    document.querySelectorAll('#themeToggleBtn, #btnThemeToggle, [data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleFitTheme();
      });
    });

    document.getElementById('contrastButton')?.addEventListener('click', () => {
      const next = !(localStorage.getItem(CONTRAST_KEY) === 'true');
      localStorage.setItem(CONTRAST_KEY, String(next));
      syncA11yUI();
    });

    document.getElementById('fontButton')?.addEventListener('click', () => {
      const next = !(localStorage.getItem(FONT_KEY) === 'true');
      localStorage.setItem(FONT_KEY, String(next));
      syncA11yUI();
    });
  });
})();