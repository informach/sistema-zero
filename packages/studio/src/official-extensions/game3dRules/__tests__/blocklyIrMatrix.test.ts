import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import {
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  getBlockContract,
} from '../../../blockly/blockContracts'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import type { BlockDefinition } from '../../../blockly/blocks/types'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { HTMLConnectionChecker } from '../../../blockly/htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseProjectFilesWithDiagnostics } from '../../../parsers/project'
import { gameThreeDBlocks } from '../../game-3d/blocks'
import { gameKit3DBlocks } from '../../game-3d-advanced/blocks'
import { world3DBlocks } from '../../world-3d/blocks'

/**
 * MATRIZ Blockly × IR dos "Quando…"/"A cada…" das três extensões 3D.
 *
 * Para cada chapéu (bloco de raiz em ⚡ Quando acontecer ou 🔁 Repetir) e cada comando da MESMA
 * extensão, o veredito do connection checker REAL (o que a criança consegue encaixar) tem que ser
 * o mesmo da IR (o que a Ponte e o estado salvo aceitam). Quando divergem, o código passa no
 * schema e o projeto abre pela metade ("could not connect its previous connection"), ou o bloco
 * encaixa e o projeto é recusado ao salvar.
 *
 * Testa o filho direto e o filho dentro de um "Se" (o contexto do chapéu atravessa o "Se").
 * Os avisos de referência (nome que não foi criado) ficam de fora: aqui só importa o lugar.
 */

ensureBlocklyInitialized()

const EXTENSIONS = [
  { prefix: 'g3d', blocks: gameThreeDBlocks },
  { prefix: 'w3d', blocks: world3DBlocks },
  { prefix: 'g3k', blocks: gameKit3DBlocks },
] as const

for (const extension of EXTENSIONS) registerExtensionBlocks(extension.blocks as BlockDefinition[])

const REFERENCE_ISSUE = /ainda não foi criad|não foi declarad|não existe|não foi criad/

class PermissiveChecker extends Blockly.ConnectionChecker {
  override canConnectWithReason(): number {
    return Blockly.Connection.CAN_CONNECT
  }
  override doTypeChecks(): boolean {
    return true
  }
}

function hasBody(definition: BlockDefinition): boolean {
  const args = [definition.args0, definition.args1, definition.args2] as unknown[][]
  return args.some((list) =>
    (list ?? []).some(
      (arg) =>
        typeof arg === 'object' &&
        arg !== null &&
        (arg as { type?: string; name?: string }).type === 'input_statement' &&
        (arg as { name?: string }).name === 'BODY',
    ),
  )
}

/** A área-raiz do bloco, quando ele mora em ⚡ ou 🔁 (o "Depois de N s" mora em 🔁 e aninha). */
function rootArea(type: string): 'events' | 'loops' | null {
  const root = getBlockContract(type)?.placement?.root[0]
  return root === 'events' || root === 'loops' ? root : null
}

/** Chapéu que só existe na raiz (evento ou laço): não entra como filho. */
function isRootOnlyHat(type: string): boolean {
  const role = getBlockContract(type)?.placement?.role
  return rootArea(type) !== null && (role === 'event' || role === 'loop')
}

function verdicts(host: string, child: string, insideIf: boolean) {
  const workspace = new Blockly.Workspace()
  workspace.connectionChecker = new PermissiveChecker()
  try {
    workspace.newBlock(FRAME_START)
    const frame = workspace.newBlock(rootArea(host) === 'loops' ? FRAME_LOOPS : FRAME_EVENTS)
    const hat = workspace.newBlock(host)
    frame.getInput('CHILDREN')?.connection?.connect(hat.previousConnection as Blockly.Connection)
    let slot = hat.getInput('BODY')?.connection as Blockly.Connection
    if (insideIf) {
      const branch = workspace.newBlock('sz_js_if_else')
      slot.connect(branch.previousConnection as Blockly.Connection)
      slot = branch.getInput('THEN')?.connection as Blockly.Connection
    }
    const block = workspace.newBlock(child)
    const blockly = new HTMLConnectionChecker().canConnect(block.previousConnection, slot, false)
    slot.connect(block.previousConnection as Blockly.Connection)
    const parsed = SZIRV2Schema.safeParse(buildIRFromWorkspace(workspace))
    const issues = parsed.success
      ? []
      : parsed.error.issues.map((entry) => entry.message).filter((m) => !REFERENCE_ISSUE.test(m))
    return { blockly, ir: issues.length === 0, why: issues[0] ?? '' }
  } finally {
    workspace.dispose()
  }
}

describe('Blockly e IR concordam sobre o que cabe dentro de cada "Quando…" 3D', () => {
  for (const extension of EXTENSIONS) {
    const definitions = extension.blocks as readonly BlockDefinition[]
    const hosts = definitions
      .filter((definition) => hasBody(definition) && rootArea(definition.type) !== null)
      .map((definition) => definition.type)
    const children = definitions
      .filter(
        (definition) =>
          definition.previousStatement && !definition.output && !isRootOnlyHat(definition.type),
      )
      .map((definition) => definition.type)

    it(`${extension.prefix}: ${hosts.length} chapéus × ${children.length} comandos`, () => {
      expect(hosts.length).toBeGreaterThan(0)
      const divergent: string[] = []
      for (const host of hosts) {
        for (const child of children) {
          for (const insideIf of [false, true]) {
            const result = verdicts(host, child, insideIf)
            if (result.blockly === result.ir) continue
            divergent.push(
              `${host} ${insideIf ? '> Se > ' : '> '}${child}: Blockly ${
                result.blockly ? 'aceita' : 'recusa'
              }, IR ${result.ir ? 'aceita' : `recusa (${result.why})`}`,
            )
          }
        }
      }
      expect(divergent).toEqual([])
    }, 120_000)
  }
})

