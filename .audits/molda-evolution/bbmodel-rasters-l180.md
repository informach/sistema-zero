# Pixels bbmodel, lote 180

## Escopo e arquitetura

Adapter próprio entre o resultado ready de recursos e o núcleo raster comum
PNG/JPEG. Consome o resultado privado inalterado, sem protocolo externo novo,
IO, canvas ou dependência de outro importador. Os testes também comparam glTF
para regressão, mas produção importa apenas o núcleo neutro.

Map liga índice original da textura ao raster; várias texturas com mesmo recurso
compartilham pixels readonly. Iterador entrega cada recurso uma vez, portanto
20.001 bindings para uma imagem não confundem limite de texturas de entrada com
limite de imagens nativas. Paths distintos continuam recursos próprios; nenhum
hash/deep compare ou cache global foi introduzido.

Headers de todos os recursos únicos, MIME embutido e teto de 32 MiB RGBA são
conferidos antes de qualquer descompressão. PNG 16 bits conta oito bytes por
pixel. Dimensões cached e UV do bbmodel não autorizam alocação: somente header
real, com até 1.024 pixels por lado. Extensão de arquivo não escolhe decoder.

Saída preserva valores PNG 8/16 bits, RGB sob alpha zero e ordem das linhas.
Não compõe camadas, interpreta frames, converte cor/ICC/gamma/EXIF, inverte UV/
pixels ou premultiplica alpha. Resultado não equivale a material nativo nem
aprova aparência Blockbench. Esses estágios permanecem posteriores.

Erros adaptam somente RasterInputError, conservando reason/path/message/cause.
Embedded aponta source da primeira textura escolhida; arquivos apontam caminho
literal escapado. Erros inesperados propagam, sem imagem substituta/parcial.

## Review e evidências finais

Revisados ownership, ordem/dedup, limites agregados, proveniência e ausência de
inferência por metadados. Testes passam pelo envelope/appearance/resources reais
nas três versões; incluem PNG Adam7 de 16 bits, JPEG progressivo com comparação
libvips, erro de CRC/MIME, extensão enganosa, limite exato de 32 MiB e excesso
detectado antes de um stream anterior deliberadamente inválido ser decodificado.

Focal: 93 passes, zero falhas, 1.147 asserts, quatro arquivos, 3,29 s.
Tipos e Biome 958 arquivos passaram. Integral: **2.190 passes, zero falhas,
302 arquivos, 8.239.395 asserts, 147,99 s**, exit 0. Vite 1,49 s com chunks
mantidos (glTF 182,26 kB, OBJ 157,14 kB, Three 579,29 kB/aviso >500 kB).
Kids exit 0: compilação 6,3 s, tipos 11,1 s, 59 páginas em 813 ms. Diff check
passou com os três avisos CRLF prévios. Sem benchmark novo ou ganho CPU/RAM
alegado. Sem nova dependência, UI bbmodel, ativação pública ou homologação
GPU/toque/crianças.
