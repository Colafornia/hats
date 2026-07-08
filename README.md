# hats

A per-terminal / per-process **config isolator** for Claude Code, Codex, and any CLI.
Switch "hats" (provider / gateway / account / local model) without polluting your shell.

```
hats run my-relay     # launch `claude` against a relay, isolated env, zero shell residue
hats run local        # launch `ollama launch claude ...` with a stripped, ANTHROPIC-free env
hats exec my-relay -- printenv ANTHROPIC_BASE_URL   # use the profile's env for any command
hats                  # interactive picker
```

Each invocation is a one-shot, isolated child process. Your current shell never gets
the credentials, `ANTHROPIC_*`, or `CODEX_*` — so two terminals in the same directory
can run different hats at the same time without interfering.

## Why

The alternatives all force a **global** switch (CC Switch / aiswitch), are
**directory-bound** (direnv), or only cover one tool. `hats` is the missing
combination: arbitrary CLI + per-terminal isolation + zero residue.

The hard part isn't env injection — it's that tools like `ollama launch claude`
can't coexist with a CC Switch profile, because CC Switch writes the shared
`~/.claude` config. `hats` fixes that by giving each hat its own
`CLAUDE_CONFIG_DIR` / `CODEX_HOME`.

## Install (local dogfood)

```bash
git clone <this repo> && cd hats
npm install
npm link          # makes `hats` available globally
```

## Config

`~/.config/hats/config.toml` (override with `$HATS_HOME`):

```toml
version = 1
[settings]
inherit_env = true

# A relay / gateway: point claude at a provider with a token.
[profiles.my-relay]
desc = "example relay"
launch = "claude"
env = { ANTHROPIC_BASE_URL = "https://your-relay.example", ANTHROPIC_AUTH_TOKEN = "file:~/.config/hats/relay.token", CLAUDE_CONFIG_DIR = "~/.claude-my-relay" }

# A local model: inherit_env=false strips a dirty shell so no ANTHROPIC_* leaks.
[profiles.local]
desc = "local model"
launch = "ollama launch claude --model your-model"
inherit_env = false                                  # hard guarantee: strips even a dirty shell
env = { CLAUDE_CONFIG_DIR = "~/.claude-local" }
```

### Value references (credentials stay where they are)

| prefix | source |
|---|---|
| `env:NAME` | current environment variable |
| `file:path` | file contents (trimmed) |
| `cmd:<shell>` | command stdout (e.g. `cmd:op read op://Private/anthropic/token`) |
| *(none)* | plaintext |

`hats` does **not** copy credentials into its own storage. `rm` only deletes the
profile entry, never the referenced files.

## Commands

```
hats                       interactive picker
hats run <profile> [-- args]   isolate-launch the profile's command
hats exec <profile> -- <cmd>   run an arbitrary command with the profile's env
hats which <profile>       show what it would inject (secrets masked; cmd: not executed)
hats ls                    list profiles
hats add                   interactive wizard (or --template relay)
hats setenv <profile>      batch-set env keys from KEY=value lines (stdin or --file)
hats init                  write an example config to copy from (non-destructive)
hats rm <profile>          delete a profile (keeps referenced files)
hats edit                  open the config in $EDITOR
```

### Fast batch entry (no one-key-at-a-time wizard)

Pipe a `KEY=value` block — `hats setenv` creates the profile if missing and merges keys:

```bash
hats setenv my-relay --launch claude <<'EOF'
ANTHROPIC_BASE_URL=https://your-relay.example
ANTHROPIC_AUTH_TOKEN=file:~/.config/hats/relay.token
CLAUDE_CONFIG_DIR=~/.claude-my-relay
EOF
```

Or import an existing `.env`: `hats setenv my-relay --file ~/.config/hats/relay.env`.
Values may be plain text or a `file:`/`cmd:`/`env:` reference.

Need a template to copy from? `hats init` writes `~/.config/hats/config.example.toml`
with reference profile shapes; copy a block into your config and `hats edit`.

### First-run guidance

Running bare `hats` with **no profiles** opens an interactive guide: create from a
template (e.g. `relay` — just base_url + token), seed an example config, or walk
the wizard. Once you have profiles, bare `hats` prints a friendly summary instead.
`hats add --template relay` does the same non-interactively.

## How isolation works

- `inherit_env = true` (default): child inherits the parent shell's env, then
  overlays the profile's env.
- `inherit_env = false` (per-profile): only a whitelist (`PATH`, `HOME`, …) is
  inherited. Use this for a local-model hat so a stray global `export ANTHROPIC_*`
  in your zshrc can't leak in — the guarantee is enforced by the tool, not by
  your discipline.
- `CLAUDE_CONFIG_DIR` / `CODEX_HOME` per hat → separate config dirs → CC Switch
  pollution in `~/.claude` is irrelevant to a `hats`-launched process.

## Non-goals (for v0.1)

- No GUI desktop app launching (Claude/Codex Desktop) — planned for v0.2 via
  `open -n --user-data-dir` (already community-verified).
- No credential vault — references only.
- No multi-machine sync.

## License

MIT