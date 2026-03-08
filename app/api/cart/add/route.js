import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { dayKey, validateStoreDayLimit } from '@/lib/orderRules';

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'ログインしてください。' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const productId = Number(body?.productId);
    const quantity = Number(body?.quantity);

    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ message: 'productIdまたはquantityが不正です。' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ message: '商品が見つかりません。' }, { status: 404 });
    }

    // 現在のカートをDBから取得
    const existingItems = await db.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true }
    });

    // 追加後の数量を計算
    const existingEntry = existingItems.find((item) => item.productId === productId);
    const newQty = (existingEntry?.quantity || 0) + quantity;

    // 在庫チェック
    if (product.stock < newQty) {
      return NextResponse.json({ message: `${product.name} の在庫が不足しています。` }, { status: 400 });
    }

    // 今日の購入済み数を取得（同一店舗・同一日）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = await db.orderItem.findMany({
      where: {
        order: {
          userId: user.id,
          createdAt: { gte: todayStart, lte: todayEnd }
        },
        storeId: product.storeId
      }
    });
    const purchasedQty = todayOrders.reduce((sum, item) => sum + item.quantity, 0);

    // ルールチェック（カート内 + 購入済みの合計で上限チェック）
    const rows = existingItems
      .filter((item) => item.productId !== productId)
      .map((item) => ({ storeId: item.product.storeId, saleDate: item.product.saleDate, quantity: item.quantity }));
    rows.push({ storeId: product.storeId, saleDate: product.saleDate, quantity: newQty + purchasedQty });

    const ruleCheck = validateStoreDayLimit(rows);
    if (!ruleCheck.ok) {
      return NextResponse.json({ message: `本日この店舗で既に${purchasedQty}個購入済みです。1日の上限は3個までです。` }, { status: 400 });
    }

    // DBに保存（upsert）
    await db.cartItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: { quantity: newQty },
      create: { userId: user.id, productId, quantity }
    });

    
    const totalItems = rows.reduce((sum, r) => sum + r.quantity, 0);
    return NextResponse.json({ ok: true, totalItems });
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json({ message: error.message || 'カート追加に失敗しました。' }, { status: 500 });
  }
}
