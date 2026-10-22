# Smoke gráfico do witness causal Python — 22/10/2026

F3 e Space Arena passaram em **diagnósticos locais de 10 segundos**, executados em
sequência. Cada ensaio usou somente o servidor Bun do runtime e um Chrome headless.
As 30 entradas confiáveis de cada caso tiveram 30 efeitos visuais correlacionados.
Isso qualifica o funcionamento do novo instrumento nessa composição; **não fecha o
aceite de dez minutos**, a máquina de referência, carga de turma ou produção.

## Composição e integridade

- Node 24.22.0, Bun 1.4.3, Playwright 1.60.0 e Chrome 155.0.8059.85, em Windows.
- Distribuição exata `65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c`,
  produzida pelo builder canônico e conferida pelo servidor antes de servir arquivos.
- Bun SHA-256 `095db4abae203d42f29fdec26da4a882fcde6333cdd84e40c0c7828c0cf543f6`;
  Node SHA-256 `ba93f9a70bd86fce3ebbb39ec758501458453467aa92a34a0a3602d1e3fc2b9c`.
- Corpus Space: somente os 29 arquivos pinados, 25.220.996 bytes, copiados para a
  cache da worktree de correção. O corpus anterior foi preservado. O harness
  reconferiu fontes, assets e a variante `portable-audio-1.2.0`.
- Ambiente filho fechado, com diretórios próprios de home/AppData/temporários;
  `--no-env-file` no servidor. Não foram lidos tokens, perfis pessoais ou credenciais.
- Porta 5297 conferida livre antes de iniciar; autoridade local gerada novamente
  pelo globalSetup. Nenhum approval/binding/authority antigo foi reutilizado.
- Não houve Next, Vite, Docker, TSC ou outro ensaio pesado simultâneo.
- Os instrumentos de QA ainda estavam em revisão, sem commit próprio durante as
  execuções. O runtime e os módulos originais dos jogos não foram alterados.

O token visual é uma primitiva QA de 6×6 pixels, sem criar outra Turtle. Ele só é
alterado após o efeito correspondente no ator original e entra na mesma atualização
do desenho. O observador lê esses pixels em rAF e os reconfirma após mais uma
oportunidade de apresentação. Não é medição de scanout da GPU. Entrada, cadência
de frames e custo de pintura continuam métricas distintas.

## Resultados observados

| Medida | F3 | Space Arena |
| --- | ---: | ---: |
| Janela UTC | 09:37:59–09:38:20 | 09:39:25–09:39:59 |
| Testes executados | 1 | 1, somente play |
| Jogo medido | 10.012,9 ms | 10.404,2 ms |
| Entradas / witnesses causais | 30 / 30 | 30 / 30 |
| Entrada → apresentação p95 | 56,8 ms | 64,2 ms |
| Entrada → apresentação máxima | 57,8 ms | 68,5 ms |
| Intervalo entre frames p95 | 33,4 ms | 33,4 ms |
| Intervalos observados | 475 | 497 |
| Pintura p95 | 0,2 ms | 0,3 ms |
| Tarefas longas | 0 | 0 |
| Erro causal | nenhum | nenhum |
| RAM livre antes / depois | 2.225 / 2.995 MiB | 3.052 / 2.894 MiB |

Todos os gates existentes do caso selecionado permaneceram ativos, inclusive
100 ms para entrada, 8 ms para pintura, ausência de tarefas longas, classificação
de dois quadros e contagem de witnesses. As janelas curtas aparecem explicitamente
como `diagnostic` nos nomes dos testes e nos anexos. Não foram executados os
30 reinícios nem as partidas de dez minutos neste smoke. A RAM livre é apenas
contexto do sistema; não mede incremento do projeto, pico do processo ou memória
retida. Nenhum mínimo genérico de 4 GiB foi acrescentado.

Os dois runners encerraram com código 0. O Playwright registrou fechamento normal
do navegador; os PIDs conhecidos do CLI, do listener Bun e do browser principal
não estavam presentes na reconciliação final, e a porta 5297 estava fechada.
Não houve encerramento forçado nem intervenção nos aplicativos do usuário.
Essa observação não substitui uma enumeração independente de todos os descendentes
do kernel, F6 de 30 ciclos ou prova de ausência de vazamento.

## Recibos e preparação preservada

Os caminhos abaixo são relativos à worktree de correção. Os recibos e logs estão
em cache ignorado; seus hashes documentam os bytes observados, não tornam o cache
automaticamente disponível num clone. Os relatórios Playwright completos podem
conter caminhos locais e não foram copiados para este resumo público.

