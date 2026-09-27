# Plano de implementação: Desafio do Primeiro Jogo com 30 dias

Design aprovado: [oferta de 30 dias e funil reposicionado](2026-09-16-desafio-primeiro-jogo-30-dias-design.md).

Status: planejado, ainda não implementado.

## Resultado esperado

Ao final, o catálogo aceitará três políticas de acesso por oferta:

- vitalício para compras únicas;
- prazo fixo em dias ou meses para compras únicas;
- ciclo ativo para assinaturas.

O Desafio terá uma nova oferta pública de R$ 67 e 30 dias. Cupons de evento darão
R$ 30 de desconto, levando o total a R$ 37. A oferta vitalícia atual, seus compradores
e a possibilidade geral de criar novas ofertas vitalícias continuarão intactos.

## Princípios de execução

- Fazer cada mudança de comportamento com teste falhando primeiro.
- Separar mudanças de schema, escrita e leitura para permitir implantação compatível.
- Nunca recalcular matrículas existentes a partir de uma oferta editada.
- Manter fallback para cobranças e eventos criados antes das novas colunas.
- Não trocar o funil público antes da homologação ponta a ponta.
- Não incluir no commit arquivos já modificados por outros trabalhos.
- Gerar migrations pelo Drizzle e revisar o SQL; não editar snapshots manualmente.

## Dependências entre as etapas

```text
1. contrato do catálogo + migration
            │
            ├── 2. contratos HTTP e admin
            │
            └── 3. leitura no funil
                       │
                       ▼
              4. snapshot da cobrança
                       │
                       ▼
              5. concessão no members
                       │
              ┌────────┴────────┐
              ▼                 ▼
       6. oferta/cupom     7. UI de validade
              │                 │
              └────────┬────────┘
                       ▼
               8. copy e checkout
                       │
                       ▼
               9. mensagens e dados
                       │
                       ▼
              10. homologação e virada
```

## Etapa 1 — Introduzir a política de acesso no catálogo

### Arquivos

- Criar `packages/catalog/src/domain/offer/access-policy.ts`.
- Alterar `packages/catalog/src/domain/offer/offer.aggregate.ts`.
- Alterar `packages/catalog/src/infrastructure/persistence/drizzle/schema.ts`.
- Alterar `packages/catalog/src/infrastructure/persistence/drizzle/offer.repository.ts`.
- Alterar `packages/catalog/src/application/create-offer/create-offer.service.ts`.
- Alterar `packages/catalog/src/application/update-offer/update-offer.service.ts`.
- Alterar `packages/catalog/tests/unit/offer.aggregate.test.ts`.
- Alterar `packages/catalog/tests/fakes/in-memory.ts`.
- Gerar uma nova migration em
  `packages/catalog/src/infrastructure/persistence/drizzle/migrations/`.

### Contrato

```ts
export const ACCESS_MODES = ['lifetime', 'fixed', 'billing_cycle'] as const
export type AccessMode = (typeof ACCESS_MODES)[number]

export const ACCESS_DURATION_UNITS = ['days', 'months'] as const
export type AccessDurationUnit = (typeof ACCESS_DURATION_UNITS)[number]

export interface OfferAccessPolicy {
  accessMode: AccessMode
  accessDurationValue: number | null
  accessDurationUnit: AccessDurationUnit | null
}
```

Adicionar esses três campos a `OfferSnapshot`, `OfferProps`, `CreateOfferInput` e
`UpdateOfferDetails`. Não guardar a política dentro de `metadata`; ela é uma regra
comercial de primeira classe e precisa de validação e consulta tipadas.

### Invariantes a testar primeiro

1. `one_time + lifetime + null + null` é válido.
2. `one_time + fixed + 30 + days` é válido.
3. `one_time + fixed + 12 + months` é válido.
4. `fixed` sem valor ou unidade não pode ser ativado.
5. valor zero, negativo ou fracionário é inválido.
6. `subscription + billing_cycle` é válido quando há intervalo de cobrança.
7. `subscription + lifetime/fixed` é inválido.
8. `one_time + billing_cycle` é inválido.
9. trocar uma oferta de assinatura para compra única normaliza o intervalo, mas não
   escolhe silenciosamente entre vitalício e prazo fixo.
10. a ida e volta pelo repositório preserva os três campos.

### Migration em duas fases

A migration deve:

