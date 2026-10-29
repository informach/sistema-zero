import {
  type Canteiro,
  type CasaDoIrmao,
  CasaDoIrmaoSchema,
  type IrmaoParaOJogo,
  type IrmaosParaOJogo,
  IrmaosParaOJogoSchema,
  type ObjetoDaCasa,
  type Obra,
  type PercursoId,
  type QuartoDoJogo,
  type ResultadoDoPercurso,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { formatarTempo } from './percurso'

/**
 * Recordes da família e visitas (fase3-12, 29/10/2026, regras puras). Os irmãos e a casa de cada
 * um vêm do serviço do jogo (com o nome posto pelo BFF); a permissão é a `visitasDeIrmaos` dos
 * responsáveis. Na visita, o jogo desenha a casa, o quintal e a horta do irmão e não grava nada.
 * Plano: `docs/plans/2026-10-29-arquipelago-recordes-e-visitas.md`; regras: §6.20.
 */

/** O valor de `painelAberto` do painel das visitas. */
export const PAINEL_DAS_VISITAS = 'visitas'

/** A visita em andamento: o irmão e o que a casa dele mostra (nada mais do salvamento dele). */
export interface Visita {
  perfilId: string
  nome: string
  obra: Obra | null
  horta: readonly Canteiro[]
  completos: readonly ObjetoDaCasa[]
}

/**
 * O quarto de dentro na visita: vazio. O quarto real é da plataforma (o Members) e o serviço do
 * jogo não o lê; mostrar o dela na casa do irmão confundiria (decisão no plano).
 */
export const QUARTO_DA_VISITA: QuartoDoJogo = Object.freeze({
  theme: 'padrao',
  placedItems: [],
  pet: null,
}) as QuartoDoJogo

/** Onde a criança chega (e volta): em frente ao lote da casa, olhando para ela. */
export const CHEGADA_DA_VISITA = { x: 2.5, z: 11, olhar: Math.PI } as const

export const TEXTOS_DAS_VISITAS = {
  titulo: 'Visitar um irmão',
  explica: 'Veja a casa e o quintal de um irmão. Na casa dele, você só olha.',
  carregando: 'Procurando os irmãos.',
  foraDoAr: 'As visitas não carregaram agora. Tente de novo daqui a pouco.',
  desligadas: 'As visitas entre irmãos estão desligadas. Quem decide são os responsáveis.',
  ninguem: 'Ainda não há irmãos jogando o Arquipélago nesta conta.',
  casaNaoAbriu: 'Não deu para abrir esta casa agora.',
  verCasa: 'Ver a casa',
  abrindo: 'Abrindo a casa',
  semCasaAinda: 'Ainda mora na casa de antes.',
  comCasa: 'Já construiu a casa.',
  voltar: 'Voltar para a minha casa',
  tentarDeNovo: 'Tentar de novo',
  recordesTitulo: 'Recordes da família',
  recordesCarregando: 'Lendo os recordes da família.',
  recordesForaDoAr: 'Os recordes da família não carregaram agora.',
  aindaNaoCorreu: 'Ainda não correu',
  voce: 'Você',
} as const

/** A faixa no alto durante a visita. */
export function faixaDaVisita(nome: string): string {
  return `Você está na casa de ${nome}. Aqui você só olha.`
}

/** O que o Zappy diz ao voltar. */
export const FALA_DA_VOLTA = 'De volta para a sua casa.'

// ── As leituras ─────────────────────────────────────────────────────────────────────────────────

export type LeituraDosIrmaos =
  | { tipo: 'ok'; irmaos: readonly IrmaoParaOJogo[] }
  | { tipo: 'desligado' }
  | { tipo: 'fora-do-ar' }

/**
 * A resposta de `GET /irmaos` (do BFF, com o nome). Fora do contrato, versão que não conhece ou
 * qualquer status que não seja 200 conta como "não carregou".
 */
export function leituraDosIrmaos(status: number, corpo: unknown): LeituraDosIrmaos {
  if (status !== 200) return { tipo: 'fora-do-ar' }
  const lido = IrmaosParaOJogoSchema.safeParse(corpo)
  if (!lido.success) return { tipo: 'fora-do-ar' }
  if (lido.data.situacao === 'desligado') return { tipo: 'desligado' }
  return { tipo: 'ok', irmaos: lido.data.irmaos }
}

export type LeituraDaCasa =
  | { tipo: 'ok'; casa: CasaDoIrmao }
  | { tipo: 'desligado' }
  | { tipo: 'nao-abriu' }

/** A resposta de `GET /irmaos/:perfilId/casa`: 403 `VISITAS_DESLIGADAS` diz que desligaram. */
export function leituraDaCasa(status: number, corpo: unknown, perfilId: string): LeituraDaCasa {
  if (status === 403 && codigoDoErro(corpo) === 'VISITAS_DESLIGADAS') return { tipo: 'desligado' }
  if (status !== 200) return { tipo: 'nao-abriu' }
  const lido = CasaDoIrmaoSchema.safeParse(corpo)
  if (!lido.success || lido.data.perfilId !== perfilId) return { tipo: 'nao-abriu' }
  return { tipo: 'ok', casa: lido.data }
}

function codigoDoErro(corpo: unknown): string | null {
  const erro = (corpo as { error?: { code?: unknown } } | null)?.error
  return typeof erro?.code === 'string' ? erro.code : null
}

/** A visita a partir do irmão escolhido e da casa que o serviço mandou. */
export function visitaDaCasa(
  irmao: Pick<IrmaoParaOJogo, 'perfilId' | 'nome'>,
  casa: CasaDoIrmao,
): Visita {
  return {
    perfilId: irmao.perfilId,
    nome: irmao.nome,
    obra: casa.obra,
    horta: casa.horta,
    completos: casa.completos,
  }
}

// ── O que o mundo desenha ───────────────────────────────────────────────────────────────────────

interface EstadoComVisita {
  visita: Visita | null
  salvamento: Salvamento
}

/** A obra da casa que aparece: a do irmão na visita, a dela fora. */
export function obraVisivel(s: EstadoComVisita): Obra | null {
  return s.visita ? s.visita.obra : s.salvamento.construcao.casa
}

/** A horta que aparece. */
export function hortaVisivel(s: EstadoComVisita): readonly Canteiro[] {
  return s.visita ? s.visita.horta : s.salvamento.horta
}

/** O objeto aparece com o modelo (tem aparência) ou como holograma. */
export function objetoCompleto(s: EstadoComVisita, objeto: ObjetoDaCasa): boolean {
  return s.visita
    ? s.visita.completos.includes(objeto)
    : Boolean(s.salvamento.projetos[objeto]?.aparencia)
}

// ── Os recordes da família ──────────────────────────────────────────────────────────────────────

export interface LinhaDoRecorde {
  /** `voce` ou o perfil do irmão. */
  id: string
  nome: string
  ehVoce: boolean
  /** O melhor tempo ("1:02,3"), ou `null` se ainda não correu. */
  tempo: string | null
  ms: number | null
  /** Quantas das três estrelas já ganhou ali. */
  estrelas: number
}

function linha(
  id: string,
  nome: string,
  ehVoce: boolean,
  r: ResultadoDoPercurso | undefined,
): LinhaDoRecorde {
  const e = r?.estrelas
  return {
    id,
    nome,
    ehVoce,
    tempo: r ? formatarTempo(r.melhorTempoMs) : null,
    ms: r ? r.melhorTempoMs : null,
    estrelas: e ? Number(e.chegada) + Number(e.tempo) + Number(e.vagalumes) : 0,
  }
}

/**
 * Os recordes de UM percurso: ela e cada irmão, do melhor tempo para o maior; quem ainda não
 * correu vem no fim. No empate, ela vem antes.
 */
export function recordesDaFamilia(
  percurso: PercursoId,
  meu: ResultadoDoPercurso | undefined,
  irmaos: readonly IrmaoParaOJogo[],
): LinhaDoRecorde[] {
  const linhas = [
    linha('voce', TEXTOS_DAS_VISITAS.voce, true, meu),
    ...irmaos.map((i) => linha(i.perfilId, i.nome, false, i.percursos[percurso])),
  ]
  return linhas.sort((a, b) => {
    if (a.ms === null || b.ms === null) return a.ms === null ? (b.ms === null ? 0 : 1) : -1
    return a.ms - b.ms || Number(b.ehVoce) - Number(a.ehVoce)
  })
}

export type { IrmaosParaOJogo }
