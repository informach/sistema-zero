# CLAUDE.md — @sistemazero/fiscal

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, Bun,
> xml-crypto, node-forge etc.) — não confie só na memória; APIs mudam. Para **pesquisa/exploração**,
> use o **MCP do Octocode**. Faça certo e atualizado — não "de cabeça".
>
> **🧾 NFS-e padrão nacional:** a fonte da verdade do leiaute/API são os documentos oficiais BAIXADOS
> em `spike/docs/` (XSD v1.01, manual, specs OpenAPI capturados com mTLS) + os achados validados na
> Produção Restrita em `spike/notes.md`. Consulte-os antes de mexer na DPS/eventos.

## O que é

**Serviço fiscal**: emite **NFS-e (padrão nacional)** automaticamente **após o período de garantia**
da compra, somente se o pagamento não foi reembolsado. Emitente: Informach (CNPJ 43.588.758/0001-03,
IM 13372670018, Belo Horizonte 3106200, **Simples Nacional** — sem destaque de ISS; Lei 12.741 via
campo `pTotTribSN`, alíquota configurável). Serviço = item 8.02 LC 116 (cTribNac `080201`, cTribMun
BH `001`, cNBS `122051900`). Porta **3009**, schema Postgres **`fiscal`**, journal `fiscal_migrations`.
Runtime: **Bun**. Plano completo: `~/.claude/plans/agora-precisamos-come-ar-a-delegated-raven.md`.

> Estado: **Fases 0–3 CONCLUÍDAS (12/06)**. Fase 0 = ciclo completo validado na Produção Restrita
> com o A1 real (emissão 201/cStat 100, cancelamento e101101, substituição via `subst`, DANFSe PDF —
> `spike/notes.md`). Fase 1 = core (agendamento + EmissionWorker). Fase 2 = **gateway Sefin REAL**
> (mTLS + xml-crypto; numa rejeição 400 consulta `GET /dps/{id}` ANTES de classificar — re-POST de
> número reusado vira `duplicate`, nunca FAILED falso) + rotas admin `/fiscal/admin/*` + rotas no
> api-gateway + fatia "Notas fiscais" no admin Next.js + Dockerfile/railway.json. Fase 3 = e-mail da
> nota via gateway→messaging (template `nfse-emitida` + anexo por capability-URL; messaging ganhou
> suporte a attachments por URL) + CancellationWorker (estorno → cMotivo 2; admin → 9) + alerta
> diário de expiração do certificado. O composition-root usa o gateway REAL quando há certificado
> (env) e o FAKE só em dev/teste sem cert (RECUSA `producao`). **47 testes.**
> **EM PRODUÇÃO (série 2)** — serviço Railway + seeds + envs feitos; deploy staging + produção concluídos.

## Endurecimentos do 2º full review (13/06) — **102 testes** (incl. `tests/db/` real)

Achados implementados (correção/fiscal/segurança/concorrência):
- **Substituição** sem nota dobrada: `invoices_substitute_active_uq` (1 substituta ativa por original)
  + 409 `SUBSTITUTE_IN_PROGRESS` na rota + **re-verificação do pagamento** (não substitui venda
  estornada). `schedule()` recupera o 23505 da substituta via `findActiveSubstituteFor`.
- **`markEmittedAsSubstitute`** (substituiu `markSubstituted`): grava EMITTED da substituta + marca a
  original SUBSTITUTED na MESMA transação (atomicidade), e SÓ se a original ainda EMITTED — um estorno
  que já iniciou ou concluiu o cancelamento NÃO é sobrescrito; a substituta real entra em
  CANCEL_PENDING na mesma transação (inclusive original CANCELLED/CANCEL_FAILED por `system:refund`).
- **Cancelamento**: `xMotivo` = TSMotivo do XSD = **15–255** chars (borda valida; worker normaliza
  defensivamente). Antes minLength 3/maxLength 500 → Sefin rejeitava → nota presa em CANCEL_PENDING.
- **Recuperação do cancelamento**: um `400` ao repetir o e101101 não vira `CANCEL_FAILED` sem antes
  consultar os eventos no ADN (`GET /contribuintes/NFSe/{chave}/Eventos`). Isso reconcilia o caso em
  que a Sefin aceitou o evento, mas a resposta/gravação local se perdeu. Se a Sefin indicar evento
  duplicado e o ADN ainda não o distribuiu, o erro é retentável e a nota permanece `CANCEL_PENDING`.
  Transições terminais de cancelamento retornam `boolean`; a timeline só registra o resultado quando
  o UPDATE guardado venceu.
