import { expect, test } from 'bun:test'
import {
  alinharObjetos,
  alterarElemento,
  apoioNaSuperficie,
  arquivosDoDocumento,
  capturarConteudoDeConjunto,
  capturarFragmento,
  criarAmostradorDeEspalhamento,
  criarDocumentoVazio,
  type DefinicaoDeConjunto,
  DefinicaoDeConjuntoSchema,
  entidadesTransformaveis,
  espelharObjetos,
  executarLote,
  idsDoFragmento,
  indiceDaOrganizacao,
  inverterLote,
  type MontagemDeConjunto,
  MontagemDeConjuntoSchema,
  materializarEspalhamento,
  posicaoNoMundo,
  quantidadeDeObjetosDoCenario,
  repetirObjetos,
  resolverConjuntos,
  sortearTransformacoes,
  validarDocumento,
  volumeDaMontagem,
  volumeNoMundo,
} from '../src/v2'

function fonte() {
  const d = criarDocumentoVazio('fonte', 'Composição')
  d.formas = [{ id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  d.grupos = [{ id: 'horta', nome: 'Horta', grupo: null, bloqueado: false, oculto: false }]
  const base = {
    id: 'base',
    nome: 'Base',
    modelo: 'caixa',
    grupo: 'horta',
    bloqueado: false,
    oculto: false,
    apoio: { tipo: 'absoluto' as const },
    colisao: 'caixa' as const,
    transformacao: {
      posicao: { x: 2, y: 3, z: 4 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 2, y: 1, z: 1 },
    },
  }
  d.instancias = [
    base,
    {
      ...structuredClone(base),
      id: 'banco',
      nome: 'Banco',
      apoio: { tipo: 'objeto', objeto: 'base', contato: { x: 0.5, y: 1, z: 0 }, deslocamento: 0.2 },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0.3, z: 0 },
        escala: { x: 0.5, y: 0.5, z: 0.5 },
      },
      espelho: { x: true, y: false, z: false },
      aparencia: { cor: '#224466' },
      propriedades: { uso: 'banco' },
    },
  ]
  return d
}
function definicao(): DefinicaoDeConjunto {
  return {
    id: 'def',
    biblioteca: 'biblioteca',
    conjunto: 'praca',
    revisao: 1,
    nome: 'Praça',
    conteudo: capturarFragmento(fonte(), ['horta'], 'conta'),
  }
}
function montagem(id = 'copia'): MontagemDeConjunto {
  return {
    id,
    nome: 'Praça',
    grupo: null,
    bloqueado: false,
    oculto: false,
    definicao: 'def',
    transformacao: {
      posicao: { x: 10, y: 7, z: 20 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 2, y: 2, z: 2 },
    },
  }
}
function cena() {
  const d = criarDocumentoVazio('c', 'Mundo')
  d.definicoesConjuntos = [definicao()]
  d.montagens = [montagem(), montagem('outra')]
  d.montagens[1]!.transformacao.posicao.x = 30
  return d
}

test('copiar montagem e objeto apoiado remapeia o vínculo para a nova raiz', () => {
  const doc = cena()
  doc.formas = [
    { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 },
  ]
  const t = {
    posicao: { x: 10, y: 9, z: 20 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  }
  doc.instancias = [
    {
      id: 'apoiado',
      nome: 'Apoiado',
      modelo: 'caixa',
      grupo: null,
      bloqueado: false,
      oculto: false,
      colisao: 'caixa',
      transformacao: t,
      apoio: apoioNaSuperficie(doc, 'copia', t.posicao),
    },
  ]
  const f = capturarFragmento(doc, ['copia', 'apoiado'], 'conta'),
    destino = criarDocumentoVazio('d', 'D'),
    colado = executarLote(
      { documento: destino, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          {
            tipo: 'fragmento.colar',
            fragmento: f,
            prefixo: 'p',
            ponto: { x: f.ancora.x + 5, y: f.ancora.y + 1, z: f.ancora.z },
          },
        ],
      },
    ).documento
  expect(colado.instancias[0]!.apoio).toMatchObject({ tipo: 'objeto', objeto: 'p/conjunto/0' })
  expect(posicaoNoMundo(colado, colado.instancias[0]!)).toEqual({ x: 15, y: 10, z: 20 })
})

