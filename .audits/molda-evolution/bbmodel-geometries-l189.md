# Geometria editável bbmodel, lote 189

## Escopo e contrato

convertBbmodelGeometries reúne os planos topológicos, posições e UV normalizado
privados e correspondentes. Não é um parser de planos fornecidos externamente.
Os leitores de fonte e os limites dos estágios anteriores continuam obrigatórios.
Não relê JSON, abre imagens, aplica transforms world ou aprova aparência/hierarquia.

Cada plano gera uma SceneMeshGeometry própria. IDs de vértices são locais e
determinísticos; nomes arbitrários de origem não viram chaves perigosas. Todos os
pontos permanecem, inclusive os sem superfície e os coincidentes com identidades
diferentes. Faces mantêm os IDs planejados, a diagonal escolhida no lote 184 e UV
por canto original. Arestas soltas não são fundidas por coordenadas.

Texturas exigem vínculos explícitos para IDs nativos válidos. Faces sem textura
omitem materialId e herdam o material do futuro nó, permitindo cor padrão por peça.
Não se escolhe a primeira textura nem um substituto para uma ligação ausente.
O mapa de materiais é copiado; não aprova que o material existe no documento final.

Os custos privados agregados de geometria/vértices/triângulos/arestas são conferidos
antes de consumir coordenadas. Todas as identidades dos estágios e comprimentos de
posições são conferidos antes da primeira cópia. UV de face/canto ausente é erro de
composição, nunca preenchimento zero. O leitor público ainda validará o documento.

O builder nativo real verifica desenho uma vez por geometria. Faces degeneradas,
cruzadas ou que colapsam em Float32 geram contagens separadas, sem remover faces
armazenadas. A contagem é de polígonos nativos; um quad convertido em dois triângulos
pode produzir dois avisos. Cubo sem espessura não recebe espessura artificial.
Erro numérico do builder é traduzido com causa; bugs comuns não são engolidos.

As coordenadas e UV privados são copiados sem arredondamento. O leitor persistido
nativo mantém sua normalização já existente de -0 para +0; não há promessa de
preservar o sinal de zero em toda a serialização. Não há solda, snap ou nova migração.

## Review e cobertura

Três revisões bbmodel, cubos e malhas, coordenadas locais sem novo bake de pivô,
diagonal, seams entre materiais, herança sem textura, IDs literais __proto__,
identidades coincidentes/arestas, fonte e arrays irmãos intactos. Construção de
documento nativo e exportação GLB com leitor independente e Khronos Validator.
Esse fixture usa materiais sólidos; não comprova adoção de bitmap bbmodel.

Fixtures próprias para face cruzada, triângulo colinear, colapso Float32, cubo
sem largura, gaiola inteiramente desabilitada e malha vazia. Todos passam pelo
pipeline real até o builder e leitor nativo. Gates de custo e correspondência
usam coordenadas envenenadas para provar ordem; custos adulterados nesse teste
representam estágio privado, não aprovação de planos externos.

Primeira checagem de tipos encontrou duas anotações de teste incorretas: Vec3
é exportado pelo núcleo, não pelo documento; o código do caso precisava da união
literal. Corrigidas sem mudar produção, asserts ou comportamento para satisfazê-las.

Limitações mantidas: normais flat/smooth autorais, normal de quad não planar,
shade de cubo invertido, camadas/PBR, visibilidade, hierarquia e animação ainda
precisam das etapas de compatibilidade antes de qualquer adoção completa.

## Evidências

Focal novo: 11 passes, zero falhas, 144 asserts, 547 ms. Tipos finais passaram.
Biome 982 arquivos passou. Focal expandido: 124 passes, zero falhas, 813 asserts,
cinco arquivos, 2,38 s. Integral: **2.299 passes, zero falhas, 313 arquivos,
8.253.809 asserts, 138,18 s**, exit 0. Vite 1,24 s, chunks idênticos ao lote 188;
aviso Three >500 kB permanece. Kids exit 0: compilação 5,7 s, tipos 9,5 s,
59 páginas em 700 ms. Diff check passou com três avisos CRLF anteriores.
Sem benchmark novo, dependência, UI bbmodel ou ativação pública.
