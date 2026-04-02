const LINE_API = 'https://api.line.me/v2/bot';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };
}

/**
 * 複数ユーザーにプッシュメッセージを送信（multicast）
 * lineUserIds: string[] (最大500件)
 * messages: LINE message objects[]
 */
export async function multicast(lineUserIds, messages) {
  if (!lineUserIds.length) return { ok: true, sent: 0 };

  const res = await fetch(`${LINE_API}/message/multicast`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      to: lineUserIds,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('LINE multicast error:', err);
    return { ok: false, error: err };
  }

  return { ok: true, sent: lineUserIds.length };
}

/**
 * 1ユーザーにプッシュメッセージを送信
 */
export async function pushMessage(lineUserId, messages) {
  const res = await fetch(`${LINE_API}/message/push`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      to: lineUserId,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('LINE push error:', err);
    return { ok: false, error: err };
  }

  return { ok: true };
}

/**
 * Webhook署名を検証
 */
export function verifySignature(body, signature) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('SHA256', process.env.LINE_CHANNEL_SECRET);
  hmac.update(body);
  const expected = hmac.digest('base64');
  return expected === signature;
}