test('montagem fixa revisão e preserva a composição sem gravar clones na origem', () => {
  const doc = cena(),
    antes = structuredClone(doc),
    expandido = resolverConjuntos(doc)
  expect(expandido.documento.instancias).toHaveLength(4)
  expect(expandido.documento.grupos).toHaveLength(4)
  expect(expandido.documento.formas).toHaveLength(1)
  expect(expandido.documento.montagens).toBeUndefined()
  expect(expandido.documento.definicoesConjuntos).toBeUndefined()
  expect(new Set(expandido.documento.instancias.map((o) => o.id)).size).toBe(4)
  expect(expandido.origens.size).toBe(6)
  for (const o of expandido.documento.instancias) {
    expect(expandido.origens.get(o.id)).toBe(o.id.startsWith('copia/') ? 'copia' : 'outra')
    expect(o.apoio.tipo).toBe('absoluto')
  }
  const [base, banco] = expandido.documento.instancias
  expect(base!.transformacao.escala).toEqual({ x: 4, y: 2, z: 2 })
  expect(banco!.transformacao.escala).toEqual({ x: 1, y: 1, z: 1 })
  expect(banco!.transformacao.posicao.x - base!.transformacao.posicao.x).toBeCloseTo(2, 8)
  expect(banco!.transformacao.posicao.y - base!.transformacao.posicao.y).toBeCloseTo(2.4, 8)
  expect(banco!.espelho).toEqual(fonte().instancias[1]!.espelho)
  expect(banco!.aparencia).toEqual(fonte().instancias[1]!.aparencia)
  expect(banco!.propriedades).toEqual({ uso: 'banco' })
  expect(doc).toEqual(antes)
  expect(doc.instancias).toEqual([])
  expect(validarDocumento(expandido.documento)).toEqual(expandido.documento)
})

test('objeto sobre a montagem usa seu espaço local e conserva o contato na expansão e ao mover a raiz', () => {
  const d = cena()
  d.formas = fonte().formas
  const apoio = apoioNaSuperficie(d, 'copia', { x: 11, y: 12, z: 20 })
  d.instancias = [{ ...fonte().instancias[0]!, id: 'visitante', grupo: null, apoio }]
  expect(posicaoNoMundo(d, d.instancias[0]!)).toEqual({ x: 11, y: 12, z: 20 })
  expect(validarDocumento(d)).toEqual(d)
  const expandido = resolverConjuntos(d).documento
  expect(posicaoNoMundo(expandido, expandido.instancias[0]!)).toEqual({ x: 11, y: 12, z: 20 })
  expect(expandido.instancias[0]!.apoio.tipo).toBe('absoluto')
  const transformacao = structuredClone(d.montagens![0]!.transformacao)
  transformacao.posicao.x += 3
  const depois = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'montagem.atualizar', id: 'copia', alteracoes: { transformacao } }],
    },
  ).documento
  expect(posicaoNoMundo(depois, depois.instancias[0]!)).toEqual({ x: 14, y: 12, z: 20 })
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'montagem.remover', id: 'copia' }] },
    ),
  ).toThrow('Apoio')
  const livre = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: [{ tipo: 'montagem.desvincular', id: 'copia' }] },
  ).documento
  expect(posicaoNoMundo(livre, livre.instancias.find((o) => o.id === 'visitante')!)).toEqual({
    x: 11,
    y: 12,
    z: 20,
  })
})

