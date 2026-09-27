# Conjunto local OBJ/MTL, lote 164

## Escopo e decisões

`readObjBundle` reúne fonte OBJ, bibliotecas MTL e bytes de recursos locais sem
IO. Retorna faltantes ou um conjunto completo; ainda não interpreta aparência,
resolve materiais por nome, decodifica rasters, converte documento nativo ou
escreve no editor. Arquivos procedurais e curvas são bytes inertes, não programas.
Nenhuma dependência ou ativação pública foi adicionada.

A skill `no-workarounds` orientou extrair a normalização já existente do glTF,
em vez de copiar outro resolvedor com regras quase iguais. `localFilePath` contém
limite de 4.096 caracteres, validação textual, dot-segments e contenção. Erros
de caminho compartilhados são traduzidos apenas nas fronteiras glTF/OBJ, com
reason/path/mensagem e causa. Outros erros continuam propagando. O limite glTF
de path usa a mesma constante. A refatoração não muda sua decodificação URI.

Referências OBJ/MTL são literais e case-sensitive: `%20`, `%2e%2e` e `%2f` não são
decodificados. Backslash relativo na referência é adaptado para separador de pasta;
nome de arquivo escolhido continua literal com slash e não é reescrito assim.
Não aproximar basename/caixa/acentos ou buscar diretórios externos. URLs, unidades
Windows, raiz/UNC, fuga da pasta, segmentos vazios, controles e destinos de pasta
são recusados. Limite vale também para o caminho composto. Caminho do próprio OBJ
não pode assumir papel de acompanhante neste contrato.

## Orçamentos e ownership

`ObjLocalResources` confere caminho de entrada, até 1.024 acompanhantes, duplicatas
normalizadas e bytes antes de ler OBJ/MTL. Cada arquivo fica em até 32 MiB; todo o
conjunto escolhido, incluindo OBJ e acompanhantes não usados, fica em até 64 MiB.
Recursos efetivamente referenciados têm teto conjunto de 1.024 caminhos/32 MiB.
Um caminho repetido conta uma vez; caminhos distintos são recursos distintos,
mesmo quando seus bytes de entrada compartilham um backing. Não anunciar hashing
ou deduplicação de conteúdo que ainda não existem.

mtllib é resolvido em relação ao OBJ; mapas e curvas em relação ao respectivo MTL.
Uma biblioteca canônica é lida uma vez. `librarySets` conserva a ordem e repetições
de cada declaração; não fixa ainda a política de precedência/material duplicado.
Materiais e propriedades fonte continuam intactos e identificados por declaração.

`readMtlDocument` agora aceita tetos reduzidos para materiais/propriedades/opções.
Eles são copiados e validados como inteiros entre zero e o teto de fonte; não
podem ampliar limites. O coordenador reduz os tetos para cada nova biblioteca.
Assim o excesso é detectado antes do append/valor seguinte, não depois de reter
mais uma biblioteca inteira. A soma fica em 65.536 materiais, 262.144 propriedades
e 262.144 opções para o conjunto, além dos tetos textuais e de opções por mapa.

Todos os mapas/curvas declarados nos MTL referenciados são descobertos, inclusive
redeclarações e materiais não usados. Isso é descoberta de fonte, não seleção de
texturas a decodificar. Conteúdo de acompanhante não referenciado não é interpretado,
embora seus bytes/nome participem do preflight do conjunto escolhido.

Faltantes são deduplicados em ordem de descoberta, sem arrays fonte/recursos no
resultado. Um MTL ausente pode revelar novos arquivos quando for acrescentado;
por isso o contrato diz “todos os atualmente descobríveis”. Arquivos disponíveis
inválidos não são escondidos por um faltante. Erro de biblioteca inclui caminho
literal escapado e linha/propriedade interna, preservando a causa original.

Somente após não haver faltantes, cada recurso é copiado com `new Uint8Array` do
intervalo selecionado. Não usar Buffer.slice nem copiar o backing completo.
Recursos retornados pertencem ao conjunto e são compartilhados read-only pelos
consumidores seguintes. O próprio OBJ não é duplicado nesse mapa; sua fonte
estruturada já tem ownership. Esse conjunto em memória não arquiva originais no
futuro documento nativo. Não há alegação de pico RSS ou economia de GPU.

## Revisão e provas

Oito testes específicos cobrem semânticas literal/URI lado a lado, contenção,
pastas/raiz/UNC/unidades, normalização, orçamento de caminho composto, bibliotecas
repetidas/ordenadas, referências relativas por MTL, mapas/curvas, origem de erros,
procedurais inertes, arquivos faltantes sem fallback e ownership do intervalo.
Tetos exatos e excedidos de arquivos/bytes/recursos e de MTL agregado são testados.
Excessos usam o próximo valor deliberadamente inválido para provar a precedência
do preflight. Biblioteca repetida no teto não é recontada.

Review reproduziu referência `dir/../C:/a.png` que, depois de normalizar, criava um
destino que o conjunto escolhido nunca poderia aceitar. Regressão vermelha levou
à conferência de caminho relativo também após normalização; teste verde. Não era
acesso ao filesystem (inexistente), mas um diagnóstico de faltante impossível de
resolver. Biome encontrou retorno incidental de uma asserção em forEach de teste;
callback passou a bloco sem retorno. Sem supressões ou relaxamento de produção.

Primeiro focal da extração glTF: 70 passes/6.718 asserts, zero falhas. Fonte/pureza
após os tetos MTL: 72 passes/4.953 asserts. Oito testes de conjunto passaram com
220 asserts/1,456 s. Tipos passaram. Focal completo de importação/pureza:
351 passes, zero falhas, 34 arquivos, 37.499 asserts/16,76 s. Biome: 855 arquivos.
Integral final: 2.004 passes, zero falhas, 277 arquivos, 8.233.924 asserts/123,79 s.
Vite: 1,02 s; extração compartilhada acrescentou 0,37 kB ao worker glTF (180,42 kB)
e 0,32 kB ao painel lazy glTF (35,35 kB). Não anunciar redução de bundle; aviso Three
permanece. Kids: compilação 5,6 s, tipos 9,8 s, 59 páginas/665 ms. Diff check passou,
apenas avisos CRLF preexistentes em outros CLAUDE.md. UI OBJ, interpretação dos materiais e
homologação visual/GPU/toque/infantil continuam fora deste lote.
