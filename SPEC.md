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
- Prisma: `^6.0.0`（最新stable）

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
├── package.json
├── tsconfig.json
├── next.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts              // サンプルデータ3〜5件
│   └── dev.db               // (gitignore)
├── lib/
│   ├── prisma.ts            // PrismaClient シングルトン
│   └── status.ts            // ステータスの日本語ラベル
├── app/
│   ├── layout.tsx
│   ├── page.tsx             // カンバンページ（Server Component）
│   ├── actions.ts           // Server Actions (create/update/delete)
│   └── components/
│       ├── KanbanBoard.tsx
│       ├── TodoCard.tsx     // Client Component
│       └── NewTodoModal.tsx // Client Component
```

---

## 8. Docker 構成

### `Dockerfile`
- ベース：`node:20-alpine`
- ワークディレクトリ：`/app`
- `npm install` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run dev`
- ポート：3000

### `docker-compose.yml`
- サービス：`web` のみ（DBは SQLite ファイルなので不要）
- ボリューム：`./prisma/dev.db` をホストにマウント（データ永続化）
- コマンド：起動時に `prisma migrate deploy` → `prisma db seed` → `next dev`

### 起動コマンド（デモのゴール）
```bash
docker compose up
```
ブラウザで `http://localhost:3000` を開くとカンバンが表示され、シードデータ3件が見える。

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

このSPEC.mdを読んだ後、以下の順で進めること：

1. `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*"` でひな型を作成
2. Prisma 導入：`npm i -D prisma` / `npm i @prisma/client` / `npx prisma init --datasource-provider sqlite`
3. `schema.prisma` を本SPECの内容で上書き → `npx prisma migrate dev --name init`
4. `lib/prisma.ts`、`lib/status.ts`、`prisma/seed.ts` を作成
5. `app/actions.ts` に Server Actions を実装
6. `app/page.tsx` と `app/components/*` を実装
7. `Dockerfile` と `docker-compose.yml` を作成
8. `docker compose up` で動作確認

**各ステップで都度ターミナルへの出力を確認し、エラーが出たら次に進む前に解決すること。**
