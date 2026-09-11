import type { UseStore } from 'idb-keyval'

/**
 * Uma escrita de VÁRIAS chaves no IndexedDB que chega ao disco inteira ou não chega.
 * Os `put` vêm primeiro, na ordem; os `delete` depois, na MESMA transação.
 */
export interface IdbWrite {
  readonly puts?: ReadonlyArray<readonly [IDBValidKey, unknown]>
  readonly deletes?: readonly IDBValidKey[]
}

/**
 * Grava `puts` e apaga `deletes` numa transação readwrite SÓ, encerrada por `commit()`
 * EXPLÍCITO.
 *
 * ⭐ Por que o commit explícito (medido em 11/09/2026, recarregando logo depois de gravar um
 * arquivo grande): o `setMany`/`delMany` do idb-keyval dependem do AUTO-commit, que só acontece
 * depois que a página RECEBE o resultado de cada `put` (ela ainda poderia pedir mais coisas
 * dentro da transação). No `beforeunload`/`pagehide` a troca de documento chega antes e a
 * transação morre sem gravar. Sem o commit, trazendo os três arquivos do Molda e recarregando na
 * hora, a mudança voltou em 0 de 10 recargas no WebKit (o motor do iPad) e em 8 de 10 no
 * Firefox; enviando só o céu, com a CPU lenta no Chromium (`e2e/reload-flush.spec.ts`), em 4 de
 * 10. Com ele: 10 de 10, 10 de 10 e 30 de 30.
 *
 * ⚠️ O commit da escrita não basta se uma LEITURA do idb-keyval (auto-commit) ainda está em voo
 * no mesmo store: a readwrite espera as transações anteriores, a leitura só termina se a página
 * processar os eventos dela, e as duas morrem juntas (medido no Chromium; o Firefox não tranca).
 *
 * ⭐ Por que UMA transação: ela é atômica. Uma falha de quota aborta os `put` E os `delete`
 * juntos, então o `delete` nunca acontece sem o `put` que o justificava (o projeto não fica
 * sem a partição de blocos por causa de um `put` que falhou).
 *
 * ⚠️ Um `put` que LANÇA (valor que não clona, por exemplo) NÃO aborta a transação sozinho:
 * os pares pedidos antes dele seriam gravados pelo auto-commit, pela metade. Por isso o
 * `abort()` explícito antes de propagar o erro.
 *
 * ⚠️ O motivo de uma falha chega no evento `abort` (`transaction.error`), não no `error`
 * do pedido: quando o `error` borbulha até a transação, `transaction.error` ainda é `null`.
 * O `promisifyRequest` do idb-keyval rejeitava com esse `null`; aqui a rejeição leva o
 * erro de verdade (ex.: QuotaExceededError).
 *
 * O helper é LOCAL de propósito, sem importar nada novo do idb-keyval: o registro de mocks do
 * bun:test é global, e um export novo que um dos mocks da suíte não tenha quebra o linker só
 * na ordem de arquivos do CI ("Export named ... not found").
 */
export function writeInOneTransaction(store: UseStore, write: IdbWrite): Promise<void> {
  const puts = write.puts ?? []
  const deletes = write.deletes ?? []
  if (puts.length === 0 && deletes.length === 0) return Promise.resolve()
  return store('readwrite', (objectStore) => {
    const transaction = objectStore.transaction
    try {
      for (const [key, value] of puts) objectStore.put(value, key)
      for (const key of deletes) objectStore.delete(key)
    } catch (error) {
      abortQuietly(transaction)
      throw error
    }
    // `commit()` existe desde o Chromium 76, o Firefox 74 e o Safari 15. Sem ele, o
    // auto-commit continua valendo: é o comportamento de antes, não pior.
    if (typeof transaction.commit === 'function') transaction.commit()
    return transactionDone(transaction)
  })
}

/** Resolve no `complete`; rejeita no `abort` com o motivo que a transação guardou. */
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new DOMException('A gravação foi interrompida.', 'AbortError'))
  })
}

function abortQuietly(transaction: IDBTransaction): void {
  try {
    transaction.abort()
  } catch {
    // Já terminou: não há o que desfazer. O erro que importa é o do `put`, propagado
    // por quem chamou.
  }
}
