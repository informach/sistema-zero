# Materiais de textura bbmodel, lote 191

## Contrato e implementação

planBbmodelTextureMaterials interpreta texturas selecionadas do formato free antes
de selecionar recursos ou decodificar imagens. Lista limitada, deduplicação estável,
orçamento nativo de materiais antes dos descritores e índices explícitos. Não lê
pixels, paths, fontes embutidas, camadas, UV, FPS ou receitas de grupos PBR.

O shader texturizado de origem não é MeshStandardMaterial. A opção molda-standard
é obrigatória para adaptar iluminação, interpretação sRGB dos canais de cor,
transparência/alpha cutoff e escrita/ordenação de profundidade ao material nativo.
Cada textura gera relatório. Não se promete identidade visual com settings,
iluminação, seleção/highlight ou gestão de cor da sessão do Blockbench.

Outras mudanças têm escolhas separadas, recusadas por padrão: lado auto depende
da sessão e precisa de front/double; repetição precisa de clamp escolhido; modos
emissive/additive/layered precisam de standard escolhido. Lado autoral explícito
prevalece sobre a escolha auto. limited/clamp e wrap ausente correspondem a clamp
no renderer de origem. Modos/canais desconhecidos continuam unsupported mesmo
quando todas as adaptações conhecidas são permitidas.

Grupo PBR não vira material simples silenciosamente: texture-only exige escolha
e relatório. Essa alternativa usa a própria imagem vinculada à face, não o mapa
de cor de outro membro do grupo, e não converte o grupo PBR completo. Canais
normal/height/MER usados assim são relatados como cor; não são ligados erroneamente
a normal/roughness/metalness nativos. Fora de um grupo material, o preview comum
de origem também usa a própria imagem. Configurações/expressões de grupos ficam
inertes. Suporte completo a PBR precisa de receitas próprias e orçamento adicional.

materializeBbmodelTextureMaterials liga planos privados às imagens correspondentes
do lote 190, sem substituto para imagem ausente. Retorna materiais próprios e mapa
por textura para o lote 189. Cor de base transparente fica sob a pintura; base
branca opaca preencheria incorretamente buracos transparentes. Acabamento nativo
escolhido: roughness 1, metalness 0. IDs/nome estáveis, nomes adaptados com relatório.

Não aprova normais geométricas, UV fora do quadro animado, camadas, flags/hierarquia,
animações ou documento completo. Planos e vínculos de imagens são estágios privados,
não um parser de materiais externos. O orçamento testado de 20.896 materiais é
desse estágio; não contorna o limite de imagens ou a soma final com materiais de peças.

## Referências e review

[Texture](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js#L710)
configura sides, blending e wrap; getMaterial seleciona grupo PBR conforme o modo
da sessão. [Shader texturizado](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/shaders/texture.frag.glsl)
descarta alpha abaixo de 0,01, diferentemente do caminho nativo adaptado.
[Canvas](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/preview/canvas.js#L691)
resolve auto a partir de settings da sessão/formato.
[Grupos PBR](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/texture_groups.js)
usam uma receita diferente. Fonte conferida em cache/Octocode; código próprio,
sem executar/incorporar GPL. O renderer nativo foi conferido em SceneMaterialResource.

Review: separação plano/materialização, gates antes de descritores/recursos,
escolhas independentes, enum desconhecido, grupos comuns versus materiais, ordem
dos vínculos, propriedade de arrays, cor sob alpha e distinção de mapas de dados.
Uma anotação de teste não tratava pixels nullable de DataTexture; adicionada uma
conferência real de Uint8Array em vez de cast ou substituição por buffer vazio.
O formatter foi executado após esse ajuste; nenhuma mudança em produção necessária.

## Evidências

Três revisões: JSON, metadados de todos os nós, geometria, poses, UV, imagens e
materiais reais compõem documento nativo válido. SceneRenderResource real monta
MeshStandardMaterial/DataTexture sem GPU: double-side, alpha, depthWrite, sRGB,
orientação e pixels exatos conferidos. Exportação GLB passa no Khronos Validator;
PNG embutido é decodificado independentemente com libvips, inclusive alpha 1/255
mantido após a adaptação. Não é homologação de GPU ou identidade do shader original.

Seleção/deduplicação, Unicode, lados/auto, repeat, efeitos especiais, PBR/canais,
nomes, fonte e arrays irmãos intactos, imagem faltante, tetos exatos/overflow,
opções/índices inválidos e seleção vazia. Getters proíbem leitura de dados alheios
ao planejamento. Novos testes: 10 passes, zero falhas, 243 asserts, 748 ms.
Tipos finais e Biome 986 passaram. Focal expandido: 124 passes, zero falhas,
66.670 asserts, cinco arquivos, 2,57 s. Integral: **2.322 passes, zero falhas,
315 arquivos, 8.319.753 asserts, 137,66 s**, exit 0. Vite 1,71 s, chunks iguais
ao lote 190; aviso Three >500 kB mantido. Kids exit 0: compilação 6,3 s, tipos
8,9 s, 59 páginas em 661 ms. Diff check passou com três avisos CRLF anteriores.
Sem novo benchmark, dependência, UI bbmodel, importador completo ou ativação pública.
