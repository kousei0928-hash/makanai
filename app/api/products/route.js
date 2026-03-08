import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function pickProductListFields(product) {
  return {
    id: product.id,
    storeId: product.storeId,
    storeName: product.storeName,
    name: product.name,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
    saleDate: product.saleDate
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const storeIdParam = searchParams.get('storeId');

  const where = { published: true };

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ message: 'dateはYYYY-MM-DD形式で指定してください。' }, { status: 400 });
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    where.saleDate = {
      gte: start,
      lt: end
    };
  }

  if (storeIdParam) {
    const storeId = Number(storeIdParam);
    if (!Number.isInteger(storeId)) {
      return NextResponse.json({ message: 'storeIdが不正です。' }, { status: 400 });
    }
    where.storeId = storeId;
  }

  const products = await db.product.findMany({
    where,
    orderBy: [{ saleDate: 'asc' }, { id: 'asc' }]
  });

  // 在庫あり → 上、売り切れ → 下
  products.sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));

  return NextResponse.json(products.map(pickProductListFields));
}
