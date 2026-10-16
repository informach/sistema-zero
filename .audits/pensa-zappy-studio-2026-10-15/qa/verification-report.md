# Verificação — Pensa, Zappy e Estúdio Pro

> Registro histórico da auditoria inicial. As correções e seus resultados estão em [fixes/report.md](./fixes/report.md); as falhas e logs originais abaixo foram preservados.

**Claim:** verificar separação de responsabilidades, integração dos hosts e fluxos de Pensa/Estúdio/Zappy.
**Verdict: FAIL** para aprovação integral dos fluxos atuais. A auditoria foi concluída com achados; o produto não foi declarado integralmente aprovado.
**Executed:** 15/10/2026, America/Sao_Paulo. Os logs de execução foram gravados entre 20:08 e 20:19. A tabela usa o horário da última escrita de cada log (mtime), que não é necessariamente o início ou o término do processo.
**Environment:** Windows, PowerShell, Bun 1.3.11, checkout `b94714927` com alterações preexistentes de outros escopos.
**Command:** conjunto de comandos abaixo; não existe um único comando de aprovação desta auditoria.
**Exit code:** variável por comando, registrado na tabela.
**Output summary:** suítes majoritariamente aprovadas; lacunas de produto confirmadas em quatro reproduções observacionais; falhas de fixture, cache de ambiente, timeout e cenário de navegador intermitente.
**Warnings:** Biome: 2 warnings e 10 infos; fixtures Vite: chunks grandes e avisos de timings; Node: FORCE_COLOR sobrepõe NO_COLOR.
**Errors:** descritos individualmente abaixo. Nenhuma correção de produção foi realizada.

## Comandos e resultados

Diretório base: `C:/Users/tocha/projects/sistema-zero`. Todos os horários são de 15/10/2026, UTC−03:00.

| Cwd | Command | Hora do log | Exit | Resultado | Log |
|---|---|---|---|---|---|
| raiz | `bunx biome ci packages/pensa packages/studio packages/member-shell` e os quatro hosts Kids revisados | 20:08:25 | 0 | 2.132 arquivos, 2 warnings, 10 infos | [lint.log](./lint.log) |
| packages/pensa | `bun run typecheck` | 20:08:20 | 0 | tsc sem erros | [typecheck-pensa.log](./typecheck-pensa.log) |
| packages/member-shell | `bun run typecheck` | 20:08:20 | 0 | tsc sem erros | [typecheck-member-shell.log](./typecheck-member-shell.log) |
| packages/pensa | `bun test src` | 20:08:49 | 0 | 133 pass | [test-pensa.log](./test-pensa.log) |
| packages/studio | `bun test src` | 20:13:11 | 1 | 9.040 pass, 1 fail por timeout | [test-studio.log](./test-studio.log) |
| packages/member-shell | `bun test` com os 38 argumentos do manifesto | 20:08:44 | 1 | 381 pass, 2 fail | [test-member-shell.log](./test-member-shell.log) |
| packages/community-kids | `bun test` com os 24 argumentos do manifesto | 20:08:46 | 0 | 174 pass | [test-community-kids.log](./test-community-kids.log) |
| packages/members | `bun test` com os 24 argumentos do manifesto | 20:09:29 | 0 | 221 pass | [test-members.log](./test-members.log) |
| packages/member-shell | `bun test tests/studio-ai-reconcile.test.ts` | 20:09:00 | 0 | 2 pass | [reconcile-isolated.log](./reconcile-isolated.log) |
| packages/member-shell | `bun test tests/pensa-ai.test.ts tests/studio-ai-reconcile.test.ts` | 20:11:10 | 1 | 32 pass, 2 fail | [reconcile-pair.log](./reconcile-pair.log) |
| packages/member-shell | mesmo comando, com segredo de teste definido antes do processo | 20:18:22 | 0 | 34 pass | [reconcile-pair-with-env.log](./reconcile-pair-with-env.log) |
| packages/studio | `bun test src/state/projectStorageBrowser.test.ts` | 20:14:17 | 0 | 1 pass | [storage-browser-isolated.log](./storage-browser-isolated.log) |
| packages/studio | `bunx playwright test --config e2e/zappy-assistance.config.ts` | 20:09:53 | 1 | 4 pass, 1 fail | [e2e-zappy-assistance.log](./e2e-zappy-assistance.log) |
| packages/studio | `bunx playwright test --config e2e/zappy-assistance.config.ts --grep orientação --repeat-each 2` | 20:11:35 | 1 | 1 pass, 1 fail | [e2e-zappy-orientation-repeat.log](./e2e-zappy-orientation-repeat.log) |
| packages/studio | `bunx playwright test --config e2e/pro-publication.config.ts` | 20:18:58 | 0 | 1 pass | [e2e-pro-publication.log](./e2e-pro-publication.log) |
| packages/members | `bun test tests/db/studio-ai-account.test.ts tests/db/studio-ai-usage.test.ts tests/db/studio-builder.test.ts` | 20:12:09 | 0 | 20 pass | [db-studio.log](./db-studio.log) |
| packages/members | `bun test tests/db/pensa-journey.repository.test.ts tests/db/pensa-team-v2.test.ts tests/db/pensa-team-v2-migration.test.ts` | 20:12:20 | 1 | 15 pass, 14 fail, 1 error | [db-pensa.log](./db-pensa.log) |
| packages/members | `bun test tests/db/pensa-journey.repository.test.ts`, após migrações somente no banco temporário | 20:15:38 | 0 | 19 pass | [db-pensa-with-studio-migrations.log](./db-pensa-with-studio-migrations.log) |
| raiz | comando de reproduções abaixo | 20:15:35 | 0 | 4 observações confirmadas, 10 asserts | [reproductions.log](./reproductions.log) |

