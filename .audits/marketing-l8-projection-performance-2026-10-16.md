# Projeção incremental no Electron

A carga do acervo expôs consumo crescente de memória no renderer e
`ERR_NO_BUFFER_SPACE` num computador sob pressão de memória. O perfil de
alocação atribuiu aproximadamente 1,2 GB à fronteira V8/contextBridge em dois
minutos: a interface recebia todo o projeto a cada atualização, mesmo quando
só o estado de sincronização havia mudado. A coleta de diagnóstico reduziu o
heap de 1,88 GB para 38 MB, distinguindo alocações temporárias de retenção
permanente. Nenhuma coleta forçada foi acrescentada à operação do produto.

A alternativa de transportar a visão inteira como JSON foi medida e
descartada. Na prova isolada piorou p50 de 87,8 ms para 178,4 ms e aumentou a
alocação. O produto continua usando objetos tipados pela ponte restrita. Os
resultados dessa alternativa ficam em `.cache/project-view-json-candidate-benchmark.json`.

## Alteração aplicada

- SQLite v7 adiciona relógio local e última alteração por item. Triggers
  transacionais registram inserção, mudança real de payload e remoção. Uma
  falha na transação reverte também relógio e registros de mudança.
- O relógio não é o cursor do servidor: um recibo de gravação pode chegar antes
  de revisões remotas anteriores. O teste reproduz essa ordem e exige ambas.
- IPC retorna apenas itens alterados/remoções desde a versão que o renderer
  possui. A primeira leitura ou uma base posterior ao cache exige retrato
  completo. Rascunhos, conflitos, transferências e estado continuam na resposta.
- O adaptador valida os dados, compartilha leituras concorrentes por projeto,
  conserva ordem/identidade e descarta o cache após revogação. Resposta pendente
  anterior à mudança de acesso não repõe o conteúdo removido.
- Migração v6 → v7 é aditiva e testada com conteúdo existente. Backup nativo
  anterior à migração está em `.cache/projection-v6-backup`, sem segredos de
  autenticação. Versões antigas recusam cache novo em vez de alterá-lo.

## Evidência

Oportunidade: impacto 5 × confiança 5 / esforço 3 = 8,33. Uma mudança de
transporte incremental; não mudou o domínio editorial nem o timer de consulta.

`bun x electron scripts/benchmark-view/main.mjs` no pacote desktop: Electron
44.7.2, 500 itens, visão de 1.951.570 bytes, dez leituras com uma revisão no meio,
três aquecimentos e dez rodadas intercaladas por modalidade. A prova controla
GC somente entre rodadas para comparar o mesmo estado inicial.

| Medida por dez leituras | Visão inteira | Incremental |
|---|---:|---:|
| p50 | 79,5 ms | 12,3 ms |
| p95 | 98,1 ms | 14,4 ms |
| Maior crescimento de heap | 32.938.412 B | 6.208.900 B |
| Maior memória privada do renderer | 71.992 KiB | 40.440 KiB |

Resultados e ordem idênticos nas vinte rodadas, SHA-256 final
`d5024ff1e88000ff49e86c1428b4d074fd8c0a7d37361126ab8966049e8a6a9d`.
Sem ponto flutuante/RNG na projeção; ordenação binária por UUID preservada.
O benchmark isola a ponte; SQLite e o adaptador real são exercitados pelos testes
de integração locais. Evidência em `marketing-desktop/.cache/view-benchmark/evidence.json`.

Na importação real, em janelas observadas de dois minutos, o pico de heap caiu
de 1.880.338.004 B para 72.634.480 B; memória privada máxima do renderer de
2.125.572 KiB para 199.720 KiB. São janelas de carga, com o acervo crescendo,
não um ensaio de rede/CPU isolado. Perfis em `.cache/import-{memory,allocation}-{before,delta}.*`.
Ainda falta medir o percurso colaborativo e o volume completo de L9.

SQLite/adaptador: 14 testes, zero falhas, incluindo migração, recibo adiantado,
reset, reabertura, rollback, concorrência e revogação. Desktop: 43 testes/1.580
assertions, zero falhas. Logs `tests-l8-projection-local.log` e
`tests-l8-projection-desktop-all.log`. Tipos/build passaram na revisão registrada;
o aviso do chunk Studio permanece.

Rollback de código exige uma versão que compreenda cache v7. Não restaurar
automaticamente o backup sobre rascunhos posteriores; preservar/reconciliar o
cache antes de qualquer restauração. Não há migração no servidor nesta mudança.
