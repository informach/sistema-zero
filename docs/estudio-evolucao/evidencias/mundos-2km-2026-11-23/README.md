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

## O mundo de prova de 2 km em campo (lote 7, 23/11/2026)

Gerado pela oficina com as intenções do agente (`packages/molda-cenarios/playground/oficina/qa-mundo-2km.ts`
e `playground/mundo-2km/preparar-cenario.mjs`), compilado em campo com "Juntar peças" e importado
pelo Estúdio (`preparar-jogo-e.ts` com `JOGO_E_PASTA=output/cenarios-reforma/mundo-2km`):

- base de 2048 m, 1024 × 1024 células de 2 m, relevo de colinas;
- 16 regiões de 512 m, um lago, uma estrada da vila à floresta, 1.194 objetos;
- pacote de 68 arquivos e 8,8 MiB (no formato de antes, só o relevo passaria de 80 MB); `cena.json`
  de 902 KB, com os números arredondados (o teto do Estúdio é 1 MiB: cabem cerca de 1.300 objetos;
  as colisões de cada objeto, com a matriz repetida, são a próxima coisa a juntar).

Medido a 20 m/s (atravessa várias regiões em 90 s), RTX 3050:

| Perfil | Quadros/s (mediana) | Quadro p50 / p95 / máx. | Desenhos p95 | Triângulos p95 | Pior quadro numa entrada | Heap JS |
|---|---|---|---|---|---|---|
| `nativo` | 500 | 2,0 / 3,6 / 10 ms | 78 | 126 mil | 10 ms | ~150 MB |
| `notebook` (CPU 4×) | 79 | 12,6 / 17,7 / 71 ms | 78 | 126 mil | 71 ms | ~200 MB |

Arquivos: [`mundo-2km-nativo.json`](mundo-2km-nativo.json), [`mundo-2km-notebook.json`](mundo-2km-notebook.json).

O ajuste que a medida pediu: com pedaços de 32 células e até 4 construídos por quadro, o perfil
`notebook` dava p95 de 33 ms; com no máximo 2 por quadro, 17,7 ms. Pedaços de 64 células davam
16,2 ms, mas 337 mil triângulos (acima da meta de 300 mil para placa integrada). Ficou 32 células e
2 por quadro (`PADRAO_DO_RELEVO`).

Comparação na vila, câmera "em volta" (o jogo E de 384 m foi gerado em 22/11, antes do conserto do
céu do Estúdio, por isso o céu preto): [`jogo-e-384m-em-volta.png`](jogo-e-384m-em-volta.png) e
[`mundo-2km-em-volta.png`](mundo-2km-em-volta.png). A estrada aparece sobre o relevo em campo, sem
tremido.

O herói (resolvido em 23/11/2026, à noite): o "herói do Molda" das páginas do jogo E era o
`HEROI_DO_MOLDA_GLB`, a peça técnica de teste de ossos do Molda (uma malha de 6 vértices, dois
triângulos planos de 25 cm, em três cópias espelhadas): no jogo ele aparecia deitado, com só os
"braços" à vista. Os dois jogos (384 m e 2 km) passaram a usar o aventureiro do curso A Ilha do
Farol (1,8 m, clipes `andando` e `parado`) com o andar dos jogos dos cursos ("Fazer … andar com as
setas", que vira o personagem para onde anda) e a câmera que segue de trás por um lado fixo
(`longe`, 7 m): a `tras` gira com o personagem e, com ele virado para onde anda, ficava na frente.
Medido na página: pés a 1 cm do chão; andando para frente ele fica de costas para a câmera.
