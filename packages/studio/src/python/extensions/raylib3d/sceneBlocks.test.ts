import { expect, test } from 'bun:test'
import { PYTHON_MOLDA_REGIONS_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import { orderPythonAuthoringCodecs } from '../../blocks/authoring'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pythonSemanticTree,
  text,
  withTargetContext,
} from '../../blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../blocks/projection'
import { attachPythonResolverOptions } from '../../blocks/resolverOptions'
import type { PythonNode } from '../../language/types'
import { RAYLIB_RESOLVER_OPTIONS } from '../raylib/commonCatalog'
import { PYTHON_RAYLIB_3D_CODECS } from './catalog'

/**
 * Os blocos de cenário do Raylib 3D (lote 7b da conclusão do plano do Estúdio, 22/11/2026):
 * "Carregar o cenário", "Desenhar o cenário", "Atualizar as regiões perto de x z" e "Entrou na
 * região". O código vira os blocos e os blocos voltam ao mesmo código; os três últimos só valem
 * para o cenário provado (`lugar = cenario.carregar(...)`), nunca para um `x.desenhar()` da
 * criança. Exigem o recurso `molda-scene-regions-v1` do runtime: numa versão sem ele, os blocos
 * nem entram na ordem do catálogo (os recibos de hoje não mudam).
 */

const comRecurso = orderPythonAuthoringCodecs(PYTHON_RAYLIB_3D_CODECS, [
  PYTHON_MOLDA_REGIONS_FEATURE,
])
const codecs = attachPythonResolverOptions(comRecurso, RAYLIB_RESOLVER_OPTIONS)
const OFICIAIS = new Set(['pyray', 'raylib', 'cenario'])
const ID = (chave: string) => `sz_py_rl3d_${chave}`

const importar = (...modulos: string[]) =>
  node('Import', { names: modulos.map((m) => node('alias', { name: m, asname: null })) })
const atribuir = (alvo: string, valor: PythonNode) =>
  node('Assign', {
    targets: [withTargetContext(name(alvo), 'Store')],
    value: valor,
    type_comment: null,
  })
const metodo = (receptor: PythonNode, nome: string, args: PythonNode[] = []) =>
  call(attribute(receptor, nome), args)
const se = (teste: PythonNode, corpo: PythonNode[]) =>
  node('If', { test: teste, body: corpo, orelse: [] })

/** O programa da criança: importa, carrega, atualiza, desenha e pergunta pela entrada. */
function programa(carga: PythonNode) {
  return moduleNode([
    importar('cenario', 'cenario_vila'),
    atribuir('lugar', carga),
    expression(metodo(name('lugar'), 'atualizar', [integer('3'), integer('4')])),
    expression(metodo(name('lugar'), 'desenhar')),
    se(metodo(name('lugar'), 'entrou_na_regiao', [text('Vila')]), [
      expression(call(name('print'), [text('Oi, Vila')])),
    ]),
  ])
}

function blocos(arvore: PythonNode) {
  const visual = pythonASTToVisual(arvore, { codecs, officialModules: OFICIAIS })
  const achados: { id: string; campos: Record<string, string> }[] = []
  const visitar = (itens: PythonVisualNode[]) => {
    for (const item of itens)
      if (item.kind === 'source') achados.push({ id: 'source', campos: {} })
      else {
        achados.push({
          id: item.codecId,
          campos: Object.fromEntries(item.fields.map((f) => [f.name, f.value])),
        })
        for (const entrada of item.inputs) visitar(entrada.nodes)
      }
  }
  visitar(visual.body)
  return { visual, achados }
}

test('o programa de cenário vira os quatro blocos e volta ao mesmo código', () => {
  const arvore = programa(call(attribute(name('cenario'), 'carregar'), [name('cenario_vila')]))
  const { visual, achados } = blocos(arvore)
  const ids = achados.map((a) => a.id)
  for (const chave of ['scene_load', 'scene_update', 'scene_draw', 'scene_entered'])
    expect(ids, chave).toContain(ID(chave))
  expect(ids).not.toContain('source')
  expect(achados.find((a) => a.id === ID('scene_entered'))?.campos).toEqual({ REGIAO: 'Vila' })
  expect(pythonSemanticTree(pythonVisualToAST(visual, codecs))).toEqual(pythonSemanticTree(arvore))
})

