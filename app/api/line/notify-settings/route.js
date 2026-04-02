import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

const STORES = [
  { id: 1, name: '北一食堂' },
  { id: 2, name: '大学食堂' },
  { id: 3, name: '南食堂' },
];

// 通知設定を取得
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'ログインが必要です。' }, { status: 401 });
  }

  const notifyStores = await db.lineNotifyStore.findMany({
    where: { userId: user.id },
  });

  const enabledStoreIds = notifyStores.map((ns) => ns.storeId);

  return NextResponse.json({
    lineNotify: user.lineNotify,
    lineLinked: !!user.lineUserId,
    stores: STORES.map((s) => ({
      ...s,
      enabled: enabledStoreIds.includes(s.id),
    })),
  });
}

// 通知設定を更新
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'ログインが必要です。' }, { status: 401 });
  }

  const body = await req.json();
  // body: { lineNotify: boolean, storeIds: number[] }

  // lineNotify の全体ON/OFF を更新
  await db.user.update({
    where: { id: user.id },
    data: { lineNotify: !!body.lineNotify },
  });

  // 食堂ごとの通知設定を差し替え
  const storeIds = (body.storeIds || []).filter((id) =>
    STORES.some((s) => s.id === id)
  );

  // 既存を全削除 → 新しい設定を挿入
  await db.lineNotifyStore.deleteMany({ where: { userId: user.id } });

  if (storeIds.length > 0) {
    await db.lineNotifyStore.createMany({
      data: storeIds.map((storeId) => ({ userId: user.id, userName: user.name, storeId })),
    });
  }

  return NextResponse.json({ ok: true });
}
