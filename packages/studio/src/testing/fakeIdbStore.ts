import type { UseStore } from 'idb-keyval'

/**
 * A `UseStore` de mentira que TODO mock de `idb-keyval` da suíte devolve no `createStore`
 * (o happy-dom não tem IndexedDB).
 *
 * Por que todos, e não só os que testam persistência: desde 11/09/2026 o banco dos projetos só é
 * lido e gravado por transações abertas pelo próprio `scope.store` (commit explícito, ver
 * `state/idbTransaction.ts`), e não mais pelo `get`/`setMany` do idb-keyval. E o store fica em
 * CACHE no escopo de armazenamento (`captureProjectStorageScope`, `getProjectStorageScope`), que
 * atravessa arquivos de teste: o registro de mocks do bun:test é global. O store que um teste usa
 * pode ter nascido no `createStore` de OUTRO arquivo, e um mock que devolvesse um objeto não
 * chamável quebraria a gravação só numa certa ordem de arquivos (o CI no Linux roda outra ordem
 * que o Windows).
 *
 * Por isso a transação RESPONDE pelas funções do mock ATIVO no momento: `setMany` para os `put` e
 * `delMany` para os `delete` (na ordem pedida), `get` quando a transação lê UMA chave, `getMany`
 * quando lê várias e `keys` para o `getAllKeys`. É por elas que cada arquivo guarda o que depois
 * lê (e semeia leituras com `mockResolvedValueOnce`), e o registro vivo do bun sempre aponta para
 * o mock do arquivo que está rodando. O próprio store vai como argumento, com o nome do banco em
 * `.name` (o que os mocks de Map por banco usam para escolher o Map).
 *
 * ⚠️ Todo mock de `idb-keyval` precisa exportar `get`, `getMany`, `keys`, `setMany` E `delMany`
 * (medido no bun 1.3.11): o CONJUNTO de nomes do módulo fica congelado pelo PRIMEIRO mock da
 * suíte, e um nome que o mock atual não exporta continua apontando para a função VELHA de outro
 * arquivo, que leria e gravaria nos Maps errados sem erro nenhum.
 *
 * O que ela imita do navegador, porque é disso que o conserto depende:
 * - o callback roda numa microtask depois do pedido (o `getDB().then` do idb-keyval);
 * - os pedidos e o `commit` só valem DENTRO do callback (depois dele a transação está inativa);
 * - o ESCALONAMENTO do IndexedDB: uma escrita só começa depois de TODAS as transações anteriores
 *   do mesmo banco terminarem, e uma leitura, depois das ESCRITAS anteriores. É o que deixa a
 *   fila por projeto liberar a próxima escrita sem esperar o disco confirmar a anterior;
 * - `complete`/`abort` chegam depois, e uma falha aborta TUDO (nada é aplicado);
 * - numa LEITURA com `commit()`, o `complete` chega ANTES do `success`, e o `result` lança
 *   InvalidStateError até o pedido terminar: é o que o Chromium faz com valores grandes (medido
 *   em 11/09/2026, a partir de ~1,5 MB), e o fake faz sempre, que é o pior caso;
 * - sem `commit()` a transação termina sozinha (auto-commit) e aplica o que foi pedido, inclusive
 *   quando o callback lança sem chamar `abort()`: é a gravação pela metade que o
 *   `writeInOneTransaction` evita, e o teste dele prova que este fake a enxerga.
 *
 * Para saber o que foi pedido, leia o registro (`fakeIdbTransactions`, `fakeIdbWrites`), não o
 * `setMany`. ⚠️ Uma mesma transação não mistura leitura e escrita aqui (o fake recusa): o
 * Estúdio nunca faz isso, e é de propósito (ver `idbTransaction.ts`).
 */

export type FakeIdbOp =
  | { readonly type: 'put'; readonly key: IDBValidKey; readonly value: unknown }
  | { readonly type: 'delete'; readonly key: IDBValidKey }

export type FakeIdbRead =
  | { readonly type: 'get'; readonly key: IDBValidKey }
  | { readonly type: 'getAllKeys' }

export type FakeIdbStep =
  | FakeIdbOp
  | FakeIdbRead
  | { readonly type: 'commit' }
  | { readonly type: 'abort' }

