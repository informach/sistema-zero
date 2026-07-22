import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import { gameKitPromptContext } from '../ai'
import { gameKitBlocks, gameKitToolboxCategory } from '../blocks'
import { gameKitManifest } from '../manifest'

/**
 * ⭐ MATA A CLASSE, não o caso (R17).
 *
 * Três reviews seguidos acharam UMA categoria fantasma na doc e consertaram só
 * aquela: o R13 tirou "➡️ Tiro e giro" (que não existia no blocks.ts) e, no
 * review seguinte, lá estava "📊 Barra" — mesma doença, chip diferente.
 * Consertar o caso nunca varre a classe.
 *
 * A doc do aluno e o contexto da IA citam categorias pelo NOME. Quando um lote
 * renomeia/funde um chip e esquece o texto, a criança procura um chip que não
 * existe e a IA manda ela procurar. Este teste cruza os dois textos contra a
 * fonte da verdade — a TOOLBOX de verdade, a que a criança vê — e falha na hora.
 *
 * Se um nome legítimo cair aqui, conserte o TEXTO; não afrouxe o teste.
 * (Anda em qualquer profundidade: a toolbox é recursiva.)
 */

/** Todo nome de categoria da toolbox, em qualquer nível. */
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

/** Só as seções que falam de um chip (começam com emoji). Prosa comum
 * ("### Estados", "### Telas") não cita categoria e não entra. */
