# CLAUDE.md — `@sistemazero/funnel`

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Astro, React, Tailwind,
> Drizzle, Zod, Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e
> entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e
> atualizado — não "de cabeça".
>
> **💳 Efí Pay (provedor de pagamentos):** o checkout do funil usa a Efí (via gateway→payments). SEMPRE
> consulte também a documentação oficial ATUALIZADA da Efí antes de mexer em pagamento/tokenização de
> cartão/credenciais: **https://dev.efipay.com.br/docs/api-pix/credenciais/** (e seções relacionadas).

Orientações para agentes trabalhando **dentro deste package**. Para setup local ponta a ponta
(subir payments + gateway + funil, seed de consumer, imagens), veja o `README.md`.

## O que é

Plataforma **multi-funil** de vendas (vários produtos, por público). Cada funil vive sob
`/<audience>/<produto>/<passo>` — `audience ∈ {pro (adultos), kids (crianças)}`. Passos:
`quiz → resultado → oferta (página de vendas) → checkout (Hotmart-style; Pix/cartão na UI, boleto só API) → obrigado`,
com **upsell/downsell** opcionais. Só `oferta+checkout+obrigado` são obrigatórios; `quiz`,
`resultado`, `upsell`, `downsell` são opcionais por funil. + legais (`/politica-de-privacidade`,
`/termos-de-uso`) e painel `/admin` (globais, fora dos funis).

O 1º funil é **No Comando da IA** (R$ 37) em `/pro/no-comando-da-ia/*`. `/` → funil default;
`/pro` e `/kids` são landings de área (redirecionam ao produto, ou "em breve" se vazia); URLs
planas antigas (`/quiz`, `/oferta`, …) redirecionam (301) ao funil default. **Ver `## Multi-funil`.**

**Stack:** Astro 6 (`output: 'server'` + `@astrojs/node` standalone, roda no Bun) · ilhas **React 19**
só onde há interação · **Drizzle + postgres.js** (schema `funil` no Postgres compartilhado com o
payments) · **Tailwind v4** (`@theme` em `src/styles/global.css`) · **Zod** env fail-fast · **Biome**.

## Comandos

```bash
bun run dev        # dev server :4321 (--host)
bun run build      # marketing pré-renderizado + servidor SSR
bun run start      # sobe o build via scripts/start.mjs (Sentry no boot + graceful shutdown)
bun run typecheck  # astro check (cobre .astro + .ts + .tsx)
bun test           # bun:test
bun run check      # biome (lint+format); check:fix p/ aplicar
bun run db:generate / db:migrate   # migrations Drizzle (schema funil)
```

Após qualquer mudança, antes de concluir: **`bun test` + `bun run typecheck` + `bun run check`**
devem passar (e idealmente `bun run build`, pois é o que valida a middleware/SSR).

## Multi-funil (`src/funnels`)

**Fonte da verdade:** `src/funnels/registry.ts` — `FUNNELS` (map por `${audience}/${produto}`),
`getFunnel(audience, produto)`, `getFunnelByKey(key)`, `isFunnelKey`, `DEFAULT_FUNNEL`, `FUNNEL_KEYS`.
Cada produto é um módulo (ex.: `src/funnels/no-comando-da-ia/index.ts`) que monta um `FunnelDef`:
`catalogOfferSlug`, `productName/Sku`, `basePath`, `imagesBase`, `byline`, `seoTitle/seoDescription`,
`steps {quiz,resultado,upsell,downsell}` e `content {copy, landing, sales, obrigado, quiz?, hero?,
result?}`. Os módulos `src/content/*` são o conteúdo DESTE funil (referenciados pelo registry); um
novo produto traz o seu próprio conteúdo + imagens. O registry é **client-safe** (sem env/segredo/IO)
— importado por páginas e `/api`, **nunca** por uma ilha (passe dados por prop).

**Adicionar um funil = só registrar:** crie o módulo, adicione em `FUNNELS`, ponha as imagens em
`public/img/<produto>/`. As rotas `[audience]/[produto]/*`, a resolução de oferta no checkout e a
navegação passam a funcionar — sem tocar em página, componente ou handler. Para indexar, inclua a
URL da oferta no `customPages` do sitemap (`astro.config.mjs`).

**Rotas (`src/pages/[audience]/[produto]/`):** uma página por passo (o segmento `[audience]`
colapsa pro+kids num arquivo só). Cada página resolve `getFunnel(...)`, **404 se o funil ou o passo
não existir**, lê o conteúdo de `f.content.*` e navega por `f.basePath`. As ilhas NÃO leem a rota —
recebem tudo por prop: `Quiz` (steps/total/landing/funnel/donePath), `PreCheckoutModal`
(basePath/funnel), `CheckoutForm`→`Pix/Card` (successPath; boleto é só API — `startBoleto` +
`/api/checkout/boleto`, sem ilha). `[audience]/index.astro`
= landing de área (redireciona ao produto, ou "em breve" se vazia). **`/` (raiz,
`src/pages/index.astro`) = página "bio" da marca kids** (destino do link da bio do Instagram
@criecomhelenaejulio): tema kids, Zappy e dois botões 3D — "Descubra o perfil do seu filho" → quiz
kids e "Desafio do Primeiro Jogo" → oferta kids (não redireciona mais). URLs planas antigas → 301
(config `redirects`).

**Funil no lead + respostas (`leads.funnel` migration 0010; `leads.quiz_answers` jsonb migrations
0011 [drop das 12 colunas fixas] + 0012 [add `quiz_answers`]):** o funil é gravado na CRIAÇÃO (a
página passa `f.key` ao `POST /api/leads` e ao `createLead` do checkout; validado com `isFunnelKey`).
As respostas do quiz vão para o JSON `quiz_answers` (chave snake_case → valor) via
`repo.mergeQuizAnswers` (merge atômico) — **genérico: cada funil tem o seu quiz, com perguntas
diferentes** (não há mais colunas por pergunta).

**Oferta de cada funil = 100% por ENV, uma por funil (sem slug no código, sem fallback — 28/06):**
o `catalogOfferSlug` SAIU do `FunnelDef`. Cada funil lê a sua oferta da env **`FUNNEL_OFFER_<KEY>`**
(`offerEnvKey(key)` em `lib/env.ts`: key em MAIÚSCULAS, não-alfanumérico→`_`; ex.:
`pro/no-comando-da-ia`→`FUNNEL_OFFER_PRO_NO_COMANDO_DA_IA`,
`kids/desafio-primeiro-jogo`→`FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO`). **OBRIGATÓRIA + FAIL-FAST:**
`readFunnelOffers` monta `env.offerByFunnel` lendo SÓ as envs e LANÇA se faltar a de QUALQUER funil do
registry → o `getEnv()` quebra → o `/readyz` 503 → o deploy não fica saudável (não há fallback no
código). O helper **`resolveOfferSlug(env, f.key)`** (`server/offer.ts`) é a FONTE ÚNICA do slug em
`oferta.astro`+`checkout.astro` (preço exibido) E `makeResolveOffer` (cobrança/grant) — nunca mostra
uma oferta e cobra outra. **Trocar oferta/campanha = só mudar a env no Railway** (sem deploy de código;
o preço é cotado ao vivo no catálogo). `leads.offerRef` segue gravado no checkout (a concessão usa ela;
o `resolveOffer` é só o fallback quando `offerRef` é nulo, e também resolve pela env do funil). ⚠️ o
slug da env TEM que existir no catálogo (senão **502 CATALOG_ERROR** na cotação). Criar funil novo →
**criar a env `FUNNEL_OFFER_<KEY>` no Railway (staging+prod)**, senão o funil nem sobe. (`CATALOG_OFFER_SLUG`/
`CATALOG_OFFER_OVERRIDES` REMOVIDOS.) Promoção só de PREÇO/cupom não precisa de nada disso: edite a oferta no
admin do catálogo. Teste: `tests/unit/offer.test.ts`.

