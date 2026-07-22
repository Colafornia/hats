import { Command } from "commander";
import * as p from "@clack/prompts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { hatsHome, configPath, saveConfig, defaultConfig } from "../core/config.js";

export const EXAMPLE = `# hats example config — copy a hat block into config.toml and edit.
# These are generic shapes; rename hats to whatever you like.

version = 1

# Official Codex, one account, shared default login (~/.codex).
# Created with: hats add codex codex
[profiles.codex]
launch = "codex"

# Official Codex with an isolated config home (not an OAuth concurrency guarantee).
# Created with: hats add codex-clean codex --isolated
# hats infers CODEX_HOME from the launch first token; the path lives under
# ~/.config/hats/homes/<name> (i.e. $HATS_HOME/homes/<name>).
[profiles.codex-clean]
launch = "codex"
env = { CODEX_HOME = "~/.config/hats/homes/codex-clean" }

# A relay / gateway: point claude at a provider with a token.
# Credentials stay where they are — hats only references them (file:/env:/cmd:).
# By default the relay shares your normal ~/.claude (MCP, history, settings).
# Created with:  hats add company-claude claude   then   hats edit  (paste env below)
[profiles.company-claude]
desc = "company gateway"
launch = "claude"
env = { ANTHROPIC_BASE_URL = "https://gateway.example", ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/relay.token" }

# A local model. hats always strips stray ANTHROPIC_*/CLAUDE_*/CODEX_*/OPENAI_*/GEMINI_*/GOOGLE_*
# from the inherited env, so a leftover \`export ANTHROPIC_*\` in your zshrc can't
# leak in here — no per-profile toggle needed.
# Created with: hats add local-claude ollama launch claude --model qwen
[profiles.local-claude]
desc = "local model"
launch = "ollama launch claude --model qwen"

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
    p.log.info("copy a hat block from the example into your config, then `hats edit`.");
  });
