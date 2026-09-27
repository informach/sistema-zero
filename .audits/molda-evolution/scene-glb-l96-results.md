# GLB completo: baseline CPU do lote 96

08/09/2026, Windows, Bun 1.3.11. Comando em `packages/molda`:
`bun scripts/bench-scene-glb.ts`. Dez aquecimentos, trinta amostras; tempo somente
do encoder. Leitura estrita das fixtures, igualdade dos bytes e hash fora do trecho
medido. É baseline de funcionalidade nova, não ganho contra exportação achatada.

| Cena | Bytes GLB | p50 / p95 / máximo (ms) |
| --- | ---: | ---: |
| Uma peça, uma face, 3 chaves | 2.184 | 0,225 / 0,362 / 0,470 |
| Uma peça, 9.216 faces, 64 chaves | 1.883.076 | 122,886 / 140,028 / 150,123 |
| 128 peças, malha e pintura 512² compartilhadas, 65.536 chaves | 1.140.892 | 67,200 / 81,484 / 86,601 |

As 128 peças produzem uma malha, um material, uma imagem, 256 nós e 128 canais.
Isso **não** reduz seus 128 draw calls a um nem comprova aceitação pelo Studio.
Os tempos acima de 50 ms exigem tarefa cancelável antes de integrar à UI.
Não medem GPU, browser, custo de clone entre threads, pico de memória ou hardware infantil.

Repetição com `bun --cpu-prof --cpu-prof-md --cpu-prof-dir ../../.audits/molda-evolution
--cpu-prof-name scene-glb-l96 scripts/bench-scene-glb.ts`:
p50/p95/máximo **0,216/0,344/0,444**, **123,470/132,459/134,832** e
**61,722/70,489/75,850 ms**, respectivamente. Todos os bytes continuam idênticos.
Perfil `scene-glb-l96.md` + `.cpuprofile`: 8,07 s, 949 amostras; inclui fixtures,
oráculos e todos os cenários. Maiores self-times: `every` 16,7%, compressão `dflt`
7,2%, `some` 4,9%, compositor 4,7%, `push` 4,2%. Não são percentuais exclusivos
do escritor de animações. Nenhuma otimização de hotspot foi misturada neste lote.

SHA-256, na ordem dos cenários:

- `4707313ab3aac51447d13fb3eddf8d43672ff89cf2049c4981039f03fa4747ad`
- `285273a089d923376d2f3594f27c206cfe7dd5814cd719df2c94fa5df531ea6f`
- `c507fed5d7b40547712d2904e1699c4a1011b9e287c212529a0395ad4465bc25`

Clipes mantêm STEP/LINEAR diretamente; vetores smooth/linear usam Hermite cúbico.
Smooth em quaternion e mistura STEP com outras curvas exigem aproximação explícita.
Limite analítico da amostragem smooth **antes de arredondar tempos/valores Float32**:
0,1 grau para rotação, 1/1024 da excursão para vetores. Não é garantia universal
após quantização nem no intervalo de salto: o salto misto vira transição no último
intervalo Float32 antes da chave. Teste mostra essa diferença deliberadamente.
Colisões de tempos/amostras são recusadas, nunca mescladas.

Verificação: 1.323 testes, zero falhas, 194 arquivos (74,89 s), typecheck,
Biome (610 arquivos), Vite (969 ms) e diff-check. Nove testes novos usam
Khronos Validator e GLTFLoader/AnimationMixer reais sem GPU, incluindo duas
instâncias independentes, espelhos, mudança de clipe, curva densa e tetos.
