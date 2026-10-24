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
`resultado`, `upsell`, `downsell` são opcionais por funil. + legais (`/privacidade`, a Política
única, e `/termos`, o índice dos Termos; cada oferta tem o seu Termo em `/<audience>/<produto>/termos`,
e as URLs antigas redirecionam) e painel `/admin` (globais, fora dos funis).

O funil adulto de entrada é a **Comunidade dos Criadores** em `/pro/comunidade-dos-criadores/*`. O No Comando da IA foi retirado por decisão da dona em 23/10/2026. `/` é a página da bio (ver abaixo);
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
Cada produto é um módulo (ex.: `src/funnels/comunidade-adulto/index.ts`) que monta um `FunnelDef`:
`catalogOfferSlug`, `productName/Sku`, `basePath`, `imagesBase`, `byline`, `seoTitle/seoDescription`,
`steps {quiz,resultado,upsell,downsell}` e `content {copy, landing, sales, obrigado, quiz?, hero?,
result?}`. Os módulos `src/content/*` guardam contratos e conteúdo compartilhado; um
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
`src/pages/index.astro`) = página "bio"** (link da bio do Instagram @criecomhelenaejulio; Canvas
`PaginaBio.html`, desde 20/10/2026): foto de Helena e Júlio, "Criar jogos não tem idade." e dois
cartões, um para cada quiz: "É para mim" → `/pro/comunidade-dos-criadores/quiz`
(`data-analytics-id="bio-quiz-adulto"`) e "É para meu filho ou filha" →
`/kids/comunidade-dos-criadores/quiz` (`bio-quiz-infantil`). Sem atalho para oferta, por decisão da
dona; o cartão adulto leva a classe `theme-arcade` só para ler os tokens `--cda-*`. Links preservam a
atribuição sanitizada, com HTML `no-store`; a raiz não cria lead. URLs planas antigas → 301.
**`/como-funciona/` saiu em 20/10/2026** (decisão da dona): as páginas de oferta já explicam como a
plataforma funciona e a bio leva aos quizzes. `src/pages/como-funciona.astro` só faz 301 para
`/kids/comunidade-dos-criadores/oferta#experiencia`, com a query; os links do Desafio apontam direto
para lá (o menu do Desafio usa a própria seção `#experiencia`), e a página saiu do sitemap e das
métricas (`analyticsPage` reconhece só a bio fora dos funis).

**Métricas próprias (03/10/2026):** `src/analytics/`, `components/Analytics.astro` no BaseLayout,
`/api/analytics/*`, `/api/admin/analytics` e aba Métricas. Por decisão explícita de 03/10/2026,
a coleta começa automaticamente, sem janela de autorização. `analytics/preference.ts` é a regra
compartilhada: `sz_metrics=rejected` desativa; não gravar `accepted` automaticamente. Privacidade
abre somente por clique e permite desativar/reativar. ⚠️ A desativação grava `sz_metrics=rejected`
e `sz_metrics_cleanup=1` no navegador ANTES da rede (vale offline e nas outras abas, via
BroadcastChannel), espera a abertura de sessão em andamento (`stop()` devolve essa promessa) e
repete a exclusão ao carregar/reconectar até o servidor apagar o marcador. Não simplificar: sem
isso, uma exclusão que falhou reabre a coleta no reload ou deixa um visitante órfão. Sem
`navigator.cookieEnabled` a coleta não inicia; `/api/events` não grava comportamento com
`rejected`. Pedidos com prazo usam `AbortController` (não `AbortSignal.timeout`, ausente antes do
Safari 16). Eventos não copiam PII dos formulários,
mas a sessão é vinculada ao lead identificado no pré-checkout. Descoberta automática de elementos,
versões do DOM, quizzes com snapshots imutáveis e
`quizDefinitionId` no lead. Respostas salvas usam `quiz_answer_saved` (não depender do nome legado
do evento de cada produto). Migrações aditivas 0017–0020. Contato/resposta e marco são atômicos;
`paid_payment_id` identifica a cobrança confirmada no relatório. Prints/mapas usam worker separado
`bun run analytics:snapshots` (Node + Playwright; nunca iniciar Chromium no handler do site).
Operação, limites, retenção e testes: `docs/marketing/medicao-funil.md` na raiz do repositório.
Contrato compartilhado com o novo Desafio e achados da revisão:
`docs/marketing/revisao-medicao-2026-10-03.md`. Não criar um segundo coletor ou cadastro de perguntas.

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
admin do catálogo. A view da oferta traz também `accessMode/accessDurationValue/accessDurationUnit`:
`server/catalog.ts` valida preço e política na mesma resposta/cache, rejeita combinações incoerentes e
aceita resposta legada sem os três campos apenas durante a implantação (`one_time → lifetime`,
`subscription → billing_cycle`), sempre emitindo
`catalog.offer_access_policy_legacy_fallback`. Resposta parcial não usa fallback. Testes:
`tests/unit/offer.test.ts` e `tests/unit/catalog-cache.test.ts`.

**Quiz por funil (`FunnelQuiz`):** cada funil declara `steps`, `valueSchema` (zod por chave),
`derive?(answers)` (calculadas, ex.: custo_mensal) e `computePerfil?(answers)` (diagnóstico → string,
perfil é POR FUNIL, não mais o enum global). `FunnelResult` traz `profiles` + `perfilLabels` +
`renderCorpo?`. `patchLead` é GENÉRICO: valida a chave/valor pelo `valueSchema` do funil do lead,
grava em `quiz_answers`, roda `derive`, e só aceita `eventName` que seja um passo do funil
(anti-forja de marco server-side). `resultado.astro` usa `computePerfil`+`renderCorpo` do funil;
`oferta.astro` escolhe o hero por `perfil ∈ porPerfil` no NCI. Comunidade e Desafio usam
rotas de oferta e resultados próprios. No Desafio, `?perfil/?quer` legados não personalizam
copy nem substituem o motivo declarado nas respostas; o `PreCheckoutModal` não os registra
como perfil. O NCI liga scoring/derive/render em
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
`--font-sans` → Nunito (h1–h3 **Baloo 2**, via `@fontsource` — a MESMA display do
community-kids, unificada em 07/2026; Fredoka foi removida do pacote). Como as utilitárias
(`text-lime`/`bg-card`/`border-line`…) são `var(--color-*)`, **todas as páginas/ilhas compartilhadas
re-skinam sem mudar markup** (quiz, resultado, checkout, obrigado, PreCheckoutModal). A fonte
CANÔNICA é `packages/ui/src/styles/community-kids-theme.css` (`--sz-community-*`), importada por
`@sistemazero/ui/theme-kids.css`; o funil inteiro, inclusive o Desafio, usa a mesma identidade da
plataforma. Não repetir valores Pen em `global.css` nem nos bodies bespoke: criar somente aliases
semânticos com `var(--sz-community-*)`.

**Tema kids = identidade da Comunidade Kids (17/09; é o tema oficial de TODO funil kids futuro —
basta `theme:'kids'`):** as páginas compartilhadas e as duas ofertas usam o chão Pen, cartões
brancos, tinta Pen e ação azul. O CTA é azul chapado com o degrau
`--sz-community-action-step`; cartões interativos usam `--sz-community-card-step`. Os pontos de
alegria (rosa, verde, amarelo, roxo e laranja) também vêm da fonte canônica. Textos logo abaixo de
um CTA 3D pedem **respiro extra**; num container de altura fixa, compense a sombra com
`margin-bottom` igual à sua altura.
⚠️ `overflow-x` em wrapper que contém um sticky deve ser `clip` (nunca `hidden`, que cria scroll
container e mata o sticky). O wordmark branco (`img[alt="Sistema Zero"]`) recebe filtro escuro no
kids. Ilustrações dos personagens: 3D cartoon, geradas com chroma key `#00B140` e recortadas para
WebP pelo script `preparar-assets-funil-kids.py` do repo de marketing (fluxo-criativo); a capa do
checkout/OG vem de `FunnelDef.checkoutImage`; no Desafio, `farol-capa.webp` mostra o projeto real atual.

**Tema arcade (`theme: 'arcade'`, funil adulto da Comunidade, 20/10/2026):** as cores e as fontes do
desenho (Bricolage Grotesque, Silkscreen e Atkinson Hyperlegible Next, por `@fontsource`) moram UMA
vez em `src/styles/theme-arcade.css`, como tokens `--cda-*` sob `.theme-arcade`; o `global.css` o
importa e faz o mapeamento semântico (`--color-*`, cantos retos, CTA amarelo com sombra rosa), então
checkout, obrigado, pré-checkout e Termos re-skinam como no Kids. As receitas `.theme-arcade
.btn-primary`/`.card` ficam no FIM do `global.css` (depois das regras base, senão o biome acusa
especificidade decrescente).

**Oferta POR FUNIL (`src/pages/[audience]/[produto]/oferta.astro` despacha o body):** a rota resolve
preço/perfil e `components/funnel/OfertaPage.astro` escolhe o body pela CHAVE do funil, nunca por
exclusão (funil sem body declarado lança): `content.sales` → `NoComandoOfertaBody`; Comunidade Kids →
`Comunidade917Body` (`/oferta`), `ComunidadeMenor9Body` (`/oferta/criar-junto`) ou
`ComunidadeContinuarBody` (`/oferta/continuar`); Comunidade adulta → `ComunidadeAdultoOfertaBody`
ou `ComunidadeAdultoContinuarBody` (`/oferta/continuar`, prop `comunidadeAdultoPage`); Desafio Kids →
`Desafio917Body` (`/oferta`) ou `DesafioMenor9Body` (`/oferta/criar-junto`, prop `desafioPage`);
Desafio adulto → `DesafioAdultoBody` (ver "Desafio do Primeiro Jogo em três públicos"). `content.sales` (shape `SalesSections`) é
**opcional** — funis com layout de vendas próprio (Desafio, Comunidade) trazem a cópia no próprio
body e ficam sem `sales`. Cada body monta o seu PRÓPRIO `<BaseLayout>` (título/tema/JSON-LD/
preload). `src/components/funnel/oferta/NoComandoOfertaBody.astro` = template padrão (16 seções a
partir de `SALES`). O layout `.cdc` mora em
`src/styles/comunidade-oferta.css` (sem o escopo do Astro; ver "Direção de arte das quatro páginas"),
hoje vestido pelas páginas do presente e do embaixador (o quiz e o resultado antigos do Desafio,
que também o vestiam, saíram em 21/10/2026). ⚠️ Astro escopa somando um
atributo por elo do seletor: um override tipo `.kid.verde .name` só vence a base `.kid .char .name`
se incluir os MESMOS elos (`.kid.verde .char .name`). Os CTAs de compra levam `data-checkout-cta` →
o `PreCheckoutModal` (mesma ilha do NCI) abre o checkout; opcionalmente levam também
**`data-checkout-oferta="<slug>"`** (o modal anexa `?oferta=` ao redirect e o checkout PRÉ-SELECIONA
o plano — validado no servidor contra `{principal, altOffer}`, slug forjado → 400 INVALID_OFFER).
Links/QRs promocionais aceitam `?cupom=` e o alias `?coupon=`. A rota normaliza um único código,
faz a cotação autoritativa e repassa o código pelo `PreCheckoutModal`; a UI só exibe desconto
confirmado pelo servidor. Cupom inválido/esgotado ou falha técnica bloqueia os componentes de
pagamento até o adulto aplicar outro código ou clicar explicitamente em “Continuar sem cupom”.
Nas cinco páginas de assinatura da Comunidade (Kids e adulta), `cupomDaOferta`
(`comunidade-dos-criadores/oferta/cupom.ts`, 20/10/2026) dá o código ao modal e o aviso da seção dos
planos; os preços dos planos seguem os do catálogo, porque o cupom foi cotado contra a oferta
principal e pode não valer no outro plano. Para ASSINATURA, a rota da oferta também resolve a IRMÃ do alternador (`offer.altOffer` →
`getActiveOffer`) e passa `plans {main, alt}` ao body próprio (o Comunidade normaliza mensal/anual
por `billingIntervalMonths`, sem assumir qual é a principal da env). ⚠️ O fallback de preço da rota
(`env.PRODUCT_PRICE_CENTS`) é o do NCI — body de outro funil com catálogo fora deve usar o SEU
fallback (`COMUNIDADE_PRECO_FALLBACK`).

