import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const bindings = z.object({
  bindings: z.array(z.object({ name: z.string(), class_name: z.string() })),
})
const configuration = z.object({
  durable_objects: bindings,
  migrations: z.array(
    z.object({
      tag: z.string(),
      new_sqlite_classes: z.array(z.string()).optional(),
      deleted_classes: z.array(z.string()).optional(),
      renamed_classes: z.array(z.unknown()).optional(),
      transferred_classes: z.array(z.unknown()).optional(),
    }),
  ),
  env: z.object({
    staging: z.object({ durable_objects: bindings, migrations: z.unknown().optional() }),
  }),
})

test('both deployments use a fresh sessions namespace without inheriting the old lease table', async () => {
  const input: unknown = JSON.parse(
    await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'),
  )
  const config = configuration.parse(input)
  expect(config.env.staging.migrations).toBeUndefined()
  for (const scope of [config, config.env.staging]) {
    expect(scope.durable_objects.bindings).toEqual([
      { class_name: 'PythonLanguageSandbox', name: 'PythonLanguageSandbox' },
      { class_name: 'PythonLanguageSessions', name: 'PythonLanguageSessions' },
    ])
  }
  expect(config.migrations).toEqual([
    { tag: 'v1', new_sqlite_classes: ['PythonLanguageSandbox', 'PythonLanguageOwner'] },
    {
      tag: 'language-sessions-initial',
      new_sqlite_classes: ['PythonLanguageSessions'],
      deleted_classes: ['PythonLanguageOwner'],
    },
  ])
})
