/**
 * O mundo de prova de 2 km (plano "Mundos de 2 km", lote 7, 23/11/2026), montado DENTRO do
 * navegador como o jogo E (`qa-jogo-e.ts`, que continua igual): a oficina em memória monta o mundo
 * pelas mesmas intenções do agente e compila em campo, com "Juntar peças".
 *
 * - base de 2048 m (pela regra do lote 4, 1024 × 1024 células de 2 m) e relevo por receita;
 * - 16 regiões de 512 m em grade 4 × 4, com as vizinhas pelo lado;
 * - um lago, uma estrada que atravessa a vila até a floresta, cerca de 1.200 objetos;
 * - o início na vila e duas luzes de rua.
 *
 * Quem chama é `playground/mundo-2km/preparar-cenario.mjs` (o Node grava o pacote).
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
import type { PacoteSerial } from './qa-jogo-e'

const assert = {
  ok(valor: unknown, recado = 'falhou'): asserts valor {
    if (!valor) throw Error(recado)
  },
}

const base64 = (bytes: Uint8Array) => {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

/** As 16 regiões, linha a linha (z), coluna a coluna (x). */
export const REGIOES_DO_MUNDO_2KM = [
  'Vila',
  'Floresta',
  'Caverna',
  'Montanha',
  'Lago',
  'Praia',
  'Campo',
  'Penhasco',
  'Pântano',
  'Bosque',
  'Vale',
  'Ruínas',
  'Baía',
  'Colina',
  'Deserto',
  'Planalto',
] as const

export async function montarMundoDe2km(): Promise<{ objetos: number; regioes: PacoteSerial }> {
  // ---- 1. Os modelos, feitos aqui (os mesmos do jogo E) ----
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
    biblioteca = await host.criarBiblioteca('conta', { nome: 'Mundo de 2 km', licenca: 'propria' })
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
  const mundo = await host.criarMundo('conta', 'Mundo de 2 km')
  await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
  const cenario = await host.criarCenario(mundo.id, 'Dezesseis regiões')
  const id = cenario.id
  const revisao = async () => (await host.abrirCenario(id)).revisao
  await host.editarCenario(
    id,
    await revisao(),
    [{ tipo: 'base.definir', base: { tipo: 'plano', largura: 2048, comprimento: 2048 } }],
    'mundo-2km-base',
  )
  await a.gerarTerreno(id, { tipo: 'colinas', altura: 1.5, escala: 480, semente: 7 })
  {
    const base = (await host.abrirCenario(id)).documento.base
    assert.ok(base.tipo === 'terreno', 'a base do mundo de 2 km não virou terreno')
    console.log('[mundo-2km] grade', base.colunas, 'x', base.linhas, 'passo', base.passo)
  }

  // 16 regiões de 512 m em grade 4 x 4, cada uma com as vizinhas pelo lado (o par vem da outra).
  const borda = [-1024, -512, 0, 512, 1024]
  const regiao = (i: number) => ({ coluna: i % 4, linha: Math.floor(i / 4) })
  const centro = (coluna: number, linha: number) => ({
    x: (borda[coluna]! + borda[coluna + 1]!) / 2,
    z: (borda[linha]! + borda[linha + 1]!) / 2,
  })
  for (const [i, nome] of REGIOES_DO_MUNDO_2KM.entries()) {
    const { coluna, linha } = regiao(i)
    await a.desenharRegiao(id, {
      nome,
      x0: borda[coluna]!,
      z0: borda[linha]!,
      x1: borda[coluna + 1]!,
      z1: borda[linha + 1]!,
      vizinhas: REGIOES_DO_MUNDO_2KM.filter((_, j) => {
        const r = regiao(j)
        return (
          Math.abs(r.coluna - coluna) + Math.abs(r.linha - linha) === 1 &&
          (r.coluna < coluna || r.linha < linha)
        )
      }),
    })
  }

  // O lago: a bacia cavada no meio da região e a água a 3 m do fundo.
  const lago = centro(0, 1)
  await a.esculpirTerreno(id, {
    parametros: { ferramenta: 'abaixar', raio: 70, forca: 1, metros: 6 },
    pontos: [lago],
  })
  const [fundo] = await a.consultarPontos(id, [lago])
  await a.encherAgua(id, {
    nome: 'Lago',
    intencao: { tipo: 'lago', ponto: lago, nivel: (fundo?.altura ?? 0) + 3 },
  })

  // Os objetos: florestas, bosques e pedras por várias regiões; casas e postes na vila.
  const espalhar = async (
    modelo: string,
    coluna: number,
    linha: number,
    limite: number,
    semente: number,
  ) =>
    a.espalhar(id, {
      modelos: [modelos[modelo]!],
      centro: centro(coluna, linha),
      raio: 200,
      densidade: 0.6,
      limite,
      semente,
    })
  await espalhar('Árvore', 1, 0, 220, 1)
  await espalhar('Pedra', 2, 0, 120, 2)
  await espalhar('Pedra', 3, 0, 100, 3)
  await espalhar('Árvore', 1, 1, 60, 4)
  await espalhar('Árvore', 1, 2, 200, 5)
  await espalhar('Árvore', 2, 2, 120, 6)
  await espalhar('Pedra', 3, 2, 90, 7)
  await espalhar('Árvore', 0, 3, 80, 8)
  await espalhar('Árvore', 2, 3, 100, 9)
  await espalhar('Pedra', 3, 3, 80, 10)
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

  // A estrada: atravessa a vila e segue até a floresta (o relevo em campo perto dela é o mais fino).
  const floresta = centro(1, 0)
  await a.tracarCaminho(id, {
    caminho: {
      tipo: 'trilha',
      nome: 'Estrada da vila',
      pontos: [
        { x: vila.x - 120, z: vila.z + 20 },
        { x: vila.x, z: vila.z + 20 },
        { x: (vila.x + floresta.x) / 2, z: vila.z - 10 },
        { x: floresta.x - 60, z: floresta.z },
      ],
      largura: 4,
      acabamento: null,
    },
  })

  // O início na vila e duas luzes de rua.
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
    'mundo-2km-marcadores',
  )

  const objetos = (await host.abrirCenario(id)).documento.instancias.length
  console.log('[mundo-2km] objetos', objetos)
  assert.ok(
    objetos >= 800 && objetos <= 2000,
    `o mundo de 2 km tem ${objetos} objetos (800 a 2000)`,
  )
  console.log('[mundo-2km] orcamento', JSON.stringify(await a.orcamento(id)).slice(0, 1500))

  // ---- 3. Compilar em campo, com "Juntar peças" ----
  const r = (await host.abrirCenario(id)).revisao,
    preparo = await host.prepararExportacao(id, r, new AbortController().signal)
  const pacote = await compilarRevisaoDaOficina(
    host,
    preparo,
    { juntar: true, tamanhoDaRegiao: 256, relevo: 'campo' },
    new AbortController().signal,
    () => {},
  )
  return {
    objetos,
    regioes: {
      cena: pacote.cena,
      arquivos: [...pacote.arquivos].map(([caminho, bytes]) => [caminho, base64(bytes)]),
    },
  }
}
