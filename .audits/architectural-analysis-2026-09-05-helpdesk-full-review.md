# Full review — Helpdesk

Data: 2026-09-05  
Snapshot revisado: `f36e71f354243fb249b81cc29dbcea41f8aa85cf`  
Escopo principal: `packages/helpdesk`, `packages/helpdesk-app` e o portal/BFF compartilhado em `packages/member-shell`.  
Integrações verificadas: `packages/community`, `packages/community-kids`, `packages/api-gateway` e `packages/messaging`.

## Status da remediação — 2026-09-05

Os 12 achados deste snapshot foram corrigidos conforme o
[design aprovado](../docs/plans/2026-09-05-helpdesk-remediation-design.md). A descrição detalhada abaixo
permanece preservada como evidência do estado original.

| ID | Status | Remediação aplicada |
|---|---|---|
| HD-01 | Corrigido | Ingestão comutativa por tempo do evento (`least`/`greatest`); eventos históricos não mudam status nem agendam IA. |
| HD-02 | Corrigido | `aiGeneration` e CAS por geração/tentativa em todas as escritas; inbound limpa resultados antigos e rotas síncronas devolvem conflito. |
| HD-03 | Corrigido | Resposta do portal e outbox persistente entram na mesma transação; worker usa lease, retry exponencial indefinido e idempotência por mensagem. |
| HD-04 | Corrigido | Candidatos da KB são limitados, selecionados lexicalmente por relevância e empacotados sob orçamento total configurável. |
| HD-05 | Corrigido no Helpdesk | O pacote resolve `drizzle-orm 0.45.2`; o audit do monorepo ainda inclui workspaces fora do escopo em 0.44.7. |
| HD-06 | Corrigido | Offset removido da fila interna; cursor opaco carrega a tupla completa e congela o relógio/admissão do percurso. |
| HD-07 | Corrigido | Índice parcial de `rfc822_message_id` alinhado ao predicado outbound não nulo. |
| HD-08 | Corrigido | Label, skip link, reduced motion, filtros na URL, `dateTime` e foco responsivo foram implementados. |
| HD-09 | Corrigido | Parser puro de citação centralizado no pacote compartilhado, com corpus CRLF/Gmail/Outlook/whitespace. |
| HD-10 | Corrigido | Exports órfãos removidos; a regra útil de rank passou a ser usada pelo cursor e lógica exclusiva de fake ficou no suporte de testes. |
| HD-11 | Corrigido | Contratos movidos para `@sistemazero/helpdesk-contracts`, componentes grandes de detalhe/portal extraídos e comentários de auto-resposta corrigidos. |
| HD-12 | Corrigido | Busca usa a mesma expressão do índice GIN trigram; ownership legado usa índice funcional parcial em `lower(email)`. |

O outbox garante entrega **pelo menos uma vez até o aceite do messaging**. Duplicatas após timeout/crash
são neutralizadas pela chave idempotente persistida no consumidor; a entrega final na caixa postal continua
sujeita ao provedor de e-mail, endereço válido e políticas de supressão.

### Rollout das migrations

1. Confirmar backup recente e permissão para `CREATE EXTENSION pg_trgm`.
2. Aplicar `0010_enable_helpdesk_pg_trgm.sql` e `0011_silent_psynapse.sql` antes de subir a nova aplicação.
3. Executar em janela de menor tráfego: os índices sobre tabelas existentes não usam `CONCURRENTLY`.
4. Após o deploy, acompanhar `portal_notification_outbox` por status/idade/tentativas e os logs
   `portal_notification.sent`, `portal_notification.retry_scheduled` e
   `portal_notification.repeated_failure`.
5. Em rollback, voltar primeiro a aplicação. As colunas, tabela e índices são aditivos e podem permanecer;
   prefira roll-forward a remover dados do outbox.

### Evidência final da remediação