- **PII em erros externos**: respostas HTTP externas não são ecoadas em exceções; CPF/CNPJ (com ou sem
  pontuação) e e-mail são redigidos antes de persistência, logs, timeline ou Sentry.
- **Coletor de presas** (`failExhausted`, no início do tick): nota SCHEDULED com `attempts > maxAttempts`
  E lease expirado (crash entre claim e transição) vira FAILED — não derruba emissão ainda em andamento
  noutra réplica e não some do `/metrics` p/ sempre.
- **Idempotência por pagamento** (`findAnyByPaymentId`): re-entrega do `paid` após SKIPPED/FAILED não
  cria 2ª nota. Oferta paga 404 no catalog → **retryable** (não emite cedo com garantia default).
- **Webhook**: a deduplicação reserva a entrega numa transação curta (`PROCESSING`) e só a marca
  concluída após sucesso; calls para payments/catalog acontecem fora da transação, evitando esgotar
  o pool. Claim abandonado expira e pode ser reentregue.
- **Entrega**: o `DeliveryWorker` sempre roda para recuperar o DANFSe; sem messaging, ignora apenas
  o e-mail pendente (não entra em loop e não perde o PDF após falha temporária).
- **Cert**: `leafCertPem` explícito (não o 1º bloco da cadeia — bag order pode pôr CA antes do leaf).
  **Circuit-breaker**: cert expirado em prod PARA os workers (por-réplica) + `fiscal.cert_expired_emission_halted`.
- **env refines novos**: série × ambiente (staging≠2, prod∉{901,902}; default agora **901**); lease
  `NFSE_CLAIM_STALE_MS ≥ 2× (S2S_TIMEOUT_MS + maior timeout Sefin/DANFSe)`; URLs S2S
  não-localhost em prod/staging; `GATEWAY_URL`+`FISCAL_HMAC_SECRET` co-dependentes e obrigatórios em
  produção; `NFSE_SIG_ALGO` (sha1|sha256, escape). Cliente de e-mail no-op retorna `false` → **não marca
  `emailSentAt` fantasma**.
- **Borda**: auth ANTES da validação (`onTransform`) + `VALIDATION` mapeado p/ 400 sem ecoar input;
  dedupe do webhook pelo **id ASSINADO do corpo** (não o `x-delivery-id` do header); PDF com
  `nosniff`+`no-store`. `esc()` remove controles C0 do XML; `composeServiceDescription` trunca por
  codepoint. Gateway: 403 = erro de cert acionável; `duplicate` carrega a chave (sem 2ª consulta);
  `NFSE_TOTAL_RETRY_BUDGET_MS` aplicado por chamada.
- **Índices**: pg_trgm GIN na busca `q` do admin (migration `0001`, com `CREATE EXTENSION` à mão).
- ⚠️ **DEPLOY (já feito — manter em qualquer novo deploy)**: os refines EXIGEM no host de prod/staging
  séries certas, `GATEWAY_URL`+`FISCAL_HMAC_SECRET` (prod), `PAYMENTS_BASE_URL`/`CATALOG_BASE_URL`/`FISCAL_SELF_URL`
  não-localhost — senão o boot falha-rápido. Migration `0001` roda no preDeploy (índices, idempotente).

## Regra de ambientes (CORAÇÃO do serviço — não relaxar)

`APP_ENV=production` ⇒ `NFSE_AMBIENTE=producao` · `APP_ENV=staging` ⇒ `producao-restrita` ·
`NODE_ENV=development` ⇒ `producao` é **RECUSADO**. Refines no `env.ts` — cruzou, o boot falha.
A Produção Restrita usa o MESMO certificado real e **não gera nota com validade jurídica**.

## Fluxo

1. **`POST /webhooks/payments`** (rede privada DIRETA, sem gateway): consumer `fiscal` no payments
   (fan-out por `subscribed_events`) entrega `payment.paid`/`payment.refunded` com HMAC do corpo
   (`x-signature: t=,v1=`) + `x-delivery-id`. Dedupe no padrão do funil (checa ANTES, marca SÓ após
   sucesso — 502 re-entrega). `paid` → busca o pagamento completo na **rota interna do payments**
   (`GET /payments/internal/payments/:id`, x-internal-token) + resolve `offerId → guaranteeDays/nome`
   no catalog (rota pública aceita UUID) → agenda `scheduledFor = paidAt + (guaranteeDays ?? 7d) + 12h`.
   CPF inválido → nasce FAILED legível. `refunded` → SCHEDULED→SKIPPED; EMITTED→CANCEL_PENDING (≤180d).
