# Revisão da integração coordenada — 22/11

Esta pasta registra verificações locais. Não ativa formatos, gravadores, catálogos
ou distribuições públicas. A missão e o ciclo autenticado final continuam abertos.

## Base integrada antes dos lotes seguintes

O corte `083d354a9` incorpora os três primeiros lotes, incluindo o módulo Python
e seus blocos, e a revisão dos leitores. Os recibos comprimidos e seus hashes
estão em `index.json`.

| Verificação | Resultado |
| --- | --- |
| Pinta completo, com CE, Zero e Raylib nativos instalados | 2.875 testes, 38.392 asserções, zero falhas |
| Core completo, execução isolada | 3.261 testes, 211.186 asserções, zero falhas |
| Recuperação com escritores reais v1/v2 | 20 testes, 251 asserções |
| Python focado | 29 testes, 1.167 asserções |
| Leitores do Estúdio | 50 testes, 343 asserções |

O primeiro Core completo teve um timeout de 5 segundos em um teste inalterado
de jornada infantil, enquanto outros processos pesados executavam. O mesmo
comando passou isolado, sem mudar fonte ou prazo. Ambos os recibos foram retidos.

A revisão reproduziu um conflito de duas imagens regionais com o mesmo ID de
mapa: antes, a última substituía silenciosamente a primeira nos dois jogadores
JavaScript. Agora estados divergentes são recusados e aliases idênticos são
compartilhados. Os recibos incluem o negativo e os 12 testes corrigidos.

Os ajustes de tipos em fixtures e bibliotecas sem artes passaram em 19 testes,
incluindo os 55 casos isolados do diálogo. A checagem completa seguinte deixou
somente três erros preexistentes de Canvas2D no motor 3D. O usuário autorizou a
correção: duas anotações, JavaScript emitido idêntico e sete regressões aprovadas.
A checagem completa consolidada precisa ser repetida; esta pasta não a declara
aprovada com base na emissão equivalente ou nos testes focados.

## Composição da recuperação V4

A execução anterior deixou commits adicionais preservados. Ao reuni-los aos
testes mais fortes desta continuação, a revisão reproduziu perda de predecessores
e de mundos que ainda usavam a folha alterada pela instalação antiga. A correção
conserva cada catálogo observado por operação, segue predecessores e portas e
recupera também o mundo que ainda estava no aparelho. Igualdade do JSON do mapa
não prova igualdade de suas folhas ou dos destinos ligados.

As provas novas usam o mesmo escritor antigo e um snapshot Git da fila v3
(`4cfb1d323f78c7f96256fe9ffc84156df09aeb02`). A ponte ESM conecta cada resolução
de `idb-keyval` ao armazenamento de teste e confere essa conexão. Nenhuma fonte
de negócio histórica é modificada pelo runner.

Os vinte ensaios atuais estão separados dos originais v3: verificam registro v4
e recuperação completa quando o recurso histórico passou a ter bytes retidos
localmente. O original v3 exigia interrupção nesse último caso. As fontes e os
recibos históricos permanecem com os próprios hashes, inclusive quando duas
capturas usavam o mesmo nome de arquivo; o índice conserva as variantes em
diretórios distintos.

| Verificação após compor a recuperação | Resultado |
| --- | --- |
| Vinte negativos e aceitações com versões reais anteriores | 20 testes, 255 asserções |
| Retenção de recursos, quota, CAS, escritor v3 e retomada offline | 29 testes, 267 asserções |
| Ponte local no processo isolado | 32 testes, 390 asserções |
| Persistência densa/regional, quota e sombra nativa 8 | 28 testes, 133 asserções |
| IndexedDB real em Chromium, sem repetição automática | Oito ensaios aprovados |

O ensaio nativo também detectou a perda do manifesto de revisões/vínculos no ZIP
da outra continuação. Ele foi restaurado junto aos candidatos e recursos na mesma
foto transacional. O ZIP confere os bytes gzip originais; a retomada antiga sem
folha histórica permanece distinta da recuperação completa oferecida pela V4.

As contagens anteriores não qualificam os lotes posteriores de exportação,
automapping, edição incremental e projeções. Os ensaios de IndexedDB real, a
revisão integrada final e o rollout autenticado têm recibos próprios. Não houve
ensaio com crianças, aparelho físico adicional ou interrupção física de energia.
