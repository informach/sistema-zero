import { expect, test } from 'bun:test'
import { inventarioDeRepertorio } from './repertorio-local'

/**
 * C01b (30/10/2026): só pede publicação automática a atividade com todas as fontes na trilha e
 * sem bloco manual. A barreira C01a confere de novo no serviço, com o repertório do Members.
 */
test('publicação pedida só com todas as fontes na trilha', () => {
  for (const d of inventarioDeRepertorio()) {
    if (!d.publicarAutomaticamente) continue
    const nome = `${d.publico}/${d.ilha}/${d.titulo}`
    expect([nome, d.semFonteNaTrilha]).toEqual([nome, []])
  }
})
