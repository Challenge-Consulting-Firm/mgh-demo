# SPEC.md — TODOカンバンアプリ

## 1. 概要

シンプルなTODO管理アプリを **カンバン形式** で表示する Web アプリを構築する。
Claude Code によるライブデモを想定し、**5〜10分で `docker compose up` まで完了して動作する** ことを最優先とする。

---

## 2. 技術スタック（固定）

| 区分 | 採用技術 |
|---|---|
| フレームワーク | **Next.js 16**（App Router）+ TypeScript |
| UI | React 19 / Tailwind CSS（`create-next-app` のデフォルトを利用） |
| ORM | **Prisma** |
| DB | **SQLite**（ファイルベース、`./prisma/dev.db`） |
| 実行環境 | **Docker** / Docker Compose |
| パッケージマネージャ | npm（`create-next-app` のデフォルト） |

### バージョン指定
- Node.js: `20-alpine`（Dockerベースイメージ）
- Next.js: `^16.0.0`
- Prisma: `^7.0.0`（**Prisma 7 系** ― driver adapter 必須・破壊的変更あり。後述「2.1 Prisma 7 セットアップ要点」を必ず参照）

---

## 2.1 Prisma 7 セットアップ要点（時短のため必読）

Prisma 7 は 6 系から大きく変わっており、`SPEC.md` に従って最短経路で実装するためには以下のルールを **最初から** 守ること。これを知らずに進めると 30 分以上ハマる。

### 必須インストール（initial install で全て入れる）
```bash
# devDependencies
npm i -D prisma tsx @types/better-sqlite3
# dependencies
npm i @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3 dotenv
```
- **`@prisma/adapter-better-sqlite3` と `better-sqlite3` は必須**（Prisma 7 では Rust エンジンが廃止され、driver adapter 方式が標準）
- `tsx` は `prisma db seed` の実行に使う

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client"          // ← "prisma-client-js" ではない
  output   = "../generated/prisma"    // ← app/ 配下は Next.js のルーティングと衝突する恐れがあるので避ける
}

datasource db {
  provider = "sqlite"
  // url = env("DATABASE_URL")  ← Prisma 7 では schema 内に書けない！ prisma.config.ts に書く
}
```

### `prisma.config.ts`（プロジェクトルート、Prisma 7 で必須）
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",     // ← seed コマンドはここで指定（package.json の prisma.seed は不可）
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### `.env`
```bash
DATABASE_URL="file:./prisma/dev.db"
```
- ファイルパスはプロジェクトルートからの相対パス。`file:./dev.db` だとルート直下に作られて SPEC ディレクトリ構造から外れる。

### `lib/prisma.ts`
```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";  // ← @prisma/client ではなく生成先

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
- クラス名は **`PrismaBetterSqlite3`**（`SQLite3` ではなく `Sqlite3`、小文字 `qlite`）

### マイグレ＆生成（順序重要）
```bash
npx prisma migrate dev --name init
npx prisma generate          # ← migrate dev だけでは generated/prisma が作られない場合がある。明示実行が確実
npx prisma db seed
```

> ⚠️ **`rtk` プロキシ環境での注意（常時ルール化）**：`rtk npx prisma db seed` は `tsx prisma/seed.ts` を内部で起動する過程で `No such file or directory (os error 2)` を出すケースがある。**`prisma db seed` は常に `/opt/homebrew/bin/npx prisma db seed` を直接叩く**（rtk 環境かどうかを毎回判断しない／分岐ゼロでデモ事故を防ぐ）。`migrate dev` と `generate` は `rtk` 経由で問題なし。

### `.gitignore` 追記（コピペ1回で済ます）
`create-next-app` 生成の `.gitignore` には Prisma 関連がないので、以下を1コマンドで追記する：

```bash
cat >> .gitignore << 'EOF'

# prisma
/generated
/prisma/dev.db
/prisma/dev.db-journal
EOF
```

---

## 3. 認証要件

**認証なし**。担当者は画面上の入力欄で自己申告（フリーテキスト）。
ログイン画面・セッション管理・ユーザーテーブルは作らない。

---

