import { createHash } from "node:crypto";
import { basename } from "node:path";

const PROVIDER_ENV = [
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_VERTEX_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
];

function hasProviderOverride(argv: string[]): boolean {
  for (let i = 1; i < argv.length && argv[i] !== "--"; i++) {
    const arg = argv[i];
    if (arg === "-p" || arg === "--profile" || arg.startsWith("-p=") || arg.startsWith("--profile=")) return true;
    const config =
      arg === "-c" || arg === "--config"
        ? argv[++i]
        : arg.startsWith("-c=") || arg.startsWith("--config=")
          ? arg.slice(arg.indexOf("=") + 1)
          : undefined;
    if (config && /^\s*(model_provider|profile)\s*=/.test(config)) return true;
  }
  return false;
}

/** Inject a process-local provider only when this Hat owns enough Codex provider data. */
export function adaptCodex(profileName: string, argv: string[], env: Record<string, string>): string[] {
  if (basename(argv[0]) !== "codex" || hasProviderOverride(argv)) return argv;
  if (!PROVIDER_ENV.some((key) => env[key] !== undefined)) return argv;

  const missing = ["OPENAI_BASE_URL", "OPENAI_API_KEY"].filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Codex provider for hat "${profileName}" is incomplete; missing ${missing.join(", ")}`);
  }
  try {
    const url = new URL(env.OPENAI_BASE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`Codex provider for hat "${profileName}" has invalid OPENAI_BASE_URL`);
  }

  const id = `hats-${createHash("sha256").update(profileName).digest("hex")}`;
  const injected = [
    "-c",
    `model_provider=${JSON.stringify(id)}`,
    "-c",
    `model_providers.${id}.name="Hats"`,
    "-c",
    `model_providers.${id}.base_url=${JSON.stringify(env.OPENAI_BASE_URL)}`,
    "-c",
    `model_providers.${id}.env_key="OPENAI_API_KEY"`,
  ];
  return [argv[0], ...injected, ...argv.slice(1)];
}
