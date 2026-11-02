import type { SceneActivity } from '../index'

/**
 * As metas que a atividade COBRA, para as sete cenas do ateliê de O Jogo do Meu Jeito em exploração
 * livre (`pixel-vector`, `symmetry`, `shading`, `fill-stroke`, `frames`, `onion-skin`,
 * `motion-amount`). Meta que a missão não cobra conta como feita: a fala não espera por ela.
 *
 * ⚠️ Sem `sceneTargets` (o `index`): o registro dos guias é lido pelo `discovery-guidance`, que o
 * `index` importa, e um valor do `index` aqui fecharia um ciclo de importação. A regra é a mesma
 * (`sceneSetupGoals`): um id que a cena não tem não esvazia a missão.
 */
export function metaFeita(
  activity: SceneActivity,
  metas: readonly string[],
  has: (meta: string) => boolean,
): (meta: string) => boolean {
  const pedidas = activity.setup?.goals?.filter((id) => metas.includes(id)) ?? []
  const alvo = pedidas.length ? pedidas : metas
  return (meta) => has(meta) || !alvo.includes(meta)
}
