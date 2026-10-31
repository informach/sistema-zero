import {
  BIT_DO_FOSSIL,
  diaDeSaoPaulo,
  FOSSEIS_DO_VALE,
  type FossilDoVale,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/**
 * Os fósseis do museu (B4, 31/10/2026; a proposta: "escavar", "montar o museu dos fósseis",
 * "museu para completar", "tempo real, algo novo todo dia"). Depois do primeiro osso, a escavação
 * do Vale mostra um fóssil novo por dia, a contar do dia em que o museu chegou: quem demora não
 * perde nada, os que ficaram para trás esperam na areia, um de cada vez. Cada um vai para o museu
 * de casa. O salvamento guarda um bit por fóssil (`vale.fosseis`, V22).
 */
export const NOME_DO_FOSSIL: Readonly<Record<FossilDoVale, string>> = {
  'fossil-dente': 'Dente de dinossauro',
  'fossil-garra': 'Garra fóssil',
  'fossil-vertebra': 'Vértebra fóssil',
  'fossil-ovo': 'Ovo fóssil',
  'fossil-chifre-triceratopo': 'Chifre de tricerátopo',
  'fossil-cranio-rex': 'Crânio de rex',
}

export const TEXTOS_DOS_FOSSEIS = {
  escavar: 'Escavar o fóssil novo',
  achou: (nome: string) => `Você achou: ${nome}. Ele já está no museu da sua casa.`,
  amanha: 'A areia muda de um dia para o outro. Amanhã aparece outro fóssil aqui.',
  todos: 'Os seis fósseis estão no museu da sua casa. A Jade ficou orgulhosa.',
  noMuseu: 'No museu',
  naAreia: 'Na escavação do Vale, um por dia depois do primeiro osso.',
} as const

const DIA = 24 * 60 * 60 * 1000
const diaEmMs = (d: string) => Date.parse(`${d}T00:00:00Z`)

export function achouFossil(s: Salvamento, id: FossilDoVale): boolean {
  return (s.vale.fosseis & BIT_DO_FOSSIL[id]) !== 0
}

export function fosseisAchados(s: Salvamento): FossilDoVale[] {
  return FOSSEIS_DO_VALE.filter((id) => achouFossil(s, id))
}

/** Quantos fósseis a areia já mostrou: um no dia em que o museu chegou e mais um a cada dia. */
export function fosseisLiberados(s: Salvamento, agora: Date): number {
  const museu = s.projetos.museu
  if (!museu || s.vale.escavacao < 3) return 0
  const dias = Math.round(
    (diaEmMs(diaDeSaoPaulo(agora)) - diaEmMs(diaDeSaoPaulo(new Date(museu.ganhoEm)))) / DIA,
  )
  return Math.max(0, Math.min(FOSSEIS_DO_VALE.length, dias + 1))
}

/** O fóssil esperando na areia agora (o primeiro ainda não achado entre os liberados), ou `null`. */
export function fossilNaAreia(s: Salvamento, agora: Date): FossilDoVale | null {
  const liberados = FOSSEIS_DO_VALE.slice(0, fosseisLiberados(s, agora))
  return liberados.find((id) => !achouFossil(s, id)) ?? null
}

/** Escavar o fóssil que espera na areia: ele entra no museu. */
export function escavarFossil(
  s: Salvamento,
  agora: Date,
  podeAgir: boolean,
): { salvamento: Salvamento; fossil: FossilDoVale } | null {
  const fossil = podeAgir ? fossilNaAreia(s, agora) : null
  if (!fossil) return null
  return {
    salvamento: { ...s, vale: { ...s.vale, fosseis: s.vale.fosseis | BIT_DO_FOSSIL[fossil] } },
    fossil,
  }
}
