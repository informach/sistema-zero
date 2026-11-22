# Persistência: a matriz de quedas por borda de escrita (lote 6, 21/11/2026; lacunas fechadas em 22/11/2026)

Seção 13 da missão. Para cada borda em que o trabalho da criança é gravado e cada jeito de falhar,
o teste que prova que nada se perde, ou "—" quando não há teste. Levantamento por leitura dos
testes que existem (não rodados para este documento; os nomes estão como nos arquivos). Caminhos
relativos a `packages/`.

## Siglas dos arquivos

| Sigla | Arquivo |
|---|---|
| PC | studio/src/state/__tests__/persistence.cases.ts (rodado por `persistence.test.ts`) |
| SVC / EXC / PROM | studio/src/persistence/service.test.ts / exitConfirmation.test.ts / promotion.test.ts |
| IDB / INV | studio/src/state/__tests__/idbTransaction.cases.ts / projectDatabaseInvariant.cases.ts |
| COORD / SYNC / SEJ / CODEC / SCHED | studio/src/state/projectStorageCoordinator / projectSynchronousRecovery / synchronousExitJournal / exitJournalCodec / idbExitScheduling (.test.ts) |
| V4O / TRANS / REC / DOCS | studio/src/state/projectV4Opening / projectStorageTransport / projectStorageRecords / projectStorageDocuments (.test.ts) |
| BROW | studio/src/state/projectStorageBrowser.test.ts (módulos reais em Chromium, WebKit e Firefox) |
| GS / SSP / PBD / PPS / PO | studio/src/state/gameStorage / studioStores.persistence / __tests__/proBuilderDeletion.cases / pythonProjectStore / projectOperations |
| STU / RUN / PIS | studio/src/studio/__tests__/Studio.cases.tsx / components/preview/prepareRun.test.ts / PreviewIframe.save.test.tsx |
| BSE / BSG / BSS | studio/src/state/bridgeSyncEpoch / modes/bridgeStaleGuard / state/blocksStateSanitize (.test.ts) |
| WDP / WD / CW | studio/src/python/blocks/workspaceDraftPersistence / workspaceDraft / commitWorkspace (.test.ts) |
| FS / WCS | studio/src/modes/pro/proFsSync.test.ts / useWebContainerSync.test.tsx |
| PSY | studio/src/asset-library/__tests__/personalSync.cases.ts |
| L3 / L3P / L3R / LP / LB / BATCH | studio/src/project-migrations/localV3 / localV3Projects / localV3Recovery / localProjects / localBackups / batch (.test.ts) |
| E2E-flush / E2E-run / E2E-down / E2E-migr / E2E-pinta | studio/e2e/reload-flush.spec.ts / run-save-revision.spec.ts / storage-downgrade.flow.ts / project-migration.spec.ts / pinta-studio.flow.ts |
| SC / CC / CSY / LDC | community-kids/tests/studio-cloud / creations-cloud / creations-sync / lesson-draft-cloud (.test.ts) |
| SCT / LDS / LDP / LDK / LDO / LWD / SLS / TPL | member-shell/tests/studio-cloud-transport / lesson-draft-seed / lesson-draft-persistence / lesson-draft-coordinator / lesson-draft-outdated / live-workspace-drafts / studio-lesson-seed / studio-template (.test.ts) |
| MST / MSP / MSR / MLD / MCR | members/tests/integration/studio / db/studio-submission-previous / db/studio-submission-restore / integration/lesson-drafts / integration/creations (.test.ts) |
| E2E-mi / E2E-arte / SPS / LEH / CRD | studio/e2e/migration-interrupted.spec.ts (Chromium e WebKit) / community-kids/e2e-art-slots/art-slots.spec.ts (segundo caso) / community-kids/tests/studio-profile-switch.test.tsx / admin/tests/lesson-evidence-history.test.tsx / members/tests/db/creations.repository.test.ts |

## A matriz

