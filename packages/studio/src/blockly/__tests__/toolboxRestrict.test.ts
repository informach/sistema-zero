import { describe, expect, it } from 'bun:test'
import type { LearningProfile } from '#core'
import { BLOCK_CATALOG } from '../blockCatalog'
import { classCategoryBlockTypes, functionCategoryBlockTypes } from '../paramsFlyout'
import { buildCoreToolbox, type ToolboxCategory } from '../toolbox'

/** Coleta TODOS os tipos de bloco da toolbox, em qualquer profundidade. */
function allBlockTypes(contents: readonly unknown[], out: string[] = []): string[] {
  for (const c of contents) {
    const node = c as { kind?: string; type?: string; contents?: readonly unknown[] }
    if (node.kind === 'block' && node.type) out.push(node.type)
    if (Array.isArray(node.contents)) allBlockTypes(node.contents, out)
  }
  return out
}

/** Nomes de categoria em qualquer profundidade. */
function categoryNames(contents: readonly unknown[], out: string[] = []): string[] {
  for (const c of contents) {
    const node = c as { kind?: string; name?: string; contents?: readonly unknown[] }
    if (node.kind === 'category' && node.name) out.push(node.name)
    if (Array.isArray(node.contents)) categoryNames(node.contents, out)
  }
  return out
}

/** Categoria de extensão fake (Jogo 2D) com uma sub-categoria de 2 blocos. */
function fakeJogo2D(): ToolboxCategory {
  return {
    kind: 'category',
    name: 'Jogo 2D',
    colour: '#ec4899',
    contents: [
      {
        kind: 'category',
        name: '🕹️ Sprites',
        colour: '#ec4899',
        contents: [
          { kind: 'block', type: 'sz_g2d_create_sprite' },
          { kind: 'block', type: 'sz_g2d_move_sprite' },
        ],
      },
    ],
  }
}

describe('buildCoreToolbox — lista de blocos da aula (allowBlocks restritivo)', () => {
  it('mostra SÓ os blocos CORE listados (+ frames sempre)', () => {
    const profile: LearningProfile = {
      level: 'avancado-3d',
      allowBlocks: ['sz_html_h1', 'sz_val_number'],
    }
    const types = allBlockTypes(buildCoreToolbox([], profile).contents)
    expect(types).toContain('sz_html_h1')
    expect(types).toContain('sz_val_number')
    // 🗂️ Áreas do projeto seguem SEMPRE visíveis.
    expect(types).toContain('sz_frame_structure')
    // Um bloco NÃO listado some, mesmo cabendo no nível.
    expect(types).not.toContain('sz_html_p')
  })

  it('restringe TAMBÉM as categorias de extensão (só os listados)', () => {
    const profile: LearningProfile = {
      level: 'iniciante-2d',
      allowBlocks: ['sz_g2d_create_sprite'],
    }
    const types = allBlockTypes(buildCoreToolbox([fakeJogo2D()], profile).contents)
    expect(types).toContain('sz_g2d_create_sprite') // listado
    expect(types).not.toContain('sz_g2d_move_sprite') // não listado → some
  })

  it('extensão SEM nenhum bloco listado some inteira', () => {
    const profile: LearningProfile = { level: 'iniciante-2d', allowBlocks: ['sz_html_h1'] }
    const names = categoryNames(buildCoreToolbox([fakeJogo2D()], profile).contents)
    expect(names).not.toContain('Jogo 2D')
  })

  it('SEM lista, a extensão entra como veio (sem restrição)', () => {
    const profile: LearningProfile = { level: 'avancado-3d' }
    const types = allBlockTypes(buildCoreToolbox([fakeJogo2D()], profile).contents)
    expect(types).toContain('sz_g2d_create_sprite')
    expect(types).toContain('sz_g2d_move_sprite')
  })

  it('categoria CORE sem bloco listado some (poda de vazias)', () => {
    const profile: LearningProfile = { level: 'avancado-3d', allowBlocks: ['sz_html_h1'] }
    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).toContain('HTML') // tem o h1
    expect(names).not.toContain('CSS') // sem bloco listado → some
    expect(names).not.toContain('Programação') // idem
  })

  it('sub-categoria de extensão sem bloco listado some (mantém a irmã com bloco)', () => {
    const ext: ToolboxCategory = {
      kind: 'category',
      name: 'Jogo 2D',
      colour: '#ec4899',
      contents: [
        {
          kind: 'category',
          name: '🕹️ Sprites',
          colour: '#ec4899',
          contents: [{ kind: 'block', type: 'sz_g2d_create_sprite' }],
        },
        {
          kind: 'category',
          name: '🌍 Física',
          colour: '#ec4899',
          contents: [{ kind: 'block', type: 'sz_g2d_gravity' }],
        },
      ],
    }
    const profile: LearningProfile = {
      level: 'iniciante-2d',
      allowBlocks: ['sz_g2d_create_sprite'],
    }
    const names = categoryNames(buildCoreToolbox([ext], profile).contents)
    expect(names).toContain('🕹️ Sprites') // tem o bloco listado
    expect(names).not.toContain('🌍 Física') // sem bloco listado → some
  })

  it('filtra bloco a bloco os flyouts dinâmicos de Funções e Classes', () => {
    const onlyFunction: LearningProfile = {
      level: 'iniciante-2d',
      allowBlocks: ['sz_js_function'],
    }
    expect(functionCategoryBlockTypes(onlyFunction)).toEqual(['sz_js_function'])

    const onlyConstructor: LearningProfile = {
      level: 'iniciante-2d',
      allowBlocks: ['sz_js_constructor'],
    }
    expect(classCategoryBlockTypes(onlyConstructor)).toEqual(['sz_js_constructor'])
  })

  it('não cria Classes fantasma para blocos legados que já saíram da oferta', () => {
    const profile: LearningProfile = {
      level: 'avancado-3d',
      allowBlocks: ['sz_js_call_method'],
    }
    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).not.toContain('🏛️ Classes')
    expect(BLOCK_CATALOG.some((entry) => entry.type === 'sz_js_call_method')).toBe(false)
  })

  it('oferece retorno e parâmetro somente em Funções, sem duplicar Classes', () => {
    const profile: LearningProfile = {
      level: 'avancado-3d',
      allowBlocks: ['sz_js_function', 'sz_js_return', 'sz_val_arg'],
    }
    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).toContain('🧩 Funções')
    expect(names).not.toContain('🏛️ Classes')
    expect(functionCategoryBlockTypes(profile)).toEqual(['sz_js_function', 'sz_js_return'])
    expect(classCategoryBlockTypes(profile)).toEqual([])

    expect(BLOCK_CATALOG.filter((entry) => entry.type === 'sz_js_return')).toEqual([
      expect.objectContaining({ category: 'Funções' }),
    ])
    expect(BLOCK_CATALOG.filter((entry) => entry.type === 'sz_val_arg')).toEqual([
      expect.objectContaining({ category: 'Funções' }),
    ])
  })
})
