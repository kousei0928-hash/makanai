const ORDER_HISTORY_KEY = 'foodlose_order_history';

function getOrderHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadHistory() {
  const container = document.getElementById('historyContent');

  const meRes = await fetch('/api/auth/me');
  const meData = await meRes.json();
  const isLoggedIn = !!meData.user;

  let url;
  if (isLoggedIn) {
    url = '/api/orders/history';
  } else {
    const orderIds = getOrderHistory();
    if (!orderIds.length) {
      container.innerHTML = '<p>購入履歴はありません。</p>';
      return;
    }
    url = `/api/orders/history?ids=${orderIds.join(',')}`;
  }

  try {
    const res = await fetch(url);
    const orders = await res.json();

    if (!orders.length) {
      container.innerHTML = '<p>購入履歴はありません。</p>';
      return;
    }

    container.innerHTML = orders
      .map((order) => {
        const date = new Date(order.createdAt).toLocaleString('ja-JP');
        const itemCards = order.items
          .map((item) => {
            const imgUrl = item.product?.imageUrl || '';
            const name = item.product?.name || `商品ID: ${item.productId}`;
            return `
              <div class="history-item">
                <img class="history-item-img" src="${imgUrl}" alt="${name}" />
                <div class="history-item-info">
                  <p class="history-item-name">${name}</p>
                  <p class="muted">${item.storeName}</p>
                  <p>数量: ${item.quantity} </p>
                  <p><strong>${formatYen(item.lineTotal)}</strong></p>
                </div>
              </div>`;
          })
          .join('');

        return `
          <div class="panel" style="margin-bottom: 16px;">
            <p><strong>注文 #${order.id}</strong> ― ${date}</p>
            <p class="muted">支払い: ${order.paymentMethod === 'card' ? 'カード' : '現金'}</p>
            ${itemCards}
            <div class="history-total">合計: <strong>${formatYen(order.total)}</strong></div>
          </div>`;
      })
      .join('');
  } catch {
    container.innerHTML = '<p class="error">履歴の取得に失敗しました。</p>';
  }
}

loadHistory();