Os manifestos foram extraídos dos cabeçalhos dos logs, preservando a lista exata dos testes executados. Para repetir os três recortes, no cwd do pacote correspondente:

```powershell
# packages/member-shell
bun test @(Get-Content ../../.audits/pensa-zappy-studio-2026-10-15/qa/member-shell-test-files.txt)

# packages/community-kids
bun test @(Get-Content ../../.audits/pensa-zappy-studio-2026-10-15/qa/community-kids-test-files.txt)

# packages/members
bun test @(Get-Content ../../.audits/pensa-zappy-studio-2026-10-15/qa/members-test-files.txt)
```

Comando de reprodução observacional executado na raiz:

```powershell
bun test --preload ./packages/community-kids/test-setup.ts --preload ./packages/member-shell/tests/setup-env.ts ./.audits/pensa-zappy-studio-2026-10-15/repro-host.test.tsx.txt ./.audits/pensa-zappy-studio-2026-10-15/repro-context.test.ts.txt
```

Esses quatro testes afirmam os comportamentos atualmente observados, inclusive defeitos. Seu PASS prova a observação e não a correção do produto. O loader é substituído para capturar a configuração real de `StudioProEditor`; o hook de tarefa e a montagem da solicitação do tutor são reais. A rota Pro é exercitada com serviços controlados, sem chamada a modelo pago.

Reprodução que fecha a hipótese de cache de ambiente, no pacote member-shell:

```powershell
$env:STUDIO_AI_RECONCILE_CRON_SECRET = 'local-studio-reconciliation-test-only'
bun test tests/pensa-ai.test.ts tests/studio-ai-reconcile.test.ts
```

## Banco real e isolamento

Foi criado um container próprio `audit-pensa-zappy-20261015`, imagem PostgreSQL 16, porta local `127.0.0.1:15459`, sem volume persistente. As URLs de teste apontaram explicitamente para esse servidor:

- `STUDIO_REVIEW_DATABASE_URL`: banco `studio_pro_review`.
- `TEST_DATABASE_URL`: mesma instância local; os testes Pensa criam seus bancos dedicados.
- Nenhum banco de produção foi usado.

A suíte Pensa falhou pela falta de `members.studio_ai_runs`. Depois de aplicar os SQLs reais de migração 0116, 0117, 0118 e 0119 somente em `sistemazero_pensa_v2_test`, a jornada foi repetida e passou. O fixture do repositório não foi modificado.

O container foi parado com `docker stop audit-pensa-zappy-20261015`; como fora criado com `--rm`, foi removido. Outros containers preexistentes não foram alterados.

## Automated Coverage

**Support detected:** sim. Bun, Testing Library e Playwright; testes de PostgreSQL.
**Harness:** suíte de componentes/rotas e fixtures Vite + Playwright com componentes reais e serviços externos simulados.
**Canonical commands:** os configs Playwright listados acima e scripts dos respectivos pacotes.

| Fluxo necessário | Cobertura/resultado |
|---|---|
| Pensa: plano, missão, claim, concorrência e evidência de conclusão | Existente; unidade e PostgreSQL executados; fixture original falha |
| Pensa em equipe: funções, recursos entregues, saída e isolamento | Existente; PostgreSQL executado |
| Clássico → Pro: contrato do guia | Reprodução adicionada somente à auditoria; incompatibilidade confirmada |
| Host Pro → configuração de publicação e atividade | Reprodução adicionada somente à auditoria; ausência confirmada |
| Pro: escrever manualmente sem acionar IA | E2E existente; PASS |
| Pro: explicar seleção e navegar para referência antiga | E2E existente; FAIL intermitente |
| Pro: investigar sem iniciar construção | E2E existente; PASS |
| Pro: proposta de parte/jogo, aplicar explicitamente e desfazer | E2E existente; PASS |
| Player Pro: publicação/revisão, progresso e separação do editor | E2E existente; PASS |
| Conta/ledger/builder: autorização, concorrência e cancelamento | PostgreSQL existente; PASS |
| Percurso real Kids autenticado: Pensa → clássico → Pro → publicar → Pensa | Não executado; exige aplicativo e sessão de teste completos |
| Pro: voz e saldo na tela real | Análise da composição; não validado com serviço de voz real |
| Modelos, OAuth e publicação externa | Não executados; exigem integrações e conta de teste apropriadas |
| Migrações do ambiente de produção | Não inspecionadas |

