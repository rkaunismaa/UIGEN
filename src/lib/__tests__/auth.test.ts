// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

async function createValidToken(userId: string, email: string) {
  return new SignJWT({
    userId,
    email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

test("createSession sets an httpOnly cookie with JWT token", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");

  // Verify the token contains the correct payload
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("createSession sets cookie expiration to 7 days", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();

  await createSession("user-123", "test@example.com");

  const options = mockCookieStore.set.mock.calls[0][2];
  const expires = new Date(options.expires).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  expect(expires).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expires).toBeLessThanOrEqual(Date.now() + sevenDays + 1000);
});

test("getSession returns payload for valid token", async () => {
  const { getSession } = await import("@/lib/auth");
  const token = await createValidToken("user-456", "valid@example.com");
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-456");
  expect(session!.email).toBe("valid@example.com");
});

test("getSession returns null when no cookie exists", async () => {
  const { getSession } = await import("@/lib/auth");
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for invalid token", async () => {
  const { getSession } = await import("@/lib/auth");
  mockCookieStore.get.mockReturnValue({ value: "invalid-token" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  const { deleteSession } = await import("@/lib/auth");

  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns payload for valid token in request", async () => {
  const { verifySession } = await import("@/lib/auth");
  const token = await createValidToken("user-789", "req@example.com");
  const mockRequest = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-789");
  expect(session!.email).toBe("req@example.com");
});

test("verifySession returns null when no cookie in request", async () => {
  const { verifySession } = await import("@/lib/auth");
  const mockRequest = {
    cookies: { get: vi.fn().mockReturnValue(undefined) },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).toBeNull();
});

test("verifySession returns null for invalid token in request", async () => {
  const { verifySession } = await import("@/lib/auth");
  const mockRequest = {
    cookies: { get: vi.fn().mockReturnValue({ value: "bad-token" }) },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).toBeNull();
});