describe('a Ponte reabre por inteiro a música e a torre num "Quando…" do jogo', () => {
  const prelude = [
    'const cena = SZGame3D.createScene("tela");',
    'const heroi = SZGame3D.createBox(cena, { size: 2, color: "#ff0000" });',
    'const estrelas = SZGame3D.createGroup();',
    'SZGame3D.loadSound("derrota", "musica");',
    '',
  ].join('\n')
  const cases: Record<string, [string, string]> = {
    'contagem acabou → música': [
      'SZGame3D.onTimerEnd(() => {\n  SZGame3D.playMusic("derrota");\n});',
      'g3d:playMusic',
    ],
    'vida acabou → música': [
      'SZGame3D.onLifeOver(heroi, () => {\n  SZGame3D.playMusic("derrota");\n});',
      'g3d:playMusic',
    ],
    'tecla → depois de 2 s → fim de jogo': [
      'SZGame3D.onKey("Space", () => {\n  SZGame3D.afterSeconds(2, () => {\n    SZGame3D.endGame("ganhou");\n  });\n});',
      'g3d:afterSeconds',
    ],
    'encostou → soltar a torre': [
      'SZGame3D.onTouchGroup(heroi, estrelas, (item) => {\n  SZGame3D.stackDrop(cena);\n});',
      'g3d:stackDrop',
    ],
  }
  for (const [name, [code, type]] of Object.entries(cases)) {
    it(name, () => {
      const parsed = parseProjectFilesWithDiagnostics({
        'index.html': '<canvas id="tela"></canvas>',
        'style.css': '',
        'script.js': prelude + code,
      })
      expect(parsed.diagnostics.filter((entry) => entry.kind === 'semanticError')).toEqual([])
      const workspace = new Blockly.Workspace()
      workspace.connectionChecker = new HTMLConnectionChecker()
      try {
        Blockly.serialization.workspaces.load(
          buildWorkspaceStateFromIR(parsed.ir) as never,
          workspace,
        )
        expect(JSON.stringify(buildIRFromWorkspace(workspace))).toContain(`"type":"${type}"`)
      } finally {
        workspace.dispose()
      }
    })
  }
})

describe('"Depois de N segundos": raiz em 🔁 e também dentro de um evento, nunca num laço', () => {
  const cases = [
    // [prefixo, chapéu de evento, chapéu de laço]
    ['g3d', 'sz_g3d_on_timer_end', 'sz_g3d_animate'],
    ['g3d', 'sz_g3d_on_key', 'sz_g3d_animate'],
    ['w3d', 'sz_w3d_on_timer_end', 'sz_w3d_on_update'],
  ] as const
  for (const [prefix, eventHost, loopHost] of cases) {
    const after = `sz_${prefix}_after_seconds`
    it(`${prefix}: cabe em ${eventHost}, não em ${loopHost}`, () => {
      expect(verdicts(eventHost, after, false)).toMatchObject({ blockly: true, ir: true })
      expect(verdicts(eventHost, after, true)).toMatchObject({ blockly: true, ir: true })
      expect(verdicts(loopHost, after, false)).toMatchObject({ blockly: false, ir: false })
      expect(verdicts(loopHost, after, true)).toMatchObject({ blockly: false, ir: false })
    })
    it(`${prefix}: o corpo roda uma vez, então aceita a música e o fim de jogo`, () => {
      expect(verdicts(after, `sz_${prefix}_play_music`, false)).toMatchObject({
        blockly: true,
        ir: true,
      })
      expect(verdicts(after, `sz_${prefix}_end_game`, false)).toMatchObject({
        blockly: true,
        ir: true,
      })
    })
  }
  it('o Avançado não oferece o bloco (ele tem os temporizadores dele)', () => {
    expect(gameKit3DBlocks.some((block) => block.type === 'sz_g3k_after_seconds')).toBe(false)
  })
})

describe('"Dar … de vida" é preparação: não cabe num laço', () => {
  for (const [prefix, loopHost, eventHost] of [
    ['g3d', 'sz_g3d_animate', 'sz_g3d_on_key'],
    ['w3d', 'sz_w3d_on_update', 'sz_w3d_on_timer_end'],
  ] as const) {
    it(`${prefix}: recusado no laço (direto e dentro do "Se"), aceito num "Quando…"`, () => {
      const setLife = `sz_${prefix}_set_life`
      expect(verdicts(loopHost, setLife, false)).toMatchObject({ blockly: false, ir: false })
      expect(verdicts(loopHost, setLife, true)).toMatchObject({ blockly: false, ir: false })
      expect(verdicts(eventHost, setLife, false)).toMatchObject({ blockly: true, ir: true })
      // Machucar e curar continuam valendo no laço (são o que o laço faz).
      expect(verdicts(loopHost, `sz_${prefix}_hurt`, false)).toMatchObject({
        blockly: true,
        ir: true,
      })
    })
  }
})
