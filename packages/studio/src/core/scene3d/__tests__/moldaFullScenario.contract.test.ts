import { beforeAll, describe, expect, test } from 'bun:test'
import {
  type CenaCompilada,
  criarConsultaDeEntidadesDoNo,
  criarFonteDeAlturasCompilada,
  digestDoDocumentoDeCenario,
} from '@sistemazero/molda-cenarios-core/compilar'
import type { CenaParaStudio } from '@sistemazero/molda-cenarios-core/studio'
import { prepararConsultaDaAgua } from '@sistemazero/molda-cenarios-core/v2'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import { resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { sanitizeStoredProject } from '../../../state/projectValidation'
import {
  alturaAutoral,
  criarCenarioCompletoDeEnsaio,
  MATERIAL_DO_MODELO,
  TERRENO_DO_CONTRATO,
} from '../../../testing/moldaFullScenarioFixture'
import { decodeProjectAsset, digestAssetBytes } from '../../assetBinary'
import { createEmptyProject } from '../../project'
import { asset3DManifest, assetManifest, type ProjectAsset } from '../../projectAssets'
import { lerAssetDeCena3D, pacoteDeCena3D } from '../referencias'
import { criarTransporteDeCenas3D, resolverAssetsDoTransporte3D } from '../transporte'

/**
 * Contrato Molda Cenários → Estúdio com UM cenário real que tem tudo o que a missão pede
 * (§12, "Molda — Cenários 3D"): objetos e modelos, terreno, água, caminhos, grupos e conjuntos,
 * colisões, pontos de partida, marcadores, iluminação, referências de materiais e as regiões.
 *
 * O cenário sai do domínio real (host em memória do Molda Cenários + comandos de autoria), do
 * compilador real (`prepararCenarioParaStudio`) e da importação do próprio Estúdio
 * (`prepararImportacaoDeCena3D`), em `testing/moldaFullScenarioFixture.ts`. Cada recurso é
 * conferido pelo VALOR que a autora pôs, lido do lado do Estúdio (os materiais do projeto), não
 * só por "não está vazio".
 *
 * O que ainda não dá para provar aqui está nos `test.todo`, com o lugar exato onde para.
 */

type Cenario = Awaited<ReturnType<typeof criarCenarioCompletoDeEnsaio>>
type Autoria = Cenario['autoria']

/** A leitura do Estúdio: o envelope do material `scene3d` e os bytes de cada recurso. */
function leituraDoEstudio(r: Cenario) {
  const assets = r.plano.assets,
    primario = assets.find((a) => a.id === r.plano.assetId)
  if (!primario) throw Error('A importação não criou o material do cenário.')
  const envelope: CenaParaStudio = lerAssetDeCena3D(primario),
    cena: CenaCompilada = envelope.cena,
    porId = new Map(assets.map((a) => [a.id, a])),
    assetDoCaminho = new Map(envelope.recursos.map((x) => [x.caminho, porId.get(x.asset)!])),
    arquivo = (caminho: string) => {
      const a = cena.arquivos.find((f) => f.caminho === caminho)
      if (!a) throw Error(`O inventário não tem “${caminho}”.`)
      return a
    },
    bytes = (caminho: string) => decodeProjectAsset(assetDoCaminho.get(caminho)!.dataUrl).bytes
  return { assets, primario, envelope, cena, assetDoCaminho, arquivo, bytes }
}

function jsonDoGlb(bytes: Uint8Array): {
  materials?: {
    name?: string
    alphaMode?: string
    pbrMetallicRoughness?: {
      baseColorFactor?: number[]
      metallicFactor?: number
      roughnessFactor?: number
      baseColorTexture?: { index: number }
    }
  }[]
  images?: { mimeType?: string; bufferView?: number }[]
} {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  expect(v.getUint32(0, true)).toBe(0x46546c67)
  expect(v.getUint32(16, true)).toBe(0x4e4f534a)
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + v.getUint32(12, true))))
}

/** sRGB → linear, a mesma conversão de cor que o three faz para `baseColorFactor`. */
function linear(hex: string): number[] {
  return [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
}

function matrizEsperada(t: Autoria['instancias'][number]['transformacao']): number[] {
  return new Matrix4().compose(
    new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
    new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z)),
    new Vector3(t.escala.x, t.escala.y, t.escala.z),
  ).elements
}

