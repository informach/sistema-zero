import { setTimeout as esperar } from 'node:timers/promises'

/** waitForFunction aceita uma Promise como valor verdadeiro antes de sua resolução.
 * Consultas ao host precisam conferir o resultado resolvido em cada tentativa. */
export async function esperarConsulta(pagina, predicado, argumento, { timeout = 30_000 } = {}) {
  const limite = performance.now() + timeout
  while (true) {
    const resultado = await pagina.evaluate(predicado, argumento)
    if (resultado) return resultado
    if (performance.now() >= limite)
      throw new Error('A consulta assíncrona não confirmou o estado esperado no prazo.')
    await esperar(Math.min(50, Math.max(1, limite - performance.now())))
  }
}
