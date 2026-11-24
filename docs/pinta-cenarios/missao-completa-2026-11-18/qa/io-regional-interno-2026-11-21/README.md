# IO regional interno — 21/11/2026

Base: `729021df2c27b55020e21705d2465a75486490a5`.

## Implementação e revisão

O protocolo físico 3 foi preparado como política explícita do IO transacional
existente. O caminho público continua usando a política densa 1/2. Não há outro
banco, histórico ou editor, nem mudança visual. Um cabeçalho 3 guarda metadados
nativos 8 e referências de chunks; os buffers de 32×32 ficam em chaves próprias,
sob o mesmo dono/camada e na mesma transação IndexedDB.

O Core oferece admissão de localizações sem ler células. Metadados, orçamento
global de 2.048 chunks, extensão, duplicatas e propriedade das chaves são
conferidos antes das requisições de buffers. Decodificação recusa partes ausentes,
vazias, inválidas ou preenchidas fora da extensão; não cai no espelho legado.
Recursos incorporados, conjuntos, coordenadas assinadas/fracionárias, IDs e selo
de isolamento são conservados. IDs legados não representáveis ficam inline,
protegidos pela capacidade 8; nunca são encurtados.

A comparação exata reaproveita buffers inalterados do snapshot físico. O diff
existente grava cabeçalho/chunks alterados e coleta somente as chaves removidas
daquele documento. Falha após enfileirar um chunk aborta tudo. Esta política é
injetada por transação, com o leitor anterior como padrão; nenhum escritor público
ou constante de capacidade foi promovido.

O laboratório chama o codec e o IO reais com um planejador interno. Não é prova
de edição pública 8, CAS autoral 8, quota de galeria regional ou implementação
de seu espelho de compatibilidade. Esses consumidores permanecem no item 4 do
plano, junto de transporte e adaptadores. A abertura atual deste IO ainda lê todos
os chunks do documento: carregamento sob demanda não foi demonstrado.

## Provas e limites

O cenário esparso de 10.000×10.000 casas lógicas contém somente dois buffers
(4.096 bytes de índices). O caso denso máximo contém 32 camadas e 2.048 chunks,
somando 4 MiB. Uma célula alterada reutiliza 2.047 buffers; o teste de IO verifica
dois puts: cabeçalho e chunk. Esses números são contadores de trabalho/buffers,
não métricas de heap total ou uma garantia de fluidez.

- Suíte final: **2.699 aprovados, zero falhas/omissões**, 35.208 asserções,
  248 arquivos, 178,52 s; três controles reais Pygame com vídeo `dummy`.
- Focados: **43 aprovados**, 190 asserções, três arquivos; inclui as oito
  transformações de peças e auditoria de acessos. Core: **15 aprovados**,
  69 asserções do contrato regional.
- Chromium: **29 aprovados, sem retry**. Oito provas do protocolo interno em
  desktop/CPU 4×, mais 21 controles anteriores de autoridade/chunks. Um contexto
  independente reabre as regiões e salva um chunk; o leitor público 7 recusa o
  protocolo 3 e conserva sua RAM antiga em cópia. O teto de 32 camadas/4 MiB é
  exercitado com o IO real nos dois perfis.
- Tipos completos de Pinta/Estúdio, lint dos dez arquivos e whitespace aprovados.

As primeiras fixtures tinham um ID com `:`, já recusado pelo contrato nativo,
e uma referência de teste removida durante a limpeza. Foram corrigidas sem
relaxar validação. Esses logs intermediários não foram conservados. A primeira
inicialização do Playwright via Bun terminou com código nativo `-1073740791`,
antes de executar testes, deixando seu servidor filho ativo. O diagnóstico
confirmou a porta ocupada; apenas esse processo da tarefa foi encerrado. O
mesmo CLI Playwright foi executado diretamente com Node, com seus retries em
zero. Recibos da falha de inicialização e do diagnóstico são preservados.

A primeira suíte completa teve 2.697 aprovações e uma falha da auditoria de
acessos a células. O novo leitor foi revisado e registrado como comparação e
transporte de células inteiras, sem decodificação manual; o guarda e a lista de
pendências vazia foram conservados. Foi acrescentado o round-trip das oito
transformações da peça e a suíte inteira foi repetida. O log anterior é preservado.

O perfil de CPU 4× usa CDP também na aba reaberta; é emulação nesta máquina.
Sem nova homologação autenticada, dispositivo físico adicional, teste infantil
ou compatibilidade externa do formato 8 neste lote. Os formatos públicos seguem
nativo 7, físico 2, cena 3/PNG 4 e nuvem 6. Nenhuma fonte funcional 3D alterada.
