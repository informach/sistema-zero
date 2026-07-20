import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import { gameTwoDPromptContext } from '../ai'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from '../blocks'
import { gameTwoDManifest } from '../manifest'

/**
 * MATA A CLASSE, não o caso (clone do docDrift do gk).
 *
 * A doc do aluno e o contexto da IA citam as sub-categorias pelo NOME (com emoji).
 * Quando um lote renomeia/funde um chip e esquece o texto, a criança procura um
 * chip que não existe e a IA manda ela procurar. Foi o caso na R2: "🎬 Telas e
 * cenas" virou "📺 Telas e cenas" — este teste cruza os dois textos contra a
 * TOOLBOX de verdade (a que a criança vê) e falha na hora se um nome driftar.
 *
 * Se um nome legítimo cair aqui, conserte o TEXTO; não afrouxe o teste.
 */

/** Todo nome de sub-categoria da toolbox, em qualquer nível. */
function nomesDeCategoria(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  acc.push(cat.name)
  for (const c of cat.contents) if (c.kind === 'category') nomesDeCategoria(c, acc)
  return acc
}

/** Todo `type` de bloco na toolbox, em qualquer nível (com repetição). */
function tiposNaToolbox(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  for (const c of cat.contents) {
    if (c.kind === 'category') tiposNaToolbox(c, acc)
    else acc.push(c.type)
  }
  return acc
}

const COM_EMOJI = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u

/**
 * Categorias do NÚCLEO (não da extensão) que a doc cita de propósito na seção
 * "fazer na mão" — não são sub-categorias do Jogo 2D e não devem falhar o drift.
 */
const EXTERNAS_OK = new Set(['🎨 SVG', '⚙️ Ao iniciar', '🎯 Eventos', '🔁 Loop principal'])

/** Spans em negrito `**🎯 Nome**` cujo conteúdo começa com emoji = citação de chip. */
function chipsCitadosNasDocs(texto: string): string[] {
  const out: string[] = []
  for (const m of texto.matchAll(/\*\*([^*]+)\*\*/g)) {
    const conteudo = (m[1] ?? '').trim()
    if (COM_EMOJI.test(conteudo)) out.push(conteudo)
  }
  return out
}

/** Citações `categoria "🚀 Kit espaço"` no contexto da IA. */
function chipsCitadosNaIA(texto: string): string[] {
  return [...texto.matchAll(/categorias?\s+"([^"]+)"/g)].map((m) => (m[1] ?? '').trim())
}

describe('g2d — a doc/IA não podem citar categoria que não existe', () => {
  const reais = new Set(nomesDeCategoria(gameTwoDToolboxCategory))

  it('toda citação de chip nas docs do aluno é uma sub-categoria real (ou uma do núcleo)', () => {
    const citados = chipsCitadosNasDocs(gameTwoDManifest.docs ?? '')
    // Anti-vácuo: se a regex casasse zero, o teste passaria em silêncio.
    expect(citados.length).toBeGreaterThan(10)
    expect(citados.filter((c) => !reais.has(c) && !EXTERNAS_OK.has(c))).toEqual([])
  })

  it('o contexto da IA não inventa nome de sub-categoria', () => {
    const citados = chipsCitadosNaIA(gameTwoDPromptContext)
    expect(citados.length).toBeGreaterThan(3)
    expect(citados.filter((c) => !reais.has(c) && !EXTERNAS_OK.has(c))).toEqual([])
  })

  it('todo bloco visível está na toolbox, e em UM lugar só (sem balde "Mais")', () => {
    // Bloco fora do SUBCATS cai no grupo genérico "Mais" — some do lugar certo sem
    // erro nenhum. É a versão silenciosa do mesmo problema.
    const conta = new Map<string, number>()
    for (const t of tiposNaToolbox(gameTwoDToolboxCategory)) conta.set(t, (conta.get(t) ?? 0) + 1)
    const visiveis = gameTwoDBlocks
      .filter((b) => !(b as { hidden?: boolean }).hidden)
      .map((b) => b.type)
    expect({
      foraDaToolbox: visiveis.filter((t) => !conta.has(t)),
      emDoisLugares: [...conta.entries()].filter(([, n]) => n > 1).map(([t]) => t),
      baldeMais: nomesDeCategoria(gameTwoDToolboxCategory).filter((n) => n === 'Mais'),
    }).toEqual({ foraDaToolbox: [], emDoisLugares: [], baldeMais: [] })
  })

  it('a contagem de blocos está travada (remoção acidental salta aqui)', () => {
    expect(gameTwoDBlocks.length).toBe(190)
  })
})
