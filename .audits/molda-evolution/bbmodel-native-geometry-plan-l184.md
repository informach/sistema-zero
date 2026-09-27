# Planejamento de geometria nativa bbmodel, lote 184

## Escopo e decisões

Estágio próprio de topologia/custos sobre geometria tipada e seleção correspondentes.
Não lê XYZ/UV/pose, decodifica pixels, aprova aparência ou materializa documento.
Toda coordenada de fonte já foi validada pelo leitor; este estágio antecipa os
limites nativos à cópia/conversão de coordenadas de destino, não à leitura de fonte.

Orçamentos agregados: 128 geometrias/partes, 131.072 vértices e arestas soltas,
20.000 triângulos. Todos os pontos selecionados contam, inclusive não usados,
ocultos e não exportáveis. Vértices de todas as partes são contados antes de
qualquer face. Partes omitidas pela seleção não são lidas/materializadas aqui.

Cubo reutiliza boxMesh próprio: oito índices binários XYZ e seis ciclos exteriores
TL/BL/BR/TR. null remove superfície, não inventa face substituta. Arestas da gaiola
não cobertas por superfície habilitada ficam como arestas soltas, sem duplicação.
Mesh conserva fonte/canto original e diagonal 0–2 com dois triângulos por quad.
Alternativa editable-quads mantém quatro cantos e relata possível adaptação;
ambas contam dois triângulos. Não promete equivalência de shading de quad não plano.

Faces mesh de dois cantos mantêm arestas mesmo com textura null; 0/1 não têm
superfície. Deduplicação de arestas usa identidade, não posição; ordem inversa e
autoaresta não gastam orçamento. Faces >4 ou com referências repetidas exigem
omissão explícita ou são unsupported. Não solda, reordena ou remove canto de
fechamento silenciosamente. Pontos permanecem mesmo com omissão de superfície.

IDs de saída são internos estáveis por índice; caminhos usam JSON brackets para
chaves literais. Relatório agrega ocorrências de faces por nó/código, não finge
enumerar cada caminho nem usa número de triângulos como número de quads. Planos,
cantos e arestas próprios; fonte intacta. Opções estritas, defaults documentados.

Semântica consultada em [Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
e [Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js).
Não executado/incorporado código GPL. Fixtures próprias, não arquivos produzidos
por sessão real do aplicativo. Pesquisa complementar em bbmodel-native-geometry-research.md.

## Review e verificação

Review conferiu ciclos das seis direções, associação de cantos, gaiola parcial,
face versus construção, diagonal versus normal, opções, propriedade e precedência
dos limites. Dez testes novos: três versões, chaves especiais, curvas de cobertura
de 0/1/2/6 superfícies, partes omitidas com getters de prova, coordenadas/UV não
lidos, todos os tetos exatos e excesso agregado. Fixtures tipadas grandes isolam
os tetos deste estágio: não afirmam que todo máximo atravessa o orçamento JSON.

Focal final: 106 passes, zero falhas, 923 asserts, quatro arquivos, 2,98 s.
Tipos e Biome 967 arquivos passaram. Integral final: **2.231 passes, zero falhas,
306 arquivos, 8.252.818 asserts, 135,08 s**, exit 0. Vite 1,11 s, chunks mantidos:
matrix 2,11 kB, glTF 182,26 kB, OBJ 157,14 kB e Three 579,29 kB (aviso >500 kB).
Kids exit 0: compilação 6,3 s, tipos 9,1 s, 59 páginas em 696 ms. Diff check passou
com os três avisos CRLF prévios. Lote encerrado.

Sem dependências, UI bbmodel, ativação pública, benchmark novo ou ganho de
desempenho alegado. Conversão de coordenadas/UV/normais/material/hierarquia,
documento, worker e interface bbmodel continuam pendentes.
