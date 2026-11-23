# Mundos de 2 km: medidas

Plano: [`docs/plans/2026-11-23-mundos-de-2km.md`](../../../plans/2026-11-23-mundos-de-2km.md).
Medida local, com janela, na placa de vídeo desta máquina (`e2e/grande-gpu.spec.ts`,
`playwright.gpu.config.ts`): o herói percorre a rota pelos centros das regiões a 8 m/s por 90 s,
depois de 5 s de aquecimento, sem a trava de 60 quadros (mede a folga). A prova recusa a placa
emulada. Cada arquivo traz a placa de vídeo, o commit e se a árvore estava suja.

## Base: o jogo E de 384 m, antes de qualquer mudança (23/11/2026)

Commit `9973e9514`, NVIDIA GeForce RTX 3050 (Direct3D 11). Rota de 896 m pelas seis regiões.

| Perfil | Quadros/s (mediana) | Quadro p50 / p95 / máx. | Desenhos p95 | Triângulos p95 | Pior quadro numa entrada | Heap JS |
|---|---|---|---|---|---|---|
| `nativo` (1280×720) | 1250 | 0,8 / 1,3 / 8,8 ms | 34 | 212 mil | 6 ms | 269 MB |
| `notebook` (1366×768, CPU 4×) | 192 | 5,2 / 7,8 / 26,5 ms | 35 | 214 mil | 23 ms | 204 MB |

Texturas vivas na cena: 1,1 MiB (o chão só de cor sai a 2 px/m). Arquivos:
[`jogo-e-384m-nativo.json`](jogo-e-384m-nativo.json) e
[`jogo-e-384m-notebook.json`](jogo-e-384m-notebook.json).

O que ela diz para o plano:
- a placa desta máquina tem folga de sobra; o aparelho que manda é o notebook simples (a página de
  medida do staging, lote 8);
- o relevo inteiro a 1 vértice por metro já põe 212 mil triângulos na tela num mundo de 384 m: a
  2 km, sem menos detalhe longe, seriam milhões;
- o heap JS passa de 200 MB num mundo pequeno: a régua de 350 MB do aceite precisa ser vigiada a
  cada lote.
