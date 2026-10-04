# Revisão da implementação do Rive na trilha — 03/10/2026

Revisados: cálculo geométrico, limites dos nós/legendas/balão/baú, atualização dos
obstáculos, ResizeObserver e limpeza dos efeitos, estado de carga/falha, SSR e
composição servidor/cliente, dimensionamento CSS, carregamento sob demanda,
movimento reduzido, economia de dados e cobertura dos testes.

## Achados corrigidos

### P2 — Retorno à mesma URL reutilizava um estado de carga inválido

`TrailUnitBody` guardava apenas a última URL pronta. Ao remover e recolocar o
arquivo, ou passar por outro arquivo ainda pendente e voltar, a URL coincidia
com a antiga e a nova instância era exibida antes de carregar. Em módulos estreitos,
isso também reservava espaço para um canvas ainda vazio.

Correção em `packages/community-kids/src/components/kids/trail-unit-body.tsx`:
o estado associa `src` e prontidão, reinicia durante a troca da prop (incluindo
`null`) e ignora notificações de uma URL diferente da atual. A árvore das aulas
e do baú permanece montada. Dois testes Chromium retêm as respostas `.riv`,
fazem as duas sequências e verificam que só há arte/reserva após a nova carga.
Ambos falharam antes e passaram após a correção.

### P2 — Arte invisível aumentava a rolagem no fim da página

`visibility: hidden` não retira a caixa absoluta do overflow rolável. Mesmo sem
padding, a posição calculada abaixo dos nós deixava um vão no último módulo.
Reprodução em 320 × 400: a página passava de 452 para 535 px de altura sem mostrar
nenhuma animação, com economia de dados ligada.

Correção no mesmo componente: a caixa permanece em `top: 0` enquanto oculta e só
assume a posição final junto com a reserva de altura, após a carga. As medidas
de largura/altura continuam disponíveis para o cálculo. Testes com `saveData` e
404 comparam a altura rolável com a trilha sem arte; no caso 404, aguardam a resposta
e a desmontagem do canvas. A reprodução falhou antes e passou após a correção.

## Verificação após as correções

- `bun test tests`: **1173 passaram**, 0 falhas, 139 arquivos.
- Chromium: **12 testes passaram**, incluindo os 7 anteriores e 5 novos cenários.
- Após tornar explícita a espera pelo 404, os 2 testes de overflow passaram novamente.
- `bun run typecheck`, `bun run check` (613 arquivos) e `bun run build`: código de saída 0.
- `git diff --check`: sem erros.
- Atualização do balão para outra aula e estreitamento/alargamento da coluna sem
  resize da janela também passaram. A função geométrica conserva os testes das
  288 combinações de largura, fase da curva e quantidade de aulas.

O ensaio usa componentes/CSS/runtime reais no Chromium com dados locais e o Rive
local do Zappy. Não valida login/backend ou cada upload remoto de módulo. O servidor
do ensaio foi iniciado separadamente, conforme a observação de execução no plano
original; os testes terminaram com código 0. Os outros trabalhos presentes na árvore
(vídeo, Estúdio e Farol) ficaram fora do escopo desta revisão.
