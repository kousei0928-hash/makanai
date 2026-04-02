async function initMypage() {
  const container = document.getElementById('mypageContent');

  const res = await fetch('/api/auth/me');
  const data = await res.json();

  if (!data.user) {
    location.href = '/login.html';
    return;
  }

  const isAdmin = !!data.user.storeId;

  const lineLinked = !!data.user.lineUserId;

  container.innerHTML = `
    <h2>${data.user.name} さん</h2>
    <p class="muted">${data.user.email}</p>
    <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
      <a href="/history.html" class="btn" style="text-align:center;">購入履歴</a>
      ${isAdmin ? '<a href="/admin" class="btn" style="background:#0f766e;color:#fff;text-align:center;">管理者画面</a>' : ''}
      ${!lineLinked
        ? '<a href="/api/auth/line?mode=link" class="btn" style="background:#06C755;color:#fff;text-align:center;">LINEと連携する</a>'
        : '<p style="color:#065f46; font-size:13px; margin:0;">LINE連携済み</p>'
      }
      <button id="logoutBtn" class="secondary">ログアウト</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/index.html';
  });

  // LINE通知設定を読み込み
  loadLineNotifySettings();
}

async function loadLineNotifySettings() {
  const panel = document.getElementById('lineNotifyPanel');
  const status = document.getElementById('lineNotifyStatus');
  const toggle = document.getElementById('lineNotifyToggle');
  const storeBoxes = document.getElementById('storeCheckboxes');
  const saveBtn = document.getElementById('saveLineNotify');
  const msg = document.getElementById('lineNotifyMsg');

  try {
    const res = await fetch('/api/line/notify-settings');
    if (!res.ok) return;
    const data = await res.json();

    panel.style.display = 'block';

    if (!data.lineLinked) {
      status.innerHTML = '<p style="color: var(--danger); font-size: 13px;">LINE未連携です。LINE公式アカウントを友だち追加後、マイページから連携してください。</p>';
    } else {
      status.innerHTML = '<p style="color: #065f46; font-size: 13px;">LINE連携済み</p>';
    }

    toggle.checked = data.lineNotify;

    storeBoxes.innerHTML = data.stores
      .map(
        (s) => `
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;">
          <input type="checkbox" class="store-cb" value="${s.id}" ${s.enabled ? 'checked' : ''} />
          <span>${s.name}</span>
        </label>
      `
      )
      .join('');

    saveBtn.addEventListener('click', async () => {
      const storeIds = [...document.querySelectorAll('.store-cb:checked')].map((cb) =>
        Number(cb.value)
      );

      const saveRes = await fetch('/api/line/notify-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineNotify: toggle.checked, storeIds }),
      });

      if (saveRes.ok) {
        msg.textContent = '保存しました';
        msg.style.color = '#065f46';
      } else {
        msg.textContent = '保存に失敗しました';
        msg.style.color = 'var(--danger)';
      }

      setTimeout(() => { msg.textContent = ''; }, 3000);
    });
  } catch {
    // API未実装等の場合は非表示のまま
  }
}

initMypage();
