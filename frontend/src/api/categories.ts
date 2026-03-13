import type { Category } from "../types/note";
import { request } from "./http";

export const fetchCategories = (accessToken: string) => request<Category[]>("/categories", {}, accessToken);

export const createCategory = (
  accessToken: string,
  payload: {
    name: string;
    color?: string;
  }
) =>
  request<Category>(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );

export const deleteCategory = (accessToken: string, id: number) =>
  request<{ id: number; deleted: boolean }>(
    `/categories/${id}`,
    {
      method: "DELETE"
    },
    accessToken
  );
