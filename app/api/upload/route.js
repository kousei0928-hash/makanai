import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ message: 'ファイルが選択されていません。' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = (file.name.match(/\.\w+$/) || ['.jpg'])[0];
  const filename = `${Date.now()}${ext}`;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
