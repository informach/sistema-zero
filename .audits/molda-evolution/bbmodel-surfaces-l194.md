# Compatibilidade de superfícies bbmodel, lote 194

## Implementação e review

assessBbmodelSurfaces consome os metadados, planos de topologia e UV normalizados
privados correspondentes. Limite de geometrias e todos os vínculos são conferidos
antes das faces. Labels desconhecidos de shading, render_order e seams são
recusados mesmo quando todas as adaptações conhecidas foram aceitas.

As escolhas são independentes: normais por triângulo do Molda; descarte de ordem
behind/in_front; descarte das indicações join/divide usadas para abrir costuras;
descarte de shade=false; sampler com limite nas bordas do quadro. O gate não muda
XYZ, UV, faces, imagens ou fonte. Descontinuidades UV existentes permanecem intactas.
Descartar labels de seams não significa soldar/desfazer o mapa UV.

Toda peça com superfície requer a escolha molda-flat. O relatório distingue cubo,
mesh flat e mesh smooth, contando faces originais, não triângulos resultantes.
Não há afirmação de equivalência de normais: origem usa normais de caixa, normais
por face/quad ou suavizadas; nativo usa as normais de seus triângulos. Mesh smooth
vazio também relata a configuração não armazenada, com contagem zero. Normais
nativas podem coincidir em formas simples; a escolha não afirma que toda face mudou.

UV externo em faces texturizadas exige clamp explícito. Conta cada canto original
uma vez, mesmo em quads divididos. Coordenadas ficam intactas; o sampler nativo
limita o resultado ao quadro atual, enquanto a origem pode amostrar outra parte
da folha animada. A política de wrap/material do lote 191 continua independente.
Faces sem textura não consultam coordenadas para esta decisão visual.

## Evidência de origem e nativa

[Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js),
[Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
e Outliner conferidos no cache do commit fixado. Mesh.getNormal usa os três
primeiros pontos; preview flat reutiliza essa normal nos dois triângulos do quad.
Cube usa geometria de caixa e atualiza posições. Implementação própria, sem
copiar/executar GPL. buildSceneGeometry e SceneRenderResource conferidos localmente.

Três revisões de bbmodel atravessam leitores reais até documento e GLB/Khronos.
Oracle analítico de uma face torcida distingue (0,0,1) do segundo triângulo nativo
(1,-1,1)/sqrt(3). Cubo invertido, smooth/vazio, descarte separado de metadados,
chaves literais, labels desconhecidos, limites/opções/estágios e ausência de
mutações cobertos. Pipeline real de PNG de dois quadros até imagem/material e
SceneRenderResource confirma DataTexture 2x2, nearest/clamp, pixels do quadro
correto e reutilização da textura ao trocar quadro. É prova CPU/estado de recurso,
não teste GPU. GLB mantém sua confirmação própria de flipbook-first-frame.

A primeira checagem de tipos encontrou o fixture de opções anotado com campos
opcionais diante de um resultado completo; foi corrigida a tipagem da constante
com satisfies, sem alterar produção. O teste GLB inicialmente tentou exportar
flipbook sem aceitar perda; passou a verificar a recusa, o diagnóstico exato e só
então a exportação com allowLosses. Nenhuma proteção foi afrouxada.

## Verificação

Novos: 11 passes, zero falhas, 207 asserts, 621 ms. Tipos passaram após a correção
do fixture; Biome 994 arquivos passou. Focal ampliado: 133 passes, zero falhas,
1.001 asserts, seis arquivos, 2,53 s. Integral: **2.365 passes, zero falhas,
319 arquivos, 8.320.650 asserts, 137,78 s**, exit 0. Vite 1,28 s com os mesmos
chunks/CSS e aviso Three >500 kB; Kids compilou em 5,5 s, tipos em 9,6 s e
59 páginas em 634 ms, exit 0. Diff check passou com os três avisos CRLF anteriores.

Ainda não cobre todos os campos brutos restantes, camadas/PBR completos, clipes/
expressões, recursos externos completos, UI, worker ou adoção. O gate precisa ser
consumido pela composição e manter seus avisos no relatório final. Sem nova
dependência, benchmark, ativação pública ou alegação de ganho de desempenho.
