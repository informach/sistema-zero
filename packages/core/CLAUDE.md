# CLAUDE.md — @sistemazero/core

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/API que encostar aqui — não confie só na
> memória. Para pesquisa e padrões, use o **MCP do Octocode**.

Guia operacional deste package. Leia antes de editar.

## O que é

**Lib compartilhada, sem framework**: as utilidades de baixo nível que TODOS os backends do
monorepo reusam (auth, catalog, members, payments, messaging, funnel, fiscal, hub, marketing,
helpdesk…). Runtime: **Bun**. Linguagem: **TS (ESM)**. **Não sobe servidor, não tem banco, não
tem porta.**

## Regra de ouro (dependência)

`core` é a **base da pirâmide**: é importado por todos, e **NUNCA importa de pacote de serviço/app**
(`auth`, `catalog`, `members`, `ui`, `member-shell` etc.) — isso criaria ciclo e vazaria regra de
negócio para dentro da lib comum. Só depende de Bun/TS e do runtime. Mantenha-o **framework-free**
(sem Elysia/Next/React/Drizzle aqui). Mudou um contrato daqui? Ele reverbera em toda a frota — trate
como mudança de API pública (é dependência de `watchPatterns` no CI: mexer em `core` redeploya
backends + funnel + fiscal).

## Como é consumido

Importe pelos **subpaths** (intenção explícita), não pelo barrel raiz:

```ts
import { hmacSign, safeEqual, RateLimiter } from '@sistemazero/core/security'
import { createLogger, serializeError } from '@sistemazero/core/logging'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { type Result, ok, err } from '@sistemazero/core/result'
import { toErrorEnvelope, EdgeError } from '@sistemazero/core/http'
import { saoPauloDayKey } from '@sistemazero/core/time'
```

Use `import type` para tipos (`verbatimModuleSyntax`). O barrel raiz (`@sistemazero/core`) existe
por conveniência, mas prefira o subpath. Os subpaths são declarados no campo `exports` do
`package.json` — **subpath novo entra lá** (senão o import não resolve).

## Módulos (`src/`)

| Subpath | O que mora | Arquivos |
|---|---|---|
| `/security` | HMAC de borda, hash, comparação constante, IP do request, rate limiter | `hmac` · `hash` · `safe-equal` · `ip` · `rate-limiter` |
| `/logging` | logger estruturado + serialização segura de erro (redige segredos) | `logger` · `serialize-error` |
| `/errors` | hierarquia de erros de domínio compartilhada (base do `shared/errors` dos serviços) | `domain-errors` |
| `/result` | `Result<T,E>` (ok/err) — fluxo de erro sem exceção | `result` |
| `/http` | envelope de erro `{error:{code,message}}` + erros de borda (edge) | `error-envelope` · `edge-errors` |
| `/time` | calendário civil compartilhado, sem converter data de negócio em instante UTC | `sao-paulo` |

## Comandos (de dentro de `packages/core`)

| Comando | O quê |
|---|---|
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Nada de framework nem de import de pacote de serviço/app entrou aqui.
- [ ] Subpath novo? Adicionou ao `exports` do `package.json`.
- [ ] Mudou contrato público? Ciente de que redeploya os consumidores (é dependência de todos).
