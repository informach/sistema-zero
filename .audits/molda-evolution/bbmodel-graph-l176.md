# Referências e organização bbmodel, lote 176

## Referência e limites de escopo

Conferidos o [outliner](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/outliner.js),
o [grupo](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/group.js)
e o codec bbmodel fixados no commit de referência. No 5.0, objetos no outliner
também podem referenciar elementos contêineres, como armatures, e não só grupos.
Definições ausentes do outliner são recolocadas na raiz pelo Blockbench com aviso.
No Molda, o leitor as separa em `unlisted`, para que a futura conversão exija uma
decisão explícita e relatório, sem perda silenciosa nem adoção automática.

Esta é leitura da conectividade do outliner, não aprovação de todas as referências
internas, tipos de elementos, transforms, materiais, UV, armatures ou animações.
Dados originais de definições e ocorrências continuam disponíveis separadamente
para os próximos leitores. Conflitos em transforms inline do 5.0, por exemplo,
não são resolvidos nem escondidos por este estágio.

## Arquitetura e review

`readBbmodelGraph` recebe envelope já lido. Índice Map por UUID textual explícito,
sem UUID aleatório, correspondência por nome ou objetos indexados por chave externa.
IDs limitados a 4.096 unidades UTF-16; comparação literal, sem regex RFC, trim ou
normalização. `__proto__`/constructor/maiúsculas são identificadores comuns.

Até 65.536 definições de elementos+grupos, 65.536 ocorrências totais no outliner
e profundidade própria 128. São limites de entrada, não os 512 nós editáveis
nativos nem medição de RAM. Listas de topo e soma de definições antes das linhas;
grupos inline antigos cobrados incrementalmente antes de adicioná-los. Listas de
filhos cobram o tamanho agregado antes de visitar suas ocorrências.

Versões 4.9/4.10 leem grupos inline; 5.0 liga ocorrências a definições já indexadas.
4.x com lista groups não vazia é unsupported, sem inferência de formato misto.
Campo content legado é unsupported, sem substituir a lista children. Ausente é
lista vazia, null é inválido. Objetos/ids/ocorrências malformados são invalid.

Travessia iterativa por frames e cursor; mantém ordem de irmãos e raízes. Uma
definição só pode ser colocada uma vez; duplicatas, dois pais e ciclos recusados,
inclusive fora do primeiro ramo. IDs de definições também precisam ser únicos.
Não há instâncias implícitas ou conserto automático de referências faltantes.
Retorno inclui roots autorados, ordem BFS autorada e unlisted em ordem de grupos
seguida de elementos. Arrays de vínculos próprios; raw data referencia o JSON
pertencente ao envelope como somente leitura por contrato, sem cópia profunda
redundante por nó e sem mutar a fonte.

Revisão conferiu que elementos contêineres não viram grupos por terem children;
os dados de sua definição não são confundidos com os dados da ocorrência. O leitor
não interpreta restrições de tipo de filhos nem declara suporte nativo ao rig.
Sem imports GPU/React/IO, dependências novas, UI ou ativação pública.

## Evidências finais

Focal de graph/envelope/pureza: 76 passes, zero falhas, 661 asserts, três arquivos,
2,39 s. Inclui floresta equivalente nas três versões, IDs estranhos, referências
faltantes/duplicadas/cíclicas, listas nulas, dados preservados, buffers de vínculos
independentes e limites exatos de 65.536 definições/ocorrências planas/aninhadas/
grupos inline. Profundidade 128/129 e objeto cíclico em JSON já parseado conferem
o gate próprio, independentemente do gate do envelope.

Biome 939 arquivos passou. Typecheck apontou três expectativas de identidade
dos testes tipadas como object|undefined, enquanto o matcher exige Record;
não foi falha de execução do leitor. A integral já iniciada passou com 2.140
testes/zero falhas/295 arquivos/149,60 s. Após seu término, as três expectativas
passaram a declarar Record<string, unknown> e o índice existente da fixture;
nenhum algoritmo/matcher foi alterado. Tipos, Biome e focal (76/0, 2,31 s)
passaram novamente. Nova integral: **2.140 passes, zero falhas, 295 arquivos,
8.237.579 asserts, 150,09 s**. Vite passou em 1,55 s, chunks idênticos ao lote
175 (OBJ 157,01 kB, glTF 181,97 kB, Three 579,29 kB com aviso >500 kB).
Kids terminou com exit 0: compilação 7,7 s, tipos 10,6 s, 59 páginas em 543 ms.
Diff check passou com os avisos CRLF prévios. bbmodel ainda não alcançável pela
UI; nenhuma alegação de ganho de desempenho ou homologação GPU/toque/crianças.
