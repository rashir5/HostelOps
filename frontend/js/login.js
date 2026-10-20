const API_BASE = (window.location.port && window.location.port !== '5000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:5000/api'
  : '/api';

// ── Auth guard ──────────────────────────────────────────────────────────────
if (localStorage.getItem('hostel_token')) {
  window.location.href = 'dashboard.html';
}

// ── DOM References ──────────────────────────────────────────────────────────
const form        = document.getElementById('loginForm');
const emailInput  = document.getElementById('email');
const pwInput     = document.getElementById('password');
const emailError  = document.getElementById('emailError');
const pwError     = document.getElementById('passwordError');
const loginError  = document.getElementById('loginError');
const loginBtn    = document.getElementById('loginBtn');
const btnText     = loginBtn.querySelector('.btn-text');
const btnSpinner  = document.getElementById('loginSpinner');
const togglePw    = document.getElementById('togglePw');

// ── Password visibility toggle ──────────────────────────────────────────────
togglePw.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
});

// ── Theme toggle ────────────────────────────────────────────────────────────
const THEME_KEY = 'spit_theme';
const themeToggleBtn = document.getElementById('loginThemeToggle') || document.getElementById('themeToggleBtn');

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
};

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(isLight ? 'dark' : 'light');
  });
}

// ── Demo credential quick-fill ──────────────────────────────────────────────
document.querySelectorAll('.demo-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    emailInput.value = pill.dataset.email;
    pwInput.value    = pill.dataset.pw;
    clearErrors();
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const setLoading = (loading) => {
  loginBtn.disabled = loading;
  btnText.textContent = loading ? 'Signing in…' : 'Sign in';
  btnSpinner.classList.toggle('hidden', !loading);
};

const clearErrors = () => {
  emailError.textContent = '';
  pwError.textContent    = '';
  loginError.classList.add('hidden');
};

// ── Client-side validation ──────────────────────────────────────────────────
const validate = () => {
  let valid = true;
  clearErrors();

  if (!emailInput.value.trim()) {
    emailError.textContent = 'Email is required';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
    emailError.textContent = 'Enter a valid email address';
    valid = false;
  }

  if (!pwInput.value) {
    pwError.textContent = 'Password is required';
    valid = false;
  } else if (pwInput.value.length < 6) {
    pwError.textContent = 'Password must be at least 6 characters';
    valid = false;
  }

  return valid;
};

// ── Form submit ─────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim(), password: pwInput.value }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.message || 'Login failed. Please try again.';
      loginError.classList.remove('hidden');
      return;
    }

    // Persist auth data
    localStorage.setItem('hostel_token', data.token);
    localStorage.setItem('hostel_user',  JSON.stringify(data.user));

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } catch (_err) {
    loginError.textContent = 'Cannot connect to server. Make sure the backend is running on port 5000.';
    loginError.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
});
