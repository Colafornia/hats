Output assets/demo.gif

Require hats
Require tmux
Require codex

Set Shell zsh
Set Width 1280
Set Height 720
Set FontSize 16
Set Framerate 24
Set TypingSpeed 50ms
Set Theme "Catppuccin Mocha"
Set Padding 20
Set CursorBlink false

Env HATS_HOME "/tmp/hats-vhs-home"

Hide
Type@0s "tmux -L hats-vhs kill-server 2>/dev/null || true"
Enter
Type@0s "rm -rf /tmp/hats-vhs-home"
Enter
Type@0s "hats add work codex -C /tmp -c tui.show_tooltips=false -c model_provider=work -c model_providers.work.name=Work -c model_providers.work.base_url=https://api.company.example/v1 -c model_providers.work.wire_api=responses --isolated"
Enter
Type@0s "hats add personal codex -C /tmp -c tui.show_tooltips=false -c model_provider=personal -c model_providers.personal.name=OpenAI -c model_providers.personal.base_url=https://api.openai.com/v1 -c model_providers.personal.wire_api=responses --isolated"
Enter
Type@0s "mkdir -p /tmp/hats-vhs-home/homes/work /tmp/hats-vhs-home/homes/personal"
Enter
Type@0s `printf '[projects."/tmp"]\ntrust_level = "trusted"\n' > /tmp/hats-vhs-home/homes/personal/config.toml`
Enter
Type@0s "hats work"
Enter
Sleep 2s
Enter
Sleep 3s
Ctrl+C
Sleep 1s
Type@0s `tmux -L hats-vhs -f /dev/null new-session -d -s demo "env PS1='❯ ' zsh -f"`
Enter
Type@0s `tmux -L hats-vhs set -g default-command "env PS1='❯ ' zsh -f"`
Enter
Type@0s "tmux -L hats-vhs set -g status off"
Enter
Type@0s "tmux -L hats-vhs set -g pane-border-status top"
Enter
Type@0s "tmux -L hats-vhs set -g pane-border-format ' #{?pane_at_left,WORK,PERSONAL} '"
Enter
Type@0s "clear"
Enter
Sleep 500ms
Type@0s "tmux -L hats-vhs attach -t demo"
Enter
Wait+Screen /── WORK/
Ctrl+L
Sleep 500ms

Show
Sleep 1s
Type@50ms "hats work"
Sleep 300ms
Enter
Wait+Screen /(?s)── WORK ─+.*OpenAI Codex/
Sleep 1s

Ctrl+B
Type@0s "%"
Sleep 1s

Type "hats personal"
Sleep 300ms
Enter
Wait+Screen /(?s)OpenAI Codex.*OpenAI Codex/
Sleep 1.6s

Type@0.1s "/status"
Sleep 800ms
Enter
Sleep 1.5s

Ctrl+B
Left
Sleep 600ms

Type@0.1s "/status"
Sleep 800ms
Enter
Sleep 4s

Hide
Ctrl+B
Type `:run-shell "tmux -L hats-vhs kill-server; rm -rf /tmp/hats-vhs-home"`
Enter
Sleep 1s
