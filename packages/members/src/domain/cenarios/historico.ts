import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'

export interface PilhasDoHistorico {
  passado: number[]
  futuro: number[]
}
export interface MovimentoDoHistorico {
  acao: 'desfazer' | 'refazer'
  alvo: number
}
export interface PassoDoHistorico {
  revisao: number
  operacaoId: string
  comandos: ComandoDeCenario[]
  inversos: ComandoDeCenario[] | null
  autorId: string
  criadoEm: Date
}
export interface ResumoDoHistorico {
  revisao: number
  desfazer: number
  refazer: number
}

/** Pilhas de referências, nunca cópias de documentos. O registro de lotes é imutável. */
export function avancarHistorico(
  atual: PilhasDoHistorico,
  revisao: number,
  movimento?: MovimentoDoHistorico,
): PilhasDoHistorico | null {
  const passado = [...atual.passado],
    futuro = [...atual.futuro]
  if (!movimento) return { passado: [...passado, revisao].slice(-200), futuro: [] }
  const de = movimento.acao === 'desfazer' ? passado : futuro
  const para = movimento.acao === 'desfazer' ? futuro : passado
  if (de.at(-1) !== movimento.alvo) return null
  de.pop()
  para.push(movimento.alvo)
  return { passado, futuro }
}
