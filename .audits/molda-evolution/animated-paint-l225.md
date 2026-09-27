# Lote 225 — contrato de pintura animada para o Estúdio

Estado: implementado, revisado e verificado, 10/09/2026.
Design: `docs/plans/2026-09-10-molda-animated-paint-bridge.md`. Público/cloud continuam v1.
Primeiro de três incrementos: contrato e produtor aqui; consumidor (226) e oficina (227) depois.

## Mapeamento antes de decidir o transporte

| Ponta | O que existe hoje | Consequência |
| --- | --- | --- |
| Documento | `SceneImage.flipbook` com grade, sequência, fps e loop (lote 75) | O dado autoral está completo |
| Amostragem | `sampleSceneFlipbook`, `sceneFlipbookRegion` (lotes 75 e 76) | Passo ≠ célula; repetição é intencional |
| Exportação | `SceneGlbMaterials.raster` recorta o quadro 0 e emite `flipbook-first-frame` | A folha nunca chegava ao destino |
| Estúdio | zero ocorrências de flipbook; UV dinâmica só é `repeat` de ladrilho | Não há consumidor, nem canal |
| Ponte | `Asset3DManifestEntry = {kind, dataUrl, fileName}` e `__SZGAME_ASSET_META` | Um canal novo custaria posse e invalidação |

Decisão: transportar dentro do GLB. Para animar, a folha inteira precisa chegar de qualquer
forma; um segundo canal duplicaria orçamento e invalidação sem levar nada a mais.

## APIs conferidas (Context7, three r184)

- `GLTFLoader.assignTexture` aplica `KHR_texture_transform` por `extendTexture`, clonando a
  textura e escrevendo `offset`/`repeat`/`rotation`/`center`. A extensão está na lista de
  suportadas do loader.
- `assignExtrasToUserData` faz `Object.assign(object.userData, gltfDef.extras)` para nó,
  malha, primitiva e material. Logo `materials[i].extras.molda` chega como
  `material.userData.molda` sem parser próprio no consumidor.

## Prova planejada antes da mudança

- Sem a opção, o GLB portátil precisa sair igual ao de hoje, com o aviso de perda intacto.
- Com a opção, a transformação tem que apontar para o PRIMEIRO QUADRO DA SEQUÊNCIA, não
  para a célula 0: uma sequência que começa em 1 ou 3 reprova a implementação preguiçosa.
- Cada passo da sequência precisa mostrar a célula que o documento nativo tem, inclusive
  com repetição e fora de ordem, medido em pixels e não em índice.
- Validador Khronos e GLTFLoader reais, não só o leitor do próprio pacote.

## Implementação

- `export/sceneGlbFlipbook.ts`: `SCENE_GLB_FLIPBOOK_CONTRACT = 1`, o contrato
  (`sourceId`, `columns`, `rows`, `frames`, `fps`, `loop`) e `sceneGlbFlipbookTransform`,
  a fórmula da célula em UV do glTF. O contrato leva a grade e a sequência, nunca uma
  tabela de deslocamentos pronta: o consumidor roda a mesma fórmula.
- `SceneGlbMaterials`: `animatedPaint` faz a cor base exportar a folha inteira, sem emitir
  perda, com `KHR_texture_transform` no `baseColorTexture` e o contrato em
  `materials[i].extras.molda.flipbook`. A chave do cache de textura inclui a escolha, então
  as duas gravações nunca se confundem. Mapa de normal, rugosidade e metal com quadros
  continua no primeiro quadro e continua avisando: limite declarado, não esquecimento.
- `sceneGlb.ts`: opção `animatedPaint`; `extensionsUsed` só é declarado quando algum
  material realmente carrega a transformação.
- `testing/sceneStudioFlipbookContract.ts` e `--flipbook` no script de impressão: folha 4×4
  com quatro células de cor plana, sequência `[1, 3, 0, 3]`, e um oráculo por passo com
  deslocamento, escala e o RGBA esperado. Atualizar a fixture revisada do Estúdio continua
  sendo uma edição explícita de arquivo.

## Revisão

- A transparência do material passa a ser decidida pela folha inteira, não pelo primeiro
  quadro. É consequência necessária (um quadro posterior transparente precisa de `BLEND`)
  e tem teste próprio, com a cor base entrando como fundo da composição.
- A reflexão de V acontece duas vezes no caminho (linhas do raster invertidas e `1 - v` na
  geometria). A fórmula do contrato vale DEPOIS das duas, e é isso que o teste de pixels
  prova, célula a célula, em vez de conferir só o índice.
- `stats.pixelBytes` cresce com a folha inteira e continua sob o teto de 32 MiB do
  `texture()`; estourar recusa a exportação com a mensagem existente, nunca cai calado
  para o primeiro quadro.

## Provas

- Focal `sceneGlbFlipbook.test.ts` + `sceneGlb.test.ts`: **15/0**, 132 asserts.
- Integral **2.813/0**, 378 arquivos, 163,64 s. Tipos e Biome passaram.
- Validador Khronos: zero erros e zero avisos no GLB com a extensão.
- GLTFLoader real entrega `material.userData.molda.flipbook` idêntico ao contrato.
- Fixture impressa: 4.343 bytes, `extensionsUsed: ["KHR_texture_transform"]`, transformação
  `{offset: [0.5, 0], scale: [0.5, 0.5]}` para a sequência que começa na célula 1.
- Vite 1,63 s; Three 579,29 kB mantém o aviso acima de 500 kB, teto não aumentado.
- Kids: tipos 0, build 4,7 s, 59 páginas, 616/0.

## Limites

- O loader não decodifica PNG fora do navegador, então `map.offset`/`map.repeat` reais
  ficam para o gate de browser. Aqui provou-se o que o JSON declara e o que o loader entrega
  em `userData`; não se afirma comportamento de textura em GPU.
- Cinco avisos `act` na integral (LoadedEditor, EditorTopBar ×2, FacePaintDialog,
  ModelEditor), os mesmos componentes registrados no lote 219. Nenhuma supressão e nenhuma
  correção alegada: a interação da suíte segue sem diagnóstico, agora com reprodução fresca.
- Não implementa consumidor nem conexão da oficina, não muda o worker de exportação, não
  ativa formato público e não homologa aparência, GPU, toque ou compreensão por crianças.
