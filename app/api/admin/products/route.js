import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

const STORE_MASTER = {
  1: '北一食堂',
  2: '大学食堂',
  3: '南食堂'
};

export async function GET() {
  const products = await db.product.findMany({
    orderBy: [{ saleDate: 'asc' }, { id: 'asc' }],
    include: {
      orderItems: {
        include: {
          order: true
        }
      }
    }
  });

  return NextResponse.json({ products });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  const data = {
    storeId: Number(body?.storeId),
    name: body?.name?.trim(),
    description: body?.description?.trim() || '',
    price: Number(body?.price),
    saleDate: body?.saleDate,
    stock: Number(body?.stock),
    imageUrl: body?.imageUrl?.trim() || ''
  };

  const storeName = STORE_MASTER[data.storeId];

  if (!Number.isInteger(data.storeId) || !storeName || !data.name || !data.saleDate || !data.imageUrl) {
    return NextResponse.json({ message: '必須項目が不足しています。' }, { status: 400 });
  }

  if (!Number.isInteger(data.price) || data.price < 0 || !Number.isInteger(data.stock) || data.stock < 0) {
    return NextResponse.json({ message: '価格または在庫が不正です。' }, { status: 400 });
  }

  const saleDate = new Date(`${data.saleDate}T00:00:00.000Z`);
  if (Number.isNaN(saleDate.getTime())) {
    return NextResponse.json({ message: '販売日が不正です。' }, { status: 400 });
  }

  const product = await db.product.create({
    data: {
      storeId: data.storeId,
      storeName,
      name: data.name,
      description: data.description,
      price: data.price,
      saleDate,
      stock: data.stock,
      imageUrl: data.imageUrl
    }
  });

  return NextResponse.json({ ok: true, product });
}
