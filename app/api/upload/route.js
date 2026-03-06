import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ message: 'ファイルが選択されていません。' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = (file.name.match(/\.\w+$/) || ['.jpg'])[0];
    const filename = `${Date.now()}${ext}`;

    // バケット一覧を確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return NextResponse.json({
        message: `バケット一覧取得失敗: ${listError.message}`,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
      }, { status: 500 });
    }

    const bucketNames = (buckets || []).map(b => b.name);

    const { error } = await supabase.storage
      .from('product_images')
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (error) {
      return NextResponse.json({
        message: `アップロード失敗: ${error.message}`,
        buckets: bucketNames
      }, { status: 500 });
    }

    const { data } = supabase.storage
      .from('product_images')
      .getPublicUrl(filename);

    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    return NextResponse.json({
      message: `予期しないエラー: ${e.message}`,
      stack: e.stack
    }, { status: 500 });
  }
}
