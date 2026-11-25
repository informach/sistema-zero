# CLAUDE.md — @sistemazero/referrals

## Origem por aquisição, ofertas dos embaixadores e campanha de venda (25/11/2026, em andamento)

**Uma oferta por curso em cada lista e o link curto por curso (25/11/2026, depois do Lote 4).**
`AmbassadorOffersService.replace` recusa (400, "X e Y são do mesmo curso. Deixe só uma delas ligada
nesta lista.") duas ofertas LIGADAS do mesmo produto (`GiftOffer.productSku`, do `product.sku` da
leitura do catálogo) na mesma lista; desligada não conta e as listas de presente e de indicação são
independentes (o mesmo curso pode estar uma vez em cada). As opções do painel levam `productSku`.
`GET /referrals/internal/links/:code?product=<sku>[,<sku>...]&kind=gift|referral[&checkout=1]`
(`ReferralLinkService.resolveForProduct`; até 4 SKUs, um por página do apelido) devolve a oferta da
lista daquele tipo cujo produto é um dos pedidos (404 sem ela); código de campanha ignora o produto e
devolve a oferta da campanha. É o que o funil usa para `/i/<código>/<apelido>[/pagamento|/presente]`.
A rota do gateway é a mesma (`/referrals/internal/links/:code`, a query passa). Testes:
`tests/application/origin.test.ts` e `tests/integration/origin-http.test.ts`.

Plano: `~/.claude/plans/certo-pode-implementar-essa-scalable-moler-of-b148f7fd-d0e6-4d96-94d2-9e9851d0669e.md`;
proposta visual aprovada no Canvas `https://claude.ai/artifact/KUqRLeArtSWi9XLwjMWPXc`.

Migration `0013_origin_acquisitions` (gerada pelo drizzle-kit):
- `acquisitions`: cada presente resgatado (`kind gift`, `redemption_id`), compra avulsa
  (`one_time`) e PRIMEIRA cobrança de assinatura (`subscription`), com `origin_kind`
  (`ambassador|campaign|platform|ads|none`), `code_id`/`campaign_id`/`ambassador_id`, `place`
  (botão da plataforma) e `utm`. UNIQUE parcial por `payment_id` e por `redemption_id`; CHECK
  `acquisitions_source_check` (presente tem resgate, compra tem pagamento). "Por onde a pessoa
  entrou" é a mais antiga; o bônus olha as aquisições com embaixador dentro do prazo.
- `ambassador_offers`: a lista do PÚBLICO (vale para todos os embaixadores dele) de ofertas de
  presente (`gift`) e de indicação (`referral`), com `position` e `enabled`.
- `campaigns`: `kind` (`gift` padrão | `sale`), `sale_offer_id`, `link_target` (`page|checkout`),
  `redirect_path` + `redirect_until` (endereço antigo do funil redirecionado até a data, UNIQUE
  parcial). O endereço antigo fica na campanha e NÃO vira linha em `codes` (`codes_campaign_uq` e
  os JOINs de `campaign.repository` aceitam um código por campanha).
- `conversions`: `redemption_id` opcional, `acquisition_id`, `subscriber_email` + `audience` e o
  UNIQUE parcial `conversions_subscriber_uq` (uma primeira assinatura por pessoa e público, fora
  `canceled/superseded`); `conversions_redemption_uq` e `conversions_payment_uq` continuam.
- Core (`@sistemazero/core/referrals`): `CampaignKind`, `CampaignLinkTarget`,
  `isCampaignRedirectPath`, `OriginResults`, `AmbassadorOffer*`, `AcquisitionOriginKind`,
  `AcquisitionKind`, `sanitizeReferralCode`, `sanitizeOriginPlace` e as chaves planas do metadata
  do pagamento `origemCodigo`/`origemLugar`. Tudo opcional no fio.
- Links: `referralLinkUrl` em `domain/links.ts` (`/i/<code>[/<oferta>][/pagamento]`); o
  `/bolsa/<code>` antigo continua valendo e o funil o redireciona para a página da oferta.

Serviços (Lote 2):
- **Aquisição de presente:** `RedeemScholarshipService` grava a aquisição `gift` logo após
  `markRedemptionGranted` (best-effort, com o acordo do bônus em `bonus_terms`: valores e prazo
  capturados na hora, campanha pelo snapshot `campaignReferral`, link pessoal com
  `BONUS_WINDOW_DAYS`=45). O sweep repara presentes concluídos sem aquisição
  (`AcquisitionMaintenanceService.repairGifts`: os dos últimos 7 dias ganham o prazo normal, os
  antigos o prazo longo de 3650 dias, para o backfill não tirar bônus de ninguém) e completa o
  slug das compras (`fillOfferSlugs`).
- **Compra (`RecordConversionService`, reescrito):** TODO `payment.paid` vira aquisição pelo
  metadata (`origemCodigo` → embaixador/campanha; `origemLugar` → `platform`; `origemFonte` →
  `ads`; nada → `none`), sem catálogo quando o público vem em `billingAudience`. Renovação não é
  aquisição: já existe aquisição dessa `subscription_id`, ou a cobrança veio mais de 20 dias
  depois de a assinatura nascer. O bônus: só slug em `CONVERSION_OFFER_SLUGS`;
  `firstAmbassadorInWindow` procura, entre as aquisições ativas da pessoa (e-mail ou conta) no
  público, a PRIMEIRA com embaixador cujo prazo cobre a data em que a assinatura nasceu; sem
  nenhuma, tenta o outro público (presente Kids → Comunidade adulta). Assinatura criada antes da
  entrada pelo embaixador não é dele. A vaga é `conversions_subscriber_uq` (lock
  `742918462`); estorno marca a aquisição `refunded`.
- **Listas:** `AmbassadorOffersService` (`GET|PUT /referrals/admin/ambassador-offers`, lock
  `742918463`): presente pela régua `giftOfferProblem`; indicação = oferta não arquivada, não
  rascunho, do mesmo público. Máx. 20 por lista.
- **Links:** `ReferralLinkService` + `GET /referrals/internal/links/:code[/:oferta][/pagamento]`
  (`mode gift|sale`, `target page|checkout`, estado da campanha, cupom); embaixador sem oferta =
  presente padrão (links antigos). `GET /referrals/internal/redirects` sem `path` devolve a
  lista dos endereços antigos ativos (`{items: [{path, url, until}]}`, que o funil guarda por um
  minuto); com `?path=`, só aquele (404 fora do prazo). Campanha de venda: `kind` só muda em
  rascunho sem aquisições (409 `CAMPAIGN_KIND_LOCKED`); endereço de outra campanha → 409
  `CAMPAIGN_REDIRECT_TAKEN`.
- **Presente escolhido** (`RedeemScholarshipService.giftRefFor`): campanha usa a oferta dela, e
  campanha de VENDA não dá presente (`codes/:code` 404, resgate 404, área de membros 410). Código
  de embaixador aceita `offer` (slug) no resgate e `?offer=` no `codes/:code` quando a oferta
  está LIGADA na lista de presentes do público (`AmbassadorOffersService.allowed`); fora da lista
  = 404; sem `offer`, a oferta padrão. A leitura pública do presente traz `gift.offerSlug`.
