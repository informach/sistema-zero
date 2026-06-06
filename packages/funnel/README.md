# @sistemazero/funnel

Funil de vendas do produto **No Comando da IA** (ebook, R$ 37): quiz de 10 perguntas (em `/quiz`;
`/` redireciona) → resultado personalizado → página de vendas → modal de pré-checkout →
checkout estilo Hotmart (**Pix e cartão** na UI; boleto segue disponível só pela API) → painel
admin (login via auth/IdP). Rodapé institucional com links para `/politica-de-privacidade` e
`/termos-de-uso`.

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
| `bun run build` | build (servidor SSR — todas as páginas são on-demand) |
| `bun run start` | sobe o build via `scripts/start.mjs` (Sentry no boot + graceful shutdown no SIGTERM) |
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

> **Sem SSO com o painel `admin` (3005):** são apps separados (cookies `admin_*` aqui vs. `sz_admin_*`
> lá e, em prod, domínios diferentes) — logar num não loga no outro; cada um autentica no mesmo IdP.

O painel usa o tema e os componentes compartilhados do **`@sistemazero/ui`** + o logo do sistema-zero
(`public/logo_dark.svg`), no mesmo visual do pacote `admin`. Duas abas: **Respostas** (tabela de leads —
clique numa linha abre o detalhe com as 16 respostas; no mobile vira cards) e **Performance** (conversão
por etapa). A aba Respostas **pagina no servidor** com busca por nome/e-mail e ordenação por data
(`GET /api/admin/leads?limit&offset&q&sort` → `{ leads, total, limit, offset }`), então escala para muitos
leads sem carregar tudo de uma vez.

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

## Checkout (Pix e cartão)

O checkout (estilo Hotmart) exige os **Dados pessoais** (e-mail + confirmação + nome + CPF) antes
de qualquer cobrança — eles vão no corpo de `/api/checkout/{pix,card}`, atualizam o lead e viram o
`customer` da cobrança. Os três métodos seguem ligados na API (`/api/checkout/{pix,card,boleto}`):
- **Pix** — gerado **só por clique** em "Gerar código Pix" (botão desabilitado até os dados
  validarem); o CPF/nome vão como `devedor` da cob na Efí. QR/copia-e-cola; confirma por
  polling + webhook.
- **Cartão** — tokenização no browser (`payment-token-efi`,
  `EfiPay.CreditCard…getPaymentToken()` com `PUBLIC_EFI_ACCOUNT_IDENTIFIER`); o server nunca toca
  PAN/CVV; o CPF do titular é o dos Dados pessoais. Resposta síncrona (PAID/recusado).
- **Boleto** — fora da UI; a rota segue funcional (código de barras; confirma por webhook).

O preço é **autoritativo do catálogo**: `/api/checkout/quote` cota a oferta (+ cupom opcional) via
gateway. Após o pagamento, o comprador é registrado no `auth` e recebe a matrícula na **área de
membros** (`grantMembers`, idempotente; o webhook é o backstop durável).

### Testando cartão no sandbox da Efí

Qualquer número **Luhn-válido** funciona; o **último dígito** simula o resultado:

| Final | Resultado | Exemplo (Visa, Luhn-válido) |
|---|---|---|
| 1 | Recusado — "Dados do cartão inválidos" | `4485 7856 0000 0071` |
| 2 | Recusado — "não autorizada por motivos de segurança" | `4485 7856 0000 0022` |
| 3 | Recusado — "tente novamente mais tarde" | `4485 7856 0000 0063` |
| outro | **Aprovado** | `4485 7856 7429 0087` |

Validade: qualquer data futura · CVV: 3 dígitos (4 p/ Amex) · CPF (Dados pessoais): use um
válido, ex. `529.982.247-25`. Exige `PUBLIC_EFI_SANDBOX=true` e adblock desligado (fingerprint
da ClearSale). Pix em sandbox: a cob é criada de verdade, mas o QR não compensa sozinho.
