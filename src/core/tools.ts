export type CredentialForm = "A" | "B" | "C" | "D";

export interface ToolEntry {
  form: CredentialForm;
  homeVar?: string;
  credEnv?: string[];
}

export const TOOLS: Record<string, ToolEntry> = {
  codex: { form: "A", homeVar: "CODEX_HOME", credEnv: ["OPENAI_API_KEY"] },
  claude: {
    form: "B",
    homeVar: "CLAUDE_CONFIG_DIR",
    credEnv: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"],
  },
  gemini: {
    form: "C",
    homeVar: "GEMINI_CLI_HOME",
    credEnv: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  opencode: { form: "D" },
};

export const TOOL_HOME_VARS = new Set(
  Object.values(TOOLS).flatMap((tool) => (tool.homeVar ? [tool.homeVar] : [])),
);

export const TOOL_CREDENTIAL_ENV = new Set(Object.values(TOOLS).flatMap((tool) => tool.credEnv ?? []));
