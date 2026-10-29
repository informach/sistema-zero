# Ilha das Nuvens e Iriê, fase4-06

## Conferência real no navegador

Em 29/10/2026, o verificador terminou com código 0 nas duas telas:
computador 1280 × 720 e celular emulado 390 × 844, com toque e movimento reduzido.
Chromium com SwiftShader, DPR 0,5 e capturas em pixels CSS. Sem acesso a banco remoto.

Nos dois casos foram conferidos:

- Chegada pela ponte, chão e ilha completa carregada.
- Abrir a conversa da Iriê, avançar as duas falas e fechar.
- Subir os três degraus e as quatro plataformas, usando os comandos normais de movimento,
  corrida e pulo, com controle de jogo simulado. Nenhum teleporte entre os degraus e o topo.
- Colisor, desenho e âncora acompanhando a mesma plataforma.
- Pausa de 1,2 s sem alterar corpo ou plataformas.
- Sair para a ilha central, conferir a liberação da ilha completa, voltar e conversar novamente.
- Nenhum erro de página e nenhuma rolagem horizontal.

O transporte de QA só prepara o ponto inicial de cada cenário (ponte, conversa, início dos
  degraus e saída/retorno). Não é uma partida completa desde a ilha central. O celular usa
  toque nos botões e o mesmo controle simulado para os saltos. Isso não comprova a ergonomia
  do joystick virtual nem o desempenho de um celular físico.

Os arquivos `resultado-computador.json` e `resultado-celular.json` registram os marcos de chegada, conversa, subida e retorno, além das duas medições
  da pausa. As capturas foram inspecionadas visualmente.

## Reprodução

No pacote `packages/arquipelago`, com as dependências instaladas:

```powershell
$env:ARQUIPELAGO_CHROMIUM = 'caminho/do/chrome'
$env:ARQUIPELAGO_PRINTS = 'caminho/novo/para/evidencias'
bun build playground/verificar-nuvens-browser.ts --target=node --external playwright-core --outfile .cache/verificar-nuvens-browser.mjs
node .cache/verificar-nuvens-browser.mjs
```

O script cria e encerra o próprio playground e navegador. Usa `?posicao=7`, porta local
  dinâmica e `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Prints

| Momento | Computador | Celular emulado |
| --- | --- | --- |
| Chegada | [Abrir](nuvens-computador-chegada.png) | [Abrir](nuvens-celular-chegada.png) |
| Iriê | [Abrir](nuvens-computador-irie.png) | [Abrir](nuvens-celular-irie.png) |
| Primeira plataforma | [Abrir](nuvens-computador-plataforma-1.png) | [Abrir](nuvens-celular-plataforma-1.png) |
| Quarta plataforma | [Abrir](nuvens-computador-topo.png) | [Abrir](nuvens-celular-topo.png) |
| Pausa | [Abrir](nuvens-computador-pausa.png) | [Abrir](nuvens-celular-pausa.png) |

## Revisão e limites

A primeira tentativa encontrou a ponte terminando sete metros abaixo das Nuvens. A correção
  altera somente a altura final dessa ponte e tem teste de inclinação. As tentativas seguintes
  ajustaram o sincronismo de entrada do verificador sob SwiftShader e o foco após fechar o menu.
  A tentativa integrada ainda detectou um salto pedido depois de sair do apoio. O robô agora
  decide junto com a leitura do gamepad, sem um temporizador concorrente. As duas execuções
  finais, computador e celular, passaram sem ignorar cenários, sobre a base remota 12b17e1dc.

Os testes geométricos leem os GLBs reais. A física usa o controlador Rapier existente e prova
  transporte, salto e trajetórias iguais a 30 e 60 quadros. Nenhum GLB, gerador ou salvamento
  foi alterado nesta entrega. Não houve pedido de arte adicional.

Pendente fora desta conferência: aparelho móvel físico, controle por joystick virtual com mãos
  reais e desempenho em GPU real. Balão, constelações e clima são das próximas fases.

## Verificações do lote integrado

Base remota `12b17e1dc`, em worktree isolado, com as alterações desta fase:

- `bun test`: 906 passaram, 0 falhas, 1 ignorado; 907 testes em 104 arquivos, 124590 asserções.
  O ignorado exige Postgres local para a fila durável; nenhum banco remoto foi usado.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck`: código 0.
- `bunx biome check` nos 17 arquivos TypeScript/TSX tocados: código 0.
- `git diff --check`: código 0. Revisão completa do diff e das capturas.
- Verificador integrado: computador e celular emulado, cada execução com código 0.

Bun local 1.3.11, Node 24.15.0 e Chrome do computador. Instalação congelada, com scripts
  de dependências desabilitados. A revisão confirmou que não entraram alterações de outras
  frentes ainda em edição, mudanças de arte, de salvamento, de ambiente ou de CI neste lote.

Após conciliar também os commits locais do Vale (`fe1c07d7c` e `c722b51f1`), nova execução
  completa: 916 passaram, 0 falhas, 1 ignorado; 917 testes em 105 arquivos, 125065 asserções.
  Tipagem com 8192 e Biome passaram novamente. Os conflitos eram acréscimos no final das
  duas documentações; as seções de ambas as fases foram preservadas. O código do quadro
  compartilhado foi extraído sem mudar suas medidas ou posição. Não se atribui uma nova
  execução de navegador a esse último rebase; a execução visual está vinculada à base acima.
