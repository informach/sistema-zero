# Malhas GLB/glTF, lote 141

## Escopo

Leitor de atributos/topologia com referências a accessors e materiais. Não é
conversão para documento nativo, carregamento de materiais ou aplicação de morphs.
Preservar o JSON original para relatório de extensões/diferenças. Não executar
scripts/extensões, soldar vértices ou omitir primitivas degeneradas neste leitor.

Sete modos expandem para pontos, pares de linha ou trios de triângulo. Strips
alternam orientação; fans mantêm o vértice central e winding. Counts precisam
formar primitivas completas. Índices inteiros não negativos devem apontar para
vértices e não usar o máximo do componente (primitive restart).

Atributos conferem shapes/tipos/normalized, counts comuns, min/max de POSITION,
sinal de TANGENT e conjuntos numerados de UV/cores/juntas/pesos. Mapa customizado
permanece explícito. Uso de bufferViews separa vértices de índices; atributos
distintos no mesmo view precisam de stride. Experimento independente confirmou
que COLOR_0 VEC3/U8 tightly packed sem alinhamento produz
MESH_PRIMITIVE_ACCESSOR_UNALIGNED no validador.

Morphs precisam de base correspondente, count correto e quantidade comum nas
primitivas da malha. Seus mapas são parciais: UV1 pode mudar sem repetir UV0.
Pesos padrão são próprios, finitos e ordenados. Ausência cria zeros. Não conferir
aqui comprimentos de normais, soma final de pesos/juntas de skin, animações ou
suporte a extensões: esses contratos pertencem às etapas semânticas seguintes.

## Revisão e custo

RED/GREEN corrigiu índice negativo antes da escrita Uint32, numeração consecutiva
aplicada indevidamente a morph parcial e varredura de tangentes repetida por cada
primitive. Um teste instrumentado com 1.000 tangentes e 100 referências passou de
200.100 para 2.001 acessos. Cache é só da importação atual; mudar os dados e iniciar
outra importação volta a conferir o sinal. Redução de trabalho provada, não medição
de latência/GPU ou promessa de p95 de hardware.

Segundo RED/GREEN: orçamento de atributos deve preceder leitura de valores e
alocação de pares Object.entries. Nomes de conjuntos com newline não podem evitar
o parser por falha da regex de família. Agora conferir nomes, depois valores;
prefixo e sufixo numérico são verificados separadamente.

Topologia inteira é planejada antes de alocar saídas, teto agregado 4.194.304
índices Uint32 (16 MiB), 4.096 meshes, 65.536 primitives, 64 atributos/targets.
Isso não substitui os tetos menores de geometria editável da próxima conversão.
Metadados não copiam atributos numéricos grandes por primitive.

## Evidência

16 testes de domínio e um de pureza adicionados. Focais dos leitores: 79/0,
1.200 expectativas. Tipos e Biome/736 passaram. Integral: 1.712 testes, zero falhas,
246 arquivos, 91,95 s e 8.197.322 expectativas. Vite/1,20 s e Kids: compilação/7,1 s,
tipos/9,1 s, 59 páginas/603 ms passaram. Diff check passou. Sem ativação pública,
UI de importação ou homologação visual/hardware.

Base: [glTF 2.0, §§3.6.2.4 e 3.7.2](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
