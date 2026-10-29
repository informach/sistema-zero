import { DesafioAbertoSchema, type MoldeDeDesafio } from '@sistemazero/arquipelago-contracts'

export function challengeForViewer(raw: unknown, viewerId: string, molde: MoldeDeDesafio) {
  const desafio = DesafioAbertoSchema.parse(raw)
  if (
    desafio.jogadorId !== viewerId ||
    desafio.id !== molde.desafioId ||
    desafio.revisao !== molde.revisao
  ) {
    throw new Error('Este desafio mudou. Volte ao jogo e abra novamente.')
  }
  return desafio
}

/** IDs e armazenamento isolados por público, pessoa, desafio e revisão publicada. */
export function challengeDraftScope(
  audience: 'kids' | 'adult',
  viewerId: string,
  id: string,
  revision: number,
) {
  return {
    namespace: `arquipelago-${audience}-${viewerId}`,
    projectId: `desafio-${id}-r${revision}`,
  }
}
