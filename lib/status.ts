export type Status = "TODO" | "IN_PROGRESS" | "DONE";

export const STATUS_LABEL: Record<Status, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
};

export const STATUS_ORDER: Status[] = ["TODO", "IN_PROGRESS", "DONE"];
