# Hierarquia e estados bbmodel, lote 192

## Implementação

convertBbmodelHierarchy reúne grafo, metadados de todos os nós, seleção, poses
e recursos privados correspondentes do free. Retém grupos vazios, raízes, irmãos
e relações pai/filho; não renomeia por colisão de nome, reparenteia ou cria pivôs
extras. IDs nativos derivam dos índices de origem, com mapas por índice e UUID
literal. __proto__/constructor não são propriedades executáveis nem identidades
de nome. Cubos e meshes viram nós mesh ligados à geometria planejada no lote 184.

TRS de repouso é copiado por componente, sem bake world, segundo deslocamento de
pivô ou conversão de Euler. Material padrão é ligado por nó, validando o ID;
materiais de face permanecem na geometria. Não se escolhe textura substituta.
Nomes passam pelo adaptador comum com aviso apenas para fallback/truncamento.

Limites de nós/geometrias e presença do estágio de metadados completo precedem
valores de transforms. Todos os vínculos de seleção, pais, tipos, poses, geometria
e materiais são conferidos antes da primeira cópia de TRS. Arrays de saída são
próprios; dados restantes de fonte não são lidos. Esta é composição privada,
não validação de estruturas externas construídas por um chamador arbitrário.

Flags locais de peças são conservados. Grupo oculto/travado exige groupFlags=inherit
para usar a herança nativa, com aviso por flag. O caminho básico de origem não
aplica Group.visibility ao Object3D como a avaliação nativa faz; o toggle da UI
edita flags de descendentes. Uma peça visível sob grupo com flag oculto pode mudar
de visibilidade ao adotar herança, portanto não é uma equivalência silenciosa.
Travas nativas também protegem os descendentes durante edição.

export=false exige exportFlags=discard, com aviso no caminho de cada nó afetado.
O formato nativo não armazena essa marca. Nenhum nó é omitido ou escondido por esse
estágio; não se promete que todos sairão em cada exportação futura, pois ela ainda
obedece visibilidade/opções nativas. export=true não demanda adaptação adicional.

## Referências e review

[Group](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/group.js#L621),
[Outliner](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/outliner.js)
e OutlinerNode foram conferidos no cache do commit fixado; toggles de grupo copiam
flags para filhos. A avaliação nativa foi conferida em evaluateSceneNodeFlags.
Implementação própria, sem incorporar/executar fonte GPL.

Review percorreu relações/ordem/identidade, poses/cópias, limites, nomes, materiais,
flags e omissões. O teste de subconjunto privado retém metadados de todos os nós;
isso não substitui as políticas de seleção/omissão já verificadas no lote 181.
Não houve necessidade de alterar testes anteriores ou contratos de produção.

Limitações: aparência de peças sem textura ainda vem de materiais explicitamente
fornecidos; o fixture não prova equivalência às marker colors do Blockbench.
Shading, seams, camadas/PBR completos, animações e metadados restantes ainda precisam
dos respectivos gates antes da composição completa, worker, prévia ou adoção.

## Evidências

Três revisões com metadados/seleção/topologia/poses/UV/geometria reais: grupos
aninhados/vazios, nomes repetidos, IDs especiais, documento nativo, matrizes world
e GLB validado pelo Khronos. Modificar arrays de TRS não altera fonte nem irmãos.
Visibilidade/travas herdadas verificadas no avaliador nativo; flags de peça locais,
export=false em grupo e mesh, caminhos distintos em 4.x/5.x, Unicode/nomes ausentes,
metadados inertes, estágios inconsistentes/materiais inválidos antes de copiar TRS.
Limite exato de 512 grupos via pipeline real e guardas de overflow de nós/geometrias.

Novos testes: 9 passes, zero falhas, 365 asserts, 566 ms. Tipos e Biome 988 passaram.
Focal expandido: 132 passes, zero falhas, 11.218 asserts, seis arquivos, 2,29 s.
Integral: **2.332 passes, zero falhas, 316 arquivos, 8.320.124 asserts, 142,45 s**,
exit 0. Vite 1,16 s; workers mantidos e aviso Three >500 kB permanece. CSS mudou
de 53,69 para 53,82 kB, com utility transform presente; o @source do playground
inclui os testes e o fixture novo contém esse token. Hashes de chunks consumidores
mudaram, sem aumento observado dos tamanhos JS. Não renomear testes para mascarar
a coleta de classes; exclusão de fixtures deve ser tratada na revisão de fontes CSS.
Kids exit 0: compilação 6,4 s, tipos 9,4 s, 59 páginas em 634 ms. Diff check passou
com três avisos CRLF anteriores. Sem novo benchmark, dependência, UI bbmodel,
importador completo ou ativação pública.
