# Ambientes & fluxo de desenvolvimento

> Fonte da verdade operacional de **git → CI → staging → produção**. Atualize este
> documento quando o fluxo ou a topologia mudarem.

## Fluxo de git (desde 06/2026)

A `main` é **protegida por ruleset** no GitHub (`protege-main`): push direto é
rejeitado, force-push e deleção bloqueados, e **todo merge exige PR com os sete
checks de CI verdes**: `ci`, `community-kids-e2e`, os três shards
`studio-e2e-chromium-1/2/3`, `studio-e2e-firefox` e `studio-e2e-webkit`.
Também exige `railway-config-plan`, que valida o plano de infraestrutura de produção.
O ruleset permite apenas merge commit em main, sem squash ou rebase
(0 aprovações exigidas — time solo; o GitHub não permite aprovar o
próprio PR). A branch **`staging`** é a integração contínua do dia a dia.

```
feature/minha-coisa          (a partir da staging)
   │  PR → staging           (CI roda no push da staging — canário)
   ▼
staging                      → deploy no AMBIENTE staging do Railway → testar
   │  PR → main              (sete checks obrigatórios no ruleset)
   ▼
main                         → deploy em PRODUÇÃO
   │  sincronização automática (fast-forward)
   └──→ staging              → mesmo commit após a promoção
```

Regras práticas:

- **Merge de `staging` → `main` SEMPRE com merge commit** (`gh pr merge --merge`).
  Squash faria a staging (branch longa) divergir da main e os commits antigos
  reapareceriam no diff do PR seguinte.
- Após o merge, o workflow **Sincronizar staging** avança staging para o commit
  de main. Não usa force push. Se staging já contiver main e trabalho mais novo,
  preserva esse trabalho; se houver divergência, falha sem alterar a branch.
  Nesse caso, integrar main em staging com merge e resolver os conflitos antes
  da próxima promoção.
- Se só o histórico mudou, sem mudança nos arquivos, a sincronização não repete
  o deploy de staging. Se recebeu código diferente, como um hotfix de produção,
  dispara o CI com `services=auto` e o SHA anterior de staging.
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

### Promoção comum

1. Integrar o trabalho na branch staging e aguardar **todo o workflow CI**,
   incluindo os testes de navegador e `deploy-staging`.
2. Conferir a mudança no ambiente staging.
3. Abrir o PR `staging` → `main`, aguardar todos os checks e usar **Create a merge
   commit**. Pela CLI: `gh pr create --base main --head staging`, seguido de
   `gh pr merge --merge <número-do-PR>` após os checks.
4. O workflow de configuração aplica o plano de produção salvo no PR. O Railway
   aguarda os workflows de main (**Wait for CI**) e publica automaticamente os serviços afetados. Acompanhar
   os deployments até `SUCCESS` e conferir os healthchecks do que mudou.
5. Conferir o workflow **Sincronizar staging**. Ao terminar, sem trabalho novo
   concorrente, main e staging apontam para o mesmo commit.

Para atualizar a cópia local, com a árvore de trabalho limpa:

```bash
git fetch origin
git switch staging
git pull --ff-only origin staging
git rev-list --left-right --count origin/main...origin/staging
git diff --exit-code origin/main origin/staging
```

Logo após uma promoção completa, a contagem esperada é `0 0` e o diff é vazio.
Novas funcionalidades fazem staging avançar normalmente até a próxima promoção.

Se o dispatch do CI falhar **depois** de staging avançar, use o SHA `before`
registrado no log da sincronização para recuperar a publicação:
`gh workflow run ci.yml --ref staging -f services=auto -f before_sha=<SHA-anterior>`.
Reexecutar apenas a sincronização não repete um dispatch que já falhou.

### Mudanças que precisam de sequência própria

Conversões de dados e alterações incompatíveis de contrato/banco precisam de
plano de rollout. O merge comum não executa importações de cursos ou tutoriais,
conversões de jogos nem publica Workers Cloudflare. Migrações normais continuam
no preDeploy do serviço; devem ser compatíveis com a versão ainda em execução.

Para consultar a promoção ampla de staging para produção de 27/09/2026, usar o
[plano completo de promoção](superpowers/plans/2026-09-27-promocao-producao.md), com
[diagnóstico dos ambientes e dos dados](plans/2026-09-27-promocao-producao-design.md).
Ele atualiza a ordem das releases, a conversão dos jogos, a preservação dos cursos legados e
os gates de infraestrutura. O caminho do runbook de 19/09 foi preservado, mas seu conteúdo foi
substituído pela sequência vigente em 27/09.