test('pincel considera a ocupação e o orçamento das peças internas de conjuntos', () => {
  const d = cena()
  d.formas = [
    { id: 'flor', nome: 'Flor', tipo: 'caixa', largura: 0.1, altura: 0.2, comprimento: 0.1 },
  ]
  const receita = {
    prototipos: [
      {
        nome: 'Flor',
        modelo: 'flor',
        colisao: 'caixa' as const,
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    ],
    traco: [{ x: 10, z: 20 }],
    raio: 0.5,
    densidade: 1000,
    afastamento: 0.1,
    giro: 0,
    tamanhoMin: 1,
    tamanhoMax: 1,
    semente: 1,
    limite: 8,
    evitarObjetos: true,
    grupo: null,
    camada: null,
  }
  expect(quantidadeDeObjetosDoCenario(d)).toBe(4)
  expect(criarAmostradorDeEspalhamento(d, receita).gerar().amostras).toHaveLength(0)
  const livres = criarAmostradorDeEspalhamento(d, { ...receita, evitarObjetos: false }).gerar()
    .amostras
  expect(livres.length).toBeGreaterThan(0)
  const f = d.definicoesConjuntos![0]!.conteudo,
    primeira = f.instancias[0]!
  f.instancias = Array.from({ length: 2000 }, (_, i) => ({
    ...structuredClone(primeira),
    id: `parte-${i}`,
    apoio: { tipo: 'absoluto' },
  }))
  d.montagens = Array.from({ length: 10 }, (_, i) => montagem(`copia-${i}`))
  expect(quantidadeDeObjetosDoCenario(d)).toBe(20000)
  expect(() => criarAmostradorDeEspalhamento(d, receita)).toThrow('limite')
  expect(() =>
    materializarEspalhamento(d, {
      receita: { ...receita, evitarObjetos: false },
      amostras: [{ ...livres[0]!, id: 'nova' }],
    }),
  ).toThrow('limite')
})

test('organizar trata montagens como unidades e mede os volumes de suas peças com giros XYZ', () => {
  const d = cena()
  d.montagens![0]!.transformacao.rotacao = { x: 0.3, y: 0.7, z: 0.1 }
  const projecao = resolverConjuntos(d),
    volumes = projecao.documento.instancias
      .filter((o) => projecao.origens.get(o.id) === 'copia')
      .map((o) => volumeNoMundo(projecao.documento, o))
  const volume = volumeDaMontagem(d, d.montagens![0]!)
  for (const e of ['x', 'y', 'z'] as const) {
    expect(volume.min[e]).toBeCloseTo(Math.min(...volumes.map((v) => v.min[e])), 8)
    expect(volume.max[e]).toBeCloseTo(Math.max(...volumes.map((v) => v.max[e])), 8)
  }
  const antes = structuredClone(d)
  const alinhado = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: alinharObjetos(d, ['copia', 'outra'], 'x', 'inicio') },
  ).documento
  expect(volumeDaMontagem(alinhado, alinhado.montagens![0]!).min.x).toBeCloseTo(
    volumeDaMontagem(alinhado, alinhado.montagens![1]!).min.x,
    8,
  )
  const comandos = repetirObjetos(
    d,
    ['copia'],
    { tipo: 'fila', copias: 2, deslocamento: { x: 5, y: 0, z: 0 } },
    ['nova1', 'nova2'],
  )
  const repetido = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos },
  ).documento
  expect(repetido.instancias).toHaveLength(0)
  expect(repetido.montagens).toHaveLength(4)
  expect(repetido.montagens![2]!.transformacao.posicao.x).toBe(
    d.montagens![0]!.transformacao.posicao.x + 5,
  )
  expect(repetido.montagens![3]!.transformacao.posicao.x).toBe(
    d.montagens![0]!.transformacao.posicao.x + 10,
  )
  const sorteado = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: sortearTransformacoes(d, ['copia'], 42, {
        giro: 1,
        tamanhoMin: 0.8,
        tamanhoMax: 1.2,
      }),
    },
  ).documento
  const s = sorteado.montagens![0]!.transformacao.escala
  expect(s.x).toBe(s.y)
  expect(s.y).toBe(s.z)
  expect(() => espelharObjetos(d, ['copia'], 'x')).toThrow('Separe as peças')
  expect(d).toEqual(antes)
})

