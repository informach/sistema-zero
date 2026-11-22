# Admissão dos metadados de mundos regionais — 22/11/2026

Base `207b521f6`. Os leitores privados de cena 4 e dados PNG 5 agora separam
admissão de cabeçalhos/referências da decodificação das células. Os planos
congelados conservam seu JSON privado e permitem uma tentativa de `decode`.
Os leitores anteriores continuam fazendo ambas as fases em uma chamada.
Não houve mudança das versões ou capacidades publicadas.

`readPintaRegionImageWorldMetadata` admite a lista inteira antes de decodificar
o primeiro chunk. Confere IDs, nomes, escala, ausência de mundo aninhado e os
orçamentos cumulativos existentes: 16 MiB de metadados descomprimidos e 4 MiB
de índices. O resolvedor recebe o descritor capturado e o saldo de texto.
O registro só é devolvido após todas as cenas passarem; uma carga inválida
no último mapa não devolve os mapas anteriores como resultado parcial.

## Revisão e provas

- O leitor privado anterior recusava corretamente uma referência inexistente,
  mas decodificava seu chunk antes de conferir essa referência. Probe com
  controle positivo registra uma decodificação antes e zero depois. Não era
  perda de dados ou defeito em jogos publicados.
- A mesma validação semântica compartilhada é aplicada antes dos payloads,
  incluindo árvores, referências, recursos, animações e modo de física. Após
  a admissão restam somente codec e valores/índices das células; não há outro
  sanitizador paralelo nem alteração dos contratos anteriores.
- Dez testes novos: snapshots imutáveis, consumo único, erro no payload,
  metadados de destino incorretos, resolvedor interrompido, mundo aninhado,
  duplicatas e recusa atômica. O limite de 4 MiB é exercitado na soma de dois
  mapas de 2 MiB e recusado ao ultrapassá-lo; o teto de texto também é agregado.
- 26 testes focados, 165 asserções; 3.251 completos Core, 211.088 asserções,
  204 arquivos; 2.748 completos Pinta, 35.617 asserções, 255 arquivos,
  216,21 s. Sem falhas/omissões. O Pinta rodou isolado, com os quatro controles
  reais de Pygame.
- 144 comparações com os leitores da base: 16 leituras aceitas e 128 recusas,
  com os mesmos resultados JSON. A ordem de admissão mudou, não os dados aceitos.
- 77 ensaios Chromium sem retry: 65 regionais/persistência e 12 Pinta–Estúdio,
  incluindo atualização Python sem apagar o programa. Tipos completos dos
  três pacotes, lint dos cinco arquivos e verificadores oficiais dos gerados
  JavaScript/Python aprovados.
- Vila e Cabana produzidas em PNG 5 real reabrem em outra página. Os cabeçalhos
  precedem os chunks, os seis IDs autorais permanecem e o início da Cabana é
  conservado. Trocar o nome de um destino recusa o mundo com zero chunks
  decodificados. Desktop e CPU 4× na mesma máquina; não é outro aparelho.

A primeira expectativa do ensaio exigia mais de seis objetos. A fixture tem
exatamente seis, conferidos no código autoral; a prova agora compara a lista
exata dos IDs. Não houve mudança no consumidor para acomodar a expectativa.
Os dez ensaios Phaser pertencem à base, cujo código portátil não mudou neste
lote; não são uma nova execução nem validação de regiões nesse motor.

## Fronteira ainda pendente

Este módulo recebe texto **já extraído** do PNG. O resolvedor de produto ainda
precisa limitar a descompressão, conferir CRC/formato e capturar os bytes das
imagens. Também faltam orçamento de pixels/superfícies e os adaptadores de
runtime. O extrator simples do ensaio só lê os arquivos que a própria fixture
acabou de gerar; não é implementação de importação de arquivos desconhecidos.

Não é loader PNG 5 completo, gameplay regional Python/JavaScript, ativação no
host ou homologação de um mundo regional publicado. Nativo 8 e os demais
formatos novos continuam internos. Seguir à leitura limitada dos PNGs, à
conferência das imagens e aos runtimes, incluindo Python/Pygame e suas extensões.
Sem alteração visual, funcional 3D, implantação ou merge em staging.