**Quiz por funil (`FunnelQuiz`):** cada funil declara `steps`, `valueSchema` (zod por chave),
`derive?(answers)` (calculadas, ex.: custo_mensal) e `computePerfil?(answers)` (diagnóstico → string,
perfil é POR FUNIL, não mais o enum global). `FunnelResult` traz `profiles` + `perfilLabels` +
`renderCorpo?`. `patchLead` é GENÉRICO: valida a chave/valor pelo `valueSchema` do funil do lead,
grava em `quiz_answers`, roda `derive`, e só aceita `eventName` que seja um passo do funil
(anti-forja de marco server-side). `resultado.astro` usa `computePerfil`+`renderCorpo` do funil;
`oferta.astro` escolhe o hero por `perfil ∈ porPerfil` (só no NCI: no Desafio a oferta é PADRÃO e a
personalização por perfil vive na tela de resultado, que é o elo quiz→oferta; os `?perfil/?quer` da
URL seguem repassados para o tracking do `PreCheckoutModal`). O NCI liga scoring/derive/render em
`src/funnels/no-comando-da-ia/quiz.ts`. **Adicionar o quiz de um produto = só preencher o
`FunnelQuiz` do módulo dele** (perguntas, validação, e — opcional — diagnóstico/resultado).

**Tipos de pergunta (`src/content/quiz-config.ts` → união `QuizStep`):** `multipla_escolha`
(clicar avança; `comImagem` faz cards com imagem — exige `image` em TODAS as opções, senão cai no
layout compacto com `badge`), `calculadora` (2 campos → `derive` calcula o `resultadoKey` no
servidor), `calculadora_prefilled` (igual, mas `campo1.sourceKey` pré-preenche de uma resposta
anterior; preview = `campo1 × campo2 × multiplicador`), `input_numero`, `slider` (min..max + rótulos
das pontas), `sim_nao`. Cada tipo tem um renderer em `src/islands/questions/` (chamam
`onSubmit([{key,value}])`); pontos a estender ao add um tipo: o `switch` + `firstUnanswered` em
`islands/Quiz.tsx`, `isQuizComplete` + `quizAnswerLabels` no registry, e o `find` de passo em
`server/leads.ts patchLead`. As calculadoras NÃO enviam o `resultadoKey` (o `derive` o calcula
server-side — invariante 3); `isQuizComplete` exige campo1/campo2/resultadoKey.

**Tema por funil (`FunnelDef.theme`):** `theme:'kids'` → as páginas passam
`htmlClass={f.theme ? 'theme-'+f.theme : undefined}` ao `BaseLayout` (compatível com o `dark` do
admin). O escopo `.theme-kids` em `global.css` **redefine os tokens** `--color-*` e a
`--font-sans` → Nunito (h1–h3 Fredoka, via `@fontsource`). Como as utilitárias
(`text-lime`/`bg-card`/`border-line`…) são `var(--color-*)`, **todas as páginas/ilhas compartilhadas
re-skinam sem mudar markup** (quiz, resultado, checkout, obrigado, PreCheckoutModal).

**Tema kids = CLARO e colorido (11/07, extraído da página colorida aprovada; é o tema oficial de
TODO funil kids futuro — basta `theme:'kids'`):** fundo **azul-céu `#E4F2FF`** nas etapas
compartilhadas (quiz/resultado/checkout/obrigado; a página de vendas usa o creme `#FFF7E9` próprio
dentro do `.dpj`), cards brancos, tinta `#26314A`, `--color-lime` = **laranja profundo `#EF6C00`**
(token de TEXTO/acento, legível no claro) e `--color-cyan` = **azul `#1E88E5`**; radius 16/22px. O
**CTA usa gradiente laranja vivo** (`#FFB53F→#FF9A1F`) com **sombra 3D dura** (`box-shadow: 0 6px 0
#D8760A` + `:active` afunda) via overrides `.theme-kids .btn/.btn-primary/.card` no fim do
`global.css` (fora de `@layer`, DEPOIS dos componentes base). Paleta de apoio da página de vendas
(no `.dpj`): rosa `#F368A6`, verde `#37C871`, amarelo `#FFCE3A`, navy `#0C1E3E`. Textos logo abaixo
de um CTA 3D pedem **respiro extra** (~26px+, a sombra ocupa a área); num container de altura fixa
(ex.: a faixa sticky do topo da oferta), compense a sombra com `margin-bottom` igual à sua altura.
⚠️ `overflow-x` em wrapper que contém um sticky deve ser `clip` (nunca `hidden`, que cria scroll
container e mata o sticky). O wordmark branco (`img[alt="Sistema Zero"]`) recebe filtro escuro no
kids. Ilustrações dos personagens: 3D cartoon, geradas com chroma key `#00B140` e recortadas para
WebP pelo script `preparar-assets-funil-kids.py` do repo de marketing (fluxo-criativo); a capa do
checkout/OG segue sendo a arte clássica `hero-desafio.webp`.

**Oferta POR FUNIL (`src/pages/[audience]/[produto]/oferta.astro` despacha o body):** a rota resolve
preço/perfil e renderiza `f.content.sales ? NoComandoOfertaBody : DesafioOfertaBody`. `content.sales`
(shape `SalesSections`) é **opcional** — funis com layout de vendas próprio (o Desafio) trazem a cópia
no próprio body e ficam sem `sales`. Cada body monta o seu PRÓPRIO `<BaseLayout>` (título/tema/JSON-LD/
preload). `src/components/funnel/oferta/NoComandoOfertaBody.astro` = template padrão (16 seções a
partir de `SALES`); `DesafioOfertaBody.astro` = layout sob medida (porte fiel da página colorida
aprovada: creme + azul + laranja, balões dos personagens, decorações flutuantes), com o CSS bespoke
num `<style>` Astro escopado por `.dpj` (tokens próprios no wrapper, não no `:root`) e ícones
**Material Symbols self-hosted** (`@fontsource/material-symbols-rounded`; o NCI segue com o
outlined). ⚠️ Astro escopa somando um atributo por elo do seletor: um override tipo
`.kid.verde .name` só vence a base `.kid .char .name` se incluir os MESMOS elos (`.kid.verde .char
.name`). Os CTAs de compra levam `data-checkout-cta` → o `PreCheckoutModal` (mesma ilha do NCI)
abre o checkout.

