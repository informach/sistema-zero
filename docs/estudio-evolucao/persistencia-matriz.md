# Persistência: a matriz de quedas por borda de escrita (lote 6, 21/11/2026)

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

## A matriz

| Borda | Aba fechada ou recarga no meio | Transação abortada ou cota cheia | Rede ou recusa do servidor | Segunda aba ou segundo aparelho | Versão defasada (formato novo lido por cliente velho) | Queda durante migração |
|---|---|---|---|---|---|---|
| 1. Editor → store | PC "materializa o buffer do editor antes do snapshot de pagehide" (flusher sintético); E2E-run "Rodar confirms the current buffer before an immediate reload…"; WDP "pagehide persists an unfinished gesture…" (Python). **Sem teste com o BlocklyPanel real e recarga** | RUN e PIS (falha de gravação preserva o código); CW "an incomplete gesture is saved before visual validation fails" | n/a (camada local); STU "getProject materializa uma edição pendente…" | BSG, BSE; STU "duas instâncias na mesma página não compartilham estado" | BSS (recusa versões desconhecidas); e2e `classic-long-sequence.spec.ts` "…não perde nenhum bloco" | só correção, sem queda: BSS, E2E-migr |
| 2. Store → autosave (1 s, teto 5 s) | SVC "esconder a aba grava… NA HORA", "pagehide + beforeunload… flusham UMA vez só"; PC "com o autosave EM VOO, o pagehide já PEDE a gravação do flush…" | PC "mantém o projeto sujo e registra erro quando o autosave falha", "um put que LANÇA…"; COORD (rascunho da cota) | SVC (estágio durável antes do debounce com backend remoto); PC "onSave rejeitado marca erro…" | SVC "dois saves rápidos do mesmo id… confirmam EM ORDEM"; PC "rename atômico invalida um autosave…" | REC "unknown document metadata survives partition round-trip" | parcial: V4O |
| 3. Autosave → transação IndexedDB | BROW (12 recargas com CAS em voo, CPU 6×); E2E-flush "enviar um céu de 1,5 MB e recarregar NA HORA…" | IDB "falha da transação (quota cheia)… não aplica NADA"; PC "falha de quota… NÃO apaga a partição de blocos…"; INV (todo commit explícito) | n/a | BROW fase two-tabs (a segunda aba recebe `ProjectWriteConflict`); COORD "two independent editors cannot overwrite the winning head…" | TRANS "future and malformed envelopes cannot be read…"; V4O (um projeto futuro isolado) | V4O "partial current v4 storage cannot fall back…"; L3 |
| 4. Saída da página (journal, CAS, v4) | E2E-flush (céu, Molda com modal aberta, aba escondida); BROW; SCHED | BROW com `STUDIO_STORAGE_EXIT_FAULT=abort` (Chromium e WebKit); SYNC (journal restaura quando a transação de saída aborta; cota não confirma cópia); SEJ; EXC | EXC "an external adapter retains its existing exit contract" | SYNC "same-sequence competing snapshots are both preserved…", "a returning old tab becomes a v4 copy…"; COORD | SEJ, CODEC, SYNC (futuro intocado) | SYNC "legacy sources retire only after complete v4 recovery"; L3R |
| 5. Migrações v1/v2/v3 → v4 | **—** (nenhuma recarga DURANTE a migração; o modo profundo do BROW migra sem interromper) | L3 / L3R (cota no segundo put não deixa metade); LP | BATCH (interrupção retomável no servidor) | L3 "an old tab returning after migration creates a copy…"; LP; V4O | E2E-down "um cliente v3 depois da migração não apaga nem altera o v4…"; L3, L3P | BATCH (diário de recuperação); L3P; E2E-migr; LB (nenhum é queda real de processo) |
| 6. Local → nuvem da conta | CSY (só o local mudou → sobe; marcas e lápides sobrevivem); SC (a marca só avança no commit). **Sem teste do envio keepalive na saída** | PC (o restauro substitui, com a cota que aborta tudo); CSY; CC (4xx não entra em laço); MCR | CC (offline tenta de novo, 5xx); SC (descida falha: a lápide sobrevive; manifesto incoerente recusado) | SC (cópias "(deste computador)" e "(de outro aparelho)"); CSY (relógio adiantado, duas abas mesclam); MCR (aparelho atrasado não passa por cima) | PC (restauro ESTRITO recusa bloco desconhecido); SC; CC; SCT | n/a |
| 7. Rascunhos de aula e envios | LDS; LDK (parte com envio em dia espera o commit); LWD. **POST de envio interrompido: —** | LDP; SLS (banco indisponível não vira rascunho vazio) | LDC (prazo não confirma nem cancela; um bloco não segura o outro); LDP; SLS; MST | LDS (os dois mexeram: a mais nova abre, a outra fica guardada); LDC; LWD; MST (reenvio guarda a anterior); MSR; TPL (lógica do aviso) | LDO, LDP, LDC (página antiga); MST; MLD | sem queda simulada: MLD, SLS |
| 8. Materiais do Pinta e do Molda, cercas, game-storage | E2E-flush (três arquivos do Molda); PSY. **game-storage: —** | E2E-pinta (falha no segundo put não deixa metade da Vila); PSY (cota conserva o mundo fechado inteiro); GS (corta por desenho) | PSY; CC (parte ausente é temporária); PBD | PSY (jogo aberto no meio da varredura); PC (não recria partição apagada); GS (gravação depois do delete não ressuscita); COORD (lápide durável) | PSY (cena que esta versão não lê não some); E2E-pinta; GS (registro corrompido vira `{}`) | PSY |
| 9. Troca de perfil com gravação em voo | BROW fase profile-switch; QA manual no staging (`e6d880a23`). **Sem e2e no app** | **—** (parcial: COORD "quota recovery does not block the profile…") | CC (409 VIEWER_MISMATCH); SC; LDK | SSP "trocar de perfil com projeto não salvo grava no perfil antigo e nunca no novo"; COORD; PSY; PBD. **Duas abas ao mesmo tempo em perfis diferentes: —** | n/a | parcial: L3R |
| 10. Python e Pro | WDP; CW; DOCS. **Pro: —** (escrita do terminal ainda não importada; WCS cobre só a desmontagem) | DOCS; FS; PO; PROM | n/a | DOCS; PPS; FS (escrita tardia do terminal detectada); CW | WD; `editableProjectValidation.test.ts`; FS | sem queda simulada: L3; PPS |

