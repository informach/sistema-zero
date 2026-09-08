# Verificação das aulas interativas

Registro atualizado em 2026-09-08T20:59:58+00:00. Worktree `sistema-zero-aulas`, base `d40f8fd9`, branch `feat/aulas-interativas`.

## Escopo e conclusão

A implementação organiza os blocos existentes em seções didáticas, preserva uma instância de cada editor de projeto, acrescenta descobertas dentro da aula e remove a prática isolada. Carreira, quizzes, entregas e desbloqueios mantêm seus contratos. Os vídeos continuam usando o upload Vimeo/TUS do admin.

As verificações abaixo cobrem o código e os conteúdos importáveis. A produção dos vídeos e a validação autenticada de todas as aulas em staging continuam pendentes. Os manifestos não foram aplicados a bancos de staging ou produção.

## Evidências

| Claim | Command | Executed timestamp | Exit code | Output summary | Warnings | Errors | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Suíte global, pacotes em sequência | `bun run --filter '*' --sequential test` | 2026-09-08 | 0 | 14.333 testes passaram em 27 pacotes | 46 skips condicionais; os testes de upgrade das aulas foram executados separadamente com Postgres | 0 | PASS |
| Formatação/lint do monorepo | `bun run ci` | 2026-09-08 | 0 | 4.918 arquivos verificados | `moldaDemoAssets.json` já excede 1 MB; não alterado neste lote | 0 | PASS |
| Tipos dos sete pacotes alterados | `bun run typecheck` em core, members, member-shell, api-gateway, admin, community e community-kids | 2026-09-08 | 0 | Todos passaram, incluindo novas rotas e testes | — | 0 | PASS |
| Build Kids | `bun run build` em community-kids | 2026-09-08 | 0 | Build otimizado, TypeScript e geração de páginas concluídos; repetido após a última alteração do player | — | 0 | PASS |
| Build Adult | `bun run build` em community | 2026-09-08 | 0 | Build otimizado, TypeScript e geração de páginas concluídos | — | 0 | PASS |
| Build admin | `bun run build` em admin | 2026-09-08 | 0 | Build otimizado, TypeScript e geração de páginas concluídos | — | 0 | PASS |
| Members incluindo PostgreSQL real e upgrade | `bun run test` com `TEST_DATABASE_URL` e `LEARNING_QA_DATABASE_URL` em bancos locais descartáveis | 2026-09-08 | 0 | 979 testes, 5.758 asserções, nenhum skip | Notices de DDL histórico/aditivo | 0 | PASS |
| Schema alinhado às migrations | `bun run db:generate` em members | 2026-09-08 | 0 | Nenhuma mudança de schema a gerar | — | 0 | PASS |
| Fluxos públicos existentes no navegador | `PW_REUSE_SERVER=1 E2E_PORT=64872 bun run e2e:smoke` em community-kids | 2026-09-08 | 0 | 16 cenários Chromium, login e player móvel, 36,5 segundos | Conflito cosmético NO_COLOR/FORCE_COLOR | 0 | PASS |
| Preservação dos roteiros originais | SHA-256 dos arquivos de Documents comparado a `catalogo.json` | 2026-09-08 | 0 | 27 fontes idênticas; 118 trechos de produção catalogados | — | 0 | PASS |
| Sintaxe dos fragmentos HTML | `node --check --input-type=commonjs` para os scripts de `interacoes/*.html` | 2026-09-08 | 0 | 5 experiências sem erro de sintaxe | — | 0 | PASS |
| Remoção da prática e integridade do diff | `rg` no código executável e `git diff --check` | 2026-09-08 | 0 | Nenhuma rota, serviço ou schema ativo da antiga prática; diff sem erros | A migration histórica e seu teste de remoção permanecem | 0 | PASS |

## Cobertura automática