function expectMatriz(real: readonly number[], esperada: readonly number[]) {
  expect(real).toHaveLength(16)
  for (const [i, v] of esperada.entries()) expect(real[i]!).toBeCloseTo(v, 9)
}

/** Passo de quantização da peça de alturas (Uint16 entre min e max). */
const PASSO_DAS_ALTURAS = (TERRENO_DO_CONTRATO.max - TERRENO_DO_CONTRATO.min) / 65535

/** O Canvas 2D nativo só vale DURANTE a compilação; os vizinhos da suíte voltam ao happy-dom. */
const ambienteAntes = {
  OffscreenCanvas: (globalThis as Record<string, unknown>).OffscreenCanvas,
  ImageData: (globalThis as Record<string, unknown>).ImageData,
  createElement: document.createElement,
}

/** Uma compilação só para os dois blocos (cada compilação real leva alguns segundos). */
let compilado: Promise<Cenario> | undefined
const cenarioSeparado = () => {
  compilado ??= criarCenarioCompletoDeEnsaio()
  return compilado
}

function entidadesAutorais(d: Autoria) {
  return [
    ...d.grupos.map((e) => ({ e, tipo: 'grupo' })),
    ...(d.montagens ?? []).map((e) => ({ e, tipo: 'montagem' })),
    ...d.instancias.map((e) => ({ e, tipo: 'objeto' })),
    ...d.aguas.map((e) => ({ e, tipo: 'agua' })),
    ...d.caminhos.map((e) => ({ e, tipo: 'caminho' })),
    ...d.marcadores.map((e) => ({ e, tipo: 'marcador' })),
  ]
}