test('pasta e camada conservam seleção, nomes e flags de montagens', () => {
  const d = cena()
  d.grupos = [{ id: 'vila', nome: 'Vila', grupo: null, bloqueado: false, oculto: false }]
  d.montagens![0]!.grupo = 'vila'
  expect(indiceDaOrganizacao(d).descendentes('vila')).toEqual(['copia'])
  expect(entidadesTransformaveis(d).map((e) => e.id)).toEqual(['copia', 'outra'])
  const depois = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: alterarElemento(d, 'copia', { nome: 'Praça dos Criadores', oculto: true }),
    },
  ).documento
  expect(depois.montagens![0]!).toMatchObject({ nome: 'Praça dos Criadores', oculto: true })
  expect(indiceDaOrganizacao(depois).flags.get('copia')!.oculto).toBe(true)
})

test('giro fora do Y move posições e contatos como um corpo, sem reassentar as peças separadamente', () => {
  const doc = cena()
  doc.montagens = [montagem()]
  const semGiro = resolverConjuntos(doc).documento.instancias
  doc.montagens[0]!.transformacao.rotacao = { x: Math.PI / 2, y: 0, z: 0 }
  const comGiro = resolverConjuntos(doc).documento.instancias
  const a = semGiro[0]!.transformacao.posicao,
    b = semGiro[1]!.transformacao.posicao
  const c = comGiro[0]!.transformacao.posicao,
    e = comGiro[1]!.transformacao.posicao
  expect(e.x - c.x).toBeCloseTo(b.x - a.x, 8)
  expect(e.y - c.y).toBeCloseTo(-(b.z - a.z), 8)
  expect(e.z - c.z).toBeCloseTo(b.y - a.y, 8)
  expect(doc.definicoesConjuntos![0]!.conteudo.instancias[1]!.apoio.tipo).toBe('objeto')
})

test('recursos equivalentes são compartilhados; IDs conflitantes não mudam objetos fora da montagem', () => {
  const doc = cena()
  doc.formas = [
    { id: 'caixa', nome: 'Outra', tipo: 'caixa', largura: 5, altura: 5, comprimento: 5 },
  ]
  const antes = structuredClone(doc)
  const r = resolverConjuntos(doc).documento
  expect(r.formas).toHaveLength(2)
  expect(r.formas![0]).toEqual(doc.formas[0])
  expect(new Set(r.instancias.map((o) => o.modelo)).size).toBe(1)
  expect(r.instancias[0]!.modelo).not.toBe('caixa')
  expect(doc).toEqual(antes)
})

test('uma referência fixada não aceita fonte vazia, deformação ou versão não positiva', () => {
  expect(() => DefinicaoDeConjuntoSchema.parse({ ...definicao(), revisao: 0 })).toThrow()
  const d = definicao()
  d.conteudo.instancias = []
  expect(() => DefinicaoDeConjuntoSchema.parse(d)).toThrow()
  const m = montagem()
  m.transformacao.escala.x = 3
  expect(() => MontagemDeConjuntoSchema.parse(m)).toThrow('proporções')
})

test('definição ausente, IDs de expansão em uso e orçamento não são aceitos parcialmente', () => {
  const doc = cena(),
    antes = structuredClone(doc)
  expect(() => resolverConjuntos({ ...doc, definicoesConjuntos: undefined })).toThrow('definição')
  expect(() =>
    resolverConjuntos({ ...doc, grupos: [{ ...fonte().grupos[0]!, id: 'copia/grupo/0' }] }),
  ).toThrow('identificador')
  const grande = cena(),
    d = grande.definicoesConjuntos![0]!,
    original = d.conteudo.instancias[0]!
  d.conteudo.instancias = Array.from({ length: 2000 }, (_, i) => ({
    ...structuredClone(original),
    id: `o${i}`,
  }))
  d.conteudo.raizes = ['horta']
  grande.montagens = Array.from({ length: 11 }, (_, i) => montagem(`c${i}`))
  expect(() => resolverConjuntos(grande)).toThrow('orçamento')
  expect(doc).toEqual(antes)
})

