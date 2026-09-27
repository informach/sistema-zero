# GLB: baseline de transporte do lote 98

08/09/2026, Windows, AMD Ryzen 5 5600G, Bun 1.3.11. Três aquecimentos,
vinte amostras por cenário, um worker novo por pedido. Comando:
`bun scripts/bench-scene-glb-worker.ts` em `packages/molda`.
Fixtures passam pelo leitor estrito; bytes, estatísticas, avisos e documento
original são comparados fora do intervalo medido. Não é benchmark de navegador.

| Cena | Total p50 / p95 / máx. (ms) | Envio síncrono p50 / p95 / máx. (ms) | Maior intervalo de timer p50 / p95 / máx. (ms) |
| --- | --- | --- | --- |
| 1 peça, 1 face, 3 chaves | 41,835 / 46,746 / 48,328 | 0,076 / 0,103 / 0,104 | 17,303 / 19,466 / 20,218 |
| 1 peça, 9.216 faces, 64 chaves | 275,943 / 303,313 / 310,484 | 35,316 / 43,994 / 44,114 | 39,734 / 46,873 / 59,879 |
| 128 peças, 65.536 chaves, pintura 512² | 227,855 / 256,369 / 291,175 | 44,764 / 55,805 / 56,428 | 60,448 / 62,501 / 63,545 |
| 128 peças, 65.536 chaves, 8 camadas 1024² (32 MiB) | 470,751 / 497,523 / 570,821 | 64,001 / 75,075 / 75,630 | 75,306 / 79,753 / 92,363 |

`new Worker` síncrono p95: 0,435 / 0,333 / 0,526 / 0,756 ms.
Leitura isolada do envelope de resposta p95: 0,164 / 0,089 / 0,055 / 0,102 ms.
A leitura isolada é uma repetição depois do recebimento; não mede entrega/deserialização.
O total inclui envio, inicialização, leitura/encoder no worker e resposta.
O timer de 1 ms no Windows tem granularidade observada muito maior que 1 ms;
seu maior intervalo não é uma medida de frame, input delay ou GPU.

Repetição com `bun --cpu-prof --cpu-prof-md --cpu-prof-dir ../../.audits/molda-evolution
--cpu-prof-name scene-glb-worker-l98 scripts/bench-scene-glb-worker.ts`:
envio p95 0,101 / 43,741 / 53,494 / 70,859 ms; timer p95
25,336 / 55,320 / 61,987 / 78,512 ms. O perfil inclui o harness e os oráculos:
26,35 s, 672 amostras; atribui 55,5% de self-time a `postMessage`, 23,0% a
`deepEquals` e 6,1% a `Worker`. Não interpretar percentuais do perfil como
tempo exclusivo do encoder nem otimizar as asserções do benchmark como produto.

As fixtures extraídas para `testing/sceneGlbFixture` preservam os três hashes
do lote 96. Nova medição CPU, sem mudança no encoder: p95 0,357 / 141,857 /
95,951 ms. Os dois cenários com muitas chaves excedem 50 ms só no envio:
deslocar o encoder não encerrou o gargalo na thread principal.

## Próxima oportunidade, antes da mudança

Compactar **somente as chaves de animação do transporte privado** em Float64
e códigos de interpolação. Impacto 4 × confiança 5 / esforço 2 = **10**.
Uma alavanca: não alterar geometria, pixels, persistência, encoder ou curvas.

Prova exigida: manter ordem de clipes/trilhas/chaves, metadados, valores Double
(inclusive subnormais), quaternion autoral sem normalizar, STEP/LINEAR/smooth,
e hashes GLB. Reconstruir e passar pelo leitor estrito dentro do worker.
Medir também o novo custo de empacotar na thread principal: reduzir apenas
`postMessage` não basta. Reversão, se necessária: retirar esse transporte privado,
preservando worker/confirmação e todo o trabalho não relacionado; sem reset.

SHA-256 dos quatro resultados:

- `4707313ab3aac51447d13fb3eddf8d43672ff89cf2049c4981039f03fa4747ad`
- `285273a089d923376d2f3594f27c206cfe7dd5814cd719df2c94fa5df531ea6f`
- `c507fed5d7b40547712d2904e1699c4a1011b9e287c212529a0395ad4465bc25`
- `a49b51a9cebdb8db7342e724199ce6d58689e758734beab9176bbcbeb641f3f0`
