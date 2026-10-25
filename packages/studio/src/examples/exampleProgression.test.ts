import { describe, expect, it } from 'bun:test'
import { type BlockLevel, levelRank } from '#core'
import { resolveBlockLevel } from '../blockly/blockLevels'
import moldaSkinned from '../official-extensions/__tests__/three3d/molda-skinned.json'
import { HEROI_DO_MOLDA_GLB } from '../official-extensions/game-3d/exampleAssets'
import {
  GAME_THREE_D_EXAMPLE_SECTIONS,
  gameThreeDExamples,
} from '../official-extensions/game-3d/exampleCatalog'
import {
  GAME_KIT_THREE_D_EXAMPLE_SECTIONS,
  gameKit3DExamples,
} from '../official-extensions/game-3d-advanced/exampleCatalog'
import { world3DExamples } from '../official-extensions/world-3d/examples'
import { SERVER_EXAMPLES_INDEX } from './__gen_serverExamplesIndex'

/**
 * PROGRESSÃO da galeria (review 3D, lote 7). O catálogo do Jogo 3D é uma escada:
 * demos curtas → jogos completos simples → jogos maiores → kits prontos.
 *
 * Regras travadas aqui (o Mundo 3D e o Avançado têm as réguas deles mais abaixo):
 * 1. O catálogo é EXATAMENTE as quatro seções, nessa ordem (nenhum exemplo fora delas).
 * 2. O primeiro jogo ("Pega-Estrelas") cabe inteiro no degrau iniciante-3d: todo bloco que
 *    ele usa (menos as 🗂️ Áreas do projeto, que nunca passam pelo filtro) tem nível
 *    ≤ iniciante-3d. É a promessa "um jogo completo só com o núcleo".
 * 3. O degrau MÁXIMO não diminui de uma seção para a seguinte (demos ≤ simples ≤ maiores):
 *    quem segue a galeria nunca encontra uma seção mais exigente antes de uma mais gentil.
 *    Os kits ficam de fora da régua de propósito: são atalhos prontos de gênero, no fim.
 * 4. Dentro dos jogos simples, o degrau máximo de cada um não diminui em relação ao
 *    primeiro (o "Pega-Estrelas" é o piso).
 *
 * Os tipos de bloco vêm do índice gerado (`SERVER_EXAMPLES_INDEX.blockTypes`, a mesma
 * IR → blocos que o editor usa), então a régua mede o que a criança vê na paleta.
 */

const isFrame = (type: string) => type.startsWith('sz_frame_')

function blockTypesOf(name: string): string[] {
  const entry = SERVER_EXAMPLES_INDEX.find((item) => item.key === `game-3d:${name}`)
  if (!entry) throw new Error(`exemplo sem entrada no índice: ${name} (rode gen:server-examples)`)
  return entry.blockTypes.filter((type) => !isFrame(type))
}

function maxLevel(types: readonly string[]): BlockLevel {
  let max: BlockLevel = 'iniciante-2d'
  for (const type of types) {
    const level = resolveBlockLevel(type)
    if (levelRank(level) > levelRank(max)) max = level
  }
  return max
}

const sectionMax = (examples: readonly { name: string }[]) =>
  maxLevel(examples.flatMap((example) => blockTypesOf(example.name)))

describe('progressão dos exemplos do Jogo 3D', () => {
  it('o catálogo é exatamente demos → simples → maiores → kits', () => {
    const { demos, simples, maiores, kits } = GAME_THREE_D_EXAMPLE_SECTIONS
    expect(gameThreeDExamples.map((e) => e.name)).toEqual(
      [...demos, ...simples, ...maiores, ...kits].map((e) => e.name),
    )
    expect(demos.every((e) => e.experience === 'demo')).toBe(true)
    expect(simples[0]?.name).toBe('Pega-Estrelas')
    expect(kits.map((e) => e.name)).toEqual([
      'Atravesse a Rua',
      'Corrida Maluca',
      'Torre maluca',
      'Reino Cogumelo',
    ])
  })

  it('o "Pega-Estrelas" (4º exemplo) só usa blocos de nível ≤ iniciante-3d', () => {
    expect(gameThreeDExamples[3]?.name).toBe('Pega-Estrelas')
    const types = blockTypesOf('Pega-Estrelas')
    expect(types.length).toBeGreaterThan(15)
    const above = types.filter(
      (type) => levelRank(resolveBlockLevel(type)) > levelRank('iniciante-3d'),
    )
    expect(above).toEqual([])
    // Sem HTML nem CSS: placar, telas e recomeçar são blocos de regras de jogo.
    expect(gameThreeDExamples[3]?.ir.html).toEqual([])
    expect(gameThreeDExamples[3]?.ir.css).toEqual([])
  })

  it('o degrau máximo não diminui de seção em seção (demos → simples → maiores)', () => {
    const { demos, simples, maiores } = GAME_THREE_D_EXAMPLE_SECTIONS
    const ranks = [demos, simples, maiores].map((section) => levelRank(sectionMax(section)))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i] ?? 0).toBeGreaterThanOrEqual(ranks[i - 1] ?? 0)
    }
  })

  it('nos jogos simples, ninguém fica abaixo do piso do primeiro jogo', () => {
    const [first, ...rest] = GAME_THREE_D_EXAMPLE_SECTIONS.simples
    const floor = levelRank(maxLevel(blockTypesOf(first.name)))
    for (const example of rest) {
      expect(levelRank(maxLevel(blockTypesOf(example.name))), example.name).toBeGreaterThanOrEqual(
        floor,
      )
    }
  })

  it('o "Meu herói do Molda" embute o GLB do Molda idêntico à fixture portátil e toca a animação', () => {
    expect(HEROI_DO_MOLDA_GLB).toBe(moldaSkinned.dataUrl)
    const example = gameThreeDExamples.find((e) => e.name === 'Meu herói do Molda')
    expect(example?.assets?.map((asset) => [asset.name, asset.kind])).toEqual([
      ['heroi-do-molda', 'model3d'],
    ])
    const types = blockTypesOf('Meu herói do Molda')
    expect(types).toContain('sz_g3d_create_model_file')
    expect(types).toContain('sz_g3d_play_animation')
    expect(types).toContain('sz_g3d_camera_mode')
    expect(types).toContain('sz_g3d_play_effect')
  })
})

