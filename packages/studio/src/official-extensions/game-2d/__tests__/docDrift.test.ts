import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExtensionToolboxCategory } from '#extensions'
import {
  G2D_ENEMY_BEHAVIORS,
  G2D_ENEMY_PARAMS,
  G2D_ENEMY_SMARTS,
  MOLD_ONLY_STATEMENT_TYPES,
  START_ONLY_STATEMENT_TYPES,
} from '#ir'
import { gameTwoDPromptContext } from '../ai'
import { gameTwoDPromptSummary } from '../aiSummary'
import {
  GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS,
  GAME_TWO_D_ENEMY_SMART_OPTIONS,
} from '../blockCatalogShared'
import { G2D_SOCKET_SHADOW_TYPES, gameTwoDBlocks, gameTwoDToolboxCategory } from '../blocks'
import { gameTwoDDocs } from '../docs'
import { gameTwoDManifest } from '../manifest'
import {
  GAME_TWO_D_AREAS,
  GAME_TWO_D_LIFECYCLE_GUIDANCE,
  GAME_TWO_D_PERIODIC_TOOLTIPS,
} from '../pedagogy'
import { gameTwoDRuntime } from '../runtime'
import { GAME_TWO_D_API_KEYS } from '../runtimeContract'

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

function tiposDaCategoria(name: string): string[] {
  const category = gameTwoDToolboxCategory.contents.find(
    (content): content is ExtensionToolboxCategory =>
      content.kind === 'category' && content.name === name,
  )
  if (!category) throw new Error(`Categoria ausente: ${name}`)
  return tiposNaToolbox(category)
}

function blocoNaToolbox(type: string): Record<string, unknown> | undefined {
  for (const category of gameTwoDToolboxCategory.contents) {
    if (category.kind !== 'category') continue
    const block = category.contents.find(
      (content) => content.kind === 'block' && content.type === type,
    )
    if (block?.kind === 'block') return block as unknown as Record<string, unknown>
  }
  return undefined
}

function contarArquivos(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce(
    (total, entry) =>
      total +
      (entry.isDirectory() ? contarArquivos(join(directory, entry.name)) : entry.isFile() ? 1 : 0),
    0,
  )
}

const COM_EMOJI = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u

/**
 * Categorias do NÚCLEO (não da extensão) que a doc cita de propósito na seção
 * "fazer na mão" — não são sub-categorias do Jogo 2D e não devem falhar o drift.
 */
const EXTERNAS_OK = new Set(['🎨 SVG', ...Object.values(GAME_TWO_D_AREAS)])

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

const TIPO_POR_ROTULO_DOCUMENTADO = new Map<string, string>([
  ['Impedir de atravessar os sprites de um grupo', 'sz_g2d_collide_group'],
  ['Impedir de atravessar o sprite', 'sz_g2d_collide_sprite'],
  ['Para cada sprite do grupo … que colidir com o sprite …', 'sz_g2d_on_sprite_group_overlap'],
])

/** Citações `**Nome do bloco** (em **💥 Categoria**)` no manual do aluno. */
function categoriasDeBlocosCitadasNasDocs(texto: string): { label: string; category: string }[] {
  return [...texto.matchAll(/\*\*([^*]+)\*\* \(em \*\*([^*]+)\*\*\)/g)].map((match) => ({
    label: (match[1] ?? '').trim(),
    category: (match[2] ?? '').trim(),
  }))
}

