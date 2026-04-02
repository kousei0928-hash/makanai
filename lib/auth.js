import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/prisma';

export const SESSION_COOKIE = 'foodlose_session';

// LINE_CHANNEL_SECRETを署名キーとして利用
function getSecret() {
  return process.env.LINE_CHANNEL_SECRET || 'fallback-secret-key';
}

function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(String(value));
  return `${value}.${hmac.digest('hex')}`;
}

function verify(signed) {
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  if (signed !== expected) return null;
  return value;
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  // 署名付きCookieの検証（署名なしの古いCookieにも対応）
  let userId = verify(raw);
  if (!userId) {
    // 古い形式（数字のみ）の場合
    if (/^\d+$/.test(raw)) {
      userId = raw;
    } else {
      return null;
    }
  }

  const user = await db.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true, email: true, name: true, storeId: true, storeName: true, lineUserId: true, lineNotify: true,
      userTags: { include: { tag: true } }
    }
  });
  if (!user) return null;
  const { userTags, ...rest } = user;
  return {
    ...rest,
    tags: userTags.map((ut) => ({ id: ut.tag.id, name: ut.tag.name })),
  };
}

const isProduction = process.env.NODE_ENV === 'production';

export function makeSessionCookie(userId) {
  const signed = sign(userId);
  return `${SESSION_COOKIE}=${signed}; Path=/; HttpOnly;${isProduction ? ' Secure;' : ''} SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function makeClearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly;${isProduction ? ' Secure;' : ''} SameSite=Lax; Max-Age=0`;
}
