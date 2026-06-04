# @sistemazero/funnel

Funil de vendas do produto **No Comando da IA** (ebook, R$ 37): quiz de 10 perguntas (em `/quiz`;
`/` redireciona) → resultado personalizado → página de vendas → modal de pré-checkout →
checkout (**Pix, cartão e boleto**) → painel admin (login via auth/IdP).

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

1. Copie `.env.example` → `.env` e preencha. O Postgres é o **banco compartilhado**
   do monorepo (`localhost:5433/sistemazero`); este package cria/usa o schema `funil`.
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
5. Para o e-mail de boas-vindas pós-compra (link de definir senha no app do aluno),
   configure `COMMUNITY_URL` (default `http://localhost:3007`) — e, no gateway/auth,
   `AUTH_HMAC_SECRET`/`AUTH_INTERNAL_TOKEN` (ver os `.env.example` de lá).
6. Suba os serviços (da raiz). **Tudo de uma vez:** `bun run dev:up` (orquestrador — sobe
   gateway/payments/auth/catalog/members/messaging/funnel/admin/community em background;
   `dev:down`/`dev:status` para parar/inspecionar). Ou individualmente: `bun run dev:payments`
   (:3001), `bun run dev:gateway` (:3000), `bun run dev:auth` (:3002), `bun run dev:catalog`
   (:3003), `bun run dev:members` (:3004), `bun run dev:funnel` (:4321).

## Admin (`/admin`)

Login com **usuário real do auth (IdP)** em `/admin/login` (e-mail + senha), via gateway. Só contas
com papel `admin`/`superadmin` e status `active` entram. A sessão é o JWT do auth em cookies HttpOnly
(`admin_access`/`admin_refresh`), validada a cada request em `/auth/me`; o funil **não** guarda
credencial. Crie o admin no auth:

```bash
bun run --filter @sistemazero/auth db:seed --email voce@exemplo.com --password "senha-forte" --role admin
```

`/admin` sem sessão redireciona p/ o login; o botão "Sair" revoga o refresh no auth e encerra a sessão.
Garanta HTTPS em produção (os cookies vão com `Secure`).

## Imagens

Todas as imagens vivem em `public/img/` e são referenciadas por URL (o build nunca quebra
se faltarem — o `ImageSlot` mostra um placeholder com a legenda até o arquivo existir).
Desde o redesign da oferta (jun/2026) todos os arquivos abaixo estão versionados no repo
(WebP otimizado, ≤1600px de largura, gerados com sharp a partir do design):

| Arquivo (`public/img/…`) | Onde aparece |
|---|---|
| `q1-card-a.jpg` | Quiz P1, opção A (criador, notebook) |
| `q1-card-b.jpg` | Quiz P1, opção B (empreendedora) |
| `q1-card-c.jpg` | Quiz P1, opção C (dono de pequeno negócio) |
| `q1-card-d.jpg` | Quiz P1, opção D (profissional de marketing) |
| `sales-hero.webp` | Oferta, hero |
| `recebe-ebook-kit.webp` | Oferta, "O que você recebe" (ebook + kit) |
| `recebe-anexos.webp` | Oferta, "O que você recebe" (anexos do kit) |
| `bonus-1.webp` | Oferta, card do Bônus 1 (mini-glossário) |
| `bonus-2.webp` | Oferta, card do Bônus 2 (10 sinais) |
| `quem-criou.webp` | Oferta, "Quem criou" (foto da Helena e do Júlio) |
| `print-agenda-da-turma.webp` | Oferta, "Quem criou" (Agenda da Turma) |
| `print-cozya.webp` | Oferta, "Quem criou" (Cozya) |
| `produto-capa.webp` | Checkout, miniatura da capa do ebook |
| `logo-sistema-zero.svg` | Rodapé (logo, copiado do admin) |

Para trocar uma imagem, basta substituir o arquivo mantendo o nome (e o aspecto:
hero/recebe/quem-criou são 16:9, bônus/prints são 4:3, capa é retrato A4).
Os favicons (`favicon.ico` + PNGs 16/32 + `apple-touch-icon.png`) são os mesmos do admin.

## Cartão e boleto

Os três métodos estão ligados (`/api/checkout/{pix,card,boleto}`):
- **Pix** — QR/copia-e-cola; confirma por polling + webhook.
- **Cartão** — tokenização no browser (`payment-token-efi`,
  `EfiPay.CreditCard…getPaymentToken()` com `PUBLIC_EFI_ACCOUNT_IDENTIFIER`); o server nunca toca
  PAN/CVV. Resposta síncrona (PAID/recusado).
- **Boleto** — código de barras; confirma por webhook (compensação).

O preço é **autoritativo do catálogo**: `/api/checkout/quote` cota a oferta (+ cupom opcional) via
gateway. Após o pagamento, o comprador é registrado no `auth` e recebe a matrícula na **área de
membros** (`grantMembers`, idempotente; o webhook é o backstop durável).