describe('g2d — a doc/IA não podem citar categoria que não existe', () => {
  it('descreve o chão como a borda atraída, inclusive com gravidade negativa', () => {
    const tooltips = gameTwoDBlocks
      .map((block) => block.tooltip)
      .filter((tooltip): tooltip is string => typeof tooltip === 'string')
      .join('\n')
    const semanticSurfaces = [gameTwoDDocs, gameTwoDPromptContext, tooltips]

    for (const text of semanticSurfaces) {
      expect(text).not.toMatch(
        /chão\s*=\s*base (?:da tela|do canvas)|o chão é a base da tela|pous[ao]\w* (?:o sprite )?na base da tela/i,
      )
    }
    expect(gameTwoDDocs).toContain('gravidade negativa')
    expect(gameTwoDDocs).toContain('teto')
  })

  it('mantém a gravidade explícita e seletiva em blocos, manual e contexto da IA', () => {
    const byType = new Map(gameTwoDBlocks.map((block) => [block.type, String(block.tooltip ?? '')]))

    expect(byType.get('sz_g2d_set_gravity')).toContain('Define somente o valor')
    expect(byType.get('sz_g2d_apply_gravity')).toContain('ANTES')
    expect(byType.get('sz_g2d_apply_gravity_group')).toContain('antes de atualizar o grupo')
    for (const type of [
      'sz_g2d_platformer',
      'sz_g2d_flap',
      'sz_g2d_swim',
      'sz_g2d_jump_on_ground',
      'sz_g2d_control_dino',
    ]) {
      expect(byType.get(type), type).toContain('Aplicar a gravidade do mundo')
    }

    for (const text of [gameTwoDPromptContext, gameTwoDPromptSummary]) {
      expect(text).toContain('applyGravityToGroup')
      expect(text).not.toContain('updateGroupNoGravity')
    }
    expect(gameTwoDDocs).not.toContain('Mover o grupo sem gravidade')
    expect(gameTwoDDocs).toContain('Só os sprites que recebem')
    expect(gameTwoDPromptContext).toContain('Só sprites/grupos que recebem o apply respondem')
  })

  it('documenta os eventos de qualquer entrada e de pulo', () => {
    for (const label of [
      'Quando apertar qualquer tecla ou tocar na tela',
      'Quando o sprite pular',
    ]) {
      expect(gameTwoDDocs).toContain(label)
      expect(gameTwoDPromptContext).toContain(label)
    }
  })

  const reais = new Set(nomesDeCategoria(gameTwoDToolboxCategory))

  it('toda citação de chip nas docs do aluno é uma sub-categoria real (ou uma do núcleo)', () => {
    const citados = chipsCitadosNasDocs(gameTwoDDocs)
    // Anti-vácuo: se a regex casasse zero, o teste passaria em silêncio.
    expect(citados.length).toBeGreaterThan(10)
    expect(citados.filter((c) => !reais.has(c) && !EXTERNAS_OK.has(c))).toEqual([])
  })

  it('o contexto da IA não inventa nome de sub-categoria', () => {
    const citados = chipsCitadosNaIA(gameTwoDPromptContext)
    expect(citados.length).toBeGreaterThan(3)
    expect(citados.filter((c) => !reais.has(c) && !EXTERNAS_OK.has(c))).toEqual([])
  })

  it('cada bloco que o manual localiza está realmente na categoria citada', () => {
    const references = categoriasDeBlocosCitadasNasDocs(gameTwoDDocs)
    expect(references.length).toBeGreaterThan(0)

    for (const { label, category } of references) {
      const type = TIPO_POR_ROTULO_DOCUMENTADO.get(label)
      expect(type, `rótulo sem tipo no contrato documental: ${label}`).toBeDefined()
      if (!type) continue
      expect(tiposDaCategoria(category), `${label} não pertence a ${category}`).toContain(type)
    }
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
    expect(gameTwoDBlocks.length).toBe(280)
  })

  it('o bloco de virar oferece as quatro direções cardeais', () => {
    const virar = gameTwoDBlocks.find((block) => block.type === 'sz_g2d_flip_sprite')
    const direcao = (
      (virar?.args0 ?? []) as Array<{
        name?: string
        options?: Array<[string, string]>
      }>
    ).find((arg) => arg.name === 'DIR')

    expect(direcao?.options).toEqual([
      ['esquerda', 'left'],
      ['direita', 'right'],
      ['cima', 'up'],
      ['baixo', 'down'],
    ])
  })

  /**
   * O dropdown de comportamento de inimigo é uma CÓPIA à mão do enum da IR.
   * A auditoria genérica só cobre a direção "opção que não existe no enum";
   * a que falta é a perigosa: comportamento NOVO no enum + runtime e esquecido
   * no dropdown. O parser aceitaria o nome vindo do modo Código, mas o
   * FieldDropdown coage valor desconhecido para a PRIMEIRA opção — o inimigo da
   * criança viraria "patrulha" sozinho ao reabrir o projeto.
   */
  it('as opções de comportamento do dropdown são exatamente o enum da IR, na mesma ordem', () => {
    expect(GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS.map(([, valor]) => valor)).toEqual([
      ...G2D_ENEMY_BEHAVIORS,
    ])
  })

  /**
   * A terceira cópia da lista é a TABELA do runtime. Um comportamento no enum e
   * no dropdown mas fora da tabela cai no fallback de patrulha (índice 0) ou é
   * ignorado: a criança escolhe "bombardeiro" e ganha outra coisa, sem erro.
   */
  it('a tabela de comportamentos do runtime cobre exatamente o enum da IR', () => {
    const tabela = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_BEHAVIORS = {'),
      gameTwoDRuntime.indexOf('var ENEMY_SMART_COMBOS'),
    )
    expect(tabela.length).toBeGreaterThan(200)
    const naTabela = [...tabela.matchAll(/^\s{4}'([a-z-]+)':/gm)].map((m) => m[1])
    expect(naTabela.sort()).toEqual([...G2D_ENEMY_BEHAVIORS].sort())
  })

  it('as opções de inteligência são exatamente o enum da IR, na mesma ordem', () => {
    expect(GAME_TWO_D_ENEMY_SMART_OPTIONS.map(([, valor]) => valor)).toEqual([...G2D_ENEMY_SMARTS])
  })

  /** E o mapa que expande cada inteligência num pacote de comportamentos. */
  it('cada inteligência tem um pacote no runtime, e só usa comportamento que existe', () => {
    const mapa = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_SMART_COMBOS = {'),
      gameTwoDRuntime.indexOf('function createSmartEnemyType'),
    )
    expect(mapa.length).toBeGreaterThan(150)
    const niveis = [...mapa.matchAll(/^\s{4}'([a-z]+)':/gm)].map((m) => m[1])
    expect(niveis.sort()).toEqual([...G2D_ENEMY_SMARTS].sort())
    const usados = [...mapa.matchAll(/'([a-z-]+)'(?=[,\]])/g)].map((m) => m[1] ?? '')
    expect(
      usados.filter((nome) => !(G2D_ENEMY_BEHAVIORS as readonly string[]).includes(nome)),
    ).toEqual([])
  })

  /** Idem para os ajustes finos: o mapa que alimenta o aviso pedagógico. */
  it('o mapa de donos de cada ajuste cobre exatamente os parâmetros da IR', () => {
    const mapa = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_PARAM_OWNERS = {'),
      gameTwoDRuntime.indexOf('var ENEMY_BEHAVIOR_LABELS = {'),
    )
    expect(mapa.length).toBeGreaterThan(200)
    const donos = [...mapa.matchAll(/^\s{4}'([a-z]+)':/gm)].map((m) => m[1])
    expect(donos.sort()).toEqual([...G2D_ENEMY_PARAMS].sort())
  })

  /**
   * ⭐ A rede que faltava. A "cadeia de 9 pontos" do guia não cobre os mapas de
   * CAMPO do Blockly, e foi ali que o bloco novo de inteligência nasceu órfão:
   * ele declarava o tipo de inimigo e não aparecia em nenhum dos 8 seletores,
   * porque ninguém o pôs no `*_DECL_BLOCKS`. Isso não quebra teste nenhum, não
   * quebra o typecheck e não quebra o round-trip: só some da cara da criança.
   */
  it('todo bloco que DÁ NOME a alguma coisa está nos mapas de campo do Blockly', () => {
    const picker = readFileSync(join(import.meta.dir, '../../../blockly/fields/FieldNamePicker.ts'))
    const spritePicker = readFileSync(
      join(import.meta.dir, '../../../blockly/fields/FieldSpritePicker.ts'),
    )
    const args = (block: (typeof gameTwoDBlocks)[number]) =>
      [block.args0, block.args1, block.args2].flat().filter(Boolean) as Array<{
        name?: string
        type?: string
      }>

    // Quem CRIA um tipo de inimigo precisa alimentar o seletor de `enemytype` e,
    // porque o tipo É um grupo, também o de `group`.
    const criamTipo = gameTwoDBlocks.filter(
      (b) =>
        /Criar tipo de inimigo/.test(String(b.message0)) &&
        args(b).some((a) => a.name === 'NAME' && a.type === 'field_input'),
    )
    expect(criamTipo.length, 'anti-vácuo: nenhum criador de tipo encontrado').toBeGreaterThan(1)
    for (const block of criamTipo) {
      expect(String(picker), `${block.type}: falta nos DECL do FieldNamePicker`).toContain(
        `${block.type}: ['NAME']`,
      )
    }

    // Quem dá um nome LOCAL ao item do corpo (o campo ANAME) precisa alimentar o
    // seletor de sprite com escopo, senão a criança tem que digitar.
    const comNomeLocal = gameTwoDBlocks.filter((b) => args(b).some((a) => a.name === 'ANAME'))
    expect(comNomeLocal.length, 'anti-vácuo: nenhum bloco com nome local').toBeGreaterThan(3)
    const binders = String(spritePicker).slice(
      String(spritePicker).indexOf('const SPRITE_LOOP_BINDERS'),
    )
    for (const block of comNomeLocal) {
      expect(binders, `${block.type}: falta em SPRITE_LOOP_BINDERS`).toContain(`${block.type}: [`)
    }
  })

  /**
   * ⭐ Comportamento novo aparece no MENU e desaparece das explicações. O drift do
   * dropdown garante que o menu e o enum andem juntos, mas nada garantia que o
   * manual e o contexto da IA acompanhassem: a criança veria uma opção que o
   * manual não explica, e o Zappy nunca sugeriria o comportamento novo porque não
   * saberia que ele existe. As duas superfícies estavam completas quando este
   * teste foi escrito; ele existe para que continuem.
   */
  it('todo comportamento de inimigo é explicado no manual e conhecido pela IA', () => {
    const docs = gameTwoDDocs
    const nomeCurto = new Map(
      GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS.map(([texto, valor]) => [valor, texto.split(' (')[0]]),
    )
    expect(nomeCurto.size).toBe(G2D_ENEMY_BEHAVIORS.length)
    expect({
      // A IA precisa do VALOR (é o que ela emite no código).
      foraDaIA: G2D_ENEMY_BEHAVIORS.filter((b) => !gameTwoDPromptContext.includes(`'${b}'`)),
      // A criança precisa do NOME DO MENU (é o que ela lê na gaveta).
      foraDoManual: G2D_ENEMY_BEHAVIORS.filter((b) => !docs.includes(String(nomeCurto.get(b)))),
    }).toEqual({ foraDaIA: [], foraDoManual: [] })
  })

  /**
   * O contexto da IA é um GERADOR DE CÓDIGO: helper que ele promete e não existe
   * vira `SZGame2D.naoExiste is not a function` no jogo da criança, e o Zappy
   * explica com toda a confiança do mundo. Seis nomes citados ali são do Canvas
   * nativo ou do JS, não da nossa API; o resto tem que estar no contrato.
   */
  it('todo helper que o contexto da IA promete existe mesmo na API', () => {
    const NATIVOS = new Set([
      'clip',
      'getContext',
      'isPointInPath',
      'isPointInStroke',
      'random',
      'rect',
    ])
    const api = new Set<string>(GAME_TWO_D_API_KEYS)
    const citados = new Set<string>()
    for (const m of gameTwoDPromptContext.matchAll(/\b([a-z][A-Za-z0-9]{3,})\(/g)) {
      citados.add(String(m[1]))
    }
    expect(citados.size, 'anti-vácuo: nenhum nome lido').toBeGreaterThan(50)
    expect([...citados].filter((n) => !api.has(n) && !NATIVOS.has(n)).sort()).toEqual([])
  })

  /**
   * ⭐ A lista de blocos do manual tem que chamar cada bloco pela cara DELE.
   * Um review meu escreveu "Quando um tiro acertar o sprite" para um bloco que
   * se chama "Para cada tiro do tipo ... que acertar o sprite ...": na gaveta,
   * os blocos que começam com "Quando" são os EVENTOS de derrota e de dano, e a
   * criança pegaria o errado. O drift que existia só cobre a forma
   * `**Nome** (em **Categoria**)`, e a lista de blocos não usa essa forma.
   *
   * A regra vale só onde o manual LISTA blocos (cada item abre com o nome do
   * bloco em negrito). Nas receitas os itens abrem com o nome da receita, então
   * elas ficam de fora de propósito.
   */
  it('cada item da lista de blocos de inimigo abre com a cara real de um bloco', () => {
    const docs = gameTwoDDocs
    const semMarcadores = (texto: string) =>
      texto
        .replace(/%\d+/g, ' ')
        .replace(/⟨[^⟩]*⟩/g, ' ')
        .replace(/…/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    const faces = gameTwoDBlocks.map((b) => semMarcadores(String(b.message0 ?? ''))).filter(Boolean)

    const aberturas: string[] = []
    for (const titulo of [
      '#### Os dois jeitos de criar um tipo',
      '#### Soltar, atualizar, desenhar e reagir',
      // Mundo e Fase entraram na mesma rede: a família nasceu com 20 blocos e
      // sem lista nenhuma no manual, e a prosa já chamava um deles por um nome
      // que não existe ("Mundo vazio").
      '#### Os blocos de Mundo e de Fase',
    ]) {
      const inicio = docs.indexOf(titulo)
      expect(inicio, `seção sumiu: ${titulo}`).toBeGreaterThan(-1)
      // ⚠️ `indexOf` devolve -1 quando esta é a última subseção, e `slice(i, -1)`
      // engoliria o manual inteiro (aí as receitas, que abrem com o nome da
      // RECEITA, cairiam aqui como se fossem bloco). Sem o guarda, o teste passa
      // a acusar quem está certo no dia em que a seção virar a última.
      const proxima = docs.indexOf('####', inicio + titulo.length)
      const secao = docs.slice(inicio, proxima < 0 ? docs.length : proxima)
      // Cada item abre com `- **<nome do bloco>**`; o resto da linha é explicação.
      for (const m of secao.matchAll(/^- \*\*([^*]+)\*\*/gm))
        aberturas.push(semMarcadores(String(m[1])))
    }
    expect(aberturas.length, 'anti-vácuo: nenhum item lido').toBeGreaterThan(8)

    // ⚠️ O prefixo só vale para nome LONGO. Sem essa guarda (foi o furo do meu
    // próprio script de auditoria), um item que abrisse com "Soltar" casaria com
    // "Soltar um inimigo do tipo ..." e qualquer encurtamento passaria batido.
    const orfaos = aberturas.filter(
      (nome) =>
        !faces.some((face) => face === nome || (nome.length >= 16 && face.startsWith(nome))),
    )
    expect(orfaos).toEqual([])
  })

  /**
   * O dano é UM por tipo, mas cada ATAQUE pode doer um tanto: o caminho é trocar
   * o "Machucar com o dano de contato" pelo bloco de número livre, que mora em
   * outra gaveta (❤️ Vida). Como a dona não quis duplicar o bloco em 😈 Inimigos,
   * quem ensina isso são três tooltips que CITAM a face dele. Renomear aquele
   * bloco faria os três mentirem em silêncio, e é a classe de defeito que esta
   * extensão já colecionou (rótulo que descreve o que o código não faz mais).
   */
  it('os tooltips que mandam usar o dano por ataque citam a face real do bloco', () => {
    const dano = gameTwoDBlocks.find((b) => b.type === 'sz_g2d_damage_sprite')
    const face = String(dano?.message0 ?? '')
    // O pedaço entre os dois últimos soquetes é o que os tooltips repetem.
    const trecho = face.slice(face.indexOf('%2') + 2, face.indexOf('%3')).trim()
    expect(trecho.length, 'anti-vácuo: não achei a face do bloco de dano').toBeGreaterThan(10)
    for (const tipo of [
      'sz_g2d_hurt_by_enemy',
      'sz_g2d_on_enemy_shot_hit',
      'sz_g2d_on_enemy_beam_hit',
    ]) {
      const tooltip = String(gameTwoDBlocks.find((b) => b.type === tipo)?.tooltip ?? '')
      expect(tooltip, `${tipo}: o tooltip cita o bloco de dano por uma face que mudou`).toContain(
        trecho,
      )
    }
  })

  /**
   * A ordem da gaveta ENSINA a receita. Quem arrasta os primeiros blocos que vê
   * tem que chegar a um inimigo na tela: criar, soltar, atualizar, desenhar. Um
   * bloco novo inserido no meio (foi o que quase aconteceu com o "com
   * inteligência") empurra o "Desenhar" para baixo da dobra, e o sintoma é a
   * tela vazia sem erro nenhum. O comentário no `blocks.ts` prometia isso e
   * nada cobrava.
   */
  it('a subcategoria de Inimigos abre pela receita mínima, nessa ordem', () => {
    const sub = (
      gameTwoDToolboxCategory.contents as Array<{
        name?: string
        contents?: Array<{ type?: string }>
      }>
    ).find((c) => String(c.name ?? '').includes('Inimigos'))
    const tipos = (sub?.contents ?? []).map((b) => b.type)
    expect(tipos.slice(0, 5)).toEqual([
      'sz_g2d_define_enemy_type', // criar (o caminho)
      'sz_g2d_define_enemy_smart', // criar (o atalho, logo ao lado)
      'sz_g2d_spawn_enemy', // soltar
      'sz_g2d_update_enemy_type', // atualizar
      'sz_g2d_draw_enemy_type', // desenhar
    ])
  })

  /**
   * A outra metade da mesma rede, do lado do IR. Um bloco que DECLARA um nome
   * aparece em dois mapas que vivem em arquivos diferentes: o do schema (que dá
   * o símbolo e o escopo) e o do `programmingReferences` (que valida quem usa o
   * nome). Faltar no segundo não quebra nada visível na hora: o jogo roda, o
   * bloco encaixa, e a reprovação só aparece quando a criança APONTA para o
   * nome, que é exatamente o motivo de o campo existir. Aconteceu duas vezes
   * (o spawn nomeado em grupo e o tipo com inteligência), as duas em silêncio.
   */
  it('todo bloco do Jogo 2D que declara um nome está nos DOIS mapas de declaração', () => {
    const chaves = (fonte: string, nome: string) => {
      const inicio = fonte.indexOf(`const ${nome}`)
      expect(inicio, `${nome}: não achei o mapa`).toBeGreaterThan(-1)
      const corpo = fonte.slice(inicio, fonte.indexOf('\n}', inicio))
      return new Set([...corpo.matchAll(/'(g2d:[A-Za-z]+)':/g)].map((m) => m[1] as string))
    }
    const doSchema = chaves(
      readFileSync(join(import.meta.dir, '../../../ir/schema.ts'), 'utf8'),
      'G2D_DECLARATION_FIELDS',
    )
    const dasReferencias = chaves(
      readFileSync(join(import.meta.dir, '../../../ir/programmingReferences.ts'), 'utf8'),
      'VARIABLE_DECLARATION_FIELDS',
    )
    expect(doSchema.size, 'anti-vácuo: o mapa do schema veio vazio').toBeGreaterThan(15)
    expect([...doSchema].filter((tipo) => !dasReferencias.has(tipo))).toEqual([])
  })

  /**
   * E a metade de dentro: bloco com CORPO que batiza o item (o "chamado ⟨chefe⟩"
   * dos eventos de inimigo) precisa entrar no `g2dLocalNames`, senão o schema
   * recusa o nome que o próprio bloco acabou de criar. O tooltip vende usar o
   * nome ali dentro; sem esta linha a criança lê "o nome ainda não foi criado".
   */
  it('todo evento do Jogo 2D que batiza o item aparece no g2dLocalNames', () => {
    const fonte = readFileSync(join(import.meta.dir, '../../../ir/schema.ts'), 'utf8')
    // Cada variante do zod vai de um z.literal ao próximo: o trecho entre eles
    // é o corpo daquele tipo.
    const comItemName = fonte
      .split("z.literal('")
      .slice(1)
      .filter((trecho) => trecho.startsWith('g2d:') && /\bitemName:/.test(trecho))
      .map((trecho) => trecho.slice(0, trecho.indexOf("'")))
    expect(comItemName.length, 'anti-vácuo: nenhum tipo com itemName').toBeGreaterThan(4)
    const funcao = fonte.slice(
      fonte.indexOf('function g2dLocalNames'),
      fonte.indexOf('function validateG2DReferenceValue'),
    )
    for (const tipo of comItemName) {
      expect(funcao, `${tipo}: falta o case em g2dLocalNames`).toContain(`case '${tipo}':`)
    }
  })

  /**
   * ⭐ A LEI que separa 🧩 Meus moldes de ⚙️ Ao iniciar, e o motivo de Mundo e
   * Fase ficarem no início: **molde roda ANTES de tudo, então ele só pode
   * apontar para outro molde**. "Criar tipo de inimigo" é receita pura (quem
   * instancia é o "Soltar"); "Criar Mundo" aponta para um mapa e para um grupo,
   * que são containers vivos desta partida.
   *
   * Promover um desses a molde não quebraria teste nenhum hoje: o projeto salvo
   * passaria a rodar com a referência vazia e o sintoma seria "não acontece
   * nada", sem erro. Escopado ao Jogo 2D de propósito — teste que acusa vizinho
   * é teste que alguém afrouxa depois.
   */
  it('nenhum molde do Jogo 2D aponta para coisa viva desta partida', () => {
    const fonte = readFileSync(join(import.meta.dir, '../../../ir/schema.ts'), 'utf8')
    const APONTA_PARA_VIVO = ['mapVar', 'groupVar', 'spriteVar', 'worldVar', 'levelVar', 'typeVar']
    const moldes = [...MOLD_ONLY_STATEMENT_TYPES].filter((t) => t.startsWith('g2d:'))
    expect(moldes.length, 'anti-vácuo: nenhum molde do Jogo 2D').toBeGreaterThan(3)

    const corpoDe = new Map<string, string>()
    for (const trecho of fonte.split("z.literal('").slice(1)) {
      const tipo = trecho.slice(0, trecho.indexOf("'"))
      if (!corpoDe.has(tipo)) corpoDe.set(tipo, trecho)
    }
    const infratores: string[] = []
    for (const tipo of moldes) {
      const corpo = corpoDe.get(tipo)
      expect(corpo, `${tipo}: não achei a variante no schema`).toBeTruthy()
      for (const campo of APONTA_PARA_VIVO) {
        if (new RegExp(`\\b${campo}:`).test(String(corpo))) infratores.push(`${tipo}.${campo}`)
      }
    }
    expect(infratores).toEqual([])
  })

  /**
   * O tooltip do "Ajustar" LISTA quem aproveita cada valor, e essa prosa já ficou
   * para trás duas vezes seguidas. A criança lê o menu e o tooltip, não o mapa:
   * um dono que não aparece ali é um botão que ela não vai apertar.
   */
  it('o tooltip do Ajustar cita todo comportamento que aproveita algum valor', () => {
    const ajustar = gameTwoDBlocks.find((b) => b.type === 'sz_g2d_enemy_type_param')
    const tooltip = String(ajustar?.tooltip ?? '')
    const mapa = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_PARAM_OWNERS = {'),
      gameTwoDRuntime.indexOf('var ENEMY_BEHAVIOR_LABELS = {'),
    )
    // O rótulo do dropdown é como a criança lê o comportamento no tooltip.
    const rotulo = new Map(
      GAME_TWO_D_ENEMY_BEHAVIOR_OPTIONS.map(([texto, valor]) => [
        valor,
        texto.split(' (')[0] ?? '',
      ]),
    )
    const donos = new Set([...mapa.matchAll(/'([a-z-]+)'(?=[,\]])/g)].map((m) => m[1] ?? ''))
    const ausentes = [...donos]
      .filter((valor) => rotulo.has(valor))
      .filter((valor) => !tooltip.includes(rotulo.get(valor) ?? 'sem-rotulo'))
    expect(ausentes).toEqual([])
  })

  /** O mapa que traduz o valor do enum para o nome que ela lê nos avisos. */
  it('todo comportamento tem nome curto para o Console citar', () => {
    const mapa = gameTwoDRuntime.slice(
      gameTwoDRuntime.indexOf('var ENEMY_BEHAVIOR_LABELS = {'),
      gameTwoDRuntime.indexOf('function _enemyOwnerLabels'),
    )
    expect(mapa.length).toBeGreaterThan(200)
    const nomeados = [...mapa.matchAll(/^\s{4}'([a-z-]+)':/gm)].map((m) => m[1] ?? '')
    expect(nomeados.sort()).toEqual([...G2D_ENEMY_BEHAVIORS].sort())
  })

  it('as opções de ajuste fino são exatamente os parâmetros da IR', () => {
    const ajustar = gameTwoDBlocks.find((b) => b.type === 'sz_g2d_enemy_type_param')
    const args = (ajustar?.args0 ?? []) as Array<{
      name?: string
      options?: Array<[string, string]>
    }>
    const param = args.find((a) => a.name === 'PARAM')
    expect(param?.options?.map(([, valor]) => valor)).toEqual([...G2D_ENEMY_PARAMS])
  })

  it('mantém o inventário da auditoria sincronizado com blocos e API reais', () => {
    const audit = readFileSync(
      join(import.meta.dir, '../../../../docs/game-2d-audit-2026-07-20.md'),
      'utf8',
    )
    const visibleBlocks = gameTwoDBlocks.filter((block) => !block.hidden).length
    const hiddenBlocks = gameTwoDBlocks.length - visibleBlocks

    expect(audit).toContain(`${gameTwoDBlocks.length} definições de bloco`)
    expect(audit).toContain(`${visibleBlocks} visíveis e ${hiddenBlocks} legadas ocultas`)
    expect(audit).toContain(`${GAME_TWO_D_API_KEYS.length} métodos e valores públicos`)
    expect(audit).toContain(`${contarArquivos(join(import.meta.dir, '..'))} arquivos próprios`)
  })

  it('mantém a versão atual do guia interno sincronizada com o manifesto', () => {
    const guide = readFileSync(join(import.meta.dir, '../../../../CLAUDE.md'), 'utf8')
    const documentedVersion = guide.match(/manifest atual está em \*\*`([^`]+)`\*\*/)?.[1]

    expect(documentedVersion).toBe(gameTwoDManifest.version)
  })

  it('mantém a versão vigente do relatório de auditoria sincronizada com o manifesto', () => {
    const audit = readFileSync(
      join(import.meta.dir, '../../../../docs/game-2d-audit-2026-07-20.md'),
      'utf8',
    )
    const documentedVersion = audit.match(/manifesto vigente está em \*\*([^*]+)\*\*/)?.[1]

    expect(documentedVersion).toBe(gameTwoDManifest.version)
  })

  it('organiza controles, colisões e tempo por assunto, não pela Área do projeto', () => {
    const categories = nomesDeCategoria(gameTwoDToolboxCategory)
    expect(categories).not.toContain(GAME_TWO_D_AREAS.events)
    expect(categories).not.toContain(GAME_TWO_D_AREAS.loop)
    expect(categories).not.toContain('❓ Perguntas')

    expect(tiposDaCategoria('🎛️ Controles')).toEqual([
      'sz_g2d_on_key',
      'sz_g2d_on_any_input',
      'sz_g2d_on_pointer',
      'sz_g2d_on_jump',
      'sz_g2d_key_down',
      'sz_g2d_pointer_down',
      'sz_g2d_enable_classic_controls',
      'sz_g2d_action_down',
      'sz_g2d_action_pressed',
      'sz_g2d_on_action_pressed',
    ])
    expect(tiposDaCategoria('💥 Colisões')).toEqual([
      'sz_g2d_on_overlap',
      'sz_g2d_touches',
      'sz_g2d_collides',
      'sz_g2d_circle_collides',
      'sz_g2d_set_hitbox_scale',
      'sz_g2d_collide_group',
      'sz_g2d_collide_sprite',
      'sz_g2d_collide_platform',
      'sz_g2d_collide_platform_group',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
      'sz_g2d_for_each_tile_contact',
      'sz_g2d_tile_contact_is',
      'sz_g2d_set_tile_at_contact',
    ])
    expect(tiposDaCategoria('⏱️ Tempo e repetição')).toEqual([
      'sz_g2d_update_each_frame',
      'sz_g2d_every_frames',
      'sz_g2d_every_seconds',
      'sz_g2d_after_seconds',
      'sz_g2d_cooldown_ready',
      'sz_g2d_prune_old',
    ])
    expect(tiposDaCategoria('🚀 Kit espaço')).not.toContain('sz_g2d_on_sprite_group_overlap')
  })

  it('Vida oferece o fluxo automático por sprite sem apagar projetos antigos', () => {
    expect(tiposDaCategoria('❤️ Vida')).toEqual([
      'sz_g2d_set_health',
      'sz_g2d_change_health',
      'sz_g2d_damage_sprite',
      'sz_g2d_get_health',
      'sz_g2d_get_max_health',
      'sz_g2d_has_health',
      'sz_g2d_health_depleted',
      'sz_g2d_is_invincible',
      'sz_g2d_draw_sprite_health',
    ])
    const legacyHearts = gameTwoDBlocks.find((block) => block.type === 'sz_g2d_draw_hearts')
    expect(legacyHearts?.hidden).toBe(true)
    expect(blocoNaToolbox('sz_g2d_draw_hearts')).toBeUndefined()
    expect(blocoNaToolbox('sz_g2d_draw_sprite_health')).toBeDefined()
    expect(gameTwoDBlocks.find((block) => block.type === 'sz_g2d_set_health')?.placement).toBe(
      'start-only-command',
    )
  })

  it('Telas e cenas contém a descrição acessível do jogo', () => {
    expect(tiposDaCategoria('📺 Telas e cenas')).toContain('sz_g2d_set_stage_description')
  })

  it('preenche todos os soquetes de valor visíveis de Placar e HUD com sombras', () => {
    const missing = tiposDaCategoria('🏆 Placar e HUD').flatMap((type) => {
      const definition = gameTwoDBlocks.find((block) => block.type === type)
      const valueInputs = (definition?.args0 ?? [])
        .filter(
          (arg): arg is { type: string; name: string } =>
            typeof arg === 'object' &&
            arg !== null &&
            'type' in arg &&
            arg.type === 'input_value' &&
            'name' in arg &&
            typeof arg.name === 'string',
        )
        .map((arg) => arg.name)
      const shadowedInputs = G2D_SOCKET_SHADOW_TYPES[type] ?? {}
      return valueInputs
        .filter((input) => !shadowedInputs[input])
        .map((input) => `${type}.${input}`)
    })

    expect(missing).toEqual([])
  })

  it('mantém instruções de posicionamento fora da face dos blocos', () => {
    const visibleMessages = gameTwoDBlocks
      .filter((block) => !block.hidden)
      .flatMap((block) => [block.message0, block.message1, block.message2])
      .filter((message): message is string => typeof message === 'string')
    expect(
      visibleMessages.filter((message) => message.includes('Dentro de “A cada quadro”')),
    ).toEqual([])

    const message = (type: string) =>
      gameTwoDBlocks.find((block) => block.type === type)?.message0 ?? ''
    expect(message('sz_g2d_on_overlap')).toContain('começar a encostar')
    expect(message('sz_g2d_on_group_overlap')).toStartWith('Para cada colisão')
    expect(message('sz_g2d_on_enemy_shot_hit')).toStartWith('Para cada tiro')
    expect(message('sz_g2d_on_sprite_group_overlap')).toStartWith('Para cada sprite')
    expect(message('sz_g2d_set_state_anim')).toStartWith('Animação do sprite')
    expect(message('sz_g2d_enemy_state_anim')).toStartWith('Animação dos inimigos')
  })

  it('preenche A cada N quadros com sombra 30 e simplifica os blocos de preparação', () => {
    expect(G2D_SOCKET_SHADOW_TYPES.sz_g2d_every_frames).toEqual({ N: 'sz_val_number' })
    const periodic = blocoNaToolbox('sz_g2d_every_frames') as {
      inputs?: { N?: { shadow?: { type?: string; fields?: { NUM?: number } } } }
    }
    expect(periodic.inputs?.N?.shadow).toMatchObject({
      type: 'sz_val_number',
      fields: { NUM: 30 },
    })
    expect(GAME_TWO_D_PERIODIC_TOOLTIPS.frames).toContain('roda em todas as telas')
    expect(GAME_TWO_D_PERIODIC_TOOLTIPS.seconds).toContain('tela atual é jogando')

    for (const type of ['sz_g2d_setup_stage', 'sz_g2d_setup_full']) {
      const block = gameTwoDBlocks.find((candidate) => candidate.type === type)
      expect(block?.message1).toBeUndefined()
      expect(block?.args1).toBeUndefined()
      expect(block?.tooltip).not.toContain('leitor de tela')
    }
  })

  it('não ensina mais a arquitetura legada de início e loops periódicos', () => {
    const docs = gameTwoDDocs
    expect(docs).not.toContain('fica dentro de **Quando o jogo começar**')
    expect(docs).not.toContain('executa novamente o bloco de começo')
    expect(gameTwoDPromptContext).not.toContain(
      'Use como condição de um if dentro do gameLoop para criar inimigos',
    )
    expect(gameTwoDRuntime).not.toContain('O aluno chama dentro do "a cada quadro"')

    for (const type of ['sz_g2d_every_frames', 'sz_g2d_every_seconds']) {
      const block = gameTwoDBlocks.find((candidate) => candidate.type === type)
      expect(block?.tooltip).toContain(GAME_TWO_D_AREAS.loop)
      expect(block?.tooltip).not.toContain('dentro do "a cada quadro"')
    }
  })

  it('usa a orientação canônica de ciclo de vida nas docs e nos dois prompts da IA', () => {
    for (const guidance of Object.values(GAME_TWO_D_LIFECYCLE_GUIDANCE)) {
      expect(gameTwoDDocs).toContain(guidance)
      expect(gameTwoDPromptSummary).toContain(guidance)
      expect(gameTwoDPromptContext).toContain(guidance)
    }
  })

  it('ensina carregamentos de arquivo na mesma área exigida pelo lifecycle', () => {
    for (const type of ['g2d:loadSound', 'g2d:loadSpritesheet']) {
      expect(START_ONLY_STATEMENT_TYPES.has(type), type).toBe(true)
      expect(MOLD_ONLY_STATEMENT_TYPES.has(type), type).toBe(false)
    }
    expect(GAME_TWO_D_LIFECYCLE_GUIDANCE.molds).not.toContain('folhas de quadros')
    expect(GAME_TWO_D_LIFECYCLE_GUIDANCE.molds).not.toContain('sons carregados')
    expect(GAME_TWO_D_LIFECYCLE_GUIDANCE.start).toContain('sons e folhas de quadros')
  })

  it('organiza o guia por tarefas e documenta o fluxo automático de vidas', () => {
    const docs = gameTwoDDocs
    expect(docs).not.toMatch(/^###.*(?:Tier|v0\.)/m)
    expect(docs).toContain('### Comece um projeto')
    expect(docs).toContain('### Faça o jogo reagir')
    expect(docs).toContain('Desenhar as vidas do sprite')
    expect(docs).toContain('corações')
    expect(docs).toContain('barra')
    expect(docs).toContain('as vidas acabaram?')
    expect(docs).toContain('Descrever o jogo para leitor de tela')
  })

  it('separa mapa, Mundo, Fase, cena e onda sem ensinar os blocos ambíguos', () => {
    const docs = gameTwoDDocs
    for (const text of [docs, gameTwoDPromptContext, gameTwoDPromptSummary]) {
      expect(text).toContain('Mundo')
      expect(text).toContain('Fase')
      expect(text).toMatch(/[Oo]ndas?/)
    }
    expect(docs).toContain('Preparar o mapa encaixado na tela')
    expect(docs).toContain('Mover estilo plataforma sobre o terreno')
    expect(docs).not.toContain('"tiles de 0 px"')
    expect(docs).not.toContain('A borda atraída sempre é chão')

    for (const type of ['sz_g2d_draw_tilemap', 'sz_g2d_camera_follow', 'sz_g2d_set_camera']) {
      const block = gameTwoDBlocks.find((candidate) => candidate.type === type)
      expect(block?.hidden, type).toBe(true)
      expect(block?.message0, type).toContain('Bloco antigo')
      expect(block?.tooltip, type).toContain('Compatibilidade com projetos antigos')
    }
  })

  it('todo bloco visível explica sua finalidade em um tooltip', () => {
    expect(
      gameTwoDBlocks
        .filter((block) => !block.hidden && !String(block.tooltip ?? '').trim())
        .map((block) => block.type),
    ).toEqual([])
  })
})
