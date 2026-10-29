import type { IlhaId } from '@sistemazero/arquipelago-contracts'

/**
 * O desafio do dia (plano de 28/10/2026, `docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`,
 * parte 2). Regra pura: quem chama já filtrou os desafios publicados de tipo `desafio-do-dia` do
 * público da pessoa que estão ao alcance dela (ilha aberta e todos os blocos exigidos).
 *
 * - Os ainda não feitos vêm antes; feitos todos, o banco recomeça pelos feitos há mais tempo.
 * - Dia par: a ilha mais nova (a de posição mais alta entre os candidatos); dia ímpar: as
 *   anteriores (revisão espaçada). Sem candidato no grupo do dia, vale qualquer ilha.
 * - No mesmo grupo, a ordem da equipe (`ordem`) e depois o id (a escolha nunca é sorteada: a mesma
 *   situação dá o mesmo desafio).
 */
export interface CandidatoDoDia {
  id: string
  ilha: IlhaId
  /** A posição da ilha na jornada (1 a 8): a mais alta é a mais nova para a pessoa. */
  posicaoDaIlha: number
  ordem: number
  /** Quando a pessoa concluiu (null: ainda não fez). */
  feitoEm: Date | null
}

/** Dia par ou ímpar pelo número de dias desde 1970 (o dia 31 e o dia 1 não ficam iguais). */
export function diaPar(dia: string): boolean {
  const dias = Math.round(Date.parse(`${dia}T12:00:00Z`) / 86_400_000)
  return dias % 2 === 0
}

function porOrdem(a: CandidatoDoDia, b: CandidatoDoDia): number {
  return a.ordem - b.ordem || a.id.localeCompare(b.id)
}

export function escolherDesafioDoDia(
  dia: string,
  candidatos: readonly CandidatoDoDia[],
): string | null {
  if (candidatos.length === 0) return null
  const naoFeitos = candidatos.filter((c) => c.feitoEm === null)
  const banco = naoFeitos.length > 0 ? naoFeitos : [...candidatos]
  const maisNova = Math.max(...banco.map((c) => c.posicaoDaIlha))
  const doDia = banco.filter((c) =>
    diaPar(dia) ? c.posicaoDaIlha === maisNova : c.posicaoDaIlha < maisNova,
  )
  const grupo = doDia.length > 0 ? doDia : banco
  // Todos já feitos: o feito há mais tempo primeiro.
  const ordenado =
    naoFeitos.length > 0
      ? [...grupo].sort(porOrdem)
      : [...grupo].sort(
          (a, b) => (a.feitoEm?.getTime() ?? 0) - (b.feitoEm?.getTime() ?? 0) || porOrdem(a, b),
        )
  return ordenado[0]?.id ?? null
}
