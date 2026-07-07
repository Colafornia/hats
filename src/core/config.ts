import { parse, stringify } from "smol-toml";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Profile {
  name: string;
  desc?: string;
  env_file?: string | string[];
  env?: Record<string, string>;
  launch?: string;
  kind?: "cli" | "gui";
  cwd?: string;
  inherit_env?: boolean;
}

export interface Settings {
  inherit_env?: boolean;
}

export interface HatsConfig {
  version: number;
  settings: Settings;
  profiles: Record<string, Profile>;
}

export function hatsHome(): string {
  return process.env.HATS_HOME || join(homedir(), ".config", "hats");
}

export function configPath(): string {
  return join(hatsHome(), "config.toml");
}

export function defaultConfig(): HatsConfig {
  return { version: 1, settings: { inherit_env: true }, profiles: {} };
}

export function loadConfig(): HatsConfig {
  const p = configPath();
  if (!existsSync(p)) return defaultConfig();
  const raw = parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  const profiles: Record<string, Profile> = {};
  const pr = (raw.profiles ?? {}) as Record<string, object>;
  for (const [name, v] of Object.entries(pr)) {
    profiles[name] = { name, ...(v as Partial<Profile>) };
  }
  return {
    version: (raw.version as number) ?? 1,
    settings: (raw.settings as Settings) ?? {},
    profiles,
  };
}

export function saveConfig(cfg: HatsConfig): void {
  mkdirSync(hatsHome(), { recursive: true });
  const out: Record<string, unknown> = {
    version: cfg.version,
    settings: cfg.settings,
    profiles: {} as Record<string, unknown>,
  };
  for (const [name, p] of Object.entries(cfg.profiles)) {
    const { name: _omit, ...rest } = p;
    void _omit;
    (out.profiles as Record<string, unknown>)[name] = rest;
  }
  writeFileSync(configPath(), stringify(out));
}