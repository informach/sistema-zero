import { expect, test } from 'bun:test'
import { inventarioDeRepertorio } from './repertorio-local'

/**
 * C01b (30/10/2026): só pede publicação automática a atividade com todas as fontes na trilha e
 * sem bloco manual. A barreira C01a confere de novo no serviço, com o repertório do Members.
 */
/**
 * Lacunas (01/11/2026, pela Jornada): o Vale e as Nuvens saíram desta lista, refeitos só com
 * blocos da trilha.
 * A43 (decisão da dona, 31/10/2026): o Vale e as Nuvens publicavam como estavam, porque os cursos do
 * Arquiteto e do Gênio que ensinam esses blocos chegam antes do lançamento oficial. A lista diz
 * exatamente o que cada um espera; um bloco novo sem fonte reprova (não se esconde aqui). A
 * barreira C01a do serviço continua conferindo na importação, com o repertório do Members.
 */
/** Vazia desde as lacunas de 01/11/2026: nenhum desafio espera um curso que não ensina o bloco. */
const ESPERAM_OS_CURSOS: Record<string, string[]> = {}

test('publicação pedida só com todas as fontes na trilha, ou esperando os cursos registrados', () => {
  for (const d of inventarioDeRepertorio()) {
    if (!d.publicarAutomaticamente) continue
    const nome = `${d.publico}/${d.ilha}/${d.titulo}`
    const espera = ESPERAM_OS_CURSOS[d.slug.replace(/-adulto$/, '')] ?? []
    expect([nome, [...d.semFonteNaTrilha].sort()]).toEqual([nome, [...espera].sort()])
  }
})
