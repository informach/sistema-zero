# Auditoria das imagens de execução Railway

Auditoria de fontes em 22/10/2026, base `7dfca86efffe1e65cd33d757bb23908ffb4125ab`. Abrange os 16 serviços além de Auth/Members; registra o estado dos dois pilotos separadamente. Não houve build, execução de aplicação, acesso a banco ou operação em provider nesta auditoria. A matriz orienta futuros recortes; não autoriza alterar as dez imagens de uma vez.

## Contexto medido e imagem ainda não medida

A prova local anterior `docker-context-proof-r1` exportou o contexto real pelo BuildKit (`FROM scratch` + `COPY`): **8.857 arquivos, 170.382.687 bytes, aproximadamente 170,4 MB decimais**, em `2026-10-22T20:34:15.212Z`. O recibo privado está em `.cache/python-reference-games/docker-context-proof-r1/receipt.json`, SHA-256 `b2ae15ef8df4bda985ac7da7ac3dfc6c4bd2f67497e60951ad18839433fcd02f`. A prova usou `.dockerignore` SHA-256 `88c9a44240784ac5a6b4c89dfc641ab94e8c3456759509d8c49b197e2f3522bd` e verificou a presença de entradas representativas de execução/build. É uma medição daquele corte, não uma medição renovada a cada alteração.

Esse número é a soma dos arquivos do **contexto exportado sem compressão**. Não mede imagem final, camadas comprimidas, tráfego ao registry, dependências instaladas, tempo de build ou RAM. Não há comparação desses indicadores nesta auditoria.

[`.dockerignore`](../../.dockerignore) já exclui `/docs`, `.git`, material operacional da raiz, caches locais, testes e QA. Os documentos continuam no Git. A exclusão de contexto não remove caches criados posteriormente por `RUN bun install`. Nos estágios únicos, esses arquivos e a instalação permanecem na imagem. Hardlinks do Bun impedem somar ingenuamente o tamanho aparente de cache e `node_modules`; `node_modules/.bun` pode ser a store necessária à resolução e não deve ser apagada como cache global.

## Matriz dos 16 serviços

**Amplo** significa estágio final único com `COPY . .` e `bun install --frozen-lockfile` sem filtro de workspace. Conserva fontes dos outros workspaces admitidas pelo contexto, instalação integral e cache produzido pelo instalador. **Restrito** descreve as cópias explícitas do estágio final; não comprova o menor tamanho possível.

| Serviço e evidência | Estado do estágio final | Contratos a conservar no recorte |
|---|---|---|
| [API Gateway](../../packages/api-gateway/Dockerfile), linhas 10–13 | Amplo | Pacote, Core e `gateway.config.ts`; preservar o cwd do comando atual. |
| [Catalog](../../packages/catalog/Dockerfile), 10–14 | Amplo | Drizzle, schema, SQL/journal; `seed.ts`, `catalog-seed-plan.ts`, `catalog-seed-definitions.ts`. |
| [Payments](../../packages/payments/Dockerfile), 10–14 | Amplo | Drizzle, SQL/journal e scripts operacionais de consumidores/webhooks/pagamentos; certificados permanecem externos. |
| [Hub](../../packages/hub/Dockerfile), 10–14 | Amplo | Drizzle, SQL/journal, seed de espaços e `community-seed-plan.ts`; launcher da raiz `scripts/release/start.mjs`. |
| [Messaging](../../packages/messaging/Dockerfile), 12–16 | Amplo | Migração **e seed de templates** no predeploy; assets dos dois logos de email. |
| [Fiscal](../../packages/fiscal/Dockerfile), 12–16 | Amplo | Drizzle, SQL/journal, fontes fiscais e dependências de PDF/XML/assinatura. |
| [Marketing](../../packages/marketing/Dockerfile), 10–14 | Amplo | Core, Marketing-contracts/import; schemas/migrations; operadores de backup e CORS. |
| [Referrals](../../packages/referrals/Dockerfile), 11–15 | Amplo | Drizzle, SQL/journal e `scripts/upgrade-mural-trials.ts`. |
| [Helpdesk](../../packages/helpdesk/Dockerfile), 10–14 | Amplo | Core, Helpdesk-contracts; Drizzle, SQL/journal e `scripts/triage-backfill.ts`. |
| [Funnel](../../packages/funnel/Dockerfile), 11–28 | Amplo, com build Astro no mesmo estágio | `dist/server`, `dist/client`, wrapper `scripts/start.mjs`, dependências SSR, variáveis públicas de build e migrações. |
| [Admin](../../packages/admin/Dockerfile), 29–38 | Restrito: standalone/static/public | Boot-check, launcher de manutenção, assets Rive/live-camera e dependências externas PDF/canvas/sharp. |
| [Community](../../packages/community/Dockerfile), 29–40 | Restrito: standalone/static/public | Boot-check compartilhado e launcher de manutenção. |
| [Community Kids](../../packages/community-kids/Dockerfile), 32–43 | Restrito: standalone/static/public | Boot-check, launcher, assets Rive/live-camera/avatar/Zappy e argumento `--require-creation-cleanup`. |
| [Marketing App](../../packages/marketing-app/Dockerfile), 26–34 | Restrito: standalone/static/public | Boot-check e assets gerados. |
| [Helpdesk App](../../packages/helpdesk-app/Dockerfile), 26–34 | Restrito: standalone/static/public | Boot-check e assets gerados. |
| [Live Recorder](../../packages/live-recorder/Dockerfile), 1–22 | Restrito ao pacote; dependências em estágio próprio | Playwright, FFmpeg, tini/gosu, entrypoint/volume e arquivos enviados ao sandbox. Instalação atual sem lock/frozen. |

