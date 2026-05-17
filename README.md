# makanai — まかない弁当の即時販売プラットフォーム

学食・社食で日々発生する「廃棄予定のまかない弁当」を、その日の利用者にスマホ経由で販売するための Web アプリケーションです。
**店舗側は「写真を撮って公開ボタンを押すだけ」、購入者側は「LINE 通知から数タップで購入完了」** という体験を目指して、Next.js / Prisma / LINE API でフルスタック実装しました。

> 個人開発 / 1 名 / 構想〜MVP リリースまで実装。フロントエンド・バックエンド・DB 設計・認証・外部 API 連携・デプロイまでを一人で担当しています。

---

## 解決したい課題

- 学食・社食では **毎日数十食単位でまかないの「余り」** が発生し、廃棄コストとフードロスの両方が問題になっている
- 現場担当者は本業が忙しく、「販売チャネルを別途運用する手間」がボトルネックになって、結局廃棄してしまうことが多い
- 一方、学生・社員側は「今日まかないが余っているか」をリアルタイムに知る手段がない

この需給の非対称性を、**「現場に新しい運用負荷を増やさない」かつ「需要側には能動的に通知を届ける」** という設計で解消することがプロダクトの目的です。

---

## 提供価値（定量インパクト）

| 観点 | Before（想定運用） | After（本アプリ） |
| --- | --- | --- |
| 商品登録 | 1 個ずつ撮影 + フォーム入力で数十分 | **20 商品を約 5 分**で登録（一括アップロード + 自動連番） |
| 顧客への告知 | 掲示物 / 口頭 / SNS で都度発信 | **公開ボタン 1 つで LINE 一斉配信**（multicast、最大 500 名 / req） |
| 公平性 | 一部の人が買い占めるリスク | サーバーサイドで **1 店舗 / 1 日 / 1 ユーザー = 3 個までを保証** |
| ログイン障壁 | アカウント新規作成が必要 | **LINE Login で 2 タップ**サインアップ可能 |

---

## 技術スタック

| レイヤ | 採用技術 | 選定理由 |
| --- | --- | --- |
| フロントエンド | **Next.js 14 (App Router) / React 18** | サーバーコンポーネント + Route Handler で API も同一プロジェクトに集約。Vercel への即時デプロイ。 |
| バックエンド | **Next.js Route Handlers (Node.js)** | フロント / API 間の型・スキーマ・認証ロジックを共有でき、個人開発の保守コストを最小化。 |
| データベース | **PostgreSQL + Prisma ORM** | リレーション + トランザクション + 行ロック（`SELECT ... FOR UPDATE`）が必要だったため。Prisma で型安全に。 |
| 認証 | **HMAC-SHA256 署名 Cookie + LINE Login (OAuth 2.0)** | 外部依存を増やさず、軽量かつ改ざん耐性のあるセッションを自前実装。LINE Login で UX を最大化。 |
| 通知 | **LINE Messaging API (multicast / push)** | ターゲットユーザーが既に LINE を使っており、最も到達率の高いチャネル。 |
| 画像 | **ローカルストレージ（`public/uploads/`）** | MVP 段階での外部依存・コストを排除。後で S3 / Cloudinary に差し替え可能な薄い実装に保った。 |

> 当初は Supabase Storage を採用していましたが、**MVP 段階で「無料枠 / 自分でコントロール可能」を優先**してローカルストレージへ巻き戻しました（commit: `画像アップロードをローカルストレージに変更、Supabase依存を削除`）。技術的な惰性ではなく、運用フェーズに応じて構成を見直しています。

---

## システム構成

