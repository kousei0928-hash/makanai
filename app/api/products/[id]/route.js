import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const id = Number(params.id);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: '不正な商品IDです。' }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ message: '商品が見つかりません。' }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    storeId: product.storeId,
    storeName: product.storeName,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
    saleDate: product.saleDate
  });
}
