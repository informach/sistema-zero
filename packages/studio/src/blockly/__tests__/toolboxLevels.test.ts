import { describe, expect, it } from 'bun:test'
import type { BlockLevel, LearningProfile } from '#core'
import { gameTwoDToolboxCategory } from '../../official-extensions/game-2d/blocks'
import { gameThreeDToolboxCategory } from '../../official-extensions/game-3d/blocks'
import { world3DToolboxCategory } from '../../official-extensions/world-3d/blocks'
import { buildCoreToolbox } from '../toolbox'

/** Nomes de TODAS as categorias, em qualquer profundidade. */
function collectNames(contents: readonly unknown[], out: string[] = []): string[] {
  for (const c of contents) {
    if (c && typeof c === 'object' && (c as { kind?: string }).kind === 'category') {
      const cat = c as { name?: string; contents?: readonly unknown[] }
      if (cat.name) out.push(cat.name)
      if (Array.isArray(cat.contents)) collectNames(cat.contents, out)
    }
  }
  return out
}

/** Tipos de bloco visíveis, em qualquer profundidade. */
function collectTypes(contents: readonly unknown[], out: string[] = []): string[] {
  for (const c of contents) {
    const node = c as { kind?: string; type?: string; contents?: readonly unknown[] }
    if (node.kind === 'block' && node.type) out.push(node.type)
    if (Array.isArray(node.contents)) collectTypes(node.contents, out)
  }
  return out
}

function categoryNames(profile?: LearningProfile): string[] {
  return collectNames(buildCoreToolbox([], profile).contents)
}

type Cat = { kind?: string; name?: string; contents?: readonly unknown[] }

function findCategory(contents: readonly unknown[], name: string): Cat | null {
  for (const c of contents) {
    const cat = c as Cat
    if (cat?.kind === 'category' && cat.name === name) return cat
    if (Array.isArray(cat?.contents)) {
      const found = findCategory(cat.contents, name)
      if (found) return found
    }
  }
  return null
}

function blockTypesIn(cat: Cat | null): string[] {
  if (!cat || !Array.isArray(cat.contents)) return []
  return cat.contents
    .filter((e) => (e as { kind?: string }).kind === 'block')
    .map((e) => (e as { type: string }).type)
}

/** Paleta (categorias + tipos) de um degrau, JÁ com as extensões Jogo 2D/3D + Mundo 3D. */
function paletteAt(level: BlockLevel): { types: Set<string>; names: Set<string> } {
  const profile: LearningProfile = { level }
  const tb = buildCoreToolbox(
    [gameTwoDToolboxCategory, gameThreeDToolboxCategory, world3DToolboxCategory],
    profile,
  )
  return { types: new Set(collectTypes(tb.contents)), names: new Set(collectNames(tb.contents)) }
}

describe('buildCoreToolbox — estrutura e itens sempre válidos', () => {
  it('sem perfil mostra TUDO (avançado): categorias e sub-categorias', () => {
    const names = categoryNames()
    for (const n of [
      'HTML',
      'Canvas',
      '🖥️ Tela',
      '⬛ Formas',
      '✏️ Traçado',
      '🔄 Transformar',
      'Programação',
      '🧩 Funções',
      '🏛️ Classes',
      '📦 Objetos',
      'Avançado',
    ]) {
      expect(names).toContain(n)
    }
  })

  it('os listeners "Quando…" ficam em ⚡ Eventos, não na 🌐 Página', () => {
    const toolbox = buildCoreToolbox([])
    const eventos = blockTypesIn(findCategory(toolbox.contents, '⚡ Eventos'))
    const pagina = blockTypesIn(findCategory(toolbox.contents, '🌐 Página'))
    expect(eventos).toContain('sz_js_on_key')
    expect(eventos).toContain('sz_js_on_click_anywhere')
    expect(pagina).not.toContain('sz_js_on_key')
    expect(pagina).toContain('sz_js_get_element_by_id')
  })

  it('não duplica início, temporizadores nem operação de objetos na paleta', () => {
    const toolbox = buildCoreToolbox([])
    const eventos = blockTypesIn(findCategory(toolbox.contents, '⚡ Eventos'))
    const repeticoes = blockTypesIn(findCategory(toolbox.contents, '🔁 Repetições'))
    const objetos = blockTypesIn(findCategory(toolbox.contents, '📦 Objetos'))
    const all = collectTypes(toolbox.contents)

    expect(all).not.toContain('sz_js_on_load')
    expect(eventos).not.toContain('sz_js_set_timeout')
    expect(repeticoes).toContain('sz_js_set_timeout')
    expect(objetos).toContain('sz_js_object_assign')
    expect(all.filter((type) => type === 'sz_js_set_timeout')).toHaveLength(1)
    expect(all.filter((type) => type === 'sz_js_object_assign')).toHaveLength(1)
  })

  it('a busca está sempre presente', () => {
    const tb = buildCoreToolbox([], { level: 'iniciante-2d' })
    expect(tb.contents.some((c) => c.kind === 'search')).toBe(true)
  })

  it('allowCategories força a sub-categoria além do nível (nome ORIGINAL)', () => {
    const names = categoryNames({ level: 'iniciante-2d', allowCategories: ['Classes'] })
    expect(names).toContain('🏛️ Classes')
  })

  it('revealed sobe o teto para o topo mesmo com nível iniciante', () => {
    const names = categoryNames({ level: 'iniciante-2d', revealed: true })
    expect(names).toContain('🏛️ Classes')
    expect(names).toContain('Avançado')
  })
})

