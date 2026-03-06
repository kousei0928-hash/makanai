const CART_KEY = 'foodlose_cart_v1';

function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function clearCartCookie() {
  document.cookie = `${CART_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('ja-JP');
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  if (total > 0) {
    badge.textContent = total;
    badge.classList.add('show');
  } else {
    badge.textContent = '';
    badge.classList.remove('show');
  }
}

async function updateAuthUI() {
  const nav = document.querySelector('.header .nav');
  if (!nav) return;

  let user = null;
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    user = data.user;
  } catch {
    // API unreachable
  }

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
  updateCartBadge();
  updateAuthUI();
});
