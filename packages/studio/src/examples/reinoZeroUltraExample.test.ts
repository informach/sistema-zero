import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { behaviorStatements, type JSStatement, normalizeSZIR, SZIRV2Schema } from '#ir'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import { compileStatements } from '../generators/js'
import { parseJS } from '../parsers/js'
import { CORE_EXAMPLES } from './core'
import { CORE_EXAMPLE_SUMMARIES, loadCoreExample } from './coreCatalog'
import {
  hasConservativeRoute,
  REINO_ZERO_ULTRA_STAGES,
  validateReinoZeroUltraCampaign,
  validateReinoZeroUltraStage,
} from './reinoZeroUltraData'
import { reinoZeroUltraExample } from './reinoZeroUltraExample'
import { REINO_ZERO_ULTRA_SOURCE } from './reinoZeroUltraSource'

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '__id')
        .map(([key, child]) => [key, stripIds(child)]),
    ) as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const child of value) collectTypes(child, out)
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function findElementById(value: unknown, id: string): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findElementById(child, id)
      if (found) return found
    }
    return undefined
  }
  if (!isRecord(value)) return undefined
  if (value.id === id) return value
  for (const child of Object.values(value)) {
    const found = findElementById(child, id)
    if (found) return found
  }
  return undefined
}

beforeAll(() => ensureBlocklyInitialized())

