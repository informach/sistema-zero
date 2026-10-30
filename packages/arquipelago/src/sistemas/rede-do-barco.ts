import { ILHAS, type IlhaId, ilhaAberta, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import type { PortoId } from './barco'

export const PAINEL_DO_BARCO = 'barco:'
// Vizinhança vem da geografia, sem depender da ordem editorial dos postos.
const anel = ilhasDoAnel().sort((a, b) => {
  if (a.angulo === null || b.angulo === null) throw new Error('Ilha do anel sem ângulo')
  return a.angulo - b.angulo
})
export const LIGACOES_DO_BARCO: readonly (readonly [PortoId, PortoId])[] = [
  ['sua-ilha', 'recife'],
  ...anel.map((ilha, i): readonly [PortoId, PortoId] => {
    const vizinha = anel[(i + 1) % anel.length]!
    if (ilha.id === 'farol' || vizinha.id === 'farol') throw new Error('Farol não é porto')
    return [ilha.id, vizinha.id]
  }),
]

export function ehPorto(id: string): id is PortoId {
  return ILHAS.some((i) => i.id === id && i.id !== 'farol')
}

export function ligacaoAberta(a: PortoId, b: PortoId, jornada: number): boolean {
  return (
    ilhaAberta('recife', jornada) &&
    ilhaAberta(a, jornada) &&
    ilhaAberta(b, jornada) &&
    LIGACOES_DO_BARCO.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  )
}

export function destinosDoPorto(origem: PortoId, jornada: number): PortoId[] {
  const destinos: PortoId[] = []
  for (const ilha of ILHAS)
    if (ilha.id !== 'farol' && ligacaoAberta(origem, ilha.id, jornada)) destinos.push(ilha.id)
  return destinos
}

export function portoDoPainel(painel: string | null): PortoId | null {
  if (!painel?.startsWith(PAINEL_DO_BARCO)) return null
  const id = painel.slice(PAINEL_DO_BARCO.length)
  return ehPorto(id) ? id : null
}

/** Prontidão transitória, nunca acesso nem visita conquistada. */
export function caisPronto(id: IlhaId, prontos: ReadonlySet<IlhaId>): boolean {
  return id === 'sua-ilha' || prontos.has(id)
}
