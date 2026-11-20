/**
 * Memória que só existe durante uma validação (síncrona). Validar um documento com milhares de
 * objetos apoiados no mesmo rio ou na mesma cerca reconstruía a superfície da água ou a
 * estrutura do caminho uma vez por objeto; aqui cada uma é calculada uma vez por validação.
 * Fora de `comMemoriaDaValidacao`, `lembrar` só calcula: nenhum dado velho sobrevive à
 * validação, mesmo que o chamador mude o documento depois.
 */
let ativa: WeakMap<object, Map<unknown, unknown>> | null = null

export function comMemoriaDaValidacao<T>(validar: () => T): T {
  if (ativa) return validar()
  ativa = new WeakMap()
  try {
    return validar()
  } finally {
    ativa = null
  }
}

export function lembrar<T>(objeto: object, chave: unknown, calcular: () => T): T {
  if (!ativa) return calcular()
  let doObjeto = ativa.get(objeto)
  if (!doObjeto) {
    doObjeto = new Map()
    ativa.set(objeto, doObjeto)
  }
  if (doObjeto.has(chave)) return doObjeto.get(chave) as T
  const valor = calcular()
  doObjeto.set(chave, valor)
  return valor
}
