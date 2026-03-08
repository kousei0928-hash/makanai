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
            <div class="card-img-wrapper">
              <img class="card-horizontal-img" src="${p.imageUrl}" alt="${p.name}" />
              ${isSoldOut ? '<div class="soldout-overlay">SOLD OUT</div>' : ''}
            </div>
            <div class="card-body">
              <p class="muted" style="margin:0">${p.storeName}</p>
              <h3 style="margin:0">${p.name}</h3>
              <p class="muted" style="margin:0">在庫: ${p.stock}</p>
              <p class="price" style="margin:6px 0">${formatYen(p.price)}</p>
              ${isSoldOut ? '<p class="soldout-tag card-sm">売り切れ</p>' : `<a class="btn card-sm" href="/product.html?id=${p.id}">購入する</a>`}
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
  const heroStock = document.getElementById('heroStock');

  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    if (!res.ok) return;

    const stockByStore = {};
    let totalStock = 0;
    for (const p of products) {
      if (!stockByStore[p.storeId]) stockByStore[p.storeId] = { name: p.storeName, count: 0 };
      stockByStore[p.storeId].count += p.stock;
      totalStock += p.stock;
    }

    // ヒーローヘッダー内の残り数
    if (heroStock) {
      heroStock.innerHTML = `まかない弁当残り <span class="stock-highlight">${totalStock}</span> 個です！`;
      heroStock.classList.add('show');
    }

    // 食堂別チップ
    if (bar) {
      bar.innerHTML = Object.entries(stockByStore)
        .map(([storeId, { name, count }]) => {
          const cls = count <= 3 ? 'stock-count low' : 'stock-count';
          return `<div class="store-stock-chip" data-store-id="${storeId}" style="cursor:pointer">${name} <span class="${cls}">残り ${count} 個</span></div>`;
        })
        .join('');

      bar.querySelectorAll('.store-stock-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const storeId = chip.dataset.storeId;
          const select = document.getElementById('storeSelect');
          if (select) select.value = storeId;
          loadProducts(storeId);
        });
      });
    }
  } catch {}
}

initStoreFilter();
loadProducts();
loadStoreStock();