1. criar enums ou checks para `access_mode` e `access_duration_unit`;
2. adicionar as três colunas inicialmente anuláveis;
3. preencher `lifetime` em ofertas `one_time` existentes;
4. preencher `billing_cycle` em ofertas `subscription` existentes;
5. validar que nenhuma linha ficou sem modo;
6. tornar `access_mode` obrigatório;
7. adicionar check de coerência entre modo, valor, unidade e `pricing_mode`.

A migration não toca tabelas do members. A prova de compatibilidade é um teste de SQL
ou integração que semeia uma oferta antiga e confirma o backfill como vitalício.

### Verificação da etapa

```powershell
bun --cwd packages/catalog test tests/unit/offer.aggregate.test.ts
bun --cwd packages/catalog run typecheck
bun --cwd packages/catalog run check
```

Commit sugerido: `feat(catalog): add per-offer access policies`.

## Etapa 2 — Expor e administrar a política de acesso

### Arquivos do catálogo

- `packages/catalog/src/interfaces/http/dtos.ts`
- `packages/catalog/src/application/mappers/offer-view.ts`
- `packages/catalog/src/application/mappers/quote-view.ts`
- `packages/catalog/src/application/mappers/entitlement-view.ts`
- `packages/catalog/src/application/resolve-offer-entitlements/resolve-offer-entitlements.service.ts`
- `packages/catalog/tests/integration/server.test.ts`
- `packages/catalog/tests/application/resolve-offer-entitlements.test.ts`

`GET /catalog/offers/:ref`, a cotação e a resolução de entitlements devem devolver a
mesma política normalizada. O endpoint de entitlements precisa expô-la no nível da
oferta, uma única vez, não repetir por item.

### Arquivos do admin

- `packages/admin/src/server/catalog.ts`
- `packages/admin/src/app/admin/catalogo/ofertas/offers-client.tsx`
- Criar `packages/admin/tests/catalog-offer-access-policy.test.tsx`.

### Comportamento do formulário

- Compra única mostra as opções “Vitalício” e “Prazo fixo”.
- “Vitalício” limpa valor e unidade depois de confirmação.
- “Prazo fixo” exige valor inteiro e unidade “dias” ou “meses”.
- Assinatura mostra “Enquanto a assinatura estiver ativa” como valor fixo e não
  editável.
- A listagem resume preço e acesso na mesma linha.
- O formulário impede ativação incoerente, e o backend repete a validação.
- Ao editar uma oferta existente, o formulário carrega a política exata; nunca assume
  que toda compra única nova deve ser temporária.

### Testes

- payload de criação vitalícia;
- payload de criação por 30 dias;
- edição de prazo sem mudar preço;
- edição de preço sem mudar política;
- alternância controlada entre compra única e assinatura;
- mensagens de erro associadas ao campo correto;
- renderização de “vitalício”, “30 dias” e “assinatura”.

### Verificação da etapa

```powershell
bun --cwd packages/catalog test
bun --cwd packages/admin test packages/admin/tests/catalog-offer-access-policy.test.tsx
bun --cwd packages/admin run typecheck
bun --cwd packages/admin run check
```

Commit sugerido: `feat(admin): manage lifetime and fixed offer access`.

## Etapa 3 — Consumir a política no funil

### Arquivos

- `packages/funnel/src/lib/gateway-client.ts`
- `packages/funnel/src/server/catalog.ts`
- `packages/funnel/src/server/offer.ts`
- `packages/funnel/tests/fakes/fake-gateway.ts`
- `packages/funnel/tests/unit/gateway-client.test.ts`
- `packages/funnel/tests/unit/offer.test.ts`
- `packages/funnel/tests/unit/catalog-cache.test.ts`

### Regras

- Validar a política retornada pelo catálogo na borda do funil.
- Ofertas antigas sem o campo só podem usar fallback durante a janela de implantação:
  `subscription → billing_cycle`, `one_time → lifetime`.
- Registrar um warning estruturado sempre que o fallback legado for usado.
- Remover o fallback em uma entrega posterior, depois de confirmar o backfill em
  produção.
- O cache de aproximadamente 60 segundos continua valendo; preço e política devem vir
  do mesmo objeto em cache para evitar combinações de versões diferentes.

### Testes

- parse dos três modos;
- rejeição de combinações incoerentes;
- fallback de resposta legada;
- cache invalida preço e política juntos;
- oferta pausada continua indisponível.

### Verificação da etapa

```powershell
bun --cwd packages/funnel test tests/unit/gateway-client.test.ts tests/unit/offer.test.ts tests/unit/catalog-cache.test.ts
bun --cwd packages/funnel run typecheck
```

