import type { UseStore } from 'idb-keyval'

/**
 * O jeito de o Estúdio falar com o banco dos projetos: cada operação é UMA transação que faz
 * TODOS os pedidos de uma vez e termina com `commit()` EXPLÍCITO. Vale para ler e para gravar.
 *
 * ⭐ Por que o commit explícito na GRAVAÇÃO (medido em 11/09/2026, recarregando logo depois de
 * gravar um arquivo grande): o `setMany`/`delMany` do idb-keyval dependiam do AUTO-commit, que
 * só acontece depois que a página RECEBE o resultado de cada `put` (ela ainda poderia pedir mais
 * coisas dentro da transação). No `beforeunload`/`pagehide` a troca de documento chega antes e a
 * transação morre sem gravar. Sem o commit, trazendo os três arquivos do Molda e recarregando na
 * hora, a mudança voltou em 0 de 10 recargas no WebKit (o motor do iPad) e em 8 de 10 no
 * Firefox; enviando só o céu, com a CPU lenta no Chromium (`e2e/reload-flush.spec.ts`), em 4 de
 * 10. Com ele: 10 de 10, 10 de 10 e 30 de 30.
 *
 * ⭐ Por que também na LEITURA: uma leitura em auto-commit só termina quando a página processa o
 * resultado dela, e a gravação da saída espera as transações anteriores do mesmo store (é a
 * regra do IndexedDB). Se a página vai embora com uma leitura aberta, as duas morrem juntas. Era
 * o segundo mecanismo: trazer um arquivo do Molda dispara a varredura dos desenhos, que LÊ o
 * banco, e recarregando logo depois o Chromium ainda perdia 2 de 46 com a gravação já consertada
 * (toda perda instrumentada coincidiu com uma leitura pendente). Com o commit, a leitura termina
 * no próprio banco, sem depender da página: no mesmo fluxo instrumentado, 20 de 20 sobreviveram,
 * cinco delas com uma leitura ainda aberta no instante da saída.
 *
 * ⭐ A regra que as duas metades seguem: nenhuma transação deste banco pode depender da página
 * continuar viva para terminar. Por isso os pedidos saem TODOS dentro do callback (depois dele a
 * transação fecha), e quem precisa ler para decidir o que gravar (renomear, a capa, a troca de
 * desenho) faz duas transações, uma de leitura e outra de escrita, na fila por projeto
 * (`runSerializedProjectWrite`). Uma leitura e uma escrita presas na mesma transação só
 * terminariam se a página processasse a leitura: é exatamente o que a saída não garante.
 *
 * ⭐ Por que UMA transação por escrita: ela é atômica. Uma falha de quota aborta os `put` E os
 * `delete` juntos, então o `delete` nunca acontece sem o `put` que o justificava (o projeto não
 * fica sem a partição de blocos por causa de um `put` que falhou).
 *
 * ⚠️ Um pedido que LANÇA (valor que não clona, chave inválida) NÃO aborta a transação sozinho:
 * os pedidos feitos antes dele iriam ao disco pelo auto-commit, pela metade. Por isso o
 * `abort()` explícito antes de propagar o erro.
 *
 * ⚠️ O motivo de uma falha chega no evento `abort` (`transaction.error`), não no `error` do
 * pedido: quando o `error` borbulha até a transação, `transaction.error` ainda é `null`. O
 * `promisifyRequest` do idb-keyval rejeitava com esse `null`; aqui a rejeição leva o erro de
 * verdade (ex.: QuotaExceededError).
 *
 * O módulo é LOCAL de propósito, sem importar nada novo do idb-keyval: o registro de mocks do
 * bun:test é global, e um export novo que um dos mocks da suíte não tenha quebra o linker só na
 * ordem de arquivos do CI ("Export named ... not found"). A guarda que impede o resto do Estúdio
 * de voltar a ler e gravar pelo idb-keyval direto está em `projectDatabaseInvariant.test.ts`.
 */

/**
 * Uma escrita de VÁRIAS chaves no IndexedDB que chega ao disco inteira ou não chega.
 * Os `put` vêm primeiro, na ordem; os `delete` depois, na MESMA transação.
 */
export interface IdbWrite {
  readonly puts?: ReadonlyArray<readonly [IDBValidKey, unknown]>
  readonly deletes?: readonly IDBValidKey[]
}

