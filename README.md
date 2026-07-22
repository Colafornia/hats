<p align="center">
  <img src="assets/hats.png" width="112" alt="hats logo">
</p>

<h1 align="center">hats</h1>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">Run Claude Code, Codex, and other command-line AI tools with different providers concurrently — without switching shared configuration.</p>

<p align="center">
  <a href="https://github.com/Colafornia/hats/actions/workflows/ci.yml"><img src="https://github.com/Colafornia/hats/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

<p align="center">
  <img src="assets/demo.gif" width="900" alt="Two isolated Codex profiles running side by side with different providers">
</p>

## Install

**Homebrew (recommended)**

```bash
brew install colafornia/tap/hats
```

**Standalone installer**

```bash
curl -fsSL https://raw.githubusercontent.com/Colafornia/hats/main/install.sh | sh
```

## Quick start

Create a hat for any AI CLI:

```bash
hats add work claude
hats work
```

Each run applies that hat's environment only to the launched process. Other terminals
keep running with their existing providers.

Run `hats add` without arguments for guided setup. To configure provider variables,
use `hats edit` or see [Advanced configuration](docs/advanced.md).

## Why

Your work terminal uses a company gateway. Another terminal uses a personal API account
or a local model. Global switchers make only one shared configuration current.

hats applies each hat only to the process it launches, so both setups can keep running
at the same time.

To prevent accidental overrides, hats removes inherited provider credentials such as
`ANTHROPIC_*`, `OPENAI_*`, and `CODEX_*` before applying the variables configured for
the selected hat.

See [Advanced configuration](docs/advanced.md) for env references, local models, and
manual configuration.

## Share an environment across CLIs

Point multiple hats at the same environment file when Claude and Codex use the same
company gateway:

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
hats review  # run in another terminal
```

## Optional: isolate CLI state

Provider environments are process-local by default, but hats for the same CLI still
share the CLI's normal config home. Add `--isolated` when a hat also needs its own home:

```bash
hats add personal codex --isolated
```

Files stored in that home—including settings, MCP configuration, plugins, and history—
remain separate. Built-in config-home isolation is available for Codex and Claude Code.

This isolates local CLI state. Authentication and OAuth behavior remain controlled by
the underlying CLI.

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
hats completion <shell>           output Bash, Zsh, or Fish completion code
```

</details>

## Shell completion

Homebrew enables completion automatically. For other installs, add the command for
your shell to its startup file:

```zsh
eval "$(hats completion zsh)"
```

```bash
eval "$(hats completion bash)"
```

```fish
hats completion fish | source
```

## Optional integrations

- `HATS_PROFILE` exposes the selected profile to scripts and status lines.
- tmux can show the active hat in pane borders.
- Herdr can show it in the Agent sidebar.

See [Active hat indicators](docs/advanced.md#active-hat-indicators) for setup examples.

## Other CLIs and limitations

hats can still launch other CLIs with a process-local environment. If hats cannot infer
a safe config home, `--isolated` returns an error:

- OpenCode stores credentials outside its config home. Use provider keys through the
  hat's `env` or `env_file`. hats does not redirect `XDG_DATA_HOME` because that would
  affect every XDG-aware process launched by the CLI.

## Non-goals

- No global provider switching.
- No credential vault or OAuth management.
- No interactive hat picker. Launching stays explicit: `hats <name>`.

## Support

Found a bug or have an idea? [Open an issue](https://github.com/Colafornia/hats/issues).

## License

[MIT](LICENSE)
