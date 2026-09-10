# Aparência OBJ selecionada e fatores, lote 169

## Composição antes de pixels

`planObjAppearance` combina conjunto completo, seleção do lote 165, propriedades
efetivas, mapas do lote 167 e base escalar, sem abrir coordenadas ou recursos.
Saída possui variantes com identidade de origem, base/fatores, planos de mapas,
vínculos de geometria/UV, referências exatas para rasters e necessidade de padrão.
Não contém materialização de canais/imagens nem documento pronto para adoção.

Políticas de base/textura são validadas antes da fonte, com caminhos próprios
`options.base` e `options.textures`. Problemas da declaração preservam cause e
ganham contexto `files[...].lines[...]`. Exceções que não sejam erros esperados
de entrada não são transformadas em fallback. Planos e buffers de outros lotes
continuam privados e imutáveis durante o consumo.

## Defaults e parâmetros que contribuem

O [writer Blender](https://github.com/blender/blender/blob/main/source/blender/io/wavefront_obj/exporter/obj_export_file_writer.cc)
omite o valor escalar de diversos parâmetros quando há imagem conectada. Por
isso, default de superfície sólida não pode ser usado automaticamente como
multiplicador de um mapa PBR. Essa constatação orienta a política própria abaixo.

`planMtlBase` mantém o comportamento anterior quando não recebe contexto de
mapas retidos. Contexto é estrito e possui somente roughness/metalness booleanos.
Ausência de Pm usa zero para sólido e um como fator de mapa de metal retido.
Pr/Pm autorados continuam contribuindo e precisam caber em 0–1. Não trocar fator
autorado inválido por um default apenas porque existe textura.

Mapa de rugosidade PBR retido usa Pr quando presente; sem Pr, o multiplicador é
um. Ns legado é omitido e relatado, sem ler/validar seu valor como nativo ou
exigir conversão Phong. Esse mapa não herda implicitamente um expoente como
fator PBR. A mesma regra vale para map_Ns somente após escolha explícita de
interpretá-lo como imagem de roughness. Não é conversão de mapa Phong.

Variante sem UV não retém mapas e ainda precisa de Ns quando Pr está ausente:
exige política de aproximação e intervalo válido do lote 166. Um mapa usado
por outra variante não esconde essa incompatibilidade. Defaults, omissões e
aproximações são os que efetivamente contribuem a cada variante.

## Ownership e trabalho

Seleção de propriedades é compartilhada por declaração em WeakMap local à
chamada. Nada atravessa importações; duas variantes não refazem essa seleção.
O helper interno `planSelectedMtlBase` consome índices/políticas já preparados,
enquanto o ponto independente continua fazendo sua validação. Arrays de índices
de base são próprios por resultado, inclusive entre variantes.

Referências de raster são deduplicadas por biblioteca/material/propriedade,
não por caminho (o decoder resolve aliases de recursos). Vínculos de face são
copiados da seleção; transformações UV da geometria são cópias separadas das
expostas no plano de mapa. Nenhuma mutação da seleção/plano altera a fonte.
Não há alocação nativa de imagens, IO, geometria ou interpretação de parâmetros
de materiais não selecionados neste estágio.

## Revisão e evidências

Oito testes novos cobrem fluxo real de planejamento até geometria e rasters,
defaults de metal, fator autorado, brilho descartado versus variante sólida,
map_Ns explícito/conflitos, cópias, contexto de erros, opção estrita e seleção
vazia/padrão. Getter de Ns descartado falha se for lido. Instrumentação do
forEach real conta uma seleção de propriedades para duas variantes e outra na
próxima chamada, sem alterar API de produção. Getters de coordenadas/recursos
comprovam separação de estágios, não uma medição de ganho de desempenho.

Focal inicial: 38 passes/650 asserts em cinco arquivos. Tipos passaram; Biome
verificou 881 arquivos. Focal de importadores/core/pureza: 406 passes, zero falhas,
41 arquivos, 39.276 asserts, 19,15 s. Integral: 2.059 passes, zero falhas,
284 arquivos, 8.235.708 asserts, 127,27 s. Vite: 1,75 s; worker glTF 181,41 kB,
painel 35,49 kB, sem aumento neste lote. Kids: compilação 6,8 s, tipos 8,9 s,
59 páginas/468 ms, saída zero. Diff check passou, mantendo avisos CRLF antigos.
Aviso de chunk Three acima de 500 kB permanece. Nenhuma medição pareada de
desempenho foi feita neste lote.

Cor/alpha de imagem, extração/combinação de canais, orientação de normais,
quantização e orçamento de imagens convertidas ficam no próximo estágio.
Nenhuma ativação pública, dependência nova ou homologação de dispositivos.
