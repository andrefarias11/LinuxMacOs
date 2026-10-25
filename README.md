# Meu Zorin com visual macOS escuro

Kit pessoal para reaplicar o desktop registrado em **25/10/2026**, incluindo
Liquid Glass escuro, Dock animada, menu da maçã, central de controle própria,
Spotlight, cantos arredondados, atalhos, fontes e tema do Firefox.

**Alvo: Zorin OS 18.x, Ubuntu noble, GNOME Shell 46, computador x86_64.**
O instalador recusa outras versões: extensões de GNOME não são universais.

## Depois de formatar

Instale a mesma versão do Zorin, entre na sessão e execute como seu usuário:

```bash
git clone URL-DO-SEU-REPOSITORIO zorin-macos-restore
cd zorin-macos-restore
./install.sh --check
./install.sh --apps --system-look
```

Troque `URL-DO-SEU-REPOSITORIO` pela URL real após publicar o repositório.
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
VS Code, DBeaver e Chrome são instalados do Flathub. LocalSend usa o pacote
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

Este diretório já é um repositório Git local. Crie um repositório vazio
**preferencialmente privado** no serviço que você usa e rode:

```bash
git remote add origin URL-DO-SEU-REPOSITORIO
git push -u origin main
```

Nenhum repositório remoto é criado ou publicado pelo instalador. Antes de
publicar, confira `git ls-files` e `SOURCES.md`. Os componentes de terceiros
mantêm suas próprias licenças; este repositório não é um produto da Apple.

Mantenha também um backup separado dos seus arquivos de trabalho. Atualizações
futuras do sistema/navegador podem exigir adaptar o kit antes de restaurar.
