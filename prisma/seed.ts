import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.todo.count();
  if (existing > 0) {
    console.log(`Skip seeding: ${existing} todos already exist`);
    return;
  }
  await prisma.todo.createMany({
    data: [
      {
        title: "設計レビューの実施",
        assignee: "田中",
        dueDate: new Date("2026-05-20"),
        content: "アーキテクチャ図とAPI仕様について関係者でレビューする。",
        status: "TODO",
      },
      {
        title: "構築手順書のドラフト作成",
        assignee: "佐藤",
        dueDate: new Date("2026-05-15"),
        content: "新環境のセットアップ手順を Markdown でドラフト化する。",
        status: "IN_PROGRESS",
      },
      {
        title: "キックオフMTGの議事録",
        assignee: "鈴木",
        dueDate: new Date("2026-05-08"),
        content: "キックオフでの決定事項とアクションアイテムを整理して共有する。",
        status: "DONE",
      },
    ],
  });
  console.log("Seeded 3 todos");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
