import type { UseStore } from 'idb-keyval'
type ProjectTransport = typeof import('./projectStorageTransport')
let projectTransport: ProjectTransport | undefined
let transportLoading: Promise<void> | undefined
const usesProjectTransport = (key: IDBValidKey) =>
  typeof key === 'string' && key.startsWith('sz:v4:project-')

/** Opening a v4 document loads its codec before a live transaction, never on pagehide. */
function prepareProjectTransport(keys: readonly IDBValidKey[]): Promise<void> | undefined {
  if (projectTransport || !keys.some(usesProjectTransport)) return
  return (transportLoading ??= import('./projectStorageTransport')
    .then((module) => {
      projectTransport = module
    })
    .finally(() => {
      transportLoading = undefined
    }))
}
const encodeProjectStorageValue = (key: IDBValidKey, value: unknown) =>
  projectTransport ? projectTransport.encodeProjectStorageValue(key, value) : value
const decodeProjectStorageValue = (key: IDBValidKey, value: unknown) =>
  projectTransport ? projectTransport.decodeProjectStorageValue(key, value) : value

// idb-keyval calls even an already-open database through Promise.then. A dying
// page may never enter that callback. Retain its existing connection/store name
// so exit requests and commit are actually placed in the calling event turn.
const openStores = new WeakMap<UseStore, { database: IDBDatabase; name: string }>()

function rememberOpenStore(store: UseStore, objectStore: IDBObjectStore): void {
  const database = objectStore.transaction.db
  if (!database || typeof database.transaction !== 'function') return
  const current = openStores.get(store)
  if (current?.database === database && current.name === objectStore.name) return
  const entry = { database, name: objectStore.name }
  openStores.set(store, entry)
  const forget = () => {
    if (openStores.get(store) === entry) openStores.delete(store)
  }
  database.addEventListener('close', forget, { once: true })
  database.addEventListener('versionchange', forget, { once: true })
}

