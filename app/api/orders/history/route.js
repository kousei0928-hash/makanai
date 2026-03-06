import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  const sessionUser = await getSessionUser();

  let where;

  if (sessionUser) {
    where = { userId: sessionUser.id };
  } else {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam.split(',').map(Number).filter((id) => Number.isInteger(id));
    if (!ids.length) {
      return NextResponse.json([]);
    }
    where = { id: { in: ids } };
  }

  const orders = await db.order.findMany({
    where,
    include: { items: { include: { product: { select: { name: true, imageUrl: true } } } } },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(orders);
}
