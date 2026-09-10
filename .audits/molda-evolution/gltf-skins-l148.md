# Vínculos de esqueleto glTF, lote 148

## Contrato

Leitura pura após graph/accessors/meshes. Juntas são índices próprios, únicos e
ordenados; um nó pode ser junta e ainda conter malha/câmera/anexos. Skeleton
opcional precisa ser ancestral de todas as juntas. Nada é reparentado, invertido
ou normalizado. Ausência de inverseBindMatrices representa identidade por junta.

Accessor de matrizes usa MAT4/Float32, sem normalized, target/stride ou view de
malha. Quantidade pode exceder o número de juntas; todas as linhas finais precisam
ser [0,0,0,1]. Dados singulares/refletidos/afins são preservados: o domínio glTF
não exige aqui a inversibilidade exigida na conversão nativa. Saída mantém índice
do accessor já próprio, não uma nova cópia de cada matriz por skin.

Até 4.096 skins e 65.536 referências de juntas agregadas. Orçamento das listas
precede leitura/cópia de índices e acesso às matrizes. Dados compartilhados são
conferidos uma vez por accessor em cada chamada; cardinalidade de cada skin é
conferida mesmo depois de cachear a validação. Nenhum cache cruza importações.

## Hierarquia e cenas

Índice iterativo de raiz, ordem em profundidade e tamanho de subárvore. Teste de
ancestral usa intervalo, sem caminhar pais por junta e sem recursão. Todas as
juntas precisam pertencer à mesma árvore; skeleton pode ser raiz comum ou outro
ancestral, não precisa ser junta. A ordem numérica/BFS dos nós não determina
ancestralidade.

Cenas só declaram raízes globais, conforme leitor de graph. Indexar memberships
dessas raízes permite conferir todas as cenas que contêm cada instância de skin.
Cada uma precisa conter a árvore de juntas. Duas cenas separadas não podem ser
mescladas para esconder uma dependência ausente. Biblioteca sem cenas e nós não
instanciados em cenas não inventam uma cena implícita. Pares repetidos de árvores
compartilham a conferência na mesma chamada.

## Review e testes

- Metadados/defaults/ownership, duplicatas, buracos, referências/números/nomes
  incorretos; nenhuma conversão de string/null para índice válido.
- Árvores ramificadas fora de ordem, juntas em árvores distintas, skeleton
  descendente/irmão inválido. Cadeia de 65.536 nós/juntas passa sem recursão.
- Cenas completas/compartilhadas/sem a árvore necessária, nós não instanciados,
  malha anexada à própria junta e referência a skin inexistente conferidas.
- 500 instâncias em 1.000 cenas leem cada lista de raízes uma vez; comparação de
  contagem não é medição p95/GPU. Outra chamada observa mudanças nas raízes.
- Matrizes singulares/refletidas, extra após juntas, linha final inválida inclusive
  em extra, MAT4/tipos/stride/target/roles e accessor curto depois de cache cobertos.
- 500 skins compartilhadas conferem valores tantas vezes quanto uma; corrupção
  posterior é detectada. Tetos de skins/juntas antecedem getter de valores da fixture.
- Sparse MAT4 validado pelo Khronos e pelo leitor real de accessors. Three 0.184
  não suporta sparse itemSize >4: a comparação independente usa representação
  packed dos mesmos bytes, sem remover suporte sparse do Molda ou alterar vendor.
- Exportações reais de IK/poses espelhadas nos espaços local/local-delta conferem
  identidade/ordem das juntas e matrizes com Three. Validador exige exatamente os
  três avisos NODE_SKINNED_MESH_NON_ROOT já conhecidos da fixture, sem ignorá-los.
- Duas correções de tipos nas fixtures (ArrayLike e iteração por entries), sem
  casts/supressões. Não houve alteração de comportamento do leitor para fazê-las passar.

Não é validação de valores JOINTS/WEIGHTS nem conversão de binding nativo. Materiais,
animações, extensão/loss review, worker e montagem/UI continuam pendentes. Sem
mudanças em persistência/formato público, Studio, exportação ou viewport.

## Evidência

Domínio: 12 testes passaram, zero falhas, 243 expectativas, 677 ms. Focais:
186 passaram, zero falhas, 16 arquivos, 14.798 expectativas, 4,59 s. Tipos e
Biome/777 passaram. Primeira integral: 1.808 passaram e uma falha no teste existente
de foco/prévia de reparo de malha (94,70 s). O trecho de erro foi truncado pelo
volume do reporter; sem inventar uma causa a partir do nome do teste. Dois casos
isolados passaram; integral com reporter `--only-failures` passou: **1.809 testes,
zero falhas, 254 arquivos, 8.210.798 expectativas, 129,09 s**. Mais 30 execuções de
cada um dos dois casos passaram: 60 testes, zero falhas, 40,26 s. Nenhuma mudança
nem supressão no teste/UI; ocorrência intermitente permanece registrada, não
declarada corrigida. Vite: 813 ms. Diff check passou. Kids: compilação 5,9 s,
tipos 11,1 s, 59 páginas em 592 ms. Aviso de chunk Three >500 kB permanece.

Fontes: [glTF, skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins),
[schema](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/skin.schema.json),
[validador](https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/base/skin.dart),
[Three GLTFLoader](https://github.com/mrdoob/three.js/blob/r184/examples/jsm/loaders/GLTFLoader.js).
