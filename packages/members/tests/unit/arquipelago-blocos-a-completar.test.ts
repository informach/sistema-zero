import { expect, test } from 'bun:test'
import { ProjectDocumentError } from '@sistemazero/studio/project-document'
import { blocosACompletar } from '../../src/application/arquipelago/blocos-a-completar'

type Bloco = Record<string, unknown>
const valor = (v: number): Bloco => ({ type: 'sz_val_number', fields: { NUM: v } })
const escrever = (v: number): Bloco => ({
  type: 'sz_js_console_log_value',
  inputs: { VALUE: { block: valor(v) } },
})
function cadeia(blocos: Bloco[]) {
  let proximo: Bloco | undefined
  for (let i = blocos.length - 1; i >= 0; i--)
    proximo = { ...blocos[i], ...(proximo ? { next: { block: proximo } } : {}) }
  return proximo
}
const area = (blocos: Bloco[], type = 'sz_frame_start') => ({
  type,
  inputs: { CHILDREN: { block: cadeia(blocos) } },
})
const estado = (...areas: Bloco[]) => ({ blocks: { blocks: areas } })
const tipos = (antes: unknown, depois: unknown) =>
  blocosACompletar(antes, depois).filter((t) => !t.startsWith('sz_frame_'))

test('apoio idêntico não exige repertório, mesmo com IDs, posição, comentário e chaves diferentes', () => {
  const a = escrever(1)
  const b = {
    id: 'novo',
    x: 250,
    y: 30,
    collapsed: true,
    icons: { comment: { text: 'Outra orientação' } },
    ...a,
  }
  expect(tipos(estado(area([a])), estado(area([b])))).toEqual([])
  expect(
    tipos(
      estado(area([{ type: 'sz_val_number', fields: { X: 1, Y: 2 } }])),
      estado(area([{ fields: { Y: 2, X: 1 }, type: 'sz_val_number' }])),
    ),
  ).toEqual([])
})

test('mudar um valor inclui sua operação e não apenas tipos inéditos', () => {
  expect(tipos(estado(area([escrever(1)])), estado(area([escrever(2)])))).toEqual([
    'sz_js_console_log_value',
    'sz_val_number',
  ])
})

test('preencher um Se ou laço preparado exige o contêiner e a ação nova', () => {
  for (const type of ['sz_js_if_else', 'sz_g2d_for_each_in_group']) {
    const a = { type, fields: { NAME: 'ninho' } }
    const b = { ...a, inputs: { BODY: { block: escrever(1) } } }
    expect(tipos(estado(area([a])), estado(area([b])))).toEqual(
      [type, 'sz_js_console_log_value', 'sz_val_number'].sort(),
    )
  }
})

test('acrescentar no fim não cobra todo o apoio que veio antes', () => {
  const apoio = { type: 'sz_g2d_draw_sprite', fields: { SPRITE: 'bicho' } }
  expect(tipos(estado(area([apoio])), estado(area([apoio, escrever(1)])))).toEqual([
    'sz_js_console_log_value',
    'sz_val_number',
  ])
})

test('duplicar e retirar contam mesmo quando o tipo continua no projeto', () => {
  const a = estado(area([escrever(1)]))
  const b = estado(area([escrever(1), escrever(1)]))
  expect(tipos(a, b)).toEqual(['sz_js_console_log_value', 'sz_val_number'])
  expect(tipos(b, a)).toEqual(tipos(a, b))
})

test('ordem na mesma área e mudança de área são alterações de regra', () => {
  const a = { type: 'sz_g2d_clear' },
    b = { type: 'sz_g2d_draw_sprite' }
  expect(tipos(estado(area([a, b])), estado(area([b, a])))).toEqual([
    'sz_g2d_clear',
    'sz_g2d_draw_sprite',
  ])
  expect(tipos(estado(area([a])), estado(area([a], 'sz_frame_loops')))).toEqual(['sz_g2d_clear'])
})

test('desativação e estado extra contam, mas recolher e mover visualmente não', () => {
  const a = { type: 'sz_js_if_else', extraState: { elseCount: 0 } }
  expect(tipos(estado(area([a])), estado(area([{ ...a, extraState: { elseCount: 1 } }])))).toEqual([
    'sz_js_if_else',
  ])
  expect(tipos(estado(area([a])), estado(area([{ ...a, enabled: false }])))).toEqual([
    'sz_js_if_else',
  ])
  expect(
    tipos(
      estado(area([{ type: 'sz_g2d_every_frames', data: '{"key":"onda"}' }])),
      estado(area([{ type: 'sz_g2d_every_frames', data: '{"key":"outra"}' }])),
    ),
  ).toEqual(['sz_g2d_every_frames'])
})

test('a comparação é iterativa em cadeias extensas e não modifica os projetos', () => {
  const a = estado(area(Array.from({ length: 3000 }, () => ({ type: 'sz_g2d_clear' }))))
  const b = estado(
    area(Array.from({ length: 3000 }, () => ({ type: 'sz_g2d_clear', collapsed: true }))),
  )
  expect(tipos(a, b)).toEqual([])
  expect(a.blocks.blocks[0]).not.toHaveProperty('collapsed')
})

test('mantém a recusa de ciclos, IDs duplicados e ciclos nos campos', () => {
  const ciclo: Bloco = { type: 'sz_g2d_clear' }
  ciclo.next = { block: ciclo }
  expect(() => tipos(estado(), estado(ciclo))).toThrow(ProjectDocumentError)
  expect(() =>
    tipos(
      estado(),
      estado(
        area([
          { type: 'sz_g2d_clear', id: 'igual' },
          { type: 'sz_g2d_clear', id: 'igual' },
        ]),
      ),
    ),
  ).toThrow(ProjectDocumentError)
  const campos: Bloco = {}
  campos.volta = campos
  expect(() => tipos(estado(), estado(area([{ type: 'sz_g2d_clear', fields: campos }])))).toThrow(
    ProjectDocumentError,
  )
})
