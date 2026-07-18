<p align="center">
  <img src="assets/hats.png" width="112" alt="hats logo">
</p>

<h1 align="center">hats</h1>

<p align="center">Run Claude Code, Codex, and Gemini profiles side by side.</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/install-Homebrew-FBB040?logo=homebrew&logoColor=111827" alt="Install with Homebrew"></a>
  <a href="https://github.com/Colafornia/hats/actions/workflows/ci.yml"><img src="https://github.com/Colafornia/hats/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

`hats` runs each profile in a clean child process. Use a company gateway in one
terminal, a personal subscription in another, and a local model in a third. It does
not switch global providers, pollute your shell, or copy credentials.

```bash
hats run work      # one terminal
hats run personal  # another terminal
```

## Install

```bash
brew install colafornia/tap/hats
```

hats ships as a standalone binary. No Node.js or Bun required.

## Quick Start

Create your first hat with the interactive setup:

```bash
hats add
```

Then run the name you chose with `hats run <name>`.

## Why

Most AI CLI switchers mutate global state: they export provider env vars, rewrite shared
tool config, or silently change what every terminal will use next. That breaks down when
you need more than one setup open at once.

`hats` makes the switch explicit:

```bash
hats run company-claude
hats run personal-codex
hats run local-claude
```

Each command creates one isolated child process. The parent shell keeps none of the
profile's credentials, `ANTHROPIC_*`, `OPENAI_*`, or `CODEX_*` values.

Use hats when you want to:

- run multiple AI coding subscriptions or OAuth accounts at the same time
- keep company gateways, personal accounts, and local models from leaking into each other
- replace global switchers that rewrite shared `~/.claude` or `~/.codex` config
- launch any CLI with one profile and zero residue in the current shell

## Run multiple subscriptions side by side

hats supports fully isolated accounts for **Codex** and **Claude Code**. Each hat gets
its own login, config, history, and settings, so work and personal subscriptions can
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

`--isolated` creates a dedicated CLI home under
`~/.config/hats/homes/<name>`. hats also removes inherited provider credentials from
the child process, preventing a shell-level API key from silently overriding the
selected OAuth account. Add a key explicitly to the hat only when that override is
intentional.

Use a recent Claude Code release: isolated Claude accounts rely on its per-directory
keychain storage.

### Other CLIs

hats can launch any CLI with per-process env and config. Credential-home isolation is
currently available for Codex and Claude Code. For tools with shared credential
storage, hats fails clearly instead of claiming the accounts are separated:

- Gemini uses a fixed keychain entry. Use explicit env configuration with
  `GEMINI_CLI_HOME` and `GEMINI_FORCE_FILE_STORAGE=true` if you accept that manual
  setup.
- OpenCode stores credentials outside its config home. Use provider keys through the
  hat's `env` or `env_file`; redirecting `XDG_DATA_HOME` would affect every XDG app in
  the child process and is not recommended.

hats does not manage OAuth or report login state. The underlying CLI remains
responsible for login and token refresh.

See [Advanced configuration](docs/advanced.md) for gateways, local models, shared env
files, and hand-written config.

## Commands

### Start here

```text
hats add [<name> <command...>]    create a hat
hats run <profile> [args...]      run the profile's launch command
hats edit                         open the config in $EDITOR
hats ls                           list profiles
```

<details>
<summary>More</summary>

```text
hats                              show profiles and first-run hints
hats init                         write an example config
hats add <name> <command...> --isolated
hats exec <profile> -- <cmd>      run another command with the profile env
hats which <profile>              inspect a profile, with secrets masked
hats setenv <profile> --file .env merge env vars from KEY=value lines
hats rm <profile>                 delete a profile entry
```

</details>

`hats add` without arguments opens a short wizard: name, launch command, and whether
this hat needs a separate login.

## Non-goals

- No global provider switching.
- No credential vault.
- No OAuth management. The underlying CLI still owns login and refresh.
- No automatic `.zshrc` migration.
- No GUI desktop app launching in v0.1.
- No interactive profile picker. Switching stays explicit: `hats run <name>`.

## License

MIT
