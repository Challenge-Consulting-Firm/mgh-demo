"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Status } from "@/lib/status";

export async function createTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const assignee = String(formData.get("assignee") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = (String(formData.get("status") ?? "TODO") as Status);

  if (!title || !assignee || !content) {
    return;
  }

  try {
    await prisma.todo.create({
      data: {
        title,
        assignee,
        content,
        status,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      },
    });
    revalidatePath("/");
  } catch (e) {
    console.error(e);
  }
}

export async function updateTodoStatus(id: string, status: Status) {
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
