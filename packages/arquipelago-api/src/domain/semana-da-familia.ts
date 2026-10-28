import {
  DIAS_DA_SEMANA_DA_FAMILIA,
  diaDeSaoPaulo,
  ILHAS,
  type IlhaId,
  ilha,
  ilhaAberta,
  migrarSalvamento,
  type SemanaDaCrianca,
} from '@sistemazero/arquipelago-contracts'

/**
 * A semana de cada criança para a área dos pais (28/10/2026, fase1-18), regra pura. A janela é
 * hoje e os 6 dias anteriores, no dia de São Paulo (o mesmo dia do tempo livre).
 */
export interface Janela {
  inicio: string
  fim: string
}

const DIA_MS = 86_400_000

/** Hoje e os 6 dias anteriores (contados pelo calendário, sem depender do fuso do servidor). */
export function janelaDaSemana(agora: Date): Janela {
  const fim = diaDeSaoPaulo(agora)
  const meioDia = Date.parse(`${fim}T12:00:00Z`)
  const inicio = new Date(meioDia - (DIAS_DA_SEMANA_DA_FAMILIA - 1) * DIA_MS)
    .toISOString()
    .slice(0, 10)
  return { inicio, fim }
}

export function dentroDaJanela(dia: string, janela: Janela): boolean {
  return dia >= janela.inicio && dia <= janela.fim
}

/** A posição (1 a 8) da ilha mais nova aberta para quem está nesta posição da jornada. */
export function posicaoDaIlhaMaisNova(posicao: number): number {
  return Math.max(0, ...ILHAS.filter((i) => ilhaAberta(i.id, posicao)).map((i) => i.posicao))
}

/**
 * Desafios aprovados (o principal passou) na janela e, quando a jornada da criança é conhecida,
 * quantos deles são de ilhas antes da mais nova aberta para ela.
 */
export function desafiosDaSemana(
  conclusoes: readonly { concluidoEm: Date; ilha: IlhaId }[],
  janela: Janela,
  posicao: number | null,
): NonNullable<SemanaDaCrianca['desafios']> {
  const daSemana = conclusoes.filter((c) => dentroDaJanela(diaDeSaoPaulo(c.concluidoEm), janela))
  if (posicao === null) return { aprovados: daSemana.length, deIlhasAnteriores: null }
  const maisNova = posicaoDaIlhaMaisNova(posicao)
  return {
    aprovados: daSemana.length,
    deIlhasAnteriores: daSemana.filter((c) => ilha(c.ilha).posicao < maisNova).length,
  }
}

/** Projetos azuis com a aparência feita no Pinta e no Molda; `null` se o salvamento não abre. */
export function objetosCriados(dados: unknown): SemanaDaCrianca['objetos'] {
  const salvamento = migrarSalvamento(dados)
  if (!salvamento) return null
  let pinta = 0
  let molda = 0
  for (const projeto of Object.values(salvamento.projetos)) {
    if (projeto?.aparencia?.origem === 'pinta') pinta += 1
    else if (projeto?.aparencia?.origem === 'molda') molda += 1
  }
  return { pinta, molda }
}
