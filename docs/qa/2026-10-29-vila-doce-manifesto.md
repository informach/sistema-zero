# Conferência do manifesto da Vila Doce

Fase2-11: A corrida do entregador, um Quadro das Cores e três desafios do dia.

## Resultado

- Schema, paleta até Inventor, IR, limites, orçamento de execução e correspondência do JSON com as fontes conferidos.
- Oito projetos abertos no Blockly; JavaScript regenerado igual ao salvo.
- Executor real `check-objectives.mjs`, Chromium local e runtime oficial: os 13 objetivos passam nos gabaritos e falham nos iniciais, incluindo os quatro extras.
- Cinco cenários incorretos reprovados: tempo congelado, caixa sem contato, primeira entrega repetida, prazo antigo e caixa nova sem contato.
- Importação, exportação e reimportação pelo HTTP testadas em memória, sem aumentar revisões na segunda importação.

Comandos executados na raiz, salvo indicação:

| Comando | Resultado |
| --- | --- |
| `bun test packages/arquipelago-contracts/tests docs/desafios-do-jogo/vila-doce/vila-doce.test.ts packages/studio/src/blockly/__tests__/vilaDoceManifest.test.ts` | 101 testes aprovados |
| `SZ_CHECK_CHROMIUM` apontando para o Chrome local, `bun test tests/vila-doce-browser.test.ts` em studio-runtime | Aprovado, 65 asserções, sem objetivos indisponíveis |
| `bun test tests/integration/manifestos.test.ts` em arquipelago-api | 16 testes aprovados |
| TypeScript com o `tsconfig.json` da pasta da Vila | Aprovado |
| Biome nos arquivos da entrega | Aprovado |

## Revisão

A subtração do prazo foi ajustada para usar o mesmo IR que o Blockly regenera, evitando
diferença entre arquivo e blocos. O objetivo da Largada agora conclui uma entrega antes de
verificar a contagem zerada, a posição, o prazo e a limpeza do recado. As lojas foram deslocadas
para baixo do cabeçalho para não encobrir o título e a orientação.

## Apresentação

Prévia gerada com `buildPreviewDoc`, Jogo 2D e os assets embutidos do gabarito:

- [Computador, 1280 × 844](2026-10-29-vila-doce-desafio-computador.png)
- [Celular emulado, 390 × 844](2026-10-29-vila-doce-desafio-celular.png)

As capturas mostram o jogo antes da Largada. O teste do executor faz as entradas de teclado
e os cliques no botão do jogo. A apresentação dos controles de toque foi inspecionada;
esta conferência não substitui jogar em um celular físico.

Nenhum banco remoto foi acessado. O arquivo está pronto para conferência e importação pelo
Admin, onde continuam valendo a cobertura do currículo publicado e a disponibilidade do quadro 6.
