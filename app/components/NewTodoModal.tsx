"use client";

import { useTransition } from "react";
import { createTodo } from "@/app/actions";
import { STATUSES, STATUS_LABELS } from "@/lib/status";

export function NewTodoModal({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTodo(formData);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 rounded-lg p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">新規TODO</h2>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">
              件名 <span className="text-red-600">*</span>
            </span>
            <input
              name="title"
              required
              className="bg-white text-slate-900 border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">
              担当者 <span className="text-red-600">*</span>
            </span>
            <input
              name="assignee"
              required
              className="bg-white text-slate-900 border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">期日</span>
            <input
              type="date"
              name="dueDate"
              className="bg-white text-slate-900 border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">
              具体的な内容 <span className="text-red-600">*</span>
            </span>
            <textarea
              name="content"
              required
              rows={4}
              className="bg-white text-slate-900 border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">ステータス</span>
            <select
              name="status"
              defaultValue="TODO"
              className="bg-white text-slate-900 border border-slate-300 rounded px-2 py-1.5"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
