# Full review 2 da Carreira do Criador e do modo Pro

**Data:** 23/07/2026
**Escopo:** estado de `staging` após a consolidação de 22/07 (commits `41ae52ab` + `f0842650`) — `core` (career), `members` (trava entre cursos, autoria, migrations), `community-kids` (cards/423/CSP), `member-shell` (studio-tier, BFF Pro), `admin` (autoria de curso + Pro), `studio` (gating de extensões), `studio-runtime`.
**Tipo:** verificação das correções declaradas na auditoria de 22/07 + review fresco (correção/segurança) + correção dos achados confirmados.
**Método:** 1 agente de verificação (R1) + 2 agentes de review adversarial (R2a core/members, R2b Studio Pro). Achados confirmados relidos no código antes de virar fix.

> **Status:** a reforma está sólida. A auditoria de 22/07 declarou "tudo corrigido" e a verificação CONFIRMOU os 6 achados de implementação + documentação. O review fresco encontrou **1 achado ALTO** (trava congelava a etapa sem curso-base publicado) — CORRIGIDO neste lote — e 3 itens de hardening LOW no Studio Pro — 2 corrigidos, 1 registrado. Gates verdes; **NÃO commitado** (aguarda decisão da usuária). A reforma inteira segue só em `staging` (produção ainda não tem `career_slot`).

## Parte 1 — Verificação da auditoria de 22/07 (R1): tudo confirmado

| Achado da auditoria 22/07 | Veredito |
|---|---|
| #1 Autoria de aula Pro funcional no Admin (seletor dos 5 templates + preview remoto + validação server-side do `templateId`) | **CORRIGIDO** — `lesson-editor-client.tsx` monta `professional:true`; `studio-embed.tsx` oferece blocos⇄Pro; members valida `isStudioProTemplateId` no save. |
| #2 Extensão bloqueada fica INATIVA em projeto importado/antigo | **CORRIGIDO** (mecanismo mais forte que o proposto): `project-access.ts` + `StudioCore.tsx` bloqueiam a hidratação inteira (`projectAccessBlocked`) → sem toolbox/Blockly/geração/runtime; tela amigável. |
| #3 423 amigável em curso de etapa futura (só `foundation-first` linka a base) | **CORRIGIDO** — `career-course-locking.ts:32` anexa `foundationCourseSlug` só em `foundation-first`; `cursos/[slug]/page.tsx` trata 423 → `KidsLockedCourse`. |
| #4 BFF Pro limita o corpo pelo STREAM, não Content-Length | **CORRIGIDO** — `member-shell/.../read-json-body.ts` conta bytes e aborta antes do `JSON.parse`; ambos os BFFs usam, cap 2 MB. |
| #5 Imagem do `studio-runtime` reproduzível | **CORRIGIDO** — Dockerfile usa `npm ci --ignore-scripts` + lockfile commitado. |
| #6 CHECK do banco (kids-only, 6 iniciante-2d senão 5) | **CORRIGIDO** — `0049` reescreve o CHECK com a invariante completa. |
| Código residual (`CREATOR_CAREER_VERSION`, reward ids mortos, `SANDBOX_TRANSPORT`, comentários) | **REMOVIDO** — 0 ocorrências. |
| Documentação (member-shell "Pro só na Lenda", members posições exatas, manual, README) | **CORRIGIDO**. |

**Lacunas de teste** (a auditoria listou 9): 6 cobertas. Faltam: (7) teste route-level do BFF `pro-runtime/build` ponta a ponta (sessão + `getLesson` + template autorado + runtime); (9) abrir projeto Pro em `/estudio/pro/[id]`. (4) parcial — a lógica da trava é testada, mas o render do 423→`KidsLockedCourse` no community-kids não tem teste. **Não bloqueiam** (as travas centrais têm cobertura); registradas como follow-up.

## Parte 2 — Review fresco (R2)

### ACHADO ALTO — etapa sem curso-base publicado congela a carreira (CORRIGIDO)

`resolveCareerCourseLock` não sabia se existia um curso-base publicado. Quando uma etapa tinha cursos nas posições 2+ mas nenhum curso-base (posição 1) **publicado** (não cadastrado, em rascunho ou apagado) e o aluno ainda não tinha qualificado o slot 1, TODOS os outros cursos da etapa ficavam travados `foundation-first` para sempre — nada a concluir para liberar — com card sem link. Se a base ausente fosse a do Iniciante 2D, a carreira inteira congelava (o nível `coder` exige o slot 1 do Iniciante 2D). O gate em profundidade devolvia **423 eterno**. Gatilhos plausíveis: o re-tagueamento dos cursos 3D pendente (etapa transitoriamente com slot 2+ sem slot 1), montar uma etapa de baixo p/ cima, ou despublicar/apagar a base.

**Correção (fail-open):** `resolveCareerCourseLock(qualified, tier, slot, foundationAvailable = true)` — sem base alcançável no ramo `foundation-first`, devolve `{locked:false}`. Os dois call sites passam o fato: a projeção da listagem (`careerLocksForCourses`) usa `foundationByTier.has(tier)`; o gate em profundidade (`CheckAccessService`) usa o novo `CourseRepository.hasPublishedFoundationCourse(audience, level, track)` (lookup indexado `limit 1`, só corre no ramo relevante). `future-tier` não é afetado. Testes novos: 1 unit no core + 3 de integração no members (acesso direto sem base publicada, base em rascunho, catálogo). A trava pedagógica só vale quando existe base alcançável; o painel de prontidão continua sinalizando a base faltante.

