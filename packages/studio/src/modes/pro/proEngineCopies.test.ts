import { expect, test } from 'bun:test'
import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import {
  classifyProEngineCopy,
  currentProEngineCopies,
  PRO_ENGINE_EXTENSION_IDS,
  PRO_ENGINE_VARIANTS,
  type ProEngineInventory,
  proEngineCopyPath,
  proEngineUpdatePlan,
} from './proEngineCopies'
import { PRO_ENGINE_COPIES } from './proEngineCopies.generated'

test('o motor de agora está no inventário das cópias publicadas (rode bun scripts/gen-pro-engine-copies.ts)', async () => {
  // Quando este teste falha, o motor 2D mudou: a cópia que a conversão escreve hoje precisa entrar
  // no inventário, senão o projeto convertido hoje não recebe o próximo motor.
  for (const id of PRO_ENGINE_EXTENSION_IDS) {
    const copies = await currentProEngineCopies(id)
    for (const variant of PRO_ENGINE_VARIANTS)
      expect(PRO_ENGINE_COPIES[id][variant]).toContain(await studioProDigest(copies[variant]))
  }
})

test('o inventário guarda só sha256, sem repetir dentro de uma variante', () => {
  for (const id of PRO_ENGINE_EXTENSION_IDS)
    for (const variant of PRO_ENGINE_VARIANTS) {
      const hashes = PRO_ENGINE_COPIES[id][variant]
      expect(hashes.length).toBeGreaterThan(0)
      for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/)
      expect(new Set(hashes).size).toBe(hashes.length)
    }
})

test('a cópia é de agora, de uma versão publicada (na mesma variante) ou editada', async () => {
  const current = await currentProEngineCopies('game-2d-advanced')
  const older = `/* motor publicado antes */\n${current['sem-cenario-pinta']}`
  const known: ProEngineInventory = {
    'game-2d': { completo: [], 'sem-cenario-pinta': [] },
    'game-2d-advanced': { completo: [], 'sem-cenario-pinta': [await studioProDigest(older)] },
  }
  for (const variant of PRO_ENGINE_VARIANTS)
    expect(await classifyProEngineCopy('game-2d-advanced', current[variant], known)).toEqual({
      kind: 'current',
    })
  expect(await classifyProEngineCopy('game-2d-advanced', older, known)).toEqual({
    kind: 'known',
    variant: 'sem-cenario-pinta',
  })
  // Um espaço a mais já é edição; e o hash de outro motor não vale para este.
  expect(await classifyProEngineCopy('game-2d-advanced', `${older} `, known)).toEqual({
    kind: 'changed',
  })
  expect(await classifyProEngineCopy('game-2d', older, known)).toEqual({ kind: 'changed' })
  expect(
    await proEngineUpdatePlan(
      { [proEngineCopyPath('game-2d-advanced')]: { kind: 'file', content: older } },
      known,
    ),
  ).toEqual([
    {
      path: 'public/sz-ext/game-2d-advanced.js',
      extensionId: 'game-2d-advanced',
      variant: 'sem-cenario-pinta',
      before: older,
      content: current['sem-cenario-pinta'],
    },
  ])
})
