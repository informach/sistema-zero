import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GRUPO_SO_DO_CORPO, gruposDoColisor } from '../src/mundo/grupos'

test('o colisor comum não leva a chave collisionGroups (undefined vira o grupo 0)', () => {
  expect('collisionGroups' in gruposDoColisor(false)).toBe(false)
  expect(gruposDoColisor(true)).toEqual({ collisionGroups: GRUPO_SO_DO_CORPO })
})

test('nenhum colisor recebe um grupo que pode ser undefined (só as constantes de grupos.ts)', () => {
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
  // Uma variável ou uma condição pode chegar como undefined; o grupo condicional vai por
  // `gruposDoColisor`, espalhado no colisor.
  const ruins = arquivos.flatMap((p) =>
    [...readFileSync(p, 'utf8').matchAll(/(?:collision|solver)Groups=\{([^}]*)\}/g)]
      .map((m) => m[1]?.trim() ?? '')
      .filter(
        (v) =>
          v !== 'GRUPO_SO_DO_CORPO' && v !== 'GRUPOS_DO_RAIO_DA_CAMERA' && v !== 'GRUPO_DE_NINGUEM',
      )
      .map((v) => `${p}: ${v}`),
  )
  expect(ruins).toEqual([])
})