| Borda | Aba fechada ou recarga no meio | Transação abortada ou cota cheia | Rede ou recusa do servidor | Segunda aba ou segundo aparelho | Versão defasada (formato novo lido por cliente velho) | Queda durante migração |
|---|---|---|---|---|---|---|
| 1. Editor → store | PC "materializa o buffer do editor antes do snapshot de pagehide" (flusher sintético); E2E-run "Rodar confirms the current buffer before an immediate reload…"; WDP "pagehide persists an unfinished gesture…" (Python); E2E-flush "desfazer um bloco e esconder a aba na mesma tarefa…" (BlocklyPanel real, 22/11) | RUN e PIS (falha de gravação preserva o código); CW "an incomplete gesture is saved before visual validation fails" | n/a (camada local); STU "getProject materializa uma edição pendente…" | BSG, BSE; STU "duas instâncias na mesma página não compartilham estado" | BSS (recusa versões desconhecidas); e2e `classic-long-sequence.spec.ts` "…não perde nenhum bloco" | só correção, sem queda: BSS, E2E-migr |
| 2. Store → autosave (1 s, teto 5 s) | SVC "esconder a aba grava… NA HORA", "pagehide + beforeunload… flusham UMA vez só"; PC "com o autosave EM VOO, o pagehide já PEDE a gravação do flush…" | PC "mantém o projeto sujo e registra erro quando o autosave falha", "um put que LANÇA…"; COORD (rascunho da cota) | SVC (estágio durável antes do debounce com backend remoto); PC "onSave rejeitado marca erro…" | SVC "dois saves rápidos do mesmo id… confirmam EM ORDEM"; PC "rename atômico invalida um autosave…" | REC "unknown document metadata survives partition round-trip" | parcial: V4O |
| 3. Autosave → transação IndexedDB | BROW (12 recargas com CAS em voo, CPU 6×); E2E-flush "enviar um céu de 1,5 MB e recarregar NA HORA…" | IDB "falha da transação (quota cheia)… não aplica NADA"; PC "falha de quota… NÃO apaga a partição de blocos…"; INV (todo commit explícito) | n/a | BROW fase two-tabs (a segunda aba recebe `ProjectWriteConflict`); COORD "two independent editors cannot overwrite the winning head…" | TRANS "future and malformed envelopes cannot be read…"; V4O (um projeto futuro isolado) | V4O "partial current v4 storage cannot fall back…"; L3 |
| 4. Saída da página (journal, CAS, v4) | E2E-flush (céu, Molda com modal aberta, aba escondida); BROW; SCHED | BROW com `STUDIO_STORAGE_EXIT_FAULT=abort` (Chromium e WebKit); SYNC (journal restaura quando a transação de saída aborta; cota não confirma cópia); SEJ; EXC | EXC "an external adapter retains its existing exit contract" | SYNC "same-sequence competing snapshots are both preserved…", "a returning old tab becomes a v4 copy…"; COORD | SEJ, CODEC, SYNC (futuro intocado) | SYNC "legacy sources retire only after complete v4 recovery"; L3R |
| 5. Migrações v1/v2/v3 → v4 | E2E-mi (30 projetos v3, recarga e aba morta oito vezes no meio da preparação; cada projeto inteiro em v3 ou completo em v4 com uma cópia; 22/11) | L3 / L3R (cota no segundo put não deixa metade); LP | BATCH (interrupção retomável no servidor) | L3 "an old tab returning after migration creates a copy…"; LP; V4O | E2E-down "um cliente v3 depois da migração não apaga nem altera o v4…"; L3, L3P | E2E-mi (queda real: recarga e processo da aba morto); L3P e LP "a saída da aba escondida no meio da promoção…"; BATCH; E2E-migr; LB |
| 6. Local → nuvem da conta | CSY (só o local mudou → sobe; marcas e lápides sobrevivem); SC (a marca só avança no commit); CC "a página morre no reserva / envio / commit / commit-chegou…" (22/11) | PC (o restauro substitui, com a cota que aborta tudo); CSY; CC (4xx não entra em laço); MCR | CC (offline tenta de novo, 5xx); SC (descida falha: a lápide sobrevive; manifesto incoerente recusado) | SC (cópias "(deste computador)" e "(de outro aparelho)"); CSY (relógio adiantado, duas abas mesclam); MCR (aparelho atrasado não passa por cima) | PC (restauro ESTRITO recusa bloco desconhecido); SC; CC; SCT | n/a |
| 7. Rascunhos de aula e envios | LDS; LDK (parte com envio em dia espera o commit); LWD; E2E-arte (POST abortado: recado, editor igual, rascunho vence ao recarregar, reenvio entra; 22/11) | LDP; SLS (banco indisponível não vira rascunho vazio) | LDC (prazo não confirma nem cancela; um bloco não segura o outro); LDP; SLS; MST | LDS (os dois mexeram: a mais nova abre, a outra fica guardada); LDC; LWD; MST (reenvio guarda a anterior); MSR; TPL (lógica do aviso) | LDO, LDP, LDC (página antiga); MST; MLD | sem queda simulada: MLD, SLS |
| 8. Materiais do Pinta e do Molda, cercas, game-storage | E2E-flush (três arquivos do Molda); PSY. **game-storage: —** | E2E-pinta (falha no segundo put não deixa metade da Vila); PSY (cota conserva o mundo fechado inteiro); GS (corta por desenho) | PSY; CC (parte ausente é temporária); PBD | PSY (jogo aberto no meio da varredura); PC (não recria partição apagada); GS (gravação depois do delete não ressuscita); COORD (lápide durável) | PSY (cena que esta versão não lê não some); E2E-pinta; GS (registro corrompido vira `{}`) | PSY |
| 9. Troca de perfil com gravação em voo | BROW fase profile-switch; QA manual no staging (`e6d880a23`); SPS (o editor completo do Kids com o adaptador e o IndexedDB de verdade; 22/11) | **—** (parcial: COORD "quota recovery does not block the profile…") | CC (409 VIEWER_MISMATCH); SC; LDK | SSP "trocar de perfil com projeto não salvo grava no perfil antigo e nunca no novo"; COORD; PSY; PBD. **Duas abas ao mesmo tempo em perfis diferentes: —** | n/a | parcial: L3R |
| 10. Python e Pro | WDP; CW; DOCS; WCS "avisa ao fechar enquanto a escrita não foi lida, e a escrita entra no projeto"; SVC (aba escondida grava de novo depois de ler o terminal; 22/11) | DOCS; FS; PO; PROM | n/a | DOCS; PPS; FS (escrita tardia do terminal detectada); CW | WD; `editableProjectValidation.test.ts`; FS | sem queda simulada: L3; PPS |