## 4. データモデル

`prisma/schema.prisma` に以下のモデルを定義する。

```prisma
model Todo {
  id          String   @id @default(cuid())
  title       String                    // 件名
  assignee    String                    // 担当者（自己申告のフリーテキスト）
  dueDate     DateTime?                 // 期日（任意）
  content     String                    // 具体的な内容
  status      Status   @default(TODO)   // ステータス
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Status {
  TODO          // 未着手
  IN_PROGRESS   // 進行中
  DONE          // 完了
}
```

ステータスの日本語表示マッピングは `lib/status.ts` に定数として持つ。

---

## 5. 画面構成

### `/` （カンバンページ、唯一のページ）

- 上部に「**＋ 新規TODO**」ボタン → クリックでモーダル表示
- 3カラム横並びのカンバンボード
  - 左：**未着手 (TODO)**
  - 中：**進行中 (IN_PROGRESS)**
  - 右：**完了 (DONE)**
- 各カラムに該当ステータスのTODOカードを縦並びで表示

### TODOカードの表示項目
- 件名（太字）
- 担当者
- 期日（あれば、`YYYY-MM-DD` 形式）
- 具体的な内容（2行で省略表示）
- ステータス変更用のセレクトボックス（変更すると即時保存）
- 削除ボタン（🗑）

### 新規作成モーダル
- 件名（必須）
- 担当者（必須）
- 期日（任意、`<input type="date">`）
- 具体的な内容（必須、textarea）
- ステータス（デフォルト：未着手）
- 「保存」「キャンセル」ボタン

### 配色（ライトテーマ固定）

**色は明示指定し、ダークモード対応はしない。** （OS のダークモード設定でモーダル文字が薄い灰色になる事故を防ぐため）

- `app/globals.css` から `@media (prefers-color-scheme: dark)` ブロックを削除する
- `body` の文字色は `#0f172a` (slate-900)、背景は `#f8fafc` (slate-50) を明示指定
- モーダル・カード・入力欄も `bg-white text-slate-900` を明示クラスで指定し、ブラウザのダークモード推測に任せない

---

## 6. 実装方針

- **Server Components をデフォルト** とし、TODO一覧の取得はサーバー側で実施
- **Server Actions** で create / update / delete を実装（API Route は作らない）
- 状態変更後は `revalidatePath('/')` でUI更新
- ドラッグ＆ドロップは **対象外**（デモ時間内に確実に動くことを優先。ステータス変更はセレクトボックスで実施）
- バリデーションは最小限（必須チェックのみ、Zod 等は不要）
- エラーハンドリングは `try/catch` で console.error のみ

### Next.js 16 のキャッシュ対策（必須）

`app/page.tsx` の先頭で **必ず `export const dynamic = "force-dynamic";` を宣言する**。Next.js 16 では Server Action 後の `revalidatePath('/')` だけだとビルド時静的化された場合に反映が安定しない。デモ中に「追加したのに出ない」と詰まる事故を防ぐため、最初から宣言しておく。

```ts
// app/page.tsx 先頭
export const dynamic = "force-dynamic";
```

### Server → Client 境界の注意（実装時にハマりやすい）

`page.tsx`（Server Component）で取得した Prisma の `Todo[]` をそのまま Client Component へ渡すと、`Date` 型の `dueDate`/`createdAt`/`updatedAt` がシリアライズ境界で型エラー・実行時警告の原因になる。**`page.tsx` 内で必ず以下のように整形してから渡す**：

```ts
const serialized = todos.map((t) => ({
  id: t.id,
  title: t.title,
  assignee: t.assignee,
  content: t.content,
  status: t.status as Status,
  dueDate: t.dueDate ? t.dueDate.toISOString() : null,   // ← ISO 文字列化
}));
```
クライアント側で表示する際に `new Date(iso)` → `YYYY-MM-DD` に整形する。

---

## 7. プロジェクト構造（目安）