Há Playwright no Kids (`playwright.config.ts`, comando `e2e:smoke`) e testes DOM com happy-dom/Testing Library. Os serviços e BFFs têm suites HTTP; a persistência foi exercitada em PostgreSQL 16.

- `packages/core/tests/learning.test.ts`: contratos, gabaritos privados, checkpoints, estados inválidos, referências de seção e os 27 manifestos.
- `packages/community-kids/tests/lesson-sections.test.tsx`: continuidade real de estado/DOM do editor hospedeiro, retomada de seção, ajuda contextual, valores distintos no experimento, isolamento de rascunhos por perfil/revisão e conferência na prévia de autoria.
- `packages/member-shell/tests/learning-routes.test.ts`: destinos fixos, limites, perfil ativo, impersonação somente leitura e vinculação da escrita ao perfil exibido.
- `packages/members/tests/integration/learning.test.ts`: rotas HTTP, acesso, autoria, conclusão, revisão, idempotência e ajuda.
- `packages/members/tests/db/learning-migrations.test.ts`: schema anterior com dados reais, aplicação das migrations, preservação de quizzes/projetos/conclusões, CAS concorrente, reimportação, clone, isolamento, relatórios e purga.
- Testes de relatório semanal, autoria de carreira, cadeia do Pinta, certificados e purga foram atualizados e executados. O CI agora cria um banco exclusivo para o teste de upgrade, evitando que ele fique apenas em skip.

### Fluxos que ainda exigem staging

| Fluxo | Classificação | Motivo |
| --- | --- | --- |
| Login e player público móvel | existing-e2e | 16 cenários existentes executados |
| Aula autenticada: trocar seções, editar o projeto, recarregar e retomar | blocked para E2E completo | Navegador integrado indisponível e ambiente E2E local sem sessão/serviços autenticados; partes cobertas por DOM, HTTP e banco |
| Autoria/importação e prévia no admin autenticado | blocked para navegação manual | Sem navegador integrado com acesso ao admin; contratos, rotas, prévia DOM, importação e persistência cobertos automaticamente |
| Upload e reprodução de um vídeo real no Vimeo | blocked para integração externa | Nenhum vídeo foi enviado; é necessário conferir uma mídia real no admin/staging, incluindo privacidade, áudio e legendas |
| Percurso completo dos 27 roteiros | blocked para conteúdo publicado | 118 trechos de demonstração ainda precisam de produção/vinculação; pendências impedem publicação |

O navegador integrado foi inicializado, mas `agent.browsers.list()` retornou `[]`. Os testes Playwright acima usam o harness do repositório e não representam uma revisão visual manual da área autenticada. Não há screenshots dessa área neste relatório.

## Ajustes encontrados na revisão

Comparação JSONB estável na reimportação; parâmetros de rotas admin alinhados ao roteador; bloqueio de ações que descartariam organização não salva; estado local isolado por perfil; uma instância de editor preservada entre seções; contador de experimentos alinhado à avaliação; ordem de tipos compartilhada entre admin/backend; DDL das fixtures atualizado; primeira descoberta incluída no painel/relatório sem exigir XP anterior.

Um rebuild do Kids encontrou `EBUSY` porque o servidor local de QA continuava usando o standalone. O processo exclusivo da porta 64872 foi identificado, encerrado e o build passou. Não foi alterado código para contornar o bloqueio de arquivo.

A primeira execução global em paralelo, simultânea aos builds, encontrou um timeout na inspeção de tema e cinco falhas de inicialização assíncrona dos modelos 3D no Studio. Nenhum arquivo do Studio foi alterado. A inspeção de tema passou isolada em 172 ms e os 23 testes de modelos passaram em 1,63 s. A repetição global com os pacotes em sequência passou: 14.333 testes, nenhuma falha. Todos os 7.936 testes do Studio passaram sem alteração de código ou aumento de timeout.

## Entrega

Commit e push para staging pendentes da conclusão da verificação global. Produção não foi promovida. O checkout original e suas alterações de Molda não entram neste lote.
