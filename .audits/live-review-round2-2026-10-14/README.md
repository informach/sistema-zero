# Evidências da segunda revisão das oficinas ao vivo

> Esta pasta preserva a revisão anterior à correção. Os arquivos de reprodução foram renomeados para `*.historical.txt` para não executar asserções que exigem o defeito. Os testes atuais e os resultados das correções estão descritos em [live-round2-corrections-2026-10-14.md](../live-round2-corrections-2026-10-14.md). Os comandos históricos abaixo correspondem ao estado anterior.

Relatório: [architectural-analysis-2026-10-14-live-round2.md](../architectural-analysis-2026-10-14-live-round2.md).

Esta pasta contém o inventário, os logs desta rodada e reproduções dos cinco achados. Não contém correções da aplicação.

| Arquivo | Uso |
| --- | --- |
| `scope-inventory.json` | 228 arquivos de escopo em 11 pacotes; inclui metadados e recursos, não somente código |
| `inventory.py` | Regenera o inventário sem alterar arquivos de produto |
| `fixture.ts` | Monta uma oficina com os serviços reais e um relógio controlado |
| `reproductions.test.ts` | R1, R3 e R5 no serviço real; R2 com PostgreSQL e repositórios reais |
| `classroom.test.tsx` | R1 no componente da sala, integrado ao serviço real |
| `publication.test.ts` | R4 na rota real de publicação com transporte/armazenamento simulados |
| `*.log` | Saídas dos comandos executados nesta rodada |

As seis reproduções são evidência de **comportamento defeituoso**: elas passam quando conseguem demonstrar o problema. Na correção, criar testes de aceitação que exijam o comportamento esperado e preservar estas reproduções como histórico, sem confundi-las com aprovação da funcionalidade.

Executar cada arquivo de reprodução em um processo separado. Os mocks de módulos do Bun usados nos testes de fronteira não devem contaminar as demais suítes.

Na raiz:

```powershell
bun test ./.audits/live-review-round2-2026-10-14/reproductions.test.ts
bun test ./.audits/live-review-round2-2026-10-14/publication.test.ts
```

Em `packages/community-kids`:

```powershell
bun test ../../.audits/live-review-round2-2026-10-14/classroom.test.tsx
```

R2 solicita o banco de testes `sistemazero_live_corrections_test`; uma `TEST_DATABASE_URL` explícita prevalece sobre esse nome. Nesta rodada foi usado PostgreSQL local. Sem banco disponível, a descoberta local pode ignorar R2; com `TEST_DATABASE_URL` definida, uma conexão inválida provoca falha. O log desta rodada registra quatro testes executados no arquivo e nenhuma omissão.

Os 386 testes existentes selecionados passaram nesta rodada. `bun run typecheck` terminou com código 0 em Members, member-shell, Admin, community-kids, Estúdio, live-recorder e live-supervisor. O teste do gravador usa Chromium/FFmpeg reais, mas as fronteiras externas são simuladas. Não houve aula real com oito dispositivos, teste visual no navegador, deploy ou novo build de produção.
