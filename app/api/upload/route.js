import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false
    });

  if (error) {
    return NextResponse.json({ message: `アップロード失敗: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl });
}
