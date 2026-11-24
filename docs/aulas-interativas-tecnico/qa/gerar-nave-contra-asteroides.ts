/** Entrada de comando preservada. A única fonte atual é construtor-2d.ts. */
import { config2D } from './construtor-2d'
import { gerarBaseConstrutor } from './construtor-base-gerador'

export const aulasNave = config2D.aulas
export const gerarNave = () => gerarBaseConstrutor(config2D)

if (import.meta.main) {
  const result = gerarNave()
  console.log(
    `Nave Contra Asteroides: ${result.manifests.length} aulas, ${config2D.etapas.length} projetos progressivos; publicação não executada.`,
  )
}
