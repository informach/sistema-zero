/** LCG de 32 bits: a sequência é parte do contrato de autoria, não do relógio ou do renderer. */
export function criarSorteio(semente: number): () => number {
  if (!Number.isSafeInteger(semente))
    throw new RangeError('A semente precisa ser um inteiro seguro')
  let estado = semente >>> 0
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0
    return estado / 0x100000000
  }
}