/**
 * Mundo 3D (lote 10): a extensão inteira mora no degrau intermediario-3d, então a régua é a da
 * VITRINE: o primeiro jogo com regras de jogo ("Caça às Estrelas") vem logo depois dos
 * passeios (Parque) e antes do Boliche, e nenhum exemplo pede um degrau acima do da extensão.
 */
describe('progressão dos exemplos do Mundo 3D', () => {
  const worldTypes = (name: string) => {
    const entry = SERVER_EXAMPLES_INDEX.find((item) => item.key === `world-3d:${name}`)
    if (!entry) throw new Error(`exemplo sem entrada no índice: ${name} (rode gen:server-examples)`)
    return entry.blockTypes.filter((type) => !isFrame(type))
  }

  it('o "Caça às Estrelas" vem depois do Parque e antes do Boliche, com as regras de jogo', () => {
    const names = world3DExamples.map((example) => example.name)
    const at = names.indexOf('Caça às Estrelas')
    expect(names[at - 1]).toBe('Parque dos Brinquedos')
    expect(names[at + 1]).toBe('Boliche na Praça')
    const types = worldTypes('Caça às Estrelas')
    for (const rule of [
      'sz_w3d_collectible',
      'sz_w3d_on_collect_item',
      'sz_w3d_add_score',
      'sz_w3d_set_life',
      'sz_w3d_on_life_over',
      'sz_w3d_start_timer',
      'sz_w3d_on_timer_end',
      'sz_w3d_set_screen_text',
      'sz_w3d_end_game',
    ])
      expect(types).toContain(rule)
    // Os exemplos anteriores ainda são passeios: nenhum usa as regras de jogo.
    for (const name of names.slice(0, at))
      expect(
        worldTypes(name).some((type) => type === 'sz_w3d_end_game'),
        name,
      ).toBe(false)
  })

  it('nenhum exemplo pede um degrau acima do da extensão (intermediario-3d)', () => {
    for (const example of world3DExamples) {
      expect(levelRank(maxLevel(worldTypes(example.name))), example.name).toBeLessThanOrEqual(
        levelRank('intermediario-3d'),
      )
    }
  })
})

/**
 * Jogo 3D Avançado (lote 12): a extensão inteira mora no degrau avancado-3d, então a régua é a
 * dos CONCEITOS. A vitrine vai dos jogos curtos de uma ideia só (Tiro ao Alvo primeiro) ao
 * primeiro jogo COMPLETO e curto ("Arena dos Cristais"), ao modelo animado do Molda e, por fim,
 * aos "Profissional". Fases, mochila e progresso guardado só aparecem a partir da Arena: quem
 * segue a vitrine aprende um jogo inteiro antes de abrir os grandes.
 */
