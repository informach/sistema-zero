# Pilha local do Studio (Kids, Adulto e Admin)

Sobe nesta máquina Windows uma pilha isolada: Auth, Catalog, Members, Hub, Gateway, Admin,
Adulto (`community`) e Kids (`community-kids`), sobre um Postgres portátil. Junto vem o Worker
do Studio em `wrangler dev --local`. Ele serve a distribuição Python aprovada e dá aos apps um
R2 local (criações, snapshots do `/jogar`). Nenhum serviço hospedado entra na pilha: as URLs são
loopback e os segredos são gerados na primeira execução. Há uma exceção, que vem do próprio
produto: o JavaScript Pro roda num WebContainer no navegador, que baixa os pacotes npm da
internet.

Tudo o que é gerado fica em `.cache/` (ignorado pelo git). Nenhum `.env` é escrito nos pacotes:
cada serviço recebe a env explícita definida em `lib.ts`, mais o `studio-env.json` gerado por
`python-local.ts`.

## Comandos

```bash
bun scripts/local-studio-stack/setup.ts      # do zero, idempotente (ver "O que o setup faz")
bun scripts/local-studio-stack/up.ts [svc…]  # sobe o Postgres e os serviços
bun scripts/local-studio-stack/down.ts       # para tudo, inclusive o Postgres (--keep-db mantém)
bun scripts/local-studio-stack/verify.ts     # HTTP: logins, /estudio e free-options por conta
node scripts/local-studio-stack/studio-e2e.mjs <adulto|kids> <conta> <js|python> <classic|pro> [--publish]
node scripts/local-studio-stack/kids-first-course.mjs   # a criança faz o curso do slot 1 (Mural)
bun scripts/local-studio-stack/curriculum.ts [author|progress|all]
```

Os serviços são `auth`, `catalog`, `members`, `hub`, `gateway`, `studio-runtime`, `admin`,
`community` e `kids`. Os logs ficam em `.cache/local-stack/logs/`. O `.cache/local-stack/state.json`
guarda PID, porta e a **identidade** de cada processo (início e executável, lidos do kernel32 via
`bun:ffi`). O `down.ts` só encerra um PID cuja identidade ainda confere. Se o Windows tiver
reutilizado o PID, o script avisa e não mata nada.

| Serviço | Porta | Observação |
|---|---|---|
| Postgres 16.15 | 127.0.0.1:55432 | `.cache/local-stack/pg`, scram-sha-256, sem serviço do Windows |
| Gateway | 3000 | escuta em todas as interfaces (o gateway não tem opção de host) |
| Auth / Catalog / Members | 3002 / 3003 / 3004 | 127.0.0.1 |
| Hub (Clube e Mural) | 3010 | 127.0.0.1 |
| Admin / Adulto / Kids | 3005 / 3007 / 3008 | `next dev -H 127.0.0.1`; abrir por `http://localhost:<porta>` |
| studio-runtime | 127.0.0.1:8791 (inspector 9231) | `/v1/runtimes/*`, `/v1/publications` e o S3 local em `/cdn-cgi/local/r2/s3` |

Ficam desligados payments, messaging, fiscal, funnel, referrals, marketing e helpdesk. As rotas
do gateway para eles respondem 502 ou 503. Sem messaging, os e-mails (reset, OTP, convite) viram
no-op.

## O que o setup faz

1. Gera os segredos locais e prepara o Postgres portátil. O zip oficial da EDB é conferido pelo
   SHA-256 fixado em `lib.ts`; a EDB não publica checksum e os `.exe` não têm assinatura
   Authenticode. Em seguida faz o initdb e cria o banco `sistemazero`.
2. Aplica as migrations de auth, catalog, members e hub com `migrate.ts`, uma transação por
   migration. Num banco vazio, o `drizzle-kit migrate` do Members falha porque um valor de enum
   novo é usado na mesma transação.
3. Roda os seeds canônicos: catálogo (`catalog/scripts/seed.ts`) e servidores Kids do hub
   (`hub/scripts/seed-community-spaces.ts`).
4. Roda `python-local.ts`, que parte da candidata **`python-browser/2026-10-21-audio-2`**
   (`docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json`). Usa a
   distribuição `542cc502…` (runtime Turtle de `f81fd9ae2`), com as capacidades `publish` e
   `assist`, que o Members exige desde 896c3a1c3. A cópia local da distribuição é escolhida
   pelo SHA fixado no plano, em
   `sistema-zero-studio-python/.cache/studio-python-runtime/distributions-transfer/`. O script
   grava a distribuição e a config do runtime no R2 local com os helpers do próprio Worker e
   escreve o `studio-env.json`:
   - Members: `STUDIO_AUTHORING_POLICY_JSON` e `STUDIO_RUNTIME_HOSTS_JSON` (origem `http://127.0.0.1:8791`).
   - Adulto e Kids: `STUDIO_PYTHON_FRAME_ORIGINS`, `STUDIO_PRO_RUNTIME_URL/TOKEN` (o Worker, para
     publicar e resolver projetos Python) e `R2_*` com `R2_S3_ENDPOINT=http://127.0.0.1:8791/cdn-cgi/local/r2/s3`.
     Esse endpoint é o S3 local do Miniflare (SigV4, URLs pré-assinadas, CORS); a origem dele já
     está no CSP por ser origem de frame.
   - Admin: `STUDIO_PYTHON_FRAME_ORIGINS`.
