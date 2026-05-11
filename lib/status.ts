export type Status = "TODO" | "IN_PROGRESS" | "DONE";

export const STATUSES: Status[] = ["TODO", "IN_PROGRESS", "DONE"];

export const STATUS_LABELS: Record<Status, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
};

export const STATUS_COLUMN_CLASSES: Record<Status, string> = {
  TODO: "bg-slate-100",
  IN_PROGRESS: "bg-amber-50",
  DONE: "bg-emerald-50",
};
