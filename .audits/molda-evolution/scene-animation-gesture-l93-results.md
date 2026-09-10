# Lote 93: custo da prévia de poses por gesto

08/09/2026, Windows, Bun 1.3.11. Medição CPU local, não homologação de navegador,
GPU, toque ou dispositivos infantis.

## Método

`bun scripts/bench-scene-animation-gesture.ts`, em `packages/molda`.
Dez aquecimentos e 30 amostras por cenário, alternando a ordem dos caminhos.
A preparação é medida separadamente e acontece uma vez no começo do ajuste.

- Prévia: `prepared.apply` + `SceneRenderResource.setPose`.
- Controle: comando em lote para as mesmas chaves + recompilar/amostrar clipe +
  atualizar documento/recurso e aplicar a pose. É uma alternativa com código atual,
  **não** um benchmark histórico de uma edição por gestos já publicada.
- Cada amostra compara todas as matrizes por JSON exato e verifica identidade de
  geometria/material dos meshes no caminho preparado. Nenhum sorteio.
- Tempos não incluem React, eventos reais, bounds/helpers, desenho GPU, autosave
  ou histórico. O perfil inclui os dois caminhos, fixtures, validação e oráculos;
  não atribuir seu tempo total exclusivamente à prévia.

## Execução sem profiler

| Cenário | Preparação (ms) | Prévia p50 / p95 / máx. (ms) | Controle p50 / p95 / máx. (ms) |
| --- | --- | --- | --- |
| 1 mesh, 9.216 faces, 64 chaves | 11,008 | 0,053 / 0,159 / 0,213 | 7,864 / 12,170 / 12,311 |
| 128 meshes/nós, 8.192 chaves | 2,725 | 0,454 / 0,906 / 1,055 | 2,929 / 5,677 / 6,394 |
| 128 meshes + 384 locators, 65.536 chaves | 6,929 | 1,477 / 6,014 / 6,563 | 16,113 / 21,387 / 26,359 |

As matrizes coincidiram exatamente em todas as amostras e os recursos foram
reutilizados. A identidade não comprova ausência de todas as alocações: mapas e
poses derivadas ainda são criados por amostra, com tamanho limitado pelos nós.

## Repetição com profiler

`bun --cpu-prof --cpu-prof-md --cpu-prof-dir ../../.audits/molda-evolution
--cpu-prof-name scene-animation-gesture-l93 scripts/bench-scene-animation-gesture.ts`

| Cenário | Preparação (ms) | Prévia p50 / p95 / máx. (ms) | Controle p50 / p95 / máx. (ms) |
| --- | --- | --- | --- |
| 1 mesh | 10,341 | 0,051 / 0,150 / 0,157 | 7,990 / 13,891 / 14,918 |
| 128 nós | 2,936 | 0,687 / 1,466 / 4,493 | 4,039 / 6,314 / 7,427 |
| 512 nós | 10,222 | 1,580 / 4,153 / 6,683 | 16,303 / 23,593 / 44,976 |

Perfil completo: 1,93 s, 232 amostras; maior função autoral por tempo próprio:
`indexSceneDocument` (9,6%). Arquivos `scene-animation-gesture-l93.md` e
`scene-animation-gesture-l93.cpuprofile`. A variação de cauda reforça a necessidade
de medir o fluxo inteiro em dispositivos reais.

## Revisão e invariantes

A separação sessão/documento segue a evidência de reindexação dos lotes 85/88/91:
índices, matrizes de coordenadas, curvas de destino e valores locais são preparados
uma vez. Teste com 65.536 chaves confirma zero novas leituras de geometria, imagens
e arrays de chaves originais em 120 prévias. Lookup de curvas não percorre trilhas
por frame. Ordem pai/filho e raízes selecionadas são preservadas; não há desempate
ou seed aleatória. Undo/redo só existe na confirmação.

Translação e escala uniforme preservam o quaternion autoral exato. Rotação/escala
não uniforme só aceitam TRS derivado representável: a decomposição valida eixos,
sinais e recomposição, sem aproximar shear. Isso adiciona uma capacidade nova;
não é uma promessa de equivalência entre matrizes arbitrárias e TRS.

Testes independentes com Three verificam hierarquia, escalas assinadas e matrizes.
Preview e clipe gravado coincidem. Interrupções, ownership, limites, erro de desenho
e eventos atrasados não criam gravações acidentais. Alças reais são exercitadas com
Three no ambiente de testes; somente a fronteira WebGL é substituída.
