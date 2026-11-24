import { config3D } from './construtor-3d'
import { gerarBaseConstrutor } from './construtor-base-gerador'

if (import.meta.main) {
  const result = gerarBaseConstrutor(config3D)
  console.log(
    `Patrulha Espacial: ${result.manifests.length} aulas, ${config3D.etapas.length} projetos progressivos; publicação não executada.`,
  )
}
