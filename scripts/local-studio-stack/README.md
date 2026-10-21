# Pilha local do Studio (Kids, Adulto e Admin)

Sobe, nesta máquina Windows, uma pilha isolada com Auth, Catalog, Members, Gateway, Admin,
Adulto (`community`) e Kids (`community-kids`) sobre um Postgres portátil, mais o Worker do
Studio em `wrangler dev --local` servindo a distribuição Python aprovada. Nada aponta para
ambiente hospedado: todas as URLs são loopback e os segredos são gerados na primeira execução.

Tudo que é gerado fica em `.cache/` (ignorado pelo git). Nenhum `.env` é escrito nos pacotes:
cada serviço recebe a env explícita de `lib.ts`.

## Comandos

```bash
bun scripts/local-studio-stack/setup.ts      # do zero: Postgres, migrations, seeds, Python, up, contas
bun scripts/local-studio-stack/up.ts [svc…]  # sobe (Postgres + serviços); idempotente
bun scripts/local-studio-stack/down.ts       # para tudo, inclusive o Postgres (--keep-db mantém)
bun scripts/local-studio-stack/verify.ts     # logins, /estudio e free-options por conta (HTTP)
node scripts/local-studio-stack/browser-check.mjs adulto admin [python]   # Chromium headless
```

Serviços: `auth`, `catalog`, `members`, `gateway`, `studio-runtime`, `admin`, `community`, `kids`.
Logs em `.cache/local-stack/logs/`, PIDs e portas em `.cache/local-stack/state.json`.

| Serviço | Porta | Observação |
|---|---|---|
| Postgres 16.15 | 127.0.0.1:55432 | `.cache/local-stack/pg`, scram-sha-256, sem serviço do Windows |
| Gateway | 3000 | escuta em todas as interfaces (o gateway não tem opção de host) |
| Auth / Catalog / Members | 3002 / 3003 / 3004 | 127.0.0.1 |
| Admin / Adulto / Kids | 3005 / 3007 / 3008 | `next dev -H 127.0.0.1`; abrir por `http://localhost:<porta>` |
| studio-runtime | 127.0.0.1:8791 (inspector 9231) | só as rotas do navegador `/v1/runtimes/*` |

Payments, messaging, fiscal, funnel, hub, referrals, marketing e helpdesk não sobem: as rotas
do gateway para eles respondem 502/503. Sem messaging, e-mails (reset, OTP, convite) são no-op.

## Postgres portátil

`setup.ts` baixa `postgresql-16.15-1-windows-x64-binaries.zip` de `get.enterprisedb.com` por
HTTPS e confere o SHA-256 fixado em `lib.ts`. A EDB não publica checksum desse zip e os `.exe`
não têm assinatura Authenticode (`Get-AuthenticodeSignature` → `NotSigned`). O hash fixado é
o medido no download de 21/10/2026, com o `Content-Length` conferido com o servidor. Trocar
de versão exige medir e fixar um hash novo.

As migrations rodam por `migrate.ts`, uma transação por migration, no mesmo journal
`drizzle.<pacote>_migrations`. Num banco vazio, o `drizzle-kit migrate` do Members falha
("unsafe use of new value … of enum type") e o erro some atrás do spinner.

## Contas de QA (`accounts.ts`)

As senhas ficam só em `.cache/local-stack/credentials.json`.

| Conta | Papel | Acesso concedido |
|---|---|---|
| `qa.superadmin@example.com` | superadmin | papel de equipe; perfil Kids "Perfil Superadmin" |
| `qa.admin@example.com` | admin | papel de equipe; perfil Kids "Perfil Admin" |
| `qa.staff@example.com` | staff | papel de equipe; perfil Kids "Perfil Staff" |
| `qa.adulto@example.com` | customer | oferta `comunidade-dos-criadores-adulto-anual` |
| `qa.responsavel@example.com` | customer | oferta `comunidade-dos-criadores-anual`; criança "Crianca QA" (2015) |

Caminhos usados:

- Os usuários vêm de `packages/auth/scripts/seed-admin.ts` (UserAggregate).
- Os acessos são concedidos por `POST /members/admin/entitlements` (modo `offer`) com o JWT do admin.
- Os perfis Kids são criados por `POST /auth/profiles`, que dispara a admissão Auth → Members.
- A jornada Kids inicial é publicada por `bootstrap-kids-journey.ts initialize|advance|publish`.

Para entrar num perfil Kids, a criança usa o acesso de estudo: o responsável cria um acesso
"este aparelho" e o navegador entra no perfil (`/api/study/grants` e depois `/api/study/enter`).

## Studio Python local (`python-local.ts`)

- O script parte do plano canônico do promotor, versionado em
  `docs/continuity/2026-10-21-studio-python/snapshots/root/0374-canonical-plan.json.snapshot`
  (release `python-browser/2026-10-20-audio-1`, manifesto `7026b09b…`).
- Usa a distribuição aprovada `a8a6c625…`. Para outro diretório, defina `STUDIO_PYTHON_DISTRIBUTION`.
- Grava a distribuição e a config do runtime no R2 local, persistido em `.cache/local-stack/wrangler`,
  com os helpers do próprio Worker (conferem o SHA-256 de cada arquivo).
- Escreve `.cache/local-stack/studio-env.json`:
  - no Members: `STUDIO_AUTHORING_POLICY_JSON` (a política do plano) e `STUDIO_RUNTIME_HOSTS_JSON`
    (origem `http://127.0.0.1:8791`);
  - no Admin, no Adulto e no Kids: `STUDIO_PYTHON_FRAME_ORIGINS`.
- A config do Worker local fica em `.cache/local-stack/studio-runtime/wrangler.jsonc`: sem contêiner,
  sem cron, com as origens de app em localhost e o `INTERNAL_TOKEN` em `.dev.vars`.

O que continua fora do local:

- Inspeção, validação e prévia Python (`/v1/python/*`, `/v1/python-previews/*`) e o compilador
  Pro (`/v1/check`, `/v1/build`) precisam do contêiner `ProBuildSandbox`, que exige Docker.
  Por isso `STUDIO_PRO_RUNTIME_*` e `STUDIO_PYTHON_RUNTIME_*` não são definidos.
- O serviço de linguagem Python (`packages/studio-language-service`, Pyright) só roda em
  contêiner, então `STUDIO_PYTHON_LANGUAGE_*` também fica sem valor.
- Sem R2 de UGC, a sincronização das criações na nuvem falha ("Não consegui guardar"). O
  projeto continua salvo no navegador.
- Clientes (adulto e criança) não abrem o editor livre. A jornada e a paleta de blocos vêm de
  cursos publicados e concluídos, e o banco local não tem cursos. O seed da jornada adulta
  registra `no-courses`.
