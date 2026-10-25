# Compact dark terminal setup
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=245'
ZSH_AUTOSUGGEST_STRATEGY=(history completion)
HISTORY_SUBSTRING_SEARCH_HIGHLIGHT_FOUND='bg=blue,fg=white'
HISTORY_SUBSTRING_SEARCH_HIGHLIGHT_NOT_FOUND='bg=red,fg=white'
ZSH_THEME_GIT_PROMPT_PREFIX=' %F{245}· '
ZSH_THEME_GIT_PROMPT_SUFFIX='%f'
ZSH_THEME_GIT_PROMPT_DIRTY=' %F{yellow}•'
ZSH_THEME_GIT_PROMPT_CLEAN=''
PROMPT='%F{blue}%~%f$(git_prompt_info)
%(?..%F{red}✘ %?%f )%F{green}❯%f '
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
export LS_COLORS="${LS_COLORS:+${LS_COLORS}:}di=38;5;75:ln=38;5;117:ex=38;5;114:*.zip=38;5;183:*.gz=38;5;183:*.xz=38;5;183:*.tar=38;5;183:*.png=38;5;180:*.jpg=38;5;180:*.jpeg=38;5;180:*.md=38;5;252:*.txt=38;5;252:or=38;5;203"
