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

### `.gitignore` 追記
```
/generated
/prisma/dev.db
/prisma/dev.db-journal
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
- **ポート公開は `${HOST_PORT:-3000}:3000` の形にする**（他プロジェクトのコンテナが 3000 を使っている場合、`HOST_PORT=3001 docker compose up` で回避できるようにするため）

### `.dockerignore`
最低限：`node_modules`, `.next`, `.git`, `generated`, `README.md`, `HOW.md`, `SPEC.md`

### 起動コマンド（デモのゴール）
```bash
docker compose up
```
ブラウザで `http://localhost:3000` を開くとカンバンが表示され、シードデータ3件が見える。
ポート競合時は `HOST_PORT=3001 docker compose up` で `http://localhost:3001`。

---

## 9. シードデータ（`prisma/seed.ts`）

3件、各ステータスに1件ずつ。例：

| 件名 | 担当者 | 期日 | ステータス |
|---|---|---|---|
| 設計レビューの実施 | 田中 | 2026-05-20 | 未着手 |
| 構築手順書のドラフト作成 | 佐藤 | 2026-05-15 | 進行中 |
| キックオフMTGの議事録 | 鈴木 | 2026-05-08 | 完了 |

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

5. **マイグレ → 生成 → シード**（順序重要）：
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate          # 明示実行（必須）
   npx prisma db seed
   ```

6. **アプリコード作成**（順序は何でもよいが、すべて1回で書ききる）：
   - `lib/prisma.ts`、`lib/status.ts`
   - `app/actions.ts`（Server Actions）
   - `app/page.tsx`（Server Component）
   - `app/components/{KanbanBoard,TodoCard,NewTodoModal}.tsx`
   - `app/layout.tsx`（lang="ja"、`bg-slate-50 text-slate-900` を body に明示）
   - `app/globals.css` から `@media (prefers-color-scheme: dark)` ブロックを **削除**（5章「配色」参照）

7. **Docker 構成作成**：`Dockerfile`（`apk add python3 make g++ libc6-compat` を含む）、`docker-compose.yml`（`HOST_PORT` 環境変数化）、`.dockerignore`。

8. **起動確認**：
   ```bash
   docker compose up -d --build
   curl -sS http://localhost:3000/   # ポート競合時は HOST_PORT=3001 で起動して 3001 を叩く
   ```

**各ステップで都度ターミナルへの出力を確認し、エラーが出たら次に進む前に解決すること。**