- **Convite por oferta** (`CreateInviteService`, `POST …/invites` com `offer` + `kind`): a oferta
  precisa estar ligada na lista do público (`OFFER_NOT_FOUND` 404); templates
  `referrals-offer-{gift,referral}-invite[-adult]` (`nome`, `indicador`, `oferta`, `link` =
  `/i/<código>/<oferta>`). A indicação de oferta à venda não é barrada por presente já resgatado.
- **Prazo divulgado** (25/11/2026): `GiftOffer.advertisedAccessDays` vem do `content` do catálogo
  (só abaixo de um prazo real em dias). O que as pessoas veem usa ele (`giftAdvertisedDays`,
  `shownDaysOf`/`shownExpiresAtOf`): `gift.accessDays` da leitura pública e da área de membros,
  `expiresAt` do resgate, `prazo`/`validade` das boas-vindas e o `accessDays` das opções do
  embaixador. `access_duration_days` do resgate continua o prazo REAL (decide a retomada e o
  `gift_window_elapsed`); o members avisa os dias extras no fim do divulgado.
- **Correções da revisão do Lote 4 (25/11/2026):** `AmbassadorOffersService.allowed` resolve SÓ a
  oferta pedida e LANÇA `GiftCatalogUnavailableError` com o catálogo fora (resgate
  `upstream_error`, leitura pública 502/503, nunca "link não existe"); a opção traz `accessMonths`
  para a oferta de venda em meses (`accessDays` fica null). O prazo divulgado é GRAVADO no resgate
  (`scholarship_redemptions.advertised_days`, migration `0014`) e é ele que a resposta e os e-mails
  mostram: mudar a oferta depois não muda a data de quem já resgatou. O convite do presente do Cadê
  escolhido usa o e-mail aprovado do Cadê com o link `/i/<código>/<oferta>`. ⚠️ Pendente
  consciente: um resgate pendente cuja oferta escolhida saiu da lista não retoma pelo link novo.
- **Revisão da oferta como parâmetro (25/11/2026):** os links curtos por produto
  (`resolveForProduct`) usam `AmbassadorOffersService.optionsOrThrow`, que LANÇA com o catálogo fora
  (`upstream_error`, nunca "link não existe"). A campanha de VENDA só salva com oferta que seja a
  principal do produto (`GiftOfferCatalog.primaryOfferSlugOf`, `GET /catalog/products/by-sku/:sku`)
  ou marcada `content.pageSellable` no Catálogo: a página de venda não abre outra oferta.
- **Relatórios** (`AcquisitionReportsService`, admin+ no gateway e no serviço porque trazem
  e-mails e faturamento): `GET /referrals/admin/origins`, `/acquisitions?email`,
  `/campaigns/:id/results`, `/ambassadors/:id/results`. A lista de campanhas e de embaixadores
  traz `results` (quantidades + faturamento). A página do embaixador (`by-token`) recebe só
  `stats.people` e as `offers` com os links: nunca valores de venda.
- **Backfill:** `bun run acquisitions:backfill [plan|apply]` (conversões ganham
  `subscriber_email`; presentes e conversões viram aquisições, as conversões estornadas como
  aquisição `refunded`; listas nascem com o Cadê).

Correções da revisão do Lote 2 (25/11/2026):
- O pagamento repara os presentes da PRÓPRIA pessoa sem aquisição antes de escolher o
  embaixador (`repairGifts(20, email)`; falha = reentrega). Sem isso, quem resgatou antes da 0013
  e assinou antes do primeiro sweep perdia o bônus em silêncio.
- Prazo do reparo por corte FIXO, não pela idade: `ORIGIN_LEGACY_BEFORE` (ISO, setar no Railway
  com o instante do deploy da 0013). Presente concluído antes = prazo longo (3650 dias, o acordo
  antigo não tinha prazo); depois = prazo de hoje. Sem a env, todo reparo ganha o prazo longo.
- A releitura do pagamento (`cancelIfNoLongerPaid`) só roda no caminho que grava conversão; a
  compra sem bônus não paga a ida extra (o "custo zero no agregado" de sempre).
- Mesma CONTA com outro e-mail de cobrança: antes de gravar, confere as conversões ativas dos
  e-mails da pessoa no público (a vaga do UNIQUE é por e-mail).
- `origemFonte` usa `sanitizeOriginSource` (aceita `_`, `.` e `+` do `utm_source`).
- Relatórios: passando de 20.000 linhas ficam as MAIS NOVAS e a Origem das vendas traz
  `truncated: true`. Slugs: cursor por ciclo, oferta que o catálogo não resolve não trava a fila.
- `stats.conversions` da campanha junta pelo código (a venda direta não tem resgate).
- Listas de campanhas e embaixadores: `results.revenueCents` é `null` para staff.

⚠️ Seção "Banco" abaixo está desatualizada em dois pontos: o resgate é UNIQUE
`(email, audience, gift_slot)` (0011; vagas `main`, `parents:`, `course:`, `offer:` desde a
0012) e o UNIQUE parcial de conversões exclui `canceled` e `superseded` (0007).

## Vaga do presente: curso para pais não ocupa a do público (18/11/2026)

O limite deixou de ser "um resgate por e-mail e público" e passou a ser por VAGA
(`scholarship_redemptions.gift_slot`, migration `0011_gift-slot`, à mão e idempotente):

- `main`: o presente do público (Cadê Todo Mundo e afins). Um por e-mail e público, como sempre.
  Todos os resgates anteriores ficaram em `main`.
- `parents:<slug do curso>`: curso para pais (`learner: 'parents'`). Um por curso. Não ocupa a vaga
  `main`: quem pega o minicurso para pais pela página do funil ainda resgata o presente da
  criança com o mesmo e-mail (e vice-versa), que é o caso da Aula 7 do curso
  `transformando-o-vilao-em-aliado`.

`giftSlotOf` (no port) é a fonte única. UNIQUE `scholarship_redemptions_email_audience_slot_uq
(email, audience, gift_slot)` + CHECK do formato. No `RedeemScholarshipService`, a oferta do código
é resolvida ANTES de procurar o resgate existente, porque a vaga sai do curso dela. Com o catálogo
fora, a vaga sai do que está gravado: campanha com oferta → o resgate dessa mesma oferta; sem
oferta própria (código de pessoa) → `main`. Assim o 409 do concluído continua valendo e nenhum
resgate novo nasce sem a oferta resolver. Retomada segue usando a oferta gravada.

`findRedemptionByEmail(email, audience)` sem vaga = `main` (o convite do embaixador só barra quem
já tem o presente do público). `listRedemptionsByEmail` traz todas as vagas. Conversões: nada
mudou, o consumer continua ficando com o resgate MAIS ANTIGO do público, que mantém a atribuição
original.

## Presente por oferta do catálogo (15/11/2026)

O presente deixou de ter curso e prazo fixos no código: é uma OFERTA do catálogo. A campanha
escolhe a oferta (`campaigns.gift_offer_id`); códigos de embaixador (e campanhas antigas ainda sem
oferta) usam `DEFAULT_GIFT_OFFER_SLUGS` em `domain/gift-policy.ts` (`cade-todo-mundo-7-dias` /
`cade-todo-mundo-adulto-7-dias`). Saíram as envs `SCHOLARSHIP_COURSE_SLUG` /
`SCHOLARSHIP_ADULT_COURSE_SLUG` e a constante dos sete dias.