**Funil kids "Desafio do Primeiro Jogo" (`kids/desafio-primeiro-jogo`, R$ 37):** criança 9+ monta um
jogo de nave em 3 dias; **comunicação SEMPRE aos pais** (CONANDA/ECA — rodapé com o aviso legal).
Módulo em `src/funnels/desafio-primeiro-jogo/` (index/quiz/content): perfil = a resposta da P1
(`perfil_p1`, sem motor de scoring), `derive` = `horas_ano_calculadas = horas/dia × dias/semana × 52`,
`renderCorpo` resolve `{resposta_p3}`/`{resposta_p5}`/`{resultado}`. A oferta no catálogo
(slug `desafio-primeiro-jogo`, âncora R$ 97) é passo da usuária no admin (igual ao NCI).
⚠️ **Pré-checkout no KIDS deixa explícito que os dados são do RESPONSÁVEL** (28/06): o
`PreCheckoutModal` deriva `isKids = funnel.startsWith('kids/')` (a `funnel` prop é a chave
`audience/produto`) e, no kids, troca o subtítulo, adiciona um callout ("Estes dados são do
responsável… o perfil da criança você cria depois, na plataforma") e rotula os campos
"… do responsável". Evita o pai preencher os dados da criança no pré-checkout (o perfil da
criança nasce depois, na área kids).

**Admin por funil (`/admin`):** seletor de funil no topo filtra as 3 abas. `adminLeads/adminFunnel/
adminPerfis` aceitam `?funnel=` (repo filtra por `leads.funnel`; `eventCounts` junta ao lead).
A página passa `adminFunnelList()` (rótulos do dropdown + rótulos de respostas/perfis por funil) ao
`AdminDashboard`. `RespostasTable` mostra as respostas do `quiz_answers` rotuladas pelas perguntas do
funil + coluna Funil; Perfis/Performance rotulam por funil (perguntas viram "Pergunta N").

**Pendência (decidida):**
- **Upsell/downsell:** rotas + flags + cadeia de `successPath` prontas (scaffolding; **404 até** um
  funil definir `upsell`/`downsell` no `FunnelDef`). A 2ª cobrança de um lead JÁ PAGO (guard
  `409 ALREADY_PAID` no checkout) será finalizada quando existir uma oferta de upsell real.

## Arquitetura (o padrão central — preserve-o)

Lógica fica em **handlers puros** `(@/server/*.ts)` com a forma `(request: Request, deps) => Response`
(ou `Promise<Response>`). As rotas `(@/pages/api/*)` são **finas**: só montam `deps` via `getDeps()`
e chamam o handler. Isso mantém tudo testável com fakes, sem subir Astro/Postgres.

```
src/
  pages/api/**      Rotas finas (APIRoute). prerender=false. Sem lógica de negócio.
  server/*.ts       Handlers puros + deps interfaces (checkout, leads, webhook, admin,
                    catalog [preço/cupom via gateway], members-grant [matrícula], fulfillment [registro do comprador]).
  server/deps.ts    getDeps(): singleton {repo, env, gateway} (reusa o pool do Postgres).
  db/
    schema.ts       pgSchema('funil'): leads, funnel_events, processed_webhooks.
    repo.ts         Porta FunnelRepo (interface) + impl Drizzle. Endpoints dependem da interface.
    client.ts       postgres.js + Drizzle (singleton lazy, casing snake_case).
  lib/              Utilitários client-safe e server-only (ver regra de import abaixo).
  islands/          Ilhas React (só onde há interação). Falam com /api/* via lib/api-fetch.
  content/          Copy/config tipados (quiz-config, copy, sales-sections, result-messages).
  middleware.ts     Security headers + rate-limit best-effort (SSR only).
tests/
  fakes/            fake-db (FunnelRepo em memória), fake-gateway.
  unit/ integration/  Testam handlers/libs direto com fakes.
```

Ao adicionar um endpoint: escreva o handler em `server/`, exporte uma rota fina em `pages/api/`,
adicione o método ao `FunnelRepo` (interface + Drizzle + **fake**) se precisar de persistência, e
cubra com teste usando os fakes.

## Invariantes (NÃO quebrar)

1. **O funil nunca chama o `payments` direto.** Todo pagamento passa pelo **api-gateway (BFF)** via
   `lib/gateway-client.ts`. Ver `packages/api-gateway` e `packages/payments`.
2. **Nunca importar `lib/env.ts`, `server/*`, `db/*` ou qualquer segredo de uma ilha React** — vaza
   para o browser. Ilhas só falam com `/api/*` (mesma origem) via `lib/api-fetch.ts`.
3. **Dinheiro sempre em centavos** (inteiro). Formatação só na borda (`lib/money.ts`).
   `custo_mensal = horas × valor_hora(centavos) × 4`, **recalculado no servidor** (não confie no client).
4. **Toda operação de lead deriva do cookie `funil_lead`** (HttpOnly) — nunca id na URL (ilhas não
   leem HttpOnly). Ver `lib/lead-session.ts`.
5. **Sempre `content-type: application/json`** nas chamadas `/api/*` (o `apiPost`/`apiPatch` já fazem).
   Astro 6 `checkOrigin` (CSRF) só barra content-types de form; o JSON + cookie `SameSite=Lax` é a
   defesa CSRF efetiva.
6. **Valide a entrada do usuário no servidor.** Em `server/leads.ts`, `VALUE_SCHEMA` valida o `value`
   por chave do quiz (escolhas = enums A-D/sim-nao; numéricos com teto que cabe em `integer`/int4).
7. **Mantenha os handlers puros** — sem `process.env`/`Date`/IO escondidos; receba tudo por `deps`.

## Pagamentos (gateway = BFF)

Browser → funil `/api/checkout/*` (mesma origem) → `gateway-client` assina **edge-HMAC** (consumer
`funnel`, `FUNNEL_HMAC_SECRET`) → gateway `POST /payments` (re-assina como consumer `gateway`).

**Canônicos HMAC** — `core.signHmac(secret, msg, ts)` assina `"<ts>.<msg>"` com
`msg = canonicalHmacMessage({method, path, idempotencyKey?, body})` (06/2026: método+path
amarrados → sem replay cross-endpoint); header `x-signature: t=<ts>,v1=<hex>`:
- POST com Idempotency-Key: `msg = "POST.<path>.<idempotencyKey>.<rawBody>"`.
- GET (corpo vazio): `msg = "GET.<path>."`.
- O `path` assinado = pathname SEM query, o MESMO usado na URL (o gateway verifica
  com o pathname que recebe — construa o path uma vez e use nos dois lugares).
- Idempotency-Key do Pix: **`funil-<leadId>-<fingerprint12>`** — determinística por lead+CONTEÚDO
  (`pixContentFingerprint`: valor+cupom+dados pessoais). Retry com os MESMOS dados → MESMA cobrança
  (não duplica transação); dados diferentes (cupom novo, CPF corrigido) → chave nova → cobrança
  nova, em vez de 409 IDEMPOTENCY_CONFLICT (que travava o Pix do lead p/ sempre). Boleto:
  `funil-<leadId>-boleto`; cartão: `funil-<leadId>-card-<attemptId>` (nonce por tentativa).

**Checkout (estilo Hotmart, 06/2026):** card do produto (capa + nome + autor + preço) → **"Dados
pessoais"** (e-mail + confirmação [só client] + nome + CPF, pré-populados do lead com fallback nos
**query params** `?nome&email&telefone` que o `PreCheckoutModal` anexa ao redirect — sobrevive a
refresh/cookie perdido; `checkout.astro` cria lead novo no SSR **só com contato VÁLIDO nos params**
— sem cookie e sem contato → redirect p/ `/oferta` SEM insert, senão bot/crawler em `/checkout`
inseria uma linha por hit) → formas de pagamento como **radio-cards** (Pix default + cartão; boleto fora da UI). O
corpo de `POST /api/checkout/{pix,card}` EXIGE `contact {nome,email,cpf}` (`CheckoutContactSchema`):
o handler atualiza o lead (`document` = CPF sem máscara) e monta o `customer` da cobrança — no Pix
vira o `devedor` da cob na Efí. **O Pix NÃO gera QR automático**: botão "Gerar código Pix"
desabilitado até o contato validar (motivos: enviar dados completos à Efí + não criar transação à
toa); depois do clique vale a máquina de estados de sempre (auto-retry, 409 "aguarde", polling,
expiração 15min). O cartão usa o MESMO CPF compartilhado (o form não o coleta mais).

