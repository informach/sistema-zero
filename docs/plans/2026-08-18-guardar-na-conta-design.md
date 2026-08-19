# "Guardado na sua conta": Estúdio Completo e Pinta na nuvem

**Data:** 18/08/2026 (revisado no mesmo dia, depois da revisão completa)  
**Status:** implementado (pendente QA em staging)

## Contexto

O Estúdio Completo (`/estudio`) e o Pinta (`/pinta`) guardavam os jogos e desenhos da criança
só no IndexedDB do navegador (o host até pedia `navigator.storage.persist()`, porque o Safari
despeja o IndexedDB depois de uma semana sem visita). Existia "Baixar/Trazer de volta", mas é
manual e complexo para criança. Na aula isso já estava resolvido com "Enviar para o professor" +
"Sincronizar com o enviado"; o Pensa sempre guardou no servidor. Faltavam os dois editores livres.

Decisão da Helena (18/08/2026): guardar na conta, **automático, por item**, com volta sozinha em
outro computador.

## Decisões

### O que sobe, e por onde

- **Cada item** (projeto do Estúdio, desenho do Pinta) sobe sozinho depois que o autosave confirma
  e desce sozinho onde falta. O IndexedDB continua sendo a cópia de trabalho (rápida, offline).
- O `members` guarda só o **ÍNDICE** (`members.creations`: perfil, ferramenta, `item_id`
  preservado, nome, kind, `item_updated_at` do cliente, `revision`, `bytes`, `storage_ref`,
  `thumb`, `deleted_at`, mais a RESERVA em voo em `pending_*` e o contador
  `last_reserved_revision`). O **blob** (gzip do `Project` / do `.pinta.json`) vai DIRETO ao
  **R2 UGC privado** por URL pré-assinada do BFF (`member-shell/src/routes/creations.ts`), o mesmo
  desenho dos anexos do hub — fora do teto de 2 MB da borda (um projeto do Estúdio chega a 33 M
  chars).
- Fluxo: `POST /api/creations/:tool/:id/upload` (BFF → members reserva: posse + quota + revisão,
  tudo em `pending_*` → BFF assina PUT com Content-Length/Content-Type) → PUT no R2 →
  `POST …/commit` (só a revisão RESERVADA confirma; o commit PROMOVE nome/kind/`item_updated_at`/
  thumb/bytes da reserva e devolve a chave anterior, que o BFF apaga do R2). Baixar: `GET
  …/download` (URL assinada) → gunzip. Apagar: lixeira lógica.
- Chave do objeto: `creations/<perfil>/<tool>/<item>/<rev>.json.gz` (imutável por revisão; a
  revisão vem de `last_reserved_revision + 1`, que nunca volta — duas reservas concorrentes, ou
  apagar e ressuscitar, nunca dividem a mesma chave).
- **Partes (19/08/2026, Estúdio):** um projeto COM assets não sobe mais inteiro a cada autosave.
  O blob principal vira um **manifesto** e cada asset uma **parte** endereçada por conteúdo; só o
  que a nuvem não tem é comprimido e enviado (ver "Protocolo de partes" abaixo). O Pinta segue no
  fio simples (sem `parts`).

### Protocolo de partes (19/08/2026)

