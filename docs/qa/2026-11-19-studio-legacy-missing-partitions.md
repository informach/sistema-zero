# Migração local: fontes antigas incompletas

## Reprodução e causa

No laboratório v3→v4, `migrateLocalV3Project` retornava sem erro quando encontrava uma cabeça viva sem partições. O chamador não recebia o bloqueio necessário para impedir fallback a formatos anteriores. Histórico, miniatura e marcador órfãos também eram ignorados quando não havia cabeça.

O teste da cabeça reproduziu uma promessa resolvida onde se exigia `migration-pending`. Os três testes de registros órfãos reproduziram o mesmo problema. Logs ignorados: `.cache/mission/legacy-missing-parts-red.txt` e `legacy-orphan-red.txt`.

## Mudança

A migração recusa fontes próprias incompletas, sem apagar ou criar registros. O orçamento global isolado continua sem identificar um projeto. Uma cabeça v3 que já teve suas partições promovidas e possui destino v4 continua idempotente. Cabeças excluídas continuam usando o fluxo de tombstone existente.

## Evidência e limite

`bun test src/project-migrations/localV3.test.ts`: 18 testes aprovados, zero falhas. Além das recusas, a repetição de migração confirmada conserva chaves e cabeça do destino. Logs ignorados: `legacy-missing-parts-green.txt` e `legacy-orphan-green.txt`.

Esses casos usam transações reais do fake-indexeddb para contratos determinísticos. Não equivalem a homologação no navegador nem ativam o armazenamento v4: o padrão permanece v3. O bloqueio só protege os chamadores que usarem este migrador; a conexão com os carregadores e o replay ainda precisa ser concluída.
