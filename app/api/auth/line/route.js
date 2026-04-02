import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// LINEログイン認可画面へリダイレクト
export async function GET(req) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ message: 'LINE Login未設定' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'login'; // 'login' or 'link'

  // CSRF対策のstate生成
  const state = crypto.randomBytes(16).toString('hex');

  // callbackのベースURL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/line/callback`;

  // stateとmodeをcookieに保存（callback時に検証）
  const cookieStore = cookies();
  cookieStore.set('line_login_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600, // 10分
  });
  cookieStore.set('line_login_mode', mode, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
  });

  return NextResponse.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`);
}
