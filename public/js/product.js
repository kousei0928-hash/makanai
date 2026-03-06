async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const box = document.getElementById('productDetail');
  const messageEl = document.getElementById('message');

  if (!id) {
    messageEl.className = 'error';
    messageEl.textContent = '商品IDが指定されていません。';
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`);
    const p = await res.json();

    if (!res.ok) {
      throw new Error(p.message || '商品取得に失敗しました。');
    }

    box.innerHTML = `
      <div class="row">
        <img src="${p.imageUrl}" alt="${p.name}" style="width:min(420px,100%);border-radius:12px;" />
        <div style="flex:1; min-width:260px;">
          <p class="muted">storeId:${p.storeId} ${p.storeName} / 販売日: ${formatDate(p.saleDate)}</p>
          <h2>${p.name}</h2>
          <p>${p.description}</p>
          <p class="price">${formatYen(p.price)}</p>
          <p class="muted">在庫: ${p.stock}</p>
          ${p.stock <= 0 ? '<p class="soldout-tag">売り切れ</p>' : ''}
          <label class="field" style="max-width:120px;">
            <span>数量</span>
            <input id="qty" type="number" min="1" max="${Math.max(1, p.stock)}" value="1" />
          </label>
          <button id="addToCart" ${p.stock <= 0 ? 'disabled style="background:#9ca3af;cursor:not-allowed"' : ''}>カートに入れる</button>
        </div>
      </div>
    `;

    const btn = document.getElementById('addToCart');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      messageEl.className = '';
      messageEl.textContent = '';

      const qty = Number(document.getElementById('qty').value);
      if (!Number.isInteger(qty) || qty <= 0) {
        messageEl.className = 'error';
        messageEl.textContent = '数量が不正です。';
        return;
      }

      const checkRes = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, quantity: qty })
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        messageEl.className = 'error';
        messageEl.textContent = checkData.message || 'カート制約に違反しています。';
        return;
      }

      const cart = getCart();
      const next = [...cart];
      const idx = next.findIndex((item) => Number(item.productId) === p.id);
      if (idx >= 0) {
        next[idx].quantity += qty;
      } else {
        next.push({ productId: p.id, quantity: qty });
      }
      saveCart(next);

      location.href = '/cart.html';
    });
  } catch (e) {
    messageEl.className = 'error';
    messageEl.textContent = e.message;
  }
}

init();