/** Grava `puts` e apaga `deletes` numa transação readwrite só. Escrita vazia não abre transação. */
export function writeInOneTransaction(store: UseStore, write: IdbWrite): Promise<void> {
  const puts = write.puts ?? []
  const deletes = write.deletes ?? []
  if (puts.length === 0 && deletes.length === 0) return Promise.resolve()
  return inOneTransaction(store, 'readwrite', (objectStore) => {
    for (const [key, value] of puts) objectStore.put(value, key)
    for (const key of deletes) objectStore.delete(key)
    // Gravar não lê resultado nenhum: o `complete` basta.
    return { reads: [], result: () => undefined }
  })
}

/**
 * Lê várias chaves numa transação de leitura só. Devolve os valores na ORDEM pedida, com
 * `undefined` no lugar das chaves que não existem. Lista vazia não abre transação.
 */
export function readValues(store: UseStore, keys: readonly IDBValidKey[]): Promise<unknown[]> {
  if (keys.length === 0) return Promise.resolve([])
  return inOneTransaction(store, 'readonly', (objectStore) => {
    const requests = keys.map((key) => objectStore.get(key))
    return { reads: requests, result: () => requests.map((request) => request.result as unknown) }
  })
}

/** Lê uma chave (`undefined` quando não existe). */
export async function readValue(store: UseStore, key: IDBValidKey): Promise<unknown> {
  const [value] = await readValues(store, [key])
  return value
}

/** Todas as chaves do store, numa transação de leitura só. */
export function readAllKeys(store: UseStore): Promise<IDBValidKey[]> {
  return inOneTransaction(store, 'readonly', (objectStore) => {
    const request = objectStore.getAllKeys()
    return { reads: [request], result: () => request.result }
  })
}

/** Os pedidos feitos numa transação: os que precisam ser LIDOS, e como ler o resultado. */
interface PlacedRequests<T> {
  readonly reads: readonly IDBRequest[]
  readonly result: () => T
}

/**
 * A regra num lugar só. `placeRequests` faz todos os pedidos de forma SÍNCRONA e devolve os de
 * leitura, mais como ler o resultado quando eles e a transação terminarem.
 *
 * ⚠️ No Chromium, numa transação com `commit()` explícito, o `complete` chega ANTES do `success`
 * do pedido quando o valor lido é grande (medido em 11/09/2026: 0 de 5 até 1 MB, 5 de 5 com 1,5 MB
 * e com 5 MB, bloqueada ou não atrás de uma gravação; o Firefox e o WebKit seguem a especificação,
 * `success` primeiro). Ler o `request.result` no `complete` lança InvalidStateError ("the request
 * has not finished"), e foi isso que fez o editor não reabrir o projeto com o céu de 1,5 MB no
 * e2e. Por isso a leitura espera o `success` de cada pedido E o `complete`, em qualquer ordem.
 */
function inOneTransaction<T>(
  store: UseStore,
  mode: IDBTransactionMode,
  placeRequests: (objectStore: IDBObjectStore) => PlacedRequests<T>,
): Promise<T> {
  return store(mode, (objectStore) => {
    const transaction = objectStore.transaction
    let placed: PlacedRequests<T>
    try {
      placed = placeRequests(objectStore)
    } catch (error) {
      abortQuietly(transaction)
      throw error
    }
    // `commit()` existe desde o Chromium 76, o Firefox 74 e o Safari 15. Sem ele, o
    // auto-commit continua valendo: é o comportamento de antes, não pior.
    if (typeof transaction.commit === 'function') transaction.commit()
    return Promise.all([transactionDone(transaction), ...placed.reads.map(requestFinished)]).then(
      placed.result,
    )
  })
}

/** Resolve no `complete`; rejeita no `abort` com o motivo que a transação guardou. */
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new DOMException('A transação foi interrompida.', 'AbortError'))
  })
}

/**
 * Resolve quando o pedido termina, com sucesso OU erro: o erro de um pedido aborta a transação,
 * e é o `abort` dela que rejeita, com o motivo (ver `transactionDone`).
 */
function requestFinished(request: IDBRequest): Promise<void> {
  return new Promise<void>((resolve) => {
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

function abortQuietly(transaction: IDBTransaction): void {
  try {
    transaction.abort()
  } catch {
    // Já terminou: não há o que desfazer. O erro que importa é o do pedido, propagado
    // por quem chamou.
  }
}
