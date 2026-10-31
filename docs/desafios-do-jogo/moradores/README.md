# Pedidos dos moradores no Estúdio

A proposta (versão 3) tem três tipos de desafio; o terceiro é "Dos moradores: pedidos curtos,
como uma placa que acende à noite" (§6.28, A23). Aqui fica o conteúdo desse tipo
(`tipo: 'pedido-de-morador'`), que nunca pinta a ilha nem entra no desafio do dia.

- **A placa da noite** (Nico, sua ilha): o cenário, as duas placas e o Se que escolhe qual
  desenhar vêm prontos; falta a barra de espaço guardar verdadeiro em `acesa`. Extra: o Enter
  apaga. Só blocos da trilha do Faísca. Feito, a placa do Nico na praia acende à noite no jogo
  (`mundo/placa-do-pedido.tsx`); na conversa com o morador, o cartão "Pedido no Estúdio" abre o
  desafio.

Gerar: `bun docs/desafios-do-jogo/moradores/gerar-manifesto.ts`. Testes:
`bun test docs/desafios-do-jogo/moradores` e o executor real em
`packages/studio-runtime/tests/pedido-do-nico-browser.test.ts` (com `SZ_CHECK_CHROMIUM`): o
gabarito passa, e o inicial, a barra de espaço que apaga e o extra sem Enter falham onde devem.
