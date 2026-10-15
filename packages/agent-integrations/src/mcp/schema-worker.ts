/// <reference lib="webworker" />

import { canonical } from '@sistemazero/agent-core'
import type { ValidateFunction } from 'ajv'
import Ajv from 'ajv'
import Ajv2019 from 'ajv/dist/2019'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { z } from 'zod'

const command = z.object({
  id: z.string(),
  schema: z.record(z.string(), z.unknown()),
  value: z.unknown(),
  compileOnly: z.boolean().default(false),
})
function engines() {
  const list = [
    new Ajv({ strict: false, allErrors: false }),
    new Ajv2019({ strict: false, allErrors: false }),
    new Ajv2020({ strict: false, allErrors: false }),
  ]
  for (const engine of list) addFormats(engine)
  return list
}
let validators = engines()
const cache = new Map<string, { validate: ValidateFunction; engine: Ajv | Ajv2019 | Ajv2020 }>()
self.onmessage = (event) => {
  const input = command.parse(event.data)
  try {
    const key = canonical(input.schema)
    if (cache.size >= 64 && !cache.has(key)) {
      validators = engines()
      cache.clear()
    }
    const version = String(input.schema.$schema ?? 'http://json-schema.org/draft-07/schema#')
    const engine = version.includes('2020-12')
      ? validators[2]
      : version.includes('2019-09')
        ? validators[1]
        : version.includes('draft-07')
          ? validators[0]
          : undefined
    if (!engine) throw new Error('Unsupported JSON Schema dialect')
    const saved = cache.get(key)
    if (!saved) engine.removeSchema()
    const validate = saved?.validate ?? engine.compile(input.schema)
    if (!saved) cache.set(key, { validate, engine })
    const valid = input.compileOnly || validate(input.value)
    self.postMessage({
      id: input.id,
      valid,
      error: valid ? '' : engine.errorsText(validate.errors).slice(0, 2000),
    })
  } catch (error) {
    self.postMessage({
      id: input.id,
      valid: false,
      error: error instanceof Error ? error.message.slice(0, 2000) : 'Schema validation failed',
    })
  }
}
