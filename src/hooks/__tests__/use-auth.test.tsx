import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("returns signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());

  expect(result.current.signIn).toBeTypeOf("function");
  expect(result.current.signUp).toBeTypeOf("function");
  expect(result.current.isLoading).toBe(false);
});

// --- signIn ---

test("signIn returns the result from the signIn action", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let authResult: unknown;
  await act(async () => {
    authResult = await result.current.signIn("test@example.com", "password");
  });

  expect(authResult).toEqual({ success: false, error: "Invalid credentials" });
  expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password");
});

test("signIn sets isLoading during execution", async () => {
  let resolveSignIn: (value: unknown) => void;
  mockSignIn.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    })
  );

  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);

  let signInPromise: Promise<unknown>;
  act(() => {
    signInPromise = result.current.signIn("a@b.com", "pass");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn!({ success: false, error: "fail" });
    await signInPromise!;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading even when the action throws", async () => {
  mockSignIn.mockRejectedValue(new Error("network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await expect(result.current.signIn("a@b.com", "pass")).rejects.toThrow("network error");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn does not navigate when auth fails", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

test("signIn with anon work creates project from anon data and navigates", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": {} },
  });
  mockCreateProject.mockResolvedValue({ id: "proj-anon" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hello" }],
      data: { "/": {} },
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-anon");
  expect(mockGetProjects).not.toHaveBeenCalled();
});

test("signIn without anon work navigates to most recent project", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-1");
  expect(mockCreateProject).not.toHaveBeenCalled();
});

test("signIn creates new project when no anon work and no existing projects", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "proj-new" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [],
      data: {},
    })
  );
  expect(mockPush).toHaveBeenCalledWith("/proj-new");
});

test("signIn with anon work that has empty messages navigates to existing project", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-existing");
});

// --- signUp ---

test("signUp calls the signUp action with credentials", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

  const { result } = renderHook(() => useAuth());

  let authResult: unknown;
  await act(async () => {
    authResult = await result.current.signUp("new@example.com", "password123");
  });

  expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  expect(authResult).toEqual({ success: false, error: "Email taken" });
});

test("signUp navigates after successful registration", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "proj-signup" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-signup");
});

test("signUp does not navigate on failure", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "fail" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("a@b.com", "pass");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp resets isLoading even when the action throws", async () => {
  mockSignUp.mockRejectedValue(new Error("server error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await expect(result.current.signUp("a@b.com", "pass")).rejects.toThrow("server error");
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp with anon work saves it as a project", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "assistant", content: "component code" }],
    fileSystemData: { "/App.tsx": "export default () => <div/>" },
  });
  mockCreateProject.mockResolvedValue({ id: "proj-anon-signup" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "assistant", content: "component code" }],
      data: { "/App.tsx": "export default () => <div/>" },
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-anon-signup");
});
