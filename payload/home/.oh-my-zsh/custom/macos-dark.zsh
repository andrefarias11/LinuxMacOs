# Compact dark terminal setup
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=#a4a7b4'
ZSH_AUTOSUGGEST_STRATEGY=(history completion)
HISTORY_SUBSTRING_SEARCH_HIGHLIGHT_FOUND='bg=blue,fg=white'
HISTORY_SUBSTRING_SEARCH_HIGHLIGHT_NOT_FOUND='bg=red,fg=white'
ZSH_THEME_GIT_PROMPT_PREFIX=' %F{#a4a7b4}· '
ZSH_THEME_GIT_PROMPT_SUFFIX='%f'
ZSH_THEME_GIT_PROMPT_DIRTY=' %F{#ffd60a}•'
ZSH_THEME_GIT_PROMPT_CLEAN=''
PROMPT='%F{#0a84ff}%~%f$(git_prompt_info)
%(?..%F{#ff5f57}✘ %?%f )%F{#30d158}❯%f '
RPROMPT=''
setopt PROMPT_SUBST HIST_IGNORE_SPACE HIST_REDUCE_BLANKS
bindkey -M emacs '^R' history-incremental-search-backward
bindkey -M viins '^R' history-incremental-search-backward
for keymap in emacs viins; do
  bindkey -M "$keymap" '^[[A' history-substring-search-up
  bindkey -M "$keymap" '^[[B' history-substring-search-down
  bindkey -M "$keymap" '^[[C' forward-char
done
# Subtle file colors
export LS_COLORS="${LS_COLORS:+${LS_COLORS}:}di=38;2;121;184;255:ln=38;2;100;210;255:ex=38;2;48;209;88:*.zip=38;2;191;90;242:*.gz=38;2;191;90;242:*.xz=38;2;191;90;242:*.tar=38;2;191;90;242:*.png=38;2;255;214;10:*.jpg=38;2;255;214;10:*.jpeg=38;2;255;214;10:*.md=38;2;245;245;247:*.txt=38;2;245;245;247:or=38;2;255;95;87"
