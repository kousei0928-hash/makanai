import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { validateStoreDayLimit } from '@/lib/orderRules';
import { getSessionUser } from '@/lib/auth';

const VALID_PAYMENT_METHODS = ['card', 'cash'];

export async function POST(request) {
  const sessionUser = await getSessionUser();
  const body = await request.json().catch(() => null);
  const paymentMethod = body?.paymentMethod;
  const buyerName = body?.buyerName?.trim() || null;
  const buyerEmail = body?.buyerEmail?.trim() || null;
  const items = body?.items;

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ message: '支払い方法が不正です。' }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ message: 'itemsが空です。' }, { status: 400 });
  }

  const normalized = items
    .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
    .filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0);

  if (normalized.length !== items.length) {
    return NextResponse.json({ message: 'itemsの形式が不正です。' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const merged = new Map();
      for (const item of normalized) {
        merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
      }
      const mergedItems = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));

      const ids = mergedItems.map((item) => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const rows = [];
      const orderItems = [];
      let total = 0;

      for (const item of mergedItems) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`商品ID ${item.productId} が存在しません。`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`${product.name} の在庫が不足しています。`);
        }

        rows.push({
          storeId: product.storeId,
          saleDate: product.saleDate,
          quantity: item.quantity
        });

        const lineTotal = product.price * item.quantity;
        total += lineTotal;

        orderItems.push({
          productId: product.id,
          storeId: product.storeId,
          storeName: product.storeName,
          saleDate: product.saleDate,
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal
        });
      }

      const limitCheck = validateStoreDayLimit(rows);
      if (!limitCheck.ok) {
        throw new Error(limitCheck.message);
      }

      const storeId = rows[0]?.storeId;
      if (!Number.isInteger(storeId)) {
        throw new Error('storeIdが特定できません。');
      }

      for (const item of mergedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      const order = await tx.order.create({
        data: {
          storeId,
          total,
          paymentMethod,
          buyerName,
          buyerEmail,
          userId: sessionUser?.id || null,
          items: {
            create: orderItems
          }
        }
      });

      return order;
    });

    return NextResponse.json({ ok: true, orderId: result.id });
  } catch (error) {
    return NextResponse.json({ message: error.message || '注文作成に失敗しました。' }, { status: 400 });
  }
}
