# Campanhas e embaixadores — plano

**Goal:** preparar palestras rastreáveis, com beneficiário independente de comissão explícita.

**Architecture:** configuração no contrato e tabela de campanhas; snapshot privado no resgate; conversão usa snapshot, preservando o livro de bônus existente. Administração exibe configuração e resultado individual.

**Tech Stack:** TypeScript, Elysia, Drizzle/PostgreSQL, React, Bun/Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-campanhas-embaixadores.md`

**Constraints:** preservar históricos, códigos de proprietário único, privacidade pública, isolamento Kids/adulto, primeira atribuição e arquivos exclusivos de Palco em staging. Não enviar mensagens nem ativar comissão sem autorização.

- [x] 1. Testes de regressão em `packages/referrals/tests/application/campaigns.test.ts` e `conversions.test.ts`: configuração válida, preservação em atualização, comissão desligada, prazo, autoindicação e snapshot histórico.
- [x] 2. Contratos em `packages/core/src/referrals/index.ts`, domínio, serviço e rotas: vínculo opcional, comissão explícita, valor e prazo validados, dados individuais de conversão.
- [x] 3. Persistência: schema, migração `bun run db:generate`, validação do beneficiário, snapshot transacional em `insertRedemption`, relatório de campanhas e embaixadores. Testado com PostgreSQL 17 descartável.
- [x] 4. Conversão: escolher beneficiário e termos do snapshot; manter deduplicação, maturação e estorno. Testes significativos de regras.
- [x] 5. Interface `packages/admin/src/app/admin/embaixadores/convites-client.tsx`: seleção pesquisável de embaixador, controle explícito de comissão e resultados por participante. Testes de envio, preservação e remoção do vínculo; duplicação revisada para reiniciar comissão desligada.
- [x] 6. Verificação local: 984 testes do Admin e 200 de Referrals, incluindo migração sobre dados existentes e PostgreSQL real; typecheck dos dois pacotes; lint Referrals. Diff e migração revisados; gerar novamente confirma ausência de drift.
- [x] 7. Cadastro real adiado por instrução posterior da operadora. Não criar Viviane nem campanha. Guia de configuração em `docs/operations/campanha-com-embaixador.md`.
- [x] 8. Publicar o recurso após CI e verificar saúde dos serviços. Produção: PR #242, merge `1f1c36aa573248baacc3ff75031c1f0e275a8ef3`, [deploy 41926981112](https://github.com/informach/sistema-zero/actions/runs/41926981112) concluído. Referrals/Admin confirmados nesse SHA; saúde do Admin HTTP 200. Recibo local: `.cache/campaign-review/production-receipt/production-manifest.json`. Sem cadastros reais.
