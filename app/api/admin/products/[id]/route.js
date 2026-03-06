import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const id = Number(params.id);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: '不正な商品IDです。' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const stock = Number(body?.stock);

  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ message: '在庫数が不正です。' }, { status: 400 });
  }

  const product = await db.product.update({
    where: { id },
    data: { stock }
  });

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: '不正な商品IDです。' }, { status: 400 });
  }

  try {
    await db.$transaction([
      db.orderItem.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);
  } catch {
    return NextResponse.json({ message: '削除に失敗しました。' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
