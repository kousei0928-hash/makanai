import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/prisma';
import { makeSessionCookie } from '@/lib/auth';

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
    const user = await db.user.create({
      data: { email, password: hashed, name }
    });

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.headers.set('Set-Cookie', makeSessionCookie(user.id));
    return res;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: error.message || '登録に失敗しました。' }, { status: 500 });
  }
}
