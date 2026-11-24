# Leitor dos PNGs de mundos regionais — 22/11/2026

Base `5cb6631e7`. `readPintaPngText` captura bytes próprios, confere CRC,
estrutura estática e limites com o leitor PNG existente, localiza um único
iTXt Pinta e extrai seu texto com saída limitada. `readPintaRegionImageWorld`
usa essa extração e a admissão Core para montar o registro completo dos mapas,
capturando os PNGs dos destinos e recursos. Só aceita imagens inline canônicas;
não busca rede ou arquivos pelo nome da porta.

O orçamento continua o mesmo: arquivo PNG até 16 MiB, lado até 4.096 e
4.194.304 pixels por imagem; mundo com 16 mapas, 16 MiB de texto descomprimido,
4 MiB de índices e 16.777.216 pixels agregados. Todas as capas contam. Cada URL
de recurso conta uma vez, pela maior área entre a fonte e sua escala de saída.
As folhas precisam comportar suas peças; as artes precisam coincidir com seus
cabeçalhos PNG. Os limites do escritor e do leitor agora vêm do mesmo módulo.

## Revisão e verificações

O probe do descompressor nativo em Bun 1.3.11 aceitou bytes extras no fim de
um fluxo. O leitor utiliza a API pública de baixo nível do pako 3.0.1, com
buffers de saída explícitos de até 16 KiB e saldo + um byte junto ao limite.
Confere checksum e consumo completo da entrada, recusando padding, streams
concatenados, checksum falsificado, truncamento, gzip e deflate sem wrapper.
A interpretação de zlib segue os contratos [PNG iTXt](https://www.w3.org/TR/png-3/#11iTXt)
e [Compression Standard](https://compression.spec.whatwg.org/#supported-formats).
O texto é UTF-8 estrito, inclusive entre buffers, sem substituição silenciosa.

Pako 3.0.1 já estava resolvido e instalado no repositório. Foi acrescentado
somente seu vínculo ao Pinta, com licença MIT/Zlib; uma linha no lockfile, sem
atualizar outras versões. A instalação congelada confere. Nenhum fonte funcional
do Molda foi alterado.

A revisão reproduziu e corrigiu dois erros da primeira implementação privada:
ela começava a descomprimir antes de encontrar um segundo iTXt Pinta; e
`Buffer.slice()` podia compartilhar a origem. Agora todos os cabeçalhos são
conferidos antes do texto, e a cópia usa um Uint8Array próprio, com offset zero.
Os testes falham nas duas implementações anteriores e passam após as correções.

- 25 testes focados, 119 asserções: arquivos reais, limites UTF-8 exatos,
  expansão de 2 MiB recusada pelo saldo de 128 bytes, corrupção e recursos.
- Dois mapas compartilham o mesmo recurso sem dupla contagem. Recursos
  distintos e capas ligadas exercitam o teto global; uma capa inválida recusa
  antes das células. Erros de extração conservam sua causa/mensagem.
- 2.766 testes completos Pinta, 35.691 asserções, 257 arquivos, 223,74 s,
  sem falhas/omissões. Rodou isolado, incluindo quatro controles reais Pygame.
- 79 ensaios Chromium sem retry: 67 regionais/persistência e 12 Pinta–Estúdio.
  Os quatro focados estão incluídos nessa matriz, não são somados novamente.
- Vila e Cabana reabrem seus PNGs em outra página. As imagens capturadas são
  decodificadas pelo navegador e recompostas: os 512 × 384 pixels da Vila são
  idênticos à capa original, com IDs, destinos e início preservados. Corrupção
  posterior não altera o registro já admitido. Desktop e CPU 4× nesta máquina.
- Tipos completos Core/Pinta/Estúdio, lint dos nove arquivos, whitespace e
  verificadores oficiais JavaScript/Python aprovados. Catálogos e versão do
  motor Python não foram alterados.

Core (3.251) e Phaser (dez ensaios) são evidências carregadas das bases indicadas
no índice; não foram repetidos neste lote. O código portátil não mudou.

## Fronteiras seguintes

O resultado contém dados e bytes admitidos, não superfícies de jogo. A
interpretação do IDAT e os buffers temporários dos compositores são dos
adaptadores. A prova decodifica arquivos reais nas ferramentas indicadas;
este leitor não se apresenta como decodificador geral de pixels PNG.

Ainda faltam gameplay regional nos motores JavaScript, base Python independente
do motor e adaptadores completos de Pygame, Pygame Zero e Raylib 2D, incluindo
atualização/publicação e qualificação coordenada do runtime. Também continuam
as demais etapas macro, IO sob demanda e barreira de nuvem com inventário parcial.
Os formatos regionais seguem internos. Sem mudança visual, implantação ou merge
em staging. O acordo de áreas/catálogos e a geração única do motor Python estão
registrados no plano da missão.
