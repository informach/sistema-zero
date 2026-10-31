import { expect, test } from 'bun:test'
import { ManifestoDeDesafiosSchema, MOEDAS_PADRAO_POR_TIPO } from '../src/desafios'

const arquivo = new URL(
  '../../../docs/desafios-do-jogo/bosque/bosque.manifesto.json',
  import.meta.url,
)
const manifesto = ManifestoDeDesafiosSchema.parse(await Bun.file(arquivo).json())

test('manifesto do Bosque tem seis quadros e três desafios do dia para kids', () => {
  expect(manifesto.escopo).toBe('ilha')
  expect(manifesto.desafios).toHaveLength(9)
  expect(manifesto.desafios.map((d) => d.slug)).toEqual([
    'bosque-vagalume-aceso',
    'bosque-lanche-do-coelho',
    'bosque-trilha-das-pegadas',
    'bosque-cuide-dos-quatro',
    'bosque-travessia-tranquila',
    'bosque-corrida-dos-bichos',
    'bosque-corrida-dos-bichos-pedras',
    'bosque-corrida-dos-bichos-noite',
    'bosque-corrida-dos-bichos-placar',
  ])
  for (const [index, desafio] of manifesto.desafios.entries()) {
    expect(desafio.ilha).toBe('bosque')
    expect(desafio.publico).toBe('kids')
    expect(desafio.tipo).toBe(index < 6 ? 'quadro-das-cores' : 'desafio-do-dia')
    expect(desafio.quadro).toBe(index < 6 ? index + 1 : null)
    expect(desafio.conteudo.recompensa).toEqual({
      cor: index < 6,
      atracao: index < 5 ? desafio.slug : 'corrida-dos-bichos',
      moedas: MOEDAS_PADRAO_POR_TIPO[desafio.tipo].principal,
      moedasExtra: MOEDAS_PADRAO_POR_TIPO[desafio.tipo].extra,
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

test('adulto tem os mesmos exercícios, slugs próprios e a mesma publicação', async () => {
  const adulto = ManifestoDeDesafiosSchema.parse(
    await Bun.file(
      new URL(
        '../../../docs/desafios-do-jogo/bosque/bosque-adulto.manifesto.json',
        import.meta.url,
      ),
    ).json(),
  )
  expect(adulto.desafios).toHaveLength(9)
  for (const [i, d] of adulto.desafios.entries()) {
    const kids = manifesto.desafios[i]!
    expect(d.publico).toBe('adulto')
    expect(d.slug).toBe(`${kids.slug}-adulto`)
    expect(d.publicar).toBe(kids.publicar)
    expect(d.quadro).toBe(kids.quadro)
    expect(d.conteudo).toEqual(kids.conteudo)
  }
})