```
┌──────────────┐         ┌──────────────────────────────┐
│  購入者ブラウザ │         │      Next.js (App Router)     │
│ (LINE 通知から) │ ──────▶│  ┌─ /app/api/* (Route Handler)│
└──────────────┘         │  │   - auth (Login + LINE)    │
                         │  │   - cart / orders          │ ──▶ PostgreSQL
┌──────────────┐         │  │   - admin/products/publish │     (Prisma)
│ 店舗管理者ブラウザ│ ──────▶│  │   - line/webhook           │
│  (一括登録 UI)  │         │  └─ /app/admin/* (UI)         │
└──────────────┘         │                              │
                         │  /lib/auth.js     ─ HMAC Cookie│
                         │  /lib/orderRules  ─ 購入制限   │
                         │  /lib/line        ─ LINE API   │
                         └──────────────────────────────┘
                                       │
                                       ▼
                              LINE Messaging API
                              （multicast / push）
```

---

## 工夫したポイント

### 1. 一括アップロード + 自動連番 — 20 商品を 5 分で登録

[app/admin/new/page.js](app/admin/new/page.js) の **一括登録モード（BulkMode）** では、店舗担当者がスマホで撮りためた弁当写真を複数選択するだけで、

- 選択順にそのまま `商品1 / 商品2 / 商品3 ...` と **自動連番** で命名
- 共通の価格・在庫数を入力 → 並列に画像アップロード + Product 作成

を一気通貫で行います。**個別名入力のコストをゼロ**にしたことで、現場検証では 20 商品の登録が約 5 分で完了しました。
個別登録モード（SingleMode）でも `nextNumber = registered.length + 1` を維持し、撮影 → 値段入力 → 登録のループを繰り返すだけで連番が振られ続けます。

> **設計判断**: 「商品名は本来一意であるべき」という常識をあえて捨て、**店舗担当者の作業負荷をゼロに近づける**ことを優先しました。詳細な商品名やコメントはあとから個別編集できる設計にすることで、運用負荷と情報量のトレードオフを解いています。

### 2. サーバー側で保証する「1 店舗 1 日 3 個」の購入制限

弁当という商品の性質上、**一人が買い占めて他の人が買えない状況** を避ける必要があります。
クライアント側の UI 抑止だけでは API を直接叩かれると無効化されるため、[lib/orderRules.js](lib/orderRules.js) で純粋関数として制限ロジックを切り出し、

- カート追加時（`/api/cart/add`）
- 注文確定時（`/api/orders`）

の両方で **サーバーサイドで強制** しています。さらに [app/api/orders/route.js](app/api/orders/route.js) では同時購入による在庫マイナスを防ぐため、`SELECT ... FOR UPDATE` で **行ロックを取得した上でトランザクション内で在庫を減算** しています。

```js
// app/api/orders/route.js より抜粋
const products = await tx.$queryRaw`
  SELECT * FROM "Product" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE
`;
// ... 在庫チェック → 制限チェック → 在庫減算 → Order/OrderItem作成
// すべて1トランザクションで完結
```

> **技術的に挑戦した点**: Prisma の標準 API では行ロックを表現しづらかったため、`$queryRaw` でロックを明示し、その後の更新は Prisma クライアントに戻すというハイブリッド構成を取りました。型安全性と整合性を両立させる選択です。

### 3. LINE Login を組み込んだ低摩擦サインアップ

メール / パスワードの古典的な認証に加えて、**LINE アカウントだけで即サインアップ・即ログイン** が可能です。学生・社員という主要ユーザー層がほぼ全員 LINE を使っている事実を踏まえた判断です。

- [app/api/auth/line/route.js](app/api/auth/line/route.js) — `crypto.randomBytes(16)` で **CSRF 対策の `state` を生成** し、`httpOnly` + `sameSite=lax` Cookie に格納したうえで LINE 認可エンドポイントへリダイレクト
- [app/api/auth/line/callback/route.js](app/api/auth/line/callback/route.js) — `state` 検証 → アクセストークン交換 → プロフィール取得 → DB に `lineUserId` で upsert → 自前セッション発行
- 同じエンドポイントを `mode=login` / `mode=link`（既存アカウントへの紐付け）で兼用し、ルーティングをシンプルに保つ設計

セッションは [lib/auth.js](lib/auth.js) で **`LINE_CHANNEL_SECRET` を鍵に HMAC-SHA256 で署名した Cookie** を独自実装。

```js
// lib/auth.js より抜粋
function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(String(value));
  return `${value}.${hmac.digest('hex')}`;
}
```

