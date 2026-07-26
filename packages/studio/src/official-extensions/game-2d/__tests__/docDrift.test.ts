import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExtensionToolboxCategory } from '#extensions'
import { gameTwoDPromptContext } from '../ai'
import { gameTwoDPromptSummary } from '../aiSummary'
import { G2D_SOCKET_SHADOW_TYPES, gameTwoDBlocks, gameTwoDToolboxCategory } from '../blocks'
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
    const semanticSurfaces = [gameTwoDManifest.docs, gameTwoDPromptContext, tooltips]

    for (const text of semanticSurfaces) {
      expect(text).not.toMatch(
        /chão\s*=\s*base (?:da tela|do canvas)|o chão é a base da tela|pous[ao]\w* (?:o sprite )?na base da tela/i,
      )
    }
    expect(gameTwoDManifest.docs).toContain('gravidade negativa')
    expect(gameTwoDManifest.docs).toContain('teto')
  })

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

  it('cada bloco que o manual localiza está realmente na categoria citada', () => {
    const references = categoriasDeBlocosCitadasNasDocs(gameTwoDManifest.docs ?? '')
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
    expect(gameTwoDBlocks.length).toBe(209)
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
      'sz_g2d_on_pointer',
      'sz_g2d_key_down',
      'sz_g2d_pointer_down',
    ])
    expect(tiposDaCategoria('💥 Colisões')).toEqual([
      'sz_g2d_on_overlap',
      'sz_g2d_touches',
      'sz_g2d_collides',
      'sz_g2d_circle_collides',
      'sz_g2d_set_hitbox_scale',
      'sz_g2d_collide_group',
      'sz_g2d_collide_sprite',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
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
        .filter((arg) => arg.type === 'input_value')
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
    const docs = gameTwoDManifest.docs ?? ''
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
      expect(gameTwoDManifest.docs).toContain(guidance)
      expect(gameTwoDPromptSummary).toContain(guidance)
      expect(gameTwoDPromptContext).toContain(guidance)
    }
  })

  it('organiza o guia por tarefas e documenta o fluxo automático de vidas', () => {
    const docs = gameTwoDManifest.docs ?? ''
    expect(docs).not.toMatch(/^###.*(?:Tier|v0\.)/m)
    expect(docs).toContain('### Comece um projeto')
    expect(docs).toContain('### Faça o jogo reagir')
    expect(docs).toContain('Desenhar as vidas do sprite')
    expect(docs).toContain('corações')
    expect(docs).toContain('barra')
    expect(docs).toContain('as vidas acabaram?')
    expect(docs).toContain('Descrever o jogo para leitor de tela')
  })

  it('todo bloco visível explica sua finalidade em um tooltip', () => {
    expect(
      gameTwoDBlocks
        .filter((block) => !block.hidden && !String(block.tooltip ?? '').trim())
        .map((block) => block.type),
    ).toEqual([])
  })
})
