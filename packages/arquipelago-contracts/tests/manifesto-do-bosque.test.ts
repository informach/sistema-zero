import { expect, test } from 'bun:test'
import { ManifestoDeDesafiosSchema } from '../src/desafios'

const arquivo = new URL(
  '../../../docs/desafios-do-jogo/bosque/bosque.manifesto.json',
  import.meta.url,
)
const manifesto = ManifestoDeDesafiosSchema.parse(await Bun.file(arquivo).json())

test('manifesto do Bosque tem um quadro e três desafios do dia para kids', () => {
  expect(manifesto.escopo).toBe('ilha')
  expect(manifesto.desafios).toHaveLength(4)
  expect(manifesto.desafios.map((d) => d.slug)).toEqual([
    'bosque-corrida-dos-bichos',
    'bosque-corrida-dos-bichos-pedras',
    'bosque-corrida-dos-bichos-noite',
    'bosque-corrida-dos-bichos-placar',
  ])
  for (const [index, desafio] of manifesto.desafios.entries()) {
    expect(desafio.ilha).toBe('bosque')
    expect(desafio.publico).toBe('kids')
    expect(desafio.tipo).toBe(index === 0 ? 'quadro-das-cores' : 'desafio-do-dia')
    expect(desafio.quadro).toBe(index === 0 ? 6 : null)
    expect(desafio.conteudo.recompensa).toEqual({
      cor: index === 0,
      moedas: index === 0 ? 20 : 10,
      moedasExtra: index === 0 ? 10 : 5,
    })
    expect(desafio.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
    expect(desafio.conteudo.objetivos.some((o) => !o.optional)).toBe(true)
    expect(desafio.conteudo.objetivos.some((o) => o.optional)).toBe(true)
    for (const project of [desafio.conteudo.projetoInicial, desafio.conteudo.gabarito]) {
      expect(project).toMatchObject({
        programmingLanguage: 'javascript',
        mode: 'blocks',
        ir: { version: 2, html: [], css: [] },
      })
    }
    const copy = [
      desafio.conteudo.titulo,
      desafio.conteudo.enunciado,
      ...desafio.conteudo.dicas,
      desafio.conteudo.desafioExtra?.texto,
      ...desafio.conteudo.objetivos.map((o) => o.label),
    ].join('\n')
    expect(copy).not.toMatch(/[!—]/)
  }
})
