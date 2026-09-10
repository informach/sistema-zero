# Lote 38: extrusão nativa, CPU

Baseline anterior à otimização, 07/09/2026, Windows 10.0.26200, Ryzen 5 5600G,
Bun 1.3.11. 8 aquecimentos, 40 amostras, nearest-rank. Sem render/GPU/latência física.
Fixture e saída passam pelo leitor estrito e permanecem dentro de 20k triângulos.

| Quads | p50 ms | p95 ms | p99 ms | Variação de heap, dependente do GC |
| --- | ---: | ---: | ---: | ---: |
| 900 | 17,032 | 23,462 | 40,660 | +24.250.443 B |
| 9216 | 211,231 | 227,081 | 258,773 | -20.582.157 B |

Perfil: `scene-surface-l38-before.cpuprofile.cpuprofile` e `.md` gerados pelo
profiler Bun, 100 amostras de operação. Não usar tempos instrumentados como baseline.
O call site `meshExtrude.ts:36` para preparação de face responde por 48,6% inclusivo;
`meshFaceFrame.ts:16`/triangulação por 25,7%. Maps/arrays aparecem como custos nativos.

Oportunidade escolhida: memorizar frames puros no snapshot do gesto. Impacto 4,
confiança 5, esforço 2: score 10. Não alterar triangulação, ordenação, geração de
IDs, condições de rejeição ou operações aritméticas. Demais custos ficam para nova medição.

Prova esperada: mesma função pura para frames cacheados/recalculados; mesma ordem
de visita/alocação e operações Float64; sem RNG adicional. Cache pertence a um gesto
e uma malha imutável, limitado por payload e entradas e esvaziado ao encerrar. API
de operação pontual mantém recalculação. Reverter somente essa integração/adapter
com patch, sem reset do WIP. Não houve commit automático.

Goldens SHA256 fixados no benchmark incluem ID da geometria, ordem/IDs de faces e
vértices, coordenadas, UV por canto, materiais e arestas. 900:
`bedd7d1412018fd2dd0d4a7eed2139d03abe4492c3b03199da5b6d453eb4fb80`;
9216: `9eb3adc6060e422bbcbc5653fd47455afc88c4771dc146a8b7b1b5aca2706bdd`.

## Resultado da primeira mudança

| Quads | p50 ms | p95 ms | p99 ms | Preparação inicial ms | Payload retido B |
| --- | ---: | ---: | ---: | ---: | ---: |
| 900 | 8,951 | 11,862 | 15,458 | 37,062 | 587.400 |
| 9216 | 110,283 | 126,074 | 137,911 | 282,468 | 6.023.424 |

Hashes anteriores passaram sem alteração. Teste de 20 sessões compara resultados
frescos/preparados byte a byte, distâncias positivas/negativas/zero, descarte e
rejeição de callback após descarte. Cache de 8 MiB contabilizados, não heap real.

Perfil novo em `scene-surface-l38-after.cpuprofile.*`: frame/triangulação deixou de
dominar, incidência/regiões e validação tornam-se próximos alvos. Não houve outra
otimização nesse lote. O cenário stress ainda não cumpre 50 ms; não aumentar o teto
para esconder isso. Preparação inicial continua síncrona e precisa ser abordada.

Verificação final: 857 testes, zero falhas, typecheck/Biome/Vite passaram.
