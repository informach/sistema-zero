# Envelope regional de dados do Pinta em PNG — 22/11/2026

Base `a3f9747bf`. Preparação privada do envelope de dados Pinta versão 5, com
cena estruturada 4 dentro de um PNG normal. O número 5 pertence aos dados do
Pinta, não a uma nova versão da especificação PNG. O contrato ativo/receitas,
catálogo de capacidades Python, host e galeria continuam nos formatos publicados.

## Fronteira e limites

O leitor `core/studio/pinta-region-image.ts` recebe o JSON descomprimido, de até
16 MiB UTF-8. Reutiliza o leitor de cena 4 e seu teto próprio de 8 MiB, com
chunks/cabeçalhos e sem expandir lacunas. Nome e raiz dos descritores de mundo
devem corresponder à cena. A escala exige uma peça de saída integral e limitada;
o modo de física é explícito. Campos/versões futuros recusam o envelope.
O destino mantém o orçamento anterior de 2.097.152 células/4 MiB de índices,
somados entre raiz e definições. O leitor de cena recebe um teto mais restrito,
sem poder ampliá-lo. Um loader de mundo pode passar somente o orçamento restante;
o futuro loader ainda precisa acumulá-lo entre mapas.

`preparePintaRegionImageData` conserva o wire JSON, mede a indentação e os bytes
antes de criar o texto final e devolve JSON separado da memória decodificada.
`embedPintaRegionImage` usa o encoder de chunks existente: capa PNG estática de
até 4.096 pixels/lado, 4 Mi pixels e 16 MiB no arquivo final. CRCs, integridade,
fim do arquivo e dimensões passam pelo leitor compartilhado. Um PNG que já tem
metadados Pinta é recusado, impedindo duas autoridades diferentes no mesmo arquivo.
O input não é alterado, inclusive na recusa.

O transporte conserva o bloco `iTXt`, palavra-chave `pinta`, texto UTF-8 e zlib
com método 0. O layout foi conferido na [Recomendação PNG do W3C, seção
iTXt](https://www.w3.org/TR/png-3/#11iTXt), consultada em 22/11/2026. Os testes
conferem o layout e preservam os demais bytes da imagem.

O encoder deste lote trabalha com **uma cena** e descritores já fornecidos;
não resolve nem valida os PNGs filhos do mundo. Isso cabe ao loader/adaptador
de mundo a completar. A representação principal continua sendo o documento
autoral, não a capa. O retorno de memória contém arrays tipados: usar o JSON
wire fornecido, nunca serializá-lo como substituto do transporte.

## Revisão e provas

- **3.222 testes completos do Core**, 160.405 asserções, 201 arquivos;
  **2.748 do Pinta**, 35.598 asserções e 255 arquivos, em 262,82 s.
  Sem falhas/omissões, incluindo os três controles Pygame anteriores e o
  novo controle do leitor congelado. **47 focados**, 249 asserções.
- **73 ensaios Chromium sem retry**: 61 da matriz de persistência e 12
  Pinta–Estúdio. Tipos completos Core/Pinta/Estúdio, lint dos oito arquivos
  de código e whitespace aprovados. PNG real inspecionado nesta máquina.
- O produtor legado e o do commit base geram **256 PNGs byte a byte iguais**
  nos envelopes 1–4, com caracteres multibyte, escapes, escalas e flags.
- A revisão reproduziu uma diferença no momento de serializar dados mutáveis
  na primeira refatoração deste lote. O teste falhou antes da correção e passou
  após preservar o ponto assíncrono original da aquisição do encoder. Era um
  achado no trabalho em andamento, não um bug publicado.
- Outra prova negativa detectou que a primeira fronteira PNG herdava o teto
  agregado maior do contrato genérico de cena. Corrigida pela política de destino:
  aceita 4 MiB exatos e recusa a cena de 3.000 chunks antes de qualquer decoder.
  O contrato genérico conserva seu teto próprio; o parâmetro só pode reduzi-lo.
- PNG real é aberto pelo rasterizador nativo e mantém capa/pixels. Dados
  comprimidos reabrem pelo leitor Core 5 e conservam as células wire, flags,
  coordenadas assinadas, propriedades e física.
- Duplicação de metadados, CRC alterado, truncamento, cabeçalhos adversariais de
  tamanho, escala inválida, raízes diferentes e versões futuras são recusados.
  Cabeçalhos de mundo inválidos são recusados antes de decodificar células.
- O módulo Pygame anterior autêntico, congelado em fixture com SHA conferido,
  abre o PNG como imagem e **recusa os dados 5**. Não foi modificado para fingir
  um leitor antigo. Isso não é execução de cena 4 no Pygame novo.
- Dois ensaios Chromium, desktop/CPU 4×, percorrem o produtor real da Vila,
  compositor e encoder. Após fechar a página, outra página abre a imagem e o
  JSON extraído do PNG; pixels 512 × 384 e todas as 18 camadas/duas folhas/conjunto
  permanecem iguais. Os arquivos gerados estão nos recibos.

Ainda faltam os leitores de jogo JavaScript/Python, montagem/carga completa de
mundos PNG 5, capacidades e rollout antes de selecionar esses dados no host.
Não há compatibilidade de gameplay regional, novo aparelho físico, teste com
crianças ou implantação sendo declarados por este lote. Sem mudança visual ou
funcional 3D. Seguir a essas integrações; a missão continua aberta.
