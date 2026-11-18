# Persistência: recorrência no WebKit Linux

O run `44379411806`, SHA `ae6e348a6`, passou todos os jobs de navegador, runtime
hospedado, auditoria e contratos Windows. O job de contratos Linux reprovou no teste
real de IndexedDB: após recarregar, a revisão era `in-flight-0`, quando deveria ser
`exit-0`. Chromium completou as 12 recargas e o conflito entre abas.

Isso reabre o aceite de R3. O cache da conexão quente corrige o adiamento pelo
`Promise.then` do idb-keyval, mas o resultado Linux mostra que não basta para provar
durabilidade de saída. Não silenciar a falha, aumentar timeout, retirar WebKit ou
chamar um commit solicitado de salvamento confirmado.

O fixture passou a observar os métodos NATIVOS `IDBDatabase.transaction` e
`IDBTransaction.commit`, preservando suas chamadas e resultados. Uma lista limitada
a 40 eventos em `window.name` atravessa a recarga de mesma origem. Registra início,
pedido de commit, complete/abort com identificador de transação, beforeunload/pagehide
e qual revisão o serviço entregou ao flush. O relatório inclui os ids devolvidos
pela recuperação e a cabeça persistida, distinguindo falta de journal de conflito
com cópia recuperada. Isso existe somente no fixture; não instrumenta o produto.

O verificador grava `.cache/mission/storage-lifecycle-{engine}.json` antes de cada
asserção de revisão. Uma reprovação inclui a sequência anterior na própria mensagem
da asserção; o workflow já publica `.cache/mission` mesmo em falhas. Não há contas,
assets privados nem código de aluno nesses artefatos.

Validação local com ids de transação: Chromium + WebKit, 12 recargas imediatas
e duas abas por motor, aprovado em 17,74 s. No WebKit local, a última sequência foi:

```text
transaction:5:readwrite
beforeunload
flush:exit-11
transaction:6:readwrite
commit-request:6
commit-requested:6
abort:5:unknown
pagehide
```

A transação anterior foi abortada; a de saída solicitou commit. A ausência do seu
callback `complete` antes do pagehide não comprova aborto: a revisão correta foi
observada depois da recarga neste teste. A próxima rodada Linux precisa discriminar
captura da revisão, emissão dos pedidos, finalização e recuperação. Aprovação local
não elimina a ocorrência remota.

```powershell
$env:STUDIO_STORAGE_BROWSER='all'
bun test src/state/projectStorageBrowser.test.ts
```
