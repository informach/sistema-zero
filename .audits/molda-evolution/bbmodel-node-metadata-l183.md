# Metadados comuns dos nós bbmodel, lote 183

## Escopo e implementação

Leitor próprio dos metadados definidos de todos os grupos/cubos/malhas free,
independente da seleção nativa. Fecha a lacuna de leitura dos campos conhecidos
de grupos não selecionados identificada na revisão do lote 182. A composição
completa do importador, ainda pendente, deve chamar esse estágio; não é um gate
público já ativado.

Defaults de grupo free e flags conferidos em [Group](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/group.js).
Nomes conservam texto literal até 4.096 unidades UTF-16, sem trim/geração; null
representa ausência e string vazia continua distinta. Valores null na fonte são
inválidos. Origem/rotação finitas e próprias; visibilidade/export/locked booleanos
estritos. Flags são metadados, não aplicação de visibilidade herdada ou locks.

Formato não-free é unsupported, pois seus defaults de pivô/grupo podem diferir.
Grupo vem da definição do grafo, não do texto type em um elemento. Tipos desconhecidos
ou ausentes ficam unresolved com fonte inerte: sem presumir o schema de campos de
plugins. Dados restantes seguem readonly por contrato para revisão de compatibilidade.
Índices e sourcePath correspondem à declaração original, inclusive grupos inline.

Primitivas de pose/propriedades extraídas dos leitores existentes; geometria e
transformações as reutilizam, sem criar dependência de UI ou de outro formato.
Algoritmo/defaults/ordem de leitura preservados. Tuplas de cada resultado são
próprias, não aliases editáveis de dados de outro estágio ou da fonte.

Leitura aceita o limite de entrada de 65.536 nós e coordenadas Float64 finitas
fora de Float32; limites nativos e desenhabilidade ficam no conversor. Não é
validação completa de geometria, pixels, animações, dados de ocorrências legadas
ou propriedades específicas ainda não lidas. Sem IO, execução, adoção ou aceite.

## Review e evidências finais

Review conferiu source-versus-selection, flags estritas, defaults free, nomes
especiais/repetidos, referências readonly e propriedade de tuplas. Testes nas
três versões, grupo unlisted e descendente conhecido de ramo omitido com metadados
inválidos, fonte desconhecida opaca, coerência com geometria, limite exato de
texto/nós, signed zero e distinção Float64/Float32.

Focal: 110 passes, zero falhas, 11.062 asserts, cinco arquivos, 2,77 s. Tipagem
de duas tuplas de fixture explicitada com satisfies após diagnóstico de number[];
nenhum algoritmo/matcher relaxado. Tipos finais e Biome 965 arquivos passaram.
Integral final: **2.220 passes, zero falhas, 305 arquivos, 8.252.652 asserts,
136,67 s**, exit 0. Vite 1,14 s com chunks mantidos (matrix 2,11 kB,
glTF 182,26 kB/OBJ 157,14 kB/Three 579,29 kB, aviso >500 kB). Kids exit 0:
compilação 5,3 s, tipos 9,2 s, 59 páginas em 461 ms. Diff check passou com
os três avisos CRLF prévios. Sem novas dependências, UI bbmodel, ativação pública,
benchmark novo, ganho CPU/RAM alegado ou homologação visual.