## As oito lacunas: o que cada uma virou (22/11/2026)

O levantamento de 21/11 deixou oito lacunas. Duas eram perda real e passavam por um defeito comum,
consertado primeiro.

0. **O defeito comum: sair do editor por navegação no app** (`32f22fefb`). O `StudioCore`
   descarregava o projeto antes de o serviço gravar, então a desmontagem por navegação dentro do app
   ("Trocar de perfil", menu, voltar) achava o projeto já vazio e descartava a edição suja. O ligar
   do serviço veio para antes do descarregar, e um salvamento recusado na saída vira cópia de saída
   (`pageAlive`), que aparece como "(edição recuperada)". STU com o adaptador de verdade.
1. **Duas abas no mesmo projeto** (`299f28772`): BROW agora lê, depois da recarga, a cópia
   "(edição recuperada)" da aba que perdeu, também fechando a aba (`runBeforeUnload`).
2. **A janela de 120 ms dos blocos** (`16bf6725f`): perda real. O flush do `BlocklyPanel`, sem
   regeneração agendada, compara o estado do workspace com o último aplicado e regenera se mudou
   (fora de carga, de aplicação de estado e de arrasto). E2E-flush "desfazer um bloco e esconder a
   aba na mesma tarefa: a cópia de saída já vem sem o bloco".
3. **O terminal do Pro** (`1de71e8e5`): com a aba escondida, a gravação espera as escritas do
   terminal entrarem no documento e grava de novo; o aviso de sair com escrita não lida tem teste
   (WCS).
4. **A cota no WebKit** (`299f28772`): as fases da cota nativa (recarga e aba escondida) rodam em
   todos os motores, sem depender do diálogo.
5. **O envio da aula** (decisão dela: provar e mostrar). O banco guarda só o penúltimo projeto na
   entrega, mas cada versão enviada fica em `lesson_evidence` (MSP, `480b1d801`), e o histórico da
   equipe lista uma linha por versão, com o projeto inteiro para baixar, também nas páginas antigas
   (LEH, `2bb893918`). O POST interrompido: E2E-arte. O mesmo e2e achou dois defeitos, consertados
   em `be24e355e`: o aviso "você está enviando o projeto inicial" nunca aparecia nas aulas montadas
   por manifesto (o Blockly sorteia ids que vão para o código, então a régua passou a comparar os
   blocos sem o que o editor põe sozinho), e o "Recomeçar" tirava o desenho da vaga de arte dos
   materiais até a próxima abertura.
6. **A migração interrompida de verdade** (`2346cc9b8`): E2E-mi no Chromium e no WebKit, com as
   interrupções caindo no meio (Chromium 4 e 6 de 30 promovidos; WebKit 1, 2, 4 e 7). O
   "Preservado" falso existia: a gravação de saída com a página viva aborta as escritas condicionais
   da mesma identidade, e a promoção da migração é uma delas. Agora a promoção abortada é lida de
   novo e tentada outra vez (L3P e LP, vermelhos no código antigo). Os dois passos de recuperação de
   diários v3 antigos (`localV3Recovery`, `localV3RecoveryReplay`) ainda marcam pendente se forem
   abortados nesse instante; só rodam com diário de saída v3 de antes da migração, e a próxima carga
   resolve.
7. **A troca de perfil no app** (`c6ac8826c`): "Trocar de perfil" é um link dentro do app (o
   caminho do item 0). SPS prova a metade do app: o editor completo prende o adaptador ao perfil de
   antes, e a gravação da saída cai no banco daquela criança mesmo com o armazenamento já passado ao
   perfil seguinte (sabotado, a edição cai no banco da outra criança).