**Timeouts do `gateway-client` (full review 06/2026):** TODA chamada ao gateway tem
`AbortSignal.timeout` — 40s na criação de pagamento (Efí fria ~15-16s + idleTimeout 45s do
gateway), 10s no resto. Timeout/rede fora **nunca lançam**: viram `GatewayResult` `504
GATEWAY_TIMEOUT` / `502 GATEWAY_UNREACHABLE` (os chamadores já tratam por status; antes um gateway
pendurado segurava o handler e o SSR do checkout p/ sempre).

**ASSINATURAS mensal/anual (07/2026 — migrations `0014`: `leads.subscription_id` +
`subscription_interval_months` + índice, `lead_payments.access_period_months`):** oferta com
`pricingMode: 'subscription'` no catálogo muda o checkout:
- **Alternador mensal↔anual** (`content.altOffer` da oferta principal): o corpo dos handlers
  aceita `offerSlug?` (a oferta ESCOLHIDA) e `resolveChosenOffer` VALIDA contra
  `{principal, altOffer}` — slug forjado → **400 `INVALID_OFFER`** (nunca cobra oferta não
  linkada). A UI (`CheckoutForm`) mostra os dois planos com preço; `?oferta=<slug da irmã>` na
  URL do checkout (vindo do `/renovar`) pré-seleciona.
- **Cartão em oferta subscription = SEMPRE recorrente**: `startCard` recusa (**409
  `USE_SUBSCRIPTION`**); o caminho é `POST /api/checkout/subscription` (`startSubscription` +
  `SubscriptionChargeSchema`: cartão tokenizado SEM parcelas + contato + **nascimento** +
  **endereço** — a Efí exige o pagador completo; tokenização com `reuse: true`). Síncrono via
  gateway `POST /subscriptions` (idempotência `funil-<leadId>-sub-<attemptId>`); a resposta traz
  `firstPayment` → `setSubscription` + `setPayment` + (ACTIVE/PAID) markPaid + `runPostPayment`.
  O grant leva `subscription {subscriptionId, intervalMonths}` (members cria/estende com validade).
- **Anual à VISTA (Pix/boleto)**: permitido SÓ com intervalo 12 (**409 `SUBSCRIPTION_CARD_ONLY`**
  no mensal); grava `accessPeriodMonths: 12` no `lead_payments` → o grant leva
  `accessPeriodMonths` (members concede 12 meses + carência, SEM assinatura; renovar = nova compra).
- **Cupom NÃO se aplica a assinatura** (**422 `COUPON_NOT_ALLOWED`** — o valor cotado viraria o
  plano de TODOS os ciclos); a UI nem exibe o campo.
- **Webhook — ramo de RENOVAÇÃO**: `payment.paid` com `subscriptionId` de cobrança DESCONHECIDA →
  resolve o lead por `findLeadBySubscription` + `linkCyclePayment` (histórico, SEM mover o
  ponteiro); lead JÁ pago e cobrança ≠ da 1ª → SÓ `extendMembersForCycle` (grant com o `paidAt`
  DO CICLO — o do lead é a compra original e não moveria a validade; SEM
  markPaid/fulfill/welcome/cupom; falha → 502 GRANT_RETRY, re-entrega). Lead ainda NÃO pago
  (resposta da criação perdida) → recovery: repoint + fluxo normal de 1ª compra. Reentrega da 1ª
  cobrança segue o fluxo normal (backstop dos one-shots).
- **Dunning**: `payment.failed` com `subscriptionId` → `makeSendChargeFailed`
  (`server/dunning.ts`): template `subscription-charge-failed` (e-mail + WhatsApp), idempotente
  por cobrança falha (`dunning-<paymentId>`), best-effort — o acesso expira sozinho no fim do
  ciclo + carência se o cliente não agir.
- **`/renovar?oferta=<slug>`** (destino do lembrete de renovação do members): resolve o funil
  pela oferta (principal por env; irmã via altOffer no catálogo) → 302 p/ o checkout dele
  (com `?oferta=` quando é a irmã). Slug desconhecido → `/`.
- ⚠️ `getActiveOffer` agora é OBRIGATÓRIO nos handlers (mode/intervalo): catálogo indisponível →
  **502 `CATALOG_ERROR`** (sem view não dá p/ saber o modo — cobrar anual como vitalícia seria
  bug de dinheiro). `clearOfferCache()` é hook de TESTE (cache por slug em módulo).

**Confirmação de pagamento (duas vias):**
- **Polling** (`PixCheckout` → `GET /api/checkout/:id` via gateway) — UX/fallback.
- **Webhook** (`payment.paid`: payments → gateway → funil `/api/webhooks/payments`). O gateway valida
  a assinatura do payments e injeta `x-internal-token` (= `FUNNEL_INTERNAL_TOKEN`); o funil confere o
  token (`safeEqual`), deduplica por `x-delivery-id` e marca pago.

`markPaid` é um `UPDATE … WHERE paid_at IS NULL … RETURNING` → **idempotente**: o evento
`pagamento_confirmado` dispara uma única vez, mesmo com polling + múltiplas entregas de webhook.
O webhook **processa antes** de registrar o `delivery_id`, para que uma falha transitória não faça o
retry do gateway ser descartado.

**Histórico de cobranças (`funil.lead_payments`, full review 06/2026):** `leads.payment_id` guarda
só a cobrança MAIS RECENTE (sobrescrita a cada checkout). O `setPayment` também grava o par
`payment_id → lead_id` no histórico, e o `findLeadByPayment` cai nele como fallback — sem isso, o
webhook de uma cobrança antiga ainda pagável (**boleto vale 3 dias**; Pix re-gerado após corrigir
dados) não encontrava o lead e a compra se perdia EM SILÊNCIO (entrega marcada como processada).
Quando a cobrança paga não é a apontada, o webhook **re-aponta** `leads.payment_id` p/ ela antes do
`markPaid` (o grant referencia a cobrança certa). **Lead já pago não inicia nova cobrança**: os 3
handlers devolvem `409 ALREADY_PAID` (guard ANTES da validação do corpo); recompra = lead novo
(a página de checkout já faz isso).

