// Runs before paint so a saved dark preference never flashes a light page.
(() => {
  let saved;
  try { saved = localStorage.getItem('algani-theme'); } catch {}
  const theme = saved === 'dark' || saved === 'light' ? saved : 'light';
  document.documentElement.dataset.theme = theme;
})();
