"use client";

import { useState, useTransition } from "react";
import { createTodo } from "../actions";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";

export function NewTodoModal({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const assignee = String(formData.get("assignee") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!title || !assignee || !content) {
      setError("件名・担当者・内容は必須です。");
      return;
    }
    setError("");
    start(async () => {
      await createTodo(formData);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">新規TODO</h2>
        <form action={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            件名<span className="text-red-600">*</span>
            <input
              name="title"
              type="text"
              required
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            担当者<span className="text-red-600">*</span>
            <input
              name="assignee"
              type="text"
              required
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            期日
            <input
              name="dueDate"
              type="date"
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            具体的な内容<span className="text-red-600">*</span>
            <textarea
              name="content"
              required
              rows={3}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            ステータス
            <select
              name="status"
              defaultValue="TODO"
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