8. **A subida em voo quando a aba fecha** (`3b4de2e1c`): CC com a fila real e as marcas relidas
   numa página nova, nas quatro paradas (reserva, envio, commit, commit que chegou sem resposta); a
   marca não avança e a página seguinte reserva com a base de antes. CRD (Postgres real, CI): a
   reserva pendurada é trocada pela próxima com a mesma base, e o commit atrasado dela é recusado.

Continua fora das oito: o Python não tem prova de saída em navegador real (só IndexedDB falso), e o
game-storage (o save do jogo da criança) lê um registro corrompido ou futuro como `{}` e o
sobrescreve na próxima gravação.

## Projeto grande com a aba escondida (conferência do staging, 21/11/2026)

A saída grava a cópia nativa (o registro de recuperação no IndexedDB) e a cópia síncrona (o
`localStorage`, teto de 2 milhões de caracteres e 500 mil nós). O Reino Zero Ultra aberto tem um
registro de recuperação de 3.068.580 caracteres (blocos 1,77 milhão, estado 750 mil, medido no
playground), então a síncrona não cabe. Antes, a saída rejeitava mesmo com a nativa confirmada, e
a aba escondida (a criança trocou de aba; o Chrome conectado sempre) mostrava "Erro ao salvar",
com o aviso de "sair da página".

Agora o serviço avisa quando a página segue viva (`flushOnExit(…, {pageAlive: true})`, só no
`visibilitychange → hidden`). Com a nativa confirmada, a saída resolve e o estado de recuperação
diz "recuperável" (`nativeConfirmed`). No `pagehide`/`beforeunload` nada mudou: ali a página pode
morrer antes de o IndexedDB confirmar, e a falha continua explícita (o teste "quota failure does
not claim an exit copy…" segue valendo). Testes: `projectSynchronousRecovery.test.ts` ("page alive:
a confirmed native copy is enough…") e `service.test.ts` ("o flush da aba escondida avisa que a
página segue viva…"), os dois vermelhos no código antigo; no playground, o mesmo gesto passou de
"Erro ao salvar" a "Alterações não salvas" (o mesmo de um projeto pequeno com a aba escondida).
No staging (apps em `4eddccb1b`), numa cópia nova do Reino Zero Ultra com uma alteração pendente e a
página dada como escondida (simulado: a troca de aba não esconde a página no Chrome conectado):
nenhum "Erro ao salvar", o selo em "Alterações não salvas" enquanto escondida e "Salvo · Guardado
na sua conta" 4 s depois de voltar à vista
([`../qa/2026-11-21-studio-lote8-staging.md`](../qa/2026-11-21-studio-lote8-staging.md)).

## Outros itens da seção 13 conferidos neste lote

- **"Abrir um projeto Python já o marca como mudado"** (visto no staging em 20/11): é de propósito na
  PRIMEIRA abertura de um arquivo sem a área Programa (o `PythonBlocklyEditor` grava a área inicial,
  e o e2e `e2e-python-editor/program-areas.spec.ts` exige: "Opening an example alone persists
  Programa"). Pelo código, as aberturas seguintes restauram a área salva e não gravam. O que se viu
  no staging foi a primeira abertura de exemplos da galeria. Não foi conferido de novo no app do
  Kids.
- **Vínculo Clássico → Pro**: existe nos dados. As duas conversões (JavaScript e Python) gravam
  `proMeta.origin = { projectId, revision }` apontando para a cópia em Blocos guardada; o esquema
  canônico do documento valida o campo (`core/src/studio/project-document.ts`). As provas: no
  JavaScript, `studio/src/state/convertToPro.test.ts` confere que ele aponta para a cópia e
  `studio/src/persistence/promotion.test.ts` que ele chega gravado pelo serviço de persistência
  (cópia primeiro, Pro depois); no Python, `studio/src/state/pythonProjectValidation.test.ts`
  confere `projectId` e `revision`. Falta MOSTRAR à criança de onde o projeto Pro veio
  (com o caminho para abrir a cópia): é tela nova e precisa da aprovação dela.
- **O "ENOENT … scandir node_modules" cru no Pro** (visto no staging em 20/11): corrigido. A leitura
  das bibliotecas instaladas (`modes/pro/dependencyDeclarations.ts`) trata pasta ou arquivo que some
  (instalação ainda não terminou, pacote sendo trocado) como "nada instalado ainda", e qualquer
  outro erro do sistema de arquivos vira frase para a criança, com o texto técnico só no console.
  Testes vermelhos na versão anterior.
