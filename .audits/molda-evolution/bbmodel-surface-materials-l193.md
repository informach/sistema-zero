# Metadados de superfície e materiais sem textura bbmodel, lote 193

## Implementação e review

readBbmodelSurfaceMetadata consome o estágio privado de TODOS os nós conhecidos,
incluindo os que depois serão omitidos. Marcadores numéricos finitos permanecem
metadados: valores fracionários/negativos e ausência não são convertidos em RGB.
Cubos conservam shade; meshes conservam shading, render_order e o mapa de seams.
Labels desconhecidos não são aprovados como capacidades de importação. Nós de
plugins permanecem opacos. Nenhum XYZ, UV, imagem ou código de plugin é executado.

O teto agregado de 262.144 declarações de seams é conferido antes dos valores
numéricos e da alocação dos mapas de saída. Chaves e valores têm limite de texto.
As chaves são literais, inclusive __proto__; não se tenta separar IDs unidos por
underscore, pois essa representação pode ser ambígua. O mapa convertido é próprio.
Seams de autoria e separações UV já materializadas são conceitos distintos.

convertBbmodelNodeMaterials cria um material padrão próprio por geometria. Peças
inteiramente texturizadas ou sem superfícies também precisam desse vínculo nativo,
mas não geram aviso de aproximação visível. Faces mantêm suas texturas explícitas.
Superfícies sem textura exigem untextured=uniform e relatam a cor RGBA escolhida,
lados, marcador original e quantidade de faces originais (não de triângulos).
RGBA é sRGB nativo, não uma leitura do marcador da origem. Nenhum material/textura
é escolhido por posição na lista. Arrays de material, opção e relatório são próprios.

Limite de geometrias precede metadados e vínculos UV; todos os estágios selecionados
são confrontados antes da primeira face. Inconsistência privada é erro de programa,
não fallback de textura. Nomes usam o adaptador comum com aviso de geração/corte.

## Referências

Conferidos no commit 47e633e4a1338f957ee7baa0acbcf54da11e77df:
[seam_tool](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/modeling/mesh/seam_tool.ts),
[Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js)
e [Canvas](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/preview/canvas.js).
O marcador sem textura usa shader próprio e imagem missing.png; não equivale a
baseColor. Lados também podem depender da sessão. Cube.shade é metadado de formatos
com java_cube_shading_properties, não prova isolada de efeito no preview free.
Implementação própria; nenhum código GPL copiado ou executado.

## Evidências

19 testes novos passaram: zero falhas, 312 asserts, 911 ms. Três revisões reais do
envelope/grafo/seleção/topologia/poses/UV até hierarquia, documento nativo e GLB
validado pelo Khronos. Testes de ownership, flags/campos inválidos em nós não
listados, teto agregado exato de seams, orçamento antes de leituras, subconjuntos,
mistura de faces, construção, Unicode e estágios incompatíveis. Review dos dois
módulos e testes sem alterar contratos anteriores. Tipos passaram; Biome 992
arquivos sem alterações. Focal ampliado: 139 passes, zero falhas, 1.329 asserts,
seis arquivos, 2,69 s.

Integral: **2.353 passes, zero falhas, 318 arquivos, 8.320.441 asserts, 139,99 s**,
exit 0. Vite passou em 1,14 s, com os mesmos chunks, CSS 53,82 kB e aviso Three
maior que 500 kB. Kids passou: compilação 6,0 s, tipos 9,3 s e 59 páginas em 571 ms.
Diff check passou com os três avisos CRLF anteriores.

Este lote não aprova shading, ordem de
desenho, descarte de seam labels, camadas/PBR completos, animações ou outros
metadados de origem. Esses gates ainda são obrigatórios na composição completa.
Sem UI bbmodel, ativação pública, nova dependência ou alegação de performance.