2. **`EmissionWorker`** (30s, claim SKIP LOCKED + lease, attempts++ NO claim): **re-verifica o
   pagamento NO MOMENTO da emissão** (fail-closed) → aloca número/série UMA vez (retry REUSA — re-POST
   vira `duplicate` recuperado por `GET /dps/{id}`, nunca nota dobrada) → emite → EMITTED → DANFSe em
   bytea (best-effort) → e-mail. Se DANFSe/e-mail falhar depois da NFS-e real, o `DeliveryWorker`
   reprocessa só esses efeitos pós-emissão, sem reemitir a DPS. Rejeição determinística → FAILED direto; rede → backoff
   exponencial (1min×2^n, teto 6h) até `NFSE_MAX_ATTEMPTS`.
3. **Competência (`dCompet`) = data da EMISSÃO em BRT** (decisão do usuário 12/06), NÃO a do pagamento.
   **Discriminação** = `NFSE_SERVICE_DESC_PREFIX` ("Treinamento on-line") + " - " + nome REAL do
   produto do catálogo (`composeServiceDescription`); fallback "Produto digital" sem oferta.
4. **Substituição** = DPS NOVA com grupo `subst{chSubstda,cMotivo}` (NÃO é evento; o sistema cancela a
   original); quando a substituta emite, a original vira SUBSTITUTED.
5. `GET /fiscal/files/:token.pdf` — capability-URL (token 32 bytes) p/ o messaging anexar o DANFSe.
   `GET /metrics` (`{byStatus}`; `METRICS_TOKEN` via `x-metrics-token`/Bearer, obrigatório em prod)
   — alerte em `FAILED`/`CANCEL_PENDING` > 0. Teto de corpo = `MAX_REQUEST_BODY_BYTES` (Bun.serve).
6. **Emissão MANUAL (admin+)**: `POST /fiscal/admin/invoices/:id/emit-now` antecipa uma SCHEDULED
   (scheduledFor=AGORA; a re-verificação de estorno continua valendo) e
   `POST /fiscal/admin/invoices {paymentId}` cria+emite AGORA por pagamento (backfill de vendas
   antigas; exige PAID + CPF válido; 409 se já existe nota ativa). Ambas no gateway e na fatia do
   admin (botão "Emitir manualmente" no header + "Emitir agora" no detalhe de nota agendada).

## Máquina de estados

`SCHEDULED → EMITTED | SKIPPED | FAILED` · `EMITTED → CANCEL_PENDING | SUBSTITUTED` ·
`CANCEL_PENDING → CANCELLED | CANCEL_FAILED` · `CANCEL_FAILED → CANCEL_PENDING` (nova tentativa
explícita do admin) · `FAILED → SCHEDULED` (retry de emissão). Central: `domain/invoice/invoice.status.ts`.
Transições no repositório são UPDATEs **guardados por status de origem** (corrida perdida = no-op).
⚠️ **Exceção de reconciliação:** `markEmitted` retorna `boolean`; se NÃO casar (0 linhas
porque um estorno marcou SKIPPED entre a emissão CONFIRMADA na Sefin e a gravação), o
`EmitInvoiceService` reconcilia — a NFS-e REAL existe, então `forceCancelAfterRacedEmission`
grava a chave e força `SKIPPED → CANCEL_PENDING` (cMotivo 2) p/ o CancellationWorker cancelar.
JAMAIS perder a chave de uma nota válida de venda estornada (`fiscal.emitted_after_skip` = ERROR
alertável). Os workers renovam o lease **por-nota** (`touchClaim`) antes de cada item — lote longo
não estoura o claim com N réplicas.

## Numeração da DPS

