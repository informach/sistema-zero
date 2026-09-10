# Geometria editável GLB/glTF, lote 142

## Contrato

Conversão pura de malhas/accessors previamente lidos. Pedidos escolhem somente
as malhas e variantes de morph necessárias; IDs e vínculos de materiais vêm da
orquestração. Não é importação de documento completo, skin, animação ou materiais.
Sem IO, Three, React, alteração da fonte, commit ou ativação pública.

Cada primitive ganha seu próprio espaço de vértices. Não inferir conectividade,
soldar posições iguais, aplicar snap, inverter UV ou reduzir precisão autoral.
Triângulos preservam ordem e winding; cada canto possui UV próprio. Material de
face é explícito, incluindo o material padrão. Referências de origem mantêm IDs
por vértice/primitive e índices de accessors, sem reter buffers numéricos.

Morphs aplicam base + soma de deltas ponderados à posição e ao UV escolhido.
Variantes têm saídas independentes. Só deltas ativos são preparados; controles
de morph são declarados como assados, inclusive em peso zero. Um conjunto UV por
face: exigência explícita de material sem o atributo correspondente é erro.
Valores permanecem doubles, mas overflow ou underflow não zero em Float32 são
recusados. Não há quantização para esconder diferenças.

Pontos/linhas viram construção, com aviso de diferença visual: materiais/UV de
pontos e linhas não passam a renderizar como no glTF. POSITION ausente produz
aviso e primitive sem vértices; índices repetidos que não cabem em faces/arestas
nativas são omitidos e contados. Faces collineares ou que colapsam em Float32
permanecem autoradas, com relatório do triangulador/desenho real do editor.
Normais explícitas, tangentes, cores, UVs extras e atributos customizados recebem
avisos agregados; normais nativas são por face. Aviso não afirma que cada normal
necessariamente mudou. Juntas/pesos continuam referenciados para o conversor de
skin posterior; a geometria isolada não equivale a uma importação de skin.

Relatório contém somente código, caminho, ID de geometria e contagem. Contagem
mede primitives sem posição; elementos de topologia de construção/omitidos;
targets assados; atributos de shading/UV omitidos; ou faces não desenhadas.

## Review

- Preflight agregado de formas, materiais, vértices, faces, arestas, primitives
  e trabalho de topologia antes de copiar geometria. Metadados de custo são
  reutilizados por malha dentro da chamada, não entre importações.
- RED/GREEN: Array.every ignorava buracos nos pesos de variantes. For-of confere
  cada posição e a forma da lista é validada antes de copiar; target de UV não
  selecionado demonstra que não basta esperar NaN no cálculo posterior.
- RED/GREEN: variantes de triângulos com índices repetidos podiam multiplicar
  trabalho sem gastar orçamento de faces. Agora índices de topologia também
  entram no orçamento de todas as variantes, antes de varrer seus elementos.
- Teste inicial de orientação confundia -0 com direção diferente de 0 na normal.
  Comparação usa igualdade numérica exata de componentes, sem tolerância angular.
- Tipos detectaram três expectativas de fixtures com índice possivelmente
  ausente; a cardinalidade conhecida do pedido foi explicitada nas expectativas.
  Sem mudança no runtime para satisfazer o teste.

## Evidência

15 testes de domínio e um de pureza adicionados. Importadores + pureza: 105 testes,
zero falhas, nove arquivos, 1.450 expectativas, 2,56 s. Incluem fonte independente
por variante, sete modos via leitor, limites exatos de 131.072 vértices e 20.000
faces, recusa agregada de arestas e GLB real passando pelo pipeline completo até
leitura/triangulação nativas. Tipos e Biome/740 passaram. Integral: 1.728 testes,
zero falhas, 247 arquivos, 100,08 s e 8.197.437 expectativas. Vite/1,32 s e Kids:
compilação/20,1 s, tipos/9,3 s, 59 páginas/583 ms passaram. Diff check passou.

Não é benchmark de latência/GPU, não homologa hardware, não ativa UI/importador
público. Interface de revisão, worker cancelável e demais conversores continuam
pendentes na fase 8.

Base: [glTF 2.0, §3.7.2](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
