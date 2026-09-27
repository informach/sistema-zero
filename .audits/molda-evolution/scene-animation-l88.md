# Limites de poses e viewport — lote 88

08/09/2026, mesmo ambiente CPU local do lote 85. Rodar
`bun scripts/bench-scene-animation.ts` em `packages/molda`.

O benchmark passou a comparar limites calculados integralmente e com cache local
da mesma revisão. 30 aquecimentos, 100 amostras; ordem dos dois caminhos alterna
por amostra. Resultados são idênticos por JSON em todos os cenários/tempos, sem
arredondamento de fonte. A medição não inclui DOM, interação, GPU ou renderer.

| Cenário | Limites integrais p50 / p95 / p99 ms | Cache p50 / p95 / p99 ms |
| --- | --- | --- |
| 1 peça, 9.216 faces | 1,112 / 1,640 / 2,107 | 0,011 / 0,024 / 0,030 |
| 128 peças/nós, geometria pequena compartilhada | 0,400 / 0,743 / 2,022 | 0,388 / 0,867 / 6,203 |
| 128 peças, 512 nós | 0,635 / 1,423 / 4,467 | 0,607 / 1,378 / 2,697 |

Repetição com profiler: p95 integral/cache 1,742/0,028; 0,685/0,736;
1,464/1,146 ms. Não há ganho consistente para geometria pequena: a enumeração
de instâncias e suas caixas continua necessária, com dispersão de alocações.
Na primeira execução, antes de alternar a ordem, o caso de 512 nós teve p95
1,791/3,427 e p99 3,838/7,834 ms; não ocultar essa dispersão nem atribuir causa
exata a GC sem investigação isolada. Não prometer melhoria universal por cache.

Amostragem+aplicação de matrizes manteve p95 0,070 / 0,929 / 3,301 ms; controles
de update(documento) excluem amostragem, como no lote 85. Oráculo independente
de poses continuou com erro máximo 1,11e-15 e recursos reutilizados.

`scene-animation-l88-profile.md` (+ `.cpuprofile`): 2,14 s/268 amostras. Inclui
leitor, criação, desenho frio, controle integral, ambos os caminhos de bounds e
oráculo; não é perfil exclusivo de playback. indexSceneDocument lidera um dos
self-times (10,2%); não atribuir esse custo ao caminho incremental da pose.

Testes de viewport com Three real e renderer substituído na fronteira verificam
zero leituras de vértices após a preparação, bounds/pivô/câmera corretos, nenhum
frame pendente para poses constantes, guardas de revisão/contexto e restauração
da edição. Testes React verificam 30 frames sem novo setDocument, falha/recuperação
e desmontagem. A fixture agora informa dimensões reais também no canvas, não só
no container, para que a navegação ortográfica não divida por zero no DOM simulado.

Não houve teste de browser, GPU ou dispositivo real. O cache guarda uma caixa
por geometria e só a revisão atual; não retém históricos nem vértices copiados.