**Specs added or updated:** somente `../repro-host.test.tsx.txt` e `../repro-context.test.ts.txt`, fora da suíte de produção. Nenhum teste de produção foi modificado.
**Manual-only or blocked:** sessão autenticada ponta a ponta; integrações reais de IA/voz/OAuth; ambiente implantado. O companion `agent-browser` não estava instalado. Foram usadas as fixtures Playwright existentes; não se alegou auditoria visual completa do site.

## Browser Evidence

**Dev server:** Vite build/preview iniciado e encerrado pelos próprios specs. Servidores locais em porta efêmera.
**Authentication method:** fixtures locais sem autenticação real; respostas de backend controladas pelos testes.
**Flows tested count:** 6 cenários distintos nas duas suítes Playwright, mais o teste de armazenamento em Chromium/WebKit. Repetições não são fluxos distintos.
**Viewports:** assistência 1280×900; publicação Desktop Chrome padrão e 360×740; armazenamento com configuração do harness próprio.

| Fluxo | Entrada → saída | Verdict | Evidência |
|---|---|---|---|
| Autoria manual | `http://127.0.0.1:<porta>/` → mesma fixture | PASS | e2e-zappy-assistance.log, primeiro caso |
| Explicar seleção | repetição: `http://127.0.0.1:62980/` → mesma fixture | FAIL/intermitente | trace e contexto abaixo |
| Investigar | `http://127.0.0.1:<porta>/` → mesma fixture | PASS | e2e-zappy-assistance.log, terceiro caso |
| Construir parte | mesma fixture local | PASS | aplicação explícita e reversão verificadas |
| Construir jogo | mesma fixture local | PASS | aplicação explícita e reversão verificadas |
| Publicação/player | fixture local → mesma fixture; iframe runtime.test interceptado | PASS | e2e-pro-publication.log e screenshot mobile |
| Armazenamento | fixture local, recargas e duas abas | FAIL no conjunto; PASS isolado | logs do Estúdio e storage-browser-isolated.log |

As portas dos cenários aprovados não foram preservadas pelos reporters; não foram inventadas aqui. A porta 62980 foi extraída do trace da repetição.

Artefatos:

- [Contexto da falha do Monaco](./browser-evidence/zappy-assistance-orientaçã-b69b7-ncia-stale-avisa-sem-editar-error-context.md).
- [Trace Playwright](./browser-evidence/zappy-assistance-orientaçã-b69b7-ncia-stale-avisa-sem-editar-trace.zip).
- [Screenshot do player em 360×740](./browser-evidence/published-mobile.png), inspecionado visualmente. Os controles superiores sem estilo pertencem à fixture de prova, não ao site final.
- Não houve screenshot dedicado preservado para cada cenário aprovado de assistência. O log e as assertions são a evidência disponível.

**Blocked flows:** validação visual/manual da rota Kids autenticada e comportamento dos serviços externos.

## Diagnóstico das falhas

- **Pensa DB:** causa confirmada: fixture não acompanha a tabela agora consumida pelo cálculo comum de franquia. O reaproveitamento dessa base exige migrações coordenadas.
- **Reconcile:** causa confirmada por contraste: cache de `getEnv()` aquecido antes da definição local do segredo. Par falha sem configuração inicial e passa com ela.
- **Storage browser:** timeout do subprocesso no conjunto; ambas as engines tinham impresso sucesso antes do encerramento. Isolado passou. Causa exata da demora de saída não isolada.
- **Monaco:** ação não abriu o campo do Zappy em parte das execuções. Não atribuída com certeza ao código do produto nem descartada como problema apenas do teste.

## Issues filed

8 arquivos em [issues](./issues/), todos abertos, sem correção aplicada:

| ID | Severidade | Prioridade | Tema |
|---|---|---|---|
| BUG-001 | High | P1 | Publicação ausente no host Pro |
| BUG-002 | High | P1 | Guia de blocos mantido no Pro |
| BUG-003 | Medium | P2 | Notas não chegam à conversa |
| BUG-004 | Medium | P2 | Voz e saldo divergentes |
| BUG-005 | Medium | P2 | Atividade diária ausente no Pro |
| BUG-006 | Medium | P2 | Pro depende da disponibilidade dos blocos |
| BUG-007 | Low | P3 | Saída perde origem do Pensa |
| BUG-008 | Medium | P2 | Fixture Pensa não acompanha esquema compartilhado |

Não há casos TC-* prévios nesta pasta. A aprovação integral continua pendente das correções e da verificação do percurso real, conforme o [relatório principal](../../architectural-analysis-pensa-zappy-studio-2026-10-15.md).
