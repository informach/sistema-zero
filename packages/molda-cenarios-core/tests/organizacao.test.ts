import { expect, test } from 'bun:test'
import type { ComandoDeCenario } from '../src/v2'
import {
  agruparElementos,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  validarDocumento,
} from '../src/v2'
import { indiceDaOrganizacao } from '../src/v2/organizacao'

function cena() {
  const d = criarDocumentoVazio('d', 'Organização')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.grupos = [
    { id: 'g', nome: 'Jardim', grupo: null, oculto: false, bloqueado: false },
    { id: 'sub', nome: 'Flores', grupo: 'g', oculto: false, bloqueado: false },
  ]
  d.instancias = ['a', 'b'].map((id, i) => ({
    id,
    nome: id,
    modelo: 'f',
    grupo: i ? null : 'sub',
    bloqueado: false,
    oculto: false,
    colisao: 'caixa' as const,
    apoio: { tipo: 'absoluto' as const },
    transformacao: {
      posicao: { x: i * 2, y: 0, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }))
  return d
}
const aplicar = (d: ReturnType<typeof cena>, comandos: ComandoDeCenario[]) =>
  executarLote({ documento: d, revisao: 0 }, { revisaoEsperada: 0, comandos }).documento
const comCamada = () =>
  aplicar(cena(), [
    {
      tipo: 'camada.definir',
      camada: { id: 'c', nome: 'Natureza', bloqueado: false, oculto: false },
    },
    { tipo: 'grupo.definir', grupo: { ...cena().grupos[0]!, camada: 'c' } },
  ])

test('documentos antigos continuam válidos; camada autoral exige identificadores e vínculos íntegros', () => {
  expect(validarDocumento(cena()).camadas).toBeUndefined()
  const d = comCamada()
  expect(d.camadas).toHaveLength(1)
  expect(d.grupos[0]!.camada).toBe('c')
  expect(() =>
    aplicar(d, [{ tipo: 'instancia.atualizar', id: 'b', alteracoes: { camada: 'ausente' } }]),
  ).toThrow('Camada ausente')
  expect(() => validarDocumento({ ...d, camadas: [...d.camadas!, d.camadas![0]] })).toThrow(
    'duplicad',
  )
  expect(() =>
    validarDocumento({
      ...d,
      camadas: Array.from({ length: 129 }, (_, i) => ({
        id: `c${i}`,
        nome: 'Camada',
        oculto: false,
        bloqueado: false,
      })),
    }),
  ).toThrow()
})

test('flags acumulam camadas e ancestrais; descendentes são indexados sem perder a relação da árvore', () => {
  const d = aplicar(comCamada(), [
    {
      tipo: 'camada.definir',
      camada: { id: 'c', nome: 'Natureza', bloqueado: true, oculto: true },
    },
  ])
  const indice = indiceDaOrganizacao(d)
  expect(indice.flags.get('a')).toMatchObject({
    bloqueado: true,
    oculto: true,
    bloqueioHerdado: true,
    ocultacaoHerdada: true,
  })
  expect(indice.flags.get('b')).toMatchObject({ bloqueado: false, oculto: false })
  expect(indice.descendentes('g')).toEqual(['a'])
  expect(indice.descendentes('sub')).toEqual(['a'])
  expect(indice.filhos.get('g')?.map((e) => e.id)).toEqual(['sub'])
})

test('cadeado herdado não pode ser contornado por trocar camada, grupo, definição ou destrancar o filho', () => {
  const d = aplicar(comCamada(), [
    {
      tipo: 'camada.definir',
      camada: { id: 'c', nome: 'Natureza', bloqueado: true, oculto: false },
    },
  ])
  const antes = structuredClone(d)
  for (const comandos of [
    [{ tipo: 'instancia.atualizar', id: 'a', alteracoes: { camada: null, grupo: null } }],
    [{ tipo: 'instancia.atualizar', id: 'a', alteracoes: { bloqueado: false } }],
    [{ tipo: 'grupo.definir', grupo: { ...d.grupos[0]!, camada: null } }],
    [{ tipo: 'forma.definir', forma: { ...d.formas![0]!, altura: 2 } }],
    [{ tipo: 'elementos.organizar', ids: ['a'], destino: { grupo: null } }],
    [{ tipo: 'camada.remover', id: 'c', transferirPara: null }],
    [{ tipo: 'camada.definir', camada: { ...d.camadas![0]!, nome: 'Alterada', bloqueado: false } }],
  ] satisfies ComandoDeCenario[][])
    expect(() => aplicar(d, comandos)).toThrow('bloquead')
  expect(d).toEqual(antes)
  const livre = aplicar(d, [
    { tipo: 'camada.definir', camada: { ...d.camadas![0]!, bloqueado: false } },
  ])
  expect(indiceDaOrganizacao(livre).flags.get('a')!.bloqueado).toBe(false)
})

test('movimento para destinos bloqueados e ciclos é atômico; organizar não desloca o mundo', () => {
  let d = comCamada()
  d = aplicar(d, [
    {
      tipo: 'camada.definir',
      camada: { id: 'fechada', nome: 'Fechada', oculto: false, bloqueado: true },
    },
  ])
  expect(() =>
    aplicar(d, [{ tipo: 'elementos.organizar', ids: ['a', 'b'], destino: { camada: 'fechada' } }]),
  ).toThrow('bloquead')
  expect(() =>
    aplicar(d, [{ tipo: 'elementos.organizar', ids: ['g'], destino: { grupo: 'sub' } }]),
  ).toThrow('Ciclo')
  expect(() =>
    aplicar(d, [{ tipo: 'elementos.organizar', ids: ['b', 'ausente'], destino: { grupo: 'g' } }]),
  ).toThrow('ausente')
  const depois = aplicar(d, [
    { tipo: 'elementos.organizar', ids: ['a', 'b'], destino: { grupo: 'g', camada: 'c' } },
  ])
  expect(depois.instancias.map((o) => o.transformacao)).toEqual(
    d.instancias.map((o) => o.transformacao),
  )
  expect(depois.instancias.every((o) => o.grupo === 'g' && o.camada === 'c')).toBe(true)
})

test('remover camada usada requer transferência explícita e verifica cada membro antes de alterar', () => {
  const d = comCamada()
  expect(() => aplicar(d, [{ tipo: 'camada.remover', id: 'c' }])).toThrow('em uso')
  const depois = aplicar(d, [{ tipo: 'camada.remover', id: 'c', transferirPara: null }])
  expect(depois.camadas).toBeUndefined()
  expect(depois.grupos[0]!.camada).toBeNull()
  expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
  d.grupos[0]!.bloqueado = true
  expect(() => aplicar(d, [{ tipo: 'camada.remover', id: 'c', transferirPara: null }])).toThrow(
    'bloquead',
  )
})

test('desagrupar transfere filhos para a pasta pai, preserva medidas e desfaz pelo mesmo histórico', () => {
  const d = comCamada()
  expect(() => aplicar(d, [{ tipo: 'grupo.remover', id: 'sub' }])).toThrow('Grupo ausente')
  const depois = aplicar(d, [{ tipo: 'grupo.remover', id: 'sub', desagrupar: true }])
  expect(depois.grupos.map((g) => g.id)).toEqual(['g'])
  expect(depois.instancias[0]!.grupo).toBe('g')
  expect(depois.instancias[0]!.transformacao).toEqual(d.instancias[0]!.transformacao)
  expect(aplicar(depois, inverterLote(d, depois))).toEqual(d)
})

test('inversão restaura camada e flags mesmo com grupos e objetos bloqueados sem mudança própria', () => {
  const antes = comCamada()
  antes.grupos[1]!.bloqueado = true
  antes.instancias[0]!.bloqueado = true
  const depois = aplicar(antes, [
    { tipo: 'camada.definir', camada: { ...antes.camadas![0]!, bloqueado: true, oculto: true } },
  ])
  expect(aplicar(depois, inverterLote(antes, depois))).toEqual(antes)
  expect(aplicar(antes, inverterLote(depois, antes))).toEqual(depois)
})

test('agrupar não achata pastas selecionadas e uma organização grande permanece uma ação atômica', () => {
  const d = cena()
  const comandos = agruparElementos(d, ['g', 'a', 'b'], 'nova', 'Nova pasta')
  expect(comandos).toHaveLength(2)
  const agrupado = aplicar(d, comandos)
  expect(agrupado.grupos.find((g) => g.id === 'g')!.grupo).toBe('nova')
  expect(agrupado.instancias[0]!.grupo).toBe('sub')
  expect(agrupado.instancias[1]!.grupo).toBe('nova')
  expect(agrupado.instancias.map((o) => o.transformacao)).toEqual(
    d.instancias.map((o) => o.transformacao),
  )
  expect(() => agruparElementos(d, ['a'], 'g', 'Sobrescrever')).toThrow('duplicado')
  const grande = cena()
  grande.instancias = Array.from({ length: 600 }, (_, i) => ({
    ...structuredClone(grande.instancias[0]!),
    id: `o-${i}`,
    grupo: null,
  }))
  const depois = aplicar(
    grande,
    agruparElementos(
      grande,
      grande.instancias.map((o) => o.id),
      'nova',
      'Grande',
    ),
  )
  expect(depois.instancias.every((o) => o.grupo === 'nova')).toBe(true)
  expect(inverterLote(grande, depois)).toHaveLength(1)
  expect(aplicar(depois, inverterLote(grande, depois))).toEqual(grande)
})

test('índices de escrita acompanham alterações de grupo, camada e restauração durante o lote', () => {
  const d = cena()
  expect(() =>
    aplicar(d, [
      {
        tipo: 'camada.definir',
        camada: { id: 'c', nome: 'Camada', bloqueado: true, oculto: false },
      },
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { camada: 'c' } },
    ]),
  ).toThrow('bloquead')
  expect(() =>
    aplicar(d, [
      { tipo: 'grupo.definir', grupo: { ...d.grupos[0]!, bloqueado: true } },
      { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Proibido' } },
    ]),
  ).toThrow('bloquead')
  const trancado = structuredClone(d)
  trancado.grupos[0]!.bloqueado = true
  expect(() =>
    aplicar(d, [
      { tipo: 'cenario.restaurar', documento: trancado },
      { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Proibido' } },
    ]),
  ).toThrow('bloquead')
  const livre = aplicar(trancado, [
    { tipo: 'grupo.definir', grupo: { ...trancado.grupos[0]!, bloqueado: false } },
    { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Permitido' } },
  ])
  expect(livre.instancias[0]!.nome).toBe('Permitido')
})

test('apagar pasta inclui os descendentes e recusa filhos bloqueados ou apoios externos sem remover parcialmente', () => {
  const d = cena(),
    antes = structuredClone(d)
  const depois = aplicar(d, [{ tipo: 'elementos.remover', ids: ['g'] }])
  expect(depois.grupos).toEqual([])
  expect(depois.instancias.map((o) => o.id)).toEqual(['b'])
  const desfeito = aplicar(depois, inverterLote(d, depois))
  const ordenar = (doc: ReturnType<typeof cena>) => ({
    ...doc,
    instancias: doc.instancias.slice().sort((a, b) => a.id.localeCompare(b.id)),
    grupos: doc.grupos.slice().sort((a, b) => a.id.localeCompare(b.id)),
  })
  expect(ordenar(desfeito)).toEqual(ordenar(d))
  expect(d).toEqual(antes)
  d.instancias[0]!.bloqueado = true
  expect(() => aplicar(d, [{ tipo: 'elementos.remover', ids: ['g'] }])).toThrow('bloquead')
  d.instancias[0]!.bloqueado = false
  d.instancias[1]!.apoio = { tipo: 'objeto', objeto: 'a', deslocamento: 0 }
  const comApoio = structuredClone(d)
  expect(() => aplicar(d, [{ tipo: 'elementos.remover', ids: ['g'] }])).toThrow('Apoio ausente')
  expect(d).toEqual(comApoio)
})

test('redefinir GLB compartilhado também respeita camadas trancadas; undo restaura a definição e os cadeados', () => {
  const d = comCamada()
  delete d.formas
  d.modelos = [
    {
      id: 'm',
      biblioteca: 'b',
      modelo: 'item',
      digest: 'a'.repeat(64),
      volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
    },
  ]
  for (const o of d.instancias) o.modelo = 'm'
  d.camadas![0]!.bloqueado = true
  const novo = { ...d.modelos[0]!, digest: 'b'.repeat(64) }
  expect(() => aplicar(d, [{ tipo: 'modelo.definir', modelo: novo }])).toThrow('bloquead')
  const alterado = structuredClone(d)
  alterado.modelos[0] = novo
  expect(aplicar(alterado, inverterLote(d, alterado))).toEqual(d)
})
