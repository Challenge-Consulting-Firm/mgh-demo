"use client";

import { useTransition } from "react";
import { deleteTodo, updateTodoStatus } from "@/app/actions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import type { TodoItem } from "./KanbanBoard";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TodoCard({ todo }: { todo: TodoItem }) {
  const [pending, startTransition] = useTransition();

  return (
    <article className="bg-white text-slate-900 rounded-md p-3 shadow-sm border border-slate-200 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug">{todo.title}</h3>
        <button
          type="button"
          aria-label="削除"
          disabled={pending}
          onClick={() => {
            if (!confirm("削除しますか？")) return;
            startTransition(() => {
              deleteTodo(todo.id);
            });
          }}
          className="text-slate-400 hover:text-red-600 text-base leading-none disabled:opacity-40"
        >
          🗑
        </button>
      </div>

      <dl className="text-xs text-slate-700 space-y-0.5">
        <div className="flex gap-1">
          <dt className="text-slate-500">担当:</dt>
          <dd>{todo.assignee}</dd>
        </div>
        {todo.dueDate && (
          <div className="flex gap-1">
            <dt className="text-slate-500">期日:</dt>
            <dd>{formatDate(todo.dueDate)}</dd>
          </div>
        )}
      </dl>

      <p
        className="text-xs text-slate-700 overflow-hidden"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {todo.content}
      </p>

      <select
        value={todo.status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Status;
          startTransition(() => {
            updateTodoStatus(todo.id, next);
          });
        }}
        className="bg-white text-slate-900 border border-slate-300 rounded text-xs px-2 py-1 mt-1"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </article>
  );
}
