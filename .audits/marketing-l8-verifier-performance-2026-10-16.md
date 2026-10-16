# Verificação de arquivos — fila de importação L8

O worker adquiria um único arquivo por timer de cinco segundos. Na carga real,
156 intervalos entre confirmações tiveram mediana de 5,009 s e p95 de 5,302 s.
A fila continuava crescendo apesar de arquivos pequenos já disponíveis no R2.
O perfil de parede do ensaio isolado atribuiu aproximadamente 98% do tempo à
espera entre ciclos, não ao hash/stream. Oportunidade: impacto 5 × confiança 5 /
esforço 2 = 12,5.

Alteração única de agendamento: cada ciclo adquire/processa até 20 arquivos em
sequência. Continua existindo somente uma leitura e um ciclo ativos. Não mudou
o timer ocioso, o algoritmo de hash, o limite de memória por stream, a ordem de
aquisição, a renovação/fencing de concessão, o timeout por arquivo ou o backoff
de falhas. Encerramento impede novas aquisições, cancela a leitura e devolve
concessões adquiridas durante a corrida de parada.

Ensaio reproduzível: `packages/marketing/scripts/benchmark-asset-verifier.ts`,
30 arquivos de 256 KiB (incluindo um hash divergente), três aquecimentos e dez
rodadas. Poll reduzido a 20 ms somente no harness para isolar o agendador; não
representa latência R2/SQL nem throughput de produção. Perfis antes/depois ficam
em `.cache/asset-verifier-{before,after}.json`.

| Medida | Antes | Depois |
|---|---:|---:|
| p50 por fila | 942,37 ms | 62,11 ms |
| p95 por fila | 1.003,97 ms | 64,26 ms |
| Arquivos/s no ensaio | 31,83 | 483,01 |
| RSS máximo do processo | 145.592.320 B | 157.573.120 B |

Não há promessa de redução de memória: RSS variou +8,2%, com apenas um stream
ativo em ambas as versões. A alteração visa remover a espera por item.

Prova de comportamento: ordem e desempate continuam determinados pelo mesmo
claim sequencial; sem ponto flutuante ou RNG relevante para verificação. Os
resultados ordenados (ID, validade, erro, possibilidade de retomada) tiveram
SHA-256 idêntico nas vinte rodadas:
`3540d94f0ff5bb61753ca9ed41756b81d410ea6c91287ad94ac06954d800a84c`.

Cinco testes novos cobrem lote limitado, ausência de ciclos sobrepostos, hash
divergente, falha transitória, parada durante stream/aquisição e recuperação de
falha no repositório. A mutação de volta para um item/ciclo é detectada
(`tests-l8-verifier-red.log`). Suíte backend com PostgreSQL: 333 testes e 1.873
assertions, zero falhas (`tests-l8-verifier-all.log`). O teste PostgreSQL de
concessão perdida continua garantindo que worker antigo não confirme um asset.

Na stack nativa conectada ao R2 de staging, após reinício do worker, 90
confirmações observadas em dois minutos tiveram intervalo mediano de 0,641 s e
p95 de 1,248 s. A fila acumulada foi esvaziada sem falhas de integridade. O
reinício interrompeu o cliente com erro explícito na pasta P09; a mesma seleção
retomou os recibos e continuou carregando as origens, sem novo inventário. Não
é uma medição de throughput de toda a carga nem prova de migração concluída.

Rollback: reverter somente a alteração do agendador; não há migração de dados
nem mudança de manifesto/storage.
