"use client";

import { useTransition } from "react";
import { deleteTodo, updateStatus } from "../actions";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/status";
import type { TodoView } from "./KanbanBoard";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function TodoCard({ todo }: { todo: TodoView }) {
  const [pending, start] = useTransition();
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm text-slate-900">
      <div className="font-bold mb-1">{todo.title}</div>
      <div className="text-xs text-slate-600 mb-1">担当: {todo.assignee}</div>
      {todo.dueDate && (
        <div className="text-xs text-slate-600 mb-1">期日: {formatDate(todo.dueDate)}</div>
      )}
      <p className="text-sm text-slate-700 mb-2 line-clamp-2">{todo.content}</p>
      <div className="flex items-center justify-between gap-2">
        <select
          value={todo.status}
          disabled={pending}
          onChange={(e) =>
            start(() => updateStatus(todo.id, e.target.value as Status))
          }
          className="bg-white border border-slate-300 rounded text-sm px-2 py-1 text-slate-900"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => deleteTodo(todo.id))}
          className="text-red-600 hover:text-red-800 text-lg"
          aria-label="削除"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