Commit sugerido: `feat(funnel): read offer access policy`.

## Etapa 4 — Congelar o contrato na cobrança

### Arquivos

- Criar `packages/funnel/src/server/purchased-offer-snapshot.ts`.
- Alterar `packages/funnel/src/db/schema.ts`.
- Alterar `packages/funnel/src/db/repo.ts`.
- Alterar `packages/funnel/src/db/migrations/` com uma migration gerada.
- Alterar `packages/funnel/src/server/checkout.ts`.
- Alterar `packages/funnel/src/server/payment-context.ts`.
- Alterar `packages/funnel/tests/fakes/fake-db.ts`.
- Alterar `packages/funnel/tests/integration/api-checkout.test.ts`.
- Alterar `packages/funnel/tests/integration/api-subscription.test.ts`.
- Alterar `packages/funnel/tests/integration/api-webhook.test.ts`.

### Persistência

Adicionar `offer_snapshot jsonb` a `funil.lead_payments`. O JSON deve ter uma versão
explícita e os campos aprovados no design:

```ts
interface PurchasedOfferSnapshotV1 {
  version: 1
  offerId: string
  offerSlug: string
  pricingMode: 'one_time' | 'subscription'
  billingIntervalMonths: number | null
  accessMode: 'lifetime' | 'fixed' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
  listPriceCents: number
  couponCode: string | null
  discountCents: number
  chargedPriceCents: number
  currency: 'BRL'
  guaranteeDays: number | null
  termsVersion: string
}
```

Manter `access_period_months` durante a compatibilidade com cobranças antigas. Novas
cobranças escrevem o snapshot completo; leitores preferem `offer_snapshot` e usam a
coluna antiga apenas quando o JSON não existe.

### Pontos críticos

- O snapshot nasce depois da cotação autoritativa e antes de criar a cobrança.
- Pix, cartão e boleto gravam exatamente a mesma estrutura.
- Uma nova tentativa cria outro `payment_id` e outro snapshot.
- Pagar um boleto antigo usa o snapshot daquele boleto, mesmo que o lead tenha gerado um
  Pix mais novo ou a oferta tenha sido editada.
- A reentrega do webhook usa o mesmo snapshot.
- `termsVersion` deve apontar para uma versão estável dos termos exibidos no checkout.

### Testes obrigatórios

1. oferta de 30 dias gera snapshot `fixed/30/days`;
2. oferta vitalícia gera `lifetime/null/null`;
3. assinatura gera `billing_cycle`;
4. cupom armazena preço de lista, desconto e total;
5. re-cotação sem cupom não muda uma cobrança antiga;
6. editar a oferta depois de criar boleto não muda o contrato do boleto pago;
7. linha legada com `accessPeriodMonths = 12` continua concedendo 12 meses;
8. snapshot malformado falha de forma retryável, sem conceder acesso errado.

### Verificação da etapa

```powershell
bun --cwd packages/funnel test tests/integration/api-checkout.test.ts
bun --cwd packages/funnel test tests/integration/api-subscription.test.ts
bun --cwd packages/funnel test tests/integration/api-webhook.test.ts
bun --cwd packages/funnel run typecheck
```

Commit sugerido: `feat(funnel): freeze purchased offer access terms`.

## Etapa 5 — Conceder prazo fixo no members

### Arquivos

- `packages/funnel/src/server/members-grant.ts`
- `packages/funnel/src/lib/gateway-client.ts`
- `packages/members/src/interfaces/http/dtos.ts`
- `packages/members/src/interfaces/http/routes/webhooks.routes.ts`
- `packages/members/src/application/grant-entitlement/grant-entitlement.service.ts`
- `packages/members/src/domain/entitlement/entitlement-snapshot.ts`
- `packages/members/tests/application/grant.test.ts`
- `packages/members/tests/integration/access.test.ts`
- `packages/members/tests/integration/access-check.test.ts`
- `packages/members/tests/integration/http.test.ts`
- `packages/funnel/tests/integration/api-subscription.test.ts`

O API Gateway apenas repassa o webhook assinado; seu contrato de rota e seus testes de
proxy não precisam mudar se o corpo continuar transparente.

### Novo corpo de concessão

Adicionar um campo opcional, para compatibilidade:

```ts
accessPolicy?: {
  mode: 'lifetime' | 'fixed' | 'billing_cycle'
  durationValue: number | null
  durationUnit: 'days' | 'months' | null
}
```

Manter `accessPeriodMonths` temporariamente para eventos antigos. A resolução segue esta
ordem:

