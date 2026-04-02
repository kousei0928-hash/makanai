import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { verifySignature, pushMessage } from '@/lib/line';

// 質問フロー定義
const questionFlow = [
  {
    id: 'school',
    text: '学校名を教えてください',
    tagPrefix: '学校',
    options: ['名古屋大学', '広島大学'],
    next: 'grade',
  },
  {
    id: 'grade',
    text: '何年生ですか？',
    tagPrefix: '学年',
    options: ['1年', '2年', '3年', '4年'],
  },
];

function getQuestionById(id) {
  return questionFlow.find((q) => q.id === id);
}

async function getOrCreateTag(name) {
  let tag = await db.tag.findUnique({ where: { name } });
  if (!tag) {
    tag = await db.tag.create({ data: { name } });
  }
  return tag;
}

async function sendQuestionMessage(lineUserId, question) {
  const actions = question.options.map((option) => ({
    type: 'postback',
    label: option,
    data: `flow=${question.id}&answer=${encodeURIComponent(option)}&next=${question.next || ''}`,
  }));

  const template = actions.length <= 2
    ? { type: 'confirm', text: question.text, actions }
    : { type: 'buttons', text: question.text, actions };

  await pushMessage(lineUserId, [
    { type: 'template', altText: question.text, template },
  ]);
}

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature');

  // 署名検証
  if (!process.env.LINE_CHANNEL_SECRET) {
    return NextResponse.json({ message: 'LINE_CHANNEL_SECRET not configured' }, { status: 500 });
  }
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
  }

  const data = JSON.parse(body);
  const events = data.events || [];

  for (const event of events) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    // 友だち追加イベント
    if (event.type === 'follow') {
      const existing = await db.user.findFirst({ where: { lineUserId } });

      if (!existing) {
        await pushMessage(lineUserId, [
          {
            type: 'text',
            text: 'まかない弁当の通知サービスへようこそ！\n\nLINE連携するために、アプリに登録しているメールアドレスを送信してください。',
          },
        ]);
      } else {
        // 既存ユーザー: 質問フローを開始（未回答の場合）
        const userTags = await db.userTag.findMany({
          where: { userId: existing.id },
          include: { tag: true },
        });
        const hasAnswered = userTags.some((ut) =>
          ut.tag.name.startsWith(questionFlow[0].tagPrefix + ':')
        );
        if (!hasAnswered) {
          await sendQuestionMessage(lineUserId, questionFlow[0]);
        }
      }
    }

    // postbackイベント（質問フローの回答）
    if (event.type === 'postback' && event.postback) {
      const params = new URLSearchParams(event.postback.data);
      const flowId = params.get('flow');
      const answer = params.get('answer');
      const nextId = params.get('next');

      if (flowId && answer) {
        const question = getQuestionById(flowId);
        const user = await db.user.findFirst({ where: { lineUserId } });

        if (question && user) {
          // 回答をタグとして保存（例: "学校:名古屋大学"）
          const fullTagName = `${question.tagPrefix}:${answer}`;
          const tag = await getOrCreateTag(fullTagName);
          await db.userTag.upsert({
            where: { userId_tagId: { userId: user.id, tagId: tag.id } },
            update: {},
            create: { userId: user.id, tagId: tag.id },
          });

          // 返信
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: `「${answer}」ですね。ありがとうございます！` }],
            }),
          });

          // 次の質問があれば送信
          if (nextId) {
            const nextQuestion = getQuestionById(nextId);
            if (nextQuestion) {
              // reply後に少し待ってからpush
              await new Promise((r) => setTimeout(r, 1000));
              await sendQuestionMessage(lineUserId, nextQuestion);
            }
          }
        }
      }
    }

    // テキストメッセージ（メールアドレスによる連携）
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();

      // メールアドレスっぽい文字列か判定
      if (text.includes('@') && text.includes('.')) {
        const user = await db.user.findFirst({ where: { email: text } });

        if (user) {
          if (user.lineUserId && user.lineUserId !== lineUserId) {
            await pushMessage(lineUserId, [
              { type: 'text', text: 'このメールアドレスは既に別のLINEアカウントに連携されています。' },
            ]);
          } else {
            await db.user.update({
              where: { id: user.id },
              data: { lineUserId, lineNotify: true },
            });

            // 連携完了後に質問フローを開始
            const userTags = await db.userTag.findMany({
              where: { userId: user.id },
              include: { tag: true },
            });
            const hasAnswered = userTags.some((ut) =>
              ut.tag.name.startsWith(questionFlow[0].tagPrefix + ':')
            );

            let replyText = `${user.name}さん、LINE連携が完了しました！`;
            if (!hasAnswered) {
              replyText += '\n\n続けていくつか質問させてください。';
            }

            await pushMessage(lineUserId, [{ type: 'text', text: replyText }]);

            if (!hasAnswered) {
              await new Promise((r) => setTimeout(r, 1000));
              await sendQuestionMessage(lineUserId, questionFlow[0]);
            }
          }
        } else {
          await pushMessage(lineUserId, [
            { type: 'text', text: 'このメールアドレスは登録されていません。アプリに登録済みのメールアドレスを送信してください。' },
          ]);
        }
      }
    }

    // ブロック（友だち解除）イベント
    if (event.type === 'unfollow') {
      const user = await db.user.findFirst({ where: { lineUserId } });
      if (user) {
        await db.lineNotifyStore.deleteMany({ where: { userId: user.id } });
        await db.userTag.deleteMany({ where: { userId: user.id } });
        await db.user.update({
          where: { id: user.id },
          data: { lineUserId: null, lineNotify: false },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
