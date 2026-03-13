import type { User } from "../types/note";
import { request } from "./http";

export type AuthPayload = {
  accessToken: string;
  user: User;
};

export const registerUser = (payload: { email: string; name: string; password: string }) =>
  request<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const loginUser = (payload: { email: string; password: string }) =>
  request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const fetchMe = (accessToken: string) => request<User>("/auth/me", {}, accessToken);