Os comandos de predeploy/start estão em [`.railway/services`](../../.railway/services). As cinco aplicações Next usam `output: 'standalone'` e `outputFileTracingRoot` em seus `next.config.ts`. O monorepo inteiro participa do build, mas não é copiado integralmente ao runner. Studio/Pinta/Molda e outros pacotes presentes no bundle podem ser dependências reais do produto.

## Riscos concretos de uma redução incompleta

- **Migração é operação de produção.** Nove dos dez serviços amplos usam `drizzle-kit`, hoje declarado em `devDependencies`. Acrescentar apenas `--production` retiraria essa ferramenta. Preservar sua dependência operacional, config, schema, SQL e `meta/_journal.json`, com os journals isolados por serviço. Não trocar a estratégia de migração neste recorte.
- **Seeds têm contratos diferentes.** [Messaging/package.json](../../packages/messaging/package.json), linha 15, mantém `db:migrate && templates:seed`. [Catalog/package.json](../../packages/catalog/package.json), linhas 16–17, migra sem seed automático e conserva `db:seed` explícito. Hub também mantém seu operador explícito. Não apagar scripts por estarem fora de `src`.
- **Assets de servidor não são documentação.** [Fiscal/font-files.ts](../../packages/fiscal/src/infrastructure/danfse/font-files.ts), linhas 45–46, lê fontes locais e verifica integridade. [Messaging/composition-root.ts](../../packages/messaging/src/composition-root.ts), linhas 107–128, lê logos; a ausência degrada o email sem derrubar o boot.
- **Next precisa de cache de execução gravável.** Os runners criam `.next/cache` com permissões do usuário `node` para o image optimizer. Não remover esse diretório como se fosse cache de compilação. Admin/Kids também sincronizam Rive e live-camera antes de `next build` nos respectivos `package.json`.
- **Funnel precisa do wrapper.** [scripts/start.mjs](../../packages/funnel/scripts/start.mjs) configura Sentry, importa a saída Astro e coordena o encerramento. Substituí-lo pela entrada gerada mudaria comportamento.
- **Recorder tem resolução não congelada.** Seu Dockerfile copia somente `package.json` e executa `bun install --production`, sem o lock do repositório. Há dependências com intervalos de versão. Corrigir isso separadamente, preservando os modos suportados: [recording-browser.ts](../../packages/live-recorder/src/recording-browser.ts) usa Chromium local ou sandbox e lê `railway-browser-host.mjs`/`browser-lease.ts` para envio; [segment-store.ts](../../packages/live-recorder/src/segment-store.ts), linha 276, invoca FFmpeg. Não retirar o navegador por suposição.
- **Backup Marketing tem requisito externo a conferir.** [editorial-backup.ts](../../packages/marketing/scripts/editorial-backup.ts), linhas 94/116, chama `pg_dump`/`pg_restore`; o Dockerfile não os provisiona explicitamente. A disponibilidade na imagem atual não foi testada. Preservar o operador e qualificar o ambiente em que ele deve executar.

## Auth piloto e Members pendente

| Serviço | Estado neste registro | Próximo gate |
|---|---|---|
| [Auth](../../packages/auth/Dockerfile) | Piloto em validação por outra frente; alterações locais ainda não qualificadas por esta auditoria. Instalação filtrada/congelada, base por digest e runner seletivo em revisão. | Aguardar freeze e recibos próprios de resolução, migração, readiness, manutenção e encerramento. Não herdar aceite de contexto. |
| [Members](../../packages/members/Dockerfile) | Recorte de imagem ainda pendente; mantém estágio único amplo. | Planejar a partir do piloto Auth aprovado, incluindo os imports reais de Studio/Pinta e os operadores de jornada. Nenhuma implementação/build autorizado por este documento. |

Members declara Core, Studio e Pinta; Studio/Pinta alcançam UI e Core: **cinco workspaces no conjunto**, incluindo Members. Subpaths de servidor de Studio e `@sistemazero/pinta/assets` são usados pelo produto. Uma instalação filtrada por workspace pode ainda carregar dependências de navegador declaradas por esses pacotes; só uma prova do grafo real justificará um recorte adicional. Copiar apenas Members/Core quebraria esses consumidores.

## Ordem proposta e critérios de aceite

1. Fechar Auth e só então atribuir o piloto Members, com inputs e recursos de QA próprios.
2. Após ambos, propor lotes separados para Gateway, serviços com banco e Funnel. Reutilizar o padrão comprovado, conservando os comandos Railway e operadores existentes. Nenhuma mudança automática nas dez imagens.
3. Tratar o lock do recorder em lote específico. Revisar os cinco Next por último: sua separação de runner já existe.
4. Em cada lote, conferir arquivos/links do rootfs, usuário/permissões, resolução real sem instalação em runtime, migração em banco descartável e replay, operações explícitas em modo de leitura quando disponível, readiness, manutenção e shutdown. Assets e imports dinâmicos exigem prova própria.
5. Medir imagem/camadas e duração apenas na janela de build autorizada, registrando base por digest e versão do Bun. Não somar hardlinks como cópias físicas; não inferir compressão do registry a partir do contexto ou de `docker inspect Size`.

A estratégia preferida é instalar em estágio próprio e copiar somente artefatos/dependências comprovados ao runner. Excluir cache em uma camada posterior não elimina os bytes de uma camada anterior. Documentação da raiz permanece no Git; código de ajuda consumido pelo produto, assets e avisos de licença necessários continuam sujeitos ao grafo real, sem exclusão genérica de Markdown/JSON ou diretórios chamados `docs`.
