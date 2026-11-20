# Correções do comércio na plataforma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. A execução integral dos seis achados foi autorizada; os checkpoints são atualizações de progresso. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Resolver R01–R06 da revisão, preservando identidade, direitos existentes e retomada sem duplicação de cobranças.

**Architecture:** Separar preparação e despacho do checkout canônico. O checkout autenticado persiste um plano imutável antes do efeito externo e o repete sem nova cotação. Uma reivindicação durável coordena conta/produto entre ofertas. Recuperação consulta a intenção/resgate próprio antes de decidir disponibilidade para novas operações.

**Tech Stack:** Bun, TypeScript, Elysia/Astro/Next, Drizzle/PostgreSQL, React e componentes visuais existentes.

**Spec:** `.audits/architectural-analysis-2026-11-19-comercio-na-plataforma.md`; `docs/plans/2026-11-19-comercio-na-plataforma-design.md`.

## Global Constraints

- Não alterar Studio/Molda em edição paralela, não mover worktrees nem integrar outras alterações.
- Nenhuma cobrança real, migration remota, deploy ou publicação de conteúdo nesta rodada.
- Manter bloqueios de criança/impersonação, validação de origem e destinatário da conta autenticada.
- Não apagar pedido despachado/desconhecido por falha de consulta, preço ou validação de uma repetição.
- Não permitir que correção de dados ou troca de oferta gere outra cobrança enquanto houver intenção desconhecida.
- Gerar SQL/snapshots com Drizzle; não editar snapshots ou schema migrations à mão.
- Preservar o estilo visual da plataforma.

## Task 1 — R01/R03: plano imutável e resultado de despacho

**Files:** `packages/funnel/src/server/checkout.ts`, novos `checkout-plan.ts`/`checkout-dispatch.ts`; `db/member-commerce-types.ts`, `db/schema.ts`, `server/member-commerce-charge.ts`, `server/member-commerce-store.ts`; `tests/integration/member-commerce.test.ts`.

**Interfaces:** `preparePix/prepareCard/prepareSubscription` retornam `CheckoutPlan | Response`; `executeCheckoutPlan(plan, deps)` reutiliza envio/recibo canônicos. Plano inclui lead, método, corpo JSON exato, chave, oferta/snapshot, contato e periodicidade. O store persiste o plano com compare-and-set antes do envio; rejeição comprovadamente anterior à criação permite nova tentativa, resultado incerto conserva o plano.

- [x] Adicionar e rodar regressão: cartão aprovado com resposta perdida → preço muda → retomada devolve o recibo original; nenhum Pix adicional é criado.
- [x] Adicionar e rodar regressão: Payments rejeita dados antes de criar pagamento → corrigir dados permite nova tentativa; erros incertos continuam bloqueando substituição.
- [x] Extrair preparação/despacho sem duplicar cobrança ou concessão; manter os endpoints públicos usando o mesmo executor.
- [x] Persistir o plano antes do envio, com corpo/chave originais; remover token após resultado conhecido.
- [x] Validar CEP/endereço normalizado antes da chamada e propagar classificação explícita de rejeição segura.
- [x] Executar regressões do checkout público e autenticado.

## Task 2 — R02: coordenação por produto

**Files:** store/schema/migration Funnel, novo `member-commerce-claim.ts`, gateway de fatos de acesso Members se necessário; teste concorrente de planos mensal/anual.

**Interfaces:** reivindicação única `(accountId, productId)` prende o checkout/lead até reconciliação ou encerramento comprovado. Dentro da seção protegida, reavaliar a reivindicação atual; não confiar na consulta anterior do BFF. Segunda confirmação recebe o checkout próprio em andamento.

- [x] Rodar teste em que duas ofertas do mesmo produto partem da mesma elegibilidade e são confirmadas em paralelo; observar a duplicação antes da correção.
- [x] Persistir reivindicação no PostgreSQL em transação com lock por conta/produto e revalidação; conservar o vínculo em resultado desconhecido.
- [x] Liberar/reutilizar somente após encerramento comprovado; acesso já pago e assinatura ativa não viram nova compra.
- [x] Retornar a operação existente ao segundo fluxo e usar sua origem/termos reais no painel.
- [x] Testar planos concorrentes, erro definitivo, pagamento confirmado e recompra após fim do direito.

## Task 3 — R04: recuperação independente de novas vendas

**Files:** `member-commerce.ts`, store/origens persistidas, `member-commerce-state.ts`, `member-shell/src/routes/commerce.ts`, `commerce-panel.tsx` e tipos.

**Interfaces:** ações internas de leitura `recover` e `pending`, vinculada à conta e à origem registrada. Ela devolve compra em andamento sem criar lead ou cobrar. Disponibilidade e origem publicada continuam obrigatórias para iniciar/reiniciar uma operação nova.

- [x] Rodar regressão: Pix pendente → oferta pausada/apresentação removida → recarga ainda recupera pagamento próprio.
- [x] Acrescentar entrada durável em Minhas compras (Kids/adulto), abrindo por ID sem depender de aula/card.
- [x] Registrar origens autorizadas quando o checkout é apresentado, inclusive quando reutilizado em outra aula/card.
- [x] Fazer recuperação antes da elegibilidade de nova compra; não depender de ID guardado apenas no componente.
- [x] Testar indisponibilidade de Catálogo, propriedade, origem não registrada e compra concluída/expirada.

