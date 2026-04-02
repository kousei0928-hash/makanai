import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// ユーザーが LINE userId を手動で紐付ける
// Webhook の follow イベントで得た lineUserId をユーザー自身が入力して連携
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'ログインが必要です。' }, { status: 401 });
  }

  const body = await req.json();
  const { lineUserId } = body;

  if (!lineUserId || typeof lineUserId !== 'string') {
    return NextResponse.json({ message: 'LINE User ID が必要です。' }, { status: 400 });
  }

  // 既に別ユーザーが使用していないか確認
  const existing = await db.user.findFirst({
    where: { lineUserId, id: { not: user.id } },
  });
  if (existing) {
    return NextResponse.json({ message: 'この LINE アカウントは既に他のユーザーに連携されています。' }, { status: 409 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { lineUserId },
  });

  return NextResponse.json({ ok: true });
}

// LINE連携を解除
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'ログインが必要です。' }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { lineUserId: null, lineNotify: false },
  });

  // 通知設定も削除
  await db.lineNotifyStore.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