**Concessão na área de membros (`grantMembers`):** roda DEPOIS do registro do comprador, em
**três caminhos** (espelhando o `fulfill`): webhook (`payment.paid` → 502 `GRANT_RETRY` se falhar →
gateway re-entrega) e **best-effort** no polling do Pix (`pixStatus`) e no cartão síncrono PAID
(`startCard`) — via `server/members-grant.ts` (`makeGrantMembers`). Idempotente do lado do members
(chave da matrícula), então reentregar/retentar é seguro; o webhook é o backstop durável.
**ONE-SHOT (`leads.members_granted_at`, 2º full review 06/2026):** concessão concluída marca a
coluna e não re-chama o members — antes, CADA poll pós-pago disparava um S2S real. Falha NÃO
marca (retry segue); corrida webhook×polling pode chamar 2× (inócuo — members deduplica).

**Notificação pós-compra (`sendWelcome`) — e-mail + WhatsApp, RAMIFICADA por tipo de comprador:**
roda no webhook E nos caminhos síncronos (`runPostPayment`: cartão PAID/polling — simetria com o
grant; se a entrega do webhook quebrar de vez, o comprador não fica sem o aviso) DEPOIS de
fulfill+grant, decidindo pelo `buyerIsNew` (do `created` do `ensure-buyer`):
- **NOVO** (`buyerIsNew===true`): template `welcome` + link de DEFINIR senha (1º acesso),
  `…/redefinir-senha?token=` (token single-use do auth).
- **RECORRENTE** (`buyerIsNew===false`): já tem credenciais → template **`new-access`** (aviso de
  "novo curso liberado"), link `…/cursos`, **SEM token** (mandar criar senha de novo seria confuso).
  Antes o recorrente não recebia NADA.
`buyerIsNew` nulo (não registrado) → não envia. O nome `makeSendWelcome`/coluna `welcome_sent_at`
seguem (compat do wiring), mas cobrem os dois casos; chaves de idempotência por tipo+canal
(`welcome-`/`new-access-` + `-wa-`). No caso NOVO,
via `server/welcome-email.ts` (`makeSendWelcome`): pede o token de definição de senha ao auth
(`POST /auth/internal/password-tokens`, HMAC via gateway), monta o link
`${COMMUNITY_URL}/redefinir-senha?token=...` e enfileira o template `welcome` no messaging
(`POST /messaging/send`) pelos **DOIS canais** — o template existe em e-mail E whatsapp no seed do
messaging, com o MESMO link/token (single-use: o 1º clique vale, tanto faz o canal). Cada canal é
**independente e best-effort** (a falha de um não impede o outro) com `Idempotency-Key` **POR
CANAL** (`welcome-<leadId>` / `welcome-wa-<leadId>` — o messaging deduplica por consumer+chave;
chave única deduplicaria o 2º canal contra o 1º). O WhatsApp só sai se o telefone do lead virar
formato internacional (`toWhatsAppPhone`: BR 10–11 dígitos → prefixa DDI `55`; já com 55 → mantém;
outro formato → pula — e-mail é o canal primário). **BEST-EFFORT deliberado:** falha só loga e
NUNCA muda o status do webhook (fallback do aluno = "esqueci minha senha"). Env: `COMMUNITY_URL`
(+ **`KIDS_COMMUNITY_URL`**: lead de funil `kids/*` recebe o link no app KIDS — `makeSendWelcome`
resolve o base pela audiência do `lead.funnel`; ausente cai no COMMUNITY_URL).
- ⚠️ **ONE-SHOT ATÔMICO obrigatório (`claimWelcome` → `leads.welcome_sent_at`, 2º full review
  06/2026):** o auth CONSOME os tokens pendentes ao emitir um novo (1 vivo/usuário) e o messaging
  deduplica o reenvio — sem o claim, a 2ª execução (webhook×polling, em TODA compra Pix/cartão)
  emitia token novo invalidando o do e-mail JÁ entregue: o comprador clicava num **link morto**.
  Só quem vence o claim (`UPDATE … WHERE welcome_sent_at IS NULL RETURNING`) emite/envia; o claim
  só é liberado (`releaseWelcome`) se a EMISSÃO do token falhou (nada saiu — retry futuro pode);
  depois de emitido, NUNCA libere (re-emitir mata o link entregue). NÃO remova esse claim.

**Cupom por COBRANÇA (`lead_payments.coupon_code`, 2º full review 06/2026):** o redeem da
confirmação (webhook e polling) lê o cupom da **cobrança paga** (`couponForPayment(paymentId)`),
não do lead — `leads.coupon_code` é só o contexto do ÚLTIMO checkout (sobrescrito SEMPRE, null
limpa) e ficava obsoleto: re-cotação sem cupom redimia cupom não aplicado; boleto antigo com cupom
pago depois não redimia o certo. `setPayment(id, paymentId, couponCode)` grava o cupom no
histórico (conflito preserva o original — re-aponte do webhook passa sem cupom).

## Renderização (tudo SSR desde o 2º full review 06/2026)

- **NÃO há mais páginas pré-renderizadas.** `quiz`, `politica-de-privacidade` e `termos-de-uso`
  viraram SSR (`prerender = false`) DE PROPÓSITO: página pré-renderizada é servida estática pelo
  adapter **sem passar pela middleware** → ficava SEM security headers (CSP/HSTS/XFO) em produção,
  onde NÃO há CDN/proxy p/ repô-los. O custo de render é trivial e elas levam `cache-control:
  public` curto (`max-age=60` no quiz, `max-age=300` nas legais). ⚠️ Se uma página voltar ao
  prerender, lembre: middleware não roda nela em runtime (headers somem) e o branch de rate limit
  da middleware não pode executar no prerender do build (sem env/clientAddress).
- **SSR:** `index` (redirect 302 → `/quiz`), `oferta` (nome/preço vêm do
  catálogo em runtime; sem dado por-usuário → `cache-control: public, max-age=60,
  stale-while-revalidate=300`), `resultado`, `checkout`, `obrigado`, `admin`, `admin/login`,
  **todas** `/api/*`, `health`. Páginas com dados do lead setam `cache-control: no-store` e
  redirecionam se faltar cookie/contato.
  - ⚠️ **`obrigado` é SSR só para EXPIRAR o cookie do lead** (`clearLeadCookie`, `Max-Age=0`):
    após a compra, o próximo checkout começa do zero. Combina com dois pontos no `checkout.astro`:
    o **CPF NUNCA é pré-preenchido** (`initialContact.cpf = ''` — dado sensível, digitado a cada
    compra) e o **lead já PAGO não é reaproveitado** (`if (lead?.paidAt) → novo lead`). Nome/e-mail/
    telefone repopulam pela URL do pré-checkout. (Decisão do usuário, 06/2026.)

