"use client";

import { useState } from "react";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_COLUMN_CLASSES,
  type Status,
} from "@/lib/status";
import { TodoCard } from "./TodoCard";
import { NewTodoModal } from "./NewTodoModal";

export type TodoItem = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string | null;
  content: string;
  status: Status;
};

export function KanbanBoard({ todos }: { todos: TodoItem[] }) {
  const [open, setOpen] = useState(false);

  const grouped: Record<Status, TodoItem[]> = {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
  for (const t of todos) {
    grouped[t.status].push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">TODOカンバン</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          ＋ 新規TODO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <section
            key={status}
            className={`${STATUS_COLUMN_CLASSES[status]} rounded-lg p-4 min-h-[400px] border border-slate-200`}
          >
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">
                {STATUS_LABELS[status]}
              </h2>
              <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {grouped[status].length}
              </span>
            </header>
            <div className="flex flex-col gap-3">
              {grouped[status].map((todo) => (
                <TodoCard key={todo.id} todo={todo} />
              ))}
              {grouped[status].length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">
                  （TODOなし）
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {open && <NewTodoModal onClose={() => setOpen(false)} />}
    </div>
  );
}
