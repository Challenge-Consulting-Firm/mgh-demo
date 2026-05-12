import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.todo.deleteMany();
  await prisma.todo.createMany({
    data: [
      {
        title: "設計レビューの実施",
        assignee: "田中",
        dueDate: new Date("2026-05-20T00:00:00Z"),
        content: "アーキテクチャ図とデータモデルのレビュー会を開催する。",
        status: "TODO",
      },
      {
        title: "構築手順書のドラフト作成",
        assignee: "佐藤",
        dueDate: new Date("2026-05-15T00:00:00Z"),
        content: "Docker構成と起動手順を含む手順書のドラフトを作成。",
        status: "IN_PROGRESS",
      },
      {
        title: "キックオフMTGの議事録",
        assignee: "鈴木",
        dueDate: new Date("2026-05-08T00:00:00Z"),
        content: "キックオフミーティングの議事録を作成し、関係者に共有。",
        status: "DONE",
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
