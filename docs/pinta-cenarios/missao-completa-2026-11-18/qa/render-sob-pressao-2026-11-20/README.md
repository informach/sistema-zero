# Renderização sob pressão — provas e limites

O compositor existente agora desenha diretamente as células quando o conjunto
de blocos visível ultrapassa o cache e a rasterização permite conservar todos
os pixels. O teto continua em 32 MiB. Não há mudança de documento, visual,
histórico, física, contrato do Estúdio ou formato externo.

## Condições de conservação visual

Tamanho e posições de destino inteiros, transformação de contexto alinhada,
sem suavização, filtro, sombra ou composição especial. Peças transformadas em
escala fracionária continuam no renderer anterior: a revisão demonstrou que
espelhar antes/depois de reduzir escolhe pixels diferentes. Não foi adotada
tolerância na comparação. O recorte adicional descarta somente células fora
dos limites reais do canvas, conservando a ordem das demais.

## Gates locais

- Pinta: **2.264 aprovados, zero falhas e omissões**, 27.296 verificações,
  193 arquivos, 238,66 s; Python/Pygame real disponível.
- Núcleo focado: **41 aprovados**, incluindo 22 casos novos de pixels,
  flags, animação, transparência e recusa das condições incompatíveis.
- Autoridade e oficina no Chromium: **21 aprovados**, sem retries,
  falhas/omissões, 53,3 s. Inclui os leitores históricos reais, quota/CAS,
  cópias offline e um mapa 256 × 256 com 32 camadas e peças de 48 px, editado
  pela interface com rolagem e desfazer/refazer em desktop e CPU 4×.
- Comparação contra o código publicado em
  `0ebb89a63c4dc0d2e078023dbcaa3cb6a42a336d`: **três perfis aprovados**,
  35,1 s. As **72 imagens completas** tiveram SHA-256 igual: duas folhas,
  grupos, opacidade, transparência, deslocamentos, oito flags e animações,
  em quatro escalas/três instantes. Desktop, toque emulado e CPU 4×.
- Tipos do Pinta e do harness/servidor: saída 0. Biome: saída 0,
  16.486 arquivos em 45 s. Documentação acrescentada depois foi conferida
  no fechamento. O typecheck integral do Estúdio pós-merge é evidência distinta.

As capturas foram inspecionadas; mantêm a oficina e os controles existentes.
Os perfis emulados não são aparelhos físicos adicionais. Os destinos externos
não foram reexecutados neste lote: suas provas permanecem no lote 7, e a
suíte Pinta repetiu as regressões automatizadas correspondentes.

## Medição repetida nesta máquina

Três aquecimentos e dez execuções por versão, cada execução com três frames.
O baseline usa o código publicado real via build de QA, sem alteração do
arquivo de produto. Ambos usam a configuração sem suavização do palco.

| Renderer | Frames medidos | p50 | p95 | p99 | Cache retido | Canvases de blocos alocados |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Publicado | 30 | 498,8 ms | 589,5 ms | 711 ms | 27 MiB | 3 |
| Atual | 30 | 198,6 ms | 276,6 ms | 314,2 ms | 0 | 0 |

Mapa de 2.097.152 células, 32 camadas e peças de 48 px. A pressão estimada
permanece em 576 MiB; o novo caminho evita materializar esses blocos RGBA.
Esses resultados representam uma repetição local em máquina compartilhada,
não uma certificação de hardware ou garantia universal de ganho. O pior
caso ainda é lento. Heap, buffers, espelho legado e IO permanecem discriminados
nos JSONs; snapshots de heap não medem pico nem a memória total do processo.

## Continuação

Este lote 8a2 reduz trabalho de composição e amplia culling seguro. A abertura
autoral ainda é densa. Streaming sob demanda, mapas expansíveis, automapping
multicamadas, projeções e o ciclo autenticado de homologação permanecem no
plano principal. Não declarar a etapa 8 ou a missão inteira concluída.

`origem.json` registra hashes e comandos; `fontes.json` identifica os arquivos
exercitados; `checksums.json` permite conferir os artefatos normalizados.
