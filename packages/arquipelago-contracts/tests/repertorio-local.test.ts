import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  artefatoDeRepertorio,
  FONTES_LOCAIS,
  inventarioDeRepertorio,
  relatorioDeRepertorio,
} from '../../../docs/desafios-do-jogo/repertorio-local'
import { ManifestoDeDesafiosSchema } from '../src/desafios'

const inventario = inventarioDeRepertorio()
test('inventário reproduz os arquivos locais sem confundir duas versões com atividades distintas', () => {
  expect(inventario).toHaveLength(108)
  expect(inventario.filter((d) => d.publico === 'kids')).toHaveLength(54)
  expect(
    JSON.parse(
      readFileSync(
        new URL('../../../docs/desafios-do-jogo/repertorio-local.json', import.meta.url),
        'utf8',
      ),
    ),
  ).toEqual(artefatoDeRepertorio())
  expect(
    readFileSync(
      new URL('../../../docs/desafios-do-jogo/repertorio-local.md', import.meta.url),
      'utf8',
    ),
  ).toBe(relatorioDeRepertorio())
  expect(inventario.every((d) => !d.publicarAutomaticamente)).toBe(true)
})
test('fontes opcionais não comprovam repertório universal e cursos futuros não são inventados', () => {
  expect(
    FONTES_LOCAIS.filter((f) => f.papel !== 'power' && f.papel !== 'extra').map((f) => f.pasta),
  ).toEqual([
    'faisca/desafio-primeiro-jogo',
    'faisca/a-ilha-do-farol',
    'faisca/o-jardim-secreto',
    'construtor/nave-contra-asteroides',
    'inventor/corre-dino',
  ])
  const bosque = inventario.find((d) => d.slug === 'bosque-corrida-dos-bichos')!
  const click = bosque.cobertura.find((c) => c.bloco === 'sz_g2d_on_group_click')!
  expect(click.trilha).toEqual([])
  expect(click.opcionais).toContain('faisca/cade-todo-mundo')
  expect(bosque.semFonteNaTrilha).toContain(click.bloco)
  const lista = inventario.find((d) => d.slug === 'vale-contagem-da-lista')!
  expect(lista.classificacao).toBe('apoio-preparado-em-blocos')
  expect(lista.tiposJaPresentes).toContain('sz_g2d_for_each_in_group')
  expect(lista.semFonteNaTrilha).toContain('sz_g2d_for_each_in_group')
})
test('classificação não chama blocos JavaScript de Python ou Pro', () => {
  for (const d of inventario) {
    expect(d.linguagem).toBe('javascript')
    expect(d.modo).toBe('blocks')
    expect(d.objetivosObrigatorios.length).toBeGreaterThan(0)
    expect(d.tiposAcrescentados.some((b) => d.tiposJaPresentes.includes(b))).toBe(false)
  }
  for (const d of inventario.filter((d) => d.ilha === 'recife' || d.ilha === 'pico')) {
    expect(d.classificacao).toBe('retomada-em-blocos')
  }
})
test('públicos têm o mesmo repertório e nenhum manifesto força concessão manual de blocos', () => {
  for (const d of inventario.filter((d) => d.publico === 'kids')) {
    const adulto = inventario.find((a) => a.slug === `${d.slug}-adulto`)!
    expect(adulto.classificacao).toBe(d.classificacao)
    expect(adulto.cobertura).toEqual(d.cobertura)
  }
  for (const ilha of ['bosque', 'vila-doce', 'recife', 'pico', 'vale', 'nuvens']) {
    for (const sufixo of ['', '-adulto']) {
      const m = ManifestoDeDesafiosSchema.parse(
        JSON.parse(
          readFileSync(
            new URL(
              `../../../docs/desafios-do-jogo/${ilha}/${ilha}${sufixo}.manifesto.json`,
              import.meta.url,
            ),
            'utf8',
          ),
        ),
      )
      for (const d of m.desafios)
        expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
    }
  }
})