| Decisão | Como ficou |
|---|---|
| Formato | 1 item = 1 linha/1 revisão por commit. Blob principal = **manifesto** `{format:'sz-studio-parts', version:1, program:<Project sem assets, assets:[]>, assets:[<sha256 hex>…]}` (ordem dos hashes = ordem dos assets; `sanitizeProjectAssets` dedupa/orça "primeiro que chega"). **1 parte por asset** = gzip do JSON canônico (`canonicalJson`: chaves ordenadas em profundidade) do `ProjectAsset` inteiro (id, nome, `dataUrl`, metadados). |
| Hash | SHA-256 hex do JSON canônico — nunca do gzip (não determinístico) nem só do `dataUrl` (nome/metadados diferentes colidiriam). Conferido na descida (`CREATION_PART_CORRUPT` recusa). `sha256Hex`/`canonicalJson`/`hashSupported` em `creations-cloud.ts`; sem `crypto.subtle` o Estúdio sobe inteiro. |
| Chave das partes | **por item, por conteúdo e por revisão de subida**: `creations/<perfil>/studio/<item>/parts/<sha256>.<rev>.gz` (`creationPartStorageKey` em **`@sistemazero/core/creations`** — a ÚNICA definição, usada pelo members e pelo BFF no HEAD do commit; `rev` = a revisão da reserva em que ESSA cópia subiu; parte conhecida mantém a sua). Uma chave nunca é reutilizada: o apagar best-effort de uma parte solta (que roda DEPOIS da resposta e pode atrasar) jamais alcança uma cópia nova da mesma parte que voltou ao item (revisão v3 de 19/08). GC trivial, purge por prefixo já cobre; dedupe entre projetos/perfis fica para uma v2. |
| Estado no servidor | colunas JSONB `parts` (corrente, `[{hash, bytes, rev}]`) e `pending_parts` (da reserva) na própria linha (`0070_creation_parts.sql`); `bytes`/`pending_bytes` = TOTAL (manifesto + Σ partes). `maxPartsPerItem = 128` (= `PROJECT_ASSET_LIMITS.maxAssetsCount`). Entrada sem `rev` é descartada pelo `sanitizeParts` (vira faltante: o cliente sobe de novo). |
| Reserva | `POST …/upload` aceita `parts: [{hash, bytes?}]` (≤128, hash `[a-f0-9]{64}`, sem repetidos). O members responde `missingParts` (só as que o item ainda NÃO tem, com `storageKey`; o BFF assina um PUT por parte, com o Content-Length dela). Parte faltante SEM `bytes` → 409 `CREATION_PARTS_NEED_BYTES {details.hashes}` e NADA é reservado. Bytes declarados para hash já conhecido são ignorados (valem os do servidor). Total > 40 MB → 409 de quota ("grande demais"; o BFF pré-confere o declarado). |
| Cliente (subida) | 1ª volta da reserva declara TODOS os hashes SEM bytes (o caso comum — "só o programa mudou" — termina aqui: zero gzip de assets); 409 need-bytes → comprime SÓ as pedidas e reserva de novo (≤ 3 voltas); PUT das partes faltantes em paralelo (4) e DEPOIS o manifesto; commit `{revision, uploadedParts}` (omitido quando não subiu parte: o corpo do Pinta não muda). `buildStudioCloudSnapshot` (kids `studio-cloud.ts`) monta manifesto + `CloudPart {hash, text()}` — o `text()` recalcula o canônico só se a parte precisa subir. |
| Commit | members exige `uploadedParts ⊇ (pending_parts − parts)` senão 409 `CREATION_PART_MISSING {details.hashes}` (a reserva FICA; o cliente reserva de novo). Antes do members, o BFF faz HEAD best-effort nas `uploadedParts` (8 em paralelo): 404 definitivo → 409 `CREATION_PART_MISSING` sem promover; erro de HEAD ≠ 404 segue. O commit promove `parts`, devolve `releasedStorageKeys` (manifesto anterior + partes que a revisão nova não referencia) e o BFF apaga em LOTE (`r2DeleteObjectsUgc`, depois da resposta). `previousStorageKey` continua (compat). 409 do commit apaga SÓ o manifesto recusado (as partes podem estar referenciadas por outra reserva em voo; sobram para o purge). |
| Download | um ticket: URL do manifesto + `parts: [{hash, bytes, url}]` de TODAS as partes correntes (GET assinado, TTL 600 s). O cliente (`resolveCloudProject`) reaproveita por hash o que o MESMO projeto já tem neste aparelho (`loadProjectAssetsSnapshotForCloud`: só a partição de assets, sem blocos) e baixa o resto (3 em paralelo, hash conferido); manifesto que aponta para parte fora da revisão → descida recusada (nada gravado). Blob antigo (`Project` inteiro) passa direto. `downloadProject(id)` do adaptador entrega o `Project` já resolvido ao host (projeto do Pensa sumido). |
| Lixeira | softDelete zera `parts` e devolve `storageKeys` (manifesto + partes); o BFF apaga em lote. |
| Compat | linhas antigas `parts=[]`; cliente antigo (sem `parts`) sobe o `Project` inteiro e isso SOLTA as partes no commit; sem migração de dados; ordem de deploy members → member-shell (+ kids, que vive nele). Janela de deploy/rollback (BFF/kids novos com members velho, que DESCARTA campos desconhecidos): partes declaradas + resposta sem `parts` → o BFF responde 503 `UPSTREAM_INCOMPATIBLE` e o kids lança `CLOUD_PARTS_UNSUPPORTED` (retentável) — nunca um manifesto commitado sem as partes. Borda: `members-creations-upload.maxBodyBytes` 64 KB (miniatura + 128 partes ≈ 24 KB). |
| O que NÃO faz | apagar partes na reserva superada ou varrer o prefixo do item na lixeira (concorrência — o purge cobre); HEAD bloqueante; tabela `creation_parts`/dedupe por perfil; cache de hash por asset no produtor (v1 hasheia a cada autosave: ms em projetos típicos; o digest roda fora da main thread). |
| Hash igual nos dois lados | `loadProjectSnapshotForCloud` devolve os assets SANEADOS (`sanitizeProjectAssets`, a mesma forma do `loadProjectAssetsById` que a descida compara): o hash da parte que sobe é o que a descida reaproveita. |

