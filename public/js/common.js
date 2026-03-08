function formatDate(value) {
  return new Date(value).toLocaleDateString('ja-JP');
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
}

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;

  try {
    const res = await fetch('/api/cart');
    const data = await res.json();
    const items = data.items || [];
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (total > 0) {
      badge.textContent = total;
      badge.classList.add('show');
    } else {
      badge.textContent = '';
      badge.classList.remove('show');
    }
  } catch {
    badge.textContent = '';
    badge.classList.remove('show');
  }
}

async function updateAuthUI() {
  const nav = document.querySelector('.header .nav') || document.querySelector('.hero-header .nav');
  if (!nav) return;

  let user = null;
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    user = data.user;
  } catch {
    // API unreachable
  }

  updateCartBadge();

  const existing = nav.querySelector('.auth-link');
  if (existing) existing.remove();

  const link = document.createElement('a');
  link.className = 'auth-link';

  if (user) {
    link.href = '/mypage.html';
    link.textContent = user.name;
  } else {
    link.href = '/login.html';
    link.textContent = 'ログイン';
  }

  nav.appendChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
});
