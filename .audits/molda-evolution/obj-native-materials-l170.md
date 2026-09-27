# Materiais e imagens OBJ nativos, lote 170

Nota posterior: o [lote 187](texture-orientation-l187.md) converte pixels para
bottom-up e mantém V original do OBJ. normalFlipY agora corresponde à fonte
negativa; canais e políticas de cor/alpha são preservados. O texto abaixo
registra a implementação e as evidências históricas, não a orientação atual.

## Contrato e separação

`convertObjMaterials` consome o mesmo conjunto completo, plano de aparência e
rasters privados/imutáveis. Valida escolhas e teto de materiais antes da fonte;
planeja todas as receitas antes de gerar pixels. Não abre coordenadas, faz IO,
adota documento ou ativa o formato público. Seleção, propriedades, mapas e
geometria conservam seus relatórios anteriores: o relatório deste conversor
é adicional, não substitui essas decisões.

Políticas estritas: alpha de cor `ignore`/`multiply`, eixo Y de normal de origem
`positive`/`negative`, visibilidade dos dois lados booleana; combinação de máscara
com outra resolução `reject` por padrão ou `nearest` explícito. Desconhecidos,
null e valores incoerentes não viram defaults. Essas escolhas são internas e
ainda precisam da revisão/UX de importação OBJ.

## Pixels e aparência

RGB usa a interpretação linear/sRGB e o remapeamento `base + ganho × amostra`
do plano. Cor é multiplicada por Kd em luz linear e só então codificada em sRGB
RGBA8. Opacidade multiplica d/1−Tr, máscara escalar e, quando escolhido, alpha
da imagem de cor. Sem premultiplicar; RGB sob alpha zero fica na camada editável.
O compositor nativo produz RGB zero onde a composição inteira tem alpha zero,
sem alterar essa camada. A base do material com cor OU máscara fica transparente:
ela é fundo sob a pintura no Molda, não um fator de multiplicação.

Máscara sem mapa de cor usa sua própria grade e RGB de Kd. Com cor, a grade é
a da cor. Resoluções diferentes exigem opção e geram aviso com dimensões; nearest
amostra os centros dos pixels em ambos os eixos. É uma aproximação explícita,
não preservação exata de todos os limites de texel de duas grades diferentes.
UV comum e sampler adaptado continuam seguindo o lote 167; nenhuma imagem gira,
faz wrap, escolhe ICC/EXIF ou muda o UV durante esse bake.

Escalares r/g/b usam a curva escolhida; l usa Rec.709 em luz linear; m é alpha
linear, independentemente da etiqueta RGB. Remapear antes de inverter. O modo
`map_Tr` invertido é máscara invertida ANTES de multiplicar a opacidade do
material, não a fórmula implícita 1−(Tr×pixel). Rugosidade/metal viram imagem
cinza linear, com alpha 255; os fatores contínuos Pr/Pm permanecem no material.
Normais mantêm RGB linear e alpha 255; 16→8 bits usa arredondamento, sem curva.
Todas as fontes de 16 bits usadas em uma receita ganham aviso de quantização.

Normal positiva de origem exige `normalFlipY=true` no nativo, pois 1−V inverte
a bitangente. Normal negativa exige false. A convenção se refere à fonte antes
da transformação nativa, não apenas a trocar um canal no bitmap. Força 0–4
continua conforme o plano; alturas não viram normais sem opt-in do lote 167.
Isso não recupera normais/smoothing de geometria omitidos no lote 162 nem garante
equivalência visual com outro renderizador.

## Arquitetura, orçamento e ownership

`objMaterialPixels` só calcula amostras, `objMaterialImages` planeja receitas,
`objNativeMaterials` compõe materiais e vínculos. Nenhum módulo depende de Three,
React ou DOM; teste de pureza percorre o entrypoint. `nativeImportName` compartilha
o limite de 128 UTF-16 sem cortar pares; o nome glTF anterior é reexport, com
algoritmo preservado e sem cópia de regra específica de formato.

