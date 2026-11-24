import { describe, expect, test } from 'bun:test'
import type { CatalogoDeCenario, ModeloDeCatalogo } from '../src/catalogo'
import type { DocumentoDeCenario as DocumentoV1 } from '../src/documento'
import {
  abrirDocumento,
  alteracoesDoGesto,
  ConflitoDeCenario,
  conferirGlb,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  digestDosBytes,
  executarLote,
  type InstanciaDeCenario,
  migrarDaV1,
  posicaoNoMundo,
  resolverPeloCatalogo,
  validarDocumento,
} from '../src/v2'

const digest = (letra: string) => letra.repeat(64)
const arvore = { id: 'arvore', biblioteca: 'aventura', modelo: 'arvore-01', digest: digest('a') }
const objeto = (id: string, extra: Partial<InstanciaDeCenario> = {}): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'arvore',
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
  colisao: 'caixa',
  ...extra,
})
function cenario(): DocumentoDeCenario {
  return {
    ...criarDocumentoVazio('fase-1', 'Fase 1'),
    modelos: [arvore],
    instancias: [objeto('a')],
  }
}

describe('documento v2', () => {
  test('um cenário vazio sobre chão plano é válido e não pressupõe jogo nenhum', () => {
    const d = validarDocumento(criarDocumentoVazio('novo', 'Novo cenário'))
    expect(d.base).toEqual({ tipo: 'plano', largura: 256, comprimento: 256 })
    expect(d.versao).toBe(2)
  })
  test('aceita escala por eixo e propriedades personalizadas', () => {
    const d = cenario()
    d.instancias[0]!.transformacao.escala = { x: 2, y: 0.5, z: 3 }
    d.instancias[0]!.propriedades = { vida: 3, 'jogo.tipo': 'inimigo', voa: true }
    expect(validarDocumento(d).instancias[0]!.propriedades).toEqual({
      vida: 3,
      'jogo.tipo': 'inimigo',
      voa: true,
    })
  })
  test('recusa objeto cujo modelo não está na tabela do cenário', () => {
    const d = cenario()
    d.instancias.push(objeto('b', { modelo: 'pedra' }))
    expect(() => validarDocumento(d)).toThrow('Modelo fora da tabela do cenário: b')
  })
  test('quem valida pode conferir os modelos contra o próprio acervo', () => {
    expect(() => validarDocumento(cenario(), { modeloExiste: () => false })).toThrow(
      'Modelo ausente: arvore',
    )
    expect(
      validarDocumento(cenario(), { modeloExiste: (m) => m.digest === digest('a') }),
    ).toBeTruthy()
  })
  test('recusa dois mares e marcador preso a objeto inexistente', () => {
    const d = cenario()
    const mar = (id: string) =>
      ({
        id,
        nome: id,
        grupo: null,
        bloqueado: false,
        oculto: false,
        tipo: 'mar',
        nivel: 0,
      }) as const
    d.aguas = [mar('mar-1'), mar('mar-2')]
    expect(() => validarDocumento(d)).toThrow('Só cabe um mar')
    const m = cenario()
    m.marcadores = [
      {
        id: 'inicio',
        nome: 'Início',
        grupo: null,
        bloqueado: false,
        oculto: false,
        posicao: { x: 0, y: 0, z: 0 },
        giro: 0,
        noChao: true,
        objeto: 'fantasma',
      },
    ]
    expect(() => validarDocumento(m)).toThrow('Objeto do marcador ausente: inicio')
  })
})

