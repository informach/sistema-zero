# Admin por comunidade e jornada adulta: Implementation Plan

> **For agentic workers:** executar os lotes sequencialmente com a skill `executing-plans`,
> revisão entre lotes e revisão completa antes da integração. Nenhuma nova delegação automática.

**Goal:** separar Negócio por Kids/Adultos e inicializar a jornada adulta sem liberar etapas vazias.

**Architecture:** a lente continua sendo preferência de interface; entidades e serviços validam
a comunidade canônica. A jornada usa um projetor único com etapas planejadas explicitamente
bloqueadas. Migrações preservam dados e compras; os recortes chegam aos serviços donos dos dados.

**Tech Stack:** TypeScript, Bun, React/Next, Elysia, Drizzle/PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-23-admin-business-audience.md`.

## Global Constraints

- Nenhuma alteração de roteiro, fala gravada, critério pedagógico ou concessão existente.
- Não excluir registros de pagamento, compradores ou conquistas para retirar um curso.
- Não usar filtro visual como única separação; totais e mutações obedecem ao servidor.
- Mesmos papéis e guards; nenhum grant de equipe ou bypass de autorização novo.
- JavaScript/Python e a implantação concluída de `f1f68b728` permanecem preservados.
- Cota global por conta não é duplicada ao acrescentar audiência à medição.

## Estado do lote comercial em 26/10/2026

Os lotes 1/2 pertencem à entrega anterior. Este lote retoma apenas 3–6, com a decisão
posterior de manter identidades e operações gerais compartilhadas. Não reabre pedagogia/jornada.
Código preparado no worktree `sistema-zero-business-scope`; revisão e conciliação da base em curso.
Consulta de produção/staging somente leitura concluída. Nenhuma migração deste lote aplicada no ar.
Ordem de implantação e evidências: `docs/runbooks/2026-10-26-admin-business-community.md`.

## Lote 1 — Etapas adultas planejadas e bloqueadas

Files: `packages/core/src/journey/adult-policy.ts` e `.test.ts`;
`packages/members/src/application/adult-journey/{adult-journey-seed.ts,adult-journey-seed-once.ts,adult-journey.service.ts}`;
`packages/members/tests/unit/adult-journey-{seed,production-seed}.test.ts`;
`packages/members/tests/integration/adult-journey.test.ts`;
`packages/admin/src/app/admin/professor/jornada-adulta/journey-editor.tsx`;
consumidores da jornada adulta no `member-shell` e seus testes.

Interface: a política admite requisitos vazios como etapa planejada; a projeção informa que a
etapa aguarda cursos e jamais conclui ou concede capacidades por array vazio.

- [ ] Reproduzir ausência de estrutura e a conclusão por vacuidade em regressões específicas.
- [ ] Gerar todas as sete etapas; registrar quais aguardam cursos. Seed continua CAS/if-absent.
- [ ] Ajustar validação de IA/Pensa para estrutura planejada, mantendo a exigência na ativação.
- [ ] Exibir estado aguardando cursos no Admin e no percurso adulto.
- [ ] Conferir piso/grants antigos, caso sem curso e cadeia com lacuna; revisar e commitar.

## Lote 2 — Retirada do No Comando da IA

Prioridade antecipada por pedido explícito posterior da dona. A compra localizada é
um teste da própria dona: exclusão do curso autorizada, com histórico financeiro
preservado. Inclui remover funil/quiz/oferta e assets exclusivos, sem afetar os quatro
funis ativos. Resultados em `docs/qa/2026-10-23-retired-no-comando.md`.

Files: referências em `packages/catalog/scripts/catalog-seed-definitions.ts`, scripts de seed
Members e `packages/funnel/src/funnels/registry.ts`, conforme os vínculos reais encontrados.
Operação: API canônica do Admin, com leitura de matrículas/progresso/ofertas antes da alteração.

- [ ] Auditar dependências por leitura; registrar apenas contagens e referências comerciais.
- [ ] Retirar oferta ativa vinculada para impedir novas vendas de conteúdo removido.
- [ ] Excluir o curso se não houver histórico dependente; caso haja, arquivar preservando-o.
- [ ] Impedir recriação por seeds e conferir URLs comerciais; revisar o resultado.

## Lote 3 — Comunidade canônica do catálogo

Files: agregados/ports/views de `packages/catalog/src/domain`, `application` e
`interfaces/http/{dtos.ts,routes/admin-read.routes.ts,routes/admin.routes.ts}`;
`infrastructure/persistence/drizzle/{schema.ts,product.repository.ts,offer.repository.ts,coupon.repository.ts,migrations/}`;
`packages/admin/src/server/catalog.ts`, BFF `app/api/catalog/`, forms e seletores de `components/catalog/`.

- [ ] Auditar os 19 produtos, grafo de componentes e ofertas; produzir mapeamento explícito.
- [ ] Criar regressões de comunidade, combos/bônus incompatíveis, cupons e paginação.
- [ ] Expandir armazenamento; backfill idempotente conferido; aplicar contrato após writers compatíveis.
- [ ] Listar/criar/editar com comunidade correta; oferta e referências herdam o produto canônico.
- [ ] Garantir checkout e entitlements preservados; revisar domínio, SQL e HTTP antes do commit.

## Lote 4 — Lente nas telas de Negócio e Campanhas

Files: `packages/admin/src/components/admin/nav.ts`, `lib/platform.ts`, telas/BFF de catálogo,
embaixadores/convites, visão geral e pagamentos; adapters de serviços. Usuários e notas fiscais permanecem compartilhados.
Serviços: Referrals e Payments conforme os campos canônicos da respectiva entidade; sem alteração no Auth.

- [ ] Mapear cada lista, total, seleção e operação; distinguir entidade compartilhada de dado de audiência.
- [ ] Fazer as consultas e totais obedecerem à audiência no serviço, com busca e paginação corretas.
- [ ] Reusar o ciclo de cancelamento/identidade da lente; resetar seleções e diálogos na troca.
- [ ] Recusar referências cruzadas e conservar a audiência de entidade já aberta por URL.
- [ ] Testar Kids → Adultos → Kids com respostas atrasadas; revisar e commitar.

## Lote 5 — Zappy e Pensa

Files: Admin `app/admin/ia`, `lib/ai-usage-panels.ts`, `lib/pensa-funnel.ts`, BFF Members;
Members `application/{ai-usage,zappy,pensa}`, respectivas ports/repositórios/schema/migrations.

- [ ] Mapear origem disponível em uso/custos, conhecimento, falhas e funil do Pensa.
- [x] Separar o funil dos projetos do Pensa pela audiência já persistida; manter custos, cotas e operação geral compartilhados conforme a decisão posterior.
- [ ] Preservar histórico sem comunidade comprovável, com indicação clara e sem atribuição fictícia.
- [x] Vincular lente ao progresso do Pensa e rotular explicitamente os demais painéis como gerais; não mudar geração/backfill nem limites de IA.

## Lote 6 — Revisão integrada e liberação

- [ ] Full review dos lotes, especialmente autorizações, dados legados e contratos de migração.
- [ ] Testes de domínio/HTTP/DB e UI pertinentes, tipos, lint e build dos consumidores.
- [ ] Integrar remoto atualizado em staging local, preservar outras frentes e fazer push.
- [ ] CI e canário; provar troca de lente e seed real em staging sem dados fictícios publicados.
- [ ] Promover fonte aprovada; aplicar backfill/contrato na ordem segura e conferir a produção.
- [ ] Registrar resultado, pendências concretas e evidências redigidas no Git.
