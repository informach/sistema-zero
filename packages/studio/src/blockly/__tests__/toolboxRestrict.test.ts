import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningProfile } from '#core'
import { gameTwoDToolboxCategory } from '../../official-extensions/game-2d/blocks'
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
  const aulas = resolve(import.meta.dir, '../../../../../docs/aulas-interativas/aulas')
  it.each([
    'corre-dino',
    'desafio-primeiro-jogo',
  ])('os blocos exigidos nos manifestos de %s são acessíveis no perfil iniciante', (course) => {
    const prefix =
      course === 'corre-dino'
        ? 'corre-dino-'
        : course === 'desafio-primeiro-jogo'
          ? 'desafio-'
          : 'meu-jeito-'
    const files = readdirSync(aulas).filter(
      (name) => name.startsWith(prefix) && name.endsWith('.manifesto.json'),
    )
    expect(files).toHaveLength(course === 'corre-dino' ? 13 : 7)
    const blocks = [
      ...new Set(
        files.flatMap((name) => {
          const manifest = JSON.parse(readFileSync(resolve(aulas, name), 'utf8')) as {
            sections: Array<{
              completion?: { projectChecks?: Array<{ rule: { type: string; blockType?: string } }> }
            }>
          }
          return manifest.sections.flatMap(
            (section) =>
              section.completion?.projectChecks?.flatMap((check) =>
                check.rule.type === 'usesBlock' && check.rule.blockType
                  ? [check.rule.blockType]
                  : [],
              ) ?? [],
          )
        }),
      ),
    ]
    expect(blocks.length).toBeGreaterThan(0)
    const offered = allBlockTypes(
      buildCoreToolbox([gameTwoDToolboxCategory], { level: 'iniciante-2d', allowBlocks: blocks })
        .contents,
    )
    expect(blocks.filter((type) => !offered.includes(type))).toEqual([])
    expect(offered.some((type) => type.startsWith('sz_gk_'))).toBe(false)
  })
  it('Meu Jeito termina com galeria, sem checagens estruturais do Estúdio', () => {
    const files = readdirSync(aulas).filter(
      (name) => name.startsWith('meu-jeito-') && name.endsWith('.manifesto.json'),
    )
    expect(files).toHaveLength(8)
    for (const name of files) {
      const manifest = JSON.parse(readFileSync(resolve(aulas, name), 'utf8')) as {
        sections: Array<{ completion?: { projectChecks?: unknown[] } }>
      }
      expect(
        manifest.sections.flatMap((section) => section.completion?.projectChecks ?? []),
      ).toEqual([])
    }
  })
  it('mantém os blocos deste jogo editáveis sem oferecer extensões ausentes', () => {
    const profile: LearningProfile = {
      level: 'iniciante-2d',
      allowBlocks: ['sz_val_number'],
      projectTools: ['sz_g2d_set_position', 'sz_js_const_create', 'sz_gk_setup'],
    }
    const toolbox = buildCoreToolbox([gameTwoDToolboxCategory], profile)
    const category = toolbox.contents.find((entry) => entry.name === '🧰 Blocos deste jogo')
    expect(category && 'contents' in category ? allBlockTypes(category.contents) : []).toEqual(
      expect.arrayContaining(['sz_js_const_create', 'sz_g2d_set_position']),
    )
    const types = allBlockTypes(toolbox.contents)
    expect(types).not.toContain('sz_gk_setup')
    expect(types).not.toContain('sz_g2d_create_sprite')
  })
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

  it('não mostra uma categoria Funções vazia quando só o parâmetro contextual foi liberado', () => {
    const profile: LearningProfile = {
      level: 'avancado-3d',
      allowBlocks: ['sz_val_arg'],
    }

    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).not.toContain('🧩 Funções')
    expect(names).not.toContain('Programação')
    expect(functionCategoryBlockTypes(profile)).toEqual([])
  })

  it('mantém Funções acessível para parâmetros de métodos em aulas restritas', () => {
    const profile: LearningProfile = {
      level: 'avancado-3d',
      allowBlocks: ['sz_js_class', 'sz_js_class_method', 'sz_val_arg'],
    }

    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).toContain('🧩 Funções')
    expect(names).toContain('🏛️ Classes')
  })

  it('mantém o flyout contextual de Funções quando a aula libera somente Classes', () => {
    const profile: LearningProfile = {
      level: 'iniciante-2d',
      allowCategories: ['Classes'],
    }

    const names = categoryNames(buildCoreToolbox([], profile).contents)
    expect(names).toContain('Programação')
    expect(names).toContain('🧩 Funções')
    expect(names).toContain('🏛️ Classes')
    expect(functionCategoryBlockTypes(profile)).toEqual([])
  })
})