1. usar `accessPolicy` quando presente;
2. se houver `subscription`, tratar como `billing_cycle`;
3. se houver `accessPeriodMonths`, tratar como `fixed/months` legado;
4. caso contrário, tratar como `lifetime` legado.

### Cálculo

- `fixed/days`: somar `durationValue × 86.400.000` ao instante de aprovação;
- `fixed/months`: usar o cálculo UTC de mês-calendário existente;
- `lifetime`: `expiresAt = null`;
- `billing_cycle`: usar intervalo da assinatura e carência configurada;
- não aplicar carência de assinatura a uma compra única de prazo fixo.

Criar funções separadas e testáveis para prazo fixo e assinatura. Não ampliar
`computeExpiry` até o nome esconder duas regras diferentes.

### Snapshot da matrícula

Adicionar a política comprada a `EntitlementSnapshot`. Isso dá suporte e auditoria sem
mudar as colunas que autorizam o acesso. Snapshots antigos permanecem válidos porque o
campo novo é opcional na leitura.

### Casos de teste

- 16/09/2026 15:00 UTC + 30 dias = 16/10/2026 15:00 UTC;
- dia/mês atravessando horário de verão não muda a duração em UTC;
- 31 de janeiro + 1 mês mantém a regra de fim de mês existente;
- assinatura continua recebendo carência;
- vitalício continua com `expiresAt = null`;
- pagamento repetido não duplica nem estende;
- compra de 30 dias não encurta uma matrícula vitalícia;
- chave-mestra Kids ativa continua autorizando o curso depois que a matrícula temporária
  expira;
- política incoerente retorna 422 antes de qualquer escrita;
- expiração preserva progresso e projetos.

### Verificação da etapa

```powershell
bun --cwd packages/members test tests/application/grant.test.ts
bun --cwd packages/members test tests/integration/access.test.ts tests/integration/access-check.test.ts tests/integration/http.test.ts
bun --cwd packages/members test tests/db/expire-lapsed.test.ts
bun --cwd packages/members run typecheck
bun --cwd packages/members run check
```

Commit sugerido: `feat(members): grant fixed-duration offer access`.

## Etapa 6 — Criar a nova oferta e preservar a vitalícia

### Arquivos

- `packages/catalog/scripts/seed.ts`
- `packages/catalog/tests/integration/server.test.ts`
- Configuração de ambiente que resolve
  `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO` no ambiente de homologação e produção.

### Seed

Manter a oferta atual:

```text
slug: desafio-primeiro-jogo
accessMode: lifetime
```

Criar a nova oferta inicialmente em rascunho:

```text
slug: desafio-primeiro-jogo-30-dias
priceCents: 6700
pricingMode: one_time
accessMode: fixed
accessDurationValue: 30
accessDurationUnit: days
guaranteeDays: 7
content.allowsCoupon: true
```

Não mudar `SCHOLARSHIP_OFFER_SLUG` nem a copy da bolsa de embaixadores nesta entrega. O
fluxo atual concede a oferta vitalícia antiga e continua coerente. Uma decisão comercial
futura pode mover bolsas para outra oferta; ela não deve acontecer por efeito colateral
da virada do funil público.

### Cupom de homologação

Criar pelo admin, sem fixar no seed de produção:

```text
code: HOMOLOGA-DPJ37
type: fixed_amount
amountOffCents: 3000
appliesToAll: false
offer: desafio-primeiro-jogo-30-dias
maxRedemptions: pequeno
validUntil: curto
```

### Proteção operacional

- deixar a nova oferta em rascunho até a Etapa 10;
- manter a oferta antiga cadastrada;
- não reutilizar slug;
- documentar no admin que a oferta antiga sustenta compradores e bolsas vitalícias;
- não pausar a antiga enquanto o fluxo de bolsas depender de oferta ativa.

Commit sugerido: `feat(catalog): seed 30-day first-game offer`.

## Etapa 7 — Mostrar validade na experiência do aluno

### Arquivos

- `packages/members/src/application/mappers/views.ts`
- `packages/members/src/application/list-my-courses/list-my-courses.service.ts`
- Criar `packages/members/tests/application/list-my-courses.test.ts`.
- `packages/member-shell/src/lib/types.ts`
- `packages/community-kids/src/components/kids/course-card.tsx`
- `packages/community-kids/src/components/kids/catalog-course-card.tsx`
- `packages/community-kids/src/app/(app)/cursos/[slug]/page.tsx`
- Testes correspondentes em `packages/members/tests/`,
  `packages/member-shell/tests/` e `packages/community-kids/tests/`.

