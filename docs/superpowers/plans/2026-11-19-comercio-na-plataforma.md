# Presentes e compras autenticadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. A execução integral das duas etapas já foi autorizada; checkpoints são atualizações de progresso.

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

**Files:** packages/members/src/domain/course/lesson-block.ts; packages/members/src/interfaces/http/dtos.ts; packages/admin/src/lib/types.ts; packages/admin/src/lib/lesson-block-form.ts; packages/admin/src/components/editor/lesson-block-kind.tsx; editor/importadores e projeções encontrados por referências desses contratos.

**Interfaces:** blocos `gift` com referência de campanha/código e `purchase` com oferta; campos editoriais opcionais compartilhados. Esses dados são somente configuração, nunca permissão de concessão.

- [x] Adicionar teste de importação/validação dos dois tipos, rejeitando referências vazias ou inválidas.
- [x] Validar referências vazias/inválidas e impedir preço editável nos contratos comerciais.
- [x] Propagar contratos, formulários, manifesto, catálogo de blocos e preview inerte a partir dos pontos canônicos de autoria.
- [x] Rodar testes de conformidade e typecheck do Admin/Members.

## Task 2: Presente autenticado

**Files:** packages/referrals/src/interfaces/http/me.routes.ts; packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts; packages/api-gateway/gateway.config.ts; packages/member-shell/src/routes/commerce.ts; packages/member-shell/src/index.ts; shims API dos dois apps.

**Interfaces:** consulta e ativação autenticadas, conferindo usuário/público e referência publicada; resultado inclui acesso, prazo e estado já utilizado. Resgate autenticado recebe identidade exclusivamente do gateway.

- [x] Testar rejeição de criança/impersonação e garantia de concessão para a conta autenticada sem ensure-buyer.
- [x] Acrescentar entrada autenticada ao serviço canônico, preservando claim, lease, histórico e deduplicação do presente existente.
- [x] Adicionar rotas do gateway e BFF com validação da origem (aula publicada ou apresentação configurada).
- [x] Testar duplicata, indisponibilidade e retomada sem extensão de prazo.

## Task 3: Checkout autenticado e persistência

**Files:** packages/funnel/src/server/checkout.ts; packages/funnel/src/server/member-commerce.ts; packages/funnel/src/pages/api/internal/commerce/[action].ts; packages/funnel/src/db/schema.ts; packages/funnel/src/db/repo.ts; migrations do funil; packages/api-gateway/gateway.config.ts.

**Interfaces:** contexto de checkout vinculado a usuário, origem e oferta; leitura de dados faltantes, criação/retomada de tentativa, operações Pix/cartão/assinatura e consulta de estado pelo dono. Reutilizar startPix/startCard/startSubscription e confirmação/concessão existentes, extraindo a resolução de identidade quando necessário.

- [x] Testar tentativa de alterar usuário/oferta e leitura de compra alheia.
- [x] Persistir vínculo conta/origem e cadastro de cobrança reutilizável com migration aditiva gerada pelo schema.
- [x] Adaptar resolução de checkout para oferta permitida na origem, sem exigir registro em um funil comercial específico.
- [x] Vincular buyer antes da cobrança; webhook retoma o grant para esse buyer e não cria nova conta.
- [x] Testar cotação, Pix mensal indisponível, estado pendente, confirmação, duplo clique e recarga.

## Task 4: Configuração dos cards

**Files:** packages/catalog/src/domain/offer/offer.aggregate.ts; packages/catalog/src/interfaces/http/dtos.ts; packages/catalog/src/interfaces/http/routes/catalog.routes.ts; packages/admin/src/app/admin/catalogo/ofertas/offers-client.tsx; packages/admin/src/lib/types.ts.

**Interfaces:** apresentação opcional no conteúdo comercial da oferta, com local Início, modo, campanha quando presente e texto/imagem/botão. Consulta devolve somente apresentações publicadas do público correto. A elegibilidade é consultada no servidor autenticado.

- [x] Testar DTO de apresentação, filtro por público e exclusão de rascunho/arquivada.
- [x] Adicionar formulário do Admin preservando demais campos do conteúdo da oferta.
- [x] Implementar consulta de apresentações e classificação por assinatura/acesso/pagamento conhecido; erro de leitura não vira elegível.
- [x] Rodar testes do catálogo e da classificação de elegibilidade.

## Task 5: Interface compartilhada e integração

