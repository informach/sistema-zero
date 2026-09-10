# Seleção de materiais OBJ/MTL, lote 165

## Escopo e política

`planObjMaterials` recebe um conjunto completo e imutável do lote 164, seleciona
declarações usadas por faces e produz IDs/vínculos para a geometria do lote 162.
Não lê coordenadas/índices numéricos, valores de propriedades, bytes de recursos
ou pixels; não interpreta aparência nem adota documento. Pontos/linhas continuam
construção, sem exigir a resolução de seus materiais de render.

O [manual original Wavefront](https://www.martinreddy.net/gfx/3d/OBJ.spec) especifica
busca na ordem dos arquivos de uma lista mtllib e material branco quando usemtl
não informa nome. Ele não define claramente a precedência entre várias instruções
mtllib. Por isso, essa situação não recebe uma política silenciosa do importador.

Políticas próprias e explícitas: `single` é o default para zero/uma lista; uma
lista única resolve nomes independentemente de estar antes/depois da face.
Havendo várias listas e uma face nomeada, é necessário optar por `declaration`
(a lista ativa no contexto da face) ou `all` (listas na ordem do arquivo, com
bibliotecas repetidas removidas da busca global). A escolha aparece no relatório.
Declaração posicional nula, antes de qualquer lista, não inventa biblioteca.

Nomes são exatos, case-sensitive, sem trim adicional, aproximação ou troca de
acentos. A primeira biblioteca da lista com o nome vence; isso não é a mesma
coisa que apagar redeclarações dentro do arquivo. Duplicata dentro da biblioteca
selecionada é unsupported por default, ou exige `first`/`last`, relatando arquivo,
índice escolhido e número de declarações não usadas. Duplicatas de materiais não
selecionados não impedem conversão; o conjunto fonte permanece intacto.

Nome ausente é unsupported por default. `missingMaterials: default` permite
material branco, com nome, escopo e contagem de faces no relatório. Isso não
contorna arquivos ausentes no lote 164. Ausência de usemtl e construção vazia
recebem material padrão; se todas as faces forem nomeadas/resolvidas, não fabricar
um material extra. Opções desconhecidas, null e valores fora das uniões são
recusados antes de indexar os metadados.

## Identidade, limites e arquitetura

Índice por biblioteca guarda primeiro/último/count por nome, sem clonar listas de
declarações por face. Resultados de busca ficam em cache por escopo/nome durante
esta chamada; mapas de escopo não expandem um produto cartesiano de bibliotecas
e materiais. Classificação de mapas da mesma declaração é compartilhada por um
WeakMap local, inclusive entre escopos diferentes. Nada permanece em cache entre
importações ou atravessa mudanças de fonte.

Variantes são por biblioteca, índice de declaração e `useUvTextures`. Este campo
se refere a mapas de superfície: falso quando a face não tem UV ou o material
não tem tais mapas. Materiais sólidos não duplicam por presença de UV. Reflexão
de ambiente não depende do UV da face e não cria essa variante. Isso é apenas
seleção; o relatório da conversão posterior ainda precisa tratar mapas/equações
que não tenham representação nativa.

IDs usam índices de fonte, nunca o nome do usuário. Índice alto não aloca um array
esparso de tamanho igual a esse índice. Materiais selecionados e eventual padrão
respeitam juntos o teto nativo de 20.896 antes de criar a próxima variante.
Vínculos apontam para índices de elementos fonte, não só a posição numa lista de
faces. Arrays/IDs/Map/relatórios retornados são próprios; só números, strings e
metadados escolhidos saem, sem objetos de material ou buffers fonte retidos.

## Revisão e verificação

Nove testes específicos cobrem ordem da lista, nome exato/especial, identidade,
política global/posicional, lista única tardia, duplicatas, fallback opt-in,
construção, variantes UV, índice fonte 65.535, tetos exatos/extra padrão/extra UV,
opções estritas e ownership. Vínculos passam pela conversão real de geometria.
Getters que falham comprovam ausência de leitura numérica/bytes. Um caso com 100
escopos conta uma classificação de propriedades por declaração e uma nova
classificação na próxima chamada, sem API de produção criada para servir ao teste.
Não é um benchmark pareado nem alegação de ganho de CPU/GPU.

Review identificou que reflexão de ambiente estava na classificação genérica de
mapas e criava variantes UV desnecessárias. Teste vermelho reproduziu; campo virou
`useUvTextures` e reflexão foi separada da classificação de superfície. Regressão
verde, sem afrouxar limites/testes. Relatório de fallback também usa escopo
discriminado (all/none/declaration), não índice fictício para biblioteca ausente.
Biome apontou retorno incidental de asserção em forEach; teste usa for-of sem
retorno. Sem casts de dados, supressões, IO, dependências ou ativação pública.

Focal final: 77 passes, zero falhas, quatro arquivos, 547 asserts/5,11 s. Tipos
passaram e Biome verificou 857 arquivos. Integral final: 2.014 passes, zero falhas,
278 arquivos, 8.234.003 asserts/122,42 s. Vite: 1,17 s, chunks iguais ao lote 164 e
aviso Three conhecido. Kids: compilação 5,6 s, tipos 9,0 s, 59 páginas/701 ms.
Diff check passou, apenas avisos CRLF existentes em outros CLAUDE.md.
Interpretação de cor/opacidade/iluminação, opções de textura, rasters, montagem
nativa, worker/revisão/adoção OBJ e homologação continuam pendentes.
