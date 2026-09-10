# Metadados e referências de textura bbmodel, lote 178

## Referências e escopo

Conferidos [Texture](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js),
[TextureGroup](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/texture_groups.js),
[ModelProject](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/io/project.ts)
e [formato genérico](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/generic.ts)
no commit de referência. Tamanho UV por textura é distinto do tamanho de pixels.
O codec conserva flags, grupos, camadas e fontes embutidas. O default de textura
da aplicação também pode depender da sessão; isso não é um dado autoral estável
para o Molda inferir. Formato free não habilita single_texture/single_texture_default.

Leitura própria de metadados, não renderização/PBR, resolução local, execução de
animações ou decodificação. Defaults que dependem de projeto/formato/ambiente
permanecem ausentes, sem dimensões de pixels substituindo UV.

## Implementação e review

`readBbmodelAppearance` lê resolução/box UV do projeto, texturas e grupos.
Até 65.536 texturas e 65.536 grupos, 262.144 entradas de camadas agregadas e
32 Mi unidades UTF-16 de texto source embutido agregado. Textos/ids comuns até
4.096. São limites de entrada, não bytes de pixels nem pico RAM. Tamanhos das
listas e fontes/camadas conferidos antes de metadados numéricos/resultados
tipados, mesmo com layers_enabled false. Array.from visita buracos de listas
de descritores; estes não podem passar como resultados esparsos.

UUIDs explícitos e únicos por namespace; Map não confunde __proto__, constructor
ou maiúsculas. Grupos inexistentes são invalid, não agrupamento ignorado. UUID
de textura e UUID de grupo pertencem a namespaces distintos. Raw de grupos,
configuração de material e camadas continua readonly por contrato, sem execução
ou cópia profunda redundante. IDs não são gerados e nomes não são normalizados.

UVs declarados são positivos/finitos, inclusive fracionários; ausente permanece
null por eixo. Dimensões declaradas de pixels aceitam zero (cache desconhecido),
exigem inteiros não negativos e jamais definem orçamento de alocação de imagem.
Arquivo/header real deve ser conferido posteriormente. Paths/source/relative_path
permanecem texto literal, mesmo absoluto, URL ou script-like: nada é carregado.
Modos desconhecidos e informações de fps/frame time/order ficam explícitos;
finitude do tempo não aprova playback, nem deriva quantidade de frames.

`bindBbmodelTextures` recebe geometria/metadados já lidos, confere índice e UUID
contra as texturas reais, sem indexação/alocação por valor externo. Mantém none
e disabled; default no free é none, outros formatos unresolved-default. Não
escolhe primeira/selecionada/visível/use_as_default nem implementa regras de
Minecraft/plugins. Não resolve materiais de grupos nem consulta imagens.
Fonte geométrica ganhou sourcePath, compartilhado da proveniência existente,
para erros apontarem elements/face originais em vez de índices internos. Testes
de unresolved foram atualizados para o campo adicional sem relaxar matchers.

Review conferiu ausência de fallback, IO, execução de texto e inferência por
cached pixels; separação de namespaces e propriedade dos resultados. Somente
decisões sobre campos lidos são realizadas. Camadas, PBR, wrap, render sides,
frame order e material_config exigem leitores/conversores posteriores.

## Evidências finais

Focal metadata/binding/geometry/graph/envelope/pureza: **96 passes, zero falhas,
1.414 asserts, seis arquivos, 3,34 s**. Tipos e Biome 948 arquivos passaram.
Integral: **2.160 passes, zero falhas, 298 arquivos, 8.238.327 asserts,
136,08 s**. Vite passou em 1,39 s, chunks mantidos: glTF 181,97 kB, OBJ
157,01 kB, Three 579,29 kB com aviso >500 kB. Kids terminou com exit 0:
compilação 6,3 s, tipos 14,0 s, 59 páginas em 503 ms. Diff check passou com
os três avisos CRLF prévios. Nenhuma dessas medições é benchmark pareado.

Testes incluem as três versões, tamanhos UV/pixels diferentes, herança parcial,
textos inertes, dados originais, nomes especiais, default não inferido, referências
zero/UUID literal/índice extremo, erros no path original, metadados inválidos e
limites individuais/agregados exatos. Tetos de estágio também testados diretamente
com JSON já parseado; não é prova de que todos caibam juntos no envelope.
Sem nova dependência, UI bbmodel, ativação pública, homologação ou ganho CPU/RAM.
