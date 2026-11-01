# Manual do Arquipélago Vagalume

O manual do jogo para a equipe e para os pais (01/11/2026): a história, os controles, a sua ilha, a
casa, as seis ilhas do anel, o Farol, os Lumis, os desafios, os percursos, as coleções, a economia,
as festas, a família, a pele adulta e as ilhas em três versões, com 69 telas reais do jogo, e cada
um dos 85 desafios (capítulo 10).

- Publicado no canvas: https://claude.ai/artifact/RA7uwgWrFb8ma6NFmMnmrt (privado; compartilhar pela
  própria página).
- `index.html` e `img/` são a mesma página (abre direto no navegador).

## Refazer as telas

No pacote `packages/arquipelago`:

1. `bun playground/pontos-do-manual.ts .cache/pontos-do-manual.json` (os lugares de cada ilha no
   mundo, lidos das âncoras dos GLBs).
2. `bun build playground/capturar-manual.ts --target=node --external playwright-core --outfile .cache/capturar-manual.mjs && node .cache/capturar-manual.mjs`
   (as vistas das ilhas e as telas de jogar, com todas as ilhas coloridas: `?quadros=todos` do
   playground). `ARQUIPELAGO_SO` escolhe as tomadas.
3. As telas das mecânicas saem dos próprios verificadores do playground (`verificar-*-browser.ts`,
   com `ARQUIPELAGO_PRINTS`).
4. `node docs/arquipelago-manual/montar-imagens.mjs` junta tudo em `img/` (JPEG até 1280 px); os
   caminhos de origem estão no começo do script.

O capítulo 10 (missões, minijogos e cada um dos desafios) é gerado dos manifestos dos desafios:
`bun docs/arquipelago-manual/desafios.ts` regrava `desafios.html` e o encaixa no `index.html`
(entre os marcadores `desafios:inicio` e `desafios:fim`). Rode de novo quando um manifesto mudar. As
missões no mundo e o resumo do minijogo de cada ilha estão no próprio script.

O texto saiu das regras (`docs/arquipelago-regras.md`) e do código; quando uma regra mudar, mude o
manual junto.
