import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/app/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized = todos.map((t) => ({
    id: t.id,
    title: t.title,
    assignee: t.assignee,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    content: t.content,
    status: t.status as "TODO" | "IN_PROGRESS" | "DONE",
  }));

  return (
    <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
      <KanbanBoard todos={serialized} />
    </main>
  );
}
