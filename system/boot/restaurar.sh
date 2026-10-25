#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo 'Execute com sudo.'; exit 1; }
previous=$(cat /var/lib/frosted-boot/original-path)
mode=$(cat /var/lib/frosted-boot/original-mode)
test -f "$previous"
update-alternatives --set default.plymouth "$previous"
update-alternatives --remove default.plymouth /usr/share/plymouth/themes/frosted-dark/frosted-dark.plymouth
if [ "$mode" = auto ]; then update-alternatives --auto default.plymouth; fi
update-initramfs -u -k all
echo 'Tema de inicialização anterior restaurado.'
