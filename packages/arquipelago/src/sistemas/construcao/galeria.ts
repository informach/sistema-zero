import {
  APARENCIAS_GUARDADAS_MAXIMO,
  type AparenciaDaGaleria,
  type AparenciaDoObjeto,
  aparenciaDaGaleria,
  type GaleriaDoJogador,
  GaleriaDoJogadorSchema,
  galeriaDoObjeto,
  MOEDAS_PADRAO,
  mesmaAparencia,
  type ObjetoDaCasa,
  type ProjetoAzul,
  SaldoInsuficienteSchema,
} from '@sistemazero/arquipelago-contracts'

/**
 * A galeria no jogo (fase1-13, 29/10/2026): o cartão "Da galeria" do painel do objeto e a troca
 * entre as aparências que ela já tem. Quem diz o que foi pago e o saldo é SEMPRE o serviço
 * (`GET /galeria`); o jogo só põe no salvamento a da galeria que o serviço confirmou.
 */

/** Usar uma aparência: vira a em uso e fica entre as guardadas (sem repetir, até o teto). */
export function usarAparencia(p: ProjetoAzul, a: AparenciaDoObjeto): ProjetoAzul {
  const guardadas = [...p.aparencias.filter((b) => !mesmaAparencia(a, b)), a]
  // No teto, sai a mais antiga (nunca a que acabou de entrar). A da galeria continua paga no
  // serviço e volta pela lista de "Suas aparências".
  while (guardadas.length > APARENCIAS_GUARDADAS_MAXIMO) {
    const i = guardadas.findIndex((b) => !mesmaAparencia(a, b))
    guardadas.splice(i, 1)
  }
  return { ...p, aparencia: a, aparencias: guardadas }
}

/** O nome de uma aparência na lista "Suas aparências". */
export function rotuloDaAparencia(a: AparenciaDoObjeto): string {
  if (a.origem === 'galeria') return aparenciaDaGaleria(a.id)?.nome ?? 'Da galeria'
  if (a.origem === 'pinta') return 'Pintada no Pinta'
  if (a.origem === 'molda') return 'Modelada no Molda'
  return 'Uma criação sua'
}

export interface OpcaoDeAparencia {
  aparencia: AparenciaDoObjeto
  rotulo: string
  emUso: boolean
}

/**
 * As aparências que ela já tem para este objeto: as guardadas no projeto e as da galeria já pagas
 * (mesmo as que saíram das guardadas). Trocar entre elas não cobra de novo.
 */
export function aparenciasQueEleTem(
  objeto: ObjetoDaCasa,
  p: ProjetoAzul,
  possuidas: readonly string[],
): OpcaoDeAparencia[] {
  const todas = [...p.aparencias]
  for (const item of galeriaDoObjeto(objeto)) {
    const a = { origem: 'galeria' as const, id: item.id }
    if (possuidas.includes(item.id) && !todas.some((b) => mesmaAparencia(a, b))) todas.push(a)
  }
  return todas.map((a) => ({
    aparencia: a,
    rotulo: rotuloDaAparencia(a),
    emUso: p.aparencia !== null && mesmaAparencia(a, p.aparencia),
  }))
}

/** O que o cartão da galeria mostra para uma aparência do catálogo. */
export type EstadoDoCartao =
  | { tipo: 'em-uso' }
  | { tipo: 'usar' }
  | { tipo: 'comprar'; depois: number | null }
  | { tipo: 'falta'; falta: number }

export function estadoDoCartao(
  item: AparenciaDaGaleria,
  galeria: GaleriaDoJogador,
  p: ProjetoAzul,
): EstadoDoCartao {
  const a = { origem: 'galeria' as const, id: item.id }
  if (p.aparencia && mesmaAparencia(a, p.aparencia)) return { tipo: 'em-uso' }
  if (galeria.possuidas.includes(item.id)) return { tipo: 'usar' }
  if (galeria.ilimitado || galeria.saldo === null) return { tipo: 'comprar', depois: null }
  if (galeria.saldo < item.preco) return { tipo: 'falta', falta: item.preco - galeria.saldo }
  return { tipo: 'comprar', depois: galeria.saldo - item.preco }
}

export const moedas = (n: number) => (n === 1 ? '1 moeda' : `${n} moedas`)

/** O desafio que a galeria sugere a quem não tem moedas bastantes. */
export const DESAFIO_QUE_PAGA = `Um desafio do Quadro das Cores paga ${moedas(MOEDAS_PADRAO.principal)}.`

/** A sugestão de quando falta moeda: quanto falta e um desafio do Quadro das Cores. */
export function sugestaoSemSaldo(falta: number): string {
  return `Faltam ${moedas(falta)}. ${DESAFIO_QUE_PAGA}`
}

/** O que o serviço respondeu na leitura; formato estranho é `null` (o cartão espera). */
export function lerGaleria(corpo: unknown): GaleriaDoJogador | null {
  const r = GaleriaDoJogadorSchema.safeParse(corpo)
  return r.success ? r.data : null
}

/** Como terminou uma compra, na língua do painel. */
export type ResultadoDaCompra =
  | { ok: true }
  | { ok: false; motivo: 'saldo'; preco: number; saldo: number | null }
  | { ok: false; motivo: 'somente-leitura' | 'bloqueada' | 'fora-do-ar' }

/** Lê a resposta de `POST /galeria/compras` que não foi 200. */
export function motivoDaRecusa(status: number, corpo: unknown): ResultadoDaCompra {
  const c = corpo as { error?: { code?: unknown } } | null
  const codigo = c?.error?.code
  if (status === 409 && codigo === 'SALDO_INSUFICIENTE') {
    const d = SaldoInsuficienteSchema.safeParse({
      preco: (corpo as { preco?: unknown }).preco,
      saldo: (corpo as { saldo?: unknown }).saldo,
    })
    if (d.success) return { ok: false, motivo: 'saldo', ...d.data }
  }
  if (status === 403 && codigo === 'SOMENTE_LEITURA')
    return { ok: false, motivo: 'somente-leitura' }
  if (status === 403) return { ok: false, motivo: 'bloqueada' }
  return { ok: false, motivo: 'fora-do-ar' }
}

/** O recado do painel quando a compra não deu certo. */
export function recadoDaCompra(r: Exclude<ResultadoDaCompra, { ok: true }>): string {
  if (r.motivo === 'saldo')
    return r.saldo === null
      ? `Faltam moedas para esta aparência. ${DESAFIO_QUE_PAGA}`
      : sugestaoSemSaldo(Math.max(1, r.preco - r.saldo))
  if (r.motivo === 'somente-leitura') return 'Olhando o jogo como a criança, não dá para comprar.'
  if (r.motivo === 'bloqueada') return 'A galeria não está liberada agora.'
  return 'A galeria não respondeu agora. Tente de novo daqui a pouco: a mesma compra nunca é cobrada duas vezes.'
}
