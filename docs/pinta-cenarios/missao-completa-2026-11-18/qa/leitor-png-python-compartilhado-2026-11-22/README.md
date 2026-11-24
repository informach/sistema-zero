# Leitor PNG compartilhado pelo Python — 22/11/2026

Base `d64fe7047`. `pythonPngText.ts` fornece a fronteira de bytes/texto para os
três futuros adaptadores 2D. `capturar_png` conserva bytes imutáveis e confere
assinatura, dimensões, chunks, CRC e fim do arquivo no mesmo perfil estático do
leitor JavaScript existente. `png_da_url` aceita somente data URI PNG canônica;
não busca rede ou arquivos pelo nome. `ler_texto_png` exige um único iTXt Pinta
com os controles nativos suportados, conferindo todos os cabeçalhos antes do zlib.

Os limites vêm do mesmo módulo do escritor/leitor JavaScript: arquivo até
16 MiB, lado até 4.096, 4.194.304 pixels por imagem e texto descomprimido até
16 MiB, com saldo que só pode diminuir. Índices, cenas e pixels agregados do
mundo pertencem às próximas fronteiras. Este módulo não aumenta esses tetos.

## Descompressão e captura

A API de [descompressão do Python](https://docs.python.org/3.12/library/zlib.html#zlib.Decompress.decompress)
permite limitar a saída e inspecionar sobra/fim do fluxo. O leitor usa janelas
de entrada e saída de até 16 KiB; junto ao limite, a saída é saldo + um byte.
Limitar também a entrada evita copiar uma grande sobra comprimida a cada janela
pequena de saída. Não usa `flush` como se seu tamanho inicial fosse um teto.
Exige checksum, fim alcançado, ausência de bytes sobrando e consumo até o fim
do payload capturado; recusa streams concatenados, gzip e deflate sem wrapper.

O UTF-8 é incremental e estrito, inclusive no fim. Remove somente o BOM inicial,
como o TextDecoder do leitor JavaScript; BOM parcial é erro. A captura copia
bytearray/memoryview e conserva offsets. Bytes que já são imutáveis podem ser
reutilizados, sem alias mutável do chamador.

## Provas e revisão

- PNG real do escritor, arte da fixture e texto com emoji conservam todos os
  bytes; zerar o buffer original depois da leitura não altera a captura.
- 24 casos de UTF-8/BOM/janelas/orçamento e dez fluxos zlib são comparados com
  o JavaScript, incluindo o controle positivo que termina exatamente em 16 KiB
  e sua versão com byte extra. UTF-8 malformado/incompleto é recusado.
- CRCs, chunks animados/críticos, duplicata e controles iTXt inválidos recusam
  antes de criar o descompressor. O controle positivo chama o zlib real uma vez.
- Uma expansão de 2 MiB é recusada com saldo de 128 bytes; o teto solicitado ao
  zlib permanece em 129. Entrada pouco compressível de 256 KiB exercita múltiplas
  janelas; a saída inteira conserva seu SHA-256. O spy envolve o zlib real.
- URLs, padding não canônico e limites de dimensões/pixels conferem com o
  perfil existente. Cabeçalhos adversariais não são provas de pixels válidos.
- Entrada acima de 16 MiB é recusada antes de copiar o bytearray: pico rastreado
  abaixo de 64 KiB durante a chamada, com o buffer de entrada já alocado. Isso
  não mede a memória total do processo, decodificação de imagem ou motor.
- Os processos CPython recusam imports de motores gráficos; nenhum deles é
  substituído por um mock. Não são provas de execução de jogos nas extensões.

- 17 testes focados, 71 asserções, dois arquivos e 2,03 s, sem omissões/falhas.
- Pinta completo: 2.790 testes, 37.414 asserções, 261 arquivos e 254,38 s,
  sem omissões/falhas, incluindo quatro controles Pygame reais existentes.
  Executado sem outro job de testes desta sessão; não é medição de desempenho.
- Quatro controles Chromium sem retry/omissão/falha, desktop e CPU 4×, do
  leitor JavaScript e transporte regional existentes: reabertura da Vila/Cabana
  e igualdade de pixels conservadas. Não carregam o novo módulo num runtime
  Python do navegador nem executam seus futuros adaptadores gráficos.
- Tipos completos Pinta, lint dos dois fontes, whitespace e verificadores
  oficiais Python/JavaScript aprovados. Nenhum fonte Core/Estúdio mudou neste
  lote: Core 3.252 e as 12 integrações pertencem a `d64fe7047`; tipos completos
  Estúdio pertencem a `75fd6db9d`. Não são repetidos ou somados como testes novos.
- CPython 3.12.10, AMD64, zlib compilado/runtime 1.3.1. Não foram testados outro
  aparelho físico, sessão com crianças ou motor externo novo neste lote.

`index.json` registra 11 recibos comprimidos e os hashes dos dois fontes.

## Alcance

CRC, estrutura e texto não validam IDAT/pixels. O módulo não interpreta o JSON
autoral, não monta o registro de mapas ligados e não aloca superfícies. Cenas
usam o leitor comum do lote anterior; mundos e os adaptadores ainda precisam
ser integrados e qualificados. Os formatos e receitas públicos, blocos, áreas,
recibos e versão única do motor permanecem inalterados.

Não houve mudança visual, alteração funcional 3D, implantação ou merge em
staging. As provas externas dos formatos anteriores não homologam este leitor
como suporte regional completo em Pygame-ce, Pygame Zero ou Raylib 2D.
