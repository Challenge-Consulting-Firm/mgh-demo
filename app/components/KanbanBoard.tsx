"use client";

import { useState } from "react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/status";
import { TodoCard } from "./TodoCard";
import { NewTodoModal } from "./NewTodoModal";

export type TodoView = {
  id: string;
  title: string;
  assignee: string;
  content: string;
  status: Status;
  dueDate: string | null;
};

export function KanbanBoard({ todos }: { todos: TodoView[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">TODOカンバン</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          ＋ 新規TODO
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-white rounded-lg p-3 border border-slate-200">
            <h2 className="text-sm font-semibold mb-3 text-slate-700">
              {STATUS_LABEL[s]} ({todos.filter((t) => t.status === s).length})
            </h2>
            <div className="flex flex-col gap-3">
              {todos
                .filter((t) => t.status === s)
                .map((t) => (
                  <TodoCard key={t.id} todo={t} />
                ))}
            </div>
          </div>
        ))}
      </div>
      {open && <NewTodoModal onClose={() => setOpen(false)} />}
    </div>
  );
}
