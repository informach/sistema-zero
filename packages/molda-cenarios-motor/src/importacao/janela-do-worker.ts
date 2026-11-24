/**
 * O Next (Turbopack) compila todo o código do cliente com `typeof window` trocado por "object",
 * inclusive o dos workers, e isso não se desliga. O three, ao carregar, faz
 * `if (typeof window !== 'undefined') window.__THREE__ = ...`: no worker a guarda some, `window`
 * não existe, a carga do módulo quebra e o worker fica mudo (nenhuma resposta, nenhum erro na
 * página: a importação ficava parada em "Conferindo"). Este módulo vem ANTES do three no worker
 * e dá a ele um `window` que é o próprio escopo do worker, o que as guardas esperavam achar.
 * Reconfigurável: o leitor de FBX troca por um substituto próprio enquanto lê.
 */
if (!('window' in globalThis))
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: globalThis,
  })

export {}