`dps_counters` por série: `UPDATE ... SET last_number = last_number + 1 RETURNING` na MESMA transação
que grava na invoice, ANTES de chamar a Sefin. Falha permanente = número queimado (gap) — aceitável
no padrão nacional. Id da DPS (45 pos): `DPS + cMun(7) + tpInscr(1; 2=CNPJ) + inscrição(14) + série(5) + número(15)`.
⚠️ **A numeração na Sefin é por CNPJ+série e a Produção Restrita é COMPARTILHADA por todos os
ambientes que a usam** (spike/local/staging) — contador local zerado + série repetida = "DPS
duplicada" (o recovery consulta e devolve a nota de OUTRO ambiente, visto na prática 12/06: a 1ª
emissão local recuperou a chave do spike). **Séries por ambiente (`NFSE_DPS_SERIE`): dev local =
`901` · staging = `902` · produção = `2`** (a Sefin de produção é outro espaço — só convive com o
Emissor Web, que usa série própria). O spike queimou os números 1–3 da série 2 em homolog.

## Gotchas validados na Produção Restrita (spike, 12/06 — NÃO redescobrir)

- Base REAL da Sefin = `/SefinNacional` (o `/API/SefinNacional` da doc é só o redoc). DANFSe e
  parametrização municipal moram no **ADN** (`GET adn.../danfse/{chave}`).
- Specs OpenAPI exigem mTLS (sem cert = 403) — capturados em `spike/docs/swagger-*.json`.
- Envelopes JSON: `{dpsXmlGZipB64}` → 201 `{chaveAcesso, nfseXmlGZipB64, idDps, ...}`; eventos
  `{pedidoRegistroEventoXmlGZipB64}`. Erro 400: `{idDPS, erros:[{Codigo,Descricao}]}` (PascalCase!).
- Assinatura: **rsa-sha1 + C14N inclusivo + enveloped ACEITA** (xml-crypto v6 sob Bun OK); mTLS =
  técnica do payments (`fetch + tls:{cert,key}`, PFX→PEM via node-forge).
- **E0116**: BH exige `<IM>` no prestador · **E0166**: ME/EPP exige `<regApTribSN>1</regApTribSN>` ·
  **E0008**: clock skew → `dhEmi` com margem de 60s · **E0207**: CPF do tomador é validado contra o
  cadastro REAL da Receita ATÉ em homolog (testes emitem SEM tomador — `toma` é opcional).
- Cancelamento: evento `e101101`, Id `PRE + chave(50) + 101101`, `xDesc` literal "Cancelamento de
  NFS-e", cMotivo 1=Erro/2=Não prestado/9=Outros. GET de eventos na Sefin = 405 (consulta é no ADN).
- ⚠️ Certificado A1 vence **23/09/2026** (renovar e atualizar env). A chave no repositório do Windows
  é NÃO-exportável — o arquivo .pfx da SOLUTI é a fonte.

## Comandos (de dentro de `packages/fiscal`)

`bun run dev|start` (porta 3009) · `typecheck` · `test` · `db:generate|db:migrate` ·
`check|check:fix` · `spike:00..05` (scripts da Fase 0; exigem `.env` com o A1 — ver `spike/.env.example`).
**Sempre** rode `typecheck` + `test` + `check` antes de concluir.

## Integrações (contratos)

- **payments**: consumer `fiscal` (seed `--subscribed-events "payment.paid,payment.refunded"`,
  webhook-url `http://fiscal.railway.internal:3009/webhooks/payments`) + rota interna
  `GET /payments/internal/payments/:id` (env `PAYMENTS_INTERNAL_TOKEN` = INTERNAL_API_TOKEN de lá;
  `PAYMENTS_WEBHOOK_HMAC_SECRET` = hmac do consumer).
- **catalog**: `GET /catalog/offers/{uuid}` (público, aceita UUID desde 06/2026).
- **Fase 2 (CONCLUÍDA)**: gateway Sefin REAL (código do spike), rotas admin `/fiscal/admin/*` +
  rotas `fiscal-admin-*` no `api-gateway/gateway.config.ts` + fatia "Notas fiscais" no admin Next.js,
  Dockerfile/railway.json. **Fase 3 (CONCLUÍDA)**: e-mail (messaging + anexos), CancellationWorker,
  cron do certificado, `/metrics`, testes `tests/db/` contra Postgres real (alocação concorrente).
  Serviço **EM PRODUÇÃO (série 2)**.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` sem erros.
- [ ] Mudou schema? `db:generate` + commit da migration.
- [ ] Mudou contrato/fluxo? Atualize este CLAUDE.md e o `spike/notes.md` se for achado da Sefin.