describe('comandos v2', () => {
  test('um lote registra o modelo e põe o objeto; a entrada não é alterada', () => {
    const inicial = { documento: criarDocumentoVazio('fase-1', 'Fase 1'), revisao: 0 }
    const depois = executarLote(inicial, {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'modelo.definir', modelo: arvore },
        { tipo: 'instancia.criar', instancia: objeto('a') },
      ],
    })
    expect(depois.revisao).toBe(1)
    expect(depois.documento.instancias).toHaveLength(1)
    expect(inicial.documento.instancias).toHaveLength(0)
  })
  test('o lote é atômico: um comando inválido desfaz os anteriores', () => {
    const estado = { documento: cenario(), revisao: 4 }
    expect(() =>
      executarLote(estado, {
        revisaoEsperada: 4,
        comandos: [
          { tipo: 'instancia.criar', instancia: objeto('b') },
          { tipo: 'instancia.criar', instancia: objeto('c', { modelo: 'pedra' }) },
        ],
      }),
    ).toThrow('Modelo fora da tabela')
    expect(estado.documento.instancias.map((o) => o.id)).toEqual(['a'])
  })
  test('revisão diferente da esperada é conflito', () => {
    expect(() =>
      executarLote(
        { documento: cenario(), revisao: 2 },
        { revisaoEsperada: 1, comandos: [{ tipo: 'cenario.renomear', nome: 'Outro' }] },
      ),
    ).toThrow(ConflitoDeCenario)
  })
  test('não remove da tabela um modelo que ainda está em uso', () => {
    const estado = { documento: cenario(), revisao: 0 }
    expect(() =>
      executarLote(estado, {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'modelo.remover', id: 'arvore' }],
      }),
    ).toThrow('Modelo em uso: arvore')
    const livre = executarLote(estado, {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'instancia.remover', id: 'a' },
        { tipo: 'modelo.remover', id: 'arvore' },
      ],
    })
    expect(livre.documento.modelos).toEqual([])
  })
  test('elemento trancado só aceita ser destrancado, e sozinho', () => {
    const d = cenario()
    const trilha = {
      id: 'trilha',
      nome: 'Trilha',
      grupo: null,
      bloqueado: true,
      oculto: false,
      pontos: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
      acabamento: null,
      largura: 2,
      tipo: 'trilha' as const,
    }
    d.caminhos = [trilha]
    const estado = { documento: d, revisao: 0 }
    const lote = (caminho: typeof trilha) => ({
      revisaoEsperada: 0,
      comandos: [{ tipo: 'caminho.definir', caminho }],
    })
    expect(() => executarLote(estado, lote({ ...trilha, largura: 4 }))).toThrow('bloqueado')
    expect(() => executarLote(estado, lote({ ...trilha, bloqueado: false, largura: 4 }))).toThrow(
      'bloqueado',
    )
    const aberto = executarLote(estado, lote({ ...trilha, bloqueado: false }))
    expect(aberto.documento.caminhos[0]!.bloqueado).toBe(false)
  })
  test('troca a base e a hora do dia', () => {
    const depois = executarLote(
      { documento: cenario(), revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          { tipo: 'base.definir', base: { tipo: 'plano', largura: 512, comprimento: 128 } },
          { tipo: 'iluminacao.definir', iluminacao: { hora: 18.5 } },
        ],
      },
    )
    expect(depois.documento.base).toEqual({ tipo: 'plano', largura: 512, comprimento: 128 })
    expect(depois.documento.iluminacao.hora).toBe(18.5)
  })
})

