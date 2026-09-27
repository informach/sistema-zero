# GLB: transporte compacto do lote 99

08/09/2026, Windows, AMD Ryzen 5 5600G, Bun 1.3.11. Mesmas fixtures,
três aquecimentos/vinte amostras, worker novo por pedido. Uma alavanca:
Float64 + códigos de curva para chaves no protocolo privado. Sem mudança no
domínio, persistência, encoder, geometria, pixels ou curvas autorais.

## Régua antes/depois

Acrescentado `prepareCallSyncMs` **antes** da mudança de transporte. Mede do
instante anterior à chamada de preparação até receber sua Promise: inclui
empacotamento, criação do worker e `postMessage`, não só o envio isolado.
Comando: `bun scripts/bench-scene-glb-worker.ts` em `packages/molda`.

| Cena | Antes: síncrono p50 / p95 / máx. (ms) | Depois: síncrono p50 / p95 / máx. (ms) | Total p95 antes → depois (ms) |
| --- | --- | --- | --- |
| 1 peça, 1 face, 3 chaves | 0,426 / 0,616 / 0,729 | 0,484 / 0,646 / 0,881 | 46,931 → 48,822 |
| 1 peça, 9.216 faces, 64 chaves | 36,136 / 48,585 / 55,102 | 33,594 / 43,502 / 45,864 | 307,791 → 307,980 |
| 128 peças, 65.536 chaves, pintura 512² | 48,874 / 58,097 / 60,697 | 7,807 / 13,102 / 14,649 | 265,852 → 237,674 |
| Mesma animação, 8 camadas 1024² (32 MiB) | 61,164 / 73,063 / 75,799 | 26,445 / 37,343 / 38,634 | 498,292 → 511,780 |

Redução do síncrono p95: 77,4% no terceiro cenário e 48,9% no quarto.
Sem promessa de redução universal do total; o quarto oscilou para cima.
Envio isolado p95 depois: 0,129 / 43,190 / 3,280 / 30,507 ms.
Maior intervalo de timer p95 antes: 28,420 / 60,635 / 62,240 / 78,231 ms;
depois: 29,955 / 48,640 / 30,957 / 46,376 ms.

Repetição com `bun --cpu-prof --cpu-prof-md --cpu-prof-dir ../../.audits/molda-evolution
--cpu-prof-name scene-glb-worker-l99 scripts/bench-scene-glb-worker.ts`:

| Cena | Síncrono p50 / p95 / máx. (ms) | Total p95 (ms) | Timer p95 / máx. (ms) |
| --- | --- | --- | --- |
| Simples | 0,382 / 0,688 / 0,707 | 46,272 | 19,588 / 21,743 |
| Geometria | 34,388 / 39,507 / 47,348 | 306,547 | 50,947 / 56,850 |
| Muitas chaves | 8,205 / 10,372 / 11,084 | 255,884 | 29,753 / 29,960 |
| Teto de pixels | 22,511 / 31,915 / 42,416 | 482,626 | 43,574 / 58,466 |

Perfil: 25,28 s, 386 amostras, self-time atribuído a `postMessage` 36,2%,
`deepEquals` 29,2%, `Float64Array` 2,9% e `packAnimations` 1,8%.
Perfil anterior: 26,35 s, 672 amostras, `postMessage` 55,5%. Inclui oráculos,
fixtures e esperas do harness; percentuais de amostragem não são tempos exatos
por operação nem representam CPU exclusiva da UI. Timer Windows/Bun não mede
frame/input delay. Geometria e pixels ainda são clonados, e a repetição não
comprova um teto universal de 50 ms ou fluidez em hardware infantil.

## Prova de comportamento e revisão

Quatro hashes GLB idênticos, estatísticas/avisos iguais e fonte intacta após
todas as execuções. Buffers autorais não transferidos. Testes exercitam todas
as curvas/canais, subnormal Double, quaternion autoral não normalizado, clipe
vazio, ausência versus lista vazia, 65.536 chaves e fronteira hostil estrita.
O leitor privado reconstrói e chama o leitor nativo; não substitui validação
semântica por simples desempacotamento.

A revisão encontrou um caso de campo reservado ocultando campo extra autoral
(`keyCount` em uma trilha). Teste falhou antes das guardas estritas de pedido,
clipe e trilha e passou depois; elas rodam antes das alocações agregadas.

SHA-256, na ordem dos cenários:

- `4707313ab3aac51447d13fb3eddf8d43672ff89cf2049c4981039f03fa4747ad`
- `285273a089d923376d2f3594f27c206cfe7dd5814cd719df2c94fa5df531ea6f`
- `c507fed5d7b40547712d2904e1699c4a1011b9e287c212529a0395ad4465bc25`
- `a49b51a9cebdb8db7342e724199ce6d58689e758734beab9176bbcbeb641f3f0`

Verificação final: 1.345 testes/198 arquivos, zero falhas (78,76 s), typecheck,
Biome 622 arquivos, Vite 1,16 s e diff-check. Worker separado 63,79 kB; Three
mantém aviso >500 kB. Último Kids é o do lote 97. Sem QA visual neste ambiente.

Reversão localizada, se necessária: retirar apenas o transporte compacto,
conservando worker, revisão/consentimento e mudanças não relacionadas.
