import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const result = await db.product.updateMany({
    where: { storeId: user.storeId, published: false },
    data: { published: true }
  });

  return NextResponse.json({ ok: true, count: result.count });
}
