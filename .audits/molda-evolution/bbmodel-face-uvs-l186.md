# UV autoral por canto bbmodel, lote 186

## Escopo

Estágio próprio sobre fonte tipada, planos topológicos orçados e metadados free.
Retorna UV em unidades autorais por face/canto original, não coordenadas normalizadas
de uma imagem. Uma face original é preparada uma vez mesmo quando o quad gera
dois triângulos. O materializador futuro usará sourceCorner para cada polígono.

Box UV usa dimensões não infladas, floor(to-from+1e-7), faixa de quatro laterais,
duas tampas orientadas, espelho horizontal/troca east-west e offset. Não usa
stretch, inflate, origin, rescale ou resolução de pixels para calcular esse mapa.
Modo explícito do cubo tem precedência; ausente herda projeto e free default false.
O modo por face usa seu retângulo autoral, inclusive eixos UV invertidos.

Giro positivo de 90 graus desloca o início no ciclo TL/BL/BR/TR. Somente múltiplos
não negativos de 90, representáveis como inteiros seguros, são suportados; índice
modular limita trabalho a quatro cantos mesmo no maior múltiplo seguro. Não imita
loop ilimitado nem arredonda ângulo arbitrário/negativo. Sem margem 1/64 de preview.

Mesh mantém pares originais, inclusive signed zero, valores enormes finitos e UVs
coincidentes. Ausência exige escolha zero ou erro com chave literal; pares excedentes
são relatados. Contagens usam cantos/pares de origem, não se duplicam com triangulação.
Sem deslocamento 0,00005 da prévia nem inventar unwrap. Dados de faces de construção,
desativadas, omitidas e partes não selecionadas não são consumidos pelo conversor.
Leitura completa anterior da fonte continua obrigatória.

Fonte [Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
e [Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js),
sem executar/incorporar código GPL. Retângulos/cantos são próprios, fontes intactas.
Não interpreta materiais/frames/normalização nem aprova desenho de UV em Float32.

## Review e correções

Review descobriu que verificar todos os retângulos gerados bloqueava uma face válida
quando uma tampa desativada transbordava. Regressão RED 0/1 reproduziu isso; gate
movido para cada retângulo efetivamente retido. Face ativa com overflow continua
unsupported com caminho exato. Nove testes finais passaram, sem relaxar a regressão.
Anotação esperada de uma fixture mesh explicitada após diagnóstico de tipos;
sem alteração de matcher ou algoritmo por esse diagnóstico.

Cobertura: três revisões, orientação independente das seis superfícies, espelho,
offset/fronteira floor, herança e false explícito, giros seguros/recusados, associação
do quad triangulado, contagem sem duplicação, UV ausente/excedente, propriedade,
signed zero, fontes coincidentes sem nudge, omissões e acesso limitado por getters.

## Evidências finais

Focal: 113 passes, zero falhas, 1.259 asserts, cinco arquivos, 3,04 s. Tipos e
Biome 971 arquivos passaram. Integral: **2.251 passes, zero falhas, 308 arquivos,
8.253.181 asserts, 140,15 s**, exit 0. Vite 1,45 s, chunks mantidos:
matrix 2,11 kB, glTF 182,26 kB, OBJ 157,14 kB, Three 579,29 kB (aviso >500 kB).
Kids exit 0: compilação 6,1 s, tipos 10,0 s, 59 páginas em 642 ms. Diff check
passou com os três avisos CRLF prévios. Sem dependências, benchmark, UI bbmodel,
ativação pública ou homologação GPU.

## Achado para o lote seguinte

Ao preparar a normalização, a revisão encontrou convenções diferentes de linhas:
SceneRasterFromCanvas/SceneImagePreview/flipbook são bottom-up; importadores glTF
e OBJ materializam pixels top-down e compensam no UV para manter o desenho 3D.
Isso precisa de regressão conjunta 2D/3D/exportação/reimportação antes de decidir
o ajuste, evitando corrigir apenas a imagem e quebrar mapeamento/normais. Lote 187
investigará esse contrato compartilhado antes de conectar materiais bbmodel.