**Funil kids "Desafio do Primeiro Jogo" (Farol, 03/10/2026; 9 a 17 desde 21/10/2026):** computador,
pagamento único, 30 dias de curso e Mural completo contados da aprovação; depois Mural visitante.
R$ 67 é a referência editorial: preço/cupom vêm do catálogo e da cotação. O contrato exige
`one_time/fixed/30/days`, garantia de sete dias. O funil público deve apontar para
`desafio-primeiro-jogo-30-dias`; a oferta `desafio-primeiro-jogo` continua reservada aos contratos
vitalícios históricos e ao fluxo de bolsas. Não mudar direitos históricos para fazer a oferta passar.

**Quizzes do Desafio em conversa (21/10/2026, Canvas "Quiz do Desafio · Kids e adulto",
https://claude.ai/artifact/7RLNMmkCa6yMrSUnWR9UHs; registro em
`docs/marketing/kids/desafio-primeiro-jogo/quiz-2026-10-21.md`):** o mesmo motor e as mesmas peles
dos quizzes da Comunidade (ver "Peças comuns aos dois quizzes em conversa"), com perguntas mais curtas
e um resultado que fala de um jogo só, A Chave do Farol. NENHUMA tela antes do resultado cita o
Desafio, o Farol, curso, aula, plataforma, preço ou prazo, nem as saídas e o topo (decisão da dona;
a régua é `tests/browser/desafio-quiz-frio.ts`). Única exceção, deliberada: a opção adulta "Não ser
curso de criança", que é o medo do adulto nas palavras dele. Os links do quiz levam a atribuição da
página (UTMs, `event_code` e o `cupom` do anúncio, que a oferta só lê da própria URL):
`linkWithAttribution` em `useSpinQuiz.ts` (resultado e saídas) e `funnelLinkWithAttribution` no botão
da carta, em `resultado.astro`.
- **Kids v5** (`desafio-primeiro-jogo/quiz/`, `desafio-farol-v5`, `presentation: 'desafio-kids'`):
  filho ou filha em cartas, a idade em cartas e sete perguntas por ramo (`9a17` e `m9`, chaves `m9_*`);
  "18 ou mais" sai para o quiz adulto do Desafio. Perfil por soma (cena 3, cena desejada 2, síntese 3;
  empate vai para a síntese, depois para a cena; abaixo de 4 pontos a carta avisa). O 9 a 17 usa os
  slugs da v4 (`tempo-de-tela`, `criacao-de-jogos`, `expressao-visual`, `iniciacao-tecnologica`) para a
  aba Perfis continuar comparável; o menor de 9 tem `m9-*`. Eventos `respondeu_desafio_v5_*` e
  `entrou_ramo_<id>`; manchetes `padrao` e `?manchete=tela`; a v4 fica em `questions-v4.ts` só como
  `legacySteps`. Carta (`result.ts`/`result-copy.ts`): 4 títulos, a tela do jogo, um relato
  (André no A e no D, Rafael no B e no C, Débora no menor de 9) e o botão para `/oferta` ou
  `/oferta/criar-junto`; só celular ou tablet e professor ao vivo trocam o botão por "Ver os
  requisitos e como funciona", com a âncora da seção que responde (`#duvidas` para o computador,
  `#aula` no 9 a 17 e `#sessao` no menor de 9 para o professor ao vivo). Texto no masculino, `flexionar` troca para "ela".
- **Adulto v1** (`desafio-adulto/quiz/`, `desafio-adulto-v1`, `presentation: 'desafio-adulto'`):
  "Começar" e o link "Tenho menos de 18 anos" (saída para o quiz Kids do Desafio, nada gravado),
  oito perguntas sem ramo nem condicional, manchetes `padrao` e `?manchete=ideia`. Carta sem relato,
  com o parágrafo dos fundadores da página adulta; só celular ou tablet, professor ao vivo e trabalhar
  com jogos trocam o botão (`/pro/desafio-primeiro-jogo/oferta` com `#duvidas`, `#aula` ou `#jogo`). O título das necessidades
  conta as frases ("Duas coisas…", "Três coisas…"). O topo leva só a logo, sem nome de produto.
- O botão das duas cartas leva a nota "O preço aparece na próxima página." (`cta.nota`; sem ela vale a
  da assinatura, "O preço e os planos…"). O `resultado.astro` não tem mais ramo próprio do Desafio: a
  `/resultado` desenha a carta de qualquer `FunnelQuiz.conversa`.
- **Espelho:** `bun scripts/espelho-quiz-desafio.ts` →
  `docs/marketing/kids/desafio-primeiro-jogo/copy/{quiz,resultados-quiz,adulto-quiz,adulto-resultados-quiz}.md`.
- **Testes:** `desafio-quiz.test.ts` e `desafio-adulto-quiz.test.ts` (as combinações das perguntas de
  perfil nos dois gêneros, Light Copy, produto fora antes do resultado, exemplos do Canvas, espelho),
  `api-desafio-quiz.test.ts`, `quiz-branches.test.ts` (definições fixadas, ramos no /admin),
  `api-admin.test.ts`; navegador, com banco, `desafio-quiz-frio.ts` e `desafio-farol.ts` (a carta,
  o feedback, rever e outra criança).
- Saíram com o quiz antigo: `DesafioQuizLayout`, `DesafioResultado`, `DesafioConvite`,
  `DesafioVisual`, `visuals.ts`, `server/desafio-price.ts`, `desafio-farol.css` e `comunidade-quiz.css`.

Ofertas: desde 21/10/2026, três páginas (ver "Desafio do Primeiro Jogo em três públicos"). As
variantes por motivo (`/oferta/tempo-de-tela`, `/oferta/iniciacao-tecnologica` e o alias
`/oferta/primeiro-jogo`) fazem 301 para `/oferta` com a query. As ofertas
usam `no-store` e conferem o contrato antes de vender; indisponibilidade não recebe preço fictício.
O quiz não mostra preço; o resultado continua informativo quando não consegue consultar o preço.

A raiz é a bio e a Comunidade continua sendo a opção ampla, que pode ser contratada diretamente
(`/como-funciona/` virou 301 para a experiência da página de 9 a 17 em 20/10/2026). Links usam `funnelLinkWithAttribution`.
Capturas do Farol e do caderno são reais; telas compartilhadas identificam a interface e o
curso usado no exemplo. Não recolocar nave, asteroides, Mapa dos Pais ou depoimentos antigos
como prova do Farol. Detalhes, testes e pendências operacionais em
`docs/marketing/kids/desafio-primeiro-jogo/implementacao.md`.

