# Pedidos dos moradores no Estúdio

A proposta (versão 3) tem três tipos de desafio; o terceiro é "Dos moradores: pedidos curtos,
como uma placa que acende à noite" (§6.28, A23). Aqui fica o conteúdo desse tipo
(`tipo: 'pedido-de-morador'`), que nunca pinta a ilha nem entra no desafio do dia.

- **A placa da noite** (Nico, sua ilha): o cenário, as duas placas e o Se que escolhe qual
  desenhar vêm prontos; falta a barra de espaço guardar verdadeiro em `acesa`. Extra: o Enter
  apaga. Só blocos da trilha do Faísca. Feito, a placa do Nico na praia acende à noite no jogo
  (`mundo/placa-do-pedido.tsx`); na conversa com o morador, o cartão "Pedido no Estúdio" abre o
  desafio.

- **Os pedidos das ilhas do anel** (lacunas, 01/11/2026, `pedidos-das-ilhas.ts`): um por ilha, uma
  luz que acende por uma regra do jeito da ilha, só com teclas.

  | Morador | Ilha | Pedido | A regra | Extra |
  |---|---|---|---|---|
  | Capi | Bosque | A lanterna da cabana | o espaço liga e desliga (Se com senão) | o Enter apaga sempre |
  | Bento | Vila Doce | O letreiro da confeitaria | acende no terceiro bolo | o Enter começa outra fornada |
  | Maré | Recife | A boia de luz | acende só com a maré baixa | a seta para cima sobe a maré |
  | Floco | Pico | A luz do iglu | acende enquanto houver lenha | o Enter traz lenha nova |
  | Jade | Vale | A fogueira dos ninhos | acende só com as duas lenhas | o Enter apaga e devolve as lenhas |
  | Iriê | Nuvens | O farol das nuvens | acender custa 2 de energia | a seta para cima recarrega |

  Pela Jornada, a primeira atividade de uma ilha reaplica o que veio antes: o Bosque usa só os
  blocos do Faísca; as outras ilhas, os do Faísca e do Construtor. Um manifesto por ilha e público
  (`<ilha>-moradores.manifesto.json`).

Gerar: `bun docs/desafios-do-jogo/moradores/gerar-manifesto.ts`. Testes:
`bun test docs/desafios-do-jogo/moradores` e o executor real em
`packages/studio-runtime/tests/pedido-do-nico-browser.test.ts` e `pedidos-das-ilhas-browser.test.ts`
(com `SZ_CHECK_CHROMIUM` apontando para o executável do Chrome): o
gabarito passa, e o inicial, a barra de espaço que apaga e o extra sem Enter falham onde devem.
