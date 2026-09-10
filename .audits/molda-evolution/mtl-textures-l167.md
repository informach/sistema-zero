# Mapas MTL e aplicação de UV, lote 167

Nota posterior: o [lote 187](texture-orientation-l187.md) corrigiu a convenção
compartilhada de linhas. OBJ agora mantém V crescente para cima, com pixels
nativos bottom-up; escala/offset, políticas e evidências históricas abaixo permanecem.

## Fontes e limites da interpretação

O [manual MTL](https://github.com/Alhadis/language-wavefront/blob/master/docs/mtl-spec.rst)
separa mapas de cor, escalares, altura e ambiente. Descreve seleção de canais,
ganho/base, transformação UV e opções de amostragem. Clamp deixa o material
subjacente fora da imagem, não estende os pixels da borda. O manual não fornece
uma curva portátil para -cc nem uma fórmula única para obter luminância de RGB.
As [extensões PBR](https://github.com/tinyobjloader/tinyobjloader/blob/release/pbr-mtl.md)
distinguem rugosidade, metal e normais; classificam map_Tr como mapa de opacidade.

O [coletor de materiais Blender](https://github.com/blender/blender/blob/main/source/blender/io/wavefront_obj/exporter/obj_export_mtl.cc)
lê imagem de Roughness para a entrada de expoente especular, além de imagem RGB
de Normal Map. O [writer](https://github.com/blender/blender/blob/main/source/blender/io/wavefront_obj/exporter/obj_export_file_writer.cc)
emite essas entradas como map_Ns e map_Bump. Portanto, esses nomes não garantem
uma interpretação universal. Não há detecção por comentário/nome de arquivo,
execução de código externo nem cópia de implementação GPL.

## Contratos próprios

`planMtlTextures` recebe a declaração imutável e seu plano escalar do lote 166.
Processa somente índices efetivos. Resolve papéis antes de opções/valores e
retém no máximo um mapa de cada papel: cor, opacidade, rugosidade, metal, normal.
Conflitos entre papéis exigem reject/first/last; não são a mesma coisa que
propriedades repetidas nem opções repetidas dentro de um mapa. Saída mantém
ordem de fonte, não aloca array esparso pelo índice e não guarda recurso/pixels.

Sem UV, mapas de superfície são omitidos com motivo sem ler suas opções.
Reflexão continua independente de UV. Ka/Ks/Ke/Ps/decal/disp/reflexão não têm
representação neste estágio: reject por default ou omissão explícita de papel.
Opções incompatíveis em mapas retidos não são escondidas por essa escolha.
Bump requer interpretação como normal RGB; altura ainda não é convertida.
map_Ns requer escolha de imagem de roughness; conversão de mapa de expoente
Phong não está implementada. map_Tr exige opacidade ou transparência explícita;
a segunda inverte depois do ganho/base e antes do fator de opacidade.

Políticas RGB de cor e dados são obrigatórias/separadas, sem inferir a do Kd.
Tags linear/sRGB, case-insensitive, sobrepõem essa política; outros espaços
são unsupported. RGB normal é dado linear; alpha/matte nunca recebe curva.
Canal l usa a interpretação relatada de luminância linear Rec.709, com pesos
0,2126/0,7152/0,0722, também documentados na
[definição de luminância relativa W3C](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).
Isso é uma decisão de conversão, não uma fórmula atribuída ao manual MTL.
Neste lote o contrato é planejado; ainda não calcula canais de pixels.

Opções repetidas exigem política. Vetor escolhido substitui todo o anterior,
sem mesclar componentes. Defaults: offset zero, escala um, ganho/base 1/0;
terceiro eixo não representado em raster 2D é relatado. Turbulência não zero,
-cc on, canal z e espaço desconhecido são unsupported. -mm só passa quando os
dois extremos do intervalo 0–1 permanecem representáveis: aceita inversão,
não clamp. Normal RGB recusa faixa -mm não identidade, escala UV zero e força
fora de 0–4. boost/texres são omitidos com relatório. Nearest e extensão de borda
nativos são adaptações relatadas para ambos os modos de clamp da fonte; não
há promessa de equivalência dos filtros nem de tiling preservado.

Mapas retidos precisam compartilhar offset/escala 2D exatos. Transformações
diferentes são unsupported até existir bake apropriado. Arrays de cada mapa e
transformação comum são próprios. Não há cache entre chamadas. Tamanho/formato
do raster, fatores materiais, quantização e orçamento agregado de pixels são
responsabilidade do próximo estágio, não aprovados por este resultado.

## Integração de geometria e revisão

`ObjGeometryMaterials.uvTransforms` vincula transformações por ID material.
Preflight copia/verifica mapas, IDs, campos, tuplas finitas e teto de materiais
antes das coordenadas. Compartilha uma cópia preparada por material entre as
faces, apenas para leitura. Face com transformação e sem UV completo é erro de
vínculo, não amostragem de [0,0]. Construção ponto/linha não ganha textura.

`objNativeUv` aplica escala/deslocamento à fonte antes de 1-v. Sem wrapping,
arredondamento de grade ou transformação das posições. Overflow é unsupported
com caminho da face; ausência de transformação mantém a conversão anterior.
Normal RGB ainda exige conferência de orientação tangente na materialização.

Quatorze testes novos: canais/políticas/omissões, conflitos, vetores abreviados,
faixas, tags, sampler, fonte própria, índice 65.535, ausência de cache e gates de
coordenadas. UV comparado com MTLLoader/Texture reais do Three, sem carregar
imagens/GPU. Fluxo real conjunto → seleção → base/mapas → geometria verifica
duas transformações por material, costura no mesmo vértice, variante sem UV e
endereçamento de texels nativo. Imagens propositalmente inválidas demonstram que
o caminho ainda não decodifica pixels. Tetos exatos/extra material e getters
validam preflight/ownership. Não é benchmark de ganho de desempenho.

Dois erros de tipagem em fixtures foram corrigidos: expectativa de tupla numérica
e Map inferido com chave template literal estreita demais para testar excedente.
Sem casts de dados ou alteração de produção para acomodar o teste. Focal dos
quatro arquivos: 32 passes/445 asserts. Focal final de importação/core/pureza:
387 passes, 39 arquivos, 39.055 asserts/18,14 s. Tipos passaram; Biome/869 passou.
Integral final: 2.040 passes, zero falhas, 282 arquivos, 8.235.476 asserts/125,08 s.
Vite: 1,30 s, chunks iguais ao lote 166, aviso Three conhecido. Kids: compilação
5,6 s, tipos 9,7 s, 59 páginas/583 ms. Diff check passou com avisos CRLF antigos.
Nenhuma dependência, IO, ativação pública ou homologação GPU/toque/crianças.
Próximo lote: núcleo raster PNG/JPEG compartilhado e recursos OBJ selecionados;
depois materialização/bake, documento completo, worker, revisão e adoção OBJ.