### Guardas da descida (revisão v3 de 19/08/2026)

O "local primeiro, nuvem depois" abriu duas janelas que a espera antiga fechava; o reconciliador
(`reconcileCreations`) ganhou duas guardas, usadas pelos dois adaptadores:
- **`isBusy(itemId)`** — o item está ABERTO num editor (Pinta: `isPintaAssetOpen`, registro
  alimentado pelo `EditorScreen`; Estúdio: `isProjectOpenAnywhere`): nem cópia de conflito nem
  gravação (antes, no Estúdio, o restauro recusado pela guarda de aberto deixava uma cópia
  "(deste computador)" órfã POR PASSE; no Pinta não havia guarda e a descida gravava por baixo do
  editor — o autosave seguinte sobrescrevia a versão que desceu e subia por cima da do outro
  aparelho). Pulado conta em `skipped`; a marca não avança. Se a criança editar antes da próxima
  descida, a subida cai em `CREATION_STALE_BASE` → cópia (nada se perde). O Estúdio refaz a
  descida ao VOLTAR à lista (`pullMissing` single-flight); o Pinta na próxima carga.
- **`localUpdatedAt(itemId)`** — relê o `updatedAt` do disco na hora de gravar: uma edição
  persistida DEPOIS do retrato do início da reconciliação (renomear, autosave) não é sobrescrita
  (era sobrescrita, e a subida seguinte virava nada porque marca = `updatedAt` do disco).
- **Reconciliação do Pinta uma vez por carga** (`RECONCILE_MIN_INTERVAL_MS` 60 s): a galeria relê
  o local a cada `changed`/`sync-end` chamando `listAllAssets()` — sem o intervalo, o fim de uma
  reconciliação abria a seguinte, em LAÇO (um `GET` da lista por volta, `syncing` piscando). Fora
  do intervalo, UM gatilho pontual: ao FECHAR um desenho que a descida pulou por estar aberto
  (`subscribePintaAssetOpenState` do pacote), a versão da nuvem entra na hora.
- **Cache de posse do members** (60 s): quem rebaixa a matrícula (webhook de assinatura
  `cancel`/`expire`, admin revogar/expirar) chama `invalidateToolOwnership` — a reserva seguinte
  já é 403, sem esperar o minuto.
- **GC no R2 resiliente**: se o `DeleteObjects` em lote falhar (SDK e R2 discordando do
  checksum, por exemplo) ou recusar parte das chaves, o BFF apaga as que faltaram uma a uma
  (`DeleteObject`, sem corpo) e avisa uma vez — o lixo não fica no bucket.
- **`restoreProject(id)`** no adaptador do Estúdio (o "Recriar projeto neste aparelho" do Pensa):
  baixa, restaura e só então avança a marca — sem a marca, a primeira edição subia com base 0 e
  virava cópia "(de outro aparelho)" espúria.
- **Base vencida com a versão da nuvem IGUAL à daqui** (mesmo `updatedAt`: outra aba deste perfil
  subiu antes de as marcas se encontrarem): só avança a marca, sem `-copia`. E o flush das marcas
  MESCLA com o storage (duas abas do mesmo perfil não se apagam).

### Regras do índice (o que a revisão de 18/08 fixou)

- **Nada do que a lista mostra muda na reserva.** Um PUT que não termina deixava o índice "mais
  novo" apontando para o blob velho e o reconciliador nunca mais subia a edição. Agora a reserva
  escreve só em `pending_*`; o commit promove.
- **Os bytes são os da reserva** (conferidos na quota e assinados no PUT); o commit não recebe
  bytes. Absurdos (`bytes` > 1 GB) caem na validação, não em 500.
- **Quota dentro da transação da reserva**, sob `pg_advisory_xact_lock` por PERFIL (quota) e
  por `(perfil, tool, item)` (revisão) — a primeira reserva de um item novo não tem linha para o
  `FOR UPDATE`, e duas abas reconciliando o mesmo item batiam na unique. `usage`/teto de itens
  contam só o que já commitou; o commit REVALIDA a quota sob o lock do perfil.
- **Commit idempotente**: confirmar de novo a revisão corrente é 200 (retry de um 200 perdido).
- **Revisão-base (2ª revisão de 18/08):** a reserva leva `baseRevision` = a revisão da nuvem que
  o APARELHO conhece para o item (das marcas de sincronia; 0 = nunca viu). Se não for a corrente
  (outro aparelho subiu depois), 409 `CREATION_STALE_BASE` — um aparelho atrasado NUNCA passa
  por cima às cegas (antes era perda silenciosa: B subia, A com a aba velha subia por cima, e B
  baixava a versão pior "porque a nuvem mudou"). Linha apagada aceita qualquer base (a edição
  posterior vence a lixeira; o outro aparelho baixa de volta); sem `baseRevision` não há
  conferência (clientes antigos). O cliente resolve o 409 do lado dele (ver sincronia).
