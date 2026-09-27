# UV normalizado e configuração de imagens bbmodel, lote 188

## Escopo e implementação

Estágios próprios para o formato free. Não são um importador completo nem aprovação
dos materiais, shaders, camadas, PBR ou campos ainda não consumidos do documento.
Não ativam UI bbmodel ou formato público.

bbmodelUvDimensions compartilha a resolução lógica: eixo próprio da textura, depois
eixo do projeto, depois 16. Ausência é tratada por eixo; width/height de pixels nunca
substituem uv_width/uv_height. Retorna um par próprio, não um cache mutável da fonte.

convertBbmodelNativeUvs consome topologia orçada, UV autoral e vínculos correspondentes.
Cada face original é convertida uma vez, preservando a associação de sourceCorner
mesmo quando o quad vira dois triângulos. Retorna u/uvWidth, 1-v/uvHeight em Float64,
local a um quadro de textura, com índice original da textura ou null para face sem
textura. Sem imagem usa resolução do projeto; não escolhe textura selecionada/default.

Overflow em Float32 é recusado com caminho original de face/canto. UV externo ao
quadro é conservado e relatado por cantos originais, sem clamp/wrap/nudge. Colapso
na divisão/reflexão e underflow Float32 são avisos distintos; não arredondam o par
armazenado. Signed zero de U é preservado; V passa pela reflexão necessária.
O materializador de imagem deve entregar imagem estática completa ou flipbook/crop
local ao quadro. UV local não pode ser ligado diretamente à folha animada inteira
como se fosse uma textura estática.

planBbmodelTextureLayouts usa dimensões decodificadas e a proporção lógica UV para
inferir a faixa vertical de quadros do free. O número segue a margem 0,05 da fonte,
não razão arredondada ao inteiro mais próximo. Quadros devem ocupar linhas inteiras;
não recorta nem redimensiona imagens incompatíveis. Cached size diferente é aviso;
zero/ausência no cache significam desconhecido, não erro ou orçamento de pixels.

Índices escolhidos são deduplicados em ordem. Aliases de raster conservam configurações
de UV/animação próprias; o orçamento reserva RGBA8 por imagem nativa planejada, não
somente pelo buffer compartilhado de origem. Todos os pixels são orçados antes de
alocar sequências. Este estágio nunca lê rgba, aplica curva de cor ou copia pixels.
Quantização, compartilhamento final de materiais e camadas permanecem posteriores.

Quadros viram metadados nativos com faixa vertical, sequência própria, loop e FPS.
Sequências loop, reversa, ida/volta e custom mantêm repetições. Padrão é 7 FPS;
o mínimo de 1 FPS aplicado pelo runtime free é reproduzido com aviso quando ajusta
o número autoral. Mais de 60 FPS é unsupported, sem redução automática. Índices
custom seguros acima da contagem fazem a mesma volta modular da fonte, com aviso.
frame_time de mcmeta não governa playback free.

Tetos existentes: 256 células e 256 passos, separadamente; ida/volta pode ultrapassar
o segundo antes do primeiro. Fonte custom vazia segue loop; texto extra, expressões,
índices negativos/inseguros e tokens vazios são recusados. Não imita parseInt parcial.
Espaços nas pontas não são removidos: eles criam passos de fallback no runtime de
origem e trim alteraria o tempo. O estágio não restaura currentFrame/relógio de sessão,
nem afirma equivalência de pixels fora do quadro entre sampler da folha e crop nativo.

## Fontes conferidas

[Texturas](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js),
[formato free](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/generic.ts),
[Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js),
[Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js)
e [playback de textura](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/texture_flipbook.js#L30).
O playback foi consultado com Octocode no mesmo commit; cache existente foi usado
nas outras leituras. A implementação é própria; nenhum código GPL foi executado
ou incorporado. Sequências esperadas e amostras são fixtures próprias.

## Review

A primeira versão do parser custom aplicava trim. Leitura exata do playback mostrou
que isso removeria passos fallback; antes da validação final, o trim foi retirado e
casos com espaços nas pontas foram adicionados como unsupported. Não converter
ambiguidades de um parser permissivo em outra animação silenciosamente.

O teste de identidade por face foi reforçado para passar pelo envelope, leitores,
vínculos e topologia reais, em vez de acrescentar faces manualmente aos estágios.
O teste de raster faltante passou a substituir o mapa privado por outro vazio,
respeitando ReadonlyMap; não mudou o contrato de produção para satisfazer tipos.

Cobertura: três revisões, resoluções por eixo e pixels falsos de cache, seams entre
texturas e faces sem imagem, cubos girados/mesh quads, associação após triangulação,
U signed zero, overflow/underflow/cancelamento aritmético, fonte intacta e omissões.
Imagens reais PNG/resources/decoder, aliases com resoluções UV diferentes, limites
exatos de células/passos/pixels, repetição e sampling nativo ao longo de três ciclos,
quadros numerados na folha bottom-up e getters que proíbem leitura de pixels/camadas
e dados de reprodução de imagens estáticas.

## Evidências finais

Tipos e Biome 980 passaram. Focal: 128 passes, zero falhas, 1.741 asserts em sete
arquivos, 2,71 s. Integral: **2.287 passes, zero falhas, 312 arquivos, 8.253.660
asserts, 138,40 s**, exit 0. Vite 1,10 s, chunks idênticos ao lote 187; o aviso
Three >500 kB permanece. Kids exit 0: compilação 6,3 s, tipos 9,0 s, 59 páginas
em 693 ms. Diff check passou com três avisos CRLF anteriores. Sem novo benchmark,
dependência, UI/worker bbmodel, ativação pública ou homologação de dispositivos.
