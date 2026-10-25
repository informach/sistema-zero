import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  NO_PALETTE_TREE_DRIFT,
  NO_TOOLBOX_DRIFT,
  paletteTreeDrift,
  toolboxCategoryNames,
  toolboxDrift,
} from '../../__tests__/paletteDrift'
import { gameKit3DPromptContext } from '../ai'
import { gameKit3DBlocks, gameKit3DToolboxCategory } from '../blocks'
import { gameKit3DManifest } from '../manifest'
import { GAME_KIT_THREE_D_PALETTE } from '../palette'
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

const EXT_DIR = join(import.meta.dir, '..')

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
  const chips = toolboxCategoryNames(gameKit3DToolboxCategory).slice(1) // sem a raiz
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

  it('nenhum exemplo do manifest usa travessão em texto visível (name/description/IR)', () => {
    // A regra da casa (SEM travessão em texto visível) vale para TODO exemplo,
    // inclusive os futuros: cada drift individual tem o seu it, e este varre o
    // manifest inteiro para que um exemplo NOVO sem drift próprio não escape.
    const ruins: string[] = []
    for (const ex of gameKit3DExamples) {
      if (ex.name.includes('—')) ruins.push(`${ex.name}: name`)
      if ((ex.description ?? '').includes('—')) ruins.push(`${ex.name}: description`)
      if (JSON.stringify(ex.ir).includes('—')) ruins.push(`${ex.name}: ir`)
    }
    expect(gameKit3DExamples.length).toBeGreaterThanOrEqual(10)
    expect(ruins).toEqual([])
  })

  it('a description guarda folga sob o teto de 500 chars', () => {
    // 500 = MAX_DESCRIPTION_CHARS (src/extensions/manifest.ts): passar dele lança
    // ZodError no IMPORT do manifest → cascata em ~113 testes que o carregam
    // (state/*, components/*, studio/*). Antes deste review estava em 493/500 —
    // uma vírgula a mais estourava. Manter ≤ 480 dá folga para editar a copy.
    expect(gameKit3DManifest.description.length).toBeLessThanOrEqual(480)
  })

  it('o manual tem uma seção por família, na MESMA ordem da árvore, e cada seção de verdade', () => {
    const docs = gameKit3DManifest.docs ?? ''
    const at = GAME_KIT_THREE_D_PALETTE.map((family) => docs.indexOf(`### ${family.name}\n`))
    expect(at.filter((index) => index < 0)).toEqual([])
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    for (const family of GAME_KIT_THREE_D_PALETTE) {
      if (family.sections.length < 2) continue
      for (const section of family.sections) expect(docs).toContain(`**${section.name}**`)
    }
    // As 24 abas planas antigas viraram 11 famílias (review 3D, lote 11).
    expect(GAME_KIT_THREE_D_PALETTE.length).toBe(11)
  })

  it('o vocabulário da criança: nada de entidade, gaveta, fábrica, semente, emissor nem dt', () => {
    // A palavra técnica fica no código (e no contexto da IA); o que a criança LÊ no bloco
    // fala em objeto, tirar do jogo, jorro de faíscas e sorteio repetível com o código.
    const proibidas =
      /entidade|gaveta|f[áa]brica|recolh|semente|emissor|atrator|b[úu]ssola|arrasto|vinheta|c[áa]psula|\bdt\b|radiano/i
    const texts = gameKit3DBlocks.flatMap((block) => {
      const b = block as unknown as Record<string, unknown>
      return Object.entries(b)
        .filter(([key]) => /^message\d+$/.test(key) || key === 'tooltip')
        .map(([key, value]) => `${block.type}.${key}: ${String(value)}`)
    })
    expect(texts.filter((text) => proibidas.test(text))).toEqual([])
    expect(gameKit3DManifest.description).not.toMatch(proibidas)
  })

  it('⭐ os avisos do motor falam a língua da criança e citam blocos que EXISTEM', () => {
    // O aviso aparece no console da criança. Ele dizia "recolha uma entidade", "Criar o
    // emissor 3D", "Preparar o jogo 3D" e "para cada vivo": palavras e blocos que ela não
    // acha em lugar nenhum. Cada aviso vira o texto dos literais (o que vem de variável
    // vira ¤); todo nome entre aspas que começa com maiúscula tem de ser o COMEÇO de um
    // bloco de verdade ("…" vale qualquer pedaço, como o %1 do bloco).
    // Os fragmentos DESTA extensão (runtime*.ts). As peças compartilhadas injetadas no
    // runtime (regras de jogo, modelos) citam blocos dos três kits e têm a rede delas.
    const fonte = readdirSync(EXT_DIR)
      .filter((file) => /^runtime\w*\.ts$/.test(file))
      .map((file) => readFileSync(join(EXT_DIR, file), 'utf8'))
      .join('\n')
    expect(gameKit3DRuntime).toContain('"Criar o jorro de faíscas" precisa de um nome')
    // Um aviso pode quebrar a linha: o fim é o ");" que fecha a linha.
    const avisos = [...fonte.matchAll(/\bwarn(?:Once)?\(([\s\S]*?)\);?\s*$/gm)].map((m) =>
      [...(m[1] ?? '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((l) => l[1]).join('¤'),
    )
    expect(avisos.length).toBeGreaterThan(70) // anti-vácuo: a varredura achou os avisos
    const proibidas = /entidade|f[áa]brica|recolh|semente|emissor|atrator|gancho/i
    expect(avisos.filter((aviso) => proibidas.test(aviso))).toEqual([])

    const blocos = gameKit3DBlocks.map((block) =>
      String((block as { message0?: unknown }).message0 ?? '').replace(/%\d+/g, '…'),
    )
    const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const existe = (nome: string) => {
      const padrao = new RegExp(`^${nome.split('…').map(escapar).join('.+?')}`, 'u')
      return blocos.some((bloco) => padrao.test(bloco))
    }
    // Nomes entre aspas que não são blocos: a aba do menu ⋯ e as áreas do projeto.
    const naoBlocos = new Set(['Sons', 'Ao iniciar', 'Quando…'])
    const citados = avisos.flatMap((aviso) =>
      [...aviso.matchAll(/"([^"¤]+)"/g)]
        .map((m) => m[1] ?? '')
        .filter((nome) => /^\p{Lu}/u.test(nome) && !naoBlocos.has(nome)),
    )
    expect(citados.length).toBeGreaterThan(15) // anti-vácuo
    expect(citados.filter((nome) => !existe(nome))).toEqual([])
  })

  it('os textos dos exemplos não usam o vocabulário antigo', () => {
    const proibidas = /entidade|f[áa]brica|recolh|semente|emissor|atrator/i
    const achados = gameKit3DExamples.flatMap((example) => {
      const strings: string[] = []
      JSON.stringify(example.ir, (_key, value) => {
        if (typeof value === 'string') strings.push(value)
        return value
      })
      return [example.name, example.description ?? '', ...strings]
        .filter((text) => proibidas.test(text))
        .map((text) => `${example.name}: ${text}`)
    })
    expect(achados).toEqual([])
  })

  it('todo bloco está na paleta em UM lugar só, sem fantasma e sem categoria "Mais"', () => {
    // Bloco fora da árvore some da paleta sem erro nenhum: a versão silenciosa do
    // chip fantasma. A rede é a comum das extensões (`paletteDrift.ts`).
    expect(paletteTreeDrift(GAME_KIT_THREE_D_PALETTE, gameKit3DBlocks)).toEqual(
      NO_PALETTE_TREE_DRIFT,
    )
    expect(toolboxDrift(gameKit3DToolboxCategory, gameKit3DBlocks)).toEqual(NO_TOOLBOX_DRIFT)
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
