<p align="center">
  <img src="assets/hats.png" width="112" alt="hats logo">
</p>

<h1 align="center">hats</h1>

<p align="center">Run multiple AI CLI setups side by side — one hat per terminal, zero shell pollution.</p>

<p align="center">
  <a href="https://github.com/Colafornia/hats/actions/workflows/ci.yml"><img src="https://github.com/Colafornia/hats/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Colafornia/hats/main/install.sh | sh
```

No Node.js, Bun, `sudo`, or shell startup-file changes required.

Prefer Homebrew?

```bash
brew install colafornia/tap/hats
```

## Quick start

```bash
hats add work claude
hats work
```

That is the whole default workflow. A hat starts its CLI in a clean child process with
the config you chose. Your current shell and other terminals stay unchanged.

Create a hat by naming it and the CLI it should launch:

```bash
hats add personal codex
hats personal
```

To feed one env file to different CLIs, create both hats and point them at the same file
with `hats edit`:

```bash
hats add write claude
hats add review codex
hats edit
```

```toml
[profiles.write]
launch = "claude"
env_file = "~/.config/company-ai.env"

[profiles.review]
launch = "codex"
env_file = "~/.config/company-ai.env"
```

```bash
hats write
hats review  # another terminal, same env file, independent process
```

`hats add` without arguments opens a short wizard. Use `hats edit` for hand-written
config and advanced env references.

## Why

Most AI CLI switchers mutate global state: they export provider env vars, rewrite shared
tool config, or silently change what every terminal will use next. That breaks down when
you need more than one setup open at once.

`hats` makes each launch explicit and local to one child process. It also removes
inherited provider credentials such as `ANTHROPIC_*`, `OPENAI_*`, and `CODEX_*` unless
the selected hat adds them back intentionally.

Use hats for company gateways, personal subscriptions, local models, or any CLI that
needs a repeatable per-process environment. See
[Advanced configuration](docs/advanced.md) for env references, shared env files, local
models, and hand-written config.

## Run multiple subscriptions side by side

Multiple subscriptions are optional. The simple `hats <name>` workflow above does not
require isolated CLI homes.

hats supports isolated accounts for **Codex** and **Claude Code**. Each isolated hat
gets its own login, config, history, and settings, so work and personal subscriptions can
run at the same time without overwriting each other.

### Two Codex accounts

```bash
hats add codex-work codex --isolated
hats add codex-personal codex --isolated

hats codex-work login
hats codex-personal login

hats codex-work
# In another terminal:
hats codex-personal
```

### Two Claude Code accounts

```bash
hats add claude-work claude --isolated
hats add claude-personal claude --isolated

hats claude-work
# In another terminal:
hats claude-personal
```

Codex opens `login`; Claude Code opens its onboarding flow on first run. Complete each
login once, then launch that account anytime with its hat name.

### How isolation works

`--isolated` creates a dedicated CLI home under `~/.config/hats/homes/<name>`. hats
also removes inherited provider credentials from the child process, preventing a
shell-level API key from silently overriding the selected OAuth account. Add a key
explicitly to the hat only when that override is intentional.

Use a recent Claude Code release: isolated Claude accounts rely on its per-directory
keychain storage.

### Other CLIs

hats can launch any CLI with per-process env and config. Credential-home isolation is
currently available for Codex and Claude Code. For tools with shared credential storage,
hats fails clearly instead of claiming the accounts are separated:

- Gemini uses a fixed keychain entry. Use explicit env configuration with
  `GEMINI_CLI_HOME` and `GEMINI_FORCE_FILE_STORAGE=true` if you accept that manual
  setup.
- OpenCode stores credentials outside its config home. Use provider keys through the
  hat's `env` or `env_file`; redirecting `XDG_DATA_HOME` would affect every XDG app in
  the child process and is not recommended.

hats does not manage OAuth or report login state. The underlying CLI remains responsible
for login and token refresh.

## Commands

```text
hats add [<name> <command...>]    create a hat
hats <hat> [args...]              launch a hat (same as hats run <hat>)
hats edit                         open the config in $EDITOR
hats ls                           list hats
```

<details>
<summary>More</summary>

```text
hats                              show hats and first-run hints
hats init                         write an example config
hats add <name> <command...> --isolated
hats exec <hat> -- <cmd>          run another command with the hat's env
hats which <hat>                  inspect a hat, with secrets masked
hats setenv <hat> --file .env     merge env vars from KEY=value lines
hats rm <hat>                     delete a hat
```

</details>

## Non-goals

- No global provider switching.
- No credential vault.
- No OAuth management. The underlying CLI still owns login and refresh.
- No automatic `.zshrc` migration.
- No GUI desktop app launching in v0.1.
- No interactive hat picker. Switching stays explicit: `hats <name>`.

## License

MIT
