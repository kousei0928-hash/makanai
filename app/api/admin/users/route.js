import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// ユーザー一覧（タグ付き）
export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { lineUserId: { not: null } },
    select: {
      id: true,
      name: true,
      lineUserId: true,
      userTags: {
        include: { tag: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      lineUserId: u.lineUserId,
      tags: u.userTags.map((ut) => ({ id: ut.tag.id, name: ut.tag.name })),
    }))
  );
}

// ユーザーにタグを追加/削除
export async function POST(req) {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const { userId, tagId, action } = await req.json();

  if (!userId || !tagId || !action) {
    return NextResponse.json({ message: 'userId, tagId, action が必要です。' }, { status: 400 });
  }

  if (action === 'add') {
    await db.userTag.upsert({
      where: { userId_tagId: { userId, tagId } },
      update: {},
      create: { userId, tagId },
    });
  } else if (action === 'remove') {
    await db.userTag.deleteMany({ where: { userId, tagId } });
  }

  return NextResponse.json({ ok: true });
}
