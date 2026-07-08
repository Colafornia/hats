import { Command } from "commander";
import * as p from "@clack/prompts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { hatsHome, configPath, saveConfig, defaultConfig } from "../core/config.js";

export const EXAMPLE = `# hats example config — copy a [profiles.<name>] block into config.toml and edit.
# These are generic shapes; rename profiles to whatever you like.

version = 1
[settings]
inherit_env = true

# A relay / gateway: point claude at a provider with a token.
# Credentials stay where they are — hats only references them.
[profiles.my-relay]
desc = "example relay"
launch = "claude"
env = { ANTHROPIC_BASE_URL = "https://your-relay.example", ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/relay.token", CLAUDE_CONFIG_DIR = "~/.claude-my-relay" }

# A local model: inherit_env=false strips a dirty shell so no ANTHROPIC_* leaks
# even if your zshrc still exports one.
[profiles.local]
desc = "local model"
launch = "ollama launch claude --model your-model"
inherit_env = false
env = { CLAUDE_CONFIG_DIR = "~/.claude-local" }

# Value prefixes (hats never copies credentials, only references):
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