- **Catálogo:** `GiftOfferCatalogHttpClient` fala DIRETO com o catálogo na rede privada
  (`CATALOG_BASE_URL`), o mesmo caminho do members e do cupom: `GET /catalog/offers/:ref`
  (pública: nome, status, `product.audience`, política) + `GET /catalog/offers/:ref/entitlements`
  com `x-internal-token` = `CATALOG_INTERNAL_TOKEN` (o `INTERNAL_API_TOKEN` do catálogo; sem ele o
  catálogo de produção responde 401 e o presente fica indisponível). Não há rota S2S no gateway
  para os entitlements, por isso o caminho direto. Cache de 30 s só de acertos. Curso = `courseRef`
  do item principal com acesso `course`; Mural = item `community` com a chave do Mural completo.
- **Campanha:** `giftOfferId` (UUID) no DTO (`campaignBody`/`campaignUpdateBody`), obrigatório na
  criação; duplicata herda a da original se omitido; edição omitida conserva. A oferta precisa
  resolver, ser de pagamento único (`lifetime` ou `fixed` com duração em DIAS; prazo em meses é
  recusado), não estar arquivada (`status` da leitura pública; pausada serve) e ter o público da
  campanha (`product.audience` da oferta) — `giftOfferProblem`, a mesma régua do `planGift`. Trocar uma oferta já ligada segue a régua do
  público (só em rascunho sem cadastros; serviço + repo sob o lock) → 409
  `CAMPAIGN_GIFT_OFFER_LOCKED`. Ligar oferta a campanha antiga sem oferta é livre. Catálogo fora →
  503 `CATALOG_UNAVAILABLE`.
- **Resgate novo:** antes do claim resolve a oferta (`planGift`: oferta existe, serve como presente,
  curso principal publicado via `gift-course`, app do público configurado). O claim grava
  `gift_offer_id`, `mural_visitor_policy = 'offer'`, `access_duration_days` (o prazo fixo, sempre em
  dias; vitalícia = null) e `course_slug` (curso principal, para leitura/e-mail). Sob o lock da
  campanha, a oferta precisa ser a dela (`GiftOfferChangedError` → 502 e nova tentativa). Grant
  único: `gateway.grantManualOffer` → `POST /members/webhooks/grant-manual`
  `{mode:'offer', useOfferAccessPolicy:true, userId, offerRef, sourceId:'scholarship:<id>',
  anchorAt:<createdAt>, audience}` com `x-delivery-id: scholarship:offer:<offerId>:<id>`. O members
  concede tudo o que a oferta inclui com o prazo dela (e a visita ao Mural depois, se a oferta de
  prazo fixo inclui o Mural). 409/503 `COURSE_UNAVAILABLE`/outros 5xx: mesma régua do grant de curso.
  O fim do presente é recalculado aqui (dias gravados contados do resgate); sem prazo, não expira. `muralAccess` = `trial` se a oferta inclui o
  Mural, `none` se não. Retomada de resgate por oferta usa a oferta GRAVADA, nunca a atual da campanha.
- **Resgates antigos** (`trial`/`visitor`/históricos) seguem o caminho antigo
  (`grantManualCourse` + `grantMuralTrial`/`grantMuralVisitor`) com o curso gravado no resgate
  (linha sem curso usa o curso da oferta padrão). `gifts:upgrade-mural` lê o curso do resgate.
- **Leitura pública** `GET internal/codes/:code`: `gift {offerId, offerTitle, courseSlug,
  courseTitle, learner, accessDays, includesMural}` quando a oferta resolve e o curso está
  publicado (ausente se não). Título e `learner` vêm do `gift-course` do members. Desde o mesmo
  dia, a campanha agendada, pausada ou encerrada também traz o `gift` (com `giftAvailable:
  false`), para o funil mostrar a página do curso certo (curso para pais tem outra); falha do
  catálogo nesses estados só omite o `gift`, sem 502.
- **E-mails:** as boas-vindas por oferta usam as chaves `-mural-trial` (Kids) e `-adult`, com
  `indicador` (código de pessoa, conta nova ou existente, com ou sem prazo) ou `campanha`, `curso`,
  `prazo` (texto pronto com `giftDurationLabel` do Core: "por 7 dias, até <data> (horário de
  Brasília)" ou "sem prazo para terminar"), `mural` (frase pronta ou vazia; o Messaging não tem condicional) e `orientacao`
  (`giftGuidanceText`, texto puro: no curso da criança, criar o perfil e autorizar o aparelho, com
  o aviso da autorização antiga na conta existente; no curso para pais, "Entre na área dos pais e
  abra o curso em Cursos para pais."). `validade` segue no
  envio por compatibilidade com o seed antigo. Curso para pais (`learner: 'parents'`) com conta
  existente → `${KIDS_COMMUNITY_URL}/pais/cursos/<slug>`; conta nova → primeiro acesso de sempre.
  ⚠️ Ordem do deploy: referrals e members ANTES do seed do messaging (os templates novos exigem as
  variáveis novas; o seed antigo aceita as extras).
- **Backfill:** `bun run gifts:backfill-offer [plan|apply]` liga campanhas sem oferta à oferta padrão
  do mesmo público (relatório JSON só com ids/público/estado; idempotente; histórico da campanha
  ganha a trilha, `updated_at` fica). Migration `0010_gift-offer` (à mão, `ADD COLUMN IF NOT EXISTS`).

## Nome público de quem oferece o presente (05/11/2026)

`publicGiftSourceName` do Core usa apenas o primeiro nome para origens de pessoa e mantém
o título completo das campanhas. A projeção de `GET internal/codes/:code` e os textos dos
e-mails de convite e liberação usam essa regra. Ela também se aplica a retomadas com snapshots
antigos. Nomes completos continuam no cadastro, no painel privado, nos códigos persistidos e
no histórico financeiro; não há migração nem reescrita desses registros.

## Campanhas no painel do parceiro (05/11/2026)

A leitura pelo token do embaixador ativo inclui `campaigns`, paginada por `campaignOffset`
(20 itens). O SQL filtra `ambassadorId` e exclui rascunhos antes de limitar e contar.
A projeção é explícita: título público, público, datas, situação, link e termos atuais de comissão.
Não incluir participantes, histórico, canal ou notas internas. A capability não permite escrever
campanhas; criação/edição continuam exclusivamente nas rotas Admin. Rota ausente responde 404.

## Comissão por plano (05/11/2026)

Padrão compartilhado em `@sistemazero/core/referrals`: R$ 30 pela contratação mensal e R$ 80
pela anual, bônus único de aquisição, sem recorrência. `BONUS_AMOUNT_CENTS` e
`BONUS_ANNUAL_AMOUNT_CENTS` são capturados em `bonusAmounts` nos novos resgates diretos.
Campanhas mantêm o mensal em `commissionAmountCents` e o anual em
`commissionAnnualAmountCents`; anual nulo conserva o acordo fixo legado. PATCH omisso preserva
os termos, e comissão desligada limpa ambos. Migração aditiva 0008, sem backfill financeiro.
O ciclo vem de `catalog.billingIntervalMonths` (1/12), nunca do valor pago. Ciclo desconhecido
com bônus por plano gera retry, sem gravar conversão. Snapshots antigos mantêm o acordo anterior.
Rollout e preço anual: `docs/operations/comissoes-planos-anual-970.md`.

## Campanhas com embaixador e comissão explícita (04/11/2026)

Campanha tem `ambassadorId` opcional, independente de `commissionEnabled` (default false).
Comissão habilitada exige valor fixo em centavos e janela em dias após o resgate. A migração
aditiva 0006 preserva campanhas antigas sem vínculo e sem comissão. `codes` mantém um único
proprietário; não preencher `codes.ambassadorId` em códigos de campanha.

`insertRedemption` captura `campaignReferral` sob o lock da campanha: beneficiário, nome/e-mail
e condições aceitas. Esse JSON é privado e não entra em `GiftSource`. A conversão consulta o
snapshot, nunca a configuração atual; janela de comissão e período da campanha são independentes.
Comissão desligada/fora do prazo ainda atribui a conversão ao embaixador, com bônus zero.
Relatórios de embaixadores incluem campanhas pelo snapshot. Termos históricos não são reescritos.
Runbook e rollout: `docs/operations/campanha-com-embaixador.md` na raiz.

Correções do review: o lock do beneficiário também protege a leitura de `status`; pessoa
desativada mantém atribuição, mas novos snapshots têm comissão desligada e valor/prazo nulos.
`insertConversion` serializa por resgate e substitui somente `unrewarded` por um pagamento
anterior `pending` com bônus positivo. A linha anterior vira `superseded`, preservando paymentId;
conflito único desfaz toda a transação. Migração 0007 exclui `canceled` e `superseded` da vaga
única. Relatórios ignoram substituídas. Estornos cancelam também `self_blocked` e `superseded`;
comissões elegíveis/pagas continuam protegidas e exigem resolução financeira manual.

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, Bun
> etc.) — não confie só na memória; APIs mudam. Para **pesquisa/exploração**, use o **MCP do
> Octocode**. Faça certo e atualizado — não "de cabeça".

