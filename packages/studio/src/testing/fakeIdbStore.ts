import type { UseStore } from 'idb-keyval'

/**
 * A `UseStore` de mentira que TODO mock de `idb-keyval` da suíte devolve no `createStore`
 * (o happy-dom não tem IndexedDB).
 *
 * Por que todos, e não só os que testam persistência: desde 11/09/2026 o `persistProject` e o
 * `deleteProject` abrem a transação pelo próprio `scope.store` (commit explícito, ver
 * `state/idbTransaction.ts`), em vez de só repassar o store ao `setMany`/`delMany`. E o store
 * fica em CACHE no escopo de armazenamento (`captureProjectStorageScope`,
 * `getProjectStorageScope`), que atravessa arquivos de teste: o registro de mocks do bun:test é
 * global. O store que um teste usa pode ter nascido no `createStore` de OUTRO arquivo, e um mock
 * que devolvesse um objeto não chamável quebraria a gravação só numa certa ordem de arquivos (o CI
 * no Linux roda outra ordem que o Windows).
 *
 * Por isso a transação APLICA o resultado pelas funções do mock ATIVO no momento (`setMany` para
 * os `put`, `delMany` para os `delete`, na ordem pedida): é por elas que cada arquivo guarda o que
 * depois lê, e o registro vivo do bun sempre aponta para o mock do arquivo que está rodando. O
 * próprio store vai como argumento, com o nome do banco em `.name` (o que os mocks de Map por
 * banco usam para escolher o Map).
 *
 * ⚠️ Todo mock de `idb-keyval` precisa exportar `setMany` E `delMany` (medido no bun 1.3.11): o
 * CONJUNTO de nomes do módulo fica congelado pelo PRIMEIRO mock da suíte, e um nome que o mock
 * atual não exporta continua apontando para a função VELHA de outro arquivo, que gravaria nos
 * Maps errados sem erro nenhum.
 *
 * O que ela imita do navegador, porque é disso que o conserto depende:
 * - o callback roda numa microtask depois do pedido (o `getDB().then` do idb-keyval);
 * - `put`, `delete` e `commit` só valem DENTRO do callback (depois dele a transação está inativa);
 * - `complete`/`abort` chegam depois, e uma falha aborta TUDO (nada é aplicado);
 * - sem `commit()` a transação termina sozinha (auto-commit) e aplica o que foi pedido, inclusive
 *   quando o callback lança sem chamar `abort()`: é a gravação pela metade que o
 *   `writeInOneTransaction` evita, e o teste dele prova que este fake a enxerga.
 *
 * Para saber o que foi pedido, leia o registro (`fakeIdbWrites`), não o `setMany`.
 */

export type FakeIdbOp =
  | { readonly type: 'put'; readonly key: IDBValidKey; readonly value: unknown }
  | { readonly type: 'delete'; readonly key: IDBValidKey }

export type FakeIdbStep = FakeIdbOp | { readonly type: 'commit' } | { readonly type: 'abort' }

export interface FakeIdbTransaction {
  readonly db: string
  readonly mode: IDBTransactionMode
  /** Pedidos, `commit()` e `abort()` na ordem em que o código os chamou. */
  readonly steps: readonly FakeIdbStep[]
  readonly outcome: 'pending' | 'complete' | 'aborted'
  /** O motivo do `abort` (a falha injetada ou a de aplicar); `null` num `abort()` do código. */
  readonly error: unknown
}

interface MutableTransaction {
  db: string
  mode: IDBTransactionMode
  steps: FakeIdbStep[]
  outcome: 'pending' | 'complete' | 'aborted'
  error: unknown
}

const transactions: MutableTransaction[] = []
let nextFailure: { error: unknown } | null = null
let nextHold: Promise<void> | null = null
let nextPutError: { error: unknown; when: (key: IDBValidKey) => boolean } | null = null

/** A `UseStore` do banco `dbName` (o `.name` dela é o nome do banco). */
export function fakeUseStore(dbName: string): UseStore {
  const store = (<T>(
    mode: IDBTransactionMode,
    callback: (objectStore: IDBObjectStore) => T | PromiseLike<T>,
  ): Promise<T> => {
    const record: MutableTransaction = {
      db: dbName,
      mode,
      steps: [],
      outcome: 'pending',
      error: null,
    }
    transactions.push(record)
    const failure = mode === 'readwrite' ? takeNextFailure() : null
    const hold = mode === 'readwrite' ? takeNextHold() : null
    return Promise.resolve().then(() => runTransaction(store, record, callback, failure, hold))
  }) as UseStore
  Object.defineProperty(store, 'name', { value: dbName })
  return store
}

function runTransaction<T>(
  store: UseStore,
  record: MutableTransaction,
  callback: (objectStore: IDBObjectStore) => T | PromiseLike<T>,
  failure: { error: unknown } | null,
  hold: Promise<void> | null,
): T | PromiseLike<T> {
  let active = true
  // `commit()` ou `abort()` já chamados: a transação não aceita mais pedidos.
  let finishing = false
  let abortCalled = false
  const transaction = {
    mode: record.mode,
    error: null as unknown,
    oncomplete: null as (() => void) | null,
    onabort: null as (() => void) | null,
    commit() {
      if (!active || finishing) throw invalidState('commit')
      finishing = true
      record.steps.push({ type: 'commit' })
    },
    abort() {
      if (record.outcome !== 'pending' || finishing) throw invalidState('abort')
      abortCalled = true
      finishing = true
      record.steps.push({ type: 'abort' })
    },
  }
  const requireActive = (what: string) => {
    if (!active || finishing) {
      throw new DOMException(`${what} numa transação inativa`, 'TransactionInactiveError')
    }
    if (record.mode === 'readonly') {
      throw new DOMException(`${what} numa transação de leitura`, 'ReadOnlyError')
    }
  }
  const objectStore = {
    transaction,
    put(value: unknown, key: IDBValidKey) {
      requireActive('put')
      if (nextPutError?.when(key)) {
        const { error } = nextPutError
        nextPutError = null
        throw error
      }
      record.steps.push({ type: 'put', key, value })
    },
    delete(key: IDBValidKey) {
      requireActive('delete')
      record.steps.push({ type: 'delete', key })
    },
  }
  try {
    return callback(objectStore as unknown as IDBObjectStore)
  } finally {
    active = false
    void finish(store, record, transaction, { failure, hold, abortCalled: () => abortCalled })
  }
}

