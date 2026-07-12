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

## Common Setups

### Codex official subscription

Use your normal `~/.codex` login:

```bash
hats add codex codex
hats run codex
```

### Multiple Codex accounts

Use a second Codex or ChatGPT account without touching the default `~/.codex`:

```bash
hats add codex-personal codex --home
hats run codex-personal login
hats run codex-personal
```

`--home` gives this hat its own CLI home under `~/.config/hats/homes/<name>`.

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
hats add <name> <command...> --home
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
