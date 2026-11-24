import {
  CELULAS_DA_PECA,
  codificarPecaDeAlturas,
  codificarRecursoDeBuracos,
  digestDosBytes,
  LADO_DAS_AMOSTRAS,
} from '@sistemazero/molda-cenarios-core/v2'
import type { EditableStudioProject } from '../core/editableProject'
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
  comRampa = false,
  comParedeAlta = false,
  comRegioes = false,
  relevoEmCampo = false,
  colunas = 64,
  passo = 1,
  juntar = false,
  fundo = 0,
  comRelevo = false,
  projeto,
}: {
  comBuraco?: boolean
  origem?: { x: number; z: number }
  comPonte?: boolean
  comApoioPequeno?: boolean
  comTeto?: boolean
  comRampa?: boolean
  comParedeAlta?: boolean
  /** Duas regiões vizinhas (Vila a oeste, Floresta a leste), como a oficina grava (lote 5). */
  comRegioes?: boolean
  /** O relevo em campo (plano "Mundos de 2 km", lote 3): alturas e pesos, sem lotes de terreno. */
  relevoEmCampo?: boolean
  /** A grade do relevo (múltiplo de 64) e o espaçamento: 1024 × 2 m é um mundo de 2 km. */
  colunas?: number
  passo?: number
  /** "Juntar peças", como o Estúdio faz ao trazer um cenário. */
  juntar?: boolean
  fundo?: number
  /** Colinas de verdade: uma peça de alturas por lote, da mesma função nas bordas. */
  comRelevo?: boolean
  /** O projeto que recebe o cenário (padrão: um projeto JavaScript vazio). */
  projeto?: EditableStudioProject
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
  const pecasDeAltura: { coluna: number; linha: number; digest: string }[] = []
  if (comRelevo) {
    const recursos: { digest: string; conteudo: Uint8Array }[] = []
    const lotes = colunas / CELULAS_DA_PECA
    for (let linha = 0; linha < lotes; linha++)
      for (let coluna = 0; coluna < lotes; coluna++) {
        const amostras = new Float64Array(LADO_DAS_AMOSTRAS ** 2)
        for (let j = 0; j < LADO_DAS_AMOSTRAS; j++)
          for (let i = 0; i < LADO_DAS_AMOSTRAS; i++) {
            const x = origem.x + (coluna * CELULAS_DA_PECA + i) * passo,
              z = origem.z + (linha * CELULAS_DA_PECA + j) * passo
            amostras[j * LADO_DAS_AMOSTRAS + i] =
              1 + 1.5 * Math.sin(x / 37) + 1.2 * Math.cos(z / 53)
          }
        const conteudo = codificarPecaDeAlturas(amostras, -2, 4),
          digest = await digestDosBytes(conteudo)
        recursos.push({ digest, conteudo })
        pecasDeAltura.push({ coluna, linha, digest })
      }
    await host.guardarRecursos(resumo.id, recursos)
  }
  const pisos: Parameters<typeof host.editarCenario>[2] = []
  if (comRampa)
    pisos.push({
      tipo: 'instancia.criar',
      instancia: {
        id: 'rampa',
        nome: 'Rampa de apoio',
        modelo: 'm',
        grupo: null,
        oculto: false,
        bloqueado: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 8, y: 0.5, z: 5 },
          rotacao: { x: Math.PI / 2 - 0.15, y: 0, z: 0 },
          escala: { x: 6, y: 6, z: 1 },
        },
      },
    })
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
            instancias: aberto.documento.instancias.map((instancia) =>
              comParedeAlta
                ? {
                    ...instancia,
                    transformacao: {
                      ...instancia.transformacao,
                      escala: { ...instancia.transformacao.escala, y: 4 },
                    },
                  }
                : instancia,
            ),
            base: {
              tipo: 'terreno',
              cobertura: 'grade',
              origem,
              passo,
              colunas,
              linhas: colunas,
              min: -2,
              max: 4,
              fundo,
              pecas: pecasDeAltura,
              ...(comBuraco ? { buracos } : {}),
            },
            ...(comRegioes
              ? {
                  regioes: [
                    {
                      id: 'vila',
                      nome: 'Vila',
                      caixa: { x0: origem.x, z0: origem.z, x1: origem.x + 32, z1: origem.z + 64 },
                      vizinhas: ['floresta'],
                    },
                    {
                      id: 'floresta',
                      nome: 'Floresta',
                      caixa: {
                        x0: origem.x + 32,
                        z0: origem.z,
                        x1: origem.x + 64,
                        z1: origem.z + 64,
                      },
                      vizinhas: ['vila'],
                    },
                  ],
                }
              : {}),
          },
        },
        ...pisos,
      ],
      'chao-do-transporte',
    ),
    { pacote } = await fonte.preparar(resumo.id, salvo.revisao, {
      signal: new AbortController().signal,
      juntar,
      ...(relevoEmCampo ? { relevo: 'campo' as const } : {}),
    })
  return prepararImportacaoDeCena3D(projeto ?? createEmptyProject('p', 'Meu jogo'), pacote)
}
