_hats() {
  local index=$((COMP_CWORD - 1))
  local cur=${COMP_WORDS[COMP_CWORD]}
  local candidates
  candidates=$(hats __complete "$index" "${COMP_WORDS[@]:1}" 2>/dev/null)
  # shellcheck disable=SC2207
  COMPREPLY=($(compgen -W "$candidates" -- "$cur"))
}

complete -F _hats hats
