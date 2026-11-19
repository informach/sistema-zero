import { createEmptyProject } from '../core/project'
import { prepararImportacaoDeCena3D } from '../core/scene3d/importar'
import { criarFonteDeCenarioDeEnsaio } from './moldaSceneFixture'

/** Actual authoring commands/compiler, with a physical height field and a real GLB. */
export async function criarTransporteDeEnsaio() {
  const { host, resumo, fonte } = await criarFonteDeCenarioDeEnsaio(1),
    aberto = await host.abrirCenario(resumo.id),
    salvo = await host.editarCenario(
      resumo.id,
      resumo.revisao,
      [
        {
          tipo: 'cenario.restaurar',
          documento: {
            ...aberto.documento,
            base: {
              tipo: 'terreno',
              cobertura: 'grade',
              origem: { x: -32, z: -32 },
              passo: 1,
              colunas: 64,
              linhas: 64,
              min: -2,
              max: 4,
              fundo: 0,
              pecas: [],
            },
          },
        },
      ],
      'chao-do-transporte',
    ),
    { pacote } = await fonte.preparar(resumo.id, salvo.revisao, {
      signal: new AbortController().signal,
      juntar: false,
    })
  return prepararImportacaoDeCena3D(createEmptyProject('p', 'Meu jogo'), pacote)
}
