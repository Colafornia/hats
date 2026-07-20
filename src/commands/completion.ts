import { Command } from "commander";

const scripts: Record<string, string> = {
  bash: `_hats() {
  local index=$((COMP_CWORD - 1))
  local cur=\${COMP_WORDS[COMP_CWORD]}
  local candidates
  candidates=$(hats __complete "$index" "\${COMP_WORDS[@]:1}" 2>/dev/null)
  # shellcheck disable=SC2207
  COMPREPLY=($(compgen -W "$candidates" -- "$cur"))
}

complete -F _hats hats
`,
  zsh: `#compdef hats

_hats() {
  local index=$((CURRENT - 2))
  local -a candidates
  local output=$(hats __complete "$index" "\${words[@]:1}" 2>/dev/null)
  [[ -n $output ]] || return 0
  candidates=("\${(@f)output}")
  compadd -- "\${candidates[@]}"
}

compdef _hats hats
`,
  fish: `function __hats_complete
    set -l words (commandline -poc)
    set -e words[1]
    hats __complete (count $words) $words 2>/dev/null
end

complete -c hats -f -a '(__hats_complete)'
`,
};

export const completionCommand = new Command("completion")
  .description("output shell completion code")
  .argument("<shell>", "bash, zsh, or fish")
  .action((shell: string) => {
    const script = scripts[shell];
    if (!script) throw new Error(`unsupported shell "${shell}" (expected bash, zsh, or fish)`);
    process.stdout.write(script);
  });
