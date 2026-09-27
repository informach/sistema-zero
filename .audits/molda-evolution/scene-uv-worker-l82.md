# Lote 82 — tarefa cancelável de abertura conectada

`bun scripts/bench-scene-uv-worker.ts`; Windows, AMD Ryzen 5 5600G, Bun 1.3.11.
3 aquecimentos e 20 amostras por caso. Um worker novo por operação, como na UI.
Inclui criação da tarefa, clone, leitura/cálculo no worker e validação/mapeamento
da resposta no processo principal. Não inclui React, comando, histórico ou viewport.
Oráculo integral fora da janela medida; todos os resultados foram idênticos e
mantiveram a referência de posições da origem após aceitar apenas os UVs.

| Faces | Manter cortes | Total p50/p95 ms | Maior intervalo de timer p50/p95 ms |
| --- | --- | --- | --- |
| 256 | Não | 61,297 / 69,762 | 25,339 / 26,678 |
| 256 | Sim | 59,916 / 67,906 | 23,850 / 28,713 |
| 2.304 | Não | 212,251 / 265,271 | 22,307 / 31,095 |
| 2.304 | Sim | 212,449 / 240,570 | 21,652 / 30,651 |
| 9.216 | Não | 748,740 / 848,678 | 43,935 / 60,325 |
| 9.216 | Sim | 738,618 / 885,672 | 46,803 / 53,691 |

Timer solicitado a cada 1 ms não equivale a latência de entrada ou frame de
navegador. Os intervalos ainda passam de 50 ms no maior caso; o worker não elimina
custo de clone/aceitação. Sem promessa de fluidez, FPS ou desempenho em tablets.
Não executar esse benchmark junto de build/suíte completa/outro benchmark.

O modo é explícito, sem cálculo ao mudar o select. Preservação de cortes existentes
é derivada da fonte canônica **dentro do worker**, limitada às faces escolhidas.
Configuração e lista de cortes têm leitura estrita e cópias próprias; resposta
continua limitada a UV Double. Mudança de método/opção/margem cancela a prévia.

Revisão: worker real, protocolo inválido, mudanças em voo, StrictMode, confirmação
dos dois métodos na oficina, COW com outra peça bloqueada e um undo. **1.187 testes,
zero falhas, 172 arquivos, 69,12 s**; typecheck, Biome (540 arquivos), Vite
(0,65 s) e diff-check passaram. Worker UV 20,82 kB; editor UV lazy 18,99/6,26 gzip.
Build Kids anterior é do lote 80. Avaliação visual/toque/GPU real ainda pendente.
