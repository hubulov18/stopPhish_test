import type { Note, NoteDraft } from "../types/note";
import { request } from "./http";

export const fetchNotes = (accessToken: string, query?: string, categoryId?: number | null) => {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  if (typeof categoryId === "number") {
    params.set("categoryId", String(categoryId));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return request<Note[]>(`/notes${suffix}`, {}, accessToken);
};

export const fetchNote = (accessToken: string, id: number) => request<Note>(`/notes/${id}`, {}, accessToken);

export const createNote = (accessToken: string, payload: NoteDraft) =>
  request<Note>(
    "/notes",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );

export const updateNote = (accessToken: string, id: number, payload: Partial<NoteDraft>) =>
  request<Note>(
    `/notes/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    accessToken
  );

export const deleteNote = (accessToken: string, id: number) =>
  request<{ id: number; deleted: boolean }>(
    `/notes/${id}`,
    {
      method: "DELETE"
    },
    accessToken
  );
