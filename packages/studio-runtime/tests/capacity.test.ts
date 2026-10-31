import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

test('o sandbox de execução oferece a CPU usada na qualificação dos programas', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
  // The real image qualification runs with --cpus 1. Keep both deployed
  // environments at or above that capacity without extending execution deadlines.
  const cpu: Record<string, number> = {
    lite: 1 / 16,
    basic: 1 / 4,
    'standard-1': 1 / 2,
    'standard-2': 1,
    'standard-3': 2,
    'standard-4': 4,
  }
  for (const deployment of [config, config.env.staging]) {
    const sandbox = deployment.containers.find(
      (item: { class_name: string }) => item.class_name === 'ProBuildSandbox',
    )
    expect(sandbox).toBeDefined()
    expect(cpu[sandbox.instance_type]).toBeGreaterThanOrEqual(1)
    expect(sandbox.max_instances).toBe(50)
  }
})
