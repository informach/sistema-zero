# Backup regional interno — 21/11/2026

Base: `45bee622ecfac73da7bbfd47cfdcff0a94e1cb35`. Este lote prepara o contêiner
nativo 8; não o expõe na oficina, no importador público, na nuvem ou no Estúdio.
Nativo público 7, físico 2, cena 3/PNG 4 e nuvem 6 permanecem ativos.

## Implementação e revisão

O encoder regional aceita o serializador de recursos existente. O backup usa
o mesmo RLE dos bitmaps e os chunks little endian/base64 do Core; o transporte
mantém seu padrão anterior. Cabeçalho, indentação e fragmentos de galeria são
compartilhados com o gravador legado, sem manter outra definição de arquivo.
O módulo interno `export/regionBackup.ts` escreve e restaura mapas, conjuntos
e artes legadas no contêiner 8. Um registro inválido recusa o restauro inteiro.

`JsonByteSizeCache` mede exatamente o JSON com indentação de dois espaços, em
UTF-8, sem gerar seu texto. Guarda resumos numéricos por identidade imutável;
referências repetidas somam novamente bytes e indentação. Cobre escapes,
surrogates isolados, caracteres multibyte, campos opcionais e profundidade.
O contêiner é medido antes de montar a string final; leitura confere os 32 MiB
antes do parse. Não confundir bytes UTF-8 com unidades UTF-16 de metadados.

A revisão reproduziu perda de um campo futuro dentro do bitmap: o decoder
antigo o retirava antes da validação do mapa. A política estrita do contêiner
novo confere os campos do bitmap e recusa o arquivo; os leitores 0–7 mantêm
sua política. O default do transporte também conserva seus valores anteriores.

Outra reprodução expandia um arquivo compacto em 129 mapas/bitmaps, acima de
32 MiB de buffers. O formato 8 recebe orçamento **independente de 32 MiB de
buffers decodificados por restauro**, além dos 32 MiB do texto do arquivo.
É decisão conservadora de trabalho para o formato ainda interno, sem aumentar
os tetos existentes. Uma passagem por cabeçalhos soma bitmaps, grades densas e
chunks antes do primeiro decoder; o gravador aplica a mesma regra. Cada cópia
conta, mesmo se o asset original compartilha um buffer. Não é limite por
quantidade de desenhos nem afirmação de heap total de 32 MiB. Parse, metadados,
strings e estruturas do JavaScript têm custos adicionais; não há streaming de
JSON neste lote. A galeria e os backups 0–7 não recebem essa política nova.

## Verificações e alcance

- Suíte final: **2.665 aprovados, zero falhas/omissões**, 35.032 asserções em
  243 arquivos, 174,17 s. A rodada anterior à proteção de expansão, com 2.663
  aprovados, também está arquivada; não substitui a validação da correção final.
- Focados: **46 aprovados**, 265 asserções em sete arquivos. Inclui o mundo de
  100 milhões de casas com duas regiões, documento de 4 MiB de índices,
  arte incorporada em RLE, conjuntos, corrupção, formatos futuros, Unicode,
  orçamento exato e conservação dos backups anteriores.
- Chromium: **18 ensaios aprovados, sem retry**. Os três perfis do laboratório
  (desktop, toque e CPU 4×) conservam oito arquivos legados byte a byte, fazem
  192 comparações de tamanho JSON e restauram o mapa de 4 MiB de índices em um
  backup de 5.834.543 bytes. O mundo esparso com arte incorporada e um sprite
  legado mede exatamente 8.389 bytes. Inclui ainda três percursos da oficina
  com CSS/IndexedDB reais e 12 da integração local Pinta–Estúdio.
- Tipos completos do Pinta/Estúdio, lint de 13 arquivos e whitespace aprovados.
- As reproduções vermelhas demonstram callback de recursos ignorado, campo
  futuro de bitmap perdido e expansão em 129 documentos. A primeira execução
  da expansão também atingiu o timeout padrão; foi repetida como controle
  negativo com `--timeout 30000`, confirmando 129 documentos aceitos. Os testes
  corrigidos e a suíte final usam o timeout padrão, sem ampliar sua tolerância.
- Rodada inicial teve quatro recusas da fixture por nome de arte não canônico.
  A fixture passou a usar nome aceito pela política legada; não foi alterado o
  normalizador do produto. Esse log intermediário não foi conservado; a causa
  e a limitação do registro constam no índice.

Os recibos finais, hashes e resultados de navegador/tipos estão em `index.json`.
Os controles gráficos do Pygame na suíte usam superfícies reais e vídeo `dummy`;
não são teste em outro dispositivo. O laboratório do backup regional exercita
o codec real; os percursos da oficina/Estúdio usam os formatos públicos atuais.

## Continuação

O medidor trabalha sobre a forma efetivamente serializada. Ainda é necessário
integrá-lo antes do histórico/autosave preservando as identidades autorais,
sem executar o encoder completo em cada movimento. Protocolos físico 3,
transporte/nuvem novos, cena 4/PNG 5 e seus consumidores precedem a promoção
pública. Nenhuma etapa macro da missão é fechada por este contêiner interno.
