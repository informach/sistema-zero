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
/** Decisão de 02/11: desafio do dia opcional, nunca um quadro obrigatório da ilha. */
const OPCIONAIS_PUBLICADOS: Record<string, string[]> = {
  'bosque-corrida-dos-bichos-noite': ['sz_g2d_set_opacity'],
}

test('publicação pedida só com todas as fontes na trilha, ou esperando os cursos registrados', () => {
  for (const d of inventarioDeRepertorio()) {
    if (!d.publicarAutomaticamente) continue
    const nome = `${d.publico}/${d.ilha}/${d.titulo}`
    const slug = d.slug.replace(/-adulto$/, '')
    const espera = ESPERAM_OS_CURSOS[slug] ?? OPCIONAIS_PUBLICADOS[slug] ?? []
    if (OPCIONAIS_PUBLICADOS[slug]) {
      expect(d.quadro).toBeNull()
      expect(d.tipo).toBe('desafio-do-dia')
      expect(d.cobertura.filter((b) => !b.trilha.length).every((b) => b.opcionais.length > 0)).toBe(
        true,
      )
    }
    expect([nome, [...d.semFonteNaTrilha].sort()]).toEqual([nome, [...espera].sort()])
  }
})
