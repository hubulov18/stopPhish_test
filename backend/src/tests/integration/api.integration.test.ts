import { afterAll, beforeAll, describe, expect, it } from "vitest";

let broker: any;
let baseUrl = "";
let accessToken = "";
let categoryId = 0;
let noteId = 0;

const apiCall = async (
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<{ status: number; body: unknown }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body
  };
};

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  process.env.PORT = process.env.PORT ?? "3310";
  process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
  process.env.DB_PORT = process.env.DB_PORT ?? "5432";
  process.env.DB_USERNAME = process.env.DB_USERNAME ?? "notes_user";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "notes_password";
  process.env.DB_NAME = process.env.DB_NAME ?? "notes_db";
  process.env.DB_LOGGING = process.env.DB_LOGGING ?? "false";
  process.env.SEED_ON_START = "false";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-secret";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "2h";

  const moleculerModule = await import("moleculer");
  const { default: ApiService } = await import("../../services/api.service");
  const { default: NotesService } = await import("../../services/notes.service");
  const { default: SystemService } = await import("../../services/system.service");
  const { default: UsersService } = await import("../../services/users.service");
  const { default: AuthService } = await import("../../services/auth.service");
  const { default: CategoriesService } = await import("../../services/categories.service");

  broker = new moleculerModule.ServiceBroker({
    logger: false,
    logLevel: "error"
  });

  broker.createService(SystemService);
  broker.createService(UsersService);
  broker.createService(AuthService);
  broker.createService(CategoriesService);
  broker.createService(NotesService);
  broker.createService(ApiService);

  await broker.start();
  baseUrl = `http://127.0.0.1:${process.env.PORT}/api`;
});

afterAll(async () => {
  if (broker) {
    await broker.stop();
  }
});

describe("API integration", () => {
  const email = `test-${Date.now()}@notes.local`;

  it("returns 401 for protected endpoint without token", async () => {
    const response = await apiCall("/notes");
    expect(response.status).toBe(401);
  });

  it("registers user and returns JWT", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Integration User",
        password: "strongpass123"
      })
    });

    expect(response.status).toBe(200);
    const payload = response.body as { accessToken: string; user: { id: number; email: string } };
    expect(payload.accessToken).toBeTruthy();
    expect(payload.user.email).toBe(email);
    accessToken = payload.accessToken;
  });

  it("logs in and creates category", async () => {
    const login = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "strongpass123"
      })
    });

    expect(login.status).toBe(200);
    const loginPayload = login.body as { accessToken: string };
    accessToken = loginPayload.accessToken;

    const category = await apiCall(
      "/categories",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Integration",
          color: "#336699"
        })
      },
      accessToken
    );

    expect(category.status).toBe(200);
    const categoryPayload = category.body as { id: number; name: string };
    expect(categoryPayload.name).toBe("Integration");
    categoryId = categoryPayload.id;
  });

  it("creates note, searches via FTS and updates", async () => {
    const created = await apiCall(
      "/notes",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Release Checklist",
          content: "Smoke test, rollback plan and migration verification",
          categoryId
        })
      },
      accessToken
    );

    expect(created.status).toBe(200);
    const createdPayload = created.body as { id: number; category: { id: number } };
    expect(createdPayload.category.id).toBe(categoryId);
    noteId = createdPayload.id;

    const search = await apiCall(`/notes?q=${encodeURIComponent("rollback plan")}`, {}, accessToken);
    expect(search.status).toBe(200);
    const searchItems = search.body as Array<{ id: number }>;
    expect(searchItems.some((item) => item.id === noteId)).toBe(true);

    const updated = await apiCall(
      `/notes/${noteId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: "Release Checklist v2",
          categoryId: null
        })
      },
      accessToken
    );

    expect(updated.status).toBe(200);
    const updatedPayload = updated.body as { title: string; category: null | { id: number } };
    expect(updatedPayload.title).toBe("Release Checklist v2");
    expect(updatedPayload.category).toBeNull();
  });

  it("deletes note", async () => {
    const deleted = await apiCall(`/notes/${noteId}`, { method: "DELETE" }, accessToken);
    expect(deleted.status).toBe(200);
    expect((deleted.body as { deleted: boolean }).deleted).toBe(true);
  });
});
