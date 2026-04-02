'use client';

import { useState, useRef } from 'react';

export default function AdminNewPage() {
  const [mode, setMode] = useState(null); // null | 'bulk' | 'single'

  return (
    <main>
      <h1>商品登録</h1>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => window.location.href = '/admin'}
          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, padding: 0 }}
        >
          &larr; 商品一覧に戻る
        </button>
      </div>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
          <button
            onClick={() => setMode('single')}
            style={{
              background: '#2563eb', color: '#fff', border: 'none', padding: '16px 24px',
              borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 16
            }}
          >
            個別登録（カメラで撮影）
          </button>
          <button
            onClick={() => setMode('bulk')}
            style={{
              background: '#0f766e', color: '#fff', border: 'none', padding: '16px 24px',
              borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 16
            }}
          >
            一括登録（複数画像をまとめて）
          </button>
        </div>
      )}

      {mode === 'single' && <SingleMode onBack={() => setMode(null)} />}
      {mode === 'bulk' && <BulkMode onBack={() => setMode(null)} />}
    </main>
  );
}

// ─── 個別登録モード ───
function SingleMode({ onBack }) {
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [registered, setRegistered] = useState([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  function handleCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function retake() {
    setSelectedFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function registerOne() {
    if (!selectedFile) {
      setMessage('写真を撮影してください。');
      return;
    }
    if (!price) {
      setMessage('価格を入力してください。');
      return;
    }

    setUploading(true);
    setMessage('登録中...');

    try {
      // 1. 画像アップロード
      const uploadData = new FormData();
      uploadData.append('file', selectedFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok) {
        setMessage('画像アップロードに失敗しました。');
        setUploading(false);
        return;
      }

      const nextNumber = registered.length + 1;

      // 2. 商品登録
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `商品${nextNumber}`,
          price,
          stock,
          saleDate: new Date().toISOString().split('T')[0],
          imageUrl: uploadJson.url
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(`登録失敗: ${data.message}`);
        setUploading(false);
        return;
      }

      const data = await res.json();
      setRegistered((prev) => [...prev, { id: data.product?.id || nextNumber, name: `商品${nextNumber}`, preview }]);
      setMessage(`商品${nextNumber} を登録しました。`);
      setSelectedFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setMessage('エラーが発生しました。');
    }

    setUploading(false);
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 }}
      >
        &larr; モード選択に戻る
      </button>

      <section className="panel" style={{ maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 12px' }}>個別登録</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            <span>価格*</span>
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </label>
          <label className="field">
            <span>在庫数*</span>
            <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
          </label>

          {!preview ? (
            <div>
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
                次の登録: 商品{registered.length + 1}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', padding: '14px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer'
                }}
              >
                カメラで撮影 / 画像を選択
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
                商品{registered.length + 1} のプレビュー
              </p>
              <img src={preview} alt="プレビュー" style={{ width: '100%', maxWidth: 300, borderRadius: 8, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={retake}
                  style={{
                    padding: '10px 20px', background: '#6b7280', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  撮り直す
                </button>
                <button
                  type="button"
                  onClick={registerOne}
                  disabled={uploading}
                  style={{
                    padding: '10px 20px', background: '#16a34a', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {uploading ? '登録中...' : '登録する'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      {registered.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3>登録済み（{registered.length}件）</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registered.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 8
              }}>
                <span style={{ fontWeight: 700, fontSize: 18, minWidth: 30, textAlign: 'center', color: '#16a34a' }}>
                  {i + 1}
                </span>
                <img src={item.preview} alt="" style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 6 }} />
                <span style={{ fontWeight: 600 }}>{item.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── 一括登録モード ───
function BulkMode({ onBack }) {
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

      const uploadData = new FormData();
      uploadData.append('file', item.file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok) {
        setMessage(`${item.name} の画像アップロードに失敗しました。`);
        setUploading(false);
        return;
      }

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    <div>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 }}
      >
        &larr; モード選択に戻る
      </button>

      <section className="panel">
        <h2 style={{ margin: '0 0 12px' }}>一括登録</h2>
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

              <p style={{ margin: 0, fontWeight: 700 }}>選択された画像（{files.length}件）</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {files.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10
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
    </div>
  );
}