| Arquivo | SHA-256 |
| --- | --- |
| `.cache/witness-f3-smoke-20261022-r2/execution-smoke/smoke-receipt.json` | `0bb9cf0f1ebc29f2d0468527e87a0c620450c5f910ce3583781eed87a02975ff` |
| `.cache/witness-f3-smoke-20261022-r2/execution-smoke/report.json` | `855ad5fdf46d7bd61275ac75057237b7bc26da36df1d7c5782a12611e9e8c9d9` |
| `.cache/witness-space-smoke-20261022-r1/execution-smoke/smoke-receipt.json` | `cf69bfe8a24ca9b9a433d2a01c38fb084c4acb5910f42004f842c2c66969069c` |
| `.cache/witness-space-smoke-20261022-r1/execution-smoke/report.json` | `e43b4c741b7ddff124adad3cae4e378d9d570a1bddf7878a323f37499f8d5c3b` |

Houve três falhas de montagem anteriores, sem servidor ou navegador iniciado:

1. R1: a config `.ts` efêmera, fora do pacote ESM, recebeu transformação incompatível
   (`exports is not defined in ES module scope`). O CLI encerrou com código 1;
   cleanup conhecido confirmado. Preservado em
   `.cache/witness-f3-smoke-20261022-r1/execution/smoke-receipt.json`, SHA-256
   `96668243869899f96da16abbcae7f591a4e381e96bfdc105a22d41d55c7194b2`.
2. R2, descoberta: a config `.mts` importava desnecessariamente `defineConfig` a partir
   da raiz, onde `@playwright/test` não é dependência direta. O registro sanitizado
   `discovery-negative1.txt` tem SHA-256
   `ffc647fff9fcd643253243346d5796503dd779ba32993abacb3107519a7e0ecc`.
   Removido esse import, `--list` descobriu o caso corretamente, sem abrir serviços.
3. R2, preflight: o reporter de descoberta já havia reservado `execution`; NoClobber
   recusou sua reutilização antes de qualquer Start. O registro `start-refusal.txt`
   tem SHA-256 `05599ccf82e5ef72cc2eaa1293ba9ebbf7658b991ebb87acb8c37d148934f921`.
   Descoberta e smoke passaram a ter saídas distintas; nenhum arquivo anterior foi
   sobrescrito. Os dois arquivos `.txt` são registros de continuidade, não stdout
   bruto ou recibos de execução gráfica.

As correções ficaram nas configs efêmeras: extensão `.mts`, uso da configuração
real do Studio, saída explícita separada e comando Bun fechado. Nenhum limiar,
asserção de jogo ou byte do runtime foi modificado para obter os resultados verdes.

## Identidade dos instrumentos executados

Hashes registrados após os smokes, com os instrumentos preservados durante as
execuções. Mudanças posteriores exigem nova conferência; não atualizar esses
valores para representar uma execução que não ocorreu.

| Fonte QA | SHA-256 |
| --- | --- |
| `packages/studio/e2e-runtime/gamePerformance.ts` | `7d60db08986771662243aa9d7b5021c175a68383623cc130ab679d8621df91de` |
| `packages/studio/e2e-runtime/performanceAcceptance.ts` | `81f0c3347374a1b4aae7faa42e612f5f1ec44fc6d7f9ae661d6a5ef0ffbfb2c8` |
| `packages/studio/e2e-runtime/python-f3-performance.spec.ts` | `134d4ed62922cc4216b5b7832fbd9bd6acc3e90bdea0ab0567f62cbd7956db41` |
| `packages/studio/e2e-runtime/python-space-arena-performance.spec.ts` | `abbac5bc6bb2e9321904943c7df8b38b2c41db2c100e25183d50cbde923ec9fe` |
| `experiments/studio-python-runtime/qualification/input_presentation.py` | `d61a9f842d5cf65e0345651aff59348f9fdba636a203c7498321eae497e9d890` |
| `experiments/studio-python-runtime/qualification/space_arena_input.py` | `b9197d366ec2d1b6a0d94f98d6d7813fcad7930c099a64abf0a05e4dbc40aadc` |
| `experiments/studio-python-runtime/qualification/space_arena.ts` | `49404fdfd2c2da8ae2feffd61ded78414c6d1cec88fdae96e815ede813d0ab75` |

Continuam pendentes as execuções de aceite de dez minutos, F1 estatístico completo,
demais perfis de desempenho, 30 reinícios, evidência de áudio e integração hospedada.
Os negativos e limites históricos não foram reclassificados por estes dois smokes.