| Gate | Resultado |
|---|---|
| Helpdesk Biome + typecheck | 117 arquivos, aprovado |
| Helpdesk sem banco | 151 aprovados, 28 integrações PostgreSQL puladas, 0 falhas |
| PostgreSQL descartável após migration do zero | 16 aprovados, 0 falhas; schema e 5 índices críticos conferidos no catálogo |
| Drizzle schema drift | nenhuma mudança por gerar |
| Helpdesk App | Biome + typecheck + build Next aprovados; 20 testes aprovados |
| Contratos compartilhados | Biome + typecheck aprovados; 5 testes aprovados |
| Portal/BFF no Member Shell | typecheck e Biome focado aprovados; 6 testes de Helpdesk aprovados |
| API Gateway | typecheck e Biome do arquivo alterado aprovados |
| Diff | `git diff --check` aprovado |

A suíte integral corrente do Member Shell, afetada por mudanças paralelas fora desta remediação, terminou
com 425 aprovações e uma falha em `worker durável de limpeza das criações`; os testes do Helpdesk nesse
pacote estão verdes. O `bun audit` do monorepo também continua não verde por dependências de outros
workspaces; a resolução efetiva dentro de `packages/helpdesk` foi conferida em `drizzle-orm 0.45.2`.

Não houve smoke test com Gmail, OpenRouter, gateway/messaging implantados ou conta autenticada real.

## Resumo executivo

A base arquitetural é boa: o backend mantém domínio, portas e adaptadores bem separados; autorização e isolamento do cliente têm defesa em profundidade; notas internas não entram na projeção pública; envio automático por IA não existe; a entrega pelo Gmail usa intenção persistida, idempotência e recuperação de estado incerto. O console, o portal e os contratos integrados compilam.

O snapshot, porém, não deve ser considerado livre de bloqueios. Foram encontrados dois defeitos de correção com impacto operacional alto:

1. O backfill inicial do Gmail processa mensagens em ordem inversa e pode deixar uma conversa já respondida como aberta, com SLA e IA incorretos.
2. O worker de IA não condiciona a gravação à versão da conversa; uma execução antiga pode vencer um novo inbound e publicar um rascunho obsoleto como atual.

Além deles, há riscos médios de confiabilidade, escala, dependência e acessibilidade. Resultado consolidado: **2 achados P1, 6 P2 e 4 P3**. A recomendação é corrigir HD-01 e HD-02 antes de confiar em backfill ou rascunho automático em produção.

| Prioridade | ID | Área | Achado |
|---|---|---|---|
| P1 — alta | HD-01 | Gmail / ingestão | Backfill mais-novo-primeiro corrompe o estado derivado da thread. |
| P1 — alta | HD-02 | IA / concorrência | Resultado antigo da IA sobrescreve novo inbound; rascunho anterior também permanece visível. |
| P2 — média | HD-03 | Portal / mensageria | Aviso por e-mail é pós-commit e sem outbox/retry, embora a UI prometa entrega. |
| P2 — média | HD-04 | IA / KB | Prompt inclui toda a base publicada sem limite ou recuperação por relevância. |
| P2 — média | HD-05 | Dependências | Helpdesk resolve Drizzle 0.44.7, afetado por advisory de SQL injection em identificadores. |
| P2 — média | HD-06 | Fila interna | Paginação por offset sobre ordenação mutável pode pular tickets. |
| P2 — média | HD-07 | Persistência | Reconciliação por `rfc822_message_id` não tem índice correspondente. |
| P2 — média | HD-08 | Interface | Lacunas agrupadas de acessibilidade, movimento e estado navegável. |
| P3 — baixa | HD-09 | E-mail / duplicação | Remoção de histórico citado está duplicada e já divergiu entre backend e frontend. |
| P3 — baixa | HD-10 | Manutenção | Há 17 exports sem consumidor e três helpers de produção usados somente pelos testes. |
| P3 — baixa | HD-11 | Contratos / documentação | Tipos são espelhados manualmente e comentários do gateway ainda descrevem auto-resposta. |
| P3 — baixa | HD-12 | Consultas | Busca textual e ownership legado não têm índices alinhados às expressões SQL. |

## Escopo e método

