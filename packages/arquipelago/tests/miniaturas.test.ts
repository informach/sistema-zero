import { expect, test } from 'bun:test'
import { IDS_DA_GALERIA } from '@sistemazero/arquipelago-contracts'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { MINIATURA_DO_OBJETO, miniaturaDaAparencia } from '../src/interface/miniaturas'

test('cada função e aparência histórica usa miniatura de uma peça do catálogo Morada', () => {
  const known = new Set(Object.values(MORADA_CATALOG.pieces).map((p) => `/api/morada3d/${p.thumb}`))
  for (const file of Object.values(MINIATURA_DO_OBJETO)) expect(known.has(file)).toBe(true)
  for (const id of IDS_DA_GALERIA) expect(known.has(miniaturaDaAparencia(id))).toBe(true)
})
