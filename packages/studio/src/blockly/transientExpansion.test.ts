import { afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import * as Blockly from 'blockly/core'
import { ensureBlocklyInitialized } from './setup'
import {
  differsOnlyInStackPositions,
  forgetShownWhenTouched,
  isBumpWhileShowing,
  withShowingScope,
} from './transientExpansion'

beforeAll(() => {
  ensureBlocklyInitialized()
})

/**
 * A comparação da gravação de saída e do Rodar com uma pilha afastada por "Mostrar o bloco"
 * (revisão do lote 2, 22/11/2026): só a posição das pilhas soltas pode ser ignorada.
 */
const state = (blocks: unknown[]) =>
  JSON.stringify({ blocks: { languageVersion: 0, blocks }, szBehaviorAreasVersion: 1 })

const area = {
  type: 'sz_frame_start',
  id: 'a',
  x: 10,
  y: 20,
  inputs: { CHILDREN: { block: { type: 'sz_js_let', id: 'b', fields: { NAME: 'pontos' } } } },
}
const solta = { type: 'sz_js_let', id: 'c', x: 32, y: 392, fields: { NAME: 'vidas' } }

describe('differsOnlyInStackPositions', () => {
  it('a pilha solta afastada não conta como mudança', () => {
    expect(
      differsOnlyInStackPositions(state([area, solta]), state([area, { ...solta, x: 60, y: 348 }])),
    ).toBe(true)
  })

  it('qualquer outra diferença conta: um campo, um bloco a mais, a função aberta', () => {
    const outroNome = { ...solta, fields: { NAME: 'tempo' } }
    expect(differsOnlyInStackPositions(state([area, solta]), state([area, outroNome]))).toBe(false)
    expect(differsOnlyInStackPositions(state([area]), state([area, solta]))).toBe(false)
    expect(
      differsOnlyInStackPositions(
        state([{ ...area, collapsed: true }, solta]),
        state([area, solta]),
      ),
    ).toBe(false)
  })

  it('a posição de um bloco DENTRO de uma pilha não é ignorada', () => {
    const dentro = (x: number) => ({
      ...area,
      inputs: { CHILDREN: { block: { type: 'sz_js_let', id: 'b', x, fields: { NAME: 'p' } } } },
    })
    expect(differsOnlyInStackPositions(state([dentro(1)]), state([dentro(2)]))).toBe(false)
  })

  it('texto que não é um estado salvo nunca passa por igual', () => {
    expect(differsOnlyInStackPositions('{', '{')).toBe(false)
    expect(differsOnlyInStackPositions('{}', '{}')).toBe(false)
  })
})

/**
 * O gesto de "Mostrar o bloco" (full review final, 22/11/2026): o afastamento que o desenho faz
 * durante o gesto é reconhecido pelo GRUPO de eventos do gesto, não por um relógio (numa máquina
 * lenta os 2 s passavam antes de o evento chegar ao ouvinte, e o projeto salvo mudava), e não entra
 * no desfazer (apagava o refazer da criança).
 */
describe('o gesto de mostrar', () => {
  const workspaces: Blockly.Workspace[] = []
  afterEach(() => {
    for (const workspace of workspaces.splice(0)) workspace.dispose()
  })
  const novo = () => {
    const workspace = new Blockly.Workspace()
    workspaces.push(workspace)
    const solta = workspace.newBlock('math_number', 'solta')
    return { workspace, solta }
  }
  const proximoTique = () => new Promise((resolve) => setTimeout(resolve, 0))
  /**
   * O afastamento como o `bumpNeighbours` faz no desenho (`moveBy(…, ['bump'])`). No workspace
   * headless o `moveBy` sai nulo (o evento guarda a MESMA coordenada como antes e depois), então o
   * evento é montado à mão; o grupo e o desfazer são lidos quando ele nasce, como no de verdade.
   */
  const afastar = (bloco: Blockly.Block) => {
    const evento = new Blockly.Events.BlockMove(bloco)
    evento.setReason(['bump'])
    evento.oldCoordinate = new Blockly.utils.Coordinate(0, 0)
    evento.newCoordinate = new Blockly.utils.Coordinate(28, 0)
    Blockly.Events.fire(evento)
  }
  const doAfastamento = (eventos: Blockly.Events.Abstract[]) => {
    const bump = eventos.find((event) => event instanceof Blockly.Events.BlockMove)
    expect(bump).toBeDefined()
    return bump as Blockly.Events.BlockMove
  }
  const capturar = (workspace: Blockly.Workspace) => {
    const eventos: Blockly.Events.Abstract[] = []
    workspace.addChangeListener((event) => eventos.push(event))
    return eventos
  }

  it('o afastamento feito durante o gesto é do gesto, mesmo se o evento chega muito depois', async () => {
    const { workspace, solta } = novo()
    const eventos = capturar(workspace)
    withShowingScope(workspace, () => afastar(solta))
    await proximoTique()
    const bump = doAfastamento(eventos)
    // O ouvinte do painel só recebe o evento depois do quadro seguinte; numa máquina lenta, segundos
    // depois. O relógio não pode decidir: um minuto depois, o afastamento continua do gesto.
    const relogio = spyOn(performance, 'now').mockReturnValue(performance.now() + 60_000)
    try {
      expect(isBumpWhileShowing(workspace, bump)).toBe(true)
    } finally {
      relogio.mockRestore()
    }
  })

  it('o mesmo afastamento fora do gesto é gravado como sempre', async () => {
    const { workspace, solta } = novo()
    const eventos = capturar(workspace)
    withShowingScope(workspace, () => undefined)
    afastar(solta)
    await proximoTique()
    expect(isBumpWhileShowing(workspace, doAfastamento(eventos))).toBe(false)
  })

  it('o afastamento do gesto não entra no desfazer nem apaga o refazer', async () => {
    const { workspace, solta } = novo()
    // Uma edição da criança, desfeita: o refazer fica disponível.
    solta.setFieldValue('7', 'NUM')
    await proximoTique()
    workspace.undo(false)
    await proximoTique()
    expect(workspace.getRedoStack().length).toBe(1)
    const desfazerAntes = workspace.getUndoStack().length
    withShowingScope(workspace, () => afastar(solta))
    await proximoTique()
    expect(workspace.getUndoStack().length).toBe(desfazerAntes)
    expect(workspace.getRedoStack().length).toBe(1)
  })

  it('o grupo e o desfazer voltam ao que eram, inclusive quando o gesto lança', () => {
    const { workspace } = novo()
    Blockly.Events.setGroup('grupo-de-fora')
    try {
      expect(() =>
        withShowingScope(workspace, () => {
          expect(Blockly.Events.getRecordUndo()).toBe(false)
          expect(Blockly.Events.getGroup()).not.toBe('grupo-de-fora')
          throw new Error('quebrou')
        }),
      ).toThrow('quebrou')
      expect(Blockly.Events.getGroup()).toBe('grupo-de-fora')
      expect(Blockly.Events.getRecordUndo()).toBe(true)
    } finally {
      Blockly.Events.setGroup(false)
    }
  })

  it('um evento do gesto não tira a marca de "só mostrado"', async () => {
    const { workspace, solta } = novo()
    const eventos = capturar(workspace)
    withShowingScope(workspace, () => afastar(solta))
    await proximoTique()
    const bump = doAfastamento(eventos)
    // Sem marca nenhuma, nada acontece; a regra é conferida pelo e2e com a função de verdade.
    expect(() => forgetShownWhenTouched(workspace, bump)).not.toThrow()
  })
})
