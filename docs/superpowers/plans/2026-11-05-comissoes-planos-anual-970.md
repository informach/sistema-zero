# Comissão por plano e preço anual — plano

> Execução inline com executing-plans, sem delegação. Desenho comercial aprovado na conversa.

**Goal:** pagar bônus único de R$ 30/80 por plano e vender o anual por R$ 970 em todas as superfícies vigentes.

**Architecture:** contrato/defaults compartilhados; campo anual aditivo e snapshots privados; classificação por ciclo do catálogo; migração de preço restrita às ofertas anuais conhecidas, sem reescrever compras.

**Tech Stack:** TypeScript, Bun, Drizzle/PostgreSQL, Elysia, React, Astro.

**Spec:** `docs/plans/2026-11-05-comissoes-planos-anual-970-design.md`.

## 1. Regra de comissão

- [x] Core `src/referrals/index.ts`: `DEFAULT_REFERRAL_BONUS = { monthly: 3000, annual: 8000 }`, tipo de valores por plano e campo anual opcional no contrato de campanha.
- [x] Referrals: validar/persistir anual positivo quando habilitado; preservar PATCH omisso e snapshots antigos. Adicionar campo privado de bônus direto no resgate e capturá-lo no serviço de aceite. Classificar pelo `billingIntervalMonths` do catálogo; manter dedupe e Pix único. Gerar migração pelo Drizzle, sem editar SQL gerado.
- [x] Regressões em `tests/application/conversions.test.ts`, `campaigns.test.ts`, `tests/db/campaign-review.test.ts` e teste de upgrade: mensal 3000, anual 8000, legacy fixo, acordo editado, disabled, ciclo inválido e retry/estorno.

## 2. Administração e comunicação

- [x] Admin `convites-client.tsx`: dois campos com defaults 30/80, resumo por plano, duplicar/desligar sem comissão; testes `campaign-audience.test.tsx`.
- [x] Referrals rotas me/internal, Funnel `EmbaixadorBonus.tsx`, tipos e card de embaixador Kids: apresentar valores do servidor e pagamento único, sem defaults monetários inventados no cliente. Testes de contrato/copy existentes.

## 3. Preço comercial

- [x] Catalog `catalog-seed-definitions.ts`: ambas as ofertas anuais 97000; migration custom gerada para UPDATE condicionado a slug/currency/preço antigo, incremento de versão e updatedAt. Não atualizar transações ou assinaturas.
- [x] Funnel módulos de conteúdo Kids/adulto: fallback 97000; conferir economia/equivalente derivados e checkout. Atualizar testes comerciais e documentação vigente; manter arquivos históricos como registro.
- [x] Teste de migração real: altera apenas anuais 79700, mantém mensal e outra oferta/preço; repetição não muda novamente. Validar novas seeds e páginas dos dois públicos.

## 4. Entrega

- [x] Atualizar CLAUDE/runbook com defaults, significado único, snapshots e rollout/rollback.
- [x] Rodar testes, lint/typechecks pertinentes e build do funil; revisar diff, gerar schema sem drift.
- [ ] PR, review, CI completo/plano da versão exata; produção por onda canônica com backends antes de interfaces. Recibo e verificação de preços públicos/saúde/SHA, sem cadastros reais.

## Evidências locais

- Referrals: 223 testes, incluindo PostgreSQL real e upgrade; Catalog: 156 testes, incluindo a migração isolada de preço.
- Funil: 596 testes, typecheck/build; Admin: 11 testes do editor e typecheck; Kids: 8 testes do cartão e typecheck.
- Navegador: cinco páginas de oferta × cinco larguras, 72 imagens, sem erros; preço dinâmico e escolha mensal/anual preservados.
- Drizzle: sem drift após gerar ambas as migrações. Preflight de produção: dois anuais BRL/12 a 79700, mensais a 9700, nenhuma campanha, dois resgates; nenhuma transação longa.
- Publicação/CI: pendentes no momento deste registro.
