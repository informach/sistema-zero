# Seleção de componentes: revisão de desempenho do lote 45

CPU local, Ryzen 5 5600G, Windows, Bun 1.3.11. Três aquecimentos e dez amostras;
p95/p99 nearest-rank (ambos o máximo com dez amostras). Não mede GPU nem entrada.
Fixtures planas conectadas, seleção de todas as faces com oclusão, câmera ortográfica.

## Antes

| Quads | Perfil ligado | Primeira chamada | p50 | p95/p99 | Operações/s |
| --- | --- | --- | --- | --- | --- |
| 900 | Não | 79,216 ms | 56,210 ms | 62,213 ms | 17,42 |
| 9216 | Sim | 7166,503 ms | 7081,481 ms | 7408,051 ms | 0,14 |

Heap delta dependente de GC: 4.647.321/20.560.205 B; maior RSS amostrado do processo:
250.814.464/350.081.024 B. Não são pico de alocação nem memória retida pelo editor.
Perfil `scene-selection-l45-before.cpuprofile`: 13.207 amostras. As maiores funções
são interseções por triângulo do Three: checkGeometryIntersection, intersectTriangle,
checkIntersection e _computeIntersections. Cada ponto testa a superfície toda.

## Mudança proposta e prova

Uma mudança: índice espacial de triângulos para os testes de oclusão, construído
uma vez por geometria durante cada consulta, sem cache persistente/global. Score:
impacto 5 × confiança 5 / esforço 3 = 8,33. Usar three-mesh-bvh 0.9.2, com exports
ESM explícitos. A 0.8.3 já presente no monorepo carrega a cópia CommonJS do Three
no Bun, ao lado da ESM, mesmo ambas sendo 0.184.0. Adicionar dependência direta;
nunca modificar Mesh.prototype nem os buffers de desenho/autorais.

Cada índice recebe cópia própria de posições e ordem indireta, compartilhada entre
espelhos apenas durante a consulta. Transformações e recorte da câmera continuam
com o Three e o mesmo teste de profundidade. A ordem de IDs e o desempate de picking
permanecem nos chamadores, que não mudam. Sem RNG. Confirmar a equivalência numérica
com raycasts de referência, escalas não uniformes, shear, espelhos e plano próximo.

Goldens fixos da seleção ordenada:

- 900: `d9327d24a30236d0cb033d5fac087355a8a76054178957bd07e93fa00fb7ea67`
- 9216: `3f8d574f55de3beba8752275cf7c27b65051e38206794a677331a5979f787568`

Reverter somente os arquivos dessa integração via patch, preservando WIP anterior.
Reexecutar testes de picking e benchmark. Nenhum commit/deploy faz parte deste lote.

## Depois

| Quads | Perfil ligado | Primeira chamada | p50 | p95/p99 | Operações/s |
| --- | --- | --- | --- | --- | --- |
| 900 | Não | 21,807 ms | 4,369 ms | 10,066 ms | 197,16 |
| 9216 | Não | 81,295 ms | 40,105 ms | 49,857 ms | 24,07 |
| 9216 | Sim | 71,104 ms | 43,285 ms | 53,060 ms | 22,51 |

Goldens passaram em todas as medições. Heap delta: 6.842.658/25.249.047/−9.061.493 B;
maior RSS amostrado: 262.594.560/351.584.256/363.864.064 B. Os números não demonstram
redução de memória. A comparação com perfil ligado usa dez amostras dos dois lados.
O perfil posterior tem só 143 amostras: suficiente para registrar a execução, não
para ordenar com confiança os próximos gargalos. Reperfilar antes de outra otimização.

Teste independente compara 16 mil consultas/asserções com raycasting nativo,
incluindo posições nas superfícies, perspectiva/ortografia, shear, escala espelhada,
planos recortados e vinte ciclos de descarte. Fonte mantém posições/índices/materiais;
nenhum prototype recebe patch. A licença MIT da versão instalada foi inspecionada.

Custo de entrega: chunk SceneViewport 33,10 → 77,33 kB (gzip 9,81 → 24,24 kB);
Three 559,62 → 579,25 kB (gzip 141,82 → 146,74 kB). Entrada principal permanece
281,70 kB. O aviso >500 kB continua. Não há comprovação GPU/browser/toque; a primeira
consulta grande e o p95 com perfil ainda excedem 50 ms. Sem ativação pública/cloud.
