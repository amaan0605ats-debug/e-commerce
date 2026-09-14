export function initTheme(button) {
  const apply = theme => {
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-checked', String(theme === 'dark'));
    button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171d19' : '#f6f3eb');
  };
  apply(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  button.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(theme);
    try { localStorage.setItem('algani-theme', theme); } catch { /* Still works with storage blocked. */ }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'algani-theme' || event.key === null) apply(event.newValue === 'dark' ? 'dark' : 'light');
  });
}
