---
status: resolved
file: packages/studio/src/persistence/service.ts
line: 407
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Não perder rascunhos Python após timeout de hidratação

## Review Comment

PythonBlocklyEditor libera o workspace quando blocksHydration deixa de ser pending, incluindo failed por timeout. Porém a leitura antiga continua viva. Na resolução tardia, o serviço usa isBlocksStateEmpty para proteger trabalho em memória; esse predicado só conhece blocksState.blocks.blocks. PythonWorkspaceDraft guarda os blocos em workspace.blocks, logo um rascunho Python real sempre parece vazio e pode ser sobrescrito pela leitura antiga.

Prova independente com serviço, store, Blockly e envelopes reais: timeout configurado em1ms, status failed, publicação de um novo draft com NUMBER='12a' e fonte intocada, resolução tardia do draft antigo NUMBER='1'. Resultado: status restored, generation antiga e valor1; o draft novo foi perdido. Os dois workspaces passaram readPythonWorkspaceState, e não houve workspace temporário remanescente.

Há também o caminho de fechamento antes da leitura resolver: snapshotForSave retira blocksState enquanto failed, portanto o novo draft ainda sem fonte pode ser omitido do save. O implementador confirmou essa consequência. O novo gate Python precisa manter a proteção em failed e oferecer retry concreto; a hidratação deve reconhecer conservadoramente trabalho Python e não substituir uma revisão posterior. Preservar a política histórica JS. Tentativas novas de leitura também precisam ser separadas das respostas ainda em voo da tentativa anterior.

## Triage

- Decision: `VALID`
- Notes: O implementador protegeu qualquer envelope Python não nulo, bloqueou a superfície também em failed e ligou retry ao serviço real. Cada nova tentativa invalida timeout, resposta e rejeição anteriores. Revalidação independente confirmou os caminhos descritos abaixo. Nenhuma implementação alterada pelo revisor.

## Verification

- `workspaceHydration.test.ts` preserva o draft inacabado NUMBER='12a' após a resolução tardia e muda o estado para discarded. Também verifica que resolução e rejeição da tentativa antiga não alteram a tentativa atual.
- Prova independente com React, Blockly, store e serviço reais, simulando somente parser/SVG: timeout em failed não cria workspace; save conserva a tranca da partição desconhecida; botão Tentar novamente inicia a segunda leitura; rejeição antiga deixa pending; resposta nova libera o workspace. Resultado: failedMountBlocked=true, retryReadCount=2, oldRejectionIgnored=true, latestHydrated=true, blocks=2, nenhum workspace remanescente.
- A prevenção da omissão do novo draft no save vem de não permitir autoria Python enquanto pending/failed. A política existente de preservar a partição desconhecida no disco continua intacta; não foi substituída por gravação cega.
- Suíte independente do recorte e regressão JS do serviço: 37 testes, 158 assertions, zero falhas. Log browser do implementador inspecionado: l4-python-blockly-editor-browser-7.log, quatro testes Chrome/Edge passam (hidratação e seleção). O revisor não executou navegador.
