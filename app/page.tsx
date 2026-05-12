import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "./components/KanbanBoard";
import type { Status } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await prisma.todo.findMany({ orderBy: { createdAt: "asc" } });
  const serialized = todos.map((t) => ({
    id: t.id,
    title: t.title,
    assignee: t.assignee,
    content: t.content,
    status: t.status as Status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  }));
  return <KanbanBoard todos={serialized} />;
}
