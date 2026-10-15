import {
  artifactSchema,
  type Capability,
  type CompiledWorkflow,
  canonical,
  compiledWorkflowSchema,
  orderGraph,
  type WorkflowNode,
  workflowDocumentSchema,
} from '@sistemazero/agent-core'
import { SchemaValidator } from '@sistemazero/agent-integrations/mcp'
import { z } from 'zod'
import { hash } from '../tools/paths'
import { referencePath, references } from './expressions'

type JsonSchema = Record<string, unknown>
function dereference(schema: JsonSchema, root: JsonSchema, depth = 0): JsonSchema {
  if (depth > 20) throw new Error('Recursive schema cannot be used as a workflow field reference')
  if (typeof schema.$ref !== 'string') return schema
  if (!schema.$ref.startsWith('#/'))
    throw new Error('Only local JSON Schema references are supported')
  let target: unknown = root
  for (const part of schema.$ref.slice(2).split('/')) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~')
    if (!target || typeof target !== 'object' || !Object.hasOwn(target, key))
      throw new Error('Unknown local schema reference')
    target = Reflect.get(target, key)
  }
  return dereference(z.record(z.string(), z.unknown()).parse(target), root, depth + 1)
}
function field(schema: JsonSchema, path: string[], root: JsonSchema = schema): JsonSchema {
  const current = dereference(schema, root)
  const [head, ...rest] = path
  if (head === undefined) return current
  if (current.type === 'array' && /^\d+$/.test(head))
    return field(z.record(z.string(), z.unknown()).parse(current.items), rest, root)
  const properties = z.record(z.string(), z.unknown()).parse(current.properties ?? {})
  const value = properties[head]
  if (value === undefined)
    throw new Error(`Reference field is absent from its declared schema: ${path.join('.')}`)
  return field(z.record(z.string(), z.unknown()).parse(value), rest, root)
}
function types(schema: JsonSchema): Set<string> {
  if (typeof schema.type === 'string') return new Set([schema.type])
  if (Array.isArray(schema.type))
    return new Set(schema.type.filter((item): item is string => typeof item === 'string'))
  const alternatives = schema.anyOf ?? schema.oneOf
  if (Array.isArray(alternatives))
    return new Set(
      alternatives.flatMap((item) => [...types(z.record(z.string(), z.unknown()).parse(item))]),
    )
  return new Set()
}
function compatible(source: JsonSchema, target: JsonSchema) {
  const from = types(source),
    to = types(target)
  if (
    from.size &&
    to.size &&
    [...from].some((kind) => !to.has(kind) && !(kind === 'integer' && to.has('number')))
  )
    throw new Error('Workflow reference type does not fit its destination')
}
export function nodeOutput(node: WorkflowNode): JsonSchema {
  if (node.kind === 'capability' || node.kind === 'agent') return node.outputSchema
  if (node.kind === 'condition') return { type: 'boolean' }
  if (node.kind === 'foreach')
    return { type: 'array', items: node.itemOutputSchema, maxItems: node.maxItems }
  return {
    type: 'object',
    properties: { completedAt: { type: 'string' } },
    required: ['completedAt'],
    additionalProperties: false,
  }
}
export class WorkflowCompiler {
  readonly validator = new SchemaValidator()
  constructor(private capabilities: () => Capability[]) {}
  async compile(raw: unknown): Promise<CompiledWorkflow> {
    if (Buffer.byteLength(JSON.stringify(raw)) > 256000)
      throw new Error('Workflow document exceeds 256 KB')
    const document = workflowDocumentSchema.parse(raw)
    document.nodes = orderGraph(document.nodes)
    if (document.nodes.filter((node) => node.kind === 'agent').length > 6)
      throw new Error('Workflow exceeds six agent tasks')
    const available = new Map(
      this.capabilities().map((capability) => [capability.name, capability]),
    )
    const capabilities: CompiledWorkflow['capabilities'] = {}
    const outputs = Object.fromEntries(document.nodes.map((node) => [node.id, nodeOutput(node)]))
    await this.validator.validate(document.inputSchema, null, true)
    for (const node of document.nodes) {
      if (node.kind === 'condition' && node.operator !== 'exists' && node.right === undefined)
        throw new Error('Comparison condition requires a right operand')
      await this.validator.validate(nodeOutput(node), null, true)
      const ancestors = new Set<string>()
      const collect = (id: string) => {
        if (ancestors.has(id)) return
        ancestors.add(id)
        for (const dependency of document.nodes.find((node) => node.id === id)?.dependsOn ?? [])
          collect(dependency)
      }
      for (const dependency of node.dependsOn) collect(dependency)
      if (
        node.when &&
        (!ancestors.has(node.when.node) ||
          document.nodes.find((item) => item.id === node.when?.node)?.kind !== 'condition')
      )
        throw new Error('Node condition must reference a preceding condition dependency')
      const templates =
        node.kind === 'capability'
          ? [node.input]
          : node.kind === 'agent'
            ? [node.prompt, node.context]
            : node.kind === 'condition'
              ? [node.left, node.right]
              : node.kind === 'foreach'
                ? [node.items, node.input]
                : []
      let itemSchema: JsonSchema | undefined
      const resolveSchema = (reference: string): JsonSchema => {
        const parts = referencePath(reference)
        if (parts[0] === 'inputs') return field(document.inputSchema, parts.slice(1))
        if (parts[0] === 'nodes' || parts[0] === 'artifacts') {
          const sourceId = parts[1]
          if (!sourceId || !ancestors.has(sourceId))
            throw new Error('Node reference must be an earlier dependency')
          if (parts[0] === 'artifacts') return field(z.toJSONSchema(artifactSchema), parts.slice(2))
          return field(z.record(z.string(), z.unknown()).parse(outputs[sourceId]), parts.slice(2))
        }
        if (node.kind !== 'foreach')
          throw new Error('Item/index references are available only inside foreach')
        if (parts[0] === 'index') {
          if (parts.length > 1) throw new Error('Index has no properties')
          return { type: 'integer' }
        }
        if (!itemSchema) throw new Error('Foreach requires a declared array item schema')
        return field(itemSchema, parts.slice(1))
      }
      if (node.kind === 'foreach') {
        const refs = references(node.items)
        if (refs.length) {
          const ref = z.object({ $ref: z.string() }).strict().parse(node.items).$ref
          const schema = resolveSchema(ref)
          if (schema.type !== 'array') throw new Error('Foreach source must be an array')
          itemSchema = z.record(z.string(), z.unknown()).parse(schema.items)
        } else {
          const items = z.array(z.unknown()).max(node.maxItems).parse(node.items)
          if (items.length) {
            const value = items[0]
            itemSchema = {
              type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
            }
            if (value && typeof value === 'object' && !Array.isArray(value))
              itemSchema = {
                type: 'object',
                properties: Object.fromEntries(
                  Object.entries(value).map(([key, item]) => [
                    key,
                    { type: item === null ? 'null' : typeof item },
                  ]),
                ),
              }
          } else itemSchema = {}
        }
      }
      for (const template of templates)
        for (const reference of references(template)) resolveSchema(reference)
      const checkTemplate = async (
        value: unknown,
        schema: JsonSchema,
        root = schema,
      ): Promise<void> => {
        const expected = dereference(schema, root)
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.hasOwn(value, '$ref')
        ) {
          compatible(resolveSchema(z.object({ $ref: z.string() }).parse(value).$ref), expected)
          return
        }
        if (!references(value).length) {
          await this.validator.validate(
            {
              ...expected,
              ...(root.$defs === undefined ? {} : { $defs: root.$defs }),
              ...(root.definitions === undefined ? {} : { definitions: root.definitions }),
            },
            value,
          )
          return
        }
        if (Array.isArray(value)) {
          if (expected.type && expected.type !== 'array')
            throw new Error('Array template does not fit destination')
          for (const item of value)
            await checkTemplate(
              item,
              z.record(z.string(), z.unknown()).parse(expected.items ?? {}),
              root,
            )
          return
        }
        const object = z.record(z.string(), z.unknown()).parse(value)
        if (expected.type && expected.type !== 'object')
          throw new Error('Object template does not fit destination')
        const properties = z.record(z.string(), z.unknown()).parse(expected.properties ?? {})
        for (const required of z.array(z.string()).parse(expected.required ?? []))
          if (!Object.hasOwn(object, required))
            throw new Error(`Missing required workflow argument: ${required}`)
        for (const [key, child] of Object.entries(object)) {
          if (!Object.hasOwn(properties, key) && expected.additionalProperties === false)
            throw new Error(`Unknown workflow argument: ${key}`)
          await checkTemplate(
            child,
            z
              .record(z.string(), z.unknown())
              .parse(
                properties[key] ??
                  (typeof expected.additionalProperties === 'object'
                    ? expected.additionalProperties
                    : {}),
              ),
            root,
          )
        }
      }
      if (node.kind === 'capability' || node.kind === 'foreach') {
        const capability = available.get(node.tool)
        if (!capability) throw new Error(`Unknown workflow capability: ${node.tool}`)
        if (/^(workflow_start|schedule_|team_start)/.test(node.tool))
          throw new Error(
            'Nested orchestration must use explicit agent tasks within the family limit',
          )
        capabilities[node.tool] = {
          digest: hash(canonical(capability)),
          effect: capability.effect,
          input: capability.input,
        }
        if (capability.effect !== 'read' && node.attempts > 1)
          throw new Error(
            'Automatic retry is allowed only for reads; mutations require outcome reconciliation',
          )
        await checkTemplate(node.input, capability.input)
      } else if (node.kind === 'agent') {
        if (node.attempts > 1) throw new Error('Agent tasks are not automatically replayed')
        await checkTemplate(node.prompt, { type: 'string', minLength: 1, maxLength: 128000 })
      }
    }
    const versioned = { version: 1 as const, document, capabilities, outputs }
    const compiled = compiledWorkflowSchema.parse({
      ...versioned,
      digest: hash(canonical(versioned)),
    })
    if (Buffer.byteLength(JSON.stringify(compiled)) > 800000)
      throw new Error('Compiled workflow exceeds 800 KB')
    return compiled
  }
  close() {
    this.validator.close()
  }
}