test('contato da fonte permanece resolvível na revisão fixada', () => {
  const d = fonte(),
    p = posicaoNoMundo(d, d.instancias[1]!)
  const f = definicao().conteudo
  expect(f.instancias[1]!.apoio).toEqual(d.instancias[1]!.apoio)
  expect(f.instancias[1]!.transformacao.posicao).toEqual(p)
})

test('comandos mantêm definição imutável e inversão granular das montagens', () => {
  const d = criarDocumentoVazio('c', 'Mundo'),
    estado = { documento: d, revisao: 0 },
    def = definicao(),
    m = montagem()
  const montado = executarLote(estado, {
    revisaoEsperada: 0,
    comandos: [
      { tipo: 'conjunto.definir', definicao: def },
      { tipo: 'montagem.definir', montagem: m },
    ],
  })
  expect(montado.documento.instancias).toEqual([])
  expect(montado.documento.montagens).toEqual([m])
  const movido = executarLote(montado, {
    revisaoEsperada: 1,
    comandos: [
      {
        tipo: 'montagem.atualizar',
        id: m.id,
        alteracoes: { transformacao: { ...m.transformacao, posicao: { x: 30, y: 9, z: 10 } } },
      },
    ],
  })
  expect(movido.documento.definicoesConjuntos).toEqual([def])
  expect(() =>
    executarLote(movido, {
      revisaoEsperada: 2,
      comandos: [{ tipo: 'conjunto.definir', definicao: { ...def, nome: 'Outra definição' } }],
    }),
  ).toThrow('imutável')
  expect(() =>
    executarLote(movido, {
      revisaoEsperada: 2,
      comandos: [{ tipo: 'conjunto.remover', id: def.id }],
    }),
  ).toThrow('uso')
  const inverso = inverterLote(d, movido.documento)
  expect(inverso.some((c) => c.tipo === 'cenario.restaurar')).toBe(false)
  expect(executarLote(movido, { revisaoEsperada: 2, comandos: inverso }).documento).toEqual(d)
  const desvinculado = executarLote(movido, {
    revisaoEsperada: 2,
    comandos: [{ tipo: 'montagem.desvincular', id: m.id }],
  })
  expect(desvinculado.documento.montagens).toBeUndefined()
  expect(desvinculado.documento.instancias).toHaveLength(2)
  expect(resolverConjuntos(movido.documento).documento.instancias).toEqual(
    desvinculado.documento.instancias,
  )
  expect(
    executarLote(desvinculado, {
      revisaoEsperada: 3,
      comandos: inverterLote(movido.documento, desvinculado.documento),
    }).documento,
  ).toEqual(movido.documento)
})

test('raízes respeitam bloqueios e seu conteúdo fixado participa da validação e da proteção de arquivos', () => {
  const d = cena(),
    def = d.definicoesConjuntos![0]!
  d.montagens![0]!.bloqueado = true
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'montagem.remover', id: 'copia' }] },
    ),
  ).toThrow('bloqueado')
  expect(validarDocumento(d)).toEqual(d)
  def.conteudo.modelos = [{ id: 'm', biblioteca: 'acervo', modelo: 'm', digest: 'a'.repeat(64) }]
  def.conteudo.instancias[0]!.modelo = 'm'
  expect(arquivosDoDocumento(d)).toEqual([{ digest: 'a'.repeat(64), tipo: 'modelo' }])
  expect(() => validarDocumento(d, { modeloExiste: () => false })).toThrow('ausente')
})

