# Pivôs e transformações bbmodel, lote 182

## Referências e escopo

Regras de repouso conferidas no [NodePreviewController](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/outliner.js),
[Group](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/group.js),
[Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
e [Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js).
O [formato genérico](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/generic.ts)
habilita hierarquia/grade centrada; [ModelFormat](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/io/format.ts)
define Euler ZYX por padrão. Mesh não sobrescreve a ordem Three; XYZ conferido
também no source instalado three/src/math/Euler.js, não só por memória.
Conversão angular conferida em [math_util](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/util/math_util.js).
Implementação própria com álgebra de rotações, sem incorporar/executar código GPL.

## Implementação e review

Núcleo matemático agora recebe Euler em radianos XYZ/ZYX; compartilha trigonometria
com a API XYZ em graus, cuja ordem aritmética foi preservada. Golden de 1.000
rotações capturado antes/depois: 18a69dbff9303078d4bb9cb3058426d0214a02dfac80111442c6bd39af6ccb3a.
Teste armazena Float64 little-endian explicitamente. Não é benchmark de desempenho.

Primeira formulação de ZYX por conjugação produzia zeros negativos na matriz
identidade. Um teste estrito ficou vermelho (7 passes/1 falha); adotada fórmula
ZYX direta com trigonometria compartilhada, sem normalizar zeros na saída ou
relaxar o matcher. Testes voltaram a passar e o golden XYZ foi preservado.

Transformações selecionadas usam origem menos origem do pai, mantendo pivôs
absolutos e unidades originais. Cube/Group ZYX; Mesh XYZ. Rescale de cubos aplica
fatores por eixos cruzados na escala TRS, sem confundir stretch de geometria.
Endpoints de cubos ainda precisam ser localizados pelo pivô na conversão de
geometria; mesh vertices já são locais e não recebem essa subtração.

Tuplas densas/finitas, rescale booleano estrito, dados/matrizes próprios e guardas
de finitude local e world em Float32. Nenhum arredondamento/reescala/global snap,
clamp ou achatamento. Matrizes válidas não aprovam vértices transformados, UVs,
geometria, escala de pixels ou documento completo. Pivôs/ângulos originais seguem
disponíveis com precisão e sinal de zero preservados.

No 5.x, ocorrências separadas de definição podem acionar extensão legada no app.
Este conversor não faz esse merge: só uuid/children/isOpen/selected são aceitos;
outros campos são unsupported antes de ler números de qualquer nó selecionado.
4.x inline usa a própria definição. Sem reinterpretação de plugins ou aplicação
de scale/rescale em famílias sem tal comportamento. Raw restante continua
disponível para estágio posterior de compatibilidade, não silenciosamente aprovado.

Leitor parcial da seleção: ainda não constitui validação de metadados de todos
os grupos, inclusive omitidos, nem de visibilidade/poses/animações. Esses gates
seguem pendentes para o conversor completo. Nenhuma adoção/execução/IO.

## Evidências finais

Focal transforms/selection/matrix/pureza: 97 passes, zero falhas, 19.370 asserts,
quatro arquivos, 1,84 s. Inclui 60 hierarquias nas três versões contra Three CPU,
400 rotações em radianos, pivôs deslocados, rescale positivo/negativo, signed zero,
conflitos de ocorrências e overflow apenas no world. Tipos e Biome 962 arquivos
passaram. Integral: **2.210 passes, zero falhas, 304 arquivos, 8.252.481 asserts,
138,49 s**, exit 0. Vite 1,19 s; matrix chunk 2,11 kB (+0,09), workers mantidos
(glTF 182,26 kB/OBJ 157,14 kB), Three 579,29 kB com aviso >500 kB. Kids exit 0:
compilação 5,8 s, tipos 11,9 s, 59 páginas em 517 ms. Diff check passou com os
três avisos CRLF prévios. Sem nova dependência, UI bbmodel, ativação pública,
alegação de ganho CPU/RAM ou homologação visual.