export interface FakeIdbTransaction {
  readonly db: string
  readonly mode: IDBTransactionMode
  /** Pedidos (de escrita e de leitura), `commit()` e `abort()` na ordem em que o código os chamou. */
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

/**
 * Um pedido de leitura. Como no navegador, o `result` LANÇA InvalidStateError enquanto o pedido
 * não terminou (é o que o Chromium faz quando o `complete` chega antes do `success`).
 */
interface FakeRequest {
  readonly result: unknown
  error: unknown
  readyState: 'pending' | 'done'
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  /** Entrega o resultado e dispara o `success`. */
  deliver(value: unknown): void
}

function fakeRequest(): FakeRequest {
  let value: unknown
  const request: FakeRequest = {
    get result() {
      if (request.readyState !== 'done') {
        throw new DOMException(
          "Failed to read the 'result' property from 'IDBRequest': The request has not finished.",
          'InvalidStateError',
        )
      }
      return value
    },
    error: null,
    readyState: 'pending',
    onsuccess: null,
    onerror: null,
    deliver(next) {
      value = next
      request.readyState = 'done'
      request.onsuccess?.()
    },
  }
  return request
}

interface PendingRead {
  readonly step: FakeIdbRead
  readonly request: FakeRequest
}

/** Uma transação que ainda não terminou, para o escalonamento das que nascem depois dela. */
interface LiveTransaction {
  readonly db: string
  readonly mode: IDBTransactionMode
  readonly settled: Promise<void>
}

/** A interface do mock ativo que o fake usa para responder (ver o cabeçalho). */
interface LiveKeyval {
  get?: (key: IDBValidKey, customStore?: UseStore) => Promise<unknown>
  getMany?: (keys: IDBValidKey[], customStore?: UseStore) => Promise<unknown[]>
  keys?: (customStore?: UseStore) => Promise<IDBValidKey[]>
  setMany?: (entries: [IDBValidKey, unknown][], customStore?: UseStore) => Promise<void>
  delMany?: (keys: IDBValidKey[], customStore?: UseStore) => Promise<void>
}

const transactions: MutableTransaction[] = []
let liveTransactions: LiveTransaction[] = []
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
    // A transação NASCE aqui (o idb-keyval chama `db.transaction` na ordem dos pedidos), e é
    // nesta ordem que o IndexedDB a escalona: escrita espera todas as anteriores do banco,
    // leitura espera as escritas anteriores.
    const waitFor = liveTransactions
      .filter(
        (other) => other.db === dbName && (mode === 'readwrite' || other.mode === 'readwrite'),
      )
      .map((other) => other.settled)
    let settle = () => {}
    const live: LiveTransaction = {
      db: dbName,
      mode,
      settled: new Promise<void>((resolve) => {
        settle = resolve
      }),
    }
    liveTransactions.push(live)
    const release = () => {
      liveTransactions = liveTransactions.filter((other) => other !== live)
      settle()
    }
    const failure = mode === 'readwrite' ? takeNextFailure() : null
    const hold = mode === 'readwrite' ? takeNextHold() : null
    return Promise.resolve().then(() =>
      runTransaction(store, record, callback, { failure, hold, waitFor, release }),
    )
  }) as UseStore
  Object.defineProperty(store, 'name', { value: dbName })
  return store
}

interface Scheduling {
  failure: { error: unknown } | null
  hold: Promise<void> | null
  waitFor: readonly Promise<void>[]
  release: () => void
}

function runTransaction<T>(
  store: UseStore,
  record: MutableTransaction,
  callback: (objectStore: IDBObjectStore) => T | PromiseLike<T>,
  scheduling: Scheduling,
): T | PromiseLike<T> {
  let active = true
  // `commit()` ou `abort()` já chamados: a transação não aceita mais pedidos.
  let finishing = false
  let abortCalled = false
  const reads: PendingRead[] = []
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
  }
  const requireWritable = (what: string) => {
    requireActive(what)
    if (record.mode === 'readonly') {
      throw new DOMException(`${what} numa transação de leitura`, 'ReadOnlyError')
    }
  }
  const read = (step: FakeIdbRead): FakeRequest => {
    requireActive(step.type)
    const request = fakeRequest()
    record.steps.push(step)
    reads.push({ step, request })
    return request
  }
  const objectStore = {
    transaction,
    put(value: unknown, key: IDBValidKey) {
      requireWritable('put')
      if (nextPutError?.when(key)) {
        const { error } = nextPutError
        nextPutError = null
        throw error
      }
      record.steps.push({ type: 'put', key, value })
    },
    delete(key: IDBValidKey) {
      requireWritable('delete')
      record.steps.push({ type: 'delete', key })
    },
    get(key: IDBValidKey) {
      return read({ type: 'get', key })
    },
    getAllKeys() {
      return read({ type: 'getAllKeys' })
    },
  }
  try {
    return callback(objectStore as unknown as IDBObjectStore)
  } finally {
    active = false
    void finish(store, record, transaction, reads, {
      ...scheduling,
      abortCalled: () => abortCalled,
    })
  }
}

