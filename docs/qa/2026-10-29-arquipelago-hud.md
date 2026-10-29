# Arquipélago: HUD nova, menu de pausa e abertura "O Cinza" (29/10/2026)

Implementação da proposta aprovada no canvas "Arquipélago Vagalume: nova interface e cutscene"
(https://claude.ai/artifact/Mz6AmdkuYdc9jb3mR6yuPd). Prints em `2026-10-29-arquipelago-hud/`.

## O que entrou

- **Visual "luz de vagalume"**: cartões de vidro escuro, dourado de destaque, as cores fixas das
  necessidades (fome coral, energia amarela, diversão lilás), títulos em Baloo 2 e texto em Nunito
  (as fontes que a página do Kids já carrega; no adulto ficam as dele), botões com degrau e ícones
  desenhados (`interface/icones.tsx`) no lugar dos emojis da HUD e do menu.
- **HUD no computador**: quem joga (inicial no anel, marco da jornada, necessidades e moedas da
  conta), a ilha onde está com o Quadro das Cores dela, relógio com clima, tempo livre e menu, o
  "Agora", o cartão do Zappy, a barra da mochila com as teclas 1 a 5, o botão do modo foto e
  Viver/Construir no canto.
- **HUD no celular**: barra compacta no alto, o "Agora" numa linha, o botão "Usar" acende quando há
  algo perto, foto e modos embaixo do cartão.
- **HUD de atividade**: na corrida e no balão somem o "Agora", a ilha, a mochila, as moedas e os
  modos; ficam a barra da corrida (nome, tempo, um ponto por coisa a pegar, Parar) e, no balão, a
  altura com o fogo.
- **Menu de pausa**: lugares à esquerda (Início, Diário, Álbum, Caderno dos Lumis, Mapa, Família,
  Conforto e controles, Voltar), o começo no meio (Continuar, Modo foto, o diário, as coleções, as
  ferramentas e o clima) e o mapa à direita. No celular os lugares viram abas.
- **Abertura "O Cinza"**: 8 cenas em papel recortado (73 s), legenda sempre ligada, Enter ou toque
  passa a cena, segurar Espaço (ou o botão) pula, Esc fecha; no fim a tela entra pela janela acesa
  e a HUD aparece devagar. Aparece sozinha uma vez por perfil em cada aparelho e fica no Diário
  ("Rever a abertura: O Cinza"). Com menos movimento, nada desliza.

## Como conferir

```
bun build playground/verificar-hud-browser.ts --target=node --external playwright-core --outfile .cache/verificar-hud-browser.mjs
node .cache/verificar-hud-browser.mjs
```

No playground, `?abertura=1` mostra a abertura (sem ele, o playground a marca como vista).

Resultado (computador 1280×720, notebook 1024×640, celular 390×844 com toque e menos movimento):
a abertura passa e pula; o Zappy fala depois dela; nenhuma parte da HUD cobre outra no quarto, lá
fora e na corrida; a tecla 1 calça os patins; menu, conforto, diário e rever a abertura funcionam.

Também rodados: `verificar-pele-adulta`, `verificar-visitas`, `verificar-rotina`,
`verificar-mini-estudio`, `verificar-salvamento`, `verificar-clima` e `test:qualidade-browser`
(todos passam). `bun test`: 1074 passam. Typecheck com a sessão que cuida dele.

## Revisão completa (antes do commit)

Corrigido depois da revisão: a saída da abertura revelava o fundo vazio (o mundo agora volta a
desenhar no começo da saída); "Rever a abertura" repetia a fala do Zappy e a marca de vista saía
quando a tela do tempo fechava a abertura à força; o HUD piscava antes da abertura (agora ela abre
no carregamento); o Espaço segurado para pular virava pulo; a aba escondida fazia a abertura andar
sozinha; o Conforto e o item ativo do menu ficavam ilegíveis; as teclas 1 a 5 valiam na corrida com
a mochila escondida; a carta perdia o começo no celular em pé; "Você está em Sua ilha" virou "Na sua
ilha"; o mapa só confere a ilha quando está aberto; verificadores da qualidade, do clima, das
receitas e do Vale acompanharam o menu e o relógio novos (os dois últimos sem rodar de novo: só o
nome do botão mudou).

## Decisões e o que ficou de fora

- **Sem voz gravada**: a legenda é a narração. A voz do Zappy depende da geração na autoria.
- **Sem música nem efeitos**: o jogo ainda não tem sistema de som.
- **O aviso da ação** fica embaixo, acima da mochila, e não em cima do objeto: o alvo não traz
  posição no mundo.
- **Seta para a próxima argola** do balão: não entrou (precisa da câmera dentro da cena 3D).
- **A mochila** não tem tela própria: a barra mostra tudo e as teclas valem para os 5 primeiros
  itens que fazem alguma coisa. A aba "Mochila" do menu do canvas não entrou.
- **O retrato** é a inicial do nome no anel (o jogo não tem foto 2D do avatar).
- **O "Agora"** só lembra o que já existe no jogo (porta nova, fome, cansaço, horta, desafio de
  hoje). Não cria tarefa nem dá prêmio.
- **A marca de "já viu a abertura"** fica no aparelho, como o conforto: o salvamento não mudou.
- **Desempenho**: durante a abertura o mundo 3D para de desenhar (`frameloop: 'never'`, como já
  acontece com ferramenta aberta). A HUD não usa desfoque por cima do jogo (pesa em aparelho fraco);
  só o fundo do menu, com o jogo parado.
- O verificador do álbum (`verificar-album-browser.ts`) já estava desatualizado antes desta entrega
  (6 seções e 9 percursos depois do Recife e das Nuvens); só os nomes dos botões foram atualizados.
