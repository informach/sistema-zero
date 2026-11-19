# Presentes e compras autenticadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. A execução integral das duas etapas já foi autorizada; checkpoints são atualizações de progresso.

**Goal:** Disponibilizar presentes e compras dentro de aulas e páginas, com a conta logada e a identidade visual existente.

**Architecture:** Reutilizar Referrals para bolsas e o checkout durável do funil para pagamentos. Member-shell serve a experiência autenticada, compartilhada entre Kids/adulto; Catálogo e Admin mantêm as referências e as apresentações.

**Tech Stack:** TypeScript, Bun, React 19, Next.js 16, Astro, Elysia, Drizzle/PostgreSQL, componentes existentes de @sistemazero/ui.

**Spec:** docs/plans/2026-11-19-comercio-na-plataforma-design.md

## Global Constraints

- Preservar trabalho local de Studio/Molda e não incluir esses arquivos em commits.
- Identidade da sessão conferida no servidor; bloquear criança e impersonação em ações comerciais.
- Catálogo fornece preço/prazo; campanha fornece oferta do presente; não confiar em valores do navegador.
- Manter histórico, concessão e processamento de pagamentos existentes e retomáveis.
- Identidade visual existente obrigatória; preview sem cobrança ou resgate.
- Não efetuar cobrança real para testes nem mudar conteúdo publicado ou fazer deploy automaticamente.

## Task 1: Contratos e autoria

**Files:** packages/members/src/domain/course/lesson-block.ts; packages/members/src/interfaces/http/learning.dtos.ts; packages/members/src/interfaces/http/lesson-draft.dtos.ts; packages/admin/src/lib/types.ts; packages/admin/src/lib/lesson-block-form.ts; packages/admin/src/components/editor/lesson-block-kind.tsx; editor/importadores e projeções encontrados por referências desses contratos.

**Interfaces:** blocos `gift` com referência de campanha/código e `purchase` com oferta; campos editoriais opcionais compartilhados. Esses dados são somente configuração, nunca permissão de concessão.

- [ ] Adicionar teste de importação/validação dos dois tipos, rejeitando referências vazias ou inválidas.
- [ ] Rodar o teste e observar a rejeição dos novos tipos antes da implementação.
- [ ] Propagar contratos, formulários, manifesto, catálogo de blocos e preview inerte a partir dos pontos canônicos de autoria.
- [ ] Rodar testes de conformidade e typecheck do Admin/Members.

## Task 2: Presente autenticado

**Files:** packages/referrals/src/interfaces/http/me.routes.ts; packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts; packages/api-gateway/gateway.config.ts; packages/member-shell/src/routes/commerce.ts; packages/member-shell/src/index.ts; shims API dos dois apps.

**Interfaces:** consulta e ativação autenticadas, conferindo usuário/público e referência publicada; resultado inclui acesso, prazo e estado já utilizado. Resgate autenticado recebe identidade exclusivamente do gateway.

- [ ] Testar rejeição de criança/impersonação e garantia de concessão para a conta autenticada sem ensure-buyer.
- [ ] Acrescentar entrada autenticada ao serviço canônico, preservando claim, lease, histórico e deduplicação do presente existente.
- [ ] Adicionar rotas do gateway e BFF com validação da origem (aula publicada ou apresentação configurada).
- [ ] Testar duplicata, indisponibilidade e retomada sem extensão de prazo.

## Task 3: Checkout autenticado e persistência

**Files:** packages/funnel/src/server/checkout.ts; packages/funnel/src/server/member-commerce.ts; packages/funnel/src/pages/api/internal/commerce/[...path].ts; packages/funnel/src/db/schema.ts; packages/funnel/src/db/repo.ts; migrations do funil; packages/api-gateway/gateway.config.ts.

**Interfaces:** contexto de checkout vinculado a usuário, origem e oferta; leitura de dados faltantes, criação/retomada de tentativa, operações Pix/cartão/assinatura e consulta de estado pelo dono. Reutilizar startPix/startCard/startSubscription e confirmação/concessão existentes, extraindo a resolução de identidade quando necessário.

- [ ] Testar tentativa de alterar usuário/oferta e leitura de compra alheia.
- [ ] Persistir vínculo conta/origem e cadastro de cobrança reutilizável com migration aditiva gerada pelo schema.
- [ ] Adaptar resolução de checkout para oferta permitida na origem, sem exigir registro em um funil comercial específico.
- [ ] Vincular buyer antes da cobrança; webhook retoma o grant para esse buyer e não cria nova conta.
- [ ] Testar cotação, Pix mensal indisponível, estado pendente, confirmação, duplo clique e recarga.

## Task 4: Configuração dos cards

**Files:** packages/catalog/src/domain/offer/offer.aggregate.ts; packages/catalog/src/interfaces/http/dtos.ts; packages/catalog/src/interfaces/http/routes/catalog.routes.ts; packages/admin/src/app/admin/catalogo/ofertas/offers-client.tsx; packages/admin/src/lib/types.ts.

**Interfaces:** apresentação opcional no conteúdo comercial da oferta, com local Início, modo, campanha quando presente e texto/imagem/botão. Consulta devolve somente apresentações publicadas do público correto. A elegibilidade é consultada no servidor autenticado.

- [ ] Testar DTO de apresentação, filtro por público e exclusão de rascunho/arquivada.
- [ ] Adicionar formulário do Admin preservando demais campos do conteúdo da oferta.
- [ ] Implementar consulta de apresentações e classificação por assinatura/acesso/pagamento conhecido; erro de leitura não vira elegível.
- [ ] Rodar testes do catálogo e da classificação de elegibilidade.

## Task 5: Interface compartilhada e integração

**Files:** packages/member-shell/src/components/commerce/*; packages/member-shell/src/components/lesson-blocks.tsx; packages/community-kids/src/components/kids/kids-lesson-blocks.tsx; packages/community-kids/src/app/pais/parents-client.tsx; packages/community-kids/src/app/pais/page.tsx; exports dos componentes compartilhados.

**Interfaces:** CommerceCard, CommercePanel e renderização dos blocos reutilizam o mesmo controlador; origem discriminada entre bloco e apresentação do catálogo. Button/Input/Dialog/efi-card-token existentes, sem CSS de landing page.

- [ ] Montar UI de carregamento, resumo, dados faltantes, presente, Pix/cartão, pendência, sucesso e erro recuperável.
- [ ] Integrar blocos nos renderizadores compartilhados e no Kids, inclusive cursos para pais.
- [ ] Integrar primeiro local de cards no Início com atualização após resgate/pagamento.
- [ ] Conferir que conclusão da aula/certificado não depende de compra ou presente.
- [ ] Testar navegação de teclado, viewport móvel e identidade visual com a aplicação/fixture real.

## Task 6: Verificação final e documentação

- [ ] Rodar testes de domínio/aplicação/rotas novos e regressões relevantes de checkout, bolsa e publicação.
- [ ] Rodar typechecks de Referrals, Catálogo, funil, Member-shell, Admin e comunidades; registrar falhas preexistentes separadamente.
- [ ] Rodar Biome somente nos arquivos desta entrega e builds apropriados dos consumidores.
- [ ] Documentar configuração no Admin, migration/ordem de rollout e evidências de QA.
- [ ] Revisar diff e confirmar preservação dos arquivos locais anteriores.
