# Benefícios permanentes dos cursos — implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar o Cadê da última aula do guia das campanhas, preservando acesso, resgates e as duas origens confirmadas pela responsável.

**Architecture:** Benefício sem calendário no Referrals, autorização do bloco no BFF e referência da matrícula pelo Members. O resgate existente continua concedendo a oferta do catálogo e registrando uma aquisição idempotente; os relatórios distinguem origem imediata e origem do acesso ao curso.

**Tech Stack:** Bun, TypeScript, Elysia, Drizzle/PostgreSQL e Next.js.

**Spec:** `docs/plans/2026-11-26-beneficios-permanentes-dos-cursos-design.md`.

## Global Constraints

- Uma ativação conforme a vaga do presente; 15 dias reais e 7 divulgados, sem renovação por revisitar a aula.
- Curso de origem ativo, aula/bloco acessíveis, conta própria e público correto.
- Benefício sem início/fim; Campanhas conserva ações com calendário.
- Preservar os dois resgates e termos históricos, sem inventar atribuição anterior.
- Migration gerada pelo comando do projeto; operação de conversão explícita após os serviços compatíveis.
- PR 293 e seus seis serviços seguem sem alterações enquanto a publicação está em andamento.

## Task 1: Contratos e persistência

**Files:** `packages/core/src/commerce/index.ts`, `packages/core/src/referrals/index.ts`, `packages/referrals/src/infrastructure/persistence/drizzle/schema.ts`, repositório e domínio de benefícios.

**Interfaces:** `benefitCode` no presente, `CourseBenefitContext` no resgate, `CourseBenefitView` e origem `course` nos relatórios.

- [x] Adicionar o modelo sem datas e ampliar os checks de donos de códigos/origens.
- [x] Gerar `bun run --filter @sistemazero/referrals db:generate` e conferir journal e snapshot.
- [x] Provar a conversão administrativa em PostgreSQL, mantendo os registros vinculados.

## Task 2: Ativação e cadeia de origem

**Files:** `members` GetLesson e DTO, `member-shell` commerce, `referrals` member-gifts/redeem e contexto de aquisição.

**Interfaces:** Matrícula autorizadora `{entitlementId,sourceKind,sourceId,subscriptionId}`; origem do bloco `{courseSlug,lessonId,blockId}`.

- [x] Propagar a matrícula real que autorizou a aula, sem usar o passe de prévia da equipe.
- [x] Exigir o bloco e curso correspondentes e recusar resgate público do código.
- [x] Gravar contexto e origem imediata `course`; resolver a origem anterior pelo pagamento/resgate da matrícula.
- [x] Provar conta/público/curso vencido, repetição, certificado independente e recuperação.

## Task 3: Admin, edição e entrega

**Files:** Editor do bloco comercial, cadastro do curso, relatório de origem e CSV, gateway e manifestos do guia.

**Interfaces:** Benefícios do curso e relatório com as duas origens, sem calendário de disponibilidade.

- [x] Expor os benefícios no editor e no cadastro do curso e adicionar a origem ao relatório.
- [x] Conferir navegação, totais, pessoas, filtros por período e exportação.
- [ ] Publicar serviços compatíveis depois do encerramento do PR 293; converter o bônus e atualizar os dois ambientes.
- [ ] Confirmar duas campanhas, dois resgates preservados e links antigos funcionais; guardar recibos e integrar as correções à staging local.