describe('Molda Cenários → Estúdio: um cenário real com tudo o que a missão pede', () => {
  let r: Cenario
  let l: ReturnType<typeof leituraDoEstudio>
  beforeAll(async () => {
    r = await cenarioSeparado()
    l = leituraDoEstudio(r)
  }, 120_000)

  test('o ensaio devolve o ambiente de testes como estava', () => {
    const g = globalThis as Record<string, unknown>
    expect(g.OffscreenCanvas).toBe(ambienteAntes.OffscreenCanvas)
    expect(g.ImageData).toBe(ambienteAntes.ImageData)
    expect(document.createElement).toBe(ambienteAntes.createElement)
    expect(document.createElement('canvas')).toBeInstanceOf(HTMLCanvasElement)
  })

  test('a importação leva o pacote inteiro, da revisão autoral, sem aviso, e reabre igual', async () => {
    const { cena, envelope, assets } = l
    expect(r.avisos).toEqual([])
    expect(r.plano.avisos).toBeUndefined()
    // É a compilação DESTE documento, nesta revisão.
    expect(cena.fonte).toEqual({
      cenario: r.resumo.id,
      revisao: r.resumo.revisao,
      digest: await digestDoDocumentoDeCenario(r.autoria),
    })
    expect(cena.nome).toBe('Vale do contrato')
    // Todo arquivo do inventário virou um material do projeto, com os mesmos bytes.
    expect(new Set(envelope.recursos.map((x) => x.caminho))).toEqual(
      new Set(cena.arquivos.map((a) => a.caminho)),
    )
    for (const a of cena.arquivos) {
      const asset = l.assetDoCaminho.get(a.caminho)!
      expect(asset.kind).toBe(
        a.mime === 'model/gltf-binary'
          ? 'model3d'
          : a.mime === 'application/octet-stream'
            ? 'scene3d-data'
            : 'image',
      )
      expect(await digestAssetBytes(l.bytes(a.caminho))).toBe(a.digest)
      expect(asset.libOrigin).toBe('molda')
    }
    // O pacote reconstruído pelo Estúdio passa pela mesma conferência do carregador.
    const pacote = pacoteDeCena3D(l.primario, assets)
    await conferirConteudoCompilado(pacote.cena, pacote.arquivos)
    // Abrir o projeto do disco (a abertura de produção) não perde nada.
    const aberto = sanitizeStoredProject(
      { ...createEmptyProject('contrato', 'Contrato'), assets },
      'contrato',
    )
    expect(aberto?.assets).toEqual(assets)
    // O transporte até a prévia conserva o grafo inteiro por ID.
    const transporte = criarTransporteDeCenas3D(assets)!,
      reconstruidos = resolverAssetsDoTransporte3D(
        transporte,
        assetManifest(assets),
        asset3DManifest(assets),
      ),
      resolvido = pacoteDeCena3D(
        reconstruidos.find((a) => a.id === r.plano.assetId)!,
        reconstruidos,
      )
    expect(JSON.stringify(resolvido.cena)).toBe(JSON.stringify(pacote.cena))
    expect([...resolvido.arquivos]).toEqual([...pacote.arquivos])
  })

  test('nenhuma entidade autoral se perde: id, nome, tipo, pasta e dados do jogo', () => {
    const compiladas = new Map(l.cena.entidades.map((e) => [e.id, e])),
      autorais = entidadesAutorais(r.autoria)
    // 2 pastas, 1 montagem, 4 objetos, 1 água, 2 caminhos e 7 marcadores.
    expect(autorais.length).toBe(17)
    for (const { e, tipo } of autorais) {
      const c = compiladas.get(e.id)
      expect(c, e.id).toBeDefined()
      expect(c!.nome).toBe(e.nome)
      expect(c!.tipo).toBe(tipo as never)
      expect(c!.grupo).toBe(e.grupo)
      expect(c!.oculto).toBe(false)
      expect(c!.propriedades).toEqual(e.propriedades)
    }
  })

  test('objetos e modelos: cada instância vira um nó com o GLB do acervo e a transformação autoral', () => {
    const { cena } = l
    expect(cena.fontes.modelos).toEqual([r.modelo])
    for (const o of r.autoria.instancias) {
      const nos = cena.nos.filter((n) => n.entidade === o.id)
      expect(nos, o.id).toHaveLength(1)
      const no = nos[0]!
      expect(l.arquivo(no.arquivo)).toMatchObject({ mime: 'model/gltf-binary', papel: 'modelo' })
      expect(l.assetDoCaminho.get(no.arquivo)!.kind).toBe('model3d')
      expectMatriz(no.matriz, matrizEsperada(o.transformacao))
      // A âncora da entidade é a mesma transformação.
      expectMatriz(
        cena.entidades.find((e) => e.id === o.id)!.matriz!,
        matrizEsperada(o.transformacao),
      )
    }
    // As três pedras sem tinta compartilham UM arquivo (deduplicado) e UM material do projeto.
    const semTinta = ['pedra-capsula', 'pedra-malha', 'pedra-enfeite'].map(
      (id) => cena.nos.find((n) => n.entidade === id)!.arquivo,
    )
    expect(new Set(semTinta).size).toBe(1)
  })

  test('terreno: grade, peça autoral e as alturas físicas chegam ao Estúdio', async () => {
    const t = l.cena.terreno!
    expect(t).toMatchObject({
      ...TERRENO_DO_CONTRATO,
      cobertura: 'grade',
      pecas: [{ coluna: 0, linha: 0 }],
      recortes: [],
    })
    // As alturas são um material `scene3d-data` (Float32 LE, 129 × 129) e o PNG16 é uma imagem.
    const bin = l.assetDoCaminho.get(t.alturas)!,
      png = l.assetDoCaminho.get(t.pngAlturas)!
    expect(bin.kind).toBe('scene3d-data')
    expect(bin.dado3d).toEqual({ papel: 'alturas' })
    expect(png).toMatchObject({ kind: 'image', width: 129, height: 129 })
    const campo = l.bytes(t.alturas),
      v = new DataView(campo.buffer, campo.byteOffset, campo.byteLength),
      lado = t.colunas + 1
    expect(campo.byteLength).toBe(lado * (t.linhas + 1) * 4)
    for (const [i, j] of [
      [0, 0],
      [10, 20],
      [37, 5],
      [63, 63],
    ] as const)
      expect(
        Math.abs(v.getFloat32((j * lado + i) * 4, true) - alturaAutoral(i, j)),
      ).toBeLessThanOrEqual(PASSO_DAS_ALTURAS)
    // Fora da peça autoral, a grade fica no fundo.
    for (const [i, j] of [
      [100, 10],
      [10, 100],
      [120, 120],
    ] as const)
      expect(v.getFloat32((j * lado + i) * 4, true)).toBe(TERRENO_DO_CONTRATO.fundo)
    // A consulta física que o runtime monta com esses dados devolve a altura autoral.
    const pacote = pacoteDeCena3D(l.primario, l.assets),
      conferido = await conferirConteudoCompilado(pacote.cena, pacote.arquivos),
      alturas = criarFonteDeAlturasCompilada(t, conferido.terreno!.alturas)
    expect(Math.abs(alturas(-64 + 10, -64 + 20) - alturaAutoral(10, 20))).toBeLessThanOrEqual(
      PASSO_DAS_ALTURAS,
    )
    expect(alturas(40, 40)).toBe(TERRENO_DO_CONTRATO.fundo)
  })

  test('água: o lago chega com os parâmetros autorais, a lâmina assada e a consulta de nado', async () => {
    const { cena } = l,
      autoral = r.autoria.aguas.find((a) => a.id === 'lago')!
    expect(cena.aguas).toEqual(r.autoria.aguas)
    expect(autoral).toMatchObject({
      tipo: 'lago',
      centro: { x: 30, z: -30 },
      nivel: 0.5,
      profundidade: 2,
      nado: true,
      aparencia: { corRasa: '#77ccdd', corProfunda: '#226688' },
    })
    // Um nó de água com efeito: o runtime restaura o material dinâmico pelos parâmetros.
    const no = cena.nos.find((n) => n.entidade === 'lago')!
    expect(no.efeito).toBe('agua')
    expect(l.arquivo(no.arquivo).papel).toBe('agua')
    expect(no.volume).toEqual({ min: { x: 22, y: 0.5, z: -38 }, max: { x: 38, y: 0.5, z: -22 } })
    const glb = jsonDoGlb(l.bytes(no.arquivo))
    expect(glb.materials?.[0]).toMatchObject({ name: 'mcn_agua_estatica', alphaMode: 'BLEND' })
    expect(glb.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture?.index).toBe(0)
    expect(glb.images?.[0]?.mimeType).toBe('image/png')
    // A consulta de nado (a mesma do runtime) lê o lago dos dados que o Estúdio guardou.
    const pacote = pacoteDeCena3D(l.primario, l.assets),
      conferido = await conferirConteudoCompilado(pacote.cena, pacote.arquivos),
      alturas = criarFonteDeAlturasCompilada(cena.terreno!, conferido.terreno!.alturas),
      consulta = prepararConsultaDaAgua(cena.aguas[0]!)
    expect(consulta.em(30, -30, alturas)).toEqual({ nivel: 0.5, profundidade: 0.5 })
    expect(consulta.em(0, 0, alturas)).toBeNull()
  })

  test('caminhos: trilha e muro chegam com os pontos, o tipo e a cor autorais', () => {
    const { cena } = l
    expect(cena.caminhos).toEqual(r.autoria.caminhos)
    expect(cena.caminhos.map((c) => [c.id, c.tipo, c.pontos.length])).toEqual([
      ['trilha', 'trilha', 3],
      ['muro', 'muro', 2],
    ])
    const trilha = cena.nos.filter((n) => n.entidade === 'trilha'),
      muro = cena.nos.filter((n) => n.entidade === 'muro')
    expect(trilha).toHaveLength(1)
    expect(muro.length).toBeGreaterThanOrEqual(1)
    for (const n of [...trilha, ...muro]) expect(l.arquivo(n.arquivo).papel).toBe('caminho')
    // A cor autoral da trilha está assada no material do GLB que o Estúdio guardou.
    const cor = jsonDoGlb(l.bytes(trilha[0]!.arquivo)).materials?.[0]?.pbrMetallicRoughness
      ?.baseColorFactor
    for (const [i, c] of linear('#b89163').entries()) expect(cor![i]!).toBeCloseTo(c, 5)
  })

  test('grupos e conjuntos: pastas aninhadas, a montagem e a procedência do conjunto', () => {
    const { cena } = l,
      e = new Map(cena.entidades.map((x) => [x.id, x]))
    expect(e.get('praca')).toMatchObject({ tipo: 'grupo', grupo: null })
    expect(e.get('pedras')).toMatchObject({
      tipo: 'grupo',
      grupo: 'praca',
      propriedades: { bioma: 'campo' },
    })
    expect(
      cena.entidades
        .filter((x) => x.grupo === 'pedras')
        .map((x) => x.id)
        .sort(),
    ).toEqual(['pedra-caixa', 'pedra-capsula'])
    expect(
      cena.entidades
        .filter((x) => x.grupo === 'praca')
        .map((x) => x.id)
        .sort(),
    ).toEqual(['banco-da-praca', 'pedra-malha', 'pedras', 'trilha'])
    // O conjunto: a montagem autoral, a peça que ela expande e a revisão fixada da biblioteca.
    const montagem = e.get('banco-da-praca')!
    expect(montagem).toMatchObject({ tipo: 'montagem', grupo: 'praca', nome: 'Banco da praça' })
    expectMatriz(
      montagem.matriz!,
      matrizEsperada({
        posicao: { x: -20, y: 1, z: 30 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1.5, y: 1.5, z: 1.5 },
      }),
    )
    const pecas = cena.entidades.filter((x) => x.grupo === 'banco-da-praca')
    expect(pecas.map((x) => [x.id, x.nome, x.tipo])).toEqual([
      ['banco-da-praca/objeto/0', 'Assento', 'objeto'],
    ])
    expect(cena.nos.filter((n) => n.entidade === 'banco-da-praca/objeto/0')).toHaveLength(1)
    expect(cena.fontes.conjuntos).toEqual([
      {
        id: r.conjunto.definicao,
        biblioteca: r.conjunto.biblioteca,
        conjunto: r.conjunto.id,
        revisao: 1,
      },
    ])
  })

  test('colisões: o tipo escolhido por objeto, o muro, o conjunto e o chão por peça', () => {
    const { cena } = l
    for (const o of r.autoria.instancias) {
      const cs = cena.colisoes.filter((c) => c.entidade === o.id)
      if (o.colisao === 'nenhuma') {
        expect(cs, o.id).toHaveLength(0)
        continue
      }
      expect(
        cs.map((c) => c.tipo),
        o.id,
      ).toEqual([o.colisao] as never)
      expectMatriz(cs[0]!.matriz, matrizEsperada(o.transformacao))
      expect(l.arquivo(cs[0]!.arquivo)).toMatchObject({
        mime: 'model/gltf-binary',
        papel: 'colisao',
      })
      expect(l.assetDoCaminho.get(cs[0]!.arquivo)!.kind).toBe('model3d')
    }
    expect(r.autoria.instancias.map((o) => o.colisao)).toEqual([
      'caixa',
      'capsula',
      'malha',
      'nenhuma',
    ])
    // A peça do conjunto herda a colisão do conteúdo publicado.
    expect(
      cena.colisoes.filter((c) => c.entidade === 'banco-da-praca/objeto/0').map((c) => c.tipo),
    ).toEqual(['caixa'])
    // O muro (caminho estrutural) colide; a trilha (piso simples) usa o chão do terreno.
    const muro = cena.colisoes.filter((c) => c.entidade === 'muro')
    expect(muro.length).toBeGreaterThanOrEqual(1)
    expect(new Set(muro.map((c) => c.tipo))).toEqual(new Set(['caminho']))
    expect(cena.colisoes.filter((c) => c.entidade === 'trilha')).toHaveLength(0)
    // O chão: uma colisão de terreno por peça de 64 × 64, cobrindo a grade inteira.
    const chao = cena.colisoes.filter((c) => c.tipo === 'terreno')
    expect(chao.every((c) => c.entidade === null)).toBe(true)
    expect(
      chao.map((c) => [c.volume.min.x, c.volume.min.z, c.volume.max.x, c.volume.max.z]).sort(),
    ).toEqual(
      [
        [-64, -64, 0, 0],
        [0, -64, 64, 0],
        [-64, 0, 0, 64],
        [0, 0, 64, 64],
      ].sort(),
    )
  })

  test('pontos de partida: o principal vence, o secundário fica, e o Estúdio chega neles', () => {
    const m = new Map(l.cena.marcadores.map((x) => [x.id, x])),
      inicio = m.get('inicio')!,
      volta = m.get('inicio-2')!
    expect(inicio.configuracao).toEqual({ tipo: 'inicio', principal: true })
    expect(inicio.giro).toBe(0.75)
    expect(inicio.posicao.x).toBe(-30)
    expect(inicio.posicao.z).toBe(-30)
    // "No chão": a altura é a do terreno autoral naquele ponto (i = j = 34 na peça).
    expect(Math.abs(inicio.posicao.y - alturaAutoral(34, 34))).toBeLessThanOrEqual(
      PASSO_DAS_ALTURAS,
    )
    expect(volta).toMatchObject({
      posicao: { x: 40, y: 2, z: 40 },
      configuracao: { tipo: 'inicio', principal: false },
    })
    // A mesma chegada que os motores 3D do Estúdio usam (`sceneSDK.inicio`).
    const semMedir = {
        rastrear: () => {
          throw Error('Com marcador de início, a chegada não mede o chão.')
        },
      } as unknown as Parameters<typeof resolverInicioDaCena>[0]['colisoes'],
      chegada = resolverInicioDaCena({ dados: l.cena, colisoes: semMedir })
    expect(chegada.marcador).toBe('inicio')
    expect(chegada.giro).toBe(0.75)
    expect(chegada.posicao.toArray()).toEqual([
      inicio.posicao.x,
      inicio.posicao.y,
      inicio.posicao.z,
    ])
    const semPrincipal = resolverInicioDaCena({
      dados: { ...l.cena, marcadores: l.cena.marcadores.filter((x) => x.id !== 'inicio') },
      colisoes: semMedir,
    })
    expect(semPrincipal.marcador).toBe('inicio-2')
  })

  test('marcadores: ponto ligado a objeto, zona, rota, câmera e luz, com os dados do jogo', () => {
    const m = new Map(l.cena.marcadores.map((x) => [x.id, x]))
    expect([...m.keys()]).toEqual(r.autoria.marcadores.map((x) => x.id))
    for (const a of r.autoria.marcadores) {
      const c = m.get(a.id)!
      expect(c.nome).toBe(a.nome)
      expect(c.objeto).toBe(a.objeto)
      expect(c.propriedades).toEqual(a.propriedades)
      expect(c.configuracao).toEqual(a.configuracao)
      expect(c.giro).toBe(a.giro)
      if (!a.noChao) expect(c.posicao).toEqual(a.posicao)
    }
    expect(m.get('bau')).toMatchObject({
      objeto: 'pedra-caixa',
      propriedades: { item: 'chave', moedas: 5 },
      configuracao: { tipo: 'ponto' },
    })
    expect(m.get('zona-perigo')!.configuracao).toEqual({
      tipo: 'zona',
      forma: { tipo: 'caixa', tamanho: { x: 16, y: 4, z: 16 } },
    })
    // A rota chega amostrada em coordenadas do mundo, com as distâncias acumuladas.
    const rota = m.get('ronda')!.rota!
    expect(rota.fechada).toBe(false)
    expect(rota.comprimento).toBeCloseTo(20, 9)
    expect(rota.pontos[0]).toEqual({ x: 0, y: 1, z: 40 })
    expect(rota.pontos.at(-1)).toEqual({ x: 10, y: 1, z: 50 })
    expect(rota.distancias.at(-1)).toBeCloseTo(20, 9)
    // A câmera chega como vista pronta: posição, alvo no mundo e campo de visão.
    expect(m.get('camera-entrada')!.camera).toEqual({
      posicao: { x: -40, y: 10, z: -40 },
      alvo: { x: -30, y: 5, z: -30 },
      campoDeVisao: 55,
    })
  })

  test('iluminação: o ambiente global inteiro e a luz local do marcador', () => {
    expect(l.cena.ambiente).toEqual(r.autoria.iluminacao)
    expect(l.cena.ambiente).toMatchObject({
      hora: 17.5,
      sol: { cor: '#fff1d0', intensidade: 2.5, sombra: true },
      ambiente: { ceu: '#9ec9ff', chao: '#5a4a3a', intensidade: 0.6 },
      ceu: { tipo: 'cor', cor: '#88aadd' },
      nevoa: { tipo: 'linear', perto: 30, longe: 400 },
      sombras: { resolucao: 1024, alcance: 96 },
    })
    expect(l.cena.marcadores.find((x) => x.id === 'lampiao')!.configuracao).toEqual({
      tipo: 'luz',
      luz: {
        tipo: 'pontual',
        cor: '#ffcc88',
        intensidade: 30,
        alcance: 12,
        decaimento: 2,
        sombra: false,
      },
    })
  })

  test('referências de materiais: o material do modelo, a tinta da instância e a licença', () => {
    const { cena } = l,
      material = (entidade: string) =>
        jsonDoGlb(l.bytes(cena.nos.find((n) => n.entidade === entidade)!.arquivo)).materials!
    // O material PBR nomeado do GLB do acervo chega intacto.
    expect(material('pedra-capsula')).toEqual([MATERIAL_DO_MODELO] as never)
    expect(material('banco-da-praca/objeto/0')).toEqual([MATERIAL_DO_MODELO] as never)
    // A tinta da instância multiplica a cor base, em espaço linear, no mesmo material.
    const [tingido] = material('pedra-caixa'),
      base = MATERIAL_DO_MODELO.pbrMetallicRoughness.baseColorFactor
    expect(tingido!.name).toBe(MATERIAL_DO_MODELO.name)
    for (const [i, c] of linear('#c08040').entries())
      expect(tingido!.pbrMetallicRoughness!.baseColorFactor![i]!).toBeCloseTo(base[i]! * c, 5)
    // A procedência do acervo e a licença viajam com o cenário e com os materiais do projeto.
    expect(cena.licencas).toEqual([
      { id: r.modelo.biblioteca, nome: 'Acervo', licenca: 'restrita' },
    ])
    const modelo = l.assetDoCaminho.get(
      cena.nos.find((n) => n.entidade === 'pedra-caixa')!.arquivo,
    )!
    expect(modelo.license?.attribution).toBe(
      `Procedência: ${r.resumo.id}, revisão ${r.resumo.revisao}.`,
    )
  })

  test('regiões: uma peça visual e física por região de 64 m, e âncoras de todas as entidades', () => {
    const { cena } = l,
      t = cena.terreno!,
      setores = cena.nos.filter(
        (n) => n.entidade === null && l.arquivo(n.arquivo).papel === 'terreno',
      )
    // 2 × 2 regiões do relevo (peças de 64 células × passo de 1 m), cada uma um nó próprio.
    expect(setores).toHaveLength((t.colunas / 64) * (t.linhas / 64))
    expect(
      setores.map((n) => [n.volume.min.x, n.volume.min.z, n.volume.max.x, n.volume.max.z]).sort(),
    ).toEqual(
      [
        [-64, -64, 0, 0],
        [0, -64, 64, 0],
        [-64, 0, 0, 64],
        [0, 0, 64, 64],
      ].sort(),
    )
    // Só a região da peça autoral tem relevo; as outras estão no fundo.
    const relevo = setores.find((n) => n.volume.max.x === 0 && n.volume.max.z === 0)!
    expect(relevo.volume.max.y).toBeCloseTo(alturaAutoral(64, 64), 3)
    for (const n of setores.filter((x) => x !== relevo)) expect(n.volume.max.y).toBe(0)
    // Toda entidade com geometria tem âncora (matriz + volume) para recorte por região.
    for (const e of cena.entidades.filter((x) => x.tipo !== 'marcador')) {
      expect(e.matriz, e.id).toHaveLength(16)
      expect(e.volume, e.id).toBeDefined()
    }
    expect(cena.entidades.find((e) => e.id === 'lago')!.volume).toEqual({
      min: { x: 22, y: 0.5, z: -38 },
      max: { x: 38, y: 0.5, z: -22 },
    })
  })

  test.todo('streaming: índice de regiões para carregar e descartar sob demanda — depende de entrega externa: o formato `molda-cena-compilada` v1 não tem lista de regiões (`CenaCompiladaSchema`, molda-cenarios-core/src/compilar/schema.ts) e o Estúdio carrega a cena inteira de uma vez (`carregarCena3DDoProjeto` → `carregarCenaNoThree`); "regiões e streaming genéricos" pedem proposta aprovada (mapa-da-missao, Etapa 4)', () => {})
  test.todo('textura de biblioteca no material (`textura.definir` → `cena.texturas` → material `image`): o formato e a importação a representam, mas o compilador decodifica a imagem por <img> (`decodificarImagem`, molda-cenarios-motor/src/texturas.ts) e o happy-dom não carrega imagens; a prova é no navegador', () => {})
  test.todo('carga no Three do cenário completo: `carregarCena3DDoProjeto` não termina no bun porque o GLB da água embute um PNG lido por <img> (`novoLeitor`, molda-cenarios-motor/src/modelos.ts); a prova no navegador é `e2e/scene3d-document.flow.ts` (cenário mais simples)', () => {})
})

