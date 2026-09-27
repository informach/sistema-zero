# Lote 72 — compartilhar recursos de pintura entre acabamentos

Medição local em 07/09/2026, Windows, Bun 1.3.11. Antes da refatoração:

```sh
bun scripts/bench-scene-shared-paint.ts
```

Criação válida com 256 faces, 8/32/128 materiais e 8/16/16 imagens indexadas de
64². Conversão real do lote 71 gera atlas RGBA. Três aquecimentos, 20 amostras;
p95 nearest-rank. Tempo de composição inicial e atualização de um pixel pelo
`SceneRenderResource`, sem renderer/WebGL. Comparação byte a byte fora dos timers.

| Materiais | Atlas | Inicial p50/p95 ms | Pintura p50/p95 ms | Texturas derivadas | Bytes dos buffers |
| --- | --- | --- | --- | --- | --- |
| 8 | 256×256 | 22,826 / 28,762 | 2,673 / 4,020 | 8 | 2.097.152 |
| 32 | 256×512 | 158,511 / 174,467 | 17,270 / 18,693 | 32 | 16.777.216 |
| 128 | 256×512 | 586,919 / 613,218 | 68,908 / 81,007 | 128 | 67.108.864 |

Causa: cada material possui compositor, comparação e `RgbaTexture`, mesmo
compartilhando imagem/base. Alvo: um proprietário por imagem/base exatas, com
materiais independentes, atualização parcial uma vez e descarte após o último
usuário. Fontes diferentes não podem compartilhar pixels acidentalmente.

Ainda não são medidas de memória residente GPU, FPS, INP ou dispositivos reais.

## Depois da separação dos proprietários

Mesmo script, fixtures e 20 amostras, sem outra suíte pesada em paralelo:

| Materiais | Inicial p50/p95 ms | Pintura p50/p95 ms | Texturas derivadas | Bytes dos buffers |
| --- | --- | --- | --- | --- |
| 8 | 5,876 / 10,663 | 0,486 / 0,699 | 1 | 262.144 |
| 32 | 7,334 / 9,764 | 0,713 / 1,224 | 1 | 524.288 |
| 128 | 7,875 / 10,991 | 0,779 / 1,221 | 1 | 524.288 |

O caso 128 retém 512 KiB de buffers de textura em vez de 64 MiB. Não é compressão
nem redução dos bytes autorais: é eliminação de 127 cópias derivadas. O preparo
inicial ainda compõe a imagem; a edição ainda compara a camada alterada inteira.

`ScenePaintResource` possui raster/upload/contagem de transparência;
`SceneMaterialResource` possui só o acabamento e toma emprestada a textura.
`SceneRenderResource` prepara uma vez por imagem/base exatas, conserva apenas
fontes vivas e descarta depois de retirar o último material usuário. IDs de imagem
diferentes e bases que diferem por um Double permanecem isolados. Trocas de
paleta, resize, alpha, undo, erros antes de publicação e descarte têm regressões.
Grupos e materiais continuam independentes: este lote não reduz draw calls.

## Regressão após os mapas de materiais (lote 74)

Nova execução sem suíte pesada paralela: 8/32/128 materiais continuam com uma
textura e 262.144/524.288/524.288 bytes. Inicial p50/p95: 6,918/8,730;
12,250/41,096; 8,347/10,553 ms. Atualização: 0,667/1,079; 0,851/1,414;
0,986/1,575 ms. O p95 inicial de 32 materiais variou para cima; não ocultar
essa dispersão nem converter estes dados em promessa de latência/hardware.

## Regressão após recorte de flipbook (lote 76)

Mesmo cenário estático e execução isolada de suítes pesadas: uma textura por
imagem/base, 262.144/524.288/524.288 bytes para 8/32/128 materiais. Inicial p50/p95:
5,480/9,519; 10,644/44,524; 9,440/11,132 ms. Pintura: 0,573/1,005;
0,929/1,766; 1,179/1,972 ms. O pico inicial de 32 materiais continua presente;
esta execução não demonstra ganho de latência sobre o lote 74. O kernel novo
preserva a ausência de cópia extra no caminho estático; o caminho animado retém
também um buffer de quadro. Não há medição de reprodução, GPU ou memória residente.
