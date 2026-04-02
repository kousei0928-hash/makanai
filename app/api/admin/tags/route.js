import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// タグ一覧取得（各タグのユーザー数付き）
export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const tags = await db.tag.findMany({
    include: { _count: { select: { userTags: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    tags.map((t) => ({ id: t.id, name: t.name, userCount: t._count.userTags }))
  );
}

// タグ作成
export async function POST(req) {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ message: 'タグ名を入力してください。' }, { status: 400 });
  }

  const tag = await db.tag.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  });

  return NextResponse.json(tag);
}

// タグ削除
export async function DELETE(req) {
  const user = await getSessionUser();
  if (!user || !user.storeId) {
    return NextResponse.json({ message: '権限がありません。' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ message: 'タグIDが必要です。' }, { status: 400 });
  }

  await db.userTag.deleteMany({ where: { tagId: id } });
  await db.tag.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