> NextAuth.js のような大きな依存を入れず、**「自分で説明できる範囲のセキュリティ」** に留めた選択です。`httpOnly` / `Secure`（本番のみ）/ `SameSite=Lax` / `Max-Age` を明示的に設定し、署名なしの古い Cookie に対する後方互換も含めています。

### 4. 公開ボタン 1 つで DB 反映 + LINE 一斉配信

本アプリの **「最も削りたかった現場負担」** を体現する機能です。店舗担当者が管理画面で **「未公開商品をすべて公開」** を押すと、[app/api/admin/products/publish/route.js](app/api/admin/products/publish/route.js) がサーバー側で以下を一連の処理として実行します。

1. 認証 + 店舗権限チェック（`storeId` を持つユーザーのみ）
2. 自店舗の `published: false` Product を `updateMany` で一括公開
3. **「この店舗の通知を ON にしているユーザー」** を絞り込んで `lineUserId` を抽出
4. 商品名 + 価格 + 注文 URL を組み立て、`multicast` API で **最大 500 人に一斉プッシュ**

```js
// app/api/admin/products/publish/route.js より抜粋
const notifyUsers = await db.user.findMany({
  where: {
    lineNotify: true,
    lineUserId: { not: null },
    notifyStores: { some: { storeId: user.storeId } },
  },
  select: { lineUserId: true },
});
// → multicast(lineUserIds, messages)
```

> **配信セグメント設計**: 「店舗フォロー」だけでなく、`Tag` / `UserTag` モデルで **「N 月 N 日希望」などの動的タグ** を持たせ、[app/api/admin/notify/route.js](app/api/admin/notify/route.js) では当日希望ユーザーだけに在庫アラートを送れるようにしています。将来的な「曜日固定通知」「メニュー別通知」への拡張余地を残した設計です。

---

## セキュリティ設計

書類選考をご覧いただく方への補足として、特に意識した観点を列挙します。

- **セッション Cookie**: HMAC-SHA256 で署名 / `httpOnly` / `SameSite=Lax` / 本番のみ `Secure` / 7 日 TTL（[lib/auth.js](lib/auth.js)）
- **CSRF**: LINE Login で `crypto.randomBytes(16)` の `state` を発行し、コールバックで Cookie と照合
- **LINE Webhook 署名検証**: `crypto.createHmac('SHA256', LINE_CHANNEL_SECRET)` で **タイミング攻撃にも一定の耐性を持たせて検証**（[lib/line.js](lib/line.js)）
- **権限境界**: 店舗管理者 API は **すべて `getSessionUser()` で `storeId` を確認** したうえで自店舗データのみ操作可能
- **入力検証**: 注文 API では `Number.isInteger` + 量の正値チェックを通過したリクエストのみトランザクションに進む（[app/api/orders/route.js](app/api/orders/route.js)）
- **同時実行性**: 在庫減算は `FOR UPDATE` + `$transaction` でレースコンディションを排除
- **パスワード**: bcrypt によるハッシュ化（依存: `bcryptjs`）
- **権限分離**: LINE Login 経由ユーザーは `password: ''` で保存し、パスワード認証フローを通れないように分離

---

## データモデル概要

[prisma/schema.prisma](prisma/schema.prisma) より、主要なリレーションを抜粋します。

```
User ─┬─ Order ─── OrderItem ──┐
      ├─ CartItem ─────────────┼── Product
      ├─ UserTag ─── Tag        │
      └─ LineNotifyStore  ──────┘ (storeIdベース)
```

- **User** — `email` / `password`(bcrypt) / `name` / `lineUserId`（unique）/ `lineNotify` / `storeId`（店舗担当者のみ）
- **Product** — `storeId` / `name` / `price` / `saleDate` / `stock` / `published`
- **Order** — 1 注文 = 単一店舗・複数商品（`validateSingleStore` で保証）
- **CartItem** — `@@unique([userId, productId])` で重複追加を防止
- **Tag / UserTag** — 顧客のセグメント配信用タグ（例: `5月18日希望`）
- **LineNotifyStore** — 「どの店舗の入荷通知を受け取るか」をユーザーごとに保持

