import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const cartItems = await db.cartItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: 'asc' }
  });

  const items = cartItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    product: {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      stock: item.product.stock,
      storeId: item.product.storeId,
      storeName: item.product.storeName,
      saleDate: item.product.saleDate,
      imageUrl: item.product.imageUrl
    }
  }));

  return NextResponse.json({ items });
}

export async function DELETE(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'ログインしてください。' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get('productId'));

  if (productId) {
    // 特定の商品を削除
    await db.cartItem.deleteMany({
      where: { userId: user.id, productId }
    });
  } else {
    // カート全体をクリア
    await db.cartItem.deleteMany({
      where: { userId: user.id }
    });
  }

  return NextResponse.json({ ok: true });
}
