# Integração da proteção de ancestrais no laboratório v4

Origem da integração: `74105f9e7`, sobre `1bf33eeca`. O laboratório continua separado da PR273 e mantém escrita padrão v3.

Foram preservados o replay v3→v4, os recibos/validação v1/v2, leitura fria separada, preparo físico antes do CAS e os ensaios nativos de 10.000 registros. A nova validação de ancestrais recebe a versão do destino; arquivos v4 usam o namespace de backups v4. Os codecs de grafo existentes são reutilizados.

Espelhos v3 brutos continuam sob autoridade do adaptador que os arquiva antes de projetar/reconhecer. Um token coincidente não transforma o espelho v3 em origem nativa v4. Quatro testes novos cobrem ancestral suportado/futuro em ambos os namespaces; o teste v4 prepara o transporte pela leitura real antes de solicitar gravação síncrona, conforme o contrato do produto.

Verificação local:

- 538 testes / 2.832 asserções, 77 arquivos, zero falhas, 46,65 s; inclui Chromium/WebKit, recargas, conflito entre abas, ancestral profundo e qualificadores anteriores de migração profunda.
- 119 testes de exportação / 601 asserções aprovados, incluindo o servidor Python sem DNS reverso.
- Orçamento inicial: 366660 bytes brutos / 119679 gzip, 35 asserções aprovadas, limites mantidos.
- Correções de tipos nos testes/retorno físico foram feitas sem alterar comportamento ou reduzir limites. Typecheck completo final aprovado, assim como Biome e verificação de whitespace.

Ainda faltam integração de bases/lista/carregadores, ativação experimental e homologação completa do fluxo v4. Esta integração não fecha R1/R2 ou a missão global.