**Files:** packages/member-shell/src/components/commerce/*; packages/member-shell/src/components/lesson-blocks.tsx; packages/member-shell/src/components/lesson-ui/blocks.tsx; packages/community-kids/src/app/pais/parents-client.tsx; packages/community-kids/src/app/pais/page.tsx; exports dos componentes compartilhados.

**Interfaces:** CommerceCard, CommercePanel e renderização dos blocos reutilizam o mesmo controlador; origem discriminada entre bloco e apresentação do catálogo. Button/Input/Dialog/efi-card-token existentes, sem CSS de landing page.

- [x] Montar UI de carregamento, resumo, dados faltantes, presente, Pix/cartão, pendência, sucesso e erro recuperável.
- [x] Integrar blocos nos renderizadores compartilhados e no Kids, inclusive cursos para pais.
- [x] Integrar primeiro local de cards no Início com atualização após resgate/pagamento.
- [x] Conferir que conclusão da aula/certificado não depende de compra ou presente.
- [x] Testar navegação de teclado, viewport móvel e identidade visual com a aplicação/fixture real.

## Task 6: Verificação final e documentação

- [x] Rodar testes de domínio/aplicação/rotas novos e regressões relevantes de checkout, bolsa e publicação.
- [x] Rodar typechecks de Referrals, Catálogo, funil, Member-shell, Admin e comunidades; registrar falhas preexistentes separadamente.
- [x] Rodar Biome somente nos arquivos desta entrega e builds apropriados dos consumidores.
- [x] Documentar configuração no Admin, migration/ordem de rollout e evidências de QA.
- [x] Revisar diff e confirmar preservação dos arquivos locais anteriores.

## Entrega local e evidências — 19/11/2026

As duas etapas estão implementadas localmente. Guia: [Configuração e rollout](../../operations/comercio-na-plataforma.md). O manifesto da Aula 7 foi preparado com o presente nativo; não foi importado nem publicado.

| Verificação | Resultado |
| --- | --- |
| Funnel, suíte completa | 669 passaram; 2 pulados; 0 falhas |
| Referrals, suíte completa | 213 passaram; 50 pulados; 0 falhas |
| Payments, suíte completa | 436 passaram; 219 pulados; 0 falhas |
| Catalog, suíte completa | 163 passaram; 13 pulados; 0 falhas |
| Gateway, suíte completa | 327 passaram; 2 pulados; 0 falhas |
| Contratos, autoria/importação/exportação, BFF e elegibilidade | 35 passaram; 0 falhas |
| Members: acesso real, publicação e cursos para pais | 23 passaram; 0 falhas |
| Chromium com componentes/CSS reais e backend simulado | Kids/adulto; mobile; somente dados faltantes; Pix após recarga; confirmação; presente sem recadastro; mensal só cartão; Tab/Escape e restauração de foco; mudança de preço exige nova confirmação; sem erro de página |
| Typecheck | Referrals, Catalog, Payments, Gateway, Funnel, Members, Kids, Member-shell, comunidade adulta e Admin passaram |
| Build Funnel | Passou; avisos de anotações Rollup/Zod |
| Builds completos Next | Não executados nesta rodada; o build verificado foi o Funnel, além do bundle/CSS reais dos componentes comerciais |

A correção de tentativa recusada antes de chamar o provedor foi verificada em ciclo vermelho/verde: sem descartar o pedido não enviado, o teste retornou PROCESSING; com a correção, voltou a READY e permitiu a assinatura no cartão. Respostas perdidas depois da chamada externa preservam o pedido/chave originais.

Biome é limitado aos arquivos desta entrega; Studio/Molda não foram formatados, revertidos ou incluídos em staging. Logs de comandos e capturas ficam em .cache/commerce-*. Os primeiros typechecks encontraram três erros de Studio; após novas alterações do trabalho paralelo, foram executados novamente, sem modificar esses arquivos nesta entrega.

## Pendências de homologação/publicação

- [ ] Exercitar migrations, store e concorrência contra PostgreSQL real: o banco local configurado não respondeu; o Docker também retornou HTTP 500 no engine; o harness pulou os testes que exigem banco.
- [ ] Executar build completo dos apps Next antes do rollout.
- [ ] Aplicar migrations e fazer deploy no ambiente escolhido pelo fluxo normal; conferir webhooks/configuração e publicar os blocos/cards.

As pendências acima são de verificação integrada e rollout. Não houve deploy, migração remota, nova cobrança real nem publicação de aulas/cards.
