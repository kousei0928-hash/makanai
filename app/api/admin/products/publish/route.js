import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { multicast } from '@/lib/line';

export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  // 公開前に未公開商品を取得（通知メッセージ用）
  const unpublished = await db.product.findMany({
    where: { storeId: user.storeId, published: false },
  });

  const result = await db.product.updateMany({
    where: { storeId: user.storeId, published: false },
    data: { published: true },
  });

  // LINE通知: この食堂の通知ONユーザーに送信
  let lineSent = 0;
  if (result.count > 0 && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    const notifyUsers = await db.user.findMany({
      where: {
        lineNotify: true,
        lineUserId: { not: null },
        notifyStores: { some: { storeId: user.storeId } },
      },
      select: { lineUserId: true },
    });

    const lineUserIds = notifyUsers.map((u) => u.lineUserId);

    if (lineUserIds.length > 0) {
      const storeName = user.storeName || '食堂';
      const productList = unpublished
        .slice(0, 5)
        .map((p) => `・${p.name}  ¥${p.price}`)
        .join('\n');
      const more = unpublished.length > 5 ? `\n他 ${unpublished.length - 5} 品` : '';

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makanai.vercel.app';

      const messages = [
        {
          type: 'text',
          text: `${storeName}のまかない弁当が公開されました！\n\n${productList}${more}\n\n▶ 注文はこちら\n${appUrl}`,
        },
      ];

      const lineResult = await multicast(lineUserIds, messages);
      if (lineResult.ok) lineSent = lineResult.sent;
    }
  }

  return NextResponse.json({ ok: true, count: result.count, lineSent });
}
