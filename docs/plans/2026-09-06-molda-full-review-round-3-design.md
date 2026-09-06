# Molda — correções do full review, rodada 3

## Objetivo

Corrigir cinco falhas reproduzidas no editor de modelos sem criar estados paralelos frágeis:
ações antigas que reaplicam snapshots, seleção ambígua de faces/arestas, malha que muda no
round-trip, arrasto parcial de grupos e criação silenciosa de face degenerada.

## Decisões

- O `editorStore` terá uma revisão de conteúdo monotônica. Todo commit, replace, amend,
  undo e redo que realmente muda o asset avança a revisão; a miniatura não. Toasts de conserto
  e o painel Ajustar só poderão agir sobre a revisão que os criou.
- A sessão guardará a seleção de malha como elementos explícitos do modo atual. Vértices
  afetados serão derivados apenas para operações geométricas; ferramentas de aresta e face
  receberão as arestas/faces exatas, sem reconstruí-las pela união dos vértices.
- Redimensionar uma peça de malha terminará na mesma representação canônica usada pelo
  sanitize (`meshPrecision` + normalização), recusando atomicamente qualquer colapso de
  topologia.
- Patches absolutos de múltiplas peças serão projetados e validados em conjunto. O caminho
  será compartilhado com `movePartsBy`, e os gêmeos serão sincronizados uma única vez.
- `createFace` validará a geometria antes do commit e confirmará que a nova face sobreviveu à
  normalização.

## Regressões e verificação

Os testes cobrirão mudança de paleta depois de um toast/Ajustar, duas faces opostas escolhidas,
round-trip de resize com vértice fracionário, arrasto real do editor no teto com espelho e três
pontos colineares. A verificação final inclui testes focados, suíte completa, typecheck, Biome e
E2E do Molda, além dos typechecks dos consumidores afetados.
