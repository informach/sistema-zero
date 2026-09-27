import {
  evaluateProjectStructure,
  evaluateSectionProject,
  isProjectBlockPattern,
  isSectionCompletion,
  type LessonSection,
  PROJECT_CHECK_AREAS,
  type SectionStructureRule,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { isBlockTypeAllowed, MAX_BLOCK_LEVEL, normalizeBlockLevel } from '../core/levels'
import { isHTMLBlockChildAllowed } from '../html/catalog'
import { SERVER_BLOCK_CATALOG, type ServerBlockCatalogEntry } from './blockCatalog'
import { effectiveBodyExecution } from './blockContracts'
import type { StatementContext } from './blocks/types'

type Area = keyof typeof PROJECT_CHECK_AREAS
type Rule = Extract<SectionStructureRule, { type: 'usesBlock' }>
const valueBlockTypes = new Set(
  SERVER_BLOCK_CATALOG.filter((block) => block.connections.output !== undefined).map(
    (block) => block.type,
  ),
)

export function evaluateStudioProjectStructure(rule: SectionStructureRule, project: unknown) {
  return evaluateProjectStructure(rule, project, valueBlockTypes)
}
export function evaluateStudioSectionProject(
  checks: Parameters<typeof evaluateSectionProject>[0],
  project: unknown,
) {
  return evaluateSectionProject(checks, project, valueBlockTypes)
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const compatible = (a: string[] | null, b: string[] | null) =>
  a === null || b === null || a.some((check) => b.includes(check))

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
  if (contract.bodyContext) contexts.add(contract.bodyContext)
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
  function issues(rule: SectionStructureRule): string[] {
    if (!blocksEnabled) return ['Este objetivo precisa de um projeto com modo Blocos ou Ponte.']
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
    if (!validAreas.length || (rule.area && !validAreas.includes(rule.area)))
      errors.push(
        'O bloco não pode ser encaixado na área ou no contêiner escolhido com os blocos disponíveis nesta aula.',
      )
    for (const kind of ['fields', 'inputs'] as const)
      for (const [name, value] of Object.entries(rule[kind] ?? {})) {
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
    for (const [name, pattern] of Object.entries(rule.inputBlocks ?? {})) {
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

export function studioSectionCompletionIssues(
  sections: LessonSection[],
  blocks: { id: string; content: unknown }[],
) {
  return [
    ...sectionCompletionIssues(sections, blocks),
    ...sections.flatMap((section) => {
      if (!isSectionCompletion(section.completion)) return []
      const workspace = blocks.find((block) => block.id === section.workspaceBlockId)
      const checks = section.completion?.projectChecks ?? []
      if (!workspace || !checks.length) return []
      const authoring = projectCheckAuthoring(workspace.content)
      return checks.flatMap((check) =>
        authoring
          .issues(check.rule)
          .map((message) => ({ sectionId: section.id, message: `${check.label}: ${message}` })),
      )
    }),
  ]
}
