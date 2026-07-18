function __hats_complete
    set -l words (commandline -poc)
    set -e words[1]
    hats __complete (count $words) $words 2>/dev/null
end

complete -c hats -f -a '(__hats_complete)'
