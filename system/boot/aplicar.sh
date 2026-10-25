#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo 'Execute com sudo.'; exit 1; }
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=/usr/share/plymouth/themes/frosted-dark/frosted-dark.plymouth
previous=$(update-alternatives --query default.plymouth | sed -n 's/^Value: //p')
previous_mode=$(update-alternatives --query default.plymouth | sed -n 's/^Status: //p')
test -f "$previous"
test -f /usr/lib/x86_64-linux-gnu/plymouth/two-step.so
install -d -m 755 /var/lib/frosted-boot
if [ ! -f /var/lib/frosted-boot/original-path ]; then
 printf '%s\n' "$previous" > /var/lib/frosted-boot/original-path
 printf '%s\n' "$previous_mode" > /var/lib/frosted-boot/original-mode
fi
install -d -m 755 /usr/share/plymouth/themes/frosted-dark
cp -a "$base/frosted-dark/." /usr/share/plymouth/themes/frosted-dark/
chown -R root:root /usr/share/plymouth/themes/frosted-dark
chmod -R a+rX /usr/share/plymouth/themes/frosted-dark
update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth "$target" 20 --slave /usr/share/plymouth/themes/default.grub default.plymouth.grub /usr/share/plymouth/themes/frosted-dark/frosted-dark.grub
update-alternatives --set default.plymouth "$target"
if ! update-initramfs -u -k all; then
 echo 'Falha ao atualizar a inicialização; restaurando o tema anterior.' >&2
 update-alternatives --set default.plymouth "$previous"
 if [ "$previous_mode" = auto ]; then update-alternatives --auto default.plymouth; fi
 update-initramfs -u -k all || true
 exit 1
fi
echo 'Tema grafite de inicialização instalado. Será exibido na próxima inicialização.'
