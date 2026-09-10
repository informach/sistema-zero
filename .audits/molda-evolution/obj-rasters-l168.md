# Núcleo raster compartilhado e imagens OBJ, lote 168

## Extração e compatibilidade

Decodificação PNG/JPEG dos lotes 146/147 e planejamento agregado do lote 147
passam a módulos `raster*`, independentes dos contêineres glTF/OBJ/MTL. Reuso
orientado pela skill no-workarounds: algoritmos de leitura de amostras não
dependem da interpretação de materiais nem fingem pertencer a outro formato.

Cinco módulos internos antigos (passes/pixels PNG e frame/markers/tables JPEG)
foram movidos para nomes neutros; seu conteúdo foi preservado na extração.
Pontos glTF de decode/plan/inflate e tipo GltfPngRaster mantêm adapters, agora
chamando o núcleo. Limites de chunks/scans/trabalho/memória JPEG são comuns;
GLTF_INPUT_LIMITS continua expondo os mesmos valores. Sem nova dependência.

O núcleo conserva algoritmos, limites, bytes de entrada/saída, CRC, filtros,
Adam7, amostras 16-bit e classificação de JPEG já verificados. Não interpreta
ICC/gamma/EXIF, animação/APNG, flip vertical ou premultiplicação. A política MTL
explícita de cor continua separada; bytes não são uma promessa de equivalência
ao programa que exibiu a imagem com gerenciamento de cor.

RasterInputError é traduzido uma vez no limite do formato, com reason/path e
cadeia completa de causas. Exceções alheias ao decoder não viram fallback ou
resultado parcial. A mensagem de escolha de profundidade/tipo PNG agora fala
em formato da imagem, não glTF; causas ganham o elo do erro raster compartilhado.
O decoder JPEG ainda mantém seu adapter versionado jpeg-js 0.4.4, sem alterar
classificação de erro de memória ou remover a causa original.

## Planejamento agregado e recursos OBJ

`decodeRasterBatch` consome fontes privadas imutáveis, com keys/paths validados
pelo importador. Iteradores internos são síncronos e não publicam planos ou
abrem IO entre conferência e consumo. Todos os headers/tetos precedem qualquer
decodificação de pixels. No máximo 20.000 entradas e 32 MiB de RGBA selecionado,
contando 16 bits como oito bytes/pixel. O teto não é medição de pico de RAM.

Dispatch usa assinatura, não extensão de arquivo. Todos os MIME hints autorados
precisam conferir, inclusive aliases. Deduplicação usa buffer + offset + length
exatos: caminhos equivalentes são resolvidos antes, mas bytes iguais em outro
intervalo não recebem hash/deduplicação de conteúdo. Rasters são próprios,
compartilhados somente para leitura quando reutilizados. Nada fica em cache
entre chamadas; não transferir/cortar buffers de autoria.

`decodeObjRasters` recebe conjunto completo e referências de biblioteca/material/
propriedade fonte retidas pelo planejamento MTL. Referências são estritas, com
teto de trabalho antes do acesso à fonte (materiais nativos × cinco papéis).
Só mapas podem ser referenciados; índices não são posições de listas filtradas.
Resolve caminho literal relativamente ao MTL, sem URI decode/basename/IO.
Retorna path canônico → raster, pixels e custo. Recurso removido de um conjunto
dito completo é erro, não promessa de documento parcial. Fonte/mapas omitidos
não são decodificados; a seleção vazia nem abre os metadados de bibliotecas.

## Revisão e evidências

Sete testes novos verificam fluxo real seleção/base/mapas → referências →
rasters, percent-encoding literal, bibliotecas distintas, mapas omitidos/sem uso
com bytes inválidos, signature dispatch, PNG16 interlaced, caminho JPEG existente,
ownership, aliases por intervalo, MIME, recursos ausentes, referências inválidas,
memória compartilhada recusada e propagação de exceções. Teste de arquitetura
reprova dependência do núcleo em qualquer importador gltf/obj/mtl.

Quatro PNG16 de 1024² passam exatamente em 32 MiB. Mais um único pixel RGBA8
falha no orçamento antes de abrir um deflate inválido do primeiro PNG. A mesma
fonte, sem o excedente, falha na descompressão: evidencia a ordem do preflight.
Teto de 20.000 fontes aceita aliases com um raster e recusa bytes da entrada
extra antes de lê-los. Os decoders anteriores, inclusive oracles libvips dos
testes existentes, passaram sem afrouxar asserts ou trocar fixtures para ajustar
produção. Dois acessos conhecidos de fixture receberam non-null assertions para
respeitar noUncheckedIndexedAccess; nenhum cast de dados ou supressão.

Regressão inicial dos decoders: 26 passes/5.601 asserts. Focal final de todos os
importadores/core/pureza: 397 passes, 40 arquivos, 39.181 asserts/19,46 s. Tipos
passaram; Biome verificou 879 arquivos. Benchmark normal glTF manteve os três
hashes anteriores e fonte intacta: 16²×1 p50/p95 0,205/0,260 ms; 256²×4,
3,161/7,178 ms; 1024²×8, 78,884/93,846 ms. Não é estudo pareado nem alegação de
melhoria de desempenho/RAM. Integral final: 2.050 passes, zero falhas, 283
arquivos, 8.235.603 asserts/124,85 s. Vite: 1,25 s; worker glTF 181,41 kB
(+0,97 kB) e painel 35,49 kB (+0,14 kB); não é redução de bundle. Aviso Three
permanece. Kids: compilação 6,3 s, tipos 9,1 s, 59 páginas/639 ms. Diff check
passou, somente avisos CRLF antigos em outros CLAUDE.md.

Materialização de mapas/fatores, quantização nativa, orientação de normais,
documento completo, worker, revisão/adoção OBJ e homologação continuam pendentes.
