# Objetos e organização OBJ, lote 171

## Identidade e limites

`convertObjHierarchy` consome fonte imutável e referências das partes do mesmo
plano de geometria. As declarações `o` viram raízes pela ordem e linha da fonte,
não pelo nome. Nomes repetidos permanecem distintos. Objeto com geometria é mesh;
declaração explicitamente vazia é grupo nativo por padrão. `emptyObjects: omit`
é escolha explícita e produz contagem de omissões. Não há nó implícito vazio
quando nenhum elemento pertence ao objeto inicial.

Coordenadas não são lidas, recentralizadas ou reatribuídas. Transformações são
TRS identidade, próprias por nó; não se presume pivô que OBJ não fornece.
Posições globalmente não referenciadas mantêm sua peça separada do lote 162,
com nó de construção próprio ao fim. Declaração vazia não ganha uma geometria
inventada para vértices que o leitor não atribui a ela.

Opções e recursos são conferidos antes dos estados: array de partes, teto 128,
IDs nativos únicos, uma parte por objeto/pool e declaração existente. Falha de
ID conserva SceneValidationError como cause. Teto de 512 nós inclui grupos vazios
e reserva o pool de pontos antes de adaptar nomes ou abrir metadados dos elementos.
Não reduzir silenciosamente nós para caber. Omitir vazios só ocorre com a escolha
declarada, sem omitir um objeto com geometria.

Nomes usam o helper comum do lote 170: até 128 UTF-16, sem trim/normalização,
sem cortar par de surrogate. Geração/abreviação é relatada com nó e origem.
Map de declaração para nó é próprio; nunca chavear por nome autorado em objeto JS.

## Associações de grupos

`g` é associação, inclusive múltipla, não uma árvore de pais. Não colocar uma
face em várias peças, duplicar geometria ou inventar aninhamento. O domínio
nativo atual não guarda essas associações; relatório agregado informa listas
usadas, nomes únicos não-default, elementos afetados e associações por elemento.
Default e listas sem elementos não geram perda de associação relatada. Nomes
repetidos na mesma lista não multiplicam uma associação.

Contar usos por referência de lista compartilhada e expandir cada lista usada
uma vez por chamada. Estados de smoothing/material/objeto que compartilham a
mesma lista não provocam expansão por face. Nomes de grupos não são anexados ao
documento; a contagem não é arquivo original nem preservação editável dos tags.
Essa perda precisa continuar visível na futura revisão de importação.

## Revisão e evidências

Sete testes novos: ordem/nomes repetidos/implicit/empty/pool, opção de omissão,
512 e 513 nós, reserva de construção, contagem de associações sem expansão por
face, cópias/nomes literais/Unicode e fronteiras de referências/opções/128 partes.
Getters comprovam preflight antes de nomes/elementos/coordenadas. Instrumentação
da operação real filter comprova uma expansão de lista usada e outra na próxima
chamada, sem mocks de API nem cache entre importações.

Grafo nativo real confere todas as raízes e matrizes identidade. Leitor completo
valida os fixtures, inclusive 512 nós e pool. GLB real: zero erros e zero avisos
Khronos; reabertura conserva nomes repetidos e grupos vazios. Geometria de construção
continua sujeita ao relatório do exportador, não a uma promessa de renderizá-la
no GLB. Fontes, transformações e Maps foram verificados quanto a ownership.

Focal inicial: sete passes, zero falhas, 97 asserts, 582 ms. Tipos passaram;
Biome verificou 889 arquivos sem alterações. Focal de importadores/core/pureza:
427 passes, zero falhas, 43 arquivos, 39.741 asserts, 21,97 s. Integral:
2.080 passes, zero falhas, 286 arquivos, 8.236.161 asserts, 127,95 s. Vite 995 ms,
chunks glTF worker/painel/Three inalterados, com aviso Three >500 kB conservado.
Kids: compilação 4,2 s, tipos 8,0 s, 59 páginas/757 ms, saída zero.
Diff check passou com avisos CRLF preexistentes. Nenhuma dependência nova,
ativação pública, adoção OBJ, medição de ganho CPU/RAM ou homologação de GPU/toque.
Montagem do documento completo, relatório composto, worker e revisão continuam
nos próximos lotes.