Arquivos: `packages/core/src/career/catalog.ts`, `packages/members/src/application/career-course-locking/career-course-locking.ts`, `packages/members/src/application/access/check-access.service.ts`, `packages/members/src/domain/ports/course-repository.port.ts` + impl drizzle + fake.

⚠️ **Risco irmão (registrado, não-código):** curso-base sem bloco de Estúdio com vitrine (`showcase.enabled`) conclui mas nunca publica no Mural → slot 1 nunca qualifica → mesma paralisia (a base ESTÁ publicada, então o fail-open não dispara; a base linka mas nunca destrava). Documentado como armadilha operacional em `docs/carreira-do-criador.md`.

### Studio Pro — gate SÓLIDO, sem bypass (R2b)

Verificado: `reward.pro` só em `god`; `resolveStudioTier` deriva Pro do reward (equipe → `god`); a rota `/estudio/pro/[id]` resolve o nível no SERVIDOR (não forjável) e `redirect` antes de renderizar; runtime remoto recria config server-side, sem internet, iframe sem `allow-same-origin`, token em tempo constante, sem SSRF (URL do env); COEP/CSP escopados só na rota Pro; validação de template server-side no save. **Sem bypass.** Achados de hardening:

- **CSP não ancorada por segmento (LOW, CORRIGIDO):** o lookahead `(?!estudio/pro)` era prefixo — uma rota irmã futura de prefixo parecido (ex.: `/estudio/professor`) ficaria SEM CSP. Ancorado em `estudio/pro/`. Não explorável hoje (só existem `/estudio`, `/estudio/loading`, `/estudio/pro/[id]`).
- **`vite.config.cjs` fora do denylist do runtime (LOW, CORRIGIDO):** `.cjs` é extensão permitida e não estava em `RESERVED_PATHS`. Adicionado (a precedência `.mjs`>`.cjs` do Vite protegia hoje, mas o modelo não deve depender disso).
- **Rate limit por execução, não por conta/IP (LOW, REGISTRADO):** `studio-runtime` limita por `executionId` = hash(session,lesson,block); um aluno com vários blocos Pro roda mais builds concorrentes que um bucket sugere, até o teto `max_instances`. Só custo/DoS, limitado por timeouts + posse da aula. Não corrigido (endurecimento opcional: cap por conta no BFF).

### Core/members — verificado OK (R2a)

`assertCareerSlot` revalida o registro MESCLADO no update (mover de etapa que reduz o máximo → 400); curso adulto nunca segura slot; LISTA e gate profundo consistentes (mesma política, mesmo `qualified` do perfil); sem N+1 (adult/privileged curto-circuitam); migrations `0044`–`0049` sem novo 55P04 e coerentes com o domínio. Achados menores não corrigidos (baixo risco): coalesce prefere o snapshot de showcase ao de complete (misplacement de tier se re-nivelar entre os dois marcos — LOW); `careerLocksForCourses` do "meus cursos" pode não linkar a base p/ comprador de curso único (cosmético — kids usa chave-mestra).

## Gates

`bun run typecheck` + `bun test` + `bun run check` verdes em: **core** (13/0), **members** (645/0), **admin** (typecheck + biome), **community-kids** (typecheck + biome), **studio-runtime** (10/0). `packages/studio` NÃO foi tocado (tem WIP não commitado; o achado #2 já estava corrigido no working-tree).

## Parte 3 — Curso-base no Admin (pedido da usuária)

A usuária não achava como cadastrar o curso-base. O mecanismo EXISTIA (é `careerSlot=1`), mas o campo era um input numérico cru "Posição na Carreira do Criador", desabilitado sem explicação fora de Kids, e só na listagem. Feito:

- Dialog de curso extraído p/ `cursos/course-form-dialog.tsx` (`CourseFormDialog`), reusado pela listagem E pelo editor do curso.
- Campo posição virou **`Select` com rótulos** ("Nenhuma — curso bônus", "1 — Curso-base…", 2…), mostrando a ocupação da etapa e desabilitando posição ocupada por outro curso; clamp ao trocar de etapa.
- Painel **Carreira do Criador** clicável: posição vazia → cria mirando etapa+posição; ocupada → edita.
- **"Editar curso"** no header do editor `[courseId]` (atende "editar tb, não só criar").
- Badge "Curso-base" na listagem/painel. Docs: `admin/CLAUDE.md`, `members/CLAUDE.md` (Conceito 12), `docs/carreira-do-criador.md`.

Sem mudança de schema/contrato — o members já validava tudo.

## Follow-ups (não bloqueantes)

1. Teste route-level do BFF `pro-runtime/build` ponta a ponta (lacuna #7).
2. Teste de abrir projeto Pro em `/estudio/pro/[id]` (lacuna #9).
3. Teste de render do 423→`KidsLockedCourse` no community-kids (lacuna #4).
4. Endurecer o rate limit do runtime por conta/IP no BFF (LOW).
5. QA em browser do Admin (curso-base no select/painel/edição) — exige a stack completa (auth/catalog/gateway/admin + login admin), não subida neste lote.
6. Avisar/gate no Admin p/ a armadilha "curso-base sem vitrine" (opcional).
