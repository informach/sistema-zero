# Vila e Floresta: os dez passos em 23/11/2026

Etapa 9 reduzida do [plano mestre](../../superpowers/plans/2026-11-21-pinta-missao-retomada.md).
A dona cortou as variantes e o PyDew Valley em 23/11. Ficaram os guias e esta rodada.

## Como foi feito

- **Base:** `6922fb2e0` (staging local `601a89ec5` mais os guias da T6), branch `pinta-linha-b-20261123`.
- **Ordem dos passos:** a da missão, em
  [cobertura da revisão de 18/11](../revisao-2026-11-18/cobertura.md#situação-dos-dez-passos-de-aceitação).
  A tabela antiga de [homologação](../homologacao.md) usa outra ordem.
- **Provas:** só as automatizadas que já existiam. Nenhum ensaio novo foi montado.
- **Fora desta rodada:** a etapa 8 (projeções) e o que falta das etapas 3–5 nas regiões.
- **Conta:** nada foi ensaiado com login. Staging remoto e produção não foram tocados.

O cenário é o da [homologação](../homologacao.md): a Vila (32 × 24 casas, 18 camadas, duas
folhas, terreno, água animada, objetos com propriedades, conjunto) e a Cabana, ligadas por portas.
Os exportadores regionais usam a mesma Vila num mundo de 10.000 × 10.000 casas.

## A rodada ficou pela metade

Rodaram as três baterias de unidade, todas verdes: 332 testes, nenhuma falha, nenhum pulado.

A segunda metade não rodou. Ela tinha os programas de fora, pelos scripts, e os fluxos de
navegador. A cadeia esperava na trava `pesado.mjs`, ocupada por outra sessão ("conferência antes do
push"). Enquanto esperava, o Claude Code a encerrou por falta de memória na máquina. Nenhum desses
ensaios chegou a começar, então não há resultado vermelho: há ensaio não feito. O comando para
repetir está no fim.

## Os dez passos

"Hoje" é esta rodada. "Antes" aponta o recibo anterior mais novo, que não foi refeito.

| Passo | Hoje (verde) | Não feito hoje | Continua sem prova |
|---|---|---|---|
| 1. Criar e editar no Pinta | `homologacao.test.ts` passos 1–5; `workshopRegionsUi.test.tsx` (cartão "Mundo gigante", Pinta da aula recusa) | `pinta-scenes.flow.ts` ("criar 32 camadas", "Vila: importar, editar…") | — |
| 2. Salvar, fechar e reabrir | `homologacao.test.ts` passo 6; `persistence`, `workshopPersistence`, `workshopRegionsBackup` (ZIP com o mundo, restauro com os mesmos bytes); `formatFixtures` (nativo 8/9, físico 3 e cena 4 congelados reabrem) | `pinta-native-world-scenes.flow.ts` (Vila e Cabana no arquivo editável, restauro e reabertura) | falha física de disco |
| 3. Enviar ao Estúdio | `studioBridge`, `studioLibrary`; `homologacao.test.ts` passo 8; `pintaImageSync`, `pintaRegionalMaterial` (Estúdio) | — | envio autenticado |
| 4. Executar camadas, colisões e objetos | `homologacao.test.ts` passo 7; `phaser/regionPlayer.test.ts`; `pythonScenePlatforms`; `tilemapGame` (Estúdio) | `phaser-scenes.flow.ts`, `pinta-physics-scenes.flow.ts` | execução autenticada nos dois motores do Estúdio |
| 5. Editar de novo no Pinta | `workshopGallery` (duplicar e restaurar regiões e regras com IDs novos); `workshopRegionsUi` (janela focal atualiza o Estúdio ao sair) | `pinta-scenes.flow.ts` (editar, desfazer, refazer, reabrir) | editar arte já ligada a um programa autenticado |
| 6. Atualizar sem apagar a programação | `tilemapGame` ("mudar o início… sem gerar o programa de novo"); `pintaImageSync` | — | atualização autenticada pela biblioteca |
| 7. Exportar e rodar Phaser e Pygame | `regionPlayer.test.ts` (128 × 128 e 10.000 × 10.000 com os mesmos pixels); `pygameRegionProject` | `verify-region-phaser.ts`, `verify-region-pygame.ts` (precisa e antiga) e `check:homologacao --exigir-pygame`. Antes: [exportadores reais de 23/11](../missao-completa-2026-11-18/qa/exportadores-reais-integrados-2026-11-23/README.md) e B6 `f07b32e13` | janela física |
| 8. Tiled ida e volta | **Tiled de verdade:** `tiled/regional.test.ts` e `tiled/rasterizer.test.ts` com `PINTA_TILED_BIN` (diferença 0 nas camadas da Vila); `tiled/roundtrip.test.ts`; `homologacao.test.ts` passo 10 | `check:homologacao --exigir-tiled` (mapas de tamanho fixo) | sessão manual na tela do Tiled |
| 9. Desfazer, duplicação, migração e falhas | `workshopRegionsGate` (teto 8: o mapa com regras é recusado sem tocar no disco); `workshopGallery`; `formatFixtures` | `pinta-future-recovery.flow.ts` (duas abas, recuperação offline, folha de mapa futuro) | autoridade e recuperação entre clientes autenticados; rollback |
| 10. Aparelhos e formatos antigos | `pinta-cliente-antigo.test.ts` (community-kids: a conta recusa, o aparelho guarda tudo); `workshopRegionsBackup` (o leitor antigo recusa o arquivo inteiro) | — | dois aparelhos físicos; quota física |

Godot (`verify-region-godot.ts` e `check:homologacao --exigir-godot`) também ficou para a
repetição. O recibo mais novo é o dos exportadores reais de 23/11.

**Correção da cobertura de 18/11:** o passo 1 dizia que a autoria livre "segue limitada a oito"
camadas. Hoje o teto de criação é 32 (`PINTA_LIMITS.maxTilemapLayers`). Oito é o teto da aula
(`PINTA_LESSON_MAP_LIMITS`). O fluxo "criar 32 camadas" existe, mas não rodou nesta rodada.

## Comandos e saídas

Ferramentas: o Tiled de `.tmp/pinta-tools/tiled-files/` da árvore principal (1.12.2 nos
recibos de 23/11). Também um venv novo, no scratchpad da sessão, com CPython 3.13.17 e
pygame-ce 2.5.8.

| Bateria | Comando | Resultado |
|---|---|---|
| Pinta | em `packages/pinta`, com `PINTA_TILED_BIN`: `bun test` com `homologacao`, `tiled/{roundtrip,regional,rasterizer}`, `formatFixtures`, `phaser/regionPlayer`, `pygameRegionProject`, `pythonScenePlatforms`, `studioBridge`, `studioLibrary`, `state/{persistence,workshopPersistence,workshopRegionsGate,workshopRegionsBackup,workshopGallery}` e `components/workshopRegionsUi` | 116 aprovados, 0 falhas, 16 arquivos, 18,7 s |
| Estúdio | em `packages/studio`: `bun test src/projects/tilemapGame.test.ts src/asset-library/pintaImageSync.test.ts src/core/__tests__/pintaRegionalMaterial.test.ts src/examples/qaContracts.test.ts` | 215 aprovados, 0 falhas, 4 arquivos, 20,6 s |
| Cliente antigo | em `packages/community-kids`: `bun test tests/pinta-cliente-antigo.test.ts` | 1 aprovado, 0 falhas |

Para repetir a metade que faltou, uma de cada vez pela trava, com `TILED`, `GODOT` e `PYTHON`
(e os `PINTA_*_BIN`) apontados:

```powershell
cd packages/pinta
bun scripts/homologacao/check.ts --exigir-tiled --exigir-pygame --exigir-godot
bun scripts/homologacao/verify-region-pygame.ts
bun scripts/homologacao/verify-region-godot.ts
bun scripts/homologacao/verify-region-phaser.ts
cd ../studio
bunx playwright test --config playwright.pinta.config.ts --project=desktop --retries=0 pinta-scenes.flow pinta-native-world-scenes.flow phaser-scenes.flow pinta-physics-scenes.flow
bunx playwright test --config playwright.pinta-future-recovery.config.ts --retries=0
```
