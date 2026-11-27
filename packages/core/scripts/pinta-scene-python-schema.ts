/** Build-time constraint table. Runtime consumers must also validate scene semantics/cells. */
import { z } from 'zod'
import {
  PINTA_IMAGE_ID_PATTERN,
  PINTA_IMAGE_WORLD_LIMITS,
  PINTA_IMAGE_WORLD_PNG_PATTERN,
  PintaImageWorldSchema,
} from '../src/studio/pinta-image'
import {
  PINTA_REGION_IMAGE_DATA_VERSION,
  PintaRegionImageHeaderSchema,
} from '../src/studio/pinta-region-image'
import { PintaRegionSceneHeaderSchema } from '../src/studio/pinta-region-scene'
import {
  PINTA_SCENE_COLOR_PATTERN,
  PINTA_SCENE_MAX_PROPERTIES,
  PINTA_SCENE_PROPERTY_COLOR_PATTERN,
  PINTA_SCENE_PROPERTY_KEY_PATTERN,
  PintaSceneBaseSchema,
  PintaSceneObjectSchema,
  PintaScenePropertySchema,
} from '../src/studio/pinta-scene'

const keywords = new Set([
  '$defs',
  '$ref',
  '$schema',
  'additionalProperties',
  'anyOf',
  'const',
  'enum',
  'exclusiveMinimum',
  'items',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'oneOf',
  'pattern',
  'properties',
  'propertyNames',
  'required',
  'type',
  'x-pinta-pattern-flags',
  'x-pinta-property',
  'x-pinta-no-controls',
  'x-pinta-world',
])
const patterns = new Map([
  [PINTA_SCENE_PROPERTY_KEY_PATTERN.source, PINTA_SCENE_PROPERTY_KEY_PATTERN.flags],
  [PINTA_SCENE_COLOR_PATTERN.source, PINTA_SCENE_COLOR_PATTERN.flags],
  [PINTA_IMAGE_WORLD_PNG_PATTERN.source, PINTA_IMAGE_WORLD_PNG_PATTERN.flags],
])
type Schema = Record<string, unknown>

function pythonSchemaConverter() {
  const convert = (source: z.ZodType) =>
    z.toJSONSchema(source, {
      io: 'input',
      target: 'draft-2020-12',
      reused: 'ref',
      cycles: 'throw',
      override({ zodSchema, jsonSchema }) {
        const output = jsonSchema as Schema
        if (zodSchema === PintaScenePropertySchema) output['x-pinta-property'] = true
        if (zodSchema === PintaImageWorldSchema) output['x-pinta-world'] = true
        if (zodSchema === PintaSceneObjectSchema.shape.properties)
          output.maxProperties = PINTA_SCENE_MAX_PROPERTIES
        if (typeof output.pattern === 'string') {
          if (output.pattern === PINTA_IMAGE_ID_PATTERN.source) {
            if (output.pattern !== '^[^\\p{Cc}]+$' || PINTA_IMAGE_ID_PATTERN.flags !== 'u')
              throw new Error('Unsupported Unicode ID pattern.')
            delete output.pattern
            output['x-pinta-no-controls'] = true
            return
          }
          const flags = patterns.get(output.pattern)
          if (flags === undefined)
            throw new Error(`Unsupported Python schema pattern: ${output.pattern}`)
          if (flags !== '' && flags !== 'i')
            throw new Error(`Unsupported Python regex flags: ${flags}`)
          output['x-pinta-pattern-flags'] = flags
        }
      },
    })
  const visit = (node: Schema | boolean): void => {
    if (typeof node === 'boolean') return
    for (const key of Object.keys(node))
      if (!keywords.has(key)) throw new Error(`Unsupported Python schema keyword: ${key}`)
    if (
      node.type &&
      !['object', 'array', 'string', 'boolean', 'number', 'integer'].includes(node.type as string)
    )
      throw new Error(`Unsupported Python schema type: ${node.type}`)
    if (node.$ref && (typeof node.$ref !== 'string' || !node.$ref.startsWith('#/$defs/')))
      throw new Error('Only local schema references are supported.')
    for (const key of ['properties', '$defs'])
      for (const child of Object.values((node[key] ?? {}) as Record<string, Schema>)) visit(child)
    for (const key of ['items', 'additionalProperties', 'propertyNames'])
      if (node[key] !== undefined) visit(node[key] as Schema | boolean)
    for (const key of ['anyOf', 'oneOf'])
      for (const child of (node[key] ?? []) as Schema[]) visit(child)
  }
  return (source: z.ZodType) => {
    const schema = convert(source)
    visit(schema as Schema)
    return schema
  }
}

export function pythonSceneSchemaTable() {
  const convert = pythonSchemaConverter()
  const schema = convert(PintaRegionSceneHeaderSchema)
  // The current Python adapter reads Scene 4 / PNG 5. Expanding the common
  // JavaScript reader must not silently advertise projected PNG 6 to Python.
  const image = convert(
    PintaRegionImageHeaderSchema.extend({ version: z.literal(PINTA_REGION_IMAGE_DATA_VERSION) }),
  )
  if (PINTA_SCENE_PROPERTY_COLOR_PATTERN.flags !== 'i')
    throw new Error('Unsupported typed color regex flags.')
  return {
    region: schema,
    image,
    worldEncodedChars: PINTA_IMAGE_WORLD_LIMITS.encodedChars,
    propertyColor: {
      pattern: PINTA_SCENE_PROPERTY_COLOR_PATTERN.source,
      flags: PINTA_SCENE_PROPERTY_COLOR_PATTERN.flags,
    },
  }
}

export function pythonLegacySceneSchemaSource(): string {
  const convert = pythonSchemaConverter()
  const scene = convert(PintaSceneBaseSchema)
  const world = convert(PintaImageWorldSchema)
  return pythonSchemaSource('pythonLegacySceneSchemaJSON', { scene, world })
}

export function pythonSceneSchemaSource(): string {
  return pythonSchemaSource('pythonSceneSchemaJSON', pythonSceneSchemaTable())
}

function pythonSchemaSource(name: string, table: unknown): string {
  return (
    '// Generated by studio/scripts/gen-pinta-scene-python.ts.\n' +
    '// biome-ignore-all format: generated constraint table\n' +
    `export const ${name} = ${JSON.stringify(JSON.stringify(table))}\n`
  )
}
