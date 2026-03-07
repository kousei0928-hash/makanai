import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/prisma';
import { makeSessionCookie } from '@/lib/auth';

const STORE_BY_EMAIL = {
  'tyerukun0928@gmail.com': { storeId: 1, storeName: '北一食堂' },
  'admin@example.com': { storeId: 3, storeName: '南食堂' },
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim();
    const password = body?.password;
    const name = body?.name?.trim();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'すべての項目を入力してください。' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'パスワードは6文字以上にしてください。' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'このメールアドレスは既に登録されています。' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const store = STORE_BY_EMAIL[email] || {};
    const user = await db.user.create({
      data: { email, password: hashed, name, ...store }
    });

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.headers.set('Set-Cookie', makeSessionCookie(user.id));
    return res;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: error.message || '登録に失敗しました。' }, { status: 500 });
  }
}
