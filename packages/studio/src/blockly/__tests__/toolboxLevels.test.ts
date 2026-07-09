import { describe, expect, it } from 'bun:test'
import type { BlockLevel, LearningProfile } from '#core'
import { gameTwoDToolboxCategory } from '../../official-extensions/game-2d/blocks'
import { gameThreeDToolboxCategory } from '../../official-extensions/game-3d/blocks'
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

/** Paleta (categorias + tipos) de um nível, JÁ com as extensões Jogo 2D/3D. */
function paletteAt(level: BlockLevel): { types: Set<string>; names: Set<string> } {
  const profile: LearningProfile = { level }
  const tb = buildCoreToolbox([gameTwoDToolboxCategory, gameThreeDToolboxCategory], profile)
  return { types: new Set(collectTypes(tb.contents)), names: new Set(collectNames(tb.contents)) }
}

describe('buildCoreToolbox — estrutura e itens sempre válidos', () => {
  it('sem perfil mostra TUDO (avançado): categorias e sub-categorias', () => {
    const names = categoryNames()
    for (const n of [
      'HTML',
      'Canvas',
      '🖼️ Tela',
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

  it('a busca está sempre presente', () => {
    const tb = buildCoreToolbox([], { level: 'iniciante' })
    expect(tb.contents.some((c) => c.kind === 'search')).toBe(true)
  })

  it('allowCategories força a sub-categoria além do nível (nome ORIGINAL)', () => {
    const names = categoryNames({ level: 'iniciante', allowCategories: ['Classes'] })
    expect(names).toContain('🏛️ Classes')
  })

  it('revealed sobe o teto para avançado mesmo com nível iniciante', () => {
    const names = categoryNames({ level: 'iniciante', revealed: true })
    expect(names).toContain('🏛️ Classes')
    expect(names).toContain('Avançado')
  })
})

describe('buildCoreToolbox — curadoria POR BLOCO por nível', () => {
  it('INICIANTE: facilitadores + kit de lógica; sem programação real, sem 3D', () => {
    const { types, names } = paletteAt('iniciante')
    for (const t of [
      'sz_frame_structure',
      'sz_g2d_create_sprite',
      'sz_g2d_top_down',
      'sz_html_h1',
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
  })

  it('INTERMEDIÁRIO: entra programação real + Jogo 3D; ainda sem avançado', () => {
    const { types, names } = paletteAt('intermediario')
    expect(types.has('sz_g2d_create_sprite')).toBe(true) // inclui iniciante
    for (const t of [
      'sz_js_while',
      'sz_g2d_sprite_vx',
      'sz_math_arithmetic',
      'sz_g3d_create_scene',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Funções é flyout DINÂMICO (custom) → conferimos pela categoria, não por bloco.
    for (const t of [
      'sz_js_class',
      'sz_val_object',
      'sz_g2d_apply_velocity',
      'sz_g3d_get_pos',
      'sz_svg_path',
    ]) {
      expect(types.has(t)).toBe(false)
    }
    expect(names.has('🧩 Funções')).toBe(true)
    expect(names.has('Jogo 3D')).toBe(true)
    for (const n of ['🏛️ Classes', '📦 Objetos', 'Avançado']) expect(names.has(n)).toBe(false)
  })

  it('AVANÇADO: entra tudo (classes, objetos, cru, física manual, getters 3D)', () => {
    const { types, names } = paletteAt('avancado')
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
})
