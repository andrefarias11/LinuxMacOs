# LinuxMacOs — meu Zorin com visual macOS escuro

Kit pessoal para reaplicar o desktop registrado em **25/10/2026**, incluindo
Liquid Glass escuro, Dock animada, menu da maçã, central de controle própria,
Spotlight, cantos arredondados, atalhos, fontes e tema do Firefox.

**Alvo: Zorin OS 18.x, Ubuntu noble, GNOME Shell 46, computador x86_64.**
O instalador recusa outras versões: extensões de GNOME não são universais.

## Depois de formatar

Instale a mesma versão do Zorin, entre na sessão e execute como seu usuário:

```bash
git clone https://github.com/andrefarias11/LinuxMacOs.git
cd LinuxMacOs
./install.sh --check
./install.sh --apps --system-look
```

Não execute o instalador inteiro com sudo. Ele solicita sudo nas etapas necessárias.
Depois, **salve seu trabalho, saia da sessão e entre novamente**. Não é feito
logout ou reinício automático. Reinicie para conferir a tela de inicialização.

Opções:

- `./install.sh`: restaura arquivos e ajustes do usuário; pressupõe apps já instalados.
- `--apps`: instala os apps principais e o Firefox oficial da Mozilla; requer internet.
- `--system-look`: instala também os temas de login GDM e inicialização Plymouth.
- `--check`: verifica integridade e compatibilidade, sem modificar o desktop.
- `--extract-only --target-home /caminho/de/teste`: extrai em uma pasta sem mexer em
  aplicativos, GSettings, login ou inicialização; útil para testar o kit.

O Firefox recebe a versão atual fornecida pela Mozilla, por segurança. Seu tema
CSS foi registrado com a versão usada no snapshot e pode precisar de ajustes
em versões futuras do navegador. Não são importadas sessões, contas ou senhas.

## O que vai junto

- WhiteSur escuro, ícones e cursores, Inter e JetBrains Mono.
- Extensões personalizadas e versões locais de Dash to Dock, Blur My Shell,
  Rounded Window Corners e Pop Shell, com seus arquivos de licença quando presentes.
- CSS Liquid Glass e preferências visuais, relógio, controles, dock e workspaces.
- Configuração de GTK, Rofi, terminal, aparência do VS Code e atalhos de notas/foco/busca.
- Com `--apps`, Zsh é definido como shell padrão para seu usuário.
- Tema e preferências visuais do Firefox em perfil separado, homepage minimalista.
- Temas opcionais de login e inicialização.

Arquivos comprimidos em `assets/` evitam milhares de pequenos arquivos de ícones
no Git. Todos os arquivos do kit são verificados por SHA-256 antes de instalar.
Isso detecta corrupção, não substitui a confiança no autor de um repositório.

## Aplicativos e diferenças

Os aplicativos do GNOME e utilitários vêm dos repositórios do sistema. Notes,
VS Code, DBeaver, Chrome e Deskflow são instalados do Flathub. Em sessões X11,
o Deskflow recebe uma permissão de tela específica para evitar falha ao abrir. LocalSend usa o pacote
nativo oficial, evitando o problema de travamento observado antes com Flatpak. **VS Code,
DBeaver e Chrome em Flatpak podem ter permissões e acesso a ferramentas diferentes
das instalações nativas anteriores.** Seus projetos e configurações de contas
precisam ser restaurados separadamente. O kit adapta os IDs da dock.

O atalho Música abre o site oficial do Apple Music, sem sessão ou assinatura
incluída. O botão de aplicativos/busca continua sendo um equivalente Linux.

## O que NÃO vai para o Git

Este é um kit do desktop, não uma imagem do disco. Ele não inclui documentos,
projetos, notas pessoais, bancos de dados, chaves SSH/GPG, cookies, histórico,
sessões do navegador, senhas do chaveiro ou modelos biométricos.

O **Howdy não é instalado nem ativado automaticamente**. Após reinstalar,
configure e cadastre seu rosto novamente: câmera, usuário e autenticação são
específicos da máquina. O kit também não remove a senha do chaveiro novo.

Não são copiados `.zshrc`, `.gitconfig`, perfis inteiros do Firefox ou dumps
completos de dconf: só configurações selecionadas. O terminal recebe um bloco
identificado, sem substituir o conteúdo anterior do `.zshrc`.

Os binários de extensões, o tema GDM e os esquemas compilados do snapshot exigem
a base compatível acima. A configuração de telas/monitores não é transportada.

## Segurança da restauração e arquivos anteriores

Os arquivos de usuário substituídos são preservados em:

```
~/.local/state/zorin-macos-restore/AAAAmmdd-HHMMSS-.../
```

Essa pasta inclui a lista de arquivos aplicados e preferências visuais anteriores.
Não exclua esse material até conferir o resultado. A pasta `.local/state` não
faz parte do repositório.

O tema de boot preserva a alternativa original em `/var/lib/frosted-boot`.
Para voltar ao tema de boot anterior, execute:

```bash
sudo sh system/boot/restaurar.sh
```

O script não configura partições, criptografia, rede, drivers ou autenticação.
A aplicação dos temas de sistema é opcional e altera o GDM/Plymouth.

## Guardar no Git

Repositório: https://github.com/andrefarias11/LinuxMacOs

Para publicar uma cópia sua, crie um repositório vazio, preferencialmente privado,
e configure a URL do seu repositório:

```bash
git remote add origin URL-DO-SEU-REPOSITORIO
git push -u origin main
```

Nenhum repositório remoto é criado ou publicado pelo instalador. Antes de
publicar, confira `git ls-files` e `SOURCES.md`. Os componentes de terceiros
mantêm suas próprias licenças; este repositório não é um produto da Apple.

Mantenha também um backup separado dos seus arquivos de trabalho. Atualizações
futuras do sistema/navegador podem exigir adaptar o kit antes de restaurar.

### Refinamentos de 26/10/2026

- Paleta grafite unificada no terminal, prompt Zsh, cores dos arquivos, Rofi e interface/terminal do VS Code. A referência fica em `~/.config/grafite/palette.json`; editar esse JSON isoladamente não reaplica as cores nos aplicativos.
- Barra de 26 px e relógio em português no formato `seg 26 out 15:03`, pela extensão Mac Refinements para GNOME 46.
- Opção **Encerrar sessão…** na central de controle e no menu da maçã, com ações executadas após fechar o menu.
- Terminal com 12% de transparência e blur restrito a `Gnome-terminal`; borda branca discreta de 1 px e sombras suaves nas janelas compatíveis.

As novas extensões carregam após sair e entrar na sessão. `bat`, `fzf`, `lazygit` e `starship` não são instalados por esses refinamentos. Configurações de Wi-Fi, DNS e VPN não fazem parte deste kit.
