'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function formatDateTime(value) {
  return new Date(value).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
}

const PAYMENT_LABELS = { card: 'カード', cash: '現金' };

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');

  async function loadProducts() {
    const res = await fetch('/api/admin/products');
    const data = await res.json();
    if (res.ok) {
      setProducts(data.products || []);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function updateStock(id, stock) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: Number(stock) })
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || '在庫更新に失敗しました。');
      return;
    }

    setMessage(`商品ID ${id} の在庫を更新しました。`);
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm(`商品ID ${id} を削除しますか？`)) return;

    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || '削除に失敗しました。');
      return;
    }

    setMessage(`商品ID ${id} を削除しました。`);
    loadProducts();
  }

  return (
    <main>
      <h1>管理画面</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link href="/admin/new">商品登録</Link>
      </div>

      <section>
        <h2>商品一覧</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {products.map((p) => {
            const buyers = (p.orderItems || []).map((oi) => oi.order).filter(Boolean);

            return (
              <div key={p.id} style={{
                display: 'flex',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* ステータスバッジ */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: p.stock > 0 ? '#16a34a' : '#dc2626',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  zIndex: 1
                }}>
                  {p.stock > 0 ? '公開中' : '売り切れ'}
                </div>

                {/* 左: 写真 */}
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 8 }}
                  />
                  <p style={{ margin: '8px 0 2px', fontWeight: 700, fontSize: 16 }}>{formatYen(p.price)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>注文時間：{formatDateTime(p.createdAt)}</p>
                </div>

                {/* 右: 情報 */}
                <div style={{ width: '50%', padding: 14, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>商品番号:{p.id}</p>
                  <p style={{ margin: 0, fontSize: 14 }}>弁当の中身：<strong>{p.name}</strong></p>

                  {/* 購入者情報 */}
                  {buyers.length > 0 ? (
                    buyers.map((order, idx) => (
                      <div key={idx} style={{ marginTop: 4, padding: '6px 0', borderTop: idx > 0 ? '1px solid #e5e7eb' : 'none' }}>
                        <p style={{ margin: 0, fontSize: 14 }}>
                          購入者：<strong>{order.buyerName || '未登録'}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: 14 }}>
                          決済方法：<strong>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</strong>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9ca3af' }}>未購入</p>
                  )}

                  {/* 在庫編集 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <label style={{ fontSize: 14 }}>在庫:</label>
                    <input
                      type="number"
                      min="0"
                      defaultValue={p.stock}
                      id={`stock-${p.id}`}
                      style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`stock-${p.id}`);
                        updateStock(p.id, el?.value ?? p.stock);
                      }}
                      style={{ fontSize: 13, padding: '5px 12px', borderRadius: 6 }}
                    >
                      保存
                    </button>
                  </div>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => deleteProduct(p.id)}
                    style={{
                      marginTop: 8,
                      background: '#f97316',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-start'
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p style={{ marginTop: 16 }}>{message}</p>
    </main>
  );
}