- 74 arquivos e 6.866 linhas em `packages/helpdesk/src`; 31 arquivos e 4.526 linhas de testes do backend.
- 54 arquivos e 4.379 linhas em `packages/helpdesk-app/src`.
- 779 linhas do portal/BFF em `customer-helpdesk-portal.tsx`, `customer-helpdesk.ts` e `routes/helpdesk.ts`.
- Revisão de domínio, regras de estado, persistência Drizzle/PostgreSQL, migrations, workers, Gmail/OAuth, IA, segurança, contratos HTTP, console interno, portal do cliente, gateway e notificação pelo messaging.
- Sondas determinísticas para a ordem do backfill, a corrida da IA e a divergência do quote stripping.
- Typecheck, Biome, testes, builds Next e `bun audit` executados no snapshot.
- Checklist visual baseado nas [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

Nenhum arquivo de produção foi alterado nesta revisão.

## Achados detalhados

### HD-01 — P1 — Backfill do Gmail aplica eventos na ordem errada

**Evidência**

- `gmail-sync-worker.ts:124-142` percorre `page.ids` na ordem devolvida por `users.messages.list` e ingere imediatamente cada item.
- A documentação oficial do Gmail afirma que `messages.list` retorna mensagens em [ordem cronológica inversa, mais novas primeiro](https://developers.google.com/workspace/gmail/api/guides/list-messages).
- `ticket-ingestion.repository.ts:110-124` move `new/open` para `waiting` ao ingerir outbound, independentemente de o evento ser mais antigo que `lastMessageAt`.
- `ticket-ingestion.repository.ts:125-158` reabre `waiting/resolved/closed` e agenda IA ao ingerir inbound, também sem condicionar a transição ao evento ser o mais recente.
- `lastMessageAt` usa `greatest`, mas `firstMessageAt` nunca é corrigido para o menor timestamp. Portanto os timestamps e o estado deixam de representar o mesmo evento.
- O teste de backfill em `tests/unit/gmail-sync-worker.test.ts:92-109` usa tickets diferentes e não cobre duas mensagens da mesma thread em ordem real do Gmail.

**Prova executada**

Foi simulada uma mesma thread na ordem real do endpoint: outbound às 11:00 primeiro e inbound às 10:00 depois. Resultado atual:

```json
{
  "status": "open",
  "firstMessageAt": "2026-09-05T11:00:00.000Z",
  "lastMessageAt": "2026-09-05T11:00:00.000Z",
  "lastInboundAt": "2026-09-05T10:00:00.000Z",
  "aiStatus": "pending",
  "messageCount": 2
}
```

O último evento é outbound, então o estado esperado é `waiting`; o primeiro evento ocorreu às 10:00; e não deveria surgir um rascunho para uma pergunta já respondida.

**Impacto**

Ao conectar/reconectar uma caixa sem `lastHistoryId`, conversas respondidas podem aparecer como trabalho pendente, SLA vencido e IA aguardando processamento. Um operador pode responder de novo ao cliente. O mesmo problema reaparece após expiração do histórico, pois o worker volta ao full-resync.

**Correção recomendada**

Tornar a ingestão comutativa e orientada ao tempo: atualizar `firstMessageAt` com `least`, alterar status/SLA/agendamento de IA apenas quando o evento for o mais recente e definir desempate estável. Como proteção adicional, o backfill pode materializar os metadados, ordenar por `internalDate` crescente e então ingerir. Cobrir inbound/outbound alternados na mesma thread, atravessando páginas, tanto no fake quanto no PostgreSQL.

### HD-02 — P1 — Worker de IA aceita resultado de uma conversa obsoleta

**Evidência**

- `ticket.repository.ts:204-221` faz o claim sem tocar em `tickets.version` e retorna apenas o `id` reivindicado.
- `ticket.repository.ts:227-256` grava classificação, rascunho e `done` com `where id = ...`; não há CAS por versão da conversa, lease, `messageCount` ou `lastInboundAt`.
- Os dois caminhos de inbound apenas recolocam a IA em `pending`: `customer-ticket.repository.ts:93-99` e `ticket-ingestion.repository.ts:152-158`. Eles não limpam `aiDraft`, `aiDraftAt` ou `aiDraftEdited`.
- O console entrega qualquer `ticket.aiDraft` ao editor em `ticket-detail-client.tsx:406-410`, e `reply-box.tsx:53` o usa como valor inicial mesmo quando a UI informa que a IA ainda está processando.

**Prova executada**

Uma execução foi colocada em `processing`, recebeu um novo inbound e depois teve a execução antiga concluída. Resultado:

```json
{
  "afterInbound": { "aiStatus": "pending", "aiDraft": "rascunho velho" },
  "afterOldWorkerFinishes": {
    "aiStatus": "done",
    "aiDraft": "gerado sem a nova mensagem"
  }
}
```

**Impacto**

O rascunho visível pode ignorar a mensagem mais recente, e a finalização antiga remove o novo job da fila. Como o envio é humano, não há auto-resposta, mas o operador recebe uma sugestão incorreta apresentada como atual.

**Correção recomendada**

Introduzir uma geração de IA/conversa. O inbound incrementa essa geração e limpa rascunho anterior; o claim captura a geração; `applyClassification`, `applyDraft`, `markAiDone`, retry e failed usam CAS por `id + geração + processing`. Resultado stale deve ser descartado sem encerrar o job novo. Adicionar teste de concorrência real no PostgreSQL e teste do editor durante `pending/processing`.

### HD-03 — P2 — Notificação do portal pode ser perdida definitivamente

**Evidência**

- `reply.service.ts:104-108` documenta que o aviso ocorre depois do commit e é best-effort.
- `reply.service.ts:145-156` confirma a mensagem no portal antes de chamar o messaging.
- `reply.service.ts:160-178` apenas registra `reply.notify_failed`; não persiste trabalho pendente nem agenda retry.
- `tests/integration/reply.test.ts:463-479` fixa em teste que falha no messaging ainda retorna 200 e não envia aviso.
- Em contraste, `reply-box.tsx:126` diz ao operador que o cliente “recebe um aviso por e-mail”.

**Impacto**

Qualquer timeout ou indisponibilidade transitória entre Helpdesk, gateway e messaging perde o único aviso da resposta. A chave idempotente evita duplicatas, mas não fornece garantia de entrega sem nova tentativa.

**Correção recomendada**

Se o aviso é requisito do produto, criar um outbox transacional na mesma operação de `appendPortalReply`, com worker, backoff e idempotência por `message.id`. Se best-effort for aceitável, ajustar a promessa da UI e expor um estado observável/reenvio manual.

### HD-04 — P2 — Base de conhecimento sem orçamento de contexto

**Evidência**

- `kb.repository.ts:60-66` carrega todos os artigos publicados sem `limit`.
- `composition-root.ts:194-195` entrega todos ao serviço e limita apenas a conversa (`AI_MAX_THREAD_CHARS`).
- `prompts.ts:91-95` concatena título e conteúdo integral de cada artigo.
- Cada artigo aceita até 50.000 caracteres em `dtos.ts:104-113`.

**Impacto**

O crescimento normal da KB aumenta custo e latência até exceder o contexto/request size do provedor. Nesse ponto o worker entra em retry/failed para todos os tickets, apesar de a maior parte da KB ser irrelevante ao caso.

**Correção recomendada**

Definir orçamento explícito (`AI_MAX_KB_CHARS`) e selecionar artigos por relevância/categoria. No mínimo, truncar deterministicamente por artigo e no total, registrar métricas de caracteres/tokens e cobrir o limite em testes.

### HD-05 — P2 — Drizzle resolvido em versão vulnerável

**Evidência**

- `packages/helpdesk/package.json:25` aceita `drizzle-orm ^0.44.5`.
- `bun.lock:1986` e a instalação local resolvem `0.44.7`.
- `bun audit` reportou o [GHSA-gpj5-g38j-94v9 / CVE-2026-39356](https://github.com/advisories/GHSA-gpj5-g38j-94v9): versões anteriores a 0.45.2 escapam incorretamente identificadores SQL.
- Não foi encontrado `sql.identifier()`, alias dinâmico `.as()` ou `sql.raw()` controlado por request no Helpdesk. Portanto a revisão não demonstrou um caminho explorável no código atual; o risco aumenta imediatamente se surgir ordenação/alias dinâmico.

**Impacto**

O componente de persistência fica abaixo da versão corrigida de uma vulnerabilidade high. Mesmo sem o padrão perigoso hoje, o pacote mantém uma armadilha silenciosa para evolução futura e faz o audit falhar.

**Correção recomendada**

Atualizar para `drizzle-orm >= 0.45.2`, regenerar/validar o lockfile e executar todas as suítes PostgreSQL antes do deploy. Manter entrada de usuário mapeada para colunas estáticas, nunca para identificadores livres.

### HD-06 — P2 — Paginação da fila interna pode pular tickets

**Evidência**

- A ordenação em `ticket.repository.ts:127-134` depende de rank operacional, deadline, `lastMessageAt` e `id`, mas usa `offset`.
- A UI calcula a próxima página com `items.length` em `tickets-client.tsx:100-106`.
- Novos tickets, inbound, atribuição e passagem do relógio no SLA podem mudar a posição de itens entre duas requisições.

**Impacto**

Se um item entra ou muda de posição antes de “Carregar mais”, outro pode ser repetido ou pulado. A deduplicação do frontend remove repetidos, mas não recupera os omitidos; em uma fila de suporte isso pode esconder trabalho.

**Correção recomendada**

Usar cursor keyset com a tupla completa da ordenação e snapshot de `now`, ou um cursor opaco emitido pelo backend. O portal do cliente já usa esse modelo e pode servir de referência.

### HD-07 — P2 — Busca de reconciliação sem índice

**Evidência**

- Cada ingestão que possui header Message-ID consulta `ticket_messages.rfc822_message_id` mais `direction='outbound'` em `ticket-ingestion.repository.ts:44-58`.
- `schema.ts:206-210` possui índices para `gmail_message_id`, entrega por ticket e ordem do ticket, mas nenhum para `rfc822_message_id`.

**Impacto**

À medida que `ticket_messages` cresce, o poller pode fazer scan amplo para cada mensagem importada. Isso alonga o lease do sync e amplia atraso/backlog justamente no caminho de recuperação de entrega incerta.

**Correção recomendada**

Adicionar índice parcial, por exemplo sobre `rfc822_message_id` onde ele não é nulo e `direction='outbound'`; validar com `EXPLAIN (ANALYZE, BUFFERS)` em volume representativo.

### HD-08 — P2 — Lacunas de interface e acessibilidade

**Evidência**

- O `Switch` de publicação em `article-dialog.tsx:144-156` tem `id`, mas o texto “Publicado” é um `<p>`, não um `<label>` nem `aria-label`.
- `globals.css:243-246` anima overlay/modal sem fallback `prefers-reduced-motion`.
- Os layouts possuem `<main>` em `app/(app)/layout.tsx:20` e `:40`, mas não há skip link no layout raiz.
- Filtros e busca vivem apenas em `useState` em `tickets-client.tsx:49-52`; refresh, back/forward e link compartilhado perdem a visão atual.
- O portal usa `autoFocus` incondicional em `customer-helpdesk-portal.tsx:335` e `<time>` sem `dateTime` em `:527`.

**Impacto**

O toggle não tem nome acessível confiável, usuários de teclado precisam atravessar toda a navegação, pessoas com preferência por movimento reduzido ainda recebem animação e o estado operacional não é reproduzível por URL.

**Correção recomendada**

Associar label ao switch; adicionar skip link e alvo; respeitar `prefers-reduced-motion`; sincronizar filtros/pesquisa com query string; limitar `autoFocus` a desktop/ação deliberada; preencher `dateTime`. Cobrir ao menos o diálogo e a navegação principal com axe/Playwright.

### HD-09 — P3 — Quote stripping duplicado e divergente

**Evidência**

- `domain/mail/quote-strip.ts:4` declara que espelha o frontend.
- O backend detecta citação somente com `line.startsWith('>')` em `:18`.
- O frontend aceita espaço antes do marcador com `/^\s*>/` em `helpdesk-app/src/lib/quote.ts:20` e `:42`.
- Sonda com `"Nova resposta\n\n  > histórico antigo"`: a UI mostrou apenas `Nova resposta`, enquanto o contexto da IA reteve também o histórico.

**Impacto**

A IA pode receber texto que a equipe vê como histórico oculto, aumentando ruído, custo e risco de classificação/resposta baseada em conversa antiga.

**Correção recomendada**

Centralizar o algoritmo puro ou compartilhar um corpus único de vetores de teste entre backend e frontend. Corrigir o whitespace no backend e incluir CRLF, Outlook, Gmail localizado e citações aninhadas.

### HD-10 — P3 — Código morto e helpers test-only no código de produção

Um scan lexical de 389 declarações exportadas, pesquisadas em 1.581 arquivos relevantes, encontrou 17 exports sem consumidor (4,4% das declarações exportadas):

- `helpdesk-errors.ts:18` e `:44`: `OAuthStateInvalidError`, `InvalidTicketStateError`.
- `pg-errors.ts:11`: `isUniqueViolation`.
- `schema.ts:262-266`: cinco aliases `*Row`.
- `helpdesk-app/src/lib/dates.ts:20-72` e `:89`: oito helpers sem uso.
- `helpdesk-app/src/lib/format.ts:10`: `formatDateOnly`.

Além disso, `matchesSlaFilter`, `ticketSlaRank` e `statusOnInbound` aparecem no código de produção, mas são consumidos somente por testes/fakes; o SQL de produção reimplementa essas regras.

**Impacto**

O volume é pequeno, mas aumenta a superfície de manutenção e mascara deriva entre o domínio em TypeScript, os fakes e o SQL real. O `tsconfig` não denuncia isso porque `noUnusedLocals`/`noUnusedParameters` estão desabilitados.

**Correção recomendada**

Remover exports sem contrato futuro real; mover helpers exclusivos de fake para suporte de testes ou criar uma única especificação compartilhada para as regras que o SQL materializa. Adotar scan de exports/Knip com allowlist para entradas de framework.

### HD-11 — P3 — Contratos espelhados e documentação de auto-resposta

**Evidência**

- O union de status existe em `domain/ticket/ticket.ts:1`, `helpdesk-app/src/lib/types.ts:34` e `member-shell/src/lib/customer-helpdesk.ts:2`; views e labels também são manuais.
- `gateway.config.ts:187`, `:419` e `:3350` ainda dizem “auto-resposta” e até descrevem um toggle de envio automático, contrariando a regra atual de revisão humana obrigatória.
- Dois componentes concentram muitos estados e fluxos: `customer-helpdesk-portal.tsx` tem 566 linhas e `ticket-detail-client.tsx` tem 424.

**Impacto**

Mudanças de enum/view exigem lockstep em três camadas sem geração de contrato; comentários de segurança incorretos confundem revisão e operação. Componentes grandes tornam corridas assíncronas e estados de formulário mais difíceis de isolar.

**Correção recomendada**

Gerar tipos clientes a partir dos schemas HTTP ou publicar um pacote de contratos sem dependência de servidor. Corrigir imediatamente os comentários de auto-resposta. Extrair hooks/componentes por responsabilidade quando houver nova mudança funcional, mantendo o comportamento coberto.

### HD-12 — P3 — Índices não acompanham expressões de consulta

**Evidência**

- Ownership legado usa `lower(requester_email) = lower(email)` em `customer-ticket.repository.ts:112-120`, enquanto `schema.ts:159` indexa `requester_email` sem expressão.
- Busca interna usa `ILIKE '%q%'` em assunto, e-mail e nome em `ticket.repository.ts:76-84`; não há índice trigram/GIN correspondente.

**Impacto**

Listagem do portal para tickets legados e busca do console tendem a degradar com o crescimento da base. A cláusula `OR` entre account id e e-mail também pode dificultar o plano do PostgreSQL.

**Correção recomendada**

Medir com dados reais. Se necessário, criar índice funcional parcial sobre `lower(requester_email)` para `requester_account_id is null` e índices trigram apenas nas colunas justificadas pelo uso; considerar duas branches/`UNION ALL` no ownership se o plano não combinar índices.

## Segurança e comportamentos aprovados

- Gateway exige JWT de conta ativa nas rotas do portal e injeta identidade confiável; o backend não confia em account id enviado no body.
- Ownership do cliente é aplicado na cláusula SQL; sessão de perfil infantil não recebe acesso ao portal do responsável.
- A projeção pública é estreita, filtra `visibility='customer'` e não expõe notas, rascunhos, resumo/classificação de IA, responsáveis ou metadados Gmail.
- Respostas são sempre iniciadas por humano. Não foi encontrado caminho de auto-resposta.
- OAuth usa state single-use e PKCE; tokens de acesso/refresh são selados com AES-256-GCM; comparação do token interno é constante.
- Envio Gmail possui intenção persistida, CAS de versão, idempotência por Message-ID e reconciliação para resultado incerto.
- Valores do template do messaging são escapados antes de entrar em HTML.
- Não foram encontrados `dangerouslySetInnerHTML`, `eval`, `new Function`, `@ts-ignore` ou `any` explícito na superfície central revisada.

## Saúde arquitetural

| Dimensão | Avaliação | Observação |
|---|---|---|
| Separação de camadas | Boa | Domínio, application, ports e adapters estão claros. |
| Segurança de borda | Boa | JWT/HMAC/internal token e anti-spoof estão sobrepostos corretamente. |
| Consistência transacional | Boa com exceções | Reply Gmail/portal é forte; notificação e IA não compartilham a mesma garantia. |
| Concorrência | Parcial | Entrega tem CAS; IA não tem geração/CAS e ingestão não é event-time-safe. |
| Testabilidade | Boa | Fakes e suites são amplos; o principal vazio está no PostgreSQL não executado. |
| Escalabilidade | Parcial | Offset mutável, KB integral e índice ausente surgem antes do volume alto. |
| Frontend/acessibilidade | Parcial | Fluxos são claros, mas faltam garantias básicas de navegação e movimento. |
| Dívida detectável | Moderada | 17 exports sem consumidor e contratos/algoritmos espelhados manualmente. |

## Verificação executada

| Comando/escopo | Resultado |
|---|---|
| Helpdesk `tsc --noEmit` | aprovado |
| Helpdesk `biome check .` | 109 arquivos, aprovado |
| Helpdesk `bun test` | 136 aprovados, 21 pulados, 0 falhas |
| Helpdesk App typecheck + Biome + build Next | aprovado; 63 arquivos no check |
| Helpdesk App `bun test` | 20 aprovados, 0 falhas |
| Member Shell typecheck + Biome | aprovado; 153 arquivos no check |
| Member Shell `bun test` | 424 aprovados, 0 falhas |
| Community typecheck + Biome + build Next | aprovado |
| Community `bun test` | 5 aprovados, 0 falhas |
| Community Kids typecheck + Biome + build Next | aprovado |
| Community Kids `bun test tests` | 527 aprovados, 0 falhas |
| API Gateway typecheck + Biome + `bun test` | 214 aprovados, 0 falhas |
| Messaging typecheck + Biome + `bun test` | 135 aprovados, 0 falhas |
| Builds Next | Helpdesk App, Community e Community Kids aprovados |
| `bun audit` | falhou: 40 advisories no monorepo; Drizzle é o item direto do Helpdesk |
| `git diff --cached --check` | aprovado antes de o snapshot ser commitado |

No total dos escopos unitários/integrados executáveis acima: **1.461 testes aprovados**.

### Lacunas de evidência

- Os 21 testes pulados do Helpdesk são justamente suítes reais de PostgreSQL: unicidade/claim da conexão, ownership, ingestão concorrente/rollback, outbox de reply, append do portal e SQL de SLA. `HELPDESK_TEST_DATABASE_URL` não estava disponível.
- `bun test` sem filtro em `community-kids` também tenta carregar dois specs Playwright como testes Bun e termina com 527 aprovados + 2 erros de harness. `bun test tests` passa; não é falha do Helpdesk, mas o script amplo do pacote não está verde.
- Não houve smoke test com conta Google real, mailbox real, OpenRouter, gateway/messaging implantados ou navegador autenticado. Builds e contratos locais não provam essas integrações externas.
- Não foi executado `EXPLAIN ANALYZE`, pois não havia banco representativo.

## Ordem recomendada de remediação

1. **HD-01:** tornar ingestão/backfill temporalmente correto e adicionar regressão multi-message/multi-page.
2. **HD-02:** adicionar geração/CAS à IA, limpar rascunho stale e proteger o editor.
3. **HD-05:** atualizar Drizzle e rodar todas as 21 suítes PostgreSQL.
4. **HD-03:** decidir garantia do aviso e implementar outbox ou corrigir a promessa do produto.
5. **HD-04, HD-06 e HD-07:** orçamento da KB, cursor da fila e índice de reconciliação.
6. **HD-08 a HD-12:** acessibilidade, duplicação, contratos, documentação, código morto e índices condicionados a medição.
