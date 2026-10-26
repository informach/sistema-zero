# Integração da jornada com o remoto — 26/10/2026

Foi integrado `origin/staging` em `6955dc048` (entrada, páginas públicas e telas restantes
do Canvas adulto), pelo merge local `b8582a213`. O commit local `6c527e151` de Cadê foi
preservado. A integração não reescreveu histórico nem publicou alterações no remoto.

O remoto alterou 33 arquivos; cinco coincidiam com alterações locais da jornada. Os dois
conflitos de conteúdo ficaram em catálogo e detalhe de etapa. A resolução preserva:

- O mapa, próximo passo, pares 2D/3D, missões, Poderes e extras do currículo novo.
- O visual remoto, seus cartões de liberação e o funcionamento da jornada histórica.
- As faixas intermediária e profissional do Molda nos cartões de capacidades.
- As novas telas de progresso e criação com os componentes da jornada.
- Lenda encaminhada às Maestrias; postos inexistentes continuam retornando 404.

A inspeção revelou um ajuste semântico nos avisos de ferramenta: o cálculo histórico
anunciava a etapa seguinte, mas o novo currículo libera ferramentas durante as bases,
o par ou o curso do próprio posto. `toolStageTitle` e `ToolNotice` agora distinguem essas
regras. Pensa não anuncia mais um curso avançado quando o currículo usa o par configurado.
Os testes novos reproduziram as duas divergências antes da correção.

## Preservação

Antes do merge foram copiados 210 arquivos modificados ou novos, com hashes, patch binário
e referência de backup. Apenas os cinco caminhos sobrepostos foram temporariamente guardados
no stash para integrar e reaplicar. O índice voltou ao estado sem alterações preparadas.

A conferência posterior encontrou 201 arquivos fora da sobreposição idênticos à cópia.
Quatro arquivos de `docs/como-fazer*` receberam alterações durante a execução; esta integração
não os editou nem restaurou uma versão anterior sobre eles. As cópias e o stash de segurança
continuam disponíveis em `output/journey-remote-integration-20261026` e no Git.

## Verificação

- Comunidade adulta: 41 testes passaram, incluindo um wrapper com quatro casos de rotas
  renderizadas no servidor. Cobrem currículo, legado, catálogo, redirecionamento, 404,
  bloqueios de cursos/ferramentas e continuidade.
- Núcleo compartilhado: 18 testes passaram — jornada, envio de Maestria, BFF e faixas Molda.
- Navegador: 32 cenários passaram usando um processo novo da prévia, na porta local 4396,
  compilado com o CSS integrado. Abrangem Kids/adulto/Admin, três larguras, Maestrias e galeria.
- Tipos da comunidade: `bun run typecheck` passou. Biome conferiu os nove arquivos desta
  integração sem alterações pendentes; `git diff --check` passou, sem conflitos no índice.
- Após o ajuste de tipos no teste, a repetição dos testes de avisos e rotas passou:
  23 testes, sem falhas. A captura móvel do mapa adulto também foi inspecionada.

Logs desta rodada: `output/journey-remote-integration-20261026/`. Não houve nova migration,
execução de seed, escrita em banco remoto ou deploy. A ativação da jornada continua seguindo
o [roteiro do seed](jornada-criador-seed.md).