test('sem a prova do cenário, desenhar e atualizar ficam com os blocos de sempre', () => {
  // `cenario_vila.carregar()` (o módulo gerado) continua valendo como código, mas não prova que
  // `lugar` é um cenário; e um objeto da criança com `desenhar` nunca vira "Desenhar o cenário".
  for (const carga of [call(attribute(name('cenario_vila'), 'carregar')), call(name('Heroi'))]) {
    const arvore = programa(carga)
    const { visual, achados } = blocos(arvore)
    const ids = achados.map((a) => a.id)
    for (const chave of ['scene_update', 'scene_draw', 'scene_entered'])
      expect(ids, chave).not.toContain(ID(chave))
    expect(pythonSemanticTree(pythonVisualToAST(visual, codecs))).toEqual(
      pythonSemanticTree(arvore),
    )
  }
})

test('um objeto de origem desconhecida (parâmetro, laço) também não vira cenário', () => {
  const corpo = [
    expression(metodo(name('coisa'), 'atualizar', [integer('3'), integer('4')])),
    expression(metodo(name('coisa'), 'desenhar')),
    expression(metodo(name('coisa'), 'entrou_na_regiao', [text('Vila')])),
  ]
  const parametros = node('arguments', {
    posonlyargs: [],
    args: [node('arg', { arg: 'coisa', annotation: null, type_comment: null })],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })
  for (const arvore of [
    moduleNode([
      importar('cenario'),
      node('FunctionDef', {
        name: 'mostrar',
        args: parametros,
        body: corpo,
        decorator_list: [],
        returns: null,
        type_comment: null,
        type_params: [],
      }),
    ]),
    moduleNode([
      importar('cenario'),
      node('For', {
        target: withTargetContext(name('coisa'), 'Store'),
        iter: name('inimigos'),
        body: corpo,
        orelse: [],
        type_comment: null,
      }),
    ]),
  ]) {
    const ids = blocos(arvore).achados.map((a) => a.id)
    for (const chave of ['scene_update', 'scene_draw', 'scene_entered'])
      expect(ids, chave).not.toContain(ID(chave))
  }
})

test('o nome da região é um seletor de regiões e continua um texto livre', () => {
  const entrou = comRecurso.find((c) => c.id === ID('scene_entered'))!
  const forma = entrou.decode(entrou.defaultNode())!
  expect(forma.fields).toEqual([
    { name: 'REGIAO', label: '', value: 'Vila', picker: 'scene-region' },
  ])
  // Um nome que o cenário não tem continua valendo (o jogo avisa uma vez).
  const lua = entrou.encode({ ...forma, fields: [{ ...forma.fields[0]!, value: 'Lua' }] })
  expect(pythonSemanticTree(lua)).toEqual(
    pythonSemanticTree(metodo(name('lugar'), 'entrou_na_regiao', [text('Lua')])),
  )
  // Sem um texto fixo, o nome fica como código.
  expect(entrou.decode(metodo(name('lugar'), 'entrou_na_regiao', [name('nome')]))).toBeUndefined()
})

test('numa versão do runtime sem o recurso das regiões, os blocos ficam de fora', () => {
  const ids = (lista: readonly { id: string }[]) => new Set(lista.map((c) => c.id))
  const semRecurso = ids(orderPythonAuthoringCodecs(PYTHON_RAYLIB_3D_CODECS, []))
  for (const chave of ['scene_load', 'scene_draw', 'scene_update', 'scene_entered']) {
    expect(ids(comRecurso).has(ID(chave)), chave).toBe(true)
    expect(semRecurso.has(ID(chave)), chave).toBe(false)
  }
})