```
.
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── prisma.config.ts          // Prisma 7 のため必須（DATABASE_URL とseed定義）
├── .env                      // DATABASE_URL="file:./prisma/dev.db"
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts               // サンプルデータ3件
│   └── dev.db                // (gitignore)
├── generated/                // (gitignore) Prisma 7 生成物の出力先
│   └── prisma/
├── lib/
│   ├── prisma.ts             // PrismaClient シングルトン (driver adapter 経由)
│   └── status.ts             // ステータスの日本語ラベル
├── app/
│   ├── layout.tsx
│   ├── page.tsx              // カンバンページ（Server Component）
│   ├── actions.ts            // Server Actions (create/update/delete)
│   ├── globals.css           // ダークモード分岐は削除（5章「配色」参照）
│   └── components/
│       ├── KanbanBoard.tsx
│       ├── TodoCard.tsx      // Client Component
│       └── NewTodoModal.tsx  // Client Component
```

---

## 8. Docker 構成

### `Dockerfile`
- ベース：`node:20-alpine`
- **`apk add --no-cache python3 make g++ libc6-compat` を追加**（`better-sqlite3` がネイティブビルドを必要とするため、これが無いと `npm install` で失敗する）
- ワークディレクトリ：`/app`
- `npm install` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run dev -- -H 0.0.0.0`
- ポート：3000

### `docker-compose.yml`
- サービス：`web` のみ（DBは SQLite ファイルなので不要）
- ボリューム：`./prisma/dev.db` をホストにマウント（データ永続化）
- コマンド：起動時に `prisma migrate deploy` → `prisma db seed` → `next dev -H 0.0.0.0`
- **ポート公開は `${HOST_PORT:-3001}:3000` の形にする**（デモ環境では別コンテナが 3000 を握っているケースが多く実測されているため、**デフォルトを 3001 に昇格**。空いていれば `HOST_PORT=3000 docker compose up` で旧来の挙動に戻せる）

### `.dockerignore`
最低限：`node_modules`, `.next`, `.git`, `generated`, `README.md`, `HOW.md`, `SPEC.md`

### 起動コマンド（デモのゴール）
```bash
HOST_PORT=${HOST_PORT:-3001} docker compose up -d --build
```
ブラウザで `http://localhost:3001` を開くとカンバンが表示され、シードデータ3件が見える。
3000 を使いたい場合のみ `HOST_PORT=3000 docker compose up`。

### Docker ボリュームの注意（SQLiteファイルマウント）

`docker-compose.yml` の `volumes:` を **単一ファイル `./prisma/dev.db:/app/prisma/dev.db` でマウントする場合、ホスト側に `dev.db` が存在しないと Docker が「ディレクトリ」として作ってしまい、コンテナ起動時に Prisma が壊れる**。

**本SPECでは `./prisma:/app/prisma` のディレクトリマウントを推奨**（generated は別パスなので衝突しない）。この方式なら **コンテナ起動時の `prisma migrate deploy` が dev.db を自動生成するため、ホスト側で先に `prisma migrate dev` を流す必要はない**（手順を1ステップ削減）。ホスト側で動作確認したい時のみ手動で migrate を流す。

### Dockerfile での seed 自動実行

Dockerfile の最終 CMD では `prisma migrate deploy` だけでなく `prisma db seed || true` も併走させると、初回起動時にシードデータが自動投入されて UX が良い（2回目以降は `deleteMany()` で冪等なので問題なし）。SPECサンプル：

```dockerfile
CMD sh -c "npx prisma migrate deploy && npx prisma db seed || true; npm run dev -- -H 0.0.0.0"
```

---

## 9. シードデータ（`prisma/seed.ts`）

3件、各ステータスに1件ずつ。例：

| 件名 | 担当者 | 期日 | ステータス |
|---|---|---|---|
| 設計レビューの実施 | 田中 | 2026-05-20 | 未着手 |
| 構築手順書のドラフト作成 | 佐藤 | 2026-05-15 | 進行中 |
| キックオフMTGの議事録 | 鈴木 | 2026-05-08 | 完了 |

> 💡 **タイムゾーン対策**：`new Date("2026-05-20")` のように日付のみ文字列を渡すと JST 環境で UTC 解釈され、表示が 1 日ズレることがある。シードでは `new Date("2026-05-20T00:00:00Z")` のように **明示的 UTC** で書くか、表示側で `toISOString().slice(0,10)` を使う等で揃えること。