## Segurança

- **`src/middleware.ts`** seta security headers (CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS em prod), um **rate-limit best-effort** em memória
  (`lib/rate-limit.ts`, 240/min/IP nos POST/PATCH de `/api/{leads,events,contact,checkout}` +
  bucket PRÓPRIO de **10/min/IP no `POST /api/admin/login`** — anti brute-force + bucket de **GET
  360/min/IP**, ver abaixo), captura exceção de rota p/ o Sentry (rethrow — o Astro renderiza o
  500) e o default `cache-control: no-store` em `/api/*` (quando o handler não seta o próprio).
  - Como TODAS as páginas são SSR (ver "Renderização"), a middleware cobre o site inteiro.
  - **Rate limit de GET (2º full review 06/2026 — antes NENHUM GET tinha teto):** bucket
    `funnel-get` 360/min/IP em `/checkout` e `/resultado` (SSR que ESCREVE no banco — lead com
    contato válido na URL / evento), `/api/checkout/:id` (cada hit = 1 chamada assinada ao
    gateway; o teto de 3000/min lá é AGREGADO do consumer `funnel` — sem teto por IP, um cliente
    esgotava o polling de todos), `/api/leads` e `/admin*` + `/api/admin/*` (cookie lixo dispara 2
    S2S por request). 360 = folga p/ CGNAT (polling ≈ 17/min/comprador).
  - ⚠️ O rate-limit é **por instância** (não compartilhado, não persiste). A defesa de borda real é
    do gateway/CDN. Mantenha o limite generoso (o quiz faz ~12 PATCH por sessão). O Map tem **teto
    duro de 50k buckets** (cheio = fail-open p/ chaves novas; sweep no máx. a cada 30s) — botnet
    com IPs distintos não cresce a memória sem limite.
  - ⚠️ **IP do cliente atrás de proxy = `TRUST_PROXY=true`** (`lib/client-ip.ts`): o Astro IGNORA o
    `x-forwarded-for` sem `security.allowedDomains` (verificado no fonte — `core/app/node.js`), então
    `clientAddress` em Railway seria o IP do PROXY → bucket único p/ TODOS os visitantes (self-DoS
    com ~20 usuários simultâneos no quiz). Com `TRUST_PROXY=true`, usamos o **ÚLTIMO** hop do XFF
    (anexado pela borda confiável; o primeiro é forjável pelo cliente). OBRIGATÓRIO explicitar
    true|false em produção (fail-fast no env). `getEnv()`/`clientAddress` são lidos SÓ dentro do
    branch de escrita — a middleware também roda no prerender do build, onde não existem.
  - **Corpo de request**: `node({ bodySizeLimit: 64 * 1024 })` no `astro.config.mjs` — o default do
    adapter é 1GB(!); 64KB cobre com folga o maior corpo legítimo (cartão ≈ 2KB). Excedente quebra
    o parse → 400.
  - A CSP usa `'unsafe-inline'` em script/style — necessário p/ hidratação do Astro, JSON-LD inline
    (`ProductJsonLd`) e o `onerror` do `ImageSlot`. Ao adicionar inline scripts, lembre disso.
  - A CSP também libera as origens do **checkout de cartão** (`payment-token-efi`): API de cobranças
    da Efí (`cobrancas[-h].api.efipay.com.br` em `connect-src`), tokenizer (`tokenizer.sejaefi.com.br`
    em `connect-src`) e fingerprint antifraude da ClearSale (`device.clearsale.com.br` em
    `script-src`/`connect-src`/`img-src`; `web.fpcs-monitor.com.br` em `connect-src`/`img-src`).
    Sem isso a tokenização falha e o `isScriptBlocked()` acusa "adblock" à toa. Se a Efí mudar de
    endpoints numa atualização da lib, re-extraia as URLs do bundle
    (`rg -o 'https://[a-z0-9.-]+' node_modules/payment-token-efi/dist/payment-token-efi-esm.min.js`).
  - **Extras DEV-only na CSP** (`import.meta.env.DEV`; NUNCA em prod): `worker-src 'self' blob:` +
    `'unsafe-eval'` no script-src. O cliente HMR do Vite cria um **SharedWorker via `blob:`** para
    detectar o restart do dev server — sem `worker-src` o fallback é o script-src e a CSP o
    bloqueava ("Creating a worker from 'blob:...' ... has been blocked" no console + auto-reload
    quebrado após restart; o `[vite] Error: send was called before connect` é ruído da mesma
    reconexão). Em prod não existe `/@vite/client` e nada cria worker (verificado no bundle da Efí
    e em runtime) — a CSP segue estrita.
- **Admin** (`/admin`, `/api/admin/*`): login com **usuário REAL do auth (IdP)** via gateway
  (`lib/admin-auth.ts`). `POST /api/admin/login` (ilha `AdminLogin`, e-mail+senha validados com Zod)
  chama o gateway `POST /auth/login`; só `role ∈ {admin, superadmin}` + `status: active` entra (senão
  403). Os tokens (access+refresh) viram cookies **HttpOnly** `admin_access`/`admin_refresh`
  (`SameSite=Lax`, `Secure` em prod). Cada request valida via gateway `GET /auth/me` (`resolveAdmin`); se
  o access expira, troca o refresh por um par novo (rotação no auth) e reseta os cookies. `/admin` sem
  sessão → redireciona p/ `/admin/login`; `/api/admin/*` sem sessão → 401. Logout: `POST /api/admin/logout`
  revoga o refresh no auth e limpa os cookies. **O funil não guarda credencial/segredo de admin** — crie
  o admin no auth (`bun run --filter @sistemazero/auth db:seed --email <e> --password <p> --role admin`).
  Só seguro sob HTTPS.
  - ⚠️ **Sem SSO com o painel `admin` (3005):** são apps separados — cookies de nomes diferentes
    (`admin_*` aqui vs. `sz_admin_*` lá) e, em prod, domínios diferentes. Logar num NÃO loga no outro;
    cada um faz o próprio login contra o mesmo IdP.
- **UI do painel (06/2026):** o `/admin` (login + dashboard) usa o **`@sistemazero/ui`**
  (Button/Card/Table/Badge/Dialog/Input/PasswordInput/Field) + o tema sistema-zero + o **logo**
  (`public/logo_dark.svg`/`logo_white.svg`), espelhando o pacote `admin`. **Dark-only**: `BaseLayout`
  tem prop `htmlClass` e só as páginas `/admin*` passam `htmlClass="dark"`. O tema no `global.css` é
  **ADITIVO** — mantém os `@theme { --color-* }` de marca do funil e **OMITE de propósito**
  `--color-card`/`--color-muted` (já significam card escuro e o cinza de TEXTO `text-muted` das
  públicas; remapear regrediria-as). **REGRA: nessa camada só ADICIONE token novo.** As deps do ui
  (`lucide-react`/`class-variance-authority`/`clsx`/`tailwind-merge`) viraram deps DIRETAS do funil +
  entraram no `optimizeDeps.include` (senão o Vite não as resolve da raiz). Abas: **Respostas** (tabela
  enxuta → `Dialog` c/ os 16 campos; cards no mobile) + **Performance** (KPIs/barras, intacta).