### Contrato de leitura

O members já devolve `expiresAt` no resumo de acesso. Garantir que `ListMyCoursesService`
associe ao curso o entitlement efetivo mais forte:

- vitalício vence qualquer prazo;
- entre prazos, vence a data mais distante;
- a chave-mestra Kids participa da mesma decisão.

Não expor o nome interno do modo se a interface só precisa de `expiresAt`; `null`
continua significando acesso sem data final para a UI.

### Interface

- Curso temporário: “Acesso até 16/10/2026”.
- Janela de 7 dias: “Faltam 7 dias”.
- Janela de 3 dias: “Faltam 3 dias”.
- Vitalício: não mostrar prazo nem contagem.
- Comunidade ativa: não mostrar o vencimento da matrícula avulsa se o acesso efetivo
  vier da chave-mestra.
- Estado expirado não aparece em “Meus cursos”; uma rota de retorno da compra ou mensagem
  pode mostrar a explicação e o link da Comunidade.

Usar datas absolutas como informação principal. A contagem relativa serve apenas como
apoio nas janelas definidas.

### Testes

- renderização de vitalício sem prazo;
- renderização de 30 dias com data em `pt-BR`;
- limite exato de 7 e 3 dias;
- entitlement mais forte selecionado;
- acessibilidade do texto de validade;
- largura de 390 px sem quebrar o card.

### Verificação da etapa

```powershell
bun --cwd packages/members test tests/application/list-my-courses.test.ts
bun --cwd packages/member-shell run typecheck
bun --cwd packages/member-shell run check
bun --cwd packages/community-kids test
bun --cwd packages/community-kids run typecheck
bun --cwd packages/community-kids run check
```

Commit sugerido: `feat(kids): show effective course access expiry`.

## Etapa 8 — Reescrever o funil e aplicar o cupom de evento

### Arquivos de conteúdo

- `packages/funnel/src/funnels/desafio-primeiro-jogo/content.ts`
- `packages/funnel/src/funnels/desafio-primeiro-jogo/index.ts`
- `packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro`
- `packages/funnel/src/content/legal-kids.ts`
- `packages/funnel/src/components/Footer.astro`, somente se o contrato genérico de prazo
  precisar ser exibido no rodapé.

### Arquivos de cotação e checkout

- `packages/funnel/src/pages/[audience]/[produto]/oferta.astro`
- `packages/funnel/src/pages/[audience]/[produto]/checkout.astro`
- `packages/funnel/src/pages/[audience]/[produto]/obrigado.astro`
- `packages/funnel/src/islands/CheckoutForm.tsx`
- `packages/funnel/src/pages/api/checkout/quote.ts`
- `packages/funnel/src/server/catalog.ts`
- `packages/funnel/src/server/checkout.ts`
- `packages/funnel/src/lib/checkout-schema.ts`

### Copy

Aplicar o texto integral do design. Pontos de busca obrigatórios no final:

- remover todo “acesso vitalício” das páginas da nova oferta;
- remover o comparativo hardcoded “de R$ 97” do Desafio;
- trocar o eixo “tela boa” por “uma parte do tempo existente vira criação”;
- repetir R$ 67, 30 dias e garantia de 7 dias nos pontos de decisão;
- manter “cinco dias” como sequência pedagógica, nunca como duração contratual;
- preservar depoimentos somente após validar origem e autorização.

Alterar `lifetimeAccess` do funil do Desafio para `false`. Se esse booleano ficar
semanticamente insuficiente, substituí-lo por um descritor de acesso tipado no registro
dos funis, sem quebrar a Comunidade ou o funil adulto.

### Cupom vindo do QR Code

Aceitar `?cupom=CODIGO` e o alias técnico atual, caso seja `coupon`. Normalizar para um
único valor interno. O fluxo deve:

1. validar no servidor;
2. mostrar a faixa do evento e o total de R$ 37 na oferta;
3. levar o código ao checkout sem depender apenas de estado React;
4. preencher o campo e cotar novamente no checkout;
5. preservar o código após login, volta, erro e troca de meio de pagamento;
6. bloquear a submissão se a página apresenta desconto que o servidor não confirmou.

Quando o cupom falhar, oferecer um botão explícito “Continuar por R$ 67 sem cupom”. Não
remover o desconto e cobrar o total público na mesma ação.

### Checkout e obrigado

