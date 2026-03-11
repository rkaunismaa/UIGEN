import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getFilename(path: string): string {
  return path.split("/").pop() || path;
}

export function getToolDescription(
  toolName: string,
  args: Record<string, string>,
  isCompleted: boolean
): string {
  if (toolName === "str_replace_editor") {
    const file = getFilename(args.path || "");
    switch (args.command) {
      case "create":
        return isCompleted ? `Created ${file}` : `Creating ${file}`;
      case "str_replace":
      case "insert":
        return isCompleted ? `Edited ${file}` : `Editing ${file}`;
      case "view":
        return isCompleted ? `Read ${file}` : `Reading ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const file = getFilename(args.path || "");
    switch (args.command) {
      case "rename": {
        const newFile = getFilename(args.new_path || "");
        return isCompleted
          ? `Renamed ${file} → ${newFile}`
          : `Renaming ${file} → ${newFile}`;
      }
      case "delete":
        return isCompleted ? `Deleted ${file}` : `Deleting ${file}`;
    }
  }

  return toolName;
}

interface ToolStatusProps {
  toolInvocation: ToolInvocation;
}

export function ToolStatus({ toolInvocation }: ToolStatusProps) {
  const isCompleted =
    toolInvocation.state === "result" && !!toolInvocation.result;
  const description = getToolDescription(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, string>,
    isCompleted
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{description}</span>
    </div>
  );
}
