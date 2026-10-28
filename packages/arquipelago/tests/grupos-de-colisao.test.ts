import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GRUPO_SO_DO_CORPO, gruposDoColisor } from '../src/mundo/grupos'

test('o colisor comum não leva a chave collisionGroups (undefined vira o grupo 0)', () => {
  expect('collisionGroups' in gruposDoColisor(false)).toBe(false)
  expect(gruposDoColisor(true)).toEqual({ collisionGroups: GRUPO_SO_DO_CORPO })
})

test('nenhum colisor recebe um grupo que pode ser undefined', () => {
  const arquivos: string[] = []
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const p = join(dir, nome)
      if (statSync(p).isDirectory()) andar(p)
      else if (p.endsWith('.tsx')) arquivos.push(p)
    }
  }
  andar(join(import.meta.dir, '..', 'src'))
  andar(join(import.meta.dir, '..', 'playground'))
  const ruins = arquivos.filter((p) =>
    /(collision|solver)Groups=\{[^}]*\bundefined\b/.test(readFileSync(p, 'utf8')),
  )
  expect(ruins).toEqual([])
})