- **Respostas só com os campos públicos** (`toCreationSummary`): nada de `userId`, `accountId`,
  `storageRef`.
- **Blobs antigos**: a cada commit o BFF apaga a revisão anterior (best-effort); um 409 do commit
  (revisão vencida ou quota) apaga a chave recusada, e a recusa por quota MATA a reserva (senão
  um commit tardio promoveria uma chave já apagada); a lixeira lógica também solta o blob (o
  members devolve `storageKey`, o BFF apaga) — apagado não fica fora da quota; só a linha do
  índice fica para um restauro futuro. O commit da revisão corrente é idempotente MESMO com
  outra reserva em voo (senão o BFF apagaria o blob vivo como "recusado"). A PURGA do usuário
  (exclusão pelo painel admin) tenta a limpeza imediata e o Members instala uma cerca + job durável
  pós-TTL antes de apagar o índice (endurecimento de 19/08; ver o plano de remediação dessa data).

### Regras de sincronia (`community-kids/src/lib/creations-sync.ts`)

- A régua NÃO é "quem é mais novo" (relógios de aparelhos diferentes não se comparam): é a
  **marca da última sincronia deste aparelho** (`SyncedMarks` em `localStorage`, por perfil ×
  ferramenta: `updatedAt` e REVISÃO da nuvem). Só na nuvem → baixa · só local → sobe · local
  intocado e nuvem mudou → baixa · local mudou e nuvem intocada → sobe · iguais → nada;
- **conflito real** (os dois lados mudaram desde a marca): o local vira **cópia** antes de a
  nuvem substituir — Pinta `nave-copia` (id novo), Estúdio "<nome> (deste computador)" via
  `importProjectSnapshot`. A cópia só é feita DEPOIS de a descida ter sido baixada e VALIDADA sem
  gravar (Pinta: `assetFromJson` + `sanitizePintaAsset`; Estúdio: `validateCloudProjectSnapshot`,
  o mesmo saneamento ESTRITO do restauro) — uma descida recusada não deixa cópia órfã a cada
  carga. A reconciliação é single-flight por instância (StrictMode/remontagem rápida não geram
  duas cópias com o mesmo nome);
- **conflito na SUBIDA** (409 `CREATION_STALE_BASE`, o aparelho estava atrasado): o item sai da
  fila e o adaptador (`onStale`) guarda a versão da NUVEM como cópia — Estúdio "<nome> (de outro
  aparelho)", Pinta `nome-copia` —, avança a marca para a revisão dela e sobe de novo o item daqui
  com a base certa. O item aberto no editor continua sendo o item (o id fica com ele); os dois
  sobrevivem;
- **as marcas avançam SÓ com o commit confirmado** (`onUploaded` da fila; NÃO roda se um apagar
  do mesmo item chegou com o upload em voo — a lápide manda) ou com uma descida gravada. Marcar
  ao enfileirar fazia um conflito real passar por "intocado" (edição offline perdida) e não
  marcar no upload gerava cópias falsas a cada ida e volta entre dois aparelhos;
- **lápide local**: apagar grava `{at, sent, revision}` em `localStorage`; um item ainda na nuvem
  com revisão do servidor ≤ a da lápide NÃO volta. Lápide legada sem revisão nunca compara
  relógios de aparelhos: oculta e reenvia o DELETE até receber revisão autoritativa. Só volta se
  uma revisão posterior provar que alguém editou depois. Apagar não espera o debounce;
- a descida tem teto de tempo (6 s) na primeira carga; o resto entra na próxima; nome já usado por
  OUTRO desenho local ganha sufixo (`nave-2`). A galeria do Pinta NÃO tem mais teto de quantidade
  (decisão dela, 18/08: "sem teto, igual o Estúdio") — busca e filtros mantêm as duas listas
  navegáveis;
- ⚠️ **limitação declarada da v1:** apagar num aparelho e ainda ter o item noutro faz ele voltar a
  subir (a lápide é local). Converge: fica em todos até apagar também lá.

### Fila do cliente (`creations-cloud.ts`)

