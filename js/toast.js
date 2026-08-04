let timer;

export function showToast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), 2600);
}

export function showError(err, fallback = 'Algo deu errado') {
  console.error(err);
  const msg = err && err.message ? err.message : fallback;
  showToast(msg, 'error');
}