A sequência operacional da promoção está no
[runbook de produção atualizado](runbooks/promocao-producao-aulas-2026-09-19.md), com preparação A
até `0090`, transição B até `0098`, conversor com destino explícito e evidências das correções de
CORS e anexos do Admin. Um merge direto com todos os serviços em paralelo não cumpre essa ordem.

- **Staging — AUTOMÁTICO via GitHub Actions**: push/merge na branch `staging` roda
  o CI e, **se verde**, o job `deploy-staging` (no próprio `ci.yml`) dispara o
  deploy **só dos serviços afetados pelo diff** (mapa que espelha os
  `watchPatterns` de `.railway/services/*.json`; `.railway/`, `bun.lock` e
  `package.json` → todos; `core` →
  backends+funnel+fiscal; `ui` → admin/community/community-kids/funnel;
  `member-shell` → community/community-kids). O mapa já cobre **community-kids** e
  **fiscal**, **hub**, **referrals**, **marketing** e **marketing-app**. Helpdesk e
  Helpdesk App usam os IDs das variáveis do repositório. As bibliotecas Studio,
  Pinta, Pensa, Molda e Helpdesk Contracts acionam seus consumidores; scripts de
  manutenção acionam Members, Hub e os três apps que os empacotam.
  Antes dos deployments, aplica o plano de configuração de staging. O secret
  `RAILWAY_TOKEN` é passado à CLI como `RAILWAY_API_TOKEN`, com projeto e ambiente
  explícitos. Para publicar as aplicações, usa o mesmo secret `RAILWAY_TOKEN`
  (token de conta do Railway) e espera os healthchecks convergirem. Forçar um
  deploy: `gh workflow run CI --ref staging -f services=all` (ou CSV:
  `-f services=funnel,auth`). Em staging, os gatilhos nativos do Railway ficam
  desligados. Os três remanescentes de Hub e Helpdesk foram removidos em
  27/09/2026 para evitar deploy duplicado ou anterior à conclusão dos testes.
- **Produção**: merge na `main` → aplicação do plano IaC salvo no PR → deploy
  nativo do Railway com **Wait for CI**, conforme os
  `watchPatterns` de cada serviço. Estão ligados à main: api-gateway, auth,
  catalog, payments, members, messaging, funnel, admin, community,
  community-kids, hub, referrals, marketing, marketing-app, helpdesk e
  helpdesk-app. A configuração foi conferida e corrigida em 27/09/2026:
  Helpdesk deixou de acompanhar staging em produção; Indicações e Marketing
  receberam os gatilhos que faltavam. Fiscal permanece fora deste ajuste.
  Todos os 17 serviços da aplicação usam `.railway/railway.ts` e as definições
  em `.railway/services/`, incluindo o Fiscal sem mudar seu gatilho manual.
  O workflow `railway-config.yml` aplica o plano exato do PR com
  o token existente e destino production explícito; não deve ser cancelado. Mudanças de estado remoto
  ou da árvore de configuração invalidam o plano e interrompem a publicação.
- **Deploy de produção por ondas ou recuperação**: o workflow manual
  `deploy-production.yml` exige CSV explícito e o SHA completo de main:
  `gh workflow run deploy-production.yml --ref main -f services=members -f expected_sha=<SHA-completo>`.
  Não aceita `all`, não publica serviço sem deployment ativo saudável e confere
  o SHA efetivamente ativado. Não execute junto de um deploy nativo do mesmo
  serviço. Em rollout incompatível, siga o runbook para suspender e restaurar
  os gatilhos durante as ondas.
- ⚠️ Gotcha de build: o Railway **só passa variáveis ao build do Dockerfile quando
  declaradas como `ARG`** (ver o Dockerfile do funnel — envs `PUBLIC_*`/
  `FUNNEL_PUBLIC_URL` são inlined no `astro build`).

### Configuração Railway em IaC

A migração antecipada do formato que será encerrado em **01/12/2026** usa
`.railway/railway.ts`. Os arquivos legados e seus vínculos foram removidos,
preservando comandos de migração, healthchecks e infraestrutura dos ambientes.
Segredos continuam no Railway; o repositório registra apenas seus nomes com
`preserve()`. O apply automático recusa exclusões e alterações em variáveis,
domínios, bancos, volumes e serviços externos.

Consulte [as instruções de infraestrutura](../.railway/README.md) e o
[plano da migração](superpowers/plans/2026-09-27-railway-iac.md) para manutenção,
validação e recuperação. Promover staging para main continua sendo o fluxo normal.

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