- Mostrar `listPrice`, desconto, total, 30 dias e ausência de renovação.
- Calcular e mostrar a data final estimada com a ressalva “a partir da aprovação”.
- Depois da aprovação, usar o `paidAt` real e mostrar a data exata.
- A página de obrigado não afirma que boleto pendente já iniciou o prazo.
- O consentimento registra a versão dos termos usada no snapshot.

### Testes

- `packages/funnel/tests/unit/copy-vocabulario.test.ts`:
  bloquear “acesso vitalício” no novo funil e preservar a regra de comunicação aos pais;
- `packages/funnel/tests/unit/desafio-quiz.test.ts`:
  validar perguntas, perfis e placeholders;
- novo `packages/funnel/tests/unit/desafio-offer-copy.test.ts`:
  verificar frase central, preço, duração e ausência de promessas proibidas;
- `packages/funnel/tests/integration/api-checkout.test.ts`:
  QR com cupom, inválido, expirado, esgotado, remoção explícita e todos os meios;
- teste de renderização para oferta, checkout e obrigado.

### Verificação da etapa

```powershell
bun --cwd packages/funnel test tests/unit/copy-vocabulario.test.ts tests/unit/desafio-quiz.test.ts tests/unit/desafio-offer-copy.test.ts
bun --cwd packages/funnel test tests/integration/api-checkout.test.ts
bun --cwd packages/funnel run typecheck
bun --cwd packages/funnel run check
bun --cwd packages/funnel run build
```

Fazer conferência visual em 390, 768 e 1366 px, com e sem cupom, e com textos longos de
erro. Verificar foco de teclado, anúncio do desconto e contraste.

Commit sugerido: `feat(funnel): reposition first-game challenge offer`.

## Etapa 9 — Mensagens de ativação e vencimento

Essa etapa deve ser entregue em duas fatias. A primeira é bloqueadora para a virada; a
segunda depende da atribuição segura do progresso dos perfis infantis à conta compradora.

### Fatia A — bloqueadora

#### Arquivos

- `packages/funnel/src/server/welcome-email.ts`
- `packages/funnel/tests/unit/welcome-email.test.ts`
- `packages/messaging/scripts/seed-templates.ts`
- `packages/members/src/application/renewal-reminder/send-renewal-reminders.service.ts`
- `packages/members/src/domain/ports/renewal-reminder-repository.port.ts`
- `packages/members/src/infrastructure/persistence/drizzle/renewal-reminder.repository.ts`
- `packages/members/src/composition-root.ts`
- testes unitários e de repositório correspondentes.

#### Comportamento

- O welcome específico do Desafio recebe e mostra `expiresAt`.
- O lembrete genérico de renovação anual não é enviado ao Desafio.
- Uma política `fixed/days` do Desafio usa templates próprios de 7 dias, 3 dias e
  expiração, com CTA para retomar ou conhecer a Comunidade.
- Uma política `fixed/months` de plano anual mantém o template de renovação existente.
- A consulta exclui quem tem entitlement mais forte para o mesmo curso.

Para permitir mais de um aviso por vencimento, criar uma tabela específica, por exemplo
`members.entitlement_lifecycle_messages_sent`, com chave:

```text
entitlement_id + expires_on + message_kind
```

Não sobrecarregar a chave atual de `renewal_reminders_sent`, que só comporta um envio por
data e sustenta o plano anual.

#### Testes

- 7 dias e 3 dias enviados uma vez;
- expiração enviada uma vez depois do sweep;
- vitalício ignorado;
- assinatura e chave-mestra mais forte impedem mensagem indevida;
- grupo de itens da mesma compra gera um contato;
- falha antes da marca permite retry;
- dedupe do messaging absorve crash entre envio e marcação.

### Fatia B — automação comportamental

Criar um serviço de ciclo de ativação que consulte compra, conta, perfil e progresso:

- 24 horas sem conta ativada;
- 48 horas com conta, mas sem início do Dia 1;
- continuação após o Dia 1;
- conclusão do curso.

Antes de implementar, provar com teste qual perfil infantil pertence à conta compradora.
Não inferir isso por e-mail ou pelo último perfil criado. A consulta deve usar as relações
de conta já existentes no auth/members.

Arquivos novos sugeridos:

- `packages/members/src/application/challenge-lifecycle/send-challenge-lifecycle.service.ts`
- `packages/members/src/domain/ports/challenge-lifecycle-repository.port.ts`
- `packages/members/src/infrastructure/persistence/drizzle/challenge-lifecycle.repository.ts`
- testes em `packages/members/tests/application/` e `packages/members/tests/db/`.

