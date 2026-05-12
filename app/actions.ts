"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Status } from "@/lib/status";

export async function createTodo(formData: FormData) {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const assignee = String(formData.get("assignee") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const status = (String(formData.get("status") ?? "TODO") as Status) || "TODO";
    const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
    if (!title || !assignee || !content) return;
    await prisma.todo.create({
      data: {
        title,
        assignee,
        content,
        status,
        dueDate: dueDateRaw ? new Date(dueDateRaw + "T00:00:00Z") : null,
      },
    });
    revalidatePath("/");
  } catch (e) {
    console.error(e);
  }
}

export async function updateStatus(id: string, status: Status) {
  try {
    await prisma.todo.update({ where: { id }, data: { status } });
    revalidatePath("/");
  } catch (e) {
    console.error(e);
  }
}

export async function deleteTodo(id: string) {
  try {
    await prisma.todo.delete({ where: { id } });
    revalidatePath("/");
  } catch (e) {
    console.error(e);
  }
}
