import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const products = await db.product.findMany({
    where: { storeId: user.storeId },
    orderBy: [{ saleDate: 'asc' }, { id: 'asc' }],
    include: {
      orderItems: {
        include: {
          order: true
        }
      }
    }
  });

  return NextResponse.json({ products, storeName: user.storeName });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user || !user.storeId || !user.storeName) {
    return NextResponse.json({ message: 'ログインしていないか、店舗が設定されていません。' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  const data = {
    storeId: user.storeId,
    storeName: user.storeName,
    name: body?.name?.trim(),
    description: body?.description?.trim() || '',
    price: Number(body?.price),
    saleDate: body?.saleDate,
    stock: Number(body?.stock),
    imageUrl: body?.imageUrl?.trim() || ''
  };

  if (!data.name || !data.saleDate || !data.imageUrl) {
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
      storeName: data.storeName,
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
