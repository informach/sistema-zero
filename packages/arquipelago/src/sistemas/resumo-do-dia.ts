/**
 * O resumo do dia (N06, regras puras): "decora e dorme: resumo do dia", na sessão de exemplo da
 * proposta, e no adulto "o resumo do dia continua, para fechar a sessão com calma". Uma foto do
 * salvamento no começo do dia (guardada no aparelho, por perfil) e o salvamento de agora: o
 * resumo diz só o que mudou de bom, nunca o que faltou. Sem campo novo no salvamento.
 */
import {
  ILHAS,
  type IlhaId,
  MORADORES_DO_ANEL,
  OBJETOS_DA_CASA,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { NOMES_DOS_CONVIDADOS } from './visitas-dos-moradores'

/** Os nomes no resumo: os convidáveis e o Nico, que já mora na sua ilha (A19). */
const NOMES_DOS_MORADORES = { ...NOMES_DOS_CONVIDADOS, nico: 'Nico' } as const

/** O que a foto guarda: só números e listas pequenas (cabe no armazenamento do aparelho). */
export interface FotoDoDia {
  dia: string
  lumis: number
  estrelas: number
  coracoes: Partial<Record<(typeof MORADORES_DO_ANEL)[number], number>>
  projetos: string[]
  ilhasVisitadas: number
  pontesVistas: string[]
  chaves: number
  segredos: number
  constelacoes: number
}

const contarBits = (n: number) => {
  let c = 0
  for (let x = n; x > 0; x >>>= 1) c += x & 1
  return c
}

export function fotoDoDia(s: Salvamento, dia: string): FotoDoDia {
  let estrelas = 0
  for (const r of Object.values(s.percursos))
    if (r)
      estrelas +=
        Number(r.estrelas.chegada) + Number(r.estrelas.tempo) + Number(r.estrelas.vagalumes)
  const coracoes: FotoDoDia['coracoes'] = {}
  for (const m of MORADORES_DO_ANEL) coracoes[m] = Math.floor(s.moradores[m].amizade / 100)
  return {
    dia,
    lumis: Object.values(s.lumis).reduce((a, n) => a + (n ?? 0), 0),
    estrelas,
    coracoes,
    projetos: OBJETOS_DA_CASA.filter((o) => s.projetos[o]),
    ilhasVisitadas: s.ilhasVisitadas,
    pontesVistas: [...s.pontesVistas],
    chaves: s.chaves,
    segredos: s.segredos,
    constelacoes: s.nuvens.constelacoes,
  }
}

/** Lê a foto guardada; só vale se for de hoje e tiver o formato esperado. */
export function lerFotoDoDia(texto: string | null, dia: string): FotoDoDia | null {
  if (!texto) return null
  try {
    const f = JSON.parse(texto) as Partial<FotoDoDia>
    if (f.dia !== dia || typeof f.lumis !== 'number' || !Array.isArray(f.projetos)) return null
    return f as FotoDoDia
  } catch {
    return null
  }
}

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>
const NOME_DO_OBJETO: Readonly<Record<string, string>> = {
  geladeira: 'a geladeira',
  forno: 'o forno',
  aquario: 'o aquário',
  lareira: 'a lareira',
  banda: 'os instrumentos da banda',
  fliperama: 'o fliperama',
  museu: 'o museu',
  casinha: 'a casinha do bicho',
  'planta-interior': 'a planta de dentro de casa',
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`)

/**
 * As linhas do resumo: o que ela fez hoje, de bom, em frases curtas. Lista vazia quando nada mudou
 * (o painel então só deseja boa noite).
 */
export function resumoDoDia(antes: FotoDoDia, s: Salvamento, hoje: string): string[] {
  const agora = fotoDoDia(s, hoje)
  const linhas: string[] = []
  const lumis = agora.lumis - antes.lumis
  if (lumis > 0) linhas.push(`${plural(lumis, 'Lumi preso', 'Lumis presos')} com a lanterna.`)
  const estrelas = agora.estrelas - antes.estrelas
  if (estrelas > 0)
    linhas.push(`${plural(estrelas, 'estrela nova', 'estrelas novas')} nos percursos.`)
  const entregues = MORADORES_DO_ANEL.filter((m) => {
    const p = s.moradores[m].pedido
    return p !== null && p.dia === hoje && p.entregue
  })
  if (entregues.length > 0)
    linhas.push(
      `${plural(entregues.length, 'pedido entregue', 'pedidos entregues')}: ${entregues.map((m) => NOMES_DOS_MORADORES[m]).join(', ')}.`,
    )
  for (const m of MORADORES_DO_ANEL) {
    const mais = (agora.coracoes[m] ?? 0) - (antes.coracoes[m] ?? 0)
    if (mais > 0)
      linhas.push(
        `${plural(mais, 'coração novo', 'corações novos')} com ${NOMES_DOS_MORADORES[m]}.`,
      )
  }
  for (const o of agora.projetos)
    if (!antes.projetos.includes(o)) linhas.push(`Projeto azul novo: ${NOME_DO_OBJETO[o] ?? o}.`)
  for (const i of agora.pontesVistas)
    if (!antes.pontesVistas.includes(i)) {
      const artigo = i === 'vila-doce' || i === 'nuvens' ? 'a' : 'o'
      linhas.push(`A ponte para ${artigo} ${NOME_DA_ILHA[i as IlhaId] ?? i} ficou pronta.`)
    }
  const ilhas = contarBits(agora.ilhasVisitadas & ~antes.ilhasVisitadas)
  if (ilhas > 0)
    linhas.push(`${plural(ilhas, 'ilha visitada', 'ilhas visitadas')} pela primeira vez.`)
  const chaves = contarBits(agora.chaves & ~antes.chaves)
  if (chaves > 0) linhas.push(`${plural(chaves, 'chave achada', 'chaves achadas')} na sua ilha.`)
  const segredos = contarBits(agora.segredos & ~antes.segredos)
  if (segredos > 0) linhas.push(`${plural(segredos, 'segredo achado', 'segredos achados')}.`)
  const constelacoes = contarBits(agora.constelacoes & ~antes.constelacoes)
  if (constelacoes > 0)
    linhas.push(`${plural(constelacoes, 'constelação descoberta', 'constelações descobertas')}.`)
  return linhas
}

/**
 * A horta cresce no tempo de verdade (horas), não no dia do jogo: dormir na cama não adianta a
 * colheita, fechar o jogo também não atrasa (A14).
 */
export const BOA_NOITE =
  'A horta cresce no tempo de verdade, mesmo com o jogo fechado. Nada se perde.'
