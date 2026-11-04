# Campanhas e embaixadores — plano

**Goal:** preparar palestras rastreáveis, com beneficiário independente de comissão explícita.

**Architecture:** configuração no contrato e tabela de campanhas; snapshot privado no resgate; conversão usa snapshot, preservando o livro de bônus existente. Administração exibe configuração e resultado individual.

**Tech Stack:** TypeScript, Elysia, Drizzle/PostgreSQL, React, Bun/Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-campanhas-embaixadores.md`

**Constraints:** preservar históricos, códigos de proprietário único, privacidade pública, isolamento Kids/adulto, primeira atribuição e arquivos exclusivos de Palco em staging. Não enviar mensagens nem ativar comissão sem autorização.

- [ ] 1. Testes de regressão em `packages/referrals/tests/application/campaigns.test.ts` e `conversions.test.ts`: configuração válida, preservação em atualização, comissão desligada, prazo, autoindicação e snapshot histórico.
- [ ] 2. Contratos em `packages/core/src/referrals/index.ts`, domínio, serviço e rotas: vínculo opcional, comissão explícita, valor e prazo validados, dados individuais de conversão.
- [ ] 3. Persistência: schema, migração `bun run db:generate`, validação do beneficiário, snapshot transacional em `insertRedemption`, relatório de campanhas e embaixadores. Testar com PostgreSQL descartável.
- [ ] 4. Conversão: escolher beneficiário e termos do snapshot; manter deduplicação, maturação e estorno. Testes significativos de regras.
- [ ] 5. Interface `packages/admin/src/app/admin/embaixadores/convites-client.tsx`: seleção pesquisável de embaixador, controle explícito de comissão e resultados por participante. Cobrir envio/edição/duplicação com testes de UI.
- [ ] 6. Verificar testes, lint e tipos dos pacotes afetados; revisar diff e migração. Registrar evidências e limites.
- [ ] 7. Com parâmetros confirmados, preparar campanha La Opa e vínculo com Viviane no ambiente solicitado; conferir leitura de volta, sem envio de e-mail.
