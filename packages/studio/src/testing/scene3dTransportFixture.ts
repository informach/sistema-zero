import { codificarRecursoDeBuracos, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { createEmptyProject } from '../core/project'
import { prepararImportacaoDeCena3D } from '../core/scene3d/importar'
import { criarFonteDeCenarioDeEnsaio } from './moldaSceneFixture'

/** Actual authoring commands/compiler, with a physical height field and a real GLB. */
export async function criarTransporteDeEnsaio({
  comBuraco = false,
  origem = { x: -32, z: -32 },
  comPonte = false,
  comApoioPequeno = false,
  comTeto = false,
  fundo = 0,
}: {
  comBuraco?: boolean
  origem?: { x: number; z: number }
  comPonte?: boolean
  comApoioPequeno?: boolean
  comTeto?: boolean
  fundo?: number
} = {}) {
  const { host, resumo, fonte } = await criarFonteDeCenarioDeEnsaio(1),
    aberto = await host.abrirCenario(resumo.id)
  let buracos: { coluna: number; linha: number; digest: string }[] = []
  if (comBuraco) {
    const bits = new Uint8Array(512)
    for (let z = 36; z < 44; z++)
      for (let x = 40; x < 45; x++) {
        const i = z * 64 + x
        bits[i >> 3] = bits[i >> 3]! | (1 << (i & 7))
      }
    const conteudo = codificarRecursoDeBuracos(bits),
      digest = await digestDosBytes(conteudo)
    await host.guardarRecursos(resumo.id, [{ digest, conteudo }])
    buracos = [{ coluna: 0, linha: 0, digest }]
  }
  const pisos: Parameters<typeof host.editarCenario>[2] = []
  if (comTeto)
    pisos.push({
      tipo: 'instancia.criar',
      instancia: {
        id: 'teto',
        nome: 'Teto do salto',
        modelo: 'm',
        grupo: null,
        oculto: false,
        bloqueado: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 8, y: 2.3, z: 5 },
          rotacao: { x: Math.PI / 2, y: 0, z: 0 },
          escala: { x: 6, y: 6, z: 1 },
        },
      },
    })
  if (comApoioPequeno)
    pisos.push({
      tipo: 'instancia.criar',
      instancia: {
        id: 'apoio-pequeno',
        nome: 'Apoio entre amostras',
        modelo: 'm',
        grupo: null,
        oculto: false,
        bloqueado: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 10, y: 0.4, z: 5 },
          rotacao: { x: Math.PI / 2, y: 0, z: 0 },
          escala: { x: 0.02, y: 0.02, z: 1 },
        },
      },
    })
  if (comPonte)
    for (const [i, z] of [5, 6.2].entries())
      pisos.push({
        tipo: 'instancia.criar',
        instancia: {
          id: `piso-${i}`,
          nome: `Piso ${i}`,
          modelo: 'm',
          grupo: null,
          oculto: false,
          bloqueado: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 8, y: 0.4, z },
            rotacao: { x: Math.PI / 2, y: 0, z: 0 },
            escala: { x: 3, y: 1, z: 1 },
          },
        },
      })
  const salvo = await host.editarCenario(
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
              origem,
              passo: 1,
              colunas: 64,
              linhas: 64,
              min: -2,
              max: 4,
              fundo,
              pecas: [],
              ...(comBuraco ? { buracos } : {}),
            },
          },
        },
        ...pisos,
      ],
      'chao-do-transporte',
    ),
    { pacote } = await fonte.preparar(resumo.id, salvo.revisao, {
      signal: new AbortController().signal,
      juntar: false,
    })
  return prepararImportacaoDeCena3D(createEmptyProject('p', 'Meu jogo'), pacote)
}
