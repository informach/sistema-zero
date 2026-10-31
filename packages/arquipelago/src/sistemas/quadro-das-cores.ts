import {
  type DesafioNaLista,
  type DesafiosDoJogador,
  DesafiosDoJogadorSchema,
  type IlhaId,
  QUADROS_POR_ILHA,
} from '@sistemazero/arquipelago-contracts'

/**
 * O Quadro das Cores de uma ilha (regra pura, sem React): seis quadros, cada um com o desafio que a
 * equipe cadastrou para ele. A situação de cada desafio vem do serviço do jogo (ilha aberta, blocos
 * da pessoa, feito continua feito); aqui só se arruma para a tela e para o quadro no mundo.
 */
export type EstadoDoQuadro = 'feito' | 'disponivel' | 'trancado' | 'vazio'

export interface Quadro {
  numero: number
  estado: EstadoDoQuadro
  desafio: DesafioNaLista | null
}

export function estadoDoDesafio(d: DesafioNaLista): EstadoDoQuadro {
  if (d.situacao === 'concluido') return 'feito'
  if (d.situacao === 'disponivel') return 'disponivel'
  return 'trancado'
}

/** Os seis quadros da ilha, na ordem (quadro sem desafio publicado fica `vazio`). */
export function quadrosDaIlha(desafios: readonly DesafioNaLista[], ilha: IlhaId): Quadro[] {
  const porNumero = new Map<number, DesafioNaLista>()
  for (const d of desafios) {
    if (d.ilha !== ilha || d.tipo !== 'quadro-das-cores' || d.quadro === null) continue
    if (!porNumero.has(d.quadro)) porNumero.set(d.quadro, d)
  }
  return Array.from({ length: QUADROS_POR_ILHA }, (_, i) => {
    const desafio = porNumero.get(i + 1) ?? null
    return { numero: i + 1, desafio, estado: desafio ? estadoDoDesafio(desafio) : 'vazio' }
  })
}

/** Quais das seis manchas de tinta acendem (a mancha `cor-N` é o quadro N). */
export function manchasAcesas(quadros: readonly Quadro[]): boolean[] {
  return quadros.map((q) => q.estado === 'feito')
}

/** Quadros que acabaram de ficar feitos entre duas leituras (para a festa da cor). */
export function novosFeitos(antes: readonly Quadro[], depois: readonly Quadro[]): number[] {
  const feitosAntes = new Set(antes.filter((q) => q.estado === 'feito').map((q) => q.numero))
  return depois
    .filter((q) => q.estado === 'feito' && !feitosAntes.has(q.numero))
    .map((q) => q.numero)
}

/**
 * O desafio do dia (28/10/2026): o serviço escolhe e guarda um por dia de São Paulo (`doDia`). Aqui
 * só se acha o desafio na lista para o cartão "Desafio de hoje" em cima dos seis quadros.
 */
export type EstadoDoDia = 'pronto' | 'feito' | 'nenhum'

export function desafioDeHoje(dados: DesafiosDoJogador): {
  estado: EstadoDoDia
  desafio: DesafioNaLista | null
} {
  const doDia = dados.doDia
  const desafio = doDia ? (dados.desafios.find((d) => d.id === doDia.id) ?? null) : null
  if (!doDia || !desafio) return { estado: 'nenhum', desafio: null }
  return { estado: doDia.feito ? 'feito' : 'pronto', desafio }
}

/** A fala do Zappy quando há desafio do dia por fazer (uma vez por dia). */
export const AVISO_DO_DIA = 'Tem desafio novo hoje no Quadro das Cores.'

/** O dia a avisar (e guardar), ou null: já avisou hoje, já fez ou não há desafio de hoje. */
export function diaParaAvisar(dados: DesafiosDoJogador, ultimoAviso: string | null): string | null {
  const hoje = desafioDeHoje(dados)
  if (hoje.estado !== 'pronto' || !dados.doDia) return null
  return dados.doDia.dia === ultimoAviso ? null : dados.doDia.dia
}

/** A resposta do serviço conferida pelo contrato (formato estranho conta como indisponível). */
export function lerDesafios(corpo: unknown): DesafiosDoJogador | null {
  const lido = DesafiosDoJogadorSchema.safeParse(corpo)
  return lido.success ? lido.data : null
}

/** Por que o quadro não abriu (cada motivo tem a sua frase na tela). */
export type MotivoDoQuadroFechado = 'desligado' | 'fora-do-ar'

export function motivoDoErro(status: number, corpo: unknown): MotivoDoQuadroFechado {
  const codigo = (corpo as { error?: { code?: unknown } } | null)?.error?.code
  if (status === 403 && (codigo === 'DESAFIOS_DESLIGADOS' || codigo === 'ACESSO_BLOQUEADO'))
    return 'desligado'
  return 'fora-do-ar'
}

/**
 * O que o quadro diz sobre um desafio trancado (o que falta e onde aprender). `faltaCurso`: o
 * desafio na linguagem do posto espera o curso-base do posto (§6.28, A3).
 */
export function oQueFalta(d: DesafioNaLista): {
  ilhaFechada: boolean
  faltaCurso: boolean
  cursos: string[]
} {
  if (d.situacao === 'ilha-fechada') return { ilhaFechada: true, faltaCurso: false, cursos: [] }
  if (d.situacao === 'falta-curso')
    return {
      ilhaFechada: false,
      faltaCurso: true,
      cursos: [...new Set((d.aprenda ?? []).map((c) => c.titulo))],
    }
  const cursos: string[] = []
  for (const falta of d.faltam) {
    const primeiro = falta.cursos[0]
    if (primeiro && !cursos.includes(primeiro.titulo)) cursos.push(primeiro.titulo)
  }
  return { ilhaFechada: false, faltaCurso: false, cursos }
}

/** "Aprenda isso em" do desafio que já se pode fazer (A24): o curso que ele retoma, se houver. */
export function ondeAprender(d: DesafioNaLista): string | null {
  const curso = d.aprenda?.[0]
  return curso ? `Aprenda isso em: ${curso.titulo}` : null
}
