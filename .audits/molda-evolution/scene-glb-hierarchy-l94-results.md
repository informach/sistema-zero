# Lote 94: preparação da hierarquia de exportação

08/09/2026, Windows, Bun 1.3.11. Baseline de uma capacidade nova, não comparação
antes/depois. Comando: `bun scripts/bench-scene-glb-hierarchy.ts` em `packages/molda`.
Dez aquecimentos, 30 amostras; JSON dos nós idêntico ao golden calculado antes de
cada cenário. Contagem/tamanho JSON são de nós, **não** do arquivo GLB completo.

| Cenário | Nós derivados | JSON dos nós (bytes) | p50 / p95 / máx. sem profiler (ms) | p50 / p95 / máx. com profiler (ms) |
| --- | --- | --- | --- | --- |
| 1 peça com shear | 2 | 392 | 0,063 / 0,132 / 0,134 | 0,067 / 0,133 / 0,246 |
| 128 peças com shear | 256 | 50.542 | 1,591 / 3,242 / 5,132 | 1,383 / 3,457 / 4,023 |
| 448 grupos + 64 peças + 64 espelhos no mesmo plano | 2.049 | 439.310 | 8,329 / 13,253 / 13,902 | 9,412 / 15,017 / 15,983 |

Perfil: `scene-glb-hierarchy-l94.md` e `.cpuprofile`, 622,4 ms/87 amostras.
Inclui fixtures, indexação, fatoração, os três cenários e JSON de comparação.
Maiores funções próprias: stringify 12,8%, get 11,9%, unit 10,2%, finiteTuple
7,4%, affineMultiply 5,3%. Não são tempos exclusivos de uma operação.

A fatoração não forma AᵀA: Jacobi atua em três colunas, com no máximo 32 varreduras.
Transformações de um nó são fatoradas uma vez e reutilizadas para suas instâncias,
com arrays próprios na saída. Espelhos no mesmo plano compartilham caminhos de
ancestrais; somente folhas recebem vínculos de malha. Pré-flight limita a expansão
a 16.384 nós antes de criar as cadeias, sem compor pixels ou construir buffers de malha.

Oráculos: 500 produtos afins determinísticos compostos pelo Three, casos de shear,
reflexão, posto 0/1/2, eixos subnormais independentes e falhas numéricas explícitas.
Tolerância da recomposição por coluna: 1e-12; não é igualdade bit a bit. A matriz
autoral não muda. Carregador glTF real do Three verifica hierarquia, locators,
espelhos, ancestrais animados e camadas separadas para animações locais/delta.

Limites: ainda não escreve geometria, imagens, clipes binários ou o container GLB;
não testa upload, materiais, GPU, navegador nem instâncias do runtime Studio.
Benchmark cobre preparação síncrona de CPU, não latência total da futura exportação.
