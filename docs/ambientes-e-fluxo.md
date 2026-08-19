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
  **todos** os pacotes (bun 1.3.11) e os cenários Playwright focados do Jogo 2D
  e Jogo 2D Avançado em Chromium, em PR para a main e em push na staging.
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
| R2/Vimeo (admin/community) | buckets `comunidade-sistema-zero[-privado|-ugc]`, pasta Vimeo de prod | buckets `testes`/`testes-privado`/`testes-ugc`, pasta Vimeo "Testes" |
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

### Anexos UGC na moderação

O Admin precisa de `R2_UGC_BUCKET` com o mesmo bucket usado pelos apps de comunidade
(`testes-ugc` em dev/staging; `comunidade-sistema-zero-ugc` em produção). A tela de
moderação pede autorização ao Hub e só então gera um GET pré-assinado de curta duração;
`storageRef` nunca chega ao navegador.

No CORS desses dois buckets, mantenha `GET`/`HEAD` liberados para
`http://localhost:3005`, `https://admin-staging-f8fe.up.railway.app`,
`https://admin-production-aeb0.up.railway.app` e `https://admin.sistemazero.com.br`,
além das origens já usadas pelos apps de comunidade. A ordem segura de rollout é:
Hub + migration `0008_moderation_reporter_snapshot`; depois Admin com
`R2_UGC_BUCKET` e o CORS já atualizado.

### Limpeza durável das criações excluídas

O `community-kids` precisa de `CREATION_CLEANUP_CRON_SECRET` (mínimo 24 caracteres) em staging e
produção. Configure um scheduler para fazer `POST /api/internal/creation-cleanups` a cada 5
minutos, com `Authorization: Bearer <segredo>`. A rota reivindica jobs duráveis no Members via
gateway HMAC e remove do `R2_UGC_BUCKET` os blobs de contas excluídas depois de expirarem as URLs
PUT pré-assinadas. Resposta `200 {completed,failed}` é execução normal; `401` indica segredo
divergente, `503` configuração ausente e `502` falha ao reivindicar no upstream.

Ordem de rollout: migration Members `0068_account_deletion_cleanup` → Members → gateway →
community-kids com a env e o scheduler configurados → Admin/Auth. Não publique o novo fluxo de
exclusão antes de a fila e o worker estarem disponíveis.

**O scheduler É o Worker `packages/creation-cleanup-cron`** (Cloudflare, cron `*/5 * * * *`,
publicado 19/08/2026 como `sistemazero-creation-cleanup-cron`): um Worker só, que bate nos DOIS
ambientes em paralelo com o segredo de cada um em Secret do Worker (`STAGING_SECRET`/
`PRODUCTION_SECRET` = o `CREATION_CLEANUP_CRON_SECRET` do app correspondente; as URLs são `vars`
no `wrangler.jsonc`). Alvo sem URL/segredo é pulado com aviso; status ≠ 200 e erro de rede viram
log (`wrangler tail`), nunca exceção. ⚠️ Como o `studio-runtime`, **merge NÃO publica**: mudou o
Worker → `bun run deploy` dentro do pacote; rotacionou o segredo no Railway → `wrangler secret
put` do lado correspondente (os dois precisam bater, senão 401 a cada 5 min).

## Deploys

- **Staging — AUTOMÁTICO via GitHub Actions**: push/merge na branch `staging` roda
  o CI e, **se verde**, o job `deploy-staging` (no próprio `ci.yml`) dispara o
  deploy **só dos serviços afetados pelo diff** (mapa que espelha os
  `watchPatterns` dos `railway.json`; `bun.lock`/`package.json` → todos; `core` →
  backends+funnel+fiscal; `ui` → admin/community/community-kids/funnel;
  `member-shell` → community/community-kids). O mapa já cobre **community-kids** e
  **fiscal** (ambos em prod desde 06/2026); o **hub** ainda NÃO está no mapa (deploy
  pendente) e o **studio** é lib interna (somar os consumidores ao mapa quando o bloco
  estúdio for à prod). Usa o secret `RAILWAY_TOKEN`
  (token de conta do Railway) e espera os healthchecks convergirem. Forçar um
  deploy: `gh workflow run CI --ref staging -f services=all` (ou CSV:
  `-f services=funnel,auth`). *(O trigger nativo do Railway só pode ser armado
  pelo dashboard — por isso o deploy é dirigido pelo CI, o que de quebra gateia
  o deploy no CI verde.)*
- **Produção**: merge na `main` → **admin, funnel e community** auto-deployam
  (triggers armados no dashboard; verificado em 11/07/2026); os demais serviços
  são deployados **manualmente** (GraphQL `serviceInstanceDeployV2` com o sha da
  main, ou dashboard) — deploy de prod deliberado, por escolha. Atalho que
  automatiza esse manual (desde 07/2026):
  `gh workflow run "Deploy produção" --ref staging -f services=all` (ou CSV) —
  o workflow `deploy-production.yml` resolve o sha da main, deploya pelo mesmo
  GraphQL e **pula serviço que ainda não estreou em produção** (ex.: hub).
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
