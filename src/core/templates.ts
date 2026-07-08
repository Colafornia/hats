import type { Profile } from "./config.js";

export type TemplateKey = "relay";
export const TEMPLATE_ORDER: TemplateKey[] = ["relay"];

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

/**
 * Generic "point claude at a relay/provider with a token" shape — the common
 * case for temp relay accounts. Not tied to any specific provider.
 */
export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  relay: {
    label: "relay — point claude at a relay/provider (base_url + token)",
    profile: {
      desc: "relay account",
      launch: "claude",
      env: {
        ANTHROPIC_BASE_URL: "",
        ANTHROPIC_AUTH_TOKEN: "",
        CLAUDE_CONFIG_DIR: "~/.claude-relay",
      },
    },
    prompts: [
      { key: "ANTHROPIC_BASE_URL", message: "Relay base URL", hint: "https://relay.example" },
      { key: "ANTHROPIC_AUTH_TOKEN", message: "Token (plain / file: / cmd: / env:)", hint: "file:~/.config/hats/relay.token" },
    ],
  },
};