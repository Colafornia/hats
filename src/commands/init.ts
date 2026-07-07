import { Command } from "commander";
import * as p from "@clack/prompts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { hatsHome, configPath, saveConfig, defaultConfig } from "../core/config.js";

const EXAMPLE = `# hats example config — copy any [profiles.<name>] block below into config.toml,
# edit the values, and you're done. Delete what you don't need.

version = 1
[settings]
inherit_env = true

# ---- company gateway (env_file + file: token + own config dir) ----
[profiles.company]
desc = "company gateway"
launch = "claude"
env_file = "~/.config/hats/company.env"
env = { CLAUDE_CONFIG_DIR = "~/.claude-company", ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/company.token" }

# ---- kimi (replaces cc switch; own config dir) ----
[profiles.kimi]
desc = "kimi coding plan"
launch = "claude"
env = { ANTHROPIC_BASE_URL = "https://kimi.example", ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/kimi.token", CLAUDE_CONFIG_DIR = "~/.claude-kimi" }

# ---- ollama (zero ANTHROPIC residue; inherit_env=false strips a dirty shell) ----
[profiles.ollama]
desc = "local ollama"
launch = "ollama launch claude"
inherit_env = false
env = { CLAUDE_CONFIG_DIR = "~/.claude-ollama" }

# ---- personal (OAuth + Keychain, no plaintext token) ----
[profiles.personal]
desc = "personal subscription"
launch = "claude"
env = { CLAUDE_CONFIG_DIR = "~/.claude-personal" }

# Value prefixes (credentials stay where they are, hats only references them):
#   env:NAME            current env var
#   file:path           file contents (trimmed)
#   cmd:<shell command> command stdout (e.g. cmd:op read op://Private/anthropic/token)
#   (none)              plaintext
`;

export const initCommand = new Command("init")
  .description("write an example config to copy from (non-destructive)")
  .action(() => {
    mkdirSync(hatsHome(), { recursive: true });
    if (!existsSync(configPath())) saveConfig(defaultConfig());
    const examplePath = join(hatsHome(), "config.example.toml");
    writeFileSync(examplePath, EXAMPLE);
    p.log.success(`example written: ${examplePath}`);
    p.log.info(`your config:    ${configPath()}`);
    p.log.info("copy a profile block from the example into your config, then `hats edit`.");
  });