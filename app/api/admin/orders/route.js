import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const orders = await db.order.findMany({
    where: { storeId: user.storeId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ orders });
}
