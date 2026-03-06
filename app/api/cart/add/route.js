import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/prisma';
import { dayKey, validateStoreDayLimit } from '@/lib/orderRules';

const CART_COOKIE_KEY = 'foodlose_cart_v1';

function readCartCookie() {
  const raw = cookies().get(CART_COOKIE_KEY)?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function cartSummary(rows, addedStoreId, addedSaleDate) {
  const itemsCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const storeDayCount = rows
    .filter((row) => row.storeId === addedStoreId && dayKey(row.saleDate) === dayKey(addedSaleDate))
    .reduce((sum, row) => sum + row.quantity, 0);

  return { itemsCount, storeDayCount };
}

export async function POST(request) {
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

  const cookieCart = readCartCookie();
  const mergedMap = new Map();
  for (const item of cookieCart) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (Number.isInteger(pid) && Number.isInteger(qty) && qty > 0) {
      mergedMap.set(pid, (mergedMap.get(pid) || 0) + qty);
    }
  }
  mergedMap.set(productId, (mergedMap.get(productId) || 0) + quantity);

  const mergedItems = [...mergedMap.entries()].map(([pid, qty]) => ({ productId: pid, quantity: qty }));
  const ids = mergedItems.map((item) => item.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 存在しない商品（削除済み等）はカートから除外
  const validItems = mergedItems.filter((item) => productMap.has(item.productId));

  const rows = [];
  for (const item of validItems) {
    const p = productMap.get(item.productId);
    if (p.stock < item.quantity) {
      return NextResponse.json({ message: `${p.name} の在庫が不足しています。` }, { status: 400 });
    }
    rows.push({ storeId: p.storeId, saleDate: p.saleDate, quantity: item.quantity });
  }

  const ruleCheck = validateStoreDayLimit(rows);
  if (!ruleCheck.ok) {
    return NextResponse.json({ message: ruleCheck.message }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    cartSummary: cartSummary(rows, product.storeId, product.saleDate)
  });

  response.cookies.set(CART_COOKIE_KEY, JSON.stringify(validItems), {
    path: '/',
    sameSite: 'lax',
    httpOnly: false
  });

  return response;
}
