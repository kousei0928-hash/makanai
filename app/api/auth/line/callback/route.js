import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/prisma';
import { makeSessionCookie, getSessionUser } from '@/lib/auth';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // ユーザーがキャンセルした場合
  if (error) {
    return NextResponse.redirect(`${baseUrl}/login.html?error=line_cancelled`);
  }

  // state検証
  const cookieStore = cookies();
  const savedState = cookieStore.get('line_login_state')?.value;
  const mode = cookieStore.get('line_login_mode')?.value || 'login';

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${baseUrl}/login.html?error=invalid_state`);
  }

  // cookie削除
  cookieStore.delete('line_login_state');
  cookieStore.delete('line_login_mode');

  try {
    // 認可コードでアクセストークンを取得
    const redirectUri = `${baseUrl}/api/auth/line/callback`;
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error('LINE token error:', err);
      return NextResponse.redirect(`${baseUrl}/login.html?error=line_token_failed`);
    }

    const tokenData = await tokenRes.json();

    // アクセストークンでプロフィール取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${baseUrl}/login.html?error=line_profile_failed`);
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId;
    const lineName = profile.displayName;

    // mode=link: 既存ログインユーザーにLINE連携
    if (mode === 'link') {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return NextResponse.redirect(`${baseUrl}/login.html`);
      }

      // 他のユーザーが既にこのLINEアカウントを使っていないかチェック
      const existing = await db.user.findFirst({ where: { lineUserId } });
      if (existing && existing.id !== sessionUser.id) {
        return NextResponse.redirect(`${baseUrl}/mypage.html?error=line_already_linked`);
      }

      await db.user.update({
        where: { id: sessionUser.id },
        data: { lineUserId, lineNotify: true },
      });

      return NextResponse.redirect(`${baseUrl}/mypage.html?line_linked=1`);
    }

    // mode=login: LINEでログインまたは新規登録
    // 既にlineUserIdで登録済みのユーザーを検索
    let user = await db.user.findFirst({ where: { lineUserId } });

    if (user) {
      // 既存ユーザー → ログイン
      const res = NextResponse.redirect(`${baseUrl}/mypage.html`);
      res.headers.set('Set-Cookie', makeSessionCookie(user.id));
      return res;
    }

    // lineUserIdで未登録 → 新規ユーザー作成
    user = await db.user.create({
      data: {
        email: `line_${lineUserId}@line.local`,
        password: '', // LINEログインユーザーはパスワード不要
        name: lineName,
        lineUserId,
        lineNotify: true,
      },
    });

    const res = NextResponse.redirect(`${baseUrl}/mypage.html`);
    res.headers.set('Set-Cookie', makeSessionCookie(user.id));
    return res;
  } catch (err) {
    console.error('LINE callback error:', err.message, err.stack);
    return NextResponse.redirect(`${baseUrl}/login.html?error=line_error`);
  }
}
