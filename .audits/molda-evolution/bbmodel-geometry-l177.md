# Fonte geométrica bbmodel, lote 177

## Escopo e arquitetura

Referências primárias e limitações em `bbmodel-geometry-research.md`. Fixtures
autoradas manualmente; ainda não são uma execução independente do Blockbench.
Implementação própria, sem código GPL, dependência nova, runtime externo ou UI.

`readBbmodelGeometry` recebe o grafo lido e produz cubos, malhas ou unresolved
por índice de nó. Grupos ficam para seu reader de transforms. Tipo ausente ou
desconhecido permanece explícito; nunca fallback para Cube. Tipo malformado é
invalid. Dados de definição continuam no grafo; faces também conservam referência
readonly ao JSON original para decisões sobre campos ainda não interpretados.

`planBbmodelGeometry` separa cardinalidades da materialização. Todos os elementos
conhecidos, inclusive invisíveis/não exportáveis e faces desativadas, entram no
preflight antes de qualquer XYZ/UV. Até 262.144 vértices de malhas, 262.144 faces
de cubos+malhas, 1.048.576 referências de cantos de malhas, 1.048.576 registros UV
de malhas e 64 referências por face. Cubos ficam parametrizados em from/to, sem
expandir oito vértices; seus UVs são limitados pelas seis faces. São limites de
entrada, não capacidades editáveis, fidelidade visual ou estimativa de pico RAM.

Enumeração de dicionários para antes de coletar chaves excedentes. List/identifier
antes privados do grafo passam a helpers bbmodel comuns; mesmo comportamento,
com mensagem de identificador neutra. Valores próprios/densos/finitos sem coerção,
normalização de -0, recorte, snap, arredondamento Float32 ou troca de V.

## Cubos, malhas e decisões preservadas

Cubos exigem from/to e as seis faces declaradas; incompletos são unsupported,
sem reconstruir presets dependentes das configurações do aplicativo. Conservam
origin/rotation, inflação, stretch inclusive zero/negativo, rescale, UV offset,
mirror e box_uv (null herda projeto, sem default inventado). Faces guardam UV
retangular e rotação finita sem aplicar/quadrantizar valores. Nenhuma margem de
render, inflação, rotação, tamanho box UV ou textura é aplicada neste estágio.

Malhas mantêm todos os vértices e chaves, Float64 próprio e referências Uint32
próprias por face, na ordem declarada. Referências inexistentes são invalid.
Não ordenar/soldar/deduplicar pontos/cantos, fechar faces ou triangular. Faces
0/1/2 e maiores que quatro são conservadas como fonte; isso não aprova seu
desenho nativo ou uma semântica de n-gon no Blockbench. UVs em Map com pares
próprios; ausentes continuam ausentes, excedentes continuam presentes. Nenhum
zero é fabricado por falta de UV. Dicionários/UV usam chaves externas literalmente,
inclusive __proto__/constructor, sem indexar estado derivado em objetos comuns.

Textura é discriminada: ausente/default, false/sem textura, null/desativada,
índice inteiro não negativo (zero válido) ou UUID. Referência não é resolvida
contra a lista de texturas aqui. Índice enorme ainda precisa falhar no reader
de recursos correspondente; não é licença para indexação/alocação por índice.
Campos de shading/seams/tint/cullface/enabled/size/rotated e outros não consumidos
continuam no raw; futura conversão deve revisá-los, não ignorá-los silenciosamente.

Revisão conferiu orçamento antes de valores mesmo quando um cubo anterior é
numericamente inválido, separação de dados próprios/raw, ausência de IO/decoders,
ausência de loops dependentes de ângulos externos e manutenção de fontes ao
alterar saída. Numericamente finito (como 1e308) não significa desenhável;
gate Float32 e domínio pertencem à futura conversão, antes de adoção.

## Evidências finais

Focal final geometry/graph/envelope/pureza: **86 passes, zero falhas, 1.050
asserts, quatro arquivos, 3,21 s**. Typecheck passou após tipar o array esperado
de referências com sua união discriminada (sem mudar matcher/resultado). Biome
944 arquivos passou. Integral: **2.150 passes, zero falhas, 296 arquivos,
8.237.955 asserts, 137,62 s**. Vite passou em 1,29 s, mesmos chunks (glTF
181,97 kB/OBJ 157,01 kB/Three 579,29 kB, aviso >500 kB mantido). Kids terminou
com exit 0: compilação 5,6 s, tipos 9,2 s, 59 páginas em 544 ms. Diff check
passou com avisos CRLF prévios. bbmodel ainda fora da UI; sem ganho de CPU/RAM
alegado, ativação pública ou homologação GPU/toque/crianças.

Casos: três versões, endpoints/pivôs/flags exatos, seis estados de textura,
UVs fora da imagem, originais intactos, defaults independentes, -0/subnormal/1e308,
faces vazias/arestas/repetições/64 cantos, surplus/missing UV, ids especiais e paths
escapados, números/booleans/arrays esparsos inválidos, tipos não interpretados e
tetos agregados exatos. Limites de cada estágio testados também diretamente com
JSON já parseado, independentemente do teto estrutural anterior do envelope;
isso não afirma que todo caso máximo caiba simultaneamente em um arquivo real.
