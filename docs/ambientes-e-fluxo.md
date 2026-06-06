# Ambientes & fluxo de desenvolvimento

> Fonte da verdade operacional de **git → CI → staging → produção**. Atualize este
> documento quando o fluxo ou a topologia mudarem.

## Fluxo de git (desde 06/2026)

A `main` é **protegida por ruleset** no GitHub (`protege-main`): push direto é
rejeitado, force-push e deleção bloqueados, e **todo merge exige PR com o check
`ci` verde** (0 aprovações exigidas — time solo; o GitHub não permite aprovar o
próprio PR). A branch **`staging`** é a integração contínua do dia a dia.

```
feature/minha-coisa          (a partir da staging)
   │  PR → staging           (CI roda no push da staging — canário)
   ▼
staging                      → deploy no AMBIENTE staging do Railway → testar
   │  PR → main              (check `ci` obrigatório no ruleset)
   ▼
main                         → deploy em PRODUÇÃO
```

Regras práticas:

- **Merge de `staging` → `main` SEMPRE com merge commit** (`gh pr merge --merge`).
  Squash faria a staging (branch longa) divergir da main e os commits antigos
  reapareceriam no diff do PR seguinte.
- O CI (`.github/workflows/ci.yml`) roda `biome ci` + `bun test` + `typecheck` de
  **todos** os pacotes (bun 1.3.11) em PR para a main e em push na staging.
  ⚠️ As suítes passam **sem nenhum `.env`** (fakes; `tests/db` do auth se auto-pulam
  sem banco) — teste novo não pode depender de env local.

## Ambientes no Railway (projeto `sistema-zero`)

Dois environments, **Postgres separado em cada um** (1 schema por serviço em ambos):

| | `production` | `staging` |
|---|---|---|
| Código | branch `main` | branch `staging` |
| Postgres | próprio | próprio (isolado; migrations via preDeploy; seed do catálogo idempotente) |
| Efí Pay | **produção** (`EFI_SANDBOX=false`) | **homologação** (`EFI_SANDBOX=true`; payments roda `NODE_ENV=development` — o fail-fast dele recusa sandbox em production) |
| Webhook Pix Efí | registrado p/ `payments-production-…` | registrado p/ `payments-staging-…` (conta sandbox) |
| JWT (auth) | chave RS256 de prod | **chave RS256 própria** (`auth-key-staging-1`) — token de staging NÃO vale em prod |
| R2/Vimeo (admin/community) | buckets `comunidade-sistema-zero[-privado]`, pasta Vimeo de prod | buckets `testes`/`testes-privado`, pasta Vimeo "Testes" |
| SendGrid | chave de prod | chave de dev |
| WhatsApp (Evolution) | instância `principal` pareada | instância `principal` própria, pareada |
| Sentry | ligado (1 projeto por serviço) | **desligado** (`SENTRY_DSN` removido — staging não polui as issues) |

URLs públicas:

| App | Produção | Staging |
|---|---|---|
| Funil (site de vendas) | `https://sistemazero.com.br` (apex — domínio Railway: `funnel-production-5525.up.railway.app`) | `https://funnel-staging-c4a5.up.railway.app` |
| Admin | `https://admin-production-aeb0.up.railway.app` | `https://admin-staging-f8fe.up.railway.app` |
| Área do aluno | `https://comunidade.sistemazero.com.br` | `https://community-staging-66f2.up.railway.app` |
| API Gateway (borda) | `https://api-gateway-production-592a.up.railway.app` | `https://api-gateway-staging-9fa3.up.railway.app` |

> Login no admin/community de **staging**: superadmin próprio (mesmo e-mail de
> prod, senha separada — gerada no setup e entregue fora do repo).

## Deploys

- **Produção**: merge na `main` → o **admin** auto-deploya (trigger armado no
  dashboard); os demais serviços são deployados **manualmente** (GraphQL
  `serviceInstanceDeployV2` com o sha da main, ou dashboard).
- **Staging**: deploy **manual** por sha da branch `staging` (mesma mutation).
  Armar auto-deploy por push da staging é uma decisão pendente (dashboard:
  serviço → Settings → Source → branch `staging`, por serviço).
- ⚠️ Gotcha de build: o Railway **só passa variáveis ao build do Dockerfile quando
  declaradas como `ARG`** (ver o Dockerfile do funnel — envs `PUBLIC_*`/
  `FUNNEL_PUBLIC_URL` são inlined no `astro build`).

## Custo do staging

O staging roda 24/7 (≈ dobra o uso do Railway). O recurso nativo de economia
("Serverless", ex-App Sleeping) adormece um serviço após **10 min sem pacotes de
SAÍDA** — como nossos serviços mantêm pool/polling no Postgres (outbox, workers,
crons de retenção), **eles nunca ficam ociosos nesse critério** e o sleeping não
dispara. Opções reais:

1. Deixar ligado e acompanhar o billing (serviços Bun ociosos consomem pouco CPU;
   o custo dominante é RAM).
2. "Desligar/ligar" manual: remover o deployment ativo de cada serviço de staging
   e redeployar quando for usar (~2 min p/ voltar). Sob demanda — pedir ao agente
   ou fazer no dashboard.

## Smokes rápidos

```bash
# produção
curl https://sistemazero.com.br/readyz            # funil (via domínio apex)
curl https://api-gateway-production-592a.up.railway.app/readyz

# staging
curl https://funnel-staging-c4a5.up.railway.app/readyz
curl https://funnel-staging-c4a5.up.railway.app/oferta | grep '37,00'
```