## As lacunas que mais arriscam perder trabalho da criança

1. **Duas abas no mesmo projeto: a edição da aba que perde.** Acontece quando a criança reabre o
   projeto pelo card. O BROW confere que a primeira gravação vence, mas não lê a cópia
   "(edição recuperada)" da segunda aba depois de recarregar; essa preservação só está provada com
   IndexedDB falso (COORD). A frase do `ProjectWriteConflict` promete que as edições continuam
   nesta sessão.
2. **Blocos: a janela de 120 ms do agrupador** (`BLOCKLY_REGENERATION_DELAY_MS`): nenhum e2e solta
   um bloco e recarrega sem esperar o "Salvo".
3. **Pro: escrita do terminal ainda não importada no documento**: o flush de saída não reconcilia o
   sistema de arquivos do WebContainer; a defesa é o aviso do `beforeunload`, sem teste e sem
   efeito no iPad.
4. **Cota do journal de saída no WebKit**: a fase da cota roda só no Chromium.
5. **Envio da aula**: o servidor guarda UMA versão anterior; dois reenvios apagam a original. O aviso
   do projeto inicial tem só a lógica testada.
6. **Migração v3 → v4 interrompida de verdade** (atomicidade provada com falha injetada em
   IndexedDB falso; os backups reduzem o risco).
7. **Troca de perfil no app real**: só QA manual, o driver BROW e testes de unidade.
8. **Nuvem: subida em voo quando a aba fecha** (o envio keepalive na saída não tem teste; a
   recuperação depende de reabrir no mesmo aparelho).

Fora das oito: o Python não tem prova de saída em navegador real (só IndexedDB falso), e o
game-storage (o save do jogo da criança) lê um registro corrompido ou futuro como `{}` e o
sobrescreve na próxima gravação.

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