Um envio por vez, só o snapshot mais recente por item; falha de REDE (`navigator.onLine`
false ou TypeError de fetch com as mensagens dos navegadores) → `offline` + backoff (2 s → 5 min),
e o `online` acorda a fila na hora, mesmo no meio da espera; 5xx, 409 de revisão no commit e PUT
que falhou no R2 (`STORAGE_PUT_FAILED`, URL vencida numa conexão lenta) → 3 tentativas (a reserva
nova traz URL nova; o selo segue "guardando" enquanto há tentativa — erro só ao desistir) e o
item sai da fila; 429 da borda → espera o `retry-after` (teto 5 min; NÃO acordável por
`flush`/`online`/`pagehide`, senão cada acordar gastava uma tentativa) e segue; `anySignal`
compõe sinais com fallback sem `AbortSignal.any` (Safari < 17.4); 4xx (quota, "grande demais" — o BFF já responde 409 de
quota acima de 40 MB —, sem posse, sessão de outro perfil) → sai da fila com recado de criança no
selo (`CLOUD_MESSAGES`); 409 de base vencida → `onStale` (acima). Estúdio sobe com 10 s de folga
(o projeto inteiro), Pinta com 2 s; um apagar (prazo 0) nunca é empurrado pelo debounce de um
upload enfileirado depois. Commit e DELETE vão com `keepalive` (chegam mesmo com a aba fechando).
Toda chamada leva `x-sz-viewer` = perfil que enfileirou: o BFF recusa (409 `VIEWER_MISMATCH`) se
a sessão já trocou de perfil (irmão que entrou no meio de um upload em voo — nem o jogo do A
entra no índice do B, nem a lista do B desce para o IndexedDB do A). Ao sair da página o host faz
`flush({timeoutMs})` e só então `dispose()` — com TETO (5 s; 3 s ao sair do editor PRO, e sem
espera nenhuma quando já está `offline`): a criança não fica presa num upload de vários MB nem
numa espera de backoff; o que ficar sobe na próxima carga (reconcilia).

### Estúdio (pacote)

- `persistProject(project, {silent, replace})`: o restauro da nuvem grava em silêncio e
  SUBSTITUI (apaga a partição de blocos quando o snapshot não traz blocos, e a capa antiga —
  senão blocos apagados noutro computador ressuscitavam aqui e subiam por cima). O apagar vem
  DEPOIS do `setMany`, no mesmo mutex (falha de quota não deixa o local sem blocos).
- `restoreProjectSnapshot(raw, {expectedId})` / `validateCloudProjectSnapshot` (sem gravar):
  recusa id inesperado/inválido ANTES de gravar; recusa projeto ABERTO em QUALQUER editor da
  página (registro `isProjectOpenAnywhere` alimentado por todas as stores, não só a default); e é
  ESTRITO — um snapshot cujo saneamento DESCARTARIA blocos ou o programa (bundle antigo lendo um
  jogo salvo por bundle novo: bloco desconhecido) é RECUSADO em vez de gravado com aviso (gravar +
  `replace` apagaria a partição de blocos local, o autosave subiria o vazio e o outro aparelho
  baixaria o vazio por cima do jogo de verdade). Canvas VAZIO da origem (`{szBehaviorAreasVersion}`)
  não é "descartado": passa sem aviso e apaga a partição.
- **Biblioteca "Meus desenhos" é POR APARELHO** (não sobe). O jogo carrega `libRevision` por asset;
  o restauro só atualiza o lado comprovadamente mais velho. Divergência legada sem revisão preserva
  as duas versões e religa o projeto à cópia restaurada (endurecimento de 19/08).
- `persistProjectAssets` (troca de desenho pelo Pinta) bumpa `updatedAt` no meta: é a régua da
  nuvem (sem isso a outra máquina via "iguais" e nunca baixava a troca de desenho).
- A rota PRO (`/estudio/pro/[id]`, modo Código) também liga o espelho (só `attach`; a descida é
  na lista). Miniaturas dos cards NÃO viajam (o card fica sem capa no outro aparelho até abrir).

### Quota e posse

`CREATION_LIMITS`: 40 MB comprimidos por item, 1 GB por perfil (as duas ferramentas; era 300 MB —
subiu em 18/08 porque bytes no R2 custam ~US$ 0,015/GB-mês e o download é grátis: o teto é freio
de abuso e bug, não decisão de custo, e com 1 GB o aviso "sem espaço" vira raridade), 2000 itens
vivos por ferramenta (freio de abuso: nem o Pinta nem o Estúdio têm teto de quantidade; o que
governa é o de bytes); a quota é conferida na reserva E de novo no commit (reservar vários itens
antes de confirmar não fura o teto); reenviar TROCA os bytes do item. Nome (120) e kind (40) são CORTADOS no BFF,
não recusados (o Estúdio aceita nomes de 200; um 400 deixava o jogo sem subir para sempre); a
miniatura acima de 12 k é descartada. Posse (`estudio-completo`/`pinta` pela CONTA) só na
RESERVA: listar/baixar/apagar o que é seu não exige assinatura ativa — a criança sempre traz de
volta o que já guardou.

