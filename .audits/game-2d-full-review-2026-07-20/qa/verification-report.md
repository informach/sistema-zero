# Relatório de verificação — Jogo 2D

**Data:** 2026-07-20  
**Ambiente:** Windows, Bun 1.3.11, Playwright Chromium, viewport desktop e 390×844, DPR 1/2/3  
**Escopo:** extensão `game-2d` do Studio no estado local atual

## Resultado executivo

**Status: falhou para aprovação**, apesar de todos os cenários de browser terem passado.

Bloqueadores do escopo:

1. O teste `runtime composto: limites esperados e nenhuma interpolação acidental` espera 4 limites de template e recebe 6.
2. Uma descrição explícita para leitor de tela é substituída pela descrição genérica quando `setupStage` ou `setupStageFull` roda depois.

## Matriz de execução

| ID | Camada | Cenário | Resultado |
|---|---|---|---|
| QA-01 | Unit/contrato | Catálogo, toolbox, pipeline, API e runtime focados | **Falhou: 754 pass, 1 fail** |
| QA-02 | Browser | 14 cartões: criar, renderizar primeiro frame e aceitar controles | **14/14 pass** |
| QA-03 | Browser | Sala, Equilibrista e Balão em DPR 1, 2 e 3 | **9/9 pass** |
| QA-04 | Browser | Herói que anda em viewport 390×844 | **Pass** |
| QA-05 | Acessibilidade/DOM | Preparar palco e depois definir descrição | **Pass** |
| QA-06 | Acessibilidade/DOM | Definir descrição e depois preparar/repreparar palco | **Fail** |
| QA-07 | Estática | Biome no módulo | **42 arquivos pass** |
| QA-08 | Estática | `git diff --check` no escopo | **Pass** |
| QA-09 | Suíte do pacote | `bun test src` | **45 fails; 1 do Jogo 2D** |
| QA-10 | Tipos do pacote | `tsc --noEmit` | **Fail externo ao escopo** |

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
- Foco visível, `aria-label`, `aria-describedby` e descrição customizada na ordem feliz.

## Lacunas

- Não foi executado leitor de tela real (NVDA/VoiceOver); a verificação de acessibilidade foi por DOM e contrato.
- Não houve sessão observada com crianças; a adequação cognitiva da paleta de 193 blocos ainda exige teste de usabilidade.
- Os cenários Playwright não estão configurados no workflow de CI.
- Áudio foi coberto por testes de runtime, não por validação auditiva humana.

## Evidência da regressão acessível

```text
custom=Colete 4 moedas. Use as setas.
afterSecondSetup=Jogo 2D interativo
```

Comportamento esperado: `afterSecondSetup` deve conservar a descrição explícita.

## Recomendação de reteste

Após as correções, repetir QA-01, QA-05, QA-06 e os 24 cenários Playwright. Só aprovar quando os testes focados estiverem integralmente verdes e a descrição sobreviver às duas ordens possíveis dos blocos.
