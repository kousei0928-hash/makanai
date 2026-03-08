async function initCart() {
  const cartItems = document.getElementById('cartItems');
  const message = document.getElementById('message');
  const submit = document.getElementById('submitOrder');

  // カートをAPIから取得
  let items = [];
  try {
    const cartRes = await fetch('/api/cart');
    const cartData = await cartRes.json();
    items = cartData.items || [];
  } catch {
    message.className = 'error';
    message.textContent = 'カートの取得に失敗しました。';
    return;
  }

  if (!items.length) {
    cartItems.innerHTML = '<p>カートは空です。</p>';
    submit.disabled = true;
    return;
  }

  function renderCart(details) {
    let total = 0;
    let hasUnavailable = false;
    const itemsHtml = details
      .map((row) => {
        const sub = row.quantity * row.product.price;
        total += sub;
        const soldOut = row.product.stock <= 0;
        if (soldOut) hasUnavailable = true;
        return `
          <div class="history-item" style="position:relative;">
            <div style="position:relative;flex-shrink:0;">
              <img class="history-item-img" src="${row.product.imageUrl}" alt="${row.product.name}" />
              ${soldOut ? '<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;letter-spacing:0.1em;border-radius:8px;">SOLD OUT</div>' : ''}
            </div>
            <div class="history-item-info">
              <p class="history-item-name">${row.product.name}</p>
              <p class="muted">${row.product.storeName} / ${formatDate(row.product.saleDate)}</p>
              <p>数量: ${row.quantity} / 単価: ${formatYen(row.product.price)}</p>
              <p><strong>${formatYen(sub)}</strong></p>
            </div>
            <button class="cart-remove-btn" data-product-id="${row.product.id}" style="position:absolute;top:8px;right:8px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">&times;</button>
          </div>`;
      })
      .join('');

    cartItems.innerHTML = `
      ${hasUnavailable ? '<p class="error">売り切れの商品があります。削除してから購入してください。</p>' : ''}
      ${itemsHtml}
      <div class="history-total">合計: <strong>${formatYen(total)}</strong></div>
    `;

    submit.disabled = hasUnavailable;

    // 削除ボタンのイベント
    cartItems.querySelectorAll('.cart-remove-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const productId = Number(btn.dataset.productId);
        await fetch(`/api/cart?productId=${productId}`, { method: 'DELETE' });
        updateCartBadge();

        const remaining = details.filter((d) => Number(d.product.id) !== productId);
        if (!remaining.length) {
          cartItems.innerHTML = '<p>カートは空です。</p>';
          submit.disabled = true;
          return;
        }
        renderCart(remaining);
      });
    });
  }

  renderCart(items);

  submit.addEventListener('click', async () => {
    submit.disabled = true;
    message.className = '';
    message.textContent = '注文処理中...';

    const paymentMethod = document.getElementById('paymentMethod').value;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '注文に失敗しました。');
      }

      // 注文完了後、DBのカートをクリア
      await fetch('/api/cart', { method: 'DELETE' });
      updateCartBadge();

      const historyKey = 'foodlose_order_history';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.push(data.orderId);
      localStorage.setItem(historyKey, JSON.stringify(history));

      location.href = `/complete.html?orderId=${data.orderId}`;
    } catch (e) {
      submit.disabled = false;
      message.className = 'error';
      message.textContent = e.message;
    }
  });
}

initCart();
