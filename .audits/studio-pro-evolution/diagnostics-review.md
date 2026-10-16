# Lote 1a: hashes de diagnósticos

O filtro agora calcula uma vez por nó/conteúdo e não retém nós descartados (WeakMap). A publicação dos diagnósticos pelo serviço de linguagem também reutiliza o hash por arquivo dentro da rodada. Lista de logs e filtro são memoizados por entradas reais.

Prova: os 11 fingerprints do microbenchmark permanecem iguais. Caso de 100 diagnósticos/arquivo grande: p50 2.536 → 23,77 ms; máximo de 3 amostras 2.984 → 25,60 ms. Outros tempos variaram apesar de código inalterado, portanto não são atribuídos a esta mudança.

Review de comportamento: ordem e política de deduplicação Map preservadas; hash antigo rejeitado; troca e reutilização de nó com conteúdo diferente invalidam cache; sem alteração de revisão durável, autoria ou Zappy. Nove testes focados passaram (diagnósticos e linguagem). Sem RNG ou cálculo numérico de jogo alterado.