> 💡 **冪等性**：`seed.ts` の冒頭で `await prisma.todo.deleteMany()` を呼んでおくと、再シード時の重複登録を防げる。Docker の `CMD` から `prisma db seed` を毎回流す構成と相性が良い。

---

## 10. 受け入れ条件（デモ成功基準）

1. ✅ `docker compose up` 一発で起動する
2. ✅ `http://localhost:3000` でカンバン3カラムが表示される
3. ✅ シードデータ3件が正しいカラムに表示される
4. ✅ 「＋ 新規TODO」から1件追加でき、画面に反映される
5. ✅ カード上のセレクトでステータスを変更すると、カラム間を移動する
6. ✅ 削除ボタンで該当カードが消える
7. ✅ コンテナを再起動してもデータが残っている（SQLiteファイル永続化）

---

## 11. 対象外（やらないこと）

- 認証・認可
- ドラッグ＆ドロップ（時間があれば後追いで `@dnd-kit/core` 導入を検討）
- 編集機能（削除→再作成で代替）
- 検索・フィルタ・ソート
- 複数ユーザー対応
- テストコード（デモ用途のため）
- 本番デプロイ用の Dockerfile 最適化（マルチステージビルド等）
- CI/CD

---

## 12. Claude Code への指示（実行順）

このSPEC.mdを読んだ後、以下の順で進めること。**「2.1 Prisma 7 セットアップ要点」「5章 配色」「8章 Docker構成」を先に読み、最初から正しい構成で書く** ことが時短の鍵。

1. **既存ファイル退避**：作業ディレクトリに `SPEC.md` / `HOW.md` がある場合は `create-next-app` が "directory not empty" で失敗するため、`/tmp` に一時退避してから作成・後で戻す。

2. **ひな型生成**：
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --use-npm --yes
   ```

3. **依存パッケージ一括インストール**（「2.1」のコマンドをそのまま実行）。

4. **Prisma 設定ファイルを直接書く**（`prisma init` は使わなくてよい。雛形は「2.1」のとおり）：
   - `prisma/schema.prisma`（datasource に `url` を書かない）
   - `prisma.config.ts`（DATABASE_URL は process.env から、seed は `tsx prisma/seed.ts`）
   - `.env`（`DATABASE_URL="file:./prisma/dev.db"`）
   - `prisma/seed.ts`（シードデータ3件）

5. **マイグレ → 生成 → シード**（順序重要、ホスト側動作確認を兼ねる。ディレクトリマウント方式ならコンテナ起動時にも `migrate deploy` が走るので、最悪この手順を飛ばしても Docker 単独で動く）：
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate                       # 明示実行（必須）
   /opt/homebrew/bin/npx prisma db seed      # seed は常に絶対パス npx（rtk 回避を常時化）
   ```

6. **アプリコード作成**（順序は何でもよいが、すべて1回で書ききる）：
   - `lib/prisma.ts`、`lib/status.ts`
   - `app/actions.ts`（Server Actions）
   - `app/page.tsx`（Server Component） — **Prisma の `Date` 型はここで ISO 文字列に変換してから Client へ渡す**（6章「Server → Client 境界の注意」参照）
   - `app/components/{KanbanBoard,TodoCard,NewTodoModal}.tsx`
   - `app/layout.tsx`（lang="ja"、`bg-slate-50 text-slate-900` を body に明示）
   - `app/globals.css` から `@media (prefers-color-scheme: dark)` ブロックを **削除**（5章「配色」参照）

   > ⚠️ **`create-next-app` は `app/page.tsx`・`app/layout.tsx`・`app/globals.css` を既定で生成済み**。これらは「躊躇なく完全上書き」で良い。Write ツールで上書きする際は事前に Read が必要なため、Read→Write を一括で出すと時短になる。

7. **Docker 構成作成**：`Dockerfile`（`apk add python3 make g++ libc6-compat` を含む）、`docker-compose.yml`（`HOST_PORT` 環境変数化）、`.dockerignore`。

