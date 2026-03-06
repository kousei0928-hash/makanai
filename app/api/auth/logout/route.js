import { NextResponse } from 'next/server';
import { makeClearCookie } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', makeClearCookie());
  return res;
}
