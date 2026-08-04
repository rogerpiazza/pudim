import { getSession, onAuthChange, signInWithGoogle, signOut } from './auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderFornadas } from './views/fornadas.js';
import { renderVendas } from './views/vendas.js';
import { renderAjustes } from './views/ajustes.js';
import { showError } from './toast.js';

const loginScreen = document.getElementById('login-screen');
const appEl = document.getElementById('app');
const loginError = document.getElementById('login-error');

const VIEWS = {
  dash: { el: () => document.getElementById('v-dash'), render: renderDashboard },
  forn: { el: () => document.getElementById('v-forn'), render: renderFornadas },
  vend: { el: () => document.getElementById('v-vend'), render: renderVendas },
  ajst: { el: () => document.getElementById('v-ajst'), render: renderAjustes },
};

const loaded = new Set();

function switchView(id) {
  Object.keys(VIEWS).forEach((key) => {
    VIEWS[key].el().classList.toggle('active', key === id);
  });
  document.querySelectorAll('.nav-btn, .bnav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === id);
  });
  window.scrollTo(0, 0);

  if (!loaded.has(id)) {
    loaded.add(id);
    VIEWS[id].render(VIEWS[id].el()).catch((err) => showError(err));
  }
}

function setupNav() {
  document.querySelectorAll('.nav-btn, .bnav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function showApp(session) {
  loginScreen.style.display = 'none';
  appEl.style.display = 'flex';

  const email = session.user.email || '';
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = email.charAt(0).toUpperCase();

  if (!appEl.dataset.navReady) {
    setupNav();
    appEl.dataset.navReady = '1';
  }

  loaded.clear();
  switchView('dash');
}

function showLogin() {
  appEl.style.display = 'none';
  loginScreen.style.display = 'flex';
  loaded.clear();
  appEl.removeAttribute('data-nav-ready');
}

document.getElementById('btn-google-login').addEventListener('click', async () => {
  loginError.textContent = '';
  try {
    await signInWithGoogle();
  } catch (err) {
    loginError.textContent = err.message || 'Não foi possível entrar com o Google.';
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut();
});

onAuthChange((session) => {
  if (session) showApp(session);
  else showLogin();
});

(async function bootstrap() {
  const session = await getSession();
  if (session) showApp(session);
  else showLogin();
})();