test('atualizar definição troca cópias atuais, conserva transformações e permite voltar à revisão antiga', () => {
  const d = cena(),
    antes = structuredClone(d),
    nova = definicao()
  nova.id = 'def-2'
  nova.revisao = 2
  nova.conteudo.instancias[1]!.aparencia = { cor: '#bb4477' }
  const atual = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: [{ tipo: 'conjunto.atualizar', definicao: nova }] },
  )
  expect(atual.documento.montagens!.map((m) => m.definicao)).toEqual(['def-2', 'def-2'])
  expect(atual.documento.montagens!.map((m) => m.transformacao)).toEqual(
    d.montagens!.map((m) => m.transformacao),
  )
  expect(atual.documento.definicoesConjuntos).toEqual([nova])
  expect(d).toEqual(antes)
  const original = resolverConjuntos(d).documento.instancias,
    editado = resolverConjuntos(atual.documento).documento.instancias
  expect(original[1]!.aparencia!.cor).toBe('#224466')
  expect(editado[1]!.aparencia!.cor).toBe('#bb4477')
  expect(editado[3]!.aparencia!.cor).toBe('#bb4477')
  const inverso = inverterLote(d, atual.documento)
  expect(inverso.some((c) => c.tipo === 'cenario.restaurar')).toBe(false)
  expect(executarLote(atual, { revisaoEsperada: 1, comandos: inverso }).documento).toEqual(d)
  expect(() =>
    executarLote(atual, {
      revisaoEsperada: 1,
      comandos: [{ tipo: 'conjunto.atualizar', definicao: definicao() }],
    }),
  ).toThrow('anterior')
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [{ tipo: 'conjunto.atualizar', definicao: { ...nova, revisao: 1 } }],
      },
    ),
  ).toThrow('imutável')
  d.montagens![1]!.bloqueado = true
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'conjunto.atualizar', definicao: nova }] },
    ),
  ).toThrow('bloqueado')
  expect(d.montagens![0]!.definicao).toBe('def')
})

test('duplicação conserva a definição, os vínculos internos e um desfazer granular', () => {
  const d = cena(),
    duplicado = executarLote(
      { documento: d, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          {
            tipo: 'montagem.duplicar',
            id: 'copia',
            novoId: 'duplicada',
            deslocamento: { x: 10, y: 0, z: 5 },
          },
        ],
      },
    )
  expect(duplicado.documento.definicoesConjuntos).toEqual(d.definicoesConjuntos!)
  expect(duplicado.documento.montagens).toHaveLength(3)
  expect(duplicado.documento.montagens![2]!.transformacao.posicao).toEqual({ x: 20, y: 7, z: 25 })
  const vista = resolverConjuntos(duplicado.documento).documento
  expect(vista.instancias).toHaveLength(6)
  expect(
    vista.instancias[5]!.transformacao.posicao.x - vista.instancias[4]!.transformacao.posicao.x,
  ).toBeCloseTo(2, 8)
  expect(
    executarLote(duplicado, { revisaoEsperada: 1, comandos: inverterLote(d, duplicado.documento) })
      .documento,
  ).toEqual(d)
})

test('clipboard mantém cópias vivas; salvar uma composição com conjuntos fixa sua expansão', () => {
  const d = cena(),
    antes = structuredClone(d),
    fragmento = capturarFragmento(d, ['copia'], 'conta')
  expect(fragmento.instancias).toEqual([])
  expect(fragmento.montagens).toHaveLength(1)
  expect(fragmento.definicoesConjuntos).toHaveLength(1)
  const destino = criarDocumentoVazio('destino', 'Destino'),
    ids = idsDoFragmento(fragmento, 'colar')
  const colado = executarLote(
    { documento: destino, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'fragmento.colar', fragmento, prefixo: 'colar', ponto: { x: 0, y: 0, z: 0 } },
      ],
    },
  )
  expect(ids.raizes).toEqual([colado.documento.montagens![0]!.id])
  expect(colado.documento.instancias).toEqual([])
  expect(resolverConjuntos(colado.documento).documento.instancias).toHaveLength(2)
  expect(
    executarLote(colado, { revisaoEsperada: 1, comandos: inverterLote(destino, colado.documento) })
      .documento,
  ).toEqual(destino)
  const conteudo = capturarConteudoDeConjunto(d, ['copia'], 'conta')
  expect(conteudo.instancias).toHaveLength(2)
  expect('montagens' in conteudo).toBe(false)
  expect(conteudo.instancias.every((o) => o.apoio.tipo === 'absoluto')).toBe(true)
  expect(d).toEqual(antes)
})