### O que fica de fora

Biblioteca "Meus desenhos" do Estúdio (derivada do Pinta; por aparelho — mas ADOTA os desenhos
que chegam com um jogo restaurado, ver acima), `game-storage` (estado salvo do jogo), lixeira com
tela de restauro (o `deleted_at` já deixa pronto), versão anterior por item, adulto (o mecanismo é
app-agnóstico; entra quando o adulto ganhar a rota), miniaturas na nuvem (a coluna `thumb` existe;
nenhum adaptador manda ainda). Ids de item no índice: até 64 chars (ulid e `pensa-<uuid>` cabem;
o Estúdio aceita ids de host até 128 — um id maior nunca subiria).

## Onde vive

| Peça | Arquivo |
|---|---|
| Índice + rotas + quota | `members`: `domain/creations/*` (`creationPartStorageKey`, erros `CreationPartsNeedBytesError`/`CreationPartMissingError`), `application/creations/creations.service.ts`, `infrastructure/persistence/drizzle/creations.repository.ts` (`resolveParts`), `interfaces/http/routes/creations.routes.ts`, migrations `0067_creations.sql`, `0069_creations_usage_idx.sql`, `0070_creation_parts.sql` |
| Borda | `api-gateway/gateway.config.ts` (`members-creations-*`) |
| BFF (assina R2 — manifesto + partes —, HEAD das partes no commit, apaga em lote o que a revisão soltou, confere `x-sz-viewer`) | `member-shell/src/routes/creations.ts`, `server/clients.ts` (`listCreations`…), `server/r2.ts` (`r2DeleteObjectUgc`, `r2DeleteObjectsUgc`, `r2HeadObjectUgc`), `lib/types.ts` |
| Shims kids | `community-kids/src/app/api/creations/**` |
| Cliente + fila (+ partes: `canonicalJson`, `sha256Hex`, `CloudPart`, dança do need-bytes, `fetchPart` com hash conferido) | `community-kids/src/lib/creations-cloud.ts` |
| Reconciliador + marcas + lápides | `community-kids/src/lib/creations-sync.ts` |
| Pinta (host) | `community-kids/src/lib/pinta-cloud-persistence.ts` embrulha `createPintaPersistence` (exportado em `@sistemazero/pinta`) |
| Estúdio (pacote) | `studio/src/state/persistence.ts` (`setStudioCloudMirror`, `persistProject(_, {silent, replace})`), `projectStore.restoreProjectSnapshot`, `restoreProjectFromCloud`/`loadProjectSnapshotForCloud`/`loadProjectAssetsSnapshotForCloud` no `index.ts` |
| Estúdio (host) | `community-kids/src/lib/studio-cloud.ts` (`buildStudioCloudSnapshot`, `isStudioPartsManifest`, `resolveCloudProject`, `downloadProject`) + `studio-full-client.tsx` (lista local primeiro, descida em segundo plano) + `studio-pro-client.tsx` (só `attach`) |
| Selo | `community-kids/src/components/kids/cloud-save-badge.tsx` (camada por cima no Estúdio; irmão do app no Pinta) |

## Testes

`members/tests/integration/creations.test.ts` (fake; inclui PARTES: faltantes/need-bytes/
`uploadedParts`/released/legado/lixeira e as validações) e `tests/db/creations.repository.test.ts`
(Postgres real: lock, quota na transação, reservas concorrentes, contador, idempotência) +
`tests/db/user-data-purge.test.ts` (tabela nova); `member-shell/tests/creations-routes.test.ts`
(cortes, blob anterior, body vazio, `x-sz-viewer`, impersonação; PARTES: N+1 PUTs, pré-checagem
do total, HEAD → 409, apagar em lote no commit/lixeira, download com N GETs); `api-gateway`
(config, teto do corpo da reserva); `community-kids/tests/creations-cloud.test.ts` (PARTES: dança
do need-bytes, PUT das partes antes do manifesto, `uploadedParts`, só-programa = 1 reserva,
`fetchPart` conferindo hash, `CREATION_PART_MISSING` retentável, `canonicalJson`),
`creations-sync.test.ts`, `pinta-cloud-persistence.test.ts`, `studio-cloud.test.ts` (manifesto
na subida, descida reaproveitando partes locais, legado, parte sumida recusada,
`downloadProject`); `studio/src/state/persistence.test.ts` (espelho, restauro que substitui,
guardas de id/aberto, `updatedAt` dos assets, `loadProjectAssetsSnapshotForCloud`).

## Pendências para o QA em staging