Templates:

- `challenge-access-approved`;
- `challenge-not-activated`;
- `challenge-not-started`;
- `challenge-day-one-complete`;
- `challenge-expiry-7d`;
- `challenge-expiry-3d`;
- `challenge-completed`;
- `challenge-expired`.

### Verificação da etapa

```powershell
bun --cwd packages/messaging test
bun --cwd packages/messaging run typecheck
bun --cwd packages/members test tests/db/renewal-reminder.repository.test.ts
bun --cwd packages/members test
bun --cwd packages/members run typecheck
```

Commit sugerido para a Fatia A: `feat(members): send fixed-access lifecycle reminders`.

Commit sugerido para a Fatia B: `feat(members): automate challenge activation messages`.

## Etapa 10 — Atribuição, métricas e relatório de evento

### Arquivos

- `packages/funnel/src/db/schema.ts`
- `packages/funnel/src/db/repo.ts`
- nova migration em `packages/funnel/src/db/migrations/`
- `packages/funnel/src/server/leads.ts`
- páginas do funil que iniciam ou atualizam o lead;
- `packages/funnel/src/server/admin.ts`
- `packages/funnel/src/islands/admin/RespostasTable.tsx`
- testes de leads, checkout e admin.

### Persistência

Adicionar ao lead uma atribuição tipada, preferencialmente um JSON versionado, com:

```text
utm_source
utm_medium
utm_campaign
utm_content
event_code
initial_coupon_code
landing_path
```

Capturar somente valores com tamanho limitado e sem dados pessoais. A primeira origem é
imutável; uma origem posterior pode ser guardada separadamente como “último toque” se
isso já fizer parte do modelo de analytics. Não sobrescrever a origem inicial em cada
navegação.

### Eventos

Normalizar os nomes aprovados no design e anexar `offer_slug`, `coupon_code` e
`event_code` no servidor. Eventos de pagamento vêm do resultado confirmado, não do
clique no botão.

### Relatório mínimo

Filtrar por `event_code` e mostrar:

- leads/visitas;
- quiz concluído;
- oferta vista;
- checkout iniciado;
- pagamento aprovado;
- conta ativada;
- início do Desafio;
- conclusão;
- assinatura posterior da Comunidade.

Se “início”, “conclusão” e “assinatura posterior” exigirem uma consulta entre serviços,
publicar primeiro os eventos com identificadores não pessoais e montar a agregação no
admin. Não copiar dados pedagógicos detalhados para o funil.

### Testes

- sanitização e limites das UTMs;
- first-touch não sobrescrito;
- cupom e evento persistem até o pagamento;
- agregações não contam o mesmo lead duas vezes;
- pagamento aprovado usa cobrança real;
- relatório separa R$ 67 de R$ 37;
- nenhuma coluna ou exportação expõe CPF nos dados do evento.

Commit sugerido: `feat(funnel): attribute challenge event conversions`.

## Etapa 11 — Documentação operacional

### Arquivos

- `docs/catalogo-e-entitlements.md`
- Criar `docs/runbooks/desafio-primeiro-jogo-eventos.md` se `docs/runbooks` for o local
  adotado pelo repositório; caso contrário, manter o runbook em `docs/`.
- Atualizar `packages/catalog/CLAUDE.md`, `packages/funnel/CLAUDE.md` e
  `packages/members/CLAUDE.md` somente nos contratos que realmente mudaram.

### Mudanças no manual

Substituir “compra única é vitalícia” por:

```text
Compra única pode ser vitalícia ou ter prazo fixo definido na oferta.
Assinatura vale enquanto os ciclos pagos mantiverem o acesso ativo.
```

Documentar:

- edição de preço afeta novas compras, não contratos existentes;
- edição de duração afeta novas compras, não matrículas existentes;
- vitalício continua disponível;
- como criar cupom por evento;
- como montar o QR com UTMs;
- como encerrar ou ampliar a validade;
- procedimento manual de reembolso + revogação enquanto não houver automação;
- como verificar se um usuário possui acesso mais forte pela Comunidade.

### Checklist de um evento

1. Criar código sem nome de pessoa.
2. Restringir à oferta de 30 dias.
3. Definir R$ 30 de desconto, validade e limite.
4. Gerar link e QR.
5. Abrir em janela anônima.
6. Confirmar R$ 67 − R$ 30 = R$ 37 na oferta e no checkout.
7. Fazer uma compra de teste autorizada.
8. Confirmar `expiresAt`, welcome e atribuição.
9. Pausar o cupom depois do prazo se necessário.
10. Exportar o relatório do evento.

