import { describe, expect, it, vi } from "vitest";
import ApiService from "../../services/api.service";

type Authorize = (
  this: { broker: { call: (name: string, payload: unknown) => Promise<unknown> } },
  ctx: { meta: Record<string, unknown> },
  route: unknown,
  req: { method: string; url: string; headers: Record<string, string | undefined> }
) => Promise<unknown>;

const authorize = (ApiService as unknown as { methods: { authorize: Authorize } }).methods.authorize;

const ctxFactory = () => ({ meta: {} as Record<string, unknown> });

const reqFactory = (
  method: string,
  url: string,
  authorization?: string
): { method: string; url: string; headers: Record<string, string | undefined> } => ({
  method,
  url,
  headers: {
    authorization
  }
});

describe("api.authorize", () => {
  it("allows public endpoint without token", async () => {
    const ctx = ctxFactory();
    const brokerCall = vi.fn();

    const result = await authorize.call(
      { broker: { call: brokerCall } },
      ctx,
      null,
      reqFactory("POST", "/api/auth/login")
    );

    expect(result).toBeNull();
    expect(brokerCall).not.toHaveBeenCalled();
    expect(ctx.meta.user).toBeUndefined();
  });

  it("rejects protected endpoint without token", async () => {
    const ctx = ctxFactory();

    await expect(
      authorize.call(
        { broker: { call: vi.fn() } },
        ctx,
        null,
        reqFactory("GET", "/api/notes")
      )
    ).rejects.toMatchObject({
      code: 401,
      type: "NO_TOKEN"
    });
  });

  it("attaches user for valid token", async () => {
    const ctx = ctxFactory();
    const user = {
      id: 7,
      email: "auth@example.com",
      name: "Auth User"
    };

    const brokerCall = vi.fn().mockResolvedValue(user);

    const result = await authorize.call(
      { broker: { call: brokerCall } },
      ctx,
      null,
      reqFactory("GET", "/api/notes", "Bearer good-token")
    );

    expect(brokerCall).toHaveBeenCalledWith("auth.verifyToken", { token: "good-token" });
    expect(ctx.meta.user).toEqual(user);
    expect(result).toEqual(user);
  });

  it("rejects invalid token", async () => {
    const ctx = ctxFactory();
    const brokerCall = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      authorize.call(
        { broker: { call: brokerCall } },
        ctx,
        null,
        reqFactory("GET", "/api/notes", "Bearer bad-token")
      )
    ).rejects.toMatchObject({
      code: 401,
      type: "INVALID_TOKEN"
    });
  });
});