8. **起動確認**：
   ```bash
   HOST_PORT=${HOST_PORT:-3001} docker compose up -d --build
   curl -sS "http://localhost:${HOST_PORT:-3001}/"   # デフォルト 3001。3000 を使いたい時のみ HOST_PORT=3000 で
   ```

**各ステップで都度ターミナルへの出力を確認し、エラーが出たら次に進む前に解決すること。**

---

## 13. 既知のハマりどころ（過去デモからのフィードバック）

過去のリハーサル/本番デモで実際に詰まった項目。**実装前に必ず一読すること**。

| # | 症状 | 原因 | 対策 |
|---|---|---|---|
| 1 | `npm install` でビルドエラー（`node-gyp` failed） | `better-sqlite3` がネイティブビルドを要求 | Dockerfile に `apk add --no-cache python3 make g++ libc6-compat`（8章のとおり）。ホスト側は Xcode CLT 必要。 |
| 2 | `prisma migrate dev` が `Environment variable not found: DATABASE_URL` で失敗 | Prisma 7 では `schema.prisma` の datasource 内に `url` を書けず、`prisma.config.ts` 経由 | 「2.1」のとおり `.env` + `prisma.config.ts` を最初から書く |
| 3 | `lib/prisma.ts` で `PrismaClient is not a constructor` | `@prisma/client` から import している | 生成先 `@/generated/prisma/client` から import する（「2.1」のとおり） |
| 4 | コンテナ起動はするが 500 エラー、ログに `Error: Cannot find module '../generated/prisma/client'` | Dockerfile で `npx prisma generate` を忘れている、または `.dockerignore` で `generated` を除外している | Dockerfile に `RUN npx prisma generate` を入れ、`.dockerignore` の `generated` 除外は **ビルド時生成するので残してOK**（ただし手元で生成済みのものを COPY したい場合は外す） |
| 5 | カードに渡した `dueDate` で型エラー or 1日ズレ | Server→Client 境界で `Date` 型を渡している/タイムゾーン未指定 | 6章「Server → Client 境界の注意」「9章 タイムゾーン対策」のとおり ISO 文字列で渡す |
| 6 | OS のダークモード設定でモーダル文字が見えない | デフォルトの `@media (prefers-color-scheme: dark)` が残っている | 5章「配色」のとおり `app/globals.css` から該当ブロックを削除し、`bg-white text-slate-900` を明示 |
| 7 | `rtk npx prisma db seed` が `No such file or directory` | rtk プロキシ環境特有 | `/opt/homebrew/bin/npx prisma db seed` を直接叩く（「2.1」末尾の注意参照） |
| 8 | `docker compose up` がポート競合で失敗 | 他コンテナが 3000 を占有 | `HOST_PORT=3001 docker compose up`（8章のとおり） |
| 9 | `volumes: ./prisma/dev.db:/app/prisma/dev.db` がディレクトリとして作られる | マウント元のホスト側ファイルが未作成 | ホスト側で先に `prisma migrate dev` を流して `dev.db` を作成、または `./prisma:/app/prisma` のディレクトリマウントに変更（8章参照） |

---

## 14. 完走時間の目安

リハーサル実績：**初回 約 10 分（5〜10分上限ぎりぎり）**。
内訳の大きいもの：

- `create-next-app` + 依存 install：〜25秒
- Prisma 7 + better-sqlite3 install（ネイティブビルド）：〜35秒
- Docker ビルド（コンテナ内で再度ネイティブビルド）：**60〜90秒（最大の支配項）**
- ファイル書き出し（layout/page/components/actions/lib/seed/config）：**ツール呼び出し回数に比例**

**時短のコツ**：

- アプリコードは **1回のメッセージで複数の `Write` を並列実行** すると、I/O 待ちを束ねられる
- Prisma の `migrate dev` → `generate` → `db seed` は依存があるので逐次でOK
- Docker ビルドはキャッシュが効くので 2 回目以降は劇的に速い（〜30秒）。デモ前に 1 度 `docker compose build` だけ流しておくと本番で更に短縮できる