## O que é

**Serviço de indicações e bolsas** do Sistema Zero. Porta **3012**, schema Postgres **`referrals`**,
journal `referrals_migrations`. Runtime: **Bun**. Molde arquitetural: `packages/fiscal`
(DDD + Hexagonal, env Zod fail-fast, borda Elysia, advisory locks, testes em 4 camadas).
Plano completo do projeto: `~/.claude/plans/ent-o-vamos-implementar-esses-atomic-stroustrup.md`;
consenso de produto: memória `sistema-indicacao-moeda-premium.md` + artifact
https://claude.ai/code/artifact/a77ac5ad-56c9-47f3-9a83-83f36611cd43.

> Estado: **FASE 1 (indicação de curso Kids)** implementada + **EXTENSÃO (09/2026): auto-cadastro
> do responsável, rastreio de conversão e bônus Pix manual** (ver §Conversões abaixo). O Programa 1
> (moeda da família, ledger 20%, gasto no checkout) segue NA GAVETA por decisão da usuária.

## Conceito central (decisões travadas com a usuária)

1. **Indicação = curso Kids Cadê Todo Mundo? e participação no Mural por 7 dias + visita
   permanente depois** (decisão de 03/10/2026; desde 15/11/2026 é a oferta padrão do público, ver
   §Presente por oferta — o texto abaixo descreve o caminho antigo, que os resgates `trial` seguem).
   O curso usa `mode:'course'` com `expiresAt = createdAt + 7 dias`. Novos resgates gravam
   `muralVisitorPolicy:'trial'`; `mode:'mural_trial'` concede o Mural completo com o mesmo vencimento
   e a visita sem vencimento, em lote atômico no Members. O checkpoint `muralVisitorGrantedAt`
   registra a conclusão dessa etapa, com delivery `scholarship:mural-trial:<id>`.
   Resgates antigos conservam a política; `gifts:upgrade-mural` simula a atualização dos resgates
   concluídos com política visitante e prazo restante. `--apply` libera a participação apenas
   pelo prazo restante, sem estendê-lo e sem e-mail.
   O curso segue bloqueado para quem apenas cria conta. Antes de registrar o resgate,
   o serviço verifica se ele está publicado; falha/rascunho fecha o fluxo sem criar conta.
   **1 resgate por E-MAIL e PÚBLICO** (UNIQUE `(email, audience)` desde a 0005; ver §Presente
   Kids e adulto).
2. **Embaixador não precisa de conta** — a página dele é uma capability-URL
   (`/embaixador/<page_token>`, 32 bytes base64url). Bônus Pix segue a extensão abaixo;
   campanhas institucionais só geram comissão quando explicitamente habilitada (ver extensão de 04/11/2026).
3. **`codes` é GENÉRICA desde a F1**: `owner_kind ∈ {ambassador, account, campaign}` com UNIQUEs parciais e
   CHECK de exatamente-um-owner. Na F2 o MESMO código do membro serve à landing `/bolsa/<code>` e à
   atribuição `?ref` — é "a liga" (bolsista que assinar depois credita 20% ao membro na F3).
   `owner_email` (lower) já nasce aqui — base do anti-autoindicação da F3, sem backfill.
4. **Sem WhatsApp automático** (decisão de produto): disparo da plataforma é E-MAIL único;
   o embaixador compartilha o link no próprio WhatsApp.
5. **Ordem do resgate: DISPONIBILIDADE → CONTA → CURSO → MURAL (conforme política) → E-MAIL** — se o e-mail falhar, o acesso já existe; se um
   grant falhar, nenhum e-mail mentiroso sai. As duas concessões têm delivery IDs e checkpoints
   distintos, então um retry não reinicia o curso nem duplica a visita. O e-mail é best-effort (fallback do usuário =
   "esqueci minha senha").

## Fluxo do resgate (`RedeemScholarshipService`)

1. Código ativo? (404 **UNIFORME** p/ inexistente OU desativado — não vazar qual.)
2. Normaliza e-mail (lower/trim) **ANTES** do UNIQUE e de qualquer S2S.
3. Consulta o members: curso kids publicado? Indisponível → 503 sem claim nem conta;
   upstream fora → 502 sem claim nem conta. Resgate já concluído pula essa checagem para
   manter o 409 e a retomada do e-mail antigo. Claim da bolsa: `INSERT … ON CONFLICT (email, audience) DO NOTHING`; conflito → `completed` = 409 —
   mas se `welcome_sent_at` for NULL, **RETOMA só o e-mail antes do 409** (crash entre o grant e
   o welcome; o claim atômico do welcome é o mutex — dispensa lease, que exclui completed);
   `pending/failed` = **RETOMADA por etapas** (colunas `user_id`/`granted_at`/`mural_visitor_granted_at`/`welcome_sent_at`
   pulam o que já concluiu; o 1º claim vence o `code_id`).
4. **Lease** em coluna (`processing_until`, `REDEMPTION_LEASE_MS` 90s): só uma execução roda;
   segunda submissão → 202 `processing`; crash no meio expira sozinho.
5. `POST /auth/internal/ensure-buyer` (via gateway, consumer `referrals`) com senha descartável e
   `source: 'scholarship'` → `{userId, created}`.