Commit sugerido: `docs: explain fixed access and event coupons`.

## Etapa 12 — Homologação e virada

### Matriz de homologação

| Cenário | Meio | Cupom | Acesso esperado |
| --- | --- | --- | --- |
| Público | Cartão | Não | 30 dias, R$ 67 |
| Evento | Cartão | Sim | 30 dias, R$ 37 |
| Público | Pix | Não | inicia na aprovação, R$ 67 |
| Evento | Pix | Sim | inicia na aprovação, R$ 37 |
| Evento | Boleto | Sim | inicia quando o boleto confirmar, R$ 37 |
| Cupom expirado | Qualquer | Sim | bloqueia até decisão explícita |
| Comprador vitalício | — | — | continua sem data final |
| Assinante da Comunidade | — | — | continua enquanto assinatura ativa |
| Oferta editada após boleto | Boleto | Opcional | usa snapshot do boleto |
| Webhook duplicado | Qualquer | Opcional | uma matrícula, mesma validade |

### Consultas de segurança antes da virada

- contagem de ofertas por política;
- zero ofertas com combinação incoerente;
- todas as ofertas antigas `one_time` classificadas como `lifetime`;
- todas as assinaturas classificadas como `billing_cycle`;
- zero matrículas antigas alteradas pela migration;
- nova oferta ativa e cotável por R$ 67;
- cupom de produção restrito à oferta correta;
- env do funil ainda aponta para a antiga até a aprovação final.

### Virada

1. Implantar catálogo e migration.
2. Confirmar backfill.
3. Implantar consumers compatíveis.
4. Implantar admin e funil.
5. Executar compra real de baixo risco em homologação.
6. Ativar `desafio-primeiro-jogo-30-dias`.
7. Trocar `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO` para o novo slug.
8. Reiniciar somente o host que lê essa env.
9. Aguardar o cache de oferta e confirmar a página pública.
10. Preservar a oferta vitalícia antiga e o fluxo de bolsas.
11. Monitorar erros, pagamentos sem grant, cupons e ativação.

### Rollback

- Pausar a oferta nova para bloquear cobranças adicionais.
- Restaurar a env para `desafio-primeiro-jogo` somente se a decisão comercial for voltar
  temporariamente ao contrato vitalício.
- Não apagar snapshots, pagamentos ou entitlements de 30 dias já concedidos.
- Não reclassificar compradores da nova oferta como vitalícios.
- Investigar a causa antes de reabrir.

## Verificação final

Executar com evidência fresca:

```powershell
bun --cwd packages/catalog test
bun --cwd packages/catalog run typecheck
bun --cwd packages/catalog run check

bun --cwd packages/funnel test
bun --cwd packages/funnel run typecheck
bun --cwd packages/funnel run check
bun --cwd packages/funnel run build

bun --cwd packages/members test
bun --cwd packages/members run typecheck
bun --cwd packages/members run check

bun --cwd packages/admin test
bun --cwd packages/admin run typecheck
bun --cwd packages/admin run check
bun --cwd packages/admin run build

bun --cwd packages/community-kids test
bun --cwd packages/community-kids run typecheck
bun --cwd packages/community-kids run check
bun --cwd packages/community-kids run build

bun --cwd packages/messaging test
bun --cwd packages/messaging run typecheck
```

Também executar:

- `git diff --check` apenas nos arquivos da entrega;
- migrations em banco descartável desde uma versão anterior;
- inspeção visual em desktop e celular;
- compra ponta a ponta com os três meios suportados;
- verificação de logs sem CPF, e-mail, telefone ou documento;
- consulta pós-compra que prove preço, cupom, snapshot, `paidAt`, `expiresAt` e
  idempotência.

## Definição de pronto

A entrega só está pronta quando:

- o modo vitalício continua criável, editável, concedível e testado;
- nenhum comprador antigo mudou de acesso;
- a oferta nova concede 30 dias exatos a partir da aprovação;
- preço e duração vêm do snapshot da cobrança;
- cupom de evento mostra e cobra R$ 37 de forma consistente;
- a oferta pública, o checkout e a área de membros mostram a mesma regra;
- o assinante da Comunidade não perde acesso por causa da matrícula temporária;
- o funil não contém promessa de acesso vitalício ou de benefício clínico na nova oferta;
- suporte dispõe de um runbook para cupom, reembolso, expiração e acesso sobreposto;
- existe um rollback que não reescreve contratos já vendidos.
