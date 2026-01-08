import { $ } from "bun";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function runCommand(
  cmd: string[],
  options: {
    timeout?: number;
    cwd?: string;
    shell?: boolean;
  } = {}
): Promise<CommandResult> {
  const { timeout = 60000, cwd } = options;

  try {
    // On Windows, run through cmd.exe to properly resolve WindowsApps aliases
    const isWindows = process.platform === "win32";
    const spawnArgs = isWindows
      ? ["cmd.exe", "/c", ...cmd]
      : cmd;

    const proc = Bun.spawn(spawnArgs, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });

    const resultPromise = (async () => {
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        success: exitCode === 0,
      };
    })();

    return await Promise.race([resultPromise, timeoutPromise]);
  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      success: false,
    };
  }
}

export async function runPowerShell(
  script: string,
  options: { timeout?: number } = {}
): Promise<CommandResult> {
  return runCommand(["pwsh", "-NoProfile", "-NonInteractive", "-Command", script], options);
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await runCommand(["where", command], { timeout: 5000 });
    return result.success;
  } catch {
    return false;
  }
}

export function parseTableOutput(
  output: string,
  options: {
    separator?: RegExp;
    headerLine?: number;
    skipLines?: number;
  } = {}
): Record<string, string>[] {
  const { separator = /\s{2,}/, headerLine = 0, skipLines = 0 } = options;

  const lines = output.split("\n").filter((line) => line.trim());

  if (lines.length <= headerLine + skipLines) {
    return [];
  }

  // Find header positions by looking for column names
  const headerText = lines[headerLine];
  const headers: string[] = [];
  const positions: number[] = [];

  // Split header by multiple spaces
  const headerParts = headerText.split(separator);
  let currentPos = 0;

  for (const part of headerParts) {
    if (part.trim()) {
      headers.push(part.trim().toLowerCase().replace(/\s+/g, "_"));
      positions.push(headerText.indexOf(part, currentPos));
      currentPos = headerText.indexOf(part, currentPos) + part.length;
    }
  }

  // Parse data lines
  const results: Record<string, string>[] = [];
  const dataLines = lines.slice(headerLine + 1 + skipLines);

  for (const line of dataLines) {
    if (line.trim().startsWith("-") || !line.trim()) continue;

    const row: Record<string, string> = {};

    for (let i = 0; i < headers.length; i++) {
      const start = positions[i];
      const end = positions[i + 1] ?? line.length;
      row[headers[i]] = line.substring(start, end).trim();
    }

    if (Object.values(row).some((v) => v)) {
      results.push(row);
    }
  }

  return results;
}