- **`GET /api/admin/leads` pagina no SERVIDOR**: `?limit` (1..100, default 25) `&offset&q&sort`
  (asc|desc) → `{ leads, total, limit, offset }`. Busca (ILIKE nome/e-mail) e ordenação valem sobre
  TODOS os leads (repo `listLeads(limit, offset, {q,sort})` + `countLeads(q)`, mesmo WHERE no count);
  a UI usa o `Pagination` do ui c/ busca debounced (reseta p/ página 1). Antes capava em 1000 sem
  paginação. **Status por lead** (coluna na tabela + badge no detalhe + seção "Compra"): derivado
  dos dados reais — `paidAt`→**Comprou**, senão `paymentId`→**Checkout**, senão `email`→**Pré-checkout**,
  senão **Quiz**. ⚠️ Usar esses campos, NÃO `last_step` (que fica na última pergunta do quiz — não
  avança p/ checkout/pagamento; era por isso que comprador aparecia "na pergunta 10").
- **Não importar `middleware.ts` em testes** (`bun test` não resolve o módulo virtual
  `astro:middleware`). Teste a lógica isolada (ex.: `lib/rate-limit.ts`).

## Convenções de status HTTP (`lib/http.ts` → `json`/`jsonError`)

| Situação | Status | code |
|---|---|---|
| Sem cookie de lead (ops autenticadas) | 401 | `NO_LEAD` |
| Cookie presente mas lead inexistente | 404 | `NOT_FOUND` |
| Payload/valor inválido | 400 | `BAD_REQUEST` |
| Checkout sem e-mail (sem contato p/ entregar) | 409 | `NO_CONTACT` |
| Lead já pago tentando nova cobrança (recompra = lead novo) | 409 | `ALREADY_PAID` |
| Cobrança ainda em criação (retry durante a reserva de idempotência do payments) | 409 | `PAYMENT_IN_PROGRESS` |
| Oferta escolhida não é `{principal, altOffer}` do funil (slug forjado no alternador) | 400 | `INVALID_OFFER` |
| Cartão em oferta subscription (o caminho é `POST /api/checkout/subscription`) | 409 | `USE_SUBSCRIPTION` |
| Assinatura à vista (Pix/boleto) num intervalo mensal (só anual/12 à vista) | 409 | `SUBSCRIPTION_CARD_ONLY` |
| Cupom aplicado a oferta subscription (não permitido) | 422 | `COUPON_NOT_ALLOWED` |
| Rate limit | 429 | `RATE_LIMITED` |
| Falha no gateway | 502 | `GATEWAY_ERROR` |
| Gateway pendurado (timeout do `gateway-client`) | — interno | `GATEWAY_TIMEOUT` (504) / `GATEWAY_UNREACHABLE` (502) |
| Admin sem sessão / login inválido (`/admin/*`) | 401 | `UNAUTHORIZED` |

## Banco (schema `funil`)

**Padrão do monorepo:** 1 Postgres compartilhado (`sistemazero`) com 1 schema por
serviço (`payments`/`funil`/`auth`). Este package é dono do schema `funil`
(`pgSchema('funil')` + `schemaFilter:['funil']`). Tabelas: `leads`
(1 linha/lead, enriquecida a cada resposta; centavos em colunas `integer`; `document` = CPF sem
máscara coletado nos dados pessoais do checkout; índice em `payment_id`), `funnel_events`
(analytics; conversão por etapa usa `count(distinct lead_id)`; eventos do CLIENTE são um **enum
fechado** `CLIENT_EVENTS` em `server/leads.ts` — marcos server-side como `pagamento_confirmado`
NÃO são aceitos de ilha, senão inflariam a conversão), `processed_webhooks` (dedupe; **retenção de
30 dias** via `db/retention.ts` — ciclo de 6h com advisory lock `47713920114417`, 1 réplica por
vez; `funnel_events` NÃO é limpa de propósito: é o analytics histórico) e `lead_payments`
(histórico payment→lead, ver seção de pagamentos; além do par payment→lead + `coupon_code` +
`access_period_months`, guarda o SNAPSHOT de payment-context da migration `0013`: `offer_ref` +
`customer_name`/`customer_email`/`customer_phone`/`customer_document` — os dados da cobrança no
momento do checkout).
Migrations forward-only por `drizzle-kit`, com **journal próprio por pacote**
(`migrations: { table: 'funil_migrations' }`) no schema `drizzle` — NÃO compartilhe
`__drizzle_migrations` entre pacotes (a dedupe por `created_at` pularia migrations).

Colunas de controle pós-pagamento no lead (2º full review 06/2026): `welcome_sent_at` (claim
atômico do welcome — ver "Boas-vindas") e `members_granted_at` (one-shot da concessão);
`lead_payments.coupon_code` (cupom POR cobrança — fonte do redeem). Índice composto
`funnel_events_name_lead_idx (event_name, lead_id)` substitui o índice só de `event_name`:
o dashboard agrega `count(distinct lead_id) group by event_name` numa tabela que nunca é podada —
com o composto é index-only scan.

> Centavos em `integer` (int4, máx ~2,1e9): os tetos do `VALUE_SCHEMA` garantem que nenhum valor —
> nem o produto `horas×valor×4` — estoure int4. Se um dia precisar de valores maiores, migre as
> colunas de centavos para `bigint` (e ajuste os tetos).

## Deploy (Railway)

`packages/funnel/Dockerfile` (contexto = raiz do monorepo; roda `astro build` DENTRO do build da
imagem) + `packages/funnel/railway.json` (preDeploy `db:migrate`, healthcheck **`/readyz`** —
readiness com ping no banco e teto de 5s; `/health` segue liveness puro). Serviço **PÚBLICO** (é o
site de vendas). **O start é o wrapper `scripts/start.mjs`** (start script, CMD do Dockerfile e
`startCommand` do railway.json — invocado DIRETO, sem `bun run` no meio, p/ o SIGTERM chegar):
desliga o autostart do adapter (`ASTRO_NODE_AUTOSTART=disabled`), inicializa o **Sentry no boot**
(+ process handlers de unhandledRejection/uncaughtException) e faz **graceful shutdown** no
SIGTERM — o standalone NÃO trata sinais; sem o wrapper o deploy matava cobrança in-flight (Efí
fria ~15s). Drena por até 25s e então derruba o restante (retry é seguro: Idempotency-Key
determinística + auto-retry da ilha). Envs de runtime: `DATABASE_URL=${{Postgres.DATABASE_URL}}`,
`GATEWAY_URL` (**prefira o private networking**: `http://api-gateway.railway.internal:3000` — sem
egress/ida à internet; a borda pública também funciona), `FUNNEL_HMAC_SECRET`/
`FUNNEL_INTERNAL_TOKEN` (os MESMOS do gateway, ≥16 — fail-fast), `COMMUNITY_URL` (app adulto) +
**`KIDS_COMMUNITY_URL`** (app kids — destino do funil `kids/*`: botão da /obrigado E link de senha
do welcome; ausente cai no COMMUNITY_URL, então **setar em prod/staging**), **`FUNNEL_OFFER_<KEY>`
de CADA funil** (oferta por funil — OBRIGATÓRIA, sem ela o boot/healthcheck falha; ex.:
`FUNNEL_OFFER_PRO_NO_COMANDO_DA_IA`, `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO`), `SENTRY_DSN`
(projeto sistema-zero-funnel; ausente = desligado), **`NODE_ENV=production`** (controla o `Secure`
dos cookies!), **`TRUST_PROXY=true`** (obrigatório explicitar em prod) e **`HOST=::`** (standalone
lê HOST/PORT do ambiente; `::` p/ dual-stack). ⚠️ **Envs de BUILD** (inlined pelo Vite no `astro
build`): `PUBLIC_EFI_ACCOUNT_IDENTIFIER`, `PUBLIC_EFI_SANDBOX=false` e `FUNNEL_PUBLIC_URL`
(site/canonical/sitemap — sem ela sai `localhost`). **O Railway SÓ passa variáveis ao build do
Dockerfile quando declaradas como `ARG`** (aprendido no 1º deploy: sem os ARG o bundle saiu com
localhost e sem o identificador da Efí) — os `ARG`/`ENV` correspondentes estão no Dockerfile antes
do `astro build`; ao criar env de build NOVA, declare-a lá também.