## Task 4 — R05: resgate próprio antes do estado da campanha

**Files:** `referrals/.../redeem-scholarship.service.ts`, `member-gifts.routes.ts`; tipos/painel de presente e QA no navegador.

**Interfaces:** inspeção autenticada devolve recibo da própria conta `{status, expiresAt, canResume}` sem conceder acesso ou consumir claim. Consulta e execução usam a mesma política de vaga/histórico.

- [x] Rodar teste: claim válido em processamento → campanha termina → reinspeção oferece retomada da mesma concessão.
- [x] Acrescentar inspeção da conta sem efeitos, preservando email alterado, vaga e prazo original.
- [x] Priorizar resgate existente na UI; campanha encerrada sem claim continua impedindo ativação nova.
- [x] Testar serviço/HTTP e componente real em Chromium após fechar/reabrir.

## Task 5 — R06: migrations coerentes

**Files:** migration/snapshot/journal Referrals `0012_member_gift_slots`; migration gerada Funnel para plano, origens e reivindicações.

- [x] Reproduzir em cópia isolada a geração redundante de índice/CHECK de Referrals.
- [x] Regenerar a migration ainda não publicada a partir do snapshot anterior usando `bun run db:generate`, com config apontando a saída isolada; copiar somente artefatos gerados verificados.
- [x] Gerar a nova migration de schema Funnel com o script do pacote.
- [x] Executar geração novamente em cópia: schema inalterado não deve produzir SQL.
- [x] Conferir cadeia, SQL, compatibilidade e ordem; exercitar em PostgreSQL isolado se disponível.

## Task 6 — verificação e documentação

- [x] Executar testes novos e suítes completas de Funnel, Referrals, Payments, Catalog e Gateway; contratos/BFF/autoria/Members relevantes.
- [x] Executar Biome apenas nos arquivos da entrega, typechecks e builds apropriados.
- [x] Atualizar relatório R01–R06 com estado/evidências e guia operacional com migrations/retomada.
- [x] Revisar diff, preservar trabalho paralelo e registrar com clareza qualquer limite de validação externa.


## Evidências da rodada

- Funnel: `681 pass`, `2 skip`, `0 fail` (inclui teste PostgreSQL opt-in); `.cache/commerce-fixes-funnel-tests.log`.
- Referrals: `214 pass`, `50 skip`, `0 fail`; `.cache/commerce-fixes-referrals-tests.log`.
- Payments: `439 pass`, `219 skip`, `0 fail`; `.cache/commerce-fixes-payments-tests.log`.
- Catalog: `163 pass`, `13 skip`, `0 fail`; `.cache/commerce-fixes-catalog-tests.log`.
- Gateway: `327 pass`, `2 skip`, `0 fail`, executado no próprio pacote; `.cache/commerce-fixes-api-gateway-tests.log`. A execução anterior com filtro a partir da raiz encontrou cópias antigas em `output/`; nenhuma alteração nesses arquivos foi necessária.
- Core/autoria/BFF/elegibilidade/Members: `43 pass`, `0 fail`; `.cache/commerce-fixes-contracts-tests.log`.
- Regressões com falha observada antes da correção: `.cache/commerce-fixes-red.log`, `.cache/commerce-fixes-phase-red.log`; reproduções iniciais R01–R06 em `.cache/commerce-review/`.
- PostgreSQL 17 isolado: duas conexões/pools independentes, cada pool com limite 1; teste real comprova commit antes do envio, exclusão conta/produto, JSONB, recuperação/listagem e remoção do token após recibo. `.cache/commerce-fixes-postgres.log` e teste `packages/funnel/tests/integration/member-commerce-postgres.test.ts`.
- Migrations: cadeias completas de Funnel/Referrals aplicadas no banco temporário; `CHECK` ampliado e índice único por nome conferidos em `.cache/commerce-fixes-referrals-db-schema.log`. Nova geração sem schema alterado retorna “No schema changes” nos dois pacotes.
- Chromium: temas Kids/adulto, ausência de campos já conhecidos, Pix após recarga, Minhas compras por ID, adoção de outra oferta, presente pendente após encerramento e reconfirmação de preço/termos. `.cache/commerce-fixes-browser.log`; capturas em `.cache/commerce-browser/`.
- Typechecks de Funnel, Referrals, Payments, Catalog e Gateway passaram. O typecheck geral de Members ficou limitado por erros de `SymbolNames`/`ReadonlySet` em `packages/studio/src/ir/programmingReferences.ts` e `symbolNames.ts`, fora desta entrega. Não alterar trabalho paralelo para limpar a checagem.
- Build completo atualizado de Kids passou (compilação, TypeScript e geração de páginas); typecheck atualizado do adulto passou. Build e typecheck de Funnel passaram. Biome nos 96 arquivos de código da entrega: sem erros ou avisos. Logs `.cache/commerce-fixes-kids-build.log`, `.cache/commerce-fixes-adult-types.log`, `.cache/commerce-fixes-funnel-build.log`, `.cache/commerce-fixes-funnel-types.log` e `.cache/commerce-fixes-biome.log`. Não houve deploy ou teste financeiro real.

Servidor temporário de QA e container PostgreSQL isolado encerrados após os testes; nenhum processo de desenvolvimento do usuário foi encerrado.
