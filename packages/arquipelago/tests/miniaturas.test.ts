import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MOVEIS, OBJETOS_DA_CASA } from '@sistemazero/arquipelago-contracts'

/**
 * As miniaturas das escolhas do Construir (`arte/casa/miniaturas.py`): uma por janela, piso,
 * caminho, objeto e móvel da casa, em 160 px e leves (paleta de 128 cores).
 */
const PASTA = join(import.meta.dir, '..', 'src', 'assets', 'casa', 'miniaturas')
const ESPERADAS = [
  'janela-grande',
  'janela-arco',
  'janela-redonda',
  'piso-tabua',
  'piso-ladrilho',
  'piso-azulejo',
  'caminho-pedra',
  'caminho-grama',
  ...OBJETOS_DA_CASA.map((id) => `objeto-${id}`),
  ...MOVEIS.map((id) => `movel-${id}`),
]

describe('as miniaturas do Construir', () => {
  test('há uma para cada escolha, e nenhuma sobrando', () => {
    const arquivos = readdirSync(PASTA)
      .filter((n) => n.endsWith('.png'))
      .map((n) => n.slice(0, -4))
    expect(arquivos.sort()).toEqual([...ESPERADAS].sort())
  })

  test('cada uma tem 160 × 160 px e no máximo 8 KB', () => {
    for (const id of ESPERADAS) {
      const arquivo = join(PASTA, `${id}.png`)
      const png = readFileSync(arquivo)
      expect({ id, largura: png.readUInt32BE(16), altura: png.readUInt32BE(20) }).toEqual({
        id,
        largura: 160,
        altura: 160,
      })
      expect(statSync(arquivo).size).toBeLessThan(8 * 1024)
    }
  })
})
