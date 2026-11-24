# JSON antes do histórico — 21/11/2026

Base: `af40b707c371decd2eb8ac95b671f8987fe4f9e0`. O formato 8 continua interno.
Oficina pública 7, físico local 2, cena 3/PNG 4 e nuvem 6 permanecem ativos.
Nenhuma identidade visual ou funcionalidade 3D foi alterada.

## Correção

O store aceitava texto que cabia no limite de metadados, mas ultrapassava os
32 MiB do arquivo JSON após escapes. Também aceitava lotes ligados que cabiam
por documento e excediam o total, ou que expandiriam mais de 32 MiB de buffers.
As três reproduções foram corrigidas antes de chamar o host, criar histórico
ou agendar autosave. A checagem abrange o snapshot inteiro que será persistido,
incluindo os ligados pendentes, o estado anterior necessário ao undo, gestos,
substituições, abertura e recuperação. O timestamp definitivo entra na conta.

`RegionBackupSizeCache` adapta o medidor numérico à representação do encoder
real. O Core fornece o cabeçalho e os chunks codificados; artes usam o RLE
existente. O cache retém números por identidade dos objetos autorais imutáveis,
sem guardar as strings codificadas ou referências ao mapa através de closures
dos chunks. Um chunk compartilhado reaproveita seu resumo; cada ocorrência
continua somada ao tamanho do arquivo. O cache é criado sob demanda no editor.

O contrato é de **revisões canônicas imutáveis**, produzidas pelos leitores e
operações do Core. Este medidor não substitui validação semântica de entrada
desconhecida. Descritores/orçamentos globais precedem o encoder de payload.
A revisão reproduziu um getter executado antes da recusa de um campo futuro;
o Core agora confere o descritor e o buffer fixo antes da leitura por `cellTile`.
O novo leitor também foi registrado na auditoria de acessos, sem relaxar seu
guarda ou listar pendências de decodificação manual.

O orçamento de JSON/buffers se aplica ao documento regional e ao lote completo
de persistência ligado ao editor. A quota da galeria inteira, inclusive itens
fora desse snapshot, continua pertencendo ao inventário/host e à transação de
persistência. A integração regional desses componentes permanece no plano.
Lotes exclusivamente 0–7 mantêm sua política anterior.

## Evidências

- Suíte final: **2.678 aprovados, zero falhas/omissões**, 35.098 asserções,
  245 arquivos, 178,73 s. Os três controles Pygame reais usam vídeo `dummy`.
- Focados: **48 aprovados**, 289 asserções, seis arquivos. Inclui acordo com
  o arquivo real, conjunto/arte/Unicode, limites, máscaras de células, recusa
  global, timestamp, uma transação válida com undo/redo e política legada.
- Chromium: **48 ensaios aprovados, sem retry**: três perfis do laboratório,
  33 percursos completos da oficina e 12 da integração local Pinta–Estúdio.
  A versão histórica aceita quatro propostas excessivas e chama persistência;
  a atual recusa todas sem host, dirty ou histórico. Controle válido conservado.
- **192 comparações** de tamanho contra UTF-8 do backup real, com flags,
  deslocamentos fracionários e Unicode. No documento de 2.048 chunks com arte
  incorporada, a edição de uma célula codifica **um chunk**; os demais 2.047 e
  o RLE da arte reutilizam resumos. Expansão reutiliza a grade inteira.
- Fixture exatamente no limite de 32 MiB: o timestamp que aumentaria o arquivo
  provoca recusa antes do host. O oráculo usa o texto efetivamente exportado.
- Tipos completos do Pinta/Estúdio, lint dos 15 arquivos e whitespace aprovados.

A primeira suíte teve 2.677 aprovados e uma falha do inventário de leitores de
células. O acesso foi revisado/registrado e a suíte inteira repetida; esse log
também fica arquivado. Os erros iniciais de tipos eram duas comparações com
kinds excluídos pelo tipo de recursos, removidas sem ampliar a união pública.

Persistência regional no laboratório é **injetada**, sobre o store/encoder
reais; não é prova de IndexedDB físico 3 ou edição pública 8. Oficina e Estúdio
exercitam os formatos públicos existentes. Toque/CPU são emulados nesta mesma
máquina. Os contadores de trabalho não constituem SLA de latência ou heap.
Hashes, recibos e controles históricos estão em `index.json`.

## Próximos componentes

Protocolo físico 3, backup/transporte públicos, leitores de cena 4/PNG 5,
proteção de dependentes entre clientes antigos/novos e inventário parcial,
rollout e ciclo final continuam pendentes. Nenhuma etapa macro é fechada aqui.
