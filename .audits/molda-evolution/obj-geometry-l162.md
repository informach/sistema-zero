# Geometria OBJ editável, lote 162

## Escopo e arquitetura

Conversão própria sobre a fonte imutável do lote 161. `planObjGeometries` resolve
partes pela linha da declaração de objeto, não pelo nome. Mudanças de grupos,
material e suavização não duplicam superfícies. Posições globais não usadas têm
uma parte de construção separada; declarações vazias continuam na fonte para a
futura montagem da hierarquia. Posições usadas por dois objetos exigem duas
cópias nativas, contabilizadas antes de copiar xyz. Não há solda ou mudança de eixo.

Vínculos recebem IDs nativos por índice de elemento fonte. Isso permite ao
estágio de materiais distinguir faces com e sem UV, mesmo sob o mesmo `usemtl`.
Índice precisa apontar para uma face, material nomeado precisa de vínculo e todos
os IDs passam pela validação nativa. A tabela é copiada; não há lookup por nome,
IO, carregamento de MTL ou aproximação de caminhos aqui.

Preflight limita partes, vértices, arestas e triângulos agregados antes de
materializar coordenadas. O número de posições fonte é um limite inferior,
porque todas sobrevivem. Cada polígono preserva cantos, winding e costuras.
Fechamentos finais só são removidos quando repetem todas as três referências
do primeiro canto, com contagem. Outras repetições de posição e mais de 64 cantos
após esse fechamento são incompatibilidades explícitas, não triangulação fan,
descarte ou fabricação de vértices para contornar o contrato.

`convertObjGeometries` cria buffers/tuplas próprios e passa cada malha pelo leitor
e build nativos reais, com orçamento compartilhado. IDs de vértice conservam o
índice fonte; IDs de face conservam sua linha. UV vira `[u, 1-v]`, conforme a
convenção nativa de linhas de pixels. Ausência de UV é tratada separadamente como
`[0, 0]`. Coordenadas não são arredondadas ao pixel. O leitor nativo canonicaliza
zero negativo, como nas demais entradas do domínio; valores não nulos não sofrem
snap. O peso racional não divide xyz.

Pontos e linhas ficam como construção editável, sem simular superfícies coloridas.
Só segmentos com o mesmo índice nas duas pontas são omitidos; índices distintos
com xyz coincidente permanecem distintos. Atributos de linha, normais explícitas,
suavização, terceiro componente UV e peso racional têm diagnósticos agregados por
parte. O path identifica a declaração da parte, não todas as linhas afetadas.
Faces degeneradas, auto-intersectantes ou colapsadas na precisão de desenho
permanecem autorais, com diagnóstico do triangulador real. Overflow numérico no
build é recusado. Apenas erros conhecidos de validação são traduzidos.

Isso ainda não é o importador OBJ completo: recursos, hierarquia, bounds do
documento inteiro, worker, relatório de cena e adoção na UI são etapas seguintes.
Não houve dependência nova, escrita no editor, ativação pública ou código OBJ
alcançável pelo bundle da oficina neste lote.

## Revisão e testes

Nove testes específicos cobrem identidade de objetos de nome repetido, estados,
ownership, vértices não usados, objetos vazios, concavidade/winding, fechamento
exato, costuras UV e seleção de texel, pesos/normais, construção e materiais por
face. Um documento montado explicitamente na fixture passa pelo leitor nativo,
encoder GLB e validador Khronos. Isso prova o contrato das geometrias, não uma
montagem de OBJ que ainda não foi implementada.

Limites exatos e excedidos incluem 64 cantos, 20.000 triângulos, 128 partes,
131.072 vértices agregados e teto nativo de arestas. Proxies que falham ao ler
coordenadas numéricas comprovam que entradas fora de orçamento e vínculos
inválidos são recusados antes da materialização. Nenhuma API de produção foi
adicionada para servir ao teste. Pureza percorre o grafo real sem React/Three/UI.

A primeira verificação de tipos encontrou um array de fixtures com `code`
inferido como string ampla. A fixture recebeu o tipo público exato da união de
diagnósticos. Nenhum contrato de produção ou asserção foi afrouxado. Tipos passaram
depois da correção. Focal final: 69 passes, zero falhas, 4.560 asserts/6,73 s.
Biome: 845 arquivos. Vite: 1,04 s, com aviso Three já conhecido. Kids: compilação
5,8 s, tipos 8,8 s, 59 páginas/572 ms. Diff check passou, só avisos CRLF existentes
em outros CLAUDE.md. Integral final: 1.984 passes, zero falhas, 275 arquivos,
8.233.208 asserts/120,19 s.

Não há medição de ganho de CPU/GPU neste lote. Validação automatizada não substitui
homologação visual, toque, hardware ou usabilidade com crianças.
