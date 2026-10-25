#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo 'Execute com sudo.'; exit 1; }
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=/usr/local/share/gnome-shell/macos-dark.gresource
gresource list "$base/macos-dark.gresource" >/dev/null
install -d -m 755 /usr/local/share/gnome-shell
install -m 644 "$base/macos-dark.gresource" "$target"
update-alternatives --install /usr/share/gnome-shell/gdm-theme.gresource gdm-theme.gresource "$target" 5
update-alternatives --set gdm-theme.gresource "$target"
echo 'Tema de login aplicado. Aparecerá na próxima tela de login.'
