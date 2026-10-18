import { describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  isSectionCompletion,
  type SectionCompletion,
  type SectionProjectCheck,
} from '@sistemazero/core/learning'
import { STUDIO_PRO_TEMPLATES } from '@sistemazero/core/studio/pro-templates'
import { projectCheckAuthoring } from '@sistemazero/studio/server-project-checks'
import { describeExecutionRule, newExecutionRule } from '../src/lib/execution-rule'
import { kitSuggestions, OBJECTIVE_TEMPLATES, templatesFor } from '../src/lib/objective-templates'
import {
  MAX_PROJECT_CHECKS,
  parseObjectivesClipboard,
  serializeObjectives,
} from '../src/lib/objectives-clipboard'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)
const { checkFromTemplate } = await import('../src/components/editor/objective-tools')

const valid = (check: SectionProjectCheck) =>
  isSectionCompletion({ version: 1, blockIds: [], projectChecks: [check] })
const laco: SectionProjectCheck = { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } }

describe('os modelos de objetivo', () => {
  test('todo modelo e toda sugestão de kit nascem válidos para o core', () => {
    const kits = STUDIO_PRO_TEMPLATES.filter((template) => template.kitVersion)
    // Anti-vácuo: há kits e todo kit do catálogo tem pelo menos a sugestão da meta.
    expect(kits.length).toBeGreaterThan(5)
    for (const kit of kits) expect(kitSuggestions(kit.id).length).toBeGreaterThanOrEqual(2)
    expect(kitSuggestions('vanilla-vite')).toEqual([])
    for (const template of [...OBJECTIVE_TEMPLATES, ...kits.flatMap((k) => kitSuggestions(k.id))])
      expect(valid(checkFromTemplate(template, false, () => 'x'))).toBe(true)
  })

  test('cada modelo só aparece no projeto em que funciona (a autoria não acusa nada)', () => {
    const classico = projectCheckAuthoring({ initialProject: { installedExtensions: [] } })
    const blocos = projectCheckAuthoring({ initialProject: {}, allowedModes: ['blocks'] })
    const kit = projectCheckAuthoring({
      initialProject: { kind: 'pro', tree: {}, proMeta: { templateId: 'canvas-survival' } },
    })
    for (const template of templatesFor({ pro: false, kit: false, bridge: true }))
      expect(classico.issues(checkFromTemplate(template, false).rule)).toEqual([])
    const soBlocos = templatesFor({ pro: false, kit: false, bridge: false })
    expect(soBlocos.some((template) => template.check.rule.type === 'script')).toBe(false)
    for (const template of soBlocos)
      expect(blocos.issues(checkFromTemplate(template, false).rule)).toEqual([])
    const doKit = [
      ...kitSuggestions('canvas-survival'),
      ...templatesFor({ pro: true, kit: true, bridge: false }),
    ]
    for (const template of doKit)
      expect(kit.issues(checkFromTemplate(template, true).rule)).toEqual([])
    // Todo kit do catálogo: as sugestões dele são aceitas pela autoria do próprio kit.
    for (const entry of STUDIO_PRO_TEMPLATES.filter((t) => t.kitVersion)) {
      const autoria = projectCheckAuthoring({
        initialProject: { kind: 'pro', tree: {}, proMeta: { templateId: entry.id } },
      })
      for (const template of kitSuggestions(entry.id))
        expect([entry.id, autoria.issues(checkFromTemplate(template, true).rule)]).toEqual([
          entry.id,
          [],
        ])
    }
    // A vida só aparece no kit que a mostra.
    expect(kitSuggestions('canvas-puzzle').some((t) => t.id.endsWith('-vida'))).toBe(false)
    expect(kitSuggestions('canvas-survival').some((t) => t.id.endsWith('-vida'))).toBe(true)
    // A função no Pro ganha o arquivo exportado sozinha.
    const funcao = OBJECTIVE_TEMPLATES.find((template) => template.id === 'funcao-dobro')
    if (!funcao) throw new Error('modelo ausente')
    expect(checkFromTemplate(funcao, true).rule).toMatchObject({ module: 'src/regras.ts' })
  })

  test('usar o modelo duas vezes não divide objetos (editar um não muda o outro)', () => {
    const template = OBJECTIVE_TEMPLATES[2]
    if (!template) throw new Error('modelo ausente')
    const a = checkFromTemplate(template, false, () => 'a')
    const b = checkFromTemplate(template, false, () => 'b')
    expect(a.rule).not.toBe(b.rule)
    expect(a.rule).toEqual(b.rule)
  })

  test('a regra em JavaScript nova é válida e se descreve', () => {
    const rule = newExecutionRule('script', false)
    expect(valid({ id: 's', label: 'x', rule })).toBe(true)
    expect(describeExecutionRule(rule)).toBe(
      'Regra em JavaScript: esperar 500 ms; return jogo.pontos > 0',
    )
  })
})

