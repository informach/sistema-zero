import { config2D } from './construtor-2d'
import { config3D } from './construtor-3d'
import { gerarBaseConstrutor } from './construtor-base-gerador'

if (import.meta.main) {
  for (const config of [config2D, config3D]) {
    const result = gerarBaseConstrutor(config)
    console.log(
      `${config.nome}: ${result.manifests.length} aulas, ${config.etapas.length} projetos progressivos; publicação não executada.`,
    )
  }
}
