async function initCart() {
  const cartItems = document.getElementById('cartItems');
  const message = document.getElementById('message');
  const submit = document.getElementById('submitOrder');

  const cart = getCart();
  if (!cart.length) {
    cartItems.innerHTML = '<p>カートは空です。</p>';
    submit.disabled = true;
    return;
  }

  const details = await Promise.all(
    cart.map(async (item) => {
      const res = await fetch(`/api/products/${item.productId}`);
      const product = await res.json();
      if (!res.ok) {
        throw new Error(product.message || '商品情報の取得に失敗しました。');
      }
      return { ...item, product };
    })
  ).catch((e) => {
    message.className = 'error';
    message.textContent = e.message;
    return null;
  });

  if (!details) return;

  function renderCart(details) {
    let total = 0;
    const itemsHtml = details
      .map((row) => {
        const sub = row.quantity * row.product.price;
        total += sub;
        return `
          <div class="history-item" style="position:relative;">
            <img class="history-item-img" src="${row.product.imageUrl}" alt="${row.product.name}" />
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
      ${itemsHtml}
      <div class="history-total">合計: <strong>${formatYen(total)}</strong></div>
    `;

    // 削除ボタンのイベント
    cartItems.querySelectorAll('.cart-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const productId = Number(btn.dataset.productId);
        const currentCart = getCart().filter((item) => Number(item.productId) !== productId);
        saveCart(currentCart);
        updateCartBadge();

        if (!currentCart.length) {
          cartItems.innerHTML = '<p>カートは空です。</p>';
          submit.disabled = true;
          return;
        }

        const remaining = details.filter((d) => Number(d.product.id) !== productId);
        renderCart(remaining);
      });
    });
  }

  renderCart(details);

  submit.addEventListener('click', async () => {
    submit.disabled = true;
    message.className = '';
    message.textContent = '注文処理中...';

    const paymentMethod = document.getElementById('paymentMethod').value;

    // ログイン中のユーザー情報を取得
    let buyerName = null;
    let buyerEmail = null;
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.user) {
        buyerName = meData.user.name || null;
        buyerEmail = meData.user.email || null;
      }
    } catch {}


    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          paymentMethod,
          buyerName,
          buyerEmail
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '注文に失敗しました。');
      }

      saveCart([]);
      clearCartCookie();
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
