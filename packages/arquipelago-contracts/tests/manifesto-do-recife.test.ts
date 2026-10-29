import { expect, test } from 'bun:test'
import { LIMITES_DO_DESAFIO, ManifestoDeDesafiosSchema } from '../src/desafios'
import { ilha } from '../src/ilhas'

const manifesto = ManifestoDeDesafiosSchema.parse(
  await Bun.file(
    new URL('../../../docs/desafios-do-jogo/recife/recife.manifesto.json', import.meta.url),
  ).json(),
)
const cursos = [
  'faisca/cade-todo-mundo',
  'faisca/desafio-primeiro-jogo',
  'faisca/a-ilha-do-farol',
  'faisca/o-jardim-secreto',
  'construtor/nave-contra-asteroides',
  'construtor/o-jogo-do-meu-jeito',
  'inventor/corre-dino',
]
const blocos = new Set<string>()
for (const curso of cursos) {
  const lista = await Bun.file(
    new URL(`../../../docs/aulas-interativas/${curso}/blocos.json`, import.meta.url),
  ).json()
  for (const tipo of lista.blocks ?? lista['2d'] ?? []) blocos.add(tipo)
}
function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}
test('o Recife Coral é do Explorador e o pacote tem um quadro e três desafios do dia', () => {
  expect(ilha('recife').posto).toBe('explorer')
  expect(manifesto.escopo).toBe('ilha')
  expect(manifesto.desafios.map((d) => d.slug)).toEqual([
    'recife-mira-de-bolhas',
    'recife-mira-de-bolhas-rapida',
    'recife-mira-de-bolhas-pontos',
    'recife-mira-de-bolhas-alvo-novo',
  ])
  for (const [i, d] of manifesto.desafios.entries()) {
    expect(d.ilha).toBe('recife')
    expect(d.publico).toBe('kids')
    expect(d.tipo).toBe(i === 0 ? 'quadro-das-cores' : 'desafio-do-dia')
    expect(d.quadro).toBe(i === 0 ? 6 : null)
    expect(d.conteudo.recompensa).toEqual({
      cor: i === 0,
      atracao: 'mira-de-bolhas',
      moedas: i === 0 ? 20 : 10,
      moedasExtra: i === 0 ? 10 : 5,
    })
    expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
    expect(d.conteudo.objetivos.some((o) => !o.optional)).toBe(true)
    expect(d.conteudo.objetivos.some((o) => o.optional)).toBe(true)
  }
})
test('os oito projetos só usam blocos ensinados até Explorador e arte embutida', () => {
  for (const d of manifesto.desafios)
    for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const p = raw as { blocksState: unknown; assets: { dataUrl: string }[] }
      expect(p).toMatchObject({
        programmingLanguage: 'javascript',
        mode: 'blocks',
        ir: { version: 2, html: [], css: [] },
      })
      expect(JSON.stringify(p).length).toBeLessThanOrEqual(LIMITES_DO_DESAFIO.projetoCaracteres)
      const usados = [...new Set(tipos(p.blocksState))]
      expect(
        usados.filter((t) => !blocos.has(t)),
        d.slug,
      ).toEqual([])
      expect(usados.filter((t) => /sz_(?:html|css|canvas|adv_raw|js_object)/.test(t))).toEqual([])
      expect(p.assets.length).toBeGreaterThan(0)
      for (const asset of p.assets) {
        expect(asset.dataUrl).toStartWith('data:image/svg+xml;base64,')
        const svg = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64').toString()
        expect(svg).not.toMatch(/(?:href|src)\s*=\s*["']https?:/)
      }
    }
})
test('os textos da criança não têm travessão, exclamação ou abertura com pergunta', () => {
  for (const d of manifesto.desafios) {
    const textos = [
      d.conteudo.titulo,
      d.conteudo.enunciado,
      ...d.conteudo.dicas,
      d.conteudo.desafioExtra?.texto,
      ...d.conteudo.objetivos.map((o) => o.label),
    ]
    for (const texto of textos) {
      expect(texto).not.toMatch(/[!—]/)
      expect(texto?.split(/[.\n]/)[0]).not.toContain('?')
    }
  }
})