5. Sobe a pilha e publica a jornada Kids v1 com `bootstrap-kids-journey.ts`. Depois cria as
   contas (`accounts.ts`) e o currículo (`curriculum.ts`), e leva os clientes ao Estúdio livre
   (`kids-first-course.mjs`).

## Contas de QA

As senhas ficam só em `.cache/local-stack/credentials.json`.

| Conta | Papel | Acesso |
|---|---|---|
| `qa.superadmin@example.com` | superadmin | equipe; perfil Kids "Perfil Superadmin" |
| `qa.admin@example.com` | admin | equipe; perfil Kids "Perfil Admin" |
| `qa.staff@example.com` | staff | equipe (sem Python); perfil Kids "Perfil Staff" |
| `qa.adulto@example.com` | customer | `comunidade-dos-criadores-adulto-anual`; etapa Aprendiz concluída (`studio`, `pinta`) |
| `qa.responsavel@example.com` | customer | `comunidade-dos-criadores-anual`; criança "Crianca QA" no nível coder (`studio`, `pinta`) |

Cada parte é feita pelo caminho canônico do produto:

- **Usuários:** `auth/scripts/seed-admin.ts`.
- **Acessos:** `POST /members/admin/entitlements`.
- **Perfis Kids:** `POST /auth/profiles`. A criança entra pelo acesso de estudo "este aparelho".
- **Currículo** (`curriculum.ts`, pelas rotas do Admin):
  - curso adulto de primeiros passos 2D, com os blocos `iniciante-2d` liberados;
  - curso Kids no slot 1, com bloco Estúdio e vitrine;
  - Mural adulto (`mural-dos-criadores-adulto` + `parede`), criado por `POST /hub/admin/spaces`.
- **Progresso:**
  - Adulto: a jornada vem de `seed-adult-journey.ts --once` e o cliente conclui a aula.
  - Criança (`kids-first-course.mjs`): envia o projeto da aula, publica no Mural e conclui a fase.
    A política Kids v1 dá o nível coder por concluir **e** publicar o curso do slot 1.
  - Pro, Ponte e Python não chegam aos clientes: na política real eles vêm em etapas mais
    adiante.

## Resultado do ponta a ponta (21/10/2026, `studio-e2e.mjs`)

O teste cobre criar, editar, executar, "Guardado na sua conta", recarregar, reabrir e reabrir num
navegador limpo.

- **Adulto, Python Clássico/Pro, admin e superadmin:** passa em tudo, com saída real do Pyodide
  servido pelo runtime local. Python Pro publicado → `/jogar` anônimo executa o programa.
- **Adulto, JS Clássico e JS Pro, admin:** passa. O JS Pro roda no WebContainer, que baixa os
  pacotes do npm. JS Clássico publicado → `/jogar` anônimo funciona.
- **Adulto, staff:** passa em JS e não vê a opção Python.
- **Adulto, cliente (`qa.adulto`):** passa no JS Clássico (edição por blocos, porque ainda não tem
  Ponte) e o `/jogar` anônimo funciona. Não vê Python nem Pro, como manda a política.
- **Kids, JS Clássico e Python Clássico, perfis da equipe:** passa; Python Clássico publicado →
  `/jogar` anônimo funciona.
- **Kids, criança (`Crianca QA`):** passa no JS Clássico por blocos e o `/jogar` anônimo funciona.
  Não vê Python nem Pro.
- **Kids, perfil do staff:** não vê Python.
- **Kids, Pro (JS ou Python) da equipe:** **não abre**. O Members dá a prévia da equipe também ao
  perfil da conta da equipe (`get-gamification.service.ts`), e o `/estudio` livre oferece "Pro".
  Mas `/estudio/pro/[id]` recusa a prévia com perfil ativo (`resolveStudioProAccess`, teste
  `studio-pro-access.test.ts`). Sem perfil, o proxy manda a conta para `/pais`. O projeto Pro é
  criado e o editor volta para a lista.
- **Publicar JS Pro:** não funciona ("Não foi possível compilar o projeto agora."), porque precisa
  do `/v1/build` (contêiner).

## O que continua fora do local

- **Docker:**
  - O contêiner `ProBuildSandbox` atende o compilador e a publicação do **Pro JavaScript**
    (`/v1/check`, `/v1/build`, `/v1/preflight`).
  - A inspeção, validação e prévia autenticadas Python (`/v1/python/*`, Durable Object
    `PythonInspectionJob`) usam o mesmo sandbox.
  - O serviço de linguagem Python (Pyright, `packages/studio-language-service`) só existe em
    contêiner. Por isso `STUDIO_PYTHON_RUNTIME_*` e `STUDIO_PYTHON_LANGUAGE_*` ficam sem valor, e o
    editor mostra "A análise Python não está disponível neste contexto".
- **Capa do Mural:** o hub só aceita `coverImageUrl` com `https://`, e o endpoint público do R2
  local é http. Sem `R2_BUCKET`/`R2_PUBLIC_URL`, a publicação sai sem capa.
- **Uploads de mídia do Admin:** o Admin não lê `R2_S3_ENDPOINT` (endpoint fixo da Cloudflare),
  então os uploads dele continuam indisponíveis.
