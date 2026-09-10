# Seleção estrutural bbmodel, lote 181

## Escopo e referências

Plano estrutural próprio a partir de envelope/grafo correspondentes e imutáveis.
Somente formato free, grupos e elementos cube/mesh. A [declaração free](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/generic.ts)
habilita outras famílias, mas isso não aprova armature/locator/splines/PBR ou
animação no importador. [Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
e [Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js)
não têm comportamento parent como [Group](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/group.js).
Nenhum código GPL foi incorporado ou executado.

## Implementação e revisão

Default de unlisted e unsupportedNodes é reject. Append agrega unlisted como
raízes, após raízes autorais, em ordem de declaração de grupos e depois elementos.
Omit de unlisted registra contagem. Omit-subtree explícito para elemento desconhecido
ou cube/mesh com filhos registra tipo, raiz, path, motivo e total de descendentes.
Não promove filhos, adivinha grupos, reparenta ou usa display names como identidade.
Um elemento cujo campo type diz group continua não sendo uma definição de grupo.

Travessia BFS da parte mantida e contagem iterativa dos ramos omitidos. Cada nó
pertence a uma dessas travessias; grafo anterior garante ausência de duplicatas/
ciclos. Ordem de irmãos/raízes mantida, pais sempre antes dos filhos. Resultados
são próprios; fonte não muda. Nenhum índice externo vira tamanho de alocação.

Até 512 nós e 128 partes/geometrias, uma por cube/mesh, antes de coordenadas,
UVs, transformações ou pixels. Hidden e export false não são atalhos de orçamento.
Omissões afetam trabalho posterior, não as obrigações de validar a fonte inteira
nos leitores correspondentes. Seleção não produz documento nativo, nem prova
equivalência geométrica/visual, aceita perdas ou executa JavaScript/Molang.

Review conferiu opções estritas, independência append/omit-subtree, topologia,
report de ramos aninhados e limites exatos. Testes percorrem layouts 4.9/4.10/5.0,
nomes repetidos/especiais, pais inexistentes já barrados pelo grafo, tipos ausentes/
inválidos, formatos Minecraft/plugin recusados, ramos largos e 48 grupos aninhados.
Fixtures estruturais deliberadamente não incluem geometria; não são modelos
completos prontos para adotar. Getters sentinela provam ausência de leituras
numéricas no preflight, sem alterar código de produção para os testes.

## Evidências finais

Focal: 99 passes, zero falhas, 1.020 asserts, quatro arquivos, 2,98 s. Tipagem
encontrou expected de fixture com possibilidade undefined, ajustado para null
no caso ausente; nenhum algoritmo/matcher de produção foi relaxado. Tipos finais
e Biome 960 arquivos passaram. Integral final: **2.200 passes, zero falhas,
303 arquivos, 8.239.552 asserts, 141,63 s**, exit 0. Vite 1,15 s e chunks
mantidos (glTF 182,26 kB/OBJ 157,14 kB/Three 579,29 kB, aviso >500 kB).
Kids exit 0: compilação 5,7 s, tipos 9,6 s, 59 páginas em 513 ms. Diff check
passou com os três avisos CRLF prévios. Sem dependência, UI bbmodel, ativação
pública, benchmark novo, ganho de desempenho alegado ou homologação visual.