describe('Reino Zero Ultra — plataforma profissional sem extensão', () => {
  // ⚠️ Timeout EXPLÍCITO: validar a IR do maior exemplo do núcleo custa ~4 s sozinho,
  // colado no padrão de 5 s do bun — sob a carga da suíte inteira (22 pacotes em
  // paralelo) ele estoura e reprova por TEMPO, não por defeito. Falha intermitente que
  // some ao rodar o arquivo isolado treina a ignorar vermelho, que é o pior hábito
  // possível num portão. Mesma família do já anotado em `reinoZeroPlaythrough.test.ts`.
  it('está no catálogo core, é asset-free e sua IR é válida', async () => {
    expect(CORE_EXAMPLES).toContain(reinoZeroUltraExample)
    expect(reinoZeroUltraExample.ir.extensions).toEqual([])
    expect(reinoZeroUltraExample.assets ?? []).toEqual([])
    expect(SZIRV2Schema.safeParse(reinoZeroUltraExample.ir).success).toBe(true)
    expect(await loadCoreExample(reinoZeroUltraExample.name)).toBe(reinoZeroUltraExample)
  }, 30_000)

  it('entrega 8 mundos × 4 fases estritas, encadeadas e tematicamente distintas', () => {
    expect(REINO_ZERO_ULTRA_STAGES).toHaveLength(32)
    expect(new Set(REINO_ZERO_ULTRA_STAGES.map((stage) => stage.id)).size).toBe(32)
    expect(new Set(REINO_ZERO_ULTRA_STAGES.map((stage) => stage.theme)).size).toBe(8)
    for (const stage of REINO_ZERO_ULTRA_STAGES)
      expect(validateReinoZeroUltraStage(stage)).toBe(stage)
    expect(validateReinoZeroUltraCampaign(REINO_ZERO_ULTRA_STAGES)).toEqual(REINO_ZERO_ULTRA_STAGES)
    expect(REINO_ZERO_ULTRA_STAGES.every(hasConservativeRoute)).toBe(true)
    expect(new Set(REINO_ZERO_ULTRA_STAGES.map((stage) => stage.tiles.join('\n'))).size).toBe(32)
    for (let index = 0; index < REINO_ZERO_ULTRA_STAGES.length - 1; index += 1) {
      expect(REINO_ZERO_ULTRA_STAGES[index]?.nextStage).toBe(REINO_ZERO_ULTRA_STAGES[index + 1]?.id)
    }
    expect(REINO_ZERO_ULTRA_STAGES.at(-1)?.nextStage).toBeUndefined()
  })

  it('rejeita dados de fase adulterados antes de chegarem ao motor', () => {
    const base = structuredClone(REINO_ZERO_ULTRA_STAGES[0])
    if (!base) throw new Error('fase inicial ausente')
    expect(validateReinoZeroUltraStage({ ...base, surpresa: true })).toBeNull()
    expect(
      validateReinoZeroUltraStage({
        ...base,
        entities: [{ ...base.entities[0], health: Number.NaN }],
      }),
    ).toBeNull()
    expect(
      validateReinoZeroUltraStage({
        ...base,
        platforms: [{ id: 'quebrada', x: 1, y: 1, w: -2, range: 1, speed: 1, axis: 'x' }],
      }),
    ).toBeNull()
    expect(validateReinoZeroUltraStage({ ...base, spawn: { x: 999, y: 2 } })).toBeNull()
    const brokenCampaign = structuredClone(REINO_ZERO_ULTRA_STAGES)
    if (!brokenCampaign[0]) throw new Error('campanha vazia')
    brokenCampaign[0].nextStage = '8-4'
    expect(validateReinoZeroUltraCampaign(brokenCampaign)).toBeNull()
  })

  it('rejeita rota bloqueada por uma parede sólida do piso ao teto', () => {
    const blocked = {
      schemaVersion: 1,
      id: '1-1',
      world: 1,
      stage: 1,
      theme: 'campo',
      width: 12,
      height: 8,
      timeLimit: 120,
      seed: 123,
      spawn: { x: 2, y: 6 },
      tiles: Array.from({ length: 8 }, (_, row) => (row === 7 ? '############' : '......#.....')),
      entities: [{ id: 'saida', kind: 'exit', x: 9, y: 6, variant: 'bandeira' }],
      platforms: [],
      triggers: [{ kind: 'hint', x: 1, y: 1, w: 2, h: 2, value: 'Parede intransponível.' }],
    }
    const validated = validateReinoZeroUltraStage(blocked)
    if (!validated) throw new Error('A fixture precisa ser válida estruturalmente.')
    expect(hasConservativeRoute(validated)).toBe(false)
  })

  it('cobre campanha, controles, persistência, replay e som apenas com IR nativa', () => {
    const types = collectTypes(reinoZeroUltraExample.ir)
    for (const forbidden of ['rawJS', 'rawHTML', 'rawCSS']) expect(types.has(forbidden)).toBe(false)
    for (const required of [
      'jsonLiteral',
      'jsonParse',
      'jsonStringify',
      'storageGet',
      'storageSet',
      'storageRemove',
      'gamepadAxis',
      'gamepadButton',
      'somTone',
      'somNoise',
      'requestFrame',
      'while',
    ]) {
      expect(types.has(required), required).toBe(true)
    }
    const entities = REINO_ZERO_ULTRA_STAGES.flatMap((stage) => stage.entities)
    expect(entities.filter((entity) => entity.kind === 'boss')).toHaveLength(8)
    expect(entities.filter((entity) => entity.kind === 'gem')).toHaveLength(8)
    expect(REINO_ZERO_ULTRA_STAGES.filter((stage) => stage.secretStage)).toHaveLength(8)
  })

  it('mantém ponto fixo IR → código → parser sem bloco bruto', () => {
    const embedded = stripIds(behaviorStatements(reinoZeroUltraExample.ir)) as JSStatement[]
    const code = compileStatements(embedded, 0)
    const reparsed = stripIds(parseJS(code)) as JSStatement[]
    expect(collectTypes(reparsed).has('rawJS')).toBe(false)
    expect(reparsed).toEqual(embedded)
    expect(compileStatements(reparsed, 0)).toBe(code)
  })

  it('mantém a IR publicada em sincronia com o fonte canônico', () => {
    const rebuilt = normalizeSZIR({
      html: reinoZeroUltraExample.ir.html,
      css: reinoZeroUltraExample.ir.css,
      js: parseJS(REINO_ZERO_ULTRA_SOURCE),
      extensions: [],
    })
    expect(stripIds(rebuilt)).toEqual(stripIds(reinoZeroUltraExample.ir))
  })

  // ⚠️ Teto EXPLÍCITO e generoso, pelo mesmo motivo do caso da IR lá em cima — só que
  // este é o mais caro do arquivo: sozinho e sem carga custa ~7,5 s (carregar o
  // workspace inteiro do maior exemplo do núcleo, com 80+ funções colapsadas, e
  // reconstruir a IR de volta). No CI, sob os 22 pacotes em paralelo, ele já foi
  // medido em 12,9 s passando e estourou 16,0 s reprovando — ou seja, o teto de 15 s
  // ficava DENTRO da variação normal e virava cara ou coroa. O teto existe para pegar
  // pendura, não para policiar desempenho: a mesma proporção do irmão (~4 s → 30 s)
  // dá 60 s aqui.
  it('preserva o motor inteiro no round-trip IR → blocos → IR', () => {
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(
        buildWorkspaceStateFromIR(reinoZeroUltraExample.ir, reinoZeroUltraExample.workspaceOptions),
        workspace,
      )
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(reinoZeroUltraExample.ir)))
      expect(collectTypes(rebuilt).has('rawJS')).toBe(false)
      const functions = workspace
        .getAllBlocks(false)
        .filter((block) => block.type === 'sz_js_function')
      expect(functions.length).toBeGreaterThan(80)
      expect(functions.every((block) => block.isCollapsed())).toBe(true)
    } finally {
      workspace.dispose()
    }
  }, 60_000)

  it('mantém catálogo leve em sincronia e resolve a IR só pelo carregador', () => {
    expect(CORE_EXAMPLE_SUMMARIES).toEqual(
      CORE_EXAMPLES.map(({ name, description, experience }) => ({ name, description, experience })),
    )
    const summary = CORE_EXAMPLE_SUMMARIES.find((item) => item.name === reinoZeroUltraExample.name)
    expect(summary).toEqual({
      name: reinoZeroUltraExample.name,
      description: reinoZeroUltraExample.description,
      experience: 'game',
    })
    expect(summary).not.toHaveProperty('ir')
  })

  it('mantém a campanha no chunk sob demanda dentro do orçamento comprimido', () => {
    const serialized = new TextEncoder().encode(JSON.stringify(reinoZeroUltraExample.ir))
    expect(serialized.byteLength).toBeLessThan(400_000)
    expect(Bun.gzipSync(serialized).byteLength).toBeLessThan(45_000)
  })

  it('separa o estado de automação dos anúncios acessíveis', () => {
    const status = findElementById(reinoZeroUltraExample.ir.html, 'reino-status')
    const announcement = findElementById(reinoZeroUltraExample.ir.html, 'reino-announcement')
    const canvas = findElementById(reinoZeroUltraExample.ir.html, 'reino-zero-ultra')
    expect(status?.attrs).toEqual({ 'aria-hidden': 'true' })
    expect(announcement?.attrs).toEqual({
      role: 'status',
      'aria-atomic': 'true',
      'aria-live': 'polite',
    })
    expect(canvas?.attrs).toEqual(
      expect.objectContaining({
        'aria-describedby': 'reino-instructions reino-announcement',
      }),
    )
  })
})
