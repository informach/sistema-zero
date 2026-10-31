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
    new URL('../../../docs/desafios-do-jogo/nuvens/nuvens.manifesto.json', import.meta.url),
  ).json(),
)
/**
 * Os cursos dos postos até o Gênio da Criação (`champion`, o posto das Nuvens), lidos das pastas:
 * Faísca, Construtor(a), Inventor(a), Explorador(a), Mestre, Arquiteto(a) e Gênio. Curso novo
 * nessas pastas só pode AMPLIAR o que vale aqui, nunca tirar um bloco que o pacote já usa.
 */
const POSTOS_ATE_AS_NUVENS = [
  'faisca',
  'construtor',
  'inventor',
  'explorador',
  'mestre',
  'arquiteto',
  'genio',
]
const aulas = fileURLToPath(new URL('../../../docs/aulas-interativas/', import.meta.url))
const cursos: string[] = []
const blocos = new Set<string>()
for await (const arquivo of new Bun.Glob('*/*/blocos.json').scan(aulas)) {
  const caminho = arquivo.replaceAll('\\', '/')
  if (!POSTOS_ATE_AS_NUVENS.includes(caminho.split('/')[0] ?? '')) continue
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
test('a Ilha das Nuvens é do Gênio e o pacote em blocos tem cinco quadros e quatro desafios do dia (o sexto quadro é na linguagem do posto, §6.28 A2)', () => {
  expect(ilha('nuvens').posto).toBe('champion')
  expect(manifesto.escopo).toBe('ilha')
  expect(manifesto.desafios.map((d) => d.slug)).toEqual([
    // O Jardim em grade, construção e gestão do Gênio em blocos da trilha (lacunas, 01/11/2026).
    'nuvens-plantar-com-moedas',
    'nuvens-canteiro-ocupado',
    'nuvens-producao',
    'nuvens-colher-os-canteiros',
    'nuvens-meta-do-jardim',
    'nuvens-jardim-que-floresce',
    'nuvens-jardim-que-floresce-rega-forte',
    'nuvens-jardim-que-floresce-sol-forte',
    'nuvens-jardim-que-floresce-chuva',
  ])
  for (const [i, d] of manifesto.desafios.entries()) {
    const tipo = i < 5 ? 'quadro-das-cores' : 'desafio-do-dia'
    expect(d.ilha).toBe('nuvens')
    expect(d.publico).toBe('kids')
    expect(d.tipo).toBe(tipo)
    expect(d.quadro).toBe(i < 5 ? i + 1 : null)
    expect(d.ordem).toBe(i < 5 ? (i + 1) * 10 : 60 + i - 5)
    expect(d.conteudo.recompensa).toEqual({
      cor: i < 5,
      atracao: i < 5 ? d.slug : 'jardim-que-floresce',
      moedas: MOEDAS_PADRAO_POR_TIPO[tipo].principal,
      moedasExtra: MOEDAS_PADRAO_POR_TIPO[tipo].extra,
    })
    expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
    expect(d.conteudo.objetivos.some((o) => !o.optional)).toBe(true)
    expect(d.conteudo.objetivos.some((o) => o.optional)).toBe(true)
  }
})
test('os projetos usam só ações ensinadas, sem lista, e arte embutida', () => {
  // As listas que valem hoje: os cursos principais e os Poderes do Faísca (o Arquiteto e o Gênio
  // ainda não têm cursos autorados).
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
      // Lacunas (01/11/2026): o quinto quadro não pede mais lista nem laço em grupo.
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
