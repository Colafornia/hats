import type { HatsConfig, Profile } from "./config.js";

export class ProfileError extends Error {}

export function getProfile(cfg: HatsConfig, name: string): Profile {
  const p = cfg.profiles[name];
  if (!p) throw new ProfileError(`profile "${name}" not found`);
  return p;
}

export function profileNames(cfg: HatsConfig): string[] {
  return Object.keys(cfg.profiles);
}

export function validateProfile(p: Profile): string[] {
  const errs: string[] = [];
  if (!p.name) errs.push("name is required");
  if (p.env) {
    for (const [k, v] of Object.entries(p.env)) {
      if (typeof v !== "string") errs.push(`env.${k} must be a string`);
    }
  }
  if (p.kind && p.kind !== "cli" && p.kind !== "gui") {
    errs.push(`kind must be "cli" or "gui"`);
  }
  return errs;
}