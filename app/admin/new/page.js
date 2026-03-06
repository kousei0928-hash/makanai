'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AdminNewPage() {
  const [files, setFiles] = useState([]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  function handleFilesChange(e) {
    const selected = Array.from(e.target.files);
    setFiles(selected.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      name: `商品${i + 1}`
    })));
  }

  function updateName(index, name) {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, name } : f));
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadAll(e) {
    e.preventDefault();

    if (!files.length) {
      setMessage('画像を選択してください。');
      return;
    }
    if (!price) {
      setMessage('価格を入力してください。');
      return;
    }

    setUploading(true);
    setMessage(`0 / ${files.length} 登録中...`);

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setMessage(`${i + 1} / ${files.length} 登録中...`);

      // 1. 画像アップロード
      const uploadData = new FormData();
      uploadData.append('file', item.file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok) {
        setMessage(`${item.name} の画像アップロードに失敗しました。`);
        setUploading(false);
        return;
      }

      // 2. 商品登録
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: '1',
          name: item.name,
          price,
          stock,
          saleDate: new Date().toISOString().split('T')[0],
          imageUrl: uploadJson.url
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(`${item.name} の登録に失敗: ${data.message}`);
        setUploading(false);
        return;
      }

      successCount++;
    }

    setMessage(`${successCount} 件の商品を登録しました。`);
    setFiles([]);
    setPrice('');
    setStock('1');
    setUploading(false);
  }

  return (
    <main>
      <h1>商品一括登録</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link href="/admin">商品一覧</Link>
        <Link href="/admin/orders">注文一覧</Link>
      </div>

      <section className="panel">
        <form onSubmit={uploadAll} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label className="field">
            <span>画像を選択（複数可）*</span>
            <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
          </label>

          {files.length > 0 && (
            <>
              <label className="field">
                <span>共通価格*</span>
                <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </label>
              <label className="field">
                <span>共通在庫数*</span>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
              </label>

              <p style={{ margin: 0, fontWeight: 700 }}>選択された画像（{files.length}件）- 商品名を個別に編集できます</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {files.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 10
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 18, minWidth: 30, textAlign: 'center', color: '#0f766e' }}>
                      {i + 1}
                    </span>
                    <img src={item.preview} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <input
                      value={item.name}
                      onChange={(e) => updateName(i, e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div>
            <button type="submit" disabled={uploading || !files.length}>
              {uploading ? '登録中...' : `${files.length}件を一括登録`}
            </button>
          </div>
        </form>
      </section>

      <p style={{ marginTop: 16 }}>{message}</p>
    </main>
  );
}
