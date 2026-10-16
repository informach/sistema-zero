# Prévia candidata do Zappy Pro — implementação e verificação

## Entrega

`StudioProCandidatePreviewProvider`, acima do Shell, guarda somente a seleção da experiência. `show({ projectId, jobId, artifact, revisionHash })` abre a proposta sem substituir o documento, salvá-lo ou invocar compilador. A API também expõe `select`, `close`, `report`, `focusNonce` e `candidate.status` (`loading`, `ready`, `expired`, `unavailable`). Projeto, perfil e instância delimitam a seleção; transições A → B → A também descartam a proposta. Reabrir o mesmo artefato já ativo preserva seu estado.

`ProPreview` tem um seletor único: atual/proposta. Ambos usam o mesmo espaço; a troca remove o iframe anterior e suas portas antes de executar a outra versão. O controlador do projeto atual continua montado, conservando o processo do WebContainer ou a compilação remota. Se a primeira abertura é uma proposta, o controlador atual não inicia compilação antecipada. O editor, o terminal e o provider do WebContainer não mudam de árvore por causa desta seleção. O layout estreito recebe uma solicitação explícita de foco da prévia, preservando os painéis.

`ProArtifactPreview` recebe um artefato explícito. Não lê o projeto nem conhece adaptadores de inferência/compilação. Mantém sandbox sem `allow-same-origin`, valida mensagens por origem, janela, token e revisão, usa memória por experiência e encerra portas/timers/listeners na saída. A prévia atual fornece explicitamente seu backend durável; a candidata nunca o recebe. A prontidão indica conexão da ponte, não substitui validação/gameplay autoritativos. TTL remove o documento e reporta `expired`; ausência de handshake em 12 segundos reporta `unavailable`. Recuperar o artefato é responsabilidade do servidor/botão do builder, mediante ação explícita.

## Arquivos

Novos: `src/studio/pro-candidate-preview.tsx`, `src/modes/pro/ProArtifactPreview.tsx`, `src/modes/pro/useProStorageBridge.ts`, dois arquivos de teste de candidato, fixture `e2e/fixtures/pro-candidate`, spec/config `e2e/pro-candidate-preview.*`.

Alterados nesta frente: `StudioCore.tsx`, `ProPreview.tsx` e seu teste, `RemoteProPreview.tsx`, `useProGameStorage.ts`, `ProCodeMode.tsx`, `NarrowPanels.tsx` e seu teste. Nenhum arquivo do runtime, servidor, publicação, player, contratos core ou builder foi alterado.

## Evidência

- 28 testes passaram em seis arquivos: provider, renderer/seletor, previews local/remoto, storage host e layout estreito. Log em `studio-candidate-preview-tests-2026-10-15.txt`. Acrescentadas depois duas verificações ao teste do provider (reabertura idempotente e transição em lote A → B → A); ambos os testes passaram novamente, com 21 assertions.
- Chromium real: `node ./node_modules/@playwright/test/cli.js test --config e2e/pro-candidate-preview.config.ts` — 3 passaram em 40,2 s. Exercita produção Vite, ponte real MessageChannel, IndexedDB, sandbox opaco, Canvas/rAF, áudio, vinte trocas, perfil/projeto, fechar painel sem encerrar experiência, expiry, indisponibilidade HTTP e troca explícita por novo artefato. Apenas as respostas do servidor foram controladas; renderer/bridge/provider/stores são os de produção.
- Reexecução final após ajustes do provider e migração da IA: os mesmos três testes Chromium passaram em 27,8 s, incluindo a asserção de que um HTTP 404 nunca vira `ready`. `git diff --check` passou nos arquivos alterados desta frente.
- Captura visual inspecionada em `.audits/studio-candidate-preview-mobile-2026-10-15.png` (360 × 740), copiada do resultado final do browser.
- Biome passou nos 16 arquivos da frente. O primeiro typecheck revelou referência `result.artifact?.url` em ramo HTML estreitado para `never`; corrigida. A segunda checagem concluiu com três opções `exact` não suportadas pelo Testing Library nos novos testes; removidas (o nome string já casa exatamente). A sessão principal assumiu a checagem final após estabilização das mudanças; não há afirmação de typecheck global limpo nesta entrega.

## Limites de evidência

O browser valida o cliente com artefatos HTTP controlados, não a geração paga, o lease do job ou o rebuild do servidor. A preservação do processo WebContainer foi verificada com adaptador de processo controlado no teste de componente; o browser usa runtime remoto. A mudança entre breakpoints wide/narrow continua seguindo o comportamento existente de remontagem do layout; selecionar atual/proposta não provoca essa mudança.
