import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { multicast } from '@/lib/line';

// 対象人数を取得
export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const now = new Date();
  const monthTagName = `${now.getMonth() + 1}月${now.getDate()}日希望`;

  const monthTag = await db.tag.findUnique({ where: { name: monthTagName } });
  if (!monthTag) {
    return NextResponse.json({ tag: monthTagName, count: 0 });
  }

  const count = await db.user.count({
    where: {
      lineUserId: { not: null },
      userTags: { some: { tagId: monthTag.id } },
    },
  });

  return NextResponse.json({ tag: monthTagName, count });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ message: 'LINE設定がされていません。' }, { status: 500 });
  }

  // 公開中の在庫あり商品の在庫合計を取得
  const products = await db.product.findMany({
    where: { storeId: user.storeId, published: true, stock: { gt: 0 } },
  });

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  if (totalStock === 0) {
    return NextResponse.json({ message: '在庫がありません。' }, { status: 400 });
  }

  // 当月の希望タグ名（例: "4月希望"）
  const now = new Date();
  const monthTagName = `${now.getMonth() + 1}月${now.getDate()}日希望`;

  // 当月の希望タグを検索
  const monthTag = await db.tag.findUnique({ where: { name: monthTagName } });

  if (!monthTag) {
    return NextResponse.json({ message: `「${monthTagName}」タグが存在しません。` }, { status: 400 });
  }

  // 当月希望タグが付いたLINE連携ユーザーを取得
  const users = await db.user.findMany({
    where: {
      lineUserId: { not: null },
      userTags: { some: { tagId: monthTag.id } },
    },
    select: { lineUserId: true },
  });

  const lineUserIds = users.map((u) => u.lineUserId).filter(Boolean);

  if (lineUserIds.length === 0) {
    return NextResponse.json({ message: `「${monthTagName}」の対象ユーザーがいません。` }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makanai.vercel.app';
  const messages = [
    {
      type: 'text',
      text: `本日${totalStock}個余りが出ました。\n\n▶ 注文はこちら\n${appUrl}`,
    },
  ];

  const result = await multicast(lineUserIds, messages);

  if (!result.ok) {
    return NextResponse.json({ message: 'LINE通知の送信に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: result.sent, tag: monthTagName });
}