6. `POST /members/webhooks/grant-manual` — o CLIENTE injeta `mode: 'course'` no corpo (detalhe do
   WIRE, obrigatório no DTO do members; travado por `tests/unit/gateway-client.test.ts` contra o
   cliente REAL — os fakes não pegariam) — com
   `x-delivery-id: scholarship:course:cade-todo-mundo:<id>` **ESTÁVEL E VERSIONADO PELO
   PRESENTE** (uma entrega antiga da oferta não pode deduplicar o novo curso) +
   `sourceId: 'scholarship:<id>'` (a idempotência do members vira
   `manual:userId:productId:scholarship:<id>` — cortesia admin do mesmo produto NUNCA colide com
   a bolsa). 409 = **terminal** (`failed_reason: grant_conflict`, aflora no admin — nunca retry
   infinito; o members NÃO marca a entrega, então destravar lá + re-submeter aqui conclui);
   `503 COURSE_UNAVAILABLE` = curso despublicado entre consulta e grant, sem e-mail e com
   retomada posterior; outros 5xx gravam `last_error` (`grant:<status>[:código]`, some no
   sucesso) + soltam lease + devolvem 502 (o usuário re-tenta; tudo idempotente).
7. Welcome com **claim atômico** (`welcome_sent_at`, molde `welcome-email.ts` do funil):
   conta NOVA → password-token (falha na emissão → release do claim; **emitido → só libera se o
   Messaging RECUSAR o envio (4xx)**, porque reemitir depois de um envio aceito mataria o link
   entregue — o auth consome tokens pendentes) → template
   `referrals-scholarship-welcome`; conta PRÉ-EXISTENTE → **sem token**, template da política do resgate
   (o histórico sem prazo usa `kids-new-access`, link `<kids>/login/responsavel`). Se o Messaging
   ainda não tiver a chave nova (404 `TEMPLATE_NOT_FOUND`), cai em `new-access` com a mesma
   Idempotency-Key (`LEGACY_TEMPLATE_KEYS`). Envio RECUSADO (4xx: nada enfileirado) libera o claim
   para a próxima submissão do mesmo e-mail retomar; 5xx/timeout é ambíguo e mantém o claim.

## Conversões + bônus Pix manual (extensão 09/2026)

Rastreia **bolsista que assinou a Comunidade dos Criadores** e controla o bônus único por plano
(R$ 30 mensal / R$ 80 anual desde 05/11/2026; acordos anteriores preservados), pago
**manualmente via Pix** pela empresa.
O serviço NUNCA guarda saldo: só sinaliza elegibilidade e controla pago/não-pago.

- **Consumer do payments** (`interfaces/http/webhooks.routes.ts`, porte fiel do fiscal): `POST
  /webhooks/payments` chega DIRETO na rede privada (fan-out multi-consumer; HMAC do corpo cru com
  `PAYMENTS_WEBHOOK_HMAC_SECRET`, tolerância `WEBHOOK_TOLERANCE_SECONDS`, dedupe por delivery id
  assinado + claim/lease em `processed_webhooks`; retryable → 502 re-entrega; ⚠️ prod com secret
  ausente = rota 401 fail-closed). Registrado via `packages/payments/scripts/seed-consumer.ts`
  (`--id referrals`, eventos `payment.paid,payment.refunded`) — o secret impresso NUNCA é ecoado.
- **`RecordConversionService`** (`application/conversions/`): `payment.paid` → enriquece no
  payments (`GET /payments/internal/payments/:id`, `amountInCents` STRING→bigint; fora →
  retryable; 404 → ERROR + consome) → ⭐ **filtro BARATO primeiro** (full review 06/09): busca
  `scholarship_redemptions` por e-mail `completed` ANTES do catálogo — o fan-out entrega TODO
  pagamento da plataforma e quase nenhum é de bolsista, então quem não resgatou é descartado num
  SELECT local (catalog fora do ar NÃO vira tempestade de retry de entregas irrelevantes) → só
  então resolve a OFERTA pelo `metadata.offerId` (client cópia do fiscal; ⚠️ **anual à vista NÃO
  tem subscriptionId** — o critério é o slug ∈ `CONVERSION_OFFER_SLUGS`) → **anti-autoindicação**:
  e-mail do bolsista == `codes.owner_email` → conversão `self_blocked` com `bonus_cents 0` →
  senão INSERT transacional `pending` com `matures_at = paidAt + BONUS_MATURE_HOURS`.
  ⚠️ **UNIQUE(redemption_id) é PARCIAL (`WHERE status not in ('canceled', 'superseded')`)**: "só a primeira cobrança"
  vale p/ pending/eligible/paid/self_blocked, mas quem ESTORNOU na garantia e assinou de novo
  meses depois volta a converter (achado do full review — sem o parcial o bônus legítimo se
  perdia em silêncio p/ sempre); UNIQUE(payment_id) segue o dedupe de re-entrega.
  `payment.refunded`: `pending|unrewarded|self_blocked|superseded` → `canceled`; o repo devolve
  o STATUS no `not_pending` e o alerta ERROR `referrals.refund_after_bonus_eligible` sai SÓ
  p/ `eligible|paid`; re-entrega de `canceled` é muda.
  ⚠️⚠️ **Corrida paid × refunded**: entre o `getPayment` e o INSERT passam 2 S2S, e um estorno que
  chegue nessa janela não acha conversão para cancelar (é consumido) — a conversão nasceria DEPOIS
  do estorno e viraria Pix sobre venda devolvida. Por isso, logo após um INSERT que criou linha, o
  serviço **re-verifica o pagamento** e cancela o que acabou de criar se ele não estiver mais
  `PAID` (`cancelIfNoLongerPaid`, ERROR alertável). Custo zero no agregado: só o caminho raro de
  bolsista convertido paga a ida extra. Mesma régua do fiscal, que re-verifica ao emitir.
- **Sweep** (`SweepConversionsService`, timer no composition-root a cada
  `CONVERSION_SWEEP_INTERVAL_MS` — ⚠️ **SEMPRE ligado, independente do secret do consumer**:
  conversões já gravadas, inclusive as do `mature-now`, precisam promover/avisar mesmo com o
  webhook desligado): fase 1 `mature()` promove `pending → eligible` — o advisory xact-lock
  **`7429184620031201`** vive DENTRO do `matureConversions` do repo (mesma tx/conexão do UPDATE;
  no composition-root ele não guardaria nada); fase 2 `notify()` fora da tx: e-mail
  `referrals-bonus-eligible` {nome, valor, link da página} com mark-after-send em `notified_at` +
  Idempotency-Key `bonus-eligible:<id>` — ⚠️ **só embaixador ATIVO** (`listConversionsToNotify`
  filtra E o serviço RELÊ o embaixador na hora do envio: entre listar e enviar o admin pode
  desativar/rotacionar o token, e o mark-after-send tornaria PERMANENTE um e-mail com link morto);
  ⚠️ **4xx do messaging é PERMANENTE** (template ausente, destinatário suprimido) → marca
  notificado + ERROR alertável, senão a linha ocupa vaga fixa no lote e bloqueia os avisos novos
  para sempre (head-of-line); cada item é isolado por try/catch. Fase 3: `pruneProcessedBefore`
  poda o dedupe do consumer (30 dias, **sob advisory lock próprio `7429184620031202`**, em lotes
  de 5k e apagando também **claims órfãos** — as três metades que o porte do fiscal largara), num
  `try` PRÓPRIO: soluço no sweep não pode cancelar a poda (tabela grande é justamente o que faz o
  sweep começar a falhar). O ciclo tem guarda de reentrância e o timer é `unref()`.
  Links do funil SEMPRE via `domain/links.ts`
  (`ambassadorPageUrl`/`scholarshipShareUrl` — dono único do shape; eram 5 pontos de construção).
