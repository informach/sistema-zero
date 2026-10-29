import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import {
  LIMITES_DO_DESAFIO,
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
} from '../src/desafios'
import { ilha } from '../src/ilhas'

const manifesto = ManifestoDeDesafiosSchema.parse(
  await Bun.file(
    new URL('../../../docs/desafios-do-jogo/pico/pico.manifesto.json', import.meta.url),
  ).json(),
)
/**
 * Os cursos dos postos até o Mestre dos Jogos (`elite`, o posto do Pico), lidos das pastas:
 * Faísca, Construtor(a), Inventor(a), Explorador(a) e Mestre. Curso novo nessas pastas só pode
 * AMPLIAR o que vale aqui, nunca tirar um bloco que o pacote já usa.
 */
const POSTOS_ATE_O_PICO = ['faisca', 'construtor', 'inventor', 'explorador', 'mestre']
const aulas = fileURLToPath(new URL('../../../docs/aulas-interativas/', import.meta.url))
const cursos: string[] = []
const blocos = new Set<string>()
for await (const arquivo of new Bun.Glob('*/*/blocos.json').scan(aulas)) {
  const caminho = arquivo.replaceAll('\\', '/')
  if (!POSTOS_ATE_O_PICO.includes(caminho.split('/')[0] ?? '')) continue
  cursos.push(caminho)
  const lista = await Bun.file(`${aulas}/${caminho}`).json()
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
test('o Pico Gelado é do Mestre e o pacote tem um quadro e três desafios do dia', () => {
  expect(ilha('pico').posto).toBe('elite')
  expect(manifesto.escopo).toBe('ilha')
  expect(manifesto.desafios.map((d) => d.slug)).toEqual([
    'pico-fase-de-plataforma',
    'pico-fase-de-plataforma-pulo-alto',
    'pico-fase-de-plataforma-floco',
    'pico-fase-de-plataforma-quedas',
  ])
  for (const [i, d] of manifesto.desafios.entries()) {
    const tipo = i === 0 ? 'quadro-das-cores' : 'desafio-do-dia'
    expect(d.ilha).toBe('pico')
    expect(d.publico).toBe('kids')
    expect(d.tipo).toBe(tipo)
    expect(d.quadro).toBe(i === 0 ? 6 : null)
    expect(d.ordem).toBe(60 + i)
    expect(d.conteudo.recompensa).toEqual({
      cor: i === 0,
      atracao: 'fase-de-plataforma',
      moedas: MOEDAS_PADRAO_POR_TIPO[tipo].principal,
      moedasExtra: MOEDAS_PADRAO_POR_TIPO[tipo].extra,
    })
    expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
    expect(d.conteudo.objetivos.some((o) => !o.optional)).toBe(true)
    expect(d.conteudo.objetivos.some((o) => o.optional)).toBe(true)
  }
})
test('os oito projetos só usam blocos ensinados até o Mestre e arte embutida', () => {
  // As listas que valem hoje: os cursos principais e os Poderes do Faísca.
  expect(cursos.length).toBeGreaterThanOrEqual(9)
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
      d.conteudo.desafioExtra?.titulo,
      d.conteudo.desafioExtra?.texto,
      ...d.conteudo.objetivos.map((o) => o.label),
    ]
    for (const texto of textos) {
      expect(texto).not.toMatch(/[!—]/)
      expect(texto?.split(/[.\n]/)[0]).not.toContain('?')
    }
  }
})