const COM_EMOJI = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u
function titulosComEmoji(texto: string): string[] {
  return [...texto.matchAll(/^###\s+(.+)$/gm)]
    .map((m) => (m[1] ?? '').trim())
    .filter((t) => COM_EMOJI.test(t))
}

/**
 * O contexto da IA não usa headers "###" — as citações vivem em bullets
 * "- <emoji> Nome: …". Antes do R20 a checagem da IA reusava o extrator de
 * headers e casava ZERO linha: passava em VÁCUO (a doença que este arquivo
 * existe para matar, no próprio teste). Regras da extração, todas contra o
 * texto real da ai.ts:
 * 1. só bullet que COMEÇA com emoji;
 * 2. assinatura de função começa minúscula (thrust, waitThen, tweenTo…) e não
 *    alega chip nenhum;
 * 3. "(em X)" / "(na cat X)" em qualquer posição aponta o chip explicitamente;
 * 4. senão, o HEAD (até o 1º ":" ou " (") é a alegação — e a linha multi-chip
 *    ("🧭 Regiões · 🎲 Sorte & medida · …") alega um chip por parte.
 * Citação de CLUSTER ("🧙 Kit RPG", sem o ": mundo") é legítima: vale se algum
 * chip real começa com ela seguida de ":".
 */
function chipsCitadosNaIA(texto: string): string[] {
  const out: string[] = []
  for (const m of texto.matchAll(/^- (.+)$/gm)) {
    const linha = (m[1] ?? '').trim()
    if (!COM_EMOJI.test(linha)) continue
    // o "?" cobre o seletor de variação U+FE0F que sobra de emojis como 🖥️
    const semEmoji = linha.replace(COM_EMOJI, '').replace(/^️?\s*/u, '')
    if (!/^[A-ZÀ-Ü]/.test(semEmoji)) continue
    const aponta = linha.match(/\((?:em|na cat) ([^)]+)\)/)
    if (aponta) {
      out.push((aponta[1] ?? '').trim())
      continue
    }
    const head = (linha.split(/(?=:)|(?= \()/, 1)[0] ?? '').trim()
    for (const parte of head.split('·')) out.push(parte.trim())
  }
  return out.filter(Boolean)
}

/**
 * ⭐ A REGRA (que a doc já segue nas boas seções): todo título com emoji ou **É**
 * um chip, ou **diz em qual chip está**. As duas formas são legítimas:
 *
 *   "### 🎮 Controles (teclado e mouse)"          → é o chip 🎮 Controles + descrição
 *   "### 🎯 Mirar (em 🎯 Comportamentos)"          → é um ASSUNTO, e aponta o chip
 *
 * O que NÃO passa é o título solto que não é chip nem diz onde está — porque aí a
 * criança lê "📊 Barra", procura na paleta e não acha nada. Era o caso de "📊
 * Barra", "⚔️ Batalha por turnos", "💾 Salvar" e "🎬 Cenas (cutscene) & NPCs
 * vivos": todos quatro invisíveis na toolbox.
 *
 * Devolve o nome do chip que o título alega, ou null se ele não alega nenhum.
 */
function chipAlegado(titulo: string): string | null {
  const em = titulo.match(/\(em (.+)\)\s*$/)
  if (em) return (em[1] ?? '').trim() // "Assunto (em 🔊 Som)" → o chip é o do parêntese
  return titulo.replace(/\s*\([^)]*\)\s*$/, '').trim() // tira a descrição do fim
}

describe('gk — a doc não pode citar categoria que não existe', () => {
  const reais = new Set(nomesDeCategoria(gameKitToolboxCategory))

  /** O título que não aponta para nenhum chip real (ver chipAlegado). */
  const semChip = (titulos: string[]) =>
    titulos.filter((t) => {
      const chip = chipAlegado(t)
      return !chip || !reais.has(chip)
    })

  it('toda seção das docs do aluno é um chip, ou diz em qual chip está', () => {
    const citadas = titulosComEmoji(gameKitManifest.docs ?? '')
    // Prova que o teste está mesmo lendo: uma regex que não casasse nada passaria
    // em silêncio — é o modo de falha deste próprio teste.
    expect(citadas.length).toBeGreaterThan(10)
    expect(semChip(citadas)).toEqual([])
  })

  /** Chip exato OU cluster ("🧙 Kit RPG" cobre "🧙 Kit RPG: mundo"). */
  const chipRealOuCluster = (chip: string) =>
    reais.has(chip) || [...reais].some((r) => r.startsWith(`${chip}:`))

  it('o contexto da IA não inventa nome de categoria', () => {
    // A IA lê isto e manda a criança clicar no chip: nome errado = ela não acha.
    const citados = chipsCitadosNaIA(gameKitPromptContext)
    // Sanidade anti-vácuo: extração vazia passaria em silêncio — foi exatamente
    // o buraco que o R20 achou aqui (o extrator de "###" casava zero bullet).
    expect(citados.length).toBeGreaterThan(10)
    expect(citados.filter((c) => !chipRealOuCluster(c))).toEqual([])
  })

  it('todo bloco visível está na toolbox, e em UM lugar só', () => {
    // Bloco fora do SUBCATS cai no grupo genérico "Mais" — some do lugar certo sem
    // erro nenhum. É a versão silenciosa do mesmo problema.
    const conta = new Map<string, number>()
    for (const t of tiposNaToolbox(gameKitToolboxCategory)) conta.set(t, (conta.get(t) ?? 0) + 1)
    const visiveis = gameKitBlocks
      .filter((b) => !(b as { hidden?: boolean }).hidden)
      .map((b) => b.type)
    expect({
      foraDaToolbox: visiveis.filter((t) => !conta.has(t)),
      emDoisLugares: [...conta.entries()].filter(([, n]) => n > 1).map(([t]) => t),
    }).toEqual({ foraDaToolbox: [], emDoisLugares: [] })
  })

  it('tooltips visíveis não ensinam blocos legados ocultos', () => {
    const ocultos = gameKitBlocks
      .filter((block) => block.hidden)
      .map((block) => block.message0)
      .filter((label): label is string => typeof label === 'string')
    const tooltipsVisíveis = gameKitBlocks
      .filter((block) => !block.hidden)
      .map((block) => block.tooltip)
      .filter((tooltip): tooltip is string => typeof tooltip === 'string')

    expect(
      tooltipsVisíveis.flatMap((tooltip) => ocultos.filter((label) => tooltip.includes(label))),
    ).toEqual([])
  })

  it('a seção de estados ensina o lifecycle automático atual', () => {
    const docs = gameKitManifest.docs ?? ''

    expect(docs).not.toContain('- **Quando começar ou recomeçar uma partida**')
    expect(docs).toContain('Em **⚙️ Ao iniciar**')
  })

  it('documenta os limites que protegem projetos grandes', () => {
    const contratos = [
      ['sz_gk_create_empty_tilemap', '512'],
      ['sz_gk_board_create', '512'],
      ['sz_gk_rpg_create_map', '512'],
      ['sz_gk_pkm_give_ball', '999'],
      ['sz_gk_draw_hearts', '100'],
    ] as const
    const docs = gameKitManifest.docs ?? ''

    for (const [type, limite] of contratos) {
      const block = gameKitBlocks.find((candidate) => candidate.type === type)
      expect(block?.tooltip).toContain(limite)
    }
    expect(docs).toContain('Mapas de peças e mapas-cenário vão até **512 × 512**')
    expect(docs).toMatch(/tabuleiro vai até\s+\*\*512 × 512\*\*/)
    expect(docs).toContain('mochila guarda até **999 bolas de captura**')
    expect(docs).toContain('HUD desenha até **100 corações**')
  })

  it('mantém as coleções da batalha RPG fora de laços e documenta seus tetos', () => {
    const contratos = [
      ['sz_gk_rpg_add_ally', '5'],
      ['sz_gk_rpg_add_foe', '5'],
      ['sz_gk_rpg_add_boss', '5'],
      ['sz_gk_rpg_add_foe_named', '5'],
      ['sz_gk_rpg_give_potion', '99'],
    ] as const
    const docs = gameKitManifest.docs ?? ''

    for (const [type, limite] of contratos) {
      const block = gameKitBlocks.find((candidate) => candidate.type === type)
      expect(block?.placement).toBe('resource-creator')
      expect(block?.tooltip).toContain(limite)
    }
    expect(docs).toContain('até **5 aliados além do herói**')
    expect(docs).toContain('até **5 inimigos extras**')
    expect(docs).toContain('até **99 poções**')
  })

  it('ensina a persistência de vida e o custo de energia para todos os combatentes', () => {
    const battleStats = gameKitBlocks.find((block) => block.type === 'sz_gk_rpg_battle_stats')
    const teachMove = gameKitBlocks.find((block) => block.type === 'sz_gk_rpg_teach_move')
    const docs = gameKitManifest.docs ?? ''

    expect(battleStats?.tooltip).not.toContain('Cada batalha começa com a vida')
    expect(battleStats?.tooltip).toContain('vida atravessa as batalhas')
    expect(teachMove?.tooltip).toContain('inimigos pelo nome')
    expect(teachMove?.tooltip).toContain('gasta energia')
    expect(docs).toContain('A vida atravessa batalhas')
    expect(gameKitPromptContext).toContain('nomeDoAliado|nomeDoInimigo')
  })

  it('não abre uma segunda citação no meio da mesma linha de destaque', () => {
    const docs = gameKitManifest.docs ?? ''
    expect(docs).not.toMatch(/^> .+ > /m)
  })
})
