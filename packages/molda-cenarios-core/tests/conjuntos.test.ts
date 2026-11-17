import { expect, test } from 'bun:test'
import {
  arquivosDoDocumento,
  capturarConteudoDeConjunto,
  capturarFragmento,
  criarDocumentoVazio,
  type DefinicaoDeConjunto,
  DefinicaoDeConjuntoSchema,
  executarLote,
  idsDoFragmento,
  inverterLote,
  type MontagemDeConjunto,
  MontagemDeConjuntoSchema,
  posicaoNoMundo,
  resolverConjuntos,
  validarDocumento,
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
