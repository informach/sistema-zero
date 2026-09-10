import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'

/**
 * Toda pose declarada precisa existir como arquivo NOS DOIS apps: no kids, que é
 * quem mostra o mascote para a criança, e no admin, cujo seletor de pose é uma
 * fileira de imagens (a autora escolhe pela cara, não pelo nome). Cada app serve
 * o próprio `public/`, então "copiei no kids e esqueci no admin" não dá erro
 * nenhum: dá quatro imagens quebradas no editor de aula.
 */
const POSES_DO_MASCOTE = ['happy', 'celebrating', 'thinking', 'sleeping', 'speaking']
/** Subconjunto que o bloco de diálogo oferece (dormindo num balão seria absurdo). */
const POSES_DO_DIALOGO = ['speaking', 'happy', 'thinking', 'celebrating']

const arquivos = (dir: string) =>
  new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, '')),
  )

describe('sprites do Zappy', () => {
  test('o kids tem o arquivo de toda pose declarada', () => {
    const noDisco = arquivos(`${import.meta.dir}/../public/zappy`)
    for (const pose of POSES_DO_MASCOTE) expect(noDisco.has(pose)).toBe(true)
  })

  test('o admin tem as poses que o seletor de diálogo mostra', () => {
    const noDisco = arquivos(`${import.meta.dir}/../../admin/public/zappy`)
    for (const pose of POSES_DO_DIALOGO) expect(noDisco.has(pose)).toBe(true)
  })
})
