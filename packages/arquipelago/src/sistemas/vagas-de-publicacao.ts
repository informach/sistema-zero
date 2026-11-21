/**
 * Duas vagas de cenário publicado: a ilha onde a criança está fica sempre carregada; a vizinha
 * entra quando ela chega perto da divisa (para já aparecer publicada antes de cruzar); a ilha de
 * onde ela veio fica guardada até a vaga ser precisa. Ir e voltar pela ponte só troca qual vaga
 * está à frente, sem baixar nem preparar nada de novo.
 */
export type VagasDePublicacao<Ilha extends string> = readonly [Ilha, Ilha | null]

/** A vizinha entra quando a criança está a menos de uns 100 m da divisa entre as duas ilhas. */
export const DIFERENCA_PARA_A_VIZINHA = 200

export interface IlhaComCentro<Ilha extends string> {
  id: Ilha
  centro: { x: number; z: number }
}

/** A mais próxima, a segunda mais próxima e se a criança está perto da divisa entre as duas. */
export function ilhasEmVolta<Ilha extends string>(
  ilhas: readonly IlhaComCentro<Ilha>[],
  ponto: { x: number; z: number },
) {
  const ordem = ilhas
    .map((i) => ({ id: i.id, d: Math.hypot(i.centro.x - ponto.x, i.centro.z - ponto.z) }))
    .sort((a, b) => a.d - b.d)
  const primeira = ordem[0]!,
    segunda = ordem[1]
  return {
    atual: primeira.id,
    vizinha: segunda?.id ?? null,
    pertoDaDivisa: segunda !== undefined && segunda.d - primeira.d < DIFERENCA_PARA_A_VIZINHA,
  }
}

/**
 * As vagas seguintes. Quem já está numa vaga continua nela (nada recarrega à toa); quando falta
 * uma ilha, ela ocupa a vaga vazia ou, sem vaga vazia, a que não guarda a outra que precisa
 * ficar: a vizinha perto da divisa ou, longe dela, a ilha de onde ela veio (`anterior`).
 * Devolve as MESMAS vagas quando nada muda.
 */
export function proximasVagas<Ilha extends string>(
  vagas: VagasDePublicacao<Ilha>,
  agora: { atual: Ilha; vizinha: Ilha | null; pertoDaDivisa: boolean },
  anterior: Ilha | null = null,
): VagasDePublicacao<Ilha> {
  const nova: [Ilha | null, Ilha | null] = [vagas[0], vagas[1]]
  const garantir = (id: Ilha, proteger: Ilha | null) => {
    if (nova.includes(id)) return
    const livre = nova.indexOf(null)
    nova[livre >= 0 ? livre : nova[0] === proteger ? 1 : 0] = id
  }
  const vizinha = agora.pertoDaDivisa ? agora.vizinha : null
  garantir(agora.atual, vizinha ?? (anterior !== agora.atual ? anterior : null))
  if (vizinha) garantir(vizinha, agora.atual)
  // A primeira vaga nunca fica vazia: a ilha atual sempre tem lugar.
  if (nova[0] === null) [nova[0], nova[1]] = [nova[1], nova[0]]
  return nova[0] === vagas[0] && nova[1] === vagas[1]
    ? vagas
    : ([nova[0]!, nova[1]] as VagasDePublicacao<Ilha>)
}
