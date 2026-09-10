# Animação nativa — lote 85

08/09/2026, CPU local Windows/Bun 1.3.11, Ryzen 5 5600G. Não é medição de
WebGL, GPU, navegador, entrada, tablet ou usabilidade. Comando:
`bun scripts/bench-scene-animation.ts` em `packages/molda`.

Três cenários validados pelo leitor, 30 aquecimentos e 100 amostras cada. Clipes
com TRS lineares; comparação analítica independente com matrizes Three, fora do
trecho cronometrado. Erro absoluto máximo 1,1102230246251565e-15. Matrizes de
desenho idênticas entre os dois caminhos, geometria/material reutilizados.

| Peças / nós / chaves | Amostrar p50 / p95 / p99 ms | Aplicar pose p50 / p95 / p99 ms | Total p50 / p95 / p99 ms | Controle update(documento) p50 / p95 / p99 ms |
| --- | --- | --- | --- | --- |
| 1 / 1 / 192, malha 9.216 faces | 0,019 / 0,039 / 0,062 | 0,011 / 0,023 / 0,039 | 0,031 / 0,059 / 0,102 | 2,497 / 5,431 / 9,067 |
| 128 / 128 / 24.576 | 0,340 / 0,671 / 0,763 | 0,094 / 0,236 / 0,546 | 0,436 / 0,864 / 1,331 | 0,466 / 0,961 / 2,976 |
| 128 / 512 / 64.512 | 1,415 / 3,078 / 4,720 | 0,149 / 0,322 / 2,555 | 1,548 / 3,547 / 6,333 | 1,100 / 4,009 / 4,745 |

Preparação do amostrador: 0,427 / 0,630 / 1,519 ms, respectivamente. O controle
mede reconstruir o documento de transformações e chamar update, **sem amostragem**;
é comparação com o custo de aplicar pose, não com o total, e não representa uma
implementação anterior de animação. Os dois recursos são preparados fora do timer.

Repetição com profiler: total p95 0,062 / 0,888 / 3,895 ms e p99 0,107 / 1,129 /
5,252 ms. Profile em `scene-animation-l85-profile.md` (+ `.cpuprofile`): 1,71 s,
232 amostras. Inclui criação, leitor, desenho frio, controle e oráculo; o maior
self-time é indexSceneDocument (14,8%), usado no controle. Não atribuir esse
percentual ao caminho de poses. Não houve mudança no kernel após a medição.

Testes adicionais verificam 300 poses sem trocar atributos, aumentar versões de
upload ou copiar pintura, seleção por raio, espelhos, restauração, revisão obsoleta
e recusa atômica de matrizes fora de Float32. Nada disso mede heap/GPU ou encerra
as metas de dispositivo. Relógio, UI e integração com o Estúdio ainda são próximos lotes.