- **Status**: `CONVERSION_STATUSES` (const no port — fonte única; o admin espelha com teste de
  conformance). O que o EMBAIXADOR enxerga = `AMBASSADOR_VISIBLE_CONVERSION_STATUSES`
  (pending/eligible/paid — self_blocked/canceled fora), aplicado NO SQL antes do limit
  (`listAmbassadorVisibleConversions` — canceladas não empurram bônus reais p/ fora da página).
  `markConversionPaid` só de `eligible` (409 `CONVERSION_NOT_ELIGIBLE`); `mature-now` só de
  `pending`.
- **Chave Pix**: campo `ambassadors.pix_key` — o embaixador cadastra NA PÁGINA dele (PATCH
  by-token via funil); o admin só COPIA na tela de bônus.
- **Auto-cadastro do responsável**: `GET|POST /referrals/me/ambassador` (rotas JWT "me").
  ⚠️⚠️ **NUNCA vincular uma conta a um embaixador existente por "o e-mail bate"** (achado do 2º
  full review): `/auth/register` é PÚBLICO e a conta nasce `active` **sem verificação de e-mail**,
  então quem registrasse o e-mail de um embaixador criado pelo admin receberia a capability-URL
  dele e trocaria a chave Pix — sequestro silencioso do bônus. O e-mail é o CANAL, não a
  credencial: e-mail já cadastrado → o magic-link é (re)enviado para a caixa do DONO e a resposta
  é `{enrolled:false, emailPending:true, linkEmailSent}`, sem vínculo e sem link no corpo.
  ⚠️ Sessão de PERFIL (criança) é **recusada com 403** — a presença de `x-auth-account-id` é o
  marcador dela; embaixador é assunto da Área dos pais (defesa em profundidade: o shim do kids
  também gateia, mas o serviço não depende disso). Corrida de dois selfEnroll da MESMA conta:
  quem perde re-busca (por conta ou por e-mail) e devolve retomada, nunca 500 nem "pendente".
  Devolve `{enrolled, ambassador: {pageUrl, shareUrl ABSOLUTOS via `viewOf` do service, pixKeySet,
  status}, stats (`getAmbassadorStats` — 2 counts numa ida, sem re-buscar pelo token), bonus:
  {counts, amountCents}}` + `created` no POST (true = cadastro criado); `linkEmailSent` informa a aceitação do e-mail separadamente. `bonus.amountCents`
  = env `BONUS_AMOUNT_CENTS` — a copy dos apps NUNCA hardcoda o valor.

## Borda HTTP (tudo VIA GATEWAY, exceto o consumer)

- `/referrals/admin/*` — JWT/RBAC no gateway (leitura staff+, escrita admin+); aqui defesa em
  profundidade: `assertInternalCaller` (x-internal-token) + `requireAdmin` (X-Auth-User-*,
  fail-closed). Rotas: POST/GET `ambassadors`, GET `:id` (o detalhe traz `conversion` por resgate
  — a JORNADA do bolsista), POST `:id/resend-link` (Idempotency-Key versionada por
  `link_email_count`), PATCH `:id` {status, rotateToken}, GET `conversions`
  (`?status&limit&offset`; `amountCents` viaja como STRING — bigint), POST
  `conversions/:id/mark-paid` {note?} (grava `paid_marked_at` + `paid_marked_by` = **nome E id** do
  ator: o nome sozinho é editável pelo próprio operador e não serve de trilha de quem liberou
  dinheiro) e POST `conversions/:id/mature-now` (antecipa a garantia — staging/exceção).
  ⚠️ `GET /referrals/admin/conversions` tem rota PRÓPRIA no gateway
  (`referrals-admin-conversions-read`, **admin+**; literal vence o wildcard por especificidade): a
  listagem carrega a CHAVE PIX do embaixador e o e-mail da família bolsista, leitura que não é de
  staff. Desativar o embaixador desativa o CÓDIGO junto.
- `/referrals/me/*` — rotas JWT do USUÁRIO logado (gateway `referrals-me-ambassador-{get,post}`,
  `statuses:['active']` sem roles): GET/POST `/referrals/me/ambassador` (auto-cadastro, ver
  §Conversões).
- `/referrals/internal/*` — consumidas pelo FUNIL (HMAC de borda lá; no gateway as rotas têm
  `allowedConsumers: ['funnel']`): GET `codes/:code`, GET `ambassadors/by-token/:token` (agora
  com `bonus: {pixKey, items}` — SÓ status/valor/datas, NUNCA PII do bolsista), PATCH
  `…/by-token/:token/pix` {pixKey 5..140} (cadastro da chave na página do embaixador),
  POST `…/invites` (202 | 409 INVITE_ALREADY_SENT | 409 EMAIL_ALREADY_REDEEMED — SÓ bolsa
  `completed` barra; pending/failed NÃO (o e-mail com o link é o empurrão da retomada) |
  429 cap diário 50/24h móvel), POST `redemptions` (201 completed | 202 processing | 404 |
  409 SCHOLARSHIP_ALREADY_REDEEMED | 409 SCHOLARSHIP_FAILED | 503 GIFT_UNAVAILABLE | 502).
- `/webhooks/payments` — DIRETO na rede privada (consumer do fan-out; ver §Conversões).
- `/healthz` · `/readyz` (probe select 1 — healthcheck do Railway) · `/metrics`
  ({redemptionsByStatus}, token obrigatório em prod).
- Validação: envelope FIXO no `VALIDATION` (nunca ecoa input). Convites: dados MÍNIMOS
  (nome + e-mail — LGPD), envio único por (embaixador, e-mail); re-envio só de `failed`.

## Integrações (contratos)

Todas via **api-gateway** com HMAC de borda (consumer **`referrals`**, `REFERRALS_HMAC_SECRET`),
cliente `infrastructure/gateways/gateway.client.ts` (porte fiel do gateway-client do funil:
canônico `canonicalHmacMessage`, timeout NUNCA lança — vira 502/504 por status):
- **auth**: `POST /auth/internal/ensure-buyer` → `{userId, created}`;
  `POST /auth/internal/password-tokens` → `{token}` (TTL convite 14d).
- **members**: `GET /members/webhooks/gift-course/:slug` para disponibilidade e
  `POST /members/webhooks/grant-manual` com `mode:'course'` para matrícula específica;
  ambas com `upstreamAuth: 'resign'` no gateway — o members verifica o HMAC do gateway.
- **messaging**: `POST /messaging/send` (202; Idempotency-Key por consumer). Templates novos no
  seed do messaging: `referrals-ambassador-link` {nome, link} ·
  `referrals-scholarship-invite` {nome, indicador, link} · `referrals-scholarship-welcome`
  {nome, indicador, link}. Conta pré-existente histórica usa `kids-new-access` {nome, link}, com
  reserva em `new-access`. `tests/unit/message-templates-contract.test.ts` confere cada chave usada
  contra o seed do Messaging.
- **payments** (extensão 09/2026): consumer de `payment.paid`/`payment.refunded` ATIVO (ver
  §Conversões) + enriquecimento `GET /payments/internal/payments/:id` (direto, x-internal-token,
  `PAYMENTS_BASE_URL`/`PAYMENTS_INTERNAL_TOKEN`).
- **catalog** (extensão): `GET /catalog/internal/offers/:id` direto (`CATALOG_BASE_URL`) —
  resolve o slug da oferta p/ classificar a conversão (client cópia do fiscal).
