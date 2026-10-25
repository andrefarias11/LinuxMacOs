# Frosted Control Center

Extensão local para GNOME Shell 46. Criada para o Zorin OS 18.1 deste computador.

## Uso

Após a instalação, salve seu trabalho e saia/entre na sessão para o GNOME reconhecer a extensão nova. Clique no ícone de controles da barra, na área de indicadores Wi-Fi/bateria, ou use Super + S. O botão de três pontos do rodapé abre o painel nativo do GNOME.

- Wi-Fi: clique para ligar/desligar; botão direito abre as redes nas Configurações.
- Bluetooth: clique para ligar/desligar; botão direito abre a lista de dispositivos.
- Ícone de envio: LocalSend, já instalado neste PC. Não é AirDrop.
- Foco: alterna os banners; notificações continuam na central.
- Mídia: título, artista, capa e controles do player MPRIS ativo. Sem reprodução, os controles não executam ações.
- Ícones abaixo da mídia: visão geral de janelas e configurações de tela. Não há espelhamento do iPhone.
- Brilho/som: barras reais sincronizadas com o GNOME. Brilho fica indisponível se não houver controle exposto pelo hardware.
- Atalhos inferiores: luz noturna, calculadora, captura de tela e Configurações.
- Cadeado: bloqueio de tela.

## Transparência

O painel é translúcido. O desfoque de vidro usa os módulos já instalados do Blur My Shell 76, com recursos gráficos e conexões próprios. Sem a integração disponível, mantém a transparência e usa o desfoque nativo de fallback. O efeito depende do fundo: no wallpaper grafite, será bem mais discreto que na referência colorida.

## Compatibilidade e limites

O layout é inspirado na referência do iPhone. Recursos Apple exclusivos não são simulados por botões falsos: foram usados equivalentes reais do Linux. Não oferece AirPlay, AirDrop nativo ou iPhone Mirroring. A extensão usa APIs internas do GNOME 46 e foi limitada a essa versão; mudanças de versão do GNOME/Blur My Shell podem exigir adaptação.

## Desativar

Execute `gnome-extensions disable frosted-control-center@local` ou desative Frosted Control Center no aplicativo Extensões. O painel nativo e o ícone anterior voltam sem alterar temas ou aplicativos.

## Validação

Testado em uma sessão GNOME 46 separada: abertura e renderização do painel, sincronização de sliders nos dois sentidos com fontes de teste, estado do modo de foco, ativação/desativação, redirecionamento do painel padrão e acesso ao fallback nativo. Não foram desligados Wi-Fi/Bluetooth nem alterados brilho/volume da sessão real durante os testes. A mídia depende do player fornecer MPRIS. O pareamento e os atalhos que abrem aplicações devem ser conferidos na sessão do usuário após a ativação.
