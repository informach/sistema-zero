# Lote 17: separar a vida útil espacial e UV

## Perfil e oportunidade

Extraída a mesma construção de buffers de `MoldaViewport.createEntry` para um
recurso com atualização baseada no hash anterior. Antes de otimizar, benchmark
de 128 esferas/15360 triângulos válidos, roundtrip nativo exato, 8 warmups/40
amostras no Ryzen 5 5600G, Windows 10.0.26200/Bun 1.3.11: p50/p95/p99
8,840/10,692/13,664ms para sincronizar geometrias após mudança de paleta.

O perfil anterior com 1000 repetições atribui 62,7% à reconstrução espacial,
incluindo normais/trigonometria/alocação. Impacto 4 × confiança 5 / esforço 2 = 10.
Alavanca: invalidar UV separadamente, sem reconstruir posições/normais.
Não foram alterados algoritmos de triangulação, projeção ou construção de normais.

## Prova de comportamento

- Ordem preservada: mesmos triângulos/vértices/faces, inclusive tampas intercaladas.
- Desempate: inalterado, a mesma ordem do documento e do atlas.
- Ponto flutuante: mesmos bytes Float32, sem reordenar expressões de UV. Mantida
  identidade de derivação do espelho no hash espacial (o cálculo anterior arredonda
  coordenadas absolutas antes de subtrair o pivô).
- Aleatoriedade: nenhuma nova; fixture usa IDs fixos, não depende de UUID de Three.
- Golden SHA256 dos buffers e faces: `3c20f41243c43b6a3c8334d12e117cfb901d4a4bcda1c9e19c2bddc5c9eaeaf5`.
  Fica fixo no script e foi conferido antes/depois.
- Comparação com o algoritmo anterior para todas as formas, mesh/gêmeo, cor,
  acréscimo de pintura, fallback de atlas, transformação e redimensionamento.

`PartGeometryResource` pertence a uma peça no viewport, não ao documento. O Mesh,
contornos e alças sobrevivem a mudanças apenas de pintura/UV. Uma união limitada
de faixas pendentes não cresce com repetições sem render e não perde uma face
alterada antes de outro update. Descarte idempotente; recurso fechado não revive.

Revisão encontrou um contrato incorreto no núcleo: `faceRanges` era uma faixa
única mesmo nas tampas intercaladas do cilindro. Um teste anterior à correção
mostrou triângulos `bottom` dentro da faixa `top`. O núcleo agora retorna listas
de spans contíguos, consumidas pelo recurso; não duplicar o índice no viewport.
Entrypoints públicos permanecem puros; não há mudança de documento/export.

## Resultado e limites

Após a revisão do núcleo: p50/p95/p99 0,046/0,071/0,122ms, mesmo golden. A medição
isola sincronização de geometria, não inclui rasterizar atlas, shader, driver ou
GPU. Não é FPS, input p95 nem promessa de desempenho em tablet. O recurso retém
UV local (24 bytes/triângulo) e spans por face, limitados à geometria viva; 20 ciclos
testam descarte de recursos, não constituem medição de heap/GPU sem vazamento.

Não houve commit. Para reversão deste lote, reverter somente a extração, contrato
de spans e consumidores correspondentes, preservando o WIP anterior do usuário.
Não remover guardas de versão nem alterar formato 1 ao reverter o viewport.
