# Revisão completa das frentes locais e implantação

> **For agentic workers:** Use `executing-plans` para execução sequencial nesta sessão. Não delegar nem retomar agentes históricos. A usuária autorizou revisão, correções, integração e deploy em staging e produção em 26/10/2026.

**Goal:** Revisar o que já está commitado em staging, incluir as correções desta sessão e publicar a composição verificada nos dois ambientes. Edições ainda sem commit das outras sessões ficam fora, conforme esclarecimento da usuária em 26/10.

**Architecture:** Inventariar fontes por worktree, conferir os diffs contra staging remoto e congelar os bytes revisados. Testar fronteiras afetadas e imagens reais, preservar trabalhos simultâneos e promover a mesma composição aprovada pelo CI.

**Tech Stack:** Bun/TypeScript, React/Next, PostgreSQL/Drizzle, Docker, GitHub Actions, Railway e Cloudflare.

**Spec:** Solicitação da usuária nesta sessão; separação comercial em `2026-10-23-admin-business-audience.md` e runbook `docs/runbooks/2026-10-26-admin-business-community.md`.

## Restrições

- Não sobrescrever edições concorrentes; comparar hashes antes de integrar os arquivos revisados.
- Não publicar narrativas/editorial novo no banco automaticamente: docs e propostas locais não são aulas ativadas. Preservar gravações e regras pedagógicas aprovadas.
- Não promover workflows temporários com alvo exclusivo de diagnóstico, nem reintroduzir WIP do catálogo já substituído pela implementação revisada.
- CI negativo não autoriza deploy manual para contornar a prova. Migrações e configuração fazem parte da liberação.
- Contas e identidades compartilhadas; catálogo, campanhas e resultados comerciais por comunidade.
- Sem cobranças, mensagens a clientes ou alteração da regularização individual da Flávia.

## 1. Inventário e revisão de fontes

- [x] Enumerar worktrees existentes, commits não ancestrais de staging e arquivos sem commit.
- [x] Separar snapshots sem commit de outras frentes: Studio, Pinta, Molda, ajuda e proposta Farol ficam fora desta entrega. Originais preservados no worktree principal.
- [x] Preservar em cache o achado de concorrência no WIP do Studio para o responsável; não publicar código ainda em edição por outra sessão.
- [x] Excluir também relatórios históricos de branches não integradas em staging e workflows temporários de diagnóstico.
- [x] Revisar mudanças commitadas da Jornada/Maestrias e Cadê, incluindo empacotamento, consumidores e testes.

## 2. Conciliação e correção dos bloqueios de CI

- [x] Admin comercial: 935 testes/3.920 asserções; tipagem Admin/Members; operadores de deploy 65 testes/186 asserções.
- [x] Corrigir o seed operacional da Jornada ausente da imagem: script incluído e JSON canônico dentro do pacote, com bytes preservados.
- [x] Construir Members e executar `qa/image-smoke.mjs` sem rede/banco, incluindo `seed-creator-journey.ts plan --offline` real.
- [x] Regenerar contrato/perfil Python; comprovar `validation-profile.ts --check` também no Linux/Bun 1.3.11.
- [x] Correções de CI verificadas: imagem Members real, contrato Python Linux/Bun 1.3.11, quiz clássico e previsão Cadê em navegador (4/4), seleção integrada Members (44/44, 261 asserções).
- [ ] Congelar composição, revisar diff final e integrar em staging local preservando novos trabalhos simultâneos.

## 3. Implantação

- [ ] Push do SHA revisado; acompanhar todos os jobs do CI e resolver negativos confirmados.
- [ ] Staging: retirar backends anteriores antes do Admin; conferir migrações e executar classificação financeira com plano/digest revisados.
- [ ] Validar telas autenticadas e isolamento Kids/Adultos, incluindo troca de lente e detalhes por ID.
- [ ] Após retirar writers antigos, concluir contrato NOT NULL do catálogo em uma liberação separada.
- [ ] Promover fonte aprovada para produção pelo operador canônico; conferir configurações, migrações, classificação e apps em execução.
- [ ] Registrar SHAs, testes, deploys e limitações observadas. Propostas/editorial em Git não equivalem a conteúdo importado/publicado.
