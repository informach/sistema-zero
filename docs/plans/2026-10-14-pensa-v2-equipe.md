# Pensa v2: plano em equipe (14/10/2026)

> Histórico: substituído pela [especificação funcional de 16/10/2026](2026-10-16-pensa-reestruturacao-spec.md). Este documento registra decisões anteriores e não define o contrato vigente.

Pedido da dona: *"planejar juntos, na hora de construir, e pode dividir funções. Por exemplo uma
fica com o estúdio, a programação do estúdio, e a outra fica com as artes no Pinta ou no Molda."*
Proposta aprovada ("Pode seguir assim"). Esta é a especificação de implementação: contratos,
regras e quem mexe em quê. O contrato compartilhado já está em `@sistemazero/core/pensa`
(`effectivePensaRoles`, `canWorkOnPensaMission`, `pensaMissionWorkers`, `nextPensaMissionFor`,
`PensaJourneyTeam`, `PensaJourneyTeamView`, `PensaTeamPerson`, `PensaTeamArtItem`, campos
`role?`/`team?` em `PensaJourneyView` e `PensaJourneyListItem`). Não duplique essas regras.

## 1. Regras de produto

1. **A equipe** é a dona do plano + quem entrou pelo código `ZAP-XXXXXX` (o mesmo convite do
   plano clássico, mesmos tetos: até 5 pessoas que entraram, cada perfil em até 20 planos de
   outros; entrar exige o Pensa, como hoje).
2. **Duas funções.** `code` = **Programação** (o Estúdio): exatamente UMA pessoa, a dona por
   padrão. O jogo mora no Estúdio dela (`studio/pensa-<id sem hífens>` do perfil de quem
   programa). `art` = **Artes** (Pinta e Molda): zero ou mais pessoas. Sem ninguém nas artes,
   quem programa também desenha. Os papéis efetivos saem SEMPRE de `effectivePensaRoles`.
3. **Cada missão é de quem tem a função**: Estúdio → quem programa; Pinta/Molda → as artes. Com
   duas ou mais artistas, quem COMEÇA a missão fica com ela (`assignee`).
4. **Quem pode o quê:**
   - Toda a equipe: ver o plano, conversar com o Zappy (`start` planning/help/repair), aceitar a
     proposta (`accept`), guardar/tirar ideias, pausar/retomar, `retry`/`work`, cancelar a
     preparação, ouvir as falas (voz), ver os papéis e a lista de pessoas.
   - **Só quem programa**: testar a versão (`test`/`record_test`/`observe`/`repair`), concluir
     (`close`), guardar versão (`increment`), restaurar (`restore`), adaptar o caminho
     (`revise`) e as proteções (`protect`). Tudo isso usa o jogo salvo NO ESTÚDIO DELA.
   - **Só a dona**: renomear, arquivar, apagar, gerar/desligar o código, tirar alguém, definir
     os papéis.
   - Quem entrou pode sair (a dona não sai; ela apaga).
5. **Trocar quem programa** só antes de o jogo começar: nenhuma missão do Estúdio do ciclo
   atual com progresso ≠ `planned` e nenhum checkpoint guardado. Depois disso, 409
   `PENSA_CODE_LOCKED` ("O jogo já começou no Estúdio de quem programa. Essa função não muda
   mais neste plano."). Se quem programa sai ou é tirada, a função volta para a dona (o jogo
   fica no Estúdio de quem saiu; a tela da dona avisa antes de tirar).
6. **"Trazer da equipe"**: no Estúdio de quem programa, um botão lista as artes ENTREGUES em
   missões do plano (Pinta/Molda concluídas por OUTRA pessoa) e traz para os materiais do jogo.
   Só artes de missões do plano; nada da galeria pessoal da colega.
7. **Cada criança vê a SUA próxima missão** (`nextPensaMissionFor`); sem nenhuma, "Esperando a
   arte da Bia" / "Esperando a programação do Leo".
8. Fora agora: duas programando o mesmo jogo; sincronizar a arte sozinha quando a colega edita
   (trazer de novo pega a versão nova).

## 2. Members (dono: agente A)

### 2.1 Banco (migration nova; gere com `bun run db:generate --name pensa_v2_team`)

