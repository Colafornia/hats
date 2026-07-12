# Advanced configuration

Use these options for company gateways, local models, shared environment files, or
profiles that need separate CLI homes.

## Company gateway

Create the hat, add the gateway variables, and run it:

```bash
hats add company-claude claude
hats edit
hats run company-claude
```

Add the variables to `~/.config/hats/config.toml`:

```toml
[profiles.company-claude]
launch = "claude"
env = {
  ANTHROPIC_BASE_URL = "https://gateway.example",
  ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/company.token"
}
```

## Share a gateway between Claude and Codex

Point both hats to one env file:

```toml
[profiles.company-claude]
launch = "claude"
env_file = "~/.config/hats/company.env"

[profiles.company-codex]
launch = "codex"
env_file = "~/.config/hats/company.env"
```

```dotenv
# ~/.config/hats/company.env
ANTHROPIC_BASE_URL=https://gateway.example
ANTHROPIC_AUTH_TOKEN=file:~/.config/hats/anthropic.token
OPENAI_BASE_URL=https://gateway.example/v1
OPENAI_API_KEY=file:~/.config/hats/openai.key
```

## Local AI model

Run a local Claude-compatible CLI without inheriting a company gateway:

```bash
hats add local-claude ollama launch claude --model your-model
hats run local-claude
```

## Configuration file

hats stores its config at `~/.config/hats/config.toml`:

```toml
version = 1

[profiles.codex]
launch = "codex"

[profiles.codex-personal]
launch = "codex"
env = { CODEX_HOME = "~/.config/hats/homes/codex-personal" }

[profiles.company-claude]
launch = "claude"
env = {
  ANTHROPIC_BASE_URL = "https://gateway.example",
  ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/company.token"
}

[profiles.local-claude]
launch = "ollama launch claude --model your-model"
```

Set `HATS_HOME` to use a different config directory.

### Value references

hats reads credential references at run time and does not copy their contents into its
config.

| Prefix | Source |
| --- | --- |
| `env:NAME` | current environment variable |
| `file:path` | file contents, trimmed |
| `cmd:<shell>` | command stdout |
| none | plaintext |

`hats which` masks referenced values and does not execute `cmd:` references.

## Environment isolation

Before hats starts the child process, it strips inherited AI-provider variables:

```text
ANTHROPIC_*
CLAUDE_*
CODEX_*
OPENAI_*
GEMINI_*
GOOGLE_*
```

It then applies the profile's env file and inline variables. Non-provider variables such
as `OLLAMA_HOST`, proxy settings, `EDITOR`, and locale stay intact.

## Separate CLI homes

By default, a hat shares the tool's normal config directory. Add `--home` when the
profile needs a separate login and config home:

| Launch starts with | Env var set by `--home` |
| --- | --- |
| `codex` | `CODEX_HOME` |
| `claude` | `CLAUDE_CONFIG_DIR` |
| `gemini` | `GEMINI_CLI_HOME` |

`--home` only infers from a bare `codex`, `claude`, or `gemini` first token. Set the
config-home environment variable by hand for wrappers and custom launchers.
