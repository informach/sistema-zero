# Design — Remediação do full review do Helpdesk

Data: 2026-09-05

Base: `f36e71f354243fb249b81cc29dbcea41f8aa85cf`

Auditoria: `.audits/architectural-analysis-2026-09-05-helpdesk-full-review.md`

## Objetivo

Corrigir os 12 achados da auditoria sem substituir a arquitetura hexagonal do Helpdesk. A remediação deve preservar três contratos do produto: a IA nunca envia mensagens, o cliente nunca vê notas ou metadados internos e uma resposta do portal fica disponível imediatamente, mesmo quando o serviço de e-mail está indisponível.

O aviso por e-mail passa a ter garantia de entrega eventual. O Helpdesk persiste o aviso na mesma transação da resposta e tenta entregá-lo até o messaging aceitar a requisição.

## Decisões aprovadas

- Manter o serviço e seus limites atuais; corrigir as garantias dentro da arquitetura existente.
- Criar `@sistemazero/helpdesk-contracts`, pacote TypeScript puro usado por backend, console e portal.
- Criar outbox persistente no schema `helpdesk` com retry indefinido, lease e idempotência.
- Executar a mudança em lotes verificáveis, começando pelos dois defeitos P1.
- Usar migrations aditivas e compatíveis com deploy gradual.

## 1. Ingestão temporalmente correta

### Problema

O Gmail devolve o backfill do mais novo para o mais antigo, mas a ingestão atual aplica cada transição como se o evento fosse o mais recente. A combinação produz status, SLA, `firstMessageAt` e fila de IA incoerentes.

### Design

O repositório mantém a ingestão idempotente e serializada por thread. Ao anexar uma mensagem:

- `firstMessageAt` recebe o menor instante conhecido;
- `lastMessageAt` recebe o maior instante conhecido;
- `lastInboundAt` recebe o maior instante inbound;
- status, `resolvedAt` e agendamento de IA mudam somente quando o evento anexado é tão novo quanto o `lastMessageAt` anterior;
- um inbound histórico anterior à última resposta não reabre o ticket nem agenda rascunho;
- um outbound histórico anterior ao último inbound não move o ticket para `waiting`.

O backfill continuará paginado e idempotente. A correção ficará no repositório, para proteger também reentregas, full-resync e qualquer evento fora de ordem. Um teste do worker reproduzirá a ordem real do Gmail com inbound e outbound na mesma thread.

## 2. Geração de IA com CAS

### Problema

Claim, classificação, rascunho e conclusão usam somente o id do ticket. Um inbound recebido durante uma chamada ao LLM não invalida a execução em andamento.

### Design

Adicionar `tickets.ai_generation integer not null default 0`.

- Cada inbound atual incrementa `aiGeneration`, limpa resumo, classificação e rascunho antigos e agenda a nova geração.
- O claim retorna a geração capturada.
- `applyClassification`, `applyDraft`, `markAiDone`, `scheduleAiRetry` e `markAiFailed` recebem `expectedGeneration` e atualizam somente `ai_status='processing' and ai_generation=?`.
- Uma atualização que afeta zero linhas é resultado stale, não falha do provedor. O worker encerra essa execução sem alterar a geração nova.
- Rotas síncronas de resumir/regenerar também capturam a geração e devolvem conflito se a conversa mudar durante a chamada.
- O editor não preenche nem oferece rascunho enquanto a geração está `pending` ou `processing`.

O CAS da IA permanece separado de `tickets.version`: a versão pública continua protegendo ações humanas; `aiGeneration` protege somente o snapshot usado pelo copiloto.

## 3. Outbox de aviso do portal

### Modelo

Criar `helpdesk.portal_notification_outbox` com:

- `id` e `message_id` únicos;
- `ticket_id` para rastreio;
- snapshot imutável do destinatário, assunto, saudação, portal e chave de idempotência;
- `status`: `pending`, `processing` ou `sent`;
- `attempts`, `next_attempt_at`, `lease_expires_at`, `last_error`;
- `created_at`, `updated_at` e `sent_at`.

O snapshot evita que uma alteração posterior no ticket mude o conteúdo já comprometido. A chave de idempotência será derivada do id da mensagem do portal.

### Escrita

`appendPortalReply` fará, na mesma transação:

1. CAS de `tickets.version`;
2. inserção da mensagem outbound do portal;
3. atualização de estado/contadores;
4. inserção do outbox.

Se qualquer passo falhar, nenhum deles será confirmado.

### Entrega

Um worker reivindica um item vencido com `FOR UPDATE SKIP LOCKED`, muda-o para `processing` e define lease. O envio usa a idempotência já suportada pelo gateway e pelo messaging.

- 2xx/aceite: marca `sent`.
- Timeout, 429 ou 5xx: volta para `pending` com backoff exponencial limitado.
- Erro de configuração: mantém o item pendente e registra erro operacional.
- Falhas repetidas não criam estado terminal; o intervalo chega ao teto e o worker continua tentando. Logs de nível error e métricas tornam o backlog visível.
- Lease vencido torna um item `processing` elegível novamente após crash.

Em produção, as variáveis do gateway/messaging passam a ser obrigatórias enquanto o portal estiver habilitado. Em desenvolvimento, o serviço pode subir sem elas, mas acumula outbox e informa que a entrega está suspensa.

