# Relatório de verificação — Jogo 2D

**Data:** 2026-07-20  
**Ambiente:** Windows, Bun 1.3.11, Playwright Chromium, viewport desktop e 390×844, DPR 1/2/3  
**Escopo:** extensão `game-2d` do Studio no estado local atual

## Resultado executivo

**Status: aprovado no escopo do Jogo 2D.**

Os dois bloqueadores originais foram resolvidos:

1. O guard do runtime composto voltou a passar com a composição atual.
2. A descrição explícita para leitor de tela é preservada antes/depois de `setupStage` e após `setupStageFull`.

## Matriz de execução

| ID | Camada | Cenário | Resultado |
|---|---|---|---|
| QA-01 | Unit/contrato | Catálogo, toolbox, pipeline, API e runtime focados | **758/758 pass** |
| QA-02 | Browser | 14 cartões: criar, renderizar primeiro frame e aceitar controles | **14/14 pass** |
| QA-03 | Browser | Sala, Equilibrista e Balão em DPR 1, 2 e 3 | **9/9 pass** |
| QA-04 | Browser | Herói que anda em viewport 390×844 | **Pass** |
| QA-05 | Acessibilidade/DOM | Preparar palco e depois definir descrição | **Pass** |
| QA-06 | Acessibilidade/DOM | Definir descrição e depois preparar/repreparar palco | **Pass** |
| QA-07 | Estática | Biome no módulo | **42 arquivos pass** |
| QA-08 | Estática | `git diff --check` no escopo | **Pass** |
| QA-09 | Suíte do pacote | `bun test src` | **4.571/4.571 pass** |
| QA-10 | Tipos do pacote | `tsc --noEmit` | **Pass** |
| QA-11 | CI | Workflow contém Chromium focado do Jogo 2D | **Pass** |

## Comandos reproduzíveis

```powershell
cd C:\Users\tocha\projects\sistema-zero\packages\studio

bun test src/official-extensions/game-2d/__tests__ src/parsers/__tests__/game2d.test.ts src/blockly/__tests__/gameCtxRoundtrip.test.ts src/blockly/__tests__/blockCatalog.test.ts src/blockly/__tests__/blockContracts.test.ts src/blockly/__tests__/blockLevels.test.ts src/blockly/__tests__/toolboxLevels.test.ts src/state/blocksStateSanitize.test.ts

bunx playwright test e2e/examples-gallery.spec.ts --grep "game-2d:"

bunx biome check src/official-extensions/game-2d
```

## Cobertura observada

- Criação dos 14 exemplos oficiais pela galeria.
- Boot do runtime, primeiro frame e entrada de controle.
- Canvas lógico em alta densidade de pixels.
- Layout estreito/mobile.
- Contratos exatos de blocos, IR, geração JS e API pública.
- Playthroughs determinísticos para os 14 exemplos.
- Foco visível, `aria-label`, `aria-describedby` e descrição customizada nas duas ordens possíveis.

## Lacunas

- Não foi executado leitor de tela real (NVDA/VoiceOver); a verificação de acessibilidade foi por DOM e contrato.
- Não houve sessão observada com crianças; a adequação cognitiva da paleta de 193 blocos ainda exige teste de usabilidade.
- Áudio foi coberto por testes de runtime, não por validação auditiva humana.

## Evidência da correção acessível

```text
custom=Colete 4 moedas. Use as setas.
afterSecondSetup=Colete 4 moedas. Use as setas.
```

O comportamento é protegido por duas regressões no runtime real em happy-dom.

## Reteste concluído

QA-01, QA-05, QA-06 e os 24 cenários Playwright foram repetidos após as correções. Typecheck, Biome global e a suíte completa do Studio também passaram.
