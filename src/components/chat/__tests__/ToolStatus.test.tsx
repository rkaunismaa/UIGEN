import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolStatus, getToolDescription } from "../ToolStatus";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// getToolDescription unit tests

test("str_replace_editor create in-progress", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "create", path: "src/Card.tsx" }, false)
  ).toBe("Creating Card.tsx");
});

test("str_replace_editor create completed", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "create", path: "src/Card.tsx" }, true)
  ).toBe("Created Card.tsx");
});

test("str_replace_editor str_replace in-progress", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "str_replace", path: "src/Button.tsx" }, false)
  ).toBe("Editing Button.tsx");
});

test("str_replace_editor str_replace completed", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "str_replace", path: "src/Button.tsx" }, true)
  ).toBe("Edited Button.tsx");
});

test("str_replace_editor insert in-progress", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "insert", path: "src/App.tsx" }, false)
  ).toBe("Editing App.tsx");
});

test("str_replace_editor insert completed", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "insert", path: "src/App.tsx" }, true)
  ).toBe("Edited App.tsx");
});

test("str_replace_editor view in-progress", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "view", path: "src/App.tsx" }, false)
  ).toBe("Reading App.tsx");
});

test("str_replace_editor view completed", () => {
  expect(
    getToolDescription("str_replace_editor", { command: "view", path: "src/App.tsx" }, true)
  ).toBe("Read App.tsx");
});

test("file_manager rename in-progress", () => {
  expect(
    getToolDescription("file_manager", { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" }, false)
  ).toBe("Renaming Old.tsx → New.tsx");
});

test("file_manager rename completed", () => {
  expect(
    getToolDescription("file_manager", { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" }, true)
  ).toBe("Renamed Old.tsx → New.tsx");
});

test("file_manager delete in-progress", () => {
  expect(
    getToolDescription("file_manager", { command: "delete", path: "src/Trash.tsx" }, false)
  ).toBe("Deleting Trash.tsx");
});

test("file_manager delete completed", () => {
  expect(
    getToolDescription("file_manager", { command: "delete", path: "src/Trash.tsx" }, true)
  ).toBe("Deleted Trash.tsx");
});

test("unknown tool returns tool name", () => {
  expect(getToolDescription("some_tool", {}, false)).toBe("some_tool");
  expect(getToolDescription("some_tool", {}, true)).toBe("some_tool");
});

// ToolStatus component tests

test("ToolStatus renders spinner for in-progress tool", () => {
  const toolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/Card.tsx" },
    state: "call",
  } as ToolInvocation;

  const { container } = render(<ToolStatus toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolStatus renders green dot for completed tool", () => {
  const toolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/Card.tsx" },
    state: "result",
    result: "Success",
  } as ToolInvocation;

  const { container } = render(<ToolStatus toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created Card.tsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
