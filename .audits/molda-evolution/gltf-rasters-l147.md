# JPEG e orçamento de rasters glTF, lote 147

## Contrato

`decodeGltfRasters` recebe recursos próprios da importação e índices explícitos
de imagens selecionadas. Assinatura versus MIME do descritor/Data URI é conferida
mesmo em aliases. Intervalos idênticos do mesmo ArrayBuffer compartilham raster;
bytes iguais em buffers/intervalos distintos não são hash-deduplicados. Imagens
não selecionadas não são abertas. Não há IO, canvas, UI ou cache entre importações.

Todos os cabeçalhos são planejados e seus bytes RGBA somados antes do primeiro
decoder: teto conjunto de 32 MiB, incluindo oito bytes/pixel de PNG16. PNG mantém
samples exatos e JPEG produz RGBA8 próprio, linha zero superior, alpha 255. Mapas
de índices e pixels são próprios; rasters compartilhados são somente leitura por
contrato. Nenhuma conversão de precisão/cor/material nativo acontece aqui.

Planos PNG e JPEG têm consumo interno síncrono, sem callbacks/yields entre
conferência e uso. As funções `*Plan` não são fronteiras para dados arbitrários:
a futura orquestração precisa manter suas fontes privadas e inalteradas. O teto
de bytes codificados continua sendo responsabilidade de `readGltfResources`.

## JPEG

Adicionado jpeg-js 0.4.4 fixado em package/lock, instalação sem scripts. Pacote
BSD-3-Clause, decoder derivado de jpgjs com licença Apache-2.0, conforme README;
nenhuma implementação GPL foi incorporada. API/fontes oficiais e tipos instalados
conferidos. Context7 não encontrou esta biblioteca; não usar o resultado Jpegli.

Preflight próprio de assinatura, framing/EOI, quadro único, dimensões, precisão,
componentes/amostragem, tabelas DQT/DHT e seletores/parâmetros de scans. Suporta
DCT Huffman baseline/extended/progressive de oito bits, cinza e RGB/YCbCr. Outros
modos, CMYK/YCCK e altura diferida não são suportados; isso não é um validador
completo de conformidade JPEG nem uma promessa sobre toda sequência de entropia.

JFIF, Adobe e IDs de componentes determinam RGB versus YCbCr nessa precedência,
comparada com libjpeg. Conversão de componentes não é correção ICC. ICC/EXIF,
comentários, orientação e dimensões físicas não alteram pixels glTF. Não promover
o carregador canvas de referências, cuja orientação/conversão tem outro contrato.

Entrada até 32 MiB, lado até 1.024, 65.536 segmentos, 64 scans e 64 Mi visitas
conservadoras a amostras preenchidas. Codec usa `tolerantDecoding: false`, resolução
explícita e limite aproximado de alocações de 64 MiB. O contador do codec não mede
o pico de RAM: fonte copiada, metadados, overhead de objetos e outros rasters têm
custos separados. Não anunciar desempenho de hardware com base nesses tetos.
Decoder síncrono pertence ao futuro worker; não foi montado na thread da UI.

Erros do codec viram `GltfInputError` com causa preservada. O pacote não expõe
códigos: classificação do limite de memória usa o prefixo da versão fixada e é
coberta por entrada real que excede o contador, sem monkey patch/mocks. Falhar
uma importação não mantém o orçamento consumido para a próxima.

## Review e testes

- JPEGs libvips reais baseline/progressive, gray, 4:4:4/4:2:0 e quadro extended.
  Gradientes 4:4:4 comparados ao libjpeg com tolerância explícita de três níveis
  por canal devido a IDCT/conversão inteiros distintos; não declarar identidade
  pixel a pixel entre codecs. 4:2:0 usa cores constantes para não confundir
  diferenças de interpolação cromática com erro de decodificação.
- RGB por IDs e Adobe0 conferido contra libjpeg, sem dupla conversão YCbCr.
  Metadados EXIF reais e ICC/comentários auxiliares não mudam a saída glTF.
- Dimensões/precisão/modos/tabelas/seletores incorretos recusados. Fronteiras exatas
  de lado, scans/segmentos e contador de memória exercitadas sem mocks do decoder.
- Primeiro PNG com layout/CRC válidos mas pixels comprimidos inválidos, seguido
  por conjunto acima de 32 MiB: orçamento falha antes do primeiro decoder. Exatos
  32 MiB de quatro PNG16 passam. Aliases contam uma vez; 20.000 aliases cobertos.
- GLB JPEG em bufferView e export GLB nativo texturado passam pelo validador e
  pipeline de recursos/rasters; PNG nativo volta aos mesmos bytes. Fontes intactas.
- Durante os testes, corrigidas duas fixtures: truncamento maior que uma tabela
  não a truncava, e ordem de argumentos do encoder PNG estava invertida. Nenhuma
  regra do decoder foi enfraquecida para acomodar essas falhas de teste.

## Evidência

16 testes de domínio e dois de pureza novos. Domínio: 16 passaram, zero falhas,
2.239 expectativas, 1,52 s. Focais: **173 passaram, zero falhas, 15 arquivos,
14.552 expectativas, 4,65 s**. Tipos e Biome/773 passaram. Integral: **1.796 passaram,
zero falhas, 253 arquivos, 8.210.534 expectativas, 93,69 s**. Vite: 962 ms. Kids:
compilação 4,9 s, tipos 7,0 s, 59 páginas em 597 ms. Diff check passou. Aviso de
chunk Three >500 kB permanece. Não homologado em navegador/GPU/toque real.

Fontes: [jpeg-js, API e licenças](https://github.com/jpeg-js/jpeg-js),
[T.81, anexos B/C](https://www.w3.org/Graphics/JPEG/itu-t81.pdf),
[libjpeg, interpretação de cor](https://github.com/libjpeg-turbo/libjpeg-turbo/blob/main/src/jdapimin.c),
[glTF, imagens](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images),
[Sharp](https://sharp.pixelplumbing.com/api-output/).
