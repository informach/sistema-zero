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
> FALTA: deploy em staging + e2e (criar serviço Railway, seeds, envs) e deploy em produção.

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
   bytea (best-effort) → (Fase 3: e-mail). Rejeição determinística → FAILED direto; rede → backoff
   exponencial (1min×2^n, teto 6h) até `NFSE_MAX_ATTEMPTS`.
3. **Competência (`dCompet`) = data da EMISSÃO em BRT** (decisão do usuário 12/06), NÃO a do pagamento.
   **Discriminação** = `NFSE_SERVICE_DESC_PREFIX` ("Treinamento on-line") + " - " + nome REAL do
   produto do catálogo (`composeServiceDescription`); fallback "Produto digital" sem oferta.
4. **Substituição** = DPS NOVA com grupo `subst{chSubstda,cMotivo}` (NÃO é evento; o sistema cancela a
   original); quando a substituta emite, a original vira SUBSTITUTED.
5. `GET /fiscal/files/:token.pdf` — capability-URL (token 32 bytes) p/ o messaging anexar o DANFSe.
6. **Emissão MANUAL (admin+)**: `POST /fiscal/admin/invoices/:id/emit-now` antecipa uma SCHEDULED
   (scheduledFor=AGORA; a re-verificação de estorno continua valendo) e
   `POST /fiscal/admin/invoices {paymentId}` cria+emite AGORA por pagamento (backfill de vendas
   antigas; exige PAID + CPF válido; 409 se já existe nota ativa). Ambas no gateway e na fatia do
   admin (botão "Emitir manualmente" no header + "Emitir agora" no detalhe de nota agendada).

## Máquina de estados

`SCHEDULED → EMITTED | SKIPPED | FAILED` · `EMITTED → CANCEL_PENDING | SUBSTITUTED` ·
`CANCEL_PENDING → CANCELLED` · `FAILED → SCHEDULED` (retry admin). Central: `domain/invoice/invoice.status.ts`.
Transições no repositório são UPDATEs **guardados por status de origem** (corrida perdida = no-op).

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
- **Fase 2 (pendente)**: gateway Sefin REAL (código do spike), rotas admin + gateway.config + fatia
  admin Next.js, Dockerfile/railway.json. **Fase 3**: e-mail (messaging + anexos), CancellationWorker,
  cron do certificado, `/metrics`, testes `tests/db/` contra Postgres real (alocação concorrente).

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` sem erros.
- [ ] Mudou schema? `db:generate` + commit da migration.
- [ ] Mudou contrato/fluxo? Atualize este CLAUDE.md e o `spike/notes.md` se for achado da Sefin.