## 4. Contratos compartilhados

Criar `packages/helpdesk-contracts` sem dependências de Elysia, Drizzle, React ou Node. O pacote exportará:

- valores e tipos de status, categoria, prioridade, origem e portal;
- views públicas do console e do cliente;
- envelopes de paginação e cursores;
- labels compartilháveis que não dependem de UI;
- o parser puro de histórico citado.

O backend continua responsável pelos schemas runtime e importa os valores canônicos. Console e member-shell deixam de declarar cópias. O parser retorna `{ visible, quoted }`; o backend usa `visible` no prompt e o console usa ambos na apresentação.

## 5. Escala e persistência

### Fila interna

Substituir offset por cursor opaco. O cursor incluirá a tupla de ordenação, o instante fixo usado no SLA e a fronteira de atualização da página. O backend valida e decodifica o cursor; o cliente apenas o devolve. Filtros e pesquisa entram na URL do console.

### Base de conhecimento

Adicionar `AI_MAX_KB_CHARS`. O serviço normaliza termos da conversa/resumo, pontua título e conteúdo, ordena artigos por relevância e empacota trechos até o orçamento. O prompt nunca recebe a KB integral sem teto. Métricas registram artigos e caracteres incluídos.

### Índices

A migration adicionará:

- índice parcial para `ticket_messages(rfc822_message_id)` em outbound não nulo;
- índice funcional parcial para `lower(requester_email)` em tickets legados sem account id;
- índices trigram para os campos comprovadamente usados por `ILIKE '%q%'`, com `pg_trgm` criado de modo idempotente.

Os índices devem ser validados com `EXPLAIN` em banco representativo. Se o runner transacional impedir criação concorrente, o rollout separará a criação online da migration de schema.

## 6. Dependências e segurança

Atualizar o Helpdesk para `drizzle-orm >= 0.45.2` e renovar o lockfile sem atualizar pacotes não relacionados. As queries continuam usando schemas e identificadores estáticos.

O prompt passa a declarar conversa e artigos como dados não confiáveis: instruções encontradas neles não alteram a tarefa ou o formato. A classificação automática permanece sugestão reversível; categoria manual continua soberana.

## 7. Interface

- Associar um label real ao switch de publicação.
- Adicionar skip link e alvo de conteúdo.
- Desligar transições e animações sob `prefers-reduced-motion`.
- Persistir filtros e busca na query string sem perder debounce.
- Adicionar `dateTime` a elementos `<time>`.
- Remover `autoFocus` incondicional e focar somente após ação explícita em viewport adequada.
- Extrair estado de dados/formulários do portal e do detalhe de ticket para hooks/componentes focados, sem mudar a copy ou o fluxo.
- Ajustar a mensagem da resposta para comunicar “aviso agendado”, pois persistência não equivale a entrega instantânea.

## 8. Limpeza e documentação

- Remover os 17 exports sem consumidor e seus helpers privados órfãos.
- Mover lógica usada apenas por fakes para suporte de teste ou eliminar a duplicação com o contrato real.
- Corrigir comentários do gateway que ainda mencionam auto-resposta.
- Atualizar os `CLAUDE.md` afetados com `aiGeneration`, outbox e cursor.
- Atualizar a auditoria com o status de cada achado após a verificação.

## 9. Testes e evidência

Cada lote começa com uma regressão que falha no snapshot atual.

### Correção

- Backfill mais-novo-primeiro com duas ou mais mensagens da mesma thread.
- Eventos atrasados não alteram o estado derivado do evento mais recente.
- Inbound durante LLM invalida classificação/rascunho/conclusão antigos.
- Rotas síncronas de IA detectam mudança de geração.

### Outbox

- Resposta e outbox confirmam ou revertem juntos no PostgreSQL.
- Timeout após aceite pode ser repetido sem duplicar mensagem no messaging.
- Crash após claim recupera o item pelo lease.
- Falhas consecutivas respeitam backoff e nunca descartam o aviso.
- Mais de uma réplica não entrega o mesmo item em paralelo.

### Contratos e interface

- Backend, console e portal compilam contra o mesmo pacote.
- Corpus de quote stripping cobre whitespace, CRLF, Gmail e Outlook.
- Cursor não repete a página e rejeita payload adulterado.
- Orçamento da KB nunca é excedido.
- Axe/Playwright cobre diálogo, skip link, reduced motion e navegação por teclado.

### Gate final

- Typecheck, Biome, testes e builds dos pacotes afetados.
- Todas as suítes PostgreSQL com `HELPDESK_TEST_DATABASE_URL`.
- `bun audit` sem o advisory do Drizzle no caminho do Helpdesk.
- `git diff --check` e revisão do diff final.

## Ordem de implementação

1. Contratos de regressão para HD-01 e HD-02.
2. Migration de `aiGeneration`, outbox e índices.
3. Ingestão temporal e CAS da IA.
4. Outbox e worker de entrega eventual.
5. Pacote compartilhado e quote stripping.
6. Cursor, KB e dependência Drizzle.
7. Interface, remoção de código morto e documentação.
8. Verificação completa e atualização da auditoria.
