'use client';

import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [usersRes, tagsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/tags'),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (tagsRes.ok) setTags(await tagsRes.json());
  }

  useEffect(() => { loadData(); }, []);

  async function createTag() {
    if (!newTagName.trim()) return;
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (res.ok) {
      setNewTagName('');
      loadData();
    }
  }

  async function deleteTag(id) {
    if (!confirm('このタグを削除しますか？')) return;
    await fetch('/api/admin/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadData();
  }

  async function toggleUserTag(userId, tagId, hasTag) {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        tagId,
        action: hasTag ? 'remove' : 'add',
      }),
    });
    loadData();
  }

  return (
    <main>
      <h1>ユーザー・タグ管理</h1>
      <button
        onClick={() => window.location.href = '/admin'}
        style={{ marginBottom: 16, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
      >
        管理画面に戻る
      </button>

      {/* タグ管理 */}
      <section style={{ marginBottom: 24 }}>
        <h2>タグ一覧</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <div key={tag.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f3f4f6',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 13
            }}>
              <span>{tag.name}（{tag.userCount}人）</span>
              <button
                onClick={() => deleteTag(tag.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: 0
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="新しいタグ名"
            onKeyDown={(e) => e.key === 'Enter' && createTag()}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
          />
          <button
            onClick={createTag}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            追加
          </button>
        </div>
      </section>

      {/* ユーザー一覧 */}
      <section>
        <h2>LINE連携ユーザー（{users.length}人）</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((user) => (
            <div key={user.id} style={{
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              padding: 14
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{user.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map((tag) => {
                  const hasTag = user.tags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleUserTag(user.id, tag.id, hasTag)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 16,
                        border: hasTag ? '2px solid #06C755' : '1px solid #d1d5db',
                        background: hasTag ? '#dcfce7' : '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: hasTag ? 700 : 400
                      }}
                    >
                      {hasTag ? '✓ ' : ''}{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
}