describe('migração do piloto (v1)', () => {
  const modelo = (id: string, letra: string): ModeloDeCatalogo => ({
    id,
    nome: id,
    origem: 'reino',
    caminho: `${id}.glb`,
    commit: 'c'.repeat(40),
    digest: digest(letra),
    dimensoes: [1, 1, 1],
    min: [0, 0, 0],
    max: [1, 1, 1],
    bytes: 10,
    triangulos: 12,
    arquivo: 'm.glb',
    categoria: 'natureza',
  })
  const catalogo: CatalogoDeCenario = new Map([
    ['reino/arvore', modelo('reino/arvore', 'a')],
    ['reino/placa', modelo('reino/placa', 'b')],
    ['reino/lajes', modelo('reino/lajes', 'c')],
  ])
  const quadrado = (lado: number) => [
    { x: 0, z: 0 },
    { x: lado, z: 0 },
    { x: lado, z: lado },
    { x: 0, z: lado },
  ]
  const base = {
    grupo: null,
    bloqueado: false,
    oculto: false,
    transformacao: { posicao: { x: 1, y: 2, z: 3 }, rotacao: { x: 0, y: 1, z: 0 }, escala: 2 },
    apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
  } as const
  function v1(): DocumentoV1 {
    return {
      formato: 'molda-cenario',
      versao: 1,
      id: 'faisca',
      nome: 'Faísca',
      unidade: 'metro',
      eixoVertical: 'y',
      base: { id: 'faisca-v2', versao: '46b0ed92f' },
      catalogo: { id: 'faisca-acervo', digest: digest('f') },
      grupos: [{ id: 'g', nome: 'Conjunto', grupo: null, bloqueado: false, oculto: false }],
      instancias: [
        {
          ...base,
          id: 'arvore-1',
          nome: 'Árvore',
          grupo: 'g',
          modelo: 'reino/arvore',
          fisica: 'tronco',
          raioDoTronco: 0.4,
          enterrada: 0.2,
        },
        {
          ...base,
          id: 'iris',
          nome: 'Íris',
          modelo: 'reino/arvore',
          ator: 'iris',
          fisica: 'nenhuma',
        },
        {
          ...base,
          id: 'placa-1',
          nome: 'Placa',
          modelo: 'reino/placa',
          fisica: 'caixa',
          sinal: { texto: 'Farol', destino: 'lugar:farol', via: { x: 4, z: 5 } },
        },
      ],
      caminhos: [
        {
          id: 'trilha',
          nome: 'Trilha',
          grupo: null,
          bloqueado: false,
          oculto: false,
          pontos: [
            { x: 0, z: 0 },
            { x: 10, z: 0 },
          ],
          acabamento: 'reino/lajes',
          largura: 2,
          tipo: 'trilha',
        },
      ],
      aguas: [
        {
          id: 'lago',
          nome: 'Lago',
          grupo: null,
          bloqueado: false,
          oculto: false,
          modelo: null,
          centro: { x: 5, z: 5 },
          giro: 0,
          escala: 1,
          nivel: 3.5,
          profundidade: 2,
          contorno: quadrado(10),
          recorte: quadrado(12),
        },
      ],
      relevo: [
        { id: 'r1', tipo: 'elevar', centro: { x: 0, z: 0 }, raio: 10, valor: 2, intensidade: 1 },
      ],
      marcos: [{ id: 'lugar:farol', posicao: { x: 40, z: 50 }, objeto: null }],
      iluminacao: { noite: true },
    }
  }
  const resolver = resolverPeloCatalogo('faisca-acervo', catalogo)

  test('leva tudo para o formato genérico sem perder informação', () => {
    const d = migrarDaV1(v1(), resolver)
    expect(d.versao).toBe(2)
    expect(d.base).toEqual({
      tipo: 'perfil',
      perfil: 'faisca-v2',
      versao: '46b0ed92f',
      carimbos: v1().relevo,
    })
    expect(d.modelos.map((m) => [m.id, m.biblioteca, m.digest])).toEqual([
      ['reino/arvore', 'faisca-acervo', digest('a')],
      ['reino/lajes', 'faisca-acervo', digest('c')],
      ['reino/placa', 'faisca-acervo', digest('b')],
    ])
    const [arvore, iris, placa] = d.instancias
    expect(arvore!.transformacao.escala).toEqual({ x: 2, y: 2, z: 2 })
    expect(arvore!.colisao).toBe('capsula')
    expect(arvore!.grupo).toBe('g')
    expect(arvore!.propriedades).toEqual({
      'arquipelago.fisica': 'tronco',
      'arquipelago.raioDoTronco': 0.4,
      'arquipelago.enterrada': 0.2,
    })
    expect(iris!.propriedades).toEqual({ 'arquipelago.ator': 'iris' })
    expect(placa!.colisao).toBe('caixa')
    expect(placa!.propriedades).toEqual({
      'arquipelago.sinal.texto': 'Farol',
      'arquipelago.sinal.destino': 'lugar:farol',
      'arquipelago.sinal.via.x': 4,
      'arquipelago.sinal.via.z': 5,
    })
    expect(d.aguas[0]).toMatchObject({ tipo: 'lago', nivel: 3.5 })
    expect(d.marcadores[0]).toMatchObject({
      id: 'lugar:farol',
      posicao: { x: 40, y: 0, z: 50 },
      noChao: true,
    })
    expect(d.iluminacao).toEqual({ hora: 21 })
  })
  test('recusa quando um modelo não tem biblioteca de destino', () => {
    expect(() =>
      migrarDaV1(v1(), (id) => (id === 'reino/placa' ? undefined : resolver(id))),
    ).toThrow('Modelo ausente: reino/placa')
  })
  test('abrir aceita as duas versões e devolve sempre a atual', () => {
    expect(abrirDocumento(v1(), resolver).versao).toBe(2)
    expect(abrirDocumento(cenario()).versao).toBe(2)
    expect(() => abrirDocumento(v1())).toThrow('versão 1')
  })
})

