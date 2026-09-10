import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
// O admin NÃO é dependência do kids no package.json; o import é por caminho
// relativo de módulo puro, mesmo precedente do conformance de tipos de bloco.
import { DIALOGUE_POSES } from '../../admin/src/lib/types'
import { ZAPPY_SRC } from '../src/components/kids/mascot'

/**
 * Toda pose declarada precisa existir como arquivo NOS DOIS apps: no kids, que é
 * quem mostra o mascote para a criança, e no admin, cujo seletor de pose é uma
 * fileira de imagens (a autora escolhe pela cara, não pelo nome). Cada app serve
 * o próprio `public/`, então "copiei no kids e esqueci no admin" não dá erro
 * nenhum: dá quatro imagens quebradas no editor de aula.
 */
// ⚠️ DERIVADO das fontes de verdade, nunca copiado: uma lista literal aqui
// passaria verde justamente no caso que o teste existe para pegar (pose nova
// declarada, arquivo esquecido).
const POSES_DO_MASCOTE = Object.keys(ZAPPY_SRC)
/** Subconjunto que o bloco de diálogo oferece (dormindo num balão seria absurdo). */
const POSES_DO_DIALOGO = [...DIALOGUE_POSES]

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
