# Pixels PNG para glTF, lote 146

## Contrato

Decoder PNG puro de uma imagem, com saída RGBA própria de 8 ou 16 bits. Origem
superior esquerda, RGB não premultiplicado inclusive sob alpha zero. Grayscale
sub-byte expande exatamente para 8 bits; RGB/gray/alpha de 16 bits permanece
Uint16Array, sem redução escondida. O conversor nativo ainda precisa escolher e
relatar a eventual redução de precisão. Não há correção ICC/gamma, orientação
EXIF, dimensão física, texto ou reprodução APNG; glTF usa os pixels estáticos.

Planejamento confere assinatura, IHDR, dimensões, tipos/profundidades, chunks e
CRC, ordem de PLTE/tRNS/IDAT/IEND, paleta e transparência. Planos retêm views
temporárias da entrada, não são documentos persistentes. Pixels só são alocados
após esse preflight. Cinco filtros trabalham por byte; Adam7 calcula passagens
vazias sem filtros fictícios. Índice fora da paleta é erro, não pixel transparente.

Teto de 32 MiB da fonte, 1.024 pixels por lado e 65.536 chunks. Uma imagem máxima
de 16 bits gera até 8 MiB de RGBA, além do armazenamento filtrado e do decoder.
Isto não é o orçamento agregado da cena nem uma medição de pico de RAM/browser.
O importador completo terá de planejar todos os rasters antes de decodificá-los.

## Escolha do descompressor

Adicionado Pako 3.0.1, fixado em package/lock, MIT AND Zlib, com tipos próprios.
Instalação sem scripts; alterações anteriores de package/lock foram preservadas.
Fflate continua no export existente. Context7 não encontrou fast-png/jpeg-js;
consulta seguiu nos repositórios oficiais. Fflate, Pako e Sharp tiveram documentação
consultada pelo Context7 e fonte/API pertinente inspecionada.

Fflate streaming cresce a saída internamente; seu `out` síncrono pode truncar,
portanto não oferece sozinho a interrupção de expansão exigida. Fast-png também
infla ICC e acumula saída antes de conferir pixels. Não usar nenhum deles com
limite somente depois de descomprimir.

Pako recebe windowBits 15 (somente zlib) e blocos de saída de 16 KiB; callback
confere teto antes de copiar cada bloco. Saída não é acumulada na lista padrão.
CRC PNG e Adler32 zlib são conferidos; truncamento/expansão a mais ou a menos são
erros. `ended` permite ignorar trailing bytes, inclusive um aparente segundo
stream, conforme PNG. Não depende de campos privados nem de modificações no vendor.

## Review e testes

- 150 combinações de tipo/profundidade/filtro/interlace comparadas amostra a
  amostra com libvips/Sharp; 1.215 retângulos pequenos verificam passagens vazias
  e padding sub-byte. Encoder de fixture enumera a matriz de transmissão Adam7,
  não os offsets/steps do decoder, e filtro Paeth usa seleção independente.
- PNGs produzidos pelo libvips com filtros adaptativos/paleta/interlace têm saída
  igual à do libvips. PNGs de GLB real voltam aos bytes do encoder nativo.
- tRNS de RGB 1×1, correspondência exata de 16 bits, máscara de bits altos de
  grayscale sub-byte, alpha de paleta incompleta e RGB sob alpha zero cobertos.
- IDAT pode ter zero bytes e cortar qualquer parte do zlib, inclusive checksum.
  Corromper Adler e recalcular CRC ainda falha. Gzip não é aceito no lugar de zlib.
- Expansão de 4 MiB declarada como cinco bytes falha no primeiro recurso antes
  de ler o próximo; sem mock do decoder. Fronteira exata 1024² RGBA16 coberta.
- Chunks auxiliares ficam inertes: inclusive payload comprimido inválido de ICC/
  texto/APNG não é aberto. Isso não é validação das extensões desses metadados.
- Sem mudanças no encoder/export, pixels autorais, formato público ou UI. Testes
  não homologam GPU, navegador ou usabilidade; worker/importação completa pendentes.

## Evidência

10 testes de domínio e um de pureza novos. Teste PNG: 10 passaram, zero falhas,
3.362 expectativas, 1,303 s. Focais: 155 passaram, zero falhas, 13 arquivos,
12.307 expectativas, 3,43 s. Tipos e Biome/764 (incluindo package.json) passaram.
Integral: **1.778 passaram, zero falhas, 251 arquivos, 8.208.288 expectativas,
90,24 s**. Vite: 820 ms. Kids: compilação 5,9 s, tipos 7,5 s, 59 páginas em
631 ms. Diff check passou. Aviso de chunk Three >500 kB permanece.

Fontes: [PNG 3, §§7–11 e 13](https://www.w3.org/TR/png-3/),
[glTF 2.0, §3.8.3](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html),
[Pako Inflate](https://github.com/nodeca/pako/blob/master/src/inflate.ts),
[Fflate](https://github.com/101arrowz/fflate/blob/master/src/index.ts),
[Fast-png](https://github.com/image-js/fast-png/blob/main/src/png_decoder.ts),
[Sharp](https://sharp.pixelplumbing.com/api-output/).
