/**
 * O cenário do jogo E montado DENTRO do navegador (lote 7 da conclusão, 22/11/2026): a compilação
 * do relevo pinta o chão com Canvas 2D, como na oficina. A oficina em memória monta o mundo pelas
 * mesmas intenções do agente (relevo por receita, seis regiões em par, lago na bacia, objetos
 * espalhados e postos, início e luzes) e compila pela compilação da oficina (com "Juntar peças").
 * Os modelos são feitos aqui, com o three; nada do Arquipélago.
 *
 * Quem chama é `playground/jogo-e/preparar-cenario.mjs` (o Node grava os dois pacotes).
 */
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { criarIntencoes } from '../../../molda-cenarios-agente/src/oficina/intencoes'
import { compilarRevisaoDaOficina } from '../../src/exportar/compilar-revisao'
import { criarHostEmMemoria } from '../../src/oficina/host-memoria'

const assert = {
  ok(valor: unknown, recado = 'falhou'): asserts valor {
    if (!valor) throw Error(recado)
  },
}

/** Um pacote em forma que atravessa o `evaluate`: a cena e cada arquivo em base64. */
export interface PacoteSerial {
  cena: unknown
  arquivos: Array<[string, string]>
}

const base64 = (bytes: Uint8Array) => {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

export async function montarJogoE(): Promise<{
  objetos: number
  regioes: PacoteSerial
  inteiro: PacoteSerial
}> {
  // ---- 1. Os modelos, feitos aqui ----
  const material = (cor: string) => new MeshStandardMaterial({ color: cor, roughness: 0.85 })
  function arvore(): Object3D {
    const g = new Group()
    const tronco = new Mesh(new CylinderGeometry(0.25, 0.35, 2, 8), material('#7c4a24'))
    tronco.position.y = 1
    const copa = new Mesh(new ConeGeometry(1.6, 4, 9), material('#2f8f4e'))
    copa.position.y = 4
    g.add(tronco, copa)
    return g
  }
  function casa(): Object3D {
    const g = new Group()
    const corpo = new Mesh(new BoxGeometry(5, 3, 4), material('#f1d9a7'))
    corpo.position.y = 1.5
    const telhado = new Mesh(new ConeGeometry(4, 2, 4), material('#b4483a'))
    telhado.position.y = 4
    telhado.rotation.y = Math.PI / 4
    g.add(corpo, telhado)
    return g
  }
  function pedra(): Object3D {
    const m = new Mesh(new DodecahedronGeometry(1.2, 0), material('#8a8f98'))
    m.position.y = 0.8
    m.scale.set(1.3, 0.8, 1)
    return m
  }
  function poste(): Object3D {
    const g = new Group()
    const haste = new Mesh(new CylinderGeometry(0.1, 0.12, 3.5, 6), material('#3d3f46'))
    haste.position.y = 1.75
    const luz = new Mesh(
      new SphereGeometry(0.35, 10, 8),
      new MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd36b', emissiveIntensity: 1 }),
    )
    luz.position.y = 3.6
    g.add(haste, luz)
    return g
  }
  async function glb(objeto: Object3D): Promise<Uint8Array> {
    const bytes = await new GLTFExporter().parseAsync(objeto, { binary: true })
    assert.ok(bytes instanceof ArrayBuffer)
    return new Uint8Array(bytes)
  }
  function medidas(objeto: Object3D) {
    objeto.updateMatrixWorld(true)
    const caixa = new Box3().setFromObject(objeto)
    let triangulos = 0
    objeto.traverse((o) => {
      const g = (o as Mesh).geometry
      if (g) triangulos += (g.index ? g.index.count : g.attributes.position!.count) / 3
    })
    return {
      min: [caixa.min.x, caixa.min.y, caixa.min.z] as [number, number, number],
      max: [caixa.max.x, caixa.max.y, caixa.max.z] as [number, number, number],
      triangulos: Math.round(triangulos),
    }
  }

  // ---- 2. A oficina em memória, pelas intenções do agente ----
  const host = criarHostEmMemoria(),
    a = criarIntencoes(host),
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Jogo E', licenca: 'propria' })
  const modelos: Record<string, { bibliotecaId: string; modeloId: string; digest: string }> = {}
  for (const [nome, fazer] of [
    ['Árvore', arvore],
    ['Casa', casa],
    ['Pedra', pedra],
    ['Poste', poste],
  ] as const) {
    const objeto = fazer(),
      conteudo = await glb(objeto),
      m = medidas(objeto)
    const [modelo] = await host.importarModelos(biblioteca.id, [
      {
        nome,
        pasta: '',
        etiquetas: [],
        conteudo,
        digest: await digestDosBytes(conteudo),
        miniatura: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
        ...m,
      },
    ])
    modelos[nome] = { bibliotecaId: biblioteca.id, modeloId: modelo!.id, digest: modelo!.digest }
  }
  const mundo = await host.criarMundo('conta', 'Jogo E')
  await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
  const cenario = await host.criarCenario(mundo.id, 'Seis regiões')
  const id = cenario.id
  const revisao = async () => (await host.abrirCenario(id)).revisao
  await host.editarCenario(
    id,
    await revisao(),
    [{ tipo: 'base.definir', base: { tipo: 'plano', largura: 384, comprimento: 384 } }],
    'jogo-e-base',
  )
  await a.gerarTerreno(id, { tipo: 'colinas', altura: 1.2, escala: 160, semente: 7 })

  // Seis regiões em grade 3 x 2, cada uma com as vizinhas pelo lado.
  const X = [-192, -64, 64, 192],
    Z = [-192, 0, 192]
  const REGIOES = [
    ['Vila', 0, 0],
    ['Floresta', 1, 0],
    ['Caverna', 2, 0],
    ['Lago', 0, 1],
    ['Praia', 1, 1],
    ['Montanha', 2, 1],
  ] as const
  const centro = (coluna: number, linha: number) => ({
    x: (X[coluna]! + X[coluna + 1]!) / 2,
    z: (Z[linha]! + Z[linha + 1]!) / 2,
  })
  const vizinhas = (coluna: number, linha: number) =>
    REGIOES.filter(
      ([, c, l]) => Math.abs(c - coluna) + Math.abs(l - linha) === 1 && (c < coluna || l < linha),
    ).map(([nome]) => nome)
  for (const [nome, coluna, linha] of REGIOES)
    await a.desenharRegiao(id, {
      nome,
      x0: X[coluna]!,
      z0: Z[linha]!,
      x1: X[coluna + 1]!,
      z1: Z[linha + 1]!,
      vizinhas: vizinhas(coluna, linha),
    })

  // O lago: a bacia cavada no meio da região e a água a 2,5 m do fundo.
  const lago = centro(0, 1)
  await a.esculpirTerreno(id, {
    parametros: { ferramenta: 'abaixar', raio: 32, forca: 1, metros: 4 },
    pontos: [lago],
  })
  const [fundo] = await a.consultarPontos(id, [lago])
  await a.encherAgua(id, {
    nome: 'Lago',
    intencao: { tipo: 'lago', ponto: lago, nivel: (fundo?.altura ?? 0) + 2.5 },
  })

  // Os objetos: floresta densa, pedras na caverna e na montanha, árvores na praia, casas e
  // postes na vila.
  await a.espalhar(id, {
    modelos: [modelos.Árvore!],
    centro: centro(1, 0),
    raio: 58,
    densidade: 2,
    limite: 260,
    semente: 1,
  })
  await a.espalhar(id, {
    modelos: [modelos.Pedra!],
    centro: centro(2, 0),
    raio: 58,
    densidade: 1.2,
    limite: 140,
    semente: 2,
  })
  await a.espalhar(id, {
    modelos: [modelos.Pedra!],
    centro: centro(2, 1),
    raio: 58,
    densidade: 0.8,
    limite: 90,
    semente: 3,
  })
  await a.espalhar(id, {
    modelos: [modelos.Árvore!],
    centro: centro(1, 1),
    raio: 55,
    densidade: 0.6,
    limite: 60,
    semente: 4,
  })
  const vila = centro(0, 0)
  for (let i = 0; i < 16; i++)
    await a.colocarModelo(id, {
      ...modelos.Casa!,
      x: vila.x - 45 + (i % 4) * 30,
      z: vila.z - 45 + Math.floor(i / 4) * 30,
      giro: (i % 4) * (Math.PI / 2),
    })
  for (let i = 0; i < 8; i++)
    await a.colocarModelo(id, {
      ...modelos.Poste!,
      x: vila.x - 52 + (i % 4) * 34,
      z: vila.z - 30 + Math.floor(i / 4) * 60,
    })

  // O início no meio da vila e duas luzes de rua (as guias do jogo).
  const marcador = (
    idDoMarcador: string,
    nome: string,
    posicao: { x: number; y: number; z: number },
    configuracao: Record<string, unknown>,
  ) => ({
    tipo: 'marcador.definir' as const,
    marcador: {
      id: idDoMarcador,
      nome,
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao,
      giro: 0,
      noChao: true,
      objeto: null,
      configuracao,
    },
  })
  await host.editarCenario(
    id,
    await revisao(),
    [
      marcador(
        'inicio',
        'Início',
        { x: vila.x, y: 0, z: vila.z + 40 },
        {
          tipo: 'inicio',
          principal: true,
        },
      ),
      ...[0, 1].map((i) =>
        marcador(
          `luz-${i}`,
          `Luz da vila ${i + 1}`,
          { x: vila.x - 30 + i * 60, y: 4, z: vila.z },
          {
            tipo: 'luz',
            luz: {
              tipo: 'pontual',
              cor: '#ffd36b',
              intensidade: 30,
              alcance: 25,
              decaimento: 2,
              sombra: false,
            },
          },
        ),
      ),
    ] as never,
    'jogo-e-marcadores',
  )

  const objetos = (await host.abrirCenario(id)).documento.instancias.length
  assert.ok(objetos >= 400 && objetos <= 800, `o jogo E tem ${objetos} objetos (400 a 800)`)

  // O mesmo cenário sem regiões, para a comparação.
  const copia = await host.duplicarCenario(id)
  const semRegioes = (await host.abrirCenario(copia.id)).documento.regioes ?? []
  await host.editarCenario(
    copia.id,
    (await host.abrirCenario(copia.id)).revisao,
    semRegioes.map((r) => ({ tipo: 'regiao.remover' as const, id: r.id })),
    'jogo-e-sem-regioes',
  )

  // ---- 3. Compilar e importar no Estúdio ----
  async function pacoteDe(cenarioId: string) {
    const r = (await host.abrirCenario(cenarioId)).revisao,
      preparo = await host.prepararExportacao(cenarioId, r, new AbortController().signal)
    return compilarRevisaoDaOficina(
      host,
      preparo,
      { juntar: true, tamanhoDaRegiao: 256 },
      new AbortController().signal,
      () => {},
    )
  }

  {
    const d = (await host.abrirCenario(id)).documento
    console.log(
      '[jogo-e] base',
      JSON.stringify({ ...d.base, pecas: undefined, camadas: undefined }).slice(0, 400),
    )
    console.log('[jogo-e] orcamento', JSON.stringify(await a.orcamento(id)).slice(0, 1500))
  }
  const serial = async (cenarioId: string): Promise<PacoteSerial> => {
    const pacote = await pacoteDe(cenarioId)
    return {
      cena: pacote.cena,
      arquivos: [...pacote.arquivos].map(([caminho, bytes]) => [caminho, base64(bytes)]),
    }
  }
  return { objetos, regioes: await serial(id), inteiro: await serial(copia.id) }
}