describe('progressão dos exemplos do Jogo 3D Avançado', () => {
  const advancedTypes = (name: string) => {
    const entry = SERVER_EXAMPLES_INDEX.find((item) => item.key === `game-3d-advanced:${name}`)
    if (!entry) throw new Error(`exemplo sem entrada no índice: ${name} (rode gen:server-examples)`)
    return entry.blockTypes.filter((type) => !isFrame(type))
  }
  const LOTE_12 = [
    'sz_g3k_on_level_start',
    'sz_g3k_next_level',
    'sz_g3k_bag_give',
    'sz_g3k_save_value',
    'sz_g3k_patrol',
  ]

  it('o catálogo é exatamente primeiros → completos → profissionais, com o Tiro ao Alvo na frente', () => {
    const { primeiros, completos, profissionais } = GAME_KIT_THREE_D_EXAMPLE_SECTIONS
    expect(gameKit3DExamples.map((e) => e.name)).toEqual(
      [...primeiros, ...completos, ...profissionais].map((e) => e.name),
    )
    expect(primeiros.map((e) => e.name)).toEqual([
      'Tiro ao Alvo',
      'Quadra Maluca',
      'Guardião do Portal',
      'Salto nas Nuvens',
      'Parkour do Vulcão',
      'O Chefão das Sombras',
    ])
    expect(completos.map((e) => e.name)).toEqual([
      'Arena dos Cristais',
      'Herói do Molda',
      'Noite das Fogueiras',
    ])
    expect(profissionais[0]?.name).toBe('Defesa da Torre Profissional')
    expect(profissionais.every((e) => e.name.endsWith('Profissional'))).toBe(true)
  })

  it('os primeiros jogos não usam fases, mochila nem progresso; a Arena usa todos', () => {
    for (const example of GAME_KIT_THREE_D_EXAMPLE_SECTIONS.primeiros)
      expect(
        advancedTypes(example.name).filter((type) => LOTE_12.includes(type)),
        example.name,
      ).toEqual([])
    const arena = advancedTypes('Arena dos Cristais')
    for (const type of LOTE_12) expect(arena).toContain(type)
  })

  it('o "Herói do Molda" embute o mesmo GLB do Molda e anima por estado', () => {
    const example = gameKit3DExamples.find((e) => e.name === 'Herói do Molda')
    expect(example?.assets?.[0]?.dataUrl).toBe(moldaSkinned.dataUrl)
    const types = advancedTypes('Herói do Molda')
    for (const type of ['sz_g3k_part', 'sz_g3k_state_anim', 'sz_g3k_on_anim_end'])
      expect(types).toContain(type)
  })

  it('nenhum exemplo pede um degrau acima do da extensão (avancado-3d)', () => {
    for (const example of gameKit3DExamples) {
      expect(levelRank(maxLevel(advancedTypes(example.name))), example.name).toBeLessThanOrEqual(
        levelRank('avancado-3d'),
      )
    }
  })
})

/**
 * A ESCADA ENTRE AS EXTENSÕES (review 3D, lote 15): uma extensão 3D por degrau. Quem segue a
 * galeria do Jogo 3D (sem os kits, que são atalhos de gênero) para o Mundo 3D e dali para o
 * Avançado nunca encontra uma vitrine que peça um degrau 3D maior antes de uma mais gentil.
 *
 * A régua aqui mede os blocos da PRÓPRIA extensão (`sz_g3d_`, `sz_w3d_`, `sz_g3k_`), que é o que
 * define o degrau 3D. ⚠️ O resto do exemplo não entra de propósito: os exemplos antigos do Jogo 3D
 * trazem o CSS da página (`sz_css_rule`, `sz_css_position`…, avancado-2d) e alguns usam
 * `sz_math_trig` (avancado-2d), que são degraus do EIXO 2D. Medido o exemplo inteiro, o Jogo 3D
 * daria avancado-2d e o Mundo 3D intermediario-3d (registrado no relatório do review 3D de
 * 24/10/2026 como pendência dos exemplos, não da escada das extensões).
 */
describe('progressão entre as três extensões 3D', () => {
  const ownTypes = (extension: string, prefix: string, name: string) => {
    const key = `${extension}:${name}`
    const entry = SERVER_EXAMPLES_INDEX.find((item) => item.key === key)
    if (!entry) throw new Error(`exemplo sem entrada no índice: ${key} (rode gen:server-examples)`)
    return entry.blockTypes.filter((type) => type.startsWith(prefix))
  }
  const galleryMax = (extension: string, prefix: string, names: readonly string[]) =>
    levelRank(maxLevel(names.flatMap((name) => ownTypes(extension, prefix, name))))

  it('o degrau 3D máximo não diminui Jogo 3D → Mundo 3D → Jogo 3D Avançado', () => {
    const { demos, simples, maiores } = GAME_THREE_D_EXAMPLE_SECTIONS
    const ranks = [
      galleryMax(
        'game-3d',
        'sz_g3d_',
        [...demos, ...simples, ...maiores].map((e) => e.name),
      ),
      galleryMax(
        'world-3d',
        'sz_w3d_',
        world3DExamples.map((e) => e.name),
      ),
      galleryMax(
        'game-3d-advanced',
        'sz_g3k_',
        gameKit3DExamples.map((e) => e.name),
      ),
    ]
    for (let i = 1; i < ranks.length; i++)
      expect(ranks[i] ?? 0).toBeGreaterThanOrEqual(ranks[i - 1] ?? 0)
    expect(ranks).toEqual([
      levelRank('intermediario-3d'),
      levelRank('intermediario-3d'),
      levelRank('avancado-3d'),
    ])
  })

  it('cada exemplo do Mundo 3D e do Avançado usa a extensão e fica no degrau dela', () => {
    for (const example of world3DExamples) {
      const types = ownTypes('world-3d', 'sz_w3d_', example.name)
      expect(types.length, example.name).toBeGreaterThan(0)
      expect(maxLevel(types), example.name).toBe('intermediario-3d')
    }
    for (const example of gameKit3DExamples) {
      const types = ownTypes('game-3d-advanced', 'sz_g3k_', example.name)
      expect(types.length, example.name).toBeGreaterThan(0)
      expect(maxLevel(types), example.name).toBe('avancado-3d')
    }
  })
})
