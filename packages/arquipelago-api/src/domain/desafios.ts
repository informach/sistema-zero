import { createHash } from 'node:crypto'
import { diaDeSaoPaulo, type SituacaoParaAPessoa } from '@sistemazero/arquipelago-contracts'

/**
 * As regras puras de quem joga um desafio (decisão de 27/10/2026):
 * - feito continua feito (não recalcula nada depois de concluído);
 * - a ilha precisa estar aberta pelo posto;
 * - todos os blocos exigidos precisam estar entre os conquistados nos cursos;
 * - na linguagem do posto (Python, Ponte, Pro), o curso-base do posto concluído (§6.28, A3).
 */
export function situacaoDoDesafio(e: {
  concluido: boolean
  ilhaAberta: boolean
  blocosExigidos: readonly string[]
  blocos: ReadonlySet<string> | 'todos'
  /** Desafio na linguagem do posto sem o curso-base do posto concluído. */
  faltaCurso?: boolean
}): { situacao: SituacaoParaAPessoa; faltam: string[] } {
  if (e.concluido) return { situacao: 'concluido', faltam: [] }
  if (!e.ilhaAberta) return { situacao: 'ilha-fechada', faltam: [] }
  if (e.faltaCurso) return { situacao: 'falta-curso', faltam: [] }
  const blocos = e.blocos
  const faltam = blocos === 'todos' ? [] : e.blocosExigidos.filter((b) => !blocos.has(b))
  return { situacao: faltam.length > 0 ? 'faltam-blocos' : 'disponivel', faltam }
}

/** Passou de verdade: todos os obrigatórios passaram (sem obrigatório, nunca passa). */
export function passouNosObrigatorios(
  objetivos: readonly { id: string; optional?: true }[],
  resultados: readonly { id: string; passou: boolean }[],
): { principal: boolean; extra: boolean } {
  const passou = new Map(resultados.map((r) => [r.id, r.passou]))
  const obrigatorios = objetivos.filter((o) => !o.optional)
  const extras = objetivos.filter((o) => o.optional)
  return {
    principal: obrigatorios.length > 0 && obrigatorios.every((o) => passou.get(o.id) === true),
    extra: extras.length > 0 && extras.every((o) => passou.get(o.id) === true),
  }
}

/** Espaço de nomes das chaves de moedas do Arquipélago (UUIDv5 fixo). */
const NAMESPACE = 'a3f1c2d4-5b6e-4f70-8a91-b2c3d4e5f607'

/**
 * A chave única das moedas de um desafio (UUIDv5 de jogador + desafio + qual prêmio). A mesma
 * conclusão, repetida ou reenviada, sempre manda a mesma chave: a porta do Members não paga duas.
 */
export function chaveDasMoedas(
  jogadorId: string,
  desafioId: string,
  premio: 'principal' | 'extra',
): string {
  const ns = Buffer.from(NAMESPACE.replaceAll('-', ''), 'hex')
  const hash = createHash('sha1').update(ns).update(`${jogadorId}:${desafioId}:${premio}`).digest()
  const b = Buffer.from(hash.subarray(0, 16))
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x50
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80
  const h = b.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * A semana das moedas do jogo: a segunda-feira (dia civil de São Paulo, `AAAA-MM-DD`) que a abre.
 * É a mesma semana do teto do Members (`date_trunc('week', …)` em São Paulo, de segunda a domingo).
 */
export function semanaDeSaoPaulo(agora: Date): string {
  const dia = new Date(`${diaDeSaoPaulo(agora)}T12:00:00Z`)
  const desdeSegunda = (dia.getUTCDay() + 6) % 7
  dia.setUTCDate(dia.getUTCDate() - desdeSegunda)
  return dia.toISOString().slice(0, 10)
}
