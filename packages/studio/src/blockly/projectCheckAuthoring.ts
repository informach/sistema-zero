import {
  EXECUTION_LIMITS,
  type ExecutionGameField,
  evaluateProjectStructure,
  executionProjectChecks,
  executionRuleBudgetMs,
  inspectLessonStudioProjectExamples,
  isExecutionRule,
  isProjectBlockPattern,
  isSectionCompletion,
  isSectionExecutionRule,
  type LessonSection,
  PROJECT_CHECK_AREAS,
  type ProjectEntryReport,
  type ProjectFieldRange,
  type ProjectObjectiveVerdictRow,
  projectEntryReport,
  resolveStudioSectionExamples,
  type SectionExecutionRule,
  type SectionJavaScriptProjectCheck,
  type SectionObjectiveRule,
  type SectionStructureRule,
  sectionCompletionIssues,
  summarizeSectionObjectives,
} from '@sistemazero/core/learning'
import { studioProTemplate } from '@sistemazero/core/studio/pro-templates'
import { isBlockTypeAllowed, MAX_BLOCK_LEVEL, normalizeBlockLevel } from '../core/levels'
import { isHTMLBlockChildAllowed } from '../html/catalog'
import { sceneNamesAsText } from '../official-extensions/scene-2d/catalog'
import { SERVER_BLOCK_CATALOG, type ServerBlockCatalogEntry } from './blockCatalog'
import { contextsGrantedByBodyContext, effectiveBodyExecution } from './blockContracts'
import type { StatementContext } from './blocks/types'
import { codeIdeasPass, projectCodeIdeas } from './codeIdeas'

type Area = keyof typeof PROJECT_CHECK_AREAS
type Rule = Extract<SectionStructureRule, { type: 'usesBlock' }>
const valueBlockTypes = new Set(
  SERVER_BLOCK_CATALOG.filter((block) => block.connections.output !== undefined).map(
    (block) => block.type,
  ),
)

/**
 * O avaliador lê literais de texto e número. Os blocos-lista de nome (cenário e pista
 * das extensões de jogo 2D) são texto para o programa, então entram na conferência
 * como o texto que guardam. Sem isso, uma regra "usou este cenário, com este nome"
 * reprovaria justamente quem escolheu o nome na lista.
 */
function readableProject(project: unknown): unknown {
  if (typeof project !== 'object' || project === null || !('blocksState' in project)) return project
  const known = readableProjects.get(project)
  if (known) return known
  const blocksState = sceneNamesAsText(project.blocksState)
  const readable = blocksState === project.blocksState ? project : { ...project, blocksState }
  readableProjects.set(project, readable)
  return readable
}
// Uma aula confere o MESMO projeto contra várias regras: a varredura (e a cópia,
// quando há bloco-lista) acontece uma vez por projeto, e não uma vez por regra.
const readableProjects = new WeakMap<object, unknown>()

/**
 * Uma regra contra um projeto, com a régua do Estúdio: os blocos pela IR e, para as ideias de
 * programação (laço, variável, função, chamada), também o CÓDIGO (etapa 2, 18/10/2026). É o que
 * faz o objetivo valer no Pro (que não tem IR) e no código digitado na Ponte (`rawJS`).
 *
 * `baseline` é o projeto INICIAL da autora: no código, só conta o que a criança acrescentou. Sem
 * ele, um modelo Pro (que já traz laços e funções) cumpriria o objetivo antes de qualquer gesto.
 */
export function evaluateStudioProjectStructure(
  rule: SectionObjectiveRule,
  project: unknown,
  baseline?: unknown,
) {
  // O que o jogo FAZ não se lê na estrutura: quem responde é o executor (`executed`, abaixo).
  if (isExecutionRule(rule)) return false
  if (
    rule.type !== 'usesBlock' &&
    codeIdeasPass(
      rule,
      projectCodeIdeas(project),
      baseline === undefined ? undefined : projectCodeIdeas(baseline),
    )
  )
    return true
  return evaluateProjectStructure(rule, readableProject(project), valueBlockTypes)
}
type ObjectiveCheck = { id: string; rule: SectionObjectiveRule; optional?: true }