- `members.pensa_project_roles`: `project_id uuid not null` FK `pensa_projects(id) on delete
  cascade`, `profile_id uuid not null`, `role varchar(8) not null` com CHECK `role in
  ('code','art')`, `assigned_by uuid not null`, `created_at timestamptz not null default now()`.
  PK `(project_id, profile_id, role)`; índice único PARCIAL `pensa_project_roles_code_uq` em
  `(project_id) where role = 'code'`; índice por `profile_id`.
- `members.pensa_tasks`: `assignee_profile_id uuid null`, `completed_by_profile_id uuid null`.
- ⚠️ Numeração: hoje a última é a `0111`. As oficinas ao vivo (outra sessão) vão entrar depois
  com migrations renumeradas; a nossa pode ser renumerada na hora do commit. Use `ADD COLUMN IF
  NOT EXISTS`/`CREATE TABLE IF NOT EXISTS` no SQL e confira que o `when` fica acima da marca
  d'água da `0111` (regra do CLAUDE.md do members).
- DDL à mão dos `tests/db` que tocam essas tabelas ganham as colunas/tabela (regra do banco
  compartilhado: `create … if not exists` + `alter … add column if not exists`).

### 2.2 Acesso no v2 (`pensa-journey.repository.ts`)

- O `owned(actor)` (só a dona) vira duas réguas: **`accessible(actor)`** = dona (qualquer
  status) OU membro de `pensa_project_members` com o projeto `active` (a mesma do
  `accessibleProject` do plano clássico), sempre `audience = 'kids'`; e **`ownerOnly(actor)`**.
- `list`: os planos v2 da dona + os em que ela entrou; cada item com `role` e `team:
  {memberCount, ownerFirstName}` (1º nome da dona via `AuthGateway.getProfileIdentities`,
  best-effort → `null`).
- `get`: `accessible`; a view ganha `role` e `team: PensaJourneyTeam` (papéis EFETIVOS, sem
  nomes). `checkpoints` são os de quem programa (não do ator).
