import { describe, expect, it, vi } from "vitest";

const loadAuthUtils = async () => {
  vi.resetModules();
  process.env.JWT_SECRET = "unit-test-secret";
  process.env.JWT_EXPIRES_IN = "1h";

  return import("../../utils/auth");
};

describe("auth utils", () => {
  it("hashes password and validates it", async () => {
    const { hashPassword, comparePassword } = await loadAuthUtils();

    const plain = "strong-password-123";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    await expect(comparePassword(plain, hash)).resolves.toBe(true);
    await expect(comparePassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("signs and verifies jwt token", async () => {
    const { signAccessToken, verifyAccessToken } = await loadAuthUtils();

    const token = signAccessToken({
      id: 42,
      email: "unit@example.com",
      name: "Unit User"
    });

    const payload = verifyAccessToken(token);

    expect(payload).toEqual({
      id: 42,
      email: "unit@example.com",
      name: "Unit User"
    });
  });

  it("throws on invalid token", async () => {
    const { verifyAccessToken } = await loadAuthUtils();

    expect(() => verifyAccessToken("definitely-invalid-token")).toThrow();
  });
});
