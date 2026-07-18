export enum CredentialStorage {
  ConfigHome = "config-home",
  DirectoryKeychain = "directory-keychain",
  FixedKeychain = "fixed-keychain",
  ExternalData = "external-data",
}

export interface ToolEntry {
  credentialStorage: CredentialStorage;
  homeVar?: string;
  credEnv?: string[];
}

export const TOOLS: Record<string, ToolEntry> = {
  codex: {
    credentialStorage: CredentialStorage.ConfigHome,
    homeVar: "CODEX_HOME",
    credEnv: ["OPENAI_API_KEY"],
  },
  claude: {
    credentialStorage: CredentialStorage.DirectoryKeychain,
    homeVar: "CLAUDE_CONFIG_DIR",
    credEnv: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"],
  },
  gemini: {
    credentialStorage: CredentialStorage.FixedKeychain,
    homeVar: "GEMINI_CLI_HOME",
    credEnv: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  opencode: { credentialStorage: CredentialStorage.ExternalData },
};

export const TOOL_HOME_VARS = new Set(
  Object.values(TOOLS).flatMap((tool) => (tool.homeVar ? [tool.homeVar] : [])),
);

export const TOOL_CREDENTIAL_ENV = new Set(Object.values(TOOLS).flatMap((tool) => tool.credEnv ?? []));
