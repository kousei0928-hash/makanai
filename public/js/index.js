const STORE_LABELS = {
  '1': '北一食堂',
  '2': '大学食堂',
  '3': '南食堂'
};

async function loadProducts(storeId = '') {
  const grid = document.getElementById('productGrid');
  const info = document.getElementById('storeFilterInfo');
  grid.textContent = '読み込み中...';
  if (info) {
    info.textContent = storeId ? `表示中: ${STORE_LABELS[storeId] || `storeId ${storeId}`}` : '表示中: すべての食堂';
  }

  try {
    const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
    const res = await fetch(`/api/products${query}`);
    const products = await res.json();

    if (!res.ok) {
      throw new Error(products.message || '商品取得に失敗しました。');
    }

    if (!products.length) {
      grid.innerHTML = '<p>商品がありません。</p>';
      return;
    }

    grid.innerHTML = products
      .map((p) => {
        const isSoldOut = p.stock <= 0;
        return `
          <article class="card card-horizontal">
            <img class="card-horizontal-img" src="${p.imageUrl}" alt="${p.name}" />
            <div class="card-body">
              <h3 style="margin:0">${p.name}</h3>
              <p class="muted" style="margin:0">${p.storeName} / 販売日: ${formatDate(p.saleDate)}</p>
              <p class="muted" style="margin:0">在庫: ${p.stock}</p>
              <p class="price" style="margin:6px 0">${formatYen(p.price)}</p>
              ${isSoldOut ? '<p class="soldout-tag">売り切れ</p>' : `<a class="btn" href="/product.html?id=${p.id}">購入する</a>`}
            </div>
          </article>
        `;
      })
      .join('');
  } catch (e) {
    if (info) {
      info.textContent = '';
    }
    grid.innerHTML = `<p class="error">${e.message}</p>`;
  }
}

function initStoreFilter() {
  const select = document.getElementById('storeSelect');
  if (!select) return;

  select.addEventListener('change', () => {
    loadProducts(select.value);
  });
}

async function loadStoreStock() {
  const bar = document.getElementById('storeStock');
  if (!bar) return;

  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    if (!res.ok) return;

    const stockByStore = {};
    for (const p of products) {
      if (!stockByStore[p.storeName]) stockByStore[p.storeName] = 0;
      stockByStore[p.storeName] += p.stock;
    }

    bar.innerHTML = Object.entries(stockByStore)
      .map(([name, count]) => {
        const cls = count <= 3 ? 'stock-count low' : 'stock-count';
        return `<div class="store-stock-chip">${name} <span class="${cls}">残り ${count} 個</span></div>`;
      })
      .join('');
  } catch {}
}

initStoreFilter();
loadProducts();
loadStoreStock();
