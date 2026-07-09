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
}

export interface HatsConfig {
  version: number;
  profiles: Record<string, Profile>;
}

export function hatsHome(): string {
  return process.env.HATS_HOME || join(homedir(), ".config", "hats");
}

export function configPath(): string {
  return join(hatsHome(), "config.toml");
}

export function defaultConfig(): HatsConfig {
  return { version: 1, profiles: {} };
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
    profiles,
  };
}

export function saveConfig(cfg: HatsConfig): void {
  mkdirSync(hatsHome(), { recursive: true });
  const out: Record<string, unknown> = {
    version: cfg.version,
    profiles: {} as Record<string, unknown>,
  };
  for (const [name, p] of Object.entries(cfg.profiles)) {
    const { name: _omit, ...rest } = p;
    void _omit;
    (out.profiles as Record<string, unknown>)[name] = rest;
  }
  writeFileSync(configPath(), stringify(out));
}