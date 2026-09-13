import { expect, it } from 'bun:test'
import { searchWithSynonyms } from '../searchTerms'

it('encontra rótulos antigos e acentos sem oferecer tipos fora da paleta', () => {
  const matching = (query: string) =>
    query === 'sz g2d set opacity' ? [{ kind: 'block', type: 'sz_g2d_set_opacity' }] : []
  expect(searchWithSynonyms('transparencia', matching)).toEqual([
    { kind: 'block', type: 'sz_g2d_set_opacity' },
  ])
  expect(searchWithSynonyms('transparência', matching)).toHaveLength(1)
  expect(searchWithSynonyms('explosão', matching)).toEqual([])
})
