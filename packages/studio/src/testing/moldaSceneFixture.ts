import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { criarHostEmMemoria } from '../../../molda-cenarios/src/oficina/host-memoria'
import {
  listarCenariosParaStudio,
  prepararCenarioParaStudio,
} from '../../../molda-cenarios/src/studio-library'
import { exemplo, glb } from '../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import type { StudioMoldaLibraryAdapter } from '../studio/molda-library'

/** Real domain commands/compiler; no fake GLB or mocked project-store action. */
export async function criarFonteDeCenarioDeEnsaio(instancias = 0) {
  const host = criarHostEmMemoria({ equipe: true }),
    jogo = await host.criarMundo('equipe', 'Arquipélago'),
    resumo = await host.criarCenario(jogo.id, 'Praça da Faísca')
  if (instancias) {
    const m = exemplo()
    m.j.nodes = [{ mesh: 0 }]
    m.j.scenes = [{ nodes: [0] }]
    new Float32Array(m.bin.buffer).set([0, 0, 0, 1, 0, 0, 0, 1, 0])
    m.j.accessors[0]!.max = [1, 1, 0]
    const bytes = glb(m.j, m.bin),
      digest = await digestDosBytes(bytes),
      biblioteca = await host.criarBiblioteca('equipe', { nome: 'Aventura', licenca: 'restrita' }),
      [modelo] = await host.importarModelos(biblioteca.id, [
        {
          nome: 'Marco',
          pasta: '',
          etiquetas: [],
          conteudo: bytes,
          digest,
          miniatura: new Blob(),
          min: [0, 0, 0],
          max: [1, 1, 0],
          triangulos: 1,
        },
      ]),
      comandos: Parameters<typeof host.editarCenario>[2] = [
        {
          tipo: 'modelo.definir',
          modelo: { id: 'm', biblioteca: biblioteca.id, modelo: modelo!.id, digest },
        },
      ]
    for (let i = 0; i < instancias; i++)
      comandos.push({
        tipo: 'instancia.criar',
        instancia: {
          id: `marco-${i}`,
          nome: `Marco ${i}`,
          modelo: 'm',
          grupo: null,
          oculto: false,
          bloqueado: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: i % 7, y: 0, z: Math.floor(i / 7) },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        },
      })
    resumo.revisao = (await host.editarCenario(resumo.id, 0, comandos, 'montar-marcos')).revisao
  }
  const fonte: NonNullable<StudioMoldaLibraryAdapter['cenarios']> = {
    disponivel: async () => true,
    listar: ({ signal }) => listarCenariosParaStudio(host, signal),
    preparar: (id, revisao, options) =>
      prepararCenarioParaStudio(host, id, revisao, {
        sinal: options.signal,
        juntar: options.juntar,
        progresso: options.progresso,
        ...(options.relevo ? { relevo: options.relevo } : {}),
      }),
  }
  return { host, resumo, fonte }
}
