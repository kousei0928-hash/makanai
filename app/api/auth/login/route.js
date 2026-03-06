import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/prisma';
import { makeSessionCookie } from '@/lib/auth';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ message: 'メールアドレスとパスワードを入力してください。' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ message: 'メールアドレスまたはパスワードが正しくありません。' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ message: 'メールアドレスまたはパスワードが正しくありません。' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.headers.set('Set-Cookie', makeSessionCookie(user.id));
  return res;
}
