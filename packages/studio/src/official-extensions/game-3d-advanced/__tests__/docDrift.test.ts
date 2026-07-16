import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import { gameKit3DPromptContext } from '../ai'
import { gameKit3DBlocks, gameKit3DToolboxCategory } from '../blocks'
import { gameKit3DManifest } from '../manifest'
import { gameKit3DRuntime } from '../runtime'

/**
 * ⭐ MATA A CLASSE, não o caso (a rede R17 do gêmeo 2D, adaptada ao 3D).
 *
 * A doc do aluno cita as sub-categorias (chips) pelo NOME; o contexto da IA
 * cita os MÉTODOS da API. Quando um lote renomeia um chip ou um método e
 * esquece o texto, a criança procura um chip que não existe — e a IA gera
 * código que não roda. Este arquivo cruza os dois textos contra as fontes da
 * verdade (a toolbox real e as chaves reais do window.SZGameKit3D) e falha na
 * hora. Se um nome legítimo cair aqui, conserte o TEXTO; não afrouxe o teste.
 *
 * A convenção do 3D difere da do 2D: as citações de chip vivem em PARÊNTESES —
 * "(🏃 Física)", "(🎥)", "(💥 🌊)", "(🧊 Moldes & peças, 💡 Luz & céu)" — além
 * dos títulos que COMEÇAM com emoji ("### 🕺 O boneco…"). As duas formas
 * legítimas de alegar um chip são:
 *
 *   emoji SOZINHO   → resolve pelo emoji-líder do chip real ("(🎥)" → 🎥 Câmera)
 *   emoji + texto   → tem de ser EXATAMENTE o nome do chip ("(🏃 Física)")
 *
 * Parêntese sem emoji ("(a receita)") e emoji decorativo no MEIO do título
 * ("… & ⏱️ tempo") não alegam nada.
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

// O "?" do U+FE0F importa: ♻️ 🖱️ 🗄️ ❤️ 🕹️ ⏱️ carregam o seletor de variação.
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})️?/gu
const EMOJI_LIDER = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})️?/u

function temEmoji(s: string): boolean {
  return new RegExp(EMOJI.source, 'u').test(s)
}

/** É só emoji (um ou mais) + espaços? — a forma "(🎥)" e "(💥 🌊)". */
function soEmojis(s: string): boolean {
  return temEmoji(s) && s.replace(new RegExp(EMOJI.source, 'gu'), '').trim() === ''
}

