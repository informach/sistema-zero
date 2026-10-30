import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'

export type Festa = 'carnaval' | 'junina' | 'lanternas' | 'fim-de-ano'
/** Só as janelas aprovadas ligam o mundo. Propostas não são datas em vigor. */
export const CALENDARIO_DAS_FESTAS = {
  carnaval: {
    diasAntesDaPascoa: 47,
    diasAntesDaTerca: 3,
    motivo: 'De sábado à terça de Carnaval (a dona aprovou em 29/10/2026).',
  },
  junina: { de: '06-01', ate: '06-30', motivo: 'Junho inteiro, como definido na proposta.' },
  'fim-de-ano': {
    de: '12-20',
    ate: '01-06',
    motivo: 'De 20 de dezembro a 6 de janeiro (a dona aprovou em 30/10/2026).',
  },
  lanternas: { data: null, motivo: 'A proposta não define a data; aguarda a dona.' },
} as const

export const NOMES_DAS_FESTAS: Record<Festa, string> = {
  carnaval: 'Carnaval',
  junina: 'Festa Junina',
  lanternas: 'Noite das Lanternas',
  'fim-de-ano': 'Festa de fim de ano',
}

/** Computus gregoriano, devolve o dia civil sem depender do fuso da máquina. */
export function pascoaDoAno(ano: number): string {
  if (!Number.isInteger(ano) || ano < 1583 || ano > 9999)
    throw new RangeError('Ano fora do calendário gregoriano')
  const a = ano % 19,
    b = Math.floor(ano / 100),
    c = ano % 100
  const d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function carnavalDoAno(ano: number): string {
  const data = new Date(`${pascoaDoAno(ano)}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() - CALENDARIO_DAS_FESTAS.carnaval.diasAntesDaPascoa)
  return data.toISOString().slice(0, 10)
}

/** O sábado em que o Carnaval começa (três dias antes da terça). */
export function sabadoDeCarnaval(ano: number): string {
  const data = new Date(`${carnavalDoAno(ano)}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() - CALENDARIO_DAS_FESTAS.carnaval.diasAntesDaTerca)
  return data.toISOString().slice(0, 10)
}

export function festaDoDia(data: Date): Festa | null {
  if (!Number.isFinite(data.getTime())) return null
  const dia = diaDeSaoPaulo(data),
    ano = Number(dia.slice(0, 4)),
    mesDia = dia.slice(5)
  if (ano >= 1583 && dia >= sabadoDeCarnaval(ano) && dia <= carnavalDoAno(ano)) return 'carnaval'
  const junina = CALENDARIO_DAS_FESTAS.junina
  if (mesDia >= junina.de && mesDia <= junina.ate) return 'junina'
  // O fim de ano atravessa a virada: do fim de dezembro ao começo de janeiro.
  const fim = CALENDARIO_DAS_FESTAS['fim-de-ano']
  return mesDia >= fim.de || mesDia <= fim.ate ? 'fim-de-ano' : null
}

export function lerFesta(texto: string | null): Festa | null {
  return texto && Object.hasOwn(NOMES_DAS_FESTAS, texto) ? (texto as Festa) : null
}

export const PAINEL_DA_FOGUEIRA = 'fogueira-da-festa'
export const avisoDaFesta = (festa: Festa) =>
  `${NOMES_DAS_FESTAS[festa]} chegou à Vila Doce. Ela volta todo ano.`
export const chaveDoAvisoDaFesta = (perfil: string, festa: Festa) =>
  `arquipelago:festa:${encodeURIComponent(perfil)}:${festa}`
