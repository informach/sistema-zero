import {
  AMOSTRAS_DA_PECA,
  AparenciaDaAguaSchema,
  capturarConteudoDeConjunto,
  codificarPecaDeAlturas,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  digestDosBytes,
  LADO_DAS_AMOSTRAS,
  referenciarConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import { criarHostEmMemoria } from '../../../molda-cenarios/src/oficina/host-memoria'
import {
  listarCenariosParaStudio,
  prepararCenarioParaStudio,
} from '../../../molda-cenarios/src/studio-library'
import { exemplo, glb } from '../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { createEmptyProject } from '../core/project'
import { prepararImportacaoDeCena3D } from '../core/scene3d/importar'
import type { StudioMoldaLibraryAdapter } from '../studio/molda-library'

/**
 * UM cenário do Molda Cenários com tudo o que a missão (§12, "Molda — Cenários 3D") pede que o
 * Estúdio consuma, montado pelos MESMOS caminhos de produção: o host em memória do Molda Cenários
 * (que é a referência do host de verdade), comandos de autoria reais (`editarCenario`), o
 * compilador real (`prepararCenarioParaStudio`) e a importação do próprio Estúdio
 * (`prepararImportacaoDeCena3D`). Nada de pacote escrito à mão, nada de compilador de mentira.
 *
 * Os nomes são genéricos de propósito: o contrato não pode depender de um jogo (a missão proíbe
 * regras da Ilha Faísca no núcleo do Estúdio).
 */

/** Grade do terreno: 2 × 2 peças de 64 células, passo de 1 m (as "regiões" do relevo). */
export const TERRENO_DO_CONTRATO = {
  origem: { x: -64, z: -64 },
  passo: 1,
  colunas: 128,
  linhas: 128,
  min: -2,
  max: 6,
  fundo: 0,
} as const

/** Peça (0, 0) com alturas autorais; as outras três ficam no `fundo` (cobertura em grade). */
export const PECA_COM_ALTURAS = { coluna: 0, linha: 0 } as const

/** Altura autoral da amostra (i = coluna local, j = linha local) da peça (0, 0). */
export function alturaAutoral(i: number, j: number): number {
  return 0.04 * i + 0.02 * j
}

export const MATERIAL_DO_MODELO = {
  name: 'Pedra musgosa',
  pbrMetallicRoughness: {
    baseColorFactor: [0.25, 0.5, 0.3, 1],
    metallicFactor: 0,
    roughnessFactor: 0.8,
  },
} as const

const transformacao = (x: number, y: number, z: number, escala = 1, giro = 0) => ({
  posicao: { x, y, z },
  rotacao: { x: 0, y: giro, z: 0 },
  escala: { x: escala, y: escala, z: escala },
})

/** GLB real (triângulo de 1 m) com um material PBR nomeado. */
function modeloComMaterial() {
  const m = exemplo()
  m.j.nodes = [{ mesh: 0 }]
  m.j.scenes = [{ nodes: [0] }]
  new Float32Array(m.bin.buffer).set([0, 0, 0, 1, 0, 0, 0, 1, 0])
  m.j.accessors[0]!.max = [1, 1, 0]
  const json = {
    ...m.j,
    materials: [MATERIAL_DO_MODELO],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
  }
  return glb(json, m.bin)
}

type CanvasNativo = typeof import('@napi-rs/canvas')
let canvasNativo: Promise<CanvasNativo | null> | undefined

/** `@napi-rs/canvas` é opcional no repositório (como em `map-2d/runtime.test.ts`). */
export function carregarCanvasNativo(): Promise<CanvasNativo | null> {
  canvasNativo ??= import('@napi-rs/canvas').catch(() => null)
  return canvasNativo
}

/**
 * O compilador do Molda Cenários assa o acabamento da água num PNG pelo Canvas 2D do navegador
 * (`codificarPngCompilado`, em `molda-cenarios-motor/src/compilar/imagens.ts`) e o exportador de
 * GLB do three embute esse PNG pelo mesmo Canvas 2D. No bun não há Canvas 2D (o happy-dom não
 * desenha). Durante a compilação, e só nela, quem faz o papel do Canvas 2D é o canvas nativo
 * (Skia): o `OffscreenCanvas`, o `ImageData` e o `document.createElement('canvas')`. O compilador
 * roda inteiro, sem troca de código, e o PNG que sai é um PNG de verdade, conferido depois pelo
 * leitor do próprio compilador. Tudo volta como estava no fim.
 */
async function comCanvasNativo<T>(nativo: CanvasNativo, fazer: () => Promise<T>): Promise<T> {
  const g = globalThis as Record<string, unknown>,
    doc = typeof document === 'undefined' ? null : document,
    antes = {
      OffscreenCanvas: Object.getOwnPropertyDescriptor(g, 'OffscreenCanvas'),
      ImageData: Object.getOwnPropertyDescriptor(g, 'ImageData'),
      createElement: doc ? Object.getOwnPropertyDescriptor(doc, 'createElement') : undefined,
    }
  const definir = (alvo: object, nome: string, valor: unknown) =>
    Object.defineProperty(alvo, nome, { value: valor, configurable: true, writable: true })
  definir(g, 'OffscreenCanvas', function OffscreenCanvas(largura: number, altura: number) {
    return nativo.createCanvas(largura, altura)
  })
  definir(g, 'ImageData', nativo.ImageData)
  if (doc) {
    const original = doc.createElement
    definir(doc, 'createElement', function createElement(this: Document, tag: string, o?: object) {
      return String(tag).toLowerCase() === 'canvas'
        ? nativo.createCanvas(1, 1)
        : Reflect.apply(original, this, [tag, o])
    })
  }
  try {
    return await fazer()
  } finally {
    for (const nome of ['OffscreenCanvas', 'ImageData'] as const) {
      const d = antes[nome]
      if (d) Object.defineProperty(g, nome, d)
      else delete g[nome]
    }
    if (doc) {
      if (antes.createElement) Object.defineProperty(doc, 'createElement', antes.createElement)
      else delete (doc as unknown as Record<string, unknown>).createElement
    }
  }
}

function pecaDeAlturas() {
  const amostras = new Float64Array(AMOSTRAS_DA_PECA)
  for (let j = 0; j < LADO_DAS_AMOSTRAS; j++)
    for (let i = 0; i < LADO_DAS_AMOSTRAS; i++)
      amostras[j * LADO_DAS_AMOSTRAS + i] = alturaAutoral(i, j)
  return codificarPecaDeAlturas(amostras, TERRENO_DO_CONTRATO.min, TERRENO_DO_CONTRATO.max)
}

export async function criarCenarioCompletoDeEnsaio(opcoes: { juntar?: boolean } = {}) {
  const nativo = await carregarCanvasNativo()
  if (!nativo)
    throw Error(
      'O cenário completo precisa do @napi-rs/canvas para o compilador assar a água (PNG).',
    )
  const host = criarHostEmMemoria({ equipe: true }),
    jogo = await host.criarMundo('equipe', 'Mundo do contrato'),
    resumo = await host.criarCenario(jogo.id, 'Vale do contrato'),
    bytes = modeloComMaterial(),
    digest = await digestDosBytes(bytes),
    biblioteca = await host.criarBiblioteca('equipe', { nome: 'Acervo', licenca: 'restrita' }),
    [modelo] = await host.importarModelos(biblioteca.id, [
      {
        nome: 'Pedra',
        pasta: '',
        etiquetas: [],
        conteudo: bytes,
        digest,
        miniatura: new Blob(),
        min: [0, 0, 0],
        max: [1, 1, 0],
        triangulos: 1,
      },
    ])
  // A oficina grava a medida local do arquivo fixado; o conjunto precisa dela para se assentar.
  const refModelo = {
    id: 'pedra',
    biblioteca: biblioteca.id,
    modelo: modelo!.id,
    digest,
    volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 0 } },
  }

  // Conjunto de biblioteca: capturado de um documento-fonte, publicado no acervo (revisão 1).
  const fonteDoConjunto = criarDocumentoVazio('fonte-banco', 'Banco')
  fonteDoConjunto.modelos = [refModelo]
  fonteDoConjunto.instancias = [
    {
      id: 'assento',
      nome: 'Assento',
      modelo: 'pedra',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: transformacao(0, 0, 0),
    },
  ]
  const conteudoDoConjunto = capturarConteudoDeConjunto(fonteDoConjunto, ['assento'], 'equipe'),
    conjunto = await host.criarConjunto(biblioteca.id, {
      nome: 'Banco de pedra',
      pasta: '',
      etiquetas: [],
      conteudo: conteudoDoConjunto,
      operacaoId: 'conjunto-do-contrato',
    })

  // Relevo: uma peça física guardada pelo host (o mesmo caminho do pincel de terreno).
  const peca = pecaDeAlturas(),
    digestDaPeca = await digestDosBytes(peca)
  await host.guardarRecursos(resumo.id, [{ digest: digestDaPeca, conteudo: peca }])

  const aberto = await host.abrirCenario(resumo.id),
    { definicao, comandos: definirConjunto } = referenciarConjunto(aberto.documento, {
      biblioteca: biblioteca.id,
      conjunto: conjunto.id,
      revisao: conjunto.revisao,
      nome: conjunto.nome,
      conteudo: conteudoDoConjunto,
    })

  const comandos: Parameters<typeof host.editarCenario>[2] = [
    { tipo: 'modelo.definir', modelo: refModelo },
    {
      tipo: 'base.definir',
      base: {
        tipo: 'terreno',
        cobertura: 'grade',
        ...TERRENO_DO_CONTRATO,
        origem: { ...TERRENO_DO_CONTRATO.origem },
        pecas: [{ ...PECA_COM_ALTURAS, digest: digestDaPeca }],
      },
    },
    // Grupos aninhados: Praça ⊃ Pedras.
    {
      tipo: 'grupo.definir',
      grupo: { id: 'praca', nome: 'Praça', grupo: null, bloqueado: false, oculto: false },
    },
    {
      tipo: 'grupo.definir',
      grupo: {
        id: 'pedras',
        nome: 'Pedras',
        grupo: 'praca',
        bloqueado: false,
        oculto: false,
        propriedades: { bioma: 'campo' },
      },
    },
    ...(
      [
        ['pedra-caixa', 'Pedra com caixa', 'caixa', 'pedras', 10, 12],
        ['pedra-capsula', 'Pedra com cápsula', 'capsula', 'pedras', 14, 12],
        ['pedra-malha', 'Pedra com malha', 'malha', 'praca', 18, 12],
        ['pedra-enfeite', 'Pedra sem colisão', 'nenhuma', null, 22, 12],
      ] as const
    ).map(([id, nome, colisao, grupo, x, z]) => ({
      tipo: 'instancia.criar' as const,
      instancia: {
        id,
        nome,
        modelo: 'pedra',
        grupo,
        oculto: false,
        bloqueado: false,
        colisao,
        apoio: { tipo: 'absoluto' as const },
        transformacao: transformacao(x, 1, z, 2, 0.5),
        propriedades: { tipo: 'pedra', peso: 3, solida: colisao !== 'nenhuma' },
        ...(id === 'pedra-caixa' ? { aparencia: { cor: '#c08040' } } : {}),
      },
    })),
    {
      tipo: 'caminho.definir',
      caminho: {
        id: 'trilha',
        nome: 'Trilha do vale',
        tipo: 'trilha',
        grupo: 'praca',
        oculto: false,
        bloqueado: false,
        pontos: [
          { x: -40, z: -20 },
          { x: -10, z: -20 },
          { x: 20, z: 10 },
        ],
        largura: 2.5,
        acabamento: null,
        // Sem `colisao`: a oficina não oferece colisão ao piso simples ("O piso simples usa a
        // colisão do próprio terreno", `CaminhoParametros.tsx`).
        aparencia: { cor: '#b89163' },
      },
    },
    // Caminho estrutural: o muro é o caminho que ganha colisor próprio (um por módulo).
    {
      tipo: 'caminho.definir',
      caminho: {
        id: 'muro',
        nome: 'Muro do pomar',
        tipo: 'muro',
        grupo: null,
        oculto: false,
        bloqueado: false,
        pontos: [
          { x: 30, z: 20 },
          { x: 34, z: 20 },
        ],
        largura: 0.5,
        acabamento: null,
        altura: 2,
        comprimentoDoModulo: 2,
      },
    },
    {
      tipo: 'agua.definir',
      agua: {
        id: 'lago',
        nome: 'Lago redondo',
        tipo: 'lago',
        grupo: null,
        oculto: false,
        bloqueado: false,
        modelo: null,
        centro: { x: 30, z: -30 },
        giro: 0,
        escala: 1,
        nivel: 0.5,
        profundidade: 2,
        contorno: [
          { x: -8, z: -8 },
          { x: 8, z: -8 },
          { x: 8, z: 8 },
          { x: -8, z: 8 },
        ],
        recorte: [
          { x: -8, z: -8 },
          { x: 8, z: -8 },
          { x: 8, z: 8 },
          { x: -8, z: 8 },
        ],
        nado: true,
        aparencia: AparenciaDaAguaSchema.parse({ corRasa: '#77ccdd', corProfunda: '#226688' }),
      },
    },
    ...definirConjunto,
    {
      tipo: 'montagem.definir',
      montagem: {
        id: 'banco-da-praca',
        nome: 'Banco da praça',
        grupo: 'praca',
        oculto: false,
        bloqueado: false,
        definicao: definicao.id,
        apoio: { tipo: 'absoluto' },
        transformacao: transformacao(-20, 1, 30, 1.5),
      },
    },
    // Marcadores: o início principal e um secundário, um ponto ligado a um objeto, zona, rota,
    // câmera e uma luz local.
    ...(
      [
        {
          id: 'inicio',
          nome: 'Início',
          posicao: { x: -30, y: 0, z: -30 },
          giro: 0.75,
          noChao: true,
          objeto: null,
          configuracao: { tipo: 'inicio', principal: true },
        },
        {
          id: 'inicio-2',
          nome: 'Volta da fase',
          posicao: { x: 40, y: 2, z: 40 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao: { tipo: 'inicio', principal: false },
        },
        {
          id: 'bau',
          nome: 'Baú escondido',
          posicao: { x: 10, y: 3, z: 12 },
          giro: 0,
          noChao: false,
          objeto: 'pedra-caixa',
          configuracao: { tipo: 'ponto' },
          propriedades: { item: 'chave', moedas: 5 },
        },
        {
          id: 'zona-perigo',
          nome: 'Zona de perigo',
          posicao: { x: 30, y: 0, z: -30 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao: { tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 16, y: 4, z: 16 } } },
        },
        {
          id: 'ronda',
          nome: 'Ronda do guarda',
          posicao: { x: 0, y: 1, z: 40 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao: {
            tipo: 'rota',
            pontos: [
              { x: 0, y: 0, z: 0 },
              { x: 10, y: 0, z: 0 },
              { x: 10, y: 0, z: 10 },
            ],
            fechada: false,
            seguirTerreno: false,
          },
        },
        {
          id: 'camera-entrada',
          nome: 'Câmera da entrada',
          posicao: { x: -40, y: 10, z: -40 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao: { tipo: 'camera', alvo: { x: 10, y: -5, z: 10 }, campoDeVisao: 55 },
        },
        {
          id: 'lampiao',
          nome: 'Lampião',
          posicao: { x: 12, y: 3, z: 14 },
          giro: 0,
          noChao: false,
          objeto: null,
          configuracao: {
            tipo: 'luz',
            luz: {
              tipo: 'pontual',
              cor: '#ffcc88',
              intensidade: 30,
              alcance: 12,
              decaimento: 2,
              sombra: false,
            },
          },
        },
      ] as const
    ).map((m) => ({
      tipo: 'marcador.definir' as const,
      marcador: {
        grupo: null,
        bloqueado: false,
        oculto: false,
        ...structuredClone(m),
      } as DocumentoDeCenario['marcadores'][number],
    })),
    {
      tipo: 'iluminacao.definir',
      iluminacao: {
        hora: 17.5,
        sol: {
          direcao: { x: -0.4, y: -1, z: 0.3 },
          cor: '#fff1d0',
          intensidade: 2.5,
          sombra: true,
        },
        ambiente: { ceu: '#9ec9ff', chao: '#5a4a3a', intensidade: 0.6 },
        ceu: { tipo: 'cor', cor: '#88aadd' },
        nevoa: { tipo: 'linear', cor: '#aabbcc', perto: 30, longe: 400 },
        sombras: { resolucao: 1024, alcance: 96 },
      },
    },
  ]
  const salvo = await host.editarCenario(resumo.id, aberto.revisao, comandos, 'montar-contrato'),
    autoria = (await host.abrirCenario(resumo.id)).documento
  const fonte: NonNullable<StudioMoldaLibraryAdapter['cenarios']> = {
    disponivel: async () => true,
    listar: ({ signal }) => listarCenariosParaStudio(host, signal),
    preparar: (id, revisao, o) =>
      prepararCenarioParaStudio(host, id, revisao, {
        sinal: o.signal,
        juntar: o.juntar,
        progresso: o.progresso,
      }),
  }
  const { pacote, avisos } = await comCanvasNativo(nativo, () =>
      fonte.preparar(resumo.id, salvo.revisao, {
        signal: new AbortController().signal,
        juntar: opcoes.juntar ?? false,
      }),
    ),
    plano = await prepararImportacaoDeCena3D(createEmptyProject('p', 'Meu jogo'), pacote)
  return {
    host,
    resumo: { ...resumo, revisao: salvo.revisao },
    fonte,
    autoria,
    conjunto: { id: conjunto.id, biblioteca: biblioteca.id, definicao: definicao.id },
    modelo: refModelo,
    pacote,
    avisos,
    plano,
  }
}