function titulosDasDocs(texto: string): string[] {
  return [...texto.matchAll(/^###\s+(.+)$/gm)].map((m) => (m[1] ?? '').trim())
}

/**
 * As alegações de chip de um título: `emoji:X` (resolve pelo líder) ou
 * `nome:X` (tem de bater exato). O parêntese com emoji é a forma explícita e
 * vence; sem ele, vale o emoji que ABRE o título.
 */
function claimsDoTitulo(titulo: string): string[] {
  const claims: string[] = []
  for (const m of titulo.matchAll(/\(([^)]*)\)/g)) {
    const conteudo = (m[1] ?? '').trim()
    if (!temEmoji(conteudo)) continue
    for (const parte of conteudo.split(',')) {
      const p = parte.trim().replace(/^em\s+/u, '') // aceita a forma 2D "(em CHIP)"
      if (!p) continue
      if (soEmojis(p))
        for (const em of p.match(new RegExp(EMOJI.source, 'gu')) ?? []) claims.push(`emoji:${em}`)
      else if (temEmoji(p)) claims.push(`nome:${p}`)
    }
    return claims
  }
  const lider = titulo.match(EMOJI_LIDER)
  if (lider) claims.push(`emoji:${lider[0]}`)
  return claims
}

describe('g3k — a doc não pode citar categoria que não existe', () => {
  const chips = nomesDeCategoria(gameKit3DToolboxCategory).slice(1) // sem a raiz
  const chipsReais = new Set(chips)
  const porEmoji = new Map<string, string>()
  for (const chip of chips) {
    const em = chip.match(EMOJI_LIDER)?.[0]
    if (!em) continue
    // Dois chips com o mesmo emoji-líder tornariam "(🎥)" ambíguo — não deixar.
    expect(porEmoji.has(em)).toBe(false)
    porEmoji.set(em, chip)
  }

  function alegacoesInvalidas(titulos: string[]): string[] {
    const ruins: string[] = []
    for (const t of titulos) {
      for (const claim of claimsDoTitulo(t)) {
        const [forma, valor] = [
          claim.slice(0, claim.indexOf(':')),
          claim.slice(claim.indexOf(':') + 1),
        ]
        const ok = forma === 'emoji' ? porEmoji.has(valor) : chipsReais.has(valor)
        if (!ok) ruins.push(`"${t}" alega ${claim}`)
      }
    }
    return ruins
  }

  it('toda seção das docs que alega um chip aponta para um chip REAL', () => {
    const titulos = titulosDasDocs(gameKit3DManifest.docs ?? '')
    const totalClaims = titulos.flatMap(claimsDoTitulo).length
    // Anti-vácuo: uma regex morta passaria em silêncio (a doença do R20 do 2D).
    expect(totalClaims).toBeGreaterThanOrEqual(6)
    expect(alegacoesInvalidas(titulos)).toEqual([])
  })

  it('o contexto da IA só cita métodos que EXISTEM no window.SZGameKit3D', () => {
    // As chaves reais, do runtime avaliado (mesma receita do blockAudit).
    const body = gameKit3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
    const win = {
      addEventListener() {},
      SZGameKit3D: undefined,
      performance: { now: () => 0 },
      devicePixelRatio: 1,
    } as unknown as Record<string, unknown>
    new Function('THREE', 'window', body)({}, win)
    const apiKeys = new Set(Object.keys(win.SZGameKit3D as Record<string, unknown>))

    // `nome(` colado no parêntese e SEM ponto/letra antes = citação de método da
    // API ("Math.random(" e "...part(" ficam de fora pelo lookbehind; "function ("
    // tem espaço). Denylist documentada: "parse" é o método do GLTFLoader citado
    // na explicação de assets ("por parse() de um ArrayBuffer"), não da API.
    const DENY = new Set(['parse'])
    const citados = new Set<string>()
    for (const m of gameKit3DPromptContext.matchAll(/(?<![.\w])([a-z][A-Za-z0-9]*)\(/g)) {
      const nome = m[1] ?? ''
      if (!DENY.has(nome)) citados.add(nome)
    }
    // Anti-vácuo: o contexto cita ~90 métodos; uma extração morta cairia p/ 0.
    expect(citados.size).toBeGreaterThanOrEqual(60)
    expect([...citados].filter((n) => !apiKeys.has(n))).toEqual([])
  })

  it('todo bloco está na toolbox em UM lugar só — e a categoria "Mais" não existe', () => {
    // Bloco fora do SUBCATS cai no grupo genérico "Mais" sem erro nenhum — é a
    // versão silenciosa do chip fantasma (o bloco some do lugar certo).
    const conta = new Map<string, number>()
    for (const t of tiposNaToolbox(gameKit3DToolboxCategory)) conta.set(t, (conta.get(t) ?? 0) + 1)
    const visiveis = gameKit3DBlocks
      .filter((b) => !(b as { hidden?: boolean }).hidden)
      .map((b) => b.type)
    const conhecidos = new Set(gameKit3DBlocks.map((b) => b.type))
    expect({
      foraDaToolbox: visiveis.filter((t) => !conta.has(t)),
      emDoisLugares: [...conta.entries()].filter(([, n]) => n > 1).map(([t]) => t),
      // typo no SUBCATS: a toolbox citaria um tipo que nenhum bloco define
      fantasmasNaToolbox: [...conta.keys()].filter((t) => !conhecidos.has(t)),
      categoriaMais: nomesDeCategoria(gameKit3DToolboxCategory).filter((n) => n === 'Mais'),
    }).toEqual({ foraDaToolbox: [], emDoisLugares: [], fantasmasNaToolbox: [], categoriaMais: [] })
  })
})