async function finish(
  store: UseStore,
  record: MutableTransaction,
  transaction: { error: unknown; oncomplete: (() => void) | null; onabort: (() => void) | null },
  reads: readonly PendingRead[],
  pending: Scheduling & { abortCalled: () => boolean },
): Promise<void> {
  try {
    // Os eventos chegam DEPOIS do callback, como no navegador, e a transação só COMEÇA
    // quando as que ela espera terminam (o escalonamento do IndexedDB).
    await Promise.resolve()
    await Promise.all(pending.waitFor)
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
    let answers: unknown[]
    try {
      if (
        reads.length > 0 &&
        record.steps.some((step) => step.type === 'put' || step.type === 'delete')
      ) {
        throw new Error('o fake não mistura leitura e escrita na mesma transação')
      }
      answers = await fetchAnswers(store, reads)
      await applyOps(store, record.steps)
    } catch (error) {
      abort(error)
      return
    }
    const deliverAll = () => {
      reads.forEach((read, index) => {
        read.request.deliver(answers[index])
      })
    }
    // ⚠️ O Chromium, numa leitura com `commit()` explícito, entrega o `complete` ANTES do
    // `success` quando o valor é grande (medido em 11/09/2026: a partir de ~1,5 MB). O fake faz
    // sempre assim nas leituras com commit, que é o pior caso: quem ler o `result` no `complete`
    // leva o mesmo InvalidStateError do navegador. Sem commit (auto-commit), a ordem da
    // especificação: `success` primeiro.
    const committed = record.steps.some((step) => step.type === 'commit')
    if (reads.length > 0 && committed) {
      record.outcome = 'complete'
      transaction.oncomplete?.()
      // O `success` é uma TAREFA separada no navegador, e não uma microtask: quem encadeia
      // promessas no `complete` chega a ler antes dele.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      deliverAll()
      return
    }
    deliverAll()
    record.outcome = 'complete'
    transaction.oncomplete?.()
  } finally {
    pending.release()
  }
}

/**
 * Busca as respostas das leituras no mock ATIVO, na ordem dos pedidos: `get` para UMA chave,
 * `getMany` para várias (as mesmas funções que o Estúdio chamava antes de ler pelas próprias
 * transações), `keys` para o `getAllKeys`. Não entrega nada ainda (ver `deliver`).
 */
async function fetchAnswers(store: UseStore, reads: readonly PendingRead[]): Promise<unknown[]> {
  if (reads.length === 0) return []
  const live = (await import('idb-keyval')) as LiveKeyval
  const answers: unknown[] = new Array(reads.length).fill(undefined)
  const getIndexes = reads.flatMap((read, index) => (read.step.type === 'get' ? [index] : []))
  const keyOf = (index: number) => (reads[index]?.step as { key: IDBValidKey }).key
  if (getIndexes.length === 1) {
    const [only] = getIndexes as [number]
    if (!live.get) throw new Error('o mock de idb-keyval precisa exportar get')
    answers[only] = await live.get(keyOf(only), store)
  } else if (getIndexes.length > 1) {
    if (!live.getMany) throw new Error('o mock de idb-keyval precisa exportar getMany')
    const values = await live.getMany(getIndexes.map(keyOf), store)
    getIndexes.forEach((index, position) => {
      answers[index] = values[position]
    })
  }
  for (const [index, read] of reads.entries()) {
    if (read.step.type !== 'getAllKeys') continue
    if (!live.keys) throw new Error('o mock de idb-keyval precisa exportar keys')
    answers[index] = await live.keys(store)
  }
  return answers
}

/** Aplica pelos `setMany`/`delMany` do mock ATIVO, agrupando `put` e `delete` seguidos. */
async function applyOps(store: UseStore, steps: readonly FakeIdbStep[]): Promise<void> {
  const ops = steps.filter(
    (step): step is FakeIdbOp => step.type === 'put' || step.type === 'delete',
  )
  if (ops.length === 0) return
  const live = (await import('idb-keyval')) as LiveKeyval
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

/** Só as de leitura (readonly). */
export function fakeIdbReads(): readonly FakeIdbTransaction[] {
  return transactions.filter((transaction) => transaction.mode === 'readonly')
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

/**
 * Esquece o registro, as falhas/esperas ainda não consumidas e as transações vivas (uma que um
 * teste anterior deixou segurada não pode escalonar as do teste seguinte).
 */
export function resetFakeIdb(): void {
  transactions.length = 0
  liveTransactions = []
  nextFailure = null
  nextHold = null
  nextPutError = null
}