No pós-pagamento desse funil, `welcome-email.ts` lê o snapshot congelado da cobrança. Quando a
política é `fixed`, usa `challenge-access-approved` (e-mail + WhatsApp) e informa a data/hora exata
de término em São Paulo; comprador novo recebe o link de definir senha, e comprador recorrente o
link da entrada dos responsáveis (`/login/responsavel`, desde 10/10/2026). Snapshot legado/inválido
cai nos templates genéricos `kids-welcome`/`kids-new-access`, sem inventar uma validade.
⚠️ **Pré-checkout no KIDS deixa explícito que os dados são do RESPONSÁVEL** (28/06): o
`PreCheckoutModal` deriva `isKids = funnel.startsWith('kids/')` (a `funnel` prop é a chave
`audience/produto`) e, no kids, troca o subtítulo, adiciona um callout ("Estes dados são do
responsável… o perfil da criança você cria depois, na plataforma") e rotula os campos
"… do responsável". Evita o pai preencher os dados da criança no pré-checkout (o perfil da
criança nasce depois, na área kids).

## Desafio do Primeiro Jogo em três públicos (21/10/2026)

Implementação do Canvas "Desafio do Primeiro Jogo · três páginas", aprovado pela dona (registro em
`docs/marketing/kids/desafio-primeiro-jogo/implementacao-2026-10-21.md`). Decisões: a faixa Kids é
9 a 17; o adulto tem a MESMA oferta do Kids (R$ 67 de referência, pagamento único, 30 dias,
garantia de 7, cupom aceito); os relatos do Rafael, da Débora e do André ficam, com a legenda do
código; a copy Kids fala de "seu filho" e "ele" (a maioria dos alunos são meninos).

- **Páginas Kids:** `/kids/desafio-primeiro-jogo/oferta` (9 a 17, `Desafio917Body` +
  `oferta/pagina-9a17.ts` + `styles/desafio-917.css` sob `.c917`, vestindo `comunidade-917.css`) e
  `/oferta/criar-junto` (menor de 9 criando com um adulto, `DesafioMenor9Body` + `pagina-menor9.ts` +
  `desafio-menor9.css` sob `.cm9`). `DESAFIO_SUBPAGINAS`/`isDesafioSubpagina` em `offer.ts`;
  `DESAFIO_OFERTAS_ANTIGAS` dão 301. Relatos por id (`RELATOS_DESAFIO_9A17`, `RELATOS_DESAFIO_MENOR9`).
- **Funil adulto** `pro/desafio-primeiro-jogo` (`src/funnels/desafio-adulto/`), registrado no `FUNNELS`
  desde 21/10/2026, DEPOIS da Comunidade adulta (o `/pro` segue no NCI; a ordem é pinada por teste). A
  env `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` existe no Railway de staging e de produção (criada pela
  dona) e está declarada em `.railway/variables.ts`; a oferta e o Termo estão no sitemap. Desde
  21/10/2026 o quiz Kids do Desafio leva quem marca 18 ou mais ao quiz adulto do Desafio, e o adulto
  leva quem tem menos de 18 ao Kids (`desafioAdultQuizPath`/`desafioKidsQuizPath` em `quiz.astro`).
  `DesafioAdultoBody` + `oferta/pagina.ts` +
  `styles/desafio-adulto.css` sob `.cda` (tema arcade), quiz e resultado desde 21/10/2026 (ver
  "Quizzes do Desafio em conversa"; as dúvidas têm `id="duvidas"`), Termo próprio
  `termos-desafio-adulto.ts` (`desafio-adulto-2026-10-21`), `chargeName` "(adultos)". Oferta pela env
  `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` (`desafio-primeiro-jogo-adulto-30-dias`, criada pelo seed do
  catálogo com o curso `desafio-primeiro-jogo-adulto` e o Mural adulto). O jogo e os blocos são os
  mesmos do Kids (o `projeto-final.szproject.json` e o `blocos.json` adultos são idênticos), por isso
  vêm de `/img/desafio-primeiro-jogo` sem legenda de versão; a página do Caderno é a do PDF adulto
  (`/img/desafio-adulto/farol-caderno.png`, página 18). Os 4 passos da aula ainda são telas do Kids, com
  a nota dizendo isso, até haver capturas da área adulta (o curso adulto precisa estar publicado em
  staging).
- **Preço** só do catálogo: `oferta/preco.ts` (`precoDoDesafio` com o cupom já cotado, `preencherPreco`
  troca `{{preco}}` e `{{preco_dia}}`; o por dia é `precoPorDiaCents`, sempre acima da conta exata).
- **Os dois Desafios nas etapas compartilhadas:** `isDesafioFunnel(key)` no registry (`checkout.astro`,
  `obrigado.astro`); o `PreCheckoutModal` reconhece por `funnel.endsWith('/desafio-primeiro-jogo')`
  (ilha não importa o registry) e só o Kids mostra o aviso dos dados do responsável. O e-mail de
  boas-vindas com a data final tem duas versões: `challenge-access-approved` no Kids e, desde
  21/10/2026, `challenge-access-approved-adult` no adulto (e-mail e WhatsApp; `nome`, `link`,
  `expira_em`, `acao`; o link é o de sempre do adulto, `COMMUNITY_URL` com `/redefinir-senha?token=` ou
  `/cursos`). Se o Messaging ainda responder 404 `TEMPLATE_NOT_FOUND` para a chave adulta, `sendOne`
  reenvia com a chave genérica (`welcome`/`new-access`), a mesma Idempotency-Key e o mesmo link
  (`fallbackKey`). No Members, o adulto ganha o Mural adulto visitante depois dos 30 dias e os avisos
  de prazo e progresso nas versões `-adult` (ver o `CLAUDE.md` do Members).
- **Navegador:** `tests/browser/desafio-ofertas.ts` confere as páginas registradas (as três, desde
  o registro do adulto).
- **Espelhos:** `bun scripts/espelho-copy-desafio.ts` →
  `docs/marketing/kids/desafio-primeiro-jogo/copy/pagina-{9-a-17,menor-9,adulto}.md`.
- **Testes:** `desafio-offer-copy.test.ts` (rotas, despacho, 301, contrato igual, env, Light Copy,
  imagens, relatos, dois CTAs, preço, espelhos), `comunidade-offer-css.test.ts` (as três folhas só por
  tokens), o browser `tests/browser/desafio-ofertas.ts` e, com banco, `tests/browser/desafio-quiz-frio.ts`
  e `desafio-farol.ts` (os quizzes).

## Comunidade dos Criadores em três públicos (20/10/2026)

Implementação do Canvas "Três páginas de oferta · proposta", aprovado pela dona em 19/10/2026 (fonte e
quadros em `docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/`; registro em
`docs/marketing/comunidade-dos-criadores/implementacao-2026-10-20.md`).

- **Páginas Kids:** `/kids/comunidade-dos-criadores/oferta` (9 a 17, `Comunidade917Body` +
  `oferta/pagina-9a17.ts` + `styles/comunidade-917.css` sob `.c917`) e `/oferta/criar-junto` (menor de
  9 criando com um adulto, `ComunidadeMenor9Body` + `pagina-menor9.ts` + `comunidade-menor9.css` sob
  `.cm9`). Copy em módulos tipados, preços dos planos ao vivo, dois CTAs com `data-checkout-oferta`,
  sem os botões "Jogue um jogo". Espelhos: `copy/pagina-9-a-17.md`, `copy/pagina-menor-9.md` e
  `copy/pagina-e-continuidade.md` (`bun scripts/espelho-copy-comunidade.ts`). Relato fora de todas as
  páginas e resultados vai para `RELATOS_RESERVA` (`oferta/relatos.ts`) com o motivo.
- **Continuidades (20/10/2026, Canvas "PaginaContinuarKids" e "PaginaContinuarAdulto"):** para quem já
  conhece a plataforma, na ordem alívio (o que ficou guardado) → situações com o próximo passo → o que
  fica × o que a assinatura acrescenta → Jornada ou etapas → prova → planos com quando começa, mesmo
  e-mail e garantia. Kids: `/oferta/continuar`, `ComunidadeContinuarBody` + `oferta/pagina-continuar.ts`
  + `comunidade-continuar.css` (sob `.c917`, vestindo o layout da 9 a 17; o verde conduz), faixa no
  topo para a criança que chega pela tela de ferramenta fechada, cinco situações (a primeira é "ainda
  no primeiro projeto"), os oito postos conferidos contra `initialKidsJourneyPolicy` no teste, falas
  N18, AV11 e N15, 9 dúvidas, faixa 9 a 17. Adulta: `/pro/comunidade-dos-criadores/oferta/continuar`
  (`isComunidadeAdultoSubpagina`, `comunidade-adulto/oferta/index.ts`), `ComunidadeAdultoContinuarBody`
  + `comunidade-adulto/oferta/continuar.ts` + `comunidade-adulto-continuar.css` (sob `.cda`), metáfora
  do save (tela de carregar jogo, SAVE 1 a 4: quem cancelou, quem já tem conta, quem fez 18 no Kids,
  quem acompanha alguém no Kids), sem contagem regressiva; o que a página adulta já diz (requisitos,
  cartão dos planos, escada, tela do Mural, links legais) vem de `PAGINA_ADULTO` por referência.
  Espelho adulto em `adulto/copy/pagina-continuar.md`. A continuidade antiga (motor de seções,
  `ComunidadeOfertaBody`, `continuidade*.ts`, `shared.ts`, faixa `TOUR`) saiu; o espelho dela ficou em
  `copy/historico/2026-10-20-continuidade-antiga/`.
- **Quiz Kids v6** (`comunidade-dos-criadores/quiz/`): entrada com cartas filho/filha e a idade em
  cartas; ramos `9a17` (chaves da v5) e `m9` (chaves `m9_*`, pontuação própria); "18 ou mais" sai para
  o quiz adulto. Eventos `respondeu_comunidade_v6_*`, `entrou_ramo_<id>` ao entrar num ramo (cadeias
  por ramo no /admin), `legacySteps` = v5 + v4. Espelho: `bun scripts/espelho-quiz-comunidade.ts`.
- **Funil adulto** `pro/comunidade-dos-criadores` (`src/funnels/comunidade-adulto/`), registrado
  DEPOIS do NCI (o `/pro` segue no NCI): oferta `ComunidadeAdultoOfertaBody` (`styles/comunidade-adulto.css`
  sob `.cda`, tema arcade), quiz v1 (`ComunidadeAdultoQuiz.tsx`; entrada com "Começar" e o link
  "Tenho menos de 18 anos", saída para o quiz Kids sem gravar idade), resultado em carta
  (`buildAdultResult`), Termo próprio `comunidade-adulto-2026-10-20`. Oferta pela env
  `FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES` (`comunidade-dos-criadores-adulto-mensal`, irmã anual
  pelo `altOffer`; ofertas criadas pelo seed do catálogo). As telas adultas são PRÉVIAS com legenda
  "prévia com dados de teste": trocar por capturas reais antes de produção. Espelho:
  `bun scripts/espelho-comunidade-adulto.ts` → `docs/marketing/comunidade-dos-criadores/adulto/copy/`.
- **Peças comuns aos dois quizzes em conversa:** `islands/spin-quiz/useSpinQuiz.ts` (sessão,
  revisão, token, conflito, próxima tela), `QuizConversaLayout.astro`, `styles/quiz-spin.css` (`.qz`,
  peles `--kids`, `--m9`, `--adulto` só por variáveis), resultado `components/funnel/resultado/
  ResultadoConversa.astro` + `content/resultado-conversa.ts` (blocos `p|h|img|relato|cta`, trechos
  `[[...]]` viram destaque) + `QuizResultadoFeedback.tsx`. `FunnelQuiz.conversa` liga o construtor da
  carta do funil; a `/resultado` desenha qualquer funil que o declare. Desde 21/10/2026 as ilhas são
  genéricas: `spin-quiz/KidsConversaQuiz.tsx` (`KidsQuizConfig`) e `spin-quiz/AdultoConversaQuiz.tsx`
  (`AdultoQuizConfig`), e cada funil tem uma ilha fina com a sua configuração (`ComunidadeQuiz`,
  `ComunidadeAdultoQuiz`, `DesafioQuiz`, `DesafioAdultoQuiz`), porque funções não atravessam as props
  do Astro. Os `data-analytics-id` próprios levam o prefixo da configuração.
- **Etapas compartilhadas sem chave presa ao Kids:** a abertura do checkout vem de
  `FunnelContent.checkout` (título vira o h1) e a confirmação do obrigado de `FunnelObrigado.titulo`,
  `acesso`, `passosTitulo` e `botao`. ⚠️ Duas expressões Astro separadas só por espaço perdem o
  espaço (`{a} {b}` renderiza "a.B"): junte numa template string. O `PreCheckoutModal` recebe
  `assinatura` no adulto para o rodapé não prometer Pix no mensal.
- **Testes:** `comunidade-adulto-funnel.test.ts` (registro e ordem do `/pro`, despacho, copy, imagens,
  CTAs, etapas compartilhadas, espelho), `comunidade-adulto-quiz.test.ts`, `bio.test.ts`, e o browser
  `tests/browser/comunidade-oferta.ts` (as cinco páginas: 9 a 17, menor de 9, continuidade Kids, adulta
  e continuidade adulta; preços ao vivo, pré-checkout até o checkout, 301 das páginas antigas e da
  `/como-funciona`, 404 das subpáginas que o adulto não tem; `QA_CHROMIUM_PATH=/opt/pw-browsers/chromium`
  na nuvem).

**Funil kids "Comunidade dos Criadores" (`kids/comunidade-dos-criadores`, ASSINATURA mensal R$ 97 /
anual R$ 797, 07/2026):** a assinatura da plataforma kids inteira; **quiz opcional de orientação**
em `/kids/comunidade-dos-criadores/quiz` (implementado em 01/10/2026). Oferta → checkout → obrigado
continua acessível diretamente. Módulo em `src/funnels/comunidade-dos-criadores/`, com motor e
copy do quiz em `quiz/`; `lifetimeAccess: false`
(rodapé sem o disclaimer de vitalício; copy usa "cancele quando quiser", NUNCA "pagamento
único"/"vitalício"). A oferta principal da env é a MENSAL (`comunidade-dos-criadores-mensal` no
catálogo, criada pelo SEED do catalog junto com a irmã anual + o combo); os cards de plano da
página levam `data-checkout-oferta` com o slug de cada oferta. Registrado DEPOIS do Desafio no
`FUNNELS` — a landing `/kids` redireciona ao 1º funil kids do map (ordem pinada por teste).
`FunnelCopy.artigo?: 'o'|'a'` = gênero do nome do produto p/ frases montadas (a /obrigado monta
"acesso AO Desafio" × "acesso À Comunidade"). Imagens em `public/img/comunidade-dos-criadores/`
(capa do checkout = `checkout-capa.webp`, arte "Corre, Dino!"; hero/ilustras começaram como cópias
dos assets do Desafio — a arte nova substitui por cima com os MESMOS nomes). A página bio da raiz
(`/`) leva aos dois quizzes desde 20/10/2026 (ver acima). A ampliação dos prints
(`ComunidadeImageZoom.astro`) é compartilhada pelo Desafio e pelo quiz do Desafio.
**Copies da Comunidade:** a copy vive no código, em
`src/funnels/comunidade-dos-criadores/oferta/`; `docs/marketing/kids/comunidade-dos-criadores/copy/pagina-*.md`
é o espelho gerado por `bun scripts/espelho-copy-comunidade.ts` (o teste reprova espelho velho). Desde
20/10/2026 cada página tem a copy inteira no próprio módulo: `pagina-9a17.ts`, `pagina-menor9.ts` e
`pagina-continuar.ts` (fatos, dúvidas e relatos citados ali); o `shared.ts` com as 26 respostas comuns e
o `FAQ_EXTRA` saíram com as páginas de perfil.
**Proposta de copy de 16/10/2026 (aprovada pela dona e implementada):** diagnóstico, régua e copy
de cada página em `docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/`.
Tese comum (no jogo pronto alguém já decidiu tudo; criando, ele decide e o jogo responde), a
plataforma orienta (Ouvir, Verificar esta parte, O que falta para seguir, Guardado na sua conta;
Uma pista só nos experimentos) e Recados SÓ nas dúvidas. A Chave do Farol é o curso de entrada que
leva ao Construtor; a ordem dos projetos é Cadê Todo Mundo, A Chave do Farol, Nave Contra
Asteroides, O Jogo do Meu Jeito e Corre, Dino (nomes sem `?`/`!` na copy). Por decisão dela, a copy
mostra o que a plataforma oferece e NÃO fala de curso em preparação ou de ferramenta "ainda não
liberada" (o teste reprova "em preparação"); a liberação por posto continua explicada. Zappy:
"falas do Zappy" nas aulas (desde a primeira, sem créditos) × "ajuda do Zappy no Estúdio" (Inventor,
com créditos), sempre distinguidas. **Relatos reais**
(`oferta/relatos.ts`, termos de autorização assinados): cartelas AV do destaque Avaliações e
trechos N conferidos por segunda transcrição (segundos em `trechos-novos.md` da proposta);
identificação igual à do Instagram (André e Débora como Aluno/Aluna). Até 20/10/2026, nas páginas de
perfil: seção `layout: 'relatos'` = faixa de cartas com retrato; `falas` em outra seção = fala solta no
fim (nunca em `band`); `page.founder` trocava os fundadores (`FOUNDER_COM_ESCOLA` na F,
`FOUNDER_SEM_RELATO` em B e E); `offer.falas` punha uma fala antes dos planos. Hoje cada página cita os
relatos pelo id (`RELATOS_9A17`, `RELATOS_MENOR9`, `RELATOS_CONTINUAR`) e os não citados ficam em
`RELATOS_RESERVA` com o motivo. Retratos `relato-*.webp` recortados dos quadros dos
vídeos (`depo-*.webp` para Rafael, Débora e André). Os vídeos de criança explicando o próprio jogo
(V1/V2 da proposta) ainda não entraram: falta hospedagem. Os `copy/pagina-*.md` viraram ESPELHO
gerado da copy tipada (versões anteriores em `copy/historico/2026-10-16-antes-da-proposta/`).

Desde 20/10/2026 a página padrão `/kids/comunidade-dos-criadores/oferta` é a de 9 a 17 anos e
`/oferta/criar-junto` a do menor de 9 (ver "Comunidade dos Criadores em três públicos"); as cinco
páginas de perfil (`tempo-de-tela`, `criacao-de-jogos`, `expressao-visual`, `formacao-tecnologica`,
`habilidades-escolares`) fazem 301 para `/oferta` mantendo a query. O que segue sobre os perfis A a F
é histórico.
`server/offer-page.ts` resolve os dados comerciais para as rotas; Responses de erro devem
retornar na ROTA, nunca no componente Astro compartilhado. `OfertaPage.astro` despacha os bodies.
CTA principal aponta para `#planos`; link secundário para `#experiencia`.
A página pública `/oferta/continuar` atende famílias que já conhecem a plataforma, sem presumir
conclusão; desde 20/10/2026 é a `ComunidadeContinuarBody` (ver "Comunidade dos Criadores em três
públicos"). É uma etapa de relacionamento, não um quinto avatar. Os convites de assinatura no Kids e
nos serviços de continuidade/expiração do Members apontam para ela. Histórico da versão de 01/10 a
20/10: `docs/marketing/kids/comunidade-dos-criadores/implementacao-continuidade.md`.
**Habilidades escolares (15/10/2026, até 20/10/2026; hoje a URL faz 301):** `/oferta/habilidades-escolares` era uma sexta apresentação
da assinatura, em `habilidades-escolares.ts`/`habilidades-escolares-faq.ts`; desde a v5 do quiz
(16/10/2026) é o destino do perfil F. A dor e a explicação ficavam imediatamente abaixo do hero;
`tourAfterSection: 'f01'` colocava o tour depois dessa seção (o `ComunidadeTour.astro` saiu em 20/10/2026).
As quatro cartas (leitura, matemática, ciências e resolver problemas) ligam tarefas do projeto às
habilidades escolares, com ícones por assunto; quatro cartas ficam 2×2 no computador.
Ciências usa o experimento do jardim; não há promessa de notas nem de reforço por série.
Registro: `docs/marketing/kids/comunidade-dos-criadores/implementacao-habilidades-escolares.md`.
Até 20/10/2026 as dúvidas tinham pesos e ordem próprios: as 26 comuns mais as próprias de cada página
(FAQ_EXTRA em B e C, respostas da escola na F, continuidade na E). Hoje cada página lista as suas.
Não prometer revisão de toda atividade, prazo de resposta ou jogo pronto em prazo universal.
Recados é canal de dúvidas; a progressão e a disponibilidade dos cursos condicionam as ferramentas.
Preços e equivalência mensal vêm dos planos ao vivo. O anual informa pagamento anual, com Pix
sem renovação automática e cartão recorrente. A economia do anual (`{{economia_anual}}`, selo do
cartão) é calculada ao vivo como 12 mensalidades menos o anual; sem economia positiva a frase sai
(`comEconomia`). Nenhum valor escrito à mão; relatos só os de `relatos.ts`.
Pré-checkout, checkout e obrigado preservam os dados do responsável e a continuidade de quem já
começou. Guardas: `tests/unit/comunidade-offer-copy.test.ts` e `comunidade-funnel.test.ts`.
O manifesto `oferta/visuals.ts` relaciona cada demonstração às suas telas, legenda e texto
alternativo. **Só telas REAIS (01/10/2026, decisão da dona):** as 28 prévias SVG saíram; o que
ainda não tem captura fica em `PENDING_VISUALS` e NÃO renderiza (a seção ou a resposta segue só
com o texto). ⚠️ **Nada de "em construção" nas telas (16/10/2026):** as capturas da Jornada trazem
o cartão "Mais 6 postos estão sendo construídos"; o visual `jornada` usa só o RECORTE
`tela-jornada-meus-postos` (Faísca + Construtor) e o mapa saiu; o `catalogo` usa
o recorte `tela-catalogo-trilha`, sem o fim do mapa. Recapturou, refaça o recorte
(caixa no comentário de `visuals.ts`); `comunidade-offer-copy.test.ts` reprova a tela inteira. Ligar uma pendente = capturar e mover a chave para `COMUNIDADE_VISUALS`; as páginas
pedem a tela pelo id (`visualDe`), e o `FAQ_VISUALS` saiu em 20/10/2026. Ver "Direção de arte das quatro páginas".
**Termos e Privacidade (20/10/2026):** um Termo por oferta (`content/legal/termos-desafio.ts`,
`termos-comunidade-kids.ts`, `termos-comunidade-adulto.ts`; o NCI mantém o seu em `content/legal.ts`),
ligado ao funil por `FunnelDef.legal = { termos, termsVersion }` e servido em
`/<audience>/<produto>/termos`; a versão vai congelada no snapshot de cada compra
(`termsVersionForFunnel`). Mudou o texto de um Termo? Suba a `termsVersion`. A Política de
Privacidade é única (`content/legal/privacidade.ts`, `/privacidade`), com capítulos para crianças e
adolescentes e para adultos. `/termos` é o índice; `/kids/termos`, `/pro/termos`, `/termos-de-uso`,
`/kids/privacidade`, `/pro/privacidade` e `/politica-de-privacidade` redirecionam. Rodapé, checkout e
obrigado apontam o Termo da oferta da página (`Footer termosHref`). Revisão jurídica pendente.
**Quiz da Comunidade (v5, 16/10/2026, SPIN + resultado-ponte; substituído pela v6 em 20/10/2026,
ver "Comunidade dos Criadores em três públicos"; leads da v5 seguem legíveis por `legacySteps`):** proposta aprovada e decisões em
`docs/marketing/kids/comunidade-dos-criadores/quiz/revisao-copy-2026-10-16.md` e no README da pasta.
O quiz é a fase ANTES da oferta: qualifica e sobe o nível de consciência. Nenhuma tela antes do
resultado cita Comunidade/aula/curso/plataforma/preço nem apresenta criar jogos como solução ("jogo"
só quando descreve a família); o teste `comunidade-quiz.test.ts` reprova. Dez perguntas em SPIN
(`quiz/questions.ts`, chaves semânticas `crianca`…`sintese`, eventos `respondeu_comunidade_v5_*`) e
UMA condicional nos perfis B (`ferramenta`), C (`desenho`) e F (`escola`). A P1 (filho/filha + idade)
fica na própria entrada; `genero.ts` (`paraFeminino`) troca o texto para "ela" (copy escrita no
masculino, sem adjetivo que muda com o gênero; o teste varre 1.080 combinações). A I6 é a
calculadora (horas/dia × 365, em faixa; `stepOnScreen`). **Perfil = soma de pontos**
(`engine.ts`): cena de casa 3, preocupação 2, cena desejada 2, frase-síntese 3; empate → síntese,
depois cena; a cena desejada não tem opção neutra (sempre sai perfil); < 4 pontos = "caminho mais
perto". Cinco perfis: A tempo de tela, B jogos, C desenho, D programação, **F habilidades escolares**
(→ `/oferta/habilidades-escolares`). QT, estado misto e resultado sem perfil SAÍRAM. **Resultado**
(`result.ts`/`result-copy.ts`/`ComunidadeResultado.astro`): título com o PROBLEMA → quadro "O que você
contou" (espelho de cada resposta) → "Por que isso acontece" (só afirma a cena de casa se a família a
escolheu) → "O que muda isso" (criação de jogos, ainda sem produto) → "Onde isso acontece"
(Comunidade, UMA tela real, relatos de `relatos.ts`) → "Antes de seguir" (condições) → "O próximo
passo" (botão; sem preço). Recados SÓ quando a necessidade é "a quem recorrer". Sem a atividade de
casa. **Manchete A/B:** `quiz/entry-copy.ts` (`QUIZ_HEADLINES`); a rota lê `?manchete=tela` e a ilha
grava a variante em `attribution.quizHeadline` (`lib/lead-attribution.ts`, campo opcional). **Admin:**
Performance e Perfis aceitam `?quiz=atual` (versão pela definição gravada no lead, via
`analytics_quiz_definitions`; quem foi direto à oferta não tem definição e fica de fora) e
`?manchete=<id>` (`QuizScope` no repo + fake; manchete escolhida força `quiz=atual`; a padrão é
`FunnelQuiz.defaultHeadline` e conta também os leads sem registro). O painel mostra os filtros
quando o funil tem quiz versionado (`AdminFunnelInfo.quiz`) e só liga o recorte por padrão no funil
com teste A/B. Os links do resultado de volta ao quiz mantêm a manchete
(`quizPathWithHeadline`); "Responder pensando em outra criança" vai a `quiz#outra-crianca` e a ilha
reinicia ali (com definição e manchete). "ele" na copy é SEMPRE a criança (o personagem usa o
substantivo), senão `paraFeminino` erra; o botão usa `completesQuiz`. Performance nomeia as perguntas
(`rotuloCurto`) e a condicional (`condicional`) não quebra a cadeia "da etapa"; leads da v4 ficam
legíveis em Respostas por `legacySteps` (`questions-v4.ts`). Espelho editorial gerado:
`bun scripts/espelho-quiz-comunidade.ts` → `copy/quiz-comunidade.md` e `copy/resultados-quiz.md` (o
teste reprova espelho velho; v4 em `copy/historico/2026-10-16-quiz-v4/`). Mantido da v4:
`FunnelQuiz.version` inicia novo lead para respostas de versão anterior (lead antigo preservado);
PATCH exige revisão e token da sessão; outro filho recebe novo lead; feedback persistido antes de
confirmar. ⚠️ O PATCH recusa com 409 `QUIZ_CONFLICT` a gravação num lead de OUTRA versão do quiz (aba
aberta antes do deploy): o `applyAnswer` tomaria as respostas antigas por vazias e apagaria o lead.
**Desenho do quiz (02/10/2026, "mesmo estilo da oferta"):** `comunidade-quiz.css` (`.cq`) usa as
receitas da oferta (`kof-eyebrow`, `cap-chip` na cor da etapa via `STAGE_CHIP`, `kof-ladrilho`,
`kof-banda`, `kof-marca`, `fundo-folha`, `bloco--lado|largo`) e não cria cor própria. Etapas com
linha de ligação e check nas feitas; opções táteis com o degrau de 3 px. Na v5 o resultado é: herói
com o Zappy, o quadro "O que você contou" na banda navy (fixo ao rolar à direita no computador,
antes do texto no celular), a Comunidade em folha branca com a tela (`bloco--largo` quando a tela
tem mais de um quadro), os relatos, o aviso amarelo "Antes de seguir", o próximo passo no cartão azul
e a opinião.

**Redesenho visual da Comunidade (30/09/2026, "a oficina do criador"):** a copy v2 ficou intacta e a
página ganhou o desenho da plataforma kids: topo navy com a logo kids e o preço, herói com a TELA
REAL de uma aula num cartão azul (`.kof-marca`) e o Dedé e o Zappy apresentando, eyebrow amarelo,
ladrilhos coloridos nos benefícios, banda navy nos relatos (3 cartas-criador + o Mural real) e no
convite, a fita dos 8 postos da Jornada (`jornada-<slug>.webp`, copiados do kids), objeções em
cartas com ladrilho por unidade, o plano anual como o cartão da marca com o selo amarelo de
economia, FAQ em cartas, reveal ao rolar (saiu em 20/10/2026) e a barra fixa do celular (`.kof-mobar`, `href="#planos"`,
sem `data-checkout-cta`: a contagem segue 2). Plano e prints:
`docs/plans/2026-09-30-comunidade-redesenho-visual.md`.
- ⚠️ **As RECEITAS da identidade moram em `src/styles/kids-oferta.css`** (importado pelo body):
  aliases `--kof-*` que só apontam para `--sz-community-*`, e as classes `.kof-btn`, `.kof-carta`,
  `.kof-marca`, `.kof-eyebrow`, `.kof-chip`, `.kof-ladrilho`, `.kof-selo`, `.kof-banda`,
  `.kof-tela`, `.kof-decor`, `.kof-mobar` (só o que a página usa: o balão de
  personagem e o "stat" da banda do Desafio NÃO vieram). O funil recebe da
  plataforma só os TOKENS, nunca as receitas (`.kids-carta`/`.sz-btn-gradient` ficam no kids), por
  isso elas nascem aqui, por token, sem nenhuma cor própria. O LAYOUT mora em
  `src/styles/comunidade-oferta.css`, prefixado por `.cdc` (dois elos onde colide com `.theme-kids X` do
  `global.css`, como o `.cdc .topbar` contra o `.theme-kids header`). Não reaproveitar
  `.btn/.card/.reveal-up` do `global.css` (outro raio, outro peso, animam no load).
  `tests/unit/comunidade-offer-css.test.ts` trava: sem hex/rgb/hsl/oklch, `color-mix` só
  `in oklab`, sem `!important`, namespaces, Baloo 800 no `BaseLayout` (os títulos são 800).
- ⚠️ **Contraste medido** (`tests/unit/comunidade-offer-contrast.test.ts`, lê a paleta gerada do
  ui pelo caminho e usa o `contrast()` de lá): o link azul sobre o chão-alt dá 4,27 e REPROVA, então
  no layout `.cdc` (Desafio, presente, embaixador) todo `.kof-link` sobre o `.fundo-alt` fica na tinta
  com o traço azul, e volta ao azul dentro de uma `.kof-carta` (o teste trava as duas regras); a
  `.kof-eyebrow` quebra linha abaixo de 760px (com `nowrap` numa coluna `1fr` a pílula vira a
  largura MÍNIMA da coluna e empurra o herói para fora da margem a 390px).
- ⚠️ **As telas `tela-*.webp` são capturas REAIS do kids em staging** (perfil de teste), geradas por
  `scripts/captura-telas-kids.ts` (Chrome instalado em headless + CDP por WebSocket, sem
  Playwright): `KIDS_COOKIES_FILE` aponta para o Netscape exportado do navegador LOGADO NO PERFIL
  (o script recusa um caminho dentro do repo e os cookies expiram em poucas horas), `KIDS_SO`
  filtra telas, `KIDS_AULA_PATH` escolhe a aula. Ele esconde o "Pular para o conteúdo" (o CDP deixa
  o foco visível nele), fecha o diálogo que chega depois dos dados (os Combinados do Clube) e
  grava 1x e @2x (`srcset`). Toda imagem passa por revisão humana antes do commit (nomes de outros
  perfis de teste aparecem no Mural). Os antigos `print-*.webp` não são capturas reais, e as
  prévias SVG de 01/10/2026 foram apagadas no mesmo dia (só tela real entra na página).
- ⚠️ O dev server local sem Postgres mostra a página, mas o `POST /api/leads` cai e o Astro
  injeta o overlay de erro por cima: para prints via CDP, remova os elementos
  `vite-error-overlay` e `astro-dev-toolbar` antes de fotografar (`tmp/` é gitignorado; o
  script fica na sessão). ⚠️ O anel de foco dos botões sobre o azul da marca e sobre o navy é
  BRANCO (`.kof-marca .kof-btn:focus-visible`): o azul sumia no botão de compra do plano anual.
  A fonte de ícones é a instância estática 400 (sem eixo `FILL`): as estrelas decorativas saem
  vazadas de propósito.
- ⚠️ **Ícone ao lado de texto tem ACERTO ÓPTICO (02/10/2026, a dona viu "os ícones mais para
  baixo do texto").** Centrar as caixas não centra o que se vê: a Nunito e a Baloo desenham as
  letras acima do meio da linha, e o ícone ficava 1,5 a 3 px abaixo (7 px no ladrilho dos
  benefícios do herói, alinhado pelo topo). Medido na TINTA (foto em escala 3 + contagem de
  pixels), em Chromium, nas cinco páginas, a 1440 e a 390 px. Os acertos: ícone da `.kof-eyebrow`
  sobe 0,1em (0,05em no celular), o da `.kof-chip` 0,07em, o check da `.kof-selo` 0,07em; o
  texto do `.cap-chip` desce 0,08em (num `<span class="cap-chip-texto">`, para o círculo não sair
  do meio da pílula); o ladrilho ao lado de título Baloo (`.sub-head`, `.guarantee-head`,
  `.faq-group h3`) e a seta da dúvida sobem 12% do tamanho do título; o ladrilho dos benefícios
  do herói 0,06em; a marca da comparação 0,06em.
  ⭐ **Texto de várias linhas: o ícone fica no MEIO DO BLOCO** (02/10/2026, decisão da dona: com
  o ícone preso à 1ª linha, a frase de duas linhas deixava o ícone "mais para cima"). Por isso
  benefícios do herói, selo, comparação e títulos usam `align-items`/`align-self: center` e só o
  empurrão óptico acima, que vale igual para uma ou mais linhas. Ícone novo ao lado de texto:
  medir com uma linha E com duas antes de achar que `align-items: center` resolve.

**Direção de arte das quatro páginas (01/10/2026, "capítulos da oficina"):** a copy não mudou uma
palavra; mudou a composição, e todas as imagens passaram a ser telas reais.
- **O layout saiu do `<style>` do body** para `src/styles/comunidade-oferta.css` (ainda todo
  prefixado por `.cdc`; o biome o formata). O body importa as duas folhas e não tem `<style>`
  (`comunidade-offer-css.test.ts` trava). ⚠️ `<header>` dentro de `.cdc` herda o
  `.theme-kids header` do `global.css` (fundo e borda): os cabeçalhos de capítulo são `<div>`.
- **Capítulo** (`ComunidadeSection.astro`, recebe `index`): cor de unidade (`.cor-azul|rosa|verde|
  roxo|laranja` → `--cor`/`--cor-fundo`), fundo que nunca repete o da vizinha (`.fundo-chao|folha|
  alt`; `band` = navy) e cabeçalho com chip + título + ABERTURA (o 1º parágrafo do 1º grupo sem
  subtítulo, em `.cap-lead`). Arranjo por bloco: `lado` (uma tela, texto ao lado, lado alternado),
  `largo` (tira de telas embaixo, texto em colunas) e `texto` (sem tela; carta quando tem
  subtítulo). `cards` = três cartas com a tela em cima; `tools` = uma carta larga por ferramenta;
  `journey` = trilha dos 8 postos com o NOME da ferramenta que cada um libera.
- **Vínculo imagem × texto** (`section.visuals`): a imagem i acompanha o i-ésimo grupo QUE VIRA
  BLOCO e o último fica com as que sobrarem; `'a+b'` põe duas no mesmo grupo. Um grupo que é SÓ a
  abertura (sem subtítulo, um parágrafo) não vira bloco e não recebe imagem. Grupo sem subtítulo
  com duas ou mais telas REAIS se DIVIDE em dois blocos (texto, tela, texto, tela); com uma só (a
  outra pendente), o texto fica inteiro ao lado dela, sem parágrafo solto. As pendentes saem
  DEPOIS do vínculo. Mexer em `visuals`/`heroVisual`/`layout` é decisão de desenho; os textos não
  se tocam.
- **Página de continuidade (`continuar`, 01/10/2026 a 20/10/2026; hoje tem corpo próprio):** mesma
  direção de arte, com três peças próprias. (1) `layout: 'cases'` em `#proximo-passo`: uma carta por SITUAÇÃO (`.situacoes`), com
  o marco na cor do grupo ligado por uma linha, texto e a tela dela (`only="first"`); na folha
  branca a carta vira painel na cor do chão. (2) A comparação de acessos
  (`ComunidadeComparacao.astro`, `group.comparison`) é uma carta por PAR, metade neutra → seta →
  metade na cor do capítulo, com papéis ARIA de tabela (não é `<table>`: em grid perderia a
  semântica); no celular o par empilha e o rótulo de cada coluna entra na carta. O CSS mora no
  layout (`.cdc .comparacao-*`), sem `<style>` no componente. (3) `ENFASE_NUMA_LINHA` em
  `oferta/arte.ts` (largura da ênfase do título em `em`: o h1 encolhe por `cqi` até a frase azul
  caber inteira numa linha; antes o equilíbrio de linhas deixava "continuar" sozinho). Desde 16/10
o mapa ficou vazio, e saiu em 20/10 com a continuidade antiga (os cartões `cases` e a comparação
seguem no motor de seções, sem página que os use).
- **`oferta/arte.ts` (o que depende do ASSUNTO, não da posição), no motor de seções:**
  `ICONES_DE_CAPITULO` (chip do capítulo, por id de seção) e `ICONES_DE_GRUPO` (ícone de cada
  subtítulo). Sem entrada vale o ícone pela posição. Desde 20/10/2026 sobra só `experiencia:
  'extension'` (o primeiro capítulo do presente e do embaixador; as outras entradas eram da
  continuidade antiga), e o teste exige que toda entrada aponte para uma seção do presente ou do
  embaixador.
- **Revisão das cinco páginas (01/10/2026):** o TEXTO fica ao lado da tela que ele descreve. Ao
  mexer em `visuals`, confira o par de cada bloco (o grupo sem subtítulo se divide: a 1ª tela vai
  com a primeira metade dos parágrafos, as demais com a segunda): o parágrafo do Clube estava ao
  lado do Mural, o do Pensa ao lado da Jornada. NENHUMA demonstração se repete no corpo de uma
  página (o teste trava; só a D repete `aprendizagem`, de propósito), e duas telas quase iguais
  não ficam na mesma seção (`pinta` × `animacao`). Seção sem tela real (as três "Você acompanha",
  enquanto a Área dos pais está pendente) leva `aprendizagem`. Quatro parágrafos em colunas ficam
  dois a dois (`:has(> p:nth-child(4):last-child)`). Tela única quase quadrada
  (`.visual--estreita`, os combinados do Clube) fica na coluna menor.
- **`ComunidadeVisual`**: 1 a 3 telas (`frames`), `mode: 'steps'` numera e põe a seta, `'set'` só
  agrupa; `variant="plana"` (sem palco) nas cartas e dúvidas; `only="first|last"` nas cartas e
  ferramentas. Todo quadro abre ampliado (`a[data-zoom]` → `<dialog class="zoom">`; sem JS abre em
  outra aba). ⚠️ O `<dialog>` precisa de `margin: auto`: o reset do Tailwind zera a margem e ele
  ia para o canto.
- **Destaques** (`oferta/destaques.ts` + `destacar.ts` + `ComunidadeProsa.astro`): trechos
  LITERAIS da copy em `<strong>` (marca-texto amarelo), por id de seção do motor. O mapa ficou vazio
  em 20/10 (as entradas eram da continuidade antiga); o mecanismo segue para as seções do presente.
- **Faixa "Por dentro da Comunidade"** (`TOUR`, até 20/10/2026): dez telas com o nome da área e UMA
  linha PESSOAL de função ("Onde seu filho monta e testa os jogos"); saiu com a continuidade antiga.
  A regra da dona continua valendo para frases novas: descrever o filho fazendo algo ali, nunca a
  ferramenta.
- **Capturas** (`scripts/captura-telas-kids.ts`, reescrito em roteiros): cada roteiro leva a
  plataforma a um estado e tira 1x e @2x, inteira ou recortada. `KIDS_SO` aceita nome de foto ou
  de roteiro; `KIDS_CDP_PORT` anexa a um Chrome já logado. ⚠️⚠️ **O token de sessão do kids GIRA**:
  usar os cookies do arquivo depois que outra sessão já os renovou derruba as DUAS (foi o que
  aconteceu em 01/10: a 2ª execução com o arquivo invalidou a sessão viva). Um arquivo de cookies
  serve para UMA execução. ⚠️ A Área dos pais pede a senha e vale 15 min: cookies exportados logo
  depois de entrar nela + `KIDS_SO=pais`. ⚠️ O cartão do jogo sai CORTADO no meio do QR (inteiro,
  a câmera o leria e levaria o visitante ao staging). O conteúdo fotografado (plano `ParOuImpar`,
  a dúvida nos Recados, o cavaleiro `base-3-2` em Materiais do jogo) está no perfil de teste Lipe;
  os roteiros só leem.
- **Recaptura de 07/10/2026 (vocabulário da aventura):** 19 telas refeitas no perfil Lipe com
  `KIDS_CDP_PORT` (Explorar, Recados da equipe, fase/parte, Voltar à fase, Enviar meu projeto). O
  `tela-certificado` saiu da conta Leninha (`KIDS_CURSO_CONCLUIDO=cade-todo-mundo`), a única com o
  certificado do Cadê já como "Certificado de Criador": o do Lipe é da Nave, ainda não reimportada,
  com "Certificado de Conclusão". O jogo pronto clica nos esconderijos pela posição DO JOGO (o layout
  mudou e o clique em pixel caía fora) e o certificado mira o botão Baixar certificado. Ficaram as
  de antes `tela-estudio-lista`, `tela-pinta` e `tela-animacao` (não tinham rótulo velho, e as novas
  saíram com "Buscando…" da nuvem e cartões sem capa). Os vídeos fictícios das fases ainda mostram
  "AULA 1 DE 3": somem com os vídeos novos.
  ⚠️ Essas telas são de antes da unificação de 21/10/2026: o menu agora diz **Cursos** (não
  Explorar), a aula é **aula** (não fase), a ampliação volta por **Voltar à aula**, e o grupo de
  aulas passa a se chamar **módulo** (decisão de 23/10/2026; a trilha e o baú do Kids já dizem
  "Módulo N", então telas com "Mundo N" são antigas). Nenhuma recaptura depois de 21/10 está registrada aqui:
  antes de usar uma dessas telas numa oferta, confira os rótulos nas Diretrizes Pedagógicas, seção 6.
- **Recaptura de 01/10/2026 à tarde (pedidos da dona):** (1) **os desenhos BONITOS**: o boneco
  `heroi` foi apagado por ela ("muito simples"); o Pinta mostra o cavaleiro `base-3-2`, o animado
  `dumb-animation` e o cenário `dumb-scene-2`, e a galeria entra com a busca `base`; o Molda
  mostra o `player-2` (bonequinho de blocos) e não o carrinho. (2) **Blocos organizados**: antes
  de fotografar o Estúdio, botão direito numa área vazia › "Organizar blocos", zoom por Ctrl+roda
  e arrastar o ESPAÇO até o programa ficar no alto (`organizarBlocos`/`zoomDosBlocos`/
  `enquadrarBlocos`). ⚠️ Arrastar pegando em cima de um bloco DESMONTA o programa (aconteceu; o
  Ctrl+Z desfez): o ponto de pega é sempre fundo (`vazio()`, pelo elemento sob o ponto, não pela
  caixa da pilha). (3) **Área dos pais**: `KIDS_PAIS_SENHA_FILE` (arquivo fora do repositório,
  senha na 1ª linha, nunca impressa) + `KIDS_SO=pais`; saíram `responsavel` (painel cortado ANTES
  da lista de ferramentas, que na conta de teste diz "Não incluído na conta", + "Para conversar
  sobre uma criação"), `privacidade`, `conta` e `indicacao`. Em 02/10/2026 entraram `creditos`,
  `compras` e `perfis` a partir de capturas da PRÓPRIA dona na conta dela (produção, escala 1):
  recortadas por um script do scratchpad, com o sobrenome da criança e os dígitos do cartão
  EMBAÇADOS antes do recorte e o @2x ampliado (não há captura em escala 2). Segue pendente só
  `conexao`. ⚠️ Numa tira (`bloco--largo`/`visual--tira`) a moldura é 16:10 com `object-fit:
  cover`: tela com proporção entre 1,4 e 1,8 NÃO ganha o `quadro-recorte` e perde o pé (o
  `pais-perfis` nasceu 640×454 e cortava o botão; foi recortado em 640×400). (4) **Certificado**: a aula final de um curso CONCLUÍDO (`KIDS_CURSO_CONCLUIDO`), com
  o número do certificado escondido, e o documento (`tela-certificado-modelo` = o
  `entrega-certificado.webp` da página do Desafio, 760 px, sem @2x de verdade). Os roteiros
  `aula-estudio`, `pinta`, `estudio`, `molda` e `pais` foram rodados de ponta a ponta com
  `KIDS_CDP_PORT`; pedir um roteiro pelo nome em `KIDS_SO` tira todas as fotos dele.

**Admin por funil (`/admin`):** seletor de funil no topo filtra as 3 abas. `adminLeads/adminFunnel/
adminPerfis` aceitam `?funnel=` (repo filtra por `leads.funnel`; `eventCounts` junta ao lead).
A página passa `adminFunnelList()` (rótulos do dropdown + rótulos de respostas/perfis por funil) ao
`AdminDashboard`. `RespostasTable` mostra as respostas do `quiz_answers` rotuladas pelas perguntas do
funil + coluna Funil; Perfis/Performance rotulam por funil (perguntas viram "Pergunta N").

**Landings de indicação (`/bolsa/[codigo]` e `/embaixador/[token]`, 08/2026 — Fase 1 do sistema
de indicações):** páginas FLAT fora do registry (molde `/renovar` — registrar um funil exigiria
`FUNNEL_OFFER_<KEY>` no Railway), tema kids, `no-store` + `noindex` (a do embaixador é
capability-URL: o token de 32 bytes É a chave de acesso, sem conta/senha; desde 20/10/2026 há um
tema por público, ver "Presente por convite e campanha"). O funil é só a BORDA:
o estado (códigos, embaixadores, resgates, convites) vive no **@sistemazero/referrals**, alcançado
via gateway com o HMAC de borda de sempre (`gateway-client.ts`: `resolveReferralCode`,
`getAmbassadorByToken`, `createAmbassadorInvite`, `redeemScholarship`). SSR resolve o código/token
(404 amigável UNIFORME p/ inexistente/desativado; gateway fora → tela "recarregue", NUNCA afirmar
que o código não existe). Em `/bolsa`, `resolveReferralGiftPage` exige `giftAvailable:boolean`
na resposta do referrals: `false` mantém o link, mas mostra "ainda não abriu" sem formulário;
resposta incompleta/erro do gateway falha fechada. A página apresenta somente o curso
**Cadê Todo Mundo** (Kids 9 a 14 anos ou a versão adulta), não o Desafio ou a assinatura. Quando disponível, passa
os dados por prop às ilhas `BolsaResgate` (form do RESPONSÁVEL —
mesmo aviso kids do pré-checkout; telefone OPCIONAL, não reusar `ContactSchema`; estados
completed/processing/409s por `ApiError.code`; o resgate é RETOMÁVEL no servidor — re-enviar após
falha continua de onde parou) e `EmbaixadorPainel` (copiar link/mensagem pronta pro WhatsApp DELE
— a plataforma NUNCA dispara WhatsApp; convite por e-mail único). Handlers puros em
`server/referrals.ts` (`postRedeemScholarship`/`postAmbassadorInvite` — repassam envelopes
conhecidos [404/409/429 e 503 `GIFT_UNAVAILABLE` no resgate], demais 5xx/timeout viram 502 `GATEWAY_ERROR`), rotas finas
`/api/bolsa/resgatar` e `/api/embaixador/convites`. ⚠️ Rate limit: as escritas entraram no
`RATE_LIMITED_WRITE` da middleware e os GETs SSR no `rate-limit-paths.ts` (cada hit = 1 chamada
assinada ao gateway) — landing nova DEVE entrar nos dois regex. Testes:
`tests/unit/referrals-handlers.test.ts` (+ fake-gateway com os 4 métodos).
**Bônus na página do embaixador (extensão 09/2026):** o `GET by-token` passou a trazer `bonus:
{pixKey, items}` e o `EmbaixadorPainel` ganhou o card **"Seus bônus"** — SÓ aparece com ≥1
conversão (quem só presenteia não vê nada de dinheiro): lista cada bônus (valor via
`formatBRLFromCents2` do `lib/money.ts` — invariante 3, nada de formatador local; estado: na
garantia/liberado/pago — ⚠️ **"liberado, pagamento a caminho" SÓ com chave cadastrada**, senão diz
"falta a sua chave Pix": sem ela o Pix fica parado e prometer o contrário faz a pessoa fechar a
página sem resolver), campo de **chave Pix** (salvar → POST `/api/embaixador/pix` →
`postAmbassadorPix` → PATCH by-token no referrals, envelope [200/404/429]; ⚠️ o catch distingue
4xx — chave inválida é DETERMINÍSTICO, a copy não pode dizer "tente em instantes"; a mensagem é
`role="alert"` + `aria-describedby` no input, e EDITAR o campo limpa o "Chave Pix salva.", senão
quem corrige a chave sai achando que salvou) e o texto dos
termos (agradecimento único por Pix, sem vínculo; a usuária valida o texto com o contador ANTES
de divulgar). Client `updateAmbassadorPix` no `gateway-client.ts`; `TOKEN_RE` único no
`server/referrals.ts` (invite + pix); o `[token].astro` tipa o bônus por
`EmbaixadorBonusProps['bonus']` (shape da ilha `EmbaixadorBonus`, sem cópia; até 20/10/2026 o bônus morava no `EmbaixadorPainel`); a rota de escrita já caía no regex
`/embaixador/` do `RATE_LIMITED_WRITE`.

**Pendência (decidida):**
- **Upsell/downsell:** rotas + flags + cadeia de `successPath` prontas (scaffolding; **404 até** um
  funil definir `upsell`/`downsell` no `FunnelDef`). A 2ª cobrança de um lead JÁ PAGO (guard
  `409 ALREADY_PAID` no checkout) será finalizada quando existir uma oferta de upsell real.

## Copy do funil kids (guarda de vocabulário — decisão 14/08/2026)

O filtro de público fala de COMPORTAMENTO observável (vive em jogo, computador e tecnologia; já
cria no computador). **"hiperfoco"/"foco intenso"/"interesse intenso"/"concentração fora do comum"
só podem existir na HISTÓRIA DO ANDRÉ**, delimitada por `<!-- historia-andre:inicio -->`/
`<!-- historia-andre:fim -->` quando essa história for utilizada. As novas ofertas da Comunidade
e do Farol não precisam incluí-la e não usam esses termos clínicos. O teste
`tests/unit/copy-vocabulario.test.ts` varre `src/**` inteiro e reprova termo fora dos marcadores
(regex tolerante a markup/plural/palavra no meio); todo bloco marcado precisa conter o André + o
hiperfoco e ter <2k chars (marcador não é isenção genérica). Ao editar a história, mantenha os
marcadores abraçando SÓ ela; um novo body que conte a história = marcar igual (a descoberta é
automática). Os marcadores são comentários HTML e SAEM no HTML servido (inofensivo, consciente).
Títulos de página usam **`Página | Sistema Zero`** (barra vertical; nada de travessão nem `·` em
`<title>`/`seoTitle` — o byline visual "Helena e Júlio · Sistema Zero" mantém o `·`).

### "Jornada" é NOME PRÓPRIO (22/09/2026)

A **Carreira do Criador** virou **Jornada do Criador** (a dona achou "carreira" pesado demais para
criança; e o app kids já dizia "jornada" em oito lugares). A regra da copy: **"jornada" pertence ao
conceito**. Onde a frase precisar da palavra comum, use outra — *caminho*, *percurso*, *escada*.
Sem isso o nome se dissolve e o texto produz coisas como "uma jornada: a Jornada do Criador" ou
"a Jornada organiza a jornada", que foi exatamente o que a troca mecânica gerou aqui.
⚠️ **Exceção deliberada:** `src/content/legal-kids.ts` mantém "não promete renda, emprego ou
**carreira**" — ali a palavra está no sentido adulto/profissional, que é justamente o que a
cláusula nega. O nome do produto não pode entrar naquela frase.

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
- **Regularização de assinaturas**: Payments coordena os casos, avisos e prazo.
  O Funil reconhece `payment.failed` com `subscriptionId`, deduplica a entrega e
  não envia outro aviso nem altera acesso. O remetente antigo foi removido.
- **`/renovar?oferta=<slug>`** (destino do lembrete de renovação do members): resolve o funil
  pela oferta (principal por env; irmã via altOffer no catálogo) → 302 p/ o checkout dele
  (com `?oferta=` quando é a irmã). Slug desconhecido → `/`.
- ⚠️ `getActiveOffer` agora é OBRIGATÓRIO nos handlers (modo de cobrança, intervalo e política de
  acesso): catálogo indisponível → **502 `CATALOG_ERROR`** (sem view não dá p/ saber o modo — cobrar
  anual como vitalícia seria bug de dinheiro). Preço e política são renovados juntos no cache. Uma
  resposta 200 indisponível/incoerente apaga a cópia antiga; só falha transitória não-200 pode usar
  stale. `clearOfferCache()` é hook de TESTE (cache por slug em módulo).
- A cotação autoritativa devolve preço, modo de cobrança, intervalo, garantia e política de acesso
  no MESMO contrato. Antes de chamar o provedor, o funil grava a versão validada em
  `lead_payments.offer_snapshot` (migration `0015`): boleto/Pix antigos preservam exatamente os
  termos aceitos mesmo que a oferta mude depois. Snapshot presente e malformado falha fechado com
  `502 SNAPSHOT_RETRY`; cobrança legada sem snapshot continua pelo caminho compatível. O anual pago
  à vista é congelado como compra única com 12 meses fixos. A modalidade `lifetime` segue válida.

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

- **NÃO há mais páginas pré-renderizadas.** `quiz`, `privacidade`, `termos` e
  `[audience]/[produto]/termos` são SSR (`prerender = false`) DE PROPÓSITO: página pré-renderizada é servida estática pelo
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
  - ⚠️ **`obrigado` lê o lead e o snapshot da cobrança:** só afirma aprovação se `paid_at` existe e,
    em prazo fixo, calcula a data final a partir desse instante com o mesmo algoritmo do members.
    Pagamento pendente nunca inicia a contagem. O cookie é mantido para que a confirmação sobreviva
    a um reload; uma nova jornada continua segura porque `POST /api/leads` e `checkout.astro` nunca
    reaproveitam lead pago. O **CPF NUNCA é pré-preenchido** (`initialContact.cpf = ''`).

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
momento do checkout) e o contrato comercial versionado da migration `0015` em `offer_snapshot`
(preço cheio/final, cupom, garantia, versão dos termos e política de acesso).
Migrations forward-only por `drizzle-kit`, com **journal próprio por pacote**
(`migrations: { table: 'funil_migrations' }`) no schema `drizzle` — NÃO compartilhe
`__drizzle_migrations` entre pacotes (a dedupe por `created_at` pularia migrations).

**Atribuição de eventos (migration `0016`):** `leads.attribution` guarda first-touch versionado com
UTMs, `eventCode`, cupom inicial e landing path; só aceita identificadores técnicos curtos e nunca
PII. `funnel_events.event_key` é único e dá idempotência aos marcos enviados por outros serviços.
O admin filtra Respostas por `event_code` e agrega leads únicos por etapa e pagamentos pelo preço
real do snapshot. A rota interna `POST /api/internal/challenge-events` exige
`x-internal-token = FUNNEL_INTERNAL_TOKEN`, aceita no máximo 500 eventos por lote e resolve os leads
em batch. O Members envia ativação, início, Dia 1 e conclusão; a compra da Comunidade só é atribuída
quando existe uma jornada anterior do Desafio para o mesmo responsável.

**Trava copy × oferta:** `FunnelDef.offerContract` torna uma promessa rígida da página verificável
em runtime. O Desafio declara `one_time/fixed/30/days`; `/oferta`, `/checkout` e os quatro caminhos
de cobrança falham fechados com 503/`OFFER_CONTRACT_MISMATCH` se a env apontar para outra política
ou se o catálogo não puder comprová-la. A view é conferida para apresentação e a cotação
autoritativa é conferida novamente antes de criar a cobrança, fechando também a corrida de cache.
O preço permanece dinâmico no catálogo; só a política prometida pela copy é rígida.

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

## Gotcha: o build quebra com `Missing field tsconfigPaths` no Tailwind

Desde 16/10/2026 o Vite da raiz do monorepo é o 8 (rolldown), e o `@tailwindcss/vite` do funil passou
a resolvê-lo como peer, enquanto o Astro 6 roda o Vite 7: o `astro build` (o mesmo do Dockerfile)
falhava em `[@tailwindcss/vite:generate:build] Missing field tsconfigPaths`. O funil fixa
`vite: 7.3.3` nas devDependencies para os plugins do Tailwind e do React ligarem o MESMO Vite do Astro.
Subiu o Astro e ele trouxe outro Vite? Ajuste o pin para a versão de `astro/vite` no `bun.lock`.

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

## Presente por convite e campanha (02/10/2026; Kids e adulto desde 20/10/2026)

**Dois públicos (Canvas "Presente Kids e adulto · proposta", aprovado em 20/10/2026; quadros
RecebimentoKids, RecebimentoAdulto, Embaixador e Estados):** o público vem do CÓDIGO.
`resolveReferralGiftPage` lê `audience` da resposta de `GET referrals/internal/codes/:code` (ausente ou
`null` = `kids`, para o referrals anterior; valor desconhecido falha fechado como `unavailable`) e devolve
`audience` no topo e no `gift` (`ResolvedGiftView`). `/bolsa/[codigo].astro` despacha:
- **Kids** → `PresenteLayout` (`theme-kids`, logo Kids, `Footer audience="kids"` com o Termo da Comunidade
  Kids) + `PresenteOferta`, na linguagem da página de 9 a 17: receitas em `kids-oferta.css`, layout em
  `comunidade-917.css` (`.c917`) e as peças do presente em `styles/presente-kids.css` (`.pk-*`). Copy em
  `PRESENTE_KIDS` (`content/presente.ts`). Quem lê é o responsável.
- **Adulto** → `PresenteAdultoLayout` (`theme-arcade`, logo e selo da oferta adulta, `Footer
  audience="pro"` com `/pro/comunidade-dos-criadores/termos`) + `PresenteAdultoOferta`, no layout
  `.cda` de `comunidade-adulto.css` com as peças de `styles/presente-adulto.css` (`.pa-*`). Copy em
  `PRESENTE_ADULTO` (`content/presente-adulto.ts`), com marca do topo, foto dos fundadores, prévia do
  Mural e links legais de `PAGINA_ADULTO` por referência. Decisões da dona: as telas do curso são as
  capturas Kids com a legenda "Tela da versão Kids do curso. Na área adulta, a aparência é outra."; o
  Mural é `/img/comunidade-adulto/previa-mural.webp` com "Prévia do Mural adulto com dados de teste."; o
  link do jogo publicado continua depois dos 7 dias, como no Kids.
- Código inexistente (404) ou referrals fora do ar (503) não revelam público: tela de status no tema
  Kids, sem os atalhos das seções (`secoes={false}`).
- Estados (os dois temas, copy em `estados` de cada módulo): `preparing` "ainda não abriu", `scheduled`
  "abre em dd/mm/aaaa", `paused`, `ended` "terminaram em dd/mm/aaaa" (sem data no convite pessoal) com a
  retomada em `<details id="retomar">` (`BolsaResgate retryOnly`). O botão do topo e a barra fixa do
  celular (`lib/barra-fixa.ts`) só aparecem com o formulário aberto; abaixo de 520px o botão do topo sai.

**`BolsaResgate` (`audience`, padrão `kids`):** copy por público em `content/presente-resgate.ts`
(`RESGATE_COPY`, client-safe; a ilha NÃO lê env, a URL do app chega por prop: `KIDS_COMMUNITY_URL` no Kids,
`COMMUNITY_URL` no adulto). Kids: aviso "Estes dados são do responsável", campos do responsável, aceite
"é o responsável pela criança" + Termo Kids, concluído "O presente está liberado para a sua família" e
"crie o perfil do seu filho". Adulto: "Seu nome", "Seu e-mail", telefone opcional, sem aviso de perfil,
aceite "tem 18 anos ou mais" + Termo adulto, concluído "Está tudo pronto para o seu primeiro jogo" com
"Entrar na Comunidade" (`/login`) e "Criar ou recuperar a senha" (`/esqueci-senha`). `SCHOLARSHIP_ALREADY_
REDEEMED` agora é "este e-mail já resgatou um presente DESTE público" (o mesmo e-mail pode ter um Kids e
um adulto): bloco "Este e-mail já recebeu um presente Kids/adulto", e no adulto "Ver como continuar" vai a
`/pro/comunidade-dos-criadores/oferta/continuar`. O Mural da confirmação segue `muralAccess` (trial =
"liberado até a mesma data"; visitor = só ver e jogar). Vencimento por `dataBrasilia` ("27/10/2026, às
14h"). Visual pelas classes `bz-*`, desenhadas em `presente-kids.css` e `presente-adulto.css`. Não afirmar
entrega confirmada a partir de HTTP 202 do messaging ("está a caminho do seu e-mail").

**Painel do embaixador (`/embaixador/[token]`):** `EmbaixadorLayout` + `styles/embaixador.css` (`.emb`,
painel neutro: chão e cartões `--kof-*`, títulos Bricolage e corpo Atkinson; a carta adulta leva a classe
`theme-arcade` só para ler os tokens `--cda-*`, como o cartão da bio). Copy em `content/embaixador.ts`
(`PAINEL_EMBAIXADOR`, `EMBAIXADOR_DUVIDAS`). O `GET by-token` traz `shareUrls: {kids, adult}` (o `shareUrl`
segue como o link Kids de reserva; `linksDoEmbaixador`), e a ilha `EmbaixadorPainel` tem o seletor "Para
quem é o presente" (rádios nativos, Kids por padrão), o link, a mensagem de WhatsApp editável (uma por
público) e o convite por e-mail com o `audience` escolhido; link `null` mostra o aviso e desliga o convite
daquele público. `postAmbassadorInvite` valida `audience` (`kids|adult`) e só repassa o campo quando é
`adult` (o Kids viaja como antes, compatível com o referrals anterior). O bônus e a chave Pix moram na ilha
`EmbaixadorBonus` (seção `#bonus`), com o valor SEMPRE de `bonus.amountCents` ("Kids ou adulta"). A
contagem de resgates é o total (o contrato não separa por público). Seções: para quem faz sentido, os três
passos, a tabela "O que o presente inclui", as dúvidas e o fechamento.

`/kids/embaixadores` (público, indexado) usa o `ProgramaLayout` (o antigo `PresenteLayout`, layout `.cdc`)
e fala dos dois presentes: hero, `AMBASSADOR_SECTIONS`, entrada pelo app adulto (`/perfil`) ou pela Área
dos pais, e as dúvidas de `EMBAIXADOR_DUVIDAS`; a experiência detalhada (`GIFT_SECTIONS`/`GIFT_FAQ`) é a
do presente Kids. A faixa Kids comunicada é **9 a 14 anos**; o adulto, 18 anos ou mais. O nome do curso
vai sem a interrogação ("Cadê Todo Mundo").

`/bolsa/previa` é pública, noindex e sem formulário: somente apresentação escapada e datas, sem buscar campanha ou aceitar cadastro; aceita `?audience=kids|adult` (padrão `kids`) para a prévia do Admin. O código `previa` é reservado no serviço. A resolução pública distingue scheduled/paused/ended/preparing; o backend revalida a janela no envio. Encerrada/pausada oferece retomada de cadastro previamente aceito, sem novos direitos.

O painel privado usa no-store, no-referrer e canonical público sem token. O link do WhatsApp é sempre o presente público. As rotas continuam `/bolsa` e `/embaixador`, então `middleware.ts` e `rate-limit-paths.ts` não mudaram.

**Testes:** `referral-gift-page.test.ts` (público do código e despacho da rota), `referral-gift-copy.test.tsx`
(regras de voz nos módulos dos dois públicos, `BolsaResgate` Kids e adulto, seletor e convite do painel,
bônus pelo serviço), `referrals-handlers.test.ts` (convite com `audience`), `comunidade-offer-css.test.ts`
(as três folhas novas só por tokens) e `comunidade-offer-contrast.test.ts` (pares do formulário nos dois
temas). Navegador: `node --import tsx tests/browser/presente.ts` depois do `bun run build` (referrals falso
pelo gateway falso; Kids, Kids legado, adulto, estados, prévias e painel a 390 e 1440 px, resgates e o
convite com o público; capturas em `QA_OUTPUT`, `QA_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
na nuvem).

O referrals e o funil precisam ser liberados de forma coordenada, após a migration do serviço e o seed dos templates (os adultos inclusive). Sem o curso `cade-todo-mundo-adulto` publicado, o link adulto mostra o estado "ainda não abriu" (`giftAvailable=false`). Pendências e validação: `docs/marketing/kids/cade-todo-mundo/implementacao.md`.

## Acesso infantil por aparelho (10/10/2026)

No funil `kids/*`, o pós-compra usa `kids-welcome` (comprador novo, link de definir senha) e `kids-new-access` (recorrente, link `<kids>/login/responsavel`); o adulto continua em `welcome`/`new-access` com `/cursos`. A orientação do Desafio (`challenge-access-approved`) manda clicar em **Adicionar criança** (a conta nasce sem perfil) e, na página da criança, em **Autorizar aparelho** (desde 11/10/2026 cada criança tem página própria; o embaixador mora em `/pais/conta#embaixador`). Se o Messaging responder 404 `TEMPLATE_NOT_FOUND` para a chave Kids, `sendOne` reenvia com a chave antiga (`LEGACY_TEMPLATE_KEYS`), as mesmas variáveis e a mesma Idempotency-Key: o comprador nunca fica sem o link de senha, mesmo que o Funil suba antes do seed. A regularização de assinaturas é coordenada pelo Payments e leva o responsável a `/pais/conta`. `tests/unit/message-templates-contract.test.ts` confere as chaves usadas contra `packages/messaging/scripts/seed-templates.ts`, nos dois canais.

## Acesso por período confirmado (24/10/2026)

Webhooks `payment.paid` e `payment.subscription_period_confirmed` aceitam `cycleAccess`
validado por Core. `REVIEW_REQUIRED` registra entrega sem conceder acesso; confirmação
posterior usa evento separado e encaminha `billingPeriod` ao Members sem repetir evento
financeiro. Renovação de comprador já pago não refaz aquisição/boas-vindas. `paidAt` é
preservado e o período antigo nunca é calculado a partir da data tardia do pagamento.
Deploy consumidor primeiro: Members, depois Funnel, só então produtor Payments.
