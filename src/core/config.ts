import { parse, stringify } from "smol-toml";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { looksSecret, refKind } from "./resolve.js";

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

export class ConfigWriteError extends Error {}

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
    for (const key of Object.keys(v)) {
      if (!["desc", "env_file", "env", "launch"].includes(key)) {
        console.error(`warning: profiles.${name}.${key} is unknown and will be ignored`);
      }
    }
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
    warnPlaintextSecrets(p);
    const { name: _omit, ...rest } = p;
    void _omit;
    (out.profiles as Record<string, unknown>)[name] = rest;
  }
  atomicWrite(stringify(out), () => undefined);
}

function warnPlaintextSecrets(profile: Profile): void {
  for (const [key, value] of Object.entries(profile.env ?? {})) {
    if (looksSecret(key) && refKind(value) === "plain") {
      console.error(`warning: ${key} contains a plaintext secret; prefer cmd:op read ...`);
    }
  }
}

function tomlValue(value: unknown): string {
  return stringify({ value }).trim().slice("value = ".length);
}

function profileSection(profile: Profile): string {
  const lines = [`[profiles.${profile.name}]`];
  for (const key of ["desc", "env_file", "launch"] as const) {
    if (profile[key] !== undefined) lines.push(`${key} = ${tomlValue(profile[key])}`);
  }
  if (profile.env) {
    const entries = Object.entries(profile.env).map(([key, value]) => `${tomlValue(key)} = ${tomlValue(value)}`);
    lines.push(`env = { ${entries.join(", ")} }`);
  }
  return `${lines.join("\n")}\n`;
}

function sectionRange(raw: string, name: string): [number, number] {
  const lines = raw.split(/(?<=\n)/);
  const header = `[profiles.${name}]`;
  const start = lines.findIndex((line) => line.trim() === header);
  const ambiguous = lines.some((line) => line.trim().startsWith(`[profiles.${name}.`));
  if (start < 0 || ambiguous) {
    throw new ConfigWriteError(`cannot safely modify hat "${name}"; use hats edit`);
  }
  let end = start + 1;
  while (end < lines.length && !lines[end].trimStart().startsWith("[")) end++;
  while (end > start + 1 && /^(\s*|\s*#.*)$/.test(lines[end - 1].trimEnd())) end--;
  return [lines.slice(0, start).join("").length, lines.slice(0, end).join("").length];
}

function atomicWrite(candidate: string, assertCandidate: (raw: Record<string, unknown>) => void): void {
  mkdirSync(hatsHome(), { recursive: true });
  const path = configPath();
  const temp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, candidate);
    const parsed = parse(readFileSync(temp, "utf8")) as Record<string, unknown>;
    assertCandidate(parsed);
    if (existsSync(path)) copyFileSync(path, `${path}.bak`);
    renameSync(temp, path);
  } catch (error) {
    if (existsSync(temp)) unlinkSync(temp);
    throw error;
  }
}

function hasProfile(raw: Record<string, unknown>, name: string): boolean {
  return Object.hasOwn((raw.profiles ?? {}) as object, name);
}

export function addProfile(profile: Profile): void {
  warnPlaintextSecrets(profile);
  const path = configPath();
  const raw = existsSync(path) ? readFileSync(path, "utf8") : stringify({ version: 1 });
  const candidate = `${raw.trimEnd()}\n\n${profileSection(profile)}`;
  atomicWrite(candidate, (parsed) => {
    if (!hasProfile(parsed, profile.name)) throw new ConfigWriteError("added hat failed validation");
  });
}

export function updateProfile(profile: Profile): void {
  warnPlaintextSecrets(profile);
  const raw = readFileSync(configPath(), "utf8");
  const [start, end] = sectionRange(raw, profile.name);
  const candidate = raw.slice(0, start) + profileSection(profile) + raw.slice(end);
  atomicWrite(candidate, (parsed) => {
    if (!hasProfile(parsed, profile.name)) throw new ConfigWriteError("updated hat failed validation");
  });
}

export function removeProfile(name: string): void {
  const raw = readFileSync(configPath(), "utf8");
  const [start, end] = sectionRange(raw, name);
  const candidate = raw.slice(0, start) + raw.slice(end);
  atomicWrite(candidate, (parsed) => {
    if (hasProfile(parsed, name)) throw new ConfigWriteError("removed hat failed validation");
  });
}