async function finish(
  store: UseStore,
  record: MutableTransaction,
  transaction: { error: unknown; oncomplete: (() => void) | null; onabort: (() => void) | null },
  pending: {
    failure: { error: unknown } | null
    hold: Promise<void> | null
    abortCalled: () => boolean
  },
): Promise<void> {
  // Os eventos chegam DEPOIS do callback, como no navegador.
  await Promise.resolve()
  if (pending.hold) await pending.hold
  const abort = (error: unknown) => {
    record.outcome = 'aborted'
    record.error = error
    transaction.error = error
    transaction.onabort?.()
  }
  if (pending.abortCalled()) {
    abort(null)
    return
  }
  if (pending.failure) {
    abort(pending.failure.error)
    return
  }
  try {
    await applyOps(store, record.steps)
  } catch (error) {
    abort(error)
    return
  }
  record.outcome = 'complete'
  transaction.oncomplete?.()
}

/** Aplica pelos `setMany`/`delMany` do mock ATIVO, agrupando `put` e `delete` seguidos. */
async function applyOps(store: UseStore, steps: readonly FakeIdbStep[]): Promise<void> {
  const ops = steps.filter(
    (step): step is FakeIdbOp => step.type === 'put' || step.type === 'delete',
  )
  if (ops.length === 0) return
  const live = (await import('idb-keyval')) as {
    setMany?: (entries: [IDBValidKey, unknown][], customStore?: UseStore) => Promise<void>
    delMany?: (keys: IDBValidKey[], customStore?: UseStore) => Promise<void>
  }
  let index = 0
  while (index < ops.length) {
    const first = ops[index] as FakeIdbOp
    const run: FakeIdbOp[] = []
    while (index < ops.length && (ops[index] as FakeIdbOp).type === first.type) {
      run.push(ops[index] as FakeIdbOp)
      index += 1
    }
    if (first.type === 'put') {
      if (!live.setMany) throw new Error('o mock de idb-keyval precisa exportar setMany')
      await live.setMany(
        run.map((op) => [op.key, op.type === 'put' ? op.value : undefined]),
        store,
      )
    } else {
      if (!live.delMany) throw new Error('o mock de idb-keyval precisa exportar delMany')
      await live.delMany(
        run.map((op) => op.key),
        store,
      )
    }
  }
}

function invalidState(what: string): DOMException {
  return new DOMException(`${what} fora de uma transação ativa`, 'InvalidStateError')
}

function takeNextFailure(): { error: unknown } | null {
  const failure = nextFailure
  nextFailure = null
  return failure
}

function takeNextHold(): Promise<void> | null {
  const hold = nextHold
  nextHold = null
  return hold
}

/** Todas as transações pedidas desde o último `resetFakeIdb`, na ordem. */
export function fakeIdbTransactions(): readonly FakeIdbTransaction[] {
  return transactions
}

/** Só as de escrita (readwrite). */
export function fakeIdbWrites(): readonly FakeIdbTransaction[] {
  return transactions.filter((transaction) => transaction.mode === 'readwrite')
}

/** A última transação de escrita, ou `undefined` se não houve nenhuma. */
export function lastFakeIdbWrite(): FakeIdbTransaction | undefined {
  return fakeIdbWrites().at(-1)
}

/** Os `put` de uma transação como Map chave → valor. */
export function fakeIdbPuts(
  transaction: FakeIdbTransaction | undefined,
): Map<IDBValidKey, unknown> {
  const puts = new Map<IDBValidKey, unknown>()
  for (const step of transaction?.steps ?? []) {
    if (step.type === 'put') puts.set(step.key, step.value)
  }
  return puts
}

/** As chaves apagadas numa transação, na ordem. */
export function fakeIdbDeletes(transaction: FakeIdbTransaction | undefined): IDBValidKey[] {
  return (transaction?.steps ?? []).flatMap((step) => (step.type === 'delete' ? [step.key] : []))
}

/** A próxima transação de escrita ABORTA com `error` (quota cheia, por exemplo). */
export function failNextFakeIdbWrite(error: unknown): void {
  nextFailure = { error }
}

/**
 * Segura a próxima transação de escrita EM VOO até `release()` (os pedidos já foram feitos; o
 * `complete` só chega depois). É o autosave lento, com uma edição nova no meio.
 */
export function holdNextFakeIdbWrite(): { release: () => void } {
  let release = () => {}
  nextHold = new Promise<void>((resolve) => {
    release = resolve
  })
  return { release: () => release() }
}

/**
 * O próximo `put` cuja chave passa em `when` LANÇA na hora (valor que não clona, por exemplo).
 * Sem `when`, o próximo `put` qualquer.
 */
export function throwOnNextFakeIdbPut(
  error: unknown,
  when: (key: IDBValidKey) => boolean = () => true,
): void {
  nextPutError = { error, when }
}

/** Esquece o registro e as falhas/esperas ainda não consumidas. */
export function resetFakeIdb(): void {
  transactions.length = 0
  nextFailure = null
  nextHold = null
  nextPutError = null
}
