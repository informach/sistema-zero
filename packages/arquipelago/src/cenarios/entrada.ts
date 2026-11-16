import type { CenarioRuntimeMontagem } from '@sistemazero/molda-cenarios-core/runtime'

export { liberarMiniaturas, miniatura } from './miniaturas'

/** Define o perfil antes da importação que calcula as constantes do controlador. */
export const montar: CenarioRuntimeMontagem['montar'] = async (elemento, opcoes) => {
  ;(globalThis as { __arquipelagoMundo?: string }).__arquipelagoMundo = 'macro'
  ;(globalThis as { __arquipelagoRitmo?: string }).__arquipelagoRitmo = 'explorar'
  const runtime = await import('./runtime')
  return runtime.montar(elemento, opcoes)
}