1. CORS do bucket UGC de staging (`testes-ugc`) precisa aceitar `PUT` com `Content-Type:
   application/gzip` das origens da comunidade kids (o mesmo CORS dos anexos do hub) e `GET`.
2. Migration `0067` aplicada pelo preDeploy do members.
3. Roteiro: criar jogo/desenho num perfil → selo "Guardado na sua conta" → apagar dados do site (ou
   outro navegador) → entrar → jogos e desenhos voltam; apagar um item → some no outro aparelho na
   próxima carga (e não volta neste); dois aparelhos no mesmo item → a NUVEM fica com o id na
   descida (o local vira cópia "(deste computador)") só se os dois mudaram desde a última
   sincronia — não é "o mais novo vence" —, e ida-e-volta sem edição cruzada NÃO cria cópia; aba
   velha subindo por cima do que outro aparelho já subiu → cópia "(de outro aparelho)" aparece e o
   item daqui sobe (nada se perde); sem internet →
   selo "Sem internet", volta a subir ao reconectar (na hora); editar no modo Código (PRO) e abrir
   noutro aparelho; trocar de perfil com upload em voo → 409 e nada cruza. Conferir as chaves
   `creations/…` no R2 (a anterior some a cada commit).
4. Rate limit da borda (300/min em upload/commit) × primeira sincronia de uma galeria grande
   (a fila anda no compasso de 250 ms quando há > 10 pendentes e honra `retry-after`).
4b. PARTES (19/08): jogo com sprites → no R2 aparecem `<rev>.json.gz` pequeno + `parts/<hash>.gz`;
   editar blocos por 1 min → só manifestos novos (KB) e nenhuma parte; trocar um desenho → 1 parte
   nova e a antiga some no commit; outro aparelho baixa só as partes que não tem; apagar → manifesto
   e partes somem; áudio de 5 MB (uma parte); blob antigo (`Project` inteiro) baixa e restaura; aba
   com bundle antigo sobe o `Project` inteiro e as partes somem. Migration `0069`/`0070` pelo
   preDeploy do members ANTES do member-shell. Com isso o `idleMs` do Estúdio (10 s) pode cair para
   ~5 s (decisão de produto, não feita).
