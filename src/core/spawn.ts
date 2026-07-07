import { spawn } from "node:child_process";
import { parse as parseShell } from "shell-quote";

/** Parse a launch string into argv, rejecting shell operators (no `&&`/`;`/`|`). */
export function parseLaunch(s: string): string[] {
  const tokens = parseShell(s);
  const args: string[] = [];
  for (const t of tokens) {
    if (typeof t === "string") {
      args.push(t);
    } else if (typeof t === "object" && "op" in t) {
      throw new Error(
        `launch contains shell operator "${(t as { op: string }).op}" — hats runs the command directly, no shell`,
      );
    }
  }
  if (args.length === 0) throw new Error("launch command is empty");
  return args;
}

/** Spawn a child with inherited stdio, forward signals, resolve with exit code. */
export function runChild(
  argv: string[],
  opts: { env: Record<string, string>; cwd?: string },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      env: opts.env,
      cwd: opts.cwd,
      stdio: "inherit",
      shell: false,
    });

    const onSig = (sig: NodeJS.Signals) => {
      if (!child.killed) child.kill(sig);
    };
    const onInt = () => onSig("SIGINT");
    const onTerm = () => onSig("SIGTERM");

    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);

    child.on("error", (err) => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
      reject(err);
    });
    child.on("exit", (code, signal) => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
      if (code !== null) resolve(code);
      else if (signal) resolve(128 + signalNumber(signal));
      else resolve(1);
    });
  });
}

function signalNumber(sig: string): number {
  const map: Record<string, number> = {
    SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGILL: 4, SIGTRAP: 5, SIGABRT: 6,
    SIGKILL: 9, SIGSEGV: 11, SIGTERM: 15,
  };
  return map[sig] ?? 0;
}