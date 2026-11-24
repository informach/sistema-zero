import type { RotaDosCenarios } from '@sistemazero/molda-cenarios/oficina'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const idDoEndereco = (valor: string | null) =>
  valor && UUID.test(valor) ? valor.toLowerCase() : null

function retornoValido(valor: unknown, nivel = 0): RotaDosCenarios | undefined {
  if (nivel >= 8 || !valor || typeof valor !== 'object' || Array.isArray(valor)) return
  const v = valor as Record<string, unknown>,
    id = (k: string) => (typeof v[k] === 'string' ? idDoEndereco(v[k] as string) : null)
  const mundoId = id('mundoId'),
    cenarioId = id('cenarioId'),
    conjuntoId = id('conjuntoId')
  if (v.tela === 'inicio' && (v.aba === 'mundos' || v.aba === 'bibliotecas'))
    return { tela: 'inicio', aba: v.aba }
  if (v.tela === 'mundo' && mundoId) return { tela: 'mundo', mundoId }
  const bibliotecaId = v.bibliotecaId === 'molda' ? 'molda' : id('bibliotecaId')
  if (v.tela === 'biblioteca' && bibliotecaId)
    return {
      tela: 'biblioteca',
      bibliotecaId,
      ...(id('voltarAoMundo') ? { voltarAoMundo: id('voltarAoMundo')! } : {}),
    }
  if (v.tela === 'oficina' && mundoId && cenarioId) {
    const retorno = retornoValido(v.retorno, nivel + 1)
    return {
      tela: 'oficina',
      mundoId,
      cenarioId,
      ...(conjuntoId ? { conjuntoId } : {}),
      ...(retorno ? { retorno } : {}),
    }
  }
}

/** A fonte de um conjunto usa a mesma oficina; o retorno sobrevive a recarregar a página. */
export function rotaDoEndereco(consulta: URLSearchParams): RotaDosCenarios {
  const mundoId = idDoEndereco(consulta.get('mundo')),
    cenarioId = idDoEndereco(consulta.get('cenario'))
  const bibliotecaId =
    consulta.get('biblioteca') === 'molda' ? 'molda' : idDoEndereco(consulta.get('biblioteca'))
  if (mundoId && cenarioId) {
    const conjuntoId = idDoEndereco(consulta.get('conjunto')),
      texto = consulta.get('retorno')
    let retorno: RotaDosCenarios | undefined
    if (conjuntoId && texto && texto.length <= 4096)
      try {
        retorno = retornoValido(JSON.parse(texto))
      } catch {
        /* Uma consulta inválida não impede abrir a oficina. */
      }
    return {
      tela: 'oficina',
      mundoId,
      cenarioId,
      ...(conjuntoId ? { conjuntoId } : {}),
      ...(retorno ? { retorno } : {}),
    }
  }
  if (bibliotecaId)
    return { tela: 'biblioteca', bibliotecaId, ...(mundoId ? { voltarAoMundo: mundoId } : {}) }
  if (mundoId) return { tela: 'mundo', mundoId }
  return { tela: 'inicio', aba: consulta.get('aba') === 'bibliotecas' ? 'bibliotecas' : 'mundos' }
}

export function enderecoDaRota(rota: RotaDosCenarios, espacoId: string): string {
  const consulta = new URLSearchParams({ espaco: espacoId })
  if (rota.tela === 'oficina') {
    consulta.set('mundo', rota.mundoId)
    consulta.set('cenario', rota.cenarioId)
    if (rota.conjuntoId) {
      consulta.set('conjunto', rota.conjuntoId)
      const retorno = retornoValido(rota.retorno)
      if (retorno) {
        const texto = JSON.stringify(retorno)
        if (texto.length <= 4096) consulta.set('retorno', texto)
      }
    }
  } else if (rota.tela === 'mundo') consulta.set('mundo', rota.mundoId)
  else if (rota.tela === 'biblioteca') {
    consulta.set('biblioteca', rota.bibliotecaId)
    if (rota.voltarAoMundo) consulta.set('mundo', rota.voltarAoMundo)
  } else if (rota.aba === 'bibliotecas') consulta.set('aba', 'bibliotecas')
  return `?${consulta}`
}
