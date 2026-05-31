# @sistemazero/funnel

Funil de vendas do produto **No Comando da IA** (ebook, R$ 37): landing + quiz de 10 perguntas →
resultado personalizado → página de vendas → modal de pré-checkout → checkout (Pix) → painel admin.

- **Stack**: Astro 6 (`output: server` + `@astrojs/node` standalone, no Bun), ilhas **React 19**
  só onde há interação, **Drizzle + postgres.js** (schema `funil`), **Tailwind CSS v4**, **Zod**.
- **Pagamentos**: o funil **nunca** chama o `payments` direto. O **api-gateway é o BFF**: o funil
  assina por HMAC de borda e chama o gateway, que **re-assina** para o `payments`. Confirmação por
  polling (via gateway) + webhook (`payments → gateway → funil`).
- **Infra**: Postgres único compartilhado (schema por package → aqui `funil`); Redis único
  namespaced (`funil:`), opcional.

## Comandos

| Comando | O quê |
|---|---|
| `bun run dev` | dev server (`:4321`, com watch) |
| `bun run build` | build (páginas de marketing pré-renderizadas + servidor SSR) |
| `bun run start` | sobe o build (`bun ./dist/server/entry.mjs`) |
| `bun run typecheck` | `astro check` |
| `bun test` | testes (`bun:test`) |
| `bun run db:generate` / `db:migrate` | migrations Drizzle (schema `funil`) |
| `bun run check` / `format` / `lint` | Biome |

## Setup local (ponta a ponta com Pix)

1. Copie `.env.example` → `.env` e preencha. O Postgres é o **mesmo** do payments
   (`localhost:5433/payments`); este package cria/usa o schema `funil`.
2. `bun run db:migrate` (cria `funil.leads` e `funil.funnel_events`).
3. No `payments`, cadastre o **gateway** como consumer (o gateway é quem assina p/ o payments):
   ```
   cd ../payments
   bun run db:seed --id gateway --name "API Gateway" \
     --cidrs "127.0.0.1/32,::1/128" \
     --webhook-url http://localhost:3000/webhooks/payments
   ```
   Copie o HMAC secret impresso para `GATEWAY_HMAC_SECRET` no `.env` do **gateway**.
4. Gere `FUNNEL_HMAC_SECRET` e `FUNNEL_INTERNAL_TOKEN` e configure-os **iguais** no `.env` do
   funil e do gateway (o gateway precisa de `consumers[{id:'funnel',hmacSecret:FUNNEL_HMAC_SECRET}]`
   e injeta `FUNNEL_INTERNAL_TOKEN` no webhook).
5. Suba os três: `bun run dev:payments` (:3001), `bun run dev:gateway` (:3000),
   `bun run dev:funnel` (:4321).

## Imagens (fornecidas pelo usuário)

Coloque os arquivos em `public/img/` com estes nomes (referenciados por URL, então o
build nunca quebra se faltarem — aparece um placeholder até você adicioná-los):

| Arquivo (`public/img/…`) | Onde aparece |
|---|---|
| `q1-card-a.webp` | Quiz P1, opção A (criador, notebook) |
| `q1-card-b.webp` | Quiz P1, opção B (empreendedora) |
| `q1-card-c.webp` | Quiz P1, opção C (dono de pequeno negócio) |
| `q1-card-d.webp` | Quiz P1, opção D (profissional de marketing) |
| `sales-hero.webp` | Página de vendas, topo |
| `print-cozya.webp` | Seção "Quem criou" (Cozya) |
| `print-agenda-da-turma.webp` | Seção "Quem criou" (Agenda da Turma) |
| `depoimento-1.webp` | Seção "Quem criou" (depoimento) |

As fotos do quiz (P1) e o hero usam fundo/`<img>` resiliente; os prints de produto e
depoimentos usam o componente `ImageSlot` (placeholder com legenda até o arquivo existir).

## Cartão e boleto (em breve)

A UI já tem as abas, mas o backend (API de **Cobranças** da Efí: OAuth2, `/v1/charge/one-step`,
confirmação por *notification token*) ainda não existe no `payments` — follow-up. A tokenização de
cartão é no browser (`payment-token-efi`, `EfiPay.CreditCard…getPaymentToken()`) usando
`PUBLIC_EFI_ACCOUNT_IDENTIFIER`.