- Template novo no seed do messaging: `referrals-bonus-eligible` {nome, valor, link} — avisa que
  o bônus liberou e pede a chave Pix na página do embaixador.

## Banco (schema `referrals`)

`ambassadors` (email UNIQUE lower, `page_token` UNIQUE, `link_email_count`; extensão 09/2026:
`account_user_id` UNIQUE parcial — vínculo com a conta do responsável — + `pix_key`) · `codes`
(code UNIQUE `^[a-z0-9-]{4,32}$`; UNIQUEs parciais por owner; CHECK owner; `owner_email`/
`owner_document` já criados p/ F2-F3; `panel_audience` = o público do código desde a 0005) ·
`scholarship_redemptions` (UNIQUE (email, audience); etapas + lease + claim do welcome) · `invites` (UNIQUE ambassador+e-mail; `send_count`
versiona reenvio) · `conversions` (0001: `redemption_id` UNIQUE **PARCIAL** `WHERE status <>
'canceled'` — 1 bônus por bolsista, mas estorno + nova assinatura volta a converter —,
`payment_id` UNIQUE, `offer_slug`, `amount_cents` bigint, `bonus_cents`, status, `matures_at`/
`eligible_at`/`notified_at`/`paid_marked_at`/`paid_marked_by`/`note`; índices (status,matures_at)
+ (ambassador_id,status) + code_id) · `processed_webhooks` (0001: dedupe/claim do consumer, molde
fiscal + retenção de 30d no ciclo do sweep).
Migrations forward-only via drizzle-kit; **journal próprio `referrals_migrations`**.
⚠️ Regras herdadas do monorepo: carimbo `when` é RELÓGIO (nunca à mão no futuro — guard
`tests/unit/migrations-journal.test.ts`); enum novo não se escreve na mesma transação; CHECK novo
valida linhas existentes.

## Códigos (`domain/codes.ts`)

Alfabeto sem ambíguos (`abcdefghjkmnpqrstuvwxyz23456789` — sem 0/o/1/l/i; código é lido em voz
alta). Embaixador = `slug do 1º nome` + `-` + 4 chars (ex.: `vo-x7k2`); conta (F2) = 8 chars puros
(sem nome — privacidade). `generatePageToken` = 32 bytes base64url.

## Comandos (de dentro de `packages/referrals`)

`bun run dev|start` (porta 3012) · `typecheck` · `test` (sandbox off; `tests/db` auto-pula sem
Postgres :5433 — rode a PASTA inteira) · `db:generate|db:migrate` · `check|check:fix`.
**Sempre** rode `typecheck` + `test` + `check` antes de concluir.

## Deploy (Railway)

`railway.json` (Dockerfile context = raiz; preDeploy `db:migrate`; healthcheck `/readyz`).
Envs de prod (fail-fast): `NODE_ENV=production`, `APP_ENV`, `PORT=3012`, `HOST=::`,
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, `GATEWAY_URL=http://api-gateway.railway.internal:3000`,
`REFERRALS_HMAC_SECRET` (= o do consumer no gateway), `INTERNAL_API_TOKEN`
(= `REFERRALS_INTERNAL_TOKEN` do gateway), `METRICS_TOKEN`, `FUNNEL_PUBLIC_URL`,
`KIDS_COMMUNITY_URL`, `CATALOG_BASE_URL` + `CATALOG_INTERNAL_TOKEN` (a oferta do presente),
`SENTRY_DSN` (só prod). No GATEWAY: `REFERRALS_URL`,
`REFERRALS_INTERNAL_TOKEN`, `REFERRALS_HMAC_SECRET`, `REFERRALS_ALLOWED_CIDRS` —
⚠️ **prod não sobe sem elas** (PROD_REQUIRED_SECRETS).
**Extensão 09/2026** (opcionais em dev; com `PAYMENTS_WEBHOOK_HMAC_SECRET` presente em prod, o
refine EXIGE `PAYMENTS_INTERNAL_TOKEN` + URLs não-loopback): `PAYMENTS_WEBHOOK_HMAC_SECRET` (do
seed-consumer no payments — liga o consumer), `PAYMENTS_BASE_URL`
(⚠️ **`http://payments.railway.internal:8080`** — o payments escuta na PORT que o Railway injeta,
não na 3001 do dev local; conferido no fiscal, que já o consome), `PAYMENTS_INTERNAL_TOKEN`
(= o `INTERNAL_API_TOKEN` do payments, o MESMO valor que o fiscal usa), `CATALOG_BASE_URL`
(`http://catalog.railway.internal:3003`), `CONVERSION_OFFER_SLUGS` (csv, default
`comunidade-dos-criadores-mensal,comunidade-dos-criadores-anual`), `BONUS_AMOUNT_CENTS` (3000),
`BONUS_MATURE_HOURS` (180 = 7d+12h, régua da NFS-e), `CONVERSION_SWEEP_INTERVAL_MS` (15min),
`WEBHOOK_TOLERANCE_SECONDS` (300), `WEBHOOK_PROCESSING_STALE_MS` (60s).

## Testes

