# Geometria nativa bbmodel: pesquisa para os próximos lotes

## Fontes e fatos conferidos

[Cubo](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js),
[Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js)
e [adaptações Three](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/util/three_custom.js)
lidos como referência, sem executar/incorporar código GPL. Cache ignorado Firecrawl.

- Cube.size sem floor é to-from, não módulo. Geometria usa centro from+halfSize,
  semi-extensão (halfSize+inflate)*stretch, depois subtrai origin. Rescale já
  pertence à transformação do lote 182, não deve ser aplicado duas vezes.
- Preview Cube engrossa eixo exatamente zero em 0,001 após localizar endpoints.
  O Molda não deve introduzir esse deslocamento sem decisão/relatório. Extensões
  invertidas/negativas também precisam de tratamento explícito; não abs/sort/clamp.
- setShape escreve os quatro vértices de cada face sem recalcular as normais.
  Portanto preservar endpoints invertidos não basta para afirmar equivalência
  de shading: o normal autoral da caixa e o geométrico podem divergir.
- Ordem por face na GPU é grade TL/TR/BL/BR; fronteira exterior corresponde
  a TL/BL/BR/TR. O boxMesh EXISTENTE do Molda tem exatamente esses ciclos nas
  seis faces: east→px, west→nx, up→py, down→ny, south→pz, north→nz.
  Reusar esse núcleo próprio, não copiar tabelas de vértices externas.
- Mesh source vertices já são locais. Preview desenha somente faces com três
  ou quatro vértices; quads usam diagonal 0–2 na ordem salva/getSortedVertices.
  Native ear clipping pode escolher outra diagonal: em face não plana OU UV
  não afim isso muda desenho. Uma conversão precisa preservar essa diagonal
  (por exemplo triângulos explícitos com relatório), não prometer equivalência
  só porque manteve quatro cantos. Não copiar o sorter GPL.
- Faces de dois vértices viram outlines, 0/1 não têm superfície. Vértices são
  exibidos mesmo sem uso. >4 vértices não ganham superfície/outlines nesse
  renderer. Fonte lida com 64 cantos não significa suporte de desenho/native.
- Normais de mesh podem ser flat/smooth; recalcular como flat é adaptação e
  precisa de política/relatório. Seams e outros campos raw têm semântica de
  edição e não são descartáveis silenciosamente.
- O normal flat de um quad no preview vem do primeiro triângulo (0,1,2) para
  ambos os triângulos. Dividir pela diagonal original preserva a topologia,
  mas não basta para reproduzir esse normal em um quad não plano. A conversão
  ainda precisa conferir e relatar essa adaptação; o lote 184 não aprova shading.

## UV conferido para estágio posterior

- UV autoral de cada direção se associa a TL/BL/BR/TR: um retângulo de fonte é
  (u0,v0),(u0,v1),(u1,v1),(u1,v0), ainda em unidades do Blockbench e V para baixo.
  Correção da inferência inicial: "linha zero em V=0" não determina topo da
  imagem. SceneRasterFromCanvas, SceneImagePreview e flipbook nativos usam linhas
  bottom-up. Normalização/materialização deve tratar UV e pixels em conjunto;
  revisão do contrato glTF/OBJ/importação/exportação iniciada no lote 187.
- Rotação do retângulo no renderer é um loop de passos de 90 graus. Não copiar
  loop potencialmente infinito para ângulos enormes. Rotação arbitrária lida
  como número finito ainda precisa de gate/política de conversão.
- Na ordem exterior TL/BL/BR/TR, cada passo positivo move o início para o canto
  seguinte. Múltiplos não negativos de 90 representáveis como inteiros seguros
  podem usar índice modular em trabalho constante; ângulo negativo/fracionário
  não deve ser reinterpretado silenciosamente como esse giro.
- Box UV calcula dimensões não infladas, floor(size+1e-7) no free. Mirror inverte
  horizontalmente e troca east/west. Offset autoral soma ao layout. Margem 1/64
  anti-bleeding é ajuste do preview, não automaticamente dado UV autoral.
- Pixel size, UV size e frameCount são distintos. Frames alteram V e textura
  corrente depende de sessão. Não inferir imagem inteira como frame único.
  Decisões de frames/camadas/PBR seguem pendentes antes de material nativo.
- Mesh preview também desloca em 0,00005 UV normalizado coincidente com o primeiro
  canto, sem mudar a fonte. Manter UV autoral não reproduz necessariamente esse
  ajuste de exibição. UVs faltantes e excedentes seguem políticas explícitas.
- Project free inicia UV 16×16 e box_uv false; Texture inicia UV com o tamanho
  do projeto. Isso não usa pixel width/height do cache. Conferido em Project e
  Texture no mesmo commit, não inferido da imagem decodificada.

## Arquitetura considerada, ainda não implementada nesta nota

Planejamento de custos/topologia deve anteceder cópia de coordenadas/UV/pixels.
Geometry appearance precisa fornecer material/UV explícitos por canto original;
a topologia não deve preencher zero em UV faltante de face texturizada. Limites
nativos já existentes e readSceneGeometry/buildSceneGeometry são gates finais.
Todos os vértices retidos, inclusive de construção, precisam de conferência
numérica. Matriz finita sozinha não aprova pontos transformados nem GPU real.

primitiveMesh foi inspecionado; ele usa boxMesh e produz corner UVs, mas espera
primitiva nativa válida. Não inserir caixa zero/invertida nessa API como se fosse
válida. boxMesh é o núcleo puramente geométrico de endpoints, reutilizável com
uma política explícita e posterior validação da malha.
