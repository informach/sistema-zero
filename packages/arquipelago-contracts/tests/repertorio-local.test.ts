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
  // 128 desde as lacunas de 01/11/2026: o desafio do dia da sua ilha (três, nos dois públicos).
  expect(inventario).toHaveLength(128)
  expect(inventario.filter((d) => d.publico === 'kids')).toHaveLength(64)
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
  // C01b: só pede publicação o que tem todas as fontes na trilha. A43 (decisão da dona,
  // 31/10/2026): o Vale e as Nuvens publicam esperando os cursos do Arquiteto e do Gênio; a lista
  // exata do que cada um espera fica em `docs/desafios-do-jogo/publicacao.test.ts`.
  for (const d of inventario.filter(
    (d) => d.publicarAutomaticamente && d.ilha !== 'vale-dos-dinos' && d.ilha !== 'nuvens',
  ))
    expect(d.semFonteNaTrilha, d.slug).toEqual([])
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
  // Lacunas (01/11/2026, pela Jornada): o Vale usa só blocos da trilha, sem clique em grupo nem
  // lista; nenhum posto ensina esses blocos.
  for (const d of inventario.filter((d) => d.ilha === 'vale-dos-dinos'))
    expect(d.semFonteNaTrilha, d.slug).toEqual([])
})
test('os quadros do Bosque não exigem extra, e só Noite usa opacidade de fonte opcional', () => {
  for (const d of inventario.filter((d) => d.ilha === 'bosque')) {
    expect(d.semFonteNaTrilha, d.slug).toEqual(
      d.slug.includes('-noite') ? ['sz_g2d_set_opacity'] : [],
    )
  }
})

test('a Vila usa somente fontes da trilha, sem depender do clique de um extra', () => {
  for (const d of inventario.filter((d) => d.ilha === 'vila-doce'))
    expect(d.semFonteNaTrilha, d.slug).toEqual([])
})
test('Recife e Pico usam somente fontes da trilha desde C01b', () => {
  for (const d of inventario.filter((d) => d.ilha === 'recife' || d.ilha === 'pico'))
    expect(d.semFonteNaTrilha, d.slug).toEqual([])
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
test('o Pega-conchas da sua ilha usa só a trilha do Faísca e pede publicação (C03a)', () => {
  const daSuaIlha = inventario.filter((d) => d.ilha === 'sua-ilha')
  // Os seis quadros e as três variações do desafio do dia (lacunas, 01/11/2026), nos dois públicos.
  expect(daSuaIlha).toHaveLength(18)
  for (const d of daSuaIlha) {
    expect(d.posto, d.slug).toBe(1)
    expect(d.semFonteNaTrilha, d.slug).toEqual([])
    expect(d.publicarAutomaticamente, d.slug).toBe(true)
    for (const c of d.cobertura) expect(c.trilha.length, `${d.slug}/${c.bloco}`).toBeGreaterThan(0)
  }
})
