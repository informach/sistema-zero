---
status: resolved
file: packages/studio/src/components/blocks/PythonBlocklyEditor.tsx
line: 436
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Notificação antiga apaga a seleção Python ainda vigente

## Review Comment

O listener SELECTED publicava `event.newElementId` como a seleção atual. Na distribuição instalada Blockly12.5.1, os eventos UI são enfileirados por requestAnimationFrame→setTimeout; `common.fireSelectedEvent` explicitamente não muda o estado da seleção, e `common.getSelected` lê o FocusManager atual. Assim uma notificação de deselection antiga pode chegar depois de o mesmo bloco estar selecionado novamente. O store termina com selectedBlockId=null mesmo com o bloco selecionado no Blockly, perdendo a seleção utilizada pela captura/navegação do tutor.

Evidência de navegador preservada pelo implementador em `.cache/studio-python-l0/l5-zappy-navigation-browser-4.log` e `zappy-navigation-browser-3-failure`: notificações do MESMO workspace alternam ID/null/ID/null, enquanto `common.getSelected()` permanece no mesmo ID em todas as entregas. O guard da fonte e a identidade do workspace estavam corretos. A causa confirmada é usar o snapshot de uma notificação como estado atual; não há prova de evento estrangeiro/flyout ou de foco tomado pelo Monaco.

Prova independente leve `.cache/review062-selection-notification.test.ts`: executa o handler exato de produção e reconstrói o trecho antigo somente no cache, com blocos headless e fila Selected reais do Blockly. O getter público do FocusManager é controlado para representar a seleção atual observada no navegador. Na sequência real enfileirada ID/null/ID/null, o handler antigo termina null; o corrigido mantém ID em todas as entregas e publica a faixa correspondente. Também recusa seleção atual de outro workspace e respeita deselection atual mesmo se a notificação antiga trouxer ID. Fonte permanece intacta. A fixture vincula temporariamente document.addEventListener durante a construção do FocusManager para atender ao receiver exigido pelo HappyDOM, restaurando-o imediatamente; nenhuma mudança no setup global ou produto.

Tratar SELECTED como notificação: ler a seleção atual da API oficial, exigir workspace idêntico e bloco realmente registrado antes de publicar ID/faixa. Conservar os guards de fonte/projeto e a ausência de gravação por eventos UI.

## Triage

- Decision: `VALID`
- Notes: Implementador diagnosticou no navegador e aplicou a correção antes desta documentação. Revisor confirmou a causa na implementação instalada e revalidou o handler atual. `bun test ./.cache/review062-selection-notification.test.ts` em Studio:1 pass,0 fail,8 verificações,exit0. A prova leve não afirma renderização SVG/Monaco nem substitui a revalidação browser5 em andamento. Nenhuma produção modificada pelo revisor; sem heavy/browser/TSC/SQL próprios.