5. O curso "O Jogo do Meu Jeito" (Aula 1 "onde os jogos ficam guardados", Aula 2 "cópia de segurança
   da galeria") descreve o mundo só-IndexedDB: revisar o texto e o LEIA-ME quando isto entrar em
   produção.
6. ~~Varredura de blobs órfãos na purga~~ — feita: `purgeCreationBlobs` no admin (antes do members
   e de novo antes do auth).

## Desempenho (rodada de 19/08/2026)

Medições leves atrás de flag (`localStorage['sz:perf']='1'` ou `?szperf=1`; helpers `perf.ts` em
`pinta/src/core`, `studio/src/core`, `community-kids/src/lib`; saída `[sz:perf]` no console e User
Timing no DevTools) + testes sintéticos que registram tempo sem assertar tempo (`*.perf.test.*`):
`pinta/src/components/gallery/galleryLoad.perf.test.tsx` (520 desenhos), `pinta/src/state/persistence.test.ts`
(500 desenhos × 50 autosaves, contadores do mock de IDB), `studio/src/projects/ProjectList.perf.test.tsx`
(500 projetos com capa), `community-kids/tests/creations-cloud.perf.test.ts` (gzip de ~5 MB).

### Antes (árvore de 19/08, antes das otimizações; happy-dom/Bun, máquina de dev)

| Medida | Antes |
|---|---|
| Pinta: abrir a galeria até os 520 cards (happy-dom, sem canvas) | 640 ms |
| Pinta: busca até 1 resultado em 520 | 140 ms |
| Pinta: 50 autosaves de 1 desenho com 500 na galeria | `getMany` de **25.000** chaves (500 por autosave), 105 ms no mock (IDB real: muito mais) |
| Estúdio: abrir a lista até os 500 cards (meta + capa de 15 KB) | 753 ms, `getMany` de 1.000 chaves |
| Estúdio: busca até 1 resultado em 500 | 85 ms |
| Kids: gzip de um projeto de 4,6 MB (assets base64 incompressíveis) | 118 ms → 3,45 MB (Bun; navegador é mais lento) |

### Depois (mesma máquina, árvore de 19/08 com as Ondas 1 e 2)

| Medida | Antes | Depois | O que mudou de verdade |
|---|---|---|---|
| Pinta: 50 autosaves de 1 desenho com 500 na galeria | `getMany` de **25.000** chaves, 105 ms (mock) | **0** `getMany` (50 `keys()` baratos), 14 ms | orçamento incremental por inventário (`GalleryBackupSizeCache.seed/syncIds/projectedBytes`) — no IndexedDB real a diferença é de segundos |
| Pinta: abrir a galeria até os 520 cards (happy-dom) | 640 ms | ~620 ms (commit da lista ≈ 495 ms = 12,5 mil nós DOM do happy-dom, ~1 ms/card) | o número sintético é construção de DOM do happy-dom (não pinta, não faz layout); no navegador o ganho vem das thumbs REDUZIDAS (≤192 px, não 256²–480² por card), pintadas só perto da viewport, e de `content-visibility: auto` nos cards fora da tela |
| Pinta: busca até 1 resultado em 520 | 140 ms (re-render de TODOS os cards) | 119–141 ms de relógio, mas **2 commits de React de 5 ms + 3 ms** (`useDeferredValue` + `AssetCard` memo + filtragem memoizada) | o relógio é o agendador do React no Bun + o `waitFor`; o trabalho de renderização caiu de "todos os cards" para "só o resultado" |
| Estúdio: abrir a lista até os 500 cards (meta + capa de 15 KB) | 753 ms, `getMany` de 1.000 chaves | 620–670 ms | `ProjectCard` memo + `Intl` de módulo, `content-visibility`; a lista continua lendo capas (decisão: é o que o card mostra); a varredura de desenhos e a descida usam a lista LIGHT (0 capas) |
| Estúdio: busca até 1 resultado em 500 | 85 ms | ~90 ms de relógio (commits pequenos; `useDeferredValue` + índice normalizado) | idem Pinta |
| Estúdio: evento de UM projeto (autosave/restauro) | `reload()` da lista inteira (1.000 chaves) | `getMany` de 2 chaves (`loadProjectSummaryById`) | `PROJECT_CHANGED_EVENT` + `refreshProject(id)` |
| Kids: subida do Estúdio "só o programa mudou" num jogo de 4,6 MB (20 sprites) | stringify + gzip de 4,6 MB (116 ms) → PUT de **3,45 MB** a cada 10 s de edição | hash dos 20 assets 17 ms (digest fora da main thread) + gzip do manifesto de 33 KB em **1 ms** → PUT de **2,3 KB** | protocolo de partes; trocar UM sprite = 1 parte (gzip 5 ms, 177 KB) |
| Kids: primeira tela do Estúdio com tudo já no IndexedDB | espera a descida inteira (até ~6–10 s de "Carregando…") | lista na hora; a descida entra card a card em segundo plano | `setMod` antes do `pullMissing`, `PROJECT_CHANGED_EVENT`, `syncing` no selo |
| Kids: primeira tela do Pinta | `listAllAssets` esperava a reconciliação (4 s + 6 s de orçamento) | local na hora; `sync-start/changed/sync-end` por `subscribe` | wrapper local-primeiro |
| Kids: marcas de sincronia com 300 itens | releitura + `JSON.parse` do `localStorage` em TODO acessor (O(N²) por carga, ~24 MB) | `Map` em memória, escrita coalescida (100 ms) | `createStoredSyncedMarks` com registro compartilhado |
| Kids: primeira sincronia de galeria grande × 300/min da borda | 429 derrubava o item | `retry-after` + compasso de 250 ms acima de 10 pendentes | fila |
| Members: quota por salvamento | `count/sum` sobre as linhas vivas 2× sob lock, sem índice coberto; posse consultada a cada reserva | index-only scan (`creations_usage_idx`); posse em cache de 60 s; `list` sem `thumb`/`pending_*`; DELETE do R2 depois da resposta | Onda 1B |

**Worker de gzip: NÃO (decisão de 19/08).** Com as partes, o gzip por autosave do Estúdio é o do
manifesto (KB, ~1 ms) e o hash (≈ 1 ms/asset de 180 KB, digest fora da main thread); o gzip de
assets só acontece quando um desenho muda (5 ms por sprite de 180 KB; um áudio de 5 MB ≈ 120 ms,
uma vez). Nada disso justifica um Worker (que, pelo desenho do pacote, só tiraria o deflate — já
fatiado pelo `CompressionStream` — e não o `stringify` nem a leitura do IndexedDB). Reabrir se
`kids:cloud:gzip-parts`/`kids:studio:hash` mostrarem long tasks > 100 ms recorrentes em aparelhos
fracos; o esqueleto está descrito no plano (`gzip.worker.ts` com fallback para a main thread).
Janela real de virtualização nas grades: também NÃO (lib nova, contagens dos testes de UI,
`content-visibility` + thumbs reduzidas já cobrem); reabrir se os cenários vetoriais em SVG inline
pesarem (aí: rasterizar thumbs vetoriais com cache por `updatedAt`).