## Sentry (monitoramento de erros)

`@sentry/bun`, ligado por `SENTRY_DSN` (ausente = no-op). Espelha o padrão do
payments/catalog/auth, adaptado ao Astro (sem error-handler central de framework):
1. **Espelho de eventos de erro** no `deps.log` (`server/deps.ts`): todo evento cujo nome termina
   em `error`/`failed` (`checkout.*.gateway_error`, `fulfill.ensure_failed`, `grant.failed`,
   `welcome.*_failed`, `retention.error`…) vira evento Sentry (fingerprint = nome; meta = extra).
   Sucessos (`welcome.sent`, `grant.done`…) ficam só no stderr — siga a convenção de sufixo ao
   nomear evento novo.
2. **`captureError` na middleware**: exceção não tratada de rota/render → `captureException`
   (com stack) + rethrow (o Astro renderiza o 500 normalmente).
3. **Boot/process handlers no `scripts/start.mjs`** (produção): init no topo,
   unhandledRejection/uncaughtException capturados, `flush` no shutdown. Em dev o init é o
   fallback lazy do `getDeps()` (idempotente). `release` = `RAILWAY_GIT_COMMIT_SHA`,
   `sendDefaultPii: false`, `tracesSampleRate: 0` (só erros).

## Pendências conhecidas (decididas, não esquecidas)

- **`/metrics`**: sem endpoint próprio (Railway metrics + Sentry cobrem o lançamento; espelhar o
  payments quando houver scraper/dashboard).
- **Retenção LGPD de leads não-compradores**: `leads` guarda PII (nome/e-mail/telefone/CPF) por
  prazo indefinido — definir janela de anonimização (decisão de produto) e um cron como o de
  `processed_webhooks`.

## Testes

`bun:test`. Handlers/libs são testados **direto**, injetando `fake-db` (`FunnelRepo` em memória) e
`fake-gateway`. Ao mudar a interface `FunnelRepo`, atualize **os três**: interface, impl Drizzle e o
fake — senão o typecheck/teste quebra. Padronize asserts por status + efeito no fake (lead/evento).

## Gotchas de Biome / `.astro`

Biome 2.4 tem suporte parcial a `.astro`. Os overrides ficam no **`biome.json` da raiz**: funnel
`*.tsx` relaxa a11y (espelha a TUI), `*.astro` desliga `noUnused*` (falsos positivos com imports
usados no template), `*.css` desliga `noImportantStyles`; `!**/.astro` exclui os tipos gerados.
O typecheck de `.astro` é o `astro check`.

## Gotcha: ilhas React não hidratam (`jsxDEV is not a function`)

**Sintoma:** uma ilha React quebra na hidratação com `Uncaught TypeError: jsxDEV is not a function`
(ou simplesmente "as opções/o componente pararam de aparecer, antes apareciam"). Afeta **todas** as
ilhas, não só uma.

**Causa:** o pre-bundle de deps do Vite (`node_modules/.vite/deps`) ficou otimizado em **modo
production**, onde o React entrega `jsxDEV = void 0` de propósito (em prod usa-se `jsx`, não `jsxDEV`).
Mas em dev o `@vitejs/plugin-react` transforma as ilhas chamando `jsxDEV(...)`. O Vite chaveia esse
cache por hash de lockfile/config — **não** por `NODE_ENV` — então uma única otimização rodada com
`NODE_ENV=production` (um shell com a var setada, etc.) envenena o cache e ele **não** se regenera
sozinho ao voltar pro dev.

**Fix:** `bun run dev:clean` (limpa `.vite`/`.astro` e sobe o dev → Vite re-otimiza em modo dev).
E **não** rode `bun run dev` com `NODE_ENV=production` no shell. O `NODE_ENV=development` no `.env` é
legítimo (consumido por `src/lib/env.ts` p/ `secureCookie`) — não é a causa.

## Gotcha: ilha não hidrata com `504 (Outdated Optimize Dep)`

**Sintoma:** uma ilha **lazy** (`client:idle` ou carregada por `import()` dinâmico) não hidrata; o
console mostra `504 (Outdated Optimize Dep)` numa dep (ex.: `zod.js`) **+** `Failed to fetch
dynamically imported module: .../src/islands/<Ilha>.tsx`. Diferente do gotcha do `jsxDEV` acima,
costuma afetar **uma** ilha (a lazy) e some sozinho num restart — só pra voltar depois.

**Causa:** no cold-start o scanner do Vite só pré-bundla as deps que alcança a partir dos entry
points. Ilhas `client:idle`/`import()` são entry points carregados **tarde**; quando finalmente
hidratam e puxam uma dep que não foi pré-bundlada, o Vite a descobre na hora, **re-otimiza** e troca
o hash dos chunks — as requisições em voo do hash antigo viram **504 Outdated Optimize Dep** e o
import dinâmico da ilha falha. Deps assim no funil: `zod` (via `contact-schema`/`checkout-schema`/
`admin-schema`, usadas por `PreCheckoutModal client:idle` e abas do checkout), `motion/react` e
`payment-token-efi` (`import('payment-token-efi')` em `CardCheckout`).

**Fix:** já estão listadas em `vite.optimizeDeps.include` no `astro.config.mjs` (força o pré-bundle
no cold-start). Também ali: as deps do **`@sistemazero/ui`** (`lucide-react`/`class-variance-authority`/
`clsx`/`tailwind-merge`, consumidas pelas ilhas do `/admin`) — e, como vivem só em
`packages/ui/node_modules`, foram declaradas como deps DIRETAS do funil p/ o Vite resolvê-las da raiz
(senão dá `Failed to resolve dependency`). Ao adicionar uma **nova** dep de terceiros consumida só por
ilha lazy/import dinâmico, inclua-a ali também. Um restart simples basta (mudar `optimizeDeps` muda o
config-hash → re-otimização automática).