describe('copiar e colar objetivos', () => {
  test('colar dá ids novos e mantém o resto', () => {
    let n = 0
    const pasted = parseObjectivesClipboard(serializeObjectives([laco]), [], () => `novo-${++n}`)
    expect(pasted).toEqual({ checks: [{ ...laco, id: 'novo-1' }], notes: [] })
    // Também aceita a lista crua ou um critério de parte inteiro.
    expect(parseObjectivesClipboard(JSON.stringify([laco]), []).checks).toHaveLength(1)
    expect(
      parseObjectivesClipboard(JSON.stringify({ projectChecks: [laco] }), []).checks,
    ).toHaveLength(1)
  })

  test('colado que a autoria acusa neste projeto entra com o aviso do que ajustar', () => {
    const variavel: SectionProjectCheck = {
      id: 'v',
      label: 'O herói anda',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
      },
    }
    const pro = projectCheckAuthoring({
      initialProject: { kind: 'pro', tree: {}, proMeta: { templateId: 'canvas-puzzle' } },
    })
    const colado = parseObjectivesClipboard(
      serializeObjectives([variavel]),
      [],
      undefined,
      (rule) => pro.issues(rule),
    )
    expect(colado.checks).toHaveLength(1)
    expect(colado.notes).toEqual([
      'Ajuste "O herói anda": No projeto Pro, confira o texto da página, o console ou o estado do kit.',
    ])
  })

  test('o que não entra vira frase, nunca some em silêncio', () => {
    expect(parseObjectivesClipboard('oi', []).notes[0]).toContain('não parece')
    const torto = parseObjectivesClipboard(
      serializeObjectives([laco, { ...laco, rule: { type: 'inventado' } } as never]),
      [],
    )
    expect(torto.checks).toHaveLength(1)
    expect(torto.notes).toEqual([
      'Um objetivo não entrou: ele está incompleto ou foi feito numa versão diferente.',
    ])
    const cheia = Array.from({ length: MAX_PROJECT_CHECKS - 1 }, (_, i) => ({
      ...laco,
      id: `l${i}`,
    }))
    const resto = parseObjectivesClipboard(serializeObjectives([laco, laco]), cheia)
    expect(resto.checks).toHaveLength(1)
    expect(resto.notes[0]).toContain(`até ${MAX_PROJECT_CHECKS} objetivos`)
    const roda = (id: string): SectionProjectCheck => ({
      id,
      label: 'roda',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
      },
    })
    const oito = Array.from({ length: 8 }, (_, i) => roda(`r${i}`))
    const nono = parseObjectivesClipboard(serializeObjectives([roda('x'), laco]), oito)
    expect(nono.checks.map((check) => check.rule.type)).toEqual(['usesLoop'])
    expect(nono.notes[0]).toContain('que roda o jogo ficou de fora')
    // O teto das esperas somadas da parte (40 s) também vale ao colar.
    const longo = (id: string): SectionProjectCheck => ({
      id,
      label: 'espera',
      rule: {
        type: 'behavior',
        steps: [
          { action: 'wait', ms: 10_000 },
          { action: 'wait', ms: 5_000 },
        ],
        expect: { target: { kind: 'text' }, compare: 'truthy' },
      },
    })
    const tres = parseObjectivesClipboard(
      serializeObjectives([longo('a'), longo('b'), longo('c')]),
      [],
    )
    expect(tres.checks).toHaveLength(2)
    expect(tres.notes[0]).toContain('passariam de 40 segundos')
  })

  test('no 3D clássico, nenhum modelo que roda o jogo é oferecido', () => {
    const tresD = projectCheckAuthoring({
      initialProject: { installedExtensions: [{ id: 'game-3d' }] },
    })
    const oferecidos = templatesFor({ pro: false, kit: false, bridge: true }).filter(
      (template) => tresD.issues(checkFromTemplate(template, false).rule).length === 0,
    )
    expect(oferecidos.map((t) => t.check.rule.type).sort()).toEqual([
      'declaresVariable',
      'usesLoop',
    ])
  })
})

test('no editor: sugestão do kit, regra em JavaScript e colar', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = { version: 1, blockIds: [], projectChecks: [laco] }
  const workspace = {
    initialProject: { kind: 'pro', tree: {}, proMeta: { templateId: 'canvas-survival' } },
  }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={workspace}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const choose = async (label: string, option: string) =>
    act(async () => {
      const select = [...container.querySelectorAll<HTMLSelectElement>('select')].find(
        (item) =>
          item.id && container.querySelector(`label[for="${item.id}"]`)?.textContent === label,
      )
      if (!select) throw new Error(`sem a lista ${label}`)
      select.value = option
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  const click = async (text: string) =>
    act(async () => {
      const button = [...container.querySelectorAll('button')].find(
        (item) => item.textContent === text,
      )
      if (!button) throw new Error(`sem o botão ${text}`)
      button.click()
    })
  try {
    await act(async () => render())
    expect(container.querySelector('optgroup[label="Sugestões deste kit Pro"]')).not.toBeNull()
    await choose('Começar de um modelo', 'canvas-survival-meta')
    expect(container.textContent).toContain('A meta de fábrica é 10.')
    await click('Usar o modelo')
    const meta = value.projectChecks?.[1]
    expect(meta?.rule).toMatchObject({ expect: { target: { kind: 'game', field: 'goal' } } })
    expect(meta?.id).not.toBe('canvas-survival-meta')
    expect(isSectionCompletion(value)).toBe(true)
    // O objetivo entra aberto: dá para trocar a regra para JavaScript na hora.
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>(
        'select[aria-label="Regra do objetivo 2"]',
      )!
      select.value = 'script'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(value.projectChecks?.[1]?.rule).toMatchObject({
      type: 'script',
      code: 'return jogo.score > 0',
    })
    expect(container.textContent).toContain('o estado do kit')
    // Colar a própria lista: entram cópias com ids novos.
    await act(async () => {
      const area = container.querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Objetivos para colar"]',
      )!
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(area, serializeObjectives([laco]))
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click('Adicionar os objetivos colados')
    expect(value.projectChecks).toHaveLength(3)
    expect(new Set(value.projectChecks?.map((check) => check.id)).size).toBe(3)
    expect(container.textContent).toContain('Um objetivo colado no fim da lista.')
    // Sem permissão para a área de transferência, o texto aparece para copiar à mão.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => Promise.reject(new Error('negado')) },
    })
    await click('Copiar objetivos')
    const copiado = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Objetivos copiados"]',
    )
    expect(parseObjectivesClipboard(copiado?.value ?? '', []).checks).toHaveLength(3)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