- `create`: como hoje (dona).
- `archive`/`delete`: dona → senão **403 `PENSA_NOT_OWNER`** ("Só quem criou o plano pode
  fazer isso.", a mesma frase do plano clássico). Pessoa de fora: 404 como hoje.
- `command`: `accessible`; os comandos `observe`, `record_test`, `repair`, `close`, `revise`
  exigem quem programa → **403 `PENSA_NOT_PROGRAMMER`** ("Quem testa e guarda as versões é
  quem programa o jogo.").
- `start`, `cancel`, `claim`, `publish`, `fail`, `voice`: `accessible` (o ator é quem disparou;
  `pensa_operations.profile_id` segue sendo o ator).
- `protect` (prepare/commit/restore/increment): quem programa → senão 403
  `PENSA_NOT_PROGRAMMER`.
- `delete` (dona): os prefixos R2 de limpeza passam a cobrir TODOS os perfis com dado do plano
  (`creations/<perfil>/pensa/<projectId>/` para a dona, para cada membro e para cada
  `pensa_checkpoints.profile_id` do projeto), não só o ator.

### 2.3 Equipe para o v2

- Tirar `assertLegacyPensa` de `setShareCode` e `addMember`: o código e a entrada passam a
  valer para planos v2 (as rotas clássicas `POST /members/pensa/projects/join`,
  `POST|DELETE …/:projectId/share`, `GET …/:projectId/members`,
  `DELETE …/:projectId/members/:profileId` seguem sendo AS rotas; confira que cada uma funciona
  com projeto v2 e que o `join` devolve algo de onde o BFF tira o `projectId`).
- `removeMember` (sair ou tirar) apaga, na mesma transação, as linhas de papel da pessoa.
- **`GET /members/pensa/v2/projects/:projectId/team`** (equipe toda) →
  `PensaJourneyTeamView` (pessoas com 1º nome e foto best-effort, como o `list-project-members`;
  `shareCode` cru só para a dona; `maxMembers`; `roles` efetivos; `codeLocked`).
- **`PUT /members/pensa/v2/projects/:projectId/roles`** body `{code: uuid, art: uuid[] (≤ 6)}`,
  dona → senão 403 `PENSA_NOT_OWNER`. Todo id precisa ser da equipe (400). Trava a linha do
  projeto (`for update`), aplica a regra 5 (409 `PENSA_CODE_LOCKED`), troca as linhas de uma vez
  (`code` igual à dona = sem linha `code`; `art` vazio = sem linhas `art`) e devolve a
  `PensaJourneyView` atualizada. Incrementa `pensa_journeys.revision` (as telas das colegas
  percebem a mudança).
- **`GET /members/pensa/v2/projects/:projectId/team-capabilities`** (equipe toda; consumida só
  pelo BFF para montar os recursos do plano em equipe) →
  ```ts
  {
    code: {
      profileId: string
      level: string | null            // slug do posto (kids), null se não deu para calcular
      blocks: string[]                // blocos conquistados (GetStudioUnlocksService)
      access: { studio: boolean; pinta: boolean; molda: boolean } // posse da CONTA dela
      creations: { pinta: CreationSummaryLike[]; molda: CreationSummaryLike[] } // ≤ 200 cada, vivas
    }
    art: Array<{ profileId: string; level: string | null; access: { pinta: boolean; molda: boolean } }>
  }
  ```
  `access` = posse pela CONTA de cada pessoa (refs `estudio-completo`, `pinta`, `molda`; a
  chave-mestra NÃO conta, régua do `/members/access`). `CreationSummaryLike` = o mesmo formato
  dos itens de `GET /members/creations/:tool` (o BFF reaproveita `journeyInventory`).

### 2.4 Missões

- `PensaTaskView` (etapa e handoff) ganha `assigneeProfileId: string | null` e
  `completedByProfileId: string | null`.
- `updateTaskProgress` numa tarefa de jornada v2:
  - papel: `canWorkOnPensaMission(destination, ator, papéis)` → senão **403
    `PENSA_NOT_YOUR_MISSION`** ("Essa missão é de outra pessoa da equipe.");
  - com assignee definido e diferente do ator, e a tarefa fora de `planned` → **409
    `PENSA_MISSION_TAKEN`** ("Outra pessoa da equipe já está fazendo essa missão.");
  - ao sair de `planned`, grava `assignee_profile_id = ator`; ao concluir, grava
    `completed_by_profile_id = ator`; voltar de `completed` limpa `completed_by`;
  - ⚠️ a evidência (a criação guardada) passa a ser conferida no perfil e na conta do ATOR
    (`creations.user_id = ator`, `account_id = conta do ator`), não mais da dona do projeto.
- Handoff (`GET /members/pensa/tasks/:taskId/handoff`): se o ator não pode fazer a missão pelo
  papel, `capability: {owned: false, blockedReason: 'Essa missão é de quem programa o jogo.'}`
  (Estúdio) ou `'Essa missão é de quem cuida das artes.'` (Pinta/Molda). Missão pega por outra
  artista: `'Outra pessoa da equipe já está fazendo essa missão.'`.

### 2.5 Artes da equipe ("Trazer da equipe")

- **`GET /members/pensa/v2/projects/:projectId/team-art`** (equipe toda) →
  `{items: PensaTeamArtItem[]}`: tarefas NÃO arquivadas do projeto (todos os ciclos), concluídas,
  com `outputRef` `pinta_asset`/`molda_asset`, `completed_by_profile_id` ≠ ator, cuja criação
  ainda existe (viva e confirmada) na conta de quem concluiu; `updatedAt`/`revision` vêm da
  criação. Mais recente primeiro, até 100.
- **`GET /members/pensa/v2/projects/:projectId/team-art/:taskId/download`** (equipe toda) → o
  MESMO formato do `GetCreationDownloadService` (`{storageKey, revision, bytes, summary,
  parts}`), mas da criação de `completed_by_profile_id` (ferramenta e `assetId` do `outputRef`).
  Autoriza: ator na equipe, tarefa do projeto, concluída, com `outputRef` de arte. Senão 404.

### 2.6 Testes do members

Integração sobre o fake (dona, Bia, Leo com contas distintas): acesso por papel, 403/409 novos,
papéis com a régua 5, equipe via código em plano v2, `team`, `team-capabilities`, `team-art` e
download. `tests/db` para o SQL novo que o fake não alcança (o `accessible` do v2, o
`for update` dos papéis, a evidência pelo ator, o `team-art`).

### 2.7 Gateway

`members-pensa-v2` ganha `PUT` nos `methods` (o resto já cabe no wildcard `/members/pensa/v2/*`).

## 3. BFF member-shell (dono: agente B)

- `routes/pensa-journey.ts` (shim do kids `app/api/pensa/v2/[...path]` já é catch-all):
  - `POST /api/pensa/v2/projects/join` `{code}` → `members.pensaJoinProject` → `{projectId}`.
  - `GET …/:id/team` → members `team`.
  - `PUT …/:id/roles` → members `roles` (Zod estrito).
  - `POST|DELETE …/:id/share` → clientes clássicos (`pensaShareProject`/`pensaUnshareProject`).
  - `DELETE …/:id/members/:profileId` (`me` ou uuid) → `pensaRemoveProjectMember`.
  - `GET …/:id/team-art` → members.
  - `GET …/:id/team-art/:taskId/download` → ticket do members + URLs assinadas do R2 UGC
    (mesma mecânica do `creationsDownloadUrl`: `downloadUrl` do blob, `parts` com URL, TTL
    300/600 s) → `{downloadUrl, revision, bytes, item, parts, serverNow}`.
  - A árvore de caminhos passa a aceitar até 5 segmentos; uuid validado em cada id.
  - `test`/`close`/`increment`/`restore`/`revise`: antes de tudo, se `view.team` existe e
    `view.team.roles.code !== actor.profileId` → 403 com a frase de 2.2.
  - Escritas seguem bloqueadas em impersonação somente leitura.
- `server/pensa-journey/context.ts`: `loadJourneyContext(members, user, query, options?)` ganha
  `options.projectId`. Plano em equipe (`team.memberCount > 0`): busca `team-capabilities` e monta
  o snapshot assim: Estúdio (posto, blocos, extensões, dimensões, `studio`, `tutor`) de quem
  PROGRAMA (`earnedStudioTier(code.level, role, code.blocks)` — `role` só vale se quem programa
  for a própria sessão), `pinta`/`molda` = alguém das artes tem (`creativeToolAvailability`
  com o posto e a posse de cada uma), `moldaTools` = união pelas faixas dos postos das artes,
  inventário (`existingCreations`) = as criações de quem programa. `profileId` do snapshot =
  sempre a sessão (o members confere com o ator). Plano solo: como hoje. Falha ao ler a equipe:
  `JourneyChildError('Não consegui conferir os recursos da equipe. Tente de novo.')`.
- `workJourney` e o `accept` passam o `projectId` ao contexto.
- Tipos/clients novos em `lib/types.ts` e `server/clients.ts` (ou `pensa-journey-client.ts`).
- Testes: rotas novas (papel, 403, join), contexto em equipe (snapshot montado das duas pessoas).

## 4. Pensa (dono: agente C)

`JourneyApp` (+ `playground/journey.ts`, `styles/journey.css`, `core/types.ts`, testes):

- **Equipe no cabeçalho do jogo**: "Equipe · N" (só com memberCount > 0 ou para a dona) abre a
  janela da equipe v2 (molde do `TeamDialog`, caminhos `/v2/projects/:id/team|share|members`):
  código (dona: criar, copiar, gerar outro, desligar), pessoas, sair/tirar em dois passos e a
  seção **Funções**: "Quem programa (Estúdio)" (rádio entre as pessoas; trancado com
  `codeLocked`, com a frase) e "Quem faz as artes (Pinta e Molda)" (caixas; nenhuma marcada =
  quem programa também desenha). Só a dona edita; as outras leem. Salvar → `PUT …/roles`.
  Tirar quem programa avisa: "O jogo está no Estúdio de X. Se X sair, o jogo fica com X."
- **Entrar com um código** (home): passa a entrar DIRETO no v2 (`POST /v2/projects/join`) e abre
  o jogo; o erro do servidor fica ao lado do campo. O atalho do plano clássico continua em "Meus
  planos anteriores".
- **Lista "Meus jogos"**: chip "Em equipe · N" (meu) ou "De <dona>" (entrei); plano em que entrei
  sem a lixeira.
- **Missões**: o cartão da missão diz de quem é ("Sua missão" / "Missão da Bia"); "Meu caminho"
  mostra quem faz cada uma ("você" / 1º nome). Sem missão minha: cartão "Esperando a arte da Bia"
  (ou "a programação do Leo", ou "as artes da equipe") com o que ela pode fazer enquanto isso
  (ver o caminho, guardar ideias). Use `nextPensaMissionFor`.
- **Ações só de quem programa** (testar, concluir, guardar versão, restaurar, adaptar): para as
  outras, no lugar dos botões, "Quem testa e guarda as versões é o Leo.".
- **Ações só da dona** (renomear, arquivar, apagar): somem para quem entrou.
- **Atualização**: com `team.memberCount > 0`, um compasso de 20 s (aba visível, sem ação em voo)
  relê `GET /v2/projects/:id` e a etapa; nunca apaga o que está no campo de texto.
- Playground: `?v2=1&equipe=1` (Bia nas artes, eu programando; e um jogo da Bia em que eu entrei).
- Testes de componente cobrindo o acima.

## 5. Estúdio + Pinta + kids (dono: agente D)

- **Pinta** (`packages/pinta/src/export/studioLibrary.ts`, subpath `./studio-library`): nova
  `exportLoadedAssetForStudio(asset: PintaAsset)` que faz o mesmo que `exportAssetForStudio(id)`
  sem ler o IndexedDB (mapa de peças sem o conjunto de peças → erro `needs-tileset` com frase).
- **Molda**: ⚠️ OUTRA SESSÃO edita `packages/molda/**` — NÃO edite. Use só o que é público
  (`@sistemazero/molda`, `./assets`, `./studio-library`): v1 por `readMoldaDocument` +
  `exportLoadedAssetForStudio(asset, {namespace})`; cena (v2) pela fonte de nuvem pública
  (`createMoldaSceneCloudSource`) gravando num namespace temporário só da importação, exportando
  e apagando em seguida. Se a cena não puder ser convertida só com o público, erro com frase
  ("Esse modelo ainda não viaja pela equipe.").
- **Estúdio** (`packages/studio`): adapter OPCIONAL `teamLibrary` (molde do `pintaLibrary`:
  contexto + Provider + prop no `StudioCore`/tipos) e o botão **"👥 Trazer da equipe"** no
  painel de materiais (só com o adapter), abrindo uma janela que lista `{id, name, kind
  ('drawing'|'model'|'texture'|'sky'), byName, missionTitle, thumbDataUrl|null}` e importa por
  id. O import devolve o MESMO resultado do Pinta (desenho) ou do Molda (3D) e a janela segue
  pelo MESMO caminho de "adicionar ao projeto" das janelas do Pinta e do Molda.
- **Kids**:
  - `studio-full-client`/`studio-full-editor`: com um projeto `pensa-<32 hex>` aberto e o plano
    em equipe, monta o `teamLibrary`: lista por `GET /api/pensa/v2/projects/:planId/team-art` +
    nomes de `…/team`; importa baixando (`…/team-art/:taskId/download` → blob gzip →
    `DecompressionStream` → JSON) e convertendo (Pinta: `assetFromJson` +
    `exportLoadedAssetForStudio`; Molda: acima), grava em `savePersonalAsset` (`origin`
    `'pinta'`/`'molda'`) como os adapters atuais, e devolve. Sempre com `sessionFetch`.
  - Guias de missão (Pinta `TaskBriefPanel` via `pinta-client`, `MoldaTaskGuide`,
    `TaskGuidePanel` do Estúdio): com `capability.owned === false`, mostrar o `blockedReason` e
    o "Voltar ao plano", sem os botões de concluir (confira o que cada um já faz).
  - "Continuar no Pinta/Estúdio/Molda" depois de concluir (`use-next-mission-label`,
    `pensa-next-mission`): em equipe, só oferece a próxima missão que é MINHA
    (`nextPensaMissionFor` com os papéis da view); senão "Voltar ao plano".
- Testes: a janela do Estúdio, o adapter do kids (conversão e erros), os guias bloqueados.

## 6. Verificação final (integração)

`typecheck` + testes + `biome check` em core, members, member-shell, pensa, studio, pinta e
community-kids; `tests/db` do members com Postgres; QA no playground do Pensa (`?v2=1&equipe=1`).
