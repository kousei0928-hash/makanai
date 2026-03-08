'use client';

import { useEffect, useState } from 'react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>読み込み中...</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1>注文一覧</h1>
      {!orders.length && <p>注文がありません。</p>}
      {orders.map((o) => (
        <div key={o.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
          <p><strong>注文ID:</strong> {o.id}</p>
          <p>ユーザー: {o.userName || o.userId}</p>
          <p>合計: ¥{o.total}</p>
        </div>
      ))}
    </main>
  );
}
