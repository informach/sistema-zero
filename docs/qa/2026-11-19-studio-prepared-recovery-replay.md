# Replay de recuperações preparadas

Base integrada do laboratório: `7fe761fb9`, com snapshot remoto `613404239` e correções de armazenamento da branch da missão. Sem merge em staging/main.

O replay existente agora aceita entradas preparadas e uma função de confirmação fora do payload persistido. Não há segundo motor de recuperação, fila, banco, escritor ou token. A interface é interna: permite projetar partições antigas mantendo os bytes originais exclusivamente para reconhecer a fonte correta após confirmação.

A comparação usa o snapshot completo, não a igualdade entre bytes da fonte antiga e payload projetado. O comparador iterativo de migração é reutilizado. O agrupamento de revisões usa o codec de grafo completo; a quota síncrona de saída continua em 2 milhões de caracteres e não é aplicada artificialmente a snapshots nativos já persistidos.

## Evidência nova

- Teste vermelho: o replay ignorava as entradas preparadas e não chamava sua confirmação (`projected-replay-red.txt`).
- 25 testes de recuperação / 100 asserções aprovados, incluindo confirmação somente após escrita, confirmação indisponível seguida de repetição e transação de destino abortada sem reconhecimento da fonte.
- A primeira tentativa de injetar aborto pelo wrapper UseStore não atingia conexões já aquecidas. O teste foi corrigido para abortar a transação na conexão real do fake-indexeddb e exige a marca de injeção; nenhuma mudança no produto foi feita para facilitar esse teste.
- Suíte ampliada: 502 testes / 2.650 asserções / 76 arquivos, 50,48 s, zero falhas (`STUDIO_STORAGE_DEEP=1`, `STUDIO_STORAGE_EXIT_FAULT=abort`).
- Typecheck completo: saída 0 (`projected-replay-typecheck.txt`).
- Guarda de bundle/grafo: 1 teste / 35 asserções; 366.011 bytes brutos / 119.387 gzip; limites originais mantidos (`projected-replay-bundle.json`).

Logs locais ignorados em `.cache/mission`.

## Limite

O padrão continua v3. O novo contrato não conecta sozinho os journals v3 ao leitor v4 e não confirma que um projeto de 10.000 blocos possa ser editado responsivamente. Coleta das fontes, promoção/ack exatos, carregadores e ativação continuam sendo gates bloqueantes. Estes testes determinísticos não substituem ensaio nativo de recarga e compatibilidade.
