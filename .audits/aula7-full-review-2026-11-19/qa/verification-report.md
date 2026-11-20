# Verificação da revisão

**Claim:** revisão do escopo de Aula 7, comércio autenticado e identidade infantil; identificar regressões e riscos de implantação.

**Executed:** 2026-11-19T20:45:47.849807+00:00.

**Command:** comandos por package abaixo, `bun test ./.audits/aula7-full-review-2026-11-19/qa/repros.test.ts`, leituras Git/Railway e validação editorial.

**Exit code:** 0 nas suítes existentes executadas; 1 na suíte adicional de reprodução de defeitos; 0 nas leituras e no Biome.

**Output summary:** 4,973 aprovados, 429 ignorados e zero falhas nas suítes existentes executadas. Quatro testes adicionais falham contra o comportamento esperado. Cinco achados abertos, incluindo um risco de proveniência da release verificado fora da suíte de código.

**Warnings:** ignorados mantêm os contratos de infraestrutura; apenas o subconjunto de Members/Admin relevante foi reexecutado. Os tipos de Members foram conferidos na worktree isolada da entrega. O navegador manual não foi repetido porque `Get-Command agent-browser` não encontrou o comando. Os vídeos da Aula 7 continuam planejados.

**Errors:** R02, R03, R04 e R05 reproduzidos; R01 confirmado pelo Git e pela fonte de deploy. A migration histórica 0059 diverge do hash registrado, mas essa divergência não é uma nova migration desta entrega.

**Verdict: FAIL** para encerrar a revisão sem achados. As verificações básicas passam, mas os cinco achados seguem abertos.

## Comandos e resultados

Os comandos `bun test` abaixo foram executados no diretório do package indicado. Datas correspondem ao fechamento do log, em UTC.

| Escopo | Comando | Executed UTC | Exit | Resultado |
| --- | --- | --- | --- | --- |
| Admin | `bun test tests/lesson-authoring.test.ts` | 2026-11-19T20:41:02.977533+00:00 | 0 | 14 pass, 0 skip, 0 fail |
| Gateway | `bun test` | 2026-11-19T20:41:08.072346+00:00 | 0 | 328 pass, 2 skip, 0 fail |
| Auth | `bun test` | 2026-11-19T20:25:38.547242+00:00 | 0 | 307 pass, 87 skip, 0 fail |
| Catalog | `bun test` | 2026-11-19T20:41:04.666772+00:00 | 0 | 163 pass, 13 skip, 0 fail |
| Editorial | `bun test docs/aulas-interativas-tecnico/qa/curso-para-pais.test.ts` | 2026-11-19T20:36:43.903643+00:00 | 0 | 32 pass, 0 skip, 0 fail |
| Funnel | `bun test` | 2026-11-19T20:25:25.398502+00:00 | 0 | 680 pass, 5 skip, 0 fail |
| Hub | `bun test` | 2026-11-19T20:25:38.893790+00:00 | 0 | 187 pass, 53 skip, 0 fail |
| Member shell | `bun test` | 2026-11-19T20:27:17.146339+00:00 | 0 | 2539 pass, 0 skip, 0 fail |
| Members, release isolada | `bun test tests/integration/certificate.test.ts tests/unit/auth-http.gateway.test.ts tests/unit/live.service.test.ts` | 2026-11-19T20:40:21.109823+00:00 | 0 | 49 pass, 0 skip, 0 fail |
| Payments | `bun test` | 2026-11-19T20:41:08.488896+00:00 | 0 | 439 pass, 219 skip, 0 fail |
| Referrals | `bun test` | 2026-11-19T20:36:44.438112+00:00 | 0 | 214 pass, 50 skip, 0 fail |
| Funnel/PostgreSQL local | `MEMBER_COMMERCE_TEST_DATABASE_URL=<banco local isolado> bun test tests/integration/member-commerce-postgres.test.ts` | 2026-11-19T20:35:10.394578+00:00 | 0 | 1 pass, 0 skip, 0 fail |
| Auth/PostgreSQL local | `PROFILE_ADMISSION_TEST_DATABASE_URL=<banco local isolado> bun test tests/db/profile-admission.repository.test.ts` | 2026-11-19T20:35:12.042162+00:00 | 0 | 20 pass, 0 skip, 0 fail |

Também executados:

- `bun run typecheck`: Auth e Hub na árvore atual; Members na worktree de release. Exit 0.
- `bun x biome check <163 arquivos do escopo>`: exit 0, sem aplicar correções.
- `python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py transformando-o-vilao-em-aliado`: exit 0, sete aulas e 23 clipes, zero erros.
- `bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts transformando-o-vilao-em-aliado --check`: exit 0, arquivos derivados sincronizados.
- `bun test ./.audits/aula7-full-review-2026-11-19/qa/repros.test.ts`: exit 1, quatro falhas confirmadas. Logs mostram nome histórico no Mural, certificado com apelido sem consulta privada, inscrição ao vivo com nome histórico e periodicidade mensal indevida.
- `git fetch --no-tags origin main staging`, seguido por `git cat-file -e <ref>:<arquivo>`: fetch exit 0; arquivos essenciais ausentes em HEAD/origin/main/origin/staging. Ver `source-versioning.json`.
- Leituras Railway: status dos 22 serviços, fonte configurada de Auth em produção, contagens agregadas de perfis legados e inscrições ao vivo, journal e hashes de Members. Nenhum nome de usuário real ou chave de API foi incluído nos relatórios.

## Automated Coverage

- **Support detected:** sim, Bun por package e Playwright em `packages/community-kids/playwright.config.ts`; CI executa `bun run e2e:smoke`.
- **Contract discovery:** o descobridor genérico da raiz sugere npm e não encontra as superfícies dos workspaces. O contrato efetivo foi identificado em package.json, configs Playwright e `.github/workflows/ci.yml`: Bun 1.3.11 e comandos por package.
- **Existing E2E:** smoke Kids e cenários existentes. O fluxo novo completo de presente/perfil/aparelho/certificado permanece `needs-e2e` no harness canônico.
- **Specs added:** apenas `qa/repros.test.ts`, no artefato da revisão. Integração das regressões ao CI fica pendente da correção dos achados.
- **Needs E2E:** presente na aula e retomada; perfis legados; nome privado no certificado; nomes de oficinas; períodos não mensais/anuais do mini checkout.
- **Browser manual:** bloqueado nesta rodada pela ausência de agent-browser. Não foi iniciado um servidor adicional da aplicação. Houve renderização real do formulário via React SSR e teste HTTP pelo harness de integração existente.
- **Fronteiras externas:** cobrança real não foi executada. O teste PostgreSQL usa banco real com duas conexões/pools de uma conexão e gateway financeiro simulado, sem enviar cartão ou Pix ao provedor.
- **Produção:** consultas somente leitura. SUCCESS indica runtime disponível, sem provar por si só todas as regras de negócio.

## Issues Filed

- BUG-001: High/P1, fonte publicada ausente das branches, Open.
- BUG-002: Medium/P2, Mural de perfil-padrão legado, Open.
- BUG-003: Medium/P2, certificado de perfil-padrão legado, Open.
- BUG-004: Medium/P2, nome e apelido em oficinas/Arquipélago, Open.
- BUG-005: Medium/P2, periodicidade trimestral exibida como mensal, Open.

Os dados de teste locais ficaram em um container PostgreSQL exclusivo desta revisão, encerrado ao final. As duas worktrees anteriores, as alterações de aplicação e os ambientes reais foram preservados.