function openTransaction<T>(
  store: UseStore,
  mode: IDBTransactionMode,
  operation: (objectStore: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const opened = openStores.get(store)
  if (opened) {
    let transaction: IDBTransaction
    try {
      transaction = opened.database.transaction(opened.name, mode)
    } catch (error) {
      // A closed connection has not issued any requests; let the owning store
      // reopen it. Never retry an operation after its requests have been placed.
      openStores.delete(store)
      if (
        !(
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'InvalidStateError'
        )
      )
        return Promise.reject(error)
      return store(mode, (objectStore) => {
        rememberOpenStore(store, objectStore)
        return operation(objectStore)
      })
    }
    try {
      return Promise.resolve(operation(transaction.objectStore(opened.name)))
    } catch (error) {
      abortQuietly(transaction)
      return Promise.reject(error)
    }
  }
  return store(mode, (objectStore) => {
    rememberOpenStore(store, objectStore)
    return operation(objectStore)
  })
}

/**
 * O jeito de o Estúdio falar com o banco dos projetos: cada operação termina com
 * `commit()` EXPLÍCITO. Leituras e staging de saída fazem TODOS os pedidos de uma vez.
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
 * ⭐ CAS entre abas exige leitura e escrita na MESMA transação enquanto a página está viva.
 * `conditionalWrite` mantém essas transações rastreadas até pedir commit. No pagehide,
 * `interruptConditionalTransactions` aborta as que ainda dependem de callbacks e invalida
 * as que estavam enfileiradas. O snapshot completo vai para staging com TODOS os puts e
 * commit no mesmo turno. A próxima abertura promove o staging pelo mesmo CAS, sem
 * substituir outro autor. `projectStorageBrowser.test.ts` verifica reload imediato nos
 * motores Chromium e WebKit com uma CAS anterior pendente e assets grandes.
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

const conditionalTransactions = new Map<string, Set<IDBTransaction>>()
const conditionalGenerations = new Map<string, number>()
export function conditionalGeneration(identity: string): number {
  return conditionalGenerations.get(identity) ?? 0
}
/** Exit recovery must not wait for a read callback in a dying document. */
export function interruptConditionalTransactions(identity: string): void {
  conditionalGenerations.set(identity, conditionalGeneration(identity) + 1)
  for (const transaction of conditionalTransactions.get(identity) ?? []) abortQuietly(transaction)
}

/**
 * Live-page CAS exception: only synchronous computation is allowed after reads.
 * Exit uses interruptConditionalTransactions + writeInOneTransaction staging instead.
 */
export function conditionalWrite<T>(
  store: UseStore,
  identity: string,
  generation: number,
  keys: readonly IDBValidKey[],
  decide: (values: unknown[]) => { write: IdbWrite; result: T },
): Promise<T> {
  const ready = prepareProjectTransport(keys)
  if (ready) return ready.then(() => conditionalWrite(store, identity, generation, keys, decide))
  return openTransaction(store, 'readwrite', (objectStore) => {
    const transaction = objectStore.transaction
    if (conditionalGeneration(identity) !== generation) {
      abortQuietly(transaction)
      throw new DOMException('Gravação transferida para a recuperação de saída.', 'AbortError')
    }
    let active = conditionalTransactions.get(identity)
    if (!active) {
      active = new Set()
      conditionalTransactions.set(identity, active)
    }
    active.add(transaction)
    let decided: T
    let failure: unknown
    const done = transactionDone(transaction)
      .then(
        () => decided,
        (error) => {
          throw failure ?? error
        },
      )
      .finally(() => {
        active!.delete(transaction)
        if (active!.size === 0) conditionalTransactions.delete(identity)
      })
    try {
      const values: unknown[] = new Array(keys.length)
      let remaining = keys.length
      const finish = () => {
        try {
          const { write, result } = decide(values)
          for (const [key, value] of write.puts ?? [])
            objectStore.put(encodeProjectStorageValue(key, value), key)
          for (const key of write.deletes ?? []) objectStore.delete(key)
          decided = result
          conditionalTransactions.get(identity)?.delete(transaction)
          if (typeof transaction.commit === 'function') transaction.commit()
        } catch (error) {
          failure = error
          abortQuietly(transaction)
        }
      }
      if (remaining === 0) finish()
      keys.forEach((key, index) => {
        const request = objectStore.get(key)
        request.onsuccess = () => {
          try {
            values[index] = decodeProjectStorageValue(key, request.result)
            if (--remaining === 0) finish()
          } catch (error) {
            failure = error
            abortQuietly(transaction)
          }
        }
      })
    } catch (error) {
      failure = error
      abortQuietly(transaction)
    }
    return done
  })
}

/** Grava `puts` e apaga `deletes` numa transação readwrite só. Escrita vazia não abre transação. */
export function writeInOneTransaction(store: UseStore, write: IdbWrite): Promise<void> {
  const puts = write.puts ?? []
  const deletes = write.deletes ?? []
  if (puts.length === 0 && deletes.length === 0) return Promise.resolve()
  // A synchronous exit write must not introduce a module-loading boundary. Normal
  // document opening/CAS prepares this codec; a cold direct caller cannot write
  // an unreadable native value or silently postpone its exit requests.
  if (!projectTransport && puts.some(([key]) => usesProjectTransport(key)))
    return Promise.reject(new Error('Abra o armazenamento do projeto antes de gravar esta versão.'))
  return inOneTransaction(store, 'readwrite', (objectStore) => {
    for (const [key, value] of puts) objectStore.put(encodeProjectStorageValue(key, value), key)
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
  const ready = prepareProjectTransport(keys)
  if (ready) return ready.then(() => readValues(store, keys))
  return inOneTransaction(store, 'readonly', (objectStore) => {
    const requests = keys.map((key) => objectStore.get(key))
    return {
      reads: requests,
      result: () =>
        requests.map((request, index) => decodeProjectStorageValue(keys[index]!, request.result)),
    }
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
  return openTransaction(store, mode, (objectStore) => {
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
