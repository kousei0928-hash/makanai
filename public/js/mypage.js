async function initMypage() {
  const container = document.getElementById('mypageContent');

  const res = await fetch('/api/auth/me');
  const data = await res.json();

  if (!data.user) {
    location.href = '/login.html';
    return;
  }

  container.innerHTML = `
    <h2>${data.user.name} さん</h2>
    <p class="muted">${data.user.email}</p>
    <div style="margin-top: 20px; display: flex; gap: 12px;">
      <a href="/history.html" class="btn">購入履歴</a>
      <button id="logoutBtn" class="secondary">ログアウト</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/index.html';
  });
}

initMypage();
