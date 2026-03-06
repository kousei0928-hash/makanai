import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET() {
  const orders = await db.order.findMany({
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