describe('buildCoreToolbox — curadoria POR BLOCO por degrau', () => {
  // ⚠️ Os 3 primeiros testes são a PROVA DE EQUIVALÊNCIA LEGADA: os degraus em
  // que os níveis antigos normalizam (iniciante→ini-2d, intermediario→int-3d,
  // avancado→av-3d) mostram exatamente os conjuntos de antes da reforma.
  it('INICIANTE-2D (≡ iniciante antigo): facilitadores + kit de lógica; sem programação real, sem 3D', () => {
    const { types, names } = paletteAt('iniciante-2d')
    for (const t of [
      'sz_frame_structure',
      'sz_g2d_create_sprite',
      'sz_g2d_top_down',
      'sz_html_h1',
      'sz_html_svg',
      'sz_svg_circle',
      'sz_canvas_arc',
      'sz_js_if_else',
      'sz_js_repeat',
      'sz_js_var_create',
      'sz_val_number',
      'sz_val_compare',
      // Blocos do 1º jogo (Nave contra Asteroides) precisam caber no iniciante.
      'sz_g2d_create_group',
      'sz_g2d_update_group',
      'sz_g2d_draw_group',
      'sz_g2d_prune_offscreen',
      'sz_g2d_remove_from_group',
      'sz_g2d_center_x',
      'sz_g2d_sprite_y',
      'sz_g2d_random_x',
      'sz_g2d_clear',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    for (const t of [
      'sz_js_while',
      'sz_g2d_sprite_vx',
      'sz_g2d_apply_velocity',
      'sz_js_class',
      'sz_val_object',
      'sz_math_arithmetic',
      'sz_js_function',
      'sz_g3d_create_scene',
    ]) {
      expect(types.has(t)).toBe(false)
    }
    // Canvas aparece (formas prontas), mas SEM traçado/transform (avançado).
    for (const n of ['Canvas', '⬛ Formas']) expect(names.has(n)).toBe(true)
    for (const n of [
      '✏️ Traçado',
      '🔄 Transformar',
      '🧩 Funções',
      '🏛️ Classes',
      '📦 Objetos',
      'Avançado',
      '🔢 Matemática',
      'Jogo 3D',
    ]) {
      expect(names.has(n)).toBe(false)
    }

    // Unidades pedagógicas não aparecem pela metade: a criança sempre recebe
    // o contêiner junto das peças que dependem dele.
    for (const t of [
      'sz_html_ul',
      'sz_html_li',
      'sz_html_form',
      'sz_html_label',
      'sz_html_input',
      'sz_html_textarea',
      'sz_html_button',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(types.has('sz_svg_circle')).toBe(true)
    expect(types.has('sz_html_svg')).toBe(true)
  })

  it('INTERMEDIÁRIO-3D (≡ intermediário antigo): programação real + Jogo 3D + Mundo 3D; sem avançado', () => {
    const { types, names } = paletteAt('intermediario-3d')
    expect(types.has('sz_g2d_create_sprite')).toBe(true) // inclui iniciante
    for (const t of [
      'sz_js_while',
      'sz_g2d_sprite_vx',
      'sz_math_arithmetic',
      'sz_g3d_create_scene',
      'sz_g3d_get_pos',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Funções é flyout DINÂMICO (custom) → conferimos pela categoria, não por bloco.
    for (const t of ['sz_js_class', 'sz_val_object', 'sz_g2d_apply_velocity', 'sz_svg_path']) {
      expect(types.has(t)).toBe(false)
    }
    expect(names.has('🧩 Funções')).toBe(true)
    expect(names.has('Jogo 3D')).toBe(true)
    // Mundo 3D (int-3d) entra exatamente aqui — como no intermediário antigo.
    expect(types.has('sz_w3d_setup')).toBe(true)
    for (const n of ['🏛️ Classes', '📦 Objetos', 'Avançado']) expect(names.has(n)).toBe(false)
  })

  it('AVANÇADO-3D (≡ avançado antigo, topo): entra tudo (classes, objetos, cru, física, engine 3D)', () => {
    const { types, names } = paletteAt('avancado-3d')
    for (const t of [
      'sz_val_object',
      'sz_adv_raw_js',
      'sz_g2d_apply_velocity',
      'sz_g3d_get_pos',
      'sz_math_trig',
      'sz_svg_path',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Classes é flyout DINÂMICO (custom) → conferimos pela categoria.
    for (const n of ['🏛️ Classes', '📦 Objetos', 'Avançado', 'Jogo 3D']) {
      expect(names.has(n)).toBe(true)
    }
  })

  // ── Degraus NOVOS da escada (sem equivalente pré-reforma) ────────────────────
  it('INICIANTE-3D: a porta do 3D — facilitadores g3d entram; programação real ainda não', () => {
    const { types, names } = paletteAt('iniciante-3d')
    expect(types.has('sz_g2d_create_sprite')).toBe(true) // inclui o degrau abaixo
    expect(types.has('sz_g3d_create_scene')).toBe(true) // facilitador 3D
    expect(types.has('sz_g3d_get_pos')).toBe(true) // toda a extensão é iniciante-3d
    expect(names.has('Jogo 3D')).toBe(true)
    for (const t of [
      'sz_js_while', // int-2d ainda não
      'sz_math_arithmetic',
      'sz_g2d_sprite_vx',
      'sz_w3d_setup', // Mundo 3D é int-3d
    ]) {
      expect(types.has(t)).toBe(false)
    }
    for (const n of ['🔢 Matemática', '🧩 Funções']) expect(names.has(n)).toBe(false)
  })

  it('INTERMEDIÁRIO-2D: programação real entra e o iniciante-3d ABAIXO segue visível (escada única)', () => {
    const { types, names } = paletteAt('intermediario-2d')
    for (const t of ['sz_js_while', 'sz_math_arithmetic', 'sz_g2d_sprite_vx', 'sz_g3d_get_pos']) {
      expect(types.has(t)).toBe(true)
    }
    // Pina a semântica de escada TOTAL: o degrau 2D inclui o iniciante-3d abaixo.
    expect(types.has('sz_g3d_create_scene')).toBe(true)
    expect(names.has('🧩 Funções')).toBe(true)
    for (const t of ['sz_w3d_setup', 'sz_js_class', 'sz_adv_raw_js']) {
      expect(types.has(t)).toBe(false)
    }
  })

  it('AVANÇADO-2D: classes/objetos/cru/trig e Jogo 3D entram; Jogo 3D Avançado ainda não', () => {
    const { types, names } = paletteAt('avancado-2d')
    for (const t of [
      'sz_val_object',
      'sz_adv_raw_js',
      'sz_g2d_apply_velocity',
      'sz_math_trig',
      'sz_svg_path',
      'sz_w3d_setup', // int-3d, abaixo do av-2d
      'sz_g3d_get_pos', // Jogo 3D inteiro está no piso iniciante-3d
      'sz_g3d_body',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    for (const n of ['🏛️ Classes', '📦 Objetos', 'Avançado']) expect(names.has(n)).toBe(true)
    // O que fica SÓ para o topo: Jogo 3D Avançado + three.js cru.
    expect(types.has('sz_g3k_setup')).toBe(false)
    expect(names.has('Canvas 3D')).toBe(false)
  })
})