4 camadas (molde fiscal): `tests/unit` (env refines, códigos, journal), `tests/application`
(fakes in-memory — retomada, claims, caps), `tests/integration` (Elysia via `app.handle`, auth
fail-closed, 404 uniforme), `tests/db` (Postgres real com auto-skip: corrida no UNIQUE(email),
lease atômico, UNIQUEs parciais, CHECK, tx do create). ⚠️ `expect(...).rejects` NÃO funciona com
promise do drizzle (thenable preguiçoso) — try/catch; Date em SQL cru do postgres.js →
`.toISOString()`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` sem erros.
- [ ] Mudou schema? `db:generate` + commit da migration (confira o `when` no journal).
- [ ] Mudou contrato/fluxo? Atualize este CLAUDE.md.

## Campanhas de presente (02/10/2026)

- Contrato client-safe: `@sistemazero/core/referrals`. `CampaignAdminService` e rotas `/referrals/admin/campaigns` usam os guards existentes (leitura staff+, escrita admin+).
- Tabelas `campaigns`/`campaign_history`; `codes.campaign_id` exclusivo e CHECK de exatamente uma origem. `previa` é reservado à prévia do funil. Não editar código existente: duplicar cria nova edição.
- Datas de campanha regulam NOVOS cadastros. Aceitação válida: início inclusivo, encerramento exclusivo. O repositório revalida sob lock da campanha, na mesma ordem do editor. Grants e S2S ficam fora da transação.
- Resgate novo guarda snapshot público, curso e UTM sanitizada. Retomada conserva origem, duração e curso; histórico não recebe direitos por backfill. `welcome_accepted_at` significa aceitação pelo messaging, não entrega na caixa postal.
- Por padrão, campanha converte como `unrewarded` (bônus zero), fora da fila Pix. Desde 04/11/2026, o acordo explícito capturado no resgate pode habilitar comissão fixa com prazo próprio. Estorno cancela conversões pendentes ou sem comissão. Pagamento anterior ao cadastro não é atribuído ao presente.
- Migration `0004_material_hellion` gerada pelo script Drizzle, revisada e validada em PostgreSQL local. Aplicar pelo deploy antes das consultas às novas colunas. Ver `docs/marketing/kids/cade-todo-mundo/implementacao.md` e `revisao-implementacao.md` na mesma pasta.
- PATCH de campanha exige `expectedUpdatedAt`; conferência sob lock recusa edição antiga com 409 `CAMPAIGN_CHANGED`. O admin deve reler antes de tentar novamente. O identificador do operador é preservado mesmo com nome longo.
- Conversões de assinatura consultam `GET /payments/internal/subscriptions/:id` com token interno; assinatura criada antes do resgate não é atribuída por uma renovação posterior. Falha/404 na consulta pede reentrega. A conferência de estorno após INSERT também pede retry quando indisponível e funciona quando o INSERT já existe.
- `welcome_accepted_at` é recibo local: falhar ao gravá-lo não transforma aceitação confirmada pelo messaging em falha de envio nem libera a emissão de outro token.

## Presente Kids e adulto (20/10/2026)

Plano: `~/.claude/plans/stateless-gathering-sonnet.md`; copy no Canvas "Presente Kids e adulto".
Contrato client-safe em `@sistemazero/core/referrals` (`GiftAudience`, `AmbassadorShareUrls`).

- **Público (`kids` | `adult`)** em `campaigns.audience`, `scholarship_redemptions.audience` e
  `codes.audience`. Migration `0005_gift_audience`: colunas novas com DEFAULT `'kids'` + CHECK;
  `codes` usa a coluna física **`panel_audience`** (criada na 0000, nunca escrita), mapeada como
  `audience` no Drizzle. Não foi renomeada de propósito: o Drizzle lista as colunas no SELECT e o
  container antigo quebraria entre o preDeploy e a troca. Backfill `kids` antes do NOT NULL; os
  UNIQUEs novos nascem antes de soltar os antigos. ⚠️ Janela do deploy: o container ANTIGO faz
  `ON CONFLICT (email)` no claim do resgate e esse índice some na 0005; resgates nesse minuto
  respondem 500 e a família re-tenta (retomada idempotente).
- **Unicidade:** `scholarship_redemptions_email_audience_uq (email, audience)` (o mesmo e-mail
  resgata um Kids e um adulto); `codes_ambassador_audience_uq (ambassador_id, audience) WHERE
  ambassador_id is not null` (um código de embaixador por público).
- **App por público** (o curso vem da oferta desde 15/11/2026): Kids = `KIDS_COMMUNITY_URL`;
  adulto = `COMMUNITY_URL` (SEM default). **`COMMUNITY_URL` ausente = adulto
  fail-closed**: `giftAvailable:false` no `codes/:code`, 503 `GIFT_UNAVAILABLE` no resgate e no
  convite adulto (`adultGiftEnabled:false` no `CreateInviteService`), `shareUrls.adult:null` sem
  criar código (`AmbassadorAdminService`), sem consultar o Members; o Kids segue. Links adultos: conta nova
  `${COMMUNITY_URL}/redefinir-senha?token=` (rota real do app adulto), conta existente
  `${COMMUNITY_URL}/cursos`.
- **Resgate:** o público vem do código (campanha → `campaign.audience`; embaixador →
  `code.audience`) e é gravado no resgate; "já resgatado" é por público. No fio com o Members,
  SÓ o adulto leva o campo (Kids byte a byte igual): `GET gift-course/:slug?audience=adult`
  (query fora do path assinado), `grant-manual` `mode:'course'|'mural_trial'` com
  `audience:'adult'`. O Mural (Kids ou adulto) só confirma com o lote completo do Members
  (`ok` + `granted === 2`: participação temporária + visita permanente, ou `deduped`).
- **E-mails adultos** (seed do Messaging): convite `referrals-scholarship-invite-adult`
  {nome, indicador, link}; boas-vindas `referrals-scholarship-{welcome,existing}-adult`
  {nome, indicador, validade, link} e `referrals-campaign-{welcome,existing}-adult`
  {nome, campanha, validade, link}. Fim do presente (enviados pelo MEMBERS):
  `gift-expiry-2d-adult` {nome, data, link} e `gift-expired-adult` {nome, link}.
- **Embaixador:** `createAmbassadorWithCode` cria o código Kids; o adulto nasce sob demanda em
  `ensureAmbassadorShareCode` (`ensureAmbassadorCode` no repo: SELECT → INSERT `ON CONFLICT
  (ambassador_id, audience) WHERE ambassador_id is not null DO NOTHING` → relê o vencedor;
  colisão do código sorteado = re-sorteio). O INSERT roda numa transação com `FOR SHARE` na
  linha do embaixador: a desativação (`updateAmbassador`) espera ou é vista, então o código nasce
  `disabled` para embaixador desativado e nunca fica ativo por corrida. As
  leituras de embaixador (`code`) seguem sendo o código **Kids** (JOIN filtrado, `kidsCodeOf`);
  contagens e detalhe do admin somam os dois códigos.
- **HTTP:** `GET internal/codes/:code` → `+audience`; `GET internal/ambassadors/by-token/:token`
  → `shareUrl` (Kids, compatível) `+ shareUrls {kids, adult}` (cria o adulto; falha → `adult:null`
  e log); `POST …/invites` aceita `audience` opcional (default kids; adulto = template adulto e
  link do código adulto; o convite continua único por (embaixador, e-mail), qualquer público);
  `GET|POST /referrals/me/ambassador` → `ambassador.shareUrls`. Sessão de suporte
  (`x-auth-impersonator-id`): GET devolve o estado com `code`/`pageUrl`/`shareUrl` nulos e
  `shareUrls {kids:null, adult:null}` (sem criar o código adulto; o `pageUrl` troca a chave Pix);
  POST → 403.
- **Campanhas:** `audience` opcional no corpo (criação sem o campo = kids; edição e duplicata
  sem o campo mantêm o gravado). Trocar o público fora do rascunho, ou num rascunho que já tem
  resgate (campanha publicada que voltou a rascunho), → 409 `CAMPAIGN_AUDIENCE_LOCKED` (serviço +
  repo sob o lock). O código da campanha espelha o público.
- **Conversões:** default de `CONVERSION_OFFER_SLUGS` inclui
  `comunidade-dos-criadores-adulto-{mensal,anual}`. ⚠️ A env é preservada no Railway: se estiver
  definida lá, o valor precisa ganhar os dois slugs. O consumer escolhe, entre os resgates do
  e-mail, o do público da oferta (`offerGiftAudience`: slug com `adulto`); sem ele, o do outro
  público. Campanha sem acordo explícito segue sem bônus.
- **Deploy:** `COMMUNITY_URL` precisa existir no painel do Railway do referrals (staging e
  produção) e estar declarada em `.railway/variables.ts` (`common.referrals`), senão o gate lê
  exclusão. `SCHOLARSHIP_COURSE_SLUG` saiu da lista de produção em 15/11/2026 (o IaC a remove).

## Calendário e cupom de campanha (05/11/2026)

`schedule` deriva início e fins exclusivos em America/Sao_Paulo. Alterar a data recalcula
novos resgates e uso do cupom, preservando direitos/termos já capturados. `coupon` guarda
somente IDs; o Catálogo valida desconto, oferta e público. O endpoint interno de política
exige token e usa o estado persistido da campanha, sem encerrar o cupom junto com o presente.
`CATALOG_INTERNAL_TOKEN` permite consultar os termos para cartões e painel somente leitura.
A migração 0009 acrescenta JSONB nullable; campanhas legadas mantêm datas manuais.