describe('com "Juntar peças" (regiões de 128 m do Estúdio)', () => {
  let r: Cenario
  let l: ReturnType<typeof leituraDoEstudio>
  let separado: Cenario
  beforeAll(async () => {
    r = await criarCenarioCompletoDeEnsaio({ juntar: true })
    l = leituraDoEstudio(r)
    separado = await cenarioSeparado()
  }, 180_000)

  test('o visual estático vira lotes por região, sem perder entidade, colisão, água ou terreno', () => {
    const { cena } = l,
      base = leituraDoEstudio(separado).cena,
      lotes = cena.nos.filter((n) => n.faixas)
    expect(lotes.length).toBeGreaterThanOrEqual(1)
    // Cada lote está ancorado no centro de uma região de 128 m (REGIAO_DE_JUNCAO_DO_ESTUDIO).
    for (const n of lotes) {
      const [x, y, z] = n.matriz.slice(12, 15) as [number, number, number]
      expect(Number.isInteger(x / 128 - 0.5) && Number.isInteger(z / 128 - 0.5)).toBe(true)
      expect(y).toBe(0)
      // A seleção por triângulo continua achando a entidade de cada faixa.
      const consulta = criarConsultaDeEntidadesDoNo(n)
      for (const f of n.faixas!) expect(consulta(f.malha, f.primeiroTriangulo)).toBe(f.entidade)
    }
    const nasFaixas = new Set(lotes.flatMap((n) => n.faixas!.map((f) => f.entidade)))
    for (const id of ['banco-da-praca/objeto/0', 'trilha', 'muro'])
      expect(nasFaixas.has(id)).toBe(true)
    // Peças com dados de jogo e a água (efeito dinâmico) continuam separadas.
    for (const id of ['pedra-caixa', 'pedra-capsula', 'pedra-malha', 'pedra-enfeite'])
      expect(
        cena.nos.filter((n) => n.entidade === id),
        id,
      ).toHaveLength(1)
    expect(cena.nos.find((n) => n.entidade === 'lago')!.efeito).toBe('agua')
    // Juntar mexe só no desenho: entidades, colisões, água, caminhos, marcadores e ambiente iguais.
    expect(cena.entidades).toEqual(base.entidades)
    expect(cena.colisoes.map((c) => [c.entidade, c.tipo, c.volume])).toEqual(
      base.colisoes.map((c) => [c.entidade, c.tipo, c.volume]),
    )
    expect(cena.aguas).toEqual(base.aguas)
    expect(cena.caminhos).toEqual(base.caminhos)
    expect(cena.marcadores).toEqual(base.marcadores)
    expect(cena.ambiente).toEqual(base.ambiente)
    expect(cena.terreno).toEqual(base.terreno)
    const digestDasAlturas = (c: CenaCompilada) =>
      c.arquivos.find((a) => a.caminho === c.terreno!.alturas)!.digest
    expect(digestDasAlturas(cena)).toBe(digestDasAlturas(base))
    // E o projeto recebe menos modelos 3D para desenhar.
    const modelos = (assets: readonly ProjectAsset[]) =>
      assets.filter((a) => a.kind === 'model3d').length
    expect(modelos(r.plano.assets)).toBeLessThan(modelos(separado.plano.assets))
  })
})
