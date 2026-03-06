'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    })();
  }, []);

  return (
    <main>
      <h1>注文一覧</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link href="/admin">商品一覧</Link>
        <Link href="/admin/new">商品登録</Link>
      </div>

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>注文ID</th>
              <th>日時</th>
              <th>storeId</th>
              <th>商品</th>
              <th>数量</th>
              <th>合計</th>
              <th>支払方法</th>
              <th>購入者</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{new Date(o.createdAt).toLocaleString('ja-JP')}</td>
                <td>{o.storeId}</td>
                <td>{o.items.map((i) => i.product?.name || `商品ID ${i.productId}`).join(', ')}</td>
                <td>{o.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                <td>{formatYen(o.total)}</td>
                <td>{o.paymentMethod}</td>
                <td>{o.buyerName || '-'}</td>
                <td>{o.buyerEmail || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
