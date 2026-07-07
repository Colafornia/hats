import type { Profile } from "./config.js";

export type TemplateKey = "company" | "kimi" | "ollama" | "personal";
export const TEMPLATE_ORDER: TemplateKey[] = ["company", "kimi", "ollama", "personal"];

export interface TemplatePrompt {
  key: string;
  message: string;
  hint?: string;
}

export interface TemplateDef {
  label: string;
  profile: Omit<Profile, "name">;
  /** env keys whose placeholder values ("" ) the user must fill in. */
  prompts: TemplatePrompt[];
}

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  company: {
    label: "company — corporate gateway (env + token)",
    profile: {
      desc: "company gateway",
      launch: "claude",
      env: {
        CLAUDE_CONFIG_DIR: "~/.claude-company",
        ANTHROPIC_BASE_URL: "",
        ANTHROPIC_AUTH_TOKEN: "file:~/.config/hats/company.token",
      },
    },
    prompts: [
      { key: "ANTHROPIC_BASE_URL", message: "Company gateway URL", hint: "https://gw.company.example" },
      { key: "ANTHROPIC_AUTH_TOKEN", message: "Token (plain / file: / cmd: / env:)", hint: "file:~/.config/hats/company.token" },
    ],
  },
  kimi: {
    label: "kimi — Kimi coding plan (replaces cc switch)",
    profile: {
      desc: "kimi coding plan",
      launch: "claude",
      env: {
        ANTHROPIC_BASE_URL: "",
        ANTHROPIC_AUTH_TOKEN: "file:~/.config/hats/kimi.token",
        CLAUDE_CONFIG_DIR: "~/.claude-kimi",
      },
    },
    prompts: [
      { key: "ANTHROPIC_BASE_URL", message: "Kimi provider URL", hint: "https://kimi.example" },
      { key: "ANTHROPIC_AUTH_TOKEN", message: "Token (plain / file: / cmd: / env:)", hint: "file:~/.config/hats/kimi.token" },
    ],
  },
  ollama: {
    label: "ollama — local Ollama (zero ANTHROPIC residue)",
    profile: {
      desc: "local ollama",
      launch: "ollama launch claude",
      inherit_env: false,
      env: { CLAUDE_CONFIG_DIR: "~/.claude-ollama" },
    },
    prompts: [],
  },
  personal: {
    label: "personal — personal subscription (OAuth + Keychain)",
    profile: {
      desc: "personal subscription",
      launch: "claude",
      env: { CLAUDE_CONFIG_DIR: "~/.claude-personal" },
    },
    prompts: [],
  },
};