describe('modelo GLB e apoio no chão', () => {
  function glb(json: object): Uint8Array {
    const texto = new TextEncoder().encode(JSON.stringify(json))
    const corpo = new Uint8Array(Math.ceil(texto.length / 4) * 4).fill(0x20)
    corpo.set(texto)
    const bytes = new Uint8Array(20 + corpo.length)
    const v = new DataView(bytes.buffer)
    v.setUint32(0, 0x46546c67, true)
    v.setUint32(4, 2, true)
    v.setUint32(8, bytes.length, true)
    v.setUint32(12, corpo.length, true)
    v.setUint32(16, 0x4e4f534a, true)
    bytes.set(corpo, 20)
    return bytes
  }
  test('aceita o modelo completo e conta o que ele traz', () => {
    expect(
      conferirGlb(glb({ meshes: [{}, {}], materials: [{}], images: [{ bufferView: 0 }] })),
    ).toEqual({
      bytes: expect.any(Number),
      malhas: 2,
      materiais: 1,
      imagens: 1,
      animacoes: 0,
    })
  })
  test('recusa o que os jogos não abrem, com o motivo', () => {
    expect(() => conferirGlb(new Uint8Array(40))).toThrow('não é um modelo GLB')
    expect(() => conferirGlb(glb({ meshes: [{}], images: [{ uri: 'textura.png' }] }))).toThrow(
      'arquivos de fora',
    )
    expect(() =>
      conferirGlb(glb({ meshes: [{}], extensionsRequired: ['KHR_draco_mesh_compression'] })),
    ).toThrow('compressão Draco')
    expect(() => conferirGlb(glb({ materials: [{}] }))).toThrow('nenhuma forma 3D')
  })
  test('o endereço do arquivo é o SHA-256 do conteúdo', async () => {
    expect(await digestDosBytes(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
  test('quem pisa no chão guarda a distância até ele', () => {
    const d = cenario()
    const mundo = {
      posicao: { x: 4, y: 1.5, z: -2 },
      rotacao: { x: 0, y: 0.5, z: 0 },
      escala: { x: 1, y: 2, z: 1 },
    }
    const noChao = alteracoesDoGesto(d, d.instancias[0]!, mundo)
    expect(noChao.apoio).toEqual({ tipo: 'terreno', deslocamento: 1.5, inclinar: false })
    expect(posicaoNoMundo(d, { ...d.instancias[0]!, ...noChao })).toEqual({ x: 4, y: 1.5, z: -2 })
    const solto = alteracoesDoGesto(d, { apoio: { tipo: 'absoluto' } }, mundo)
    expect(solto).toEqual({ transformacao: mundo, apoio: { tipo: 'absoluto' } })
  })
})
