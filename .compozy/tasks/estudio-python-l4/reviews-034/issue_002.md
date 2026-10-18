---
status: resolved
file: packages/studio/src/python/language/client.ts
line: 60
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Reconexão continua esperando a sincronização revogada

## Review Comment

`retry()` invalida a época e fecha a conexão, mas não cancela a espera da operação que está em `synchronize`. Seu AbortController só entra em `queries` depois de a sincronização terminar. A fila `queue` continua encadeada na Promise antiga; a próxima consulta não consegue abrir uma conexão nova até chegar a resposta da conexão já fechada ou vencer o timeout de 15 segundos. O mesmo bloqueio ocorre enquanto a primeira abertura está pendente. Alterar a época impede aceitar uma resposta antiga, mas não libera o trabalho da geração seguinte.

O teste existente de reconexão resolve o sync antigo logo depois de solicitar a consulta nova, ocultando essa dependência. A reprodução independente mantém o sync revogado pendente: após `retry()` e uma nova query há `opened=1`, `closed=1` e `currentSettled=false`, mesmo depois de drenar as microtasks. Apenas resolver manualmente o sync antigo permite abrir a segunda conexão e concluir a consulta.

Vincular a espera de abertura/sincronização a um sinal da geração da conexão, abortado por retry/dispose, de modo que a fila libere imediatamente a geração revogada. Preservar as guardas de época e o fechamento de handles tardios; uma resposta velha não deve limpar nem invalidar a conexão nova. A regressão deve manter o transporte antigo ignorando aborto e comprovar que a reconexão conclui antes de liberar esse transporte.

## Triage

- Decision: `VALID`
- Notes: Corrigido com AbortController por geração de conexão e espera abortável de abertura/sync. Distinto da lease perdida da issue 001; revalidação independente abaixo.

## Verification

- `bun run .cache/studio-python-l0/review034-lifecycle.ts`: exit 0; `{"case":"retry-waits-revoked-sync","opened":1,"closed":1,"currentSettled":false}`. Depois de liberar a resposta antiga, o harness confirma rejeição da query antiga e sucesso da nova.

## Revalidation

- `bun run .cache/studio-python-l0/review034-revalidate.ts`: exit 0. Nas variantes retry durante `open` e durante `sync`, a consulta da geração nova conclui antes de liberar a resposta antiga (`completedBeforeOldReply=true`, `opens=2`). A consulta antiga é rejeitada; handle de abertura tardia é fechado; após dispose são duas conexões fechadas.
- `bun test src/python/language/client.test.ts`, no pacote Studio: 4 passaram, 0 falharam, 14 verificações. A regressão permanente agora aguarda a consulta nova antes de liberar o sync revogado e confirma reenvio da fonte completa com revisão inicial.
- Inspeção confirma limite separado de abertura (45 segundos) e de requisição (15 segundos), além do sinal da geração. Nenhuma fonte de implementação foi alterada pelo revisor.
