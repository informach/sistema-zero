/**
 * Executa `worker` sobre `items` com concorrência limitada (default 5) e devolve os
 * resultados na ORDEM dos itens. Usado por ações em lote no painel — evita disparar
 * N requisições de uma vez (sobrecarrega o gateway) mantendo o lote rápido. Cada
 * worker deve tratar o próprio erro (ex.: devolver um resultado tipado), pois uma
 * exceção não tratada rejeita o `mapPool` inteiro.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i] as T, i)
    }
  })
  await Promise.all(runners)
  return results
}
