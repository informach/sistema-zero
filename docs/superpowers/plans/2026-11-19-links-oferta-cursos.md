# Course Offer Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apontar todos os cursos Kids e adultos para a assinatura da Comunidade dos Criadores, em staging e produção.

**Architecture:** Operação de dados pelo executor SSH existente e pelo driver PostgreSQL do Members. Backup integral dos cursos, fingerprint do inventário e atualização transacional somente de `metadata.salesPageUrl`, com incremento de `version` e `updated_at`. Hash dos demais campos e metadados deve permanecer igual; falha faz rollback.

**Tech Stack:** Bun, PostgreSQL/postgres.js, Railway SSH.

**Spec:** Solicitação do operador nesta conversa em 19/11/2026: assinatura da comunidade como destino de todos os cursos bloqueados, conforme público e ambiente.

## Global Constraints

- Produção Kids: `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta`.
- Produção adulto: `https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta`.
- Staging Kids: `https://funnel-staging-c4a5.up.railway.app/kids/comunidade-dos-criadores/oferta`.
- Staging adulto: `https://funnel-staging-c4a5.up.railway.app/pro/comunidade-dos-criadores/oferta`.
- Preservar conteúdo, progresso, permissões e alterações locais de outras sessões.
- Não criar worktree, reinstalar dependências, publicar código local alheio ou expor credenciais.
- Não executar testes contra bancos reais; usar auditoria operacional e conferência dos valores autorizados.

### Task 1: Auditoria e backup

**Files:** `C:/Users/tocha/course-offer-links-20261119/remote.mjs` (operação no serviço), `run.ts` (executor local); reutilizar `scripts/release/sync-course-audiences.ts::remote` sem modificar.

**Interfaces:** `run({environment, mode, expectedFingerprint?})` retorna cursos, versões, hashes dos campos protegidos, fingerprint e destinos. `audit` e `verify` são somente leitura.

- [x] Executar `bun --no-env-file C:/Users/tocha/course-offer-links-20261119/run.ts staging audit`.
- [x] Executar o mesmo comando com `production audit`.
- [x] Revisar cursos, públicos e links atuais, e conferir HTTP das quatro páginas.

### Task 2: Aplicar staging e verificar

- [x] Executar `bun --no-env-file C:/Users/tocha/course-offer-links-20261119/run.ts staging apply`.
- [x] Exigir fingerprint do backup, trava de linha e versão esperada; alterar somente a chave da URL e os campos de controle de versão.
- [x] Executar `bun --no-env-file C:/Users/tocha/course-offer-links-20261119/run.ts staging verify`; exigir `pending=0` e recibo com campos protegidos preservados.

### Task 3: Aplicar produção e verificar

- [x] Após staging aprovado, executar `production apply` e `production verify`.
- [x] Conferir os quatro grupos e registrar contagens, URLs e preservação de conteúdo.
- [x] Entregar resumo e evidências, sem deploy de aplicação. O operador solicitou posteriormente incluir este registro no commit local da revisão Kids.

## Rollback

Os backups privados por ambiente guardam cada linha anterior e sua versão. Para desfazer, travar os cursos, conferir que a URL atual ainda é a aplicada e restaurar somente a chave `salesPageUrl` anterior (ou remover se antes ausente). Preservar todas as outras chaves e incrementar novamente versão e data. Uma falha de conexão exige consultar os valores efetivos antes de repetir ou desfazer a escrita.

## Resultado

Operação concluída em 2026-11-19T15:00:27.618128-03:00: 296 cursos de staging e 295 de produção conferidos; 589 URLs alteradas, duas já corretas. Os 16 controles passaram. Backups e recibos privados: `C:/Users/tocha/course-offer-links-20261119/`. Nenhum código de aplicação foi publicado.