export function evaluateStudioSectionProject(
  checks: readonly (ObjectiveCheck & { label: string })[],
  project: unknown,
  baseline?: unknown,
) {
  return checks.map((check) => ({
    checkId: check.id,
    label: check.label,
    passed: evaluateStudioProjectStructure(check.rule, project, baseline),
  }))
}
/**
 * A verificação de uma parte ("Verificar esta parte"), com a régua do Estúdio. Os objetivos de
 * EXECUÇÃO chegam prontos em `executed` (o resultado do `studio-runtime`): sem ele, não passam.
 */
export function evaluateStudioSectionObjectives(
  checks: readonly ObjectiveCheck[],
  project: unknown,
  baseline?: unknown,
  executed?: ReadonlyMap<string, boolean>,
) {
  return summarizeSectionObjectives(
    checks.map((check) => ({
      checkId: check.id,
      passed: isExecutionRule(check.rule)
        ? executed?.get(check.id) === true
        : evaluateStudioProjectStructure(check.rule, project, baseline),
      optional: Boolean(check.optional),
    })),
  )
}

/** Perfis 3D usam o Three oficial empacotado no executor; não são sprites 2D. */
const CLASSIC_3D_EXTENSIONS = new Set(['game-3d', 'world-3d', 'game-3d-advanced'])
const THREE_IMPORT = /\bfrom\s*['"]three(?:\/[^'"]*)?['"]|\bimport\s*\(\s*['"]three/

/**
 * Onde um objetivo de EXECUÇÃO vale (etapa 3, 18/10/2026): a régua de autoria, no mesmo lugar da
 * de estrutura, para o Admin avisar e a publicação recusar com a mesma frase.
 */
function executionIssues(
  rule: SectionExecutionRule,
  project: Record<string, unknown>,
  extensions: ReadonlySet<string>,
  modes: readonly string[],
): string[] {
  if (!isSectionExecutionRule(rule)) return ['O objetivo tem passos, valores ou casos inválidos.']
  const pro = project.kind === 'pro'
  const proMeta = record(project.proMeta) ? project.proMeta : {}
  const template = pro ? studioProTemplate(proMeta.templateId) : undefined
  const files = record(project.files) ? project.files : {}
  const classic3d =
    !pro &&
    ([...extensions].some((id) => CLASSIC_3D_EXTENSIONS.has(id)) ||
      THREE_IMPORT.test(typeof files['script.js'] === 'string' ? files['script.js'] : ''))
  const errors: string[] = []
  if (rule.type === 'behavior' || rule.type === 'script') {
    if (
      (rule.steps.some(
        (step) => step.action === 'clickTarget' || step.action === 'approachSprite',
      ) ||
        (rule.type === 'behavior' && rule.expect.target.kind === 'spritePosition')) &&
      ((project.kind !== undefined && project.kind !== 'classic') ||
        classic3d ||
        (project.programmingLanguage !== undefined &&
          project.programmingLanguage !== 'javascript') ||
        !extensions.has('game-2d'))
    )
      errors.push(
        rule.type === 'behavior' && rule.expect.target.kind === 'spritePosition'
          ? 'Movimento de sprite só vale no Jogo 2D clássico JavaScript.'
          : 'Interações com sprites só valem no Jogo 2D clássico JavaScript.',
      )
    const outside = rule.steps.some(
      (step) =>
        step.action === 'click' &&
        (step.x >= CHECK_VIEWPORT.width || step.y >= CHECK_VIEWPORT.height),
    )
    if (outside)
      errors.push(
        `O teste abre o jogo numa tela de ${CHECK_VIEWPORT.width} por ${CHECK_VIEWPORT.height}: o clique precisa caber nela.`,
      )
  }
  if (rule.type === 'script') {
    if (!pro && modes.length > 0 && !modes.includes('bridge'))
      errors.push('A regra em JavaScript vale na Ponte e no Pro.')
    const syntax = scriptSyntaxError(rule.code)
    if (syntax) errors.push(`A regra em JavaScript tem um erro de escrita: ${syntax}`)
  }
  if (rule.type === 'behavior') {
    for (const expectation of [
      rule.expect,
      ...(rule.checkpoints ?? []).map((point) => point.expect),
    ]) {
      const target = expectation.target
      if (target.kind === 'moduleValue' && !pro)
        errors.push('Valores exportados por arquivo só valem no projeto Pro.')
      if (target.kind === 'value' && pro)
        errors.push(
          'No projeto Pro, confira um valor exportado, o texto da página, o console ou o estado do kit.',
        )
      if (target.kind === 'game' && !template?.kitVersion)
        errors.push('O estado do jogo (fase, pontos, meta, vida) só existe nos kits Pro.')
      else if (target.kind === 'game' && !kitStateFields(template?.id).includes(target.field))
        errors.push(
          'Este kit Pro não mostra a vida do jogador: confira a fase, os pontos ou a meta.',
        )
    }
  }
  if (rule.type === 'functionReturns') {
    if (pro && !rule.module)
      errors.push(
        'No projeto Pro, diga em que arquivo a função está (por exemplo src/regras.ts). Ela precisa ser exportada.',
      )
    if (!pro && rule.module) errors.push('O arquivo da função só vale no projeto Pro.')
    if (!pro && modes.length > 0 && !modes.includes('bridge'))
      errors.push(
        'A função responde certo precisa da Ponte (para a criança escrever a função) ou de um projeto Pro.',
      )
  }
  return errors
}
/**
 * O que o `inspect()` de cada kit Pro mostra (conferido nos kits, 18/10/2026): fase, pontos e meta
 * em todos; a vida só no kit que a mostra no estado do jogo.
 */
const KITS_WITH_HEALTH = new Set(['canvas-survival'])
export function kitStateFields(templateId: unknown): readonly ExecutionGameField[] {
  if (!studioProTemplate(templateId)?.kitVersion) return []
  return typeof templateId === 'string' && KITS_WITH_HEALTH.has(templateId)
    ? ['phase', 'score', 'goal', 'health']
    : ['phase', 'score', 'goal']
}

/** A tela do navegador do teste (o `check-objectives.mjs` do studio-runtime). */
export const CHECK_VIEWPORT = { width: 1024, height: 640 } as const

/**
 * Confere a escrita da regra sem rodá-la (compilar um corpo de função assíncrona não executa
 * nada). Onde o ambiente proíbe compilar código (CSP sem `unsafe-eval`), a conferência fica para o
 * "Testar agora": não acusa o que não pôde olhar.
 */
function scriptSyntaxError(code: string): string | null {
  try {
    const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
      ...args: string[]
    ) => unknown
    new AsyncFunction('jogo', 'texto', 'console', code)
    return null
  } catch (error) {
    if (error instanceof SyntaxError) return error.message
    return null
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const compatible = (a: string[] | null, b: string[] | null) =>
  a === null || b === null || a.some((check) => b.includes(check))

/** The interval must contain a value the real Blockly number field can represent. */
function possibleFieldRange(
  range: ProjectFieldRange,
  parameter: ServerBlockCatalogEntry['parameters'][number],
): boolean {
  const lower = Math.max(range.min ?? -Infinity, parameter.min ?? -Infinity)
  const upper = Math.min(range.max ?? Infinity, parameter.max ?? Infinity)
  const lowerOpen = range.min === lower && range.minExclusive === true
  const upperOpen = range.max === upper && range.maxExclusive === true
  if (lower > upper || (lower === upper && (lowerOpen || upperOpen))) return false
  const precision = parameter.precision
  if (!precision || precision < 0) return true
  const step = (bound: number, lowerBound: boolean, open: boolean) => {
    const quotient = bound / precision
    const rounded = Math.round(quotient)
    if (Number.isFinite(quotient) && Math.abs(quotient - rounded) < 1e-8)
      return rounded + (open ? (lowerBound ? 1 : -1) : 0)
    return lowerBound ? Math.ceil(quotient) : Math.floor(quotient)
  }
  return step(lower, true, lowerOpen) <= step(upper, false, upperOpen)
}

const namedInputsCache = new WeakMap<
  ServerBlockCatalogEntry,
  ServerBlockCatalogEntry['connections']['children']
>()
/** Named sockets, including the bounded sockets created by Blockly's mutators. */
export function projectCheckInputs(block: ServerBlockCatalogEntry) {
  const cached = namedInputsCache.get(block)
  if (cached) return cached
  const inputs = [...block.connections.children]
  if (block.type === 'sz_js_if_else') {
    const condition = inputs.find((input) => input.name === 'COND')
    const body = inputs.find((input) => input.name === 'THEN')
    if (condition && body) {
      inputs.push({ ...body, name: 'ELSE' })
      for (let i = 0; i < 20; i++)
        inputs.push({ ...condition, name: `ELSEIF_COND${i}` }, { ...body, name: `ELSEIF_THEN${i}` })
    }
  }
  if (block.type === 'sz_val_join')
    for (let i = 0; i < 32; i++)
      inputs.push({ name: `ITEM${i}`, kind: 'value', checks: ['JSValue'] })
  namedInputsCache.set(block, inputs)
  return inputs
}

function bodyContexts(block: ServerBlockCatalogEntry): Set<StatementContext> {
  const contexts = new Set<StatementContext>(['statement'])
  const { contract } = block
  for (const granted of contextsGrantedByBodyContext(contract.bodyContext)) contexts.add(granted)
  if (contract.placement?.role === 'event') contexts.add('event-body')
  if (contract.userGesture) contexts.add('user-gesture-body')
  if (contract.placement?.role === 'loop') contexts.add('loop-body')
  if (
    [
      'sz_js_repeat',
      'sz_js_while',
      'sz_js_do_while',
      'sz_js_for_of',
      'sz_js_for_range',
      'sz_js_for_each',
    ].includes(block.type)
  ) {
    contexts.add('loop-body')
    contexts.add('syntactic-loop-body')
  }
  if (contract.bodyExecution === 'function' || contract.bodyExecution === 'sync-callback')
    contexts.add('function-body')
  if (['sz_js_function_async', 'sz_js_class_method_async'].includes(block.type))
    contexts.add('async-function-body')
  if (block.type === 'sz_js_constructor') {
    contexts.add('constructor-body')
    contexts.add('derived-constructor-body')
  }
  if (block.type.startsWith('sz_js_class_method')) contexts.add('derived-method-body')
  if (block.type === 'sz_js_class') contexts.add('class-member')
  return contexts
}

/** Server-safe authoring model: JSON contracts only, without the Blockly/React runtime. */
export function projectCheckAuthoring(workspace: unknown) {
  const config = record(workspace) ? workspace : {}
  const project = record(config.initialProject) ? config.initialProject : {}
  const extensions = new Set(
    Array.isArray(project.installedExtensions)
      ? project.installedExtensions.flatMap((entry) =>
          record(entry) && typeof entry.id === 'string' ? [entry.id] : [],
        )
      : [],
  )
  const modes = strings(config.allowedModes)
  const blocksEnabled =
    project.kind !== 'pro' &&
    (!modes.length || modes.some((mode) => mode === 'blocks' || mode === 'bridge'))
  const profile = {
    level:
      normalizeBlockLevel(typeof config.level === 'string' ? config.level : undefined) ??
      MAX_BLOCK_LEVEL,
    revealed: config.allowLevelReveal !== false,
    allowBlocks: strings(config.allowBlocks),
  }
  const available = blocksEnabled
    ? SERVER_BLOCK_CATALOG.filter(
        (block) =>
          (!block.extension || extensions.has(block.extension)) &&
          (block.contract.domain === 'frame' ||
            isBlockTypeAllowed(block.type, block.level, profile)),
      )
    : []
  const byType = new Map(available.map((block) => [block.type, block]))
  const childrenCache = new Map<string, ServerBlockCatalogEntry[]>()
  function children(parent: ServerBlockCatalogEntry) {
    let found = childrenCache.get(parent.type)
    if (!found) {
      found = available.filter((child) =>
        projectCheckInputs(parent).some((input) => {
          const connector =
            input.kind === 'value' ? child.connections.output : child.connections.previous
          return (
            connector !== undefined &&
            compatible(input.checks, connector) &&
            (child.contract.domain !== 'html' || isHTMLBlockChildAllowed(parent.type, child.type))
          )
        }),
      )
      childrenCache.set(parent.type, found)
    }
    return found
  }
  function nextContexts(block: ServerBlockCatalogEntry, contexts: Set<StatementContext>) {
    const local = bodyContexts(block),
      next = new Set(local)
    const execution = effectiveBodyExecution(block.contract)
    for (const context of contexts)
      if (execution === 'structural' || context === 'event-body' || context === 'function-body')
        next.add(context)
    return { local, next }
  }
  function fits(
    parent: ServerBlockCatalogEntry,
    child: ServerBlockCatalogEntry,
    area: Area,
    local: Set<StatementContext>,
    next: Set<StatementContext>,
  ) {
    const placement = child.contract.domain === 'behavior' ? child.placement : null
    if (!placement) return true
    if (parent.contract.domain === 'frame') return placement.root.some((root) => root === area)
    const eligible = placement.directNested || placement.role === 'event' ? local : next
    return (
      !placement.forbiddenNested?.some((context) => next.has(context)) &&
      !placement.forbiddenDirectNested?.some((context) => local.has(context)) &&
      placement.nested.some((context) => eligible.has(context))
    )
  }
  const reachCache = new Map<string, boolean>()
  let parents: Map<string, Set<string>> | undefined
  const ancestorsCache = new Map<string, Set<string>>()
  function potentialAncestors(type: string): Set<string> {
    const cached = ancestorsCache.get(type)
    if (cached) return cached
    if (!parents) {
      parents = new Map()
      for (const parent of available) {
        if (!projectCheckInputs(parent).length) continue
        for (const child of children(parent)) {
          const owners = parents.get(child.type) ?? new Set<string>()
          owners.add(parent.type)
          parents.set(child.type, owners)
        }
      }
    }
    const ancestors = new Set<string>([type])
    for (const candidate of ancestors)
      for (const parent of parents.get(candidate) ?? []) ancestors.add(parent)
    ancestorsCache.set(type, ancestors)
    return ancestors
  }
  function reachable(type: string, area: Area, within?: string): boolean {
    const key = `${type}:${area}:${within ?? ''}`
    const cached = reachCache.get(key)
    if (cached !== undefined) return cached
    const frame = byType.get(`sz_frame_${area}`)
    if (!frame || !byType.has(type) || (within && !byType.has(within))) return false
    const targetAncestors = potentialAncestors(type)
    const pathAncestors = within ? potentialAncestors(within) : targetAncestors
    if (!pathAncestors.has(frame.type) || (within && !targetAncestors.has(within))) return false
    const queue = [{ block: frame, contexts: new Set<StatementContext>(), inside: false }]
    const visited = new Set<string>()
    for (let index = 0; index < queue.length; index++) {
      const state = queue[index]
      if (!state) continue
      const { block, contexts, inside } = state
      if (block.type === type && (!within || inside)) {
        reachCache.set(key, true)
        return true
      }
      if (!projectCheckInputs(block).length) continue
      const { local, next } = nextContexts(block, contexts)
      const nextInside = inside || block.type === within
      for (const child of children(block)) {
        if (!(nextInside ? targetAncestors : pathAncestors).has(child.type)) continue
        if (!fits(block, child, area, local, next)) continue
        if (child.type === type && (!within || nextInside)) {
          reachCache.set(key, true)
          return true
        }
        const childKey = `${child.type}:${[...next].sort().join(',')}:${nextInside}`
        if (visited.has(childKey)) continue
        visited.add(childKey)
        queue.push({ block: child, contexts: next, inside: nextInside })
      }
    }
    reachCache.set(key, false)
    return false
  }
  const areas = (rule: Rule): Area[] =>
    (Object.keys(PROJECT_CHECK_AREAS) as Area[]).filter((area) =>
      reachable(rule.blockType, area, rule.withinBlock),
    )
  const suggestions = new Map<string, Map<Area, Set<string>>>()
  function containers(rule: Rule) {
    let byArea = suggestions.get(rule.blockType)
    if (!byArea) {
      byArea = new Map()
      const possible = potentialAncestors(rule.blockType)
      for (const area of Object.keys(PROJECT_CHECK_AREAS) as Area[]) {
        const frame = byType.get(`sz_frame_${area}`)
        if (!frame || !possible.has(frame.type)) continue
        const found = new Set<string>()
        // Offer containers with a concrete shortest witness. Publication still
        // validates arbitrary deeper nesting, including imported criteria.
        const queue = [{ block: frame, contexts: new Set<StatementContext>() }]
        const visited = new Set<string>([frame.type])
        for (let index = 0; index < queue.length; index++) {
          const state = queue[index]
          if (!state) continue
          const { local, next } = nextContexts(state.block, state.contexts)
          for (const child of children(state.block)) {
            if (!possible.has(child.type) || !fits(state.block, child, area, local, next)) continue
            if (child.type === rule.blockType && state.block.contract.domain !== 'frame')
              found.add(state.block.type)
            if (visited.has(child.type) || !projectCheckInputs(child).length) continue
            visited.add(child.type)
            queue.push({ block: child, contexts: next })
          }
        }
        byArea.set(area, found)
      }
      suggestions.set(rule.blockType, byArea)
    }
    return available.filter((block) =>
      [...byArea].some(([area, ids]) => (!rule.area || rule.area === area) && ids.has(block.type)),
    )
  }
  function issues(rule: SectionObjectiveRule): string[] {
    if (isExecutionRule(rule)) return executionIssues(rule, project, extensions, modes)
    // Etapa 2 (18/10/2026): as ideias de programação também são lidas no CÓDIGO. No Pro elas
    // sempre valem (e "usar um bloco" nunca: não há blocos); com a Ponte a criança pode digitá-las.
    if (project.kind === 'pro')
      return rule.type === 'usesBlock'
        ? ['Projeto Pro não tem blocos: escolha uma ideia de programação (laço, variável, função).']
        : []
    if (!blocksEnabled) return ['Este objetivo precisa de um projeto com modo Blocos ou Ponte.']
    if (rule.type !== 'usesBlock' && (!modes.length || modes.includes('bridge'))) return []
    if (rule.type !== 'usesBlock') {
      const candidates = {
        usesLoop: [
          'sz_js_repeat',
          'sz_js_while',
          'sz_js_do_while',
          'sz_js_for_of',
          'sz_js_for_range',
          'sz_js_for_each',
        ],
        declaresVariable: [
          'sz_js_var_declare',
          'sz_js_var_create',
          'sz_js_new_var',
          'sz_t3d_new_var',
        ],
        definesFunction: ['sz_js_function', 'sz_js_function_async'],
        callsFunction: ['sz_js_call_function', 'sz_val_call_function'],
      }[rule.type]
      return candidates.some(
        (blockType) => byType.has(blockType) && areas({ type: 'usesBlock', blockType }).length,
      )
        ? []
        : ['Disponibilize um bloco que permita cumprir este objetivo no Estúdio da seção.']
    }
    if (!isProjectBlockPattern(rule))
      return ['O objetivo tem encaixes inválidos ou profundidade excessiva.']
    const block = byType.get(rule.blockType)
    if (!block)
      return [
        'O bloco do objetivo não está disponível neste Estúdio. Confira a lista de blocos, o nível e as extensões instaladas.',
      ]
    const validAreas = areas(rule)
    const errors: string[] = []
    if (
      rule.count !== undefined &&
      (!Number.isInteger(rule.count) || rule.count < 0 || rule.count > 200_000)
    )
      errors.push('A quantidade precisa ser um número inteiro entre zero e 200000.')
    if (rule.beforeBlock) {
      const following = byType.get(rule.beforeBlock)
      if (
        !following ||
        block.connections.previous === undefined ||
        following.connections.previous === undefined ||
        !compatible(block.connections.previous, following.connections.previous) ||
        !areas({ type: 'usesBlock', blockType: following.type }).some(
          (area) => validAreas.includes(area) && (!rule.area || area === rule.area),
        )
      )
        errors.push('A ordem precisa comparar dois comandos compatíveis na mesma sequência.')
    }
    if (rule.beforePattern) {
      const following = byType.get(rule.beforePattern.blockType)
      if (
        !following ||
        block.connections.previous === undefined ||
        following.connections.previous === undefined ||
        !compatible(block.connections.previous, following.connections.previous) ||
        !areas({ type: 'usesBlock', blockType: following.type }).some(
          (area) => validAreas.includes(area) && (!rule.area || area === rule.area),
        )
      )
        errors.push('A ordem precisa comparar dois comandos compatíveis na mesma sequência.')
      else
        errors.push(
          ...issues({
            type: 'usesBlock',
            ...rule.beforePattern,
            area: rule.area,
            withinBlock: rule.withinBlock,
          }).map((error) => `Comando posterior: ${error}`),
        )
    }
    if (!validAreas.length || (rule.area && !validAreas.includes(rule.area)))
      errors.push(
        'O bloco não pode ser encaixado na área ou no contêiner escolhido com os blocos disponíveis nesta aula.',
      )
    for (const kind of ['fields', 'inputs'] as const)
      for (const [name, value] of [
        ...Object.entries(rule[kind] ?? {}),
        ...(kind === 'fields'
          ? Object.entries(rule.fieldOptions ?? {}).flatMap(([name, values]) =>
              values.map((value) => [name, value] as const),
            )
          : []),
        ...(kind === 'fields'
          ? (rule.fieldAlternatives ?? []).flatMap((alternative) => Object.entries(alternative))
          : []),
      ]) {
        const parameter = block.parameters.find(
          (param) => param.kind === kind && param.name === name,
        )
        let valid = Boolean(parameter)
        if (parameter) {
          if (parameter.options?.length)
            valid = parameter.options.some(([, option]) => option === String(value))
          if (parameter.numeric)
            valid =
              typeof value === 'number' &&
              Number.isFinite(value) &&
              (parameter.min === undefined || value >= parameter.min) &&
              (parameter.max === undefined || value <= parameter.max) &&
              (!parameter.precision ||
                Math.abs(value / parameter.precision - Math.round(value / parameter.precision)) <
                  1e-8)
          if (kind === 'inputs') {
            const literalType =
              typeof value === 'number'
                ? 'sz_val_number'
                : typeof value === 'boolean'
                  ? 'sz_val_bool'
                  : 'sz_val_text'
            const literal = SERVER_BLOCK_CATALOG.find((entry) => entry.type === literalType)
            valid =
              valid &&
              Boolean(
                literal &&
                  literal.connections.output !== undefined &&
                  compatible(parameter.checks ?? null, literal.connections.output),
              )
          }
        }
        if (!valid) errors.push(`O parâmetro ${name} não existe ou não aceita o valor configurado.`)
      }
    for (const [name, range] of Object.entries(rule.fieldRanges ?? {})) {
      const parameter = block.parameters.find(
        (param) => param.kind === 'fields' && param.name === name,
      )
      if (!parameter?.numeric || !possibleFieldRange(range, parameter))
        errors.push(
          `O campo ${name} não é numérico ou o intervalo não aceita nenhum valor deste bloco.`,
        )
    }
    for (const name of Object.keys(rule.fieldText ?? {})) {
      if (
        !block.parameters.some(
          (param) => param.kind === 'fields' && param.name === name && param.textual,
        )
      )
        errors.push(`O campo ${name} não aceita texto livre neste bloco.`)
    }
    for (const [name, pattern] of [
      ...Object.entries(rule.inputBlocks ?? {}),
      ...Object.entries(rule.inputBlocksAll ?? {}).flatMap(([name, patterns]) =>
        patterns.map((pattern) => [name, pattern] as const),
      ),
    ]) {
      const socket = projectCheckInputs(block).find((input) => input.name === name)
      const child = byType.get(pattern.blockType)
      const connector =
        socket?.kind === 'value' ? child?.connections.output : child?.connections.previous
      if (!socket || !child || connector === undefined || !compatible(socket.checks, connector))
        errors.push(`O encaixe ${name} não aceita o bloco escolhido neste Estúdio.`)
      else
        errors.push(
          ...issues({
            type: 'usesBlock',
            ...pattern,
            area: rule.area,
            withinBlock: block.type,
          }).map((error) => `${name}: ${error}`),
        )
    }
    return errors
  }
  return { available, areas, issues, containers, inputs: projectCheckInputs }
}

export function studioSectionCompletionReview(
  sections: LessonSection[],
  blocks: { id: string; content: unknown }[],
) {
  const examples = inspectLessonStudioProjectExamples(sections, blocks)
  const entryReports: {
    sectionId: string
    initial: ProjectEntryReport
    checkpoint: ProjectEntryReport | null
  }[] = []
  if (examples.issues.length) return { issues: examples.issues, entryReports }
  const issues = [
    ...sectionCompletionIssues(sections, blocks),
    ...sections.flatMap((section) => {
      if (!isSectionCompletion(section.completion)) return []
      const workspace = blocks.find((block) => block.id === section.workspaceBlockId)
      const checks = section.completion?.projectChecks ?? []
      if (!workspace || !checks.length) return []
      const authoring = projectCheckAuthoring(workspace.content)
      const ruleIssues = checks.flatMap((check) =>
        check.programmingLanguage === 'python'
          ? []
          : authoring
              .issues(check.rule)
              .map((message) => ({ sectionId: section.id, message: `${check.label}: ${message}` })),
      )
      if (ruleIssues.length) return ruleIssues
      const budget = executionProjectChecks(checks).reduce(
        (sum, check) => sum + executionRuleBudgetMs(check.rule as SectionExecutionRule),
        0,
      )
      if (budget > EXECUTION_LIMITS.maxSectionWaitMs)
        return [
          {
            sectionId: section.id,
            message: `Os objetivos que rodam o jogo desta parte esperam ${Math.ceil(budget / 1000)} segundos somados; o teste aceita até ${EXECUTION_LIMITS.maxSectionWaitMs / 1000}. Encurte as esperas ou tire casos.`,
          },
        ]
      const content = record(workspace.content) ? workspace.content : {}
      const initial = content.initialProject
      const resolved = resolveStudioSectionExamples(
        examples.registries.get(workspace.id),
        section.id,
      )
      if (resolved.kind === 'invalid')
        return resolved.issues.map((issue) => ({ sectionId: section.id, message: issue.message }))
      const solution = resolved.kind === 'resolved' ? resolved.solution : undefined
      const checkpoint = resolved.kind === 'resolved' ? resolved.entry : undefined
      const nameOf = (id: string) => checks.find((check) => check.id === id)?.label ?? id
      // Inicial e gabarito são conferidos aqui só na ESTRUTURA; a execução é do "Testar agora".
      const structural = checks.filter(
        (check): check is SectionJavaScriptProjectCheck =>
          check.programmingLanguage !== 'python' && !isExecutionRule(check.rule),
      )
      const syncing = (project: unknown) => record(project) && project.bridgeCodeAhead === true
      const entryReport = (project: unknown) => {
        const results =
          project === undefined || syncing(project)
            ? []
            : evaluateStudioSectionObjectives(
                structural.filter((check) => !syncing(initial) || check.rule.type === 'usesBlock'),
                project,
                initial,
              ).results
        return projectEntryReport(
          checks.map<ProjectObjectiveVerdictRow>((check) => ({
            id: check.id,
            optional: Boolean(check.optional),
            verdict:
              syncing(project) || (syncing(initial) && check.rule.type !== 'usesBlock')
                ? 'inconclusive'
                : check.programmingLanguage === 'python' || isExecutionRule(check.rule)
                  ? 'pending'
                  : project === undefined
                    ? 'inconclusive'
                    : (results.find((result) => result.checkId === check.id)?.passed ??
                      'inconclusive'),
          })),
        )
      }
      entryReports.push({
        sectionId: section.id,
        initial: entryReport(initial),
        checkpoint: checkpoint === undefined ? null : entryReport(checkpoint),
      })
      if (syncing(solution))
        return [
          {
            sectionId: section.id,
            message:
              'A solução desta parte ainda está sincronizando o código e os blocos. Aguarde a sincronização e guarde um snapshot atualizado antes de publicar.',
          },
        ]
      if (
        solution !== undefined &&
        syncing(initial) &&
        structural.some((check) => !check.optional && check.rule.type !== 'usesBlock')
      )
        return [
          {
            sectionId: section.id,
            message:
              'O projeto inicial ainda está sincronizando. Aguarde antes de comparar as ideias da solução com a base da aula.',
          },
        ]
      // Prepared prerequisites are legitimate. An all-true aggregate is an authoring warning,
      // never a claim that video, quiz, delivery or the whole part is already complete.
      if (
        executionProjectChecks(checks.filter((check) => !check.optional)).length &&
        solution === undefined
      )
        return [
          {
            sectionId: section.id,
            message:
              'Objetivos obrigatórios que rodam o jogo precisam de uma solução desta parte. Prepare a solução na parte e use "Testar agora".',
          },
        ]
      // O gabarito da professora precisa cumprir o que a parte exige: um objetivo obrigatório que
      // nem o gabarito cumpre é um objetivo que a criança não consegue cumprir.
      if (solution === undefined) return []
      const { results } = evaluateStudioSectionObjectives(structural, solution, initial)
      return [
        ...results
          .filter((result) => !result.optional && !result.passed)
          .map((result) => ({
            sectionId: section.id,
            message: `O gabarito não cumpre o objetivo obrigatório "${nameOf(
              result.checkId,
            )}". Ajuste o gabarito ou o objetivo.`,
          })),
      ]
    }),
  ]
  return { issues, entryReports }
}

export function studioSectionCompletionIssues(
  sections: LessonSection[],
  blocks: { id: string; content: unknown }[],
) {
  return studioSectionCompletionReview(sections, blocks).issues
}