---

## ディレクトリ構成

```
makanai/
├── app/
│   ├── admin/             # 店舗管理者向けページ
│   │   ├── new/           # 商品登録（個別 / 一括モード）— 工夫ポイント①
│   │   ├── orders/        # 注文一覧
│   │   └── users/         # 顧客タグ管理
│   ├── api/
│   │   ├── admin/         # 管理 API（products / notify / orders / tags / users）
│   │   ├── auth/          # 認証（register / login / logout / me / line / line/callback）
│   │   ├── cart/          # カート
│   │   ├── line/          # LINE 連携（webhook / link / notify-settings）
│   │   ├── orders/        # 注文（FOR UPDATE で在庫制御）
│   │   ├── products/      # 公開商品一覧
│   │   └── upload/        # 画像アップロード
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── lib/
│   ├── auth.js            # HMAC 署名 Cookie セッション
│   ├── line.js            # LINE Messaging API クライアント
│   ├── orderRules.js      # 1日3個までの購入制限ロジック
│   └── prisma.js          # Prisma クライアント（シングルトン）
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
└── public/                # 静的 HTML（ランディング・カート・履歴など）
```

---

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数（`.env`）

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# LINE Login（認証用）
LINE_LOGIN_CHANNEL_ID="..."
LINE_LOGIN_CHANNEL_SECRET="..."

# LINE Messaging API（通知用）
LINE_CHANNEL_ACCESS_TOKEN="..."
LINE_CHANNEL_SECRET="..."   # セッション署名鍵としても利用

NEXT_PUBLIC_APP_URL="https://your-domain"
```

### 3. DB 初期化 & 起動

```bash
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

---

## 主要 API 一覧

| メソッド & パス | 説明 |
| --- | --- |
| `POST /api/auth/register` | メール / パスワード新規登録 |
| `POST /api/auth/login` | ログイン |
| `GET  /api/auth/line` | LINE Login 認可リダイレクト（CSRF state 発行） |
| `GET  /api/auth/line/callback` | LINE Login コールバック（state 検証 + upsert） |
| `POST /api/upload` | 画像アップロード（`public/uploads/`） |
| `POST /api/admin/products` | 商品 1 件登録 |
| `PATCH /api/admin/products/[id]` | 在庫更新 |
| `DELETE /api/admin/products/[id]` | 商品削除 |
| `POST /api/admin/products/publish` | **未公開商品を一括公開 + LINE 一斉配信** |
| `GET/POST /api/admin/notify` | タグ別ターゲット通知（在庫アラート） |
| `POST /api/cart/add` | カート追加（購入制限チェック） |
| `POST /api/orders` | 注文確定（FOR UPDATE + 制限チェック + 在庫減算） |
| `POST /api/line/webhook` | LINE Webhook 受信（署名検証） |

---

## 今後の展望

- 画像ストレージの S3 / Cloudinary 移行（現状は MVP 用に `public/uploads/`）
- 決済代行（Stripe / PAY.JP）連携によるオンライン決済対応
- 「曜日固定通知」「アレルギー対応通知」などタグセグメントの拡充
- Vercel Cron による「公開し忘れ」リマインダー
- E2E テスト（Playwright）と CI/CD 整備

---

## なぜ作ったか（補足）

身近な学食で **「今日もまかないが廃棄されている」** という現場の声と、**「今日余ってるか分からないから諦めている」** 学生側の声の両方を聞いたことが出発点です。
技術的にはありふれた CRUD アプリですが、

- **現場の作業負荷を「ボタン 1 つ」レベルまで削る UI 設計**
- **公平性と整合性を担保するサーバーサイドのロジック設計**
- **到達率の高い LINE を通知チャネルにすることでマーケ的にも勝ち筋を作る判断**

の 3 点に意思決定の重心を置き、**「現場で本当に使われるプロダクトをひとりで最後まで作りきる」** ことを最重視して開発しました。