Cache por índice do raster e receita efetiva, não por nome/material/arquivo
apenas. Cor inclui fator/espaço/faixa/máscara/alpha. Dados escalares incluem canal,
curva/faixa/inversão e podem compartilhar rough/metal. Normal não incorpora força
ou flip na chave, porque esses continuam no material. Não deduplicar por conteúdo
calculado nem compartilhar buffers com fonte ou outra chamada. Bindings e UV
retornados são próprios. Nomes de recursos importados são limitados com relatório.

Teto convertido: 20.000 imagens e 32 MiB de pixels RGBA8, considerando cada receita
distinta. O teto de rasters da entrada é separado; nenhum deles representa pico
de RAM de importação/render. As duas fronteiras exatas e excesso foram testadas
com pipeline real. Getters de pixel que falham se lidos comprovam que o orçamento
inteiro precede o primeiro bake; não são benchmark de CPU nem instrumentação GPU.

## Revisão e evidências

Doze testes novos: base/default/nomes, cor+alpha, máscara isolada/invertida,
8/16 bits, canais/curvas/Rec.709/remapeamento, grades distintas, receitas/cópias,
32 MiB/20.000 imagens, políticas/teto de material antes da fonte, recurso ausente,
normal16/variante sem UV e integração com materiais reais Three/GLB.
O oracle de normais calcula tangentes com Three em UV de origem e UV produzido
pela geometria real, para quatro sinais de escala e as duas convenções Y. Confere
perturbação em espaço do objeto (erro <1e−14), canais lineares/sRGB/flip/força dos
materiais reais, descarte e green invertido no GLB reaberto pelo leitor/decoder.
Khronos: zero erros, aviso exato `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`, sem
promessa de tangentes autoradas/exportadas ou homologação GPU.

Focal inicial teve duas expectativas incorretas de teste: RGB invisível do
compositor era comparado ao RGB editável sob alpha zero; GLB exigia zero avisos
apesar de depender de tangentes geradas. Leitura do código/contrato e teste glTF
anterior confirmaram ambos. Testes corrigidos sem mudar o compositor ou esconder
avisos. Tipagem dos fixtures também foi ajustada por narrowing real de Map/mesh,
sem relaxar tipos de produção. Focal novo final: 12 passes, zero falhas,
362 asserts, 3,04 s. Tipos passaram; Biome verificou 887 arquivos sem alterações.
Focal integral de importadores/core/pureza: 419 passes, zero falhas, 42 arquivos,
39.641 asserts, 21,93 s. Integral: 2.072 passes, zero falhas, 285 arquivos,
8.236.061 asserts, 128,23 s. Vite 1,30 s; chunks glTF worker 181,41 kB,
painel 35,49 kB e Three 579,29 kB inalterados (aviso >500 kB permanece).
Kids: compilação 6,3 s, tipos 8,8 s, 59 páginas/624 ms, saída zero.
Diff check passou com os avisos CRLF preexistentes.

Benchmark de regressão glTF normal, sem comparação pareada: hashes dos três
cenários preservados e `sourceUnchanged=true`. p50/p95 em ms: 16²×1 0,165/0,230;
256²×4 2,695/11,014; 1024²×8 76,545/96,967. RSS amostrado respectivamente
187.953.152, 216.387.584 e 269.156.352 bytes. Não usar diferenças entre execuções
como evidência de ganho/perda de CPU ou RAM; não mede o novo bake OBJ.

Sem nova dependência, adoção OBJ, rollout, homologação de crianças/dispositivos
ou alegação de ganho de CPU/RAM. Hierarquia/documento completo, relatório composto,
worker e revisão/adoção OBJ são os próximos passos. A contagem de relatório de
importação completo também precisa de política agregada: o limite de imagens
sozinho não prova que uma revisão com todas as decisões cabe no protocolo.
