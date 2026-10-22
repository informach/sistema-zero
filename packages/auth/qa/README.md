# Imagem Auth por dependências instaladas

O Dockerfile recebe o contexto da raiz, instala o lock congelado com filtro
`@sistemazero/auth` e copia para o estágio final somente Auth, Core, os módulos
instalados e o wrapper de releases. Os manifests dos demais workspaces ficam
somente no estágio de instalação: removê-los faz o Bun recusar o lock congelado.
`drizzle-kit` é dependência operacional, pois o pre-deploy executa suas migrations.

Bun está fixado em **1.4.4**, com digest da imagem base. Essa era a versão observada
no deploy anterior de `oven/bun:1`; o piloto não troca o runtime para o Bun 1.3.11
do CI. A store `node_modules/.bun` integra as dependências e é preservada. O cache
global do instalador e fontes de outros workspaces não entram no estágio final.
Os pacotes publicados mantêm seus arquivos; não há uma remoção manual de arquivos
de dependências pelo nome.

## Construir e inspecionar

Na raiz, após coordenar uma janela local de Docker:

```powershell
docker build --progress=plain -f packages/auth/Dockerfile -t sz-auth-qa:closure .
docker image inspect sz-auth-qa:closure --format '{{json .Size}} {{json .Id}} {{json .Config.User}}'
```

`Size` é o tamanho informado pelo Docker local, não bytes comprimidos no registry.
O `Id` exposto pelo Docker deve ser registrado literalmente; manifest da plataforma,
config e índice emitidos pelo BuildKit são campos separados.

## Smoke sem banco e sem rede externa

Os scripts QA são montados somente para a prova e não integram a imagem.

```powershell
$qa = (Resolve-Path packages/auth/qa).Path
docker run --rm --network none --read-only `
  --tmpfs /tmp:rw,noexec,nosuid,size=128m --memory 1024m --cpus 1 --pids-limit 128 `
  --cap-drop ALL --security-opt no-new-privileges `
  --mount "type=bind,source=$qa,target=/qa,readonly" `
  sz-auth-qa:closure timeout 60s bun /qa/image-smoke.mjs
```

A prova confere UID 1000, Bun, resolução real dos imports, grafo de inicialização,
Argon2, CLI Drizzle, journal, workspaces e arquivos excluídos. Também inicia o wrapper
em manutenção com um entrypoint inexistente: `/readyz` retorna manutenção e a rota
Auth retorna 503, sem importar a aplicação.

## Smoke PostgreSQL isolado

O operador deve preparar um PostgreSQL **exclusivo de QA**, criar somente o banco
`auth_image_closure_review_r1` e conectar ambos os containers a uma rede Docker
interna. O alias do banco deve ser `auth-image-qa-pg`. O script recusa outro host ou
nome de banco. Ele não cria ou remove bancos. Nunca apontar para produção/staging.

Forneça `DATABASE_URL` apenas ao processo local. Os tokens e URLs usados pela
aplicação são fixtures inertes; nenhum Members/Gateway real é chamado. O pool usa
o default da aplicação: dois jobs reservam conexões, portanto um pool artificial
de duas conexões não representa o boot normal.

```powershell
# $qa, $network e $env:DATABASE_URL são preparados pelo operador de QA.
docker run --rm --network $network --read-only `
  --tmpfs /tmp:rw,noexec,nosuid,size=128m --memory 1024m --cpus 1 --pids-limit 128 `
  --cap-drop ALL --security-opt no-new-privileges --env DATABASE_URL `
  --mount "type=bind,source=$qa,target=/qa,readonly" `
  sz-auth-qa:closure timeout 90s bun /qa/image-database-smoke.mjs --start=wrapper
```

Sem `--existing-migrations`, a prova exige ausência do journal antes de executar a
CLI real duas vezes. Para repetir num banco já migrado, essa opção exige previamente
todos os hashes SQL atuais, em ordem. As duas formas conferem o journal completo,
replay, ausência de contas, guards de produção, `/readyz` com banco real e 401 da rota
interna sem credencial.

`--hold-purge` acrescenta uma regressão causal: uma conexão de QA segura um lock em
`auth.refresh_tokens`; `pg_stat_activity` identifica o DELETE bloqueado por banco,
`application_name` e PID. Após SIGTERM, a prova observa continuamente esse PID por
seis segundos, além do prazo de cinco segundos do fechamento do pool. Só então
libera o lock e exige saída limpa. O lock e as conexões são liberados também na
falha; erros de cleanup não substituem o erro primário.

`--start=workspace` usa exatamente `bun run --filter @sistemazero/auth start`;
`--start=wrapper` usa `bun scripts/release/start.mjs packages/auth/src/index.ts`.
Esse harness controla um subprocesso. A entrega de SIGTERM ao PID 1 real do Docker
precisa de prova própria e não pode ser inferida do wrapper.

## Resultados locais do piloto (22/10/2026)

- A imagem inicial mediu **571260278 B**, Docker Id
  `sha256:248c061cd478a1f641ba853bcbd2233acc4f27d45e2f53dc21183243f22d3114`.
  A imagem com a correção do drain mediu **571260321 B**, Docker Id
  `sha256:1dea0cafcf18db7c9b9c1246ec307db98563f0b4740bfeab25e8a229610fac41`.
- O smoke estático passou em Bun 1.4.4, UID 1000 e 26 migrations presentes.
- O banco novo recebeu as 26 migrations e o replay preservou seus hashes. Essa
  primeira execução não teve resultado global verde: o coletor QA tentou reler
  um stream já consumido. O negativo foi preservado e o coletor corrigido.
- Ensaios seguintes com pool artificial de duas conexões expuseram starvation
  entre os jobs de boot; esses resultados não provam isoladamente a corrida de
  shutdown e não foram convertidos em passes.
- Com pool padrão e o mesmo lock controlado, a imagem anterior falhou por encerrar
  antes da purga. A imagem corrigida passou pelo wrapper, aguardando a purga,
  preservando o journal 26 e retornando 200/401 nos contratos HTTP.
- O comando workspace respondeu aos contratos HTTP, mas o sinal enviado ao
  subprocesso não foi observado pela aplicação. Esse caso permanece negativo;
  ainda não é evidência sobre o PID 1 real do Docker.

Não havia uma imagem anterior do Auth completo disponível para medir a redução.
Não foram qualificados tamanho comprimido, velocidade de deploy, login completo,
Messaging/Members reais ou implantação em Railway. O piloto não altera a imagem
Members, migrations nem credenciais. As provas e negativos privados estão em
`.cache/python-reference-games/auth-image-closure-r1/`.
